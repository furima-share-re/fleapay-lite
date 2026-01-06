// app/api/debug/db-status/route.ts
// データベース接続状況とデータ存在確認用デバッグエンドポイント

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL || '';
    const hasDatabaseUrl = !!databaseUrl;
    
    // データベースURLの最初の部分だけ表示（セキュリティ）
    const dbUrlPreview = databaseUrl
      ? `${databaseUrl.substring(0, 30)}...${databaseUrl.substring(databaseUrl.length - 20)}`
      : 'not set';

    // データベース接続テスト
    let dbConnected = false;
    let dbError: string | null = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (error: unknown) {
      dbConnected = false;
      dbError = error instanceof Error ? error.message : 'Unknown error';
    }

    // sellersテーブルの存在確認
    let sellersTableExists = false;
    let sellersCount = 0;
    try {
      const result = await prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int as count FROM sellers`;
      sellersTableExists = true;
      sellersCount = result[0]?.count || 0;
    } catch (error: unknown) {
      sellersTableExists = false;
    }

    // ordersテーブルの存在確認
    let ordersTableExists = false;
    let ordersCount = 0;
    try {
      const result = await prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int as count FROM orders`;
      ordersTableExists = true;
      ordersCount = result[0]?.count || 0;
    } catch (error: unknown) {
      ordersTableExists = false;
    }

    // stripe_paymentsテーブルの存在確認
    let stripePaymentsTableExists = false;
    let stripePaymentsCount = 0;
    try {
      const result = await prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int as count FROM stripe_payments`;
      stripePaymentsTableExists = true;
      stripePaymentsCount = result[0]?.count || 0;
    } catch (error: unknown) {
      stripePaymentsTableExists = false;
    }

    // seller-test01のデータ確認
    let sellerTest01Exists = false;
    let sellerTest01OrdersCount = 0;
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: 'seller-test01' },
        select: { id: true }, // auth_providerカラムが存在しない場合の回避策
      });
      sellerTest01Exists = !!seller;

      if (sellerTest01Exists) {
        const ordersResult = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int as count 
          FROM orders 
          WHERE seller_id = 'seller-test01' AND deleted_at IS NULL
        `;
        sellerTest01OrdersCount = ordersResult[0]?.count || 0;
      }
    } catch (error: unknown) {
      // エラーは無視
    }

    // test-seller-1のデータ確認
    let testSeller1Exists = false;
    let testSeller1OrdersCount = 0;
    let testSeller1OrdersWithMetadata = 0;
    let testSeller1OrdersWithStripe = 0;
    let testSeller1OrdersWithSucceeded = 0;
    let testSeller1OrdersWithCash = 0;
    let testSeller1OrdersWithin90Days = 0;
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: 'test-seller-1' },
        select: { id: true },
      });
      testSeller1Exists = !!seller;

      if (testSeller1Exists) {
        // 全注文数
        const ordersResult = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int as count 
          FROM orders 
          WHERE seller_id = 'test-seller-1' AND deleted_at IS NULL
        `;
        testSeller1OrdersCount = ordersResult[0]?.count || 0;

        // 詳細統計
        const statsResult = await prisma.$queryRaw<Array<{
          with_metadata: number;
          with_stripe: number;
          with_succeeded: number;
          with_cash: number;
          within_90days: number;
        }>>`
          SELECT 
            COUNT(om.order_id)::int as with_metadata,
            COUNT(sp.id)::int as with_stripe,
            COUNT(CASE WHEN sp.status = 'succeeded' THEN 1 END)::int as with_succeeded,
            COUNT(CASE WHEN om.is_cash = true THEN 1 END)::int as with_cash,
            COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '90 days' THEN 1 END)::int as within_90days
          FROM orders o
          LEFT JOIN order_metadata om ON om.order_id = o.id
          LEFT JOIN stripe_payments sp ON sp.order_id = o.id
          WHERE o.seller_id = 'test-seller-1' AND o.deleted_at IS NULL
        `;
        if (statsResult[0]) {
          testSeller1OrdersWithMetadata = statsResult[0].with_metadata || 0;
          testSeller1OrdersWithStripe = statsResult[0].with_stripe || 0;
          testSeller1OrdersWithSucceeded = statsResult[0].with_succeeded || 0;
          testSeller1OrdersWithCash = statsResult[0].with_cash || 0;
          testSeller1OrdersWithin90Days = statsResult[0].within_90days || 0;
        }
      }
    } catch (error: unknown) {
      // エラーは無視
    }

    // すべてのseller_idを取得（デバッグ用）
    let allSellerIds: string[] = [];
    try {
      const sellersResult = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM sellers ORDER BY id LIMIT 10
      `;
      allSellerIds = sellersResult.map(s => s.id);
    } catch (error: unknown) {
      // エラーは無視
    }

    // test-seller-1の全注文（条件なし）を確認
    let testSeller1AllOrdersCount = 0;
    let testSeller1OrdersWithoutDeleted = 0;
    let testSeller1OrdersWithin90DaysRaw = 0;
    try {
      if (testSeller1Exists) {
        // 全注文数（deleted_at条件なし）
        const allOrdersResult = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int as count 
          FROM orders 
          WHERE seller_id = 'test-seller-1'
        `;
        testSeller1AllOrdersCount = allOrdersResult[0]?.count || 0;

        // deleted_at IS NULLの注文数
        const withoutDeletedResult = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int as count 
          FROM orders 
          WHERE seller_id = 'test-seller-1' AND deleted_at IS NULL
        `;
        testSeller1OrdersWithoutDeleted = withoutDeletedResult[0]?.count || 0;

        // 過去90日以内の注文数（クエリ条件なし）
        const within90DaysResult = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int as count 
          FROM orders 
          WHERE seller_id = 'test-seller-1' 
            AND deleted_at IS NULL
            AND created_at >= NOW() - INTERVAL '90 days'
        `;
        testSeller1OrdersWithin90DaysRaw = within90DaysResult[0]?.count || 0;
      }
    } catch (error: unknown) {
      // エラーは無視
    }

    return NextResponse.json({
      status: 'ok',
      database: {
        hasDatabaseUrl,
        dbUrlPreview,
        connected: dbConnected,
        error: dbError,
      },
      tables: {
        sellers: {
          exists: sellersTableExists,
          count: sellersCount,
        },
        orders: {
          exists: ordersTableExists,
          count: ordersCount,
        },
        stripe_payments: {
          exists: stripePaymentsTableExists,
          count: stripePaymentsCount,
        },
      },
      sellerTest01: {
        exists: sellerTest01Exists,
        ordersCount: sellerTest01OrdersCount,
      },
      testSeller1: {
        exists: testSeller1Exists,
        ordersCount: testSeller1OrdersCount,
        ordersAll: testSeller1AllOrdersCount,
        ordersWithoutDeleted: testSeller1OrdersWithoutDeleted,
        ordersWithin90Days: testSeller1OrdersWithin90DaysRaw,
        ordersWithMetadata: testSeller1OrdersWithMetadata,
        ordersWithStripe: testSeller1OrdersWithStripe,
        ordersWithSucceeded: testSeller1OrdersWithSucceeded,
        ordersWithCash: testSeller1OrdersWithCash,
        ordersWithin90DaysFromStats: testSeller1OrdersWithin90Days,
      },
      allSellerIds: allSellerIds,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production',
      },
      message: dbConnected
        ? 'Database is connected. Check table counts to see if data exists.'
        : 'Database connection failed. Check DATABASE_URL environment variable.',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        status: 'error',
        error: errorMessage,
        database: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
        },
      },
      { status: 500 }
    );
  }
}

