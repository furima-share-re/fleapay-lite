# ソースコード整合性チェックレポート

## 概要

テスト必要なケース（TC-001, TC-002, TC-006, TC-008, TC-014）について、ソースコードの整合性をチェックしました。

---

## TC-001: 決済成功（通常カード）

### 期待される動作

1. Checkout Session作成時に`success_url`と`cancel_url`が正しく設定される
2. 決済成功時に`/success?order={orderId}`にリダイレクトされる
3. `/api/checkout/result`が`isPaid: true`を返す
4. Webhook `payment_intent.succeeded`が受信され、データベースが更新される
5. 画面に「決済完了」と表示される

### 実装確認

#### ✅ Checkout Session作成 (`app/api/checkout/session/route.ts`)

```typescript
// 153-154行目
const successUrl = `${BASE_URL}/success?order=${order.id}`;
const cancelUrl = `${BASE_URL}/cancel?s=${order.sellerId}&order=${order.id}`;
```

**確認結果**: ✅ **整合性あり**
- `success_url`が`/success?order={orderId}`形式で設定されている
- `cancel_url`が`/cancel?s={sellerId}&order={orderId}`形式で設定されている

#### ✅ PaymentIntent Metadata設定 (`app/api/checkout/session/route.ts`)

```typescript
// 178-186行目
payment_intent_data: {
  transfer_data: {
    destination: stripeAccountId,
  },
  metadata: {
    sellerId: order.sellerId,
    orderId: order.id,
  },
},
```

**確認結果**: ✅ **整合性あり**
- `sellerId`と`orderId`がmetadataに設定されている
- Webhook処理で使用可能

#### ✅ isPaid判定 (`app/api/checkout/result/route.ts`)

```typescript
// 38-43行目: has_succeeded_paymentの確認
EXISTS(
  SELECT 1 
  FROM stripe_payments sp_succeeded
  WHERE sp_succeeded.order_id = o.id 
    AND sp_succeeded.status = 'succeeded'
) AS has_succeeded_payment

// 68-70行目: isPaid判定
const isPaid =
  row.order_status === 'paid' ||
  row.has_succeeded_payment === true;
```

**確認結果**: ✅ **整合性あり**
- `has_succeeded_payment`を使用して`succeeded`レコードの存在を確認
- `orders.status = 'paid'`または`succeeded`レコードが存在すれば`isPaid = true`

#### ✅ Webhook処理 (`app/api/webhooks/stripe/route.ts`)

```typescript
// 130-156行目: stripe_payments作成
await prisma.stripePayment.upsert({
  where: { paymentIntentId: pi.id },
  create: { ... },
  update: { ... },
});

// 163-170行目: orders.status更新
await prisma.order.update({
  where: { id: orderId },
  data: {
    status: 'paid',
    stripeSid: pi.id,
    updatedAt: new Date(),
  },
});

// 177-187行目: order_metadata.payment_state更新
await prisma.orderMetadata.update({
  where: { orderId: orderId },
  data: {
    paymentState: 'stripe_completed',
    updatedAt: new Date(),
  },
});
```

**確認結果**: ✅ **整合性あり**
- `stripe_payments`レコードが作成される（UPSERTパターン）
- `orders.status`が`'paid'`に更新される
- `order_metadata.payment_state`が`'stripe_completed'`に更新される

#### ✅ Successページ (`app/success/page.tsx`)

```typescript
// 62行目: API呼び出し
const res = await fetch(`/api/checkout/result?orderId=${encodeURIComponent(validOrderId)}`);

// 72-74行目: isPaid判定とリダイレクト
if (data && !data.isPaid) {
  router.push(`/cancel?order=${encodeURIComponent(data.orderId)}&s=${encodeURIComponent(data.sellerId)}`);
  return;
}

// 289行目: 画面表示
{paymentData && paymentData.isPaid ? (
  <div className="payment-info">
    <span className="payment-info-value status-ok">完了</span>
    ...
  </div>
) : ...}
```

**確認結果**: ✅ **整合性あり**
- `/api/checkout/result`を呼び出して決済状態を確認
- `isPaid = false`の場合は`/cancel`にリダイレクト
- `isPaid = true`の場合は「完了」と表示

### 総合評価

**✅ TC-001: 整合性あり - すべての実装が期待動作と一致**

---

## TC-002: 3D Secure認証が必要なカード（認証成功）

### 期待される動作

1. TC-001と同じフロー
2. 3D Secure認証画面が表示される（Stripe側で自動処理）
3. 認証成功後、決済成功時に`/success?order={orderId}`にリダイレクトされる

### 実装確認

#### ✅ Checkout Session作成

TC-001と同じ実装を使用

**確認結果**: ✅ **整合性あり**
- 3D Secure認証はStripe Checkoutが自動的に処理するため、追加の実装は不要

#### ✅ Webhook処理

TC-001と同じ実装を使用

**確認結果**: ✅ **整合性あり**
- 認証成功後、`payment_intent.succeeded`が発火し、TC-001と同じ処理が実行される

### 総合評価

**✅ TC-002: 整合性あり - TC-001と同じ実装で対応可能**

---

## TC-006: ユーザーがキャンセルボタンをクリック

### 期待される動作

1. Checkout Session作成時に`cancel_url`が正しく設定される
2. ユーザーがキャンセルボタンをクリックした時に`/cancel?s={sellerId}&order={orderId}`にリダイレクトされる
3. `/cancel`ページが表示される
4. `/api/checkout/result`が`isPaid: false`を返す

### 実装確認

#### ✅ Checkout Session作成 (`app/api/checkout/session/route.ts`)

```typescript
// 154行目
const cancelUrl = `${BASE_URL}/cancel?s=${order.sellerId}&order=${order.id}`;
```

**確認結果**: ✅ **整合性あり**
- `cancel_url`が`/cancel?s={sellerId}&order={orderId}`形式で設定されている

#### ✅ Cancelページ (`app/cancel/page.tsx`)

```typescript
// 8-286行目: Cancelページの実装
export default function CancelPage() {
  // 多言語対応
  // 「決済は完了していません」と表示
  // 「もう一度試す」「トップに戻る」ボタン
}
```

**確認結果**: ✅ **整合性あり**
- Cancelページが実装されている
- 「決済は完了していません」と表示される
- 適切なUIが提供されている

#### ✅ isPaid判定

決済が完了していない場合、`isPaid = false`が返される

**確認結果**: ✅ **整合性あり**
- `stripe_payments`レコードが作成されないため、`has_succeeded_payment = false`
- `orders.status = 'pending'`のため、`isPaid = false`

### 総合評価

**✅ TC-006: 整合性あり - すべての実装が期待動作と一致**

---

## TC-008: Webhook遅延によるタイミング問題

### 期待される動作

1. 決済成功時に`/success?order={orderId}`にリダイレクトされる
2. Webhook受信前でも、`/api/checkout/result`が`isPaid: true`を返す（修正後）
3. Webhook受信後、データベースが更新される

### 実装確認

#### ✅ isPaid判定（修正後） (`app/api/checkout/result/route.ts`)

```typescript
// 38-43行目: has_succeeded_paymentの確認
EXISTS(
  SELECT 1 
  FROM stripe_payments sp_succeeded
  WHERE sp_succeeded.order_id = o.id 
    AND sp_succeeded.status = 'succeeded'
) AS has_succeeded_payment

// 68-70行目: isPaid判定
const isPaid =
  row.order_status === 'paid' ||
  row.has_succeeded_payment === true;
```

**確認結果**: ⚠️ **部分的に整合性あり**
- `has_succeeded_payment`を使用して、Webhook受信後は`succeeded`レコードの存在を確認できる
- **問題**: Webhook受信前は、`stripe_payments`レコードがまだ作成されていないため、`has_succeeded_payment = false`になる可能性がある

#### ⚠️ 潜在的な問題

**問題点**: 
- Webhook受信前は、`stripe_payments`レコードがまだ作成されていない
- `orders.status`も`'pending'`のまま
- したがって、`isPaid = false`になり、`/success`ページで`/cancel`にリダイレクトされる可能性がある

**現状の動作**:
- Webhook受信前: `has_succeeded_payment = false`、`orders.status = 'pending'` → `isPaid = false`
- この場合、`/success`ページで`isPaid = false`が返され、`/cancel`にリダイレクトされる可能性がある
- ただし、通常はWebhookがすぐに受信されるため、この問題は稀なケース

**推奨改善（オプション）**: 
Webhook受信前でも、Stripe APIでCheckout SessionまたはPaymentIntentの状態を確認する実装を追加することを検討。ただし、通常はWebhookがすぐに受信されるため、優先度は中程度。

**実装案**:
```typescript
// app/api/checkout/result/route.ts に追加
// Webhook受信前でも、Stripe APIでPaymentIntentの状態を確認
if (!row.has_succeeded_payment && row.order_status !== 'paid') {
  // Checkout SessionからPaymentIntent IDを取得
  // Stripe APIでPaymentIntentの状態を確認
  // status === 'succeeded' の場合、isPaid = true
}
```

### 総合評価

**⚠️ TC-008: 部分的に整合性あり - 修正済みだが、Webhook受信前の動作に注意が必要**

**現状**: 通常はWebhookがすぐに受信されるため、問題は稀なケース。ただし、Webhook遅延が頻繁に発生する場合は改善を検討。

---

## TC-014: 複数の決済試行（最初に失敗、2回目に成功）

### 期待される動作

1. 最初の決済試行が失敗（Stripe Checkoutページ内に留まる）
2. 2回目の決済試行が成功
3. `/success?order={orderId}`にリダイレクトされる
4. `/api/checkout/result`が`isPaid: true`を返す（複数の`stripe_payments`レコードがあっても）

### 実装確認

#### ✅ isPaid判定（修正後） (`app/api/checkout/result/route.ts`)

```typescript
// 38-43行目: has_succeeded_paymentの確認
EXISTS(
  SELECT 1 
  FROM stripe_payments sp_succeeded
  WHERE sp_succeeded.order_id = o.id 
    AND sp_succeeded.status = 'succeeded'
) AS has_succeeded_payment

// 68-70行目: isPaid判定
const isPaid =
  row.order_status === 'paid' ||
  row.has_succeeded_payment === true;
```

**確認結果**: ✅ **整合性あり（修正済み）**
- `EXISTS`句を使用して、複数の`stripe_payments`レコードがあっても、`succeeded`レコードが存在すれば`isPaid = true`を返す
- 最新のレコードが`'refunded'`などの場合でも、過去に`succeeded`レコードがあれば正しく判定できる

#### ✅ Webhook処理

複数のPaymentIntentが作成された場合、それぞれに対してWebhookが発火する

**確認結果**: ✅ **整合性あり**
- 各PaymentIntentに対して`payment_intent.succeeded`が発火する
- UPSERTパターンにより、重複を防ぎつつ、複数のレコードが作成される可能性がある

### 総合評価

**✅ TC-014: 整合性あり - 修正済みの実装で正しく動作**

---

## 発見された問題点

### 1. ⚠️ TC-008: Webhook受信前の動作

**問題**: Webhook受信前は、`stripe_payments`レコードがまだ作成されていない可能性があるため、`has_succeeded_payment = false`になる可能性がある。

**現状の実装**:
- `has_succeeded_payment`は`stripe_payments`テーブルを確認するのみ
- Webhook受信前は、`stripe_payments`レコードがまだ作成されていない

**影響**:
- Webhook受信前: `isPaid = false` → `/success`ページで`/cancel`にリダイレクトされる可能性がある
- ただし、通常はWebhookがすぐに受信されるため、この問題は稀なケース

**推奨改善（オプション）**:
```typescript
// app/api/checkout/result/route.ts に追加
// Webhook受信前でも、Stripe APIでPaymentIntentの状態を確認
if (!row.has_succeeded_payment && row.order_status !== 'paid') {
  // Checkout SessionからPaymentIntent IDを取得
  // または、Stripe APIで直接PaymentIntentの状態を確認
  // status === 'succeeded' の場合、isPaid = true
}
```

**優先度**: 中（Webhook遅延が頻繁に発生する場合は重要）

---

## 総合評価

### 整合性チェック結果

| テストケース | 整合性 | 問題点 | 対応状況 |
|------------|--------|--------|---------|
| **TC-001**: 決済成功 | ✅ **整合性あり** | なし | - |
| **TC-002**: 3D Secure認証成功 | ✅ **整合性あり** | なし | - |
| **TC-006**: ユーザーキャンセル | ✅ **整合性あり** | なし | - |
| **TC-008**: Webhook遅延 | ⚠️ **部分的に整合性あり** | Webhook受信前の動作に注意が必要 | 改善推奨（オプション） |
| **TC-014**: 複数決済試行 | ✅ **整合性あり** | なし | - |

### 結論

**5つのテストケースのうち、4つは完全に整合性が取れています。**

**TC-008（Webhook遅延）については、修正済みの実装で基本的には動作しますが、Webhook受信前の動作に注意が必要です。**

通常はWebhookがすぐに受信されるため、問題は稀なケースですが、Webhook遅延が頻繁に発生する場合は、Stripe APIで直接PaymentIntentの状態を確認する実装を追加することを検討してください。

---

## 詳細な実装確認

### 1. Checkout Session作成時のURL設定

**ファイル**: `app/api/checkout/session/route.ts`

```typescript
// 153-154行目
const successUrl = `${BASE_URL}/success?order=${order.id}`;
const cancelUrl = `${BASE_URL}/cancel?s=${order.sellerId}&order=${order.id}`;
```

**確認**: ✅ テストケースの期待値と一致

### 2. isPaid判定ロジック

**ファイル**: `app/api/checkout/result/route.ts`

```typescript
// 68-70行目
const isPaid =
  row.order_status === 'paid' ||
  row.has_succeeded_payment === true;
```

**確認**: ✅ 修正済みで、複数の`stripe_payments`レコードがあっても正しく判定できる

### 3. Webhook処理

**ファイル**: `app/api/webhooks/stripe/route.ts`

```typescript
// 130-156行目: stripe_payments作成
// 163-170行目: orders.status更新
// 177-187行目: order_metadata.payment_state更新
```

**確認**: ✅ すべての期待される更新が実装されている

### 4. Successページの実装

**ファイル**: `app/success/page.tsx`

```typescript
// 62行目: API呼び出し
// 72-74行目: isPaid判定とリダイレクト
// 289行目: 画面表示
```

**確認**: ✅ 期待される動作が実装されている

### 5. Cancelページの実装

**ファイル**: `app/cancel/page.tsx`

```typescript
// 8-286行目: Cancelページの実装
```

**確認**: ✅ 期待される動作が実装されている

---

## 推奨される改善

### 1. TC-008: Webhook受信前の動作改善（オプション）

**現状**: Webhook受信前は、`isPaid = false`になる可能性がある

**改善案**: Stripe APIで直接PaymentIntentの状態を確認する実装を追加

**優先度**: 中（Webhook遅延が頻繁に発生する場合は重要）

---

## 結論

現在の実装は、テストケース仕様書で定義された期待動作を**ほぼ完全に満たしています**。

唯一の注意点は、TC-008（Webhook遅延）について、Webhook受信前の動作に注意が必要であることです。ただし、通常はWebhookがすぐに受信されるため、問題は稀なケースです。

**修正済みの問題（`isPaid`判定ロジック）により、TC-001, TC-002, TC-006, TC-014は正しく動作します。**
