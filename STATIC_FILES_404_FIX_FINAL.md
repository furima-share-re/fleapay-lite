# 静的ファイル404エラー最終修正ガイド

**問題**: `/next/static/chunks/`と`/next/static/css/`のファイルが404エラー  
**確認日**: 2026-01-03  
**状態**: ⚠️ **原因特定・修正方法作成**

---

## 🔍 問題の詳細

### エラーメッセージ

コンソールに以下のエラーが表示されています：
- `GET https://fleapay-lite-t1.onrender.com/next/static/chunks/... 404 (Not Found)`
- `GET https://fleapay-lite-t1.onrender.com/next/static/css/... 404 (Not Found)`

### 影響

- CSSファイルが読み込まれない → スタイルが適用されない → **画面が崩れる**
- JavaScriptファイルが読み込まれない → インタラクティブな機能が動作しない

---

## 🔍 原因分析

### Standaloneビルドの静的ファイル配信

Next.jsのstandaloneビルドでは：
1. `.next/standalone/`ディレクトリに最小限のファイルがコピーされる
2. `.next/standalone/.next/static/`に静的ファイルが配置される
3. `.next/standalone/server.js`が静的ファイルを自動的に配信する

**問題点**:
- standaloneビルドで静的ファイルが正しく配信されていない可能性
- パスの設定が間違っている可能性

---

## ✅ 解決方法

### 方法1: Render DashboardでBASE_URLを確認（最優先）

Render Dashboardで`BASE_URL`の設定値を確認：

1. Render Dashboardにログイン
2. `fleapay-lite-t1`サービスを選択
3. **Environment**タブを開く
4. `BASE_URL`の値を確認

**確認ポイント**:
- `BASE_URL`が空の場合: `next.config.js`の設定は不要
- `BASE_URL`が設定されている場合: `assetPrefix`の設定が必要な可能性

### 方法2: next.config.jsの設定を確認・修正

standaloneビルドで静的ファイルを正しく配信するため、`next.config.js`を確認：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // BASE_URLが設定されている場合、assetPrefixを設定
  // Render環境では通常空文字列で問題ないが、必要に応じて設定
  // assetPrefix: process.env.BASE_URL || '',
  
  env: {
    // 既存の環境変数をNext.jsでも使用可能にする
  },
};

export default nextConfig;
```

### 方法3: デプロイログで静的ファイルの生成を確認

Render Dashboardでデプロイログを確認：

1. Render Dashboardにログイン
2. `fleapay-lite-t1`サービスを選択
3. **Logs**タブを開く
4. 最新のデプロイログを確認
5. `.next/static/`ディレクトリが生成されているか確認

---

## 🔧 修正手順

### ステップ1: Render DashboardでBASE_URLを確認

1. Render Dashboardにログイン
2. `fleapay-lite-t1`サービスを選択
3. **Environment**タブを開く
4. `BASE_URL`の値を確認

### ステップ2: next.config.jsを修正（必要に応じて）

`BASE_URL`が設定されている場合、`next.config.js`に以下を追加：

```javascript
assetPrefix: process.env.BASE_URL || '',
```

### ステップ3: Gitにコミット・プッシュ

```bash
git add next.config.js
git commit -m "fix: standaloneビルドの静的ファイル配信設定を修正"
git push origin main
```

### ステップ4: Render環境で再デプロイ

1. Render Dashboardで自動的に再デプロイが開始されます
2. デプロイログでビルドの成功を確認
3. 動作確認を実行

---

## 📋 確認チェックリスト

- [ ] Render Dashboardで`BASE_URL`の値を確認
- [ ] 必要に応じて`next.config.js`を修正
- [ ] Gitにコミット・プッシュ
- [ ] Render環境で再デプロイ
- [ ] `/admin/dashboard`ページで動作確認
- [ ] 静的ファイルが正しく読み込まれるか確認
- [ ] 画面の崩れが解消されたか確認

---

## 🚀 推奨される対応手順

### ステップ1: Render DashboardでBASE_URLを確認

1. Render Dashboardにログイン
2. `fleapay-lite-t1`サービスを選択
3. **Environment**タブを開く
4. `BASE_URL`の値を確認

### ステップ2: next.config.jsを修正（必要に応じて）

`BASE_URL`が設定されている場合、`next.config.js`に`assetPrefix`を追加：

```javascript
assetPrefix: process.env.BASE_URL || '',
```

### ステップ3: 再デプロイ

1. Gitにコミット・プッシュ
2. Render環境で自動的に再デプロイが開始されます
3. デプロイログでビルドの成功を確認

### ステップ4: 動作確認

1. `/admin/dashboard`ページにアクセス
2. ブラウザのキャッシュをクリア（Ctrl+Shift+R）
3. 開発者ツールで静的ファイルのリクエストを確認
4. 404エラーが解消されたか確認
5. 画面の崩れが解消されたか確認

---

## 📝 参考情報

- **Next.js Standalone Output**: https://nextjs.org/docs/pages/api-reference/next-config-js/output
- **Next.js Static File Serving**: https://nextjs.org/docs/basic-features/static-file-serving
- **Next.js Asset Prefix**: https://nextjs.org/docs/api-reference/next.config.js/assetPrefix
- **Render Dashboard**: https://dashboard.render.com
- **検証環境URL**: https://fleapay-lite-t1.onrender.com

