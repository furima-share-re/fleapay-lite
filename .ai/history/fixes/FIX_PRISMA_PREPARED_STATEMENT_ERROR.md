# Prisma Prepared Statementエラー修正

**問題**: `ERROR: prepared statement "s9" does not exist`  
**原因**: 複数のAPI Route Handlerで`new PrismaClient()`を直接使用し、`$disconnect()`を呼び出している  
**修正日**: 2026-01-03

---

## 🔍 問題の詳細

### エラーメッセージ

```
ERROR: prepared statement "s9" does not exist
ERROR: prepared statement "s5" does not exist
ERROR: prepared statement "s14" does not exist
```

### 原因

1. **複数のAPI Route Handlerで`new PrismaClient()`を直接使用**
   - `app/api/seller/analytics/route.ts`
   - `app/api/admin/dashboard/route.ts`
   - その他のAPI Route Handler

2. **`$disconnect()`を呼び出している**
   - `$disconnect()`を呼び出すと、prepared statementが無効になる
   - 次のリクエストでprepared statementが見つからずエラーが発生

3. **シングルトンパターンを使用していない**
   - `lib/prisma.ts`にシングルトンパターンが実装されているが、使用されていない

---

## ✅ 修正方法

### 1. すべてのAPI Route Handlerで`lib/prisma.ts`を使用

**修正前**:
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

**修正後**:
```typescript
import { prisma } from '@/lib/prisma';
```

### 2. `$disconnect()`を削除

**修正前**:
```typescript
finally {
  await prisma.$disconnect();
}
```

**修正後**:
```typescript
// $disconnect()は削除（Next.jsのサーバーレス環境では不要）
```

---

## 📋 修正が必要なファイル

1. `app/api/seller/analytics/route.ts`
2. `app/api/admin/dashboard/route.ts`
3. `app/api/checkout/result/route.ts`
4. `app/api/seller/check-id/route.ts`
5. `app/api/admin/migration-status/route.ts`
6. `app/api/seller/order-detail-full/route.ts`
7. `app/api/webhooks/stripe/route.ts`
8. `app/api/admin/bootstrap-sql/route.ts`

---

## 🚀 修正手順

1. すべてのAPI Route Handlerで`lib/prisma.ts`からインポートする
2. `$disconnect()`を削除する
3. Gitにコミット・プッシュする
4. Render環境で再デプロイする

---

## 📝 参考情報

- **Prisma Client Best Practices**: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
- **Next.js Serverless Functions**: Prisma Clientはシングルトンパターンを使用する必要がある

