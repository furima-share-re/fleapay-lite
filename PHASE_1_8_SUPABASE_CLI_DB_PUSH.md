# Phase 1.8: Supabase CLIを使用したデータインポート

**作成日**: 2026-01-04  
**状況**: Supabase CLIがインストールされ、ログインとプロジェクトリンクが成功  
**問題**: DNS解決の問題で`pg_restore`が接続できない  
**解決方法**: Supabase CLIを使用してデータをインポート

---

## ✅ 解決方法: Supabase CLIを使用

**Supabase CLIを使用してデータをインポート：**

### 方法1: Supabase CLIの`db push`コマンドを使用

**注意**: `db push`は主にマイグレーションファイルをプッシュするためのコマンドですが、データインポートには適していない可能性があります。

---

### 方法2: 環境変数を使用して接続情報を設定

**環境変数を使用して接続情報を設定し、`pg_restore`を実行：**

```powershell
# Step 1: パスワードを設定
$env:PGPASSWORD = ".cx2eeaZJ55Qp@f"
$env:PGHOST = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

# Step 2: 接続テスト
psql -c "SELECT version();"

# Step 3: データをインポート
pg_restore -d $env:PGDATABASE --verbose --clean --no-owner --no-privileges .
```

---

### 方法3: Supabase DashboardのSQL Editorを使用（推奨）

**Supabase DashboardのSQL Editorを使用してデータをインポート：**

1. **Supabase Dashboard**にログイン
2. **プロジェクト `mluvjdhqgfpcefsmvjae`** を選択
3. **SQL Editor**を開く
4. **バックアップファイルをSQL形式に変換**
5. **SQL Editorで実行**

**注意**: この方法は大きなデータセットには適していません。

---

## 📋 完全な手順（環境変数を使用）

```powershell
# Step 1: パスワードを設定
$env:PGPASSWORD = ".cx2eeaZJ55Qp@f"
$env:PGHOST = "db.mluvjdhqgfpcefsmvjae.supabase.co"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

# Step 2: DNS解決を確認
nslookup $env:PGHOST

# Step 3: 接続テスト
psql -c "SELECT version();"

# Step 4: データをインポート
pg_restore -d $env:PGDATABASE --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: ホスト名が解決できない

**対処方法：**
- DNS解決を確認：`nslookup db.mluvjdhqgfpcefsmvjae.supabase.co`
- IPv6アドレスのみが返される場合は、別の方法を検討してください

---

### エラー2: データインポートが失敗

**対処方法：**
- Supabase DashboardのSQL Editorを使用してください
- または、別のマシン/クラウド環境を使用してください

---

## 🎯 推奨手順

1. **環境変数を使用して接続情報を設定**
2. **接続テストを実行**
3. **成功したら、データをインポート**
4. **失敗した場合は、Supabase DashboardのSQL Editorを使用**

---

**まずは、環境変数を使用して接続テストを実行してください！**

