# Phase 1.8: GitHub Actionsを使用したデータインポート設定

**作成日**: 2026-01-04  
**ワークフローファイル**: `.github/workflows/import-db.yml`（作成済み）

---

## ✅ Step 1: ワークフローファイルの作成（完了）

**`.github/workflows/import-db.yml`ファイルを作成しました。**

---

## 📋 Step 2: GitHub Secretsに接続情報を設定

**GitHub Secretsに接続情報を設定：**

1. **GitHubリポジトリ**に移動
2. **Settings** → **Secrets and variables** → **Actions**を開く
3. **New repository secret**をクリック
4. **Name**: `SUPABASE_DATABASE_URL`
5. **Value**: `postgresql://postgres:.cx2eeaZJ55Qp@f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres`
   - **注意**: パスワードに`@`が含まれているため、URLエンコードが必要な場合があります
   - URLエンコード後の値: `postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres`
6. **Add secret**をクリック

---

## 📋 Step 3: バックアップファイルをリポジトリにコミット

**バックアップファイルをリポジトリにコミット：**

```powershell
# プロジェクトディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# バックアップディレクトリをGitに追加
git add tmp/2026-01-03T15_42Z/

# コミット
git commit -m "Add database backup for migration"

# プッシュ
git push
```

**注意**: バックアップファイルは大きいため（87.2MB）、Git LFSを使用することを推奨します。

---

## 📋 Step 4: GitHub Actionsワークフローを実行

**GitHub Actionsワークフローを実行：**

1. **GitHubリポジトリ** → **Actions**タブ
2. **Import Database**ワークフローを選択
3. **Run workflow**をクリック
4. **Run workflow**ボタンをクリック
5. ワークフローの実行を待つ

---

## ⚠️ 重要な注意事項

### Git LFSの使用（推奨）

**バックアップファイルが大きいため、Git LFSを使用することを推奨します：**

```powershell
# Git LFSをインストール（まだインストールしていない場合）
# https://git-lfs.github.com/ からダウンロード

# Git LFSを初期化
git lfs install

# バックアップファイルをGit LFSで追跡
git lfs track "tmp/**/*.sql"
git lfs track "tmp/**/*.dat"

# .gitattributesをコミット
git add .gitattributes
git commit -m "Add Git LFS tracking for backup files"
```

---

### パスワードのURLエンコード

**GitHub Secretsに設定する接続文字列：**

**URLエンコード前：**
```
postgresql://postgres:.cx2eeaZJ55Qp@f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
```

**URLエンコード後（推奨）：**
```
postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
```

**特殊文字のURLエンコード：**
- `.` → `%2E`
- `@` → `%40`

---

## 📋 完全な手順

```powershell
# Step 1: プロジェクトディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# Step 2: バックアップディレクトリをGitに追加
git add tmp/2026-01-03T15_42Z/

# Step 3: コミット
git commit -m "Add database backup for migration"

# Step 4: プッシュ
git push
```

**その後、GitHub Dashboardで：**
1. **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**をクリック
3. **Name**: `SUPABASE_DATABASE_URL`
4. **Value**: `postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres`
5. **Add secret**をクリック
6. **Actions**タブ → **Import Database** → **Run workflow**

---

**まずは、バックアップファイルをリポジトリにコミットして、GitHub Secretsに接続情報を設定してください！**

