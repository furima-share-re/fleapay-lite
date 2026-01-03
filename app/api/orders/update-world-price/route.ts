// app/api/orders/update-world-price/route.ts
// Phase 2.6: Express.js廃止 - 世界相場更新APIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sanitizeError } from '@/lib/utils';
import { queueWorldPriceUpdate } from '../../../worldPriceEngine/worldPriceUpdate.js';

const updateWorldPriceSchema = z.object({
  orderId: z.string().uuid('有効なUUIDを入力してください'),
  sellerId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zodバリデーション
    const validationResult = updateWorldPriceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { ok: false, error: 'validation_error', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { orderId, sellerId } = validationResult.data;

    // 削除済み注文のチェック
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, deletedAt: true }
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: 'order_not_found' },
        { status: 404 }
      );
    }

    if (order.deletedAt) {
      return NextResponse.json(
        { ok: false, error: 'order_deleted', message: '削除済みの注文は更新できません' },
        { status: 400 }
      );
    }

    // ここではすぐレスポンスを返し、重い処理はバックグラウンドで実行
    try {
      // Prismaインスタンスを渡す（worldPriceUpdate.jsでPrisma対応が必要）
      queueWorldPriceUpdate(prisma, orderId, sellerId).catch((err) => {
        console.error('[world-price] background error', err);
      });
      return NextResponse.json({ ok: true, status: 'queued' });
    } catch (e) {
      console.error('[world-price] queue error', e);
      return NextResponse.json(
        { ok: false, error: 'queue_failed' },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error('/api/orders/update-world-price error', e);
    return NextResponse.json(
      { ok: false, ...sanitizeError(e) },
      { status: 500 }
    );
  }
}

