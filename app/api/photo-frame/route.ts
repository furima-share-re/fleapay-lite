// app/api/photo-frame/route.ts
// Phase 2.6: Express.js廃止 - 残りAPIエンドポイント移行

import { NextResponse, NextRequest } from 'next/server';
import sharp from 'sharp';
import { openai, isOpenAIAvailable } from '@/lib/openai';

export async function POST(request: NextRequest) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.warn(`[写真フレーム][${requestId}] ===== API呼び出し開始 =====`);
  
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      console.warn(`[写真フレーム][${requestId}] ❌ 画像ファイルなし`);
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

    console.warn(`[写真フレーム][${requestId}] 📸 画像処理開始: ${file.name || 'unknown'} (${file.size} bytes)`);

    // 画像をRGBA PNGに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const inputBuffer = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .png()
      .toBuffer();

    // Fileオブジェクト作成（BufferをUint8Arrayに変換）
    const uint8Array = new Uint8Array(inputBuffer);
    const fileObj = new File([uint8Array], 'image.png', { type: 'image/png' });

    // Helicone設定確認
    const heliconeConfigured = isOpenAIAvailable();
    console.warn(`[写真フレーム][${requestId}] 🔧 Helicone設定:`, heliconeConfigured ? '✅ 有効' : '❌ 無効');
    console.warn(`[写真フレーム][${requestId}] 🔧 OPENAI_API_KEY:`, process.env.OPENAI_API_KEY ? '✅ 設定済み' : '❌ 未設定');
    console.warn(`[写真フレーム][${requestId}] 🔧 HELICONE_API_KEY:`, process.env.HELICONE_API_KEY ? '✅ 設定済み' : '❌ 未設定');
    console.warn(`[写真フレーム][${requestId}] 🔧 NODE_ENV:`, process.env.NODE_ENV || 'development');

    if (!heliconeConfigured) {
      console.error(`[写真フレーム][${requestId}] ❌ OpenAI SDKが利用できません`);
      return NextResponse.json(
        {
          error: 'openai_not_configured',
          message: 'OPENAI_API_KEYまたはHELICONE_API_KEY環境変数が設定されていません',
        },
        { status: 503 }
      );
    }

    console.warn(`[写真フレーム][${requestId}] 🚀 Helicone経由でOpenAI Images Edit API呼び出し開始`);
    console.warn(`[写真フレーム][${requestId}] 📤 Base URL: https://oai.helicone.ai/v1`);
    console.warn(`[写真フレーム][${requestId}] 📤 Model: dall-e-2`);

    const startTime = Date.now();

    // openaiがnullでないことは既にチェック済み
    if (!openai) {
      throw new Error('OpenAI client is not available');
    }
    // OpenAI画像編集
    const result = await openai.images.edit({
      model: 'dall-e-2',
      image: fileObj,
      prompt,
      size: '1024x1024',
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.warn(`[写真フレーム][${requestId}] ✅ OpenAI API呼び出し成功 (${duration}ms)`);
    console.warn(`[写真フレーム][${requestId}] 📝 Response ID:`, result.created);
    console.warn(`[写真フレーム][${requestId}] 🔍 Heliconeでこのリクエストを確認してください`);

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

    console.warn(`[写真フレーム][${requestId}] ✅ 画像処理完了`);
    console.warn(`[写真フレーム][${requestId}] ===== API呼び出し終了 =====`);

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error: unknown) {
    console.error(`[写真フレーム][${requestId}] ❌ エラー発生:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorConstructor = error instanceof Error ? error.constructor.name : typeof error;
    console.error(`[写真フレーム][${requestId}] ❌ エラータイプ:`, errorConstructor);
    console.error(`[写真フレーム][${requestId}] ❌ エラーメッセージ:`, errorMessage);

    // OpenAI APIエラーの詳細ログ
    let statusFromOpenAI: number | undefined;
    let messageFromOpenAI: string = '画像の加工処理中にエラーが発生しました';
    
    if (error && typeof error === 'object') {
      if ('response' in error && error.response && typeof error.response === 'object') {
        const response = error.response as Record<string, unknown>;
        console.error(`[写真フレーム][${requestId}] ❌ OpenAI API Error:`, {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        });
        if (typeof response.status === 'number') {
          statusFromOpenAI = response.status;
        }
        if (response.data && typeof response.data === 'object' && 'error' in response.data) {
          const errorData = response.data.error as Record<string, unknown>;
          if (typeof errorData.message === 'string') {
            messageFromOpenAI = errorData.message;
          }
        }
      }
      if ('status' in error && typeof error.status === 'number') {
        statusFromOpenAI = error.status;
      }
    }
    
    // Helicone関連のエラーかどうか確認
    if (errorMessage.includes('helicone') || errorMessage.includes('Helicone')) {
      console.error(`[写真フレーム][${requestId}] ⚠️ Helicone関連のエラーの可能性があります`);
    }
    
    console.error(`[写真フレーム][${requestId}] ===== API呼び出し失敗 =====`);

    // クライアントへの適切なエラーレスポンス
    const status = statusFromOpenAI ?? 500;
    if (!messageFromOpenAI || messageFromOpenAI === 'Unknown error') {
      messageFromOpenAI = errorMessage || '画像の加工処理中にエラーが発生しました';
    }

    return NextResponse.json(
      {
        error: 'edit_failed',
        message: messageFromOpenAI,
      },
      { status }
    );
  }
}

