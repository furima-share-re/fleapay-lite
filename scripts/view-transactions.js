// 取引データを確認するスクリプト
// 使用方法: node scripts/view-transactions.js [オプション]
// 
// オプション:
//   --seller-id <id>     特定のセラーIDでフィルタリング
//   --status <status>    ステータスでフィルタリング (pending, paid, succeeded, etc.)
//   --days <number>      過去N日間の取引を表示 (デフォルト: 30)
//   --limit <number>     表示件数 (デフォルト: 50)
//   --detail             詳細情報を表示（注文アイテム、決済情報など）
//   --summary            サマリー情報のみ表示
//   --output <format>    出力形式 (json, csv, both) - ファイルに保存
//   --output-dir <dir>   出力ディレクトリ (デフォルト: data/transactions)

import 'dotenv/config';
import { prisma } from '../lib/prisma.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    sellerId: null,
    status: null,
    days: 30,
    limit: 50,
    detail: false,
    summary: false,
    output: null, // 'json', 'csv', 'both'
    outputDir: 'data/transactions',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--seller-id':
        options.sellerId = args[++i];
        break;
      case '--status':
        options.status = args[++i];
        break;
      case '--days':
        options.days = parseInt(args[++i]) || 30;
        break;
      case '--limit':
        options.limit = parseInt(args[++i]) || 50;
        break;
      case '--detail':
        options.detail = true;
        break;
      case '--summary':
        options.summary = true;
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
取引データ確認スクリプト

使用方法:
  node scripts/view-transactions.js [オプション]

オプション:
  --seller-id <id>     特定のセラーIDでフィルタリング
  --status <status>    ステータスでフィルタリング (pending, paid, succeeded, etc.)
  --days <number>      過去N日間の取引を表示 (デフォルト: 30)
  --limit <number>     表示件数 (デフォルト: 50)
  --detail             詳細情報を表示（注文アイテム、決済情報など）
  --summary            サマリー情報のみ表示
  --output <format>    出力形式 (json, csv, both) - ファイルに保存してCursorで確認可能
  --output-dir <dir>   出力ディレクトリ (デフォルト: data/transactions)
  --help, -h           このヘルプを表示

例:
  node scripts/view-transactions.js
  node scripts/view-transactions.js --seller-id seller123 --days 7
  node scripts/view-transactions.js --status succeeded --detail
  node scripts/view-transactions.js --summary
  node scripts/view-transactions.js --output json
  node scripts/view-transactions.js --output both --seller-id seller123
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// 日付フォーマット
function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// 金額フォーマット
function formatAmount(amount) {
  if (amount === null || amount === undefined) return 'N/A';
  return `¥${amount.toLocaleString('ja-JP')}`;
}

// 取引データの表示（サマリー）
function displayTransactionSummary(transaction) {
  const {
    order,
    seller,
    stripePayments,
    orderItems,
    orderMetadata,
  } = transaction;

  const payment = stripePayments?.[0];
  const isCash = orderMetadata?.isCash || false;
  const paymentStatus = payment?.status || (isCash ? 'cash' : 'none');

  console.log('\n' + '='.repeat(80));
  console.log(`📦 注文ID: ${order.id}`);
  console.log(`👤 セラー: ${seller?.displayName || order.sellerId} (${order.sellerId})`);
  console.log(`📝 注文番号: #${order.orderNo}`);
  console.log(`💰 金額: ${formatAmount(order.amount)}`);
  console.log(`📊 ステータス: ${order.status}`);
  console.log(`💳 決済方法: ${isCash ? '現金' : payment ? 'Stripe' : '未決済'}`);
  console.log(`💳 決済ステータス: ${paymentStatus}`);
  
  if (payment) {
    console.log(`   - 総額: ${formatAmount(payment.amountGross)}`);
    console.log(`   - 手数料: ${formatAmount(payment.amountFee)}`);
    console.log(`   - 受取額: ${formatAmount(payment.amountNet)}`);
    console.log(`   - Payment Intent ID: ${payment.paymentIntentId}`);
  }

  if (order.summary) {
    console.log(`📄 概要: ${order.summary}`);
  }

  console.log(`📅 作成日時: ${formatDate(order.createdAt)}`);
  console.log(`🔄 更新日時: ${formatDate(order.updatedAt)}`);

  if (order.deletedAt) {
    console.log(`🗑️  削除日時: ${formatDate(order.deletedAt)}`);
  }
}

// 取引データの詳細表示
function displayTransactionDetail(transaction) {
  displayTransactionSummary(transaction);

  const { order, orderItems, orderMetadata, buyerAttributes } = transaction;

  // 注文アイテム
  if (orderItems && orderItems.length > 0) {
    console.log(`\n📦 注文アイテム (${orderItems.length}件):`);
    orderItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name}`);
      console.log(`      単価: ${formatAmount(item.unitPrice)} × ${item.quantity} = ${formatAmount(item.amount)}`);
      console.log(`      ソース: ${item.source}`);
    });
  }

  // メタデータ
  if (orderMetadata) {
    console.log(`\n📋 メタデータ:`);
    console.log(`   - カテゴリ: ${orderMetadata.category || 'N/A'}`);
    console.log(`   - 購入者言語: ${orderMetadata.buyerLanguage || 'N/A'}`);
    console.log(`   - 現金決済: ${orderMetadata.isCash ? 'はい' : 'いいえ'}`);
  }

  // 購入者属性
  if (buyerAttributes) {
    console.log(`\n👥 購入者属性:`);
    console.log(`   - 顧客タイプ: ${buyerAttributes.customerType}`);
    console.log(`   - 性別: ${buyerAttributes.gender}`);
    console.log(`   - 年齢層: ${buyerAttributes.ageBand}`);
  }

  // 決済詳細
  const stripePayments = transaction.stripePayments || [];
  if (stripePayments.length > 0) {
    console.log(`\n💳 決済詳細 (${stripePayments.length}件):`);
    stripePayments.forEach((payment, index) => {
      console.log(`   ${index + 1}. Payment ID: ${payment.id}`);
      console.log(`      - Payment Intent ID: ${payment.paymentIntentId}`);
      console.log(`      - Charge ID: ${payment.chargeId || 'N/A'}`);
      console.log(`      - Balance TX ID: ${payment.balanceTxId || 'N/A'}`);
      console.log(`      - ステータス: ${payment.status}`);
      console.log(`      - 通貨: ${payment.currency}`);
      console.log(`      - 返金総額: ${formatAmount(payment.refundedTotal)}`);
      if (payment.disputeStatus) {
        console.log(`      - 異議申立: ${payment.disputeStatus}`);
      }
      console.log(`      - 作成日時: ${formatDate(payment.createdAt)}`);
      console.log(`      - 最終同期: ${formatDate(payment.lastSyncedAt)}`);
    });
  }
}

// サマリーデータの取得
async function getSummaryData(options) {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - options.days);

  const where = {
    createdAt: { gte: daysAgo },
    deletedAt: null,
  };

  if (options.sellerId) {
    where.sellerId = options.sellerId;
  }

  // 統計情報を取得
  const totalOrders = await prisma.order.count({ where });
  
  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  const totalAmount = await prisma.order.aggregate({
    where: { ...where, status: 'paid' },
    _sum: { amount: true },
  });

  const cashOrders = await prisma.order.count({
    where: {
      ...where,
      orderMetadata: {
        isCash: true,
      },
    },
  });

  const stripePayments = await prisma.stripePayment.count({
    where: {
      createdAt: { gte: daysAgo },
      ...(options.sellerId && { sellerId: options.sellerId }),
      status: 'succeeded',
    },
  });

  return {
    period: {
      days: options.days,
      startDate: daysAgo.toISOString(),
      endDate: new Date().toISOString(),
    },
    sellerId: options.sellerId || null,
    summary: {
      totalOrders,
      totalAmount: totalAmount._sum.amount || 0,
      cashOrders,
      stripePayments,
    },
    ordersByStatus: ordersByStatus.map(({ status, _count }) => ({
      status,
      count: _count,
    })),
  };
}

// サマリー統計の表示
async function displaySummary(options, summaryData) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 取引サマリー (過去${options.days}日間)`);
  if (options.sellerId) {
    console.log(`   セラーID: ${options.sellerId}`);
  }
  console.log('='.repeat(80));
  console.log(`📦 総注文数: ${summaryData.summary.totalOrders.toLocaleString('ja-JP')}件`);
  console.log(`💰 決済完了額: ${formatAmount(summaryData.summary.totalAmount)}`);
  console.log(`💵 現金決済: ${summaryData.summary.cashOrders.toLocaleString('ja-JP')}件`);
  console.log(`💳 Stripe成功決済: ${summaryData.summary.stripePayments.toLocaleString('ja-JP')}件`);
  
  console.log(`\n📊 ステータス別:`);
  summaryData.ordersByStatus.forEach(({ status, count }) => {
    console.log(`   ${status}: ${count.toLocaleString('ja-JP')}件`);
  });
  console.log('='.repeat(80));
}

// JSONファイルに出力
function saveToJSON(data, filePath) {
  const json = JSON.stringify(data, null, 2);
  writeFileSync(filePath, json, 'utf8');
  console.log(`\n💾 JSONファイルを保存しました: ${filePath}`);
}

// CSVファイルに出力
function saveToCSV(orders, filePath) {
  if (orders.length === 0) {
    console.log('\n⚠️  データがないためCSVファイルを作成しませんでした。');
    return;
  }

  // ヘッダー行
  const headers = [
    '注文ID',
    'セラーID',
    'セラー名',
    '注文番号',
    '金額',
    'ステータス',
    '決済方法',
    '決済ステータス',
    '総額',
    '手数料',
    '受取額',
    '概要',
    '作成日時',
    '更新日時',
  ];

  // データ行
  const rows = orders.map((order) => {
    const payment = order.stripePayments?.[0];
    const isCash = order.orderMetadata?.isCash || false;
    const paymentMethod = isCash ? '現金' : payment ? 'Stripe' : '未決済';
    const paymentStatus = payment?.status || (isCash ? 'cash' : 'none');

    return [
      order.id,
      order.sellerId,
      order.seller?.displayName || '',
      order.orderNo,
      order.amount,
      order.status,
      paymentMethod,
      paymentStatus,
      payment?.amountGross || '',
      payment?.amountFee || '',
      payment?.amountNet || '',
      order.summary || '',
      formatDate(order.createdAt),
      formatDate(order.updatedAt),
    ].map((cell) => {
      // CSVエスケープ処理
      const str = String(cell || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
  });

  // CSVコンテンツを作成
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  writeFileSync(filePath, csvContent, 'utf8');
  console.log(`💾 CSVファイルを保存しました: ${filePath}`);
}

// メイン処理
async function main() {
  try {
    const options = parseArgs();

    // サマリーのみ表示
    if (options.summary) {
      const summaryData = await getSummaryData(options);
      await displaySummary(options, summaryData);

      // サマリーもJSON出力可能
      if (options.output) {
        mkdirSync(options.outputDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const jsonPath = join(options.outputDir, `summary-${timestamp}.json`);
        saveToJSON(summaryData, jsonPath);
        console.log(`\n💡 Cursorでファイルを開いて確認できます: ${jsonPath}`);
      }
      return;
    }

    // 日付範囲の計算
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - options.days);

    // クエリ条件の構築
    const where = {
      createdAt: { gte: daysAgo },
      deletedAt: null,
    };

    if (options.sellerId) {
      where.sellerId = options.sellerId;
    }

    if (options.status) {
      where.status = options.status;
    }

    // 取引データの取得
    const orders = await prisma.order.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            displayName: true,
            shopName: true,
          },
        },
        stripePayments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        orderItems: true,
        orderMetadata: true,
        buyerAttributes: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options.limit,
    });

    console.log(`\n🔍 検索結果: ${orders.length}件`);
    if (options.sellerId) {
      console.log(`   セラーID: ${options.sellerId}`);
    }
    if (options.status) {
      console.log(`   ステータス: ${options.status}`);
    }
    console.log(`   期間: 過去${options.days}日間`);

    if (orders.length === 0) {
      console.log('\n取引データが見つかりませんでした。');
      return;
    }

    // 取引データの表示
    orders.forEach((order) => {
      if (options.detail) {
        displayTransactionDetail(order);
      } else {
        displayTransactionSummary(order);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`✅ 表示完了: ${orders.length}件`);
    console.log('='.repeat(80));

    // ファイル出力
    if (options.output) {
      // 出力ディレクトリを作成
      mkdirSync(options.outputDir, { recursive: true });

      // タイムスタンプ付きファイル名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `transactions-${timestamp}`;

      if (options.output === 'json' || options.output === 'both') {
        const jsonPath = join(options.outputDir, `${filename}.json`);
        saveToJSON(orders, jsonPath);
      }

      if (options.output === 'csv' || options.output === 'both') {
        const csvPath = join(options.outputDir, `${filename}.csv`);
        saveToCSV(orders, csvPath);
      }

      console.log(`\n📁 出力ディレクトリ: ${options.outputDir}`);
      console.log(`\n💡 Cursorでファイルを開いて確認できます！`);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

