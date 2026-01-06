'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';

interface FireworkProps {
  position: [number, number, number];
  color?: string;
  delay?: number;
}

export default function Firework({
  position,
  color = '#FFD700',
  delay = 0,
}: FireworkProps) {
  const particlesRef = useRef<Mesh[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      return {
        position: new Vector3(
          Math.cos(angle) * 0.5,
          Math.sin(angle) * 0.5,
          0
        ),
        angle,
      };
    });
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime - delay;
    
    if (time < 0) return;

    if (groupRef.current) {
      // 花火の拡散アニメーション
      const scale = Math.min(time * 2, 1.5);
      const opacity = Math.max(0, 1 - time * 0.5);

      groupRef.current.scale.set(scale, scale, scale);
      
      particlesRef.current.forEach((particle, i) => {
        if (particle) {
          const distance = time * 2;
          const angle = particles[i].angle;
          particle.position.x = Math.cos(angle) * distance;
          particle.position.y = Math.sin(angle) * distance;
          particle.position.z = Math.sin(time * 5) * 0.3;

          if (particle.material) {
            (particle.material as any).opacity = opacity;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {particles.map((particle, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) particlesRef.current[i] = el;
          }}
          position={particle.position}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
      {/* 中心の光 */}
      <mesh>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
        />
      </mesh>
    </group>
  );
}

