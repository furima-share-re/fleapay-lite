// app/api/admin/dashboard/route.ts
// Phase 2.3: Next.js画面移行（管理者ダッシュボードAPI Route Handler）

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jstDayBounds, sanitizeError } from '@/lib/utils';

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
    const { todayStart, tomorrowStart, yesterdayStart } = jstDayBounds();

    // 今日の売上統計（現金+カード統合）
    const todayStats = await prisma.$queryRaw<Array<{
      order_count: bigint;
      gross: bigint;
      net: bigint;
      fee: bigint;
    }>>`
      SELECT
        COUNT(*)::bigint AS order_count,
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
        ), 0)::bigint AS fee
      FROM orders o
      LEFT JOIN order_metadata om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.created_at >= ${todayStart}
        AND o.created_at < ${tomorrowStart}
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true  -- 現金決済は表示
          OR sp.status = 'succeeded'  -- Stripe成功決済は表示
          OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))  -- Stripe決済がないが、現金決済またはメタデータがない場合（移行データ）は表示
        )
        -- QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL または sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
    `;

    // 昨日の売上統計
    const yesterdayStats = await prisma.$queryRaw<Array<{
      order_count: bigint;
      gross: bigint;
      net: bigint;
    }>>`
      SELECT
        COUNT(*)::bigint AS order_count,
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
        ), 0)::bigint AS net
      FROM orders o
      LEFT JOIN order_metadata om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.created_at >= ${yesterdayStart}
        AND o.created_at < ${todayStart}
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true  -- 現金決済は表示
          OR sp.status = 'succeeded'  -- Stripe成功決済は表示
          OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))  -- Stripe決済がないが、現金決済またはメタデータがない場合（移行データ）は表示
        )
        -- QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL または sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
    `;

    // 全期間統計
    const totalStats = await prisma.$queryRaw<Array<{
      order_count: bigint;
      gross: bigint;
      net: bigint;
      fee: bigint;
    }>>`
      SELECT
        COUNT(*)::bigint AS order_count,
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
        ), 0)::bigint AS fee
      FROM orders o
      LEFT JOIN order_metadata om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.deleted_at IS NULL
        AND (
          om.is_cash = true  -- 現金決済は表示
          OR sp.status = 'succeeded'  -- Stripe成功決済は表示
          OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))  -- Stripe決済がないが、現金決済またはメタデータがない場合（移行データ）は表示
        )
        -- QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL または sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
    `;

    // アクティブな出店者数
    const sellerCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT o.seller_id)::bigint AS count
      FROM orders o
      WHERE o.deleted_at IS NULL
    `;

    // 最近のアクティビティ
    const recentActivity = await prisma.$queryRaw<Array<{
      id: string;
      seller_id: string;
      payment_intent_id: string | null;
      amount_gross: number | null;
      status: string | null;
      created_at: Date;
      seller_name: string | null;
      order_no: number | null;
    }>>`
      SELECT
        o.id,
        o.seller_id,
        sp.payment_intent_id,
        sp.amount_gross,
        sp.status,
        o.created_at,
        s.display_name AS seller_name,
        o.order_no
      FROM orders o
      LEFT JOIN sellers s ON o.seller_id = s.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.deleted_at IS NULL
      ORDER BY o.created_at DESC
      LIMIT 10
    `;

    const today = todayStats[0] || { order_count: 0n, gross: 0n, net: 0n, fee: 0n };
    const yesterday = yesterdayStats[0] || { order_count: 0n, gross: 0n, net: 0n };
    const total = totalStats[0] || { order_count: 0n, gross: 0n, net: 0n, fee: 0n };

    return NextResponse.json({
      today: {
        orderCount: Number(today.order_count) || 0,
        gross: Number(today.gross) || 0,
        net: Number(today.net) || 0,
        fee: Number(today.fee) || 0
      },
      yesterday: {
        orderCount: Number(yesterday.order_count) || 0,
        gross: Number(yesterday.gross) || 0,
        net: Number(yesterday.net) || 0
      },
      total: {
        orderCount: Number(total.order_count) || 0,
        gross: Number(total.gross) || 0,
        net: Number(total.net) || 0,
        fee: Number(total.fee) || 0
      },
      sellerCount: Number(sellerCount[0]?.count) || 0,
      recentActivity: recentActivity.map(row => ({
        id: row.id,
        sellerId: row.seller_id,
        paymentIntentId: row.payment_intent_id,
        amountGross: row.amount_gross,
        status: row.status,
        createdAt: row.created_at,
        sellerName: row.seller_name,
        orderNo: row.order_no
      })),
      paymentCount: Number(today.order_count) || 0,
      totalRevenue: Number(today.gross) || 0,
      netRevenue: Number(today.net) || 0,
      disputeCount: 0, // TODO: チャージバック機能実装時に追加
      refundCount: 0, // TODO: 返金機能実装時に追加
      urgentCount: 0 // TODO: チャージバック機能実装時に追加
    });
  } catch (e) {
    console.error('dashboard error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

