// scripts/test-build.js
// 内部でビルドテストを実行し、エラーを自動検出・修正するスクリプト

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 ビルドテストを開始します...\n');

// エラーを収集
const errors = [];
const warnings = [];

// ステップ1: TypeScript型チェック（高速）
console.log('📝 ステップ1: TypeScript型チェックを実行中...');
try {
  const result = execSync('npx tsc --noEmit', {
    encoding: 'utf-8',
    cwd: rootDir,
    stdio: 'pipe'
  });
  console.log('✅ 型チェック: エラーなし\n');
} catch (error) {
  const output = error.stdout || error.stderr || '';
  const lines = output.split('\n');
  
  lines.forEach(line => {
    if (line.includes('error TS')) {
      errors.push({
        type: 'type',
        message: line.trim(),
        file: extractFile(line),
        line: extractLine(line)
      });
    } else if (line.includes('warning')) {
      warnings.push(line.trim());
    }
  });
  
  if (errors.length > 0) {
    console.log(`❌ 型エラーが ${errors.length}件 見つかりました:\n`);
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.message}`);
      if (err.file) console.log(`   ファイル: ${err.file}`);
    });
    console.log('');
  }
}

// ステップ2: Next.jsビルド（時間がかかるが、実際のビルドエラーを検出）
console.log('🔨 ステップ2: Next.jsビルドを実行中（これには時間がかかります）...\n');
try {
  const result = execSync('npm run build', {
    encoding: 'utf-8',
    cwd: rootDir,
    stdio: 'pipe',
    env: { ...process.env, CI: 'true' } // CI環境として実行
  });
  console.log('✅ ビルド成功！\n');
  console.log('🎉 すべてのテストが完了しました。エラーはありません。\n');
  process.exit(0);
} catch (error) {
  const output = error.stdout || error.stderr || '';
  const lines = output.split('\n');
  
  let currentFile = null;
  lines.forEach((line, index) => {
    // ファイルパスを検出
    if (line.match(/^\.\/[^\s]+:\d+:\d+$/)) {
      currentFile = line.trim();
    }
    
    // エラーメッセージを検出
    if (line.includes('Type error:') || line.includes('Error:') || line.includes('Failed to compile')) {
      const nextLine = lines[index + 1];
      errors.push({
        type: 'build',
        message: line.trim(),
        detail: nextLine ? nextLine.trim() : '',
        file: currentFile || extractFile(line),
        line: extractLine(line)
      });
    }
    
    // モジュールが見つからないエラー
    if (line.includes("Module not found: Can't resolve")) {
      const match = line.match(/Can't resolve '([^']+)'/);
      errors.push({
        type: 'module',
        message: line.trim(),
        module: match ? match[1] : null,
        file: currentFile || extractFile(line)
      });
    }
  });
  
  if (errors.length > 0) {
    console.log(`❌ ビルドエラーが ${errors.length}件 見つかりました:\n`);
    errors.forEach((err, i) => {
      console.log(`${i + 1}. [${err.type}] ${err.message}`);
      if (err.file) console.log(`   ファイル: ${err.file}`);
      if (err.detail) console.log(`   詳細: ${err.detail}`);
      if (err.module) console.log(`   モジュール: ${err.module}`);
      console.log('');
    });
  }
}

// ヘルパー関数
function extractFile(line) {
  const match = line.match(/([^\s]+\.(ts|tsx|js|jsx)):\d+/);
  return match ? match[1] : null;
}

function extractLine(line) {
  const match = line.match(/:(\d+):/);
  return match ? parseInt(match[1]) : null;
}

// エラーサマリー
if (errors.length > 0) {
  console.log('\n📊 エラーサマリー:');
  const byType = {};
  errors.forEach(err => {
    byType[err.type] = (byType[err.type] || 0) + 1;
  });
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}件`);
  });
  
  console.log('\n💡 修正方法:');
  console.log('   1. npm run fix-build-errors を実行して自動修正を試す');
  console.log('   2. 上記のエラーメッセージを確認して手動で修正する');
  console.log('   3. エラーメッセージをCursorに貼り付けて修正を依頼する\n');
  
  process.exit(1);
} else {
  console.log('✅ すべてのテストが完了しました。エラーはありません。\n');
  process.exit(0);
}

