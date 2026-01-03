# Next.jsデプロイ診断スクリプト
# 使用方法: .\scripts\diagnose-nextjs-deployment.ps1

param(
    [string]$BaseUrl = "https://fleapay-lite-t1.onrender.com"
)

$ErrorActionPreference = "Continue"
$diagnostics = @()

function Write-Diagnostic {
    param(
        [string]$Category,
        [string]$Check,
        [string]$Status,
        [string]$Message,
        [object]$Details = $null
    )
    
    $diagnostic = @{
        Category = $Category
        Check = $Check
        Status = $Status
        Message = $Message
        Details = $Details
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    
    $diagnostics += $diagnostic
    
    $color = switch ($Status) {
        "✅" { "Green" }
        "⚠️" { "Yellow" }
        "❌" { "Red" }
        default { "White" }
    }
    
    Write-Host "[$Status] $Category - $Check" -ForegroundColor $color
    if ($Message) {
        Write-Host "   $Message" -ForegroundColor Gray
    }
    if ($Details) {
        Write-Host "   詳細: $($Details | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
}

Write-Host "`n🔍 Next.jsデプロイ診断を開始します`n" -ForegroundColor Green
Write-Host "ベースURL: $BaseUrl`n" -ForegroundColor Yellow

# 1. Next.jsのビルド確認
Write-Host "`n📦 1. Next.jsのビルド確認`n" -ForegroundColor Magenta

if (Test-Path ".next") {
    $nextBuildInfo = Get-ChildItem ".next" -ErrorAction SilentlyContinue
    if ($nextBuildInfo) {
        Write-Diagnostic -Category "ビルド" -Check ".nextディレクトリの存在" -Status "✅" -Message ".nextディレクトリが存在します"
        
        # .next/BUILD_IDの確認
        if (Test-Path ".next/BUILD_ID") {
            $buildId = Get-Content ".next/BUILD_ID" -ErrorAction SilentlyContinue
            Write-Diagnostic -Category "ビルド" -Check "BUILD_ID" -Status "✅" -Message "BUILD_ID: $buildId"
        } else {
            Write-Diagnostic -Category "ビルド" -Check "BUILD_ID" -Status "⚠️" -Message "BUILD_IDが見つかりません（ビルドが完了していない可能性）"
        }
        
        # .next/standaloneの確認（standaloneビルド）
        if (Test-Path ".next/standalone") {
            Write-Diagnostic -Category "ビルド" -Check "standaloneビルド" -Status "✅" -Message "standaloneビルドが存在します"
        } else {
            Write-Diagnostic -Category "ビルド" -Check "standaloneビルド" -Status "⚠️" -Message "standaloneビルドが見つかりません（next.config.jsのoutput設定を確認）"
        }
    } else {
        Write-Diagnostic -Category "ビルド" -Check ".nextディレクトリ" -Status "❌" -Message ".nextディレクトリが存在しません（`npm run build`を実行してください）"
    }
} else {
    Write-Diagnostic -Category "ビルド" -Check ".nextディレクトリ" -Status "❌" -Message ".nextディレクトリが存在しません（`npm run build`を実行してください）"
}

# 2. package.jsonの確認
Write-Host "`n📄 2. package.jsonの確認`n" -ForegroundColor Magenta

if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    
    # Next.js依存関係の確認
    $hasNext = $packageJson.dependencies.PSObject.Properties.Name -contains "next"
    $hasReact = $packageJson.dependencies.PSObject.Properties.Name -contains "react"
    $hasReactDom = $packageJson.dependencies.PSObject.Properties.Name -contains "react-dom"
    
    if ($hasNext) {
        $nextVersion = $packageJson.dependencies.next
        Write-Diagnostic -Category "依存関係" -Check "Next.js" -Status "✅" -Message "Next.js $nextVersion がインストールされています"
    } else {
        Write-Diagnostic -Category "依存関係" -Check "Next.js" -Status "❌" -Message "Next.jsがインストールされていません"
    }
    
    if ($hasReact) {
        $reactVersion = $packageJson.dependencies.react
        Write-Diagnostic -Category "依存関係" -Check "React" -Status "✅" -Message "React $reactVersion がインストールされています"
    } else {
        Write-Diagnostic -Category "依存関係" -Check "React" -Status "❌" -Message "Reactがインストールされていません"
    }
    
    # ビルドスクリプトの確認
    $hasBuildScript = $packageJson.scripts.PSObject.Properties.Name -contains "build"
    if ($hasBuildScript) {
        $buildScript = $packageJson.scripts.build
        Write-Diagnostic -Category "スクリプト" -Check "buildスクリプト" -Status "✅" -Message "buildスクリプト: $buildScript"
    } else {
        Write-Diagnostic -Category "スクリプト" -Check "buildスクリプト" -Status "❌" -Message "buildスクリプトが定義されていません"
    }
    
    # startスクリプトの確認
    $hasStartScript = $packageJson.scripts.PSObject.Properties.Name -contains "start"
    if ($hasStartScript) {
        $startScript = $packageJson.scripts.start
        Write-Diagnostic -Category "スクリプト" -Check "startスクリプト" -Status "✅" -Message "startスクリプト: $startScript"
        
        if ($startScript -like "*server.js*") {
            Write-Diagnostic -Category "スクリプト" -Check "startスクリプト（Express）" -Status "⚠️" -Message "Expressサーバーを起動しています（Next.js統合が必要）"
        } elseif ($startScript -like "*next*") {
            Write-Diagnostic -Category "スクリプト" -Check "startスクリプト（Next.js）" -Status "✅" -Message "Next.jsサーバーを起動しています"
        }
    } else {
        Write-Diagnostic -Category "スクリプト" -Check "startスクリプト" -Status "❌" -Message "startスクリプトが定義されていません"
    }
}

# 3. render.yamlの確認
Write-Host "`n⚙️ 3. render.yamlの確認`n" -ForegroundColor Magenta

if (Test-Path "render.yaml") {
    $renderYaml = Get-Content "render.yaml" -Raw
    
    # buildCommandの確認
    if ($renderYaml -match "buildCommand:\s*(.+)") {
        $buildCommand = $matches[1].Trim()
        Write-Diagnostic -Category "デプロイ設定" -Check "buildCommand" -Status "✅" -Message "buildCommand: $buildCommand"
        
        if ($buildCommand -notlike "*next build*" -and $buildCommand -notlike "*npm run build*") {
            Write-Diagnostic -Category "デプロイ設定" -Check "buildCommand（Next.jsビルド）" -Status "⚠️" -Message "Next.jsビルドが含まれていません（`npm install && npm run build`に変更を推奨）"
        }
    } else {
        Write-Diagnostic -Category "デプロイ設定" -Check "buildCommand" -Status "⚠️" -Message "buildCommandが定義されていません"
    }
    
    # startCommandの確認
    if ($renderYaml -match "startCommand:\s*(.+)") {
        $startCommand = $matches[1].Trim()
        Write-Diagnostic -Category "デプロイ設定" -Check "startCommand" -Status "✅" -Message "startCommand: $startCommand"
        
        if ($startCommand -like "*server.js*") {
            Write-Diagnostic -Category "デプロイ設定" -Check "startCommand（Express）" -Status "⚠️" -Message "Expressサーバーを起動しています（Next.js統合が必要）"
        }
    } else {
        Write-Diagnostic -Category "デプロイ設定" -Check "startCommand" -Status "⚠️" -Message "startCommandが定義されていません"
    }
} else {
    Write-Diagnostic -Category "デプロイ設定" -Check "render.yaml" -Status "⚠️" -Message "render.yamlが存在しません（Render環境の設定を確認）"
}

# 4. next.config.jsの確認
Write-Host "`n📋 4. next.config.jsの確認`n" -ForegroundColor Magenta

if (Test-Path "next.config.js") {
    $nextConfig = Get-Content "next.config.js" -Raw
    
    if ($nextConfig -match "output:\s*['\`"]standalone['\`"]") {
        Write-Diagnostic -Category "Next.js設定" -Check "output: standalone" -Status "✅" -Message "standaloneビルドが有効です"
    } else {
        Write-Diagnostic -Category "Next.js設定" -Check "output: standalone" -Status "⚠️" -Message "standaloneビルドが設定されていません（Express統合に必要）"
    }
} else {
    Write-Diagnostic -Category "Next.js設定" -Check "next.config.js" -Status "❌" -Message "next.config.jsが存在しません"
}

# 5. server.jsのNext.js統合確認
Write-Host "`n🔧 5. server.jsのNext.js統合確認`n" -ForegroundColor Magenta

if (Test-Path "server.js") {
    $serverJs = Get-Content "server.js" -Raw
    
    # Next.js関連のインポート確認
    if ($serverJs -match "next|NextServer|createServer") {
        Write-Diagnostic -Category "server.js" -Check "Next.js統合コード" -Status "✅" -Message "Next.js統合コードが存在します"
    } else {
        Write-Diagnostic -Category "server.js" -Check "Next.js統合コード" -Status "❌" -Message "Next.js統合コードが見つかりません（server.jsにNext.js統合が必要）"
    }
    
    # ログ出力の確認
    if ($serverJs -match "console\.log.*[Nn]ext|console\.log.*[Bb]uild") {
        Write-Diagnostic -Category "server.js" -Check "Next.jsログ出力" -Status "✅" -Message "Next.js関連のログ出力が存在します"
    } else {
        Write-Diagnostic -Category "server.js" -Check "Next.jsログ出力" -Status "⚠️" -Message "Next.js関連のログ出力が見つかりません（診断用ログの追加を推奨）"
    }
} else {
    Write-Diagnostic -Category "server.js" -Check "server.js" -Status "❌" -Message "server.jsが存在しません"
}

# 6. 検証環境での動作確認
Write-Host "`n🌐 6. 検証環境での動作確認`n" -ForegroundColor Magenta

try {
    # トップページの確認
    $response = Invoke-WebRequest -Uri "$BaseUrl/" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Diagnostic -Category "動作確認" -Check "トップページ" -Status "✅" -Message "トップページが正常に動作しています"
        
        # Next.jsページかどうかの確認（HTMLにNext.jsの痕跡があるか）
        if ($response.Content -match "__NEXT_DATA__|next|_next") {
            Write-Diagnostic -Category "動作確認" -Check "Next.jsページ" -Status "✅" -Message "Next.jsページが配信されています"
        } else {
            Write-Diagnostic -Category "動作確認" -Check "Next.jsページ" -Status "⚠️" -Message "Next.jsページが配信されていない可能性があります（HTMLファイルの可能性）"
        }
    }
} catch {
    Write-Diagnostic -Category "動作確認" -Check "トップページ" -Status "❌" -Message "トップページにアクセスできません: $($_.Exception.Message)"
}

# 結果サマリー
Write-Host "`n📊 診断結果サマリー`n" -ForegroundColor Green

$successCount = ($diagnostics | Where-Object { $_.Status -eq "✅" }).Count
$warningCount = ($diagnostics | Where-Object { $_.Status -eq "⚠️" }).Count
$errorCount = ($diagnostics | Where-Object { $_.Status -eq "❌" }).Count
$totalCount = $diagnostics.Count

Write-Host "総チェック数: $totalCount" -ForegroundColor White
Write-Host "✅ 成功: $successCount" -ForegroundColor Green
Write-Host "⚠️ 警告: $warningCount" -ForegroundColor Yellow
Write-Host "❌ エラー: $errorCount" -ForegroundColor Red

# レポートをJSONファイルに保存
$report = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    BaseUrl = $BaseUrl
    Summary = @{
        Total = $totalCount
        Success = $successCount
        Warning = $warningCount
        Error = $errorCount
    }
    Diagnostics = $diagnostics
}

$report | ConvertTo-Json -Depth 10 | Out-File -FilePath "nextjs-deployment-diagnostics.json" -Encoding UTF8

Write-Host "`n📄 詳細レポートを保存しました: nextjs-deployment-diagnostics.json" -ForegroundColor Green

# 推奨事項
if ($errorCount -gt 0 -or $warningCount -gt 0) {
    Write-Host "`n💡 推奨事項:`n" -ForegroundColor Cyan
    
    if ($errorCount -gt 0) {
        Write-Host "❌ エラーを修正してください:" -ForegroundColor Red
        $diagnostics | Where-Object { $_.Status -eq "❌" } | ForEach-Object {
            Write-Host "  - $($_.Category): $($_.Check)" -ForegroundColor Yellow
        }
    }
    
    if ($warningCount -gt 0) {
        Write-Host "`n⚠️ 警告を確認してください:" -ForegroundColor Yellow
        $diagnostics | Where-Object { $_.Status -eq "⚠️" } | ForEach-Object {
            Write-Host "  - $($_.Category): $($_.Check)" -ForegroundColor Yellow
        }
    }
}

return $report

