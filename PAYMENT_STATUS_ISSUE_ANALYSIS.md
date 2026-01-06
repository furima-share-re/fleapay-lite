# 決済完了したのに失敗と表示される問題の分析

## 問題の概要

決済が完了しているにもかかわらず、successページで「決済未完了」と表示される問題が発生しています。

## 原因分析

### 現在の実装 (`app/api/checkout/result/route.ts`)

```typescript
const result = await prisma.$queryRaw`
  SELECT
    o.id            AS order_id,
    o.seller_id,
    o.amount,
    o.status       AS order_status,
    o.created_at,
    sp.status      AS payment_status,
    ...
  FROM orders o
  LEFT JOIN stripe_payments sp ON sp.order_id = o.id
  WHERE o.id = ${orderId}::uuid
    AND o.deleted_at IS NULL
  ORDER BY sp.created_at DESC NULLS LAST
  LIMIT 1
`;

const isPaid =
  row.order_status === 'paid' ||
  row.payment_status === 'succeeded';
```

### 問題点

1. **複数の`stripe_payments`レコードがある場合の問題**
   - `LEFT JOIN` + `ORDER BY sp.created_at DESC` + `LIMIT 1`により、最新の1つの`stripe_payments`レコードのみを取得
   - 複数の決済レコードがある場合、最新のものが`succeeded`でないと`isPaid = false`になる
   - 例：過去に`succeeded`レコードがあっても、最新が`refunded`や別の状態だと誤判定

2. **タイミングの問題**
   - Webhookの処理順序により、`stripe_payments`レコードが作成される前にsuccessページにアクセスした場合、`isPaid = false`になる可能性

3. **データ不整合**
   - `orders.status = 'paid'`だが`stripe_payments.status != 'succeeded'`の場合
   - `stripe_payments.status = 'succeeded'`だが`orders.status != 'paid'`の場合

## 修正案

### 修正1: `isPaid`判定ロジックの改善

**現在のロジック:**
```typescript
const isPaid =
  row.order_status === 'paid' ||
  row.payment_status === 'succeeded';
```

**修正後のロジック:**
```typescript
// order_idに関連するstripe_paymentsレコードのうち、
// 少なくとも1つが'succeeded'であるかどうかを確認
const hasSucceededPayment = await prisma.$queryRaw`
  SELECT EXISTS(
    SELECT 1 
    FROM stripe_payments 
    WHERE order_id = ${orderId}::uuid 
      AND status = 'succeeded'
  ) AS has_succeeded
`;

const isPaid =
  row.order_status === 'paid' ||
  hasSucceededPayment[0].has_succeeded === true;
```

### 修正2: クエリの最適化（推奨）

複数のクエリを1つにまとめて、パフォーマンスを向上させます：

```typescript
const result = await prisma.$queryRaw`
  SELECT
    o.id            AS order_id,
    o.seller_id,
    o.amount,
    o.status       AS order_status,
    o.created_at,
    -- 最新のstripe_paymentsレコード（金額表示用）
    sp_latest.status      AS payment_status,
    sp_latest.amount_gross,
    sp_latest.amount_net,
    sp_latest.currency,
    sp_latest.created_at  AS paid_at,
    -- succeededレコードが存在するかどうか
    EXISTS(
      SELECT 1 
      FROM stripe_payments sp_succeeded
      WHERE sp_succeeded.order_id = o.id 
        AND sp_succeeded.status = 'succeeded'
    ) AS has_succeeded_payment
  FROM orders o
  LEFT JOIN LATERAL (
    SELECT *
    FROM stripe_payments
    WHERE order_id = o.id
    ORDER BY created_at DESC
    LIMIT 1
  ) sp_latest ON true
  WHERE o.id = ${orderId}::uuid
    AND o.deleted_at IS NULL
  LIMIT 1
`;

const row = (result as Array<Record<string, unknown>>)[0];

const isPaid =
  row.order_status === 'paid' ||
  row.has_succeeded_payment === true;
```

## 調査用SQL

`scripts/investigate_payment_status_issue.sql` を実行して、以下の問題を確認できます：

1. 複数の`stripe_payments`レコードがある注文
2. `succeeded`レコードが存在するが、最新が別の状態の注文
3. 問題の影響範囲の統計

## 推奨される対応

1. **即座の修正**: `isPaid`判定ロジックを修正（修正案1または2を実装）
2. **データ確認**: `scripts/investigate_payment_status_issue.sql`を実行して、既存のデータ不整合を確認
3. **データ修復**: 不整合が見つかった場合、`scripts/fix_missing_order_metadata.sql`を参考に修復スクリプトを作成
4. **テスト**: 修正後、複数の`stripe_payments`レコードがあるケースでテスト

## 関連ファイル

- `app/api/checkout/result/route.ts` - 修正対象
- `payments.js` - 同様のロジックがある場合は修正が必要
- `public/server.js` - 同様のロジックがある場合は修正が必要
- `scripts/investigate_payment_status_issue.sql` - 調査用SQL

