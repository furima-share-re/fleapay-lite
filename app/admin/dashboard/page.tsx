// app/admin/dashboard/page.tsx
// Phase 2.3: Next.js画面移行（管理者ダッシュボード）

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = typeof window !== 'undefined' 
        ? (window as any).ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken'
        : 'admin-devtoken';
      
      const res = await fetch('/api/admin/dashboard', {
        headers: {
          'x-admin-token': token
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const dashboardData = await res.json();
      setData(dashboardData);
      setError(null);
    } catch (e) {
      console.error('Dashboard load error:', e);
      setError((e as Error).message);
      setData({
        paymentCount: 0,
        totalRevenue: 0,
        netRevenue: 0,
        disputeCount: 0,
        refundCount: 0,
        urgentCount: 0,
        recentSellers: []
      });
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
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
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
              <Link href="/admin/dashboard" className="nav-item active">
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
          </ul>
        </nav>

        <main className="admin-content">
          <section>
            <div className="sec-title-row">
              <h1>ダッシュボード</h1>
              <span className="pill">ホーム</span>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <select id="periodFilter" style={{ padding: '8px', borderRadius: '8px' }}>
                <option value="today">今日</option>
                <option value="week">今週</option>
                <option value="month">今月</option>
              </select>
              <button className="btn ghost" onClick={loadDashboardData}>
                🔄 更新
              </button>
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
              <div className="grid">
                <section>
                  <h2>今日の決済サマリ</h2>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fleapay-blue)', margin: '12px 0' }}>
                    <span>{data?.paymentCount || 0}</span>
                    <span style={{ fontSize: '16px', marginLeft: '4px' }}>件</span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--fleapay-gray)' }}>
                    売上合計: <span>{formatCurrency(data?.totalRevenue || 0)}</span><br />
                    純売上: <span>{formatCurrency(data?.netRevenue || 0)}</span>
                  </div>
                </section>
                
                <section>
                  <h2>チャージバック / 返金</h2>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warning-amber)', margin: '12px 0' }}>
                    <span>{data?.disputeCount || 0}</span>
                    <span style={{ fontSize: '16px', marginLeft: '4px' }}>件</span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--fleapay-gray)' }}>
                    返金: <span>{data?.refundCount || 0}</span>件<br />
                    期限間近: <span style={{ color: 'var(--error-maroon)' }}>{data?.urgentCount || 0}</span>件 🔔
                  </div>
                </section>
              </div>

              <section>
                <h2>最近のアラート</h2>
                <div id="alertsList">
                  {data?.urgentCount > 0 || data?.disputeCount > 0 ? (
                    <div>
                      {data.urgentCount > 0 && (
                        <div style={{ background: '#fff3f3', padding: '12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>⚠️ チャージバック {data.urgentCount}件（期限間近）</strong><br />
                            <small>早急な対応が必要です</small>
                          </div>
                          <Link href="/admin/payments?status=disputed" className="btn">対応</Link>
                        </div>
                      )}
                      {data.disputeCount > 0 && (
                        <div style={{ background: '#fef9e7', padding: '12px', borderRadius: '8px', border: '1px solid var(--warning-amber)' }}>
                          <strong>📋 チャージバック {data.disputeCount}件</strong><br />
                          <small>対応状況を確認してください</small>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--success-green)' }}>
                      ✅ アラートはありません
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h2>出店者アクティビティ</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>出店者ID</th>
                        <th>店名</th>
                        <th>ステータス</th>
                        <th>最終利用</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.recentActivity && data.recentActivity.length > 0 ? (
                        data.recentActivity.map((activity: any, idx: number) => (
                          <tr key={idx}>
                            <td>{activity.sellerId}</td>
                            <td>{activity.sellerName || '-'}</td>
                            <td>{activity.status || '-'}</td>
                            <td>{activity.createdAt ? new Date(activity.createdAt).toLocaleString('ja-JP') : '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--fleapay-gray)' }}>
                            {loading ? '読み込み中...' : 'データがありません'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

