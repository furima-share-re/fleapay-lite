'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function OmikujiMockMainPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // 背景に散らばる小判
    const coinArray = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setCoins(coinArray);
  }, []);

  const handleDrawFortune = () => {
    router.push('/omikuji-mock/shake');
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
              opacity: Math.random() * 0.8,
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
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            style={{
              top: `${10 + Math.random() * 30}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* 上部の提灯（7個） */}
      <div className="absolute top-0 left-0 right-0 flex justify-center gap-2 md:gap-4 pt-2 md:pt-4 z-10 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.div
            key={i}
            className="relative w-12 h-16 md:w-16 md:h-20"
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
              delay: i * 0.2,
            }}
          >
            <div className="absolute inset-0 bg-red-600 rounded-t-full rounded-b-none shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-200 rounded-full animate-pulse" />
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-6 md:h-8 bg-red-800" />
            <div className="absolute -bottom-4 md:-bottom-6 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-300 rounded-full" />
          </motion.div>
        ))}
      </div>

      {/* タイトル */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-12 md:top-16 left-1/2 transform -translate-x-1/2 text-center z-20"
      >
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wider">
          EDO ICHIBA
        </h1>
        <p className="text-white text-sm md:text-base font-medium">Omikuji Fortune-Telling</p>
      </motion.div>

      {/* 背景の散らばる小判 */}
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          className="absolute z-5"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: coin.delay,
          }}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center text-xs font-bold text-yellow-900">
            💰
          </div>
        </motion.div>
      ))}

      {/* 左右の暖簾 */}
      <div className="absolute left-0 top-1/4 bottom-1/4 w-24 md:w-32 z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="h-full bg-gradient-to-r from-red-700/90 to-red-800/70 border-r-4 border-yellow-400 flex flex-col items-center justify-center gap-4 p-4"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255, 215, 0, 0.1) 10px,
              rgba(255, 215, 0, 0.1) 20px
            )`,
          }}
        >
          <div className="text-white text-xs md:text-sm font-bold writing-vertical-rl">江戸市場</div>
        </motion.div>
      </div>

      <div className="absolute right-0 top-1/4 bottom-1/4 w-24 md:w-32 z-10">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="h-full bg-gradient-to-l from-red-700/90 to-red-800/70 border-l-4 border-yellow-400 flex flex-col items-center justify-center gap-4 p-4"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(255, 215, 0, 0.1) 10px,
              rgba(255, 215, 0, 0.1) 20px
            )`,
          }}
        >
          <div className="text-white text-xs md:text-sm font-bold writing-vertical-rl">縁日</div>
        </motion.div>
      </div>

      {/* 中央のおみくじ箱 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative"
        >
          {/* おみくじ箱本体 */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 bg-red-700 rounded-lg shadow-2xl border-4 border-yellow-400">
            {/* 装飾パターン */}
            <div className="absolute inset-0 p-4">
              <div className="h-full border-2 border-yellow-400 rounded flex items-center justify-center">
                <div className="text-6xl md:text-8xl">🎎</div>
              </div>
            </div>
            
            {/* ロック機構 */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-2 h-6 bg-yellow-700 rounded-full" />
            </div>
            
            {/* ロープ */}
            <div className="absolute top-0 left-1/4 w-16 h-1 bg-yellow-600 transform -translate-y-1/2" />
            <div className="absolute top-0 right-1/4 w-16 h-1 bg-yellow-600 transform -translate-y-1/2" />
          </div>

          {/* 大きな「運試し」テキスト */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 text-center"
          >
            <motion.h2
              className="text-4xl md:text-6xl font-bold text-white drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]"
              animate={{
                textShadow: [
                  '0 0 20px rgba(255,215,0,0.8)',
                  '0 0 30px rgba(255,215,0,1)',
                  '0 0 20px rgba(255,215,0,0.8)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              運試し
            </motion.h2>
          </motion.div>
        </motion.div>
      </div>

      {/* 市場の屋台と人のシルエット（簡略化） */}
      <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 z-5 opacity-30">
        <div className="h-full bg-gradient-to-t from-gray-900 to-transparent flex items-end justify-around px-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-12 h-12 md:w-16 md:h-16 bg-gray-700 rounded-t-full"
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
      </div>

      {/* ボタン */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          {/* 左右から浮かぶ小判 */}
          <div className="absolute -left-16 top-1/2 transform -translate-y-1/2">
            <motion.div
              animate={{
                x: [0, 10, 0],
                rotate: [0, 15, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center text-xl"
            >
              💰
            </motion.div>
          </div>

          <div className="absolute -right-16 top-1/2 transform -translate-y-1/2">
            <motion.div
              animate={{
                x: [0, -10, 0],
                rotate: [0, -15, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.3,
              }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center text-xl"
            >
              💰
            </motion.div>
          </div>

          {/* メインボタン */}
          <motion.button
            onClick={handleDrawFortune}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative px-8 py-4 md:px-12 md:py-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 font-bold text-xl md:text-2xl rounded-full border-4 border-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.6)] flex items-center gap-3"
          >
            <span>🎴</span>
            <span>占い始める</span>
            <span>🎴</span>
            <motion.div
              className="absolute inset-0 rounded-full bg-yellow-300 opacity-0"
              animate={{
                opacity: [0, 0.3, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.button>
        </motion.div>
      </div>

      {/* 下部ナビゲーションバー */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-around border-t border-yellow-400/30">
        {['⛩', '📜', '🎭', '⚙️'].map((icon, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className="text-2xl md:text-3xl"
          >
            {icon}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

