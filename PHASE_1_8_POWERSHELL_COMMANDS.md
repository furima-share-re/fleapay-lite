# Phase 1.8: PowerShellでのデータバックアップ取得コマンド

**作成日**: 2026-01-03  
**目的**: PowerShellで`pg_dump`を実行する正しい方法

---

## ⚠️ エラーの原因

PowerShellで`<HOST>`、`<USER>`、`<DATABASE>`をそのまま使うと、PowerShellが`<`をリダイレクション演算子として解釈してエラーになります。

**エラー例**:
```powershell
pg_dump -h <HOST> -U <USER> -d <DATABASE> > prod_backup.sql
# エラー: 演算子 '<' は、今後の使用のために予約されています
```

---

## ✅ 正しい実行方法

### 方法1: 接続文字列を使用（推奨）

**PowerShellでの実行**:
```powershell
# 1. 接続文字列を変数に設定
$DATABASE_URL = "postgres://user:password@host:5432/database"

# 2. pg_dumpを実行
pg_dump $DATABASE_URL -f prod_backup.sql
```

**実際の例**:
```powershell
# Render Dashboardで取得した接続文字列を使用
$DATABASE_URL = "postgres://fleapay_db_user:your_password@dpg-xxxxx-a.render.com:5432/fleapay_db"
pg_dump $DATABASE_URL -f prod_backup.sql
```

**メリット**:
- パスワードを接続文字列に含められる
- PowerShellのリダイレクション演算子の問題を回避できる

---

### 方法2: 個別パラメータを使用（パスワードを環境変数で設定）

**PowerShellでの実行**:
```powershell
# 1. パスワードを環境変数に設定
$env:PGPASSWORD = "your_password"

# 2. pg_dumpを実行
pg_dump -h dpg-xxxxx-a.render.com -U fleapay_db_user -d fleapay_db -f prod_backup.sql
```

**注意**: パスワードが環境変数に残るため、セキュリティに注意してください。

---

### 方法3: スクリプトを使用（最も簡単）

**既存のスクリプトを使用**:
```powershell
# プロジェクトルートで実行
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl "postgres://user:password@host:5432/database" `
  -OutputDir "./dump-prod"
```

**メリット**:
- エラーハンドリングが含まれている
- スキーマとデータを分けてダンプできる
- CSV形式でもエクスポート可能

---

## 📋 ステップバイステップ手順

### Step 1: Render Dashboardで接続情報を取得

1. Render Dashboardにログイン
2. `fleapay-lite-db` データベースを選択
3. **Info** タブを開く
4. **Internal Database URL** または **External Database URL** をコピー

**例**:
```
postgres://fleapay_db_user:password@dpg-xxxxx-a.render.com:5432/fleapay_db
```

---

### Step 2: PowerShellでバックアップを取得

**方法A: 接続文字列を使用（推奨）**
```powershell
# PowerShellで実行
$DATABASE_URL = "postgres://fleapay_db_user:password@dpg-xxxxx-a.render.com:5432/fleapay_db"
pg_dump $DATABASE_URL -f prod_backup.sql
```

**方法B: スクリプトを使用**
```powershell
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl "postgres://fleapay_db_user:password@dpg-xxxxx-a.render.com:5432/fleapay_db" `
  -OutputDir "./dump-prod"
```

---

### Step 3: バックアップファイルを確認

```powershell
# ファイルが作成されたか確認
Get-Item prod_backup.sql

# ファイルサイズを確認
(Get-Item prod_backup.sql).Length
```

---

## 🔍 トラブルシューティング

### 問題1: `pg_dump`コマンドが見つからない ⚠️ **現在のエラー**

**エラーメッセージ**:
```
pg_dump : 用語 'pg_dump' は、コマンドレット、関数、スクリプト ファイル、または操作可能なプログラムの名前として認識されません
```

**解決方法（3つの選択肢）**:

#### 方法A: Render Dashboardから直接バックアップを取得（最も簡単・推奨）⭐

**ローカル環境にPostgreSQLクライアントツールをインストールする必要がありません！**

1. **Render Dashboardにログイン**
2. `fleapay-lite-db` データベースを選択
3. **Backups** タブを開く
4. **Create Backup** ボタンをクリック
5. バックアップが完了したら（数分かかる場合があります）
6. **Download** ボタンをクリックしてバックアップファイルをダウンロード

**メリット**:
- ✅ ローカル環境にPostgreSQLクライアントツールをインストールする必要がない
- ✅ GUI操作で簡単
- ✅ データとスキーマの両方が含まれる
- ✅ 公式のバックアップ機能なので安全

**注意**: ダウンロードしたファイルは`.sql`形式または`.dump`形式です。Supabaseにインポートする前に、必要に応じて形式を変換する必要がある場合があります。

---

#### 方法B: PostgreSQLクライアントツールをインストール

1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/) からインストーラーをダウンロード
2. インストール時に **Command Line Tools** を選択
3. インストール後、PowerShellを再起動
4. 確認: `pg_dump --version`

**インストール確認**:
```powershell
# pg_dumpのバージョンを確認
pg_dump --version
```

**インストール後、再度実行**:
```powershell
$DATABASE_URL = "postgres://user:password@host:5432/database"
pg_dump $DATABASE_URL -f prod_backup.sql
```

---

#### 方法C: Supabase SQL Editorで直接スキーマを実行（スキーマのみ）

**データバックアップは不要で、スキーマのみ移行する場合**:

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. 本番環境のSupabaseプロジェクトを選択
3. **SQL Editor** を開く
4. `.ai/history/sql/supabase_schema.sql` ファイルを開いて内容をコピー
5. SQL Editorにペーストして実行

**注意**: この方法はスキーマのみです。データは別途移行する必要があります。

---

### 問題2: 接続エラーが発生する

**確認事項**:
- 接続文字列が正しいか
- パスワードが正しいか
- ネットワーク接続が正常か

**解決方法**:
```powershell
# 接続テスト
psql $DATABASE_URL -c "SELECT version();"
```

---

### 問題3: パスワードに特殊文字が含まれている

**解決方法**: URLエンコードが必要な場合があります

```powershell
# パスワードをURLエンコード
$password = [System.Web.HttpUtility]::UrlEncode("your_password")
$DATABASE_URL = "postgres://user:$password@host:5432/database"
```

---

## 📊 実行例

### 完全な例

```powershell
# 1. 接続文字列を設定（実際の値に置き換える）
$DATABASE_URL = "postgres://fleapay_db_user:your_password@dpg-xxxxx-a.render.com:5432/fleapay_db"

# 2. バックアップを取得
pg_dump $DATABASE_URL -f prod_backup.sql

# 3. バックアップファイルを確認
Get-Item prod_backup.sql | Select-Object Name, Length, LastWriteTime
```

---

## 🎯 推奨方法

**推奨**: **方法1（接続文字列を使用）** または **方法3（スクリプトを使用）**

理由:
- PowerShellのリダイレクション演算子の問題を回避できる
- パスワードを接続文字列に含められる
- エラーハンドリングが含まれている（スクリプトの場合）

---

**重要**: `<HOST>`、`<USER>`、`<DATABASE>`はプレースホルダーです。実際の値に置き換えてください。

