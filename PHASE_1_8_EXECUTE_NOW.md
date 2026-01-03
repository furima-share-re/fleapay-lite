# Phase 1.8: データ移行の実行手順（今すぐ実行）

**作成日**: 2026-01-04  
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

### Step 3: 本番環境のSupabaseプロジェクトIDを確認

**Supabase Dashboardで確認：**

1. Supabase Dashboardにログイン
2. **本番環境のプロジェクト**を選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションを確認
5. **URI** タブの **Direct Connection** を確認
   - 形式: `postgresql://postgres:password@db.XXXXX.supabase.co:5432/postgres`
   - `XXXXX`の部分が**プロジェクトID**です

**または、Project URLから確認：**
- DashboardのURL: `https://supabase.com/dashboard/project/XXXXX/...`
- `XXXXX`の部分が**プロジェクトID**です

---

### Step 4: 接続URLを設定

**本番環境のプロジェクトIDを`YOUR_PROJECT_ID`に置き換えて実行：**

```powershell
$SUPABASE_URL = "postgresql://postgres:.cx2eeaZJ55Qp@f@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
```

**例（プロジェクトIDが`abcdefghijklmnop`の場合）：**
```powershell
$SUPABASE_URL = "postgresql://postgres:.cx2eeaZJ55Qp@f@db.abcdefghijklmnop.supabase.co:5432/postgres"
```

**重要**: 
- パスワードに特殊文字（`.`、`@`）が含まれているため、URLエンコードが必要な場合があります
- もし接続エラーが発生したら、パスワードをURLエンコードしてください

---

### Step 5: ディレクトリ移動

```powershell
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"
```

---

### Step 6: 接続テスト（オプション）

```powershell
psql $SUPABASE_URL -c "SELECT version();"
```

**期待される出力：** PostgreSQLのバージョン情報が表示される

---

### Step 7: データインポート実行

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

## ⚠️ パスワードのURLエンコード

パスワードに特殊文字（`.`、`@`）が含まれているため、接続エラーが発生する場合は、URLエンコードが必要です。

**特殊文字のURLエンコード：**
- `.` → `%2E`
- `@` → `%40`

**URLエンコード後の例：**
```powershell
$SUPABASE_URL = "postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
```

**または、PowerShellで自動エンコード：**
```powershell
$password = ".cx2eeaZJ55Qp@f"
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
```

---

## 🔍 本番環境のプロジェクトIDを確認する方法

### 方法1: Supabase Dashboardから確認

1. Supabase Dashboardにログイン
2. **本番環境のプロジェクト**を選択
3. **Settings** → **General** を開く
4. **Reference ID** を確認（これがプロジェクトIDです）

### 方法2: Connection stringから確認

1. **Settings** → **Database** を開く
2. **Connection string** セクションを確認
3. **URI** タブの **Direct Connection** を確認
   - `db.XXXXX.supabase.co` の `XXXXX` がプロジェクトIDです

---

## 📋 完全なコマンド（プロジェクトIDを置き換えて実行）

```powershell
# Step 1: PATH設定
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# Step 2: 動作確認
pg_restore --version

# Step 3: ディレクトリ移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# Step 4: 接続URL設定（YOUR_PROJECT_IDを置き換え）
$SUPABASE_URL = "postgresql://postgres:.cx2eeaZJ55Qp@f@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"

# Step 5: 接続テスト（オプション）
psql $SUPABASE_URL -c "SELECT version();"

# Step 6: データインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

**まずは、本番環境のSupabaseプロジェクトIDを確認して、Step 4の接続URLを設定してください！**

