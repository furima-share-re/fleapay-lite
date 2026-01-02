# データ駆動型アクセス制御への移行

**更新日**: 2026-01-02

---

## 📋 概要

ソースコードでの環境判定（ホスト名による判定）を削除し、データベースのデータに基づいてアクセス制御を行うように変更しました。

---

## 🔄 変更内容

### 1. `seller_subscriptions`テーブルの作成

**ファイル**: `supabase_schema.sql`, `create_seller_subscriptions_table.sql`

**テーブル構造**:
```sql
CREATE TABLE IF NOT EXISTS seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null,
  plan_type text not null,  -- 'standard', 'pro', 'kids'
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active',  -- 'active', 'inactive', 'cancelled'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**インデックス**:
- `seller_id`
- `status`
- `(seller_id, status)`

---

### 2. Prismaスキーマの更新

**ファイル**: `prisma/schema.prisma`

**追加されたモデル**:
```prisma
model SellerSubscription {
  id        String    @id @default(uuid()) @db.Uuid
  sellerId  String    @map("seller_id")
  planType  String    @map("plan_type")
  startedAt DateTime  @default(now()) @map("started_at") @db.Timestamptz(6)
  endedAt   DateTime? @map("ended_at") @db.Timestamptz(6)
  status    String    @default("active")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  seller Seller @relation(fields: [sellerId], references: [id])

  @@index([sellerId], name: "seller_subscriptions_seller_idx")
  @@index([status], name: "seller_subscriptions_status_idx")
  @@index([sellerId, status], name: "seller_subscriptions_seller_status_idx")
  @@map("seller_subscriptions")
}
```

---

### 3. ソースコードから環境判定を削除

**ファイル**: `public/seller-purchase-standard.html`

**変更前**:
```javascript
// 環境判定によるアクセス許可
if (location.hostname === "localhost" ||
    location.hostname.includes("127.0.0.1") ||
    location.hostname.includes("render.com") ||
    location.hostname.includes("onrender.com")) {
  // テスト環境ではアクセス許可
  return true;
}
```

**変更後**:
```javascript
// データベースのデータに基づいて判定
if (data.isSubscribed === false || data.planType === "standard" || !data.planType){
  showBlocked("このレジ画面は、対象のプランご契約中の出店者さま専用です。運営までお問合せください。");
  return false;
}
```

---

## 📝 次のステップ

### 1. Supabaseでテーブルを作成

Supabase DashboardのSQL Editorで以下を実行：

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

### 2. テスト用データの挿入

既存の`seller_id`に対して、テスト用のサブスクリプションデータを挿入：

```sql
-- 例: seller_id = 'test-seller-1' に対してプロプランを設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-1', 'pro', 'active', now())
ON CONFLICT DO NOTHING;
```

### 3. Prismaクライアントの再生成

Render環境で自動的に`prisma generate`が実行されます（`package.json`の`postinstall`スクリプト）。

---

## ✅ 動作確認

1. **テーブル作成の確認**:
   - Supabase Dashboard → Table Editor → `seller_subscriptions`テーブルが存在することを確認

2. **データ挿入の確認**:
   - テスト用の`seller_id`に対してサブスクリプションデータが挿入されていることを確認

3. **API動作の確認**:
   - `/api/seller/summary?s=test-seller-1`を呼び出し
   - `planType: "pro"`または`"kids"`が返されることを確認
   - `isSubscribed: true`が返されることを確認

4. **アクセス制御の確認**:
   - `seller-purchase-standard.html?s=test-seller-1`にアクセス
   - プロ/キッズプランの場合、アクセスが許可されることを確認
   - `planType: "standard"`の場合、アクセスが拒否されることを確認

---

## 🔍 注意事項

- **本番環境**: データベースに正しいプランデータを設定する必要があります
- **テスト環境**: テスト用の`seller_id`に対してプロ/キッズプランを設定してください
- **環境判定の削除**: すべての環境でデータベースのデータに基づいて判定されます

