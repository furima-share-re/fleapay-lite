# GitHub Secrets設定手順（CI/CD専用）

**作成日**: 2026-01-14  
**対象**: GitHub Actionsでの自動マイグレーション適用  
**重要**: 認証情報はgitにコミットしません。GitHub Secretsを使用します。

---

## 🔍 現在の状況

- ✅ `validate-migrations`ジョブ: 成功
- ❌ `apply-to-staging`ジョブ: 失敗（GitHub Secrets未設定）
- ⏭️ `apply-to-production`ジョブ: スキップ

**原因**: GitHub Secretsが設定されていないため、環境変数が空になっています。

---

## ✅ 解決方法：GitHub Secretsを設定

### ステップ1: Supabase Access Tokenを取得

1. **Supabase Dashboardにログイン**
   - URL: https://supabase.com/dashboard
   - アカウントにログイン

2. **Access Tokenを生成**
   - 右上のアカウントアイコンをクリック
   - **Account Settings** を選択
   - 左メニューから **Access Tokens** を開く
   - **Generate new token** をクリック
   - トークン名を入力（例: `github-actions-migration`）
   - **Generate token** をクリック
   - ⚠️ **トークンをコピー**（一度しか表示されません）

### ステップ2: Project IDを確認

#### 検証環境（Staging）のProject ID

1. Supabase Dashboardで検証環境のプロジェクトを選択
2. **Settings** → **General** を開く
3. **Reference ID** をコピー（例: `mluvjdhqgfpcfsmvjae`）

#### 本番環境（Production）のProject ID

1. Supabase Dashboardで本番環境のプロジェクトを選択
2. **Settings** → **General** を開く
3. **Reference ID** をコピー

### ステップ3: GitHub Secretsに追加

1. **GitHubリポジトリにアクセス**
   - リポジトリのページを開く

2. **Settingsを開く**
   - リポジトリの上部メニューから **Settings** をクリック

3. **Secrets and variables → Actionsを開く**
   - 左サイドバーから **Secrets and variables** → **Actions** を選択

4. **New repository secretをクリック**

5. **Secret 1: `SUPABASE_ACCESS_TOKEN` を追加**
   - **Name**: `SUPABASE_ACCESS_TOKEN`
   - **Value**: ステップ1でコピーしたAccess Tokenを貼り付け
   - **Add secret** をクリック

6. **Secret 2: `SUPABASE_PROJECT_ID_STAGING` を追加**
   - **New repository secret** を再度クリック
   - **Name**: `SUPABASE_PROJECT_ID_STAGING`
   - **Value**: 検証環境のProject IDを貼り付け（例: `mluvjdhqgfpcfsmvjae`）
   - **Add secret** をクリック

7. **Secret 3: `SUPABASE_PROJECT_ID_PRODUCTION` を追加**
   - **New repository secret** を再度クリック
   - **Name**: `SUPABASE_PROJECT_ID_PRODUCTION`
   - **Value**: 本番環境のProject IDを貼り付け
   - **Add secret** をクリック

---

## 🔒 セキュリティについて

**GitHub Secretsは安全です**：
- ✅ gitリポジトリには**コミットされません**
- ✅ GitHubの暗号化されたストレージに保存されます
- ✅ ワークフロー実行時のみ使用可能
- ✅ リポジトリの設定画面でのみ管理可能
- ✅ 値は確認できません（存在することのみ確認可能）

**認証情報は絶対にgitにコミットしません**。

---

## ✅ 設定後の確認

### ステップ1: Secretsが正しく設定されているか確認

1. GitHubリポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. 以下の3つのSecretsが存在することを確認：
   - ✅ `SUPABASE_ACCESS_TOKEN`
   - ✅ `SUPABASE_PROJECT_ID_STAGING`
   - ✅ `SUPABASE_PROJECT_ID_PRODUCTION`

**注意**: Secretsの値は確認できませんが、存在することは確認できます。

### ステップ2: ワークフローを再実行

1. GitHubリポジトリ → **Actions** タブ
2. **Apply Migrations** ワークフローを選択
3. **Run workflow** をクリック
4. ブランチを選択（`main`）
5. **Run workflow** をクリック

### ステップ3: 実行結果を確認

期待される結果：
- ✅ `validate-migrations`: 成功
- ✅ `apply-to-staging`: 成功（Secretsが設定されていれば）
- ✅ `apply-to-production`: 承認待ちまたは成功

---

## 🔧 トラブルシューティング

### 問題1: "Secret not found" エラーが続く

**原因**: Secretsの名前が間違っている

**解決方法**:
- Secretsの名前が正確に以下と一致しているか確認：
  - `SUPABASE_ACCESS_TOKEN`（大文字小文字を正確に）
  - `SUPABASE_PROJECT_ID_STAGING`（大文字小文字を正確に）
  - `SUPABASE_PROJECT_ID_PRODUCTION`（大文字小文字を正確に）

### 問題2: "Project not found" エラー

**原因**: Project IDが間違っている

**解決方法**:
1. Supabase DashboardでProject IDを再確認
2. **Settings** → **General** → **Reference ID** をコピー
3. GitHub Secretsの値を更新（既存のSecretを削除して再作成）

### 問題3: "Permission denied" エラー

**原因**: Access Tokenの権限が不足している

**解決方法**:
1. Supabase Dashboardで新しいAccess Tokenを生成
2. 可能であれば **Full access** を選択
3. GitHub Secretsの値を更新（既存のSecretを削除して再作成）

---

## 📋 チェックリスト

GitHub Secretsを設定するために：

- [ ] Supabase Dashboardにログイン
- [ ] Access Tokenを生成してコピー
- [ ] 検証環境のProject IDを確認してコピー
- [ ] 本番環境のProject IDを確認してコピー
- [ ] GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** を開く
- [ ] `SUPABASE_ACCESS_TOKEN` を追加
- [ ] `SUPABASE_PROJECT_ID_STAGING` を追加
- [ ] `SUPABASE_PROJECT_ID_PRODUCTION` を追加
- [ ] 3つのSecretsが存在することを確認
- [ ] ワークフローを再実行して確認

---

## 🔗 関連ファイル

- `.github/workflows/apply-migrations.yml` - ワークフローファイル
- `apply-to-staging失敗の解決方法.md` - 詳細なトラブルシューティング
- `セキュリティガイド_認証情報の管理.md` - セキュリティガイド

---

## 📝 まとめ

**今回のマイグレーション適用**:
1. ✅ GitHub Secretsを設定（3つのSecrets）
2. ✅ ワークフローを再実行
3. ✅ マイグレーションが自動適用される

**重要な原則**:
- ✅ 認証情報は絶対にgitにコミットしない
- ✅ GitHub Secretsを使用（CI/CDの場合）
- ✅ GitHub Secretsは安全で、gitリポジトリにはコミットされない
