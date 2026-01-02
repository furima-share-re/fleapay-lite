# Supabase設定完了ガイド

Supabaseプロジェクトの登録が完了したら、以下の手順で設定を進めます。

## 📋 設定チェックリスト

### ✅ 完了済み
- [x] Supabaseプロジェクトの登録

### 🔄 次のステップ
- [ ] 接続情報の取得
- [ ] 環境変数の設定
- [ ] スキーマの移行
- [ ] データの移行
- [ ] Prisma設定の更新
- [ ] 動作確認

---

## 🔑 ステップ1: 接続情報の取得

各Supabaseプロジェクト（検証環境・本番環境）から以下の情報を取得してください。

### 1.1 Database URL（接続文字列）

1. Supabase Dashboardでプロジェクトを選択
2. **Settings** > **Database** を開く
3. **Connection string** セクションで **URI** を選択
4. 接続文字列をコピー
   - 形式: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - または: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

**重要**: パスワード部分 `[PASSWORD]` は、プロジェクト作成時に設定したデータベースパスワードに置き換えてください。

### 1.2 Supabase URL（API URL）

1. **Settings** > **API** を開く
2. **Project URL** をコピー
   - 形式: `https://[PROJECT-REF].supabase.co`

### 1.3 API Keys

1. **Settings** > **API** を開く
2. **Project API keys** セクションから以下をコピー：
   - **`anon` `public`** key: フロントエンド用（RLSが有効な場合に使用）
   - **`service_role` `secret`** key: サーバーサイド用（RLSをバイパスする場合に使用）

**⚠️ 注意**: `service_role` keyは秘密情報です。フロントエンドで使用しないでください。

---

## 🔧 ステップ2: 環境変数の設定

### 2.1 検証環境（Render: fleapay-lite-web-preview）

Render Dashboardで以下の環境変数を設定：

1. Render Dashboardにログイン
2. `fleapay-lite-web-preview` サービスを選択
3. **Environment** タブを開く
4. 以下の環境変数を追加/更新：

```env
# データベース接続（検証環境用Supabaseプロジェクト）
DATABASE_URL=postgresql://postgres:[STAGING-PASSWORD]@db.[STAGING-PROJECT-REF].supabase.co:5432/postgres

# Supabase API（将来の認証移行用）
NEXT_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]

# 環境識別（既に設定されている場合は確認のみ）
NODE_ENV=preview
```

### 2.2 本番環境（Render: fleapay-lite-web）

同様に本番環境用の環境変数を設定：

1. `fleapay-lite-web` サービスを選択
2. **Environment** タブを開く
3. 以下の環境変数を追加/更新：

```env
# データベース接続（本番環境用Supabaseプロジェクト）
DATABASE_URL=postgresql://postgres:[PROD-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres

# Supabase API（将来の認証移行用）
NEXT_PUBLIC_SUPABASE_URL=https://[PROD-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-role-key]

# 環境識別（既に設定されている場合は確認のみ）
NODE_ENV=production
```

### 2.3 ローカル開発環境（.env）

プロジェクトルートに `.env` ファイルを作成（または既存のものを更新）：

```env
# 検証環境（staging）の接続情報を使用（開発用）
DATABASE_URL=postgresql://postgres:[STAGING-PASSWORD]@db.[STAGING-PROJECT-REF].supabase.co:5432/postgres

NEXT_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]

# 既存の環境変数（そのまま維持）
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
# ... その他の環境変数
```

**注意**: `.env` ファイルはGitにコミットしないでください（`.gitignore` に含まれていることを確認）。

---

## 📦 ステップ3: スキーマの移行

### 3.1 Render DBからスキーマをダンプ

```powershell
# PowerShell
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl "postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" `
  -OutputDir "./dump"
```

または手動で：

```bash
# スキーマのみダンプ
pg_dump "postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" `
  --schema-only --no-owner --no-privileges -f schema.sql
```

### 3.2 schema.sqlの前処理

`schema.sql` を開き、以下の行を削除またはコメントアウト：

1. **CREATE EXTENSION 行**:
   ```sql
   -- 削除またはコメントアウト
   -- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```

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

### 3.3 Supabase SQL Editorで実行

1. Supabase Dashboardでプロジェクトを選択（検証環境から開始）
2. **SQL Editor** を開く
3. **New query** をクリック
4. `schema.sql` の内容をコピー＆ペースト
5. **Run** をクリックして実行

**エラーが出た場合**:
- エラーメッセージを確認
- 該当行を修正または削除
- 再度実行

**推奨**: 一度に全部実行せず、テーブル定義ごとに分割して実行：
1. まず `frames` テーブル
2. 次に `sellers` テーブル
3. その後、外部キー参照があるテーブル（`orders`など）

### 3.4 本番環境にもスキーマを適用

検証環境で問題がないことを確認後、本番環境のSupabaseプロジェクトにも同様にスキーマを適用してください。

---

## 📊 ステップ4: データの移行

### 4.1 検証環境のデータ移行

検証環境のSupabaseプロジェクトにデータを移行します。

#### データのダンプ（Render DBから）

```powershell
# PowerShell（ステップ3.1で既に実行済みの場合はスキップ）
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl "postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" `
  -OutputDir "./dump"
```

#### データのインポート（Supabaseへ）

```powershell
# PowerShell
.\scripts\import-to-supabase.ps1 `
  -SupabaseDatabaseUrl "postgresql://postgres:[STAGING-PASSWORD]@db.[STAGING-PROJECT-REF].supabase.co:5432/postgres" `
  -DataDir "./dump"
```

### 4.2 データ整合性のチェック

```powershell
# PowerShell
.\scripts\verify-migration.ps1 `
  -SourceUrl "postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" `
  -TargetUrl "postgresql://postgres:[STAGING-PASSWORD]@db.[STAGING-PROJECT-REF].supabase.co:5432/postgres"
```

または、Supabase SQL Editorで直接確認：

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
SELECT 'order_items', COUNT(*) FROM order_items;
```

この結果を、元のRender DBでも同じクエリを実行して比較してください。

### 4.3 本番環境のデータ移行

検証環境で問題がないことを確認後、本番環境にも同様にデータを移行してください。

**重要**: 本番環境のデータ移行前に、必ずバックアップを取得してください。

---

## 🔧 ステップ5: Prisma設定の更新

### 5.1 ローカル環境で実行

```powershell
# プロジェクトルートで実行
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# 依存関係のインストール（既に実行済みの場合はスキップ）
npm install

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

## 🚀 ステップ6: Renderへのデプロイ

### 6.1 変更をコミット・プッシュ

```powershell
git add .
git commit -m "chore: migrate DB to Supabase"
git push
```

### 6.2 検証環境で確認

1. Renderが自動デプロイを開始します
2. デプロイ完了後、検証環境の動作確認：
   - すべてのAPIエンドポイントが正常に動作することを確認
   - データが正しく取得できることを確認
   - エラーログを確認

### 6.3 本番環境へのデプロイ

検証環境で問題がないことを確認後、本番環境にもデプロイしてください。

---

## 📝 接続情報の記録テンプレート

各環境の接続情報を安全に記録してください：

### 検証環境（staging）

```
プロジェクト名: fleapay-lite-staging
プロジェクトREF: [STAGING-PROJECT-REF]
Database Password: [STAGING-PASSWORD]

DATABASE_URL=postgresql://postgres:[STAGING-PASSWORD]@db.[STAGING-PROJECT-REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]
```

### 本番環境（prod）

```
プロジェクト名: fleapay-lite-prod
プロジェクトREF: [PROD-PROJECT-REF]
Database Password: [PROD-PASSWORD]

DATABASE_URL=postgresql://postgres:[PROD-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[PROD-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-role-key]
```

**重要**: これらの情報は安全に管理してください（パスワードマネージャー推奨）。Gitにコミットしないでください。

---

## ✅ 最終チェックリスト

### 検証環境（staging）

- [ ] Supabaseプロジェクト `fleapay-lite-staging` が作成済み
- [ ] 接続情報（DATABASE_URL, API URL, Keys）を取得
- [ ] Render環境変数を設定（`fleapay-lite-web-preview`）
- [ ] スキーマをSupabaseに移行
- [ ] データをSupabaseに移行
- [ ] データ整合性をチェック
- [ ] Prismaスキーマを生成（`npx prisma db pull`）
- [ ] ローカルで動作確認
- [ ] Renderにデプロイ
- [ ] 検証環境で動作確認

### 本番環境（prod）

- [ ] Supabaseプロジェクト `fleapay-lite-prod` が作成済み
- [ ] 接続情報（DATABASE_URL, API URL, Keys）を取得
- [ ] Render環境変数を設定（`fleapay-lite-web`）
- [ ] 本番データのバックアップを取得
- [ ] スキーマをSupabaseに移行
- [ ] データをSupabaseに移行
- [ ] データ整合性をチェック
- [ ] Renderにデプロイ
- [ ] 本番環境で動作確認
- [ ] パフォーマンス監視（30分-1時間）

---

## 🐛 トラブルシューティング

### 問題1: 接続エラー

**確認事項**:
- 接続文字列が正しいか
- パスワードが正しいか（URLエンコードが必要な場合がある）
- Supabaseプロジェクトがアクティブか
- ネットワーク接続が確立されているか

### 問題2: スキーマ実行エラー

**対処方法**:
- `CREATE EXTENSION` 行を削除
- `OWNER` 関連の行を削除
- `GRANT` / `REVOKE` 行を削除
- エラーが出たテーブル定義を確認して修正

### 問題3: データインポートエラー

**対処方法**:
- データのインポート順序を確認（親→子の順）
- 親テーブルのデータが存在することを確認
- 外部キー制約エラーの場合は、親テーブルから順にインポート

### 問題4: Prisma接続エラー

**対処方法**:
- `.env` ファイルの `DATABASE_URL` が正しいか確認
- `npx prisma db pull` を再実行
- Supabaseプロジェクトがアクティブか確認

---

## 📚 関連ドキュメント

- [scripts/migrate-to-supabase.md](./scripts/migrate-to-supabase.md) - 詳細な移行手順
- [SUPABASE_ENVIRONMENT_SETUP.md](./SUPABASE_ENVIRONMENT_SETUP.md) - 環境設定の詳細
- [MIGRATION_EXECUTION_PLAN.md](./MIGRATION_EXECUTION_PLAN.md) - 全体の移行計画
- [scripts/README.md](./scripts/README.md) - 移行スクリプトの使い方

---

## 🎯 クイックリファレンス

### 重要なコマンド

```powershell
# スキーマ・データのダンプ
.\scripts\dump-render-db.ps1 -RenderDatabaseUrl "..." -OutputDir "./dump"

# データのインポート
.\scripts\import-to-supabase.ps1 -SupabaseDatabaseUrl "..." -DataDir "./dump"

# データ整合性チェック
.\scripts\verify-migration.ps1 -SourceUrl "..." -TargetUrl "..."

# Prisma設定
npx prisma db pull
npx prisma generate
```

### 重要なURL

- Supabase Dashboard: https://app.supabase.com
- Render Dashboard: https://dashboard.render.com
- SQL Editor: Supabase Dashboard > SQL Editor

---

**次のステップ**: 接続情報を取得して、環境変数を設定してください。

