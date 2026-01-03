# PowerShellでスクリーンショットを取得するスクリプト
# HTMLファイルを開いてスクリーンショットを取得

param(
    [string]$HtmlPath = "public\staging-verification-urls-local.html"
)

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputPath = "staging-verification-urls-screenshot-$timestamp.png"

Write-Host "========================================="
Write-Host "HTMLファイル スクリーンショット取得"
Write-Host "========================================="

# HTMLファイルのフルパスを取得
$fullHtmlPath = Join-Path (Get-Location) $HtmlPath
if (-not (Test-Path $fullHtmlPath)) {
    Write-Host "❌ ファイルが見つかりません: $fullHtmlPath"
    exit 1
}

Write-Host "ファイル: $fullHtmlPath"
Write-Host ""

# HTMLファイルをブラウザで開く
Write-Host "ブラウザでHTMLファイルを開いています..."
Start-Process $fullHtmlPath

# ブラウザが開くまで少し待機
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "ブラウザでページが開かれました。"
Write-Host "以下の手順でスクリーンショットを取得してください:"
Write-Host ""
Write-Host "【方法1: ブラウザの開発者ツール（推奨）】"
Write-Host "  1. ブラウザで F12 キーを押す"
Write-Host "  2. Ctrl + Shift + P を押す"
Write-Host "  3. 'Capture full size screenshot' と入力して選択"
Write-Host "  4. スクリーンショットが自動的にダウンロードされます"
Write-Host ""
Write-Host "【方法2: Windows標準機能】"
Write-Host "  1. Windows + Print Screen キーを押す"
Write-Host "  2. ピクチャ > スクリーンショット フォルダに保存されます"
Write-Host ""
Write-Host "【方法3: Snipping Tool】"
Write-Host "  1. Windows + Shift + S キーを押す"
Write-Host "  2. 範囲を選択してスクリーンショットを取得"
Write-Host ""

# .NETの機能を使って画面全体のスクリーンショットを取得（オプション）
$screenshotOption = Read-Host "画面全体のスクリーンショットも取得しますか？ (Y/N)"
if ($screenshotOption -eq 'Y' -or $screenshotOption -eq 'y') {
    Write-Host ""
    Write-Host "画面全体のスクリーンショットを取得しています..."
    
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $fullOutputPath = Join-Path (Get-Location) $outputPath
    $bitmap.Save($fullOutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "✅ 画面全体のスクリーンショットを保存しました: $fullOutputPath"
    $fileSize = (Get-Item $fullOutputPath).Length / 1KB
    Write-Host "   ファイルサイズ: $([math]::Round($fileSize, 2)) KB"
    Write-Host ""
    Write-Host "ファイルを開きますか？ (Y/N)"
    $openOption = Read-Host
    if ($openOption -eq 'Y' -or $openOption -eq 'y') {
        Start-Process $fullOutputPath
    }
}

