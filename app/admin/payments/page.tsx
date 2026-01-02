// app/admin/payments/page.tsx
// Phase 2.3: Next.js画面移行（決済・チャージバック管理画面）

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminPaymentsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    loadStripeSummary();
  }, [period]);

  const loadStripeSummary = async () => {
    try {
      const token = typeof window !== 'undefined' 
        ? (window as any).ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken'
        : 'admin-devtoken';
      
      const res = await fetch(`/api/admin/stripe/summary?period=${encodeURIComponent(period)}`, {
        headers: { 'x-admin-token': token }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      if (data.ok && data.summary) {
        setSummary(data.summary);
        setError(null);
      } else {
        throw new Error(data.error || 'データ取得に失敗しました');
      }
    } catch (e) {
      console.error('Stripe Summary 取得失敗:', e);
      setError((e as Error).message);
      setSummary({
        paymentsCount: 0,
        paymentsGross: 0,
        netSales: 0,
        disputeCount: 0,
        urgentDisputes: 0,
        refundCount: 0,
        refundAmount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  };

  const formatNumber = (n: number) => {
    return new Intl.NumberFormat('ja-JP').format(n);
  };

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
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.08);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .card-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--fleapay-blue);
        }
        .card-metric {
          font-size: 32px;
          font-weight: 700;
          margin: 12px 0;
        }
        .card-metric-small {
          font-size: 16px;
          margin-left: 4px;
        }
        .card-subtitle {
          margin: 0;
          font-size: 14px;
          color: var(--fleapay-gray);
          line-height: 1.6;
        }
        .deadline-urgent {
          color: var(--error-maroon);
          font-weight: 600;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
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
              <Link href="/admin/payments" className="nav-item active">
                💳 決済・CB管理
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
              <h1>決済・チャージバック管理</h1>
              <button className="btn ghost" onClick={loadStripeSummary}>
                🔄 Stripe同期
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{ maxWidth: '120px' }}
              >
                <option value="today">今日</option>
                <option value="week">今週</option>
                <option value="month">今月</option>
                <option value="all">全期間</option>
              </select>
              <input
                type="text"
                placeholder="Stripe ID・金額で検索"
                style={{ maxWidth: '200px', flex: 1 }}
              />
              <button className="btn ghost">
                🔍 検索
              </button>
            </div>
          </section>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
          ) : summary ? (
            <div className="grid">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">今日の決済</h3>
                </div>
                <div className="card-metric">
                  <span>{formatNumber(summary.paymentsCount || 0)}</span>
                  <span className="card-metric-small">件</span>
                </div>
                <p className="card-subtitle">
                  総決済額: <span>{formatCurrency(summary.paymentsGross || 0)}</span><br />
                  純売上: <span>{formatCurrency(summary.netSales || 0)}</span>
                </p>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">チャージバック</h3>
                </div>
                <div className="card-metric" style={{ color: 'var(--warning-amber)' }}>
                  <span>{formatNumber(summary.disputeCount || 0)}</span>
                  <span className="card-metric-small">件</span>
                </div>
                <p className="card-subtitle">
                  期限間近: <span className="deadline-urgent">{formatNumber(summary.urgentDisputes || 0)}件</span>
                </p>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">返金</h3>
                </div>
                <div className="card-metric">
                  <span>{formatNumber(summary.refundCount || 0)}</span>
                  <span className="card-metric-small">件</span>
                </div>
                <p className="card-subtitle">
                  返金額: <span>{formatCurrency(summary.refundAmount || 0)}</span>
                </p>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

