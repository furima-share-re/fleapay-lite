# Prepared Statement "Already Exists" エラー修正

**問題**: `ERROR: prepared statement "s8" already exists`  
**原因**: Transaction Pooler (pgbouncer) を使用している場合、prepared statementが使用できない  
**修正日**: 2026-01-03

---

## 🔍 問題の詳細

### エラーメッセージ

```
ERROR: prepared statement "s8" already exists
ERROR: prepared statement "s9" already exists
ERROR: prepared statement "s10" already exists
ERROR: prepared statement "s11" already exists
```

### 原因

Transaction Pooler (pgbouncer) を使用している場合：
- Prepared statementはセッション間で共有されない
- 同じprepared statement名が重複して作成されるとエラーが発生
- Prisma Clientはデフォルトでprepared statementを使用する

---

## ✅ 修正内容

### lib/prisma.tsの修正

Transaction Poolerを使用している場合、接続文字列に`prepared_statements=false`を追加：

```typescript
// Transaction Pooler (pgbouncer) を使用している場合、prepared statementを無効にする
const databaseUrl = process.env.DATABASE_URL || '';
const usePgbouncer = databaseUrl.includes('pgbouncer=true') || databaseUrl.includes(':6543');

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Transaction Poolerを使用している場合、prepared statementを無効にする
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
```

---

## 📋 修正されたファイル

1. ✅ `lib/prisma.ts` - Transaction Pooler検出とprepared statement無効化を追加

---

## 🚀 次のステップ

### ステップ1: Gitにコミット・プッシュ

```bash
git add lib/prisma.ts
git commit -m "fix: Transaction Pooler使用時にprepared statementを無効化"
git push origin main
```

### ステップ2: Render環境で再デプロイ

1. Render Dashboardで自動的に再デプロイが開始されます
2. デプロイログでエラーが解消されたか確認
3. prepared statementエラーが発生しないことを確認

### ステップ3: 動作確認

1. `/admin/dashboard`ページにアクセス
2. `/api/seller/analytics`エンドポイントをテスト
3. prepared statementエラーが発生しないことを確認

---

## 📝 参考情報

- **Prisma Client Connection Pooling**: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
- **pgbouncer and Prepared Statements**: Transaction Poolerではprepared statementが使用できない

---

## ✅ 期待される効果

### 修正前の問題

1. ❌ `ERROR: prepared statement "s8" already exists`
2. ❌ Transaction Poolerでprepared statementが使用できない

### 修正後の期待される動作

1. ✅ prepared statementが無効化される
2. ✅ Transaction Poolerで正常に動作する
3. ✅ エラーが発生しない

