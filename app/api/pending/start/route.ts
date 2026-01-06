// app/api/pending/start/route.ts
// Phase 2.3: Next.js画面移行（注文開始API Route Handler）

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getNextOrderNo, resolveSellerAccountId, buildSellerUrls, sanitizeError, isSameOrigin, bumpAndAllow, clientIp, audit } from '@/lib/utils';

const RATE_LIMIT_MAX_WRITES = parseInt(process.env.RATE_LIMIT_MAX_WRITES || "12", 10);

// S3クライアントの初期化
// 注意: AWS_S3_BUCKET はVercelで予約されているため、AWS_S3_BUCKET_NAME を使用
const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const HAS_S3_CONFIG = !!(AWS_REGION && AWS_BUCKET && AWS_ACCESS_KEY && AWS_SECRET_KEY);

const s3 = HAS_S3_CONFIG && AWS_REGION && AWS_ACCESS_KEY && AWS_SECRET_KEY
  ? new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    })
  : null;

const S3_BUCKET = AWS_BUCKET;

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json(
        { error: 'forbidden_origin' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sellerId, amount, summary, imageData, aiAnalysis, paymentMethod, costAmount } = body || {};
    const amt = Number(amount);
    const costAmt = Number(costAmount) || 0;

    if (!sellerId || !Number.isInteger(amt) || amt < 100) {
      return NextResponse.json(
        { error: 'invalid_input' },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    if (!bumpAndAllow(`order:ip:${ip}`, RATE_LIMIT_MAX_WRITES) ||
        !bumpAndAllow(`order:seller:${sellerId}`, RATE_LIMIT_MAX_WRITES)) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429 }
      );
    }

    const orderNo = await getNextOrderNo(prisma, sellerId);

    const order = await prisma.order.create({
      data: {
        sellerId: sellerId,
        orderNo: orderNo,
        amount: amt,
        summary: summary || null,
        status: 'pending',
        costAmount: costAmt,
      },
    });

    // AI分析結果の商品をorder_itemsに保存
    if (aiAnalysis?.items && Array.isArray(aiAnalysis.items)) {
      for (const item of aiAnalysis.items) {
        const name = String(item.name || '商品').slice(0, 120);
        const unitPrice = Number(item.unit_price) || 0;
        const quantity = Number(item.qty || item.quantity) || 1;
        const itemAmount = unitPrice * quantity;
        const source = 'ai';

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            name: name,
            unitPrice: unitPrice,
            quantity: quantity,
            amount: itemAmount,
            source: source,
          },
        });
      }
    }

    // 画像をS3に保存
    let imageUrl: string | null = null;

    if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
      try {
        if (!s3) {
          throw new Error('s3_disabled');
        }

        const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');
        const key = `orders/${order.id}.jpg`;

        if (!S3_BUCKET) {
          throw new Error('S3 bucket not configured');
        }
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'image/jpeg'
          })
        );

        imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-northeast-1'}.amazonaws.com/${key}`;

        await prisma.image.create({
          data: {
            orderId: order.id,
            kind: 'processed',
            url: imageUrl,
            s3Key: key,
            contentType: 'image/jpeg',
            fileSize: buffer.length,
          },
        });

        audit('image_uploaded_to_s3', { orderId: order.id, key, size: buffer.length });
      } catch (s3Error) {
        console.error('S3 upload error', s3Error);
        // S3アップロード失敗時はフォールバックとしてDataURLを保存
        await prisma.image.create({
          data: {
            orderId: order.id,
            kind: 'processed',
            url: imageData,
            contentType: 'image/jpeg',
          },
        });
        imageUrl = imageData;
        audit('image_fallback_to_dataurl', { orderId: order.id, error: (s3Error as Error).message });
      }
    }

    // order_metadataに現金支払いフラグを保存
    const isCash = paymentMethod === 'cash';
    await prisma.orderMetadata.upsert({
      where: { orderId: order.id },
      update: { isCash: isCash, updatedAt: new Date() },
      create: { orderId: order.id, isCash: isCash },
    });

    audit('pending_order_created', { orderId: order.id, sellerId, orderNo, amount: amt, paymentMethod, isCash });

    const stripeAccountId = await resolveSellerAccountId(prisma, sellerId);
    const urls = buildSellerUrls(sellerId, stripeAccountId, order.id);

    return NextResponse.json({
      orderId: order.id,
      orderNo: order.orderNo,
      sellerId: order.sellerId,
      amount: order.amount,
      summary: order.summary,
      status: order.status,
      createdAt: order.createdAt,
      checkoutUrl: urls.checkoutUrl,
      purchaseUrl: urls.sellerUrl,
      imageUrl: imageUrl
    });
  } catch (e) {
    console.error('pending/start error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  } finally {
  }
}

