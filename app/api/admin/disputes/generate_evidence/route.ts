// app/api/admin/disputes/generate_evidence/route.ts
// チャージバック証拠生成API（証拠を生成するが提出はしない）

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
    const { payment_intent_id } = body;

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
        chargeId: true,
        orderId: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: 'payment_not_found' },
        { status: 404 }
      );
    }

    if (!payment.chargeId) {
      return NextResponse.json(
        { ok: false, error: 'charge_not_found', message: 'Charge IDが見つかりません' },
        { status: 400 }
      );
    }

    // Disputeを取得
    const disputes = await stripe.disputes.list({
      charge: payment.chargeId,
      limit: 1,
    });

    if (disputes.data.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'dispute_not_found', message: 'チャージバックが見つかりません' },
        { status: 404 }
      );
    }

    const dispute = disputes.data[0];

    // 注文情報を取得して証拠を生成
    let evidence: any = {};

    if (payment.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: {
          summary: true,
          createdAt: true,
          orderItems: {
            select: {
              name: true,
              quantity: true,
              unitPrice: true,
            },
          },
          images: {
            select: {
              url: true,
            },
            take: 1,
          },
        },
      });

      if (order) {
        // 商品説明
        if (order.summary) {
          evidence.product_description = order.summary;
        }

        // 商品名
        if (order.orderItems.length > 0) {
          const itemNames = order.orderItems.map(item => `${item.name} x${item.quantity}`).join(', ');
          evidence.product_description = evidence.product_description 
            ? `${evidence.product_description}\n\n商品: ${itemNames}`
            : `商品: ${itemNames}`;
        }

        // 配送日時（注文作成日時）
        if (order.createdAt) {
          evidence.shipping_date = Math.floor(order.createdAt.getTime() / 1000);
        }

        // 商品画像
        if (order.images.length > 0) {
          evidence.product_image = order.images[0].url;
        }

        // 配送先住所
        evidence.shipping_address = '配送先情報は注文データに含まれています';
      }
    }

    // その他の証拠情報
    evidence.customer_communication = 'お客様とのコミュニケーション記録は管理画面で確認できます。';
    evidence.uncategorized_text = 'この取引は正常に完了しており、商品も配送済みです。';

    // Stripeに証拠を保存（提出はしない）
    const updatedDispute = await stripe.disputes.update(dispute.id, {
      evidence: evidence,
      // submit: false を指定しない（デフォルトで提出しない）
    });

    audit('dispute_evidence_generated', {
      paymentIntentId: payment_intent_id,
      disputeId: dispute.id,
      sellerId: payment.sellerId,
    });

    return NextResponse.json({
      ok: true,
      dispute: {
        id: updatedDispute.id,
        status: updatedDispute.status,
        evidence: {
          generated: true,
          submitted: false,
        },
      },
    });
  } catch (error: any) {
    console.error('[GENERATE EVIDENCE API] error:', error);

    // Stripe APIエラーのハンドリング
    if (error.type === 'StripeAPIError') {
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

