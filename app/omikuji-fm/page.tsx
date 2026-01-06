'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OmikujiMainPageFM() {
  const router = useRouter();
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // 小判の位置をランダム生成
    const coinArray = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
    }));
    setCoins(coinArray);
  }, []);

  const handleDrawFortune = () => {
    router.push('/omikuji-fm/shake');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#193e5b] to-[#0f2740]">
      {/* 背景の花火 */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full opacity-40"
            style={{
              top: `${20 + i * 30}%`,
              left: `${10 + i * 40}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* 上部の提灯 */}
      <div className="absolute top-0 left-0 right-0 flex justify-center gap-4 pt-4 z-10">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="relative w-16 h-20"
            animate={{
              x: [0, -5, 5, 0],
              rotate: [0, -2, 2, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          >
            <div className="absolute inset-0 bg-red-600 rounded-t-full rounded-b-none shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-200 rounded-full"
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-8 bg-red-800" />
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-300 rounded-full" />
          </motion.div>
        ))}
      </div>

      {/* タイトル */}
      <motion.div
        className="absolute top-16 left-1/2 transform -translate-x-1/2 text-center z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          EDO ICHIBA
        </h1>
        <p className="text-white/90 text-sm md:text-base">Omikuji Fortune-Telling</p>
      </motion.div>

      {/* 暖簾 */}
      <div className="absolute top-32 left-0 right-0 z-10">
        <div className="flex justify-between px-4 md:px-8">
          <motion.div
            className="w-32 md:w-48 h-64 md:h-80 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px),
                                repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 22px)`,
            }}
            animate={{
              x: [0, -5, 5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/30 text-xs">波</div>
            </div>
          </motion.div>
          <motion.div
            className="w-32 md:w-48 h-64 md:h-80 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px),
                                repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 22px)`,
            }}
            animate={{
              x: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: 0.5,
              ease: 'easeInOut',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/30 text-xs">波</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 「運試し」の文字 */}
      <motion.div
        className="absolute top-40 left-1/2 transform -translate-x-1/2 z-30"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <motion.div
          className="text-6xl md:text-8xl font-bold text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
          animate={{
            textShadow: [
              '0 0 20px rgba(255,255,255,0.5)',
              '0 0 40px rgba(255,255,255,0.8)',
              '0 0 20px rgba(255,255,255,0.5)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          運試し
        </motion.div>
      </motion.div>

      {/* おみくじ箱 */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <div className="relative w-64 md:w-80 h-64 md:h-80">
          {/* 箱本体 */}
          <motion.div
            className="absolute inset-0 bg-red-700 rounded-lg shadow-[0_0_40px_rgba(220,38,38,0.6)] border-4 border-yellow-600"
            animate={{
              boxShadow: [
                '0 0 40px rgba(220,38,38,0.6)',
                '0 0 60px rgba(220,38,38,0.8)',
                '0 0 40px rgba(220,38,38,0.6)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            {/* 金の装飾 */}
            <div className="absolute inset-0 border-2 border-yellow-500/50 rounded-lg" />
            
            {/* 前面の鶴と桜の模様 */}
            <div className="absolute inset-4 flex items-center justify-center">
              <div className="text-white/20 text-4xl">🦅</div>
            </div>
            
            {/* 上面の円形の穴 */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-24 md:w-32 md:h-32 bg-black/40 rounded-full border-4 border-yellow-600/50 shadow-inner" />
            
            {/* 金色の光る効果 */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-yellow-600/20 to-transparent rounded-lg"
              animate={{
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* 浮遊する小判 */}
      <AnimatePresence>
        {coins.map((coin) => (
          <motion.div
            key={coin.id}
            className="absolute z-20"
            style={{
              left: `${coin.x}%`,
              top: `${coin.y}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3 + coin.delay,
              repeat: Infinity,
              delay: coin.delay,
              ease: 'easeInOut',
            }}
          >
            <div className="relative w-12 h-12 md:w-16 md:h-16">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-[0_0_15px_rgba(234,179,8,0.8)]"
                animate={{
                  boxShadow: [
                    '0 0 15px rgba(234,179,8,0.8)',
                    '0 0 25px rgba(234,179,8,1)',
                    '0 0 15px rgba(234,179,8,0.8)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-700 rounded-sm transform rotate-45" />
              </div>
              {/* 光る軌跡 */}
              <motion.div
                className="absolute inset-0 bg-yellow-300/50 rounded-full blur-sm"
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* DRAW FORTUNE ボタン */}
      <motion.div
        className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7 }}
      >
        <motion.button
          onClick={handleDrawFortune}
          className="relative px-12 py-4 md:px-16 md:py-5 bg-[#1B365D] border-4 border-yellow-600 rounded-lg text-white font-bold text-lg md:text-xl shadow-[0_0_30px_rgba(234,179,8,0.6)]"
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 40px rgba(234,179,8,0.8)',
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              '0 0 30px rgba(234,179,8,0.6)',
              '0 0 40px rgba(234,179,8,0.8)',
              '0 0 30px rgba(234,179,8,0.6)',
            ],
          }}
          transition={{
            boxShadow: {
              duration: 2,
              repeat: Infinity,
            },
          }}
        >
          DRAW FORTUNE
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.button>
      </motion.div>

      {/* ナビゲーションバー */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-[#1B365D]/90 border-t-2 border-yellow-600/50 z-40"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
      >
        <div className="flex justify-around items-center h-16 px-4">
          {['⛩', '📜', '🎭', '⚙️'].map((icon, i) => (
            <motion.div
              key={i}
              className="text-yellow-600 text-2xl cursor-pointer"
              whileHover={{ scale: 1.2, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
            >
              {icon}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

