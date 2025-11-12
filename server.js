// server.js
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
const PENDING_TTL_MIN = Number(process.env.PENDING_TTL_MIN || 30); // 分（運用に合わせて短縮可）
const BASE_URL = (process.env.BASE_URL || "").replace(/\/+$/, "");

// ====== multer（10MB、拡張子ゆるめ、メモリ格納） ======
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ====== 簡易レート制限 & 同一オリジン検証 ======
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
const RATE_LIMIT_MAX_WRITES = 12;       // pending/start 上限
const RATE_LIMIT_MAX_CHECKOUT = 20;     // checkout/session 上限
const hits = new Map();                 // key -> [timestamps]

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
  if (!BASE_URL) return true; // 未設定ならスキップ
  const ref = req.get("referer") || "";
  return ref.startsWith(BASE_URL);
}
function audit(event, payload) {
  console.log(`[AUDIT] ${event}`, payload);
}

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

// ====== CORS / 以降のミドルウェア ======
app.use(cors());

// Stripe webhook は raw body 必須（json より前）
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    // TODO: 必要なイベント処理
    res.json({ received: true });
  } catch (err) {
    console.error("webhook error", err);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});

// それ以外のAPIは JSON パーサー使用
app.use(express.json({ limit: "1mb" }));

// ====== DB初期化（必要テーブル最低限） ======
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
      expires_at timestamptz not null,
      summary text
    );
    create index if not exists idx_pending_seller_time
      on pending_charges (seller_public_id, created_at desc);
  `);
  // 既存環境アップグレード用
  await pool.query(`alter table if exists pending_charges add column if not exists summary text;`);
  console.log("DB init done");
}
initDb().catch(e => console.error("DB init error", e));

// ====== 認証（管理API用） ======
function requireAdmin(req, res, next) {
  const t = req.header("x-admin-token");
  if (!t || t !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
}

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
      publicId, email || null, displayName || null, stripeAccountId || "", newToken, !!rotate
    ]);
    const row = rows[0];
    const sellerUrl = `${BASE_URL}/Seller-purchase.html?s=${encodeURIComponent(row.public_id)}&t=${encodeURIComponent(row.api_token)}`;
    const checkoutUrl = `${BASE_URL}/checkout.html?s=${encodeURIComponent(row.public_id)}${row.stripe_account_id ? `&acct=${encodeURIComponent(row.stripe_account_id)}` : ""}`;
    res.json({ publicId: row.public_id, stripeAccountId: row.stripe_account_id || null, apiToken: row.api_token, urls: { sellerUrl, checkoutUrl } });
  } catch (e) {
    console.error("issue_token", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== 出店者画面：候補金額（上位/TTL） ======
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

// ====== ペンディング登録（認証なし／最低限ガードあり） ======
// 出店者は金額のみでも登録OK。summaryは「任意」。
// summary が入力された場合のみ DB に保存し、あとで Stripe 明細へ反映。
app.post("/api/pending/start", async (req, res) => {
  try {
    if (!isSameOrigin(req)) return res.status(403).json({ error: "forbidden_origin" });

    const { sellerId, amount, summary } = req.body || {};
    const amt = Number(amount);
    if (!sellerId || !Number.isInteger(amt) || amt < 100 || amt > 1_000_000) {
      return res.status(400).json({ error: "invalid input" });
    }

    const ip = clientIp(req);
    if (!bumpAndAllow(`pend:ip:${ip}`, RATE_LIMIT_MAX_WRITES) ||
        !bumpAndAllow(`pend:seller:${sellerId}`, RATE_LIMIT_MAX_WRITES)) {
      return res.status(429).json({ error: "rate_limited" });
    }

    const ttlMin = PENDING_TTL_MIN;
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);
    const safeSummary = (summary || "").toString().slice(0, 250); // ← 任意・最大250文字に制限

    await pool.query(
      `insert into pending_charges (seller_public_id, amount, expires_at, summary)
       values ($1,$2,$3,$4)`,
      [sellerId, amt, expiresAt, safeSummary]
    );
    audit("pending_start", { ip, sellerId, amount: amt, ttl_min: ttlMin, summary: safeSummary });
    res.json({ ok: true, ttl_min: ttlMin });
  } catch (e) {
    console.error("pending/start", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== 購入者ページ：最新金額取得（summary 付き） ======
// summary は存在する場合のみ返る。空文字の場合は "" を返し、フロントで非表示可。
app.get("/api/price/latest", async (req, res) => {
  try {
    const sellerId = String(req.query.s || "");
    if (!sellerId) return res.status(400).json({ error: "sellerId required" });

    const { rows } = await pool.query(
      `select amount, summary
         from pending_charges
        where seller_public_id = $1
          and expires_at > now()
        order by created_at desc
        limit 1`,
      [sellerId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });

    res.json({ amount: rows[0].amount, summary: rows[0].summary || "" });
  } catch (e) {
    console.error("price/latest", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== Checkout セッション作成（複数明細 line_items 対応 + 旧フロー互換） ======
app.post("/api/checkout/session", async (req, res) => {
  try {
    if (!isSameOrigin(req)) return res.status(403).json({ error: "forbidden_origin" });

    const ip = clientIp(req);
    if (!bumpAndAllow(`checkout:${ip}`, RATE_LIMIT_MAX_CHECKOUT)) {
      return res.status(429).json({ error: "rate_limited" });
    }

    const {
      // 旧パラメータ（後方互換）
      amount, description, sellerId, latest, sellerAccountId: acctFromBody,
      // 新パラメータ（複数明細）
      items, total
    } = req.body || {};

    // 受け取りアカウント解決（従来通り）
    const sellerAccountId = await resolveSellerAccountId(sellerId, acctFromBody);
    if (!sellerAccountId) return res.status(400).json({ error: "sellerAccountId required" });

    let line_items = [];
    let amt = 0;
    let desc = (description || "").toString().trim().slice(0, 250);

    if (Array.isArray(items) && items.length > 0) {
      // 新：複数明細
      line_items = items
        .filter(i => Number.isInteger(i.unit_price) && i.unit_price > 0 && Number(i.qty) > 0)
        .map(i => ({
          quantity: Number(i.qty),
          price_data: {
            currency: "jpy",
            unit_amount: Number(i.unit_price),
            product_data: {
              name: (i.name || "商品").toString().slice(0, 120),
              description: `qty:${Number(i.qty)}`
            }
          }
        }));
      amt = Number.isInteger(total)
        ? total
        : line_items.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0);
    } else {
      // 旧：単一金額＋latest/summary
      let amtIn = Number(amount);
      let latestSummary = "";
      if (latest && (!Number.isInteger(amtIn) || amtIn < 100)) {
        if (!sellerId) return res.status(400).json({ error: "sellerId required for latest" });
        const r = await pool.query(
          `select amount, summary
             from pending_charges
            where seller_public_id = $1
              and expires_at > now()
            order by created_at desc
            limit 1`,
          [sellerId]
        );
        if (r.rows.length === 0) return res.status(400).json({ error: "latest_amount_not_found" });
        amtIn = Number(r.rows[0].amount);
        latestSummary = r.rows[0].summary || "";
      }
      if (!Number.isInteger(amtIn) || amtIn < 100 || amtIn > 1_000_000)
        return res.status(400).json({ error: "invalid amount" });

      if (!desc && latestSummary) desc = latestSummary.toString().slice(0, 250);

      line_items = [{
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: amtIn,
          product_data: {
            name: "お支払い",
            ...(desc ? { description: desc } : {}),
            metadata: desc ? { summary: desc } : {}
          }
        }
      }];
      amt = amtIn;
    }

    const fee = Math.round(amt * 0.10);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "jpy",
      line_items,
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: sellerAccountId },
        ...(desc ? { description: desc } : {}),
        metadata: {
          sellerId: sellerId || "",
          sellerAccountId,
          amount: String(amt),
          latest: String(!!latest),
          ...(desc ? { summary: desc } : {})
        }
      },
      success_url: `${BASE_URL}/checkout/success.html?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/checkout/cancel.html`,
      customer_creation: "if_required"
    });

    res.json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("create checkout session", e);
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

// ====== AI画像解析（画像→「商品名・数量・単価・合計」JSON） ======
// 出店者が画像から summary を作るための補助API（任意）
// ★ ここがパッチその1
app.post("/api/analyze-item", upload.any(), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: "OPENAI_API_KEY not set" });

    const f = (req.files && req.files[0]) || null;
    if (!f || !f.buffer)
      return res.status(400).json({ error: "file_required" });

    console.log("analyze-item received:", {
      name: f.originalname, size: f.size, mimetype: f.mimetype
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
    const dataUrl = `data:${mime};base64,${f.buffer.toString("base64")}`;

    // 出力フォーマット固定プロンプト（金額必須JSON）
    const prompt = `
画像に写る販売商品の「品名・数量・単価（円）・小計（円）・合計（円）」を抽出して、
次の JSON だけを返してください。説明文は禁止。

{
  "items":[
    {"name":"<商品名>","qty":<整数>,"unit_price":<整数|null>,"subtotal":<整数|null>}
  ],
  "total":<整数|null>
}

厳守ルール：
- 金額は半角数字のみ（例: 1500）。円や¥は付けない。
- 数量が不明なら 1。
- 単価が不明なら null。推測で埋めない。
- 余計な文や説明は禁止。
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ]
    });

    let txt = (completion.choices?.[0]?.message?.content || "").trim();

    // 解析 & 安全補完
    let parsed;
    try { parsed = JSON.parse(txt); } catch { parsed = { items: [], total: null }; }

    const items = (parsed.items || []).map(i => ({
      name: (i?.name || "商品").toString().slice(0, 120),
      qty: Number(i?.qty) || 1,
      unit_price: Number.isInteger(i?.unit_price) ? Number(i.unit_price) : null,
      subtotal: Number.isInteger(i?.subtotal) ? Number(i.subtotal) : null
    }));

    for (const it of items) {
      if (it.unit_price != null && it.subtotal == null) it.subtotal = it.unit_price * it.qty;
      if (it.unit_price == null && it.subtotal != null && it.qty > 0)
        it.unit_price = Math.round(it.subtotal / it.qty);
    }

    let total = Number.isInteger(parsed.total) ? Number(parsed.total) : null;
    if (!total) {
      const sum = items.reduce((s, it) => s + (it.subtotal || 0), 0);
      total = sum > 0 ? sum : null;
    }

    const summary = items
      .map(it => `${it.name} × ${it.unit_price ?? "?"}円 ×${it.qty}`)
      .join("\n");

    if (!items.length && !total) return res.status(422).json({ error: "empty_response" });
    res.json({ items, total, summary });
  } catch (e) {
    console.error("analyze-item error", e?.response?.data || e);
    if (e?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "file_too_large" });
    res.status(500).json({ error: "internal_error", detail: e?.response?.data?.error?.message || e.message });
  }
});

// ====== ヘルス / 404 / 静的配信 ======
app.get("/api/ping", (req, res) => res.json({ ok: true }));
app.use("/api", (req, res) => res.status(404).json({ error: "not_found", path: req.path }));
app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fleapay-lite running :${port}`));
