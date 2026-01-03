# 変更履歴アーカイブ（Change History Archive）

このディレクトリは、AIの誤認を防ぐために、プロジェクトの変更履歴や差分ファイルを保存する場所です。

## 目的

ASGS（AI Structural Governance Standard）のルールに従い、`.ai/` フォルダは「AI向けルール（参照優先順位）」を保存する場所です。変更履歴や差分ファイルは、AIが過去の変更内容を参照して誤認を避けるために重要な情報源となります。

## ディレクトリ構成

```
.ai/history/
├── migrations/     # マイグレーション関連の変更履歴
├── fixes/          # 修正・デバッグ関連の変更履歴
├── setup/           # セットアップ・初期化関連の変更履歴
├── verification/    # 検証・テスト関連の変更履歴
├── sql/             # SQLスクリプト・スキーマ変更履歴
└── reports/         # レポート・分析結果
```

## 分類ルール

### migrations/
- `MIGRATION_*.md` - マイグレーション実行計画・進捗
- `DATA_MIGRATION_*.md` - データマイグレーション関連
- `SUPABASE_MIGRATION_*.md` - Supabaseマイグレーション関連
- `TECH_STACK_MIGRATION_*.md` - 技術スタック移行関連

### fixes/
- `FIX_*.md` - バグ修正・問題解決
- `QUICK_FIX_*.sql` - 緊急修正SQL
- `DEBUG_*.md` - デバッグ関連
- `CORRECT_*.md` - 修正関連
- `CONNECTION_*.md` - 接続関連の修正
- `QR_CODE_*.md` - QRコード関連の修正
- `SELECT_*.md`, `USE_*.md`, `SERVER_*.md` - その他の修正

### setup/
- `SETUP_*.md` - セットアップ手順
- `CREATE_*.md` - 作成・初期化関連
- `RUN_*.md` - 実行手順
- `RENDER_*.md` - Render関連セットアップ
- `SUPABASE_*.md` - Supabase関連セットアップ
- `QUICK_START_*.md` - クイックスタートガイド
- `NODEJS_*.md`, `POWERSHELL_*.md`, `MANUAL_*.md` - 各種セットアップ
- `PROD_*.md` - 本番環境関連

### verification/
- `VERIFICATION_*.md` - 検証結果
- `STAGING_VERIFICATION_*.md` - ステージング環境検証
- `CHECK_*.md` - チェック結果
- `VERIFY_*.md` - 検証手順
- `ACTION_*.md` - アクション検証
- `DEGRADATION_*.md` - 劣化検証
- `UI_*.md` - UI検証

### sql/
- `*.sql` - SQLスクリプト・スキーマ定義

### reports/
- `*_REPORT.md` - 各種レポート
- `*_ANALYSIS.md` - 分析結果
- `*_SUMMARY.md` - サマリー
- `template-*.md` - テンプレート関連レポート
- `asgs-compliance-check.md` - ASGS準拠チェック
- `SOURCE_DOCUMENT_*.md` - ソースドキュメント整合性
- `TECH_STACK_CONSISTENCY_*.md` - 技術スタック整合性
- `REVIEW_*.md`, `PRE_REVIEW_*.md` - レビュー関連
- `PHASE_*.md` - フェーズ関連レポート
- `DATA_DRIVEN_*.md` - データ駆動関連レポート

## 使用目的

これらのファイルは、AIが以下を理解するために参照されます：

1. **過去の変更内容** - どのような変更が行われたか
2. **問題解決の履歴** - どのように問題が解決されたか
3. **マイグレーション手順** - データベースやシステムの移行方法
4. **検証結果** - 過去の検証で何が確認されたか

## 注意事項

- これらのファイルは**参照用**であり、`truth/` や `spec/` のような「正」ではありません
- AIはこれらのファイルを参照して誤認を避けますが、実装判断は `truth/` と `spec/` を最優先とします
- 新しい変更履歴ファイルは、このディレクトリ構造に従って適切なサブディレクトリに保存してください

## 更新履歴

- 2026-01-02: 初期ディレクトリ構造作成、カレントディレクトリの差分ファイルを整理
- 2026-01-03: ルートディレクトリの変更履歴ファイルを整理し、適切なサブディレクトリに移動

