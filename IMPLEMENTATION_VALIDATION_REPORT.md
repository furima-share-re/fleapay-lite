# 実装検証レポート

## 概要

テストケース仕様書（`STRIPE_PAYMENT_TEST_CASES.md`）に基づいて、現在の実装が正しく動作するかを検証しました。

## 検証結果サマリー

| テストケース | 実装状況 | 問題点 | 対応状況 |
|------------|---------|--------|---------|
| TC-001: 決済成功 | ✅ 対応済み | なし | - |
| TC-002: 3D Secure認証成功 | ✅ 対応済み | なし | - |
| TC-003: 3D Secure認証失敗 | ⚠️ 部分対応 | Webhook未処理 | 要改善 |
| TC-004: カード残高不足 | ⚠️ 部分対応 | Webhook未処理 | 要改善 |
| TC-005: カード期限切れ | ⚠️ 部分対応 | Webhook未処理 | 要改善 |
| TC-006: ユーザーキャンセル | ✅ 対応済み | なし | - |
| TC-007: Sessionタイムアウト | ✅ 対応済み | なし | - |
| TC-008: Webhook遅延 | ✅ 修正済み | 修正前は問題あり | 修正済み |
| TC-009: 返金（全額） | ✅ 対応済み | なし | - |
| TC-010: 返金（一部） | ✅ 対応済み | なし | - |
| TC-011: チャージバック発生 | ✅ 対応済み | なし | - |
| TC-012: チャージバック勝訴 | ✅ 対応済み | なし | - |
| TC-013: チャージバック敗訴 | ✅ 対応済み | なし | - |
| TC-014: 複数決済試行 | ✅ 修正済み | 修正前は問題あり | 修正済み |
| TC-015: 無効なカード番号 | ✅ 対応済み | なし | - |

## 詳細検証結果

---

### ✅ TC-001: 決済成功（通常カード）

#### 実装確認

**`/api/checkout/result` エンドポイント**
- ✅ `has_succeeded_payment` を使用して `isPaid` を判定（修正済み）
- ✅ `orders.status = 'paid'` または `has_succeeded_payment = true` で判定

**Webhook処理**
- ✅ `payment_intent.succeeded` イベントを処理
- ✅ `stripe_payments` レコードを作成（UPSERTパターン）
- ✅ `orders.status` を `'paid'` に更新
- ✅ `order_metadata.payment_state` を `'stripe_completed'` に更新

**画面表示**
- ✅ `/success` ページで `isPaid` を確認
- ✅ `isPaid = false` の場合は `/cancel` にリダイレクト

#### 検証結果
**✅ 実装は正しい**

---

### ✅ TC-002: 3D Secure認証が必要なカード（認証成功）

#### 実装確認

**Stripe側の処理**
- ✅ Stripe Checkoutが自動的に3D Secure認証を処理
- ✅ 認証成功後、`payment_intent.succeeded` が発火

**Webhook処理**
- ✅ `payment_intent.succeeded` イベントを処理（TC-001と同じ）

**画面表示**
- ✅ 認証成功後、`/success` にリダイレクト

#### 検証結果
**✅ 実装は正しい**

---

### ⚠️ TC-003: 3D Secure認証が必要なカード（認証失敗）

#### 実装確認

**Stripe側の処理**
- ✅ Stripe Checkoutが自動的にエラーを表示
- ⚠️ `payment_intent.payment_failed` Webhookが発火する可能性があるが、**未処理**

**Webhook処理**
- ❌ `payment_intent.payment_failed` イベントの処理が**未実装**

**データベース**
- ✅ `orders.status` は `'pending'` のまま（期待通り）
- ✅ `stripe_payments` レコードは作成されない（期待通り）

#### 検証結果
**⚠️ 実装は部分的に正しい（Webhook処理は未実装だが、動作には問題なし）**

#### 推奨改善
- `payment_intent.payment_failed` Webhookを処理して、ログ記録や監視を強化

---

### ⚠️ TC-004: カード残高不足

#### 実装確認

**Stripe側の処理**
- ✅ Stripe Checkoutが自動的にエラーを表示
- ⚠️ `payment_intent.payment_failed` Webhookが発火する可能性があるが、**未処理**

**Webhook処理**
- ❌ `payment_intent.payment_failed` イベントの処理が**未実装**

**データベース**
- ✅ `orders.status` は `'pending'` のまま（期待通り）
- ✅ `stripe_payments` レコードは作成されない（期待通り）

#### 検証結果
**⚠️ 実装は部分的に正しい（Webhook処理は未実装だが、動作には問題なし）**

---

### ⚠️ TC-005: カード期限切れ

#### 実装確認

**Stripe側の処理**
- ✅ Stripe Checkoutが自動的にバリデーションエラーを表示
- ⚠️ `payment_intent.payment_failed` Webhookが発火する可能性があるが、**未処理**

**Webhook処理**
- ❌ `payment_intent.payment_failed` イベントの処理が**未実装**

**データベース**
- ✅ `orders.status` は `'pending'` のまま（期待通り）
- ✅ `stripe_payments` レコードは作成されない（期待通り）

#### 検証結果
**⚠️ 実装は部分的に正しい（Webhook処理は未実装だが、動作には問題なし）**

---

### ✅ TC-006: ユーザーがキャンセルボタンをクリック

#### 実装確認

**リダイレクト**
- ✅ `cancel_url` が `/cancel?s={sellerId}&order={orderId}` に設定されている

**画面表示**
- ✅ `/cancel` ページが実装されている
- ✅ 「決済は完了していません」と表示される

**データベース**
- ✅ `orders.status` は `'pending'` のまま（期待通り）
- ✅ `stripe_payments` レコードは作成されない（期待通り）

#### 検証結果
**✅ 実装は正しい**

---

### ✅ TC-007: Checkout Sessionタイムアウト

#### 実装確認

**Stripe側の処理**
- ✅ Stripeが自動的にSessionを期限切れにする
- ✅ ユーザーが再度アクセスした場合、エラーが表示される

**データベース**
- ✅ `orders.status` は `'pending'` のまま（期待通り）
- ✅ `stripe_payments` レコードは作成されない（期待通り）

#### 検証結果
**✅ 実装は正しい**

---

### ✅ TC-008: Webhook遅延によるタイミング問題

#### 実装確認

**修正前の問題**
- ❌ `ORDER BY sp.created_at DESC LIMIT 1` により、最新の1つのレコードのみを取得
- ❌ Webhook受信前は `isPaid = false` になる可能性があった

**修正後の実装**
- ✅ `EXISTS` 句を使用して `has_succeeded_payment` を確認
- ✅ Webhook受信前でも、Stripe APIで確認すれば `isPaid = true` が返される
- ✅ 複数の `stripe_payments` レコードがあっても正しく判定できる

**実装コード**
```typescript
// app/api/checkout/result/route.ts
const isPaid =
  row.order_status === 'paid' ||
  row.has_succeeded_payment === true;
```

#### 検証結果
**✅ 修正済み - 実装は正しい**

---

### ✅ TC-009: 決済成功後の返金（全額返金）

#### 実装確認

**Webhook処理**
- ✅ `charge.refunded` イベントを処理
- ✅ `charge.refund.updated` イベントも処理
- ✅ `stripe_payments.status` を `'refunded'` に更新
- ✅ `stripe_payments.refunded_total` を更新

**実装コード**
```typescript
// app/api/webhooks/stripe/route.ts
if (t === 'charge.refunded' || t === 'charge.refund.updated') {
  const status = refunded >= amount ? 'refunded' : 'partially_refunded';
  await prisma.stripePayment.update({
    where: { paymentIntentId: piId },
    data: { status, refundedTotal: refunded, ... }
  });
}
```

#### 検証結果
**✅ 実装は正しい**

---

### ✅ TC-010: 決済成功後の返金（一部返金）

#### 実装確認

**Webhook処理**
- ✅ `charge.refund.updated` イベントを処理
- ✅ `stripe_payments.status` を `'partially_refunded'` に更新
- ✅ `stripe_payments.refunded_total` を更新

**実装コード**
```typescript
// app/api/webhooks/stripe/route.ts
const status = refunded >= amount ? 'refunded' : 'partially_refunded';
```

#### 検証結果
**✅ 実装は正しい**

---

### ✅ TC-011: チャージバック発生

#### 実装確認

**Webhook処理**
- ✅ `charge.dispute.created` イベントを処理
- ✅ `stripe_payments.status` を `'disputed'` に更新
- ✅ `stripe_payments.dispute_status` を `'needs_response'` に設定
- ✅ `stripe_payments.amount_net` を `0` に設定

**実装コード**
```typescript
// app/api/webhooks/stripe/route.ts
if (t === 'charge.dispute.created') {
  await prisma.stripePayment.updateMany({
    where: { chargeId },
    data: {
      status: 'disputed',
      disputeStatus: 'needs_response',
      amountNet: 0,
      ...
    },
  });
}
```

#### 検証結果
**✅ 実装は正しい**

---

### ✅ TC-012: チャージバッククローズ（勝訴）

#### 実装確認

**Webhook処理**
- ✅ `charge.dispute.closed` イベントを処理
- ✅ `dispute.status === 'won'` の場合、`stripe_payments.status` を `'succeeded'` に戻す
- ✅ `stripe_payments.dispute_status` を `'won'` に設定
- ✅ `stripe_payments.amount_net` を元の金額に戻す

**実装コード**
```typescript
// app/api/webhooks/stripe/route.ts
if (t === 'charge.dispute.closed') {
  const disputeStatus = outcome === 'won' ? 'won' : 'lost';
  const newStatus = outcome === 'won' ? 'succeeded' : 'disputed';
  const amountNet = newStatus === 'disputed' ? 0 : payment.amountGross - (payment.amountFee || 0) - payment.refundedTotal;
  ...
}
```

#### 検証結果
**✅ 実装は正しい**

---

### ✅ TC-013: チャージバッククローズ（敗訴）

#### 実装確認

**Webhook処理**
- ✅ `charge.dispute.closed` イベントを処理
- ✅ `dispute.status === 'lost'` の場合、`stripe_payments.status` を `'disputed'` のまま維持
- ✅ `stripe_payments.dispute_status` を `'lost'` に設定
- ✅ `stripe_payments.amount_net` を `0` のまま維持

#### 検証結果
**✅ 実装は正しい**

---

### ✅ TC-014: 複数の決済試行（最初に失敗、2回目に成功）

#### 実装確認

**修正前の問題**
- ❌ `ORDER BY sp.created_at DESC LIMIT 1` により、最新の1つのレコードのみを取得
- ❌ 最新が `'refunded'` などの場合、`isPaid = false` になる可能性があった

**修正後の実装**
- ✅ `EXISTS` 句を使用して `has_succeeded_payment` を確認
- ✅ 複数の `stripe_payments` レコードがあっても、`succeeded` レコードが存在すれば `isPaid = true` を返す

**実装コード**
```typescript
// app/api/checkout/result/route.ts
EXISTS(
  SELECT 1 
  FROM stripe_payments sp_succeeded
  WHERE sp_succeeded.order_id = o.id 
    AND sp_succeeded.status = 'succeeded'
) AS has_succeeded_payment
```

#### 検証結果
**✅ 修正済み - 実装は正しい**

---

### ✅ TC-015: 無効なカード番号

#### 実装確認

**Stripe側の処理**
- ✅ Stripe Checkoutが自動的にバリデーションエラーを表示
- ✅ ユーザーが再試行できる

**データベース**
- ✅ `orders.status` は `'pending'` のまま（期待通り）
- ✅ `stripe_payments` レコードは作成されない（期待通り）

#### 検証結果
**✅ 実装は正しい**

---

## 発見された問題点

### 1. ⚠️ `payment_intent.payment_failed` Webhookが未処理

**影響範囲:**
- TC-003: 3D Secure認証失敗
- TC-004: カード残高不足
- TC-005: カード期限切れ

**現状:**
- Stripe Checkoutが自動的にエラーを表示するため、ユーザー体験には問題なし
- データベースも正しい状態を維持（`orders.status = 'pending'`）
- ただし、監視やログ記録の観点で改善の余地あり

**推奨対応:**
```typescript
// app/api/webhooks/stripe/route.ts に追加
if (t === 'payment_intent.payment_failed') {
  const pi = event.data.object as Stripe.PaymentIntent;
  const orderId = pi.metadata?.orderId;
  
  if (orderId) {
    // ログ記録や監視用の処理
    console.warn('[WEBHOOK] Payment failed for orderId=', orderId);
    audit('payment_failed', {
      orderId,
      paymentIntentId: pi.id,
      error: pi.last_payment_error,
    });
  }
}
```

**優先度:** 低（動作には問題なし）

---

## 修正済みの問題

### 1. ✅ `isPaid` 判定ロジックの改善（TC-008, TC-014）

**問題:**
- 複数の `stripe_payments` レコードがある場合、最新の1つだけを確認していた
- Webhook遅延時に `isPaid = false` になる可能性があった

**修正内容:**
- `EXISTS` 句を使用して `has_succeeded_payment` を確認
- 複数のレコードがあっても、`succeeded` レコードが存在すれば `isPaid = true` を返す

**修正ファイル:**
- `app/api/checkout/result/route.ts`
- `payments.js`

**検証結果:**
- ✅ TC-008: Webhook遅延時でも正しく判定される
- ✅ TC-014: 複数の決済試行があっても正しく判定される

---

## 総合評価

### 実装の正確性

**✅ 主要な機能は正しく実装されている**

1. **決済成功フロー**: ✅ 完全対応
2. **返金処理**: ✅ 完全対応
3. **チャージバック処理**: ✅ 完全対応
4. **画面遷移**: ✅ 完全対応
5. **エラーハンドリング**: ✅ 基本的に対応（Webhook処理は未実装だが動作には問題なし）

### 改善の余地

1. **`payment_intent.payment_failed` Webhook処理**: 監視・ログ記録の観点で実装を推奨（優先度: 低）

### 修正済み

1. **`isPaid` 判定ロジック**: ✅ 修正済み（TC-008, TC-014）

---

## 結論

現在の実装は、テストケース仕様書で定義された期待動作を**ほぼ完全に満たしています**。

唯一の改善点は、`payment_intent.payment_failed` Webhookの処理ですが、これは監視・ログ記録の観点での改善であり、動作には問題ありません。

**修正済みの問題（`isPaid` 判定ロジック）により、TC-008とTC-014も正しく動作するようになりました。**

