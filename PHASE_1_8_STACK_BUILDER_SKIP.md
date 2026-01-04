# Phase 1.8: Stack Builderの画面について

**作成日**: 2026-01-04  
**状況**: PostgreSQLインストール後にStack Builderの画面が表示された

---

## 🔍 現在の状況

PostgreSQLのインストール後に、**Stack Builder**というポップアップウィンドウが表示されています。

**この画面の意味**:
- Stack Builderは、PostgreSQLの**追加コンポーネント**をインストールするためのツールです
- **コマンドラインツール（pg_restoreなど）は既にインストールされています**

---

## ✅ 対応方法

### Stack Builderの画面は閉じてOK

**この画面で何も選択する必要はありません。**

1. **キャンセル(C)** ボタンをクリック
2. または、**<戻る(B)** ボタンをクリックして閉じる

**理由**:
- コマンドラインツール（`pg_restore`、`pg_dump`など）は、PostgreSQL本体のインストール時に自動的にインストールされています
- Stack Builderは追加のツール（pgBouncer、ドライバーなど）をインストールするためのもので、今回の目的には不要です

---

## 🔍 インストール確認

### Step 1: PowerShellを再起動

**重要**: PostgreSQLをインストールした後、**必ずPowerShellを再起動してください**。

### Step 2: pg_restoreがインストールされているか確認

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

2. **binフォルダ内にpg_restore.exeがあるか確認**
   ```powershell
   # 例: PostgreSQL 15の場合
   Test-Path "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe"
   ```

3. **PATHに手動で追加（一時的）**
   ```powershell
   # 現在のセッションのみ
   $env:Path += ";C:\Program Files\PostgreSQL\15\bin"
   
   # 確認
   pg_restore --version
   ```

---

## 📋 まとめ

1. **Stack Builderの画面は閉じてOK**（キャンセルボタンをクリック）
2. **PowerShellを再起動**
3. **`pg_restore --version`で確認**

**コマンドラインツールは既にインストールされています！**

---

**Stack Builderの画面を閉じて、PowerShellを再起動してから`pg_restore --version`を実行してください。**

