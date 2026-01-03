// app/api/photo-frame/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
import { sanitizeError } from '@/lib/utils';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        {
          error: 'file_required',
          message: '画像ファイルが必要です',
        },
        { status: 400 }
      );
    }

    // プロンプト（長さ制限）
    const rawPrompt =
      process.env.OPENAI_PROMPT_PHOTO_FRAME ||
      'Cute up this photo with a soft pink sakura frame. Keep the original person as they are.';
    const prompt = rawPrompt.slice(0, 950);

    console.log(`Processing image: ${file.name || 'unknown'} (${file.size} bytes)`);

    // 画像をRGBA PNGに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const inputBuffer = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .png()
      .toBuffer();

    // Fileオブジェクト作成
    const fileObj = new File([inputBuffer], 'image.png', { type: 'image/png' });

    console.log('Sending to OpenAI Images Edit API...');

    if (!openai) {
      return NextResponse.json(
        {
          error: 'openai_not_configured',
          message: 'OPENAI_API_KEY環境変数が設定されていません',
        },
        { status: 503 }
      );
    }

    // OpenAI画像編集
    const result = await openai.images.edit({
      model: 'dall-e-2',
      image: fileObj,
      prompt,
      size: '1024x1024',
    });

    // レスポンス処理の安全性向上
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        {
          error: 'no_image_returned',
          message: 'OpenAI APIから画像が返されませんでした',
        },
        { status: 502 }
      );
    }

    const buf = Buffer.from(b64, 'base64');

    console.log('Image processing completed successfully');

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error: any) {
    console.error('Photo frame processing error:', error);

    // OpenAI APIエラーの詳細ログ
    if (error.response) {
      console.error('OpenAI API Error Details:', {
        status: error.response.status,
        data: error.response.data,
      });
    }

    // クライアントへの適切なエラーレスポンス
    const statusFromOpenAI = error?.response?.status || error?.status;
    const status = typeof statusFromOpenAI === 'number' ? statusFromOpenAI : 500;

    const messageFromOpenAI =
      error?.response?.data?.error?.message ||
      error?.message ||
      '画像の加工処理中にエラーが発生しました';

    return NextResponse.json(
      {
        error: 'edit_failed',
        message: messageFromOpenAI,
      },
      { status }
    );
  }
}

