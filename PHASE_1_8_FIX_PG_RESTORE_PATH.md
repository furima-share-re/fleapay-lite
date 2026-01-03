# Phase 1.8: pg_restoreコマンドが見つからない場合の対処方法

**作成日**: 2026-01-04  
**問題**: `pg_restore --version`を実行すると「コマンドが見つかりません」というエラーが発生

---

## 🔍 問題の原因

PostgreSQLはインストールされているが、**環境変数PATHに`bin`ディレクトリが追加されていない**可能性が高いです。

---

## ✅ 解決方法

### Step 1: PostgreSQLのインストールパスを確認

```powershell
# PostgreSQLのインストールパスを確認
Get-ChildItem "C:\Program Files\PostgreSQL" -Directory
```

**期待される出力**: `15`、`16`などのバージョン番号のフォルダが表示されます

---

### Step 2: pg_restore.exeの場所を確認

```powershell
# 例: PostgreSQL 15の場合
Test-Path "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe"
```

**期待される出力**: `True`

---

### Step 3: PATHに一時的に追加（すぐに使えるように）

```powershell
# 現在のセッションのみ（PowerShellを閉じると消える）
# PostgreSQL 15の場合
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"

# PostgreSQL 16の場合
# $env:Path += ";C:\Program Files\PostgreSQL\16\bin"

# 確認
pg_restore --version
```

**期待される出力**: `pg_restore (PostgreSQL) 15.x` または `pg_restore (PostgreSQL) 16.x`

---

### Step 4: PATHに永続的に追加（推奨）

**Windows 10/11の場合**:

1. **Windowsキー + X** → **システム** → **詳細情報**
2. **システムの詳細設定** → **環境変数**
3. **システム環境変数**の`Path`を選択 → **編集**
4. **新規**をクリック
5. PostgreSQLの`bin`ディレクトリを追加:
   - `C:\Program Files\PostgreSQL\15\bin`（PostgreSQL 15の場合）
   - `C:\Program Files\PostgreSQL\16\bin`（PostgreSQL 16の場合）
6. **OK**をクリックして保存
7. **PowerShellを再起動**

**確認**:
```powershell
pg_restore --version
```

---

## 🔍 自動検出スクリプト

以下のスクリプトで自動的にPostgreSQLのインストールパスを見つけて、PATHに追加できます：

```powershell
# PostgreSQLのインストールパスを自動検出
$pgPaths = @("C:\Program Files\PostgreSQL", "C:\Program Files (x86)\PostgreSQL")
$foundPath = $null

foreach ($basePath in $pgPaths) {
    if (Test-Path $basePath) {
        $versions = Get-ChildItem $basePath -Directory
        foreach ($version in $versions) {
            $binPath = Join-Path $version.FullName "bin"
            if (Test-Path $binPath) {
                $pgRestore = Join-Path $binPath "pg_restore.exe"
                if (Test-Path $pgRestore) {
                    Write-Host "Found PostgreSQL at: $binPath"
                    $foundPath = $binPath
                    break
                }
            }
        }
        if ($foundPath) { break }
    }
}

if ($foundPath) {
    # PATHに追加（現在のセッションのみ）
    $env:Path += ";$foundPath"
    Write-Host "Added to PATH: $foundPath"
    Write-Host "Testing pg_restore..."
    pg_restore --version
} else {
    Write-Host "PostgreSQL not found. Please install PostgreSQL first."
}
```

---

## 📋 手動で確認する方法

### 方法1: エクスプローラーで確認

1. **エクスプローラー**を開く
2. `C:\Program Files\PostgreSQL`に移動
3. バージョンフォルダ（例: `15`、`16`）を開く
4. `bin`フォルダを開く
5. `pg_restore.exe`があるか確認

### 方法2: Windowsの検索で確認

1. Windowsキーを押す
2. 「PostgreSQL」と検索
3. インストールフォルダを確認

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

## 🎯 次のステップ

PATHに追加できたら：

1. **PowerShellを再起動**
2. **`pg_restore --version`で確認**
3. **Step 4: データ移行を実行**

---

**準備ができたら、上記の手順に従ってPATHに追加してください。**

