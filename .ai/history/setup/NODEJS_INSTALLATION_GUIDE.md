# Node.jsインストールガイド

Prisma設定を進めるために、Node.jsをインストールします。

## 📥 Node.jsのインストール

### ステップ1: Node.jsをダウンロード

1. [Node.js公式サイト](https://nodejs.org/) にアクセス
2. **LTS版（推奨）** をダウンロード
   - 例: `v20.x.x LTS` または `v18.x.x LTS`
   - Windows Installer (.msi) を選択

### ステップ2: インストール

1. ダウンロードした `.msi` ファイルを実行
2. インストールウィザードに従って進める
3. **重要**: 「Add to PATH」オプションが選択されていることを確認
4. インストールを完了

### ステップ3: インストール確認

PowerShellを**再起動**してから、以下を実行：

```powershell
# Node.jsのバージョンを確認
node --version

# npmのバージョンを確認
npm --version

# npxのバージョンを確認
npx --version
```

**期待される出力例**:
```
v20.11.0
10.2.4
10.2.4
```

---

## 🔧 インストール後のPrisma設定

### ステップ1: 依存関係のインストール

```powershell
# プロジェクトルートで実行
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# 依存関係をインストール
npm install
```

### ステップ2: .envファイルの確認

`.env` ファイルにSupabase接続文字列が設定されていることを確認：

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

### ステップ3: Prismaスキーマの生成

```powershell
# PrismaスキーマをSupabaseから生成
npx prisma db pull

# Prisma Clientを生成
npx prisma generate
```

### ステップ4: 動作確認

```powershell
# ローカルサーバーを起動
npm run dev

# 別ターミナルでヘルスチェック
Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**期待されるレスポンス**:
```json
{
  "ok": true,
  "timestamp": "2025-01-15T...",
  "version": "...",
  "prisma": "connected"
}
```

---

## 🐛 トラブルシューティング

### 問題1: コマンドが見つからない

**対処方法**:
- PowerShellを再起動
- 環境変数PATHを確認
- Node.jsのインストールパスが正しいか確認

### 問題2: npm install が失敗する

**対処方法**:
```powershell
# キャッシュをクリア
npm cache clean --force

# 再度インストール
npm install
```

### 問題3: Prisma接続エラー

**確認事項**:
- `.env` ファイルの `DATABASE_URL` が正しいか
- Supabaseプロジェクトがアクティブか
- パスワードが正しいか

---

## 📋 チェックリスト

- [ ] Node.jsをインストール
- [ ] PowerShellを再起動
- [ ] `node --version` でバージョン確認
- [ ] `npm --version` でバージョン確認
- [ ] `npm install` で依存関係をインストール
- [ ] `.env` ファイルを確認
- [ ] `npx prisma db pull` を実行
- [ ] `npx prisma generate` を実行
- [ ] ローカルで動作確認

---

## 🔗 関連リンク

- **Node.js公式サイト**: https://nodejs.org/
- **Prisma公式ドキュメント**: https://www.prisma.io/docs

