'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import OmikujiBox from './OmikujiBox';
import Coin from './Coin';
import Firework from './Firework';

interface SceneProps {
  isShaking?: boolean;
  showCoins?: boolean;
  showFireworks?: boolean;
  coins?: Array<{ id: number; position: [number, number, number]; text: string; delay: number }>;
  fireworks?: Array<{ id: number; position: [number, number, number]; color: string; delay: number }>;
}

export default function Scene({
  isShaking = false,
  showCoins = false,
  showFireworks = false,
  coins = [],
  fireworks = [],
}: SceneProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
      
      {/* ライティング */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-5, -5, 5]} intensity={0.5} color="#fbbf24" />
      
      {/* 環境光 */}
      <Environment preset="night" />

      <Suspense fallback={null}>
        {/* おみくじ箱 */}
        <OmikujiBox isShaking={isShaking} position={[0, 0, 0]} />

        {/* 小判 */}
        {showCoins &&
          coins.map((coin) => (
            <Coin
              key={coin.id}
              position={coin.position}
              text={coin.text}
              delay={coin.delay}
              isSpiraling={isShaking}
            />
          ))}

        {/* 花火 */}
        {showFireworks &&
          fireworks.map((fw) => (
            <Firework
              key={fw.id}
              position={fw.position}
              color={fw.color}
              delay={fw.delay}
            />
          ))}
      </Suspense>

      {/* コントロール（開発用、本番では削除可） */}
      {process.env.NODE_ENV === 'development' && (
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      )}
    </Canvas>
  );
}

