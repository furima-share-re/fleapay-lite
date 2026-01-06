# PowerShellでの取引データ確認スクリプトの使い方

## ⚠️ npmコマンドが実行できない場合の対処法

PowerShellで`npm`コマンドが実行できない場合は、**`node`コマンドを直接使用**してください。

## ✅ 基本的な使い方

### 方法1: nodeコマンドを直接使用（推奨）

```powershell
# 最もシンプルな使い方（過去30日間の取引を表示）
node scripts/view-transactions.js

# サマリー統計を確認
node scripts/view-transactions.js --summary

# JSONファイルに保存
node scripts/view-transactions.js --output json
```

### 方法2: npmコマンドを使用（実行ポリシーを設定した場合）

まず、実行ポリシーを設定：

```powershell
# 実行ポリシーを設定（現在のセッションのみ）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
```

その後、npmコマンドを使用：

```powershell
npm run view-transactions
npm run view-transactions:summary
npm run view-transactions -- --output json
```

## 🎯 よく使うコマンド

### 1. サマリー統計を確認

```powershell
node scripts/view-transactions.js --summary
```

### 2. データをJSONで保存（Cursorで確認）

```powershell
node scripts/view-transactions.js --output json
```

### 3. 過去7日間の取引を確認

```powershell
node scripts/view-transactions.js --days 7
```

### 4. 特定のセラーの取引を確認

```powershell
node scripts/view-transactions.js --seller-id seller123 --output json
```

### 5. 決済完了の取引のみ確認

```powershell
node scripts/view-transactions.js --status succeeded --output json
```

### 6. 詳細情報付きで保存

```powershell
node scripts/view-transactions.js --detail --output json
```

## 📁 保存されたファイルの確認

1. Cursorの左側のファイルエクスプローラーを開く
2. `data/transactions/` フォルダを探す
3. 生成されたJSON/CSVファイルをクリックして開く

ファイル名の例：
- `transactions-2026-01-04T12-30-00.json`
- `transactions-2026-01-04T12-30-00.csv`
- `summary-2026-01-04T12-30-00.json`

## 🚀 クイックスタート

**まずはこれから始めましょう：**

```powershell
# 1. サマリーを確認
node scripts/view-transactions.js --summary

# 2. データをJSONで保存
node scripts/view-transactions.js --output json

# 3. Cursorで data/transactions/ フォルダを開く
# 4. 生成されたJSONファイルを開く
```

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
| `--help` | ヘルプを表示 | `--help` |

## 💡 実践例

### 例1: 今日の取引を確認

```powershell
node scripts/view-transactions.js --days 1 --output json
```

### 例2: 特定のセラーの過去1週間の取引を分析

```powershell
node scripts/view-transactions.js --seller-id seller123 --days 7 --detail --output json
```

### 例3: 決済待ちの取引を確認

```powershell
node scripts/view-transactions.js --status pending --output json
```

## ❓ トラブルシューティング

### エラー: "Cannot find module"

```powershell
# 依存関係をインストール
npm install
```

### エラー: "DATABASE_URL is not defined" または "Environment variable not found: DATABASE_URL"

**原因**: データベース接続情報が設定されていません。

**解決方法**:

1. プロジェクトのルートディレクトリに `.env` ファイルがあるか確認
2. `.env` ファイルに `DATABASE_URL` が設定されているか確認

`.env` ファイルの例：
```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

3. `.env` ファイルがない場合、または `DATABASE_URL` が設定されていない場合：
   - プロジェクトの管理者に確認
   - または、`.env.example` ファイルを参考に `.env` ファイルを作成

**注意**: `.env` ファイルには機密情報が含まれているため、Gitにコミットしないでください。

### データが表示されない

- `--days` オプションで期間を広げてみる
- `--limit` オプションで件数を増やす
- フィルター条件（`--seller-id`, `--status`）を外してみる

### npmコマンドが実行できない

**解決方法：`node`コマンドを直接使用**

```powershell
# npmの代わりにnodeを直接使用
node scripts/view-transactions.js --output json
```

## 📚 関連ドキュメント

- **詳細な使い方**: `scripts/HOW_TO_USE_VIEW_TRANSACTIONS.md`
- **完全なガイド**: `scripts/VIEW_TRANSACTIONS_GUIDE.md`

