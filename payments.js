// payments.js
import express from "express";
import {
  buildEbayKeywordFromSummary,
  buildPriceStats,
} from "./worldPriceGenreEngine.js";

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

      let planType = "standard";
      let isSubscribed = false;
      if (subRes.rowCount > 0) {
        planType = subRes.rows[0].plan_type || "standard";
        isSubscribed = (planType === "pro" || planType === "kids");
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
          `select * from orders where id=$1 limit 1`,
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

    // 🆕 eBay 連携の事前チェック
    try {
      // 1) eBay API 用の環境変数が無い場合 → 設定ミスとして即エラー
      if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
        return res.status(500).json({
          ok: false,
          error: "ebay_not_configured",
          message:
            "eBay 連携が未設定のため、世界相場(参考)の取得は利用できません。\n運営側で eBay 接続設定を行ってください。",
        });
      }

      // 2) 軽く eBay に接続できるか確認(トークンが取れなければ通信エラー扱い)
      const token = await getEbayAccessToken();
      if (!token) {
        return res.status(502).json({
          ok: false,
          error: "ebay_unreachable",
          message:
            "eBay と通信できないため、世界相場(参考)の取得に失敗しました。\n時間をおいてもう一度お試しください。",
        });
      }
    } catch (e) {
      console.error("[world-price] precheck error", e);
      return res.status(502).json({
        ok: false,
        error: "ebay_precheck_failed",
        message:
          "eBay 連携の確認中にエラーが発生しました。世界相場(参考)の取得は一時的に利用できません。",
      });
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
      const keyword = buildEbayKeywordFromSummary(summary);

      const us = await fetchWorldPriceFromEbayMarketplace(keyword, "EBAY_US");
      const uk = await fetchWorldPriceFromEbayMarketplace(keyword, "EBAY_GB");

      return res.json({
        ok: true,
        summary,
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
// 🌍 世界相場 更新ロジック
// =====================

// 🆕 eBay API 用の環境変数
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID || "";
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET || "";
const EBAY_ENV = process.env.EBAY_ENV || "production"; // or "sandbox"

// 🆕 世界相場デバッグログ用フラグ
const WORLD_PRICE_DEBUG = process.env.WORLD_PRICE_DEBUG === "1";

// 🆕 データソースモード: active or sold
//   sold にした場合、将来的に Completed/Sold API に差し替える想定
const EBAY_SOURCE_MODE = process.env.EBAY_SOURCE_MODE || "active";

// 🆕 eBay アクセストークンの簡易キャッシュ
const ebayTokenCache = {
  token: null,
  expiresAt: 0, // epoch ms
};

// 🆕 為替レートキャッシュ (USD/JPY, GBP/JPY)
let fxCache = {
  usd_jpy: null,
  gbp_jpy: null,
  expiresAt: 0,
};

// 🆕 セット(lot / まとめ売り)っぽい summary なら世界相場を付けない(パターンA)
function isSetLikeSummary(text = "") {
  const t = text.toLowerCase();

  // 日本語キーワード
  const jpKeywords = [
    "セット",
    "まとめ売り",
    "まとめて",
    "大量",
    "山盛り",
    "福袋",
    "オリパ",
    "束",
    "複数枚"
  ];

  // 英語キーワード
  const enKeywords = [
    "set",
    "lot",
    "bulk",
    "bundle",
    "mixed",
    "random",
  ];

  return [...jpKeywords, ...enKeywords].some((kw) => t.includes(kw));
}


// 🆕 eBay OAuth トークン取得(client_credentials)
async function getEbayAccessToken() {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    console.warn("[world-price] EBAY_CLIENT_ID/SECRET not set, skip eBay call");
    return null;
  }

  const now = Date.now();
  // 有効期限まで 1 分以上あるならキャッシュを使う
  if (ebayTokenCache.token && ebayTokenCache.expiresAt > now + 60_000) {
    return ebayTokenCache.token;
  }

  const tokenUrl =
    EBAY_ENV === "sandbox"
      ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
      : "https://api.ebay.com/identity/v1/oauth2/token";

  const basic = Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`,
    "utf8"
  ).toString("base64");

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("scope", "https://api.ebay.com/oauth/api_scope");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[world-price] ebay token error", res.status, text);
    return null;
  }

  const json = await res.json();
  const accessToken = json.access_token;
  const expiresIn = Number(json.expires_in || 0); // 秒

  if (!accessToken) {
    console.error("[world-price] ebay token missing in response");
    return null;
  }

  ebayTokenCache.token = accessToken;
  ebayTokenCache.expiresAt = Date.now() + expiresIn * 1000;

  console.log("[world-price] ebay token refreshed, expiresIn(s)=", expiresIn);

  return accessToken;
}

// 🆕 為替レート取得(外部API + 1時間キャッシュ)
async function getFxRates() {
  const now = Date.now();

  if (fxCache.expiresAt > now && fxCache.usd_jpy && fxCache.gbp_jpy) {
    return {
      usd_jpy: fxCache.usd_jpy,
      gbp_jpy: fxCache.gbp_jpy,
    };
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();

    const usd_jpy = Number(data.rates?.JPY || 150);
    const gbp_usd = Number(data.rates?.GBP || 0.79); // 1 USD あたりの GBP
    // 1 GBP = (USD/GBP) * (JPY/USD)
    const gbp_jpy = usd_jpy * (1 / gbp_usd);

    fxCache = {
      usd_jpy,
      gbp_jpy,
      expiresAt: now + 60 * 60 * 1000, // 1時間
    };

    console.log("[fx] updated:", fxCache);

    return { usd_jpy, gbp_jpy };
  } catch (e) {
    console.error("[fx] fetch error", e);
    // 取得失敗時は前回値 or デフォルト
    return {
      usd_jpy: fxCache.usd_jpy || 150,
      gbp_jpy: fxCache.gbp_jpy || 190,
    };
  }
}

async function queueWorldPriceUpdate(pool, orderId, sellerId) {
  // setImmediate で Express のレスポンス終了後に実行
  setImmediate(() => {
    runWorldPriceUpdate(pool, orderId, sellerId).catch((err) => {
      console.error("[world-price] run error", err);
    });
  });
}

async function runWorldPriceUpdate(pool, orderId, sellerId) {
  // 1) 対象注文を取得
  const orderRes = await pool.query(
    `
      select id, summary, amount
      from orders
      where id = $1
    `,
    [orderId]
  );
  if (orderRes.rowCount === 0) {
    console.warn("[world-price] order not found", orderId);
    return;
  }
  const order = orderRes.rows[0];

  const keywordRaw = (order.summary || "").split("\n")[0].trim();
  if (!keywordRaw) {
    console.warn("[world-price] empty summary, skip", orderId);
    return;
  }

  // 🆕 パターンA: セット/まとめ売りっぽい取引は世界相場なしで終了
  if (isSetLikeSummary(keywordRaw)) {
    console.log("[world-price] detected set/lot item, skip world price", {
      orderId,
      summary: keywordRaw,
    });
    return;
  }

  // summary から eBay 向け検索語を生成
  const keywordForEbay = buildEbayKeywordFromSummary(keywordRaw);

  // 2) eBay US / UK の相場を取得
  //   EBAY_SOURCE_MODE === "sold" の場合は、将来的に Completed/Sold API に差し替える想定
  let us = null;
  let uk = null;

  if (EBAY_SOURCE_MODE === "sold") {
    // 📝 現時点では公式APIに Completed/Sold 検索は無いため、
    //     ここは外部 Completed Items API / 自前スクレイピング用のフックとして用意だけしておく。
    us = await fetchWorldPriceFromEbaySold(keywordForEbay, "EBAY_US");
    uk = await fetchWorldPriceFromEbaySold(keywordForEbay, "EBAY_GB");

    // sold で一切取れなければ active にフォールバック
    if (!us && !uk) {
      console.warn(
        "[world-price] sold-mode returned no data, fallback to active listings",
        { orderId, keywordForEbay }
      );
      us = await fetchWorldPriceFromEbayMarketplace(keywordForEbay, "EBAY_US");
      uk = await fetchWorldPriceFromEbayMarketplace(keywordForEbay, "EBAY_GB");
    }
  } else {
    // 従来どおり active listing から取得
    us = await fetchWorldPriceFromEbayMarketplace(keywordForEbay, "EBAY_US");
    uk = await fetchWorldPriceFromEbayMarketplace(keywordForEbay, "EBAY_GB");
  }

  if (!us && !uk) {
    console.warn("[world-price] no market data", {
      orderId,
      keywordRaw,
      keywordForEbay,
    });
    return;
  }

  // 3) 「中央値」が高い方を『おすすめ価格』用として採用
  const cand = [us, uk].filter(Boolean);
  const best = cand.reduce((acc, cur) => {
    if (!acc) return cur;
    if ((cur.medianJpy || 0) > (acc.medianJpy || 0)) return cur;
    return acc;
  }, null);

  // 3-1) US / UK の「最安値（送料込み）」を比較し、
  //      より高い方を世界最安値として採用する
  let worldLow = null;
  const usLow =
    us && typeof us.lowJpy === "number" ? us.lowJpy : null;
  const ukLow =
    uk && typeof uk.lowJpy === "number" ? uk.lowJpy : null;

  if (usLow != null && ukLow != null) {
    // ★ 要望どおり「高い方」を採用
    worldLow = Math.max(usLow, ukLow);
  } else if (usLow != null) {
    worldLow = usLow;
  } else if (ukLow != null) {
    worldLow = ukLow;
  }

  if (!best || !best.medianJpy) {
    console.warn("[world-price] best not found", {
      orderId,
      keywordRaw,
      keywordForEbay,
    });
    return;
  }

  // 念のため、best.lowJpy があり worldLow がまだ無い場合は補完
  if ((worldLow == null || worldLow <= 0) && typeof best.lowJpy === "number") {
    worldLow = best.lowJpy;
  }

  // 4) orders テーブルに保存
  await pool.query(
    `
      update orders
         set world_price_median = $1,
             world_price_high = $2,
             world_price_low = $3,
             world_price_sample_count = $4,
             updated_at = now()
       where id = $5
    `,
    [
      best.medianJpy,
      best.highJpy,
      worldLow ?? null,
      best.sampleCount || 0,
      orderId,
    ]
  );

  console.log("[world-price] updated", {
    orderId,
    median: best.medianJpy,
    high: best.highJpy,
    low: worldLow,
    sample: best.sampleCount,
  });
}

// 🆕 Completed/Sold 用のフック関数（現状は未実装＆active fallback想定）
//   → 将来、外部の「Completed Items API」をここから呼び出す
async function fetchWorldPriceFromEbaySold(keyword, marketplaceId) {
  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][debug] fetchSold not implemented, keyword=", {
      keyword,
      marketplaceId,
    });
  }
  // ここで外部 Completed/Sold API を呼び出す設計にしておく
  // 例：
  //   const res = await fetch(`${process.env.EBAY_SOLD_API_BASE}?q=${encodeURIComponent(keyword)}&site=${marketplaceId}`)
  //   ... => pricesJpy[] を組み立てて buildPriceStats(pricesJpy) を返す

  // 現時点では null を返し、呼び出し側で active listing にフォールバック
  return null;
}

async function fetchWorldPriceFromEbayMarketplace(keyword, marketplaceId) {
  console.log("[world-price] fetch", { keyword, marketplaceId });

  const token = await getEbayAccessToken();
  if (!token) {
    console.warn("[world-price] no ebay token, skip");
    return null;
  }

  // キーワード整形(1行目・長すぎる部分をカット)
  let q = (keyword || "").trim();
  if (q.length > 80) {
    q = q.slice(0, 80);
  }

  // 「セット / lot」関連の単語は念のためここでも除去
  q = q
    .replace(/セット/g, "")
    .replace(/まとめ売り/g, "")
    .replace(/lot/gi, "")
    .replace(/set/gi, "")
    .trim();

  if (!q) {
    console.warn("[world-price] keyword empty after cleanup, skip");
    return null;
  }

  const baseUrl =
    EBAY_ENV === "sandbox"
      ? "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search"
      : "https://api.ebay.com/buy/browse/v1/item_summary/search";

  const url =
    baseUrl +
    `?q=${encodeURIComponent(q)}` +
    "&limit=50" +
    "&filter=buyingOptions:{FIXED_PRICE}";

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      "[world-price] ebay error",
      marketplaceId,
      res.status,
      text
    );
    return null;
  }

  const data = await res.json();
  const items = Array.isArray(data.itemSummaries)
    ? data.itemSummaries
    : [];

  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][debug] raw itemSummaries", {
      marketplaceId,
      q,
      total: items.length,
    });
  }

  if (!items.length) {
    console.log("[world-price] no items", { marketplaceId, q });
    return null;
  }

  // 🆕 PSA10 や 日本語カード指定がある場合は、タイトル/所在地で絞り込む
  let filtered = items;
  const kw = (keyword || "").toUpperCase();

  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][debug] filter start", {
      marketplaceId,
      count: filtered.length,
    });
  }

  // PSA10 がキーワードに含まれているなら、PSA 10/PSA10 をタイトルに含むものに限定
  if (/PSA\s*10/.test(kw)) {
    filtered = filtered.filter((it) =>
      /(PSA\s*10|PSA10)/i.test(it.title || "")
    );
    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] after PSA10 filter", {
        marketplaceId,
        count: filtered.length,
      });
    }
  }

  // 日本語/JPN 指定があるなら、日本関連のものを優先
  if (/(JAPANESE|JPN|JAPAN)/.test(kw)) {
    const jpLike = filtered.filter((it) => {
      const title = (it.title || "") + " " + (it.shortDescription || "");
      const loc =
        (it.itemLocation && (it.itemLocation.country || it.itemLocation.countryCode)) ||
        "";
      return (
        /(JAPANESE|JPN|JAPAN)/i.test(title) ||
        String(loc).toUpperCase() === "JP"
      );
    });
    if (jpLike.length) {
      filtered = jpLike;
      if (WORLD_PRICE_DEBUG) {
        console.log("[world-price][debug] after Japanese filter", {
          marketplaceId,
          count: filtered.length,
        });
      }
    }
  }

  // カード番号(#091など)がキーワードに含まれている場合はタイトルで絞り込む
  const numMatch = kw.match(/#?(\d{3})\b/);
  if (numMatch) {
    const num = numMatch[1];
    const numRe = new RegExp(`(\\#${num}(\\D|$)|\\b${num}[A-Z0-9/ ]?)`);
    const byNumber = filtered.filter((it) =>
      numRe.test((it.title || "").toUpperCase())
    );
    // ある程度件数が残る場合のみ適用する(絞り込みすぎ防止)
    if (byNumber.length >= Math.min(filtered.length, 3)) {
      filtered = byNumber;
      if (WORLD_PRICE_DEBUG) {
        console.log("[world-price][debug] after cardNumber filter", {
          marketplaceId,
          count: filtered.length,
        });
      }
    }
  }

  // 弾/セット名(SV1V, Scarlet, Violetなど)が含まれている場合は、それでさらに絞り込む
  const setTokens = [];
  const setCodeMatch = kw.match(/\bSV[0-9A-Z]{1,2}\b/);
  if (setCodeMatch) {
    setTokens.push(setCodeMatch[0]);
  }
  if (/SCARLET/.test(kw)) setTokens.push("SCARLET");
  if (/VIOLET/.test(kw)) setTokens.push("VIOLET");
  if (setTokens.length) {
    const setRe = new RegExp(setTokens.join("|"), "i");
    const bySet = filtered.filter((it) => setRe.test(it.title || ""));
    if (bySet.length >= Math.min(filtered.length, 3)) {
      filtered = bySet;
      if (WORLD_PRICE_DEBUG) {
        console.log("[world-price][debug] after setName filter", {
          marketplaceId,
          count: filtered.length,
        });
      }
    }
  }

  // 絞り込みすぎて 0 件になったときは、元の items に戻す（安全側フォールバック）
  if (!filtered.length) {
    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] filtered empty, fallback to original items", {
        marketplaceId,
      });
    }
    filtered = items;
  }

  // 為替レート(自動取得)
  const { usd_jpy: rateUsd, gbp_jpy: rateGbp } = await getFxRates();

  const pricesJpy = [];

  for (const it of filtered) {
    const p = it.price;
    if (!p || !p.value || !p.currency) continue;

    // ★ 商品価格（USD, GBP, JPYなど）
    const priceVal = Number(p.value);
    if (!Number.isFinite(priceVal) || priceVal <= 0) continue;

    // ★ 送料（shippingOptions から取得：存在しなければ 0）
    let shippingVal = 0;
    if (it.shippingOptions && it.shippingOptions.length > 0) {
      const s = it.shippingOptions[0].shippingCost;
      if (s && s.value) {
        shippingVal = Number(s.value);
      }
    }

    // ★ 合計（商品 + 送料）
    const totalVal = priceVal + shippingVal;

    // ★ 通貨レート適用
    let rate = 0;
    const curr = String(p.currency).toUpperCase();

    if (curr === "USD") rate = rateUsd;
    else if (curr === "GBP") rate = rateGbp;
    else if (curr === "JPY") rate = 1;
    else continue; // それ以外の通貨は今回は無視

    // ★ 送料込みの総額JPY
    const totalJpy = totalVal * rate;

    // 非現実的な値は雑に除外
    if (totalJpy < 1 || totalJpy > 1_000_000_000) continue;

    // ★ 送料込み価格を相場配列に追加
    pricesJpy.push(totalJpy);

    // デバッグログ: 送料込み価格の内訳
    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] price breakdown", {
        marketplaceId,
        title: it.title?.substring(0, 50) || "N/A",
        priceVal,
        shippingVal,
        totalVal,
        currency: curr,
        rate,
        totalJpy: Math.round(totalJpy),
      });
    }
  }

  if (!pricesJpy.length) {
    console.log("[world-price] no valid price", { marketplaceId, q });
    return null;
  }

  const stats = buildPriceStats(pricesJpy);
  if (!stats) {
    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] stats null (sample too small)", {
        marketplaceId,
        q,
        pricesCount: pricesJpy.length,
      });
    }
    return null;
  }

  console.log("[world-price] stats", {
    marketplaceId,
    q,
    ...stats,
  });

  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][debug] final stats", {
      marketplaceId,
      q,
      pricesCount: pricesJpy.length,
      stats,
    });
  }

  return stats;
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
