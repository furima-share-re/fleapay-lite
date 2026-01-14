// app/api/admin/benchmark-data/route.ts
// ベンチマークデータの週次管理API

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

// GET: ベンチマークデータの取得
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
    const benchmarkType = searchParams.get('benchmarkType');
    const contentCategory = searchParams.get('contentCategory');

    let where: any = {};
    if (weekStart) {
      where.week_start_date = weekStart;
    }
    if (benchmarkType) {
      where.benchmark_type = benchmarkType;
    }
    if (contentCategory) {
      where.content_category = contentCategory;
    }

    let query = `SELECT * FROM benchmark_data`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (weekStart) {
      params.push(weekStart);
      conditions.push(`week_start_date = $${params.length}::date`);
    }
    if (benchmarkType) {
      params.push(benchmarkType);
      conditions.push(`benchmark_type = $${params.length}`);
    }
    if (contentCategory) {
      params.push(contentCategory);
      conditions.push(`content_category = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY week_start_date DESC, benchmark_type, content_category`;

    const benchmarks = await prisma.$queryRawUnsafe<Array<{
      id: string;
      benchmark_type: string;
      content_category: string | null;
      week_start_date: Date;
      industry_standard: number | null;
      edo_ichiba_current: number | null;
      edo_ichiba_target: number | null;
      actual_value: number | null;
      growth_rate: number | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
      created_by: string | null;
    }>>(query, ...params);

    return NextResponse.json({
      success: true,
      data: benchmarks
    });
  } catch (e) {
    console.error('benchmark-data GET error', e);
    
    // テーブルが存在しない場合のエラーハンドリング
    if (e instanceof Error) {
      const errorMessage = e.message;
      if (errorMessage.includes('relation "benchmark_data" does not exist')) {
        return NextResponse.json(
          {
            error: 'table_not_found',
            message: 'benchmark_dataテーブルが存在しません。データベースマイグレーションを適用してください。',
            details: 'benchmark_dataテーブルのマイグレーションファイルを本番環境に適用する必要があります。',
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

// POST: ベンチマークデータの作成・更新
export async function POST(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      benchmarkType,
      contentCategory,
      weekStartDate,
      industryStandard,
      edoIchibaCurrent,
      edoIchibaTarget,
      actualValue,
      notes,
      createdBy = 'admin'
    } = body;

    if (!benchmarkType || !weekStartDate) {
      return NextResponse.json(
        { error: 'missing_required_fields', message: 'benchmarkType, weekStartDate are required' },
        { status: 400 }
      );
    }

    // 成長率を計算（実績値と現在値から）
    let growthRate: number | null = null;
    if (actualValue !== null && edoIchibaCurrent !== null && edoIchibaCurrent > 0) {
      growthRate = ((Number(actualValue) - Number(edoIchibaCurrent)) / Number(edoIchibaCurrent)) * 100;
    }

    // UPSERT処理
    await prisma.$executeRaw`
      INSERT INTO benchmark_data (
        benchmark_type, content_category, week_start_date,
        industry_standard, edo_ichiba_current, edo_ichiba_target,
        actual_value, growth_rate, notes, created_by
      )
      VALUES (
        ${benchmarkType}, ${contentCategory ?? null}, ${weekStartDate}::date,
        ${industryStandard ?? null}, ${edoIchibaCurrent ?? null}, ${edoIchibaTarget ?? null},
        ${actualValue ?? null}, ${growthRate ?? null}, ${notes ?? null}, ${createdBy}
      )
      ON CONFLICT (benchmark_type, content_category, week_start_date)
      DO UPDATE SET
        industry_standard = EXCLUDED.industry_standard,
        edo_ichiba_current = EXCLUDED.edo_ichiba_current,
        edo_ichiba_target = EXCLUDED.edo_ichiba_target,
        actual_value = EXCLUDED.actual_value,
        growth_rate = EXCLUDED.growth_rate,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      message: 'Benchmark data saved successfully'
    });
  } catch (e) {
    console.error('benchmark-data POST error', e);
    
    // テーブルが存在しない場合のエラーハンドリング
    if (e instanceof Error) {
      const errorMessage = e.message;
      if (errorMessage.includes('relation "benchmark_data" does not exist')) {
        return NextResponse.json(
          {
            error: 'table_not_found',
            message: 'benchmark_dataテーブルが存在しません。データベースマイグレーションを適用してください。',
            details: 'benchmark_dataテーブルのマイグレーションファイルを本番環境に適用する必要があります。',
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}
