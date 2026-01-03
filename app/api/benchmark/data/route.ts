// app/api/benchmark/data/route.ts
// Phase 2.6: Express.js廃止 - ベンチマークデータAPI移行

import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sanitizeError } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // プロジェクトルートのdataディレクトリを参照
    const csvPath = path.join(process.cwd(), 'data', 'benchmark.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { 
          error: 'file_not_found', 
          message: 'ベンチマークCSVファイルが見つかりません' 
        },
        { status: 404 }
      );
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      return NextResponse.json(
        { 
          error: 'invalid_csv', 
          message: 'CSVファイルの形式が不正です' 
        },
        { status: 400 }
      );
    }

    // ヘッダー行を取得
    const headers = lines[0].split(',').map(h => h.trim());
    
    // データ行をパース
    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // CSVのパース（カンマ区切り、ただし引用符内のカンマは考慮）
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      // オブジェクトに変換
      const row: any = {};
      headers.forEach((header, index) => {
        let value: string | number = values[index] || '';
        // 数値に変換できる場合は数値に
        if (header === 'week' || header === 'base' || header === 'improvement') {
          value = parseInt(value as string, 10) || 0;
        }
        row[header] = value;
      });
      
      data.push(row);
    }

    return NextResponse.json({
      ok: true,
      data: data,
      count: data.length
    });
  } catch (error: any) {
    console.error('benchmark/data error:', error);
    return NextResponse.json(
      sanitizeError(error),
      { status: 500 }
    );
  }
}
