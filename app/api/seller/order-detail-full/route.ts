// app/api/seller/order-detail-full/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sanitizeError } from '@/lib/utils';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sellerId = request.nextUrl.searchParams.get('s');
    const orderId = request.nextUrl.searchParams.get('orderId');

    if (!sellerId || !orderId) {
      return NextResponse.json(
        { error: 'seller_id_and_order_id_required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: sellerId,
        deletedAt: null, // 削除済みを除外
      },
      include: {
        orderMetadata: true,
        buyerAttributes: true,
        images: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'order_not_found' },
        { status: 404 }
      );
    }

    const image = order.images[0] || null;

    return NextResponse.json({
      orderId: order.id,
      sellerId: sellerId,
      memo: order.summary || '',
      amount: order.amount,
      costAmount: order.costAmount || 0,
      createdAt: order.createdAt,
      isCash: order.orderMetadata?.isCash || false,
      customerType: order.buyerAttributes?.customerType || 'unknown',
      gender: order.buyerAttributes?.gender || 'unknown',
      ageBand: order.buyerAttributes?.ageBand || 'unknown',
      itemCategory: order.orderMetadata?.category || 'unknown',
      buyerLanguage: order.orderMetadata?.buyerLanguage || 'unknown',
      imageUrl: image?.url || null,
    });
  } catch (e) {
    console.error('seller_order_detail_error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
