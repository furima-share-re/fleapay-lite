# Phase 2.4, 2.5, 2.6 実装状況

**作成日**: 2026-01-03  
**状態**: 🚧 **実装中**

---

## ✅ 完了した項目

### Phase 2.4: Tailwind CSS + shadcn/ui導入

- [x] `tailwind.config.js` 作成
- [x] `postcss.config.js` 作成
- [x] `app/globals.css` 作成（Tailwindディレクティブ追加）
- [x] `app/layout.tsx` にglobals.cssをインポート
- [x] `package.json` にTailwind CSS依存関係追加
- [x] `components.json` 作成（shadcn/ui設定）
- [x] `lib/utils.ts` に`cn`関数追加

### Phase 2.5: React Hook Form + Zod導入

- [x] `package.json` に依存関係追加
  - `react-hook-form`
  - `zod`
  - `@hookform/resolvers`

### Phase 2.6: Express.js廃止（準備）

- [x] `lib/utils.ts` に既存ユーティリティ関数を追加（Next.js用に書き直し）
  - `bumpAndAllow`
  - `clientIp`
  - `isSameOrigin`
  - `audit`
  - `resolveSellerAccountId`
  - `buildSellerUrls`
  - `jstDayBounds`
  - `getNextOrderNo`
  - `sanitizeError`
  - `slugify`

---

## ⏳ 進行中の項目

### Phase 2.4: Tailwind CSS + shadcn/ui導入

- [ ] shadcn/uiコンポーネント追加（Button, Input, Form等）
- [ ] 既存ページのTailwind化

### Phase 2.5: React Hook Form + Zod導入

- [ ] フォーム移行（seller-register, checkout等）
- [ ] API Route Handlerのバリデーション

### Phase 2.6: Express.js廃止

- [ ] 残りAPIエンドポイント移行
- [ ] Express.js依存関係削除
- [ ] デプロイ設定更新

---

## 📋 次のステップ

1. **shadcn/uiコンポーネント追加**
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add input
   npx shadcn-ui@latest add form
   ```

2. **フォーム移行**
   - `app/seller-register/page.tsx` をReact Hook Form + Zod化
   - `app/checkout/page.tsx` をReact Hook Form + Zod化

3. **API移行**
   - `/api/orders/*` エンドポイントをNext.js Route Handlerに移行
   - `/api/seller/check-id` をNext.js Route Handlerに移行
   - その他の残りAPIエンドポイント

---

**更新日**: 2026-01-03

