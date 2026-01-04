# Phase 1.8: データ移行実行スクリプト
# このスクリプトを実行すると、データ移行が開始されます

Write-Host "=== Phase 1.8: データ移行実行 ===" -ForegroundColor Cyan

# Step 1: PATH設定
Write-Host "`nStep 1: PATH設定中..." -ForegroundColor Yellow
$pgBinPath = "C:\Program Files\PostgreSQL\18\bin"
if ($env:Path -notlike "*$pgBinPath*") {
    $env:Path += ";$pgBinPath"
    Write-Host "✓ PATHに追加しました: $pgBinPath" -ForegroundColor Green
} else {
    Write-Host "✓ PATHに既に含まれています" -ForegroundColor Green
}

# Step 2: 動作確認
Write-Host "`nStep 2: PostgreSQLコマンドの動作確認..." -ForegroundColor Yellow
try {
    $pgRestoreVersion = pg_restore --version 2>&1
    Write-Host "✓ pg_restore: $pgRestoreVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ エラー: pg_restoreが見つかりません" -ForegroundColor Red
    Write-Host "PostgreSQLが正しくインストールされているか確認してください。" -ForegroundColor Yellow
    exit 1
}

# Step 3: ディレクトリ移動
Write-Host "`nStep 3: ディレクトリ移動中..." -ForegroundColor Yellow
$backupDir = "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"
if (Test-Path $backupDir) {
    Set-Location $backupDir
    Write-Host "✓ ディレクトリに移動しました: $backupDir" -ForegroundColor Green
} else {
    Write-Host "✗ エラー: ディレクトリが見つかりません: $backupDir" -ForegroundColor Red
    exit 1
}

# Step 4: 接続URL設定
Write-Host "`nStep 4: Supabase接続URL設定中..." -ForegroundColor Yellow
$password = ".cx2eeaZJ55Qp@f"
$projectId = "mluvjdhqgfpcefsmvjae"

# Direct Connection URL（pg_restore用）
# パスワードに特殊文字が含まれているため、URLエンコードを試みる
try {
    Add-Type -AssemblyName System.Web
    $encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
} catch {
    # URLエンコードが失敗した場合は、そのまま使用
    $encodedPassword = $password
    Write-Host "⚠ URLエンコードに失敗しました。パスワードをそのまま使用します。" -ForegroundColor Yellow
}

# Direct Connection URL（ポート5432）
$SUPABASE_URL = "postgresql://postgres:$encodedPassword@db.$projectId.supabase.co:5432/postgres"
Write-Host "✓ 接続URLを設定しました" -ForegroundColor Green
Write-Host "  接続先: db.$projectId.supabase.co:5432" -ForegroundColor Gray

# Step 5: 接続テスト（オプション）
Write-Host "`nStep 5: 接続テスト中..." -ForegroundColor Yellow
try {
    $testResult = psql $SUPABASE_URL -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 接続テスト成功" -ForegroundColor Green
    } else {
        Write-Host "⚠ 接続テストでエラーが発生しましたが、続行します。" -ForegroundColor Yellow
        Write-Host "  エラー: $testResult" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠ 接続テストをスキップします。" -ForegroundColor Yellow
}

# Step 6: データインポート実行
Write-Host "`nStep 6: データインポート開始..." -ForegroundColor Cyan
Write-Host "  この処理には5-10分かかる場合があります。" -ForegroundColor Yellow
Write-Host "  実行中は、以下のようなメッセージが表示されます:" -ForegroundColor Gray
Write-Host "    処理中: SCHEMA public" -ForegroundColor Gray
Write-Host "    処理中: TABLE sellers" -ForegroundColor Gray
Write-Host "    処理中: TABLE orders" -ForegroundColor Gray
Write-Host "    ..." -ForegroundColor Gray
Write-Host ""

# ユーザーに確認
$confirmation = Read-Host "データインポートを開始しますか？ (Y/N)"
if ($confirmation -ne "Y" -and $confirmation -ne "y") {
    Write-Host "データインポートをキャンセルしました。" -ForegroundColor Yellow
    exit 0
}

Write-Host "`nデータインポートを開始します..." -ForegroundColor Cyan
Write-Host "接続URL: postgresql://postgres:***@db.$projectId.supabase.co:5432/postgres" -ForegroundColor Gray

# pg_restore実行
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ データインポートが完了しました！" -ForegroundColor Green
} else {
    Write-Host "`n✗ データインポートでエラーが発生しました。" -ForegroundColor Red
    Write-Host "エラーコード: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host "`nトラブルシューティング:" -ForegroundColor Yellow
    Write-Host "1. 接続URLが正しいか確認してください" -ForegroundColor Gray
    Write-Host "2. Supabaseのファイアウォール設定を確認してください" -ForegroundColor Gray
    Write-Host "3. パスワードが正しいか確認してください" -ForegroundColor Gray
    exit 1
}

Write-Host "`n=== 完了 ===" -ForegroundColor Green

