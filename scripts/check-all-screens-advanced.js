#!/usr/bin/env node
/**
 * 全画面チェックツール（高度版）
 * Puppeteerを使用して、コンソールエラーやレイアウトの崩れを詳細にチェックします
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Puppeteerのインポート（オプショナル）
let puppeteer;
async function loadPuppeteer() {
  try {
    puppeteer = await import('puppeteer');
  } catch (error) {
    console.error('⚠️  Puppeteerがインストールされていません。');
    console.error('   高度なチェック機能を使用するには、以下を実行してください:');
    console.error('   npm install --save-dev puppeteer');
    console.error('\n   基本的なチェックツールを使用する場合は、check-all-screens.js を使用してください。\n');
    process.exit(1);
  }
}

// 設定
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 30000, // 30秒
  headless: process.env.HEADLESS !== 'false',
  viewport: {
    width: 1280,
    height: 720,
  },
  checkAPIs: process.env.CHECK_APIS !== 'false',
  outputFormat: process.env.OUTPUT_FORMAT || 'both',
  outputFile: process.env.OUTPUT_FILE || null,
};

// チェック対象のページルート
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

// 結果を格納する配列
const results = {
  pages: [],
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
 * ページをチェック（Puppeteer使用）
 */
async function checkPage(page, route, browser) {
  const url = `${config.baseUrl}${route.path}`;
  const result = {
    name: route.name,
    path: route.path,
    url,
    status: 'unknown',
    statusCode: null,
    issues: [],
    consoleErrors: [],
    consoleWarnings: [],
    responseTime: null,
    loadTime: null,
    screenshot: null,
    timestamp: new Date().toISOString(),
  };

  try {
    // コンソールメッセージを収集
    const consoleMessages = [];
    const consoleErrors = [];
    const consoleWarnings = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        consoleErrors.push({
          message: text,
          location: msg.location(),
        });
      } else if (type === 'warning') {
        consoleWarnings.push({
          message: text,
          location: msg.location(),
        });
      }
      
      consoleMessages.push({
        type,
        text,
      });
    });

    // ページエラーを収集
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push({
        message: error.message,
        stack: error.stack,
      });
    });

    // リクエストエラーを収集
    const requestErrors = [];
    page.on('requestfailed', (request) => {
      requestErrors.push({
        url: request.url(),
        failure: request.failure(),
      });
    });

    const startTime = Date.now();
    
    // ページに移動
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: config.timeout,
    });

    const loadTime = Date.now() - startTime;
    result.responseTime = loadTime;
    result.statusCode = response.status();

    // ページが完全に読み込まれるまで少し待つ
    await page.waitForTimeout(1000);

    // スクリーンショットを取得
    try {
      result.screenshot = await page.screenshot({
        encoding: 'base64',
        fullPage: true,
      });
    } catch (screenshotError) {
      result.issues.push({
        type: 'warning',
        message: `スクリーンショットの取得に失敗: ${screenshotError.message}`,
      });
    }

    // ステータスコードのチェック
    if (response.status() === 200) {
      result.status = 'success';
      results.summary.success++;
    } else if (response.status() >= 400 && response.status() < 500) {
      result.status = 'error';
      result.issues.push({
        type: 'error',
        message: `HTTP ${response.status()} エラー`,
      });
      results.summary.errors++;
    } else if (response.status() >= 500) {
      result.status = 'error';
      result.issues.push({
        type: 'error',
        message: `HTTP ${response.status()} サーバーエラー`,
      });
      results.summary.errors++;
    }

    // HTML構造のチェック
    const html = await page.content();
    const htmlIssues = checkHTMLStructure(html, url);
    result.issues.push(...htmlIssues);

    // コンソールエラーのチェック
    if (consoleErrors.length > 0) {
      result.consoleErrors = consoleErrors;
      result.issues.push({
        type: 'error',
        message: `${consoleErrors.length}個のコンソールエラーが検出されました`,
      });
      if (result.status === 'success') {
        result.status = 'error';
        results.summary.success--;
        results.summary.errors++;
      }
    }

    // コンソール警告のチェック
    if (consoleWarnings.length > 0) {
      result.consoleWarnings = consoleWarnings;
      result.issues.push({
        type: 'warning',
        message: `${consoleWarnings.length}個のコンソール警告が検出されました`,
      });
      if (result.status === 'success') {
        result.status = 'warning';
        results.summary.success--;
        results.summary.warnings++;
      }
    }

    // ページエラーのチェック
    if (pageErrors.length > 0) {
      result.issues.push({
        type: 'error',
        message: `${pageErrors.length}個のページエラーが検出されました`,
        details: pageErrors,
      });
      if (result.status === 'success') {
        result.status = 'error';
        results.summary.success--;
        results.summary.errors++;
      }
    }

    // リクエストエラーのチェック
    if (requestErrors.length > 0) {
      result.issues.push({
        type: 'warning',
        message: `${requestErrors.length}個のリクエストエラーが検出されました`,
        details: requestErrors,
      });
      if (result.status === 'success') {
        result.status = 'warning';
        results.summary.success--;
        results.summary.warnings++;
      }
    }

    // レイアウトの崩れをチェック
    const layoutIssues = await checkLayout(page);
    if (layoutIssues.length > 0) {
      result.issues.push(...layoutIssues);
      if (result.status === 'success') {
        result.status = 'warning';
        results.summary.success--;
        results.summary.warnings++;
      }
    }

    result.loadTime = loadTime;

  } catch (error) {
    result.status = 'error';
    result.issues.push({
      type: 'error',
      message: error.message || 'ページの読み込みに失敗しました',
    });
    results.summary.errors++;
  }

  results.pages.push(result);
  results.summary.total++;

  return result;
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

  if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
    issues.push({ type: 'warning', message: 'HTMLドキュメント構造が見つかりません' });
  }

  if (!html.includes('<head')) {
    issues.push({ type: 'warning', message: '<head>タグが見つかりません' });
  }

  if (!html.includes('<body')) {
    issues.push({ type: 'warning', message: '<body>タグが見つかりません' });
  }

  // Next.jsのエラーページの検出
  if (html.includes('Application error') || html.includes('Error occurred')) {
    issues.push({ type: 'error', message: 'Next.jsエラーページが表示されています' });
  }

  return issues;
}

/**
 * レイアウトの崩れをチェック
 */
async function checkLayout(page) {
  const issues = [];

  try {
    // オーバーフローしている要素をチェック
    const overflowElements = await page.evaluate(() => {
      const elements = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        // 画面外にはみ出している要素を検出
        if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
          if (rect.width > 0 && rect.height > 0) {
            elements.push({
              tag: el.tagName,
              id: el.id || null,
              class: el.className || null,
              overflow: {
                right: Math.max(0, rect.right - window.innerWidth),
                bottom: Math.max(0, rect.bottom - window.innerHeight),
              },
            });
          }
        }
      });
      
      return elements;
    });

    if (overflowElements.length > 0) {
      issues.push({
        type: 'warning',
        message: `${overflowElements.length}個の要素が画面外にはみ出しています`,
        details: overflowElements.slice(0, 5), // 最初の5個だけ表示
      });
    }

    // 空の要素をチェック（画像の読み込み失敗など）
    const brokenImages = await page.evaluate(() => {
      const images = [];
      const imgElements = document.querySelectorAll('img');
      
      imgElements.forEach((img) => {
        if (!img.complete || img.naturalHeight === 0) {
          images.push({
            src: img.src,
            alt: img.alt || null,
          });
        }
      });
      
      return images;
    });

    if (brokenImages.length > 0) {
      issues.push({
        type: 'warning',
        message: `${brokenImages.length}個の画像が読み込まれていません`,
        details: brokenImages.slice(0, 5),
      });
    }

  } catch (error) {
    issues.push({
      type: 'warning',
      message: `レイアウトチェック中にエラーが発生: ${error.message}`,
    });
  }

  return issues;
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
  
  // スクリーンショットは大きいので、必要に応じて除外
  if (config.outputFormat === 'json') {
    output.pages = output.pages.map(page => ({
      ...page,
      screenshot: page.screenshot ? '[base64 encoded]' : null,
    }));
  }
  
  const jsonOutput = JSON.stringify(output, null, 2);
  
  if (config.outputFile) {
    writeFileSync(config.outputFile, jsonOutput);
    console.error(`結果を ${config.outputFile} に保存しました`);
  } else {
    console.log(jsonOutput);
  }
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
  <title>全画面チェック結果（高度版）</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 1400px;
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
    .page-result {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .page-title {
      font-size: 1.2em;
      font-weight: bold;
      color: #333;
    }
    .status-badge {
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
    }
    .status-success { background: #e8f5e9; color: #2e7d32; }
    .status-error { background: #ffebee; color: #c62828; }
    .status-warning { background: #fff3e0; color: #e65100; }
    .page-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin: 10px 0;
      font-size: 0.9em;
      color: #666;
    }
    .issues {
      margin-top: 10px;
    }
    .issue {
      padding: 10px;
      margin: 5px 0;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .issue-error {
      background: #ffebee;
      color: #c62828;
      border-left: 4px solid #f44336;
    }
    .issue-warning {
      background: #fff3e0;
      color: #e65100;
      border-left: 4px solid #ff9800;
    }
    .console-errors, .console-warnings {
      margin-top: 10px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      max-height: 200px;
      overflow-y: auto;
    }
    .screenshot {
      margin-top: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
      max-width: 100%;
    }
    .screenshot img {
      width: 100%;
      height: auto;
      display: block;
    }
    .timestamp {
      color: #666;
      font-size: 0.9em;
      margin-top: 10px;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>🔍 全画面チェック結果（高度版）</h1>
  
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
    ${results.pages.map(page => `
      <div class="page-result">
        <div class="page-header">
          <div class="page-title">${page.name}</div>
          <div class="status-badge status-${page.status}">${getStatusText(page.status)}</div>
        </div>
        <div class="page-info">
          <div><strong>パス:</strong> <code>${page.path}</code></div>
          <div><strong>HTTPコード:</strong> ${page.statusCode || 'N/A'}</div>
          <div><strong>読み込み時間:</strong> ${page.loadTime ? `${page.loadTime}ms` : 'N/A'}</div>
        </div>
        ${page.issues.length > 0 ? `
          <div class="issues">
            ${page.issues.map(issue => `
              <div class="issue issue-${issue.type}">
                <strong>${issue.type === 'error' ? '❌' : '⚠️'}</strong> ${issue.message}
                ${issue.details ? `<pre style="margin-top: 5px; font-size: 0.85em;">${JSON.stringify(issue.details, null, 2)}</pre>` : ''}
              </div>
            `).join('')}
          </div>
        ` : '<div style="color: #4caf50; margin-top: 10px;">✓ 問題なし</div>'}
        ${page.consoleErrors.length > 0 ? `
          <div class="console-errors">
            <strong>コンソールエラー (${page.consoleErrors.length}件):</strong><br>
            ${page.consoleErrors.slice(0, 10).map(err => `• ${err.message}`).join('<br>')}
            ${page.consoleErrors.length > 10 ? `<br>...他 ${page.consoleErrors.length - 10}件` : ''}
          </div>
        ` : ''}
        ${page.consoleWarnings.length > 0 ? `
          <div class="console-warnings">
            <strong>コンソール警告 (${page.consoleWarnings.length}件):</strong><br>
            ${page.consoleWarnings.slice(0, 10).map(warn => `• ${warn.message}`).join('<br>')}
            ${page.consoleWarnings.length > 10 ? `<br>...他 ${page.consoleWarnings.length - 10}件` : ''}
          </div>
        ` : ''}
        ${page.screenshot ? `
          <div class="screenshot">
            <strong>スクリーンショット:</strong>
            <img src="data:image/png;base64,${page.screenshot}" alt="${page.name}">
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  if (config.outputFile) {
    const htmlFile = config.outputFile.replace(/\.json$/, '.html');
    writeFileSync(htmlFile, html);
    console.error(`HTML結果を ${htmlFile} に保存しました`);
  } else {
    console.log(html);
  }
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
  // Puppeteerをロード
  await loadPuppeteer();
  
  console.error('🔍 全画面チェック（高度版）を開始します...');
  console.error(`ベースURL: ${config.baseUrl}`);
  console.error(`ヘッドレスモード: ${config.headless}\n`);

  const browser = await puppeteer.default.launch({
    headless: config.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport(config.viewport);

  try {
    // 各ページをチェック
    for (const route of pageRoutes) {
      console.error(`📄 チェック中: ${route.name} (${route.path})`);
      const result = await checkPage(page, route, browser);
      const statusIcon = result.status === 'success' ? '✓' : result.status === 'error' ? '✗' : '⚠';
      console.error(`   ${statusIcon} ${result.statusCode || 'ERROR'} - ${result.loadTime || 0}ms`);
      
      if (result.consoleErrors.length > 0) {
        console.error(`   ⚠️  ${result.consoleErrors.length}個のコンソールエラー`);
      }
    }
  } finally {
    await browser.close();
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

