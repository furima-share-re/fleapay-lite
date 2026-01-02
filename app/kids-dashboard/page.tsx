// app/kids-dashboard/page.tsx
// Phase 2.3: Next.js画面移行（Kidsダッシュボード）

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function KidsDashboardContent() {
  const searchParams = useSearchParams();
  const sellerId = searchParams.get('s');
  
  const [summary, setSummary] = useState<any>(null);
  const [kidsSummary, setKidsSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [missions, setMissions] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!sellerId) return;
    
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const keyPrefix = `kids-mission-${sellerId}-`;
      const mission1 = localStorage.getItem(keyPrefix + '1') === 'done';
      const mission2 = localStorage.getItem(keyPrefix + '2') === 'done';
      const mission3 = localStorage.getItem(keyPrefix + '3') === 'done';
      setMissions({ '1': mission1, '2': mission2, '3': mission3 });
    }
    
    loadSummary();
    loadKidsSummary();
  }, [sellerId]);

  const loadSummary = async () => {
    if (!sellerId) return;
    
    try {
      const res = await fetch(`/api/seller/summary?s=${encodeURIComponent(sellerId)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error('データの読み込みに失敗しました');
      }
      
      // サブスクリプションチェック
      if (data.isSubscribed === false || !data.planType || data.planType !== 'kids') {
        setIsBlocked(true);
        return;
      }
      
      setSummary(data);
    } catch (e) {
      console.error('loadSummary error', e);
    } finally {
      setLoading(false);
    }
  };

  const loadKidsSummary = async () => {
    if (!sellerId) return;
    
    try {
      const res = await fetch(`/api/seller/kids-summary?s=${encodeURIComponent(sellerId)}`);
      if (!res.ok) return;
      
      const data = await res.json();
      setKidsSummary(data);
    } catch (e) {
      console.error('loadKidsSummary error', e);
    }
  };

  const toggleMission = (id: string) => {
    if (!sellerId) return;
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    const key = `kids-mission-${sellerId}-${id}`;
    const newState = !missions[id];
    setMissions({ ...missions, [id]: newState });
    localStorage.setItem(key, newState ? 'done' : 'todo');
  };

  const formatYen = (n: number) => {
    if (!Number.isFinite(n)) return '¥—';
    return '¥' + n.toLocaleString('ja-JP');
  };

  const formatDateJp = (date: Date) => {
    const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${w})`;
  };

  const formatTime = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  if (!sellerId) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p>URLのさいごに ?s=出店者ID をつけてください。</p>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="wrap">
        <section className="card" style={{ display: 'block' }}>
          <div className="blocked">
            <h1>この画面は「キッズプラン」専用です</h1>
            <p>
              若旦那・若女将マイページは、EDO ICHIBA キッズプラン ご契約中の<br />
              出店者さま向けの 画面です。
            </p>
            <p>
              プランの くわしい内容や お申し込みは、<br />
              EDO ICHIBA / FleaPay 運営まで お問い合わせください。
            </p>
          </div>
        </section>
      </div>
    );
  }

  const stats = kidsSummary?.stats || {};
  const badges = kidsSummary?.badges || [];
  const titles = kidsSummary?.titles || [];
  const nowJst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const todayStr = nowJst.toISOString().slice(0, 10);

  let cashlessToday = 0;
  let attrsToday = 0;
  (summary?.recent || []).forEach((tx: any) => {
    if (!tx.createdAt) return;
    const created = new Date(tx.createdAt);
    const jst = new Date(created.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dStr = jst.toISOString().slice(0, 10);
    if (dStr !== todayStr) return;
    if (tx.paymentMethod === 'card') cashlessToday++;
    const hasAttr = (tx.customerType && tx.customerType !== 'unknown') ||
                    (tx.gender && tx.gender !== 'unknown') ||
                    (tx.ageBand && tx.ageBand !== 'unknown');
    if (hasAttr) attrsToday++;
  });

  const currentTitle = titles.length > 0
    ? titles.sort((a: any, b: any) => {
        const ta = a.first_earned_at ? new Date(a.first_earned_at).getTime() : 0;
        const tb = b.first_earned_at ? new Date(b.first_earned_at).getTime() : 0;
        return tb - ta;
      })[0].label
    : 'まだこれから!';

  const todayNet = summary?.salesToday?.net ?? summary?.salesTodayNet ?? 0;
  const count = summary?.countToday ?? summary?.salesToday?.count ?? 0;
  const avg = summary?.avgToday ?? summary?.salesToday?.avgNet ?? (count > 0 ? Math.round(todayNet / count) : 0);

  let maxAmount = 0;
  (summary?.recent || []).forEach((tx: any) => {
    const amt = Number(tx.amount || tx.net_amount || 0);
    if (amt > maxAmount) maxAmount = amt;
  });

  const dataScore = summary?.dataScore ?? 0;
  const clampedScore = Math.max(0, Math.min(100, dataScore));

  return (
    <div className="wrap">
      <style jsx>{`
        :root {
          --bg: #fbf7f0;
          --panel: #ffffff;
          --border: #e5d9c8;
          --text: #1f2933;
          --sub: #6b7280;
          --brand: #1B365D;
          --accent: #E8B4B8;
          --accent2: #E63946;
          --ok: #16a34a;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
          background: var(--bg);
          color: var(--text);
        }
        .wrap {
          max-width: 720px;
          margin: 0 auto;
          padding: 12px 12px 80px;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 4px 12px;
          gap: 12px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-icon {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #fff 0, #fff 35%, #E8B4B8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
        }
        .brand-text-title {
          margin: 0;
          font-weight: 800;
          letter-spacing: .06em;
          font-size: .95rem;
        }
        .brand-text-sub {
          margin: 0;
          font-size: .78rem;
          color: var(--sub);
        }
        .kid-chip {
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.9);
          padding: 6px 10px;
          font-size: .8rem;
          color: var(--sub);
          max-width: 50%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card {
          background: var(--panel);
          border-radius: 18px;
          border: 1px solid var(--border);
          padding: 14px 14px 16px;
          margin-bottom: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,.06);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .card-title {
          font-size: 1rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .card-sub {
          font-size: .8rem;
          color: var(--sub);
        }
        .pill {
          font-size: .75rem;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--sub);
        }
        .big-num {
          font-size: 1.7rem;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .label {
          font-size: .8rem;
          color: var(--sub);
        }
        .kpi-row {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        .kpi {
          flex: 1;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff7f7;
          padding: 8px 10px;
        }
        .kpi-label {
          font-size: .75rem;
          color: var(--sub);
          margin-bottom: 2px;
        }
        .kpi-value {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .hint {
          font-size: .78rem;
          color: var(--sub);
          margin-top: 6px;
        }
        .meter-wrap {
          margin-top: 6px;
        }
        .meter-bar {
          position: relative;
          width: 100%;
          height: 14px;
          border-radius: 999px;
          background: #fde2e4;
          overflow: hidden;
        }
        .meter-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: ${clampedScore}%;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          transition: width .6s ease-out;
        }
        .meter-text {
          margin-top: 4px;
          font-size: .8rem;
          color: var(--sub);
        }
        .mission-list {
          list-style: none;
          padding: 0;
          margin: 6px 0 0;
        }
        .mission-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 6px 0;
        }
        .mission-check {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 2px solid var(--border);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .9rem;
          cursor: pointer;
        }
        .mission-item.done .mission-check {
          background: #bbf7d0;
          border-color: #22c55e;
        }
        .mission-text-main {
          font-size: .9rem;
          margin-bottom: 2px;
        }
        .mission-text-sub {
          font-size: .78rem;
          color: var(--sub);
        }
        .list {
          list-style: none;
          padding: 0;
          margin: 6px 0 0;
        }
        .tx-item {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 0;
          border-bottom: 1px solid #f1e4d6;
        }
        .tx-item:last-child {
          border-bottom: none;
        }
        .tx-main {
          flex: 1;
        }
        .tx-title {
          font-size: .9rem;
          margin-bottom: 2px;
        }
        .tx-sub {
          font-size: .78rem;
          color: var(--sub);
        }
        .tx-amt {
          white-space: nowrap;
          font-size: .95rem;
          font-weight: 700;
        }
        .kids-header {
          text-align: center;
          margin-bottom: 16px;
        }
        .kids-header h1 {
          font-size: 1.3rem;
          font-weight: 800;
          margin: 0 0 8px;
          color: var(--brand);
        }
        .title-pill {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 999px;
          background: #fff3c4;
          font-weight: bold;
          font-size: .85rem;
          margin-top: 4px;
        }
        .ehon-link {
          display: block;
          margin: 20px 0;
          font-size: 1.4rem;
          text-decoration: none;
          background: #ffe06b;
          color: #333;
          padding: 14px 20px;
          border-radius: 12px;
          font-weight: bold;
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ehon-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .stat-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          margin-top: 10px;
        }
        .stat-card {
          background: #fff;
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          border: 1px solid var(--border);
        }
        .stat-card .label {
          font-size: .75rem;
          color: #666;
          margin-bottom: 4px;
        }
        .stat-card .value {
          font-size: 1.3rem;
          font-weight: bold;
          margin-top: 4px;
          color: var(--brand);
        }
        .badge-list, .title-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .badge-chip {
          padding: 6px 10px;
          border-radius: 999px;
          background: #f4f0ff;
          font-size: .85rem;
          border: 1px solid #e5d9c8;
        }
        .title-chip {
          padding: 6px 10px;
          border-radius: 999px;
          background: #e0f2fe;
          font-size: .85rem;
          border: 1px solid #bae6fd;
        }
        .goal-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #f9fafb;
          margin-bottom: 6px;
        }
        .goal-row.done {
          background: #ecfdf3;
          border-color: #bbf7d0;
        }
        .goal-row.done .goal-count::after {
          content: " ✅";
          font-size: .85rem;
        }
        .goal-main {
          flex: 1;
        }
        .goal-title {
          font-size: .9rem;
          font-weight: 600;
        }
        .goal-sub {
          font-size: .78rem;
          color: var(--sub);
        }
        .goal-count {
          font-size: .9rem;
          font-weight: 700;
          min-width: 60px;
          text-align: right;
        }
        .blocked {
          text-align: left;
          font-size: .88rem;
          line-height: 1.7;
        }
        .blocked h1 {
          font-size: 1.1rem;
          margin-bottom: 6px;
        }
      `}</style>

      <header>
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">🌸</div>
          <div>
            <p className="brand-text-title">EDO ICHIBA</p>
            <p className="brand-text-sub">若旦那・若女将 マイページ</p>
          </div>
        </div>
        <div className="kid-chip">
          {summary?.displayName || summary?.sellerId || 'おみせ'} の 若旦那 / 若女将
        </div>
      </header>

      <div className="kids-header">
        <h1>若旦那 / 若女将 ダッシュボード</h1>
        <div className="title-pill">称号: {currentTitle}</div>
      </div>

      <Link href="/kids-ehon" className="ehon-link">
        📘 にんじゃたいの えほん をよむ
      </Link>

      <Link href={`/seller-purchase?s=${sellerId}`} className="ehon-link">
        💳 QR / カード決済 へすすむ
      </Link>

      <section className="card kids-stats">
        <div className="card-header">
          <div>
            <div className="card-title">
              <span className="emoji">📈</span>
              <span>きょうまでの こども実績</span>
            </div>
            <div className="card-sub">これまでの がんばり</div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">売れた回数</div>
            <div className="value">{stats.totalOrders || 0} 回</div>
          </div>
          <div className="stat-card">
            <div className="label">こども お客さん</div>
            <div className="value">{stats.childCustomerCount || 0} 人</div>
          </div>
          <div className="stat-card">
            <div className="label">海外のお客さん</div>
            <div className="value">{stats.inboundCount || 0} 人</div>
          </div>
          <div className="stat-card">
            <div className="label">データ名人メーター</div>
            <div className="value">
              <span>{stats.dataScore || 0}</span> %
            </div>
            <div className="meter">
              <div className="meter-bar" style={{ width: `${Math.min(stats.dataScore || 0, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      <section className="card kids-badges">
        <div className="card-header">
          <div>
            <div className="card-title">
              <span className="emoji">🏅</span>
              <span>てにいれた バッジ</span>
            </div>
            <div className="card-sub">いままで ゲット したもの</div>
          </div>
        </div>
        <div className="badge-list">
          {badges.length > 0 ? (
            badges.map((badge: any, idx: number) => (
              <div key={idx} className="badge-chip">
                {badge.label}
              </div>
            ))
          ) : (
            <div className="hint">まだ バッジが ありません。がんばって ゲット しよう!</div>
          )}
        </div>
        <p className="hint">バッジは あなた の がんばり の あかし です。もっと ふやそう!</p>
      </section>

      <section className="card kids-titles">
        <div className="card-header">
          <div>
            <div className="card-title">
              <span className="emoji">👑</span>
              <span>称号</span>
            </div>
            <div className="card-sub">ゲット した 称号たち</div>
          </div>
        </div>
        <div className="title-list">
          {titles.length > 0 ? (
            titles.map((title: any, idx: number) => (
              <div key={idx} className="title-chip">
                {title.label}
              </div>
            ))
          ) : (
            <div className="hint">まだ 称号が ありません。がんばって ゲット しよう!</div>
          )}
        </div>
        <p className="hint">称号は あなた の レベル を あらわします。もっと すごい 称号を めざそう!</p>
      </section>

      <section className="card" id="goal-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <span className="emoji">🎯</span>
              <span>きょうの もくひょう</span>
            </div>
            <div className="card-sub">若旦那・若女将ダッシュボード と つながっています</div>
          </div>
        </div>

        <div className={`goal-row ${cashlessToday >= 1 ? 'done' : ''}`}>
          <div className="goal-main">
            <div className="goal-title">QR / カード決済 を 1回 してみよう</div>
            <div className="goal-sub">キャッシュレスバッジ に ちかづく もくひょう</div>
          </div>
          <div className="goal-count">{cashlessToday} / 1</div>
        </div>

        <div className={`goal-row ${attrsToday >= 3 ? 'done' : ''}`}>
          <div className="goal-main">
            <div className="goal-title">おきゃくさんじょうほう を 3人分 入れてみよう</div>
            <div className="goal-sub">データ名人メーター が 上がる もくひょう</div>
          </div>
          <div className="goal-count">{attrsToday} / 3</div>
        </div>

        <p className="hint">
          💡 目標は、決済のあとに出てくる「かってくれた ひと」画面 や<br />
          「QR / カードで はらう」の 説明 と おなじ内容です。
        </p>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <span className="emoji">💴</span>
              <span>きょうの うりあげ</span>
            </div>
            <div className="card-sub">{formatDateJp(nowJst)} の うりあげ</div>
          </div>
          <div className="pill">リアルタイム</div>
        </div>

        <div>
          <div className="big-num">{formatYen(todayNet)}</div>
          <div className="label">{count}件 / へいきん {formatYen(avg)}</div>
        </div>

        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-label">きょう うれた かず</div>
            <div className="kpi-value">{count} 件</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">いちばん ねだんが 高い もの</div>
            <div className="kpi-value">{formatYen(maxAmount)}</div>
          </div>
        </div>

        <p className="hint">
          {count === 0
            ? 'きょう の うりあげ は まだ 0 件です。さいしょの 1件 を 目指そう!'
            : 'きょうの 売上(すべての 決済)を かんたんに 見られる 画面です。'}
        </p>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <span className="emoji">📊</span>
              <span>がんばり メーター</span>
            </div>
            <div className="card-sub">お客さんじょうほう の 入力ど</div>
          </div>
        </div>

        <div className="meter-wrap">
          <div className="meter-bar">
            <div className="meter-fill"></div>
          </div>
          <div className="meter-text">
            きょうの がんばり: <span>{clampedScore}%</span>
          </div>
        </div>

        <p className="hint">
          「日本のひと / 外国のひと」「年齢」 などを 入れてくれると、<br />
          ふくろう博士と 三精霊が、もっと じょうずな 売りかたを 教えてくれます。
        </p>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <span className="emoji">🎯</span>
              <span>きょうの ミッション</span>
            </div>
            <div className="card-sub">三つ できたら 100点!</div>
          </div>
        </div>

        <ul className="mission-list">
          <li className={`mission-item ${missions['1'] ? 'done' : ''}`}>
            <div className="mission-check" onClick={() => toggleMission('1')}>
              {missions['1'] ? '✓' : ''}
            </div>
            <div>
              <div className="mission-text-main">お客さんに「いらっしゃいませ!」と いえた</div>
              <div className="mission-text-sub">さいしょの ひとことを 元気に いってみよう</div>
            </div>
          </li>
          <li className={`mission-item ${missions['2'] ? 'done' : ''}`}>
            <div className="mission-check" onClick={() => toggleMission('2')}>
              {missions['2'] ? '✓' : ''}
            </div>
            <div>
              <div className="mission-text-main">値下げを ねがわれたら 「ごめんなさい」と 伝えられた</div>
              <div className="mission-text-sub">ねぎり を ことわる れんしゅう(現金トラブル よけ)</div>
            </div>
          </li>
          <li className={`mission-item ${missions['3'] ? 'done' : ''}`}>
            <div className="mission-check" onClick={() => toggleMission('3')}>
              {missions['3'] ? '✓' : ''}
            </div>
            <div>
              <div className="mission-text-main">1回 QR / カード で うってみた</div>
              <div className="mission-text-sub">現金が なくても 買えるように してあげよう</div>
            </div>
          </li>
        </ul>

        <p className="hint">
          ミッションは このスマホだけで 記録されます。<br />
          なくなっても 大丈夫なので、気楽に タップして OK です。
        </p>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <span className="emoji">🛍️</span>
              <span>さいきん うれた もの</span>
            </div>
            <div className="card-sub">3件だけ ひょうじ</div>
          </div>
        </div>

        <ul className="list">
          {summary?.recent && summary.recent.length > 0 ? (
            summary.recent.slice(0, 3).map((tx: any, idx: number) => {
              const summary = (tx.summary || tx.memo || 'しょうひん').split('\n')[0];
              const amt = Number(tx.amount || tx.net_amount || 0);
              let created: Date | null = null;
              if (typeof tx.created === 'number') {
                created = new Date(tx.created * 1000);
              } else if (tx.createdAt) {
                created = new Date(tx.createdAt);
              }
              let whenText = 'この とき の おかいもの';
              if (created && !isNaN(created.getTime())) {
                const jst = new Date(created.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
                const y = jst.getFullYear();
                const m = String(jst.getMonth() + 1).padStart(2, '0');
                const d = String(jst.getDate()).padStart(2, '0');
                const hh = String(jst.getHours()).padStart(2, '0');
                const mm = String(jst.getMinutes()).padStart(2, '0');
                whenText = `${y}-${m}-${d} ${hh}:${mm} ごろ の おかいもの`;
              }
              return (
                <li key={idx} className="tx-item">
                  <div className="tx-main">
                    <div className="tx-title">{summary}</div>
                    <div className="tx-sub">{amt ? whenText : '金額データ なし'}</div>
                  </div>
                  <div className="tx-amt">{formatYen(amt || 0)}</div>
                </li>
              );
            })
          ) : (
            <li className="tx-item">
              <div className="tx-main">
                <div className="tx-title">まだ うれた もの が ありません</div>
                <div className="tx-sub">はじめて の 1件が ここに ひょうじされます。</div>
              </div>
            </li>
          )}
        </ul>

        <p className="hint">
          さいきん の 3件 を ひょうじしています。なにが 人気か 見てみよう。
        </p>
      </section>
    </div>
  );
}

export default function KidsDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <KidsDashboardContent />
    </Suspense>
  );
}

