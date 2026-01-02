# Supabase接続情報取得ガイド

## 📋 確認済みプロジェクト情報

### 検証環境（staging）
- **プロジェクト名**: `edo ichiba staging`
- **Project ID**: `mluvjdhqgfpcfsmvjae`
- **Dashboard URL**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/settings/general

---

## 🔑 接続情報の取得手順

### ステップ1: Database URL（接続文字列）の取得

1. Supabase Dashboardでプロジェクト `edo ichiba staging` を選択
2. 左メニューから **Settings** > **Database** を開く
3. **Connection string** セクションを確認
4. **URI** タブを選択
5. 接続文字列をコピー

**形式の例**:
```
postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

または

```
postgresql://postgres:[PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**重要**: `[PASSWORD]` の部分は、プロジェクト作成時に設定したデータベースパスワードに置き換えてください。

### ステップ2: Supabase URL（API URL）の取得

1. **Settings** > **API** を開く
2. **Project URL** をコピー

**形式**:
```
https://mluvjdhqgfpcfsmvjae.supabase.co
```

### ステップ3: API Keysの取得

1. **Settings** > **API** を開く
2. **Project API keys** セクションから以下をコピー：

#### `anon` `public` key
- フロントエンド用（RLSが有効な場合に使用）
- 形式: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（長い文字列）

#### `service_role` `secret` key
- サーバーサイド用（RLSをバイパスする場合に使用）
- **⚠️ 秘密情報**: フロントエンドで使用しないでください
- 形式: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（長い文字列）

---

## 📝 環境変数テンプレート（検証環境）

取得した情報を以下のテンプレートに当てはめてください：

```env
# === 検証環境（staging）の設定 ===
# プロジェクト名: edo ichiba staging
# Project ID: mluvjdhqgfpcfsmvjae

# データベース接続
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres

# Supabase API
NEXT_PUBLIC_SUPABASE_URL=https://mluvjdhqgfpcfsmvjae.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-keyをここに貼り付け]
SUPABASE_SERVICE_ROLE_KEY=[service-role-keyをここに貼り付け]

# 環境識別
NODE_ENV=preview
```

**置き換えが必要な箇所**:
- `[YOUR-PASSWORD]`: プロジェクト作成時に設定したデータベースパスワード
- `[anon-keyをここに貼り付け]`: Settings > API から取得した `anon` `public` key
- `[service-role-keyをここに貼り付け]`: Settings > API から取得した `service_role` `secret` key

---

## 🔧 Render環境変数の設定

### 検証環境（fleapay-lite-web-preview）

1. [Render Dashboard](https://dashboard.render.com) にログイン
2. `fleapay-lite-web-preview` サービスを選択
3. **Environment** タブを開く
4. 以下の環境変数を追加/更新：

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://mluvjdhqgfpcfsmvjae.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

5. **Save Changes** をクリック
6. サービスが自動的に再デプロイされます

---

## 📋 チェックリスト

- [ ] Database URLを取得（Settings > Database > Connection string > URI）
- [ ] Supabase URLを取得（Settings > API > Project URL）
- [ ] `anon` `public` keyを取得（Settings > API > Project API keys）
- [ ] `service_role` `secret` keyを取得（Settings > API > Project API keys）
- [ ] データベースパスワードを確認（プロジェクト作成時に設定したもの）
- [ ] Render環境変数を設定（`fleapay-lite-web-preview`）
- [ ] ローカル `.env` ファイルを更新（開発用）

---

## 🔍 接続情報の確認方法

### Database URLの確認

接続文字列が正しいか確認するには：

```powershell
# PowerShell
$env:DATABASE_URL="postgresql://postgres:[PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres"
psql $env:DATABASE_URL -c "SELECT version();"
```

接続できれば、PostgreSQLのバージョン情報が表示されます。

### Supabase URLの確認

ブラウザで以下にアクセス：
```
https://mluvjdhqgfpcfsmvjae.supabase.co
```

SupabaseのAPI情報が表示されれば正しく設定されています。

---

## ⚠️ 注意事項

1. **パスワードの管理**
   - データベースパスワードは安全に保管してください
   - パスワードマネージャーの使用を推奨します
   - Gitにコミットしないでください

2. **API Keysの管理**
   - `service_role` keyは秘密情報です
   - フロントエンドで使用しないでください
   - Gitにコミットしないでください

3. **本番環境の設定**
   - 本番環境用のSupabaseプロジェクトも同様に設定してください
   - 本番環境と検証環境は必ず別々のプロジェクトを使用してください

---

## 📚 次のステップ

接続情報を取得したら：

1. **環境変数を設定**（Render Dashboardとローカル `.env`）
2. **スキーマの移行**（`scripts/migrate-to-supabase.md` を参照）
3. **データの移行**（`scripts/migrate-to-supabase.md` を参照）
4. **Prisma設定の更新**（`npx prisma db pull`）

詳細は [SUPABASE_SETUP_COMPLETE.md](./SUPABASE_SETUP_COMPLETE.md) を参照してください。

---

## 🔗 便利なリンク

- **Supabase Dashboard**: https://app.supabase.com
- **プロジェクト設定**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/settings/general
- **Database設定**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/settings/database
- **API設定**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/settings/api
- **SQL Editor**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/sql/new

