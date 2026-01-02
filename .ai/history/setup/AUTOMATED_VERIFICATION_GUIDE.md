# 自動動作確認ガイド（CI/CD対応）

**作成日**: 2026-01-02  
**目的**: Cursor以外の環境（CI/CD、GitHub Actions等）でも自動で動作確認を実行できるようにする

---

## 📋 概要

このガイドでは、以下の環境で自動的に動作確認を実行する方法を説明します：

1. **GitHub Actions** - プッシュ時に自動実行
2. **ローカル環境** - 手動実行
3. **CI/CDパイプライン** - カスタムCI/CD環境

---

## 🔧 実装内容

### 1. Bashスクリプトの作成

**ファイル**:
- `scripts/check-deployment-status.sh` - デプロイ状態確認（Bash版）
- `scripts/auto-verify-staging.sh` - 自動デプロイ状態確認 + 動作確認（Bash版）

**特徴**:
- Linux/macOS/GitHub Actionsで実行可能
- `jq`が利用可能な場合はJSONをパース、利用できない場合は`grep`で簡易的に抽出
- `curl`を使用してAPIを呼び出し

---

### 2. GitHub Actionsワークフローの作成

**ファイル**: `.github/workflows/verify-staging.yml`

**トリガー**:
- `main`ブランチへのプッシュ時（`server.js`, `public/**`, `scripts/**`が変更された場合）
- 手動実行（`workflow_dispatch`）

**機能**:
1. コードをチェックアウト
2. Node.jsをセットアップ
3. デプロイ状態を確認
4. デプロイ済みの場合のみ動作確認を実行
5. 結果をレポートとして保存

---

## 🚀 使用方法

### 方法1: GitHub Actions（自動実行）

**設定**:
1. `.github/workflows/verify-staging.yml`をコミット・プッシュ
2. `main`ブランチにプッシュすると自動的に実行されます

**手動実行**:
1. GitHubリポジトリの**Actions**タブを開く
2. **Verify Staging Environment**ワークフローを選択
3. **Run workflow**をクリック
4. 必要に応じて`skip_deployment_check`を設定

---

### 方法2: ローカル環境（Bash）

**前提条件**:
- `curl`がインストールされている
- `jq`がインストールされている（推奨、なくても動作します）

**実行**:
```bash
# デプロイ状態確認のみ
./scripts/check-deployment-status.sh

# デプロイ状態確認 + 動作確認
./scripts/auto-verify-staging.sh

# カスタムURLを指定
./scripts/auto-verify-staging.sh https://your-custom-url.onrender.com
```

**実行権限の付与**:
```bash
chmod +x scripts/*.sh
```

---

### 方法3: CI/CDパイプライン

**例: GitLab CI/CD**

```yaml
# .gitlab-ci.yml
verify-staging:
  stage: verify
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq git
    - chmod +x scripts/*.sh
  script:
    - ./scripts/auto-verify-staging.sh
  only:
    - main
```

**例: CircleCI**

```yaml
# .circleci/config.yml
version: 2.1
jobs:
  verify-staging:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: |
            sudo apt-get update
            sudo apt-get install -y curl jq
      - run:
          name: Run verification
          command: |
            chmod +x scripts/*.sh
            ./scripts/auto-verify-staging.sh
```

---

## ✅ 自動判定のロジック

### デプロイ状態の判定

1. **ローカルのコミットハッシュを取得**
   ```bash
   git rev-parse --short HEAD
   ```

2. **検証環境のAPIからGitコミット情報を取得**
   ```bash
   curl -s https://fleapay-lite-t1.onrender.com/api/ping | jq -r '.git.commit'
   ```

3. **コミットハッシュを比較**
   - 一致 → デプロイ済み → 動作確認を実行
   - 不一致 → 未デプロイ → 警告を表示して終了（exit code 1）

---

## 📊 GitHub Actionsでの実行結果

### 成功時

```
✅ デプロイ状態確認完了
✅ すべての動作確認が正常に完了しました
```

### 失敗時（デプロイされていない場合）

```
⚠️ ローカルのコミットハッシュと一致しません
❌ 最新のコードがデプロイされていません
::warning::最新のコードがデプロイされていません。動作確認をスキップしました。
```

---

## 🔍 環境別の対応

### Linux/macOS

```bash
# 実行権限を付与
chmod +x scripts/*.sh

# 実行
./scripts/auto-verify-staging.sh
```

### Windows (Git Bash / WSL)

```bash
# Git BashまたはWSLで実行
./scripts/auto-verify-staging.sh
```

### Windows (PowerShell)

```powershell
# PowerShellスクリプトを使用
.\scripts\auto-verify-staging.ps1
```

---

## 🚨 トラブルシューティング

### 問題1: `jq`がインストールされていない

**対処**:
- `jq`をインストール（推奨）
- または、`jq`なしでも動作します（`grep`で簡易的に抽出）

**インストール方法**:
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Alpine Linux
apk add jq
```

### 問題2: `curl`がインストールされていない

**対処**:
- `curl`をインストール（必須）

**インストール方法**:
```bash
# Ubuntu/Debian
sudo apt-get install curl

# macOS
# 通常は標準でインストールされています

# Alpine Linux
apk add curl
```

### 問題3: 実行権限がない

**対処**:
```bash
chmod +x scripts/*.sh
```

---

## 📝 カスタマイズ

### 環境変数で設定を変更

```bash
# デプロイ状態確認をスキップ
export SKIP_DEPLOYMENT_CHECK=true
./scripts/auto-verify-staging.sh

# カスタムURLを指定
./scripts/auto-verify-staging.sh https://your-custom-url.onrender.com
```

### GitHub Actionsでのカスタマイズ

`.github/workflows/verify-staging.yml`を編集して、トリガー条件や実行内容をカスタマイズできます。

---

## 📚 関連ドキュメント

- `scripts/check-deployment-status.sh` - デプロイ状態確認スクリプト（Bash版）
- `scripts/auto-verify-staging.sh` - 自動デプロイ状態確認 + 動作確認スクリプト（Bash版）
- `scripts/check-deployment-status.ps1` - デプロイ状態確認スクリプト（PowerShell版）
- `scripts/auto-verify-staging.ps1` - 自動デプロイ状態確認 + 動作確認スクリプト（PowerShell版）
- `.github/workflows/verify-staging.yml` - GitHub Actionsワークフロー
- `.ai/history/setup/CURSOR_AUTO_VERIFICATION_GUIDE.md` - Cursor用自動検証ガイド

---

## 💡 ベストプラクティス

### 1. プルリクエスト時の自動実行

プルリクエスト作成時にも自動実行する場合は、`.github/workflows/verify-staging.yml`に以下を追加：

```yaml
on:
  pull_request:
    branches:
      - main
```

### 2. スケジュール実行

定期的に動作確認を実行する場合：

```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # 毎日0時（UTC）
```

### 3. 結果の通知

GitHub Actionsで結果を通知する場合：

```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: '動作確認が失敗しました'
```

---

**次回更新**: CI/CD環境の追加時

