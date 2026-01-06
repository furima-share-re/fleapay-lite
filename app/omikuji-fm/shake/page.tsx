"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OmikujiShakePageFM() {
  const router = useRouter();
  const [isShaking, setIsShaking] = useState(false);
  const [coins, setCoins] = useState<
    Array<{
      id: number;
      angle: number;
      delay: number;
      startX: number;
      startY: number;
      speed: number;
      rotation: number;
      text: string;
    }>
  >([]);
  const [fireworks, setFireworks] = useState<
    Array<{ id: number; x: number; y: number; color: string }>
  >([]);
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
    // 小判を大量に生成（上に向かって舞い上がる）
    const coinArray = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      angle: Math.random() * 360,
      delay: i * 0.05,
      startX: 50 + (Math.random() - 0.5) * 20, // 箱の周辺から開始
      startY: 50 + (Math.random() - 0.5) * 20,
      speed: 0.5 + Math.random() * 0.5, // 上昇速度
      rotation: Math.random() * 360,
      text: ["大吉", "福", "吉", "中吉", "小吉", "口力切"][
        Math.floor(Math.random() * 6)
      ],
    }));
    setCoins(coinArray);

    // 花火の配置
    const fireworkArray = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 80,
      color: i % 2 === 0 ? "#FFD700" : "#FF6347",
    }));
    setFireworks(fireworkArray);

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

  useEffect(() => {
    // 自動的に振る動作を開始
    const timer = setTimeout(() => {
      setIsShaking(true);
    }, 500);

    // 3秒後に結果画面へ
    const redirectTimer = setTimeout(() => {
      router.push("/omikuji-fm/result?fortune=大吉");
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
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

      {/* 背景の夜空 */}
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

      {/* 上部バー */}
      <div className="absolute top-0 left-0 right-0 bg-[#1B365D]/90 z-50 flex items-center justify-between px-4 py-2">
        <motion.button
          onClick={() => router.back()}
          className="text-white text-xl font-bold"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          ←
        </motion.button>
        <h2 className="text-white font-bold text-sm md:text-base">
          EDO ICHIBA OMIKUJI
        </h2>
        <div className="flex items-center gap-2 text-white text-xs">
          <div className="w-4 h-4 border border-white rounded-sm">
            <div
              className="w-full h-full bg-white/80"
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 50%, 0 0)" }}
            />
          </div>
          <div className="w-6 h-3 border border-white rounded-sm relative">
            <div
              className="absolute inset-0.5 bg-white rounded-sm"
              style={{ width: "100%" }}
            />
          </div>
          <span className="text-xs">100%</span>
        </div>
      </div>

      {/* 背景の提灯（小判模様など） */}
      <div className="absolute inset-0 pointer-events-none z-5">
        {/* 左下の小判模様の赤い提灯 */}
        <div className="absolute bottom-20 left-4 md:bottom-32 md:left-8 z-10">
          <div className="relative w-16 h-20 md:w-20 md:h-24">
            <div className="absolute inset-0 bg-red-600 rounded-t-full rounded-b-none shadow-[0_0_20px_rgba(239,68,68,0.8)]">
              {/* 小判模様 */}
              <div className="absolute inset-2 flex flex-wrap gap-1">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-yellow-400 rounded-full opacity-60"
                  />
                ))}
              </div>
            </div>
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
          </div>
        </div>

        {/* 右側の提灯 */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute z-10"
            style={{
              top: `${20 + i * 25}%`,
              right: `${4 + i * 2}%`,
            }}
          >
            <div className="relative w-12 h-16 md:w-16 md:h-20">
              <div
                className={`absolute inset-0 ${
                  i % 2 === 0 ? "bg-red-600" : "bg-white/90"
                } rounded-t-full rounded-b-none shadow-[0_0_15px_rgba(239,68,68,0.6)]`}
              />
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-200 rounded-full"
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-6 md:h-8 bg-red-800" />
            </div>
          </div>
        ))}
      </div>

      {/* 左右の暖簾 */}
      <div className="absolute top-16 left-0 right-0 flex justify-between px-2 md:px-8 z-10">
        <motion.div
          className="w-24 md:w-40 h-96 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px),
              repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 22px)
            `,
          }}
          animate={
            isShaking
              ? {
                  x: [-10, 10, -10],
                  rotate: [-5, 5, -5],
                }
              : {
                  x: [0, -5, 5, 0],
                  rotate: [0, -2, 2, 0],
                }
          }
          transition={{
            duration: isShaking ? 0.1 : 3,
            repeat: Infinity,
            ease: "easeInOut",
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

          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/40 text-xs whitespace-nowrap writing-vertical-rl">
            江戸市場
          </div>
        </motion.div>
        <motion.div
          className="w-24 md:w-40 h-96 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px),
              repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 22px)
            `,
          }}
          animate={
            isShaking
              ? {
                  x: [10, -10, 10],
                  rotate: [5, -5, 5],
                }
              : {
                  x: [0, 5, -5, 0],
                  rotate: [0, 2, -2, 0],
                }
          }
          transition={{
            duration: isShaking ? 0.1 : 3,
            repeat: Infinity,
            delay: 0.5,
            ease: "easeInOut",
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

          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/40 text-xs whitespace-nowrap writing-vertical-rl">
            江戸市場
          </div>
        </motion.div>
      </div>

      {/* 「よーっ!」の文字 - 金色の縁取りと花火の爆発 */}
      <div className="absolute top-20 md:top-24 left-1/2 transform -translate-x-1/2 z-30">
        {/* 背後の花火の爆発エフェクト */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              style={{
                transformOrigin: "center",
              }}
              animate={{
                scale: [0, 3, 0],
                opacity: [0, 1, 0],
                x: Math.cos((i * 30 * Math.PI) / 180) * 60,
                y: Math.sin((i * 30 * Math.PI) / 180) * 60,
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>

        <motion.div
          className="relative"
          animate={
            isShaking
              ? {
                  scale: [1, 1.1, 1],
                }
              : {
                  scale: 1,
                }
          }
          transition={{
            duration: isShaking ? 0.1 : 1,
            repeat: isShaking ? Infinity : 0,
          }}
        >
          {/* 金色の縁取り（外側） */}
          <div
            className="absolute inset-0 text-7xl md:text-9xl font-bold"
            style={{
              WebkitTextStroke: "8px #FFD700",
              WebkitTextFillColor: "transparent",
              filter:
                "drop-shadow(0 0 20px #FFD700) drop-shadow(0 0 40px #FFD700)",
            }}
          >
            よーっ!
          </div>
          {/* メインテキスト（白） */}
          <motion.div
            className="text-7xl md:text-9xl font-bold text-white relative z-10"
            style={{
              textShadow:
                "0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700",
            }}
            animate={{
              textShadow: [
                "0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700",
                "0 0 30px #FFD700, 0 0 60px #FFD700, 0 0 90px #FFD700",
                "0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700",
              ],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          >
            よーっ!
          </motion.div>
        </motion.div>
      </div>

      {/* おみくじ箱と手 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
        <div className="relative">
          {/* 手（袖）- 右下から伸びる */}
          <motion.div
            className="absolute bottom-0 right-0 w-32 h-40 md:w-40 md:h-48 origin-bottom-right"
            style={{
              transform: "rotate(-45deg)",
            }}
            animate={
              isShaking
                ? {
                    x: [0, -15, 15, 0],
                    y: [0, -10, 10, 0],
                    rotate: [-45, -55, -35, -45],
                  }
                : {}
            }
            transition={{
              duration: 0.1,
              repeat: isShaking ? Infinity : 0,
            }}
          >
            {/* モーションブラー効果（残像） */}
            {isShaking && (
              <>
                <div className="absolute inset-0 bg-[#1B365D] rounded-t-full border-2 border-white/20 opacity-30 blur-sm" />
                <div className="absolute inset-0 bg-[#1B365D] rounded-t-full border-2 border-white/20 opacity-20 blur-md" />
              </>
            )}
            <div className="absolute inset-0 bg-[#1B365D] rounded-t-full border-2 border-white/20" />
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-32 md:w-28 md:h-36 bg-[#1B365D] rounded-t-full" />
          </motion.div>

          {/* おみくじ箱 - 八角形 */}
          <motion.div
            className="relative w-48 h-48 md:w-64 md:h-64"
            animate={
              isShaking
                ? {
                    x: [-10, 10, -10, 0],
                    y: [-5, 5, -5, 0],
                    rotate: [-5, 5, -5, 0],
                  }
                : {}
            }
            transition={{
              duration: 0.1,
              repeat: isShaking ? Infinity : 0,
            }}
            style={{
              filter: isShaking ? "blur(2px)" : "none",
            }}
          >
            {/* モーションブラー効果（残像） */}
            {isShaking && (
              <>
                <div
                  className="absolute inset-0 opacity-30 blur-sm"
                  style={{
                    clipPath:
                      "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                  }}
                >
                  <div className="absolute inset-0 bg-red-700 border-4 border-yellow-600" />
                </div>
                <div
                  className="absolute inset-0 opacity-20 blur-md"
                  style={{
                    clipPath:
                      "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                  }}
                >
                  <div className="absolute inset-0 bg-red-700 border-4 border-yellow-600" />
                </div>
              </>
            )}

            <div
              className="absolute inset-0 bg-red-700 shadow-[0_0_40px_rgba(220,38,38,0.8)] border-4 border-red-800"
              style={{
                clipPath:
                  "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
              }}
            >
              {/* 金色の装飾枠 */}
              <div
                className="absolute inset-0 border-2 border-yellow-500/50"
                style={{
                  clipPath:
                    "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                }}
              />
              <div
                className="absolute inset-2 border border-yellow-400/30"
                style={{
                  clipPath:
                    "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                }}
              />

              {/* 上面のスリット（小判が出る部分） */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-3 md:w-32 md:h-4 bg-black/60 rounded-full" />

              {/* 前面のラベル（短冊） */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-20 md:w-24 h-8 md:h-10 bg-white/90 rounded-sm shadow-lg flex items-center justify-center">
                <div className="text-black text-xs md:text-sm font-bold">
                  おみくじ
                </div>
              </div>

              {/* 金色の光る効果 */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-yellow-600/20 via-transparent to-transparent"
                style={{
                  clipPath:
                    "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                }}
                animate={{
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* 小判が上に向かって舞い上がる */}
      <AnimatePresence>
        {isShaking &&
          coins.map((coin) => {
            const maxDistance = 200; // 最大上昇距離
            const horizontalSpread = 30; // 横方向の広がり

            return (
              <motion.div
                key={coin.id}
                className="absolute z-20"
                style={{
                  left: `${coin.startX}%`,
                  top: `${coin.startY}%`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0.8, 0],
                  scale: [0, 0.8, 1, 1.2, 1.5],
                  y: [
                    0,
                    -maxDistance * coin.speed * 0.3,
                    -maxDistance * coin.speed * 0.6,
                    -maxDistance * coin.speed * 0.9,
                    -maxDistance * coin.speed,
                  ],
                  x: [
                    0,
                    Math.sin((coin.angle * Math.PI) / 180) *
                      horizontalSpread *
                      0.3,
                    Math.sin((coin.angle * Math.PI) / 180) *
                      horizontalSpread *
                      0.6,
                    Math.sin((coin.angle * Math.PI) / 180) *
                      horizontalSpread *
                      0.9,
                    Math.sin((coin.angle * Math.PI) / 180) * horizontalSpread,
                  ],
                  rotate: coin.rotation + 360,
                }}
                transition={{
                  delay: coin.delay,
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              >
                {/* 光の輪 */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-yellow-400/50"
                  animate={{
                    scale: [1, 1.5, 2],
                    opacity: [0.8, 0.4, 0],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                />

                {/* 小判本体 */}
                <div className="relative w-10 h-10 md:w-14 md:h-14">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-[0_0_20px_rgba(234,179,8,1)]"
                    animate={{
                      rotate: 360,
                      boxShadow: [
                        "0 0 20px rgba(234,179,8,1)",
                        "0 0 30px rgba(234,179,8,1.2)",
                        "0 0 20px rgba(234,179,8,1)",
                      ],
                    }}
                    transition={{
                      rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                      boxShadow: { duration: 1, repeat: Infinity },
                    }}
                  />
                  {/* 小判の中央の文字 */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-yellow-900 text-[6px] md:text-[10px] font-bold leading-tight text-center">
                      {coin.text}
                    </div>
                  </div>
                  {/* 小判の四角い穴 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-700/50 rounded-sm transform rotate-45" />
                  </div>
                  {/* 光る粒子エフェクト */}
                  <motion.div
                    className="absolute inset-0 bg-yellow-300/70 rounded-full blur-md"
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1.5, 1],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
      </AnimatePresence>

      {/* 花火エフェクト */}
      <AnimatePresence>
        {isShaking &&
          fireworks.map((fw) => (
            <motion.div
              key={fw.id}
              className="absolute z-10"
              style={{
                left: `${fw.x}%`,
                top: `${fw.y}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 2, 0],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 0.8,
                delay: fw.id * 0.1,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            >
              <motion.div
                className="w-6 h-6 rounded-full"
                style={{
                  backgroundColor: fw.color,
                }}
                animate={{
                  boxShadow: [
                    `0 0 20px ${fw.color}, 0 0 40px ${fw.color}`,
                    `0 0 40px ${fw.color}, 0 0 80px ${fw.color}`,
                    `0 0 20px ${fw.color}, 0 0 40px ${fw.color}`,
                  ],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                }}
              />
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: fw.color,
                    left: "50%",
                    top: "50%",
                  }}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{
                    x: Math.cos((i * 45 * Math.PI) / 180) * 60,
                    y: Math.sin((i * 45 * Math.PI) / 180) * 60,
                    scale: 0,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: fw.id * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
              ))}
            </motion.div>
          ))}
      </AnimatePresence>

      {/* "Shake to Reveal!" ボタン - 波打つ括弧付き */}
      <motion.div
        className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-30"
        animate={
          isShaking
            ? {
                scale: [1, 1.1, 1],
              }
            : {
                scale: [1, 1.05, 1],
              }
        }
        transition={{
          duration: isShaking ? 0.1 : 1.5,
          repeat: Infinity,
        }}
      >
        <div className="relative flex items-center gap-2">
          {/* 左側の波打つ括弧 */}
          <motion.div
            className="text-yellow-400 text-3xl md:text-4xl font-bold"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, -5, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
            }}
          >
            ((
          </motion.div>

          {/* ボタン本体 */}
          <motion.button
            className="relative px-8 py-4 bg-[#1B365D] border-4 border-yellow-600 rounded-full text-white font-bold text-base md:text-xl shadow-[0_0_30px_rgba(234,179,8,0.6)]"
            animate={{
              boxShadow: [
                "0 0 30px rgba(234,179,8,0.6)",
                "0 0 50px rgba(234,179,8,0.8)",
                "0 0 30px rgba(234,179,8,0.6)",
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          >
            {isShaking ? "Shaking..." : "Shake to Reveal!"}
          </motion.button>

          {/* 右側の波打つ括弧 */}
          <motion.div
            className="text-yellow-400 text-3xl md:text-4xl font-bold"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 5, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: 0.4,
            }}
          >
            ))
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
