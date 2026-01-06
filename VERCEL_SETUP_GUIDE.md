# Vercel デプロイ設定ガイド

**作成日**: 2026-01-06  
**対象プロジェクト**: fleapay-lite  
**リポジトリ**: furima-share-re/fleapay-lite

---

## 📋 概要

このガイドでは、GitHubリポジトリ `furima-share-re/fleapay-lite` をVercelにデプロイするための設定手順を説明します。

---

## 🚀 ステップ1: Vercelプロジェクトの作成

### 1.1 GitHubリポジトリのインポート

1. [Vercel Dashboard](https://vercel.com/new) にアクセス
2. **Import Git Repository** を選択
3. リポジトリ `furima-share-re/fleapay-lite` を選択

### 1.2 プロジェクト設定

以下の設定を適用します：

| 項目 | 設定値 |
|------|--------|
| **Vercel Team** | alvis industry (Pro) |
| **Project Name** | `fleapay-lite` |
| **Framework Preset** | `Next.js` |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` または `next build` |
| **Output Directory** | Next.js default（自動検出） |
| **Install Command** | `npm install`（デフォルト） |

---

## 🔧 ステップ2: ビルド設定

### 2.1 Build and Output Settings

Vercelは自動的にNext.jsを検出しますが、明示的に設定する場合は：

- **Build Command**: `npm run build`
- **Output Directory**: Next.js default（`/.next` が自動検出されます）

### 2.2 Node.js バージョン

`package.json` の `engines` フィールドに基づき、Node.js 18以上が使用されます：

```json
"engines": {
  "node": ">=18.0.0"
}
```

---

## 🔐 ステップ3: 環境変数の設定

### 3.1 必須環境変数

以下の環境変数をVercel Dashboardの **Environment Variables** セクションで設定してください：

#### データベース接続（Supabase）

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
```

#### Supabase API設定

```env
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

#### Stripe決済

```env
STRIPE_SECRET_KEY=sk_live_[YOUR_KEY]  # 本番環境
# または
STRIPE_SECRET_KEY=sk_test_[YOUR_KEY]  # テスト環境
```

### 3.2 推奨環境変数

```env
# アプリケーション設定
NODE_ENV=production
APP_BASE_URL=https://[YOUR_VERCEL_DOMAIN].vercel.app
ADMIN_TOKEN=[secure-admin-token]

# ポート（Vercelでは自動設定されるため通常不要）
# PORT=3000
```

**注意**: `BASE_URL` はVercelの予約語のため、`APP_BASE_URL` を使用してください。  
Vercelでは `VERCEL_URL` 環境変数が自動的に提供されますが、カスタムドメインを使用する場合は `APP_BASE_URL` を明示的に設定することを推奨します。

### 3.3 オプション環境変数（機能を使用する場合）

```env
# OpenAI API（画像解析機能）
OPENAI_API_KEY=sk-[YOUR_KEY]

# AWS S3（画像アップロード機能）
AWS_REGION=[region]
AWS_S3_BUCKET=[bucket-name]
AWS_ACCESS_KEY_ID=[access-key]
AWS_SECRET_ACCESS_KEY=[secret-key]

# eBay API（価格検索機能）
EBAY_CLIENT_ID=[client-id]
EBAY_CLIENT_SECRET=[client-secret]
EBAY_ENV=production  # または sandbox
EBAY_SOURCE_MODE=[mode]

# その他
PENDING_TTL_MIN=30  # 保留注文の有効期限（分）
ADMIN_BOOTSTRAP_SQL_ENABLED=true  # 管理者SQL実行機能
```

### 3.4 環境変数の環境別設定

Vercelでは、環境変数を以下の環境に分けて設定できます：

- **Production**: 本番環境（`vercel.app` ドメイン）
- **Preview**: プレビュー環境（プルリクエストごと）
- **Development**: ローカル開発環境

各環境で異なる値を設定する場合は、環境を選択してから追加してください。

---

## 📝 ステップ4: デプロイ

### 4.1 初回デプロイ

1. すべての環境変数を設定したら、**Deploy** ボタンをクリック
2. Vercelが自動的に以下を実行します：
   - `npm install` で依存関係をインストール
   - `npm run build` でビルド
   - デプロイ

### 4.2 デプロイの確認

デプロイが完了すると、以下のURLでアクセスできます：

- **Production**: `https://fleapay-lite.vercel.app`
- **Preview**: プルリクエストごとに自動生成されるURL

---

## ⚙️ ステップ5: 追加設定（オプション）

### 5.1 カスタムドメインの設定

1. Vercel Dashboardでプロジェクトを開く
2. **Settings** > **Domains** を選択
3. カスタムドメインを追加

### 5.2 環境変数の確認

デプロイ後、以下のエンドポイントで環境変数の設定を確認できます：

```bash
# データベース接続確認
curl https://[YOUR_DOMAIN]/api/debug/db-status

# ヘルスチェック
curl https://[YOUR_DOMAIN]/api/ping
```

---

## 🔍 トラブルシューティング

### ビルドエラー

- **エラー**: `Module not found`
  - **解決策**: `package.json` の依存関係を確認し、`npm install` が正常に実行されることを確認

- **エラー**: `Environment variable not found`
  - **解決策**: Vercel Dashboardで環境変数が正しく設定されているか確認

### データベース接続エラー

- **エラー**: `Connection refused` または `Connection timeout`
  - **解決策**: 
    - Supabaseの接続設定を確認（IPv4/IPv6）
    - Connection Poolingを使用している場合は、ポート `6543` を使用
    - 直接接続の場合は、ポート `5432` を使用

### 環境変数の優先順位

Vercelでは、以下の優先順位で環境変数が読み込まれます：

1. Vercel Dashboardで設定された環境変数（最高優先度）
2. `.env.local`（ローカル開発時のみ）
3. `.env`（ローカル開発時のみ）

**注意**: `.env` ファイルはGitにコミットしないでください。Vercel Dashboardで設定してください。

---

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)

---

## ✅ チェックリスト

デプロイ前に以下を確認してください：

- [ ] GitHubリポジトリがVercelに接続されている
- [ ] Framework Presetが `Next.js` に設定されている
- [ ] Root Directoryが `./` に設定されている
- [ ] Build Commandが `npm run build` に設定されている
- [ ] すべての必須環境変数が設定されている
- [ ] Supabaseの接続情報が正しい
- [ ] Stripe APIキーが設定されている
- [ ] 初回デプロイが成功している
- [ ] 本番環境でアプリケーションが正常に動作している

---

**最終更新**: 2026-01-06

