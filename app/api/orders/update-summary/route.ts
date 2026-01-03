// app/api/orders/update-summary/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { sanitizeError, audit } from '@/lib/utils';

const prisma = new PrismaClient();

const updateSummarySchema = z.object({
  orderId: z.string().uuid('有効なUUIDを入力してください'),
  summary: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zodバリデーション
    const validationResult = updateSummarySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { orderId, summary } = validationResult.data;

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

    await prisma.order.update({
      where: { id: orderId },
      data: {
        summary: summary || null,
        updatedAt: new Date(),
      },
    });

    audit('order_summary_updated', { orderId });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/orders/update-summary error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
