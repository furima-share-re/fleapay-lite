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
import sharp from "sharp";
import bcrypt from "bcryptjs";
// 🆕 S3クライアントをインポート
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

// Node.js バージョン互換性対応
let FileCtor;
try {
  FileCtor = globalThis.File;
  if (!FileCtor) {
    const { File } = await import("undici");
    FileCtor = File;
  }
} catch (error) {
  console.warn("File constructor not available");
}

const { Pool } = pkg;
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// OpenAIクライアントの初期化（環境変数が設定されている場合のみ）
const HAS_OPENAI_CONFIG = !!process.env.OPENAI_API_KEY;
const openai = HAS_OPENAI_CONFIG
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// 🆕 S3クライアントの初期化
// 環境変数をまとめて吸い上げる
const AWS_REGION      = process.env.AWS_REGION;
const AWS_BUCKET      = process.env.AWS_S3_BUCKET;

// どちらの名前でも読めるようにする（あなたの環境はこっち）
const AWS_ACCESS_KEY  = process.env.AWS_ACCESS_KEY  || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_KEY  = process.env.AWS_SECRET_KEY  || process.env.AWS_SECRET_ACCESS_KEY;

// 一式そろっているかチェック
const HAS_S3_CONFIG = !!(AWS_REGION && AWS_BUCKET && AWS_ACCESS_KEY && AWS_SECRET_KEY);

// S3クライアント（足りなければ null にして無効化）
const s3 = HAS_S3_CONFIG
  ? new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    })
  : null;

const S3_BUCKET = AWS_BUCKET;

if (!HAS_S3_CONFIG) {
  console.warn("⚠️ S3設定が足りないため、S3アップロードを無効化しました。");
}

// ====== 設定 ======
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-devtoken";
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const PORT = process.env.PORT || 3000;
// pending 状態の注文を何分まで有効とみなすか(環境変数優先)
const PENDING_TTL_MIN = parseInt(process.env.PENDING_TTL_MIN || "30", 10);

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
function buildSellerUrls(sellerId, stripeAccountId, orderId = null) {
  const base = BASE_URL;
  const sellerUrl = `${base}/seller-purchase.html?s=${encodeURIComponent(sellerId)}`;
  
  let checkoutUrl = `${base}/checkout.html?s=${encodeURIComponent(sellerId)}`;
  if (orderId) {
    checkoutUrl += `&order=${encodeURIComponent(orderId)}`;
  }
  if (stripeAccountId) {
    checkoutUrl += `&acct=${encodeURIComponent(stripeAccountId)}`;
  }
  
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


// 🆕 決済・売上関連のルート登録関数をインポート
import { registerPaymentRoutes } from "./payments.js";

// 💳 決済・売上系のルートを登録（Webhookは raw body が必要なのでここで）
registerPaymentRoutes(app, {
  stripe,
  pool,
  BASE_URL,
  ADMIN_TOKEN,
  clientIp,
  bumpAndAllow,
  RATE_LIMIT_MAX_CHECKOUT,
  jstDayBounds,
  audit,
  sanitizeError,
  requireAdmin,
  PENDING_TTL_MIN,   // ← 追加
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
      email text,
      password_hash text,
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
      cost_amount integer default 0,
      -- 🌍 世界相場（参考）※ eBay US / UK のうち高い方を事前計算して保存
      world_price_median integer,
      world_price_high integer,
      world_price_low integer,
      world_price_sample_count integer default 0,
      world_price_revenue_max integer,
      world_price_profit_max integer,
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

    -- buyer_attributes
    create table if not exists buyer_attributes (
      order_id uuid primary key references orders(id) on delete cascade,
      customer_type text not null,
      gender text not null,
      age_band text not null,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      constraint buyer_attributes_customer_type_check 
        check (customer_type in ('domestic', 'inbound')),
      constraint buyer_attributes_gender_check 
        check (gender in ('male', 'female', 'unknown')),
      constraint buyer_attributes_age_band_check 
        check (age_band in ('child', 'age_16_29', 'age_30_59', 'age_60_plus'))
    );

    create index if not exists buyer_attributes_customer_type_idx
      on buyer_attributes(customer_type);

    -- order_metadata
    create table if not exists order_metadata (
      order_id uuid primary key references orders(id) on delete cascade,
      category text,
      buyer_language text,
      is_cash boolean default false,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create index if not exists order_metadata_order_idx
      on order_metadata(order_id);

    create index if not exists order_metadata_is_cash_idx
      on order_metadata(is_cash);

    -- kids_achievements
    create table if not exists kids_achievements (
      seller_id text not null,
      code text not null,
      kind text not null,
      first_earned_at timestamptz default now(),
      primary key (seller_id, code),
      constraint kids_achievements_kind_check
        check (kind in ('badge', 'title'))
    );

    create index if not exists kids_achievements_seller_idx
      on kids_achievements(seller_id);

    -- 既存DB向け: 世界相場カラムを追加
    alter table if exists orders
      add column if not exists world_price_median integer,
      add column if not exists world_price_high integer,
      add column if not exists world_price_low integer,
      add column if not exists world_price_sample_count integer default 0,
      add column if not exists world_price_revenue_max integer,
      add column if not exists world_price_profit_max integer;

    -- 🆕 論理削除用カラム追加
    alter table if exists orders
      add column if not exists deleted_at timestamptz;
  `);

  console.log("✅ DB init done (PATCHED v3.6 - world_price_revenue_max/profit_max columns added)");
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

// ====== 🆕 出店者用API: 売上サマリー取得（orders基準に変更） ======
app.post("/api/orders/buyer-attributes", async (req, res) => {
  try {
    const { orderId, customer_type, gender, age_band } = req.body || {};

    if (!orderId || !customer_type || !gender || !age_band) {
      return res.status(400).json({ error: "missing_params" });
    }

    // ざっくりバリデーション
    const allowedType = ["domestic", "inbound"];
    const allowedGender = ["male", "female", "unknown"];
    const allowedAge = ["child", "age_16_29", "age_30_59", "age_60_plus"];

    if (!allowedType.includes(customer_type) ||
        !allowedGender.includes(gender) ||
        !allowedAge.includes(age_band)) {
      return res.status(400).json({ error: "invalid_params" });
    }

    // 🆕 削除済み注文のチェック
    const orderCheck = await pool.query(
      `select id, deleted_at from orders where id = $1`,
      [orderId]
    );
    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ error: "order_not_found" });
    }
    if (orderCheck.rows[0].deleted_at) {
      return res.status(400).json({ error: "order_deleted", message: "削除済みの注文は更新できません" });
    }

    // UPSERT（すでにあれば更新）
    await pool.query(
      `insert into buyer_attributes (order_id, customer_type, gender, age_band)
       values ($1,$2,$3,$4)
       on conflict (order_id) do update set
         customer_type = excluded.customer_type,
         gender        = excluded.gender,
         age_band      = excluded.age_band,
         updated_at    = now()`,
      [orderId, customer_type, gender, age_band]
    );

    audit("buyer_attrs_saved", { orderId, customer_type, gender, age_band });
    res.json({ ok: true });
  } catch (e) {
    console.error("/api/orders/buyer-attributes error", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 🆕 注文メタデータ保存（現金購入後の追加入力用） ======
app.post("/api/orders/metadata", async (req, res) => {
  try {
    const { orderId, category, buyer_language, is_cash } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: "order_id_required" });
    }

    // 🆕 削除済み注文のチェック
    const orderCheck = await pool.query(
      `select id, deleted_at from orders where id = $1`,
      [orderId]
    );
    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ error: "order_not_found" });
    }
    if (orderCheck.rows[0].deleted_at) {
      return res.status(400).json({ error: "order_deleted", message: "削除済みの注文は更新できません" });
    }

    // is_cash が送られてこなかった場合は、既存の値を維持する
    const normalizedIsCash =
      typeof is_cash === "boolean" ? is_cash : null;

    await pool.query(
      `insert into order_metadata (order_id, category, buyer_language, is_cash)
       values ($1, $2, $3, $4)
       on conflict (order_id)
       do update set
         category        = excluded.category,
         buyer_language  = excluded.buyer_language,
         -- is_cash が null のときは既存の値を残す
         is_cash         = coalesce(excluded.is_cash, order_metadata.is_cash),
         updated_at      = now()`,
      [orderId, category || null, buyer_language || null, normalizedIsCash]
    );

    audit("order_metadata_saved", { orderId, category, buyer_language, is_cash });
    res.json({ ok: true });
  } catch (e) {
    console.error("/api/orders/metadata error", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 🆕 商品メモ(summary) 更新API ======
app.post("/api/orders/update-summary", async (req, res) => {
  try {
    const { orderId, summary } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: "order_id_required" });
    }

    // 🆕 削除済み注文のチェック
    const orderCheck = await pool.query(
      `select id, deleted_at from orders where id = $1`,
      [orderId]
    );
    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ error: "order_not_found" });
    }
    if (orderCheck.rows[0].deleted_at) {
      return res.status(400).json({ error: "order_deleted", message: "削除済みの注文は更新できません" });
    }

    await pool.query(
      `update orders
         set summary   = $2,
             updated_at = now()
       where id = $1`,
      [orderId, summary || null]
    );

    audit("order_summary_updated", { orderId });
    res.json({ ok: true });
  } catch (e) {
    console.error("/api/orders/update-summary error", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 🆕 仕入額(cost_amount) 更新API ======
app.post("/api/orders/update-cost", async (req, res) => {
  try {
    const { orderId, costAmount } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: "order_id_required" });
    }

    const cost = Number(costAmount);
    if (!Number.isFinite(cost) || cost < 0) {
      return res.status(400).json({ error: "invalid_cost" });
    }

    // 🆕 削除済み注文のチェック
    const orderCheck = await pool.query(
      `select id, deleted_at from orders where id = $1`,
      [orderId]
    );
    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ error: "order_not_found" });
    }
    if (orderCheck.rows[0].deleted_at) {
      return res.status(400).json({ error: "order_deleted", message: "削除済みの注文は更新できません" });
    }

    await pool.query(
      `update orders
         set cost_amount = $2,
             updated_at  = now()
       where id = $1`,
      [orderId, Math.round(cost)]
    );

    audit("order_cost_updated", { orderId, cost: Math.round(cost) });
    res.json({ ok: true });
  } catch (e) {
    console.error("/api/orders/update-cost error", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 🆕 出店者用: 注文1件の詳細（写真＋属性）取得（orders基準に修正） ======
// ※ payments.js 側の /api/seller/order-detail と競合しないようにパス名を変更
app.get("/api/seller/order-detail-full", async (req, res) => {
  const sellerId = req.query.s;
  const orderId  = req.query.orderId;

  if (!sellerId || !orderId) {
    return res.status(400).json({ error: "seller_id_and_order_id_required" });
  }

  try {
      const result = await pool.query(
        `
      SELECT
        o.id,
        o.summary              AS memo,
        o.amount,
        o.cost_amount,
        o.created_at,
        om.is_cash,
        ba.customer_type,
        ba.gender,
        ba.age_band,
        om.category            AS item_category,
        om.buyer_language,
        img.url                AS image_url
      FROM orders o
      LEFT JOIN order_metadata   om  ON om.order_id  = o.id
      LEFT JOIN buyer_attributes ba  ON ba.order_id  = o.id
      LEFT JOIN images           img ON img.order_id = o.id
      WHERE o.id = $1
        AND o.seller_id = $2
        AND o.deleted_at IS NULL  -- 🆕 削除済みを除外
      ORDER BY img.created_at DESC NULLS LAST
      LIMIT 1
      `,
        [orderId, sellerId]
      );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "order_not_found" });
    }

    const row = result.rows[0];

    res.json({
      orderId: row.id,
      sellerId: sellerId,          // ★ 追加（超重要）★
      memo: row.memo || "",
      amount: row.amount,
      costAmount: row.cost_amount || 0,  // ★ 追加
      createdAt: row.created_at,
      isCash: !!row.is_cash,
      customerType: row.customer_type || "unknown",
      gender: row.gender || "unknown",
      ageBand: row.age_band || "unknown",
      itemCategory: row.item_category || "unknown",
      buyerLanguage: row.buyer_language || "unknown",
      imageUrl: row.image_url || null
    });
  } catch (e) {
    console.error("seller_order_detail_error", e);
    res.status(500).json({ error: "server_error" });
  }
});

// ====== 🆕 出店者用: 注文削除（論理削除） ======
app.delete("/api/seller/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.query.s;
    
    if (!orderId) {
      return res.status(400).json({ error: "order_id_required" });
    }

    if (!sellerId) {
      return res.status(400).json({ error: "seller_id_required" });
    }

    // 注文の存在確認とseller_idの確認（削除済みも含む）
    const orderCheck = await pool.query(
      `select id, seller_id, amount, summary, status, deleted_at from orders where id = $1`,
      [orderId]
    );

    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ error: "order_not_found" });
    }

    const order = orderCheck.rows[0];

    // 出店者IDが一致するか確認
    if (order.seller_id !== sellerId) {
      return res.status(403).json({ 
        error: "forbidden",
        message: "この取引を削除する権限がありません。" 
      });
    }

    // 既に削除済みの場合
    if (order.deleted_at) {
      return res.status(400).json({ 
        error: "already_deleted",
        message: "この取引は既に削除されています。" 
      });
    }

    // 既に決済済み（paid）の場合は削除を制限（安全のため）
    if (order.status === "paid") {
      return res.status(400).json({ 
        error: "cannot_delete_paid_order",
        message: "決済済みの注文は削除できません。返金処理を行ってください。" 
      });
    }

    // 論理削除（deleted_atを設定）
    await pool.query(
      `update orders set deleted_at = now(), updated_at = now() where id = $1`,
      [orderId]
    );

    audit("order_deleted_by_seller", { 
      orderId, 
      sellerId: order.seller_id, 
      amount: order.amount,
      status: order.status
    });

    res.json({ ok: true, message: "取引を削除しました。" });
  } catch (e) {
    console.error("/api/seller/orders/:orderId DELETE error", e);
    res.status(500).json(sanitizeError(e));
  }
});

// 👇 出店者ID使用可否チェックAPI (start_onboarding の前に追加)
app.get("/api/seller/check-id", async (req, res) => {
  try {
    const id = (req.query.id || "").trim();

    if (!id) {
      return res.status(400).json({ ok: false, error: "id_required" });
    }

    // クライアントと同じルールでチェック（3〜32文字・英数字・ハイフン・アンダーバー）
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(id)) {
      return res.status(400).json({ ok: false, error: "invalid_format" });
    }

    const result = await pool.query(
      `select 1 from sellers where id = $1 limit 1`,
      [id.toLowerCase()]
    );

    if (result.rowCount > 0) {
      // 既に存在
      return res.json({ ok: false, error: "taken" });
    }

    // 使用可能
    return res.json({ ok: true });
  } catch (e) {
    console.error("/api/seller/check-id error", e);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

app.post("/api/seller/start_onboarding", async (req, res) => {
  try {
    const { publicId, displayName, email, password } = req.body || {};

    // 1) 入力チェック（まちがってたらすぐ返す）
    if (!publicId || !displayName || !email || !password) {
      return res.status(400).json({ error: "missing_params" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "password_too_short" });
    }
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(publicId)) {
      return res.status(400).json({ error: "invalid_public_id" });
    }

    const normalizedId = publicId.toLowerCase();

    // ★ 追加：ID重複チェック（念のためサーバ側でも必ず実施）
    const existing = await pool.query(
      `select 1 from sellers where id = $1 limit 1`,
      [normalizedId]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "id_taken" });
    }

    // 2) パスワードをハッシュ化（安全にする）
    const passwordHash = await bcrypt.hash(password, 10);

    // 3) Stripeの出店者アカウント（Express）をつくる
    const account = await stripe.accounts.create({
      type: "express",
      country: "JP",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });

    // 4) Fleapayのデータベースに保存（新規INSERTのみ）
    await pool.query(
      `insert into sellers (id, display_name, stripe_account_id, email, password_hash)
       values ($1,$2,$3,$4,$5)`,
      [normalizedId, displayName, account.id, email, passwordHash]
    );

    // 5) 本人確認ページ（Stripe Onboarding）を作る
    const returnUrl  = `${BASE_URL}/seller-dashboard.html?s=${encodeURIComponent(normalizedId)}`;
    const refreshUrl = `${BASE_URL}/seller-register.html?retry=1`;

    const link = await stripe.accountLinks.create({
      account: account.id,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: refreshUrl
    });

    // 6) フロントにURLを返す（ここに飛べば本人確認が始まる）
    return res.json({ url: link.url });

  } catch (err) {
    console.error("start_onboarding error", err);
    return res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

// 🆕 若旦那 / 若女将 用サマリーAPI（バッジ・称号・実績）
app.get("/api/seller/kids-summary", async (req, res) => {
  const sellerId = req.query.s;
  if (!sellerId) {
    return res.status(400).json({ error: "seller_id_required" });
  }

  try {
    // 1) 基本集計
    const totalOrdersResult = await pool.query(
      `select count(*) as cnt from orders where seller_id = $1 AND deleted_at IS NULL`,
      [sellerId]
    );
    const totalOrders = Number(totalOrdersResult.rows[0].cnt || 0);

    const attrsResult = await pool.query(
      `select 
         count(*) as total_with_attrs,
         count(*) filter (where customer_type = 'inbound') as inbound_cnt,
         count(*) filter (where age_band = 'child') as child_cnt
       from buyer_attributes ba
       join orders o on o.id = ba.order_id
       where o.seller_id = $1 AND o.deleted_at IS NULL`,
      [sellerId]
    );

    const ordersWithAttrs = Number(attrsResult.rows[0].total_with_attrs || 0);
    const inboundCount = Number(attrsResult.rows[0].inbound_cnt || 0);
    const childCustomerCount = Number(attrsResult.rows[0].child_cnt || 0);

    const cashResult = await pool.query(
      `select 
         count(*) filter (where om.is_cash = true) as cash_cnt
       from orders o
       left join order_metadata om on om.order_id = o.id
       where o.seller_id = $1 AND o.deleted_at IS NULL`,
      [sellerId]
    );
    const cashOrders = Number(cashResult.rows[0].cash_cnt || 0);

    const cashlessResult = await pool.query(
      `select count(*) as cnt
       from stripe_payments
       where seller_id = $1
         and status = 'succeeded'`,
      [sellerId]
    );
    const cashlessOrders = Number(cashlessResult.rows[0].cnt || 0);

    const dataScore =
      totalOrders === 0
        ? 0
        : Math.round((ordersWithAttrs / totalOrders) * 100);

    // 2) 実績判定
    const achievements = [];
    const badges = [];
    const titles = [];

    function addBadge(code, label, description) {
      badges.push({ code, label, description });
      achievements.push({ code, kind: "badge", label, description });
    }

    function addTitle(code, label, description) {
      titles.push({ code, label, description });
      achievements.push({ code, kind: "title", label, description });
    }

    // ---- バッジ判定 ----
    if (totalOrders >= 1) {
      addBadge("FIRST_SALE", "はじめての売り子", "1回めの販売に成功！");
    }
    if (totalOrders >= 5) {
      addBadge("FIVE_SALES", "小さな商人", "5回以上 売れました");
    }
    if (cashlessOrders >= 1) {
      addBadge(
        "CASHLESS_1",
        "キャッシュレス入門",
        "QR / カードで1回決済できました"
      );
    }
    if (inboundCount >= 1) {
      addBadge(
        "INBOUND_FRIEND_1",
        "海外のお客さま いらっしゃい",
        "インバウンドのお客さまに1回以上販売"
      );
    }
    if (dataScore >= 80 && totalOrders >= 3) {
      addBadge(
        "DATA_SCORE_80",
        "データ名人",
        "購入者のタグ入力を 80%以上できました"
      );
    }

    // ---- 称号判定 ----
    if (totalOrders >= 10 && dataScore >= 70) {
      addTitle(
        "TITLE_YOUNG_MASTER",
        "若旦那 / 若女将 見習い",
        "たくさん売って、お客さまの情報もちゃんと入力できました"
      );
    }
    if (totalOrders >= 30 && dataScore >= 80) {
      addTitle(
        "TITLE_FULL_MASTER",
        "本物の若旦那 / 若女将",
        "売上とデータの両方でトップクラス！"
      );
    }

    // 3) DB に "初めて取った日" を保存（UPSERT）
    if (achievements.length > 0) {
      const values = [];
      const params = [];
      achievements.forEach((a, idx) => {
        const base = idx * 3;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
        params.push(sellerId, a.code, a.kind);
      });

      await pool.query(
        `
        insert into kids_achievements (seller_id, code, kind)
        values ${values.join(",")}
        on conflict (seller_id, code) do nothing
        `,
        params
      );
    }

    // 既に保存された first_earned_at も取得して返す
    const earnedRows = await pool.query(
      `select code, kind, first_earned_at
         from kids_achievements
        where seller_id = $1`,
      [sellerId]
    );

    const earnedMap = {};
    for (const r of earnedRows.rows) {
      earnedMap[r.code] = {
        first_earned_at: r.first_earned_at,
        kind: r.kind,
      };
    }

    const badgesWithDate = badges.map((b) => ({
      ...b,
      first_earned_at: earnedMap[b.code]?.first_earned_at || null,
    }));
    const titlesWithDate = titles.map((t) => ({
      ...t,
      first_earned_at: earnedMap[t.code]?.first_earned_at || null,
    }));

    res.json({
      stats: {
        totalOrders,
        ordersWithAttrs,
        cashOrders,
        cashlessOrders,
        inboundCount,
        childCustomerCount,
        dataScore,
      },
      badges: badgesWithDate,
      titles: titlesWithDate,
    });
  } catch (e) {
    console.error("/api/seller/kids-summary error", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 🟢 改善された管理API: Stripeサマリー取得 ======
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

// ====== 🆕 管理API: 取引削除（間違った明細の削除用・論理削除） ======
app.delete("/api/admin/orders/:orderId", requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: "order_id_required" });
    }

    // 注文の存在確認（削除済みも含む）
    const orderCheck = await pool.query(
      `select id, seller_id, amount, summary, status, deleted_at from orders where id = $1`,
      [orderId]
    );

    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ error: "order_not_found" });
    }

    const order = orderCheck.rows[0];

    // 既に削除済みの場合
    if (order.deleted_at) {
      return res.status(400).json({ 
        error: "already_deleted",
        message: "この取引は既に削除されています。"
      });
    }

    // 既に決済済み（paid）の場合は削除を制限（安全のため）
    if (order.status === "paid") {
      return res.status(400).json({ 
        error: "cannot_delete_paid_order",
        message: "決済済みの注文は削除できません。返金処理を行ってください。"
      });
    }

    // 🆕 論理削除（deleted_atを設定）
    await pool.query(
      `update orders set deleted_at = now(), updated_at = now() where id = $1`,
      [orderId]
    );

    audit("order_deleted_by_admin", { 
      orderId, 
      sellerId: order.seller_id, 
      amount: order.amount,
      summary: order.summary,
      deletedAt: new Date().toISOString(),
      ip: clientIp(req)
    });

    res.json({ 
      ok: true, 
      message: "取引を削除しました（論理削除）",
      deletedOrder: {
        id: order.id,
        sellerId: order.seller_id,
        amount: order.amount,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error("delete order error", e);
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
app.post("/api/analyze-item", upload.single("image"), async (req, res) => {
  try {
    const f = req.file;
    if (!f || !f.buffer) {
      return res.status(400).json({ error: "file_required", message: "画像ファイルが必要です" });
    }

    const ip = clientIp(req);
    if (!bumpAndAllow(`ai:${ip}`, RATE_LIMIT_MAX_WRITES)) {
      return res.status(429).json({ error: "rate_limited" });
    }

    console.log(`[AI分析] Processing image: ${f.originalname || 'unknown'} (${f.size} bytes)`);

    if (!openai) {
      return res.status(503).json({
        error: "openai_not_configured",
        message: "OPENAI_API_KEY環境変数が設定されていません"
      });
    }

    const imageBuffer = await sharp(f.buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log('[AI分析] 画像をOpenAIに送信中...');

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `この画像はフリーマーケットの商品写真です。以下の情報を分析して、必ずJSONだけを返してください。

1. 商品の簡潔で具体的な説明（summary）
   - 写真から読み取れる情報を使ってください
   - 例: 「ポケモンカードのセット」「青い子ども用Tシャツ」など
   - 「商品の説明（日本語、50文字以内）」のようなテンプレ文や、この指示文をそのまま書かないでください

2. 値札に書かれている価格（total）- 数字のみ（円）
   - 値札が見つからない、読めない場合は total を 0 にしてください

**レスポンスは、必ず次の形式のJSONだけにしてください：**

{
  "summary": "<商品の説明（日本語、50文字以内）>",
  "total": 価格の数字（整数）
}`
          },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }],
      max_completion_tokens: 300,
      temperature: 0.3
    });

    const aiText = response.choices[0]?.message?.content?.trim() || "{}";
    console.log('[AI分析] OpenAI応答:', aiText);

    let result;
    try {
      const cleanText = aiText
        .replace(/```json\n?/g, "")
        .replace(/```/g, "")
        .trim();
      result = JSON.parse(cleanText);
    } catch (parseErr) {
      result = { summary: "商品情報の取得に失敗しました", total: 0 };
    }

    // ★ ここからガード追加
    const BAD_SUMMARIES = [
      "商品の説明（日本語、50文字以内）",
      "商品の説明(日本語、50文字以内)",
      "<商品の説明（日本語、50文字以内）>",
      "フリーマーケットの商品写真です。",
    ];

    if (!result.summary || BAD_SUMMARIES.includes(result.summary.trim())) {
      result.summary = "商品"; // 少なくとも「商品」にはしておく
    }

    if (typeof result.total !== "number") {
      result.total = 0;
    }

    console.log('[AI分析] 最終結果:', result);
    audit("ai_analysis_success", { summary: result.summary, total: result.total, ip: clientIp(req) });

    res.json(result);

  } catch (error) {
    console.error('[AI分析] Error:', error);
    
    const statusCode = error?.response?.status || error?.status || 500;
    const message = error?.response?.data?.error?.message || error?.message || "AI解析に失敗しました";

    res.status(statusCode).json({
      error: "analysis_failed",
      message: message,
      summary: "商品情報の取得に失敗しました",
      total: 0
    });
  }
});

// ====== 一般API: 注文作成 ======
app.post("/api/pending/start", async (req, res) => {
  try {
    if (!isSameOrigin(req)) return res.status(403).json({ error: "forbidden_origin" });

    const { sellerId, amount, summary, imageData, aiAnalysis, paymentMethod, costAmount } = req.body || {};
    const amt = Number(amount);
    const costAmt = Number(costAmount) || 0;

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
      `insert into orders (seller_id, order_no, amount, summary, status, cost_amount)
       values ($1, $2, $3, $4, 'pending', $5)
       returning id, seller_id, order_no, amount, summary, status, created_at, cost_amount`,
      [sellerId, orderNo, amt, summary || null, costAmt]
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

    // 🆕 画像をS3に保存
    let imageUrl = null;

    if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
      try {
        // S3が無効ならエラーを発生させてフォールバック
        if (!s3) {
          throw new Error("s3_disabled");
        }

        // DataURL → バイナリ
        const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64, "base64");
        const key = `orders/${order.id}.jpg`;

        // S3にアップロード
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: "image/jpeg"
            // ACL は指定しない（バケット側のポリシーに任せる）
          })
        );

        imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || "ap-northeast-1"}.amazonaws.com/${key}`;

        // images テーブルへ保存
        await pool.query(
          `insert into images (order_id, kind, url, s3_key, content_type, file_size)
           values ($1, 'processed', $2, $3, 'image/jpeg', $4)`,
          [order.id, imageUrl, key, buffer.length]
        );

        audit("image_uploaded_to_s3", { orderId: order.id, key, size: buffer.length });
      } catch (s3Error) {
        console.error("S3 upload error", s3Error);
        // S3アップロード失敗時はフォールバックとしてDataURLを保存
        await pool.query(
          `insert into images (order_id, kind, url, content_type)
           values ($1, 'processed', $2, 'image/jpeg')`,
          [order.id, imageData]
        );
        imageUrl = imageData;
        audit("image_fallback_to_dataurl", { orderId: order.id, error: s3Error.message });
      }
    }

    // order_metadataに現金支払いフラグを保存
    const isCash = paymentMethod === "cash";
    await pool.query(
      `insert into order_metadata (order_id, is_cash)
       values ($1, $2)
       on conflict (order_id) do update set
         is_cash = excluded.is_cash,
         updated_at = now()`,
      [order.id, isCash]
    );

    audit("pending_order_created", { orderId: order.id, sellerId, orderNo, amount: amt, paymentMethod, isCash });

    const stripeAccountId = await resolveSellerAccountId(sellerId);
    const urls = buildSellerUrls(sellerId, stripeAccountId, order.id);

    res.json({
      orderId: order.id,
      orderNo: order.order_no,
      sellerId: order.seller_id,
      amount: order.amount,
      summary: order.summary,
      status: order.status,
      createdAt: order.created_at,
      checkoutUrl: urls.checkoutUrl,
      purchaseUrl: urls.sellerUrl,
      imageUrl: imageUrl // 🆕 S3 URLを返却
    });
  } catch (e) {
    console.error("pending/start error", e);
    res.status(500).json(sanitizeError(e));
  }
});

// ====== 💳 Stripe決済画面を作る命令 ======
// この命令がないと「支払う」ボタンが動かない！
// ====== 💳 Stripe決済画面を作る命令 ======
// この命令がないと「支払う」ボタンが動かない！
app.post("/api/photo-frame", upload.single("image"), async (req, res) => {
  try {
    const f = req.file;
    if (!f || !f.buffer) {
      return res.status(400).json({ 
        error: "file_required", 
        message: "画像ファイルが必要です" 
      });
    }

    // プロンプト（長さ制限）
    const rawPrompt =
      process.env.OPENAI_PROMPT_PHOTO_FRAME ||
      "Cute up this photo with a soft pink sakura frame. Keep the original person as they are.";
    const prompt = rawPrompt.slice(0, 950);

    console.log(`Processing image: ${f.originalname || 'unknown'} (${f.size} bytes)`);

    // 画像を RGBA PNG に変換
    const inputBuffer = await sharp(f.buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .png()
      .toBuffer();

    // File オブジェクト作成（Node.js互換性対応）
const FileConstructor = FileCtor || globalThis.File;
if (!FileConstructor) {
  return res.status(500).json({
    error: "file_constructor_unavailable",
    message: "File constructor is not available. Please upgrade to Node.js 20+ or install undici package."
  });
}
const file = new FileConstructor([inputBuffer], "image.png", { type: "image/png" });
    console.log("Sending to OpenAI Images Edit API...");

    if (!openai) {
      return res.status(503).json({
        error: "openai_not_configured",
        message: "OPENAI_API_KEY環境変数が設定されていません"
      });
    }

    // OpenAI 画像編集
    const result = await openai.images.edit({
      model: "dall-e-2",
      image: file,
      prompt,
      size: "1024x1024",
    });

    // レスポンス処理の安全性向上
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(502).json({
        error: "no_image_returned",
        message: "OpenAI APIから画像が返されませんでした",
      });
    }

    const buf = Buffer.from(b64, "base64");
    
    console.log("Image processing completed successfully");
    
    res.set("Content-Type", "image/png");
    return res.send(buf);

  } catch (error) {
    // ★ ここが「エラーハンドリングの強化」部分 ★
    console.error("Photo frame processing error:", error);

    // OpenAI APIエラーの詳細ログ
    if (error.response) {
      console.error("OpenAI API Error Details:", {
        status: error.response.status,
        data: error.response.data
      });
    }

    // クライアントへの適切なエラーレスポンス
    const statusFromOpenAI = error?.response?.status || error?.status;
    const status = typeof statusFromOpenAI === "number" ? statusFromOpenAI : 500;

    const messageFromOpenAI =
      error?.response?.data?.error?.message ||
      error?.message ||
      "画像の加工処理中にエラーが発生しました";

    return res.status(status).json({
      error: "edit_failed",
      message: messageFromOpenAI,
    });
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

// ベンチマーク関連のAPIは payments.js に移動しました

// ====== 静的ファイル配信 ======
app.use(express.static(path.join(__dirname, "public")));

// ====== 📄 HTMLファイルのルーティング追加 ======
import { existsSync, readFileSync } from 'fs';

function serveHtmlWithFallback(filename) {
  return (req, res) => {
    const publicPath = path.join(__dirname, "public", filename);
    if (existsSync(publicPath)) {
      console.log(`[HTML] ✓ ${filename} を配信しました`);
      return res.sendFile(publicPath);
    }

    const rootPath = path.join(__dirname, filename);
    if (existsSync(rootPath)) {
      console.log(`[HTML] ✓ ${filename} を配信しました（ルートから）`);
      return res.sendFile(rootPath);
    }

    console.error(`[HTML] ✗ ${filename} が見つかりません`);
    return res.status(404).json({ 
      error: "file_not_found", 
      message: `${filename} が見つかりません`
    });
  };
}

app.get("/success.html", serveHtmlWithFallback("success.html"));
app.get("/checkout.html", serveHtmlWithFallback("checkout.html"));
app.get("/cancel.html", serveHtmlWithFallback("cancel.html"));
app.get("/seller-purchase.html", serveHtmlWithFallback("seller-purchase.html"));
app.get("/seller-purchase-standard.html", serveHtmlWithFallback("seller-purchase-standard.html"));
app.get("/seller-dashboard.html", serveHtmlWithFallback("seller-dashboard.html"));
app.get("/admin-dashboard.html", serveHtmlWithFallback("admin-dashboard.html"));
app.get("/admin-payments.html", serveHtmlWithFallback("admin-payments.html"));

console.log("✅ HTMLルーティングを追加しました");

// ====== グローバルエラーハンドリングミドルウェア ======
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  // multerエラー（ファイルサイズ超過など）の処理
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "file_too_large",
        message: "ファイルサイズが上限(10MB)を超えています",
        maxBytes: 10 * 1024 * 1024
      });
    }
    return res.status(400).json({ 
      error: "upload_error", 
      message: error.message 
    });
  }

  // その他の予期せぬエラー
  return res.status(500).json(sanitizeError(error));
});

// ====== 404ハンドラー ======
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'endpoint_not_found', path: req.path });
  } else {
    const notFoundPath = path.join(__dirname, "public", "404.html");
    if (existsSync(notFoundPath)) {
      return res.status(404).sendFile(notFoundPath);
    } else {
      return res.status(404).send(`<!DOCTYPE html>
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - ページが見つかりません</title>
  <style>
    body {
      font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 6rem; margin: 0; }
    p { font-size: 1.5rem; margin: 1rem 0; }
    a {
      display: inline-block;
      margin-top: 2rem;
      padding: 1rem 2rem;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>お探しのページが見つかりませんでした</p>
    <a href="/">ホームに戻る</a>
  </div>
</body>
</html>`);
    }
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
