// app/api/orders/metadata/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sanitizeError, audit } from '@/lib/utils';

// ⚠️ paymentMethodはDBに保存しない。is_cash（Boolean）のみ保存・更新する
const orderMetadataSchema = z.object({
  orderId: z.string().uuid('有効なUUIDを入力してください'),
  category: z.string().optional().nullable(),
  buyer_language: z.string().optional().nullable(),
  is_cash: z.boolean().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zodバリデーション
    const validationResult = orderMetadataSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { orderId, category, buyer_language, is_cash } = validationResult.data;

    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id_required' },
        { status: 400 }
      );
    }

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

    // is_cash が送られてこなかった場合は、既存の値を維持する
    const normalizedIsCash = typeof is_cash === 'boolean' ? is_cash : null;

    // paymentState を決定: is_cash が true なら cash_completed、それ以外は stripe_pending
    const paymentState = normalizedIsCash === true ? 'cash_completed' : 'stripe_pending';

    // UPSERT
    await prisma.orderMetadata.upsert({
      where: { orderId },
      create: {
        orderId,
        category: category || null,
        buyerLanguage: buyer_language || null,
        isCash: normalizedIsCash ?? false,
        paymentState,
      },
      update: {
        category: category !== undefined ? category : undefined,
        buyerLanguage: buyer_language !== undefined ? buyer_language : undefined,
        // is_cash が null のときは既存の値を残す
        isCash: normalizedIsCash !== null ? normalizedIsCash : undefined,
        // is_cash が更新される場合は paymentState も更新して整合性を保つ
        paymentState: normalizedIsCash !== null ? (normalizedIsCash === true ? 'cash_completed' : 'stripe_pending') : undefined,
      },
    });

    audit('order_metadata_saved', { orderId, category, buyer_language, is_cash });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/orders/metadata error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
  }
}
