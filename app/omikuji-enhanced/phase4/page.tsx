'use client';

import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type FortuneType = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶';

const fortuneColors: Record<FortuneType, { from: string; to: string; emoji: string }> = {
  大吉: { from: 'from-red-500', to: 'to-red-700', emoji: '🎉' },
  中吉: { from: 'from-orange-500', to: 'to-orange-700', emoji: '🎊' },
  小吉: { from: 'from-yellow-500', to: 'to-yellow-700', emoji: '✨' },
  吉: { from: 'from-green-500', to: 'to-green-700', emoji: '🍀' },
  末吉: { from: 'from-blue-500', to: 'to-blue-700', emoji: '🌟' },
  凶: { from: 'from-gray-500', to: 'to-gray-700', emoji: '⚡' },
};

function Phase4Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fortune = (searchParams.get('fortune') || '大吉') as FortuneType;
  const [decorations, setDecorations] = useState<
    Array<{ id: number; type: string; x: number; y: number; delay: number }>
  >([]);
  const [timeLeft, setTimeLeft] = useState(272); // 04:32

  useEffect(() => {
    // 縁起物の大量配置
    const decorArray = [
      // 小判8-10
      ...Array.from({ length: 9 }, (_, i) => ({
        id: i,
        type: 'coin',
        x: 10 + (i * 9),
        y: 10 + Math.random() * 80,
        delay: i * 0.05,
      })),
      // だるま2-3
      ...Array.from({ length: 3 }, (_, i) => ({
        id: 9 + i,
        type: 'daruma',
        x: 15 + i * 35,
        y: 85,
        delay: 0.5 + i * 0.1,
      })),
      // 招き猫1-2
      ...Array.from({ length: 2 }, (_, i) => ({
        id: 12 + i,
        type: 'cat',
        x: 10 + i * 80,
        y: 20,
        delay: 0.8 + i * 0.1,
      })),
      // お守り4-5
      ...Array.from({ length: 5 }, (_, i) => ({
        id: 14 + i,
        type: 'omamori',
        x: 5 + i * 22,
        y: 75,
        delay: 1 + i * 0.1,
      })),
      // 手毬、扇子、判子印、絵馬
      { id: 19, type: 'temari', x: 20, y: 40, delay: 1.5 },
      { id: 20, type: 'sensu', x: 80, y: 40, delay: 1.6 },
      { id: 21, type: 'hanko', x: 50, y: 90, delay: 1.7 },
      { id: 22, type: 'ema', x: 90, y: 15, delay: 1.8 },
    ];
    setDecorations(decorArray);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const colors = fortuneColors[fortune] || fortuneColors['大吉'];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-ghibli-cream via-white to-ghibli-cream">
      {/* 背景のジブリ風黄昏の光 */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-200/30 via-orange-100/20 to-purple-200/30 z-0" />

      {/* 伝統文様オーバーレイ（8%透明度） */}
      <div
        className="absolute inset-0 z-1 opacity-[0.08]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(60deg, transparent, transparent 15px, #2c4f6f 15px, #2c4f6f 16px),
            repeating-linear-gradient(0deg, transparent, transparent 20px, #2c4f6f 20px, #2c4f6f 21px)
          `,
        }}
      />

      {/* 背景の江戸工房 - 格子窓パターン */}
      <div className="absolute inset-0 z-5 opacity-10">
        <div className="h-full grid grid-cols-6 gap-4 p-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border-2 border-edo-indigo/30 grid grid-cols-3 gap-1 p-2">
              {Array.from({ length: 9 }).map((_, j) => (
                <div key={j} className="border border-edo-indigo/20" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 畳テクスチャ */}
      <div
        className="absolute inset-0 z-5 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            #6b9080 0px,
            #6b9080 200px,
            transparent 200px,
            transparent 400px
          )`,
        }}
      />

      {/* 木の梁フレーム */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-yellow-900/30 to-transparent z-5" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-yellow-900/30 to-transparent z-5" />
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-yellow-900/30 to-transparent z-5" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-yellow-900/30 to-transparent z-5" />

      {/* タイトルバナー（木製看板スタイル） */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30"
      >
        <div className="relative bg-gradient-to-b from-yellow-800 to-yellow-900 p-6 rounded-lg shadow-2xl border-4 border-yellow-950">
          {/* 雲文様背景 */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 30%, white 2px, transparent 2px)`,
              backgroundSize: '30px 30px',
            }}
          />
          {/* 紅白水引装飾 */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            <div className="w-2 h-8 bg-red-600 rounded-full" />
            <div className="w-2 h-8 bg-white rounded-full" />
          </div>
          <h2 className="relative text-3xl md:text-4xl font-serif font-bold text-white text-center">
            あなたの運勢
          </h2>
        </div>
      </motion.div>

      {/* フォトフレーム（5層の伝統文様ボーダー） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative"
        >
          {/* 外側: 藍+麻の葉 */}
          <div className="absolute -inset-4 bg-gradient-to-br from-edo-indigo to-edo-indigo/80 rounded-3xl p-1">
            <div
              className="w-full h-full opacity-40 rounded-3xl"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  60deg,
                  transparent,
                  transparent 8px,
                  #d4af37 8px,
                  #d4af37 9px
                )`,
              }}
            />
          </div>

          {/* 中間: 朱色ストライプ */}
          <div className="absolute -inset-3 bg-gradient-to-r from-edo-vermilion/70 to-edo-vermilion/90 rounded-3xl p-1">
            <div className="w-full h-full border-2 border-dashed border-edo-gold rounded-3xl" />
          </div>

          {/* 内側: 金+青海波 */}
          <div className="absolute -inset-2 bg-gradient-to-br from-edo-gold/90 to-yellow-600/90 rounded-3xl p-1">
            <div
              className="w-full h-full opacity-50 rounded-3xl"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 12px,
                  #2c4f6f 12px,
                  #2c4f6f 13px
                )`,
              }}
            />
          </div>

          {/* 雲型コーナー装飾 */}
          <div className="absolute -top-6 -left-6 w-12 h-12 bg-edo-gold rounded-full opacity-60" />
          <div className="absolute -top-6 -right-6 w-12 h-12 bg-edo-gold rounded-full opacity-60" />
          <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-edo-gold rounded-full opacity-60" />
          <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-edo-gold rounded-full opacity-60" />

          {/* カード本体 */}
          <div
            className={`relative bg-gradient-to-br ${colors.from} ${colors.to} rounded-2xl shadow-2xl p-10 md:p-14 border-4 border-edo-gold min-w-[340px] md:min-w-[480px]`}
          >
            {/* 浮世絵風フィルター */}
            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg width=\"200\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence baseFrequency=\"0.9\" numOctaves=\"4\" /%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\" opacity=\"0.4\"/%3E%3C/svg%3E')]" />

            <div className="text-center relative z-10">
              {/* 「大吉」バッジ（80×80px判子風） */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="absolute -top-10 left-1/2 transform -translate-x-1/2"
              >
                <div className="w-20 h-20 bg-red-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                  <div className="text-3xl font-serif font-bold text-white">{fortune}</div>
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-edo-indigo font-bold">
                  江戸市場
                </div>
              </motion.div>

              <div className="text-8xl md:text-9xl mb-4 mt-8">{colors.emoji}</div>

              <h1 className="text-6xl md:text-8xl font-serif font-bold text-white mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {fortune}
              </h1>

              <div className="text-white text-lg md:text-xl font-serif space-y-2">
                <p>すべてがうまくいきます</p>
                <p>新しい出会いがあります</p>
                <p>願いが叶います</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 縁起物の大量配置 */}
      {decorations.map((dec) => (
        <motion.div
          key={dec.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: dec.delay }}
          className="absolute z-15"
          style={{
            left: `${dec.x}%`,
            top: `${dec.y}%`,
          }}
        >
          {dec.type === 'coin' && (
            <div className="w-10 h-7 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-lg flex items-center justify-center text-xs font-bold text-yellow-900">
              両
            </div>
          )}
          {dec.type === 'daruma' && <div className="text-4xl">🎎</div>}
          {dec.type === 'cat' && <div className="text-5xl">🐱</div>}
          {dec.type === 'omamori' && <div className="text-4xl">🎋</div>}
          {dec.type === 'temari' && <div className="text-4xl">🎀</div>}
          {dec.type === 'sensu' && <div className="text-4xl">🪭</div>}
          {dec.type === 'hanko' && (
            <div className="w-8 h-8 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
              印
            </div>
          )}
          {dec.type === 'ema' && (
            <div className="w-16 h-20 bg-yellow-800 rounded-lg border-2 border-yellow-900 shadow-lg flex items-center justify-center text-white text-xs font-bold">
              願
            </div>
          )}
        </motion.div>
      ))}

      {/* 現代UI要素 */}
      {/* SHAREボタン */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-30">
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-20 py-4 bg-white/80 backdrop-blur-md text-gray-900 font-bold text-xl rounded-xl border-2 border-edo-gold shadow-[0_0_30px_rgba(212,175,55,0.6)] flex items-center gap-3"
        >
          <span className="text-2xl">📱</span>
          <span>Instagramでシェア</span>
        </motion.button>
      </div>

      {/* カウントダウン */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30 text-center"
      >
        <div className="text-5xl font-bold text-edo-vermilion mb-2">{formatTime(timeLeft)}</div>
        <div className="text-lg text-edo-indigo font-semibold">限定クーポン</div>
      </motion.div>

      {/* 報酬バナー */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2.4 }}
        className="absolute bottom-20 right-8 z-30 bg-white/80 backdrop-blur-md p-6 rounded-xl border-4 border-edo-gold shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="text-4xl">💰</div>
          <div>
            <div className="text-2xl font-bold text-edo-indigo">¥500クーポン</div>
            <div className="text-sm text-gray-600">GET!</div>
          </div>
        </div>
      </motion.div>

      {/* 比率バッジ */}
      <div className="absolute bottom-4 left-4 z-30 flex gap-2">
        <span className="px-3 py-1 bg-ghibli-forest text-white text-xs rounded-full">
          ジブリ 60%
        </span>
        <span className="px-3 py-1 bg-edo-vermilion text-white text-xs rounded-full text-base">
          江戸 30% 🚀
        </span>
        <span className="px-3 py-1 bg-modern-neon text-white text-xs rounded-full">
          現代 15%
        </span>
      </div>
    </div>
  );
}

export default function Phase4Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ghibli-cream flex items-center justify-center">読み込み中...</div>}>
      <Phase4Content />
    </Suspense>
  );
}

