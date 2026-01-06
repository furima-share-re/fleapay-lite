# QR決済未完了チェックガイド

## 概要
このガイドでは、QR決済で未完了の注文を確認する方法を説明します。

## 確認方法

### 1. SQLスクリプトを使用する方法

`scripts/check-incomplete-qr-payments.sql` を実行してください。

このスクリプトは以下の4つのクエリを実行します：

#### クエリ1: pending状態の注文（現金以外）を確認
- `status = 'pending'` かつ `is_cash = false` の注文
- QR決済待ちの注文を表示
- 作成からの経過時間も表示

#### クエリ2: 時間切れの可能性があるpending注文
- 30分（PENDING_TTL_MIN）を超えたpending注文
- 時間切れの可能性がある注文を特定

#### クエリ3: 決済セッションは作成されたが決済が完了していない注文
- `stripe_sid` があるが `stripe_payments` に `succeeded` レコードがない
- または `stripe_payments` の `status` が `succeeded` でない

#### クエリ4: 完了画面が表示されたが、実際には未完了だった注文
- `orders.status = 'paid'` だが `stripe_payments.status != 'succeeded'` の注文
- `stripe_payments.status = 'succeeded'` だが `orders.status != 'paid'` の注文
- 完了画面にアクセスされたが、決済が完了していない注文

#### クエリ5: 統計情報
- 未完了注文の総数
- QR決済待ちの注文数
- 時間切れの可能性がある注文数
- 未完了QR決済の合計金額

#### クエリ6: 完了画面表示の不整合統計
- `paid` だが `succeeded` でない注文数
- `succeeded` だが `paid` でない注文数
- `paid` だが決済レコードがない注文数
- 不整合注文の合計金額

### 2. APIエンドポイントを使用する方法

#### `/api/seller/order-detail`
特定の注文の詳細を確認：
```
GET /api/seller/order-detail?s={sellerId}&orderId={orderId}
```

#### `/api/price/latest`
最新のpending注文を確認：
```
GET /api/price/latest?s={sellerId}
```

#### `/api/checkout/result`
決済結果を確認：
```
GET /api/checkout/result?orderId={orderId}
```

## 確認すべきポイント

### 1. pending状態の注文
- `orders.status = 'pending'`
- `order_metadata.is_cash = false`（現金以外）
- 作成から30分以内は有効

### 2. 決済セッションと決済レコードの不整合
- `orders.stripe_sid` が設定されているが
- `stripe_payments.status != 'succeeded'` の場合

### 3. 時間切れの注文
- 作成から30分以上経過したpending注文
- 自動的に無効になる可能性がある

### 4. 完了画面が表示されたが未完了だった注文（重要）
以下の不整合パターンを確認：
- **パターンA**: `orders.status = 'paid'` だが `stripe_payments.status != 'succeeded'`
  - 注文は完了とマークされているが、実際の決済が完了していない
  - 完了画面が表示されたが、決済が未完了の可能性
  
- **パターンB**: `stripe_payments.status = 'succeeded'` だが `orders.status != 'paid'`
  - 決済は完了しているが、注文ステータスが更新されていない
  - Webhookの処理に問題がある可能性

- **パターンC**: `orders.status = 'paid'` だが `stripe_payments` レコードが存在しない
  - 注文は完了とマークされているが、決済レコードがない
  - データの不整合が発生している可能性

## 対処方法

### 時間切れのpending注文
通常、30分を超えたpending注文は自動的に無効になります。
必要に応じて、手動でステータスを更新することも可能です。

### 決済セッションと決済レコードの不整合
1. Stripeダッシュボードで決済セッションの状態を確認
2. Webhookが正しく受信されているか確認
3. 必要に応じて手動で `stripe_payments` レコードを作成または更新

### 完了画面が表示されたが未完了だった注文の対処
1. **パターンA（orders.status='paid'だが決済未完了）の場合**:
   - Stripeダッシュボードで決済セッションの状態を確認
   - 決済が実際に完了していない場合は、`orders.status` を `pending` に戻す
   - または、決済を再試行する

2. **パターンB（決済完了だがorders.statusが更新されていない）の場合**:
   - Webhookのログを確認
   - 必要に応じて手動で `orders.status` を `paid` に更新
   - Webhookの処理を確認し、問題があれば修正

3. **パターンC（paidだが決済レコードがない）の場合**:
   - Stripeダッシュボードで決済セッションを確認
   - 決済が完了している場合は、`stripe_payments` レコードを手動で作成
   - 決済が完了していない場合は、`orders.status` を `pending` に戻す

## 注意事項

- 削除済みの注文（`deleted_at IS NOT NULL`）は除外されます
- 現金決済（`is_cash = true`）はQR決済ではないため、通常は除外されます
- 統計情報はリアルタイムで変動する可能性があります

## 関連ファイル

- `scripts/check-incomplete-qr-payments.sql` - 未完了QR決済確認SQL
- `payments.js` - 決済関連API
- `app/api/seller/order-detail/route.ts` - 注文詳細API
- `app/api/checkout/result/route.ts` - 決済結果API

