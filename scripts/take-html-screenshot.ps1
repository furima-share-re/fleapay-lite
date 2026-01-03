# HTMLファイルの全画面スクリーンショットを取得するスクリプト
# Playwrightを使用してローカルHTMLファイルを開き、スクリーンショットを取得

param(
    [string]$HtmlPath = "C:\Users\yasho\OneDrive\デスクトップ\staging-verification-urls.html"
)

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputPath = "staging-verification-urls-screenshot-$timestamp.png"

Write-Host "========================================="
Write-Host "HTMLファイル スクリーンショット取得"
Write-Host "========================================="
Write-Host "ファイル: $HtmlPath"
Write-Host ""

# ファイルの存在確認
if (-not (Test-Path $HtmlPath)) {
    Write-Host "❌ ファイルが見つかりません: $HtmlPath"
    exit 1
}

# Node.jsスクリプトでPlaywrightを使用してスクリーンショットを取得
$nodeScript = @"
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const htmlPath = 'file:///' + '$HtmlPath'.replace(/\\/g, '/');
  const outputPath = '$outputPath';
  
  console.log('ブラウザを起動しています...');
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();
  
  // ビューポートサイズを設定（大きな画面サイズ）
  await page.setViewportSize({ width: 1920, height: 1080 });

  console.log('HTMLファイルを読み込んでいます...');
  await page.goto(htmlPath, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  // ページが完全にレンダリングされるまで待機
  await page.waitForTimeout(3000);

  console.log('スクリーンショットを取得しています...');
  await page.screenshot({
    path: outputPath,
    fullPage: true,
  });

  const stats = fs.statSync(outputPath);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  console.log('');
  console.log('✅ スクリーンショットを保存しました！');
  console.log('   ファイル: ' + outputPath);
  console.log('   サイズ: ' + fileSizeKB + ' KB');

  await browser.close();
})();
"@

$nodeScript | Out-File -FilePath "temp-html-screenshot.js" -Encoding UTF8

Write-Host "スクリーンショットを取得しています..."
try {
    node temp-html-screenshot.js
    
    if (Test-Path $outputPath) {
        Write-Host ""
        Write-Host "✅ スクリーンショットを保存しました: $outputPath"
        $fileSize = (Get-Item $outputPath).Length / 1KB
        Write-Host "   ファイルサイズ: $([math]::Round($fileSize, 2)) KB"
        Write-Host ""
        Write-Host "ファイルを開きますか？ (Y/N)"
        $response = Read-Host
        if ($response -eq 'Y' -or $response -eq 'y') {
            Start-Process $outputPath
        }
    } else {
        Write-Host ""
        Write-Host "❌ スクリーンショットの取得に失敗しました。"
        Write-Host "   Playwrightがインストールされていない可能性があります。"
        Write-Host "   以下のコマンドでインストールしてください:"
        Write-Host "     npm install playwright"
        Write-Host "     npx playwright install chromium"
    }
} catch {
    Write-Host ""
    Write-Host "❌ エラーが発生しました: $_"
    Write-Host "   Node.jsがインストールされているか確認してください。"
}

# 一時ファイルを削除
if (Test-Path "temp-html-screenshot.js") {
    Remove-Item "temp-html-screenshot.js"
}

