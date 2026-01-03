# ビルドエラー修正ガイド

このガイドは、Cursorで効率的にビルドエラーを修正する方法を説明します。

## よくあるビルドエラーのパターン

### 1. モジュールが見つからないエラー

**エラーメッセージ例:**
```
Module not found: Can't resolve 'pg'
```

**修正方法:**
- `package.json`の`dependencies`に該当パッケージを追加
- `npm install`を実行

**確認済み修正:**
- ✅ `pg` - 既に追加済み
- ✅ `@types/pg` - 既に追加済み

### 2. 型エラー

**エラーメッセージ例:**
```
Type error: Type 'Buffer<ArrayBufferLike>' is not assignable to type 'BlobPart'.
```

**修正方法:**
- BufferをUint8Arrayに変換
- 例: `const uint8Array = new Uint8Array(buffer);`

**確認済み修正:**
- ✅ `app/api/photo-frame/route.ts` - 既に修正済み

### 3. Stripe APIバージョンエラー

**エラーメッセージ例:**
```
Type error: Type '"2024-06-20"' is not assignable to type '"2025-10-29.clover"'.
```

**修正方法:**
- StripeのapiVersionを最新バージョンに更新

**確認済み修正:**
- ✅ `app/api/webhooks/stripe/route.ts` - 既に修正済み（'2025-10-29.clover'）

### 4. Prisma findUniqueエラー

**エラーメッセージ例:**
```
Type error: Type '{ email: string; }' is not assignable to type 'SellerWhereUniqueInput'.
```

**修正方法:**
- `findUnique`を`findFirst`に変更（unique制約がないフィールドの場合）

**確認済み修正:**
- ✅ `lib/auth-prisma.ts` - 既に修正済み

### 5. window/localStorage型エラー

**エラーメッセージ例:**
```
Type error: Cannot find name 'window'.
```

**修正方法:**
- `tsconfig.json`の`lib`に`"dom"`と`"dom.iterable"`を追加
- コード内で`typeof window !== 'undefined'`をチェック

**確認済み修正:**
- ✅ `tsconfig.json` - 既に修正済み

## 効率的な修正手順

### ステップ1: ビルドエラーを確認

```bash
npm run build
```

または型チェックのみ:

```bash
npm run type-check
```

### ステップ2: よくある問題をチェック

```bash
npm run check-build-errors
```

このスクリプトは以下の問題を自動的に検出します:
- インポートパスの問題
- 構文エラー（try-catchブロックなど）
- 型エラーの可能性

### ステップ3: エラーを修正

1. **インポートエラー**: `@/`パスが正しく解決されているか確認
2. **型エラー**: TypeScriptの型定義を確認
3. **構文エラー**: 括弧やセミコロンが正しいか確認

### ステップ4: 再ビルド

```bash
npm run build
```

## Cursorでの効率的な修正方法

### 1. エラーメッセージをコピー

ビルドエラーのメッセージ全体をコピーしてCursorに貼り付けます。

### 2. ファイルパスと行番号を確認

エラーメッセージには通常、問題のあるファイルと行番号が含まれています。

例:
```
./app/api/example/route.ts:42:5
Type error: ...
```

### 3. 一括修正

同じパターンのエラーが複数ある場合、Cursorの検索置換機能を使用して一括修正できます。

### 4. 型チェックを実行

修正後、型チェックを実行して確認:

```bash
npm run type-check
```

## トラブルシューティング

### パスの問題（Windows）

Windowsでパスに日本語が含まれている場合、エンコーディングの問題が発生する可能性があります。

**対処法:**
- プロジェクトを英語パスに移動する
- または、PowerShellのエンコーディングを設定する

### node_modulesの問題

```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScriptキャッシュの問題

```bash
rm -rf .next
npm run build
```

## 参考資料

- [Next.js ビルドエラー](https://nextjs.org/docs/messages)
- [TypeScript エラー](https://www.typescriptlang.org/docs/handbook/error-messages.html)
- [Prisma エラー](https://www.prisma.io/docs/reference/api-reference/error-reference)

