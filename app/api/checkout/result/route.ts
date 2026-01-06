// app/api/checkout/result/route.ts
// Phase 2.3: Next.js画面移行（チェックアウト結果取得API Route Handler）

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/utils';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
  apiVersion: '2025-10-29.clover'
});

// Stripe API呼び出しのレート制限: 同じorderIdに対して10秒に1回まで
const STRIPE_CHECK_INTERVAL_MS = 10000; // 10秒
const lastStripeCheck = new Map<string, number>();

// Force dynamic rendering (this route uses request.url)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id_required' },
        { status: 400 }
      );
    }

    // 修正: succeededレコードが存在するかどうかを確認するため、
    // 最新のstripe_paymentsレコードと、succeededレコードの存在を別々に取得
    const result = await prisma.$queryRaw`
      SELECT
        o.id            AS order_id,
        o.seller_id,
        o.amount,
        o.status       AS order_status,
        o.stripe_sid,
        o.created_at,
        -- 最新のstripe_paymentsレコード（金額表示用）
        sp_latest.status      AS payment_status,
        sp_latest.amount_gross,
        sp_latest.amount_net,
        sp_latest.currency,
        sp_latest.created_at  AS paid_at,
        -- succeededレコードが存在するかどうか（isPaid判定用）
        EXISTS(
          SELECT 1 
          FROM stripe_payments sp_succeeded
          WHERE sp_succeeded.order_id = o.id 
            AND sp_succeeded.status = 'succeeded'
        ) AS has_succeeded_payment,
        -- Webhook受信済みかどうか（stripe_paymentsレコードの存在で判定）
        EXISTS(
          SELECT 1 
          FROM stripe_payments sp_any
          WHERE sp_any.order_id = o.id
        ) AS webhook_received
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT *
        FROM stripe_payments
        WHERE order_id = o.id
        ORDER BY created_at DESC
        LIMIT 1
      ) sp_latest ON true
      WHERE o.id = ${orderId}::uuid
        AND o.deleted_at IS NULL
      LIMIT 1
    `;

    const row = (result as Array<Record<string, unknown>>)[0];

    if (!row) {
      return NextResponse.json(
        { error: 'order_not_found' },
        { status: 404 }
      );
    }

    // 修正: orders.status = 'paid' または succeededレコードが存在する場合にisPaid = true
    // これにより、複数のstripe_paymentsレコードがある場合でも正しく判定できる
    let isPaid =
      row.order_status === 'paid' ||
      row.has_succeeded_payment === true;

    // Webhook受信済みかどうか
    const webhookReceived = row.webhook_received === true;

    // Webhook未受信で決済が完了していない場合、Stripe APIで直接確認
    // ただし、10秒に1回までに制限（レート制限対策）
    console.log(`[Checkout Result] orderId=${orderId}, isPaid=${isPaid}, webhookReceived=${webhookReceived}, stripe_sid=${row.stripe_sid || 'null'}`);
    
    if (!isPaid && !webhookReceived && row.stripe_sid) {
      const now = Date.now();
      const lastCheck = lastStripeCheck.get(orderId);
      const timeSinceLastCheck = lastCheck ? now - lastCheck : Infinity;
      
      // 10秒以内にチェック済みの場合はスキップ
      if (lastCheck && timeSinceLastCheck < STRIPE_CHECK_INTERVAL_MS) {
        // 前回のチェック時刻を返す（デバッグ用）
        console.log(`[Stripe API] Skipping check for orderId=${orderId}, last check was ${Math.round(timeSinceLastCheck / 1000)}s ago`);
        // 実際の処理はスキップ
      } else {
        // チェック時刻を更新
        lastStripeCheck.set(orderId, now);
        console.log(`[Stripe API] Checking payment status for orderId=${orderId}, stripe_sid=${row.stripe_sid}`);
        
        // 古いエントリをクリーンアップ（メモリリーク防止）
        // 1時間以上古いエントリを削除
        const oneHourAgo = now - 3600000;
        for (const [key, timestamp] of lastStripeCheck.entries()) {
          if (timestamp < oneHourAgo) {
            lastStripeCheck.delete(key);
          }
        }
        
        try {
          const stripeSid = row.stripe_sid as string;
          
          // Checkout Session IDかPaymentIntent IDかを判定して確認
          // Checkout Session IDは "cs_" で始まる
          if (stripeSid.startsWith('cs_')) {
            // Checkout Sessionを確認
            console.log(`[Stripe API] Retrieving Checkout Session: ${stripeSid}`);
            const session = await stripe.checkout.sessions.retrieve(stripeSid);
            console.log(`[Stripe API] Session status: ${session.status}, payment_status: ${session.payment_status}`);
            
            if (session.payment_status === 'paid' && session.status === 'complete') {
              // 決済が成功している場合、PaymentIntentを取得してデータベースを更新
              if (session.payment_intent) {
                const paymentIntentId = typeof session.payment_intent === 'string' 
                  ? session.payment_intent 
                  : session.payment_intent.id;
                
              const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
              console.log(`[Stripe API] PaymentIntent status: ${pi.status}`);
              
              if (pi.status === 'succeeded') {
                console.log(`[Stripe API] Payment succeeded! Updating database for orderId=${orderId}`);
                  const sellerId = row.seller_id as string;
                  const amountGross = pi.amount;
                  const amountFee = pi.application_fee_amount || 0;
                  const amountNet = amountGross - amountFee;
                  const currency = pi.currency || 'jpy';
                  
                  // データベースを更新
                  await prisma.$executeRaw`
                    UPDATE orders 
                    SET status = 'paid', updated_at = NOW()
                    WHERE id = ${orderId}::uuid
                  `;
                  
                  // stripe_paymentsレコードを作成
                  await prisma.$executeRaw`
                    INSERT INTO stripe_payments (
                      id, seller_id, order_id, payment_intent_id, status, amount_gross, amount_fee, amount_net, currency, created_at
                    )
                    VALUES (
                      gen_random_uuid(),
                      ${sellerId},
                      ${orderId}::uuid,
                      ${paymentIntentId},
                      'succeeded',
                      ${amountGross},
                      ${amountFee},
                      ${amountNet},
                      ${currency},
                      NOW()
                    )
                  ON CONFLICT (payment_intent_id) DO NOTHING
                `;
                
                console.log(`[Stripe API] Database updated successfully for orderId=${orderId}`);
                isPaid = true;
                
                // データベース更新後、最新の状態を再取得して確認
                const updatedResult = await prisma.$queryRaw`
                  SELECT
                    o.status AS order_status,
                    EXISTS(
                      SELECT 1 
                      FROM stripe_payments sp_succeeded
                      WHERE sp_succeeded.order_id = o.id 
                        AND sp_succeeded.status = 'succeeded'
                    ) AS has_succeeded_payment
                  FROM orders o
                  WHERE o.id = ${orderId}::uuid
                  LIMIT 1
                `;
                const updatedRow = (updatedResult as Array<Record<string, unknown>>)[0];
                if (updatedRow) {
                  isPaid = updatedRow.order_status === 'paid' || updatedRow.has_succeeded_payment === true;
                  console.log(`[Stripe API] Verified database update: isPaid=${isPaid}`);
                }
              }
            }
          }
        } else if (stripeSid.startsWith('pi_')) {
            // PaymentIntent IDを直接確認
            console.log(`[Stripe API] Retrieving PaymentIntent: ${stripeSid}`);
            const pi = await stripe.paymentIntents.retrieve(stripeSid);
            console.log(`[Stripe API] PaymentIntent status: ${pi.status}`);
            
            if (pi.status === 'succeeded') {
              console.log(`[Stripe API] Payment succeeded! Updating database for orderId=${orderId}`);
              const sellerId = row.seller_id as string;
              const amountGross = pi.amount;
              const amountFee = pi.application_fee_amount || 0;
              const amountNet = amountGross - amountFee;
              const currency = pi.currency || 'jpy';
              
              // データベースを更新
              await prisma.$executeRaw`
                UPDATE orders 
                SET status = 'paid', updated_at = NOW()
                WHERE id = ${orderId}::uuid
              `;
              
              // stripe_paymentsレコードを作成
              await prisma.$executeRaw`
                INSERT INTO stripe_payments (
                  id, seller_id, order_id, payment_intent_id, status, amount_gross, amount_fee, amount_net, currency, created_at
                )
                VALUES (
                  gen_random_uuid(),
                  ${sellerId},
                  ${orderId}::uuid,
                  ${stripeSid},
                  'succeeded',
                  ${amountGross},
                  ${amountFee},
                  ${amountNet},
                  ${currency},
                  NOW()
                )
                ON CONFLICT (payment_intent_id) DO NOTHING
              `;
              
              console.log(`[Stripe API] Database updated successfully for orderId=${orderId}`);
              isPaid = true;
              
              // データベース更新後、最新の状態を再取得して確認
              const updatedResult = await prisma.$queryRaw`
                SELECT
                  o.status AS order_status,
                  EXISTS(
                    SELECT 1 
                    FROM stripe_payments sp_succeeded
                    WHERE sp_succeeded.order_id = o.id 
                      AND sp_succeeded.status = 'succeeded'
                  ) AS has_succeeded_payment
                FROM orders o
                WHERE o.id = ${orderId}::uuid
                LIMIT 1
              `;
              const updatedRow = (updatedResult as Array<Record<string, unknown>>)[0];
              if (updatedRow) {
                isPaid = updatedRow.order_status === 'paid' || updatedRow.has_succeeded_payment === true;
                console.log(`[Stripe API] Verified database update: isPaid=${isPaid}`);
              }
            }
          }
        } catch (stripeError) {
          // Stripe APIエラーはログに記録するが、処理は続行
          console.error(`[Stripe API] Error checking payment for orderId=${orderId}:`, stripeError);
          if (stripeError instanceof Error) {
            console.error(`[Stripe API] Error message: ${stripeError.message}`);
            console.error(`[Stripe API] Error stack: ${stripeError.stack}`);
          }
        }
      }
    }

    return NextResponse.json({
      orderId: row.order_id,
      sellerId: row.seller_id,
      amount: row.amount,
      currency: row.currency || 'jpy',
      orderStatus: row.order_status,
      paymentStatus: row.payment_status || null,
      isPaid,
      webhookReceived,
      paidAt: row.paid_at
    });
  } catch (e) {
    console.error('/api/checkout/result error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

