'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { Text } from '@react-three/drei';
import { editable as e } from '@theatre/r3f';
import type { ISheet } from '@theatre/core';

interface CoinProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  text?: string;
  delay?: number;
  isSpiraling?: boolean;
  sheet?: ISheet;
  theatreKey?: string;
}

export default function Coin({
  position,
  rotation = [0, 0, 0],
  text = '大',
  delay = 0,
  isSpiraling = false,
  sheet,
  theatreKey,
}: CoinProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current && !sheet) {
      // Theatre.jsが使われていない場合のフォールバック
      meshRef.current.rotation.y += 0.05;
      meshRef.current.rotation.z += 0.02;

      if (isSpiraling) {
        const time = state.clock.elapsedTime + delay;
        const radius = 1 + time * 0.5;
        const angle = time * 2;
        meshRef.current.position.x = Math.cos(angle) * radius;
        meshRef.current.position.y = Math.sin(angle) * radius + 2;
        meshRef.current.position.z = Math.sin(angle * 0.5) * 0.5;
      } else {
        meshRef.current.position.y -= delta * 2;
        if (meshRef.current.position.y < -5) {
          meshRef.current.position.y = 8;
        }
      }

      const intensity = 0.5 + Math.sin(state.clock.elapsedTime * 3 + delay) * 0.3;
      if (meshRef.current.material) {
        (meshRef.current.material as any).emissiveIntensity = intensity;
      }
    }
  });

  return (
    <group
      ref={meshRef}
      position={position}
      rotation={rotation}
    >
      {/* 小判本体 */}
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
        <meshStandardMaterial
          color="#eab308"
          metalness={0.9}
          roughness={0.1}
          emissive="#fbbf24"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* 中央の文字 */}
      <Text
        position={[0, 0, 0.03]}
        fontSize={0.15}
        color="#78350f"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {text}
      </Text>

      {/* 四角い穴 */}
      <mesh position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.1, 0.1, 0.01]} />
        <meshStandardMaterial
          color="#a16207"
          opacity={0.5}
          transparent
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      {/* 光る軌跡 */}
      <pointLight
        position={[0, 0, 0]}
        intensity={0.8}
        color="#fbbf24"
        distance={2}
        decay={2}
      />
    </group>
  );
}

