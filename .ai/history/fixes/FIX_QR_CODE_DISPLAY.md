# QRコード表示問題の修正

**更新日**: 2026-01-02

---

## 🔴 問題

セラーダッシュボードでQRコードが表示されない

**症状**:
- 「販売画面URL をよみこみ中…」と表示されたまま
- QRコード画像が表示されない

---

## 🔍 原因調査

### 1. APIエンドポイントの確認

**エンドポイント**: `/api/seller/summary`

**確認結果**: ❌ **500エラー**

```powershell
# テスト結果
Error: リモート サーバーがエラーを返しました: (500) 内部サーバー エラー
Status: 500
```

**問題点**:
- APIが500エラーを返している
- そのため、JavaScriptの`loadSummary()`関数がエラーになり、QRコード生成のコードまで到達していない

---

## 🎯 解決策

### ステップ1: APIエンドポイントの動作確認

1. **ブラウザの開発者ツールを開く**
   - F12キーを押す
   - 「Console」タブを開く
   - 「Network」タブを開く

2. **セラーダッシュボードをリロード**
   - ページをリロード（F5）
   - Networkタブで`/api/seller/summary`リクエストを確認

3. **エラーメッセージを確認**
   - レスポンスの内容を確認
   - コンソールにエラーメッセージがないか確認

### ステップ2: データベース接続の確認

**問題の可能性**:
- データベース接続エラー
- テーブルが存在しない
- クエリエラー

**確認方法**:
1. Render Dashboardでログを確認
2. エラーメッセージを確認
3. データベース接続が正常か確認

### ステップ3: セラーIDの確認

**問題の可能性**:
- URLパラメータ`s`が正しく設定されていない
- セラーIDがデータベースに存在しない

**確認方法**:
1. URLに`?s=SELLER_ID`が含まれているか確認
2. データベースに該当するセラーIDが存在するか確認

---

## 🔧 修正手順

### 修正1: APIエラーの修正

**問題**: `/api/seller/summary` APIが500エラーを返している

**確認事項**:
1. データベース接続が正常か
2. テーブルが存在するか
3. クエリが正しいか

**修正方法**:
1. Render Dashboardでログを確認
2. エラーメッセージに基づいて修正
3. データベース接続を確認

### 修正2: QRコード生成のフォールバック

**問題**: APIがエラーを返した場合、QRコードが生成されない

**修正方法**:
- APIがエラーを返した場合でも、セラーIDから直接QRコードを生成する

**コード例**:
```javascript
// QR生成（APIエラー時もフォールバック）
if (purchaseQrEl){
  const baseUrl = `${location.origin.replace(/\/$/,"")}/seller-purchase-standard.html`;
  const purchaseUrl = sellerId
    ? `${baseUrl}?s=${encodeURIComponent(sellerId)}`
    : baseUrl;
  
  const qrApi = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=";
  purchaseQrEl.src = qrApi + encodeURIComponent(purchaseUrl);
}
```

---

## 📋 チェックリスト

### 問題の特定
- [ ] ブラウザの開発者ツールでエラーを確認
- [ ] NetworkタブでAPIリクエストを確認
- [ ] レスポンスの内容を確認
- [ ] コンソールにエラーメッセージがないか確認

### データベース確認
- [ ] データベース接続が正常か
- [ ] `sellers`テーブルが存在するか
- [ ] セラーIDがデータベースに存在するか

### API確認
- [ ] `/api/seller/summary`エンドポイントが正常に動作するか
- [ ] レスポンスが正しい形式か
- [ ] エラーハンドリングが適切か

---

## 🎯 次のステップ

1. **ブラウザの開発者ツールでエラーを確認**
   - F12キーを押して開発者ツールを開く
   - ConsoleタブとNetworkタブを確認

2. **Render Dashboardでログを確認**
   - エラーメッセージを確認
   - データベース接続エラーがないか確認

3. **エラーメッセージに基づいて修正**
   - エラーの原因を特定
   - 適切な修正を実施

---

## 🔗 関連ドキュメント

- [RENDER_VERIFICATION_REPORT.md](./RENDER_VERIFICATION_REPORT.md) - Render環境動作確認レポート
- [UI_VERIFICATION_REPORT.md](./UI_VERIFICATION_REPORT.md) - 画面動作確認レポート

