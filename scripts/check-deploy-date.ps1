# デプロイ日時確認スクリプト
param(
    [string]$BaseUrl = "https://fleapay-lite-t1.onrender.com"
)

Write-Host "🔍 検証環境のデプロイ状態を確認中..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/ping" -Method Get -TimeoutSec 10
    
    Write-Host "✅ サーバーは正常に応答しています" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 デプロイ情報:" -ForegroundColor Yellow
    Write-Host "  バージョン: $($response.version)" -ForegroundColor Cyan
    Write-Host "  タイムスタンプ: $($response.timestamp)" -ForegroundColor Cyan
    Write-Host "  Prisma状態: $($response.prisma)" -ForegroundColor Cyan
    
    if ($response.git) {
        Write-Host ""
        Write-Host "📋 Gitコミット情報:" -ForegroundColor Yellow
        Write-Host "  コミットハッシュ: $($response.git.commit)" -ForegroundColor Cyan
        Write-Host "  コミット日時: $($response.git.date)" -ForegroundColor Cyan
        
        # 日付の解析
        if ($response.git.date -and $response.git.date -ne "unknown") {
            $deployDate = [DateTime]::Parse($response.git.date)
            Write-Host ""
            Write-Host "📅 デプロイ日時解析:" -ForegroundColor Yellow
            Write-Host "  デプロイ日: $($deployDate.ToString('yyyy-MM-dd'))" -ForegroundColor Cyan
            Write-Host "  デプロイ時刻: $($deployDate.ToString('HH:mm:ss'))" -ForegroundColor Cyan
            
            # 12月29日かどうか確認
            if ($deployDate.ToString('yyyy-MM-dd') -eq "2024-12-29" -or $deployDate.ToString('MM-dd') -eq "12-29") {
                Write-Host ""
                Write-Host "✅ 12月29日にデプロイされています！" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "⚠️ 12月29日ではありません（$($deployDate.ToString('yyyy-MM-dd'))）" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host ""
        Write-Host "⚠️ Gitコミット情報が含まれていません" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ サーバーへの接続に失敗しました" -ForegroundColor Red
    Write-Host "エラー: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ 確認完了" -ForegroundColor Green

