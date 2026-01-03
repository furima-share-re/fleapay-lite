// Phase 2: Next.js移行
// Express API: /api/ping をNext.js Route Handlerに移行

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { execSync } from 'child_process';

// Gitコミット情報を取得（デプロイ状態確認用）
let gitCommitHash = 'unknown';
let gitCommitDate = 'unknown';
try {
  gitCommitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  gitCommitDate = execSync('git log -1 --format="%ci" HEAD', { encoding: 'utf-8' }).trim();
} catch (error) {
  // Git情報が取得できない場合（デプロイ環境など）は無視
  console.warn('Git情報の取得に失敗しました（デプロイ環境の可能性）:', (error as Error).message);
}

export async function GET() {
  try {
    // Prisma経由でデータベース接続を確認（SELECT 1のみ）
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      version: '3.2.0-seller-summary-fixed-nextjs',
      prisma: 'connected',
      git: {
        commit: gitCommitHash,
        date: gitCommitDate
      }
    });
  } catch (error) {
    // Prisma接続エラー時は従来の動作（後方互換性のため）
    console.error('Prisma connection error (fallback to basic ping):', (error as Error).message);
    return NextResponse.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      version: '3.2.0-seller-summary-fixed-nextjs',
      prisma: 'not_available',
      git: {
        commit: gitCommitHash,
        date: gitCommitDate
      }
    });
  }
}

