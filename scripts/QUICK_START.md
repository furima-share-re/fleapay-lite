# クイックスタートガイド

## 🚀 5分で始める

### ステップ1: サーバーを起動

```bash
# ターミナル1: 開発サーバーを起動
npm run dev
```

### ステップ2: チェックを実行

```bash
# ターミナル2: チェックを実行
npm run check-screens
```

### ステップ3: 結果を確認

結果は2つの形式で出力されます：

1. **コンソール出力**: リアルタイムで各ページの状態が表示されます
2. **JSON/HTML**: 詳細なレポートが出力されます

---

## 📊 結果の見方

### コンソール出力の例

```
🔍 全画面チェックを開始します...
ベースURL: http://localhost:3000

📄 14個のページをチェック中...
✓ トップページ (/) - 200
✓ 成功ページ (/success) - 200
✗ キャンセルページ (/cancel) - 404
⚠ チェックアウト画面 (/checkout) - 200

📊 チェック完了！

{
  "summary": {
    "total": 21,
    "success": 19,
    "errors": 2,
    "warnings": 0
  }
}
```

### 記号の意味

- ✅ **✓** = 成功（問題なし）
- ❌ **✗** = エラー（要対応）
- ⚠️ **⚠** = 警告（確認推奨）

---

## 📁 結果をファイルに保存

```bash
# JSON形式で保存（HTMLも自動生成）
OUTPUT_FILE=check-results.json npm run check-screens
```

保存されるファイル：
- `check-results.json` - JSON形式の詳細データ
- `check-results.html` - ブラウザで見られるHTMLレポート

### HTMLレポートを開く

```bash
# Windows
start check-results.html

# Mac
open check-results.html

# Linux
xdg-open check-results.html
```

---

## 🎯 よく使うコマンド

### ローカル環境

```bash
npm run check-screens
```

### ステージング環境

```bash
npm run check-screens:staging
```

### カスタムURL

```bash
BASE_URL=https://your-domain.com npm run check-screens
```

### スクリーンショット付き（高度版）

```bash
# まずPuppeteerをインストール（初回のみ）
npm install --save-dev puppeteer

# 実行
npm run check-screens:advanced
```

---

## 🔍 エビデンスの確認方法

### 方法1: HTMLレポートで確認（推奨）

1. 結果をファイルに保存
   ```bash
   OUTPUT_FILE=evidence.json npm run check-screens:advanced
   ```

2. HTMLファイルを開く
   ```bash
   open evidence.html  # Mac
   start evidence.html # Windows
   ```

3. 確認できる内容：
   - ✅ 各ページのステータス
   - 📸 スクリーンショット（高度版）
   - ⚠️ 検出された問題の詳細
   - 📊 サマリー統計

### 方法2: JSONから確認

```bash
# JSONを整形して表示
OUTPUT_FORMAT=json npm run check-screens | jq .

# エラーのみ抽出
OUTPUT_FORMAT=json npm run check-screens | jq '.pages[] | select(.status == "error")'

# サマリーのみ表示
OUTPUT_FORMAT=json npm run check-screens | jq '.summary'
```

### 方法3: スクリーンショットの確認（高度版）

高度版を使用すると、各ページのスクリーンショットが取得されます：

1. **HTMLレポート内**: 各ページのセクションに画像が表示されます
2. **JSONから抽出**: base64エンコードされた画像データが含まれます

---

## 📝 実際の使用例

### 例1: デプロイ前チェック

```bash
# 1. ビルド
npm run build

# 2. 本番モードで起動
npm start &
sleep 5

# 3. チェック
BASE_URL=http://localhost:3000 \
OUTPUT_FILE=pre-deploy-check.json \
npm run check-screens:advanced

# 4. 結果確認
cat pre-deploy-check.json | jq '.summary'
```

### 例2: 日次チェック

```bash
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="checks/check-${DATE}.json"

BASE_URL=https://fleapay-lite-t1.onrender.com \
OUTPUT_FILE="${OUTPUT_FILE}" \
npm run check-screens:advanced

# エラーがある場合は通知
ERRORS=$(cat "${OUTPUT_FILE}" | jq '.summary.errors')
if [ "$ERRORS" -gt 0 ]; then
  echo "⚠️ ${ERRORS}個のエラーが検出されました"
fi
```

---

## 🆘 トラブルシューティング

### サーバーに接続できない

```
エラー: Request timeout
```

**解決方法:**
1. サーバーが起動しているか確認: `curl http://localhost:3000`
2. BASE_URLが正しいか確認
3. タイムアウトを延長: `TIMEOUT=60000 npm run check-screens`

### Puppeteerのエラー（高度版）

```
⚠️ Puppeteerがインストールされていません。
```

**解決方法:**
```bash
npm install --save-dev puppeteer
```

### 結果が表示されない

**確認事項:**
- サーバーが起動しているか
- BASE_URLが正しいか
- ネットワーク接続があるか（リモートURLの場合）

---

## 📚 詳細情報

- **完全な使い方ガイド**: `scripts/USAGE_GUIDE.md`
- **README**: `scripts/CHECK_SCREENS_README.md`
- **サンプルスクリプト**: `scripts/example-check.sh` または `scripts/example-check.ps1`

---

## 💡 ヒント

1. **初回は基本版から**: まず `npm run check-screens` で基本チェック
2. **問題がある場合は高度版**: 詳細な原因を特定するために `npm run check-screens:advanced`
3. **結果は保存**: `OUTPUT_FILE` を指定して結果を保存しておくと、後で比較できます
4. **CI/CDに組み込む**: GitHub Actionsなどで自動チェックを設定

