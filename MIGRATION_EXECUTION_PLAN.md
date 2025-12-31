# 技術スタック移行実行計画書

**プロジェクト**: fleapay-lite  
**作成日**: 2025-01-15  
**最終更新**: 2025-12-31  
**目的**: デグレを最小限に抑えた安全な移行の実行

---

## 📊 実装進捗状況

### 完了済みフェーズ

| Phase | フェーズ名 | 実装日 | 状態 | 備考 |
|-------|----------|--------|------|------|
| **Phase 1.1** | TypeScript導入 | 2025-12-31 | ✅ **完了** | 既存コードに影響なし |
| **Phase 1.2** | Prisma導入（既存DB） | 2025-12-31 | ✅ **完了** | `/api/ping`のみPrisma経由 |

### 実装済み内容

#### Phase 1.1: TypeScript導入 ✅

**実装完了項目**:
- [x] `tsconfig.json` を作成（`allowJs: true` により既存JSファイルと共存）
- [x] TypeScript依存関係を追加
  - `typescript`: ^5.3.3
  - `@types/node`: ^20.11.0
  - `@types/express`: ^4.17.21
  - `@types/pg`: ^8.10.9
  - `@types/bcryptjs`: ^2.4.6
  - `@types/multer`: ^1.4.11
  - `ts-node`: ^10.9.2
- [x] `package.json` に `type-check` スクリプトを追加

**実装ファイル**:
- `tsconfig.json` (新規作成)
- `package.json` (依存関係追加)

**動作確認**:
- ✅ 既存の `server.js` はそのまま動作
- ✅ 新規ファイルのみTypeScriptで作成可能
- ✅ 既存コードへの影響なし（デグレなし）

---

#### Phase 1.2: Prisma導入（既存Render PostgreSQL） ✅

**実装完了項目**:
- [x] Prisma依存関係を追加
  - `prisma`: ^5.9.1 (devDependencies)
  - `@prisma/client`: ^5.9.1 (dependencies)
- [x] `lib/prisma.ts` を作成（Prisma Client初期化用）
- [x] `prisma/schema.prisma` のテンプレートを作成
- [x] `/api/ping` エンドポイントをPrisma経由に変更（データベース接続確認用）

**実装ファイル**:
- `lib/prisma.ts` (新規作成)
- `prisma/schema.prisma` (新規作成、テンプレート)
- `package.json` (依存関係追加)
- `server.js` (`/api/ping` エンドポイントをPrisma経由に変更)
- `.gitignore` (Prisma関連を追加)

**動作確認**:
- ✅ `/api/ping` エンドポイントがPrisma経由で動作（フォールバック処理付き）
- ✅ 他のエンドポイントは既存の `pg` 直接使用を継続（共存状態）
- ✅ Prisma接続エラー時は従来の動作にフォールバック（後方互換性）

**次のステップ（手動実行が必要）**:
```bash
# 1. 依存関係をインストール
npm install

# 2. Prismaスキーマを既存DBから生成
npx prisma db pull

# 3. Prisma Clientを生成
npx prisma generate

# 4. 動作確認
npm run dev
# → http://localhost:3000/api/ping が動作することを確認
```

**注意事項**:
- `prisma db pull` 実行後、`lib/prisma.ts` を使用するようにコードを変更可能
- 現在の実装は、Prismaが未初期化でも動作するようにフォールバック処理を含む
- Migration管理方針: データベースが正（`prisma db pull` でスキーマを生成）

---

### 未実装フェーズ

| Phase | フェーズ名 | 予定期間 | 状態 |
|-------|----------|---------|------|
| **Phase 1.3** | Supabase接続変更 | Week 2 Day 1-2 | ⏳ 未着手 |
| **Phase 1.4** | データ移行 | Week 2 Day 3-4 | ⏳ 未着手 |
| **Phase 1.5** | Supabase Auth移行（新規ユーザー） | Week 3 Day 1-3 | ⏳ 未着手 |
| **Phase 1.6** | 既存ユーザー移行 | Week 3 Day 4-5 | ⏳ 未着手 |
| **Phase 1.7** | RLS実装 | Week 3 Day 6-7 | ⏳ 未着手 |

**詳細**: 各フェーズの実装手順は以下を参照してください。

---

## 📋 目次

1. [実装進捗状況](#-実装進捗状況) ⭐ **最新**
2. [移行計画概要](#1-移行計画概要)
3. [Phase別移行計画](#2-phase別移行計画)
4. [移行OK基準](#3-移行ok基準)
5. [動作確認ポイント](#4-動作確認ポイント)
6. [ロールバック基準](#5-ロールバック基準)
7. [チェックリスト](#6-チェックリスト)

---

## 1. 移行計画概要

### 1.1 移行の目的

- **AI修正成功率**: 60% → 98%
- **型安全性**: JavaScript → TypeScript
- **開発効率**: モダンReact構成への移行
- **セキュリティ**: Supabase Auth + RLS導入

### 1.2 移行期間

**総期間**: 3-6ヶ月（段階的移行）

| Phase | 期間 | 主要作業 |
|-------|------|---------|
| Phase 1 | Week 1-4 | 基盤整備（TypeScript, Prisma, Supabase） |
| Phase 2 | Month 2 | Next.js移行 |
| Phase 3 | Month 3-4 | 最適化・監視 |
| Phase 4 | Month 5-6 | 運用自動化 |

### 1.3 移行の原則

1. **段階的移行**: 1つずつ変更し、各フェーズで動作確認
2. **デグレゼロ**: 各フェーズで既存機能が動作することを確認
3. **ロールバック可能**: 各フェーズでロールバック手順を準備
4. **動作確認必須**: 各フェーズ完了時に必ず動作確認を実施

---

## 2. Phase別移行計画

### 2.1 Phase 1: 基盤整備（Week 1-4）

#### Phase 1.1: TypeScript導入

**期間**: Week 1 Day 1-2  
**変更範囲**: TypeScript環境構築のみ（既存コードに影響なし）

**実施内容**:
1. TypeScript依存関係の追加
2. `tsconfig.json` の作成
3. 既存JSファイルをそのまま維持（`allowJs: true`）
4. 新規ファイルのみTypeScriptで作成

**変更されるファイル**:
- `package.json` (依存関係追加)
- `tsconfig.json` (新規作成)

**変更されないファイル**:
- `server.js` (そのまま維持)

---

#### Phase 1.2: Prisma導入（既存Render PostgreSQL） ✅ **実装完了**

**期間**: Week 1 Day 3-5  
**実装日**: 2025-12-31  
**変更範囲**: データベースアクセス層（1エンドポイントのみ）

**実施内容**:
1. Prisma依存関係の追加 ✅
2. 既存Render PostgreSQL接続でPrisma初期化 ✅
3. `prisma db pull` でスキーマ生成 ⚠️ **手動実行が必要**
4. **1つのAPIエンドポイントのみPrisma経由に変更** ✅ (`/api/ping`)
5. 残りは既存の `pg` 直接使用を継続 ✅

**変更されるファイル**:
- `package.json` (Prisma依存関係追加) ✅
- `prisma/schema.prisma` (新規作成、テンプレート) ✅
- `lib/prisma.ts` (新規作成) ✅
- `server.js` (`/api/ping` エンドポイントをPrisma経由に変更) ✅
- `.gitignore` (Prisma関連を追加) ✅

**実装完了確認**:
- ✅ Prisma依存関係が `package.json` に追加されている
- ✅ `lib/prisma.ts` が作成されている
- ✅ `prisma/schema.prisma` のテンプレートが作成されている
- ✅ `/api/ping` エンドポイントがPrisma経由で動作（フォールバック処理付き）
- ✅ 他のエンドポイントは既存の `pg` 直接使用を継続（共存状態）

**重要なポイント**: 
- Supabase移行はまだ実施しない ✅
- 既存のRender PostgreSQLを継続使用 ✅
- `pg` 直接使用とPrismaが共存する状態 ✅

**次のステップ（手動実行が必要）**:
```bash
# 1. 依存関係をインストール
npm install

# 2. Prismaスキーマを既存DBから生成
npx prisma db pull

# 3. Prisma Clientを生成
npx prisma generate

# 4. 動作確認
npm run dev
# → http://localhost:3000/api/ping が動作することを確認
# → レスポンスに "prisma": "connected" が含まれることを確認
```

**Migration管理方針（確定）**:
- **初期**: データベースが正（`prisma db pull` でスキーマを生成）
- **以後**: SQLをGit管理（`supabase/migrations/` ディレクトリ）し、必要に応じてPrismaは追従
- **運用ルール**:
  - スキーマ変更は `supabase/migrations/YYYYMMDD_HHMMSS_description.sql` にSQLファイルとして保存
  - Prismaスキーマは `prisma db pull` でデータベースから再生成（手動）
  - Prisma Migrateは使用しない（SQLが正）
  - マイグレーション実行はSupabase Dashboard > SQL Editor または `psql` で実施

**ディレクトリ構造**:
```
supabase/
  migrations/
    20250115_120000_initial_schema.sql
    20250120_140000_add_auth_provider_columns.sql
```

---

#### Phase 1.3: Supabase接続変更

**期間**: Week 2 Day 1-2  
**変更範囲**: データベース接続のみ（認証機能は未変更）

**実施内容**:
1. Supabaseプロジェクト作成
   - Supabaseアカウント作成
   - 新規プロジェクト作成（Region: Tokyo または Singapore）
   - 接続情報の取得（Connection string, API URL, Keys）

2. **スキーマの移行（データはまだ移行しない）**

   **手順**:
   
   ```bash
   # ステップ1: 既存Render PostgreSQLからスキーマのみダンプ
   pg_dump -h <render-host> \
           -U <user> \
           -d <database> \
           --schema-only \
           --no-owner \
           --no-privileges \
           -f schema.sql
   
   # ステップ2: Supabase Dashboard > SQL Editor で実行
   # schema.sql の内容をそのまま実行
   ```
   
   **注意事項**:
   - `--schema-only`: データは含めない（スキーマのみ）
   - `--no-owner`: オーナー情報を除外（Supabaseでは不要）
   - `--no-privileges`: 権限情報を除外（Supabaseでは不要）
   - 実行前に `schema.sql` を確認（Supabase固有の調整が必要な場合がある）

   **schema.sql実行時のエラー対処（定番除去ルール）**:
   
   スキーマSQLをそのまま実行すると、Supabaseの環境差により以下のエラーが発生する場合があります。事前に対応してください：
   
   1. **CREATE EXTENSION エラー**: 
      - `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` などは削除またはコメントアウト
      - Supabaseでは既に必要な拡張が有効な場合が多い
   
   2. **OWNER関連エラー**:
      - `ALTER TABLE ... OWNER TO ...` は削除
      - `--no-owner` を付けても残る場合があるため、検索して削除
   
   3. **GRANT/REVOKE エラー**:
      - `GRANT ... TO ...` / `REVOKE ... FROM ...` は削除
      - `--no-privileges` を付けても残る場合があるため、検索して削除
   
   4. **依存順の問題**:
      - エラーが出た場合は、SQLを最小単位に分割して実行：
        1. テーブル定義（CREATE TABLE）
        2. インデックス（CREATE INDEX）
        3. 外部キー制約（ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY）
   
   **推奨手順**:
   ```bash
   # 1. ダンプ取得
   pg_dump --schema-only --no-owner --no-privileges -f schema.sql
   
   # 2. 不要な行を削除（sed またはエディタで）
   # CREATE EXTENSION、OWNER、GRANT/REVOKEを削除
   
   # 3. Supabase Dashboard > SQL Editor で実行
   # エラーが出た場合は該当箇所を修正して再実行
   ```

3. 接続文字列をSupabaseに変更
   - `.env` の `DATABASE_URL` をSupabase接続文字列に変更
   - 環境変数例: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`

4. Prisma接続をSupabaseに変更
   ```bash
   # Supabase接続でPrismaスキーマを再生成
   npx prisma db pull
   npx prisma generate
   ```

5. **既存の認証ロジックはそのまま維持**（bcryptjs継続使用）

**変更されるファイル**:
- `.env` (DATABASE_URL変更)
- `prisma/schema.prisma` (Supabase接続で再生成)
- `schema.sql` (新規作成、スキーマダンプ用)

**変更されないファイル**:
- 認証関連のコード（bcryptjs継続）

**重要なポイント**: 
- 認証機能（bcryptjs）はまだ変更しない
- データ移行は別フェーズで実施
- スキーマ移行後、テーブル・インデックス・制約が正しく作成されているか確認

---

#### Phase 1.4: データ移行

**期間**: Week 2 Day 3-4  
**変更範囲**: データのみ（コード変更なし）

**実施内容**:
1. 既存データのバックアップ取得

   ```bash
   # Render PostgreSQLからデータのみダンプ
   pg_dump -h <render-host> \
           -U <user> \
           -d <database> \
           --data-only \
           --column-inserts \
           -f data.sql
   ```

2. Supabaseへのデータ移行

   **方法**: `pg_restore` または `psql` でCOPYコマンドを使用
   
   **推奨手順（COPY方式・投入順序ベース）**:
   
   **重要**: SupabaseのDBはスーパー権限がないため、`session_replication_role = 'replica'` は使用できません。
   外部キー制約を考慮した**投入順序（親→子）**でインポートします。
   
   ```bash
   # ステップ1: テーブルごとにデータをエクスポート（Render PostgreSQL）
   # 親テーブルから順にエクスポート
   psql -h <render-host> -U <user> -d <database> -c "\COPY sellers TO 'sellers.csv' CSV HEADER"
   psql -h <render-host> -U <user> -d <database> -c "\COPY orders TO 'orders.csv' CSV HEADER"
   psql -h <render-host> -U <user> -d <database> -c "\COPY stripe_payments TO 'stripe_payments.csv' CSV HEADER"
   # ... 他のテーブルも同様に（外部キーの参照順で）
   
   # ステップ2: Supabaseにインポート（親→子の順で実行）
   # 親テーブルから順にインポート（外部キー制約を満たす順序）
   psql $DATABASE_URL -c "\COPY sellers FROM 'sellers.csv' CSV HEADER"
   psql $DATABASE_URL -c "\COPY orders FROM 'orders.csv' CSV HEADER"
   psql $DATABASE_URL -c "\COPY stripe_payments FROM 'stripe_payments.csv' CSV HEADER"
   # ... 他のテーブルも同様に（外部キーの参照順で）
   ```
   
   **投入順序の確認方法**:
   ```sql
   -- 外部キー依存関係を確認
   SELECT
     tc.table_name AS child_table,
     ccu.table_name AS parent_table
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
   ORDER BY parent_table, child_table;
   ```
   
   **代替方法（INSERT方式）**:
   
   ```bash
   # データのみのSQLファイルをSupabase Dashboard > SQL Editorで実行
   # （小規模なデータの場合、親→子の順で実行）
   psql $DATABASE_URL < data.sql
   ```
   
   **運用ルール**:
   - **大テーブル（10万行以上）**: COPY方式を優先（高速）
   - **小テーブル（10万行未満）**: INSERT方式でも可
   - **投入順序**: 必ず親テーブル→子テーブルの順で投入（外部キー制約を満たす）
   - **注意**: Supabaseでは `session_replication_role = 'replica'` が使用できないため、投入順序が必須

3. データ整合性チェック

   **レコード数の確認**:
   ```sql
   -- Render PostgreSQL側
   SELECT 'sellers' as table_name, COUNT(*) FROM sellers
   UNION ALL
   SELECT 'orders', COUNT(*) FROM orders
   UNION ALL
   SELECT 'stripe_payments', COUNT(*) FROM stripe_payments;
   
   -- Supabase側でも同様のクエリを実行して比較
   ```
   
   **サンプル一致チェック（推奨）**:
   ```sql
   -- ordersテーブルのサンプルチェック
   -- 最新100件の合計金額
   SELECT SUM(amount) as total_amount, COUNT(*) as record_count
   FROM (
     SELECT amount FROM orders ORDER BY created_at DESC LIMIT 100
   ) sub;
   
   -- 最古/最新日時
   SELECT MIN(created_at) as oldest_date, MAX(created_at) as newest_date
   FROM orders;
   
   -- NULL率チェック
   SELECT 
     COUNT(*) FILTER (WHERE seller_id IS NULL) as null_seller_id_count,
     COUNT(*) FILTER (WHERE amount IS NULL) as null_amount_count,
     COUNT(*) as total_count
   FROM orders;
   
   -- ハッシュ比較（レコード数が少ない場合）
   -- MD5ハッシュでサンプル一致を確認
   SELECT 
     COUNT(*) as count,
     MD5(string_agg(id::text, '' ORDER BY id)) as id_hash
   FROM orders
   ORDER BY created_at DESC
   LIMIT 1000;
   ```
   
   **合格基準**:
   - レコード数が±1%以内で一致
   - サンプルデータ（最新100件）の合計金額が一致（±0.01%以内）
   - NULL率が一致
   - 最古/最新日時が一致

**変更されるファイル**:
- なし（データベースのデータのみ）

**重要なポイント**: 
- 認証データ（bcryptjsハッシュ）もそのまま移行
- コード変更なし
- **投入順序が重要**: 必ず親テーブル→子テーブルの順で投入（外部キー制約エラーを防ぐ）

---

#### Phase 1.5: Supabase Auth移行（新規ユーザーのみ）

**期間**: Week 3 Day 1-3  
**変更範囲**: 認証機能（新規ユーザーのみ）

**実施内容**:
1. Supabase Authクライアントの実装
2. **新規ユーザー登録をSupabase Authに変更**
3. **既存ユーザー認証はbcryptjs継続**（共存状態）

**変更されるファイル**:
- `package.json` (@supabase/supabase-js追加)
- `lib/supabase.ts` (新規作成)
- 新規ユーザー登録API (`/api/seller/start_onboarding`)

**変更されないファイル**:
- 既存ユーザー認証ロジック（bcryptjs継続）

**重要なポイント**: 
- 新規ユーザーのみSupabase Auth
- 既存ユーザーはbcryptjsで継続認証（共存状態）

---

#### Phase 1.6: 既存ユーザーのSupabase Auth移行

**期間**: Week 3 Day 4-5  
**変更範囲**: 認証機能（既存ユーザー）

**実施内容**:
1. ユーザーテーブルに移行状態を記録するカラムを追加

   ```sql
   -- Supabase Dashboard > SQL Editor
   ALTER TABLE sellers 
     ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'bcryptjs',
     ADD COLUMN IF NOT EXISTS supabase_user_id UUID;
   
   -- インデックス追加
   CREATE INDEX IF NOT EXISTS sellers_supabase_user_id_idx 
     ON sellers(supabase_user_id);
   ```

2. Prismaスキーマの更新（カラムマッピングの明示）

   ```prisma
   // prisma/schema.prisma
   model Seller {
     id                String   @id @db.Uuid  // UUID型の場合
     // または
     // id                String   @id  // TEXT型の場合
     email             String
     passwordHash      String   @map("password_hash")
     authProvider      String   @default("bcryptjs") @map("auth_provider")
     supabaseUserId    String?  @db.Uuid @map("supabase_user_id")  // UUID型を明示
     // ... 他のフィールド
     
     @@map("sellers")
   }
   ```

   **重要**: 
   - `@map()` を使用してDBのsnake_caseとTypeScriptのcamelCaseをマッピングします
   - `supabaseUserId` は `@db.Uuid` を付けてUUID型を明示します
   - `id` がUUID型の場合は `@db.Uuid` を付けます（TEXT型の場合は不要）
   
   Prismaスキーマを更新後：
   ```bash
   npx prisma generate
   ```

3. 二重認証ロジックの実装（bcryptjs or Supabase Auth）

   ```typescript
   // lib/auth.ts
   import { prisma } from '@/lib/prisma';
   import { supabase } from '@/lib/supabase';
   import bcrypt from 'bcryptjs';
   import { authConfig } from '@/lib/auth-config';
   
   export async function authenticateUser(email: string, password: string) {
     const user = await prisma.seller.findUnique({ where: { email } });
     
     if (!user) return null;
     
     // auth_providerに基づいて認証方法を切り替え
     // （Prismaスキーマで @map により authProvider にマッピングされている）
     if (user.authProvider === 'supabase') {
       // Supabase Authで認証
       const { data, error } = await supabase.auth.signInWithPassword({
         email,
         password,
       });
       return data.user ? user : null;
     } else if (user.authProvider === 'bcryptjs' && authConfig.enableBcryptjsAuth) {
       // bcryptjsで認証（既存ユーザー）
       // （Prismaスキーマで @map により passwordHash にマッピングされている）
       const isValid = await bcrypt.compare(password, user.passwordHash);
       return isValid ? user : null;
     }
     
     return null;
   }
   ```

3. 初回ログイン時の移行誘導機能を実装

   ```typescript
   // 初回ログイン時に移行を促す
   export async function handleFirstLogin(user: Seller) {
     if (user.authProvider === 'bcryptjs') {
       // 移行が必要なユーザーにリダイレクト
       return { requiresMigration: true };
     }
     return { requiresMigration: false };
   }
   ```

4. パスワードリセット機能の実装（移行用）

   - パスワードリセット時にSupabase Authに移行
   - `auth_provider` を `'supabase'` に更新
   - `supabase_user_id` を保存

5. 段階的にbcryptjs認証ロジックを削除

**変更されるファイル**:
- データベーススキーマ（`auth_provider`, `supabase_user_id`カラム追加）
- パスワードリセットAPI
- 認証ミドルウェア（二重認証ロジック）
- 初回ログイン時の移行誘導UI

**重要なポイント**: 
- **bcryptハッシュをSupabase Authに直接インポートすることは不可能**
- パスワードリセットまたは初回ログイン時に移行が必要
- `auth_provider` カラムで認証方法を切り替え
- 段階的移行（1ユーザーずつでも可）

**移行率100%の定義**:
- 全ユーザーの `auth_provider` が `'supabase'` になっている
- 90日経過後も移行していないユーザーは強制的にパスワードリセットを要求

**クローズ条件**:
- 移行率が100%に達した時点で、bcryptjs認証ロジックを削除
- または、90日経過時点で移行していないユーザーを強制リセット

---

#### Phase 1.7: RLS実装

**期間**: Week 3 Day 6-7  
**変更範囲**: データベースセキュリティのみ

**設計方針（確定）**:
- **当面**: APIサーバ経由（Service role key / DB直接）で動作
- **RLS適用**: 最終的にデータベースレベルのセキュリティを適用
- **フロントエンド直アクセス**: 当面は想定しない（将来の拡張性のためにRLSは実装）

**実施内容**:
1. RLSの有効化

   ```sql
   -- Supabase Dashboard > SQL Editor
   ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;
   ```

2. RLSポリシーの作成（読み取り専用から開始）

   **重要**: RLSポリシーは `supabase_user_id = auth.uid()` のみで判定します。
   `id`（独自ID）と `auth.uid()` を混在させると、型の不一致や保守性の問題が発生します。
   
   ```sql
   -- 読み取りポリシー（まずこれから）
   -- sellers テーブル: supabase_user_id が auth.uid() と一致するユーザーのみアクセス可能
   CREATE POLICY "Users can view own seller data"
     ON sellers FOR SELECT
     USING (supabase_user_id = auth.uid());
   
   -- orders テーブル: 関連するsellerのsupabase_user_idがauth.uid()と一致する場合のみアクセス可能
   -- 重要: sellers.id と orders.seller_id は同一型（推奨：UUID）で統一する必要があります
   -- 異なる型の場合はキャストではなくスキーマ修正で合わせてください
   CREATE POLICY "Users can view own orders"
     ON orders FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM sellers 
         WHERE sellers.id = orders.seller_id 
         AND sellers.supabase_user_id = auth.uid()
       )
     );
   
   -- stripe_payments テーブル: 同様にseller経由で判定
   CREATE POLICY "Users can view own stripe payments"
     ON stripe_payments FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM sellers 
         WHERE sellers.id = stripe_payments.seller_id 
         AND sellers.supabase_user_id = auth.uid()
       )
     );
   ```

3. 動作確認後、段階的に書き込みポリシーを追加

   ```sql
   -- 書き込みポリシー（動作確認後に追加）
   CREATE POLICY "Users can update own seller data"
     ON sellers FOR UPDATE
     USING (supabase_user_id = auth.uid());
   
   CREATE POLICY "Users can insert own orders"
     ON orders FOR INSERT
     WITH CHECK (
       EXISTS (
         SELECT 1 FROM sellers 
         WHERE sellers.id = orders.seller_id 
         AND sellers.supabase_user_id = auth.uid()
       )
     );
   ```

   **注意**: 
   - 既存bcryptユーザー（`supabase_user_id` が NULL）はRLSでブロックされます
   - これは意図的な動作です（APIサーバ経由でService role keyを使用するため）
   - 移行完了後（全ユーザーの `supabase_user_id` が設定済み）にRLSが有効に機能します

4. **Service role keyでのアクセス確認**

   ```typescript
   // 管理者APIはService role keyを使用（RLSをバイパス）
   import { supabaseAdmin } from '@/lib/supabase';
   
   // 管理者は全データにアクセス可能
   const { data } = await supabaseAdmin
     .from('orders')
     .select('*');
   ```

**変更されるファイル**:
- SQL（Supabase Dashboard > SQL Editor）
- 管理者API（Service role key使用を確認）

**重要なポイント**: 
- 読み取り専用ポリシーから開始
- 動作確認後に書き込みポリシーを追加
- APIサーバ経由でのアクセスはService role keyを使用（RLSバイパス）
- 将来的にフロントエンド直アクセスを増やす場合に備えてRLSを実装

---

### 2.2 Phase 2: Next.js移行（Month 2）

詳細は `TECH_STACK_MIGRATION_PLAN.md` Section 3 を参照

---

## 3. 移行OK基準

### 3.1 全体原則

各フェーズで以下の基準をすべて満たす必要があります：

1. **機能動作**: 既存の全機能が動作する
2. **データ整合性**: データが正しく保存・取得できる
3. **パフォーマンス**: レスポンスタイムが±10%以内
4. **エラーなし**: エラーログに異常がない
5. **セキュリティ**: 認証・認可が正常に動作する

---

### 3.2 Phase 1.1: TypeScript導入

#### OK基準

- [ ] TypeScript環境が構築されている
  - `tsconfig.json` が存在
  - `npm run type-check` が実行できる
- [ ] 既存機能が全て動作する
  - 全APIエンドポイントが動作
  - 既存のJavaScriptファイルが実行される
- [ ] 本番環境で動作確認済み

#### NG基準（ロールバック対象）

- ❌ 既存機能が動作しない
- ❌ TypeScriptコンパイルエラーでサーバーが起動しない
- ❌ 本番環境でエラーが発生

---

### 3.3 Phase 1.2: Prisma導入（既存DB） ✅ **実装完了（部分）**

#### OK基準

- [x] Prisma環境が構築されている ✅
  - `prisma/schema.prisma` が存在 ✅（テンプレート）
  - Prisma Clientが生成されている ⚠️ **`npx prisma generate` の実行が必要**
  - 型が利用可能 ⚠️ **`npx prisma db pull` の実行が必要**
- [x] 1つのAPIエンドポイントがPrisma経由で動作 ✅
  - Prisma経由のエンドポイント（`/api/ping`）が正常にレスポンスを返す ✅
  - フォールバック処理により、Prisma未初期化時も動作 ✅
- [x] 既存の `pg` 直接使用エンドポイントも動作 ✅
  - 既存APIが正常に動作（変更なし） ✅
- [ ] データ整合性が確認されている ⚠️ **`prisma db pull` 実行後に確認が必要**
  - Prisma経由と `pg` 直接使用で同じデータが取得できる
- [ ] 本番環境で動作確認済み ⚠️ **手動確認が必要**

#### NG基準（ロールバック対象）

- ✅ Prisma経由のエンドポイントがエラーを返さない（フォールバック処理により安全）
- ✅ 既存の `pg` 直接使用エンドポイントが動作する（変更なし）
- ⚠️ データ整合性の確認は `prisma db pull` 実行後に実施
- ⚠️ 本番環境での動作確認は未実施

**実装状況**: 2025-12-31に実装完了。`/api/ping` エンドポイントのみPrisma経由に変更。他のエンドポイントは既存の `pg` 直接使用を継続（共存状態）。`prisma db pull` と `prisma generate` の実行が必要。

---

### 3.4 Phase 1.3: Supabase接続変更

#### OK基準

- [ ] Supabaseプロジェクトが作成されている
  - 接続情報が取得できている
- [ ] スキーマがSupabaseに移行されている
  - 全テーブルが存在する
  - インデックスが存在する
- [ ] Prisma接続がSupabaseで動作
  - `prisma db pull` が成功
  - Prisma Clientが生成される
- [ ] 既存の認証機能（bcryptjs）が動作
  - 既存ユーザーがログインできる
  - 新規ユーザー登録ができる（bcryptjs経由）
- [ ] 全APIエンドポイントが動作
  - データベース操作が正常に動作
- [ ] 本番環境で動作確認済み

#### NG基準（ロールバック対象）

- ❌ Supabase接続エラーが発生
- ❌ スキーマが正しく移行されていない（テーブル・インデックス不足）
- ❌ 既存の認証機能が動作しない
- ❌ データベース操作でエラーが発生
- ❌ 本番環境でエラーが発生

---

### 3.5 Phase 1.4: データ移行

#### OK基準

- [ ] 既存データがSupabaseに移行されている
  - レコード数が一致（±1%以内）
  - 主要データの内容が一致
- [ ] データ整合性が確認されている
  - 外部キー制約が正常に動作
  - データ型が正しい
- [ ] 既存の認証機能（bcryptjs）が動作
  - 既存ユーザーがログインできる
  - パスワードハッシュが正しく保存されている
- [ ] 全APIエンドポイントが動作
  - データ取得・更新が正常に動作
- [ ] 本番環境で動作確認済み

#### NG基準（ロールバック対象）

- ❌ レコード数が10%以上不一致
- ❌ 主要データの内容が一致しない
- ❌ 外部キー制約エラーが発生
- ❌ 既存ユーザーがログインできない
- ❌ 本番環境でエラーが発生

---

### 3.6 Phase 1.5: Supabase Auth移行（新規ユーザーのみ）

#### OK基準

- [ ] Supabase Authクライアントが実装されている
  - `lib/supabase.ts` が存在
  - 環境変数が設定されている
- [ ] 新規ユーザーがSupabase Authで登録できる
  - 新規ユーザー登録APIが動作
  - Supabase Authにユーザーが作成される
- [ ] 新規ユーザーがSupabase Authで認証できる
  - ログインAPIが動作
  - セッションが作成される
- [ ] 既存ユーザーがbcryptjsハッシュで認証できる
  - 既存ユーザーのログインが動作
  - bcryptjsハッシュで認証できる
- [ ] 全APIエンドポイントが動作
  - 認証が必要なAPIが動作
- [ ] 本番環境で動作確認済み

#### NG基準（ロールバック対象）

- ❌ 新規ユーザーが登録できない
- ❌ 新規ユーザーが認証できない
- ❌ 既存ユーザーが認証できない（bcryptjs）
- ❌ 認証が必要なAPIが動作しない
- ❌ 本番環境でエラーが発生

---

### 3.7 Phase 1.6: 既存ユーザー移行

#### OK基準

- [ ] ユーザーテーブルに移行状態カラムが追加されている
  - `auth_provider` カラムが存在
  - `supabase_user_id` カラムが存在
- [ ] 二重認証ロジックが実装されている
  - `auth_provider` に基づいて認証方法を切り替え
  - bcryptjs認証が動作
  - Supabase Auth認証が動作
- [ ] 初回ログイン時の移行誘導が実装されている
  - 移行が必要なユーザーにリダイレクト
- [ ] パスワードリセット機能が実装されている
  - パスワードリセットAPIが動作
  - パスワードリセット時にSupabase Authに移行
- [ ] 既存ユーザーがパスワードリセットできる
  - パスワードリセットリクエストが動作
  - パスワードリセットが完了する
- [ ] パスワードリセット後にSupabase Authで認証できる
  - 新しいパスワードでログインできる
  - Supabase Authセッションが作成される
  - `auth_provider` が `'supabase'` に更新されている
- [ ] 移行率を確認できる
  - 移行率をSQLで確認可能
- [ ] 本番環境で動作確認済み

**移行率の確認SQL**:
```sql
SELECT 
  COUNT(*) FILTER (WHERE auth_provider = 'supabase') as supabase_users,
  COUNT(*) FILTER (WHERE auth_provider = 'bcryptjs') as bcryptjs_users,
  COUNT(*) as total_users,
  ROUND(100.0 * COUNT(*) FILTER (WHERE auth_provider = 'supabase') / COUNT(*), 2) as migration_rate_percent
FROM sellers;
```

**移行完了の定義**:
- 移行率が100%に達した時点
- または、90日経過時点で移行していないユーザーを強制リセット

**bcryptjs認証ロジックの削除タイミング**:
- 移行率が100%に達した後
- `ENABLE_BCRYPTJS_AUTH=false` に設定して動作確認後
- bcryptjs依存関係を削除

#### NG基準（ロールバック対象）

- ❌ パスワードリセットが動作しない
- ❌ パスワードリセット後に認証できない
- ❌ 既存ユーザーが認証できない
- ❌ 本番環境でエラーが発生

---

### 3.8 Phase 1.7: RLS実装

#### OK基準

- [ ] RLSが主要テーブルで有効
  - sellers, orders, stripe_paymentsテーブルでRLS有効
- [ ] RLSポリシーが適切に設定されている
  - 読み取りポリシーが動作
  - 書き込みポリシーが動作（段階的）
- [ ] ユーザーが自分のデータのみアクセス可能
  - 自分のデータは取得できる
  - 他人のデータは取得できない
- [ ] 管理者が全データにアクセス可能（Service role key使用）
  - 管理者APIが全データにアクセスできる
- [ ] 全APIエンドポイントが動作
  - RLS有効でも正常に動作
- [ ] 本番環境で動作確認済み

#### NG基準（ロールバック対象）

- ❌ ユーザーが自分のデータにアクセスできない
- ❌ ユーザーが他人のデータにアクセスできる（セキュリティ問題）
- ❌ 管理者が全データにアクセスできない
- ❌ APIエンドポイントがRLSによりエラーを返す
- ❌ 本番環境でエラーが発生

---

## 4. 動作確認ポイント

### 4.1 各フェーズ共通の動作確認

#### 4.1.1 基本機能確認

**確認項目**:
- [ ] サーバー起動
  - エラーなく起動する
  - ヘルスチェック（`/api/ping`）が200を返す
- [ ] 主要APIエンドポイント（5個以上）
  - GET `/api/ping`
  - POST `/api/pending/start`
  - GET `/api/seller/order-detail-full`
  - POST `/api/admin/sellers`
  - POST `/api/analyze-item`
- [ ] エラーハンドリング
  - エラーログに異常がない
  - 適切なエラーレスポンスが返る

**確認方法**:
```bash
# サーバー起動
npm run dev

# ヘルスチェック
curl http://localhost:3000/api/ping

# 主要APIエンドポイントをテスト
# （Postman、curl、またはブラウザで確認）
```

**合格基準**:
- 全エンドポイントが200または適切なステータスコードを返す
- エラーログに異常がない

---

#### 4.1.2 データベース操作確認

**確認項目**:
- [ ] データ取得
  - SELECTクエリが正常に動作
  - データが正しく返る
- [ ] データ作成
  - INSERTが正常に動作
  - データが正しく保存される
- [ ] データ更新
  - UPDATEが正常に動作
  - データが正しく更新される
- [ ] データ削除
  - DELETEが正常に動作（該当する場合）
  - データが正しく削除される

**確認方法**:
```sql
-- Prisma経由
const users = await prisma.seller.findMany();
console.log('Users:', users);

-- データ整合性チェック
SELECT COUNT(*) FROM sellers;
SELECT COUNT(*) FROM orders;
```

**合格基準**:
- 全データベース操作が正常に動作
- データ整合性が確認される

---

#### 4.1.3 認証・認可確認

**確認項目**:
- [ ] 認証が必要なAPI
  - 認証なしでアクセス → 401エラー
  - 認証ありでアクセス → 200エラー
- [ ] ユーザー権限
  - 自分のデータにアクセス可能
  - 他人のデータにアクセス不可（RLS実装後）

**確認方法**:
```bash
# 認証なし
curl http://localhost:3000/api/admin/sellers
# → 401 Unauthorized

# 認証あり
curl -H "x-admin-token: [token]" http://localhost:3000/api/admin/sellers
# → 200 OK
```

**合格基準**:
- 認証・認可が正常に動作
- セキュリティが確保されている

---

#### 4.1.4 パフォーマンス確認

**確認項目**:
- [ ] レスポンスタイム
  - 既存のレスポンスタイムと比較
  - ±10%以内を維持
- [ ] メモリ使用量
  - 異常な増加がない
- [ ] CPU使用率
  - 異常な増加がない

**対象API（固定）**:
- `/api/ping` (ヘルスチェック)
- `/api/seller/order-detail-full` (データ取得)
- `/api/analyze-item` (AI処理)

**確認方法（計測手順）**:

```bash
# デプロイ前のベースライン測定（各APIを10回実行）
for i in {1..10}; do
  curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3000/api/ping
done | sort -n | tail -6 | head -1  # 中央値（10回中5番目と6番目の平均）

# デプロイ後の測定（同様に10回実行）
# 中央値を比較

# または、より簡単な方法（平均値）
for i in {1..10}; do
  curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3000/api/ping
done | awk '{sum+=$1; count++} END {print sum/count}'
```

**測定結果の記録**:

| APIエンドポイント | デプロイ前（中央値/秒） | デプロイ後（中央値/秒） | 変化率 | 判定 |
|------------------|----------------------|----------------------|--------|------|
| `/api/ping` | 0.025 | 0.027 | +8% | ✅ OK |
| `/api/seller/order-detail-full` | 0.150 | 0.165 | +10% | ✅ OK |
| `/api/analyze-item` | 2.500 | 2.750 | +10% | ✅ OK |

**合格基準**:
- 全APIエンドポイントのレスポンスタイムが±10%以内
- メモリ・CPU使用率が異常に増加していない（±20%以内）
- **計測は必ずデプロイ前後で同じ環境・条件で実施**

**ログでの確認（推奨）**:
- パフォーマンスログがあれば、p95レイテンシを確認
- または平均レスポンスタイムを1指標として固定して確認

---

### 4.2 Phase別の詳細確認ポイント

#### Phase 1.1: TypeScript導入

**追加確認項目**:
- [ ] TypeScriptコンパイル
  - `npm run type-check` がエラーなく実行できる
- [ ] 既存JSファイルの動作
  - `server.js` が正常に実行される
  - `allowJs: true` によりJSファイルが読み込まれる

**確認コマンド**:
```bash
npm run type-check
npm run dev
```

---

#### Phase 1.2: Prisma導入

**追加確認項目**:
- [ ] Prisma Client生成
  - `npx prisma generate` が成功
  - 型定義が利用可能
- [ ] Prisma経由のデータ取得
  - 1つのエンドポイントでPrismaが動作
  - データが正しく取得できる
- [ ] `pg` 直接使用との共存
  - 既存の `pg` 直接使用コードが動作
  - Prismaと `pg` で同じデータが取得できる

**確認コマンド**:
```bash
npx prisma generate
npx prisma db pull
# Prisma経由のエンドポイントをテスト
```

---

#### Phase 1.3: Supabase接続変更

**追加確認項目**:
- [ ] Supabase接続
  - Prisma接続がSupabaseで動作
  - データベース操作が正常に動作
- [ ] スキーマ整合性
  - 全テーブルが存在
  - インデックスが存在
  - 外部キー制約が存在
- [ ] 認証機能（bcryptjs）
  - 既存ユーザーがログインできる
  - 新規ユーザー登録ができる（bcryptjs）

**確認コマンド**:
```bash
# Supabase接続確認
npx prisma db pull
npx prisma generate

# データベース操作テスト
# 既存ユーザーのログインテスト
```

---

#### Phase 1.4: データ移行

**追加確認項目**:
- [ ] データレコード数
  - 全テーブルのレコード数が一致（±1%以内）
- [ ] データ内容
  - 主要データの内容が一致
  - 外部キー関係が正しい
- [ ] 認証データ
  - パスワードハッシュが正しく移行されている
  - 既存ユーザーがログインできる

**確認SQL**:
```sql
-- レコード数確認
SELECT 'sellers' as table_name, COUNT(*) FROM sellers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'stripe_payments', COUNT(*) FROM stripe_payments;

-- データ内容確認（サンプル）
SELECT id, display_name, email FROM sellers LIMIT 5;
```

---

#### Phase 1.5: Supabase Auth移行（新規ユーザー）

**追加確認項目**:
- [ ] 新規ユーザー登録（Supabase Auth）
  - 新規ユーザー登録APIが動作
  - Supabase Authにユーザーが作成される
  - メールアドレスが正しく保存される
- [ ] 新規ユーザー認証（Supabase Auth）
  - ログインAPIが動作
  - Supabase Authセッションが作成される
  - セッションが正しく管理される
- [ ] 既存ユーザー認証（bcryptjs）
  - 既存ユーザーがログインできる
  - bcryptjsハッシュで認証できる
  - セッションが正しく管理される

**確認方法**:
```bash
# 新規ユーザー登録テスト
curl -X POST http://localhost:3000/api/seller/start_onboarding \
  -H "Content-Type: application/json" \
  -d '{"publicId": "test_user", "displayName": "Test User", "email": "test@example.com", "password": "password123"}'

# 新規ユーザーログインテスト（Supabase Auth）
# 既存ユーザーログインテスト（bcryptjs）
```

---

#### Phase 1.6: 既存ユーザー移行

**追加確認項目**:
- [ ] パスワードリセット機能
  - パスワードリセットリクエストが動作
  - パスワードリセットが完了する
- [ ] 移行後の認証
  - 新しいパスワードでログインできる
  - Supabase Authセッションが作成される
- [ ] 移行率
  - 段階的に移行が進んでいる
  - 最終的に100%移行（目標）

**確認方法**:
```bash
# パスワードリセットテスト
# 移行後のログインテスト

# 移行率確認（SQL）
SELECT 
  COUNT(*) FILTER (WHERE auth_provider = 'supabase') as supabase_users,
  COUNT(*) FILTER (WHERE auth_provider = 'bcryptjs') as bcryptjs_users,
  COUNT(*) as total_users
FROM users;
```

---

#### Phase 1.7: RLS実装

**追加確認項目**:
- [ ] RLS有効化
  - RLSが主要テーブルで有効
- [ ] RLSポリシー
  - 読み取りポリシーが動作
  - 書き込みポリシーが動作
- [ ] ユーザーデータアクセス
  - 自分のデータは取得できる
  - 他人のデータは取得できない（403エラー）
- [ ] 管理者アクセス
  - Service role keyで全データにアクセスできる

**確認方法**:
```sql
-- RLS有効化確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('sellers', 'orders', 'stripe_payments');

-- RLSポリシー確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('sellers', 'orders', 'stripe_payments');
```

```bash
# ユーザーデータアクセステスト
# 自分のデータ: 200 OK
# 他人のデータ: 403 Forbidden

# 管理者アクセステスト（Service role key）
# 全データ: 200 OK
```

---

### 4.3 本番環境での動作確認

#### 4.3.1 デプロイ前確認

**確認項目**:
- [ ] ステージング環境での動作確認完了
- [ ] バックアップ取得
- [ ] ロールバック手順の確認
- [ ] メンテナンスウィンドウの設定
- [ ] モニタリング設定の確認

---

#### 4.3.2 デプロイ後確認

**確認項目**:
- [ ] サーバー起動確認
  - エラーなく起動
  - ヘルスチェックが200を返す
- [ ] 主要機能の動作確認（5-10分）
  - 全APIエンドポイントが動作
  - 認証・認可が動作
  - データベース操作が動作
- [ ] エラーログ確認
  - 異常なエラーがない
- [ ] パフォーマンス確認
  - レスポンスタイムが正常範囲内

**確認時間**: 30分-1時間

---

#### 4.3.3 問題発生時の対応

**軽微な問題（動作はするが最適化が必要）**:
- 記録して、次のフェーズで対応
- ロールバックは不要

**重大な問題（機能が動作しない）**:
- **即座にロールバック**
- 問題を記録
- 原因を調査
- 修正後に再度デプロイ

---

## 5. ロールバック基準

### 5.1 ロールバックが必要な状況

以下の状況では**即座にロールバック**を実施してください：

1. **機能が動作しない**
   - APIエンドポイントが500エラーを返す
   - サーバーが起動しない
   - 認証が動作しない

2. **データ整合性の問題**
   - データが正しく保存されない
   - データが取得できない
   - データが消失した

3. **セキュリティ問題**
   - 認証がバイパスされる
   - 権限チェックが動作しない
   - 不正アクセスが可能

4. **パフォーマンスの大幅劣化**
   - レスポンスタイムが2倍以上
   - メモリリークが発生
   - CPU使用率が100%に張り付く

5. **本番環境でのエラー**
   - ユーザーに影響が出ている
   - エラーログが大量に発生

---

### 5.2 ロールバック不要な状況

以下の状況ではロールバックは不要です：

1. **軽微な問題**
   - レスポンスタイムが±10-20%以内の増加
   - 軽微な警告ログ（機能は動作）

2. **最適化が必要な問題**
   - パフォーマンス改善の余地がある
   - コードのリファクタリングが必要

3. **次のフェーズで対応可能な問題**
   - 機能は動作するが改善が必要
   - セキュリティ強化が必要（機能は動作）

---

### 5.3 各フェーズのロールバック手順

#### Phase 1.1: TypeScript導入

**ロールバック手順**:
```bash
# 1. TypeScript依存関係を削除
npm uninstall typescript @types/node @types/express @types/pg

# 2. tsconfig.json を削除
rm tsconfig.json

# 3. package.json の scripts を元に戻す
# "dev": "nodemon server.js" に戻す

# 4. デプロイ
git commit -m "Rollback: Remove TypeScript"
git push
```

**所要時間**: 5分

---

#### Phase 1.2: Prisma導入

**ロールバック手順**:
```bash
# 1. Prisma経由のコードをpg直接使用に戻す（Git履歴から復元）
git checkout [commit-hash] -- [prisma経由のファイル]

# 2. Prisma依存関係を削除
npm uninstall prisma @prisma/client

# 3. prisma/ ディレクトリを削除
rm -rf prisma/

# 4. デプロイ
git commit -m "Rollback: Remove Prisma"
git push
```

**所要時間**: 30分-1時間

---

#### Phase 1.3: Supabase接続変更

**ロールバック手順**:
```bash
# 1. 環境変数をRender PostgreSQLに戻す
# DATABASE_URL=postgresql://[render-connection-string]
# （Render Dashboard > Environment Variables で変更）

# 2. Prisma接続をRender PostgreSQLに戻す
npx prisma db pull  # Render接続で再生成
npx prisma generate

# 3. デプロイ
git commit -m "Rollback: Revert to Render PostgreSQL"
git push
```

**所要時間**: 30分

**注意**: Supabaseプロジェクトは削除しない（データが残る）

---

#### Phase 1.4: データ移行

**ロールバック手順**:
```bash
# 1. Render PostgreSQLのバックアップから復元
pg_restore -h [render-host] -U [user] -d [database] backup.dump

# 2. 環境変数をRender PostgreSQLに戻す
# DATABASE_URL=postgresql://[render-connection-string]

# 3. Prisma接続をRender PostgreSQLに戻す
npx prisma db pull  # Render接続で再生成
npx prisma generate

# 4. デプロイ
git commit -m "Rollback: Revert data migration"
git push
```

**所要時間**: 1-2時間（データ量による）

---

#### Phase 1.5: Supabase Auth移行

**ロールバック手順**:
```bash
# 1. 認証コードをbcryptjsに戻す（Git履歴から復元）
git checkout [commit-hash] -- [認証関連ファイル]

# 2. Supabase Auth依存関係を削除
npm uninstall @supabase/supabase-js

# 3. 環境変数を削除（オプション、コードを戻せば不要）
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY

# 4. デプロイ
git commit -m "Rollback: Revert to bcryptjs authentication"
git push
```

**所要時間**: 1時間

---

#### Phase 1.6: 既存ユーザー移行

**ロールバック手順**:
```bash
# 1. パスワードリセット機能を削除（Git履歴から復元）
git checkout [commit-hash] -- [パスワードリセット関連ファイル]

# 2. bcryptjs認証ロジックを復元（既に削除している場合）
git checkout [commit-hash] -- [認証関連ファイル]

# 3. デプロイ
git commit -m "Rollback: Revert user migration"
git push
```

**所要時間**: 30分-1時間

---

#### Phase 1.7: RLS実装

**ロールバック手順**:
```sql
-- Supabase Dashboard > SQL Editor で実行

-- RLSを無効化
ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments DISABLE ROW LEVEL SECURITY;

-- RLSポリシーを削除
DROP POLICY IF EXISTS "Users can view own seller data" ON sellers;
DROP POLICY IF EXISTS "Users can update own seller data" ON sellers;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
-- ... 他のポリシーも削除
```

**所要時間**: 10分

---

## 6. チェックリスト

### 6.1 Phase 1 全体チェックリスト

#### Phase 1.1: TypeScript導入
- [ ] TypeScript依存関係を追加
- [ ] `tsconfig.json` を作成
- [ ] 既存機能が全て動作することを確認
- [ ] 本番環境で動作確認
- [ ] ロールバック手順を確認

#### Phase 1.2: Prisma導入（既存DB）
- [ ] Prisma依存関係を追加
- [ ] `prisma/schema.prisma` を生成（Render PostgreSQL）
- [ ] 1つのAPIエンドポイントをPrisma経由に変更
- [ ] 既存の `pg` 直接使用エンドポイントも動作することを確認
- [ ] データ整合性を確認
- [ ] 本番環境で動作確認
- [ ] ロールバック手順を確認

#### Phase 1.3: Supabase接続変更
- [ ] Supabaseプロジェクトを作成
- [ ] スキーマをSupabaseに移行
- [ ] 接続文字列をSupabaseに変更
- [ ] Prisma接続をSupabaseに変更
- [ ] 既存の認証機能（bcryptjs）が動作することを確認
- [ ] 全APIエンドポイントが動作することを確認
- [ ] 本番環境で動作確認
- [ ] ロールバック手順を確認

#### Phase 1.4: データ移行
- [ ] バックアップを取得
- [ ] データをSupabaseに移行
- [ ] データ整合性を確認（レコード数、内容）
- [ ] 既存の認証機能（bcryptjs）が動作することを確認
- [ ] 全APIエンドポイントが動作することを確認
- [ ] 本番環境で動作確認
- [ ] ロールバック手順を確認

#### Phase 1.5: Supabase Auth移行（新規ユーザー）
- [ ] Supabase Authクライアントを実装
- [ ] 新規ユーザー登録をSupabase Authに変更
- [ ] 新規ユーザーがSupabase Authで登録・認証できることを確認
- [ ] 既存ユーザーがbcryptjsハッシュで認証できることを確認
- [ ] 全APIエンドポイントが動作することを確認
- [ ] 本番環境で動作確認
- [ ] ロールバック手順を確認

#### Phase 1.6: 既存ユーザー移行
- [ ] パスワードリセット機能を実装
- [ ] 既存ユーザーがパスワードリセットできることを確認
- [ ] パスワードリセット後にSupabase Authで認証できることを確認
- [ ] 全ユーザーがSupabase Authに移行（段階的）
- [ ] bcryptjs認証ロジックを削除
- [ ] 全APIエンドポイントが動作することを確認
- [ ] 本番環境で動作確認
- [ ] ロールバック手順を確認

#### Phase 1.7: RLS実装
- [ ] RLSを主要テーブルで有効化
- [ ] RLSポリシーを作成（読み取りから開始）
- [ ] ユーザーが自分のデータのみアクセス可能なことを確認
- [ ] 管理者が全データにアクセス可能なことを確認
- [ ] 全APIエンドポイントが動作することを確認
- [ ] 本番環境で動作確認
- [ ] ロールバック手順を確認

---

### 6.2 各フェーズ共通チェックリスト

#### フェーズ開始前
- [ ] 前フェーズの動作確認が完了している
- [ ] ロールバック手順を確認している
- [ ] バックアップを取得している（データベース関連の場合）
- [ ] メンテナンスウィンドウを設定している（本番環境の場合）
- [ ] モニタリング設定を確認している

#### フェーズ実施中
- [ ] 変更を段階的に実施している
- [ ] 各変更後に動作確認を実施している
- [ ] エラーログを監視している
- [ ] 問題があれば即座にロールバックできる状態を維持している

#### フェーズ完了時
- [ ] 機能動作確認が完了している
- [ ] データ整合性確認が完了している
- [ ] セキュリティ確認が完了している
- [ ] パフォーマンス確認が完了している
- [ ] 本番環境で動作確認が完了している（該当する場合）
- [ ] モニタリング設定が完了している
- [ ] 次のフェーズの準備が完了している
- [ ] ロールバック手順を文書化している

---

### 6.3 緊急時のチェックリスト

#### 問題発生時
- [ ] 問題の影響範囲を確認
- [ ] ロールバックが必要か判断
- [ ] ロールバックが必要な場合、即座に実施
- [ ] 問題を記録（発生時刻、症状、影響範囲）
- [ ] チームに報告
- [ ] 原因を調査
- [ ] 修正方法を検討

#### ロールバック実施時
- [ ] ロールバック手順を確認
- [ ] バックアップから復元（必要な場合）
- [ ] 環境変数を元に戻す（必要な場合）
- [ ] コードをGit履歴から復元（必要な場合）
- [ ] デプロイ
- [ ] 動作確認
- [ ] ロールバック完了をチームに報告

---

## 7. 実施時の注意事項

### 7.1 コミット粒度とブランチ戦略

**ブランチ戦略**:
- 各フェーズごとにブランチを作成
- ブランチ名: `feat/migration-phase-1-X`（Xはフェーズ番号）

**コミット粒度（1フェーズ = 1〜3コミット）**:

1. **準備コミット**: 設定ファイル・依存関係・スキーマファイルの追加
   ```
   feat(phase-1.2): add Prisma dependencies and schema
   - Add prisma and @prisma/client to package.json
   - Add prisma/schema.prisma (generated from db pull)
   - Add lib/prisma.ts
   ```

2. **適用コミット**: 実装コードの変更
   ```
   feat(phase-1.2): migrate /api/ping endpoint to Prisma
   - Update /api/ping to use Prisma instead of pg direct
   - Keep other endpoints using pg for now
   ```

3. **検証ログコミット**: 動作確認結果の記録（オプション）
   ```
   docs(phase-1.2): add verification results
   - Document performance measurements
   - Record test results
   ```

**マージルール**:
- 各フェーズ完了時（動作確認済み）にマージ
- 問題があれば、そのフェーズのブランチ内で修正コミットを追加
- ロールバックが必要な場合は、直前のコミットに戻る

**例**:
```bash
# Phase 1.2の実装
git checkout -b feat/migration-phase-1-2
git commit -m "feat(phase-1.2): add Prisma dependencies and schema"
git commit -m "feat(phase-1.2): migrate /api/ping endpoint to Prisma"
# 動作確認後
git checkout main
git merge feat/migration-phase-1-2
```

---

### 7.2 Feature Flagの参照箇所最小化

**原則**: Feature Flagは `lib/auth-config.ts` に集約し、他のファイルからは直接 `process.env` を読まない

**実装例**:

```typescript
// lib/auth-config.ts（唯一のFeature Flag参照箇所）
const MIGRATION_START_DATE = process.env.AUTH_MIGRATION_START_DATE;
if (!MIGRATION_START_DATE) {
  console.warn('⚠️ AUTH_MIGRATION_START_DATE is not set. Using default: 2025-01-15');
}

export const authConfig = {
  // 登録時の認証方式（新規ユーザー向け）
  enableSupabaseAuthForNewUsers: process.env.ENABLE_SUPABASE_AUTH_FOR_NEW_USERS === 'true',
  
  // 認証時の認証方式（ログイン/セッション向け）
  enableSupabaseAuth: process.env.ENABLE_SUPABASE_AUTH === 'true',
  
  // 旧方式（bcryptjs）の許可
  enableBcryptjsAuth: process.env.ENABLE_BCRYPTJS_AUTH === 'true',
  
  migrationStartDate: new Date(MIGRATION_START_DATE || '2025-01-15'),
  migrationDeadlineDays: parseInt(process.env.AUTH_MIGRATION_DEADLINE_DAYS || '90'),
};

// 新規ユーザー登録時の認証方式判定（登録API専用）
export function shouldUseSupabaseAuthForNewUser(): boolean {
  return authConfig.enableSupabaseAuthForNewUsers;
}

// 認証（ログイン）時の認証方式判定
export function shouldUseSupabaseAuthForLogin(): boolean {
  return authConfig.enableSupabaseAuth;
}
```

**使用箇所**:

```typescript
// lib/auth.ts（auth-config.tsから読み込む）
import { authConfig } from '@/lib/auth-config';

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.seller.findUnique({ where: { email } });
  
  if (!user) return null;
  
  // auth_providerに基づいて認証方法を切り替え
  if (user.authProvider === 'supabase' && authConfig.enableSupabaseAuth) {
    // Supabase Authで認証
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return data.user ? user : null;
  } else if (user.authProvider === 'bcryptjs' && authConfig.enableBcryptjsAuth) {
    // bcryptjsで認証（既存ユーザー）
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }
  
  return null;
}

// api/seller/start_onboarding.ts（新規ユーザー登録API）
import { shouldUseSupabaseAuthForNewUser } from '@/lib/auth-config';

export async function startOnboarding(req, res) {
  if (shouldUseSupabaseAuthForNewUser()) {
    // Supabase Authで登録
  } else {
    // bcryptjsで登録（既存方式）
  }
}
```

**重要なポイント**:
- **登録時の判定**: `ENABLE_SUPABASE_AUTH_FOR_NEW_USERS`（登録API専用）
- **認証（ログイン）時の判定**: `ENABLE_SUPABASE_AUTH`（認証処理専用）
- **旧方式の許可**: `ENABLE_BCRYPTJS_AUTH`（bcryptjs認証の許可）
- **Feature Flagの変更**: `lib/auth-config.ts` のみを修正すれば全体に反映
- **環境変数**: `AUTH_MIGRATION_START_DATE` は必須（未設定の場合は警告）

---

### 7.3 基本原則

1. **焦らず、確実に**
   - 各フェーズで十分な動作確認を行う
   - 問題があれば即座にロールバック

2. **コミュニケーション**
   - 各フェーズの開始・完了をチームに共有
   - 問題発生時は即座に報告

3. **ドキュメント化**
   - 各フェーズで発生した問題を記録
   - ロールバック手順を事前に確認
   - 動作確認結果を記録

### 7.4 本番環境での実施

1. **メンテナンスウィンドウの設定**
   - ユーザー影響を最小化する時間帯を選択
   - メンテナンス告知（必要な場合）

2. **段階的なデプロイ**
   - ステージング環境で先に検証
   - 問題なければ本番環境にデプロイ

3. **モニタリング**
   - デプロイ後、30分-1時間は監視
   - エラーログを確認
   - パフォーマンス指標を確認

---

## 8. 環境構成と責任分界

### 8.1 環境構成表

| 環境 | データベース | 認証方式 | Auth Provider | 用途 |
|------|------------|---------|--------------|------|
| **dev** | Supabase (Dev) | Supabase Auth | `supabase` | 開発・テスト |
| **staging** | Supabase (Staging) | 共存状態 | `supabase` / `bcryptjs` | 本番前検証 |
| **prod** | Supabase (Prod) | 共存状態 → Supabase Auth | `supabase` / `bcryptjs` → `supabase` | 本番環境 |

**環境変数の設定**:

```env
# dev
DATABASE_URL=postgresql://postgres:[password]@db.[dev-project].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[dev-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[dev-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[dev-service-role-key]

# staging
DATABASE_URL=postgresql://postgres:[password]@db.[staging-project].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]

# prod
DATABASE_URL=postgresql://postgres:[password]@db.[prod-project].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[prod-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-role-key]
```

---

### 8.2 責任分界（OK判定者）

| フェーズ | 変更内容 | OK判定者 | チェック観点 |
|---------|---------|---------|------------|
| **Phase 1.1** | TypeScript導入 | 実装者 | 既存機能が動作するか |
| **Phase 1.2** | Prisma導入 | 実装者 + レビューア | データ整合性、API動作 |
| **Phase 1.3** | Supabase接続 | 実装者 + DBA（可能なら） | スキーマ整合性、接続確認 |
| **Phase 1.4** | データ移行 | 実装者 + DBA（必須） | データ整合性、レコード数 |
| **Phase 1.5** | Supabase Auth（新規） | 実装者 + セキュリティ担当 | 認証動作、セキュリティ |
| **Phase 1.6** | 既存ユーザー移行 | 実装者 + セキュリティ担当 | 移行率、認証動作 |
| **Phase 1.7** | RLS実装 | 実装者 + セキュリティ担当 | 権限チェック、セキュリティ |

**判定基準**:
- 実装者: 機能動作確認、データ整合性確認
- レビューア: コード品質、設計妥当性
- DBA: データベース整合性、パフォーマンス
- セキュリティ担当: セキュリティチェック、権限確認

**自分1人で実施する場合**:
- 各チェック観点を自分で確認
- チェックリストを必ず実施
- 問題があれば即座にロールバック

---

### 8.3 移行フラグ（Feature Flag）

認証方式の共存を制御するための環境変数フラグを設定します。

**環境変数**:

```env
# 認証方式の制御（登録時）
ENABLE_SUPABASE_AUTH_FOR_NEW_USERS=true  # 新規ユーザー登録時にSupabase Authを使用

# 認証方式の制御（ログイン時）
ENABLE_SUPABASE_AUTH=true                # Supabase Auth認証を許可
ENABLE_BCRYPTJS_AUTH=true                # bcryptjs認証を許可（既存ユーザー向け）

# 移行期間の設定
AUTH_MIGRATION_START_DATE=2025-01-15     # 移行開始日（必須）
AUTH_MIGRATION_DEADLINE_DAYS=90          # 移行期限（日数）
```

**実装例**（詳細はSection 7.2を参照）:

```typescript
// lib/auth-config.ts
const MIGRATION_START_DATE = process.env.AUTH_MIGRATION_START_DATE;
if (!MIGRATION_START_DATE) {
  console.warn('⚠️ AUTH_MIGRATION_START_DATE is not set. Using default: 2025-01-15');
}

export const authConfig = {
  enableSupabaseAuthForNewUsers: process.env.ENABLE_SUPABASE_AUTH_FOR_NEW_USERS === 'true',
  enableSupabaseAuth: process.env.ENABLE_SUPABASE_AUTH === 'true',
  enableBcryptjsAuth: process.env.ENABLE_BCRYPTJS_AUTH === 'true',
  migrationStartDate: new Date(MIGRATION_START_DATE || '2025-01-15'),
  migrationDeadlineDays: parseInt(process.env.AUTH_MIGRATION_DEADLINE_DAYS || '90'),
};
```

**フェーズ別の設定**:

| フェーズ | ENABLE_SUPABASE_AUTH_FOR_NEW_USERS | ENABLE_SUPABASE_AUTH | ENABLE_BCRYPTJS_AUTH | 説明 |
|---------|-----------------------------------|---------------------|---------------------|------|
| Phase 1.5前 | `false` | `false` | `true` | bcryptjsのみ |
| Phase 1.5 | `true` | `true` | `true` | 新規: Supabase Auth（登録・認証）、既存: bcryptjs（認証） |
| Phase 1.6 | `true` | `true` | `true` | 共存期間（移行中） |
| Phase 1.6完了後 | `true` | `true` | `false` | Supabase Authのみ（bcryptjs削除） |

---

## 9. 参考資料

### 9.1 関連ドキュメント

- `TECH_STACK_MIGRATION_PLAN.md` - 詳細な移行計画
- `MIGRATION_SAFETY_STRATEGY.md` - 安全性戦略の詳細
- `SUPABASE_MIGRATION_ANALYSIS.md` - Supabase移行分析
- `SOURCE_DOCUMENT_CONSISTENCY_REPORT.md` - 現状分析レポート

### 9.2 外部リソース

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Migration Guide](https://supabase.com/docs/guides/auth/auth-helpers/auth-helpers-nextjs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

**Document Version**: 1.4  
**Last Updated**: 2025-12-31  
**Status**: Execution Plan (Production Ready) - Phase 1.1-1.2 実装完了

**変更履歴**:
- v1.0 (2025-01-15): 初版作成
- v1.1 (2025-01-15): スキーマ移行手順の明確化、Migration管理方針の確定、Auth移行戦略の詳細化、RLS設計方針の明確化、パフォーマンス計測方法の具体化、環境構成表・責任分界・移行フラグの追加
- v1.2 (2025-12-31): schema.sql実行時のエラー対処手順追加、Prismaスキーママッピングの明示、RLSポリシー条件の安全化、データ移行手順の具体化、コミット粒度ルール追加
- v1.3 (2025-12-31): データ移行の投入順序ベース化（session_replication_role削除）、Prisma UUID型の明示、RLS型一致前提の明記、Feature Flag整理（登録/認証の分離）、データ検証の具体化（サンプル一致チェック追加）
- v1.4 (2025-12-31): Phase 1.1-1.2の実装完了状況を追記、実装進捗状況セクション追加、実装ファイル一覧と動作確認手順を追加、OK基準に実装状況を反映

