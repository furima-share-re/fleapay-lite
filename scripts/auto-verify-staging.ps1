# Cursor用: 自動デプロイ状態確認 + 動作確認スクリプト
# 使用方法: .\scripts\auto-verify-staging.ps1
# 
# このスクリプトは以下を自動で実行します:
# 1. ローカルの最新コミット情報を取得
# 2. 検証環境のデプロイ状態を確認
# 3. デプロイされていない場合は警告を表示して終了
# 4. デプロイされている場合は動作確認を実行

param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://fleapay-lite-t1.onrender.com",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDeploymentCheck = $false
)

$ErrorActionPreference = "Stop"

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Cursor用: 自動デプロイ状態確認 + 動作確認スクリプト    ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: デプロイ状態確認（スキップされていない場合）
if (-not $SkipDeploymentCheck) {
    Write-Host "📋 Step 1: デプロイ状態確認" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray
    
    # 1.1 ローカルの最新コミット情報を取得
    Write-Host ""
    Write-Host "🔍 ローカルの最新コミット情報を取得中..." -ForegroundColor Cyan
    try {
        $localCommit = git rev-parse --short HEAD 2>&1 | Out-String
        $localCommit = $localCommit.Trim()
        $localDate = git log -1 --format="%ci" HEAD 2>&1 | Out-String
        $localDate = $localDate.Trim()
        $localMessage = git log -1 --format="%s" HEAD 2>&1 | Out-String
        $localMessage = $localMessage.Trim()
        
        if ($LASTEXITCODE -eq 0 -and $localCommit -and $localCommit -ne "") {
            Write-Host "  ✅ コミットハッシュ: $localCommit" -ForegroundColor Green
            Write-Host "  ✅ コミット日時: $localDate" -ForegroundColor Green
            Write-Host "  ✅ コミットメッセージ: $localMessage" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Git情報の取得に失敗しました（Gitが利用できない可能性）" -ForegroundColor Yellow
            $localCommit = "unknown"
        }
    } catch {
        Write-Host "  ⚠️ Git情報の取得に失敗しました: $_" -ForegroundColor Yellow
        $localCommit = "unknown"
    }
    
    # 1.2 検証環境のデプロイ状態を確認
    Write-Host ""
    Write-Host "🌐 検証環境のデプロイ状態を確認中..." -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/ping" -UseBasicParsing -TimeoutSec 10
        $data = $response.Content | ConvertFrom-Json
        
        Write-Host "  ✅ サーバーは正常に応答しています" -ForegroundColor Green
        Write-Host "  バージョン: $($data.version)" -ForegroundColor Cyan
        Write-Host "  Prisma状態: $($data.prisma)" -ForegroundColor Cyan
        
        # Gitコミット情報の確認
        $deployed = $false
        if ($data.git -and $data.git.commit -and $data.git.commit -ne "unknown") {
            Write-Host "  ✅ Gitコミット情報が含まれています" -ForegroundColor Green
            Write-Host "  デプロイ済みコミット: $($data.git.commit)" -ForegroundColor Cyan
            Write-Host "  デプロイ日時: $($data.git.date)" -ForegroundColor Cyan
            
            # ローカルのコミットハッシュと比較
            if ($localCommit -ne "unknown" -and $localCommit) {
                $localShort = $localCommit.Substring(0, [Math]::Min(7, $localCommit.Length))
                if ($data.git.commit -eq $localShort) {
                    Write-Host "  ✅ ローカルのコミットハッシュと一致しています" -ForegroundColor Green
                    $deployed = $true
                } else {
                    Write-Host "  ⚠️ ローカルのコミットハッシュと一致しません" -ForegroundColor Yellow
                    Write-Host "     ローカル: $localShort" -ForegroundColor Yellow
                    Write-Host "     検証環境: $($data.git.commit)" -ForegroundColor Yellow
                    Write-Host ""
                    Write-Host "  ❌ 最新のコードがデプロイされていません" -ForegroundColor Red
                    Write-Host "     動作確認をスキップします。" -ForegroundColor Red
                    Write-Host ""
                    Write-Host "  💡 対処方法:" -ForegroundColor Cyan
                    Write-Host "     1. 最新のコードをコミット・プッシュしてください" -ForegroundColor White
                    Write-Host "     2. Render Dashboardでデプロイが完了するまで待機してください" -ForegroundColor White
                    Write-Host "     3. デプロイ完了後、再度このスクリプトを実行してください" -ForegroundColor White
                    exit 1
                }
            } else {
                Write-Host "  ⚠️ ローカルのGit情報が取得できませんでした" -ForegroundColor Yellow
                Write-Host "     デプロイ状態の比較をスキップします" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠️ Gitコミット情報が含まれていません" -ForegroundColor Yellow
            Write-Host "     デプロイ環境でGitが利用できない可能性があります" -ForegroundColor Yellow
            Write-Host "     手動でデプロイ状態を確認してください" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "  ❓ デプロイ状態を確認できませんでした" -ForegroundColor Yellow
            Write-Host "     動作確認を続行しますか？ (Y/N)" -ForegroundColor Yellow
            $continue = Read-Host
            if ($continue -ne "Y" -and $continue -ne "y") {
                Write-Host "  動作確認をスキップします" -ForegroundColor Yellow
                exit 1
            }
        }
        
        # Prisma接続の確認
        if ($data.prisma -ne "connected") {
            Write-Host "  ⚠️ Prisma接続が失敗しています" -ForegroundColor Yellow
            Write-Host "     データベース接続に問題がある可能性があります" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "  ❌ サーバーへの接続に失敗しました" -ForegroundColor Red
        Write-Host "  エラー: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "  ❌ 検証環境に接続できません" -ForegroundColor Red
        Write-Host "     動作確認をスキップします" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ デプロイ状態確認完了" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⚠️ デプロイ状態確認をスキップします" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: 動作確認
Write-Host "📋 Step 2: 動作確認" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray

# 2.1 ヘルスチェック
Write-Host ""
Write-Host "1. ヘルスチェック (/api/ping)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/ping" -UseBasicParsing -TimeoutSec 10
    $data = $response.Content | ConvertFrom-Json
    Write-Host "   ✅ ステータス: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ バージョン: $($data.version)" -ForegroundColor Green
    Write-Host "   ✅ Prisma: $($data.prisma)" -ForegroundColor Green
    if ($data.git) {
        Write-Host "   ✅ Gitコミット: $($data.git.commit)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ エラー: $_" -ForegroundColor Red
    exit 1
}

# 2.2 APIエンドポイント確認
Write-Host ""
Write-Host "2. APIエンドポイント確認" -ForegroundColor Yellow

$endpoints = @(
    @{ Name = "売上サマリー (Standard)"; Url = "$BaseUrl/api/seller/summary?s=test-seller-standard"; ExpectedPlan = "standard" },
    @{ Name = "売上サマリー (Pro)"; Url = "$BaseUrl/api/seller/summary?s=test-seller-pro"; ExpectedPlan = "pro" },
    @{ Name = "売上サマリー (Kids)"; Url = "$BaseUrl/api/seller/summary?s=test-seller-kids"; ExpectedPlan = "kids" }
)

$allPassed = $true
foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -UseBasicParsing -TimeoutSec 10
        $data = $response.Content | ConvertFrom-Json
        
        if ($response.StatusCode -eq 200) {
            $planMatch = $data.planType -eq $endpoint.ExpectedPlan
            if ($planMatch) {
                Write-Host "   ✅ $($endpoint.Name): OK (planType: $($data.planType), isSubscribed: $($data.isSubscribed))" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ $($endpoint.Name): planType不一致 (期待: $($endpoint.ExpectedPlan), 実際: $($data.planType))" -ForegroundColor Yellow
                $allPassed = $false
            }
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
    @{ Name = "セラーダッシュボード"; Url = "$BaseUrl/seller-dashboard.html?s=test-seller-pro" },
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

# 結果サマリー
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

