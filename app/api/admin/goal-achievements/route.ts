// app/api/admin/goal-achievements/route.ts
// 結果目標の週次管理API

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

// GET: 結果目標実績の取得
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
    const phase = searchParams.get('phase');
    const metricType = searchParams.get('metricType');

    let where: any = {};
    if (weekStart) {
      where.week_start_date = weekStart;
    }
    if (phase) {
      where.phase = phase;
    }
    if (metricType) {
      where.metric_type = metricType;
    }

    let query = `SELECT * FROM goal_achievements`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (weekStart) {
      params.push(weekStart);
      conditions.push(`week_start_date = $${params.length}::date`);
    }
    if (phase) {
      params.push(phase);
      conditions.push(`phase = $${params.length}`);
    }
    if (metricType) {
      params.push(metricType);
      conditions.push(`metric_type = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY week_start_date DESC, phase, metric_type`;

    const achievements = await prisma.$queryRawUnsafe<Array<{
      id: string;
      phase: string;
      metric_type: string;
      week_start_date: Date;
      target_value: number | null;
      actual_value: number | null;
      achievement_rate: number | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
      created_by: string | null;
    }>>(query, ...params);

    return NextResponse.json({
      success: true,
      data: achievements
    });
  } catch (e) {
    console.error('goal-achievements GET error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

// POST: 結果目標実績の作成・更新
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
      phase,
      metricType,
      weekStartDate,
      targetValue,
      actualValue,
      notes,
      createdBy = 'admin'
    } = body;

    if (!phase || !metricType || !weekStartDate) {
      return NextResponse.json(
        { error: 'missing_required_fields', message: 'phase, metricType, weekStartDate are required' },
        { status: 400 }
      );
    }

    // 達成率を計算
    const achievementRate = targetValue && actualValue !== null
      ? (Number(actualValue) / Number(targetValue)) * 100
      : null;

    // UPSERT処理
    await prisma.$executeRaw`
      INSERT INTO goal_achievements (
        phase, metric_type, week_start_date, target_value,
        actual_value, achievement_rate, notes, created_by
      )
      VALUES (
        ${phase}, ${metricType}, ${weekStartDate}::date,
        ${targetValue ?? null}, ${actualValue ?? null},
        ${achievementRate ?? null}, ${notes ?? null}, ${createdBy}
      )
      ON CONFLICT (phase, metric_type, week_start_date)
      DO UPDATE SET
        target_value = EXCLUDED.target_value,
        actual_value = EXCLUDED.actual_value,
        achievement_rate = EXCLUDED.achievement_rate,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      message: 'Goal achievement saved successfully'
    });
  } catch (e) {
    console.error('goal-achievements POST error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}
