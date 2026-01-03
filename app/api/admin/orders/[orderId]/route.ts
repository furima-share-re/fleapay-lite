// app/api/admin/orders/[orderId]/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sanitizeError, audit, clientIp } from '@/lib/utils';

const prisma = new PrismaClient();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
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

    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id_required' },
        { status: 400 }
      );
    }

    // 注文の存在確認（削除済みも含む）
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
    const deletedAt = new Date();
    await prisma.order.update({
      where: { id: orderId },
      data: {
        deletedAt,
        updatedAt: deletedAt,
      },
    });

    audit('order_deleted_by_admin', {
      orderId,
      sellerId: order.sellerId,
      amount: order.amount,
      summary: order.summary,
      deletedAt: deletedAt.toISOString(),
      ip: clientIp(request),
    });

    return NextResponse.json({
      ok: true,
      message: '取引を削除しました（論理削除）',
      deletedOrder: {
        id: order.id,
        sellerId: order.sellerId,
        amount: order.amount,
        deletedAt: deletedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error('delete order error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
