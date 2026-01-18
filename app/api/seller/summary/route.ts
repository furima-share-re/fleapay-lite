// Phase 2.2: Next.js画面移行（画面単位）
// Express API: /api/seller/summary をNext.js Route Handlerに移行
// payments.js の実装を完全に一致させる
// 旧DB対応: order_metadata, buyer_attributes, cost_amount, deleted_atが存在しない場合に対応

import { prisma } from '@/lib/prisma';
import { jstDayBounds, normalizeSellerId } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering (this route uses nextUrl.searchParams)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let sellerId = String(searchParams.get('s') || '');
  
  if (!sellerId) {
    return NextResponse.json(
      { error: 'seller_id_required' },
      { status: 400 }
    );
  }

  // seller_idエイリアス: test-seller-1 → seller-test01
  // データベースにはseller-test01が存在するが、test-seller-1でアクセスされる可能性があるため
  sellerId = normalizeSellerId(sellerId);

  try {
    const sellerProfile = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { shopName: true, displayName: true }
    });

    // 0) サブスク状態の判定(履歴テーブルから現在プランを取得)
    let planType = "standard";
    let isSubscribed = false;
    
    // テストユーザーは常に全機能を利用できるようにする（test-seller-で始まるID）
    const isTestUser = sellerId.startsWith('test-seller-') || sellerId.startsWith('seller-test');
    
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
    
    // テストユーザーの場合は強制的にkidsプランとして扱う（全機能利用可能：通常機能 + キッズ機能）
    if (isTestUser) {
      planType = 'kids';
      isSubscribed = true;
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
    let hasPaymentState = false;

    try {
      const tableCheck = await prisma.$queryRaw<Array<{
        order_metadata_exists: boolean;
        buyer_attributes_exists: boolean;
        cost_amount_exists: boolean;
        deleted_at_exists: boolean;
        world_price_exists: boolean;
        payment_state_exists: boolean;
      }>>`
        SELECT 
          EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_metadata') as order_metadata_exists,
          EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buyer_attributes') as buyer_attributes_exists,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cost_amount') as cost_amount_exists,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'deleted_at') as deleted_at_exists,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'world_price_median') as world_price_exists,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_metadata' AND column_name = 'payment_state') as payment_state_exists
      `;
      
      if (tableCheck.length > 0) {
        hasOrderMetadata = tableCheck[0].order_metadata_exists || false;
        hasBuyerAttributes = tableCheck[0].buyer_attributes_exists || false;
        hasCostAmount = tableCheck[0].cost_amount_exists || false;
        hasDeletedAt = tableCheck[0].deleted_at_exists || false;
        hasWorldPrice = tableCheck[0].world_price_exists || false;
        hasPaymentState = tableCheck[0].payment_state_exists || false;
      }
      
      console.warn(`[seller/summary] テーブル存在確認:`, {
        order_metadata: hasOrderMetadata,
        buyer_attributes: hasBuyerAttributes,
        cost_amount: hasCostAmount,
        deleted_at: hasDeletedAt,
        world_price: hasWorldPrice,
        payment_state: hasPaymentState,
      });
    } catch (checkError: unknown) {
      const message = checkError instanceof Error ? checkError.message : 'Unknown error';
      console.warn("[seller/summary] テーブル存在確認エラー（デフォルト値を使用）:", message);
      // エラーが発生した場合は、安全のため全てfalseとして扱う（旧DB想定）
    }

    // ① 今日の売上KPI（★ payment_stateを使用してシンプルに集計）
    try {
      console.warn(`[seller/summary] kpiToday query開始`);
        // Build query conditionally based on table existence
        if (hasPaymentState && hasDeletedAt) {
          // ★ 新しいクエリ: payment_stateを使用（シンプル！）
          kpiToday = await prisma.$queryRaw`
            SELECT
              COUNT(*)::int AS cnt,
              COALESCE(SUM(
                CASE 
                  WHEN om.payment_state = 'stripe_completed' THEN sp.amount_gross
                  WHEN om.payment_state = 'cash_completed' THEN o.amount
                  ELSE 0
                END
              ), 0)::int AS gross,
              COALESCE(SUM(
                CASE 
                  WHEN om.payment_state = 'stripe_completed' THEN sp.amount_net
                  WHEN om.payment_state = 'cash_completed' THEN o.amount
                  ELSE 0
                END
              ), 0)::int AS net,
              COALESCE(SUM(
                CASE 
                  WHEN om.payment_state = 'stripe_completed' THEN COALESCE(sp.amount_fee, 0)
                  ELSE 0
                END
              ), 0)::int AS fee,
              COALESCE(SUM(o.cost_amount), 0)::int AS cost
            FROM orders o
            JOIN order_metadata om ON o.id = om.order_id
            LEFT JOIN stripe_payments sp ON o.id = sp.order_id
            WHERE o.seller_id = ${sellerId}
              AND o.created_at >= ${todayStart}
              AND o.created_at <  ${tomorrowStart}
              AND o.deleted_at IS NULL
              AND om.payment_state IN ('cash_completed', 'stripe_completed')
          `;
          console.warn(`[seller/summary] kpiToday query成功 (payment_state使用):`, kpiToday);
        } else if (hasDeletedAt) {
          // 旧クエリ: payment_stateが存在しない場合
          kpiToday = await prisma.$queryRaw`
            SELECT
              COUNT(*)::int AS cnt,
              COALESCE(SUM(
                CASE
                  WHEN om.is_cash = true THEN o.amount
                  WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
                  WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
                  ELSE 0
                END
              ), 0)::int AS gross,
              COALESCE(SUM(
                CASE
                  WHEN om.is_cash = true THEN o.amount
                  WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
                  WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
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
                OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))  -- Stripe決済がないが、現金決済またはメタデータがない場合（移行データ）は表示
              )
              -- QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL または sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
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
                  WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
                  ELSE 0
                END
              ), 0)::int AS gross,
              COALESCE(SUM(
                CASE
                  WHEN om.is_cash = true THEN o.amount
                  WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
                  WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
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

      // ② 累計売上KPI（★ payment_stateを使用してシンプルに集計）
      try {
        console.warn(`[seller/summary] kpiTotal query開始`);
        if (hasPaymentState && hasDeletedAt) {
          // ★ 新しいクエリ: payment_stateを使用（シンプル！）
          kpiTotal = await prisma.$queryRaw`
            SELECT
              COALESCE(SUM(
                CASE 
                  WHEN om.payment_state = 'stripe_completed' THEN sp.amount_gross
                  WHEN om.payment_state = 'cash_completed' THEN o.amount
                  ELSE 0
                END
              ), 0)::int AS gross,
              COALESCE(SUM(
                CASE 
                  WHEN om.payment_state = 'stripe_completed' THEN sp.amount_net
                  WHEN om.payment_state = 'cash_completed' THEN o.amount
                  ELSE 0
                END
              ), 0)::int AS net,
              COALESCE(SUM(
                CASE 
                  WHEN om.payment_state = 'stripe_completed' THEN COALESCE(sp.amount_fee, 0)
                  ELSE 0
                END
              ), 0)::int AS fee,
              COALESCE(SUM(o.cost_amount), 0)::int AS cost
            FROM orders o
            JOIN order_metadata om ON o.id = om.order_id
            LEFT JOIN stripe_payments sp ON o.id = sp.order_id
            WHERE o.seller_id = ${sellerId}
              AND o.deleted_at IS NULL
              AND om.payment_state IN ('cash_completed', 'stripe_completed')
          `;
          console.warn(`[seller/summary] kpiTotal query成功 (payment_state使用):`, kpiTotal);
        } else if (hasDeletedAt) {
          // 旧クエリ: payment_stateが存在しない場合
          kpiTotal = await prisma.$queryRaw`
            SELECT
              COALESCE(SUM(
                CASE
                  WHEN om.is_cash = true THEN o.amount
                  WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
                  WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
                  ELSE 0
                END
              ), 0)::int AS gross,
              COALESCE(SUM(
                CASE
                  WHEN om.is_cash = true THEN o.amount
                  WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
                  WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
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
                OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))  -- Stripe決済がないが、現金決済またはメタデータがない場合（移行データ）は表示
              )
              -- QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL または sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
          `;
        } else {
          kpiTotal = await prisma.$queryRaw`
            SELECT
              COALESCE(SUM(
                CASE
                  WHEN om.is_cash = true THEN o.amount
                  WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
                  WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
                  ELSE 0
                END
              ), 0)::int AS gross,
              COALESCE(SUM(
                CASE
                  WHEN om.is_cash = true THEN o.amount
                  WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
                  WHEN sp.id IS NULL THEN o.amount  -- Stripe決済がない場合はorders.amountを使用
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
                OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))  -- Stripe決済がないが、現金決済またはメタデータがない場合（移行データ）は表示
              )
              -- QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL または sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
          `;
        }
        console.warn(`[seller/summary] kpiTotal query成功:`, kpiTotal);
      } catch (e: unknown) {
        // 旧DB対応: order_metadataが存在しない場合は、stripe_paymentsのみで集計
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.warn("[seller/summary] kpiTotal query failed (likely old DB), trying simplified query:", message);
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
              o.status                AS order_status,
              o.world_price_median,
              o.world_price_high,
              o.world_price_low,
              o.world_price_sample_count,
              COALESCE(om.is_cash, false) AS is_cash,
              om.category            AS raw_category,
              -- ⚠️ payment_methodは計算フィールド（DBに保存しない）
              CASE
                WHEN om.is_cash THEN 'cash'
                WHEN sp.id IS NOT NULL THEN 'card'
                ELSE 'other'
              END                      AS payment_method,
              sp.status               AS payment_status,
              ba.customer_type,
              ba.gender,
              ba.age_band
            FROM orders o
            LEFT JOIN order_metadata   om ON om.order_id = o.id
            LEFT JOIN stripe_payments  sp ON sp.order_id = o.id
            LEFT JOIN buyer_attributes ba ON ba.order_id = o.id
            WHERE o.seller_id = ${sellerId}
              AND o.deleted_at IS NULL
              -- QR決済データが作られているが決済完了していない取引は除外
              AND (
                om.is_cash = true  -- 現金決済は表示
                OR sp.status = 'succeeded'  -- Stripe成功決済は表示
                OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))  -- Stripe決済がないが、現金決済またはメタデータがない場合（移行データ）は表示
              )
              -- QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL または sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
              AND o.created_at >= NOW() - INTERVAL '90 days'  -- 過去90日以内
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
              o.status                AS order_status,
              o.world_price_median,
              o.world_price_high,
              o.world_price_low,
              o.world_price_sample_count,
              COALESCE(om.is_cash, false) AS is_cash,
              om.category            AS raw_category,
              -- ⚠️ payment_methodは計算フィールド（DBに保存しない）
              CASE
                WHEN om.is_cash THEN 'cash'
                WHEN sp.id IS NOT NULL THEN 'card'
                ELSE 'other'
              END                      AS payment_method,
              sp.status               AS payment_status,
              ba.customer_type,
              ba.gender,
              ba.age_band
            FROM orders o
            LEFT JOIN order_metadata   om ON om.order_id = o.id
            LEFT JOIN stripe_payments  sp ON sp.order_id = o.id
            LEFT JOIN buyer_attributes ba ON ba.order_id = o.id
            WHERE o.seller_id = ${sellerId}
              -- QR決済データが作られているが決済完了していない取引は除外
              AND (
                om.is_cash = true  -- 現金決済は表示
                OR sp.status = 'succeeded'  -- Stripe成功決済は表示
                OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))  -- Stripe決済がないが、現金決済またはメタデータがない場合（移行データ）は表示
              )
              -- QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL または sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
              AND o.created_at >= NOW() - INTERVAL '90 days'  -- 過去90日以内
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
        console.warn("[seller/summary] recentRes query failed (likely old DB), trying simplified query:", message);
        try {
          recentRes = await prisma.$queryRaw`
            SELECT
              o.id                     AS order_id,
              o.created_at,
              o.amount,
              0                        AS cost_amount,
              o.summary              AS memo,
              o.status                AS order_status,
              NULL                     AS world_price_median,
              NULL                     AS world_price_high,
              NULL                     AS world_price_low,
              0                        AS world_price_sample_count,
              false                    AS is_cash,  -- 旧DB対応: order_metadataが存在しない場合はfalse
              NULL                     AS raw_category,
              -- ⚠️ payment_methodは計算フィールド（DBに保存しない）
              CASE
                WHEN sp.id IS NOT NULL THEN 'card'
                ELSE 'other'
              END                      AS payment_method,
              sp.status               AS payment_status,
              NULL                     AS customer_type,
              NULL                     AS gender,
              NULL                     AS age_band
            FROM orders o
            LEFT JOIN stripe_payments  sp ON sp.order_id = o.id
            WHERE o.seller_id = ${sellerId}
              -- QR決済データが作られているが決済完了していない取引は除外
              AND (
                sp.status = 'succeeded'  -- Stripe成功決済は表示
                OR sp.id IS NULL  -- 旧DB対応: Stripe決済がない場合（現金決済または移行データの可能性）
              )
              -- QR決済データが作られているが決済完了していない（sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
              -- 注意: 旧DBではorder_metadataがないため、om.is_cashで判定できない
              AND o.created_at >= NOW() - INTERVAL '90 days'  -- 過去90日以内
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
        console.warn("scoreRes query failed, using default score:", message);
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

    const todayGross = Number(kpiToday[0]?.gross) || 0;
    const todayNet = Number(kpiToday[0]?.net) || 0;
    const todayFee = Number(kpiToday[0]?.fee) || 0;
    const todayCost = Number(kpiToday[0]?.cost) || 0;
    const todayProfit = todayNet - todayCost;
    let countToday = Number(kpiToday[0]?.cnt) || 0;
    let avgToday = countToday > 0 ? Math.round(todayNet / countToday) : 0;

    console.warn(`[seller/summary] recentResマッピング開始: ${recentRes.length}件`);
    let recent: Record<string, unknown>[] = [];
    try {
      recent = recentRes.map((r: Record<string, unknown>, index: number) => {
        // デバッグ: 最初の5件のログ出力（入力まち判定に必要なフィールド）
        if (index < 5) {
          console.warn(`[seller/summary] recentRes[${index}] データ:`, {
            order_id: r.order_id,
            cost_amount: r.cost_amount,
            raw_category: r.raw_category,
            customer_type: r.customer_type,
            gender: r.gender,
            age_band: r.age_band,
            // 生データの確認
            customer_type_raw: r.customer_type,
            gender_raw: r.gender,
            age_band_raw: r.age_band,
          });
        }
        const amt = Number(r.amount || 0);
        const created = r.created_at;
        const createdSec = created && (typeof created === 'string' || created instanceof Date) 
          ? Math.floor(new Date(created).getTime() / 1000) 
          : null;

      // nullの場合はnullのまま返す（データが存在しない場合と"unknown"を区別するため）
      const customerType = r.customer_type === null || r.customer_type === undefined ? null : String(r.customer_type);
      const gender = r.gender === null || r.gender === undefined ? null : String(r.gender);
      const ageBand = r.age_band === null || r.age_band === undefined ? null : String(r.age_band);
      
      // デバッグ: 最初の5件のマッピング結果をログ出力
      if (index < 5) {
        console.warn(`[seller/summary] recentRes[${index}] マッピング後:`, {
          order_id: r.order_id,
          is_cash_raw: r.is_cash,
          is_cash_type: typeof r.is_cash,
          isCash: r.is_cash === true,
          status: (r.is_cash === true) ? "現金" : "通常",
          costAmount: r.cost_amount === null ? null : Number(r.cost_amount || 0),
          rawCategory: r.raw_category,
          customerType,
          gender,
          ageBand,
        });
      }

      // 決済ステータスの判定
      const orderStatus = r.order_status ? String(r.order_status) : null;
      const paymentStatus = r.payment_status ? String(r.payment_status) : null;
      const isPaid = orderStatus === 'paid' || paymentStatus === 'succeeded';

      return {
        // 新しいフィールド名
        orderId: r.order_id,
        createdAt: created,
        amount: amt,
        costAmount: r.cost_amount === null ? null : Number(r.cost_amount || 0),
        memo: r.memo || "",
        orderStatus: orderStatus,
        paymentStatus: paymentStatus,
        isPaid: isPaid,
        // 世界相場(参考)
        worldMedian: r.world_price_median,
        worldHigh: r.world_price_high,
        worldLow: r.world_price_low,
        worldSampleCount: r.world_price_sample_count,
        // is_cashがnullの場合はfalseとして扱う（order_metadataが存在しない場合）
        isCash: r.is_cash === true,
        rawCategory: r.raw_category,
        // ⚠️ paymentMethodは計算フィールド（DBに保存されていない、互換性のため返す）
        paymentMethod: r.payment_method,
        customerType,
        gender,
        ageBand,

        // 旧フロント互換フィールド
        created: createdSec,
        summary: r.memo || "",
        net_amount: amt,
        status: (r.is_cash === true) ? "現金" : "通常",
        is_cash: r.is_cash === true,
        raw_category: r.raw_category,
        payment_method: r.payment_method,
        customer_type: customerType,
        age_band: ageBand,

        // 旧コードが想定していた buyer オブジェクト
        buyer: {
          customer_type: customerType,
          gender: gender,
          age_band: ageBand,
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

    const totalOrdersForScore = Number(scoreRes[0]?.total) || 0;
    const ordersWithAttrs = Number(scoreRes[0]?.with_attrs) || 0;
    const dataScore = totalOrdersForScore > 0 ? Math.round((ordersWithAttrs / totalOrdersForScore) * 100) : 0;

    // 🔍 検証: recentResから今日の取引を抽出して、kpiTodayと比較
    // 取引履歴と売上カウントの整合性を確保するため
    try {
      let countTodayFromRecent = 0;
      
      for (const r of recentRes) {
        const created = r.created_at;
        if (!created) continue;
        
        if (typeof created === 'string' || created instanceof Date) {
          const createdDate = new Date(created);
          if (createdDate >= todayStart && createdDate < tomorrowStart) {
            countTodayFromRecent += 1;
          }
        }
      }
      
      // 不一致を検出した場合、recentResから計算した値を優先（取引履歴と一致させる）
      if (countTodayFromRecent !== countToday) {
        console.warn(`[seller/summary] ⚠️ カウント不一致検出: kpiToday=${countToday}, recentResから=${countTodayFromRecent}`);
        console.warn(`[seller/summary] ⚠️ recentResから計算した値を優先します（取引履歴と一致）`);
        
        // countTodayを更新（取引履歴と一致させる）
        countToday = countTodayFromRecent;
        
        // avgTodayを再計算
        avgToday = countToday > 0 ? Math.round(todayNet / countToday) : 0;
      } else {
        console.warn(`[seller/summary] ✅ カウント一致: countToday=${countToday}`);
      }
    } catch (verifyError: unknown) {
      const verifyMessage = verifyError instanceof Error ? verifyError.message : 'Unknown error';
      console.warn(`[seller/summary] recentRes検証エラー（kpiTodayの値を使用）:`, verifyMessage);
    }

    console.warn(`[seller/summary] API呼び出し成功: recent=${recent.length}件, countToday=${countToday}`);
    if (recent.length > 0) {
      console.warn(`[seller/summary] recent[0]のサンプル:`, JSON.stringify(recent[0], null, 2));
    }

    const responseData = {
      sellerId,
      shopName: sellerProfile?.shopName || null,
      displayName: sellerProfile?.displayName || null,
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
        profit: (Number(kpiTotal[0]?.net) || 0) - (Number(kpiTotal[0]?.cost) || 0)
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
