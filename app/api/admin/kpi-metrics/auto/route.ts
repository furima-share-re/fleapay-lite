// app/api/admin/kpi-metrics/auto/route.ts
// KPI指標の自動集計API（データベースから自動計算）

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

// 週の開始日（月曜日）と終了日（日曜日）を計算
function getWeekBounds(weekStartDate: string) {
  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET: 週次KPI実績値の自動集計
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
    
    if (!weekStart) {
      return NextResponse.json(
        { error: 'weekStart_required' },
        { status: 400 }
      );
    }

    const { start, end } = getWeekBounds(weekStart);

    // 1. おみくじ完了率: QRセッション数 / 注文数
    const omikujiStats = await prisma.$queryRawUnsafe<Array<{
      total_orders: bigint;
      qr_sessions: bigint;
      completion_rate: number;
    }>>(
      `SELECT 
        COUNT(DISTINCT o.id)::bigint AS total_orders,
        COUNT(DISTINCT qs.id)::bigint AS qr_sessions,
        CASE 
          WHEN COUNT(DISTINCT o.id) > 0 
          THEN (COUNT(DISTINCT qs.id)::numeric / COUNT(DISTINCT o.id)::numeric * 100)
          ELSE 0
        END AS completion_rate
      FROM orders o
      LEFT JOIN qr_sessions qs ON qs.order_id = o.id
      WHERE o.created_at >= $1::timestamptz
        AND o.created_at <= $2::timestamptz
        AND o.deleted_at IS NULL`,
      start.toISOString(),
      end.toISOString()
    );

    // 2. 公式UGC投稿数/日: フレーム使用の注文数（週平均）
    const ugcStats = await prisma.$queryRawUnsafe<Array<{
      total_ugc: bigint;
      days_in_week: number;
      ugc_per_day: number;
    }>>(
      `SELECT 
        COUNT(*)::bigint AS total_ugc,
        7 AS days_in_week,
        CASE 
          WHEN COUNT(*) > 0 
          THEN (COUNT(*)::numeric / 7.0)
          ELSE 0
        END AS ugc_per_day
      FROM orders o
      WHERE o.created_at >= $1::timestamptz
        AND o.created_at <= $2::timestamptz
        AND o.deleted_at IS NULL
        AND o.frame_id IS NOT NULL`,
      start.toISOString(),
      end.toISOString()
    );

    // 3. AI生成成功率: AI生成の注文数 / 全注文数
    const aiStats = await prisma.$queryRawUnsafe<Array<{
      total_orders: bigint;
      ai_orders: bigint;
      ai_success_rate: number;
    }>>(
      `SELECT 
        COUNT(*)::bigint AS total_orders,
        COUNT(CASE WHEN oi.source = 'ai' THEN 1 END)::bigint AS ai_orders,
        CASE 
          WHEN COUNT(*) > 0 
          THEN (COUNT(CASE WHEN oi.source = 'ai' THEN 1 END)::numeric / COUNT(*)::numeric * 100)
          ELSE 0
        END AS ai_success_rate
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.created_at >= $1::timestamptz
        AND o.created_at <= $2::timestamptz
        AND o.deleted_at IS NULL`,
      start.toISOString(),
      end.toISOString()
    );

    // 4. 月間QR決済数（週次換算）: QRセッション数
    const qrPaymentStats = await prisma.$queryRawUnsafe<Array<{
      qr_count: bigint;
      weekly_estimate: number;
    }>>(
      `SELECT 
        COUNT(*)::bigint AS qr_count,
        COUNT(*)::numeric AS weekly_estimate
      FROM qr_sessions qs
      WHERE qs.scanned_at >= $1::timestamptz
        AND qs.scanned_at <= $2::timestamptz`,
      start.toISOString(),
      end.toISOString()
    );

    const omikuji = omikujiStats[0] || { total_orders: 0n, qr_sessions: 0n, completion_rate: 0 };
    const ugc = ugcStats[0] || { total_ugc: 0n, days_in_week: 7, ugc_per_day: 0 };
    const ai = aiStats[0] || { total_orders: 0n, ai_orders: 0n, ai_success_rate: 0 };
    const qr = qrPaymentStats[0] || { qr_count: 0n, weekly_estimate: 0 };

    // KPI定義と目標値
    const kpiResults = [
      {
        metric_key: 'omikuji_completion_rate',
        metric_category: 'tier1',
        week_start_date: weekStart,
        target_value: 90, // Phase 4目標
        actual_value: Number(omikuji.completion_rate),
        unit: '%',
        phase: 'phase4',
        achievement_rate: Number(omikuji.completion_rate) / 90 * 100
      },
      {
        metric_key: 'ugc_posts_per_day',
        metric_category: 'tier1',
        week_start_date: weekStart,
        target_value: 12, // Phase 4目標
        actual_value: Number(ugc.ugc_per_day),
        unit: '本',
        phase: 'phase4',
        achievement_rate: Number(ugc.ugc_per_day) / 12 * 100
      },
      {
        metric_key: 'ai_generation_success_rate',
        metric_category: 'tier1',
        week_start_date: weekStart,
        target_value: 95, // Phase 4目標
        actual_value: Number(ai.ai_success_rate),
        unit: '%',
        phase: 'phase4',
        achievement_rate: Number(ai.ai_success_rate) / 95 * 100
      },
      {
        metric_key: 'monthly_qr_payments',
        metric_category: 'tier2',
        week_start_date: weekStart,
        target_value: 16000 / 4, // 月間16,000回を週次換算
        actual_value: Number(qr.weekly_estimate),
        unit: '回',
        phase: 'phase4',
        achievement_rate: Number(qr.weekly_estimate) / (16000 / 4) * 100
      }
    ];

    return NextResponse.json({
      success: true,
      data: kpiResults,
      metadata: {
        weekStart,
        weekEnd: end.toISOString().split('T')[0],
        omikuji: {
          totalOrders: Number(omikuji.total_orders),
          qrSessions: Number(omikuji.qr_sessions),
          completionRate: Number(omikuji.completion_rate)
        },
        ugc: {
          totalUgc: Number(ugc.total_ugc),
          ugcPerDay: Number(ugc.ugc_per_day)
        },
        ai: {
          totalOrders: Number(ai.total_orders),
          aiOrders: Number(ai.ai_orders),
          successRate: Number(ai.ai_success_rate)
        },
        qr: {
          weeklyCount: Number(qr.qr_count),
          monthlyEstimate: Number(qr.weekly_estimate) * 4
        }
      }
    });
  } catch (e) {
    console.error('kpi-metrics auto GET error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}
