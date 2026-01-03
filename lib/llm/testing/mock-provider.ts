// lib/llm/testing/mock-provider.ts
// テスト用モックプロバイダー

import type {
  LLMProviderInterface,
  LLMProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ImageEditOptions,
  ImageEditResponse,
} from '../types';

/**
 * モックプロバイダー（テスト用）
 * 
 * 実際のLLM APIを呼び出さずにテストを実行可能
 */
export class MockProvider implements LLMProviderInterface {
  readonly name: LLMProvider = 'mock';
  
  private shouldFail = false;
  private failError?: Error;
  private mockResponse: ChatCompletionResponse;
  private mockImageResponse?: ImageEditResponse;

  constructor(mockResponse?: ChatCompletionResponse) {
    this.mockResponse = mockResponse || {
      content: 'Mock response',
      model: 'mock-model',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  }

  /**
   * モックレスポンスを設定
   */
  setMockResponse(response: ChatCompletionResponse): void {
    this.mockResponse = response;
  }

  /**
   * エラーを発生させるように設定
   */
  setShouldFail(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    this.failError = error;
  }

  /**
   * 画像編集レスポンスを設定
   */
  setMockImageResponse(response: ImageEditResponse): void {
    this.mockImageResponse = response;
  }

  isAvailable(): boolean {
    return true;
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (this.shouldFail) {
      throw this.failError || new Error('Mock provider error');
    }

    // オプションに応じてレスポンスをカスタマイズ可能
    return {
      ...this.mockResponse,
      model: options.model || this.mockResponse.model,
    };
  }

  async imageEdit(options: ImageEditOptions): Promise<ImageEditResponse> {
    if (this.shouldFail) {
      throw this.failError || new Error('Mock provider error');
    }

    if (this.mockImageResponse) {
      return this.mockImageResponse;
    }

    // デフォルトのモック画像レスポンス
    return {
      image: Buffer.from('mock-image-data'),
      model: options.model || 'mock-model',
    };
  }
}

/**
 * テスト用プロバイダーを作成
 */
export function createMockProvider(
  response?: ChatCompletionResponse
): MockProvider {
  return new MockProvider(response);
}

/**
 * テスト用のデフォルトレスポンスを作成
 */
export function createMockResponse(
  content: string = 'Mock response',
  model: string = 'mock-model'
): ChatCompletionResponse {
  return {
    content,
    model,
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };
}

