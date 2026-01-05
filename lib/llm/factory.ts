// lib/llm/factory.ts
// LLMプロバイダーファクトリー

import type { LLMProviderInterface, LLMProvider, ProviderConfig } from './types';
import { OpenAIProvider } from './providers/openai';
// 将来追加するプロバイダー
// import { AnthropicProvider } from './providers/anthropic';
// import { GeminiProvider } from './providers/gemini';

/**
 * プロバイダーインスタンスのキャッシュ
 */
const providerCache = new Map<LLMProvider, LLMProviderInterface>();

/**
 * プロバイダーを作成または取得
 */
function createProvider(provider: LLMProvider): LLMProviderInterface | null {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    // 将来追加
    // case 'anthropic':
    //   return new AnthropicProvider();
    // case 'gemini':
    //   return new GeminiProvider();
    default:
      return null;
  }
}

/**
 * LLMプロバイダーを取得
 * 
 * @param provider プロバイダー名（省略時は環境変数から取得）
 * @returns プロバイダーインスタンス、利用不可の場合はnull
 * 
 * @example
 * ```typescript
 * // 環境変数から自動選択
 * const llm = getLLMProvider();
 * 
 * // 明示的に指定
 * const llm = getLLMProvider('openai');
 * ```
 */
export function getLLMProvider(provider?: LLMProvider): LLMProviderInterface | null {
  // プロバイダーが指定されていない場合は環境変数から取得
  const providerName = provider || (process.env.LLM_PROVIDER as LLMProvider) || 'openai';

  // キャッシュから取得
  if (providerCache.has(providerName)) {
    const cached = providerCache.get(providerName);
    if (cached && cached.isAvailable()) {
      return cached;
    }
    // 利用不可の場合はキャッシュから削除
    providerCache.delete(providerName);
  }

  // 新規作成
  const instance = createProvider(providerName);
  if (instance && instance.isAvailable()) {
    providerCache.set(providerName, instance);
    return instance;
  }

  return null;
}

/**
 * 利用可能なすべてのプロバイダーを取得
 */
export function getAvailableProviders(): LLMProviderInterface[] {
  const providers: LLMProvider[] = ['openai']; // 将来追加: 'anthropic', 'gemini'
  const available: LLMProviderInterface[] = [];

  for (const provider of providers) {
    const instance = getLLMProvider(provider);
    if (instance) {
      available.push(instance);
    }
  }

  return available;
}

/**
 * プロバイダー設定からインスタンスを作成（将来の拡張用）
 */
export function createProviderFromConfig(config: ProviderConfig): LLMProviderInterface | null {
  const instance = createProvider(config.provider);
  // 将来的に設定を適用する処理を追加可能
  return instance;
}

