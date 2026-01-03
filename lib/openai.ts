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
 * Helicone経由のOpenAI SDKインスタンス
 * 
 * Heliconeを使用してLLM API呼び出しを監視・コスト可視化します。
 * 環境変数:
 * - OPENAI_API_KEY: OpenAI API Key（必須）
 * - HELICONE_API_KEY: Helicone API Key（必須）
 * - NODE_ENV: 環境名（development, staging, production）
 */
export const openai = process.env.OPENAI_API_KEY && process.env.HELICONE_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://oai.helicone.ai/v1',
      defaultHeaders: {
        'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
        'Helicone-Property-Environment': process.env.NODE_ENV || 'development',
        'Helicone-Property-Project': 'fleapay-lite',
      },
    })
  : null;

/**
 * OpenAI SDKが利用可能かどうかを確認
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
    throw new Error('OpenAI SDK is not available. Please set OPENAI_API_KEY and HELICONE_API_KEY environment variables.');
  }
  return openai;
}

