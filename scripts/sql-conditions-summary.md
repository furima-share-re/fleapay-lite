# SQL条件変更チェック結果

## 対象ファイル
`scripts/quick-check-sales-2024-12-27.sql`

## 現在のSQL条件（2025年1月2日時点）

### クエリ1: 12/27の総売上チェック

**WHERE条件:**
```sql
WHERE o.created_at >= '2025-12-26 15:00:00+00'::timestamptz  -- UTC: 前日15時 = 日本時間: 当日00時
    AND o.created_at < '2025-12-27 15:00:00+00'::timestamptz  -- UTC: 当日15時 = 日本時間: 翌日00時
    AND o.deleted_at IS NULL
    AND (
        om.is_cash = true
        OR sp.status = 'succeeded'
    )
```

**主要な条件:**
- `deleted_at IS NULL` - 削除されていない注文のみ
- `created_at` 範囲: 2025-12-26 15:00 UTC ～ 2025-12-27 15:00 UTC（日本時間12/27の1日分）
- `is_cash = true` OR `stripe_payments.status = 'succeeded'` - 現金決済またはStripe成功決済のみ

### クエリ2: 12月の全取引データ（明細付き）

**WHERE条件:**
```sql
WHERE o.deleted_at IS NULL
    -- 日本時間で2025年12月のデータを取得
    AND o.created_at >= '2025-11-30 15:00:00+00'::timestamptz  -- UTC: 11/30 15時 = JST: 12/1 00時
    AND o.created_at < '2025-12-31 15:00:00+00'::timestamptz   -- UTC: 12/31 15時 = JST: 1/1 00時
```

**主要な条件:**
- `deleted_at IS NULL` - 削除されていない注文のみ
- `created_at` 範囲: 2025-11-30 15:00 UTC ～ 2025-12-31 15:00 UTC（日本時間12月の1ヶ月分）
- **注意**: クエリ2では決済方法のフィルタリングが削除されています（全ての取引を取得）

## 過去5日以内の変更履歴

このセッション（2025年1月2日）で以下の変更を行いました:

1. **クエリ2の条件変更**:
   - 変更前: `om.is_cash = true OR sp.status = 'succeeded'` の条件があった
   - 変更後: 条件を削除し、全ての取引データを取得するように変更

2. **payment_method表示の改善**:
   - `pending`ステータスの場合は「未決済」と表示するように追加

3. **重複行の解消**:
   - `DISTINCT ON`を使用して重複を防止

## 確認方法

過去5日以内の変更を確認するには、以下のコマンドを実行してください:

```powershell
git log --since="5 days ago" --format="%h %ad %s" --date=short --all -- "scripts/quick-check-sales-2024-12-27.sql"
```

詳細な変更内容を確認するには:

```powershell
git log --since="5 days ago" -p --all -- "scripts/quick-check-sales-2024-12-27.sql"
```

