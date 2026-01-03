# Phase 1.8: npmの実行ポリシーエラーの修正（ステップバイステップ）

**作成日**: 2026-01-04  
**問題**: PowerShellの実行ポリシーが原因で`npm`コマンドが実行できない  
**現在の実行ポリシー**: `Restricted`

---

## ✅ 解決方法: 実行ポリシーを変更

**PowerShellで、以下のコマンドを順番に実行してください：**

### Step 1: 実行ポリシーを変更（現在のセッションのみ）

**以下のコマンドをコピー&ペーストして実行：**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
```

**何も表示されなければOKです。**

---

### Step 2: 実行ポリシーが変更されたか確認

```powershell
Get-ExecutionPolicy
```

**期待される出力：**
```
RemoteSigned
```

---

### Step 3: npmのバージョンを確認

```powershell
npm --version
```

**期待される出力：**
```
11.6.2 またはそれ以降
```

---

## 📋 完全なコマンド（一度にコピペ）

```powershell
# Step 1: 実行ポリシーを変更（現在のセッションのみ、確認をスキップ）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Step 2: 実行ポリシーが変更されたか確認
Get-ExecutionPolicy

# Step 3: npmのバージョンを確認
npm --version
```

---

## ⚠️ トラブルシューティング

### エラー1: 実行ポリシーが変更されない

**対処方法：**
- PowerShellを**管理者として実行**してから、再度実行してください
- または、`-Scope CurrentUser`を使用：
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
  ```

---

### エラー2: まだnpmが実行できない

**対処方法：**
1. **PowerShellを再起動**してから、再度実行してください
2. **実行ポリシーを確認**：
   ```powershell
   Get-ExecutionPolicy
   ```
3. **`RemoteSigned`が表示されない場合、再度実行ポリシーを変更**

---

## 🔄 代替方法: cmd.exeを使用

**もしPowerShellで解決しない場合、cmd.exeを使用：**

1. **Windowsキー + R**を押す
2. **`cmd`**と入力してEnterキーを押す
3. **以下のコマンドを実行：**
   ```cmd
   npm --version
   npx supabase --help
   ```

**cmd.exeでは実行ポリシーの問題が発生しません。**

---

## 📋 次のステップ

**npmが実行できるようになったら：**

1. **Supabase CLIをインストール**
   ```powershell
   npx supabase --help
   ```

2. **Supabaseにログイン**
   ```powershell
   npx supabase login
   ```

3. **プロジェクトをリンク**
   ```powershell
   npx supabase link --project-ref mluvjdhqgfpcefsmvjae
   ```

---

**まずは、上記のコマンドを順番に実行してください！**

