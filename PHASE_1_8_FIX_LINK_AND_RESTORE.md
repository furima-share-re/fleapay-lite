# Phase 1.8: プロジェクトリンクとpg_restoreの修正

**作成日**: 2026-01-04  
**状況**: Supabase CLIのインストールとログインが成功  
**問題**: 
1. プロジェクトのリンクでエラー（`C:\Windows`ディレクトリで実行したため）
2. `pg_restore`がPATHに含まれていない

---

## ✅ 解決方法

### Step 1: プロジェクトディレクトリに移動

**プロジェクトディレクトリに移動してから、プロジェクトをリンク：**

```powershell
# プロジェクトディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# プロジェクトをリンク
npx supabase link --project-ref mluvjdhqgfpcefsmvjae
```

---

### Step 2: PostgreSQLのPATHを設定

**PostgreSQLのPATHを設定：**

```powershell
# PATHにPostgreSQLのbinディレクトリを追加
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# pg_restoreのバージョンを確認
pg_restore --version
```

---

### Step 3: データをインポート

**バックアップディレクトリに移動して、データをインポート：**

```powershell
# バックアップディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# データをインポート
pg_restore --dbname="postgresql://postgres:.cx2eeaZJ55Qp@f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres" --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全な手順

```powershell
# Step 1: プロジェクトディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# Step 2: プロジェクトをリンク
npx supabase link --project-ref mluvjdhqgfpcefsmvjae

# Step 3: PostgreSQLのPATHを設定
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# Step 4: pg_restoreのバージョンを確認
pg_restore --version

# Step 5: バックアップディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# Step 6: データをインポート
pg_restore --dbname="postgresql://postgres:.cx2eeaZJ55Qp@f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres" --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: プロジェクトのリンクでエラー

**対処方法：**
- プロジェクトディレクトリに移動してから実行してください
- または、`--workdir`オプションを使用：
  ```powershell
  npx supabase link --project-ref mluvjdhqgfpcefsmvjae --workdir "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"
  ```

---

### エラー2: pg_restoreが見つからない

**対処方法：**
- PostgreSQLのPATHを設定してください
- または、PostgreSQLがインストールされているか確認してください

---

### エラー3: データインポートでDNS解決エラーが発生

**対処方法：**
- Supabase CLIを使用してもDNS解決の問題が発生する場合は、別の方法を検討してください
- または、Supabase DashboardのSQL Editorを使用してください

---

## 🎯 推奨手順

1. **プロジェクトディレクトリに移動**
2. **プロジェクトをリンク**
3. **PostgreSQLのPATHを設定**
4. **データをインポート**

---

**まずは、プロジェクトディレクトリに移動して、プロジェクトをリンクしてください！**

