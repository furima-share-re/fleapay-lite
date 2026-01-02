# UUID型エラーの修正方法

**エラー内容**: `invalid input syntax for type uuid: "order-test-1"`

`orders`テーブルの`id`カラムは`uuid`型のため、文字列ではなくUUID形式で指定する必要があります。

---

## 🔧 修正方法

### 方法1: UUIDを自動生成させる（推奨）

`id`カラムを指定せず、デフォルト値（`gen_random_uuid()`）を使用します：

```sql
-- 修正後のINSERT文
-- 1. framesテーブルにデータを挿入
INSERT INTO frames (id, display_name, category, metadata, created_at) VALUES 
('frame-test-1', 'Test Frame 1', 'test', '{}', NOW());

-- 2. sellersテーブルにデータを挿入
INSERT INTO sellers (id, display_name, shop_name, email, password_hash, created_at) VALUES 
('seller-test-1', 'Test Seller 1', 'Test Shop', 'test@example.com', 'test-hash', NOW());

-- 3. ordersテーブルにデータを挿入（idを省略して自動生成）
INSERT INTO orders (seller_id, order_no, frame_id, amount, status, created_at) VALUES 
('seller-test-1', 1, 'frame-test-1', 1000, 'pending', NOW());
```

**重要**: `id`カラムを指定しないことで、PostgreSQLが自動的にUUIDを生成します。

---

### 方法2: 明示的にUUID形式で指定

UUID形式の文字列を指定する場合：

```sql
-- UUID形式の例
INSERT INTO orders (id, seller_id, order_no, frame_id, amount, status, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'seller-test-1', 1, 'frame-test-1', 1000, 'pending', NOW());
```

**UUID形式**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`（32桁の16進数、ハイフン区切り）

---

### 方法3: gen_random_uuid()関数を使用

明示的にUUID生成関数を呼び出す：

```sql
INSERT INTO orders (id, seller_id, order_no, frame_id, amount, status, created_at) VALUES 
(gen_random_uuid(), 'seller-test-1', 1, 'frame-test-1', 1000, 'pending', NOW());
```

---

## 📋 完全な修正例

### 推奨: idを省略して自動生成

```sql
-- Supabase SQL Editorで実行

-- 1. framesテーブルにデータを挿入
INSERT INTO frames (id, display_name, category, metadata, created_at) VALUES 
('frame-test-1', 'Test Frame 1', 'test', '{}', NOW());

-- 2. sellersテーブルにデータを挿入
INSERT INTO sellers (id, display_name, shop_name, email, password_hash, created_at) VALUES 
('seller-test-1', 'Test Seller 1', 'Test Shop', 'test@example.com', 'test-hash', NOW());

-- 3. ordersテーブルにデータを挿入（idを省略、order_noも追加）
INSERT INTO orders (seller_id, order_no, frame_id, amount, status, created_at) VALUES 
('seller-test-1', 1, 'frame-test-1', 1000, 'pending', NOW());
```

**注意**: `orders`テーブルには`order_no`カラムが必須です（`integer not null`）。

---

## 🔍 各テーブルのID型の確認

| テーブル | idカラムの型 | デフォルト値 |
|---------|------------|------------|
| `frames` | `text` | なし（必須） |
| `sellers` | `text` | なし（必須） |
| `orders` | `uuid` | `gen_random_uuid()` |
| `stripe_payments` | `uuid` | `gen_random_uuid()` |
| `order_items` | `bigserial` | 自動インクリメント |
| `images` | `uuid` | `gen_random_uuid()` |
| `qr_sessions` | `uuid` | `gen_random_uuid()` |
| `buyer_attributes` | `order_id uuid` | なし（必須） |
| `order_metadata` | `order_id uuid` | なし（必須） |
| `kids_achievements` | `(seller_id, code)` | なし（複合主キー） |

---

## ✅ 修正後の完全なINSERT文

```sql
-- Supabase SQL Editorで実行

-- 1. framesテーブル
INSERT INTO frames (id, display_name, category, metadata, created_at) VALUES 
('frame-test-1', 'Test Frame 1', 'test', '{}', NOW());

-- 2. sellersテーブル
INSERT INTO sellers (id, display_name, shop_name, email, password_hash, created_at) VALUES 
('seller-test-1', 'Test Seller 1', 'Test Shop', 'test@example.com', 'test-hash', NOW());

-- 3. ordersテーブル（idを省略、order_noを追加）
INSERT INTO orders (seller_id, order_no, frame_id, amount, status, created_at) VALUES 
('seller-test-1', 1, 'frame-test-1', 1000, 'pending', NOW());
```

---

## 🎯 次のステップ

1. 上記の修正されたINSERT文をSupabase SQL Editorで実行
2. エラーが解消されることを確認
3. データが正しく挿入されたことを確認

---

## 🔗 関連ドキュメント

- [DATA_MIGRATION_METHOD_B.md](./DATA_MIGRATION_METHOD_B.md) - データ移行方法B
- [supabase_schema.sql](./supabase_schema.sql) - スキーマ定義

