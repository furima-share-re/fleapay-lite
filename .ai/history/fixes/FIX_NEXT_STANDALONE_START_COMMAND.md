# Fix: Next.js standaloneモードのstartCommand修正

**作成日**: 2026-01-03  
**問題**: `next start`が`output: standalone`設定と互換性がない警告  
**状態**: ✅ **修正完了**

---

## ❌ 発生した問題

### 警告メッセージ

```
⚠ "next start" does not work with "output: standalone" configuration. Use "node .next/standalone/server.js" instead.
```

### 原因

`next.config.js`で`output: 'standalone'`が設定されているため、`next start`ではなく`node .next/standalone/server.js`を使用する必要があります。

**`next.config.js`の設定**:
```javascript
export default {
  output: 'standalone',
  ...
};
```

---

## ✅ 修正内容

### `package.json`の`start`スクリプトを修正

**変更前**:
```json
{
  "scripts": {
    "start": "next start",
    ...
  }
}
```

**変更後**:
```json
{
  "scripts": {
    "start": "node .next/standalone/server.js",
    ...
  }
}
```

---

## 📋 変更されたファイル

- `package.json` - `start`スクリプトを`node .next/standalone/server.js`に変更

---

## ✅ 確認事項

- [x] `next.config.js`に`output: 'standalone'`が設定されている
- [x] `package.json`の`start`スクリプトを`node .next/standalone/server.js`に変更
- [x] デプロイが成功している（警告は出ているが動作は正常）

---

## 🚀 次のステップ

### 1. 再デプロイ

修正をコミット・プッシュ後、Renderで自動再デプロイが実行されます。

### 2. 警告解消確認

再デプロイ後、警告が解消されているか確認してください。

---

## 📝 注意事項

### Next.js standaloneモードについて

`output: 'standalone'`モードは、Next.jsアプリケーションをより効率的にデプロイするための機能です：

- **利点**:
  - 必要なファイルのみを含む最小限のデプロイ
  - より高速な起動時間
  - 依存関係の最適化

- **使用方法**:
  - ビルド後、`.next/standalone/`ディレクトリが生成される
  - `node .next/standalone/server.js`で起動する

### Renderでの動作

Renderでは`npm start`が実行されるため、`package.json`の`start`スクリプトが正しく設定されていれば、自動的に`node .next/standalone/server.js`が実行されます。

---

**更新日**: 2026-01-03  
**実装者**: AI Assistant




