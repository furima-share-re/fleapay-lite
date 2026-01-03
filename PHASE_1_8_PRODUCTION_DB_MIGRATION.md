# Phase 1.8: 本番環境DB移行

**作成日**: 2026-01-03  
**状態**: ⏳ **準備中**  
**前提条件**: Phase 2（Next.js移行）完了、Phase 3.1（Helicone導入）完了

---

## 📋 移行前の準備チェックリスト

### 1. 本番環境の現状確認

- [ ] **本番環境の情報を確認**
  - Renderサービス名: `fleapay-lite-web`
  - 現在のデータベース: Render PostgreSQL（旧DB）
  - 本番環境URL: `https://app.fleapay.jp`

- [ ] **本番環境のデータ量確認**
  - テーブル数
  - レコード数（主要テーブル）
  - データサイズ

---

## 🔧 移行手順

### Step 1: 本番環境Supabaseプロジェクト作成

1. **Supabase Dashboardにアクセス**
   - https://app.supabase.com

2. **新しいプロジェクトを作成**
   - プロジェクト名: `fleapay-lite-prod`（または適切な名前）
   - データベースパスワード: 強力なパスワードを設定（**必ず保存**）
   - リージョン: 日本（Tokyo）またはシンガポール（Singapore）を推奨
   - プラン: 本番環境に応じたプランを選択（Pro推奨）

3. **接続情報を取得**
   - Database URL（Connection Pooling）: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - Direct Connection URL: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
   - API URL: `https://[PROJECT_REF].supabase.co`
   - `anon` key
   - `service_role` key

4. **接続情報を安全に保存**
   - パスワードマネージャーに保存
   - **Gitにコミットしない**

---

### Step 2: 本番環境データバックアップ取得

#### 方法A: Render PostgreSQLから直接ダンプ（推奨）

1. **Render Dashboardで本番環境のデータベース接続情報を取得**
   - `fleapay-lite-db` データベースを選択
   - **Info** タブを開く
   - **Internal Database URL** または **External Database URL** を確認

2. **データダンプの実行**
   ```bash
   # スキーマのみ
   pg_dump -h <HOST> -U <USER> -d <DATABASE> --schema-only > prod_schema.sql
   
   # データのみ
   pg_dump -h <HOST> -U <USER> -d <DATABASE> --data-only > prod_data.sql
   
   # すべて（推奨）
   pg_dump -h <HOST> -U <USER> -d <DATABASE> > prod_full.sql
   ```

3. **バックアップファイルを安全に保存**
   - ローカルに保存
   - クラウドストレージにもバックアップ

---

### Step 3: Supabaseへのスキーマ移行

1. **Supabase SQL Editorを開く**
   - https://app.supabase.com/project/[PROJECT_REF]/sql/new

2. **スキーマをインポート**
   - 検証環境と同じスキーマを使用（`.ai/history/sql/supabase_schema.sql`）
   - または、`prod_schema.sql`の内容を実行

3. **スキーマの確認**
   ```sql
   -- テーブル一覧の確認
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

**期待されるテーブル**:
- `buyer_attributes`
- `frames`
- `images`
- `kids_achievements`
- `order_items`
- `order_metadata`
- `orders`
- `qr_sessions`
- `seller_subscriptions`
- `sellers`
- `stripe_payments`

---

### Step 4: Supabaseへのデータ移行

#### 方法A: pg_dumpで取得したデータをインポート

1. **Supabase SQL Editorでデータをインポート**
   - `prod_data.sql`の内容を実行
   - または、`prod_full.sql`の内容を実行

2. **データ整合性を確認**
   ```sql
   -- レコード数の確認
   SELECT 
     'sellers' as table_name, COUNT(*) as count FROM sellers
   UNION ALL
   SELECT 'orders', COUNT(*) FROM orders
   UNION ALL
   SELECT 'stripe_payments', COUNT(*) FROM stripe_payments;
   ```

#### 方法B: 検証環境のデータを使用（テスト用）

- 本番環境のデータが少ない場合、検証環境のデータを使用して動作確認

---

### Step 5: 本番環境の環境変数設定

1. **Render Dashboardで本番環境のサービスを開く**
   - `fleapay-lite-web` サービスを選択

2. **Environment Variablesを更新**
   ```
   DATABASE_URL=<Supabase Connection Pooling URL>
   NEXT_PUBLIC_SUPABASE_URL=<Supabase API URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
   SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>
   ```

3. **変更を保存してデプロイ**
   - 環境変数を保存すると、自動的に再デプロイが開始されます

---

### Step 6: Prisma Clientの再生成

1. **ローカルでPrisma Clientを再生成**
   ```bash
   npx prisma generate
   ```

2. **Gitにコミット・プッシュ**
   ```bash
   git add prisma/schema.prisma
   git commit -m "chore: Prisma Client再生成（本番環境DB移行後）"
   git push origin main
   ```

---

### Step 7: 本番環境動作確認

#### 動作確認項目

1. **APIエンドポイント確認**
   - `/api/ping` - データベース接続確認
   - `/api/seller/summary?s=seller-test01` - 売上サマリー取得
   - `/api/debug/db-status` - データベース状態確認

2. **決済機能確認**
   - 現金決済の動作確認
   - QR決済（Stripe）の動作確認

3. **既存ユーザーのデータ確認**
   - セラーダッシュボードの表示確認
   - 注文履歴の表示確認

4. **データ整合性確認**
   - レコード数の確認
   - 外部キー制約の確認

---

## ⚠️ 注意事項

### 1. ダウンタイムの最小化

- メンテナンス時間を事前に告知
- データ移行は可能な限り短時間で完了
- 環境変数の変更のみで切り替え可能（ダウンタイム最小）

### 2. データバックアップ

- 移行前に本番環境のデータを完全にバックアップ
- 移行後も元のデータベースを一定期間保持（1週間推奨）

### 3. ロールバック計画

- 問題が発生した場合のロールバック手順を準備
- 環境変数を元のRender PostgreSQLに戻すだけでロールバック可能

---

## 🔄 ロールバック手順

問題が発生した場合：

1. **Render Dashboardで環境変数を元に戻す**
   - `DATABASE_URL`を元のRender PostgreSQLに戻す

2. **再デプロイ**
   - 環境変数を保存すると、自動的に再デプロイが開始されます

3. **動作確認**
   - 元のデータベースに接続されていることを確認

---

## 📊 移行後の確認事項

- [ ] 本番環境のデータが正しく移行されている
- [ ] APIエンドポイントが正常に動作している
- [ ] 決済機能が正常に動作している
- [ ] 既存ユーザーのデータが正しく表示されている
- [ ] データ整合性が保たれている
- [ ] パフォーマンスに問題がない

---

## 🎯 次のステップ

Phase 1.8完了後：

1. **Phase 1.7: RLS実装**（検証環境で先に実施）
   - RLS有効化・ポリシー作成
   - 動作確認・テスト

2. **Phase 1.7: RLS実装**（本番環境に適用）
   - 検証環境で動作確認後、本番環境に適用

---

**準備完了後、移行を開始してください。**

