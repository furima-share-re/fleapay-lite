# Phase 1.8: npmの実行ポリシーエラーの修正

**作成日**: 2026-01-04  
**問題**: PowerShellの実行ポリシーが原因で`npm`コマンドが実行できない  
**解決方法**: PowerShellの実行ポリシーを変更

---

## ✅ 解決方法: PowerShellの実行ポリシーを変更

**PowerShellで、以下のコマンドを実行：**

### Step 1: 現在の実行ポリシーを確認

```powershell
Get-ExecutionPolicy
```

**期待される出力：**
```
Restricted
```

**または：**
```
RemoteSigned
```

---

### Step 2: 実行ポリシーを変更（現在のセッションのみ）

**現在のセッションのみで実行ポリシーを変更：**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

**確認を求められたら、`Y`を入力してEnterキーを押してください。**

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

## 📋 完全な手順

```powershell
# Step 1: 現在の実行ポリシーを確認
Get-ExecutionPolicy

# Step 2: 実行ポリシーを変更（現在のセッションのみ）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Step 3: npmのバージョンを確認
npm --version

# Step 4: Supabase CLIをインストール（npxを使用、推奨）
npx supabase --help
```

---

## ⚠️ 実行ポリシーについて

**実行ポリシーの種類：**
- **Restricted**: スクリプトの実行が禁止されている（現在の状態）
- **RemoteSigned**: リモートからダウンロードしたスクリプトには署名が必要（推奨）
- **Unrestricted**: すべてのスクリプトを実行可能（セキュリティリスクあり）

**推奨設定：**
- **RemoteSigned**: ローカルで作成したスクリプトは実行可能、リモートからダウンロードしたスクリプトには署名が必要

---

## 🔄 永続的に設定する場合

**現在のユーザーのみに適用：**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**確認を求められたら、`Y`を入力してEnterキーを押してください。**

---

## 📋 次のステップ

**実行ポリシーを変更したら：**

1. **npmのバージョンを確認**
   ```powershell
   npm --version
   ```

2. **Supabase CLIをインストール**
   ```powershell
   npx supabase --help
   ```

3. **Supabaseにログイン**
   ```powershell
   npx supabase login
   ```

4. **プロジェクトをリンク**
   ```powershell
   npx supabase link --project-ref mluvjdhqgfpcefsmvjae
   ```

---

**まずは、実行ポリシーを変更して、npmコマンドが実行できるか確認してください！**

