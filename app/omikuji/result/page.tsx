'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type FortuneType = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶';

function OmikujiResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fortune = (searchParams.get('fortune') || '大吉') as FortuneType;
  
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; delay: number; speed: number }>>([]);
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);
  const [petals, setPetals] = useState<Array<{ id: number; x: number; delay: number; speed: number }>>([]);

  useEffect(() => {
    // 小判が降り注ぐ
    const coinArray = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      delay: Math.random() * 3,
      speed: 2 + Math.random() * 3,
    }));
    setCoins(coinArray);

    // 花火の配置
    const fireworkArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 60,
      color: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FF6347' : '#FF69B4',
      delay: Math.random() * 2,
    }));
    setFireworks(fireworkArray);

    // 桜の花びら
    const petalArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      speed: 3 + Math.random() * 4,
    }));
    setPetals(petalArray);
  }, []);

  const fortuneColors: Record<FortuneType, string> = {
    '大吉': 'from-red-500 to-red-700',
    '中吉': 'from-orange-500 to-orange-700',
    '小吉': 'from-yellow-500 to-yellow-700',
    '吉': 'from-green-500 to-green-700',
    '末吉': 'from-blue-500 to-blue-700',
    '凶': 'from-gray-500 to-gray-700',
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* 背景の夜空 */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.8,
              animation: `twinkle ${2 + Math.random() * 2}s ease-in-out infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* 降り注ぐ小判 */}
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute z-10"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
            animation: `coin-fall ${coin.speed}s linear infinite ${coin.delay}s`,
          }}
        >
          <div className="relative w-10 h-10 md:w-14 md:h-14">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-[0_0_20px_rgba(234,179,8,1)] animate-spin" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-700 rounded-sm transform rotate-45" />
            </div>
            <div className="absolute inset-0 bg-yellow-300/70 rounded-full blur-md" />
          </div>
        </div>
      ))}

      {/* 花火エフェクト */}
      {fireworks.map((fw) => (
        <div
          key={fw.id}
          className="absolute z-5"
          style={{
            left: `${fw.x}%`,
            top: `${fw.y}%`,
            animation: `firework-burst-continuous 1.5s ease-out infinite ${fw.delay}s`,
          }}
        >
          <div
            className="w-6 h-6 rounded-full"
            style={{
              backgroundColor: fw.color,
              boxShadow: `0 0 30px ${fw.color}, 0 0 60px ${fw.color}`,
            }}
          />
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: fw.color,
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-40px)`,
                animation: `firework-spark-continuous 1.5s ease-out infinite ${fw.delay}s`,
              }}
            />
          ))}
        </div>
      ))}

      {/* 桜の花びら */}
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="absolute z-8"
          style={{
            left: `${petal.x}%`,
            top: '-5%',
            animation: `petal-fall ${petal.speed}s linear infinite ${petal.delay}s`,
          }}
        >
          <div className="text-3xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(255,192,203,0.6))' }}>
            🌸
          </div>
        </div>
      ))}

      {/* メインコンテンツ */}
      <div className="relative z-30 min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* ユーザー写真スペース（上部） */}
        <div className="mb-8">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-yellow-600 shadow-[0_0_30px_rgba(234,179,8,0.8)] bg-gradient-to-br from-yellow-100 to-yellow-300 flex items-center justify-center overflow-hidden">
            <div className="text-4xl md:text-6xl">📸</div>
          </div>
        </div>

        {/* おみくじカード */}
        <div className="relative w-full max-w-md mb-8">
          {/* カード本体 */}
          <div className={`relative bg-gradient-to-br ${fortuneColors[fortune]} rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-yellow-500`}>
            {/* 金色の装飾枠 */}
            <div className="absolute inset-2 border-2 border-yellow-400/50 rounded-2xl" />
            
            {/* 伝統文様パターン */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px)`,
            }} />

            {/* 運勢 */}
            <div className="relative z-10 text-center">
              <div className="text-6xl md:text-8xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] mb-4">
                {fortune}
              </div>
              
              {/* 装飾的な線 */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-1 w-16 bg-yellow-400" />
                <div className="text-2xl">✨</div>
                <div className="h-1 w-16 bg-yellow-400" />
              </div>

              {/* 説明文 */}
              <div className="text-white/90 text-sm md:text-base leading-relaxed">
                <p className="mb-2">あなたの運勢は最高です！</p>
                <p>素晴らしいことが待っています。</p>
              </div>
            </div>

            {/* 桜の装飾 */}
            <div className="absolute top-4 left-4 text-3xl opacity-60">🌸</div>
            <div className="absolute top-4 right-4 text-3xl opacity-60">🌸</div>
            <div className="absolute bottom-4 left-4 text-3xl opacity-60">🌸</div>
            <div className="absolute bottom-4 right-4 text-3xl opacity-60">🌸</div>
          </div>

          {/* 光る効果 */}
          <div className={`absolute inset-0 bg-gradient-to-br ${fortuneColors[fortune]} rounded-3xl opacity-30 blur-2xl animate-pulse`} />
        </div>

        {/* アクションボタン */}
        <div className="flex gap-4 z-30">
          <button
            onClick={() => router.push('/omikuji')}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.6)] transition-all duration-300 hover:scale-105"
          >
            もう一度引く
          </button>
          <button
            onClick={() => {
              // SNS共有機能（実装は後で）
              if (navigator.share) {
                navigator.share({
                  title: `EDO ICHIBA おみくじ結果: ${fortune}`,
                  text: `おみくじで${fortune}を引きました！`,
                });
              }
            }}
            className="px-6 py-3 bg-[#1B365D] hover:bg-[#193e5b] text-white font-bold rounded-lg border-2 border-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.6)] transition-all duration-300 hover:scale-105"
          >
            SNSで共有
          </button>
        </div>
      </div>

      {/* フッター装飾 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-20" />

      <style jsx>{`
        @keyframes coin-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) rotate(360deg);
            opacity: 0.8;
          }
        }

        @keyframes petal-fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(50vh) translateX(20px) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) translateX(-20px) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes firework-burst-continuous {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes firework-spark-continuous {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle, 0deg)) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle, 0deg)) translateY(-80px) scale(0);
            opacity: 0;
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default function OmikujiResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    }>
      <OmikujiResultContent />
    </Suspense>
  );
}

