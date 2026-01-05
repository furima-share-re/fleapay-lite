# 取引一覧SQL変更履歴

## 対象ファイル
`app/api/seller/summary/route.ts` (取引履歴取得API)

## 現在のSQL条件（2026年1月4日時点）

### メインクエリ（hasDeletedAt = true の場合）

**行380-389:**
```sql
WHERE o.seller_id = ${sellerId}
  AND o.deleted_at IS NULL
  AND (
    om.is_cash = true
    OR sp.status = 'succeeded'
    OR (sp.id IS NOT NULL AND sp.status IS NOT NULL)  -- 移行データ対応
  )
  AND o.created_at >= NOW() - INTERVAL '90 days'  -- 30日から90日に拡張
ORDER BY o.created_at DESC
```

### メインクエリ（hasDeletedAt = false の場合）

**行416-424:**
```sql
WHERE o.seller_id = ${sellerId}
  AND (
    om.is_cash = true
    OR sp.status = 'succeeded'
    OR (sp.id IS NOT NULL AND sp.status IS NOT NULL)  -- 移行データ対応
  )
  AND o.created_at >= NOW() - INTERVAL '90 days'  -- 30日から90日に拡張
ORDER BY o.created_at DESC
```

### フォールバッククエリ（旧DB対応）

**行456-460:**
```sql
WHERE o.seller_id = ${sellerId}
  AND sp.status = 'succeeded'
  AND o.created_at >= NOW() - INTERVAL '30 days'
ORDER BY o.created_at DESC
```

## 問題点

### 1. 決済方法のフィルタリングが厳しすぎる

現在の条件:
- `om.is_cash = true` - 現金決済のみ
- `OR sp.status = 'succeeded'` - Stripe成功決済のみ
- `OR (sp.id IS NOT NULL AND sp.status IS NOT NULL)` - 移行データ対応

**問題**: `pending`ステータスの取引（決済待ち）が除外されています。

### 2. 日付範囲

- メインクエリ: **90日間**（以前は30日間）
- フォールバッククエリ: **30日間**

## 推奨される修正

`pending`ステータスの取引も表示するように、条件を緩和する必要があります：

```sql
WHERE o.seller_id = ${sellerId}
  AND o.deleted_at IS NULL
  AND (
    om.is_cash = true
    OR sp.status = 'succeeded'
    OR sp.id IS NOT NULL  -- Stripe決済があれば表示（ステータス問わず）
    OR o.status = 'pending'  -- 決済待ちも表示
  )
  AND o.created_at >= NOW() - INTERVAL '90 days'
ORDER BY o.created_at DESC
```

または、全ての取引を表示する：

```sql
WHERE o.seller_id = ${sellerId}
  AND o.deleted_at IS NULL
  AND o.created_at >= NOW() - INTERVAL '90 days'
ORDER BY o.created_at DESC
```

## Git履歴（過去30日間）

以下のコミットで変更がありました：

- `545737a` (2026-01-04) - db
- `726fed5` (2026-01-04) - db
- `23b88d4` (2026-01-04) - db
- `03f2f51` (2026-01-04) - db
- `7583eb6` (2026-01-04) - db
- `de29105` (2026-01-04) - db
- `e3abe39` (2026-01-04) - db
- `9c3594b` (2026-01-03) - F3.1
- `f85e84e` (2026-01-03) - F3.1
- `32c0476` (2026-01-03) - F3.1
- `4402392` (2026-01-03) - F3.1
- `5c72987` (2026-01-03) - F2.4
- `7fcd011` (2026-01-03) - F2.3
- `3cb5a63` (2026-01-03) - F2.3
- `ba30ac6` (2026-01-02) - F2.2
- `a00e014` (2026-01-02) - F2.2

## 確認方法

特定のコミットの変更内容を確認するには：

```powershell
git show <commit-hash>:app/api/seller/summary/route.ts | Select-String -Pattern "INTERVAL|WHERE"
```

変更の差分を確認するには：

```powershell
git diff <old-commit> <new-commit> -- app/api/seller/summary/route.ts
```

