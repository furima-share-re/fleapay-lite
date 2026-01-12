// app/api/admin/stripe/summary/route.ts
// Phase 2.3: Next.js画面移行（管理者StripeサマリーAPI Route Handler）

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jstDayBounds } from '@/lib/utils';

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
    const endDate: Date = tomorrowStart;
    
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

    // チャージバック統計
    const disputeStats = await prisma.$queryRaw<Array<{
      dispute_count: bigint;
      needs_response_count: bigint;
    }>>`
      SELECT
        COUNT(*)::bigint AS dispute_count,
        COUNT(*) FILTER (
          WHERE sp.dispute_status = 'needs_response'
        )::bigint AS needs_response_count
      FROM stripe_payments sp
      WHERE sp.created_at >= ${startDate}
        AND sp.created_at < ${endDate}
        AND sp.status = 'disputed'
    `;

    // 期限間近のチャージバック（needs_responseのうち、raw_eventから期限を確認）
    // 簡略化: needs_responseのものをすべて取得して、期限をチェック
    const disputesNeedingResponse = await prisma.stripePayment.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: 'disputed',
        disputeStatus: 'needs_response',
      },
      select: {
        rawEvent: true,
      },
    });

    let urgentDisputes = 0;
    const now = Date.now();
    for (const dispute of disputesNeedingResponse) {
      try {
        if (!dispute.rawEvent) continue;
        const rawEvent = dispute.rawEvent as any;
        const dueBy = rawEvent?.data?.object?.evidence_details?.due_by;
        if (dueBy && typeof dueBy === 'number') {
          const daysUntilDue = Math.ceil((dueBy * 1000 - now) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 3 && daysUntilDue > 0) {
            urgentDisputes++;
          }
        }
      } catch (e) {
        // パースエラーは無視
      }
    }

    // 返金統計
    const refundStats = await prisma.$queryRaw<Array<{
      refund_count: bigint;
      refund_amount: bigint;
    }>>`
      SELECT
        COUNT(*)::bigint AS refund_count,
        COALESCE(SUM(sp.refunded_total), 0)::bigint AS refund_amount
      FROM stripe_payments sp
      WHERE sp.created_at >= ${startDate}
        AND sp.created_at < ${endDate}
        AND (sp.status = 'refunded' OR sp.status = 'partially_refunded')
        AND sp.refunded_total > 0
    `;

    const stats = paymentsStats[0] || { payments_count: 0n, payments_gross: 0n, net_sales: 0n };
    const disputeStat = disputeStats[0] || { dispute_count: 0n, needs_response_count: 0n };
    const refundStat = refundStats[0] || { refund_count: 0n, refund_amount: 0n };

    const disputeCount = Number(disputeStat.dispute_count) || 0;
    const refundCount = Number(refundStat.refund_count) || 0;
    const refundAmount = Number(refundStat.refund_amount) || 0;

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
  }
}

