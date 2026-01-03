# Phase 1.8: npmの実行ポリシーエラーの完全な修正手順

**作成日**: 2026-01-04  
**現在の実行ポリシー**: `Restricted`  
**目標**: `RemoteSigned`に変更してnpmコマンドを実行可能にする

---

## ✅ 完全なコマンド（コピペで実行）

**PowerShellで、以下のコマンドを順番に実行してください：**

```powershell
# Step 1: 実行ポリシーを変更（現在のセッションのみ）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Step 2: 確認を求められたら、Yを入力してEnterキーを押す
# または、-Forceオプションを使用して確認をスキップ
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Step 3: npmのバージョンを確認
npm --version

# Step 4: Supabase CLIをインストール（npxを使用、推奨）
npx supabase --help
```

---

## 📋 完全な手順（一度にコピペ）

```powershell
# Step 1: 実行ポリシーを変更（現在のセッションのみ、確認をスキップ）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Step 2: npmのバージョンを確認
npm --version

# Step 3: Supabase CLIをインストール（npxを使用、推奨）
npx supabase --help
```

---

## ⚠️ 注意事項

**`-Force`オプションを使用すると、確認を求められずに実行ポリシーが変更されます。**

**確認を求めたい場合は、`-Force`オプションを削除してください：**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

**確認を求められたら、`Y`を入力してEnterキーを押してください。**

---

## 🔄 次のステップ

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

**まずは、上記のコマンドをコピペで実行してください！**

