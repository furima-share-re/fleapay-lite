// app/checkout/page.tsx
// Phase 2.3: Next.js画面移行（チェックアウト画面）

'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';

interface OrderData {
  orderId: string | null;
  sellerId: string | null;
  amount: number;
  summary: string;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const sellerId = searchParams.get('s');
  
  const [lang, setLang] = useState<'ja' | 'en' | 'zh'>('ja');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [allowAutoRetry, setAllowAutoRetry] = useState(true);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [securityExpanded, setSecurityExpanded] = useState(false);

  const MAX_RETRIES = 12;

  useEffect(() => {
    // 初期言語設定
    const nav = navigator.language || 'ja';
    if (nav.startsWith('en')) setLang('en');
    else if (nav.startsWith('zh')) setLang('zh');
    else setLang('ja');
  }, []);

  useEffect(() => {
    // sellerIdのみの場合は自動でorderIdを取得
    if (!orderId && sellerId) {
      fetch(`/api/price/latest?s=${sellerId}`)
        .then(r => r.json())
        .then(data => {
          if (data.orderId) {
            window.location.href = `/checkout?s=${sellerId}&order=${data.orderId}`;
          }
        })
        .catch(err => {
          console.warn('[FleaPay] 自動orderId取得に失敗:', err);
        });
    }
  }, [orderId, sellerId]);

  useEffect(() => {
    if (!orderId && !sellerId) {
      setLoading(false);
      return;
    }

    async function fetchLatest() {
      try {
        let url: string | undefined;
        if (orderId) {
          url = `/api/seller/order-detail?s=${sellerId}&orderId=${encodeURIComponent(orderId)}`;
        } else if (sellerId) {
          url = `/api/price/latest?s=${encodeURIComponent(sellerId)}`;
        }

        if (!url) {
          setLoading(false);
          return;
        }

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.error) {
          if (data.error === 'expired') {
            setAllowAutoRetry(false);
            setLoading(false);
            return;
          } else if (data.error === 'not_found') {
            setAllowAutoRetry(false);
            setLoading(false);
            return;
          }
          throw new Error(data.error);
        }

        if (data && data.amount && parseInt(data.amount, 10) > 0) {
          setOrderData({
            orderId: data.orderId,
            sellerId: data.sellerId || sellerId,
            amount: data.amount,
            summary: data.summary || data.memo || ''
          });
          setRetryCount(0);
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
        } else {
          // 金額が0または未設定 → 空状態画面
          if (allowAutoRetry && retryCount < MAX_RETRIES && !retryTimerRef.current) {
            startAutoRetry();
          }
        }
      } catch (err) {
        console.error('[FleaPay Fetch Error]', err);
        if (allowAutoRetry && retryCount < MAX_RETRIES && !retryTimerRef.current) {
          startAutoRetry();
        }
      } finally {
        setLoading(false);
      }
    }

    function startAutoRetry() {
      if (retryCount >= MAX_RETRIES) {
        return;
      }
      retryTimerRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        fetchLatest();
      }, 5000);
    }

    fetchLatest();

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [orderId, sellerId, retryCount, allowAutoRetry]);

  const formatJPY = (n: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
  };

  const handlePay = async () => {
    if (!orderData) return;

    try {
      const btn = document.getElementById('payBtn');
      if (btn) btn.setAttribute('disabled', 'true');

      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: orderData.sellerId,
          orderId: orderData.orderId,
          summary: orderData.summary,
          latest: !orderId
        })
      });

      if (!response.ok) {
        await response.json().catch(() => ({}));
        alert(dict[lang].errorCheckout || '決済処理でエラーが発生しました。');
        if (btn) btn.removeAttribute('disabled');
        return;
      }

      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      } else {
        alert(dict[lang].errorCheckout || '決済リンクの取得に失敗しました。');
        if (btn) btn.removeAttribute('disabled');
      }
    } catch (error) {
      console.error('[FleaPay] 決済処理エラー:', error);
      alert(dict[lang].errorCheckout || '決済処理でエラーが発生しました。');
      const btn = document.getElementById('payBtn');
      if (btn) btn.removeAttribute('disabled');
    }
  };

  const dict = {
    ja: {
      welcome: 'いらっしゃいませ!',
      enjoy: 'フリマとお祭りをお楽しみください 🎆',
      pay: '{amount} を支払う',
      fetching: '処理中...',
      errorCheckout: '決済処理でエラーが発生しました。もう一度お試しください。',
      errorRateLimit: 'アクセスが集中しています。少し待ってから再度お試しください。',
      errorNotFound: '注文が見つかりませんでした。出店者に確認してください。',
      errorForbidden: 'アクセスが拒否されました。',
      ssl: 'SSL暗号化',
      stripe: 'Stripe認証',
      summaryTitle: '🛍 ご購入内容(出店者が確認済みです)',
      confirm1: '・間違いがないかご確認ください',
      confirm2: '・商品受け取り後の返品・交換はできません',
      safety: '🔒 この決済は Stripe の国際基準で保護されています。カード情報は FleaPay には保存されません。',
      about: 'FleaPayについて',
      emptyTitle: 'ちょっと待って!',
      emptySubtitle: 'まだ宝物を選んでいないよ?',
      step1Title: 'Step 1: 宝物を見つけよう',
      step1Desc: 'お気に入りの商品を探してね',
      step2Title: 'Step 2: 出店者さんに伝えよう',
      step2Desc: '「これください!」と伝えてね',
      step3Title: 'Step 3: 安心決済',
      step3Desc: '出店者さんが準備したらこのQRで決済できるよ!',
      securityQuestion: 'FleaPayは安全?',
      securityBadge1: 'SSL暗号化',
      securityExplain1: 'カード情報は最高水準で保護',
      securityBadge2: 'Stripe認証',
      securityExplain2: '世界中で使われる決済システム',
      securityBadge3: '情報保存なし',
      securityExplain3: 'カード番号はFleaPayに保存されません',
      securityLearnMore: 'もっと詳しく見る →',
      refreshHint: '出店者さんの準備を待っています…',
      stripeRedirect: 'このあと、安全な Stripe の決済画面に移動します。次の画面でカード番号 → 有効期限 → 名義(ローマ字)を入力して《支払う》を押してください。'
    },
    en: {
      welcome: 'Welcome!',
      enjoy: 'Enjoy the flea market & festival 🎆',
      pay: 'Pay {amount}',
      fetching: 'Processing...',
      errorCheckout: 'Payment processing error occurred. Please try again.',
      errorRateLimit: 'Too many requests. Please wait a moment and try again.',
      errorNotFound: 'Order not found. Please check with the seller.',
      errorForbidden: 'Access denied.',
      ssl: 'SSL encryption',
      stripe: 'Powered by Stripe',
      summaryTitle: '🛍 Items to purchase (confirmed by seller)',
      confirm1: '・Please check that the items and amount are correct.',
      confirm2: '・Returns or exchanges are not available after you receive the item.',
      safety: '🔒 Payments are processed securely by Stripe. Your card details are not stored by FleaPay.',
      about: 'About FleaPay',
      emptyTitle: 'Wait a moment!',
      emptySubtitle: "Haven't chosen your treasure yet?",
      step1Title: 'Step 1: Find Your Treasure',
      step1Desc: 'Look for your favorite items',
      step2Title: 'Step 2: Tell the Seller',
      step2Desc: 'Say "I want this!"',
      step3Title: 'Step 3: Safe Payment',
      step3Desc: 'Once the seller is ready, pay with this QR!',
      securityQuestion: 'Is FleaPay Safe?',
      securityBadge1: 'SSL Encrypted',
      securityExplain1: 'Your card info is protected',
      securityBadge2: 'Stripe Certified',
      securityExplain2: 'Trusted payment system worldwide',
      securityBadge3: 'No Storage',
      securityExplain3: 'Card numbers not saved by FleaPay',
      securityLearnMore: 'Learn More →',
      refreshHint: 'Waiting for seller preparation…',
      stripeRedirect: "You will be redirected to Stripe's secure payment page next. On the next Stripe page, enter your card number → expiry date → name, then press Pay."
    },
    zh: {
      welcome: '欢迎光临!',
      enjoy: '祝您在集市和祭典玩得开心 🎆',
      pay: '支付 {amount}',
      fetching: '处理中...',
      errorCheckout: '支付处理出错。请再试一次。',
      errorRateLimit: '访问过于频繁。请稍候再试。',
      errorNotFound: '未找到订单。请与摊主确认。',
      errorForbidden: '访问被拒绝。',
      ssl: 'SSL 加密',
      stripe: 'Stripe 保障',
      summaryTitle: '🛍 购买内容(已由摊主确认)',
      confirm1: '・请确认商品和金额是否正确。',
      confirm2: '・商品领取后无法退货或换货。',
      safety: '🔒 本次支付由 Stripe 安全处理,您的卡信息不会保存在 FleaPay。',
      about: '关于FleaPay',
      emptyTitle: '等一下!',
      emptySubtitle: '还没有选好宝物吗?',
      step1Title: 'Step 1: 发现宝物',
      step1Desc: '寻找你喜欢的商品',
      step2Title: 'Step 2: 告诉摊主',
      step2Desc: '说"我要这个!"',
      step3Title: 'Step 3: 安全支付',
      step3Desc: '摊主准备好后,用这个QR码支付!',
      securityQuestion: 'FleaPay安全吗?',
      securityBadge1: 'SSL加密',
      securityExplain1: '卡片信息受到最高级别保护',
      securityBadge2: 'Stripe认证',
      securityExplain2: '全球信赖的支付系统',
      securityBadge3: '不保存信息',
      securityExplain3: 'FleaPay不保存卡号',
      securityLearnMore: '了解更多 →',
      refreshHint: '正在等待摊主准备…',
      stripeRedirect: '接下来会跳转到 Stripe 安全支付页面。在 Stripe 页面输入 卡号 → 有效期 → 姓名(拼音),然后点击【支付】。'
    }
  };

  const t = dict[lang];
  const amountInt = orderData?.amount ?? 0;
  const isEmpty = !orderData || !amountInt || amountInt <= 0;

  return (
    <>
      <Script src="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Nunito+Sans:wght@400;700;900&display=swap" />
      <div className="checkout-container">
        <style jsx>{`
          :root {
            --shin-ai: #1B365D;
            --kinari: #FBF7F0;
            --sumi: #1A1A1A;
            --usuzumi: #666666;
            --hakken: #E63946;
            --kintsugi: #B8902E;
            --ok: #2D5B3F;
            --warn: #B8860B;
            --err: #8B2635;
            --card-shadow: 0 10px 30px rgba(27,54,93,.10);
            --radius-xl: 20px;
          }
          * { box-sizing: border-box; }
          html, body { height: 100%; margin: 0; }
          body {
            font-family: "Nunito Sans", "Noto Sans JP", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            color: var(--sumi);
            background: var(--kinari);
            background-image: radial-gradient(1200px 700px at 80% -10%, rgba(230,57,70,.06) 0%, transparent 60%),
                              radial-gradient(1200px 700px at -20% 110%, rgba(27,54,93,.08) 0%, transparent 60%);
          }
          .checkout-container {
            max-width: 640px;
            margin: 0 auto;
            padding: 20px;
          }
          .appbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .logo {
            display: flex;
            gap: 8px;
            align-items: baseline;
            user-select: none;
          }
          .logo__wordmark {
            font-family: "Nunito Sans", system-ui;
            font-weight: 900;
            letter-spacing: .03em;
            line-height: 1;
            color: var(--shin-ai);
            font-size: 20px;
          }
          .logo__wordmark .pay { color: var(--kintsugi); }
          .logo__sparkle { font-size: 14px; opacity: .9; margin-left: 2px; }
          .lang-switch {
            display: flex;
            gap: 4px;
            background: rgba(255,255,255,.6);
            border: 1px solid rgba(27,54,93,.15);
            border-radius: 999px;
            padding: 3px;
          }
          .lang-btn {
            width: 34px;
            height: 34px;
            border: 0;
            background: transparent;
            border-radius: 50%;
            font-size: 14px;
            cursor: pointer;
          }
          .lang-btn.active { background: rgba(27,54,93,.08); }
          .card {
            position: relative;
            background: #fff;
            border: 1px solid rgba(27,54,93,.12);
            border-radius: var(--radius-xl);
            padding: 20px;
            box-shadow: var(--card-shadow);
            overflow: hidden;
          }
          .card::after {
            content: "🌸";
            position: absolute;
            bottom: 40px;
            right: 24px;
            font-size: 16px;
            opacity: .45;
            animation: sway 4s ease-in-out infinite;
          }
          @keyframes sway {
            0%, 100% { transform: translateY(0) rotate(0); }
            50% { transform: translateY(-6px) rotate(5deg); }
          }
          .header { padding: 8px 0 12px; }
          .header h1 {
            margin: 8px 0 2px;
            font-size: 24px;
            letter-spacing: .04em;
            color: var(--shin-ai);
          }
          .priceBox {
            background: linear-gradient(180deg, #fff, #fafbff);
            border: 2px solid transparent;
            border-radius: var(--radius-xl);
            padding: 22px 18px;
            position: relative;
            overflow: hidden;
            margin: 10px 0 14px;
          }
          .priceBox::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 3px;
            opacity: .9;
            background: linear-gradient(90deg, var(--hakken) 0%, #ff8a65 25%, var(--shin-ai) 50%, #5c7cfa 75%, var(--hakken) 100%);
          }
          .priceHead {
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: end;
            gap: 10px;
          }
          .ccy {
            font-size: 12px;
            letter-spacing: .12em;
            color: #475569;
            border: 1px solid rgba(27,54,93,.15);
            border-radius: 999px;
            padding: 4px 8px;
            background: #fff;
          }
          .price {
            font-weight: 900;
            font-size: 48px;
            letter-spacing: 1px;
            line-height: 1;
            margin: 8px 0;
            background: linear-gradient(135deg, var(--shin-ai), var(--hakken));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .summary {
            margin: 12px 0 0;
            font-size: 13px;
            color: #334155;
            white-space: pre-line;
          }
          .empty-state-view {
            text-align: center;
            padding: 32px 20px;
            animation: fadeIn 0.5s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .sakura-float {
            font-size: 36px;
            animation: sakura-gentle 3s ease-in-out infinite;
            display: block;
            margin-bottom: 16px;
          }
          @keyframes sakura-gentle {
            0%, 100% { transform: translateY(0) rotate(-5deg); opacity: 0.6; }
            50% { transform: translateY(-8px) rotate(5deg); opacity: 0.9; }
          }
          .exciting-title {
            font-family: 'Nunito Sans', 'Noto Sans JP', sans-serif;
            font-weight: 700;
            font-size: 24px;
            color: var(--hakken);
            letter-spacing: 0.02em;
            margin: 0 0 8px 0;
          }
          .sub-title {
            font-family: 'Nunito Sans', 'Noto Sans JP', sans-serif;
            font-weight: 600;
            font-size: 16px;
            color: var(--shin-ai);
            margin: 0;
            line-height: 1.5;
          }
          .steps-guide {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 28px;
          }
          .step-card {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(251,247,240,0.8));
            border: 1px solid rgba(27,54,93,0.12);
            border-radius: 12px;
            text-align: left;
          }
          .step-icon {
            font-size: 28px;
            flex-shrink: 0;
          }
          .step-content {
            flex: 1;
          }
          .step-title {
            font-family: 'Nunito Sans', 'Noto Sans JP', sans-serif;
            font-weight: 700;
            font-size: 15px;
            color: var(--shin-ai);
            margin: 0 0 4px 0;
          }
          .step-desc {
            font-family: 'Nunito Sans', 'Noto Sans JP', sans-serif;
            font-weight: 400;
            font-size: 13px;
            color: var(--usuzumi);
            margin: 0;
            line-height: 1.5;
          }
          .security-section {
            margin: 24px 0;
            border-top: 1px solid rgba(27,54,93,0.08);
            padding-top: 20px;
          }
          .security-toggle {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 16px;
            background: linear-gradient(135deg, rgba(27,54,93,0.05), rgba(27,54,93,0.08));
            border: 1px solid rgba(27,54,93,0.15);
            border-radius: 999px;
            cursor: pointer;
            font-family: 'Nunito Sans', 'Noto Sans JP', sans-serif;
            font-weight: 700;
            font-size: 14px;
            color: var(--shin-ai);
          }
          .security-details {
            margin-top: 16px;
            padding: 16px;
            background: rgba(255,255,255,0.6);
            border: 1px solid rgba(27,54,93,0.08);
            border-radius: 12px;
          }
          .security-item {
            margin-bottom: 16px;
            text-align: left;
          }
          .security-badge-mini {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
          }
          .security-badge-mini span {
            font-family: 'Nunito Sans', 'Noto Sans JP', sans-serif;
            font-weight: 700;
            font-size: 13px;
            color: var(--shin-ai);
          }
          .security-explain {
            font-family: 'Nunito Sans', 'Noto Sans JP', sans-serif;
            font-size: 12px;
            color: var(--usuzumi);
            margin: 0 0 0 22px;
            line-height: 1.5;
          }
          .refresh-hint {
            margin-top: 24px;
            padding-top: 16px;
          }
          .hint-text {
            font-family: 'Nunito Sans', 'Noto Sans JP', sans-serif;
            font-size: 12px;
            color: var(--usuzumi);
            margin: 0;
            font-style: italic;
          }
          .btn {
            width: 100%;
            border: 0;
            border-radius: 12px;
            padding: 14px 16px;
            background: linear-gradient(135deg, var(--shin-ai) 0%, #243B6B 100%);
            color: #fff;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: .04em;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(27,54,93,.25);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: transform .12s ease, box-shadow .12s ease;
          }
          .btn:disabled {
            opacity: .6;
            cursor: not-allowed;
            filter: grayscale(.15);
          }
          .btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(27,54,93,.32);
          }
          .security-badges {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin: 16px 0;
            flex-wrap: wrap;
          }
          .security-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #fff;
            border: 1px solid #e7f3ff;
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 12px;
            color: var(--shin-ai);
            box-shadow: 0 2px 8px rgba(0,0,0,.05);
          }
          .note-block {
            margin-top: 12px;
            font-size: 11px;
            color: #64748b;
            line-height: 1.6;
          }
          .note-block p {
            margin: 2px 0;
          }
        `}</style>

        <div className="appbar" role="banner">
          <div className="logo" aria-label="FleaPay">
            <div className="logo__wordmark">
              Flea<span className="pay">Pay</span>
            </div>
            <span className="logo__sparkle" aria-hidden="true">✨</span>
          </div>
          <div className="app-actions">
            <div className="lang-switch" role="group" aria-label="Language">
              <button
                className={`lang-btn ${lang === 'ja' ? 'active' : ''}`}
                onClick={() => setLang('ja')}
                aria-label="日本語"
              >
                🇯🇵
              </button>
              <button
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
                aria-label="English"
              >
                🇺🇸
              </button>
              <button
                className={`lang-btn ${lang === 'zh' ? 'active' : ''}`}
                onClick={() => setLang('zh')}
                aria-label="中文"
              >
                🇨🇳
              </button>
            </div>
          </div>
        </div>

        <div className="card" role="main">
          <header className="header">
            <h1 className="welcome-message">{t.welcome}</h1>
          </header>

          <section className="priceBox" id="priceBox" aria-live="polite">
            {isEmpty ? (
              <div className="empty-state-view">
                <div className="sakura-float" aria-hidden="true">🌸</div>
                <div className="main-message">
                  <h2 className="exciting-title">{t.emptyTitle}</h2>
                  <p className="sub-title">{t.emptySubtitle}</p>
                </div>
                <div className="steps-guide">
                  <div className="step-card step-discover">
                    <div className="step-icon">📍</div>
                    <div className="step-content">
                      <h3 className="step-title">{t.step1Title}</h3>
                      <p className="step-desc">{t.step1Desc}</p>
                    </div>
                  </div>
                  <div className="step-card step-communicate">
                    <div className="step-icon">💬</div>
                    <div className="step-content">
                      <h3 className="step-title">{t.step2Title}</h3>
                      <p className="step-desc">{t.step2Desc}</p>
                    </div>
                  </div>
                  <div className="step-card step-payment">
                    <div className="step-icon">✨</div>
                    <div className="step-content">
                      <h3 className="step-title">{t.step3Title}</h3>
                      <p className="step-desc">{t.step3Desc}</p>
                    </div>
                  </div>
                </div>
                <div className="security-section">
                  <button
                    className="security-toggle"
                    onClick={() => setSecurityExpanded(!securityExpanded)}
                    aria-expanded={securityExpanded}
                  >
                    <span className="toggle-icon">🔒</span>
                    <span>{t.securityQuestion}</span>
                    <span className="toggle-arrow">{securityExpanded ? '▲' : '▼'}</span>
                  </button>
                  {securityExpanded && (
                    <div className="security-details">
                      <div className="security-item">
                        <div className="security-badge-mini">
                          <span>🛡️</span>
                          <span>{t.securityBadge1}</span>
                        </div>
                        <p className="security-explain">{t.securityExplain1}</p>
                      </div>
                      <div className="security-item">
                        <div className="security-badge-mini">
                          <span>🔐</span>
                          <span>{t.securityBadge2}</span>
                        </div>
                        <p className="security-explain">{t.securityExplain2}</p>
                      </div>
                      <div className="security-item">
                        <div className="security-badge-mini">
                          <span>💳</span>
                          <span>{t.securityBadge3}</span>
                        </div>
                        <p className="security-explain">{t.securityExplain3}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="refresh-hint">
                  <p className="hint-text">{t.refreshHint}</p>
                </div>
              </div>
            ) : (
              <div className="normal-view">
                <div className="priceHead">
                  <span className="ccy">JPY</span>
                  <div className="price" aria-label="合計金額">
                    {formatJPY(amountInt)}
                  </div>
                </div>
                {orderData.summary && (
                  <p className="summary">{orderData.summary}</p>
                )}
              </div>
            )}
          </section>

          <div className="security-badges">
            <div className="security-badge">
              <span>🛡️</span>
              <span>{t.ssl}</span>
            </div>
            <div className="security-badge">
              <span>🔐</span>
              <span>{t.stripe}</span>
            </div>
          </div>

          <div className="mt8">
            <p className="muted" style={{ textAlign: 'center', fontSize: '13px', marginTop: '6px', marginBottom: '12px', lineHeight: '1.6' }}>
              {t.stripeRedirect}
            </p>
            <button
              id="payBtn"
              className="btn"
              disabled={isEmpty || loading}
              onClick={handlePay}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                <path d="M5 12h14M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span id="payLabel">
                {isEmpty ? t.fetching : t.pay.replace('{amount}', formatJPY(amountInt))}
              </span>
            </button>
            <div className="note-block" aria-live="polite">
              <p>{t.confirm1}</p>
              <p>{t.confirm2}</p>
              <p>{t.safety}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

