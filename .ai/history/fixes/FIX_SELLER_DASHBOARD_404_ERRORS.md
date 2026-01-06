# Fix: 出店者ダッシュボード404エラー修正

**作成日**: 2026-01-03  
**問題**: 出店者ダッシュボード（`seller-dashboard.html`）で複数のAPIエンドポイントが404エラーを返している  
**状態**: ✅ **修正完了**

---

## ❌ 発生した問題

### 問題の症状

出店者ダッシュボード（`/seller-dashboard.html`）で以下のAPIエンドポイントが404エラーを返していました：

1. `/api/seller/analytics?...` - グラフデータの読み込みエラー
2. `/api/benchmark/data` - ベンチマークデータの読み込みエラー（2回）
3. `/api/seller/analytics?...` - ベンチマークグラフの読み込みエラー

**エラーメッセージ**:
- "グラフデータの読み込みエラー: Error: データの取得に失敗しました"
- "企画データの読み込みエラー: Error: 企画データの取得に失敗しました"
- "ベンチマークデータの読み込みエラー: Error: ベンチマークデータの取得に失敗しました"
- "ベンチマークグラフの読み込みエラー: Error: データの取得に失敗しました"

### 原因

Phase 2.6でExpress.jsを削除した際、以下のAPIエンドポイントがNext.js Route Handlerとして実装されていませんでした：

1. `/api/seller/analytics` - 売上分析データ（日毎・週毎）
2. `/api/benchmark/data` - ベンチマークCSVデータ

これらのエンドポイントは`payments.js`（Express.js）に実装されていましたが、Express.js削除時にNext.js Route Handlerに移行されていませんでした。

---

## ✅ 修正内容

### 1. `/api/seller/analytics` Route Handlerの実装

**ファイル**: `app/api/seller/analytics/route.ts`

**機能**:
- 日毎の売上分析データ取得（`period=daily`）
- 週毎の売上分析データ取得（`period=weekly`）
- ベンチマークデータのオプショナル取得（CSVファイルから）

**実装内容**:
- `getDailyAnalytics()`関数: 過去N日分の売上データを集計
- `getWeeklyAnalytics()`関数: 過去N週分の売上データを集計
- Prismaを使用したSQLクエリ（`$queryRaw`）
- JST基準の日付計算（`jstDayBounds()`を使用）

**パラメータ**:
- `s` (sellerId): 出店者ID（必須）
- `period`: `daily` または `weekly`（デフォルト: `daily`）
- `days`: 取得日数（最大90日、デフォルト: 30）

**レスポンス形式**:
```json
{
  "ok": true,
  "period": "daily",
  "days": 30,
  "data": [
    {
      "date": "2026-01-01",
      "grossSales": 10000,
      "netSales": 9500,
      "totalCost": 5000,
      "profit": 4500,
      "transactionCount": 5
    }
  ],
  "benchmark": [...] // オプショナル
}
```

### 2. `/api/benchmark/data` Route Handlerの実装

**ファイル**: `app/api/benchmark/data/route.ts`

**機能**:
- ベンチマークCSVファイル（`data/benchmark.csv`）を読み込んでJSON形式で返す

**実装内容**:
- CSVファイルの読み込み（`fs.readFileSync`）
- CSVパース（引用符内のカンマを考慮）
- 数値フィールドの自動変換（`week`, `base`, `improvement`）

**レスポンス形式**:
```json
{
  "ok": true,
  "data": [
    {
      "week": 1,
      "month": "1月",
      "period": "1月1週",
      "base": 150,
      "improvement": 165,
      "rank": "A",
      "plan": "正月Lucky Pack（高単価）"
    }
  ],
  "count": 50
}
```

---

## 📋 変更されたファイル

- `app/api/seller/analytics/route.ts` - **新規作成**
- `app/api/benchmark/data/route.ts` - **新規作成**

---

## ✅ 確認事項

- [x] `/api/seller/analytics` Route Handlerを実装
- [x] `/api/benchmark/data` Route Handlerを実装
- [x] Prismaを使用したSQLクエリの実装
- [x] JST基準の日付計算の実装
- [x] CSVファイルの読み込み処理の実装
- [x] Linterエラー確認（✅ エラーなし）

---

## 🚀 次のステップ

### 1. 再デプロイ

修正をコミット・プッシュ後、Renderで自動再デプロイが実行されます。

### 2. UI確認

再デプロイ後、以下のURLで出店者ダッシュボードが正常に動作するか確認してください：

```
https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-pro
```

**確認ポイント**:
- ✅ グラフデータが正常に読み込まれる
- ✅ ベンチマークデータが正常に読み込まれる
- ✅ 企画データが正常に表示される
- ✅ 404エラーが発生しない

---

## 📝 技術的な詳細

### SQLクエリの実装

Prismaの`$queryRaw`を使用して、以下のクエリを実行しています：

```sql
SELECT
  COUNT(*)::bigint AS transaction_count,
  COALESCE(SUM(
    CASE 
      WHEN om.is_cash = true THEN o.amount
      WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_gross
      ELSE 0
    END
  ), 0)::bigint AS gross_sales,
  COALESCE(SUM(
    CASE 
      WHEN om.is_cash = true THEN o.amount
      WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net
      ELSE 0
    END
  ), 0)::bigint AS net_sales,
  COALESCE(SUM(o.cost_amount), 0)::bigint AS total_cost
FROM orders o
LEFT JOIN order_metadata om ON om.order_id = o.id
LEFT JOIN stripe_payments sp ON sp.order_id = o.id
WHERE o.seller_id = ${sellerId}
  AND o.created_at >= ${dayStart}
  AND o.created_at < ${dayEnd}
  AND o.deleted_at IS NULL
  AND (
    om.is_cash = true
    OR sp.status = 'succeeded'
  )
```

### セキュリティ

Prismaの`$queryRaw`は、テンプレートリテラル内の`${variable}`を自動的にパラメータ化クエリに変換するため、SQLインジェクション攻撃を防ぎます。

---

**更新日**: 2026-01-03  
**実装者**: AI Assistant



