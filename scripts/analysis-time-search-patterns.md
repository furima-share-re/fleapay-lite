# ソースコード内の時間検索パターン分析

## 📋 概要

ソースコード内のSQLクエリで使用されている時間検索のパターンを分析しました。

---

## 🔍 検索パターンの分類

### 1. **jstDayBounds()を使用したパターン** ✅ 推奨

**使用箇所:**
- `app/api/seller/summary/route.ts`
- `app/api/seller/analytics/route.ts`
- `app/api/admin/dashboard/route.ts`
- `app/api/admin/stripe/summary/route.ts`

**実装方法:**
```typescript
const { todayStart, tomorrowStart, yesterdayStart } = jstDayBounds();

// SQLクエリ内で使用
WHERE o.created_at >= ${todayStart}
  AND o.created_at < ${tomorrowStart}
```

**特徴:**
- ✅ JST（日本標準時）の日付境界を正確に計算
- ✅ UTCのDateオブジェクトを返すため、データベースのUTC保存と一致
- ✅ 一貫性が保たれている

**jstDayBounds()の実装:**
```typescript
// lib/utils.ts
export function jstDayBounds() {
  const nowUtc = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC+9
  const nowJstMs = nowUtc.getTime() + jstOffset;
  const nowJst = new Date(nowJstMs);
  
  // JST基準で今日の0:00を求める
  const todayJst = new Date(nowJst);
  todayJst.setUTCHours(0, 0, 0, 0);
  
  // UTC基準の日付境界に戻す
  const todayStart = new Date(todayJst.getTime() - jstOffset);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  
  return { todayStart, tomorrowStart, yesterdayStart };
}
```

---

### 2. **相対日付検索（NOW() - INTERVAL）** ⚠️ 注意が必要

**使用箇所:**
- `app/api/seller/summary/route.ts` (複数箇所)

**実装例:**
```sql
WHERE o.created_at >= NOW() - INTERVAL '30 days'
WHERE o.created_at >= NOW() - INTERVAL '90 days'
```

**問題点:**
- ⚠️ `NOW()`はデータベースの現在時刻を使用
- ⚠️ データベースのタイムゾーン設定に依存する可能性がある
- ⚠️ JSTの日付境界と一致しない可能性がある

**該当箇所:**
```typescript
// app/api/seller/summary/route.ts:295-296
COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::bigint as within_30days,
COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '90 days' THEN 1 END)::bigint as within_90days

// app/api/seller/summary/route.ts:387
AND o.created_at >= NOW() - INTERVAL '90 days'

// app/api/seller/summary/route.ts:422
AND o.created_at >= NOW() - INTERVAL '90 days'

// app/api/seller/summary/route.ts:458
AND o.created_at >= NOW() - INTERVAL '30 days'
```

---

### 3. **手動計算パターン** ✅ 問題なし

**使用箇所:**
- `app/api/seller/analytics/route.ts`

**実装例:**
```typescript
// 日毎の集計
const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

// 週毎の集計
const weekStart = new Date(thisMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
```

**特徴:**
- ✅ `jstDayBounds()`の結果を基準に計算しているため、JSTと一致
- ✅ UTCのDateオブジェクトを使用しているため、データベースと一致

---

## 📊 パターン別使用状況

| パターン | ファイル数 | 使用箇所数 | 状態 |
|---------|----------|----------|------|
| jstDayBounds() | 4 | 10+ | ✅ 推奨 |
| NOW() - INTERVAL | 1 | 5 | ⚠️ 要確認 |
| 手動計算 | 1 | 2 | ✅ 問題なし |

---

## ⚠️ 潜在的な問題

### 1. `NOW() - INTERVAL`の使用

**問題:**
- データベースのタイムゾーン設定に依存
- JSTの日付境界と一致しない可能性がある

**例:**
```sql
-- データベースがUTCで動作している場合
-- 日本時間の12/27 00:00 = UTC 12/26 15:00
-- しかし、NOW() - INTERVAL '30 days'はUTC基準で計算される
-- そのため、JSTの日付境界とずれる可能性がある
```

**推奨修正:**
```typescript
// 修正前
WHERE o.created_at >= NOW() - INTERVAL '30 days'

// 修正後
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
// または jstDayBounds()を基準に計算
WHERE o.created_at >= ${thirtyDaysAgo}
```

---

## ✅ 推奨事項

### 1. 統一的な時間検索パターンの使用

**推奨パターン:**
```typescript
// 1. jstDayBounds()を使用（今日、昨日、明日）
const { todayStart, tomorrowStart, yesterdayStart } = jstDayBounds();

// 2. 過去N日間の検索
const nDaysAgo = new Date(todayStart.getTime() - n * 24 * 60 * 60 * 1000);

// 3. 特定の日付範囲
const startDate = new Date('2025-12-26T15:00:00Z'); // UTC時刻を指定
const endDate = new Date('2025-12-27T15:00:00Z');
```

### 2. `NOW() - INTERVAL`の置き換え

以下の箇所を修正することを推奨します：

1. `app/api/seller/summary/route.ts:295-296` - 統計情報の30日/90日カウント
2. `app/api/seller/summary/route.ts:387` - 最近の取引（90日）
3. `app/api/seller/summary/route.ts:422` - 最近の取引（90日）
4. `app/api/seller/summary/route.ts:458` - スコア計算（30日）

---

## 📝 まとめ

### 現在の状態
- ✅ 大部分のコードは`jstDayBounds()`を使用しており、JSTとUTCの変換が正しく行われている
- ⚠️ 一部のコードで`NOW() - INTERVAL`を使用しており、タイムゾーンの一貫性に注意が必要

### データベースのタイムスタンプ
- ✅ すべて`timestamptz`型を使用
- ✅ PostgreSQLは内部でUTCとして保存
- ✅ クエリ時はUTCのDateオブジェクトを使用する必要がある

### 12/27の売上検証SQLについて
- ✅ 作成したSQLクエリ（`scripts/quick-check-sales-2024-12-27.sql`）は正しい
- ✅ UTCの時刻範囲（2025-12-26 15:00:00 〜 2025-12-27 15:00:00）を使用
- ✅ これは日本時間の2025-12-27 00:00:00 〜 2025-12-28 00:00:00に相当


