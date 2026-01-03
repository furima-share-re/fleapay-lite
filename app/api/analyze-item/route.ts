// app/api/analyze-item/route.ts
// Phase 2.3: Next.js画面移行（AI商品解析API Route Handler）

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { bumpAndAllow, clientIp, sanitizeError } from '@/lib/utils';
// 新API（推奨）: import { chatCompletion, getLLMProvider } from '@/lib/llm';
// 既存API（後方互換性のため残す）:
import { openai, isOpenAIAvailable } from '@/lib/openai';

const RATE_LIMIT_MAX_WRITES = 12;

export async function POST(request: Request) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[AI分析][${requestId}] ===== API呼び出し開始 =====`);
  
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      console.log(`[AI分析][${requestId}] ❌ 画像ファイルなし`);
      return NextResponse.json(
        { error: 'file_required', message: '画像ファイルが必要です' },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    if (!bumpAndAllow(`ai:${ip}`, RATE_LIMIT_MAX_WRITES)) {
      console.log(`[AI分析][${requestId}] ❌ レート制限`);
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429 }
      );
    }

    console.log(`[AI分析][${requestId}] 📸 画像処理開始: ${file.name || 'unknown'} (${file.size} bytes)`);

    // Helicone設定確認
    const heliconeConfigured = isOpenAIAvailable();
    console.log(`[AI分析][${requestId}] 🔧 Helicone設定:`, heliconeConfigured ? '✅ 有効' : '❌ 無効');
    console.log(`[AI分析][${requestId}] 🔧 OPENAI_API_KEY:`, process.env.OPENAI_API_KEY ? '✅ 設定済み' : '❌ 未設定');
    console.log(`[AI分析][${requestId}] 🔧 HELICONE_API_KEY:`, process.env.HELICONE_API_KEY ? '✅ 設定済み' : '❌ 未設定');
    console.log(`[AI分析][${requestId}] 🔧 NODE_ENV:`, process.env.NODE_ENV || 'development');

    if (!heliconeConfigured) {
      console.error(`[AI分析][${requestId}] ❌ OpenAI SDKが利用できません`);
      return NextResponse.json(
        {
          error: 'openai_not_configured',
          message: 'OPENAI_API_KEYまたはHELICONE_API_KEY環境変数が設定されていません'
        },
        { status: 503 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const imageBuffer = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log(`[AI分析][${requestId}] 🚀 Helicone経由でOpenAI API呼び出し開始`);
    console.log(`[AI分析][${requestId}] 📤 Base URL: https://oai.helicone.ai/v1`);
    console.log(`[AI分析][${requestId}] 📤 Model: gpt-4o`);

    const startTime = Date.now();
    
    // openaiがnullでないことは既にチェック済み
    const response = await openai!.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `この画像はフリーマーケットの商品写真です。以下の情報を分析して、必ずJSONだけを返してください。

1. 商品の簡潔で具体的な説明（summary）
   - 写真から読み取れる情報を使ってください
   - 例: 「ポケモンカードのセット」「青い子ども用Tシャツ」など
   - 「商品の説明（日本語、50文字以内）」のようなテンプレ文や、この指示文をそのまま書かないでください

2. 値札に書かれている価格（total）- 数字のみ（円）
   - 値札が見つからない、読めない場合は total を 0 にしてください

**レスポンスは、必ず次の形式のJSONだけにしてください：**

{
  "summary": "商品の説明（50文字以内）",
  "total": 0
}`
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl }
          }
        ]
      }],
      max_tokens: 200
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[AI分析][${requestId}] ✅ OpenAI API呼び出し成功 (${duration}ms)`);
    console.log(`[AI分析][${requestId}] 📊 Usage:`, {
      prompt_tokens: response.usage?.prompt_tokens,
      completion_tokens: response.usage?.completion_tokens,
      total_tokens: response.usage?.total_tokens,
    });
    console.log(`[AI分析][${requestId}] 📝 Response ID:`, response.id);
    console.log(`[AI分析][${requestId}] 🔍 Heliconeでこのリクエストを確認してください`);

    const content = response.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[AI分析] JSON解析エラー:', content);
      parsed = { summary: '', total: 0 };
    }

    const summary = String(parsed.summary || '').trim();
    const total = Number(parsed.total) || 0;

    console.log(`[AI分析][${requestId}] ✅ 解析完了:`, { summary, total });
    console.log(`[AI分析][${requestId}] ===== API呼び出し終了 =====`);

    return NextResponse.json({
      summary,
      total,
      items: total > 0 ? [{
        name: summary || '商品',
        unit_price: total,
        quantity: 1
      }] : []
    });

  } catch (error: any) {
    console.error(`[AI分析][${requestId}] ❌ エラー発生:`, error);
    console.error(`[AI分析][${requestId}] ❌ エラータイプ:`, error?.constructor?.name);
    console.error(`[AI分析][${requestId}] ❌ エラーメッセージ:`, error?.message);
    
    // OpenAI APIエラーの詳細ログ
    if (error?.response) {
      console.error(`[AI分析][${requestId}] ❌ OpenAI API Error:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }
    
    // Helicone関連のエラーかどうか確認
    if (error?.message?.includes('helicone') || error?.message?.includes('Helicone')) {
      console.error(`[AI分析][${requestId}] ⚠️ Helicone関連のエラーの可能性があります`);
    }
    
    console.error(`[AI分析][${requestId}] ===== API呼び出し失敗 =====`);
    
    return NextResponse.json(
      sanitizeError(error),
      { status: 500 }
    );
  }
}

