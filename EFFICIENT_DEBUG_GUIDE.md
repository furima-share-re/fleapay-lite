# 効率的なデバッグガイド

ビルドエラーを効率的に修正するためのガイドです。

## 🚀 クイックスタート

### 1. すべてのエラーを一度に確認

```bash
npm run analyze-build-errors
```

このコマンドで：
- ✅ すべてのビルドエラーを一覧表示
- ✅ エラーパターンを分類
- ✅ 修正方法を提案

### 2. 自動修正を試す

```bash
npm run fix-build-errors
```

このコマンドで：
- ✅ よくあるエラーパターンを自動修正
- ✅ 修正後の型チェックを実行
- ✅ 残りのエラーを表示

### 3. 型エラーのみ確認

```bash
npm run type-check
```

ビルド全体ではなく、型エラーのみを確認できます（高速）。

## 📋 デバッグワークフロー

### 推奨手順

```bash
# ステップ1: エラーを分析
npm run analyze-build-errors

# ステップ2: 自動修正を試す
npm run fix-build-errors

# ステップ3: まだエラーがある場合は、エラーメッセージを確認して手動修正
npm run type-check

# ステップ4: 最終確認
npm run build
```

## 🔧 よくあるエラーパターンと修正方法

### 1. 型エラー: `Property 'name' is not assignable`

**エラー例:**
```
Property 'name' in type 'MockProvider' is not assignable to the same property in base type 'LLMProviderInterface'.
```

**修正方法:**
```typescript
// ❌ 修正前
readonly name = 'mock' as const;

// ✅ 修正後
readonly name: LLMProvider = 'mock';
```

**自動修正:**
```bash
npm run fix-build-errors
```

### 2. モジュールが見つからないエラー

**エラー例:**
```
Module not found: Can't resolve 'pg'
```

**修正方法:**
```bash
npm install pg @types/pg
```

### 3. 型の不一致エラー

**エラー例:**
```
Type 'Buffer' is not assignable to type 'BlobPart'
```

**修正方法:**
```typescript
// ❌ 修正前
const file = new File([buffer], 'image.png');

// ✅ 修正後
const uint8Array = new Uint8Array(buffer);
const file = new File([uint8Array], 'image.png');
```

## 🎯 Cursorでの効率的なデバッグ

### 1. エラーメッセージをコピー

ビルドエラーのメッセージ全体をCursorのチャットに貼り付けます。

### 2. 一括修正を依頼

```
すべてのビルドエラーを修正してください
```

または、特定のエラーパターンを指定：

```
Property 'name' の型エラーをすべて修正してください
```

### 3. エラーログを分析

```bash
npm run analyze-build-errors > errors.txt
```

生成された`errors.txt`をCursorに読み込ませて、一括修正を依頼できます。

## 📊 エラー分析の詳細

### エラーパターンの分類

1. **型エラー**: TypeScriptの型定義の問題
2. **モジュールエラー**: 依存関係の問題
3. **構文エラー**: コードの構文の問題
4. **インポートエラー**: インポートパスの問題

### エラーの優先順位

1. **高**: ビルドを完全にブロックするエラー
2. **中**: 一部の機能に影響するエラー
3. **低**: 警告レベルのエラー

## 🔍 トラブルシューティング

### ビルドが遅い場合

```bash
# 型チェックのみ実行（高速）
npm run type-check

# キャッシュをクリア
rm -rf .next
npm run build
```

### エラーが繰り返し発生する場合

```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# Prismaを再生成
npx prisma generate

# ビルドを再実行
npm run build
```

### Windowsでのパス問題

```bash
# PowerShellで実行
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

## 📝 チェックリスト

ビルドエラーを修正する際のチェックリスト：

- [ ] `npm run analyze-build-errors`でエラーを確認
- [ ] `npm run fix-build-errors`で自動修正を試す
- [ ] 残りのエラーを手動で修正
- [ ] `npm run type-check`で型エラーを確認
- [ ] `npm run build`で最終確認

## 🎓 ベストプラクティス

1. **小さく修正**: 一度に1つのエラーを修正する
2. **確認しながら進む**: 修正後は必ず型チェックを実行
3. **エラーログを保存**: 修正前後のエラーログを比較
4. **自動修正を活用**: よくあるパターンは自動修正スクリプトを使用

## 📚 参考資料

- [TypeScript エラーメッセージ](https://www.typescriptlang.org/docs/handbook/error-messages.html)
- [Next.js ビルドエラー](https://nextjs.org/docs/messages)
- [BUILD_ERROR_FIX_GUIDE.md](./BUILD_ERROR_FIX_GUIDE.md)

