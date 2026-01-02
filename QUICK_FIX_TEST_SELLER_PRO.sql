-- ============================================
-- test-seller-pro プラン修正SQL（クイック修正版）
-- ============================================

-- ステップ1: 既存のレコードを確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at
FROM seller_subscriptions
WHERE seller_id = 'test-seller-pro'
ORDER BY started_at DESC;

-- ステップ2: 既存のアクティブなレコードを無効化（存在する場合）
UPDATE seller_subscriptions
SET ended_at = now() - interval '1 second',
    status = 'inactive',
    updated_at = now()
WHERE seller_id = 'test-seller-pro'
  AND status = 'active'
  AND (ended_at IS NULL OR ended_at > now());

-- ステップ3: 新しいproプランのレコードを作成
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES ('test-seller-pro', 'pro', 'active', now())
ON CONFLICT DO NOTHING;

-- ステップ4: 修正後の確認
SELECT 
  seller_id,
  plan_type,
  status,
  started_at,
  ended_at,
  CASE 
    WHEN ended_at IS NULL THEN '有効'
    WHEN ended_at > now() THEN '有効'
    ELSE '無効'
  END AS status_check
FROM seller_subscriptions
WHERE seller_id = 'test-seller-pro'
ORDER BY started_at DESC;

