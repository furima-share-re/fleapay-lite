"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OmikujiShakePageFM() {
  const router = useRouter();
  const [isShaking, setIsShaking] = useState(false);
  const [coins, setCoins] = useState<
    Array<{ id: number; angle: number; delay: number }>
  >([]);
  const [fireworks, setFireworks] = useState<
    Array<{ id: number; x: number; y: number; color: string }>
  >([]);

  useEffect(() => {
    // 小判の螺旋状配置
    const coinArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      angle: (i * 18) % 360,
      delay: i * 0.1,
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
      {/* 背景の夜空 */}
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

      {/* 上部バー */}
      <div className="absolute top-0 left-0 right-0 bg-[#1B365D]/80 z-50 flex items-center justify-between px-4 py-2">
        <motion.button
          onClick={() => router.back()}
          className="text-white text-xl"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          ←
        </motion.button>
        <h2 className="text-white font-bold text-sm md:text-base">
          EDO ICHIBA OMIKUJI
        </h2>
        <div className="w-16" />
      </div>

      {/* 左右の暖簾 */}
      <div className="absolute top-16 left-0 right-0 flex justify-between px-2 md:px-8 z-10">
        <motion.div
          className="w-24 md:w-40 h-96 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px)`,
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
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/40 text-xs whitespace-nowrap">
            江戸市場
          </div>
        </motion.div>
        <motion.div
          className="w-24 md:w-40 h-96 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px)`,
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
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/40 text-xs whitespace-nowrap">
            江戸市場
          </div>
        </motion.div>
      </div>

      {/* 「よーっ!」の文字 */}
      <motion.div
        className="absolute top-24 left-1/2 transform -translate-x-1/2 z-30"
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
        <motion.div
          className="text-7xl md:text-9xl font-bold text-yellow-400"
          style={{
            textShadow: "0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700",
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

      {/* おみくじ箱と手 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
        <div className="relative">
          {/* 手（袖） */}
          <motion.div
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-32 h-40 bg-[#1B365D] rounded-t-full border-2 border-white/20"
            animate={
              isShaking
                ? {
                    x: [
                      "-50%",
                      "calc(-50% - 10px)",
                      "calc(-50% + 10px)",
                      "-50%",
                    ],
                    rotate: [-10, 10, -10, 0],
                  }
                : {}
            }
            transition={{
              duration: 0.1,
              repeat: isShaking ? Infinity : 0,
            }}
          >
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-32 bg-[#1B365D] rounded-t-full" />
          </motion.div>

          {/* おみくじ箱 */}
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
            <div className="absolute inset-0 bg-red-700 rounded-lg shadow-[0_0_40px_rgba(220,38,38,0.8)] border-4 border-yellow-600">
              <div className="absolute inset-0 border-2 border-yellow-500/50 rounded-lg" />
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-20 h-20 md:w-28 md:h-28 bg-black/40 rounded-full border-4 border-yellow-600/50 shadow-inner" />
              <div className="absolute bottom-2 left-2 right-2 text-white/30 text-xs text-center">
                おみくじ
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 螺旋状に飛び出す小判 */}
      <AnimatePresence>
        {isShaking &&
          coins.map((coin) => {
            const radius = 80 + coin.id * 15;
            const angle = (coin.angle + Date.now() * 0.1) * (Math.PI / 180);
            const x = 50 + radius * Math.cos(angle);
            const y = 50 + radius * Math.sin(angle);

            return (
              <motion.div
                key={coin.id}
                className="absolute z-20"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1.2,
                  rotate: coin.angle,
                  x: [0, Math.cos(angle) * 20],
                  y: [0, Math.sin(angle) * 20],
                }}
                transition={{
                  delay: coin.delay,
                  duration: 0.5,
                }}
              >
                <div className="relative w-12 h-12 md:w-16 md:h-16">
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-700 rounded-sm transform rotate-45" />
                  </div>
                  <motion.div
                    className="absolute inset-0 bg-yellow-300/70 rounded-full blur-md"
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 1,
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

      {/* "Shake to Reveal!" テキスト */}
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
        <motion.div
          className="px-8 py-4 bg-orange-600/90 border-4 border-orange-400 rounded-lg text-white font-bold text-lg md:text-xl shadow-[0_0_30px_rgba(251,146,60,0.8)]"
          animate={{
            boxShadow: [
              "0 0 30px rgba(251,146,60,0.8)",
              "0 0 50px rgba(251,146,60,1)",
              "0 0 30px rgba(251,146,60,0.8)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        >
          {isShaking ? "((( Shaking... )))" : "Shake to Reveal!"}
        </motion.div>
      </motion.div>
    </div>
  );
}
