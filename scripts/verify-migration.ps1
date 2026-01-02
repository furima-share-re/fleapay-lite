# データ移行の整合性をチェックするスクリプト（PowerShell版）
# 使用方法: .\scripts\verify-migration.ps1 -SourceUrl "..." -TargetUrl "..."

param(
    [Parameter(Mandatory=$true)]
    [string]$SourceUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$TargetUrl
)

Write-Host "🔍 データ移行の整合性をチェックします..." -ForegroundColor Cyan

$tables = @(
    "sellers",
    "orders",
    "stripe_payments",
    "frames",
    "order_items",
    "images",
    "qr_sessions",
    "buyer_attributes",
    "order_metadata",
    "kids_achievements"
)

Write-Host "`nテーブルごとのレコード数を比較します...`n" -ForegroundColor Yellow

$mismatches = @()

foreach ($table in $tables) {
    try {
        # ソース（Render）のレコード数
        $sourceQuery = "SELECT COUNT(*) FROM $table"
        $sourceResult = psql $SourceUrl -t -c $sourceQuery 2>&1
        $sourceCount = ($sourceResult | Where-Object { $_ -match '\d+' }) -replace '\s', ''
        
        # ターゲット（Supabase）のレコード数
        $targetQuery = "SELECT COUNT(*) FROM $table"
        $targetResult = psql $TargetUrl -t -c $targetQuery 2>&1
        $targetCount = ($targetResult | Where-Object { $_ -match '\d+' }) -replace '\s', ''
        
        if ($sourceCount -eq $targetCount) {
            Write-Host "  ✅ $table : $sourceCount 件 (一致)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $table : ソース=$sourceCount 件, ターゲット=$targetCount 件 (不一致)" -ForegroundColor Red
            $mismatches += $table
        }
    } catch {
        Write-Host "  ⚠️  $table : チェック中にエラーが発生しました: $_" -ForegroundColor Yellow
    }
}

Write-Host "`n" + "="*50 -ForegroundColor Cyan

if ($mismatches.Count -eq 0) {
    Write-Host "✅ すべてのテーブルのレコード数が一致しました！" -ForegroundColor Green
} else {
    Write-Host "❌ 不一致が見つかりました ($($mismatches.Count) テーブル)" -ForegroundColor Red
    Write-Host "`n不一致のあったテーブル:" -ForegroundColor Yellow
    foreach ($table in $mismatches) {
        Write-Host "  - $table" -ForegroundColor White
    }
    Write-Host "`n詳細な調査が必要です。" -ForegroundColor Yellow
}

Write-Host "`nサンプルデータの確認を実行しますか？ (y/n)" -ForegroundColor Cyan
$response = Read-Host
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "`n最新の注文を確認中..." -ForegroundColor Yellow
    
    $sampleQuery = @"
SELECT id, seller_id, amount, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
"@
    
    Write-Host "`n[ソース: Render]" -ForegroundColor Cyan
    psql $SourceUrl -c $sampleQuery
    
    Write-Host "`n[ターゲット: Supabase]" -ForegroundColor Cyan
    psql $TargetUrl -c $sampleQuery
}

