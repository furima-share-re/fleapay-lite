// app/api/orders/update-cost/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sanitizeError, audit } from '@/lib/utils';

const updateCostSchema = z.object({
  orderId: z.string().uuid('有効なUUIDを入力してください'),
  costAmount: z.number().min(0, '仕入額は0以上である必要があります').finite('有効な数値を入力してください'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zodバリデーション
    const validationResult = updateCostSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { orderId, costAmount } = validationResult.data;

    // 削除済み注文のチェック
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, deletedAt: true }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'order_not_found' },
        { status: 404 }
      );
    }

    if (order.deletedAt) {
      return NextResponse.json(
        { error: 'order_deleted', message: '削除済みの注文は更新できません' },
        { status: 400 }
      );
    }

    const cost = Math.round(costAmount);

    await prisma.order.update({
      where: { id: orderId },
      data: {
        costAmount: cost,
        updatedAt: new Date(),
      },
    });

    audit('order_cost_updated', { orderId, cost });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/orders/update-cost error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
  }
}
