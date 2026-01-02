#!/bin/bash
# Render PostgreSQL からスキーマとデータをダンプするスクリプト（Bash版）
# 使用方法: ./scripts/dump-render-db.sh <RENDER_DATABASE_URL> [OUTPUT_DIR]

set -e

if [ $# -lt 1 ]; then
    echo "使用方法: $0 <RENDER_DATABASE_URL> [OUTPUT_DIR]"
    echo "例: $0 'postgres://user:pass@host:5432/db' ./dump"
    exit 1
fi

RENDER_DATABASE_URL="$1"
OUTPUT_DIR="${2:-.}"

# 出力ディレクトリを作成
mkdir -p "$OUTPUT_DIR"

echo "📦 Render DBからのダンプを開始します..."
echo "接続先: $RENDER_DATABASE_URL"

# スキーマのみダンプ
echo ""
echo "[1/2] スキーマをダンプしています..."
SCHEMA_FILE="$OUTPUT_DIR/schema.sql"
if pg_dump "$RENDER_DATABASE_URL" --schema-only --no-owner --no-privileges -f "$SCHEMA_FILE"; then
    echo "✅ スキーマダンプ完了: $SCHEMA_FILE"
else
    echo "❌ スキーマダンプに失敗しました"
    exit 1
fi

# データをCSV形式でダンプ（テーブルごと）
echo ""
echo "[2/2] データをダンプしています..."

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

EXPORTED_TABLES=()

for table in "${TABLES[@]}"; do
    CSV_FILE="$OUTPUT_DIR/$table.csv"
    echo "  - $table をエクスポート中..."
    
    if psql "$RENDER_DATABASE_URL" -c "\COPY $table TO STDOUT WITH (FORMAT CSV, HEADER)" > "$CSV_FILE" 2>/dev/null; then
        echo "    ✅ $table.csv を作成しました"
        EXPORTED_TABLES+=("$table")
    else
        echo "    ⚠️  $table のエクスポートをスキップしました（テーブルが存在しない可能性があります）"
    fi
done

echo ""
echo "✅ ダンプ完了！"
echo ""
echo "生成されたファイル:"
echo "  - schema.sql"
for table in "${EXPORTED_TABLES[@]}"; do
    echo "  - $table.csv"
done

echo ""
echo "次のステップ:"
echo "  1. schema.sql を開き、CREATE EXTENSION、OWNER、GRANT/REVOKE行を削除"
echo "  2. Supabase SQL Editor で schema.sql を実行"
echo "  3. scripts/import-to-supabase.sh を使用してデータをインポート"

