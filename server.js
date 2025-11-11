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
const PENDING_TTL_MIN = Number(process.env.PENDING_TTL_MIN || 30); // 購入者ページ表記と合わせて30分

// ====== アップロード: 10MB / mimetype緩和 / メモリ格納 ======
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    // ブラウザや端末で mimetype が崩れるケースを許容
    const byMime = /^image\/(png|jpe?g|webp|heic|heif|gif|bmp|tiff?)$/i.test(file.mimetype);
    const byName = /\.(png|jpe?g|jpg|webp|heic|heif|gif|bmp|tif?f)$/i.test(file.originalname || "");
    const ok = byMime || byName || file.mimetype === "application/octet-stream";
    cb(ok ? null : new Error("unsupported_file_type"));
  }
});

// ====== util ======
function genSellerToken() {
  return "sk_seller_" + crypto.randomBytes(24).toString("hex");
}
async function resolveSellerAccountId(sellerId, provided) {
  if (provided) return provided;
  if (!sellerId) return null;
  const r = await pool.query(
    `select stripe_account_id from sellers where public_id=$1 limit 1`,
    [sellerId]
  );
  return r.rows[0]?.stripe_account_id || null;
}

// ====== middlewares ======
function requireAdmin(req, res, next) {
  const t = req.header("x-admin-token");
  if (!t || t !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
}
async function requireSellerAuth(req, res, next) {
  const token = req.header("x-seller-token") || "";
  const { sellerId } = req.body || {};
  // 後方互換（グローバルトークン）
  if (token && process.env.SELLER_API_TOKEN && token === process.env.SELLER_API_TOKEN) return next();
  if (!sellerId || !token) return res.status(401).json({ error: "unauthorized" });
  try {
    const { rows } = await pool.query(
      `select 1 from sellers where public_id=$1 and api_token=$2 limit 1`,
      [sellerId, token]
    );
    if (rows.length === 0) return res.status(401).json({ error: "unauthorized" });
    next();
  } catch (e) {
    console.error("auth error", e);
    res.status(500).json({ error: "internal_error" });
  }
}

app.use(cors());

// ====== Stripe webhook (raw) ======
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    // TODO: 必要に応じてイベント処理
    res.json({ received: true });
  } catch (err) {
    console.error("webhook error", err);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});

// 以降は JSON パーサー
app.use(express.json({ limit: "1mb" }));

// ====== DB init ======
async function initDb() {
  await pool.query(`
    create extension if not exists pgcrypto;

    create table if not exists sellers (
      id uuid primary key default gen_random_uuid(),
      public_id text not null unique,
      stripe_account_id text not null unique,
      email text,
      display_name text,
      charges_enabled boolean default false,
      payouts_enabled boolean default false,
      fee_override_pct numeric(5,2),
      api_token text unique,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create index if not exists sellers_public_id_idx on sellers(public_id);

    create table if not exists pending_charges (
      id uuid primary key default gen_random_uuid(),
      seller_public_id text not null,
      amount integer not null,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null
    );
    create index if not exists idx_pending_seller_time
      on pending_charges (seller_public_id, created_at desc);

    create table if not exists payments (
      id uuid primary key default gen_random_uuid(),
      payment_intent_id text not null unique,
      seller_public_id text not null,
      seller_account_id text not null,
      amount integer not null,
      platform_fee integer not null,
      status text not null,
      created_at timestamptz default now()
    );
  `);
  console.log("DB init done");
}
initDb().catch(e => console.error("DB init error", e));

// ====== 管理API：出店者トークン発行/更新 ======
app.post("/api/admin/sellers/issue_token", requireAdmin, async (req, res) => {
  const { publicId, email, displayName, stripeAccountId, rotate } = req.body || {};
  if (!publicId) return res.status(400).json({ error: "publicId required" });

  const newToken = genSellerToken();
  try {
    const q = `
      insert into sellers (public_id, email, display_name, stripe_account_id, api_token)
      values ($1, $2, $3, $4, $5)
      on conflict (public_id) do update set
        email=coalesce(excluded.email, sellers.email),
        display_name=coalesce(excluded.display_name, sellers.display_name),
        stripe_account_id=case when excluded.stripe_account_id is null or excluded.stripe_account_id='' then sellers.stripe_account_id else excluded.stripe_account_id end,
        api_token=case when $6::bool is true then excluded.api_token else sellers.api_token end,
        updated_at=now()
      returning public_id, stripe_account_id, api_token
    `;
    const { rows } = await pool.query(q, [
      publicId,
      email || null,
      displayName || null,
      stripeAccountId || "",
      newToken,
      !!rotate,
    ]);
    const row = rows[0];

    const base = process.env.BASE_URL?.replace(/\/+$/, "") || "";
    const sellerUrl = `${base}/seller.html?s=${encodeURIComponent(row.public_id)}&t=${encodeURIComponent(row.api_token)}`;
    const checkoutUrl = `${base}/checkout.html?s=${encodeURIComponent(row.public_id)}${row.stripe_account_id ? `&acct=${encodeURIComponent(row.stripe_account_id)}` : ""}`;

    res.json({
      publicId: row.public_id,
      stripeAccountId: row.stripe_account_id || null,
      apiToken: row.api_token,
      urls: { sellerUrl, checkoutUrl }
    });
  } catch (e) {
    console.error("issue_token", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// 解決用（確認）
app.get("/api/sellers/resolve", requireAdmin, async (req, res) => {
  const s = String(req.query.s || "");
  if (!s) return res.status(400).json({ error: "sellerId required" });
  const { rows } = await pool.query(
    `select public_id, stripe_account_id from sellers where public_id=$1 limit 1`, [s]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });
  res.json(rows[0]);
});

// ====== ① 出店者：金額登録（ペンディング） ======
app.post("/api/pending/start", requireSellerAuth, async (req, res) => {
  try {
    const { sellerId, amount } = req.body || {};
    const amt = Number(amount);
    if (!sellerId || !Number.isInteger(amt) || amt < 100 || amt > 1_000_000)
      return res.status(400).json({ error: "invalid input" });

    const expiresAt = new Date(Date.now() + PENDING_TTL_MIN * 60 * 1000);
    await pool.query(
      `insert into pending_charges (seller_public_id, amount, expires_at) values ($1,$2,$3)`,
      [sellerId, amt, expiresAt]
    );
    res.json({ ok: true, ttl_min: PENDING_TTL_MIN });
  } catch (e) {
    console.error("pending/start", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// 出店者画面用：候補一覧（上位3 & TTL）
app.get("/api/purchase/options", async (req, res) => {
  try {
    const sellerId = req.query.s;
    if (!sellerId) return res.status(400).json({ error: "sellerId required" });
    const { rows } = await pool.query(
      `select amount from pending_charges
       where seller_public_id=$1 and expires_at > now()
       order by created_at desc limit 20`,
      [sellerId]
    );
    const seen = new Set(); const pending = [];
    for (const r of rows) {
      if (seen.has(r.amount)) continue;
      seen.add(r.amount);
      pending.push(r.amount);
      if (pending.length >= 3) break;
    }
    res.json({ pending, presets: [500, 1000, 1500], ttl_min: PENDING_TTL_MIN });
  } catch (e) {
    console.error("purchase/options", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== ② 購入者：最新金額取得（固定QRで開くページ用） ======
app.get("/api/price/latest", async (req, res) => {
  try {
    const sellerId = String(req.query.s || "");
    if (!sellerId) return res.status(400).json({ error: "sellerId required" });

    const { rows } = await pool.query(
      `select amount
         from pending_charges
        where seller_public_id = $1
          and expires_at > now()
        order by created_at desc
        limit 1`,
      [sellerId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });

    res.json({ amount: rows[0].amount, summary: "" });
  } catch (e) {
    console.error("price/latest", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== ③ Checkout セッション作成（最新金額 or 指定金額） ======
app.post("/api/checkout/session", async (req, res) => {
  try {
    const { amount, sellerAccountId: acctFromBody, description, sellerId, latest } = req.body || {};

    // latest=true かつ amount未指定なら DB から解決
    let amt = Number(amount);
    if (latest && (!Number.isInteger(amt) || amt < 100)) {
      if (!sellerId) return res.status(400).json({ error: "sellerId required for latest" });
      const r = await pool.query(
        `select amount
           from pending_charges
          where seller_public_id = $1
            and expires_at > now()
          order by created_at desc
          limit 1`,
        [sellerId]
      );
      if (r.rows.length === 0) return res.status(400).json({ error: "latest_amount_not_found" });
      amt = Number(r.rows[0].amount);
    }
    if (!Number.isInteger(amt) || amt < 100 || amt > 1_000_000)
      return res.status(400).json({ error: "invalid amount" });

    // acct 自動解決
    const sellerAccountId = await resolveSellerAccountId(sellerId, acctFromBody);
    if (!sellerAccountId) return res.status(400).json({ error: "sellerAccountId required" });

    const fee = Math.round(amt * 0.10);
    const base = process.env.BASE_URL;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "jpy",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: amt,
          product_data: { name: description || "お支払い" }
        }
      }],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: sellerAccountId },
        metadata: { sellerAccountId, amount: String(amt), sellerId: sellerId || "", latest: String(!!latest) }
      },
      success_url: `${base}/checkout/success.html?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout/cancel.html`,
      customer_creation: "if_required"
    });

    res.json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("create checkout session", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// 既存：登録→Checkout作成を1発で（出店者画面向け）
const registerAndCheckoutPaths = [
  "/api/register-and-create-qr",
  "/api/register_and_create_qr",
  "/api/register-and-checkout",
  "/api/register_checkout",
  "/api/flows/pending-and-checkout"
];
app.post(registerAndCheckoutPaths, requireSellerAuth, async (req, res) => {
  try {
    const { sellerId, amount, sellerAccountId: acctFromBody, description } = req.body || {};
    const amt = Number(amount);
    if (!sellerId || !Number.isInteger(amt) || amt < 100 || amt > 1_000_000)
      return res.status(400).json({ error: "invalid input" });

    const sellerAccountId = await resolveSellerAccountId(sellerId, acctFromBody);
    if (!sellerAccountId) return res.status(400).json({ error: "sellerAccountId required" });

    const expiresAt = new Date(Date.now() + PENDING_TTL_MIN * 60 * 1000);
    await pool.query(
      `insert into pending_charges (seller_public_id, amount, expires_at) values ($1,$2,$3)`,
      [sellerId, amt, expiresAt]
    );

    const fee = Math.round(amt * 0.10);
    const base = process.env.BASE_URL;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "jpy",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: amt,
          product_data: { name: description || "お支払い" }
        }
      }],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: sellerAccountId },
        metadata: { sellerId, sellerAccountId, amount: String(amt) }
      },
      success_url: `${base}/checkout/success.html?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout/cancel.html`,
      customer_creation: "if_required"
    });

    res.json({ ok: true, url: session.url, id: session.id, ttl_min: PENDING_TTL_MIN });
  } catch (e) {
    console.error("register-and-checkout", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== NEW: AI画像解析（商品写真→短い日本語説明） ======
app.post("/api/analyze-item", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY not set" });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "file_required" });
    }

    // 受領ログ（Render Logsで確認可能）
    console.log("analyze-item received:", {
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // mimetype が octet-stream の場合は拡張子から推測
    const mime = (() => {
      if (req.file.mimetype && req.file.mimetype !== "application/octet-stream") return req.file.mimetype;
      const name = (req.file.originalname || "").toLowerCase();
      if (name.endsWith(".png")) return "image/png";
      if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
      if (name.endsWith(".webp")) return "image/webp";
      if (name.endsWith(".heic")) return "image/heic";
      if (name.endsWith(".heif")) return "image/heif";
      if (name.endsWith(".gif")) return "image/gif";
      if (name.endsWith(".bmp")) return "image/bmp";
      if (name.endsWith(".tif") || name.endsWith(".tiff")) return "image/tiff";
      return "image/jpeg";
    })();

    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    // 50〜120文字程度、数量・状態を含む要約
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "この画像に写る『販売商品』の内容を日本語で50〜120文字で簡潔に説明してください。数量・状態（新品/中古/未開封 など）が分かる場合は含め、宣伝表現は避けてください。" },
            { type: "image_url", image_url: dataUrl }
          ]
        }
      ]
    });

    const summary = (completion.choices?.[0]?.message?.content || "").trim().slice(0, 200);
    if (!summary) return res.status(422).json({ error: "empty_response" });

    res.json({ summary });
  } catch (e) {
    console.error("analyze-item error", e);
    if (e?.message === "unsupported_file_type") {
      return res.status(400).json({ error: "unsupported_file_type" });
    }
    if (e?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "file_too_large" });
    }
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== APIヘルス/404 JSON化 ======
app.get("/api/ping", (req, res) => res.json({ ok: true }));
app.use("/api", (req, res) => res.status(404).json({ error: "not_found", path: req.path }));

// ====== 静的ファイル（購入者ページなど）は最後に配信 ======
app.use(express.static(path.join(__dirname, "public")));

// ====== 共通エラーハンドラ ======
app.use((err, req, res, next) => {
  console.error("unhandled", err);
  res.status(err.status || 500).json({ error: err.message || "internal_error" });
});

// ====== 起動 ======
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fleapay-lite running :${port}`));
