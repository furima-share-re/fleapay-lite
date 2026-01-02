# seller_subscriptionsテーブル不存在エラーの修正

**更新日**: 2026-01-02

---

## 🔴 問題

`/api/seller/summary` APIが500エラーを返している

**原因**:
- `payments.js`の`/api/seller/summary`エンドポイントが`seller_subscriptions`テーブルにアクセスしようとしている
- しかし、`seller_subscriptions`テーブルがSupabaseに存在しない
- そのため、SQLエラーが発生し、APIが500エラーを返している

---

## 🔍 確認結果

### 1. テーブル定義の確認

**存在しないテーブル**:
- ❌ `seller_subscriptions` - `supabase_schema.sql`に定義がない
- ❌ `seller_subscriptions` - `prisma/schema.prisma`にモデルがない
- ❌ `seller_subscriptions` - `server.js`の`initDb()`に作成処理がない

**存在するテーブル**:
- ✅ `sellers`
- ✅ `orders`
- ✅ `stripe_payments`
- ✅ `order_items`
- ✅ `images`
- ✅ `qr_sessions`
- ✅ `buyer_attributes`
- ✅ `order_metadata`
- ✅ `kids_achievements`

### 2. APIコードの確認

`payments.js`の`/api/seller/summary`エンドポイント（285-556行目）で：

```javascript
const subRes = await pool.query(
  `
  SELECT plan_type, started_at, ended_at, status
    FROM seller_subscriptions
   WHERE seller_id = $1
     AND status = 'active'
     AND (ended_at IS NULL OR ended_at > now())
   ORDER BY started_at DESC
   LIMIT 1
  `,
  [sellerId]
);
```

このクエリが実行されると、テーブルが存在しないためエラーが発生します。

---

## 🎯 解決策

### オプション1: テーブルが存在しない場合のエラーハンドリング（推奨）

APIを修正して、テーブルが存在しない場合でもエラーにならないようにする。

**修正方法**:
- `seller_subscriptions`テーブルへのクエリを`try-catch`で囲む
- テーブルが存在しない場合は、デフォルト値（`planType = "standard"`）を返す

### オプション2: テーブルを作成する

`seller_subscriptions`テーブルを作成する。

**テーブル定義**:
```sql
CREATE TABLE IF NOT EXISTS seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null,
  plan_type text not null default 'standard',
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS seller_subscriptions_seller_idx
  ON seller_subscriptions(seller_id);

CREATE INDEX IF NOT EXISTS seller_subscriptions_status_idx
  ON seller_subscriptions(status);
```

---

## 🔧 推奨修正（オプション1）

APIを修正して、テーブルが存在しない場合でもエラーにならないようにする。

**修正箇所**: `payments.js`の`/api/seller/summary`エンドポイント

**修正内容**:
1. `seller_subscriptions`テーブルへのクエリを`try-catch`で囲む
2. エラーが発生した場合は、デフォルト値（`planType = "standard"`）を返す

---

## 📋 チェックリスト

### 問題の特定
- [x] `/api/seller/summary` APIが500エラーを返している
- [x] `seller_subscriptions`テーブルが存在しない
- [x] APIコードでテーブルにアクセスしようとしている

### 修正方法の選択
- [ ] オプション1: エラーハンドリングを追加（推奨）
- [ ] オプション2: テーブルを作成する

### 修正の実施
- [ ] APIコードを修正
- [ ] 動作確認

---

## 🎯 次のステップ

1. **APIコードを修正**（オプション1を推奨）
   - `seller_subscriptions`テーブルへのクエリを`try-catch`で囲む
   - エラーが発生した場合は、デフォルト値を返す

2. **動作確認**
   - `/api/seller/summary` APIが正常に動作することを確認
   - QRコードが表示されることを確認

---

## 🔗 関連ドキュメント

- [FIX_QR_CODE_DISPLAY.md](./FIX_QR_CODE_DISPLAY.md) - QRコード表示問題の修正
- [RENDER_VERIFICATION_REPORT.md](./RENDER_VERIFICATION_REPORT.md) - Render環境動作確認レポート

