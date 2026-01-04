# 本番環境マイグレーションガイド

## 問題

Renderの本番環境で以下のエラーが発生しています：

```
prisma:error 
Invalid `prisma.seller.findUnique()` invocation:
The column `sellers.auth_provider` does not exist in the current database.
```

これは、Prismaスキーマに`auth_provider`カラムが定義されているが、本番環境のデータベースにはこのカラムが存在しないことが原因です。

## 解決方法

本番環境のデータベースでマイグレーションを実行する必要があります。

### 方法1: Supabase Dashboardから実行（推奨）

1. Supabase Dashboardにログイン
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」を選択
4. 以下のSQLを実行：

```sql
-- sellersテーブルに認証プロバイダー関連カラムを追加
ALTER TABLE sellers 
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'bcryptjs',
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

-- インデックス追加（supabase_user_idで検索するため）
CREATE INDEX IF NOT EXISTS sellers_supabase_user_id_idx 
  ON sellers(supabase_user_id);

-- 既存ユーザーはすべてbcryptjsとして設定（既にDEFAULTで設定されるが明示的に設定）
UPDATE sellers 
SET auth_provider = 'bcryptjs' 
WHERE auth_provider IS NULL;

-- コメント追加（ドキュメント用）
COMMENT ON COLUMN sellers.auth_provider IS '認証プロバイダー: bcryptjs (既存) または supabase (新規)';
COMMENT ON COLUMN sellers.supabase_user_id IS 'Supabase AuthのユーザーID (UUID)';
```

### 方法2: コマンドラインから実行

Supabase CLIがインストールされている場合：

```bash
# Supabaseにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref <your-project-ref>

# マイグレーションを実行
supabase db push
```

または、直接psqlで実行：

```bash
psql $DATABASE_URL -f supabase/migrations/20260102_add_auth_provider_columns.sql
```

## マイグレーション後の確認

マイグレーションが正常に実行されたか確認するには、以下のSQLを実行してください：

```sql
-- auth_providerカラムの存在確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sellers' 
  AND column_name IN ('auth_provider', 'supabase_user_id');

-- インデックスの存在確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'sellers' 
  AND indexname = 'sellers_supabase_user_id_idx';
```

## 一時的な回避策

マイグレーションを実行できない場合、以下のコード変更により一時的にエラーを回避できます：

1. `app/api/debug/db-status/route.ts` - 既に修正済み（`select`を指定）
2. `lib/auth-prisma.ts` - 既に修正済み（エラーハンドリング追加）
3. `app/api/seller/start_onboarding/route.ts` - 既に修正済み（エラーハンドリング追加）

ただし、これらの回避策は一時的なものであり、根本的な解決にはマイグレーションの実行が必要です。

## 注意事項

- マイグレーションは本番環境のデータベースに直接影響を与えるため、実行前にバックアップを取得することを推奨します
- `ADD COLUMN IF NOT EXISTS`を使用しているため、既にカラムが存在する場合はエラーになりません
- 既存のデータには`DEFAULT 'bcryptjs'`が適用されます

