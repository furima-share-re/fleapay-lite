# Fix: Renderデプロイ時のstartCommandエラー

**作成日**: 2026-01-03  
**問題**: Renderデプロイ時に`server.js`が見つからないエラー  
**状態**: ✅ **修正完了**

---

## ❌ 発生した問題

### エラーメッセージ

```
Error: Cannot find module '/opt/render/project/src/server.js'
```

### 原因

1. **Renderダッシュボードの設定**: `startCommand`が`node server.js`になっている可能性がある
2. **Next.js動的ルートの警告**: 一部のAPI Route Handlerで`export const dynamic = 'force-dynamic'`が設定されていない

---

## ✅ 修正内容

### 1. Next.js動的ルートの設定追加 ✅

以下のAPI Route Handlerに`export const dynamic = 'force-dynamic'`を追加：

**修正ファイル**:
- `app/api/seller/order-detail-full/route.ts`
- `app/api/admin/migration-status/route.ts`
- `app/api/seller/check-id/route.ts`

**理由**: 
- `nextUrl.searchParams`を使用しているため動的レンダリングが必要
- `request.headers`を使用しているため動的レンダリングが必要

### 2. Renderダッシュボードの設定確認 ⚠️

**`render.yaml`の設定**:
```yaml
startCommand: npm start
```

**確認事項**:
- ✅ `render.yaml`は正しく設定されている
- ⚠️ Renderダッシュボードの設定が`node server.js`になっている可能性がある

**対応方法**:
Renderダッシュボードで以下の設定を確認・更新してください：
1. Settings → Start Command を開く
2. `npm start` に設定されているか確認
3. 設定されていない場合は `npm start` に変更

---

## 📋 変更されたファイル

### API Route Handlers
- `app/api/seller/order-detail-full/route.ts` - `export const dynamic = 'force-dynamic'`を追加
- `app/api/admin/migration-status/route.ts` - `export const dynamic = 'force-dynamic'`を追加
- `app/api/seller/check-id/route.ts` - `export const dynamic = 'force-dynamic'`を追加

---

## ✅ 確認事項

- [x] `render.yaml`の`startCommand`が`npm start`に設定されている
- [x] 動的ルートに`export const dynamic = 'force-dynamic'`を追加
- [ ] Renderダッシュボードの`startCommand`が`npm start`に設定されている（要確認）

---

## 🚀 次のステップ

### 1. Renderダッシュボードの設定確認

Renderダッシュボードで以下を確認してください：

1. **Settings → Start Command**
   - 設定値: `npm start`
   - もし`node server.js`になっている場合は`npm start`に変更

2. **Settings → Build Command**
   - 設定値: `npm install && npm run build`
   - `render.yaml`の設定と一致しているか確認

### 2. 再デプロイ

設定を更新した後、再デプロイを実行してください。

---

## 📝 注意事項

### 1. Next.jsの動的レンダリング

`export const dynamic = 'force-dynamic'`を設定することで、Next.jsはそのルートを動的にレンダリングします。これは以下の場合に必要です：

- `nextUrl.searchParams`を使用している
- `request.headers`を使用している
- データベースクエリの結果がリクエストごとに変わる

### 2. Renderの設定優先順位

Renderでは以下の優先順位で設定が適用されます：

1. **Renderダッシュボードの設定**（最優先）
2. `render.yaml`の設定

そのため、`render.yaml`が正しくても、ダッシュボードの設定が古い場合はエラーが発生します。

---

**更新日**: 2026-01-03  
**実装者**: AI Assistant

