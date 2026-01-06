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
          message: 'OPENAI_API_KEY環境変数が設定されていません（HELICONE_API_KEYはオプション）',
          configuration: {
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
            hasHeliconeKey: !!process.env.HELICONE_API_KEY,
            nodeEnv: process.env.NODE_ENV || 'development',
          },
        },
        { status: 503 }
      );
    }

    console.warn('[Helicone Test] Sending test request to OpenAI via Helicone...');

    // 簡単なテストリクエストを送信
    if (!openai) {
      throw new Error('OpenAI client is not available');
    }
    const response = await openai.chat.completions.create({
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

    console.warn('[Helicone Test] Response received:', content);

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
  } catch (error: unknown) {
    console.error('[Helicone Test] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails: {
      status?: number;
      code?: string | number;
      type?: string;
    } = {};
    
    if (error && typeof error === 'object') {
      if ('status' in error && typeof error.status === 'number') {
        errorDetails.status = error.status;
      }
      if ('response' in error && error.response && typeof error.response === 'object' && 'status' in error.response && typeof error.response.status === 'number') {
        errorDetails.status = error.response.status;
      }
      if ('code' in error) {
        errorDetails.code = error.code as string | number;
      }
      if ('type' in error && typeof error.type === 'string') {
        errorDetails.type = error.type;
      }
    }

    return NextResponse.json(
      {
        error: 'test_failed',
        message: errorMessage,
        details: errorDetails,
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

