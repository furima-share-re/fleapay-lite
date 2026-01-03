# 環境変数一致チェックレポート

**作成日**: 2026-01-03  
**対象環境**: fleapay-lite-web-preview (Render Dashboard)  
**目的**: Render Dashboardの環境変数とコードベースで使用されている環境変数の一致確認

---

## 📋 Render Dashboardに設定されている環境変数（PDFから読み取り）

PDFから確認できた環境変数：

| 環境変数名 | 状態 | 備考 |
|-----------|------|------|
| `NEXT_PUBLIC_SUPABA...` | ✅ 設定済み | 一部が隠れている（`NEXT_PUBLIC_SUPABASE_URL` または `NEXT_PUBLIC_SUPABASE_ANON_KEY`） |
| `NODE_ENV` | ✅ 設定済み | |
| `ADMIN_BOOTSTRAP_S...` | ✅ 設定済み | 一部が隠れている（おそらく `ADMIN_BOOTSTRAP_SQL_ENABLED`） |
| `ADMIN_TOKEN` | ✅ 設定済み | |
| `AWS_REGION` | ✅ 設定済み | |
| `EBAY_CLIENT_ID` | ✅ 設定済み | |
| `EBAY_CLIENT_SECRET` | ✅ 設定済み | |
| `EBAY_ENV` | ✅ 設定済み | |
| `EBAY_SOURCE_MODE` | ✅ 設定済み | |
| `OPENAI_API_KEY` | ✅ 設定済み | |

**環境グループ**: `fleapay-prod` がリンクされている

---

## 🔍 コードベースで使用されている環境変数

### 必須環境変数（アプリケーション動作に必要）

| 環境変数名 | 用途 | 必須度 | PDFでの確認 |
|-----------|------|--------|------------|
| `DATABASE_URL` | Supabase PostgreSQL接続 | ✅ **必須** | ❌ **未確認** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | ✅ **必須** | ⚠️ 一部確認（`NEXT_PUBLIC_SUPABA...`） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ **必須** | ⚠️ 一部確認（`NEXT_PUBLIC_SUPABA...`） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | ✅ **必須** | ❌ **未確認** |
| `STRIPE_SECRET_KEY` | Stripe決済API認証 | ✅ **必須** | ❌ **未確認** |

### 推奨環境変数（デフォルト値あり、本番環境では推奨）

| 環境変数名 | 用途 | デフォルト値 | PDFでの確認 |
|-----------|------|------------|------------|
| `ADMIN_TOKEN` | 管理者API認証 | `admin-devtoken` | ✅ 確認済み |
| `BASE_URL` | アプリケーションのベースURL | `http://localhost:3000` | ❌ **未確認** |
| `PORT` | サーバーポート | `3000` | ❌ **未確認** |
| `NODE_ENV` | 実行環境 | - | ✅ 確認済み |

### オプション環境変数（機能を使用する場合のみ必要）

| 環境変数名 | 用途 | PDFでの確認 |
|-----------|------|------------|
| `OPENAI_API_KEY` | OpenAI API（画像解析） | ✅ 確認済み |
| `AWS_REGION` | AWS S3リージョン | ✅ 確認済み |
| `AWS_S3_BUCKET` | AWS S3バケット名 | ❌ **未確認** |
| `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID` | AWSアクセスキー | ❌ **未確認** |
| `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY` | AWSシークレットキー | ❌ **未確認** |
| `ADMIN_BOOTSTRAP_SQL_ENABLED` | 管理者SQL実行機能 | ⚠️ 一部確認（`ADMIN_BOOTSTRAP_S...`） |
| `PENDING_TTL_MIN` | 保留注文の有効期限（分） | ❌ **未確認** |
| `OPENAI_PROMPT_PHOTO_FRAME` | OpenAIプロンプト（フォトフレーム） | ❌ **未確認** |
| `EBAY_CLIENT_ID` | eBay API Client ID | ✅ 確認済み |
| `EBAY_CLIENT_SECRET` | eBay API Client Secret | ✅ 確認済み |
| `EBAY_ENV` | eBay環境（production/sandbox） | ✅ 確認済み |
| `EBAY_SOURCE_MODE` | eBayデータソースモード（active/sold） | ✅ 確認済み |
| `WORLD_PRICE_DEBUG` | 世界相場デバッグフラグ | ❌ **未確認** |
| `SKIP_WEBHOOK_VERIFY` | Stripe Webhook検証スキップ | ❌ **未確認** |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret | ❌ **未確認** |
| `RATE_LIMIT_MAX_WRITES` | レート制限（書き込み） | ❌ **未確認** |
| `RATE_LIMIT_MAX_CHECKOUT` | レート制限（チェックアウト） | ❌ **未確認** |

---

## ⚠️ 不一致・不足している環境変数

### 🔴 必須環境変数が不足している可能性

以下の環境変数は**必須**ですが、PDFからは確認できませんでした：

1. **`DATABASE_URL`** ⚠️ **重要**
   - Supabase PostgreSQL接続に必要
   - 環境グループ `fleapay-prod` に設定されている可能性あり

2. **`SUPABASE_SERVICE_ROLE_KEY`** ⚠️ **重要**
   - Supabase Service Role Key
   - サーバーサイドAPIで使用
   - 環境グループ `fleapay-prod` に設定されている可能性あり

3. **`STRIPE_SECRET_KEY`** ⚠️ **重要**
   - Stripe決済API認証に必要
   - 環境グループ `fleapay-prod` に設定されている可能性あり

4. **`NEXT_PUBLIC_SUPABASE_URL`** / **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - PDFでは `NEXT_PUBLIC_SUPABA...` として一部が隠れている
   - どちらか一方、または両方が設定されている可能性あり

### 🟡 推奨環境変数が不足している可能性

以下の環境変数は推奨ですが、PDFからは確認できませんでした：

1. **`BASE_URL`**
   - アプリケーションのベースURL
   - デフォルト値あり（`http://localhost:3000`）
   - 本番環境では設定推奨

2. **`PORT`**
   - サーバーポート
   - デフォルト値あり（`3000`）
   - Renderでは自動設定される可能性あり

### 🟢 オプション環境変数（機能を使用する場合のみ必要）

以下の環境変数はオプションですが、PDFからは確認できませんでした：

- `AWS_S3_BUCKET` - S3アップロード機能を使用する場合
- `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID` - S3アップロード機能を使用する場合
- `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY` - S3アップロード機能を使用する場合
- `PENDING_TTL_MIN` - カスタム保留注文有効期限を設定する場合
- `OPENAI_PROMPT_PHOTO_FRAME` - カスタムプロンプトを使用する場合
- `WORLD_PRICE_DEBUG` - デバッグモードを使用する場合
- `SKIP_WEBHOOK_VERIFY` - Webhook検証をスキップする場合（開発環境のみ）
- `STRIPE_WEBHOOK_SECRET` - Stripe Webhook検証を使用する場合
- `RATE_LIMIT_MAX_WRITES` - カスタムレート制限を設定する場合
- `RATE_LIMIT_MAX_CHECKOUT` - カスタムレート制限を設定する場合

---

## ✅ 確認済み環境変数

PDFから確認できた環境変数：

1. ✅ `NODE_ENV` - 実行環境
2. ✅ `ADMIN_TOKEN` - 管理者API認証
3. ✅ `AWS_REGION` - AWS S3リージョン
4. ✅ `EBAY_CLIENT_ID` - eBay API Client ID
5. ✅ `EBAY_CLIENT_SECRET` - eBay API Client Secret
6. ✅ `EBAY_ENV` - eBay環境
7. ✅ `EBAY_SOURCE_MODE` - eBayデータソースモード
8. ✅ `OPENAI_API_KEY` - OpenAI API
9. ⚠️ `NEXT_PUBLIC_SUPABA...` - Supabase関連（一部が隠れている）
10. ⚠️ `ADMIN_BOOTSTRAP_S...` - 管理者SQL実行機能（一部が隠れている）

---

## 🔍 環境グループ `fleapay-prod` の確認

PDFによると、環境グループ `fleapay-prod` がリンクされています。

この環境グループには以下の環境変数が含まれている可能性があります：

- `ADMIN_BOOTSTRAP_S...` (おそらく `ADMIN_BOOTSTRAP_SQL_ENABLED`)
- `ADMIN_TOKEN`
- `AWS_REGION`
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_ENV`
- `EBAY_SOURCE_MODE`
- `OPENAI_API_KEY`

**注意**: 環境グループに設定されている環境変数は、PDFの「Environment Variables」セクションには表示されない可能性があります。

---

## 📝 推奨アクション

### 1. Render Dashboardで確認すべき環境変数

以下の環境変数が設定されているか、Render Dashboardで直接確認してください：

#### 必須環境変数

- [ ] `DATABASE_URL` - Supabase PostgreSQL接続文字列
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase API URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anon Key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase Service Role Key
- [ ] `STRIPE_SECRET_KEY` - Stripe Secret Key

#### 推奨環境変数

- [ ] `BASE_URL` - アプリケーションのベースURL（例: `https://fleapay-lite-web-preview.onrender.com`）
- [ ] `PORT` - サーバーポート（Renderでは自動設定される可能性あり）

#### オプション環境変数（機能を使用する場合）

- [ ] `AWS_S3_BUCKET` - S3アップロード機能を使用する場合
- [ ] `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID` - S3アップロード機能を使用する場合
- [ ] `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY` - S3アップロード機能を使用する場合
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe Webhook検証を使用する場合

### 2. 環境グループ `fleapay-prod` の確認

環境グループ `fleapay-prod` に設定されている環境変数を確認してください：

1. Render Dashboard > Environment Groups > `fleapay-prod` を開く
2. 設定されている環境変数をリストアップ
3. 上記の必須環境変数が含まれているか確認

### 3. 動作確認

環境変数の設定を確認したら、以下を実行してください：

1. サーバーを再起動（環境変数の変更を反映）
2. ヘルスチェック（`/api/ping`）を確認
3. 主要APIエンドポイントを確認
4. エラーログを確認

---

## 📊 環境変数の分類まとめ

### ✅ PDFで確認済み（10個）

- `NODE_ENV`
- `ADMIN_TOKEN`
- `AWS_REGION`
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_ENV`
- `EBAY_SOURCE_MODE`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABA...` (一部が隠れている)
- `ADMIN_BOOTSTRAP_S...` (一部が隠れている)

### ⚠️ PDFで未確認だが必須（5個）

- `DATABASE_URL` ⚠️ **重要**
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **重要**
- `STRIPE_SECRET_KEY` ⚠️ **重要**
- `NEXT_PUBLIC_SUPABASE_URL` (一部が隠れている可能性あり)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (一部が隠れている可能性あり)

### ⚠️ PDFで未確認だが推奨（2個）

- `BASE_URL`
- `PORT`

### ❓ オプション（機能を使用する場合のみ必要）

- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY`
- `PENDING_TTL_MIN`
- `OPENAI_PROMPT_PHOTO_FRAME`
- `WORLD_PRICE_DEBUG`
- `SKIP_WEBHOOK_VERIFY`
- `STRIPE_WEBHOOK_SECRET`
- `RATE_LIMIT_MAX_WRITES`
- `RATE_LIMIT_MAX_CHECKOUT`

---

## 🔗 関連ドキュメント

- `.ai/history/setup/PHASE_1_4_ENVIRONMENT_VARIABLES.md` - 環境変数整理ガイド
- `.ai/history/setup/RENDER_AND_LOCAL_SETUP.md` - Render環境変数とローカル設定ガイド
- `MIGRATION_EXECUTION_PLAN.md` - 技術スタック移行実行計画書

---

**次回更新**: Render Dashboardで直接確認後

