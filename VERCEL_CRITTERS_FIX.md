# Vercel critters モジュールエラー修正ガイド

**作成日**: 2026-01-06  
**問題**: `Cannot find module 'critters'`

---

## 🔴 エラーの原因

`next.config.js` で `optimizeCss: true` が有効になっているため、`critters` パッケージが必要ですが、`package.json` に追加されていませんでした。

```javascript
experimental: {
  optimizeCss: true,  // これには critters パッケージが必要
}
```

---

## ✅ 解決方法

### 方法1: critters パッケージを追加（推奨）

`package.json` の `dependencies` に `critters` を追加しました：

```json
{
  "dependencies": {
    "critters": "^0.0.24"
  }
}
```

### 方法2: optimizeCss を無効にする（代替案）

もし `optimizeCss` が不要な場合は、`next.config.js` から削除できます：

```javascript
experimental: {
  // optimizeCss: true,  // コメントアウトまたは削除
}
```

---

## 📋 修正内容

- [x] `package.json` に `critters: "^0.0.24"` を追加

---

## 🔧 次のステップ

1. **依存関係をインストール**（ローカル環境）:
   ```bash
   npm install
   ```

2. **変更をコミット**:
   ```bash
   git add package.json package-lock.json
   git commit -m "fix: Add critters package for optimizeCss feature"
   git push
   ```

3. **Vercelで再デプロイ**: 自動的に再デプロイが開始されます

---

## 📚 参考

- [Next.js optimizeCss](https://nextjs.org/docs/app/api-reference/next-config-js/optimizeCss)
- [critters package](https://www.npmjs.com/package/critters)

---

**最終更新**: 2026-01-06

