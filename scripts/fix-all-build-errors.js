// scripts/fix-all-build-errors.js
// ビルドエラーを一括で確認・修正するスクリプト

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 すべてのビルドエラーを確認中...\n');

// TypeScriptの型チェックを実行
try {
  console.log('📝 TypeScript型チェックを実行中...');
  const result = execSync('npm run type-check 2>&1', { 
    encoding: 'utf-8',
    cwd: rootDir,
    stdio: 'pipe'
  });
  console.log('✅ 型チェック完了: エラーなし\n');
} catch (error) {
  const output = error.stdout || error.stderr || error.message;
  console.log('❌ 型エラーが見つかりました:\n');
  console.log(output);
  console.log('\n');
}

// よくあるエラーパターンを自動修正
const fixes = [];

// 修正1: MockProviderのnameプロパティ
const mockProviderPath = path.join(rootDir, 'lib/llm/testing/mock-provider.ts');
if (fs.existsSync(mockProviderPath)) {
  let content = fs.readFileSync(mockProviderPath, 'utf-8');
  if (content.includes("readonly name = 'mock' as const;")) {
    content = content.replace(
      /readonly name = 'mock' as const;/g,
      "readonly name: LLMProvider = 'mock';"
    );
    // LLMProviderのインポートを確認
    if (!content.includes("import type {") || !content.includes('LLMProvider')) {
      content = content.replace(
        /import type \{([^}]+)\} from '\.\.\/types';/,
        (match, imports) => {
          if (!imports.includes('LLMProvider')) {
            return `import type {${imports.trim()}, LLMProvider} from '../types';`;
          }
          return match;
        }
      );
    }
    fs.writeFileSync(mockProviderPath, content);
    fixes.push('✅ MockProviderのnameプロパティを修正');
  }
}

// 修正2: すべてのプロバイダーのnameプロパティを確認
function fixProviderNameProperty(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // 'as const'を使っているnameプロパティを修正
  const namePattern = /readonly name = '(\w+)' as const;/g;
  const matches = [...content.matchAll(namePattern)];
  
  if (matches.length > 0) {
    // LLMProviderのインポートを確認
    if (!content.includes('LLMProvider')) {
      content = content.replace(
        /import type \{([^}]+)\} from '\.\.\/types';/,
        (match, imports) => {
          if (!imports.includes('LLMProvider')) {
            return `import type {${imports.trim()}, LLMProvider} from '../types';`;
          }
          return match;
        }
      );
      modified = true;
    }
    
    // nameプロパティを修正
    content = content.replace(
      /readonly name = '(\w+)' as const;/g,
      "readonly name: LLMProvider = '$1';"
    );
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    fixes.push(`✅ ${path.basename(filePath)}のnameプロパティを修正`);
  }
}

// すべてのプロバイダーファイルを確認
const providerDir = path.join(rootDir, 'lib/llm/providers');
if (fs.existsSync(providerDir)) {
  const files = fs.readdirSync(providerDir);
  files.forEach(file => {
    if (file.endsWith('.ts')) {
      fixProviderNameProperty(path.join(providerDir, file));
    }
  });
}

// 修正結果を表示
if (fixes.length > 0) {
  console.log('🔧 自動修正を実行しました:\n');
  fixes.forEach(fix => console.log(`  ${fix}`));
  console.log('\n');
} else {
  console.log('ℹ️  自動修正できる問題は見つかりませんでした\n');
}

// 再度型チェックを実行
console.log('🔄 修正後の型チェックを実行中...\n');
try {
  execSync('npm run type-check 2>&1', { 
    encoding: 'utf-8',
    cwd: rootDir,
    stdio: 'inherit'
  });
  console.log('\n✅ すべての型エラーが修正されました！');
} catch (error) {
  console.log('\n⚠️  まだエラーが残っています。上記のエラーメッセージを確認してください。');
  process.exit(1);
}

