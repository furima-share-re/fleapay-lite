# Phase 1.8: ホスト変数の修正

**作成日**: 2026-01-04  
**問題**: `$host`はPowerShellの予約変数のため使用できない  
**解決方法**: 別の変数名を使用（例: `$pgHost`）

---

## ✅ 解決方法: 別の変数名を使用

**PowerShellで、`$host`の代わりに`$pgHost`を使用：**

```powershell
# Step 1: DNSキャッシュをクリア
ipconfig /flushdns

# Step 2: 接続情報を設定（$hostの代わりに$pgHostを使用）
$password = ".cx2eeaZJ55Qp@f"
$pgHost = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$port = "5432"
$user = "postgres"
$database = "postgres"

# Step 3: パスワードを環境変数として設定
$env:PGPASSWORD = $password

# Step 4: 接続テスト
psql -h $pgHost -p $port -U $user -d $database -c "SELECT version();"

# Step 5: データインポート（接続テストが成功したら）
pg_restore -h $pgHost -p $port -U $user -d $database --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全なコマンド（コピペで実行）

```powershell
# Step 1: DNSキャッシュをクリア
ipconfig /flushdns

# Step 2: 接続情報を設定（$hostの代わりに$pgHostを使用）
$password = ".cx2eeaZJ55Qp@f"
$pgHost = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$port = "5432"
$user = "postgres"
$database = "postgres"

# Step 3: パスワードを環境変数として設定
$env:PGPASSWORD = $password

# Step 4: 接続テスト
psql -h $pgHost -p $port -U $user -d $database -c "SELECT version();"

# Step 5: データインポート（接続テストが成功したら）
pg_restore -h $pgHost -p $port -U $user -d $database --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ PowerShellの予約変数

**PowerShellでは、以下の変数は予約されています：**
- `$host` - PowerShellホストオブジェクト
- `$PSHost` - PowerShellホストオブジェクト
- `$PSSession` - PowerShellセッションオブジェクト

**これらの変数名は使用しないでください。**

---

## 🔄 代替方法: 環境変数を使用

**環境変数を使用して接続情報を設定：**

```powershell
# Step 1: DNSキャッシュをクリア
ipconfig /flushdns

# Step 2: 接続情報を環境変数として設定
$env:PGPASSWORD = ".cx2eeaZJ55Qp@f"
$env:PGHOST = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

# Step 3: 接続テスト（環境変数を使用）
psql -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore --verbose --clean --no-owner --no-privileges .
```

---

**まずは、`$pgHost`を使用して接続テストを実行してください！**

