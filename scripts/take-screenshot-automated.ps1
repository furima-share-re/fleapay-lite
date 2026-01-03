# 検証環境ページのスクリーンショットを自動取得するPowerShellスクリプト
# Playwrightを使用してブラウザでページを開き、スクリーンショットを取得

$url = "https://fleapay-lite-t1.onrender.com"
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputPath = "verification-screenshot-$timestamp.png"

Write-Host "========================================="
Write-Host "検証環境ページ スクリーンショット取得"
Write-Host "========================================="
Write-Host "URL: $url"
Write-Host ""

# Playwrightがインストールされているか確認
try {
    $playwrightInstalled = Get-Command playwright -ErrorAction SilentlyContinue
    if (-not $playwrightInstalled) {
        Write-Host "Playwrightがインストールされていません。"
        Write-Host "以下のコマンドでインストールできます:"
        Write-Host "  npm install -g playwright"
        Write-Host "  playwright install chromium"
        Write-Host ""
        Write-Host "または、手動でブラウザを開いてスクリーンショットを取得してください。"
        Write-Host "ブラウザを開いています..."
        Start-Process $url
        exit 0
    }
} catch {
    Write-Host "Playwrightの確認中にエラーが発生しました。"
    Write-Host "ブラウザを開いています..."
    Start-Process $url
    exit 0
}

# Node.jsスクリプトでPlaywrightを使用してスクリーンショットを取得
$nodeScript = @"
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('$url', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '$outputPath', fullPage: true });
  await browser.close();
  console.log('スクリーンショットを保存しました: $outputPath');
})();
"@

$nodeScript | Out-File -FilePath "temp-screenshot.js" -Encoding UTF8

Write-Host "スクリーンショットを取得しています..."
node temp-screenshot.js

if (Test-Path $outputPath) {
    Write-Host ""
    Write-Host "✅ スクリーンショットを保存しました: $outputPath"
    $fileSize = (Get-Item $outputPath).Length / 1KB
    Write-Host "   ファイルサイズ: $([math]::Round($fileSize, 2)) KB"
} else {
    Write-Host ""
    Write-Host "❌ スクリーンショットの取得に失敗しました。"
    Write-Host "   ブラウザを開いています。手動でスクリーンショットを取得してください。"
    Start-Process $url
}

# 一時ファイルを削除
if (Test-Path "temp-screenshot.js") {
    Remove-Item "temp-screenshot.js"
}

