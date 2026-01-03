# Standaloneビルドの静的ファイル404エラー修正ガイド

**問題**: standaloneビルドで静的ファイル（CSS/JS）が404エラー  
**確認日**: 2026-01-03  
**状態**: ⚠️ **原因分析・修正方法作成**

---

## 🔍 問題の詳細

### デプロイログの確認結果

✅ **ビルド成功**:
- `npm run build`が実行されている
- Next.jsのビルドが成功（`✓ Compiled successfully`）
- 36個のページが生成されている
- standaloneビルドが成功している

✅ **サーバー起動成功**:
- `node .next/standalone/server.js`でサーバーが起動
- Next.jsのstandaloneサーバーが正常に起動（`✓ Ready in 594ms`）

❌ **問題**:
- 静的ファイル（CSS/JS）が404エラーになっている可能性

---

## 🔍 原因分析

### Standaloneビルドの仕組み

Next.jsのstandaloneビルドでは：
1. `.next/standalone/`ディレクトリに最小限のファイルがコピーされる
2. `.next/standalone/.next/static/`に静的ファイルが配置される
3. `.next/standalone/server.js`が静的ファイルを自動的に配信する

### 考えられる原因

1. **静的ファイルのパス問題**
   - standaloneビルドでは、静的ファイルのパスが異なる可能性
   - `.next/static/`が正しく配信されていない可能性

2. **Next.jsの設定問題**
   - `next.config.js`の設定が不完全な可能性
   - `assetPrefix`や`basePath`の設定が必要な可能性

3. **Renderの環境変数問題**
   - `BASE_URL`などの環境変数が正しく設定されていない可能性

---

## ✅ 解決方法

### 方法1: next.config.jsの設定を確認・修正

standaloneビルドで静的ファイルを正しく配信するため、`next.config.js`を確認：

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

### 方法2: Renderの環境変数を確認

Render Dashboardで以下の環境変数が正しく設定されているか確認：

- `NODE_ENV=production`
- `BASE_URL`（必要に応じて）

### 方法3: ブラウザのキャッシュをクリア

ブラウザのキャッシュが原因の可能性があります：

1. ブラウザの開発者ツールを開く（F12）
2. Networkタブを開く
3. **Disable cache**にチェックを入れる
4. ページをリロード（Ctrl+Shift+R）

### 方法4: デプロイ後の動作確認

デプロイが成功したので、以下を確認：

1. `/admin/dashboard`ページにアクセス
2. ブラウザの開発者ツールでコンソールを確認
3. Networkタブで静的ファイルのリクエストを確認
4. 404エラーが解消されたか確認

---

## 📋 Next.js Standaloneビルドの静的ファイル配信

### Standaloneビルドの構造

```
.next/
├── standalone/
│   ├── server.js          # Next.jsサーバー
│   ├── .next/
│   │   ├── static/        # 静的ファイル
│   │   └── server/         # サーバーサイドコード
│   └── node_modules/      # 必要な依存関係のみ
└── static/                # 静的ファイル（コピー元）
```

### 静的ファイルの配信

standaloneビルドでは、Next.jsが生成する`server.js`が静的ファイルを自動的に配信します。

**期待される動作**:
- `/next/static/chunks/...` → `.next/standalone/.next/static/chunks/...`
- `/next/static/css/...` → `.next/standalone/.next/static/css/...`

---

## 🔍 トラブルシューティング

### 1. 静的ファイルのパスを確認

ブラウザの開発者ツールで、静的ファイルのリクエストURLを確認：

**期待されるURL**:
- `https://fleapay-lite-t1.onrender.com/next/static/chunks/...`
- `https://fleapay-lite-t1.onrender.com/next/static/css/...`

**実際のURL**:
- 404エラーになっているURLを確認
- パスが正しいか確認

### 2. Render Dashboardでログを確認

1. Render Dashboardにログイン
2. `fleapay-lite-t1`サービスを選択
3. **Logs**タブを開く
4. 静的ファイルのリクエストログを確認
5. 404エラーの詳細を確認

### 3. ローカルで確認

ローカルでstandaloneビルドを実行して確認：

```bash
npm run build
node .next/standalone/server.js
```

ブラウザで`http://localhost:3000/admin/dashboard`にアクセスして、静的ファイルが正しく読み込まれるか確認。

---

## 📋 確認チェックリスト

- [x] デプロイログでビルド成功を確認
- [x] `npm run build`が実行されていることを確認
- [x] standaloneサーバーが起動していることを確認
- [ ] `/admin/dashboard`ページで動作確認
- [ ] 静的ファイルが正しく読み込まれるか確認
- [ ] コンソールエラーが解消されたか確認
- [ ] ブラウザのキャッシュをクリアして再確認

---

## 🚀 次のステップ

### ステップ1: 動作確認を実行

デプロイが成功したので、以下を確認：

1. **ブラウザでページにアクセス**
   - https://fleapay-lite-t1.onrender.com/admin/dashboard

2. **開発者ツールで確認**
   - F12で開発者ツールを開く
   - Consoleタブでエラーを確認
   - Networkタブで静的ファイルのリクエストを確認

3. **キャッシュをクリア**
   - Ctrl+Shift+Rでハードリロード
   - または、開発者ツールで「Disable cache」にチェック

### ステップ2: 問題が続く場合の対応

もし静的ファイルの404エラーが続く場合：

1. **next.config.jsの設定を確認**
   - `assetPrefix`の設定が必要か確認

2. **Render Dashboardで環境変数を確認**
   - `BASE_URL`などの環境変数が正しく設定されているか確認

3. **デプロイログを再確認**
   - ビルドエラーがないか確認
   - 静的ファイルが正しく生成されているか確認

---

## 📝 参考情報

- **Next.js Standalone Output**: https://nextjs.org/docs/pages/api-reference/next-config-js/output
- **Next.js Static File Serving**: https://nextjs.org/docs/basic-features/static-file-serving
- **Render Dashboard**: https://dashboard.render.com
- **検証環境URL**: https://fleapay-lite-t1.onrender.com

