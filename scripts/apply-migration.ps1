# マイグレーション自動適用スクリプト (PowerShell版)
#
# 使用方法:
#   .\scripts\apply-migration.ps1 -MigrationFile "supabase\migrations\20260106_120000_add_products_table.sql"
#
# 例:
#   .\scripts\apply-migration.ps1 -MigrationFile "supabase\migrations\20260106_120000_add_products_table.sql"

param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationFile
)

# プロジェクトルートを取得
$projectRoot = Split-Path -Parent $PSScriptRoot
$migrationPath = Join-Path $projectRoot $MigrationFile

# ファイルの存在確認
if (-not (Test-Path $migrationPath)) {
    Write-Host "❌ エラー: ファイルが見つかりません: $MigrationFile" -ForegroundColor Red
    Write-Host "   パス: $migrationPath" -ForegroundColor Red
    exit 1
}

Write-Host "📄 マイグレーションファイル: $MigrationFile" -ForegroundColor Cyan
$fileSize = (Get-Item $migrationPath).Length
Write-Host "📏 ファイルサイズ: $fileSize バイト" -ForegroundColor Cyan
Write-Host ""

# DATABASE_URL環境変数を確認
$databaseUrl = $env:DATABASE_URL

if (-not $databaseUrl) {
    Write-Host "❌ エラー: DATABASE_URL環境変数が設定されていません" -ForegroundColor Red
    Write-Host ""
    Write-Host "環境変数を設定してください:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL = "postgresql://postgres:password@host:5432/database"' -ForegroundColor Yellow
    Write-Host ""
    Write-Host "または、.envファイルに設定してください" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔗 データベース接続: 確認済み" -ForegroundColor Green
Write-Host ""

# psqlコマンドが利用可能か確認
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ エラー: psqlコマンドが見つかりません" -ForegroundColor Red
    Write-Host ""
    Write-Host "PostgreSQLをインストールしてください:" -ForegroundColor Yellow
    Write-Host "  https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "インストール後、PATHに追加されていることを確認してください" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 マイグレーションを実行中..." -ForegroundColor Cyan
Write-Host ""

try {
    # psqlコマンドを実行
    # -v ON_ERROR_STOP=1: エラー時に停止
    # -f: ファイルからSQLを読み込み
    $sqlContent = Get-Content $migrationPath -Raw
    
    # 一時ファイルにSQLを書き込み（PowerShellのエスケープ問題を回避）
    $tempFile = [System.IO.Path]::GetTempFileName()
    $sqlContent | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
    
    try {
        & psql $databaseUrl -v ON_ERROR_STOP=1 -f $tempFile
        
        Write-Host ""
        Write-Host "✅ マイグレーションが正常に完了しました" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 次のステップ: Prismaスキーマを更新してください" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   npx prisma db pull" -ForegroundColor Cyan
        Write-Host "   npx prisma generate" -ForegroundColor Cyan
        Write-Host ""
    } finally {
        # 一時ファイルを削除
        Remove-Item $tempFile -ErrorAction SilentlyContinue
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ マイグレーションの実行に失敗しました" -ForegroundColor Red
    Write-Host ""
    Write-Host "エラー詳細:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "確認事項:" -ForegroundColor Yellow
    Write-Host "  - DATABASE_URLが正しいか確認してください" -ForegroundColor Yellow
    Write-Host "  - psqlコマンドがインストールされているか確認してください" -ForegroundColor Yellow
    Write-Host "  - データベースに接続できるか確認してください" -ForegroundColor Yellow
    exit 1
}

