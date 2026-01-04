// lib/llm/compat/openai-adapter.ts
// OpenAI SDK互換アダプター（後方互換性）

import OpenAI from 'openai';
import { getLLMProvider } from '../factory';
import { classifyError } from '../errors';
import type { ChatCompletionOptions } from '../types';

/**
 * OpenAI SDKのオプションを共通インターフェースに変換
 */
function adaptOpenAIOptions(
  options: OpenAI.Chat.Completions.ChatCompletionCreateParams
): ChatCompletionOptions {
  return {
    model: options.model,
    messages: options.messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        };
      } else {
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        };
      }
    }),
    temperature: options.temperature,
    max_tokens: options.max_tokens,
    response_format: options.response_format,
    // OpenAI固有のオプションも保持
    functions: options.functions,
    function_call: options.function_call,
  } as ChatCompletionOptions;
}

/**
 * UploadableをFileまたはBufferに変換
 * 
 * OpenAI SDKのUploadable型をFileまたはBufferに変換
 */
function adaptImageInput(
  image: OpenAI.Images.ImageEditParams['image']
): File | Buffer {
  // 配列の場合は最初の要素を使用
  const imageInput = Array.isArray(image) ? image[0] : image;
  
  // 型をunknownにキャストしてから処理（Uploadable型の複雑さを回避）
  const input = imageInput as unknown;

  // Fileの場合はそのまま返す
  if (input instanceof File) {
    return input;
  }

  // Bufferの場合はそのまま返す
  if (Buffer.isBuffer(input)) {
    return input;
  }

  // Blobの場合はFileに変換
  if (input instanceof Blob) {
    return new File([input], 'image.png', { type: input.type || 'image/png' });
  }

  // ArrayBufferまたはArrayBufferViewの場合はBufferに変換
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }

  // Uint8Arrayの場合はBufferに変換
  if (input instanceof Uint8Array) {
    return Buffer.from(input);
  }

  // 文字列（base64またはURL）の場合はエラー
  if (typeof input === 'string') {
    throw new Error('String image input is not supported. Please use File or Buffer.');
  }

  // その他の型の場合はエラー
  throw new Error(`Unsupported image input type: ${typeof input}`);
}

/**
 * 共通インターフェースのレスポンスをOpenAI形式に変換
 */
function adaptToOpenAIFormat(
  response: { content: string; model: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }
): OpenAI.Chat.Completions.ChatCompletion {
  return {
    id: 'chatcmpl-mock',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: response.content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens || 0,
          completion_tokens: response.usage.completion_tokens || 0,
          total_tokens: response.usage.total_tokens || 0,
        }
      : undefined,
  } as OpenAI.Chat.Completions.ChatCompletion;
}

/**
 * OpenAI SDK互換のクライアント
 * 
 * 既存コードとの互換性を保つためのアダプター
 * 
 * @example
 * ```typescript
 * import { openai } from '@/lib/llm/compat/openai-adapter';
 * 
 * // 既存のコードがそのまま動作
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello' }],
 * });
 * ```
 */
export const openai = {
  chat: {
    completions: {
      create: async (
        options: OpenAI.Chat.Completions.ChatCompletionCreateParams,
        _requestOptions?: OpenAI.RequestOptions
      ): Promise<OpenAI.Chat.Completions.ChatCompletion> => {
        const provider = getLLMProvider('openai');
        if (!provider) {
          throw classifyError(
            new Error('OpenAI provider is not available'),
            {
              provider: 'openai',
              reason: 'not_configured',
              suggestion: 'Please set OPENAI_API_KEY and HELICONE_API_KEY environment variables',
            }
          );
        }

        try {
          const adaptedOptions = adaptOpenAIOptions(options);
          const response = await provider.chatCompletion(adaptedOptions);
          return adaptToOpenAIFormat(response);
        } catch (error) {
          throw classifyError(error, {
            provider: 'openai',
            operation: 'chat.completions.create',
          });
        }
      },
    },
  },
  images: {
    edit: async (
      options: OpenAI.Images.ImageEditParams
    ): Promise<OpenAI.Images.ImagesResponse> => {
      const provider = getLLMProvider('openai');
      if (!provider) {
        throw classifyError(
          new Error('OpenAI provider is not available'),
          {
            provider: 'openai',
            reason: 'not_configured',
          }
        );
      }

      if (!provider.imageEdit) {
        throw classifyError(
          new Error('Image editing is not supported'),
          {
            provider: 'openai',
            reason: 'unsupported_operation',
          }
        );
      }

      try {
        // UploadableをFileまたはBufferに変換
        const adaptedImage = adaptImageInput(options.image);
        
        const response = await provider.imageEdit({
          model: options.model || 'dall-e-2',
          image: adaptedImage,
          prompt: options.prompt,
          size: options.size ?? undefined,
        });

        // OpenAI形式に変換
        return {
          created: Math.floor(Date.now() / 1000),
          data: [
            {
              url: `data:image/png;base64,${response.image.toString('base64')}`,
              b64_json: response.image.toString('base64'),
            },
          ],
        } as OpenAI.Images.ImagesResponse;
      } catch (error) {
        throw classifyError(error, {
          provider: 'openai',
          operation: 'images.edit',
        });
      }
    },
  },
} as OpenAI;

