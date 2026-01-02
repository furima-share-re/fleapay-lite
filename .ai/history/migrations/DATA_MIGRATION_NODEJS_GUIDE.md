# Node.jsを使用したデータ移行ガイド

`psql`が使えない環境でも、Node.jsスクリプトでデータ移行が可能です。

---

## 🚀 クイックスタート

### ステップ1: データのダンプ（Render → CSV）

```powershell
# 本番環境からデータをダンプ（接続文字列は実際の値に置き換えてください）
node scripts/migrate-data-nodejs.js dump "postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a/fleapay_prod_db" "./dump-staging"
```

**注意**: 
- 接続文字列の形式が `postgresql://` で始まっていることを確認してください
- ポート番号が含まれていない場合は、接続文字列の末尾に `:5432` を追加する必要がある場合があります

**修正例**:
```powershell
# ポート番号を追加
node scripts/migrate-data-nodejs.js dump "postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a:5432/fleapay_prod_db" "./dump-staging"
```

### ステップ2: データのインポート（CSV → Supabase）

```powershell
# Supabaseにデータをインポート（パスワードを実際の値に置き換えてください）
node scripts/migrate-data-nodejs.js import "postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres" "./dump-staging"
```

**重要**: `[YOUR-PASSWORD]` をSupabaseプロジェクト作成時に設定したデータベースパスワードに置き換えてください。

---

## 📋 詳細手順

### 1. 接続文字列の確認

#### Render環境の接続文字列

Render Dashboard → データベースサービス → **Connection** タブ → **Internal Database URL** または **External Database URL** をコピー

**形式の例**:
```
postgresql://user:password@host:5432/database
```

**注意**: 接続文字列にポート番号（`:5432`）が含まれていない場合は、手動で追加してください。

#### Supabase接続文字列

Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI** をコピー

**形式**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

---

### 2. データダンプの実行

```powershell
node scripts/migrate-data-nodejs.js dump "<SOURCE_DATABASE_URL>" "<OUTPUT_DIR>"
```

**パラメータ**:
- `<SOURCE_DATABASE_URL>`: Render環境のデータベース接続文字列
- `<OUTPUT_DIR>`: CSVファイルの出力先ディレクトリ（例: `./dump-staging`）

**実行例**:
```powershell
node scripts/migrate-data-nodejs.js dump "postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a:5432/fleapay_prod_db" "./dump-staging"
```

**期待される出力**:
```
📦 データダンプを開始します...
接続先: postgresql://fleapay_prod_db_user:****@dpg-d4bj8re3jp1c73bjaph0-a:5432/fleapay_prod_db
✅ データベースに接続しました

[1/10] frames をエクスポート中...
  ✅ frames.csv を作成しました (5 行)
[2/10] sellers をエクスポート中...
  ✅ sellers.csv を作成しました (10 行)
...
```

**生成されるファイル**:
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

### 3. データインポートの実行

```powershell
node scripts/migrate-data-nodejs.js import "<TARGET_DATABASE_URL>" "<DATA_DIR>"
```

**パラメータ**:
- `<TARGET_DATABASE_URL>`: Supabaseのデータベース接続文字列
- `<DATA_DIR>`: CSVファイルが格納されているディレクトリ（例: `./dump-staging`）

**実行例**:
```powershell
node scripts/migrate-data-nodejs.js import "postgresql://postgres:your-password@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres" "./dump-staging"
```

**期待される出力**:
```
📥 データインポートを開始します...
接続先: postgresql://postgres:****@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
✅ データベースに接続しました

[1/10] frames をインポート中...
  ✅ frames のインポートが完了しました (5 行)
[2/10] sellers をインポート中...
  ✅ sellers のインポートが完了しました (10 行)
...

==================================================
インポート結果
==================================================

✅ 成功したテーブル (10):
  - frames
  - sellers
  - orders
  ...
```

---

## ✅ データ整合性の確認

### Supabase SQL Editorで確認

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

---

## 🐛 トラブルシューティング

### 問題1: 接続エラー

**エラーメッセージ例**:
```
❌ エラーが発生しました: connect ECONNREFUSED
```

**対処方法**:
- 接続文字列が正しいか確認
- ポート番号（`:5432`）が含まれているか確認
- ホスト名が正しいか確認
- ファイアウォール設定を確認

### 問題2: 認証エラー

**エラーメッセージ例**:
```
❌ エラーが発生しました: password authentication failed
```

**対処方法**:
- パスワードが正しいか確認
- 接続文字列のパスワード部分がURLエンコードされているか確認（特殊文字を含む場合）

### 問題3: テーブルが見つからない

**エラーメッセージ例**:
```
⚠️  テーブル xxx が存在しません。スキップします。
```

**対処方法**:
- スキーマ移行が完了しているか確認
- Supabase SQL Editorでテーブルが存在するか確認

### 問題4: 外部キー制約エラー

**エラーメッセージ例**:
```
⚠️  行の挿入でエラー: insert or update on table "orders" violates foreign key constraint
```

**対処方法**:
- インポート順序が正しいか確認（親→子の順）
- 親テーブルのデータが存在するか確認

---

## 📝 注意事項

1. **接続文字列の形式**
   - `postgresql://` で始まる必要があります
   - ポート番号が含まれていない場合は、`:5432` を追加してください

2. **データ量**
   - 大規模なデータ（10万行以上）の場合は、処理に時間がかかる可能性があります
   - メモリ不足が発生する場合は、バッチ処理を検討してください

3. **既存データ**
   - インポート前に既存データを削除します（`TRUNCATE TABLE`）
   - 既存データを保持したい場合は、スクリプトを修正してください

---

## 🔗 関連ドキュメント

- [DATA_MIGRATION_EXECUTION.md](./DATA_MIGRATION_EXECUTION.md) - 実行手順
- [SUPABASE_DATA_MIGRATION_GUIDE.md](./SUPABASE_DATA_MIGRATION_GUIDE.md) - 詳細ガイド

