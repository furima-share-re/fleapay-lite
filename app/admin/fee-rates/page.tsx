// app/admin/fee-rates/page.tsx
// 管理者向け手数料率マスタ管理画面

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

declare global {
  interface Window {
    ADMIN_TOKEN?: string;
  }
}

interface FeeRate {
  id: string;
  planType: string;
  feeRate: number;
  feeRatePercent: string;
  tier: number | null;
  effectiveFrom: Date | string;
  effectiveTo: Date | string | null;
}

interface TierDefinition {
  name: string;
  min: number;
  max: number | null;
  defaultRate: number;
}

const strategyFTiers = [
  { label: '第1段', name: '村', range: '0〜3回/月', rate: '4.8% + 40円' },
  { label: '第2段', name: '町', range: '4〜10回/月', rate: '4.4% + 40円' },
  { label: '第3段', name: '城下町', range: '11〜24回/月', rate: '4.1% + 40円' },
  { label: '第4段', name: '藩', range: '25〜50回/月', rate: '3.8% + 40円' },
  { label: '第5段', name: '天下', range: '51回以上 + 目標達成', rate: '3.3% + 40円' },
];

const phaseGoals = [
  { phase: 'Phase 1', period: '0-3ヶ月', target: '¥10,000,000', rate: '2.8%', intent: '成功体験の創出' },
  { phase: 'Phase 2', period: '4-12ヶ月', target: '¥40,000,000', rate: '2.8%', intent: '本格運用・コミュニティ効果最大化' },
  { phase: 'Phase 3', period: '2年目以降', target: '段階的目標', rate: '2.7-2.8%', intent: '最適化とデータ価値還元' },
];

export default function AdminFeeRatesPage() {
  const [feeRates, setFeeRates] = useState<FeeRate[]>([]);
  const [tierDefinitions, setTierDefinitions] = useState<Record<string, TierDefinition> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeeRates();
  }, []);

  const loadFeeRates = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';
      
      const res = await fetch('/api/admin/fee-rates', {
        headers: { 'x-admin-token': token }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      if (data.success) {
        setFeeRates(data.data.feeRates || []);
        setTierDefinitions(data.data.tierDefinitions || {});
        setError(null);
      } else {
        throw new Error(data.error || 'データの取得に失敗しました');
      }
    } catch (e) {
      console.error('Fee rates load error:', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  };

  return (
    <div className="admin-container">
      <style jsx>{`
        :root {
          --fleapay-blue: #1B365D;
          --fleapay-cream: #FBF7F0;
          --fleapay-gold: #B8902E;
          --fleapay-gray: #666666;
          --success-green: #2D5B3F;
          --error-maroon: #8B2635;
          --warning-amber: #B8860B;
        }
        * { box-sizing: border-box; }
        .nav-menu {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .nav-item {
          display: block;
          padding: 12px 20px;
          color: var(--fleapay-blue);
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s ease;
          border-radius: 0 8px 8px 0;
          margin-right: 8px;
        }
        .nav-item:hover {
          background: rgba(27, 54, 93, 0.06);
        }
        .nav-item.active {
          background: var(--fleapay-blue);
          color: #fff;
          font-weight: 600;
        }
        section {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.08);
        }
        h1 {
          margin: 0 0 8px;
          font-size: 1.5rem;
          color: var(--fleapay-blue);
        }
        h2 {
          margin: 0 0 12px;
          font-size: 1.1rem;
          color: var(--fleapay-blue);
        }
        .sec-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .pill {
          padding: 4px 12px;
          border-radius: 999px;
          background: var(--fleapay-cream);
          color: var(--fleapay-blue);
          font-size: 0.85rem;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #eee;
          background: var(--fleapay-cream);
          font-weight: 600;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: #fff;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .btn:hover {
          background: #f5f5f5;
        }
        .ghost {
          background: transparent;
          border: 1px solid #ddd;
        }
        .tier-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        .tier-card {
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 12px;
          padding: 14px;
          background: #fff;
        }
        .tier-label {
          font-size: 0.75rem;
          color: var(--fleapay-gray);
        }
        .tier-name {
          font-size: 1rem;
          font-weight: 700;
          margin: 4px 0;
        }
        .tier-rate {
          font-size: 1rem;
          font-weight: 700;
          color: var(--fleapay-blue);
        }
        .tier-range {
          font-size: 0.8rem;
          color: var(--fleapay-gray);
          margin-top: 6px;
        }
        .highlight-card {
          border: 1px solid var(--warning-amber);
          background: #fff9e6;
          border-radius: 12px;
          padding: 16px;
        }
        .progress-bar {
          position: relative;
          height: 12px;
          border-radius: 999px;
          background: #ececec;
          overflow: hidden;
          margin-top: 8px;
        }
        .progress-fill {
          position: absolute;
          inset: 0;
          width: 85%;
          background: linear-gradient(90deg, #f5c542, #b8902e);
        }
      `}</style>

      <header className="admin-header">
        <div>
          <span style={{ fontWeight: 700, color: 'var(--fleapay-blue)' }}>Fleapay Admin</span>
          <span className="env-badge" style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', background: '#f0f0f0', fontSize: '0.75rem' }}>ENV</span>
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--fleapay-gray)' }}>admin@fleapay.com ▼</span>
        </div>
      </header>

      <div className="admin-container">
        <nav className="admin-sidebar">
          <ul className="nav-menu">
            <li>
              <Link href="/admin/dashboard" className="nav-item">
                📊 ダッシュボード
              </Link>
            </li>
            <li>
              <Link href="/admin/fee-rates" className="nav-item active">
                💰 手数料率設定
              </Link>
            </li>
            <li>
              <Link href="/admin/sellers" className="nav-item">
                👥 出店者
              </Link>
            </li>
            <li>
              <Link href="/admin/frames" className="nav-item">
                🎨 AIフレーム
              </Link>
            </li>
            <li>
              <Link href="/admin/payments" className="nav-item">
                💳 決済・CB管理
              </Link>
            </li>
            <li>
              <Link href="/admin/fee-checks" className="nav-item">
                ✅ 手数料チェック
              </Link>
            </li>
            <li>
              <Link href="/admin/tier-boundary" className="nav-item">
                🧪 Tier境界テスト
              </Link>
            </li>
          </ul>
        </nav>

        <main className="admin-content">
          <section>
            <div className="sec-title-row">
              <h1>手数料率マスタ</h1>
              <span className="pill">設定</span>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <button className="btn ghost" onClick={loadFeeRates} disabled={loading}>
                {loading ? '読み込み中...' : '🔄 更新'}
              </button>
            </div>
          </section>

          <section>
            <h2>戦略F：コミュニティ連動型 料金体系</h2>
            <div className="tier-grid">
              <div className="tier-card">
                <div className="tier-label">現金決済</div>
                <div className="tier-name">完全無料</div>
                <div className="tier-rate">0%</div>
                <div className="tier-range">現金はいつでも0%</div>
              </div>
              {strategyFTiers.map((tier) => (
                <div key={tier.name} className="tier-card">
                  <div className="tier-label">{tier.label}</div>
                  <div className="tier-name">{tier.name}</div>
                  <div className="tier-rate">{tier.rate}</div>
                  <div className="tier-range">{tier.range}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginTop: '20px' }}>
            <h2>Tier 5 ダイナミックプライシング</h2>
            <div className="tier-grid">
              <div className="tier-card">
                <div className="tier-label">通常料金</div>
                <div className="tier-name">3.3% + 40円</div>
                <div className="tier-range">51回以上 + コミュニティ未達</div>
              </div>
              <div className="tier-card" style={{ borderColor: 'var(--warning-amber)', background: '#fff9e6' }}>
                <div className="tier-label">ボーナス料金</div>
                <div className="tier-name">2.8% + 40円</div>
                <div className="tier-range">コミュニティ目標達成時に適用</div>
              </div>
            </div>
          </section>

          <section style={{ marginTop: '20px' }}>
            <h2>Phase別コミュニティ目標</h2>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>フェーズ</th>
                    <th>期間</th>
                    <th>目標取扱高</th>
                    <th>達成時手数料</th>
                    <th>戦略意図</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseGoals.map((goal) => (
                    <tr key={goal.phase}>
                      <td><strong>{goal.phase}</strong></td>
                      <td>{goal.period}</td>
                      <td>{goal.target}</td>
                      <td><strong>{goal.rate}</strong></td>
                      <td>{goal.intent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ marginTop: '20px' }}>
            <h2>Phase 1 進捗（リリース記念チャレンジ）</h2>
            <div className="highlight-card">
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                現在の取扱高: ¥8,500,000 / 目標: ¥10,000,000
              </div>
              <div style={{ color: 'var(--fleapay-gray)' }}>達成率 85%（あと¥1,500,000）</div>
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
              <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--fleapay-gray)' }}>
                目標達成時は「天下」ユーザーの手数料が 2.8% + 40円 になります。
              </p>
            </div>
          </section>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
          ) : error ? (
            <div style={{ padding: '20px', background: '#fff3f3', borderRadius: '8px', color: 'var(--error-maroon)' }}>
              <strong>⚠️ データの取得に失敗しました</strong><br />
              <small>{error}</small>
            </div>
          ) : (
            <>
              <section>
                <h2>現在有効な手数料率</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>プラン</th>
                        <th>Tier</th>
                        <th>手数料率</th>
                        <th>有効開始日</th>
                        <th>有効終了日</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeRates.length > 0 ? (
                        feeRates.map((rate) => (
                          <tr key={rate.id}>
                            <td>
                              <strong>{rate.planType}</strong>
                            </td>
                            <td>
                              {rate.tier ? (
                                <span>
                                  Tier {rate.tier} ({tierDefinitions?.[rate.tier]?.name || '-'})
                                </span>
                              ) : (
                                <span style={{ color: 'var(--fleapay-gray)' }}>プラン別</span>
                              )}
                            </td>
                            <td>
                              <strong style={{ fontSize: '1.1rem', color: 'var(--fleapay-blue)' }}>
                                {rate.feeRatePercent}%
                              </strong>
                            </td>
                            <td>
                              {new Date(rate.effectiveFrom).toLocaleDateString('ja-JP')}
                            </td>
                            <td>
                              {rate.effectiveTo 
                                ? new Date(rate.effectiveTo).toLocaleDateString('ja-JP')
                                : <span style={{ color: 'var(--success-green)' }}>現在有効</span>
                              }
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--fleapay-gray)' }}>
                            手数料率マスタのデータがありません
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {tierDefinitions && (
                <section style={{ marginTop: '20px' }}>
                  <h2>Tier定義</h2>
                  <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      {Object.entries(tierDefinitions).map(([tier, def]: [string, TierDefinition]) => (
                        <div key={tier} style={{ background: '#fff', padding: '12px', borderRadius: '6px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                            Tier {tier}: {def.name}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--fleapay-gray)' }}>
                            QR決済: {def.min}〜{def.max === null ? '∞' : def.max}回
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--fleapay-blue)', marginTop: '4px' }}>
                            手数料: {(def.defaultRate * 100).toFixed(2)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section style={{ marginTop: '20px', background: '#fff9e6', border: '1px solid var(--warning-amber)', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '8px', color: '#856404' }}>📝 手数料率の変更について</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#856404', margin: 0 }}>
                  手数料率の変更は、データベースで直接行う必要があります。<br />
                  詳細は <code>手数料率マスタ_運用手順書.md</code> を参照してください。
                </p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
