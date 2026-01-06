# テーブル追加方法ガイド

**更新日**: 2026-01-06  
**プロジェクト**: fleapay-lite

---

## 📋 このプロジェクトのマイグレーション管理ポリシー

このプロジェクトでは、**データベースが正（source of truth）** という方針を採用しています：

- ✅ **SQLマイグレーション**: `supabase/migrations/` ディレクトリでSQLファイルとして管理
- ✅ **Prismaスキーマ**: データベースから `prisma db pull` で再生成
- ❌ **Prisma Migrate**: 使用しない（`prisma migrate` は使わない）

---

## 🚀 テーブル追加の手順

### ステップ1: SQLマイグレーションファイルを作成

`supabase/migrations/` ディレクトリに、日時ベースのファイル名でSQLファイルを作成します。

**ファイル名の形式**: `YYYYMMDD_HHMMSS_description.sql`

**例**:
```sql
-- supabase/migrations/20260106_120000_add_products_table.sql

-- products テーブルを作成
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  seller_id TEXT NOT NULL REFERENCES sellers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS products_seller_idx ON products(seller_id);
CREATE INDEX IF NOT EXISTS products_created_idx ON products(created_at DESC);
```

### ステップ2: マイグレーションを実行

#### 方法A: 自動化スクリプト（推奨）✨

**PowerShell (Windows)**:
```powershell
# DATABASE_URL環境変数を設定（.envファイルから読み込む場合）
# .envファイルがある場合は、dotenvを使用するか、手動で設定

# マイグレーションを自動実行
.\scripts\apply-migration.ps1 -MigrationFile "supabase\migrations\20260106_120000_add_products_table.sql"
```

**Node.js (クロスプラットフォーム)**:
```bash
# DATABASE_URL環境変数を設定
export DATABASE_URL="postgresql://postgres:password@host:5432/database"

# マイグレーションを自動実行（npmスクリプトを使用）
npm run migrate supabase/migrations/20260106_120000_add_products_table.sql

# または直接実行
node scripts/apply-migration.js supabase/migrations/20260106_120000_add_products_table.sql
```

#### 方法B: Supabase Dashboard（手動）

1. Supabase Dashboard にログイン
2. **SQL Editor** を開く
3. 作成したSQLファイルの内容をコピー＆ペースト
4. **Run** をクリックして実行

#### 方法C: コマンドライン（psql）

```bash
# 環境変数から接続文字列を取得
psql $DATABASE_URL -f supabase/migrations/20260106_120000_add_products_table.sql
```

### ステップ3: Prismaスキーマを更新

データベースにテーブルが追加されたら、Prismaスキーマを再生成します：

```bash
# Prismaスキーマをデータベースから再生成し、Prisma Clientを生成（一括実行）
npm run migrate:prisma

# または個別に実行
npx prisma db pull
npx prisma generate
```

これにより、`prisma/schema.prisma` に新しいテーブルに対応するモデルが自動的に追加されます。

---

## 📝 実例: 新しいテーブルを追加する場合

### 例: `notifications` テーブルを追加

#### 1. SQLマイグレーションファイルを作成

`supabase/migrations/20260106_130000_add_notifications_table.sql`:

```sql
-- notifications テーブルを作成
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL REFERENCES sellers(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS notifications_seller_idx ON notifications(seller_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications(created_at DESC);
```

#### 2. Supabase SQL Editorで実行

Supabase Dashboard > SQL Editor で上記のSQLを実行します。

#### 3. Prismaスキーマを更新

```bash
npx prisma db pull
npx prisma generate
```

#### 4. 確認

`prisma/schema.prisma` に以下のようなモデルが追加されていることを確認：

```prisma
model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  sellerId  String   @map("seller_id")
  title     String
  message   String
  type      String   @default("info")
  read      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  seller Seller @relation(fields: [sellerId], references: [id])

  @@index([sellerId], name: "notifications_seller_idx")
  @@index([read], name: "notifications_read_idx")
  @@index([createdAt(sort: Desc)], name: "notifications_created_idx")
  @@map("notifications")
}
```

---

## 🤖 自動化について

### 自動化スクリプトの使用

このプロジェクトには、マイグレーションを自動実行するスクリプトが含まれています：

- **PowerShell版**: `scripts/apply-migration.ps1`
- **Node.js版**: `scripts/apply-migration.js`

これらのスクリプトを使用することで、手動でSupabase SQL Editorを開く必要がなくなります。

### CI/CDパイプラインへの組み込み

将来的には、GitHub ActionsやRenderのビルドフックに組み込むことで、プッシュ時に自動的にマイグレーションを適用することも可能です。

---

## ✅ ベストプラクティス

### 1. ファイル名の命名規則

- **形式**: `YYYYMMDD_HHMMSS_description.sql`
- **例**: `20260106_120000_add_products_table.sql`
- **理由**: 時系列で管理でき、実行順序が明確

### 2. SQLファイルの内容

- ✅ `CREATE TABLE IF NOT EXISTS` を使用（冪等性を保証）
- ✅ `CREATE INDEX IF NOT EXISTS` を使用
- ✅ 外部キー制約を適切に設定
- ✅ コメントを追加して可読性を向上

### 3. マイグレーションの実行順序

1. **開発環境でテスト**: まず開発環境で実行して確認
2. **本番環境に適用**: 問題なければ本番環境に適用
3. **Prismaスキーマを更新**: 最後に `prisma db pull` で更新

### 4. ロールバック

必要に応じて、ロールバック用のSQLファイルも作成：

`supabase/migrations/20260106_120001_rollback_products_table.sql`:

```sql
-- products テーブルを削除（ロールバック用）
DROP TABLE IF EXISTS products;
```

---

## 🔍 既存のマイグレーションファイルの例

参考として、既存のマイグレーションファイルを確認できます：

- `supabase/migrations/20260102_add_auth_provider_columns.sql`

---

## ⚠️ 注意事項

### Prisma Migrateは使用しない

このプロジェクトでは、`prisma migrate` コマンドは使用しません。理由：

- データベースが正（source of truth）
- SQLマイグレーションファイルで管理する方が柔軟
- Supabaseの機能と統合しやすい

### 本番環境での実行

- 本番環境でマイグレーションを実行する前に、必ず開発環境でテストしてください
- バックアップを取ってから実行することを推奨します
- 重要な変更は、メンテナンスウィンドウ中に実行することを推奨します

---

## 📚 関連ドキュメント

- `prisma/schema.prisma` - Prismaスキーマ定義（コメントにマイグレーション管理ポリシーが記載）
- `SECURITY_POLICY_SQL.md` - SQL直接実行のセキュリティポリシー
- `scripts/archived/README.md` - アーカイブされたSQLファイルの説明

---

**最終更新**: 2026-01-06  
**実装者**: AI Assistant

