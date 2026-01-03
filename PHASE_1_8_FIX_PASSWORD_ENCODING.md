# Phase 1.8: パスワードのURLエンコード修正

**作成日**: 2026-01-04  
**問題**: パスワードに`@`が含まれているため、URLエンコードが必要  
**エラー**: `ホスト名"f@db.mluvjdhqgfpcefsmvjae.supabase.co"をアドレスに変換できませんでした`

---

## ✅ 解決方法: パスワードをURLエンコード

**パスワードをURLエンコードして、接続文字列を作成：**

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: エンコードされたパスワードを確認
Write-Host "エンコードされたパスワード: $encodedPassword"

# Step 3: 接続文字列を作成
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 4: データをインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全なコマンド（コピペで実行）

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: エンコードされたパスワードを確認
Write-Host "エンコードされたパスワード: $encodedPassword"

# Step 3: 接続文字列を作成
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 4: 接続テスト（オプション）
psql $SUPABASE_URL -c "SELECT version();"

# Step 5: データをインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: ホスト名が解決できない

**対処方法：**
- DNS解決を確認：`nslookup db.mluvjdhqgfpcefsmvjae.supabase.co`
- パスワードが正しくエンコードされているか確認

---

### エラー2: パスワード認証に失敗

**対処方法：**
1. **パスワードが正しいか確認**
2. **URLエンコードが正しいか確認**
3. **手動でエンコードしたURLを使用**

---

## 🔍 パスワードのURLエンコード

**特殊文字のURLエンコード：**
- `.` → `%2E`
- `@` → `%40`

**期待されるエンコード結果：**
```
%2Ecx2eeaZJ55Qp%40f
```

---

**まずは、パスワードをURLエンコードして、接続文字列を作成してください！**

