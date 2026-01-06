'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OmikujiShakePage() {
  const router = useRouter();
  const [isShaking, setIsShaking] = useState(false);
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; angle: number; delay: number }>>([]);
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  useEffect(() => {
    // 小判の螺旋状配置
    const coinArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: 50,
      y: 50,
      angle: (i * 18) % 360,
      delay: i * 0.1,
    }));
    setCoins(coinArray);

    // 花火の配置
    const fireworkArray = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 80,
      color: i % 2 === 0 ? '#FFD700' : '#FF6347',
    }));
    setFireworks(fireworkArray);
  }, []);

  useEffect(() => {
    // 自動的に振る動作を開始
    setIsShaking(true);
    
    // 3秒後に結果画面へ
    const timer = setTimeout(() => {
      router.push('/omikuji/result?fortune=大吉');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1B365D] via-[#0f2740] to-black">
      {/* 背景の夜空 */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
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

      {/* 上部バー */}
      <div className="absolute top-0 left-0 right-0 bg-[#1B365D]/80 z-50 flex items-center justify-between px-4 py-2">
        <button
          onClick={() => router.back()}
          className="text-white text-xl hover:scale-110 transition-transform"
        >
          ←
        </button>
        <h2 className="text-white font-bold text-sm md:text-base">EDO ICHIBA OMIKUJI</h2>
        <div className="w-16" />
      </div>

      {/* 左右の暖簾 */}
      <div className="absolute top-16 left-0 right-0 flex justify-between px-2 md:px-8 z-10">
        <div
          className="w-24 md:w-40 h-96 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
          style={{
            animation: isShaking ? 'sway-intense 0.1s ease-in-out infinite' : 'sway 3s ease-in-out infinite',
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px)`,
          }}
        >
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/40 text-xs whitespace-nowrap">
            江戸市場
          </div>
        </div>
        <div
          className="w-24 md:w-40 h-96 bg-[#1B365D] border-2 border-white/20 relative overflow-hidden"
          style={{
            animation: isShaking ? 'sway-intense 0.1s ease-in-out infinite' : 'sway 3s ease-in-out infinite 0.5s',
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px)`,
          }}
        >
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/40 text-xs whitespace-nowrap">
            江戸市場
          </div>
        </div>
      </div>

      {/* 「よーっ!」の文字 */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-30">
        <div
          className="text-7xl md:text-9xl font-bold text-yellow-400 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]"
          style={{
            animation: isShaking ? 'pulse-intense 0.1s ease-in-out infinite' : 'pulse 1s ease-in-out infinite',
            textShadow: '0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700',
          }}
        >
          よーっ!
        </div>
      </div>

      {/* おみくじ箱と手 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
        <div className="relative">
          {/* 手（袖） */}
          <div
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-32 h-40 bg-[#1B365D] rounded-t-full border-2 border-white/20"
            style={{
              animation: isShaking ? 'shake-hand 0.1s ease-in-out infinite' : 'none',
            }}
          >
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-32 bg-[#1B365D] rounded-t-full" />
          </div>

          {/* おみくじ箱 */}
          <div
            className="relative w-48 h-48 md:w-64 md:h-64"
            style={{
              animation: isShaking ? 'shake-box 0.1s ease-in-out infinite' : 'none',
              filter: isShaking ? 'blur(2px)' : 'none',
            }}
          >
            <div className="absolute inset-0 bg-red-700 rounded-lg shadow-[0_0_40px_rgba(220,38,38,0.8)] border-4 border-yellow-600">
              <div className="absolute inset-0 border-2 border-yellow-500/50 rounded-lg" />
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-20 h-20 md:w-28 md:h-28 bg-black/40 rounded-full border-4 border-yellow-600/50 shadow-inner" />
              <div className="absolute bottom-2 left-2 right-2 text-white/30 text-xs text-center">おみくじ</div>
            </div>
          </div>
        </div>
      </div>

      {/* 螺旋状に飛び出す小判 */}
      {coins.map((coin, index) => {
        if (!isShaking && index > 5) return null;
        
        const radius = isShaking ? 80 + index * 15 : 0;
        const angle = (coin.angle + (isShaking ? Date.now() * 0.1 : 0)) * (Math.PI / 180);
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);

        return (
          <div
            key={coin.id}
            className="absolute z-20 transition-all duration-300"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: isShaking ? `rotate(${coin.angle}deg) scale(1.2)` : 'rotate(0deg) scale(1)',
              opacity: isShaking ? 1 : 0,
              transitionDelay: `${coin.delay}s`,
            }}
          >
            <div className="relative w-12 h-12 md:w-16 md:h-16">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-700 shadow-[0_0_20px_rgba(234,179,8,1)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-700 rounded-sm transform rotate-45" />
              </div>
              <div className="absolute inset-0 bg-yellow-300/70 rounded-full blur-md" />
            </div>
          </div>
        );
      })}

      {/* 花火エフェクト */}
      {isShaking && fireworks.map((fw) => (
        <div
          key={fw.id}
          className="absolute z-10"
          style={{
            left: `${fw.x}%`,
            top: `${fw.y}%`,
            animation: `firework-burst 0.8s ease-out forwards ${fw.id * 0.1}s`,
          }}
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{
              backgroundColor: fw.color,
              boxShadow: `0 0 20px ${fw.color}, 0 0 40px ${fw.color}`,
            }}
          />
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: fw.color,
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-30px)`,
                animation: `firework-spark 0.8s ease-out forwards ${fw.id * 0.1}s`,
              }}
            />
          ))}
        </div>
      ))}

      {/* "Shake to Reveal!" テキスト */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-30">
        <div
          className="px-8 py-4 bg-orange-600/90 border-4 border-orange-400 rounded-lg text-white font-bold text-lg md:text-xl shadow-[0_0_30px_rgba(251,146,60,0.8)]"
          style={{
            animation: isShaking ? 'pulse-intense 0.1s ease-in-out infinite' : 'pulse 1.5s ease-in-out infinite',
          }}
        >
          {isShaking ? '((( Shaking... )))' : 'Shake to Reveal!'}
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

        @keyframes sway-intense {
          0%, 100% {
            transform: translateX(-10px) rotate(-5deg);
          }
          50% {
            transform: translateX(10px) rotate(5deg);
          }
        }

        @keyframes shake-box {
          0%, 100% {
            transform: translate(-50%, -50%) translateX(0) translateY(0);
          }
          25% {
            transform: translate(-50%, -50%) translateX(-10px) translateY(-5px);
          }
          75% {
            transform: translate(-50%, -50%) translateX(10px) translateY(5px);
          }
        }

        @keyframes shake-hand {
          0%, 100% {
            transform: translateX(-50%) rotate(0deg);
          }
          25% {
            transform: translateX(-50%) rotate(-10deg) translateX(-5px);
          }
          75% {
            transform: translateX(-50%) rotate(10deg) translateX(5px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        @keyframes pulse-intense {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes firework-burst {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes firework-spark {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle, 0deg)) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle, 0deg)) translateY(-60px) scale(0);
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

