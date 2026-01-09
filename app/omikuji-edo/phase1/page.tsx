'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Phase1Page() {
  const router = useRouter();
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // 小判12-15枚
    const coinArray = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setCoins(coinArray);
  }, []);

  const handleStart = () => {
    router.push('/omikuji-edo/phase2');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#fef9f0] via-[#f5f1e8] to-[#ffffff]">
      {/* ジブリの黄昏の光 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f4b183]/30 via-transparent to-[#a8c5dd]/20 z-0" />

      {/* 青海波パターン背景 */}
      <div
        className="absolute inset-0 opacity-5 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 Q25 20 50 30 T100 30' stroke='%236b9080' fill='none' stroke-width='2'/%3E%3Cpath d='M0 40 Q25 30 50 40 T100 40' stroke='%236b9080' fill='none' stroke-width='2'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 120px',
        }}
      />

      {/* 提灯4-6個（「縁日」「福」「江戸」） */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-20">
        {['縁日', '福', '江戸', '縁日', '福', '江戸'].slice(0, 6).map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative w-16 h-20"
          >
            <div className="absolute inset-0 bg-red-600 rounded-t-full rounded-b-none shadow-lg border-2 border-yellow-400">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold">
                {text}
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-6 bg-red-800" />
            </div>
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-200 rounded-full"
            />
          </motion.div>
        ))}
      </div>

      {/* 町家のシルエット（背景） */}
      <div className="absolute bottom-0 left-0 right-0 h-64 z-5 opacity-40">
        <div className="h-full flex items-end justify-around">
          {/* 格子窓のある町家 */}
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.2 }}
              className="relative"
            >
              {/* 瓦屋根 */}
              <div className="w-32 h-16 bg-gray-800 rounded-t-lg relative">
                <div className="absolute top-0 left-0 right-0 h-2 bg-red-700" />
              </div>
              {/* 壁と格子窓 */}
              <div className="w-32 h-40 bg-[#8b7355] relative">
                <div className="absolute inset-2 grid grid-cols-4 gap-1">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div key={j} className="bg-[#a68b6b]" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 鳥居 */}
      <div className="absolute top-1/3 left-1/4 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative w-24 h-32"
        >
          {/* 鳥居の柱 */}
          <div className="absolute left-0 w-3 h-full bg-red-800 rounded" />
          <div className="absolute right-0 w-3 h-full bg-red-800 rounded" />
          {/* 鳥居の横木 */}
          <div className="absolute top-8 left-0 right-0 h-4 bg-red-800" />
          <div className="absolute top-12 left-0 right-0 h-3 bg-red-800" />
        </motion.div>
      </div>

      {/* EDO ICHIBA看板 */}
      <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-[#2c4f6f] to-[#1B365D] text-white px-6 py-3 rounded-lg shadow-xl border-4 border-[#d4af37]"
        >
          <h1 className="text-2xl font-bold text-center">EDO ICHIBA</h1>
          <p className="text-xs text-center mt-1">江戸市場</p>
        </motion.div>
      </div>

      {/* 中央のおみくじ箱 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="relative"
        >
          {/* おみくじ箱 */}
          <div className="relative w-56 h-56 bg-[#dc2626] rounded-xl shadow-2xl border-4 border-[#d4af37]">
            {/* 装飾パターン（麻の葉） */}
            <div className="absolute inset-0 p-4">
              <div className="h-full border-2 border-[#d4af37] rounded flex items-center justify-center">
                <div className="text-7xl">🎎</div>
              </div>
            </div>
            {/* ロック */}
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-[#d4af37] rounded-full flex items-center justify-center shadow-lg">
              <div className="w-2 h-8 bg-yellow-700 rounded-full" />
            </div>
          </div>

          {/* 「運試し」テキスト */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 text-center"
          >
            <h2 className="text-5xl font-bold text-[#2c4f6f] drop-shadow-lg">
              運試し
            </h2>
          </motion.div>
        </motion.div>
      </div>

      {/* 小判12-15枚（「両」の文字、家紋付き） */}
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          className="absolute z-15"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
          }}
          animate={{
            y: [0, -15, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: coin.delay,
          }}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex flex-col items-center justify-center border-2 border-yellow-700">
            <div className="text-[0.6rem] font-bold text-yellow-900">両</div>
            <div className="text-[0.4rem] text-yellow-800">家紋</div>
          </div>
        </motion.div>
      ))}

      {/* 縁起物：招き猫、だるま、手毬、扇子 */}
      <div className="absolute bottom-40 left-10 z-15">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
          className="text-6xl"
        >
          🐱
        </motion.div>
      </div>
      <div className="absolute bottom-40 right-10 z-15">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2 }}
          className="text-6xl"
        >
          🎎
        </motion.div>
      </div>
      <div className="absolute bottom-32 left-1/4 z-15">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4 }}
          className="text-5xl"
        >
          🎈
        </motion.div>
      </div>
      <div className="absolute bottom-32 right-1/4 z-15">
        <motion.div
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ delay: 1.6 }}
          className="text-5xl"
        >
          🪭
        </motion.div>
      </div>

      {/* ボタン */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          onClick={handleStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-12 py-6 bg-gradient-to-r from-[#c73e3a] to-[#d4af37] text-white font-bold text-2xl rounded-full border-4 border-yellow-300 shadow-[0_0_30px_rgba(212,175,55,0.6)]"
        >
          🎴 占い始める 🎴
        </motion.button>
      </div>

      {/* 麻の葉・亀甲パターンオーバーレイ */}
      <div
        className="absolute inset-0 opacity-5 z-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #2c4f6f 2px, transparent 2px)`,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}

