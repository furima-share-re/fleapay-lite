# ユーザーID確認ガイド

**更新日**: 2026-01-02

---

## 🔍 現在の状態

スクリーンショットから確認：
- **URL**: `fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-1`
- **コンソール**: `init sellerId=test-seller-1`
- **APIレスポンス**: `"sellerId":"test-seller-1", "planType":"standard", "isSubscribed": false`

**問題**: `test-seller-1`でアクセスしているが、`planType: "standard"`になっている

---

## 📋 確認すべきユーザーID

### 1. 実際にアクセスしているユーザーID

**URLパラメータから取得**:
- `?s=test-seller-1` → `sellerId = "test-seller-1"`

**デフォルト値**:
- URLパラメータがない場合 → `sellerId = "seller_demo"`（`seller-purchase-standard.html`の905-906行目）

---

### 2. データベースに設定すべきユーザーID

**確認方法**: Supabase SQL Editorで以下を実行

```sql
-- seller_subscriptionsテーブルのすべてのレコードを確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at
FROM seller_subscriptions
ORDER BY created_at DESC;
```

**期待される結果**:
- `test-seller-1`のレコードが存在し、`plan_type = 'pro'`または`'kids'`、`status = 'active'`であること

---

## 🔧 解決方法

### ステップ1: 現在のデータを確認

Supabase SQL Editorで以下を実行：

```sql
-- test-seller-1のプラン状態を確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at
FROM seller_subscriptions
WHERE seller_id = 'test-seller-1'
ORDER BY started_at DESC;
```

**結果の解釈**:
- **レコードが存在しない場合**: データを挿入する必要がある
- **レコードが存在するが`plan_type = 'standard'`の場合**: 更新する必要がある
- **レコードが存在し、`plan_type = 'pro'`または`'kids'`の場合**: 問題なし（他の原因を調査）

---

### ステップ2: test-seller-1にプロプランを設定

**データが存在しない場合**:

```sql
-- test-seller-1にプロプランを設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-1', 'pro', 'active', now());
```

**データが存在するが`plan_type = 'standard'`の場合**:

```sql
-- 既存のレコードを更新
UPDATE seller_subscriptions
SET plan_type = 'pro',
    status = 'active',
    started_at = now(),
    ended_at = NULL,
    updated_at = now()
WHERE seller_id = 'test-seller-1'
  AND status = 'active';
```

**または、新しいレコードを追加（履歴として残す）**:

```sql
-- 既存のレコードを非アクティブにする
UPDATE seller_subscriptions
SET status = 'inactive',
    ended_at = now(),
    updated_at = now()
WHERE seller_id = 'test-seller-1'
  AND status = 'active';

-- 新しいプロプランのレコードを追加
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-1', 'pro', 'active', now());
```

---

### ステップ3: seller_demoにもプロプランを設定（オプション）

URLパラメータがない場合のデフォルト値として使用されるため：

```sql
-- seller_demoにプロプランを設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('seller_demo', 'pro', 'active', now())
ON CONFLICT DO NOTHING;
```

**注意**: `seller_subscriptions`テーブルには`seller_id`にユニーク制約がないため、`ON CONFLICT DO NOTHING`は動作しません。既存のレコードがある場合は、上記のUPDATE文を使用してください。

---

## ✅ 動作確認

### 1. データベースで確認

```sql
-- test-seller-1のプラン状態を確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at
FROM seller_subscriptions
WHERE seller_id = 'test-seller-1'
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

### 2. APIで確認

```bash
curl "https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-1"
```

**期待される応答**:
```json
{
  "sellerId": "test-seller-1",
  "planType": "pro",
  "isSubscribed": true,
  ...
}
```

---

### 3. ブラウザで確認

1. `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-1`にアクセス
2. アクセスが許可されることを確認
3. ブラウザの開発者ツール（F12）→ Consoleで`summary`データを確認
   - `planType: "pro"`または`"kids"`が表示されることを確認
   - `isSubscribed: true`が表示されることを確認

---

## 📝 よくある問題

### 問題1: ユーザーIDの大文字小文字の違い

**確認**:
- URLパラメータ: `?s=test-seller-1`（小文字）
- データベース: `test-seller-1`（小文字）

**解決**: データベースの`seller_id`は`text`型なので、大文字小文字を区別します。URLパラメータと完全に一致させる必要があります。

---

### 問題2: 複数のレコードが存在する場合

**確認**:
```sql
-- test-seller-1のすべてのレコードを確認
SELECT 
  id,
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at
FROM seller_subscriptions
WHERE seller_id = 'test-seller-1'
ORDER BY started_at DESC;
```

**解決**: `payments.js`のクエリは`ORDER BY started_at DESC LIMIT 1`を使用しているため、最新のレコードが使用されます。最新のレコードが`plan_type = 'pro'`または`'kids'`、`status = 'active'`であることを確認してください。

---

### 問題3: レコードが存在するが`ended_at`が過去の日付になっている

**確認**:
```sql
-- ended_atが過去の日付になっているレコードを確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at,
  CASE 
    WHEN ended_at IS NULL THEN 'NULL'
    WHEN ended_at > now() THEN '未来'
    ELSE '過去'
  END AS ended_at_status
FROM seller_subscriptions
WHERE seller_id = 'test-seller-1';
```

**解決**: `payments.js`のクエリは`(ended_at IS NULL OR ended_at > now())`を条件としているため、`ended_at`が過去の日付のレコードは使用されません。`ended_at = NULL`に更新するか、新しいレコードを追加してください。

---

## 🎯 推奨される対応

### 1. 現在のデータを確認

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

### 2. test-seller-1にプロプランを設定

```sql
-- 既存のレコードを非アクティブにする（存在する場合）
UPDATE seller_subscriptions
SET status = 'inactive',
    ended_at = now(),
    updated_at = now()
WHERE seller_id = 'test-seller-1'
  AND status = 'active';

-- 新しいプロプランのレコードを追加
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-1', 'pro', 'active', now());
```

### 3. 動作確認

- APIを呼び出して`planType: "pro"`が返されることを確認
- ブラウザでアクセスが許可されることを確認

