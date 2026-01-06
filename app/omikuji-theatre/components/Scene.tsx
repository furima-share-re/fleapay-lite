'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { getProject, types as t } from '@theatre/core';
import { SheetProvider } from '@theatre/r3f';
import { useControls, Leva } from 'leva';
import OmikujiBox from './OmikujiBox';
import Coin from './Coin';
import Firework from './Firework';

interface SceneProps {
  isShaking?: boolean;
  showCoins?: boolean;
  showFireworks?: boolean;
  coins?: Array<{ id: number; position: [number, number, number]; text: string; delay: number }>;
  fireworks?: Array<{ id: number; position: [number, number, number]; color: string; delay: number }>;
  enableTheatre?: boolean;
  enableLeva?: boolean;
}

export default function Scene({
  isShaking = false,
  showCoins = false,
  showFireworks = false,
  coins = [],
  fireworks = [],
  enableTheatre = true,
  enableLeva = false,
}: SceneProps) {
  const [project, setProject] = useState<any>(null);
  const [sheet, setSheet] = useState<any>(null);

  // Leva controls
  const {
    cameraPosition,
    cameraFov,
    ambientIntensity,
    directionalIntensity,
    enableShadows,
  } = useControls(
    'Scene Controls',
    {
      cameraPosition: { value: [0, 0, 8], step: 0.1 },
      cameraFov: { value: 50, min: 10, max: 120, step: 1 },
      ambientIntensity: { value: 0.5, min: 0, max: 2, step: 0.1 },
      directionalIntensity: { value: 1, min: 0, max: 3, step: 0.1 },
      enableShadows: { value: true },
    },
    { collapsed: true }
  );

  useEffect(() => {
    if (enableTheatre) {
      const initializeTheatre = async () => {
        try {
          // Theatre.jsの状態が破損している可能性があるため、事前にlocalStorageを完全にクリア
          // 重要: studioを初期化する前にクリアする必要がある（studioは初期化時にlocalStorageから状態を読み込むため）
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
              // すべてのTheatre.js関連のキーを削除
              const keys = Object.keys(localStorage);
              keys.forEach(key => {
                if (key.includes('Theatre.js') || key.includes('theatre') || key.includes('Omikuji Scene')) {
                  localStorage.removeItem(key);
                }
              });
              // IndexedDBもクリア（Theatre.jsが使用する可能性がある）
              if ('indexedDB' in window) {
                try {
                  // IndexedDBのクリアが完了するまで待機
                  const databases = await indexedDB.databases();
                  await Promise.all(
                    databases
                      .filter(db => db.name && (db.name.includes('Theatre.js') || db.name.includes('theatre')))
                      .map(db => {
                        return new Promise<void>((resolve, reject) => {
                          const deleteRequest = indexedDB.deleteDatabase(db.name!);
                          deleteRequest.onsuccess = () => resolve();
                          deleteRequest.onerror = () => reject(deleteRequest.error);
                          deleteRequest.onblocked = () => {
                            // ブロックされた場合は少し待ってから再試行
                            setTimeout(() => resolve(), 100);
                          };
                        });
                      })
                  );
                } catch (e) {
                  // IndexedDBアクセスのエラーは無視
                }
              }
              // ストレージクリア後に少し待機してから初期化（確実にクリアが反映されるように）
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {
              // localStorageクリアのエラーは無視
            }
          }

          // 開発環境でのみ@theatre/studioをロード（プロジェクト状態の管理のため）
          // 注意: ストレージをクリアした後に初期化することで、studioがクリーンな状態で開始される
          let studioLoaded = false;
          if (process.env.NODE_ENV === 'development') {
            try {
              const studio = await import('@theatre/studio');
              studio.default.initialize();
              studioLoaded = true;
            } catch (studioError) {
              // @theatre/studioのロードに失敗しても続行
              console.warn('Failed to load @theatre/studio:', studioError);
            }
          }

          // プロジェクト名を固定（タイムスタンプを使うと毎回新しいプロジェクトが作成され、状態管理が複雑になる）
          const projectName = 'Omikuji Scene';
          
          // Theatre.jsプロジェクトの初期化
          // studioがロードされている場合は自動的に状態が管理される
          // studioがロードされていない場合でも、configを渡さずに初期化できる
          // Theatre.jsは自動的に空のプロジェクト状態を作成する
          let theatreProject;
          try {
            theatreProject = getProject(projectName);
          } catch (projectError) {
            // getProjectでエラーが発生した場合、プロジェクト名を変更して再試行
            console.warn('Failed to get project with default name, trying with timestamp:', projectError);
            const fallbackProjectName = `Omikuji Scene ${Date.now()}`;
            theatreProject = getProject(fallbackProjectName);
          }

          const theatreSheet = theatreProject.sheet('Main Sheet');

          // アニメーション設定
          if (isShaking) {
            const boxObj = theatreSheet.object('OmikujiBox', {
              position: t.compound({
                x: t.number(0, { range: [-2, 2] }),
                y: t.number(0, { range: [-2, 2] }),
                z: t.number(0, { range: [-2, 2] }),
              }),
              rotation: t.compound({
                x: t.number(0, { range: [-Math.PI, Math.PI] }),
                y: t.number(0, { range: [-Math.PI, Math.PI] }),
                z: t.number(0, { range: [-Math.PI, Math.PI] }),
              }),
            });

            // 振るアニメーション - Theatre.jsのアニメーションはStudioで設定するか、
            // またはsequenceを使用します。ここではオブジェクトの定義のみ行います。
            // 実際のアニメーションは@theatre/r3fのeditableコンポーネントが自動的に処理します。
          }

          setProject(theatreProject);
          setSheet(theatreSheet);
          return true;
        } catch (error) {
          console.error('Theatre.js initialization failed, disabling Theatre.js:', error);
          // エラーが発生した場合、Theatre.jsを完全に無効化
          setProject(null);
          setSheet(null);
          return false;
        }
      };

      initializeTheatre();

      return () => {
        // Theatre.jsプロジェクトのクリーンアップ
      };
    } else {
      setProject(null);
      setSheet(null);
    }
  }, [enableTheatre, isShaking]);

  return (
    <>
      {enableLeva && <Leva collapsed />}
      <Canvas
        shadows={enableShadows}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {enableTheatre && project && sheet ? (
          <SheetProvider sheet={sheet}>
            <PerspectiveCamera
              makeDefault
              position={cameraPosition}
              fov={cameraFov}
            />

            {/* ライティング */}
            <ambientLight intensity={ambientIntensity} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={directionalIntensity}
              castShadow={enableShadows}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <pointLight position={[-5, -5, 5]} intensity={0.5} color="#fbbf24" />

            {/* 環境光 */}
            <Environment preset="night" />

            <Suspense fallback={null}>
              {/* おみくじ箱 */}
              <OmikujiBox isShaking={isShaking} position={[0, 0, 0]} sheet={sheet} />

              {/* 小判 */}
              {showCoins &&
                coins.map((coin, index) => (
                  <Coin
                    key={coin.id}
                    position={coin.position}
                    text={coin.text}
                    delay={coin.delay}
                    isSpiraling={isShaking}
                    sheet={sheet}
                    theatreKey={`Coin${index}`}
                  />
                ))}

              {/* 花火 */}
              {showFireworks &&
                fireworks.map((fw, index) => (
                  <Firework
                    key={fw.id}
                    position={fw.position}
                    color={fw.color}
                    delay={fw.delay}
                    sheet={sheet}
                    theatreKey={`Firework${index}`}
                  />
                ))}
            </Suspense>

            {/* コントロール（開発用） */}
            {process.env.NODE_ENV === 'development' && (
              <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
            )}
          </SheetProvider>
        ) : (
          <>
            <PerspectiveCamera makeDefault position={cameraPosition} fov={cameraFov} />

            {/* ライティング */}
            <ambientLight intensity={ambientIntensity} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={directionalIntensity}
              castShadow={enableShadows}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <pointLight position={[-5, -5, 5]} intensity={0.5} color="#fbbf24" />

            {/* 環境光 */}
            <Environment preset="night" />

            <Suspense fallback={null}>
              {/* おみくじ箱 */}
              <OmikujiBox isShaking={isShaking} position={[0, 0, 0]} sheet={undefined} />

              {/* 小判 */}
              {showCoins &&
                coins.map((coin) => (
                  <Coin
                    key={coin.id}
                    position={coin.position}
                    text={coin.text}
                    delay={coin.delay}
                    isSpiraling={isShaking}
                    sheet={undefined}
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
                    sheet={undefined}
                  />
                ))}
            </Suspense>

            {/* コントロール（開発用） */}
            {process.env.NODE_ENV === 'development' && (
              <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
            )}
          </>
        )}
      </Canvas>
    </>
  );
}

