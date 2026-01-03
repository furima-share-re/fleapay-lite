/**
 * Next.js standaloneビルドの静的ファイルをコピーするスクリプト
 * standaloneビルドでは、静的ファイルとpublicファイルを手動でコピーする必要がある
 */

import { cpSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const staticSource = join(rootDir, '.next', 'static');
const staticDest = join(rootDir, '.next', 'standalone', '.next', 'static');

const publicSource = join(rootDir, 'public');
const publicDest = join(rootDir, '.next', 'standalone', 'public');

console.log('📦 Copying static files for standalone build...');

// .next/static をコピー
if (existsSync(staticSource)) {
  console.log(`  Copying ${staticSource} -> ${staticDest}`);
  cpSync(staticSource, staticDest, { recursive: true });
  console.log('  ✅ Static files copied');
} else {
  console.log('  ⚠️  .next/static not found (build may have failed)');
}

// public をコピー
if (existsSync(publicSource)) {
  console.log(`  Copying ${publicSource} -> ${publicDest}`);
  cpSync(publicSource, publicDest, { recursive: true });
  console.log('  ✅ Public files copied');
} else {
  console.log('  ⚠️  public directory not found');
}

console.log('✅ Static files copy completed');

