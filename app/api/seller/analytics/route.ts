// app/api/seller/analytics/route.ts
// Phase 2.6: Express.js廃止 - 売上分析API移行

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jstDayBounds, sanitizeError } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// 日毎の集計関数
async function getDailyAnalytics(sellerId: string, days: number = 30) {
  const { todayStart } = jstDayBounds();
  
  const results: Array<{
    date: string;
    grossSales: number;
    netSales: number;
    totalCost: number;
    profit: number;
    transactionCount: number;
  }> = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const result = await prisma.$queryRaw<Array<{
      transaction_count: bigint;
      gross_sales: bigint;
      net_sales: bigint;
      total_cost: bigint;
    }>>`
      SELECT
        COUNT(*)::bigint AS transaction_count,
        -- 売上合計(gross)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
            WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
            ELSE 0
          END
        ), 0)::bigint AS gross_sales,
        -- 純売上(net)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
            WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
            ELSE 0
          END
        ), 0)::bigint AS net_sales,
        -- 仕入額
        COALESCE(SUM(o.cost_amount), 0)::bigint AS total_cost
      FROM orders o
      LEFT JOIN order_metadata om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.seller_id = ${sellerId}
        AND o.created_at >= ${dayStart}
        AND o.created_at < ${dayEnd}
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true  -- 現金決済は表示
          OR sp.status = 'succeeded'  -- Stripe成功決済は表示
          OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
        )
        -- Stripe未完了（sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
        -- 注意: この条件は app/api/seller/summary/route.ts の kpiToday クエリと一致している必要がある
    `;
    
    const row = result[0] || {};
    const grossSales = Number(row.gross_sales || 0);
    const netSales = Number(row.net_sales || 0);
    const totalCost = Number(row.total_cost || 0);
    const profit = netSales - totalCost;
    const transactionCount = parseInt(String(row.transaction_count || 0), 10);
    
    // 日付文字列（YYYY-MM-DD形式）
    const dateStr = dayStart.toISOString().split('T')[0];
    
    results.push({
      date: dateStr,
      grossSales,
      netSales,
      totalCost,
      profit,
      transactionCount
    });
  }
  
  return results;
}

// 週毎の集計関数
async function getWeeklyAnalytics(sellerId: string, weeks: number = 4) {
  const { todayStart } = jstDayBounds();
  
  // JST基準で今日の0:00を求める（jstDayBoundsの結果を使用）
  const nowUtc = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC+9
  const nowJstMs = nowUtc.getTime() + jstOffset;
  const nowJst = new Date(nowJstMs);
  
  // 週の開始日（月曜日）を求める
  const dayOfWeek = nowJst.getUTCDay(); // 0=日曜, 1=月曜, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日までの日数
  const thisMonday = new Date(todayStart.getTime() - mondayOffset * 24 * 60 * 60 * 1000);
  
  const results: Array<{
    weekStart: string;
    grossSales: number;
    netSales: number;
    totalCost: number;
    profit: number;
    transactionCount: number;
  }> = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(thisMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const result = await prisma.$queryRaw<Array<{
      transaction_count: bigint;
      gross_sales: bigint;
      net_sales: bigint;
      total_cost: bigint;
    }>>`
      SELECT
        COUNT(*)::bigint AS transaction_count,
        -- 売上合計(gross)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
            WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
            ELSE 0
          END
        ), 0)::bigint AS gross_sales,
        -- 純売上(net)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
            WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
            ELSE 0
          END
        ), 0)::bigint AS net_sales,
        -- 仕入額
        COALESCE(SUM(o.cost_amount), 0)::bigint AS total_cost
      FROM orders o
      LEFT JOIN order_metadata om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.seller_id = ${sellerId}
        AND o.created_at >= ${weekStart}
        AND o.created_at < ${weekEnd}
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true  -- 現金決済は表示
          OR sp.status = 'succeeded'  -- Stripe成功決済は表示
          OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
        )
        -- Stripe未完了（sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
        -- 注意: この条件は app/api/seller/summary/route.ts の kpiToday クエリと一致している必要がある
    `;
    
    const row = result[0] || {};
    const grossSales = Number(row.gross_sales || 0);
    const netSales = Number(row.net_sales || 0);
    const totalCost = Number(row.total_cost || 0);
    const profit = netSales - totalCost;
    const transactionCount = parseInt(String(row.transaction_count || 0), 10);
    
    // 週の開始日（YYYY-MM-DD形式）
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    results.push({
      weekStart: weekStartStr,
      grossSales,
      netSales,
      totalCost,
      profit,
      transactionCount
    });
  }
  
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const sellerId = String(request.nextUrl.searchParams.get('s') || '');
    if (!sellerId) {
      return NextResponse.json(
        { ok: false, error: 'seller_id_required' },
        { status: 400 }
      );
    }

    const period = String(request.nextUrl.searchParams.get('period') || 'daily');
    const days = Math.min(parseInt(request.nextUrl.searchParams.get('days') || '30', 10), 90); // 最大90日

    let data;
    if (period === 'daily') {
      data = await getDailyAnalytics(sellerId, days);
    } else if (period === 'weekly') {
      const weeks = Math.ceil(days / 7);
      data = await getWeeklyAnalytics(sellerId, weeks);
    } else {
      return NextResponse.json(
        { ok: false, error: 'invalid_period' },
        { status: 400 }
      );
    }

    // ベンチマークデータの取得（オプショナル）
    const benchmarkData: Record<string, string | number>[] = [];
    try {
      const fs = await import('fs');
      const path = await import('path');
      const csvPath = path.join(process.cwd(), 'data', 'benchmark.csv');
      
      if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());
          
          const row: Record<string, string | number> = {};
          headers.forEach((header, index) => {
            let value: string | number = values[index] || '';
            if (header === 'week' || header === 'base' || header === 'improvement') {
              value = parseInt(value as string, 10) || 0;
            }
            row[header] = value;
          });
          
          benchmarkData.push(row);
        }
      }
    } catch (csvError) {
      console.error('CSV読み込みエラー:', csvError);
      // ベンチマークデータの読み込みに失敗しても続行
    }

    const response: {
      ok: boolean;
      period: string;
      days: number;
      daily?: unknown[];
      weekly?: unknown[];
      data?: unknown;
      benchmark?: Record<string, string | number>[];
    } = { 
      ok: true, 
      period, 
      days,
      ...(period === 'daily' ? { daily: data } : { weekly: data }),
      data,
      benchmark: benchmarkData.length > 0 ? benchmarkData : undefined
    };
    
    // ベンチマークデータがある場合のみ追加
    if (benchmarkData.length > 0) {
      response.benchmark = benchmarkData;
    }
    
    return NextResponse.json(response);
  } catch (e) {
    console.error('Analytics error:', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

