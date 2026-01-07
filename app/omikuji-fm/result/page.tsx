'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type FortuneType = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶';

function OmikujiResultContentFM() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fortune = (searchParams.get('fortune') || '大吉') as FortuneType;
  
  const [coins, setCoins] = useState<Array<{ id: number; x: number; delay: number; speed: number }>>([]);
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);
  const [petals, setPetals] = useState<Array<{ id: number; x: number; delay: number; speed: number }>>([]);

  useEffect(() => {
    // 小判が降り注ぐ
    const coinArray = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      speed: 2 + Math.random() * 3,
    }));
    setCoins(coinArray);

    // 花火の配置
    const fireworkArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 60,
      color: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FF6347' : '#FF69B4',
      delay: Math.random() * 2,
    }));
    setFireworks(fireworkArray);

    // 桜の花びら
    const petalArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      speed: 3 + Math.random() * 4,
    }));
    setPetals(petalArray);
  }, []);

  const fortuneColors: Record<FortuneType, string> = {
    '大吉': 'from-red-500 to-red-700',
    '中吉': 'from-orange-500 to-orange-700',
    '小吉': 'from-yellow-500 to-yellow-700',
    '吉': 'from-green-500 to-green-700',
    '末吉': 'from-blue-500 to-blue-700',
    '凶': 'from-gray-500 to-gray-700',
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

      {/* 降り注ぐ小判 */}
      <AnimatePresence>
        {coins.map((coin) => (
          <motion.div
            key={coin.id}
            className="absolute z-10"
            style={{
              left: `${coin.x}%`,
            }}
            initial={{ y: -100, rotate: 0, opacity: 1 }}
            animate={{
              y: 'calc(100vh + 100px)',
              rotate: 360,
              opacity: [1, 1, 0.8],
            }}
            transition={{
              duration: coin.speed,
              delay: coin.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <div className="relative w-10 h-10 md:w-14 md:h-14">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-[0_0_20px_rgba(234,179,8,1)]"
                animate={{
                  rotate: 360,
                  boxShadow: [
                    '0 0 20px rgba(234,179,8,1)',
                    '0 0 30px rgba(234,179,8,1.2)',
                    '0 0 20px rgba(234,179,8,1)',
                  ],
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                  boxShadow: { duration: 1, repeat: Infinity },
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-700 rounded-sm transform rotate-45" />
              </div>
              <motion.div
                className="absolute inset-0 bg-yellow-300/70 rounded-full blur-md"
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 花火エフェクト */}
      <AnimatePresence>
        {fireworks.map((fw) => (
          <motion.div
            key={fw.id}
            className="absolute z-5"
            style={{
              left: `${fw.x}%`,
              top: `${fw.y}%`,
            }}
            animate={{
              scale: [0, 1.5, 2, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 1.5,
              delay: fw.delay,
              repeat: Infinity,
              repeatDelay: 0.5,
            }}
          >
            <motion.div
              className="w-6 h-6 rounded-full"
              style={{
                backgroundColor: fw.color,
              }}
              animate={{
                boxShadow: [
                  `0 0 30px ${fw.color}, 0 0 60px ${fw.color}`,
                  `0 0 50px ${fw.color}, 0 0 100px ${fw.color}`,
                  `0 0 30px ${fw.color}, 0 0 60px ${fw.color}`,
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: fw.color,
                  left: '50%',
                  top: '50%',
                }}
                animate={{
                  x: Math.cos((i * 30) * Math.PI / 180) * 80,
                  y: Math.sin((i * 30) * Math.PI / 180) * 80,
                  scale: [1, 0],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: fw.delay,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 桜の花びら */}
      <AnimatePresence>
        {petals.map((petal) => (
          <motion.div
            key={petal.id}
            className="absolute z-8"
            style={{
              left: `${petal.x}%`,
            }}
            initial={{ y: -50, x: 0, rotate: 0, opacity: 1 }}
            animate={{
              y: 'calc(100vh + 50px)',
              x: [0, 20, -20, 0],
              rotate: 360,
              opacity: [1, 0.8, 0],
            }}
            transition={{
              duration: petal.speed,
              delay: petal.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="text-3xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(255,192,203,0.6))' }}>
              🌸
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* メインコンテンツ */}
      <div className="relative z-30 min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* ユーザー写真スペース（上部） */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-yellow-600 shadow-[0_0_30px_rgba(234,179,8,0.8)] bg-gradient-to-br from-yellow-100 to-yellow-300 flex items-center justify-center overflow-hidden"
            animate={{
              boxShadow: [
                '0 0 30px rgba(234,179,8,0.8)',
                '0 0 50px rgba(234,179,8,1)',
                '0 0 30px rgba(234,179,8,0.8)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            <div className="text-4xl md:text-6xl">📸</div>
          </motion.div>
        </motion.div>

        {/* おみくじカード */}
        <motion.div
          className="relative w-full max-w-md mb-8"
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, type: 'spring', stiffness: 100 }}
        >
          {/* カード本体 */}
          <motion.div
            className={`relative bg-gradient-to-br ${fortuneColors[fortune]} rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-yellow-500`}
            animate={{
              boxShadow: [
                '0 0 50px rgba(0,0,0,0.5)',
                '0 0 70px rgba(0,0,0,0.7)',
                '0 0 50px rgba(0,0,0,0.5)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            {/* 金色の装飾枠 */}
            <div className="absolute inset-2 border-2 border-yellow-400/50 rounded-2xl" />
            
            {/* 伝統文様パターン */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px)`,
            }} />

            {/* 運勢 */}
            <div className="relative z-10 text-center">
              <motion.div
                className="text-6xl md:text-8xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.6, type: 'spring', stiffness: 200 }}
              >
                {fortune}
              </motion.div>
              
              {/* 装飾的な線 */}
              <motion.div
                className="flex items-center justify-center gap-4 mb-6"
                initial={{ width: 0 }}
                animate={{ width: 'auto' }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <div className="h-1 w-16 bg-yellow-400" />
                <motion.div
                  className="text-2xl"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  ✨
                </motion.div>
                <div className="h-1 w-16 bg-yellow-400" />
              </motion.div>

              {/* 説明文 */}
              <motion.div
                className="text-white/90 text-sm md:text-base leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1 }}
              >
                <p className="mb-2">あなたの運勢は最高です！</p>
                <p>素晴らしいことが待っています。</p>
              </motion.div>
            </div>

            {/* 桜の装飾 */}
            {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
              <motion.div
                key={i}
                className={`absolute ${pos} text-3xl opacity-60`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
              >
                🌸
              </motion.div>
            ))}
          </motion.div>

          {/* 光る効果 */}
          <motion.div
            className={`absolute inset-0 bg-gradient-to-br ${fortuneColors[fortune]} rounded-3xl opacity-30 blur-2xl`}
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        </motion.div>

        {/* アクションボタン */}
        <motion.div
          className="flex gap-4 z-30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <motion.button
            onClick={() => router.push('/omikuji-fm')}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.6)]"
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(234,179,8,0.8)' }}
            whileTap={{ scale: 0.95 }}
          >
            もう一度引く
          </motion.button>
          <motion.button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `EDO ICHIBA おみくじ結果: ${fortune}`,
                  text: `おみくじで${fortune}を引きました！`,
                });
              }
            }}
            className="px-6 py-3 bg-[#1B365D] hover:bg-[#193e5b] text-white font-bold rounded-lg border-2 border-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.6)]"
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(234,179,8,0.8)' }}
            whileTap={{ scale: 0.95 }}
          >
            SNSで共有
          </motion.button>
        </motion.div>
      </div>

      {/* フッター装飾 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-20" />
    </div>
  );
}

export default function OmikujiResultPageFM() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    }>
      <OmikujiResultContentFM />
    </Suspense>
  );
}


