# Vercel環境変数エラー トラブルシューティング

**作成日**: 2026-01-06  
**問題**: 「環境変数の名前は予約されています。別の名前を選択してください。」

---

## 🔍 問題の特定方法

Vercelで環境変数の予約語エラーが発生した場合、以下の手順で問題を特定してください。

### ステップ1: 環境変数の確認

Vercel Dashboardで設定されているすべての環境変数を確認します。

**確認方法**:
1. Vercel Dashboardでプロジェクトを開く
2. **Settings** > **Environment Variables** を開く
3. すべての環境変数名をリストアップ

### ステップ2: 予約語の確認

以下の環境変数名はVercelで予約されている可能性があります：

#### 確実に予約されている環境変数

- `VERCEL_*` で始まるすべての変数（例: `VERCEL_URL`, `VERCEL_ENV`）
- `NOW_*` で始まるすべての変数（旧名、現在は `VERCEL_*` に変更）

#### 問題になる可能性がある環境変数

- `BASE_URL` - **予約されている可能性あり** → `APP_BASE_URL` に変更済み
- `DATABASE_URL2` - コードで使用されていない不要な変数 → **削除推奨**

---

## ✅ 解決方法

### 方法1: 不要な環境変数を削除

コードベースで使用されていない環境変数は削除してください。

**削除推奨**:
- `DATABASE_URL2` - コードで使用されていない

**確認方法**:
```bash
# プロジェクトルートで実行
grep -r "DATABASE_URL2" .
```

結果が何も返ってこない場合、この環境変数は使用されていないため削除できます。

### 方法2: 環境変数名の変更

予約語と競合している環境変数は、別の名前に変更してください。

**変更済み**:
- `BASE_URL` → `APP_BASE_URL` ✅

### 方法3: 環境変数の整理

現在のプロジェクトで必要な環境変数のみを設定してください。

---

## 📋 現在のプロジェクトで必要な環境変数

### 必須環境変数

| 環境変数名 | 用途 | 状態 |
|-----------|------|------|
| `DATABASE_URL` | Supabase PostgreSQL接続 | ✅ 必要 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | ✅ 必要 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ 必要 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | ✅ 必要 |
| `STRIPE_SECRET_KEY` | Stripe決済API認証 | ✅ 必要 |
| `STRIPE_PUBLISHABLE_KEY` | Stripe公開キー | ✅ 必要 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook認証 | ✅ 必要 |

### 推奨環境変数

| 環境変数名 | 用途 | 状態 |
|-----------|------|------|
| `APP_BASE_URL` | アプリケーションのベースURL | ✅ 必要（`BASE_URL`から変更） |
| `NODE_ENV` | 実行環境 | ✅ 推奨 |
| `ADMIN_TOKEN` | 管理者API認証 | ✅ 推奨 |

### オプション環境変数（機能を使用する場合のみ）

| 環境変数名 | 用途 | 状態 |
|-----------|------|------|
| `OPENAI_API_KEY` | OpenAI API | 🟢 オプション |
| `AWS_REGION` | AWS S3リージョン | 🟢 オプション |
| `AWS_S3_BUCKET` | AWS S3バケット名 | 🟢 オプション |
| `AWS_ACCESS_KEY` | AWSアクセスキー | 🟢 オプション |
| `AWS_SECRET_KEY` | AWSシークレットキー | 🟢 オプション |
| `EBAY_CLIENT_ID` | eBay API Client ID | 🟢 オプション |
| `EBAY_CLIENT_SECRET` | eBay API Client Secret | 🟢 オプション |
| `EBAY_ENV` | eBay環境 | 🟢 オプション |
| `EBAY_SOURCE_MODE` | eBayデータソースモード | 🟢 オプション |
| `HELICONE_API_KEY` | Helicone API | 🟢 オプション |
| `OPENAI_PROMPT` | OpenAIプロンプト | 🟢 オプション |
| `OPENAI_PROMPT_PHOTO_FRAME` | OpenAIフォトフレームプロンプト | 🟢 オプション |
| `PENDING_TTL_MIN` | 保留注文の有効期限 | 🟢 オプション |
| `SELLER_API_TOKEN` | セラーAPIトークン | 🟢 オプション |
| `WORLD_PRICE_DEBUG` | 世界相場デバッグフラグ | 🟢 オプション |
| `ADMIN_BOOTSTRAP_SQL_ENABLED` | 管理者SQL実行機能 | 🟢 オプション |

### 削除推奨環境変数

| 環境変数名 | 理由 | 状態 |
|-----------|------|------|
| `DATABASE_URL2` | コードで使用されていない | ❌ **削除推奨** |

---

## 🔧 修正手順

### ステップ1: 不要な環境変数を削除

1. Vercel Dashboardでプロジェクトを開く
2. **Settings** > **Environment Variables** を開く
3. `DATABASE_URL2` を探す
4. **削除**ボタンをクリックして削除

### ステップ2: 環境変数名の確認

以下の環境変数が正しく設定されているか確認：

- ✅ `APP_BASE_URL`（`BASE_URL` ではない）
- ✅ `DATABASE_URL`（`DATABASE_URL2` ではない）

### ステップ3: デプロイ

環境変数を更新したら、自動的に再デプロイが開始されます。

---

## 🔍 環境変数の使用確認方法

プロジェクトで環境変数が使用されているか確認するには：

```bash
# プロジェクトルートで実行
grep -r "process.env.YOUR_ENV_VAR" .
```

結果が何も返ってこない場合、その環境変数は使用されていないため削除できます。

---

## 📚 参考

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel System Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables)

---

**最終更新**: 2026-01-06

