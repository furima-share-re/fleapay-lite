// lib/llm/features/audio.ts
// 音声機能（音声認識・音声合成）

import { getLLMProvider } from '../factory';
import { classifyError } from '../errors';
import type {
  SpeechToTextOptions,
  SpeechToTextResponse,
  TextToSpeechOptions,
  TextToSpeechResponse,
} from '../types-extended';

/**
 * 音声認識を実行
 * 
 * @param options 音声認識オプション
 * @returns 認識されたテキスト
 * 
 * @example
 * ```typescript
 * const result = await speechToText({
 *   audio: audioFile,
 *   language: 'ja',
 * });
 * ```
 */
export async function speechToText(
  options: SpeechToTextOptions
): Promise<SpeechToTextResponse> {
  const provider = getLLMProvider('openai'); // OpenAI Whisperを使用
  if (!provider) {
    throw classifyError(
      new Error('OpenAI provider is not available'),
      { reason: 'not_configured' }
    );
  }

  // 拡張プロバイダーインターフェースをチェック
  if (!('speechToText' in provider) || typeof provider.speechToText !== 'function') {
    throw classifyError(
      new Error('Speech-to-text is not supported by this provider'),
      { reason: 'unsupported_feature' }
    );
  }

  return provider.speechToText(options);
}

/**
 * 音声合成を実行
 * 
 * @param options 音声合成オプション
 * @returns 生成された音声
 * 
 * @example
 * ```typescript
 * const result = await textToSpeech({
 *   text: 'こんにちは、フリーマーケットへようこそ',
 *   voice: 'nova',
 *   speed: 1.0,
 * });
 * ```
 */
export async function textToSpeech(
  options: TextToSpeechOptions
): Promise<TextToSpeechResponse> {
  const provider = getLLMProvider('openai'); // OpenAI TTSを使用
  if (!provider) {
    throw classifyError(
      new Error('OpenAI provider is not available'),
      { reason: 'not_configured' }
    );
  }

  // 拡張プロバイダーインターフェースをチェック
  if (!('textToSpeech' in provider) || typeof provider.textToSpeech !== 'function') {
    throw classifyError(
      new Error('Text-to-speech is not supported by this provider'),
      { reason: 'unsupported_feature' }
    );
  }

  return provider.textToSpeech(options);
}

