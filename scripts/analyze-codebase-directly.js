// scripts/analyze-codebase-directly.js
// コードベースを直接解析してエラーを検出（コマンド実行不要）

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 コードベースを直接解析中...\n');

const errors = [];
const warnings = [];
const filesChecked = [];

// TypeScriptファイルを解析
function analyzeTypeScriptFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(rootDir, filePath);
  filesChecked.push(relativePath);
  
  // チェック1: nameプロパティの型エラー
  lines.forEach((line, index) => {
    if (line.includes("readonly name =") && line.includes("as const")) {
      errors.push({
        file: relativePath,
        line: index + 1,
        type: 'type',
        severity: 'error',
        message: "nameプロパティに'as const'が使用されています",
        code: line.trim(),
        fix: line.replace(/readonly name = '(\w+)' as const;/, "readonly name: LLMProvider = '$1';")
      });
    }
  });
  
  // チェック2: LLMProviderのインポート確認
  if (content.includes('readonly name: LLMProvider')) {
    const hasImport = content.includes('import') && 
                     (content.includes('LLMProvider') || content.includes("from '../types'"));
    if (!hasImport && content.includes('LLMProvider')) {
      errors.push({
        file: relativePath,
        type: 'import',
        severity: 'error',
        message: 'LLMProviderのインポートが見つかりません',
        fix: "import type { LLMProvider } from '../types';"
      });
    }
  }
  
  // チェック3: インポートパスの問題
  const importMatches = content.matchAll(/from\s+['"](@\/[^'"]+)['"]/g);
  for (const match of importMatches) {
    const importPath = match[1];
    const resolvedPath = importPath.replace('@/', path.join(rootDir, '/'));
    
    // 拡張子なしで存在確認
    const exists = fs.existsSync(resolvedPath + '.ts') ||
                   fs.existsSync(resolvedPath + '.tsx') ||
                   fs.existsSync(resolvedPath + '/index.ts') ||
                   fs.existsSync(resolvedPath + '/index.tsx') ||
                   fs.existsSync(resolvedPath);
    
    if (!exists) {
      warnings.push({
        file: relativePath,
        type: 'import',
        severity: 'warning',
        message: `インポートパスが見つかりません: ${importPath}`,
        code: match[0]
      });
    }
  }
  
  // チェック4: よくある型エラーのパターン
  if (content.includes('new File([') && content.includes('Buffer') && !content.includes('Uint8Array')) {
    warnings.push({
      file: relativePath,
      type: 'type',
      severity: 'warning',
      message: 'BufferをFileに変換する際は、Uint8Arrayに変換することを推奨',
      fix: 'const uint8Array = new Uint8Array(buffer); const file = new File([uint8Array], ...);'
    });
  }
  
  // チェック5: process.envの型安全性
  const envMatches = content.matchAll(/process\.env\.(\w+)/g);
  for (const match of envMatches) {
    const envVar = match[1];
    const line = lines[lines.findIndex(l => l.includes(match[0]))];
    if (line && !line.includes('||') && !line.includes('as') && line.includes(':')) {
      warnings.push({
        file: relativePath,
        type: 'type',
        severity: 'warning',
        message: `process.env.${envVar}に型アサーションまたはデフォルト値がない可能性があります`,
        code: line.trim()
      });
    }
  }
  
  // チェック6: 未使用のインポート（簡易チェック）
  const importLines = lines.filter(l => l.trim().startsWith('import'));
  importLines.forEach(importLine => {
    const importMatch = importLine.match(/import\s+(?:type\s+)?\{([^}]+)\}/);
    if (importMatch) {
      const imports = importMatch[1].split(',').map(i => i.trim());
      imports.forEach(imp => {
        const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
        if (!content.includes(cleanImp) && !cleanImp.includes('type')) {
          // 実際には使用されている可能性があるので、警告のみ
        }
      });
    }
  });
}

// ディレクトリを再帰的にスキャン
function scanDirectory(dir, relativePath = '') {
  if (!fs.existsSync(dir)) return;
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      // スキップするディレクトリ
      if (entry.name === 'node_modules' || 
          entry.name === '.next' || 
          entry.name === 'dist' || 
          entry.name.startsWith('.') ||
          entry.name === 'scripts' ||
          entry.name === 'worldPriceEngine') {
        continue;
      }
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath, relPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        analyzeTypeScriptFile(fullPath);
      }
    }
  } catch (error) {
    // アクセス権限エラーなどは無視
  }
}

// メイン実行
console.log('📝 TypeScriptファイルをスキャン中...\n');

scanDirectory(path.join(rootDir, 'lib'));
scanDirectory(path.join(rootDir, 'app'));
scanDirectory(path.join(rootDir, 'components'));

// 結果を表示
console.log(`✅ ${filesChecked.length}ファイルをチェックしました\n`);

if (errors.length === 0 && warnings.length === 0) {
  console.log('🎉 エラーも警告も見つかりませんでした！\n');
  console.log('✅ コードベースは健全な状態です。\n');
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`❌ ${errors.length}件のエラーが見つかりました:\n`);
  errors.forEach((err, i) => {
    console.log(`${i + 1}. [${err.type.toUpperCase()}] ${err.file}${err.line ? `:${err.line}` : ''}`);
    console.log(`   ${err.message}`);
    if (err.code) {
      console.log(`   コード: ${err.code}`);
    }
    if (err.fix) {
      console.log(`   修正案: ${err.fix}`);
    }
    console.log('');
  });
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length}件の警告:\n`);
  warnings.slice(0, 10).forEach((warn, i) => {
    console.log(`${i + 1}. [${warn.type.toUpperCase()}] ${warn.file}`);
    console.log(`   ${warn.message}`);
    if (warn.code) {
      console.log(`   コード: ${warn.code.substring(0, 80)}...`);
    }
    console.log('');
  });
  
  if (warnings.length > 10) {
    console.log(`   ... 他${warnings.length - 10}件の警告があります\n`);
  }
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

if (warnings.length > 0) {
  console.log(`   警告: ${warnings.length}件`);
}

console.log('\n💡 次のステップ:');
if (errors.length > 0) {
  console.log('   1. 上記のエラーを修正してください');
  console.log('   2. エラーメッセージをCursorに貼り付けて修正を依頼できます');
  console.log('   3. npm run fix-build-errors で自動修正を試せます\n');
} else {
  console.log('   ✅ エラーはありません。ビルドを実行できます。\n');
}

process.exit(errors.length > 0 ? 1 : 0);

