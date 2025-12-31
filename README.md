# fleapay-lite

**― 秩序宣言（憲法）―**

> 本READMEは「読むための文書」ではなく「秩序宣言」である。

## AI Governance（社内標準）

本プロジェクトは社内標準 **ASGS v1.0（AI Structural Governance Standard）** に準拠します。

- 正（Source of Truth）は **`truth/**` と `spec/**` のみ**
- `docs/**` は説明であり正ではありません（数値・条件・制約を書かない）
- `adr/**` は意思決定の根拠です

標準（社内限定）: asgs-internal /standard/ASGS_v1.0.md

## Source of Truth Declaration（正の宣言）

このリポジトリにおける **正（Source of Truth）** は以下のみです。

1. `truth/**`（数値・条件・制約の唯一の正）
2. `spec/**`（API/DB等の機械仕様の正）

`docs/**` は説明用であり **正ではありません**。  
`docs/**` に数値・条件・制約を書いてはいけません（違反はCIで検知対象）。

また、全プロダクト共通のドキュメントリポジトリは **運用標準**であり、  
本リポジトリの正ではありません（参照のみ）。

## Directory Roles（役割）

- `docs/` : 説明（背景・意図・運用手順）※正ではない
  - `docs/99_archive/` : 生成物・説明用資料（HTML等）※いかなる正・仕様の根拠にもならない
- `truth/` : 正（数値・条件・制約）※唯一の正
- `spec/` : 機械仕様（OpenAPI/Prisma等）※機械可読形式のみ
- `adr/` : 意思決定ログ（なぜそうしたか）
- `.ai/` : AI向けルール（参照優先順位）

## Entry Points（入口）

**人間とAIは、異なる入口から同一世界に入る。**

| 主体 | 唯一の入口 |
|------|-----------|
| 人間 | `docs/00_index.md` |
| AI | `.ai/system-prompt.md` |
| 正 | `truth/_index.yml` |

**入口以外の構造理解を人間にもAIにも要求してはならない。**

## Priority Order（矛盾時の優先順位）

1. `truth/**` : 数値・条件・制約の唯一の正
2. `spec/**` : API/DB仕様の正（OpenAPI/Prisma等）
3. `adr/**` : 意思決定の根拠
4. `docs/**` : 説明のみ（正ではない）

## How to read（読み方）

1. まず `truth/**` と `spec/**` を読む（断言・仕様）
2. 次に `adr/**` を読む（根拠）
3. 最後に `docs/**` を読む（背景理解のみ）

## Document Input Template（ドキュメント投入テンプレート）

Cursor チャット経由でドキュメントを投入する際は、以下の3行ヘッダを付ける。

```
[ROLE]=truth | spec | docs | adr
[PATH]=infra/timeout.yml
[SOURCE]=paste
---
（本文）
```

**ルール：**
- 人間が行う判断は **ROLE と PATH の選択のみ**
- AIは ROLE を絶対視し、再解釈しない
- ヘッダが無い入力は **分類不能として拒否または再要求**
