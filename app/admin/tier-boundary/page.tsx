// app/admin/tier-boundary/page.tsx
// 管理者向け: Tier境界値テスト画面

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

declare global {
  interface Window {
    ADMIN_TOKEN?: string;
  }
}

interface TierBoundaryResult {
  year: number;
  month: number;
  yearMonth: string;
  transactionCount: number;
  startTier: number;
  baseTier: number;
  currentTier: number;
  prevMonth: {
    year: number;
    month: number;
    transactionCount: number | null;
    startTier: number | null;
    currentTier: number | null;
  };
  tierDefinition: {
    name: string;
    min: number;
    max: number | null;
    defaultRate: number;
  };
  asOf: string;
  overrides: {
    transactionCount: number | null;
    prevTransactionCount: number | null;
  };
}

const toDatetimeLocal = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function AdminTierBoundaryPage() {
  const [sellerId, setSellerId] = useState('');
  const [asOf, setAsOf] = useState('');
  const [transactionCount, setTransactionCount] = useState('');
  const [prevTransactionCount, setPrevTransactionCount] = useState('');
  const [result, setResult] = useState<TierBoundaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAsOf(toDatetimeLocal(new Date()));
  }, []);

  const runTest = useCallback(async () => {
    if (!sellerId) {
      setError('出店者IDを入力してください');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';

      const params = new URLSearchParams();
      params.set('sellerId', sellerId);
      if (asOf) params.set('asOf', new Date(asOf).toISOString());
      if (transactionCount !== '') params.set('transactionCount', transactionCount);
      if (prevTransactionCount !== '') params.set('prevTransactionCount', prevTransactionCount);

      const res = await fetch(`/api/admin/tier-boundary?${params.toString()}`, {
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok) {
        setResult(data.data);
      } else {
        throw new Error(data.error || 'データ取得に失敗しました');
      }
    } catch (e) {
      console.error('Tier boundary test error:', e);
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [sellerId, asOf, transactionCount, prevTransactionCount]);

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <div className="admin-container">
      <style jsx>{`
        :root {
          --fleapay-blue: #1B365D;
          --fleapay-cream: #FBF7F0;
          --fleapay-gray: #666666;
          --success-green: #2D5B3F;
          --error-maroon: #8B2635;
          --warning-amber: #B8860B;
          --admin-sidebar-width: 220px;
          --admin-header-height: 64px;
          --admin-content-padding: 24px;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif;
          background: var(--fleapay-cream);
          color: #1A1A1A;
        }
        .admin-container {
          display: flex;
          min-height: 100vh;
        }
        .admin-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--admin-header-height);
          background: #fff;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--admin-content-padding);
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .admin-sidebar {
          position: fixed;
          top: var(--admin-header-height);
          left: 0;
          width: var(--admin-sidebar-width);
          height: calc(100vh - var(--admin-header-height));
          background: #fff;
          border-right: 1px solid rgba(0,0,0,0.08);
          padding: 16px 0;
          overflow-y: auto;
        }
        .admin-content {
          margin-left: var(--admin-sidebar-width);
          margin-top: var(--admin-header-height);
          padding: var(--admin-content-padding);
          flex: 1;
          min-height: calc(100vh - var(--admin-header-height));
        }
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
          margin-bottom: 20px;
        }
        h1 {
          margin: 0 0 8px;
          font-size: 1.5rem;
          color: var(--fleapay-blue);
        }
        .sec-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: var(--fleapay-blue);
          color: #fff;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .btn:hover {
          background: #1a4480;
        }
        .ghost {
          background: transparent;
          border: 1px solid #ddd;
          color: var(--fleapay-blue);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .card {
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 12px;
          padding: 16px;
          background: #fff;
        }
        .card-title {
          font-size: 0.85rem;
          color: var(--fleapay-gray);
        }
        .card-metric {
          font-size: 28px;
          font-weight: 700;
          margin-top: 8px;
        }
        input, select {
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #ddd;
          font-size: 0.9rem;
        }
        .error-banner {
          background: #fef2f2;
          border-left: 4px solid var(--error-maroon);
          padding: 12px 16px;
          margin: 16px 0;
          border-radius: 8px;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.85rem;
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
              <Link href="/admin/fee-rates" className="nav-item">
                📈 手数料率マスタ
              </Link>
            </li>
            <li>
              <Link href="/admin/fee-checks" className="nav-item">
                ✅ 手数料チェック
              </Link>
            </li>
            <li>
              <Link href="/admin/tier-boundary" className="nav-item active">
                🧪 Tier境界テスト
              </Link>
            </li>
          </ul>
        </nav>

        <main className="admin-content">
          {error && (
            <div className="error-banner">
              <strong>⚠️ エラー:</strong> <span>{error}</span>
            </div>
          )}

          <section>
            <div className="sec-title-row">
              <h1>Tier境界値テスト</h1>
              <button className="btn ghost" onClick={runTest} disabled={loading}>
                {loading ? 'テスト中...' : '▶ テスト実行'}
              </button>
            </div>

            <div className="grid" style={{ marginBottom: '16px' }}>
              <div className="card">
                <div className="card-title">出店者ID</div>
                <input
                  type="text"
                  placeholder="seller-xxxxx"
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>
              <div className="card">
                <div className="card-title">判定日時</div>
                <input
                  type="datetime-local"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>
              <div className="card">
                <div className="card-title">当月決済回数（上書き）</div>
                <input
                  type="number"
                  min="0"
                  placeholder="空欄で実データ"
                  value={transactionCount}
                  onChange={(e) => setTransactionCount(e.target.value)}
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>
              <div className="card">
                <div className="card-title">前月決済回数（上書き）</div>
                <input
                  type="number"
                  min="0"
                  placeholder="月跨ぎテスト用"
                  value={prevTransactionCount}
                  onChange={(e) => setPrevTransactionCount(e.target.value)}
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>
            </div>
          </section>

          {result && (
            <section>
              <div className="grid">
                <div className="card">
                  <div className="card-title">対象月</div>
                  <div className="card-metric">{result.yearMonth}</div>
                  <div className="mono">asOf: {new Date(result.asOf).toLocaleString('ja-JP')}</div>
                </div>
                <div className="card">
                  <div className="card-title">決済回数</div>
                  <div className="card-metric">{result.transactionCount}</div>
                  <div className="mono">上書き: {result.overrides.transactionCount ?? 'なし'}</div>
                </div>
                <div className="card">
                  <div className="card-title">Tier判定</div>
                  <div className="card-metric">Tier {result.currentTier}</div>
                  <div className="mono">開始Tier: {result.startTier} / 基本Tier: {result.baseTier}</div>
                </div>
                <div className="card">
                  <div className="card-title">Tier定義</div>
                  <div className="card-metric">{result.tierDefinition.name}</div>
                  <div className="mono">範囲: {result.tierDefinition.min}〜{result.tierDefinition.max ?? '∞'}</div>
                  <div className="mono">既定率: {formatPercent(result.tierDefinition.defaultRate)}</div>
                </div>
              </div>

              <div className="grid" style={{ marginTop: '16px' }}>
                <div className="card">
                  <div className="card-title">前月情報</div>
                  <div className="mono">
                    {result.prevMonth.year}-{String(result.prevMonth.month).padStart(2, '0')}
                  </div>
                  <div className="mono">決済回数: {result.prevMonth.transactionCount ?? '未計算'}</div>
                  <div className="mono">startTier: {result.prevMonth.startTier ?? '-'}</div>
                  <div className="mono">currentTier: {result.prevMonth.currentTier ?? '-'}</div>
                  <div className="mono">上書き: {result.overrides.prevTransactionCount ?? 'なし'}</div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
