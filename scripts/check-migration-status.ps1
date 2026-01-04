# データベース移行の成功をチェックするスクリプト（PowerShell版）
# 使用方法: .\scripts\check-migration-status.ps1 [DATABASE_URL]
# 環境変数DATABASE_URLが設定されている場合は、引数は省略可能

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) {
    Write-Host "❌ エラー: DATABASE_URLが指定されていません" -ForegroundColor Red
    Write-Host "使用方法: .\scripts\check-migration-status.ps1 [DATABASE_URL]" -ForegroundColor Yellow
    Write-Host "または環境変数DATABASE_URLを設定してください" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔍 データベース移行の状態をチェックします..." -ForegroundColor Cyan
Write-Host "接続先: $($DatabaseUrl -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
Write-Host ""

$errors = @()
$warnings = @()
$success = @()

# 1. sellersテーブルのカラム存在確認
Write-Host "📋 ステップ1: sellersテーブルのスキーマ確認" -ForegroundColor Yellow
try {
    $columnCheckQuery = @"
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sellers' 
    AND column_name IN ('auth_provider', 'supabase_user_id')
ORDER BY column_name;
"@
    
    $columnResult = psql $DatabaseUrl -t -c $columnCheckQuery 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        $errors += "sellersテーブルのカラム確認に失敗しました"
        Write-Host "  ❌ エラー: $columnResult" -ForegroundColor Red
    } else {
        $columns = $columnResult | Where-Object { $_ -match '\S' } | ForEach-Object { $_.Trim() }
        
        $hasAuthProvider = $false
        $hasSupabaseUserId = $false
        
        foreach ($line in $columns) {
            if ($line -match 'auth_provider') {
                $hasAuthProvider = $true
                Write-Host "  ✅ auth_provider カラムが存在します" -ForegroundColor Green
                Write-Host "     詳細: $line" -ForegroundColor Gray
            }
            if ($line -match 'supabase_user_id') {
                $hasSupabaseUserId = $true
                Write-Host "  ✅ supabase_user_id カラムが存在します" -ForegroundColor Green
                Write-Host "     詳細: $line" -ForegroundColor Gray
            }
        }
        
        if (-not $hasAuthProvider) {
            $errors += "auth_providerカラムが存在しません"
            Write-Host "  ❌ auth_provider カラムが見つかりません" -ForegroundColor Red
        }
        if (-not $hasSupabaseUserId) {
            $errors += "supabase_user_idカラムが存在しません"
            Write-Host "  ❌ supabase_user_id カラムが見つかりません" -ForegroundColor Red
        }
    }
} catch {
    $errors += "sellersテーブルの確認中にエラーが発生しました: $_"
    Write-Host "  ❌ エラー: $_" -ForegroundColor Red
}

Write-Host ""

# 2. インデックスの確認
Write-Host "📋 ステップ2: インデックスの確認" -ForegroundColor Yellow
try {
    $indexCheckQuery = @"
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'sellers' 
    AND indexname = 'sellers_supabase_user_id_idx';
"@
    
    $indexResult = psql $DatabaseUrl -t -c $indexCheckQuery 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        $warnings += "インデックスの確認に失敗しました"
        Write-Host "  ⚠️  警告: $indexResult" -ForegroundColor Yellow
    } else {
        $indexes = $indexResult | Where-Object { $_ -match '\S' } | ForEach-Object { $_.Trim() }
        
        if ($indexes.Count -gt 0) {
            Write-Host "  ✅ sellers_supabase_user_id_idx インデックスが存在します" -ForegroundColor Green
            foreach ($idx in $indexes) {
                Write-Host "     詳細: $idx" -ForegroundColor Gray
            }
        } else {
            $warnings += "sellers_supabase_user_id_idxインデックスが見つかりません"
            Write-Host "  ⚠️  sellers_supabase_user_id_idx インデックスが見つかりません" -ForegroundColor Yellow
        }
    }
} catch {
    $warnings += "インデックスの確認中にエラーが発生しました: $_"
    Write-Host "  ⚠️  警告: $_" -ForegroundColor Yellow
}

Write-Host ""

# 3. データの確認（auth_providerのデフォルト値）
Write-Host "📋 ステップ3: データの確認" -ForegroundColor Yellow
try {
    $dataCheckQuery = @"
SELECT 
    COUNT(*) as total_sellers,
    COUNT(CASE WHEN auth_provider IS NULL THEN 1 END) as null_auth_provider,
    COUNT(CASE WHEN auth_provider = 'bcryptjs' THEN 1 END) as bcryptjs_count,
    COUNT(CASE WHEN auth_provider = 'supabase' THEN 1 END) as supabase_count,
    COUNT(CASE WHEN supabase_user_id IS NOT NULL THEN 1 END) as has_supabase_user_id
FROM sellers;
"@
    
    $dataResult = psql $DatabaseUrl -t -c $dataCheckQuery 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        $warnings += "データの確認に失敗しました"
        Write-Host "  ⚠️  警告: $dataResult" -ForegroundColor Yellow
    } else {
        $dataLines = $dataResult | Where-Object { $_ -match '\S' } | ForEach-Object { $_.Trim() }
        
        if ($dataLines.Count -gt 0) {
            $dataLine = $dataLines[0]
            $values = $dataLine -split '\|' | ForEach-Object { $_.Trim() }
            
            if ($values.Count -ge 5) {
                $total = $values[0]
                $nullCount = $values[1]
                $bcryptjsCount = $values[2]
                $supabaseCount = $values[3]
                $hasSupabaseUserId = $values[4]
                
                Write-Host "  ✅ データ統計:" -ForegroundColor Green
                Write-Host "     総売主数: $total" -ForegroundColor Gray
                Write-Host "     auth_provider=NULL: $nullCount" -ForegroundColor $(if ($nullCount -gt 0) { "Yellow" } else { "Gray" })
                Write-Host "     auth_provider='bcryptjs': $bcryptjsCount" -ForegroundColor Gray
                Write-Host "     auth_provider='supabase': $supabaseCount" -ForegroundColor Gray
                Write-Host "     supabase_user_id設定済み: $hasSupabaseUserId" -ForegroundColor Gray
                
                if ($nullCount -gt 0) {
                    $warnings += "$nullCount件のauth_providerがNULLです"
                }
            }
        }
    }
} catch {
    $warnings += "データの確認中にエラーが発生しました: $_"
    Write-Host "  ⚠️  警告: $_" -ForegroundColor Yellow
}

Write-Host ""

# 4. コメントの確認（オプション）
Write-Host "📋 ステップ4: カラムコメントの確認" -ForegroundColor Yellow
try {
    $commentQuery = @"
SELECT 
    col_description('sellers'::regclass, 
        (SELECT ordinal_position 
         FROM information_schema.columns 
         WHERE table_name = 'sellers' AND column_name = 'auth_provider'))
    as auth_provider_comment,
    col_description('sellers'::regclass, 
        (SELECT ordinal_position 
         FROM information_schema.columns 
         WHERE table_name = 'sellers' AND column_name = 'supabase_user_id'))
    as supabase_user_id_comment;
"@
    
    $commentResult = psql $DatabaseUrl -t -c $commentQuery 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $comments = $commentResult | Where-Object { $_ -match '\S' } | ForEach-Object { $_.Trim() }
        if ($comments.Count -gt 0 -and $comments[0] -match '\S') {
            Write-Host "  ✅ カラムコメントが設定されています" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  カラムコメントが設定されていません（オプション）" -ForegroundColor Gray
        }
    }
} catch {
    # コメントの確認は失敗しても問題なし
    Write-Host "  ⚠️  コメントの確認をスキップしました" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan

# 結果サマリー
Write-Host "`n📊 チェック結果サマリー" -ForegroundColor Cyan

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ すべてのチェックが成功しました！" -ForegroundColor Green
    Write-Host "   マイグレーションは正常に適用されています。" -ForegroundColor Green
    exit 0
} elseif ($errors.Count -eq 0) {
    Write-Host "⚠️  警告が $($warnings.Count) 件ありますが、マイグレーションは適用されています。" -ForegroundColor Yellow
    Write-Host "`n警告内容:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  - $warning" -ForegroundColor White
    }
    exit 0
} else {
    Write-Host "❌ エラーが $($errors.Count) 件見つかりました。" -ForegroundColor Red
    Write-Host "   マイグレーションが正しく適用されていない可能性があります。`n" -ForegroundColor Red
    
    Write-Host "エラー内容:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor White
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "`n警告内容:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor White
        }
    }
    
    Write-Host "`n💡 対処方法:" -ForegroundColor Cyan
    Write-Host "   1. Supabase Dashboard > SQL Editor でマイグレーションファイルを確認" -ForegroundColor White
    Write-Host "   2. supabase/migrations/20260102_add_auth_provider_columns.sql を再実行" -ForegroundColor White
    Write-Host "   3. エラーメッセージを確認して問題を修正" -ForegroundColor White
    
    exit 1
}

