# 検証環境ページ スクリーンショット取得手順

## 検証環境URL

- **メインページ**: https://fleapay-lite-t1.onrender.com
- **検証用URLリスト**: https://fleapay-lite-t1.onrender.com/staging-verification-urls.html

## スクリーンショット取得方法

### Windowsの場合

1. **ブラウザでページを開く**
   - 上記のURLをブラウザで開きます（既に開かれているはずです）

2. **スクリーンショットを取得**
   - **全画面のスクリーンショット**: `Windows + Print Screen` キーを押す
   - **アクティブウィンドウのみ**: `Alt + Print Screen` キーを押す
   - **Snipping Toolを使用**: `Windows + Shift + S` キーを押して範囲を選択

3. **保存場所**
   - `Windows + Print Screen` の場合: `ピクチャ > スクリーンショット` フォルダに保存されます
   - Snipping Toolの場合: クリップボードにコピーされるので、画像編集ソフトで保存してください

### 推奨: ブラウザの開発者ツールを使用

1. ブラウザで `F12` キーを押して開発者ツールを開く
2. `Ctrl + Shift + P` (Windows) または `Cmd + Shift + P` (Mac) を押す
3. 「Screenshot」と入力して、以下のいずれかを選択:
   - **Capture full size screenshot** - ページ全体のスクリーンショット
   - **Capture node screenshot** - 選択した要素のみのスクリーンショット
   - **Capture screenshot** - 現在のビューポートのスクリーンショット

## 取得すべきスクリーンショット

### 1. メインページ（トップページ）
- URL: https://fleapay-lite-t1.onrender.com
- 確認ポイント:
  - タイトル「お支払い」が表示されている
  - 金額入力フィールドが表示されている
  - 出店者 accountId 入力フィールドが表示されている
  - 「決済を開始」ボタンが表示されている

### 2. 検証用URLリストページ
- URL: https://fleapay-lite-t1.onrender.com/staging-verification-urls.html
- 確認ポイント:
  - Standard/Pro/Kidsプランのセクションが表示されている
  - 各プランのURLが正しく表示されている

### 3. セラーダッシュボード（オプション）
- Standardプラン: https://fleapay-lite-t1.onrender.com/seller-dashboard?s=test-seller-standard
- Proプラン: https://fleapay-lite-t1.onrender.com/seller-dashboard?s=test-seller-pro
- Kidsプラン: https://fleapay-lite-t1.onrender.com/seller-dashboard?s=test-seller-kids

## 自動化スクリプト（オプション）

Node.jsとPlaywrightがインストールされている場合、以下のコマンドで自動取得できます:

```bash
npm install playwright
npx playwright install chromium
node scripts/take-screenshot.js
```

スクリーンショットは `verification-screenshot-YYYYMMDD-HHMMSS.png` という名前で保存されます。

