# Phase 1.8: SQLファイル分割スクリプトの修正

**作成日**: 2026-01-04  
**問題**: ファイルパスが正しくない  
**解決方法**: 絶対パスまたは現在のディレクトリのパスを使用

---

## ✅ 解決方法: 正しいファイルパスを使用

**PowerShellで、以下のコマンドを実行：**

```powershell
# Step 1: 現在のディレクトリを確認
Get-Location

# Step 2: backup.sqlファイルが存在するか確認
Test-Path "backup.sql"

# Step 3: backup.sqlファイルのフルパスを取得
$inputFile = (Resolve-Path "backup.sql").Path

# Step 4: SQLファイルをファイルサイズで分割（10MBごと）
$chunkSizeMB = 10
$chunkSizeBytes = $chunkSizeMB * 1MB
$outputDir = "split_sql"
$chunkNumber = 1

# 出力ディレクトリを作成
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$reader = [System.IO.StreamReader]::new($inputFile)
$currentChunk = New-Object System.Collections.ArrayList
$currentSize = 0

while ($null -ne ($line = $reader.ReadLine())) {
    $lineSize = [System.Text.Encoding]::UTF8.GetByteCount($line) + 2
    
    if ($currentSize + $lineSize -gt $chunkSizeBytes -and $currentChunk.Count -gt 0) {
        $outputFile = Join-Path $outputDir "backup_part_$chunkNumber.sql"
        $currentChunk | Out-File -FilePath $outputFile -Encoding UTF8
        Write-Host "作成: $outputFile ($([math]::Round($currentSize/1MB, 2)) MB)"
        $currentChunk.Clear()
        $currentSize = 0
        $chunkNumber++
    }
    
    $currentChunk.Add($line) | Out-Null
    $currentSize += $lineSize
}

if ($currentChunk.Count -gt 0) {
    $outputFile = Join-Path $outputDir "backup_part_$chunkNumber.sql"
    $currentChunk | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "作成: $outputFile ($([math]::Round($currentSize/1MB, 2)) MB)"
}

$reader.Close()
Write-Host "`n分割完了: $chunkNumber 個のファイルが作成されました"
```

---

## 📋 完全な手順（コピペで実行）

```powershell
# Step 1: backup.sqlファイルのフルパスを取得
$inputFile = (Resolve-Path "backup.sql").Path
Write-Host "入力ファイル: $inputFile"

# Step 2: SQLファイルをファイルサイズで分割（10MBごと）
$chunkSizeMB = 10
$chunkSizeBytes = $chunkSizeMB * 1MB
$outputDir = "split_sql"
$chunkNumber = 1

# 出力ディレクトリを作成
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$reader = [System.IO.StreamReader]::new($inputFile)
$currentChunk = New-Object System.Collections.ArrayList
$currentSize = 0

while ($null -ne ($line = $reader.ReadLine())) {
    $lineSize = [System.Text.Encoding]::UTF8.GetByteCount($line) + 2
    
    if ($currentSize + $lineSize -gt $chunkSizeBytes -and $currentChunk.Count -gt 0) {
        $outputFile = Join-Path $outputDir "backup_part_$chunkNumber.sql"
        $currentChunk | Out-File -FilePath $outputFile -Encoding UTF8
        Write-Host "作成: $outputFile ($([math]::Round($currentSize/1MB, 2)) MB)"
        $currentChunk.Clear()
        $currentSize = 0
        $chunkNumber++
    }
    
    $currentChunk.Add($line) | Out-Null
    $currentSize += $lineSize
}

if ($currentChunk.Count -gt 0) {
    $outputFile = Join-Path $outputDir "backup_part_$chunkNumber.sql"
    $currentChunk | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "作成: $outputFile ($([math]::Round($currentSize/1MB, 2)) MB)"
}

$reader.Close()
Write-Host "`n分割完了: $chunkNumber 個のファイルが作成されました"
```

---

## ⚠️ トラブルシューティング

### エラー1: ファイルが見つからない

**対処方法：**
- `backup.sql`ファイルが現在のディレクトリにあるか確認
- 絶対パスを使用：
  ```powershell
  $inputFile = "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db\backup.sql"
  ```

---

### エラー2: ファイルが存在しない

**対処方法：**
- `backup.sql`ファイルが存在するか確認：
  ```powershell
  Test-Path "backup.sql"
  Get-Item backup.sql
  ```

---

**まずは、backup.sqlファイルのフルパスを取得して、分割スクリプトを実行してください！**

