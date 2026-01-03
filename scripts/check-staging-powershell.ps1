# 検証環境の全画面チェックツール（PowerShell版）
# Node.jsがなくても実行できます

$ErrorActionPreference = "Stop"

# 設定
$BaseUrl = "https://fleapay-lite-t1.onrender.com"
$Timeout = 10000  # 10秒

# チェック対象のページルート
$PageRoutes = @(
    @{ Path = "/"; Name = "トップページ" },
    @{ Path = "/success"; Name = "成功ページ" },
    @{ Path = "/thanks"; Name = "サンクスページ" },
    @{ Path = "/cancel"; Name = "キャンセルページ" },
    @{ Path = "/onboarding/complete"; Name = "オンボーディング完了" },
    @{ Path = "/onboarding/refresh"; Name = "オンボーディング更新" },
    @{ Path = "/checkout"; Name = "チェックアウト画面" },
    @{ Path = "/seller-register"; Name = "セラー登録画面" },
    @{ Path = "/seller-purchase-standard"; Name = "セラー購入標準画面" },
    @{ Path = "/admin/dashboard"; Name = "管理者ダッシュボード" },
    @{ Path = "/admin/sellers"; Name = "管理者出店者画面" },
    @{ Path = "/admin/frames"; Name = "管理者フレーム画面" },
    @{ Path = "/admin/payments"; Name = "管理者決済画面" },
    @{ Path = "/kids-dashboard"; Name = "Kidsダッシュボード" }
)

# チェック対象のAPIエンドポイント
$ApiRoutes = @(
    @{ Path = "/api/ping"; Method = "GET"; Name = "ヘルスチェック" },
    @{ Path = "/api/seller/summary"; Method = "GET"; Name = "セラーサマリー" },
    @{ Path = "/api/seller/kids-summary"; Method = "GET"; Name = "Kidsサマリー" },
    @{ Path = "/api/admin/dashboard"; Method = "GET"; Name = "管理ダッシュボードAPI" },
    @{ Path = "/api/admin/sellers"; Method = "GET"; Name = "出店者管理API" },
    @{ Path = "/api/admin/frames"; Method = "GET"; Name = "フレーム管理API" },
    @{ Path = "/api/admin/stripe/summary"; Method = "GET"; Name = "StripeサマリーAPI" }
)

# 結果を格納する配列
$Results = @{
    Pages = @()
    Apis = @()
    Summary = @{
        Total = 0
        Success = 0
        Errors = 0
        Warnings = 0
        StartTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
        EndTime = $null
    }
}

# URLをチェックする関数
function Test-Url {
    param(
        [string]$Url,
        [string]$Name,
        [string]$Method = "GET"
    )
    
    $result = @{
        Name = $Name
        Url = $Url
        Status = "unknown"
        StatusCode = $null
        ResponseTime = $null
        Issues = @()
        Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    }
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri $Url -Method $Method -TimeoutSec ($Timeout / 1000) -UseBasicParsing -ErrorAction Stop
        $responseTime = ((Get-Date) - $startTime).TotalMilliseconds
        
        $result.StatusCode = $response.StatusCode
        $result.ResponseTime = [math]::Round($responseTime, 0)
        
        if ($response.StatusCode -eq 200) {
            $result.Status = "success"
            $Results.Summary.Success++
            
            # HTML構造のチェック
            $html = $response.Content
            if ($html -notmatch "<html" -and $html -notmatch "<!DOCTYPE") {
                $result.Issues += @{ Type = "warning"; Message = "HTMLドキュメント構造が見つかりません" }
            }
            if ($html -match "Application error" -or $html -match "Error occurred") {
                $result.Issues += @{ Type = "error"; Message = "Next.jsエラーページが表示されています" }
                $result.Status = "error"
                $Results.Summary.Success--
                $Results.Summary.Errors++
            }
        }
        elseif ($response.StatusCode -ge 400 -and $response.StatusCode -lt 500) {
            $result.Status = "error"
            $result.Issues += @{ Type = "error"; Message = "HTTP $($response.StatusCode) エラー" }
            $Results.Summary.Errors++
        }
        elseif ($response.StatusCode -ge 500) {
            $result.Status = "error"
            $result.Issues += @{ Type = "error"; Message = "HTTP $($response.StatusCode) サーバーエラー" }
            $Results.Summary.Errors++
        }
    }
    catch {
        $result.Status = "error"
        $errorMessage = $_.Exception.Message
        if ($_.Exception.Response) {
            $result.StatusCode = [int]$_.Exception.Response.StatusCode.value__
            $result.Issues += @{ Type = "error"; Message = "HTTP $($result.StatusCode) エラー: $errorMessage" }
        }
        else {
            $result.Issues += @{ Type = "error"; Message = "リクエストに失敗しました: $errorMessage" }
        }
        $Results.Summary.Errors++
    }
    
    $Results.Summary.Total++
    return $result
}

# メイン処理
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔍 検証環境の全画面チェックを開始します" -ForegroundColor Cyan
Write-Host "ベースURL: $BaseUrl" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ページをチェック
Write-Host "📄 $($PageRoutes.Count)個のページをチェック中..." -ForegroundColor Magenta
Write-Host ""

foreach ($route in $PageRoutes) {
    $url = "$BaseUrl$($route.Path)"
    Write-Host "チェック中: $($route.Name) ($($route.Path))" -ForegroundColor Gray -NoNewline
    $result = Test-Url -Url $url -Name $route.Name
    
    $Results.Pages += $result
    
    $statusIcon = switch ($result.Status) {
        "success" { "✓" }
        "error" { "✗" }
        "warning" { "⚠" }
        default { "?" }
    }
    
    $statusColor = switch ($result.Status) {
        "success" { "Green" }
        "error" { "Red" }
        "warning" { "Yellow" }
        default { "Gray" }
    }
    
    Write-Host " $statusIcon " -ForegroundColor $statusColor -NoNewline
    Write-Host "$($result.StatusCode) - $($result.ResponseTime)ms" -ForegroundColor White
}

Write-Host ""
Write-Host "🔌 $($ApiRoutes.Count)個のAPIエンドポイントをチェック中..." -ForegroundColor Magenta
Write-Host ""

foreach ($route in $ApiRoutes) {
    $url = "$BaseUrl$($route.Path)"
    Write-Host "チェック中: $($route.Name) ($($route.Path))" -ForegroundColor Gray -NoNewline
    $result = Test-Url -Url $url -Name $route.Name -Method $route.Method
    
    $Results.Apis += $result
    
    $statusIcon = switch ($result.Status) {
        "success" { "✓" }
        "error" { "✗" }
        "warning" { "⚠" }
        default { "?" }
    }
    
    $statusColor = switch ($result.Status) {
        "success" { "Green" }
        "error" { "Red" }
        "warning" { "Yellow" }
        default { "Gray" }
    }
    
    Write-Host " $statusIcon " -ForegroundColor $statusColor -NoNewline
    Write-Host "$($result.StatusCode) - $($result.ResponseTime)ms" -ForegroundColor White
}

$Results.Summary.EndTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"

# 結果サマリー
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📊 チェック結果サマリー" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "総チェック数: $($Results.Summary.Total)" -ForegroundColor White
Write-Host "成功: " -NoNewline
Write-Host "$($Results.Summary.Success)" -ForegroundColor Green
Write-Host "エラー: " -NoNewline
Write-Host "$($Results.Summary.Errors)" -ForegroundColor Red
Write-Host "警告: " -NoNewline
Write-Host "$($Results.Summary.Warnings)" -ForegroundColor Yellow
Write-Host ""
Write-Host "チェック開始: $($Results.Summary.StartTime)" -ForegroundColor Gray
Write-Host "チェック終了: $($Results.Summary.EndTime)" -ForegroundColor Gray
Write-Host ""

# エラーがある場合は詳細を表示
if ($Results.Summary.Errors -gt 0) {
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "❌ エラーが検出されました" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    
    $errorPages = $Results.Pages | Where-Object { $_.Status -eq "error" }
    $errorApis = $Results.Apis | Where-Object { $_.Status -eq "error" }
    
    if ($errorPages.Count -gt 0) {
        Write-Host "エラーがあるページ:" -ForegroundColor Yellow
        foreach ($page in $errorPages) {
            Write-Host "  ✗ $($page.Name) ($($page.Path))" -ForegroundColor Red
            foreach ($issue in $page.Issues) {
                Write-Host "    - $($issue.Message)" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
    
    if ($errorApis.Count -gt 0) {
        Write-Host "エラーがあるAPI:" -ForegroundColor Yellow
        foreach ($api in $errorApis) {
            Write-Host "  ✗ $($api.Name) ($($api.Path))" -ForegroundColor Red
            foreach ($issue in $api.Issues) {
                Write-Host "    - $($issue.Message)" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
}

# JSON形式で結果を出力
$jsonOutput = $Results | ConvertTo-Json -Depth 10
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "JSON形式の結果:" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host $jsonOutput

# 結果をファイルに保存するか確認
$saveToFile = Read-Host "`n結果をファイルに保存しますか？ (y/n)"
if ($saveToFile -eq "y" -or $saveToFile -eq "Y") {
    $fileName = "staging-check-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $jsonOutput | Out-File -FilePath $fileName -Encoding UTF8
    Write-Host "結果を $fileName に保存しました" -ForegroundColor Green
}

# 終了コード
if ($Results.Summary.Errors -gt 0) {
    exit 1
} else {
    exit 0
}

