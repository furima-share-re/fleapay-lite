'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Phase2Page() {
  const router = useRouter();
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; angle: number; delay: number }>>([]);
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; type: string; delay: number }>>([]);
  const [kanji, setKanji] = useState<Array<{ id: number; text: string; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // 小判15-20枚
    const coinArray = Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 4;
      const radius = 30 + (i / 20) * 250;
      return {
        id: i,
        x: 50 + (radius * Math.cos(angle)) / 10,
        y: 50 + (radius * Math.sin(angle)) / 10,
        angle: angle * (180 / Math.PI),
        delay: i * 0.05,
      };
    });
    setCoins(coinArray);

    // 花火パターン（菊花火、柳花火、牡丹花火）
    const fireworkArray = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 60,
      type: ['菊花火', '柳花火', '牡丹花火'][i % 3],
      delay: Math.random() * 2,
    }));
    setFireworks(fireworkArray);

    // 浮遊する漢字「福」「縁」「吉」「祝」
    const kanjiArray = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      text: ['福', '縁', '吉', '祝'][i % 4],
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setKanji(kanjiArray);

    // 3秒後にPhase 3へ
    const timer = setTimeout(() => {
      router.push('/omikuji-edo/phase3');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* ハウルの魔法の背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/30 z-0" />

      {/* 大きな「縁」「福」の書道爆発 */}
      <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 z-20">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 2, 2.5], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-8xl md:text-9xl font-bold text-[#d4af37] drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]"
        >
          縁
        </motion.div>
      </div>
      <div className="absolute top-1/3 right-1/4 z-20">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 2, 2.5], opacity: [0, 1, 0] }}
          transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
          className="text-7xl md:text-8xl font-bold text-[#d4af37] drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]"
        >
          福
        </motion.div>
      </div>

      {/* 「よーっ!」テキスト */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute top-20 left-1/2 transform -translate-x-1/2 z-25 text-center"
      >
        <motion.h2
          className="text-6xl md:text-8xl font-bold text-white drop-shadow-[0_0_40px_rgba(255,215,0,1)]"
          animate={{
            scale: [1, 1.15, 1],
            textShadow: [
              '0 0 20px rgba(255,215,0,0.8)',
              '0 0 50px rgba(255,215,0,1)',
              '0 0 20px rgba(255,215,0,0.8)',
            ],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          よーっ!
        </motion.h2>
      </motion.div>

      {/* 花火パターン */}
      {fireworks.map((fw) => (
        <motion.div
          key={fw.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 2, 3, 0],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.5,
            delay: fw.delay,
            repeat: Infinity,
            repeatDelay: 2,
          }}
          className="absolute z-10"
          style={{
            left: `${fw.x}%`,
            top: `${fw.y}%`,
          }}
        >
          {/* 菊花火 */}
          {fw.type === '菊花火' && (
            <div className="relative">
              <div className="w-8 h-8 bg-yellow-400 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.8)]" />
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-12 bg-gradient-to-t from-yellow-400 to-yellow-600"
                  style={{
                    transformOrigin: 'bottom center',
                    transform: `rotate(${i * 45}deg)`,
                  }}
                  animate={{
                    scaleY: [0, 1, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2,
                    repeat: Infinity,
                  }}
                />
              ))}
            </div>
          )}
          {/* 柳花火 */}
          {fw.type === '柳花火' && (
            <div className="relative">
              <div className="w-6 h-6 bg-orange-400 rounded-full" />
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-16 bg-gradient-to-b from-orange-400 to-transparent"
                  style={{
                    left: '50%',
                    transform: `translateX(-50%) rotate(${i * 60 - 30}deg)`,
                    transformOrigin: 'top center',
                  }}
                  animate={{
                    scaleY: [0, 1],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.3,
                    repeat: Infinity,
                  }}
                />
              ))}
            </div>
          )}
          {/* 牡丹花火 */}
          {fw.type === '牡丹花火' && (
            <motion.div
              animate={{
                scale: [0, 2, 2.5, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
              }}
              className="w-12 h-12 bg-gradient-radial from-red-500 via-yellow-400 to-red-600 rounded-full shadow-[0_0_40px_rgba(255,100,100,0.8)]"
            />
          )}
        </motion.div>
      ))}

      {/* 小判15-20枚（「両」「分」の文字、家紋付き） */}
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          initial={{ opacity: 0, scale: 0, x: '50%', y: '50%' }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 1.5],
            x: `${coin.x}%`,
            y: `${coin.y - 40}%`,
            rotate: coin.angle + 360,
          }}
          transition={{
            duration: 2.5,
            delay: coin.delay,
            ease: 'easeOut',
          }}
          className="absolute z-15"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex flex-col items-center justify-center border-2 border-yellow-700">
            <div className="text-xs font-bold text-yellow-900">
              {coin.id % 2 === 0 ? '両' : '分'}
            </div>
            <div className="text-[0.5rem] text-yellow-800">家紋</div>
          </div>
        </motion.div>
      ))}

      {/* 浮遊する漢字 */}
      {kanji.map((k) => (
        <motion.div
          key={k.id}
          initial={{ opacity: 0, y: 100 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [`${k.y}%`, `${k.y - 30}%`, `${k.y - 60}%`],
            x: [`${k.x}%`, `${k.x + 10}%`, `${k.x - 10}%`],
            scale: [0.5, 1.5, 1],
          }}
          transition={{
            duration: 3,
            delay: k.delay,
            repeat: Infinity,
          }}
          className="absolute z-12 text-5xl md:text-6xl font-bold text-[#d4af37] drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]"
          style={{
            left: `${k.x}%`,
            top: `${k.y}%`,
          }}
        >
          {k.text}
        </motion.div>
      ))}

      {/* 祭り要素：狐面、扇子、だるま、鈴 */}
      <div className="absolute bottom-40 left-16 z-15">
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-6xl"
        >
          🎭
        </motion.div>
      </div>
      <div className="absolute bottom-40 right-16 z-15">
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-6xl"
        >
          🪭
        </motion.div>
      </div>
      <div className="absolute bottom-32 left-1/3 z-15">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-5xl"
        >
          🎎
        </motion.div>
      </div>
      <div className="absolute bottom-32 right-1/3 z-15">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-5xl"
        >
          🔔
        </motion.div>
      </div>

      {/* 建築破片（モーションブラー） */}
      <div className="absolute top-1/2 left-1/4 z-10">
        <motion.div
          animate={{
            x: [0, 50, -50, 0],
            y: [0, 30, -30, 0],
            rotate: [0, 15, -15, 0],
          }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="w-8 h-8 bg-gray-700 rounded opacity-60 blur-sm"
        />
      </div>

      {/* 青海波の螺旋パターン */}
      <div
        className="absolute inset-0 opacity-10 z-5 pointer-events-none"
        style={{
          backgroundImage: `conic-gradient(from 0deg, transparent, #d4af37 90deg, transparent)`,
          maskImage: `radial-gradient(circle, transparent 30%, black 70%)`,
        }}
      />
    </div>
  );
}

