import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

dotenv.config();
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1) Webhook（署名検証のため raw）を先に定義
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    switch (event.type) {
      case "payment_intent.succeeded":
        // TODO: DB保存・自社メール送信など
        break;
      case "payment_intent.payment_failed":
        // 失敗ハンドリング
        break;
      case "account.updated":
        // 出店者の charges_enabled / payouts_enabled を反映
        break;
    }
    res.json({ received: true });
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// 2) それ以外のルートは JSON でOK
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// 出店者アカウント作成（Connect Express）
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

// KYC用リンク発行
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

// 決済（10%税込固定・Stripe露出最小）
app.post("/api/payments", async (req, res) => {
  const { amount, sellerAccountId, description } = req.body;
  const fee = Math.round(amount * 0.10); // 税込固定

  const pi = await stripe.paymentIntents.create({
    amount,
    currency: "jpy",
    description,
    payment_method_types: ["card"],
    application_fee_amount: fee,
    transfer_data: { destination: sellerAccountId },
    metadata: { sellerAccountId }
  });

  res.json({ clientSecret: pi.client_secret, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fleapay-lite running :${port}`));
