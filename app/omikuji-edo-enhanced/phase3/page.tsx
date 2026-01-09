'use client';

import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type FortuneType = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶';

const fortuneColors: Record<FortuneType, { from: string; to: string; emoji: string; message: string[] }> = {
  大吉: {
    from: 'from-red-500',
    to: 'to-red-700',
    emoji: '🎉',
    message: ['運勢大吉', '良縁訪れる', '願望叶う'],
  },
  中吉: {
    from: 'from-orange-500',
    to: 'to-orange-700',
    emoji: '🎊',
    message: ['運勢順調', '良い知らせ', '前向きに'],
  },
  小吉: {
    from: 'from-yellow-500',
    to: 'to-yellow-700',
    emoji: '✨',
    message: ['少しずつ', '努力実る', '明るい未来'],
  },
  吉: {
    from: 'from-green-500',
    to: 'to-green-700',
    emoji: '🍀',
    message: ['平穏な日々', '穏やかな運気', '感謝の気持ち'],
  },
  末吉: {
    from: 'from-blue-500',
    to: 'to-blue-700',
    emoji: '🌟',
    message: ['慎重に行動', '時間をかけて', '小さな幸せ'],
  },
  凶: {
    from: 'from-gray-500',
    to: 'to-gray-700',
    emoji: '⚡',
    message: ['注意深く', '周囲に気を配り', '慎重に判断'],
  },
};

function Phase3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fortune = (searchParams.get('fortune') || '大吉') as FortuneType;
  const colors = fortuneColors[fortune] || fortuneColors['大吉'];
  const [luckyItems, setLuckyItems] = useState<Array<{ id: number; type: string; x: number; y: number }>>([]);

  useEffect(() => {
    // 縁起物の配置
    const items = [
      { id: 0, type: '招き猫', x: 10, y: 20 },
      { id: 1, type: '招き猫', x: 85, y: 25 },
      { id: 2, type: 'だるま', x: 15, y: 70 },
      { id: 3, type: 'だるま', x: 80, y: 75 },
      { id: 4, type: 'お守り', x: 20, y: 50 },
      { id: 5, type: 'お守り', x: 75, y: 55 },
      { id: 6, type: '小判', x: 25, y: 40 },
      { id: 7, type: '小判', x: 70, y: 45 },
    ];
    setLuckyItems(items);
  }, []);

  const handleNext = () => {
    router.push(`/omikuji-edo-enhanced/phase4?fortune=${encodeURIComponent(fortune)}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-ghibli-cream via-[#f5f1e8] to-white">
      {/* 神社建築 - 鳥居、本殿屋根、柱 */}
      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-5 opacity-30">
        <div className="relative">
          {/* 鳥居 */}
          <div className="relative mb-4">
            <div className="w-48 h-6 bg-edo-vermilion mx-auto" />
            <div className="absolute top-0 left-1/4 w-8 h-32 bg-edo-vermilion" />
            <div className="absolute top-0 right-1/4 w-8 h-32 bg-edo-vermilion" />
          </div>
          
          {/* 本殿 */}
          <div className="w-32 h-20 bg-edo-indigo mx-auto rounded-t-lg">
            <div className="w-full h-3 bg-edo-vermilion" />
            <div className="w-full h-2 bg-edo-gold mt-1" />
          </div>
        </div>
      </div>

      {/* 石灯籠、狛犬 */}
      <div className="absolute bottom-20 left-10 z-5 opacity-20">
        <div className="w-8 h-20 bg-gray-600 rounded-t-lg">
          <div className="w-6 h-6 bg-yellow-400 rounded-full mx-auto mt-2" />
        </div>
      </div>

      <div className="absolute bottom-20 right-10 z-5 opacity-20">
        <div className="w-8 h-20 bg-gray-600 rounded-t-lg">
          <div className="w-6 h-6 bg-yellow-400 rounded-full mx-auto mt-2" />
        </div>
      </div>

      {/* 提灯5-6個 */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -3, 0] }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="w-12 h-16 bg-red-600 rounded-t-full rounded-b-none shadow-lg border-2 border-yellow-400"
          />
        ))}
      </div>

      {/* 縁起物 */}
      {luckyItems.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + item.id * 0.1 }}
          className="absolute z-10"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
          }}
        >
          {item.type === '招き猫' && (
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl"
            >
              🐱
            </motion.div>
          )}
          {item.type === 'だるま' && (
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-4xl"
            >
              🎎
            </motion.div>
          )}
          {item.type === 'お守り' && (
            <div className="text-3xl">🎋</div>
          )}
          {item.type === '小判' && (
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-12 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-300 shadow-lg flex items-center justify-center text-xs font-bold text-yellow-900"
            >
              両
            </motion.div>
          )}
        </motion.div>
      ))}

      {/* 運勢カード - 豪華化 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative bg-white rounded-2xl shadow-2xl p-8 md:p-12 min-w-[320px] md:min-w-[450px]"
        >
          {/* 5層の伝統文様ボーダー */}
          <div className="absolute inset-0 rounded-2xl border-4 border-edo-gold" />
          <div className="absolute inset-1 rounded-xl border-2 border-edo-vermilion" />
          <div
            className="absolute inset-2 rounded-lg border border-edo-indigo"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(44, 79, 111, 0.1) 10px, rgba(44, 79, 111, 0.1) 20px)',
            }}
          />
          
          {/* 四隅の判子印 */}
          <div className="absolute top-2 left-2 w-8 h-8 bg-edo-vermilion rounded-full opacity-50" />
          <div className="absolute top-2 right-2 w-8 h-8 bg-edo-vermilion rounded-full opacity-50" />
          <div className="absolute bottom-2 left-2 w-8 h-8 bg-edo-vermilion rounded-full opacity-50" />
          <div className="absolute bottom-2 right-2 w-8 h-8 bg-edo-vermilion rounded-full opacity-50" />

          <div className="relative text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
              className="text-8xl md:text-9xl mb-6"
            >
              {colors.emoji}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className={`text-7xl md:text-9xl font-bold font-serif mb-8 bg-gradient-to-b from-edo-indigo to-edo-gold bg-clip-text text-transparent`}
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {fortune}
            </motion.h1>

            {/* 縦書き運勢文 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="text-2xl md:text-3xl font-serif space-y-3 text-edo-indigo mb-8"
              style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
            >
              {colors.message.map((line, i) => (
                <div key={i} className="inline-block mr-4">{line}</div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* 水引（紅白の飾り紐） */}
      <div className="absolute top-1/3 left-8 z-15">
        <div className="w-2 h-24 bg-gradient-to-b from-red-500 via-white to-red-500" />
      </div>

      <div className="absolute top-1/3 right-8 z-15">
        <div className="w-2 h-24 bg-gradient-to-b from-red-500 via-white to-red-500" />
      </div>

      {/* 注連縄 */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-5 opacity-30">
        <div className="w-64 h-4 bg-yellow-600 rounded-full" />
      </div>

      {/* 次へボタン */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          onClick={handleNext}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-10 py-6 md:px-16 md:py-8 bg-gradient-to-r from-edo-gold to-yellow-400 text-edo-indigo font-bold text-xl md:text-2xl rounded-full border-4 border-yellow-300 shadow-[0_0_40px_rgba(212,175,55,0.8)] font-serif"
        >
          シェアする →
        </motion.button>
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

