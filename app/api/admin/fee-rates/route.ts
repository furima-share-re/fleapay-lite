// app/api/admin/fee-rates/route.ts
// 管理者向け手数料率マスタ取得API

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    // 現在有効な手数料率を取得
    const feeRates = await prisma.$queryRaw<Array<{
      id: string;
      plan_type: string;
      fee_rate: number;
      effective_from: Date;
      effective_to: Date | null;
      tier: number | null;
    }>>`
      SELECT 
        id,
        plan_type,
        fee_rate,
        effective_from,
        effective_to,
        tier
      FROM fee_rate_master
      WHERE effective_from <= now()
        AND (effective_to IS NULL OR effective_to >= now())
      ORDER BY plan_type, tier NULLS LAST, effective_from DESC
    `;

    // Tier定義も返す
    const tierDefinitions = {
      1: { name: 'ビギナー', min: 0, max: 3, defaultRate: 0.0450 },
      2: { name: 'レギュラー', min: 4, max: 10, defaultRate: 0.0420 },
      3: { name: 'エキスパート', min: 11, max: 24, defaultRate: 0.0400 },
      4: { name: 'マスター', min: 25, max: 50, defaultRate: 0.0380 },
      5: { name: 'レジェンド', min: 51, max: null, defaultRate: 0.0330 },
    };

    return NextResponse.json({
      success: true,
      data: {
        feeRates: feeRates.map(rate => ({
          id: rate.id,
          planType: rate.plan_type,
          feeRate: Number(rate.fee_rate),
          feeRatePercent: (Number(rate.fee_rate) * 100).toFixed(2),
          tier: rate.tier,
          effectiveFrom: rate.effective_from,
          effectiveTo: rate.effective_to,
        })),
        tierDefinitions,
      },
    });
  } catch (error) {
    console.error('[Admin FeeRates] Error:', error);
    
    // テーブルが存在しない場合のエラーハンドリング
    if (error instanceof Error) {
      const errorMessage = error.message;
      if (errorMessage.includes('relation "fee_rate_master" does not exist')) {
        return NextResponse.json(
          {
            error: 'table_not_found',
            message: 'fee_rate_masterテーブルが存在しません。データベースマイグレーションを適用してください。',
            details: 'マイグレーションファイル: supabase/migrations/20250116_120000_create_fee_rate_master.sql を本番環境に適用する必要があります。',
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
