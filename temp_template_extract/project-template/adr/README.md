# Architecture Decision Records (ADR)

このディレクトリには、**重要な意思決定の記録** を保存します。

## ADR とは

**Architecture Decision Record（アーキテクチャ決定記録）** は、
プロジェクトにおける重要な意思決定を記録するドキュメントです。

## なぜ必要か

### 理由1: コンテキストの保存
「なぜそうしたのか」は時間とともに忘れられます。
ADR により、当時の背景・制約・理由を未来に伝えます。

### 理由2: 変更の追跡
過去の決定を見直す際、なぜそうなったのかを理解できます。

### 理由3: チームの合意形成
重要な決定を文書化することで、チーム全体の合意を明確にします。

## ADR は正ではない

ADR は **正（Source of Truth）ではありません**。

- **ADR の役割**: 意思決定の根拠を記録
- **Truth の役割**: 数値・条件・制約を定義

### 分離の例

❌ 悪い例（ADR に数値を書く）:
```markdown
# ADR-0005: タイムアウト値の変更

タイムアウトを5秒に変更します。
```

✅ 良い例（ADR は理由のみ、数値は truth へ）:
```markdown
# ADR-0005: タイムアウト値の見直し

## Context
外部APIの応答が遅く、ユーザー体験が悪化している。

## Decision
タイムアウト値を見直し、適切な値を設定する。

## Consequences
- レスポンス改善が期待される
- 一部の長時間処理が失敗する可能性

## Related Truth
- truth/infra/limits.yml: timeouts.external_api.default
```

## ファイル命名規則

```
XXXX-short-title.md
```

- **XXXX**: 連番（0001, 0002, ...）
- **short-title**: 短いタイトル（kebab-case）

例:
- `0001-use-postgresql.md`
- `0002-introduce-cache-layer.md`
- `0003-change-retention-target.md`

## ADR のステータス

各 ADR には以下のいずれかのステータスを記載します：

- **Proposed（提案中）**: レビュー中
- **Accepted（承認済）**: 採用決定
- **Rejected（却下）**: 不採用
- **Superseded（置換済）**: 新しいADRに置き換えられた
- **Deprecated（非推奨）**: 今後使用しない

## いつ ADR を書くか

以下の場合は **必ず** ADR を作成してください：

### ✅ 必須（critical な truth 変更）

```yaml
# truth/_index.yml で impact_level: critical のファイル変更
files:
  core/kgi_kpi.yml:
    impact_level: "critical"  # ← この変更は ADR 必須
```

### ✅ 推奨（アーキテクチャ変更）

- データベースの選択
- フレームワークの選択
- 重要なライブラリの採用
- インフラ構成の大幅変更

### ✅ 推奨（ビジネスロジック変更）

- ユーザーフェーズ定義の変更
- 課金方式の変更
- 重要なアルゴリズムの変更

### ⚠️ 任意（小さな変更）

- バグ修正
- リファクタリング
- 軽微な最適化

## ADR テンプレート

`0001-template.md` を参照してください。

## ADR のレビュー

ADR は以下の観点でレビューします：

1. **背景が明確か** - なぜこの決定が必要か
2. **選択肢が検討されているか** - 代替案は何か
3. **影響が理解されているか** - 何が変わるか
4. **truth/spec との関連が明記されているか** - どのファイルが影響を受けるか

## ADR の検索

```bash
# 全ADRを一覧
ls -1 adr/*.md

# 特定トピックを検索
grep -r "timeout" adr/

# ステータス別に表示
grep -h "^## Status" adr/*.md
```

## 参照

- 数値・条件: `truth/**`
- 機械仕様: `spec/**`
- 説明・背景: `docs/**`
