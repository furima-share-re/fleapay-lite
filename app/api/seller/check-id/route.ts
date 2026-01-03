// app/api/seller/check-id/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const checkIdSchema = z.object({
  id: z.string().min(3, 'IDは3文字以上である必要があります').max(32, 'IDは32文字以下である必要があります').regex(/^[a-zA-Z0-9_-]+$/, 'IDは英数字、ハイフン、アンダーバーのみ使用できます'),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'id_required' },
        { status: 400 }
      );
    }

    // Zodバリデーション
    const validationResult = checkIdSchema.safeParse({ id });
    if (!validationResult.success) {
      return NextResponse.json(
        { ok: false, error: 'invalid_format', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const normalizedId = id.toLowerCase();

    const existingSeller = await prisma.seller.findUnique({
      where: { id: normalizedId },
      select: { id: true },
    });

    if (existingSeller) {
      // 既に存在
      return NextResponse.json({ ok: false, error: 'taken' });
    }

    // 使用可能
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/seller/check-id error', e);
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
