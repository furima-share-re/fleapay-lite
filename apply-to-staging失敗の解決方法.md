# apply-to-staging失敗の解決方法

**作成日**: 2026-01-14  
**問題**: `apply-to-staging`ジョブが失敗（exit code 1）

---

## 🔍 現在の状況

- ✅ `validate-migrations`ジョブ: **成功**（17秒）
- ❌ `apply-to-staging`ジョブ: **失敗**（16秒、exit code 1）
- ⏭️ `apply-to-production`ジョブ: **スキップ**（`apply-to-staging`が失敗したため）

---

## 📋 失敗原因の特定

### ステップ1: エラーログを確認

1. GitHubリポジトリ → **Actions** タブ
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

---

## 🔧 解決方法

### 方法1: GitHub Secretsを設定（最も重要）

#### 必要なSecrets

以下の3つのSecretsをGitHubリポジトリに設定する必要があります：

1. **`SUPABASE_ACCESS_TOKEN`** - Supabase APIアクセストークン
2. **`SUPABASE_PROJECT_ID_STAGING`** - 検証環境のProject ID
3. **`SUPABASE_PROJECT_ID_PRODUCTION`** - 本番環境のProject ID

#### 設定手順

1. **GitHubリポジトリ**にアクセス
2. **Settings** → **Secrets and variables** → **Actions** を開く
3. **New repository secret** をクリック
4. 各Secretを追加：

##### Secret 1: `SUPABASE_ACCESS_TOKEN`

**取得方法**:
1. Supabase Dashboardにログイン: https://supabase.com/dashboard
2. 右上のアカウントアイコンをクリック
3. **Account Settings** を選択
4. 左メニューから **Access Tokens** を開く
5. **Generate new token** をクリック
6. トークン名を入力（例: `github-actions-migration`）
7. **Generate token** をクリック
8. トークンをコピー（**一度しか表示されません**）

**GitHub Secretsに追加**:
- **Name**: `SUPABASE_ACCESS_TOKEN`
- **Value**: コピーしたトークンを貼り付け
- **Add secret** をクリック

##### Secret 2: `SUPABASE_PROJECT_ID_STAGING`

**取得方法**:
1. Supabase Dashboardで検証環境のプロジェクトを選択
2. **Settings** → **General** を開く
3. **Reference ID** をコピー（例: `mluvjdhqgfpcfsmvjae`）

**GitHub Secretsに追加**:
- **Name**: `SUPABASE_PROJECT_ID_STAGING`
- **Value**: コピーしたProject IDを貼り付け
- **Add secret** をクリック

##### Secret 3: `SUPABASE_PROJECT_ID_PRODUCTION`

**取得方法**:
1. Supabase Dashboardで本番環境のプロジェクトを選択
2. **Settings** → **General** を開く
3. **Reference ID** をコピー

**GitHub Secretsに追加**:
- **Name**: `SUPABASE_PROJECT_ID_PRODUCTION`
- **Value**: コピーしたProject IDを貼り付け
- **Add secret** をクリック

---

### 方法2: Secretsが設定されているか確認

1. GitHubリポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. 以下の3つのSecretsが存在するか確認：
   - ✅ `SUPABASE_ACCESS_TOKEN`
   - ✅ `SUPABASE_PROJECT_ID_STAGING`
   - ✅ `SUPABASE_PROJECT_ID_PRODUCTION`

**注意**: Secretsの値は確認できませんが、存在することは確認できます。

---

### 方法3: Secretsの値を再設定

もしSecretsが既に設定されている場合、値が間違っている可能性があります：

1. 既存のSecretを削除
2. 上記の手順で正しい値を再設定

---

## 🚀 設定後の確認

### ステップ1: ワークフローを再実行

1. GitHubリポジトリ → **Actions** タブ
2. **Apply Migrations** ワークフローを選択
3. **Run workflow** をクリック
4. ブランチを選択（`main`）
5. **Run workflow** をクリック

### ステップ2: 実行結果を確認

- ✅ `validate-migrations`: 成功
- ✅ `apply-to-staging`: 成功
- ✅ `apply-to-production`: 承認待ちまたは成功

---

## 🔧 トラブルシューティング

### エラー: "Secret SUPABASE_ACCESS_TOKEN not found"

**原因**: GitHub Secretsに`SUPABASE_ACCESS_TOKEN`が設定されていない

**解決方法**:
1. 上記の「Secret 1: `SUPABASE_ACCESS_TOKEN`」の手順に従って設定

### エラー: "Secret SUPABASE_PROJECT_ID_STAGING not found"

**原因**: GitHub Secretsに`SUPABASE_PROJECT_ID_STAGING`が設定されていない

**解決方法**:
1. 上記の「Secret 2: `SUPABASE_PROJECT_ID_STAGING`」の手順に従って設定

### エラー: "Project not found"

**原因**: Project IDが間違っている

**解決方法**:
1. Supabase DashboardでProject IDを再確認
2. GitHub Secretsの値を更新

### エラー: "Permission denied" または "Invalid access token"

**原因**: Access Tokenの権限が不足している、または無効

**解決方法**:
1. Supabase Dashboardで新しいAccess Tokenを生成
2. **Full access** を選択（可能な場合）
3. GitHub Secretsの値を更新

---

## 📝 今すぐ解決したい場合

GitHub Actionsの設定を待たずに、**Supabase CLIで直接適用**できます：

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
- GitHub Secretsの設定を待つ必要がない
- 即座に適用できる
- エラーメッセージが明確

---

## 📋 チェックリスト

`apply-to-staging`の失敗を解決するために：

- [ ] GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** を開く
- [ ] `SUPABASE_ACCESS_TOKEN` が存在するか確認（なければ追加）
- [ ] `SUPABASE_PROJECT_ID_STAGING` が存在するか確認（なければ追加）
- [ ] `SUPABASE_PROJECT_ID_PRODUCTION` が存在するか確認（なければ追加）
- [ ] ワークフローのログで具体的なエラーメッセージを確認
- [ ] エラーメッセージに基づいて対応
- [ ] ワークフローを再実行して確認

---

## 🔗 関連ファイル

- `.github/workflows/apply-migrations.yml`
- `本番環境マイグレーション即時適用手順.md`
- `GitHub Actions失敗の解決手順.md`
