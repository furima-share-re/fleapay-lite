# Render環境変数とローカル設定ガイド

Supabaseの接続情報を取得したら、Render Dashboardとローカル環境の設定を行います。

## 📋 必要な情報（確認済み）

### 検証環境（staging）
- **プロジェクト名**: `edo ichiba staging`
- **Project ID**: `mluvjdhqgfpcfsmvjae`
- **Supabase URL**: `https://mluvjdhqgfpcfsmvjae.supabase.co`
- **Database URL**: `postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres`
- **anon key**: [Settings > API Keys から取得]
- **service_role key**: [Settings > API Keys > Reveal から取得]

---

## 🔧 ステップ1: Render Dashboardでの環境変数設定

### 1.1 検証環境（fleapay-lite-web-preview）の設定

1. [Render Dashboard](https://dashboard.render.com) にログイン
2. **Services** から `fleapay-lite-web-preview` を選択
3. 左メニューから **Environment** を開く
4. 以下の環境変数を追加/更新：

#### 必須の環境変数

```env
# データベース接続（Supabase）
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres

# Supabase API
NEXT_PUBLIC_SUPABASE_URL=https://mluvjdhqgfpcfsmvjae.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-keyを貼り付け]
SUPABASE_SERVICE_ROLE_KEY=[service-role-keyを貼り付け]

# 環境識別（既に設定されている場合は確認のみ）
NODE_ENV=preview
```

#### 既存の環境変数（そのまま維持）

以下の環境変数は既に設定されている場合は、そのまま維持してください：

```env
# 既存の環境変数（変更不要）
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
AWS_REGION=...
AWS_S3_BUCKET=...
AWS_ACCESS_KEY=...
AWS_SECRET_KEY=...
PORT=3000
# ... その他の環境変数
```

5. **Save Changes** をクリック
6. サービスが自動的に再デプロイされます

### 1.2 本番環境（fleapay-lite-web）の設定

**重要**: 本番環境は検証環境で問題がないことを確認してから設定してください。

1. `fleapay-lite-web` サービスを選択
2. **Environment** タブを開く
3. 本番環境用のSupabaseプロジェクトの接続情報を設定：

```env
# データベース接続（本番環境用Supabaseプロジェクト）
DATABASE_URL=postgresql://postgres:[PROD-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres

# Supabase API（本番環境用）
NEXT_PUBLIC_SUPABASE_URL=https://[PROD-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-role-key]

# 環境識別
NODE_ENV=production
```

---

## 💻 ステップ2: ローカル環境（.envファイル）の設定

### 2.1 .envファイルの場所

プロジェクトのルートディレクトリに `.env` ファイルを作成（または既存のものを更新）：

```
fleapay-lite/
  ├── .env          ← ここに作成
  ├── package.json
  ├── server.js
  └── ...
```

### 2.2 .envファイルの内容

検証環境（staging）の接続情報を使用することを推奨します：

```env
# === 検証環境（staging）の設定 ===
# プロジェクト名: edo ichiba staging
# Project ID: mluvjdhqgfpcfsmvjae

# データベース接続（Supabase）
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres

# Supabase API
NEXT_PUBLIC_SUPABASE_URL=https://mluvjdhqgfpcfsmvjae.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-keyを貼り付け]
SUPABASE_SERVICE_ROLE_KEY=[service-role-keyを貼り付け]

# 既存の環境変数（そのまま維持）
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
AWS_REGION=...
AWS_S3_BUCKET=...
AWS_ACCESS_KEY=...
AWS_SECRET_KEY=...
PORT=3000
# ... その他の環境変数
```

### 2.3 .envファイルの確認

`.gitignore` に `.env` が含まれていることを確認してください：

```bash
# .gitignore に以下が含まれているか確認
.env
.env.local
.env*.local
```

**重要**: `.env` ファイルはGitにコミットしないでください。

---

## 📝 ステップ3: ソースコード内の設定確認

### 3.1 server.js の確認

`server.js` では、環境変数から `DATABASE_URL` を読み込んでいます：

```javascript
// server.js (既存のコード)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

**変更不要**: このコードはそのまま動作します。環境変数 `DATABASE_URL` がSupabaseの接続文字列に変更されれば、自動的にSupabaseに接続されます。

### 3.2 lib/prisma.ts の確認

`lib/prisma.ts` も環境変数から `DATABASE_URL` を読み込んでいます：

```typescript
// lib/prisma.ts (既存のコード)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**変更不要**: Prismaも環境変数 `DATABASE_URL` を使用するため、そのまま動作します。

### 3.3 将来のSupabase Auth移行用（現時点では不要）

将来的にSupabase Authを使用する場合、`lib/supabase.ts` を作成しますが、現時点では不要です：

```typescript
// lib/supabase.ts (将来作成するファイル)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client (Service role key使用)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**注意**: このファイルは認証移行フェーズ（Phase 1.4以降）で作成します。現時点では作成不要です。

---

## ✅ 設定チェックリスト

### Render環境変数（検証環境）

- [ ] `DATABASE_URL` をSupabase接続文字列に設定
- [ ] `NEXT_PUBLIC_SUPABASE_URL` を設定
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
- [ ] `SUPABASE_SERVICE_ROLE_KEY` を設定
- [ ] `NODE_ENV=preview` が設定されていることを確認
- [ ] 既存の環境変数（STRIPE_SECRET_KEY等）が維持されていることを確認
- [ ] **Save Changes** をクリック
- [ ] デプロイが完了するまで待つ

### ローカル環境（.env）

- [ ] `.env` ファイルをプロジェクトルートに作成
- [ ] `DATABASE_URL` をSupabase接続文字列に設定
- [ ] `NEXT_PUBLIC_SUPABASE_URL` を設定
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
- [ ] `SUPABASE_SERVICE_ROLE_KEY` を設定
- [ ] 既存の環境変数を維持
- [ ] `.gitignore` に `.env` が含まれていることを確認

---

## 🧪 ステップ4: 動作確認

### 4.1 ローカル環境での確認

```powershell
# プロジェクトルートで実行
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# 依存関係のインストール（既に実行済みの場合はスキップ）
npm install

# PrismaスキーマをSupabaseから生成
npx prisma db pull

# Prisma Clientを生成
npx prisma generate

# ローカルサーバーを起動
npm run dev
```

別ターミナルでヘルスチェック：

```powershell
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**期待されるレスポンス**:
```json
{
  "ok": true,
  "timestamp": "2025-01-15T...",
  "version": "...",
  "prisma": "connected"
}
```

### 4.2 Render環境での確認

1. Render Dashboardでデプロイが完了するまで待つ
2. 検証環境のURLにアクセス
3. 各APIエンドポイントが正常に動作することを確認
4. エラーログを確認

---

## 🔍 トラブルシューティング

### 問題1: 環境変数が読み込まれない

**確認事項**:
- Render Dashboardで環境変数が正しく設定されているか
- `.env` ファイルがプロジェクトルートにあるか
- 環境変数名が正しいか（大文字・小文字を区別）
- デプロイ後に環境変数が反映されているか（再デプロイが必要な場合がある）

### 問題2: 接続エラー

**確認事項**:
- 接続文字列が正しいか
- パスワードが正しいか（URLエンコードが必要な場合がある）
- Supabaseプロジェクトがアクティブか
- ネットワーク接続が確立されているか

### 問題3: Prisma接続エラー

**対処方法**:
```powershell
# .envファイルのDATABASE_URLを確認
# Prismaスキーマを再生成
npx prisma db pull
npx prisma generate
```

---

## 📚 次のステップ

環境変数の設定が完了したら：

1. **スキーマの移行**（`scripts/migrate-to-supabase.md` を参照）
2. **データの移行**（`scripts/migrate-to-supabase.md` を参照）
3. **動作確認**（ローカルとRender環境）

詳細は [SUPABASE_SETUP_COMPLETE.md](./SUPABASE_SETUP_COMPLETE.md) を参照してください。

---

## 🔗 便利なリンク

- **Render Dashboard**: https://dashboard.render.com
- **Supabase Dashboard**: https://app.supabase.com
- **プロジェクト設定**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/settings/general

