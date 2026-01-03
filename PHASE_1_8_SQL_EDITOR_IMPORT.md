# Phase 1.8: Supabase Dashboard SQL Editorを使用したデータインポート

**作成日**: 2026-01-04  
**本番環境のプロジェクトID**: `snowkercpcuixnwxchkc`  
**バックアップファイル**: `tmp/2026-01-03T15_42Z.dir.tar.gz`（展開済み）

---

## ✅ 手順

### Step 1: バックアップファイルをSQL形式に変換

**`.dir.tar.gz`ファイルは`pg_dump`のカスタム形式です。SQL形式に変換する必要があります。**

**PowerShellで、以下のコマンドを実行：**

```powershell
# バックアップディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# PostgreSQLのPATHを設定（まだ設定していない場合）
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# pg_restoreを使用してSQL形式に変換
# 注意: 接続先は指定せず、SQLファイルとして出力
pg_restore --file=backup.sql --format=directory --verbose .
```

**または、接続文字列を使用：**

```powershell
# パスワードをURLエンコード
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# 接続文字列を作成
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres"

# pg_restoreを使用してSQL形式に変換（接続先は指定せず、SQLファイルとして出力）
pg_restore --file=backup.sql --format=directory --verbose .
```

---

### Step 2: SQLファイルを確認

**生成されたSQLファイルを確認：**

```powershell
# SQLファイルのサイズを確認
Get-Item backup.sql | Select-Object Name, Length

# SQLファイルの最初の数行を確認
Get-Content backup.sql -Head 50
```

---

### Step 3: Supabase DashboardのSQL Editorで実行

1. **Supabase Dashboard**にログイン
2. **プロジェクト `snowkercpcuixnwxchkc`** を選択
3. **SQL Editor**を開く
4. **SQLファイルの内容をコピー**
5. **SQL Editorに貼り付けて実行**

**注意**: 
- SQLファイルが大きい場合（10MB以上）、複数回に分けて実行する必要がある場合があります
- Supabase SQL Editorの制限を確認してください

---

## ⚠️ 重要な注意事項

### ファイルサイズの制限

**Supabase SQL Editorの制限：**
- 推奨: 10MB以下
- 最大: 50MB程度（ブラウザの制限）

**バックアップファイルのサイズ：**
- 圧縮: 65.85MB
- 展開: 87.2MB

**このサイズでは、SQL Editorで直接インポートするのは困難です。**

---

## ✅ 代替方法: 複数のSQLファイルに分割

**大きなSQLファイルを複数の小さなファイルに分割：**

```powershell
# SQLファイルを複数のファイルに分割（例: 1000行ごと）
$lines = Get-Content backup.sql
$chunkSize = 1000
$chunkNumber = 1

for ($i = 0; $i -lt $lines.Count; $i += $chunkSize) {
    $chunk = $lines[$i..([Math]::Min($i + $chunkSize - 1, $lines.Count - 1))]
    $chunk | Out-File -FilePath "backup_part_$chunkNumber.sql" -Encoding UTF8
    $chunkNumber++
}
```

---

## ✅ 代替方法: pg_restoreで直接インポート（推奨）

**DNS解決の問題を回避するため、別の方法を検討：**

1. **別のマシンまたはクラウド環境を使用**
2. **ネットワーク設定を変更**
3. **Supabase CLIを使用**（DNS解決の問題が解決した場合）

---

## 📋 完全な手順

```powershell
# Step 1: バックアップディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# Step 2: PostgreSQLのPATHを設定
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# Step 3: pg_restoreを使用してSQL形式に変換
pg_restore --file=backup.sql --format=directory --verbose .

# Step 4: SQLファイルのサイズを確認
Get-Item backup.sql | Select-Object Name, Length
```

---

## 🎯 推奨手順

1. **SQLファイルを生成**
2. **ファイルサイズを確認**
3. **ファイルサイズが10MB以下の場合、SQL Editorで実行**
4. **ファイルサイズが10MBを超える場合、複数のファイルに分割**
5. **または、別の方法を検討**

---

**まずは、SQLファイルを生成して、ファイルサイズを確認してください！**

