# Fix: 管理者ページUI崩れ修正

**作成日**: 2026-01-03  
**問題**: 管理者ダッシュボードページのUIが崩れている  
**状態**: ✅ **修正完了**

---

## ❌ 発生した問題

### 問題の症状

管理者ダッシュボードページ（`/admin/dashboard`）のUIが崩れている。

### 原因

Tailwind CSSの`globals.css`が`body`に`@apply bg-background text-foreground`を適用しているため、管理者ページの`body`スタイル（`background: var(--fleapay-cream)`など）が上書きされていました。

**競合しているスタイル**:
- `globals.css`の`body { @apply bg-background text-foreground; }`
- 管理者ページの`body { background: var(--fleapay-cream); color: #1A1A1A; }`

---

## ✅ 修正内容

### 1. `globals.css`に管理者ページ専用スタイルを追加

管理者ページのCSSを`globals.css`に追加し、`body:has(.admin-container)`セレクタで管理者ページの`body`スタイルを上書きしました。

**追加したスタイル**:
```css
/* Override Tailwind body styles for admin pages */
body:has(.admin-container) {
  background: #FBF7F0 !important;
  color: #1A1A1A !important;
  margin: 0 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif !important;
}

.admin-container {
  display: flex;
  min-height: 100vh;
}

.admin-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #fff;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.admin-sidebar {
  position: fixed;
  top: 64px;
  left: 0;
  width: 220px;
  height: calc(100vh - 64px);
  background: #fff;
  border-right: 1px solid rgba(0,0,0,0.08);
  padding: 16px 0;
  overflow-y: auto;
}

.admin-content {
  margin-left: 220px;
  margin-top: 64px;
  padding: 24px;
  flex: 1;
  min-height: calc(100vh - 64px);
}
```

### 2. `app/admin/dashboard/page.tsx`のCSSを簡略化

管理者ページの`<style jsx>`から、`globals.css`に移動したスタイルを削除しました。

**削除したスタイル**:
- `body`スタイル（`globals.css`に移動）
- `.admin-container`スタイル（`globals.css`に移動）
- `.admin-header`スタイル（`globals.css`に移動）
- `.admin-sidebar`スタイル（`globals.css`に移動）
- `.admin-content`スタイル（`globals.css`に移動）

---

## 📋 変更されたファイル

- `app/globals.css` - 管理者ページ専用スタイルを追加
- `app/admin/dashboard/page.tsx` - 重複するCSSを削除

---

## ✅ 確認事項

- [x] `globals.css`に管理者ページ専用スタイルを追加
- [x] `body:has(.admin-container)`で管理者ページの`body`スタイルを上書き
- [x] 管理者ページの`<style jsx>`から重複するCSSを削除
- [x] Linterエラー確認（✅ エラーなし）

---

## 🚀 次のステップ

### 1. 再デプロイ

修正をコミット・プッシュ後、Renderで自動再デプロイが実行されます。

### 2. UI確認

再デプロイ後、以下のURLでUIが正常に表示されるか確認してください：

```
https://fleapay-lite-t1.onrender.com/admin/dashboard
```

**確認ポイント**:
- ✅ 背景色が`#FBF7F0`（クリーム色）になっている
- ✅ サイドバーが左側に正しく表示されている
- ✅ ヘッダーが上部に正しく表示されている
- ✅ コンテンツエリアが正しく配置されている

---

## 📝 注意事項

### `:has()`セレクタについて

`body:has(.admin-container)`セレクタを使用していますが、これは比較的新しいCSS機能です。古いブラウザでは対応していない可能性があります。

**対応ブラウザ**:
- Chrome 105+
- Firefox 121+
- Safari 15.4+

### 他の管理者ページへの適用

他の管理者ページ（`/admin/sellers`、`/admin/frames`、`/admin/payments`）も同様に`admin-container`クラスを使用しているため、同じ修正が適用されます。

---

**更新日**: 2026-01-03  
**実装者**: AI Assistant

