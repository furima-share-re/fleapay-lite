import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isSameOrigin, normalizeSellerId } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
    }

    const body = await request.json();
    const rawSellerId = String(body?.sellerId || '');
    const shopName = typeof body?.shopName === 'string' ? body.shopName.trim() : '';
    const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';

    if (!rawSellerId) {
      return NextResponse.json({ error: 'seller_id_required' }, { status: 400 });
    }

    if (!shopName && !displayName) {
      return NextResponse.json({ error: 'profile_fields_required' }, { status: 400 });
    }

    const sellerId = normalizeSellerId(rawSellerId);

    const updated = await prisma.seller.update({
      where: { id: sellerId },
      data: {
        shopName: shopName || undefined,
        displayName: displayName || undefined
      },
      select: {
        id: true,
        shopName: true,
        displayName: true
      }
    });

    return NextResponse.json({
      sellerId: updated.id,
      shopName: updated.shopName,
      displayName: updated.displayName
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'seller_not_found' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ error: 'update_failed', message }, { status: 500 });
  }
}
