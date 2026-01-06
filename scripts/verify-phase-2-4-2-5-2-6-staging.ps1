# Phase 2.4, 2.5, 2.6: 検証環境動作確認スクリプト
# 実際にHTTPリクエストを送信して動作確認を行う

$BASE_URL = "https://fleapay-lite-t1.onrender.com"
$report = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    baseUrl = $BASE_URL
    results = @()
    summary = @{
        total = 0
        success = 0
        failed = 0
    }
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [int]$ExpectedStatus = 200,
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
        
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -UseBasicParsing -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -UseBasicParsing -ErrorAction Stop
        }
        
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
            $report.summary.success++
            Write-Host "✅ $Name - Status: $($response.StatusCode) ($($stopwatch.ElapsedMilliseconds)ms)" -ForegroundColor Green
        } else {
            $report.summary.failed++
            Write-Host "❌ $Name - Status: $($response.StatusCode) (期待: $ExpectedStatus)" -ForegroundColor Red
        }
    } catch {
        $result.status = "failed"
        $result.error = $_.Exception.Message
        $result.actualStatus = $_.Exception.Response.StatusCode.value__
        $report.summary.failed++
        Write-Host "❌ $Name - エラー: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        $report.summary.total++
        $report.results += $result
    }
}

Write-Host "🔍 Phase 2.4, 2.5, 2.6: 検証環境動作確認を開始します..." -ForegroundColor Cyan
Write-Host "ベースURL: $BASE_URL" -ForegroundColor Cyan
Write-Host ""

# 1. ヘルスチェック
Write-Host "=== 1. ヘルスチェック ===" -ForegroundColor Yellow
Test-Endpoint -Name "ヘルスチェック" -Url "$BASE_URL/api/ping" -Description "Prisma接続確認、Git情報取得"

Write-Host ""

# 2. 出店者サマリー API（プラン別）
Write-Host "=== 2. 出店者サマリー API（プラン別） ===" -ForegroundColor Yellow
Test-Endpoint -Name "出店者サマリー (Pro)" -Url "$BASE_URL/api/seller/summary?s=test-seller-pro" -Description "Proプランのサマリー取得"
Test-Endpoint -Name "出店者サマリー (Standard)" -Url "$BASE_URL/api/seller/summary?s=test-seller-standard" -Description "Standardプランのサマリー取得"
Test-Endpoint -Name "出店者サマリー (Kids)" -Url "$BASE_URL/api/seller/summary?s=test-seller-kids" -Description "Kidsプランのサマリー取得"

Write-Host ""

# 3. Phase 2.6で移行したAPI
Write-Host "=== 3. Phase 2.6で移行したAPI ===" -ForegroundColor Yellow
Test-Endpoint -Name "出店者ID確認" -Url "$BASE_URL/api/seller/check-id?id=test-id" -Description "出店者IDの利用可能性確認（動的ルート設定済み）"
Test-Endpoint -Name "マイグレーション状態取得" -Url "$BASE_URL/api/admin/migration-status" -Headers @{"x-admin-token" = "admin-devtoken"} -Description "マイグレーション状態取得（動的ルート設定済み、管理者認証必要）"

Write-Host ""

# 4. Next.js Pages
Write-Host "=== 4. Next.js Pages ===" -ForegroundColor Yellow
Test-Endpoint -Name "トップページ" -Url "$BASE_URL/" -Description "Next.jsトップページ"
Test-Endpoint -Name "出店者登録ページ" -Url "$BASE_URL/seller-register" -Description "React Hook Form + Zod、Tailwind CSS導入済み"
Test-Endpoint -Name "チェックアウトページ" -Url "$BASE_URL/checkout?s=test-seller-pro" -Description "チェックアウトページ"
Test-Endpoint -Name "管理者ダッシュボード" -Url "$BASE_URL/admin/dashboard" -Description "管理者ダッシュボード"

Write-Host ""

# 5. その他のAPIエンドポイント
Write-Host "=== 5. その他のAPIエンドポイント ===" -ForegroundColor Yellow
Test-Endpoint -Name "Kidsサマリー" -Url "$BASE_URL/api/seller/kids-summary?s=test-seller-kids" -Description "Kidsプラン専用サマリー"
Test-Endpoint -Name "管理者ダッシュボードAPI" -Url "$BASE_URL/api/admin/dashboard" -Headers @{"x-admin-token" = "admin-devtoken"} -Description "管理者ダッシュボードAPI"

Write-Host ""

# サマリー表示
Write-Host "=== 動作確認結果サマリー ===" -ForegroundColor Cyan
Write-Host "総数: $($report.summary.total)" -ForegroundColor White
Write-Host "成功: $($report.summary.success)" -ForegroundColor Green
Write-Host "失敗: $($report.summary.failed)" -ForegroundColor $(if ($report.summary.failed -eq 0) { "Green" } else { "Red" })
Write-Host "成功率: $([math]::Round(($report.summary.success / $report.summary.total) * 100, 2))%" -ForegroundColor White
Write-Host ""

# 失敗した項目の詳細表示
if ($report.summary.failed -gt 0) {
    Write-Host "=== 失敗した項目 ===" -ForegroundColor Red
    $report.results | Where-Object { $_.status -eq "failed" } | ForEach-Object {
        Write-Host "❌ $($_.name)" -ForegroundColor Red
        Write-Host "   URL: $($_.url)" -ForegroundColor Gray
        Write-Host "   エラー: $($_.error)" -ForegroundColor Gray
        Write-Host ""
    }
}

# レポートをJSONファイルに保存
$report | ConvertTo-Json -Depth 10 | Out-File -FilePath "phase-2-4-2-5-2-6-verification-report.json" -Encoding UTF8
Write-Host "📄 詳細レポートを保存しました: phase-2-4-2-5-2-6-verification-report.json" -ForegroundColor Green



