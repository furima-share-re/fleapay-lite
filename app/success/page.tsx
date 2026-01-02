// app/success/page.tsx
// Phase 2.3: Next.js画面移行（成功ページ）

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ja' | 'en' | 'zh'>('ja');

  useEffect(() => {
    // 初期言語設定
    const nav = navigator.language || 'ja';
    if (nav.startsWith('en')) setLang('en');
    else if (nav.startsWith('zh')) setLang('zh');
    else setLang('ja');
  }, []);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    async function loadPaymentResult() {
      try {
        const res = await fetch(`/api/checkout/result?orderId=${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          setPaymentData(data);
        }
      } catch (e) {
        console.error('loadPaymentResult error', e);
      } finally {
        setLoading(false);
      }
    }

    loadPaymentResult();
  }, [orderId]);

  const formatJPY = (n: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
  };

  const dict = {
    ja: {
      badge: 'Payment Completed / 決済完了',
      title: '決済が完了しました',
      lead: 'この画面を出店スタッフにお見せください。',
      notice: '✅ 決済が完了しました。\n出店スタッフが商品をお渡しします。\n※商品お渡し後の返品・交換はご遠慮ください。',
      meta: 'Thanks for supporting local creators & flea market culture.\n※必要に応じて、スタッフから決済IDの確認をお願いする場合があります。'
    },
    en: {
      badge: 'Payment Completed',
      title: 'Payment Completed',
      lead: 'Please show this screen to the shop staff.',
      notice: '✅ Your payment has been completed.\nThe staff will hand you your item.\n*Refunds and exchanges are not available after receiving your item.',
      meta: 'Thank you for supporting local creators and flea market culture.\n*Staff may ask you to confirm your payment ID if necessary.'
    },
    zh: {
      badge: '付款完成',
      title: '付款已完成',
      lead: '请将此画面出示给摊主。',
      notice: '✅ 付款已完成。\n摊主会为您递上商品。\n※领取商品后,恕不接受退换。',
      meta: '感谢您支持本地创作者与跳蚤市集文化。\n※如有需要,工作人员可能会请您确认付款编号。'
    }
  };

  const t = dict[lang];

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Fleapay｜決済完了</title>
        <link href="https://fonts.googleapis.com/css2?family=Yusei+Magic&family=M+PLUS+Rounded+1c:wght@500;700;900&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root{
            --night1:#0f2740;
            --night2:#193e5b;
            --haze:#24465f;
            --paper:rgba(255,255,240,.90);
            --paper-stroke:rgba(30,40,40,.16);
            --ink:#234236;
            --gold:#f6c86b;
            --lamp-core:#fff6cc;
            --leaf1:#9ed0b8;
            --leaf2:#6fb59a;
          }
          *{box-sizing:border-box;margin:0;padding:0}
          html,body{height:100%}
          body{
            font-family:'Yusei Magic','M PLUS Rounded 1c',system-ui,-apple-system,Segoe UI,Roboto,'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;
            color:var(--ink);
            background: radial-gradient(120% 100% at 50% -10%, #274d6a 0%, var(--night1) 40%, var(--night2) 100%);
            overflow:hidden;
          }
          .card-wrap{position:relative; z-index:10; display:grid; place-items:center; height:100vh; padding:24px}
          .card{
            position:relative;
            width:min(92vw,760px);
            padding:32px 24px 30px;
            text-align:center;
            background:var(--paper);
            border-radius:26px;
            box-shadow: 0 24px 68px rgba(0,0,0,.35), 0 0 0 1px var(--paper-stroke) inset;
            backdrop-filter: blur(4px) saturate(1.05);
            border: 2px solid rgba(246,200,107,.6);
          }
          h1{
            font-size: clamp(26px,4.2vw,42px);
            line-height:1.22;
            font-weight:900;
            margin-bottom:6px;
            color:#205a3e;
          }
          p.lead{
            font-size: 14px;
            color: rgba(30,40,40,.9);
            font-weight:700;
            margin-bottom:14px;
          }
          .badge{
            display:inline-flex;
            align-items:center;
            gap:10px;
            padding:8px 16px;
            border-radius:999px;
            font-weight:900;
            color:#063b2a;
            background: linear-gradient(135deg,#5ac18e,#b0ffb4);
            box-shadow:0 8px 18px rgba(20,100,60,.23);
            margin-bottom:12px;
            font-size:13px;
          }
          .notice {
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(60,70,50,0.2);
            border-radius: 14px;
            padding: 10px 14px;
            margin: 0 auto 14px;
            font-size: 13px;
            color: #234236;
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
            line-height: 1.6;
            text-align:left;
            max-width: 520px;
            white-space: pre-line;
          }
          .payment-info{
            background: rgba(255,255,255,0.96);
            border: 1px dashed rgba(60,70,50,0.32);
            border-radius: 14px;
            padding: 10px 14px;
            margin: 0 auto 14px;
            font-size: 13px;
            color: #234236;
            box-shadow: 0 4px 10px rgba(0,0,0,0.06);
            max-width: 520px;
            text-align:left;
          }
          .payment-info-row{
            display:flex;
            align-items:baseline;
            justify-content:space-between;
            gap:8px;
            margin-bottom:4px;
          }
          .payment-info-label{
            font-weight:900;
            font-size:12px;
            color:#234236;
          }
          .payment-info-value{
            font-weight:900;
            font-size:14px;
          }
          .payment-info-value.status-ok{ color:#0b6940; }
          .payment-info-value.status-pending{ color:#b86a00; }
          .payment-info-value.status-error{ color:#9b1c31; }
          .payment-info-hint{
            margin-top:6px;
            font-size:11px;
            color:rgba(60,60,60,0.9);
            line-height:1.6;
          }
          .meta{
            font-size:11px;
            color:rgba(50,60,60,.9);
            margin-top:12px;
            line-height:1.5;
            white-space: pre-line;
          }
          .lang{
            position:fixed;
            right:12px;
            bottom:12px;
            z-index:20;
            display:flex;
            gap:8px;
          }
          .lang button{
            font:inherit;
            padding:6px 9px;
            border-radius:12px;
            border:1px solid rgba(20,60,40,.18);
            background:rgba(255,255,255,.86);
            cursor:pointer;
            font-size:12px;
          }
          .lang button.active{
            background:#205a3e;
            color:#fff;
            border-color:#205a3e;
          }
        ` }} />
      </head>
      <body>
        <div className="card-wrap">
          <article className="card">
            <div className="badge">
              <span>✓</span>
              <span>{t.badge}</span>
              <span>✓</span>
            </div>

            <h1>{t.title}</h1>

            <p className="lead">{t.lead}</p>

            {loading ? (
              <div className="payment-info">
                <div className="payment-info-row">
                  <span className="payment-info-label">決済ステータス</span>
                  <span className="payment-info-value status-pending">確認中…</span>
                </div>
              </div>
            ) : paymentData ? (
              <div className="payment-info">
                <div className="payment-info-row">
                  <span className="payment-info-label">決済ステータス</span>
                  <span className={`payment-info-value ${paymentData.isPaid ? 'status-ok' : 'status-pending'}`}>
                    {paymentData.isPaid ? '完了' : '未完了／確認中'}
                  </span>
                </div>
                <div className="payment-info-row">
                  <span className="payment-info-label">お支払い金額</span>
                  <span className="payment-info-value">
                    {paymentData.amount ? formatJPY(paymentData.amount) : '-'}
                  </span>
                </div>
                <p className="payment-info-hint">
                  店員さんへ：この画面で「決済ステータス」と「お支払い金額」が表示されているかご確認ください。
                </p>
              </div>
            ) : (
              <div className="payment-info">
                <div className="payment-info-row">
                  <span className="payment-info-label">決済ステータス</span>
                  <span className="payment-info-value status-error">状態不明</span>
                </div>
              </div>
            )}

            <div className="notice">
              <p>{t.notice}</p>
            </div>

            <p className="meta">{t.meta}</p>
          </article>
        </div>

        <div className="lang" aria-label="Language">
          <button 
            className={lang === 'ja' ? 'active' : ''}
            onClick={() => setLang('ja')}
          >
            日本語
          </button>
          <button 
            className={lang === 'en' ? 'active' : ''}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button 
            className={lang === 'zh' ? 'active' : ''}
            onClick={() => setLang('zh')}
          >
            中文
          </button>
        </div>
      </body>
    </html>
  );
}

