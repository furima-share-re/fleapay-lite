# Phase 1.8: ホスト名解決エラーの修正

**作成日**: 2026-01-04  
**エラー**: `psql: エラー: ホスト名"db.mluvjdhqgfpcefsmvjae.supabase.co"をアドレスに変換できませんでした`

---

## 🔍 問題の原因

プロジェクトIDが間違っている可能性があります。

**提供された接続文字列：**
```
postgresql://postgres.mluvjdhqgfpcefsmvjae:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**使用したプロジェクトID：** `mluvjdhqgfpcefsmvjae`

**検証環境のプロジェクトID：** `mluvjdhqgfpcfsmvjae`（`c`と`e`の位置が異なる）

---

## ✅ 解決方法

### 方法1: Supabase DashboardでプロジェクトIDを確認

1. **Supabase Dashboard**にログイン
2. **本番環境のプロジェクト**を選択
3. **Settings** → **General** を開く
4. **Reference ID** を確認（これがプロジェクトIDです）

**または、Connection stringから確認：**

1. **Settings** → **Database** を開く
2. **Connection string** セクションを確認
3. **URI** タブの **Direct Connection** を確認
   - 形式: `postgresql://postgres:password@db.XXXXX.supabase.co:5432/postgres`
   - `XXXXX`の部分が**プロジェクトID**です

---

### 方法2: 接続文字列から直接確認

**提供された接続文字列：**
```
postgresql://postgres.mluvjdhqgfpcefsmvjae:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**プロジェクトIDは `postgres.` の後の部分です：**
- `mluvjdhqgfpcefsmvjae`

**Direct Connection URLの形式：**
```
postgresql://postgres:password@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres
```

---

## 🔧 修正手順

### Step 1: プロジェクトIDを確認

Supabase Dashboardで**Reference ID**を確認してください。

---

### Step 2: 正しいプロジェクトIDで接続URLを設定

**確認したプロジェクトIDを`YOUR_PROJECT_ID`に置き換えて実行：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Direct Connection URL（正しいプロジェクトIDを使用）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
```

---

### Step 3: 接続テスト

```powershell
psql $SUPABASE_URL -c "SELECT version();"
```

**期待される出力：** PostgreSQLのバージョン情報が表示される

---

## 📋 完全なコマンド（プロジェクトIDを確認後）

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Direct Connection URL設定（YOUR_PROJECT_IDを正しい値に置き換え）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ よくある間違い

### 間違い1: プロジェクトIDのタイポ

**確認方法：**
- Supabase Dashboardの**Settings** → **General** → **Reference ID**を確認
- 接続文字列の`postgres.`の後の部分を確認

---

### 間違い2: Connection Pooling URLとDirect Connection URLの混同

**Connection Pooling URL（使用しない）:**
```
postgresql://postgres.mluvjdhqgfpcefsmvjae:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**Direct Connection URL（使用する）:**
```
postgresql://postgres:password@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres
```

**違い：**
- ホスト: `pooler.supabase.com` → `db.XXXXX.supabase.co`
- ポート: `6543` → `5432`
- ユーザー名: `postgres.XXXXX` → `postgres`

---

**まずは、Supabase Dashboardで正しいプロジェクトIDを確認してください！**

