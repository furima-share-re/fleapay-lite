// app/api/admin/stripe/summary/route.ts
// Phase 2.3: Next.js画面移行（管理者StripeサマリーAPI Route Handler）

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jstDayBounds, sanitizeError } from '@/lib/utils';

const prisma = new PrismaClient();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'today';
    
    const { todayStart, tomorrowStart } = jstDayBounds();
    
    let startDate: Date;
    let endDate: Date = tomorrowStart;
    
    if (period === 'week') {
      startDate = new Date(todayStart);
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(todayStart);
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = todayStart;
    }

    // 決済統計
    const paymentsStats = await prisma.$queryRaw<Array<{
      payments_count: bigint;
      payments_gross: bigint;
      net_sales: bigint;
    }>>`
      SELECT
        COUNT(*)::bigint AS payments_count,
        COALESCE(SUM(sp.amount_gross), 0)::bigint AS payments_gross,
        COALESCE(SUM(sp.amount_net), 0)::bigint AS net_sales
      FROM stripe_payments sp
      WHERE sp.created_at >= ${startDate}
        AND sp.created_at < ${endDate}
        AND sp.status = 'succeeded'
    `;

    // チャージバック・返金統計（TODO: 実装時に追加）
    const disputeCount = 0;
    const urgentDisputes = 0;
    const refundCount = 0;
    const refundAmount = 0;

    const stats = paymentsStats[0] || { payments_count: 0n, payments_gross: 0n, net_sales: 0n };

    return NextResponse.json({
      ok: true,
      summary: {
        paymentsCount: Number(stats.payments_count) || 0,
        paymentsGross: Number(stats.payments_gross) || 0,
        netSales: Number(stats.net_sales) || 0,
        disputeCount,
        urgentDisputes,
        refundCount,
        refundAmount
      },
      charges: [],
      disputes: [],
      refunds: []
    });
  } catch (e) {
    console.error('stripe summary error', e);
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: (e as Error).message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

