# デプロイ状態確認スクリプト
# 使用方法: .\scripts\check-deployment-status.ps1 -BaseUrl "https://fleapay-lite-t1.onrender.com"

param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://fleapay-lite-t1.onrender.com"
)

Write-Host "🔍 デプロイ状態を確認しています..." -ForegroundColor Cyan
Write-Host ""

# 1. ローカルの最新コミット情報を取得
Write-Host "📋 ローカルの最新コミット情報:" -ForegroundColor Yellow
try {
    $localCommit = git log -1 --format="%H" HEAD 2>&1
    $localDate = git log -1 --format="%ci" HEAD 2>&1
    $localMessage = git log -1 --format="%s" HEAD 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  コミットハッシュ: $localCommit" -ForegroundColor Green
        Write-Host "  コミット日時: $localDate" -ForegroundColor Green
        Write-Host "  コミットメッセージ: $localMessage" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Git情報の取得に失敗しました" -ForegroundColor Yellow
        $localCommit = "unknown"
    }
} catch {
    Write-Host "  ⚠️ Git情報の取得に失敗しました: $_" -ForegroundColor Yellow
    $localCommit = "unknown"
}

Write-Host ""

# 2. 検証環境のAPIからバージョン情報を取得
Write-Host "🌐 検証環境のデプロイ状態を確認中..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/ping" -UseBasicParsing -TimeoutSec 10
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "  ✅ サーバーは正常に応答しています" -ForegroundColor Green
    Write-Host "  バージョン: $($data.version)" -ForegroundColor Cyan
    Write-Host "  タイムスタンプ: $($data.timestamp)" -ForegroundColor Cyan
    Write-Host "  Prisma状態: $($data.prisma)" -ForegroundColor Cyan
    
    # Gitコミット情報が含まれているか確認
    if ($data.git -and $data.git.commit) {
        Write-Host "  ✅ Gitコミット情報が含まれています" -ForegroundColor Green
        Write-Host "  コミットハッシュ: $($data.git.commit)" -ForegroundColor Cyan
        Write-Host "  コミット日時: $($data.git.date)" -ForegroundColor Cyan
        
        # ローカルのコミットハッシュと比較
        if ($localCommit -ne "unknown" -and $data.git.commit) {
            $localShort = $localCommit.Substring(0, [Math]::Min(7, $localCommit.Length))
            if ($data.git.commit -eq $localShort) {
                Write-Host "  ✅ ローカルのコミットハッシュと一致しています" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️ ローカルのコミットハッシュと一致しません" -ForegroundColor Yellow
                Write-Host "     ローカル: $localShort" -ForegroundColor Yellow
                Write-Host "     検証環境: $($data.git.commit)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  ⚠️ Gitコミット情報が含まれていません（バージョン情報のみ）" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "📊 デプロイ状態の判定:" -ForegroundColor Yellow
    
    # デプロイ状態の判定（簡易版）
    # 実際のコミットハッシュ比較は、バージョン情報にコミットハッシュが含まれている場合のみ可能
    if ($data.prisma -eq "connected") {
        Write-Host "  ✅ データベース接続: 正常" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ データベース接続: 要確認" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "💡 推奨事項:" -ForegroundColor Cyan
    Write-Host "  - 最新のコードがデプロイされているか確認するには、Gitのコミットハッシュを比較してください" -ForegroundColor White
    Write-Host "  - バージョン情報にコミットハッシュを含めることを推奨します" -ForegroundColor White
    
} catch {
    Write-Host "  ❌ サーバーへの接続に失敗しました" -ForegroundColor Red
    Write-Host "  エラー: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️ デプロイされていない可能性があります" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ デプロイ状態確認完了" -ForegroundColor Green

