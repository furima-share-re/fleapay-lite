# Phase 1.8: 最終的な解決方法

**作成日**: 2026-01-04  
**問題**: Supabase SQL Editorで「Query is too large」エラーが発生  
**状況**: 10MBごとに分割したファイルでも大きすぎる

---

## ⚠️ 現在の状況

**Supabase SQL Editorの制限：**
- 実際の制限: 5MB以下（またはそれ以下）の可能性が高い
- 10MBごとに分割したファイルでも大きすぎる

**この方法では、データインポートが困難です。**

---

## ✅ 推奨される解決方法

### 方法1: GitHub Actionsを使用（最も確実、無料）

**GitHub Actionsを使用してデータをインポート：**

1. **GitHubリポジトリを作成**（まだ作成していない場合）
2. **GitHub Actionsワークフローを作成**
3. **バックアップファイルをリポジトリにアップロード**
4. **GitHub Actionsで`pg_restore`を実行**

**メリット：**
- 無料
- DNS解決の問題が発生しない可能性が高い
- 自動化可能

---

### 方法2: 別のマシンまたはクラウド環境を使用

**別のマシンまたはクラウド環境を使用：**

- **AWS EC2**（有料、より柔軟）
- **Google Cloud Run**（無料枠あり）
- **別のWindows/Mac/Linuxマシン**

**これらの環境では、DNS解決の問題が発生しない可能性が高いです。**

---

### 方法3: Supabase CLIを使用（DNS解決の問題が解決した場合）

**Supabase CLIを使用してデータをインポート：**

```powershell
# プロジェクトディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# Supabase CLIを使用してデータをインポート
# 注意: DNS解決の問題が解決している必要があります
npx supabase db push
```

---

## 📋 GitHub Actionsを使用する場合の手順

### Step 1: GitHubリポジトリにワークフローファイルを作成

**`.github/workflows/import-db.yml`を作成：**

```yaml
name: Import Database

on:
  workflow_dispatch:

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PostgreSQL
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client
      
      - name: Import database
        env:
          DATABASE_URL: ${{ secrets.SUPABASE_DATABASE_URL }}
        run: |
          cd tmp/2026-01-03T15_42Z/fleapay_prod_db
          pg_restore --dbname=$DATABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

### Step 2: GitHub Secretsに接続情報を設定

1. **GitHubリポジトリ** → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**をクリック
3. **Name**: `SUPABASE_DATABASE_URL`
4. **Value**: `postgresql://postgres:.cx2eeaZJ55Qp@f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres`
5. **Add secret**をクリック

---

### Step 3: ワークフローを実行

1. **GitHubリポジトリ** → **Actions**タブ
2. **Import Database**ワークフローを選択
3. **Run workflow**をクリック

---

## 🎯 推奨手順

1. **GitHub Actionsを使用**（最も確実、無料）
2. **または、別のマシン/クラウド環境を使用**
3. **または、DNS解決の問題が解決した場合、Supabase CLIを使用**

---

**まずは、GitHub Actionsを使用することを強く推奨します！**
