# Node.jsスクリプトでデータ移行する手順

**更新日**: 2026-01-01

---

## 📋 前提条件

1. Node.jsがインストールされていること（v18以上推奨）
2. `pg`パッケージがインストールされていること（既に`package.json`に含まれています）

---

## 🚀 実行手順

### ステップ1: Node.jsの確認

PowerShellで以下を実行して、Node.jsがインストールされているか確認：

```powershell
node --version
```

**出力例**:
```
v18.17.0
```

**もし`node`コマンドが見つからない場合**:
- [Node.js公式サイト](https://nodejs.org/)からインストール
- インストール後、PowerShellを再起動

---

### ステップ2: 依存関係のインストール（初回のみ）

プロジェクトルートで以下を実行：

```powershell
npm install
```

これにより、`pg`パッケージがインストールされます（既に`package.json`に含まれています）。

---

### ステップ3: データのダンプ（Render → CSV）

#### 3.1 接続文字列の準備

**本番環境からダンプする場合**:
```powershell
# 接続文字列（ポート番号を追加）
$SOURCE_URL = "postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a:5432/fleapay_prod_db"
```

**検証環境からダンプする場合**:
```powershell
# Render Dashboardから取得した検証環境の接続文字列を使用
$SOURCE_URL = "postgresql://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"
```

#### 3.2 ダンプの実行

```powershell
# データをCSV形式でダンプ
node scripts/migrate-data-nodejs.js dump $SOURCE_URL "./dump-staging"
```

**実行例**:
```powershell
PS C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite> node scripts/migrate-data-nodejs.js dump "postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a:5432/fleapay_prod_db" "./dump-staging"
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
[3/10] orders をエクスポート中...
  ✅ orders.csv を作成しました (25 行)
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

### ステップ4: データのインポート（CSV → Supabase）

#### 4.1 Supabase接続文字列の準備

Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI** をコピー

```powershell
# Supabase接続文字列（パスワードを実際の値に置き換えてください）
$SUPABASE_URL = "postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres"
```

**重要**: `[YOUR-PASSWORD]` をプロジェクト作成時に設定したデータベースパスワードに置き換えてください。

#### 4.2 インポートの実行

```powershell
# Supabaseにデータをインポート
node scripts/migrate-data-nodejs.js import $SUPABASE_URL "./dump-staging"
```

**実行例**:
```powershell
PS C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite> node scripts/migrate-data-nodejs.js import "postgresql://postgres:your-password@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres" "./dump-staging"
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
[3/10] orders をインポート中...
  ✅ orders のインポートが完了しました (25 行)
...

==================================================
インポート結果
==================================================

✅ 成功したテーブル (10):
  - frames
  - sellers
  - orders
  - order_items
  - images
  - stripe_payments
  - qr_sessions
  - buyer_attributes
  - order_metadata
  - kids_achievements

✅ すべてのテーブルのインポートが完了しました！
```

---

### ステップ5: データ整合性の確認

Supabase SQL Editorで以下を実行：

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

## 📝 完全な実行例

### 本番環境からダンプ → Supabaseにインポート

```powershell
# ステップ1: データをダンプ
node scripts/migrate-data-nodejs.js dump "postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a:5432/fleapay_prod_db" "./dump-staging"

# ステップ2: Supabaseにインポート（パスワードを実際の値に置き換えてください）
node scripts/migrate-data-nodejs.js import "postgresql://postgres:your-password@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres" "./dump-staging"
```

### 検証環境からダンプ → Supabaseにインポート

```powershell
# ステップ1: データをダンプ
node scripts/migrate-data-nodejs.js dump "postgresql://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" "./dump-staging"

# ステップ2: Supabaseにインポート（パスワードを実際の値に置き換えてください）
node scripts/migrate-data-nodejs.js import "postgresql://postgres:your-password@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres" "./dump-staging"
```

---

## 🐛 トラブルシューティング

### 問題1: `node`コマンドが見つからない

**エラーメッセージ**:
```
node : 用語 'node' は、コマンドレット、関数、スクリプト ファイル、または操作可能なプログラムの名前として認識されません。
```

**対処方法**:
1. [Node.js公式サイト](https://nodejs.org/)からインストール
2. インストール後、PowerShellを再起動
3. `node --version`で確認

### 問題2: 接続エラー

**エラーメッセージ**:
```
❌ エラーが発生しました: connect ECONNREFUSED
```

**対処方法**:
- 接続文字列にポート番号（`:5432`）が含まれているか確認
- ホスト名が正しいか確認
- ファイアウォール設定を確認

### 問題3: 認証エラー

**エラーメッセージ**:
```
❌ エラーが発生しました: password authentication failed
```

**対処方法**:
- パスワードが正しいか確認
- 接続文字列のパスワード部分がURLエンコードされているか確認（特殊文字を含む場合）

### 問題4: モジュールが見つからない

**エラーメッセージ**:
```
Error: Cannot find module 'pg'
```

**対処方法**:
```powershell
npm install
```

---

## ✅ チェックリスト

- [ ] Node.jsがインストールされている（`node --version`で確認）
- [ ] 依存関係がインストールされている（`npm install`を実行）
- [ ] 接続文字列を準備（Render環境とSupabase環境）
- [ ] データをダンプ（`node scripts/migrate-data-nodejs.js dump ...`）
- [ ] CSVファイルが生成されたことを確認
- [ ] データをインポート（`node scripts/migrate-data-nodejs.js import ...`）
- [ ] インポート結果を確認
- [ ] データ整合性をチェック（Supabase SQL Editor）

---

## 🔗 関連ドキュメント

- [DATA_MIGRATION_NODEJS_GUIDE.md](./DATA_MIGRATION_NODEJS_GUIDE.md) - 詳細ガイド
- [DATA_MIGRATION_EXECUTION.md](./DATA_MIGRATION_EXECUTION.md) - 実行手順

