# Comprehensive Degradation Check Script
# 全画面・全APIエンドポイントの動作確認とデグレチェック

function Test-Endpoint {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        [Parameter(Mandatory=$true)]
        [string]$Url,
        [Parameter(Mandatory=$false)]
        [string]$Method = "GET",
        [Parameter(Mandatory=$false)]
        [hashtable]$Headers = @{},
        [Parameter(Mandatory=$false)]
        [int]$ExpectedStatus = 200,
        [Parameter(Mandatory=$false)]
        [string]$Description = ""
    )

    $result = @{
        name = $Name
        url = $Url
        method = $Method
        expectedStatus = $ExpectedStatus
        description = $Description
        status = "pending"
        actualStatus = $null
        responseTime = $null
        error = $null
        responseBody = $null
    }

    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

        $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -UseBasicParsing -ErrorAction Stop

        $stopwatch.Stop()

        $result.status = if ($response.StatusCode -eq $ExpectedStatus) { "success" } else { "failed" }
        $result.actualStatus = $response.StatusCode
        $result.responseTime = $stopwatch.ElapsedMilliseconds

        # レスポンスボディを取得（JSONの場合はパース）
        try {
            $result.responseBody = $response.Content | ConvertFrom-Json
        } catch {
            $result.responseBody = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
        }

        if ($result.status -eq "success") {
            $script:report.summary.success++
            Write-Host "[OK] $Name - Status: $($response.StatusCode) ($($stopwatch.ElapsedMilliseconds)ms)" -ForegroundColor Green
        } else {
            $script:report.summary.failed++
            Write-Host "[FAIL] $Name - Status: $($response.StatusCode) (期待: $ExpectedStatus)" -ForegroundColor Red
        }
    } catch {
        $result.status = "failed"
        $result.error = $_.Exception.Message
        if ($_.Exception.Response) {
            $result.actualStatus = $_.Exception.Response.StatusCode.value__
        }
        $script:report.summary.failed++
        Write-Host "[FAIL] $Name - エラー: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        $script:report.summary.total++
        $script:report.results += $result
    }
}

$BASE_URL = "https://fleapay-lite-t1.onrender.com"

$script:report = @{
    summary = @{
        success = 0
        failed = 0
        total = 0
    }
    baseUrl = $BASE_URL
    timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    results = @()
}

Write-Host "包括的デグレチェックを開始します..." -ForegroundColor Cyan
Write-Host "ベースURL: $BASE_URL" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. Next.js Pages（主要な画面）
# ============================================
Write-Host "=== 1. Next.js Pages ===" -ForegroundColor Yellow

Test-Endpoint -Name "トップページ" -Url "$BASE_URL/" -Description "Next.jsトップページ"
Test-Endpoint -Name "出店者登録ページ" -Url "$BASE_URL/seller-register" -Description "React Hook Form + Zod導入済み"
Test-Endpoint -Name "チェックアウトページ" -Url "$BASE_URL/checkout?s=test-seller-pro" -Description "チェックアウトページ"
Test-Endpoint -Name "成功ページ" -Url "$BASE_URL/success" -Description "決済成功ページ"
Test-Endpoint -Name "サンクスページ" -Url "$BASE_URL/thanks" -Description "サンクスページ"
Test-Endpoint -Name "キャンセルページ" -Url "$BASE_URL/cancel" -Description "決済キャンセルページ"
Test-Endpoint -Name "出店者購入画面（標準）" -Url "$BASE_URL/seller-purchase-standard?s=test-seller-standard" -Description "カメラ、AI解析、QRコード機能"
Test-Endpoint -Name "Kidsダッシュボード" -Url "$BASE_URL/kids-dashboard?s=test-seller-kids" -Description "Kidsプラン専用ダッシュボード"
Test-Endpoint -Name "オンボーディング完了" -Url "$BASE_URL/onboarding/complete" -Description "オンボーディング完了ページ"
Test-Endpoint -Name "オンボーディング更新" -Url "$BASE_URL/onboarding/refresh" -Description "オンボーディング更新ページ"

Write-Host ""

# ============================================
# 2. 管理者ページ
# ============================================
Write-Host "=== 2. 管理者ページ ===" -ForegroundColor Yellow

Test-Endpoint -Name "管理者ダッシュボード" -Url "$BASE_URL/admin/dashboard" -Description "管理者ダッシュボード（UI修正済み）"
Test-Endpoint -Name "出店者管理" -Url "$BASE_URL/admin/sellers" -Description "出店者管理ページ"
Test-Endpoint -Name "AIフレーム管理" -Url "$BASE_URL/admin/frames" -Description "AIフレーム管理ページ"
Test-Endpoint -Name "決済管理" -Url "$BASE_URL/admin/payments" -Description "決済・CB管理ページ"

Write-Host ""

# ============================================
# 3. API Route Handlers（主要なエンドポイント）
# ============================================
Write-Host "=== 3. API Route Handlers（主要なエンドポイント） ===" -ForegroundColor Yellow

Test-Endpoint -Name "ヘルスチェック" -Url "$BASE_URL/api/ping" -Description "Prisma接続確認、Git情報取得"
Test-Endpoint -Name "出店者サマリー (Pro)" -Url "$BASE_URL/api/seller/summary?s=test-seller-pro" -Description "Proプランのサマリー取得"
Test-Endpoint -Name "出店者サマリー (Standard)" -Url "$BASE_URL/api/seller/summary?s=test-seller-standard" -Description "Standardプランのサマリー取得"
Test-Endpoint -Name "出店者サマリー (Kids)" -Url "$BASE_URL/api/seller/summary?s=test-seller-kids" -Description "Kidsプランのサマリー取得"
Test-Endpoint -Name "売上分析（日毎）" -Url "$BASE_URL/api/seller/analytics?s=test-seller-pro&period=daily&days=30" -Description "売上分析データ（新規追加）"
Test-Endpoint -Name "売上分析（週毎）" -Url "$BASE_URL/api/seller/analytics?s=test-seller-pro&period=weekly&days=28" -Description "売上分析データ（週毎）"
Test-Endpoint -Name "ベンチマークデータ" -Url "$BASE_URL/api/benchmark/data" -Description "ベンチマークCSVデータ（新規追加）"
Test-Endpoint -Name "Kidsサマリー" -Url "$BASE_URL/api/seller/kids-summary?s=test-seller-kids" -Description "Kidsプラン専用サマリー"
Test-Endpoint -Name "出店者ID確認" -Url "$BASE_URL/api/seller/check-id?id=test-id-new" -Description "出店者IDの利用可能性確認"
Test-Endpoint -Name "管理者ダッシュボードAPI" -Url "$BASE_URL/api/admin/dashboard" -Headers @{"x-admin-token" = "admin-devtoken"} -Description "管理者ダッシュボードAPI"
Test-Endpoint -Name "出店者管理API" -Url "$BASE_URL/api/admin/sellers" -Headers @{"x-admin-token" = "admin-devtoken"} -Description "出店者管理API"
Test-Endpoint -Name "AIフレーム管理API" -Url "$BASE_URL/api/admin/frames" -Headers @{"x-admin-token" = "admin-devtoken"} -Description "AIフレーム管理API"
Test-Endpoint -Name "マイグレーション状態取得" -Url "$BASE_URL/api/admin/migration-status" -Headers @{"x-admin-token" = "admin-devtoken"} -Description "マイグレーション状態取得"

Write-Host ""

# ============================================
# 4. 画面URL確認
# ============================================
Write-Host "=== 4. 画面URL確認 ===" -ForegroundColor Yellow

Test-Endpoint -Name "出店者ダッシュボード" -Url "$BASE_URL/seller-dashboard?s=test-seller-pro" -Description "出店者ダッシュボード"
Test-Endpoint -Name "Kidsダッシュボード（HTML）" -Url "$BASE_URL/kids-dashboard.html?s=test-seller-kids" -Description "Kidsダッシュボード（HTML）"
Test-Endpoint -Name "出店者購入画面（HTML）" -Url "$BASE_URL/seller-purchase.html?s=test-seller-standard" -Description "出店者購入画面（HTML）"

Write-Host ""

# ============================================
# 5. エラーハンドリング確認
# ============================================
Write-Host "=== 5. エラーハンドリング確認 ===" -ForegroundColor Yellow

Test-Endpoint -Name "存在しないページ" -Url "$BASE_URL/non-existent-page" -ExpectedStatus 404 -Description "404エラーハンドリング確認"
Test-Endpoint -Name "存在しないAPI" -Url "$BASE_URL/api/non-existent" -ExpectedStatus 404 -Description "404エラーハンドリング確認（API）"
Test-Endpoint -Name "管理者認証エラー" -Url "$BASE_URL/api/admin/dashboard" -ExpectedStatus 401 -Description "401エラーハンドリング確認（認証なし）"

Write-Host ""

# ============================================
# 結果サマリー
# ============================================
Write-Host "=== デグレチェック結果サマリー ===" -ForegroundColor Green
Write-Host "総数: $($script:report.summary.total)" -ForegroundColor White
Write-Host "成功: $($script:report.summary.success)" -ForegroundColor Green
Write-Host "失敗: $($script:report.summary.failed)" -ForegroundColor Red
Write-Host "成功率: $([Math]::Round(($script:report.summary.success / $script:report.summary.total) * 100, 2))%" -ForegroundColor Cyan

if ($script:report.summary.failed -gt 0) {
    Write-Host "`n=== 失敗した項目 ===" -ForegroundColor Red
    $script:report.results | Where-Object { $_.status -eq "failed" } | ForEach-Object {
        Write-Host "[FAIL] $($_.name) - Status: $($_.actualStatus)" -ForegroundColor Red
        Write-Host "   URL: $($_.url)" -ForegroundColor Red
        if ($_.error) {
            Write-Host "   エラー: $($_.error)" -ForegroundColor Red
        }
        Write-Host ""
    }
}

# レポートをJSONファイルに保存
$script:report | ConvertTo-Json -Depth 10 | Out-File -FilePath "comprehensive-degradation-check-report.json" -Encoding UTF8

Write-Host "Report saved: comprehensive-degradation-check-report.json" -ForegroundColor Green





