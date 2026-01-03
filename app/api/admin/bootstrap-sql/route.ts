// app/api/admin/bootstrap-sql/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { sanitizeError, audit, clientIp } from '@/lib/utils';

const prisma = new PrismaClient();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

const bootstrapSqlSchema = z.object({
  sql: z.string().min(1, 'SQL文が必要です'),
});

export async function POST(request: NextRequest) {
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

    if (process.env.ADMIN_BOOTSTRAP_SQL_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'bootstrap_sql_disabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Zodバリデーション
    const validationResult = bootstrapSqlSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { sql } = validationResult.data;
    const trimmed = sql.trim();

    // 危険なSQLパターンの検証
    const dangerousPattern = /drop\s+(database|schema|table\s+(sellers|orders|stripe_payments))|truncate\s+table|(delete\s+from\s+(sellers|orders|stripe_payments))/i;

    if (dangerousPattern.test(trimmed)) {
      audit('sql_injection_attempt', {
        sql: trimmed.substring(0, 100),
        ip: clientIp(request),
      });
      return NextResponse.json(
        { error: 'dangerous_sql_detected' },
        { status: 400 }
      );
    }

    // Prismaでは生SQLを実行する必要がある
    // 注意: これは危険な操作なので、本番環境では無効化すべき
    const result = await prisma.$executeRawUnsafe(trimmed);

    audit('sql_executed', {
      length: trimmed.length,
      rowCount: typeof result === 'number' ? result : null,
    });

    return NextResponse.json({
      ok: true,
      rowCount: typeof result === 'number' ? result : null,
    });
  } catch (e) {
    console.error('/api/admin/bootstrap-sql error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

