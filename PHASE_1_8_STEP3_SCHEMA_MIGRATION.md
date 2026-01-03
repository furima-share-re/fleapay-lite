# Phase 1.8: Step 3 - Supabaseへのスキーマ移行 実行手順

**実行日**: 2026-01-04  
**所要時間**: 15-30分

---

## 📋 事前準備

- [ ] Supabaseプロジェクトが作成済み（`fleapay-lite-prod`）
- [ ] Supabase Dashboardにログインできる
- [ ] スキーマSQLファイル（`.ai/history/sql/supabase_schema.sql`）が存在する

---

## 🚀 実行手順

### Step 1: Supabase SQL Editorを開く

1. **Supabase Dashboardにログイン**
   - [Supabase Dashboard](https://app.supabase.com) にアクセス
   - ログイン

2. **本番環境プロジェクトを選択**
   - プロジェクト一覧から `fleapay-lite-prod` を選択
   - （まだ作成していない場合は、先にプロジェクトを作成してください）

3. **SQL Editorを開く**
   - 左メニューから **SQL Editor** をクリック
   - **New query** ボタンをクリック

**画面の見方**:
- 左側: クエリ履歴
- 中央: SQLエディタ（ここにSQLを入力）
- 右上: **Run** ボタン

---

### Step 2: スキーマSQLファイルを開く

1. **プロジェクトルートでスキーマファイルを開く**
   - ファイルパス: `.ai/history/sql/supabase_schema.sql`
   - VS Code、メモ帳、または任意のテキストエディタで開く

2. **ファイルの内容を確認**
   - 約213行のSQLが含まれています
   - 11個のテーブル定義が含まれています

---

### Step 3: スキーマSQLをコピー＆ペースト

1. **ファイルの内容を全て選択**
   - `Ctrl + A`（Windows）または `Cmd + A`（Mac）
   - または、マウスでドラッグして全て選択

2. **コピー**
   - `Ctrl + C`（Windows）または `Cmd + C`（Mac）

3. **Supabase SQL Editorにペースト**
   - SQL Editorの中央のテキストエリアをクリック
   - `Ctrl + V`（Windows）または `Cmd + V`（Mac）
   - ファイルの内容が全て貼り付けられます

**確認ポイント**:
- ✅ SQLが正しく貼り付けられているか確認
- ✅ 最初の行が `-- Supabase用スキーマ定義` で始まっているか確認
- ✅ 最後の行まで含まれているか確認

---

### Step 4: SQLを実行

1. **Run** ボタンをクリック
   - SQL Editorの右上にある **Run** ボタンをクリック
   - または、`Ctrl + Enter`（Windows）または `Cmd + Enter`（Mac）

2. **実行結果を確認**
   - 画面下部に実行結果が表示されます
   - 成功した場合: "Success. No rows returned" または "Success. X rows returned" と表示されます
   - エラーの場合: エラーメッセージが表示されます

**実行時間**: 通常、数秒から数十秒で完了します

---

### Step 5: エラーが発生した場合の対処

**エラーメッセージの例**:
```
ERROR: relation "frames" already exists
```

**対処方法**:
1. **エラーメッセージを確認**
   - どのテーブルでエラーが発生したか確認
   - エラーの原因を確認

2. **該当行を修正または削除**
   - テーブルが既に存在する場合: `CREATE TABLE IF NOT EXISTS` を使用しているため、通常は問題ありません
   - 他のエラーの場合: エラーメッセージに従って修正

3. **再度実行**
   - 修正後、再度 **Run** ボタンをクリック

**よくあるエラー**:
- `relation "xxx" already exists`: テーブルが既に存在する（`IF NOT EXISTS`により無視される）
- `syntax error`: SQLの構文エラー（該当行を確認）
- `permission denied`: 権限エラー（通常は発生しない）

---

### Step 6: テーブル作成の確認

SQL Editorで以下を実行して、テーブルが正しく作成されたか確認します：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**実行方法**:
1. SQL Editorで上記のSQLを入力（またはコピー＆ペースト）
2. **Run** ボタンをクリック
3. 結果を確認

**期待される結果（11個のテーブル）**:
```
buyer_attributes
frames
images
kids_achievements
order_items
order_metadata
orders
qr_sessions
seller_subscriptions
sellers
stripe_payments
```

**確認ポイント**:
- ✅ 11個のテーブルが全て表示されること
- ✅ テーブル名が正しいこと
- ✅ スペルミスがないこと

---

### Step 7: テーブル構造の確認（オプション）

主要テーブルの構造を確認する場合：

```sql
-- sellersテーブルの構造確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sellers'
ORDER BY ordinal_position;
```

**実行方法**:
1. SQL Editorで上記のSQLを入力
2. **Run** ボタンをクリック
3. カラム名、データ型、NULL許可を確認

**期待されるカラム（sellersテーブル）**:
- `id` (text, NOT NULL)
- `display_name` (text, NOT NULL)
- `shop_name` (text, NULL)
- `stripe_account_id` (text, NULL)
- `email` (text, NULL)
- `password_hash` (text, NULL)
- `created_at` (timestamptz, NULL)
- `updated_at` (timestamptz, NULL)

---

## ✅ 完了チェックリスト

- [ ] Supabase SQL Editorを開いた
- [ ] スキーマSQLファイル（`.ai/history/sql/supabase_schema.sql`）を開いた
- [ ] ファイルの内容を全てコピーした
- [ ] SQL Editorにペーストした
- [ ] **Run** ボタンをクリックして実行した
- [ ] エラーが発生しなかった（またはエラーを修正した）
- [ ] テーブル一覧を確認して、11個のテーブルが全て表示された
- [ ] テーブル名が正しいことを確認した

---

## 🎯 次のステップ

Step 3が完了したら、**Step 4: Supabaseへのデータ移行**に進みます。

**Step 4の準備**:
- [ ] Exportファイル（`tmp/2026-01-03T15_42Z.dir.tar.gz`）が準備済み
- [ ] PostgreSQLクライアントツール（`pg_restore`）がインストール済み
- [ ] Supabaseの接続情報を取得済み

---

## 📋 トラブルシューティング

### 問題1: Supabaseプロジェクトが見つからない

**解決方法**:
1. Supabase Dashboardでプロジェクトを作成
2. プロジェクト名: `fleapay-lite-prod`
3. データベースパスワードを設定（必ず保存）

---

### 問題2: SQL Editorが開けない

**解決方法**:
1. ブラウザをリロード
2. 別のブラウザで試す
3. Supabase Dashboardのサポートに問い合わせ

---

### 問題3: SQLの実行が失敗する

**解決方法**:
1. エラーメッセージを確認
2. 該当行を修正
3. テーブル定義ごとに分割して実行

---

**準備ができたら、上記の手順に従って実行してください。**

