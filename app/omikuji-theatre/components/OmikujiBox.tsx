'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group } from 'three';
import { Text } from '@react-three/drei';
import { editable as e, SheetProvider } from '@theatre/r3f';
import { getProject } from '@theatre/core';
import type { ISheet } from '@theatre/core';

interface OmikujiBoxProps {
  isShaking?: boolean;
  position?: [number, number, number];
  sheet?: ISheet;
}

export default function OmikujiBox({
  isShaking = false,
  position = [0, 0, 0],
  sheet,
}: OmikujiBoxProps) {
  const boxRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (boxRef.current && !sheet) {
      // Theatre.jsが使われていない場合のフォールバック
      if (isShaking) {
        boxRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 20) * 0.2;
        boxRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 18) * 0.2;
        boxRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 22) * 0.1;
        boxRef.current.position.x = Math.sin(state.clock.elapsedTime * 25) * 0.1;
        boxRef.current.position.y = Math.cos(state.clock.elapsedTime * 23) * 0.1;
      } else {
        boxRef.current.rotation.y += 0.005;
      }
    }
  });

  return (
    <e.group
      ref={boxRef}
      theatreKey="OmikujiBox"
      position={position}
      sheet={sheet}
    >
      {/* メインの箱 */}
      <e.mesh
        ref={meshRef}
        theatreKey="BoxMesh"
        castShadow
        receiveShadow
        sheet={sheet}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial
          color="#dc2626"
          metalness={0.3}
          roughness={0.4}
          emissive="#dc2626"
          emissiveIntensity={0.2}
        />
      </e.mesh>

      {/* 金色の装飾枠 */}
      <mesh position={[0, 0, 1.01]}>
        <boxGeometry args={[2.1, 2.1, 0.02]} />
        <meshStandardMaterial
          color="#eab308"
          metalness={0.9}
          roughness={0.1}
          emissive="#fbbf24"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* 角の装飾 */}
      {[
        [-1, 1, 1.02],
        [1, 1, 1.02],
        [-1, -1, 1.02],
        [1, -1, 1.02],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.2, 0.2, 0.05]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.9}
            roughness={0.1}
            emissive="#fbbf24"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* 上面の円形の穴 */}
      <mesh position={[0, 1.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
        <meshStandardMaterial
          color="#000000"
          opacity={0.4}
          transparent
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* 金色の縁 */}
      <mesh position={[0, 1.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.65, 32]} />
        <meshStandardMaterial
          color="#eab308"
          metalness={0.9}
          roughness={0.1}
          emissive="#fbbf24"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* 前面の装飾テキスト */}
      <Text
        position={[0, -0.8, 1.02]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        opacity={0.4}
      >
        おみくじ
      </Text>

      {/* 光る効果 */}
      <pointLight
        position={[0, 0, 2]}
        intensity={isShaking ? 2 : 1}
        color="#fbbf24"
        distance={5}
      />
    </e.group>
  );
}

