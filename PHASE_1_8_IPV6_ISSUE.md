# Phase 1.8: IPv6/IPv4接続問題の解決

**作成日**: 2026-01-04  
**問題**: DNS解決は成功しているが、`psql`がホスト名を解決できない  
**原因**: IPv6アドレスのみが返されており、`psql`がIPv4アドレスを探している可能性

---

## 🔍 問題の原因

**DNS解決の結果：**
```
名前:    db.mluvjdhqgfpcefsmvjae.supabase.co
Address:  2406:da14:271:990e:700c:1843:6a5d:7a0b
```

**問題点：**
- IPv6アドレスのみが返されている
- `psql`がIPv4アドレスを探している可能性
- IPv6接続が有効になっていない可能性

---

## ✅ 解決方法

### 方法1: IPv4アドレスを明示的に指定

**PowerShellで、IPv4アドレスを取得：**

```powershell
# IPv4アドレスを取得
$hostname = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$ipv4 = [System.Net.Dns]::GetHostAddresses($hostname) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1 -ExpandProperty IPAddressToString
Write-Host "IPv4アドレス: $ipv4"
```

**接続URLでIPv4アドレスを直接使用：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# IPv4アドレスを取得
$hostname = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$ipv4 = [System.Net.Dns]::GetHostAddresses($hostname) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1 -ExpandProperty IPAddressToString

# IPv4アドレスを直接使用した接続URL
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@$ipv4:5432/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

---

### 方法2: nslookupでIPv4アドレスを確認

**PowerShellで、IPv4アドレスを確認：**

```powershell
# IPv4アドレスのみを取得
nslookup db.mluvjdhqgfpcefsmvjae.supabase.co | Select-String "Address" | Where-Object { $_ -notmatch ":" }
```

**または、`Resolve-DnsName`を使用：**

```powershell
# IPv4アドレスを取得
$result = Resolve-DnsName db.mluvjdhqgfpcefsmvjae.supabase.co -Type A
$ipv4 = $result | Where-Object { $_.IPAddress -notmatch ":" } | Select-Object -First 1 -ExpandProperty IPAddress
Write-Host "IPv4アドレス: $ipv4"
```

---

### 方法3: 接続文字列でホスト名を直接使用（推奨）

**Supabase Dashboardから接続文字列を直接コピーして使用：**

1. **Settings** → **Database** → **Connection string** → **URI** → **Direct Connection**
2. **接続文字列をコピー**
3. **パスワード部分を置き換え**

**PowerShellで実行：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Supabase Dashboardからコピーした接続文字列（パスワード部分を置き換え）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

---

## 📋 完全な解決手順

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: IPv4アドレスを取得
$hostname = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$ipv4 = [System.Net.Dns]::GetHostAddresses($hostname) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1 -ExpandProperty IPAddressToString
Write-Host "IPv4アドレス: $ipv4"

# Step 3: IPv4アドレスを直接使用した接続URL
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@$ipv4:5432/postgres"

# Step 4: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 5: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 🔄 代替方法: Resolve-DnsNameを使用

```powershell
# IPv4アドレスを取得
$result = Resolve-DnsName db.mluvjdhqgfpcefsmvjae.supabase.co -Type A
$ipv4 = $result | Where-Object { $_.IPAddress -notmatch ":" } | Select-Object -First 1 -ExpandProperty IPAddress
Write-Host "IPv4アドレス: $ipv4"

# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# IPv4アドレスを直接使用した接続URL
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@$ipv4:5432/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

---

**まずは、IPv4アドレスを取得して、接続URLで直接使用してください！**

