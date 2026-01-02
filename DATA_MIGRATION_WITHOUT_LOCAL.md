# ローカル環境なしでデータ移行する方法

**更新日**: 2026-01-01

ローカル環境で作業したくない場合のデータ移行方法です。

---

## 🎯 推奨方法: Supabase SQL Editor + Table Editor

ローカル環境が不要で、最も簡単な方法です。

---

## 方法1: Supabase Table Editorで直接インポート（推奨）

### ステップ1: データのエクスポート（Render Dashboard）

Render Dashboardから直接データをエクスポートする方法：

1. **Render Dashboard**にログイン
2. データベースサービス（`fleapay-lite-db`など）を選択
3. **Connect** タブを開く
4. **psql** または **pgAdmin** で接続
5. 各テーブルをCSV形式でエクスポート

**または、RenderのShell機能を使用**:

1. Render Dashboard → データベースサービス → **Shell** タブ
2. 以下のコマンドを実行：

```sql
-- 各テーブルをCSV形式でエクスポート
\COPY frames TO '/tmp/frames.csv' CSV HEADER;
\COPY sellers TO '/tmp/sellers.csv' CSV HEADER;
\COPY orders TO '/tmp/orders.csv' CSV HEADER;
-- ... 他のテーブルも同様に
```

3. 生成されたCSVファイルをダウンロード

---

### ステップ2: Supabase Table Editorでインポート

1. **Supabase Dashboard**にログイン
2. プロジェクト `edo ichiba staging` を選択
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

## 方法2: Supabase SQL Editorで直接SQLを実行

### ステップ1: データをSQL形式でエクスポート

Render DashboardのShell機能を使用：

```sql
-- 各テーブルのデータをINSERT文形式でエクスポート
-- 例: framesテーブル
SELECT 'INSERT INTO frames (id, display_name, category, metadata, created_at) VALUES (' ||
       quote_literal(id) || ', ' ||
       quote_literal(display_name) || ', ' ||
       COALESCE(quote_literal(category), 'NULL') || ', ' ||
       COALESCE(quote_literal(metadata::text), 'NULL') || ', ' ||
       quote_literal(created_at) || ');'
FROM frames;
```

### ステップ2: Supabase SQL Editorで実行

1. **Supabase Dashboard** → **SQL Editor**
2. **New query** をクリック
3. エクスポートしたINSERT文を貼り付け
4. **Run** をクリック

**注意**: この方法は小規模なデータ（数百行以下）に適しています。

---

## 方法3: Render環境でNode.jsスクリプトを実行（一時的なサービス）

### ステップ1: 一時的なWebサービスを作成

Render Dashboardで新しいWebサービスを作成：

1. **New** → **Web Service**
2. GitHubリポジトリを接続
3. 環境変数を設定：
   - `SOURCE_DATABASE_URL`: Render環境の接続文字列
   - `TARGET_DATABASE_URL`: Supabaseの接続文字列
4. **Start Command** を設定：
   ```bash
   node scripts/migrate-data-nodejs.js dump $SOURCE_DATABASE_URL "./dump" && node scripts/migrate-data-nodejs.js import $TARGET_DATABASE_URL "./dump"
   ```

### ステップ2: サービスを起動して実行

1. サービスをデプロイ
2. ログを確認して移行状況を監視
3. 完了後、サービスを削除

**注意**: この方法は一時的なサービスが必要で、コストがかかる可能性があります。

---

## 方法4: Supabase SQL EditorでCOPYコマンドを使用

### ステップ1: CSVファイルを準備

Render DashboardのShell機能でCSVファイルを生成し、ダウンロード。

### ステップ2: Supabase SQL EditorでCOPY

Supabase SQL Editorで以下を実行：

```sql
-- 例: framesテーブルにインポート
-- 注意: CSVファイルの内容を直接貼り付ける必要があります

-- 方法A: COPY FROM STDINを使用
COPY frames (id, display_name, category, metadata, created_at)
FROM STDIN
WITH (FORMAT CSV, HEADER);

-- ここにCSVファイルの内容を貼り付け
-- id,display_name,category,metadata,created_at
-- frame1,Frame 1,category1,"{}","2024-01-01 00:00:00"
-- ...

\.
```

**注意**: この方法は小規模なデータに適しています。

---

## 🎯 最も簡単な方法（推奨）

### オプションA: Supabase Table Editorを使用

1. **Render Dashboard** → データベース → **Shell** でCSVエクスポート
2. **Supabase Dashboard** → **Table Editor** → **Import data** でインポート

### オプションB: データが少ない場合

1. **Supabase SQL Editor**で直接INSERT文を実行
2. または、**Supabase Table Editor**で手動でデータを入力

---

## 📋 チェックリスト

### 方法1: Supabase Table Editorを使用

- [ ] Render DashboardでデータをCSV形式でエクスポート
- [ ] CSVファイルをダウンロード
- [ ] Supabase Table Editorで各テーブルにインポート（親→子の順）
- [ ] データ整合性を確認

### 方法2: Supabase SQL Editorを使用

- [ ] Render DashboardでデータをSQL形式でエクスポート
- [ ] Supabase SQL EditorでINSERT文を実行
- [ ] データ整合性を確認

---

## ⚠️ 注意事項

1. **インポート順序**
   - 必ず親テーブル→子テーブルの順でインポート
   - 外部キー制約を満たす順序で実行

2. **データ量**
   - 大規模なデータ（10万行以上）の場合は、Table Editorのインポート機能が適しています
   - 小規模なデータ（数百行以下）の場合は、SQL Editorで直接実行可能

3. **既存データ**
   - インポート前に既存データを削除する場合は、Supabase SQL Editorで以下を実行：
   ```sql
   TRUNCATE TABLE frames, sellers, orders, order_items, images, stripe_payments, qr_sessions, buyer_attributes, order_metadata, kids_achievements CASCADE;
   ```

---

## 🔗 関連ドキュメント

- [DATA_MIGRATION_NODEJS_STEP_BY_STEP.md](./DATA_MIGRATION_NODEJS_STEP_BY_STEP.md) - Node.jsスクリプトを使用する場合
- [SUPABASE_DATA_MIGRATION_GUIDE.md](./SUPABASE_DATA_MIGRATION_GUIDE.md) - 詳細ガイド

