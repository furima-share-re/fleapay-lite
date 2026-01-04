# Phase 1.8: PostgreSQLコマンドラインツールのインストール方法（Windows）

**作成日**: 2026-01-04  
**目的**: WindowsでPostgreSQLコマンドラインツール（pg_restore）をインストールする方法

---

## 🔍 問題

PostgreSQLインストーラーに「Command Line Tools」のオプションがない場合の対処方法です。

---

## ✅ 解決方法

### 方法1: PostgreSQLをインストール（推奨）⭐

**重要**: PostgreSQLをインストールすると、**コマンドラインツールも自動的にインストールされます**。「Command Line Tools」という明示的なオプションがなくても、`bin`フォルダにツールがインストールされます。

#### Step 1: PostgreSQLをダウンロード

1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/) にアクセス
2. **Download the installer** をクリック
3. **Windows x86-64** を選択
4. 最新バージョン（例: PostgreSQL 15.x または 16.x）をダウンロード

#### Step 2: インストール

1. **ダウンロードしたインストーラーを実行**

2. **インストールウィザードに従う**:
   - **コンポーネントの選択**画面で:
     - ✅ **PostgreSQL Server**: チェックを外してもOK（コマンドラインツールのみ必要な場合）
     - ✅ **pgAdmin 4**: オプション（GUIツール、不要な場合は外してもOK）
     - ✅ **Stack Builder**: オプション（不要な場合は外してもOK）
     - **重要**: 「Command Line Tools」というオプションが表示されなくても問題ありません。PostgreSQLをインストールすると、自動的に`bin`フォルダにコマンドラインツールがインストールされます。

3. **データディレクトリ**: デフォルトのままでOK

4. **パスワード設定**: スーパーユーザー（postgres）のパスワードを設定（**必ず保存してください**）
   - **注意**: このパスワードは後で使用する可能性があります

5. **ポート番号**: デフォルトの`5432`を使用

6. **ロケール設定**: `[DEFAULT]`または`Japanese, Japan`を選択

7. **インストールを完了**

**インストールパス**: 通常は `C:\Program Files\PostgreSQL\15\bin` または `C:\Program Files\PostgreSQL\16\bin`

#### Step 3: PowerShellを再起動

**重要**: インストール後、**必ずPowerShellを再起動してください**。
- 環境変数PATHの変更が反映されます
- 新しいコマンドが認識されます

#### Step 4: インストール確認

```powershell
# pg_restoreのバージョンを確認
pg_restore --version
```

**期待される出力**: `pg_restore (PostgreSQL) 15.x` または `pg_restore (PostgreSQL) 16.x`

**もしコマンドが見つからない場合**:

1. **インストールパスを確認**
   ```powershell
   # PostgreSQLのインストールパスを確認
   Get-ChildItem "C:\Program Files\PostgreSQL" -Directory
   ```
   - 通常: `C:\Program Files\PostgreSQL\15\bin` または `C:\Program Files\PostgreSQL\16\bin`
   - または: `C:\Program Files (x86)\PostgreSQL\15\bin`

2. **binフォルダ内にpg_restore.exeがあるか確認**
   ```powershell
   # 例: PostgreSQL 15の場合
   Test-Path "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe"
   ```

3. **PATHに手動で追加（一時的）**
   ```powershell
   # 現在のセッションのみ（PowerShellを閉じると消える）
   $env:Path += ";C:\Program Files\PostgreSQL\15\bin"
   
   # 確認
   pg_restore --version
   ```

4. **PATHに永続的に追加する場合**:
   - **Windows 10/11の場合**:
     1. Windowsキー + X → **システム** → **詳細情報**
     2. **システムの詳細設定** → **環境変数**
     3. **システム環境変数**の`Path`を選択 → **編集**
     4. **新規**をクリック → `C:\Program Files\PostgreSQL\15\bin`を追加
     5. **OK**をクリックして保存
   - **PowerShellを再起動**

---

### 方法2: ポータブル版を使用（サーバーをインストールしたくない場合）

**PostgreSQLのポータブル版や、コマンドラインツールのみを提供するパッケージを使用する方法です。**

#### Option A: Chocolateyを使用（推奨）

```powershell
# Chocolateyをインストール（まだの場合）
# https://chocolatey.org/install を参照

# PostgreSQLコマンドラインツールをインストール
choco install postgresql --params '/Password:yourpassword'
```

#### Option B: Scoopを使用

```powershell
# Scoopをインストール（まだの場合）
# https://scoop.sh/ を参照

# PostgreSQLコマンドラインツールをインストール
scoop install postgresql
```

---

### 方法3: Supabase CLIを使用（代替方法）⭐

**PostgreSQLクライアントツールをインストールせずに、Supabase CLIを使用する方法です。**

#### Step 1: Supabase CLIをインストール

```powershell
# npmを使用（Node.jsが必要）
npm install -g supabase
```

**または、直接ダウンロード**:
- [Supabase CLI Releases](https://github.com/supabase/cli/releases)
- Windows用のバイナリをダウンロード

#### Step 2: Supabase CLIでインポート

```powershell
# Supabaseにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref xxxxx

# バックアップをインポート
supabase db restore tmp/2026-01-03T15_42Z.dir.tar.gz
```

**注意**: Supabase CLIも内部的に`pg_restore`を使用するため、PostgreSQLクライアントツールが必要な場合があります。

---

### 方法4: Dockerを使用（上級者向け）

**Dockerを使用してPostgreSQLコマンドラインツールを実行する方法です。**

```powershell
# Docker Desktopがインストールされている必要があります

# pg_restoreを実行
docker run --rm -v ${PWD}/tmp:/data postgres:15 pg_restore --version
```

---

## 🔍 インストール確認

### pg_restoreがインストールされているか確認

```powershell
# バージョンを確認
pg_restore --version
```

**期待される出力**: `pg_restore (PostgreSQL) 15.x` または類似のバージョン情報

---

## 📋 推奨手順

### 最も簡単な方法: PostgreSQL完全版をインストール

1. **PostgreSQL公式サイトからダウンロード**
   - https://www.postgresql.org/download/windows/
   - 最新バージョンをダウンロード

2. **インストーラーを実行**
   - デフォルト設定でインストール
   - コマンドラインツールは自動的にインストールされます

3. **PowerShellを再起動**

4. **確認**
   ```powershell
   pg_restore --version
   ```

---

## ⚠️ 注意事項

### 1. PostgreSQL Serverのインストールについて

**PostgreSQL Serverをインストールしても問題ありません**:
- ローカルでPostgreSQLサーバーを起動する必要はありません
- コマンドラインツール（`pg_restore`、`pg_dump`など）だけを使用します
- サーバーを起動しなければ、リソースを消費しません

### 2. インストールパスの確認

**インストール後、PATHが正しく設定されているか確認してください**:

```powershell
# pg_restoreのパスを確認
where.exe pg_restore
```

**出力例**: `C:\Program Files\PostgreSQL\15\bin\pg_restore.exe`

### 3. PowerShellの再起動

**インストール後、必ずPowerShellを再起動してください**:
- 環境変数PATHの変更が反映されます
- 新しいコマンドが認識されます

---

## 🎯 次のステップ

pg_restoreがインストールできたら：

1. **Step 4: データ移行を実行**
   - `PHASE_1_8_STEP4_DATA_MIGRATION.md` を参照
   - `pg_restore`コマンドでインポート

2. **Step 5: 環境変数設定**
   - Render Dashboardで環境変数を更新

3. **Step 6: 動作確認**
   - 本番環境で動作確認

---

## 📞 トラブルシューティング

### 問題1: インストール後もpg_restoreが見つからない

**解決方法**:
1. PowerShellを再起動
2. PATHを確認（`where.exe pg_restore`）
3. 手動でPATHに追加

---

### 問題2: インストールパスがわからない

**解決方法**:
1. Windowsの検索で「PostgreSQL」を検索
2. インストールフォルダを確認
3. `bin`フォルダ内に`pg_restore.exe`があるか確認

---

### 問題3: インストールしたくない

**代替方法**:
- Supabase CLIを使用（ただし、内部的にpg_restoreが必要な場合がある）
- Dockerを使用（上級者向け）

---

**準備ができたら、上記の手順に従ってインストールしてください。**

