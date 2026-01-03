// lib/llm/index.ts
// LLM抽象化レイヤー - エクスポート

export * from './types';
export * from './types-extended';
export * from './factory';
export * from './config';
export * from './router';
export * from './prompts';
// tracing.tsからはisLangfuseAvailableをエクスポートしない（prompts.tsからエクスポート）
export {
  createTrace,
  recordLLMCall,
  recordError,
  type TraceInfo,
} from './tracing';
export * from './errors';
export * from './retry';
export * from './providers/openai';

// 拡張機能
export * from './features/audio';
export * from './features/sns-posting';
export * from './features/information-gathering';
export * from './features/podcast';

// テストユーティリティ
export * from './testing';

// 便利関数
import { getLLMProvider } from './factory';
import { executeTask, executeImageEditTask } from './router';
import { getTaskConfig } from './config';
import type { ChatCompletionOptions, ImageEditOptions, TaskType } from './types';

/**
 * チャット完了を実行（簡易API）
 * 
 * @param options チャット完了オプション
 * @returns チャット完了レスポンス
 * @throws {LLMError} LLMプロバイダーが利用不可、またはAPI呼び出しに失敗した場合
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await chatCompletion({
 *     model: 'gpt-4o',
 *     messages: [{ role: 'user', content: 'Hello' }],
 *   });
 *   console.log(response.content);
 * } catch (error) {
 *   if (error instanceof LLMError) {
 *     console.error('LLM Error:', error.code, error.message);
 *   }
 * }
 * ```
 */
export async function chatCompletion(options: ChatCompletionOptions) {
  const provider = getLLMProvider();
  if (!provider) {
    const { classifyError } = await import('./errors');
    throw classifyError(
      new Error('No LLM provider is available'),
      {
        reason: 'no_provider_configured',
        suggestion: 'Please set LLM_PROVIDER environment variable or configure at least one provider',
      }
    );
  }
  return provider.chatCompletion(options);
}

/**
 * 画像編集を実行（簡易API）
 * 
 * @param options 画像編集オプション
 * @returns 画像編集レスポンス
 * @throws {LLMError} LLMプロバイダーが利用不可、またはAPI呼び出しに失敗した場合
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await imageEdit({
 *     model: 'dall-e-2',
 *     image: imageFile,
 *     prompt: 'Add a frame',
 *   });
 *   // response.image を使用
 * } catch (error) {
 *   if (error instanceof LLMError) {
 *     console.error('LLM Error:', error.code, error.message);
 *   }
 * }
 * ```
 */
export async function imageEdit(options: ImageEditOptions) {
  const provider = getLLMProvider();
  if (!provider) {
    const { classifyError } = await import('./errors');
    throw classifyError(
      new Error('No LLM provider is available'),
      {
        reason: 'no_provider_configured',
        suggestion: 'Please set LLM_PROVIDER environment variable or configure at least one provider',
      }
    );
  }
  if (!provider.imageEdit) {
    const { classifyError } = await import('./errors');
    throw classifyError(
      new Error(`Provider ${provider.name} does not support image editing`),
      {
        provider: provider.name,
        reason: 'unsupported_operation',
        suggestion: 'Please use a provider that supports image editing (e.g., OpenAI)',
      }
    );
  }
  return provider.imageEdit(options);
}

/**
 * タスク指向の簡易API
 */

/**
 * 画像解析を実行
 * 
 * モデルは config.ts の環境変数から自動取得されます。
 * 環境変数: LLM_TASK_IMAGE_ANALYSIS_MODEL (デフォルト: 'gpt-4o')
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  options?: Partial<ChatCompletionOptions>
) {
  const config = getTaskConfig('image-analysis');
  return executeTask('image-analysis', {
    model: options?.model || config.preferredModel,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }],
    ...options,
  });
}

/**
 * テキスト生成を実行
 * 
 * モデルは config.ts の環境変数から自動取得されます。
 * 環境変数: LLM_TASK_TEXT_GENERATION_MODEL (デフォルト: 'gpt-4o')
 */
export async function generateText(
  prompt: string,
  options?: Partial<ChatCompletionOptions>
) {
  const config = getTaskConfig('text-generation');
  return executeTask('text-generation', {
    model: options?.model || config.preferredModel,
    messages: [{ role: 'user', content: prompt }],
    ...options,
  });
}

/**
 * 画像編集を実行（タスク指向）
 */
export async function editImage(
  image: File | Buffer,
  prompt: string,
  options?: { model?: string; size?: string }
) {
  return executeImageEditTask({
    image,
    prompt,
    ...options,
  });
}

/**
 * 画像生成を実行
 */
export async function generateImage(
  prompt: string,
  options?: {
    model?: string;
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    n?: number;
  }
) {
  const provider = getLLMProvider('openai');
  if (!provider) {
    const { classifyError } = await import('./errors');
    throw classifyError(
      new Error('OpenAI provider is not available'),
      { reason: 'not_configured' }
    );
  }

  if (!('imageGeneration' in provider) || typeof provider.imageGeneration !== 'function') {
    const { classifyError } = await import('./errors');
    throw classifyError(
      new Error('Image generation is not supported'),
      { reason: 'unsupported_feature' }
    );
  }

  return provider.imageGeneration({
    prompt,
    ...options,
  });
}

/**
 * 埋め込みを実行
 */
export async function createEmbedding(
  input: string | string[],
  options?: { model?: string; dimensions?: number }
) {
  const provider = getLLMProvider('openai');
  if (!provider) {
    const { classifyError } = await import('./errors');
    throw classifyError(
      new Error('OpenAI provider is not available'),
      { reason: 'not_configured' }
    );
  }

  if (!('createEmbedding' in provider) || typeof provider.createEmbedding !== 'function') {
    const { classifyError } = await import('./errors');
    throw classifyError(
      new Error('Embeddings are not supported'),
      { reason: 'unsupported_feature' }
    );
  }

  return provider.createEmbedding({
    input,
    ...options,
  });
}

/**
 * ストリーミングチャット完了を実行
 */
export async function* chatCompletionStream(
  options: Omit<ChatCompletionOptions, 'stream'> & { stream: true }
): AsyncIterable<import('./types-extended').ChatCompletionChunk> {
  const provider = getLLMProvider('openai');
  if (!provider) {
    const { classifyError } = await import('./errors');
    throw classifyError(
      new Error('OpenAI provider is not available'),
      { reason: 'not_configured' }
    );
  }

  if (!('chatCompletionStream' in provider) || typeof provider.chatCompletionStream !== 'function') {
    const { classifyError } = await import('./errors');
    throw classifyError(
      new Error('Streaming is not supported'),
      { reason: 'unsupported_feature' }
    );
  }

  yield* provider.chatCompletionStream(options);
}

