// app/api/debug/helicone/route.ts
// Helicone設定確認用デバッグエンドポイント

import { NextResponse } from 'next/server';
import { isOpenAIAvailable } from '@/lib/openai';

export async function GET() {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasHeliconeKey = !!process.env.HELICONE_API_KEY;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isAvailable = isOpenAIAvailable();

  // 環境変数の最初の数文字だけ表示（セキュリティ）
  const openaiKeyPreview = process.env.OPENAI_API_KEY
    ? `${process.env.OPENAI_API_KEY.substring(0, 7)}...`
    : 'not set';
  const heliconeKeyPreview = process.env.HELICONE_API_KEY
    ? `${process.env.HELICONE_API_KEY.substring(0, 7)}...`
    : 'not set';

  return NextResponse.json({
    status: 'ok',
    configuration: {
      hasOpenAIKey,
      hasHeliconeKey,
      nodeEnv,
      isOpenAIAvailable: isAvailable,
      openaiKeyPreview,
      heliconeKeyPreview,
    },
    helicone: {
      baseURL: 'https://oai.helicone.ai/v1',
      configured: hasOpenAIKey && hasHeliconeKey,
      headers: {
        'Helicone-Auth': hasHeliconeKey ? 'Bearer ***' : 'not set',
        'Helicone-Property-Environment': nodeEnv,
        'Helicone-Property-Project': 'fleapay-lite',
      },
    },
    message: isAvailable
      ? 'Helicone is configured correctly. API calls should be tracked.'
      : 'Helicone is not configured. Please set OPENAI_API_KEY and HELICONE_API_KEY environment variables.',
  });
}

