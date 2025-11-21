// payments.js
import express from "express";

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
  } = deps;

  // ====== Stripe webhook (raw body 必須) ======
  app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("webhook construct error", err);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
      const t = event.type;

      // 🟢 決済成功時にUPSERTパターンを使用（Race Condition回避）
      if (t === "payment_intent.succeeded") {
        const pi = event.data.object;
        const sellerId = pi.metadata?.sellerId || "";
        const orderId = pi.metadata?.orderId || null;

        if (!sellerId) {
          console.warn("pi.succeeded without sellerId, skip", pi.id);
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
              const charge = await stripe.charges.retrieve(chargeId);
              balanceTxId = charge.balance_transaction || null;
              
              if (balanceTxId && typeof balanceTxId === 'string') {
                const balanceTx = await stripe.balanceTransactions.retrieve(balanceTxId);
                fee = balanceTx.fee || 0;
              }
            } catch (stripeErr) {
              console.error("Failed to retrieve charge/balance info", stripeErr);
            }
          }

          const netAmount = fee !== null ? amount - fee : amount;

          // ✅ UPSERTパターン（ON CONFLICT）
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

          // ordersテーブルのステータス更新
          if (orderId) {
            await pool.query(
              `update orders set status='paid', stripe_sid=$1, updated_at=now() where id=$2`,
              [pi.id, orderId]
            );
          }

          audit("pi_succeeded", { sellerId, orderId, pi: pi.id, amount, fee, netAmount });
        }
      }

      // --- 返金:charge.refunded ---
      if (t === "charge.refunded" || t === "charge.refund.updated") {
        const ch = event.data.object;
        const piId = ch.payment_intent || null;
        const amount = typeof ch.amount === "number" ? ch.amount : 0;
        const refunded = typeof ch.amount_refunded === "number" ? ch.amount_refunded : 0;
        
        let fee = 0;
        const balanceTxId = ch.balance_transaction;
        if (balanceTxId && typeof balanceTxId === 'string') {
          try {
            const balanceTx = await stripe.balanceTransactions.retrieve(balanceTxId);
            fee = balanceTx.fee || 0;
          } catch (stripeErr) {
            console.error("Failed to retrieve balance transaction for refund", stripeErr);
          }
        }
        
        const net = Math.max(amount - refunded - fee, 0);
        const status = refunded >= amount ? "refunded" : "partially_refunded";

        if (piId) {
          const r = await pool.query(
            `update stripe_payments set 
              amount_gross=$2, amount_fee=$3, amount_net=$4, refunded_total=$5, status=$6, 
              charge_id=$7, raw_event=$8, updated_at=now()
            where payment_intent_id=$1 returning seller_id`,
            [piId, amount, fee, net, refunded, status, ch.id, event]
          );

          if (r.rowCount === 0) {
            console.warn("refund for unknown pi", piId);
          } else {
            audit("charge_refund", { pi: piId, amount, refunded, fee, net, status });
          }
        }
      }

      // --- チャージバック発生:charge.dispute.created ---
      if (t === "charge.dispute.created") {
        const dispute = event.data.object;
        const chargeId = dispute.charge || null;

        if (chargeId) {
          const r = await pool.query(
            `update stripe_payments set 
              status='disputed', dispute_status='needs_response', 
              amount_net=0, raw_event=$2, updated_at=now()
            where charge_id=$1 returning seller_id, payment_intent_id`,
            [chargeId, event]
          );

          if (r.rowCount === 0) {
            console.warn("dispute.created: no payment for charge", chargeId);
          } else {
            const row = r.rows[0];
            audit("dispute_created", { sellerId: row.seller_id, pi: row.payment_intent_id });
          }
        }
      }

      // --- チャージバッククローズ:charge.dispute.closed ---
      if (t === "charge.dispute.closed") {
        const dispute = event.data.object;
        const chargeId = dispute.charge || null;
        const outcome = dispute.status;

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
            console.warn("dispute.closed: no payment for charge", chargeId);
          } else {
            const row = r.rows[0];
            audit("dispute_closed", { sellerId: row.seller_id, pi: row.payment_intent_id, status: newStatus });
          }
        }
      }

    } catch (e) {
      console.error("webhook handler error", e);
    }

    res.json({ received: true });
  });

  // ====== 🆕 出店者用API: 売上サマリー取得（サブスク判定追加） ======
  app.get("/api/seller/summary", async (req, res) => {
    const sellerId = req.query.s;
    if (!sellerId) {
      return res.status(400).json({ error: "seller_id_required" });
    }

    try {
      // 0) サブスク状態の判定（履歴テーブルから現在プランを取得）
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

      // ① 売上KPI（ここは従来どおり Stripe だけでOK）
      const kpiToday = await pool.query(
        `
        SELECT
          COUNT(*)                           AS cnt,
          COALESCE(SUM(amount_gross), 0)     AS gross,
          COALESCE(SUM(amount_net),   0)     AS net,
          COALESCE(SUM(amount_fee),   0)     AS fee
        FROM stripe_payments
        WHERE seller_id = $1
          AND created_at::date = CURRENT_DATE
        `,
        [sellerId]
      );

      const todayGross = Number(kpiToday.rows[0].gross || 0);
      const todayNet   = Number(kpiToday.rows[0].net   || 0);
      const todayFee   = Number(kpiToday.rows[0].fee   || 0);
      const countToday = parseInt(kpiToday.rows[0].cnt, 10) || 0;
      const avgToday   = countToday > 0 ? Math.round(todayNet / countToday) : 0;

      const kpiTotal = await pool.query(
        `
        SELECT
          COALESCE(SUM(amount_gross), 0) AS gross,
          COALESCE(SUM(amount_net), 0)   AS net,
          COALESCE(SUM(amount_fee), 0)   AS fee
        FROM stripe_payments
        WHERE seller_id = $1
        `,
        [sellerId]
      );

      // ② 取引履歴（orders を基準に、カードも現金も一緒に出す）
      const recentRes = await pool.query(
        `
        SELECT
          o.id                     AS order_id,
          o.created_at,
          o.amount,
          o.summary              AS memo,
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
        ORDER BY o.created_at DESC
        LIMIT 20
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
          memo: r.memo || "",
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

      // ③ データ精度スコア計算（購入者属性が入力された割合）
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
          count: countToday,
          avgNet: avgToday,
        },
        salesTotal: {
          gross: Number(kpiTotal.rows[0].gross || 0),
          net:   Number(kpiTotal.rows[0].net   || 0),
          fee:   Number(kpiTotal.rows[0].fee   || 0)
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

  // ====== 🆕 注文詳細取得API ======
  app.get("/api/seller/order-detail", async (req, res) => {
    const sellerId = req.query.s;
    const orderId = req.query.orderId;

    if (!sellerId || !orderId) {
      return res.status(400).json({ error: "seller_id_and_order_id_required" });
    }

    try {
      // 注文情報取得（seller_idで権限チェック）
      const orderRes = await pool.query(
        `
        SELECT 
          o.id,
          o.seller_id,
          o.amount,
          o.summary,
          o.image_url,
          om.category,
          om.buyer_language,
          ba.customer_type,
          ba.gender,
          ba.age_band
        FROM orders o
        LEFT JOIN order_metadata om ON om.order_id = o.id
        LEFT JOIN buyer_attributes ba ON ba.order_id = o.id
        WHERE o.id = $1 AND o.seller_id = $2
        LIMIT 1
        `,
        [orderId, sellerId]
      );

      if (orderRes.rowCount === 0) {
        return res.status(404).json({ error: "order_not_found" });
      }

      const order = orderRes.rows[0];

      res.json({
        orderId: order.id,
        imageUrl: order.image_url || null,
        memo: order.summary || "",
        amount: order.amount || 0,
        customerType: order.customer_type || "",
        gender: order.gender || "",
        ageBand: order.age_band || "",
        itemCategory: order.category || "",
        buyerLanguage: order.buyer_language || ""
      });
    } catch (e) {
      console.error("order_detail_error", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // ====== 決済画面生成（Checkout Session） ======
  app.post("/api/checkout/session", async (req, res) => {
    try {
      const { sellerId, latest, summary } = req.body || {};
      const orderId = req.body.orderId || req.query.order || "";

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

      // Stripe Checkout Session作成
      const stripeAccountId = await resolveSellerAccountId(pool, order.seller_id);
      if (!stripeAccountId) {
        return res.status(400).json({ error: "seller_stripe_account_not_found" });
      }

      const successUrl = `${BASE_URL}/success.html?order=${order.id}`;
      const cancelUrl = `${BASE_URL}/checkout.html?s=${order.seller_id}&order=${order.id}`;

      const sessionParams = {
        mode: "payment",
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
          application_fee_amount: Math.floor(order.amount * 0.1), // 10%手数料
          metadata: {
            sellerId: order.seller_id,
            orderId: order.id,
          },
        },
      };

      const session = await stripe.checkout.sessions.create(
        sessionParams,
        { stripeAccount: stripeAccountId }
      );

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

  // ====== 金額取得API ======
  app.get("/api/price/latest", async (req, res) => {
    const sellerId = req.query.s;
    if (!sellerId) {
      return res.status(400).json({ error: "seller_id_required" });
    }

    try {
      const result = await pool.query(
        `select id, seller_id, amount, summary
         from orders
         where seller_id=$1
         order by created_at desc
         limit 1`,
        [sellerId]
      );

      if (result.rowCount === 0) {
        // sellerId はそのまま返しておくとデバッグしやすい
        return res.json({
          orderId: null,
          sellerId,
          amount: null,
          summary: null
        });
      }

      const row = result.rows[0];

      res.json({
        orderId: row.id,
        sellerId: row.seller_id,
        amount: row.amount,
        summary: row.summary
      });
    } catch (e) {
      console.error("get latest price error", e);
      res.status(500).json(sanitizeError(e));
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

      // 1) 決済（charge.succeeded）
      const chargeParams = { limit: 100 };
      if (createdFilter) chargeParams.created = createdFilter;

      const chargesList = await fetchWithTimeout(
        stripe.charges.list(chargeParams)
      );

      const succeededCharges = chargesList.data.filter(c => c.status === 'succeeded');
      const grossAmount = succeededCharges.reduce((sum, c) => sum + (c.amount || 0), 0);

      // 2) チャージバック（disputes）
      const disputeParams = { limit: 100 };
      if (createdFilter) disputeParams.created = createdFilter;

      const disputesList = await fetchWithTimeout(
        stripe.disputes.list(disputeParams)
      );

      // 🟢 期限間近のチャージバック（3日以内）
      const urgentDisputes = disputesList.data.filter(d => {
        const dueBy = d.evidence_details?.due_by;
        if (!dueBy) return false;
        const daysUntilDue = Math.ceil((dueBy * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 3 && daysUntilDue > 0;
      });

      // 3) 返金（refunds）
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

// ====== util（payments.js内で使用するヘルパー関数） ======
// Note: これらの関数は deps 経由で渡された pool を使用します

async function resolveSellerAccountId(pool, sellerId) {
  if (!sellerId) return null;
  const r = await pool.query(
    `select stripe_account_id from sellers where id=$1 limit 1`,
    [sellerId]
  );
  return r.rows[0]?.stripe_account_id || null;
}

async function getNextOrderNo(pool, sellerId) {
  const r = await pool.query(
    `select coalesce(max(order_no), 0) + 1 as next_no from orders where seller_id=$1`,
    [sellerId]
  );
  return r.rows[0]?.next_no || 1;
}
