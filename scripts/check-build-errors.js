// scripts/check-build-errors.js
// ビルドエラーの一般的なパターンをチェックするスクリプト

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const errors = [];

// チェック1: すべてのTypeScriptファイルのインポートパスを確認
function checkImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // @/ パスの確認
    if (line.includes('@/') && !line.includes('//')) {
      const importMatch = line.match(/from\s+['"](@\/[^'"]+)['"]/);
      if (importMatch) {
        const importPath = importMatch[1];
        // 実際のファイルが存在するか確認
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
            file: filePath,
            line: index + 1,
            message: `Import path not found: ${importPath}`,
            code: line.trim()
          });
        }
      }
    }
  });
}

// チェック2: 構文エラーの確認（try-catchブロックなど）
function checkSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // try の後に { がない
    if (line.trim().startsWith('try') && !line.includes('{') && !line.includes('(')) {
      const nextLine = lines[index + 1];
      if (nextLine && !nextLine.trim().startsWith('{')) {
        errors.push({
          file: filePath,
          line: index + 1,
          message: 'Missing opening brace after try statement',
          code: line.trim()
        });
      }
    }
    
    // export const dynamic の確認（Next.js API Routes）
    if (line.includes('export const dynamic') && !line.includes('=')) {
      errors.push({
        file: filePath,
        line: index + 1,
        message: 'Invalid export const dynamic syntax',
        code: line.trim()
      });
    }
  });
}

// チェック3: 型エラーの可能性があるパターン
function checkTypeErrors(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // process.env の型アサーションがない場合
  if (content.includes('process.env.') && !content.includes('as string') && !content.includes('||')) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('process.env.') && line.includes(':')) {
        // 型アサーションがない可能性
        if (!line.includes('as') && !line.includes('||')) {
          // これは警告のみ（必ずしもエラーではない）
        }
      }
    });
  }
}

// すべてのTypeScriptファイルをスキャン
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // node_modules, .next, dist をスキップ
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' || entry.name.startsWith('.')) {
      continue;
    }
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      try {
        checkImports(fullPath);
        checkSyntax(fullPath);
        checkTypeErrors(fullPath);
      } catch (error) {
        errors.push({
          file: fullPath,
          line: 0,
          message: `Error checking file: ${error.message}`,
          code: ''
        });
      }
    }
  }
}

// メイン実行
console.log('🔍 Checking for common build errors...\n');

scanDirectory(path.join(rootDir, 'app'));
scanDirectory(path.join(rootDir, 'lib'));
scanDirectory(path.join(rootDir, 'components'));

if (errors.length === 0) {
  console.log('✅ No common build errors found!');
  process.exit(0);
} else {
  console.log(`❌ Found ${errors.length} potential issues:\n`);
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.file}:${error.line}`);
    console.log(`   ${error.message}`);
    if (error.code) {
      console.log(`   Code: ${error.code}`);
    }
    console.log('');
  });
  process.exit(1);
}

