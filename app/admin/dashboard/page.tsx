// app/admin/dashboard/page.tsx
// Phase 2.3: Next.js画面移行（管理者ダッシュボード）

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RecentActivity {
  id: string;
  sellerId: string;
  paymentIntentId: string | null;
  amountGross: number | null;
  status: string | null;
  createdAt: Date | string;
  sellerName: string | null;
  orderNo: number | null;
}

interface DashboardData {
  today: {
    orderCount: number;
    gross: number;
    net: number;
    fee: number;
  };
  yesterday: {
    orderCount: number;
    gross: number;
    net: number;
  };
  total: {
    orderCount: number;
    gross: number;
    net: number;
    fee: number;
  };
  sellerCount: number;
  recentActivity: RecentActivity[];
  paymentCount: number;
  totalRevenue: number;
  netRevenue: number;
  disputeCount: number;
  refundCount: number;
  urgentCount: number;
}

interface DailyStatsData {
  date: string;
  dayOfWeek: string;
  dayOfWeekNumber: number;
  orderCount: number;
  gross: number;
  net: number;
  sellerCount: number;
  avgGrossPerSeller: number;
  avgNetPerSeller: number;
  avgOrderCountPerSeller: number;
}

interface WeekdayStats {
  dayName: string;
  totalDays: number;
  avgGrossPerDay: number;
  avgNetPerDay: number;
  avgOrderCountPerDay: number;
  avgGrossPerSeller: number;
  avgNetPerSeller: number;
  avgOrderCountPerSeller: number;
}

interface WeekendComparison {
  saturday: {
    avgGrossPerDay: number;
    avgNetPerDay: number;
    avgOrderCountPerDay: number;
    avgGrossPerSeller: number;
    avgNetPerSeller: number;
  };
  sunday: {
    avgGrossPerDay: number;
    avgNetPerDay: number;
    avgOrderCountPerDay: number;
    avgGrossPerSeller: number;
    avgNetPerSeller: number;
  };
  higher: 'saturday' | 'sunday';
  difference: number;
  differencePercent: number;
}

declare global {
  interface Window {
    ADMIN_TOKEN?: string;
  }
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyStats, setDailyStats] = useState<{
    dailyData: DailyStatsData[];
    weekdayStats: WeekdayStats[];
    weekendComparison: WeekendComparison | null;
  } | null>(null);
  const [dailyStatsLoading, setDailyStatsLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadDailyStats();
    const interval = setInterval(loadDashboardData, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
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
        today: { orderCount: 0, gross: 0, net: 0, fee: 0 },
        yesterday: { orderCount: 0, gross: 0, net: 0 },
        total: { orderCount: 0, gross: 0, net: 0, fee: 0 },
        sellerCount: 0,
        recentActivity: [],
        paymentCount: 0,
        totalRevenue: 0,
        netRevenue: 0,
        disputeCount: 0,
        refundCount: 0,
        urgentCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDailyStats = async () => {
    try {
      setDailyStatsLoading(true);
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';
      
      const res = await fetch('/api/admin/dashboard/daily-stats', {
        headers: {
          'x-admin-token': token
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const statsData = await res.json();
      setDailyStats(statsData);
    } catch (e) {
      console.error('Daily stats load error:', e);
    } finally {
      setDailyStatsLoading(false);
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
        /* Admin container styles are now in globals.css */
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
                  {(data?.urgentCount ?? 0) > 0 || (data?.disputeCount ?? 0) > 0 ? (
                    <div>
                      {(data?.urgentCount ?? 0) > 0 && (
                        <div style={{ background: '#fff3f3', padding: '12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>⚠️ チャージバック {data?.urgentCount ?? 0}件（期限間近）</strong><br />
                            <small>早急な対応が必要です</small>
                          </div>
                          <Link href="/admin/payments?status=disputed" className="btn">対応</Link>
                        </div>
                      )}
                      {(data?.disputeCount ?? 0) > 0 && (
                        <div style={{ background: '#fef9e7', padding: '12px', borderRadius: '8px', border: '1px solid var(--warning-amber)' }}>
                          <strong>📋 チャージバック {data?.disputeCount ?? 0}件</strong><br />
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
                        data.recentActivity.map((activity, idx) => (
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

              {/* 日別統計セクション */}
              <section>
                <div className="sec-title-row">
                  <h2>日別統計（全期間）</h2>
                  <button className="btn ghost" onClick={loadDailyStats} disabled={dailyStatsLoading}>
                    {dailyStatsLoading ? '読み込み中...' : '🔄 更新'}
                  </button>
                </div>

                {dailyStatsLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
                ) : dailyStats?.weekendComparison ? (
                  <>
                    {/* 土日の比較 */}
                    <div style={{ 
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '24px',
                      border: '2px solid var(--fleapay-blue)'
                    }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: 'var(--fleapay-blue)' }}>
                        📊 土日の売上比較
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{
                          background: dailyStats.weekendComparison.higher === 'saturday' ? '#fff3cd' : '#fff',
                          padding: '16px',
                          borderRadius: '8px',
                          border: dailyStats.weekendComparison.higher === 'saturday' ? '2px solid var(--warning-amber)' : '1px solid #ddd'
                        }}>
                          <div style={{ fontSize: '0.9rem', color: 'var(--fleapay-gray)', marginBottom: '8px' }}>土曜日</div>
                          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--fleapay-blue)', marginBottom: '4px' }}>
                            {formatCurrency(dailyStats.weekendComparison.saturday.avgGrossPerDay)}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--fleapay-gray)' }}>
                            出店者1店舗あたり: {formatCurrency(dailyStats.weekendComparison.saturday.avgGrossPerSeller)}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--fleapay-gray)' }}>
                            注文数: {dailyStats.weekendComparison.saturday.avgOrderCountPerDay.toFixed(1)}件/日
                          </div>
                        </div>
                        <div style={{
                          background: dailyStats.weekendComparison.higher === 'sunday' ? '#fff3cd' : '#fff',
                          padding: '16px',
                          borderRadius: '8px',
                          border: dailyStats.weekendComparison.higher === 'sunday' ? '2px solid var(--warning-amber)' : '1px solid #ddd'
                        }}>
                          <div style={{ fontSize: '0.9rem', color: 'var(--fleapay-gray)', marginBottom: '8px' }}>日曜日</div>
                          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--fleapay-blue)', marginBottom: '4px' }}>
                            {formatCurrency(dailyStats.weekendComparison.sunday.avgGrossPerDay)}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--fleapay-gray)' }}>
                            出店者1店舗あたり: {formatCurrency(dailyStats.weekendComparison.sunday.avgGrossPerSeller)}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--fleapay-gray)' }}>
                            注文数: {dailyStats.weekendComparison.sunday.avgOrderCountPerDay.toFixed(1)}件/日
                          </div>
                        </div>
                      </div>
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '12px', 
                        background: '#fff', 
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <strong style={{ color: 'var(--fleapay-blue)' }}>
                          {dailyStats.weekendComparison.higher === 'saturday' ? '土曜日' : '日曜日'}の方が
                          {formatCurrency(dailyStats.weekendComparison.difference)} ({dailyStats.weekendComparison.differencePercent}%) 高い
                        </strong>
                      </div>
                    </div>

                    {/* 曜日別平均 */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--fleapay-blue)' }}>
                        曜日別平均（出店者1店舗あたり）
                      </h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>曜日</th>
                              <th>1日あたり平均売上</th>
                              <th>1日あたり平均注文数</th>
                              <th>出店者1店舗あたり平均売上</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyStats.weekdayStats.map((weekday, idx) => (
                              <tr key={idx}>
                                <td>
                                  <strong>{weekday.dayName}曜日</strong>
                                  {weekday.dayName === '土' || weekday.dayName === '日' ? (
                                    <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#fff3cd', borderRadius: '4px', fontSize: '0.75rem' }}>
                                      週末
                                    </span>
                                  ) : null}
                                </td>
                                <td>{formatCurrency(weekday.avgGrossPerDay)}</td>
                                <td>{weekday.avgOrderCountPerDay.toFixed(1)}件</td>
                                <td>{formatCurrency(weekday.avgGrossPerSeller)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fleapay-gray)' }}>
                    データがありません
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

