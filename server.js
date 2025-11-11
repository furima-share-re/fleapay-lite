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
const PENDING_TTL_MIN = Number(process.env.PENDING_TTL_MIN || 30);

// ====== multer（10MBまで、全拡張子許可） ======
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
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
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function requireAdmin(req, res, next) {
  const t = req.header("x-admin-token");
  if (!t || t !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
}
async function requireSellerAuth(req, res, next) {
  const token = req.header("x-seller-token") || "";
  const { sellerId } = req.body || {};
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

// ====== Stripe webhook ======
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    res.json({ received: true });
  } catch (err) {
    console.error("webhook error", err);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});

// ====== DB初期化 ======
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
  `);
  console.log("DB init done");
}
initDb().catch(e => console.error("DB init error", e));

// ====== 管理API ======
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
    const sellerUrl = `${base}/Seller-purchase.html?s=${encodeURIComponent(row.public_id)}&t=${encodeURIComponent(row.api_token)}`;
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

// ====== ペンディング登録 ======
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
    res.json({ pending, ttl_min: PENDING_TTL_MIN });
  } catch (e) {
    console.error("purchase/options", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== AI画像解析 ======
app.post("/api/analyze-item", upload.any(), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: "OPENAI_API_KEY not set" });

    const f = (req.files && req.files[0]) || null;
    if (!f || !f.buffer)
      return res.status(400).json({ error: "file_required" });

    console.log("analyze-item received:", {
      name: f.originalname,
      size: f.size,
      mimetype: f.mimetype
    });

    // MIME推定
    let mime = f.mimetype;
    const name = (f.originalname || "").toLowerCase();
    if (!mime || mime === "application/octet-stream") {
      if (name.endsWith(".png")) mime = "image/png";
      else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) mime = "image/jpeg";
      else if (name.endsWith(".webp")) mime = "image/webp";
      else if (name.endsWith(".heic")) mime = "image/heic";
      else mime = "image/jpeg";
    }

    const base64 = f.buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この画像に写る『販売商品』の内容を日本語で50〜120文字で簡潔に説明してください。数量・状態（新品/中古/未開封 など）が分かる場合は含め、宣伝表現は避けてください。"
            },
            {
              type: "image_url",
              image_url: { url: dataUrl } // ← 修正版
            }
          ]
        }
      ]
    });

    const summary = (completion.choices?.[0]?.message?.content || "").trim().slice(0, 200);
    if (!summary) return res.status(422).json({ error: "empty_response" });
    res.json({ summary });

  } catch (e) {
    console.error("analyze-item error", e);
    if (e?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "file_too_large" });
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== APIヘルス & 静的ファイル ======
app.get("/api/ping", (req, res) => res.json({ ok: true }));
app.use("/api", (req, res) => res.status(404).json({ error: "not_found" }));
app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fleapay-lite running :${port}`));
