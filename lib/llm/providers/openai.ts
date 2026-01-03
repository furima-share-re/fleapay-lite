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
import type {
  ImageGenerationOptions,
  ImageGenerationResponse,
  SpeechToTextOptions,
  SpeechToTextResponse,
  TextToSpeechOptions,
  TextToSpeechResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  StreamingOptions,
  ChatCompletionChunk,
  ExtendedLLMProviderInterface,
} from '../types-extended';
import { classifyError } from '../errors';

/**
 * OpenAIプロバイダー実装
 * Helicone経由で監視・コスト可視化
 * 
 * 対応機能:
 * - チャット完了（テキスト生成）
 * - 画像編集
 * - 画像生成（DALL-E 3）
 * - 音声認識（Whisper）
 * - 音声合成（TTS）
 * - 埋め込み（Embeddings）
 * - ストリーミング
 */
export class OpenAIProvider implements LLMProviderInterface, ExtendedLLMProviderInterface {
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
   * 画像生成（DALL-E 3）
   */
  async imageGeneration(options: ImageGenerationOptions): Promise<ImageGenerationResponse> {
    if (!this.client) {
      throw classifyError(
        new Error('OpenAI client is not available'),
        { provider: 'openai', reason: 'missing_api_key' }
      );
    }

    try {
      const response = await this.client.images.generate({
        model: (options.model as 'dall-e-3' | 'dall-e-2') || 'dall-e-3',
        prompt: options.prompt,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid',
        n: options.n || 1,
        response_format: 'b64_json',
      });

      const images = response.data
        .map(item => {
          if ('b64_json' in item && item.b64_json) {
            return Buffer.from(item.b64_json, 'base64');
          }
          return null;
        })
        .filter((img): img is Buffer => img !== null);

      if (images.length === 0) {
        throw classifyError(
          new Error('No images returned from OpenAI API'),
          { provider: 'openai', model: options.model }
        );
      }

      return {
        images,
        model: options.model || 'dall-e-3',
        raw: response,
      };
    } catch (error) {
      throw classifyError(error, {
        provider: 'openai',
        model: options.model || 'dall-e-3',
        operation: 'imageGeneration',
      });
    }
  }

  /**
   * 音声認識（Whisper）
   */
  async speechToText(options: SpeechToTextOptions): Promise<SpeechToTextResponse> {
    if (!this.client) {
      throw classifyError(
        new Error('OpenAI client is not available'),
        { provider: 'openai', reason: 'missing_api_key' }
      );
    }

    try {
      // FileまたはBufferをFileオブジェクトに変換
      let audioFile: File;
      if (options.audio instanceof File) {
        audioFile = options.audio;
      } else {
        const uint8Array = new Uint8Array(options.audio);
        audioFile = new File([uint8Array], 'audio.mp3', { type: 'audio/mpeg' });
      }

      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: options.model || 'whisper-1',
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature,
      });

      return {
        text: response.text,
        model: options.model || 'whisper-1',
        language: options.language,
        raw: response,
      };
    } catch (error) {
      throw classifyError(error, {
        provider: 'openai',
        model: options.model || 'whisper-1',
        operation: 'speechToText',
      });
    }
  }

  /**
   * 音声合成（TTS）
   */
  async textToSpeech(options: TextToSpeechOptions): Promise<TextToSpeechResponse> {
    if (!this.client) {
      throw classifyError(
        new Error('OpenAI client is not available'),
        { provider: 'openai', reason: 'missing_api_key' }
      );
    }

    try {
      const response = await this.client.audio.speech.create({
        model: options.model || 'tts-1',
        input: options.text,
        voice: (options.voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer') || 'nova',
        speed: options.speed || 1.0,
        response_format: options.format || 'mp3',
      });

      // レスポンスをBufferに変換
      const arrayBuffer = await response.arrayBuffer();
      const audio = Buffer.from(arrayBuffer);

      return {
        audio,
        model: options.model || 'tts-1',
        voice: options.voice || 'nova',
        raw: response,
      };
    } catch (error) {
      throw classifyError(error, {
        provider: 'openai',
        model: options.model || 'tts-1',
        operation: 'textToSpeech',
      });
    }
  }

  /**
   * 埋め込み（Embeddings）
   */
  async createEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw classifyError(
        new Error('OpenAI client is not available'),
        { provider: 'openai', reason: 'missing_api_key' }
      );
    }

    try {
      const response = await this.client.embeddings.create({
        model: options.model || 'text-embedding-3-small',
        input: options.input,
        dimensions: options.dimensions,
      });

      return {
        embeddings: response.data.map(item => item.embedding),
        model: options.model || 'text-embedding-3-small',
        usage: response.usage
          ? {
              prompt_tokens: response.usage.prompt_tokens,
              total_tokens: response.usage.total_tokens,
            }
          : undefined,
        raw: response,
      };
    } catch (error) {
      throw classifyError(error, {
        provider: 'openai',
        model: options.model || 'text-embedding-3-small',
        operation: 'createEmbedding',
      });
    }
  }

  /**
   * ストリーミングチャット完了
   */
  async *chatCompletionStream(
    options: StreamingOptions
  ): AsyncIterable<ChatCompletionChunk> {
    if (!this.client) {
      throw classifyError(
        new Error('OpenAI client is not available'),
        { provider: 'openai', reason: 'missing_api_key' }
      );
    }

    try {
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

      const stream = await this.client.chat.completions.create({
        model: options.model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: true,
      });

      let fullContent = '';
      let model: string | undefined;

      for await (const chunk of stream) {
        model = chunk.model;
        const delta = chunk.choices[0]?.delta?.content || '';
        fullContent += delta;

        yield {
          content: fullContent,
          delta,
          model: model || options.model,
          finish_reason: chunk.choices[0]?.finish_reason as 'stop' | 'length' | 'function_call' | 'content_filter' | undefined,
          raw: chunk,
        };
      }
    } catch (error) {
      throw classifyError(error, {
        provider: 'openai',
        model: options.model,
        operation: 'chatCompletionStream',
      });
    }
  }

  /**
   * ネイティブのOpenAIクライアントにアクセス（プロバイダー固有機能を使用する場合）
   */
  getNativeClient<T>(): T | null {
    return (this.client as T) || null;
  }
}

