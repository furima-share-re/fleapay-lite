// lib/checkout-stripe.ts
// Stripe Checkout Session 作成ロジックの共通実装。
//
// 従来は app/api/checkout/session/route.ts に全て書かれていたため、
// サーバー側（Server Component）から呼ぶことができず、
// 購入者は必ず /checkout を描画 → JS ハイドレーション → タップ → fetch
// という経路を通る必要があった。
//
// ここに切り出すことで、
//   - POST /api/checkout/session（従来経路）
//   - app/checkout/page.tsx の直リダイレクト（新経路）
// の両方から同一ロジックを呼べるようにする。
//
// 注意: このモジュールはサーバー専用。クライアントコンポーネントから import してはいけない
// （STRIPE_SECRET_KEY / ORDER_HASH_SECRET / prisma を触る）。
// lib/checkout-server.ts と違って `import 'server-only'` を付けていないのは、
// tests/integration/checkout-session-fee.test.ts が POST ルート経由でこのモジュールを
// 読み込むため。vitest(node) は `server-only` を解決できない。
// 呼び出し元は app/api/checkout/session/route.ts と app/checkout/page.tsx（Server Component）のみ。

import Stripe from 'stripe';
import crypto from 'crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  audit,
  resolveSellerAccountId,
  getFeeRateFromMaster,
  normalizeStatementDescriptor,
  normalizeSellerId,
} from '@/lib/utils';
import { getFeeRateWithStrategyF } from '@/lib/strategy-f';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

const getBaseUrl = () => {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
};
const BASE_URL = getBaseUrl();

const resolveOrderHashSecret = (): string | null => {
  const secret = process.env.ORDER_HASH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Checkout] ORDER_HASH_SECRET is missing in production');
      return null;
    }
    console.warn('[Checkout] ORDER_HASH_SECRET not set, using default (development only)');
    return 'dev-default-secret-do-not-use-in-production';
  }
  return secret;
};

const PENDING_TTL_MIN = parseInt(process.env.PENDING_TTL_MIN || '10', 10);

/**
 * /checkout の Stripe 直リダイレクトを有効にするかどうか。
 *
 * 既定は OFF。本番イベント中の事故を避けるため、Vercel の環境変数
 * CHECKOUT_DIRECT_REDIRECT に "1" または "true" を設定したときだけ有効になる。
 * OFF の間は従来どおり /checkout の画面が描画される（挙動は完全に据え置き）。
 */
export function isDirectRedirectEnabled(): boolean {
  const raw = (process.env.CHECKOUT_DIRECT_REDIRECT || '').trim().toLowerCase();
  return raw === '1' || raw === 'true';
}

/**
 * リンクプレビュー用クローラーからのアクセスかどうか。
 *
 * QR/URL を LINE・WeChat・Slack 等に貼ると、人間が開く前に bot が GET してくる。
 * 直リダイレクトは GET で Stripe Session を作って orders.status を in_checkout に
 * 進めてしまうため、bot のプリフェッチで注文が動かないようにここで弾く。
 * （弾いた場合は従来の /checkout 画面が返るだけで、購入者の導線は壊れない）
 */
export function isLinkPreviewBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) {
    // UA なしのアクセスは人間のブラウザとは考えにくいので安全側に倒す
    return true;
  }
  return /bot|crawler|spider|preview|facebookexternalhit|line-poker|slackbot|discord|whatsapp|twitterbot|embedly|quora link preview|skypeuripreview|telegrambot|pinterest|applebot|bingbot|googlebot|yahoo! slurp|baiduspider|petalbot|headlesschrome/i.test(
    userAgent
  );
}

/**
 * 直リダイレクト経路で使う order の取得。
 *
 * 通常表示に使う getCheckoutInitialData() とは判定を分けている。
 * 直リダイレクトでは status='in_checkout'（＝一度 Session を作った後）も許可する:
 * 購入者が戻るボタンで /checkout に戻ってきたときに「期限切れ」にせず、
 * Idempotency により同じ Stripe URL へ送り直せるようにするため。
 *
 * 該当しない場合は null を返し、呼び出し側は従来の /checkout 画面にフォールバックする。
 */
export async function loadOrderForDirectRedirect(
  prisma: PrismaClient,
  orderIdRaw: string | undefined | null,
  sellerIdRaw: string | undefined | null
): Promise<OrderWithMetadata | null> {
  const orderId = (orderIdRaw || '').trim();
  if (!orderId) return null;

  // UUID 形式チェック（Prisma で db.Uuid 列にゴミを投げると例外になるため）
  const isUuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  if (!isUuidLike) return null;

  let order: OrderWithMetadata | null;
  try {
    order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderMetadata: true },
    });
  } catch (err) {
    console.error('[checkout-stripe] prisma error', err);
    return null;
  }

  if (!order || order.deletedAt !== null) return null;

  // sellerId が URL と一致しない場合（他人の注文）は対象外
  const sellerId = normalizeSellerId((sellerIdRaw || '').trim());
  if (sellerId && order.sellerId !== sellerId) return null;

  // 現金決済の注文は Stripe に流さない
  if (order.orderMetadata?.isCash === true) return null;

  // 金額未確定（店員が入力中）は従来 UI でポーリングさせる
  const amount = Number(order.amount);
  if (!Number.isInteger(amount) || amount <= 0) return null;

  // 支払い可能な status のみ（paid / cancelled などは従来 UI に任せる）
  if (order.status !== 'pending' && order.status !== 'in_checkout') return null;

  // TTL 切れは従来 UI（期限切れ表示）に任せる
  const expireMs = PENDING_TTL_MIN * 60 * 1000;
  if (Date.now() - order.createdAt.getTime() > expireMs) return null;

  return order;
}

/** orderMetadata を include 済みの Order */
export type OrderWithMetadata = Prisma.OrderGetPayload<{
  include: { orderMetadata: true };
}>;

export type CreateCheckoutSessionResult =
  | { ok: true; url: string; sessionId: string; reused: boolean }
  | { ok: false; status: number; error: string; message?: string };

/** 呼び出し側の [TIMING] ログに相乗りするための計測フック（任意） */
export type LapFn = (label: string) => void;

const noopLap: LapFn = () => {};

/**
 * 注文に対する Stripe Checkout Session を作成（または再利用）して URL を返す。
 *
 * 呼び出し側の責務:
 *   - レートリミット / Origin 検証
 *   - order の取得または新規作成
 * このモジュールの責務:
 *   - 決済可否のバリデーション、手数料計算、Session 作成、orders 更新
 */
export async function createCheckoutSessionForOrder(
  prisma: PrismaClient,
  order: OrderWithMetadata,
  lap: LapFn = noopLap
): Promise<CreateCheckoutSessionResult> {
  const orderMetadata = order.orderMetadata;

  // 金額バリデーション: 0円以下の注文は決済させない
  if (!order.amount || Number(order.amount) <= 0) {
    console.error('[Checkout] invalid order amount', {
      orderId: order.id,
      amount: order.amount,
    });
    return {
      ok: false,
      status: 400,
      error: 'invalid_amount',
      message: '金額が0円のため決済を開始できません。',
    };
  }

  // 出店者のStripeアカウントID取得（Stripe Connect接続アカウント必須）
  // 重要: transfer_data.destination と application_fee_amount を使用するため、
  // 出店者は Stripe Connect の connected account (Express/Custom/Standard) を持つ必要がある
  const stripeAccountId = await resolveSellerAccountId(prisma, order.sellerId);
  lap('resolveSellerAccountId');
  if (!stripeAccountId) {
    console.error('[Checkout] seller stripe account not found', {
      orderId: order.id,
      sellerId: order.sellerId,
    });
    return {
      ok: false,
      status: 400,
      error: 'seller_stripe_account_not_found',
      message: '出店者のStripeアカウントが設定されていません。Stripe Connectへの登録が必要です。',
    };
  }

  // Connected accountがcharges_enabled=trueか確認（未完了KYCで失敗する）
  // 注意: 毎回retrieveするとレイテンシ/コストが増えるため、
  // 将来はsellerテーブルにchargesEnabledをキャッシュして、
  // Webhook（account.updated）で更新することを推奨
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    lap('stripe.accounts.retrieve');
    if (!account.charges_enabled) {
      console.error('[Checkout] Connected account charges not enabled', {
        orderId: order.id,
        sellerId: order.sellerId,
        stripeAccountId,
        chargesEnabled: account.charges_enabled,
      });
      return {
        ok: false,
        status: 400,
        error: 'account_charges_not_enabled',
        message:
          '出店者のStripeアカウントが決済可能な状態ではありません。KYC（本人確認）の完了が必要です。',
      };
    }
  } catch (stripeError) {
    console.error('[Checkout] Failed to retrieve connected account', stripeError);
    return {
      ok: false,
      status: 500,
      error: 'account_retrieval_failed',
      message: '出店者のStripeアカウント情報の取得に失敗しました。',
    };
  }

  // 出店者情報を取得（店舗名/屋号のフォールバック用）
  const seller = await prisma.seller.findUnique({
    where: { id: order.sellerId },
    select: { shopName: true, displayName: true },
  });
  lap('seller.findUnique');

  // 金額バリデーション: order.amountは最小通貨単位（JPYなら円）の整数である必要がある
  // 注意: Idempotency対策で使用するため、先に定義する
  const orderAmount = Number(order.amount);
  if (!Number.isInteger(orderAmount) || orderAmount <= 0) {
    console.error('[Checkout] Invalid order amount (must be integer)', {
      orderId: order.id,
      amount: order.amount,
      type: typeof order.amount,
    });
    return {
      ok: false,
      status: 400,
      error: 'invalid_amount',
      message: '金額は整数である必要があります。',
    };
  }

  // 明細名の正規化（Stripe statement_descriptor_suffix用）
  // ASCII限定（A-Z 0-9 空白 * - など）に正規化、ダメなら固定値
  // チャージバック対策にも強い一貫した明細名
  const statementDescriptorSuffix = normalizeStatementDescriptor(
    seller?.shopName || seller?.displayName,
    'EVENT'
  );

  // 商品名（line_items用）
  const productName = seller?.shopName || seller?.displayName || order.summary || '商品';

  // ★ バリデーション: 現金決済ではない
  if (orderMetadata?.isCash) {
    return {
      ok: false,
      status: 400,
      error: 'cash_payment_order',
      message: 'This is a cash payment order',
    };
  }

  // ★ バリデーション: 既に決済完了していない
  if (orderMetadata?.paymentState === 'stripe_completed') {
    return {
      ok: false,
      status: 400,
      error: 'already_paid',
      message: 'Order already paid',
    };
  }

  // 既に支払い済みの場合はエラー（旧コードとの互換性）
  if (order.status === 'paid') {
    return {
      ok: false,
      status: 400,
      error: 'already_paid',
      message: 'この注文は既に支払い済みです。',
    };
  }

  // Idempotency対策: 既にCheckout Sessionが作成されている場合は再利用
  // ただし、金額が変わっている場合は古いSessionを返すと事故るため、金額ハッシュを照合
  if (order.stripeSid) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(order.stripeSid);
      lap('stripe.checkout.sessions.retrieve');
      // セッションが有効な場合（未完了、未期限切れ）は再利用
      if (existingSession.status === 'open' && existingSession.payment_status === 'unpaid') {
        // 金額が変わっていないことを確認（orderId + amount + currencyを連結してHMACでハッシュ）
        // 注意: Stripe Secret Keyは決済API用で、アプリ内の署名/HMAC用途に流用しない（セキュリティ設計）
        const hashInput = `${order.id}:${orderAmount}:jpy`;
        const hashSecret = resolveOrderHashSecret();
        if (hashSecret) {
          const expectedAmountHash = crypto
            .createHmac('sha256', hashSecret)
            .update(hashInput)
            .digest('base64')
            .slice(0, 16);
          const sessionAmountHash = existingSession.metadata?.orderAmountHash;

          if (sessionAmountHash === expectedAmountHash) {
            console.log('[Checkout] Reusing existing session', {
              orderId: order.id,
              sessionId: existingSession.id,
              amountHash: expectedAmountHash,
            });
            if (existingSession.url) {
              return {
                ok: true,
                url: existingSession.url,
                sessionId: existingSession.id,
                reused: true,
              };
            }
            console.warn('[Checkout] Existing session has no url, creating new one', {
              orderId: order.id,
              sessionId: existingSession.id,
            });
          } else {
            console.warn('[Checkout] Existing session amount mismatch, creating new one', {
              orderId: order.id,
              expectedHash: expectedAmountHash,
              sessionHash: sessionAmountHash,
            });
          }
        } else {
          console.warn('[Checkout] ORDER_HASH_SECRET missing; skipping session reuse check');
        }
      }
    } catch (stripeError) {
      // セッションが見つからない場合は新規作成を続行
      console.warn('[Checkout] Existing session not found, creating new one', stripeError);
    }
  }

  // 出店者のプランを取得（必ず1件に決まるように明確化）
  // 有効なサブスクリプションを取得（status='active' AND (endedAt IS NULL OR endedAt > now())）
  // 優先順位: endedAt IS NULL（現在適用中）を優先、次に最新のstartedAt
  // データ不整合（activeなのにendedAtが過去）に備えて、endedAt nullを優先
  let subscription = await prisma.sellerSubscription.findFirst({
    where: {
      sellerId: order.sellerId,
      status: 'active',
      endedAt: null, // まず現在適用中（endedAt null）を探す
    },
    orderBy: { startedAt: 'desc' },
  });
  lap('sellerSubscription.findFirst#1');

  // endedAt nullがない場合、endedAt > now()のものを探す
  if (!subscription) {
    subscription = await prisma.sellerSubscription.findFirst({
      where: {
        sellerId: order.sellerId,
        status: 'active',
        endedAt: { gt: new Date() },
      },
      orderBy: { startedAt: 'desc' },
    });
    lap('sellerSubscription.findFirst#2');
  }

  // プランがない場合は標準プランとして扱う
  const planType = (subscription?.planType as 'standard' | 'pro' | 'kids') || 'standard';

  // プランタイプのバリデーション
  if (!['standard', 'pro', 'kids'].includes(planType)) {
    console.error('[Checkout] Invalid planType', { planType, sellerId: order.sellerId });
    return {
      ok: false,
      status: 400,
      error: 'invalid_plan_type',
      message: '無効なプランタイプです。',
    };
  }

  // マスタから手数料率を取得（戦略F: Tier制対応）
  let feeRate: number;
  try {
    // 戦略FのTier制を有効化（環境変数で制御可能）
    const useTierSystem = process.env.ENABLE_STRATEGY_F_TIER_SYSTEM !== 'false';

    if (useTierSystem) {
      // 戦略F: Tier制とコミュニティ連動型ダイナミックプライシング
      feeRate = await getFeeRateWithStrategyF(prisma, order.sellerId, planType, true);
      lap('getFeeRateWithStrategyF');
    } else {
      // 従来のplan_typeベースの手数料率
      feeRate = await getFeeRateFromMaster(prisma, planType);
      lap('getFeeRateFromMaster');
    }
  } catch (error) {
    // フォールバック: 5% で処理継続（運用救済）
    const fallbackRateRaw = process.env.FEE_RATE_FALLBACK_OVERRIDE;
    const fallbackRate = fallbackRateRaw ? Number(fallbackRateRaw) : 0.05;
    feeRate = Number.isFinite(fallbackRate) ? fallbackRate : 0.05;
    console.error('[Checkout] Failed to get fee rate, using fallback', {
      error,
      sellerId: order.sellerId,
      planType,
      feeRate,
    });
  }

  // 手数料計算（浮動小数誤差対策: 整数演算に寄せる）
  // 【重要】手数料算定ベース: 最終請求額（order.amount）に対して課金
  // - 現在の実装では、order.amountが最終請求額として扱われる
  // - 将来、税・送料・割引が追加される場合は、Stripe Checkout Sessionの最終金額（amount_total）を基準にする
  // - order.amountは最小通貨単位（JPYなら円）の整数、feeRateは0.0700のような小数
  // - 計算: Math.floor(amount * rate) で整数に丸める（丸めを下げるとクレームが減る）
  // - 0円決済対応: orderAmount === 0の場合はfee = 0（0円注文は不可の仕様なら不要）
  const calculatedFee = Math.floor(orderAmount * feeRate);
  const fee = orderAmount === 0 ? 0 : Math.max(calculatedFee, 1); // 0円の場合は0、それ以外は最低1円

  // 手数料の不変条件チェック（主防御）
  // 1. fee >= 0（負の手数料は不可）
  // 2. fee < orderAmount（手数料が注文金額以上にならない）
  // 3. orderAmount自体の上限（業務上の制約）
  if (fee < 0) {
    console.error('[Checkout] Invalid fee calculation: negative fee', {
      orderId: order.id,
      orderAmount,
      feeRate,
      calculatedFee,
      finalFee: fee,
    });
    return {
      ok: false,
      status: 500,
      error: 'invalid_fee_calculation',
      message: '手数料の計算に誤りがあります。',
    };
  }

  if (fee >= orderAmount && orderAmount > 0) {
    console.error('[Checkout] Invalid fee calculation: fee >= orderAmount', {
      orderId: order.id,
      orderAmount,
      feeRate,
      calculatedFee,
      finalFee: fee,
    });
    return {
      ok: false,
      status: 500,
      error: 'invalid_fee_calculation',
      message: '手数料の計算に誤りがあります。',
    };
  }

  // Stripeのapplication_fee_amountの上限チェック（補助的、安全弁）
  // 注意: Stripeの制限は通貨やAPIの型制約に依存するため、主防御は上記の不変条件
  if (fee > 999999999) {
    console.error('[Checkout] Fee exceeds Stripe limit', {
      orderId: order.id,
      orderAmount,
      fee,
    });
    return {
      ok: false,
      status: 500,
      error: 'fee_exceeds_limit',
      message: '手数料が上限を超えています。',
    };
  }

  console.log('[Checkout] Fee calculation', {
    orderId: order.id,
    sellerId: order.sellerId,
    planType,
    feeRate,
    orderAmount,
    calculatedFee: calculatedFee,
    finalFee: fee,
  });

  // 金額ハッシュを計算（Idempotency対策とmetadata用）
  // orderId + amount + currencyを連結してHMACでハッシュ（改ざん検知を強化）
  // 注意: Stripe Secret Keyは決済API用で、アプリ内の署名/HMAC用途に流用しない（セキュリティ設計）
  const hashInput = `${order.id}:${orderAmount}:jpy`;
  const hashSecret = resolveOrderHashSecret();
  const orderAmountHash = hashSecret
    ? crypto.createHmac('sha256', hashSecret).update(hashInput).digest('base64').slice(0, 16)
    : null;

  const successUrl = `${BASE_URL}/success?order=${order.id}`;
  const cancelUrl = `${BASE_URL}/cancel?s=${order.sellerId}&order=${order.id}`;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: [
      'card', // カード / Apple Pay / Google Pay
      'link', // Stripe Link
      'alipay', // Alipay
      'wechat_pay', // WeChat Pay（Stripe ダッシュボードで有効化済み 2026-10-02 確認）
    ],
    // Checkout で WeChat Pay を使うには client 指定が必須。'web' は QR コード表示
    payment_method_options: {
      wechat_pay: { client: 'web' },
    },
    locale: 'auto',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: {
            name: productName, // 商品名（フォールバック処理済み）
          },
          unit_amount: orderAmount, // 最小通貨単位（JPYなら円）の整数
        },
        quantity: 1,
      },
    ],
    // statement_descriptor_suffix: カード明細に表示される文字列（最大22文字）
    payment_intent_data: {
      application_fee_amount: fee, // 手数料を設定（最小通貨単位の整数）
      transfer_data: {
        destination: stripeAccountId, // Stripe Connect接続アカウント必須
      },
      statement_descriptor_suffix: statementDescriptorSuffix, // 明細名最適化
      metadata: {
        sellerId: order.sellerId,
        orderId: order.id,
        planType, // プラン情報をメタデータに保存
        feeRate: feeRate.toString(), // 手数料率をメタデータに保存
      },
    },
    // session.metadataにも追加（検索が楽になる）
    metadata: {
      sellerId: order.sellerId,
      orderId: order.id,
      planType,
      ...(orderAmountHash ? { orderAmountHash } : {}),
    },
  };

  // Idempotency対策: 同じorder.idで重複作成を防ぐ
  // Stripe API呼び出し時にidempotencyKeyを指定
  const session = await stripe.checkout.sessions.create(sessionParams, {
    // Stripe APIレベルでの重複防止。sessionParams を変えたら v を上げる
    // （同じキーを別パラメータで再利用すると Stripe が 400 を返すため。v2: wechat_pay 追加）
    idempotencyKey: `checkout_session_v2_${order.id}`,
  });
  lap('stripe.checkout.sessions.create');

  if (!session.url) {
    console.error('[Checkout] Session created without url', {
      orderId: order.id,
      sessionId: session.id,
    });
    return {
      ok: false,
      status: 500,
      error: 'session_url_missing',
      message: '決済URLの取得に失敗しました。',
    };
  }

  // データベースにstripe_sidを保存（Stripe API確認用）
  await prisma.order.update({
    where: { id: order.id },
    data: {
      stripeSid: session.id,
      status: 'in_checkout',
    },
  });
  lap('order.update');

  audit('checkout_session_created', {
    orderId: order.id,
    sellerId: order.sellerId,
    sessionId: session.id,
  });

  return { ok: true, url: session.url, sessionId: session.id, reused: false };
}
