# PgBouncerパラメータ修正

**問題**: `ERROR: prepared statement "s0" already exists`  
**原因**: Prisma Clientの設定で`pgbouncer=true`パラメータが正しく設定されていない  
**修正日**: 2026-01-03

---

## 🔍 問題の詳細

### エラーメッセージ

```
ERROR: prepared statement "s0" already exists
ERROR: prepared statement "s1" already exists
ERROR: prepared statement "s2" already exists
```

### 原因

Prismaの公式ドキュメントによると、PgBouncerを使用する場合、接続文字列に`pgbouncer=true`パラメータを追加する必要があります。これにより、Prismaがprepared statementを使用しないように設定されます。

**正しいパラメータ**: `pgbouncer=true`  
**間違ったパラメータ**: `prepared_statements=false`（これはPrismaのパラメータではない）

---

## ✅ 修正内容

### lib/prisma.tsの修正

**修正前**:
```typescript
url: databaseUrl.includes('?') 
  ? `${databaseUrl}&prepared_statements=false`
  : `${databaseUrl}?prepared_statements=false`,
```

**修正後**:
```typescript
// pgbouncer=trueパラメータを確実に追加（既に含まれている場合は追加しない）
let finalDatabaseUrl = databaseUrl;
if (usePgbouncer && !databaseUrl.includes('pgbouncer=true')) {
  finalDatabaseUrl = databaseUrl.includes('?') 
    ? `${databaseUrl}&pgbouncer=true`
    : `${databaseUrl}?pgbouncer=true`;
}

// Prisma Clientの設定で使用
datasources: {
  db: {
    url: finalDatabaseUrl,
  },
},
```

---

## 📋 修正されたファイル

1. ✅ `lib/prisma.ts` - `pgbouncer=true`パラメータを確実に設定

---

## 🚀 次のステップ

### ステップ1: Gitにコミット・プッシュ

```bash
git add lib/prisma.ts
git commit -m "fix: Prisma Clientでpgbouncer=trueパラメータを確実に設定"
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

- **Prisma PgBouncer Configuration**: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer
- **正しいパラメータ**: `pgbouncer=true`（接続文字列に追加）

---

## ✅ 期待される効果

### 修正前の問題

1. ❌ `ERROR: prepared statement "s0" already exists`
2. ❌ `prepared_statements=false`パラメータが正しく動作しない

### 修正後の期待される動作

1. ✅ `pgbouncer=true`パラメータが確実に設定される
2. ✅ Prismaがprepared statementを使用しない
3. ✅ エラーが発生しない

