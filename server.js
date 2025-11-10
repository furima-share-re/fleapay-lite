import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---- DB 初期化（起動時1回）----
async function initDb() {
  await pool.query(`
    create extension if not exists pgcrypto;

    create table if not exists sellers (
      id uuid primary key default gen_random_uuid(),
      public_id text not null unique,
      stripe_account_id text not null unique,
      email text not null,
      display_name text,
      charges_enabled boolean default false,
      payouts_enabled boolean default false,
      fee_override_pct numeric(5,2),
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
    create index if not exists payments_seller_idx on payments(seller_public_id, created_at);
  `);
  console.log("DB init done");
}
initDb().catch(e => console.error("DB init error", e));

// ---- 認証（出店者 API 用）----
function requireSellerAuth(req, res, next) {
  const token = req.header("x-seller-token");
  if (!token || token !== process.env.SELLER_API_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// ---- 先に CORS だけ許可（raw を壊さない）----
app.use(cors());

// ---- Stripe webhook は raw を最優先で定義 ----
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "payment_intent.succeeded":
        // TODO: 決済成功の保存など
        break;
      case "payment_intent.payment_failed":
        // TODO: 失敗ハンドリング
        break;
      case "account.updated":
        // TODO: sellers の charges_enabled/payouts_enabled 反映
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error("webhook error", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// ---- ここから先は JSON パーサーを有効化（webhook 以外用）----
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PENDING_TTL_MIN = Number(process.env.PENDING_TTL_MIN || 5);

// ---- Pending 金額の登録 ----
app.post("/api/pending/start", requireSellerAuth, async (req, res) => {
  try {
    const { sellerId, amount } = req.body || {};
    const amt = Number(amount);
    if (!sellerId || !Number.isInteger(amt) || amt < 100 || amt > 1_000_000) {
      return res.status(400).json({ error: "invalid input" });
    }
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

// ---- 購入画面の候補金額取得 ----
app.get("/api/purchase/options", async (req, res) => {
  try {
    const sellerId = req.query.s;
    if (!sellerId) return res.status(400).json({ error: "sellerId required" });

    const { rows } = await pool.query(
      `select amount from pending_charges
       where seller_public_id=$1 and expires_at > now()
       order by created_at desc
       limit 20`,
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

// ---- 出店者アカウント作成（Connect Express）----
app.post("/api/sellers", async (req, res) => {
  const { email } = req.body;
  const account = await stripe.accounts.create({
    type: "express",
    country: "JP",
    email,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } }
  });
  res.json({ accountId: account.id });
});

// ---- KYC 用リンク ----
app.post("/api/sellers/onboarding_link", async (req, res) => {
  const { accountId } = req.body;
  const base = process.env.BASE_URL;
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${base}/onboarding/refresh.html`,
    return_url: `${base}/onboarding/complete.html`
  });
  res.json({ url: link.url });
});

// ---- 決済（10% 税込固定のプラットフォーム手数料）----
app.post("/api/payments", async (req, res) => {
  const { amount, sellerAccountId, description } = req.body;
  const fee = Math.round(amount * 0.10);
  const pi = await stripe.paymentIntents.create({
    amount,
    currency: "jpy",
    description,
    payment_method_types: ["card"],
    application_fee_amount: fee,
    transfer_data: { destination: sellerAccountId },
    metadata: { sellerAccountId }
  });
  res.json({
    clientSecret: pi.client_secret,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// ---- 運営用：アカウント状態 ----
app.post("/api/sellers/status", async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: "accountId is required" });
  try {
    const acct = await stripe.accounts.retrieve(accountId);
    res.json({
      accountId,
      charges_enabled: acct.charges_enabled,
      payouts_enabled: acct.payouts_enabled,
      requirements_due: acct.requirements?.currently_due || []
    });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ---- 運営用：Express ダッシュボードのログインリンク ----
app.post("/api/sellers/login_link", async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: "accountId is required" });
  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    res.json({ url: link.url });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ---- 起動 ----
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fleapay-lite running :${port}`));
