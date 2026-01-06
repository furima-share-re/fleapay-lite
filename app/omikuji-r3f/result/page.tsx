'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Scene from '../components/Scene';

type FortuneType = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶';

function OmikujiResultContentR3F() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fortune = (searchParams.get('fortune') || '大吉') as FortuneType;

  const [coins, setCoins] = useState<
    Array<{ id: number; position: [number, number, number]; text: string; delay: number }>
  >([]);
  const [fireworks, setFireworks] = useState<
    Array<{ id: number; position: [number, number, number]; color: string; delay: number }>
  >([]);

  useEffect(() => {
    // 小判が降り注ぐ（3D）
    const coinArray = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 12,
        8 + Math.random() * 2,
        (Math.random() - 0.5) * 6,
      ] as [number, number, number],
      text: i % 3 === 0 ? '大' : i % 3 === 1 ? '吉' : '福',
      delay: Math.random() * 3,
    }));
    setCoins(coinArray);

    // 花火の配置（3D）
    const fireworkArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 12,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 5,
      ] as [number, number, number],
      color: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FF6347' : '#FF69B4',
      delay: Math.random() * 2,
    }));
    setFireworks(fireworkArray);
  }, []);

  const fortuneColors: Record<FortuneType, string> = {
    大吉: 'from-red-500 to-red-700',
    中吉: 'from-orange-500 to-orange-700',
    小吉: 'from-yellow-500 to-yellow-700',
    吉: 'from-green-500 to-green-700',
    末吉: 'from-blue-500 to-blue-700',
    凶: 'from-gray-500 to-gray-700',
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* 背景の夜空 */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* 3D小判と花火 */}
      <div className="absolute inset-0 z-10">
        <Scene showCoins={true} showFireworks={true} coins={coins} fireworks={fireworks} />
      </div>

      {/* 結果カード */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
        initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <div
          className={`relative w-80 md:w-96 h-96 md:h-[500px] bg-gradient-to-br ${fortuneColors[fortune]} rounded-3xl shadow-2xl border-4 border-yellow-400 p-8 flex flex-col items-center justify-center`}
        >
          {/* 金色の装飾枠 */}
          <div className="absolute inset-2 border-2 border-yellow-300/50 rounded-2xl" />

          {/* 運勢テキスト */}
          <motion.div
            className="text-8xl md:text-9xl font-bold text-white mb-4 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            {fortune}
          </motion.div>

          {/* 説明テキスト */}
          <motion.p
            className="text-white/90 text-lg md:text-xl text-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {fortune === '大吉' && '素晴らしい運勢です！'}
            {fortune === '中吉' && '良い運勢です！'}
            {fortune === '小吉' && 'まずまずの運勢です。'}
            {fortune === '吉' && '平穏な運勢です。'}
            {fortune === '末吉' && '少し注意が必要です。'}
            {fortune === '凶' && '慎重に行動しましょう。'}
          </motion.p>

          {/* 装飾的な要素 */}
          <div className="absolute top-4 left-4 w-16 h-16 border-2 border-yellow-300/50 rounded-full" />
          <div className="absolute bottom-4 right-4 w-16 h-16 border-2 border-yellow-300/50 rounded-full" />
        </div>
      </motion.div>

      {/* 戻るボタン */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <motion.button
          onClick={() => router.push('/omikuji-r3f')}
          className="px-8 py-4 bg-[#1B365D] border-4 border-yellow-600 rounded-lg text-white font-bold text-lg shadow-[0_0_30px_rgba(234,179,8,0.6)]"
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 40px rgba(234,179,8,0.8)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          もう一度引く
        </motion.button>
      </motion.div>
    </div>
  );
}

export default function OmikujiResultPageR3F() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1B365D] flex items-center justify-center text-white">Loading...</div>}>
      <OmikujiResultContentR3F />
    </Suspense>
  );
}

