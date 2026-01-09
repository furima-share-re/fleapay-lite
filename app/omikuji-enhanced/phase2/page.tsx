'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Phase2Page() {
  const router = useRouter();
  const [coins, setCoins] = useState<
    Array<{ id: number; x: number; y: number; angle: number; delay: number }>
  >([]);
  const [kanji, setKanji] = useState<
    Array<{ id: number; text: string; x: number; y: number; delay: number }>
  >([]);

  useEffect(() => {
    // 小判15-20枚
    const coinArray = Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 4;
      const radius = 30 + (i / 18) * 250;
      return {
        id: i,
        x: 50 + (radius * Math.cos(angle)) / 10,
        y: 50 + (radius * Math.sin(angle)) / 10,
        angle: angle * (180 / Math.PI),
        delay: i * 0.05,
      };
    });
    setCoins(coinArray);

    // 浮遊する漢字「福」「縁」「吉」「祝」
    const kanjiArray = ['福', '縁', '吉', '祝', '福', '縁'].map((text, i) => ({
      id: i,
      text,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setKanji(kanjiArray);
  }, []);

  useEffect(() => {
    // 3秒後にPhase 3へ
    const timer = setTimeout(() => {
      router.push('/omikuji-enhanced/phase3');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-ghibli-cream via-white to-ghibli-cream">
      {/* 背景のジブリ風黄昏の光 */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-200/40 via-orange-100/30 to-purple-200/40 z-0" />

      {/* 伝統文様 - 青海波の螺旋パターン */}
      <div
        className="absolute inset-0 z-1 opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle, #2c4f6f 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      {/* 背景の花火パターン（菊花火、柳花火、牡丹花火） */}
      <div className="absolute inset-0 z-5 pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${Math.random() * 50}%`,
              left: `${Math.random() * 100}%`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 2, 3, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          >
            <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.8)]" />
          </motion.div>
        ))}
      </div>

      {/* ヘッダー */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-sm"
      >
        <button onClick={() => router.back()} className="text-edo-indigo text-xl font-bold">
          ←
        </button>
        <h1 className="text-edo-indigo font-bold text-sm md:text-base font-serif">
          江戸祭りの花火
        </h1>
        <div className="flex gap-2 text-edo-indigo text-sm">🎆</div>
      </motion.header>

      {/* 大きな「よーっ!」テキスト */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 text-center"
      >
        <motion.h2
          className="text-6xl md:text-8xl font-serif font-bold text-edo-vermilion drop-shadow-[0_0_30px_rgba(212,175,55,1)]"
          animate={{
            textShadow: [
              '0 0 20px rgba(212,175,55,0.8)',
              '0 0 40px rgba(212,175,55,1)',
              '0 0 20px rgba(212,175,55,0.8)',
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
            x: [-8, 8, -8],
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
            x: [8, -8, 8],
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

      {/* 中央のおみくじ箱（激しく揺れる） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          animate={{
            x: [-15, 15, -15],
            y: [0, -10, 0],
            rotate: [-8, 8, -8],
          }}
          transition={{
            duration: 0.2,
            repeat: Infinity,
          }}
          className="relative w-56 h-56 md:w-72 md:h-72 bg-gradient-to-br from-red-700 to-red-900 rounded-2xl shadow-2xl border-4 border-edo-gold"
        >
          <div className="absolute inset-0 p-6 flex items-center justify-center">
            <div className="text-8xl md:text-9xl">🎎</div>
          </div>
        </motion.div>
      </div>

      {/* 舞い上がる小判15-20枚 */}
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          initial={{ opacity: 0, scale: 0, x: '50%', y: '50%' }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 1.5],
            x: `${coin.x}%`,
            y: `${coin.y - 40}%`,
            rotate: coin.angle,
          }}
          transition={{
            duration: 2,
            delay: coin.delay,
            ease: 'easeOut',
          }}
          className="absolute z-15"
        >
          <div className="relative w-14 h-9 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-lg">
            <div className="absolute inset-0 flex items-center justify-center text-yellow-900 font-bold text-xs">
              {['両', '分'][coin.id % 2]}
            </div>
            {/* 家紋 */}
            <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-yellow-800 rounded-full opacity-60" />
            <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-800 rounded-full opacity-60" />
          </div>
        </motion.div>
      ))}

      {/* 祭り要素 - 狐面・鬼面 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute top-32 left-16 z-15 text-5xl"
      >
        🦊
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute top-32 right-16 z-15 text-5xl"
      >
        👹
      </motion.div>

      {/* 太鼓の音波 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
          transition={{
            duration: 1.5,
            delay: i * 0.3,
            repeat: Infinity,
          }}
          className="absolute top-40 left-1/2 transform -translate-x-1/2 z-10 w-32 h-32 border-4 border-edo-vermilion rounded-full"
        />
      ))}

      {/* 扇子、手毬、だるま、鈴 */}
      <motion.div
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="absolute bottom-32 left-20 z-15 text-4xl"
      >
        🪭
      </motion.div>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute bottom-32 right-20 z-15 text-4xl"
      >
        🎀
      </motion.div>
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute top-48 left-1/4 z-15 text-4xl"
      >
        🎎
      </motion.div>

      {/* 浮遊する漢字「福」「縁」「吉」「祝」 */}
      {kanji.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 50 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [`${item.y}%`, `${item.y - 30}%`],
            x: [`${item.x}%`, `${item.x + 10}%`],
          }}
          transition={{
            duration: 3,
            delay: item.delay,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="absolute z-15 text-6xl font-serif font-bold text-edo-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
          }}
        >
          {item.text}
        </motion.div>
      ))}

      {/* 中心から「縁」「福」の大きな書道が金色で爆発 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2, 2.5, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-15"
      >
        <div className="text-9xl font-serif font-bold text-edo-gold drop-shadow-[0_0_40px_rgba(212,175,55,1)]">
          縁
        </div>
      </motion.div>

      {/* 建築破片 - 木の柱、瓦、暖簾の布 */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            rotate: 360,
            x: Math.cos((i / 8) * Math.PI * 2) * 200,
            y: Math.sin((i / 8) * Math.PI * 2) * 200,
          }}
          transition={{
            duration: 2,
            delay: i * 0.1,
            repeat: Infinity,
          }}
          className="absolute top-1/2 left-1/2 z-10 w-8 h-16 bg-edo-indigo/60 rounded"
        />
      ))}

      {/* 光の輪 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2, 3], opacity: [0, 0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-4 border-yellow-400 rounded-full z-15"
      />

      {/* 比率バッジ */}
      <div className="absolute bottom-4 left-4 z-30 flex gap-2">
        <span className="px-3 py-1 bg-ghibli-forest text-white text-xs rounded-full">
          ジブリ 75%
        </span>
        <span className="px-3 py-1 bg-edo-vermilion text-white text-xs rounded-full">
          江戸 20%
        </span>
        <span className="px-3 py-1 bg-modern-neon text-white text-xs rounded-full">
          現代 5%
        </span>
      </div>
    </div>
  );
}
