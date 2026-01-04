# Phase 1.8: PostgreSQLコマンドが動かない場合の対処方法

**作成日**: 2026-01-04  
**問題**: PostgreSQLコマンド（`pg_restore`、`psql`など）が動作しない

---

## 🔍 問題の原因

PostgreSQLはインストールされているが、**環境変数PATHに`bin`ディレクトリが追加されていない**可能性が高いです。

---

## ✅ 解決方法

### 方法1: 現在のセッションで一時的に追加（すぐに使える）

```powershell
# PATHに追加（現在のセッションのみ）
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# 確認
pg_restore --version
```

**期待される出力**: `pg_restore (PostgreSQL) 18.x`

**注意**: PowerShellを閉じると、この設定は消えます。

---

### 方法2: 永続的に追加（推奨）

**Windows 10/11の場合**:

1. **Windowsキー + X** → **システム** → **詳細情報**
2. **システムの詳細設定** → **環境変数**
3. **システム環境変数**の`Path`を選択 → **編集**
4. **新規**をクリック
5. 以下のパスを追加:
   ```
   C:\Program Files\PostgreSQL\18\bin
   ```
6. **OK**をクリックして保存
7. **PowerShellを再起動**

**確認**:
```powershell
pg_restore --version
```

---

## 🔍 インストールパスの確認

### PostgreSQLのインストールパスを確認

```powershell
# PostgreSQLのインストールパスを確認
Get-ChildItem "C:\Program Files\PostgreSQL" -Directory
```

**期待される出力**: `18`などのバージョン番号のフォルダが表示されます

---

### pg_restore.exeの場所を確認

```powershell
# PostgreSQL 18の場合
Test-Path "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"
```

**期待される出力**: `True`

---

## 📋 完全な設定手順

### Step 1: PostgreSQLのインストールパスを確認

```powershell
# PostgreSQLのインストールパスを確認
Get-ChildItem "C:\Program Files\PostgreSQL" -Directory
```

---

### Step 2: PATHに一時的に追加

```powershell
# 現在のセッションのみ（PowerShellを閉じると消える）
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# 確認
pg_restore --version
```

---

### Step 3: 動作確認

```powershell
# pg_restoreのバージョンを確認
pg_restore --version

# psqlのバージョンを確認（オプション）
psql --version
```

**期待される出力**:
- `pg_restore (PostgreSQL) 18.x`
- `psql (PostgreSQL) 18.x`

---

### Step 4: 永続的に設定（推奨）

**Windows 10/11の場合**:

1. **Windowsキー + X** → **システム** → **詳細情報**
2. **システムの詳細設定** → **環境変数**
3. **システム環境変数**の`Path`を選択 → **編集**
4. **新規**をクリック
5. `C:\Program Files\PostgreSQL\18\bin`を追加
6. **OK**をクリックして保存
7. **PowerShellを再起動**

---

## 🎯 次のステップ

PATHに追加できたら：

1. **プロジェクトディレクトリに移動**
   ```powershell
   cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"
   ```

2. **展開したディレクトリに移動**
   ```powershell
   cd tmp\2026-01-03T15:42Z\fleapay_prod_db
   ```

3. **Supabase接続情報を設定**
   ```powershell
   $SUPABASE_URL = "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
   ```

4. **pg_restoreでインポート**
   ```powershell
   pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
   ```

---

## ⚠️ よくある問題

### 問題1: 複数のバージョンがインストールされている

**解決方法**:
- 最新バージョンの`bin`ディレクトリをPATHに追加
- または、使用したいバージョンの`bin`ディレクトリをPATHに追加

---

### 問題2: 32bit版と64bit版が混在している

**解決方法**:
- 64bit版の`bin`ディレクトリをPATHに追加（推奨）
- 通常は`C:\Program Files\PostgreSQL`（64bit版）

---

### 問題3: インストールパスが異なる

**解決方法**:
- カスタムインストールパスを選択した場合、そのパスの`bin`ディレクトリをPATHに追加

---

**まずは、上記のコマンドでPATHに追加して、`pg_restore --version`で確認してください！**

