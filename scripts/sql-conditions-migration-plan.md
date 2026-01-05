# SQL条件の共通化移行計画

## 目的

SQL条件の整合性を保つため、共通関数への移行を段階的に実施します。

## 現在の状況

以下のファイルで同じSQL条件が重複しています：

1. `app/api/seller/summary/route.ts`
   - kpiToday（今日の売上KPI）
   - kpiTotal（累計売上KPI）
   - recentRes（取引履歴）

2. `app/api/seller/analytics/route.ts`
   - getDailyAnalytics（日毎の集計）
   - getWeeklyAnalytics（週毎の集計）

## 移行手順

### ステップ1: 共通関数の作成 ✅ 完了

`lib/sql-conditions.ts` に以下の関数を作成：
- `buildOrderFilterConditions()` - 基本的な条件
- `buildOrderFilterConditionsWithDateRange()` - 日付範囲付き
- `buildOrderFilterConditionsWithRelativeDate()` - 相対日付範囲付き
- `salesAmountCase` - 売上金額計算用CASE文

### ステップ2: 既存コードの移行（推奨）

以下の順序で移行することを推奨します：

#### 優先度1: 新規コード
- 新しいAPIエンドポイントや機能では、必ず共通関数を使用する

#### 優先度2: 修正が必要なコード
- バグ修正や機能追加の際に、ついでに共通関数に移行する

#### 優先度3: リファクタリング
- 定期的なリファクタリングの際に、まとめて移行する

### ステップ3: 使用例

#### 移行前

```typescript
const result = await prisma.$queryRaw`
  SELECT COUNT(*) as count
  FROM orders o
  LEFT JOIN order_metadata om ON om.order_id = o.id
  LEFT JOIN stripe_payments sp ON sp.order_id = o.id
  WHERE o.seller_id = ${sellerId}
    AND o.deleted_at IS NULL
    AND (
      om.is_cash = true
      OR sp.status = 'succeeded'
      OR sp.id IS NULL
    )
`;
```

#### 移行後

```typescript
import { buildOrderFilterConditions, checkTableExistence } from '@/lib/sql-conditions';

const { deletedAt } = await checkTableExistence(prisma);
const whereCondition = buildOrderFilterConditions(sellerId, deletedAt);

const result = await prisma.$queryRaw`
  SELECT COUNT(*) as count
  FROM orders o
  LEFT JOIN order_metadata om ON om.order_id = o.id
  LEFT JOIN stripe_payments sp ON sp.order_id = o.id
  ${whereCondition}
`;
```

## メリット

1. **整合性の保証**: 条件を変更する際は1箇所の修正で済む
2. **保守性の向上**: 条件の変更履歴を追跡しやすい
3. **バグの防止**: 条件の不整合によるバグを防げる
4. **テストの容易さ**: 共通関数のテストを作成すれば、全ての使用箇所をカバーできる

## 注意事項

1. **段階的移行**: 一度に全てを移行せず、段階的に実施する
2. **テスト**: 移行後は必ず動作確認を行う
3. **ドキュメント**: 共通関数の使用方法をドキュメント化する

## チェックリスト

- [x] 共通関数の作成
- [x] ドキュメントの作成
- [ ] 既存コードの移行（段階的に実施）
- [ ] テストの作成
- [ ] コードレビュー

