# Phase 1.8: hostsファイルを使用した解決方法

**作成日**: 2026-01-04  
**問題**: ホスト名が解決できない（`psql`がIPv6アドレスを解決できない）  
**解決方法**: WindowsのhostsファイルにIPv6アドレスを追加

---

## ⚠️ 重要な注意事項

**この方法は、IPv6アドレスをhostsファイルに追加しますが、通常は推奨されません。**

**より確実な方法は、Supabase DashboardのSQL Editorを使用するか、または別のツール（例：Supabase CLI）を使用することです。**

---

## ✅ 解決方法1: hostsファイルにIPv6アドレスを追加（実験的）

**WindowsのhostsファイルにIPv6アドレスを追加：**

```powershell
# Step 1: hostsファイルのパスを確認
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"

# Step 2: hostsファイルにIPv6アドレスを追加（管理者権限が必要）
# 注意: この方法は実験的で、動作しない可能性があります
Add-Content -Path $hostsPath -Value "2406:da14:271:990e:700c:1843:6a5d:7a0b db.mluvjdhqgfpcefsmvjae.supabase.co"
```

**ただし、hostsファイルは通常IPv4アドレスのみをサポートします。**

---

## ✅ 解決方法2: Supabase DashboardのSQL Editorを使用（推奨）

**Supabase DashboardのSQL Editorを使用してデータをインポート：**

1. **Supabase Dashboard**にログイン
2. **プロジェクト `mluvjdhqgfpcefsmvjae`** を選択
3. **SQL Editor**を開く
4. **バックアップファイルをSQL形式に変換**
5. **SQL Editorで実行**

**ただし、この方法は大きなデータセットには適していません。**

---

## ✅ 解決方法3: Supabase CLIを使用（推奨）

**Supabase CLIを使用してデータをインポート：**

```powershell
# Step 1: Supabase CLIをインストール（まだインストールしていない場合）
# npm install -g supabase

# Step 2: Supabaseにログイン
# supabase login

# Step 3: プロジェクトをリンク
# supabase link --project-ref mluvjdhqgfpcefsmvjae

# Step 4: データをインポート
# supabase db push
```

---

## ✅ 解決方法4: 別のマシンまたはクラウド環境を使用

**別のマシンまたはクラウド環境（例：GitHub Actions、AWS EC2）を使用してデータをインポート：**

- IPv6接続が正常に動作する環境を使用
- または、IPv4アドレスが取得できる環境を使用

---

## 📋 推奨手順

1. **Supabase DashboardのSQL Editorを使用**（小規模なデータの場合）
2. **Supabase CLIを使用**（中規模のデータの場合）
3. **別のマシンまたはクラウド環境を使用**（大規模なデータの場合）

---

## ⚠️ 現在の状況

**現在の状況：**
- DNS解決ではIPv6アドレスのみが返される
- `psql`がIPv4アドレスを探している
- ホスト名が解決できない

**この問題は、ネットワーク設定やDNS設定の問題である可能性が高いです。**

---

**まずは、Supabase DashboardのSQL EditorまたはSupabase CLIを使用することを検討してください！**

