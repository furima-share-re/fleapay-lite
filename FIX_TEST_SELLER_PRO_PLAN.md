# test-seller-pro プラン修正ガイド

**問題**: `test-seller-pro`でアクセスしているのに、`planType: "standard"`、`isSubscribed: false`になっている

**原因**: Supabaseの`seller_subscriptions`テーブルに`test-seller-pro`のレコードが存在しないか、`plan_type`が`"standard"`になっている

---

## 🔍 ステップ1: 現在の状態を確認

Supabase SQL Editorで以下を実行：

```sql
-- test-seller-proの現在のプラン状態を確認
SELECT 
  ss.seller_id,
  ss.plan_type,
  ss.status,
  ss.started_at,
  ss.ended_at,
  CASE 
    WHEN ss.ended_at IS NULL THEN 'NULL（有効）'
    WHEN ss.ended_at > now() THEN '未来（有効）'
    ELSE '過去（無効）'
  END AS ended_at_status
FROM seller_subscriptions ss
WHERE ss.seller_id = 'test-seller-pro'
ORDER BY ss.started_at DESC;
```

**期待される結果**:
- レコードが存在しない → 空の結果
- レコードが存在するが`plan_type = 'standard'` → `plan_type`が`standard`と表示される

---

## 🔧 ステップ2: 修正方法

### パターンA: レコードが存在しない場合

```sql
-- test-seller-proをproプランに設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-pro', 'pro', 'active', now());
```

### パターンB: レコードが存在するが`plan_type = 'standard'`の場合

```sql
-- 既存のレコードを無効化（ended_atを過去に設定）
UPDATE seller_subscriptions
SET ended_at = now() - interval '1 second',
    status = 'inactive'
WHERE seller_id = 'test-seller-pro'
  AND status = 'active';

-- 新しいproプランのレコードを作成
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-pro', 'pro', 'active', now());
```

### パターンC: 既存のレコードを直接更新する場合

```sql
-- 既存のレコードのplan_typeをproに更新
UPDATE seller_subscriptions
SET plan_type = 'pro',
    status = 'active',
    ended_at = NULL,
    updated_at = now()
WHERE seller_id = 'test-seller-pro'
  AND status = 'active';
```

---

## ✅ ステップ3: 修正後の確認

```sql
-- 修正後の状態を確認
SELECT 
  ss.seller_id,
  ss.plan_type,
  ss.status,
  ss.started_at,
  ss.ended_at
FROM seller_subscriptions ss
WHERE ss.seller_id = 'test-seller-pro'
  AND ss.status = 'active'
  AND (ss.ended_at IS NULL OR ss.ended_at > now())
ORDER BY ss.started_at DESC
LIMIT 1;
```

**期待される結果**:
```
seller_id          | plan_type | status | started_at          | ended_at
-------------------+-----------+--------+---------------------+----------
test-seller-pro    | pro       | active | 2026-01-02 14:30:00 | NULL
```

---

## 🧪 ステップ4: 動作確認

1. **API確認**:
   ```
   https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-pro
   ```
   
   **期待される応答**:
   ```json
   {
     "sellerId": "test-seller-pro",
     "planType": "pro",
     "isSubscribed": true,
     ...
   }
   ```

2. **レジ画面確認**:
   ```
   https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-pro
   ```
   
   **期待される動作**: レジ画面が表示される（アクセス拒否されない）

---

## 📝 まとめ

1. **確認**: `test-seller-pro`の現在のプラン状態を確認
2. **修正**: 上記のパターンA、B、またはCのいずれかで修正
3. **確認**: 修正後の状態を確認
4. **動作確認**: APIとレジ画面で動作確認

これで`test-seller-pro`が正しく`pro`プランとして認識され、レジ画面にアクセスできるようになります。

