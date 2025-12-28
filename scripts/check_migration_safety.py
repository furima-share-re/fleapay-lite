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
FORBIDDEN_PATTERNS = [
    # SQL系（Postgres想定）
    r"\bDROP\s+TABLE\b",
    r"\bDROP\s+COLUMN\b",
    r"\bALTER\s+TABLE\b.*\bDROP\s+COLUMN\b",
    r"\bRENAME\s+COLUMN\b",
    r"\bALTER\s+COLUMN\b.*\bTYPE\b",          # 型変更
    r"\bALTER\s+COLUMN\b.*\bSET\s+NOT\s+NULL\b",  # NOT NULL化
    r"\bTRUNCATE\b",

    # Alembic（Python）
    r"\bop\.drop_table\b",
    r"\bop\.drop_column\b",
    r"\bop\.alter_column\b.*\btype_\b",      # type_ パラメータ指定
    r"\bop\.alter_column\b.*\bnullable\s*=\s*False\b",
    r"\bop\.execute\(\s*[\"']\s*DROP\s+TABLE\b",
    r"\bop\.execute\(\s*[\"']\s*ALTER\s+TABLE\b.*\bDROP\s+COLUMN\b",
]

ALLOWED_EXTENSIONS = {".sql", ".py", ".ts", ".js"}  # migrationが入ってそうな拡張子

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
    for pat in FORBIDDEN_PATTERNS:
        if re.search(pat, text, flags=re.IGNORECASE | re.DOTALL):
            hits.append((str(path), pat))
    return hits

def main() -> int:
    root = Path(".").resolve()
    files = find_migration_files(root)

    # migrations がまだ無い段階ではスキップ（CIを無駄に落とさない）
    if not files:
        print("✅ No migration files found. Skip migration safety check.")
        return 0

    bad: list[tuple[str, str]] = []
    for f in files:
        bad.extend(scan_file(f))

    if bad:
        print("❌ Forbidden DB migration operations detected (Add-only DB violated):")
        for file, pat in bad:
            print(f" - {file}  matched: {pat}")
        print("\nFix: convert changes into ADD-only (add new column/table/view), no drop/rename/type change/not-null.")
        return 1

    print("✅ Migration safety check passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
