// scripts/check-errors-static.js
// コードベースを直接確認してエラーを検出するスクリプト（npm不要）

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 コードベースを直接確認してエラーを検出中...\n');

const errors = [];
const warnings = [];

// チェック1: nameプロパティの型エラー
function checkNameProperty(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // 'as const'を使っているnameプロパティを検出
    if (line.includes("readonly name =") && line.includes("as const")) {
      const providerMatch = line.match(/readonly name = '(\w+)' as const/);
      if (providerMatch) {
        // LLMProviderのインポートを確認
        const hasLLMProviderImport = content.includes('LLMProvider') && 
          (content.includes("import type {") || content.includes("import {")) &&
          content.includes("from '../types'");
        
        if (!hasLLMProviderImport) {
          errors.push({
            file: path.relative(rootDir, filePath),
            line: index + 1,
            type: 'type',
            message: `nameプロパティに'as const'が使用されています。LLMProvider型を明示的に指定してください。`,
            fix: `readonly name: LLMProvider = '${providerMatch[1]}';`
          });
        } else {
          warnings.push({
            file: path.relative(rootDir, filePath),
            line: index + 1,
            message: `nameプロパティに'as const'が使用されています。型を明示的に指定することを推奨します。`
          });
        }
      }
    }
  });
}

// チェック2: インポートパスの問題
function checkImports(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // @/ パスの確認
    if (line.includes('@/') && !line.includes('//')) {
      const importMatch = line.match(/from\s+['"](@\/[^'"]+)['"]/);
      if (importMatch) {
        const importPath = importMatch[1];
        const resolvedPath = importPath.replace('@/', path.join(rootDir, '/'));
        const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
        let found = false;
        
        for (const ext of possibleExtensions) {
          if (fs.existsSync(resolvedPath + ext)) {
            found = true;
            break;
          }
        }
        
        if (!found && !fs.existsSync(resolvedPath)) {
          errors.push({
            file: path.relative(rootDir, filePath),
            line: index + 1,
            type: 'import',
            message: `インポートパスが見つかりません: ${importPath}`,
            fix: `正しいパスを確認してください`
          });
        }
      }
    }
  });
}

// チェック3: よくある型エラーのパターン
function checkCommonTypeErrors(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Buffer型エラーの可能性
  if (content.includes('new File([') && content.includes('Buffer')) {
    if (!content.includes('Uint8Array')) {
      warnings.push({
        file: path.relative(rootDir, filePath),
        message: 'BufferをFileに変換する際は、Uint8Arrayに変換することを推奨します'
      });
    }
  }
}

// すべてのTypeScriptファイルをスキャン
function scanDirectory(dir, relativePath = '') {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relativePath, entry.name);
    
    // スキップするディレクトリ
    if (entry.name === 'node_modules' || 
        entry.name === '.next' || 
        entry.name === 'dist' || 
        entry.name.startsWith('.') ||
        entry.name === 'scripts') {
      continue;
    }
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath, relPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      checkNameProperty(fullPath);
      checkImports(fullPath);
      checkCommonTypeErrors(fullPath);
    }
  }
}

// メイン実行
console.log('📝 TypeScriptファイルをスキャン中...\n');

scanDirectory(path.join(rootDir, 'lib'));
scanDirectory(path.join(rootDir, 'app'));
scanDirectory(path.join(rootDir, 'components'));

// 結果を表示
if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ エラーは見つかりませんでした！\n');
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`❌ ${errors.length}件のエラーが見つかりました:\n`);
  errors.forEach((err, i) => {
    console.log(`${i + 1}. [${err.type}] ${err.file}:${err.line || ''}`);
    console.log(`   ${err.message}`);
    if (err.fix) {
      console.log(`   推奨修正: ${err.fix}`);
    }
    console.log('');
  });
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length}件の警告:\n`);
  warnings.forEach((warn, i) => {
    console.log(`${i + 1}. ${warn.file}${warn.line ? `:${warn.line}` : ''}`);
    console.log(`   ${warn.message}`);
    console.log('');
  });
}

// サマリー
console.log('\n📊 サマリー:');
if (errors.length > 0) {
  const byType = {};
  errors.forEach(err => {
    byType[err.type] = (byType[err.type] || 0) + 1;
  });
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}件`);
  });
}

console.log('\n💡 修正方法:');
console.log('   1. 上記のエラーメッセージを確認して手動で修正する');
console.log('   2. エラーメッセージをCursorに貼り付けて修正を依頼する');
console.log('   3. npm run fix-build-errors を実行して自動修正を試す\n');

process.exit(errors.length > 0 ? 1 : 0);

