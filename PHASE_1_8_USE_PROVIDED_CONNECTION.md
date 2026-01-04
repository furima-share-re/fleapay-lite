# Phase 1.8: 提供された接続文字列を使用

**作成日**: 2026-01-04  
**接続文字列**: `postgresql://postgres.mluvjdhqgfpcefsmvjae:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres`  
**パスワード**: `.cx2eeaZJ55Qp@f`

---

## ⚠️ 重要な注意事項

**提供された接続文字列はConnection Pooling URL（ポート6543）です。**

**`pg_restore`では通常、Direct Connection URL（ポート5432）を使用しますが、まずは提供された接続文字列で試してみます。**

**もし接続エラーが発生した場合は、Direct Connection URLを使用してください。**

---

## 🚀 実行コマンド（提供された接続文字列を使用）

**以下のコマンドを順番に実行してください：**

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: 提供された接続文字列を使用（Connection Pooling URL）
$SUPABASE_URL = "postgresql://postgres.mluvjdhqgfpcefsmvjae:$encodedPassword@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

**接続テストが成功したら、データインポートを実行：**

```powershell
# Step 4: データインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 🔄 もし接続エラーが発生した場合: Direct Connection URLを使用

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

# データインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全なコマンド（提供された接続文字列を使用）

```powershell
# Step 1: パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Step 2: 提供された接続文字列を使用（Connection Pooling URL）
$SUPABASE_URL = "postgresql://postgres.mluvjdhqgfpcefsmvjae:$encodedPassword@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

# Step 3: 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# Step 4: データインポート（接続テストが成功したら）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 🔍 Connection Pooling URL vs Direct Connection URL

### Connection Pooling URL（提供された接続文字列）

```
postgresql://postgres.mluvjdhqgfpcefsmvjae:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**特徴：**
- ポート: `6543`
- ホスト: `pooler.supabase.com`
- ユーザー名: `postgres.mluvjdhqgfpcefsmvjae`
- **`pg_restore`では使用できない場合があります**

---

### Direct Connection URL（推奨）

```
postgresql://postgres:password@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres
```

**特徴：**
- ポート: `5432`
- ホスト: `db.mluvjdhqgfpcefsmvjae.supabase.co`
- ユーザー名: `postgres`
- **`pg_restore`で使用可能**

---

## ⚠️ トラブルシューティング

### エラー1: Connection Pooling URLで接続エラーが発生

**対処方法：**
- Direct Connection URLを使用してください
- Supabase DashboardからDirect Connection URLを取得してください

---

### エラー2: パスワード認証に失敗

**対処方法：**
1. **パスワードが正しいか確認**
2. **URLエンコードが正しいか確認**
3. **手動でエンコードしたURLを使用**

---

**まずは、提供された接続文字列を使用して接続テストを実行してください！**

