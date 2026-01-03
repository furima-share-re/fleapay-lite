// lib/llm/providers/openai.ts
// OpenAI プロバイダー実装

import OpenAI from 'openai';
import type {
  LLMProviderInterface,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ImageEditOptions,
  ImageEditResponse,
  ChatMessage,
} from '../types';
import { classifyError } from '../errors';

/**
 * OpenAIプロバイダー実装
 * Helicone経由で監視・コスト可視化
 */
export class OpenAIProvider implements LLMProviderInterface {
  readonly name = 'openai' as const;
  private client: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const heliconeApiKey = process.env.HELICONE_API_KEY;

    if (apiKey && heliconeApiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://oai.helicone.ai/v1',
        defaultHeaders: {
          'Helicone-Auth': `Bearer ${heliconeApiKey}`,
          'Helicone-Property-Environment': process.env.NODE_ENV || 'development',
          'Helicone-Property-Project': 'fleapay-lite',
        },
      });
    } else {
      this.client = null;
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.client) {
      throw classifyError(
        new Error('OpenAI client is not available'),
        { provider: 'openai', reason: 'missing_api_key' }
      );
    }

    try {
      // 共通インターフェースからOpenAI形式に変換
      const messages = options.messages.map((msg) => {
        if (typeof msg.content === 'string') {
          return {
            role: msg.role,
            content: msg.content,
          };
        } else {
          return {
            role: msg.role,
            content: msg.content,
          };
        }
      });

      // OpenAI固有のオプションを抽出（型安全）
      const openAIOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: options.model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        response_format: options.response_format,
      };

      // プロバイダー固有のオプションを追加（型安全に）
      if ('functions' in options) {
        openAIOptions.functions = options.functions as OpenAI.Chat.Completions.ChatCompletionCreateParams['functions'];
      }
      if ('function_call' in options) {
        openAIOptions.function_call = options.function_call as OpenAI.Chat.Completions.ChatCompletionCreateParams['function_call'];
      }

      const response = await this.client.chat.completions.create(openAIOptions);

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw classifyError(
          new Error('No content in OpenAI response'),
          { provider: 'openai', model: options.model }
        );
      }

      return {
        content: choice.message.content,
        model: response.model,
        usage: response.usage
          ? {
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens,
            }
          : undefined,
        raw: response,
      };
    } catch (error) {
      // エラーを分類してthrow
      throw classifyError(error, {
        provider: 'openai',
        model: options.model,
      });
    }
  }

  async imageEdit(options: ImageEditOptions): Promise<ImageEditResponse> {
    if (!this.client) {
      throw classifyError(
        new Error('OpenAI client is not available'),
        { provider: 'openai', reason: 'missing_api_key' }
      );
    }

    try {
      // FileまたはBufferをFileオブジェクトに変換
      let imageFile: File;
      if (options.image instanceof File) {
        imageFile = options.image;
      } else {
        const uint8Array = new Uint8Array(options.image);
        imageFile = new File([uint8Array], 'image.png', { type: 'image/png' });
      }

      const response = await this.client.images.edit({
        model: options.model as 'dall-e-2',
        image: imageFile,
        prompt: options.prompt,
        size: (options.size as '1024x1024') || '1024x1024',
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        throw classifyError(
          new Error('No image returned from OpenAI API'),
          { provider: 'openai', model: options.model }
        );
      }

      return {
        image: Buffer.from(b64, 'base64'),
        model: options.model,
        raw: response,
      };
    } catch (error) {
      // エラーを分類してthrow
      throw classifyError(error, {
        provider: 'openai',
        model: options.model,
        operation: 'imageEdit',
      });
    }
  }

  /**
   * ネイティブのOpenAIクライアントにアクセス（プロバイダー固有機能を使用する場合）
   */
  getNativeClient(): OpenAI | null {
    return this.client;
  }
}

