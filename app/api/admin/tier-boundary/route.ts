// app/api/admin/tier-boundary/route.ts
// 管理者向け: Tier境界値テスト用API

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TIER_DEFINITIONS, getMonthlyTierStatusAt } from '@/lib/strategy-f';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

function parseCount(value: string | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('s') || searchParams.get('sellerId');
    if (!sellerId) {
      return NextResponse.json({ error: 'seller_id_required' }, { status: 400 });
    }

    const asOfRaw = searchParams.get('asOf');
    const asOf = asOfRaw ? new Date(asOfRaw) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      return NextResponse.json({ error: 'invalid_asof' }, { status: 400 });
    }

    const transactionCount = parseCount(searchParams.get('transactionCount'));
    const prevTransactionCount = parseCount(searchParams.get('prevTransactionCount'));

    const status = await getMonthlyTierStatusAt(prisma, sellerId, asOf, {
      transactionCount,
      prevTransactionCount,
    });

    const tierDef = TIER_DEFINITIONS[status.currentTier as keyof typeof TIER_DEFINITIONS];

    return NextResponse.json({
      ok: true,
      data: {
        ...status,
        tierDefinition: tierDef,
        asOf: asOf.toISOString(),
        overrides: {
          transactionCount,
          prevTransactionCount,
        },
      },
    });
  } catch (error) {
    console.error('[Admin TierBoundary] Error:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
