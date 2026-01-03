# Phase 1.8: Render Dashboardでバックアップを取得する方法

**作成日**: 2026-01-03  
**目的**: Render Dashboardのバックアップ機能を使用してデータベースをバックアップする方法

---

## ✅ Render DashboardにはExport機能（バックアップ機能）があります

Render DashboardのPostgreSQLデータベースサービスには、**Recovery**タブの中の**Export**セクションからバックアップを作成・ダウンロードする機能があります。

**参考**: [Render Postgres Recovery and Backups – Render Docs](https://render.com/docs/postgresql-backups)

### 重要な注意事項

⚠️ **FreeインスタンスタイプにはExport機能がありません**
- 有料のPostgreSQLデータベース（Hobby以上）でのみ利用可能
- Freeインスタンスの場合は、ローカル環境から`pg_dump`を使用する必要があります

### 特徴

- ✅ Exportファイルは**7日間保持**されます（ワークスペースプランに関係なく）
- ✅ 完全な論理バックアップ（スキーマ + データ）
- ✅ 複数のExportを作成できます
- ✅ Exportファイルは`.dir.tar.gz`形式（圧縮ディレクトリ）で提供されます
- ✅ 同時に1つのExportのみ作成可能（他のExportが進行中の場合は作成不可）

---

## 📋 ステップバイステップ手順

### Step 1: Render Dashboardにログイン

1. [Render Dashboard](https://dashboard.render.com) にログイン
2. 左メニューから **Databases** を選択
3. `fleapay-lite-db` データベースをクリック

---

### Step 2: Recoveryタブを開く

1. データベースの詳細ページが開きます
2. 左サイドバーの **MANAGE** セクションから **Recovery** をクリック

**注意**: 
- Render Dashboardでは、バックアップ機能は **Recovery** タブの中にあります
- **Backups** タブではなく、**Recovery** タブを探してください

---

### Step 3: Export（バックアップ）を作成

1. **Export** セクションを確認
   - 説明: "Create a complete logical backup to export your database. All database export files are retained for at least 7 days."
2. **Create export** ボタンをクリック
3. バックアップの作成が開始されます

**バックアップの作成には数分かかる場合があります。**

**注意**: 
- Exportファイルは**少なくとも7日間保持**されます
- 複数のExportを作成できます

---

### Step 4: Export（バックアップ）をダウンロード

1. Exportが完了したら（ステータスが **Completed** になるまで待つ）
2. Exportの一覧から、ダウンロードしたいExportを選択
3. **Download** リンクをクリック（`.dir.tar.gz`形式のファイル）
4. バックアップファイルがダウンロードされます

**注意**: 
- Exportファイルは**7日間保持**されます（ワークスペースプランに関係なく）
- Exportファイルは`.dir.tar.gz`形式（圧縮ディレクトリ）で提供されます
- ファイル名には作成日時が含まれます（例: `2025-02-03T19_21Z.dir.tar.gz`）
- 複数のExportを作成・ダウンロードできます

---

### Step 5: バックアップファイルを保存

1. ダウンロードしたファイルを安全な場所に保存
2. クラウドストレージ（Google Drive、OneDriveなど）にもバックアップを保存
3. ファイル名に日付を含める（例: `prod_backup_2026-01-03.sql`）

---

## 🔍 Recoveryタブが見つからない場合

### 確認事項

1. **左サイドバーを確認**
   - Render Dashboard → データベース → 左サイドバーの **MANAGE** セクション
   - **Recovery** を探してください（**Backups** ではありません）

2. **データベースのプランを確認**
   - Render Dashboard → データベース → **Settings** タブ
   - プランによっては、Export機能が有効になっていない可能性があります

3. **データベースの種類を確認**
   - PostgreSQLデータベースサービスの場合、通常はExport機能があります
   - 他の種類のデータベースの場合は、Export機能がない可能性があります

---

## 🔄 代替方法: Backupsタブがない場合

### 方法1: Render Shellを使用（推奨）

1. Render Dashboard → データベース → **Shell** タブを開く
2. 以下のコマンドを実行：

```bash
# バックアップを作成
pg_dump $DATABASE_URL > /tmp/backup.sql

# バックアップファイルを確認
ls -lh /tmp/backup.sql
```

**注意**: Render Shellから直接ファイルをダウンロードすることはできません。別の方法が必要です。

---

### 方法2: ローカル環境からpg_dumpを実行

1. PostgreSQLクライアントツールをインストール
2. Render Dashboard → データベース → **Info** タブから接続情報を取得
3. ローカル環境から`pg_dump`を実行

```powershell
# PowerShellで実行
$DATABASE_URL = "postgres://user:password@host:5432/database"
pg_dump $DATABASE_URL -f prod_backup.sql
```

---

### 方法3: Renderの自動バックアップを確認

1. Render Dashboard → データベース → **Settings** タブ
2. **Backups** セクションを確認
3. 自動バックアップが有効になっている場合、既存のバックアップが表示される可能性があります

---

## 📊 バックアップファイルの形式

Render DashboardからダウンロードしたExportファイルは、**`.dir.tar.gz`形式**（圧縮ディレクトリ）です。

**ファイル形式の詳細**:
- **`.dir.tar.gz`形式**: PostgreSQLのカスタム形式を圧縮したディレクトリ
- ファイル名には作成日時が含まれます（例: `2025-02-03T19_21Z.dir.tar.gz`）

**Supabaseへのインポート方法**:
1. `.dir.tar.gz`ファイルを展開（`tar -zxvf`コマンド）
2. `pg_restore`コマンドを使用してSupabaseにインポート

**参考**: [Render Postgres Recovery and Backups – Render Docs](https://render.com/docs/postgresql-backups)

---

## 🔄 Supabaseへのインポート方法

### 方法A: pg_restoreを使用（推奨）

RenderのExportファイル（`.dir.tar.gz`形式）をSupabaseにインポートする方法：

**参考**: [Render Postgres Recovery and Backups – Render Docs](https://render.com/docs/postgresql-backups)

1. **Exportファイルを展開**
   ```bash
   # PowerShell
   tar -zxvf 2025-02-03T19_21Z.dir.tar.gz
   
   # Git Bash / WSL
   tar -zxvf 2025-02-03T19_21Z.dir.tar.gz
   ```

2. **Supabaseの接続情報を取得**
   - Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI** をコピー

3. **pg_restoreでインポート**
   ```bash
   # PowerShell
   $SUPABASE_URL = "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
   pg_restore --dbname=$SUPABASE_URL --verbose --clean --no-owner --no-privileges .
   
   # Git Bash / WSL
   export SUPABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
   pg_restore --dbname="$SUPABASE_URL" --verbose --clean --no-owner --no-privileges .
   ```

**注意**: 
- `pg_restore`コマンドにはPostgreSQLクライアントツールが必要です
- `--clean`フラグは既存のオブジェクトを削除してから再作成します
- `--no-owner`と`--no-privileges`フラグで、所有者と権限の問題を回避します

---

### 方法B: Supabase SQL Editorで直接インポート（小規模なデータの場合）

1. `.dir.tar.gz`ファイルを展開
2. 展開されたディレクトリ内のSQLファイルを確認
3. Supabase SQL Editorで実行

**注意**: この方法は小規模なデータに適しています。大規模なデータの場合は`pg_restore`を使用してください。

---

## ⚠️ 注意事項

### 1. FreeインスタンスタイプにはExport機能がありません

- **有料のPostgreSQLデータベース（Hobby以上）でのみ利用可能**
- Freeインスタンスの場合は、ローカル環境から`pg_dump`を使用する必要があります
- または、インスタンスタイプをアップグレードしてください

### 2. 同時に1つのExportのみ作成可能

- 他のExportが進行中の場合は、新しいExportを作成できません
- 既存のExportが完了するまで待つ必要があります

### 3. バックアップファイルのサイズ

- データ量が多い場合、バックアップファイルが大きくなる可能性があります
- ダウンロードに時間がかかる場合があります
- ファイルサイズを確認してからダウンロードしてください

### 4. バックアップの保持期間

- Exportファイルは**7日間保持**されます（ワークスペースプランに関係なく）
- 重要なバックアップはローカルとクラウドストレージに保存してください

### 5. スキーマとデータの分離

- Render DashboardのExportにはスキーマとデータの両方が含まれます
- スキーマのみが必要な場合は、`.ai/history/sql/supabase_schema.sql`を使用してください

### 6. Point-in-Time Recovery (PITR)との違い

- **Export（Logical Backup）**: 手動で作成する論理バックアップ、7日間保持
- **PITR**: Renderが自動的に作成するバックアップ、過去3-7日間の任意の時点に復元可能
- データ損失が発生した場合、PITRの方が最新のデータを復元できる可能性が高いです

---

## 🎯 まとめ

**Render DashboardにはExport機能（バックアップ機能）があります！**

**手順**:
1. Render Dashboard → Databases → `fleapay-prod-db` → 左サイドバーの **Recovery** タブ
2. **Export** セクションで **Create export** をクリック
3. Exportが完了したら **Download** をクリック
4. バックアップファイルを保存

**特徴**:
- ✅ Exportファイルは**少なくとも7日間保持**されます
- ✅ 複数のExportを作成できます
- ✅ 完全な論理バックアップ（スキーマ + データ）

**所要時間**: 5-15分（データ量による）

**もしRecoveryタブが見つからない場合**: 上記の「代替方法」を参照してください。

