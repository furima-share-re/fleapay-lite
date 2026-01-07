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

function OmikujiResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fortune = (searchParams.get('fortune') || '大吉') as FortuneType;
  const [coins, setCoins] = useState<Array<{ id: number; x: number; delay: number }>>([]);
  const [petals, setPetals] = useState<Array<{ id: number; x: number; delay: number }>>([]);
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  const colors = fortuneColors[fortune] || fortuneColors['大吉'];

  useEffect(() => {
    // 小判30個
    const coinArray = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setCoins(coinArray);

    // 桜の花びら20個
    const petalArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
    }));
    setPetals(petalArray);

    // 花火20個
    const fireworkArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 50,
      delay: Math.random() * 2,
    }));
    setFireworks(fireworkArray);
  }, []);

  const handleRetry = () => {
    router.push('/omikuji-mock');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* 背景の夜空と星 */}
      <div className="absolute inset-0 z-0">
        {Array.from({ length: 50 }).map((_, i) => (
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

      {/* 降り注ぐ小判 */}
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          initial={{ y: -100, opacity: 0, x: `${coin.x}%` }}
          animate={{
            y: '100vh',
            opacity: [0, 1, 1, 0],
            rotate: 360,
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: coin.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute z-5"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center text-xs font-bold text-yellow-900">
            💰
          </div>
        </motion.div>
      ))}

      {/* 舞い散る桜の花びら */}
      {petals.map((petal) => (
        <motion.div
          key={petal.id}
          initial={{ y: -50, opacity: 0, x: `${petal.x}%`, rotate: 0 }}
          animate={{
            y: '100vh',
            opacity: [0, 1, 1, 0],
            x: [`${petal.x}%`, `${petal.x + 20}%`, `${petal.x - 20}%`, `${petal.x}%`],
            rotate: 360,
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            delay: petal.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute z-5"
        >
          <div className="text-2xl">🌸</div>
        </motion.div>
      ))}

      {/* 花火エフェクト */}
      {fireworks.map((firework) => (
        <motion.div
          key={firework.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.5, 2, 0],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: firework.delay,
            repeat: Infinity,
            repeatDelay: 3,
          }}
          className="absolute z-5"
          style={{
            left: `${firework.x}%`,
            top: `${firework.y}%`,
          }}
        >
          <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_20px_rgba(255,215,0,0.8)]" />
        </motion.div>
      ))}

      {/* 運勢カード */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className={`bg-gradient-to-br ${colors.from} ${colors.to} rounded-2xl shadow-2xl p-8 md:p-12 border-4 border-yellow-400 min-w-[280px] md:min-w-[400px]`}
        >
          <div className="text-center">
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
              className="text-6xl md:text-8xl font-bold text-white mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            >
              {fortune}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-white text-lg md:text-xl mt-6 space-y-2"
            >
              {fortune === '大吉' && (
                <>
                  <p>すべてがうまくいきます</p>
                  <p>新しい出会いがあります</p>
                  <p>願いが叶います</p>
                </>
              )}
              {fortune === '中吉' && (
                <>
                  <p>順調に進んでいます</p>
                  <p>良い知らせがあります</p>
                  <p>前向きに進みましょう</p>
                </>
              )}
              {fortune === '小吉' && (
                <>
                  <p>少しずつ良くなります</p>
                  <p>努力が実ります</p>
                  <p>明るい未来があります</p>
                </>
              )}
              {fortune === '吉' && (
                <>
                  <p>平穏な日々が続きます</p>
                  <p>穏やかな運気です</p>
                  <p>感謝の気持ちを持ちましょう</p>
                </>
              )}
              {fortune === '末吉' && (
                <>
                  <p>慎重に行動しましょう</p>
                  <p>時間をかけて考えます</p>
                  <p>小さな幸せがあります</p>
                </>
              )}
              {fortune === '凶' && (
                <>
                  <p>注意深く行動しましょう</p>
                  <p>周囲に気を配ります</p>
                  <p>慎重に判断します</p>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* 再挑戦ボタン */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          onClick={handleRetry}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 md:px-12 md:py-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 font-bold text-xl md:text-2xl rounded-full border-4 border-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.6)]"
        >
          もう一度引く
        </motion.button>
      </div>
    </div>
  );
}

export default function OmikujiResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">読み込み中...</div>}>
      <OmikujiResultContent />
    </Suspense>
  );
}

