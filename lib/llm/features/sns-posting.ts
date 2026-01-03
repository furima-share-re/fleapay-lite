// lib/llm/features/sns-posting.ts
// SNS自動投稿機能（LLMで投稿文生成）

import { executeTask } from '../router';
import { getTaskConfig } from '../config';
import type { ChatCompletionOptions } from '../types';

/**
 * SNS投稿プラットフォーム
 */
export type SNSPlatform = 'twitter' | 'instagram' | 'facebook' | 'linkedin' | 'threads';

/**
 * SNS投稿オプション
 */
export interface SNSPostingOptions {
  platform: SNSPlatform;
  content: {
    text?: string;
    imageUrl?: string;
    hashtags?: string[];
  };
  tone?: 'professional' | 'casual' | 'friendly' | 'promotional';
  language?: string;
  maxLength?: number;
  includeHashtags?: boolean;
}

/**
 * SNS投稿文生成レスポンス
 */
export interface SNSPostResponse {
  text: string;
  hashtags: string[];
  platform: SNSPlatform;
  length: number;
  estimatedEngagement?: number; // 0-100
}

/**
 * SNS投稿文を生成
 * 
 * @param options SNS投稿オプション
 * @returns 生成された投稿文
 * 
 * @example
 * ```typescript
 * const post = await generateSNSPost({
 *   platform: 'twitter',
 *   content: {
 *     text: '今日のフリマで素敵な商品を見つけました',
 *     imageUrl: 'https://example.com/image.jpg',
 *   },
 *   tone: 'casual',
 *   maxLength: 280,
 * });
 * ```
 */
export async function generateSNSPost(
  options: SNSPostingOptions
): Promise<SNSPostResponse> {
  const platformConfig = getPlatformConfig(options.platform);
  const maxLength = options.maxLength || platformConfig.maxLength;

  // プロンプトを構築
  const prompt = buildSNSPrompt(options, platformConfig);

  // LLMで投稿文を生成
  // モデルは config.ts の環境変数から自動取得されます。
  // 環境変数: LLM_TASK_TEXT_GENERATION_MODEL (デフォルト: 'gpt-4o')
  const config = getTaskConfig('text-generation');
  const response = await executeTask('text-generation', {
    model: config.preferredModel,
    messages: [
      {
        role: 'system',
        content: `You are a social media content creator. Generate engaging ${options.platform} posts.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: Math.floor(maxLength / 2), // トークン数の目安
  });

  // ハッシュタグを抽出
  const hashtags = extractHashtags(response.content, options.content.hashtags || []);

  // 投稿文を整形
  const text = formatPostText(response.content, maxLength, hashtags);

  return {
    text,
    hashtags,
    platform: options.platform,
    length: text.length,
    estimatedEngagement: estimateEngagement(text, hashtags, options.platform),
  };
}

/**
 * プラットフォーム設定
 */
function getPlatformConfig(platform: SNSPlatform) {
  const configs: Record<SNSPlatform, { maxLength: number; hashtagLimit: number }> = {
    twitter: { maxLength: 280, hashtagLimit: 3 },
    instagram: { maxLength: 2200, hashtagLimit: 30 },
    facebook: { maxLength: 5000, hashtagLimit: 10 },
    linkedin: { maxLength: 3000, hashtagLimit: 5 },
    threads: { maxLength: 500, hashtagLimit: 10 },
  };
  return configs[platform];
}

/**
 * SNS投稿プロンプトを構築
 */
function buildSNSPrompt(
  options: SNSPostingOptions,
  platformConfig: { maxLength: number; hashtagLimit: number }
): string {
  const parts: string[] = [];

  parts.push(`Generate a ${options.tone || 'casual'} ${options.platform} post.`);
  parts.push(`Maximum length: ${platformConfig.maxLength} characters.`);

  if (options.content.text) {
    parts.push(`Content: ${options.content.text}`);
  }

  if (options.content.imageUrl) {
    parts.push(`Image: ${options.content.imageUrl}`);
  }

  if (options.content.hashtags && options.content.hashtags.length > 0) {
    parts.push(`Include hashtags: ${options.content.hashtags.join(', ')}`);
  }

  if (options.language) {
    parts.push(`Language: ${options.language}`);
  }

  parts.push('Return only the post text, no explanations.');

  return parts.join('\n');
}

/**
 * ハッシュタグを抽出
 */
function extractHashtags(text: string, suggestedHashtags: string[]): string[] {
  const hashtags: string[] = [];

  // テキストからハッシュタグを抽出
  const hashtagRegex = /#(\w+)/g;
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }

  // 提案されたハッシュタグを追加
  for (const tag of suggestedHashtags) {
    if (!hashtags.includes(tag.toLowerCase())) {
      hashtags.push(tag.toLowerCase());
    }
  }

  return hashtags.slice(0, 10); // 最大10個
}

/**
 * 投稿文を整形
 */
function formatPostText(
  text: string,
  maxLength: number,
  hashtags: string[]
): string {
  // ハッシュタグを削除してテキストを取得
  let cleanText = text.replace(/#\w+/g, '').trim();

  // 長さ制限
  if (cleanText.length > maxLength) {
    cleanText = cleanText.slice(0, maxLength - 3) + '...';
  }

  // ハッシュタグを追加
  if (hashtags.length > 0) {
    const hashtagText = hashtags.map(tag => `#${tag}`).join(' ');
    const remainingLength = maxLength - cleanText.length - hashtagText.length - 1;
    if (remainingLength >= 0) {
      return `${cleanText}\n${hashtagText}`;
    }
  }

  return cleanText;
}

/**
 * エンゲージメントを推定（簡易版）
 */
function estimateEngagement(
  text: string,
  hashtags: string[],
  platform: SNSPlatform
): number {
  let score = 50; // ベーススコア

  // テキストの長さによる調整
  const lengthRatio = text.length / 280;
  if (lengthRatio > 0.8 && lengthRatio < 1.0) {
    score += 10; // 適切な長さ
  }

  // ハッシュタグによる調整
  score += Math.min(hashtags.length * 5, 20);

  // 絵文字の有無
  if (/[\u{1F300}-\u{1F9FF}]/u.test(text)) {
    score += 10;
  }

  return Math.min(score, 100);
}

