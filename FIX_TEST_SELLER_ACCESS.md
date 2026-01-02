# テストユーザーアクセス問題の修正

**更新日**: 2026-01-02  
**問題**: `test-seller-1`が`planType: "standard"`のため、`seller-purchase-standard.html`にアクセスできない

---

## 🔍 現在の状態

コンソールの出力から確認：
```json
{
  "sellerId": "test-seller-1",
  "planType": "standard",
  "isSubscribed": false,
  ...
}
```

**原因**: `seller_subscriptions`テーブルに`test-seller-1`のプロプランデータが存在しない

---

## 🔧 解決方法

### ステップ1: Supabase SQL Editorでテーブル作成

Supabase Dashboard → SQL Editorで以下を実行：

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

-- インデックス作成
CREATE INDEX IF NOT EXISTS seller_subscriptions_seller_idx
  ON seller_subscriptions(seller_id);

CREATE INDEX IF NOT EXISTS seller_subscriptions_status_idx
  ON seller_subscriptions(status);

CREATE INDEX IF NOT EXISTS seller_subscriptions_seller_status_idx
  ON seller_subscriptions(seller_id, status);
```

---

### ステップ2: test-seller-1にプロプランを設定

```sql
-- test-seller-1にプロプランを設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-1', 'pro', 'active', now());
```

---

### ステップ3: 動作確認

1. **APIで確認**:
   ```bash
   curl "https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-1"
   ```

   期待される応答:
   ```json
   {
     "sellerId": "test-seller-1",
     "planType": "pro",
     "isSubscribed": true,
     ...
   }
   ```

2. **ブラウザで確認**:
   - `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-1`にアクセス
   - アクセスが許可されることを確認

---

## 📝 注意事項

- **サーバー再起動不要**: `payments.js`は`pool.query`を直接使用しているため、データベースの変更だけで動作します
- **即座に反映**: テーブル作成・データ挿入後、すぐにAPIを呼び出して確認できます

---

## ✅ 完了後の確認

1. Supabase Table Editorで`seller_subscriptions`テーブルを確認
2. `test-seller-1`のレコードが存在し、`plan_type = 'pro'`、`status = 'active'`であることを確認
3. APIを呼び出して`planType: "pro"`、`isSubscribed: true`が返されることを確認
4. ブラウザで`seller-purchase-standard.html`にアクセスできることを確認

