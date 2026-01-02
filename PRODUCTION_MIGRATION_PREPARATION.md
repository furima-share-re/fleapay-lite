# 本番環境DB移行準備ガイド

**作成日**: 2026-01-02  
**前提**: 検証環境のDB移行が完了していること

---

## 📋 移行前の準備

### 1. 本番環境の現状確認

#### 本番環境の情報を確認
- **Renderサービス名**: `fleapay-prod`（仮）
- **現在のデータベース**: Render PostgreSQL
- **本番環境URL**: （確認が必要）

#### 本番環境のデータ量確認
- テーブル数
- レコード数（主要テーブル）
- データサイズ

---

## 🔧 移行手順

### Phase 2.1: 本番環境Supabaseプロジェクト作成

1. **Supabase Dashboardにアクセス**
   - https://app.supabase.com

2. **新しいプロジェクトを作成**
   - プロジェクト名: `fleapay-prod`（または適切な名前）
   - データベースパスワード: 強力なパスワードを設定
   - リージョン: 日本（Tokyo）を推奨

3. **接続情報を取得**
   - Database URL（Connection Pooling）
   - API URL
   - `anon` key
   - `service_role` key

4. **接続情報を安全に保存**
   - 環境変数として設定（後で使用）

---

### Phase 2.2: 本番環境データダンプ

#### 方法A: Render PostgreSQLから直接ダンプ（推奨）

1. **Render Dashboardで本番環境のデータベース接続情報を取得**
   - Internal Database URL または External Database URL

2. **データダンプの実行**
   ```bash
   # スキーマのみ
   pg_dump -h <HOST> -U <USER> -d <DATABASE> --schema-only > prod_schema.sql
   
   # データのみ
   pg_dump -h <HOST> -U <USER> -d <DATABASE> --data-only > prod_data.sql
   
   # すべて
   pg_dump -h <HOST> -U <USER> -d <DATABASE> > prod_full.sql
   ```

#### 方法B: Supabase SQL Editorから直接インポート

1. **本番環境のデータを確認**
   - 主要テーブルのレコード数を確認

2. **Supabase SQL Editorで直接INSERT**
   - 小規模なデータの場合

---

### Phase 2.3: Supabaseへのデータインポート

1. **Supabase SQL Editorを開く**
   - https://app.supabase.com/project/<PROJECT_ID>/sql/new

2. **スキーマをインポート**
   - `prod_schema.sql`の内容を実行
   - または、検証環境と同じスキーマを使用

3. **データをインポート**
   - `prod_data.sql`の内容を実行
   - または、CSV形式でインポート

4. **データ整合性を確認**
   - レコード数の確認
   - 外部キー制約の確認

---

### Phase 2.4: 本番環境の環境変数設定

1. **Render Dashboardで本番環境のサービスを開く**

2. **Environment Variablesを更新**
   ```
   DATABASE_URL=<Supabase Connection Pooling URL>
   NEXT_PUBLIC_SUPABASE_URL=<Supabase API URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
   SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>
   ```

3. **変更を保存してデプロイ**

---

### Phase 2.5: 本番環境動作確認

#### 動作確認項目

1. **APIエンドポイント確認**
   - `/api/ping` - データベース接続確認
   - `/api/seller/summary` - 売上サマリー取得

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

### 2. データバックアップ
- 移行前に本番環境のデータを完全にバックアップ
- 移行後も元のデータベースを一定期間保持

### 3. ロールバック計画
- 問題が発生した場合のロールバック手順を準備
- 元の`DATABASE_URL`に戻す手順を確認

### 4. 段階的移行
- 検証環境で十分にテストを実施
- 本番環境でも小規模なテストから開始

---

## 📊 チェックリスト

### 移行前
- [ ] 本番環境のデータ量を確認
- [ ] 本番環境Supabaseプロジェクトを作成
- [ ] 接続情報を取得・保存
- [ ] データバックアップを取得

### 移行中
- [ ] スキーマをSupabaseにインポート
- [ ] データをSupabaseにインポート
- [ ] データ整合性を確認
- [ ] 環境変数を更新

### 移行後
- [ ] APIエンドポイントの動作確認
- [ ] 決済機能の動作確認
- [ ] 既存ユーザーのデータ確認
- [ ] パフォーマンス確認

---

## 🔗 関連ドキュメント

- `STAGING_MIGRATION_COMPLETE.md` - 検証環境移行完了報告
- `SETUP_TEST_USERS_WITH_PRISMA.md` - テストユーザー設定ガイド
- `DATA_DRIVEN_ACCESS_CONTROL.md` - データ駆動型アクセス制御

---

## 📝 まとめ

検証環境の移行が成功したことを踏まえ、本番環境への移行準備を進めます。

**重要なポイント**:
1. データバックアップを必ず取得
2. 段階的に移行を実施
3. 十分な動作確認を実施
4. ロールバック計画を準備

