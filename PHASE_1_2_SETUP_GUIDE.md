# Phase 1.2 実装完了ガイド

**目的**: Phase 1.2の手動実行ステップ（`prisma db pull` と `prisma generate`）を完了させる

---

## 📍 実行場所

**ローカル環境（推奨）** で実行してください。

- ✅ プロジェクトのルートディレクトリ（`fleapay-lite/`）で実行
- ✅ 検証環境（Render）では実行しない（ローカルで実行後、デプロイ）

---

## 🔧 事前準備

### 1. プロジェクトのルートディレクトリに移動

```powershell
# PowerShellの場合
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"
```

```bash
# Git Bash / WSLの場合
cd ~/OneDrive/ドキュメント/GitHub/fleapay-lite
```

### 2. `.env` ファイルの作成・確認

プロジェクトのルートディレクトリに `.env` ファイルを作成（または既存のものを確認）します。

**`.env` ファイルの場所**: `fleapay-lite/.env`（`package.json`と同じ階層）

**必要な環境変数**:

```env
# データベース接続（必須）
# Render PostgreSQLの接続文字列を設定
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]

# その他の環境変数（既存の設定があればそのまま）
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
# ... その他の環境変数
```

**接続文字列の取得方法**:

1. **Render Dashboard** にログイン
2. データベース（`fleapay-lite-db`）を選択
3. **Connections** タブを開く
4. **Internal Database URL** または **External Database URL** をコピー
   - 形式: `postgresql://[user]:[password]@[host]:[port]/[database]`

**注意**: 
- パスワードに特殊文字が含まれる場合は、URLエンコードが必要な場合があります
- ローカルから接続する場合は **External Database URL** を使用してください

---

## 📝 実行手順

### ステップ1: 依存関係のインストール

```powershell
# PowerShell
npm install
```

```bash
# Git Bash / WSL
npm install
```

**確認**:
- `node_modules/` ディレクトリが作成される
- `@prisma/client` と `prisma` がインストールされる

---

### ステップ2: Prismaスキーマを既存DBから生成

```powershell
# PowerShell
npx prisma db pull
```

```bash
# Git Bash / WSL
npx prisma db pull
```

**このコマンドの動作**:
1. `.env` の `DATABASE_URL` を読み取る
2. 既存のRender PostgreSQLデータベースに接続
3. データベースのスキーマ（テーブル、カラム、インデックスなど）を読み取る
4. `prisma/schema.prisma` ファイルを自動生成・更新

**期待される結果**:
- `prisma/schema.prisma` ファイルが更新される
- 既存のテーブル定義がPrismaスキーマとして生成される

**エラーが発生した場合**:
- `DATABASE_URL` が正しく設定されているか確認
- データベースへの接続が可能か確認（ファイアウォール設定など）
- エラーメッセージを確認して対処

---

### ステップ3: Prisma Clientを生成

```powershell
# PowerShell
npx prisma generate
```

```bash
# Git Bash / WSL
npx prisma generate
```

**このコマンドの動作**:
1. `prisma/schema.prisma` を読み取る
2. TypeScript型定義とPrisma Clientを生成
3. `node_modules/.prisma/client/` に生成される

**期待される結果**:
- `node_modules/.prisma/client/` ディレクトリが作成される
- TypeScript型定義が利用可能になる
- `lib/prisma.ts` から `prisma` オブジェクトが使用可能になる

**エラーが発生した場合**:
- `prisma/schema.prisma` に構文エラーがないか確認
- ステップ2（`prisma db pull`）が正常に完了しているか確認

---

### ステップ4: 動作確認

#### 4.1 ローカルサーバーの起動

```powershell
# PowerShell
npm run dev
```

```bash
# Git Bash / WSL
npm run dev
```

**期待される結果**:
- サーバーが起動する（`http://localhost:3000` でリッスン）
- エラーログが表示されない

#### 4.2 ヘルスチェックの確認

**ブラウザで確認**:
1. ブラウザで `http://localhost:3000/api/ping` を開く
2. レスポンスを確認

**PowerShellで確認**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**期待されるレスポンス**:
```json
{
  "ok": true,
  "timestamp": "2025-12-31T...",
  "version": "3.2.0-seller-summary-fixed",
  "prisma": "connected"  ← これが "connected" になれば成功！
}
```

**成功の確認**:
- ✅ `"prisma": "connected"` が含まれている
- ✅ `"ok": true` が返されている
- ✅ エラーログが表示されていない

---

## 🔍 トラブルシューティング

### 問題1: `DATABASE_URL` が見つからない

**エラーメッセージ**:
```
Error: Can't reach database server at ...
```

**対処方法**:
1. `.env` ファイルがプロジェクトのルートディレクトリに存在するか確認
2. `.env` ファイルに `DATABASE_URL` が正しく設定されているか確認
3. 接続文字列の形式が正しいか確認

---

### 問題2: データベースへの接続が拒否される

**エラーメッセージ**:
```
Error: P1001: Can't reach database server at ...
```

**対処方法**:
1. Render Dashboardでデータベースが起動しているか確認
2. **External Database URL** を使用しているか確認（ローカルから接続する場合）
3. ファイアウォール設定を確認
4. パスワードが正しいか確認

---

### 問題3: `prisma db pull` が失敗する

**エラーメッセージ**:
```
Error: P4001: The introspected database does not contain any valid tables.
```

**対処方法**:
1. データベースにテーブルが存在するか確認
2. 接続先のデータベースが正しいか確認
3. データベースのスキーマを確認

---

### 問題4: `prisma generate` が失敗する

**エラーメッセージ**:
```
Error: P1012: Schema validation error
```

**対処方法**:
1. `prisma/schema.prisma` の構文エラーを確認
2. ステップ2（`prisma db pull`）が正常に完了しているか確認
3. Prismaのバージョンが正しいか確認（`package.json` で `^5.9.1` が指定されている）

---

### 問題5: サーバー起動時にPrismaエラーが発生する

**エラーメッセージ**:
```
Error: PrismaClient is not configured
```

**対処方法**:
1. ステップ3（`prisma generate`）が正常に完了しているか確認
2. `node_modules/.prisma/client/` が存在するか確認
3. `npm install` を再実行

---

## ✅ 完了確認チェックリスト

- [ ] `.env` ファイルに `DATABASE_URL` が設定されている
- [ ] `npm install` が正常に完了した
- [ ] `npx prisma db pull` が正常に完了した
- [ ] `prisma/schema.prisma` が更新されている（テーブル定義が含まれている）
- [ ] `npx prisma generate` が正常に完了した
- [ ] `node_modules/.prisma/client/` が存在する
- [ ] `npm run dev` でサーバーが起動する
- [ ] `http://localhost:3000/api/ping` にアクセスできる
- [ ] レスポンスに `"prisma": "connected"` が含まれている

---

## 🚀 次のステップ

Phase 1.2が完了したら：

1. **変更をコミット**:
   ```bash
   git add prisma/schema.prisma
   git commit -m "feat(phase-1.2): complete Prisma setup with db pull and generate"
   ```

2. **検証環境にデプロイ**:
   - Render Dashboardでデプロイを実行
   - デプロイ後、`https://fleapay-lite-t1.onrender.com/api/ping` で確認
   - レスポンスに `"prisma": "connected"` が含まれることを確認

3. **Phase 1.3の準備**:
   - Supabaseプロジェクトの作成
   - 接続情報の取得

---

## 📚 参考資料

- [Prisma公式ドキュメント - db pull](https://www.prisma.io/docs/reference/api-reference/command-reference#db-pull)
- [Prisma公式ドキュメント - generate](https://www.prisma.io/docs/reference/api-reference/command-reference#generate)
- `MIGRATION_EXECUTION_PLAN.md` - Phase 1.2の詳細仕様

---

**作成日**: 2025-12-31  
**対象**: Phase 1.2 実装完了

