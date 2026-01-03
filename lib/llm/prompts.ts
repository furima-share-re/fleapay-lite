// lib/llm/prompts.ts
// Langfuse統合 - プロンプト管理（設計書5.5章準拠）

import { Langfuse } from 'langfuse';

/**
 * Langfuseクライアント（プロンプト管理用）
 * 
 * 設計書要件:
 * - プロンプトのバージョン管理
 * - Web UIで編集可能（コードデプロイ不要）
 * - A/Bテスト機能
 * - 履歴追跡
 */
let langfuse: Langfuse | null = null;

function getLangfuseClient(): Langfuse | null {
  if (langfuse) {
    return langfuse;
  }

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com';

  if (!publicKey || !secretKey) {
    console.warn('Langfuse credentials not configured. Prompt management disabled.');
    return null;
  }

  langfuse = new Langfuse({
    publicKey,
    secretKey,
    baseURL: host,
  });

  return langfuse;
}

/**
 * Langfuseからプロンプトを取得
 * 
 * @param promptName プロンプト名（Langfuseで管理されている名前）
 * @param variables プロンプト変数（動的に埋め込む値）
 * @returns プロンプトテキスト
 * 
 * @example
 * ```typescript
 * const prompt = await getPrompt('product-analysis', {
 *   analysisType: 'condition',
 *   outputFormat: 'json',
 * });
 * ```
 */
export async function getPrompt(
  promptName: string,
  variables?: Record<string, string>
): Promise<string> {
  const client = getLangfuseClient();
  
  if (!client) {
    // Langfuse未設定時はフォールバック（既存プロンプト）
    console.warn(`Langfuse not configured. Using fallback prompt: ${promptName}`);
    return getFallbackPrompt(promptName, variables);
  }

  try {
    // Langfuseからプロンプトを取得
    const prompt = await client.getPrompt(promptName);
    
    // 変数を動的に埋め込み
    if (variables && prompt.compile) {
      return prompt.compile(variables);
    }
    
    return prompt.prompt;
  } catch (error) {
    console.error(`Failed to get prompt from Langfuse: ${promptName}`, error);
    // フォールバック
    return getFallbackPrompt(promptName, variables);
  }
}

/**
 * フォールバックプロンプト（Langfuse未設定時）
 */
function getFallbackPrompt(
  promptName: string,
  variables?: Record<string, string>
): string {
  // 既存のプロンプト定義（Langfuse導入前のフォールバック）
  const fallbackPrompts: Record<string, string> = {
    'product-analysis': `この画像はフリーマーケットの商品写真です。以下の情報を分析して、必ずJSONだけを返してください。

1. 商品の簡潔で具体的な説明（summary）
   - 写真から読み取れる情報を使ってください
   - 例: 「ポケモンカードのセット」「青い子ども用Tシャツ」など
   - 「商品の説明（日本語、50文字以内）」のようなテンプレ文や、この指示文をそのまま書かないでください

2. 値札に書かれている価格（total）- 数字のみ（円）
   - 値札が見つからない、読めない場合は total を 0 にしてください

**レスポンスは、必ず次の形式のJSONだけにしてください：**

{
  "summary": "商品の説明（50文字以内）",
  "total": 0
}`,
    'photo-frame': 'Cute up this photo with a soft pink sakura frame. Keep the original person as they are.',
  };

  let prompt = fallbackPrompts[promptName] || '';
  
  // 変数を埋め込み
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  }
  
  return prompt;
}

/**
 * Langfuseが利用可能かどうか
 */
export function isLangfuseAvailable(): boolean {
  return getLangfuseClient() !== null;
}

