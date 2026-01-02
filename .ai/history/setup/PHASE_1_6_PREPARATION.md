# Phase 1.6: 既存ユーザー移行 準備ドキュメント

**作成日**: 2026-01-02  
**フェーズ**: Phase 1.6 - 既存ユーザー移行  
**状態**: ⏳ **準備中**

---

## 📋 Phase 1.6の目的

既存ユーザー（`auth_provider = 'bcryptjs'`）をSupabase Authに移行する。

**重要なポイント**:
- bcryptハッシュをSupabase Authに直接インポートすることは不可能
- パスワードリセットまたは初回ログイン時に移行が必要
- `auth_provider`カラムで認証方法を切り替え
- 段階的移行（1ユーザーずつでも可）

---

## 🔍 現在のアプリケーションの状況

### 認証機能の現状

**確認結果**:
- ❌ ログインAPIエンドポイントが存在しない
- ❌ 認証が必要なAPIエンドポイントが存在しない（管理APIは`x-admin-token`を使用）
- ✅ 新規ユーザー登録API（`/api/seller/start_onboarding`）は実装済み（Phase 1.5でSupabase Authに変更済み）
- ✅ `auth_provider`と`supabase_user_id`カラムは追加済み（Phase 1.5）

**結論**:
- 現在のアプリケーションは認証不要の設計
- Phase 1.6では、将来の認証機能実装に備えて、認証ロジックの基盤を実装する

---

## 📝 Phase 1.6の実装内容（調整版）

### 1. 認証ロジックの実装（基盤）

**目的**: 将来の認証機能実装に備えて、認証ロジックの基盤を実装する。

**実装内容**:
- `lib/auth.js`を作成（認証ロジックの基盤）
- `auth_provider`に基づく認証方法の切り替えロジック
- bcryptjs認証とSupabase Auth認証の両方に対応

### 2. パスワードリセット機能の実装（移行用）

**目的**: 既存ユーザーがパスワードリセット時にSupabase Authに移行できるようにする。

**実装内容**:
- `/api/auth/reset-password`エンドポイントを作成
- パスワードリセット時にSupabase Authに移行
- `auth_provider`を`'supabase'`に更新
- `supabase_user_id`を保存

### 3. 移行率確認APIの実装

**目的**: 移行率を確認できるようにする。

**実装内容**:
- `/api/admin/migration-status`エンドポイントを作成（管理者用）
- 移行率を返す（Supabase Auth使用ユーザー数 / 全ユーザー数）

---

## 🔧 実装ファイル

### 新規作成

1. `lib/auth.js` - 認証ロジックの基盤
2. `public/auth-reset-password.html` - パスワードリセット画面（オプション）

### 変更

1. `server.js` - パスワードリセットAPI、移行率確認APIを追加

---

## ⚠️ 注意事項

### 1. 現在のアプリケーションの設計

- 現在のアプリケーションは認証不要の設計
- Phase 1.6では、将来の認証機能実装に備えて基盤を実装する
- 実際のログイン機能は将来のフェーズで実装予定

### 2. 既存ユーザーの移行

- 既存ユーザーは`auth_provider = 'bcryptjs'`として設定済み（Phase 1.5）
- パスワードリセット機能により、段階的にSupabase Authに移行可能
- 移行率が100%に達した後、bcryptjs認証ロジックを削除可能

### 3. 移行完了の定義

- 移行率が100%に達した時点
- または、90日経過時点で移行していないユーザーを強制リセット

---

## 📚 関連ドキュメント

- `.ai/history/migrations/MIGRATION_EXECUTION_PLAN.md` - Phase 1.6詳細
- `lib/supabase.js` - Supabase Authクライアント（Phase 1.5で実装済み）
- `prisma/schema.prisma` - Prismaスキーマ（`auth_provider`, `supabaseUserId`追加済み）

---

**ドキュメント作成日**: 2026-01-02  
**作成者**: AI Assistant

