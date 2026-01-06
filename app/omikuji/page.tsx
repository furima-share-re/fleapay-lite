'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OmikujiMainPage() {
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
    router.push('/omikuji/shake');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#193e5b] to-[#0f2740]">
      {/* 背景の花火 */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full opacity-40 animate-ping"
            style={{
              top: `${20 + i * 30}%`,
              left: `${10 + i * 40}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: '3s',
            }}
          />
        ))}
      </div>

      {/* 上部の提灯 */}
      <div className="absolute top-0 left-0 right-0 flex justify-center gap-4 pt-4 z-10">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="relative w-16 h-20"
            style={{
              animation: `sway 3s ease-in-out infinite ${i * 0.2}s`,
            }}
          >
            <div className="absolute inset-0 bg-red-600 rounded-t-full rounded-b-none shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-200 rounded-full animate-pulse" />
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-8 bg-red-800" />
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-300 rounded-full" />
          </div>
        ))}
      </div>

      {/* タイトル */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-center z-20">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          EDO ICHIBA
        </h1>
        <p className="text-white/90 text-sm md:text-base">Omikuji Fortune-Telling</p>
      </div>

      {/* 暖簾 */}
      <div className="absolute top-32 left-0 right-0 z-10">
        <div className="flex justify-between px-4 md:px-8">
          <div
            className="w-32 md:w-48 h-64 md:h-80 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px),
                                repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 22px)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/30 text-xs">波</div>
            </div>
          </div>
          <div
            className="w-32 md:w-48 h-64 md:h-80 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px),
                                repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 22px)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/30 text-xs">波</div>
            </div>
          </div>
        </div>
      </div>

      {/* 「運試し」の文字 */}
      <div className="absolute top-40 left-1/2 transform -translate-x-1/2 z-30">
        <div className="text-6xl md:text-8xl font-bold text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
          運試し
        </div>
      </div>

      {/* おみくじ箱 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
        <div className="relative w-64 md:w-80 h-64 md:h-80">
          {/* 箱本体 */}
          <div className="absolute inset-0 bg-red-700 rounded-lg shadow-[0_0_40px_rgba(220,38,38,0.6)] border-4 border-yellow-600">
            {/* 金の装飾 */}
            <div className="absolute inset-0 border-2 border-yellow-500/50 rounded-lg" />
            
            {/* 前面の鶴と桜の模様 */}
            <div className="absolute inset-4 flex items-center justify-center">
              <div className="text-white/20 text-4xl">🦅</div>
            </div>
            
            {/* 上面の円形の穴 */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-24 md:w-32 md:h-32 bg-black/40 rounded-full border-4 border-yellow-600/50 shadow-inner" />
            
            {/* 金色の光る効果 */}
            <div className="absolute inset-0 bg-gradient-to-t from-yellow-600/20 to-transparent rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* 浮遊する小判 */}
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute z-20"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
            animation: `float ${3 + coin.delay}s ease-in-out infinite ${coin.delay}s`,
          }}
        >
          <div className="relative w-12 h-12 md:w-16 md:h-16">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-700 rounded-sm transform rotate-45" />
            </div>
            {/* 光る軌跡 */}
            <div className="absolute inset-0 bg-yellow-300/50 rounded-full blur-sm animate-pulse" />
          </div>
        </div>
      ))}

      {/* DRAW FORTUNE ボタン */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-30">
        <button
          onClick={handleDrawFortune}
          className="relative px-12 py-4 md:px-16 md:py-5 bg-[#1B365D] border-4 border-yellow-600 rounded-lg text-white font-bold text-lg md:text-xl shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:shadow-[0_0_40px_rgba(234,179,8,0.8)] transition-all duration-300 hover:scale-105 active:scale-95"
        >
          DRAW FORTUNE
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
        </button>
      </div>

      {/* ナビゲーションバー */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#1B365D]/90 border-t-2 border-yellow-600/50 z-40">
        <div className="flex justify-around items-center h-16 px-4">
          <div className="text-yellow-600 text-2xl cursor-pointer hover:scale-110 transition-transform">⛩</div>
          <div className="text-yellow-600 text-2xl cursor-pointer hover:scale-110 transition-transform">📜</div>
          <div className="text-yellow-600 text-2xl cursor-pointer hover:scale-110 transition-transform">🎭</div>
          <div className="text-yellow-600 text-2xl cursor-pointer hover:scale-110 transition-transform">⚙️</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes sway {
          0%, 100% {
            transform: translateX(0) rotate(0deg);
          }
          25% {
            transform: translateX(-5px) rotate(-2deg);
          }
          75% {
            transform: translateX(5px) rotate(2deg);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

