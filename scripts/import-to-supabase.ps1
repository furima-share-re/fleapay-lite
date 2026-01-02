# Supabase にデータをインポートするスクリプト（PowerShell版）
# 使用方法: .\scripts\import-to-supabase.ps1 -SupabaseDatabaseUrl "postgresql://..."

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseDatabaseUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$DataDir = "."
)

Write-Host "📥 Supabaseへのデータインポートを開始します..." -ForegroundColor Cyan
Write-Host "接続先: $SupabaseDatabaseUrl" -ForegroundColor Gray

# インポート順序（親→子の順、外部キー制約を考慮）
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

$importedTables = @()
$failedTables = @()

foreach ($table in $tables) {
    $csvFile = Join-Path $DataDir "$table.csv"
    
    if (-not (Test-Path $csvFile)) {
        Write-Host "  ⚠️  $table.csv が見つかりません。スキップします。" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "`n  [$($tables.IndexOf($table) + 1)/$($tables.Count)] $table をインポート中..." -ForegroundColor Yellow
    
    try {
        # 一時的なSQLファイルを作成
        $tempSqlFile = Join-Path $env:TEMP "copy_$table.sql"
        "\COPY $table FROM '$csvFile' WITH (FORMAT CSV, HEADER)" | Out-File -FilePath $tempSqlFile -Encoding utf8 -NoNewline
        
        # psqlで実行
        $result = psql $SupabaseDatabaseUrl -f $tempSqlFile 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ $table のインポートが完了しました" -ForegroundColor Green
            $importedTables += $table
        } else {
            Write-Host "    ❌ $table のインポートに失敗しました" -ForegroundColor Red
            Write-Host "       エラー: $result" -ForegroundColor DarkRed
            $failedTables += $table
        }
        
        # 一時ファイルを削除
        if (Test-Path $tempSqlFile) {
            Remove-Item $tempSqlFile -Force
        }
    } catch {
        Write-Host "    ❌ $table のインポートでエラーが発生しました: $_" -ForegroundColor Red
        $failedTables += $table
    }
}

Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "インポート結果" -ForegroundColor Cyan
Write-Host "="*50 -ForegroundColor Cyan

if ($importedTables.Count -gt 0) {
    Write-Host "`n✅ 成功したテーブル ($($importedTables.Count)):" -ForegroundColor Green
    foreach ($table in $importedTables) {
        Write-Host "  - $table" -ForegroundColor White
    }
}

if ($failedTables.Count -gt 0) {
    Write-Host "`n❌ 失敗したテーブル ($($failedTables.Count)):" -ForegroundColor Red
    foreach ($table in $failedTables) {
        Write-Host "  - $table" -ForegroundColor White
    }
    Write-Host "`n⚠️  エラーログを確認し、手動でインポートしてください。" -ForegroundColor Yellow
} else {
    Write-Host "`n✅ すべてのテーブルのインポートが完了しました！" -ForegroundColor Green
}

Write-Host "`n次のステップ:" -ForegroundColor Cyan
Write-Host "  1. Supabase SQL Editor でデータ整合性をチェック" -ForegroundColor White
Write-Host "  2. .env ファイルを更新して DATABASE_URL を Supabase に変更" -ForegroundColor White
Write-Host "  3. npx prisma db pull で Prisma スキーマを生成" -ForegroundColor White

