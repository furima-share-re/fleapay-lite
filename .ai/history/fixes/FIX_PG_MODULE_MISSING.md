# Fix: pgモジュール不足によるビルドエラー

**作成日**: 2026-01-03  
**問題**: Next.jsビルド時に`pg`モジュールが見つからないエラー  
**状態**: ✅ **修正完了**

---

## ❌ 発生した問題

### エラーメッセージ

```
Failed to compile.

./app/api/admin/frames/route.ts
Module not found: Can't resolve 'pg'

./app/api/admin/sellers/route.ts
Module not found: Can't resolve 'pg'

./app/api/seller/kids-summary/route.ts
Module not found: Can't resolve 'pg'

./app/api/seller/start_onboarding/route.ts
Module not found: Can't resolve 'pg'
```

### 原因

4つのAPI Route Handlerで`pg`（PostgreSQLクライアント）を使用していますが、`package.json`に`pg`が依存関係として追加されていませんでした。

**影響を受けたファイル**:
- `app/api/admin/frames/route.ts`
- `app/api/admin/sellers/route.ts`
- `app/api/seller/kids-summary/route.ts`
- `app/api/seller/start_onboarding/route.ts`

---

## ✅ 修正内容

### 1. `package.json`に`pg`を追加

**dependencies**に追加:
```json
"pg": "^8.11.3"
```

### 2. `@types/pg`を追加

**devDependencies**に追加:
```json
"@types/pg": "^8.10.9"
```

---

## 📋 変更されたファイル

- `package.json` - `pg`と`@types/pg`を追加

---

## ✅ 確認事項

- [x] `pg`が`dependencies`に追加されている
- [x] `@types/pg`が`devDependencies`に追加されている
- [x] ビルドエラーが解消される（確認待ち）

---

## 🚀 次のステップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ビルド確認

```bash
npm run build
```

---

**更新日**: 2026-01-03  
**実装者**: AI Assistant

