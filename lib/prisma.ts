import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Transaction Pooler (pgbouncer) を使用している場合、prepared statementを無効にする必要がある
// DATABASE_URLに?pgbouncer=trueが含まれている場合は、prepared statementを無効にする
const databaseUrl = process.env.DATABASE_URL || '';
const usePgbouncer = databaseUrl.includes('pgbouncer=true') || databaseUrl.includes(':6543');

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Transaction Poolerを使用している場合、prepared statementを無効にする
  // これにより、"prepared statement already exists"エラーを防ぐ
  ...(usePgbouncer && {
    datasources: {
      db: {
        url: databaseUrl.includes('?') 
          ? `${databaseUrl}&prepared_statements=false`
          : `${databaseUrl}?prepared_statements=false`,
      },
    },
  }),
});

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

