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

// 出店者用URL(販売画面/購入画面/ダッシュボード)を一括生成
function buildSellerUrls(publicId, stripeAccountId) {
  const base = (BASE_URL || "").replace(/\/+$/, "");
  const sellerUrl = `${base}/seller-purchase.html?s=${encodeURIComponent(publicId)}`;
  const checkoutUrl = `${base}/checkout.html?s=${encodeURIComponent(publicId)}${
    stripeAccountId ? `&acct=${encodeURIComponent(stripeAccountId)}` : ""
  }`;
  const dashboardUrl = `${base}/seller-dashboard.html?s=${encodeURIComponent(publicId)}`;
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

// ====== CORS / 以降のミドルウェア ======
app.use(cors());

// Stripe webhook は raw body 必須(json より前) ======
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
      if (!sellerId) {
        console.warn("pi.succeeded without sellerId, skip", pi.id);
      } else {
        const amount = typeof pi.amount_received === "number" ? pi.amount_received :
                       typeof pi.amount === "number" ? pi.amount : 0;
        const currency = pi.currency || "jpy";
        const summary = pi.metadata?.summary || pi.description || "";
        const chargeId = pi.latest_charge || null;
        const created = pi.created ? new Date(pi.created * 1000) : new Date();

        await pool.query(
          `
          insert into payments (
            seller_public_id, stripe_pi_id, stripe_charge_id,
            amount, net_amount, currency, status, summary, raw, created_at, updated_at
          ) values (
            $1,$2,$3,$4,$4,$5,$6,$7,$8,$9,now()
          )
          on conflict (stripe_pi_id) do update set
            seller_public_id = excluded.seller_public_id,
            stripe_charge_id = excluded.stripe_charge_id,
            amount = excluded.amount,
            net_amount = excluded.net_amount,
            currency = excluded.currency,
            status = excluded.status,
            summary = coalesce(excluded.summary, payments.summary),
            raw = excluded.raw,
            created_at = excluded.created_at,
            updated_at = now()
          `,
          [
            sellerId,
            pi.id,
            chargeId,
            amount,
            currency,
            "succeeded",
            summary,
            event,
            created
          ]
        );
        audit("pi_succeeded", { sellerId, pi: pi.id, amount });
      }
    }

    // --- 返金:charge.refunded / charge.refund.updated ---
    if (t === "charge.refunded" || t === "charge.refund.updated") {
      const ch = event.data.object;
      const piId = ch.payment_intent || null;
      const amount = typeof ch.amount === "number" ? ch.amount : 0;
      const refunded = typeof ch.amount_refunded === "number" ? ch.amount_refunded : 0;
      const net = Math.max(amount - refunded, 0);
      const status = refunded >= amount ? "refunded" : "partially_refunded";

      if (piId) {
        const r = await pool.query(
          `update payments
             set amount=$2,
                 net_amount=$3,
                 status=$4,
                 stripe_charge_id=$5,
                 raw=$6,
                 updated_at=now()
           where stripe_pi_id=$1
           returning seller_public_id`,
          [piId, amount, net, status, ch.id, event]
        );
        if (r.rowCount === 0) {
          console.warn("refund for unknown pi, consider backfill", piId);
        } else {
          audit("charge_refund", { pi: piId, amount, refunded, net, status });
        }
      } else {
        console.warn("charge refund without payment_intent id", ch.id);
      }
    }

    // --- チャージバック発生:charge.dispute.created ---
    if (t === "charge.dispute.created") {
      const dispute = event.data.object;
      const chargeId = dispute.charge || null;
      if (chargeId) {
        const r = await pool.query(
          `update payments
             set status='dispute_pending',
                 net_amount=0,
                 raw=$2,
                 updated_at=now()
           where stripe_charge_id=$1
           returning seller_public_id, stripe_pi_id`,
          [chargeId, event]
        );
        if (r.rowCount === 0) {
          console.warn("dispute.created: no payment row for charge", chargeId);
        } else {
          const row = r.rows[0];
          audit("dispute_created", { sellerId: row.seller_public_id, pi: row.stripe_pi_id });
        }
      }
    }

    // --- チャージバッククローズ:charge.dispute.closed ---
    if (t === "charge.dispute.closed") {
      const dispute = event.data.object;
      const chargeId = dispute.charge || null;
      const outcome = dispute.status; // 'won' | 'lost' | 'warning_closed' 等
      if (chargeId) {
        const newStatus = outcome === "won" ? "dispute_won" : "dispute_lost";
        const r = await pool.query(
          `update payments
             set status=$2,
                 net_amount = case when $2='dispute_lost' then 0 else amount end,
                 raw=$3,
                 updated_at=now()
           where stripe_charge_id=$1
           returning seller_public_id, stripe_pi_id`,
          [chargeId, newStatus, event]
        );
        if (r.rowCount === 0) {
          console.warn("dispute.closed: no payment row for charge", chargeId);
        } else {
          const row = r.rows[0];
          audit("dispute_closed", { sellerId: row.seller_public_id, pi: row.stripe_pi_id, status: newStatus });
        }
      }
    }

  } catch (e) {
    console.error("webhook handler error", e);
    // ここで500返すとStripeがリトライするので、ログだけでOKにするかは運用次第。
  }

  res.json({ received: true });
});

// それ以外のAPIは JSON パーサー使用
app.use(express.json({ limit: "1mb" }));

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
      expires_at timestamptz not null,
      summary text
    );
    create index if not exists idx_pending_seller_time
      on pending_charges (seller_public_id, created_at desc);

    create table if not exists payments (
      id uuid primary key default gen_random_uuid(),
      seller_public_id text not null,
      stripe_pi_id text not null unique,
      stripe_charge_id text,
      amount integer not null,
      net_amount integer not null,
      currency text not null,
      status text not null,
      summary text,
      raw jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists payments_seller_time_idx
      on payments (seller_public_id, created_at desc);
  `);
  // 古い環境向けのカラム追加(安全に)。
  await pool.query(`alter table if exists pending_charges add column if not exists summary text;`);
  console.log("DB init done");
}
initDb().catch(e => console.error("DB init error", e));

// ====== 認証(管理API用) ======
function requireAdmin(req, res, next) {
  const t = req.header("x-admin-token");
  if (!t || t !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
}

// ====== 管理API ======
// セキュリティ観点から、URLにはトークンを出さない(?t=sk_seller_... をやめる)
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

    // 出店者・購入者向けURLからはトークンを排除(public_id のみ)
    const urls = buildSellerUrls(row.public_id, row.stripe_account_id || null);

    res.json({
      publicId: row.public_id,
      stripeAccountId: row.stripe_account_id || null,
      apiToken: row.api_token, // 管理者用。フロントURLには出さない。
      urls
    });
  } catch (e) {
    console.error("issue_token", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== 出店者画面:候補金額 ======
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

// ====== ペンディング登録 ======
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
    const safeSummary = (summary || "").toString().slice(0, 250);

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

// ====== 購入者ページ:最新金額 ======
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

// ====== Checkout セッション作成(複数明細対応 + 旧互換) ======
app.post("/api/checkout/session", async (req, res) => {
  try {
    if (!isSameOrigin(req)) return res.status(403).json({ error: "forbidden_origin" });

    const ip = clientIp(req);
    if (!bumpAndAllow(`checkout:${ip}`, RATE_LIMIT_MAX_CHECKOUT)) {
      return res.status(429).json({ error: "rate_limited" });
    }

    const {
      amount, description, sellerId, latest, sellerAccountId: acctFromBody,
      items, total
    } = req.body || {};

    const sellerAccountId = await resolveSellerAccountId(sellerId, acctFromBody);
    if (!sellerAccountId) return res.status(400).json({ error: "sellerAccountId required" });

    let line_items = [];
    let amt = 0;
    let desc = (description || "").toString().trim().slice(0, 250);

    if (Array.isArray(items) && items.length > 0) {
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

// ====== 出店者ダッシュボード用:売上サマリーAPI ======
app.get("/api/seller/summary", async (req, res) => {
  try {
    const sellerId = String(req.query.s || "");
    if (!sellerId) return res.status(400).json({ error: "sellerId required" });

    const sellerRow = await pool.query(
      `select public_id, display_name, stripe_account_id
         from sellers
        where public_id=$1
        limit 1`,
      [sellerId]
    );
    const displayName = sellerRow.rows[0]?.display_name || sellerId;
    const stripeAccountId = sellerRow.rows[0]?.stripe_account_id || null;
    const urls = buildSellerUrls(sellerId, stripeAccountId);

    const { todayStart, tomorrowStart, yesterdayStart } = jstDayBounds();

    const qDay = `
      select
        coalesce(sum(amount),0) as gross,
        coalesce(sum(net_amount),0) as net,
        count(*) as count
      from payments
      where seller_public_id=$1
        and created_at >= $2
        and created_at < $3
    `;

    const [todayRes, yestRes, totalRes, firstRes, topItemsRes, recentRes] = await Promise.all([
      pool.query(qDay, [sellerId, todayStart, tomorrowStart]),
      pool.query(qDay, [sellerId, yesterdayStart, todayStart]),
      pool.query(
        `select
            coalesce(sum(amount),0) as gross,
            coalesce(sum(net_amount),0) as net,
            count(*) as count
         from payments where seller_public_id=$1`,
        [sellerId]
      ),
      pool.query(
        `select min(created_at) as first_at
           from payments
          where seller_public_id=$1`,
        [sellerId]
      ),
      pool.query(
        `select
            split_part(coalesce(summary,''), E'\\n', 1) as item_key,
            coalesce(sum(net_amount),0) as net,
            count(*) as count
         from payments
         where seller_public_id=$1
         group by item_key
         order by net desc
         limit 5`,
        [sellerId]
      ),
      pool.query(
        `select stripe_pi_id, amount, net_amount, currency, status, summary, created_at
           from payments
          where seller_public_id=$1
          order by created_at desc
          limit 20`,
        [sellerId]
      )
    ]);

    const rowToday = todayRes.rows[0] || { gross:0, net:0, count:0 };
    const rowYest  = yestRes.rows[0]  || { gross:0, net:0, count:0 };
    const rowTotal = totalRes.rows[0] || { gross:0, net:0, count:0 };

    const todayCount = Number(rowToday.count || 0);
    const yestCount  = Number(rowYest.count || 0);
    const totalCount = Number(rowTotal.count || 0);

    const todayNet  = Number(rowToday.net || 0);
    const todayGross= Number(rowToday.gross || 0);
    const yestNet   = Number(rowYest.net || 0);
    const yestGross = Number(rowYest.grass || 0);
    const totalNet  = Number(rowTotal.net || 0);
    const totalGross= Number(rowTotal.gross || 0);

    const firstAt = firstRes.rows[0]?.first_at || null;

    const topItems = topItemsRes.rows.map(r => ({
      key: r.item_key || "(不明)",
      net: Number(r.net || 0),
      count: Number(r.count || 0)
    }));

    const recent = recentRes.rows.map(r => ({
      id: r.stripe_pi_id,
      amount: Number(r.amount || 0),
      net_amount: Number(r.net_amount || 0),
      currency: r.currency || "jpy",
      status: r.status || "succeeded",
      summary: r.summary || "",
      created: r.created_at ? new Date(r.created_at).getTime() / 1000 : null
    }));

    res.json({
      sellerId,
      displayName,

      // 既存フロント向けのショートカット(純売上ベース)
      salesToday: todayNet,
      countToday: todayCount,
      avgToday: todayCount ? Math.round(todayNet / todayCount) : 0,
      recent,

      // 詳細
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
      topItems,

      // 出店者用URLセット(販売画面 / 購入画面 / ダッシュボード)
      urls
    });
  } catch (e) {
    console.error("seller/summary error", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== 一時版:Stripe から直接取得するダッシュボードAPI ======
app.get("/api/seller/summary-stripe", async (req, res) => {
  try {
    const sellerId = String(req.query.s || "");
    if (!sellerId) return res.status(400).json({ error: "sellerId required" });

    // 出店者名だけDBから取得(なければIDのまま)
    let displayName = sellerId;
    try {
      const sellerRow = await pool.query(
        `select public_id, display_name from sellers where public_id=$1 limit 1`,
        [sellerId]
      );
      if (sellerRow.rows[0]?.display_name)
        displayName = sellerRow.rows[0].display_name;
    } catch (e) {
      console.warn("summary-stripe: seller lookup error (fallback to ID)", e.message);
    }

    // JST 今日 の開始/終了をUNIX秒で
    const { todayStart, tomorrowStart } = jstDayBounds();
    const gte = Math.floor(todayStart.getTime() / 1000);
    const lt  = Math.floor(tomorrowStart.getTime() / 1000);

    // PaymentIntent Search API で当日分だけ取得
    const escSeller = sellerId.replace(/"/g, '\\"');
    const query = [
      `status:"succeeded"`,
      `metadata["sellerId"]:"${escSeller}"`,
      `created>=${gte}`,
      `created<${lt}`
    ].join(" AND ");

    const search = await stripe.paymentIntents.search({
      query,
      limit: 100
    });

    const list = search.data || [];

    let gross = 0;
    for (const pi of list) {
      const amt =
        typeof pi.amount_received === "number" ? pi.amount_received :
        typeof pi.amount === "number" ? pi.amount : 0;
      gross += amt;
    }

    const countToday = list.length;
    const salesToday = gross;
    const avgToday = countToday ? Math.round(salesToday / countToday) : 0;

    const recent = [...list]
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, 20)
      .map(pi => {
        const amt =
          typeof pi.amount_received === "number" ? pi.amount_received :
          typeof pi.amount === "number" ? pi.amount : 0;
        return {
          id: pi.id,
          amount: amt,
          net_amount: amt, // 一時版のため返金・チャージバックは未反映
          currency: pi.currency || "jpy",
          status: pi.status || "succeeded",
          summary: pi.metadata?.summary || pi.description || "",
          created: typeof pi.created === "number" ? pi.created : null
        };
      });

    res.json({
      mode: "stripeDirect",
      sellerId,
      displayName,
      salesToday,
      countToday,
      avgToday,
      recent
    });
  } catch (e) {
    console.error("seller/summary-stripe error", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== AI画像解析(軽量・即導入の強化版) ======
app.post("/api/analyze-item", upload.any(), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: "OPENAI_API_KEY not set" });

    const f = (req.files && req.files[0]) || null;
    if (!f || !f.buffer)
      return res.status(400).json({ error: "file_required" });

    // --- helpers ---
    const zen2han = (s) => String(s || "").replace(/[0-9]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
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
      response_format: { type: "json_object" }, // ← JSON強制
      messages: [
        { role: "user", content: [
          { type: "text", text: promptFull },
          { type: "image_url", image_url: { url: dataUrl } }
        ]}
      ]
    });

    let parsed = {};
    try { parsed = JSON.parse((full.choices?.[0]?.message?.content || "{}").trim()); } catch {}

    // 正規化
    let items = Array.isArray(parsed.items) ? parsed.items.map((i, idx) => {
      const name = String(i?.name || `商品${idx+1}`).slice(0, 120);
      const qty = intLoose(i?.qty) || 1;
      let unit = i?.unit_price != null ? intLoose(i.unit_price) : null;
      let sub  = i?.subtotal    != null ? intLoose(i.subtotal)    : null;
      if (unit != null && sub == null) sub = unit * qty;
      if (unit == null && sub != null && qty > 0) unit = Math.round(sub / qty);
      return { name, qty, unit_price: unit, subtotal: sub };
    }).filter(it => it.qty > 0) : [];

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
出力はこのJSONだけ:
{"names":["<品名1>","<品名2>"]}`.trim();

      const namesOnly = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "user", content: [
            { type: "text", text: promptNames },
            { type: "image_url", image_url: { url: dataUrl } }
          ]}
        ]
      });

      const js = (namesOnly.choices?.[0]?.message?.content || "{}").trim();
      rawTrail = js;
      try {
        const { names = [] } = JSON.parse(js);
        if (Array.isArray(names) && names.length) {
          items = names.slice(0, 5).map((nm, i) => ({
            name: String(nm || `商品${i+1}`).slice(0,120),
            qty: 1,
            unit_price: null,
            subtotal: null
          }));
        }
      } catch {}
    }

    // summary(* 区切り、単価不明は?)
    const summary = items.length
      ? items.map(it => `${it.name} * ${it.unit_price ?? "?"}円 * ${it.qty}`).join("\n")
      : "";

    // 空でも200で返す(UIの価格パッドが続行)
    return res.json({
      items, total, summary,
      raw: rawTrail ? (full.choices?.[0]?.message?.content + "\n---\n" + rawTrail) : (full.choices?.[0]?.message?.content || "")
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
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: "OPENAI_API_KEY not set" });

    const f = req.file;
    if (!f || !f.buffer)
      return res.status(400).json({ error: "file_required" });

    // ---- プロンプトを環境変数から取得(今回の追加ポイント) ----
    const prompt = process.env.OPENAI_PROMPT_PHOTO_FRAME || "Please beautify the photo.";

    // ---- MIME判定(analyze-item と同じロジック) ----
    let mime = f.mimetype || "image/jpeg";
    const name = (f.originalname || "").toLowerCase();
    if (mime === "application/octet-stream") {
      if (name.endsWith(".png")) mime = "image/png";
      else if (name.endsWith(".webp")) mime = "image/webp";
      else if (name.endsWith(".heic")) mime = "image/heic";
      else mime = "image/jpeg";
    }
    const dataUrl = `data:${mime};base64,${f.buffer.toString("base64")}`;

    // ---- OpenAI 画像生成(フォトフレーム加工) ----
    const result = await openai.images.generate({
      model: process.env.AI_MODEL_IMAGE || "gpt-image-1",
      prompt,
      size: "1080x1440",
      response_format: "b64_json",
      // 入力画像をモデルに渡す(gpt-image-1 は img2img サポート)
      image: dataUrl
    });

    const b64 = result.data[0].b64_json;
    const buf = Buffer.from(b64, "base64");

    res.set("Content-Type", "image/jpeg");
    return res.send(buf);

  } catch (e) {
    console.error("photo-frame error", e?.response?.data || e);
    res.status(500).json({
      error: "internal_error",
      detail: e?.response?.data?.error?.message || e.message
    });
  }
});

// ====== ヘルス / 404 / 静的配信 ======
app.get("/api/ping", (req, res) => res.json({ ok: true }));
app.use("/api", (req, res) => res.status(404).json({ error: "not_found", path: req.path }));
app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fleapay-lite running :${port}`));
