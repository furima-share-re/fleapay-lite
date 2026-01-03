# Phase 1.8: SQL Editorでクエリが大きすぎるエラー

**作成日**: 2026-01-04  
**エラー**: "Query is too large to be run via the SQL Editor"  
**状況**: 分割したファイルでも大きすぎる可能性があります

---

## ⚠️ 問題の原因

**Supabase SQL Editorの制限：**
- 推奨: 10MB以下
- 実際の制限: より小さい可能性があります（5MB程度）

**分割したファイルのサイズ：**
- 最大: 10MB
- 平均: 約9.5MB

**このサイズでも大きすぎる可能性があります。**

---

## ✅ 解決方法1: さらに小さく分割（5MBごと）

**SQLファイルを5MBごとに分割：**

```powershell
# Step 1: backup.sqlファイルのフルパスを取得
$inputFile = (Resolve-Path "backup.sql").Path
Write-Host "入力ファイル: $inputFile"

# Step 2: SQLファイルをファイルサイズで分割（5MBごと）
$chunkSizeMB = 5
$chunkSizeBytes = $chunkSizeMB * 1MB
$outputDir = "split_sql_5mb"
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

## ✅ 解決方法2: データベースに直接接続（推奨）

**Supabase Dashboardのエラーメッセージに従って、データベースに直接接続：**

1. **Supabase Dashboard**で「connecting to your database directly」リンクをクリック
2. **接続情報を確認**
3. **`psql`または`pg_restore`を使用して直接接続**

**ただし、現在の環境ではDNS解決の問題があるため、別の環境を使用する必要があります。**

---

## ✅ 解決方法3: 別の環境を使用（最も確実）

**別のマシンまたはクラウド環境を使用：**

- **GitHub Actions**（無料、簡単にセットアップ可能）
- **AWS EC2**（有料、より柔軟）
- **別のWindows/Mac/Linuxマシン**

**これらの環境では、DNS解決の問題が発生しない可能性が高いです。**

---

## 📋 推奨手順

1. **まず、5MBごとに再分割を試す**
2. **それでもエラーが発生する場合、別の環境を使用**
3. **または、GitHub Actionsを使用してデータをインポート**

---

## 🎯 次のステップ

**まずは、5MBごとに再分割して、Supabase SQL Editorで再試行してください。**

**それでもエラーが発生する場合、別の環境を使用することを検討してください。**

---

**まずは、5MBごとに再分割して、Supabase SQL Editorで再試行してください！**

