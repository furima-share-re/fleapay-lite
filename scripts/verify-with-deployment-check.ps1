# デプロイ状態確認 + 動作確認スクリプト
# 使用方法: .\scripts\verify-with-deployment-check.ps1 -BaseUrl "https://fleapay-lite-t1.onrender.com"

param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://fleapay-lite-t1.onrender.com"
)

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  デプロイ状態確認 + 動作確認スクリプト                    ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: デプロイ状態確認
Write-Host "📋 Step 1: デプロイ状態確認" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray
& "$PSScriptRoot\check-deployment-status.ps1" -BaseUrl $BaseUrl

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ デプロイ状態確認に失敗しました。動作確認をスキップします。" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Step 2: 動作確認" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray

# Step 2: 基本動作確認
Write-Host ""
Write-Host "🔍 基本動作確認を開始します..." -ForegroundColor Cyan

# 2.1 ヘルスチェック
Write-Host ""
Write-Host "1. ヘルスチェック (/api/ping)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/ping" -UseBasicParsing -TimeoutSec 10
    $data = $response.Content | ConvertFrom-Json
    Write-Host "   ✅ ステータス: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ バージョン: $($data.version)" -ForegroundColor Green
    Write-Host "   ✅ Prisma: $($data.prisma)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    exit 1
}

# 2.2 APIエンドポイント確認
Write-Host ""
Write-Host "2. APIエンドポイント確認" -ForegroundColor Yellow

$endpoints = @(
    @{ Name = "売上サマリー (Standard)"; Url = "$BaseUrl/api/seller/summary?s=test-seller-standard"; Expected = "planType: standard" },
    @{ Name = "売上サマリー (Pro)"; Url = "$BaseUrl/api/seller/summary?s=test-seller-pro"; Expected = "planType: pro" },
    @{ Name = "売上サマリー (Kids)"; Url = "$BaseUrl/api/seller/summary?s=test-seller-kids"; Expected = "planType: kids" }
)

$allPassed = $true
foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -UseBasicParsing -TimeoutSec 10
        $data = $response.Content | ConvertFrom-Json
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ $($endpoint.Name): OK (planType: $($data.planType))" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ $($endpoint.Name): Status $($response.StatusCode)" -ForegroundColor Yellow
            $allPassed = $false
        }
    } catch {
        Write-Host "   ❌ $($endpoint.Name): エラー - $_" -ForegroundColor Red
        $allPassed = $false
    }
}

# 2.3 画面確認（HTMLの存在確認）
Write-Host ""
Write-Host "3. 画面確認（HTMLの存在確認）" -ForegroundColor Yellow

$pages = @(
    @{ Name = "セラーダッシュボード"; Url = "$BaseUrl/seller-dashboard?s=test-seller-pro" },
    @{ Name = "レジ画面"; Url = "$BaseUrl/seller-purchase-standard.html?s=test-seller-pro" }
)

foreach ($page in $pages) {
    try {
        $response = Invoke-WebRequest -Uri $page.Url -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ $($page.Name): OK (Status: $($response.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ $($page.Name): Status $($response.StatusCode)" -ForegroundColor Yellow
            $allPassed = $false
        }
    } catch {
        Write-Host "   ❌ $($page.Name): エラー - $_" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "║  ✅ すべての動作確認が正常に完了しました                ║" -ForegroundColor Green
} else {
    Write-Host "║  ⚠️ 一部の動作確認で問題が発生しました                  ║" -ForegroundColor Yellow
}
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

if (-not $allPassed) {
    exit 1
}

