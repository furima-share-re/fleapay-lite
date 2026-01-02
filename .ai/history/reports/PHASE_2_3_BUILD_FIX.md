# Phase 2.3: ビルドエラー修正レポート

**修正日**: 2026-01-02  
**フェーズ**: Phase 2.3 - Next.js画面移行（全画面実装）  
**状態**: ✅ **修正完了**

---

## 📋 ビルドエラー内容

### エラー1: `window`型定義エラー

**エラーメッセージ**:
```
./app/admin/dashboard/page.tsx:22:28
Type error: Cannot find name 'window'.
```

**原因**:
- `tsconfig.json`の`lib`に`"dom"`と`"dom.iterable"`が含まれていない
- Next.jsのビルド時に`window`や`localStorage`の型定義が認識されない

---

## 🔧 修正内容

### 1. `tsconfig.json`の修正 ✅

**変更前**:
```json
{
  "compilerOptions": {
    "lib": ["ES2022"],
    "moduleResolution": "node",
    ...
  }
}
```

**変更後**:
```json
{
  "compilerOptions": {
    "lib": ["ES2022", "dom", "dom.iterable"],
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "plugins": [
      {
        "name": "next"
      }
    ],
    ...
  },
  "include": ["**/*.ts", "**/*.tsx", "next-env.d.ts", ".next/types/**/*.ts"]
}
```

**変更点**:
- ✅ `lib`に`"dom"`と`"dom.iterable"`を追加
- ✅ `moduleResolution`を`"bundler"`に変更（Next.js推奨）
- ✅ `jsx: "preserve"`を追加
- ✅ `plugins`に`next`を追加
- ✅ `include`に`.next/types/**/*.ts`を追加

### 2. 管理画面の`window`/`localStorage`チェック改善 ✅

**修正ファイル**:
- `app/admin/dashboard/page.tsx`
- `app/admin/sellers/page.tsx`
- `app/admin/frames/page.tsx`
- `app/admin/payments/page.tsx`

**変更前**:
```typescript
const token = typeof window !== 'undefined' 
  ? (window as any).ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken'
  : 'admin-devtoken';
```

**変更後**:
```typescript
const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  ? ((window as any).ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
  : 'admin-devtoken';
```

**変更点**:
- ✅ `localStorage`の存在チェックを追加
- ✅ 括弧を追加して式の優先順位を明確化

### 3. Kidsダッシュボードの`localStorage`アクセス改善 ✅

**修正ファイル**: `app/kids-dashboard/page.tsx`

**変更前**:
```typescript
useEffect(() => {
  if (!sellerId) return;
  
  const keyPrefix = `kids-mission-${sellerId}-`;
  const mission1 = localStorage.getItem(keyPrefix + '1') === 'done';
  // ...
}, [sellerId]);
```

**変更後**:
```typescript
useEffect(() => {
  if (!sellerId) return;
  
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const keyPrefix = `kids-mission-${sellerId}-`;
    const mission1 = localStorage.getItem(keyPrefix + '1') === 'done';
    // ...
  }
  
  loadSummary();
  loadKidsSummary();
}, [sellerId]);
```

**変更点**:
- ✅ `localStorage`アクセスを`useEffect`内で`window`と`localStorage`の存在チェックで囲む

---

## ✅ 修正結果

### 型エラー解決 ✅

**確認項目**:
- ✅ `tsconfig.json`にDOM型定義を追加
- ✅ すべての`window`/`localStorage`アクセスに存在チェックを追加
- ✅ TypeScript型エラー: なし
- ✅ Linterエラー: なし

**判定**: ✅ **修正完了** - ビルドエラーは解決されました。

---

## 📝 注意事項

### 1. Next.jsのビルド設定

- `tsconfig.json`はNext.jsの推奨設定に合わせて更新
- `moduleResolution: "bundler"`はNext.js 14+で推奨
- `jsx: "preserve"`はNext.jsのJSX変換に必要

### 2. クライアントサイドコード

- `'use client'`ディレクティブが設定されているページでも、ビルド時に`window`の型定義が必要
- `typeof window !== 'undefined'`チェックは実行時チェックであり、型チェックには`lib: ["dom"]`が必要

---

## 📚 関連ドキュメント

- `.ai/history/reports/PHASE_2_3_IMPLEMENTATION_REPORT.md` - 実装レポート
- `.ai/history/reports/PHASE_2_3_COMPLIANCE_CHECK.md` - ルール準拠チェック
- `.ai/history/reports/PHASE_2_3_DEGRADATION_CHECK.md` - デグレチェック

---

**レポート作成日**: 2026-01-02  
**修正実施者**: AI Assistant

