// app/api/checkout/session/route.ts
// Phase 2.3: Next.js画面移行（チェックアウトセッション作成API Route Handler）

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { getNextOrderNo, sanitizeError, bumpAndAllow, clientIp, isSameOrigin, audit, resolveSellerAccountId } from '@/lib/utils';
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

    // 出店者のStripeアカウントID取得
    const stripeAccountId = await resolveSellerAccountId(prisma, order.sellerId);
    if (!stripeAccountId) {
      console.error('[Checkout] seller stripe account not found', {
        orderId: order.id,
        sellerId: order.sellerId,
      });
      return NextResponse.json(
        {
          error: 'seller_stripe_account_not_found',
          message: '出店者のStripeアカウントが設定されていません。',
        },
        { status: 400 }
      );
    }

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
              name: order.summary || '商品',
            },
            unit_amount: order.amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          sellerId: order.sellerId,
          orderId: order.id,
        },
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

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

