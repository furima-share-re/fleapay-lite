import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Transaction Pooler (pgbouncer) を使用している場合、prepared statementを無効にする必要がある
// DATABASE_URLに?pgbouncer=trueが含まれている場合は、prepared statementを無効にする
const databaseUrl = process.env.DATABASE_URL || '';
const usePgbouncer = databaseUrl.includes('pgbouncer=true') || databaseUrl.includes(':6543');

// pgbouncer=trueパラメータを確実に追加（既に含まれている場合は追加しない）
let finalDatabaseUrl = databaseUrl;
if (usePgbouncer && !databaseUrl.includes('pgbouncer=true')) {
  finalDatabaseUrl = databaseUrl.includes('?') 
    ? `${databaseUrl}&pgbouncer=true`
    : `${databaseUrl}?pgbouncer=true`;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Transaction Poolerを使用している場合、pgbouncer=trueパラメータを確実に設定
  // これにより、Prismaがprepared statementを使用しないように設定される
  ...(usePgbouncer && {
    datasources: {
      db: {
        url: finalDatabaseUrl,
      },
    },
  }),
});

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

