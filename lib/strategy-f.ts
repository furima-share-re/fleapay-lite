/**
 * 戦略F: コミュニティ連動型ダイナミックプライシング
 * Tier制とコミュニティ目標達成判定のロジック
 */

import { PrismaClient } from '@prisma/client';

/**
 * Tier定義
 */
export const TIER_DEFINITIONS = {
  1: { name: 'ビギナー', min: 0, max: 3, defaultRate: 0.0450 },
  2: { name: 'レギュラー', min: 4, max: 10, defaultRate: 0.0420 },
  3: { name: 'エキスパート', min: 11, max: 24, defaultRate: 0.0400 },
  4: { name: 'マスター', min: 25, max: 50, defaultRate: 0.0380 },
  5: { name: 'レジェンド', min: 51, max: null, defaultRate: 0.0330 },
} as const;

/**
 * 月間のQR決済回数を取得
 * @param prisma PrismaClient
 * @param sellerId 出店者ID
 * @param year 年
 * @param month 月（1-12）
 * @returns 月間QR決済回数
 */
export async function getMonthlyQrTransactionCount(
  prisma: PrismaClient,
  sellerId: string,
  year: number,
  month: number
): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const count = await prisma.stripePayment.count({
    where: {
      sellerId,
      status: 'succeeded',
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  return count;
}

/**
 * 現在の月間QR決済回数を取得
 * @param prisma PrismaClient
 * @param sellerId 出店者ID
 * @returns 現在の月間QR決済回数
 */
export async function getCurrentMonthlyQrTransactionCount(
  prisma: PrismaClient,
  sellerId: string
): Promise<number> {
  const now = new Date();
  return getMonthlyQrTransactionCount(prisma, sellerId, now.getFullYear(), now.getMonth() + 1);
}

/**
 * 決済回数に基づいてTierを判定
 * @param transactionCount 月間QR決済回数
 * @returns Tier番号（1-5）
 */
export function determineTier(transactionCount: number): number {
  if (transactionCount >= 51) {
    return 5; // レジェンド
  } else if (transactionCount >= 25) {
    return 4; // マスター
  } else if (transactionCount >= 11) {
    return 3; // エキスパート
  } else if (transactionCount >= 4) {
    return 2; // レギュラー
  } else {
    return 1; // ビギナー
  }
}

/**
 * コミュニティ目標の達成状況を取得
 * @param prisma PrismaClient
 * @param phase Phase（'phase1', 'phase2', 'phase3'）
 * @returns 目標達成状況
 */
export async function getCommunityGoalStatus(
  prisma: PrismaClient,
  phase: 'phase1' | 'phase2' | 'phase3' = 'phase1'
): Promise<{
  phase: string;
  targetAmount: number;
  currentAmount: number;
  achievementRate: number;
  isAchieved: boolean;
  bonusFeeRate: number;
  normalFeeRate: number;
}> {
  const now = new Date();

  // 現在有効なコミュニティ目標を取得
  const goal = await prisma.$queryRaw<Array<{
    phase: string;
    target_amount: number;
    bonus_fee_rate: number;
    normal_fee_rate: number;
  }>>`
    SELECT 
      phase,
      target_amount,
      bonus_fee_rate,
      normal_fee_rate
    FROM community_goal_master
    WHERE phase = ${phase}
      AND effective_from <= ${now}
      AND (effective_to IS NULL OR effective_to >= ${now})
    ORDER BY effective_from DESC
    LIMIT 1
  `;

  if (!goal || goal.length === 0) {
    // 目標が設定されていない場合は、デフォルト値を返す
    return {
      phase,
      targetAmount: 0,
      currentAmount: 0,
      achievementRate: 0,
      isAchieved: false,
      bonusFeeRate: 0.0280,
      normalFeeRate: 0.0330,
    };
  }

  const targetAmount = Number(goal[0].target_amount);
  const bonusFeeRate = Number(goal[0].bonus_fee_rate);
  const normalFeeRate = Number(goal[0].normal_fee_rate);

  // 現在の月間取扱高を計算
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const volume = await prisma.$queryRaw<Array<{
    total_amount: number;
  }>>`
    SELECT 
      COALESCE(SUM(sp.amount_gross), 0) AS total_amount
    FROM stripe_payments sp
    WHERE sp.status = 'succeeded'
      AND sp.created_at >= ${monthStart}
      AND sp.created_at < ${monthEnd}
  `;

  const currentAmount = volume && volume.length > 0 ? Number(volume[0].total_amount) : 0;
  const achievementRate = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const isAchieved = currentAmount >= targetAmount;

  return {
    phase,
    targetAmount,
    currentAmount,
    achievementRate,
    isAchieved,
    bonusFeeRate,
    normalFeeRate,
  };
}

/**
 * Tier制に基づく手数料率を取得
 * @param prisma PrismaClient
 * @param sellerId 出店者ID
 * @param planType プランタイプ（'standard', 'pro', 'kids'）
 * @returns 手数料率
 */
export async function getFeeRateByTier(
  prisma: PrismaClient,
  sellerId: string,
  planType: string = 'standard'
): Promise<number> {
  // 現在の月間QR決済回数を取得
  const transactionCount = await getCurrentMonthlyQrTransactionCount(prisma, sellerId);

  // Tierを判定
  const tier = determineTier(transactionCount);

  const now = new Date();

  // Tier制の手数料率を取得
  const feeRate = await prisma.$queryRaw<Array<{
    fee_rate: number;
    tier: number;
  }>>`
    SELECT 
      fee_rate,
      tier
    FROM fee_rate_master
    WHERE plan_type = ${planType}
      AND tier = ${tier}
      AND effective_from <= ${now}
      AND (effective_to IS NULL OR effective_to >= ${now})
    ORDER BY effective_from DESC
    LIMIT 1
  `;

  if (feeRate && feeRate.length > 0) {
    const rate = Number(feeRate[0].fee_rate);

    // Tier 5の場合は、コミュニティ目標達成状況を確認
    if (tier === 5) {
      const goalStatus = await getCommunityGoalStatus(prisma, 'phase1');
      if (goalStatus.isAchieved) {
        // 目標達成時はボーナス料金を適用
        return goalStatus.bonusFeeRate;
      } else {
        // 未達成時は通常料金を適用
        return goalStatus.normalFeeRate;
      }
    }

    return rate;
  }

  // Tier制の手数料率が見つからない場合は、デフォルト値を返す
  return TIER_DEFINITIONS[tier as keyof typeof TIER_DEFINITIONS].defaultRate;
}

/**
 * 手数料率を取得（戦略F対応版）
 * Tier制が有効な場合はTier制を適用、そうでない場合は従来のplan_typeベースを適用
 * @param prisma PrismaClient
 * @param sellerId 出店者ID
 * @param planType プランタイプ
 * @param useTierSystem Tier制を使用するか（デフォルト: 環境変数ENABLE_STRATEGY_F_TIER_SYSTEMに基づく、未設定の場合はtrue）
 * @returns 手数料率
 */
export async function getFeeRateWithStrategyF(
  prisma: PrismaClient,
  sellerId: string,
  planType: string = 'standard',
  useTierSystem?: boolean
): Promise<number> {
  // useTierSystemが明示的に指定されていない場合は、環境変数をチェック
  // 明示的にfalseが渡された場合は、必ずfalseとして扱う
  let shouldUseTierSystem: boolean;
  if (useTierSystem === false) {
    shouldUseTierSystem = false;
  } else if (useTierSystem === true) {
    shouldUseTierSystem = true;
  } else {
    // useTierSystemが未指定の場合は環境変数をチェック
    shouldUseTierSystem = process.env.ENABLE_STRATEGY_F_TIER_SYSTEM !== 'false';
  }

  if (shouldUseTierSystem) {
    // Tier制を適用
    return getFeeRateByTier(prisma, sellerId, planType);
  } else {
    // 従来のplan_typeベースの手数料率を取得
    const now = new Date();
    const feeRate = await prisma.$queryRaw<Array<{ fee_rate: number }>>`
      SELECT fee_rate
      FROM fee_rate_master
      WHERE plan_type = ${planType}
        AND tier IS NULL
        AND effective_from <= ${now}
        AND (effective_to IS NULL OR effective_to >= ${now})
      ORDER BY effective_from DESC
      LIMIT 1
    `;

    if (feeRate && feeRate.length > 0) {
      return Number(feeRate[0].fee_rate);
    }

    // デフォルト値（7%）
    return 0.07;
  }
}

