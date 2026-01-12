// app/api/admin/payments/refund/route.ts
// 返金APIエンドポイント

import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { payment_intent_id, amount } = body;

    if (!payment_intent_id) {
      return NextResponse.json(
        { ok: false, error: 'payment_intent_id is required' },
        { status: 400 }
      );
    }

    // 決済情報を取得
    const payment = await prisma.stripePayment.findUnique({
      where: { paymentIntentId: payment_intent_id },
      select: {
        id: true,
        sellerId: true,
        amountGross: true,
        refundedTotal: true,
        status: true,
        chargeId: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: 'payment_not_found' },
        { status: 404 }
      );
    }

    // 既に全額返金済みかチェック
    if (payment.status === 'refunded') {
      return NextResponse.json(
        { ok: false, error: 'already_refunded', message: 'この決済は既に全額返金されています' },
        { status: 400 }
      );
    }

    // PaymentIntentを取得してCharge IDを確認
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    const chargeId = 
      typeof paymentIntent.latest_charge === 'string' 
        ? paymentIntent.latest_charge 
        : payment.chargeId;

    if (!chargeId) {
      return NextResponse.json(
        { ok: false, error: 'charge_not_found', message: 'Charge IDが見つかりません' },
        { status: 400 }
      );
    }

    // 返金額を決定（指定がない場合は全額）
    const refundAmount = amount || payment.amountGross - payment.refundedTotal;
    const remainingAmount = payment.amountGross - payment.refundedTotal;

    if (refundAmount <= 0) {
      return NextResponse.json(
        { ok: false, error: 'invalid_amount', message: '返金額が無効です' },
        { status: 400 }
      );
    }

    if (refundAmount > remainingAmount) {
      return NextResponse.json(
        { ok: false, error: 'amount_exceeds_remaining', message: `返金額が残額（${remainingAmount}円）を超えています` },
        { status: 400 }
      );
    }

    // Stripeで返金を実行
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: refundAmount,
      reason: 'requested_by_customer',
    });

    // 返金が成功したら、WebhookでDBが更新されるのを待つ
    // ただし、即座にレスポンスを返すために、ここでもDBを更新
    const newRefundedTotal = payment.refundedTotal + refundAmount;
    const newStatus = newRefundedTotal >= payment.amountGross ? 'refunded' : 'partially_refunded';

    await prisma.stripePayment.update({
      where: { paymentIntentId: payment_intent_id },
      data: {
        refundedTotal: newRefundedTotal,
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    audit('admin_refund', {
      paymentIntentId: payment_intent_id,
      refundId: refund.id,
      amount: refundAmount,
      sellerId: payment.sellerId,
    });

    return NextResponse.json({
      ok: true,
      refund: {
        id: refund.id,
        amount: refundAmount,
        status: refund.status,
      },
      payment: {
        paymentIntentId: payment_intent_id,
        refundedTotal: newRefundedTotal,
        status: newStatus,
      },
    });
  } catch (error: any) {
    console.error('[REFUND API] error:', error);

    // Stripe APIエラーのハンドリング
    if (error.type === 'StripeCardError' || error.type === 'StripeAPIError') {
      if (error.code === 'charge_already_refunded') {
        return NextResponse.json(
          { ok: false, error: 'already_refunded', message: 'この決済は既に返金されています' },
          { status: 400 }
        );
      }
      if (error.code === 'insufficient_funds') {
        return NextResponse.json(
          { ok: false, error: 'insufficient_funds', message: 'Stripeアカウントの残高が不足しています' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: 'stripe_error', message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'internal_error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

