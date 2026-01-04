# SQL条件の整合性管理ガイド

## 概要

このプロジェクトでは、取引データのフィルタリング条件を一元管理することで、SQL条件の整合性を保っています。

## 問題点

以前は、以下のような問題がありました：

1. **重複コード**: 同じSQL条件が複数の場所に散在していた
2. **不整合のリスク**: 条件を変更する際に、一部の箇所を修正し忘れる可能性があった
3. **保守性の低下**: 条件の変更履歴を追跡するのが困難だった

## 解決策

### 1. 共通関数の作成

`lib/sql-conditions.ts` に共通のSQL条件を関数として定義しました。

### 2. 使用例

#### 基本的な使用例

```typescript
import { buildOrderFilterConditions } from '@/lib/sql-conditions';

// テーブル存在チェック
const { deletedAt } = await checkTableExistence(prisma);

// SQL条件を構築
const whereCondition = buildOrderFilterConditions(sellerId, deletedAt);

// クエリに使用
const result = await prisma.$queryRaw`
  SELECT o.id, o.amount, o.created_at
  FROM orders o
  LEFT JOIN order_metadata om ON om.order_id = o.id
  LEFT JOIN stripe_payments sp ON sp.order_id = o.id
  ${whereCondition}
  ORDER BY o.created_at DESC
`;
```

#### 日付範囲を指定する場合

```typescript
import { buildOrderFilterConditionsWithDateRange } from '@/lib/sql-conditions';

const { todayStart, tomorrowStart } = jstDayBounds();
const whereCondition = buildOrderFilterConditionsWithDateRange(
  sellerId,
  todayStart,
  tomorrowStart,
  deletedAt
);

const result = await prisma.$queryRaw`
  SELECT COUNT(*) as count
  FROM orders o
  LEFT JOIN order_metadata om ON om.order_id = o.id
  LEFT JOIN stripe_payments sp ON sp.order_id = o.id
  ${whereCondition}
`;
```

#### 相対日付範囲を指定する場合

```typescript
import { buildOrderFilterConditionsWithRelativeDate } from '@/lib/sql-conditions';

const whereCondition = buildOrderFilterConditionsWithRelativeDate(
  sellerId,
  90, // 90日前から
  deletedAt
);

const result = await prisma.$queryRaw`
  SELECT o.id, o.amount
  FROM orders o
  LEFT JOIN order_metadata om ON om.order_id = o.id
  LEFT JOIN stripe_payments sp ON sp.order_id = o.id
  ${whereCondition}
`;
```

#### 売上金額計算の場合

```typescript
import { salesAmountCase } from '@/lib/sql-conditions';

const result = await prisma.$queryRaw`
  SELECT
    SUM(${salesAmountCase.gross}) as gross_sales,
    SUM(${salesAmountCase.net}) as net_sales,
    SUM(${salesAmountCase.fee}) as total_fee
  FROM orders o
  LEFT JOIN order_metadata om ON om.order_id = o.id
  LEFT JOIN stripe_payments sp ON sp.order_id = o.id
  ${buildOrderFilterConditions(sellerId, deletedAt)}
`;
```

## 条件の変更方法

条件を変更する場合は、`lib/sql-conditions.ts` の関数を修正するだけで、全ての箇所に自動的に反映されます。

### 例: 条件を追加する場合

```typescript
// lib/sql-conditions.ts を編集
export function buildOrderFilterConditions(
  sellerId: string,
  hasDeletedAt: boolean = true
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`o.seller_id = ${sellerId}`
  ];

  if (hasDeletedAt) {
    conditions.push(Prisma.sql`o.deleted_at IS NULL`);
  }

  // 新しい条件を追加
  conditions.push(Prisma.sql`o.status != 'cancelled'`); // 例: キャンセル済みを除外

  conditions.push(
    Prisma.sql`(
      om.is_cash = true
      OR sp.status = 'succeeded'
      OR sp.id IS NULL
    )`
  );

  return Prisma.sql`WHERE ${Prisma.join(conditions, Prisma.sql` AND `)}`;
}
```

## 既存コードの移行

既存のコードを段階的に移行することを推奨します：

1. 新しいコードでは必ず共通関数を使用する
2. 既存のコードは、修正する際に共通関数に移行する
3. リファクタリングの際に、まとめて移行する

## テスト

共通関数のテストを作成することを推奨します：

```typescript
// __tests__/sql-conditions.test.ts
import { buildOrderFilterConditions } from '@/lib/sql-conditions';

describe('buildOrderFilterConditions', () => {
  it('should include seller_id condition', () => {
    const condition = buildOrderFilterConditions('seller-123', true);
    // 条件を検証
  });
});
```

## 注意事項

1. **Prisma.sqlの使用**: SQLインジェクションを防ぐため、必ず`Prisma.sql`を使用してください
2. **テーブル存在チェック**: `deleted_at`カラムの存在を確認してから使用してください
3. **JOINの順序**: `order_metadata`と`stripe_payments`のJOINが必要です

## 関連ファイル

- `lib/sql-conditions.ts` - 共通SQL条件の定義
- `app/api/seller/summary/route.ts` - 使用例（取引一覧、サマリー）
- `app/api/seller/analytics/route.ts` - 使用例（グラフ）

