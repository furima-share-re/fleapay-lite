# Supabaseデータ移行ガイド

検証環境のテストデータ、または本番環境からのデータをSupabaseに移行します。

## 📋 データソースの選択

### オプション1: 検証環境のテストデータを使用
- 現在の検証環境（Render）のテストデータを移行
- 軽量で移行が速い
- テスト用データなので本番データに影響なし

### オプション2: 本番環境からダンプ
- 本番環境のデータを新検証環境に移行
- より実データに近い検証が可能
- データ量が多い場合は時間がかかる

**推奨**: まずは検証環境のテストデータで移行し、必要に応じて本番データを追加

---

## 🔧 ステップ1: スキーマの移行（先に完了）

スキーマ移行が完了していることを確認してください。未完了の場合は [SUPABASE_SCHEMA_ONLY_MIGRATION.md](./SUPABASE_SCHEMA_ONLY_MIGRATION.md) を参照。

---

## 📦 ステップ2: データソースの選択とダンプ

### オプションA: 検証環境のテストデータを使用

#### 2.1 検証環境からデータをダンプ

```powershell
# PowerShell
# 検証環境のRender DB接続文字列を使用
$env:STAGING_DATABASE_URL="postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"

# データをCSV形式でダンプ（テーブルごと）
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl $env:STAGING_DATABASE_URL `
  -OutputDir "./dump-staging"
```

または手動で：

```powershell
# PowerShell
$env:DATABASE_URL="postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"

# 各テーブルをCSV形式でエクスポート
psql $env:DATABASE_URL -c "\COPY frames TO 'dump-staging/frames.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY sellers TO 'dump-staging/sellers.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY orders TO 'dump-staging/orders.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY order_items TO 'dump-staging/order_items.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY images TO 'dump-staging/images.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY stripe_payments TO 'dump-staging/stripe_payments.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY qr_sessions TO 'dump-staging/qr_sessions.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY buyer_attributes TO 'dump-staging/buyer_attributes.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY order_metadata TO 'dump-staging/order_metadata.csv' CSV HEADER"
psql $env:DATABASE_URL -c "\COPY kids_achievements TO 'dump-staging/kids_achievements.csv' CSV HEADER"
```

### オプションB: 本番環境からダンプ

#### 2.1 本番環境の接続情報を取得

1. Render Dashboardで本番環境のサービスを選択
2. **Environment** タブで `DATABASE_URL` を確認
3. 接続文字列をコピー

#### 2.2 本番環境からデータをダンプ

```powershell
# PowerShell
# 本番環境のDATABASE_URLを使用
$env:PROD_DATABASE_URL="[本番環境のDATABASE_URL]"

# データをCSV形式でダンプ
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl $env:PROD_DATABASE_URL `
  -OutputDir "./dump-prod"
```

**注意**: 本番環境のデータは機密情報を含む可能性があります。安全に管理してください。

---

## 📊 ステップ3: データのインポート（Supabaseへ）

### 3.1 Supabase接続文字列の設定

```powershell
# PowerShell
$env:SUPABASE_DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres"
```

**重要**: `[YOUR-PASSWORD]` をプロジェクト作成時に設定したデータベースパスワードに置き換えてください。

### 3.2 データのインポート（親→子の順）

外部キー制約を考慮して、親テーブルから順にインポートします：

```powershell
# PowerShell
# 親テーブルから順にインポート
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY frames FROM 'dump-staging/frames.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY sellers FROM 'dump-staging/sellers.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY orders FROM 'dump-staging/orders.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY order_items FROM 'dump-staging/order_items.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY images FROM 'dump-staging/images.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY stripe_payments FROM 'dump-staging/stripe_payments.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY qr_sessions FROM 'dump-staging/qr_sessions.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY buyer_attributes FROM 'dump-staging/buyer_attributes.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY order_metadata FROM 'dump-staging/order_metadata.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY kids_achievements FROM 'dump-staging/kids_achievements.csv' CSV HEADER"
```

**注意**: テーブルが存在しない場合は、エラーが表示されますが、そのテーブルはスキップして続行してください。

### 3.3 インポートスクリプトを使用（推奨）

```powershell
# PowerShell
.\scripts\import-to-supabase.ps1 `
  -SupabaseDatabaseUrl "postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres" `
  -DataDir "./dump-staging"
```

---

## ✅ ステップ4: データ整合性チェック

### 4.1 レコード数の確認

Supabase SQL Editorで実行：

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

この結果を、元のデータソース（検証環境または本番環境）でも同じクエリを実行して比較してください。

### 4.2 サンプルデータの確認

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

### 4.3 外部キー制約の確認

```sql
-- 外部キー制約が正しく機能しているか確認
SELECT 
  tc.table_name AS child_table,
  kcu.column_name AS child_column,
  ccu.table_name AS parent_table,
  ccu.column_name AS parent_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;
```

---

## 🔄 ステップ5: データ移行の検証

### 5.1 アプリケーション経由での確認

1. ローカル環境でサーバーを起動：
   ```powershell
   npm run dev
   ```

2. 各APIエンドポイントをテスト：
   - `/api/ping` - ヘルスチェック
   - `/api/seller/...` - 売主関連API
   - `/api/order/...` - 注文関連API

3. データが正しく取得できることを確認

### 5.2 Render環境での確認

1. Render Dashboardでデプロイが完了するまで待つ
2. 検証環境のURLにアクセス
3. 各機能が正常に動作することを確認

---

## 📋 チェックリスト

### データダンプ

- [ ] データソースを選択（検証環境 or 本番環境）
- [ ] データをCSV形式でダンプ
- [ ] すべてのテーブルのCSVファイルが作成されたことを確認

### データインポート

- [ ] Supabase接続文字列を設定
- [ ] 親テーブルから順にインポート（外部キー制約を考慮）
- [ ] すべてのテーブルのインポートが完了

### データ整合性

- [ ] レコード数を確認（元のデータソースと比較）
- [ ] サンプルデータを確認
- [ ] 外部キー制約を確認
- [ ] アプリケーション経由でデータが取得できることを確認

---

## 🐛 トラブルシューティング

### 問題1: 外部キー制約エラー

**エラーメッセージ例**:
```
ERROR: insert or update on table "orders" violates foreign key constraint
```

**対処方法**:
- データのインポート順序を確認（親→子の順）
- 親テーブルのデータが存在することを確認
- 外部キー参照が正しいか確認

### 問題2: データ型の不一致

**エラーメッセージ例**:
```
ERROR: invalid input syntax for type uuid
```

**対処方法**:
- CSVファイルのデータ型を確認
- UUID形式が正しいか確認
- NULL値の扱いを確認

### 問題3: レコード数が一致しない

**対処方法**:
- 元のデータソースでレコード数を再確認
- インポート時のエラーログを確認
- 部分的にインポートできていないテーブルがないか確認

---

## 📚 次のステップ

データ移行が完了したら：

1. **動作確認**（すべてのAPIエンドポイント）
2. **パフォーマンステスト**（必要に応じて）
3. **本番環境への移行準備**（検証環境で問題がないことを確認後）

---

## 🔗 関連リンク

- **Supabase Dashboard**: https://app.supabase.com
- **SQL Editor**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/sql/new
- **Render Dashboard**: https://dashboard.render.com

---

## ⚠️ 注意事項

1. **データソースの選択**
   - 検証環境のテストデータ: 軽量で移行が速い
   - 本番環境のデータ: より実データに近い検証が可能
   - 本番データを使用する場合は、機密情報の取り扱いに注意

2. **インポート順序**
   - 必ず親テーブル→子テーブルの順でインポート
   - 外部キー制約を満たす順序で実行

3. **データ整合性**
   - 移行後、必ずレコード数を確認
   - サンプルデータを確認して整合性を検証

