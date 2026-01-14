// app/api/admin/goal-achievements/auto/route.ts
// 結果目標の自動集計API（データベースから自動計算）

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

// 週の開始日と終了日を計算
function getWeekBounds(weekStartDate: string) {
  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// 年間換算（週次データから）
function annualizeWeekly(weeklyValue: number) {
  return weeklyValue * 52; // 52週
}

// GET: 週次結果目標実績の自動集計
export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');
    const phase = searchParams.get('phase') || 'phase4';
    
    if (!weekStart) {
      return NextResponse.json(
        { error: 'weekStart_required' },
        { status: 400 }
      );
    }

    const { start, end } = getWeekBounds(weekStart);

    // 週次の売上統計を取得
    const weeklyStats = await prisma.$queryRawUnsafe<Array<{
      gross: bigint;
      net: bigint;
      fee: bigint;
      order_count: bigint;
    }>>(
      `SELECT
        COALESCE(SUM(
          CASE
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
            ELSE 0
          END
        ), 0)::bigint AS gross,
        COALESCE(SUM(
          CASE
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
            ELSE 0
          END
        ), 0)::bigint AS net,
        COALESCE(SUM(
          CASE
            WHEN om.is_cash = true THEN 0
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN COALESCE(sp.amount_fee, 0)
            ELSE 0
          END
        ), 0)::bigint AS fee,
        COUNT(*)::bigint AS order_count
      FROM orders o
      LEFT JOIN order_metadata om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.created_at >= $1::timestamptz
        AND o.created_at <= $2::timestamptz
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true
          OR sp.status = 'succeeded'
          OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))
        )`,
      start.toISOString(),
      end.toISOString()
    );

    const stats = weeklyStats[0] || { gross: 0n, net: 0n, fee: 0n, order_count: 0n };
    const weeklyGross = Number(stats.gross);
    const weeklyNet = Number(stats.net);
    const weeklyFee = Number(stats.fee);

    // Phase 4の目標値
    const phase4Targets = {
      annual_reach: 70000000, // 7,000万
      avg_cpm: 125, // ¥125
      annual_ad_value: 8750000, // ¥875万
      actual_revenue: 5000000, // ¥500万
    };

    // 年間リーチ: QRセッション数から推定（実際のリーチデータがないため、QRセッション数をベースに推定）
    // 注: 実際のリーチ数はSNS API連携が必要
    const qrSessions = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count
      FROM qr_sessions qs
      WHERE qs.scanned_at >= $1::timestamptz
        AND qs.scanned_at <= $2::timestamptz`,
      start.toISOString(),
      end.toISOString()
    );

    const weeklyReach = Number(qrSessions[0]?.count || 0n);
    // リーチ推定: QRセッション1回 = 平均1,500回リーチ（Phase 4目標値から逆算）
    const estimatedWeeklyReach = weeklyReach * 1500;
    const annualReach = annualizeWeekly(estimatedWeeklyReach);

    // 年間広告価値: 年間リーチ × CPM / 1000
    const estimatedCpm = weeklyGross > 0 && weeklyReach > 0 
      ? (weeklyGross / weeklyReach) * 1000 
      : 0;
    const annualAdValue = (annualReach * phase4Targets.avg_cpm) / 1000;

    const results = [
      {
        phase,
        metric_type: 'annual_reach',
        week_start_date: weekStart,
        target_value: phase4Targets.annual_reach,
        actual_value: annualReach,
        achievement_rate: (annualReach / phase4Targets.annual_reach) * 100,
        unit: '回'
      },
      {
        phase,
        metric_type: 'avg_cpm',
        week_start_date: weekStart,
        target_value: phase4Targets.avg_cpm,
        actual_value: estimatedCpm,
        achievement_rate: (estimatedCpm / phase4Targets.avg_cpm) * 100,
        unit: '円'
      },
      {
        phase,
        metric_type: 'annual_ad_value',
        week_start_date: weekStart,
        target_value: phase4Targets.annual_ad_value,
        actual_value: annualAdValue,
        achievement_rate: (annualAdValue / phase4Targets.annual_ad_value) * 100,
        unit: '円'
      },
      {
        phase,
        metric_type: 'actual_revenue',
        week_start_date: weekStart,
        target_value: phase4Targets.actual_revenue,
        actual_value: annualizeWeekly(weeklyNet),
        achievement_rate: (annualizeWeekly(weeklyNet) / phase4Targets.actual_revenue) * 100,
        unit: '円'
      }
    ];

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        weekStart,
        weekEnd: end.toISOString().split('T')[0],
        weekly: {
          gross: weeklyGross,
          net: weeklyNet,
          fee: weeklyFee,
          orderCount: Number(stats.order_count),
          qrSessions: weeklyReach
        },
        annualized: {
          reach: annualReach,
          adValue: annualAdValue,
          revenue: annualizeWeekly(weeklyNet),
          estimatedCpm
        }
      }
    });
  } catch (e) {
    console.error('goal-achievements auto GET error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}
