# Phase 1.8: IPv6アドレスを直接使用

**作成日**: 2026-01-04  
**問題**: ホスト名が解決できない（IPv4アドレスが取得できない）  
**解決方法**: IPv6アドレスを直接使用

---

## 🔍 問題の原因

**DNS解決の結果：**
- IPv6アドレス: `2406:da14:271:990e:700c:1843:6a5d:7a0b`（取得済み）
- IPv4アドレス: 取得できませんでした

**`psql`がIPv4アドレスを探しているため、ホスト名が解決できません。**

---

## ✅ 解決方法: IPv6アドレスを直接使用

**IPv6アドレスを直接使用した接続URLを作成：**

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: IPv6アドレスを直接使用（角括弧で囲む）
$ipv6 = "2406:da14:271:990e:700c:1843:6a5d:7a0b"
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@[$ipv6]:5432/postgres"

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

# Step 2: IPv6アドレスを直接使用（角括弧で囲む）
$ipv6 = "2406:da14:271:990e:700c:1843:6a5d:7a0b"
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@[$ipv6]:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: IPv6接続が失敗する場合

**対処方法：**
- IPv6接続が有効になっているか確認
- ファイアウォール設定を確認
- Supabase Dashboardから接続文字列を直接コピー

---

### エラー2: パスワード認証に失敗

**対処方法：**
1. **パスワードが正しいか確認**
2. **URLエンコードが正しいか確認**
3. **手動でエンコードしたURLを使用**

---

## 🔄 代替方法: Supabase Dashboardから接続文字列を直接コピー

**Supabase Dashboardから接続文字列を直接コピーして使用：**

1. **Settings** → **Database** → **Connection string** → **URI** → **Direct Connection**
2. **接続文字列をコピー**
3. **PowerShellで、パスワード部分を置き換え**

**これが最も確実な方法です！**

---

**まずは、IPv6アドレスを直接使用して接続テストを実行してください！**

