// lib/llm/features/podcast.ts
// ポッドキャスト生成機能（音声合成 + ストリーミング）

import { executeTask } from '../router';
import { textToSpeech } from './audio';
import type { ChatCompletionOptions } from '../types';

/**
 * ポッドキャストエピソードオプション
 */
export interface PodcastEpisodeOptions {
  title: string;
  script: string | string[]; // スクリプトまたはトピックリスト
  voice?: string;
  speed?: number;
  intro?: string;
  outro?: string;
  includeMusic?: boolean;
  segments?: PodcastSegment[];
}

/**
 * ポッドキャストセグメント
 */
export interface PodcastSegment {
  title: string;
  content: string;
  duration?: number; // 秒
}

/**
 * ポッドキャストエピソードレスポンス
 */
export interface PodcastEpisodeResponse {
  audio: Buffer;
  segments: PodcastSegment[];
  totalDuration: number; // 秒
  metadata: {
    title: string;
    voice: string;
    generatedAt: Date;
  };
}

/**
 * ポッドキャストエピソードを生成
 * 
 * @param options ポッドキャストエピソードオプション
 * @returns 生成されたポッドキャストエピソード
 * 
 * @example
 * ```typescript
 * const episode = await generatePodcastEpisode({
 *   title: 'フリマトレンド2025',
 *   script: [
 *     'フリーマーケットの最新トレンドについて',
 *     '人気商品の傾向',
 *     '売上向上のコツ',
 *   ],
 *   voice: 'nova',
 *   speed: 1.0,
 * });
 * ```
 */
export async function generatePodcastEpisode(
  options: PodcastEpisodeOptions
): Promise<PodcastEpisodeResponse> {
  // スクリプトを生成（トピックリストの場合）
  const script = typeof options.script === 'string'
    ? options.script
    : await generateScriptFromTopics(options.script, options.title);

  // セグメントに分割
  const segments = options.segments || splitIntoSegments(script);

  // 各セグメントを音声に変換
  const audioSegments: Buffer[] = [];

  // イントロ
  if (options.intro) {
    const introAudio = await textToSpeech({
      text: options.intro,
      voice: options.voice || 'nova',
      speed: options.speed || 1.0,
    });
    audioSegments.push(introAudio.audio);
  }

  // メインコンテンツ
  for (const segment of segments) {
    const segmentAudio = await textToSpeech({
      text: segment.content,
      voice: options.voice || 'nova',
      speed: options.speed || 1.0,
    });
    audioSegments.push(segmentAudio.audio);
  }

  // アウトロ
  if (options.outro) {
    const outroAudio = await textToSpeech({
      text: options.outro,
      voice: options.voice || 'nova',
      speed: options.speed || 1.0,
    });
    audioSegments.push(outroAudio.audio);
  }

  // 音声を結合
  const combinedAudio = combineAudioSegments(audioSegments);

  // 総再生時間を計算（簡易版）
  const totalDuration = estimateDuration(combinedAudio.length);

  return {
    audio: combinedAudio,
    segments,
    totalDuration,
    metadata: {
      title: options.title,
      voice: options.voice || 'nova',
      generatedAt: new Date(),
    },
  };
}

/**
 * トピックリストからスクリプトを生成
 */
async function generateScriptFromTopics(
  topics: string[],
  title: string
): Promise<string> {
  const prompt = `Create a podcast script for "${title}" covering the following topics:\n\n${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nMake it conversational and engaging.`;

  const response = await executeTask('text-generation', {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a podcast script writer. Create engaging, conversational scripts.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return response.content;
}

/**
 * スクリプトをセグメントに分割
 */
function splitIntoSegments(script: string): PodcastSegment[] {
  // 段落で分割
  const paragraphs = script.split(/\n\n+/).filter(p => p.trim().length > 0);

  return paragraphs.map((para, index) => ({
    title: `Segment ${index + 1}`,
    content: para.trim(),
  }));
}

/**
 * 音声セグメントを結合（簡易版）
 * 
 * 実際の実装では、FFmpeg等を使用して音声を結合
 */
function combineAudioSegments(segments: Buffer[]): Buffer {
  // 簡易実装：最初のセグメントを返す
  // TODO: 実際の音声結合処理を実装（FFmpeg等）
  return segments[0] || Buffer.alloc(0);
}

/**
 * 音声の再生時間を推定（簡易版）
 */
function estimateDuration(audioLength: number): number {
  // MP3の場合、おおよその計算
  // 実際の実装では、音声ファイルのメタデータから取得
  return Math.floor(audioLength / 16000); // 簡易計算
}

