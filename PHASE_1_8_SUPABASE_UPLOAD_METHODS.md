# Phase 1.8: Supabaseへのデータ移行方法の比較

**作成日**: 2026-01-04  
**目的**: Supabaseへのデータ移行方法を比較し、最適な方法を選択

---

## 📋 データ移行方法の比較

### 方法A: pg_restoreコマンドを使用（推奨）⭐

**対象**: `.dir.tar.gz`形式のファイル（PostgreSQLカスタム形式）

**手順**:
1. Exportファイルを展開
2. `pg_restore`コマンドでインポート

**メリット**:
- ✅ 完全なデータベース構造を保持
- ✅ インデックス、制約、トリガーなども含まれる
- ✅ 大規模データに対応
- ✅ データ整合性が保証される

**デメリット**:
- ❌ PostgreSQLクライアントツールが必要
- ❌ コマンドライン操作が必要

**所要時間**: 1-3時間（データ量による）

---

### 方法B: Supabase Dashboardから直接アップロード（できない）❌

**結論**: **Supabase Dashboardには`.dir.tar.gz`形式のファイルを直接アップロードする機能はありません。**

**理由**:
- Supabase DashboardのSQL EditorはSQLスクリプトのみ実行可能
- `.dir.tar.gz`形式はPostgreSQLのカスタム形式（バイナリ形式）のため、SQL Editorでは実行できない
- Table EditorはCSV形式のみ対応

**代替方法**:
- Supabase CLIを使用（ただし、これも`pg_restore`を使用する）

---

### 方法C: Supabase SQL EditorでSQLを実行（小規模データ向け）

**対象**: `.sql`形式のファイル（SQLスクリプト形式）

**手順**:
1. `.sql`形式のファイルを準備（`pg_dump`で`-Fp`形式でダンプ）
2. Supabase SQL Editorで実行

**メリット**:
- ✅ GUI操作で簡単
- ✅ PostgreSQLクライアントツールが不要

**デメリット**:
- ❌ 小規模データに限定（SQL Editorのタイムアウト制限）
- ❌ 大規模データには不向き
- ❌ 現在のファイル（`.dir.tar.gz`形式）は使用できない

**所要時間**: 30分-1時間（小規模データの場合）

---

### 方法D: Supabase Table EditorでCSVインポート（小規模データ向け）

**対象**: CSV形式のファイル

**手順**:
1. データをCSV形式でエクスポート
2. Supabase Table Editorで各テーブルごとにインポート

**メリット**:
- ✅ GUI操作で簡単
- ✅ PostgreSQLクライアントツールが不要

**デメリット**:
- ❌ テーブルごとに手動でインポートが必要
- ❌ 外部キー制約を考慮した順序でインポートする必要がある
- ❌ 大規模データには不向き
- ❌ 現在のファイル（`.dir.tar.gz`形式）は使用できない

**所要時間**: 2-4時間（テーブル数による）

---

## 🎯 推奨方法

### 現在の状況

- **ファイル形式**: `.dir.tar.gz`形式（PostgreSQLカスタム形式）
- **ファイルサイズ**: 約69MB（中規模データ）
- **データ量**: 約10,000-100,000レコード程度と推定

### 推奨: 方法A（pg_restoreコマンドを使用）

**理由**:
1. ✅ 現在のファイル形式に対応
2. ✅ データ整合性が保証される
3. ✅ インデックス、制約、トリガーなども含まれる
4. ✅ 中規模データに対応
5. ✅ 一度のコマンドで完了

---

## 🔄 代替方法: SQL形式に変換する場合

もしSupabase Dashboardから直接アップロードしたい場合、以下の方法があります：

### 方法1: pg_dumpでSQL形式に変換

```powershell
# 現在のファイルを展開
cd tmp
tar -zxvf 2026-01-03T15_42Z.dir.tar.gz

# SQL形式に変換（pg_restoreを使用）
pg_restore --file=prod_backup.sql tmp/2026-01-03T15:42Z/fleapay_prod_db
```

**注意**: 
- SQL形式に変換すると、ファイルサイズが大きくなる可能性があります
- SQL Editorのタイムアウト制限があるため、大規模データには不向きです

---

### 方法2: Supabase CLIを使用

```powershell
# Supabase CLIをインストール
npm install -g supabase

# Supabaseにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref xxxxx

# バックアップをインポート
supabase db restore tmp/2026-01-03T15_42Z.dir.tar.gz
```

**注意**: 
- Supabase CLIも内部的に`pg_restore`を使用します
- コマンドライン操作が必要です

---

## 📊 方法別の比較表

| 方法 | GUI操作 | ファイル形式 | データサイズ | 所要時間 | 推奨度 |
|------|---------|-------------|------------|---------|--------|
| **方法A: pg_restore** | ❌ | `.dir.tar.gz` | 大規模対応 | 1-3時間 | ⭐⭐⭐⭐⭐ |
| **方法B: Dashboard直接アップロード** | ✅ | ❌ 不可 | - | - | ❌ |
| **方法C: SQL Editor** | ✅ | `.sql` | 小規模のみ | 30分-1時間 | ⭐⭐⭐ |
| **方法D: Table Editor CSV** | ✅ | `.csv` | 小規模のみ | 2-4時間 | ⭐⭐ |
| **方法2: Supabase CLI** | ❌ | `.dir.tar.gz` | 大規模対応 | 1-3時間 | ⭐⭐⭐⭐ |

---

## ✅ 結論

**Supabase Dashboardから直接`.dir.tar.gz`形式のファイルをアップロードすることはできません。**

**推奨方法**:
1. **方法A: pg_restoreコマンドを使用**（最も確実で推奨）
2. **方法2: Supabase CLIを使用**（GUI操作を避けたい場合）

**現在のファイル（`.dir.tar.gz`形式）を使用する場合、コマンドライン操作が必要です。**

---

## 🚀 次のステップ

**方法A（pg_restore）を推奨します**。詳細な手順は `PHASE_1_8_STEP4_DATA_MIGRATION.md` を参照してください。

**もしGUI操作を希望する場合**:
1. ファイルをSQL形式に変換（`pg_restore --file=prod_backup.sql`）
2. Supabase SQL Editorで実行（ただし、タイムアウトのリスクあり）

