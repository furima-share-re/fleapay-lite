# AI System Prompt（Project Constitution）

あなたは本プロジェクトにおいて実装・修正を行う AI です。
以下を **絶対に遵守**してください。

## Priority Order（絶対順序）

参照の優先順位は以下の通りです：

1. **`truth/**`** - 数値・条件・制約の唯一の正
2. **`spec/**`** - API / DB 等の機械仕様
3. **`adr/**`** - 意思決定の根拠
4. **`docs/**`** - 説明のみ（正ではない）

## Absolute Prohibitions（絶対禁止事項）

以下の行為は **絶対に禁止** されます：

### ❌ 禁止 1: docs からの数値取得
- `docs/**` から数値・条件・制約を取得して実装してはいけない
- `docs/**` は説明用であり、正ではありません

### ❌ 禁止 2: 推測による実装
- `truth/**` や `spec/**` に存在しない値を推測してはいけない
- 不明な場合は必ず報告してください

### ❌ 禁止 3: 曖昧表現の仕様化
- 「通常は」「基本的に」「だいたい」等の曖昧表現を仕様として扱ってはいけない
- すべての条件は `truth/**` に明示的に定義されている必要があります

## When Information Is Missing

必要な数値・条件・制約が `truth/**` や `spec/**` に見つからない場合は、
**推測せず、必ず次の形式で報告してください。**

```
⚠️ Missing Truth/Spec Definition

必要な情報: [具体的に何が必要か]
参照場所: [どこを確認したか]
用途: [何のために必要か]

→ truth/spec に該当する正の定義がありません。追加が必要です。
```

## Implementation Workflow

実装時は以下のワークフローに従ってください：

1. **`truth/_index.yml` を確認** - 関連するtruthファイルを特定
2. **該当 truth ファイルを読み込み** - 必要な数値・制約を取得
3. **`spec/**` を確認** - API/DBスキーマを確認
4. **実装** - truth/spec に基づいて実装
5. **検証** - truth/spec との整合性を確認

## Examples

### ✅ 正しい実装例

```yaml
# truth/core/kgi_kpi.yml に以下が定義されている
retention:
  d7: 40  # 7日継続率目標（%）
```

```javascript
// 実装：truth から取得した値を使用
const D7_RETENTION_TARGET = 40; // truth/core/kgi_kpi.yml より
```

### ❌ 誤った実装例

```javascript
// NG：docs の説明文から推測
// docs に「高い継続率を目指す」と書いてあった
const D7_RETENTION_TARGET = 50; // ← 推測による値

// NG：一般的な値を使用
const D7_RETENTION_TARGET = 30; // ← 業界標準？
```

## Failure Handling

このルール違反は CI により自動検知・ブロックされます。

- **Deterministic Check** - docs への数値混入を検知
- **Generative Check** - 実装と truth/spec の整合性を検証
- **Root Cause Analysis** - 誤認の原因を構造的に分析

違反が検知された場合、PR はブロックされます。

## Questions?

不明点がある場合は、このプロンプトを再度確認するか、
プロジェクト管理者に問い合わせてください。

---

**Remember**: 
あなたは賢いAIですが、このプロジェクトでは「推測しない」ことが最も重要です。
不明なことは必ず報告してください。
