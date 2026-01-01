# Supabase環境設定ガイド

本番環境と検証環境でSupabaseプロジェクトを分けて設定する方法を説明します。

## 📋 環境構成

### 現在の環境構成（Render）

| 環境 | サービス名 | NODE_ENV | データベース |
|------|-----------|---------|------------|
| **本番環境** | `fleapay-lite-web` | `production` | `fleapay-lite-db` (共有) |
| **検証環境** | `fleapay-lite-web-preview` | `preview` | `fleapay-lite-db` (共有) |

### 移行後の環境構成（Supabase）

| 環境 | Supabaseプロジェクト | データベース | 用途 |
|------|---------------------|------------|------|
| **本番環境** | `fleapay-lite-prod` | Supabase (Prod) | 本番データ |
| **検証環境** | `fleapay-lite-staging` | Supabase (Staging) | 検証・テストデータ |

**重要**: 本番環境と検証環境は**必ず別々のSupabaseプロジェクト**を使用してください。

---

## 🚀 ステップ1: Supabaseプロジェクトの作成

### 1.1 検証環境用プロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. **New Project** をクリック
3. プロジェクト情報を入力：
   - **Name**: `fleapay-lite-staging`
   - **Database Password**: 強力なパスワードを設定（必ず保存）
   - **Region**: `Tokyo (North)` または `Singapore (Southeast Asia)`
   - **Pricing Plan**: Free tier で開始可能

### 1.2 本番環境用プロジェクトの作成

1. 同様に **New Project** をクリック
2. プロジェクト情報を入力：
   - **Name**: `fleapay-lite-prod`
   - **Database Password**: 強力なパスワードを設定（必ず保存）
   - **Region**: `Tokyo (North)` または `Singapore (Southeast Asia)`
   - **Pricing Plan**: 本番環境に応じたプランを選択（Pro推奨）

**注意**: 本番環境ではFree tierではなく、適切なプラン（Pro以上）を選択することを推奨します。

---

## 🔑 ステップ2: 接続情報の取得

各環境のSupabaseプロジェクトから以下の情報を取得します。

### 2.1 検証環境（staging）の接続情報

1. `fleapay-lite-staging` プロジェクトを選択
2. **Settings > Database > Connection string > URI** から接続文字列をコピー
   - 形式: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
3. **Settings > API > Project URL** をコピー
   - 形式: `https://[PROJECT-REF].supabase.co`
4. **Settings > API > Project API keys** から以下をコピー：
   - `anon` `public` key: フロントエンド用
   - `service_role` `secret` key: サーバーサイド用（RLSバイパス）

### 2.2 本番環境（prod）の接続情報

1. `fleapay-lite-prod` プロジェクトを選択
2. 同様に接続情報を取得

**重要**: 接続情報は安全に管理してください。環境変数やシークレット管理ツール（例: Render Secrets）に保存してください。

---

## 🔧 ステップ3: 環境変数の設定

### 3.1 検証環境（Render: fleapay-lite-web-preview）

Render Dashboardで以下の環境変数を設定：

```env
# データベース接続
DATABASE_URL=postgresql://postgres:[STAGING-PASSWORD]@db.[STAGING-PROJECT-REF].supabase.co:5432/postgres

# Supabase API（将来の認証移行用）
NEXT_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]

# 環境識別
NODE_ENV=preview
```

### 3.2 本番環境（Render: fleapay-lite-web）

Render Dashboardで以下の環境変数を設定：

```env
# データベース接続
DATABASE_URL=postgresql://postgres:[PROD-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres

# Supabase API（将来の認証移行用）
NEXT_PUBLIC_SUPABASE_URL=https://[PROD-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-role-key]

# 環境識別
NODE_ENV=production
```

### 3.3 ローカル開発環境（.env）

ローカル開発用の `.env` ファイルには、検証環境の設定を使用することを推奨します：

```env
# 検証環境（staging）の接続情報を使用
DATABASE_URL=postgresql://postgres:[STAGING-PASSWORD]@db.[STAGING-PROJECT-REF].supabase.co:5432/postgres

NEXT_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]

# その他の環境変数
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
# ... その他の環境変数
```

**注意**: `.env` ファイルはGitにコミットしないでください（`.gitignore` に含まれていることを確認）。

---

## 📊 ステップ4: データ移行の順序

### 4.1 検証環境を先に移行

1. **検証環境のDB移行を先に実施**
   - 検証環境で問題がないことを確認
   - 本番環境への影響を最小化

2. **検証環境での動作確認**
   - すべてのAPIエンドポイントが正常に動作することを確認
   - データ整合性をチェック

### 4.2 本番環境を移行

1. **検証環境で問題がないことを確認後、本番環境を移行**
   - メンテナンスウィンドウを設定（可能な場合）
   - 本番データのバックアップを取得

2. **本番環境での動作確認**
   - デプロイ後、30分-1時間は監視
   - エラーログを確認
   - パフォーマンス指標を確認

---

## 🔄 ステップ5: render.yamlの更新（オプション）

将来的に、`render.yaml` でSupabase接続を管理する場合は、以下のように設定できます：

```yaml
services:
  - type: web
    name: fleapay-lite-web
    env: node
    plan: starter
    region: singapore
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      # DATABASE_URLはRender Dashboardで設定（機密情報のため）
      # - key: DATABASE_URL
      #   value: postgresql://...
      - key: PORT
        value: 3000

  - type: web
    name: fleapay-lite-web-preview
    env: node
    plan: starter
    region: singapore
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - fromGroup: Environment preview
      - key: NODE_ENV
        value: preview
      # DATABASE_URLはRender Dashboardで設定（機密情報のため）
      # - key: DATABASE_URL
      #   value: postgresql://...
      - key: PORT
        value: 3000

# 注: Supabaseを使用する場合、Renderのdatabasesセクションは不要になります
# databases:
#   - name: fleapay-lite-db
#     ...
```

**注意**: `DATABASE_URL` などの機密情報は `render.yaml` に直接書かず、Render Dashboardで設定してください。

---

## ✅ チェックリスト

### 検証環境（staging）

- [ ] Supabaseプロジェクト `fleapay-lite-staging` を作成
- [ ] 接続情報（DATABASE_URL, API URL, Keys）を取得
- [ ] Render環境変数を設定（`fleapay-lite-web-preview`）
- [ ] スキーマを移行
- [ ] データを移行（検証データ）
- [ ] データ整合性をチェック
- [ ] 動作確認（すべてのAPIエンドポイント）

### 本番環境（prod）

- [ ] Supabaseプロジェクト `fleapay-lite-prod` を作成
- [ ] 接続情報（DATABASE_URL, API URL, Keys）を取得
- [ ] Render環境変数を設定（`fleapay-lite-web`）
- [ ] 本番データのバックアップを取得
- [ ] スキーマを移行
- [ ] データを移行（本番データ）
- [ ] データ整合性をチェック
- [ ] 動作確認（すべてのAPIエンドポイント）
- [ ] パフォーマンス監視（30分-1時間）

---

## 🔒 セキュリティのベストプラクティス

1. **プロジェクト分離**
   - 本番環境と検証環境は必ず別プロジェクトを使用
   - 本番環境のキーを検証環境で使用しない

2. **キーの管理**
   - `service_role` keyはサーバーサイドのみで使用
   - `anon` keyはフロントエンドで使用（RLSが有効な場合）
   - キーをGitにコミットしない

3. **パスワードの管理**
   - 強力なパスワードを設定
   - パスワードは安全に保管（パスワードマネージャー推奨）
   - 定期的にパスワードをローテーション

4. **ネットワークセキュリティ**
   - SupabaseのIP制限機能を活用（必要に応じて）
   - 本番環境では、可能な限り外部接続を制限

---

## 🐛 トラブルシューティング

### 問題1: 環境変数が正しく読み込まれない

**確認事項**:
- Render Dashboardで環境変数が正しく設定されているか
- 環境変数名が正しいか（大文字・小文字を区別）
- デプロイ後に環境変数が反映されているか（再デプロイが必要な場合がある）

### 問題2: 接続エラー

**確認事項**:
- 接続文字列が正しいか
- パスワードが正しいか（URLエンコードが必要な場合がある）
- Supabaseプロジェクトがアクティブか
- ネットワーク接続が確立されているか

### 問題3: データが混在している

**確認事項**:
- 本番環境と検証環境で別々のSupabaseプロジェクトを使用しているか
- `DATABASE_URL` が正しい環境を指しているか
- 環境変数が正しく設定されているか

---

## 📚 関連ドキュメント

- [scripts/migrate-to-supabase.md](./scripts/migrate-to-supabase.md) - 詳細な移行手順
- [MIGRATION_EXECUTION_PLAN.md](./MIGRATION_EXECUTION_PLAN.md) - 全体の移行計画
- [scripts/README.md](./scripts/README.md) - 移行スクリプトの使い方

---

## 📝 環境変数テンプレート

### 検証環境（staging）

```env
# === 検証環境（staging）の設定 ===
DATABASE_URL=postgresql://postgres:[STAGING-PASSWORD]@db.[STAGING-PROJECT-REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]
NODE_ENV=preview
```

### 本番環境（prod）

```env
# === 本番環境（prod）の設定 ===
DATABASE_URL=postgresql://postgres:[PROD-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[PROD-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-role-key]
NODE_ENV=production
```

**重要**: `[STAGING-PASSWORD]`, `[STAGING-PROJECT-REF]`, `[STAGING-PROJECT-REF]` などのプレースホルダーを実際の値に置き換えてください。

