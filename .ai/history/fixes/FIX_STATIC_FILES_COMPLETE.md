# 静的ファイル404エラー修正完了

**修正日**: 2026-01-03  
**問題**: standaloneビルドで静的ファイルが404エラー  
**状態**: ✅ **修正完了**

---

## ✅ 実施した修正

### 1. package.jsonにpostbuildスクリプトを追加

```json
{
  "scripts": {
    "build": "next build",
    "postbuild": "node scripts/copy-static-files.js"
  }
}
```

**動作**:
- `npm run build`の後に自動的に`postbuild`が実行される
- 静的ファイルとpublicファイルがstandaloneディレクトリにコピーされる

### 2. 静的ファイルコピースクリプトを作成

`scripts/copy-static-files.js`を作成：

- `.next/static/` → `.next/standalone/.next/static/`にコピー
- `public/` → `.next/standalone/public/`にコピー

---

## 🚀 デプロイ手順

### ステップ1: Gitにコミット・プッシュ

```bash
git add package.json scripts/copy-static-files.js
git commit -m "fix: standaloneビルドの静的ファイルコピーを追加"
git push origin main
```

### ステップ2: Render環境で再デプロイ

1. Render Dashboardで自動的に再デプロイが開始されます
2. デプロイログで以下を確認：
   ```
   > next build
   ✓ Compiled successfully
   > postbuild
   📦 Copying static files for standalone build...
     ✅ Static files copied
     ✅ Public files copied
   ✅ Static files copy completed
   ```

### ステップ3: 動作確認

1. `/admin/dashboard`ページにアクセス
2. ブラウザのキャッシュをクリア（Ctrl+Shift+R）
3. 開発者ツールで静的ファイルのリクエストを確認
4. **404エラーが解消されたか確認**
5. **画面の崩れが解消されたか確認**

---

## 📊 期待される結果

### デプロイログ

```
==> Running build command 'npm install && npm run build'...
> next build
✓ Compiled successfully
> postbuild
📦 Copying static files for standalone build...
  Copying .next/static -> .next/standalone/.next/static
  ✅ Static files copied
  Copying public -> .next/standalone/public
  ✅ Public files copied
✅ Static files copy completed
```

### ブラウザ

- ✅ CSSファイルが正常に読み込まれる
- ✅ JavaScriptファイルが正常に読み込まれる
- ✅ 画面が正常に表示される（崩れない）
- ✅ インタラクティブな機能が動作する

---

## 📋 修正されたファイル

1. ✅ `package.json` - `postbuild`スクリプトを追加
2. ✅ `scripts/copy-static-files.js` - 静的ファイルコピースクリプトを作成

---

## 📝 参考情報

- **Next.js Standalone Output**: https://nextjs.org/docs/pages/api-reference/next-config-js/output
- **Next.js公式ドキュメント**: standaloneビルドでは静的ファイルの手動コピーが必要

