# Phase 1.8: 最終的な試行

**作成日**: 2026-01-04  
**問題**: ホスト名が解決できない（DNS解決の問題）  
**状況**: 環境変数は設定済み、`pg_restore`のエラーメッセージが変わった

---

## ✅ 解決方法1: pg_restoreに-dオプションを追加

**環境変数が設定されているため、`pg_restore`に`-d`オプションを追加：**

```powershell
# 環境変数が設定されていることを確認
Write-Host "PGHOST: $env:PGHOST"
Write-Host "PGPORT: $env:PGPORT"
Write-Host "PGUSER: $env:PGUSER"
Write-Host "PGDATABASE: $env:PGDATABASE"

# pg_restoreに-dオプションを追加
pg_restore -d $env:PGDATABASE --verbose --clean --no-owner --no-privileges .
```

---

## ✅ 解決方法2: DNS解決を再確認

**DNS解決を再確認：**

```powershell
# DNS解決をテスト
nslookup db.mluvjdhqgfpcefsmvjae.supabase.co

# IPv4アドレスを取得
$result = Resolve-DnsName db.mluvjdhqgfpcefsmvjae.supabase.co -Type A -ErrorAction SilentlyContinue
if ($result) {
    $ipv4 = $result | Where-Object { $_.IPAddress -notmatch ":" } | Select-Object -First 1 -ExpandProperty IPAddress
    Write-Host "IPv4アドレス: $ipv4"
    
    # IPv4アドレスを環境変数として設定
    $env:PGHOST = $ipv4
} else {
    Write-Host "IPv4アドレスが取得できませんでした。"
}
```

---

## ✅ 解決方法3: Supabase Dashboardから接続文字列を直接コピー

**Supabase Dashboardから接続文字列を直接コピーして使用：**

1. **Supabase Dashboard**にログイン
2. **プロジェクト `mluvjdhqgfpcefsmvjae`** を選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションを確認
5. **URI** タブの **Direct Connection** を確認
6. **接続文字列をコピー**
7. **PowerShellで、パスワード部分を置き換え**

---

## 📋 完全なコマンド（推奨）

```powershell
# Step 1: 環境変数を設定
$env:PGPASSWORD = ".cx2eeaZJ55Qp@f"
$env:PGHOST = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

# Step 2: DNS解決を確認
nslookup $env:PGHOST

# Step 3: 接続テスト
psql -c "SELECT version();"

# Step 4: データインポート（-dオプションを追加）
pg_restore -d $env:PGDATABASE --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: ホスト名が解決できない

**対処方法：**
1. **DNS解決を確認**：`nslookup db.mluvjdhqgfpcefsmvjae.supabase.co`
2. **IPv4アドレスを取得**：`Resolve-DnsName`
3. **Supabase Dashboardから接続文字列を直接コピー**

---

### エラー2: pg_restoreの-dオプションエラー

**対処方法：**
- `-d`オプションを追加：`pg_restore -d $env:PGDATABASE ...`

---

## 🎯 推奨手順

1. **DNS解決を確認**
2. **環境変数を設定**
3. **接続テストを実行**
4. **成功したら、`pg_restore`に`-d`オプションを追加してデータインポート**

---

**まずは、DNS解決を確認して、`pg_restore`に`-d`オプションを追加して試してください！**

