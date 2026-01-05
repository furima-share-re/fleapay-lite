// app/cancel/page.tsx
// Phase 2.3: Next.js画面移行（キャンセルページ）

'use client';

import { useState, useEffect } from 'react';

export default function CancelPage() {
  const [lang, setLang] = useState<'ja' | 'en' | 'zh'>('ja');

  useEffect(() => {
    const nav = navigator.language || 'ja';
    if (nav.startsWith('en')) setLang('en');
    else if (nav.startsWith('zh')) setLang('zh');
    else setLang('ja');
  }, []);

  const dict = {
    ja: {
      title: '決済は完了していません',
      body: 'お支払いがキャンセルされました。\nカードや金額をご確認のうえ、必要であればもう一度お試しください。',
      status: '✕ Payment Not Completed / 決済未完了',
      notice: 'この画面が表示されている場合、決済は行われていません。\n商品はまだお受け取りいただけません。\n再度お支払いを行うか、出店スタッフにご相談ください。',
      tips: 'うまくいかない場合のチェック例：\n• 電波状況（Wi-Fi / 電波）が弱くなっていないか\n• カード番号や有効期限の入力に誤りがないか\n• ご利用カードの限度額・残高に余裕があるか',
      encourage: '今日は購入まで、あと少しでした。\n「また試してみよう」という気持ちが、次の『できた！』につながります。',
      retry: 'もう一度試す',
      home: 'トップに戻る',
      meta: 'This transaction has not been charged.\nIf you are unsure, please ask the flea market staff.'
    },
    en: {
      title: 'Payment Not Completed',
      body: 'Your payment has been cancelled.\nPlease check your card details and amount, then try again if you wish.',
      status: '✕ Payment Not Completed',
      notice: 'If you see this screen, your payment has not been processed.\nYou cannot receive the item yet.\nPlease try the payment again, or ask the flea market staff for help.',
      tips: 'If payment keeps failing, please check:\n• Network connection (Wi-Fi / mobile signal)\n• Card number and expiry date are correct\n• Enough balance or credit limit on your card',
      encourage: 'You were very close to completing your purchase today.\nTrying again next time will lead to your next "I did it!".',
      retry: 'Try again',
      home: 'Back to top',
      meta: 'No charge has been made for this transaction.\nIf you are unsure, please ask the flea market staff.'
    },
    zh: {
      title: '付款尚未完成',
      body: '您的付款已被取消。\n请确认卡片与金额，如有需要可以重新尝试。',
      status: '✕ 付款未完成',
      notice: '如果您看到此画面，说明尚未成功扣款。\n目前还不能领取商品。\n请重新进行付款，或向摊主／工作人员咨询。',
      tips: '反复失败时，可检查以下项目：\n• 网络状况（Wi-Fi / 信号）是否良好\n• 卡号及有效期输入是否正确\n• 卡片额度或余额是否充足',
      encourage: '今天离成功购买只差一点点。\n"再试一次"的心情，会带来下一次的「我做到了！」。',
      retry: '再试一次',
      home: '返回首页',
      meta: '本次交易尚未扣款。\n如有疑问，请向市集工作人员确认。'
    }
  };

  const t = dict[lang];

  return (
    <html lang={lang}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Fleapay｜決済が完了していません</title>
        {/* Fonts are loaded in root layout.tsx */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root{
            --night1:#0f2740;
            --night2:#193e5b;
            --paper:rgba(255,255,240,.94);
            --paper-stroke:rgba(30,40,40,.16);
            --ink:#233238;
            --accent:#ffb88a;
            --accent-soft:#ffe1c6;
            --lamp-core:#fff6cc;
          }
          *{box-sizing:border-box;margin:0;padding:0}
          html,body{height:100%}
          body{
            font-family:'Yusei Magic','M PLUS Rounded 1c',system-ui,-apple-system,Segoe UI,Roboto,'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;
            color:var(--ink);
            background: radial-gradient(120% 100% at 50% -10%, #243c5a 0%, var(--night1) 40%, var(--night2) 100%);
            overflow:hidden;
          }
          .card-wrap{position:relative; z-index:10; display:grid; place-items:center; height:100vh; padding:24px}
          .card{
            position:relative;
            width:min(92vw,760px);
            padding:38px 28px;
            text-align:center;
            background:var(--paper);
            border-radius:26px;
            box-shadow: 0 22px 60px rgba(0,0,0,.32), 0 0 0 1px var(--paper-stroke) inset;
            backdrop-filter: blur(4px) saturate(1.02);
            border: 2px solid rgba(210,170,130,.55);
          }
          h1{
            font-size: clamp(24px,3.7vw,36px);
            line-height:1.4;
            font-weight:900;
            margin-bottom:8px;
            color:#3b3a30;
          }
          p.lead{
            font-size: 14px;
            color: rgba(40,50,50,.95);
            font-weight:700;
            margin-bottom:14px;
            white-space: pre-line;
          }
          .status{
            display:inline-flex;
            align-items:center;
            gap:10px;
            padding:8px 16px;
            border-radius:999px;
            font-weight:900;
            color:#5c2a24;
            background: linear-gradient(135deg,#ffd1ba,#ff9a8b);
            box-shadow:0 8px 20px rgba(150,60,40,.28);
            margin-bottom:14px;
            font-size:13px;
          }
          .notice{
            background: rgba(255,255,255,0.96);
            border: 1px solid rgba(90,80,60,0.18);
            border-radius: 14px;
            padding: 10px 14px;
            margin-bottom: 12px;
            font-size: 13px;
            color: #3a3a36;
            box-shadow: 0 4px 10px rgba(0,0,0,0.06);
            line-height: 1.7;
            text-align:left;
            white-space: pre-line;
          }
          .notice strong{font-weight:900;}
          .tips{
            margin-bottom: 10px;
            font-size:13px;
            color:rgba(60,60,60,.9);
            text-align:left;
            line-height:1.6;
            white-space: pre-line;
          }
          .encourage{
            font-size:13px;
            margin-top:4px;
            margin-bottom: 12px;
            color:rgba(70,70,70,.95);
            white-space: pre-line;
          }
          .actions{
            display:flex;
            gap:10px;
            justify-content:center;
            flex-wrap:wrap;
            margin-top:6px;
          }
          .btn{
            padding:10px 16px;
            border-radius:13px;
            border:1px solid rgba(16,60,40,.14);
            background:rgba(255,255,255,.9);
            font-weight:700;
            cursor:pointer;
            box-shadow:0 6px 14px rgba(30,80,60,.14);
            transition:.22s;
            font-size:13px;
            min-width:130px;
          }
          .btn-primary{
            background:linear-gradient(135deg,#ffb88a,#ff9a8b);
            color:#4a2a18;
            border-color:rgba(200,120,80,.7);
          }
          .btn:hover{
            transform:translateY(-2px);
            box-shadow:0 10px 20px rgba(30,80,60,.22);
          }
          .meta{
            font-size:11px;
            color:rgba(80,80,80,.9);
            margin-top:10px;
            line-height:1.6;
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
            background:rgba(255,255,255,.9);
            cursor:pointer;
            font-size:12px;
          }
          .lang button.active{
            background:#3b3a30;
            color:#fff;
            border-color:#3b3a30;
          }
        ` }} />
      </head>
      <body>
        <div className="card-wrap">
          <article className="card">
            <h1>{t.title}</h1>

            <p className="lead">{t.body}</p>

            <div className="status">
              <span>✕</span>
              <span>{t.status.replace(/^✕\s*/, '')}</span>
            </div>

            <div className="notice">
              <p><strong>{t.notice.split('\n')[0]}</strong><br />{t.notice.split('\n').slice(1).join('\n')}</p>
            </div>

            <div className="tips">
              <strong>{t.tips.split('\n')[0]}</strong>
              <ul style={{ paddingLeft: '1.2em', marginTop: '4px' }}>
                {t.tips.split('\n').slice(1).map((tip, i) => (
                  <li key={i}>{tip.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </div>

            <p className="encourage">{t.encourage}</p>

            <div className="actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = '/';
                  }
                }}
              >
                {t.retry}
              </button>
              <button 
                className="btn"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                {t.home}
              </button>
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

