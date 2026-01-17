// app/api/admin/fee-checks/route.ts
// 管理者向け: 決済手数料チェック結果取得API

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

type RawEvent = {
  data?: {
    object?: {
      metadata?: Record<string, string | number | null | undefined>;
      application_fee_amount?: number | null;
      application_fee?: number | { amount?: number | null } | null;
      charges?: {
        data?: Array<{
          metadata?: Record<string, string | number | null | undefined>;
          application_fee_amount?: number | null;
          application_fee?: number | { amount?: number | null } | null;
        }>;
      };
    };
  };
};

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

function parseFeeRate(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const rate = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) return null;
  return rate;
}

function extractFeeRate(rawEvent: RawEvent | null) {
  const metadata = rawEvent?.data?.object?.metadata || {};
  const chargeMetadata = rawEvent?.data?.object?.charges?.data?.[0]?.metadata || {};
  const feeRateFromPi = parseFeeRate(metadata.feeRate);
  const feeRateFromCharge = parseFeeRate(chargeMetadata.feeRate);

  if (feeRateFromPi !== null) {
    return { feeRate: feeRateFromPi, source: 'payment_intent.metadata' };
  }
  if (feeRateFromCharge !== null) {
    return { feeRate: feeRateFromCharge, source: 'charge.metadata' };
  }
  return { feeRate: null, source: null };
}

function extractApplicationFee(rawEvent: RawEvent | null): number | null {
  const obj = rawEvent?.data?.object;
  const direct = typeof obj?.application_fee_amount === 'number'
    ? obj?.application_fee_amount
    : null;
  if (direct !== null) return direct;

  const directAlt = typeof obj?.application_fee === 'number'
    ? obj?.application_fee
    : typeof obj?.application_fee === 'object'
      ? obj?.application_fee?.amount ?? null
      : null;
  if (directAlt !== null) return directAlt;

  const charge = obj?.charges?.data?.[0];
  const chargeAmount = typeof charge?.application_fee_amount === 'number'
    ? charge?.application_fee_amount
    : null;
  if (chargeAmount !== null) return chargeAmount;

  const chargeAlt = typeof charge?.application_fee === 'number'
    ? charge?.application_fee
    : typeof charge?.application_fee === 'object'
      ? charge?.application_fee?.amount ?? null
      : null;
  if (chargeAlt !== null) return chargeAlt;

  return null;
}

function calculateExpectedFee(amount: number, feeRate: number): number {
  const calculatedFee = Math.floor(amount * feeRate);
  return amount === 0 ? 0 : Math.max(calculatedFee, 1);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = Number(searchParams.get('limit') || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 50;
    const statusFilter = (searchParams.get('status') || 'all').toLowerCase();
    const query = (searchParams.get('q') || '').trim();

    const where: Prisma.StripePaymentWhereInput | undefined = query
      ? {
          OR: [
            { paymentIntentId: { contains: query, mode: 'insensitive' } },
            ...(isUuid(query)
              ? [{ orderId: query }, { sellerId: query }]
              : []),
          ],
        }
      : undefined;

    const payments = await prisma.stripePayment.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            amount: true,
            createdAt: true,
          },
        },
        seller: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    const rows = payments.map((payment) => {
      const rawEvent = (payment.rawEvent as RawEvent | null) || null;
      const { feeRate, source } = extractFeeRate(rawEvent);
      const applicationFee = extractApplicationFee(rawEvent);
      const amountBase = payment.order?.amount ?? payment.amountGross ?? 0;
      const expectedFee = feeRate !== null ? calculateExpectedFee(amountBase, feeRate) : null;
      const delta =
        expectedFee !== null && applicationFee !== null ? applicationFee - expectedFee : null;

      let checkStatus: 'ok' | 'mismatch' | 'missing_fee_rate' | 'missing_application_fee' =
        'ok';
      if (feeRate === null) {
        checkStatus = 'missing_fee_rate';
      } else if (applicationFee === null) {
        checkStatus = 'missing_application_fee';
      } else if (expectedFee !== null && applicationFee !== expectedFee) {
        checkStatus = 'mismatch';
      }

      return {
        id: payment.id,
        orderId: payment.order?.id || payment.orderId,
        orderNo: payment.order?.orderNo ?? null,
        sellerId: payment.sellerId,
        sellerName: payment.seller?.displayName ?? null,
        createdAt: payment.createdAt,
        paymentIntentId: payment.paymentIntentId,
        status: payment.status,
        amountGross: payment.amountGross,
        amountFee: payment.amountFee,
        amountNet: payment.amountNet,
        feeRate,
        feeRateSource: source,
        expectedApplicationFee: expectedFee,
        actualApplicationFee: applicationFee,
        feeDelta: delta,
        checkStatus,
      };
    });

    const filteredRows = statusFilter === 'all'
      ? rows
      : rows.filter((row) => row.checkStatus === statusFilter);

    const summary = filteredRows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.checkStatus === 'mismatch') acc.mismatch += 1;
        if (row.checkStatus === 'missing_fee_rate') acc.missingFeeRate += 1;
        if (row.checkStatus === 'missing_application_fee') acc.missingApplicationFee += 1;
        return acc;
      },
      {
        total: 0,
        mismatch: 0,
        missingFeeRate: 0,
        missingApplicationFee: 0,
      }
    );

    return NextResponse.json({
      ok: true,
      summary,
      rows: filteredRows,
    });
  } catch (error) {
    console.error('[Admin FeeChecks] Error:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
