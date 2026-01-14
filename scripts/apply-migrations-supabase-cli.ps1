# Supabase CLIを使用したマイグレーション適用スクリプト
#
# 使用方法:
#   .\scripts\apply-migrations-supabase-cli.ps1 -Environment staging
#   .\scripts\apply-migrations-supabase-cli.ps1 -Environment production
#
# 環境変数の設定が必要:
#   $env:SUPABASE_ACCESS_TOKEN = "your-access-token"
#   $env:SUPABASE_PROJECT_ID_STAGING = "mluvjdhqgfpcfsmvjae"  # 検証環境
#   $env:SUPABASE_PROJECT_ID_PRODUCTION = "your-production-project-id"  # 本番環境

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("staging", "production")]
    [string]$Environment
)

# プロジェクトルートを取得
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ""
Write-Host "🚀 Supabase CLIを使用したマイグレーション適用" -ForegroundColor Cyan
Write-Host "   環境: $Environment" -ForegroundColor Cyan
Write-Host ""

# 環境変数の確認
$accessToken = $env:SUPABASE_ACCESS_TOKEN
if (-not $accessToken) {
    Write-Host "❌ エラー: SUPABASE_ACCESS_TOKEN環境変数が設定されていません" -ForegroundColor Red
    Write-Host ""
    Write-Host "設定方法:" -ForegroundColor Yellow
    Write-Host '  1. Supabase Dashboard → Account Settings → Access Tokens' -ForegroundColor Yellow
    Write-Host '  2. Generate new token をクリック' -ForegroundColor Yellow
    Write-Host '  3. トークンをコピー' -ForegroundColor Yellow
    Write-Host '  4. PowerShellで実行: $env:SUPABASE_ACCESS_TOKEN = "your-token"' -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Project IDの取得
$projectId = if ($Environment -eq "staging") {
    $env:SUPABASE_PROJECT_ID_STAGING
} else {
    $env:SUPABASE_PROJECT_ID_PRODUCTION
}

if (-not $projectId) {
    Write-Host "❌ エラー: SUPABASE_PROJECT_ID_$($Environment.ToUpper())環境変数が設定されていません" -ForegroundColor Red
    Write-Host ""
    Write-Host "設定方法:" -ForegroundColor Yellow
    if ($Environment -eq "staging") {
        Write-Host '  $env:SUPABASE_PROJECT_ID_STAGING = "mluvjdhqgfpcfsmvjae"' -ForegroundColor Yellow
    } else {
        Write-Host '  $env:SUPABASE_PROJECT_ID_PRODUCTION = "your-production-project-id"' -ForegroundColor Yellow
    }
    Write-Host ""
    exit 1
}

Write-Host "✅ 環境変数の確認完了" -ForegroundColor Green
Write-Host "   Access Token: 設定済み" -ForegroundColor Gray
Write-Host "   Project ID: $projectId" -ForegroundColor Gray
Write-Host ""

# Supabase CLIの確認
Write-Host "🔍 Supabase CLIの確認中..." -ForegroundColor Cyan
try {
    $cliVersion = npx supabase --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Supabase CLIが見つかりません"
    }
    Write-Host "   $cliVersion" -ForegroundColor Gray
} catch {
    Write-Host "❌ エラー: Supabase CLIが見つかりません" -ForegroundColor Red
    Write-Host ""
    Write-Host "インストール方法:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor Yellow
    Write-Host "  または" -ForegroundColor Yellow
    Write-Host "  npx supabase --version  # npxを使用（推奨）" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""

# マイグレーションファイルの確認
$migrationsDir = Join-Path $projectRoot "supabase\migrations"
if (-not (Test-Path $migrationsDir)) {
    Write-Host "❌ エラー: マイグレーションディレクトリが見つかりません: $migrationsDir" -ForegroundColor Red
    exit 1
}

$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name
Write-Host "📄 マイグレーションファイル: $($migrationFiles.Count) 件" -ForegroundColor Cyan
foreach ($file in $migrationFiles) {
    Write-Host "   - $($file.Name)" -ForegroundColor Gray
}
Write-Host ""

# プロジェクトにリンク
Write-Host "🔗 Supabaseプロジェクトにリンク中..." -ForegroundColor Cyan
try {
    $env:SUPABASE_ACCESS_TOKEN = $accessToken
    $env:SUPABASE_PROJECT_ID = $projectId
    
    npx supabase link --project-ref $projectId 2>&1 | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Gray
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "プロジェクトのリンクに失敗しました"
    }
    
    Write-Host "✅ プロジェクトにリンクしました" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ エラー: プロジェクトのリンクに失敗しました" -ForegroundColor Red
    Write-Host ""
    Write-Host "確認事項:" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_ACCESS_TOKENが正しいか確認してください" -ForegroundColor Yellow
    Write-Host "  - Project IDが正しいか確認してください" -ForegroundColor Yellow
    Write-Host "  - インターネット接続を確認してください" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "エラー詳細: $_" -ForegroundColor Red
    exit 1
}

# マイグレーションを適用
Write-Host "🚀 マイグレーションを適用中..." -ForegroundColor Cyan
Write-Host ""
try {
    $env:SUPABASE_ACCESS_TOKEN = $accessToken
    
    npx supabase db push 2>&1 | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Gray
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "マイグレーションの適用に失敗しました"
    }
    
    Write-Host ""
    Write-Host "✅ マイグレーションが正常に適用されました！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 次のステップ:" -ForegroundColor Yellow
    Write-Host "   1. データベースでテーブルが作成されたか確認" -ForegroundColor Yellow
    Write-Host "   2. APIエンドポイントの動作を確認" -ForegroundColor Yellow
    Write-Host "   3. Prismaスキーマを更新（必要に応じて）:" -ForegroundColor Yellow
    Write-Host "      npx prisma db pull" -ForegroundColor Cyan
    Write-Host "      npx prisma generate" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ エラー: マイグレーションの適用に失敗しました" -ForegroundColor Red
    Write-Host ""
    Write-Host "確認事項:" -ForegroundColor Yellow
    Write-Host "  - マイグレーションファイルに構文エラーがないか確認してください" -ForegroundColor Yellow
    Write-Host "  - 既存のテーブルと競合していないか確認してください" -ForegroundColor Yellow
    Write-Host "  - Supabase Dashboardのログを確認してください" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "エラー詳細: $_" -ForegroundColor Red
    exit 1
}
