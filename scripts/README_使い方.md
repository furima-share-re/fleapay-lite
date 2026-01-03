# 🚀 全画面チェックツール - クイックリファレンス

## 最も簡単な使い方

### 検証環境をチェックする

#### Node.jsがある場合

```bash
node scripts/check-staging-simple.js
```

#### Node.jsがない場合（PowerShellスクリプト）

```powershell
.\scripts\check-staging-powershell.ps1
```

これだけで、検証環境（https://fleapay-lite-t1.onrender.com）の全画面をチェックできます！

---

## 📝 よく使うコマンド

### ローカル環境

```bash
# 基本版
node scripts/check-all-screens.js

# 高度版（スクリーンショット付き）
node scripts/check-all-screens-advanced.js
```

### 検証環境

```bash
# 基本版
node scripts/check-staging-simple.js

# 高度版（スクリーンショット付き）
BASE_URL=https://fleapay-lite-t1.onrender.com node scripts/check-all-screens-advanced.js
```

### 結果をファイルに保存

```bash
# JSON形式で保存（HTMLも自動生成）
OUTPUT_FILE=check-results.json node scripts/check-all-screens.js

# HTMLファイルを開く
start check-results.html  # Windows
open check-results.html   # Mac
```

---

## 📊 結果の見方

### コンソール出力

```
✓ = 成功（問題なし）
✗ = エラー（要対応）
⚠ = 警告（確認推奨）
```

### HTMLレポート

結果をファイルに保存すると、`check-results.html`が自動生成されます。
ブラウザで開くと、視覚的に見やすいレポートが表示されます。

---

## ⚠️ トラブルシューティング

### npmコマンドが見つからない場合

npmコマンドの代わりに、直接Node.jsで実行してください：

```bash
node scripts/check-all-screens.js
node scripts/check-staging-simple.js
```

### 高度版を使う場合

まずPuppeteerをインストール：

```bash
npm install --save-dev puppeteer
```

---

## 📚 詳細情報

- **完全な使い方**: `scripts/使い方まとめ.md`
- **クイックスタート**: `scripts/QUICK_START.md`
- **詳細ガイド**: `scripts/USAGE_GUIDE.md`

