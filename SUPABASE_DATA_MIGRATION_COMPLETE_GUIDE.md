# Supabaseへのデータ移行 完全ガイド

**作成日**: 2026-01-04  
**目的**: Supabaseへのデータ移行方法を網羅的に説明

---

## 📋 目次

1. [移行方法の比較](#移行方法の比較)
2. [方法1: pg_restoreを使った移行（推奨・大規模データ向け）](#方法1-pg_restoreを使った移行推奨大規模データ向け)
3. [方法2: CSV形式での移行（中規模データ向け）](#方法2-csv形式での移行中規模データ向け)
4. [方法3: Supabase Table Editorを使った移行（小規模データ向け）](#方法3-supabase-table-editorを使った移行小規模データ向け)
5. [方法4: Node.jsスクリプトを使った移行（psql不要）](#方法4-nodejsスクリプトを使った移行psql不要)
6. [トラブルシューティング](#トラブルシューティング)
7. [データ整合性チェック](#データ整合性チェック)

---

## 移行方法の比較

| 方法 | データ量 | 難易度 | 所要時間 | 推奨シーン |
|------|---------|--------|---------|-----------|
| **pg_restore** | 大規模（GB単位） | ⭐⭐☆☆☆ | 1-3時間 | 本番環境の完全移行 |
| **CSV形式** | 中規模（MB単位） | ⭐⭐⭐☆☆ | 30分-1時間 | 検証環境、段階的移行 |
| **Table Editor** | 小規模（数千行） | ⭐☆☆☆☆ | 10-30分 | テストデータ、手動確認 |
| **Node.jsスクリプト** | 中規模 | ⭐⭐☆☆☆ | 30分-1時間 | psqlが使えない環境 |

**推奨**: 
- **本番環境**: 方法1（pg_restore）
- **検証環境**: 方法2（CSV形式）または方法4（Node.jsスクリプト）

---

## 方法1: pg_restoreを使った移行（推奨・大規模データ向け）

### 概要

PostgreSQLの標準ツール`pg_restore`を使用して、`.dir.tar.gz`形式のバックアップファイルからSupabaseにデータを復元します。

**メリット**:
- ✅ 大規模データに対応（GB単位）
- ✅ スキーマとデータを同時に移行可能
- ✅ 高速（PostgreSQLネイティブ形式）
- ✅ トランザクション整合性が保証される

**デメリット**:
- ❌ PostgreSQLクライアントツールのインストールが必要
- ❌ バックアップファイルの準備が必要

### 事前準備

#### Step 1: PostgreSQLクライアントツールのインストール

**Windows**:
1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/)からダウンロード
2. インストーラーを実行（`pg_restore`が自動的にインストールされます）
3. PowerShellを再起動

**確認**:
```powershell
pg_restore --version
# 期待される出力: pg_restore (PostgreSQL) 15.x または 18.x
```

#### Step 2: PATH設定（必要に応じて）

`PHASE_1_8_SETUP_PG_PATH.ps1`を実行してPATHを設定：

```powershell
.\PHASE_1_8_SETUP_PG_PATH.ps1
```

### 実行手順

#### Step 1: バックアップファイルの準備

本番環境からバックアップを取得：

```powershell
# 本番環境の接続文字列を設定
$PROD_DB_URL = "postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a:5432/fleapay_prod_db"

# バックアップを取得（カスタム形式）
pg_dump $PROD_DB_URL --format=directory --file=tmp/backup --no-owner --no-privileges

# tar.gz形式に圧縮
cd tmp
tar -czf backup.dir.tar.gz backup/
```

#### Step 2: バックアップファイルの展開

```powershell
cd tmp
tar -zxvf backup.dir.tar.gz
# または
tar -zxvf 2026-01-03T15_42Z.dir.tar.gz  # 既存のバックアップファイルの場合
```

#### Step 3: Supabase接続情報の取得

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** → **Connection string** → **URI**をコピー

**接続文字列の形式**:
```
postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres
```

#### Step 4: pg_restoreでインポート

```powershell
# 展開したディレクトリに移動
cd tmp/backup  # または tmp/2026-01-03T15:42Z/fleapay_prod_db

# Supabase接続情報を設定
$SUPABASE_URL = "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres"

# pg_restoreでインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

**コマンドオプションの説明**:
- `--dbname`: Supabaseの接続先を指定
- `--verbose`: 進捗を表示
- `--clean`: 既存のデータを削除してからインポート
- `--no-owner`: 所有者情報を無視（Supabaseでは必要）
- `--no-privileges`: 権限情報を無視（Supabaseでは必要）
- `.`: 現在のディレクトリ（展開したフォルダ）を指定

**実行時間**: 約1-3時間（データ量による）

### 詳細ガイド

詳細な手順は [`PHASE_1_8_PG_RESTORE_SIMPLE_GUIDE.md`](./PHASE_1_8_PG_RESTORE_SIMPLE_GUIDE.md) を参照してください。

---

## 方法2: CSV形式での移行（中規模データ向け）

### 概要

PostgreSQLの`\COPY`コマンドを使用して、CSV形式でデータをエクスポート・インポートします。

**メリット**:
- ✅ データを確認しながら移行可能
- ✅ テーブル単位で段階的に移行可能
- ✅ エラーが発生した場合の再実行が容易

**デメリット**:
- ❌ 大規模データには時間がかかる
- ❌ 手動での順序管理が必要（外部キー制約）

### 実行手順

#### Step 1: データのエクスポート（元のDBから）

```powershell
# 元のデータベース接続文字列を設定
$SOURCE_DB_URL = "postgresql://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"

# 出力ディレクトリを作成
New-Item -ItemType Directory -Force -Path dump

# 親テーブルから順にエクスポート（外部キー制約を考慮）
psql $SOURCE_DB_URL -c "\COPY frames TO 'dump/frames.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY sellers TO 'dump/sellers.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY orders TO 'dump/orders.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY order_items TO 'dump/order_items.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY images TO 'dump/images.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY stripe_payments TO 'dump/stripe_payments.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY qr_sessions TO 'dump/qr_sessions.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY buyer_attributes TO 'dump/buyer_attributes.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY order_metadata TO 'dump/order_metadata.csv' CSV HEADER"
psql $SOURCE_DB_URL -c "\COPY kids_achievements TO 'dump/kids_achievements.csv' CSV HEADER"
```

#### Step 2: Supabaseへのインポート

**オプションA: PowerShellスクリプトを使用（推奨）**

```powershell
.\scripts\import-to-supabase.ps1 `
  -SupabaseDatabaseUrl "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres" `
  -DataDir "./dump"
```

**オプションB: 手動でpsqlコマンドを実行**

```powershell
# Supabase接続情報を設定
$SUPABASE_URL = "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres"

# 親テーブルから順にインポート
psql $SUPABASE_URL -c "\COPY frames FROM 'dump/frames.csv' CSV HEADER"
psql $SUPABASE_URL -c "\COPY sellers FROM 'dump/sellers.csv' CSV HEADER"
psql $SUPABASE_URL -c "\COPY orders FROM 'dump/orders.csv' CSV HEADER"
psql $SUPABASE_URL -c "\COPY order_items FROM 'dump/order_items.csv' CSV HEADER"
psql $SUPABASE_URL -c "\COPY images FROM 'dump/images.csv' CSV HEADER"
psql $SUPABASE_URL -c "\COPY stripe_payments FROM 'dump/stripe_payments.csv' CSV HEADER"
psql $SUPABASE_URL -c "\COPY qr_sessions FROM 'dump/qr_sessions.csv' CSV HEADER"
psql $SUPABASE_URL -c "\COPY buyer_attributes FROM 'dump/buyer_attributes.csv' CSV HEADER"
psql $SUPABASE_URL -c "\COPY order_metadata FROM 'dump/order_metadata.csv' CSV HEADER"
psql $SUPABASE_URL -c "\COPY kids_achievements FROM 'dump/kids_achievements.csv' CSV HEADER"
```

**重要**: インポート順序は外部キー制約を考慮して、親テーブルから順に実行してください。

### 詳細ガイド

詳細な手順は [`scripts/migrate-to-supabase.md`](./scripts/migrate-to-supabase.md) を参照してください。

---

## 方法3: Supabase Table Editorを使った移行（小規模データ向け）

### 概要

SupabaseのWeb UI（Table Editor）を使用して、CSVファイルを直接アップロードしてインポートします。

**メリット**:
- ✅ PostgreSQLクライアントツールが不要
- ✅ 視覚的にデータを確認しながら移行可能
- ✅ 簡単で直感的

**デメリット**:
- ❌ 小規模データ（数千行程度）に限定
- ❌ 大規模データには時間がかかる

### 実行手順

#### Step 1: データのエクスポート

方法2のStep 1と同様に、CSVファイルをエクスポートします。

#### Step 2: Supabase Table Editorでインポート

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. 左メニューから **Table Editor** を開く
4. 対象テーブル（例: `frames`）を選択
5. **Import data** ボタンをクリック
6. CSVファイルをアップロード
7. **Import** をクリック

**インポート順序**（外部キー制約を考慮）:
1. `frames`
2. `sellers`
3. `orders`
4. `order_items`
5. `images`
6. `stripe_payments`
7. `qr_sessions`
8. `buyer_attributes`
9. `order_metadata`
10. `kids_achievements`

---

## 方法4: Node.jsスクリプトを使った移行（psql不要）

### 概要

Node.jsスクリプトを使用して、PostgreSQLクライアントツール（`psql`）がなくてもデータを移行できます。

**メリット**:
- ✅ `psql`がインストールされていない環境でも動作
- ✅ Node.js環境があれば実行可能
- ✅ エラーハンドリングが充実

**デメリット**:
- ❌ 中規模データまで（大規模データには時間がかかる）
- ❌ Node.js環境が必要

### 実行手順

#### Step 1: データのエクスポート

```powershell
# 元のデータベース接続文字列を設定
$SOURCE_DB_URL = "postgresql://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db"

# Node.jsスクリプトでエクスポート
node scripts/migrate-data-nodejs.js dump $SOURCE_DB_URL "./dump"
```

#### Step 2: Supabaseへのインポート

```powershell
# Supabase接続情報を設定
$SUPABASE_URL = "postgresql://postgres:あなたのパスワード@db.xxxxx.supabase.co:5432/postgres"

# Node.jsスクリプトでインポート
node scripts/migrate-data-nodejs.js import $SUPABASE_URL "./dump"
```

### スクリプトの詳細

スクリプトの詳細は [`scripts/migrate-data-nodejs.js`](./scripts/migrate-data-nodejs.js) を参照してください。

---

## トラブルシューティング

### エラー1: `pg_restore: command not found`

**原因**: PostgreSQLクライアントツールがインストールされていない

**解決方法**:
1. PostgreSQLクライアントツールをインストール（方法1のStep 1参照）
2. PowerShellを再起動
3. `PHASE_1_8_SETUP_PG_PATH.ps1`を実行してPATHを設定

### エラー2: `pg_restore: error: connection to database failed`

**原因**: 接続情報が間違っている

**確認事項**:
- ✅ パスワードが正しいか
- ✅ プロジェクト参照IDが正しいか
- ✅ 接続文字列の形式が正しいか

**解決方法**:
1. Supabase Dashboardで接続情報を再確認
2. パスワードを確認（URLエンコードが必要な場合がある）
3. 再度実行

### エラー3: `pg_restore: error: relation "xxx" does not exist`

**原因**: スキーマが作成されていない

**解決方法**:
1. Supabase SQL Editorでスキーマを実行
2. `.ai/history/sql/supabase_schema.sql`を参照
3. テーブルが作成されているか確認

### エラー4: 外部キー制約エラー

**原因**: データのインポート順序が間違っている

**解決方法**:
1. 親テーブルから順にインポート（`frames` → `sellers` → `orders` → ...）
2. 親テーブルのデータが存在することを確認
3. 必要に応じて、外部キー制約を一時的に無効化

### エラー5: データ型の不一致

**原因**: スキーマのデータ型が一致していない

**解決方法**:
1. Supabase SQL Editorでスキーマを確認
2. `.ai/history/sql/supabase_schema.sql`を参照
3. データ型を修正

---

## データ整合性チェック

### レコード数の確認

Supabase SQL Editorで以下を実行：

```sql
-- レコード数を確認
SELECT 
  'sellers' as table_name, COUNT(*) as count FROM sellers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'stripe_payments', COUNT(*) FROM stripe_payments
UNION ALL
SELECT 'frames', COUNT(*) FROM frames
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'images', COUNT(*) FROM images
UNION ALL
SELECT 'qr_sessions', COUNT(*) FROM qr_sessions
UNION ALL
SELECT 'buyer_attributes', COUNT(*) FROM buyer_attributes
UNION ALL
SELECT 'order_metadata', COUNT(*) FROM order_metadata
UNION ALL
SELECT 'kids_achievements', COUNT(*) FROM kids_achievements;
```

**期待される結果**: 元のデータベースと同じレコード数が表示されること

### サンプルデータの確認

```sql
-- 最新の注文を確認
SELECT id, seller_id, amount, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 売主情報を確認
SELECT id, display_name, shop_name, email, created_at 
FROM sellers 
LIMIT 10;
```

### 外部キー制約の確認

```sql
-- 外部キー制約が正しく機能しているか確認
SELECT 
  o.id,
  o.seller_id,
  s.display_name as seller_name,
  o.frame_id,
  f.display_name as frame_name
FROM orders o
LEFT JOIN sellers s ON o.seller_id = s.id
LEFT JOIN frames f ON o.frame_id = f.id
LIMIT 10;
```

---

## 📚 関連ドキュメント

- [`PHASE_1_8_PG_RESTORE_SIMPLE_GUIDE.md`](./PHASE_1_8_PG_RESTORE_SIMPLE_GUIDE.md) - pg_restoreの詳細ガイド
- [`scripts/migrate-to-supabase.md`](./scripts/migrate-to-supabase.md) - CSV形式での移行ガイド
- [`MIGRATION_EXECUTION_PLAN.md`](./MIGRATION_EXECUTION_PLAN.md) - 全体の移行計画
- [`.ai/history/sql/supabase_schema.sql`](./.ai/history/sql/supabase_schema.sql) - Supabaseスキーマ定義

---

## ✅ チェックリスト

### 事前準備
- [ ] Supabaseプロジェクトを作成
- [ ] Supabase接続情報を取得・保存
- [ ] PostgreSQLクライアントツールをインストール（方法1の場合）
- [ ] スキーマ移行が完了していることを確認

### データ移行
- [ ] 移行方法を選択（方法1-4のいずれか）
- [ ] 元のデータベースからデータをエクスポート
- [ ] Supabaseにデータをインポート
- [ ] データ整合性チェックを実行

### 移行後
- [ ] レコード数を確認
- [ ] サンプルデータを確認
- [ ] 外部キー制約を確認
- [ ] アプリケーションの動作確認

---

**準備ができたら、上記の手順に従って実行してください！**


