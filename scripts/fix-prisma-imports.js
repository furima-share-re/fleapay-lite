/**
 * Prisma Clientのインポートを一括修正するスクリプト
 * new PrismaClient()をlib/prismaからインポートに変更
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const apiFiles = glob.sync('app/api/**/route.ts', { cwd: rootDir });

console.log(`Found ${apiFiles.length} API route files`);

let fixedCount = 0;

for (const file of apiFiles) {
  const filePath = join(rootDir, file);
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  // new PrismaClient()を削除して、lib/prismaからインポートに変更
  if (content.includes('new PrismaClient()')) {
    // PrismaClientのインポートを削除
    content = content.replace(
      /import\s+{\s*PrismaClient\s*}\s+from\s+['"]@\/prisma\/client['"];?\s*\n/g,
      ''
    );
    content = content.replace(
      /import\s+{\s*PrismaClient\s*}\s+from\s+['"]@prisma\/client['"];?\s*\n/g,
      ''
    );
    
    // const prisma = new PrismaClient();を削除
    content = content.replace(
      /const\s+prisma\s*=\s*new\s+PrismaClient\(\);?\s*\n/g,
      ''
    );
    
    // lib/prismaからインポートを追加（まだ存在しない場合）
    if (!content.includes("from '@/lib/prisma'") && !content.includes('from "@/lib/prisma"')) {
      // import文の後に追加
      const importMatch = content.match(/^import\s+.*from\s+['"].*['"];?\s*\n/m);
      if (importMatch) {
        const lastImportIndex = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
        content = content.slice(0, lastImportIndex) + 
          "import { prisma } from '@/lib/prisma';\n" + 
          content.slice(lastImportIndex);
      } else {
        // import文がない場合は先頭に追加
        content = "import { prisma } from '@/lib/prisma';\n" + content;
      }
    }
    
    modified = true;
  }

  // $disconnect()を削除
  if (content.includes('$disconnect()')) {
    // finallyブロック全体を削除（$disconnect()のみの場合）
    content = content.replace(
      /\s+}\s+finally\s+{\s*await\s+prisma\.\$disconnect\(\);?\s*}\s*\n/g,
      '\n  }\n'
    );
    // finallyブロック内の$disconnect()のみを削除
    content = content.replace(
      /\s+await\s+prisma\.\$disconnect\(\);?\s*\n/g,
      '\n'
    );
    modified = true;
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    fixedCount++;
    console.log(`✅ Fixed: ${file}`);
  }
}

console.log(`\n✅ Fixed ${fixedCount} files`);

