# Phase 1.8: DNS解決エラーのトラブルシューティング

**作成日**: 2026-01-04  
**プロジェクトID**: `mluvjdhqgfpcefsmvjae`（確認済み）  
**エラー**: `psql: エラー: ホスト名"db.mluvjdhqgfpcefsmvjae.supabase.co"をアドレスに変換できませんでした`

---

## 🔍 トラブルシューティング手順

### Step 1: DNS解決をテスト

**PowerShellで、以下のコマンドを実行してDNS解決をテスト：**

```powershell
# DNS解決をテスト
nslookup db.mluvjdhqgfpcefsmvjae.supabase.co
```

**期待される出力：**
```
サーバー:  ...
Address:  ...

名前:    db.mluvjdhqgfpcefsmvjae.supabase.co
Address:  xxx.xxx.xxx.xxx
```

**もし「見つかりませんでした」と表示された場合：**
- プロジェクトIDが間違っている可能性
- プロジェクトが一時停止している可能性
- DNSの問題（一時的な問題の可能性）

---

### Step 2: Supabase Dashboardでプロジェクトの状態を確認

1. **Supabase Dashboard**にログイン
2. **プロジェクト `mluvjdhqgfpcefsmvjae`** を選択
3. **プロジェクトの状態を確認**
   - **Active** 状態か確認
   - 一時停止している場合は、**Resume** をクリック

---

### Step 3: 接続文字列を直接コピー

**Supabase Dashboardから直接接続文字列を取得：**

1. **Settings** → **Database** を開く
2. **Connection string** セクションを確認
3. **URI** タブの **Direct Connection** を確認
4. **接続文字列をコピー**
   - 形式: `postgresql://postgres:[YOUR-PASSWORD]@db.XXXXX.supabase.co:5432/postgres`
5. **パスワード部分を実際のパスワードに置き換え**

**例：**
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres
```

**パスワードを置き換え（URLエンコード）：**
```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# 接続文字列を設定（Supabase Dashboardからコピーした接続文字列を使用）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"
```

---

### Step 4: ファイアウォール設定を確認

**Supabase Dashboardでファイアウォール設定を確認：**

1. **Settings** → **Database** を開く
2. **Connection string** セクションを確認
3. **Network restrictions** を確認
4. 必要に応じて、現在のIPアドレスを許可

**現在のIPアドレスを確認：**
```powershell
# 現在のIPアドレスを確認（外部IP）
Invoke-RestMethod -Uri "https://api.ipify.org"
```

---

## ⚠️ よくある問題と対処方法

### 問題1: プロジェクトIDが間違っている

**対処方法：**
- Supabase Dashboard → **Settings** → **General** → **Reference ID** を確認
- 接続文字列のホスト名を確認

---

### 問題2: プロジェクトが一時停止している

**対処方法：**
- Supabase Dashboardでプロジェクトを確認
- 一時停止している場合は、**Resume** をクリック
- プロジェクトが起動するまで数分待つ

---

### 問題3: DNS解決の問題

**対処方法：**
1. **DNS解決をテスト**（上記のStep 1を参照）
2. **別のDNSサーバーを使用**（例: Google DNS `8.8.8.8`）
3. **時間をおいて再試行**（一時的な問題の可能性）

---

### 問題4: ファイアウォール設定でIPアドレスが許可されていない

**対処方法：**
1. **現在のIPアドレスを確認**
2. **Supabase DashboardでIPアドレスを許可**
3. **接続を再試行**

---

## 📋 完全なトラブルシューティング手順

```powershell
# Step 1: DNS解決をテスト
nslookup db.mluvjdhqgfpcefsmvjae.supabase.co

# Step 2: 現在のIPアドレスを確認
Invoke-RestMethod -Uri "https://api.ipify.org"

# Step 3: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 4: 接続URLを設定
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 5: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

---

## 🔄 代替方法: Supabase Dashboardから接続文字列を直接コピー

**Supabase Dashboardから接続文字列を直接コピーして使用：**

1. **Settings** → **Database** → **Connection string** → **URI** → **Direct Connection**
2. **接続文字列をコピー**
3. **PowerShellで、パスワード部分を置き換え：**

```powershell
# Supabase Dashboardからコピーした接続文字列（パスワード部分を置き換え）
$SUPABASE_URL = "postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

---

**まずは、DNS解決をテストして、ホスト名が解決できるか確認してください！**

