'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

type FortuneType = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶';

const fortuneColors: Record<FortuneType, { from: string; to: string; emoji: string }> = {
  大吉: { from: 'from-red-500', to: 'to-red-700', emoji: '🎉' },
  中吉: { from: 'from-orange-500', to: 'to-orange-700', emoji: '🎊' },
  小吉: { from: 'from-yellow-500', to: 'to-yellow-700', emoji: '✨' },
  吉: { from: 'from-green-500', to: 'to-green-700', emoji: '🍀' },
  末吉: { from: 'from-blue-500', to: 'to-blue-700', emoji: '🌟' },
  凶: { from: 'from-gray-500', to: 'to-gray-700', emoji: '⚡' },
};

function Phase3Content() {
  const router = useRouter();
  const [fortune] = useState<FortuneType>('大吉');
  const [decorations, setDecorations] = useState<
    Array<{ id: number; type: string; x: number; y: number; delay: number }>
  >([]);

  useEffect(() => {
    // 縁起物の配置
    const decorArray = [
      { id: 0, type: 'cat', x: 10, y: 20 },
      { id: 1, type: 'cat', x: 85, y: 25 },
      { id: 2, type: 'daruma', x: 15, y: 70 },
      { id: 3, type: 'daruma', x: 80, y: 75 },
      { id: 4, type: 'omamori', x: 5, y: 50 },
      { id: 5, type: 'omamori', x: 90, y: 45 },
      { id: 6, type: 'coin', x: 20, y: 40 },
      { id: 7, type: 'coin', x: 75, y: 50 },
      { id: 8, type: 'coin', x: 50, y: 15 },
      { id: 9, type: 'coin', x: 50, y: 85 },
    ].map((item, i) => ({
      ...item,
      delay: i * 0.1,
    }));
    setDecorations(decorArray);
  }, []);

  const colors = fortuneColors[fortune] || fortuneColors['大吉'];

  const handleNext = () => {
    router.push(`/omikuji-enhanced/phase4?fortune=${encodeURIComponent(fortune)}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-ghibli-cream via-white to-ghibli-cream">
      {/* 背景のジブリ風黄昏の光 */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-200/30 via-orange-100/20 to-purple-200/30 z-0" />

      {/* 伝統文様 - 青海波パターン */}
      <div
        className="absolute inset-0 z-1 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 20px,
            #2c4f6f 20px,
            #2c4f6f 22px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 20px,
            #2c4f6f 20px,
            #2c4f6f 22px
          )`,
        }}
      />

      {/* 神社建築 - 鳥居 */}
      <div className="absolute top-10 left-1/4 z-5 opacity-40">
        <div className="w-32 h-40">
          <div className="w-full h-6 bg-edo-indigo rounded-t-lg" />
          <div className="absolute top-6 left-0 right-0 h-28 border-l-10 border-r-10 border-t-10 border-edo-indigo" />
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-12 bg-edo-indigo" />
        </div>
      </div>

      <div className="absolute top-10 right-1/4 z-5 opacity-40">
        <div className="w-32 h-40">
          <div className="w-full h-6 bg-edo-indigo rounded-t-lg" />
          <div className="absolute top-6 left-0 right-0 h-28 border-l-10 border-r-10 border-t-10 border-edo-indigo" />
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-12 bg-edo-indigo" />
        </div>
      </div>

      {/* 本殿屋根 */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-5 opacity-30">
        <div
          className="w-64 h-32 bg-edo-indigo"
          style={{
            clipPath: 'polygon(0% 100%, 20% 0%, 80% 0%, 100% 100%)',
          }}
        />
      </div>

      {/* 石灯籠 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.2 }}
          className="absolute bottom-20 z-5"
          style={{
            left: `${15 + i * 25}%`,
          }}
        >
          <div className="w-8 h-24 bg-gray-600 rounded-t-lg">
            <div className="w-12 h-4 bg-gray-700 -translate-x-2" />
            <div className="w-6 h-6 bg-yellow-200 rounded-full mx-auto mt-2 opacity-60" />
          </div>
        </motion.div>
      ))}

      {/* 狛犬 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute bottom-24 left-12 z-10 text-4xl"
      >
        🦁
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute bottom-24 right-12 z-10 text-4xl"
      >
        🦁
      </motion.div>

      {/* 運勢カード（豪華化） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="relative"
        >
          {/* 5層の伝統文様ボーダー */}
          <div className="relative p-2">
            {/* 外側: 藍+麻の葉 */}
            <div className="absolute inset-0 bg-gradient-to-br from-edo-indigo/80 to-edo-indigo p-1 rounded-3xl">
              <div
                className="w-full h-full opacity-30"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    60deg,
                    transparent,
                    transparent 5px,
                    #d4af37 5px,
                    #d4af37 6px
                  )`,
                }}
              />
            </div>

            {/* 中間: 朱色ストライプ */}
            <div className="absolute inset-2 bg-gradient-to-r from-edo-vermilion/60 to-edo-vermilion/80 p-1 rounded-3xl">
              <div className="w-full h-full border-2 border-dashed border-edo-gold rounded-3xl" />
            </div>

            {/* 内側: 金+青海波 */}
            <div className="relative bg-gradient-to-br from-edo-gold/90 to-yellow-600/90 p-1 rounded-3xl">
              <div
                className="w-full h-full opacity-40"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 10px,
                    #2c4f6f 10px,
                    #2c4f6f 11px
                  )`,
                }}
              />
            </div>

            {/* カード本体 */}
            <div
              className={`relative bg-gradient-to-br ${colors.from} ${colors.to} rounded-2xl shadow-2xl p-8 md:p-12 border-4 border-edo-gold min-w-[320px] md:min-w-[450px]`}
            >
              {/* 四隅の判子印 */}
              <div className="absolute top-2 left-2 w-8 h-8 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                印
              </div>
              <div className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                印
              </div>
              <div className="absolute bottom-2 left-2 w-8 h-8 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                印
              </div>
              <div className="absolute bottom-2 right-2 w-8 h-8 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                印
              </div>

              {/* 和紙の質感 */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url('data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h100v100H0z" fill="%23fff"/%3E%3Cpath d="M0 0l100 100M100 0L0 100" stroke="%23000" stroke-width="0.5" opacity="0.1"/%3E%3C/svg%3E')`,
                }}
              />

              <div className="text-center relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: 'spring', stiffness: 200 }}
                  className="text-8xl md:text-9xl mb-4"
                >
                  {colors.emoji}
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="text-7xl md:text-9xl font-serif font-bold text-white mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                >
                  {fortune}
                </motion.h1>

                {/* 縦書き運勢文 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-white text-xl md:text-2xl font-serif space-y-2 writing-vertical-rl inline-block"
                >
                  <div>運勢大吉</div>
                  <div>良縁訪れる</div>
                  <div>願望叶う</div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 縁起物の配置 */}
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
          {dec.type === 'cat' && <div className="text-5xl">🐱</div>}
          {dec.type === 'daruma' && <div className="text-5xl">🎎</div>}
          {dec.type === 'omamori' && <div className="text-4xl">🎋</div>}
          {dec.type === 'coin' && (
            <div className="w-12 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-lg flex items-center justify-center text-xs font-bold text-yellow-900">
              両
            </div>
          )}
        </motion.div>
      ))}

      {/* 提灯5-6個 */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-10">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative w-14 h-20"
          >
            <div className="absolute inset-0 bg-red-600 rounded-t-full rounded-b-none shadow-lg border-2 border-yellow-400" />
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-red-800" />
          </motion.div>
        ))}
      </div>

      {/* 水引（紅白の飾り紐） */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute top-1/4 left-1/2 transform -translate-x-1/2 z-10 w-64 h-1 bg-gradient-to-r from-red-600 via-white to-red-600"
      />

      {/* 絵馬 */}
      <motion.div
        initial={{ opacity: 0, rotate: -10 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ delay: 2 }}
        className="absolute top-32 right-20 z-15 w-24 h-32 bg-wood bg-yellow-800 rounded-lg border-2 border-yellow-900 shadow-lg flex items-center justify-center text-white text-sm font-bold"
      >
        願
      </motion.div>

      {/* 次のボタン */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 }}
          onClick={handleNext}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-10 py-5 bg-gradient-to-r from-edo-vermilion to-edo-gold text-white font-bold text-xl rounded-full border-4 border-edo-gold shadow-xl"
        >
          シェアしてクーポンGET →
        </motion.button>
      </div>

      {/* 比率バッジ */}
      <div className="absolute bottom-4 left-4 z-30 flex gap-2">
        <span className="px-3 py-1 bg-ghibli-forest text-white text-xs rounded-full">
          ジブリ 70%
        </span>
        <span className="px-3 py-1 bg-edo-vermilion text-white text-xs rounded-full">
          江戸 25%
        </span>
        <span className="px-3 py-1 bg-modern-neon text-white text-xs rounded-full">
          現代 5%
        </span>
      </div>
    </div>
  );
}

export default function Phase3Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ghibli-cream flex items-center justify-center">読み込み中...</div>}>
      <Phase3Content />
    </Suspense>
  );
}

