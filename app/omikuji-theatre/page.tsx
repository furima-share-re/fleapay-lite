"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Sceneコンポーネントを動的インポート（SSRを回避）
const Scene = dynamic(() => import("./components/Scene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center text-white">
      Loading 3D Scene...
    </div>
  ),
});

export default function OmikujiMainPageTheatre() {
  const router = useRouter();
  const [coins, setCoins] = useState<
    Array<{
      id: number;
      position: [number, number, number];
      text: string;
      delay: number;
    }>
  >([]);
  const [buttonCoins, setButtonCoins] = useState<
    Array<{ id: number; side: "left" | "right"; delay: number }>
  >([]);
  const [enableTheatre, setEnableTheatre] = useState(true);
  const [enableLeva, setEnableLeva] = useState(
    process.env.NODE_ENV === "development"
  );
  const [stars, setStars] = useState<
    Array<{
      id: number;
      top: number;
      left: number;
      duration: number;
      delay: number;
    }>
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
      text: i % 3 === 0 ? "大" : i % 3 === 1 ? "吉" : "福",
      delay: Math.random() * 3,
    }));
    setCoins(coinArray);

    // ボタン周辺の小判（左右から浮かぶ）
    const coinButtonArray = [
      { id: 0, side: "left" as const, delay: 0 },
      { id: 1, side: "right" as const, delay: 0.3 },
    ];
    setButtonCoins(coinButtonArray);

    // 星の位置とアニメーション値を生成（一度だけ）
    const starArray = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 2,
    }));
    setStars(starArray);
  }, []);

  const handleDrawFortune = () => {
    router.push("/omikuji-theatre/shake");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* 背景の夜空と星 */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
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
                  transformOrigin: "0 0",
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

      {/* タイトルとサブタイトル */}
      <div className="absolute top-12 md:top-16 left-1/2 transform -translate-x-1/2 text-center z-20">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wider">
          EDO ICHIBA
        </h1>
        <p className="text-white text-sm md:text-base font-medium">
          Omikuji Fortune-Telling
        </p>
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
            textShadow:
              "0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)",
          }}
          animate={{
            textShadow: [
              "0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)",
              "0 0 30px rgba(255,255,255,0.7), 0 0 60px rgba(255,255,255,0.5)",
              "0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)",
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
      {process.env.NODE_ENV === "development" && (
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
                [coin.side]: coin.side === "left" ? "-60px" : "-60px",
                right: coin.side === "right" ? "-60px" : "auto",
                left: coin.side === "left" ? "-60px" : "auto",
              }}
              animate={{
                x: coin.side === "left" ? [0, 20, 0] : [0, -20, 0],
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
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
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
