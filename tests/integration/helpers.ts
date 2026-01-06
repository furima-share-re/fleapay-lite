/**
 * 結合テスト用のヘルパー関数
 */

/**
 * モックリクエストを作成する
 */
export function createMockRequest(
  url: string = 'http://localhost:3000',
  options: {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit;
  } = {}
): Request {
  return new Request(url, {
    method: options.method || 'GET',
    headers: new Headers(options.headers),
    body: options.body,
  });
}

/**
 * 認証トークン付きのリクエストを作成する
 */
export function createAuthenticatedRequest(
  url: string,
  token: string,
  options: {
    method?: string;
    body?: BodyInit;
  } = {}
): Request {
  return createMockRequest(url, {
    ...options,
    headers: {
      'x-admin-token': token,
    },
  });
}

/**
 * FormDataを作成するヘルパー
 */
export function createFormData(data: Record<string, string | File>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
}

/**
 * JSONレスポンスを取得してパースする
 */
export async function getJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error(`Expected JSON response, got ${contentType}`);
  }
  return response.json();
}

/**
 * レスポンスのステータスコードを検証する
 */
export function expectStatus(response: Response, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}`
    );
  }
}

