// app/checkout/CheckoutClient.tsx
// /checkout のクライアント島。初期 order データは Server Component (page.tsx) が
// Prisma 直叩きで取得して props で渡してくるので、初回 fetch は不要。
// amount がまだ確定していない場合（pending_amount）のみ retry polling を行う。

'use client';

import { useEffect, useState, useRef } from 'react';
import type { CheckoutInitialData } from '@/lib/checkout-server';

interface OrderData {
  orderId: string | null;
  sellerId: string | null;
  amount: number;
  summary: string;
}

interface CheckoutClientProps {
  initialData: CheckoutInitialData;
  orderId: string | null;
  sellerId: string | null;
}

export default function CheckoutClient({ initialData, orderId, sellerId }: CheckoutClientProps) {
  // initialData から初期 state を導出（client 側で fetch する代わり）
  const initialOrderData: OrderData | null =
    initialData.kind === 'ready' || initialData.kind === 'pending_amount'
      ? {
          orderId: initialData.order.orderId,
          sellerId: initialData.order.sellerId,
          amount: initialData.order.amount,
          summary: initialData.order.summary,
        }
      : null;

  // expired / not_found / empty の場合は retry しない
  const initialAllowRetry = initialData.kind === 'pending_amount';

  const [lang, setLang] = useState<'ja' | 'en' | 'zh'>('ja');
  const [orderData, setOrderData] = useState<OrderData | null>(initialOrderData);
  const [retryCount, setRetryCount] = useState(0);
  const [allowAutoRetry, setAllowAutoRetry] = useState(initialAllowRetry);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [securityExpanded, setSecurityExpanded] = useState(false);

  const MAX_RETRIES = 12;

  useEffect(() => {
    // 初期言語設定
    const nav = navigator.language || 'ja';
    if (nav.startsWith('en')) setLang('en');
    else if (nav.startsWith('zh')) setLang('zh');
    else setLang('ja');
    
    // bodyにクラスを追加して背景スタイルを適用
    document.body.classList.add('checkout-page');
    return () => {
      document.body.classList.remove('checkout-page');
    };
  }, []);

  // 注: 旧 /api/price/latest による sellerId-only QR の自動 orderId 解決は廃止。
  // 現状は QR に order パラメータが含まれている前提。order なしで来た場合は空状態画面を表示する。

  // amount 確定の retry polling。
  // Server Component が初回データを props で渡しているので、初回 fetch は不要。
  // ready（金額確定済み）/ expired / not_found / empty の場合は何もしない。
  // pending_amount（店員が金額入力中）の場合のみ、/api/seller/order-detail を polling。
  useEffect(() => {
    if (!allowAutoRetry || !orderId) {
      return;
    }
    if (orderData && orderData.amount > 0) {
      // すでに金額確定済み（retry 中に確定したケースも含む） → 何もしない
      return;
    }

    async function fetchLatest() {
      // タイマー参照を先にクリアしておく（次の retry が正しくスケジュールされるように）
      retryTimerRef.current = null;
      try {
        // sellerId は URL クエリより initialData/orderData から取得した方を優先（DB 検証済み）
        const effectiveSellerId = orderData?.sellerId ?? sellerId ?? '';
        const url = `/api/seller/order-detail?s=${encodeURIComponent(effectiveSellerId)}&orderId=${encodeURIComponent(orderId!)}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();

        if (data.error === 'expired' || data.error === 'not_found') {
          setAllowAutoRetry(false);
          return;
        }
        if (data.error) {
          throw new Error(data.error);
        }

        if (data && data.amount && parseInt(data.amount, 10) > 0) {
          setOrderData({
            orderId: data.orderId,
            sellerId: data.sellerId || sellerId,
            amount: data.amount,
            summary: data.summary || data.memo || '',
          });
          setRetryCount(0);
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          return;
        }

        // 金額未確定 → 次回 retry
        scheduleRetry();
      } catch (err) {
        console.error('[FleaPay Fetch Error]', err);
        scheduleRetry();
      }
    }

    function scheduleRetry() {
      if (retryCount >= MAX_RETRIES) {
        setAllowAutoRetry(false);
        return;
      }
      if (retryTimerRef.current) {
        return; // 既にスケジュール済み
      }
      retryTimerRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 5000);
    }

    fetchLatest();

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [orderId, sellerId, retryCount, allowAutoRetry, orderData]);

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
          amount: orderData.amount
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[FleaPay] 決済APIエラー:', errorData);
        
        let errorMessage = dict[lang].errorCheckout || '決済処理でエラーが発生しました。';
        
        if (response.status === 400 && errorData.error === 'seller_stripe_account_not_found') {
          errorMessage = '出店者の決済設定が完了していません。出店者にお問い合わせください。';
        } else if (response.status === 400 && errorData.error === 'invalid_amount') {
          errorMessage = errorData.message || '金額が無効です。';
        } else if (response.status === 400 && errorData.error === 'already_paid') {
          errorMessage = errorData.message || 'この注文は既に支払い済みです。';
        } else if (response.status === 429) {
          errorMessage = dict[lang].errorRateLimit || 'アクセスが集中しています。少し待ってから再度お試しください。';
        } else if (response.status === 404) {
          errorMessage = dict[lang].errorNotFound || '注文が見つかりませんでした。出店者に確認してください。';
        } else if (response.status === 403) {
          errorMessage = dict[lang].errorForbidden || 'アクセスが拒否されました。';
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        alert(errorMessage);
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
      pay: 'タップして {amount} を支払う',
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
      stripeRedirect: '次の画面でカード情報を入力します。'
    },
    en: {
      welcome: 'Welcome!',
      enjoy: 'Enjoy the flea market & festival 🎆',
      pay: 'Tap to pay {amount}',
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
      stripeRedirect: 'Card details on the next page.'
    },
    zh: {
      welcome: '欢迎光临!',
      enjoy: '祝您在集市和祭典玩得开心 🎆',
      pay: '点击支付 {amount}',
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
      stripeRedirect: '下一页输入卡片信息。'
    }
  };

  const t = dict[lang];
  const amountInt = orderData?.amount ?? 0;
  const isEmpty = !orderData || !amountInt || amountInt <= 0;

  return (
    <>
      {/* Fonts are loaded in root layout.tsx */}
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
          body {
            color: #1A1A1A;
            background: transparent;
          }
          .checkout-container {
            color: #1A1A1A;
            max-width: 640px;
            margin: 0 auto;
            padding: 56px 20px 40px;  /* 上部に暖簾分の余白 */
            min-height: 100vh;
            position: relative;
            /* 江戸風: 藍 → 生成りグラデで「夕暮れの空」 */
            background:
              radial-gradient(1200px 700px at 80% -10%, rgba(230,57,70,.18) 0%, transparent 55%),
              radial-gradient(1200px 700px at -20% 110%, rgba(27,54,93,.22) 0%, transparent 60%),
              linear-gradient(180deg, #f6e6d4 0%, #f7ecd9 30%, #f0e2c8 60%, #ead7b5 100%);
            overflow: hidden;
          }
          /* 江戸風の上部暖簾（藍地 + 金筋 + 朱の印） */
          .checkout-container::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 40px;
            background:
              /* 金縁の細い帯 */
              linear-gradient(180deg, transparent 36px, #B8902E 36px, #B8902E 38px, transparent 38px),
              /* 暖簾本体: 藍地 */
              linear-gradient(180deg, #1B365D 0%, #2a4a7a 70%, #B8902E 70%, #B8902E 72%, transparent 72%);
            box-shadow: 0 4px 12px rgba(27,54,93,.25);
            z-index: 2;
          }
          /* 全面に大きな青海波パターン（薄く透ける藍） */
          .checkout-container::after {
            content: "";
            position: absolute;
            inset: 40px 0 0 0;
            background-image:
              radial-gradient(circle at 0 16px, transparent 14px, rgba(27,54,93,.10) 14px, rgba(27,54,93,.10) 15px, transparent 15px),
              radial-gradient(circle at 16px 16px, transparent 14px, rgba(27,54,93,.10) 14px, rgba(27,54,93,.10) 15px, transparent 15px),
              radial-gradient(circle at 32px 16px, transparent 14px, rgba(27,54,93,.10) 14px, rgba(27,54,93,.10) 15px, transparent 15px);
            background-size: 32px 32px;
            pointer-events: none;
            z-index: 0;
          }
          .appbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            position: relative;
            z-index: 1;
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
            background: rgba(253,250,243,.85);
            border: 2px solid #1B365D;
            border-radius: 4px;
            padding: 3px;
            box-shadow: inset 0 0 0 1px #D4AF37;
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
            background: #fffdf7;
            /* 二重の縁: 外側は藍、内側は金（額装風） */
            border: 3px solid #1B365D;
            border-radius: 6px;
            padding: 24px 20px 22px;
            box-shadow:
              inset 0 0 0 2px #D4AF37,
              inset 0 0 0 4px #fffdf7,
              0 16px 40px rgba(27,54,93,.25);
            overflow: visible;
            z-index: 1;
            color: #1A1A1A;
          }
          .card * {
            color: inherit;
          }
          /* 右上に朱印（FleaPay）風スタンプ */
          .card > .stamp {
            position: absolute;
            top: -14px;
            right: 16px;
            width: 56px;
            height: 56px;
            background: radial-gradient(circle, #C23B47, #8B2635);
            color: #FBF7F0;
            font-weight: 900;
            font-size: 11px;
            display: grid;
            place-items: center;
            border-radius: 6px;
            border: 2px solid #FBF7F0;
            box-shadow: 0 4px 12px rgba(139,38,53,.5), inset 0 0 0 2px #C23B47;
            transform: rotate(-8deg);
            letter-spacing: .04em;
            line-height: 1.1;
            text-align: center;
            z-index: 3;
          }
          /* 江戸風ボタンは生成り（クリーム）文字 — 朱地と対比 */
          .card .btn,
          .card .btn *,
          .card .btn span {
            color: #FBF7F0 !important;
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
          .welcome-message {
            text-align: center;
            margin: 4px 0 12px;
            font-size: 28px;
            letter-spacing: .12em;
            color: var(--shin-ai);
            font-weight: 900;
            position: relative;
            padding-bottom: 12px;
          }
          /* 看板の下に金の二重線 */
          .welcome-message::after {
            content: "";
            position: absolute;
            left: 50%;
            bottom: 0;
            transform: translateX(-50%);
            width: 80px;
            height: 4px;
            background:
              linear-gradient(180deg, #D4AF37 0 1px, transparent 1px 3px, #D4AF37 3px 4px);
          }
          .main-message {
            margin-bottom: 24px;
          }
          .normal-view {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .priceBox {
            background:
              /* 角の金色アクセント（江戸の隅切り） */
              linear-gradient(135deg, #D4AF37 0 12px, transparent 12px) top left,
              linear-gradient(225deg, #D4AF37 0 12px, transparent 12px) top right,
              linear-gradient(45deg, #D4AF37 0 12px, transparent 12px) bottom left,
              linear-gradient(315deg, #D4AF37 0 12px, transparent 12px) bottom right,
              /* 内側の生成り背景 */
              linear-gradient(#fdfaf3, #fdfaf3);
            background-size: 24px 24px, 24px 24px, 24px 24px, 24px 24px, 100% 100%;
            background-repeat: no-repeat;
            background-origin: padding-box;
            border: 2px solid #1B365D;
            border-radius: 4px;  /* 江戸風は角ばった方が映える */
            padding: 28px 22px 24px;
            position: relative;
            overflow: hidden;
            margin: 10px 0 14px;
            color: #1A1A1A;
            box-shadow: 0 6px 18px rgba(27,54,93,.18);
          }
          .priceBox * {
            color: inherit;
          }
          .priceBox::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 4px;
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
            font-size: 64px;
            letter-spacing: 2px;
            line-height: 1;
            margin: 12px 0 6px;
            position: relative;
            /* 江戸風: 藍の重厚な色 + 薄い金の影 */
            color: var(--shin-ai);
            text-shadow:
              0 2px 0 rgba(212,175,55,.35),
              0 4px 12px rgba(27,54,93,.15);
          }
          /* 価格の下に毛筆風の朱の線 */
          .price::after {
            content: "";
            display: block;
            margin: 10px auto 0;
            width: 60%;
            height: 3px;
            background: linear-gradient(90deg, transparent, #C23B47 20%, #E63946 50%, #C23B47 80%, transparent);
            border-radius: 2px;
          }
          .summary {
            margin: 12px 0 0;
            font-size: 13px;
            color: #1A1A1A;
            white-space: pre-line;
            font-weight: 500;
            line-height: 1.6;
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
            animation: gentle-pulse 1.5s ease-in-out infinite;
          }
          @keyframes gentle-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
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
            font-weight: 500;
            font-size: 13px;
            color: #1A1A1A;
            margin: 0;
            line-height: 1.6;
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
            transition: all 0.2s ease;
          }
          .security-toggle:hover {
            background: linear-gradient(135deg, rgba(27,54,93,0.08), rgba(27,54,93,0.12));
          }
          .toggle-icon {
            font-size: 16px;
          }
          .toggle-arrow {
            font-size: 12px;
            transition: transform 0.2s ease;
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
            font-size: 13px;
            color: #1A1A1A;
            margin: 0 0 0 22px;
            line-height: 1.6;
            font-weight: 500;
          }
          .refresh-hint {
            margin-top: 24px;
            padding-top: 16px;
          }
          .hint-text {
            font-family: 'Nunito Sans', 'Noto Sans JP', sans-serif;
            font-size: 13px;
            color: #1A1A1A;
            margin: 0;
            font-weight: 500;
            line-height: 1.6;
          }
          /* 江戸風 暖簾ボタン: 朱地 + 金縁 + 微振動アニメ */
          .btn {
            width: 100%;
            border: 3px solid #D4AF37;
            border-radius: 6px;
            padding: 22px 16px;
            background:
              /* 内側に金の細線 */
              linear-gradient(#C23B47, #8B2635) padding-box,
              linear-gradient(#D4AF37, #B8902E) border-box;
            color: #FBF7F0 !important;
            font-size: 22px;
            font-weight: 900;
            letter-spacing: .08em;
            position: relative;
            overflow: hidden;
            box-shadow:
              inset 0 0 0 2px rgba(255,255,255,.18),
              inset 0 -4px 0 rgba(0,0,0,.25),
              0 8px 24px rgba(139,38,53,.45),
              0 0 0 4px rgba(212,175,55,.18);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: transform .12s ease, box-shadow .12s ease;
            animation: edo-pulse 2.4s ease-in-out infinite;
            text-shadow: 0 1px 2px rgba(0,0,0,.35);
          }
          @keyframes edo-pulse {
            0%, 100% { box-shadow:
              inset 0 0 0 2px rgba(255,255,255,.18),
              inset 0 -4px 0 rgba(0,0,0,.25),
              0 8px 24px rgba(139,38,53,.45),
              0 0 0 4px rgba(212,175,55,.18); }
            50% { box-shadow:
              inset 0 0 0 2px rgba(255,255,255,.25),
              inset 0 -4px 0 rgba(0,0,0,.25),
              0 12px 32px rgba(230,57,70,.55),
              0 0 0 6px rgba(212,175,55,.35); }
          }
          .btn:hover:not(:disabled) {
            transform: translateY(-1px);
          }
          .btn:active:not(:disabled) {
            transform: translateY(1px);
            box-shadow:
              inset 0 0 0 2px rgba(255,255,255,.18),
              inset 0 2px 6px rgba(0,0,0,.35),
              0 4px 12px rgba(139,38,53,.45);
          }
          .btn *,
          .btn span {
            color: #FBF7F0 !important;
          }
          .btn svg {
            stroke: #FBF7F0 !important;
          }
          /* 左下に「印」マーク（紗綾形風） */
          .btn::before {
            content: "印";
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            width: 30px;
            height: 30px;
            display: grid;
            place-items: center;
            border: 1.5px solid #D4AF37;
            border-radius: 3px;
            font-size: 14px;
            font-weight: 900;
            color: #FBF7F0;
            background: rgba(0,0,0,.18);
          }
          .btn:disabled {
            opacity: .55;
            cursor: not-allowed;
            background: #d6d3cb !important;
            color: #6b7280 !important;
            border-color: #b8b6ae !important;
            animation: none;
            box-shadow: none;
            text-shadow: none;
          }
          .btn:disabled::before {
            border-color: #9a9890;
            color: #6b7280;
            background: rgba(0,0,0,.05);
          }
          .btn:disabled *,
          .btn:disabled span,
          .btn:disabled svg {
            color: #6b7280 !important;
          }
          .btn:disabled svg {
            stroke: #6b7280 !important;
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
            background: #fdfaf3;
            border: 1.5px solid #1B365D;
            border-radius: 3px;
            padding: 6px 12px;
            font-size: 12px;
            color: var(--shin-ai);
            box-shadow: inset 0 0 0 1px #D4AF37, 0 2px 6px rgba(27,54,93,.12);
            font-weight: 700;
          }
          .note-block {
            margin-top: 12px;
            font-size: 12px;
            color: #1A1A1A;
            line-height: 1.7;
            font-weight: 500;
          }
          .note-block p {
            margin: 2px 0;
          }
          .mt8 {
            margin-top: 8px;
          }
          .muted {
            color: #1A1A1A !important;
            font-size: 13px;
            font-weight: 500;
            line-height: 1.6;
          }
          /* すべてのテキスト要素に確実に色を設定 */
          p, span, div, h1, h2, h3, h4, h5, h6, li, td, th {
            color: inherit;
          }
          /* 特に重要なテキスト要素 */
          .card p:not(.btn p),
          .card span:not(.logo__sparkle):not(.btn span),
          .card div:not(.card::after):not(.btn),
          .priceBox p,
          .priceBox span,
          .priceBox div {
            color: #1A1A1A !important;
          }
          /* セキュリティバッジのテキスト */
          .security-badge,
          .security-badge span {
            color: var(--shin-ai) !important;
          }
          /* 言語切り替えボタン */
          .lang-btn {
            color: inherit !important;
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
          {/* 朱印スタンプ（江戸風） */}
          <div className="stamp" aria-hidden="true">
            <span>FLEA<br/>PAY</span>
          </div>
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
            <p className="muted" style={{ textAlign: 'center', fontSize: '13px', marginTop: '6px', marginBottom: '12px', lineHeight: '1.6', color: '#1A1A1A' }}>
              {t.stripeRedirect}
            </p>
            <button
              id="payBtn"
              className="btn"
              disabled={isEmpty}
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


