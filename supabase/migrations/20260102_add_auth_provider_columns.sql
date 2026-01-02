-- Phase 1.5: Supabase Auth移行（新規ユーザーのみ）
-- データベーススキーマ変更: auth_provider, supabase_user_idカラム追加

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

