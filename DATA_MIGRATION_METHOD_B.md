# データ移行 方法B: データが少ない場合

**更新日**: 2026-01-01

データ量が少ない場合（数百行以下）に適した方法です。ローカル環境は不要で、Supabase DashboardのWeb UIだけで実行できます。

---

## 🎯 方法Bの概要

### 適用条件

- データ量が少ない（各テーブル数百行以下）
- ローカル環境で作業したくない
- 手動でデータを確認しながら移行したい

### 2つのアプローチ

1. **Supabase SQL Editorで直接INSERT文を実行**
2. **Supabase Table Editorで手動でデータを入力**

---

## 方法B-1: Supabase SQL Editorで直接INSERT文を実行

### ステップ1: Render DashboardでデータをSQL形式でエクスポート

#### オプションA: Render DashboardのShell機能を使用

1. **Render Dashboard**にログイン
2. データベースサービス（`fleapay-prod-db`など）を選択
3. **Shell** タブを開く
4. 以下のSQLを実行してINSERT文を生成：

```sql
-- framesテーブルのデータをINSERT文形式でエクスポート
SELECT 'INSERT INTO frames (id, display_name, category, metadata, created_at) VALUES (' ||
       quote_literal(id) || ', ' ||
       quote_literal(display_name) || ', ' ||
       COALESCE(quote_literal(category), 'NULL') || ', ' ||
       COALESCE(quote_literal(metadata::text), 'NULL') || ', ' ||
       quote_literal(created_at) || ');'
FROM frames;

-- sellersテーブルのデータをINSERT文形式でエクスポート
SELECT 'INSERT INTO sellers (id, display_name, shop_name, email, password_hash, created_at) VALUES (' ||
       quote_literal(id) || ', ' ||
       quote_literal(display_name) || ', ' ||
       COALESCE(quote_literal(shop_name), 'NULL') || ', ' ||
       quote_literal(email) || ', ' ||
       quote_literal(password_hash) || ', ' ||
       quote_literal(created_at) || ');'
FROM sellers;

-- ordersテーブルのデータをINSERT文形式でエクスポート
SELECT 'INSERT INTO orders (id, seller_id, frame_id, amount, status, created_at) VALUES (' ||
       quote_literal(id) || ', ' ||
       quote_literal(seller_id) || ', ' ||
       quote_literal(frame_id) || ', ' ||
       amount || ', ' ||
       quote_literal(status) || ', ' ||
       quote_literal(created_at) || ');'
FROM orders;

-- 他のテーブルも同様に...
```

5. 結果をコピーしてテキストファイルに保存

#### オプションB: 手動でINSERT文を作成

データが非常に少ない場合（10行以下など）、手動でINSERT文を作成することも可能です。

---

### ステップ2: Supabase SQL Editorで実行

1. **Supabase Dashboard**にログイン
2. プロジェクト `edo ichiba staging` を選択
3. 左メニューから **SQL Editor** を開く
4. **New query** をクリック
5. エクスポートしたINSERT文を貼り付け
6. **Run** をクリック

**実行例**:

```sql
-- 例: framesテーブルにデータを挿入
INSERT INTO frames (id, display_name, category, metadata, created_at) VALUES 
('frame1', 'Frame 1', 'category1', '{}', '2024-01-01 00:00:00'),
('frame2', 'Frame 2', 'category2', '{}', '2024-01-02 00:00:00'),
('frame3', 'Frame 3', 'category1', '{}', '2024-01-03 00:00:00');

-- sellersテーブルにデータを挿入
INSERT INTO sellers (id, display_name, shop_name, email, password_hash, created_at) VALUES 
('seller1', 'Seller 1', 'Shop 1', 'seller1@example.com', 'hash1', '2024-01-01 00:00:00'),
('seller2', 'Seller 2', 'Shop 2', 'seller2@example.com', 'hash2', '2024-01-02 00:00:00');

-- 他のテーブルも同様に...
```

**重要**: 外部キー制約を考慮して、**親テーブル→子テーブル**の順で実行してください。

**実行順序**:
1. `frames`
2. `sellers`
3. `orders`
4. `order_items`
5. `images`
6. `stripe_payments`
7. `qr_sessions`
8. `buyer_attributes`
9. `order_metadata`
10. `kids_achievements`

---

## 方法B-2: Supabase Table Editorで手動でデータを入力

### ステップ1: Supabase Table Editorを開く

1. **Supabase Dashboard**にログイン
2. プロジェクト `edo ichiba staging` を選択
3. 左メニューから **Table Editor** を開く

### ステップ2: 各テーブルにデータを入力

1. 対象テーブル（例: `frames`）を選択
2. **Insert row** ボタンをクリック
3. データを入力
4. **Save** をクリック

**入力順序**（外部キー制約を考慮）:
1. `frames` - フレーム情報
2. `sellers` - 売主情報
3. `orders` - 注文情報（`seller_id`, `frame_id`を参照）
4. `order_items` - 注文明細（`order_id`を参照）
5. `images` - 画像情報
6. `stripe_payments` - 決済情報（`order_id`を参照）
7. `qr_sessions` - QRセッション情報
8. `buyer_attributes` - 購入者属性
9. `order_metadata` - 注文メタデータ（`order_id`を参照）
10. `kids_achievements` - 子供の実績情報

---

## 📋 各テーブルのデータ構造

### framesテーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | text | フレームID（主キー） |
| `display_name` | text | 表示名 |
| `category` | text | カテゴリ（NULL可） |
| `metadata` | jsonb | メタデータ（NULL可） |
| `created_at` | timestamptz | 作成日時 |

### sellersテーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | text | 売主ID（主キー） |
| `display_name` | text | 表示名 |
| `shop_name` | text | 店舗名（NULL可） |
| `email` | text | メールアドレス |
| `password_hash` | text | パスワードハッシュ |
| `created_at` | timestamptz | 作成日時 |

### ordersテーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | text | 注文ID（主キー） |
| `seller_id` | text | 売主ID（外部キー → sellers.id） |
| `frame_id` | text | フレームID（外部キー → frames.id） |
| `amount` | integer | 金額 |
| `status` | text | ステータス |
| `created_at` | timestamptz | 作成日時 |

**重要**: `seller_id`と`frame_id`は、先に作成した`sellers`と`frames`テーブルのIDを参照する必要があります。

---

## 🎯 実践例

### 例1: 最小限のテストデータを作成

```sql
-- Supabase SQL Editorで実行

-- 1. framesテーブルにデータを挿入
INSERT INTO frames (id, display_name, category, metadata, created_at) VALUES 
('frame-test-1', 'Test Frame 1', 'test', '{}', NOW());

-- 2. sellersテーブルにデータを挿入
INSERT INTO sellers (id, display_name, shop_name, email, password_hash, created_at) VALUES 
('seller-test-1', 'Test Seller 1', 'Test Shop', 'test@example.com', 'test-hash', NOW());

-- 3. ordersテーブルにデータを挿入（seller_idとframe_idを参照）
INSERT INTO orders (id, seller_id, frame_id, amount, status, created_at) VALUES 
('order-test-1', 'seller-test-1', 'frame-test-1', 1000, 'pending', NOW());
```

### 例2: Table Editorで手動入力

1. **Table Editor** → `frames` テーブルを選択
2. **Insert row** をクリック
3. 以下のデータを入力：
   - `id`: `frame-test-1`
   - `display_name`: `Test Frame 1`
   - `category`: `test`
   - `metadata`: `{}`
   - `created_at`: 現在の日時
4. **Save** をクリック

同様に、`sellers`、`orders`テーブルにもデータを入力します。

---

## ✅ チェックリスト

### 方法B-1: SQL EditorでINSERT文を実行

- [ ] Render DashboardでデータをSQL形式でエクスポート
- [ ] INSERT文を生成
- [ ] Supabase SQL Editorで親テーブルから順に実行
- [ ] データ整合性を確認

### 方法B-2: Table Editorで手動入力

- [ ] Supabase Table Editorを開く
- [ ] 親テーブル（`frames`, `sellers`）から順にデータを入力
- [ ] 子テーブル（`orders`, `order_items`など）にデータを入力
- [ ] データ整合性を確認

---

## ⚠️ 注意事項

1. **データ量の制限**
   - この方法は小規模なデータ（数百行以下）に適しています
   - 大規模なデータ（数千行以上）の場合は、方法A（Table EditorのImport機能）を使用してください

2. **外部キー制約**
   - 必ず親テーブル→子テーブルの順でデータを入力してください
   - 親テーブルのIDが存在しない場合、エラーが発生します

3. **データ型の確認**
   - `jsonb`型のデータは、JSON形式の文字列として入力してください（例: `'{}'`）
   - `timestamptz`型のデータは、ISO 8601形式で入力してください（例: `'2024-01-01 00:00:00'`）

---

## 🔗 関連ドキュメント

- [DATA_MIGRATION_WITHOUT_LOCAL.md](./DATA_MIGRATION_WITHOUT_LOCAL.md) - ローカル環境なしでデータ移行する方法
- [SUPABASE_DATA_MIGRATION_GUIDE.md](./SUPABASE_DATA_MIGRATION_GUIDE.md) - 詳細ガイド

