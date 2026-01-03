// scripts/analyze-build-errors.js
// ビルドエラーを分析して、修正方法を提案するスクリプト

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('📊 ビルドエラーを分析中...\n');

// エラーパターンの定義
const errorPatterns = [
  {
    pattern: /Property 'name' in type .+ is not assignable.*LLMProvider/,
    fix: 'nameプロパティの型を明示的に指定する',
    example: "readonly name: LLMProvider = 'provider-name';"
  },
  {
    pattern: /Module not found: Can't resolve '(.+)'/,
    fix: 'package.jsonに依存関係を追加する',
    example: 'npm install <package-name>'
  },
  {
    pattern: /Type '(.+)' is not assignable to type '(.+)'/,
    fix: '型の不一致を修正する',
    example: '型アサーションまたは型定義を確認'
  },
  {
    pattern: /Cannot find name '(.+)'/,
    fix: '変数または型の定義を確認する',
    example: 'インポートまたは型定義を追加'
  },
  {
    pattern: /Property '(.+)' does not exist on type '(.+)'/,
    fix: 'プロパティが存在するか確認する',
    example: '型定義を確認またはプロパティを追加'
  }
];

// ビルドエラーを取得
let buildErrors = [];
try {
  console.log('🔍 ビルドを実行中...\n');
  execSync('npm run build 2>&1', {
    encoding: 'utf-8',
    cwd: rootDir,
    stdio: 'pipe'
  });
  console.log('✅ ビルド成功！エラーはありません。\n');
  process.exit(0);
} catch (error) {
  const output = error.stdout || error.stderr || error.message;
  buildErrors = output.split('\n').filter(line => 
    line.includes('error') || 
    line.includes('Error') || 
    line.includes('Type error') ||
    line.includes('Failed to compile')
  );
}

if (buildErrors.length === 0) {
  console.log('✅ ビルドエラーは見つかりませんでした。\n');
  process.exit(0);
}

console.log(`❌ ${buildErrors.length}件のエラーが見つかりました:\n`);

// エラーを分類して表示
const categorizedErrors = {};

buildErrors.forEach(error => {
  for (const pattern of errorPatterns) {
    const match = error.match(pattern.pattern);
    if (match) {
      const category = pattern.fix;
      if (!categorizedErrors[category]) {
        categorizedErrors[category] = [];
      }
      categorizedErrors[category].push({
        error,
        pattern: pattern.example
      });
      break;
    }
  }
});

// エラーをカテゴリ別に表示
Object.entries(categorizedErrors).forEach(([category, errors]) => {
  console.log(`\n📋 ${category}:`);
  console.log(`   修正例: ${errorPatterns.find(p => p.fix === category)?.example || 'N/A'}`);
  errors.forEach((err, index) => {
    console.log(`\n   ${index + 1}. ${err.error.substring(0, 100)}...`);
  });
});

// 推奨アクション
console.log('\n\n💡 推奨アクション:');
console.log('   1. npm run fix-build-errors を実行して自動修正を試す');
console.log('   2. 上記のエラーメッセージを確認して手動で修正する');
console.log('   3. npm run type-check で型エラーのみを確認する\n');

