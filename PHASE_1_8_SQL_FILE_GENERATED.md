# Phase 1.8: SQLファイル生成完了

**作成日**: 2026-01-04  
**状況**: SQLファイルが正常に生成されました  
**ファイル**: `backup.sql`

---

## ✅ 次のステップ

### Step 1: SQLファイルのサイズを確認

**PowerShellで、以下のコマンドを実行：**

```powershell
# SQLファイルのサイズを確認
Get-Item backup.sql | Select-Object Name, Length, @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB, 2)}}

# SQLファイルの最初の数行を確認
Get-Content backup.sql -Head 50
```

---

### Step 2: Supabase DashboardのSQL Editorで実行

1. **Supabase Dashboard**にログイン
2. **プロジェクト `snowkercpcuixnwxchkc`** を選択
3. **SQL Editor**を開く
4. **SQLファイルの内容をコピー**
5. **SQL Editorに貼り付けて実行**

---

## ⚠️ ファイルサイズの制限

**Supabase SQL Editorの制限：**
- 推奨: 10MB以下
- 最大: 50MB程度（ブラウザの制限）

**SQLファイルのサイズが10MBを超える場合：**
- 複数のSQLファイルに分割する必要があります
- または、別の方法を検討してください

---

## ✅ ファイルサイズが10MBを超える場合の対処方法

### 方法1: 複数のSQLファイルに分割

**PowerShellで、以下のコマンドを実行：**

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

Write-Host "分割完了: $chunkNumber 個のファイルが作成されました"
```

---

### 方法2: テーブルごとに分割

**各テーブルごとにSQLファイルを作成：**

```powershell
# テーブルごとにSQLファイルを作成
# 注意: この方法は手動で実行する必要があります
```

---

## 📋 完全な手順

```powershell
# Step 1: SQLファイルのサイズを確認
Get-Item backup.sql | Select-Object Name, Length, @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB, 2)}}

# Step 2: SQLファイルの最初の数行を確認
Get-Content backup.sql -Head 50

# Step 3: ファイルサイズが10MB以下の場合、Supabase SQL Editorで実行
# ファイルサイズが10MBを超える場合、複数のファイルに分割
```

---

## 🎯 推奨手順

1. **SQLファイルのサイズを確認**
2. **ファイルサイズが10MB以下の場合、Supabase SQL Editorで実行**
3. **ファイルサイズが10MBを超える場合、複数のファイルに分割**
4. **各ファイルを順番にSupabase SQL Editorで実行**

---

**まずは、SQLファイルのサイズを確認してください！**

