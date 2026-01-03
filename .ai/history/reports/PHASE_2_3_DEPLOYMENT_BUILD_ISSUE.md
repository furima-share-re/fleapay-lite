# Phase 2.3: デプロイ時のビルド問題

**確認日**: 2026-01-03  
**問題**: `.next`ディレクトリが生成されない  
**状態**: ⚠️ **Render Dashboard設定の確認が必要**

---

## ❌ 発見された問題

### デプロイログの内容

```
==> Running build command 'npm install'...
```

**問題点**:
- `render.yaml`には`buildCommand: npm install && npm run build`と設定されている
- しかし、デプロイログでは`npm install`のみが実行されている
- `npm run build`が実行されていないため、`.next`ディレクトリが生成されない

### エラーメッセージ

```
❌ Next.jsの準備に失敗しました: Error: Could not find a production build in the '.next' directory. Try building your app with 'next build' before starting the production server.
```

---

## 🔍 原因分析

### 可能性1: Render Dashboardで手動設定されている

Render Dashboardで`buildCommand`が手動で設定されている場合、`render.yaml`の設定が無視される可能性があります。

**確認方法**:
1. Render Dashboardにログイン
2. `fleapay-lite-web`サービスを選択
3. **Settings**タブを開く
4. **Build Command**を確認
   - `npm install`のみになっている場合は、`npm install && npm run build`に変更

### 可能性2: render.yamlがGitにコミットされていない

`render.yaml`がGitリポジトリにコミット・プッシュされていない場合、Renderが設定を読み込めません。

**確認方法**:
```bash
git log --oneline --all -- render.yaml
```

### 可能性3: render.yamlの構文エラー

`render.yaml`に構文エラーがある場合、Renderが設定を読み込めません。

**確認方法**:
```bash
# YAML構文チェック（yqやyamllintを使用）
```

---

## ✅ 解決方法

### 方法1: Render DashboardでbuildCommandを設定（推奨）

1. Render Dashboardにログイン
2. `fleapay-lite-web`サービスを選択
3. **Settings**タブを開く
4. **Build Command**を以下のように設定：
   ```
   npm install && npm run build
   ```
5. **Save Changes**をクリック
6. **Manual Deploy** → **Deploy latest commit**を実行

### 方法2: render.yamlを確認してGitにコミット・プッシュ

1. `render.yaml`が正しく設定されているか確認：
   ```yaml
   buildCommand: npm install && npm run build
   ```

2. Gitにコミット・プッシュ：
   ```bash
   git add render.yaml
   git commit -m "fix: render.yamlにnpm run buildを追加"
   git push origin main
   ```

3. Render Dashboardで**Manual Deploy** → **Deploy latest commit**を実行

### 方法3: package.jsonのbuildスクリプトを確認

`package.json`に`build`スクリプトが正しく設定されているか確認：

```json
{
  "scripts": {
    "build": "next build"
  }
}
```

---

## 📋 現在の設定確認

### render.yaml

```yaml
services:
  - type: web
    name: fleapay-lite-web
    buildCommand: npm install && npm run build  # ✅ 正しく設定されている
    startCommand: npm start
```

### package.json

```json
{
  "scripts": {
    "build": "next build"  # ✅ 正しく設定されている
  }
}
```

---

## 🚀 推奨される対応手順

### ステップ1: Render DashboardでbuildCommandを確認・設定

1. Render Dashboardにログイン
2. `fleapay-lite-web`サービスを選択
3. **Settings**タブを開く
4. **Build Command**を確認
   - `npm install`のみになっている場合は、`npm install && npm run build`に変更
5. **Save Changes**をクリック

### ステップ2: 手動デプロイを実行

1. Render Dashboardで**Manual Deploy** → **Deploy latest commit**を実行
2. デプロイログで以下を確認：
   ```
   ==> Running build command 'npm install && npm run build'...
   ```
3. `.next`ディレクトリが生成されることを確認：
   ```
   ✅ .nextディレクトリ: 存在します
   ```
4. Next.jsの準備が正常に完了することを確認：
   ```
   ✅ Next.jsの準備が完了しました
   ```

### ステップ3: 動作確認

再デプロイ後、以下のURLが正常に動作することを確認：

- ✅ `/success` - 成功ページ
- ✅ `/checkout` - チェックアウト画面
- ✅ `/admin/dashboard` - 管理ダッシュボード
- その他のNext.js Pages（全14個）

---

## ✅ 確認チェックリスト

- [ ] Render Dashboardで`buildCommand`を確認
- [ ] `buildCommand`が`npm install && npm run build`になっているか確認
- [ ] 手動デプロイを実行
- [ ] デプロイログで`npm run build`が実行されているか確認
- [ ] `.next`ディレクトリが生成されているか確認
- [ ] Next.jsの準備が正常に完了するか確認
- [ ] すべてのNext.js Pagesが正常に動作するか確認

---

**レポート作成日**: 2026-01-03  
**確認実施者**: AI Assistant

