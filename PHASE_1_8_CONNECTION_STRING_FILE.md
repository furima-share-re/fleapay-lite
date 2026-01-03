# Phase 1.8: 接続文字列をファイルに保存して使用

**作成日**: 2026-01-04  
**問題**: ホスト名が解決できない（DNS解決の問題）  
**解決方法**: 接続文字列をファイルに保存して使用

---

## ✅ 解決方法: 接続文字列を環境変数として設定

**PowerShellで、接続文字列を環境変数として設定：**

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: 接続文字列を環境変数として設定
$env:PGPASSWORD = $password
$env:PGHOST = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

# Step 3: 接続テスト（環境変数を使用）
psql -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE --verbose --clean --no-owner --no-privileges .
```

---

## 🔄 代替方法: 接続文字列を直接指定

**`psql`コマンドに接続情報を直接指定：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# 接続情報を直接指定
$host = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$port = "5432"
$user = "postgres"
$database = "postgres"

# 接続テスト（パスワードを環境変数として設定）
$env:PGPASSWORD = $password
psql -h $host -p $port -U $user -d $database -c "SELECT version();"

# データインポート（接続テストが成功したら）
pg_restore -h $host -p $port -U $user -d $database --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全なコマンド（推奨）

```powershell
# Step 1: パスワードをURLエンコード（確認用）
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
Write-Host "エンコードされたパスワード: $encodedPassword"

# Step 2: 接続情報を設定
$host = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$port = "5432"
$user = "postgres"
$database = "postgres"

# Step 3: パスワードを環境変数として設定
$env:PGPASSWORD = $password

# Step 4: 接続テスト
psql -h $host -p $port -U $user -d $database -c "SELECT version();"

# Step 5: データインポート（接続テストが成功したら）
pg_restore -h $host -p $port -U $user -d $database --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: ホスト名が解決できない

**対処方法：**
- DNSキャッシュをクリア：
  ```powershell
  ipconfig /flushdns
  ```
- 別のDNSサーバーを使用（例: Google DNS `8.8.8.8`）
- Supabase Dashboardから接続文字列を直接コピー

---

### エラー2: パスワード認証に失敗

**対処方法：**
1. **パスワードが正しいか確認**
2. **環境変数`PGPASSWORD`が正しく設定されているか確認**
3. **手動でパスワードを入力**（`psql`がパスワードを要求する場合）

---

## 🎯 推奨手順

1. **DNSキャッシュをクリア**
2. **接続情報を環境変数として設定**
3. **接続テストを実行**
4. **成功したら、データインポートを実行**

---

**まずは、DNSキャッシュをクリアして、接続情報を環境変数として設定して試してください！**

