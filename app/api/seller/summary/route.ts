// Phase 2.2: Next.js画面移行（画面単位）
// Express API: /api/seller/summary をNext.js Route Handlerに移行
// payments.js の実装を完全に一致させる
// 旧DB対応: order_metadata, buyer_attributes, cost_amount, deleted_atが存在しない場合に対応

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jstDayBounds } from '@/lib/utils';

// Force dynamic rendering (this route uses nextUrl.searchParams)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sellerId = String(searchParams.get('s') || '');
  
  if (!sellerId) {
    return NextResponse.json(
      { error: 'seller_id_required' },
      { status: 400 }
    );
  }

  try {

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
    // 旧DB対応: order_metadata, cost_amount, deleted_atが存在しない場合に対応
    const { todayStart, tomorrowStart } = jstDayBounds();

    let kpiToday: any[] = [];
    let kpiTotal: any[] = [];
    let recentRes: any[] = [];
    let scoreRes: any[] = [];

    try {
      // まず、テーブルやカラムの存在を確認するために、簡易クエリを実行
      // 旧DBでは、order_metadataやbuyer_attributesが存在しない可能性がある
      // また、ordersテーブルにcost_amountやdeleted_atカラムが存在しない可能性がある

      // ① 今日の売上KPI（旧DB対応: order_metadataが存在しない場合はstripe_paymentsのみ）
      try {
        kpiToday = await prisma.$queryRaw`
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
            AND (
              om.is_cash = true
              OR sp.status = 'succeeded'
            )
        `;
      } catch (e: any) {
        // 旧DB対応: order_metadataやcost_amountが存在しない場合は、stripe_paymentsのみで集計
        console.warn("kpiToday query failed (likely old DB), trying simplified query:", e.message);
        try {
          kpiToday = await prisma.$queryRaw`
            SELECT
              COUNT(*)::int AS cnt,
              COALESCE(SUM(sp.amount_gross), 0)::int AS gross,
              COALESCE(SUM(sp.amount_net), 0)::int AS net,
              COALESCE(SUM(COALESCE(sp.amount_fee, 0)), 0)::int AS fee,
              0::int AS cost
            FROM orders o
            LEFT JOIN stripe_payments sp ON sp.order_id = o.id
            WHERE o.seller_id = ${sellerId}
              AND o.created_at >= ${todayStart}
              AND o.created_at <  ${tomorrowStart}
              AND sp.status = 'succeeded'
          `;
        } catch (e2: any) {
          console.error("kpiToday simplified query also failed:", e2.message);
          kpiToday = [{ cnt: 0, gross: 0, net: 0, fee: 0, cost: 0 }];
        }
      }

      // ② 累計売上KPI
      try {
        kpiTotal = await prisma.$queryRaw`
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
            AND (
              om.is_cash = true
              OR sp.status = 'succeeded'
            )
        `;
      } catch (e: any) {
        // 旧DB対応: order_metadataが存在しない場合は、stripe_paymentsのみで集計
        console.warn("kpiTotal query failed, trying simplified query:", e.message);
        try {
          kpiTotal = await prisma.$queryRaw`
            SELECT
              COALESCE(SUM(sp.amount_gross), 0)::int AS gross,
              COALESCE(SUM(sp.amount_net), 0)::int AS net,
              COALESCE(SUM(COALESCE(sp.amount_fee, 0)), 0)::int AS fee,
              0::int AS cost
            FROM orders o
            LEFT JOIN stripe_payments sp ON sp.order_id = o.id
            WHERE o.seller_id = ${sellerId}
              AND sp.status = 'succeeded'
          `;
        } catch (e2: any) {
          console.error("kpiTotal simplified query also failed:", e2.message);
          kpiTotal = [{ gross: 0, net: 0, fee: 0, cost: 0 }];
        }
      }

      // ② 取引履歴(orders を基準に、カードも現金も一緒に出す)
      try {
        recentRes = await prisma.$queryRaw`
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
            AND (
              om.is_cash = true
              OR sp.status = 'succeeded'
            )
            AND o.created_at >= NOW() - INTERVAL '30 days'
          ORDER BY o.created_at DESC
        `;
      } catch (e: any) {
        // 旧DB対応: order_metadataやbuyer_attributesが存在しない場合は、stripe_paymentsのみで取得
        console.warn("recentRes query failed, trying simplified query:", e.message);
        try {
          recentRes = await prisma.$queryRaw`
            SELECT
              o.id                     AS order_id,
              o.created_at,
              o.amount,
              0                        AS cost_amount,
              o.summary              AS memo,
              NULL                     AS world_price_median,
              NULL                     AS world_price_high,
              NULL                     AS world_price_low,
              0                        AS world_price_sample_count,
              false                    AS is_cash,
              NULL                     AS raw_category,
              CASE
                WHEN sp.id IS NOT NULL THEN 'card'
                ELSE 'other'
              END                      AS payment_method,
              NULL                     AS customer_type,
              NULL                     AS gender,
              NULL                     AS age_band
            FROM orders o
            LEFT JOIN stripe_payments  sp ON sp.order_id = o.id
            WHERE o.seller_id = ${sellerId}
              AND sp.status = 'succeeded'
              AND o.created_at >= NOW() - INTERVAL '30 days'
            ORDER BY o.created_at DESC
          `;
        } catch (e2: any) {
          console.error("recentRes simplified query also failed:", e2.message);
          recentRes = [];
        }
      }

      // ③ データ精度スコア計算(購入者属性が入力された割合)
      try {
        scoreRes = await prisma.$queryRaw`
          SELECT
            COUNT(*)::int as total,
            COUNT(ba.customer_type)::int as with_attrs
          FROM orders o
          LEFT JOIN buyer_attributes ba ON ba.order_id = o.id
          WHERE o.seller_id = ${sellerId}
        `;
      } catch (e: any) {
        // 旧DB対応: buyer_attributesが存在しない場合は、スコア0を返す
        console.warn("scoreRes query failed, using default score:", e.message);
        try {
          scoreRes = await prisma.$queryRaw`
            SELECT
              COUNT(*)::int as total,
              0::int as with_attrs
            FROM orders o
            WHERE o.seller_id = ${sellerId}
          `;
        } catch (e2: any) {
          console.error("scoreRes simplified query also failed:", e2.message);
          scoreRes = [{ total: 0, with_attrs: 0 }];
        }
      }
    } catch (e: any) {
      console.error("Database query error:", e);
      // エラーが発生した場合は、デフォルト値を返す
      kpiToday = [{ cnt: 0, gross: 0, net: 0, fee: 0, cost: 0 }];
      kpiTotal = [{ gross: 0, net: 0, fee: 0, cost: 0 }];
      recentRes = [];
      scoreRes = [{ total: 0, with_attrs: 0 }];
    }

    const todayGross = kpiToday[0]?.gross || 0;
    const todayNet = kpiToday[0]?.net || 0;
    const todayFee = kpiToday[0]?.fee || 0;
    const todayCost = kpiToday[0]?.cost || 0;
    const todayProfit = todayNet - todayCost;
    const countToday = kpiToday[0]?.cnt || 0;
    const avgToday = countToday > 0 ? Math.round(todayNet / countToday) : 0;

    const recent = recentRes.map((r: any) => {
      const amt = Number(r.amount || 0);
      const created = r.created_at;
      const createdSec = created ? Math.floor(new Date(created).getTime() / 1000) : null;

      return {
        // 新しいフィールド名
        orderId: r.order_id,
        createdAt: created,
        amount: amt,
        costAmount: r.cost_amount === null ? null : Number(r.cost_amount || 0),
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

    const totalOrdersForScore = scoreRes[0]?.total || 0;
    const ordersWithAttrs = scoreRes[0]?.with_attrs || 0;
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
        gross: kpiTotal[0]?.gross || 0,
        net:   kpiTotal[0]?.net   || 0,
        fee:   kpiTotal[0]?.fee   || 0,
        cost:  kpiTotal[0]?.cost  || 0,
        profit: (kpiTotal[0]?.net || 0) - (kpiTotal[0]?.cost || 0)
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
    console.error("seller_summary_error details:", {
      sellerId,
      errorMessage: (e as Error).message,
      errorStack: (e as Error).stack,
      databaseUrl: process.env.DATABASE_URL ? 'set' : 'not set',
      nodeEnv: process.env.NODE_ENV,
    });
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    );
  } finally {
  }
}
