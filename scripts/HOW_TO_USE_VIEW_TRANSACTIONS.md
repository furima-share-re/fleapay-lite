# 取引データ確認スクリプトの使い方

## 📋 基本的な使い方

### 1. ターミナルで実行

Cursorのターミナル（下部のターミナルパネル）を開いて、以下のコマンドを実行します。

```bash
# 最もシンプルな使い方（過去30日間の取引を表示）
npm run view-transactions
```

### 2. サマリー統計を確認

```bash
# 過去30日間の取引サマリー（件数、金額など）
npm run view-transactions:summary
```

### 3. データをファイルに保存してCursorで確認

```bash
# JSONファイルに保存（Cursorで開いて確認可能）
npm run view-transactions -- --output json

# CSVファイルに保存（Excelなどで開ける）
npm run view-transactions -- --output csv

# JSONとCSVの両方に保存
npm run view-transactions -- --output both
```

## 🎯 よく使うパターン

### パターン1: 特定のセラーの取引を確認

```bash
# seller123の取引を表示
npm run view-transactions -- --seller-id seller123

# seller123の取引をJSONで保存
npm run view-transactions -- --seller-id seller123 --output json
```

### パターン2: 過去7日間の取引を確認

```bash
# 過去7日間の取引を表示
npm run view-transactions -- --days 7

# 過去7日間の取引をJSONで保存
npm run view-transactions -- --days 7 --output json
```

### パターン3: 決済完了した取引のみ確認

```bash
# 決済完了（succeeded）の取引を表示
npm run view-transactions -- --status succeeded

# 決済完了の取引を詳細情報付きでJSON保存
npm run view-transactions -- --status succeeded --detail --output json
```

### パターン4: 詳細情報を確認

```bash
# 詳細情報（注文アイテム、決済情報など）を表示
npm run view-transactions -- --detail

# 詳細情報をJSONで保存
npm run view-transactions -- --detail --output json
```

## 📁 保存されたファイルの確認方法

### 1. Cursorのエクスプローラーで確認

1. Cursorの左側のファイルエクスプローラーを開く
2. `data/transactions/` フォルダを探す
3. 生成されたJSON/CSVファイルをクリックして開く

### 2. ファイル名の例

```
data/transactions/
  ├── transactions-2026-01-04T12-30-00.json
  ├── transactions-2026-01-04T12-30-00.csv
  └── summary-2026-01-04T12-30-00.json
```

## 🔍 実際の使用例

### 例1: 今日の取引を確認したい

```bash
npm run view-transactions -- --days 1 --output json
```

実行後、`data/transactions/transactions-YYYY-MM-DDTHH-MM-SS.json` が作成されます。
Cursorでそのファイルを開くと、JSON形式でデータが表示されます。

### 例2: 特定のセラーの過去1週間の取引を分析したい

```bash
npm run view-transactions -- --seller-id seller123 --days 7 --detail --output json
```

### 例3: 決済待ち（pending）の取引を確認したい

```bash
npm run view-transactions -- --status pending --output json
```

## 💡 CursorのAI機能でデータを分析

1. スクリプトを実行してJSONファイルを生成
2. 生成されたJSONファイルをCursorで開く
3. CursorのAIチャットで以下のように聞く：
   - 「この取引データを分析して」
   - 「最も売上が多いセラーは？」
   - 「取引の傾向を教えて」

## ⚙️ 全オプション一覧

| オプション | 説明 | 例 |
|-----------|------|-----|
| `--seller-id <id>` | 特定のセラーIDでフィルタリング | `--seller-id seller123` |
| `--status <status>` | ステータスでフィルタリング | `--status succeeded` |
| `--days <number>` | 過去N日間の取引を表示 | `--days 7` |
| `--limit <number>` | 表示件数（デフォルト: 50） | `--limit 100` |
| `--detail` | 詳細情報を表示 | `--detail` |
| `--summary` | サマリー情報のみ表示 | `--summary` |
| `--output <format>` | 出力形式（json, csv, both） | `--output json` |
| `--output-dir <dir>` | 出力ディレクトリ | `--output-dir data/my-transactions` |

## 🚀 クイックスタート

**まずはこれから始めましょう：**

```bash
# 1. サマリーを確認
npm run view-transactions:summary

# 2. データをJSONで保存
npm run view-transactions -- --output json

# 3. Cursorで data/transactions/ フォルダを開く
# 4. 生成されたJSONファイルを開く
```

## ❓ トラブルシューティング

### エラー: "Cannot find module"

```bash
# 依存関係をインストール
npm install
```

### エラー: "DATABASE_URL is not defined"

`.env` ファイルに `DATABASE_URL` が設定されているか確認してください。

### データが表示されない

- `--days` オプションで期間を広げてみる
- `--limit` オプションで件数を増やす
- フィルター条件（`--seller-id`, `--status`）を外してみる

