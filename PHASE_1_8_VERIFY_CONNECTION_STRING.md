# Phase 1.8: 接続文字列の確認

**作成日**: 2026-01-04  
**本番環境のプロジェクトID**: `snowkercpcuixnwxchkc`  
**パスワード**: `.cx2eeaZJ55Qp@f`

---

## ✅ 接続文字列の確認

### Supabase Dashboardに表示されている接続文字列

```
postgresql://postgres:[YOUR-PASSWORD]@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
```

**この接続文字列は正しい形式です。**

---

### GitHub Secretsに設定する接続文字列

**パスワード部分をURLエンコードする必要があります：**

**元のパスワード**: `.cx2eeaZJ55Qp@f`

**URLエンコード後**: `%2Ecx2eeaZJ55Qp%40f`
- `.` → `%2E`
- `@` → `%40`

**GitHub Secretsに設定する接続文字列：**
```
postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
```

---

## ✅ 接続文字列の確認方法

**PowerShellで、URLエンコードを確認：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
Write-Host "エンコードされたパスワード: $encodedPassword"

# 完全な接続文字列
$connectionString = "postgresql://postgres:$encodedPassword@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres"
Write-Host "接続文字列: $connectionString"
```

**期待される出力：**
```
エンコードされたパスワード: .cx2eeaZJ55Qp%40f
接続文字列: postgresql://postgres:.cx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
```

**注意**: PowerShellの`UrlEncode`は`.`をエンコードしない場合があります。手動で確認してください。

---

## ⚠️ 重要な注意事項

### IPv4互換性の問題

**スクリーンショットに「Not IPv4 compatible」という警告が表示されています。**

**これは、SupabaseのデータベースがIPv4と互換性がないことを示しています。**
- GitHub ActionsのUbuntu環境はIPv6をサポートしているため、接続できる可能性が高いです
- 現在のWindows環境では、IPv4のみをサポートしているため、接続できない可能性があります

---

## 📋 GitHub Secretsに設定する接続文字列

**以下の接続文字列をGitHub Secretsに設定してください：**

```
postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
```

**確認ポイント：**
- ✅ プロジェクトID: `snowkercpcuixnwxchkc`
- ✅ ポート: `5432`
- ✅ ホスト: `db.snowkercpcuixnwxchkc.supabase.co`
- ✅ パスワードのURLエンコード: `%2Ecx2eeaZJ55Qp%40f`

---

## 🔍 接続文字列の検証

**PowerShellで、接続文字列を検証：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# 手動で確認（.はエンコードされない場合があるため）
$manualEncoded = $encodedPassword -replace '\.', '%2E' -replace '@', '%40'
Write-Host "手動エンコード後: $manualEncoded"

# 完全な接続文字列
$connectionString = "postgresql://postgres:$manualEncoded@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres"
Write-Host "接続文字列: $connectionString"
```

---

**接続文字列は正しいです。GitHub Secretsに設定してください！**

