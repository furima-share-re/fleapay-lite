/**
 * 手数料率機能のテスト
 * 
 * テスト対象:
 * - getFeeRateFromMaster() 関数
 * - normalizeStatementDescriptor() 関数
 * 
 * 実行方法:
 *   npm test -- fee-rate
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getFeeRateFromMaster, normalizeStatementDescriptor } from '@/lib/utils';

// Prismaのモック
const mockPrisma = {
  $queryRaw: vi.fn(),
} as unknown as PrismaClient;

describe('手数料率機能', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFeeRateFromMaster', () => {
    it('有効な手数料率を取得できる', async () => {
      const mockFeeRate = [{ fee_rate: 0.07 }];
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockFeeRate);

      const result = await getFeeRateFromMaster(mockPrisma, 'standard');

      expect(result).toBe(0.07);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('プロプランの手数料率を取得できる', async () => {
      const mockFeeRate = [{ fee_rate: 0.08 }];
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockFeeRate);

      const result = await getFeeRateFromMaster(mockPrisma, 'pro');

      expect(result).toBe(0.08);
    });

    it('キッズプランの手数料率を取得できる', async () => {
      const mockFeeRate = [{ fee_rate: 0.09 }];
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockFeeRate);

      const result = await getFeeRateFromMaster(mockPrisma, 'kids');

      expect(result).toBe(0.09);
    });

    it('マスタにデータがない場合、開発環境ではデフォルト値（7%）を返す', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([]);

      const result = await getFeeRateFromMaster(mockPrisma, 'standard', true);

      expect(result).toBe(0.07);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('マスタにデータがない場合、本番環境ではエラーを投げる', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([]);

      await expect(
        getFeeRateFromMaster(mockPrisma, 'standard', false)
      ).rejects.toThrow('Fee rate not found');

      process.env.NODE_ENV = originalEnv;
    });

    it('緊急固定レート（ENV）があればそれを使用', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalOverride = process.env.FEE_RATE_EMERGENCY_OVERRIDE;
      
      process.env.NODE_ENV = 'production';
      process.env.FEE_RATE_EMERGENCY_OVERRIDE = '0.10';
      
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([]);

      const result = await getFeeRateFromMaster(mockPrisma, 'standard', false);

      expect(result).toBe(0.10);
      
      process.env.NODE_ENV = originalEnv;
      if (originalOverride) {
        process.env.FEE_RATE_EMERGENCY_OVERRIDE = originalOverride;
      } else {
        delete process.env.FEE_RATE_EMERGENCY_OVERRIDE;
      }
    });

    it('無効なplanTypeでエラーを投げる', async () => {
      await expect(
        getFeeRateFromMaster(mockPrisma, 'invalid' as any, true)
      ).rejects.toThrow('Invalid planType');
    });

    it('無効なfee_rate値でエラーを投げる', async () => {
      const mockFeeRate = [{ fee_rate: 1.5 }]; // 100%を超える
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockFeeRate);

      await expect(
        getFeeRateFromMaster(mockPrisma, 'standard', false)
      ).rejects.toThrow('Invalid fee_rate value');
    });
  });

  describe('normalizeStatementDescriptor', () => {
    it('店舗名を正規化できる', () => {
      const result = normalizeStatementDescriptor('テスト店舗', 'EVENT');
      expect(result).toBe('TEST');
    });

    it('英数字とハイフンを含む店舗名を正規化できる', () => {
      const result = normalizeStatementDescriptor('Shop-123', 'EVENT');
      expect(result).toBe('SHOP-123');
    });

    it('日本語を含む店舗名から日本語を削除', () => {
      const result = normalizeStatementDescriptor('テスト店舗123', 'EVENT');
      expect(result).toBe('123');
    });

    it('*を含む店舗名から*を削除', () => {
      const result = normalizeStatementDescriptor('Shop*Name', 'EVENT');
      expect(result).toBe('SHOPNAME');
    });

    it('空白を正規化（連続空白を1つに）', () => {
      const result = normalizeStatementDescriptor('Shop  Name', 'EVENT');
      expect(result).toBe('SHOP NAME');
    });

    it('最大22文字に切り詰める', () => {
      const longName = 'A'.repeat(30);
      const result = normalizeStatementDescriptor(longName, 'EVENT');
      expect(result.length).toBe(22);
    });

    it('正規化後が空ならEVENTを返す', () => {
      const result = normalizeStatementDescriptor('***', 'EVENT');
      expect(result).toBe('EVENT');
    });

    it('null/undefinedの場合はeventNameを使用', () => {
      const result1 = normalizeStatementDescriptor(null, 'EVENT');
      const result2 = normalizeStatementDescriptor(undefined, 'CUSTOM');
      
      expect(result1).toBe('EVENT');
      expect(result2).toBe('CUSTOM');
    });

    it('eventNameも空の場合はEVENTを返す', () => {
      const result = normalizeStatementDescriptor(null, '');
      expect(result).toBe('EVENT');
    });

    it('大文字に変換される', () => {
      const result = normalizeStatementDescriptor('shop-name', 'EVENT');
      expect(result).toBe('SHOP-NAME');
    });
  });
});

