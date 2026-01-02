#!/bin/bash
# デプロイ状態確認スクリプト（Bash版）
# 使用方法: ./scripts/check-deployment-status.sh [BASE_URL]

set -e

BASE_URL="${1:-https://fleapay-lite-t1.onrender.com}"

echo "🔍 デプロイ状態を確認しています..."
echo ""

# 1. ローカルの最新コミット情報を取得
echo "📋 ローカルの最新コミット情報:"
if command -v git &> /dev/null; then
    LOCAL_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    LOCAL_DATE=$(git log -1 --format="%ci" HEAD 2>/dev/null || echo "unknown")
    LOCAL_MESSAGE=$(git log -1 --format="%s" HEAD 2>/dev/null || echo "unknown")
    
    if [ "$LOCAL_COMMIT" != "unknown" ]; then
        echo "  コミットハッシュ: $LOCAL_COMMIT"
        echo "  コミット日時: $LOCAL_DATE"
        echo "  コミットメッセージ: $LOCAL_MESSAGE"
    else
        echo "  ⚠️ Git情報の取得に失敗しました"
    fi
else
    echo "  ⚠️ Gitがインストールされていません"
    LOCAL_COMMIT="unknown"
fi

echo ""

# 2. 検証環境のAPIからバージョン情報を取得
echo "🌐 検証環境のデプロイ状態を確認中..."

if ! command -v curl &> /dev/null; then
    echo "  ❌ curlがインストールされていません"
    exit 1
fi

RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/ping" || echo -e "\n000")
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" != "200" ]; then
    echo "  ❌ サーバーへの接続に失敗しました (HTTP $HTTP_CODE)"
    exit 1
fi

# JSONをパース（jqが利用可能な場合）
if command -v jq &> /dev/null; then
    VERSION=$(echo "$HTTP_BODY" | jq -r '.version // "unknown"')
    PRISMA=$(echo "$HTTP_BODY" | jq -r '.prisma // "unknown"')
    GIT_COMMIT=$(echo "$HTTP_BODY" | jq -r '.git.commit // "unknown"')
    GIT_DATE=$(echo "$HTTP_BODY" | jq -r '.git.date // "unknown"')
else
    # jqが利用できない場合はgrepで簡易的に抽出
    VERSION=$(echo "$HTTP_BODY" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    PRISMA=$(echo "$HTTP_BODY" | grep -o '"prisma":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    GIT_COMMIT=$(echo "$HTTP_BODY" | grep -o '"commit":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    GIT_DATE=$(echo "$HTTP_BODY" | grep -o '"date":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
fi

echo "  ✅ サーバーは正常に応答しています"
echo "  バージョン: $VERSION"
echo "  Prisma状態: $PRISMA"

# Gitコミット情報の確認
if [ "$GIT_COMMIT" != "unknown" ] && [ -n "$GIT_COMMIT" ]; then
    echo "  ✅ Gitコミット情報が含まれています"
    echo "  デプロイ済みコミット: $GIT_COMMIT"
    echo "  デプロイ日時: $GIT_DATE"
    
    # ローカルのコミットハッシュと比較
    if [ "$LOCAL_COMMIT" != "unknown" ] && [ -n "$LOCAL_COMMIT" ]; then
        LOCAL_SHORT=$(echo "$LOCAL_COMMIT" | cut -c1-7)
        if [ "$GIT_COMMIT" = "$LOCAL_SHORT" ]; then
            echo "  ✅ ローカルのコミットハッシュと一致しています"
            echo ""
            echo "✅ デプロイ状態確認完了"
            exit 0
        else
            echo "  ⚠️ ローカルのコミットハッシュと一致しません"
            echo "     ローカル: $LOCAL_SHORT"
            echo "     検証環境: $GIT_COMMIT"
            echo ""
            echo "  ❌ 最新のコードがデプロイされていません"
            exit 1
        fi
    fi
else
    echo "  ⚠️ Gitコミット情報が含まれていません"
    echo "     デプロイ環境でGitが利用できない可能性があります"
    exit 1
fi

