# Phase 1.8: Step 4 - データ移行 実行準備完了

**実行日**: 2026-01-04  
**状態**: ✅ 準備完了

---

## ✅ 準備状況確認

- [x] PostgreSQL 18.1がインストール済み
- [x] `pg_restore`コマンドが動作確認済み
- [x] Exportファイルが展開済み
- [ ] Supabaseプロジェクトが作成済み
- [ ] Supabaseの接続情報を取得済み
- [ ] Step 3（スキーマ移行）が完了済み

---

## 🚀 Step 4: データ移行の実行

### 事前確認

1. **Supabaseプロジェクトが作成済みか確認**
   - [Supabase Dashboard](https://app.supabase.com) にログイン
   - 本番環境プロジェクト（`fleapay-lite-prod`）が存在するか確認

2. **Step 3（スキーマ移行）が完了済みか確認**
   - Supabase SQL Editorで以下を実行：
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   - 11個のテーブルが表示されることを確認

3. **Supabase接続情報を取得**
   - Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI** をコピー
   - 形式: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`

---

## 📋 実行手順

### Step 1: プロジェクトディレクトリに移動

```powershell
# プロジェクトルートに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"
```

---

### Step 2: 展開したディレクトリに移動

```powershell
# 展開したディレクトリに移動
cd tmp\2026-01-03T15:42Z\fleapay_prod_db
```

**確認**:
```powershell
# ファイルが存在するか確認
Get-ChildItem | Select-Object Name
```

`toc.dat`と複数の`.dat`ファイルが表示されればOKです。

---

### Step 3: Supabase接続情報を設定

```powershell
# Supabase接続情報を設定（パスワードとプロジェクト参照IDを置き換えてください）
$SUPABASE_URL = "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres"
```

**重要**:
- `あなたのパスワード` を実際のパスワードに置き換えてください
- `xxxxx` を実際のプロジェクト参照IDに置き換えてください
- パスワードに特殊文字が含まれている場合は、URLエンコードが必要な場合があります

**接続情報の取得方法**:
1. Supabase Dashboard → **Settings** → **Database**
2. **Connection string** セクションを開く
3. **URI** をクリックしてコピー

---

### Step 4: pg_restoreでインポート実行

```powershell
# pg_restoreでインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

**コマンドの説明**:
- `--dbname=$SUPABASE_URL`: Supabaseの接続URLを指定
- `--verbose`: 詳細な出力を表示（進捗が見える）
- `--clean`: 既存のオブジェクトを削除してから再作成（安全のため）
- `--no-owner`: 所有者情報を無視（Supabaseでは必要）
- `--no-privileges`: 権限情報を無視（Supabaseでは必要）
- `.`: 現在のディレクトリ（展開したディレクトリ）を指定

**実行時間**: 約1-3時間（データ量による）

**進捗の見方**:
```
pg_restore: creating TABLE "public.frames"
pg_restore: creating TABLE "public.sellers"
pg_restore: creating TABLE "public.orders"
...
```
このように、テーブルごとの進捗が表示されます。

---

## ⚠️ 実行中の注意事項

### 1. エラーが発生した場合

**エラーメッセージを確認**:
- 接続エラーの場合: 接続情報が正しいか確認
- スキーマエラーの場合: Step 3（スキーマ移行）が完了しているか確認
- 権限エラーの場合: `--no-owner`と`--no-privileges`フラグが正しく設定されているか確認

### 2. 実行が完了するまで待つ

- データ量が多い場合、1-3時間かかる場合があります
- 進捗を確認しながら待ちます
- エラーが発生していないか確認します

### 3. 実行中の中断

- **Ctrl + C**で中断できますが、推奨しません
- 中断した場合、部分的にデータがインポートされている可能性があります
- 再度実行する場合は、`--clean`フラグにより既存データが削除されます

---

## ✅ 実行後の確認

### 1. レコード数の確認

Supabase SQL Editorで以下を実行：

```sql
-- レコード数の確認
SELECT 
  'sellers' as table_name, COUNT(*) as count FROM sellers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'stripe_payments', COUNT(*) FROM stripe_payments
UNION ALL
SELECT 'order_metadata', COUNT(*) FROM order_metadata
UNION ALL
SELECT 'buyer_attributes', COUNT(*) FROM buyer_attributes
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'images', COUNT(*) FROM images
UNION ALL
SELECT 'qr_sessions', COUNT(*) FROM qr_sessions
UNION ALL
SELECT 'frames', COUNT(*) FROM frames
UNION ALL
SELECT 'kids_achievements', COUNT(*) FROM kids_achievements
UNION ALL
SELECT 'seller_subscriptions', COUNT(*) FROM seller_subscriptions;
```

**期待される結果**: 元のデータベースと同じレコード数が表示されること

---

### 2. サンプルデータの確認

```sql
-- sellersテーブルのサンプルデータ確認
SELECT id, display_name, shop_name, email, created_at
FROM sellers
LIMIT 5;

-- ordersテーブルのサンプルデータ確認
SELECT id, seller_id, order_no, amount, status, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;
```

**確認ポイント**:
- ✅ データが正しく表示される
- ✅ 日付や金額が正しい形式で表示される

---

## 📋 完全なコマンド例（コピペ用）

```powershell
# 1. プロジェクトディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# 2. 展開したディレクトリに移動
cd tmp\2026-01-03T15:42Z\fleapay_prod_db

# 3. Supabase接続情報を設定（パスワードとプロジェクト参照IDを置き換えてください）
$SUPABASE_URL = "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres"

# 4. pg_restoreでインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 🎯 次のステップ

Step 4が完了したら：

1. **データ整合性を確認**
2. **Step 5: 本番環境の環境変数設定**
3. **Step 6: 動作確認**

---

**準備ができたら、上記のコマンドを実行してください！**

