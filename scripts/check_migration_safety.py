#!/usr/bin/env python3
import re
import sys
from pathlib import Path

# ここはプロジェクトに合わせて増やしてOK
# Prisma / Alembic / SQL migrations を想定した候補
MIGRATION_DIR_CANDIDATES = [
    "migrations",
    "prisma/migrations",
    "backend/migrations",
    "supabase/migrations",
    "supabase/migrations.sql",
]

# 「追加のみDB」を壊す操作を検知して落とす
# なるべく広めに拾う（誤検知より安全側）
# 原則4: 永続データは人が触らない - 破壊的変更を完全に禁止
FORBIDDEN_PATTERNS = [
    # SQL系（Postgres想定）
    r"\bDROP\s+TABLE\b",
    r"\bDROP\s+COLUMN\b",
    r"\bALTER\s+TABLE\b.*\bDROP\s+COLUMN\b",
    r"\bRENAME\s+COLUMN\b",
    r"\bRENAME\s+TABLE\b",
    r"\bALTER\s+COLUMN\b.*\bTYPE\b",          # 型変更
    r"\bALTER\s+COLUMN\b.*\bSET\s+NOT\s+NULL\b",  # NOT NULL化（既存カラム）
    r"\bTRUNCATE\b",
    r"\bDELETE\s+FROM\b",                     # データ削除（マイグレーションでは禁止）
    r"\bUPDATE\s+\w+\s+SET\b",                # データ更新（マイグレーションでは原則禁止、例外は明示的に許可）

    # Alembic（Python）
    r"\bop\.drop_table\b",
    r"\bop\.drop_column\b",
    r"\bop\.alter_column\b.*\btype_\b",      # type_ パラメータ指定
    r"\bop\.alter_column\b.*\bnullable\s*=\s*False\b",
    r"\bop\.execute\(\s*[\"']\s*DROP\s+TABLE\b",
    r"\bop\.execute\(\s*[\"']\s*ALTER\s+TABLE\b.*\bDROP\s+COLUMN\b",
]

# 例外パターン: データ移行や初期化のためのUPDATEは許可（明示的にコメントで許可を記載）
# 例: -- ALLOWED: データ移行のためのUPDATE
ALLOWED_EXCEPTION_PATTERN = r"--\s*ALLOWED:\s*(データ移行|初期化|マイグレーション)"

ALLOWED_EXTENSIONS = {".sql", ".py", ".ts", ".js"}  # migrationが入ってそうな拡張子

# マイグレーションファイルの命名規則: YYYYMMDD_HHMMSS_description.sql
MIGRATION_NAME_PATTERN = re.compile(r"^\d{8}_\d{6}_[a-z0-9_]+\.sql$", re.IGNORECASE)

def find_migration_files(repo_root: Path) -> list[Path]:
    files: list[Path] = []
    for c in MIGRATION_DIR_CANDIDATES:
        p = repo_root / c
        if p.is_file():
            if p.suffix.lower() in ALLOWED_EXTENSIONS:
                files.append(p)
        elif p.is_dir():
            for f in p.rglob("*"):
                if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS:
                    files.append(f)
    # 重複除去
    uniq = sorted(set(files))
    return uniq

def scan_file(path: Path) -> list[tuple[str, str]]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    hits: list[tuple[str, str]] = []
    
    # 例外パターンをチェック（ファイル全体に許可コメントがあるか）
    has_exception = bool(re.search(ALLOWED_EXCEPTION_PATTERN, text, flags=re.IGNORECASE))
    
    for pat in FORBIDDEN_PATTERNS:
        matches = list(re.finditer(pat, text, flags=re.IGNORECASE | re.DOTALL))
        for match in matches:
            # 例外パターンがある場合、その行の前後をチェック
            if has_exception:
                # マッチした行の前後50文字をチェック
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 50)
                context = text[start:end]
                # コンテキスト内に許可コメントがある場合はスキップ
                if re.search(ALLOWED_EXCEPTION_PATTERN, context, flags=re.IGNORECASE):
                    continue
            hits.append((str(path), pat))
    return hits

def validate_migration_naming(files: list[Path]) -> list[str]:
    """マイグレーションファイルの命名規則を検証"""
    errors: list[str] = []
    for f in files:
        if f.suffix.lower() == ".sql":
            # supabase/migrations/ ディレクトリ内のファイルのみ命名規則をチェック
            if "supabase" in f.parts and "migrations" in f.parts:
                filename = f.name
                if not MIGRATION_NAME_PATTERN.match(filename):
                    errors.append(
                        f"❌ 命名規則違反: {f}\n"
                        f"   正しい形式: YYYYMMDD_HHMMSS_description.sql\n"
                        f"   例: 20250115_120000_add_payment_state.sql"
                    )
    return errors

def main() -> int:
    root = Path(".").resolve()
    files = find_migration_files(root)

    # migrations がまだ無い段階ではスキップ（CIを無駄に落とさない）
    if not files:
        print("✅ No migration files found. Skip migration safety check.")
        return 0

    # 命名規則の検証
    naming_errors = validate_migration_naming(files)
    if naming_errors:
        print("❌ Migration naming validation failed:")
        for error in naming_errors:
            print(error)
        print("\nFix: Rename migration files to follow the pattern: YYYYMMDD_HHMMSS_description.sql")
        return 1

    # 破壊的変更の検証
    bad: list[tuple[str, str]] = []
    for f in files:
        bad.extend(scan_file(f))

    if bad:
        print("❌ Forbidden DB migration operations detected (Add-only DB violated):")
        for file, pat in bad:
            print(f" - {file}  matched: {pat}")
        print("\nFix: convert changes into ADD-only (add new column/table/view), no drop/rename/type change/not-null.")
        print("Exception: If data migration is required, add comment: -- ALLOWED: データ移行")
        return 1

    print("✅ Migration safety check passed.")
    print("✅ Migration naming validation passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
