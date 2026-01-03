# Phase 1.8: pg_restoreが反応しない場合の対処方法

**作成日**: 2026-01-04  
**問題**: `pg_restore`コマンドを実行したが、何も反応しない

---

## 🔍 考えられる原因

1. **コマンドが実行中**（データ量が多いため時間がかかる）
2. **接続エラー**（エラーメッセージが表示されていない）
3. **コマンドがハングしている**
4. **コマンドの最後に`.`が欠けている**（PowerShellが入力を待っている）

---

## ✅ 対処方法

### Step 1: コマンドを中断して状況を確認

**Ctrl + C**を押してコマンドを中断してください。

---

### Step 2: 接続テスト

**Supabaseへの接続が正常か確認**:

```powershell
# 接続テスト（psqlコマンドを使用）
psql $SUPABASE_URL -c "SELECT version();"
```

**もし`psql`コマンドが見つからない場合**:
- PostgreSQLの`bin`ディレクトリに`psql.exe`があるか確認
- または、接続情報が正しいか確認

---

### Step 3: 接続情報の確認

**Supabase接続情報が正しいか確認**:

1. **接続文字列の形式を確認**
   - 形式: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`
   - **注意**: Connection Pooling URL（`pooler.supabase.com`）ではなく、**Direct Connection URL**（`db.xxxxx.supabase.co`）を使用してください

2. **Supabase Dashboardで確認**
   - Supabase Dashboard → **Settings** → **Database** → **Connection string**
   - **URI**（Direct Connection）をコピー
   - **注意**: Connection Pooling URL（`pooler.supabase.com:6543`）は`pg_restore`では使用できない場合があります

---

### Step 4: 正しい接続情報で再実行

**Direct Connection URLを使用**:

```powershell
# 1. 展開したディレクトリに移動
cd tmp\2026-01-03T15:42Z\fleapay_prod_db

# 2. Supabase接続情報を設定（Direct Connection URLを使用）
# Connection Pooling URLではなく、Direct Connection URLを使用してください
$SUPABASE_URL = "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"

# 3. 接続テスト
psql $SUPABASE_URL -c "SELECT version();"

# 4. pg_restoreでインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ 重要な注意事項

### Connection Pooling URL vs Direct Connection URL

**Connection Pooling URL**（使用しない）:
```
postgresql://postgres.xxxxx:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```
- ポート: `6543`
- ホスト: `pooler.supabase.com`
- **`pg_restore`では使用できない場合があります**

**Direct Connection URL**（使用する）:
```
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```
- ポート: `5432`
- ホスト: `db.xxxxx.supabase.co`
- **`pg_restore`で使用可能**

---

## 🔄 代替方法: 接続情報をファイルに保存

**接続情報を`.pgpass`ファイルに保存**（パスワードを毎回入力する必要がない）:

```powershell
# .pgpassファイルを作成（ホームディレクトリに）
$pgpassPath = "$env:USERPROFILE\.pgpass"
"db.xxxxx.supabase.co:5432:postgres:postgres:password" | Out-File -FilePath $pgpassPath -Encoding ASCII -NoNewline
icacls $pgpassPath /inheritance:r
icacls $pgpassPath /grant:r "$env:USERNAME:R"
```

**その後、接続情報からパスワードを省略**:
```powershell
$SUPABASE_URL = "postgresql://postgres@db.xxxxx.supabase.co:5432/postgres"
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

## 📋 トラブルシューティング手順

### 1. コマンドを中断

**Ctrl + C**を押してコマンドを中断

---

### 2. 接続情報を確認

Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI**（Direct Connection）を確認

---

### 3. 接続テストを実行

```powershell
# 接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

**期待される出力**: PostgreSQLのバージョン情報が表示される

---

### 4. 正しい接続情報で再実行

Direct Connection URLを使用して再実行

---

## 🎯 推奨手順

1. **Ctrl + C**でコマンドを中断
2. **Supabase DashboardでDirect Connection URLを確認**
3. **接続テストを実行**
4. **正しい接続情報で`pg_restore`を再実行**

---

**まずは、Ctrl + Cでコマンドを中断して、接続情報を確認してください。**

