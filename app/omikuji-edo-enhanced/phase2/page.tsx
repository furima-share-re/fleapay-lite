'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Phase2Page() {
  const router = useRouter();
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; angle: number; delay: number; text: string }>>([]);
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; delay: number; type: string }>>([]);

  useEffect(() => {
    // 小判15-20枚（「両」「分」の文字、家紋）
    const coinArray = Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 4;
      const radius = 30 + (i / 20) * 250;
      return {
        id: i,
        x: 50 + (radius * Math.cos(angle)) / 10,
        y: 50 + (radius * Math.sin(angle)) / 10,
        angle: angle * (180 / Math.PI),
        delay: i * 0.03,
        text: ['両', '分', '大吉', '福', '縁', '吉', '中吉'][i % 7],
      };
    });
    setCoins(coinArray);

    // 花火パターン（菊花火、柳花火、牡丹花火）
    const fireworkArray = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 10 + Math.random() * 40,
      delay: Math.random() * 2,
      type: ['kiku', 'yanagi', 'botan'][i % 3],
    }));
    setFireworks(fireworkArray);

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
      router.push(`/omikuji-edo-enhanced/phase3?fortune=${encodeURIComponent(randomFortune)}`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* 背景パターン */}
      <div className="absolute inset-0 opacity-20 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 30%, transparent 20%, rgba(255,215,0,0.1) 20%, rgba(255,215,0,0.1) 40%, transparent 40%),
              radial-gradient(circle at 70% 70%, transparent 20%, rgba(255,215,0,0.1) 20%, rgba(255,215,0,0.1) 40%, transparent 40%)
            `,
          }}
        />
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
        <h1 className="text-white font-bold text-sm md:text-base font-serif">EDO ICHIBA OMIKUJI</h1>
        <div className="flex gap-2 text-white text-sm">
          <span>📶</span>
          <span>🔋</span>
        </div>
      </motion.header>

      {/* 「よーっ!」テキスト */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 text-center"
      >
        <motion.h2
          className="text-6xl md:text-8xl font-bold text-white font-serif drop-shadow-[0_0_40px_rgba(255,215,0,1)]"
          animate={{
            textShadow: [
              '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.6)',
              '0 0 50px rgba(255,215,0,1), 0 0 100px rgba(255,215,0,0.8)',
              '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.6)',
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

      {/* 花火パターン - 菊花火、柳花火、牡丹花火 */}
      {fireworks.map((fw) => (
        <motion.div
          key={fw.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: fw.type === 'kiku' ? [0, 1.5, 2, 0] : fw.type === 'yanagi' ? [0, 1, 1.5, 0] : [0, 2, 2.5, 0],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: fw.type === 'kiku' ? 1.5 : fw.type === 'yanagi' ? 2 : 1,
            delay: fw.delay,
            repeat: Infinity,
            repeatDelay: 2,
          }}
          className="absolute z-5"
          style={{
            left: `${fw.x}%`,
            top: `${fw.y}%`,
          }}
        >
          <div className={`w-${fw.type === 'kiku' ? '8' : fw.type === 'yanagi' ? '6' : '10'} h-${fw.type === 'kiku' ? '8' : fw.type === 'yanagi' ? '6' : '10'} bg-yellow-400 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.8)]`} />
          {fw.type === 'yanagi' && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-1 h-16 bg-gradient-to-b from-yellow-400 to-transparent" />
          )}
        </motion.div>
      ))}

      {/* 浮遊する漢字「福」「縁」「吉」「祝」 */}
      {['福', '縁', '吉', '祝'].map((char, i) => (
        <motion.div
          key={char}
          initial={{ opacity: 0, y: 100, x: `${20 + i * 20}%` }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [100, -100, -150],
            x: [`${20 + i * 20}%`, `${25 + i * 20}%`, `${15 + i * 20}%`],
            rotate: [0, 360, 720],
          }}
          transition={{
            duration: 3,
            delay: i * 0.5,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="absolute z-15 text-6xl font-bold text-edo-gold font-serif"
          style={{
            textShadow: '0 0 20px rgba(255,215,0,0.8)',
          }}
        >
          {char}
        </motion.div>
      ))}

      {/* 中央のおみくじ箱（激しく揺れる） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          animate={{
            x: [-15, 15, -15, 15, -10, 10, 0],
            y: [0, -8, 0, 8, 0, -5, 0],
            rotate: [-8, 8, -8, 8, -5, 5, 0],
          }}
          transition={{
            duration: 0.15,
            repeat: Infinity,
          }}
          className="relative w-56 h-56 md:w-72 md:h-72 bg-red-700 rounded-lg shadow-2xl border-4 border-edo-gold"
        >
          <div className="absolute inset-0 p-6">
            <div className="h-full border-2 border-edo-gold rounded flex items-center justify-center">
              <div className="text-8xl">🎎</div>
            </div>
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
            scale: [0, 1, 1, 1.8],
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
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center text-sm font-bold text-yellow-900 border-2 border-yellow-300 font-serif">
            {coin.text}
          </div>
        </motion.div>
      ))}

      {/* 祭り要素 - 扇子、手毬、だるま、鈴 */}
      <div className="absolute bottom-32 left-16 z-10">
        <motion.div
          animate={{
            rotate: [0, -20, 20, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
          }}
          className="text-5xl"
        >
          🎋
        </motion.div>
      </div>

      <div className="absolute bottom-32 right-16 z-10">
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
          className="text-5xl"
        >
          🎎
        </motion.div>
      </div>

      {/* 光の輪と爆発エフェクト */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2, 4], opacity: [0, 0.6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border-4 border-edo-gold rounded-full z-15"
      />

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 3, 5], opacity: [0, 0.4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-4 border-yellow-400 rounded-full z-15"
      />
    </div>
  );
}

