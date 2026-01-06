// scripts/cleanup-incomplete-stripe.ts
// Phase 4: 未完了Stripe決済の自動クリーンアップ
// 24時間以上経過した未完了のStripe決済をキャンセル

import { prisma } from '@/lib/prisma';

export async function cleanupIncompleteStripeOrders() {
  try {
    const result = await prisma.$queryRaw<Array<{
      order_no: number;
      amount: number;
      created_at: Date;
    }>>`
      UPDATE orders o
      SET 
        status = 'cancelled',
        updated_at = now()
      FROM order_metadata om
      WHERE o.id = om.order_id
        AND om.payment_state = 'stripe_pending'
        AND o.created_at < now() - interval '24 hours'
        AND o.deleted_at IS NULL
      RETURNING o.order_no, o.amount, o.created_at
    `;

    console.log(`✅ Cancelled ${result.length} incomplete Stripe orders:`, result);
    
    return result;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Cron jobから実行
if (require.main === module) {
  cleanupIncompleteStripeOrders()
    .then(() => {
      console.log('Cleanup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

