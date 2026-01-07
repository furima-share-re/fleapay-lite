'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OmikujiMainPageFM() {
  const router = useRouter();
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [buttonCoins, setButtonCoins] = useState<Array<{ id: number; side: 'left' | 'right'; delay: number }>>([]);

  useEffect(() => {
    // 小判の位置をランダム生成
    const coinArray = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
    }));
    setCoins(coinArray);

    // ボタン周辺の小判（左右から浮かぶ）
    const coinButtonArray = [
      { id: 0, side: 'left' as const, delay: 0 },
      { id: 1, side: 'right' as const, delay: 0.3 },
    ];
    setButtonCoins(coinButtonArray);
  }, []);

  const handleDrawFortune = () => {
    router.push('/omikuji-fm/shake');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* 背景の青海波と雲のパターン */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="none">
          {/* 青海波パターン */}
          <g stroke="#FFD700" strokeWidth="1" fill="none" opacity="0.3">
            <path d="M0,200 Q50,150 100,200 T200,200 T300,200 T400,200" />
            <path d="M0,250 Q50,200 100,250 T200,250 T300,250 T400,250" />
            <path d="M0,300 Q50,250 100,300 T200,300 T300,300 T400,300" />
          </g>
          {/* 雲のパターン */}
          <g stroke="#FFD700" strokeWidth="0.5" fill="none" opacity="0.2">
            <path d="M50,100 Q60,90 70,100 T90,100 Q100,90 110,100" />
            <path d="M150,120 Q160,110 170,120 T190,120 Q200,110 210,120" />
            <path d="M250,80 Q260,70 270,80 T290,80 Q300,70 310,80" />
            <path d="M100,180 Q110,170 120,180 T140,180 Q150,170 160,180" />
            <path d="M200,160 Q210,150 220,160 T240,160 Q250,150 260,160" />
          </g>
        </svg>
      </div>

      {/* 背景の夜空と星 */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1],
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
      <div className="absolute inset-0 pointer-events-none z-5">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${15 + (i % 3) * 30}%`,
              left: `${10 + (i % 4) * 25}%`,
            }}
            animate={{
              scale: [0, 1.5, 2, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 0.5,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          >
            <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_30px_#FFD700]" />
            {[...Array(8)].map((_, j) => (
              <motion.div
                key={j}
                className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  transformOrigin: '0 0',
                }}
                animate={{
                  x: Math.cos((j * 45 * Math.PI) / 180) * 40,
                  y: Math.sin((j * 45 * Math.PI) / 180) * 40,
                  scale: [1, 0],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.5,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              />
            ))}
          </motion.div>
        ))}
      </div>

      {/* 上部の提灯（赤い提灯の列） */}
      <div className="absolute top-0 left-0 right-0 flex justify-center gap-2 md:gap-4 pt-2 md:pt-4 z-10 overflow-hidden">
        {[...Array(7)].map((_, i) => (
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
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-6 md:h-8 bg-red-800" />
            <div className="absolute -bottom-4 md:-bottom-6 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-300 rounded-full" />
          </motion.div>
        ))}
      </div>

      {/* タイトルとサブタイトル */}
      <div className="absolute top-12 md:top-16 left-1/2 transform -translate-x-1/2 text-center z-20">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wider">
          EDO ICHIBA
        </h1>
        <p className="text-white text-sm md:text-base font-medium">Omikuji Fortune-Telling</p>
      </div>

      {/* 背景の市場の屋台と人のシルエット */}
      <div className="absolute top-1/3 left-0 right-0 z-5 opacity-30">
        <div className="flex justify-around items-end h-32 md:h-40">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="relative">
              {/* 屋台のシルエット */}
              <div className="w-16 md:w-24 h-12 md:h-16 bg-black/40 rounded-t-lg" />
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-20 md:w-28 h-1 bg-black/30" />
              {/* 人のシルエット */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-4 h-8 bg-black/30 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 左右の暖簾（青海波パターンと金色のロゴ） */}
      <div className="absolute top-24 md:top-32 left-0 right-0 z-10">
        <div className="flex justify-between px-2 md:px-8">
          <div className="w-24 md:w-40 h-96 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden">
            {/* 青海波パターン */}
            <div className="absolute bottom-0 left-0 right-0 h-24 opacity-30">
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
            {/* 金色のロゴ（鳥居アイコン + EDO ICHIBA） */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
              {/* 鳥居アイコン */}
              <div className="mb-2 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-8 h-8 md:w-10 md:h-10 text-yellow-500"
                  fill="currentColor"
                >
                  {/* 鳥居の柱 */}
                  <rect x="8" y="12" width="1.5" height="8" />
                  <rect x="14.5" y="12" width="1.5" height="8" />
                  {/* 鳥居の横木 */}
                  <rect x="6" y="10" width="12" height="2" />
                  <rect x="7" y="8" width="10" height="1.5" />
                </svg>
              </div>
              {/* EDO ICHIBA テキスト */}
              <div className="text-yellow-500 text-[8px] md:text-xs font-bold tracking-wider">
                EDO ICHIBA
              </div>
            </div>
          </div>
          <div className="w-24 md:w-40 h-96 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden">
            {/* 青海波パターン */}
            <div className="absolute bottom-0 left-0 right-0 h-24 opacity-30">
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
            {/* 金色の楕円モチーフ */}
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-8 h-4 border border-yellow-500/50 rounded-full" />
            <div className="absolute top-2/3 left-1/2 transform -translate-x-1/2 w-6 h-3 border border-yellow-500/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* 「さあさあ、運試し！」の大きな文字 */}
      <div className="absolute top-32 md:top-40 left-1/2 transform -translate-x-1/2 z-30">
        <motion.div
          className="text-5xl md:text-7xl font-bold text-yellow-400"
          style={{
            textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.6), 0 4px 8px rgba(0,0,0,0.5)',
            WebkitTextStroke: '2px rgba(255,215,0,0.3)',
            WebkitTextFillColor: '#FFD700',
          }}
          animate={{
            textShadow: [
              '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.6), 0 4px 8px rgba(0,0,0,0.5)',
              '0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,215,0,0.8), 0 4px 8px rgba(0,0,0,0.5)',
              '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.6), 0 4px 8px rgba(0,0,0,0.5)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          さあさあ、運試し！
        </motion.div>
      </div>

      {/* おみくじ箱（詳細な装飾付き） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
        <div className="relative w-48 h-48 md:w-64 md:h-64">
          {/* 箱本体（赤茶色の木製） */}
          <div className="absolute inset-0 bg-[#8B4513] rounded-lg shadow-[0_0_40px_rgba(139,69,19,0.8)] border-4 border-yellow-600">
            {/* 金色の装飾枠 */}
            <div className="absolute inset-0 border-2 border-yellow-500/50 rounded-lg" />
            <div className="absolute inset-2 border border-yellow-400/30 rounded-md" />

            {/* 角の金色金属装飾 */}
            <div className="absolute top-1 left-1 w-6 h-6 border-t-2 border-l-2 border-yellow-500 rounded-tl-lg bg-yellow-600/20" />
            <div className="absolute top-1 right-1 w-6 h-6 border-t-2 border-r-2 border-yellow-500 rounded-tr-lg bg-yellow-600/20" />
            <div className="absolute bottom-1 left-1 w-6 h-6 border-b-2 border-l-2 border-yellow-500 rounded-bl-lg bg-yellow-600/20" />
            <div className="absolute bottom-1 right-1 w-6 h-6 border-b-2 border-r-2 border-yellow-500 rounded-br-lg bg-yellow-600/20" />

            {/* 前面のロック機構 */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-12 h-16 md:w-16 md:h-20">
              {/* ロック本体 */}
              <div className="absolute inset-0 bg-yellow-600 rounded-lg border-2 border-yellow-700 shadow-[0_0_10px_rgba(234,179,8,0.8)]">
                {/* 鍵穴 */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-4 bg-yellow-900 rounded-full" />
                {/* ロックの装飾 */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-yellow-700 rounded" />
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-yellow-700 rounded" />
              </div>
            </div>

            {/* ロープ（水平に巻かれている） */}
            <div className="absolute top-1/3 left-0 right-0 h-2">
              <div className="absolute inset-0 bg-[#654321] rounded-full shadow-inner">
                {/* ロープの質感 */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#654321] to-[#3e2723] rounded-full" />
                <div className="absolute top-0.5 left-0 right-0 h-0.5 bg-[#8B4513]/30 rounded-full" />
              </div>
            </div>
            <div className="absolute bottom-1/3 left-0 right-0 h-2">
              <div className="absolute inset-0 bg-[#654321] rounded-full shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-b from-[#654321] to-[#3e2723] rounded-full" />
                <div className="absolute top-0.5 left-0 right-0 h-0.5 bg-[#8B4513]/30 rounded-full" />
              </div>
            </div>

            {/* 鶴のモチーフと桜の花びら（SVG） */}
            <div className="absolute inset-4 opacity-40">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-yellow-500"
              >
                {/* 雲のモチーフ */}
                <path
                  d="M20,30 Q25,25 30,30 T40,30 Q45,25 50,30 T60,30"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  className="text-yellow-400"
                />
                <path
                  d="M60,50 Q65,45 70,50 T80,50 Q85,45 90,50"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  className="text-yellow-400"
                />
                {/* 鶴のシルエット（簡略化） */}
                <path
                  d="M50,40 L45,50 L50,60 L55,50 Z"
                  fill="currentColor"
                  className="text-white"
                />
                <circle
                  cx="50"
                  cy="35"
                  r="3"
                  fill="currentColor"
                  className="text-white"
                />
                {/* 桜の花びら */}
                <circle
                  cx="25"
                  cy="40"
                  r="2"
                  fill="currentColor"
                  className="text-pink-300"
                />
                <circle
                  cx="75"
                  cy="55"
                  r="2"
                  fill="currentColor"
                  className="text-pink-300"
                />
                <circle
                  cx="30"
                  cy="60"
                  r="2"
                  fill="currentColor"
                  className="text-pink-300"
                />
                <circle
                  cx="70"
                  cy="45"
                  r="2"
                  fill="currentColor"
                  className="text-pink-300"
                />
              </svg>
            </div>

            {/* 上面の円形の穴 */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-20 h-20 md:w-28 md:h-28 bg-black/40 rounded-full border-4 border-yellow-600/50 shadow-inner" />

            {/* 金色の光る効果 */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-yellow-600/20 via-transparent to-transparent rounded-lg"
              animate={{
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </div>
        </div>
      </div>

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
              {/* 小判の中央の文字 */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-yellow-900 text-[8px] md:text-xs font-bold">
                  {coin.id % 3 === 0 ? "大" : coin.id % 3 === 1 ? "吉" : "福"}
                </div>
              </div>
              {/* 小判の四角い穴 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-700/50 rounded-sm transform rotate-45" />
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

      {/* DRAW FORTUNE ボタン（楕円形、コインアイコン付き） */}
      <div className="absolute bottom-32 md:bottom-40 left-1/2 transform -translate-x-1/2 z-30">
        <div className="relative">
          {/* 左右から浮かぶ小判 */}
          {buttonCoins.map((coin) => (
            <motion.div
              key={coin.id}
              className="absolute top-1/2 transform -translate-y-1/2"
              style={{
                [coin.side]: coin.side === 'left' ? '-60px' : '-60px',
                right: coin.side === 'right' ? '-60px' : 'auto',
                left: coin.side === 'left' ? '-60px' : 'auto',
              }}
              animate={{
                x: coin.side === 'left' ? [0, 20, 0] : [0, -20, 0],
                y: [0, -10, 0],
                rotate: [0, 15, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: coin.delay,
              }}
            >
              <div className="relative w-10 h-10 md:w-12 md:h-12">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-[0_0_20px_rgba(234,179,8,1)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-700 rounded-sm transform rotate-45" />
                </div>
                <div className="absolute inset-0 bg-yellow-300/70 rounded-full blur-md" />
              </div>
            </motion.div>
          ))}

          {/* ボタン本体（長方形、金色のボーダー） */}
          <motion.button
            onClick={handleDrawFortune}
            className="relative px-8 py-3 md:px-12 md:py-4 bg-[#1B365D] border-4 border-yellow-600 rounded-lg text-yellow-500 font-bold text-base md:text-xl shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:shadow-[0_0_40px_rgba(234,179,8,0.8)] transition-all duration-300 hover:scale-105 active:scale-95"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              textShadow: '0 0 10px rgba(255,215,0,0.8)',
            }}
          >
            占い始める
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
        </div>
      </div>

      {/* ナビゲーションバー */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#1B365D] border-t-2 border-yellow-600/50 z-40">
        <div className="flex justify-around items-center h-16 px-4">
          <div className="text-yellow-600 text-2xl md:text-3xl cursor-pointer hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">
            ⛩
          </div>
          <div className="text-yellow-600 text-2xl md:text-3xl cursor-pointer hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">
            📜
          </div>
          <div className="text-yellow-600 text-2xl md:text-3xl cursor-pointer hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">
            🎭
          </div>
          <div className="text-yellow-600 text-2xl md:text-3xl cursor-pointer hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">
            ⚙️
          </div>
        </div>
      </div>
    </div>
  );
}

