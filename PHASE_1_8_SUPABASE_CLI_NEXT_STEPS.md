# Phase 1.8: Supabase CLIの次のステップ

**作成日**: 2026-01-04  
**状況**: npmが動作するようになりました  
**次のステップ**: Supabase CLIをインストールしてデータ移行を実行

---

## ✅ 次のステップ

### Step 1: Supabase CLIをインストール（npxを使用、推奨）

**PowerShellで、以下のコマンドを実行：**

```powershell
npx supabase --help
```

**初回実行時は、Supabase CLIが自動的にダウンロードされます。**

---

### Step 2: Supabaseにログイン

```powershell
npx supabase login
```

**ブラウザが開き、Supabaseアカウントでログインします。**

---

### Step 3: プロジェクトをリンク

```powershell
npx supabase link --project-ref mluvjdhqgfpcefsmvjae
```

**プロジェクト参照ID**: `mluvjdhqgfpcefsmvjae`

---

### Step 4: データをインポート

**バックアップディレクトリに移動して、データをインポート：**

```powershell
# バックアップディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# pg_restoreを使用してデータをインポート
# 注意: Supabase CLIを使用することで、DNS解決の問題を回避できる可能性があります
pg_restore --dbname="postgresql://postgres:.cx2eeaZJ55Qp@f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres" --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全な手順

```powershell
# Step 1: Supabase CLIをインストール（npxを使用、推奨）
npx supabase --help

# Step 2: Supabaseにログイン
npx supabase login

# Step 3: プロジェクトをリンク
npx supabase link --project-ref mluvjdhqgfpcefsmvjae

# Step 4: バックアップディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# Step 5: データをインポート
pg_restore --dbname="postgresql://postgres:.cx2eeaZJ55Qp@f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres" --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: Supabase CLIのインストールに失敗

**対処方法：**
- インターネット接続を確認してください
- ファイアウォール設定を確認してください

---

### エラー2: ログインに失敗

**対処方法：**
- ブラウザでSupabaseアカウントにログインできるか確認
- プロジェクト参照IDが正しいか確認

---

### エラー3: プロジェクトのリンクに失敗

**対処方法：**
- プロジェクト参照IDが正しいか確認
- Supabase Dashboardでプロジェクトが存在するか確認

---

### エラー4: データインポートでDNS解決エラーが発生

**対処方法：**
- Supabase CLIを使用してもDNS解決の問題が発生する場合は、別の方法を検討してください
- または、Supabase DashboardのSQL Editorを使用してください

---

## 🎯 推奨手順

1. **Supabase CLIをインストール**
2. **Supabaseにログイン**
3. **プロジェクトをリンク**
4. **データをインポート**

---

**まずは、Supabase CLIをインストールして、ログインを試してください！**

