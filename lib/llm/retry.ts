// lib/llm/retry.ts
// リトライロジック（指数バックオフ）

import { classifyError, LLMError } from './errors';

/**
 * バックオフ戦略
 */
export type BackoffStrategy = 'exponential' | 'linear' | 'fixed';

/**
 * リトライオプション
 */
export interface RetryOptions {
  /**
   * 最大リトライ回数（デフォルト: 3）
   */
  maxRetries?: number;
  
  /**
   * バックオフ戦略（デフォルト: 'exponential'）
   */
  backoff?: BackoffStrategy;
  
  /**
   * 初回待機時間（ミリ秒、デフォルト: 1000）
   */
  initialDelay?: number;
  
  /**
   * 最大待機時間（ミリ秒、デフォルト: 30000）
   */
  maxDelay?: number;
  
  /**
   * リトライ可能かどうかを判定する関数
   */
  retryable?: (error: Error) => boolean;
  
  /**
   * リトライ前のコールバック
   */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * 待機時間を計算
 */
function calculateDelay(
  attempt: number,
  strategy: BackoffStrategy,
  initialDelay: number,
  maxDelay: number
): number {
  let delay: number;

  switch (strategy) {
    case 'exponential':
      delay = initialDelay * Math.pow(2, attempt);
      break;
    case 'linear':
      delay = initialDelay * (attempt + 1);
      break;
    case 'fixed':
      delay = initialDelay;
      break;
  }

  return Math.min(delay, maxDelay);
}

/**
 * 指定した時間だけ待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライロジック付きで関数を実行
 * 
 * @param fn 実行する関数
 * @param options リトライオプション
 * @returns 関数の実行結果
 * 
 * @example
 * ```typescript
 * const response = await withRetry(
 *   () => provider.chatCompletion(options),
 *   {
 *     maxRetries: 3,
 *     backoff: 'exponential',
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    backoff = 'exponential',
    initialDelay = 1000,
    maxDelay = 30000,
    retryable = (error) => LLMError.isRetryable(error),
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // エラーを分類
      const classifiedError = classifyError(error);
      lastError = classifiedError;

      // リトライ不可能なエラーの場合は即座にthrow
      if (!retryable(classifiedError)) {
        throw classifiedError;
      }

      // 最大リトライ回数に達した場合はthrow
      if (attempt === maxRetries) {
        throw classifiedError;
      }

      // 待機時間を計算
      const delay = calculateDelay(attempt, backoff, initialDelay, maxDelay);

      // リトライ前のコールバックを実行
      if (onRetry) {
        onRetry(classifiedError, attempt + 1, delay);
      }

      // 待機
      await sleep(delay);
    }
  }

  // ここには到達しないはずだが、型安全性のため
  if (lastError) {
    throw lastError;
  }
  throw new Error('Unexpected error: retry loop exited without error');
}

/**
 * リトライ可能なエラーかどうかを判定（簡易版）
 */
export function isRetryableError(error: unknown): boolean {
  return LLMError.isRetryable(error);
}

