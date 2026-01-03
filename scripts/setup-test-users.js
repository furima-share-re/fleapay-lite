// テストユーザーのプランを設定するスクリプト（Prisma使用）
import { prisma } from '../lib/prisma.js';

/**
 * テストユーザーのプランを設定
 * @param {string} sellerId - セラーID
 * @param {string} planType - プランタイプ ('standard', 'pro', 'kids')
 */
async function setSellerPlan(sellerId, planType) {
  try {
    // 1. セラーが存在するか確認（存在しない場合は作成）
    const seller = await prisma.seller.upsert({
      where: { id: sellerId },
      update: {},
      create: {
        id: sellerId,
        displayName: `Test Seller (${planType})`,
        shopName: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Shop`,
        email: `${planType}@test.example.com`,
      },
    });

    console.log(`✅ Seller確認/作成: ${sellerId} (${seller.displayName})`);

    // 2. 既存のアクティブなサブスクリプションを無効化
    const now = new Date();
    const updated = await prisma.sellerSubscription.updateMany({
      where: {
        sellerId: sellerId,
        status: 'active',
        OR: [
          { endedAt: null },
          { endedAt: { gt: now } },
        ],
      },
      data: {
        status: 'inactive',
        endedAt: new Date(now.getTime() - 1000), // 1秒前
        updatedAt: now,
      },
    });

    if (updated.count > 0) {
      console.log(`✅ ${updated.count}件の既存サブスクリプションを無効化しました`);
    }

    // 3. 新しいサブスクリプションを作成
    const subscription = await prisma.sellerSubscription.create({
      data: {
        sellerId: sellerId,
        planType: planType,
        status: 'active',
        startedAt: now,
        endedAt: null,
      },
    });

    console.log(`✅ サブスクリプション作成: ${subscription.id}`);
    console.log(`   - プラン: ${subscription.planType}`);
    console.log(`   - ステータス: ${subscription.status}`);
    console.log(`   - 開始日時: ${subscription.startedAt}`);

    return subscription;
  } catch (error) {
    console.error(`❌ エラー: ${sellerId} のプラン設定に失敗しました`, error);
    throw error;
  }
}

/**
 * すべてのテストユーザーを一括設定
 */
async function setupAllTestUsers() {
  console.log('🚀 テストユーザーのプラン設定を開始します...\n');

  const testUsers = [
    { sellerId: 'test-seller-standard', planType: 'standard' },
    { sellerId: 'test-seller-pro', planType: 'pro' },
    { sellerId: 'test-seller-kids', planType: 'kids' },
  ];

  for (const user of testUsers) {
    console.log(`\n📋 ${user.sellerId} を ${user.planType} プランに設定中...`);
    await setSellerPlan(user.sellerId, user.planType);
  }

  console.log('\n✅ すべてのテストユーザーの設定が完了しました！\n');

  // 確認: すべてのテストユーザーの現在のプランを表示
  console.log('📊 設定結果の確認:');
  for (const user of testUsers) {
    const now = new Date();
    const activeSub = await prisma.sellerSubscription.findFirst({
      where: {
        sellerId: user.sellerId,
        status: 'active',
        OR: [
          { endedAt: null },
          { endedAt: { gt: now } },
        ],
      },
      orderBy: { startedAt: 'desc' },
      include: { seller: true },
    });

    if (activeSub) {
      console.log(`  ✅ ${user.sellerId}: ${activeSub.planType} (${activeSub.seller.displayName})`);
    } else {
      console.log(`  ❌ ${user.sellerId}: プランが見つかりません`);
    }
  }
}

/**
 * 特定のユーザーのプランを確認
 */
async function checkSellerPlan(sellerId) {
  const now = new Date();
  const activeSub = await prisma.sellerSubscription.findFirst({
    where: {
      sellerId: sellerId,
      status: 'active',
      OR: [
        { endedAt: null },
        { endedAt: { gt: now } },
      ],
    },
    orderBy: { startedAt: 'desc' },
    include: { seller: true },
  });

  if (activeSub) {
    console.log(`\n📊 ${sellerId} の現在のプラン:`);
    console.log(`   - プラン: ${activeSub.planType}`);
    console.log(`   - ステータス: ${activeSub.status}`);
    console.log(`   - 開始日時: ${activeSub.startedAt}`);
    console.log(`   - 終了日時: ${activeSub.endedAt || 'なし（無期限）'}`);
    console.log(`   - セラー名: ${activeSub.seller.displayName}`);
  } else {
    console.log(`\n❌ ${sellerId} のアクティブなプランが見つかりません`);
  }

  return activeSub;
}

// メイン処理
async function main() {
  const command = process.argv[2];
  const sellerId = process.argv[3];
  const planType = process.argv[4];

  try {
    if (command === 'setup-all') {
      // すべてのテストユーザーを設定
      await setupAllTestUsers();
    } else if (command === 'set' && sellerId && planType) {
      // 特定のユーザーのプランを設定
      if (!['standard', 'pro', 'kids'].includes(planType)) {
        console.error('❌ 無効なプランタイプです。standard, pro, kids のいずれかを指定してください。');
        process.exit(1);
      }
      await setSellerPlan(sellerId, planType);
      await checkSellerPlan(sellerId);
    } else if (command === 'check' && sellerId) {
      // 特定のユーザーのプランを確認
      await checkSellerPlan(sellerId);
    } else {
      console.log('使用方法:');
      console.log('  すべてのテストユーザーを設定: node scripts/setup-test-users.js setup-all');
      console.log('  特定のユーザーのプランを設定: node scripts/setup-test-users.js set <sellerId> <planType>');
      console.log('  特定のユーザーのプランを確認: node scripts/setup-test-users.js check <sellerId>');
      console.log('');
      console.log('例:');
      console.log('  node scripts/setup-test-users.js setup-all');
      console.log('  node scripts/setup-test-users.js set test-seller-pro pro');
      console.log('  node scripts/setup-test-users.js check test-seller-pro');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

