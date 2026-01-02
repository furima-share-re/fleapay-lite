#!/usr/bin/env node
/**
 * Node.jsを使用したデータ移行スクリプト
 * psqlが使えない環境でも動作します
 * 
 * 使用方法:
 *   node scripts/migrate-data-nodejs.js dump <SOURCE_DATABASE_URL> <OUTPUT_DIR>
 *   node scripts/migrate-data-nodejs.js import <TARGET_DATABASE_URL> <DATA_DIR>
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// テーブル一覧（親→子の順、外部キー制約を考慮）
const TABLES = [
  'frames',
  'sellers',
  'orders',
  'order_items',
  'images',
  'stripe_payments',
  'qr_sessions',
  'buyer_attributes',
  'order_metadata',
  'kids_achievements'
];

/**
 * データをCSV形式でダンプ
 */
async function dumpData(sourceUrl, outputDir) {
  console.log('📦 データダンプを開始します...');
  console.log(`接続先: ${sourceUrl.replace(/:[^:@]+@/, ':****@')}`);
  
  // 出力ディレクトリを作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ 出力ディレクトリを作成: ${outputDir}`);
  }

  const client = new Client({
    connectionString: sourceUrl,
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    for (const table of TABLES) {
      console.log(`[${TABLES.indexOf(table) + 1}/${TABLES.length}] ${table} をエクスポート中...`);
      
      try {
        // テーブルの存在確認
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);

        if (!tableExists.rows[0].exists) {
          console.log(`  ⚠️  テーブル ${table} が存在しません。スキップします。`);
          continue;
        }

        // データを取得
        const result = await client.query(`SELECT * FROM ${table}`);
        
        if (result.rows.length === 0) {
          console.log(`  ⚠️  ${table} にデータがありません。空のCSVファイルを作成します。`);
          // カラム名だけのCSVファイルを作成
          const columns = result.fields.map(f => f.name);
          const csvContent = columns.join(',') + '\n';
          fs.writeFileSync(path.join(outputDir, `${table}.csv`), csvContent);
          continue;
        }

        // CSV形式に変換
        const columns = result.fields.map(f => f.name);
        const csvRows = [columns.join(',')]; // ヘッダー

        for (const row of result.rows) {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) {
              return '';
            }
            // JSON型の場合は文字列化
            if (typeof value === 'object') {
              return JSON.stringify(value).replace(/"/g, '""');
            }
            // 文字列に変換し、カンマや改行を含む場合はエスケープ
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });
          csvRows.push(values.join(','));
        }

        const csvContent = csvRows.join('\n');
        const csvFile = path.join(outputDir, `${table}.csv`);
        fs.writeFileSync(csvFile, csvContent, 'utf8');
        
        console.log(`  ✅ ${table}.csv を作成しました (${result.rows.length} 行)`);
      } catch (error) {
        console.error(`  ❌ ${table} のエクスポートでエラーが発生しました:`, error.message);
      }
    }

    console.log('\n✅ データダンプが完了しました！');
    console.log(`\n生成されたファイル:`);
    console.log(`  - ${outputDir}/`);
    for (const table of TABLES) {
      const csvFile = path.join(outputDir, `${table}.csv`);
      if (fs.existsSync(csvFile)) {
        console.log(`  - ${table}.csv`);
      }
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

/**
 * データをSupabaseにインポート
 */
async function importData(targetUrl, dataDir) {
  console.log('📥 データインポートを開始します...');
  console.log(`接続先: ${targetUrl.replace(/:[^:@]+@/, ':****@')}`);
  
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ データディレクトリが見つかりません: ${dataDir}`);
    process.exit(1);
  }

  const client = new Client({
    connectionString: targetUrl,
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    const importedTables = [];
    const failedTables = [];

    for (const table of TABLES) {
      const csvFile = path.join(dataDir, `${table}.csv`);
      
      if (!fs.existsSync(csvFile)) {
        console.log(`[${TABLES.indexOf(table) + 1}/${TABLES.length}] ${table}.csv が見つかりません。スキップします。`);
        continue;
      }

      console.log(`[${TABLES.indexOf(table) + 1}/${TABLES.length}] ${table} をインポート中...`);

      try {
        // CSVファイルを読み込み
        const csvContent = fs.readFileSync(csvFile, 'utf8');
        const lines = csvContent.trim().split('\n');
        
        if (lines.length < 2) {
          console.log(`  ⚠️  ${table}.csv にデータがありません。スキップします。`);
          continue;
        }

        // ヘッダー行を取得
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const dataLines = lines.slice(1);

        // テーブルの存在確認
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);

        if (!tableExists.rows[0].exists) {
          console.log(`  ⚠️  テーブル ${table} が存在しません。スキップします。`);
          continue;
        }

        // 既存データを削除（オプション）
        await client.query(`TRUNCATE TABLE ${table} CASCADE`);

        // データを挿入
        let insertedCount = 0;
        for (const line of dataLines) {
          if (!line.trim()) continue;

          // CSV行をパース（簡単な実装）
          const values = [];
          let currentValue = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                currentValue += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue);
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue);

          // 値を適切な型に変換
          const convertedValues = headers.map((header, idx) => {
            const value = values[idx] || '';
            if (value === '' || value === 'null') {
              return null;
            }
            // JSON型の可能性がある場合はパースを試みる
            if (value.startsWith('{') || value.startsWith('[')) {
              try {
                return JSON.parse(value);
              } catch {
                return value;
              }
            }
            return value;
          });

          // INSERT文を構築
          const placeholders = headers.map((_, idx) => `$${idx + 1}`).join(', ');
          const insertQuery = `INSERT INTO ${table} (${headers.join(', ')}) VALUES (${placeholders})`;
          
          try {
            await client.query(insertQuery, convertedValues);
            insertedCount++;
          } catch (error) {
            console.error(`  ⚠️  行の挿入でエラー: ${error.message}`);
          }
        }

        console.log(`  ✅ ${table} のインポートが完了しました (${insertedCount} 行)`);
        importedTables.push(table);
      } catch (error) {
        console.error(`  ❌ ${table} のインポートでエラーが発生しました:`, error.message);
        failedTables.push(table);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('インポート結果');
    console.log('='.repeat(50));

    if (importedTables.length > 0) {
      console.log(`\n✅ 成功したテーブル (${importedTables.length}):`);
      importedTables.forEach(table => console.log(`  - ${table}`));
    }

    if (failedTables.length > 0) {
      console.log(`\n❌ 失敗したテーブル (${failedTables.length}):`);
      failedTables.forEach(table => console.log(`  - ${table}`));
      console.log('\n⚠️  エラーログを確認し、手動でインポートしてください。');
    } else {
      console.log('\n✅ すべてのテーブルのインポートが完了しました！');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// メイン処理
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

if (!command || !arg1 || !arg2) {
  console.error('使用方法:');
  console.error('  ダンプ: node scripts/migrate-data-nodejs.js dump <SOURCE_DATABASE_URL> <OUTPUT_DIR>');
  console.error('  インポート: node scripts/migrate-data-nodejs.js import <TARGET_DATABASE_URL> <DATA_DIR>');
  process.exit(1);
}

if (command === 'dump') {
  dumpData(arg1, arg2).catch(console.error);
} else if (command === 'import') {
  importData(arg1, arg2).catch(console.error);
} else {
  console.error(`❌ 不明なコマンド: ${command}`);
  console.error('使用可能なコマンド: dump, import');
  process.exit(1);
}

