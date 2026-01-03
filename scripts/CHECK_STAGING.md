# 検証環境チェック - Cursorからの実行方法

## 🚀 Cursorから実行する方法

### 方法1: npmコマンドを使用（推奨）

Cursorのターミナルで以下を実行：

```bash
npm run check-screens:staging
```

### 方法2: 直接Node.jsで実行

```bash
node scripts/check-staging-simple.js
```

### 方法3: 環境変数を指定して実行

```bash
# PowerShellの場合
$env:BASE_URL='https://fleapay-lite-t1.onrender.com'; node scripts/check-all-screens.js

# Bashの場合
BASE_URL=https://fleapay-lite-t1.onrender.com node scripts/check-all-screens.js
```

## 📊 結果の確認

### コンソール出力

実行すると、リアルタイムで各ページの状態が表示されます：

```
🔍 全画面チェックを開始します...
ベースURL: https://fleapay-lite-t1.onrender.com

📄 14個のページをチェック中...
✓ トップページ (/) - 200
✓ 成功ページ (/success) - 200
...
```

### ファイルに保存

```bash
# JSON形式で保存
node scripts/check-staging-simple.js > staging-check.json 2>&1

# HTML形式で保存
OUTPUT_FORMAT=html node scripts/check-staging-simple.js > staging-check.html 2>&1
```

## 🔍 エビデンスの確認

### HTMLレポートを生成

```bash
# 結果をファイルに保存（HTMLも自動生成）
OUTPUT_FILE=staging-results.json node scripts/check-staging-simple.js
```

生成されるファイル：
- `staging-results.json` - JSON形式の詳細データ
- `staging-results.html` - ブラウザで見られるHTMLレポート

### HTMLレポートを開く

```bash
# Windows
start staging-results.html

# Mac
open staging-results.html

# Linux
xdg-open staging-results.html
```

## 📝 実行例

### 基本的な実行

```bash
npm run check-screens:staging
```

### 結果をファイルに保存

```bash
# PowerShell
$env:OUTPUT_FILE='staging-check.json'; node scripts/check-staging-simple.js

# Bash
OUTPUT_FILE=staging-check.json node scripts/check-staging-simple.js
```

### 高度版（スクリーンショット付き）

```bash
# まずPuppeteerをインストール（初回のみ）
npm install --save-dev puppeteer

# 実行
BASE_URL=https://fleapay-lite-t1.onrender.com node scripts/check-all-screens-advanced.js
```

## ⚠️ トラブルシューティング

### Node.jsが見つからない場合

CursorのターミナルでNode.jsのパスを確認：

```bash
where node  # Windows
which node  # Mac/Linux
```

### パスの問題がある場合

日本語が含まれるパスで問題が発生する場合は、`scripts/check-staging-simple.js`を使用してください。

### タイムアウトエラー

検証環境の応答が遅い場合は、タイムアウトを延長：

```bash
TIMEOUT=30000 node scripts/check-staging-simple.js
```

