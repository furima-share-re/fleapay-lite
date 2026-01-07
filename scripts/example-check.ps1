# 全画面チェックツールの使用例（PowerShell版）

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "全画面チェックツール - 使用例" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 例1: ローカル環境の基本チェック
Write-Host "例1: ローカル環境の基本チェック" -ForegroundColor Green
Write-Host "コマンド: npm run check-screens"
Write-Host "説明: ローカル環境（http://localhost:3000）の全画面をチェック"
Write-Host ""

# 例2: ステージング環境のチェック
Write-Host "例2: ステージング環境のチェック" -ForegroundColor Green
Write-Host "コマンド: npm run check-screens:staging"
Write-Host "説明: ステージング環境の全画面をチェック"
Write-Host ""

# 例3: 結果をファイルに保存
Write-Host "例3: 結果をファイルに保存" -ForegroundColor Green
Write-Host "コマンド: `$env:OUTPUT_FILE='check-results.json'; npm run check-screens"
Write-Host "説明: JSON形式で結果を保存（HTMLも自動生成）"
Write-Host ""

# 例4: HTML形式のみ出力
Write-Host "例4: HTML形式のみ出力" -ForegroundColor Green
Write-Host "コマンド: `$env:OUTPUT_FORMAT='html'; npm run check-screens | Out-File report.html"
Write-Host "説明: HTMLレポートをファイルに保存"
Write-Host ""

# 例5: 高度版（スクリーンショット付き）
Write-Host "例5: 高度版（スクリーンショット付き）" -ForegroundColor Green
Write-Host "コマンド: npm run check-screens:advanced"
Write-Host "説明: Puppeteerを使用した詳細チェック（スクリーンショット付き）"
Write-Host ""

# 例6: カスタムURL
Write-Host "例6: カスタムURLを指定" -ForegroundColor Green
Write-Host "コマンド: `$env:BASE_URL='https://example.com'; npm run check-screens"
Write-Host "説明: 任意のURLをチェック対象に指定"
Write-Host ""

# 実際に実行する例
Write-Host "実際に実行してみますか？ (y/n)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "実行中..." -ForegroundColor Green
    Write-Host ""
    
    # サーバーが起動しているか確認
    try {
        $result = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($result.StatusCode -eq 200) {
            Write-Host "✓ ローカルサーバーに接続できました" -ForegroundColor Green
            Write-Host ""
            npm run check-screens
        }
    } catch {
        Write-Host "✗ ローカルサーバーに接続できませんでした" -ForegroundColor Red
        Write-Host "まず 'npm run dev' でサーバーを起動してください"
        Write-Host ""
        Write-Host "または、ステージング環境をチェックしますか？ (y/n)" -ForegroundColor Yellow
        $staging_response = Read-Host
        if ($staging_response -eq 'y' -or $staging_response -eq 'Y') {
            npm run check-screens:staging
        }
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "詳細な使い方は scripts/USAGE_GUIDE.md を参照してください" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan




