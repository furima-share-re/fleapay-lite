/**
 * 戦略F: コミュニティ連動型ダイナミックプライシングのテスト
 *
 * テスト対象:
 * - Tier判定ロジック
 * - コミュニティ目標達成判定
 * - Tier制に基づく手数料取得
 * - 既存機能との互換性（デグレ防止）
 *
 * 実行方法:
 *   npm test -- strategy-f
 */

import {
  determineTier,
  getCommunityGoalStatus,
  getCurrentMonthlyQrTransactionCount,
  getFeeRateByTier,
  getFeeRateWithStrategyF,
  getMonthlyQrTransactionCount,
  TIER_DEFINITIONS,
} from "@/lib/strategy-f";
import { getFeeRateFromMaster } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Prismaのモック
const mockPrisma = {
  stripePayment: {
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
} as unknown as PrismaClient;

describe("戦略F: コミュニティ連動型ダイナミックプライシング", () => {
  beforeEach(() => {
    // モックをリセット（実装もクリア）
    vi.mocked(mockPrisma.stripePayment.count).mockReset();
    vi.mocked(mockPrisma.$queryRaw).mockReset();
  });

  describe("determineTier - Tier判定ロジック", () => {
    it("0回でTier 1（ビギナー）を返す", () => {
      expect(determineTier(0)).toBe(1);
    });

    it("3回でTier 1（ビギナー）を返す", () => {
      expect(determineTier(3)).toBe(1);
    });

    it("4回でTier 2（レギュラー）を返す", () => {
      expect(determineTier(4)).toBe(2);
    });

    it("10回でTier 2（レギュラー）を返す", () => {
      expect(determineTier(10)).toBe(2);
    });

    it("11回でTier 3（エキスパート）を返す", () => {
      expect(determineTier(11)).toBe(3);
    });

    it("24回でTier 3（エキスパート）を返す", () => {
      expect(determineTier(24)).toBe(3);
    });

    it("25回でTier 4（マスター）を返す", () => {
      expect(determineTier(25)).toBe(4);
    });

    it("50回でTier 4（マスター）を返す", () => {
      expect(determineTier(50)).toBe(4);
    });

    it("51回でTier 5（レジェンド）を返す", () => {
      expect(determineTier(51)).toBe(5);
    });

    it("100回でTier 5（レジェンド）を返す", () => {
      expect(determineTier(100)).toBe(5);
    });
  });

  describe("getMonthlyQrTransactionCount - 月間QR決済回数取得", () => {
    it("指定月のQR決済回数を取得できる", async () => {
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(15);

      const result = await getMonthlyQrTransactionCount(
        mockPrisma,
        "seller-123",
        2024,
        1
      );

      expect(result).toBe(15);
      expect(mockPrisma.stripePayment.count).toHaveBeenCalledWith({
        where: {
          sellerId: "seller-123",
          status: "succeeded",
          createdAt: {
            gte: new Date(2024, 0, 1),
            lt: new Date(2024, 1, 1),
          },
        },
      });
    });

    it("現在の月間QR決済回数を取得できる", async () => {
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(20);

      const result = await getCurrentMonthlyQrTransactionCount(
        mockPrisma,
        "seller-123"
      );

      expect(result).toBe(20);
      expect(mockPrisma.stripePayment.count).toHaveBeenCalled();
    });
  });

  describe("getCommunityGoalStatus - コミュニティ目標達成判定", () => {
    it("目標が設定されていない場合はデフォルト値を返す", async () => {
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.$queryRaw)
        .mockResolvedValueOnce([]) // 目標なし
        .mockResolvedValueOnce([{ total_amount: 0 }]); // 取扱高

      const result = await getCommunityGoalStatus(mockPrisma, "phase1");

      expect(result.phase).toBe("phase1");
      expect(result.targetAmount).toBe(0);
      expect(result.isAchieved).toBe(false);
      expect(result.bonusFeeRate).toBe(0.028);
      expect(result.normalFeeRate).toBe(0.033);
    });

    it("目標が達成されている場合、isAchievedがtrue", async () => {
      // モックをリセットしてから設定
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      // 目標取得
      vi.mocked(mockPrisma.$queryRaw)
        .mockResolvedValueOnce([
          {
            phase: "phase1",
            target_amount: 10000000,
            bonus_fee_rate: 0.028,
            normal_fee_rate: 0.033,
          },
        ])
        // 取扱高取得（目標を超えている）
        .mockResolvedValueOnce([{ total_amount: 12000000 }]);

      const result = await getCommunityGoalStatus(mockPrisma, "phase1");

      expect(result.targetAmount).toBe(10000000);
      expect(result.currentAmount).toBe(12000000);
      expect(result.isAchieved).toBe(true);
      expect(result.achievementRate).toBeGreaterThan(100);
    });

    it("目標が未達成の場合、isAchievedがfalse", async () => {
      // モックをリセットしてから設定
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      // 目標取得
      vi.mocked(mockPrisma.$queryRaw)
        .mockResolvedValueOnce([
          {
            phase: "phase1",
            target_amount: 10000000,
            bonus_fee_rate: 0.028,
            normal_fee_rate: 0.033,
          },
        ])
        // 取扱高取得（目標未達成）
        .mockResolvedValueOnce([{ total_amount: 5000000 }]);

      const result = await getCommunityGoalStatus(mockPrisma, "phase1");

      expect(result.targetAmount).toBe(10000000);
      expect(result.currentAmount).toBe(5000000);
      expect(result.isAchieved).toBe(false);
      expect(result.achievementRate).toBe(50);
    });
  });

  describe("getFeeRateByTier - Tier制に基づく手数料取得", () => {
    it("Tier 1の場合、4.5%を返す", async () => {
      // モックをリセットしてから設定
      vi.mocked(mockPrisma.stripePayment.count).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      // 月間QR決済回数: 2回（Tier 1）
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(2);
      // Tier 1の手数料率取得
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.045, tier: 1 },
      ]);

      const result = await getFeeRateByTier(
        mockPrisma,
        "seller-123",
        "standard"
      );

      expect(result).toBe(0.045);
    });

    it("Tier 2の場合、4.2%を返す", async () => {
      vi.mocked(mockPrisma.stripePayment.count).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(7);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.042, tier: 2 },
      ]);

      const result = await getFeeRateByTier(
        mockPrisma,
        "seller-123",
        "standard"
      );

      expect(result).toBe(0.042);
    });

    it("Tier 3の場合、4.0%を返す", async () => {
      vi.mocked(mockPrisma.stripePayment.count).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(15);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.04, tier: 3 },
      ]);

      const result = await getFeeRateByTier(
        mockPrisma,
        "seller-123",
        "standard"
      );

      expect(result).toBe(0.04);
    });

    it("Tier 4の場合、3.8%を返す", async () => {
      vi.mocked(mockPrisma.stripePayment.count).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(30);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.038, tier: 4 },
      ]);

      const result = await getFeeRateByTier(
        mockPrisma,
        "seller-123",
        "standard"
      );

      expect(result).toBe(0.038);
    });

    it("Tier 5で目標達成時、2.8%を返す", async () => {
      vi.mocked(mockPrisma.stripePayment.count).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(60);
      // Tier 5の手数料率取得
      vi.mocked(mockPrisma.$queryRaw)
        .mockResolvedValueOnce([{ fee_rate: 0.033, tier: 5 }])
        // コミュニティ目標取得（達成）
        .mockResolvedValueOnce([
          {
            phase: "phase1",
            target_amount: 10000000,
            bonus_fee_rate: 0.028,
            normal_fee_rate: 0.033,
          },
        ])
        .mockResolvedValueOnce([{ total_amount: 12000000 }]);

      const result = await getFeeRateByTier(
        mockPrisma,
        "seller-123",
        "standard"
      );

      expect(result).toBe(0.028); // 目標達成時のボーナス料金
    });

    it("Tier 5で目標未達成時、3.3%を返す", async () => {
      vi.mocked(mockPrisma.stripePayment.count).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(60);
      vi.mocked(mockPrisma.$queryRaw)
        .mockResolvedValueOnce([{ fee_rate: 0.033, tier: 5 }])
        // コミュニティ目標取得（未達成）
        .mockResolvedValueOnce([
          {
            phase: "phase1",
            target_amount: 10000000,
            bonus_fee_rate: 0.028,
            normal_fee_rate: 0.033,
          },
        ])
        .mockResolvedValueOnce([{ total_amount: 5000000 }]);

      const result = await getFeeRateByTier(
        mockPrisma,
        "seller-123",
        "standard"
      );

      expect(result).toBe(0.033); // 通常料金
    });

    it("Tier制の手数料率が見つからない場合、デフォルト値を返す", async () => {
      vi.mocked(mockPrisma.stripePayment.count).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(2);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([]); // Tier制の手数料率なし

      const result = await getFeeRateByTier(
        mockPrisma,
        "seller-123",
        "standard"
      );

      expect(result).toBe(0.045); // Tier 1のデフォルト値
    });
  });

  describe("getFeeRateWithStrategyF - 戦略F統合手数料取得", () => {
    it("Tier制が有効な場合、Tier制を適用", async () => {
      vi.mocked(mockPrisma.stripePayment.count).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(15);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.04, tier: 3 },
      ]);

      const result = await getFeeRateWithStrategyF(
        mockPrisma,
        "seller-123",
        "standard",
        true
      );

      expect(result).toBe(0.04);
    });

    it("Tier制が無効な場合、従来のplan_typeベースを適用", async () => {
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.07 },
      ]);

      const result = await getFeeRateWithStrategyF(
        mockPrisma,
        "seller-123",
        "standard",
        false
      );

      expect(result).toBe(0.07);
      // Tier判定は呼ばれない
      expect(mockPrisma.stripePayment.count).not.toHaveBeenCalled();
    });

    it("Tier制が無効でplan_typeベースの手数料率が見つからない場合、デフォルト値（7%）を返す", async () => {
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([]);

      const result = await getFeeRateWithStrategyF(
        mockPrisma,
        "seller-123",
        "standard",
        false
      );

      expect(result).toBe(0.07);
    });
  });

  describe("既存機能との互換性（デグレ防止）", () => {
    it("getFeeRateFromMasterは引き続き動作する", async () => {
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.07 },
      ]);

      const result = await getFeeRateFromMaster(mockPrisma, "standard");

      expect(result).toBe(0.07);
    });

    it("plan_typeベースの手数料率取得が動作する（tier IS NULL）", async () => {
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.08 },
      ]);

      const result = await getFeeRateWithStrategyF(
        mockPrisma,
        "seller-123",
        "pro",
        false
      );

      expect(result).toBe(0.08);
    });

    it("Tier制とplan_typeベースが共存できる", async () => {
      // Tier制の手数料率
      vi.mocked(mockPrisma.stripePayment.count).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.stripePayment.count).mockResolvedValue(15);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.04, tier: 3 },
      ]);

      const tierResult = await getFeeRateWithStrategyF(
        mockPrisma,
        "seller-123",
        "standard",
        true
      );

      expect(tierResult).toBe(0.04);

      // plan_typeベースの手数料率（別のプラン）
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([
        { fee_rate: 0.08 },
      ]);

      const planResult = await getFeeRateWithStrategyF(
        mockPrisma,
        "seller-123",
        "pro",
        false
      );

      expect(planResult).toBe(0.08);
    });
  });

  describe("エッジケース", () => {
    it("負の決済回数でTier 1を返す", () => {
      expect(determineTier(-1)).toBe(1);
    });

    it("非常に大きな決済回数でTier 5を返す", () => {
      expect(determineTier(10000)).toBe(5);
    });

    it("目標取扱高が0の場合、達成率が0%", async () => {
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.$queryRaw)
        .mockResolvedValueOnce([
          {
            phase: "phase1",
            target_amount: 0,
            bonus_fee_rate: 0.028,
            normal_fee_rate: 0.033,
          },
        ])
        .mockResolvedValueOnce([{ total_amount: 1000000 }]);

      const result = await getCommunityGoalStatus(mockPrisma, "phase1");

      expect(result.targetAmount).toBe(0);
      expect(result.achievementRate).toBe(0);
    });

    it("取扱高がnullの場合、0として扱う", async () => {
      vi.mocked(mockPrisma.$queryRaw).mockReset();
      vi.mocked(mockPrisma.$queryRaw)
        .mockResolvedValueOnce([
          {
            phase: "phase1",
            target_amount: 10000000,
            bonus_fee_rate: 0.028,
            normal_fee_rate: 0.033,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await getCommunityGoalStatus(mockPrisma, "phase1");

      expect(result.currentAmount).toBe(0);
      expect(result.isAchieved).toBe(false);
    });
  });

  describe("TIER_DEFINITIONS - Tier定義の整合性", () => {
    it("すべてのTierが定義されている", () => {
      expect(TIER_DEFINITIONS[1]).toBeDefined();
      expect(TIER_DEFINITIONS[2]).toBeDefined();
      expect(TIER_DEFINITIONS[3]).toBeDefined();
      expect(TIER_DEFINITIONS[4]).toBeDefined();
      expect(TIER_DEFINITIONS[5]).toBeDefined();
    });

    it("Tier 1の手数料率が4.5%", () => {
      expect(TIER_DEFINITIONS[1].defaultRate).toBe(0.045);
    });

    it("Tier 2の手数料率が4.2%", () => {
      expect(TIER_DEFINITIONS[2].defaultRate).toBe(0.042);
    });

    it("Tier 3の手数料率が4.0%", () => {
      expect(TIER_DEFINITIONS[3].defaultRate).toBe(0.04);
    });

    it("Tier 4の手数料率が3.8%", () => {
      expect(TIER_DEFINITIONS[4].defaultRate).toBe(0.038);
    });

    it("Tier 5の手数料率が3.3%（通常）", () => {
      expect(TIER_DEFINITIONS[5].defaultRate).toBe(0.033);
    });

    it("Tier 5のmaxがnull（上限なし）", () => {
      expect(TIER_DEFINITIONS[5].max).toBeNull();
    });

    it("Tierの範囲が連続している", () => {
      expect(TIER_DEFINITIONS[1].max).toBe(3);
      expect(TIER_DEFINITIONS[2].min).toBe(4);
      expect(TIER_DEFINITIONS[2].max).toBe(10);
      expect(TIER_DEFINITIONS[3].min).toBe(11);
      expect(TIER_DEFINITIONS[3].max).toBe(24);
      expect(TIER_DEFINITIONS[4].min).toBe(25);
      expect(TIER_DEFINITIONS[4].max).toBe(50);
      expect(TIER_DEFINITIONS[5].min).toBe(51);
    });
  });
});
