# Phase 1.8: pg_restore 簡単ガイド

**作成日**: 2026-01-04  
**目的**: pg_restoreコマンドを簡単に理解して実行する

---

## 🤔 pg_restoreとは？

**pg_restore**は、PostgreSQLのバックアップファイル（`.dir.tar.gz`形式）をデータベースに復元するコマンドです。

**簡単に言うと**:
- バックアップファイル（`.dir.tar.gz`）を開いて
- Supabaseのデータベースにデータを入れる
- これだけ！

---

## ✅ 事前準備チェック

### Step 1: pg_restoreがインストールされているか確認

```powershell
pg_restore --version
```

**結果の見方**:
- ✅ `pg_restore (PostgreSQL) 15.x` と表示されればOK
- ❌ `コマンドが見つかりません` と表示されれば、インストールが必要

---

### Step 2: インストールが必要な場合

**PostgreSQLクライアントツールをインストール**:

1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/) にアクセス
2. **Download** をクリック
3. Windows用のインストーラーをダウンロード
4. インストーラーを実行
5. **インストールウィザードに従う**
   - **重要**: 「Command Line Tools」という明示的なオプションが表示されなくても問題ありません
   - PostgreSQLをインストールすると、**自動的にコマンドラインツールもインストールされます**
   - `bin`フォルダに`pg_restore.exe`がインストールされます
6. インストール完了後、**PowerShellを再起動**（重要！）

**確認**:
```powershell
pg_restore --version
```

---

## 🚀 実行手順（超簡単版）

### 全体の流れ

1. ファイルを展開（zipを解凍するようなもの）
2. Supabaseの接続情報を準備
3. コマンドを1つ実行するだけ！

---

### Step 1: ファイルを展開

```powershell
# プロジェクトルートで実行
cd tmp
tar -zxvf 2026-01-03T15_42Z.dir.tar.gz
```

**何をしているか**:
- `tar -zxvf` = zipファイルを解凍するようなもの
- `2026-01-03T15_42Z.dir.tar.gz` = バックアップファイル
- 展開すると、`2026-01-03T15:42Z/fleapay_prod_db/` というフォルダができます

**確認**:
```powershell
# 展開されたフォルダを確認
ls tmp/2026-01-03T15:42Z/fleapay_prod_db
```

`toc.dat` というファイルが見えればOK！

---

### Step 2: Supabaseの接続情報を取得

1. **Supabase Dashboardにログイン**
   - [Supabase Dashboard](https://app.supabase.com) にアクセス

2. **接続情報をコピー**
   - 左メニュー → **Settings** → **Database**
   - **Connection string** セクションを開く
   - **URI** をクリックしてコピー

**接続情報の形式**:
```
postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres
```

**重要**: `あなたのパスワード` の部分を、プロジェクト作成時に設定したパスワードに置き換えてください。

---

### Step 3: コマンドを1つ実行するだけ！

```powershell
# 1. 展開したディレクトリに移動
cd tmp/2026-01-03T15:42Z/fleapay_prod_db

# 2. Supabaseの接続情報を設定（あなたのパスワードに置き換えてください）
$SUPABASE_URL = "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres"

# 3. pg_restoreでインポート（これだけ！）
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

**コマンドの説明**:
- `pg_restore` = バックアップを復元するコマンド
- `--dbname=$SUPABASE_URL` = Supabaseの接続先を指定
- `--verbose` = 進捗を表示（何をしているか見える）
- `--clean` = 既存のデータを削除してから入れる（安全のため）
- `--no-owner` = 所有者情報を無視（Supabaseでは必要）
- `--no-privileges` = 権限情報を無視（Supabaseでは必要）
- `.` = 現在のフォルダ（展開したフォルダ）を指定

**実行時間**: 約1-3時間（データ量による）

**進捗の見方**:
```
pg_restore: creating TABLE "public.frames"
pg_restore: creating TABLE "public.sellers"
pg_restore: creating TABLE "public.orders"
...
```
このように、テーブルごとの進捗が表示されます。

---

## 📋 完全なコマンド例（コピペ用）

```powershell
# プロジェクトルートで実行

# Step 1: ファイルを展開
cd tmp
tar -zxvf 2026-01-03T15_42Z.dir.tar.gz

# Step 2: 展開したディレクトリに移動
cd 2026-01-03T15:42Z/fleapay_prod_db

# Step 3: Supabase接続情報を設定（パスワードを置き換えてください）
$SUPABASE_URL = "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres"

# Step 4: インポート実行
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

**注意**: 
- `あなたのパスワード` を実際のパスワードに置き換えてください
- `xxxxx` を実際のプロジェクト参照IDに置き換えてください

---

## ⚠️ よくあるエラーと対処法

### エラー1: `pg_restore: command not found`

**原因**: PostgreSQLクライアントツールがインストールされていない

**解決方法**:
1. PostgreSQLクライアントツールをインストール（上記参照）
2. PowerShellを再起動
3. 再度実行

---

### エラー2: `pg_restore: error: connection to database failed`

**原因**: 接続情報が間違っている

**確認事項**:
- ✅ パスワードが正しいか
- ✅ プロジェクト参照IDが正しいか
- ✅ 接続文字列の形式が正しいか

**解決方法**:
1. Supabase Dashboardで接続情報を再確認
2. パスワードを確認
3. 再度実行

---

### エラー3: `pg_restore: error: relation "xxx" does not exist`

**原因**: スキーマが作成されていない

**解決方法**:
1. Step 3（スキーマ移行）が完了しているか確認
2. Supabase SQL Editorでテーブル一覧を確認
3. 必要に応じて、Step 3を再実行

---

## ✅ 実行後の確認

### データが正しく入ったか確認

Supabase SQL Editorで以下を実行：

```sql
-- レコード数を確認
SELECT 
  'sellers' as table_name, COUNT(*) as count FROM sellers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'stripe_payments', COUNT(*) FROM stripe_payments;
```

**期待される結果**: 元のデータベースと同じレコード数が表示されること

---

## 🎯 まとめ

**pg_restoreは簡単です！**

1. **ファイルを展開**（zipを解凍するようなもの）
2. **接続情報を設定**（Supabase Dashboardからコピー）
3. **コマンドを1つ実行**（`pg_restore ...`）

**これだけ！**

**所要時間**: 約1-3時間（データ量による）
**難易度**: ⭐⭐☆☆☆（簡単）

---

## 📞 困ったときは

1. **エラーメッセージを確認**
2. **上記の「よくあるエラーと対処法」を確認**
3. **エラーメッセージを教えてください**（一緒に解決しましょう）

---

**準備ができたら、上記の手順に従って実行してください！**

