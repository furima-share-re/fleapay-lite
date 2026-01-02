// app/api/seller/order-detail/route.ts
// Phase 2.3: Next.js画面移行（注文詳細取得API Route Handler）

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sanitizeError } from '@/lib/utils';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const PENDING_TTL_MIN = parseInt(process.env.PENDING_TTL_MIN || '30', 10);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sellerId = url.searchParams.get('s');
    const orderId = url.searchParams.get('orderId');

    if (!sellerId || !orderId) {
      return NextResponse.json(
        { error: 'missing_params' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT
         o.id AS order_id,
         o.seller_id,
         o.amount,
         o.summary,
         o.status,
         o.created_at,
         COALESCE(om.is_cash, false) AS is_cash
       FROM orders o
       LEFT JOIN order_metadata om
         ON om.order_id = o.id
       WHERE o.id = $1
         AND o.seller_id = $2
         AND o.deleted_at IS NULL
       LIMIT 1`,
      [orderId, sellerId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      return NextResponse.json(
        { error: 'not_found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    // 有効期限 & ステータス & 現金チェック
    const createdAt = row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at);

    const expireMs = PENDING_TTL_MIN * 60 * 1000;
    const isExpiredByTime = Date.now() - createdAt.getTime() > expireMs;
    const isInactiveStatus = row.status !== 'pending';
    const isCash = row.is_cash === true;

    if (isExpiredByTime || isInactiveStatus || isCash) {
      return NextResponse.json({
        orderId: row.order_id,
        sellerId: row.seller_id,
        amount: null,
        summary: null,
        error: 'expired',
      });
    }

    return NextResponse.json({
      orderId: row.order_id,
      sellerId: row.seller_id,
      amount: row.amount,
      summary: row.summary,
      status: row.status,
      createdAt: row.created_at,
    });
  } catch (e) {
    console.error('seller_order_detail_error', e);
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    );
  }
}

