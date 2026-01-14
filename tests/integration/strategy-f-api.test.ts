/**
 * 戦略F: APIエンドポイントのテスト
 * 
 * テスト対象:
 * - /api/seller/tier-status
 * - /api/admin/community-goal/status
 * - /api/admin/community-goal/update-volume
 * 
 * 実行方法:
 *   npm test -- strategy-f-api
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getTierStatus } from '@/app/api/seller/tier-status/route';
import { GET as getCommunityGoalStatus } from '@/app/api/admin/community-goal/status/route';
import { POST as updateCommunityVolume } from '@/app/api/admin/community-goal/update-volume/route';

// Prismaのモック
const mockPrisma = {
  stripePayment: {
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
} as any;

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('戦略F: APIエンドポイント', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/seller/tier-status', () => {
    it('正常なTier情報を返す', async () => {
      // 月間QR決済回数: 15回（Tier 3）
      mockPrisma.stripePayment.count.mockResolvedValue(15);
      // コミュニティ目標取得
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          {
            phase: 'phase1',
            target_amount: 10000000,
            bonus_fee_rate: 0.0280,
            normal_fee_rate: 0.0330,
          },
        ])
        .mockResolvedValueOnce([{ total_amount: 5000000 }]);

      const request = new NextRequest('http://localhost:3000/api/seller/tier-status?s=seller-123');
      const response = await getTierStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tier.number).toBe(3);
      expect(data.data.tier.name).toBe('エキスパート');
      expect(data.data.tier.currentFeeRatePercent).toBe('4.00');
      expect(data.data.transactionCount.current).toBe(15);
      expect(data.data.communityGoal.phase).toBe('phase1');
    });

    it('sellerIdが指定されていない場合、400を返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/seller/tier-status');
      const response = await getTierStatus(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('seller_id_required');
    });

    it('Tier 5で目標達成時、ボーナス料金を表示', async () => {
      mockPrisma.stripePayment.count.mockResolvedValue(60);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          {
            phase: 'phase1',
            target_amount: 10000000,
            bonus_fee_rate: 0.0280,
            normal_fee_rate: 0.0330,
          },
        ])
        .mockResolvedValueOnce([{ total_amount: 12000000 }]);

      const request = new NextRequest('http://localhost:3000/api/seller/tier-status?s=seller-123');
      const response = await getTierStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tier.number).toBe(5);
      expect(data.data.tier.currentFeeRatePercent).toBe('2.80');
      expect(data.data.communityGoal.isAchieved).toBe(true);
      expect(data.data.tier.feeRateMessage).toContain('目標達成中');
    });

    it('Tier 5で目標未達成時、通常料金とメッセージを表示', async () => {
      mockPrisma.stripePayment.count.mockResolvedValue(60);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          {
            phase: 'phase1',
            target_amount: 10000000,
            bonus_fee_rate: 0.0280,
            normal_fee_rate: 0.0330,
          },
        ])
        .mockResolvedValueOnce([{ total_amount: 5000000 }]);

      const request = new NextRequest('http://localhost:3000/api/seller/tier-status?s=seller-123');
      const response = await getTierStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tier.number).toBe(5);
      expect(data.data.tier.currentFeeRatePercent).toBe('3.30');
      expect(data.data.communityGoal.isAchieved).toBe(false);
      expect(data.data.tier.feeRateMessage).toContain('あと');
    });
  });

  describe('GET /api/admin/community-goal/status', () => {
    it('認証なしで403を返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/community-goal/status');
      const response = await getCommunityGoalStatus(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('unauthorized');
    });

    it('正しい認証トークンで目標状況を取得できる', async () => {
      process.env.ADMIN_TOKEN = 'test-admin-token';

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          {
            phase: 'phase1',
            target_amount: 10000000,
            bonus_fee_rate: 0.0280,
            normal_fee_rate: 0.0330,
          },
        ])
        .mockResolvedValueOnce([{ total_amount: 8000000 }]);

      const request = new NextRequest('http://localhost:3000/api/admin/community-goal/status?phase=phase1', {
        headers: {
          authorization: 'Bearer test-admin-token',
        },
      });
      const response = await getCommunityGoalStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.phase).toBe('phase1');
      expect(data.data.targetAmount).toBe(10000000);
      expect(data.data.currentAmount).toBe(8000000);
      expect(data.data.isAchieved).toBe(false);
    });

    it('phaseパラメータでPhaseを指定できる', async () => {
      process.env.ADMIN_TOKEN = 'test-admin-token';

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          {
            phase: 'phase2',
            target_amount: 40000000,
            bonus_fee_rate: 0.0280,
            normal_fee_rate: 0.0330,
          },
        ])
        .mockResolvedValueOnce([{ total_amount: 35000000 }]);

      const request = new NextRequest('http://localhost:3000/api/admin/community-goal/status?phase=phase2', {
        headers: {
          authorization: 'Bearer test-admin-token',
        },
      });
      const response = await getCommunityGoalStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.phase).toBe('phase2');
      expect(data.data.targetAmount).toBe(40000000);
    });
  });

  describe('POST /api/admin/community-goal/update-volume', () => {
    it('認証なしで401を返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/community-goal/update-volume', {
        method: 'POST',
        body: JSON.stringify({ year: 2024, month: 1 }),
      });
      const response = await updateCommunityVolume(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('unauthorized');
    });

    it('正しい認証トークンで取扱高を更新できる', async () => {
      process.env.ADMIN_TOKEN = 'test-admin-token';

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { total_amount: 5000000, transaction_count: 2000n },
        ])
        .mockResolvedValueOnce([]); // 既存レコードなし

      mockPrisma.$executeRaw.mockResolvedValueOnce(undefined);

      const request = new NextRequest('http://localhost:3000/api/admin/community-goal/update-volume', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-admin-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ year: 2024, month: 1 }),
      });
      const response = await updateCommunityVolume(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalAmount).toBe(5000000);
      expect(data.data.transactionCount).toBe(2000);
    });

    it('yearとmonthを指定して特定月の取扱高を更新できる', async () => {
      process.env.ADMIN_TOKEN = 'test-admin-token';

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { total_amount: 3000000, transaction_count: 1200n },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.$executeRaw.mockResolvedValueOnce(undefined);

      const request = new NextRequest('http://localhost:3000/api/admin/community-goal/update-volume', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-admin-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ year: 2023, month: 12 }),
      });
      const response = await updateCommunityVolume(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.period.year).toBe(2023);
      expect(data.data.period.month).toBe(12);
    });

    it('既存レコードがある場合、更新される', async () => {
      process.env.ADMIN_TOKEN = 'test-admin-token';

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { total_amount: 6000000, transaction_count: 2400n },
        ])
        .mockResolvedValueOnce([{ id: 'existing-id' }]); // 既存レコードあり

      mockPrisma.$executeRaw.mockResolvedValueOnce(undefined);

      const request = new NextRequest('http://localhost:3000/api/admin/community-goal/update-volume', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-admin-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ year: 2024, month: 1 }),
      });
      const response = await updateCommunityVolume(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.totalAmount).toBe(6000000);
      // UPDATE文が呼ばれることを確認
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });
});

