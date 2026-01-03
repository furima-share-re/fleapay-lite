// lib/llm/testing/test-utils.ts
// テストユーティリティ

import { MockProvider, createMockProvider, createMockResponse } from './mock-provider';
import type { ChatCompletionResponse } from '../types';

/**
 * 環境変数をモックするヘルパー
 * 
 * @param env モックする環境変数
 * @param fn 実行する関数
 * 
 * @example
 * ```typescript
 * withMockEnv({ OPENAI_API_KEY: 'test-key' }, () => {
 *   // テストコード
 * });
 * ```
 */
export function withMockEnv(
  env: Record<string, string | undefined>,
  fn: () => void
): void {
  const original = { ...process.env };
  
  // 環境変数を設定
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  
  try {
    fn();
  } finally {
    // 元の環境変数に戻す
    process.env = original;
  }
}

/**
 * 非同期関数用の環境変数モック
 */
export async function withMockEnvAsync<T>(
  env: Record<string, string | undefined>,
  fn: () => Promise<T>
): Promise<T> {
  const original = { ...process.env };
  
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  
  try {
    return await fn();
  } finally {
    process.env = original;
  }
}

/**
 * テスト用のプロバイダー設定
 */
export interface TestProviderConfig {
  response?: ChatCompletionResponse;
  shouldFail?: boolean;
  failError?: Error;
}

/**
 * テスト用のプロバイダーを作成（簡易版）
 */
export function createTestProvider(config?: TestProviderConfig): MockProvider {
  const provider = createMockProvider(config?.response);
  
  if (config?.shouldFail) {
    provider.setShouldFail(true, config.failError);
  }
  
  return provider;
}

/**
 * テスト用のデフォルトレスポンス
 */
export const DEFAULT_MOCK_RESPONSE = createMockResponse(
  'This is a test response',
  'test-model'
);

/**
 * エクスポート
 */
export { MockProvider, createMockProvider, createMockResponse };

