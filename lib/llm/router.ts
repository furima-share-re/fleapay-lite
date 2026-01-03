// lib/llm/router.ts
// タスクルーター（最適プロバイダー自動選択 + Langfuse統合 + リトライ）

import { getLLMProvider } from './factory';
import type { LLMProvider, ChatCompletionOptions, ChatCompletionResponse } from './types';
import type { TaskType, TaskConfig } from './config';
import { getTaskConfig, customizeTaskConfig } from './config';
import { getPrompt } from './prompts';
import { createTrace, recordLLMCall, recordError } from './tracing';
import { withRetry } from './retry';
import { classifyError, getUserFriendlyErrorMessage } from './errors';

/**
 * タスクを実行（最適なプロバイダーを自動選択 + Langfuse統合）
 * 
 * @param taskType タスクタイプ
 * @param options チャット完了オプション
 * @param customConfig カスタム設定（オプション）
 * @param tracingOptions トレーシングオプション（userId等）
 * @returns チャット完了レスポンス
 * 
 * @example
 * ```typescript
 * // 画像解析タスク（自動的にgpt-4oが選択され、失敗時はgemini → anthropicにフォールバック）
 * const response = await executeTask('image-analysis', {
 *   messages: [{ role: 'user', content: 'Analyze this image' }],
 * }, undefined, { userId: 'user_123' });
 * ```
 */
export async function executeTask(
  taskType: TaskType,
  options: ChatCompletionOptions,
  customConfig?: Partial<TaskConfig>,
  tracingOptions?: { userId?: string; metadata?: Record<string, unknown> }
): Promise<ChatCompletionResponse> {
  const config = customConfig
    ? customizeTaskConfig(taskType, customConfig)
    : getTaskConfig(taskType);

  // プロバイダーリスト（推奨 → フォールバック）
  const providers: LLMProvider[] = [
    config.preferredProvider,
    ...(config.fallbackProviders || []),
  ].filter((p): p is LLMProvider => p !== undefined);

  if (providers.length === 0) {
    throw new Error(`No providers configured for task type: ${taskType}`);
  }

  // Langfuseトレース作成（設計書5.5章準拠）
  const trace = createTrace(taskType, tracingOptions?.userId, {
    ...tracingOptions?.metadata,
    preferredProvider: config.preferredProvider,
    model: options.model || config.preferredModel,
  });

  // 推奨プロバイダーから順に試行
  const errors: Error[] = [];
  
  for (const providerName of providers) {
    const provider = getLLMProvider(providerName);
    if (!provider || !provider.isAvailable()) {
      console.warn(`Provider ${providerName} is not available, trying next...`);
      continue;
    }

    try {
      // 設定をマージ（カスタム設定 > タスク設定 > オプション）
      const mergedOptions: ChatCompletionOptions = {
        ...config.options,
        ...options,
        model: options.model || config.preferredModel || options.model,
      };

      const startTime = Date.now();
      
      // リトライロジック付きで実行
      const response = await withRetry(
        () => provider.chatCompletion(mergedOptions),
        {
          maxRetries: 2, // プロバイダー内で2回リトライ
          backoff: 'exponential',
          onRetry: (error, attempt, delay) => {
            console.warn(
              `Provider ${providerName} retry ${attempt} after ${delay}ms: ${error.message}`
            );
          },
        }
      );
      
      const latency = Date.now() - startTime;
      
      // Langfuseに記録（設計書5.5章準拠）
      recordLLMCall(trace, mergedOptions.messages, response, {
        model: response.model,
        latency,
        tokens: response.usage?.total_tokens,
      });
      
      // 成功したプロバイダーをログ
      if (providerName !== config.preferredProvider) {
        console.info(`Task ${taskType} completed using fallback provider: ${providerName}`);
      }

      return response;
    } catch (error) {
      // エラーを分類
      const classifiedError = classifyError(error, {
        provider: providerName,
        taskType,
      });
      errors.push(classifiedError);
      
      // エラーをLangfuseに記録
      recordError(trace, classifiedError);
      
      // リトライ不可能なエラーの場合は即座にthrow（次のプロバイダーを試さない）
      if (!classifiedError.retryable) {
        throw classifiedError;
      }
      
      console.warn(
        `Provider ${providerName} failed for task ${taskType}, trying fallback...`,
        getUserFriendlyErrorMessage(classifiedError)
      );
      continue;
    }
  }

  // すべてのプロバイダーが失敗
  const lastError = errors[errors.length - 1];
  if (lastError instanceof Error) {
    throw classifyError(lastError, {
      taskType,
      allErrors: errors.map(e => e.message),
    });
  }
  throw new Error(`All providers failed for task type: ${taskType}`);
}

/**
 * 画像編集タスクを実行
 */
export async function executeImageEditTask(
  options: { image: File | Buffer; prompt: string; model?: string; size?: string }
): Promise<{ image: Buffer; model: string }> {
  const config = getTaskConfig('image-edit');
  const provider = getLLMProvider(config.preferredProvider);
  
  if (!provider || !provider.isAvailable()) {
    throw new Error(`Provider ${config.preferredProvider} is not available for image editing`);
  }

  if (!provider.imageEdit) {
    throw new Error(`Provider ${config.preferredProvider} does not support image editing`);
  }

  const response = await provider.imageEdit({
    model: options.model || config.preferredModel,
    image: options.image,
    prompt: options.prompt,
    size: options.size || (config.options?.size as string) || '1024x1024',
  });

  return {
    image: response.image,
    model: response.model,
  };
}

