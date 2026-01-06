# Vercel環境変数エラー 完全修正ガイド

**作成日**: 2026-01-06  
**問題**: 「環境変数の名前は予約されています。別の名前を選択してください。」  
**状態**: `DATABASE_URL2` 削除後もエラーが継続

---

## 🔍 問題の特定

`DATABASE_URL2` を削除してもエラーが続く場合、他の環境変数名が予約語と競合している可能性があります。

### 可能性のある原因

1. **`DATABASE_URL`** - Vercelで予約されている可能性（通常は問題ないが、場合によっては競合）
2. **環境変数の値に問題がある** - 特殊文字や長すぎる値
3. **環境変数の命名規則違反** - 大文字小文字、アンダースコアなどの問題

---

## ✅ 解決方法

### 方法1: 環境変数の段階的削除（推奨）

エラーが発生している環境変数を特定するため、一時的に環境変数を削除してテストします。

#### ステップ1: オプション環境変数を一時的に削除

以下の環境変数を一時的に削除して、エラーが解消されるか確認：

1. `HELICONE_API_KEY`
2. `OPENAI_PROMPT`
3. `OPENAI_PROMPT_PHOTO_FRAME`
4. `SELLER_API_TOKEN`
5. `WORLD_PRICE_DEBUG`
6. `ADMIN_BOOTSTRAP_SQL_ENABLED`

**注意**: これらの環境変数は後で再追加できます。

#### ステップ2: デプロイを試す

環境変数を削除した後、デプロイを試してください。

#### ステップ3: エラーが解消された場合

エラーが解消された場合、削除した環境変数を1つずつ再追加して、どの環境変数が問題かを特定します。

### 方法2: 環境変数名の変更

問題のある環境変数が特定できた場合、別の名前に変更します。

#### 変更候補

| 現在の名前 | 変更後の名前 | 理由 |
|-----------|------------|------|
| `DATABASE_URL` | `DB_CONNECTION_URL` | Vercelで予約されている可能性（通常は問題ないが念のため） |

**注意**: `DATABASE_URL` は Prisma や多くのフレームワークで標準的に使用されるため、通常は問題ありません。変更する場合は、コードも更新する必要があります。

### 方法3: 環境変数の値の確認

環境変数の値に問題がないか確認します。

#### 確認項目

- 値に特殊文字が含まれていないか
- 値が長すぎないか（Vercelの制限を確認）
- 値に改行文字が含まれていないか

---

## 📋 現在の環境変数リスト（PDFより）

### 必須環境変数（削除しない）

| 環境変数名 | 状態 | 備考 |
|-----------|------|------|
| `DATABASE_URL` | ✅ 必要 | Prismaで使用 |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 必要 | Supabase接続 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 必要 | Supabase認証 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ 必要 | Supabase管理 |
| `STRIPE_SECRET_KEY` | ✅ 必要 | Stripe決済 |
| `STRIPE_PUBLISHABLE_KEY` | ✅ 必要 | Stripe公開キー |
| `STRIPE_WEBHOOK_SECRET` | ✅ 必要 | Stripe Webhook |
| `APP_BASE_URL` | ✅ 必要 | アプリベースURL |

### 推奨環境変数（削除しない）

| 環境変数名 | 状態 | 備考 |
|-----------|------|------|
| `NODE_ENV` | ✅ 必要 | 実行環境 |
| `ADMIN_TOKEN` | ✅ 推奨 | 管理者認証 |

### オプション環境変数（一時的に削除可能）

| 環境変数名 | 状態 | 削除テスト |
|-----------|------|----------|
| `AWS_REGION` | 🟢 オプション | 一時削除可 |
| `AWS_ACCESS_KEY` | 🟢 オプション | 一時削除可 |
| `AWS_SECRET_KEY` | 🟢 オプション | 一時削除可 |
| `AWS_S3_BUCKET` | 🟢 オプション | 一時削除可 |
| `EBAY_CLIENT_ID` | 🟢 オプション | 一時削除可 |
| `EBAY_CLIENT_SECRET` | 🟢 オプション | 一時削除可 |
| `EBAY_ENV` | 🟢 オプション | 一時削除可 |
| `EBAY_SOURCE_MODE` | 🟢 オプション | 一時削除可 |
| `HELICONE_API_KEY` | 🟢 オプション | **一時削除推奨** |
| `OPENAI_API_KEY` | 🟢 オプション | 一時削除可 |
| `OPENAI_PROMPT` | 🟢 オプション | **一時削除推奨** |
| `OPENAI_PROMPT_PHOTO_FRAME` | 🟢 オプション | **一時削除推奨** |
| `PENDING_TTL_MIN` | 🟢 オプション | 一時削除可 |
| `SELLER_API_TOKEN` | 🟢 オプション | **一時削除推奨** |
| `WORLD_PRICE_DEBUG` | 🟢 オプション | **一時削除推奨** |
| `ADMIN_BOOTSTRAP_SQL_ENABLED` | 🟢 オプション | **一時削除推奨** |

---

## 🔧 推奨される修正手順

### ステップ1: オプション環境変数を一時的に削除

1. Vercel Dashboardでプロジェクトを開く
2. **Settings** > **Environment Variables** を開く
3. 以下の環境変数を一時的に削除：
   - `HELICONE_API_KEY`
   - `OPENAI_PROMPT`
   - `OPENAI_PROMPT_PHOTO_FRAME`
   - `SELLER_API_TOKEN`
   - `WORLD_PRICE_DEBUG`
   - `ADMIN_BOOTSTRAP_SQL_ENABLED`

### ステップ2: デプロイを試す

環境変数を削除した後、**Deploy** ボタンをクリックしてデプロイを試してください。

### ステップ3: エラーが解消された場合

エラーが解消された場合、削除した環境変数を1つずつ再追加して、どの環境変数が問題かを特定します。

### ステップ4: エラーが続く場合

エラーが続く場合、以下の環境変数も一時的に削除してテスト：

- `AWS_REGION`
- `AWS_ACCESS_KEY`
- `AWS_SECRET_KEY`
- `AWS_S3_BUCKET`
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_ENV`
- `EBAY_SOURCE_MODE`
- `OPENAI_API_KEY`
- `PENDING_TTL_MIN`

---

## 🔍 デバッグ方法

### エラーメッセージの確認

Vercel Dashboardで以下の情報を確認：

1. **Deployments** タブを開く
2. 最新のデプロイを選択
3. **Build Logs** を確認
4. エラーメッセージの詳細を確認

### 環境変数の確認

すべての環境変数が正しく設定されているか確認：

1. **Settings** > **Environment Variables** を開く
2. 各環境変数の名前と値を確認
3. 値に特殊文字が含まれていないか確認

---

## ⚠️ 注意事項

1. **必須環境変数は削除しない**: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` などは削除しないでください
2. **一時的な削除**: オプション環境変数は一時的に削除してテストできますが、後で再追加する必要があります
3. **値のバックアップ**: 環境変数を削除する前に、値をメモしておいてください

---

## 📚 参考

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel System Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables)

---

**最終更新**: 2026-01-06

