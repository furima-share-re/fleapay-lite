// app/api/seller/order-detail/route.ts
// Phase 2.3: Next.js画面移行（注文詳細取得API Route Handler）

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeError, normalizeSellerId } from '@/lib/utils';
const PENDING_TTL_MIN = parseInt(process.env.PENDING_TTL_MIN || '10', 10);

// Force dynamic rendering (this route uses request.url)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let sellerId = request.nextUrl.searchParams.get('s');
    const orderId = request.nextUrl.searchParams.get('orderId');

    if (!sellerId || !orderId) {
      return NextResponse.json(
        { error: 'missing_params' },
        { status: 400 }
      );
    }
    
    // seller_idエイリアス処理
    sellerId = normalizeSellerId(sellerId);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: sellerId,
        deletedAt: null,
      },
      include: {
        orderMetadata: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'not_found' },
        { status: 404 }
      );
    }

    // 有効期限 & ステータス & 現金チェック
    const createdAt = order.createdAt;
    const expireMs = PENDING_TTL_MIN * 60 * 1000;
    const isExpiredByTime = Date.now() - createdAt.getTime() > expireMs;
    const isInactiveStatus = order.status !== 'pending';
    const isCash = order.orderMetadata?.isCash === true;

    if (isExpiredByTime || isInactiveStatus || isCash) {
      return NextResponse.json({
        orderId: order.id,
        sellerId: order.sellerId,
        amount: null,
        summary: null,
        error: 'expired',
      });
    }

    return NextResponse.json({
      orderId: order.id,
      sellerId: order.sellerId,
      amount: order.amount,
      summary: order.summary,
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (e) {
    console.error('seller_order_detail_error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
  }
}

