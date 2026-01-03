# Phase 1.8: 本番環境DB移行 - 手動作業手順

**作成日**: 2026-01-03  
**目的**: 人が実際に行う作業を明確に説明

---

## 📋 作業の全体像

本番環境DB移行は、**ほぼ全ての作業が手動**です。自動化できる部分は限られています。

---

## 🔧 Step 2: データバックアップ取得（人がやること）

### 作業内容

**方法A: Render Dashboardから直接バックアップを取得（推奨・最も簡単）** ⭐

**前提条件**: 有料のPostgreSQLデータベース（Hobby以上）が必要です

**ローカル環境にPostgreSQLクライアントツールをインストールする必要がありません！**

**参考**: [Render Postgres Recovery and Backups – Render Docs](https://render.com/docs/postgresql-backups)

1. **Render Dashboardにログイン**
   - [Render Dashboard](https://dashboard.render.com) にログイン
   - 左メニューから **Databases** を選択
   - `fleapay-lite-db` データベースをクリック

2. **Recoveryタブを開く**
   - 左サイドバーの **MANAGE** セクションから **Recovery** をクリック
   - **Export** セクションを確認

3. **Export（バックアップ）を作成**
   - **Create export** ボタンをクリック
   - Exportの作成が開始されます
   - Exportが完了するまで待つ（数分かかる場合があります）
   - **注意**: Exportファイルは**少なくとも7日間保持**されます

4. **Export（バックアップ）をダウンロード**
   - Exportが完了したら（ステータスが **Completed** になるまで待つ）
   - Exportの一覧から、ダウンロードしたいExportを選択
   - **Download** リンクをクリック
   - バックアップファイル（`.dir.tar.gz`形式）がダウンロードされます
   - **注意**: ファイル名には作成日時が含まれます（例: `2025-02-03T19_21Z.dir.tar.gz`）

4. **バックアップファイルを保存**
   - ダウンロードしたファイルを安全な場所に保存
   - クラウドストレージ（Google Drive、OneDriveなど）にもバックアップを保存
   - ファイル名に日付を含める（例: `prod_backup_2026-01-03.sql`）

**メリット**:
- ✅ ローカル環境にPostgreSQLクライアントツールをインストールする必要がない
- ✅ GUI操作で簡単
- ✅ データとスキーマの両方が含まれる
- ✅ 公式のバックアップ機能なので安全
- ✅ Exportファイルは7日間保持される

**注意事項**:
- ⚠️ **有料のPostgreSQLデータベース（Hobby以上）でのみ利用可能**
- ⚠️ Freeインスタンスの場合は、方法Bを使用してください
- ⚠️ 同時に1つのExportのみ作成可能

**所要時間**: **5-15分**（データ量による）

---

**方法B: ターミナルで`pg_dump`コマンドを実行**

**前提条件**: PostgreSQLクライアントツールがインストールされている必要があります

1. **Render Dashboardで接続情報を取得**
   - Render Dashboardにログイン
   - `fleapay-lite-db` データベースを選択
   - **Info** タブを開く
   - **Internal Database URL** または **External Database URL** をコピー

2. **コマンドを実行してバックアップを取得**

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
   
   **パスワード入力**: コマンド実行時にパスワードを求められます（接続文字列に含まれていない場合）

3. **バックアップファイルを保存**
   - `prod_backup.sql` ファイルが生成されます
   - このファイルを安全な場所に保存（ローカル + クラウドストレージ）

**注意**: `pg_dump`コマンドが見つからない場合は、方法Aを使用してください。

**所要時間**: **15-30分**（データ量による）

---

### 人がやること

**方法Aを使用する場合**:
- ✅ Render Dashboardで **Recovery** タブを開く
- ✅ **Export** セクションで **Create export** をクリック
- ✅ Exportをダウンロード
- ✅ バックアップファイルを保存

**方法Bを使用する場合**:
- ✅ Render Dashboardで接続情報をコピー
- ✅ ターミナルで`pg_dump`コマンドを実行
- ✅ パスワードを入力
- ✅ バックアップファイルを保存

---

## 🔧 Step 3: スキーマ移行（人がやること）

### 作業内容

1. **Supabase SQL Editorを開く**
   - Supabase Dashboardにログイン
   - 本番環境プロジェクト（`fleapay-lite-prod`）を選択
   - 左メニューから **SQL Editor** を開く
   - **New query** をクリック

2. **スキーマSQLをコピー＆ペースト**
   - `.ai/history/sql/supabase_schema.sql` ファイルを開く
   - ファイルの内容を全てコピー
   - Supabase SQL Editorにペースト

3. **SQLを実行**
   - **Run** ボタンをクリック
   - エラーがないか確認

4. **テーブル作成の確認**
   - SQL Editorで以下を実行：
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   - 11個のテーブルが表示されることを確認

### 人がやること

- ✅ Supabase DashboardでSQL Editorを開く
- ✅ スキーマSQLファイルを開いてコピー
- ✅ SQL Editorにペースト
- ✅ **Run** ボタンをクリック
- ✅ エラーがないか確認
- ✅ テーブル一覧を確認

### 所要時間

- **15-30分**（エラーがない場合）
- **30分-1時間**（エラー修正が必要な場合）

---

## 🔧 Step 4: データ移行（人がやること）

### 方法A: Supabase SQL Editorで直接インポート（推奨）

#### 作業内容

1. **バックアップファイルを開く**
   - `prod_backup.sql` ファイルをテキストエディタで開く
   - データ部分のみを抽出（`INSERT`文や`COPY`文）

2. **Supabase SQL Editorで実行**
   - Supabase SQL Editorを開く
   - データ部分をコピー＆ペースト
   - **Run** ボタンをクリック

3. **エラーが発生した場合**
   - エラーメッセージを確認
   - 該当行を修正または削除
   - 再度実行

#### 人がやること

- ✅ バックアップファイルを開く
- ✅ データ部分をコピー
- ✅ Supabase SQL Editorにペースト
- ✅ **Run** ボタンをクリック
- ✅ エラーがあれば修正

### 方法B: Supabase Table EditorでCSVインポート（小規模データ向け）

#### 作業内容

1. **データをCSV形式でエクスポート**
   - Render DashboardのShell機能を使用
   - または、`psql`で接続してCSVエクスポート

2. **Supabase Table Editorでインポート**
   - Supabase Dashboard → **Table Editor** を開く
   - 対象テーブルを選択
   - **Import data** ボタンをクリック
   - CSVファイルをアップロード
   - **Import** をクリック

#### 人がやること

- ✅ データをCSV形式でエクスポート
- ✅ Supabase Table Editorでテーブルを選択
- ✅ CSVファイルをアップロード
- ✅ **Import** ボタンをクリック

### 方法C: スクリプトを使用（中規模データ向け）

#### 作業内容

1. **スクリプトを実行**
   ```bash
   # PowerShell
   .\scripts\import-to-supabase.ps1 `
     -SupabaseDatabaseUrl "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" `
     -DataDir "./dump"
   ```

2. **進捗を確認**
   - スクリプトの出力を確認
   - エラーがないか確認

#### 人がやること

- ✅ スクリプトを実行
- ✅ 進捗を確認
- ✅ エラーがあれば対応

### 所要時間

- **1-3時間**（データ量による）
  - 小規模（< 10,000レコード）: 1時間
  - 中規模（10,000-100,000レコード）: 2時間
  - 大規模（> 100,000レコード）: 3時間以上

---

## 📊 作業の自動化レベル

| 作業項目 | 自動化レベル | 人がやること |
|---------|------------|------------|
| **データバックアップ取得** | 🔴 **手動** | `pg_dump`コマンドを実行 |
| **スキーマ移行** | 🔴 **手動** | SQL EditorでSQLを実行 |
| **データ移行** | 🟡 **半自動** | スクリプト実行 or SQL Editorで実行 |
| **環境変数設定** | 🔴 **手動** | Render Dashboardで設定 |
| **動作確認** | 🔴 **手動** | ブラウザで確認 |

---

## 🎯 推奨アプローチ

### 小規模データ（< 10,000レコード）の場合

1. **データバックアップ取得**: `pg_dump`コマンドを実行（15分）
2. **スキーマ移行**: SQL EditorでスキーマSQLを実行（15分）
3. **データ移行**: SQL EditorでデータSQLを実行（30分-1時間）

**合計**: **約1-1.5時間**

### 中規模データ（10,000-100,000レコード）の場合

1. **データバックアップ取得**: `pg_dump`コマンドを実行（30分）
2. **スキーマ移行**: SQL EditorでスキーマSQLを実行（15分）
3. **データ移行**: スクリプトを使用（1-2時間）

**合計**: **約2-3時間**

### 大規模データ（> 100,000レコード）の場合

1. **データバックアップ取得**: `pg_dump`コマンドを実行（1時間）
2. **スキーマ移行**: SQL EditorでスキーマSQLを実行（15分）
3. **データ移行**: スクリプトを使用 + バッチ処理（2-3時間）

**合計**: **約3-4時間**

---

## ⚠️ 注意事項

### 1. データバックアップ取得

- **`pg_dump`コマンドが必要**: PostgreSQLクライアントツールがインストールされている必要があります
- **パスワード入力**: コマンド実行時にパスワードを求められます
- **ネットワーク**: データ量が多い場合、ネットワーク速度が影響します

### 2. スキーマ移行

- **SQL Editorの使用**: Supabase DashboardのSQL Editorを使用します
- **エラー対応**: エラーが発生した場合、該当行を修正する必要があります
- **順序**: 外部キー制約を考慮して、正しい順序でテーブルを作成する必要があります

### 3. データ移行

- **データ量**: データ量が多い場合、時間がかかります
- **エラー対応**: 外部キー制約エラーが発生する場合があります
- **順序**: 親テーブル→子テーブルの順でインポートする必要があります

---

## 🛠️ 必要なツール

1. **PostgreSQLクライアントツール**
   - `pg_dump`: データバックアップ取得用
   - `psql`: データベース接続・クエリ実行用

2. **ブラウザ**
   - Supabase Dashboard（SQL Editor使用）
   - Render Dashboard（接続情報取得）

3. **テキストエディタ**
   - SQLファイルの編集用

---

## 📋 チェックリスト

### データバックアップ取得

- [ ] Render Dashboardで接続情報を取得
- [ ] `pg_dump`コマンドを実行
- [ ] バックアップファイルを保存

### スキーマ移行

- [ ] Supabase SQL Editorを開く
- [ ] スキーマSQLをコピー＆ペースト
- [ ] SQLを実行
- [ ] テーブル一覧を確認

### データ移行

- [ ] データ移行方法を選択（SQL Editor / Table Editor / スクリプト）
- [ ] データをインポート
- [ ] レコード数を確認
- [ ] データ整合性を確認

---

**結論**: データバックアップ取得、スキーマ移行、データ移行は**全て手動作業**です。自動化できる部分は限られており、人が実際にコマンドを実行したり、SQL EditorでSQLを実行したりする必要があります。

