# 結合テストガイド

このディレクトリには、Next.js API Routesの結合テストが含まれています。

## Cursorでの実行方法

### 1. 全テストを実行

```bash
npm test
```

### 2. 結合テストのみ実行

```bash
npm test -- integration
```

### 3. 特定のテストファイルのみ実行

```bash
npm test -- api-routes
```

### 4. ウォッチモード（開発中に便利）

```bash
npm test -- --watch
```

### 5. UIモード（ブラウザで結果を確認）

```bash
npm test -- --ui
```

## テストの書き方

### 基本的な構造

```typescript
import { describe, it, expect } from 'vitest';
import { GET as routeHandler } from '@/app/api/your-route/route';

describe('GET /api/your-route', () => {
  it('正常なレスポンスを返す', async () => {
    const request = new Request('http://localhost:3000');
    const response = await routeHandler();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('expectedField');
  });
});
```

### 認証が必要なAPIのテスト

```typescript
import { GET as adminRoute } from '@/app/api/admin/dashboard/route';

describe('GET /api/admin/dashboard', () => {
  it('認証トークンなしで403を返す', async () => {
    const request = new Request('http://localhost:3000');
    const response = await adminRoute(request);
    expect(response.status).toBe(403);
  });

  it('正しいトークンで200を返す', async () => {
    const request = new Request('http://localhost:3000', {
      headers: {
        'x-admin-token': process.env.ADMIN_TOKEN || 'admin-devtoken',
      },
    });
    const response = await adminRoute(request);
    expect(response.status).toBe(200);
  });
});
```

### POSTリクエストのテスト

```typescript
import { POST as createRoute } from '@/app/api/your-route/route';

describe('POST /api/your-route', () => {
  it('データを作成できる', async () => {
    const formData = new FormData();
    formData.append('field', 'value');
    
    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: formData,
    });
    
    const response = await createRoute(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id');
  });
});
```

## テスト環境の設定

### 環境変数

テスト実行時に必要な環境変数は、`.env.test`ファイルに設定するか、`vitest.config.ts`で設定できます。

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://...',
      ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'admin-devtoken',
    },
  },
});
```

### データベース接続

結合テストでは実際のデータベースに接続する場合があります。テスト用のデータベースを使用することを推奨します。

## ベストプラクティス

1. **テストは独立させる**: 各テストは他のテストに依存しないようにする
2. **クリーンアップ**: テスト後に作成したデータを削除する
3. **モックの使用**: 外部API（Stripe、OpenAIなど）はモックする
4. **エッジケースのテスト**: 正常系だけでなく、エラーケースもテストする

## トラブルシューティング

### モジュール解決エラー

`@/` エイリアスが解決できない場合、`vitest.config.ts`でパスエイリアスを設定してください。

### データベース接続エラー

`.env`ファイルに`DATABASE_URL`が設定されていることを確認してください。

### タイムアウトエラー

テストが長時間かかる場合、`vitest.config.ts`でタイムアウトを延長できます：

```typescript
test: {
  testTimeout: 10000, // 10秒
}
```

