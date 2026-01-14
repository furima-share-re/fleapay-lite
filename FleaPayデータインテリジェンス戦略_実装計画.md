# FleaPayデータインテリジェンス戦略 実装計画

**作成日**: 2025年1月  
**企画書**: FleaPay統合企画書：現金無料×データインテリジェンス戦略

---

## 📊 現状確認

### ✅ 既に実装済み

1. **現金決済無料**
   - `order_metadata.is_cash = true` の場合、手数料0として処理
   - 実装箇所: `app/api/seller/summary/route.ts`, `payments.js`
   - 状態: ✅ 完全実装済み

2. **QR決済手数料（10-12%）**
   - マスタから手数料率を取得する仕組み実装済み
   - `fee_rate_master` テーブル、`getFeeRateFromMaster()` 関数
   - 実装箇所: `app/api/checkout/session/route.ts`, `lib/utils.ts`
   - 状態: ✅ 実装済み（手数料率の設定が必要）

3. **決済データ記録**
   - `orders`, `stripe_payments`, `order_metadata` テーブル
   - 決済方法、金額、時刻などの基本データは記録済み
   - 状態: ✅ 基本データ収集は可能

### ❌ 未実装（企画書要件）

1. **5軸データ収集基盤**
   - 時間軸、場所軸、商品軸、行動軸、文化軸の体系的な収集
   - 状態: ❌ 未実装

2. **プライバシー保護機能**
   - k匿名性（k≥5）、差分プライバシー技術
   - 状態: ❌ 未実装

3. **データ分析・レポート生成**
   - イベント主催者向けレポート
   - 自治体・観光協会向け分析
   - 企業向けデータセット
   - 状態: ❌ 未実装

---

## 🎯 実装優先順位（Phase別）

### Phase 1: 基盤構築期（0-6ヶ月）

#### 1.1 データ収集基盤の拡張（最優先）

**目標**: 企画書の5軸データを収集可能にする

**実装内容**:

1. **データ収集テーブルの設計**
   ```sql
   -- 匿名化取引データテーブル
   CREATE TABLE anonymized_transactions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id text,  -- イベントID（将来拡張用）
     seller_id_hash text,  -- ハッシュ化されたseller_id
     
     -- 時間軸データ
     transaction_timestamp timestamptz NOT NULL,
     time_bucket_15min timestamptz,  -- 15分単位バケット
     day_of_week int,  -- 曜日（0=日曜）
     hour_of_day int,  -- 時間（0-23）
     
     -- 場所軸データ
     booth_location_grid text,  -- 5mグリッド匿名化位置
     area_category text,  -- エリアカテゴリ（将来拡張用）
     
     -- 商品軸データ
     product_category text,  -- AI認識カテゴリ（20分類）
     price_range_bucket int,  -- 価格帯（¥500刻み）
     item_count int,  -- 商品数
     
     -- 行動軸データ
     payment_method text,  -- 'cash' | 'cashless'
     payment_completion_time_sec int,  -- 決済完了時間（秒）
     language_setting text,  -- 言語設定
     
     -- 文化軸データ
     buyer_language text,  -- 購入者言語
     currency_display text,  -- 通貨表示選択
     
     -- 集計用フィールド
     amount_gross int,  -- 総額（匿名化済み）
     amount_net int,  -- 純額
     
     created_at timestamptz DEFAULT now(),
     
     -- インデックス
     INDEX idx_anonymized_transactions_timestamp (transaction_timestamp),
     INDEX idx_anonymized_transactions_category (product_category),
     INDEX idx_anonymized_transactions_payment (payment_method)
   );
   ```

2. **データ収集関数の実装**
   - `lib/data-collection.ts` を作成
   - 取引データを匿名化して収集する関数
   - k匿名性チェック関数
   - 差分プライバシーノイズ追加関数

3. **Webhook/APIでの自動収集**
   - 決済完了時に自動的に匿名化データを収集
   - `app/api/webhooks/stripe/route.ts` に追加
   - `app/api/pending/start/route.ts` に追加（現金決済用）

**実装ファイル**:
- `supabase/migrations/YYYYMMDD_create_anonymized_transactions.sql`
- `lib/data-collection.ts` (新規)
- `app/api/webhooks/stripe/route.ts` (修正)
- `app/api/pending/start/route.ts` (修正)

#### 1.2 プライバシー保護機能の実装

**目標**: k匿名性と差分プライバシーを実装

**実装内容**:

1. **k匿名性チェック**
   ```typescript
   // lib/data-collection.ts
   export async function validateKAnonymity(
     prisma: PrismaClient,
     data: AnonymizedTransaction,
     k: number = 5
   ): Promise<boolean> {
     // 同じ属性の組み合わせを持つレコード数をカウント
     const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
       SELECT COUNT(*)::bigint as count
       FROM anonymized_transactions
       WHERE time_bucket_15min = ${data.timeBucket15min}
         AND booth_location_grid = ${data.boothLocationGrid}
         AND product_category = ${data.productCategory}
         AND price_range_bucket = ${data.priceRangeBucket}
     `;
     
     return Number(count[0].count) >= k;
   }
   ```

2. **差分プライバシーノイズ追加**
   ```typescript
   // lib/data-collection.ts
   export function addDifferentialPrivacyNoise(
     value: number,
     epsilon: number = 1.0
   ): number {
     // Laplace mechanism
     const sensitivity = 1; // 金額の感度
     const scale = sensitivity / epsilon;
     const noise = laplaceRandom(0, scale);
     return Math.round(value + noise);
   }
   ```

3. **データ最小化**
   - 個人特定情報は一切収集しない
   - 統計的価値のみを抽出

**実装ファイル**:
- `lib/data-collection.ts` (追加)

#### 1.3 リアルタイム分析エンジン（基本版）

**目標**: イベント主催者向けの基本ダッシュボード

**実装内容**:

1. **分析APIエンドポイント**
   - `app/api/analytics/event/summary/route.ts` (新規)
   - リアルタイム売上ダッシュボード
   - 時間帯別売上分析
   - 商品カテゴリ別分析

2. **管理者向けダッシュボード**
   - `app/admin/analytics/page.tsx` (新規)
   - リアルタイム売上表示
   - グラフ・チャート表示

**実装ファイル**:
- `app/api/analytics/event/summary/route.ts` (新規)
- `app/admin/analytics/page.tsx` (新規)

---

### Phase 2: パイロット展開期（6-12ヶ月）

#### 2.1 高度分析レポート生成

**目標**: イベント主催者向けの詳細レポート

**実装内容**:

1. **レポート生成API**
   - `app/api/analytics/reports/generate/route.ts` (新規)
   - PDF/Excel形式でのレポート生成
   - カスタム分析項目の設定

2. **ブース配置効果分析**
   - 位置データと売上の相関分析
   - 最適配置提案アルゴリズム

**実装ファイル**:
- `app/api/analytics/reports/generate/route.ts` (新規)
- `lib/analytics/booth-optimization.ts` (新規)

#### 2.2 自治体・観光協会向けサービス

**目標**: 地域振興データ分析サービス

**実装内容**:

1. **インバウンド分析**
   - 言語設定別購買パターン分析
   - 国籍推定購買パターン（統計的）

2. **地域経済効果測定**
   - 地域経済への影響分析
   - 観光施策効果検証

**実装ファイル**:
- `app/api/analytics/regional/route.ts` (新規)
- `app/api/analytics/inbound/route.ts` (新規)

---

### Phase 3: 本格展開期（12ヶ月以降）

#### 3.1 企業向けデータ販売

**目標**: 匿名化統計データセットの提供

**実装内容**:

1. **データエクスポートAPI**
   - `app/api/data-export/route.ts` (新規)
   - CSV/JSON形式でのデータエクスポート
   - 認証・アクセス制御

2. **API提供**
   - RESTful APIでのデータ提供
   - レート制限・認証機能

**実装ファイル**:
- `app/api/data-export/route.ts` (新規)
- `app/api/data-api/route.ts` (新規)

---

## 🔒 プライバシー保護・法的準拠

### 実装すべき機能

1. **多言語同意フレームワーク**
   - 出店者向け同意画面
   - 多言語対応（日本語、英語、中国語）

2. **GDPR・個人情報保護法準拠**
   - データ保護影響評価（DPIA）
   - 開示・削除・停止リクエスト窓口
   - 外部監査体制

**実装ファイル**:
- `app/consent/data-usage/page.tsx` (新規)
- `app/api/data-requests/route.ts` (新規)

---

## 📈 実装スケジュール（推奨）

### 即座に実装開始（Phase 1.1）

1. **データ収集テーブル作成** (1週間)
2. **データ収集関数実装** (2週間)
3. **Webhook/APIでの自動収集** (1週間)
4. **プライバシー保護機能** (2週間)

**合計**: 約6週間

### その後（Phase 1.2-1.3）

5. **リアルタイム分析エンジン** (4週間)
6. **基本ダッシュボード** (2週間)

**合計**: 約6週間

**Phase 1合計**: 約12週間（3ヶ月）

---

## 🎯 次のアクション

1. **データ収集テーブルのマイグレーション作成**
2. **データ収集関数の実装開始**
3. **プライバシー保護機能の実装**

これらの実装により、企画書の「現金無料×データインテリジェンス戦略」の基盤が整います。

---

**作成者**: AI Assistant  
**最終更新**: 2025年1月

