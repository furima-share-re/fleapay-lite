// app/api/auth/reset-password/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { sanitizeError, audit } from '@/lib/utils';
import { resetPasswordAndMigratePrisma } from '@/lib/auth-prisma';

const prisma = new PrismaClient();

const resetPasswordSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  newPassword: z.string().min(8, 'パスワードは8文字以上である必要があります'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zodバリデーション
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, newPassword } = validationResult.data;

    const result = await resetPasswordAndMigratePrisma(email, newPassword, prisma);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'reset_failed',
          message: result.error,
        },
        { status: 400 }
      );
    }

    audit('password_reset_and_migrate', {
      email,
      migrated: result.message === 'migrated_to_supabase',
    });

    return NextResponse.json({
      ok: true,
      message: result.message,
      migrated: result.message === 'migrated_to_supabase',
    });
  } catch (error) {
    console.error('reset-password error', error);
    return NextResponse.json(
      sanitizeError(error),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
