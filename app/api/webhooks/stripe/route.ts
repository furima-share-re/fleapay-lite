// app/api/webhooks/stripe/route.ts
// Phase 2.6: Express.js廃止 - Stripe Webhook移行

import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/utils';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

// Next.jsではraw bodyを取得するために特別な処理が必要
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.warn('[WEBHOOK] hit /api/webhooks/stripe');

    // Raw bodyを取得
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      if (process.env.SKIP_WEBHOOK_VERIFY === '1') {
        // テスト用: 署名検証をスキップ
        console.warn('[WEBHOOK] SKIP_WEBHOOK_VERIFY=1, raw body =', body);
        event = JSON.parse(body) as Stripe.Event;
      } else {
        // 通常ルート: 署名検証あり
        event = stripe.webhooks.constructEvent(
          body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET || ''
        );
      }
    } catch (err: unknown) {
      console.error('[WEBHOOK] construct error', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { error: `Webhook Error: ${message}` },
        { status: 400 }
      );
    }

    try {
      const t = event.type;
      console.warn('[WEBHOOK] event.type =', t);

      // 🟢 決済成功時にUPSERTパターンを使用（Race Condition回避）
      if (t === 'payment_intent.succeeded') {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(
          '[WEBHOOK] payment_intent.succeeded pi.id=',
          pi.id,
          'sellerId=',
          pi.metadata?.sellerId,
          'orderId=',
          pi.metadata?.orderId
        );

        const sellerId = pi.metadata?.sellerId || '';
        const orderId = pi.metadata?.orderId || null;

        if (!sellerId) {
          console.warn('[WEBHOOK] pi.succeeded without sellerId, skip', pi.id);
        } else {
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
              console.warn('[WEBHOOK] Fetching charge info for chargeId=', chargeId);
              const charge = await stripe.charges.retrieve(chargeId);
              balanceTxId =
                typeof charge.balance_transaction === 'string'
                  ? charge.balance_transaction
                  : null;

              if (balanceTxId) {
                console.warn(
                  '[WEBHOOK] Fetching balance transaction for balanceTxId=',
                  balanceTxId
                );
                const balanceTx = await stripe.balanceTransactions.retrieve(
                  balanceTxId
                );
                fee = balanceTx.fee || 0;
                console.warn('[WEBHOOK] Retrieved fee=', fee);
              }
            } catch (stripeErr) {
              console.error(
                '[WEBHOOK] Failed to retrieve charge/balance info',
                stripeErr
              );
            }
          }

          const netAmount = fee !== null ? amount - fee : amount;

          console.warn(
            '[WEBHOOK] Upserting payment: amount=',
            amount,
            'fee=',
            fee,
            'netAmount=',
            netAmount
          );

          // ✅ UPSERTパターン（ON CONFLICT）
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
              rawEvent: JSON.parse(JSON.stringify(event)) as unknown as Prisma.InputJsonValue,
            },
            update: {
              chargeId: chargeId || undefined,
              balanceTxId: balanceTxId || undefined,
              amountGross: amount,
              amountFee: fee !== null ? fee : undefined,
              amountNet: netAmount,
              status: 'succeeded',
              rawEvent: JSON.parse(JSON.stringify(event)) as unknown as Prisma.InputJsonValue,
              updatedAt: new Date(),
            },
          });

          console.warn('[WEBHOOK] Payment upserted successfully for pi.id=', pi.id);

          // ordersテーブルのステータス更新
          if (orderId) {
            console.warn('[WEBHOOK] Updating order status for orderId=', orderId);
            await prisma.order.update({
              where: { id: orderId },
              data: {
                status: 'paid',
                stripeSid: pi.id,
                updatedAt: new Date(),
              },
            });
            console.warn(
              '[WEBHOOK] Order status updated to "paid" for orderId=',
              orderId
            );
          }

          audit('pi_succeeded', {
            sellerId,
            orderId,
            pi: pi.id,
            amount,
            fee,
            netAmount,
          });
          console.warn('[WEBHOOK] Audit log created for pi_succeeded');
        }
      }

      // --- 返金: charge.refunded ---
      if (t === 'charge.refunded' || t === 'charge.refund.updated') {
        console.warn('[WEBHOOK] Processing refund event:', t);
        const ch = event.data.object as Stripe.Charge;
        const piId =
          typeof ch.payment_intent === 'string' ? ch.payment_intent : null;
        const amount = typeof ch.amount === 'number' ? ch.amount : 0;
        const refunded =
          typeof ch.amount_refunded === 'number' ? ch.amount_refunded : 0;

        console.warn(
          '[WEBHOOK] Refund details: piId=',
          piId,
          'amount=',
          amount,
          'refunded=',
          refunded
        );

        let fee = 0;
        const balanceTxId =
          typeof ch.balance_transaction === 'string'
            ? ch.balance_transaction
            : null;
        if (balanceTxId) {
          try {
            console.warn(
              '[WEBHOOK] Fetching balance transaction for refund, balanceTxId=',
              balanceTxId
            );
            const balanceTx = await stripe.balanceTransactions.retrieve(
              balanceTxId
            );
            fee = balanceTx.fee || 0;
            console.warn('[WEBHOOK] Refund fee retrieved:', fee);
          } catch (stripeErr) {
            console.error(
              '[WEBHOOK] Failed to retrieve balance transaction for refund',
              stripeErr
            );
          }
        }

        const net = Math.max(amount - refunded - fee, 0);
        const status = refunded >= amount ? 'refunded' : 'partially_refunded';

        console.warn('[WEBHOOK] Calculated net=', net, 'status=', status);

        if (piId) {
          const payment = await prisma.stripePayment.findUnique({
            where: { paymentIntentId: piId },
            select: { sellerId: true },
          });

          if (!payment) {
            console.warn('[WEBHOOK] refund for unknown pi', piId);
          } else {
            await prisma.stripePayment.update({
              where: { paymentIntentId: piId },
              data: {
                amountGross: amount,
                amountFee: fee,
                amountNet: net,
                refundedTotal: refunded,
                status,
                chargeId: ch.id,
                rawEvent: JSON.parse(JSON.stringify(event)) as unknown as Prisma.InputJsonValue,
                updatedAt: new Date(),
              },
            });

            console.warn('[WEBHOOK] Refund updated successfully for piId=', piId);
            audit('charge_refund', {
              pi: piId,
              amount,
              refunded,
              fee,
              net,
              status,
            });
          }
        }
      }

      // --- チャージバック発生: charge.dispute.created ---
      if (t === 'charge.dispute.created') {
        console.warn('[WEBHOOK] Processing charge.dispute.created');
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === 'string' ? dispute.charge : null;

        console.warn('[WEBHOOK] Dispute created for chargeId=', chargeId);

        if (chargeId) {
          const payment = await prisma.stripePayment.findFirst({
            where: { chargeId },
            select: { sellerId: true, paymentIntentId: true },
          });

          if (!payment) {
            console.warn(
              '[WEBHOOK] dispute.created: no payment for charge',
              chargeId
            );
          } else {
            await prisma.stripePayment.updateMany({
              where: { chargeId },
              data: {
                status: 'disputed',
                disputeStatus: 'needs_response',
                amountNet: 0,
                rawEvent: JSON.parse(JSON.stringify(event)) as unknown as Prisma.InputJsonValue,
                updatedAt: new Date(),
              },
            });

            console.warn(
              '[WEBHOOK] Dispute recorded for sellerId=',
              payment.sellerId,
              'pi=',
              payment.paymentIntentId
            );
            audit('dispute_created', {
              sellerId: payment.sellerId,
              pi: payment.paymentIntentId,
            });
          }
        }
      }

      // --- チャージバッククローズ: charge.dispute.closed ---
      if (t === 'charge.dispute.closed') {
        console.warn('[WEBHOOK] Processing charge.dispute.closed');
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === 'string' ? dispute.charge : null;
        const outcome = dispute.status;

        console.warn(
          '[WEBHOOK] Dispute closed for chargeId=',
          chargeId,
          'outcome=',
          outcome
        );

        if (chargeId) {
          const disputeStatus = outcome === 'won' ? 'won' : 'lost';
          const newStatus = outcome === 'won' ? 'succeeded' : 'disputed';

          const payment = await prisma.stripePayment.findFirst({
            where: { chargeId },
            select: {
              sellerId: true,
              paymentIntentId: true,
              amountGross: true,
              amountFee: true,
              refundedTotal: true,
            },
          });

          if (!payment) {
            console.warn(
              '[WEBHOOK] dispute.closed: no payment for charge',
              chargeId
            );
          } else {
            const amountNet =
              newStatus === 'disputed'
                ? 0
                : payment.amountGross -
                  (payment.amountFee || 0) -
                  payment.refundedTotal;

            await prisma.stripePayment.updateMany({
              where: { chargeId },
              data: {
                status: newStatus,
                disputeStatus,
                amountNet,
                rawEvent: JSON.parse(JSON.stringify(event)) as unknown as Prisma.InputJsonValue,
                updatedAt: new Date(),
              },
            });

            console.warn('[WEBHOOK] Dispute closed successfully, status=', newStatus);
            audit('dispute_closed', {
              sellerId: payment.sellerId,
              pi: payment.paymentIntentId,
              status: newStatus,
            });
          }
        }
      }

      console.warn(
        '[WEBHOOK] Event processing completed successfully for event.type=',
        t
      );
      return NextResponse.json({ received: true });
    } catch (err) {
      console.error('[WEBHOOK] handler error', err);
      return NextResponse.json({ error: 'handler error' }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('[WEBHOOK] error', error);
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    );
  } finally {
  }
}

