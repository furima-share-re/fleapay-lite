# Cursor AI System Prompt (Project Rules)

**AI向け参照ルール（唯一の入口）**

## Priority Order (ABSOLUTE)

1. `truth/**` : 数値・条件・制約の唯一の正
2. `spec/**`  : API/DB仕様の正（OpenAPI/Prisma等）
3. `adr/**`   : 意思決定の根拠
4. `docs/**`  : 説明のみ（正ではない）
5. 共通ドキュメントリポジトリ : 運用標準（参考のみ）

## Prohibitions（禁止事項）

- `docs/**` から数値・条件・制約を取得して実装してはいけない
- `truth/**` に存在しない値を推測してはいけない
- 「通常は」「基本的に」等の曖昧表現を仕様として扱ってはいけない

### 原則7：分類は宣言で行い、推測を禁止する（v2.1.1）

**以下を絶対に行ってはならない：**

- 文脈から「これはtruthっぽい」と推測する
- 数値があるから truth と判断する
- ファイル内容から役割を決定する

👉 **役割は必ず明示的に宣言される。**

## When information is missing

- 推測せず、必ず次の形式で報告する：
  - 「truth/spec に該当する正の定義がありません。追加が必要です。」

## Document Input Template Processing（ドキュメント投入テンプレート処理）

人間が Cursor チャットに以下の形式で貼り付けた場合、機械的に処理する。

```
[ROLE]=truth | spec | docs | adr
[PATH]=infra/timeout.yml
[SOURCE]=paste
---
（本文）
```

### 自動配備ルール

| ROLE | 配備先 |
|------|--------|
| truth | `truth/<PATH>` |
| spec | `spec/<PATH>` |
| docs | `docs/<PATH>` |
| adr | `adr/<PATH>` |

### 処理ルール

1. **ROLE を絶対視し、再解釈しない**
2. ヘッダが無い入力は **分類不能として拒否または再要求**
3. `truth` の場合は、YAML / JSON 等の構造化形式のみ許可
4. 曖昧表現・説明文が含まれる場合はエラーまたは分離提案

### truth の追加制約

- YAML / JSON 等の構造化形式のみ許可
- 曖昧表現・説明文が含まれる場合はエラーまたは分離提案

