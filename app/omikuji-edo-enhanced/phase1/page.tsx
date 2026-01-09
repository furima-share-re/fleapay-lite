'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Phase1Page() {
  const router = useRouter();
  const [elements, setElements] = useState({
    lanterns: Array.from({ length: 6 }),
    coins: Array.from({ length: 15 }),
    luckyItems: Array.from({ length: 8 }),
  });

  const handleStart = () => {
    router.push('/omikuji-edo-enhanced/phase2');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-ghibli-cream via-[#f5f1e8] to-white">
      {/* 背景パターン - 青海波、麻の葉、亀甲 */}
      <div className="absolute inset-0 opacity-10 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 20px, #d4af37 20px, #d4af37 21px),
              repeating-linear-gradient(-45deg, transparent, transparent 20px, #d4af37 20px, #d4af37 21px)
            `,
          }}
        />
      </div>

      {/* 江戸建築 - 町家、格子窓、瓦屋根 */}
      <div className="absolute top-0 left-0 right-0 h-32 z-5 opacity-20">
        <div className="flex justify-around items-end h-full">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="w-16 h-16 bg-edo-indigo rounded-t-lg"
              style={{
                backgroundImage: 'linear-gradient(to right, #2c4f6f 0%, #2c4f6f 10%, transparent 10%, transparent 15%, #2c4f6f 15%)',
              }}
            >
              <div className="w-full h-2 bg-edo-vermilion mt-2" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* 鳥居 */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-5 opacity-30">
        <div className="relative">
          <div className="w-32 h-4 bg-edo-vermilion" />
          <div className="absolute top-0 left-0 w-6 h-20 bg-edo-vermilion" />
          <div className="absolute top-0 right-0 w-6 h-20 bg-edo-vermilion" />
        </div>
      </div>

      {/* 提灯4-6個（「縁日」「福」「江戸」の漢字） */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10 flex gap-4">
        {['縁日', '福', '江戸', '縁', '福', '江戸'].slice(0, 6).map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="relative w-16 h-20"
            >
              <div className="absolute inset-0 bg-red-600 rounded-t-full rounded-b-none shadow-lg border-2 border-yellow-400" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold">
                {text}
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-6 bg-red-800" />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* EDO ICHIBA 看板 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-32 left-1/2 transform -translate-x-1/2 z-20 text-center"
      >
        <div className="bg-white/90 backdrop-blur-sm px-8 py-4 rounded-lg shadow-xl border-4 border-edo-gold">
          <h1 className="text-4xl md:text-6xl font-bold text-edo-indigo mb-2 font-serif">
            EDO ICHIBA
          </h1>
          <p className="text-edo-vermilion text-lg font-semibold">江戸市場</p>
        </div>
      </motion.div>

      {/* 小判12-15枚（「両」の文字、家紋、刻印） */}
      <div className="absolute inset-0 z-5">
        {elements.coins.map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            className="absolute"
            style={{
              left: `${10 + (i * 6)}%`,
              top: `${20 + (i % 3) * 15}%`,
            }}
          >
            <motion.div
              animate={{
                y: [0, -15, 0],
                rotate: [0, 10, 0],
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="relative w-16 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-300 shadow-lg"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-yellow-900 font-bold text-lg">両</span>
              </div>
              <div className="absolute top-1 left-2 w-2 h-2 bg-yellow-700 rounded-full" />
              <div className="absolute bottom-1 right-2 w-2 h-2 bg-yellow-700 rounded-full" />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* 縁起物 - 招き猫、だるま、手毬、扇子 */}
      <div className="absolute bottom-32 left-8 z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
          className="text-6xl"
        >
          🐱
        </motion.div>
      </div>

      <div className="absolute bottom-32 right-8 z-10">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2 }}
          className="text-6xl"
        >
          🎎
        </motion.div>
      </div>

      <div className="absolute bottom-48 left-1/4 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4 }}
          className="text-5xl"
        >
          🎴
        </motion.div>
      </div>

      <div className="absolute bottom-48 right-1/4 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6 }}
          className="text-5xl"
        >
          🎋
        </motion.div>
      </div>

      {/* 中央のおみくじ箱 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="relative"
        >
          <div className="relative w-56 h-56 md:w-72 md:h-72 bg-red-700 rounded-lg shadow-2xl border-4 border-edo-gold">
            {/* 装飾パターン */}
            <div className="absolute inset-0 p-6">
              <div className="h-full border-2 border-edo-gold rounded flex items-center justify-center">
                <div className="text-8xl">🎎</div>
              </div>
            </div>
            
            {/* ロック機構 */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-edo-gold rounded-full flex items-center justify-center shadow-lg border-4 border-yellow-300">
              <div className="w-3 h-10 bg-yellow-700 rounded-full" />
            </div>
            
            {/* ロープ */}
            <div className="absolute top-0 left-1/4 w-20 h-2 bg-yellow-600 transform -translate-y-1/2 rounded-full" />
            <div className="absolute top-0 right-1/4 w-20 h-2 bg-yellow-600 transform -translate-y-1/2 rounded-full" />
          </div>

          {/* 「運試し」テキスト */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute -top-24 left-1/2 transform -translate-x-1/2 text-center"
          >
            <motion.h2
              className="text-5xl md:text-7xl font-bold text-edo-indigo font-serif drop-shadow-lg"
              animate={{
                textShadow: [
                  '0 0 20px rgba(212, 175, 55, 0.8)',
                  '0 0 40px rgba(212, 175, 55, 1)',
                  '0 0 20px rgba(212, 175, 55, 0.8)',
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

      {/* ボタン */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          onClick={handleStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative px-10 py-6 md:px-16 md:py-8 bg-gradient-to-r from-edo-gold to-yellow-400 text-edo-indigo font-bold text-2xl md:text-3xl rounded-full border-4 border-yellow-300 shadow-[0_0_40px_rgba(212,175,55,0.8)] flex items-center gap-4 font-serif"
        >
          <span>🎴</span>
          <span>占い始める</span>
          <span>🎴</span>
        </motion.button>
      </div>
    </div>
  );
}

