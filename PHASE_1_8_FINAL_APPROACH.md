# Phase 1.8: 最終的なアプローチ

**作成日**: 2026-01-04  
**問題**: IPv6接続が失敗、ホスト名が解決できない  
**解決方法**: Supabase Dashboardから接続文字列を直接コピー

---

## ✅ 最も確実な方法: Supabase Dashboardから接続文字列を直接コピー

**Supabase Dashboardから接続文字列を直接コピーして使用：**

### Step 1: Supabase Dashboardで接続文字列を取得

1. **Supabase Dashboard**にログイン
2. **プロジェクト `mluvjdhqgfpcefsmvjae`** を選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションを確認
5. **URI** タブの **Direct Connection** を確認
6. **接続文字列をコピー**
   - 形式: `postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres`

---

### Step 2: PowerShellでパスワード部分を置き換え

**コピーした接続文字列の`[YOUR-PASSWORD]`部分を、URLエンコードされたパスワードに置き換え：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Supabase Dashboardからコピーした接続文字列（パスワード部分を置き換え）
# 例: postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres
# ↓
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 🔄 代替方法: 接続文字列を手動で構築

**もしSupabase Dashboardから接続文字列を取得できない場合：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# 手動で接続文字列を構築
$projectId = "mluvjdhqgfpcefsmvjae"
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.$projectId.supabase.co:5432/postgres"

# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

**もし接続エラーが発生した場合：**
- Supabase Dashboardで接続文字列を確認してください
- プロジェクトがActive状態か確認してください
- ファイアウォール設定を確認してください

---

## 📋 完全なコマンド（推奨）

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Supabase Dashboardからコピーした接続文字列を使用
# 注意: [YOUR-PASSWORD]部分を$encodedPasswordに置き換え
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: ホスト名が解決できない

**対処方法：**
- Supabase Dashboardから接続文字列を直接コピーしてください
- プロジェクトがActive状態か確認してください

---

### エラー2: パスワード認証に失敗

**対処方法：**
1. **パスワードが正しいか確認**
   - Supabase Dashboard → **Settings** → **Database** → **Database password**
2. **URLエンコードが正しいか確認**
   - 手動でエンコードしたURLを使用

---

### エラー3: ネットワーク接続エラー

**対処方法：**
- IPv6接続が利用できない可能性があります
- Supabase Dashboardから接続文字列を直接コピーしてください
- ファイアウォール設定を確認してください

---

## 🎯 推奨手順

1. **Supabase Dashboardから接続文字列を直接コピー**
2. **PowerShellで、パスワード部分を置き換え**
3. **接続テストを実行**
4. **成功したら、データインポートを実行**

**これが最も確実な方法です！**

---

**まずは、Supabase Dashboardから接続文字列を直接コピーして使用してください！**

