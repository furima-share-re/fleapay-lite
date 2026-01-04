#!/usr/bin/env node
/**
 * プレコミットチェックスクリプト
 * 型チェックとLintを実行して、エラーがあればコミットを中止
 */

import { execSync } from 'child_process';
import { exit } from 'process';

console.log('🔍 プレコミットチェックを実行中...\n');

try {
  // 型チェック
  console.log('📝 TypeScript型チェックを実行中...');
  execSync('npm run type-check', { stdio: 'inherit' });
  console.log('✅ 型チェック完了\n');

  // ESLintチェック
  console.log('🔧 ESLintチェックを実行中...');
  execSync('npm run lint', { stdio: 'inherit' });
  console.log('✅ ESLintチェック完了\n');

  console.log('✅ すべてのチェックが完了しました。コミット可能です。');
} catch (error) {
  console.error('\n❌ チェックに失敗しました。エラーを修正してから再度コミットしてください。');
  exit(1);
}

