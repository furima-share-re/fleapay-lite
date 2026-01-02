# PowerShell実行ポリシーエラーの対処方法

PowerShellスクリプトを実行する際に、実行ポリシーのエラーが発生した場合の対処方法です。

## 🔧 解決方法

### 方法1: 実行ポリシーを一時的に変更（推奨）

現在のセッションのみで実行ポリシーを変更：

```powershell
# 現在の実行ポリシーを確認
Get-ExecutionPolicy

# 現在のセッションのみで実行ポリシーを変更（管理者権限不要）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# スクリプトを実行
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl "postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" `
  -OutputDir "./dump-staging"
```

**注意**: `-Scope Process` を使用すると、現在のPowerShellセッションのみに適用され、セッションを閉じると元に戻ります。

### 方法2: スクリプトを直接実行（実行ポリシーを変更しない）

スクリプトの内容を直接実行する方法：

```powershell
# 環境変数を設定
$RenderDatabaseUrl = "postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"
$OutputDir = "./dump-staging"

# 出力ディレクトリを作成
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# スキーマのみダンプ
Write-Host "スキーマをダンプしています..." -ForegroundColor Yellow
$schemaFile = Join-Path $OutputDir "schema.sql"
pg_dump $RenderDatabaseUrl --schema-only --no-owner --no-privileges -f $schemaFile
Write-Host "✅ スキーマダンプ完了: $schemaFile" -ForegroundColor Green

# データをCSV形式でダンプ
Write-Host "データをダンプしています..." -ForegroundColor Yellow
$tables = @("frames", "sellers", "orders", "order_items", "images", "stripe_payments", "qr_sessions", "buyer_attributes", "order_metadata", "kids_achievements")

foreach ($table in $tables) {
    $csvFile = Join-Path $OutputDir "$table.csv"
    Write-Host "  - $table をエクスポート中..." -ForegroundColor Gray
    
    $tempSqlFile = Join-Path $env:TEMP "copy_$table.sql"
    "\COPY $table TO '$csvFile' WITH (FORMAT CSV, HEADER)" | Out-File -FilePath $tempSqlFile -Encoding utf8 -NoNewline
    
    $result = psql $RenderDatabaseUrl -f $tempSqlFile 2>&1
    if ($LASTEXITCODE -eq 0 -and (Test-Path $csvFile)) {
        Write-Host "    ✅ $table.csv を作成しました" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  $table のエクスポートをスキップしました" -ForegroundColor Yellow
    }
    
    if (Test-Path $tempSqlFile) {
        Remove-Item $tempSqlFile -Force
    }
}

Write-Host "`n✅ ダンプ完了！" -ForegroundColor Green
```

---

## 🚀 推奨手順

### ステップ1: 実行ポリシーを一時的に変更

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

### ステップ2: スクリプトを実行

```powershell
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl "postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" `
  -OutputDir "./dump-staging"
```

---

## ⚠️ 注意事項

1. **実行ポリシーの変更**
   - `-Scope Process` を使用すると、現在のセッションのみに適用されます
   - セッションを閉じると元のポリシーに戻ります
   - システム全体のポリシーは変更されません

2. **セキュリティ**
   - 信頼できるスクリプトのみを実行してください
   - 実行ポリシーを永続的に変更する場合は、管理者権限が必要です

---

## 🔍 現在の実行ポリシーを確認

```powershell
Get-ExecutionPolicy -List
```

現在のポリシーが表示されます。

