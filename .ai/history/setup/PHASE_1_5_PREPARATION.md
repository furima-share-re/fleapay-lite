# Phase 1.5: Supabase Auth移行（新規ユーザーのみ）準備

**フェーズ**: Phase 1.5  
**期間**: Week 3 Day 1-3  
**変更範囲**: 認証機能（新規ユーザーのみ）  
**状態**: ⏳ **準備中**

---

## 📋 実装内容

### 1. Supabase Authクライアントの実装

**目的**: 新規ユーザー登録と認証をSupabase Authに移行

**実装ファイル**:
- `lib/supabase.ts` (新規作成)
- `package.json` (@supabase/supabase-js追加)

**実装内容**:
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role key用（管理者API用）
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

---

### 2. 新規ユーザー登録APIの変更

**対象エンドポイント**: `/api/seller/start_onboarding`

**変更内容**:
- 新規ユーザー登録をSupabase Authに変更
- Supabase Authにユーザーを作成
- `sellers`テーブルに`supabase_user_id`を保存
- `auth_provider`を`'supabase'`に設定

**実装例**:
```typescript
// 新規ユーザー登録（Supabase Auth）
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
});

if (authError) {
  return res.status(400).json({ error: authError.message });
}

// sellersテーブルに保存
await prisma.seller.create({
  data: {
    id: publicId,
    email,
    displayName,
    supabaseUserId: authData.user!.id,
    authProvider: 'supabase',
    // ... 他のフィールド
  }
});
```

---

### 3. 認証ロジックの共存

**既存ユーザー**: bcryptjs継続  
**新規ユーザー**: Supabase Auth

**実装方針**:
- `auth_provider`カラムで認証方法を判定
- 既存ユーザーは`auth_provider = 'bcryptjs'`
- 新規ユーザーは`auth_provider = 'supabase'`

**認証ロジック**:
```typescript
// lib/auth.ts
export async function authenticateUser(email: string, password: string) {
  const user = await prisma.seller.findUnique({ where: { email } });
  
  if (!user) return null;
  
  if (user.authProvider === 'supabase') {
    // Supabase Authで認証
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return data.user ? user : null;
  } else if (user.authProvider === 'bcryptjs') {
    // bcryptjsで認証（既存ユーザー）
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }
  
  return null;
}
```

---

## 🔧 データベーススキーマ変更

### sellersテーブルにカラム追加

```sql
-- Supabase Dashboard > SQL Editor
ALTER TABLE sellers 
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'bcryptjs',
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

-- インデックス追加
CREATE INDEX IF NOT EXISTS sellers_supabase_user_id_idx 
  ON sellers(supabase_user_id);
```

### Prismaスキーマの更新

```prisma
// prisma/schema.prisma
model Seller {
  id                String   @id
  email             String
  passwordHash      String?  @map("password_hash")
  authProvider      String   @default("bcryptjs") @map("auth_provider")
  supabaseUserId    String?  @db.Uuid @map("supabase_user_id")
  // ... 他のフィールド
  
  @@map("sellers")
}
```

**更新後**:
```bash
npx prisma generate
```

---

## 📦 依存関係の追加

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

---

## ✅ 実装チェックリスト

### 準備フェーズ

- [ ] Supabase Authの設定確認
  - [ ] Supabase DashboardでAuthが有効
  - [ ] メール認証の設定確認
  - [ ] パスワードポリシーの確認

- [ ] データベーススキーマ変更
  - [ ] `auth_provider`カラム追加
  - [ ] `supabase_user_id`カラム追加
  - [ ] インデックス追加

- [ ] Prismaスキーマ更新
  - [ ] `auth_provider`フィールド追加
  - [ ] `supabaseUserId`フィールド追加
  - [ ] `npx prisma generate`実行

### 実装フェーズ

- [ ] Supabase Authクライアント実装
  - [ ] `lib/supabase.ts`作成
  - [ ] 環境変数設定確認

- [ ] 新規ユーザー登録API変更
  - [ ] `/api/seller/start_onboarding`をSupabase Authに変更
  - [ ] `supabase_user_id`を保存
  - [ ] `auth_provider`を`'supabase'`に設定

- [ ] 認証ロジック実装
  - [ ] `auth_provider`に基づく認証方法の切り替え
  - [ ] Supabase Auth認証実装
  - [ ] bcryptjs認証継続（既存ユーザー）

### 動作確認フェーズ

- [ ] 新規ユーザー登録（Supabase Auth）
  - [ ] 新規ユーザーが登録できる
  - [ ] Supabase Authにユーザーが作成される
  - [ ] `sellers`テーブルに`supabase_user_id`が保存される

- [ ] 新規ユーザー認証（Supabase Auth）
  - [ ] 新規ユーザーがログインできる
  - [ ] Supabase Authセッションが作成される

- [ ] 既存ユーザー認証（bcryptjs）
  - [ ] 既存ユーザーがログインできる
  - [ ] bcryptjsハッシュで認証できる

- [ ] 画面での動作確認
  - [ ] 新規ユーザー登録画面から登録ができる
  - [ ] 登録後、正常にログインできる
  - [ ] 既存ユーザーがログインできる
  - [ ] ログイン後、ダッシュボードが正常に表示される

---

## 🔍 確認SQL

### 新規ユーザー登録確認

```sql
-- 新規ユーザー（Supabase Auth）の確認
SELECT 
  id,
  email,
  auth_provider,
  supabase_user_id,
  created_at
FROM sellers
WHERE auth_provider = 'supabase'
ORDER BY created_at DESC
LIMIT 10;
```

### 認証方法の分布確認

```sql
-- 認証方法の分布
SELECT 
  auth_provider,
  COUNT(*) as count
FROM sellers
GROUP BY auth_provider;
```

---

## 📚 関連ドキュメント

- `.ai/history/migrations/MIGRATION_EXECUTION_PLAN.md` - Phase 1.5詳細
- `PRODUCTION_MIGRATION_PREPARATION.md` - 本番環境移行準備

---

**準備完了日**: 2026-01-02  
**実装開始予定**: Phase 1.5開始時

