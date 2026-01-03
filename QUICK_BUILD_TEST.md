# クイックビルドテストガイド

内部でビルドテストを実行して、エラーを自動検出・修正する方法です。

## 🚀 使い方

### 1. ビルドテストを実行（推奨）

```bash
npm run test-build
```

このコマンドで：
- ✅ TypeScript型チェックを実行（高速）
- ✅ Next.jsビルドを実行（実際のビルドエラーを検出）
- ✅ エラーを自動的に分類・表示
- ✅ 修正方法を提案

### 2. 型チェックのみ（高速）

```bash
npm run type-check
```

ビルド全体ではなく、型エラーのみを確認できます。

### 3. 自動修正を試す

```bash
npm run fix-build-errors
```

よくあるエラーパターンを自動修正します。

## 📊 エラーの種類

### 1. 型エラー（Type Error）
- TypeScriptの型定義の問題
- 例: `Property 'name' is not assignable`

### 2. モジュールエラー（Module Error）
- 依存関係が見つからない
- 例: `Module not found: Can't resolve 'pg'`

### 3. ビルドエラー（Build Error）
- Next.jsビルド時のエラー
- 例: `Failed to compile`

## 🔧 自動修正されるエラー

以下のエラーは自動修正スクリプトで修正されます：

1. ✅ `readonly name = 'xxx' as const;` → `readonly name: LLMProvider = 'xxx';`
2. ✅ インポートパスの問題
3. ✅ よくある型エラー

## 💡 効率的なワークフロー

```bash
# ステップ1: ビルドテストを実行
npm run test-build

# ステップ2: エラーが出た場合、自動修正を試す
npm run fix-build-errors

# ステップ3: 再度ビルドテストを実行
npm run test-build

# ステップ4: まだエラーがある場合、エラーメッセージをCursorに貼り付けて修正を依頼
```

## 🎯 Cursorでの効率的な使い方

1. **エラーメッセージをコピー**: `npm run test-build`の出力をコピー
2. **Cursorに貼り付け**: 「このエラーを修正してください」と依頼
3. **一括修正**: 同じパターンのエラーが複数ある場合、一括修正を依頼

## 📝 注意事項

- `npm run test-build`は実際のビルドを実行するため、時間がかかります（1-3分）
- 型チェックのみの場合は`npm run type-check`を使用してください（数秒）
- CI環境では`CI=true`が自動的に設定されます

## 🔍 トラブルシューティング

### ビルドが遅い場合

```bash
# 型チェックのみ実行（高速）
npm run type-check
```

### エラーが繰り返し発生する場合

```bash
# キャッシュをクリア
rm -rf .next node_modules/.cache

# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# 再度ビルドテスト
npm run test-build
```

