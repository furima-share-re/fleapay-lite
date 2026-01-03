# デグレチェックレポート

**確認日**: 2026-01-03  
**問題**: 静的ファイル404エラー  
**状態**: ⚠️ **重大なデグレ発見**

---

## 🔍 デグレチェック結果

### ❌ 重大な問題: Next.js統合コードが存在しない

**確認したファイル**: `public/server.js`

**発見された問題**:
- `public/server.js`にNext.js統合コードが見当たらない
- `import next from "next"`がない
- `nextApp.prepare()`がない
- `nextHandler`がない
- `app.all("*", ...)`でNext.jsにフォールバックするコードがない

**現在の`public/server.js`の状態**:
```javascript
// ====== ヘルス / 404 / 静的配信 ======
app.get("/api/ping", (req, res) => res.json({ ok: true }));
app.use("/api", (req, res) => res.status(404).json({ error: "not_found", path: req.path }));
app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fleapay-lite running on port ${port} (100% matched with テーブル作成.txt)`));
```

**期待されるコード**（ドキュメントより）:
```javascript
// Phase 2.3: Next.js統合
import next from "next";

// ====== Phase 2.3: Next.js統合 ======
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev, dir: "./" });
const nextHandler = nextApp.getRequestHandler();

// Next.jsの準備を待ってからサーバーを起動
nextApp.prepare().then(() => {
  app.listen(PORT, () => {
    console.log("✅ Next.js: Integrated");
  });
}).catch((err) => {
  console.error("❌ Next.jsの準備に失敗しました:", err);
  app.listen(PORT, () => {
    console.log("⚠️ Next.js: Failed to initialize");
  });
});

// Expressルートの後にNext.jsフォールバック
app.all("*", (req, res) => {
  return nextHandler(req, res);
});
```

---

## 🔍 原因分析

### 可能性1: `public/server.js`が使用されていない

**デプロイログより**:
```
==> Running 'npm start'
> node .next/standalone/server.js
```

**分析**:
- `package.json`の`start`スクリプトは`node .next/standalone/server.js`
- これは、Next.jsが生成するstandaloneサーバーを使用している
- `public/server.js`は使用されていない可能性が高い

### 可能性2: standaloneビルドの静的ファイル配信問題

**standaloneビルドの仕組み**:
- Next.jsが`.next/standalone/server.js`を自動生成
- 静的ファイルは`.next/static/`に配置される
- standaloneサーバーが静的ファイルを自動的に配信するはず

**問題点**:
- standaloneサーバーが静的ファイルを正しく配信していない可能性
- パスの設定が間違っている可能性

---

## ✅ 解決方法

### 方法1: standaloneビルドの静的ファイル配信を確認（最優先）

standaloneビルドでは、Next.jsが生成するサーバーが静的ファイルを自動的に配信します。問題は、静的ファイルのパスが正しく設定されていない可能性があります。

**確認ポイント**:
1. `.next/standalone/server.js`が静的ファイルを正しく配信しているか
2. `.next/static/`ディレクトリが正しく配置されているか
3. 静的ファイルのパスが正しく設定されているか

### 方法2: `public/server.js`にNext.js統合コードを追加

もし`public/server.js`を使用する場合は、Next.js統合コードを追加する必要があります。

**ただし**:
- 現在は`node .next/standalone/server.js`を使用している
- `public/server.js`を変更しても効果がない可能性が高い

### 方法3: next.config.jsの設定を確認

standaloneビルドで静的ファイルを正しく配信するため、`next.config.js`の設定を確認：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // 静的ファイルの配信設定（必要に応じて追加）
  // assetPrefix: process.env.NODE_ENV === 'production' ? '' : undefined,
  
  env: {
    // 既存の環境変数をNext.jsでも使用可能にする
  },
};

export default nextConfig;
```

---

## 📋 確認チェックリスト

- [x] `public/server.js`にNext.js統合コードがないことを確認
- [x] `package.json`の`start`スクリプトが`node .next/standalone/server.js`であることを確認
- [ ] `.next/standalone/server.js`が静的ファイルを正しく配信しているか確認
- [ ] `.next/static/`ディレクトリが正しく配置されているか確認
- [ ] `next.config.js`の設定を確認
- [ ] Render Dashboardでデプロイログを確認
- [ ] ブラウザで静的ファイルのリクエストを確認

---

## 🚀 推奨される対応手順

### ステップ1: デプロイログで確認

1. Render Dashboardでデプロイログを確認
2. `.next/static/`ディレクトリが生成されているか確認
3. 静的ファイルのパスが正しいか確認

### ステップ2: ブラウザで確認

1. `/admin/dashboard`ページにアクセス
2. 開発者ツール（F12）でNetworkタブを開く
3. 静的ファイルのリクエストを確認
4. 404エラーの詳細を確認

### ステップ3: 必要に応じて設定を修正

1. `next.config.js`の設定を確認・修正
2. Render Dashboardで環境変数を確認
3. 再デプロイを実行

---

## 📝 結論

**重要な発見**:
- `public/server.js`にNext.js統合コードがない（デグレ）
- しかし、現在は`node .next/standalone/server.js`を使用しているため、`public/server.js`は使用されていない
- 問題は、standaloneビルドの静的ファイル配信にある可能性が高い

**次のステップ**:
1. ブラウザで静的ファイルのリクエストを確認
2. 404エラーの詳細を確認
3. 必要に応じて`next.config.js`の設定を修正

