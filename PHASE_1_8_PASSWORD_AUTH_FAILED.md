# Phase 1.8: パスワード認証エラーの解決

**作成日**: 2026-01-04  
**エラー**: `FATAL: password authentication failed for user "postgres"`  
**原因**: Connection Pooling URLのユーザー名形式が間違っている可能性

---

## 🔍 問題の原因

**Connection Pooling URLのユーザー名形式：**
```
postgres.mluvjdhqgfpcefsmvjae
```

**問題点：**
- Connection Pooling URLでは、ユーザー名の形式が異なる可能性があります
- パスワードのURLエンコードが正しくない可能性があります
- Direct Connection URLを使用する方が確実です

---

## ✅ 解決方法1: Direct Connection URLを使用（推奨）

**Supabase DashboardからDirect Connection URLを取得：**

1. **Settings** → **Database** を開く
2. **Connection string** セクションを確認
3. **URI** タブの **Direct Connection** を確認
4. **接続文字列をコピー**
   - 形式: `postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres`

**PowerShellで、パスワード部分を置き換え：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Direct Connection URL（ポート5432）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ✅ 解決方法2: パスワードを確認

**Supabase Dashboardでパスワードを確認：**

1. **Settings** → **Database** を開く
2. **Database password** を確認
3. パスワードが正しいか確認

**もしパスワードが異なる場合は、正しいパスワードを使用してください。**

---

## ✅ 解決方法3: URLエンコードを手動で確認

**URLエンコードされたパスワードを確認：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
Write-Host "エンコードされたパスワード: $encodedPassword"
```

**期待される出力：**
```
エンコードされたパスワード: %2Ecx2eeaZJ55Qp%40f
```

**手動でエンコードしたURLを使用：**

```powershell
# 特殊文字のURLエンコード: . → %2E, @ → %40
$SUPABASE_URL = "postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

---

## ✅ 解決方法4: Connection Pooling URLのユーザー名を修正

**Connection Pooling URLでは、ユーザー名が`postgres`だけの場合があります：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Connection Pooling URL（ユーザー名を`postgres`に変更）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

**ただし、`pg_restore`では通常、Direct Connection URLを使用する必要があります。**

---

## 📋 完全な解決手順（推奨）

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Direct Connection URL（ポート5432）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 🔍 トラブルシューティング

### エラー1: パスワード認証に失敗

**対処方法：**
1. **パスワードが正しいか確認**
   - Supabase Dashboard → **Settings** → **Database** → **Database password**
2. **URLエンコードが正しいか確認**
   - 手動でエンコードしたURLを使用
3. **Direct Connection URLを使用**
   - Connection Pooling URLではなく、Direct Connection URLを使用

---

### エラー2: Connection Pooling URLで接続できない

**対処方法：**
- **Direct Connection URLを使用してください**
- `pg_restore`では通常、Direct Connection URLが必要です

---

## 🎯 最も確実な方法

**Supabase DashboardからDirect Connection URLを直接コピーして使用：**

1. **Settings** → **Database** → **Connection string** → **URI** → **Direct Connection**
2. **接続文字列をコピー**
3. **PowerShellで、パスワード部分を置き換え**

**これが最も確実な方法です！**

---

**まずは、Direct Connection URLを使用して接続テストを実行してください！**

