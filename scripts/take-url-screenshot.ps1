# 検証環境URLの全画面スクリーンショットを取得するスクリプト
param(
    [string]$Url = "https://fleapay-lite-t1.onrender.com"
)

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputPath = "verification-url-screenshot-$timestamp.png"

Write-Host "========================================="
Write-Host "検証環境URL スクリーンショット取得"
Write-Host "========================================="
Write-Host "URL: $Url"
Write-Host ""

# ブラウザでURLを開く
Write-Host "ブラウザでURLを開いています..."
Start-Process $Url

# ページが読み込まれるまで待機
Write-Host "ページの読み込みを待機中（10秒）..."
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "========================================="
Write-Host "スクリーンショット取得方法"
Write-Host "========================================="
Write-Host ""
Write-Host "【推奨方法: ブラウザの開発者ツール】"
Write-Host "  1. ブラウザで F12 キーを押して開発者ツールを開く"
Write-Host "  2. Ctrl + Shift + P を押す"
Write-Host "  3. 'Capture full size screenshot' と入力して選択"
Write-Host "  4. ページ全体のスクリーンショットが自動的にダウンロードされます"
Write-Host ""
Write-Host "【代替方法: Windows標準機能】"
Write-Host "  1. Windows + Print Screen キーを押す"
Write-Host "  2. ピクチャ > スクリーンショット フォルダに保存されます"
Write-Host ""
Write-Host "【画面全体のスクリーンショットも取得しますか？】"
Write-Host "  （ブラウザウィンドウを含む画面全体をキャプチャします）"
$screenshotOption = Read-Host "取得する場合は Y を入力してください"

if ($screenshotOption -eq 'Y' -or $screenshotOption -eq 'y') {
    Write-Host ""
    Write-Host "画面全体のスクリーンショットを取得しています..."
    
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    $fileSize = (Get-Item $outputPath).Length / 1KB
    Write-Host ""
    Write-Host "✅ 画面全体のスクリーンショットを保存しました: $outputPath"
    Write-Host "   ファイルサイズ: $([math]::Round($fileSize, 2)) KB"
    Write-Host ""
    Write-Host "ファイルを開きますか？ (Y/N)"
    $openOption = Read-Host
    if ($openOption -eq 'Y' -or $openOption -eq 'y') {
        Start-Process $outputPath
    }
}

Write-Host ""
Write-Host "完了しました！"


