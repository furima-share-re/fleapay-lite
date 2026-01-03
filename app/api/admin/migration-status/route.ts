// app/api/admin/migration-status/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sanitizeError, audit, clientIp } from '@/lib/utils';
import { getMigrationStatusPrisma } from '@/lib/auth-prisma';

const prisma = new PrismaClient();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

export async function GET(request: NextRequest) {
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

    const status = await getMigrationStatusPrisma(prisma);

    return NextResponse.json(status);
  } catch (error) {
    console.error('migration-status error', error);
    return NextResponse.json(
      sanitizeError(error),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
