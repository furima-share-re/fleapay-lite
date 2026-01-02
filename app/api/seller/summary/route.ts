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
      const subRes = await pool.query(
        `
        SELECT plan_type, started_at, ended_at, status
          FROM seller_subscriptions
         WHERE seller_id = $1
           AND status = 'active'
           AND (ended_at IS NULL OR ended_at > now())
         ORDER BY started_at DESC
         LIMIT 1
        `,
        [sellerId]
      );

      if (subRes.rowCount && subRes.rowCount > 0) {
        planType = subRes.rows[0].plan_type || "standard";
        isSubscribed = (planType === "pro" || planType === "kids");
      }
    } catch (subError) {
      // テーブルが存在しない場合やその他のエラーは無視してデフォルト値を使用
      console.warn("seller_subscriptions table not found or error:", (subError as Error).message);
      // planType = "standard", isSubscribed = false のまま（既に設定済み）
    }

    // ① 売上KPI(JST基準で正しく集計)
    const { todayStart, tomorrowStart } = jstDayBounds();

    const kpiToday = await pool.query(
      `
      SELECT
        COUNT(*) AS cnt,
        -- 売上合計(gross)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
            ELSE 0
          END
        ), 0) AS gross,
        -- 純売上(net)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
            ELSE 0
          END
        ), 0) AS net,
        -- 手数料(fee)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN 0
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN COALESCE(sp.amount_fee, 0)
            ELSE 0
          END
        ), 0) AS fee,
        -- 仕入額(cost)
        COALESCE(SUM(o.cost_amount), 0) AS cost
      FROM orders o
      LEFT JOIN order_metadata  om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.seller_id = $1
        AND o.created_at >= $2
        AND o.created_at <  $3
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true
          OR sp.status = 'succeeded'
        )
      `,
      [sellerId, todayStart, tomorrowStart]
    );

    const todayGross = Number(kpiToday.rows[0]?.gross || 0);
    const todayNet   = Number(kpiToday.rows[0]?.net   || 0);
    const todayFee   = Number(kpiToday.rows[0]?.fee   || 0);
    const todayCost  = Number(kpiToday.rows[0]?.cost  || 0);
    const todayProfit = todayNet - todayCost;
    const countToday = parseInt(String(kpiToday.rows[0]?.cnt || 0), 10) || 0;
    const avgToday   = countToday > 0 ? Math.round(todayNet / countToday) : 0;

    // ② 累計売上KPI(現金+カード統合)
    const kpiTotal = await pool.query(
      `
      SELECT
        -- 売上合計(gross)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
            ELSE 0
          END
        ), 0) AS gross,
        -- 純売上(net)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN o.amount
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
            ELSE 0
          END
        ), 0) AS net,
        -- 手数料(fee)
        COALESCE(SUM(
          CASE 
            WHEN om.is_cash = true THEN 0
            WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN COALESCE(sp.amount_fee, 0)
            ELSE 0
          END
        ), 0) AS fee,
        -- 累計の仕入額も追加
        COALESCE(SUM(o.cost_amount), 0) AS cost
      FROM orders o
      LEFT JOIN order_metadata  om ON om.order_id = o.id
      LEFT JOIN stripe_payments sp ON sp.order_id = o.id
      WHERE o.seller_id = $1
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true
          OR sp.status = 'succeeded'
        )
      `,
      [sellerId]
    );

    // ② 取引履歴(orders を基準に、カードも現金も一緒に出す)
    const recentRes = await pool.query(
      `
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
      WHERE o.seller_id = $1
        AND o.deleted_at IS NULL
        AND (
          om.is_cash = true
          OR sp.status = 'succeeded'
        )
        AND o.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY o.created_at DESC
      `,
      [sellerId]
    );

    const recent = recentRes.rows.map((r: any) => {
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
    const scoreRes = await pool.query(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(ba.customer_type) as with_attrs
      FROM orders o
      LEFT JOIN buyer_attributes ba ON ba.order_id = o.id
      WHERE o.seller_id = $1
        AND o.deleted_at IS NULL
      `,
      [sellerId]
    );
    
    const total = parseInt(String(scoreRes.rows[0]?.total || 0), 10) || 0;
    const withAttrs = parseInt(String(scoreRes.rows[0]?.with_attrs || 0), 10) || 0;
    const dataScore = total > 0 ? Math.round((withAttrs / total) * 100) : 0;

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
        gross: Number(kpiTotal.rows[0]?.gross || 0),
        net:   Number(kpiTotal.rows[0]?.net   || 0),
        fee:   Number(kpiTotal.rows[0]?.fee   || 0),
        cost:  Number(kpiTotal.rows[0]?.cost  || 0),
        profit: Number(kpiTotal.rows[0]?.net || 0) - Number(kpiTotal.rows[0]?.cost || 0)
      },

      // 旧フロント用の互換フィールド
      salesTodayNet: todayNet,
      countToday,
      avgToday,

      dataScore,
      recent
    });
  } catch (error) {
    console.error("seller_summary_error", error);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}

