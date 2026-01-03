# Supabaseデータインポート クイックガイド

**作成日**: 2026-01-04  
**目的**: Supabaseへのデータインポートを簡単に実行する

---

## 🎯 利用可能なインポート機能

プロジェクトには以下のインポート機能が用意されています：

| スクリプト | 環境 | 用途 |
|-----------|------|------|
| `scripts/import-to-supabase.ps1` | PowerShell (Windows) | CSV形式のデータをインポート |
| `scripts/import-to-supabase.sh` | Bash (Linux/macOS/WSL) | CSV形式のデータをインポート |
| `scripts/migrate-data-nodejs.js` | Node.js (全OS) | psql不要でインポート可能 |

---

## 🚀 使い方（3ステップ）

### Step 1: データの準備

CSVファイルを準備します。各テーブルごとにCSVファイルが必要です。

**必要なCSVファイル**:
- `frames.csv`
- `sellers.csv`
- `orders.csv`
- `order_items.csv`
- `images.csv`
- `stripe_payments.csv`
- `qr_sessions.csv`
- `buyer_attributes.csv`
- `order_metadata.csv`
- `kids_achievements.csv`

**データのエクスポート方法**（元のDBから）:

```powershell
# 元のデータベース接続文字列を設定
$SOURCE_DB_URL = "postgresql://user:password@host:5432/database"

# CSV形式でエクスポート
psql $SOURCE_DB_URL -c "\COPY frames TO 'frames.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY sellers TO 'sellers.csv' CSV HEADER"
# ... 他のテーブルも同様に
```

または、Node.jsスクリプトを使用：

```powershell
node scripts/migrate-data-nodejs.js dump $SOURCE_DB_URL "./dump"
```

### Step 2: Supabase接続情報の取得

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** → **Connection string** → **URI**をコピー

**接続文字列の形式**:
```
postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres
```

### Step 3: インポート実行

#### 方法A: PowerShellスクリプト（Windows推奨）

```powershell
.\scripts\import-to-supabase.ps1 `
  -SupabaseDatabaseUrl "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres" `
  -DataDir "./dump"
```

#### 方法B: Bashスクリプト（Linux/macOS/WSL）

```bash
./scripts/import-to-supabase.sh \
  "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres" \
  "./dump"
```

#### 方法C: Node.jsスクリプト（psql不要）

```powershell
node scripts/migrate-data-nodejs.js import \
  "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres" \
  "./dump"
```

---

## 📋 実行例

### 完全な例（PowerShell）

```powershell
# 1. データのエクスポート（元のDBから）
$SOURCE_DB_URL = "postgresql://user:pass@host:5432/db"
node scripts/migrate-data-nodejs.js dump $SOURCE_DB_URL "./dump"

# 2. Supabaseへのインポート
$SUPABASE_URL = "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
.\scripts\import-to-supabase.ps1 -SupabaseDatabaseUrl $SUPABASE_URL -DataDir "./dump"
```

### 完全な例（Bash）

```bash
# 1. データのエクスポート（元のDBから）
SOURCE_DB_URL="postgresql://user:pass@host:5432/db"
node scripts/migrate-data-nodejs.js dump "$SOURCE_DB_URL" "./dump"

# 2. Supabaseへのインポート
SUPABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
./scripts/import-to-supabase.sh "$SUPABASE_URL" "./dump"
```

---

## ✅ インポート後の確認

### レコード数の確認

Supabase SQL Editorで以下を実行：

```sql
SELECT 
  'sellers' as table_name, COUNT(*) as count FROM sellers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'stripe_payments', COUNT(*) FROM stripe_payments
UNION ALL
SELECT 'frames', COUNT(*) FROM frames
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items;
```

### サンプルデータの確認

```sql
-- 最新の注文を確認
SELECT id, seller_id, amount, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔧 インポートスクリプトの詳細

### PowerShell版 (`import-to-supabase.ps1`)

**機能**:
- CSVファイルを自動的に検出
- 親→子の順序で自動インポート（外部キー制約を考慮）
- 進捗表示とエラーハンドリング
- 成功/失敗のテーブル一覧を表示

**使用方法**:
```powershell
.\scripts\import-to-supabase.ps1 `
  -SupabaseDatabaseUrl "postgresql://..." `
  -DataDir "./dump"
```

**パラメータ**:
- `-SupabaseDatabaseUrl` (必須): Supabaseの接続文字列
- `-DataDir` (オプション): CSVファイルがあるディレクトリ（デフォルト: `.`）

### Bash版 (`import-to-supabase.sh`)

**機能**:
- PowerShell版と同等の機能
- Linux/macOS/WSL環境で使用可能

**使用方法**:
```bash
./scripts/import-to-supabase.sh \
  "postgresql://..." \
  "./dump"
```

**引数**:
1. Supabaseの接続文字列（必須）
2. CSVファイルがあるディレクトリ（オプション、デフォルト: `.`）

### Node.js版 (`migrate-data-nodejs.js`)

**機能**:
- `psql`がインストールされていない環境でも動作
- エクスポートとインポートの両方をサポート
- エラーハンドリングが充実

**使用方法**:
```powershell
# エクスポート
node scripts/migrate-data-nodejs.js dump <SOURCE_DB_URL> <OUTPUT_DIR>

# インポート
node scripts/migrate-data-nodejs.js import <TARGET_DB_URL> <DATA_DIR>
```

---

## ⚠️ 注意事項

### インポート順序

スクリプトは自動的に以下の順序でインポートします（外部キー制約を考慮）：

1. `frames`（親テーブル）
2. `sellers`（親テーブル）
3. `orders`（`sellers`と`frames`を参照）
4. `order_items`（`orders`を参照）
5. `images`（`orders`を参照）
6. `stripe_payments`（`sellers`と`orders`を参照）
7. `qr_sessions`（`sellers`と`orders`を参照）
8. `buyer_attributes`（`orders`を参照）
9. `order_metadata`（`orders`を参照）
10. `kids_achievements`（`sellers`を参照）

### 前提条件

1. **スキーマが既に作成されていること**
   - Supabase SQL Editorで `.ai/history/sql/supabase_schema.sql` を実行済みであること

2. **CSVファイルの形式**
   - ヘッダー行が必要（`CSV HEADER`形式）
   - UTF-8エンコーディング

3. **PostgreSQLクライアントツール**（PowerShell/Bash版の場合）
   - `psql`がインストールされていること
   - PATHに追加されていること

---

## 🐛 トラブルシューティング

### エラー: `psql: command not found`

**原因**: PostgreSQLクライアントツールがインストールされていない

**解決方法**:
1. PostgreSQLクライアントツールをインストール
2. PowerShellを再起動
3. `PHASE_1_8_SETUP_PG_PATH.ps1`を実行してPATHを設定

### エラー: `relation "xxx" does not exist`

**原因**: スキーマが作成されていない

**解決方法**:
1. Supabase SQL Editorで `.ai/history/sql/supabase_schema.sql` を実行
2. テーブルが作成されているか確認

### エラー: `foreign key constraint violation`

**原因**: インポート順序が間違っている

**解決方法**:
- スクリプトを使用している場合は、自動的に正しい順序でインポートされます
- 手動でインポートしている場合は、親テーブルから順にインポートしてください

### エラー: `permission denied`

**原因**: Supabaseの接続情報が間違っている

**解決方法**:
1. Supabase Dashboardで接続情報を再確認
2. パスワードが正しいか確認
3. 接続文字列の形式が正しいか確認

---

## 📚 関連ドキュメント

- [`SUPABASE_DATA_MIGRATION_COMPLETE_GUIDE.md`](../SUPABASE_DATA_MIGRATION_COMPLETE_GUIDE.md) - 包括的な移行ガイド
- [`PHASE_1_8_PG_RESTORE_SIMPLE_GUIDE.md`](../PHASE_1_8_PG_RESTORE_SIMPLE_GUIDE.md) - pg_restoreを使った移行方法
- [`scripts/migrate-to-supabase.md`](./scripts/migrate-to-supabase.md) - 詳細な移行ガイド
- [`scripts/README.md`](./scripts/README.md) - スクリプトの概要

---

## ✅ チェックリスト

- [ ] CSVファイルが準備されている
- [ ] Supabase接続情報を取得済み
- [ ] スキーマがSupabaseに作成済み
- [ ] PostgreSQLクライアントツールがインストール済み（PowerShell/Bash版の場合）
- [ ] インポートスクリプトを実行
- [ ] データ整合性をチェック

---

**準備ができたら、上記の手順に従ってインポートを実行してください！**

