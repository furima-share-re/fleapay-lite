'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Scene from './components/Scene';

export default function OmikujiMainPageR3F() {
  const router = useRouter();
  const [coins, setCoins] = useState<
    Array<{ id: number; position: [number, number, number]; text: string; delay: number }>
  >([]);

  useEffect(() => {
    // 小判の3D位置を生成
    const coinArray = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6 + 2,
        (Math.random() - 0.5) * 4,
      ] as [number, number, number],
      text: i % 3 === 0 ? '大' : i % 3 === 1 ? '吉' : '福',
      delay: Math.random() * 3,
    }));
    setCoins(coinArray);
  }, []);

  const handleDrawFortune = () => {
    router.push('/omikuji-r3f/shake');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#193e5b] to-[#0f2740]">
      {/* 背景の花火（2D） */}
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
        <p className="text-white/90 text-sm md:text-base">Omikuji Fortune-Telling (3D)</p>
      </motion.div>

      {/* 背景の市場の屋台と人のシルエット（画像推奨） */}
      {/* TODO: 背景画像を追加する場合は以下を使用
        <div className="absolute inset-0 z-0 opacity-30">
          <img src="/images/edo-market-background.png" alt="Edo Market" className="w-full h-full object-cover" />
        </div>
      */}

      {/* 暖簾 */}
      <div className="absolute top-32 left-0 right-0 z-10">
        <div className="flex justify-between px-4 md:px-8">
          <motion.div
            className="w-32 md:w-48 h-64 md:h-80 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px),
                repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 22px)
              `,
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
            {/* 青海波パターン（下部） */}
            <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                <path
                  d="M0,80 Q25,60 50,80 T100,80"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M0,90 Q25,70 50,90 T100,90"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>

            {/* 金色の紋章 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-yellow-500/50 rounded-full">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-500/50" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-1 bg-yellow-500/50" />
              <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-500/50 rounded-full" />
              <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-500/50 rounded-full" />
            </div>
          </motion.div>
          <motion.div
            className="w-32 md:w-48 h-64 md:h-80 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px),
                repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 22px)
              `,
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
            {/* 青海波パターン（下部） */}
            <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                <path
                  d="M0,80 Q25,60 50,80 T100,80"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M0,90 Q25,70 50,90 T100,90"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>

            {/* 金色の紋章 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-yellow-500/50 rounded-full">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-500/50" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-1 bg-yellow-500/50" />
              <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-500/50 rounded-full" />
              <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-500/50 rounded-full" />
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

      {/* 3Dおみくじ箱 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-[500px] z-30">
        <Scene showCoins={true} coins={coins} />
      </div>

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

