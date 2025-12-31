# Project Name

## AI Governance（社内標準）

本プロジェクトは社内標準  
**AI Structural Governance Standard（ASGS）v1.0**  
に準拠します。

### Source of Truth

このリポジトリにおける **正（Source of Truth）** は以下のみです。

1. **`truth/**`** - 数値・条件・制約の唯一の正
2. **`spec/**`** - API / DB 等の機械仕様

`docs/**` は説明用であり **正ではありません**。  
数値・条件・制約を書いてはいけません。

### AI Behavior

- AI は `truth/**` と `spec/**` を最優先で参照します
- 推測は禁止され、CI により自動検知・防止されます

参照標準（社内限定）:  
`asgs-internal/standard/ASGS_v1.0.md`

---

## ディレクトリ構成

```
project-template/
├─ README.md                 # このファイル
├─ .ai/
│   └─ system-prompt.md      # AI向けシステムプロンプト
│
├─ docs/                     # 説明・背景（正ではない）
│   ├─ README.md
│   ├─ strategy/             # 戦略・方針
│   ├─ feature/              # 機能説明
│   ├─ analysis/             # 分析資料
│   └─ persona/              # ペルソナ定義
│
├─ truth/                    # 数値・条件・制約（正）
│   ├─ README.md
│   ├─ _index.yml            # truth ファイル索引
│   ├─ core/                 # 事業中核指標
│   │   └─ kgi_kpi.yml
│   ├─ business/             # ビジネスロジック
│   │   └─ phases.yml
│   ├─ ugc/                  # UGC関連メトリクス
│   │   └─ ugc_metrics.yml
│   └─ infra/                # インフラ制約
│       └─ limits.yml
│
├─ spec/                     # 機械仕様（正）
│   ├─ README.md
│   └─ openapi.yml           # API仕様
│
└─ adr/                      # Architecture Decision Records
    ├─ README.md
    └─ 0001-template.md
```

## Getting Started

### 1. プロジェクト情報を更新

- このREADMEのプロジェクト名を変更
- `truth/_index.yml` にプロジェクト固有の値を記載

### 2. CI/CDを設定

```bash
# GitHub Actionsワークフローをコピー（別途提供）
cp -r templates/github/workflows .github/
```

### 3. 開発開始

- `truth/**` に必要な数値・制約を定義
- `spec/**` にAPI仕様を記載
- `docs/**` に説明・背景を記載（数値は書かない）

## ルール

### ✅ DO

- 数値・条件・制約は `truth/**` に書く
- API仕様は `spec/**` に書く
- 説明・背景は `docs/**` に書く
- 重要な意思決定は `adr/**` に記録

### ❌ DON'T

- `docs/**` に数値・条件・制約を書かない
- `truth/**` `spec/**` に曖昧な表現を使わない
- AIに推測させない

## License

[Your License Here]
