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

    let kpiToday: Record<string, unknown>[] = [];
    let kpiTotal: Record<string, unknown>[] = [];
    let recentRes: Record<string, unknown>[] = [];
    let scoreRes: Record<string, unknown>[] = [];

  try {
    console.warn(`[seller/summary] API呼び出し開始: sellerId=${sellerId}`);
    
    // テーブルとカラムの存在確認（旧DBと新DBの両方に対応）
    let hasOrderMetadata = false;
    let hasBuyerAttributes = false;
    let hasCostAmount = false;
    let hasDeletedAt = false;
    let hasWorldPrice = false;

    try {
      const tableCheck = await prisma.$queryRaw<Array<{
        order_metadata_exists: boolean;
        buyer_attributes_exists: boolean;
        cost_amount_exists: boolean;
        deleted_at_exists: boolean;
        world_price_exists: boolean;
      }>>`
        SELECT 
          EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_metadata') as order_metadata_exists,
          EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buyer_attributes') as buyer_attributes_exists,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cost_amount') as cost_amount_exists,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'deleted_at') as deleted_at_exists,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'world_price_median') as world_price_exists
      `;
      
      if (tableCheck.length > 0) {
        hasOrderMetadata = tableCheck[0].order_metadata_exists || false;
        hasBuyerAttributes = tableCheck[0].buyer_attributes_exists || false;
        hasCostAmount = tableCheck[0].cost_amount_exists || false;
        hasDeletedAt = tableCheck[0].deleted_at_exists || false;
        hasWorldPrice = tableCheck[0].world_price_exists || false;
      }
      
      console.warn(`[seller/summary] テーブル存在確認:`, {
        order_metadata: hasOrderMetadata,
        buyer_attributes: hasBuyerAttributes,
        cost_amount: hasCostAmount,
        deleted_at: hasDeletedAt,
        world_price: hasWorldPrice,
      });
    } catch (checkError: unknown) {
      const message = checkError instanceof Error ? checkError.message : 'Unknown error';
      console.warn("[seller/summary] テーブル存在確認エラー（デフォルト値を使用）:", message);
      // エラーが発生した場合は、安全のため全てfalseとして扱う（旧DB想定）
    }

    // ① 今日の売上KPI（旧DB対応: order_metadataが存在しない場合はstripe_paymentsのみ）
    try {
      console.warn(`[seller/summary] kpiToday query開始`);
        // Build query conditionally based on table existence
        if (hasDeletedAt) {
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
              AND o.deleted_at IS NULL
              AND (
                om.is_cash = true  -- 現金決済は表示
                OR sp.status = 'succeeded'  -- Stripe成功決済は表示
                OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
              )
              -- Stripe未完了（sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
          `;
          console.warn(`[seller/summary] kpiToday query成功:`, kpiToday);
        } else {
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
                om.is_cash = true  -- 現金決済は表示
                OR sp.status = 'succeeded'  -- Stripe成功決済は表示
                OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
              )
              -- Stripe未完了（sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
          `;
          console.warn(`[seller/summary] kpiToday query成功:`, kpiToday);
        }
      } catch (e: unknown) {
        // 旧DB対応: order_metadataやcost_amountが存在しない場合は、stripe_paymentsのみで集計
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.warn("kpiToday query failed (likely old DB), trying simplified query:", message);
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
          console.warn(`[seller/summary] kpiToday simplified query成功:`, kpiToday);
        } catch (e2: unknown) {
          const message2 = e2 instanceof Error ? e2.message : 'Unknown error';
          console.error("[seller/summary] kpiToday simplified query also failed:", message2);
          kpiToday = [{ cnt: 0, gross: 0, net: 0, fee: 0, cost: 0 }];
        }
      }

      // ② 累計売上KPI
      try {
        console.warn(`[seller/summary] kpiTotal query開始`);
        if (hasDeletedAt) {
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
              AND o.deleted_at IS NULL
              AND (
                om.is_cash = true  -- 現金決済は表示
                OR sp.status = 'succeeded'  -- Stripe成功決済は表示
                OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
              )
              -- Stripe未完了（sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
          `;
        } else {
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
                om.is_cash = true  -- 現金決済は表示
                OR sp.status = 'succeeded'  -- Stripe成功決済は表示
                OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
              )
              -- Stripe未完了（sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
          `;
        }
        console.warn(`[seller/summary] kpiTotal query成功:`, kpiTotal);
      } catch (e: unknown) {
        // 旧DB対応: order_metadataが存在しない場合は、stripe_paymentsのみで集計
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.warn("[seller/summary] kpiTotal query failed (likely old DB), trying simplified query:", e.message);
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
        } catch (e2: unknown) {
          const message2 = e2 instanceof Error ? e2.message : 'Unknown error';
          console.error("kpiTotal simplified query also failed:", message2);
          kpiTotal = [{ gross: 0, net: 0, fee: 0, cost: 0 }];
        }
      }

      // ② 取引履歴(orders を基準に、カードも現金も一緒に出す)
      try {
        console.warn(`[seller/summary] recentRes query開始`);
        
        // デバッグ: 移行データの状態を確認
        try {
          if (hasDeletedAt) {
            const debugRes = await prisma.$queryRaw<Array<{
              total_orders: bigint;
              with_order_metadata: bigint;
              with_stripe_payments: bigint;
              with_succeeded_status: bigint;
              with_is_cash_true: bigint;
              within_30days: bigint;
              within_90days: bigint;
            }>>`
              SELECT 
                COUNT(*)::bigint as total_orders,
                COUNT(om.order_id)::bigint as with_order_metadata,
                COUNT(sp.id)::bigint as with_stripe_payments,
                COUNT(CASE WHEN sp.status = 'succeeded' THEN 1 END)::bigint as with_succeeded_status,
                COUNT(CASE WHEN om.is_cash = true THEN 1 END)::bigint as with_is_cash_true,
                COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::bigint as within_30days,
                COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '90 days' THEN 1 END)::bigint as within_90days
              FROM orders o
              LEFT JOIN order_metadata om ON om.order_id = o.id
              LEFT JOIN stripe_payments sp ON sp.order_id = o.id
              WHERE o.seller_id = ${sellerId}
                AND o.deleted_at IS NULL
            `;
            // BigIntを文字列に変換してからログ出力
            const debugStats = {
            total_orders: String(debugRes[0].total_orders),
            with_order_metadata: String(debugRes[0].with_order_metadata),
            with_stripe_payments: String(debugRes[0].with_stripe_payments),
            with_succeeded_status: String(debugRes[0].with_succeeded_status),
            with_is_cash_true: String(debugRes[0].with_is_cash_true),
            within_30days: String(debugRes[0].within_30days),
            within_90days: String(debugRes[0].within_90days),
          };
          console.warn(`[seller/summary] デバッグ統計:`, debugStats);
          } else {
            const debugRes = await prisma.$queryRaw<Array<{
              total_orders: bigint;
              with_order_metadata: bigint;
              with_stripe_payments: bigint;
              with_succeeded_status: bigint;
              with_is_cash_true: bigint;
              within_30days: bigint;
              within_90days: bigint;
            }>>`
              SELECT 
                COUNT(*)::bigint as total_orders,
                COUNT(om.order_id)::bigint as with_order_metadata,
                COUNT(sp.id)::bigint as with_stripe_payments,
                COUNT(CASE WHEN sp.status = 'succeeded' THEN 1 END)::bigint as with_succeeded_status,
                COUNT(CASE WHEN om.is_cash = true THEN 1 END)::bigint as with_is_cash_true,
                COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::bigint as within_30days,
                COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '90 days' THEN 1 END)::bigint as within_90days
              FROM orders o
              LEFT JOIN order_metadata om ON om.order_id = o.id
              LEFT JOIN stripe_payments sp ON sp.order_id = o.id
              WHERE o.seller_id = ${sellerId}
            `;
            // BigIntを文字列に変換してからログ出力
            const debugStats = {
            total_orders: String(debugRes[0].total_orders),
            with_order_metadata: String(debugRes[0].with_order_metadata),
            with_stripe_payments: String(debugRes[0].with_stripe_payments),
            with_succeeded_status: String(debugRes[0].with_succeeded_status),
            with_is_cash_true: String(debugRes[0].with_is_cash_true),
            within_30days: String(debugRes[0].within_30days),
            within_90days: String(debugRes[0].within_90days),
          };
          console.warn(`[seller/summary] デバッグ統計:`, debugStats);
          }
        } catch (debugError: unknown) {
          const debugMessage = debugError instanceof Error ? debugError.message : 'Unknown error';
          console.warn(`[seller/summary] デバッグ統計取得エラー:`, debugMessage);
        }
        
        // Build query conditionally based on table existence
        if (hasDeletedAt) {
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
              AND o.deleted_at IS NULL
              AND (
                om.is_cash = true  -- 現金決済は表示
                OR sp.status = 'succeeded'  -- Stripe成功決済は表示
                OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
              )
              -- Stripe未完了（sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
              AND o.created_at >= NOW() - INTERVAL '90 days'  -- 30日から90日に拡張
            ORDER BY o.created_at DESC
          `;
        } else {
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
                om.is_cash = true  -- 現金決済は表示
                OR sp.status = 'succeeded'  -- Stripe成功決済は表示
                OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
              )
              -- Stripe未完了（sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
              AND o.created_at >= NOW() - INTERVAL '90 days'  -- 30日から90日に拡張
            ORDER BY o.created_at DESC
          `;
        }
        console.warn(`[seller/summary] recentRes query成功: ${recentRes.length}件`);
        if (recentRes.length > 0) {
          console.warn(`[seller/summary] recentRes[0]のサンプル:`, JSON.stringify(recentRes[0], null, 2));
        }
      } catch (e: unknown) {
        // 旧DB対応: order_metadataやbuyer_attributesが存在しない場合は、stripe_paymentsのみで取得
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.warn("[seller/summary] recentRes query failed (likely old DB), trying simplified query:", e.message);
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
          console.warn(`[seller/summary] recentRes simplified query成功: ${recentRes.length}件`);
        } catch (e2: unknown) {
          const message2 = e2 instanceof Error ? e2.message : 'Unknown error';
          console.error("[seller/summary] recentRes simplified query also failed:", message2);
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
      } catch (e: unknown) {
        // 旧DB対応: buyer_attributesが存在しない場合は、スコア0を返す
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.warn("scoreRes query failed, using default score:", e.message);
        try {
          scoreRes = await prisma.$queryRaw`
            SELECT
              COUNT(*)::int as total,
              0::int as with_attrs
            FROM orders o
            WHERE o.seller_id = ${sellerId}
          `;
        } catch (e2: unknown) {
          const message2 = e2 instanceof Error ? e2.message : 'Unknown error';
          console.error("scoreRes simplified query also failed:", message2);
          scoreRes = [{ total: 0, with_attrs: 0 }];
        }
      }
    } catch (e: unknown) {
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

    console.warn(`[seller/summary] recentResマッピング開始: ${recentRes.length}件`);
    let recent: Record<string, unknown>[] = [];
    try {
      recent = recentRes.map((r: Record<string, unknown>, index: number) => {
        // デバッグ: 最初の1件だけログ出力
        if (index === 0) {
          console.warn(`[seller/summary] recentRes[0]のキー:`, Object.keys(r));
          console.warn(`[seller/summary] recentRes[0].order_id:`, r.order_id);
          console.warn(`[seller/summary] recentRes[0].created_at:`, r.created_at);
          console.warn(`[seller/summary] recentRes[0].amount:`, r.amount);
          console.warn(`[seller/summary] recentRes[0].is_cash:`, r.is_cash);
          console.warn(`[seller/summary] recentRes[0].payment_method:`, r.payment_method);
          console.warn(`[seller/summary] recentRes[0].cost_amount:`, r.cost_amount);
          console.warn(`[seller/summary] recentRes[0].raw_category:`, r.raw_category);
          console.warn(`[seller/summary] recentRes[0].customer_type:`, r.customer_type);
          console.warn(`[seller/summary] recentRes[0].gender:`, r.gender);
          console.warn(`[seller/summary] recentRes[0].age_band:`, r.age_band);
        }
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
      console.warn(`[seller/summary] recentマッピング完了: ${recent.length}件`);
    } catch (mapError: unknown) {
      const mapMessage = mapError instanceof Error ? mapError.message : 'Unknown error';
      console.error(`[seller/summary] recentマッピングエラー:`, mapMessage);
      console.error(`[seller/summary] recentマッピングエラー詳細:`, mapError);
      recent = [];
    }

    const totalOrdersForScore = scoreRes[0]?.total || 0;
    const ordersWithAttrs = scoreRes[0]?.with_attrs || 0;
    const dataScore = totalOrdersForScore > 0 ? Math.round((ordersWithAttrs / totalOrdersForScore) * 100) : 0;

    console.warn(`[seller/summary] API呼び出し成功: recent=${recent.length}件, countToday=${countToday}`);
    if (recent.length > 0) {
      console.warn(`[seller/summary] recent[0]のサンプル:`, JSON.stringify(recent[0], null, 2));
    }

    const responseData = {
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
    };
    
    console.warn(`[seller/summary] レスポンス準備完了: recent=${responseData.recent.length}件`);
    console.warn(`[seller/summary] レスポンス全体のサイズ:`, JSON.stringify(responseData).length, "bytes");
    
    return NextResponse.json(responseData);
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
