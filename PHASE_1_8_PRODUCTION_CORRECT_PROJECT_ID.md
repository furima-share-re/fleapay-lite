# Phase 1.8: 本番環境の正しいプロジェクトIDを使用

**作成日**: 2026-01-04  
**本番環境のプロジェクトID**: `snowkercpcuixnwxchkc`（確認済み）  
**パスワード**: `.cx2eeaZJ55Qp@f`

---

## ✅ 解決方法: 正しいプロジェクトIDを使用

**本番環境のプロジェクトIDを使用して、Direct Connection URLを作成：**

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Direct Connection URLを作成（本番環境のプロジェクトIDを使用）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データをインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全なコマンド（コピペで実行）

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Direct Connection URLを作成（本番環境のプロジェクトID: snowkercpcuixnwxchkc）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres"

# Step 3: DNS解決を確認
nslookup db.snowkercpcuixnwxchkc.supabase.co

# Step 4: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 5: データをインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 🔄 環境変数を使用する場合

**環境変数を使用して接続情報を設定：**

```powershell
# Step 1: 環境変数を設定
$env:PGPASSWORD = ".cx2eeaZJ55Qp@f"
$env:PGHOST = "db.snowkercpcuixnwxchkc.supabase.co"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

# Step 2: DNS解決を確認
nslookup $env:PGHOST

# Step 3: 接続テスト
psql -c "SELECT version();"

# Step 4: データをインポート
pg_restore -d $env:PGDATABASE --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: ホスト名が解決できない

**対処方法：**
- DNS解決を確認：`nslookup db.snowkercpcuixnwxchkc.supabase.co`
- IPv4アドレスが取得できるか確認

---

### エラー2: パスワード認証に失敗

**対処方法：**
1. **パスワードが正しいか確認**
2. **URLエンコードが正しいか確認**
3. **手動でエンコードしたURLを使用**

---

## 🎯 推奨手順

1. **正しいプロジェクトIDを使用して接続文字列を作成**
2. **DNS解決を確認**
3. **接続テストを実行**
4. **成功したら、データをインポート**

---

**まずは、正しいプロジェクトIDを使用して接続テストを実行してください！**

