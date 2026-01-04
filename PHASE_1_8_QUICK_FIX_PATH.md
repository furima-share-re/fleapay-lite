# Phase 1.8: pg_restoreをすぐに使えるようにする方法

**作成日**: 2026-01-04  
**状況**: PostgreSQL 18がインストール済み、PATHに追加が必要

---

## ✅ PostgreSQLのインストール確認

**PostgreSQL 18がインストールされています！**

- **インストールパス**: `C:\Program Files\PostgreSQL\18\bin`
- **pg_restore.exe**: `C:\Program Files\PostgreSQL\18\bin\pg_restore.exe`

---

## 🚀 すぐに使えるようにする方法

### 方法1: 現在のPowerShellセッションで一時的に追加（すぐに使える）

```powershell
# PATHに追加（現在のセッションのみ）
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# 確認
pg_restore --version
```

**期待される出力**: `pg_restore (PostgreSQL) 18.x`

**注意**: PowerShellを閉じると、この設定は消えます。

---

### 方法2: 永続的に追加（推奨）

**Windows 10/11の場合**:

1. **Windowsキー + X** → **システム** → **詳細情報**
2. **システムの詳細設定** → **環境変数**
3. **システム環境変数**の`Path`を選択 → **編集**
4. **新規**をクリック
5. 以下のパスを追加:
   ```
   C:\Program Files\PostgreSQL\18\bin
   ```
6. **OK**をクリックして保存
7. **PowerShellを再起動**

**確認**:
```powershell
pg_restore --version
```

---

## 📋 次のステップ

PATHに追加できたら：

1. **プロジェクトディレクトリに移動**
   ```powershell
   cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"
   ```

2. **Step 4: データ移行を実行**
   - `PHASE_1_8_STEP4_DATA_MIGRATION.md` を参照
   - `pg_restore`コマンドでインポート

---

**まずは、上記のコマンドでPATHに追加して、`pg_restore --version`で確認してください！**

