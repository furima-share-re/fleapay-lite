// app/api/checkout/session/route.ts
// Phase 2.3: Next.js画面移行（チェックアウトセッション作成API Route Handler）

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import crypto from 'crypto';
import { getNextOrderNo, sanitizeError, bumpAndAllow, clientIp, isSameOrigin, audit, resolveSellerAccountId, getFeeRateFromMaster, normalizeStatementDescriptor } from '@/lib/utils';
import { getFeeRateWithStrategyF } from '@/lib/strategy-f';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
  apiVersion: '2025-10-29.clover'
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
const RATE_LIMIT_MAX_CHECKOUT = parseInt(process.env.RATE_LIMIT_MAX_CHECKOUT || "12", 10);

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
    }

    const body = await request.json();
    const { sellerId, amount: bodyAmount, summary, orderId: bodyOrderId } = body || {};
    const orderId = bodyOrderId || request.nextUrl.searchParams.get('order') || '';

    if (!sellerId && !orderId) {
      return NextResponse.json(
        { error: 'seller_id_or_order_id_required' },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    if (!bumpAndAllow(`checkout:${ip}`, RATE_LIMIT_MAX_CHECKOUT)) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429 }
      );
    }

    // orderの取得または作成
    let order;
    let orderMetadata;
    if (orderId) {
      order = await prisma.order.findFirst({
        where: {
          id: orderId,
          deletedAt: null,
        },
        include: {
          orderMetadata: true,
        },
      });
      if (!order) {
        return NextResponse.json(
          { error: 'order_not_found' },
          { status: 404 }
        );
      }
      orderMetadata = order.orderMetadata;
    } else {
      // 新規注文作成
      const amount = bodyAmount ? Number(bodyAmount) : 0;
      const nextOrderNo = await getNextOrderNo(prisma, sellerId);
      
      order = await prisma.order.create({
        data: {
          sellerId: sellerId,
          orderNo: nextOrderNo,
          amount: amount,
          summary: summary || "",
          status: 'pending',
        },
        include: {
          orderMetadata: true,
        },
      });
      orderMetadata = order.orderMetadata;
    }

    // 金額バリデーション: 0円以下の注文は決済させない
    if (!order.amount || Number(order.amount) <= 0) {
      console.error('[Checkout] invalid order amount', {
        orderId: order.id,
        amount: order.amount,
      });
      return NextResponse.json(
        {
          error: 'invalid_amount',
          message: '金額が0円のため決済を開始できません。',
        },
        { status: 400 }
      );
    }

    // 出店者のStripeアカウントID取得（Stripe Connect接続アカウント必須）
    // 重要: transfer_data.destination と application_fee_amount を使用するため、
    // 出店者は Stripe Connect の connected account (Express/Custom/Standard) を持つ必要がある
    const stripeAccountId = await resolveSellerAccountId(prisma, order.sellerId);
    if (!stripeAccountId) {
      console.error('[Checkout] seller stripe account not found', {
        orderId: order.id,
        sellerId: order.sellerId,
      });
      return NextResponse.json(
        {
          error: 'seller_stripe_account_not_found',
          message: '出店者のStripeアカウントが設定されていません。Stripe Connectへの登録が必要です。',
        },
        { status: 400 }
      );
    }

    // Connected accountがcharges_enabled=trueか確認（未完了KYCで失敗する）
    // 注意: 毎回retrieveするとレイテンシ/コストが増えるため、
    // 将来はsellerテーブルにchargesEnabledをキャッシュして、
    // Webhook（account.updated）で更新することを推奨
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      if (!account.charges_enabled) {
        console.error('[Checkout] Connected account charges not enabled', {
          orderId: order.id,
          sellerId: order.sellerId,
          stripeAccountId,
          chargesEnabled: account.charges_enabled
        });
        return NextResponse.json(
          {
            error: 'account_charges_not_enabled',
            message: '出店者のStripeアカウントが決済可能な状態ではありません。KYC（本人確認）の完了が必要です。',
          },
          { status: 400 }
        );
      }
    } catch (stripeError) {
      console.error('[Checkout] Failed to retrieve connected account', stripeError);
      return NextResponse.json(
        {
          error: 'account_retrieval_failed',
          message: '出店者のStripeアカウント情報の取得に失敗しました。',
        },
        { status: 500 }
      );
    }

    // 出店者情報を取得（店舗名/屋号のフォールバック用）
    const seller = await prisma.seller.findUnique({
      where: { id: order.sellerId },
      select: { shopName: true, displayName: true }
    });

    // 金額バリデーション: order.amountは最小通貨単位（JPYなら円）の整数である必要がある
    // 注意: Idempotency対策で使用するため、先に定義する
    const orderAmount = Number(order.amount);
    if (!Number.isInteger(orderAmount) || orderAmount <= 0) {
      console.error('[Checkout] Invalid order amount (must be integer)', {
        orderId: order.id,
        amount: order.amount,
        type: typeof order.amount
      });
      return NextResponse.json(
        {
          error: 'invalid_amount',
          message: '金額は整数である必要があります。',
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          error: 'cash_payment_order',
          message: 'This is a cash payment order',
        },
        { status: 400 }
      );
    }

    // ★ バリデーション: 既に決済完了していない
    if (orderMetadata?.paymentState === 'stripe_completed') {
      return NextResponse.json(
        {
          error: 'already_paid',
          message: 'Order already paid',
        },
        { status: 400 }
      );
    }

    // 既に支払い済みの場合はエラー（旧コードとの互換性）
    if (order.status === 'paid') {
      return NextResponse.json(
        {
          error: 'already_paid',
          message: 'この注文は既に支払い済みです。',
        },
        { status: 400 }
      );
    }

    // Idempotency対策: 既にCheckout Sessionが作成されている場合は再利用
    // ただし、金額が変わっている場合は古いSessionを返すと事故るため、金額ハッシュを照合
    if (order.stripeSid) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(order.stripeSid);
        // セッションが有効な場合（未完了、未期限切れ）は再利用
        if (existingSession.status === 'open' && existingSession.payment_status === 'unpaid') {
          // 金額が変わっていないことを確認（orderId + amount + currencyを連結してHMACでハッシュ）
          // 注意: Stripe Secret Keyは決済API用で、アプリ内の署名/HMAC用途に流用しない（セキュリティ設計）
          const hashInput = `${order.id}:${orderAmount}:jpy`;
          const secret = process.env.ORDER_HASH_SECRET;
          if (!secret) {
            // 本番環境では必須
            if (process.env.NODE_ENV === 'production') {
              console.error('[Checkout] ORDER_HASH_SECRET is missing in production');
              throw new Error('ORDER_HASH_SECRET is missing');
            }
            // 開発環境のみデフォルト値（本番では使用しない）
            console.warn('[Checkout] ORDER_HASH_SECRET not set, using default (development only)');
          }
          const hashSecret = secret || 'dev-default-secret-do-not-use-in-production';
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
              amountHash: expectedAmountHash
            });
            return NextResponse.json({ 
              url: existingSession.url, 
              sessionId: existingSession.id,
              reused: true
            });
          } else {
            console.warn('[Checkout] Existing session amount mismatch, creating new one', {
              orderId: order.id,
              expectedHash: expectedAmountHash,
              sessionHash: sessionAmountHash
            });
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
        endedAt: null  // まず現在適用中（endedAt null）を探す
      },
      orderBy: { startedAt: 'desc' }
    });
    
    // endedAt nullがない場合、endedAt > now()のものを探す
    if (!subscription) {
      subscription = await prisma.sellerSubscription.findFirst({
        where: {
          sellerId: order.sellerId,
          status: 'active',
          endedAt: { gt: new Date() }
        },
        orderBy: { startedAt: 'desc' }
      });
    }

    // プランがない場合は標準プランとして扱う
    const planType = (subscription?.planType as 'standard' | 'pro' | 'kids') || 'standard';
    
    // プランタイプのバリデーション
    if (!['standard', 'pro', 'kids'].includes(planType)) {
      console.error('[Checkout] Invalid planType', { planType, sellerId: order.sellerId });
      return NextResponse.json(
        {
          error: 'invalid_plan_type',
          message: '無効なプランタイプです。',
        },
        { status: 400 }
      );
    }

    // マスタから手数料率を取得（戦略F: Tier制対応）
    let feeRate: number;
    try {
      // 戦略FのTier制を有効化（環境変数で制御可能）
      const useTierSystem = process.env.ENABLE_STRATEGY_F_TIER_SYSTEM !== 'false';
      
      if (useTierSystem) {
        // 戦略F: Tier制とコミュニティ連動型ダイナミックプライシング
        feeRate = await getFeeRateWithStrategyF(prisma, order.sellerId, planType, true);
      } else {
        // 従来のplan_typeベースの手数料率
        feeRate = await getFeeRateFromMaster(prisma, planType);
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
    const fee = orderAmount === 0 ? 0 : Math.max(calculatedFee, 1);  // 0円の場合は0、それ以外は最低1円
    
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
        finalFee: fee
      });
      return NextResponse.json(
        {
          error: 'invalid_fee_calculation',
          message: '手数料の計算に誤りがあります。',
        },
        { status: 500 }
      );
    }
    
    if (fee >= orderAmount && orderAmount > 0) {
      console.error('[Checkout] Invalid fee calculation: fee >= orderAmount', {
        orderId: order.id,
        orderAmount,
        feeRate,
        calculatedFee,
        finalFee: fee
      });
      return NextResponse.json(
        {
          error: 'invalid_fee_calculation',
          message: '手数料の計算に誤りがあります。',
        },
        { status: 500 }
      );
    }
    
    // Stripeのapplication_fee_amountの上限チェック（補助的、安全弁）
    // 注意: Stripeの制限は通貨やAPIの型制約に依存するため、主防御は上記の不変条件
    if (fee > 999999999) {
      console.error('[Checkout] Fee exceeds Stripe limit', {
        orderId: order.id,
        orderAmount,
        fee
      });
      return NextResponse.json(
        {
          error: 'fee_exceeds_limit',
          message: '手数料が上限を超えています。',
        },
        { status: 500 }
      );
    }

    console.log('[Checkout] Fee calculation', {
      orderId: order.id,
      sellerId: order.sellerId,
      planType,
      feeRate,
      orderAmount,
      calculatedFee: calculatedFee,
      finalFee: fee
    });

    // 金額ハッシュを計算（Idempotency対策とmetadata用）
    // orderId + amount + currencyを連結してHMACでハッシュ（改ざん検知を強化）
    // 注意: Stripe Secret Keyは決済API用で、アプリ内の署名/HMAC用途に流用しない（セキュリティ設計）
    const hashInput = `${order.id}:${orderAmount}:jpy`;
    const secret = process.env.ORDER_HASH_SECRET;
    if (!secret) {
      // 本番環境では必須、開発環境のみデフォルト許可
      if (process.env.NODE_ENV === 'production') {
        console.error('[Checkout] ORDER_HASH_SECRET is missing in production');
        return NextResponse.json(
          {
            error: 'configuration_error',
            message: 'システム設定エラーが発生しました。管理者にお問い合わせください。',
          },
          { status: 500 }
        );
      }
      // 開発環境のみデフォルト値（本番では使用しない）
      console.warn('[Checkout] ORDER_HASH_SECRET not set, using default (development only)');
    }
    const hashSecret = secret || 'dev-default-secret-do-not-use-in-production';
    const orderAmountHash = crypto
      .createHmac('sha256', hashSecret)
      .update(hashInput)
      .digest('base64')
      .slice(0, 16);

    const successUrl = `${BASE_URL}/success?order=${order.id}`;
    const cancelUrl = `${BASE_URL}/cancel?s=${order.sellerId}&order=${order.id}`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: [
        'card',        // カード / Apple Pay / Google Pay
        'link',        // Stripe Link
        'alipay'       // Alipay
      ],
      locale: 'auto',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: productName,  // 商品名（フォールバック処理済み）
            },
            unit_amount: orderAmount,  // 最小通貨単位（JPYなら円）の整数
          },
          quantity: 1,
        },
      ],
      // statement_descriptor_suffix: カード明細に表示される文字列（最大22文字）
      payment_intent_data: {
        application_fee_amount: fee,  // 手数料を設定（最小通貨単位の整数）
        transfer_data: {
          destination: stripeAccountId,  // Stripe Connect接続アカウント必須
        },
        statement_descriptor_suffix: statementDescriptorSuffix,  // 明細名最適化
        metadata: {
          sellerId: order.sellerId,
          orderId: order.id,
          planType,  // プラン情報をメタデータに保存
          feeRate: feeRate.toString(),  // 手数料率をメタデータに保存
        },
      },
      // session.metadataにも追加（検索が楽になる）
      metadata: {
        sellerId: order.sellerId,
        orderId: order.id,
        planType,
        orderAmountHash,  // 金額ハッシュ（再利用時の照合用）: orderId + amount + currencyを連結してHMACでハッシュ
      },
    };

    // Idempotency対策: 同じorder.idで重複作成を防ぐ
    // Stripe API呼び出し時にidempotencyKeyを指定
    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey: `checkout_session_${order.id}`,  // Stripe APIレベルでの重複防止
    });

    // データベースにstripe_sidを保存（Stripe API確認用）
    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripeSid: session.id,
        status: 'in_checkout',
      },
    });

    audit("checkout_session_created", { orderId: order.id, sellerId: order.sellerId, sessionId: session.id });

    return NextResponse.json({ url: session.url, sessionId: session.id });

  } catch (error: unknown) {
    console.error("/api/checkout/session エラー発生:", error);
    const errorType = error && typeof error === 'object' && 'type' in error ? error.type : undefined;
    if (errorType === "StripeInvalidRequestError") {
      const errorMessage = error instanceof Error ? error.message : 'Stripe error occurred';
      return NextResponse.json({
        error: "stripe_error",
        message: errorMessage,
      }, { status: 400 });
    }
    return NextResponse.json(sanitizeError(error), { status: 500 });
  } finally {
  }
}


