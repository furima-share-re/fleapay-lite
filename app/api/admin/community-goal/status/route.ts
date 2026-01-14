/**
 * コミュニティ目標達成状況取得API
 * 管理者用: 現在のPhaseの目標達成状況を取得
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCommunityGoalStatus } from '@/lib/strategy-f';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function requireAdmin(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  return token === ADMIN_TOKEN;
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const phase = (url.searchParams.get('phase') || 'phase1') as 'phase1' | 'phase2' | 'phase3';

    const status = await getCommunityGoalStatus(prisma, phase);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[CommunityGoalStatus] Error:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

