'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Scene from '../components/Scene';

export default function OmikujiShakePageR3F() {
  const router = useRouter();
  const [isShaking, setIsShaking] = useState(false);
  const [coins, setCoins] = useState<
    Array<{ id: number; position: [number, number, number]; text: string; delay: number }>
  >([]);
  const [fireworks, setFireworks] = useState<
    Array<{ id: number; position: [number, number, number]; color: string; delay: number }>
  >([]);

  useEffect(() => {
    // 小判の螺旋状配置（3D）
    const coinArray = Array.from({ length: 20 }, (_, i) => {
      const angle = (i * 18) % 360;
      const radius = 1 + i * 0.3;
      return {
        id: i,
        position: [
          Math.cos((angle * Math.PI) / 180) * radius,
          Math.sin((angle * Math.PI) / 180) * radius + 2,
          Math.sin((angle * Math.PI) / 180) * 0.5,
        ] as [number, number, number],
        text: i % 3 === 0 ? '大' : i % 3 === 1 ? '吉' : '福',
        delay: i * 0.1,
      };
    });
    setCoins(coinArray);

    // 花火の配置（3D）
    const fireworkArray = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 10,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * 5,
      ] as [number, number, number],
      color: i % 2 === 0 ? '#FFD700' : '#FF6347',
      delay: Math.random() * 2,
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
      router.push('/omikuji-r3f/result?fortune=大吉');
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* 背景の市場の屋台と人のシルエット（画像推奨） */}
      {/* TODO: 背景画像を追加する場合は以下を使用
        <div className="absolute inset-0 z-0 opacity-20">
          <img src="/images/edo-market-background.png" alt="Edo Market" className="w-full h-full object-cover" />
        </div>
      */}

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
          EDO ICHIBA OMIKUJI (3D)
        </h2>
        <div className="w-16" />
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
            ease: 'easeInOut',
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
            ease: 'easeInOut',
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
            textShadow: '0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700',
          }}
          animate={{
            textShadow: [
              '0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700',
              '0 0 30px #FFD700, 0 0 60px #FFD700, 0 0 90px #FFD700',
              '0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700',
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

      {/* 3Dおみくじ箱と小判、花火 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-[600px] z-30">
        <Scene
          isShaking={isShaking}
          showCoins={isShaking}
          showFireworks={isShaking}
          coins={coins}
          fireworks={fireworks}
        />
      </div>

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
          className="px-8 py-4 bg-orange-600/90 border-4 border-dashed border-orange-400 rounded-lg text-white font-bold text-lg md:text-xl shadow-[0_0_30px_rgba(251,146,60,0.8)] relative"
          animate={{
            boxShadow: [
              '0 0 30px rgba(251,146,60,0.8)',
              '0 0 50px rgba(251,146,60,1)',
              '0 0 30px rgba(251,146,60,0.8)',
            ],
            borderColor: [
              'rgba(251,146,60,0.8)',
              'rgba(251,146,60,1)',
              'rgba(251,146,60,0.8)',
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        >
          {isShaking ? '((( Shaking... )))' : 'Shake to Reveal!'}
        </motion.div>
      </motion.div>
    </div>
  );
}

