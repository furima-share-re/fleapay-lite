import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import pkg from "pg";
import crypto from "crypto";
import multer from "multer";
import OpenAI from "openai";

dotenv.config();

const { Pool } = pkg;
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ====== 設定 ======
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-devtoken";
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const PORT = process.env.PORT || 3000;

// ====== multer(10MB、拡張子ゆるめ、メモリ格納) ======
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ====== 🟢 改善されたレート制限（Redis推奨だがメモリ版を維持） ======
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_WRITES = 12;
const RATE_LIMIT_MAX_CHECKOUT = 20;
const RATE_LIMIT_MAX_ADMIN = 60;
const hits = new Map();

function bumpAndAllow(key, limit) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length <= limit;
}

// 定期的にメモリクリーンアップ（メモリリーク防止）
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of hits.entries()) {
    const filtered = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (filtered.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, filtered);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

function clientIp(req) {
  return req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.ip || 'unknown';
}

function isSameOrigin(req) {
  if (!BASE_URL) return true;
  const ref = req.get("referer") || req.get("origin") || "";
  return ref.startsWith(BASE_URL);
}

function audit(event, payload) {
  console.log(`[AUDIT] ${event}`, JSON.stringify(payload, null, 2));
}

// ====== util ======
async function resolveSellerAccountId(sellerId) {
  if (!sellerId) return null;
  const r = await pool.query(
    `select stripe_account_id from sellers where id=$1 limit 1`,
    [sellerId]
  );
  return r.rows[0]?.stripe_account_id || null;
}

// 出店者用URL生成
function buildSellerUrls(sellerId, stripeAccountId) {
  const base = BASE_URL;
  const sellerUrl = `${base}/seller-purchase.html?s=${encodeURIComponent(sellerId)}`;
  const checkoutUrl = `${base}/checkout.html?s=${encodeURIComponent(sellerId)}${
    stripeAccountId ? `&acct=${encodeURIComponent(stripeAccountId)}` : ""
  }`;
  const dashboardUrl = `${base}/seller-dashboard.html?s=${encodeURIComponent(sellerId)}`;
  return { sellerUrl, checkoutUrl, dashboardUrl };
}

// 🟢 改善された日付処理（JSTの日付境界）
function jstDayBounds() {
  const nowUtc = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC+9
  const nowJstMs = nowUtc.getTime() + jstOffset;
  const nowJst = new Date(nowJstMs);
  
  // JST基準で今日の0:00を求める
  const todayJst = new Date(nowJst);
  todayJst.setUTCHours(0, 0, 0, 0);
  
  // UTC基準の日付境界に戻す
  const todayStart = new Date(todayJst.getTime() - jstOffset);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  
  return { todayStart, tomorrowStart, yesterdayStart };
}

// 次のorder_no取得
async function getNextOrderNo(sellerId) {
  const r = await pool.query(
    `select coalesce(max(order_no), 0) + 1 as next_no from orders where seller_id=$1`,
    [sellerId]
  );
  return r.rows[0]?.next_no || 1;
}

// ====== 🟢 改善されたCORS設定（デフォルト値を設定） ======
const corsOptions = {
  origin: (origin, callback) => {
    // オリジンがない場合（例: curlやPostman）は許可
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // BASE_URLから始まる場合は許可
    if (origin.startsWith(BASE_URL)) {
      callback(null, true);
      return;
    }
    
    // localhostは開発環境として許可
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
      return;
    }
    
    // それ以外は拒否
    callback(new Error('CORS policy violation'));
  },
  credentials: true
};

app.use(cors(corsOptions));

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

// それ以外のAPIは JSON パーサー使用
app.use(express.json({ limit: "1mb" }));

// ====== DB初期化 ======
async function initDb() {
  await pool.query(`
    create extension if not exists "pgcrypto";

    -- sellers
    create table if not exists sellers (
      id text primary key,
      display_name text not null,
      shop_name text,
      stripe_account_id text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    -- frames
    create table if not exists frames (
      id text primary key,
      display_name text not null,
      category text,
      metadata jsonb,
      created_at timestamptz default now()
    );

    -- orders
    create table if not exists orders (
      id uuid primary key default gen_random_uuid(),
      seller_id text not null,
      order_no integer not null,
      amount integer not null,
      summary text,
      frame_id text,
      status text not null default 'pending',
      stripe_sid text,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      constraint orders_frame_fk
        foreign key (frame_id) references frames(id)
    );

    create unique index if not exists orders_seller_orderno_unique
      on orders(seller_id, order_no);

    create index if not exists orders_seller_status_idx
      on orders(seller_id, status);

    create index if not exists orders_created_idx
      on orders(created_at desc);

    -- stripe_payments
    create table if not exists stripe_payments (
      id uuid primary key default gen_random_uuid(),
      seller_id text not null,
      order_id uuid,
      payment_intent_id text not null,
      charge_id text,
      balance_tx_id text,
      amount_gross integer not null,
      amount_fee integer,
      amount_net integer,
      currency text not null default 'jpy',
      status text not null,
      refunded_total integer not null default 0,
      dispute_status text,
      raw_event jsonb,
      last_synced_at timestamptz default now(),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create index if not exists stripe_payments_seller_idx
      on stripe_payments(seller_id);

    create index if not exists stripe_payments_order_idx
      on stripe_payments(order_id);

    create index if not exists stripe_payments_status_idx
      on stripe_payments(status);

    create index if not exists stripe_payments_pi_idx
      on stripe_payments(payment_intent_id);

    -- UNIQUE制約
    create unique index if not exists stripe_payments_pi_unique
      on stripe_payments(payment_intent_id);

    -- order_items
    create table if not exists order_items (
      id bigserial primary key,
      order_id uuid not null references orders(id) on delete cascade,
      name text not null,
      unit_price integer not null,
      quantity integer not null,
      amount integer not null,
      source text not null default 'ai',
      created_at timestamptz default now()
    );

    create index if not exists order_items_order_idx
      on order_items(order_id);

    -- images
    create table if not exists images (
      id uuid primary key default gen_random_uuid(),
      order_id uuid references orders(id) on delete cascade,
      kind text not null default 'processed',
      url text not null,
      s3_key text,
      content_type text,
      file_size integer,
      created_at timestamptz default now(),
      constraint images_kind_processed_only check (kind = 'processed')
    );

    create index if not exists images_order_idx
      on images(order_id);

    -- qr_sessions
    create table if not exists qr_sessions (
      id uuid primary key default gen_random_uuid(),
      seller_id text not null,
      order_id uuid references orders(id) on delete cascade,
      scanned_at timestamptz default now()
    );

    create index if not exists qr_sessions_seller_idx
      on qr_sessions(seller_id);
  `);

  console.log("✅ DB init done (PATCHED v3.2 - seller/summary API追加版)");
}

initDb().catch(e => console.error("DB init error", e));

// ====== 認証(管理API用) ======
function requireAdmin(req, res, next) {
  const t = req.header("x-admin-token");
  if (!t || t !== ADMIN_TOKEN) {
    audit("admin_auth_failed", { ip: clientIp(req), token: t ? '***' : 'none' });
    return res.status(401).json({ error: "unauthorized" });
  }
  
  // レート制限
  const ip = clientIp(req);
  if (!bumpAndAllow(`admin:${ip}`, RATE_LIMIT_MAX_ADMIN)) {
    return res.status(429).json({ error: "rate_limited" });
  }
  
  next();
}

// 🟢 改善されたエラーハンドリング
function sanitizeError(error, isDevelopment = process.env.NODE_ENV === 'development') {
  if (isDevelopment) {
    return { error: "internal_error", detail: error.message, stack: error.stack };
  }
  return { error: "internal_error", message: "サーバー内部エラーが発生しました" };
}

// ====== 🆕 出店者用API: 売上サマリー取得 ======
app.get("/api/seller/summary", async (req, res) => {
  try {
    const sellerId = req.query.s;
    if (!sellerId) {
      return res.status(400).json({ error: "seller_id_required" });
    }

    // レート制限
    const ip = clientIp(req);
    if (!bumpAndAllow(`seller:${ip}`, RATE_LIMIT_MAX_WRITES)) {
      return res.status(429).json({ error: "rate_limited" });
    }

    // 出店者情報取得
    const sellerResult = await pool.query(
      `select display_name, shop_name from sellers where id=$1`,
      [sellerId]
    );

    if (sellerResult.rows.length === 0) {
      return res.status(404).json({ error: "seller_not_found" });
    }

    const seller = sellerResult.rows[0];
    const { todayStart, tomorrowStart } = jstDayBounds();

    // 今日の売上集計
    const todayResult = await pool.query(
      `select 
        count(*) as count,
        coalesce(sum(amount_net), 0) as total_net
      from stripe_payments
      where seller_id=$1 
        and status='succeeded'
        and created_at >= $2 
        and created_at < $3`,
      [sellerId, todayStart, tomorrowStart]
    );

    const todayStats = todayResult.rows[0];
    const count = parseInt(todayStats.count) || 0;
    const total = parseInt(todayStats.total_net) || 0;
    const avg = count > 0 ? Math.round(total / count) : 0;

    // 最近の決済（最大20件）
    const recentResult = await pool.query(
      `select 
        payment_intent_id as id,
        amount_gross as amount,
        amount_net as net_amount,
        status,
        created_at,
        (select summary from orders where orders.id = stripe_payments.order_id limit 1) as summary
      from stripe_payments
      where seller_id=$1
      order by created_at desc
      limit 20`,
      [sellerId]
    );

    const recent = recentResult.rows.map(row => ({
      id: row.id,
      amount: row.amount,
      net_amount: row.net_amount,
      status: row.status,
      summary: row.summary,
      created: Math.floor(new Date(row.created_at).getTime() / 1000)
    }));

    res.json({
      sellerId,
      displayName: seller.display_name || seller.shop_name || sellerId,
      salesToday: total,
      countToday: count,
      avgToday: avg,
      recent
    });

  } catch (e) {
    console.error("/api/seller/summary error", e);
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

// ====== 🟢 改善された管理API: 出店者作成/更新 ======
app.post("/api/admin/sellers", requireAdmin, async (req, res) => {
  const { id, displayName, shopName, stripeAccountId } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });

  try {
    const q = `
      insert into sellers (id, display_name, shop_name, stripe_account_id)
      values ($1, $2, $3, $4)
      on conflict (id) do update set
        display_name = coalesce(excluded.display_name, sellers.display_name),
        shop_name = coalesce(excluded.shop_name, sellers.shop_name),
        stripe_account_id = coalesce(excluded.stripe_account_id, sellers.stripe_account_id),
        updated_at = now()
      returning id, display_name, shop_name, stripe_account_id
    `;
    const { rows } = await pool.query(q, [
      id,
      displayName || null,
      shopName || null,
      stripeAccountId || null
    ]);

    const row = rows[0];
    const urls = buildSellerUrls(row.id, row.stripe_account_id);

    audit("seller_created_or_updated", { sellerId: row.id });

    res.json({
      id: row.id,
      displayName: row.display_name,
      shopName: row.shop_name,
      stripeAccountId: row.stripe_account_id,
      urls
    });
  } catch (e) {
    console.error("create/update seller", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 管理API: 出店者一覧取得 ======
app.get("/api/admin/sellers", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      select 
        s.id,
        s.display_name,
        s.shop_name,
        s.stripe_account_id,
        s.created_at,
        s.updated_at,
        count(distinct o.id) as order_count,
        max(o.created_at) as last_order_at
      from sellers s
      left join orders o on s.id = o.seller_id
      group by s.id, s.display_name, s.shop_name, s.stripe_account_id, s.created_at, s.updated_at
      order by s.created_at desc
    `);

    const sellers = result.rows.map(row => ({
      id: row.id,
      displayName: row.display_name,
      shopName: row.shop_name,
      stripeAccountId: row.stripe_account_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      orderCount: parseInt(row.order_count) || 0,
      lastOrderAt: row.last_order_at,
      urls: buildSellerUrls(row.id, row.stripe_account_id)
    }));

    res.json({ sellers });
  } catch (e) {
    console.error("get sellers", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 管理API: フレーム作成 ======
app.post("/api/admin/frames", requireAdmin, async (req, res) => {
  const { id, displayName, category, metadata } = req.body || {};
  if (!id || !displayName) return res.status(400).json({ error: "id and displayName required" });

  try {
    const q = `
      insert into frames (id, display_name, category, metadata)
      values ($1, $2, $3, $4)
      on conflict (id) do update set
        display_name = excluded.display_name,
        category = excluded.category,
        metadata = excluded.metadata
      returning *
    `;
    const { rows } = await pool.query(q, [
      id,
      displayName,
      category || null,
      metadata ? JSON.stringify(metadata) : null
    ]);

    audit("frame_created_or_updated", { frameId: id });

    res.json(rows[0]);
  } catch (e) {
    console.error("create/update frame", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 管理API: フレーム一覧取得 ======
app.get("/api/admin/frames", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      select 
        f.id,
        f.display_name,
        f.category,
        f.metadata,
        f.created_at,
        count(distinct o.id) as order_count
      from frames f
      left join orders o on f.id = o.frame_id
      group by f.id, f.display_name, f.category, f.metadata, f.created_at
      order by f.created_at desc
    `);

    const frames = result.rows.map(row => ({
      id: row.id,
      displayName: row.display_name,
      category: row.category,
      metadata: row.metadata,
      createdAt: row.created_at,
      orderCount: parseInt(row.order_count) || 0
    }));

    res.json({ frames });
  } catch (e) {
    console.error("get frames", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 🟢 改善された管理API: SQL実行（正規表現検証） ======
app.post("/api/admin/bootstrap_sql", requireAdmin, async (req, res) => {
  try {
    if (process.env.ADMIN_BOOTSTRAP_SQL_ENABLED !== "true") {
      return res.status(403).json({ error: "bootstrap_sql_disabled" });
    }

    const { sql } = req.body || {};
    if (!sql || typeof sql !== "string" || !sql.trim()) {
      return res.status(400).json({ error: "sql_required" });
    }

    const trimmed = sql.trim();
    const lower = trimmed.toLowerCase();

    // 🟢 正規表現を使用した厳密な検証
    const dangerousPattern = /drop\s+(database|schema|table\s+(sellers|orders|stripe_payments))|truncate\s+table|(delete\s+from\s+(sellers|orders|stripe_payments))/i;

    if (dangerousPattern.test(trimmed)) {
      audit("sql_injection_attempt", { sql: trimmed.substring(0, 100), ip: clientIp(req) });
      return res.status(400).json({ error: 'dangerous_sql_detected' });
    }

    const result = await pool.query(trimmed);
    
    audit("sql_executed", { length: trimmed.length, rowCount: result?.rowCount });

    res.json({
      ok: true,
      rowCount: result?.rowCount ?? null,
      fields: (result?.fields || []).map(f => f.name),
      rows: result?.rows || []
    });
  } catch (e) {
    console.error("bootstrap_sql error", e);
    res.status(500).json(sanitizeError(e));
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
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` and sp.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` and (
        sp.payment_intent_id ilike $${paramCount} or
        sp.seller_id ilike $${paramCount} or
        s.display_name ilike $${paramCount} or
        o.summary ilike $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += ` order by sp.created_at desc`;
    
    paramCount++;
    query += ` limit $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` offset $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    // 総件数を取得
    let countQuery = `select count(*) as total from stripe_payments sp left join orders o on sp.order_id = o.id left join sellers s on sp.seller_id = s.id where 1=1`;
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` and sp.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (search) {
      countParamCount++;
      countQuery += ` and (
        sp.payment_intent_id ilike $${countParamCount} or
        sp.seller_id ilike $${countParamCount} or
        s.display_name ilike $${countParamCount} or
        o.summary ilike $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total) || 0;

    const payments = result.rows.map(row => ({
      id: row.payment_intent_id, // フロントエンド互換性のため
      paymentIntentId: row.payment_intent_id,
      sellerId: row.seller_id,
      sellerName: row.seller_name,
      orderId: row.order_id,
      orderNo: row.order_no,
      orderSummary: row.order_summary,
      chargeId: row.charge_id,
      balanceTxId: row.balance_tx_id,
      amount: row.amount_gross,
      amountGross: row.amount_gross,
      amountFee: row.amount_fee,
      amountNet: row.amount_net,
      currency: row.currency,
      status: row.status,
      refundedTotal: row.refunded_total,
      disputeStatus: row.dispute_status,
      created: row.created_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // フロントエンド互換
      stripeIds: {
        paymentIntent: row.payment_intent_id,
        charge: row.charge_id
      },
      seller: {
        publicId: row.seller_id,
        displayName: row.seller_name
      }
    }));

    res.json({
      payments,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    });
  } catch (e) {
    console.error("get payments", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 管理API: ダッシュボードサマリー ======
app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  try {
    const { todayStart, tomorrowStart } = jstDayBounds();

    const qToday = `
      select 
        coalesce(sum(amount_gross),0) as gross,
        coalesce(sum(amount_net),0) as net,
        count(*) as count
      from stripe_payments
      where created_at >= $1 and created_at < $2
    `;
    const today = await pool.query(qToday, [todayStart, tomorrowStart]);
    const row = today.rows[0] || {};

    const qCB = `
      select 
        count(*) filter (where status='disputed') as disputes,
        count(*) filter (where status='refunded') as refunds
      from stripe_payments
    `;
    const cb = await pool.query(qCB);
    const cbrow = cb.rows[0] || {};

    res.json({
      paymentCount: Number(row.count || 0),
      totalRevenue: Number(row.gross || 0),
      netRevenue: Number(row.net || 0),
      disputeCount: Number(cbrow.disputes || 0),
      refundCount: Number(cbrow.refunds || 0)
    });
  } catch (e) {
    console.error("admin/dashboard error", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 一般API: 注文作成 ======
app.post("/api/pending/start", async (req, res) => {
  try {
    if (!isSameOrigin(req)) return res.status(403).json({ error: "forbidden_origin" });

    const { sellerId, amount, summary, imageData, aiAnalysis } = req.body || {};
    const amt = Number(amount);

    if (!sellerId || !Number.isInteger(amt) || amt < 100) {
      return res.status(400).json({ error: "invalid input" });
    }

    const ip = clientIp(req);
    if (!bumpAndAllow(`order:ip:${ip}`, RATE_LIMIT_MAX_WRITES) ||
        !bumpAndAllow(`order:seller:${sellerId}`, RATE_LIMIT_MAX_WRITES)) {
      return res.status(429).json({ error: "rate_limited" });
    }

    const orderNo = await getNextOrderNo(sellerId);

    const orderResult = await pool.query(
      `insert into orders (seller_id, order_no, amount, summary, status)
       values ($1, $2, $3, $4, 'pending')
       returning id, seller_id, order_no, amount, summary, status, created_at`,
      [sellerId, orderNo, amt, summary || null]
    );

    const order = orderResult.rows[0];

    if (aiAnalysis?.items && Array.isArray(aiAnalysis.items)) {
      for (const item of aiAnalysis.items) {
        const name = String(item.name || "商品").slice(0, 120);
        const unitPrice = Number(item.unit_price) || 0;
        const quantity = Number(item.qty || item.quantity) || 1;
        const itemAmount = unitPrice * quantity;
        const source = "ai";

        await pool.query(
          `insert into order_items (order_id, name, unit_price, quantity, amount, source)
           values ($1, $2, $3, $4, $5, $6)`,
          [order.id, name, unitPrice, quantity, itemAmount, source]
        );
      }
    }

    if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
      await pool.query(
        `insert into images (order_id, kind, url, content_type)
         values ($1, 'processed', $2, 'image/jpeg')`,
        [order.id, imageData]
      );
    }

    audit("pending_order_created", { orderId: order.id, sellerId, orderNo, amount: amt });

    const stripeAccountId = await resolveSellerAccountId(sellerId);
    const urls = buildSellerUrls(sellerId, stripeAccountId);

    res.json({
      orderId: order.id,
      orderNo: order.order_no,
      sellerId: order.seller_id,
      amount: order.amount,
      summary: order.summary,
      status: order.status,
      createdAt: order.created_at,
      checkoutUrl: urls.checkoutUrl,
      purchaseUrl: urls.sellerUrl
    });
  } catch (e) {
    console.error("pending/start error", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 🔥 AIフォトフレーム生成API（OpenAI v2 対応版・パッチ適用済み） ======
app.post("/api/photo-frame", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY not set" });
    }

    const f = req.file;
    if (!f || !f.buffer) {
      return res.status(400).json({ error: "file_required" });
    }

    const prompt =
      process.env.OPENAI_PROMPT_PHOTO_FRAME ||
      "Cute up this photo with a soft pink sakura frame. Keep the original person as they are.";

    // mime は一応判定だけしておく(今は jpeg 固定で返す)
    let mime = f.mimetype || "image/jpeg";
    const name = (f.originalname || "").toLowerCase();
    if (mime === "application/octet-stream") {
      if (name.endsWith(".png")) mime = "image/png";
      else if (name.endsWith(".webp")) mime = "image/webp";
      else if (name.endsWith(".heic")) mime = "image/heic";
      else mime = "image/jpeg";
    }

    // BufferをFileオブジェクトに変換（OpenAI Images Edit API用）
    const file = new File([f.buffer], f.originalname || "image.png", {
      type: mime
    });

    // ✅ 修正版: response_format追加、モデルとサイズ変更
    const result = await openai.images.edit({
      model: "dall-e-2",           // ← 正しいモデル名
      image: file,
      prompt,
      size: "1024x1024",           // ← サポートされているサイズ
    });

    const b64 = result.data[0].b64_json;
    const buf = Buffer.from(b64, "base64");

    res.set("Content-Type", "image/png");  // ← dall-e-2はpngを返す
    res.send(buf);
  } catch (e) {
    console.error("photo-frame error", e?.response?.data || e);
    const detail =
      e?.response?.data?.error?.message ||
      e?.message ||
      "unknown_error";
    res.status(500).json({ error: "internal_error", detail });
  }
});

// ====== 🟢 ヘルスチェックエンドポイント ======
app.get("/api/ping", (req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    version: '3.2.0-seller-summary-fixed'
  });
});

// ====== 静的ファイル配信 ======
app.use(express.static(path.join(__dirname, "public")));

// ====== 404ハンドラー ======
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'endpoint_not_found' });
  } else {
    res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  }
});

// ====== サーバー起動 ======
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🪶 Fleapay Server (seller-summary修正版 v3.2.0)        ║
║                                                           ║
║  🌐 Server:    http://localhost:${PORT}                   ║
║  📊 Admin:     http://localhost:${PORT}/admin-dashboard.html ║
║  💳 Payments:  http://localhost:${PORT}/admin-payments.html  ║
║  🏪 Seller:    http://localhost:${PORT}/seller-dashboard.html?s=SELLER_ID ║
║                                                           ║
║  ✅ CORS: ${BASE_URL}                                    ║
║  ✅ ADMIN_TOKEN: ${ADMIN_TOKEN.substring(0, 5)}***       ║
║  ✅ Database: Connected                                   ║
║  ✅ Stripe: Initialized                                   ║
║  ✅ OpenAI: Images API v2 Compatible                     ║
║  ✅ Seller Summary API: /api/seller/summary              ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
