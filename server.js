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

// JSTの日付境界(0:00)を求めるヘルパー
function jstDayBounds() {
  const nowUtc = new Date();
  const jstString = nowUtc.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
  const jstNow = new Date(jstString);
  const todayStart = new Date(jstNow);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
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
app.use(cors());

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

    // --- 決済成功:payment_intent.succeeded ---
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

        // stripe_paymentsテーブルに記録
        await pool.query(
          `insert into stripe_payments (
            seller_id, order_id, payment_intent_id, charge_id,
            amount_gross, amount_net, currency, status, raw_event, created_at, updated_at
          ) values ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, now())
          on conflict (payment_intent_id) do update set
            charge_id = excluded.charge_id,
            amount_gross = excluded.amount_gross,
            amount_net = excluded.amount_net,
            status = excluded.status,
            raw_event = excluded.raw_event,
            updated_at = now()`,
          [sellerId, orderId, pi.id, chargeId, amount, currency, "succeeded", event, created]
        );

        // ordersテーブルのステータス更新
        if (orderId) {
          await pool.query(
            `update orders set status='paid', stripe_sid=$1, updated_at=now() where id=$2`,
            [pi.id, orderId]
          );
        }

        audit("pi_succeeded", { sellerId, orderId, pi: pi.id, amount });
      }
    }

    // --- 返金:charge.refunded ---
    if (t === "charge.refunded" || t === "charge.refund.updated") {
      const ch = event.data.object;
      const piId = ch.payment_intent || null;
      const amount = typeof ch.amount === "number" ? ch.amount : 0;
      const refunded = typeof ch.amount_refunded === "number" ? ch.amount_refunded : 0;
      const net = Math.max(amount - refunded, 0);
      const status = refunded >= amount ? "refunded" : "partially_refunded";

      if (piId) {
        const r = await pool.query(
          `update stripe_payments set 
            amount_gross=$2, amount_net=$3, refunded_total=$4, status=$5, 
            charge_id=$6, raw_event=$7, updated_at=now()
          where payment_intent_id=$1 returning seller_id`,
          [piId, amount, net, refunded, status, ch.id, event]
        );

        if (r.rowCount === 0) {
          console.warn("refund for unknown pi", piId);
        } else {
          audit("charge_refund", { pi: piId, amount, refunded, net, status });
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
            amount_net = case when $2='disputed' then 0 else amount_gross - refunded_total end,
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

// ====== DB初期化（テーブル作成.txt と完全一致） ======
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

    -- stripe_payments（payment_intent_idはユニークではない）
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

  console.log("DB init done (100% matched with テーブル作成.txt)");
}

initDb().catch(e => console.error("DB init error", e));

// ====== 認証(管理API用) ======
function requireAdmin(req, res, next) {
  const t = req.header("x-admin-token");
  if (!t || t !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
}

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
    res.status(500).json({ error: "internal_error" });
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
    res.status(500).json({ error: "internal_error" });
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

    if (lower.includes("drop database")) {
      return res.status(400).json({ error: "drop_database_not_allowed" });
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
    res.status(500).json({ error: "internal_error", detail: e.message });
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

    // 画像データがあればimagesテーブルに保存（簡易版：Base64 URLで保存）
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
    res.status(500).json({ error: "internal_error", detail: e.message });
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
    res.status(500).json({ error: "internal_error" });
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
    res.status(500).json({ error: "internal_error" });
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
    res.status(500).json({ error: "internal_error" });
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
    res.status(500).json({ error: "internal_error" });
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
    res.status(500).json({ error: "internal_error", detail: e.message });
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
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== AI画像解析(軽量・即導入の強化版) ======
app.post("/api/analyze-item", upload.any(), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not set" });

    const f = (req.files && req.files[0]) || null;
    if (!f || !f.buffer) return res.status(400).json({ error: "file_required" });

    // --- helpers ---
    const zen2han = (s) => String(s || "").replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
    const intLoose = (s) => {
      const t = zen2han(String(s)).replace(/[,、\s¥¥円]/g, "");
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
    };

    const MIME = (() => {
      let mime = f.mimetype || "image/jpeg";
      const name = (f.originalname || "").toLowerCase();
      if (mime === "application/octet-stream") {
        if (name.endsWith(".png")) mime = "image/png";
        else if (name.endsWith(".webp")) mime = "image/webp";
        else if (name.endsWith(".heic")) mime = "image/heic";
        else mime = "image/jpeg";
      }
      return mime;
    })();

    const dataUrl = `data:${MIME};base64,${f.buffer.toString("base64")}`;

    // ---- 1st: 価格・数量まで(JSON強制) ----
    const promptFull = `
画像からテキストをOCRし、「品名」「数量」「単価(円)」「小計(円)」「合計(円)」を可能な限り抽出してください。
出力はこのJSONだけ(説明文なし):
{
  "items":[{"name":"<商品名>","qty":<整数>,"unit_price":<整数|null>,"subtotal":<整数|null>}],
  "total":<整数|null>
}
数量が不明なら1、単価が不明ならnullで構いません。`.trim();

    const full = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptFull },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ]
    });

    let parsed = {};
    try {
      parsed = JSON.parse((full.choices?.[0]?.message?.content || "{}").trim());
    } catch { }

    // 正規化
    let items = Array.isArray(parsed.items)
      ? parsed.items.map((i, idx) => {
        const name = String(i?.name || `商品${idx + 1}`).slice(0, 120);
        const qty = intLoose(i?.qty) || 1;
        let unit = i?.unit_price != null ? intLoose(i.unit_price) : null;
        let sub = i?.subtotal != null ? intLoose(i.subtotal) : null;
        if (unit != null && sub == null) sub = unit * qty;
        if (unit == null && sub != null && qty > 0) unit = Math.round(sub / qty);
        return { name, qty, unit_price: unit, subtotal: sub };
      }).filter(it => it.qty > 0)
      : [];

    let total = parsed?.total != null ? intLoose(parsed.total) : null;
    if (!total) {
      const sum = items.reduce((s, it) => s + (it.subtotal || 0), 0);
      total = sum > 0 ? sum : null;
    }

    // ---- 2nd: 品名だけ(JSON強制) ----
    let rawTrail = null;
    if (items.length === 0) {
      const promptNames = `
写真に写っている「商品の品名」だけを日本語で最大5件まで列挙してください。
出力はこのJSONだけ: {"names":["<品名1>","<品名2>"]}`.trim();

      const namesOnly = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptNames },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ]
      });

      const js = (namesOnly.choices?.[0]?.message?.content || "{}").trim();
      rawTrail = js;

      try {
        const { names = [] } = JSON.parse(js);
        if (Array.isArray(names) && names.length) {
          items = names.slice(0, 5).map((nm, i) => ({
            name: String(nm || `商品${i + 1}`).slice(0, 120),
            qty: 1,
            unit_price: null,
            subtotal: null
          }));
        }
      } catch { }
    }

    // summary(* 区切り、単価不明は?)
    const summary = items.length
      ? items.map(it => `${it.name} * ${it.unit_price ?? "?"}円 * ${it.qty}`).join("\n")
      : "";

    return res.json({
      items,
      total,
      summary,
      raw: rawTrail
        ? (full.choices?.[0]?.message?.content + "\n---\n" + rawTrail)
        : (full.choices?.[0]?.message?.content || "")
    });
  } catch (e) {
    console.error("analyze-item error", e?.response?.data || e);
    if (e?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "file_too_large" });
    res.status(500).json({ error: "internal_error", detail: e?.response?.data?.error?.message || e.message });
  }
});

// ====== AIフォトフレーム生成API(暫定版・DB不要) ======
app.post("/api/photo-frame", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not set" });

    const f = req.file;
    if (!f || !f.buffer) return res.status(400).json({ error: "file_required" });

    const prompt = process.env.OPENAI_PROMPT_PHOTO_FRAME || "Please beautify the photo.";

    let mime = f.mimetype || "image/jpeg";
    const name = (f.originalname || "").toLowerCase();
    if (mime === "application/octet-stream") {
      if (name.endsWith(".png")) mime = "image/png";
      else if (name.endsWith(".webp")) mime = "image/webp";
      else if (name.endsWith(".heic")) mime = "image/heic";
      else mime = "image/jpeg";
    }

    const dataUrl = `data:${mime};base64,${f.buffer.toString("base64")}`;

    const result = await openai.images.generate({
      model: process.env.AI_MODEL_IMAGE || "gpt-image-1",
      prompt,
      size: "1080x1440",
      response_format: "b64_json",
      image: dataUrl
    });

    const b64 = result.data[0].b64_json;
    const buf = Buffer.from(b64, "base64");

    res.set("Content-Type", "image/jpeg");
    return res.send(buf);
  } catch (e) {
    console.error("photo-frame error", e?.response?.data || e);
    res.status(500).json({ error: "internal_error", detail: e?.response?.data?.error?.message || e.message });
  }
});

// ====== 画像アップロードAPI ======
app.post("/api/images", upload.single("image"), async (req, res) => {
  try {
    const { orderId } = req.body;
    const f = req.file;

    if (!f || !f.buffer) return res.status(400).json({ error: "file_required" });

    // 本番環境ではS3にアップロードする想定
    // ここでは簡易的にBase64で保存（実運用では非推奨）
    const dataUrl = `data:${f.mimetype};base64,${f.buffer.toString("base64")}`;

    const result = await pool.query(
      `insert into images (order_id, kind, url, content_type, file_size)
       values ($1, 'processed', $2, $3, $4)
       returning id, order_id, kind, url, content_type, file_size, created_at`,
      [orderId || null, dataUrl, f.mimetype, f.size]
    );

    res.json(result.rows[0]);
  } catch (e) {
    console.error("upload image error", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== QRセッション記録API ======
app.post("/api/qr-sessions", async (req, res) => {
  try {
    const { sellerId, orderId } = req.body || {};

    if (!sellerId) return res.status(400).json({ error: "sellerId required" });

    const result = await pool.query(
      `insert into qr_sessions (seller_id, order_id)
       values ($1, $2)
       returning id, seller_id, order_id, scanned_at`,
      [sellerId, orderId || null]
    );

    res.json(result.rows[0]);
  } catch (e) {
    console.error("qr-session error", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== ヘルス / 404 / 静的配信 ======
app.get("/api/ping", (req, res) => res.json({ ok: true }));
app.use("/api", (req, res) => res.status(404).json({ error: "not_found", path: req.path }));
app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fleapay-lite running on port ${port} (100% matched with テーブル作成.txt)`));
