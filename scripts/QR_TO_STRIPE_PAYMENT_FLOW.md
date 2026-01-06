# QR決済・現金決済・Stripe決済への遷移時の取引データ状態

## 概要

セラーが決済方法を選択し、QR決済・現金決済・Stripe決済への遷移時の取引データの状態をまとめます。

---

## フロー概要

### QR決済（Stripe決済への遷移あり）
```
1. セラーがQR生成（paymentMethod='cashless'）
   ↓
2. 客がQRを読み込む前にStripeに遷移
   ↓
3a. 決済成功 → orders.status = 'paid', stripe_payments レコード作成
3b. 決済失敗/未完了 → orders.status = 'pending' のまま
```

### 現金決済
```
1. セラーが現金決済を選択（paymentMethod='cash'）
   ↓
2. 即座に完了（Stripe決済への遷移なし）
   ↓
3. orders.status = 'pending' のまま（自動更新なし）
```

---

## 1. 決済開始時（セラーが決済方法を選択）

### エンドポイント
- `POST /api/pending/start`

### パラメータ
- `paymentMethod`: `'cash'` (現金) または `'cashless'` (QR決済)

### データベースへの影響

#### `orders` テーブル
```sql
INSERT INTO orders (
  seller_id,
  order_no,
  amount,
  summary,
  status,           -- 'pending' で作成（現金・QR決済共通）
  cost_amount,
  created_at,
  updated_at
) VALUES (...)
```

**状態:**
- `status = 'pending'` (現金・QR決済共通)
- `stripe_sid = NULL` (現金・QR決済共通)
- `deleted_at = NULL`

#### `order_metadata` テーブル
```sql
INSERT INTO order_metadata (
  order_id,
  is_cash,         -- paymentMethod === 'cash' の場合 true
  created_at,
  updated_at
) VALUES (...)
```

**状態:**
- `is_cash = false` (QR決済の場合: `paymentMethod='cashless'`)
- `is_cash = true` (現金決済の場合: `paymentMethod='cash'`)

#### `order_items` テーブル
- AI分析結果があれば商品明細が作成される（現金・QR決済共通）

#### `images` テーブル
- 画像データがあればS3にアップロードされ、レコードが作成される（現金・QR決済共通）

---

## 2. 現金決済の場合

### 処理フロー

現金決済を選択した場合、以下の処理が行われます：

1. **決済開始時**
   - `/api/pending/start`で`paymentMethod='cash'`が送信される
   - `order_metadata.is_cash = true`が設定される
   - QRコードは表示されない（または表示されても使用されない）

2. **決済完了**
   - セラーが現金を受け取る
   - **データベースの自動更新は行われない**

### データベースへの影響

**現金決済の場合、決済完了後もデータベースの更新は行われません。**

- `orders.status` は `'pending'` のまま（自動更新なし）
- `orders.stripe_sid` は `NULL` のまま
- `stripe_payments` テーブルにはレコードが作成されない
- `order_metadata.is_cash = true` が設定されている

### 現金決済の判定方法

売上集計などでは、以下の条件で現金決済を判定します：

```sql
-- 現金決済の判定
WHERE order_metadata.is_cash = true

-- 現金決済の売上計算
CASE 
  WHEN order_metadata.is_cash = true THEN orders.amount
  WHEN stripe_payments.status = 'succeeded' THEN stripe_payments.amount_net
  ELSE 0
END
```

**重要なポイント:**
- 現金決済の場合、`orders.status`が`'pending'`のままでも、`is_cash = true`により現金決済として扱われる
- 手数料は発生しない（`stripe_payments`レコードが存在しないため）

---

## 3. Stripe決済への遷移（QR決済の場合、客がQRを読み込む前にStripeに遷移）

### エンドポイント
- `POST /api/checkout/session`

### 処理内容

1. **既存のorderを取得または新規作成**
   ```typescript
   // orderIdがあれば既存のorderを取得
   // なければ新規作成（この場合も status='pending'）
   ```

2. **Stripe Checkout Session作成**
   ```typescript
   stripe.checkout.sessions.create({
     mode: 'payment',
     payment_intent_data: {
       metadata: {
         sellerId: order.sellerId,
         orderId: order.id,  // 既存のorder.idを使用
       }
     },
     success_url: `${BASE_URL}/success?order=${order.id}`,
     cancel_url: `${BASE_URL}/cancel?s=${order.sellerId}&order=${order.id}`
   })
   ```

### データベースへの影響

**この時点では、データベースの更新は行われません。**

- `orders.status` は `'pending'` のまま
- `stripe_payments` テーブルにはまだレコードが作成されない
- Stripe Checkout Sessionは作成されるが、PaymentIntentはまだ確定していない

---

## 4. Stripe決済成功時（QR決済の場合）

### Webhookイベント
- `payment_intent.succeeded`

### エンドポイント
- `POST /api/webhooks/stripe`

### データベースへの影響

#### `stripe_payments` テーブル
```sql
INSERT INTO stripe_payments (
  seller_id,
  order_id,              -- 既存のorder.id
  payment_intent_id,     -- Stripe PaymentIntent ID
  charge_id,
  balance_tx_id,
  amount_gross,
  amount_fee,
  amount_net,
  currency,
  status,               -- 'succeeded'
  refunded_total,
  raw_event,
  created_at,
  updated_at
) VALUES (...)
ON CONFLICT (payment_intent_id) DO UPDATE ...
```

**状態:**
- `status = 'succeeded'`
- `order_id` に既存のorder.idが設定される
- `amount_net` に手数料差し引き後の金額が設定される

#### `orders` テーブル
```sql
UPDATE orders SET
  status = 'paid',           -- 'pending' → 'paid' に更新
  stripe_sid = $1,           -- PaymentIntent ID
  updated_at = now()
WHERE id = $2
```

**状態:**
- `status = 'paid'` (更新)
- `stripe_sid = PaymentIntent ID` (更新)

---

## 5. Stripe決済失敗時（未完了含む、QR決済の場合）

### ケース1: 客がキャンセルボタンを押した場合

#### リダイレクト先
- `/cancel?s={sellerId}&order={orderId}`

#### データベースへの影響

**データベースの更新は行われません。**

- `orders.status` は `'pending'` のまま
- `stripe_payments` テーブルにはレコードが作成されない
- Stripe Checkout Sessionはキャンセルされるが、PaymentIntentは作成されない（または`requires_payment_method`状態）

### ケース2: 決済が途中で離脱した場合（ブラウザを閉じる、タイムアウトなど）

#### データベースへの影響

**データベースの更新は行われません。**

- `orders.status` は `'pending'` のまま
- `stripe_payments` テーブルにはレコードが作成されない
- Stripe Checkout Sessionは期限切れになるが、PaymentIntentは作成されない（または`requires_payment_method`状態）

### ケース3: カードエラーなどで決済が失敗した場合

#### Webhookイベント（現在の実装では未処理）
- `payment_intent.payment_failed` - **現在のコードでは処理されていない**

#### データベースへの影響

**現在の実装では、決済失敗時のwebhook処理が実装されていません。**

- `orders.status` は `'pending'` のまま
- `stripe_payments` テーブルにはレコードが作成されない
- PaymentIntentは`requires_payment_method`または`canceled`状態になる

---

## データベース状態のまとめ

### 現金決済の場合

| テーブル | カラム | 値 |
|---------|--------|-----|
| `orders` | `status` | `'pending'` (自動更新なし) |
| `orders` | `stripe_sid` | `NULL` |
| `order_metadata` | `is_cash` | `true` |
| `stripe_payments` | - | レコードが存在しない |

**注意:** 現金決済の場合、`orders.status`が`'pending'`のままでも、`is_cash = true`により現金決済として扱われます。

### Stripe決済成功時（QR決済の場合）

| テーブル | カラム | 値 |
|---------|--------|-----|
| `orders` | `status` | `'paid'` |
| `orders` | `stripe_sid` | PaymentIntent ID |
| `order_metadata` | `is_cash` | `false` |
| `stripe_payments` | `status` | `'succeeded'` |
| `stripe_payments` | `order_id` | 既存のorder.id |
| `stripe_payments` | `amount_net` | 手数料差し引き後の金額 |

### Stripe決済失敗/未完了時（QR決済の場合）

| テーブル | カラム | 値 |
|---------|--------|-----|
| `orders` | `status` | `'pending'` (変更なし) |
| `orders` | `stripe_sid` | `NULL` (変更なし) |
| `order_metadata` | `is_cash` | `false` |
| `stripe_payments` | - | レコードが存在しない |

---

## 重要なポイント

### 1. 現金決済とQR決済の違い

#### 現金決済
- `order_metadata.is_cash = true` が設定される
- QRコードは表示されない（または表示されても使用されない）
- Stripe決済には遷移しない
- `orders.status`は`'pending'`のまま（自動更新なし）
- `stripe_payments`レコードは作成されない
- 手数料は発生しない

#### QR決済（Stripe決済）
- `order_metadata.is_cash = false` が設定される
- QRコードが表示される
- 客がQRを読み込むとStripe決済に遷移
- 決済成功時: `orders.status`が`'paid'`に更新され、`stripe_payments`レコードが作成される
- 手数料が発生する（`stripe_payments.amount_fee`）

### 2. 既存のorderが再利用される（QR決済の場合）
- QR決済開始時に作成された`orders`レコードが、Stripe決済でも使用される
- 新規のorderは作成されない（`/api/checkout/session`で`orderId`が指定されている場合）

### 3. 決済成功時のみデータベースが更新される（QR決済の場合）
- 決済成功時: `orders.status`が`'paid'`に更新され、`stripe_payments`レコードが作成される
- 決済失敗/未完了時: データベースの更新は行われない（`orders.status`は`'pending'`のまま）

### 4. 決済失敗時のwebhook処理が未実装（QR決済の場合）
- `payment_intent.payment_failed`イベントの処理が実装されていない
- 決済失敗を検知するには、定期的なバッチ処理や手動確認が必要

### 5. 未完了決済の検知方法（QR決済の場合）
- `orders.status = 'pending'` かつ `stripe_payments`レコードが存在しない
- `order_metadata.is_cash = false` かつ `orders.status = 'pending'`
- 作成日時から一定時間経過（TTL）で期限切れと判定

### 6. 現金決済の判定方法
- `order_metadata.is_cash = true` で判定
- `orders.status`が`'pending'`でも、`is_cash = true`により現金決済として扱われる
- 売上集計では`orders.amount`をそのまま使用（手数料なし）

### 7. Stripe決済の判定基準（100%の確度）

**`payment_status = 'succeeded'` は Stripe決済の絶対的な証拠**

#### 判定ロジック
```sql
-- payment_status は stripe_payments.status のエイリアス
-- SQLクエリでは: sp.status AS payment_status

-- Stripe決済成功の判定（100%の確度）
WHERE payment_status = 'succeeded'
-- または
WHERE stripe_payments.status = 'succeeded'
```

#### 理由（コードベース確認済み）

1. **Stripe Webhookでのみ設定される**
   - `payment_status`（実際は`stripe_payments.status`）は、Stripe Webhook `payment_intent.succeeded`イベントでのみ`'succeeded'`に設定される
   - 設定箇所: `app/api/webhooks/stripe/route.ts` (142行目, 152行目)
   - 設定箇所: `payments.js` (186行目)
   - 設定箇所: `public/server.js` (186行目)

2. **現金決済では絶対に`succeeded`にならない**
   - 現金決済の場合、`stripe_payments`テーブルにはレコードが作成されない
   - そのため、`payment_status`は常に`NULL`になる
   - `payment_status = 'succeeded'`が存在する場合、それは必ずStripe決済成功を意味する

3. **100%の確度でStripe決済を判定できる**
   - `payment_status = 'succeeded'`が存在する場合、100%Stripe決済成功
   - `is_cash`の値に関係なく、`payment_status = 'succeeded'`があればStripe決済として扱うべき

#### データからの検証
提供された10件のStripe決済データは全て`payment_status = 'succeeded'`を持っており、この判定基準が正しいことを裏付けています。

#### 注意点
- `payment_status`は実際には`stripe_payments.status`のエイリアス（SQLクエリで`sp.status AS payment_status`として参照）
- `stripe_payments`テーブルにレコードが存在しない場合、`payment_status`は`NULL`になる
- `payment_status = 'succeeded'`が存在する場合、それは必ずStripe決済成功を意味する

---

## コード参照

### 決済開始（現金・QR決済共通）
- `app/api/pending/start/route.ts` (66-75行目: orders作成, 156-161行目: is_cash設定)

### Stripe決済セッション作成（QR決済の場合）
- `app/api/checkout/session/route.ts` (49-78行目)

### 決済成功時のwebhook処理（QR決済の場合）
- `app/api/webhooks/stripe/route.ts` (60-186行目)

### 決済失敗時の処理（QR決済の場合）
- 現在未実装（`payment_intent.payment_failed`の処理なし）

### 現金決済の判定（売上集計など）
- `app/api/seller/summary/route.ts` (132-140行目: 現金決済の売上計算)

---

## 推奨される改善点

1. **決済失敗時のwebhook処理を実装**
   - `payment_intent.payment_failed`イベントを処理
   - `orders.status`を`'failed'`に更新するか、別途失敗フラグを追加

2. **未完了決済の自動クリーンアップ**
   - 一定時間経過した`pending`状態のorderを自動的に期限切れとしてマーク

3. **決済状態の可視化**
   - `orders`テーブルに`payment_status`カラムを追加し、より詳細な状態管理を実現

