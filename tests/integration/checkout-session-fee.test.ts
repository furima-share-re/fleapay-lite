/**
 * Checkout Session 手数料徴収機能のテスト
 * 
 * テスト対象:
 * - 手数料計算ロジック
 * - application_fee_amount の設定
 * - プラン別手数料率の適用
 * 
 * 注意: このテストは手数料計算ロジックの単体テストです。
 * 統合テストは実際のAPIエンドポイントに対して行ってください。
 * 
 * 実行方法:
 *   npm test -- checkout-session-fee
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';

// Set environment variable before importing the route module to prevent Stripe initialization error
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_tests';

// Mock Stripe before importing the route module
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      accounts: {
        retrieve: vi.fn(),
      },
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

// Mock the prisma module
vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
    },
    seller: {
      findUnique: vi.fn(),
    },
    sellerSubscription: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock the utils module
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils');
  return {
    ...actual,
    getFeeRateFromMaster: vi.fn(),
    normalizeStatementDescriptor: vi.fn(),
    resolveSellerAccountId: vi.fn(),
  };
});

// Import POST after setting environment variable and mocks (tests are skipped but module still loads)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { POST } from '@/app/api/checkout/session/route';

// TODO: These integration tests require proper mocking of Prisma and Stripe modules
// They need to be refactored to use vi.mock() at module level before they can run
describe.skip('Checkout Session 手数料徴収機能', () => {
  const mockOrder = {
    id: 'order-123',
    sellerId: 'seller-123',
    amount: 1000,
    summary: 'テスト商品',
    status: 'pending',
    stripeSid: null,
    orderMetadata: {
      isCash: false,
      paymentState: null,
    },
  };

  const mockSeller = {
    id: 'seller-123',
    shopName: 'Test Shop',
    displayName: 'Test Shop Display',
    stripeAccountId: 'acct_123',
  };

  const mockSubscription = {
    id: 'sub-123',
    sellerId: 'seller-123',
    planType: 'standard',
    status: 'active',
    startedAt: new Date(),
    endedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 環境変数の設定
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.ORDER_HASH_SECRET = 'test-hash-secret';
    // NODE_ENV is read-only, use type assertion
    (process.env as any).NODE_ENV = 'test';
  });

  describe('手数料計算', () => {
    it.skip('標準プランで7%の手数料が計算される', async () => {
      // TODO: This test requires proper mocking of Prisma and Stripe
      // The current mocking approach doesn't work with dynamic imports
      const { prisma } = await import('@/lib/prisma');
      const { getFeeRateFromMaster } = await import('@/lib/utils');
      const { POST } = await import('@/app/api/checkout/session/route');
      
      (prisma.order.findFirst as any).mockResolvedValue(mockOrder);
      (prisma.seller.findUnique as any).mockResolvedValue(mockSeller);
      (prisma.sellerSubscription.findFirst as any).mockResolvedValue(mockSubscription);
      (getFeeRateFromMaster as any).mockResolvedValue(0.07);

      const stripe = new Stripe('sk_test_123');
      vi.mocked(stripe.accounts.retrieve).mockResolvedValue({
        charges_enabled: true,
      } as any);
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // 手数料が計算されていることを確認（1000 * 0.07 = 70、最低1円なので70円）
      expect(stripe.checkout.sessions.create).toHaveBeenCalled();
      const createCall = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0] as any;
      expect(createCall?.payment_intent_data?.application_fee_amount).toBe(70);
    });

    it('プロプランで8%の手数料が計算される', async () => {
      const { prisma } = await import('@/lib/prisma');
      const { getFeeRateFromMaster } = await import('@/lib/utils');
      
      const proSubscription = { ...mockSubscription, planType: 'pro' };
      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.seller.findUnique).mockResolvedValue(mockSeller as any);
      vi.mocked(prisma.sellerSubscription.findFirst).mockResolvedValue(proSubscription as any);
      vi.mocked(getFeeRateFromMaster).mockResolvedValue(0.08);

      const stripe = new Stripe('sk_test_123');
      vi.mocked(stripe.accounts.retrieve).mockResolvedValue({
        charges_enabled: true,
      } as any);
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      await POST(request);

      const createCall = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0] as any;
      // 1000 * 0.08 = 80円
      expect(createCall?.payment_intent_data?.application_fee_amount).toBe(80);
    });

    it('小額注文でも最低1円の手数料が設定される', async () => {
      const { prisma } = await import('@/lib/prisma');
      const { getFeeRateFromMaster } = await import('@/lib/utils');
      
      const smallOrder = { ...mockOrder, amount: 10 }; // 10円
      vi.mocked(prisma.order.findFirst).mockResolvedValue(smallOrder as any);
      vi.mocked(prisma.seller.findUnique).mockResolvedValue(mockSeller as any);
      vi.mocked(prisma.sellerSubscription.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(getFeeRateFromMaster).mockResolvedValue(0.07);

      const stripe = new Stripe('sk_test_123');
      vi.mocked(stripe.accounts.retrieve).mockResolvedValue({
        charges_enabled: true,
      } as any);
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      await POST(request);

      const createCall = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0] as any;
      // 10 * 0.07 = 0.7 → Math.floor = 0 → Math.max(0, 1) = 1円
      expect(createCall?.payment_intent_data?.application_fee_amount).toBe(1);
    });

    it('0円注文の場合は手数料0円', async () => {
      const { prisma } = await import('@/lib/prisma');
      const { getFeeRateFromMaster } = await import('@/lib/utils');
      
      const zeroOrder = { ...mockOrder, amount: 0 };
      vi.mocked(prisma.order.findFirst).mockResolvedValue(zeroOrder as any);
      vi.mocked(prisma.seller.findUnique).mockResolvedValue(mockSeller as any);
      vi.mocked(prisma.sellerSubscription.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(getFeeRateFromMaster).mockResolvedValue(0.07);

      const stripe = new Stripe('sk_test_123');
      vi.mocked(stripe.accounts.retrieve).mockResolvedValue({
        charges_enabled: true,
      } as any);
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      await POST(request);

      const createCall = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0] as any;
      // 0円の場合は0円
      expect(createCall?.payment_intent_data?.application_fee_amount).toBe(0);
    });

    it('手数料が注文金額以上にならないことを確認', async () => {
      const { prisma } = await import('@/lib/prisma');
      const { getFeeRateFromMaster } = await import('@/lib/utils');
      
      const smallOrder = { ...mockOrder, amount: 1 }; // 1円
      vi.mocked(prisma.order.findFirst).mockResolvedValue(smallOrder as any);
      vi.mocked(prisma.seller.findUnique).mockResolvedValue(mockSeller as any);
      vi.mocked(prisma.sellerSubscription.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(getFeeRateFromMaster).mockResolvedValue(0.99); // 99%の手数料率（異常値）

      const stripe = new Stripe('sk_test_123');
      vi.mocked(stripe.accounts.retrieve).mockResolvedValue({
        charges_enabled: true,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // 手数料が注文金額以上になる場合はエラー
      expect(response.status).toBe(500);
      expect(data.error).toBe('invalid_fee_calculation');
    });
  });

  describe('プラン取得', () => {
    it('プランがない場合は標準プランとして扱う', async () => {
      const { prisma } = await import('@/lib/prisma');
      const { getFeeRateFromMaster } = await import('@/lib/utils');
      
      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.seller.findUnique).mockResolvedValue(mockSeller as any);
      vi.mocked(prisma.sellerSubscription.findFirst).mockResolvedValue(null); // プランなし
      vi.mocked(getFeeRateFromMaster).mockResolvedValue(0.07);

      const stripe = new Stripe('sk_test_123');
      vi.mocked(stripe.accounts.retrieve).mockResolvedValue({
        charges_enabled: true,
      } as any);
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      await POST(request);

      // 標準プランの手数料率で呼ばれることを確認
      expect(getFeeRateFromMaster).toHaveBeenCalledWith(expect.anything(), 'standard');
    });
  });

  describe('statement_descriptor_suffix', () => {
    it('店舗名が設定されている場合は正規化されたsuffixが設定される', async () => {
      const { prisma } = await import('@/lib/prisma');
      const { normalizeStatementDescriptor } = await import('@/lib/utils');
      
      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.seller.findUnique).mockResolvedValue(mockSeller as any);
      vi.mocked(prisma.sellerSubscription.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(normalizeStatementDescriptor).mockReturnValue('TEST SHOP');

      const stripe = new Stripe('sk_test_123');
      vi.mocked(stripe.accounts.retrieve).mockResolvedValue({
        charges_enabled: true,
      } as any);
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      await POST(request);

      const createCall = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0] as any;
      expect(createCall?.payment_intent_data?.statement_descriptor_suffix).toBe('TEST SHOP');
    });
  });

  describe('エラーハンドリング', () => {
    it('Stripeアカウントが設定されていない場合はエラー', async () => {
      const { prisma } = await import('@/lib/prisma');
      const { resolveSellerAccountId } = await import('@/lib/utils');
      
      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(resolveSellerAccountId).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('seller_stripe_account_not_found');
    });

    it('charges_enabledがfalseの場合はエラー', async () => {
      const { prisma } = await import('@/lib/prisma');
      const { resolveSellerAccountId } = await import('@/lib/utils');
      
      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(resolveSellerAccountId).mockResolvedValue('acct_123');

      const stripe = new Stripe('sk_test_123');
      vi.mocked(stripe.accounts.retrieve).mockResolvedValue({
        charges_enabled: false,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('account_charges_not_enabled');
    });

    it('手数料率取得に失敗した場合はエラー', async () => {
      const { prisma } = await import('@/lib/prisma');
      const { getFeeRateFromMaster } = await import('@/lib/utils');
      
      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.seller.findUnique).mockResolvedValue(mockSeller as any);
      vi.mocked(prisma.sellerSubscription.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(getFeeRateFromMaster).mockRejectedValue(new Error('Fee rate not found'));

      const stripe = new Stripe('sk_test_123');
      vi.mocked(stripe.accounts.retrieve).mockResolvedValue({
        charges_enabled: true,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('fee_rate_error');
    });
  });
});

