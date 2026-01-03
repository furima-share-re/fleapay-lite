# Phase 1.8: PostgreSQLコマンドのクイックスタート

**作成日**: 2026-01-04  
**目的**: PostgreSQLコマンドをすぐに使えるようにする

---

## 🚀 すぐに使う方法

### 方法1: スクリプトを実行（推奨）

```powershell
# プロジェクトディレクトリで実行
.\PHASE_1_8_SETUP_PG_PATH.ps1
```

**これで、PostgreSQLコマンドが使用可能になります！**

---

### 方法2: 手動でPATHを設定

```powershell
# PATHに追加（現在のセッションのみ）
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# 確認
pg_restore --version
```

**期待される出力**: `pg_restore (PostgreSQL) 18.1`

---

## 📋 完全な実行手順

### Step 1: PATHを設定

```powershell
# プロジェクトディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# PATHに追加
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# 確認
pg_restore --version
```

---

### Step 2: 展開したディレクトリに移動

```powershell
cd tmp\2026-01-03T15:42Z\fleapay_prod_db
```

---

### Step 3: Supabase接続情報を設定

**重要**: Direct Connection URLを使用してください（Connection Pooling URLではありません）

```powershell
# Supabase Dashboard → Settings → Database → Connection string → URI (Direct Connection)
$SUPABASE_URL = "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
```

**Connection Pooling URL（使用しない）**:
```
postgresql://postgres.xxxxx:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**Direct Connection URL（使用する）**:
```
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

---

### Step 4: 接続テスト（オプション）

```powershell
# psqlで接続テスト
psql $SUPABASE_URL -c "SELECT version();"
```

**期待される出力**: PostgreSQLのバージョン情報が表示される

---

### Step 5: pg_restoreでインポート

```powershell
# データインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

**実行時間**: 約5-10分（データ量による）

**期待される出力**: 
- `処理中: SCHEMA public`
- `処理中: TABLE sellers`
- `処理中: TABLE orders`
- など、各テーブルの処理状況が表示されます

---

## ⚠️ よくある問題

### 問題1: `pg_restore : 用語 'pg_restore' は、コマンドレット...として認識されません`

**解決方法**:
```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
```

---

### 問題2: 接続エラー

**確認事項**:
1. **Direct Connection URLを使用しているか**（`db.xxxxx.supabase.co:5432`）
2. **パスワードが正しいか**
3. **Supabaseのファイアウォール設定**（必要に応じて、IPアドレスを許可）

---

### 問題3: コマンドが反応しない

**解決方法**:
1. **Ctrl + C**で中断
2. **Direct Connection URLを使用しているか確認**
3. **接続テストを実行**

---

## 🎯 永続的に設定する方法

**Windows 10/11の場合**:

1. **Windowsキー + X** → **システム** → **詳細情報**
2. **システムの詳細設定** → **環境変数**
3. **システム環境変数**の`Path`を選択 → **編集**
4. **新規**をクリック
5. `C:\Program Files\PostgreSQL\18\bin`を追加
6. **OK**をクリックして保存
7. **PowerShellを再起動**

---

**まずは、`.\PHASE_1_8_SETUP_PG_PATH.ps1`を実行して、PostgreSQLコマンドが使用可能か確認してください！**

