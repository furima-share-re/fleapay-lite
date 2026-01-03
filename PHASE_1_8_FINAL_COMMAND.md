# Phase 1.8: データ移行の最終実行コマンド

**作成日**: 2026-01-04  
**プロジェクトID**: `mluvjdhqgfpcefsmvjae`（提供された接続文字列から）  
**パスワード**: `.cx2eeaZJ55Qp@f`

---

## 🚀 実行コマンド（コピペで実行）

**以下のコマンドを順番に実行してください：**

```powershell
# Step 1: PATH設定（まだ実行していない場合）
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# Step 2: ディレクトリ移動（まだ移動していない場合）
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# Step 3: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 4: Direct Connection URL設定（プロジェクトID: mluvjdhqgfpcefsmvjae）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 5: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 6: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ プロジェクトIDが間違っている場合

**接続テストでエラーが発生した場合：**

1. **Supabase Dashboard**でプロジェクトIDを確認
   - **Settings** → **General** → **Reference ID**
   - または **Settings** → **Database** → **Connection string** → **URI** → **Direct Connection**

2. **確認したプロジェクトIDで接続URLを再設定：**

```powershell
# 確認したプロジェクトIDをYOUR_PROJECT_IDに置き換え
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
```

---

## 📋 完全なコマンド（一度にコピペ）

```powershell
# PATH設定
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# ディレクトリ移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Direct Connection URL設定（プロジェクトID: mluvjdhqgfpcefsmvjae）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# データインポート（接続テストが成功したら実行）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

**まずは、上記のコマンドを実行して、接続テストが成功するか確認してください！**

