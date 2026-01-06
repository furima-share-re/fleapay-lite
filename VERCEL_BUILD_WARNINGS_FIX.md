# Vercelビルド警告の対処方法

**作成日**: 2026-01-06  
**状態**: ビルドは成功しているが、警告が表示されている

---

## 📋 警告の内容

### 1. Node.jsバージョンの警告

```
Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released.
```

**意味**: `package.json` の `engines` フィールドが `>=18.0.0` になっているため、新しいメジャーバージョン（例: Node.js 20）がリリースされると自動的にアップグレードされる可能性があります。

### 2. 非推奨パッケージの警告

以下のパッケージが非推奨になっています：

- `rimraf@3.0.2` - v4以降が推奨
- `inflight@1.0.6` - メモリリークの問題あり
- `@humanwhocodes/config-array@0.13.0` - `@eslint/config-array` を使用
- `@humanwhocodes/object-schema@2.0.3` - `@eslint/object-schema` を使用
- `glob@7.2.3` - v9以降が推奨
- `node-domexception@1.0.0` - プラットフォームのネイティブDOMExceptionを使用
- `eslint@8.57.1` - サポート終了

### 3. Node.js非推奨APIの警告

```
DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead.
```

**意味**: `url.parse()` の使用が非推奨です。WHATWG URL APIを使用することを推奨します。

---

## ✅ 対処方法

### 方法1: Node.jsバージョンを固定（推奨）

`package.json` の `engines` フィールドを特定のバージョンに固定します。

#### 現在の設定

```json
"engines": {
  "node": ">=18.0.0"
}
```

#### 推奨設定

```json
"engines": {
  "node": "18.x"
}
```

または、より具体的に：

```json
"engines": {
  "node": "18.20.0"
}
```

**メリット**:
- 予期しないバージョンアップグレードを防ぐ
- ビルドの一貫性を保つ

**注意**: Vercel DashboardでもNode.jsバージョンを設定できます。

### 方法2: 非推奨パッケージの更新（オプション）

非推奨パッケージを更新します。ただし、これは必須ではありません（警告のみで、ビルドは成功しています）。

#### 更新可能なパッケージ

| パッケージ | 現在のバージョン | 推奨バージョン | 優先度 |
|-----------|----------------|--------------|--------|
| `eslint` | `8.57.1` | `9.x` | 🟡 中 |
| `rimraf` | `3.0.2` | `4.x` | 🟢 低 |
| `glob` | `7.2.3` | `9.x` | 🟢 低 |

**注意**: パッケージを更新する際は、破壊的変更がないか確認してください。

### 方法3: `url.parse()` の置き換え（オプション）

コード内で `url.parse()` を使用している箇所をWHATWG URL APIに置き換えます。

#### 例

```javascript
// ❌ 非推奨
const url = require('url');
const parsed = url.parse('https://example.com');

// ✅ 推奨
const parsed = new URL('https://example.com');
```

---

## 🔧 推奨される修正手順

### ステップ1: Node.jsバージョンを固定

`package.json` を更新：

```json
{
  "engines": {
    "node": "18.x"
  }
}
```

### ステップ2: Vercel DashboardでNode.jsバージョンを設定（オプション）

1. Vercel Dashboardでプロジェクトを開く
2. **Settings** > **General** を開く
3. **Node.js Version** を `18.x` に設定

### ステップ3: デプロイ

変更をコミットしてプッシュすると、自動的に再デプロイされます。

---

## ⚠️ 注意事項

1. **警告は問題ない**: これらの警告は、ビルドが成功している限り、すぐに修正する必要はありません。

2. **非推奨パッケージ**: 非推奨パッケージは、セキュリティアップデートが提供されなくなる可能性があります。時間があるときに更新することを推奨します。

3. **Node.jsバージョン**: Node.js 18.xは2025年4月までLTSサポートがあります。将来的にNode.js 20.xへの移行を検討することを推奨します。

---

## 📚 参考

- [Vercel Node.js Version](https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/node-js)
- [Node.js Release Schedule](https://github.com/nodejs/release#release-schedule)
- [ESLint Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)

---

**最終更新**: 2026-01-06

