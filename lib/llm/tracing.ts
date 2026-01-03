// lib/llm/tracing.ts
// Langfuse統合 - トレーシング（設計書5.5章準拠）

import { Langfuse } from 'langfuse';
import type { ChatCompletionResponse } from './types';

/**
 * Langfuseクライアント（トレーシング用）
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
    return null; // トレーシングはオプション
  }

  langfuse = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: host,
  });

  return langfuse;
}

/**
 * トレース情報
 */
export interface TraceInfo {
  trace: ReturnType<Langfuse['trace']>;
  generation: ReturnType<ReturnType<Langfuse['trace']>['generation']>;
}

/**
 * トレースを作成
 * 
 * @param name トレース名（例: 'product-analysis'）
 * @param userId ユーザーID（オプション）
 * @param metadata 追加メタデータ（オプション）
 * @returns トレース情報
 * 
 * @example
 * ```typescript
 * const trace = createTrace('product-analysis', userId, {
 *   imageSize: '1024x1024',
 *   feature: 'product-analysis',
 * });
 * 
 * // LLM呼び出し後
 * trace.generation.end({ output: response.content });
 * ```
 */
export function createTrace(
  name: string,
  userId?: string,
  metadata?: Record<string, unknown>
): TraceInfo {
  const client = getLangfuseClient();
  
  if (!client) {
    // Langfuse未設定時はダミートレース（何もしない）
    return {
      trace: {
        generation: () => ({
          end: () => {},
        }),
      } as any,
      generation: {
        end: () => {},
      } as any,
    };
  }

  const trace = client.trace({
    name,
    userId,
    metadata: {
      ...metadata,
      environment: process.env.NODE_ENV || 'development',
      project: 'fleapay-lite',
    },
  });

  const generation = trace.generation({
    name: 'llm-call',
  });

  return { trace, generation };
}

/**
 * LLM呼び出しをトレースに記録
 * 
 * @param traceInfo トレース情報
 * @param input 入力（プロンプト等）
 * @param output 出力（レスポンス）
 * @param metadata 追加メタデータ（モデル名、コスト等）
 */
export function recordLLMCall(
  traceInfo: TraceInfo,
  input: string | unknown[],
  output: ChatCompletionResponse,
  metadata?: {
    model?: string;
    cost?: number;
    tokens?: number;
    latency?: number;
  }
): void {
  // Langfuseのusage形式に変換
  const usage = output.usage
    ? {
        input: output.usage.prompt_tokens ?? null,
        output: output.usage.completion_tokens ?? null,
        total: output.usage.total_tokens ?? null,
        unit: 'TOKENS' as const,
      }
    : undefined;

  traceInfo.generation.end({
    output: output.content,
    model: output.model,
    usage,
    metadata: {
      ...metadata,
      // Helicone識別子を追加（Heliconeと連携）
      heliconeTraceId: (output.raw as any)?.heliconeTraceId,
    },
  });
}

/**
 * エラーをトレースに記録
 * 
 * @param traceInfo トレース情報
 * @param error エラー
 */
export function recordError(
  traceInfo: TraceInfo,
  error: Error | unknown
): void {
  traceInfo.generation.end({
    level: 'ERROR',
    statusMessage: error instanceof Error ? error.message : String(error),
  });
}


