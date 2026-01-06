// lib/sql-conditions.ts
// SQL条件の共通化と整合性管理

import { Prisma, PrismaClient } from '@prisma/client';

/**
 * 取引データのフィルタリング条件
 * 
 * この関数は、取引一覧、サマリー、グラフなどで使用される共通のSQL条件を提供します。
 * 条件を変更する場合は、この関数のみを修正すれば全ての箇所に反映されます。
 * 
 * @param sellerId - 販売者ID
 * @param hasDeletedAt - deleted_atカラムが存在するかどうか
 * @returns Prisma.sql オブジェクト（WHERE条件部分）
 * 
 * 表示する取引:
 * - 削除済みでない（deleted_at IS NULL）
 * - 現金決済（om.is_cash = true）
 * - Stripe成功決済（sp.status = 'succeeded'）
 * - Stripe決済がないが、現金決済またはメタデータがない場合（移行データ対応）
 * 
 * 除外する取引:
 * - 削除済み（deleted_at IS NOT NULL）
 * - QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL）
 * - Stripe決済データがあるが未完了（sp.id IS NOT NULL AND sp.status != 'succeeded'）
 */
export function buildOrderFilterConditions(
  sellerId: string,
  hasDeletedAt: boolean = true
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`o.seller_id = ${sellerId}`
  ];

  // 削除済みチェック（カラムが存在する場合のみ）
  if (hasDeletedAt) {
    conditions.push(Prisma.sql`o.deleted_at IS NULL`);
  }

  // 決済方法のフィルタリング
  // 現金決済、Stripe成功決済、またはStripe決済がない場合を表示
  // QR決済データが作られているが決済完了していない（om.is_cash = false AND sp.id IS NULL または sp.id IS NOT NULL AND sp.status != 'succeeded'）は除外
  conditions.push(
    Prisma.sql`(
      om.is_cash = true  -- 現金決済は表示
      OR sp.status = 'succeeded'  -- Stripe成功決済は表示
      OR (sp.id IS NULL AND (om.is_cash = true OR om.is_cash IS NULL))  -- Stripe決済がないが、現金決済またはメタデータがない場合（移行データ）は表示
    )`
  );

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

/**
 * 日付範囲を追加した取引フィルタリング条件
 * 
 * @param sellerId - 販売者ID
 * @param startDate - 開始日時（UTC）
 * @param endDate - 終了日時（UTC）
 * @param hasDeletedAt - deleted_atカラムが存在するかどうか
 * @returns Prisma.sql オブジェクト（WHERE条件部分）
 */
export function buildOrderFilterConditionsWithDateRange(
  sellerId: string,
  startDate: Date,
  endDate: Date,
  hasDeletedAt: boolean = true
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`o.seller_id = ${sellerId}`,
    Prisma.sql`o.created_at >= ${startDate}`,
    Prisma.sql`o.created_at < ${endDate}`
  ];

  // 削除済みチェック（カラムが存在する場合のみ）
  if (hasDeletedAt) {
    conditions.push(Prisma.sql`o.deleted_at IS NULL`);
  }

  // 決済方法のフィルタリング
  conditions.push(
    Prisma.sql`(
      om.is_cash = true  -- 現金決済は表示
      OR sp.status = 'succeeded'  -- Stripe成功決済は表示
      OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
    )`
  );

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

/**
 * 相対日付範囲を追加した取引フィルタリング条件
 * 
 * @param sellerId - 販売者ID
 * @param daysAgo - 何日前から（例: 30 = 30日前から）
 * @param hasDeletedAt - deleted_atカラムが存在するかどうか
 * @returns Prisma.sql オブジェクト（WHERE条件部分）
 */
export function buildOrderFilterConditionsWithRelativeDate(
  sellerId: string,
  daysAgo: number,
  hasDeletedAt: boolean = true
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`o.seller_id = ${sellerId}`,
    Prisma.sql`o.created_at >= NOW() - INTERVAL '${daysAgo} days'`
  ];

  // 削除済みチェック（カラムが存在する場合のみ）
  if (hasDeletedAt) {
    conditions.push(Prisma.sql`o.deleted_at IS NULL`);
  }

  // 決済方法のフィルタリング
  conditions.push(
    Prisma.sql`(
      om.is_cash = true  -- 現金決済は表示
      OR sp.status = 'succeeded'  -- Stripe成功決済は表示
      OR sp.id IS NULL  -- Stripe決済がない場合も表示（現金かその他の決済）
    )`
  );

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

/**
 * 売上金額計算用のCASE文
 * 
 * 現金決済の場合は注文金額、Stripe成功決済の場合はgross/netを使用
 */
export const salesAmountCase = {
  gross: Prisma.sql`
    CASE 
      WHEN om.is_cash = true THEN o.amount
      WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
      ELSE 0
    END
  `,
  net: Prisma.sql`
    CASE 
      WHEN om.is_cash = true THEN o.amount
      WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
      ELSE 0
    END
  `,
  fee: Prisma.sql`
    CASE 
      WHEN om.is_cash = true THEN 0
      WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN COALESCE(sp.amount_fee, 0)
      ELSE 0
    END
  `
};

/**
 * テーブル存在チェック用のヘルパー関数
 * 
 * @param prisma - PrismaClientインスタンス
 * @returns テーブルの存在有無を表すオブジェクト
 */
export async function checkTableExistence(prisma: PrismaClient): Promise<{
  deletedAt: boolean;
  orderMetadata: boolean;
  buyerAttributes: boolean;
  worldPrice: boolean;
}> {
  try {
    const result = await prisma.$queryRaw<Array<{
      has_deleted_at: boolean;
      has_order_metadata: boolean;
      has_buyer_attributes: boolean;
      has_world_price: boolean;
    }>>`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'deleted_at'
        ) as has_deleted_at,
        EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'order_metadata'
        ) as has_order_metadata,
        EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'buyer_attributes'
        ) as has_buyer_attributes,
        EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'world_price_median'
        ) as has_world_price
    `;
    
    return {
      deletedAt: result[0]?.has_deleted_at || false,
      orderMetadata: result[0]?.has_order_metadata || false,
      buyerAttributes: result[0]?.has_buyer_attributes || false,
      worldPrice: result[0]?.has_world_price || false,
    };
  } catch (error) {
    console.warn('[sql-conditions] テーブル存在確認エラー:', error);
    // エラー時は安全のため全てfalseを返す（旧DB想定）
    return {
      deletedAt: false,
      orderMetadata: false,
      buyerAttributes: false,
      worldPrice: false,
    };
  }
}

