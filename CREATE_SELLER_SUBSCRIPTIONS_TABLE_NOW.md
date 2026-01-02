# seller_subscriptionsテーブル作成（緊急対応）

**更新日**: 2026-01-02  
**問題**: `seller_subscriptions table not found or error: relation "seller_subscriptions" does not exist`

---

## 🔴 現在の状態

Renderログから確認：
```
seller_subscriptions table not found or error: relation "seller_subscriptions" does not exist
```

**原因**: Supabaseで`seller_subscriptions`テーブルがまだ作成されていない

---

## 🔧 解決方法

### ステップ1: Supabase SQL Editorでテーブル作成

1. **Supabase Dashboardにアクセス**:
   - https://app.supabase.com/project/mluvjdhqgfpcfsmvjae/sql/new

2. **以下のSQLを実行**:

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

3. **実行結果を確認**:
   - "Success. No rows returned" と表示されれば成功

---

### ステップ2: テストユーザーにプロプランを設定

同じSQL Editorで以下を実行：

```sql
-- test-seller-1にプロプランを設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-1', 'pro', 'active', now());

-- seller_demoにもプロプランを設定（オプション）
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('seller_demo', 'pro', 'active', now());
```

---

### ステップ3: テーブル作成の確認

Supabase Table Editorで確認：
1. https://app.supabase.com/project/mluvjdhqgfpcfsmvjae/editor
2. `seller_subscriptions`テーブルが表示されることを確認
3. `test-seller-1`のレコードが存在し、`plan_type = 'pro'`、`status = 'active'`であることを確認

---

### ステップ4: 動作確認

**サーバー再起動不要** - データベースの変更だけで動作します

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

3. **Renderログで確認**:
   - Render Dashboard → Logs タブ
   - `seller_subscriptions table not found`エラーが表示されなくなることを確認

---

## 📝 注意事項

- **サーバー再起動不要**: `payments.js`は`pool.query`を直接使用しているため、データベースの変更だけで動作します
- **即座に反映**: テーブル作成・データ挿入後、すぐにAPIを呼び出して確認できます
- **エラーログ**: テーブルが存在しない間は、警告ログが表示されますが、APIは正常に動作します（デフォルト値`planType: "standard"`を返します）

---

## ✅ 完了後の確認

1. ✅ Supabase Table Editorで`seller_subscriptions`テーブルが存在する
2. ✅ `test-seller-1`のレコードが存在し、`plan_type = 'pro'`、`status = 'active'`
3. ✅ APIを呼び出して`planType: "pro"`、`isSubscribed: true`が返される
4. ✅ ブラウザで`seller-purchase-standard.html`にアクセスできる
5. ✅ Renderログで`seller_subscriptions table not found`エラーが表示されない

