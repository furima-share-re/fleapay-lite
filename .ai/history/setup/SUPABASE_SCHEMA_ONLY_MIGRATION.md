# Supabaseスキーマ移行ガイド（データなし）

既存データがない場合、スキーマのみを移行します。データ移行の手順は不要です。

## 📋 前提条件

- ✅ Supabaseプロジェクトが作成済み
- ✅ 接続情報を取得済み
- ✅ Render環境変数を設定済み
- ✅ 既存データなし（空のデータベース）

---

## 🔧 ステップ1: Render DBからスキーマをダンプ

### 1.1 スキーマのみダンプ

プロジェクトルートで実行：

```powershell
# PowerShell
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl "postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" `
  -OutputDir "./dump"
```

または手動で：

```powershell
# PowerShell
$env:DATABASE_URL="postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"
pg_dump $env:DATABASE_URL --schema-only --no-owner --no-privileges -f dump/schema.sql
```

**注意**: データ移行は不要なので、CSVファイルのダンプはスキップします。

---

## 📝 ステップ2: schema.sqlの前処理

### 2.1 ファイルを開く

`dump/schema.sql` をエディタで開く

### 2.2 不要な行を削除

以下の行を削除またはコメントアウト：

#### 1. CREATE EXTENSION 行

```sql
-- 削除またはコメントアウト
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

**理由**: Supabaseでは既に必要な拡張が有効

#### 2. OWNER関連

```sql
-- 削除
-- ALTER TABLE ... OWNER TO ...;
```

#### 3. GRANT/REVOKE

```sql
-- 削除
-- GRANT ... TO ...;
-- REVOKE ... FROM ...;
```

### 2.3 保存

前処理が完了したら `schema.sql` を保存

---

## 🗄️ ステップ3: Supabase SQL Editorでスキーマを実行

### 3.1 Supabase Dashboardを開く

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクト `edo ichiba staging` を選択
3. 左メニューから **SQL Editor** を開く

### 3.2 SQLを実行

#### 方法1: 一度に全部実行（推奨）

1. **New query** をクリック
2. `schema.sql` の内容をコピー＆ペースト
3. **Run** をクリック

**エラーが出た場合**:
- エラーメッセージを確認
- 該当行を修正または削除
- 再度実行

#### 方法2: 分割して実行（エラーが出た場合）

エラーが出た場合は、テーブル定義ごとに分割して実行：

1. **まず `frames` テーブル**:
   ```sql
   CREATE TABLE IF NOT EXISTS frames (
     id text primary key,
     display_name text not null,
     category text,
     metadata jsonb,
     created_at timestamptz default now()
   );
   ```

2. **次に `sellers` テーブル**:
   ```sql
   CREATE TABLE IF NOT EXISTS sellers (
     id text primary key,
     display_name text not null,
     shop_name text,
     stripe_account_id text,
     email text,
     password_hash text,
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );
   ```

3. **その後、外部キー参照があるテーブル**（`orders`など）

---

## ✅ ステップ4: スキーマの確認

### 4.1 テーブル一覧の確認

Supabase SQL Editorで実行：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**期待されるテーブル**:
- `buyer_attributes`
- `frames`
- `images`
- `kids_achievements`
- `order_items`
- `order_metadata`
- `orders`
- `qr_sessions`
- `sellers`
- `stripe_payments`

### 4.2 テーブル構造の確認

主要テーブルの構造を確認：

```sql
-- sellersテーブルの構造確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sellers'
ORDER BY ordinal_position;

-- ordersテーブルの構造確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
```

---

## 🔧 ステップ5: Prisma設定の更新

### 5.1 ローカル環境で実行

```powershell
# プロジェクトルートで実行
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# .envファイルを確認（Supabase接続文字列が設定されていることを確認）
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres

# PrismaスキーマをSupabaseから生成
npx prisma db pull

# Prisma Clientを生成
npx prisma generate
```

### 5.2 動作確認

```powershell
# ローカルサーバーを起動
npm run dev

# 別ターミナルでヘルスチェック
Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing | Select-Object -ExpandProperty Content
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

## 🚀 ステップ6: Render環境での動作確認

### 6.1 デプロイの確認

1. Render Dashboardでデプロイが完了するまで待つ
2. 検証環境のURLにアクセス：
   ```
   https://fleapay-lite-t1.onrender.com/api/ping
   ```

### 6.2 エラーログの確認

1. Render Dashboardで **Logs** タブを開く
2. エラーメッセージがないか確認
3. 接続エラーが出ていないか確認

---

## 📋 チェックリスト

### スキーマ移行

- [ ] Render DBからスキーマをダンプ（`schema.sql`）
- [ ] `schema.sql` を前処理（EXTENSION、OWNER、GRANT削除）
- [ ] Supabase SQL Editorでスキーマを実行
- [ ] テーブル一覧を確認
- [ ] テーブル構造を確認

### Prisma設定

- [ ] `.env` ファイルにSupabase接続文字列を設定
- [ ] `npx prisma db pull` を実行
- [ ] `npx prisma generate` を実行
- [ ] ローカルで動作確認

### 動作確認

- [ ] ローカル環境で `/api/ping` が動作
- [ ] Render環境で `/api/ping` が動作
- [ ] エラーログを確認

---

## 🐛 トラブルシューティング

### 問題1: スキーマ実行エラー

**対処方法**:
- `CREATE EXTENSION` 行を削除
- `OWNER` 関連の行を削除
- `GRANT` / `REVOKE` 行を削除
- エラーが出たテーブル定義を確認して修正

### 問題2: Prisma接続エラー

**対処方法**:
```powershell
# .envファイルのDATABASE_URLを確認
# Prismaスキーマを再生成
npx prisma db pull
npx prisma generate
```

### 問題3: テーブルが作成されない

**確認事項**:
- SQL Editorでエラーが出ていないか確認
- テーブル名が正しいか確認
- 外部キー制約の依存関係を確認

---

## 📚 次のステップ

スキーマ移行が完了したら：

1. **動作確認**（すべてのAPIエンドポイント）
2. **データの投入**（必要に応じて、手動またはアプリケーション経由で）
3. **本番環境への移行**（検証環境で問題がないことを確認後）

---

## 🔗 関連リンク

- **Supabase Dashboard**: https://app.supabase.com
- **SQL Editor**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/sql/new
- **Render Dashboard**: https://dashboard.render.com/web/srv-d491g7bipnbc73dpb5q0/env

---

## ⚠️ 注意事項

1. **データ移行は不要**
   - 既存データがないため、データ移行の手順はスキップします
   - 必要に応じて、アプリケーション経由でデータを投入してください

2. **スキーマの前処理**
   - `CREATE EXTENSION`、`OWNER`、`GRANT/REVOKE` を必ず削除してください
   - 削除しないとエラーが発生します

3. **外部キー制約**
   - テーブルを作成する順序に注意してください
   - 親テーブル（`frames`、`sellers`）を先に作成
   - 子テーブル（`orders`など）を後で作成

