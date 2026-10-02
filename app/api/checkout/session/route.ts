// app/api/checkout/session/route.ts
// Phase 2.3: Next.js画面移行（チェックアウトセッション作成API Route Handler）
//
// Session 作成の本体は lib/checkout-stripe.ts に切り出してある
// （Server Component からの直リダイレクトと同一ロジックを共有するため）。
// このルートの責務は Origin 検証・レートリミット・order の取得/作成まで。

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNextOrderNo, sanitizeError, bumpAndAllow, clientIp, isSameOrigin } from '@/lib/utils';
import { createCheckoutSessionForOrder } from '@/lib/checkout-stripe';

const RATE_LIMIT_MAX_CHECKOUT = parseInt(process.env.RATE_LIMIT_MAX_CHECKOUT || "12", 10);

export async function POST(request: NextRequest) {
  const __t0 = Date.now();
  let __lapT = __t0;
  const lap = (label: string) => {
    const now = Date.now();
    console.warn(`[TIMING] checkout/session ${label} step=${now - __lapT}ms total=${now - __t0}ms`);
    __lapT = now;
  };
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
    }

    const body = await request.json();
    lap('request.json');
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
      lap('order.findFirst');
      if (!order) {
        return NextResponse.json(
          { error: 'order_not_found' },
          { status: 404 }
        );
      }
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
      lap('order.create');
    }

    const result = await createCheckoutSessionForOrder(prisma, order, lap);

    if (!result.ok) {
      return NextResponse.json(
        result.message
          ? { error: result.error, message: result.message }
          : { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      result.reused
        ? { url: result.url, sessionId: result.sessionId, reused: true }
        : { url: result.url, sessionId: result.sessionId }
    );

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
