# Phase 1.8: pg_dumpなしでデータバックアップを取得する方法

**作成日**: 2026-01-03  
**目的**: ローカル環境にPostgreSQLクライアントツールをインストールせずにデータバックアップを取得する方法

---

## 🎯 推奨方法: Render Dashboardから直接バックアップを取得

**最も簡単で確実な方法です。ローカル環境にPostgreSQLクライアントツールをインストールする必要がありません。**

---

## 📋 ステップバイステップ手順

### Step 1: Render Dashboardにログイン

1. [Render Dashboard](https://dashboard.render.com) にログイン
2. 左メニューから **Databases** を選択
3. `fleapay-lite-db` データベースをクリック

---

### Step 2: バックアップを作成

1. **Backups** タブを開く
2. **Create Backup** ボタンをクリック
3. バックアップ名を入力（オプション、例: `prod-backup-2026-01-03`）
4. **Create Backup** をクリック

**バックアップの作成には数分かかる場合があります。**

---

### Step 3: バックアップをダウンロード

1. バックアップが完了したら（ステータスが **Completed** になるまで待つ）
2. バックアップの行の右側にある **Download** ボタンをクリック
3. バックアップファイル（`.sql`形式または`.dump`形式）がダウンロードされます

---

### Step 4: バックアップファイルを保存

1. ダウンロードしたファイルを安全な場所に保存
2. クラウドストレージ（Google Drive、OneDriveなど）にもバックアップを保存
3. ファイル名に日付を含める（例: `prod_backup_2026-01-03.sql`）

---

## 📊 バックアップファイルの形式

Render Dashboardからダウンロードしたバックアップファイルは、通常以下のいずれかの形式です：

- **`.sql`形式**: SQLスクリプト形式（テキストファイル）
- **`.dump`形式**: PostgreSQLのカスタム形式（バイナリファイル）

**どちらの形式でも、Supabaseにインポートできます。**

---

## 🔄 Supabaseへのインポート方法

### 方法A: SQL Editorでインポート（`.sql`形式の場合）

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. 本番環境のSupabaseプロジェクトを選択
3. **SQL Editor** を開く
4. **New query** をクリック
5. ダウンロードした`.sql`ファイルを開いて内容をコピー
6. SQL Editorにペースト
7. **Run** をクリック

**注意**: エラーが発生する場合は、以下の行を削除またはコメントアウトしてください：
- `CREATE EXTENSION ...`
- `ALTER TABLE ... OWNER TO ...`
- `GRANT ...` / `REVOKE ...`

---

### 方法B: Supabase CLIでインポート（`.dump`形式の場合）

```bash
# Supabase CLIを使用してインポート
supabase db restore <backup_file.dump>
```

**注意**: Supabase CLIのインストールが必要です。

---

### 方法C: pg_restoreを使用（`.dump`形式の場合）

```powershell
# PostgreSQLクライアントツールが必要
pg_restore -h <SUPABASE_HOST> -U postgres -d postgres <backup_file.dump>
```

**注意**: この方法はPostgreSQLクライアントツールが必要です。

---

## ⚠️ 注意事項

### 1. バックアップファイルのサイズ

- データ量が多い場合、バックアップファイルが大きくなる可能性があります
- ダウンロードに時間がかかる場合があります
- ファイルサイズを確認してからダウンロードしてください

### 2. バックアップの保持期間

- Render Dashboardのバックアップは一定期間保持されます
- 重要なバックアップはローカルとクラウドストレージに保存してください

### 3. スキーマとデータの分離

- Render Dashboardのバックアップにはスキーマとデータの両方が含まれます
- スキーマのみが必要な場合は、`.ai/history/sql/supabase_schema.sql`を使用してください

---

## 🔍 トラブルシューティング

### 問題1: バックアップの作成に失敗する

**解決方法**:
- データベースが正常に動作しているか確認
- しばらく待ってから再度試す
- Render Dashboardのサポートに問い合わせる

---

### 問題2: ダウンロードしたファイルが開けない

**解決方法**:
- ファイル形式を確認（`.sql`または`.dump`）
- テキストエディタで開いてみる（`.sql`形式の場合）
- ファイルが破損していないか確認

---

### 問題3: Supabaseへのインポートでエラーが発生する

**解決方法**:
- SQL Editorでエラーメッセージを確認
- `CREATE EXTENSION`、`OWNER`、`GRANT/REVOKE`行を削除
- スキーマのみを先にインポートしてから、データをインポート

---

## 📝 次のステップ

バックアップを取得したら：

1. **Step 3: Supabaseへのスキーマ移行**（`.ai/history/sql/supabase_schema.sql`を使用）
2. **Step 4: Supabaseへのデータ移行**（バックアップファイルを使用）
3. **Step 5: 動作確認**

---

## 🎯 まとめ

**推奨方法**: Render Dashboardから直接バックアップを取得

**メリット**:
- ✅ ローカル環境にPostgreSQLクライアントツールをインストールする必要がない
- ✅ GUI操作で簡単
- ✅ データとスキーマの両方が含まれる
- ✅ 公式のバックアップ機能なので安全

**所要時間**: 5-15分（データ量による）

