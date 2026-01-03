# Phase 2.3: Next.js統合実装レポート

**実装日**: 2026-01-03  
**目的**: ExpressサーバーとNext.jsを統合して、Next.js Pagesを配信できるようにする  
**状態**: ✅ **実装完了**

---

## 📋 実装内容

### 1. Next.jsのインポート追加

`server.js`の先頭にNext.jsのインポートを追加：

```javascript
// Phase 2.3: Next.js統合
import next from "next";
```

### 2. Next.jsアプリケーションの初期化

Expressサーバーの設定の後に、Next.jsアプリケーションを初期化：

```javascript
// ====== Phase 2.3: Next.js統合 ======
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev, dir: "./" });
const nextHandler = nextApp.getRequestHandler();
```

**設定内容**:
- `dev`: 本番環境では`false`、開発環境では`true`
- `dir: "./"`: プロジェクトルートを指定（Next.jsの設定ファイルとappディレクトリを検出）

### 3. Next.jsページのフォールバック追加

ExpressのAPIルートと静的ファイルの後に、Next.jsページをフォールバック：

```javascript
// ====== Phase 2.3: Next.jsページのフォールバック ======
// ExpressのAPIルートと静的ファイルの後に、Next.jsページをフォールバック
app.all("*", (req, res) => {
  // ExpressのAPIルート（/api/*）は既に処理されているので、Next.jsにフォールバック
  // 静的ファイル（public/*）も既に処理されているので、Next.jsにフォールバック
  return nextHandler(req, res);
});
```

**動作**:
- ExpressのAPIルート（`/api/*`）が優先される
- 静的ファイル（`public/*`）が優先される
- それ以外のリクエストはNext.jsページにフォールバック

### 4. サーバー起動の変更

Next.jsの準備を待ってからサーバーを起動：

```javascript
// Next.jsの準備を待ってからサーバーを起動
nextApp.prepare().then(() => {
  app.listen(PORT, () => {
    // サーバー起動ログ
    console.log("✅ Next.js: Integrated");
  });
}).catch((err) => {
  console.error("❌ Next.jsの準備に失敗しました:", err);
  // Next.jsの準備に失敗した場合でも、Expressサーバーは起動
  app.listen(PORT, () => {
    console.log("⚠️ Next.js: Failed to initialize");
  });
});
```

**エラーハンドリング**:
- Next.jsの準備に失敗した場合でも、Expressサーバーは起動する
- これにより、既存のExpress APIは動作し続ける

---

## 🔄 リクエスト処理の優先順位

1. **ExpressのAPIルート** (`/api/*`)
   - 既存のExpress APIが優先される
   - Next.jsのAPI Route Handlersも動作する（`/api/ping`など）

2. **静的ファイル** (`public/*`)
   - `public/`ディレクトリの静的ファイルが優先される

3. **HTMLファイルのルーティング**
   - `serveHtmlWithFallback`関数で処理されるHTMLファイル

4. **Next.jsページ** (`app/*`)
   - 上記に該当しないすべてのリクエストがNext.jsページにフォールバック
   - `/success`, `/checkout`, `/admin/dashboard`など

---

## ✅ 期待される動作

### 正常動作する項目

1. **Express API** - 既存のAPIが正常に動作
2. **Next.js API Route Handlers** - `/api/ping`などが正常に動作
3. **静的ファイル** - `public/`ディレクトリのファイルが正常に配信
4. **Next.js Pages** - `/success`, `/checkout`, `/admin/dashboard`などが正常に表示

### 動作確認が必要な項目

1. **Next.js Pagesの表示**
   - `/success` - 成功ページ
   - `/thanks` - サンクスページ
   - `/cancel` - キャンセルページ
   - `/checkout` - チェックアウト画面
   - `/seller-register` - セラー登録画面
   - `/seller-purchase-standard` - 標準プラン決済画面
   - `/admin/dashboard` - 管理ダッシュボード
   - `/admin/sellers` - 出店者管理
   - `/admin/frames` - AIフレーム管理
   - `/admin/payments` - 決済管理
   - `/kids-dashboard` - Kidsダッシュボード

---

## 🚀 次のステップ

### 1. デプロイと動作確認

1. **Gitにコミット・プッシュ**
   ```bash
   git add server.js
   git commit -m "feat: server.jsにNext.js統合コードを追加"
   git push origin main
   ```

2. **Render環境での再デプロイ**
   - Render Dashboardで自動的に再デプロイが開始されます
   - デプロイログで以下を確認：
     - Next.jsのビルドが実行されているか
     - `.next`ディレクトリが生成されているか
     - サーバー起動時に「✅ Next.js: Integrated」と表示されるか

3. **動作確認**
   - すべてのNext.js Pagesが正常に表示されることを確認
   - Express APIが正常に動作することを確認

### 2. エラーハンドリングの確認

- Next.jsの準備に失敗した場合の動作を確認
- Expressサーバーが正常に起動することを確認

---

## 📊 実装ファイル

- ✅ `server.js` - Next.js統合コードを追加

---

## ✅ 実装完了チェックリスト

- [x] Next.jsのインポートを追加
- [x] Next.jsアプリケーションの初期化
- [x] Next.jsページのフォールバック追加
- [x] サーバー起動の変更（Next.jsの準備を待つ）
- [x] エラーハンドリングの追加
- [ ] Gitにコミット・プッシュ
- [ ] Render環境で再デプロイ
- [ ] 動作確認

---

**実装実施者**: AI Assistant  
**実装日**: 2026-01-03

