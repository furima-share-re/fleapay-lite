// app/api/seller/orders/[orderId]/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sanitizeError, audit } from '@/lib/utils';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const sellerId = request.nextUrl.searchParams.get('s');

    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id_required' },
        { status: 400 }
      );
    }

    if (!sellerId) {
      return NextResponse.json(
        { error: 'seller_id_required' },
        { status: 400 }
      );
    }

    // 注文の存在確認とseller_idの確認（削除済みも含む）
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        sellerId: true,
        amount: true,
        summary: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'order_not_found' },
        { status: 404 }
      );
    }

    // 出店者IDが一致するか確認
    if (order.sellerId !== sellerId) {
      return NextResponse.json(
        {
          error: 'forbidden',
          message: 'この取引を削除する権限がありません。',
        },
        { status: 403 }
      );
    }

    // 既に削除済みの場合
    if (order.deletedAt) {
      return NextResponse.json(
        {
          error: 'already_deleted',
          message: 'この取引は既に削除されています。',
        },
        { status: 400 }
      );
    }

    // 既に決済済み（paid）の場合は削除を制限（安全のため）
    if (order.status === 'paid') {
      return NextResponse.json(
        {
          error: 'cannot_delete_paid_order',
          message: '決済済みの注文は削除できません。返金処理を行ってください。',
        },
        { status: 400 }
      );
    }

    // 論理削除（deleted_atを設定）
    await prisma.order.update({
      where: { id: orderId },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    audit('order_deleted_by_seller', {
      orderId,
      sellerId: order.sellerId,
      amount: order.amount,
      status: order.status,
    });

    return NextResponse.json({ ok: true, message: '取引を削除しました。' });
  } catch (e) {
    console.error('/api/seller/orders/:orderId DELETE error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
