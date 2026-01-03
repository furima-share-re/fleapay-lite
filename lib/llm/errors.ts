// lib/llm/errors.ts
// LLMエラー分類とハンドリング

/**
 * LLMエラーの種類
 */
export type LLMErrorCode =
  | 'NETWORK'           // ネットワークエラー（接続失敗、タイムアウト）
  | 'AUTH'              // 認証エラー（API Key不正、権限不足）
  | 'RATE_LIMIT'        // レート制限エラー
  | 'INVALID_REQUEST'   // 不正なリクエスト（パラメータエラー）
  | 'TIMEOUT'           // タイムアウトエラー
  | 'PROVIDER_ERROR'    // プロバイダー側のエラー
  | 'UNKNOWN';          // 不明なエラー

/**
 * LLMエラークラス
 * 
 * エラーの種類とリトライ可能性を明確に分類
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public code: LLMErrorCode,
    public retryable: boolean,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LLMError';
    // スタックトレースを保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMError);
    }
  }

  /**
   * エラーがリトライ可能かどうかを判定
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof LLMError) {
      return error.retryable;
    }
    // デフォルトではリトライ可能とみなす（ネットワークエラー等）
    return true;
  }

  /**
   * エラーの詳細情報を取得
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * エラーを分類してLLMErrorに変換
 * 
 * @param error 元のエラー
 * @param context 追加コンテキスト情報
 * @returns 分類されたLLMError
 */
export function classifyError(
  error: unknown,
  context?: Record<string, unknown>
): LLMError {
  // 既にLLMErrorの場合はそのまま返す
  if (error instanceof LLMError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const errorString = message.toLowerCase();

  // レート制限エラー
  if (
    errorString.includes('rate limit') ||
    errorString.includes('rate_limit') ||
    errorString.includes('429') ||
    errorString.includes('quota')
  ) {
    return new LLMError(
      `Rate limit exceeded: ${message}`,
      'RATE_LIMIT',
      true, // リトライ可能（時間をおいて再試行）
      { originalError: message, ...context }
    );
  }

  // 認証エラー
  if (
    errorString.includes('authentication') ||
    errorString.includes('unauthorized') ||
    errorString.includes('401') ||
    errorString.includes('403') ||
    errorString.includes('invalid api key') ||
    errorString.includes('api key')
  ) {
    return new LLMError(
      `Authentication failed: ${message}. Please check your API key.`,
      'AUTH',
      false, // リトライ不可能（API Keyの問題）
      { originalError: message, ...context }
    );
  }

  // タイムアウトエラー
  if (
    errorString.includes('timeout') ||
    errorString.includes('etimedout') ||
    errorString.includes('timed out') ||
    errorString.includes('504')
  ) {
    return new LLMError(
      `Request timeout: ${message}`,
      'TIMEOUT',
      true, // リトライ可能
      { originalError: message, ...context }
    );
  }

  // ネットワークエラー
  if (
    errorString.includes('network') ||
    errorString.includes('econnrefused') ||
    errorString.includes('enotfound') ||
    errorString.includes('econnreset') ||
    errorString.includes('fetch failed')
  ) {
    return new LLMError(
      `Network error: ${message}. Please check your network connection.`,
      'NETWORK',
      true, // リトライ可能
      { originalError: message, ...context }
    );
  }

  // 不正なリクエストエラー
  if (
    errorString.includes('invalid') ||
    errorString.includes('bad request') ||
    errorString.includes('400') ||
    errorString.includes('validation')
  ) {
    return new LLMError(
      `Invalid request: ${message}. Please check your request parameters.`,
      'INVALID_REQUEST',
      false, // リトライ不可能（パラメータの問題）
      { originalError: message, ...context }
    );
  }

  // プロバイダー側のエラー
  if (
    errorString.includes('500') ||
    errorString.includes('502') ||
    errorString.includes('503') ||
    errorString.includes('internal server error') ||
    errorString.includes('service unavailable')
  ) {
    return new LLMError(
      `Provider error: ${message}. The LLM provider may be experiencing issues.`,
      'PROVIDER_ERROR',
      true, // リトライ可能（一時的な問題の可能性）
      { originalError: message, ...context }
    );
  }

  // 不明なエラー
  return new LLMError(
    `Unknown error: ${message}`,
    'UNKNOWN',
    true, // デフォルトでリトライ可能
    { originalError: message, ...context }
  );
}

/**
 * エラーメッセージをユーザーフレンドリーに変換
 */
export function getUserFriendlyErrorMessage(error: LLMError): string {
  switch (error.code) {
    case 'AUTH':
      return `認証に失敗しました。API Keyが正しく設定されているか確認してください。`;
    case 'RATE_LIMIT':
      return `レート制限に達しました。しばらく待ってから再度お試しください。`;
    case 'TIMEOUT':
      return `リクエストがタイムアウトしました。ネットワーク接続を確認してください。`;
    case 'NETWORK':
      return `ネットワークエラーが発生しました。インターネット接続を確認してください。`;
    case 'INVALID_REQUEST':
      return `リクエストが不正です。パラメータを確認してください。`;
    case 'PROVIDER_ERROR':
      return `LLMプロバイダーでエラーが発生しました。しばらく待ってから再度お試しください。`;
    default:
      return `エラーが発生しました: ${error.message}`;
  }
}

