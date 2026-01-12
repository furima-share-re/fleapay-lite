// app/api/admin/dashboard/daily-stats/route.ts
// 全出店者の日別統計（曜日別平均含む）

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { jstDayBounds, sanitizeError } from '@/lib/utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

// 曜日名を取得（日本語）
function getDayOfWeek(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

// 曜日番号を取得（0=日曜日, 6=土曜日）
function getDayOfWeekNumber(date: Date): number {
  return date.getDay();
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
    const daysParam = url.searchParams.get('days');
    const useAllData = !daysParam; // daysパラメータがない場合は全データ

    const { todayStart } = jstDayBounds();
    const startDate = useAllData ? null : new Date(todayStart.getTime() - (parseInt(daysParam!, 10) - 1) * 24 * 60 * 60 * 1000);
    
    // 日別統計を取得
    const whereConditions: Prisma.Sql[] = [];
    
    // 日付条件（全データの場合は開始日時を指定しない）
    if (!useAllData && startDate) {
      whereConditions.push(Prisma.sql`o.created_at >= ${startDate}`);
    }
    whereConditions.push(Prisma.sql`o.created_at < ${todayStart}`);
    whereConditions.push(Prisma.sql`o.deleted_at IS NULL`);
    whereConditions.push(Prisma.sql`(
      om.is_cash = true
      OR sp.status = 'succeeded'
      OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))
    )`);
    
    const dailyStats = await prisma.$queryRaw<Array<{
      date: Date;
      order_count: bigint;
      gross: bigint;
      net: bigint;
      seller_count: bigint;
    }>>Prisma.sql`
      SELECT
        DATE(o.created_at AT TIME ZONE 'Asia/Tokyo') AS date,
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
        COUNT(DISTINCT o.seller_id)::bigint AS seller_count
      FROM orders o
      LEFT JOIN order_metadata om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE ${Prisma.join(whereConditions, Prisma.sql` AND `)}
      GROUP BY DATE(o.created_at AT TIME ZONE 'Asia/Tokyo')
      ORDER BY date ASC
    `;

    // 日別データを整形
    const dailyData = dailyStats.map(row => {
      const date = new Date(row.date);
      const dayOfWeek = getDayOfWeek(date);
      const dayOfWeekNumber = getDayOfWeekNumber(date);
      const orderCount = Number(row.order_count) || 0;
      const gross = Number(row.gross) || 0;
      const net = Number(row.net) || 0;
      const sellerCount = Number(row.seller_count) || 0;
      
      // 出店者あたりの平均を計算
      const avgGrossPerSeller = sellerCount > 0 ? gross / sellerCount : 0;
      const avgNetPerSeller = sellerCount > 0 ? net / sellerCount : 0;
      const avgOrderCountPerSeller = sellerCount > 0 ? orderCount / sellerCount : 0;

      return {
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        dayOfWeekNumber,
        orderCount,
        gross,
        net,
        sellerCount,
        avgGrossPerSeller: Math.round(avgGrossPerSeller),
        avgNetPerSeller: Math.round(avgNetPerSeller),
        avgOrderCountPerSeller: Math.round(avgOrderCountPerSeller * 100) / 100
      };
    });

    // 曜日別の平均を計算
    const weekdayStats: Record<number, {
      dayName: string;
      totalDays: number;
      totalGross: number;
      totalNet: number;
      totalOrderCount: number;
      totalAvgGrossPerSeller: number; // 各日のavgGrossPerSellerの合計
      totalAvgNetPerSeller: number; // 各日のavgNetPerSellerの合計
      totalAvgOrderCountPerSeller: number; // 各日のavgOrderCountPerSellerの合計
      avgGrossPerDay: number;
      avgNetPerDay: number;
      avgOrderCountPerDay: number;
      avgGrossPerSeller: number;
      avgNetPerSeller: number;
      avgOrderCountPerSeller: number;
    }> = {};

    // 曜日ごとに集計
    dailyData.forEach(day => {
      if (!weekdayStats[day.dayOfWeekNumber]) {
        weekdayStats[day.dayOfWeekNumber] = {
          dayName: day.dayOfWeek,
          totalDays: 0,
          totalGross: 0,
          totalNet: 0,
          totalOrderCount: 0,
          totalAvgGrossPerSeller: 0,
          totalAvgNetPerSeller: 0,
          totalAvgOrderCountPerSeller: 0,
          avgGrossPerDay: 0,
          avgNetPerDay: 0,
          avgOrderCountPerDay: 0,
          avgGrossPerSeller: 0,
          avgNetPerSeller: 0,
          avgOrderCountPerSeller: 0
        };
      }
      
      const stats = weekdayStats[day.dayOfWeekNumber];
      stats.totalDays++;
      stats.totalGross += day.gross;
      stats.totalNet += day.net;
      stats.totalOrderCount += day.orderCount;
      // 各日の「出店者1店舗あたり」の値を合計（後で日数で割って平均を出す）
      stats.totalAvgGrossPerSeller += day.avgGrossPerSeller;
      stats.totalAvgNetPerSeller += day.avgNetPerSeller;
      stats.totalAvgOrderCountPerSeller += day.avgOrderCountPerSeller;
    });

    // 平均を計算
    Object.keys(weekdayStats).forEach(key => {
      const dayNum = parseInt(key, 10);
      const stats = weekdayStats[dayNum];
      if (stats.totalDays > 0) {
        // 1日あたりの平均（全期間の合計を日数で割る）
        stats.avgGrossPerDay = Math.round(stats.totalGross / stats.totalDays);
        stats.avgNetPerDay = Math.round(stats.totalNet / stats.totalDays);
        stats.avgOrderCountPerDay = Math.round((stats.totalOrderCount / stats.totalDays) * 100) / 100;
        
        // 出店者1店舗あたりの平均（各日の平均を合計して日数で割る）
        stats.avgGrossPerSeller = Math.round(stats.totalAvgGrossPerSeller / stats.totalDays);
        stats.avgNetPerSeller = Math.round(stats.totalAvgNetPerSeller / stats.totalDays);
        stats.avgOrderCountPerSeller = Math.round((stats.totalAvgOrderCountPerSeller / stats.totalDays) * 100) / 100;
      }
    });

    // 土日の比較データ
    const saturdayStats = weekdayStats[6] || null;
    const sundayStats = weekdayStats[0] || null;
    
    let weekendComparison: {
      saturday: {
        avgGrossPerDay: number;
        avgNetPerDay: number;
        avgOrderCountPerDay: number;
        avgGrossPerSeller: number;
        avgNetPerSeller: number;
      };
      sunday: {
        avgGrossPerDay: number;
        avgNetPerDay: number;
        avgOrderCountPerDay: number;
        avgGrossPerSeller: number;
        avgNetPerSeller: number;
      };
      higher: 'saturday' | 'sunday';
      difference: number;
      differencePercent: number;
    } | null = null;
    if (saturdayStats && sundayStats) {
      const satHigher = saturdayStats.avgGrossPerDay > sundayStats.avgGrossPerDay;
      const difference = Math.abs(saturdayStats.avgGrossPerDay - sundayStats.avgGrossPerDay);
      const differencePercent = saturdayStats.avgGrossPerDay > 0 
        ? Math.round((difference / saturdayStats.avgGrossPerDay) * 100)
        : 0;

      weekendComparison = {
        saturday: {
          avgGrossPerDay: saturdayStats.avgGrossPerDay,
          avgNetPerDay: saturdayStats.avgNetPerDay,
          avgOrderCountPerDay: saturdayStats.avgOrderCountPerDay,
          avgGrossPerSeller: saturdayStats.avgGrossPerSeller,
          avgNetPerSeller: saturdayStats.avgNetPerSeller
        },
        sunday: {
          avgGrossPerDay: sundayStats.avgGrossPerDay,
          avgNetPerDay: sundayStats.avgNetPerDay,
          avgOrderCountPerDay: sundayStats.avgOrderCountPerDay,
          avgGrossPerSeller: sundayStats.avgGrossPerSeller,
          avgNetPerSeller: sundayStats.avgNetPerSeller
        },
        higher: satHigher ? 'saturday' : 'sunday',
        difference,
        differencePercent
      };
    }

    return NextResponse.json({
      dailyData,
      weekdayStats: Object.values(weekdayStats).sort((a, b) => {
        // 日曜日(0)から土曜日(6)の順に並べる
        const dayOrder = ['日', '月', '火', '水', '木', '金', '土'];
        return dayOrder.indexOf(a.dayName) - dayOrder.indexOf(b.dayName);
      }),
      weekendComparison
    });
  } catch (e) {
    console.error('daily-stats error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

