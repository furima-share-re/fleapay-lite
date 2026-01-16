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
/**
 * 出店者向けTier情報取得API
 * 現在のTier、月間QR決済回数、コミュニティ目標達成状況を返す
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getCurrentMonthlyQrTransactionCount,
  determineTier,
  getCommunityGoalStatus,
  TIER_DEFINITIONS,
} from '@/lib/strategy-f';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sellerId = String(searchParams.get('s') || '');

  if (!sellerId) {
    return NextResponse.json(
      { error: 'seller_id_required' },
      { status: 400 }
    );
  }

  try {
    // 現在の月間QR決済回数を取得
    const transactionCount = await getCurrentMonthlyQrTransactionCount(prisma, sellerId);

    // Tierを判定
    const tier = determineTier(transactionCount);
    const tierInfo = TIER_DEFINITIONS[tier as keyof typeof TIER_DEFINITIONS];

    // コミュニティ目標達成状況を取得
    const goalStatus = await getCommunityGoalStatus(prisma, 'phase1');

    // Tier 5の場合、次回の手数料率を表示
    let currentFeeRate: number;
    let nextFeeRate: number | null = null;
    let feeRateMessage: string | null = null;

    if (tier === 5) {
      // Tier 5: コミュニティ目標達成状況に応じて手数料率が変動
      currentFeeRate = goalStatus.isAchieved ? goalStatus.bonusFeeRate : goalStatus.normalFeeRate;
      nextFeeRate = goalStatus.isAchieved ? null : goalStatus.bonusFeeRate;
      feeRateMessage = goalStatus.isAchieved
        ? '🎉 コミュニティ目標達成中！最安手数料2.8%が適用されています'
        : `あと¥${(goalStatus.targetAmount - goalStatus.currentAmount).toLocaleString()}で全レジェンドユーザーの手数料が2.8%になります！`;
    } else {
      // Tier 1-4: 固定手数料率
      currentFeeRate = tierInfo.defaultRate;
      // 次のTierへの情報
      if (tier < 5) {
        const nextTier = tier + 1;
        const nextTierInfo = TIER_DEFINITIONS[nextTier as keyof typeof TIER_DEFINITIONS];
        const remainingCount = nextTierInfo.min - transactionCount;
        nextFeeRate = nextTierInfo.defaultRate;
        feeRateMessage = `あと${remainingCount}回のQR決済でTier ${nextTier}（${nextTierInfo.name}）になり、手数料が${(nextTierInfo.defaultRate * 100).toFixed(1)}%になります！`;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tier: {
          number: tier,
          name: tierInfo.name,
          currentFeeRate: currentFeeRate,
          currentFeeRatePercent: (currentFeeRate * 100).toFixed(2),
          nextFeeRate: nextFeeRate ? (nextFeeRate * 100).toFixed(2) : null,
          feeRateMessage,
        },
        transactionCount: {
          current: transactionCount,
          range: {
            min: tierInfo.min,
            max: tierInfo.max,
          },
        },
        communityGoal: {
          phase: goalStatus.phase,
          targetAmount: goalStatus.targetAmount,
          currentAmount: goalStatus.currentAmount,
          achievementRate: Math.round(goalStatus.achievementRate * 10) / 10,
          isAchieved: goalStatus.isAchieved,
          message: goalStatus.isAchieved
            ? '🎉 コミュニティ目標達成中！'
            : `現在の達成率: ${Math.round(goalStatus.achievementRate * 10) / 10}%`,
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

