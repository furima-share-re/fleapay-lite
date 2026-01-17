/**
 * 戦略F: コミュニティ連動型ダイナミックプライシング
 * Tier制とコミュニティ目標達成判定のロジック
 */

import { PrismaClient } from '@prisma/client';

/**
 * Tier定義
 */
export const TIER_DEFINITIONS = {
  1: { name: '村', min: 0, max: 3, defaultRate: 0.0480 },
  2: { name: '町', min: 4, max: 10, defaultRate: 0.0440 },
  3: { name: '城下町', min: 11, max: 24, defaultRate: 0.0410 },
  4: { name: '藩', min: 25, max: 50, defaultRate: 0.0380 },
  5: { name: '天下', min: 51, max: null, defaultRate: 0.0330 },
} as const;

type MonthlyStatRow = {
  id: string;
  year_month: string;
  transaction_count: number;
  start_tier: number;
  current_tier: number;
};

function isMissingSellerMonthlyStatsTable(error: unknown): boolean {
  const err = error as {
    code?: string;
    meta?: { code?: string; message?: string };
    message?: string;
  };
  if (!err) return false;
  if (err.code === 'P2010' && err.meta?.code === '42P01') return true;
  const message = `${err.meta?.message ?? ''} ${err.message ?? ''}`.toLowerCase();
  return message.includes('seller_monthly_stats') && message.includes('does not exist');
}

function toYearMonth(year: number, month: number): string {
  const padded = String(month).padStart(2, '0');
  return `${year}-${padded}`;
}

function getPrevYearMonth(year: number, month: number): { year: number; month: number } {
  const date = new Date(year, month - 2, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function computeStartTier(prevTier: number | null): number {
  if (prevTier === 5) return 4;
  if (prevTier === 4) return 3;
  return 1;
}

async function fetchMonthlyStat(
  prisma: PrismaClient,
  sellerId: string,
  yearMonth: string
): Promise<MonthlyStatRow | null> {
  const rows = await prisma.$queryRaw<Array<MonthlyStatRow>>`
    SELECT id, year_month, transaction_count, start_tier, current_tier
    FROM seller_monthly_stats
    WHERE seller_id = ${sellerId}
      AND year_month = ${yearMonth}
    LIMIT 1
  `;
  return rows && rows.length > 0 ? rows[0] : null;
}

async function updateMonthlyStat(
  prisma: PrismaClient,
  sellerId: string,
  yearMonth: string,
  transactionCount: number,
  currentTier: number
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE seller_monthly_stats
    SET transaction_count = ${transactionCount},
        current_tier = ${currentTier},
        updated_at = now()
    WHERE seller_id = ${sellerId}
      AND year_month = ${yearMonth}
  `;
}

async function insertMonthlyStat(
  prisma: PrismaClient,
  sellerId: string,
  yearMonth: string,
  startTier: number,
  currentTier: number
): Promise<MonthlyStatRow> {
  const rows = await prisma.$queryRaw<Array<MonthlyStatRow>>`
    INSERT INTO seller_monthly_stats (seller_id, year_month, start_tier, current_tier)
    VALUES (${sellerId}, ${yearMonth}, ${startTier}, ${currentTier})
    RETURNING id, year_month, transaction_count, start_tier, current_tier
  `;
  return rows[0];
}

async function ensureMonthlyStat(
  prisma: PrismaClient,
  sellerId: string,
  year: number,
  month: number
): Promise<MonthlyStatRow> {
  const yearMonth = toYearMonth(year, month);
  const existing = await fetchMonthlyStat(prisma, sellerId, yearMonth);
  if (existing) return existing;

  const prev = getPrevYearMonth(year, month);
  const prevYearMonth = toYearMonth(prev.year, prev.month);
  const prevStat = await fetchMonthlyStat(prisma, sellerId, prevYearMonth);

  let prevCurrentTier: number | null = null;
  if (prevStat) {
    prevCurrentTier = prevStat.current_tier || null;
    if (!prevCurrentTier || prevCurrentTier < 1) {
      const prevCount = await getMonthlyQrTransactionCount(prisma, sellerId, prev.year, prev.month);
      const prevBaseTier = determineTier(prevCount);
      const prevStartTier = prevStat.start_tier || 1;
      prevCurrentTier = Math.max(prevStartTier, prevBaseTier);
      await updateMonthlyStat(prisma, sellerId, prevYearMonth, prevCount, prevCurrentTier);
    }
  }

  const startTier = computeStartTier(prevCurrentTier);
  const currentTier = Math.max(startTier, 1);
  return insertMonthlyStat(prisma, sellerId, yearMonth, startTier, currentTier);
}

/**
 * 月次ランク情報を取得（強くてニューゲーム方式）
 */
export async function getCurrentMonthlyTierStatus(
  prisma: PrismaClient,
  sellerId: string
): Promise<{
  year: number;
  month: number;
  transactionCount: number;
  startTier: number;
  baseTier: number;
  currentTier: number;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const yearMonth = toYearMonth(year, month);

  try {
    const stat = await ensureMonthlyStat(prisma, sellerId, year, month);
    const transactionCount = await getCurrentMonthlyQrTransactionCount(prisma, sellerId);
    const baseTier = determineTier(transactionCount);
    const currentTier = Math.max(stat.start_tier, baseTier);

    await updateMonthlyStat(prisma, sellerId, yearMonth, transactionCount, currentTier);

    return {
      year,
      month,
      transactionCount,
      startTier: stat.start_tier,
      baseTier,
      currentTier,
    };
  } catch (error) {
    if (isMissingSellerMonthlyStatsTable(error)) {
      const transactionCount = await getCurrentMonthlyQrTransactionCount(prisma, sellerId);
      const baseTier = determineTier(transactionCount);
      return {
        year,
        month,
        transactionCount,
        startTier: 1,
        baseTier,
        currentTier: Math.max(1, baseTier),
      };
    }
    throw error;
  }
}

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
 * 指定日時の月間QR決済回数を取得
 * @param prisma PrismaClient
 * @param sellerId 出店者ID
 * @param asOf 判定対象日時
 * @returns 月間QR決済回数
 */
export async function getMonthlyQrTransactionCountAt(
  prisma: PrismaClient,
  sellerId: string,
  asOf: Date
): Promise<number> {
  const startDate = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  const endDate = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 1);

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
 * 境界値テスト向け: 指定日時のTier状態を取得（DBは更新しない）
 */
export async function getMonthlyTierStatusAt(
  prisma: PrismaClient,
  sellerId: string,
  asOf: Date,
  overrides?: {
    transactionCount?: number | null;
    prevTransactionCount?: number | null;
  }
): Promise<{
  year: number;
  month: number;
  yearMonth: string;
  transactionCount: number;
  startTier: number;
  baseTier: number;
  currentTier: number;
  prevMonth: {
    year: number;
    month: number;
    transactionCount: number | null;
    startTier: number | null;
    currentTier: number | null;
  };
}> {
  const year = asOf.getFullYear();
  const month = asOf.getMonth() + 1;
  const yearMonth = toYearMonth(year, month);

  const prev = getPrevYearMonth(year, month);
  const prevYearMonth = toYearMonth(prev.year, prev.month);
  const prevStat = await fetchMonthlyStat(prisma, sellerId, prevYearMonth);

  let prevCurrentTier: number | null = null;
  let prevTransactionCount: number | null = null;
  if (overrides?.prevTransactionCount !== null && overrides?.prevTransactionCount !== undefined) {
    prevTransactionCount = overrides.prevTransactionCount;
  } else {
    prevTransactionCount = await getMonthlyQrTransactionCount(
      prisma,
      sellerId,
      prev.year,
      prev.month
    );
  }
  const prevBaseTier = determineTier(prevTransactionCount);
  const prevStartTier = prevStat?.start_tier || 1;
  if (prevStat?.current_tier && prevStat.current_tier > 0) {
    prevCurrentTier = prevStat.current_tier;
  } else {
    prevCurrentTier = Math.max(prevStartTier, prevBaseTier);
  }

  const startTier = computeStartTier(prevCurrentTier);
  const transactionCountOverride =
    overrides?.transactionCount !== null && overrides?.transactionCount !== undefined
      ? overrides.transactionCount
      : null;
  const transactionCount =
    transactionCountOverride !== null
      ? transactionCountOverride
      : await getMonthlyQrTransactionCountAt(prisma, sellerId, asOf);
  const baseTier = determineTier(transactionCount);
  const currentTier = Math.max(startTier, baseTier);

  return {
    year,
    month,
    yearMonth,
    transactionCount,
    startTier,
    baseTier,
    currentTier,
    prevMonth: {
      year: prev.year,
      month: prev.month,
      transactionCount: prevTransactionCount,
      startTier: prevStat?.start_tier ?? null,
      currentTier: prevStat?.current_tier ?? null,
    },
  };
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
  const tierStatus = await getCurrentMonthlyTierStatus(prisma, sellerId);
  const tier = tierStatus.currentTier;

  const now = new Date();

  if (tier === 5) {
    const goalStatus = await getCommunityGoalStatus(prisma, 'phase1');
    return goalStatus.isAchieved ? goalStatus.bonusFeeRate : goalStatus.normalFeeRate;
  }

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
    return Number(feeRate[0].fee_rate);
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

