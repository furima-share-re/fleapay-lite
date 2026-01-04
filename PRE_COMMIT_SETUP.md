# プレコミット設定ガイド

ビルド前に型エラーを検出・修正するための設定です。

## 📋 セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

これにより、以下のパッケージがインストールされます：
- `eslint` - コード品質チェック
- `eslint-config-next` - Next.js用ESLint設定
- `@typescript-eslint/eslint-plugin` - TypeScript用ESLintプラグイン
- `@typescript-eslint/parser` - TypeScript用パーサー
- `husky` - Gitフック管理
- `lint-staged` - ステージングされたファイルのみチェック

### 2. Huskyの初期化（初回のみ）

```bash
npx husky init
```

### 3. プレコミットフックの設定

```bash
npx husky add .husky/pre-commit "npm run pre-commit-check"
```

または、手動で `.husky/pre-commit` ファイルを作成：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run pre-commit-check
```

実行権限を付与：

```bash
chmod +x .husky/pre-commit
```

## 🚀 使い方

### コーディング時

1. **エディタで自動チェック**
   - VSCode/Cursorでファイルを保存すると自動的にESLintが実行されます
   - 型エラーはエディタ上で赤い波線で表示されます

2. **手動チェック**
   ```bash
   # 型チェックのみ
   npm run type-check
   
   # ESLintチェックのみ
   npm run lint
   
   # 両方を実行
   npm run pre-commit-check
   ```

### コミット時

- コミット前に自動的に型チェックとLintが実行されます
- エラーがある場合はコミットが中止されます
- `lint-staged`により、変更されたファイルのみがチェックされます

### ビルド前

```bash
# ビルド前にチェック
npm run pre-commit-check

# 問題なければビルド
npm run build
```

## 🔧 設定ファイル

- `.eslintrc.json` - ESLint設定
- `.lintstagedrc.json` - lint-staged設定（ステージングされたファイルのみチェック）
- `.vscode/settings.json` - VSCode/Cursor設定（保存時に自動フォーマット）
- `.husky/pre-commit` - Gitプレコミットフック

## 📝 ルール

### ESLintルール

- `@typescript-eslint/no-explicit-any`: `any`型の使用を警告
- `@typescript-eslint/no-unused-vars`: 未使用変数を警告（`_`で始まる変数は除外）
- `prefer-const`: `let`より`const`を推奨
- `no-console`: `console.log`を警告（`console.warn`と`console.error`は許可）

### TypeScript設定

- `strict: true` - 厳密な型チェック
- `noImplicitAny: false` - 暗黙的な`any`を許可（警告は出る）
- `strictNullChecks: true` - nullチェックを有効化

## 🎯 効果

1. **エディタでの即座のフィードバック**
   - コードを書いている最中にエラーを検出
   - 保存時に自動フォーマット

2. **コミット前の自動チェック**
   - 型エラーがあるコードはコミットできない
   - コード品質の統一

3. **ビルドエラーの削減**
   - ビルド前に問題を発見
   - CI/CDでの失敗を削減

## 🔄 ワークフロー

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
```

## 💡 トラブルシューティング

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

（非推奨：緊急時のみ使用）

