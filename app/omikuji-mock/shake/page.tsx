'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OmikujiMockShakePage() {
  const router = useRouter();
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; angle: number; delay: number }>>([]);

  useEffect(() => {
    // 50個の小判を螺旋状に配置
    const coinArray = Array.from({ length: 50 }, (_, i) => {
      const angle = (i / 50) * Math.PI * 4; // 2回転
      const radius = 20 + (i / 50) * 200;
      return {
        id: i,
        x: 50 + (radius * Math.cos(angle)) / 10,
        y: 50 + (radius * Math.sin(angle)) / 10,
        angle: angle * (180 / Math.PI),
        delay: i * 0.05,
      };
    });
    setCoins(coinArray);

    // 3秒後に結果ページへ
    const timer = setTimeout(() => {
      const fortunes: Array<'大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶'> = [
        '大吉',
        '中吉',
        '小吉',
        '吉',
        '末吉',
        '凶',
      ];
      const randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
      router.push(`/omikuji-mock/result?fortune=${encodeURIComponent(randomFortune)}`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

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

      {/* 背景の花火（金色） */}
      <div className="absolute inset-0 z-5 pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 bg-yellow-400 rounded-full"
            style={{
              top: `${10 + Math.random() * 30}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 3, 1],
              opacity: [0.5, 1, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* ヘッダー */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-sm"
      >
        <button onClick={() => router.back()} className="text-white text-xl">
          ←
        </button>
        <h1 className="text-white font-bold text-sm md:text-base">EDO ICHIBA OMIKUJI</h1>
        <div className="flex gap-2 text-white text-sm">
          <span>📶</span>
          <span>🔋</span>
        </div>
      </motion.header>

      {/* 大きな「よーっ!」テキスト */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 text-center"
      >
        <motion.h2
          className="text-5xl md:text-7xl font-bold text-white drop-shadow-[0_0_30px_rgba(255,215,0,1)]"
          animate={{
            textShadow: [
              '0 0 20px rgba(255,215,0,0.8)',
              '0 0 40px rgba(255,215,0,1)',
              '0 0 20px rgba(255,215,0,0.8)',
            ],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          よーっ!
        </motion.h2>
      </motion.div>

      {/* 左右の暖簾（揺れる） */}
      <div className="absolute left-0 top-1/4 bottom-1/4 w-24 md:w-32 z-10">
        <motion.div
          animate={{
            x: [-5, 5, -5],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
          }}
          className="h-full bg-gradient-to-r from-red-700/90 to-red-800/70 border-r-4 border-yellow-400 flex flex-col items-center justify-center gap-4 p-4"
        >
          <div className="text-white text-xs md:text-sm font-bold writing-vertical-rl">江戸市場</div>
        </motion.div>
      </div>

      <div className="absolute right-0 top-1/4 bottom-1/4 w-24 md:w-32 z-10">
        <motion.div
          animate={{
            x: [5, -5, 5],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
          }}
          className="h-full bg-gradient-to-l from-red-700/90 to-red-800/70 border-l-4 border-yellow-400 flex flex-col items-center justify-center gap-4 p-4"
        >
          <div className="text-white text-xs md:text-sm font-bold writing-vertical-rl">縁日</div>
        </motion.div>
      </div>

      {/* 中央のおみくじ箱（揺れる） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          animate={{
            x: [-10, 10, -10],
            y: [0, -5, 0],
            rotate: [-5, 5, -5],
          }}
          transition={{
            duration: 0.2,
            repeat: Infinity,
          }}
          className="relative w-48 h-48 md:w-64 md:h-64 bg-red-700 rounded-lg shadow-2xl border-4 border-yellow-400"
        >
          <div className="absolute inset-0 p-4">
            <div className="h-full border-2 border-yellow-400 rounded flex items-center justify-center">
              <div className="text-6xl md:text-8xl">🎎</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 右下から伸びる手 */}
      <motion.div
        initial={{ opacity: 0, x: 100, y: 100 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-32 right-16 z-15"
      >
        <motion.div
          animate={{
            x: [0, 10, 0],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
          }}
          className="relative w-20 h-32"
        >
          <div className="absolute inset-0 bg-red-800 rounded-full blur-sm" />
          <div className="absolute inset-2 bg-red-700 rounded-full">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-yellow-600 rounded-full" />
          </div>
        </motion.div>
      </motion.div>

      {/* 舞い上がる小判 */}
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          initial={{ opacity: 0, scale: 0, x: '50%', y: '50%' }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 1.5],
            x: `${coin.x}%`,
            y: `${coin.y - 30}%`,
            rotate: coin.angle,
          }}
          transition={{
            duration: 2,
            delay: coin.delay,
            ease: 'easeOut',
          }}
          className="absolute z-15"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center text-xs font-bold text-yellow-900 border-2 border-yellow-300">
            {['大吉', '福', '吉', '中吉', '小吉'][coin.id % 5]}
          </div>
        </motion.div>
      ))}

      {/* 光の輪 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2, 3], opacity: [0, 0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-4 border-yellow-400 rounded-full z-15"
      />

      {/* Shake to Reveal ボタン */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
          className="text-white text-center"
        >
          <div className="text-2xl mb-2">
            <motion.span
              animate={{ x: [-5, 5, -5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ((
            </motion.span>
            <span className="mx-4">Shake to Reveal!</span>
            <motion.span
              animate={{ x: [5, -5, 5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ))
            </motion.span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

