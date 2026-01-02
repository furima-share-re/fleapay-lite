// app/api/checkout/result/route.ts
// Phase 2.3: Next.js画面移行（チェックアウト結果取得API Route Handler）

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sanitizeError } from '@/lib/utils';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id_required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
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
      WHERE o.id = $1
        AND o.deleted_at IS NULL
      ORDER BY sp.created_at DESC NULLS LAST
      LIMIT 1
      `,
      [orderId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      return NextResponse.json(
        { error: 'order_not_found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];

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
      { error: 'server_error' },
      { status: 500 }
    );
  }
}

