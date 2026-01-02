# 技術スタック移行計画書

**プロジェクト**: fleapay-lite  
**作成日**: 2025-01-15  
**参照ADR**: `adr/技術スタック整合化ロードマップ_AI駆動開発×edoichiba.md`  
**目標**: Express.js + JavaScript → Next.js 14 + TypeScript + Prisma

---

## 📊 エグゼクティブサマリー

### 移行の目的

- **AI修正成功率**: 60% → 98% への向上
- **型安全性**: JavaScript → TypeScript (Strict) による実行時エラー削減
- **開発効率**: モダンReact構成による開発速度向上
- **保守性**: Prisma ORMによるスキーマ管理の自動化

### 移行期間

**総期間**: 3-6ヶ月（段階的移行）  
**開始時期**: Phase 1 から即座に開始可能

### 主要マイルストーン

| Phase | 期間 | AI修正成功率 | 完了条件 |
|-------|------|------------|---------|
| Phase 0 | 現在 | 60% | 現状維持（Stripe, S3, Render） |
| Phase 1 | Week 1-3 | 85% | TypeScript/Prisma導入完了 |
| Phase 2 | Month 2 | 95% | Next.js移行、Express廃止 |
| Phase 3 | Month 3-4 | 98% | 最適化・監視導入完了 |
| Phase 4 | Month 5-6 | 98% | 運用自動化完了 |

---

## 1. Phase 0: 現状維持（移行不要な要素）

以下の要素は移行不要であり、現状のまま維持します。

| 要素 | 現状技術 | 維持理由 |
|------|---------|---------|
| 決済基盤 | Stripe | 業界標準、Next.jsからも利用可能 |
| ストレージ | AWS S3 | インフラ要素、変更不要 |
| AI連携 | OpenAI API | コア機能、移行不要 |
| インフラ | Render | Next.jsもサポート、移行不要 |
| 環境変数 | `.env` | 構造は維持、内容は拡張 |

**アクション**: なし（維持のみ）

---

## 2. Phase 1: 基盤整備（Week 1-3） 🔴 HIGH PRIORITY

**目標**: AI修正成功率 60% → 85% / 環境構築時間 120分 → 5分

### 2.1 Week 1: 開発環境整備

#### Task 1.1: GitHub Codespaces環境構築

**期間**: 2-3時間  
**担当**: 開発リード

**実装手順**:

1. `.devcontainer/devcontainer.json` の作成

```json
{
  "name": "fleapay-lite",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:18",
  "features": {
    "ghcr.io/devcontainers/features/postgres:1": {
      "version": "15"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "prisma.prisma",
        "bradlc.vscode-tailwindcss"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
  },
  "postCreateCommand": "npm install",
  "forwardPorts": [3000, 5432],
  "portsAttributes": {
    "3000": {
      "label": "Application",
      "onAutoForward": "notify"
    },
    "5432": {
      "label": "PostgreSQL"
    }
  }
}
```

2. `.devcontainer/docker-compose.yml` の作成（PostgreSQL用）

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: fleapay
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

3. README.md への Codespaces起動手順追加

**完了条件**:
- ✅ `.devcontainer/devcontainer.json` が存在
- ✅ Codespacesで1クリックで環境起動可能
- ✅ 環境構築時間が5分以下

**リスク**: 低  
**対策**: 既存のローカル環境を壊さない（並行運用可能）

---

#### Task 1.2: TypeScript段階的導入

**期間**: 3-5日  
**担当**: 全開発者

**実装手順**:

1. TypeScript依存関係の追加

```bash
npm install -D typescript @types/node @types/express @types/pg
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D ts-node nodemon
```

2. `tsconfig.json` の作成

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

3. 既存JSファイルへのJSDoc型付け（段階的）

**優先順位**:
1. `server.js` → `server.ts` (コアロジック)
2. 共通ユーティリティ関数
3. APIルートハンドラー

**移行例** (`server.js` の一部):

```typescript
// Before (server.js)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// After (server.ts)
import { Pool } from 'pg';

interface DatabaseConfig {
  connectionString: string;
}

const pool: Pool = new Pool({ 
  connectionString: process.env.DATABASE_URL as string 
});
```

4. `package.json` の scripts 更新

```json
{
  "scripts": {
    "dev": "ts-node --esm server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "type-check": "tsc --noEmit"
  }
}
```

**完了条件**:
- ✅ `tsconfig.json` が存在し、型チェックが通る
- ✅ `server.js` が `server.ts` に移行済み
- ✅ `npm run type-check` がエラーなく実行できる

**リスク**: 中  
**対策**: `allowJs: true` により既存JSファイルと共存可能

---

#### Task 1.3: Prisma ORM導入（既存Render PostgreSQL）

**期間**: 2-3日  
**担当**: バックエンド開発者

> **重要**: Supabase移行は別フェーズ（Task 1.4）で実施します。まずは既存のRender PostgreSQLでPrismaを導入し、動作確認を行います。

**デグレ防止のため**: このフェーズではSupabase移行は実施しません。既存のRender PostgreSQLを継続使用します。

**実装手順**:

1. Prisma依存関係の追加

```bash
npm install -D prisma
npm install @prisma/client
```

4. Prisma初期化

```bash
npx prisma init
```

3. **既存Render PostgreSQL接続で**Prismaスキーマのイントロスペクション

```bash
# DATABASE_URL環境変数は既存のRender PostgreSQL接続文字列をそのまま使用
# （変更しない）

# スキーマをPull（既存DBから）
npx prisma db pull
```

4. 生成されたスキーマの確認と調整

`prisma/schema.prisma` を確認し、必要に応じて:
- リレーションの調整
- 型の最適化
- コメントの追加

5. Prisma Client生成

```bash
npx prisma generate
```

6. 既存コードの段階的移行（1エンドポイントのみ）

**移行戦略**: 
- まず1つのAPIエンドポイントのみPrisma経由に変更
- 残りは既存の `pg` 直接使用を継続（共存状態）
- 動作確認後に段階的に移行

**移行例**:

```typescript
// Before (pg直接使用)
const result = await pool.query(
  'SELECT * FROM orders WHERE seller_id = $1',
  [sellerId]
);
const orders = result.rows;

// After (Prisma)
import { prisma } from '@/lib/prisma';

const orders = await prisma.order.findMany({
  where: { sellerId }
});
```

7. `lib/prisma.ts` の作成（Render PostgreSQL接続）

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

6. Supabase Authクライアントの実装（1日）

```bash
npm install @supabase/supabase-js
```

```typescript
// lib/supabase.ts
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

7. 既存認証ロジックのSupabase Auth移行（1-2日）

- `bcryptjs`を使用している認証ロジックをSupabase Authに置き換え
- セッション管理をSupabase Authに移行

8. RLS（Row Level Security）の実装（1日）

```sql
-- Supabase Dashboard > SQL Editor
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
CREATE POLICY "Users can view own seller data"
  ON sellers FOR SELECT
  USING (auth.uid()::text = id);
```

**完了条件**:
- ✅ `prisma/schema.prisma` が存在し、既存Render PostgreSQLスキーマを正確に反映
- ✅ Prisma Clientが生成され、型が利用可能
- ✅ **既存のRender PostgreSQL接続を継続使用**
- ✅ 少なくとも1つのAPIエンドポイントがPrisma経由で動作
- ✅ 既存の `pg` 直接使用エンドポイントも動作（共存状態）
- ✅ Migration安全性チェック（`.github/workflows/migration-safety.yml`）が動作
- ✅ **動作確認完了（全機能テスト）**

**リスク**: 中（データベースアクセス層の変更）  
**対策**:
- 既存の `pg` 直接使用コードと共存（段階的移行）
- 1エンドポイントのみ移行し、動作確認後に拡大
- ステージング環境で先に検証
- Prisma Migrateのドライラン実行で安全性確認

**次のフェーズ**: Task 1.4でSupabase移行を実施

---

#### Task 1.4: Supabaseプロジェクト作成・スキーマ移行

**期間**: 1-2日  
**担当**: バックエンド開発者

> **重要**: このフェーズではデータベース接続のみ変更します。認証機能（bcryptjs）はまだ変更しません。

**実装手順**:

1. Supabaseプロジェクト作成（0.5日）

- Supabaseアカウント作成
- 新規プロジェクト作成（Region: Tokyo または Singapore）
- 接続情報の取得（Connection string, API URL, Keys）

2. スキーマの移行（0.5-1日）

```bash
# 既存Render PostgreSQLからスキーマダンプ
pg_dump -h <render-host> -U <user> -d <database> --schema-only > schema.sql

# Supabaseでスキーマを実行（Supabase Dashboard > SQL Editor）
# schema.sql の内容を実行
```

3. Prisma接続をSupabaseに変更

```bash
# DATABASE_URL環境変数をSupabaseの接続文字列に変更
export DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# Prismaスキーマを再生成（Supabase接続で）
npx prisma db pull
npx prisma generate
```

4. **認証ロジックはそのまま維持**（bcryptjs継続使用）

**完了条件**:
- ✅ Supabaseプロジェクトが作成済み
- ✅ スキーマがSupabaseに移行済み
- ✅ Prisma接続がSupabaseで動作
- ✅ **既存の認証機能（bcryptjs）が動作**
- ✅ 全APIエンドポイントが動作
- ✅ **動作確認完了（全機能テスト）**

**リスク**: 中（データベース接続の変更）  
**対策**:
- 認証機能はまだ変更しない（bcryptjs継続）
- ステージング環境で先に検証
- ロールバック手順を事前に確認（接続文字列をRenderに戻すだけ）

**参照**: `SUPABASE_MIGRATION_ANALYSIS.md` を参照

---

#### Task 1.5: データ移行

**期間**: 1-2日  
**担当**: バックエンド開発者

> **重要**: このフェーズではデータのみ移行します。認証機能はまだ変更しません。

**実装手順**:

1. 既存データのバックアップ取得

```bash
# Render PostgreSQLからデータダンプ
pg_dump -h <render-host> -U <user> -d <database> --data-only > data.sql
```

2. Supabaseへのデータ移行

```bash
# Supabase Dashboard > SQL Editor で実行
# （外部キー制約を一時的に無効化する場合がある）
```

3. データ整合性チェック

```sql
-- レコード数の確認
SELECT 'orders' as table_name, COUNT(*) FROM orders
UNION ALL
SELECT 'sellers', COUNT(*) FROM sellers
UNION ALL
SELECT 'stripe_payments', COUNT(*) FROM stripe_payments;
```

**完了条件**:
- ✅ 既存データがSupabaseに移行済み
- ✅ データ整合性が確認済み
- ✅ **既存の認証機能（bcryptjsハッシュ）が動作**
- ✅ 全APIエンドポイントが動作
- ✅ **動作確認完了（全機能テスト）**

**リスク**: 中（データ移行）  
**対策**:
- バックアップを事前に取得
- ステージング環境で先に検証
- データ整合性チェックスクリプトを作成

---

#### Task 1.6: Supabase Auth移行（新規ユーザーのみ）

**期間**: 2-3日  
**担当**: バックエンド開発者

> **重要**: このフェーズでは新規ユーザーのみSupabase Authを使用します。既存ユーザーはbcryptjsで継続認証します。

**実装手順**:

1. Supabase Authクライアントの実装

```bash
npm install @supabase/supabase-js
```

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

2. **新規ユーザー登録をSupabase Authに変更**

```typescript
// 新規ユーザー登録
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}
```

3. **既存ユーザー認証はbcryptjs継続**

```typescript
// 既存ユーザーの認証（bcryptjs継続）
// パスワードハッシュがbcryptjs形式の場合は、既存ロジックで認証
```

**完了条件**:
- ✅ 新規ユーザーがSupabase Authで登録できる
- ✅ 新規ユーザーがSupabase Authで認証できる
- ✅ **既存ユーザーがbcryptjsハッシュで認証できる（共存状態）**
- ✅ 全APIエンドポイントが動作
- ✅ **動作確認完了（新規・既存ユーザー両方）**

**リスク**: 中（認証機能の変更）  
**対策**:
- 既存ユーザーはbcryptjsで継続認証（段階的移行）
- 新規ユーザーのみSupabase Authを使用
- 十分なテスト（新規・既存ユーザー両方）

**次のフェーズ**: Task 1.7で既存ユーザーを段階的に移行

---

#### Task 1.7: 既存ユーザーのSupabase Auth移行（段階的）

**期間**: 2-3日  
**担当**: バックエンド開発者

> **重要**: 既存ユーザーを段階的にSupabase Authに移行します。

**実装手順**:

1. パスワードリセット機能の実装

```typescript
// 既存ユーザーがパスワードリセット時にSupabase Authに移行
export async function resetPassword(email: string, newPassword: string) {
  // 既存ユーザーをSupabase Authに移行
  const { data, error } = await supabase.auth.signUp({
    email,
    password: newPassword,
  });
  return { data, error };
}
```

2. 段階的な移行戦略

- Week 1: パスワードリセット機能を実装
- Week 2: 既存ユーザーがパスワードリセット時にSupabase Authに移行
- Week 3: bcryptjs認証ロジックを削除（全ユーザー移行後）

**完了条件**:
- ✅ 既存ユーザーがパスワードリセットできる
- ✅ パスワードリセット後にSupabase Authで認証できる
- ✅ 全ユーザーがSupabase Authに移行済み（段階的）
- ✅ bcryptjs認証ロジックを削除済み
- ✅ **動作確認完了（全ユーザータイプ）**

**リスク**: 低（段階的移行のため）  
**対策**:
- 段階的に移行（1ユーザーずつでも可）
- 十分なテスト
- ロールバック可能な設計

---

#### Task 1.8: RLS（Row Level Security）実装

**期間**: 1-2日  
**担当**: バックエンド開発者

**実装手順**:

1. RLSの有効化

```sql
-- Supabase Dashboard > SQL Editor
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;
```

2. RLSポリシーの作成（段階的）

```sql
-- まず読み取り専用ポリシーから
CREATE POLICY "Users can view own seller data"
  ON sellers FOR SELECT
  USING (auth.uid()::text = id);

-- 動作確認後、書き込みポリシーを追加
```

**完了条件**:
- ✅ RLSが主要テーブルで有効
- ✅ RLSポリシーが適切に設定されている
- ✅ ユーザーが自分のデータのみアクセス可能
- ✅ 管理者が全データにアクセス可能（Service role key使用）
- ✅ **動作確認完了（権限テスト）**

**リスク**: 中（セキュリティ設定の変更）  
**対策**:
- 読み取り専用ポリシーから開始
- 動作確認後に書き込みポリシーを追加
- 十分な権限テスト

**参照**: `SUPABASE_MIGRATION_ANALYSIS.md` を参照

---

### 2.2 Week 2: 型定義の拡充

#### Task 2.1: API型定義の作成

**期間**: 3-4日

**実装手順**:

1. `types/api.ts` の作成（APIリクエスト/レスポンス型）

```typescript
// types/api.ts

export interface CreateOrderRequest {
  sellerId: string;
  amount: number;
  summary?: string;
  imageData?: string;
  aiAnalysis?: {
    items: Array<{
      name: string;
      unit_price: number;
      quantity: number;
    }>;
  };
  paymentMethod?: string;
  costAmount?: number;
}

export interface CreateOrderResponse {
  orderId: number;
  orderNo: string;
  status: 'pending' | 'completed' | 'cancelled';
  imageUrl?: string;
}
```

2. Prisma型の再エクスポート

```typescript
// types/database.ts
export type { Order, OrderItem, Seller, Payment } from '@prisma/client';
```

3. 既存APIエンドポイントへの型適用

**完了条件**:
- ✅ 主要APIエンドポイント（10個以上）に型定義が適用済み
- ✅ TypeScriptコンパイルエラーが0件

---

#### Task 2.2: 環境変数の型定義

**期間**: 1日

**実装手順**:

1. `types/env.d.ts` の作成

```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    STRIPE_SECRET_KEY: string;
    OPENAI_API_KEY: string;
    AWS_REGION: string;
    AWS_S3_BUCKET: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    ADMIN_TOKEN: string;
    BASE_URL: string;
    PORT?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
```

**完了条件**:
- ✅ 環境変数の型チェックが有効

---

### 2.3 Week 3: テスト環境の整備

#### Task 3.1: 型チェックのCI統合

**期間**: 1-2日

**実装手順**:

1. `.github/workflows/type-check.yml` の作成

```yaml
name: Type Check
on: [pull_request, push]
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run type-check
```

2. `package.json` の scripts に追加

```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

**完了条件**:
- ✅ PR時に自動的に型チェックが実行される
- ✅ 型エラーがある場合はマージ不可

---

#### Task 3.2: Prisma Migrate安全性チェックの確認

**期間**: 1日

**実装手順**:

1. 既存の `.github/workflows/migration-safety.yml` の動作確認
2. Prisma Migrate用のパス追加（必要に応じて）

**完了条件**:
- ✅ Migration安全性チェックが動作

---

### Phase 1 完了条件（総合）

- ✅ `.devcontainer/devcontainer.json` が存在し、Codespacesで環境構築が5分以下
- ✅ TypeScriptが導入され、`server.ts` が動作
- ✅ Prisma ORMが導入され、既存Render PostgreSQLで動作
- ✅ Supabaseに移行済み（DB + Auth）
- ✅ RLSが主要テーブルで有効
- ✅ 型チェックがCIで実行され、エラーが0件
- ✅ **各サブフェーズで動作確認が完了している**
- ✅ AI修正成功率が85%以上（主観的評価で可）

**KPI**:
- 環境構築時間: 120分 → 5分 ✅
- AI修正成功率: 60% → 85% ✅
- TypeScriptカバレッジ: 0% → 30%以上 ✅
- デグレ発生: 0件 ✅（各フェーズで動作確認により）

**重要なポイント**: 
- Phase 1は7つのサブフェーズ（1.1-1.8）に細分化
- 各サブフェーズで動作確認を実施
- 問題があれば即座にロールバック可能

**参照**: `MIGRATION_SAFETY_STRATEGY.md` を参照（詳細な安全性戦略）

---

## 3. Phase 2: Next.js移行（Month 2） 🔴 HIGH PRIORITY

**目標**: AI修正成功率 85% → 95% / 完全なモダン構成へ

### 3.1 Week 4-5: Next.js基盤構築

#### Task 4.1: Next.jsプロジェクトの初期化

**期間**: 2-3日

**実装手順**:

1. Next.js 14のインストール

```bash
npm install next@latest react@latest react-dom@latest
npm install -D @types/react @types/react-dom
```

2. `next.config.js` の作成

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['your-s3-bucket.s3.amazonaws.com'],
  },
};

module.exports = nextConfig;
```

3. 基本的なディレクトリ構造の作成

```
app/
  api/          # Route Handlers (Express APIの移行先)
  (routes)/     # ページルート
  layout.tsx
  page.tsx
lib/
  prisma.ts
  stripe.ts
  s3.ts
types/
components/
public/         # 静的ファイル（既存のpublic/から移行）
```

4. `app/layout.tsx` の作成

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FleaPay',
  description: 'Flea Market Payment System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

**完了条件**:
- ✅ Next.jsプロジェクトが起動可能（`npm run dev`）
- ✅ 基本的なページ構造が存在

---

#### Task 4.2: Tailwind CSS導入

**期間**: 1-2日

**実装手順**:

1. Tailwind CSSのインストール

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

2. `tailwind.config.js` の設定

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

3. `app/globals.css` の作成

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. `app/layout.tsx` で globals.css をインポート

```typescript
import './globals.css';
```

**完了条件**:
- ✅ Tailwind CSSが動作し、スタイリングが適用可能

---

#### Task 4.3: shadcn/ui導入

**期間**: 1-2日

**実装手順**:

1. shadcn/uiの初期化

```bash
npx shadcn-ui@latest init
```

2. 基本的なコンポーネントの追加

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
```

**完了条件**:
- ✅ shadcn/uiコンポーネントが使用可能

---

### 3.2 Week 6-7: Express API → Next.js Route Handlers移行

#### Task 5.1: APIエンドポイントの移行計画

**期間**: 1日（計画）

**既存APIエンドポイント一覧**:

| エンドポイント | メソッド | 優先度 | 移行順序 |
|--------------|---------|--------|---------|
| `/api/ping` | GET | 低 | 1（テスト用） |
| `/api/pending/start` | POST | 高 | 2 |
| `/api/orders/buyer-attributes` | POST | 中 | 3 |
| `/api/seller/order-detail-full` | GET | 高 | 4 |
| `/api/admin/sellers` | GET/POST | 中 | 5 |
| `/api/admin/frames` | GET/POST | 中 | 6 |
| `/api/analyze-item` | POST | 高 | 7 |
| `/api/photo-frame` | POST | 中 | 8 |

**移行戦略**: 1画面ずつ移行し、ExpressとNext.jsを並行稼働

---

#### Task 5.2: Route Handlersへの移行（段階的）

**期間**: 10-14日

**実装手順**:

1. `/api/ping` の移行例

```typescript
// app/api/ping/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    version: '4.0.0-nextjs',
  });
}
```

2. `/api/pending/start` の移行例

```typescript
// app/api/pending/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderNo } from '@/lib/orders';
import { uploadToS3 } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sellerId, amount, summary, imageData, aiAnalysis, paymentMethod, costAmount } = body;
    
    // バリデーション
    const amt = Number(amount);
    if (!sellerId || !Number.isInteger(amt) || amt < 100) {
      return NextResponse.json(
        { error: 'invalid input' },
        { status: 400 }
      );
    }

    // レート制限チェック（既存ロジックを移行）
    // ...

    const orderNo = await createOrderNo(sellerId);

    // Prisma経由で注文作成
    const order = await prisma.order.create({
      data: {
        sellerId,
        orderNo,
        amount: amt,
        summary: summary || null,
        costAmount: costAmount || 0,
        status: 'pending',
        orderItems: aiAnalysis?.items ? {
          create: aiAnalysis.items.map(item => ({
            name: String(item.name || '商品').slice(0, 120),
            unitPrice: Number(item.unit_price) || 0,
            quantity: Number(item.qty || item.quantity) || 1,
            amount: (Number(item.unit_price) || 0) * (Number(item.qty || item.quantity) || 1),
            source: 'ai',
          })),
        } : undefined,
      },
      include: {
        orderItems: true,
      },
    });

    // S3アップロード（既存ロジックを移行）
    let imageUrl = null;
    if (imageData) {
      imageUrl = await uploadToS3(imageData, `orders/${order.id}/image.jpg`);
    }

    return NextResponse.json({
      orderId: order.id,
      orderNo: order.orderNo,
      status: order.status,
      imageUrl,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    );
  }
}
```

3. 共通ライブラリの作成

`lib/orders.ts`, `lib/s3.ts`, `lib/stripe.ts` などを作成し、ビジネスロジックを分離

**移行順序**:
1. Week 6: `/api/ping`, `/api/pending/start` (2エンドポイント)
2. Week 7: 残りのエンドポイント（6-8エンドポイント）

**完了条件**:
- ✅ 主要APIエンドポイント（8個以上）がRoute Handlersに移行済み
- ✅ 既存のExpress APIと並行稼働可能
- ✅ 型安全性が確保されている

---

### 3.3 Week 8: フロントエンド移行（最初の1画面）

#### Task 6.1: 最初の画面選択と移行

**推奨**: `/seller-dashboard.html` または `/admin-dashboard.html`

**期間**: 5-7日

**実装手順**:

1. 選択したHTMLファイルの分析
   - 必要なAPIエンドポイントの特定
   - 状態管理の要件の特定
   - UIコンポーネントの分解

2. Next.jsページの作成

```typescript
// app/seller/dashboard/page.tsx
import { SellerDashboard } from '@/components/seller/dashboard';

export default function SellerDashboardPage() {
  return <SellerDashboard />;
}
```

3. Server Components活用

```typescript
// app/seller/dashboard/page.tsx
import { prisma } from '@/lib/prisma';
import { SellerDashboardClient } from '@/components/seller/dashboard-client';

interface PageProps {
  searchParams: { s?: string };
}

export default async function SellerDashboardPage({ searchParams }: PageProps) {
  const sellerId = searchParams.s;
  
  if (!sellerId) {
    return <div>Seller ID is required</div>;
  }

  // Server Componentでデータ取得
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!seller) {
    return <div>Seller not found</div>;
  }

  return <SellerDashboardClient seller={seller} orders={seller.orders} />;
}
```

4. クライアントコンポーネントの作成

```typescript
// components/seller/dashboard-client.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SellerDashboardClientProps {
  seller: Seller;
  orders: Order[];
}

export function SellerDashboardClient({ seller, orders }: SellerDashboardClientProps) {
  // クライアント側の状態管理
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{seller.name} - Dashboard</h1>
      {/* UI実装 */}
    </div>
  );
}
```

**完了条件**:
- ✅ 選択した画面がNext.jsで完全に動作
- ✅ 既存のHTML版と同等の機能を実現
- ✅ 型安全性が確保されている

---

### 3.4 Week 9-10: 段階的カットオーバー

#### Task 7.1: リバースプロキシ設定（Render）

**期間**: 1-2日

**実装手順**:

1. Next.jsアプリを別サービスとしてデプロイ（ステージング）
2. Renderのリバースプロキシ設定で、特定パスをNext.jsにルーティング

```yaml
# render.yaml (例)
services:
  - type: web
    name: fleapay-nextjs
    env: next
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: fleapay-db
          property: connectionString

  - type: web
    name: fleapay-legacy
    env: node
    buildCommand: npm install
    startCommand: node server.js
    # 既存のExpressアプリ
```

3. ルーティング設定（例）

- `/seller/dashboard` → Next.js
- `/admin/dashboard` → Next.js
- `/api/ping` → Next.js
- `/api/pending/start` → Next.js
- その他 → Express（既存）

**完了条件**:
- ✅ Next.jsとExpressが並行稼働
- ✅ トラフィックの振り分けが正常に動作

---

#### Task 7.2: 残りの画面移行

**期間**: 10-14日

**移行順序**:
1. `/admin/dashboard.html`
2. `/checkout.html`
3. `/seller-purchase.html`
4. その他の画面

**完了条件**:
- ✅ 全画面がNext.jsに移行済み
- ✅ Expressアプリが廃止可能な状態

---

### 3.5 Week 11: Express廃止とクリーンアップ

#### Task 8.1: Expressコードの削除

**期間**: 2-3日

**実装手順**:

1. `server.js` の削除
2. Express関連の依存関係の削除

```bash
npm uninstall express @types/express
```

3. `package.json` の scripts 更新

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

4. 不要なファイルの削除
   - `public/server.js`（存在する場合）
   - その他のExpress関連ファイル

**完了条件**:
- ✅ Expressコードが完全に削除
- ✅ Next.jsのみでアプリケーションが動作
- ✅ 本番環境で動作確認済み

---

### Phase 2 完了条件（総合）

- ✅ 全APIエンドポイントがNext.js Route Handlersに移行済み
- ✅ 全画面がNext.js App Routerで動作
- ✅ Expressアプリが廃止され、Next.jsのみで動作
- ✅ Tailwind CSS + shadcn/ui が導入済み
- ✅ AI修正成功率が95%以上

**KPI**:
- AI修正成功率: 85% → 95% ✅
- TypeScriptカバレッジ: 30% → 80%以上 ✅
- ページ読み込み速度: 改善（Server Components活用）

---

## 4. Phase 3: 最適化（Month 3-4） 🟡 MEDIUM PRIORITY

### 4.1 Week 12-13: 完全TypeScript化

#### Task 9.1: any型の排除

**期間**: 5-7日

**実装手順**:

1. `tsconfig.json` に `noImplicitAny: true` を設定（既に `strict: true` で有効）
2. 既存コードの `any` 型を特定

```bash
# any型を検索
grep -r "any" --include="*.ts" --include="*.tsx" .
```

3. 段階的に型定義を追加

**完了条件**:
- ✅ `any` 型が0件（または最小限）

---

#### Task 9.2: React Hook Form + Zod統合

**期間**: 3-5日

**実装手順**:

1. 依存関係のインストール

```bash
npm install react-hook-form zod @hookform/resolvers
```

2. フォームコンポーネントの作成例

```typescript
// components/forms/create-order-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const createOrderSchema = z.object({
  sellerId: z.string().min(1, 'Seller ID is required'),
  amount: z.number().min(100, 'Amount must be at least 100'),
  summary: z.string().optional(),
});

type CreateOrderFormData = z.infer<typeof createOrderSchema>;

export function CreateOrderForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
  });

  const onSubmit = async (data: CreateOrderFormData) => {
    // Server Action呼び出し
    await createOrder(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* フォーム実装 */}
    </form>
  );
}
```

**完了条件**:
- ✅ 主要フォーム（3個以上）がReact Hook Form + Zodを使用

---

### 4.2 Week 14-15: 監視ツール導入

#### Task 10.1: Helicone統合（LLM API監視）

**期間**: 2-3日

**実装手順**:

1. Heliconeアカウントの作成
2. OpenAI SDKのHelicone経由設定

```typescript
// lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://oai.helicone.ai/v1',
  defaultHeaders: {
    'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
    'Helicone-Property-Environment': process.env.NODE_ENV,
    'Helicone-Property-Project': 'fleapay',
  },
});
```

3. 既存のOpenAI呼び出しを `lib/openai.ts` 経由に変更

**完了条件**:
- ✅ HeliconeダッシュボードでLLM API呼び出しが可視化可能

---

#### Task 10.2: Sentry統合（エラー監視）

**期間**: 2-3日

**実装手順**:

1. Sentry依存関係のインストール

```bash
npm install @sentry/nextjs
```

2. Sentry初期化

```bash
npx @sentry/wizard@latest -i nextjs
```

3. `sentry.client.config.ts`, `sentry.server.config.ts` の設定確認

**完了条件**:
- ✅ Sentryダッシュボードでエラーが監視可能

---

### Phase 3 完了条件（総合）

- ✅ `any` 型が最小限（5%以下）
- ✅ 主要フォームがReact Hook Form + Zodを使用
- ✅ HeliconeでLLM API監視が可能
- ✅ Sentryでエラー監視が可能
- ✅ AI修正成功率が98%以上

**KPI**:
- AI修正成功率: 95% → 98% ✅
- エラー検知率: 0% → 95%以上 ✅
- LLM APIコスト可視化: 可能 ✅

---

## 5. Phase 4: 運用自動化（Month 5-6） 🟢 LOW PRIORITY

### 5.1 自動テストの拡充

#### Task 11.1: E2Eテストの導入

**期間**: 5-7日

**実装手順**:

1. PlaywrightまたはCypressの導入

```bash
npm install -D @playwright/test
```

2. 主要フローのE2Eテスト作成

**完了条件**:
- ✅ 主要フロー（3個以上）のE2Eテストが存在

---

#### Task 11.2: 自動ロールバック機構

**期間**: 3-5日

**実装手順**:

1. ヘルスチェックエンドポイントの実装

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // DB接続確認
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    );
  }
}
```

2. Renderのヘルスチェック設定
3. 自動ロールバックの設定（Renderの機能を使用）

**完了条件**:
- ✅ ヘルスチェック失敗時に自動ロールバックが動作

---

### Phase 4 完了条件（総合）

- ✅ E2Eテストが主要フローをカバー
- ✅ 自動ロールバック機構が動作
- ✅ AI駆動開発9原則が完全実装
- ✅ 運用自動化率が95%以上

**KPI**:
- 運用自動化率: 70% → 95% ✅
- デプロイ成功率: 85% → 99% ✅

---

## 6. リスク管理

### 6.1 リスク一覧と対策

| リスク | レベル | 影響 | 対策 |
|-------|--------|------|------|
| 移行中のサービス停止 | 高 | 本番環境のダウンタイム | Express/Next.js並行稼働、段階的カットオーバー |
| データ損失・不整合 | 高 | データベースの整合性破綻 | Prisma Migrateのドライラン実行、バックアップ自動化 |
| 学習コスト超過 | 中 | 開発速度の一時的低下 | 実装詳細をAIに任せ、人間はレビューに集中 |
| パフォーマンス劣化 | 低 | レスポンスタイムの増加 | Server Components活用、パフォーマンステスト |
| 型エラーによる開発停滞 | 中 | 開発速度の低下 | 段階的移行、`allowJs: true` で共存 |

### 6.2 ロールバック計画

各Phase完了時点で、以下のロールバック手順を準備:

1. **Phase 1完了時**: Prisma導入により問題が発生した場合
   - Prismaコードを削除し、pg直接使用に戻す
   - `package.json` からPrisma依存関係を削除

2. **Phase 2完了時**: Next.js移行により問題が発生した場合
   - Expressアプリに戻す（Git履歴から復元）
   - Renderのルーティング設定を変更

3. **Phase 3完了時**: 監視ツール導入により問題が発生した場合
   - 監視ツールの無効化（環境変数を削除）
   - コードから監視ツールの呼び出しを削除

---

## 7. コスト影響分析

### 7.1 開発環境コスト

| 項目 | 現状月額 | 移行後月額 | 差額 |
|------|---------|-----------|------|
| Cursor | $20 | $20 | $0 |
| GitHub Codespaces | $0 | $20 | +$20 |
| **小計** | **$20** | **$40** | **+$20** |

### 7.2 インフラコスト

| 項目 | 現状月額 | 移行後月額 | 差額 |
|------|---------|-----------|------|
| Render (Web Service) | $25 | $25 | $0 |
| PostgreSQL (Render) | $0 (既存) | $0 (既存) | $0 |
| **小計** | **$25** | **$25** | **$0** |

### 7.3 監視ツールコスト（Phase 3）

| 項目 | 現状月額 | 移行後月額 | 差額 |
|------|---------|-----------|------|
| Helicone | $0 | $50 | +$50 |
| Sentry | $0 | $26 | +$26 |
| **小計** | **$0** | **$76** | **+$76** |

### 7.4 総コスト

| Phase | 月額コスト | 累積コスト |
|-------|-----------|-----------|
| Phase 0 (現状) | $45-50 | - |
| Phase 1-2 | $90-95 (+$45-50) | +$90-100 (2ヶ月) |
| Phase 3-4 | $166-171 (+$121-126) | +$242-252 (4ヶ月) |
| **Phase 4完了後** | **$166-171/月** | **+$121-126/月** |

> **注意**: Supabase移行により+$25/月のコスト増ですが、認証機能の開発・保守コスト削減により、長期的にはROIはプラスとなります。

> **注意**: 月額約$96のコスト増となりますが、開発効率向上による人的コスト削減効果（月数十時間分）により、ROIはプラスとなります。

---

## 8. 成功指標 (KPI)

### 8.1 Phase別KPI

| 指標 | Phase 0 (現状) | Phase 1目標 | Phase 2目標 | Phase 3目標 | Phase 4目標 |
|------|---------------|------------|------------|------------|------------|
| **AI修正成功率** | 60% | 85% | 95% | 98% | 98% |
| **機能追加リードタイム** | 3日 | 2日 | 1日 | 0.5日 | 0.5日 |
| **環境構築時間** | 120分 | 5分 | 5分 | 5分 | 5分 |
| **型エラー率** | N/A | <5% | <2% | <1% | <1% |
| **テストカバレッジ** | 0% | 20% | 50% | 70% | 85% |
| **運用自動化率** | 70% | 75% | 85% | 90% | 95% |

### 8.2 測定方法

- **AI修正成功率**: Cursor/Copilotでのコード修正提案の採用率（主観的評価で可）
- **機能追加リードタイム**: 機能追加開始からデプロイまでの時間
- **環境構築時間**: 新規開発者の環境構築に要する時間
- **型エラー率**: TypeScriptコンパイル時のエラー数 / 総行数
- **テストカバレッジ**: テストカバレッジツール（c8, istanbul等）で測定
- **運用自動化率**: 自動化された運用タスク数 / 総運用タスク数

---

## 9. チェックリスト

### Phase 1 チェックリスト（細分化）

#### Phase 1.1: TypeScript導入
- [ ] `.devcontainer/devcontainer.json` が存在
- [ ] Codespacesで環境構築が5分以下
- [ ] `tsconfig.json` が存在し、型チェックが通る
- [ ] 既存機能が全て動作することを確認
- [ ] 本番環境で動作確認

#### Phase 1.2: Prisma導入（既存DB）
- [ ] `prisma/schema.prisma` が存在（Render PostgreSQL接続）
- [ ] Prisma Clientが生成され、型が利用可能
- [ ] 1つのAPIエンドポイントがPrisma経由で動作
- [ ] 既存の `pg` 直接使用エンドポイントも動作
- [ ] 本番環境で動作確認

#### Phase 1.3: Supabase接続変更
- [ ] Supabaseプロジェクトが作成済み
- [ ] スキーマがSupabaseに移行済み
- [ ] Prisma接続がSupabaseで動作
- [ ] 既存の認証機能（bcryptjs）が動作
- [ ] 本番環境で動作確認

#### Phase 1.4: データ移行
- [ ] 既存データがSupabaseに移行済み
- [ ] データ整合性が確認済み
- [ ] 既存の認証機能（bcryptjs）が動作
- [ ] 本番環境で動作確認

#### Phase 1.5: Supabase Auth移行（新規ユーザー）
- [ ] 新規ユーザーがSupabase Authで登録できる
- [ ] 新規ユーザーがSupabase Authで認証できる
- [ ] 既存ユーザーがbcryptjsハッシュで認証できる
- [ ] 本番環境で動作確認

#### Phase 1.6: 既存ユーザー移行
- [ ] 既存ユーザーがパスワードリセットできる
- [ ] パスワードリセット後にSupabase Authで認証できる
- [ ] 全ユーザーがSupabase Authに移行済み
- [ ] bcryptjs認証ロジックを削除済み
- [ ] 本番環境で動作確認

#### Phase 1.7: RLS実装
- [ ] RLSが主要テーブルで有効
- [ ] RLSポリシーが適切に設定されている
- [ ] ユーザーが自分のデータのみアクセス可能
- [ ] 管理者が全データにアクセス可能
- [ ] 本番環境で動作確認

#### Phase 1 総合
- [ ] 各サブフェーズで動作確認が完了している
- [ ] CIで型チェックが実行される
- [ ] `any` 型が30%以下
- [ ] デグレが0件

### Phase 2 チェックリスト

- [ ] Next.jsプロジェクトが起動可能
- [ ] Tailwind CSSが導入済み
- [ ] shadcn/uiが導入済み
- [ ] 全APIエンドポイントがRoute Handlersに移行済み
- [ ] 全画面がNext.js App Routerで動作
- [ ] Expressアプリが廃止され、Next.jsのみで動作
- [ ] 本番環境で動作確認済み

### Phase 3 チェックリスト

- [ ] `any` 型が5%以下
- [ ] 主要フォーム（3個以上）がReact Hook Form + Zodを使用
- [ ] HeliconeでLLM API監視が可能
- [ ] Sentryでエラー監視が可能
- [ ] AI修正成功率が98%以上

### Phase 4 チェックリスト

- [ ] E2Eテストが主要フロー（3個以上）をカバー
- [ ] 自動ロールバック機構が動作
- [ ] 運用自動化率が95%以上
- [ ] AI駆動開発9原則が完全実装

---

## 10. 参考資料

### 10.1 内部ドキュメント

- `adr/技術スタック整合化ロードマップ_AI駆動開発×edoichiba.md` - 基本方針
- `adr/技術スタック完全版_React_Next.js前提.md` - 技術スタック詳細
- `truth/business/roadmap.yml` - Phase定義
- `SOURCE_DOCUMENT_CONSISTENCY_REPORT.md` - 現状分析

### 10.2 外部リソース

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

### 10.3 関連ドキュメント

- `MIGRATION_SAFETY_STRATEGY.md` - **デグレ防止のための安全性戦略（重要）**
- `SUPABASE_MIGRATION_ANALYSIS.md` - Supabase移行の詳細分析
- `SOURCE_DOCUMENT_CONSISTENCY_REPORT.md` - 現状分析レポート

> **重要**: デグレを避けるために、`MIGRATION_SAFETY_STRATEGY.md` を必ず参照してください。各フェーズで動作確認を行い、問題があれば即座にロールバック可能な設計になっています。

---

## 11. 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|------|-----------|---------|------|
| 2025-01-15 | 1.0 | 初版作成 | - |
| 2025-01-15 | 1.1 | Supabase移行をPhase 1に統合 | - |

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**Status**: Draft → Review → Approved → In Progress

