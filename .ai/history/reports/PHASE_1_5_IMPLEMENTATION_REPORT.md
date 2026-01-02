# Phase 1.5: Supabase Auth移行（新規ユーザーのみ）実装レポート

**実装日**: 2026-01-02  
**フェーズ**: Phase 1.5 - Supabase Auth移行（新規ユーザーのみ）  
**状態**: ✅ **実装完了**（動作確認待ち）

---

## 📋 実装完了項目

### 1. データベーススキーマ変更

**ファイル**: `supabase/migrations/20260102_add_auth_provider_columns.sql`

**変更内容**:
- `sellers`テーブルに`auth_provider`カラム追加（デフォルト: `'bcryptjs'`）
- `sellers`テーブルに`supabase_user_id`カラム追加（UUID型）
- `supabase_user_id`にインデックス追加
- 既存ユーザーを`auth_provider = 'bcryptjs'`に設定

---

### 2. Prismaスキーマ更新

**ファイル**: `prisma/schema.prisma`

**変更内容**:
- `Seller`モデルに`authProvider`フィールド追加（`@default("bcryptjs")`）
- `Seller`モデルに`supabaseUserId`フィールド追加（`@db.Uuid`）
- `supabaseUserId`にインデックス追加

---

### 3. Supabase Authクライアント実装

**ファイル**: `lib/supabase.ts`（新規作成）

**実装内容**:
- 通常のSupabaseクライアント（Anon key使用）
- Service role key用クライアント（管理者API用、RLSバイパス）
- 環境変数の検証

---

### 4. 依存関係追加

**ファイル**: `package.json`

**追加内容**:
- `@supabase/supabase-js`: `^2.39.0`

---

### 5. 新規ユーザー登録API変更

**ファイル**: `server.js`

**変更内容**:
- `/api/seller/start_onboarding`をSupabase Authに変更
- Supabase Authにユーザーを作成
- `sellers`テーブルに`supabase_user_id`を保存
- `auth_provider`を`'supabase'`に設定
- 既存のbcryptjsハッシュ化処理を削除（新規ユーザーはSupabase Authを使用）

**変更前**:
```javascript
// bcryptjsでパスワードをハッシュ化
const passwordHash = await bcrypt.hash(password, 10);
await pool.query(
  `insert into sellers (id, display_name, stripe_account_id, email, password_hash)
   values ($1,$2,$3,$4,$5)`,
  [normalizedId, displayName, account.id, email, passwordHash]
);
```

**変更後**:
```javascript
// Supabase Authにユーザーを作成
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      seller_id: normalizedId,
      display_name: displayName
    }
  }
});

// sellersテーブルに保存（auth_providerとsupabase_user_idを含む）
await pool.query(
  `insert into sellers (id, display_name, stripe_account_id, email, auth_provider, supabase_user_id)
   values ($1,$2,$3,$4,$5,$6)`,
  [normalizedId, displayName, account.id, email, 'supabase', supabaseUserId]
);
```

---

## 🔧 実装されたファイル

### 新規作成

1. `supabase/migrations/20260102_add_auth_provider_columns.sql` - データベーススキーマ変更SQL
2. `lib/supabase.ts` - Supabase Authクライアント

### 変更

1. `prisma/schema.prisma` - Prismaスキーマ更新
2. `package.json` - 依存関係追加
3. `server.js` - 新規ユーザー登録API変更

---

## ⚠️ 注意事項

### 1. 既存ユーザー認証

- **既存ユーザーはbcryptjsで継続認証**（Phase 1.6で移行予定）
- 新規ユーザーのみSupabase Authを使用
- `auth_provider`カラムで認証方法を判定

### 2. 認証ロジックの共存

- Phase 1.5では新規ユーザー登録のみ実装
- ログイン認証ロジックはPhase 1.6で実装予定
- 現在のアプリケーションは認証が不要な設計のため、Phase 1.6で認証ロジックを追加

### 3. データベースマイグレーション

- `supabase/migrations/20260102_add_auth_provider_columns.sql`をSupabase Dashboard > SQL Editorで実行する必要があります
- 実行後、`npx prisma generate`を実行してPrisma Clientを再生成

---

## 📝 次のステップ

### 1. データベースマイグレーション実行

Supabase Dashboard > SQL Editorで以下を実行：

```sql
-- supabase/migrations/20260102_add_auth_provider_columns.sql の内容を実行
```

### 2. Prisma Client再生成

```bash
npx prisma generate
```

### 3. 依存関係インストール

```bash
npm install
```

### 4. 動作確認

- 新規ユーザー登録（Supabase Auth）
- Supabase Authにユーザーが作成されることを確認
- `sellers`テーブルに`supabase_user_id`が保存されることを確認

---

## ✅ 実装チェックリスト

- [x] データベーススキーマ変更SQL作成
- [x] Prismaスキーマ更新
- [x] Supabase Authクライアント実装
- [x] 依存関係追加
- [x] 新規ユーザー登録API変更
- [ ] データベースマイグレーション実行（Supabase Dashboard）
- [ ] Prisma Client再生成
- [ ] 依存関係インストール
- [ ] 動作確認（新規ユーザー登録・認証）

---

## 📚 関連ドキュメント

- `.ai/history/setup/PHASE_1_5_PREPARATION.md` - Phase 1.5準備ドキュメント
- `.ai/history/migrations/MIGRATION_EXECUTION_PLAN.md` - Phase 1.5詳細
- `supabase/migrations/20260102_add_auth_provider_columns.sql` - データベースマイグレーションSQL

---

**レポート作成日**: 2026-01-02  
**実装実施者**: AI Assistant

