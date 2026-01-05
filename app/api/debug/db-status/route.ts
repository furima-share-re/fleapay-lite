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
    } catch (error: any) {
      dbConnected = false;
      dbError = error?.message || 'Unknown error';
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

