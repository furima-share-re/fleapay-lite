// scripts/daily-integrity-check.ts
// Phase 4: データ整合性チェックバッチ
// 定期実行してデータ整合性を確認

import { prisma } from '@/lib/prisma';

interface IntegrityCheckResult {
  check: string;
  status: 'PASS' | 'FAIL';
  count: number;
  details?: any[];
}

export async function dailyIntegrityCheck(): Promise<IntegrityCheckResult[]> {
  const checks: IntegrityCheckResult[] = [];

  try {
    // チェック1: order_metadataが欠落していないか
    const missingMetadata = await prisma.$queryRaw<Array<{
      order_no: number;
      id: string;
      created_at: Date;
    }>>`
      SELECT o.order_no, o.id, o.created_at
      FROM orders o
      LEFT JOIN order_metadata om ON o.id = om.order_id
      WHERE om.id IS NULL
        AND o.deleted_at IS NULL
    `;

    checks.push({
      check: 'missing_metadata',
      status: missingMetadata.length === 0 ? 'PASS' : 'FAIL',
      count: missingMetadata.length,
      details: missingMetadata
    });

    // チェック2: is_cashがNULLのレコード
    const nullIsCash = await prisma.$queryRaw<Array<{
      order_no: number;
      is_cash: boolean | null;
      created_at: Date;
    }>>`
      SELECT o.order_no, om.is_cash, o.created_at
      FROM orders o
      JOIN order_metadata om ON o.id = om.order_id
      WHERE om.is_cash IS NULL
        AND o.deleted_at IS NULL
    `;

    checks.push({
      check: 'null_is_cash',
      status: nullIsCash.length === 0 ? 'PASS' : 'FAIL',
      count: nullIsCash.length,
      details: nullIsCash
    });

    // チェック3: payment_stateがNULLのレコード
    const nullPaymentState = await prisma.$queryRaw<Array<{
      order_no: number;
      payment_state: string | null;
      created_at: Date;
    }>>`
      SELECT o.order_no, om.payment_state, o.created_at
      FROM orders o
      JOIN order_metadata om ON o.id = om.order_id
      WHERE om.payment_state IS NULL
        AND o.deleted_at IS NULL
    `;

    checks.push({
      check: 'null_payment_state',
      status: nullPaymentState.length === 0 ? 'PASS' : 'FAIL',
      count: nullPaymentState.length,
      details: nullPaymentState
    });

    // チェック4: 整合性チェック(Stripe成功なのにis_cash=true)
    const contradictStripe = await prisma.$queryRaw<Array<{
      order_no: number;
      is_cash: boolean;
      payment_status: string;
      created_at: Date;
    }>>`
      SELECT o.order_no, om.is_cash, sp.status as payment_status, o.created_at
      FROM orders o
      JOIN order_metadata om ON o.id = om.order_id
      JOIN stripe_payments sp ON o.id = sp.order_id
      WHERE om.is_cash = true 
        AND sp.status = 'succeeded'
        AND o.deleted_at IS NULL
    `;

    checks.push({
      check: 'contradict_stripe',
      status: contradictStripe.length === 0 ? 'PASS' : 'FAIL',
      count: contradictStripe.length,
      details: contradictStripe
    });

    // チェック5: payment_stateとis_cashの整合性
    const inconsistentState = await prisma.$queryRaw<Array<{
      order_no: number;
      is_cash: boolean;
      payment_state: string;
      created_at: Date;
    }>>`
      SELECT o.order_no, om.is_cash, om.payment_state, o.created_at
      FROM orders o
      JOIN order_metadata om ON o.id = om.order_id
      WHERE (
        (om.is_cash = true AND om.payment_state != 'cash_completed') OR
        (om.is_cash = false AND om.payment_state NOT IN ('stripe_pending', 'stripe_completed'))
      )
      AND o.deleted_at IS NULL
    `;

    checks.push({
      check: 'inconsistent_payment_state',
      status: inconsistentState.length === 0 ? 'PASS' : 'FAIL',
      count: inconsistentState.length,
      details: inconsistentState
    });

    // 結果をログ出力
    const failedChecks = checks.filter(c => c.status === 'FAIL');
    
    if (failedChecks.length > 0) {
      console.error('❌ Data integrity check FAILED:', failedChecks);
      // Slack通知など
    } else {
      console.log('✅ Data integrity check PASSED');
    }

    return checks;
  } catch (error) {
    console.error('❌ Integrity check failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Cron jobから実行
if (require.main === module) {
  dailyIntegrityCheck()
    .then(() => {
      console.log('Integrity check completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Integrity check failed:', error);
      process.exit(1);
    });
}

