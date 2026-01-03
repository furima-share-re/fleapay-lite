// app/api/checkout/result/route.ts
// Phase 2.3: Next.js画面移行（チェックアウト結果取得API Route Handler）

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sanitizeError } from '@/lib/utils';

const prisma = new PrismaClient();

// Force dynamic rendering (this route uses request.url)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id_required' },
        { status: 400 }
      );
    }

    const result = await prisma.$queryRaw`
      SELECT
        o.id            AS order_id,
        o.seller_id,
        o.amount,
        o.status       AS order_status,
        o.created_at,
        sp.status      AS payment_status,
        sp.amount_gross,
        sp.amount_net,
        sp.currency,
        sp.created_at  AS paid_at
      FROM orders o
      LEFT JOIN stripe_payments sp
        ON sp.order_id = o.id
      WHERE o.id = ${orderId}::uuid
        AND o.deleted_at IS NULL
      ORDER BY sp.created_at DESC NULLS LAST
      LIMIT 1
    `;

    const row = (result as any[])[0];

    if (!row) {
      return NextResponse.json(
        { error: 'order_not_found' },
        { status: 404 }
      );
    }

    const isPaid =
      row.order_status === 'paid' ||
      row.payment_status === 'succeeded';

    return NextResponse.json({
      orderId: row.order_id,
      sellerId: row.seller_id,
      amount: row.amount,
      currency: row.currency || 'jpy',
      orderStatus: row.order_status,
      paymentStatus: row.payment_status || null,
      isPaid,
      paidAt: row.paid_at
    });
  } catch (e) {
    console.error('/api/checkout/result error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

