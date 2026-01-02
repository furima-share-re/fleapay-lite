# データ移行 実行手順

**実行日**: 2026-01-01  
**対象**: Phase 1.3 - データ移行

---

## 📋 必要な接続情報

### 1. Render検証環境のDATABASE_URL

Render Dashboard → `fleapay-lite-t1` → **Environment** タブで `DATABASE_URL` を確認

**例**（ドキュメントに記載されている接続文字列）:
```
postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db
```

**重要**: 実際の接続文字列をRender Dashboardで確認してください。

---

### 2. Supabase接続情報

Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI** をコピー

**形式**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**重要**: `[YOUR-PASSWORD]` をプロジェクト作成時に設定したデータベースパスワードに置き換えてください。

---

## 🚀 実行手順

### ステップ1: データのダンプ（Render → CSV）

#### 方法A: PowerShellスクリプトを使用（推奨）

```powershell
# 検証環境のRender DBからデータをダンプ
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl "postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" `
  -OutputDir "./dump-staging"
```

**注意**: 接続文字列は実際の値に置き換えてください。

#### 方法B: 手動でダンプ（スクリプトが使えない場合）

```powershell
# 出力ディレクトリを作成
New-Item -ItemType Directory -Path "./dump-staging" -Force

# 各テーブルをCSV形式でエクスポート
$env:DATABASE_URL="postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"

psql $env:DATABASE_URL -c "\COPY frames TO './dump-staging/frames.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY sellers TO './dump-staging/sellers.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY orders TO './dump-staging/orders.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY order_items TO './dump-staging/order_items.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY images TO './dump-staging/images.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY stripe_payments TO './dump-staging/stripe_payments.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY qr_sessions TO './dump-staging/qr_sessions.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY buyer_attributes TO './dump-staging/buyer_attributes.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY order_metadata TO './dump-staging/order_metadata.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY kids_achievements TO './dump-staging/kids_achievements.csv' CSV HEADER"
```

**期待される出力**:
- `./dump-staging/frames.csv`
- `./dump-staging/sellers.csv`
- `./dump-staging/orders.csv`
- `./dump-staging/order_items.csv`
- `./dump-staging/images.csv`
- `./dump-staging/stripe_payments.csv`
- `./dump-staging/qr_sessions.csv`
- `./dump-staging/buyer_attributes.csv`
- `./dump-staging/order_metadata.csv`
- `./dump-staging/kids_achievements.csv`

---

### ステップ2: データのインポート（CSV → Supabase）

#### 方法A: PowerShellスクリプトを使用（推奨）

```powershell
# Supabaseにデータをインポート
.\scripts\import-to-supabase.ps1 `
  -SupabaseDatabaseUrl "postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres" `
  -DataDir "./dump-staging"
```

**重要**: `[YOUR-PASSWORD]` を実際のパスワードに置き換えてください。

#### 方法B: 手動でインポート（スクリプトが使えない場合）

外部キー制約を考慮して、**親テーブル→子テーブル**の順でインポートします：

```powershell
$env:SUPABASE_DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres"

# 親テーブルから順にインポート
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY frames FROM './dump-staging/frames.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY sellers FROM './dump-staging/sellers.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY orders FROM './dump-staging/orders.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY order_items FROM './dump-staging/order_items.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY images FROM './dump-staging/images.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY stripe_payments FROM './dump-staging/stripe_payments.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY qr_sessions FROM './dump-staging/qr_sessions.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY buyer_attributes FROM './dump-staging/buyer_attributes.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY order_metadata FROM './dump-staging/order_metadata.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY kids_achievements FROM './dump-staging/kids_achievements.csv' CSV HEADER"
```

**インポート順序の理由**:
- `frames` → `sellers` → `orders` → `order_items` の順で外部キー制約を満たす
- 親テーブルのデータが先に存在する必要がある

---

### ステップ3: データ整合性の確認

#### 3.1 Supabase SQL Editorでレコード数を確認

Supabase Dashboard → **SQL Editor** で以下を実行：

```sql
-- レコード数の確認
SELECT 'sellers' as table_name, COUNT(*) as count FROM sellers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'stripe_payments', COUNT(*) FROM stripe_payments
UNION ALL
SELECT 'frames', COUNT(*) FROM frames
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'images', COUNT(*) FROM images
UNION ALL
SELECT 'qr_sessions', COUNT(*) FROM qr_sessions
UNION ALL
SELECT 'buyer_attributes', COUNT(*) FROM buyer_attributes
UNION ALL
SELECT 'order_metadata', COUNT(*) FROM order_metadata
UNION ALL
SELECT 'kids_achievements', COUNT(*) FROM kids_achievements;
```

この結果を、元のRender DBでも同じクエリを実行して比較してください。

#### 3.2 サンプルデータの確認

```sql
-- 最新の注文を確認
SELECT id, seller_id, amount, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 売主情報を確認
SELECT id, display_name, shop_name, email, created_at 
FROM sellers 
LIMIT 10;

-- フレーム情報を確認
SELECT id, display_name, category, created_at 
FROM frames 
LIMIT 10;
```

---

## ✅ チェックリスト

### データダンプ
- [ ] Render検証環境のDATABASE_URLを確認
- [ ] データをCSV形式でダンプ
- [ ] すべてのテーブルのCSVファイルが作成されたことを確認

### データインポート
- [ ] Supabase接続文字列を設定（パスワードを正しく設定）
- [ ] 親テーブルから順にインポート（外部キー制約を考慮）
- [ ] すべてのテーブルのインポートが完了

### データ整合性
- [ ] レコード数を確認（元のデータソースと比較）
- [ ] サンプルデータを確認
- [ ] 外部キー制約を確認

---

## 🐛 トラブルシューティング

### 問題1: `psql` コマンドが見つからない

**エラーメッセージ**:
```
psql : 用語 'psql' は、コマンドレット、関数、スクリプト ファイル、または操作可能なプログラムの名前として認識されません。
```

**対処方法**:
1. PostgreSQLクライアントツールをインストール
   - Windows: [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/)からインストール
   - インストール後、PATHに追加されていることを確認
2. または、Supabase SQL Editorで直接インポート（後述）

### 問題2: 外部キー制約エラー

**エラーメッセージ例**:
```
ERROR: insert or update on table "orders" violates foreign key constraint
```

**対処方法**:
- データのインポート順序を確認（親→子の順）
- 親テーブルのデータが存在することを確認
- 外部キー参照が正しいか確認

### 問題3: 接続エラー

**エラーメッセージ例**:
```
psql: error: connection to server at "..." failed
```

**対処方法**:
- 接続文字列が正しいか確認
- パスワードに特殊文字が含まれる場合は、URLエンコードが必要な場合があります
- Supabaseの場合は、外部接続が許可されているか確認（Settings → Database → Connection pooling）

---

## 🔄 代替方法: Supabase SQL Editorで直接インポート

`psql` が使えない場合は、Supabase SQL Editorで直接インポートできます。

### 方法1: CSVファイルをアップロード

1. Supabase Dashboard → **Table Editor** → 対象テーブルを選択
2. **Import data** をクリック
3. CSVファイルをアップロード

### 方法2: SQL EditorでCOPYコマンドを使用

Supabase SQL Editorで以下を実行（各テーブルごと）：

```sql
-- 例: framesテーブルにインポート
-- 注意: CSVファイルの内容を直接貼り付ける必要があります
COPY frames (id, display_name, category, metadata, created_at)
FROM STDIN
WITH (FORMAT CSV, HEADER);
-- ここにCSVファイルの内容を貼り付け
```

**注意**: この方法は小規模なデータ（数百行以下）に適しています。

---

## 📚 次のステップ

データ移行が完了したら：

1. **動作確認**（すべてのAPIエンドポイント）
2. **Render環境での確認**（デプロイ後）
3. **Phase 1.4: Supabase Auth移行**に進む

---

## 🔗 関連ドキュメント

- [DATA_MIGRATION_QUICK_START.md](./DATA_MIGRATION_QUICK_START.md) - クイックスタートガイド
- [SUPABASE_DATA_MIGRATION_GUIDE.md](./SUPABASE_DATA_MIGRATION_GUIDE.md) - 詳細な移行ガイド
- [scripts/README.md](./scripts/README.md) - スクリプトの使用方法

