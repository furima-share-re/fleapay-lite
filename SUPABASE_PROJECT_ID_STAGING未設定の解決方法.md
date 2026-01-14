# SUPABASE_PROJECT_ID_STAGING未設定の解決方法

**作成日**: 2026-01-14  
**問題**: `SUPABASE_PROJECT_ID` が空（`SUPABASE_PROJECT_ID_STAGING`が未設定）

---

## 🔍 エラーの原因

エラーログから確認できること：
```
env:
  SUPABASE_ACCESS_TOKEN: ***  ← 設定されている（***でマスク）
  SUPABASE_PROJECT_ID:        ← 空になっている
flag needs an argument: --project-ref
```

**原因**: `SUPABASE_PROJECT_ID_STAGING` がGitHub Secretsに設定されていないか、値が空です。

---

## ✅ 解決方法

### ステップ1: GitHub Secretsを確認

1. **GitHubリポジトリにアクセス**
   - リポジトリのページを開く

2. **Settingsを開く**
   - リポジトリの上部メニューから **Settings** をクリック

3. **Secrets and variables → Actionsを開く**
   - 左サイドバーから **Secrets and variables** → **Actions** を選択

4. **`SUPABASE_PROJECT_ID_STAGING` が存在するか確認**
   - Secretsの一覧を確認
   - `SUPABASE_PROJECT_ID_STAGING` が存在しない場合は追加が必要

### ステップ2: 検証環境のProject IDを確認

1. **Supabase Dashboardにログイン**
   - URL: https://supabase.com/dashboard

2. **検証環境のプロジェクトを選択**
   - プロジェクト一覧から検証環境（Staging）のプロジェクトを選択

3. **Project IDを確認**
   - **Settings** → **General** を開く
   - **Reference ID** をコピー（例: `mluvjdhqgfpcfsmvjae`）

### ステップ3: GitHub Secretsに追加または更新

#### もし `SUPABASE_PROJECT_ID_STAGING` が存在しない場合

1. **New repository secret** をクリック
2. **Name**: `SUPABASE_PROJECT_ID_STAGING`
3. **Value**: ステップ2でコピーしたProject IDを貼り付け
4. **Add secret** をクリック

#### もし `SUPABASE_PROJECT_ID_STAGING` が既に存在する場合

1. **`SUPABASE_PROJECT_ID_STAGING`** をクリック
2. **Update** をクリック
3. **Value** を確認・更新（ステップ2でコピーしたProject IDを貼り付け）
4. **Update secret** をクリック

**または、削除して再作成**:
1. **`SUPABASE_PROJECT_ID_STAGING`** の右側の **削除アイコン** をクリック
2. 確認ダイアログで削除を確認
3. **New repository secret** をクリック
4. 上記の手順で再作成

---

## ✅ 設定後の確認

### ステップ1: Secretsが正しく設定されているか確認

1. GitHubリポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. 以下の3つのSecretsが存在することを確認：
   - ✅ `SUPABASE_ACCESS_TOKEN`（既に設定済み）
   - ✅ `SUPABASE_PROJECT_ID_STAGING`（今設定した）
   - ✅ `SUPABASE_PROJECT_ID_PRODUCTION`（本番環境用、後で設定）

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
- ✅ `apply-to-staging`: 成功（`SUPABASE_PROJECT_ID_STAGING`が設定されていれば）
- ✅ `apply-to-production`: 承認待ちまたは成功

---

## 🔧 トラブルシューティング

### 問題1: "Secret not found" エラーが続く

**原因**: Secretsの名前が間違っている

**解決方法**:
- Secretsの名前が正確に以下と一致しているか確認：
  - `SUPABASE_PROJECT_ID_STAGING`（大文字小文字を正確に）
  - スペースや特殊文字が含まれていないか確認

### 問題2: "Project not found" エラー

**原因**: Project IDが間違っている

**解決方法**:
1. Supabase DashboardでProject IDを再確認
2. **Settings** → **General** → **Reference ID** をコピー
3. GitHub Secretsの値を更新

### 問題3: 値が空のまま

**原因**: Secretの値が正しく設定されていない

**解決方法**:
1. Secretを削除
2. 新しいSecretを作成
3. Project IDをコピー&ペースト（手入力ではなく、必ずコピー&ペースト）

---

## 📋 チェックリスト

`SUPABASE_PROJECT_ID_STAGING`を設定するために：

- [ ] GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** を開く
- [ ] `SUPABASE_PROJECT_ID_STAGING` が存在するか確認
- [ ] Supabase Dashboardで検証環境のProject IDを確認
- [ ] Project IDをコピー
- [ ] `SUPABASE_PROJECT_ID_STAGING` を追加または更新
- [ ] Secretが存在することを確認
- [ ] ワークフローを再実行して確認

---

## 🔗 関連ファイル

- `.github/workflows/apply-migrations.yml` - ワークフローファイル
- `GitHub Secrets設定手順_CI_CD専用.md` - 詳細な設定手順
- `apply-to-staging失敗の解決方法.md` - 詳細なトラブルシューティング

---

## 📝 まとめ

**問題**: `SUPABASE_PROJECT_ID_STAGING` が未設定または空

**解決方法**:
1. ✅ Supabase Dashboardで検証環境のProject IDを確認
2. ✅ GitHub Secretsに `SUPABASE_PROJECT_ID_STAGING` を追加または更新
3. ✅ ワークフローを再実行

**重要なポイント**:
- ✅ Secret名は正確に `SUPABASE_PROJECT_ID_STAGING`（大文字小文字を含む）
- ✅ Project IDは必ずコピー&ペースト（手入力しない）
- ✅ Secretの値は確認できないが、存在することは確認できる
