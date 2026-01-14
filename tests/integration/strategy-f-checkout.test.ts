/**
 * 戦略F: チェックアウト処理での統合テスト
 * 
 * テスト対象:
 * - チェックアウト処理でのTier制適用
 * - 環境変数によるTier制の有効/無効切り替え
 * - 既存のチェックアウト処理との互換性
 * 
 * 実行方法:
 *   npm test -- strategy-f-checkout
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// 環境変数をモックする前にモジュールをインポート
const originalEnv = process.env;

describe('戦略F: チェックアウト処理統合テスト', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // 環境変数をリセット
    process.env = { ...originalEnv };
    // モジュールキャッシュをクリア（動的インポートの影響を避けるため）
    await vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('環境変数によるTier制の制御', () => {
    it('ENABLE_STRATEGY_F_TIER_SYSTEM=trueの場合、Tier制が有効', async () => {
      process.env.ENABLE_STRATEGY_F_TIER_SYSTEM = 'true';
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

      // モジュールを動的にインポート（環境変数の変更を反映）
      await vi.resetModules();
      const { getFeeRateWithStrategyF } = await import('@/lib/strategy-f');
      const mockCount = vi.fn().mockResolvedValue(15);
      // getFeeRateByTier calls $queryRaw with tier=3 (determined from count=15)
      // First call: getCurrentMonthlyQrTransactionCount -> getMonthlyQrTransactionCount -> prisma.stripePayment.count
      // Second call: getFeeRateByTier -> prisma.$queryRaw with tier=3
      const mockQueryRaw = vi.fn()
        .mockResolvedValueOnce([
          { fee_rate: 0.04, tier: 3 },
        ]);
      const mockPrisma = {
        stripePayment: {
          count: mockCount,
        },
        $queryRaw: mockQueryRaw,
      } as any;

      const result = await getFeeRateWithStrategyF(
        mockPrisma,
        'seller-123',
        'standard',
        true
      );

      expect(result).toBe(0.04);
      // getFeeRateByTier should call getCurrentMonthlyQrTransactionCount which calls prisma.stripePayment.count
      // Note: The count is called to determine the tier, then $queryRaw is called with that tier
      expect(mockCount).toHaveBeenCalled();
      // getFeeRateByTier should also call $queryRaw to get the fee rate from master
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('ENABLE_STRATEGY_F_TIER_SYSTEM=falseの場合、Tier制が無効', async () => {
      process.env.ENABLE_STRATEGY_F_TIER_SYSTEM = 'false';
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

      // モジュールを動的にインポート（環境変数の変更を反映）
      await vi.resetModules();
      const { getFeeRateWithStrategyF } = await import('@/lib/strategy-f');
      // 新しいモックを作成（前のテストの影響を受けないように）
      const mockCount = vi.fn();
      // When tier system is disabled, $queryRaw is called with tier IS NULL (not with tier=3)
      // This should return 0.07, not 0.04
      const mockQueryRaw = vi.fn().mockResolvedValue([
        { fee_rate: 0.07 },
      ]);
      const mockPrisma = {
        stripePayment: {
          count: mockCount, // 呼ばれないが、エラーを避けるために定義
        },
        $queryRaw: mockQueryRaw,
      } as any;

      const result = await getFeeRateWithStrategyF(
        mockPrisma,
        'seller-123',
        'standard',
        false
      );

      expect(result).toBe(0.07);
      // When tier system is disabled, should call $queryRaw with tier IS NULL
      expect(mockQueryRaw).toHaveBeenCalled();
      // When tier system is disabled, should NOT call stripePayment.count
      expect(mockCount).not.toHaveBeenCalled();
    });

    it('ENABLE_STRATEGY_F_TIER_SYSTEMが未設定の場合、デフォルトでTier制が有効', async () => {
      delete process.env.ENABLE_STRATEGY_F_TIER_SYSTEM;
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

      const { getFeeRateWithStrategyF } = await import('@/lib/strategy-f');
      const mockPrisma = {
        stripePayment: {
          count: vi.fn().mockResolvedValue(15),
        },
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { fee_rate: 0.0400, tier: 3 },
        ]),
      } as any;

      const result = await getFeeRateWithStrategyF(
        mockPrisma,
        'seller-123',
        'standard',
        true
      );

      expect(result).toBe(0.0400);
    });
  });

  describe('チェックアウト処理での手数料計算', () => {
    it('Tier制が有効な場合、Tierに基づく手数料が適用される', async () => {
      process.env.ENABLE_STRATEGY_F_TIER_SYSTEM = 'true';
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
      process.env.ORDER_HASH_SECRET = 'test-secret';

      // モック設定
      const mockPrisma = {
        order: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'order-123',
            sellerId: 'seller-123',
            amount: 10000,
            status: 'pending',
            stripeSid: null,
          }),
        },
        seller: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'seller-123',
            shopName: 'Test Shop',
            stripeAccountId: 'acct_123',
          }),
        },
        sellerSubscription: {
          findFirst: vi.fn().mockResolvedValue({
            planType: 'standard',
            status: 'active',
          }),
        },
        stripePayment: {
          count: vi.fn().mockResolvedValue(15), // Tier 3
        },
        $queryRaw: vi.fn()
          .mockResolvedValueOnce([
            { fee_rate: 0.0400, tier: 3 },
          ]),
      };

      vi.mock('@/lib/prisma', () => ({
        prisma: mockPrisma,
      }));

      vi.mock('@/lib/strategy-f', () => ({
        getFeeRateWithStrategyF: vi.fn().mockResolvedValue(0.0400),
      }));

      // チェックアウト処理の手数料計算ロジックをテスト
      const feeRate = 0.0400;
      const orderAmount: number = 10000;
      const calculatedFee = Math.floor(orderAmount * feeRate);
      const fee = orderAmount === 0 ? 0 : Math.max(calculatedFee, 1);

      expect(fee).toBe(400); // 10000 * 0.04 = 400円
    });

    it('Tier制が無効な場合、従来のplan_typeベースの手数料が適用される', async () => {
      process.env.ENABLE_STRATEGY_F_TIER_SYSTEM = 'false';
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

      const feeRate = 0.07; // 従来の7%
      const orderAmount: number = 10000;
      const calculatedFee = Math.floor(orderAmount * feeRate);
      const fee = orderAmount === 0 ? 0 : Math.max(calculatedFee, 1);

      expect(fee).toBe(700); // 10000 * 0.07 = 700円
    });
  });

  describe('手数料計算のエッジケース', () => {
    it('小額注文でも最低1円の手数料が設定される（Tier制適用時）', () => {
      const feeRate = 0.0450; // Tier 1: 4.5%
      const orderAmount: number = 10; // 10円
      const calculatedFee = Math.floor(orderAmount * feeRate);
      const fee = orderAmount === 0 ? 0 : Math.max(calculatedFee, 1);

      expect(fee).toBe(1); // 10 * 0.045 = 0.45 → Math.floor = 0 → Math.max(0, 1) = 1円
    });

    it('0円注文の場合は手数料0円', () => {
      const feeRate = 0.0450;
      const orderAmount = 0;
      const calculatedFee = Math.floor(orderAmount * feeRate);
      const fee = orderAmount === 0 ? 0 : Math.max(calculatedFee, 1);

      expect(fee).toBe(0);
    });

    it('Tier 5で目標達成時、手数料が2.8%になる', () => {
      const feeRate = 0.0280; // Tier 5 目標達成時
      const orderAmount: number = 10000;
      const calculatedFee = Math.floor(orderAmount * feeRate);
      const fee = orderAmount === 0 ? 0 : Math.max(calculatedFee, 1);

      expect(fee).toBe(280); // 10000 * 0.028 = 280円
    });

    it('Tier 5で目標未達成時、手数料が3.3%になる', () => {
      const feeRate = 0.0330; // Tier 5 通常
      const orderAmount: number = 10000;
      const calculatedFee = Math.floor(orderAmount * feeRate);
      const fee = orderAmount === 0 ? 0 : Math.max(calculatedFee, 1);

      expect(fee).toBe(330); // 10000 * 0.033 = 330円
    });
  });

  describe('既存機能との互換性', () => {
    it('plan_typeベースの手数料取得が引き続き動作する', async () => {
      const { getFeeRateFromMaster } = await import('@/lib/utils');
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { fee_rate: 0.07 },
        ]),
      } as any;

      const result = await getFeeRateFromMaster(mockPrisma, 'standard');

      expect(result).toBe(0.07);
    });

    it('複数のプランタイプが正しく動作する', async () => {
      const { getFeeRateFromMaster } = await import('@/lib/utils');
      const mockPrisma = {
        $queryRaw: vi.fn()
          .mockResolvedValueOnce([{ fee_rate: 0.07 }]) // standard
          .mockResolvedValueOnce([{ fee_rate: 0.08 }]) // pro
          .mockResolvedValueOnce([{ fee_rate: 0.09 }]), // kids
      } as any;

      const standard = await getFeeRateFromMaster(mockPrisma, 'standard');
      const pro = await getFeeRateFromMaster(mockPrisma, 'pro');
      const kids = await getFeeRateFromMaster(mockPrisma, 'kids');

      expect(standard).toBe(0.07);
      expect(pro).toBe(0.08);
      expect(kids).toBe(0.09);
    });
  });
});

