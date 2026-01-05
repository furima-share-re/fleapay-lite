# SQL条件の変更履歴をチェックするスクリプト
# 過去5日以内にSQLファイルのWHERE条件が変更されているかを確認

$sqlFile = "scripts/quick-check-sales-2024-12-27.sql"
$daysAgo = 5

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "SQL条件変更チェック" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "対象ファイル: $sqlFile" -ForegroundColor Yellow
Write-Host "期間: 過去 $daysAgo 日間" -ForegroundColor Yellow
Write-Host ""

# Git履歴を確認
Write-Host "Git履歴を確認中..." -ForegroundColor Yellow
$commits = git log --since="$daysAgo days ago" --format="%h|%ad|%s" --date=short --all -- "$sqlFile"

if ($commits) {
    Write-Host "`n✅ 過去 $daysAgo 日以内に変更が見つかりました:" -ForegroundColor Green
    Write-Host ""
    $commits | ForEach-Object {
        $parts = $_ -split '\|'
        $hash = $parts[0]
        $date = $parts[1]
        $message = $parts[2]
        Write-Host "  [$date] $hash - $message" -ForegroundColor White
    }
    
    Write-Host "`n詳細な変更内容を確認しますか？ (y/n)" -ForegroundColor Cyan
    $response = Read-Host
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "`n変更内容:" -ForegroundColor Yellow
        git log --since="$daysAgo days ago" -p --all -- "$sqlFile" | Select-Object -First 200
    }
} else {
    Write-Host "`n⚠️  過去 $daysAgo 日以内に変更は見つかりませんでした。" -ForegroundColor Yellow
}

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "現在のSQL条件を確認中..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# 現在のSQLファイルからWHERE条件を抽出
if (Test-Path $sqlFile) {
    $content = Get-Content $sqlFile -Raw
    
    Write-Host "`n【クエリ1: 12/27の総売上チェック】" -ForegroundColor Green
    if ($content -match '(?s)WHERE.*?(?=--|$)') {
        $where1 = $matches[0]
        Write-Host $where1.Trim() -ForegroundColor White
    }
    
    Write-Host "`n【クエリ2: 12月の全取引データ】" -ForegroundColor Green
    if ($content -match '(?s)WHERE o\.deleted_at.*?(?=ORDER BY|$)') {
        $where2 = $matches[0]
        Write-Host $where2.Trim() -ForegroundColor White
    }
    
    # 重要な条件を抽出
    Write-Host "`n【主要な条件】" -ForegroundColor Yellow
    $conditions = @()
    
    if ($content -match "o\.deleted_at IS NULL") {
        $conditions += "✓ deleted_at IS NULL (削除されていない注文のみ)"
    }
    
    if ($content -match "o\.created_at >= '(\d{4}-\d{2}-\d{2})") {
        $date = $matches[1]
        $conditions += "✓ created_at >= $date (日付範囲フィルタ)"
    }
    
    if ($content -match "om\.is_cash = true") {
        $conditions += "✓ is_cash = true (現金決済を含む)"
    }
    
    if ($content -match "sp\.status = 'succeeded'") {
        $conditions += "✓ stripe_payments.status = 'succeeded' (Stripe成功決済を含む)"
    }
    
    if ($conditions.Count -gt 0) {
        $conditions | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    }
} else {
    Write-Host "❌ ファイルが見つかりません: $sqlFile" -ForegroundColor Red
}

Write-Host "`n===========================================" -ForegroundColor Cyan

