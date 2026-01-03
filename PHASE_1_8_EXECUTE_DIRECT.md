# Phase 1.8: データ移行の直接実行コマンド

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

### Step 4: 接続URL設定（URLエンコード）

**パスワードに特殊文字（`.`、`@`）が含まれているため、URLエンコードが必要です：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Direct Connection URL（ポート5432）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"
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

## 📋 完全なコマンド（一度にコピペ）

**以下のコマンドを順番に実行してください：**

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

## ⚠️ トラブルシューティング

### エラー1: URLエンコードが失敗する場合

**手動でエンコードしたURLを使用：**

```powershell
# 特殊文字のURLエンコード: . → %2E, @ → %40
$SUPABASE_URL = "postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"
```

---

### エラー2: 接続エラーが発生する場合

**確認事項：**
1. **Direct Connection URLを使用しているか**（`db.mluvjdhqgfpcefsmvjae.supabase.co:5432`）
2. **パスワードが正しいか**
3. **Supabaseのファイアウォール設定**（必要に応じて、IPアドレスを許可）

---

### エラー3: コマンドが反応しない場合

**対処：**
1. **Ctrl + C** で中断
2. **Direct Connection URLを使用しているか確認**
3. 接続テストを実行：
   ```powershell
   psql $SUPABASE_URL -c "SELECT version();"
   ```

---

**まずは、上記のコマンドを順番に実行してください！**

