# Phase 1.8: Supabase CLIのインストール手順

**作成日**: 2026-01-04  
**OS**: Windows  
**目的**: Supabase CLIをインストールしてデータ移行を実行

---

## 📋 インストール手順

### Step 1: Node.jsがインストールされているか確認

**PowerShellで、以下のコマンドを実行：**

```powershell
node --version
```

**期待される出力：**
```
v20.x.x またはそれ以降
```

**もし「コマンドが見つかりません」と表示された場合：**
- Node.jsがインストールされていません
- [Node.js公式サイト](https://nodejs.org/)からダウンロードしてインストールしてください
- **Node.js 20以降**が必要です

---

### Step 2: npmがインストールされているか確認

**PowerShellで、以下のコマンドを実行：**

```powershell
npm --version
```

**期待される出力：**
```
10.x.x またはそれ以降
```

**注意**: Node.jsをインストールすると、npmも自動的にインストールされます。

---

### Step 3: Supabase CLIをインストール

**方法1: npxを使用（推奨、インストール不要）**

```powershell
# Supabase CLIを実行（初回実行時に自動的にダウンロードされます）
npx supabase --help
```

**方法2: グローバルにインストール**

```powershell
# Supabase CLIをグローバルにインストール
npm install -g supabase

# インストールを確認
supabase --version
```

---

## 🚀 完全なインストール手順

```powershell
# Step 1: Node.jsのバージョンを確認
node --version

# Step 2: npmのバージョンを確認
npm --version

# Step 3: Supabase CLIをインストール（npxを使用、推奨）
npx supabase --help

# または、グローバルにインストール
npm install -g supabase
```

---

## ⚠️ Node.jsがインストールされていない場合

### Node.jsのインストール手順

1. **Node.js公式サイトを開く**
   - [https://nodejs.org/](https://nodejs.org/)

2. **LTS版をダウンロード**
   - **推奨**: LTS版（Long Term Support）
   - **バージョン**: 20.x.x以降

3. **インストーラーを実行**
   - ダウンロードした`.msi`ファイルを実行
   - インストールウィザードに従ってインストール

4. **インストールを確認**
   ```powershell
   node --version
   npm --version
   ```

---

## 📋 インストール後の確認

**インストールが完了したら、以下のコマンドで確認：**

```powershell
# Supabase CLIのバージョンを確認
npx supabase --version

# または、グローバルにインストールした場合
supabase --version
```

---

## 🔄 次のステップ

**インストールが完了したら：**

1. **Supabaseにログイン**
   ```powershell
   npx supabase login
   ```

2. **プロジェクトをリンク**
   ```powershell
   npx supabase link --project-ref mluvjdhqgfpcefsmvjae
   ```

3. **データをインポート**
   ```powershell
   cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite\tmp\2026-01-03T15_42Z\fleapay_prod_db"
   pg_restore --dbname="postgresql://postgres:.cx2eeaZJ55Qp@f@db.mluvjdhqgfpcefsmvjae.supabase.co:5432/postgres" --verbose --clean --no-owner --no-privileges .
   ```

---

**まずは、Node.jsがインストールされているか確認してください！**

