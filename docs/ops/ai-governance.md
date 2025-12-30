# AI Governance: Truth Consistency & Generative Validation

## 概要

本リポジトリでは、AI駆動開発における「正（Source of Truth）の保護」を構造的に実現するため、Phase 0-5 の段階的なガバナンス体制を構築しています。

## 思想・原則

### 1. Source of Truth の明確化

**正（Source of Truth）は以下のみ：**

- `truth/**`: 数値・条件・制約の唯一の正
- `spec/**`: API/DB等の機械仕様の正（OpenAPI/Prisma等）

`docs/**` は説明用であり、**正ではありません**。数値・条件・制約を `docs/` に書いてはいけません。

### 2. 既存仕様の保護（デグレ防止）

- **既存仕様の変更・削除は禁止**（追加のみ許可）
- 振る舞いが変わる可能性がある場合は必ず事前に指摘
- 「より良い」「簡単」「一般的」などの理由での改変は禁止

👉 これは **デグレ＝失敗** と定義します。

### 3. 構造的品質保証

人間の注意力に依存せず、構造的に品質を保証する仕組みを構築します。

## Phase 別の実装

### Phase 0-1: 構造完成

- `truth/` と `spec/` の分離
- `truth/_index.yml` による依存関係管理
- `docs/` の役割明確化

### Phase 2: CI ガード

- Deterministic テスト（`tests/truth-consistency.deterministic.test.ts`）
- PRごとの自動検証
- `truth/_index.yml` の整合性チェック

### Phase 3: Generative 検証

- 週次での Generative Truth Consistency Test
- サンプリングベースの誤認検出
- Artifact による結果保存

### Phase 4: 誤認原因の自動分析

- Root cause analysis（`scripts/generative-rootcause.cjs`）
- エラータイプ別集計
- 推奨事項の自動生成

### Phase 5: 誤認率ベースのCIブロック

- PRでの critical/high impact truth 変更時の自動検証
- `OPENAI_API_KEY` 未設定時の保護
- Mismatch 検出時の自動ブロック

## ガードの意味

### なぜガードが必要か

1. **AIの誤認を構造的に防ぐ**
   - AIが生成するコード・ドキュメントが truth と矛盾しないことを保証
   - 人間のレビューだけでは見落としが発生する

2. **デグレの早期検知**
   - 既存仕様の変更を検知
   - 依存関係の不整合を自動検出

3. **意思決定の根拠提供**
   - 誤認率の数値化
   - impact_level 別の傾向分析

### ガードの動作

**Phase 5（Generative Guard）の動作：**

1. PRで `truth/**` が変更された場合に自動実行
2. `impact_level: "critical"` または `"high"` のファイルが変更された場合のみ検証
3. `OPENAI_API_KEY` が未設定の場合：fail（保護）
4. Generative consistency check を実行
5. Mismatch が1件でも検出された場合：fail（ブロック）

## truth / spec / docs の役割

### truth/

- **役割**: 数値・条件・制約の唯一の正
- **形式**: YAML
- **管理**: `truth/_index.yml` で依存関係・影響範囲を管理
- **変更**: 既存仕様の変更・削除は禁止（追加のみ）

### spec/

- **役割**: API/DB等の機械仕様の正
- **形式**: OpenAPI/Prisma等の機械可読形式
- **管理**: バージョン管理
- **検証**: OpenAPI validation を CI で実行

### docs/

- **役割**: 説明（背景・意図・運用手順）
- **制約**: 数値・条件・制約を書いてはいけない
- **参照**: `truth/` や `spec/` への参照のみ許可
- **検証**: CI で `docs/` への数値混入を検知

## メトリクス・可視化

### 週次メトリクス

`metrics/metrics-YYYY-MM-DD.json` に以下を記録：

- 誤認発生率（全体・impact_level別）
- Top offenders（誤認が多い truth ファイル）
- 傾向分析用のデータ

### 意思決定への活用

- **誤認率の閾値設定**: Phase 5 のガード閾値をデータで調整
- **優先順位の決定**: impact_level 別の誤認頻度から優先度を判断
- **改善効果の測定**: 誤認率の推移で改善効果を可視化

## 横展開時の注意点

### コピーではなく理解

横展開時は、このリポジトリを「参照実装（Golden Repo）」として扱い、以下を理解した上で適用してください：

1. **思想の理解**: なぜこの構造が必要か
2. **Phase の段階的導入**: Phase 0-1 から順に構築
3. **既存仕様の保護**: デグレ防止原則の徹底

### 準備すべきこと

- `truth/_index.yml` の構築
- `spec/` の整備（OpenAPI等）
- CI/CD パイプラインの構築

## 関連ファイル

- `.ai/system-prompt.md`: AI向けルール
- `README.md`: 秩序宣言（憲法）
- `truth/_index.yml`: truth ファイルの依存関係管理
- `.github/workflows/truth-consistency-weekly.yml`: 週次検証
- `.github/workflows/generative-guard.yml`: PRガード

## 参考

- Phase 3-5 の実装詳細は各スクリプトのコメントを参照
- メトリクスの見方は `metrics/` 配下の JSON ファイルを参照

