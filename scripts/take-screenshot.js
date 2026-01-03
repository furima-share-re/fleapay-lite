/**
 * 検証環境ページのスクリーンショットを取得するスクリプト
 * 使用方法: node scripts/take-screenshot.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const url = 'https://fleapay-lite-t1.onrender.com';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const outputPath = path.join(__dirname, '..', `verification-screenshot-${timestamp}.png`);

async function takeScreenshot() {
  console.log('=========================================');
  console.log('検証環境ページ スクリーンショット取得');
  console.log('=========================================');
  console.log(`URL: ${url}`);
  console.log('');

  let browser;
  try {
    console.log('ブラウザを起動しています...');
    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage();
    
    // ビューポートサイズを設定
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('ページを読み込んでいます...');
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 少し待機してページが完全にレンダリングされるのを待つ
    await page.waitForTimeout(2000);

    console.log('スクリーンショットを取得しています...');
    await page.screenshot({
      path: outputPath,
      fullPage: true,
    });

    const stats = fs.statSync(outputPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    console.log('');
    console.log('✅ スクリーンショットを保存しました！');
    console.log(`   ファイル: ${outputPath}`);
    console.log(`   サイズ: ${fileSizeKB} KB`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.log('');
    console.log('Playwrightがインストールされていない可能性があります。');
    console.log('以下のコマンドでインストールしてください:');
    console.log('  npm install playwright');
    console.log('  npx playwright install chromium');
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

takeScreenshot();

