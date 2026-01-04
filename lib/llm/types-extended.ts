// lib/llm/types-extended.ts
// 拡張型定義（画像生成・音声・埋め込み・ストリーミング等）

import type { ChatCompletionOptions } from './types';

/**
 * 画像生成リクエストオプション
 */
export interface ImageGenerationOptions {
  prompt: string;
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number; // 生成枚数
  [key: string]: unknown; // プロバイダー固有のオプション
}

/**
 * 画像生成レスポンス
 */
export interface ImageGenerationResponse {
  images: Buffer[]; // base64デコード済み
  model: string;
  raw?: unknown;
}

/**
 * 音声認識リクエストオプション
 */
export interface SpeechToTextOptions {
  audio: File | Buffer;
  model?: string;
  language?: string;
  prompt?: string; // コンテキストプロンプト
  temperature?: number;
  [key: string]: unknown;
}

/**
 * 音声認識レスポンス
 */
export interface SpeechToTextResponse {
  text: string;
  model: string;
  language?: string;
  raw?: unknown;
}

/**
 * 音声合成リクエストオプション
 */
export interface TextToSpeechOptions {
  text: string;
  model?: string;
  voice?: string; // 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number; // 0.25 - 4.0
  format?: 'mp3' | 'opus' | 'aac' | 'flac';
  [key: string]: unknown;
}

/**
 * 音声合成レスポンス
 */
export interface TextToSpeechResponse {
  audio: Buffer;
  model: string;
  voice?: string;
  raw?: unknown;
}

/**
 * 埋め込みリクエストオプション
 */
export interface EmbeddingOptions {
  input: string | string[];
  model?: string;
  dimensions?: number; // 埋め込み次元数
  [key: string]: unknown;
}

/**
 * 埋め込みレスポンス
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
  raw?: unknown;
}

/**
 * ストリーミングチャンク
 */
export interface ChatCompletionChunk {
  content: string;
  delta?: string; // 差分
  model?: string;
  finish_reason?: 'stop' | 'length' | 'function_call' | 'content_filter';
  raw?: unknown;
}

/**
 * ストリーミングオプション
 */
export interface StreamingOptions extends ChatCompletionOptions {
  stream: true;
}

/**
 * 拡張LLMプロバイダーインターフェース
 */
export interface ExtendedLLMProviderInterface {
  /**
   * 画像生成（サポートしている場合）
   */
  imageGeneration?(options: ImageGenerationOptions): Promise<ImageGenerationResponse>;

  /**
   * 音声認識（サポートしている場合）
   */
  speechToText?(options: SpeechToTextOptions): Promise<SpeechToTextResponse>;

  /**
   * 音声合成（サポートしている場合）
   */
  textToSpeech?(options: TextToSpeechOptions): Promise<TextToSpeechResponse>;

  /**
   * 埋め込み（サポートしている場合）
   */
  createEmbedding?(options: EmbeddingOptions): Promise<EmbeddingResponse>;

  /**
   * ストリーミングチャット完了（サポートしている場合）
   */
  chatCompletionStream?(
    options: StreamingOptions
  ): AsyncIterable<ChatCompletionChunk>;
}

