'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Phase2Page() {
  const router = useRouter();
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; angle: number; delay: number; text: string }>>([]);
  const [kanji, setKanji] = useState<Array<{ id: number; x: number; y: number; text: string; delay: number }>>([]);

  useEffect(() => {
    // 小判15-20枚（螺旋状）
    const coinArray = Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 4;
      const radius = 30 + (i / 18) * 250;
      return {
        id: i,
        x: 50 + (radius * Math.cos(angle)) / 10,
        y: 50 + (radius * Math.sin(angle)) / 10,
        angle: angle * (180 / Math.PI),
        delay: i * 0.04,
        text: ['両', '分', '両', '分'][i % 4],
      };
    });
    setCoins(coinArray);

    // 浮遊する漢字「福」「縁」「吉」「祝」
    const kanjiArray = ['福', '縁', '吉', '祝', '福', '縁'].map((text, i) => ({
      id: i,
      x: 20 + (i % 3) * 30,
      y: 20 + Math.floor(i / 3) * 30,
      text,
      delay: i * 0.3,
    }));
    setKanji(kanjiArray);

    // 3秒後に結果ページへ
    const timer = setTimeout(() => {
      router.push('/omikuji-enhanced/phase3');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* 背景のジブリ風夜空 */}
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

      {/* 伝統花火パターン - 菊花火、柳花火、牡丹花火 */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute z-5"
          style={{
            left: `${20 + (i % 4) * 20}%`,
            top: `${15 + Math.floor(i / 4) * 30}%`,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 2, 3, 0],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          {/* 菊花火 */}
          <div className="w-8 h-8 border-4 border-yellow-400 rounded-full">
            <div className="absolute inset-0 border-2 border-yellow-300 rounded-full m-2" />
            <div className="absolute inset-0 border border-yellow-200 rounded-full m-4" />
          </div>
        </motion.div>
      ))}

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
          className="text-6xl md:text-8xl font-serif font-bold text-white drop-shadow-[0_0_40px_rgba(255,215,0,1)]"
          animate={{
            textShadow: [
              '0 0 20px rgba(255,215,0,0.8)',
              '0 0 50px rgba(255,215,0,1)',
              '0 0 20px rgba(255,215,0,0.8)',
            ],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          よーっ!
        </motion.h2>
      </motion.div>

      {/* 左右の暖簾（激しく揺れる） */}
      <div className="absolute left-0 top-1/4 bottom-1/4 w-24 md:w-32 z-10">
        <motion.div
          animate={{
            x: [-10, 10, -10],
          }}
          transition={{
            duration: 0.2,
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
            x: [10, -10, 10],
          }}
          transition={{
            duration: 0.2,
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
            y: [0, -8, 0],
            rotate: [-8, 8, -8],
          }}
          transition={{
            duration: 0.15,
            repeat: Infinity,
          }}
          className="relative w-56 h-56 md:w-72 md:h-72 bg-gradient-to-br from-red-700 to-red-900 rounded-2xl shadow-2xl border-4 border-edo-gold"
        >
          <div className="absolute inset-0 p-6 flex items-center justify-center">
            <div className="text-8xl md:text-9xl">🎎</div>
          </div>
        </motion.div>
      </div>

      {/* 書道爆発 - 中心から「縁」「福」が金色で爆発 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-15">
        {['縁', '福'].map((text, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.5, 2, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 1.5,
              delay: 0.5 + i * 0.3,
              repeat: Infinity,
              repeatDelay: 2,
            }}
            className="absolute text-6xl md:text-8xl font-serif font-bold text-edo-gold"
            style={{
              transform: `translate(${i === 0 ? '-50%' : '50%'}, -50%) rotate(${i * 45}deg)`,
            }}
          >
            {text}
          </motion.div>
        ))}
      </div>

      {/* 建築破片 - 木の柱、瓦、暖簾の布 */}
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            y: [0, -100],
            rotate: 360,
            x: [0, (Math.random() - 0.5) * 100],
          }}
          transition={{
            duration: 2,
            delay: i * 0.2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="absolute z-10"
          style={{
            left: `${40 + Math.random() * 20}%`,
            bottom: `${10 + Math.random() * 20}%`,
          }}
        >
          <div className="w-12 h-4 bg-amber-800 rounded" />
        </motion.div>
      ))}

      {/* 祭り要素 - 狐面、扇子、鈴 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-32 right-8 z-15"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-6xl"
        >
          🎭
        </motion.div>
      </motion.div>

      {/* 浮遊する漢字 */}
      {kanji.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 100 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [100, -50],
            scale: [0.5, 1.5, 1],
          }}
          transition={{
            duration: 2,
            delay: item.delay,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="absolute z-15 text-5xl md:text-7xl font-serif font-bold text-edo-gold"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
          }}
        >
          {item.text}
        </motion.div>
      ))}

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
            duration: 2.5,
            delay: coin.delay,
            ease: 'easeOut',
          }}
          className="absolute z-15"
        >
          <div className="relative w-12 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-lg">
            <div className="absolute inset-0 flex items-center justify-center text-yellow-900 font-bold text-xs">
              {coin.text}
            </div>
          </div>
        </motion.div>
      ))}

      {/* 光の輪 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2.5, 4], opacity: [0, 0.6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-4 border-yellow-400 rounded-full z-15"
      />

      {/* 比率バッジ */}
      <div className="absolute bottom-4 left-4 z-30 flex gap-2">
        <span className="px-3 py-1 bg-ghibli-forest text-white text-xs rounded-full">ジブリ 75%</span>
        <span className="px-3 py-1 bg-edo-vermilion text-white text-xs rounded-full">江戸 20%</span>
        <span className="px-3 py-1 bg-modern-neon text-white text-xs rounded-full">現代 5%</span>
      </div>
    </div>
  );
}

