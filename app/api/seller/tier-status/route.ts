/**
 * 出店者向け Tier 情報取得API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  TIER_DEFINITIONS,
  getCommunityGoalStatus,
  getCurrentMonthlyTierStatus,
} from '@/lib/strategy-f';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sellerId = url.searchParams.get('s');
  if (!sellerId) {
    return NextResponse.json({ error: 'seller_id_required' }, { status: 400 });
  }

  try {
    const subscription = await prisma.sellerSubscription.findFirst({
      where: {
        sellerId,
        status: 'active',
        OR: [{ endedAt: null }, { endedAt: { gt: new Date() } }],
      },
      orderBy: { startedAt: 'desc' },
      select: { planType: true },
    });
    const planType = (subscription?.planType as 'standard' | 'pro' | 'kids') || 'standard';

    const tierStatus = await getCurrentMonthlyTierStatus(prisma, sellerId);
    const tierDef = TIER_DEFINITIONS[tierStatus.currentTier as keyof typeof TIER_DEFINITIONS];

    const now = new Date();
    const feeRateRows = await prisma.$queryRaw<Array<{ fee_rate: number }>>`
      SELECT fee_rate
      FROM fee_rate_master
      WHERE plan_type = ${planType}
        AND tier = ${tierStatus.currentTier}
        AND effective_from <= ${now}
        AND (effective_to IS NULL OR effective_to >= ${now})
      ORDER BY effective_from DESC
      LIMIT 1
    `;

    let currentFeeRate = feeRateRows.length > 0
      ? Number(feeRateRows[0].fee_rate)
      : tierDef.defaultRate;

    const communityGoal = await getCommunityGoalStatus(prisma, 'phase1');
    if (tierStatus.currentTier === 5) {
      currentFeeRate = communityGoal.isAchieved ? communityGoal.bonusFeeRate : communityGoal.normalFeeRate;
    }

    const currentFeeRatePercent = (currentFeeRate * 100).toFixed(2);

    let nextTierMessage = '';
    let nextFeeRate: string | null = null;
    if (tierStatus.currentTier < 5) {
      const nextTier = tierStatus.currentTier + 1;
      const nextDef = TIER_DEFINITIONS[nextTier as keyof typeof TIER_DEFINITIONS];
      const remaining = Math.max(0, nextDef.min - tierStatus.transactionCount);
      nextFeeRate = (nextDef.defaultRate * 100).toFixed(2);
      nextTierMessage = `あと${remaining}回のQR決済でTier ${nextTier}（${nextDef.name}）になり、手数料が${nextFeeRate}%になります！`;
    } else if (communityGoal.isAchieved) {
      nextTierMessage = 'コミュニティ目標達成中：2.8%が適用されています';
    } else {
      const remainingAmount = Math.max(0, communityGoal.targetAmount - communityGoal.currentAmount);
      nextTierMessage = `あと¥${remainingAmount.toLocaleString('ja-JP')}で目標達成、2.8%が適用されます`;
    }

    return NextResponse.json({
      success: true,
      data: {
        tier: {
          number: tierStatus.currentTier,
          name: tierDef.name,
          currentFeeRate,
          currentFeeRatePercent,
          nextFeeRate,
          feeRateMessage: nextTierMessage,
        },
        transactionCount: {
          current: tierStatus.transactionCount,
          range: {
            min: tierDef.min,
            max: tierDef.max,
          },
        },
        startTier: tierStatus.startTier,
        communityGoal: {
          phase: communityGoal.phase,
          targetAmount: communityGoal.targetAmount,
          currentAmount: communityGoal.currentAmount,
          achievementRate: Number(communityGoal.achievementRate.toFixed(1)),
          isAchieved: communityGoal.isAchieved,
          message: communityGoal.isAchieved
            ? '目標達成中'
            : `現在の達成率: ${communityGoal.achievementRate.toFixed(1)}%`,
        },
      },
    });
  } catch (error) {
    console.error('[TierStatus] Error:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
