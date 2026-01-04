# Phase 1.8: データ移行の実行（プロジェクトID確認済み）

**作成日**: 2026-01-04  
**プロジェクトID**: `mluvjdhqgfpcefsmvjae`（確認済み）  
**パスワード**: `.cx2eeaZJ55Qp@f`

---

## 🚀 実行コマンド（コピペで実行）

**以下のコマンドを順番に実行してください：**

```powershell
# Step 1: パスワードをURLエンコード（既に実行済みの場合はスキップ）
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Direct Connection URL設定（プロジェクトID: mluvjdhqgfpcefsmvjae）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

**接続テストが成功したら、データインポートを実行：**

```powershell
# Step 4: データインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ 接続エラーが発生する場合

### エラー1: ホスト名が解決できない

**考えられる原因：**
1. **DNS解決の問題**（一時的な問題の可能性）
2. **Supabaseのファイアウォール設定**（IPアドレスが許可されていない）
3. **プロジェクトが一時停止している**

**対処方法：**

#### 1. Supabase Dashboardでプロジェクトの状態を確認
- プロジェクトが**Active**状態か確認
- 一時停止している場合は、**Resume**をクリック

#### 2. ファイアウォール設定を確認
- **Settings** → **Database** → **Connection string** → **Network restrictions**
- 必要に応じて、現在のIPアドレスを許可

#### 3. 接続URLを再確認
- **Settings** → **Database** → **Connection string** → **URI** → **Direct Connection**
- 表示された接続文字列をコピーして、パスワード部分を置き換え

---

### エラー2: 認証エラー

**考えられる原因：**
1. **パスワードが間違っている**
2. **URLエンコードが正しくない**

**対処方法：**

#### 1. パスワードを確認
- Supabase Dashboard → **Settings** → **Database** → **Database password**
- パスワードが正しいか確認

#### 2. URLエンコードを手動で確認
```powershell
# URLエンコードされたパスワードを確認
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
Write-Host "エンコードされたパスワード: $encodedPassword"
```

**期待される出力：**
```
エンコードされたパスワード: %2Ecx2eeaZJ55Qp%40f
```

#### 3. 手動でエンコードしたURLを使用
```powershell
# 特殊文字のURLエンコード: . → %2E, @ → %40
$SUPABASE_URL = "postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"
```

---

## 📋 完全なコマンド（一度にコピペ）

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: Direct Connection URL設定（プロジェクトID: mluvjdhqgfpcefsmvjae）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら実行）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 🔍 トラブルシューティング

### 接続URLを確認する方法

**Supabase Dashboardから直接接続文字列を取得：**

1. **Settings** → **Database** を開く
2. **Connection string** セクションを確認
3. **URI** タブの **Direct Connection** を確認
4. 表示された接続文字列をコピー
5. パスワード部分（`[YOUR-PASSWORD]`）を実際のパスワードに置き換え

**例：**
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres
```

**パスワードを置き換え：**
```powershell
# URLエンコードされたパスワードを使用
$SUPABASE_URL = "postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"
```

---

**まずは、上記のコマンドを実行して、接続テストが成功するか確認してください！**

