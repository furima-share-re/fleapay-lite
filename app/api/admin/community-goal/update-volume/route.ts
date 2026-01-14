/**
 * コミュニティ取扱高更新API
 * 管理者用: 月間の総取扱高を計算してキャッシュに保存
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function requireAdmin(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  return token === ADMIN_TOKEN;
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { year, month } = body || {};

    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    const periodStart = new Date(targetYear, targetMonth - 1, 1);
    const periodEnd = new Date(targetYear, targetMonth, 1);

    // 月間の総取扱高と決済回数を計算
    const volume = await prisma.$queryRaw<Array<{
      total_amount: number;
      transaction_count: bigint;
    }>>`
      SELECT 
        COALESCE(SUM(sp.amount_gross), 0) AS total_amount,
        COUNT(*)::bigint AS transaction_count
      FROM stripe_payments sp
      WHERE sp.status = 'succeeded'
        AND sp.created_at >= ${periodStart}
        AND sp.created_at < ${periodEnd}
    `;

    const totalAmount = volume && volume.length > 0 ? Number(volume[0].total_amount) : 0;
    const transactionCount = volume && volume.length > 0 ? Number(volume[0].transaction_count) : 0;

    // キャッシュに保存（既存レコードがあれば更新、なければ作成）
    // 同じ期間のレコードがあれば更新、なければ作成
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM community_transaction_volume
      WHERE period_start = ${periodStart}
        AND period_end = ${periodEnd}
      LIMIT 1
    `;

    if (existing && existing.length > 0) {
      // 既存レコードを更新
      await prisma.$executeRaw`
        UPDATE community_transaction_volume
        SET 
          total_amount = ${totalAmount},
          transaction_count = ${transactionCount},
          last_calculated_at = now(),
          updated_at = now()
        WHERE period_start = ${periodStart}
          AND period_end = ${periodEnd}
      `;
    } else {
      // 新規レコードを作成
      await prisma.$executeRaw`
        INSERT INTO community_transaction_volume (
          period_start,
          period_end,
          total_amount,
          transaction_count,
          last_calculated_at,
          updated_at
        ) VALUES (
          ${periodStart},
          ${periodEnd},
          ${totalAmount},
          ${transactionCount},
          now(),
          now()
        )
      `;
    }

    return NextResponse.json({
      success: true,
      data: {
        period: {
          year: targetYear,
          month: targetMonth,
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        totalAmount,
        transactionCount,
      },
    });
  } catch (error) {
    console.error('[CommunityGoalUpdateVolume] Error:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

