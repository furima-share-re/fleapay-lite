# Render環境でのPrisma設定ガイド

ローカルで作業しない場合、Render環境でPrisma設定を行う方法です。

## 📋 現在の状況

- ✅ Supabaseスキーマ移行完了（すべてのテーブルが作成済み）
- ⏳ Prisma設定が必要
- ⏳ ローカル環境で作業しない

## 🔧 解決方法

### オプション1: package.jsonにpostinstallスクリプトを追加（推奨）

Render環境でビルド時に自動的にPrisma Clientを生成するように設定します。

#### 1.1 package.jsonを更新

`package.json` の `scripts` セクションに `postinstall` を追加：

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "vitest run",
    "type-check": "tsc --noEmit",
    "postinstall": "prisma generate"
  }
}
```

**動作**:
- `npm install` 実行後、自動的に `prisma generate` が実行されます
- Render環境でもビルド時に自動実行されます

#### 1.2 prisma/schema.prismaを手動で更新

`prisma/schema.prisma` にSupabaseのテーブル定義を手動で追加します。

**注意**: `prisma db pull` を実行できないため、手動でスキーマを記述する必要があります。

### オプション2: Render環境で直接実行（一時的）

Render環境のシェルから直接実行することも可能ですが、推奨されません。

1. Render Dashboardでサービスを選択
2. **Shell** タブを開く
3. 以下のコマンドを実行：

```bash
npx prisma db pull
npx prisma generate
```

**注意**: この方法は一時的で、デプロイのたびに再実行が必要です。

---

## 🎯 推奨手順：package.jsonにpostinstallを追加

### ステップ1: package.jsonを更新

`package.json` の `scripts` セクションに以下を追加：

```json
"postinstall": "prisma generate"
```

### ステップ2: prisma/schema.prismaを手動で更新

Supabaseのテーブル定義に基づいて、`prisma/schema.prisma` を手動で更新します。

**現在の状態**: `prisma/schema.prisma` はテンプレートのみで、テーブル定義がありません。

### ステップ3: Gitにコミット・プッシュ

```bash
git add package.json prisma/schema.prisma
git commit -m "chore: add postinstall script for Prisma and update schema"
git push
```

### ステップ4: Render環境でビルド

Renderが自動的にデプロイを開始し、ビルド時に `prisma generate` が実行されます。

---

## 📝 prisma/schema.prismaの手動作成

`prisma/schema.prisma` にSupabaseのテーブル定義を追加する必要があります。

**現在のテーブル**:
- `buyer_attributes`
- `frames`
- `images`
- `kids_achievements`
- `order_items`
- `order_metadata`
- `orders`
- `qr_sessions`
- `sellers`
- `stripe_payments`

これらのテーブル定義をPrismaスキーマ形式で記述する必要があります。

---

## ⚠️ 注意事項

1. **prisma db pullが実行できない**
   - ローカル環境がないため、`prisma db pull` を実行できません
   - スキーマを手動で作成する必要があります

2. **prisma generateは自動実行**
   - `postinstall` スクリプトを追加すれば、Render環境で自動実行されます

3. **スキーマの手動作成**
   - Supabaseのテーブル構造に基づいて、Prismaスキーマを手動で作成する必要があります

---

## 🔄 代替案：スキーマを後で更新

現時点では、Prismaスキーマが完全でなくても、既存の `pg` 直接使用は継続できます。

1. **現状維持**: 既存の `pg` 直接使用を継続
2. **後で更新**: 必要に応じて後でPrismaスキーマを手動で作成

---

## 📚 次のステップ

1. **package.jsonにpostinstallを追加**（推奨）
2. **prisma/schema.prismaを手動で更新**（または後で更新）
3. **Gitにコミット・プッシュ**
4. **Render環境で動作確認**

どちらにしますか？
- package.jsonにpostinstallを追加して、prisma/schema.prismaを手動で作成
- 現時点ではPrisma設定をスキップして、既存のpg直接使用を継続

