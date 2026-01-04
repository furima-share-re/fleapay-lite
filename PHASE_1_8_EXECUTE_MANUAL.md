# Phase 1.8: データ移行の手動実行手順

**作成日**: 2026-01-04  
**プロジェクトID**: `mluvjdhqgfpcefsmvjae`  
**パスワード**: `.cx2eeaZJ55Qp@f`

---

## 🚀 実行手順（コピペで実行）

### Step 1: PATHを設定

**PowerShellで、以下のコマンドをコピー&ペーストして実行：**

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
```

---

### Step 2: 動作確認

```powershell
pg_restore --version
```

**期待される出力：** `pg_restore (PostgreSQL) 18.1`

---

### Step 3: ディレクトリ移動

```powershell
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"
```

---

### Step 4: 接続URL設定

**重要**: Connection Pooling URL（ポート6543）ではなく、**Direct Connection URL（ポート5432）**を使用してください。

**パスワードに特殊文字（`.`、`@`）が含まれているため、URLエンコードが必要です：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Direct Connection URL（ポート5432）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"
```

**または、手動でエンコード（`.` → `%2E`、`@` → `%40`）：**

```powershell
$SUPABASE_URL = "postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"
```

---

### Step 5: 接続テスト（オプション）

```powershell
psql $SUPABASE_URL -c "SELECT version();"
```

**期待される出力：** PostgreSQLのバージョン情報が表示される

---

### Step 6: データインポート実行

```powershell
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

**実行時間：約5-10分**

**実行中は、以下のようなメッセージが表示されます：**
```
処理中: SCHEMA public
処理中: TABLE sellers
処理中: TABLE orders
処理中: TABLE stripe_payments
...
```

---

## 📋 完全なコマンド（コピペで実行）

```powershell
# Step 1: PATH設定
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# Step 2: 動作確認
pg_restore --version

# Step 3: ディレクトリ移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# Step 4: 接続URL設定（URLエンコード）
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"

# Step 5: 接続テスト（オプション）
psql $SUPABASE_URL -c "SELECT version();"

# Step 6: データインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ 重要な注意事項

### Connection Pooling URL vs Direct Connection URL

**Connection Pooling URL（使用しない）:**
```
postgresql://postgres.mluvjdhqgfpcefsmvjae:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```
- ポート: `6543`
- ホスト: `pooler.supabase.com`
- **`pg_restore`では使用できない場合があります**

**Direct Connection URL（使用する）:**
```
postgresql://postgres:password@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres
```
- ポート: `5432`
- ホスト: `db.mluvjdhqgfpcefsmvjae.supabase.co`
- **`pg_restore`で使用可能**

---

### パスワードのURLエンコード

パスワードに特殊文字（`.`、`@`）が含まれているため、URLエンコードが必要です。

**特殊文字のURLエンコード：**
- `.` → `%2E`
- `@` → `%40`

**PowerShellで自動エンコード：**
```powershell
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode(".cx2eeaZJ55Qp@f")
```

---

## 🔄 または、スクリプトを実行する方法

**プロジェクトディレクトリで以下を実行：**

```powershell
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"
.\PHASE_1_8_EXECUTE_COMMAND.ps1
```

**スクリプトが自動的に：**
1. PATHを設定
2. 動作確認
3. ディレクトリ移動
4. 接続URL設定（URLエンコード含む）
5. 接続テスト
6. データインポート実行

---

**まずは、上記のコマンドを順番に実行してください！**

