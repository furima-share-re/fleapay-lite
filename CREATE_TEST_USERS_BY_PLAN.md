# プラン別テストユーザー作成ガイド

**更新日**: 2026-01-02  
**環境**: 検証環境（Staging）

---

## 📋 テストユーザー一覧

### 1. Standardプラン
- **ユーザーID**: `test-seller-standard`
- **プラン**: `standard`
- **期待される動作**: `seller-purchase-standard.html`にアクセスできない（標準プランのため）

### 2. Proプラン
- **ユーザーID**: `test-seller-pro`
- **プラン**: `pro`
- **期待される動作**: `seller-purchase-standard.html`にアクセスできる

### 3. Kidsプラン
- **ユーザーID**: `test-seller-kids`
- **プラン**: `kids`
- **期待される動作**: `seller-purchase-standard.html`にアクセスできる

---

## 🔧 Supabase SQL Editorで実行

### ステップ1: テストユーザーをsellersテーブルに作成（存在しない場合）

```sql
-- Standardプランのテストユーザー
INSERT INTO sellers (id, display_name, shop_name, email, created_at, updated_at)
VALUES ('test-seller-standard', 'Test Seller (Standard)', 'Standard Shop', 'standard@test.example.com', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Proプランのテストユーザー
INSERT INTO sellers (id, display_name, shop_name, email, created_at, updated_at)
VALUES ('test-seller-pro', 'Test Seller (Pro)', 'Pro Shop', 'pro@test.example.com', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Kidsプランのテストユーザー
INSERT INTO sellers (id, display_name, shop_name, email, created_at, updated_at)
VALUES ('test-seller-kids', 'Test Seller (Kids)', 'Kids Shop', 'kids@test.example.com', now(), now())
ON CONFLICT (id) DO NOTHING;
```

---

### ステップ2: プラン別にseller_subscriptionsテーブルにデータを挿入

```sql
-- Standardプランのテストユーザー
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-standard', 'standard', 'active', now());

-- Proプランのテストユーザー
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-pro', 'pro', 'active', now());

-- Kidsプランのテストユーザー
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-kids', 'kids', 'active', now());
```

---

### ステップ3: データ確認

```sql
-- すべてのテストユーザーのプラン状態を確認
SELECT 
  ss.seller_id,
  s.display_name,
  ss.plan_type,
  ss.status,
  ss.started_at,
  ss.ended_at
FROM seller_subscriptions ss
LEFT JOIN sellers s ON s.id = ss.seller_id
WHERE ss.seller_id IN ('test-seller-standard', 'test-seller-pro', 'test-seller-kids')
  AND ss.status = 'active'
  AND (ss.ended_at IS NULL OR ss.ended_at > now())
ORDER BY ss.seller_id, ss.started_at DESC;
```

---

## ✅ 動作確認URLリスト

### 検証環境ベースURL
```
https://fleapay-lite-t1.onrender.com
```

---

### 1. Standardプランテストユーザー

#### APIエンドポイント
- **売上サマリー**: `https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-standard`
  - **期待される応答**: `planType: "standard"`, `isSubscribed: false`

#### フロントエンド
- **セラーダッシュボード**: `https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-standard`
  - **期待される動作**: ダッシュボードが表示される（QRコードも表示される）

- **レジ画面（標準プラン）**: `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-standard`
  - **期待される動作**: 「このレジ画面はご利用いただけません」と表示される（標準プランのためアクセス拒否）

---

### 2. Proプランテストユーザー

#### APIエンドポイント
- **売上サマリー**: `https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-pro`
  - **期待される応答**: `planType: "pro"`, `isSubscribed: true`

#### フロントエンド
- **セラーダッシュボード**: `https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-pro`
  - **期待される動作**: ダッシュボードが表示される（QRコードも表示される）

- **レジ画面（標準プラン）**: `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-pro`
  - **期待される動作**: レジ画面が表示される（プロプランのためアクセス許可）

---

### 3. Kidsプランテストユーザー

#### APIエンドポイント
- **売上サマリー**: `https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-kids`
  - **期待される応答**: `planType: "kids"`, `isSubscribed: true`

#### フロントエンド
- **セラーダッシュボード**: `https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-kids`
  - **期待される動作**: ダッシュボードが表示される（QRコードも表示される）

- **レジ画面（標準プラン）**: `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-kids`
  - **期待される動作**: レジ画面が表示される（キッズプランのためアクセス許可）

---

## 📊 動作確認チェックリスト

### Standardプラン (`test-seller-standard`)

- [ ] `/api/seller/summary?s=test-seller-standard` → `planType: "standard"`, `isSubscribed: false`
- [ ] `/seller-dashboard.html?s=test-seller-standard` → ダッシュボードが表示される
- [ ] `/seller-purchase-standard.html?s=test-seller-standard` → アクセス拒否メッセージが表示される

### Proプラン (`test-seller-pro`)

- [ ] `/api/seller/summary?s=test-seller-pro` → `planType: "pro"`, `isSubscribed: true`
- [ ] `/seller-dashboard.html?s=test-seller-pro` → ダッシュボードが表示される
- [ ] `/seller-purchase-standard.html?s=test-seller-pro` → レジ画面が表示される

### Kidsプラン (`test-seller-kids`)

- [ ] `/api/seller/summary?s=test-seller-kids` → `planType: "kids"`, `isSubscribed: true`
- [ ] `/seller-dashboard.html?s=test-seller-kids` → ダッシュボードが表示される
- [ ] `/seller-purchase-standard.html?s=test-seller-kids` → レジ画面が表示される

---

## 🔍 トラブルシューティング

### 問題1: レコードが存在しない

**確認**:
```sql
SELECT * FROM sellers WHERE id IN ('test-seller-standard', 'test-seller-pro', 'test-seller-kids');
SELECT * FROM seller_subscriptions WHERE seller_id IN ('test-seller-standard', 'test-seller-pro', 'test-seller-kids');
```

**解決**: 上記のINSERT文を実行

---

### 問題2: プランが正しく反映されない

**確認**:
```sql
-- 最新のアクティブなプランを確認
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
WHERE seller_id IN ('test-seller-standard', 'test-seller-pro', 'test-seller-kids')
ORDER BY seller_id, started_at DESC;
```

**解決**: `ended_at`が過去の日付になっている場合は、`ended_at = NULL`に更新するか、新しいレコードを追加

---

### 問題3: 複数のレコードが存在する場合

**確認**:
```sql
-- 各ユーザーのすべてのレコードを確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at
FROM seller_subscriptions
WHERE seller_id IN ('test-seller-standard', 'test-seller-pro', 'test-seller-kids')
ORDER BY seller_id, started_at DESC;
```

**解決**: `payments.js`のクエリは`ORDER BY started_at DESC LIMIT 1`を使用しているため、最新のレコードが使用されます。最新のレコードが正しいプランであることを確認してください。

---

## 📝 まとめ

1. **テストユーザーを作成**: `sellers`テーブルに3つのユーザーを追加
2. **プランを設定**: `seller_subscriptions`テーブルに各ユーザーのプランを設定
3. **動作確認**: 上記のURLリストで各プランの動作を確認

これで、プラン別の動作確認が可能になります。

