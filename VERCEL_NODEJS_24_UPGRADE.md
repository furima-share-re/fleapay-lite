# Vercel Node.js 24.x アップグレードガイド

**作成日**: 2026-01-06  
**変更**: Node.js 18.x → 24.x

---

## 🔄 変更内容

### `package.json` の更新

```json
{
  "engines": {
    "node": "24.x"
  },
  "devDependencies": {
    "@types/node": "^24.0.0"
  }
}
```

---

## ✅ 修正完了項目

- [x] `engines.node` を `24.x` に更新
- [x] `@types/node` を `^24.0.0` に更新

---

## 🔍 互換性確認

### 主要な依存関係

以下の依存関係は Node.js 24.x と互換性があります：

| パッケージ | バージョン | Node.js 24.x 互換性 |
|-----------|-----------|-------------------|
| `next` | `^14.2.0` | ✅ 互換 |
| `react` | `^18.3.0` | ✅ 互換 |
| `@prisma/client` | `^5.9.1` | ✅ 互換 |
| `stripe` | `^19.3.0` | ✅ 互換 |
| `@supabase/supabase-js` | `^2.39.0` | ✅ 互換 |
| `pg` | `^8.11.3` | ✅ 互換 |

---

## ⚠️ 注意事項

1. **Node.js 24.x の新機能**: Node.js 24.x には新しい機能や変更が含まれている可能性があります。ビルドが成功するか確認してください。

2. **依存関係の更新**: 必要に応じて、他の依存関係も更新することを検討してください。

3. **ローカル開発環境**: ローカル開発環境でも Node.js 24.x を使用することを推奨します。

---

## 📚 参考

- [Node.js 24 Release Notes](https://nodejs.org/en/blog/release/v24.0.0)
- [Vercel Node.js Version](https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/node-js)

---

**最終更新**: 2026-01-06

