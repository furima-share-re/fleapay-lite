// app/api/checkout/result/route.ts
// Phase 2.3: Next.js画面移行（チェックアウト結果取得API Route Handler）

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/utils';

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

    // 修正: succeededレコードが存在するかどうかを確認するため、
    // 最新のstripe_paymentsレコードと、succeededレコードの存在を別々に取得
    const result = await prisma.$queryRaw`
      SELECT
        o.id            AS order_id,
        o.seller_id,
        o.amount,
        o.status       AS order_status,
        o.created_at,
        -- 最新のstripe_paymentsレコード（金額表示用）
        sp_latest.status      AS payment_status,
        sp_latest.amount_gross,
        sp_latest.amount_net,
        sp_latest.currency,
        sp_latest.created_at  AS paid_at,
        -- succeededレコードが存在するかどうか（isPaid判定用）
        EXISTS(
          SELECT 1 
          FROM stripe_payments sp_succeeded
          WHERE sp_succeeded.order_id = o.id 
            AND sp_succeeded.status = 'succeeded'
        ) AS has_succeeded_payment,
        -- Webhook受信済みかどうか（stripe_paymentsレコードの存在で判定）
        EXISTS(
          SELECT 1 
          FROM stripe_payments sp_any
          WHERE sp_any.order_id = o.id
        ) AS webhook_received
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT *
        FROM stripe_payments
        WHERE order_id = o.id
        ORDER BY created_at DESC
        LIMIT 1
      ) sp_latest ON true
      WHERE o.id = ${orderId}::uuid
        AND o.deleted_at IS NULL
      LIMIT 1
    `;

    const row = (result as Array<Record<string, unknown>>)[0];

    if (!row) {
      return NextResponse.json(
        { error: 'order_not_found' },
        { status: 404 }
      );
    }

    // 修正: orders.status = 'paid' または succeededレコードが存在する場合にisPaid = true
    // これにより、複数のstripe_paymentsレコードがある場合でも正しく判定できる
    const isPaid =
      row.order_status === 'paid' ||
      row.has_succeeded_payment === true;

    // Webhook受信済みかどうか
    const webhookReceived = row.webhook_received === true;

    return NextResponse.json({
      orderId: row.order_id,
      sellerId: row.seller_id,
      amount: row.amount,
      currency: row.currency || 'jpy',
      orderStatus: row.order_status,
      paymentStatus: row.payment_status || null,
      isPaid,
      webhookReceived,
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

