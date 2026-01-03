// app/api/debug/helicone-test/route.ts
// Helicone動作確認用テストエンドポイント

import { NextResponse } from 'next/server';
import { openai, isOpenAIAvailable } from '@/lib/openai';

export async function GET() {
  try {
    if (!isOpenAIAvailable()) {
      return NextResponse.json(
        {
          error: 'openai_not_configured',
          message: 'OPENAI_API_KEYまたはHELICONE_API_KEY環境変数が設定されていません',
          configuration: {
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
            hasHeliconeKey: !!process.env.HELICONE_API_KEY,
            nodeEnv: process.env.NODE_ENV || 'development',
          },
        },
        { status: 503 }
      );
    }

    console.log('[Helicone Test] Sending test request to OpenAI via Helicone...');

    // 簡単なテストリクエストを送信
    const response = await openai!.chat.completions.create({
      model: 'gpt-4o-mini', // コストが低いモデルを使用
      messages: [
        {
          role: 'user',
          content: 'Hello! This is a test request to verify Helicone integration. Please respond with "Helicone test successful".',
        },
      ],
      max_tokens: 50,
    });

    const content = response.choices[0]?.message?.content || '';

    console.log('[Helicone Test] Response received:', content);

    return NextResponse.json({
      status: 'success',
      message: 'Test request completed successfully',
      response: content,
      model: 'gpt-4o-mini',
      usage: response.usage,
      helicone: {
        configured: true,
        baseURL: 'https://oai.helicone.ai/v1',
        environment: process.env.NODE_ENV || 'development',
        project: 'fleapay-lite',
      },
      note: 'Check Helicone dashboard to verify this request was tracked.',
    });
  } catch (error: any) {
    console.error('[Helicone Test] Error:', error);

    return NextResponse.json(
      {
        error: 'test_failed',
        message: error?.message || 'Unknown error occurred',
        details: {
          status: error?.status || error?.response?.status,
          code: error?.code,
          type: error?.type,
        },
        configuration: {
          hasOpenAIKey: !!process.env.OPENAI_API_KEY,
          hasHeliconeKey: !!process.env.HELICONE_API_KEY,
          nodeEnv: process.env.NODE_ENV || 'development',
        },
      },
      { status: 500 }
    );
  }
}

