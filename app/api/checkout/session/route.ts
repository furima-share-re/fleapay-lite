// app/api/checkout/session/route.ts
// Phase 2.3: Next.js画面移行（チェックアウトセッション作成API Route Handler）

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Pool } from 'pg';
import { getNextOrderNo, sanitizeError } from '@/lib/utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
  apiVersion: '2025-10-29.clover'
});

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const RATE_LIMIT_MAX_CHECKOUT = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const hits = new Map<string, number[]>();

function bumpAndAllow(key: string, limit: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length <= limit;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sellerId, latest, summary, orderId: bodyOrderId } = body;
    const url = new URL(request.url);
    const orderId = bodyOrderId || url.searchParams.get('order') || '';

    if (!sellerId && !orderId) {
      return NextResponse.json(
        { error: 'seller_id_or_order_id_required' },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    if (!bumpAndAllow(`checkout:${ip}`, RATE_LIMIT_MAX_CHECKOUT)) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429 }
      );
    }

    // orderの取得または作成
    let order;
    if (orderId) {
      const r = await pool.query(
        `SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [orderId]
      );
      if (!r.rowCount || r.rowCount === 0) {
        return NextResponse.json(
          { error: 'order_not_found' },
          { status: 404 }
        );
      }
      order = r.rows[0];
    } else {
      // 新規注文作成
      const amount = latest?.amount || 0;
      const orderNo = await getNextOrderNo(sellerId);
      
      const insertRes = await pool.query(
        `INSERT INTO orders (seller_id, order_no, amount, summary, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [sellerId, orderNo, amount, summary || '']
      );
      order = insertRes.rows[0];
    }

    // 金額バリデーション: 0円以下の注文は決済させない
    if (!order.amount || Number(order.amount) <= 0) {
      console.error('[Checkout] invalid order amount', {
        orderId: order.id,
        amount: order.amount,
      });
      return NextResponse.json(
        {
          error: 'invalid_amount',
          message: '金額が0円のため決済を開始できません。',
        },
        { status: 400 }
      );
    }

    const successUrl = `${BASE_URL}/success.html?order=${order.id}`;
    const cancelUrl = `${BASE_URL}/checkout.html?s=${order.seller_id}&order=${order.id}`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: [
        'card',        // カード / Apple Pay / Google Pay
        'link',        // Stripe Link
        'alipay'       // Alipay
      ],
      locale: 'auto',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: order.summary || '商品',
            },
            unit_amount: order.amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          sellerId: order.seller_id,
          orderId: order.id,
        },
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url, sessionId: session.id });

  } catch (error) {
    console.error('/api/checkout/session エラー発生:', error);
    if (error instanceof Error && 'type' in error && error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        {
          error: 'stripe_error',
          message: error.message,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      sanitizeError(error),
      { status: 500 }
    );
  }
}

