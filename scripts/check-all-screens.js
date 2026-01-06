#!/usr/bin/env node
/**
 * 全画面チェックツール
 * すべてのページとAPIエンドポイントをチェックして、エラーや画面の崩れを検出します
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 設定
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 10000, // 10秒
  checkAPIs: process.env.CHECK_APIS !== 'false',
  outputFormat: process.env.OUTPUT_FORMAT || 'both', // 'json', 'html', 'both'
};

// チェック対象のページルート（appディレクトリ構造から生成）
const pageRoutes = [
  { path: '/', name: 'トップページ' },
  { path: '/success', name: '成功ページ' },
  { path: '/thanks', name: 'サンクスページ' },
  { path: '/cancel', name: 'キャンセルページ' },
  { path: '/onboarding/complete', name: 'オンボーディング完了' },
  { path: '/onboarding/refresh', name: 'オンボーディング更新' },
  { path: '/checkout', name: 'チェックアウト画面' },
  { path: '/seller-register', name: 'セラー登録画面' },
  { path: '/seller-purchase-standard', name: 'セラー購入標準画面' },
  { path: '/admin/dashboard', name: '管理者ダッシュボード' },
  { path: '/admin/sellers', name: '管理者出店者画面' },
  { path: '/admin/frames', name: '管理者フレーム画面' },
  { path: '/admin/payments', name: '管理者決済画面' },
  { path: '/kids-dashboard', name: 'Kidsダッシュボード' },
];

// チェック対象のAPIエンドポイント
const apiRoutes = [
  { path: '/api/ping', method: 'GET', name: 'ヘルスチェック' },
  { path: '/api/seller/summary', method: 'GET', name: 'セラーサマリー' },
  { path: '/api/seller/kids-summary', method: 'GET', name: 'Kidsサマリー' },
  { path: '/api/admin/dashboard', method: 'GET', name: '管理ダッシュボードAPI' },
  { path: '/api/admin/sellers', method: 'GET', name: '出店者管理API' },
  { path: '/api/admin/frames', method: 'GET', name: 'フレーム管理API' },
  { path: '/api/admin/stripe/summary', method: 'GET', name: 'StripeサマリーAPI' },
];

// 結果を格納する配列
const results = {
  pages: [],
  apis: [],
  summary: {
    total: 0,
    success: 0,
    errors: 0,
    warnings: 0,
    startTime: new Date().toISOString(),
    endTime: null,
  },
};

/**
 * HTTPリクエストを送信してレスポンスを取得
 */
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout'));
    }, config.timeout);

    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        clearTimeout(timeout);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    req.end();
  });
}

/**
 * HTMLの基本構造をチェック
 */
function checkHTMLStructure(html, url) {
  const issues = [];
  
  if (!html || html.trim().length === 0) {
    issues.push({ type: 'error', message: 'HTMLが空です' });
    return issues;
  }

  // 基本的なHTMLタグのチェック
  if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
    issues.push({ type: 'warning', message: 'HTMLドキュメント構造が見つかりません' });
  }

  if (!html.includes('<head')) {
    issues.push({ type: 'warning', message: '<head>タグが見つかりません' });
  }

  if (!html.includes('<body')) {
    issues.push({ type: 'warning', message: '<body>タグが見つかりません' });
  }

  // エラーメッセージの検出
  const errorPatterns = [
    /Error:/i,
    /Exception:/i,
    /Failed to/i,
    /Cannot read/i,
    /undefined/i,
    /null/i,
  ];

  errorPatterns.forEach((pattern) => {
    if (pattern.test(html)) {
      issues.push({ type: 'warning', message: `エラーパターンが検出されました: ${pattern}` });
    }
  });

  // Next.jsのエラーページの検出
  if (html.includes('Application error') || html.includes('Error occurred')) {
    issues.push({ type: 'error', message: 'Next.jsエラーページが表示されています' });
  }

  return issues;
}

/**
 * ページをチェック
 */
async function checkPage(route) {
  const url = `${config.baseUrl}${route.path}`;
  const result = {
    name: route.name,
    path: route.path,
    url,
    status: 'unknown',
    statusCode: null,
    issues: [],
    responseTime: null,
    timestamp: new Date().toISOString(),
  };

  try {
    const startTime = Date.now();
    const response = await fetchUrl(url);
    const responseTime = Date.now() - startTime;

    result.statusCode = response.statusCode;
    result.responseTime = responseTime;

    if (response.statusCode === 200) {
      result.status = 'success';
      results.summary.success++;

      // HTML構造をチェック
      const htmlIssues = checkHTMLStructure(response.body, url);
      result.issues = htmlIssues;

      if (htmlIssues.some((issue) => issue.type === 'error')) {
        result.status = 'error';
        results.summary.errors++;
      } else if (htmlIssues.length > 0) {
        result.status = 'warning';
        results.summary.warnings++;
      }
    } else if (response.statusCode >= 400 && response.statusCode < 500) {
      result.status = 'error';
      result.issues.push({
        type: 'error',
        message: `HTTP ${response.statusCode} エラー`,
      });
      results.summary.errors++;
    } else if (response.statusCode >= 500) {
      result.status = 'error';
      result.issues.push({
        type: 'error',
        message: `HTTP ${response.statusCode} サーバーエラー`,
      });
      results.summary.errors++;
    } else {
      result.status = 'warning';
      result.issues.push({
        type: 'warning',
        message: `予期しないステータスコード: ${response.statusCode}`,
      });
      results.summary.warnings++;
    }
  } catch (error) {
    result.status = 'error';
    result.issues.push({
      type: 'error',
      message: error.message || 'リクエストに失敗しました',
    });
    results.summary.errors++;
  }

  results.pages.push(result);
  results.summary.total++;

  return result;
}

/**
 * APIエンドポイントをチェック
 */
async function checkAPI(route) {
  const url = `${config.baseUrl}${route.path}`;
  const result = {
    name: route.name,
    path: route.path,
    method: route.method,
    url,
    status: 'unknown',
    statusCode: null,
    issues: [],
    responseTime: null,
    timestamp: new Date().toISOString(),
  };

  try {
    const startTime = Date.now();
    const response = await fetchUrl(url, {
      method: route.method,
    });
    const responseTime = Date.now() - startTime;

    result.statusCode = response.statusCode;
    result.responseTime = responseTime;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      result.status = 'success';
      results.summary.success++;
    } else if (response.statusCode === 401 || response.statusCode === 403) {
      result.status = 'warning';
      result.issues.push({
        type: 'warning',
        message: `認証が必要です (${response.statusCode})`,
      });
      results.summary.warnings++;
    } else if (response.statusCode >= 400 && response.statusCode < 500) {
      result.status = 'error';
      result.issues.push({
        type: 'error',
        message: `HTTP ${response.statusCode} エラー`,
      });
      results.summary.errors++;
    } else if (response.statusCode >= 500) {
      result.status = 'error';
      result.issues.push({
        type: 'error',
        message: `HTTP ${response.statusCode} サーバーエラー`,
      });
      results.summary.errors++;
    } else {
      result.status = 'warning';
      results.summary.warnings++;
    }
  } catch (error) {
    result.status = 'error';
    result.issues.push({
      type: 'error',
      message: error.message || 'リクエストに失敗しました',
    });
    results.summary.errors++;
  }

  results.apis.push(result);
  results.summary.total++;

  return result;
}

/**
 * 結果をJSON形式で出力
 */
function outputJSON() {
  const output = {
    ...results,
    summary: {
      ...results.summary,
      endTime: new Date().toISOString(),
    },
  };
  console.log(JSON.stringify(output, null, 2));
}

/**
 * 結果をHTML形式で出力
 */
function outputHTML() {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>全画面チェック結果</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #0070f3;
      padding-bottom: 10px;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .summary-item {
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    .summary-item.total { background: #e3f2fd; }
    .summary-item.success { background: #e8f5e9; }
    .summary-item.error { background: #ffebee; }
    .summary-item.warning { background: #fff3e0; }
    .summary-item h3 {
      margin: 0;
      font-size: 2em;
      color: #333;
    }
    .summary-item p {
      margin: 5px 0 0 0;
      color: #666;
    }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 {
      color: #333;
      margin-top: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .status-success { color: #4caf50; font-weight: bold; }
    .status-error { color: #f44336; font-weight: bold; }
    .status-warning { color: #ff9800; font-weight: bold; }
    .status-unknown { color: #9e9e9e; }
    .issues {
      margin-top: 5px;
    }
    .issue {
      padding: 5px 10px;
      margin: 3px 0;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .issue-error {
      background: #ffebee;
      color: #c62828;
    }
    .issue-warning {
      background: #fff3e0;
      color: #e65100;
    }
    .timestamp {
      color: #666;
      font-size: 0.9em;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>🔍 全画面チェック結果</h1>
  
  <div class="summary">
    <h2>📊 サマリー</h2>
    <div class="summary-grid">
      <div class="summary-item total">
        <h3>${results.summary.total}</h3>
        <p>総チェック数</p>
      </div>
      <div class="summary-item success">
        <h3>${results.summary.success}</h3>
        <p>成功</p>
      </div>
      <div class="summary-item error">
        <h3>${results.summary.errors}</h3>
        <p>エラー</p>
      </div>
      <div class="summary-item warning">
        <h3>${results.summary.warnings}</h3>
        <p>警告</p>
      </div>
    </div>
    <div class="timestamp">
      <strong>チェック開始:</strong> ${results.summary.startTime}<br>
      <strong>チェック終了:</strong> ${new Date().toISOString()}<br>
      <strong>ベースURL:</strong> ${config.baseUrl}
    </div>
  </div>

  <div class="section">
    <h2>📄 ページチェック結果 (${results.pages.length}件)</h2>
    <table>
      <thead>
        <tr>
          <th>ページ名</th>
          <th>パス</th>
          <th>ステータス</th>
          <th>HTTPコード</th>
          <th>レスポンス時間</th>
          <th>問題</th>
        </tr>
      </thead>
      <tbody>
        ${results.pages.map(page => `
          <tr>
            <td><strong>${page.name}</strong></td>
            <td><code>${page.path}</code></td>
            <td class="status-${page.status}">${getStatusText(page.status)}</td>
            <td>${page.statusCode || 'N/A'}</td>
            <td>${page.responseTime ? `${page.responseTime}ms` : 'N/A'}</td>
            <td>
              ${page.issues.length > 0 ? `
                <div class="issues">
                  ${page.issues.map(issue => `
                    <div class="issue issue-${issue.type}">
                      ${issue.message}
                    </div>
                  `).join('')}
                </div>
              ` : '<span style="color: #4caf50;">✓ 問題なし</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${config.checkAPIs && results.apis.length > 0 ? `
  <div class="section">
    <h2>🔌 APIチェック結果 (${results.apis.length}件)</h2>
    <table>
      <thead>
        <tr>
          <th>API名</th>
          <th>パス</th>
          <th>メソッド</th>
          <th>ステータス</th>
          <th>HTTPコード</th>
          <th>レスポンス時間</th>
          <th>問題</th>
        </tr>
      </thead>
      <tbody>
        ${results.apis.map(api => `
          <tr>
            <td><strong>${api.name}</strong></td>
            <td><code>${api.path}</code></td>
            <td><code>${api.method}</code></td>
            <td class="status-${api.status}">${getStatusText(api.status)}</td>
            <td>${api.statusCode || 'N/A'}</td>
            <td>${api.responseTime ? `${api.responseTime}ms` : 'N/A'}</td>
            <td>
              ${api.issues.length > 0 ? `
                <div class="issues">
                  ${api.issues.map(issue => `
                    <div class="issue issue-${issue.type}">
                      ${issue.message}
                    </div>
                  `).join('')}
                </div>
              ` : '<span style="color: #4caf50;">✓ 問題なし</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
</body>
</html>`;

  console.log(html);
}

function getStatusText(status) {
  const statusMap = {
    success: '✓ 成功',
    error: '✗ エラー',
    warning: '⚠ 警告',
    unknown: '? 不明',
  };
  return statusMap[status] || status;
}

/**
 * メイン処理
 */
async function main() {
  console.error('🔍 全画面チェックを開始します...');
  console.error(`ベースURL: ${config.baseUrl}\n`);

  // ページをチェック
  console.error(`📄 ${pageRoutes.length}個のページをチェック中...`);
  for (const route of pageRoutes) {
    const result = await checkPage(route);
    const statusIcon = result.status === 'success' ? '✓' : result.status === 'error' ? '✗' : '⚠';
    console.error(`${statusIcon} ${result.name} (${result.path}) - ${result.statusCode || 'ERROR'}`);
  }

  // APIをチェック
  if (config.checkAPIs) {
    console.error(`\n🔌 ${apiRoutes.length}個のAPIエンドポイントをチェック中...`);
    for (const route of apiRoutes) {
      const result = await checkAPI(route);
      const statusIcon = result.status === 'success' ? '✓' : result.status === 'error' ? '✗' : '⚠';
      console.error(`${statusIcon} ${result.name} (${result.path}) - ${result.statusCode || 'ERROR'}`);
    }
  }

  results.summary.endTime = new Date().toISOString();

  // 結果を出力
  console.error('\n📊 チェック完了！\n');
  
  if (config.outputFormat === 'json' || config.outputFormat === 'both') {
    outputJSON();
  }
  
  if (config.outputFormat === 'html' || config.outputFormat === 'both') {
    outputHTML();
  }

  // 終了コード
  process.exit(results.summary.errors > 0 ? 1 : 0);
}

// 実行
main().catch((error) => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});



