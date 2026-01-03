// lib/llm/types.ts
// LLM抽象化レイヤー - 共通型定義

/**
 * LLMプロバイダー種別
 */
export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'cohere' | 'custom';

/**
 * タスクタイプ
 */
export type TaskType =
  | 'image-analysis'
  | 'image-generation'
  | 'image-edit'
  | 'text-generation'
  | 'long-context'
  | 'code-generation'
  | 'json-extraction'
  | 'cost-optimized';

/**
 * チャットメッセージのロール
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * チャットメッセージのコンテンツ
 */
export interface ChatMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

/**
 * チャットメッセージ
 */
export interface ChatMessage {
  role: MessageRole;
  content: string | ChatMessageContent[];
}

/**
 * チャット完了リクエストオプション（基本）
 */
export interface ChatCompletionOptionsBase {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

/**
 * チャット完了リクエストオプション
 * 
 * プロバイダー固有のオプションは型安全に拡張可能
 */
export interface ChatCompletionOptions extends ChatCompletionOptionsBase {
  /**
   * プロバイダー固有のオプション（型安全に拡張可能）
   * 
   * @example
   * ```typescript
   * interface OpenAIOptions extends ChatCompletionOptions {
   *   functions?: OpenAI.Chat.Completions.ChatCompletionCreateParams['functions'];
   * }
   * ```
   */
  [key: string]: unknown;
}

/**
 * チャット完了レスポンス
 */
export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  raw?: unknown; // プロバイダー固有のレスポンス
}

/**
 * 画像編集リクエストオプション（基本）
 */
export interface ImageEditOptionsBase {
  model: string;
  image: File | Buffer;
  prompt: string;
  size?: string;
}

/**
 * 画像編集リクエストオプション
 * 
 * プロバイダー固有のオプションは型安全に拡張可能
 */
export interface ImageEditOptions extends ImageEditOptionsBase {
  /**
   * プロバイダー固有のオプション（型安全に拡張可能）
   */
  [key: string]: unknown;
}

/**
 * 画像編集レスポンス
 */
export interface ImageEditResponse {
  image: Buffer; // base64デコード済み
  model: string;
  raw?: unknown; // プロバイダー固有のレスポンス
}

/**
 * LLMプロバイダーの基本インターフェース
 */
export interface LLMProviderInterface {
  /**
   * プロバイダー名
   */
  readonly name: LLMProvider;

  /**
   * 利用可能かどうか
   */
  isAvailable(): boolean;

  /**
   * チャット完了（テキスト生成）
   */
  chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  /**
   * 画像編集（サポートしている場合）
   */
  imageEdit?(options: ImageEditOptions): Promise<ImageEditResponse>;

  /**
   * プロバイダー固有の機能にアクセス（型安全）
   */
  getNativeClient?<T>(): T | null;
}

/**
 * プロバイダー設定
 */
export interface ProviderConfig {
  provider: LLMProvider;
  model?: string; // デフォルトモデル
  apiKey?: string;
  baseURL?: string;
  [key: string]: unknown; // プロバイダー固有の設定
}

