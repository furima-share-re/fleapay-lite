# 環境変数差異分析レポート

**作成日**: 2026-01-03  
**対象環境**: fleapay-lite-web-preview (Render Dashboard)  
**目的**: Render Dashboardの環境変数とコードベースで使用されている環境変数の詳細な差異分析

---

## 📊 差異分析サマリー

| カテゴリ | 数 | 状態 |
|---------|---|------|
| ✅ **一致している環境変数** | 10個 | PDFで確認済み |
| 🔴 **Renderに不足している必須環境変数** | 5個 | 要確認・設定 |
| 🟡 **Renderに不足している推奨環境変数** | 2個 | 推奨設定 |
| 🟢 **Renderに不足しているオプション環境変数** | 11個 | 機能使用時に必要 |
| ⚠️ **Renderにあるがコードで未使用の可能性** | 0個 | 現時点で問題なし |

---

## ✅ 一致している環境変数（10個）

PDFから確認でき、コードベースでも使用されている環境変数：

| 環境変数名 | コードでの使用箇所 | 用途 | 状態 |
|-----------|------------------|------|------|
| `NODE_ENV` | `lib/prisma.ts`, `app/api/ping/route.ts`, 他多数 | 実行環境識別 | ✅ 一致 |
| `ADMIN_TOKEN` | `app/api/admin/*/route.ts` (複数) | 管理者API認証 | ✅ 一致 |
| `AWS_REGION` | `app/api/pending/start/route.ts` | AWS S3リージョン | ✅ 一致 |
| `EBAY_CLIENT_ID` | `worldPriceEngine/ebayClient.js` | eBay API Client ID | ✅ 一致 |
| `EBAY_CLIENT_SECRET` | `worldPriceEngine/ebayClient.js` | eBay API Client Secret | ✅ 一致 |
| `EBAY_ENV` | `worldPriceEngine/ebayClient.js` | eBay環境（production/sandbox） | ✅ 一致 |
| `EBAY_SOURCE_MODE` | `worldPriceEngine/ebayClient.js` | eBayデータソースモード | ✅ 一致 |
| `OPENAI_API_KEY` | `app/api/photo-frame/route.ts`, `app/api/analyze-item/route.ts` | OpenAI API認証 | ✅ 一致 |
| `NEXT_PUBLIC_SUPABA...` | `lib/supabase.js` | Supabase設定（一部が隠れている） | ⚠️ 一部確認 |
| `ADMIN_BOOTSTRAP_S...` | `app/api/admin/bootstrap-sql/route.ts` | 管理者SQL実行機能 | ⚠️ 一部確認 |

---

## 🔴 Renderに不足している必須環境変数（5個）

コードベースで**必須**として使用されているが、PDFからは確認できなかった環境変数：

### 1. `DATABASE_URL` ⚠️ **最重要**

**使用箇所**:
- `app/api/seller/start_onboarding/route.ts` (line 14)
- `app/api/admin/sellers/route.ts` (line 9)
- `app/api/admin/frames/route.ts` (line 9)
- `app/api/seller/kids-summary/route.ts` (line 9)
- `lib/prisma.ts` (Prisma Client初期化)

**用途**: Supabase PostgreSQL接続文字列

**必須度**: 🔴 **必須** - アプリケーションが起動しない

**推奨設定値**:
```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**確認方法**: Render Dashboard > Environment Variables で確認

---

### 2. `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **最重要**

**使用箇所**:
- `lib/supabase.js` (line 8)

**用途**: Supabase Service Role Key（サーバーサイドAPI用）

**必須度**: 🔴 **必須** - Supabase Auth機能が動作しない

**推奨設定値**: Supabase Dashboard > Settings > API > service_role secret key

**確認方法**: Render Dashboard > Environment Variables で確認

---

### 3. `STRIPE_SECRET_KEY` ⚠️ **最重要**

**使用箇所**:
- `app/api/webhooks/stripe/route.ts` (line 10)
- `app/api/seller/start_onboarding/route.ts` (line 9)
- `app/api/checkout/session/route.ts` (line 10)

**用途**: Stripe決済API認証

**必須度**: 🔴 **必須** - 決済機能が動作しない

**推奨設定値**: Stripe Dashboard > Developers > API keys > Secret key

**確認方法**: Render Dashboard > Environment Variables で確認

---

### 4. `NEXT_PUBLIC_SUPABASE_URL` ⚠️ **重要**

**使用箇所**:
- `lib/supabase.js` (line 6)

**用途**: Supabase API URL（フロントエンド用）

**必須度**: 🔴 **必須** - Supabase Auth機能が動作しない

**推奨設定値**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
```

**PDFでの状態**: `NEXT_PUBLIC_SUPABA...` として一部が隠れている（設定されている可能性あり）

**確認方法**: Render Dashboard > Environment Variables で完全な名前を確認

---

### 5. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ⚠️ **重要**

**使用箇所**:
- `lib/supabase.js` (line 7)

**用途**: Supabase Anon Key（フロントエンド用）

**必須度**: 🔴 **必須** - Supabase Auth機能が動作しない

**推奨設定値**: Supabase Dashboard > Settings > API > anon public key

**PDFでの状態**: `NEXT_PUBLIC_SUPABA...` として一部が隠れている（設定されている可能性あり）

**確認方法**: Render Dashboard > Environment Variables で完全な名前を確認

---

## 🟡 Renderに不足している推奨環境変数（2個）

コードベースで**推奨**として使用されているが、PDFからは確認できなかった環境変数：

### 1. `BASE_URL`

**使用箇所**:
- `app/api/seller/start_onboarding/route.ts` (line 17)
- `app/api/checkout/session/route.ts` (line 14)
- `lib/utils.ts` (line 36, 60)

**用途**: アプリケーションのベースURL

**必須度**: 🟡 **推奨** - デフォルト値あり（`http://localhost:3000`）

**デフォルト値**: `http://localhost:3000`

**推奨設定値**:
```env
BASE_URL=https://fleapay-lite-web-preview.onrender.com
```

**影響**: 設定されていない場合、ローカルホストのURLが使用される可能性がある

---

### 2. `PORT`

**使用箇所**:
- `public/server.js` (line 1447)

**用途**: サーバーポート

**必須度**: 🟡 **推奨** - デフォルト値あり（`3000`）、Renderでは自動設定される可能性あり

**デフォルト値**: `3000`

**推奨設定値**: Renderでは自動設定されるため、明示的な設定は不要な可能性あり

**影響**: 設定されていない場合、デフォルト値（3000）が使用される

---

## 🟢 Renderに不足しているオプション環境変数（11個）

コードベースで**オプション**として使用されているが、PDFからは確認できなかった環境変数：

### AWS S3関連（4個）

| 環境変数名 | 使用箇所 | 用途 | 必須度 |
|-----------|---------|------|--------|
| `AWS_S3_BUCKET` | `app/api/pending/start/route.ts` (line 15) | AWS S3バケット名 | 🟢 オプション |
| `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID` | `app/api/pending/start/route.ts` (line 16) | AWSアクセスキー | 🟢 オプション |
| `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY` | `app/api/pending/start/route.ts` (line 17) | AWSシークレットキー | 🟢 オプション |

**注意**: `AWS_REGION` はPDFで確認済み ✅

**影響**: S3アップロード機能を使用する場合のみ必要

---

### Stripe Webhook関連（2個）

| 環境変数名 | 使用箇所 | 用途 | 必須度 |
|-----------|---------|------|--------|
| `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/stripe/route.ts` (line 44) | Stripe Webhook検証 | 🟢 オプション |
| `SKIP_WEBHOOK_VERIFY` | `app/api/webhooks/stripe/route.ts` (line 35) | Webhook検証スキップ（開発環境のみ） | 🟢 オプション |

**影響**: Stripe Webhook検証を使用する場合のみ必要

---

### レート制限関連（2個）

| 環境変数名 | 使用箇所 | 用途 | デフォルト値 | 必須度 |
|-----------|---------|------|------------|--------|
| `RATE_LIMIT_MAX_WRITES` | `app/api/pending/start/route.ts` (line 11) | レート制限（書き込み） | `12` | 🟢 オプション |
| `RATE_LIMIT_MAX_CHECKOUT` | `app/api/checkout/session/route.ts` (line 15) | レート制限（チェックアウト） | `12` | 🟢 オプション |

**影響**: カスタムレート制限を設定する場合のみ必要

---

### その他オプション（5個）

| 環境変数名 | 使用箇所 | 用途 | デフォルト値 | 必須度 |
|-----------|---------|------|------------|--------|
| `PENDING_TTL_MIN` | `app/api/seller/order-detail/route.ts` (line 9) | 保留注文の有効期限（分） | `10` | 🟢 オプション |
| `OPENAI_PROMPT_PHOTO_FRAME` | `app/api/photo-frame/route.ts` (line 30) | OpenAIプロンプト（フォトフレーム） | `"Please beautify the photo."` | 🟢 オプション |
| `WORLD_PRICE_DEBUG` | `worldPriceEngine/worldPriceUpdate.js` (line 13) | 世界相場デバッグフラグ | `false` | 🟢 オプション |
| `ADMIN_BOOTSTRAP_SQL_ENABLED` | `app/api/admin/bootstrap-sql/route.ts` (line 35) | 管理者SQL実行機能 | `false` | 🟢 オプション |

**注意**: `ADMIN_BOOTSTRAP_SQL_ENABLED` はPDFで `ADMIN_BOOTSTRAP_S...` として一部が隠れている（設定されている可能性あり）⚠️

---

## 📋 環境グループ `fleapay-prod` の影響

PDFによると、環境グループ `fleapay-prod` がリンクされています。

この環境グループに設定されている環境変数は、PDFの「Environment Variables」セクションには表示されない可能性があります。

### 環境グループに含まれている可能性がある環境変数

PDFから確認できた環境変数のうち、環境グループに含まれている可能性があるもの：

- `ADMIN_BOOTSTRAP_SQL_ENABLED` (PDFでは `ADMIN_BOOTSTRAP_S...`)
- `ADMIN_TOKEN`
- `AWS_REGION`
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_ENV`
- `EBAY_SOURCE_MODE`
- `OPENAI_API_KEY`

### 環境グループに含まれている可能性がある必須環境変数

以下の必須環境変数が環境グループに設定されている可能性があります：

- `DATABASE_URL` ⚠️ **重要**
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **重要**
- `STRIPE_SECRET_KEY` ⚠️ **重要**
- `NEXT_PUBLIC_SUPABASE_URL` ⚠️ **重要**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ⚠️ **重要**

**確認方法**: Render Dashboard > Environment Groups > `fleapay-prod` を開いて確認

---

## 🔍 詳細な差異分析

### カテゴリ別差異

#### 1. データベース関連

| 環境変数名 | Render設定 | コード使用 | 差異 |
|-----------|-----------|----------|------|
| `DATABASE_URL` | ❓ 未確認（環境グループに可能性） | ✅ 必須 | ⚠️ **要確認** |

#### 2. Supabase関連

| 環境変数名 | Render設定 | コード使用 | 差異 |
|-----------|-----------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ 一部確認（`NEXT_PUBLIC_SUPABA...`） | ✅ 必須 | ⚠️ **要確認** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ 一部確認（`NEXT_PUBLIC_SUPABA...`） | ✅ 必須 | ⚠️ **要確認** |
| `SUPABASE_SERVICE_ROLE_KEY` | ❓ 未確認（環境グループに可能性） | ✅ 必須 | ⚠️ **要確認** |

#### 3. Stripe関連

| 環境変数名 | Render設定 | コード使用 | 差異 |
|-----------|-----------|----------|------|
| `STRIPE_SECRET_KEY` | ❓ 未確認（環境グループに可能性） | ✅ 必須 | ⚠️ **要確認** |
| `STRIPE_WEBHOOK_SECRET` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし |
| `SKIP_WEBHOOK_VERIFY` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし |

#### 4. AWS S3関連

| 環境変数名 | Render設定 | コード使用 | 差異 |
|-----------|-----------|----------|------|
| `AWS_REGION` | ✅ 確認済み | 🟢 オプション | ✅ 一致 |
| `AWS_S3_BUCKET` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし（機能使用時のみ必要） |
| `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし（機能使用時のみ必要） |
| `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし（機能使用時のみ必要） |

#### 5. eBay関連

| 環境変数名 | Render設定 | コード使用 | 差異 |
|-----------|-----------|----------|------|
| `EBAY_CLIENT_ID` | ✅ 確認済み | 🟢 オプション | ✅ 一致 |
| `EBAY_CLIENT_SECRET` | ✅ 確認済み | 🟢 オプション | ✅ 一致 |
| `EBAY_ENV` | ✅ 確認済み | 🟢 オプション | ✅ 一致 |
| `EBAY_SOURCE_MODE` | ✅ 確認済み | 🟢 オプション | ✅ 一致 |
| `WORLD_PRICE_DEBUG` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし |

#### 6. OpenAI関連

| 環境変数名 | Render設定 | コード使用 | 差異 |
|-----------|-----------|----------|------|
| `OPENAI_API_KEY` | ✅ 確認済み | 🟢 オプション | ✅ 一致 |
| `OPENAI_PROMPT_PHOTO_FRAME` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし |

#### 7. アプリケーション設定関連

| 環境変数名 | Render設定 | コード使用 | 差異 |
|-----------|-----------|----------|------|
| `NODE_ENV` | ✅ 確認済み | 🟡 推奨 | ✅ 一致 |
| `BASE_URL` | ❌ 未確認 | 🟡 推奨 | ⚠️ **推奨設定** |
| `PORT` | ❌ 未確認 | 🟡 推奨 | ✅ 問題なし（Renderで自動設定） |
| `ADMIN_TOKEN` | ✅ 確認済み | 🟡 推奨 | ✅ 一致 |
| `ADMIN_BOOTSTRAP_SQL_ENABLED` | ⚠️ 一部確認（`ADMIN_BOOTSTRAP_S...`） | 🟢 オプション | ⚠️ **要確認** |
| `PENDING_TTL_MIN` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし |

#### 8. レート制限関連

| 環境変数名 | Render設定 | コード使用 | 差異 |
|-----------|-----------|----------|------|
| `RATE_LIMIT_MAX_WRITES` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし |
| `RATE_LIMIT_MAX_CHECKOUT` | ❌ 未確認 | 🟢 オプション | ✅ 問題なし |

---

## 📝 推奨アクション

### 🔴 緊急対応（必須環境変数の確認）

以下の環境変数が設定されているか、Render Dashboardで**直接確認**してください：

1. **`DATABASE_URL`** ⚠️ **最重要**
   - Render Dashboard > Environment Variables で確認
   - 環境グループ `fleapay-prod` にも確認

2. **`SUPABASE_SERVICE_ROLE_KEY`** ⚠️ **最重要**
   - Render Dashboard > Environment Variables で確認
   - 環境グループ `fleapay-prod` にも確認

3. **`STRIPE_SECRET_KEY`** ⚠️ **最重要**
   - Render Dashboard > Environment Variables で確認
   - 環境グループ `fleapay-prod` にも確認

4. **`NEXT_PUBLIC_SUPABASE_URL`** ⚠️ **重要**
   - PDFでは `NEXT_PUBLIC_SUPABA...` として一部が隠れている
   - Render Dashboardで完全な名前を確認

5. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** ⚠️ **重要**
   - PDFでは `NEXT_PUBLIC_SUPABA...` として一部が隠れている
   - Render Dashboardで完全な名前を確認

### 🟡 推奨対応（推奨環境変数の設定）

以下の環境変数を設定することを推奨します：

1. **`BASE_URL`**
   ```env
   BASE_URL=https://fleapay-lite-web-preview.onrender.com
   ```

### 🟢 オプション対応（機能を使用する場合のみ）

以下の環境変数は、該当機能を使用する場合のみ設定してください：

- **AWS S3アップロード機能を使用する場合**:
  - `AWS_S3_BUCKET`
  - `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY`

- **Stripe Webhook検証を使用する場合**:
  - `STRIPE_WEBHOOK_SECRET`

- **カスタムレート制限を設定する場合**:
  - `RATE_LIMIT_MAX_WRITES`
  - `RATE_LIMIT_MAX_CHECKOUT`

---

## 📊 差異サマリーテーブル

| カテゴリ | 環境変数名 | Render設定 | コード使用 | 差異 |
|---------|-----------|-----------|----------|------|
| **必須** | `DATABASE_URL` | ❓ | ✅ 必須 | ⚠️ **要確認** |
| **必須** | `SUPABASE_SERVICE_ROLE_KEY` | ❓ | ✅ 必須 | ⚠️ **要確認** |
| **必須** | `STRIPE_SECRET_KEY` | ❓ | ✅ 必須 | ⚠️ **要確認** |
| **必須** | `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ 一部確認 | ✅ 必須 | ⚠️ **要確認** |
| **必須** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ 一部確認 | ✅ 必須 | ⚠️ **要確認** |
| **推奨** | `BASE_URL` | ❌ | 🟡 推奨 | ⚠️ **推奨設定** |
| **推奨** | `PORT` | ❌ | 🟡 推奨 | ✅ 問題なし |
| **一致** | `NODE_ENV` | ✅ | 🟡 推奨 | ✅ 一致 |
| **一致** | `ADMIN_TOKEN` | ✅ | 🟡 推奨 | ✅ 一致 |
| **一致** | `AWS_REGION` | ✅ | 🟢 オプション | ✅ 一致 |
| **一致** | `EBAY_CLIENT_ID` | ✅ | 🟢 オプション | ✅ 一致 |
| **一致** | `EBAY_CLIENT_SECRET` | ✅ | 🟢 オプション | ✅ 一致 |
| **一致** | `EBAY_ENV` | ✅ | 🟢 オプション | ✅ 一致 |
| **一致** | `EBAY_SOURCE_MODE` | ✅ | 🟢 オプション | ✅ 一致 |
| **一致** | `OPENAI_API_KEY` | ✅ | 🟢 オプション | ✅ 一致 |
| **一部確認** | `ADMIN_BOOTSTRAP_SQL_ENABLED` | ⚠️ 一部確認 | 🟢 オプション | ⚠️ **要確認** |

---

## 🔗 関連ドキュメント

- `ENVIRONMENT_VARIABLES_CHECK.md` - 環境変数一致チェックレポート
- `.ai/history/setup/PHASE_1_4_ENVIRONMENT_VARIABLES.md` - 環境変数整理ガイド
- `.ai/history/setup/RENDER_AND_LOCAL_SETUP.md` - Render環境変数とローカル設定ガイド
- `MIGRATION_EXECUTION_PLAN.md` - 技術スタック移行実行計画書

---

**次回更新**: Render Dashboardで直接確認後

