# Vercel環境変数監査レポート

**作成日**: 2026-01-06  
**対象**: `edoichiba-fleapay` プロジェクト  
**参照**: [Vercel Environment Variables](https://vercel.com/alvis-industry/edoichiba-fleapay/settings/environment-variables)

---

## 📋 PDFから確認できた環境変数

PDFから確認できた環境変数（すべて "All Environments" に設定）：

| # | 環境変数名 | 状態 | 備考 |
|---|-----------|------|------|
| 1 | `ADMIN_BOOTSTRAP_SQL_ENABLED` | ✅ 確認済み | 管理者SQL実行機能 |
| 2 | `ADMIN_TOKEN` | ✅ 確認済み | 管理者API認証 |
| 3 | `AWS_REGION` | ✅ 確認済み | AWS S3リージョン |
| 4 | `EBAY_CLIENT_ID` | ✅ 確認済み | eBay API Client ID |
| 5 | `EBAY_CLIENT_SECRET` | ✅ 確認済み | eBay API Client Secret |
| 6 | `EBAY_ENV` | ✅ 確認済み | eBay環境（production/sandbox） |
| 7 | `EBAY_SOURCE_MODE` | ✅ 確認済み | eBayデータソースモード |
| 8 | `HELICONE_API_KEY` | ✅ 確認済み | Helicone API監視 |
| 9 | `OPENAI_API_KEY` | ✅ 確認済み | OpenAI API認証 |
| 10 | `OPENAI_PROMPT` | ✅ 確認済み | OpenAIプロンプト（カスタム） |
| 11 | `CLIENT_KEY...` | ⚠️ 一部確認 | 名前が一部隠れている |

---

## 🔴 必須環境変数の不足確認

コードベースで**必須**として使用されているが、PDFから**確認できなかった**環境変数：

### 1. `DATABASE_URL` ⚠️ **重要**

**用途**: Supabase PostgreSQL接続（Prismaで使用）

**使用箇所**:
- `lib/prisma.ts` - Prisma Client初期化
- `app/api/seller/start_onboarding/route.ts`
- `app/api/admin/frames/route.ts`
- `app/api/admin/sellers/route.ts`
- `app/api/seller/kids-summary/route.ts`
- `app/api/debug/db-status/route.ts`

**確認方法**:
1. Vercel Dashboard > Settings > Environment Variables
2. `DATABASE_URL` が設定されているか確認
3. 値の形式: `postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres`

**推奨アクション**: ✅ **設定必須** - アプリケーションが動作しない可能性があります

---

### 2. `NEXT_PUBLIC_SUPABASE_URL` ⚠️ **重要**

**用途**: Supabase API URL（フロントエンド用）

**使用箇所**:
- `lib/supabase.js` - Supabaseクライアント初期化
- `app/api/seller/start_onboarding/route.ts` - エラーチェック

**確認方法**:
1. PDFに `NEXT_PUBLIC_SUPABA...` という項目が見えるが、完全な名前が確認できない
2. Vercel Dashboardで完全な名前を確認

**推奨アクション**: ⚠️ **確認必要** - PDFで一部が隠れている可能性あり

---

### 3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ⚠️ **重要**

**用途**: Supabase Anon Key（フロントエンド用）

**使用箇所**:
- `lib/supabase.js` - Supabaseクライアント初期化

**確認方法**:
1. PDFに `NEXT_PUBLIC_SUPABA...` という項目が見えるが、完全な名前が確認できない
2. Vercel Dashboardで完全な名前を確認

**推奨アクション**: ⚠️ **確認必要** - PDFで一部が隠れている可能性あり

---

### 4. `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **重要**

**用途**: Supabase Service Role Key（サーバーサイド用、RLSバイパス）

**使用箇所**:
- `lib/supabase.js` - Supabase Adminクライアント初期化

**確認方法**:
1. Vercel Dashboard > Settings > Environment Variables
2. `SUPABASE_SERVICE_ROLE_KEY` が設定されているか確認

**推奨アクション**: ✅ **設定必須** - 管理者APIが動作しない可能性があります

---

### 5. `STRIPE_SECRET_KEY` ⚠️ **重要**

**用途**: Stripe決済API認証

**使用箇所**:
- `app/api/checkout/session/route.ts` - チェックアウトセッション作成
- `app/api/seller/start_onboarding/route.ts` - Stripe Connect Onboarding
- `app/api/webhooks/stripe/route.ts` - Stripe Webhook処理

**確認方法**:
1. Vercel Dashboard > Settings > Environment Variables
2. `STRIPE_SECRET_KEY` が設定されているか確認
3. 値の形式: `sk_test_...` または `sk_live_...`

**推奨アクション**: ✅ **設定必須** - 決済機能が動作しません

---

## 🟡 推奨環境変数の確認

以下の環境変数は推奨ですが、PDFからは確認できませんでした：

| 環境変数名 | 用途 | デフォルト値 | 状態 |
|-----------|------|------------|------|
| `NODE_ENV` | 実行環境識別 | - | ⚠️ 確認必要 |
| `BASE_URL` | アプリケーションのベースURL | `http://localhost:3000` | ⚠️ 確認必要 |
| `PORT` | サーバーポート | `3000` | ✅ Vercelでは自動設定 |

---

## 🟢 オプション環境変数の確認

以下の環境変数はオプションですが、機能を使用する場合に必要です：

| 環境変数名 | 用途 | PDFでの確認 | 状態 |
|-----------|------|------------|------|
| `AWS_S3_BUCKET` | AWS S3バケット名 | ❌ 未確認 | オプション |
| `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID` | AWSアクセスキー | ❌ 未確認 | オプション |
| `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY` | AWSシークレットキー | ❌ 未確認 | オプション |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret | ❌ 未確認 | オプション（Webhook使用時） |
| `PENDING_TTL_MIN` | 保留注文の有効期限（分） | ❌ 未確認 | オプション（デフォルト: 30） |
| `OPENAI_PROMPT_PHOTO_FRAME` | OpenAIプロンプト（フォトフレーム） | ❌ 未確認 | オプション |

---

## ✅ 環境変数名のバリデーション

PDFから確認できた環境変数名は、すべて**正しい形式**です：

- ✅ ハイフン（`-`）を使用していない
- ✅ 数字で始まっていない
- ✅ 特殊文字を含んでいない
- ✅ アンダースコア（`_`）を使用している

**参考**: `VERCEL_ENV_VAR_NAME_VALIDATION.md` を参照

---

## 🔍 確認が必要な項目

### 1. `CLIENT_KEY...` の正体

PDFに `CLIENT_KEY...` という項目が見えますが、完全な名前が確認できません。

**可能性**:
- `CLIENT_KEY` - 何らかのクライアント認証キー
- `STRIPE_CLIENT_KEY` - Stripe Publishable Key（`STRIPE_PUBLISHABLE_KEY`の可能性）
- その他のクライアントキー

**確認方法**:
1. Vercel Dashboardで完全な名前を確認
2. コードベースで使用されているか確認

---

### 2. `NEXT_PUBLIC_SUPABA...` の完全な名前

PDFに `NEXT_PUBLIC_SUPABA...` という項目が見えますが、完全な名前が確認できません。

**可能性**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- または両方

**確認方法**:
1. Vercel Dashboardで完全な名前を確認
2. 両方が設定されていることを確認

---

## 📊 環境変数の完全性チェック

### 必須環境変数のチェックリスト

| 環境変数名 | PDFでの確認 | コードでの使用 | 状態 |
|-----------|------------|--------------|------|
| `DATABASE_URL` | ❌ 未確認 | ✅ 必須 | 🔴 **要確認** |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ 一部確認 | ✅ 必須 | 🟡 **要確認** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ 一部確認 | ✅ 必須 | 🟡 **要確認** |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ 未確認 | ✅ 必須 | 🔴 **要確認** |
| `STRIPE_SECRET_KEY` | ❌ 未確認 | ✅ 必須 | 🔴 **要確認** |
| `ADMIN_TOKEN` | ✅ 確認済み | ✅ 推奨 | ✅ OK |
| `OPENAI_API_KEY` | ✅ 確認済み | ✅ オプション | ✅ OK |
| `HELICONE_API_KEY` | ✅ 確認済み | ✅ オプション | ✅ OK |

---

## 🚨 緊急対応が必要な項目

以下の環境変数が設定されていない場合、アプリケーションが**正常に動作しません**：

1. **`DATABASE_URL`** - データベース接続不可
2. **`STRIPE_SECRET_KEY`** - 決済機能が動作しない
3. **`SUPABASE_SERVICE_ROLE_KEY`** - 管理者APIが動作しない可能性

---

## ✅ 推奨アクション

### 即座対応（P0）

1. **Vercel Dashboardで確認**
   - [Environment Variables](https://vercel.com/alvis-industry/edoichiba-fleapay/settings/environment-variables) を開く
   - 以下の環境変数が設定されているか確認：
     - `DATABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `STRIPE_SECRET_KEY`

2. **不足している環境変数を追加**
   - 必須環境変数が不足している場合は、すぐに追加
   - 値は Supabase Dashboard と Stripe Dashboard から取得

### 短期対応（P1）

3. **環境変数の整理**
   - 使用していない環境変数を削除
   - 環境ごと（Production/Preview/Development）に適切に設定

4. **ドキュメント化**
   - 環境変数の用途と取得方法をドキュメント化
   - チームメンバーが参照できるようにする

---

## 📚 参考資料

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Stripe API Keys](https://stripe.com/docs/keys)

---

**最終更新**: 2026-01-06  
**ステータス**: ⚠️ **要確認** - 必須環境変数の確認が必要

