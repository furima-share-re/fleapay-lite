# デプロイ問題分析: 静的ファイル404エラー

**確認日**: 2026-01-03  
**問題**: `/admin/dashboard`ページでCSS/JSファイルが404エラー  
**状態**: ⚠️ **原因分析中**

---

## 🔍 問題の詳細

### エラーメッセージ

1. **CSSファイル404エラー**:
   ```
   Failed to load resource: the server responded with a status of 404
   a1e4600e01d42049.css:1
   ```

2. **JavaScriptファイル404エラー**:
   ```
   Failed to load resource: the server responded with a status of 404
   page-2b1778508c47e43f.js:1
   ```

3. **ChunkLoadError**:
   ```
   ChunkLoadError: Loading chunk 427 failed.
   https://fleapay-lite-t1.onrender.com/next/static/chunks/app/admin/dashboard/page-2b1778508c47e43f.js
   ```

4. **Reactエラー**:
   ```
   Uncaught Error: Minified React error #423
   ```

---

## 🔍 原因分析

### 現在の設定

1. **next.config.js**:
   ```javascript
   output: 'standalone'
   ```

2. **package.json**:
   ```json
   {
     "scripts": {
       "start": "node .next/standalone/server.js",
       "build": "next build"
     }
   }
   ```

3. **render.yaml**:
   ```yaml
   buildCommand: npm install && npm run build
   startCommand: npm start
   ```

### 問題の可能性

#### 可能性1: standaloneビルドの静的ファイルパス問題

Next.jsのstandaloneビルドでは、静的ファイルは`.next/static/`に配置されますが、サーバー側で正しく配信する必要があります。

**確認が必要**:
- `.next/standalone/server.js`が静的ファイルを正しく配信しているか
- 静的ファイルのパスが正しく設定されているか

#### 可能性2: Renderでのビルドが失敗している

`render.yaml`には`buildCommand: npm install && npm run build`が設定されていますが、実際にビルドが実行されていない可能性があります。

**確認方法**:
1. Render Dashboardでデプロイログを確認
2. `npm run build`が実行されているか確認
3. `.next`ディレクトリが生成されているか確認

#### 可能性3: standaloneビルドの設定が不完全

standaloneビルドを使用する場合、静的ファイルの配信に追加の設定が必要な場合があります。

---

## ✅ 推奨される解決方法

### 方法1: Render Dashboardでビルドログを確認（最優先）

1. Render Dashboardにログイン
2. `fleapay-lite-t1`サービスを選択
3. **Logs**タブを開く
4. 最新のデプロイログを確認：
   - `npm run build`が実行されているか
   - ビルドエラーが発生していないか
   - `.next`ディレクトリが生成されているか

### 方法2: next.config.jsの設定を確認・修正

standaloneビルドで静的ファイルを正しく配信するため、`next.config.js`に以下を追加：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // 静的ファイルの配信設定
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : undefined,
  
  // 環境変数の設定
  env: {
    // 既存の環境変数をNext.jsでも使用可能にする
  },
};
```

### 方法3: ビルドコマンドの確認

`package.json`の`build`スクリプトが正しく設定されているか確認：

```json
{
  "scripts": {
    "build": "next build",
    "start": "node .next/standalone/server.js"
  }
}
```

### 方法4: Render DashboardでbuildCommandを手動設定

`render.yaml`の設定が反映されていない可能性があるため、Render Dashboardで直接設定：

1. Render Dashboardにログイン
2. `fleapay-lite-t1`サービスを選択
3. **Settings**タブを開く
4. **Build Command**を確認・設定：
   ```
   npm install && npm run build
   ```
5. **Save Changes**をクリック
6. **Manual Deploy** → **Deploy latest commit**を実行

---

## 📋 確認チェックリスト

- [ ] Render Dashboardでデプロイログを確認
- [ ] `npm run build`が実行されているか確認
- [ ] `.next`ディレクトリが生成されているか確認
- [ ] ビルドエラーが発生していないか確認
- [ ] `next.config.js`の設定を確認
- [ ] Render DashboardでbuildCommandを確認・設定
- [ ] 再デプロイを実行
- [ ] 動作確認を実行

---

## 🚀 次のステップ

1. **Render Dashboardでログを確認**
   - デプロイログでビルドの実行状況を確認
   - エラーメッセージがあれば記録

2. **必要に応じて設定を修正**
   - `next.config.js`の設定を確認・修正
   - Render DashboardでbuildCommandを確認・設定

3. **再デプロイを実行**
   - Render DashboardでManual Deployを実行
   - デプロイログでビルドの成功を確認

4. **動作確認を実行**
   - `/admin/dashboard`ページにアクセス
   - 静的ファイルが正しく読み込まれるか確認
   - コンソールエラーが解消されたか確認

