// lib/openai.ts
// Phase 3.1: Helicone導入 - OpenAI SDK共通設定
// 
// ⚠️ 注意: このファイルは後方互換性のために残しています。
// 新規コードでは `lib/llm` を使用してください。
// 
// 移行方法:
// - 旧: `import { openai } from '@/lib/openai'`
// - 新: `import { openai } from '@/lib/llm/compat/openai-adapter'`
// または: `import { chatCompletion } from '@/lib/llm'`

import OpenAI from 'openai';

/**
 * OpenAI SDKインスタンス（基本はHelicone経由、エラー時は自動フォールバック）
 * 
 * 基本はHelicone経由でLLM API呼び出しを監視・コスト可視化します。
 * HELICONE_API_KEYが設定されていない場合、またはHeliconeがエラーを返した場合は、
 * 自動的に直接OpenAI APIにフォールバックします。
 * 
 * 環境変数:
 * - OPENAI_API_KEY: OpenAI API Key（必須）
 * - HELICONE_API_KEY: Helicone API Key（推奨・確実に設定、エラー時は自動フォールバック）
 * - NODE_ENV: 環境名（development, staging, production）
 * 
 * 使用方法:
 * - 通常: `openai.chat.completions.create(...)` を直接使用
 * - フォールバック付き: `callWithFallback((client) => client.chat.completions.create(...), requestId)` を使用
 */
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
const hasHeliconeKey = !!process.env.HELICONE_API_KEY;
const nodeEnv = process.env.NODE_ENV || 'development';

// 初期化時のログ
if (hasOpenAIKey && hasHeliconeKey) {
  console.warn('[Helicone] ✅ OpenAI SDK initialized with Helicone proxy (推奨設定)');
  console.warn('[Helicone] Base URL:', 'https://oai.helicone.ai/v1');
  console.warn('[Helicone] Environment:', nodeEnv);
  console.warn('[Helicone] Project: fleapay-lite');
} else if (hasOpenAIKey) {
  console.warn('[OpenAI] ⚠️ OpenAI SDK initialized (direct API, Helicone not configured)');
  console.warn('[OpenAI] OPENAI_API_KEY:', '✅ set');
  console.warn('[OpenAI] HELICONE_API_KEY:', '❌ not set (Helicone経由を推奨)');
} else {
  console.warn('[OpenAI] ⚠️ OpenAI SDK NOT initialized');
  console.warn('[OpenAI] OPENAI_API_KEY:', hasOpenAIKey ? '✅ set' : '❌ not set');
  console.warn('[OpenAI] HELICONE_API_KEY:', hasHeliconeKey ? '✅ set' : '❌ not set');
}

// Helicone経由のOpenAIクライアント（基本）
export const openai = hasOpenAIKey
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(hasHeliconeKey ? {
        baseURL: 'https://oai.helicone.ai/v1',
        defaultHeaders: {
          'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
          'Helicone-Property-Environment': nodeEnv,
          'Helicone-Property-Project': 'fleapay-lite',
        },
      } : {}),
    })
  : null;

// 直接OpenAI API用のクライアント（フォールバック用）
let directOpenAI: OpenAI | null = null;
function getDirectOpenAI(): OpenAI {
  if (!hasOpenAIKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  if (!directOpenAI) {
    directOpenAI = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return directOpenAI;
}

/**
 * OpenAI SDKが利用可能かどうかを確認
 * OPENAI_API_KEYが設定されていれば利用可能（HELICONE_API_KEYは推奨）
 */
export function isOpenAIAvailable(): boolean {
  return openai !== null;
}

/**
 * OpenAI SDKインスタンスを取得（nullチェック付き）
 * @throws {Error} OpenAI SDKが利用できない場合
 */
export function getOpenAI(): OpenAI {
  if (!openai) {
    throw new Error('OpenAI SDK is not available. Please set OPENAI_API_KEY environment variable.');
  }
  return openai;
}

/**
 * Heliconeエラーかどうかを判定
 * @param error エラーオブジェクト
 * @returns Helicone関連のエラーかどうか
 */
export function isHeliconeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  // OpenAI SDKのエラーオブジェクト構造を確認
  const errorObj = error as Record<string, unknown>;

  // HTTPステータスコードで判定
  let status: number | undefined;
  if ('status' in errorObj && typeof errorObj.status === 'number') {
    status = errorObj.status;
  } else if ('response' in errorObj && errorObj.response && typeof errorObj.response === 'object') {
    const response = errorObj.response as Record<string, unknown>;
    if ('status' in response && typeof response.status === 'number') {
      status = response.status;
    }
  }

  // 503, 502, 504 はHeliconeの障害の可能性が高い
  if (status !== undefined && (status === 503 || status === 502 || status === 504)) {
    return true;
  }

  // エラーメッセージで判定
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  return (
    lowerMessage.includes('helicone') ||
    lowerMessage.includes('oai.helicone.ai') ||
    lowerMessage.includes('service unavailable') ||
    lowerMessage.includes('bad gateway') ||
    lowerMessage.includes('gateway timeout') ||
    lowerMessage.includes('timeout') && lowerMessage.includes('helicone')
  );
}

/**
 * Helicone経由でAPI呼び出しを実行し、エラー時は直接OpenAI APIにフォールバック
 * @param fn API呼び出し関数
 * @param requestId リクエストID（ログ用）
 * @returns API呼び出し結果
 */
export async function callWithFallback<T>(
  fn: (client: OpenAI) => Promise<T>,
  requestId?: string
): Promise<T> {
  if (!openai) {
    throw new Error('OpenAI SDK is not available. Please set OPENAI_API_KEY environment variable.');
  }

  // まずHelicone経由で試行
  try {
    return await fn(openai);
  } catch (error) {
    // Heliconeエラーの場合のみフォールバック
    if (hasHeliconeKey && isHeliconeError(error)) {
      const logPrefix = requestId ? `[${requestId}]` : '';
      console.warn(`${logPrefix} ⚠️ Heliconeエラー検出、直接OpenAI APIにフォールバック:`, 
        error instanceof Error ? error.message : String(error));
      
      try {
        const directClient = getDirectOpenAI();
        const result = await fn(directClient);
        console.warn(`${logPrefix} ✅ フォールバック成功（直接OpenAI API使用）`);
        return result;
      } catch (fallbackError) {
        console.error(`${logPrefix} ❌ フォールバックも失敗:`, 
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
        throw fallbackError;
      }
    }
    
    // Heliconeエラーでない場合はそのままthrow
    throw error;
  }
}

