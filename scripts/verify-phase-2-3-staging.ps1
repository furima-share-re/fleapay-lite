# Phase 2.3 検証環境動作確認スクリプト
# 使用方法: .\scripts\verify-phase-2-3-staging.ps1

param(
    [string]$BaseUrl = "https://fleapay-lite-t1.onrender.com"
)

$ErrorActionPreference = "Continue"
$results = @()

function Test-Url {
    param(
        [string]$Url,
        [string]$Name,
        [string]$Method = "GET",
        [hashtable]$Headers = @{}
    )
    
    try {
        Write-Host "🔍 Testing: $Name" -ForegroundColor Cyan
        Write-Host "   URL: $Url" -ForegroundColor Gray
        
        $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
        
        $result = @{
            Name = $Name
            Url = $Url
            Status = $response.StatusCode
            Success = $true
            Message = "OK"
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        Write-Host "   ✅ Status: $($response.StatusCode)" -ForegroundColor Green
        
        # JSONレスポンスの場合は内容を確認
        if ($response.ContentType -like "*json*") {
            try {
                $json = $response.Content | ConvertFrom-Json
                $result.Json = $json
            } catch {
                # JSON解析失敗は無視
            }
        }
        
        return $result
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $result = @{
            Name = $Name
            Url = $Url
            Status = if ($statusCode) { $statusCode } else { "Error" }
            Success = $false
            Message = $_.Exception.Message
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        if ($statusCode) {
            Write-Host "   ⚠️  Status: $statusCode" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        return $result
    }
}

Write-Host "`n🚀 Phase 2.3 検証環境動作確認を開始します`n" -ForegroundColor Green
Write-Host "ベースURL: $BaseUrl`n" -ForegroundColor Yellow

# API Route Handlers (13個)
Write-Host "`n📡 API Route Handlers の動作確認`n" -ForegroundColor Magenta

# 1. ヘルスチェック
$results += Test-Url -Url "$BaseUrl/api/ping" -Name "API: /api/ping (ヘルスチェック)"

# 2. セラー関連API
$results += Test-Url -Url "$BaseUrl/api/seller/summary?s=test-seller-pro" -Name "API: /api/seller/summary (Proプラン)"
$results += Test-Url -Url "$BaseUrl/api/seller/summary?s=test-seller-standard" -Name "API: /api/seller/summary (Standardプラン)"
$results += Test-Url -Url "$BaseUrl/api/seller/summary?s=test-seller-kids" -Name "API: /api/seller/kids-summary (Kidsプラン)"
$results += Test-Url -Url "$BaseUrl/api/seller/kids-summary?s=test-seller-kids" -Name "API: /api/seller/kids-summary"

# 3. 管理者API
$adminHeaders = @{ "x-admin-token" = "admin-devtoken" }
$results += Test-Url -Url "$BaseUrl/api/admin/dashboard" -Name "API: /api/admin/dashboard" -Headers $adminHeaders
$results += Test-Url -Url "$BaseUrl/api/admin/sellers" -Name "API: /api/admin/sellers" -Headers $adminHeaders
$results += Test-Url -Url "$BaseUrl/api/admin/frames" -Name "API: /api/admin/frames" -Headers $adminHeaders
$results += Test-Url -Url "$BaseUrl/api/admin/stripe/summary" -Name "API: /api/admin/stripe/summary" -Headers $adminHeaders

# 4. 決済関連API（POSTなので簡易チェック）
$results += Test-Url -Url "$BaseUrl/api/checkout/result?order=test-order-id" -Name "API: /api/checkout/result"

# Next.js Pages (14個)
Write-Host "`n📄 Next.js Pages の動作確認`n" -ForegroundColor Magenta

# 1. 基本画面
$results += Test-Url -Url "$BaseUrl/" -Name "Page: / (トップページ)"
$results += Test-Url -Url "$BaseUrl/success" -Name "Page: /success"
$results += Test-Url -Url "$BaseUrl/thanks" -Name "Page: /thanks"
$results += Test-Url -Url "$BaseUrl/cancel" -Name "Page: /cancel"

# 2. オンボーディング
$results += Test-Url -Url "$BaseUrl/onboarding/complete" -Name "Page: /onboarding/complete"
$results += Test-Url -Url "$BaseUrl/onboarding/refresh" -Name "Page: /onboarding/refresh"

# 3. 決済・チェックアウト
$results += Test-Url -Url "$BaseUrl/checkout?s=test-seller-pro" -Name "Page: /checkout"
$results += Test-Url -Url "$BaseUrl/seller-register" -Name "Page: /seller-register"
$results += Test-Url -Url "$BaseUrl/seller-purchase-standard?s=test-seller-pro" -Name "Page: /seller-purchase-standard"

# 4. 管理画面
$results += Test-Url -Url "$BaseUrl/admin/dashboard" -Name "Page: /admin/dashboard"
$results += Test-Url -Url "$BaseUrl/admin/sellers" -Name "Page: /admin/sellers"
$results += Test-Url -Url "$BaseUrl/admin/frames" -Name "Page: /admin/frames"
$results += Test-Url -Url "$BaseUrl/admin/payments" -Name "Page: /admin/payments"

# 5. Kidsダッシュボード
$results += Test-Url -Url "$BaseUrl/kids-dashboard?s=test-seller-kids" -Name "Page: /kids-dashboard"

# 結果サマリー
Write-Host "`n📊 動作確認結果サマリー`n" -ForegroundColor Green

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$failCount = ($results | Where-Object { $_.Success -eq $false }).Count
$totalCount = $results.Count

Write-Host "総テスト数: $totalCount" -ForegroundColor White
Write-Host "✅ 成功: $successCount" -ForegroundColor Green
Write-Host "❌ 失敗: $failCount" -ForegroundColor Red

# 失敗したテストの詳細
if ($failCount -gt 0) {
    Write-Host "`n❌ 失敗したテスト:`n" -ForegroundColor Red
    $results | Where-Object { $_.Success -eq $false } | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Yellow
        Write-Host "    URL: $($_.Url)" -ForegroundColor Gray
        Write-Host "    Status: $($_.Status)" -ForegroundColor Gray
        Write-Host "    Message: $($_.Message)`n" -ForegroundColor Gray
    }
}

# 成功したテストの詳細
if ($successCount -gt 0) {
    Write-Host "`n✅ 成功したテスト:`n" -ForegroundColor Green
    $results | Where-Object { $_.Success -eq $true } | ForEach-Object {
        Write-Host "  - $($_.Name) (Status: $($_.Status))" -ForegroundColor Green
    }
}

# レポートをJSONファイルに保存
$report = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    BaseUrl = $BaseUrl
    Summary = @{
        Total = $totalCount
        Success = $successCount
        Failed = $failCount
    }
    Results = $results
}

$report | ConvertTo-Json -Depth 10 | Out-File -FilePath "phase-2-3-staging-verification-report.json" -Encoding UTF8

Write-Host "`n📄 詳細レポートを保存しました: phase-2-3-staging-verification-report.json" -ForegroundColor Green

# 結果を返す
return $report

