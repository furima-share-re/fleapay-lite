# GitHub Actions失敗の解決手順

**作成日**: 2026-01-14  
**問題**: `apply-migrations`ワークフローが失敗（exit code 1）

---

## 🔍 現在の状況

GitHub Actionsのワークフローが実行されましたが、**失敗**しています：
- ❌ ステータス: **Failure**
- ❌ エラー: "Process completed with exit code 1"
- ⏱️ 実行時間: 22秒

---

## 📋 失敗原因の特定手順

### ステップ1: ワークフローのログを確認

1. GitHubリポジトリ → **Actions** タブ
2. 失敗したワークフロー実行をクリック（最新の実行）
3. 左サイドバーで各ジョブを確認：
   - `validate-migrations` - マイグレーション検証
   - `apply-to-staging` - 検証環境への適用
   - `apply-to-production` - 本番環境への適用
4. **失敗しているジョブ**をクリック
5. **失敗しているステップ**をクリック
6. エラーメッセージを確認

---

## 🔧 よくある失敗原因と解決方法

### 1. `validate-migrations`ジョブが失敗

**エラーメッセージ例**:
- `python: command not found`
- `scripts/check_migration_safety.py: No such file or directory`
- `Migration naming validation failed`

**解決方法**:

#### Pythonがインストールされていない場合
ワークフローファイルにPythonのセットアップを追加する必要があります。

#### マイグレーションファイルの命名規則違反
```powershell
# ローカルで確認
python scripts/check_migration_safety.py
```

**正しい命名規則**: `YYYYMMDD_HHMMSS_description.sql`
- ✅ `20250116_120000_create_fee_rate_master.sql`
- ❌ `create_fee_rate_master.sql`（日時がない）

---

### 2. `apply-to-staging`ジョブが失敗

**エラーメッセージ例**:
- `Secret SUPABASE_ACCESS_TOKEN not found`
- `Secret SUPABASE_PROJECT_ID_STAGING not found`
- `Project not found`
- `Permission denied`

**解決方法**:

#### GitHub Secretsが設定されていない場合

1. GitHubリポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. 以下のSecretsを追加：
   - `SUPABASE_ACCESS_TOKEN` - Supabase APIアクセストークン
   - `SUPABASE_PROJECT_ID_STAGING` - 検証環境のProject ID（例: `mluvjdhqgfpcfsmvjae`）
   - `SUPABASE_PROJECT_ID_PRODUCTION` - 本番環境のProject ID

#### Access Tokenの取得方法

1. Supabase Dashboardにログイン: https://supabase.com/dashboard
2. **Account Settings** → **Access Tokens** を開く
3. **Generate new token** をクリック
4. トークン名を入力（例: `github-actions`）
5. トークンをコピー（**一度しか表示されません**）

#### Project IDの確認方法

1. Supabase Dashboardでプロジェクトを選択
2. **Settings** → **General** を開く
3. **Reference ID** をコピー

---

### 3. `apply-to-production`ジョブが失敗

**エラーメッセージ例**:
- `Secret SUPABASE_PROJECT_ID_PRODUCTION not found`
- `Project not found`
- `Permission denied`

**解決方法**:
- 上記の「`apply-to-staging`ジョブが失敗」と同じ手順
- `SUPABASE_PROJECT_ID_PRODUCTION` が正しく設定されているか確認

---

### 4. Python環境の問題

**エラーメッセージ例**:
- `python: command not found`
- `Python 3.x is required`

**解決方法**:

ワークフローファイル（`.github/workflows/apply-migrations.yml`）の `validate-migrations` ジョブにPythonのセットアップを追加：

```yaml
validate-migrations:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.11'

    - name: Validate migrations
      run: |
        echo "🔍 Validating migration files..."
        python scripts/check_migration_safety.py
```

---

## 🚀 即座に解決する方法

### 方法1: ワークフローファイルを修正

もしPython環境の問題であれば、ワークフローファイルを修正してください。

### 方法2: Supabase CLIで直接適用（推奨）

GitHub Actionsの問題を回避して、直接マイグレーションを適用：

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
- GitHub Actionsの設定に依存しない
- 即座に適用できる
- エラーメッセージが明確

---

## 📋 チェックリスト

失敗を解決するために、以下を確認してください：

- [ ] ワークフローのログを確認して、どのジョブが失敗したか特定
- [ ] `validate-migrations`ジョブが失敗している場合：
  - [ ] Pythonがワークフローでセットアップされているか確認
  - [ ] マイグレーションファイルの命名規則を確認
  - [ ] ローカルで `python scripts/check_migration_safety.py` を実行
- [ ] `apply-to-staging`ジョブが失敗している場合：
  - [ ] `SUPABASE_ACCESS_TOKEN` がGitHub Secretsに設定されているか確認
  - [ ] `SUPABASE_PROJECT_ID_STAGING` がGitHub Secretsに設定されているか確認
- [ ] `apply-to-production`ジョブが失敗している場合：
  - [ ] `SUPABASE_PROJECT_ID_PRODUCTION` がGitHub Secretsに設定されているか確認
  - [ ] 本番環境への適用が承認待ちになっていないか確認

---

## 🔧 ワークフローファイルの修正が必要な場合

もしPython環境の問題であれば、以下の修正を適用してください：

```yaml
validate-migrations:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.11'

    - name: Validate migrations
      run: |
        echo "🔍 Validating migration files..."
        python scripts/check_migration_safety.py
```

---

## 📝 次のステップ

1. ✅ **まず、ワークフローのログを確認**して、具体的なエラーメッセージを特定
2. ✅ エラーメッセージに基づいて、上記の解決方法を適用
3. ✅ または、**Supabase CLIで直接適用**（最も確実で速い）

---

## 🔗 関連ファイル

- `.github/workflows/apply-migrations.yml`
- `scripts/check_migration_safety.py`
- `本番環境マイグレーション即時適用手順.md`
- `自動適用されない原因の確認手順.md`
