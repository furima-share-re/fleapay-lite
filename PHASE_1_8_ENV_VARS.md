# Phase 1.8: 環境変数を使用した接続

**作成日**: 2026-01-04  
**問題**: ホスト名が解決できない（DNS解決の問題）  
**解決方法**: 環境変数を使用して接続情報を設定

---

## ✅ 解決方法: 環境変数を使用

**PowerShellで、接続情報を環境変数として設定：**

```powershell
# Step 1: DNSキャッシュをクリア
ipconfig /flushdns

# Step 2: 接続情報を設定
$password = ".cx2eeaZJ55Qp@f"
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

## 📋 完全なコマンド（コピペで実行）

```powershell
# Step 1: DNSキャッシュをクリア
ipconfig /flushdns

# Step 2: 接続情報を設定
$password = ".cx2eeaZJ55Qp@f"
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
1. **DNSキャッシュをクリア**：`ipconfig /flushdns`
2. **別のDNSサーバーを使用**（例: Google DNS `8.8.8.8`）
3. **Supabase Dashboardから接続文字列を直接コピー**

---

### エラー2: パスワード認証に失敗

**対処方法：**
1. **パスワードが正しいか確認**
2. **環境変数`PGPASSWORD`が正しく設定されているか確認**
3. **手動でパスワードを入力**（`psql`がパスワードを要求する場合）

---

## 🔄 代替方法: Supabase DashboardのSQL Editorを使用

**もし`pg_restore`が使用できない場合：**

1. **Supabase Dashboard**にログイン
2. **SQL Editor**を開く
3. **バックアップファイルをSQL形式に変換**
4. **SQL Editorで実行**

**ただし、この方法は大きなデータセットには適していません。**

---

**まずは、DNSキャッシュをクリアして、環境変数を使用した接続を試してください！**

