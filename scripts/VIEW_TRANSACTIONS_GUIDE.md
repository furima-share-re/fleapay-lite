# 取引データ確認ガイド

Cursorで取引データを確認する方法を説明します。

## 方法1: Node.jsスクリプトを使用（推奨）

### 基本的な使い方

```bash
# 過去30日間の取引を表示（最大50件）
node scripts/view-transactions.js

# 特定のセラーの取引を表示
node scripts/view-transactions.js --seller-id seller123

# 過去7日間の取引を表示
node scripts/view-transactions.js --days 7

# 決済完了（succeeded）の取引のみ表示
node scripts/view-transactions.js --status succeeded

# 詳細情報を表示（注文アイテム、決済情報など）
node scripts/view-transactions.js --detail

# サマリー統計のみ表示
node scripts/view-transactions.js --summary

# 複数のオプションを組み合わせ
node scripts/view-transactions.js --seller-id seller123 --days 7 --detail
```

### オプション一覧

| オプション | 説明 | 例 |
|-----------|------|-----|
| `--seller-id <id>` | 特定のセラーIDでフィルタリング | `--seller-id seller123` |
| `--status <status>` | ステータスでフィルタリング | `--status succeeded` |
| `--days <number>` | 過去N日間の取引を表示（デフォルト: 30） | `--days 7` |
| `--limit <number>` | 表示件数（デフォルト: 50） | `--limit 100` |
| `--detail` | 詳細情報を表示 | `--detail` |
| `--summary` | サマリー情報のみ表示 | `--summary` |
| `--help` | ヘルプを表示 | `--help` |

### ステータスの種類

- `pending`: 決済待ち
- `paid`: 決済完了
- `succeeded`: Stripe決済成功
- `failed`: 決済失敗
- `canceled`: キャンセル

## 方法2: Prisma Studioを使用（GUI）

Prisma Studioは、データベースを視覚的に確認できるGUIツールです。

```bash
# Prisma Studioを起動
npx prisma studio
```

ブラウザが自動的に開き、以下のテーブルを確認できます：
- `orders`: 注文データ
- `stripe_payments`: Stripe決済データ
- `order_items`: 注文アイテム
- `order_metadata`: 注文メタデータ
- `buyer_attributes`: 購入者属性

## 方法3: SQLクエリを直接実行

既存のSQLスクリプトを参考に、カスタムクエリを実行できます。

### 例: 取引データを確認するSQL

```sql
-- 過去30日間の取引を確認
SELECT 
  o.id AS order_id,
  o.seller_id,
  o.order_no,
  o.amount,
  o.status AS order_status,
  o.created_at,
  om.is_cash,
  sp.status AS payment_status,
  sp.amount_gross,
  sp.amount_net
FROM orders o
LEFT JOIN order_metadata om ON om.order_id = o.id
LEFT JOIN stripe_payments sp ON sp.order_id = o.id
WHERE o.deleted_at IS NULL
  AND o.created_at >= NOW() - INTERVAL '30 days'
ORDER BY o.created_at DESC
LIMIT 50;
```

### SQLスクリプトの実行方法

1. **Supabase SQL Editorを使用**
   - Supabaseダッシュボードにログイン
   - SQL Editorを開く
   - クエリを実行

2. **psqlコマンドを使用**
   ```bash
   psql $DATABASE_URL -f scripts/check-incomplete-qr-payments.sql
   ```

## 方法4: APIエンドポイントを使用

既存のAPIエンドポイントを使用して取引データを取得できます。

### セラーサマリーAPI

```bash
# 特定のセラーの取引履歴を取得
curl "http://localhost:3000/api/seller/summary?sellerId=seller123"
```

### チェックアウト結果API

```bash
# 特定の注文の決済状況を確認
curl "http://localhost:3000/api/checkout/result?orderId=<order-id>"
```

## よくある確認項目

### 1. 未完了のQR決済を確認

```bash
# SQLスクリプトを使用
psql $DATABASE_URL -f scripts/check-incomplete-qr-payments.sql
```

### 2. 特定のセラーの全取引を確認

```bash
node scripts/view-transactions.js --seller-id <seller-id> --days 365 --limit 1000
```

### 3. 決済完了した取引のみ確認

```bash
node scripts/view-transactions.js --status succeeded --detail
```

### 4. 現金決済の取引を確認

```sql
SELECT 
  o.id,
  o.seller_id,
  o.amount,
  o.created_at
FROM orders o
INNER JOIN order_metadata om ON om.order_id = o.id
WHERE om.is_cash = true
  AND o.deleted_at IS NULL
ORDER BY o.created_at DESC;
```

## トラブルシューティング

### データベース接続エラー

`.env`ファイルに`DATABASE_URL`が正しく設定されているか確認してください。

```bash
# 環境変数を確認
echo $DATABASE_URL
```

### Prismaクライアントの再生成

```bash
npx prisma generate
```

### スキーマの同期

```bash
npx prisma db pull
npx prisma generate
```

## 参考資料

- [Prisma公式ドキュメント](https://www.prisma.io/docs)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- プロジェクト内のSQLスクリプト: `scripts/check-incomplete-qr-payments.sql`


