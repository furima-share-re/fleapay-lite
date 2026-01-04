# Node.jsがない場合の使い方

## 🚀 PowerShellで直接実行

Node.jsがインストールされていない、またはPATHに含まれていない場合でも、PowerShellスクリプトで直接チェックできます。

### 実行方法

```powershell
# PowerShellで実行
.\scripts\check-staging-powershell.ps1
```

または

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-staging-powershell.ps1
```

### 実行結果

実行すると、以下のように表示されます：

```
==========================================
🔍 検証環境の全画面チェックを開始します
ベースURL: https://fleapay-lite-t1.onrender.com
==========================================

📄 14個のページをチェック中...

チェック中: トップページ (/) ✓ 200 - 123ms
チェック中: 成功ページ (/success) ✓ 200 - 145ms
...

🔌 7個のAPIエンドポイントをチェック中...

チェック中: ヘルスチェック (/api/ping) ✓ 200 - 89ms
...

==========================================
📊 チェック結果サマリー
==========================================

総チェック数: 21
成功: 19
エラー: 2
警告: 0
```

### 結果をファイルに保存

スクリプト実行後、結果をファイルに保存するか聞かれます：

```
結果をファイルに保存しますか？ (y/n)
```

`y` を入力すると、`staging-check-YYYYMMDD-HHmmss.json` というファイル名で保存されます。

---

## 📋 他の方法

### 方法1: Node.jsをインストール

1. [Node.js公式サイト](https://nodejs.org/)からインストーラーをダウンロード
2. インストール後、PowerShellを再起動
3. 以下のコマンドで確認：
   ```powershell
   node --version
   npm --version
   ```

### 方法2: nvm-windowsを使用

1. [nvm-windows](https://github.com/coreybutler/nvm-windows)をインストール
2. 以下のコマンドでNode.jsをインストール：
   ```powershell
   nvm install lts
   nvm use lts
   ```

### 方法3: Chocolateyを使用

```powershell
# Chocolateyがインストールされている場合
choco install nodejs
```

---

## 🔍 PowerShellスクリプトの機能

`check-staging-powershell.ps1` は以下の機能を提供します：

- ✅ HTTPステータスコードのチェック
- ✅ レスポンス時間の測定
- ✅ HTML構造の基本チェック
- ✅ エラーページの検出
- ✅ JSON形式での結果出力
- ✅ 結果のファイル保存

---

## ⚠️ 注意事項

### 実行ポリシーのエラー

PowerShellの実行ポリシーによっては、スクリプトが実行できない場合があります。

**解決方法：**

```powershell
# 一時的に実行ポリシーを変更
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# スクリプトを実行
.\scripts\check-staging-powershell.ps1
```

または、実行時に指定：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-staging-powershell.ps1
```

---

## 📚 関連ドキュメント

- **完全な使い方**: `scripts/使い方まとめ.md`
- **クイックリファレンス**: `scripts/README_使い方.md`


