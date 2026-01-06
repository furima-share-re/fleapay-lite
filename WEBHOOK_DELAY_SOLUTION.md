# Webhook遅延への対処方法

## 問題の概要

Stripe Checkout Sessionが成功して`/success`ページにリダイレクトされた時点で、Webhookがまだ受信されていない場合、以下の問題が発生します：

1. `stripe_payments`レコードがまだ作成されていない
2. `orders.status`がまだ`'paid'`に更新されていない
3. `/api/checkout/result`で`isPaid = false`になる
4. `/success`ページで`/cancel`にリダイレクトされる（誤った動作）

## 対処方法

### アプローチ1: Stripe APIで直接確認（推奨）

**概要**: `/api/checkout/result`でDBに記録がない場合、Stripe APIで直接Checkout SessionとPaymentIntentの状態を確認し、成功している場合はDBを更新する。

**メリット**:
- Webhook遅延の影響を受けない
- ユーザー体験が向上（誤ったリダイレクトを防ぐ）
- 確実性が高い（Stripe APIは信頼できる）

**デメリット**:
- Stripe API呼び出しが増える（ただし、Webhook遅延時のみ）
- 実装がやや複雑

### アプローチ2: ポーリング（非推奨）

**概要**: フロントエンドで一定時間ポーリングして、Webhookの到着を待つ。

**デメリット**:
- UXが悪い（ローディング表示が必要）
- サーバー負荷が増える
- タイムアウト処理が必要

### アプローチ3: 現状維持（非推奨）

**概要**: Webhook遅延を受け入れる。

**デメリット**:
- ユーザー体験が悪い（誤ったリダイレクト）
- 問題が継続する

## 推奨実装: アプローチ1

### 実装手順

#### 1. Checkout Session IDを保存する

`app/api/checkout/session/route.ts`で、Checkout Session作成時に`orders.stripe_sid`に`session.id`を保存する。

```typescript
// app/api/checkout/session/route.ts
const session = await stripe.checkout.sessions.create(sessionParams);

// Checkout Session IDを保存
await prisma.order.update({
  where: { id: order.id },
  data: {
    stripeSid: session.id, // Checkout Session IDを保存
    updatedAt: new Date(),
  },
});

return NextResponse.json({ url: session.url, sessionId: session.id });
```

**注意**: Webhookでは`stripe_sid`にPaymentIntent IDを保存しているため、Checkout Session IDとPaymentIntent IDの両方を保存する必要がある場合は、別カラムを追加するか、JSON形式で保存する。

#### 2. `/api/checkout/result`でStripe API確認を追加

`app/api/checkout/result/route.ts`で、DBに記録がない場合にStripe APIで確認する。

```typescript
// app/api/checkout/result/route.ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
  apiVersion: '2025-10-29.clover'
});

export async function GET(request: NextRequest) {
  // ... 既存のコード ...
  
  const isPaid =
    row.order_status === 'paid' ||
    row.has_succeeded_payment === true;

  // Webhook遅延対応: DBに記録がない場合、Stripe APIで確認
  if (!isPaid && row.stripe_sid) {
    try {
      // Checkout Session IDからCheckout Sessionを取得
      const sessionId = row.stripe_sid as string;
      
      // Checkout Session IDが`cs_`で始まる場合はCheckout Session
      // `pi_`で始まる場合はPaymentIntent ID（Webhookで更新された場合）
      if (sessionId.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent'],
        });
        
        if (session.payment_status === 'paid' && session.payment_intent) {
          const pi = typeof session.payment_intent === 'string'
            ? await stripe.paymentIntents.retrieve(session.payment_intent)
            : session.payment_intent;
          
          if (pi.status === 'succeeded') {
            // Webhook処理と同様の処理を実行
            await syncPaymentFromStripe(pi, orderId);
            isPaid = true;
          }
        }
      } else if (sessionId.startsWith('pi_')) {
        // PaymentIntent IDの場合
        const pi = await stripe.paymentIntents.retrieve(sessionId);
        if (pi.status === 'succeeded') {
          await syncPaymentFromStripe(pi, orderId);
          isPaid = true;
        }
      }
    } catch (stripeErr) {
      console.error('[CHECKOUT/RESULT] Stripe API確認エラー', stripeErr);
      // エラーが発生しても、既存のisPaid判定を返す
    }
  }

  return NextResponse.json({
    // ... 既存のレスポンス ...
    isPaid,
  });
}

// Webhook処理と同様の処理を実行する関数
async function syncPaymentFromStripe(
  pi: Stripe.PaymentIntent,
  orderId: string
) {
  const sellerId = pi.metadata?.sellerId || '';
  if (!sellerId) {
    console.warn('[CHECKOUT/RESULT] pi.succeeded without sellerId, skip', pi.id);
    return;
  }

  const amount =
    typeof pi.amount_received === 'number'
      ? pi.amount_received
      : typeof pi.amount === 'number'
        ? pi.amount
        : 0;
  const currency = pi.currency || 'jpy';
  const chargeId =
    typeof pi.latest_charge === 'string' ? pi.latest_charge : null;

  // Charge情報から手数料を取得
  let fee: number | null = null;
  let balanceTxId: string | null = null;
  if (chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      balanceTxId =
        typeof charge.balance_transaction === 'string'
          ? charge.balance_transaction
          : null;

      if (balanceTxId) {
        const balanceTx = await stripe.balanceTransactions.retrieve(balanceTxId);
        fee = balanceTx.fee || 0;
      }
    } catch (stripeErr) {
      console.error('[CHECKOUT/RESULT] Failed to retrieve charge/balance info', stripeErr);
    }
  }

  const netAmount = fee !== null ? amount - fee : amount;

  // stripe_paymentsレコードを作成または更新
  await prisma.stripePayment.upsert({
    where: { paymentIntentId: pi.id },
    create: {
      sellerId,
      orderId: orderId || null,
      paymentIntentId: pi.id,
      chargeId: chargeId || null,
      balanceTxId: balanceTxId || null,
      amountGross: amount,
      amountFee: fee,
      amountNet: netAmount,
      currency,
      status: 'succeeded',
      refundedTotal: 0,
      rawEvent: null, // Webhookイベントではないためnull
    },
    update: {
      chargeId: chargeId || undefined,
      balanceTxId: balanceTxId || undefined,
      amountGross: amount,
      amountFee: fee !== null ? fee : undefined,
      amountNet: netAmount,
      status: 'succeeded',
      updatedAt: new Date(),
    },
  });

  // ordersテーブルのステータス更新
  if (orderId) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        stripeSid: pi.id, // PaymentIntent IDに更新
        updatedAt: new Date(),
      },
    });

    // order_metadata.payment_state更新
    await prisma.orderMetadata.update({
      where: { orderId: orderId },
      data: {
        paymentState: 'stripe_completed',
        updatedAt: new Date(),
      },
    });
  }
}
```

### 実装の注意点

1. **Checkout Session IDとPaymentIntent IDの区別**
   - Checkout Session ID: `cs_`で始まる
   - PaymentIntent ID: `pi_`で始まる
   - Webhook受信後は`stripe_sid`がPaymentIntent IDに更新される

2. **エラーハンドリング**
   - Stripe API呼び出しが失敗しても、既存の`isPaid`判定を返す
   - ログを記録して、問題を追跡できるようにする

3. **パフォーマンス**
   - Stripe API呼び出しは、DBに記録がない場合のみ実行
   - 通常はWebhookが先に受信されるため、API呼び出しは稀

4. **重複処理の防止**
   - `stripe_payments`の`upsert`を使用して、重複を防止
   - Webhookが後から受信されても、問題なく処理される

## 代替案: Checkout Session IDを別カラムに保存

`orders.stripe_sid`はWebhookでPaymentIntent IDに更新されるため、Checkout Session IDを別カラム（例: `checkout_session_id`）に保存する方法もあります。

**メリット**:
- Checkout Session IDとPaymentIntent IDを区別できる
- 実装が明確

**デメリット**:
- スキーマ変更が必要
- マイグレーションが必要

## まとめ

**推奨**: アプローチ1（Stripe APIで直接確認）を実装する。

**実装優先度**: 中（Webhook遅延が頻繁に発生する場合は重要）

**実装の影響**:
- ユーザー体験が向上（誤ったリダイレクトを防ぐ）
- システムの信頼性が向上
- Stripe API呼び出しが若干増える（ただし、Webhook遅延時のみ）

