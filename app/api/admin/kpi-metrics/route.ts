// app/api/admin/kpi-metrics/route.ts
// KPI指標の週次管理API

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

// GET: KPI実績値の取得
export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart'); // YYYY-MM-DD形式
    const category = searchParams.get('category'); // 'tier1', 'tier2', 'tier3'
    const phase = searchParams.get('phase'); // 'phase1', 'phase2', etc.

    let where: any = {};
    if (weekStart) {
      where.week_start_date = weekStart;
    }
    if (category) {
      where.metric_category = category;
    }
    if (phase) {
      where.phase = phase;
    }

    let query = `SELECT * FROM kpi_metrics`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (weekStart) {
      params.push(weekStart);
      conditions.push(`week_start_date = $${params.length}::date`);
    }
    if (category) {
      params.push(category);
      conditions.push(`metric_category = $${params.length}`);
    }
    if (phase) {
      params.push(phase);
      conditions.push(`phase = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY week_start_date DESC, metric_category, metric_key`;

    const metrics = await prisma.$queryRawUnsafe<Array<{
      id: string;
      metric_key: string;
      metric_category: string;
      week_start_date: Date;
      target_value: number | null;
      actual_value: number | null;
      unit: string | null;
      phase: string | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
      created_by: string | null;
    }>>(query, ...params);

    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (e) {
    console.error('kpi-metrics GET error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

// POST: KPI実績値の作成・更新
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
      metricKey,
      metricCategory,
      weekStartDate,
      targetValue,
      actualValue,
      unit,
      phase,
      notes,
      createdBy = 'admin'
    } = body;

    if (!metricKey || !metricCategory || !weekStartDate) {
      return NextResponse.json(
        { error: 'missing_required_fields', message: 'metricKey, metricCategory, weekStartDate are required' },
        { status: 400 }
      );
    }

    // UPSERT処理
    const result = await prisma.$executeRaw`
      INSERT INTO kpi_metrics (
        metric_key, metric_category, week_start_date, target_value, 
        actual_value, unit, phase, notes, created_by
      )
      VALUES (
        ${metricKey}, ${metricCategory}, ${weekStartDate}::date, 
        ${targetValue ?? null}, ${actualValue ?? null}, ${unit ?? null}, 
        ${phase ?? null}, ${notes ?? null}, ${createdBy}
      )
      ON CONFLICT (metric_key, week_start_date)
      DO UPDATE SET
        target_value = EXCLUDED.target_value,
        actual_value = EXCLUDED.actual_value,
        unit = EXCLUDED.unit,
        phase = EXCLUDED.phase,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      message: 'KPI metric saved successfully'
    });
  } catch (e) {
    console.error('kpi-metrics POST error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}
