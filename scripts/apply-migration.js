#!/usr/bin/env node
/**
 * マイグレーション自動適用スクリプト
 * 
 * 使用方法:
 *   node scripts/apply-migration.js <migration-file>
 * 
 * 例:
 *   node scripts/apply-migration.js supabase/migrations/20260106_120000_add_products_table.sql
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// コマンドライン引数を取得
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ エラー: マイグレーションファイルを指定してください');
  console.error('');
  console.error('使用方法:');
  console.error('  node scripts/apply-migration.js <migration-file>');
  console.error('');
  console.error('例:');
  console.error('  node scripts/apply-migration.js supabase/migrations/20260106_120000_add_products_table.sql');
  process.exit(1);
}

// ファイルパスを解決
const migrationPath = resolve(projectRoot, migrationFile);

try {
  // ファイルの存在確認
  const sql = readFileSync(migrationPath, 'utf-8');
  
  console.log(`📄 マイグレーションファイル: ${migrationFile}`);
  console.log(`📏 ファイルサイズ: ${sql.length} 文字`);
  console.log('');

  // DATABASE_URL環境変数を確認
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ エラー: DATABASE_URL環境変数が設定されていません');
    console.error('');
    console.error('環境変数を設定してください:');
    console.error('  export DATABASE_URL="postgresql://postgres:password@host:5432/database"');
    console.error('');
    console.error('または、.envファイルに設定してください');
    process.exit(1);
  }

  console.log('🔗 データベース接続: 確認済み');
  console.log('');

  // psqlを使用してSQLを実行
  console.log('🚀 マイグレーションを実行中...');
  console.log('');

  try {
    // psqlコマンドを実行
    // -v ON_ERROR_STOP=1: エラー時に停止
    // -f: ファイルからSQLを読み込み
    execSync(`psql "${databaseUrl}" -v ON_ERROR_STOP=1 -f "${migrationPath}"`, {
      stdio: 'inherit',
      cwd: projectRoot,
    });

    console.log('');
    console.log('✅ マイグレーションが正常に完了しました');
    console.log('');

    // Prismaスキーマを更新するか確認
    console.log('📝 次のステップ: Prismaスキーマを更新してください');
    console.log('');
    console.log('   npx prisma db pull');
    console.log('   npx prisma generate');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ マイグレーションの実行に失敗しました');
    console.error('');
    console.error('エラー詳細:');
    console.error(error.message);
    console.error('');
    console.error('確認事項:');
    console.error('  - DATABASE_URLが正しいか確認してください');
    console.error('  - psqlコマンドがインストールされているか確認してください');
    console.error('  - データベースに接続できるか確認してください');
    process.exit(1);
  }

} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`❌ エラー: ファイルが見つかりません: ${migrationFile}`);
    console.error(`   パス: ${migrationPath}`);
  } else {
    console.error(`❌ エラー: ファイルの読み込みに失敗しました`);
    console.error(error.message);
  }
  process.exit(1);
}

