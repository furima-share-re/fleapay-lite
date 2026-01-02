// app/api/admin/frames/route.ts
// Phase 2.3: Next.js画面移行（管理者API - フレーム Route Handler）

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sanitizeError } from '@/lib/utils';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

function audit(event: string, payload: Record<string, unknown>) {
  console.log(`[AUDIT] ${event}`, JSON.stringify(payload, null, 2));
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
    const { id, displayName, category, metadata } = body || {};
    
    if (!id || !displayName) {
      return NextResponse.json(
        { error: 'id and displayName required' },
        { status: 400 }
      );
    }

    const q = `
      INSERT INTO frames (id, display_name, category, metadata)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        category = EXCLUDED.category,
        metadata = EXCLUDED.metadata
      RETURNING *
    `;
    const { rows } = await pool.query(q, [
      id,
      displayName,
      category || null,
      metadata ? JSON.stringify(metadata) : null
    ]);

    audit('frame_created_or_updated', { frameId: id });

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error('create/update frame', e);
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
        f.id,
        f.display_name,
        f.category,
        f.metadata,
        f.created_at,
        COUNT(DISTINCT o.id) AS order_count
      FROM frames f
      LEFT JOIN orders o ON f.id = o.frame_id
      GROUP BY f.id, f.display_name, f.category, f.metadata, f.created_at
      ORDER BY f.created_at DESC
    `);

    const frames = result.rows.map(row => ({
      id: row.id,
      displayName: row.display_name,
      category: row.category,
      metadata: row.metadata,
      createdAt: row.created_at,
      orderCount: parseInt(String(row.order_count)) || 0
    }));

    return NextResponse.json({ frames });
  } catch (e) {
    console.error('get frames', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

