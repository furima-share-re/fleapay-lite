# Phase 1.8: プロジェクトIDの確認方法

**作成日**: 2026-01-04  
**問題**: ホスト名が解決できないエラーが発生

---

## 🔍 プロジェクトIDの確認方法

### 方法1: Supabase Dashboardから確認（推奨）

1. **Supabase Dashboard**にログイン
2. **本番環境のプロジェクト**を選択
3. **Settings** → **General** を開く
4. **Reference ID** を確認（これがプロジェクトIDです）

**例：**
```
Reference ID: mluvjdhqgfpcfsmvjae
```

---

### 方法2: Connection stringから確認

1. **Settings** → **Database** を開く
2. **Connection string** セクションを確認
3. **URI** タブの **Direct Connection** を確認
   - 形式: `postgresql://postgres:password@db.XXXXX.supabase.co:5432/postgres`
   - `XXXXX`の部分が**プロジェクトID**です

**例：**
```
postgresql://postgres:password@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```
→ プロジェクトIDは `mluvjdhqgfpcfsmvjae`

---

### 方法3: Project URLから確認

Supabase DashboardのURLから確認：
```
https://supabase.com/dashboard/project/XXXXX/...
```
→ `XXXXX`の部分が**プロジェクトID**です

---

## ⚠️ よくある間違い

### 間違い1: Connection Pooling URLとDirect Connection URLの混同

**提供された接続文字列（Connection Pooling）:**
```
postgresql://postgres.mluvjdhqgfpcefsmvjae:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**この接続文字列からプロジェクトIDを抽出すると：**
- `postgres.mluvjdhqgfpcefsmvjae` → プロジェクトIDは `mluvjdhqgfpcefsmvjae`

**しかし、Direct Connection URLでは：**
- ホスト: `db.mluvjdhqgfpcefsmvjae.supabase.co`
- ポート: `5432`

**注意**: Connection Pooling URLのプロジェクトIDとDirect Connection URLのプロジェクトIDは同じですが、ホスト名の形式が異なります。

---

### 間違い2: プロジェクトIDのタイポ

**検証環境のプロジェクトID**: `mluvjdhqgfpcfsmvjae`  
**提供された接続文字列のプロジェクトID**: `mluvjdhqgfpcefsmvjae`

**違い**: `c`と`e`の位置が異なります
- 検証環境: `...gfpcfsmvjae`（`c`の後に`f`）
- 提供された: `...gfpcefsmvjae`（`c`の後に`e`）

---

## ✅ 正しい接続URLの設定方法

### Step 1: プロジェクトIDを確認

Supabase Dashboardで**Reference ID**を確認してください。

---

### Step 2: Direct Connection URLを設定

**確認したプロジェクトIDを`YOUR_PROJECT_ID`に置き換えて実行：**

```powershell
# パスワードをURLエンコード（既に実行済みの場合はスキップ）
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Direct Connection URL設定（確認したプロジェクトIDを使用）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
```

---

### Step 3: 接続テスト

```powershell
psql $SUPABASE_URL -c "SELECT version();"
```

**期待される出力：** PostgreSQLのバージョン情報が表示される

---

### Step 4: データインポート（接続テストが成功したら）

```powershell
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全なコマンド（プロジェクトIDを確認後）

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Direct Connection URL設定（確認したプロジェクトIDを使用）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

**まずは、Supabase Dashboardで正しいプロジェクトIDを確認してください！**

