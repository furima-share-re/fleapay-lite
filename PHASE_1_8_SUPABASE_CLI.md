# Phase 1.8: Supabase CLIを使用したデータ移行

**作成日**: 2026-01-04  
**参考**: [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform&platform=windows)  
**プロジェクトID**: `mluvjdhqgfpcefsmvjae`  
**パスワード**: `.cx2eeaZJ55Qp@f`

---

## ✅ 解決方法: Supabase CLIを使用

**Supabase CLIを使用してデータをインポート：**

### Step 1: Supabase CLIをインストール

**PowerShellで、以下のコマンドを実行：**

```powershell
# Node.jsがインストールされているか確認
node --version

# Supabase CLIをインストール（npmを使用）
npm install -g supabase

# または、npxを使用（推奨）
npx supabase --help
```

**注意**: Supabase CLIには**Node.js 20以降**が必要です。

---

### Step 2: Supabaseにログイン

```powershell
# Supabaseにログイン
npx supabase login
```

**ブラウザが開き、Supabaseアカウントでログインします。**

---

### Step 3: プロジェクトをリンク

```powershell
# プロジェクトをリンク
npx supabase link --project-ref mluvjdhqgfpcefsmvjae
```

**プロジェクト参照ID**: `mluvjdhqgfpcefsmvjae`

---

### Step 4: データをインポート

**`pg_restore`を使用してデータをインポート：**

```powershell
# バックアップディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# Supabase CLIを使用してデータをインポート
# 注意: Supabase CLIは、プロジェクト参照IDを使用して接続するため、DNS解決の問題を回避できる可能性があります
npx supabase db push --db-url "postgresql://postgres:.cx2eeaZJ55Qp@f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"
```

**または、Supabase CLIの`db push`コマンドを使用：**

```powershell
# Supabase CLIを使用してデータをインポート
npx supabase db push --db-url "postgresql://postgres:.cx2eeaZJ55Qp@f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres"
```

---

## 📋 完全な手順

```powershell
# Step 1: Supabase CLIをインストール（npxを使用）
npx supabase --help

# Step 2: Supabaseにログイン
npx supabase login

# Step 3: プロジェクトをリンク
npx supabase link --project-ref mluvjdhqgfpcefsmvjae

# Step 4: バックアップディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"

# Step 5: データをインポート（pg_restoreを使用）
# 注意: Supabase CLIを使用することで、DNS解決の問題を回避できる可能性があります
pg_restore --dbname="postgresql://postgres:.cx2eeaZJ55Qp@f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres" --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: Node.jsがインストールされていない

**対処方法：**
- Node.js 20以降をインストールしてください
- [Node.js公式サイト](https://nodejs.org/)からダウンロード

---

### エラー2: Supabase CLIのインストールに失敗

**対処方法：**
- `npm install -g supabase`を実行
- または、`npx supabase`を使用（推奨）

---

### エラー3: ログインに失敗

**対処方法：**
- ブラウザでSupabaseアカウントにログインできるか確認
- プロジェクト参照IDが正しいか確認

---

## 🔄 代替方法: Supabase CLIを使用しない場合

**もしSupabase CLIが使用できない場合：**

1. **Supabase DashboardのSQL Editorを使用**（小規模なデータの場合）
2. **別のマシンまたはクラウド環境を使用**（大規模なデータの場合）

---

## 📚 参考資料

- [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform&platform=windows)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

---

**まずは、Supabase CLIをインストールして、ログインを試してください！**

