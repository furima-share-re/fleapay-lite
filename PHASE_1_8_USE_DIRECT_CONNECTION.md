# Phase 1.8: Direct Connection URLを使用

**作成日**: 2026-01-04  
**接続文字列**: `postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres`  
**パスワード**: `.cx2eeaZJ55Qp@f`

---

## ✅ 解決方法: Direct Connection URLを使用

**Supabase Dashboardから取得したDirect Connection URLを使用：**

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Direct Connection URLを設定（パスワード部分を置き換え）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全なコマンド（コピペで実行）

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Direct Connection URLを設定
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: ホスト名が解決できない

**対処方法：**
- DNSキャッシュをクリア：`ipconfig /flushdns`
- 環境変数を使用した接続を試す（下記参照）

---

### エラー2: パスワード認証に失敗

**対処方法：**
1. **パスワードが正しいか確認**
2. **URLエンコードが正しいか確認**
3. **手動でエンコードしたURLを使用**

---

## 🔄 代替方法: 環境変数を使用

**もし接続文字列が動作しない場合、環境変数を使用：**

```powershell
# Step 1: パスワードを設定
$env:PGPASSWORD = ".cx2eeaZJ55Qp@f"
$env:PGHOST = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

# Step 2: 接続テスト
psql -c "SELECT version();"

# Step 3: データインポート
pg_restore -d $env:PGDATABASE --verbose --clean --no-owner --no-privileges .
```

---

**まずは、Direct Connection URLを使用して接続テストを実行してください！**

