'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface RecentTransaction {
  createdAt?: string;
  created?: number | string;
  paymentMethod?: string;
  amount?: number;
  net_amount?: number;
  summary?: string;
  memo?: string;
}

interface SalesSummary {
  gross?: number;
  net?: number;
  fee?: number;
  cost?: number;
  profit?: number;
  count?: number;
  avgNet?: number;
}

interface SummaryData {
  sellerId?: string;
  planType?: string;
  isSubscribed?: boolean;
  salesToday?: SalesSummary;
  salesTotal?: SalesSummary;
  dataScore?: number;
  recent?: RecentTransaction[];
}

type Tier = {
  name: string;
  label: string;
  range: string;
  rate: string;
  min: number;
  max: number | null;
};

const TIERS: Tier[] = [
  { name: '村', label: '第1段', range: '0〜3回/月', rate: '4.8% + 40円', min: 0, max: 3 },
  { name: '町', label: '第2段', range: '4〜10回/月', rate: '4.4% + 40円', min: 4, max: 10 },
  { name: '城下町', label: '第3段', range: '11〜24回/月', rate: '4.1% + 40円', min: 11, max: 24 },
  { name: '藩', label: '第4段', range: '25〜50回/月', rate: '3.8% + 40円', min: 25, max: 50 },
  { name: '天下', label: '第5段', range: '51回以上 + 目標達成', rate: '3.3% + 40円', min: 51, max: null },
];

function SellerDashboardContent() {
  const searchParams = useSearchParams();
  const sellerId = searchParams.get('s');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/seller/summary?s=${encodeURIComponent(sellerId)}`);
        if (!res.ok) throw new Error('売上データの取得に失敗しました');
        const data = await res.json();
        setSummary(data);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sellerId]);

  const formatYen = (n: number) => {
    if (!Number.isFinite(n)) return '¥—';
    return '¥' + n.toLocaleString('ja-JP');
  };

  const { monthlyCardCount, currentTier } = useMemo(() => {
    if (!summary?.recent) return { monthlyCardCount: 0, currentTier: TIERS[0] };
    const nowJst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const monthStart = new Date(nowJst.getFullYear(), nowJst.getMonth(), 1);
    let count = 0;

    summary.recent.forEach((tx) => {
      let created: Date | null = null;
      if (typeof tx.created === 'number') {
        created = new Date(tx.created * 1000);
      } else if (tx.createdAt) {
        created = new Date(tx.createdAt);
      }
      if (!created || Number.isNaN(created.getTime())) return;
      const createdJst = new Date(created.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
      if (createdJst >= monthStart && tx.paymentMethod === 'card') {
        count += 1;
      }
    });

    const tier =
      TIERS.find((t) => count >= t.min && (t.max === null || count <= t.max)) || TIERS[0];

    return { monthlyCardCount: count, currentTier: tier };
  }, [summary]);

  const communityTarget = 10_000_000;
  const communityCurrent = 8_500_000;
  const communityPercent = Math.min(100, Math.round((communityCurrent / communityTarget) * 100));

  if (!sellerId) {
    return (
      <div className="seller-dashboard">
        <div className="notice-card">URLの末尾に ?s=出店者ID を付けてアクセスしてください。</div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      <style jsx>{`
        :root {
          --bg: #fbf7f0;
          --panel: #ffffff;
          --border: #eadfce;
          --text: #1f2933;
          --sub: #6b7280;
          --brand: #1b365d;
          --accent: #b8902e;
          --accent-soft: #f7ead2;
          --success: #2d5b3f;
          --warning: #b8860b;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: var(--bg);
          color: var(--text);
          font-family: "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .seller-dashboard {
          min-height: 100vh;
          padding: 16px;
          max-width: 980px;
          margin: 0 auto;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 8px 4px 16px;
        }
        .mode-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 4px 16px;
          border-bottom: 1px solid rgba(184, 144, 46, 0.2);
        }
        .mode-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border-radius: 999px;
          border: 1px solid rgba(27, 54, 93, 0.15);
          background: #fff;
          font-size: 0.72rem;
          color: var(--sub);
        }
        .mode-pill {
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 600;
          color: var(--sub);
        }
        .mode-pill.active {
          background: var(--brand);
          color: #fff;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff 0, #fff 35%, #1b365d 100%);
          display: grid;
          place-items: center;
          color: #f8f1df;
          font-weight: 700;
        }
        .brand-title {
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
        .brand-sub {
          font-size: 0.78rem;
          color: var(--sub);
        }
        .seller-chip {
          max-width: 45%;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #fff;
          font-size: 0.78rem;
          color: var(--sub);
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .hero {
          background: linear-gradient(135deg, #fff 0%, #f9f4ea 100%);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.05);
          margin-bottom: 16px;
        }
        .hero-title {
          font-size: 1.3rem;
          margin: 0 0 6px;
        }
        .hero-sub {
          font-size: 0.85rem;
          color: var(--sub);
          margin: 0;
        }
        .hero-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
        .hero-pill {
          padding: 6px 12px;
          border-radius: 999px;
          background: var(--accent-soft);
          color: var(--brand);
          font-size: 0.78rem;
          font-weight: 600;
        }
        .grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.04);
        }
        .card-title {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0 0 8px;
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .big-number {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--brand);
        }
        .muted {
          color: var(--sub);
          font-size: 0.8rem;
        }
        .section-title {
          margin: 22px 0 10px;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--brand);
        }
        .tier-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        .tier-card {
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px;
          background: #fff;
          position: relative;
        }
        .tier-card.active {
          border-color: var(--brand);
          box-shadow: 0 0 0 2px rgba(27, 54, 93, 0.15);
        }
        .tier-label {
          font-size: 0.75rem;
          color: var(--sub);
        }
        .tier-name {
          font-size: 1rem;
          font-weight: 700;
          margin: 4px 0;
        }
        .tier-rate {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--brand);
        }
        .tier-range {
          font-size: 0.75rem;
          color: var(--sub);
          margin-top: 6px;
        }
        .badge {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          background: #ecfdf3;
          color: var(--success);
          border: 1px solid #bbf7d0;
        }
        .progress-card {
          background: linear-gradient(135deg, #fff9e6 0%, #fff 100%);
          border: 1px solid var(--warning);
        }
        .progress-bar {
          position: relative;
          height: 12px;
          border-radius: 999px;
          background: #f2efe8;
          overflow: hidden;
          margin-top: 8px;
        }
        .progress-fill {
          position: absolute;
          inset: 0;
          width: ${communityPercent}%;
          background: linear-gradient(90deg, #f5c542, #b8902e);
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .table th,
        .table td {
          padding: 8px;
          border-bottom: 1px solid var(--border);
          text-align: left;
        }
        .table th {
          background: #f8f3ea;
          font-weight: 600;
        }
        .notice-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
        }
        .action-btn {
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--brand);
          background: #fff;
        }
        .action-btn.primary {
          background: var(--brand);
          color: #fff;
          border-color: var(--brand);
        }
      `}</style>

      <header>
        <div className="brand">
          <div className="brand-mark">市</div>
          <div>
            <div className="brand-title">ecoichiba 出店者ダッシュボード</div>
            <div className="brand-sub">Payment by Fleapay / 戦略F 料金体系</div>
          </div>
        </div>
        <div className="seller-chip">{summary?.sellerId || sellerId}</div>
      </header>
      <div className="mode-row">
        <div className="mode-toggle" aria-label="表示モード">
          <span className="mode-pill active">やさしい</span>
          <span className="mode-pill">ふつう</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--sub)' }}>
          表示モードは出店者に合わせて切替
        </div>
      </div>

      {loading ? (
        <div className="notice-card">読み込み中...</div>
      ) : error ? (
        <div className="notice-card">{error}</div>
      ) : (
        <>
          <section className="hero">
            <h1 className="hero-title">出店者向けダッシュボード</h1>
            <p className="hero-sub">今月のQR決済回数とコミュニティ目標に連動して、手数料が下がります。</p>
            <div className="hero-row">
              <span className="hero-pill">今月のQR決済: {monthlyCardCount}回</span>
              <span className="hero-pill">現在の段階: {currentTier.label} {currentTier.name}</span>
              <span className="hero-pill">プラン: {summary?.planType || 'standard'}</span>
            </div>
            <div className="actions">
              <Link className="action-btn primary" href={`/seller-purchase-standard?s=${sellerId}`}>
                QR/カード決済を開始
              </Link>
              <Link className="action-btn" href={`/kids-dashboard?s=${sellerId}`}>
                キッズダッシュボード
              </Link>
            </div>
          </section>

          <div className="grid">
            <div className="card">
              <div className="card-title">今日の売上</div>
              <div className="big-number">{formatYen(summary?.salesToday?.net || 0)}</div>
              <div className="muted">
                件数 {summary?.salesToday?.count || 0}件 / 平均 {formatYen(summary?.salesToday?.avgNet || 0)}
              </div>
            </div>
            <div className="card">
              <div className="card-title">累計売上</div>
              <div className="big-number">{formatYen(summary?.salesTotal?.net || 0)}</div>
              <div className="muted">手数料合計: {formatYen(summary?.salesTotal?.fee || 0)}</div>
            </div>
            <div className="card">
              <div className="card-title">データ精度スコア</div>
              <div className="big-number">{summary?.dataScore || 0}%</div>
              <div className="muted">お客さま属性入力の充実度</div>
            </div>
          </div>

          <h2 className="section-title">戦略F 料金体系（QR決済）</h2>
          <div className="tier-grid">
            <div className="tier-card">
              <div className="tier-label">現金決済</div>
              <div className="tier-name">完全無料</div>
              <div className="tier-rate">0%</div>
              <div className="tier-range">現金はいつでも無料</div>
            </div>
            {TIERS.map((tier) => (
              <div key={tier.name} className={`tier-card ${tier.name === currentTier.name ? 'active' : ''}`}>
                <div className="tier-label">{tier.label}</div>
                <div className="tier-name">{tier.name}</div>
                <div className="tier-rate">{tier.rate}</div>
                <div className="tier-range">{tier.range}</div>
                {tier.name === currentTier.name && <span className="badge">現在地</span>}
              </div>
            ))}
          </div>

          <h2 className="section-title">コミュニティ目標チャレンジ（Phase 1）</h2>
          <div className="card progress-card">
            <div className="card-title">リリース記念チャレンジ</div>
            <div className="big-number">{formatYen(communityCurrent)}</div>
            <div className="muted">目標: {formatYen(communityTarget)} / 達成率 {communityPercent}%</div>
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <p className="muted" style={{ marginTop: '10px' }}>
              目標を達成すると、天下ランクの手数料が 2.8% + 40円 に切り替わります。
            </p>
          </div>

          <h2 className="section-title">Tier 5 ダイナミックプライシング</h2>
          <div className="grid">
            <div className="card">
              <div className="card-title">通常料金</div>
              <div className="big-number">3.3% + 40円</div>
              <div className="muted">51回以上で適用、コミュニティ未達時</div>
            </div>
            <div className="card">
              <div className="card-title">ボーナス料金</div>
              <div className="big-number">2.8% + 40円</div>
              <div className="muted">コミュニティ目標達成時に自動適用</div>
            </div>
          </div>

          <h2 className="section-title">Phase別のコミュニティ目標</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>フェーズ</th>
                  <th>期間</th>
                  <th>目標取扱高</th>
                  <th>達成時手数料</th>
                  <th>狙い</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Phase 1</td>
                  <td>0-3ヶ月</td>
                  <td>¥10,000,000</td>
                  <td>2.8%</td>
                  <td>成功体験の創出</td>
                </tr>
                <tr>
                  <td>Phase 2</td>
                  <td>4-12ヶ月</td>
                  <td>¥40,000,000</td>
                  <td>2.8%</td>
                  <td>本格運用・協力行動の促進</td>
                </tr>
                <tr>
                  <td>Phase 3</td>
                  <td>2年目以降</td>
                  <td>段階的目標</td>
                  <td>2.7-2.8%</td>
                  <td>最適化・データ価値還元</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="section-title">最近の取引</h2>
          <div className="card">
            {summary?.recent && summary.recent.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>商品</th>
                    <th>決済</th>
                    <th>金額</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent.slice(0, 5).map((tx, idx) => {
                    const amount = Number(tx.amount || tx.net_amount || 0);
                    const item = (tx.summary || tx.memo || '商品').split('\n')[0];
                    let created: Date | null = null;
                    if (typeof tx.created === 'number') {
                      created = new Date(tx.created * 1000);
                    } else if (tx.createdAt) {
                      created = new Date(tx.createdAt);
                    }
                    const createdText = created && !Number.isNaN(created.getTime())
                      ? created.toLocaleString('ja-JP')
                      : '-';
                    return (
                      <tr key={idx}>
                        <td>{createdText}</td>
                        <td>{item}</td>
                        <td>{tx.paymentMethod === 'card' ? 'QR/カード' : '現金'}</td>
                        <td>{formatYen(amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="muted">まだ取引がありません。</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function SellerDashboardPage() {
  return (
    <Suspense fallback={<div className="seller-dashboard">Loading...</div>}>
      <SellerDashboardContent />
    </Suspense>
  );
}
