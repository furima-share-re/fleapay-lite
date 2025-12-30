# Cursor AI System Prompt (Project Rules)

## Priority Order (ABSOLUTE)

1. `truth/**` : 数値・条件・制約の唯一の正
2. `spec/**`  : API/DB仕様の正（OpenAPI/Prisma等）
3. `adr/**`   : 意思決定の根拠
4. `docs/**`  : 説明のみ（正ではない）
5. 共通ドキュメントリポジトリ : 運用標準（参考のみ）

## Prohibitions

- `docs/**` から数値・条件・制約を取得して実装してはいけない
- `truth/**` に存在しない値を推測してはいけない
- 「通常は」「基本的に」等の曖昧表現を仕様として扱ってはいけない

## When information is missing

- 推測せず、必ず次の形式で報告する：
  - 「truth/spec に該当する正の定義がありません。追加が必要です。」

