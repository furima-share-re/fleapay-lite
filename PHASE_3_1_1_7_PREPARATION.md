# Phase 3.1（Helicone導入）とPhase 1.7（RLS実装）事前準備

**作成日**: 2026-01-03  
**対象**: fleapay-lite プロジェクト  
**目的**: 監視ツール導入とRLS実装の事前準備をまとめる

---

## 📋 目次

1. [Phase 3.1: Helicone導入の事前準備](#phase-31-helicone導入の事前準備)
2. [Phase 1.7: RLS実装の事前準備](#phase-17-rls実装の事前準備)
3. [共通の事前準備](#共通の事前準備)
4. [実装時のチェックリスト](#実装時のチェックリスト)

---

## Phase 3.1: Helicone導入の事前準備

### 1. Heliconeアカウント作成

**実施内容**:
- [ ] Heliconeアカウントを作成（https://helicone.ai/）
- [ ] プロジェクト名: `fleapay-lite` でプロジェクト作成
- [ ] API Keyを取得（`HELICONE_API_KEY`）

**必要な情報**:
- Heliconeアカウントのメールアドレス
- プロジェクト名: `fleapay-lite`
- 環境: `staging`（検証環境）、`production`（本番環境）

**取得するAPI Key**:
- `HELICONE_API_KEY`: Heliconeの認証キー

---

### 2. 現在のOpenAI使用箇所の確認

**確認済みの使用箇所**:

| ファイル | 用途 | モデル | 備考 |
|---------|------|--------|------|
| `app/api/analyze-item/route.ts` | 商品画像解析 | `gpt-4o` | 画像から商品情報を抽出 |
| `app/api/photo-frame/route.ts` | 写真フレーム加工 | `dall-e-2` | 画像編集API |

**現在の実装**:
```typescript
// 各ファイルで直接OpenAIインスタンスを作成
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
```

**変更が必要なファイル**:
- `app/api/analyze-item/route.ts`
- `app/api/photo-frame/route.ts`

---

### 3. 環境変数の準備

**検証環境（Staging）**:
```bash
# Render Dashboard > Environment Variables
HELICONE_API_KEY=<検証環境用のHelicone API Key>
OPENAI_API_KEY=<既存のOpenAI API Key>
NODE_ENV=staging
```

**本番環境（Production）**:
```bash
# Render Dashboard > Environment Variables
HELICONE_API_KEY=<本番環境用のHelicone API Key>
OPENAI_API_KEY=<既存のOpenAI API Key>
NODE_ENV=production
```

**注意事項**:
- Heliconeは検証環境・本番環境の両方で導入
- 環境ごとに異なるAPI Keyを使用（Heliconeダッシュボードで環境別に管理）

---

### 4. `lib/openai.ts` の作成準備

**作成するファイル**: `lib/openai.ts`

**実装内容**:
```typescript
// lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://oai.helicone.ai/v1',
  defaultHeaders: {
    'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
    'Helicone-Property-Environment': process.env.NODE_ENV || 'development',
    'Helicone-Property-Project': 'fleapay-lite',
  },
});
```

**変更が必要なファイル**:
- `app/api/analyze-item/route.ts`: `lib/openai.ts`からインポート
- `app/api/photo-frame/route.ts`: `lib/openai.ts`からインポート

---

### 5. 依存関係の確認

**現在の依存関係**:
- `openai`: `^4.28.4`（`package.json`に既に存在）

**追加不要**: OpenAI SDKは既にインストール済み

---

### 6. 動作確認の準備

**確認項目**:
- [ ] HeliconeダッシュボードでAPI呼び出しが記録される
- [ ] コスト・レイテンシ・トークン数が可視化される
- [ ] プロンプト・レスポンス全文が記録される
- [ ] 環境別（staging/production）でフィルタリング可能

**テスト方法**:
1. `/api/analyze-item` に画像をPOST
2. Heliconeダッシュボードでリクエストを確認
3. `/api/photo-frame` に画像をPOST
4. Heliconeダッシュボードでリクエストを確認

---

## Phase 1.7: RLS実装の事前準備

### 1. Supabaseテーブル構造の確認

**確認済みのテーブル**:

| テーブル名 | RLS対象 | 主キー | ユーザー識別カラム |
|-----------|---------|--------|------------------|
| `sellers` | ✅ | `id` | `supabase_user_id` |
| `orders` | ✅ | `id` | `seller_id` → `sellers.supabase_user_id` |
| `stripe_payments` | ✅ | `id` | `seller_id` → `sellers.supabase_user_id` |

**Prismaスキーマ確認**:
- `sellers.supabase_user_id`: `String? @db.Uuid`（既に存在）
- `orders.sellerId`: `String`（`sellers.id`への外部キー）
- `stripe_payments.sellerId`: `String`（`sellers.id`への外部キー）

---

### 2. RLSポリシーの設計

**基本方針**:
- ユーザーは自分のデータのみアクセス可能
- 管理者はService role keyを使用して全データにアクセス可能
- APIサーバ経由で動作（フロントエンド直アクセスは当面想定しない）

**RLSポリシー設計**:

#### `sellers` テーブル
```sql
-- 読み取り: 自分のデータのみ
CREATE POLICY "Users can view own seller data"
  ON sellers FOR SELECT
  USING (auth.uid()::text = supabase_user_id::text);

-- 更新: 自分のデータのみ
CREATE POLICY "Users can update own seller data"
  ON sellers FOR UPDATE
  USING (auth.uid()::text = supabase_user_id::text);
```

#### `orders` テーブル
```sql
-- 読み取り: 自分のセラーの注文のみ
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = orders.seller_id
        AND sellers.supabase_user_id = auth.uid()::text
    )
  );

-- 作成: 自分のセラーの注文のみ
CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = orders.seller_id
        AND sellers.supabase_user_id = auth.uid()::text
    )
  );

-- 更新: 自分のセラーの注文のみ
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = orders.seller_id
        AND sellers.supabase_user_id = auth.uid()::text
    )
  );
```

#### `stripe_payments` テーブル
```sql
-- 読み取り: 自分のセラーの決済のみ
CREATE POLICY "Users can view own payments"
  ON stripe_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = stripe_payments.seller_id
        AND sellers.supabase_user_id = auth.uid()::text
    )
  );

-- 作成: 自分のセラーの決済のみ
CREATE POLICY "Users can create own payments"
  ON stripe_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = stripe_payments.seller_id
        AND sellers.supabase_user_id = auth.uid()::text
    )
  );
```

---

### 3. Supabase認証状態の確認

**確認項目**:
- [ ] Supabase Authが有効になっている
- [ ] `sellers`テーブルに`supabase_user_id`カラムが存在する
- [ ] 既存ユーザーの`supabase_user_id`が設定されている（Phase 1.5-1.6で移行済み）

**確認SQL**:
```sql
-- supabase_user_idの設定状況確認
SELECT 
  COUNT(*) as total_sellers,
  COUNT(supabase_user_id) as sellers_with_supabase_id,
  COUNT(*) FILTER (WHERE auth_provider = 'supabase') as supabase_auth_users,
  COUNT(*) FILTER (WHERE supabase_user_id IS NULL) as sellers_without_supabase_id
FROM sellers;
```

**期待値**:
- `sellers_with_supabase_id > 0`: Supabase Auth移行済みユーザーが存在
- `supabase_auth_users > 0`: Supabase Authを使用しているユーザーが存在

**重要**: 
- `supabase_user_id`がNULLのユーザーが存在しても問題ありません
- RLSポリシーは`supabase_user_id = auth.uid()`で判定するため、NULLのユーザーはRLSでブロックされます
- これは意図的な動作です（APIサーバ経由でService role keyを使用するため）
- 既存ユーザーは段階的に移行中（パスワードリセット時に移行）

---

### 4. Service Role Keyの確認

**確認項目**:
- [ ] Supabase Dashboard > Settings > API > Service role keyが取得可能
- [ ] 環境変数`SUPABASE_SERVICE_ROLE_KEY`が設定されている（管理者API用）

**用途**:
- 管理者API（`/api/admin/*`）で全データにアクセス
- RLSをバイパスしてデータベースに直接アクセス

**注意事項**:
- Service role keyは機密情報のため、環境変数で管理
- フロントエンドには公開しない（Next.js Route Handlerでのみ使用）

---

### 5. テストユーザーの準備

**準備するテストユーザー**:
- [ ] テストユーザーA: `supabase_user_id`が設定されている
- [ ] テストユーザーB: `supabase_user_id`が設定されている
- [ ] 管理者ユーザー: Service role keyでアクセス可能

**テストデータ**:
- ユーザーAの注文データ（`orders`テーブル）
- ユーザーBの注文データ（`orders`テーブル）
- 各ユーザーの決済データ（`stripe_payments`テーブル）

---

### 6. SQL Migrationファイルの準備

**作成するファイル**: `supabase/migrations/YYYYMMDDHHMMSS_enable_rls.sql`

**実装内容**:
1. RLS有効化
2. RLSポリシー作成（読み取り専用から開始）
3. 動作確認後、書き込みポリシーを追加

**段階的実装**:
- Step 1: 読み取り専用ポリシーのみ作成・動作確認
- Step 2: 書き込みポリシーを追加・動作確認
- Step 3: 全APIエンドポイントの動作確認

---

### 7. 動作確認の準備

**確認項目**:
- [ ] RLSが主要テーブルで有効になっている
- [ ] ユーザーAでログイン → 自分のデータのみ表示される
- [ ] ユーザーBでログイン → 自分のデータのみ表示される（ユーザーAのデータは表示されない）
- [ ] 管理者APIで全データにアクセス可能（Service role key使用）
- [ ] ブラウザの開発者ツールで、他人のデータ取得リクエストが403エラーになる

**確認SQL**:
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

---

## 共通の事前準備

### 1. 環境変数の整理

**検証環境（Staging）**:
```bash
# Helicone
HELICONE_API_KEY=<検証環境用>
NODE_ENV=staging

# Supabase（既存）
SUPABASE_URL=<既存>
SUPABASE_ANON_KEY=<既存>
SUPABASE_SERVICE_ROLE_KEY=<既存>  # RLS実装時に必要

# OpenAI（既存）
OPENAI_API_KEY=<既存>
```

**本番環境（Production）**:
```bash
# Helicone
HELICONE_API_KEY=<本番環境用>
NODE_ENV=production

# Supabase（既存）
SUPABASE_URL=<既存>
SUPABASE_ANON_KEY=<既存>
SUPABASE_SERVICE_ROLE_KEY=<既存>  # RLS実装時に必要

# OpenAI（既存）
OPENAI_API_KEY=<既存>
```

---

### 2. バックアップの準備

**RLS実装前のバックアップ**:
- [ ] Supabase Dashboard > Database > Backups でバックアップ作成
- [ ] または、`pg_dump`でデータベースをバックアップ

**バックアップコマンド**:
```bash
# Supabase CLIを使用する場合
supabase db dump -f backup_before_rls.sql
```

---

### 3. ロールバック計画の準備

**RLS実装のロールバック方法**:
```sql
-- RLSを無効化（緊急時）
ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments DISABLE ROW LEVEL SECURITY;

-- または、ポリシーを削除
DROP POLICY IF EXISTS "Users can view own seller data" ON sellers;
DROP POLICY IF EXISTS "Users can update own seller data" ON sellers;
-- ... 他のポリシーも同様に削除
```

---

## 実装時のチェックリスト

### Phase 3.1: Helicone導入

**実装前**:
- [ ] Heliconeアカウント作成完了
- [ ] `HELICONE_API_KEY`取得完了
- [ ] 環境変数設定完了（検証環境・本番環境）
- [ ] `lib/openai.ts`作成準備完了

**実装中**:
- [ ] `lib/openai.ts`作成
- [ ] `app/api/analyze-item/route.ts`更新
- [ ] `app/api/photo-frame/route.ts`更新
- [ ] 動作確認（検証環境）

**実装後**:
- [ ] HeliconeダッシュボードでAPI呼び出し確認
- [ ] コスト・レイテンシ・トークン数確認
- [ ] 環境別フィルタリング確認
- [ ] 本番環境デプロイ・動作確認

---

### Phase 1.7: RLS実装

**実装前**:
- [ ] Supabaseテーブル構造確認完了
- [ ] `supabase_user_id`設定状況確認完了
- [ ] Service role key確認完了
- [ ] テストユーザー準備完了
- [ ] バックアップ作成完了
- [ ] SQL Migrationファイル準備完了

**実装中**:
- [ ] RLS有効化（読み取り専用ポリシーのみ）
- [ ] 動作確認（ユーザーデータアクセステスト）
- [ ] 書き込みポリシー追加
- [ ] 全APIエンドポイント動作確認

**実装後**:
- [ ] RLS有効化確認（SQL）
- [ ] RLSポリシー確認（SQL）
- [ ] ユーザーデータアクセステスト完了
- [ ] 管理者API動作確認完了
- [ ] 本番環境適用・動作確認

---

## 📝 注意事項

### Helicone導入について

1. **環境変数の管理**
   - 検証環境・本番環境で異なるAPI Keyを使用
   - Heliconeダッシュボードで環境別に管理

2. **コスト監視**
   - HeliconeダッシュボードでLLM APIコストを可視化
   - 異常なコスト増加がないか定期的に確認

3. **パフォーマンス**
   - Helicone経由でもレイテンシは最小限（プロキシ経由のため）
   - 既存のAPI呼び出しに影響がないか確認

---

### RLS実装について

1. **段階的実装**
   - 読み取り専用ポリシーから開始
   - 動作確認後、書き込みポリシーを追加

2. **Service Role Key**
   - 管理者APIでのみ使用
   - フロントエンドには公開しない

3. **ロールバック準備**
   - RLS実装前にバックアップ作成
   - 緊急時はRLSを無効化可能

4. **テストの重要性**
   - ユーザーデータアクセステストを十分に実施
   - 他人のデータにアクセスできないことを確認

---

## 📋 RLS実装前のデータ移行について

### 検証環境（Staging）

**結論**: **追加のデータ移行は不要**

**理由**:
- ✅ Phase 1.3で検証環境のデータ移行は完了済み
- ✅ Phase 1.5-1.6でSupabase Auth移行は完了済み
- ✅ `supabase_user_id`カラムは既に存在
- ✅ 新規ユーザーはSupabase Authで作成され、`supabase_user_id`が設定される
- ✅ 既存ユーザーは段階的に移行中（パスワードリセット時に移行）

**注意事項**:
- `supabase_user_id`がNULLのユーザーが存在しても問題ありません
- RLSポリシーは`supabase_user_id = auth.uid()`で判定するため、NULLのユーザーはRLSでブロックされます
- これは意図的な動作です（APIサーバ経由でService role keyを使用するため）
- 既存ユーザーは段階的に移行中で、移行完了を待つ必要はありません

**確認が必要なこと**:
- [ ] `supabase_user_id`カラムが存在することを確認（Phase 1.5で追加済み）
- [ ] 新規ユーザーがSupabase Authで作成されていることを確認（Phase 1.5で実装済み）
- [ ] 既存ユーザーの移行状況を確認（Phase 1.6で実装済み）

---

### 本番環境（Production）

**結論**: **Phase 1.8（本番環境DB移行）を先に実施する必要がある**

**理由**:
- ⏳ Phase 1.8で本番環境DB移行が未完了
- ⏳ 本番環境はまだSupabaseに移行していない
- ⏳ RLS実装にはSupabase環境が必要

**実施順序**:
1. **Phase 1.8: 本番環境DB移行**（先に実施）
   - 本番環境Supabaseプロジェクト作成
   - 本番環境データ移行
   - `supabase_user_id`カラム追加（Phase 1.5のMigration実行）
   - Supabase Auth移行（Phase 1.5-1.6の実装適用）

2. **Phase 1.7: RLS実装**（その後実施）
   - RLS有効化・ポリシー作成
   - 動作確認・テスト

**注意事項**:
- 本番環境では、データ移行完了後にRLS実装を実施
- 検証環境でRLS実装を先に実施し、動作確認後に本番環境に適用することを推奨

---

## 🎯 次のステップ

### 検証環境でのRLS実装

1. **Phase 1.7: RLS実装**（検証環境）
   - SQL Migrationファイル作成
   - RLS有効化・ポリシー作成
   - 動作確認・テスト
   - **追加のデータ移行は不要**

### 本番環境でのRLS実装

1. **Phase 1.8: 本番環境DB移行**（先に実施）
   - 本番環境Supabaseプロジェクト作成
   - 本番環境データ移行
   - Supabase Auth移行

2. **Phase 1.7: RLS実装**（その後実施）
   - 検証環境で動作確認済みのRLSポリシーを本番環境に適用

---

**作成日**: 2026-01-03  
**次回更新**: Phase 3.1またはPhase 1.7実装開始時

