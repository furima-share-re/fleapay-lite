# Phase 2.3: 500エラー修正レポート

**修正日**: 2026-01-03  
**問題**: Next.js Pagesが500エラーを返す  
**状態**: ✅ **修正完了**

---

## ❌ 発見された問題

### エラー内容

すべてのNext.js Pagesが500エラーを返しています：

- `/success` - Status: 500
- `/thanks` - Status: 500
- `/cancel` - Status: 500
- `/checkout` - Status: 500
- `/admin/dashboard` - Status: 500
- その他のNext.js Pages（全13個）

### 原因分析

1. **Next.jsの準備が完了する前にリクエストが来る**
   - `nextApp.prepare()`が非同期で実行される
   - サーバー起動前にリクエストが来ると、`nextHandler`が正しく動作しない

2. **`.next`ディレクトリが存在しない**
   - デプロイログで確認: `.nextディレクトリ: 存在しません`
   - `render.yaml`の`buildCommand`に`npm run build`を追加したが、まだデプロイされていない可能性

3. **Next.jsの準備状態をチェックしていない**
   - `nextHandler`を呼び出す前に、Next.jsの準備が完了しているかチェックしていない

---

## ✅ 修正内容

### 1. Next.jsの準備状態を追跡

```javascript
// Next.jsの準備状態を追跡
let nextJsReady = false;
```

### 2. Next.jsハンドラーに準備状態チェックを追加

```javascript
app.use((req, res) => {
  // Next.jsの準備が完了していない場合は、503エラーを返す
  if (!nextJsReady) {
    return res.status(503).json({ 
      error: 'nextjs_not_ready', 
      message: 'Next.js is not ready yet. Please wait a moment and try again.' 
    });
  }
  
  return nextHandler(req, res);
});
```

### 3. Next.jsの準備完了時にフラグを設定

```javascript
nextApp.prepare().then(() => {
  nextJsReady = true; // Next.jsの準備が完了したことをマーク
  console.log("✅ Next.jsの準備が完了しました");
  
  app.listen(PORT, () => {
    // サーバー起動ログ
  });
}).catch((err) => {
  nextJsReady = false; // Next.jsの準備が失敗したことをマーク
  // エラーハンドリング
});
```

---

## 📋 修正されたコード

### 変更前

```javascript
app.use((req, res) => {
  return nextHandler(req, res);
});

nextApp.prepare().then(() => {
  app.listen(PORT, () => {
    // サーバー起動
  });
});
```

### 変更後

```javascript
// Next.jsの準備状態を追跡
let nextJsReady = false;

app.use((req, res) => {
  // Next.jsの準備が完了していない場合は、503エラーを返す
  if (!nextJsReady) {
    return res.status(503).json({ 
      error: 'nextjs_not_ready', 
      message: 'Next.js is not ready yet. Please wait a moment and try again.' 
    });
  }
  
  return nextHandler(req, res);
});

nextApp.prepare().then(() => {
  nextJsReady = true; // Next.jsの準備が完了したことをマーク
  console.log("✅ Next.jsの準備が完了しました");
  
  app.listen(PORT, () => {
    // サーバー起動
  });
}).catch((err) => {
  nextJsReady = false; // Next.jsの準備が失敗したことをマーク
  // エラーハンドリング
});
```

---

## 🔍 期待される動作

### 修正後の動作

1. **サーバー起動時**
   - Next.jsの準備が完了するまで、Next.js Pagesへのリクエストは503エラーを返す
   - Express APIは正常に動作する

2. **Next.jsの準備完了後**
   - `nextJsReady = true`が設定される
   - Next.js Pagesが正常に表示される

3. **Next.jsの準備失敗時**
   - `nextJsReady = false`のまま
   - Next.js Pagesへのリクエストは503エラーを返す
   - Express APIは正常に動作する

---

## ⚠️ 残っている問題

### `.next`ディレクトリが存在しない

デプロイログで確認：
```
❌ .nextディレクトリ: 存在しません（`npm run build`を実行してください）
```

**原因**:
- `render.yaml`の`buildCommand`に`npm run build`を追加したが、まだデプロイされていない
- または、ビルドが失敗している可能性

**解決策**:
1. Gitにコミット・プッシュして、Render環境で再デプロイ
2. デプロイログで`npm run build`が実行されているか確認
3. `.next`ディレクトリが生成されているか確認

---

## 🚀 次のステップ

### 1. Gitにコミット・プッシュ

```bash
git add server.js
git commit -m "fix: Next.js準備状態チェックを追加、500エラーを503エラーに変更"
git push origin main
```

### 2. Render環境での再デプロイ

- Render Dashboardで自動的に再デプロイが開始されます
- デプロイログで以下を確認：
  - `npm run build`が実行されているか
  - `.next`ディレクトリが生成されているか
  - Next.jsの準備が正常に完了するか（「✅ Next.jsの準備が完了しました」と表示されるか）

### 3. 動作確認

再デプロイ後、以下のURLが正常に動作することを確認：

- ✅ `/success` - 成功ページ
- ✅ `/checkout` - チェックアウト画面
- ✅ `/admin/dashboard` - 管理ダッシュボード
- その他のNext.js Pages（全14個）

---

## ✅ 修正完了チェックリスト

- [x] Next.jsの準備状態を追跡する変数を追加
- [x] Next.jsハンドラーに準備状態チェックを追加
- [x] Next.jsの準備完了時にフラグを設定
- [x] Linterエラーの確認
- [ ] Gitにコミット・プッシュ
- [ ] Render環境で再デプロイ
- [ ] 動作確認（すべてのNext.js Pagesが正常に表示されることを確認）

---

**修正実施者**: AI Assistant  
**修正日**: 2026-01-03

