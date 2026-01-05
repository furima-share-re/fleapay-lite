# 全画面チェックツール

すべてのページとAPIエンドポイントを自動的にチェックして、エラーや画面の崩れを検出するツールです。

## 機能

### 基本版 (`check-all-screens.js`)

- ✅ HTTPステータスコードのチェック
- ✅ HTML構造の検証
- ✅ エラーページの検出
- ✅ APIエンドポイントのチェック
- ✅ JSON/HTML形式でのレポート出力

### 高度版 (`check-all-screens-advanced.js`)

基本版の機能に加えて、以下もチェックします：

- ✅ ブラウザコンソールエラーの検出
- ✅ ブラウザコンソール警告の検出
- ✅ ページエラーの検出
- ✅ リクエストエラーの検出
- ✅ レイアウトの崩れ検出（画面外にはみ出している要素）
- ✅ 画像の読み込み失敗検出
- ✅ スクリーンショットの自動取得

## インストール

### 基本版

追加の依存関係は不要です。Node.jsの標準ライブラリのみを使用します。

### 高度版

Puppeteerが必要です：

```bash
npm install --save-dev puppeteer
```

## 使用方法

### 基本コマンド

```bash
# ローカル環境をチェック（デフォルト: http://localhost:3000）
npm run check-screens

# ステージング環境をチェック
npm run check-screens:staging

# カスタムURLを指定
BASE_URL=https://example.com npm run check-screens
```

### 高度版コマンド

```bash
# ローカル環境をチェック（Puppeteer使用）
npm run check-screens:advanced

# ステージング環境をチェック
npm run check-screens:staging:advanced

# カスタムURLを指定
BASE_URL=https://example.com npm run check-screens:advanced
```

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `BASE_URL` | チェック対象のベースURL | `http://localhost:3000` |
| `CHECK_APIS` | APIエンドポイントもチェックするか | `true` |
| `OUTPUT_FORMAT` | 出力形式 (`json`, `html`, `both`) | `both` |
| `OUTPUT_FILE` | 結果をファイルに保存する場合のファイル名 | `null`（標準出力） |
| `HEADLESS` | Puppeteerのヘッドレスモード（高度版のみ） | `true` |
| `TIMEOUT` | リクエストタイムアウト（ミリ秒） | `10000`（基本版）/ `30000`（高度版） |

### 使用例

```bash
# JSON形式のみで出力
OUTPUT_FORMAT=json npm run check-screens

# HTML形式のみで出力
OUTPUT_FORMAT=html npm run check-screens

# 結果をファイルに保存
OUTPUT_FILE=check-results.json npm run check-screens

# APIチェックをスキップ
CHECK_APIS=false npm run check-screens

# ヘッドレスモードを無効化（高度版のみ、ブラウザが表示される）
HEADLESS=false npm run check-screens:advanced
```

## チェック対象

### ページ（14個）

- `/` - トップページ
- `/success` - 成功ページ
- `/thanks` - サンクスページ
- `/cancel` - キャンセルページ
- `/onboarding/complete` - オンボーディング完了
- `/onboarding/refresh` - オンボーディング更新
- `/checkout` - チェックアウト画面
- `/seller-register` - セラー登録画面
- `/seller-purchase-standard` - セラー購入標準画面
- `/admin/dashboard` - 管理者ダッシュボード
- `/admin/sellers` - 管理者出店者画面
- `/admin/frames` - 管理者フレーム画面
- `/admin/payments` - 管理者決済画面
- `/kids-dashboard` - Kidsダッシュボード

### APIエンドポイント（7個）

- `GET /api/ping` - ヘルスチェック
- `GET /api/seller/summary` - セラーサマリー
- `GET /api/seller/kids-summary` - Kidsサマリー
- `GET /api/admin/dashboard` - 管理ダッシュボードAPI
- `GET /api/admin/sellers` - 出店者管理API
- `GET /api/admin/frames` - フレーム管理API
- `GET /api/admin/stripe/summary` - StripeサマリーAPI

## 出力形式

### JSON形式

```json
{
  "pages": [
    {
      "name": "トップページ",
      "path": "/",
      "url": "http://localhost:3000/",
      "status": "success",
      "statusCode": 200,
      "issues": [],
      "responseTime": 123,
      "timestamp": "2026-01-03T12:00:00.000Z"
    }
  ],
  "apis": [...],
  "summary": {
    "total": 21,
    "success": 20,
    "errors": 1,
    "warnings": 0,
    "startTime": "2026-01-03T12:00:00.000Z",
    "endTime": "2026-01-03T12:01:00.000Z"
  }
}
```

### HTML形式

視覚的に見やすいHTMLレポートが生成されます。ブラウザで開いて確認できます。

## CI/CDでの使用

### GitHub Actions例

```yaml
name: Check Screens

on:
  push:
    branches: [main]
  pull_request:

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
      - run: npm run check-screens:advanced
        env:
          BASE_URL: http://localhost:3000
          OUTPUT_FILE: check-results.json
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: check-results
          path: check-results.json
```

## トラブルシューティング

### Puppeteerのインストールエラー

高度版を使用する場合、Puppeteerのインストールに時間がかかることがあります。また、Linux環境では追加の依存関係が必要な場合があります。

```bash
# Ubuntu/Debian
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

### タイムアウトエラー

ページの読み込みに時間がかかる場合は、タイムアウトを延長してください：

```bash
TIMEOUT=60000 npm run check-screens:advanced
```

### 認証が必要なページ

認証が必要なページは、401/403エラーが返されることがあります。これは警告として扱われます。

## カスタマイズ

チェック対象のページやAPIを追加・変更する場合は、スクリプトファイル内の `pageRoutes` と `apiRoutes` 配列を編集してください。

```javascript
const pageRoutes = [
  { path: '/', name: 'トップページ' },
  { path: '/your-new-page', name: '新しいページ' },
  // ...
];
```

## ライセンス

ISC


