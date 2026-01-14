# apply-to-staging 失敗の解決方法

**作成日**: 2026-01-14  
**問題**: `apply-to-staging`ジョブが失敗（exit code 1）

---

## 🔍 現在の状況

- ✅ `validate-migrations`ジョブ: **成功**（17 秒）
- ❌ `apply-to-staging`ジョブ: **失敗**（16 秒、exit code 1）
- ⏭️ `apply-to-production`ジョブ: **スキップ**（`apply-to-staging`が失敗したため）

---

## 📋 失敗原因の特定

### ステップ 1: エラーログを確認

1. GitHub リポジトリ → **Actions** タブ
2. 失敗したワークフロー実行をクリック
3. 左サイドバーで **`apply-to-staging`** をクリック
4. 失敗しているステップをクリック
5. エラーメッセージを確認

**よくあるエラーメッセージ**:

- `Secret SUPABASE_ACCESS_TOKEN not found`
- `Secret SUPABASE_PROJECT_ID_STAGING not found`
- `Error: Project not found`
- `Error: Permission denied`
- `Error: Invalid access token`
- `ERROR: duplicate key value violates unique constraint "schema_migrations_pkey"` ⚠️ **新規追加**

---

## 🔧 解決方法

### 方法 1: GitHub Secrets を設定（最も重要）

#### 必要な Secrets

以下の 4 つの Secrets を GitHub リポジトリに設定する必要があります：

1. **`SUPABASE_ACCESS_TOKEN`** - Supabase API アクセストークン
2. **`SUPABASE_PROJECT_ID_STAGING`** - 検証環境の Project ID
3. **`SUPABASE_PROJECT_ID_PRODUCTION`** - 本番環境の Project ID
4. **`DATABASE_URL_STAGING`** - 検証環境のデータベース接続文字列（Prisma スキーマ更新用）

#### 設定手順

1. **GitHub リポジトリ**にアクセス
2. **Settings** → **Secrets and variables** → **Actions** を開く
3. **New repository secret** をクリック
4. 各 Secret を追加：

##### Secret 1: `SUPABASE_ACCESS_TOKEN`

**取得方法**:

1. Supabase Dashboard にログイン: https://supabase.com/dashboard
2. 右上のアカウントアイコンをクリック
3. **Account Settings** を選択
4. 左メニューから **Access Tokens** を開く
5. **Generate new token** をクリック
6. トークン名を入力（例: `github-actions-migration`）
7. **Generate token** をクリック
8. トークンをコピー（**一度しか表示されません**）

**GitHub Secrets に追加**:

- **Name**: `SUPABASE_ACCESS_TOKEN`
- **Value**: コピーしたトークンを貼り付け
- **Add secret** をクリック

##### Secret 2: `SUPABASE_PROJECT_ID_STAGING`

**取得方法**:

1. Supabase Dashboard で検証環境のプロジェクトを選択
2. **Settings** → **General** を開く
3. **Reference ID** をコピー（例: `mluvjdhqgfpcfsmvjae`）

**GitHub Secrets に追加**:

- **Name**: `SUPABASE_PROJECT_ID_STAGING`
- **Value**: コピーした Project ID を貼り付け
- **Add secret** をクリック

##### Secret 3: `SUPABASE_PROJECT_ID_PRODUCTION`

**取得方法**:

1. Supabase Dashboard で本番環境のプロジェクトを選択
2. **Settings** → **General** を開く
3. **Reference ID** をコピー

**GitHub Secrets に追加**:

- **Name**: `SUPABASE_PROJECT_ID_PRODUCTION`
- **Value**: コピーした Project ID を貼り付け
- **Add secret** をクリック

##### Secret 4: `DATABASE_URL_STAGING`

**取得方法**:

1. Supabase Dashboard で検証環境のプロジェクトを選択
2. **Settings** → **Database** を開く
3. **Connection string** セクションを開く
4. **URI** または **Connection pooling** の接続文字列をコピー
   - 形式: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
   - または: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres` (Connection pooling)

**GitHub Secrets に追加**:

- **Name**: `DATABASE_URL_STAGING`
- **Value**: コピーした接続文字列を貼り付け（パスワード部分は既に含まれています）
- **Add secret** をクリック

**注意**: この接続文字列は Prisma スキーマの更新（`prisma db pull`）に使用されます。

---

### 方法 2: Secrets が設定されているか確認

1. GitHub リポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. 以下の 4 つの Secrets が存在するか確認：
   - ✅ `SUPABASE_ACCESS_TOKEN`
   - ✅ `SUPABASE_PROJECT_ID_STAGING`
   - ✅ `SUPABASE_PROJECT_ID_PRODUCTION`
   - ✅ `DATABASE_URL_STAGING`

**注意**: Secrets の値は確認できませんが、存在することは確認できます。

---

### 方法 3: Secrets の値を再設定

もし Secrets が既に設定されている場合、値が間違っている可能性があります：

1. 既存の Secret を削除
2. 上記の手順で正しい値を再設定

---

## 🚀 設定後の確認

### ステップ 1: ワークフローを再実行

1. GitHub リポジトリ → **Actions** タブ
2. **Apply Migrations** ワークフローを選択
3. **Run workflow** をクリック
4. ブランチを選択（`main`）
5. **Run workflow** をクリック

### ステップ 2: 実行結果を確認

- ✅ `validate-migrations`: 成功
- ✅ `apply-to-staging`: 成功
- ✅ `apply-to-production`: 承認待ちまたは成功

---

## 🔧 トラブルシューティング

### エラー: "Secret SUPABASE_ACCESS_TOKEN not found"

**原因**: GitHub Secrets に`SUPABASE_ACCESS_TOKEN`が設定されていない

**解決方法**:

1. 上記の「Secret 1: `SUPABASE_ACCESS_TOKEN`」の手順に従って設定

### エラー: "Secret SUPABASE_PROJECT_ID_STAGING not found"

**原因**: GitHub Secrets に`SUPABASE_PROJECT_ID_STAGING`が設定されていない

**解決方法**:

1. 上記の「Secret 2: `SUPABASE_PROJECT_ID_STAGING`」の手順に従って設定

### エラー: "Environment variable not found: DATABASE_URL" または "DATABASE_URL_STAGING secret is not set"

**原因**: GitHub Secrets に`DATABASE_URL_STAGING`が設定されていない。Prisma スキーマの更新（`prisma db pull`）にはデータベース接続文字列が必要です。

**解決方法**:

1. 上記の「Secret 4: `DATABASE_URL_STAGING`」の手順に従って設定
2. Supabase Dashboard → Project Settings → Database → Connection string から接続文字列を取得

### エラー: "Project not found"

**原因**: Project ID が間違っている

**解決方法**:

1. Supabase Dashboard で Project ID を再確認
2. GitHub Secrets の値を更新

### エラー: "Permission denied" または "Invalid access token"

**原因**: Access Token の権限が不足している、または無効

**解決方法**:

1. Supabase Dashboard で新しい Access Token を生成
2. **Full access** を選択（可能な場合）
3. GitHub Secrets の値を更新

### エラー: "duplicate key value violates unique constraint 'schema_migrations_pkey'" ⚠️

**原因**: マイグレーション履歴がデータベースと同期していない。特定のマイグレーション（例: `20250115`）が既に適用されているが、Supabase CLI が再度適用しようとしている。

**エラーメッセージの例**:

```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(20250115) already exists.
```

**解決方法**:

#### 方法 A: 自動修復（推奨）✨

ワークフローが自動的に修復を試みます。最新のワークフローを再実行してください：

1. GitHub リポジトリ → **Actions** タブ
2. **Apply Migrations** ワークフローを選択
3. **Run workflow** をクリック
4. ブランチを選択（`main`）
5. **Run workflow** をクリック

ワークフローが自動的に以下を実行します：

- マイグレーション状態を確認
- 重複しているマイグレーションを修復
- 再度マイグレーションを適用

#### 方法 B: 手動で Supabase CLI から修復

GitHub Actions を待たずに、手動で修復できます：

```powershell
# 環境変数を設定
$env:SUPABASE_ACCESS_TOKEN = "your-access-token"
$env:SUPABASE_PROJECT_ID = "your-staging-project-id"

# プロジェクトにリンク
npx supabase link --project-ref $env:SUPABASE_PROJECT_ID

# マイグレーション状態を確認
npx supabase migration list

# 重複しているマイグレーションを修復（例: 20250115）
npx supabase migration repair --status applied --version 20250115

# マイグレーションを再適用
npx supabase db push
```

**注意**: `--version` には、エラーメッセージに表示されているバージョン番号（例: `20250115`）を指定してください。

#### 方法 C: データベースから直接確認・修復

Supabase SQL Editor を使用して直接確認・修復することも可能です：

```sql
-- 適用済みマイグレーションを確認
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC;

-- 特定のマイグレーションが既に存在するか確認
SELECT * FROM supabase_migrations.schema_migrations
WHERE version = '20250115';
```

もし既に存在する場合は、Supabase CLI の `migration repair` コマンドを使用してください。

---

## 📝 今すぐ解決したい場合

GitHub Actions の設定を待たずに、**Supabase CLI で直接適用**できます：

```powershell
# 環境変数を設定
$env:SUPABASE_ACCESS_TOKEN = "your-access-token"
$env:SUPABASE_PROJECT_ID = "your-production-project-id"

# プロジェクトにリンク
npx supabase link --project-ref $env:SUPABASE_PROJECT_ID

# マイグレーションを適用
npx supabase db push
```

**メリット**:

- GitHub Secrets の設定を待つ必要がない
- 即座に適用できる
- エラーメッセージが明確

---

## 📋 チェックリスト

`apply-to-staging`の失敗を解決するために：

- [ ] GitHub リポジトリの **Settings** → **Secrets and variables** → **Actions** を開く
- [ ] `SUPABASE_ACCESS_TOKEN` が存在するか確認（なければ追加）
- [ ] `SUPABASE_PROJECT_ID_STAGING` が存在するか確認（なければ追加）
- [ ] `SUPABASE_PROJECT_ID_PRODUCTION` が存在するか確認（なければ追加）
- [ ] `DATABASE_URL_STAGING` が存在するか確認（なければ追加）⚠️ **新規追加**
- [ ] ワークフローのログで具体的なエラーメッセージを確認
- [ ] エラーメッセージに基づいて対応
- [ ] ワークフローを再実行して確認

---

## 🔗 関連ファイル

- `.github/workflows/apply-migrations.yml`
- `本番環境マイグレーション即時適用手順.md`
- `GitHub Actions失敗の解決手順.md`
