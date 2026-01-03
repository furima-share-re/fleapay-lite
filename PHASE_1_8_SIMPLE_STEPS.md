# Phase 1.8: データ移行の簡単な手順

**作成日**: 2026-01-04  
**目的**: コピペで実行できる簡単な手順

---

## 📋 手順（コピペで実行）

### Step 1: PATHを設定（必ず最初に実行）

**PowerShellで、以下のコマンドをコピー&ペーストして実行してください：**

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
```

**何も表示されなければOKです。**

---

### Step 2: 動作確認

**以下のコマンドを実行してください：**

```powershell
pg_restore --version
```

**期待される出力：**
```
pg_restore (PostgreSQL) 18.1
```

**これが表示されれば、準備完了です！**

**もし「認識されません」と表示されたら：**
- PostgreSQLがインストールされているか確認
- インストールパスが `C:\Program Files\PostgreSQL\18\bin` か確認

---

### Step 3: Supabase接続情報を設定

**Supabase Dashboardで接続情報を取得：**

1. Supabase Dashboardを開く
2. **Settings** → **Database** を開く
3. **Connection string** セクションを開く
4. **URI** の **Direct Connection** をコピー
   - 形式: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`
   - **重要**: `pooler.supabase.com` ではなく、`db.xxxxx.supabase.co` を使用

**PowerShellで、以下のコマンドを実行（`YOUR_PASSWORD`と`YOUR_HOST`を置き換えてください）：**

```powershell
$SUPABASE_URL = "postgresql://postgres:YOUR_PASSWORD@db.YOUR_HOST.supabase.co:5432/postgres"
```

**例：**
```powershell
$SUPABASE_URL = "postgresql://postgres:mypassword123@db.abcdefghijklmnop.supabase.co:5432/postgres"
```

---

### Step 4: データインポート実行

**現在のディレクトリが `tmp\2026-01-03T15_42Z\fleapay_prod_db` であることを確認：**

```powershell
Get-Location
```

**もし違うディレクトリにいる場合は、移動：**

```powershell
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"
```

**以下のコマンドを実行：**

```powershell
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

**実行時間：約5-10分**

**実行中は、以下のようなメッセージが表示されます：**
```
処理中: SCHEMA public
処理中: TABLE sellers
処理中: TABLE orders
...
```

---

## ⚠️ よくあるエラーと対処

### エラー1: `pg_restore : 用語 'pg_restore' は、コマンドレット...として認識されません`

**対処：**
```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
```
を実行してから、再度 `pg_restore --version` を実行

---

### エラー2: 接続エラー

**確認事項：**
1. **Direct Connection URLを使用しているか**（`db.xxxxx.supabase.co:5432`）
2. **パスワードが正しいか**
3. **Supabaseのファイアウォール設定**（必要に応じて、IPアドレスを許可）

---

### エラー3: コマンドが反応しない

**対処：**
1. **Ctrl + C** で中断
2. **Direct Connection URLを使用しているか確認**
3. 接続テストを実行：
   ```powershell
   psql $SUPABASE_URL -c "SELECT version();"
   ```

---

## 🎯 まとめ

**実行するコマンド（順番に）：**

```powershell
# 1. PATH設定
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# 2. 動作確認
pg_restore --version

# 3. ディレクトリ移動（必要に応じて）
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# 4. Supabase接続情報設定（YOUR_PASSWORDとYOUR_HOSTを置き換え）
$SUPABASE_URL = "postgresql://postgres:YOUR_PASSWORD@db.YOUR_HOST.supabase.co:5432/postgres"

# 5. データインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

---

**まずは、Step 1とStep 2を実行して、`pg_restore --version`が動作するか確認してください！**

