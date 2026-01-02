// Phase 2.2: Next.js画面移行（画面単位）
// Express API: /api/seller/summary をNext.js Route Handlerに移行
// payments.js の実装を完全に一致させる

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jstDayBounds } from '@/lib/utils';

const prisma = new PrismaClient();

// Force dynamic rendering (this route uses nextUrl.searchParams)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sellerId = String(searchParams.get('s') || '');
    
    if (!sellerId) {
      return NextResponse.json(
        { error: 'seller_id_required' },
        { status: 400 }
      );
    }

    // 0) サブスク状態の判定(履歴テーブルから現在プランを取得)
    let planType = "standard";
    let isSubscribed = false;
    
    try {
      const sub = await prisma.sellerSubscription.findFirst({
        where: {
          sellerId: sellerId,
          status: 'active',
          OR: [
            { endedAt: null },
            { endedAt: { gt: new Date() } },
          ],
        },
        orderBy: { startedAt: 'desc' },
      });

      if (sub) {
        planType = sub.planType as 'standard' | 'pro' | 'kids';
        isSubscribed = (planType === 'pro' || planType === 'kids');
      }
    } catch (subError) {
      // テーブルが存在しない場合やその他のエラーは無視してデフォルト値を使用
      console.warn("seller_subscriptions table not found or error (Prisma):", (subError as Error).message);
      // planType = "standard", isSubscribed = false のまま（既に設定済み）
    }

    // ① 売上KPI(JST基準で正しく集計)
    const { todayStart, tomorrowStart } = jstDayBounds();

    const kpiToday = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS cnt,
        COALESCE(SUM(
          CASE
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
            ELSE 0
          END
        ), 0)::int AS gross,
        COALESCE(SUM(
          CASE
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
            ELSE 0
          END
        ), 0)::int AS net,
        COALESCE(SUM(
          CASE
            WHEN om.is_cash = true THEN 0
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN COALESCE(sp.amount_fee, 0)
            ELSE 0
          END
        ), 0)::int AS fee,
        COALESCE(SUM(o.cost_amount), 0)::int AS cost
      FROM orders o
      LEFT JOIN order_metadata  om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.seller_id = ${sellerId}
        AND o.created_at >= ${todayStart}
        AND o.created_at <  ${tomorrowStart}
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true
          OR sp.status = 'succeeded'
        )
    `;

    const todayGross = (kpiToday as any[])[0]?.gross || 0;
    const todayNet = (kpiToday as any[])[0]?.net || 0;
    const todayFee = (kpiToday as any[])[0]?.fee || 0;
    const todayCost = (kpiToday as any[])[0]?.cost || 0;
    const todayProfit = todayNet - todayCost;
    const countToday = (kpiToday as any[])[0]?.cnt || 0;
    const avgToday = countToday > 0 ? Math.round(todayNet / countToday) : 0;

    // ② 累計売上KPI(現金+カード統合)
    const kpiTotal = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
            ELSE 0
          END
        ), 0)::int AS gross,
        COALESCE(SUM(
          CASE
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
            ELSE 0
          END
        ), 0)::int AS net,
        COALESCE(SUM(
          CASE
            WHEN om.is_cash = true THEN 0
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN COALESCE(sp.amount_fee, 0)
            ELSE 0
          END
        ), 0)::int AS fee,
        COALESCE(SUM(o.cost_amount), 0)::int AS cost
      FROM orders o
      LEFT JOIN order_metadata  om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.seller_id = ${sellerId}
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true
          OR sp.status = 'succeeded'
        )
    `;

    // ② 取引履歴(orders を基準に、カードも現金も一緒に出す)
    const recentRes = await prisma.$queryRaw`
      SELECT
        o.id                     AS order_id,
        o.created_at,
        o.amount,
        o.cost_amount,
        o.summary              AS memo,
        o.world_price_median,
        o.world_price_high,
        o.world_price_low,
        o.world_price_sample_count,
        om.is_cash,
        om.category            AS raw_category,
        CASE
          WHEN om.is_cash THEN 'cash'
          WHEN sp.id IS NOT NULL THEN 'card'
          ELSE 'other'
        END                      AS payment_method,
        ba.customer_type,
        ba.gender,
        ba.age_band
      FROM orders o
      LEFT JOIN order_metadata   om ON om.order_id = o.id
      LEFT JOIN stripe_payments  sp ON sp.order_id = o.id
      LEFT JOIN buyer_attributes ba ON ba.order_id = o.id
      WHERE o.seller_id = ${sellerId}
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true
          OR sp.status = 'succeeded'
        )
        AND o.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY o.created_at DESC
    `;

    const recent = (recentRes as any[]).map((r: any) => {
      const amt = Number(r.amount || 0);
      const created = r.created_at;
      const createdSec = created ? Math.floor(new Date(created).getTime() / 1000) : null;

      return {
        // 新しいフィールド名
        orderId: r.order_id,
        createdAt: created,
        amount: amt,
        costAmount: r.cost_amount === null ? null : Number(r.cost_amount),
        memo: r.memo || "",
        // 世界相場(参考)
        worldMedian: r.world_price_median,
        worldHigh: r.world_price_high,
        worldLow: r.world_price_low,
        worldSampleCount: r.world_price_sample_count,
        isCash: !!r.is_cash,
        rawCategory: r.raw_category,
        paymentMethod: r.payment_method,
        customerType: r.customer_type || "unknown",
        gender: r.gender || "unknown",
        ageBand: r.age_band || "unknown",

        // 旧フロント互換フィールド
        created: createdSec,
        summary: r.memo || "",
        net_amount: amt,
        status: r.is_cash ? "現金" : "通常",
        is_cash: !!r.is_cash,
        raw_category: r.raw_category,
        payment_method: r.payment_method,
        customer_type: r.customer_type || "unknown",
        age_band: r.age_band || "unknown",

        // 旧コードが想定していた buyer オブジェクト
        buyer: {
          customer_type: r.customer_type || "unknown",
          gender: r.gender || "unknown",
          age_band: r.age_band || "unknown",
        },
      };
    });

    // ③ データ精度スコア計算(購入者属性が入力された割合)
    const scoreRes = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int as total,
        COUNT(ba.customer_type)::int as with_attrs
      FROM orders o
      LEFT JOIN buyer_attributes ba ON ba.order_id = o.id
      WHERE o.seller_id = ${sellerId}
        AND o.deleted_at IS NULL
    `;
    
    const totalOrdersForScore = (scoreRes as any[])[0]?.total || 0;
    const ordersWithAttrs = (scoreRes as any[])[0]?.with_attrs || 0;
    const dataScore = totalOrdersForScore > 0 ? Math.round((ordersWithAttrs / totalOrdersForScore) * 100) : 0;

    return NextResponse.json({
      sellerId,
      planType,
      isSubscribed,

      // 新フォーマット
      salesToday: {
        gross: todayGross,
        net:   todayNet,
        fee:   todayFee,
        cost:  todayCost,
        profit: todayProfit,
        count: countToday,
        avgNet: avgToday,
      },
      salesTotal: {
        gross: (kpiTotal as any[])[0]?.gross || 0,
        net:   (kpiTotal as any[])[0]?.net   || 0,
        fee:   (kpiTotal as any[])[0]?.fee   || 0,
        cost:  (kpiTotal as any[])[0]?.cost  || 0,
        profit: ((kpiTotal as any[])[0]?.net || 0) - ((kpiTotal as any[])[0]?.cost || 0)
      },

      // 旧フロント用の互換フィールド
      salesTodayNet: todayNet,
      countToday,
      avgToday,

      dataScore,
      recent
    });
  } catch (e) {
    console.error("seller_summary_error (Next.js):", e);
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

