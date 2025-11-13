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
const BASE_URL = (process.env.BASE_URL || "").replace(/\/+$/, "");

// ====== multer(10MB、拡張子ゆるめ、メモリ格納) ======
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ====== 簡易レート制限 & 同一オリジン検証 ======
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_WRITES = 12;
const RATE_LIMIT_MAX_CHECKOUT = 20;
const hits = new Map();

function bumpAndAllow(key, limit) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length <= limit;
}

function clientIp(req) {
  return req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.ip;
}

function isSameOrigin(req) {
  if (!BASE_URL) return true;
  const ref = req.get("referer") || "";
  return ref.startsWith(BASE_URL);
}

function audit(event, payload) {
  console.log(`[AUDIT] ${event}`, payload);
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
  const base = (BASE_URL || "").replace(/\/+$/, "");
  const sellerUrl = `${base}/seller-purchase.html?s=${encodeURIComponent(sellerId)}`;
  const checkoutUrl = `${base}/checkout.html?s=${encodeURIComponent(sellerId)}${
    stripeAccountId ? `&acct=${encodeURIComponent(stripeAccountId)}` : ""
  }`;
  const dashboardUrl = `${base}/seller-dashboard.html?s=${encodeURIComponent(sellerId)}`;
  return { sellerUrl, checkoutUrl, dashboardUrl };
}

// 【パッチ1】JSTの日付境界(0:00)を求めるヘルパー（修正版）
// 問題: toLocaleString経由のDate変換はローカルタイムゾーンに依存し不安定
// 修正: UTC時刻から直接+9時間してJSTを求め、日付境界を計算
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

// ====== CORS / 以降のミドルウェア ======
// 【パッチ2】CORS設定を制限
const corsOptions = BASE_URL ? {
  origin: (origin, callback) => {
    // 同じオリジンまたはオリジンがない場合（例: curlなど）は許可
    if (!origin || origin.startsWith(BASE_URL)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true
} : {};

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

    // 【パッチ3 & 8】決済成功時にUPSERTパターンを使用（Race Condition回避）
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

        // ✅ ベストプラクティス: UPSERTパターン（ON CONFLICT）
        // Race Condition完全回避、1クエリで完結、原子性保証
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
            sellerId,      // $1
            orderId,       // $2
            pi.id,         // $3: payment_intent_id
            chargeId,      // $4
            balanceTxId,   // $5
            amount,        // $6: amount_gross
            fee,           // $7: amount_fee
            netAmount,     // $8: amount_net
            currency,      // $9
            "succeeded",   // $10: status
            0,             // $11: refunded_total (初期値)
            event,         // $12: raw_event
            created        // $13: created_at
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
      
      // 手数料を考慮して純額を再計算
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
      const outcome = dispute.status; // 'won' | 'lost'

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

// ====== DB初期化（テーブル作成.txt と完全一致 + UNIQUE制約追加） ======
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

    -- frames（ordersより先に作成）
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

    -- stripe_payments（payment_intent_idにUNIQUE制約を追加）
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

    -- 【パッチ8】payment_intent_idにUNIQUE制約を追加（Race Condition完全回避）
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

  console.log("DB init done (100% matched with テーブル作成.txt + UNIQUE constraint + PATCHED v2)");
}

initDb().catch(e => console.error("DB init error", e));

// ====== 認証(管理API用) ======
function requireAdmin(req, res, next) {
  const t = req.header("x-admin-token");
  if (!t || t !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
}

// 【パッチ4】エラーハンドリング用ミドルウェア - 詳細情報を本番では非表示
function sanitizeError(error, isDevelopment = false) {
  if (isDevelopment) {
    return { error: "internal_error", detail: error.message, stack: error.stack };
  }
  return { error: "internal_error" };
}

// 開発モード判定
const isDevelopment = process.env.NODE_ENV === 'development';

// ====== 管理API: 出店者作成/更新 ======
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

    res.json({
      id: row.id,
      displayName: row.display_name,
      shopName: row.shop_name,
      stripeAccountId: row.stripe_account_id,
      urls
    });
  } catch (e) {
    console.error("create/update seller", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
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
    res.status(500).json(sanitizeError(e, isDevelopment));
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

    res.json(rows[0]);
  } catch (e) {
    console.error("create/update frame", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
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
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== 管理API: SQL実行 ======
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

    // 【パッチ5】SQLインジェクション対策を強化
    const dangerousKeywords = [
      'drop database',
      'drop schema',
      'drop table sellers',
      'drop table orders',
      'drop table stripe_payments',
      'truncate table',
      'delete from sellers',
      'delete from orders',
      'delete from stripe_payments'
    ];

    for (const keyword of dangerousKeywords) {
      if (lower.includes(keyword)) {
        return res.status(400).json({ error: `dangerous_sql_detected: ${keyword}` });
      }
    }

    const result = await pool.query(trimmed);
    console.log("[BOOTSTRAP_SQL]", { length: trimmed.length, rowCount: result?.rowCount });

    res.json({
      ok: true,
      rowCount: result?.rowCount ?? null,
      fields: (result?.fields || []).map(f => f.name),
      rows: result?.rows || []
    });
  } catch (e) {
    console.error("bootstrap_sql error", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
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
      id: row.id,
      sellerId: row.seller_id,
      sellerName: row.seller_name,
      orderId: row.order_id,
      orderNo: row.order_no,
      orderSummary: row.order_summary,
      paymentIntentId: row.payment_intent_id,
      chargeId: row.charge_id,
      balanceTxId: row.balance_tx_id,
      amountGross: row.amount_gross,
      amountFee: row.amount_fee,
      amountNet: row.amount_net,
      currency: row.currency,
      status: row.status,
      refundedTotal: row.refunded_total,
      disputeStatus: row.dispute_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
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
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== 管理API: ダッシュボードサマリー ======
app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  try {
    // 今日の日付境界（JST）
    const { todayStart, tomorrowStart } = jstDayBounds();

    // 今日の決済サマリ
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

    // チャージバック / 返金状況
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
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== /api/pending/start (seller-purchase.htmlから呼ばれる) ======
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

    // ordersテーブルに挿入
    const orderResult = await pool.query(
      `insert into orders (seller_id, order_no, amount, summary, status)
       values ($1, $2, $3, $4, 'pending')
       returning id, seller_id, order_no, amount, summary, status, created_at`,
      [sellerId, orderNo, amt, summary || null]
    );

    const order = orderResult.rows[0];

    // aiAnalysisからorder_itemsがあれば挿入
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

    // 画像データがあればimagesテーブルに保存（簡易版:Base64 URLで保存）
    if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
      await pool.query(
        `insert into images (order_id, kind, url, content_type)
         values ($1, 'processed', $2, 'image/jpeg')`,
        [order.id, imageData]
      );
    }

    audit("pending_order_created", { orderId: order.id, sellerId, orderNo, amount: amt });

    // checkout URLを返す
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
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== /api/price/latest (checkout.htmlから呼ばれる) ======
app.get("/api/price/latest", async (req, res) => {
  try {
    const sellerId = String(req.query.s || "");
    if (!sellerId) return res.status(400).json({ error: "sellerId required" });

    // 最新のpendingまたはin_checkoutステータスのオーダーを取得
    const result = await pool.query(
      `select id, seller_id, order_no, amount, summary, status, created_at
       from orders
       where seller_id = $1 and status in ('pending', 'in_checkout')
       order by created_at desc
       limit 1`,
      [sellerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "no_pending_order" });
    }

    const order = result.rows[0];

    res.json({
      orderId: order.id,
      sellerId: order.seller_id,
      orderNo: order.order_no,
      amount: order.amount,
      summary: order.summary || "",
      status: order.status,
      createdAt: order.created_at
    });
  } catch (e) {
    console.error("price/latest error", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== オーダー作成API ======
app.post("/api/orders", async (req, res) => {
  try {
    if (!isSameOrigin(req)) return res.status(403).json({ error: "forbidden_origin" });

    const { sellerId, amount, summary, frameId, items } = req.body || {};
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

    // ordersテーブルに挿入
    const orderResult = await pool.query(
      `insert into orders (seller_id, order_no, amount, summary, frame_id, status)
       values ($1, $2, $3, $4, $5, 'pending')
       returning id, seller_id, order_no, amount, summary, frame_id, status, created_at`,
      [sellerId, orderNo, amt, summary || null, frameId || null]
    );

    const order = orderResult.rows[0];

    // order_itemsがあれば挿入
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const name = String(item.name || "商品").slice(0, 120);
        const unitPrice = Number(item.unit_price) || 0;
        const quantity = Number(item.quantity) || 1;
        const itemAmount = unitPrice * quantity;
        const source = item.source || "ai";

        await pool.query(
          `insert into order_items (order_id, name, unit_price, quantity, amount, source)
           values ($1, $2, $3, $4, $5, $6)`,
          [order.id, name, unitPrice, quantity, itemAmount, source]
        );
      }
    }

    audit("order_created", { orderId: order.id, sellerId, orderNo, amount: amt });

    res.json({
      orderId: order.id,
      orderNo: order.order_no,
      sellerId: order.seller_id,
      amount: order.amount,
      summary: order.summary,
      frameId: order.frame_id,
      status: order.status,
      createdAt: order.created_at
    });
  } catch (e) {
    console.error("create order", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== オーダー一覧取得 ======
app.get("/api/orders", async (req, res) => {
  try {
    const sellerId = String(req.query.s || "");
    const status = String(req.query.status || "");
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    if (!sellerId) return res.status(400).json({ error: "sellerId required" });

    let query = `select * from orders where seller_id=$1`;
    const params = [sellerId];

    if (status) {
      query += ` and status=$2`;
      params.push(status);
    }

    query += ` order by created_at desc limit $${params.length + 1}`;
    params.push(limit);

    const { rows } = await pool.query(query, params);

    res.json({ orders: rows });
  } catch (e) {
    console.error("get orders", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== オーダー詳細取得（明細含む） ======
app.get("/api/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderResult = await pool.query(
      `select * from orders where id=$1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "order_not_found" });
    }

    const order = orderResult.rows[0];

    // order_items取得
    const itemsResult = await pool.query(
      `select * from order_items where order_id=$1 order by id`,
      [orderId]
    );

    // images取得
    const imagesResult = await pool.query(
      `select * from images where order_id=$1`,
      [orderId]
    );

    res.json({
      order,
      items: itemsResult.rows,
      images: imagesResult.rows
    });
  } catch (e) {
    console.error("get order detail", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== Checkout セッション作成（修正版） ======
app.post("/api/checkout/session", async (req, res) => {
  try {
    if (!isSameOrigin(req)) return res.status(403).json({ error: "forbidden_origin" });

    const ip = clientIp(req);
    if (!bumpAndAllow(`checkout:${ip}`, RATE_LIMIT_MAX_CHECKOUT)) {
      return res.status(429).json({ error: "rate_limited" });
    }

    const { orderId, sellerId, latest, summary } = req.body || {};

    let order = null;

    // latest=true の場合、最新のpendingオーダーを取得
    if (latest && sellerId) {
      const result = await pool.query(
        `select * from orders 
         where seller_id=$1 and status in ('pending', 'in_checkout')
         order by created_at desc limit 1`,
        [sellerId]
      );
      
      if (result.rows.length > 0) {
        order = result.rows[0];
      }
    } else if (orderId && sellerId) {
      // orderId指定の場合
      const orderResult = await pool.query(
        `select * from orders where id=$1 and seller_id=$2`,
        [orderId, sellerId]
      );

      if (orderResult.rows.length > 0) {
        order = orderResult.rows[0];
      }
    }

    if (!order) {
      return res.status(404).json({ error: "order_not_found" });
    }

    if (order.status === 'paid') {
      return res.status(400).json({ error: "already_paid" });
    }

    // 出店者のStripeアカウント取得
    const stripeAccountId = await resolveSellerAccountId(order.seller_id);
    if (!stripeAccountId) {
      return res.status(400).json({ error: "seller_stripe_account_not_found" });
    }

    // order_items取得
    const itemsResult = await pool.query(
      `select * from order_items where order_id=$1`,
      [order.id]
    );

    let line_items = [];

    if (itemsResult.rows.length > 0) {
      // 明細がある場合
      line_items = itemsResult.rows.map(item => ({
        quantity: item.quantity,
        price_data: {
          currency: "jpy",
          unit_amount: item.unit_price,
          product_data: {
            name: item.name,
            description: `数量: ${item.quantity}`
          }
        }
      }));
    } else {
      // 明細がない場合は合計金額で1行
      line_items = [{
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: order.amount,
          product_data: {
            name: order.summary || summary || "お支払い",
            description: `オーダー番号: ${order.order_no}`
          }
        }
      }];
    }

    const fee = Math.round(order.amount * 0.10);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "jpy",
      line_items,
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: stripeAccountId },
        description: order.summary || summary || `オーダー ${order.order_no}`,
        metadata: {
          sellerId: order.seller_id,
          orderId: order.id,
          orderNo: String(order.order_no),
          sellerAccountId: stripeAccountId
        }
      },
      success_url: `${BASE_URL}/checkout/success.html?sid={CHECKOUT_SESSION_ID}&orderId=${order.id}`,
      cancel_url: `${BASE_URL}/checkout/cancel.html?orderId=${order.id}`,
      customer_creation: "if_required"
    });

    // オーダーステータスを in_checkout に更新
    await pool.query(
      `update orders set status='in_checkout', stripe_sid=$1, updated_at=now() where id=$2`,
      [session.id, order.id]
    );

    res.json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("create checkout session", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== 出店者ダッシュボード用:売上サマリーAPI ======
app.get("/api/seller/summary", async (req, res) => {
  try {
    const sellerId = String(req.query.s || "");
    if (!sellerId) return res.status(400).json({ error: "sellerId required" });

    const sellerRow = await pool.query(
      `select id, display_name, shop_name, stripe_account_id from sellers where id=$1 limit 1`,
      [sellerId]
    );

    if (sellerRow.rows.length === 0) {
      return res.status(404).json({ error: "seller_not_found" });
    }

    const seller = sellerRow.rows[0];
    const displayName = seller.display_name || sellerId;
    const urls = buildSellerUrls(sellerId, seller.stripe_account_id);

    const { todayStart, tomorrowStart, yesterdayStart } = jstDayBounds();

    const qDay = `
      select 
        coalesce(sum(amount_gross),0) as gross,
        coalesce(sum(amount_net),0) as net,
        count(*) as count
      from stripe_payments
      where seller_id=$1 and created_at >= $2 and created_at < $3
    `;

    const [todayRes, yestRes, totalRes, firstRes, recentRes] = await Promise.all([
      pool.query(qDay, [sellerId, todayStart, tomorrowStart]),
      pool.query(qDay, [sellerId, yesterdayStart, todayStart]),
      pool.query(
        `select coalesce(sum(amount_gross),0) as gross, coalesce(sum(amount_net),0) as net, count(*) as count
         from stripe_payments where seller_id=$1`,
        [sellerId]
      ),
      pool.query(
        `select min(created_at) as first_at from stripe_payments where seller_id=$1`,
        [sellerId]
      ),
      pool.query(
        `select sp.*, o.order_no, o.summary as order_summary
         from stripe_payments sp
         left join orders o on sp.order_id = o.id
         where sp.seller_id=$1
         order by sp.created_at desc limit 20`,
        [sellerId]
      )
    ]);

    const rowToday = todayRes.rows[0] || { gross: 0, net: 0, count: 0 };
    const rowYest = yestRes.rows[0] || { gross: 0, net: 0, count: 0 };
    const rowTotal = totalRes.rows[0] || { gross: 0, net: 0, count: 0 };

    const todayCount = Number(rowToday.count || 0);
    const yestCount = Number(rowYest.count || 0);
    const totalCount = Number(rowTotal.count || 0);
    const todayNet = Number(rowToday.net || 0);
    const todayGross = Number(rowToday.gross || 0);
    const yestNet = Number(rowYest.net || 0);
    const yestGross = Number(rowYest.gross || 0);
    const totalNet = Number(rowTotal.net || 0);
    const totalGross = Number(rowTotal.gross || 0);

    const firstAt = firstRes.rows[0]?.first_at || null;

    const recent = recentRes.rows.map(r => ({
      id: r.payment_intent_id,
      orderId: r.order_id,
      orderNo: r.order_no,
      amount: Number(r.amount_gross || 0),
      net_amount: Number(r.amount_net || 0),
      currency: r.currency || "jpy",
      status: r.status || "succeeded",
      summary: r.order_summary || "",
      created: r.created_at ? new Date(r.created_at).getTime() / 1000 : null
    }));

    res.json({
      sellerId,
      displayName,
      shopName: seller.shop_name,
      salesToday: todayNet,
      countToday: todayCount,
      avgToday: todayCount ? Math.round(todayNet / todayCount) : 0,
      recent,
      today: {
        gross: todayGross,
        net: todayNet,
        count: todayCount,
        avg: todayCount ? Math.round(todayNet / todayCount) : 0,
        start: todayStart.toISOString(),
        end: tomorrowStart.toISOString()
      },
      yesterday: {
        gross: yestGross,
        net: yestNet,
        count: yestCount,
        avg: yestCount ? Math.round(yestNet / yestCount) : 0,
        start: yesterdayStart.toISOString(),
        end: todayStart.toISOString()
      },
      total: {
        gross: totalGross,
        net: totalNet,
        count: totalCount,
        avg: totalCount ? Math.round(totalNet / totalCount) : 0,
        since: firstAt ? new Date(firstAt).toISOString() : null
      },
      urls
    });
  } catch (e) {
    console.error("seller/summary error", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== AI画像解析(軽量・即導入の強化版) ======
app.post("/api/analyze-item", upload.any(), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "no_image" });
    }

    const imageBuffers = files.map(f => f.buffer);
    const base64Images = imageBuffers.map(buf => buf.toString("base64"));

    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `これはレシートや商品リストの画像です。以下の情報を抽出してJSON形式で返してください:
{
  "items": [
    {"name": "商品名", "qty": 数量, "unit_price": 単価, "subtotal": 小計}
  ],
  "total": 合計金額,
  "summary": "概要テキスト"
}

数値は整数で返してください。通貨記号は不要です。`
          },
          ...base64Images.map(b64 => ({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${b64}`
            }
          }))
        ]
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 2000,
      temperature: 0.1
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    
    // JSONの抽出
    let parsed = {};
    try {
      // ```json で囲まれている場合の処理
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        parsed = JSON.parse(responseText);
      }
    } catch (parseErr) {
      console.error("JSON parse error", parseErr);
      parsed = { items: [], total: 0, summary: responseText };
    }

    res.json({
      items: parsed.items || [],
      total: parsed.total || 0,
      summary: parsed.summary || "",
      raw: responseText
    });
  } catch (e) {
    console.error("analyze-item error", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== AI生活感除去 / 値札消し ======
app.post("/api/photo-clean", upload.single("image"), async (req, res) => {
  try {
    const f = req.file;
    if (!f || !f.buffer) {
      return res.status(400).json({ error: "file_required" });
    }

    const prompt = `
      Remove all price tags, numeric price labels, stickers, receipts,
      and any objects that look like "price information".
      Also remove background clutter such as bags, boxes, and other people's hands.
      Lightly enhance brightness (+10%) and saturation (+6%).
      Keep the original product exactly unchanged.
      DO NOT modify faces, items, or colors unnaturally.
      Output should look like a natural photo ready for SNS.
    `;

    const result = await openai.images.edits({
      model: "gpt-image-1",
      image: f.buffer,
      prompt,
      size: "1024x1536",
      response_format: "b64_json"
    });

    const buf = Buffer.from(result.data[0].b64_json, "base64");
    res.set("Content-Type", "image/png");
    res.send(buf);

  } catch (e) {
    console.error("photo-clean error", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== AIフォトフレーム生成API(暫定版・DB不要) ======
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

    // ★ gpt-image-1 には「data:～」ではなく素の base64 文字列を渡す
    const base64Image = f.buffer.toString("base64");

    const result = await openai.images.generate({
      model: process.env.AI_MODEL_IMAGE || "gpt-image-1",
      prompt,
      size: "1024x1536",
      n: 1,
      response_format: "b64_json",
      image: base64Image
    });

    const b64 = result.data[0].b64_json;
    const buf = Buffer.from(b64, "base64");

    res.set("Content-Type", "image/jpeg");
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

// ====== 画像アップロードAPI ======
app.post("/api/images", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "no_image" });
    }

    const { orderId } = req.body || {};
    const imageBuffer = req.file.buffer;
    const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString("base64")}`;

    const result = await pool.query(
      `insert into images (order_id, kind, url, content_type, file_size)
       values ($1, 'processed', $2, $3, $4)
       returning id, order_id, kind, url, content_type, file_size, created_at`,
      [orderId || null, base64Image, req.file.mimetype, req.file.size]
    );

    res.json(result.rows[0]);
  } catch (e) {
    console.error("upload image error", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== QRセッション記録API ======
app.post("/api/qr-sessions", async (req, res) => {
  try {
    const { sellerId, orderId } = req.body || {};
    
    if (!sellerId) {
      return res.status(400).json({ error: "sellerId required" });
    }

    const result = await pool.query(
      `insert into qr_sessions (seller_id, order_id, scanned_at)
       values ($1, $2, now())
       returning id, seller_id, order_id, scanned_at`,
      [sellerId, orderId || null]
    );

    res.json(result.rows[0]);
  } catch (e) {
    console.error("qr-sessions error", e);
    res.status(500).json(sanitizeError(e, isDevelopment));
  }
});

// ====== ヘルスチェック ======
app.get("/api/ping", (req, res) => res.json({ ok: true }));

// ====== 404ハンドラー ======
app.use("/api", (req, res) => res.status(404).json({ error: "not_found", path: req.path }));

// ====== 静的ファイル配信 ======
app.use(express.static(path.join(__dirname, "public")));

// ====== サーバー起動 ======
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fleapay-lite running on port ${port} (100% matched with テーブル作成.txt + UNIQUE constraint + PATCHED v2)`));
