# 検証環境のテストユーザープラン確認

**更新日**: 2026-01-02

---

## 🔍 確認方法

### 1. Supabase SQL Editorで確認

Supabase Dashboard → SQL Editorで以下を実行：

```sql
-- seller_subscriptionsテーブルが存在するか確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'seller_subscriptions'
) AS table_exists;
```

**期待される結果**: `table_exists = true`

---

### 2. テストユーザーのプラン状態を確認

```sql
-- すべてのseller_subscriptionsレコードを確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at,
  created_at
FROM seller_subscriptions
ORDER BY created_at DESC;
```

**期待される結果**: テストユーザー（`seller-test-1`、`seller_demo`など）のレコードが存在し、`plan_type = 'pro'`または`'kids'`、`status = 'active'`であること

---

### 3. 特定のテストユーザーのプラン状態を確認

```sql
-- seller-test-1のプラン状態を確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at
FROM seller_subscriptions
WHERE seller_id = 'seller-test-1'
  AND status = 'active'
  AND (ended_at IS NULL OR ended_at > now())
ORDER BY started_at DESC
LIMIT 1;
```

**期待される結果**: 
- `plan_type = 'pro'`または`'kids'`
- `status = 'active'`
- `ended_at IS NULL`または`ended_at > now()`

---

### 4. seller_demoのプラン状態を確認

```sql
-- seller_demoのプラン状態を確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at
FROM seller_subscriptions
WHERE seller_id = 'seller_demo'
  AND status = 'active'
  AND (ended_at IS NULL OR ended_at > now())
ORDER BY started_at DESC
LIMIT 1;
```

---

## 📋 テストユーザー一覧

検証環境で使用されている可能性のあるテストユーザーID：

1. **`seller-test-1`** - ドキュメントで確認
2. **`seller_demo`** - デフォルト値として使用（`seller-purchase-standard.html`、`seller-purchase.html`）

---

## 🔧 プロプランに設定する方法

### テーブルが存在しない場合

まず、テーブルを作成：

```sql
-- seller_subscriptionsテーブル作成
CREATE TABLE IF NOT EXISTS seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null,
  plan_type text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint seller_subscriptions_plan_type_check
    check (plan_type in ('standard', 'pro', 'kids')),
  constraint seller_subscriptions_status_check
    check (status in ('active', 'inactive', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS seller_subscriptions_seller_idx
  ON seller_subscriptions(seller_id);

CREATE INDEX IF NOT EXISTS seller_subscriptions_status_idx
  ON seller_subscriptions(status);

CREATE INDEX IF NOT EXISTS seller_subscriptions_seller_status_idx
  ON seller_subscriptions(seller_id, status);
```

### テストユーザーにプロプランを設定

```sql
-- seller-test-1にプロプランを設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('seller-test-1', 'pro', 'active', now())
ON CONFLICT DO NOTHING;

-- seller_demoにプロプランを設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('seller_demo', 'pro', 'active', now())
ON CONFLICT DO NOTHING;
```

**注意**: `ON CONFLICT DO NOTHING`は、主キーまたはユニーク制約がある場合にのみ動作します。`seller_subscriptions`テーブルには`seller_id`にユニーク制約がないため、複数のレコードが挿入される可能性があります。その場合は、既存のレコードを更新するか、最新のレコードのみを使用するようにしてください。

---

## ✅ 動作確認

### 1. APIで確認

```bash
# seller-test-1のプラン状態を確認
curl "https://fleapay-lite-t1.onrender.com/api/seller/summary?s=seller-test-1"
```

**期待される応答**:
```json
{
  "sellerId": "seller-test-1",
  "planType": "pro",
  "isSubscribed": true,
  ...
}
```

### 2. フロントエンドで確認

1. `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=seller-test-1`にアクセス
2. アクセスが許可されることを確認（プロプランの場合）
3. ブラウザの開発者ツール（F12）→ Consoleで`summary`データを確認

---

## 📝 まとめ

現在の状態を確認するには：

1. **Supabase SQL Editor**で上記のSQLクエリを実行
2. **テーブルが存在しない場合**: テーブルを作成
3. **データが存在しない場合**: テストユーザーにプロプランを設定
4. **APIで確認**: `/api/seller/summary?s=seller-test-1`を呼び出し

