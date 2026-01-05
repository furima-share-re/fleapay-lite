# ビルドエラー予防ガイド

型チェックを緩和せずに、ビルド前に型エラーを改善する方法です。

## 🎯 目的

- ビルドエラーを事前に検出・修正
- コード品質の向上
- CI/CDでの失敗を削減

## 📋 設定内容

### 1. ESLint設定 (`.eslintrc.json`)

TypeScript用のESLintルールを設定：
- `@typescript-eslint/no-explicit-any`: `any`型の使用を警告
- `@typescript-eslint/no-unused-vars`: 未使用変数を警告
- `prefer-const`: `const`の使用を推奨

### 2. プレコミットフック

- **Husky**: Gitフック管理
- **lint-staged**: ステージングされたファイルのみチェック
- コミット前に自動的に型チェックとLintを実行

### 3. エディタ設定 (`.vscode/settings.json`)

- 保存時に自動フォーマット
- ESLintの自動修正
- インポートの自動整理

### 4. CI/CD設定

- GitHub Actionsで型チェックとLintを実行
- プルリクエスト時に自動チェック

## 🚀 使い方

### セットアップ（初回のみ）

```bash
# 1. 依存関係をインストール
npm install

# 2. Huskyを初期化
npx husky init

# 3. プレコミットフックを設定
npx husky add .husky/pre-commit "npm run pre-commit-check"

# 4. 実行権限を付与（Linux/Mac）
chmod +x .husky/pre-commit
```

### 日常的な使い方

#### コーディング時

1. **エディタで自動チェック**
   - ファイルを保存すると自動的にESLintが実行
   - 型エラーはエディタ上で赤い波線で表示

2. **手動チェック**
   ```bash
   # 型チェックのみ
   npm run type-check
   
   # ESLintチェックのみ
   npm run lint
   
   # 自動修正を試す
   npm run lint:fix
   
   # 両方を実行
   npm run pre-commit-check
   ```

#### コミット時

- コミット前に自動的にチェックが実行されます
- エラーがある場合はコミットが中止されます
- `lint-staged`により、変更されたファイルのみがチェックされます

#### ビルド前

```bash
# ビルド前にチェック
npm run pre-commit-check

# 問題なければビルド
npm run build
```

## 📊 チェックの流れ

```
コードを書く
    ↓
エディタで自動チェック（保存時）
    ↓
git add
    ↓
git commit（自動的にpre-commit-check実行）
    ↓
✅ エラーなし → コミット成功
❌ エラーあり → コミット中止、エラーを修正
    ↓
GitHub Actions（CI/CD）
    ↓
✅ すべてのチェック通過 → マージ可能
```

## 🔧 設定ファイル

| ファイル | 説明 |
|---------|------|
| `.eslintrc.json` | ESLint設定 |
| `.lintstagedrc.json` | lint-staged設定（ステージングされたファイルのみチェック） |
| `.vscode/settings.json` | VSCode/Cursor設定（保存時に自動フォーマット） |
| `.husky/pre-commit` | Gitプレコミットフック |
| `.github/workflows/ci.yml` | CI/CD設定 |

## 💡 ベストプラクティス

### 1. 型エラーの修正

```typescript
// ❌ 悪い例: any型を使用
function processData(data: any) {
  return data.value;
}

// ✅ 良い例: 適切な型を定義
interface Data {
  value: string;
}
function processData(data: Data) {
  return data.value;
}
```

### 2. 未使用変数の処理

```typescript
// ❌ 悪い例: 未使用変数
const unused = 'value';

// ✅ 良い例1: 変数名を`_`で始める（ESLintで無視される）
const _unused = 'value';

// ✅ 良い例2: 変数を削除
// 変数が不要な場合は削除
```

### 3. 一時的な型エラーを無視する場合

```typescript
// @ts-ignore - 次の行の型エラーを無視（非推奨）
const value: string = someValue;

// @ts-expect-error - 次の行に型エラーがあることを期待（推奨）
// @ts-expect-error - この行は型エラーがあることが分かっている
const value: string = someValue;
```

## 🎯 効果

### エディタでの即座のフィードバック

- コードを書いている最中にエラーを検出
- 保存時に自動フォーマット
- 型エラーを視覚的に確認

### コミット前の自動チェック

- 型エラーがあるコードはコミットできない
- コード品質の統一
- チーム全体のコード品質向上

### ビルドエラーの削減

- ビルド前に問題を発見
- CI/CDでの失敗を削減
- デプロイ前の問題発見

## 🔄 トラブルシューティング

### ESLintエラーが出る場合

```bash
# 自動修正を試す
npm run lint:fix
```

### 型エラーを一時的に無視する場合

```typescript
// @ts-ignore - 次の行の型エラーを無視
const value: string = someValue;
```

### プレコミットフックをスキップする場合

```bash
git commit --no-verify
```

**注意**: 緊急時のみ使用してください。通常はエラーを修正してからコミットしてください。

### Huskyが動作しない場合

```bash
# Huskyを再インストール
rm -rf .husky
npx husky init
npx husky add .husky/pre-commit "npm run pre-commit-check"
chmod +x .husky/pre-commit
```

## 📚 関連ドキュメント

- [PRE_COMMIT_SETUP.md](./PRE_COMMIT_SETUP.md) - 詳細なセットアップ手順
- [QUICK_BUILD_TEST.md](./QUICK_BUILD_TEST.md) - ビルドテストガイド
- [BUILD_ERROR_FIX_GUIDE.md](./BUILD_ERROR_FIX_GUIDE.md) - ビルドエラー修正ガイド


