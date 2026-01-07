# 検証環境をチェックするスクリプト

$env:BASE_URL = 'https://fleapay-lite-t1.onrender.com'

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "検証環境の全画面チェックを開始します" -ForegroundColor Cyan
Write-Host "ベースURL: $env:BASE_URL" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 現在のディレクトリを確認
$currentDir = Get-Location
Write-Host "現在のディレクトリ: $currentDir" -ForegroundColor Gray

# スクリプトファイルの存在確認
$scriptPath = Join-Path $currentDir "scripts\check-all-screens.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "エラー: スクリプトファイルが見つかりません: $scriptPath" -ForegroundColor Red
    exit 1
}

# Node.jsのパスを確認
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "エラー: Node.jsが見つかりません。PATHにNode.jsが追加されているか確認してください。" -ForegroundColor Red
    exit 1
}

Write-Host "Node.jsのパス: $($nodePath.Path)" -ForegroundColor Gray
Write-Host ""

# チェックを実行
try {
    & node $scriptPath
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Write-Host ""
        Write-Host "チェック完了（エラーが検出されました）" -ForegroundColor Yellow
        exit $exitCode
    } else {
        Write-Host ""
        Write-Host "チェック完了（すべて正常）" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host ""
    Write-Host "エラーが発生しました: $_" -ForegroundColor Red
    exit 1
}




