# Phase 1.8: SQLファイルの分割

**作成日**: 2026-01-04  
**SQLファイルサイズ**: 87.2MB  
**問題**: Supabase SQL Editorの制限（10-50MB）を超えている  
**解決方法**: 複数のSQLファイルに分割

---

## ✅ 解決方法: SQLファイルを分割

**SQLファイルを複数の小さなファイルに分割：**

### 方法1: 行数で分割（簡単だが、SQL文が途中で切れる可能性あり）

```powershell
# SQLファイルを複数のファイルに分割（例: 5000行ごと）
$lines = Get-Content backup.sql
$chunkSize = 5000
$chunkNumber = 1
$outputDir = "split_sql"

# 出力ディレクトリを作成
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

for ($i = 0; $i -lt $lines.Count; $i += $chunkSize) {
    $chunk = $lines[$i..([Math]::Min($i + $chunkSize - 1, $lines.Count - 1))]
    $outputFile = Join-Path $outputDir "backup_part_$chunkNumber.sql"
    $chunk | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "作成: $outputFile ($($chunk.Count) 行)"
    $chunkNumber++
}

Write-Host "`n分割完了: $($chunkNumber - 1) 個のファイルが作成されました"
```

---

### 方法2: ファイルサイズで分割（推奨）

```powershell
# SQLファイルをファイルサイズで分割（例: 10MBごと）
$inputFile = "backup.sql"
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
    $lineSize = [System.Text.Encoding]::UTF8.GetByteCount($line) + 2  # +2 for CRLF
    
    if ($currentSize + $lineSize -gt $chunkSizeBytes -and $currentChunk.Count -gt 0) {
        # 現在のチャンクをファイルに書き込む
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

# 最後のチャンクを書き込む
if ($currentChunk.Count -gt 0) {
    $outputFile = Join-Path $outputDir "backup_part_$chunkNumber.sql"
    $currentChunk | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "作成: $outputFile ($([math]::Round($currentSize/1MB, 2)) MB)"
}

$reader.Close()
Write-Host "`n分割完了: $chunkNumber 個のファイルが作成されました"
```

---

## 📋 完全な手順（推奨）

```powershell
# Step 1: SQLファイルをファイルサイズで分割（10MBごと）
$inputFile = "backup.sql"
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

## 🎯 次のステップ

1. **SQLファイルを分割**
2. **各ファイルのサイズを確認**
3. **Supabase SQL Editorで順番に実行**

---

**まずは、SQLファイルを分割してください！**

