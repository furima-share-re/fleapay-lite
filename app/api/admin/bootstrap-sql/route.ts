// app/api/admin/bootstrap-sql/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sanitizeError, audit, clientIp } from '@/lib/utils';

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
    // セキュリティ: 本番環境では常に無効化
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      audit('sql_execution_blocked_production', {
        ip: clientIp(request),
        attempted: true,
      });
      return NextResponse.json(
        { error: 'sql_execution_disabled_in_production' },
        { status: 403 }
      );
    }

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

    // 開発環境でも明示的に有効化が必要
    if (process.env.ADMIN_BOOTSTRAP_SQL_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'bootstrap_sql_disabled', message: '環境変数 ADMIN_BOOTSTRAP_SQL_ENABLED を "true" に設定する必要があります（開発環境のみ）' },
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
  }
}

