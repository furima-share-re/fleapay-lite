# 検証環境DB移行ガイド（Render → Supabase）

このガイドでは、検証環境のデータベースをRender PostgreSQLからSupabaseに移行する手順を説明します。

## 📋 前提条件

1. Supabaseアカウントを持っていること
2. PostgreSQLクライアント（`pg_dump`, `psql`）がインストールされていること
3. 現在のRender DBの接続情報が取得できること

## 🔧 ステップ1: Supabaseプロジェクトの作成

### 1.1 Supabaseダッシュボードでプロジェクト作成

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. **New Project** をクリック
3. プロジェクト情報を入力：
   - **Name**: `fleapay-lite-staging`（検証環境の場合）
   - **Database Password**: 強力なパスワードを設定（必ず保存）
   - **Region**: `Tokyo (North)` または `Singapore (Southeast Asia)`（レイテンシを考慮）
   - **Pricing Plan**: Free tier で開始可能

### 1.2 接続情報の取得

プロジェクト作成後、以下の情報を取得して保存します：

1. **Database URL**（接続文字列）:
   - Settings > Database > Connection string > URI
   - 形式: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

2. **Supabase URL**:
   - Settings > API > Project URL
   - 形式: `https://[PROJECT-REF].supabase.co`

3. **API Keys**:
   - Settings > API > Project API keys
   - `anon` `public` key: フロントエンド用
   - `service_role` `secret` key: サーバーサイド用（RLSバイパス）

これらの情報は `.env` ファイルに保存します（後述）。

---

## 📦 ステップ2: Render DBからのスキーマ・データダンプ

### 2.1 接続情報の確認

Render Dashboardから現在のDB接続情報を取得：

1. Render Dashboardにログイン
2. データベース `fleapay-lite-db` を選択
3. **Connections** タブを開く
4. **External Database URL** をコピー（ローカルから接続する場合）

または、既存の接続文字列を使用：
```
postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db
```

### 2.2 スキーマのみダンプ

```bash
# PowerShell
$env:DATABASE_URL="postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"
pg_dump $env:DATABASE_URL --schema-only --no-owner --no-privileges -f schema.sql
```

```bash
# Git Bash / WSL
export DATABASE_URL="postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges -f schema.sql
```

### 2.3 データのみダンプ（COPY方式）

外部キー制約を考慮した投入順序でエクスポートします：

```bash
# PowerShell
$env:DATABASE_URL="postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"

# 親テーブルから順にエクスポート（外部キーの依存関係を考慮）
psql "$env:DATABASE_URL" -c "\COPY frames TO 'frames.csv' CSV HEADER"
psql "$env:DATABASE_URL" -c "\COPY sellers TO 'sellers.csv' CSV HEADER"
psql "$env:DATABASE_URL" -c "\COPY orders TO 'orders.csv' CSV HEADER"
psql "$env:DATABASE_URL" -c "\COPY order_items TO 'order_items.csv' CSV HEADER"
psql "$env:DATABASE_URL" -c "\COPY images TO 'images.csv' CSV HEADER"
psql "$env:DATABASE_URL" -c "\COPY stripe_payments TO 'stripe_payments.csv' CSV HEADER"
psql "$env:DATABASE_URL" -c "\COPY qr_sessions TO 'qr_sessions.csv' CSV HEADER"
psql "$env:DATABASE_URL" -c "\COPY buyer_attributes TO 'buyer_attributes.csv' CSV HEADER"
psql "$env:DATABASE_URL" -c "\COPY order_metadata TO 'order_metadata.csv' CSV HEADER"
psql "$env:DATABASE_URL" -c "\COPY kids_achievements TO 'kids_achievements.csv' CSV HEADER"
```

```bash
# Git Bash / WSL
export DATABASE_URL="postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"

psql "$DATABASE_URL" -c "\COPY frames TO 'frames.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\COPY sellers TO 'sellers.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\COPY orders TO 'orders.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\COPY order_items TO 'order_items.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\COPY images TO 'images.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\COPY stripe_payments TO 'stripe_payments.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\COPY qr_sessions TO 'qr_sessions.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\COPY buyer_attributes TO 'buyer_attributes.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\COPY order_metadata TO 'order_metadata.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\COPY kids_achievements TO 'kids_achievements.csv' CSV HEADER"
```

**注意**: テーブルが存在しない場合は、エラーが表示されますが、そのテーブルはスキップして続行してください。

---

## 🗄️ ステップ3: Supabaseへのスキーマ移行

### 3.1 schema.sql の前処理

`schema.sql` を開き、以下の行を削除またはコメントアウトします：

1. **CREATE EXTENSION 行**:
   ```sql
   -- 削除またはコメントアウト
   -- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```
   （Supabaseでは既に必要な拡張が有効）

2. **OWNER関連**:
   ```sql
   -- 削除
   -- ALTER TABLE ... OWNER TO ...;
   ```

3. **GRANT/REVOKE**:
   ```sql
   -- 削除
   -- GRANT ... TO ...;
   -- REVOKE ... FROM ...;
   ```

### 3.2 Supabase SQL Editorで実行

1. Supabase Dashboard > **SQL Editor** を開く
2. **New query** をクリック
3. `schema.sql` の内容をコピー＆ペースト
4. **Run** をクリックして実行

**エラーが出た場合**:
- エラーメッセージを確認
- 該当行を修正または削除
- 再度実行

**推奨**: 一度に全部実行せず、テーブル定義ごとに分割して実行することを推奨します：
1. まず `frames` テーブル
2. 次に `sellers` テーブル
3. その後、外部キー参照があるテーブル（`orders`など）

---

## 📊 ステップ4: Supabaseへのデータ移行

### 4.1 データファイルの準備

ステップ2.3で作成したCSVファイルが同じディレクトリにあることを確認します。

### 4.2 Supabase接続文字列の設定

```bash
# PowerShell
$env:SUPABASE_DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Git Bash / WSL
export SUPABASE_DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

**注意**: `[PASSWORD]` と `[PROJECT-REF]` を実際の値に置き換えてください。

### 4.3 データのインポート（親→子の順）

外部キー制約を考慮して、親テーブルから順にインポートします：

```bash
# PowerShell
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY frames FROM 'frames.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY sellers FROM 'sellers.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY orders FROM 'orders.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY order_items FROM 'order_items.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY images FROM 'images.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY stripe_payments FROM 'stripe_payments.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY qr_sessions FROM 'qr_sessions.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY buyer_attributes FROM 'buyer_attributes.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY order_metadata FROM 'order_metadata.csv' CSV HEADER"
psql "$env:SUPABASE_DATABASE_URL" -c "\COPY kids_achievements FROM 'kids_achievements.csv' CSV HEADER"
```

```bash
# Git Bash / WSL
psql "$SUPABASE_DATABASE_URL" -c "\COPY frames FROM 'frames.csv' CSV HEADER"
psql "$SUPABASE_DATABASE_URL" -c "\COPY sellers FROM 'sellers.csv' CSV HEADER"
psql "$SUPABASE_DATABASE_URL" -c "\COPY orders FROM 'orders.csv' CSV HEADER"
psql "$SUPABASE_DATABASE_URL" -c "\COPY order_items FROM 'order_items.csv' CSV HEADER"
psql "$SUPABASE_DATABASE_URL" -c "\COPY images FROM 'images.csv' CSV HEADER"
psql "$SUPABASE_DATABASE_URL" -c "\COPY stripe_payments FROM 'stripe_payments.csv' CSV HEADER"
psql "$SUPABASE_DATABASE_URL" -c "\COPY qr_sessions FROM 'qr_sessions.csv' CSV HEADER"
psql "$SUPABASE_DATABASE_URL" -c "\COPY buyer_attributes FROM 'buyer_attributes.csv' CSV HEADER"
psql "$SUPABASE_DATABASE_URL" -c "\COPY order_metadata FROM 'order_metadata.csv' CSV HEADER"
psql "$SUPABASE_DATABASE_URL" -c "\COPY kids_achievements FROM 'kids_achievements.csv' CSV HEADER"
```

---

## ✅ ステップ5: データ整合性チェック

### 5.1 レコード数の確認

```sql
-- Supabase SQL Editorで実行
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

### 5.2 サンプルデータの確認

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
```

---

## 🔄 ステップ6: 環境変数の更新

### 6.1 ローカル環境の `.env` ファイル

プロジェクトルートの `.env` ファイルを更新：

```env
# Supabase接続文字列
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase API（将来の認証移行用）
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# 既存の環境変数（そのまま維持）
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
# ... その他の環境変数
```

### 6.2 Render環境変数の更新

1. Render Dashboardにログイン
2. `fleapay-lite-web-preview` サービスを選択
3. **Environment** タブを開く
4. `DATABASE_URL` をSupabase接続文字列に更新
5. （オプション）Supabase関連の環境変数を追加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔧 ステップ7: Prisma設定の更新

### 7.1 Prismaスキーマの生成

```bash
# プロジェクトルートで実行
npm install
npx prisma db pull
npx prisma generate
```

これにより、Supabaseのスキーマから `prisma/schema.prisma` が生成されます。

### 7.2 動作確認

```bash
# ローカルサーバーを起動
npm run dev

# 別ターミナルでヘルスチェック
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing | Select-Object -ExpandProperty Content

# Git Bash / WSL
curl http://localhost:3000/api/ping
```

**期待されるレスポンス**:
```json
{
  "ok": true,
  "timestamp": "2025-01-15T...",
  "version": "...",
  "prisma": "connected"
}
```

---

## 🚀 ステップ8: Renderへのデプロイ

1. 変更をコミット・プッシュ：
   ```bash
   git add .
   git commit -m "chore: migrate staging DB to Supabase"
   git push
   ```

2. Renderが自動デプロイを開始します

3. デプロイ完了後、検証環境の動作確認：
   - 各APIエンドポイントが正常に動作することを確認
   - データが正しく取得できることを確認

---

## 🐛 トラブルシューティング

### 問題1: `pg_dump` が見つからない

**対処方法**:
- Windows: [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/)からインストール
- WSL: `sudo apt-get install postgresql-client`
- macOS: `brew install postgresql`

### 問題2: 接続エラー

**確認事項**:
- 接続文字列が正しいか
- パスワードが正しいか（URLエンコードが必要な場合がある）
- ファイアウォール設定（Supabaseは外部接続を許可）

### 問題3: 外部キー制約エラー

**対処方法**:
- データのインポート順序を確認（親→子）
- 親テーブルのデータが存在することを確認

### 問題4: データ型の不一致

**対処方法**:
- `schema.sql` を確認し、Supabaseでサポートされている型を使用
- UUID型は `gen_random_uuid()` を使用（Supabaseでは利用可能）

---

## 📝 チェックリスト

- [ ] Supabaseプロジェクトを作成
- [ ] Supabase接続情報を取得・保存
- [ ] Render DBからスキーマをダンプ（`schema.sql`）
- [ ] Render DBからデータをダンプ（CSVファイル）
- [ ] `schema.sql` を前処理（EXTENSION、OWNER、GRANT削除）
- [ ] Supabase SQL Editorでスキーマを実行
- [ ] Supabaseにデータをインポート
- [ ] データ整合性チェック
- [ ] `.env` ファイルを更新
- [ ] Render環境変数を更新
- [ ] Prismaスキーマを生成（`prisma db pull`）
- [ ] ローカルで動作確認
- [ ] Renderにデプロイ
- [ ] 検証環境で動作確認

---

## 🔗 関連ドキュメント

- [MIGRATION_EXECUTION_PLAN.md](../MIGRATION_EXECUTION_PLAN.md) - 全体の移行計画
- [PHASE_1_2_SETUP_GUIDE.md](../PHASE_1_2_SETUP_GUIDE.md) - Prisma設定ガイド
- [SUPABASE_MIGRATION_ANALYSIS.md](../SUPABASE_MIGRATION_ANALYSIS.md) - Supabase移行の詳細分析

