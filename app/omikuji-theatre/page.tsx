'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Sceneコンポーネントを動的インポート（SSRを回避）
const Scene = dynamic(() => import('./components/Scene'), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] flex items-center justify-center text-white">Loading 3D Scene...</div>,
});

export default function OmikujiMainPageTheatre() {
  const router = useRouter();
  const [coins, setCoins] = useState<
    Array<{ id: number; position: [number, number, number]; text: string; delay: number }>
  >([]);
  const [enableTheatre, setEnableTheatre] = useState(true);
  const [enableLeva, setEnableLeva] = useState(process.env.NODE_ENV === 'development');

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
    router.push('/omikuji-theatre/shake');
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

      {/* タイトルとサブタイトル */}
      <div className="absolute top-12 md:top-16 left-1/2 transform -translate-x-1/2 text-center z-20">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wider">
          EDO ICHIBA
        </h1>
        <p className="text-white text-sm md:text-base font-medium">Omikuji Fortune-Telling</p>
      </div>

      {/* 左右の暖簾（青海波パターンと金色の楕円） */}
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
            {/* 金色の楕円モチーフ */}
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-8 h-4 border border-yellow-500/50 rounded-full" />
            <div className="absolute top-2/3 left-1/2 transform -translate-x-1/2 w-6 h-3 border border-yellow-500/50 rounded-full" />
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

      {/* 「運試し」の大きな文字 */}
      <div className="absolute top-32 md:top-40 left-1/2 transform -translate-x-1/2 z-30">
        <motion.div
          className="text-7xl md:text-9xl font-bold text-white"
          style={{
            textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
          }}
          animate={{
            textShadow: [
              '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
              '0 0 30px rgba(255,255,255,0.7), 0 0 60px rgba(255,255,255,0.5)',
              '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          運試し
        </motion.div>
      </div>

      {/* 3Dおみくじ箱（Theatre.js + Leva統合） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-[500px] z-30">
        <Scene
          showCoins={true}
          coins={coins}
          enableTheatre={enableTheatre}
          enableLeva={enableLeva}
        />
      </div>

      {/* デバッグコントロール（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-20 right-4 z-50 bg-black/50 p-2 rounded text-white text-xs">
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={enableTheatre}
              onChange={(e) => setEnableTheatre(e.target.checked)}
            />
            Theatre.js
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enableLeva}
              onChange={(e) => setEnableLeva(e.target.checked)}
            />
            Leva
          </label>
        </div>
      )}

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

          {/* ボタン本体 */}
          <motion.button
            onClick={handleDrawFortune}
            className="relative px-10 py-4 md:px-14 md:py-5 bg-[#1B365D] border-4 border-yellow-600 rounded-full text-white font-bold text-base md:text-xl shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:shadow-[0_0_40px_rgba(234,179,8,0.8)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            DRAW FORTUNE
            {/* コインアイコン */}
            <div className="relative w-5 h-5 md:w-6 md:h-6">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border border-yellow-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-yellow-700 rounded-sm transform rotate-45" />
              </div>
            </div>
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

