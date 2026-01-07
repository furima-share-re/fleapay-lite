# 全画面チェックツール - 使い方ガイド

## 📋 目次

1. [基本的な使い方](#基本的な使い方)
2. [結果の確認方法](#結果の確認方法)
3. [エビデンスの保存と確認](#エビデンスの保存と確認)
4. [実際の使用例](#実際の使用例)
5. [トラブルシューティング](#トラブルシューティング)

---

## 基本的な使い方

### 1. 事前準備

#### ローカル環境でチェックする場合

```bash
# 開発サーバーを起動（別のターミナルで）
npm run dev

# サーバーが起動したら、別のターミナルでチェックを実行
npm run check-screens
```

#### ステージング環境でチェックする場合

```bash
# サーバーが起動していることを確認してから
npm run check-screens:staging
```

### 2. コマンドの実行

#### 基本版（軽量・高速）

```bash
# ローカル環境
npm run check-screens

# ステージング環境
npm run check-screens:staging

# カスタムURL
BASE_URL=https://your-domain.com npm run check-screens
```

#### 高度版（詳細チェック・スクリーンショット付き）

```bash
# まずPuppeteerをインストール（初回のみ）
npm install --save-dev puppeteer

# ローカル環境
npm run check-screens:advanced

# ステージング環境
npm run check-screens:staging:advanced

# カスタムURL
BASE_URL=https://your-domain.com npm run check-screens:advanced
```

---

## 結果の確認方法

### 方法1: コンソール出力で確認

実行すると、リアルタイムで各ページのチェック結果が表示されます：

```
🔍 全画面チェックを開始します...
ベースURL: http://localhost:3000

📄 14個のページをチェック中...
✓ トップページ (/) - 200
✓ 成功ページ (/success) - 200
✗ キャンセルページ (/cancel) - 404
⚠ チェックアウト画面 (/checkout) - 200

🔌 7個のAPIエンドポイントをチェック中...
✓ ヘルスチェック (/api/ping) - 200
✓ セラーサマリー (/api/seller/summary) - 200

📊 チェック完了！

{
  "pages": [...],
  "apis": [...],
  "summary": {
    "total": 21,
    "success": 19,
    "errors": 2,
    "warnings": 0
  }
}
```

### 方法2: HTMLレポートで確認（推奨）

HTMLレポートは視覚的に見やすく、ブラウザで確認できます。

#### ファイルに保存する場合

```bash
# JSON形式で保存
OUTPUT_FILE=check-results.json npm run check-screens

# HTMLファイルも自動生成されます（check-results.html）
```

#### 標準出力からHTMLを取得する場合

```bash
# HTML形式のみ出力
OUTPUT_FORMAT=html npm run check-screens > report.html

# ブラウザで開く
# Windows: start report.html
# Mac: open report.html
# Linux: xdg-open report.html
```

### 方法3: JSON形式で確認

```bash
# JSON形式のみ出力
OUTPUT_FORMAT=json npm run check-screens

# ファイルに保存
OUTPUT_FORMAT=json OUTPUT_FILE=results.json npm run check-screens

# JSONを整形して確認
OUTPUT_FORMAT=json npm run check-screens | jq .
```

---

## エビデンスの保存と確認

### スクリーンショット（高度版のみ）

高度版を使用すると、各ページのスクリーンショットが自動的に取得されます。

```bash
# スクリーンショット付きでチェック
npm run check-screens:advanced

# 結果をJSONファイルに保存（スクリーンショットはbase64でエンコード）
OUTPUT_FILE=evidence.json npm run check-screens:advanced
```

#### スクリーンショットの確認方法

1. **HTMLレポートから確認**
   - HTMLレポートには各ページのスクリーンショットが埋め込まれています
   - ブラウザでHTMLファイルを開くと、画像として表示されます

2. **JSONから抽出**
   ```javascript
   // evidence.jsonからスクリーンショットを抽出する例
   const fs = require('fs');
   const data = JSON.parse(fs.readFileSync('evidence.json', 'utf8'));
   
   data.pages.forEach((page, index) => {
     if (page.screenshot) {
       const buffer = Buffer.from(page.screenshot, 'base64');
       fs.writeFileSync(`screenshot-${index}-${page.path.replace(/\//g, '_')}.png`, buffer);
     }
   });
   ```

### 詳細なエラーログ

高度版では、以下の詳細情報が記録されます：

- **コンソールエラー**: ブラウザのコンソールに表示されたエラー
- **コンソール警告**: ブラウザのコンソールに表示された警告
- **ページエラー**: JavaScript実行時のエラー
- **リクエストエラー**: 失敗したHTTPリクエスト
- **レイアウト問題**: 画面外にはみ出している要素
- **画像読み込み失敗**: 読み込めなかった画像

これらはすべてJSON/HTMLレポートに含まれます。

---

## 実際の使用例

### 例1: デプロイ前のチェック

```bash
# 1. ローカルでビルド
npm run build

# 2. 本番モードで起動
npm start &
sleep 5

# 3. チェック実行
BASE_URL=http://localhost:3000 OUTPUT_FILE=pre-deploy-check.json npm run check-screens:advanced

# 4. 結果を確認
cat pre-deploy-check.json | jq '.summary'

# 5. HTMLレポートを開く
open pre-deploy-check.html
```

### 例2: CI/CDパイプラインでの使用

```yaml
# .github/workflows/check-screens.yml
name: Check All Screens

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm install --save-dev puppeteer
      - run: npm run build
      - run: npm start &
      - run: sleep 10
      
      - name: Check screens
        run: |
          npm run check-screens:advanced
        env:
          BASE_URL: http://localhost:3000
          OUTPUT_FILE: check-results.json
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: screen-check-results
          path: |
            check-results.json
            check-results.html
```

### 例3: 定期的な監視

```bash
#!/bin/bash
# daily-check.sh

DATE=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="checks/check-${DATE}.json"

# ステージング環境をチェック
BASE_URL=https://fleapay-lite-t1.onrender.com \
OUTPUT_FILE="${OUTPUT_FILE}" \
npm run check-screens:advanced

# エラーがある場合は通知
ERRORS=$(cat "${OUTPUT_FILE}" | jq '.summary.errors')
if [ "$ERRORS" -gt 0 ]; then
  echo "⚠️ ${ERRORS}個のエラーが検出されました"
  # ここでSlackやメール通知を送信
fi
```

### 例4: 特定のページのみチェック

スクリプトを編集して、特定のページのみチェックすることもできます：

```javascript
// scripts/check-all-screens.js を編集
const pageRoutes = [
  { path: '/', name: 'トップページ' },
  { path: '/checkout', name: 'チェックアウト画面' },
  // 必要なページのみ追加
];
```

---

## 結果の見方

### HTMLレポートの見方

1. **サマリーセクション**
   - 総チェック数、成功数、エラー数、警告数が一目でわかります
   - 色分けされているので、問題がある場合はすぐにわかります

2. **ページチェック結果**
   - 各ページのステータス（成功/エラー/警告）
   - HTTPステータスコード
   - レスポンス時間
   - 検出された問題の詳細

3. **スクリーンショット（高度版）**
   - 各ページの実際の表示状態を確認できます
   - レイアウトの崩れを視覚的に確認

### JSONレポートの見方

```json
{
  "pages": [
    {
      "name": "トップページ",
      "path": "/",
      "status": "success",        // success, error, warning
      "statusCode": 200,
      "issues": [],               // 検出された問題のリスト
      "responseTime": 123,        // ミリ秒
      "consoleErrors": [],        // コンソールエラー（高度版）
      "consoleWarnings": [],      // コンソール警告（高度版）
      "screenshot": "..."         // base64エンコードされた画像（高度版）
    }
  ],
  "summary": {
    "total": 21,
    "success": 19,
    "errors": 2,
    "warnings": 0,
    "startTime": "2026-01-03T12:00:00.000Z",
    "endTime": "2026-01-03T12:01:00.000Z"
  }
}
```

### 問題の種類

1. **エラー（error）**
   - HTTP 4xx/5xxエラー
   - コンソールエラー
   - ページエラー
   - → 即座に対応が必要

2. **警告（warning）**
   - 認証エラー（401/403）
   - コンソール警告
   - レイアウトの問題
   - 画像の読み込み失敗
   - → 確認して必要に応じて対応

3. **成功（success）**
   - 問題なし

---

## トラブルシューティング

### 問題1: 接続エラー

```
エラー: Request timeout
```

**解決方法:**
- サーバーが起動しているか確認
- BASE_URLが正しいか確認
- タイムアウトを延長: `TIMEOUT=60000 npm run check-screens`

### 問題2: Puppeteerのインストールエラー

```
⚠️ Puppeteerがインストールされていません。
```

**解決方法:**
```bash
npm install --save-dev puppeteer
```

### 問題3: 認証が必要なページでエラー

管理画面など、認証が必要なページは401/403エラーになります。これは正常な動作です。

**対応方法:**
- 警告として扱われます
- 認証情報を追加する場合は、スクリプトをカスタマイズしてください

### 問題4: スクリーンショットが取得できない

**解決方法:**
- 高度版を使用していることを確認
- ヘッドレスモードを無効化して確認: `HEADLESS=false npm run check-screens:advanced`

---

## よくある質問

### Q: どのくらい時間がかかりますか？

A: 
- 基本版: 14ページ + 7API = 約10-30秒
- 高度版: 約1-3分（スクリーンショット取得のため）

### Q: CI/CDで使えますか？

A: はい。GitHub Actions、GitLab CI、CircleCIなどで使用できます。上記の例を参考にしてください。

### Q: カスタムページを追加できますか？

A: はい。`scripts/check-all-screens.js`の`pageRoutes`配列を編集してください。

### Q: エラーがあった場合、どこを見ればいいですか？

A: HTMLレポートの「問題」セクションに詳細が表示されます。コンソールエラーやページエラーの詳細も含まれます。

---

## 次のステップ

1. **定期的なチェックを設定**: cronやGitHub Actionsで定期実行
2. **カスタマイズ**: プロジェクトに合わせてチェック項目を追加
3. **通知の設定**: エラー検出時にSlackやメールで通知




