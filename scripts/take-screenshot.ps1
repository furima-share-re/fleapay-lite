# 検証環境ページのスクリーンショット取得スクリプト
$url = "https://fleapay-lite-t1.onrender.com"
$outputPath = "verification-screenshot-$(Get-Date -Format 'yyyyMMdd-HHmmss').png"

Write-Host "検証環境ページを開いています: $url"
Start-Process $url

Write-Host "ブラウザでページが開かれました。"
Write-Host "手動でスクリーンショットを取得してください。"
Write-Host ""
Write-Host "または、以下のコマンドでSeleniumを使用して自動取得できます:"
Write-Host "  pip install selenium"
Write-Host "  python scripts/take-screenshot-selenium.py"

