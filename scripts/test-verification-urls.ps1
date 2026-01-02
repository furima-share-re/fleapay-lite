# 検証環境URL動作確認スクリプト
# 使用方法: .\scripts\test-verification-urls.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://fleapay-lite-t1.onrender.com"
)

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  検証環境 プラン別動作確認URLテスト                      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "ベースURL: $BaseUrl" -ForegroundColor Yellow
Write-Host ""

$allPassed = $true
$testResults = @()

# Standardプラン
Write-Host "📋 Standardプラン (test-seller-standard)" -ForegroundColor Gray
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray

# API: 売上サマリー
Write-Host ""
Write-Host "1. API: 売上サマリー" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/seller/summary?s=test-seller-standard" -UseBasicParsing -TimeoutSec 10
    $data = $response.Content | ConvertFrom-Json
    
    $expectedPlan = "standard"
    $expectedSubscribed = $false
    $actualPlan = $data.planType
    $actualSubscribed = $data.isSubscribed
    
    if ($actualPlan -eq $expectedPlan -and $actualSubscribed -eq $expectedSubscribed) {
        Write-Host "   ✅ OK: planType=$actualPlan, isSubscribed=$actualSubscribed" -ForegroundColor Green
        $testResults += @{ Test = "Standard API"; Status = "PASS"; Details = "planType=$actualPlan, isSubscribed=$actualSubscribed" }
    } else {
        Write-Host "   ❌ NG: 期待 planType=$expectedPlan, isSubscribed=$expectedSubscribed" -ForegroundColor Red
        Write-Host "          実際 planType=$actualPlan, isSubscribed=$actualSubscribed" -ForegroundColor Red
        $testResults += @{ Test = "Standard API"; Status = "FAIL"; Details = "期待: planType=$expectedPlan, isSubscribed=$expectedSubscribed / 実際: planType=$actualPlan, isSubscribed=$actualSubscribed" }
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    $testResults += @{ Test = "Standard API"; Status = "ERROR"; Details = $_ }
    $allPassed = $false
}

# ダッシュボード
Write-Host ""
Write-Host "2. ダッシュボード" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/seller-dashboard.html?s=test-seller-standard" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ OK: ダッシュボードが表示される (Status: $($response.StatusCode))" -ForegroundColor Green
        $testResults += @{ Test = "Standard Dashboard"; Status = "PASS"; Details = "Status: $($response.StatusCode)" }
    } else {
        Write-Host "   ❌ NG: Status $($response.StatusCode)" -ForegroundColor Red
        $testResults += @{ Test = "Standard Dashboard"; Status = "FAIL"; Details = "Status: $($response.StatusCode)" }
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    $testResults += @{ Test = "Standard Dashboard"; Status = "ERROR"; Details = $_ }
    $allPassed = $false
}

# レジ画面（アクセス拒否が期待される）
Write-Host ""
Write-Host "3. レジ画面（アクセス拒否が期待される）" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/seller-purchase-standard.html?s=test-seller-standard" -UseBasicParsing -TimeoutSec 10
    $content = $response.Content
    
    if ($content -match "このレジ画面はご利用いただけません" -or $content -match "ご利用いただけません") {
        Write-Host "   ✅ OK: アクセス拒否メッセージが表示される" -ForegroundColor Green
        $testResults += @{ Test = "Standard Purchase (Deny)"; Status = "PASS"; Details = "アクセス拒否メッセージが表示される" }
    } else {
        Write-Host "   ⚠️ 警告: アクセス拒否メッセージが表示されていない可能性" -ForegroundColor Yellow
        Write-Host "           Status: $($response.StatusCode)" -ForegroundColor Yellow
        $testResults += @{ Test = "Standard Purchase (Deny)"; Status = "WARN"; Details = "アクセス拒否メッセージが確認できませんでした" }
    }
} catch {
    Write-Host "   ✅ OK: アクセス拒否（エラーが発生）" -ForegroundColor Green
    $testResults += @{ Test = "Standard Purchase (Deny)"; Status = "PASS"; Details = "アクセス拒否（エラー）" }
}

# Proプラン
Write-Host ""
Write-Host "[Pro] Proプラン (test-seller-pro)" -ForegroundColor Blue
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray

# API: 売上サマリー
Write-Host ""
Write-Host "1. API: 売上サマリー" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/seller/summary?s=test-seller-pro" -UseBasicParsing -TimeoutSec 10
    $data = $response.Content | ConvertFrom-Json
    
    $expectedPlan = "pro"
    $expectedSubscribed = $true
    $actualPlan = $data.planType
    $actualSubscribed = $data.isSubscribed
    
    if ($actualPlan -eq $expectedPlan -and $actualSubscribed -eq $expectedSubscribed) {
        Write-Host "   ✅ OK: planType=$actualPlan, isSubscribed=$actualSubscribed" -ForegroundColor Green
        $testResults += @{ Test = "Pro API"; Status = "PASS"; Details = "planType=$actualPlan, isSubscribed=$actualSubscribed" }
    } else {
        Write-Host "   ❌ NG: 期待 planType=$expectedPlan, isSubscribed=$expectedSubscribed" -ForegroundColor Red
        Write-Host "          実際 planType=$actualPlan, isSubscribed=$actualSubscribed" -ForegroundColor Red
        $testResults += @{ Test = "Pro API"; Status = "FAIL"; Details = "期待: planType=$expectedPlan, isSubscribed=$expectedSubscribed / 実際: planType=$actualPlan, isSubscribed=$actualSubscribed" }
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    $testResults += @{ Test = "Pro API"; Status = "ERROR"; Details = $_ }
    $allPassed = $false
}

# ダッシュボード
Write-Host ""
Write-Host "2. ダッシュボード" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/seller-dashboard.html?s=test-seller-pro" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ OK: ダッシュボードが表示される (Status: $($response.StatusCode))" -ForegroundColor Green
        $testResults += @{ Test = "Pro Dashboard"; Status = "PASS"; Details = "Status: $($response.StatusCode)" }
    } else {
        Write-Host "   ❌ NG: Status $($response.StatusCode)" -ForegroundColor Red
        $testResults += @{ Test = "Pro Dashboard"; Status = "FAIL"; Details = "Status: $($response.StatusCode)" }
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    $testResults += @{ Test = "Pro Dashboard"; Status = "ERROR"; Details = $_ }
    $allPassed = $false
}

# レジ画面（アクセス許可が期待される）
Write-Host ""
Write-Host "3. レジ画面（アクセス許可が期待される）" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/seller-purchase-standard.html?s=test-seller-pro" -UseBasicParsing -TimeoutSec 10
    $content = $response.Content
    
    if ($content -match "このレジ画面はご利用いただけません" -or $content -match "ご利用いただけません") {
        Write-Host "   ❌ NG: アクセス拒否メッセージが表示されている（期待: アクセス許可）" -ForegroundColor Red
        $testResults += @{ Test = "Pro Purchase (Allow)"; Status = "FAIL"; Details = "アクセス拒否メッセージが表示されている" }
        $allPassed = $false
    } elseif ($response.StatusCode -eq 200) {
        Write-Host "   ✅ OK: レジ画面が表示される (Status: $($response.StatusCode))" -ForegroundColor Green
        $testResults += @{ Test = "Pro Purchase (Allow)"; Status = "PASS"; Details = "Status: $($response.StatusCode)" }
    } else {
        Write-Host "   ⚠️ 警告: Status $($response.StatusCode)" -ForegroundColor Yellow
        $testResults += @{ Test = "Pro Purchase (Allow)"; Status = "WARN"; Details = "Status: $($response.StatusCode)" }
    }
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    $testResults += @{ Test = "Pro Purchase (Allow)"; Status = "ERROR"; Details = $_ }
    $allPassed = $false
}

# Kidsプラン
Write-Host ""
Write-Host "[Kids] Kidsプラン (test-seller-kids)" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray

# API: 売上サマリー
Write-Host ""
Write-Host "1. API: 売上サマリー" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/seller/summary?s=test-seller-kids" -UseBasicParsing -TimeoutSec 10
    $data = $response.Content | ConvertFrom-Json
    
    $expectedPlan = "kids"
    $expectedSubscribed = $true
    $actualPlan = $data.planType
    $actualSubscribed = $data.isSubscribed
    
    if ($actualPlan -eq $expectedPlan -and $actualSubscribed -eq $expectedSubscribed) {
        Write-Host "   ✅ OK: planType=$actualPlan, isSubscribed=$actualSubscribed" -ForegroundColor Green
        $testResults += @{ Test = "Kids API"; Status = "PASS"; Details = "planType=$actualPlan, isSubscribed=$actualSubscribed" }
    } else {
        Write-Host "   ❌ NG: 期待 planType=$expectedPlan, isSubscribed=$expectedSubscribed" -ForegroundColor Red
        Write-Host "          実際 planType=$actualPlan, isSubscribed=$actualSubscribed" -ForegroundColor Red
        $testResults += @{ Test = "Kids API"; Status = "FAIL"; Details = "期待: planType=$expectedPlan, isSubscribed=$expectedSubscribed / 実際: planType=$actualPlan, isSubscribed=$actualSubscribed" }
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    $testResults += @{ Test = "Kids API"; Status = "ERROR"; Details = $_ }
    $allPassed = $false
}

# ダッシュボード
Write-Host ""
Write-Host "2. ダッシュボード" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/seller-dashboard.html?s=test-seller-kids" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ OK: ダッシュボードが表示される (Status: $($response.StatusCode))" -ForegroundColor Green
        $testResults += @{ Test = "Kids Dashboard"; Status = "PASS"; Details = "Status: $($response.StatusCode)" }
    } else {
        Write-Host "   ❌ NG: Status $($response.StatusCode)" -ForegroundColor Red
        $testResults += @{ Test = "Kids Dashboard"; Status = "FAIL"; Details = "Status: $($response.StatusCode)" }
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    $testResults += @{ Test = "Kids Dashboard"; Status = "ERROR"; Details = $_ }
    $allPassed = $false
}

# レジ画面（アクセス許可が期待される）
Write-Host ""
Write-Host "3. レジ画面（アクセス許可が期待される）" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/seller-purchase-standard.html?s=test-seller-kids" -UseBasicParsing -TimeoutSec 10
    $content = $response.Content
    
    if ($content -match "このレジ画面はご利用いただけません" -or $content -match "ご利用いただけません") {
        Write-Host "   ❌ NG: アクセス拒否メッセージが表示されている（期待: アクセス許可）" -ForegroundColor Red
        $testResults += @{ Test = "Kids Purchase (Allow)"; Status = "FAIL"; Details = "アクセス拒否メッセージが表示されている" }
        $allPassed = $false
    } elseif ($response.StatusCode -eq 200) {
        Write-Host "   ✅ OK: レジ画面が表示される (Status: $($response.StatusCode))" -ForegroundColor Green
        $testResults += @{ Test = "Kids Purchase (Allow)"; Status = "PASS"; Details = "Status: $($response.StatusCode)" }
    } else {
        Write-Host "   ⚠️ 警告: Status $($response.StatusCode)" -ForegroundColor Yellow
        $testResults += @{ Test = "Kids Purchase (Allow)"; Status = "WARN"; Details = "Status: $($response.StatusCode)" }
    }
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    $testResults += @{ Test = "Kids Purchase (Allow)"; Status = "ERROR"; Details = $_ }
    $allPassed = $false
}

# 結果サマリー
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  テスト結果サマリー                                       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$errorCount = ($testResults | Where-Object { $_.Status -eq "ERROR" }).Count
$warnCount = ($testResults | Where-Object { $_.Status -eq "WARN" }).Count

Write-Host "✅ 成功: $passCount" -ForegroundColor Green
Write-Host "❌ 失敗: $failCount" -ForegroundColor Red
Write-Host "⚠️ 警告: $warnCount" -ForegroundColor Yellow
Write-Host "🔴 エラー: $errorCount" -ForegroundColor Red
Write-Host ""

Write-Host "詳細:" -ForegroundColor Yellow
foreach ($result in $testResults) {
    $statusColor = switch ($result.Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        default { "White" }
    }
    Write-Host "  [$($result.Status)] $($result.Test): $($result.Details)" -ForegroundColor $statusColor
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
if ($allPassed -and $failCount -eq 0 -and $errorCount -eq 0) {
    Write-Host "║  ✅ すべてのテストが正常に完了しました                ║" -ForegroundColor Green
} else {
    Write-Host "║  ⚠️ 一部のテストで問題が発生しました                  ║" -ForegroundColor Yellow
}
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

if (-not $allPassed -or $failCount -gt 0 -or $errorCount -gt 0) {
    exit 1
}

