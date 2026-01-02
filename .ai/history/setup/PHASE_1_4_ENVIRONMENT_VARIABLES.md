# Phase 1.4: 検証環境環境変数整理ガイド

**作成日**: 2026-01-02  
**対象環境**: 検証環境（Staging）  
**目的**: 検証環境の環境変数を整理・最適化し、Supabase移行後の設定を最適化する

---

## 📋 現在の環境変数一覧

### 必須環境変数（Supabase移行後）

| 環境変数名 | 用途 | 必須 | 備考 |
|-----------|------|------|------|
| `DATABASE_URL` | Supabase PostgreSQL接続 | ✅ 必須 | Connection Pooling（IPv4対応、port 6543） |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | ✅ 必須 | フロントエンド用（将来のSupabase Auth移行時に使用） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ 必須 | フロントエンド用（将来のSupabase Auth移行時に使用） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | ✅ 必須 | サーバーサイド用（管理者API等） |

### 既存環境変数（継続使用）

| 環境変数名 | 用途 | 必須 | 備考 |
|-----------|------|------|------|
| `STRIPE_SECRET_KEY` | Stripe決済 | ✅ 必須 | Stripe API認証 |
| `ADMIN_TOKEN` | 管理者API認証 | ⚠️ 推奨 | デフォルト: `admin-devtoken`（本番環境では必須） |
| `BASE_URL` | アプリケーションのベースURL | ⚠️ 推奨 | デフォルト: `http://localhost:3000` |
| `PORT` | サーバーポート | ⚠️ 推奨 | デフォルト: `3000` |
| `NODE_ENV` | 実行環境 | ⚠️ 推奨 | `development` / `production` / `staging` |
| `PENDING_TTL_MIN` | 保留注文の有効期限（分） | ⚠️ オプション | デフォルト: `30` |

### オプション環境変数（機能別）

| 環境変数名 | 用途 | 必須 | 備考 |
|-----------|------|------|------|
| `OPENAI_API_KEY` | OpenAI API（画像解析） | ❌ オプション | 設定されていない場合は無効化 |
| `AWS_REGION` | AWS S3リージョン | ❌ オプション | S3アップロード機能用 |
| `AWS_S3_BUCKET` | AWS S3バケット名 | ❌ オプション | S3アップロード機能用 |
| `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID` | AWSアクセスキー | ❌ オプション | S3アップロード機能用 |
| `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY` | AWSシークレットキー | ❌ オプション | S3アップロード機能用 |
| `ADMIN_BOOTSTRAP_SQL_ENABLED` | 管理者SQL実行機能 | ❌ オプション | デフォルト: 無効（`true`で有効化） |
| `OPENAI_PROMPT_PHOTO_FRAME` | OpenAIプロンプト（フォトフレーム） | ❌ オプション | カスタムプロンプト用 |

---

## 🔍 環境変数の使用箇所

### `server.js`での使用

```javascript
// データベース接続
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// OpenAI（オプション）
const HAS_OPENAI_CONFIG = !!process.env.OPENAI_API_KEY;
const openai = HAS_OPENAI_CONFIG ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// AWS S3（オプション）
const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const HAS_S3_CONFIG = !!(AWS_REGION && AWS_BUCKET && AWS_ACCESS_KEY && AWS_SECRET_KEY);

// 設定
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-devtoken";
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const PORT = process.env.PORT || 3000;
const PENDING_TTL_MIN = parseInt(process.env.PENDING_TTL_MIN || "30", 10);
```

### Prismaでの使用

```javascript
// Prisma Client初期化時にDATABASE_URLを使用
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
});
```

### フロントエンドでの使用（将来）

現在は使用されていませんが、Phase 1.5以降でSupabase Auth移行時に使用予定：

- `NEXT_PUBLIC_SUPABASE_URL` - Supabaseクライアント初期化
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabaseクライアント認証

---

## 📝 検証環境での推奨設定

### Render Dashboardでの環境変数設定

#### 必須環境変数

```bash
# データベース接続（Supabase Connection Pooling）
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Supabase設定（将来のSupabase Auth移行用）
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Stripe
STRIPE_SECRET_KEY=[stripe-secret-key]

# 管理者認証
ADMIN_TOKEN=[secure-admin-token]

# アプリケーション設定
BASE_URL=https://fleapay-lite-t1.onrender.com
PORT=10000
NODE_ENV=staging
```

#### オプション環境変数（機能を使用する場合）

```bash
# OpenAI（画像解析機能を使用する場合）
OPENAI_API_KEY=[openai-api-key]

# AWS S3（画像アップロード機能を使用する場合）
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=[bucket-name]
AWS_ACCESS_KEY=[access-key]
AWS_SECRET_KEY=[secret-key]

# その他
PENDING_TTL_MIN=30
ADMIN_BOOTSTRAP_SQL_ENABLED=false
```

---

## ✅ 環境変数整理チェックリスト

### 1. Supabase関連環境変数の確認

- [ ] `DATABASE_URL`がSupabase Connection Poolingに設定されている
  - ホスト名: `aws-0-[region].pooler.supabase.com`
  - ポート: `6543`
  - IPv4対応の接続文字列であることを確認
- [ ] `NEXT_PUBLIC_SUPABASE_URL`が設定されている
  - 形式: `https://[project-ref].supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`が設定されている
  - Supabase Dashboard > Settings > API > anon public key
- [ ] `SUPABASE_SERVICE_ROLE_KEY`が設定されている
  - Supabase Dashboard > Settings > API > service_role secret key

### 2. 不要な環境変数の削除

- [ ] 旧Render PostgreSQLの接続文字列が残っていないか確認
- [ ] 使用していない環境変数が残っていないか確認

### 3. セキュリティ確認

- [ ] `ADMIN_TOKEN`がデフォルト値（`admin-devtoken`）でないことを確認
- [ ] 機密情報（APIキー、パスワード）が適切に保護されていることを確認

### 4. 動作確認

- [ ] サーバーが正常に起動することを確認
- [ ] データベース接続が正常に動作することを確認
- [ ] 主要APIエンドポイントが正常に動作することを確認
- [ ] 画面が正常に表示されることを確認

---

## 🔧 環境変数の最適化

### 1. 接続設定の最適化

**現状**: Supabase Connection Pooling（IPv4対応）を使用

**確認事項**:
- Connection Poolingの接続文字列が正しいか
- ポート番号が`6543`（Transaction pooler）であるか
- IPv4対応のホスト名（`aws-0-*.pooler.supabase.com`）を使用しているか

### 2. 環境変数の命名規則

**推奨**:
- Supabase関連: `NEXT_PUBLIC_SUPABASE_*`（フロントエンド用）、`SUPABASE_*`（サーバーサイド用）
- AWS関連: `AWS_*`（統一）
- その他: 大文字・アンダースコア区切り

### 3. デフォルト値の設定

**推奨**:
- 開発環境用のデフォルト値を設定（`server.js`で実装済み）
- 本番環境ではすべて明示的に設定

---

## 📊 環境変数の分類

### カテゴリ別分類

#### データベース
- `DATABASE_URL` ✅

#### Supabase（将来のAuth移行用）
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

#### 決済
- `STRIPE_SECRET_KEY` ✅

#### 認証・セキュリティ
- `ADMIN_TOKEN` ✅

#### アプリケーション設定
- `BASE_URL` ✅
- `PORT` ✅
- `NODE_ENV` ✅
- `PENDING_TTL_MIN` ⚠️ オプション

#### 外部サービス（オプション）
- `OPENAI_API_KEY` ❌ オプション
- `AWS_REGION` ❌ オプション
- `AWS_S3_BUCKET` ❌ オプション
- `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID` ❌ オプション
- `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY` ❌ オプション

#### 機能フラグ（オプション）
- `ADMIN_BOOTSTRAP_SQL_ENABLED` ❌ オプション
- `OPENAI_PROMPT_PHOTO_FRAME` ❌ オプション

---

## 🚀 実施手順

### Step 1: 現在の環境変数を確認

1. Render Dashboard > Environment Variables を開く
2. 現在設定されている環境変数をリストアップ
3. 上記の分類表と照合

### Step 2: 不要な環境変数を削除

1. 旧Render PostgreSQLの接続文字列が残っていないか確認
2. 使用していない環境変数を削除

### Step 3: 必須環境変数の確認

1. Supabase関連の環境変数が正しく設定されているか確認
2. 接続文字列がIPv4対応のConnection Poolingであることを確認

### Step 4: 動作確認

1. サーバーを再起動
2. ヘルスチェック（`/api/ping`）を確認
3. 主要APIエンドポイントを確認
4. 画面表示を確認

---

## 📚 関連ドキュメント

- `STAGING_MIGRATION_COMPLETE.md` - 検証環境DB移行完了報告
- `.ai/history/migrations/MIGRATION_EXECUTION_PLAN.md` - 技術スタック移行実行計画書
- `FIX_IPV6_CONNECTION_ERROR.md` - IPv6接続エラーの修正ガイド

---

**次回更新**: Phase 1.4完了後

