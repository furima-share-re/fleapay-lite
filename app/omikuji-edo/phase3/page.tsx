'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type FortuneType = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶';

const fortunes: FortuneType[] = ['大吉', '中吉', '小吉', '吉', '末吉', '凶'];
const fortuneColors: Record<FortuneType, { from: string; to: string }> = {
  大吉: { from: 'from-blue-600', to: 'to-yellow-400' },
  中吉: { from: 'from-orange-500', to: 'to-orange-700' },
  小吉: { from: 'from-yellow-500', to: 'to-yellow-700' },
  吉: { from: 'from-green-500', to: 'to-green-700' },
  末吉: { from: 'from-blue-500', to: 'to-blue-700' },
  凶: { from: 'from-gray-500', to: 'to-gray-700' },
};

export default function Phase3Page() {
  const router = useRouter();
  const [fortune, setFortune] = useState<FortuneType>('大吉');
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [ornaments, setOrnaments] = useState<Array<{ id: number; type: string; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // ランダムに運勢を選ぶ
    const randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    setFortune(randomFortune);

    // 小判8-10枚
    const coinArray = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setCoins(coinArray);

    // 縁起物：招き猫、だるま、お守り、手毬、扇子
    const ornamentArray = [
      { id: 0, type: '招き猫', x: 10, y: 20, delay: 0.5 },
      { id: 1, type: '招き猫', x: 85, y: 25, delay: 0.7 },
      { id: 2, type: 'だるま', x: 15, y: 70, delay: 0.9 },
      { id: 3, type: 'だるま', x: 80, y: 75, delay: 1.1 },
      { id: 4, type: 'お守り', x: 20, y: 40, delay: 1.3 },
      { id: 5, type: 'お守り', x: 75, y: 45, delay: 1.5 },
      { id: 6, type: '手毬', x: 30, y: 60, delay: 1.7 },
      { id: 7, type: '扇子', x: 70, y: 55, delay: 1.9 },
    ];
    setOrnaments(ornamentArray);

    // 3秒後にPhase 4へ
    const timer = setTimeout(() => {
      router.push(`/omikuji-edo/phase4?fortune=${encodeURIComponent(randomFortune)}`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  const colors = fortuneColors[fortune];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#fef9f0] via-[#f5f1e8] to-[#ffffff]">
      {/* ジブリの黄昏の光 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f4b183]/40 via-[#a8c5dd]/20 to-transparent z-0" />

      {/* 神社建築：鳥居、本殿、石灯籠 */}
      <div className="absolute bottom-0 left-0 right-0 z-5">
        {/* 鳥居 */}
        <div className="absolute bottom-32 left-1/4">
          <div className="relative w-32 h-40">
            <div className="absolute left-0 w-4 h-full bg-red-800 rounded" />
            <div className="absolute right-0 w-4 h-full bg-red-800 rounded" />
            <div className="absolute top-10 left-0 right-0 h-5 bg-red-800" />
            <div className="absolute top-14 left-0 right-0 h-4 bg-red-800" />
          </div>
        </div>
        <div className="absolute bottom-32 right-1/4">
          <div className="relative w-32 h-40">
            <div className="absolute left-0 w-4 h-full bg-red-800 rounded" />
            <div className="absolute right-0 w-4 h-full bg-red-800 rounded" />
            <div className="absolute top-10 left-0 right-0 h-5 bg-red-800" />
            <div className="absolute top-14 left-0 right-0 h-4 bg-red-800" />
          </div>
        </div>

        {/* 本殿屋根 */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <div className="w-64 h-32 bg-gray-900 rounded-t-xl relative">
            <div className="absolute top-0 left-0 right-0 h-3 bg-red-700" />
          </div>
        </div>

        {/* 石灯籠 */}
        <div className="absolute bottom-20 left-1/3">
          <div className="w-8 h-20 bg-gray-600 rounded-t-lg">
            <div className="w-6 h-6 bg-yellow-200 rounded-full mx-auto mt-2 animate-pulse" />
          </div>
        </div>
        <div className="absolute bottom-20 right-1/3">
          <div className="w-8 h-20 bg-gray-600 rounded-t-lg">
            <div className="w-6 h-6 bg-yellow-200 rounded-full mx-auto mt-2 animate-pulse" />
          </div>
        </div>

        {/* 狛犬 */}
        <div className="absolute bottom-0 left-1/3 transform translate-x-1/2">
          <div className="text-4xl">🦁</div>
        </div>
        <div className="absolute bottom-0 right-1/3 transform -translate-x-1/2">
          <div className="text-4xl">🦁</div>
        </div>
      </div>

      {/* 提灯5-6個 */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative w-12 h-16"
          >
            <div className="absolute inset-0 bg-red-600 rounded-t-full rounded-b-none shadow-lg border-2 border-yellow-400">
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-5 bg-red-800" />
            </div>
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-200 rounded-full"
            />
          </motion.div>
        ))}
      </div>

      {/* 運勢カード（金縁、雲紋、判子印、青海波） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="relative"
        >
          {/* 5層のボーダー */}
          <div className={`bg-gradient-to-br ${colors.from} ${colors.to} rounded-3xl p-8 md:p-12 shadow-2xl min-w-[320px] md:min-w-[450px] relative`}>
            {/* 外側：藍+麻の葉 */}
            <div className="absolute -inset-2 border-4 border-[#2c4f6f] rounded-3xl opacity-50" />
            {/* 中間：朱色ストライプ */}
            <div className="absolute -inset-1 border-2 border-[#c73e3a] rounded-3xl opacity-70" />
            {/* 内側：金+青海波 */}
            <div className="absolute inset-0 border-4 border-[#d4af37] rounded-3xl" />

            {/* 四隅の判子印 */}
            <div className="absolute top-2 left-2 w-8 h-8 bg-red-700 rounded-full border-2 border-yellow-400" />
            <div className="absolute top-2 right-2 w-8 h-8 bg-red-700 rounded-full border-2 border-yellow-400" />
            <div className="absolute bottom-2 left-2 w-8 h-8 bg-red-700 rounded-full border-2 border-yellow-400" />
            <div className="absolute bottom-2 right-2 w-8 h-8 bg-red-700 rounded-full border-2 border-yellow-400" />

            {/* 雲紋パターン背景 */}
            <div
              className="absolute inset-4 opacity-10 rounded-2xl"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10 Q40 20 30 30 Q20 20 30 10' fill='%232c4f6f'/%3E%3C/svg%3E")`,
                backgroundSize: '80px 80px',
              }}
            />

            <div className="relative z-10 text-center">
              <motion.h1
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, type: 'spring', stiffness: 200 }}
                className="text-7xl md:text-9xl font-bold text-white mb-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
              >
                {fortune}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-white text-xl md:text-2xl space-y-2 font-bold"
              >
                <p>運勢{fortune}</p>
                <p>良縁訪れる</p>
                <p>願望叶う</p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 小判8-10枚 */}
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          className="absolute z-15"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
          }}
          animate={{
            y: [0, -10, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 3 + Math.random(),
            repeat: Infinity,
            delay: coin.delay,
          }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center border-2 border-yellow-700">
            <div className="text-xs font-bold text-yellow-900">両</div>
          </div>
        </motion.div>
      ))}

      {/* 縁起物 */}
      {ornaments.map((orn) => (
        <motion.div
          key={orn.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: orn.delay }}
          className="absolute z-15 text-5xl"
          style={{
            left: `${orn.x}%`,
            top: `${orn.y}%`,
          }}
        >
          {orn.type === '招き猫' && '🐱'}
          {orn.type === 'だるま' && '🎎'}
          {orn.type === 'お守り' && '🎋'}
          {orn.type === '手毬' && '🎈'}
          {orn.type === '扇子' && '🪭'}
        </motion.div>
      ))}

      {/* 水引（紅白の飾り紐） */}
      <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex gap-2">
          <div className="w-1 h-12 bg-red-600" />
          <div className="w-1 h-12 bg-white" />
          <div className="w-1 h-12 bg-red-600" />
          <div className="w-1 h-12 bg-white" />
        </div>
      </div>

      {/* 絵馬 */}
      <div className="absolute top-40 left-10 z-15">
        <div className="w-24 h-32 bg-[#8b7355] rounded-lg border-4 border-[#d4af37] flex items-center justify-center text-white text-sm font-bold">
          絵馬
        </div>
      </div>
      <div className="absolute top-40 right-10 z-15">
        <div className="w-24 h-32 bg-[#8b7355] rounded-lg border-4 border-[#d4af37] flex items-center justify-center text-white text-sm font-bold">
          絵馬
        </div>
      </div>

      {/* 麻の葉・青海波・亀甲文様オーバーレイ */}
      <div
        className="absolute inset-0 opacity-8 z-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #2c4f6f 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />
    </div>
  );
}

