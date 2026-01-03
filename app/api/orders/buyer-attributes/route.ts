// app/api/orders/buyer-attributes/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sanitizeError, audit } from '@/lib/utils';

const buyerAttributesSchema = z.object({
  orderId: z.string().uuid('有効なUUIDを入力してください'),
  customer_type: z.enum(['domestic', 'inbound'], {
    errorMap: () => ({ message: 'customer_typeはdomesticまたはinboundである必要があります' })
  }),
  gender: z.enum(['male', 'female', 'unknown'], {
    errorMap: () => ({ message: 'genderはmale、female、またはunknownである必要があります' })
  }),
  age_band: z.enum(['child', 'age_16_29', 'age_30_59', 'age_60_plus'], {
    errorMap: () => ({ message: 'age_bandはchild、age_16_29、age_30_59、またはage_60_plusである必要があります' })
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zodバリデーション
    const validationResult = buyerAttributesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { orderId, customer_type, gender, age_band } = validationResult.data;

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

    // UPSERT（すでにあれば更新）
    await prisma.buyerAttribute.upsert({
      where: { orderId },
      create: {
        orderId,
        customerType: customer_type,
        gender,
        ageBand: age_band,
      },
      update: {
        customerType: customer_type,
        gender,
        ageBand: age_band,
        updatedAt: new Date(),
      },
    });

    audit('buyer_attrs_saved', { orderId, customer_type, gender, age_band });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/orders/buyer-attributes error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
  }
}
