// app/api/admin/setup-test-users/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sanitizeError, audit, clientIp } from '@/lib/utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

const setupTestUsersSchema = z.object({
  action: z.enum(['setup-all', 'set']),
  sellerId: z.string().optional(),
  planType: z.enum(['standard', 'pro', 'kids']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!requireAdmin(request)) {
      audit('admin_auth_failed', {
        ip: clientIp(request),
        token: request.headers.get('x-admin-token') ? '***' : 'none',
      });
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Zodバリデーション
    const validationResult = setupTestUsersSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { action, sellerId, planType } = validationResult.data;

    // すべてのテストユーザーを設定
    if (action === 'setup-all') {
      const testUsers = [
        { sellerId: 'test-seller-standard', planType: 'standard' },
        { sellerId: 'test-seller-pro', planType: 'pro' },
        { sellerId: 'test-seller-kids', planType: 'kids' },
      ];

      const results = [];

      for (const user of testUsers) {
        try {
          // 1. セラーが存在するか確認（存在しない場合は作成）
          const seller = await prisma.seller.upsert({
            where: { id: user.sellerId },
            update: {},
            create: {
              id: user.sellerId,
              displayName: `Test Seller (${user.planType})`,
              shopName: `${user.planType.charAt(0).toUpperCase() + user.planType.slice(1)} Shop`,
              email: `${user.planType}@test.example.com`,
            },
          });

          // 2. 既存のアクティブなサブスクリプションを無効化
          const now = new Date();
          await prisma.sellerSubscription.updateMany({
            where: {
              sellerId: user.sellerId,
              status: 'active',
              OR: [
                { endedAt: null },
                { endedAt: { gt: now } },
              ],
            },
            data: {
              status: 'inactive',
              endedAt: new Date(now.getTime() - 1000),
              updatedAt: now,
            },
          });

          // 3. 新しいサブスクリプションを作成
          await prisma.sellerSubscription.create({
            data: {
              sellerId: user.sellerId,
              planType: user.planType,
              status: 'active',
              startedAt: now,
            },
          });

          results.push({
            sellerId: user.sellerId,
            planType: user.planType,
            status: 'success',
          });
        } catch (e) {
          console.error(`Failed to setup test user ${user.sellerId}:`, e);
          results.push({
            sellerId: user.sellerId,
            planType: user.planType,
            status: 'error',
            error: (e as Error).message,
          });
        }
      }

      return NextResponse.json({
        ok: true,
        message: 'テストユーザーの設定が完了しました',
        results,
      });
    }

    // 単一ユーザーの設定
    if (action === 'set') {
      if (!sellerId || !planType) {
        return NextResponse.json(
          { error: 'seller_id_and_plan_type_required' },
          { status: 400 }
        );
      }

      // 1. セラーが存在するか確認（存在しない場合は作成）
      const seller = await prisma.seller.upsert({
        where: { id: sellerId },
        update: {},
        create: {
          id: sellerId,
          displayName: `Test Seller (${planType})`,
          shopName: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Shop`,
          email: `${planType}@test.example.com`,
        },
      });

      // 2. 既存のアクティブなサブスクリプションを無効化
      const now = new Date();
      await prisma.sellerSubscription.updateMany({
        where: {
          sellerId,
          status: 'active',
          OR: [
            { endedAt: null },
            { endedAt: { gt: now } },
          ],
        },
        data: {
          status: 'inactive',
          endedAt: new Date(now.getTime() - 1000),
          updatedAt: now,
        },
      });

      // 3. 新しいサブスクリプションを作成
      await prisma.sellerSubscription.create({
        data: {
          sellerId,
          planType,
          status: 'active',
          startedAt: now,
        },
      });

      return NextResponse.json({
        ok: true,
        message: `テストユーザー ${sellerId} を ${planType} プランに設定しました`,
        sellerId,
        planType,
      });
    }

    return NextResponse.json(
      { error: 'invalid_action' },
      { status: 400 }
    );
  } catch (e) {
    console.error('/api/admin/setup-test-users error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
  }
}
