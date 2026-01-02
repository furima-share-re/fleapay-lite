# Render PostgreSQL からスキーマとデータをダンプするスクリプト（PowerShell版）
# 使用方法: .\scripts\dump-render-db.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$RenderDatabaseUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "."
)

# 出力ディレクトリを作成
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

Write-Host "📦 Render DBからのダンプを開始します..." -ForegroundColor Cyan
Write-Host "接続先: $RenderDatabaseUrl" -ForegroundColor Gray

# スキーマのみダンプ
Write-Host "`n[1/2] スキーマをダンプしています..." -ForegroundColor Yellow
$schemaFile = Join-Path $OutputDir "schema.sql"
try {
    pg_dump $RenderDatabaseUrl --schema-only --no-owner --no-privileges -f $schemaFile
    Write-Host "✅ スキーマダンプ完了: $schemaFile" -ForegroundColor Green
} catch {
    Write-Host "❌ スキーマダンプに失敗しました: $_" -ForegroundColor Red
    exit 1
}

# データをCSV形式でダンプ（テーブルごと）
Write-Host "`n[2/2] データをダンプしています..." -ForegroundColor Yellow

$tables = @(
    "frames",
    "sellers",
    "orders",
    "order_items",
    "images",
    "stripe_payments",
    "qr_sessions",
    "buyer_attributes",
    "order_metadata",
    "kids_achievements"
)

$exportedTables = @()

foreach ($table in $tables) {
    $csvFile = Join-Path $OutputDir "$table.csv"
    Write-Host "  - $table をエクスポート中..." -ForegroundColor Gray
    
    try {
        # 一時的なSQLファイルを作成
        $tempSqlFile = Join-Path $env:TEMP "copy_$table.sql"
        "\COPY $table TO '$csvFile' WITH (FORMAT CSV, HEADER)" | Out-File -FilePath $tempSqlFile -Encoding utf8 -NoNewline
        
        # psqlで実行
        $result = psql $RenderDatabaseUrl -f $tempSqlFile 2>&1
        if ($LASTEXITCODE -eq 0 -and (Test-Path $csvFile)) {
            Write-Host "    ✅ $table.csv を作成しました" -ForegroundColor Green
            $exportedTables += $table
        } else {
            Write-Host "    ⚠️  $table のエクスポートをスキップしました（テーブルが存在しない可能性があります）" -ForegroundColor Yellow
        }
        
        # 一時ファイルを削除
        if (Test-Path $tempSqlFile) {
            Remove-Item $tempSqlFile -Force
        }
    } catch {
        Write-Host "    ⚠️  $table のエクスポートでエラーが発生しました: $_" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ ダンプ完了！" -ForegroundColor Green
Write-Host "`n生成されたファイル:" -ForegroundColor Cyan
Write-Host "  - schema.sql" -ForegroundColor White
foreach ($table in $exportedTables) {
    Write-Host "  - $table.csv" -ForegroundColor White
}

Write-Host "`n次のステップ:" -ForegroundColor Cyan
Write-Host "  1. schema.sql を開き、CREATE EXTENSION、OWNER、GRANT/REVOKE行を削除" -ForegroundColor White
Write-Host "  2. Supabase SQL Editor で schema.sql を実行" -ForegroundColor White
Write-Host "  3. scripts\import-to-supabase.ps1 を使用してデータをインポート" -ForegroundColor White

