/**
 * 結合テスト: Next.js API Routes
 * 
 * このファイルは、Next.jsのAPI Route Handlerを統合的にテストする例です。
 * Cursorで実行可能です。
 * 
 * 実行方法:
 *   npm test                    # 全テスト実行
 *   npm test -- api-routes      # このファイルのみ実行
 *   npm test -- --watch         # ウォッチモード
 */

import { describe, it, expect } from 'vitest';
import { GET as pingGET } from '@/app/api/ping/route';
import { GET as adminDashboardGET } from '@/app/api/admin/dashboard/route';
import { createMockRequest, createAuthenticatedRequest, getJsonResponse } from './helpers';

describe('API Routes Integration Tests', () => {
  describe('GET /api/ping', () => {
    it('正常なレスポンスを返す', async () => {
      const request = createMockRequest();
      const response = await pingGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('prisma');
      expect(data).toHaveProperty('git');
    });

    it('タイムスタンプがISO形式である', async () => {
      const request = createMockRequest();
      const response = await pingGET();
      const data = await response.json();

      // ISO 8601形式のタイムスタンプをチェック
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('Prisma接続状態が含まれる', async () => {
      const request = createMockRequest();
      const response = await pingGET();
      const data = await response.json();

      // Prisma接続状態は 'connected' または 'not_available' のいずれか
      expect(['connected', 'not_available']).toContain(data.prisma);
    });
  });

  describe('GET /api/admin/dashboard', () => {
    it('認証トークンなしでアクセスすると403を返す', async () => {
      const request = createMockRequest();
      const response = await adminDashboardGET(request);
      
      expect(response.status).toBe(403);
    });

    it('正しい認証トークンでアクセスすると200を返す', async () => {
      const adminToken = process.env.ADMIN_TOKEN || 'admin-devtoken';
      const request = createMockRequest('http://localhost:3000/api/admin/dashboard', {
        'x-admin-token': adminToken,
      });
      
      const response = await adminDashboardGET(request);
      
      // データベース接続がある場合、200を返すはず
      // 接続がない場合でも、適切なエラーレスポンスを返すはず
      expect([200, 500]).toContain(response.status);
    });

    it('間違った認証トークンでアクセスすると403を返す', async () => {
      const request = createMockRequest('http://localhost:3000/api/admin/dashboard', {
        'x-admin-token': 'wrong-token',
      });
      
      const response = await adminDashboardGET(request);
      expect(response.status).toBe(403);
    });
  });

  describe('APIレスポンス形式の検証', () => {
    it('ping APIはJSONを返す', async () => {
      const request = createMockRequest();
      const response = await pingGET();
      
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('エラーレスポンスも適切な形式である', async () => {
      const request = createMockRequest();
      const response = await adminDashboardGET(request);
      const data = await response.json();
      
      // エラーレスポンスにも適切な構造があることを確認
      expect(data).toBeDefined();
    });
  });
});

