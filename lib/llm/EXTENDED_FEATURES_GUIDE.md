# 拡張AI機能ガイド

**更新日**: 2026-01-03  
**対象**: `lib/llm/features/` ディレクトリ

## 📋 概要

本実装では、以下の拡張AI機能を提供します：

1. ✅ **画像生成** - DALL-E 3による画像生成
2. ✅ **音声認識** - Whisperによる音声→テキスト変換
3. ✅ **音声合成** - TTSによるテキスト→音声変換
4. ✅ **埋め込み** - Embeddingsによるベクトル化
5. ✅ **ストリーミング** - リアルタイムテキスト生成
6. ✅ **SNS自動投稿** - LLMで投稿文生成
7. ✅ **情報収集** - Web検索 + LLM要約
8. ✅ **ポッドキャスト** - 音声合成 + スクリプト生成

---

## 🎨 1. 画像生成

### 基本的な使い方

```typescript
import { generateImage } from '@/lib/llm';

// 画像を生成
const result = await generateImage('A cute cat playing with yarn', {
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'hd',
  style: 'vivid',
});

// 生成された画像（Buffer配列）
const images = result.images;
```

### 使用例

```typescript
// 商品画像を生成
const productImage = await generateImage(
  'A vintage camera on a wooden table, professional photography',
  {
    size: '1024x1024',
    quality: 'hd',
  }
);

// 複数枚生成
const multipleImages = await generateImage(
  'Different angles of a coffee cup',
  {
    n: 4, // 4枚生成
  }
);
```

---

## 🎤 2. 音声認識（Speech-to-Text）

### 基本的な使い方

```typescript
import { speechToText } from '@/lib/llm/features';

// 音声ファイルをテキストに変換
const result = await speechToText({
  audio: audioFile, // File または Buffer
  language: 'ja',
  prompt: 'フリーマーケットの商品説明',
});

console.log(result.text); // 認識されたテキスト
```

### 使用例

```typescript
// 音声メモをテキスト化
const memo = await speechToText({
  audio: voiceMemoFile,
  language: 'ja',
});

// 英語の音声を認識
const englishText = await speechToText({
  audio: englishAudioFile,
  language: 'en',
});
```

---

## 🔊 3. 音声合成（Text-to-Speech）

### 基本的な使い方

```typescript
import { textToSpeech } from '@/lib/llm/features';

// テキストを音声に変換
const result = await textToSpeech({
  text: 'こんにちは、フリーマーケットへようこそ',
  voice: 'nova',
  speed: 1.0,
  format: 'mp3',
});

// 生成された音声（Buffer）
const audio = result.audio;
```

### 使用例

```typescript
// 商品説明を音声化
const productDescription = await textToSpeech({
  text: 'この商品は美品です。',
  voice: 'nova',
  speed: 1.0,
});

// 高速で読み上げ
const fastReading = await textToSpeech({
  text: '長いテキストを高速で読み上げます',
  voice: 'echo',
  speed: 1.5,
});
```

---

## 🔍 4. 埋め込み（Embeddings）

### 基本的な使い方

```typescript
import { createEmbedding } from '@/lib/llm';

// テキストをベクトル化
const result = await createEmbedding('フリーマーケットの商品', {
  model: 'text-embedding-3-small',
});

// 埋め込みベクトル（配列の配列）
const embeddings = result.embeddings;
```

### 使用例

```typescript
// 複数のテキストを一度にベクトル化
const multipleEmbeddings = await createEmbedding([
  '商品A',
  '商品B',
  '商品C',
], {
  model: 'text-embedding-3-small',
});

// RAG（検索拡張生成）に使用
const queryEmbedding = await createEmbedding('検索クエリ');
// ベクトル類似度検索で関連文書を取得
```

---

## 🌊 5. ストリーミング

### 基本的な使い方

```typescript
import { chatCompletionStream } from '@/lib/llm';

// ストリーミングでテキスト生成
const stream = chatCompletionStream({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: '長いストーリーを書いて' }],
  stream: true,
});

// チャンクごとに処理
for await (const chunk of stream) {
  console.log(chunk.delta); // 差分テキスト
  console.log(chunk.content); // 累積テキスト
}
```

### 使用例

```typescript
// リアルタイムで応答を表示
for await (const chunk of chatCompletionStream({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: '説明して' }],
  stream: true,
})) {
  // 差分を追加
  displayText(chunk.delta);
  
  // 完了時
  if (chunk.finish_reason === 'stop') {
    console.log('完了');
  }
}
```

---

## 📱 6. SNS自動投稿

### 基本的な使い方

```typescript
import { generateSNSPost } from '@/lib/llm/features';

// SNS投稿文を生成
const post = await generateSNSPost({
  platform: 'twitter',
  content: {
    text: '今日のフリマで素敵な商品を見つけました',
    imageUrl: 'https://example.com/image.jpg',
    hashtags: ['フリマ', '中古'],
  },
  tone: 'casual',
  maxLength: 280,
});

console.log(post.text); // 生成された投稿文
console.log(post.hashtags); // ハッシュタグ
```

### 使用例

```typescript
// Instagram投稿
const instagramPost = await generateSNSPost({
  platform: 'instagram',
  content: {
    text: '新商品入荷しました！',
    hashtags: ['フリマ', '中古', 'お得'],
  },
  tone: 'friendly',
});

// LinkedIn投稿
const linkedinPost = await generateSNSPost({
  platform: 'linkedin',
  content: {
    text: 'ビジネス向けの商品情報',
  },
  tone: 'professional',
});
```

---

## 🔎 7. 情報収集

### 基本的な使い方

```typescript
import { gatherInformation } from '@/lib/llm/features';

// 情報を収集して要約
const info = await gatherInformation({
  query: 'フリーマーケット トレンド 2025',
  sources: ['web', 'news'],
  summarize: true,
  summaryLength: 'medium',
});

console.log(info.summary); // 要約
console.log(info.results); // 検索結果
```

### 使用例

```typescript
// トレンド情報を収集
const trends = await gatherInformation({
  query: 'フリマ 人気商品',
  sources: ['web', 'social'],
  maxResults: 10,
  summarize: true,
});

// 学術情報を収集
const academicInfo = await gatherInformation({
  query: 'sustainable consumption',
  sources: ['academic'],
  dateRange: {
    from: new Date('2024-01-01'),
    to: new Date(),
  },
});
```

---

## 🎙️ 8. ポッドキャスト

### 基本的な使い方

```typescript
import { generatePodcastEpisode } from '@/lib/llm/features';

// ポッドキャストエピソードを生成
const episode = await generatePodcastEpisode({
  title: 'フリマトレンド2025',
  script: [
    'フリーマーケットの最新トレンドについて',
    '人気商品の傾向',
    '売上向上のコツ',
  ],
  voice: 'nova',
  speed: 1.0,
  intro: 'こんにちは、フリマポッドキャストへようこそ',
  outro: '次回もお楽しみに',
});

console.log(episode.audio); // 音声ファイル（Buffer）
console.log(episode.totalDuration); // 再生時間（秒）
```

### 使用例

```typescript
// スクリプトから直接生成
const episodeFromScript = await generatePodcastEpisode({
  title: '商品紹介',
  script: '今日は素敵な商品をご紹介します...',
  voice: 'shimmer',
  speed: 1.0,
});

// セグメント付きで生成
const segmentedEpisode = await generatePodcastEpisode({
  title: '複数トピック',
  script: 'トピック1、トピック2、トピック3',
  segments: [
    { title: 'イントロ', content: 'はじめに' },
    { title: 'メイン', content: '本題' },
    { title: 'アウトロ', content: 'まとめ' },
  ],
});
```

---

## 🔧 環境変数

以下の環境変数が必要です：

```bash
# OpenAI API Key（必須）
OPENAI_API_KEY=sk-...

# Helicone API Key（監視用、推奨）
HELICONE_API_KEY=...

# デフォルトプロバイダー（オプション）
LLM_PROVIDER=openai
```

---

## 📊 機能対応表

| 機能 | OpenAI | Anthropic | Gemini | 備考 |
|------|--------|-----------|--------|------|
| 画像生成 | ✅ | ❌ | ⚠️ | DALL-E 3 |
| 音声認識 | ✅ | ❌ | ⚠️ | Whisper |
| 音声合成 | ✅ | ❌ | ❌ | TTS |
| 埋め込み | ✅ | ⚠️ | ✅ | Embeddings |
| ストリーミング | ✅ | ✅ | ✅ | Streaming |
| SNS投稿 | ✅ | ✅ | ✅ | LLM生成 |
| 情報収集 | ✅ | ✅ | ✅ | Web検索+LLM |
| ポッドキャスト | ✅ | ✅ | ✅ | TTS+LLM |

---

## 🚀 次のステップ

1. **Web検索APIの統合** - SerpAPI、Google Custom Search等
2. **音声結合の実装** - FFmpegを使用した音声結合
3. **SNS API統合** - Twitter API、Instagram API等
4. **ポッドキャスト配信** - RSS配信、ストリーミング配信

---

## 📚 参考資料

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [DALL-E 3 Guide](https://platform.openai.com/docs/guides/images)
- [Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [TTS API](https://platform.openai.com/docs/guides/text-to-speech)

