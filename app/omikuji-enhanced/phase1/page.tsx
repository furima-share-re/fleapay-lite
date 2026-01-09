"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Phase1Page() {
  const router = useRouter();
  const [coins, setCoins] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);

  useEffect(() => {
    // 小判12-15枚
    const coinArray = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 40 + Math.random() * 40,
      delay: Math.random() * 2,
    }));
    setCoins(coinArray);
  }, []);

  const handleStart = () => {
    router.push("/omikuji-enhanced/phase2");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-ghibli-cream via-white to-ghibli-cream">
      {/* 背景のジブリ風黄昏の光 */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-200/30 via-orange-100/20 to-purple-200/30 z-0" />

      {/* 江戸建築 - 町家のシルエット */}
      <div className="absolute bottom-0 left-0 right-0 h-64 z-5 opacity-20">
        <div className="h-full flex items-end justify-around px-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="w-16 h-32 bg-edo-indigo/40 rounded-t-lg relative"
              style={{
                clipPath: "polygon(0% 100%, 20% 0%, 80% 0%, 100% 100%)",
              }}
            >
              {/* 格子窓 */}
              <div className="absolute top-8 left-2 right-2 h-12 border-2 border-edo-indigo/60 grid grid-cols-3 gap-1" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* 瓦屋根のテクスチャ */}
      <div className="absolute top-0 left-0 right-0 h-32 z-5 opacity-10">
        <div className="h-full flex gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex-1 bg-edo-indigo rounded-b-full" />
          ))}
        </div>
      </div>

      {/* 伝統文様 - 青海波パターン（背景） */}
      <div
        className="absolute inset-0 z-1 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 20px,
            #2c4f6f 20px,
            #2c4f6f 22px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 20px,
            #2c4f6f 20px,
            #2c4f6f 22px
          )`,
        }}
      />

      {/* 提灯4-6個（漢字入り） */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-20">
        {["縁日", "福", "江戸", "縁日", "福"].map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="relative w-16 h-24"
          >
            <div className="absolute inset-0 bg-red-600 rounded-t-full rounded-b-none shadow-lg border-2 border-yellow-400" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold">
              {text}
            </div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-red-800" />
          </motion.div>
        ))}
      </div>

      {/* 鳥居 */}
      <div className="absolute top-20 left-1/4 z-10 opacity-30">
        <div className="w-24 h-32">
          <div className="w-full h-4 bg-edo-indigo rounded-t-lg" />
          <div className="absolute top-4 left-0 right-0 h-20 border-l-8 border-r-8 border-t-8 border-edo-indigo" />
        </div>
      </div>

      <div className="absolute top-20 right-1/4 z-10 opacity-30">
        <div className="w-24 h-32">
          <div className="w-full h-4 bg-edo-indigo rounded-t-lg" />
          <div className="absolute top-4 left-0 right-0 h-20 border-l-8 border-r-8 border-t-8 border-edo-indigo" />
        </div>
      </div>

      {/* タイトル */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-32 left-1/2 transform -translate-x-1/2 text-center z-20"
      >
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-edo-indigo mb-2 drop-shadow-lg">
          EDO ICHIBA
        </h1>
        <p className="text-xl md:text-2xl text-edo-vermilion font-semibold">
          江戸縁日・旅みくじ
        </p>
      </motion.div>

      {/* 縁起物 - 招き猫、だるま、手毬、扇子 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-15">
        {/* 招き猫 */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -left-32 top-0 text-6xl"
        >
          🐱
        </motion.div>

        {/* だるま */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="absolute -right-32 top-0 text-6xl"
        >
          🎎
        </motion.div>

        {/* 手毬 */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="absolute -left-20 -bottom-10 text-5xl"
        >
          🎀
        </motion.div>

        {/* 扇子 */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1 }}
          className="absolute -right-20 -bottom-10 text-5xl"
        >
          🪭
        </motion.div>
      </div>

      {/* 中央のおみくじ箱 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative"
        >
          <div className="relative w-56 h-56 md:w-72 md:h-72 bg-gradient-to-br from-red-700 to-red-900 rounded-2xl shadow-2xl border-4 border-edo-gold p-4">
            {/* 装飾パターン - 麻の葉 */}
            <div className="absolute inset-0 opacity-20">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                  60deg,
                  transparent,
                  transparent 10px,
                  #d4af37 10px,
                  #d4af37 11px
                ),
                repeating-linear-gradient(
                  -60deg,
                  transparent,
                  transparent 10px,
                  #d4af37 10px,
                  #d4af37 11px
                )`,
                }}
              />
            </div>

            <div className="absolute inset-0 p-6 flex items-center justify-center">
              <div className="text-8xl md:text-9xl">🎴</div>
            </div>

            {/* ロック機構 */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-edo-gold to-yellow-600 rounded-full flex items-center justify-center shadow-lg border-2 border-yellow-300">
              <div className="w-3 h-8 bg-yellow-800 rounded-full" />
            </div>

            {/* ロープ */}
            <div className="absolute top-0 left-1/4 w-20 h-1 bg-gradient-to-r from-yellow-600 to-yellow-800 transform -translate-y-1/2 rounded-full" />
            <div className="absolute top-0 right-1/4 w-20 h-1 bg-gradient-to-r from-yellow-800 to-yellow-600 transform -translate-y-1/2 rounded-full" />

            {/* 書道「おみくじ」 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-2xl font-serif font-bold">
              おみくじ
            </div>
          </div>

          {/* 大きな「運試し」テキスト */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute -top-24 left-1/2 transform -translate-x-1/2 text-center"
          >
            <motion.h2
              className="text-5xl md:text-7xl font-serif font-bold text-edo-vermilion drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]"
              animate={{
                textShadow: [
                  "0 0 20px rgba(212,175,55,0.8)",
                  "0 0 30px rgba(212,175,55,1)",
                  "0 0 20px rgba(212,175,55,0.8)",
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

      {/* 小判12-15枚（詳細刻印） */}
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: coin.delay }}
          className="absolute z-10"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
          }}
        >
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: coin.delay,
            }}
          >
            <div className="relative w-16 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-lg">
              {/* 刻印「両」 */}
              <div className="absolute inset-0 flex items-center justify-center text-yellow-900 font-bold text-sm">
                両
              </div>
              {/* 家紋風の模様 */}
              <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-800 rounded-full opacity-50" />
              <div className="absolute bottom-1 right-1 w-2 h-2 bg-yellow-800 rounded-full opacity-50" />
            </div>
          </motion.div>
        </motion.div>
      ))}

      {/* EDO ICHIBA看板 */}
      <motion.div
        initial={{ opacity: 0, rotate: -5 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ delay: 1.2 }}
        className="absolute top-40 right-8 z-20 bg-white/90 p-4 rounded-lg shadow-xl border-2 border-edo-vermilion"
      >
        <div className="text-edo-vermilion font-serif font-bold text-xl">
          EDO ICHIBA
        </div>
        <div className="text-edo-indigo text-sm">江戸市場</div>
      </motion.div>

      {/* ボタン */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          {/* 左右から浮かぶ小判 */}
          <div className="absolute -left-20 top-1/2 transform -translate-y-1/2">
            <motion.div
              animate={{
                x: [0, 10, 0],
                rotate: [0, 15, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="w-14 h-9 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center border-2 border-yellow-700"
            >
              <span className="text-yellow-900 font-bold text-xs">両</span>
            </motion.div>
          </div>

          <div className="absolute -right-20 top-1/2 transform -translate-y-1/2">
            <motion.div
              animate={{
                x: [0, -10, 0],
                rotate: [0, -15, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.3,
              }}
              className="w-14 h-9 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center border-2 border-yellow-700"
            >
              <span className="text-yellow-900 font-bold text-xs">両</span>
            </motion.div>
          </div>

          {/* メインボタン */}
          <motion.button
            onClick={handleStart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative px-10 py-5 md:px-14 md:py-7 bg-gradient-to-r from-edo-vermilion to-edo-gold text-white font-bold text-2xl md:text-3xl rounded-full border-4 border-edo-gold shadow-[0_0_30px_rgba(212,175,55,0.6)] flex items-center gap-4 font-serif"
          >
            <span>🎴</span>
            <span>占い始める</span>
            <span>🎴</span>
            <motion.div
              className="absolute inset-0 rounded-full bg-edo-gold opacity-0"
              animate={{
                opacity: [0, 0.3, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.button>
        </motion.div>
      </div>

      {/* 比率バッジ */}
      <div className="absolute bottom-4 left-4 z-30 flex gap-2">
        <span className="px-3 py-1 bg-ghibli-forest text-white text-xs rounded-full">
          ジブリ 70%
        </span>
        <span className="px-3 py-1 bg-edo-vermilion text-white text-xs rounded-full">
          江戸 25%
        </span>
        <span className="px-3 py-1 bg-modern-neon text-white text-xs rounded-full">
          現代 5%
        </span>
      </div>
    </div>
  );
}
