/**
 * HTMLファイルの全画面スクリーンショットを取得するスクリプト
 * 使用方法: node scripts/take-html-screenshot.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// HTMLファイルのパス
const htmlPath = path.join('C:', 'Users', 'yasho', 'OneDrive', 'デスクトップ', 'staging-verification-urls.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

// 出力ファイル名
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const outputPath = path.join(__dirname, '..', `staging-verification-urls-screenshot-${timestamp}.png`);

async function takeScreenshot() {
  console.log('=========================================');
  console.log('HTMLファイル スクリーンショット取得');
  console.log('=========================================');
  console.log(`ファイル: ${htmlPath}`);
  console.log(`URL: ${fileUrl}`);
  console.log('');

  // ファイルの存在確認
  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ ファイルが見つかりません: ${htmlPath}`);
    process.exit(1);
  }

  let browser;
  try {
    console.log('ブラウザを起動しています...');
    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage();
    
    // ビューポートサイズを設定（大きな画面サイズで全画面をキャプチャ）
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('HTMLファイルを読み込んでいます...');
    await page.goto(fileUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // ページが完全にレンダリングされるまで待機
    console.log('ページのレンダリングを待機中...');
    await page.waitForTimeout(3000);

    // ページ全体の高さを取得
    const bodyHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
    });

    console.log(`ページの高さ: ${bodyHeight}px`);
    console.log('スクリーンショットを取得しています...');

    // 全画面のスクリーンショットを取得
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
    console.log('');
    console.log('画面の崩れを確認してください。');

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

