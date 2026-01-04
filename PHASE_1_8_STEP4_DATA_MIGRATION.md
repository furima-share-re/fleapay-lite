# Phase 1.8: Step 4 - Supabaseへのデータ移行 実行手順

**実行日**: 2026-01-04  
**所要時間**: 1-3時間（データ量による）

---

## 📋 事前準備

- [x] Step 3: スキーマ移行完了（11個のテーブルが作成済み）
- [ ] Exportファイル（`tmp/2026-01-03T15_42Z.dir.tar.gz`）が準備済み
- [ ] PostgreSQLクライアントツール（`pg_restore`）がインストール済み
- [ ] Supabaseの接続情報を取得済み

---

## 🔍 事前確認

### 1. pg_restoreコマンドの確認

```powershell
# PowerShellで実行
pg_restore --version
```

**期待される出力**: `pg_restore (PostgreSQL) 15.x` または類似のバージョン情報

**もしコマンドが見つからない場合**:
1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/) からインストーラーをダウンロード
2. インストール時に **Command Line Tools** を選択
3. インストール後、PowerShellを再起動

---

### 2. Supabase接続情報の確認

Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI** をコピー

**形式**:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**重要**: `[PASSWORD]` をプロジェクト作成時に設定したデータベースパスワードに置き換えてください。

---

## 🚀 実行手順

### Step 1: Exportファイルを展開

```powershell
# プロジェクトルートで実行
cd tmp
tar -zxvf 2026-01-03T15_42Z.dir.tar.gz
```

**展開後のディレクトリ構造**:
```
tmp/
└── 2026-01-03T15:42Z/
    └── fleapay_prod_db/
        ├── toc.dat
        └── (複数の.datファイル)
```

**確認ポイント**:
- ✅ `toc.dat` ファイルが存在する
- ✅ 複数の `.dat` ファイルが存在する

---

### Step 2: Supabaseの接続情報を設定

```powershell
# PowerShellで実行
# Supabase Dashboardで取得した接続情報を使用
$SUPABASE_URL = "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
```

**注意**: 
- `password` を実際のパスワードに置き換えてください
- `xxxxx` を実際のプロジェクト参照IDに置き換えてください
- パスワードに特殊文字が含まれている場合は、URLエンコードが必要な場合があります

---

### Step 3: 展開したディレクトリに移動

```powershell
# 展開したディレクトリに移動
cd tmp/2026-01-03T15:42Z/fleapay_prod_db
```

**確認ポイント**:
- ✅ `toc.dat` ファイルが存在する
- ✅ 複数の `.dat` ファイルが存在する

---

### Step 4: pg_restoreでインポート

```powershell
# pg_restoreでインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

**コマンドの説明**:
- `--dbname=$SUPABASE_URL`: Supabaseの接続URLを指定
- `--verbose`: 詳細な出力を表示
- `--clean`: 既存のオブジェクトを削除してから再作成
- `--no-owner`: 所有者情報を無視（Supabaseでは必要）
- `--no-privileges`: 権限情報を無視（Supabaseでは必要）
- `.`: 現在のディレクトリ（展開したディレクトリ）を指定

**実行時間**: データ量によって異なります（約1-3時間）

**進捗の確認**:
- コマンド実行中、テーブルごとの進捗が表示されます
- `ERROR` が表示された場合は、エラーメッセージを確認してください

---

### Step 5: インポート結果の確認

#### 5.1 レコード数の確認

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

#### 5.2 データ整合性の確認

```sql
-- 外部キー制約の確認
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

**確認ポイント**:
- ✅ 外部キー制約が正しく設定されている
- ✅ エラーが表示されない

---

#### 5.3 サンプルデータの確認

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

## ⚠️ エラーが発生した場合の対処

### エラー1: `pg_restore: error: connection to database failed`

**原因**: 接続情報が正しくない、またはネットワーク接続の問題

**解決方法**:
1. Supabaseの接続情報が正しいか確認
2. パスワードが正しいか確認
3. ネットワーク接続を確認
4. Supabase Dashboardでデータベースが正常に動作しているか確認

---

### エラー2: `pg_restore: error: relation "xxx" does not exist`

**原因**: スキーマが正しく作成されていない

**解決方法**:
1. Step 3（スキーマ移行）が完了しているか確認
2. Supabase SQL Editorでテーブル一覧を確認
3. 必要に応じて、Step 3を再実行

---

### エラー3: `pg_restore: error: duplicate key value violates unique constraint`

**原因**: データが既に存在している、または重複データがある

**解決方法**:
1. `--clean` フラグを使用して既存データを削除
2. または、Supabase SQL Editorで既存データを削除してから再実行

---

### エラー4: `pg_restore: error: permission denied`

**原因**: 権限の問題

**解決方法**:
1. `--no-owner` と `--no-privileges` フラグを使用
2. Supabaseの接続情報が正しいか確認

---

## 📊 進捗の確認方法

### 方法1: コマンドライン出力を確認

`pg_restore` コマンド実行中、以下のような出力が表示されます：

```
pg_restore: creating TABLE "public.frames"
pg_restore: creating TABLE "public.sellers"
pg_restore: creating TABLE "public.orders"
...
```

**確認ポイント**:
- ✅ 各テーブルの作成が表示される
- ✅ `ERROR` が表示されない

---

### 方法2: Supabase Dashboardで確認

1. Supabase Dashboard → **Table Editor** を開く
2. 各テーブルを選択してレコード数を確認
3. データが正しく表示されることを確認

---

## ✅ 完了チェックリスト

- [ ] Exportファイルを展開した
- [ ] Supabaseの接続情報を設定した
- [ ] `pg_restore` コマンドを実行した
- [ ] エラーが発生しなかった（またはエラーを修正した）
- [ ] レコード数を確認して、元のデータベースと同じであることを確認した
- [ ] データ整合性を確認した
- [ ] サンプルデータを確認した

---

## 🎯 次のステップ

Step 4が完了したら、**Step 5: 本番環境の環境変数設定**に進みます。

**Step 5の準備**:
- [ ] Render Dashboardにログインできる
- [ ] 本番環境のサービス（`fleapay-lite-web`）を選択できる
- [ ] Supabaseの接続情報を取得済み

---

## 📋 トラブルシューティング

### 問題1: pg_restoreコマンドが見つからない

**解決方法**:
1. PostgreSQLクライアントツールをインストール
2. PowerShellを再起動
3. `pg_restore --version` で確認

---

### 問題2: インポートに時間がかかる

**解決方法**:
- データ量が多い場合、1-3時間かかる場合があります
- 進捗を確認しながら待ちます
- エラーが発生していないか確認します

---

### 問題3: データが正しくインポートされない

**解決方法**:
1. エラーメッセージを確認
2. スキーマが正しく作成されているか確認
3. 必要に応じて、`--clean` フラグを使用して再実行

---

**準備ができたら、上記の手順に従って実行してください。**

