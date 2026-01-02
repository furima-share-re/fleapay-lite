// payments.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";
import {
  buildEbayKeywordFromSummary,
  buildPriceStats,
  detectGenreIdFromSummary,
  isListingAllowedForGenre,
  getWorldPriceWeights,
  queueWorldPriceUpdate,
  fetchWorldPriceFromEbayMarketplace,
  EBAY_SOURCE_MODE,
} from "./worldPriceGenreEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 決済・入金・売上関連のルートをまとめて登録する
 *
 * @param {express.Express} app
 * @param {object} deps - 依存オブジェクトをまとめて渡す
 */
export function registerPaymentRoutes(app, deps) {
  const {
    stripe,
    pool,
    BASE_URL,
    ADMIN_TOKEN,
    // ヘルパー類は server.js からそのまま渡す
    clientIp,
    bumpAndAllow,
    RATE_LIMIT_MAX_CHECKOUT,
    jstDayBounds,
    audit,
    sanitizeError,
    requireAdmin,
    PENDING_TTL_MIN,   // ← 追加
  } = deps;

  // ====== 🔍 Stripe webhook (raw body 必須) - デバッグログ追加版 ======
  app.post(
    "/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      console.log("[WEBHOOK] hit /webhooks/stripe");
      const sig = req.headers["stripe-signature"];
      let event;

      try {
        if (process.env.SKIP_WEBHOOK_VERIFY === "1") {
          // 🔍 テスト用:署名検証をスキップしてそのまま JSON パース
          const raw = req.body.toString("utf8");
          console.log("[WEBHOOK] SKIP_WEBHOOK_VERIFY=1, raw body =", raw);
          event = JSON.parse(raw);
        } else {
          // 通常ルート:署名検証あり
          event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
          );
        }
      } catch (err) {
        console.error("[WEBHOOK] construct error", err);
        return res
          .status(400)
          .json({ error: `Webhook Error: ${err.message}` });
      }

      try {
        const t = event.type;
        console.log("[WEBHOOK] event.type =", t);

        // 🟢 決済成功時にUPSERTパターンを使用(Race Condition回避)
        if (t === "payment_intent.succeeded") {
          const pi = event.data.object;
          console.log(
            "[WEBHOOK] payment_intent.succeeded pi.id=",
            pi.id,
            "sellerId=",
            pi.metadata?.sellerId,
            "orderId=",
            pi.metadata?.orderId
          );

          const sellerId = pi.metadata?.sellerId || "";
          const orderId = pi.metadata?.orderId || null;

          if (!sellerId) {
            console.warn("[WEBHOOK] pi.succeeded without sellerId, skip", pi.id);
          } else {
            const amount = typeof pi.amount_received === "number" ? pi.amount_received : 
                          typeof pi.amount === "number" ? pi.amount : 0;
            const currency = pi.currency || "jpy";
            const chargeId = pi.latest_charge || null;
            const created = pi.created ? new Date(pi.created * 1000) : new Date();

            // Charge情報から手数料を取得
            let fee = null;
            let balanceTxId = null;
            if (chargeId) {
              try {
                console.log("[WEBHOOK] Fetching charge info for chargeId=", chargeId);
                const charge = await stripe.charges.retrieve(chargeId);
                balanceTxId = charge.balance_transaction || null;
                
                if (balanceTxId && typeof balanceTxId === 'string') {
                  console.log("[WEBHOOK] Fetching balance transaction for balanceTxId=", balanceTxId);
                  const balanceTx = await stripe.balanceTransactions.retrieve(balanceTxId);
                  fee = balanceTx.fee || 0;
                  console.log("[WEBHOOK] Retrieved fee=", fee);
                }
              } catch (stripeErr) {
                console.error("[WEBHOOK] Failed to retrieve charge/balance info", stripeErr);
              }
            }

            const netAmount = fee !== null ? amount - fee : amount;

            console.log("[WEBHOOK] Upserting payment: amount=", amount, "fee=", fee, "netAmount=", netAmount);

            // ✅ UPSERTパターン(ON CONFLICT)
            await pool.query(
              `insert into stripe_payments (
                seller_id, order_id, payment_intent_id, charge_id, balance_tx_id,
                amount_gross, amount_fee, amount_net, currency, status, refunded_total, 
                raw_event, created_at, updated_at
              ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
              on conflict (payment_intent_id)
              do update set
                charge_id = excluded.charge_id,
                balance_tx_id = excluded.balance_tx_id,
                amount_gross = excluded.amount_gross,
                amount_fee = excluded.amount_fee,
                amount_net = excluded.amount_net,
                status = excluded.status,
                raw_event = excluded.raw_event,
                updated_at = now()`,
              [
                sellerId, orderId, pi.id, chargeId, balanceTxId,
                amount, fee, netAmount, currency, "succeeded", 0,
                event, created
              ]
            );

            console.log("[WEBHOOK] Payment upserted successfully for pi.id=", pi.id);

            // ordersテーブルのステータス更新
            if (orderId) {
              console.log("[WEBHOOK] Updating order status for orderId=", orderId);
              await pool.query(
                `update orders set status='paid', stripe_sid=$1, updated_at=now() where id=$2`,
                [pi.id, orderId]
              );
              console.log("[WEBHOOK] Order status updated to 'paid' for orderId=", orderId);
            }

            audit("pi_succeeded", { sellerId, orderId, pi: pi.id, amount, fee, netAmount });
            console.log("[WEBHOOK] Audit log created for pi_succeeded");
          }
        }

        // --- 返金:charge.refunded ---
        if (t === "charge.refunded" || t === "charge.refund.updated") {
          console.log("[WEBHOOK] Processing refund event:", t);
          const ch = event.data.object;
          const piId = ch.payment_intent || null;
          const amount = typeof ch.amount === "number" ? ch.amount : 0;
          const refunded = typeof ch.amount_refunded === "number" ? ch.amount_refunded : 0;
          
          console.log("[WEBHOOK] Refund details: piId=", piId, "amount=", amount, "refunded=", refunded);

          let fee = 0;
          const balanceTxId = ch.balance_transaction;
          if (balanceTxId && typeof balanceTxId === 'string') {
            try {
              console.log("[WEBHOOK] Fetching balance transaction for refund, balanceTxId=", balanceTxId);
              const balanceTx = await stripe.balanceTransactions.retrieve(balanceTxId);
              fee = balanceTx.fee || 0;
              console.log("[WEBHOOK] Refund fee retrieved:", fee);
            } catch (stripeErr) {
              console.error("[WEBHOOK] Failed to retrieve balance transaction for refund", stripeErr);
            }
          }
          
          const net = Math.max(amount - refunded - fee, 0);
          const status = refunded >= amount ? "refunded" : "partially_refunded";

          console.log("[WEBHOOK] Calculated net=", net, "status=", status);

          if (piId) {
            const r = await pool.query(
              `update stripe_payments set 
                amount_gross=$2, amount_fee=$3, amount_net=$4, refunded_total=$5, status=$6, 
                charge_id=$7, raw_event=$8, updated_at=now()
              where payment_intent_id=$1 returning seller_id`,
              [piId, amount, fee, net, refunded, status, ch.id, event]
            );

            if (r.rowCount === 0) {
              console.warn("[WEBHOOK] refund for unknown pi", piId);
            } else {
              console.log("[WEBHOOK] Refund updated successfully for piId=", piId);
              audit("charge_refund", { pi: piId, amount, refunded, fee, net, status });
            }
          }
        }

        // --- チャージバック発生:charge.dispute.created ---
        if (t === "charge.dispute.created") {
          console.log("[WEBHOOK] Processing charge.dispute.created");
          const dispute = event.data.object;
          const chargeId = dispute.charge || null;

          console.log("[WEBHOOK] Dispute created for chargeId=", chargeId);

          if (chargeId) {
            const r = await pool.query(
              `update stripe_payments set 
                status='disputed', dispute_status='needs_response', 
                amount_net=0, raw_event=$2, updated_at=now()
              where charge_id=$1 returning seller_id, payment_intent_id`,
              [chargeId, event]
            );

            if (r.rowCount === 0) {
              console.warn("[WEBHOOK] dispute.created: no payment for charge", chargeId);
            } else {
              const row = r.rows[0];
              console.log("[WEBHOOK] Dispute recorded for sellerId=", row.seller_id, "pi=", row.payment_intent_id);
              audit("dispute_created", { sellerId: row.seller_id, pi: row.payment_intent_id });
            }
          }
        }

        // --- チャージバッククローズ:charge.dispute.closed ---
        if (t === "charge.dispute.closed") {
          console.log("[WEBHOOK] Processing charge.dispute.closed");
          const dispute = event.data.object;
          const chargeId = dispute.charge || null;
          const outcome = dispute.status;

          console.log("[WEBHOOK] Dispute closed for chargeId=", chargeId, "outcome=", outcome);

          if (chargeId) {
            const disputeStatus = outcome === "won" ? "won" : "lost";
            const newStatus = outcome === "won" ? "succeeded" : "disputed";

            const r = await pool.query(
              `update stripe_payments set 
                status=$2, dispute_status=$3,
                amount_net = case when $2='disputed' then 0 else amount_gross - coalesce(amount_fee, 0) - refunded_total end,
                raw_event=$4, updated_at=now()
              where charge_id=$1 returning seller_id, payment_intent_id`,
              [chargeId, newStatus, disputeStatus, event]
            );

            if (r.rowCount === 0) {
              console.warn("[WEBHOOK] dispute.closed: no payment for charge", chargeId);
            } else {
              const row = r.rows[0];
              console.log("[WEBHOOK] Dispute closed successfully, status=", newStatus);
              audit("dispute_closed", { sellerId: row.seller_id, pi: row.payment_intent_id, status: newStatus });
            }
          }
        }

        console.log("[WEBHOOK] Event processing completed successfully for event.type=", t);
        return res.json({ received: true });
      } catch (err) {
        console.error("[WEBHOOK] handler error", err);
        return res.status(500).json({ error: "handler error" });
      }
    }
  );

  // ★ 追加:決済系API用の JSON パーサー
  // webhook は上で raw を使っているので影響しません
  app.use(express.json({ limit: "1mb" }));

  // ====== 🆕 出店者用API: 売上サマリー取得(サブスク判定追加) ======
  app.get("/api/seller/summary", async (req, res) => {
    const sellerId = req.query.s;
    if (!sellerId) {
      return res.status(400).json({ error: "seller_id_required" });
    }

    try {
      // 0) サブスク状態の判定(履歴テーブルから現在プランを取得)
      // 🆕 テーブルが存在しない場合のエラーハンドリングを追加
      let planType = "standard";
      let isSubscribed = false;
      
      try {
        const subRes = await pool.query(
          `
          SELECT plan_type, started_at, ended_at, status
            FROM seller_subscriptions
           WHERE seller_id = $1
             AND status = 'active'
             AND (ended_at IS NULL OR ended_at > now())
           ORDER BY started_at DESC
           LIMIT 1
          `,
          [sellerId]
        );

        if (subRes.rowCount > 0) {
          planType = subRes.rows[0].plan_type || "standard";
          isSubscribed = (planType === "pro" || planType === "kids");
        }
      } catch (subError) {
        // テーブルが存在しない場合やその他のエラーは無視してデフォルト値を使用
        console.warn("seller_subscriptions table not found or error:", subError.message);
        // planType = "standard", isSubscribed = false のまま（既に設定済み）
      }

      // ① 売上KPI(JST基準で正しく集計)
      //    → 「取引明細に出ているもの(現金+カード成功)」をすべて対象にする
      const { todayStart, tomorrowStart } = jstDayBounds();

      const kpiToday = await pool.query(
        `
        SELECT
          COUNT(*) AS cnt,
          -- 売上合計(gross)
          --   現金 : orders.amount
          --   カード: stripe_payments.amount_gross
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN o.amount
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
              ELSE 0
            END
          ), 0) AS gross,
          -- 純売上(net)
          --   現金 : 手数料0なのでそのまま amount
          --   カード: amount_net(返金・チャージバック反映後)
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN o.amount
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
              ELSE 0
            END
          ), 0) AS net,
          -- 手数料(fee)
          --   現金 : 0
          --   カード: amount_fee
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN 0
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN COALESCE(sp.amount_fee, 0)
              ELSE 0
            END
          ), 0) AS fee,
          -- 仕入額(cost)
          COALESCE(SUM(o.cost_amount), 0) AS cost
        FROM orders o
        LEFT JOIN order_metadata  om ON om.order_id = o.id
        LEFT JOIN stripe_payments sp ON sp.order_id = o.id
        WHERE o.seller_id = $1
          AND o.created_at >= $2
          AND o.created_at <  $3
          AND o.deleted_at IS NULL  -- 🆕 削除済みを除外
          AND (
            om.is_cash = true            -- 現金
            OR sp.status = 'succeeded'   -- カード成功
          )
        `,
        [sellerId, todayStart, tomorrowStart]
      );

      const todayGross = Number(kpiToday.rows[0].gross || 0);
      const todayNet   = Number(kpiToday.rows[0].net   || 0);
      const todayFee   = Number(kpiToday.rows[0].fee   || 0);
      const todayCost  = Number(kpiToday.rows[0].cost  || 0);
      const todayProfit = todayNet - todayCost;
      const countToday = parseInt(kpiToday.rows[0].cnt, 10) || 0;
      const avgToday   = countToday > 0 ? Math.round(todayNet / countToday) : 0;

      // ② 累計売上KPI(現金+カード統合)
      //    → 今日の売上と同じロジックで全期間を集計
      const kpiTotal = await pool.query(
        `
        SELECT
          -- 売上合計(gross)
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN o.amount
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
              ELSE 0
            END
          ), 0) AS gross,
          -- 純売上(net)
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN o.amount
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
              ELSE 0
            END
          ), 0) AS net,
          -- 手数料(fee)
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN 0
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN COALESCE(sp.amount_fee, 0)
              ELSE 0
            END
          ), 0) AS fee,
          -- ★ 累計の仕入額も追加
          COALESCE(SUM(o.cost_amount), 0) AS cost
        FROM orders o
        LEFT JOIN order_metadata  om ON om.order_id = o.id
        LEFT JOIN stripe_payments sp ON sp.order_id = o.id
        WHERE o.seller_id = $1
          AND o.deleted_at IS NULL  -- 🆕 削除済みを除外
          AND (
            om.is_cash = true
            OR sp.status = 'succeeded'
          )
        `,
        [sellerId]
      );

      // ② 取引履歴(orders を基準に、カードも現金も一緒に出す)
      const recentRes = await pool.query(
        `
        SELECT
          o.id                     AS order_id,
          o.created_at,
          o.amount,
          o.cost_amount,
          o.summary              AS memo,
          o.world_price_median,
          o.world_price_high,
          o.world_price_low,
          o.world_price_sample_count,
          om.is_cash,
          om.category            AS raw_category,
          CASE 
            WHEN om.is_cash THEN 'cash'
            WHEN sp.id IS NOT NULL THEN 'card'
            ELSE 'other'
          END                      AS payment_method,
          ba.customer_type,
          ba.gender,
          ba.age_band
        FROM orders o
        LEFT JOIN order_metadata   om ON om.order_id = o.id
        LEFT JOIN stripe_payments  sp ON sp.order_id = o.id
        LEFT JOIN buyer_attributes ba ON ba.order_id = o.id
        WHERE o.seller_id = $1
          AND o.deleted_at IS NULL  -- 🆕 削除済みを除外
          AND (
            om.is_cash = true              -- 現金はステータスに関係なく表示
            OR sp.status = 'succeeded'     -- カード決済はStripe成功のみ表示
          )
          AND o.created_at >= NOW() - INTERVAL '30 days'  -- ★ 過去30日間に拡張
        ORDER BY o.created_at DESC
        `,
        [sellerId]
      );

      const recent = recentRes.rows.map(r => {
        const amt = Number(r.amount || 0);
        const created = r.created_at;
        const createdSec = created ? Math.floor(new Date(created).getTime() / 1000) : null;

        return {
          // 新しいフィールド名
          orderId: r.order_id,
          createdAt: created,
          amount: amt,
          costAmount: r.cost_amount === null ? null : Number(r.cost_amount),
          memo: r.memo || "",
          // 🌍 世界相場(参考): eBay US / eBay UK のうち高い方を別処理で world_* に保存する想定
          worldMedian: r.world_price_median,
          worldHigh: r.world_price_high,
          worldLow: r.world_price_low,
          worldSampleCount: r.world_price_sample_count,
          isCash: !!r.is_cash,
          rawCategory: r.raw_category,
          paymentMethod: r.payment_method,
          customerType: r.customer_type || "unknown",
          gender: r.gender || "unknown",
          ageBand: r.age_band || "unknown",

          // 旧フロント互換フィールド
          created: createdSec,                // 秒単位タイムスタンプ
          summary: r.memo || "",
          net_amount: amt,
          status: r.is_cash ? "現金" : "通常",
          is_cash: !!r.is_cash,
          raw_category: r.raw_category,
          payment_method: r.payment_method,
          customer_type: r.customer_type || "unknown",
          age_band: r.age_band || "unknown",

          // 旧コードが想定していた buyer オブジェクト
          buyer: {
            customer_type: r.customer_type || "unknown",
            gender: r.gender || "unknown",
            age_band: r.age_band || "unknown",
          },
        };
      });

      // ③ データ精度スコア計算(購入者属性が入力された割合)
      const scoreRes = await pool.query(
        `
        SELECT 
          COUNT(*) as total,
          COUNT(ba.customer_type) as with_attrs
        FROM orders o
        LEFT JOIN buyer_attributes ba ON ba.order_id = o.id
        WHERE o.seller_id = $1
          AND o.deleted_at IS NULL  -- 🆕 削除済みを除外
        `,
        [sellerId]
      );
      
      const total = parseInt(scoreRes.rows[0].total) || 0;
      const withAttrs = parseInt(scoreRes.rows[0].with_attrs) || 0;
      const dataScore = total > 0 ? Math.round((withAttrs / total) * 100) : 0;

      res.json({
        sellerId,
        planType,
        isSubscribed,

        // 新フォーマット
        salesToday: {
          gross: todayGross,
          net:   todayNet,
          fee:   todayFee,
          cost:  todayCost,
          profit: todayProfit,
          count: countToday,
          avgNet: avgToday,
        },
        salesTotal: {
          gross: Number(kpiTotal.rows[0].gross || 0),
          net:   Number(kpiTotal.rows[0].net   || 0),
          fee:   Number(kpiTotal.rows[0].fee   || 0),
          cost:  Number(kpiTotal.rows[0].cost  || 0),  // ★ 累計仕入額を追加
          profit: Number(kpiTotal.rows[0].net || 0) - Number(kpiTotal.rows[0].cost || 0)  // ★ 累計利益を追加
        },

        // ★ 旧フロント用の互換フィールド
        salesTodayNet: todayNet,
        countToday,
        avgToday,

        dataScore,
        recent
      });
    } catch (e) {
      console.error("seller_summary_error", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // ====== 📊 売上・利益分析API（日毎・週毎グラフ用） ======
  app.get("/api/seller/analytics", async (req, res) => {
    try {
      const sellerId = String(req.query.s || "");
      if (!sellerId) {
        return res.status(400).json({ ok: false, error: "seller_id_required" });
      }

      const period = String(req.query.period || "daily");
      const days = Math.min(parseInt(req.query.days || "30", 10), 90); // 最大90日

      let data;
      if (period === "daily") {
        data = await getDailyAnalytics(sellerId, days);
      } else if (period === "weekly") {
        const weeks = Math.ceil(days / 7);
        data = await getWeeklyAnalytics(sellerId, weeks);
      } else {
        return res.status(400).json({ ok: false, error: "invalid_period" });
      }

      // ベンチマークデータの取得（オプショナル）
      let benchmarkData = [];
      try {
        // プロジェクトルートのdataディレクトリを参照
        const csvPath = path.join(process.cwd(), "data", "benchmark.csv");
        if (existsSync(csvPath)) {
          const csvContent = readFileSync(csvPath, "utf-8");
          const lines = csvContent.trim().split("\n");
          const headers = lines[0].split(",").map(h => h.trim());
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = [];
            let current = "";
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            values.push(current.trim());
            
            const row = {};
            headers.forEach((header, index) => {
              let value = values[index] || "";
              if (header === "week" || header === "base" || header === "improvement") {
                value = parseInt(value, 10) || 0;
              }
              row[header] = value;
            });
            
            benchmarkData.push(row);
          }
        }
      } catch (csvError) {
        console.error("CSV読み込みエラー:", csvError);
        // ベンチマークデータの読み込みに失敗しても続行
      }

      const response = { 
        ok: true, 
        period, 
        days, 
        data
      };
      
      // ベンチマークデータがある場合のみ追加
      if (benchmarkData.length > 0) {
        response.benchmark = benchmarkData;
      }
      
      res.json(response);
    } catch (e) {
      console.error("Analytics error:", e);
      res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  // 日毎の集計関数
  async function getDailyAnalytics(sellerId, days = 30) {
    const { todayStart } = jstDayBounds();
    
    // 過去N日分のデータを取得
    const results = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const result = await pool.query(
        `
        SELECT
          COUNT(*) AS transaction_count,
          -- 売上合計(gross)
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN o.amount
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
              ELSE 0
            END
          ), 0) AS gross_sales,
          -- 純売上(net)
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN o.amount
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
              ELSE 0
            END
          ), 0) AS net_sales,
          -- 仕入額
          COALESCE(SUM(o.cost_amount), 0) AS total_cost
        FROM orders o
        LEFT JOIN order_metadata om ON om.order_id = o.id
        LEFT JOIN stripe_payments sp ON sp.order_id = o.id
        WHERE o.seller_id = $1
          AND o.created_at >= $2
          AND o.created_at < $3
          AND o.deleted_at IS NULL
          AND (
            om.is_cash = true
            OR sp.status = 'succeeded'
          )
        `,
        [sellerId, dayStart, dayEnd]
      );
      
      const row = result.rows[0] || {};
      const grossSales = Number(row.gross_sales || 0);
      const netSales = Number(row.net_sales || 0);
      const totalCost = Number(row.total_cost || 0);
      const profit = netSales - totalCost;
      const transactionCount = parseInt(row.transaction_count || 0, 10);
      
      // 日付文字列（YYYY-MM-DD形式）
      const dateStr = dayStart.toISOString().split('T')[0];
      
      results.push({
        date: dateStr,
        grossSales,
        netSales,
        totalCost,
        profit,
        transactionCount
      });
    }
    
    return results;
  }

  // 週毎の集計関数
  async function getWeeklyAnalytics(sellerId, weeks = 4) {
    const { todayStart } = jstDayBounds();
    
    // JST基準で今日の0:00を求める（jstDayBoundsの結果を使用）
    const nowUtc = new Date();
    const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC+9
    const nowJstMs = nowUtc.getTime() + jstOffset;
    const nowJst = new Date(nowJstMs);
    
    // 週の開始日（月曜日）を求める
    const dayOfWeek = nowJst.getUTCDay(); // 0=日曜, 1=月曜, ...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日までの日数
    const thisMonday = new Date(todayStart.getTime() - mondayOffset * 24 * 60 * 60 * 1000);
    
    const results = [];
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(thisMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const result = await pool.query(
        `
        SELECT
          COUNT(*) AS transaction_count,
          -- 売上合計(gross)
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN o.amount
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
              ELSE 0
            END
          ), 0) AS gross_sales,
          -- 純売上(net)
          COALESCE(SUM(
            CASE 
              WHEN om.is_cash = true THEN o.amount
              WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
              ELSE 0
            END
          ), 0) AS net_sales,
          -- 仕入額
          COALESCE(SUM(o.cost_amount), 0) AS total_cost
        FROM orders o
        LEFT JOIN order_metadata om ON om.order_id = o.id
        LEFT JOIN stripe_payments sp ON sp.order_id = o.id
        WHERE o.seller_id = $1
          AND o.created_at >= $2
          AND o.created_at < $3
          AND o.deleted_at IS NULL
          AND (
            om.is_cash = true
            OR sp.status = 'succeeded'
          )
        `,
        [sellerId, weekStart, weekEnd]
      );
      
      const row = result.rows[0] || {};
      const grossSales = Number(row.gross_sales || 0);
      const netSales = Number(row.net_sales || 0);
      const totalCost = Number(row.total_cost || 0);
      const profit = netSales - totalCost;
      const transactionCount = parseInt(row.transaction_count || 0, 10);
      
      // 週の開始日（YYYY-MM-DD形式）
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      results.push({
        weekStart: weekStartStr,
        grossSales,
        netSales,
        totalCost,
        profit,
        transactionCount
      });
    }
    
    return results;
  }

  // ====== 📊 ベンチマークデータ取得API ======
  app.get("/api/benchmark/data", async (req, res) => {
    try {
      // プロジェクトルートのdataディレクトリを参照
      const csvPath = path.join(process.cwd(), "data", "benchmark.csv");
      
      if (!existsSync(csvPath)) {
        return res.status(404).json({ 
          error: "file_not_found", 
          message: "ベンチマークCSVファイルが見つかりません" 
        });
      }

      const csvContent = readFileSync(csvPath, "utf-8");
      const lines = csvContent.trim().split("\n");
      
      if (lines.length < 2) {
        return res.status(400).json({ 
          error: "invalid_csv", 
          message: "CSVファイルの形式が不正です" 
        });
      }

      // ヘッダー行を取得
      const headers = lines[0].split(",").map(h => h.trim());
      
      // データ行をパース
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // CSVのパース（カンマ区切り、ただし引用符内のカンマは考慮）
        const values = [];
        let current = "";
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        // オブジェクトに変換
        const row = {};
        headers.forEach((header, index) => {
          let value = values[index] || "";
          // 数値に変換できる場合は数値に
          if (header === "week" || header === "base" || header === "improvement") {
            value = parseInt(value, 10) || 0;
          }
          row[header] = value;
        });
        
        data.push(row);
      }

      res.json({
        ok: true,
        data: data,
        count: data.length
      });
    } catch (error) {
      console.error("benchmark/data error:", error);
      res.status(500).json({ 
        error: "internal_error", 
        message: error.message 
      });
    }
  });

  // ====== 🆕 出店者用API: 注文詳細取得 ======
  app.get("/api/seller/order-detail", async (req, res) => {
    try {
      const sellerId = req.query.s;
      const orderId = req.query.orderId;

      if (!sellerId || !orderId) {
        return res.status(400).json({ error: "missing_params" });
      }

      const result = await pool.query(
        `select
           o.id as order_id,
           o.seller_id,
           o.amount,
           o.summary,
           o.status,
           o.created_at,
           coalesce(om.is_cash, false) as is_cash
         from orders o
         left join order_metadata om
           on om.order_id = o.id
         where o.id = $1
           and o.seller_id = $2
           and o.deleted_at IS NULL  -- 🆕 削除済みを除外
         limit 1`,
        [orderId, sellerId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "not_found" });
      }

      const row = result.rows[0];

      // ==== 有効期限 & ステータス & 現金チェック ====
      const createdAt = row.created_at instanceof Date
        ? row.created_at
        : new Date(row.created_at);

      const expireMs = PENDING_TTL_MIN * 60 * 1000;
      const isExpiredByTime = Date.now() - createdAt.getTime() > expireMs;
      const isInactiveStatus = row.status !== "pending";
      const isCash = row.is_cash === true;

      if (isExpiredByTime || isInactiveStatus || isCash) {
        // checkout.html 側は error==='expired' を見て「時間切れ」表示へ切り替える想定
        return res.json({
          orderId: row.order_id,
          sellerId: row.seller_id,
          amount: null,
          summary: null,
          error: "expired",
        });
      }

      // checkout.html が期待している形に合わせる(通常ケース)
      return res.json({
        orderId: row.order_id,
        sellerId: row.seller_id,
        amount: row.amount,
        summary: row.summary,
        status: row.status,
        createdAt: row.created_at,
      });
    } catch (e) {
      console.error("seller_order_detail_error", e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // ====== 🆕 決済結果取得API(success.html 用) ======
  app.get("/api/checkout/result", async (req, res) => {
    try {
      const orderId = req.query.orderId;
      if (!orderId) {
        return res.status(400).json({ error: "order_id_required" });
      }

      const result = await pool.query(
        `
        SELECT
          o.id            AS order_id,
          o.seller_id,
          o.amount,
          o.status       AS order_status,
          o.created_at,
          sp.status      AS payment_status,
          sp.amount_gross,
          sp.amount_net,
          sp.currency,
          sp.created_at  AS paid_at
        FROM orders o
        LEFT JOIN stripe_payments sp
          ON sp.order_id = o.id
        WHERE o.id = $1
          AND o.deleted_at IS NULL  -- 🆕 削除済みを除外
        ORDER BY sp.created_at DESC NULLS LAST
        LIMIT 1
        `,
        [orderId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "order_not_found" });
      }

      const row = result.rows[0];

      const isPaid =
        row.order_status === "paid" ||
        row.payment_status === "succeeded";

      res.json({
        orderId: row.order_id,
        sellerId: row.seller_id,
        amount: row.amount,
        currency: row.currency || "jpy",
        orderStatus: row.order_status,
        paymentStatus: row.payment_status || null,
        isPaid,
        paidAt: row.paid_at
      });
    } catch (e) {
      console.error("/api/checkout/result error", e);
      return res.status(500).json({ error: "server_error" });
    }
  });
 
  // ====== 決済画面生成(Checkout Session) - 🔧 修正版: on_behalf_of を削除 ======
  app.post("/api/checkout/session", async (req, res) => {
    try {
      // ★ 修正: 安全な req.body 処理
      const body = req.body || {};
      const { sellerId, latest, summary, orderId: bodyOrderId } = body;
      const orderId = bodyOrderId || req.query.order || "";

      if (!sellerId && !orderId) {
        return res.status(400).json({ error: "seller_id_or_order_id_required" });
      }

      const ip = clientIp(req);
      if (!bumpAndAllow(`checkout:${ip}`, RATE_LIMIT_MAX_CHECKOUT)) {
        return res.status(429).json({ error: "rate_limited" });
      }

      // orderの取得または作成
      let order;
      if (orderId) {
        const r = await pool.query(
          `select * from orders where id=$1 AND deleted_at IS NULL limit 1`,
          [orderId]
        );
        if (r.rowCount === 0) {
          return res.status(404).json({ error: "order_not_found" });
        }
        order = r.rows[0];
      } else {
        // 新規注文作成
        const amount = latest?.amount || 0;
        const orderNo = await getNextOrderNo(pool, sellerId);
        
        const insertRes = await pool.query(
          `insert into orders (seller_id, order_no, amount, summary, status)
           values ($1, $2, $3, $4, 'pending')
           returning *`,
          [sellerId, orderNo, amount, summary || ""]
        );
        order = insertRes.rows[0];
      }

      // 金額バリデーション: 0円以下の注文は決済させない
      if (!order.amount || Number(order.amount) <= 0) {
        console.error("[Checkout] invalid order amount", {
          orderId: order.id,
          amount: order.amount,
        });
        return res.status(400).json({
          error: "invalid_amount",
          message: "金額が0円のため決済を開始できません。",
        });
      }

      // 🔧 修正: 完全にプラットフォーム名義の決済にする(on_behalf_of を削除)
      const successUrl = `${BASE_URL}/success.html?order=${order.id}`;
      const cancelUrl = `${BASE_URL}/checkout.html?s=${order.seller_id}&order=${order.id}`;

      const sessionParams = {
        mode: "payment",
        payment_method_types: [
          "card",        // カード / Apple Pay / Google Pay
          "link",        // Stripe Link
          "alipay"       // Alipay
          // ✅ "wechat_pay" を削除(応急処置: Stripeアカウントで未有効化のため)
          // 将来的にWeChat Payを有効化する場合は、以下を追加してください:
          // "wechat_pay"
        ],
        locale: "auto",
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: {
                name: order.summary || "商品",
              },
              unit_amount: order.amount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          // ← FleaPay(プラットフォーム)名義の決済にする
          metadata: {
            sellerId: order.seller_id,
            orderId: order.id,
          },
        },
      };

      // プラットフォームアカウントでセッションを作成(stripeAccountオプションなし)
      const session = await stripe.checkout.sessions.create(sessionParams);

      res.json({ url: session.url, sessionId: session.id });

    } catch (error) {
      console.error("/api/checkout/session エラー発生:", error);
      if (error.type === "StripeInvalidRequestError") {
        return res.status(400).json({
          error: "stripe_error",
          message: error.message,
        });
      }
      res.status(500).json(sanitizeError(error));
    }
  });

  // ====== 金額取得API (🟢 TTL付きに改善 + 現金除外パッチ適用) ======
  app.get("/api/price/latest", async (req, res) => {
    const sellerId = req.query.s;
    if (!sellerId) {
      return res.status(400).json({ error: "seller_id_required" });
    }

    try {
      // ✅ パッチ適用: 現金注文を除外し、pending ステータスのみを取得
      const result = await pool.query(
        `select 
           o.id, 
           o.seller_id, 
           o.amount, 
           o.summary, 
           o.status, 
           o.created_at
         from orders o
         left join order_metadata om
           on om.order_id = o.id
         where
           o.seller_id = $1
           and o.status = 'pending'               -- 未決済のみ
           and coalesce(om.is_cash, false) = false -- 現金を除外
           and o.deleted_at IS NULL  -- 🆕 削除済みを除外（pending注文は削除済みを除外）
         order by o.created_at desc
         limit 1`,
        [sellerId]
      );

      if (result.rowCount === 0) {
        return res.json({
          orderId: null,
          sellerId,
          amount: null,
          summary: null,
          error: "not_found",
        });
      }

      const row = result.rows[0];

      const createdAt = row.created_at instanceof Date
        ? row.created_at
        : new Date(row.created_at);

      const expireMs = PENDING_TTL_MIN * 60 * 1000;
      const isExpiredByTime = Date.now() - createdAt.getTime() > expireMs;
      const isInactiveStatus = row.status !== "pending";

      if (isExpiredByTime || isInactiveStatus) {
        // checkout.html 側で「時間切れ」表示に切り替える
        return res.json({
          orderId: row.id,
          sellerId: row.seller_id,
          amount: null,
          summary: null,
          error: "expired",
        });
      }

      return res.json({
        orderId: row.id,
        sellerId: row.seller_id,
        amount: row.amount,
        summary: row.summary,
      });
    } catch (e) {
      console.error("get latest price error", e);
      return res.status(500).json(sanitizeError(e));
    }
  });

  // ====== 🌍 世界相場(参考)をバックグラウンドで更新するエンドポイント ======
  app.post("/api/orders/update-world-price", async (req, res) => {
    const { orderId, sellerId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ ok: false, error: "orderId is required" });
    }

    // 🆕 削除済み注文のチェック
    const orderCheck = await pool.query(
      `select id, deleted_at from orders where id = $1`,
      [orderId]
    );
    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "order_not_found" });
    }
    if (orderCheck.rows[0].deleted_at) {
      return res.status(400).json({ ok: false, error: "order_deleted", message: "削除済みの注文は更新できません" });
    }

    // ここではすぐレスポンスを返し、重い処理はバックグラウンドで実行
    try {
      queueWorldPriceUpdate(pool, orderId, sellerId).catch((err) => {
        console.error("[world-price] background error", err);
      });
      return res.json({ ok: true, status: "queued" });
    } catch (e) {
      console.error("[world-price] queue error", e);
      return res.status(500).json({ ok: false, error: "queue_failed" });
    }
  });

  // ====== 🌍 eBay世界相場デバッグ用API ======
  // summary を直指定して、内部でどんなキーワード＆相場が計算されるかを確認する
  app.get("/api/debug/world-price", async (req, res) => {
    const summary = (req.query.summary || "").trim();
    if (!summary) {
      return res.status(400).json({ ok: false, error: "summary_required" });
    }

    try {
      const genreId = detectGenreIdFromSummary(summary);
      const keyword = buildEbayKeywordFromSummary(summary);

      const us = await fetchWorldPriceFromEbayMarketplace(keyword, "EBAY_US", genreId);
      const uk = await fetchWorldPriceFromEbayMarketplace(keyword, "EBAY_GB", genreId);

      return res.json({
        ok: true,
        summary,
        genreId,
        keywordForEbay: keyword,
        mode: EBAY_SOURCE_MODE,
        us,
        uk,
      });
    } catch (e) {
      console.error("[debug/world-price] error", e);
      return res.status(500).json({
        ok: false,
        error: "server_error",
        detail: e.message,
      });
    }
  });

  // ====== 🟢 改善された管理API: Stripeサマリー取得 ======
  app.get("/api/admin/stripe/summary", requireAdmin, async (req, res) => {
    try {
      const period = req.query.period || 'today';

      const nowSec = Math.floor(Date.now() / 1000);
      let createdFilter = undefined;

      if (period === 'today') {
        const since = nowSec - 24 * 60 * 60;
        createdFilter = { gte: since };
      } else if (period === 'week') {
        const since = nowSec - 7 * 24 * 60 * 60;
        createdFilter = { gte: since };
      } else if (period === 'month') {
        const since = nowSec - 30 * 24 * 60 * 60;
        createdFilter = { gte: since };
      }

      // タイムアウト付きStripe API呼び出し
      const fetchWithTimeout = (promise, timeout = 10000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Stripe API timeout')), timeout)
          )
        ]);
      };

      // 1) 決済(charge.succeeded)
      const chargeParams = { limit: 100 };
      if (createdFilter) chargeParams.created = createdFilter;

      const chargesList = await fetchWithTimeout(
        stripe.charges.list(chargeParams)
      );

      const succeededCharges = chargesList.data.filter(c => c.status === 'succeeded');
      const grossAmount = succeededCharges.reduce((sum, c) => sum + (c.amount || 0), 0);

      // 2) チャージバック(disputes)
      const disputeParams = { limit: 100 };
      if (createdFilter) disputeParams.created = createdFilter;

      const disputesList = await fetchWithTimeout(
        stripe.disputes.list(disputeParams)
      );

      // 🟢 期限間近のチャージバック(3日以内)
      const urgentDisputes = disputesList.data.filter(d => {
        const dueBy = d.evidence_details?.due_by;
        if (!dueBy) return false;
        const daysUntilDue = Math.ceil((dueBy * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 3 && daysUntilDue > 0;
      });

      // 3) 返金(refunds)
      const refundParams = { limit: 100 };
      if (createdFilter) refundParams.created = createdFilter;

      const refundsList = await fetchWithTimeout(
        stripe.refunds.list(refundParams)
      );
      const refundAmount = refundsList.data.reduce((sum, r) => sum + (r.amount || 0), 0);

      const netSales = grossAmount - refundAmount;

      res.json({
        ok: true,
        summary: {
          period,
          // 🟢 標準フィールド名
          paymentsCount: succeededCharges.length,
          paymentsGross: grossAmount,
          netSales,
          disputeCount: disputesList.data.length,
          urgentDisputes: urgentDisputes.length,
          refundCount: refundsList.data.length,
          refundAmount,
          
          // 🟢 互換性のためのエイリアス
          todayPayments: succeededCharges.length,
          todayRevenue: netSales,
          activeDisputes: disputesList.data.length
        },
        charges: succeededCharges,
        disputes: disputesList.data,
        refunds: refundsList.data,
      });
    } catch (err) {
      console.error('[/api/admin/stripe/summary] error', err);
      
      // Stripe APIエラーの詳細なハンドリング
      if (err.type === 'StripeAPIError' || err.message.includes('Stripe')) {
        return res.status(503).json({ 
          ok: false, 
          error: 'stripe_api_error',
          message: 'Stripe APIとの通信に失敗しました'
        });
      }
      
      if (err.message.includes('timeout')) {
        return res.status(504).json({
          ok: false,
          error: 'timeout',
          message: 'Stripe APIのタイムアウトが発生しました'
        });
      }
      
      res.status(500).json({ 
        ok: false, 
        error: err.message || 'internal_error' 
      });
    }
  });

  // ====== 管理API: 決済一覧取得 ======
  app.get("/api/admin/payments", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status || "";
      const search = req.query.search || "";
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = parseInt(req.query.offset) || 0;

      let query = `
        select 
          sp.id,
          sp.seller_id,
          sp.order_id,
          sp.payment_intent_id,
          sp.charge_id,
          sp.balance_tx_id,
          sp.amount_gross,
          sp.amount_fee,
          sp.amount_net,
          sp.currency,
          sp.status,
          sp.refunded_total,
          sp.dispute_status,
          sp.created_at,
          sp.updated_at,
          o.order_no,
          o.summary as order_summary,
          s.display_name as seller_name
        from stripe_payments sp
        left join orders o on sp.order_id = o.id
        left join sellers s on sp.seller_id = s.id
        where 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (status) {
        query += ` and sp.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (search) {
        query += ` and (
          sp.payment_intent_id ilike $${paramIndex} 
          or sp.charge_id ilike $${paramIndex}
          or s.display_name ilike $${paramIndex}
          or o.summary ilike $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` order by sp.created_at desc limit $${paramIndex} offset $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // 総件数取得
      let countQuery = `
        select count(*) as total
        from stripe_payments sp
        left join orders o on sp.order_id = o.id
        left join sellers s on sp.seller_id = s.id
        where 1=1
      `;
      const countParams = [];
      let countParamIndex = 1;

      if (status) {
        countQuery += ` and sp.status = $${countParamIndex}`;
        countParams.push(status);
        countParamIndex++;
      }

      if (search) {
        countQuery += ` and (
          sp.payment_intent_id ilike $${countParamIndex} 
          or sp.charge_id ilike $${countParamIndex}
          or s.display_name ilike $${countParamIndex}
          or o.summary ilike $${countParamIndex}
        )`;
        countParams.push(`%${search}%`);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total) || 0;

      res.json({
        payments: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (e) {
      console.error("get payments error", e);
      res.status(500).json(sanitizeError(e));
    }
  });

  // ====== 管理API: ダッシュボード ======
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      const { todayStart, tomorrowStart, yesterdayStart } = jstDayBounds();

      // 今日の売上統計
      const todayStats = await pool.query(
        `select
          count(*) as order_count,
          coalesce(sum(amount_gross), 0) as gross,
          coalesce(sum(amount_net), 0) as net,
          coalesce(sum(amount_fee), 0) as fee
        from stripe_payments
        where created_at >= $1 and created_at < $2`,
        [todayStart, tomorrowStart]
      );

      // 昨日の売上統計
      const yesterdayStats = await pool.query(
        `select
          count(*) as order_count,
          coalesce(sum(amount_gross), 0) as gross,
          coalesce(sum(amount_net), 0) as net
        from stripe_payments
        where created_at >= $1 and created_at < $2`,
        [yesterdayStart, todayStart]
      );

      // 全期間統計
      const totalStats = await pool.query(
        `select
          count(*) as order_count,
          coalesce(sum(amount_gross), 0) as gross,
          coalesce(sum(amount_net), 0) as net,
          coalesce(sum(amount_fee), 0) as fee
        from stripe_payments`
      );

      // アクティブな出店者数
      const sellerCount = await pool.query(
        `select count(distinct seller_id) as count from stripe_payments`
      );

      // 最近のアクティビティ
      const recentActivity = await pool.query(
        `select
          sp.id,
          sp.seller_id,
          sp.payment_intent_id,
          sp.amount_gross,
          sp.status,
          sp.created_at,
          s.display_name as seller_name,
          o.order_no
        from stripe_payments sp
        left join sellers s on sp.seller_id = s.id
        left join orders o on sp.order_id = o.id
        order by sp.created_at desc
        limit 10`
      );

      res.json({
        today: {
          orderCount: parseInt(todayStats.rows[0].order_count) || 0,
          gross: Number(todayStats.rows[0].gross || 0),
          net: Number(todayStats.rows[0].net || 0),
          fee: Number(todayStats.rows[0].fee || 0)
        },
        yesterday: {
          orderCount: parseInt(yesterdayStats.rows[0].order_count) || 0,
          gross: Number(yesterdayStats.rows[0].gross || 0),
          net: Number(yesterdayStats.rows[0].net || 0)
        },
        total: {
          orderCount: parseInt(totalStats.rows[0].order_count) || 0,
          gross: Number(totalStats.rows[0].gross || 0),
          net: Number(totalStats.rows[0].net || 0),
          fee: Number(totalStats.rows[0].fee || 0)
        },
        sellerCount: parseInt(sellerCount.rows[0].count) || 0,
        recentActivity: recentActivity.rows
      });
    } catch (e) {
      console.error("dashboard error", e);
      res.status(500).json(sanitizeError(e));
    }
  });
}

// =====================
// 補助関数
// =====================

async function getNextOrderNo(pool, sellerId) {
  const r = await pool.query(
    `select coalesce(max(order_no), 0) as max_no from orders where seller_id=$1`,
    [sellerId]
  );
  return (r.rows[0].max_no || 0) + 1;
}
