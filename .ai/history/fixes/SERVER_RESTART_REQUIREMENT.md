# サーバー再起動の必要性

**更新日**: 2026-01-02

---

## 🔍 変更内容の確認

### 1. データベースの変更
- ✅ `seller_subscriptions`テーブルの作成（Supabase SQL Editorで実行）
- ✅ テストユーザーへのプロプラン設定（データ挿入）

### 2. コードの変更
- ✅ `prisma/schema.prisma`に`SellerSubscription`モデルを追加（既にコミット済み）
- ✅ `public/seller-purchase-standard.html`から環境判定を削除（既にコミット済み）

---

## 📋 サーバー再起動の必要性

### ✅ **再起動不要**（データベースの変更のみ）

**理由**:
- `payments.js`の`/api/seller/summary`エンドポイントは`pool.query`を直接使用している
- Prisma Clientを使用していないため、Prisma Clientの再生成は不要
- データベースの変更（テーブル作成、データ挿入）は即座に反映される

**動作確認**:
```bash
# テーブル作成・データ挿入後、すぐにAPIを呼び出して確認
curl "https://fleapay-lite-t1.onrender.com/api/seller/summary?s=seller-test-1"
```

---

### ⚠️ **再起動が必要な場合**（Prisma Clientを使用している場合）

もし、将来的にPrisma Clientを使用するコードを追加した場合：

1. **Prismaスキーマの変更**（`prisma/schema.prisma`に`SellerSubscription`を追加）
2. **Prisma Clientの再生成**が必要

**再生成方法**:
- **自動**: 新しいデプロイ時に`postinstall`スクリプトで自動実行
- **手動**: Render環境のShellから実行
  ```bash
  npx prisma generate
  ```

---

## 🎯 推奨される対応

### ケース1: データベースの変更のみ（テーブル作成・データ挿入）

**再起動不要** ✅

1. Supabase SQL Editorでテーブルを作成
2. テストユーザーにプロプランを設定
3. すぐにAPIを呼び出して確認

```sql
-- テーブル作成
CREATE TABLE IF NOT EXISTS seller_subscriptions (...);

-- データ挿入
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('seller-test-1', 'pro', 'active', now());
```

**確認**:
```bash
curl "https://fleapay-lite-t1.onrender.com/api/seller/summary?s=seller-test-1"
```

---

### ケース2: Prisma Clientを使用するコードを追加した場合

**再起動が必要** ⚠️

1. `prisma/schema.prisma`を更新
2. コードをコミット・プッシュ
3. Render環境で自動再デプロイ（`postinstall`で`prisma generate`が実行される）
4. または、Render環境のShellから手動で`npx prisma generate`を実行

---

## 📝 現在の状況

### ✅ 現在の実装

`payments.js`の`/api/seller/summary`エンドポイント：
```javascript
// pool.queryを直接使用（Prisma Clientを使用していない）
const subRes = await pool.query(
  `SELECT plan_type, started_at, ended_at, status
   FROM seller_subscriptions
   WHERE seller_id = $1
     AND status = 'active'
     AND (ended_at IS NULL OR ended_at > now())
   ORDER BY started_at DESC
   LIMIT 1`,
  [sellerId]
);
```

**結論**: Prisma Clientを使用していないため、**データベースの変更だけで動作する** ✅

---

## ✅ 動作確認手順

### 1. Supabase SQL Editorでテーブル作成・データ挿入

```sql
-- テーブル作成
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

-- インデックス作成
CREATE INDEX IF NOT EXISTS seller_subscriptions_seller_idx
  ON seller_subscriptions(seller_id);

CREATE INDEX IF NOT EXISTS seller_subscriptions_status_idx
  ON seller_subscriptions(status);

CREATE INDEX IF NOT EXISTS seller_subscriptions_seller_status_idx
  ON seller_subscriptions(seller_id, status);

-- テストユーザーにプロプランを設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('seller-test-1', 'pro', 'active', now());

INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('seller_demo', 'pro', 'active', now());
```

### 2. すぐにAPIを呼び出して確認（再起動不要）

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

---

## 📝 まとめ

### ✅ **再起動不要**

**理由**:
- `payments.js`は`pool.query`を直接使用している
- Prisma Clientを使用していない
- データベースの変更は即座に反映される

**対応**:
1. Supabase SQL Editorでテーブル作成・データ挿入
2. すぐにAPIを呼び出して確認
3. 再起動は不要

---

### ⚠️ **将来的にPrisma Clientを使用する場合**

**再起動が必要**:
- `prisma/schema.prisma`を更新
- コードをコミット・プッシュ
- Render環境で自動再デプロイ（`postinstall`で`prisma generate`が実行される）

