// app/seller-purchase-standard/page.tsx
// Phase 2.3: Next.js画面移行（出店者レジ画面 - 大人モード）

'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';

type Step = 'intro' | 'camera' | 'analyzing' | 'form' | 'confirm' | 'done';

export default function SellerPurchaseStandardPage() {
  const searchParams = useSearchParams();
  const sellerIdParam = searchParams.get('s');
  
  const [sellerId, setSellerId] = useState<string | null>(sellerIdParam);
  const [sellerName, setSellerName] = useState<string>('出店者');
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string>('');
  
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [capturedImageDataURL, setCapturedImageDataURL] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cashless'>('cashless');
  const [amount, setAmount] = useState<string>('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sellerId) {
      setSellerId('seller_demo');
    }
  }, [sellerId]);

  useEffect(() => {
    async function checkSubscription() {
      if (!sellerId) return;
      
      try {
        const res = await fetch(`/api/seller/summary?s=${encodeURIComponent(sellerId)}`);
        const data = await res.json();
        
        if (!res.ok) {
          setIsBlocked(true);
          setBlockedMessage('売上情報の取得に失敗しました。時間をおいて再度お試しください。');
          return;
        }
        
        setSellerName(data.displayName || data.sellerId || '出店者');
        
        if (data.isSubscribed === false || data.planType === 'standard' || !data.planType) {
          setIsBlocked(true);
          setBlockedMessage('このレジ画面は、対象のプランご契約中の出店者さま専用です。運営までお問合せください。');
          return;
        }
      } catch (e) {
        setIsBlocked(true);
        setBlockedMessage('通信エラーが発生しました。ネットワークをご確認ください。');
      }
    }
    
    if (sellerId) {
      checkSubscription();
    }
  }, [sellerId]);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      alert('カメラへのアクセスが拒否されました。設定を確認してください。');
      setCurrentStep('intro');
    }
  };

  const closeCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImageDataURL(dataURL);
    }
  };

  const analyzeImage = async () => {
    if (!capturedImageDataURL) {
      alert('画像が取得できませんでした。もう一度撮影してください。');
      setCurrentStep('camera');
      return;
    }
    
    setCurrentStep('analyzing');
    
    const blob = dataURLtoBlob(capturedImageDataURL);
    const form = new FormData();
    form.append('image', blob, 'item.jpg');
    
    try {
      const res = await fetch('/api/analyze-item', {
        method: 'POST',
        body: form
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      setAiAnalysisResult(data || {});
      setCurrentStep('form');
      
      // AIで合計金額が出ていれば初期値に利用
      if (data.total && data.total > 0) {
        setAmount(String(data.total));
      }
    } catch (e) {
      alert('AI解析に失敗しました。通信状況を確認して、もう一度お試しください。');
      setCurrentStep('intro');
      closeCamera();
    }
  };

  const registerSale = async () => {
    if (!sellerId || !amount || parseInt(amount) < 100) {
      alert('金額を正しく入力してください（100円以上）。');
      return;
    }
    
    try {
      const res = await fetch('/api/pending/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId,
          amount: parseInt(amount),
          summary: aiAnalysisResult?.summary || '',
          imageData: capturedImageDataURL,
          aiAnalysis: aiAnalysisResult || {},
          paymentMethod
        })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      setCurrentOrderId(data.orderId || null);
      
      const base = window.location.origin;
      let checkoutUrl = null;
      
      if (data.checkoutUrl) {
        checkoutUrl = data.checkoutUrl;
      } else if (data.orderId) {
        checkoutUrl = `${base}/checkout?s=${encodeURIComponent(sellerId)}&order=${encodeURIComponent(data.orderId)}`;
      } else {
        checkoutUrl = `${base}/checkout?s=${encodeURIComponent(sellerId)}`;
      }
      
      setQrUrl(checkoutUrl);
      setCurrentStep('done');
      
      // QRコード生成
      if (paymentMethod !== 'cash' && checkoutUrl && qrCodeRef.current) {
        if (typeof window !== 'undefined' && (window as any).QRCode) {
          qrCodeRef.current.innerHTML = '';
          new (window as any).QRCode(qrCodeRef.current, {
            text: checkoutUrl,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: (window as any).QRCode.CorrectLevel.M
          });
        }
      }
    } catch (e) {
      alert('登録に失敗しました。時間をおいて再度お試しください。');
      setCurrentStep('intro');
    }
  };

  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8 = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8], { type: mime });
  };

  const handleStartCamera = () => {
    setCurrentStep('camera');
    openCamera();
  };

  const handleCapture = () => {
    captureImage();
    closeCamera();
    analyzeImage();
  };

  const handleCloseCamera = () => {
    closeCamera();
    setCurrentStep('intro');
  };

  const handleNextToConfirm = () => {
    if (!amount || parseInt(amount) < 100) {
      alert('金額を100円以上で入力してください。');
      return;
    }
    setCurrentStep('confirm');
  };

  const handleNextItem = () => {
    setCapturedImageDataURL(null);
    setAiAnalysisResult(null);
    setCurrentOrderId(null);
    setQrUrl(null);
    setAmount('');
    setPaymentMethod('cashless');
    setCurrentStep('intro');
  };

  if (isBlocked) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>このレジ画面はご利用いただけません</h1>
        <p style={{ fontSize: '.9rem', lineHeight: '1.6' }}>{blockedMessage}</p>
      </div>
    );
  }

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js" />
      <div className="seller-purchase-app">
        <style jsx>{`
          :root {
            --bg: #f4f0e8;
            --panel: #ffffff;
            --border: #d4c8b8;
            --ink: #1f2933;
            --muted: #6b7280;
            --accent: #1d4f91;
            --accent-soft: #e0e7ff;
            --danger: #b91c1c;
            --radius: 14px;
            --shadow: 0 8px 18px rgba(15,23,42,0.15);
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
            background: radial-gradient(circle at 0 0, rgba(148,163,184,.12), transparent 55%),
                        radial-gradient(circle at 100% 100%, rgba(148,163,184,.12), transparent 55%),
                        var(--bg);
            color: var(--ink);
          }
          .seller-purchase-app {
            max-width: 520px;
            margin: 0 auto;
            min-height: 100vh;
            background: linear-gradient(180deg, #fdfaf5 0%, #f7f2e9 40%, #fff 100%);
            display: flex;
            flex-direction: column;
          }
          header {
            padding: 10px 14px 6px;
            border-bottom: 1px solid rgba(148,163,184,.25);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            background: rgba(255,255,255,.85);
            backdrop-filter: blur(10px);
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .brand-mark {
            width: 30px;
            height: 30px;
            border-radius: 999px;
            background: radial-gradient(circle at 25% 25%, #fff 0, #fff 28%, #1d4f91 60%, #111827 100%);
            box-shadow: 0 0 0 2px rgba(15,23,42,.06);
            position: relative;
            overflow: hidden;
          }
          .brand-mark::after {
            content: "市";
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            color: #fef9c3;
            text-shadow: 0 1px 2px rgba(15,23,42,.6);
          }
          .brand-text-main {
            font-size: .95rem;
            font-weight: 700;
            letter-spacing: .06em;
          }
          .brand-text-sub {
            font-size: .72rem;
            color: var(--muted);
          }
          .seller-chip {
            max-width: 40%;
            font-size: .75rem;
            padding: 4px 8px;
            background: var(--accent-soft);
            color: var(--accent);
            border-radius: 999px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          main {
            flex: 1;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .step {
            display: none;
          }
          .step.active {
            display: block;
          }
          .card {
            background: var(--panel);
            border-radius: var(--radius);
            padding: 16px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
          }
          .step-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 8px;
            font-size: 1.1rem;
            font-weight: 700;
          }
          .step-sub {
            margin: 0 0 12px;
            font-size: .85rem;
            color: var(--muted);
            line-height: 1.6;
          }
          .btn {
            width: 100%;
            padding: 12px 16px;
            border-radius: 10px;
            border: none;
            font-size: .9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all .12s ease;
          }
          .btn-primary {
            background: var(--accent);
            color: #fff;
          }
          .btn-primary:hover {
            background: #1a4480;
          }
          .btn-secondary {
            background: #f3f4f6;
            color: var(--ink);
            border: 1px solid #e5e7eb;
          }
          .btn:disabled {
            opacity: .5;
            cursor: not-allowed;
          }
          .hint {
            font-size: .75rem;
            color: var(--muted);
            margin-top: 8px;
            line-height: 1.5;
          }
          #videoContainer {
            position: relative;
            width: 100%;
            height: calc(100vh - 72px);
            max-height: 780px;
            background: #000;
            border-radius: var(--radius);
            overflow: hidden;
          }
          #video {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          #canvas {
            display: none;
          }
          #cameraOverlay {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 10px;
            pointer-events: none;
          }
          .camera-bottom {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 18px;
            pointer-events: auto;
          }
          #captureBtn {
            width: 82px;
            height: 82px;
            border-radius: 50%;
            border: 5px solid #e5e7eb;
            background: #f9fafb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.35rem;
            cursor: pointer;
          }
          #closeCameraBtn {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            border-radius: 999px;
            border: none;
            background: rgba(15,23,42,.6);
            color: #e5e7eb;
            font-size: 1.05rem;
            cursor: pointer;
            pointer-events: auto;
          }
          .loading-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 14px 26px;
            text-align: center;
          }
          .spinner {
            width: 56px;
            height: 56px;
            border-radius: 999px;
            border: 6px solid #e5e7eb;
            border-top-color: var(--accent);
            animation: spin 1s linear infinite;
            margin-bottom: 12px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .preview {
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(209,213,219,.7);
            margin-bottom: 10px;
            background: #f9fafb;
          }
          .preview img {
            display: block;
            width: 100%;
            height: auto;
          }
          .field-label {
            font-size: .8rem;
            font-weight: 600;
            margin: 10px 0 4px;
          }
          .field-box {
            background: #f9fafb;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            font-size: .86rem;
            color: var(--ink);
            min-height: 34px;
            line-height: 1.5;
          }
          .price-input-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 4px;
          }
          .price-input-wrap {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 6px;
            background: #f9fafb;
            border-radius: 999px;
            border: 1px solid #d1d5db;
            padding: 3px 10px;
          }
          .price-input-wrap input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: 1.2rem;
            font-weight: 600;
            padding: 4px 0;
            outline: none;
            text-align: right;
          }
          .payment-method-group {
            display: flex;
            gap: 8px;
            margin: 8px 0 6px;
          }
          .pay-btn {
            flex: 1;
            border-radius: 999px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            padding: 8px;
            font-size: .78rem;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
          .pay-btn.selected {
            background: #e0edff;
            border-color: #2563eb;
            box-shadow: 0 0 0 1px rgba(37,99,235,.3);
          }
          .qr-box {
            margin: 14px auto 10px;
            padding: 12px;
            max-width: 260px;
            border-radius: 14px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            text-align: center;
          }
          #qrcode {
            display: inline-block;
            padding: 8px;
            background: #fff;
            border-radius: 10px;
          }
          footer {
            padding: 8px 14px 14px;
            font-size: .7rem;
            color: #9ca3af;
            text-align: center;
          }
        `}</style>

        <header>
          <div className="brand">
            <div className="brand-mark" aria-hidden="true"></div>
            <div>
              <div className="brand-text-main">EDO ICHIBA レジ</div>
              <div className="brand-text-sub">FleaPay｜大人モード</div>
            </div>
          </div>
          <div className="seller-chip" id="seller-name">{sellerName}</div>
        </header>

        <main>
          {/* Step A: ガイド */}
          {currentStep === 'intro' && (
            <section className="step active">
              <div className="card">
                <h1 className="step-title">
                  <span className="icon">🧾</span>
                  かんたんレジ（スマホ専用）
                </h1>
                <p className="step-sub">
                  「商品をうつす → 金額を入れる → QRか現金で会計」の
                  3ステップだけです。パソコン操作は必要ありません。
                </p>
                <button className="btn btn-primary" onClick={handleStartCamera} style={{ marginTop: '12px' }}>
                  📷 カメラをひらいて はじめる
                </button>
                <p className="hint">
                  ※ 通信状況が悪いときは、少し待ってからもう一度お試しください。
                </p>
              </div>
            </section>
          )}

          {/* Step B: カメラ */}
          {currentStep === 'camera' && (
            <section className="step active">
              <div className="card" style={{ padding: 0, background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <div id="videoContainer">
                  <video ref={videoRef} id="video" autoPlay playsInline></video>
                  <canvas ref={canvasRef} id="canvas"></canvas>
                  <div id="cameraOverlay">
                    <button id="closeCameraBtn" onClick={handleCloseCamera} title="撮影をやめる">×</button>
                    <div className="camera-bottom">
                      <button id="captureBtn" onClick={handleCapture} title="撮影">
                        <span>📷</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Step C: AI解析中 */}
          {currentStep === 'analyzing' && (
            <section className="step active">
              <div className="card">
                <div className="loading-wrap">
                  <div className="spinner"></div>
                  <div className="loading-text-main">商品情報をよみとっています…</div>
                  <div className="loading-text-sub">
                    画像をAIに送っています。通信状況によって、10〜20秒ほどかかることがあります。
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Step D: 金額入力 */}
          {currentStep === 'form' && (
            <section className="step active">
              <div className="card">
                <h2 className="step-title">
                  <span className="icon">🖼️</span>
                  写真と商品メモの確認
                </h2>
                {capturedImageDataURL && (
                  <div className="preview">
                    <img src={capturedImageDataURL} alt="商品写真" />
                  </div>
                )}
                <div className="field-label">商品メモ（AI推定）</div>
                <div className="field-box">
                  {aiAnalysisResult?.summary || '（AIが読み取った商品メモが表示されます）'}
                </div>
                <p className="hint">
                  商品名や内容は、あとでダッシュボード画面から編集できます。ここでは確認だけでOKです。
                </p>
              </div>

              <div className="card">
                <h2 className="step-title">
                  <span className="icon">💴</span>
                  合計金額を入力
                </h2>
                <p className="step-sub">
                  この商品セット「ぜんぶでいくらか」を入れてください。1円単位でOKです。
                </p>
                <div className="field-label">合計金額</div>
                <div className="price-input-row">
                  <div className="price-pill">税込</div>
                  <div className="price-input-wrap">
                    <span>¥</span>
                    <input
                      type="number"
                      id="amountInput"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleNextToConfirm}
                  disabled={!amount || parseInt(amount) < 100}
                  style={{ marginTop: '14px' }}
                >
                  次へ（支払い方法をえらぶ）
                </button>
              </div>
            </section>
          )}

          {/* Step E: 最終確認＋支払い方法 */}
          {currentStep === 'confirm' && (
            <section className="step active">
              <div className="card">
                <h2 className="step-title">
                  <span className="icon">✅</span>
                  内容の確認
                </h2>
                <div className="summary-card">
                  <div className="summary-row">
                    <span>商品メモ</span>
                    <span style={{ maxWidth: '55%', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {aiAnalysisResult?.summary || '（商品メモなし）'}
                    </span>
                  </div>
                  <div className="summary-row summary-row-total">
                    <span>合計</span>
                    <span>¥{parseInt(amount || '0').toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 className="step-title">
                  <span className="icon">💳</span>
                  受け取り方法
                </h2>
                <p className="step-sub">
                  お客さまから「現金で受け取る」か「QR・カードで支払ってもらう」かを選んでください。
                </p>
                <div className="payment-method-group">
                  <button
                    type="button"
                    className={`pay-btn ${paymentMethod === 'cashless' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('cashless')}
                  >
                    <span className="main">QR・カードで受け取る</span>
                    <span className="sub">スマホ画面にQRを表示して、お客さまに読み取ってもらいます</span>
                  </button>
                  <button
                    type="button"
                    className={`pay-btn ${paymentMethod === 'cash' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <span className="main">現金でもらう</span>
                    <span className="sub">そのまま現金を受け取り、記録だけレジに残します</span>
                  </button>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={registerSale}
                  style={{ marginTop: '10px' }}
                >
                  登録して 会計に進む
                </button>
              </div>
            </section>
          )}

          {/* Step F: 完了 */}
          {currentStep === 'done' && (
            <section className="step active">
              <div className="card">
                <div className="result-main">
                  <h2>
                    {paymentMethod === 'cash' ? '現金での受け取りを記録しました' : 'QR決済の準備ができました'}
                  </h2>
                  <p>
                    {paymentMethod === 'cash'
                      ? 'この売上はダッシュボードに反映されます。つぎの商品を登録しても大丈夫です。'
                      : 'お客さまにQRを見せて、読み取ってもらってください。'}
                  </p>
                </div>

                {paymentMethod !== 'cash' && qrUrl && (
                  <div className="qr-box">
                    <div ref={qrCodeRef} id="qrcode"></div>
                    <p className="small-note" style={{ marginTop: '8px' }}>
                      お客さまのスマホでこのQRを読み取ってもらうと、決済画面が開きます。
                    </p>
                  </div>
                )}

                <button className="btn btn-secondary" onClick={handleNextItem} style={{ marginTop: '4px' }}>
                  つぎの商品を登録する
                </button>
              </div>
            </section>
          )}
        </main>

        <footer>
          FleaPay / EDO ICHIBA WORKS｜出店者レジ 大人モード
        </footer>
      </div>
    </>
  );
}

