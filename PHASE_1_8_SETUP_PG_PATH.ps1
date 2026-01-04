# Phase 1.8: PostgreSQLコマンドのPATH設定スクリプト
# このスクリプトを実行すると、PostgreSQLコマンドが使用可能になります

Write-Host "=== PostgreSQL PATH設定 ===" -ForegroundColor Cyan

# PostgreSQLのbinディレクトリをPATHに追加
$pgBinPath = "C:\Program Files\PostgreSQL\18\bin"

# 既にPATHに含まれているか確認
if ($env:Path -notlike "*$pgBinPath*") {
    Write-Host "PATHに追加中: $pgBinPath" -ForegroundColor Yellow
    $env:Path += ";$pgBinPath"
} else {
    Write-Host "PATHに既に含まれています: $pgBinPath" -ForegroundColor Green
}

# 動作確認
Write-Host "`n=== 動作確認 ===" -ForegroundColor Cyan
try {
    $pgRestoreVersion = pg_restore --version 2>&1
    Write-Host "✓ pg_restore: $pgRestoreVersion" -ForegroundColor Green
    
    $psqlVersion = psql --version 2>&1
    Write-Host "✓ psql: $psqlVersion" -ForegroundColor Green
    
    Write-Host "`n=== 準備完了 ===" -ForegroundColor Green
    Write-Host "PostgreSQLコマンドが使用可能です！" -ForegroundColor Green
} catch {
    Write-Host "✗ エラー: $_" -ForegroundColor Red
    Write-Host "PostgreSQLが正しくインストールされているか確認してください。" -ForegroundColor Yellow
}

Write-Host "`n=== 次のステップ ===" -ForegroundColor Cyan
Write-Host "1. 展開したディレクトリに移動:" -ForegroundColor White
Write-Host "   cd tmp\2026-01-03T15:42Z\fleapay_prod_db" -ForegroundColor Gray
Write-Host "`n2. Supabase接続情報を設定:" -ForegroundColor White
Write-Host "   `$SUPABASE_URL = 'postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres'" -ForegroundColor Gray
Write-Host "`n3. pg_restoreでインポート:" -ForegroundColor White
Write-Host "   pg_restore --dbname=`$SUPABASE_URL --verbose --clean --no-owner --no-privileges ." -ForegroundColor Gray

