// app/api/admin/sellers/route.ts
// Phase 2.3: Next.js画面移行（管理者API - 出店者 Route Handler）

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { buildSellerUrls, sanitizeError } from '@/lib/utils';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

function audit(event: string, payload: Record<string, unknown>) {
  console.warn(`[AUDIT] ${event}`, JSON.stringify(payload, null, 2));
}

export async function POST(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, displayName, shopName, stripeAccountId } = body || {};
    
    if (!id) {
      return NextResponse.json(
        { error: 'id required' },
        { status: 400 }
      );
    }

    const q = `
      INSERT INTO sellers (id, display_name, shop_name, stripe_account_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, sellers.display_name),
        shop_name = COALESCE(EXCLUDED.shop_name, sellers.shop_name),
        stripe_account_id = COALESCE(EXCLUDED.stripe_account_id, sellers.stripe_account_id),
        updated_at = NOW()
      RETURNING id, display_name, shop_name, stripe_account_id
    `;
    const { rows } = await pool.query(q, [
      id,
      displayName || null,
      shopName || null,
      stripeAccountId || null
    ]);

    const row = rows[0];
    const urls = buildSellerUrls(row.id, row.stripe_account_id);

    audit('seller_created_or_updated', { sellerId: row.id });

    return NextResponse.json({
      id: row.id,
      displayName: row.display_name,
      shopName: row.shop_name,
      stripeAccountId: row.stripe_account_id,
      urls
    });
  } catch (e) {
    console.error('create/update seller', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.display_name,
        s.shop_name,
        s.stripe_account_id,
        s.created_at,
        s.updated_at,
        COUNT(DISTINCT o.id) AS order_count,
        MAX(o.created_at) AS last_order_at
      FROM sellers s
      LEFT JOIN orders o ON s.id = o.seller_id
      GROUP BY s.id, s.display_name, s.shop_name, s.stripe_account_id, s.created_at, s.updated_at
      ORDER BY s.created_at DESC
    `);

    const sellers = result.rows.map(row => ({
      id: row.id,
      displayName: row.display_name,
      shopName: row.shop_name,
      stripeAccountId: row.stripe_account_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      orderCount: parseInt(String(row.order_count)) || 0,
      lastOrderAt: row.last_order_at,
      urls: buildSellerUrls(row.id, row.stripe_account_id)
    }));

    return NextResponse.json({ sellers });
  } catch (e) {
    console.error('get sellers', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

