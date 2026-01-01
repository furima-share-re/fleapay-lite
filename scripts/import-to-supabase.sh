#!/bin/bash
# Supabase にデータをインポートするスクリプト（Bash版）
# 使用方法: ./scripts/import-to-supabase.sh <SUPABASE_DATABASE_URL> [DATA_DIR]

set -e

if [ $# -lt 1 ]; then
    echo "使用方法: $0 <SUPABASE_DATABASE_URL> [DATA_DIR]"
    echo "例: $0 'postgresql://postgres:pass@db.project.supabase.co:5432/postgres' ./dump"
    exit 1
fi

SUPABASE_DATABASE_URL="$1"
DATA_DIR="${2:-.}"

echo "📥 Supabaseへのデータインポートを開始します..."
echo "接続先: $SUPABASE_DATABASE_URL"

# インポート順序（親→子の順、外部キー制約を考慮）
TABLES=(
    "frames"
    "sellers"
    "orders"
    "order_items"
    "images"
    "stripe_payments"
    "qr_sessions"
    "buyer_attributes"
    "order_metadata"
    "kids_achievements"
)

IMPORTED_TABLES=()
FAILED_TABLES=()

for i in "${!TABLES[@]}"; do
    table="${TABLES[$i]}"
    CSV_FILE="$DATA_DIR/$table.csv"
    step=$((i + 1))
    total=${#TABLES[@]}
    
    if [ ! -f "$CSV_FILE" ]; then
        echo "  ⚠️  $table.csv が見つかりません。スキップします。"
        continue
    fi
    
    echo ""
    echo "  [$step/$total] $table をインポート中..."
    
    if psql "$SUPABASE_DATABASE_URL" -c "\COPY $table FROM STDIN WITH (FORMAT CSV, HEADER)" < "$CSV_FILE" 2>/dev/null; then
        echo "    ✅ $table のインポートが完了しました"
        IMPORTED_TABLES+=("$table")
    else
        echo "    ❌ $table のインポートに失敗しました"
        FAILED_TABLES+=("$table")
    fi
done

echo ""
echo "=================================================="
echo "インポート結果"
echo "=================================================="

if [ ${#IMPORTED_TABLES[@]} -gt 0 ]; then
    echo ""
    echo "✅ 成功したテーブル (${#IMPORTED_TABLES[@]}):"
    for table in "${IMPORTED_TABLES[@]}"; do
        echo "  - $table"
    fi
fi

if [ ${#FAILED_TABLES[@]} -gt 0 ]; then
    echo ""
    echo "❌ 失敗したテーブル (${#FAILED_TABLES[@]}):"
    for table in "${FAILED_TABLES[@]}"; do
        echo "  - $table"
    fi
    echo ""
    echo "⚠️  エラーログを確認し、手動でインポートしてください。"
else
    echo ""
    echo "✅ すべてのテーブルのインポートが完了しました！"
fi

echo ""
echo "次のステップ:"
echo "  1. Supabase SQL Editor でデータ整合性をチェック"
echo "  2. .env ファイルを更新して DATABASE_URL を Supabase に変更"
echo "  3. npx prisma db pull で Prisma スキーマを生成"

