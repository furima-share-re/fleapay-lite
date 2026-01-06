# Cursorからマイグレーションを実行する方法

**更新日**: 2026-01-06  
**目的**: Cursor IDEから直接マイグレーションを実行する方法

---

## 🚀 クイックスタート

### 方法1: コマンドパレットから実行（推奨）

1. **コマンドパレットを開く**
   - `Ctrl + Shift + P` (Windows/Linux)
   - `Cmd + Shift + P` (Mac)

2. **「Tasks: Run Task」を選択**

3. **実行したいタスクを選択**
   - `Apply Migration` - Node.js版でマイグレーションを実行
   - `Apply Migration (PowerShell)` - PowerShell版でマイグレーションを実行
   - `Update Prisma Schema` - Prismaスキーマを更新
   - `Run Migration + Update Prisma` - マイグレーション実行 + Prisma更新を一括実行

4. **マイグレーションファイルのパスを入力**
   - 例: `supabase/migrations/20260106_120000_add_products_table.sql`

---

## 📋 詳細な手順

### ステップ1: マイグレーションファイルを作成

```bash
# supabase/migrations/ ディレクトリにSQLファイルを作成
# 例: supabase/migrations/20260106_120000_add_products_table.sql
```

### ステップ2: 環境変数を確認

`.env`ファイルまたは環境変数に`DATABASE_URL`が設定されていることを確認：

```bash
DATABASE_URL="postgresql://postgres:password@host:5432/database"
```

### ステップ3: Cursorから実行

#### 方法A: コマンドパレット（推奨）

1. `Ctrl + Shift + P` (Windows/Linux) または `Cmd + Shift + P` (Mac)
2. 「Tasks: Run Task」と入力して選択
3. 「Apply Migration」を選択
4. マイグレーションファイルのパスを入力

#### 方法B: ターミナルから実行

Cursorの統合ターミナル（`` Ctrl + ` ``）を開いて：

```bash
# Node.js版
npm run migrate supabase/migrations/20260106_120000_add_products_table.sql

# または直接実行
node scripts/apply-migration.js supabase/migrations/20260106_120000_add_products_table.sql
```

#### 方法C: PowerShell（Windows）

```powershell
.\scripts\apply-migration.ps1 -MigrationFile "supabase\migrations\20260106_120000_add_products_table.sql"
```

### ステップ4: Prismaスキーマを更新

コマンドパレットから：
1. `Ctrl + Shift + P`
2. 「Tasks: Run Task」
3. 「Update Prisma Schema」を選択

または、ターミナルから：
```bash
npm run migrate:prisma
```

---

## 🎯 利用可能なタスク

### 1. Apply Migration

- **説明**: Node.js版でマイグレーションを実行
- **使用方法**: コマンドパレット → 「Tasks: Run Task」 → 「Apply Migration」
- **入力**: マイグレーションファイルのパス

### 2. Apply Migration (PowerShell)

- **説明**: PowerShell版でマイグレーションを実行（Windows推奨）
- **使用方法**: コマンドパレット → 「Tasks: Run Task」 → 「Apply Migration (PowerShell)」
- **入力**: マイグレーションファイルのパス

### 3. Update Prisma Schema

- **説明**: Prismaスキーマをデータベースから再生成し、Prisma Clientを生成
- **使用方法**: コマンドパレット → 「Tasks: Run Task」 → 「Update Prisma Schema」
- **入力**: 不要

### 4. Run Migration + Update Prisma

- **説明**: マイグレーション実行とPrisma更新を一括実行
- **使用方法**: コマンドパレット → 「Tasks: Run Task」 → 「Run Migration + Update Prisma」
- **入力**: マイグレーションファイルのパス

---

## 💡 ショートカットの設定（オプション）

Cursorでキーボードショートカットを設定する場合：

1. `Ctrl + Shift + P` → 「Preferences: Open Keyboard Shortcuts」
2. 「Tasks: Run Task」を検索
3. お好みのキーボードショートカットを設定

例：
- `Ctrl + M` → マイグレーション実行
- `Ctrl + Shift + M` → Prisma更新

---

## 🔧 トラブルシューティング

### エラー: DATABASE_URLが設定されていない

**解決方法**:
1. `.env`ファイルに`DATABASE_URL`を設定
2. または、環境変数として設定

### エラー: psqlコマンドが見つからない

**解決方法**:
1. PostgreSQLをインストール
2. PATHに`psql`が追加されていることを確認

### エラー: マイグレーションファイルが見つからない

**解決方法**:
1. ファイルパスが正しいか確認
2. プロジェクトルートからの相対パスを使用（例: `supabase/migrations/...`）

---

## 📚 関連ドキュメント

- `AUTOMATION_GUIDE.md` - 自動化の詳細ガイド
- `HOW_TO_ADD_TABLE.md` - テーブル追加の詳細ガイド
- `.vscode/tasks.json` - タスク設定ファイル

---

## 🎬 実行例

### 完全なワークフロー

1. **マイグレーションファイルを作成**
   ```
   supabase/migrations/20260106_120000_add_products_table.sql
   ```

2. **Cursorから実行**
   - `Ctrl + Shift + P` → 「Tasks: Run Task」 → 「Apply Migration」
   - パスを入力: `supabase/migrations/20260106_120000_add_products_table.sql`

3. **Prismaスキーマを更新**
   - `Ctrl + Shift + P` → 「Tasks: Run Task」 → 「Update Prisma Schema」

4. **完了！**
   - ターミナルに結果が表示されます
   - エラーがないことを確認してください

---

**最終更新**: 2026-01-06  
**実装者**: AI Assistant


