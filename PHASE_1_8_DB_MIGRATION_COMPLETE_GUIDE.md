# Phase 1.8: 本番環境DB移行 完全ガイド

**作成日**: 2026-01-04  
**状態**: ⏳ **準備中**  
**前提条件**: Phase 2（Next.js移行）完了、Phase 3.1（Helicone導入）完了

**参考**: [Render Postgres Recovery and Backups – Render Docs](https://render.com/docs/postgresql-backups)

---

## 📋 目次

1. [移行前の準備](#移行前の準備)
2. [Step 1: 本番環境Supabaseプロジェクト作成](#step-1-本番環境supabaseプロジェクト作成)
3. [Step 2: データバックアップ取得](#step-2-データバックアップ取得)
4. [Step 3: Supabaseへのスキーマ移行](#step-3-supabaseへのスキーマ移行)
5. [Step 4: Supabaseへのデータ移行](#step-4-supabaseへのデータ移行)
6. [Step 5: 本番環境の環境変数設定](#step-5-本番環境の環境変数設定)
7. [Step 6: 動作確認](#step-6-動作確認)
8. [ロールバック手順](#ロールバック手順)
9. [トラブルシューティング](#トラブルシューティング)

---

## 📋 移行前の準備

### チェックリスト

- [ ] **本番環境の情報を確認**
  - Renderサービス名: `fleapay-lite-web`
  - 現在のデータベース: Render PostgreSQL（`fleapay-prod-db`）
  - 本番環境URL: `https://app.fleapay.jp`

- [ ] **本番環境のデータ量確認**
  - テーブル数
  - レコード数（主要テーブル）
  - データサイズ

- [ ] **メンテナンス時間の確保**
  - 推奨: **1日（8時間）**を確保
  - 最適ケース: 約4時間
  - 通常ケース: 約7-8時間
  - 最悪ケース: 約10-12時間

- [ ] **必要なツールの準備**
  - PostgreSQLクライアントツール（`pg_restore`が必要な場合）
  - ブラウザ（Supabase Dashboard、Render Dashboard）
  - テキストエディタ

---

## Step 1: 本番環境Supabaseプロジェクト作成

**所要時間**: 15-30分

### 1.1 Supabase Dashboardにアクセス

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. **New Project** をクリック

### 1.2 プロジェクト設定

- **プロジェクト名**: `fleapay-lite-prod`（または適切な名前）
- **データベースパスワード**: 強力なパスワードを設定（**必ず保存**）
- **リージョン**: 日本（Tokyo）またはシンガポール（Singapore）を推奨
- **プラン**: 本番環境に応じたプランを選択（Pro推奨）

### 1.3 接続情報を取得

プロジェクト作成後、以下の情報を取得：

1. **Database URL（Connection Pooling）**
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

2. **Direct Connection URL**
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```

3. **API URL**
   ```
   https://[PROJECT_REF].supabase.co
   ```

4. **API Keys**
   - `anon` key
   - `service_role` key

**取得方法**:
- Supabase Dashboard → **Settings** → **Database** → **Connection string**
- Supabase Dashboard → **Settings** → **API** → **Project API keys**

### 1.4 接続情報を安全に保存

- パスワードマネージャーに保存
- **Gitにコミットしない**
- 次のステップで使用します

---

## Step 2: データバックアップ取得

**所要時間**: 5分-1時間（データ量による）

### 方法A: Render Dashboardから直接Export（推奨）⭐

**前提条件**: 有料のPostgreSQLデータベース（Hobby以上）が必要です

#### 2.1 Render Dashboardにログイン

1. [Render Dashboard](https://dashboard.render.com) にログイン
2. 左メニューから **Databases** を選択
3. `fleapay-prod-db` データベースをクリック

#### 2.2 Recoveryタブを開く

1. 左サイドバーの **MANAGE** セクションから **Recovery** をクリック
2. **Export** セクションを確認

#### 2.3 Export（バックアップ）を作成

1. **Create export** ボタンをクリック
2. Exportの作成が開始されます
3. Exportが完了するまで待つ（数分かかる場合があります）

**注意**: 
- Exportファイルは**7日間保持**されます
- 同時に1つのExportのみ作成可能

#### 2.4 Export（バックアップ）をダウンロード

1. Exportが完了したら（ステータスが **Completed** になるまで待つ）
2. Exportの一覧から、ダウンロードしたいExportを選択
3. **Download** リンクをクリック
4. バックアップファイル（`.dir.tar.gz`形式）がダウンロードされます

**ファイル名の例**: `2025-02-03T19_21Z.dir.tar.gz`

#### 2.5 バックアップファイルを保存

1. ダウンロードしたファイルを安全な場所に保存
2. クラウドストレージ（Google Drive、OneDriveなど）にもバックアップを保存
3. ファイル名に日付を含める（例: `prod_backup_2026-01-04.dir.tar.gz`）

---

### 方法B: ターミナルで`pg_dump`コマンドを実行

**前提条件**: PostgreSQLクライアントツールがインストールされている必要があります

#### 2.1 Render Dashboardで接続情報を取得

1. Render Dashboardにログイン
2. `fleapay-prod-db` データベースを選択
3. **Info** タブを開く
4. **Internal Database URL** または **External Database URL** をコピー

#### 2.2 コマンドを実行してバックアップを取得

**PowerShellで実行**:
```powershell
# 接続文字列を使用（推奨）
$DATABASE_URL = "postgres://user:password@host:5432/database"
pg_dump $DATABASE_URL -f prod_backup.sql
```

**実際の例**:
```powershell
# Render PostgreSQLからバックアップを取得
$DATABASE_URL = "postgres://fleapay_db_user:password@dpg-xxxxx-a.render.com:5432/fleapay_db"
pg_dump $DATABASE_URL -f prod_backup.sql
```

**Bash / Git Bashで実行**:
```bash
# 個別パラメータを使用
pg_dump -h dpg-xxxxx-a.render.com -U fleapay_db_user -d fleapay_db -f prod_backup.sql
```

#### 2.3 バックアップファイルを保存

1. `prod_backup.sql` ファイルが生成されます
2. このファイルを安全な場所に保存（ローカル + クラウドストレージ）

**注意**: `pg_dump`コマンドが見つからない場合は、方法Aを使用してください。

---

## Step 3: Supabaseへのスキーマ移行

**所要時間**: 15-30分（エラーがない場合）

### 3.1 Supabase SQL Editorを開く

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. 本番環境プロジェクト（`fleapay-lite-prod`）を選択
3. 左メニューから **SQL Editor** を開く
4. **New query** をクリック

**画面の見方**:
- 左側にクエリ履歴が表示されます
- 中央にSQLエディタが表示されます
- 右上に **Run** ボタンがあります

---

### 3.2 スキーマSQLファイルを開く

1. **プロジェクトルートでスキーマファイルを開く**
   - ファイルパス: `.ai/history/sql/supabase_schema.sql`
   - テキストエディタ（VS Code、メモ帳など）で開く

2. **ファイルの内容を確認**
   - 11個のテーブル定義が含まれています
   - インデックス定義も含まれています
   - 外部キー制約も含まれています

**スキーマファイルの内容**:
- `frames` テーブル
- `sellers` テーブル
- `orders` テーブル（外部キー: `frames`）
- `stripe_payments` テーブル
- `order_items` テーブル（外部キー: `orders`）
- `images` テーブル（外部キー: `orders`）
- `qr_sessions` テーブル（外部キー: `orders`）
- `buyer_attributes` テーブル（外部キー: `orders`）
- `order_metadata` テーブル（外部キー: `orders`）
- `kids_achievements` テーブル
- `seller_subscriptions` テーブル

---

### 3.3 スキーマSQLをコピー＆ペースト

1. **スキーマファイルの内容を全て選択**
   - `Ctrl + A`（Windows）または `Cmd + A`（Mac）
   - または、マウスでドラッグして全て選択

2. **コピー**
   - `Ctrl + C`（Windows）または `Cmd + C`（Mac）

3. **Supabase SQL Editorにペースト**
   - SQL Editorの中央のテキストエリアをクリック
   - `Ctrl + V`（Windows）または `Cmd + V`（Mac）
   - ファイルの内容が全て貼り付けられます

**注意**: 
- 検証環境と同じスキーマを使用します
- ファイルの内容は約213行です
- 全てのテーブル定義を一度に実行できます

---

### 3.4 SQLを実行

1. **Run** ボタンをクリック
   - SQL Editorの右上にある **Run** ボタンをクリック
   - または、`Ctrl + Enter`（Windows）または `Cmd + Enter`（Mac）

2. **実行結果を確認**
   - 画面下部に実行結果が表示されます
   - 成功した場合: "Success. No rows returned" または "Success. X rows returned" と表示されます
   - エラーの場合: エラーメッセージが表示されます

**実行時間**: 通常、数秒から数十秒で完了します

---

### 3.5 エラーが発生した場合の対処

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

### 3.6 テーブル作成の確認

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

### 3.7 テーブル構造の確認（オプション）

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

### 3.8 インデックスの確認（オプション）

インデックスが正しく作成されたか確認する場合：

```sql
-- ordersテーブルのインデックス確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders';
```

**実行方法**:
1. SQL Editorで上記のSQLを入力
2. **Run** ボタンをクリック
3. インデックス名と定義を確認

**期待されるインデックス（ordersテーブル）**:
- `orders_seller_orderno_unique` (UNIQUE)
- `orders_seller_status_idx`
- `orders_created_idx`

---

## ✅ Step 3 完了チェックリスト

- [ ] Supabase SQL Editorを開いた
- [ ] スキーマSQLファイル（`.ai/history/sql/supabase_schema.sql`）を開いた
- [ ] ファイルの内容を全てコピーした
- [ ] SQL Editorにペーストした
- [ ] **Run** ボタンをクリックして実行した
- [ ] エラーが発生しなかった（またはエラーを修正した）
- [ ] テーブル一覧を確認して、11個のテーブルが全て表示された
- [ ] テーブル名が正しいことを確認した

**次のステップ**: Step 4（データ移行）に進みます。

---

## Step 4: Supabaseへのデータ移行

**所要時間**: 1-3時間（データ量による）

### 方法A: pg_restoreを使用（推奨・`.dir.tar.gz`形式の場合）

#### 4.1 Exportファイルを展開

```bash
# PowerShell
tar -zxvf 2025-02-03T19_21Z.dir.tar.gz

# Git Bash / WSL
tar -zxvf 2025-02-03T19_21Z.dir.tar.gz
```

#### 4.2 Supabaseの接続情報を取得

1. Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI** をコピー
2. 形式: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`

#### 4.3 pg_restoreでインポート

**PowerShellで実行**:
```powershell
# 接続文字列を設定
$SUPABASE_URL = "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"

# 展開したディレクトリに移動
cd 2025-02-03T19_21Z

# pg_restoreでインポート
pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
```

**Git Bash / WSLで実行**:
```bash
# 接続文字列を設定
export SUPABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"

# 展開したディレクトリに移動
cd 2025-02-03T19_21Z

# pg_restoreでインポート
pg_restore --dbname="$SUPABASE_URL" --verbose --clean --no-owner --no-privileges .
```

**注意**: 
- `pg_restore`コマンドにはPostgreSQLクライアントツールが必要です
- `--clean`フラグは既存のオブジェクトを削除してから再作成します
- `--no-owner`と`--no-privileges`フラグで、所有者と権限の問題を回避します

---

### 方法B: Supabase SQL Editorで直接インポート（`.sql`形式の場合）

#### 4.1 バックアップファイルを開く

1. `prod_backup.sql` ファイルをテキストエディタで開く
2. データ部分のみを抽出（`INSERT`文や`COPY`文）

#### 4.2 Supabase SQL Editorで実行

1. Supabase SQL Editorを開く
2. データ部分をコピー＆ペースト
3. **Run** ボタンをクリック

**注意**: 
- データ量が多い場合、SQL Editorのタイムアウトが発生する可能性があります
- その場合は、方法A（`pg_restore`）を使用してください

---

### 4.4 データ整合性の確認

SQL Editorで以下を実行：

```sql
-- レコード数の確認
SELECT 
  'sellers' as table_name, COUNT(*) as count FROM sellers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'stripe_payments', COUNT(*) FROM stripe_payments
UNION ALL
SELECT 'order_metadata', COUNT(*) FROM order_metadata
UNION ALL
SELECT 'buyer_attributes', COUNT(*) FROM buyer_attributes;
```

**期待される結果**: 元のデータベースと同じレコード数が表示されること

---

## Step 5: 本番環境の環境変数設定

**所要時間**: 15-30分

### 5.1 Render Dashboardで本番環境のサービスを開く

1. [Render Dashboard](https://dashboard.render.com) にログイン
2. `fleapay-lite-web` サービスを選択

### 5.2 Environment Variablesを更新

**Settings** → **Environment** タブで、以下の環境変数を更新：

```
DATABASE_URL=<Supabase Connection Pooling URL>
NEXT_PUBLIC_SUPABASE_URL=<Supabase API URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>
```

**例**:
```
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5.3 変更を保存してデプロイ

1. **Save Changes** をクリック
2. 自動的に再デプロイが開始されます
3. デプロイが完了するまで待つ（数分かかる場合があります）

**注意**: Prisma Clientの再生成は不要です。`package.json`の`postinstall`スクリプトにより、デプロイ時に自動的に`prisma generate`が実行されます。

---

## Step 6: 動作確認

**所要時間**: 1-2時間

### 6.1 APIエンドポイント確認

1. **データベース接続確認**
   ```
   https://app.fleapay.jp/api/ping
   ```
   - レスポンスに `"prisma": "connected"` が含まれることを確認

2. **売上サマリー取得**
   ```
   https://app.fleapay.jp/api/seller/summary?s=seller-test01
   ```
   - データが正しく表示されることを確認

3. **データベース状態確認**
   ```
   https://app.fleapay.jp/api/debug/db-status
   ```
   - テーブル状態とレコード数が正しいことを確認

### 6.2 決済機能確認

1. **現金決済の動作確認**
   - 現金決済フローを実行
   - データが正しく保存されることを確認

2. **QR決済（Stripe）の動作確認**
   - QR決済フローを実行
   - Stripe決済が正常に完了することを確認

### 6.3 既存ユーザーのデータ確認

1. **セラーダッシュボードの表示確認**
   ```
   https://app.fleapay.jp/seller-dashboard.html?s=seller-test01
   ```
   - 取引データが正しく表示されることを確認

2. **注文履歴の表示確認**
   - 注文履歴が正しく表示されることを確認

### 6.4 データ整合性確認

1. **レコード数の確認**
   - 元のデータベースと同じレコード数であることを確認

2. **外部キー制約の確認**
   - 外部キー制約が正しく機能していることを確認

---

## 🔄 ロールバック手順

問題が発生した場合のロールバック手順：

### 1. Render Dashboardで環境変数を元に戻す

1. Render Dashboard → `fleapay-lite-web` サービスを選択
2. **Settings** → **Environment** タブを開く
3. `DATABASE_URL`を元のRender PostgreSQLに戻す
4. **Save Changes** をクリック

### 2. 再デプロイ

1. 環境変数を保存すると、自動的に再デプロイが開始されます
2. デプロイが完了するまで待つ

### 3. 動作確認

1. 元のデータベースに接続されていることを確認
2. APIエンドポイントが正常に動作することを確認

**ロールバック時間**: 数分（環境変数の変更のみ）

---

## 🔍 トラブルシューティング

### 問題1: Export機能が利用できない

**原因**: FreeインスタンスタイプにはExport機能がありません

**解決方法**:
- インスタンスタイプをアップグレードする
- または、方法B（`pg_dump`）を使用する

---

### 問題2: pg_restoreコマンドが見つからない

**原因**: PostgreSQLクライアントツールがインストールされていません

**解決方法**:
1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/) からインストーラーをダウンロード
2. インストール時に **Command Line Tools** を選択
3. インストール後、PowerShellを再起動
4. 確認: `pg_restore --version`

---

### 問題3: データ移行でエラーが発生する

**原因**: 外部キー制約エラーやデータ整合性エラー

**解決方法**:
1. エラーメッセージを確認
2. 親テーブル→子テーブルの順でインポートする
3. 外部キー制約を一時的に無効化してインポート（推奨しない）

---

### 問題4: 環境変数設定後、アプリケーションが起動しない

**原因**: 環境変数の設定ミスや接続エラー

**解決方法**:
1. Render Dashboardのログを確認
2. 環境変数が正しく設定されているか確認
3. Supabaseの接続情報が正しいか確認
4. 必要に応じてロールバック

---

## 📊 工数見積もりサマリー

| 作業項目 | 最適 | 通常 | 最悪 |
|---------|------|------|------|
| Step 1: Supabaseプロジェクト作成 | 15分 | 20分 | 30分 |
| Step 2: データバックアップ取得 | 5分 | 45分 | 1時間 |
| Step 3: スキーマ移行 | 15分 | 30分 | 1時間 |
| Step 4: データ移行 | 1時間 | 2時間 | 3時間 |
| Step 5: 環境変数設定 | 15分 | 20分 | 30分 |
| Step 6: 動作確認 | 1時間 | 1.5時間 | 2時間 |
| トラブルシューティング | 0時間 | 1時間 | 2時間 |
| **合計** | **約3.5時間** | **約6.5時間** | **約9.5時間** |

**推奨**: **1日（8時間）**を確保して、余裕を持って実施することを推奨します。

---

## ✅ チェックリスト

### 移行前
- [ ] 本番環境の情報を確認
- [ ] 本番環境のデータ量確認
- [ ] メンテナンス時間の確保
- [ ] 必要なツールの準備

### 移行中
- [ ] Step 1: Supabaseプロジェクト作成完了
- [ ] Step 2: データバックアップ取得完了
- [ ] Step 3: スキーマ移行完了
- [ ] Step 4: データ移行完了
- [ ] Step 5: 環境変数設定完了
- [ ] Step 6: 動作確認完了

### 移行後
- [ ] 本番環境のデータが正しく移行されている
- [ ] APIエンドポイントが正常に動作している
- [ ] 決済機能が正常に動作している
- [ ] 既存ユーザーのデータが正しく表示されている
- [ ] データ整合性が保たれている
- [ ] パフォーマンスに問題がない

---

## 🎯 次のステップ

Phase 1.8完了後：

1. **Phase 1.7: RLS実装**（検証環境で先に実施）
   - RLS有効化・ポリシー作成
   - 動作確認・テスト

2. **Phase 1.7: RLS実装**（本番環境に適用）
   - 検証環境で動作確認後、本番環境に適用

---

**準備完了後、移行を開始してください。**

