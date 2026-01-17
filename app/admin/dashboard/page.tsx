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
  avgUnitPricePerSeller: number;
}

interface WeekendComparison {
  saturday: {
    avgGrossPerDay: number;
    avgNetPerDay: number;
    avgOrderCountPerDay: number;
    avgGrossPerSeller: number;
    avgNetPerSeller: number;
    avgUnitPricePerSeller: number;
  };
  sunday: {
    avgGrossPerDay: number;
    avgNetPerDay: number;
    avgOrderCountPerDay: number;
    avgGrossPerSeller: number;
    avgNetPerSeller: number;
    avgUnitPricePerSeller: number;
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
              <Link href="/admin/kpi-management" className="nav-item">
                📈 KPI管理
              </Link>
            </li>
            <li>
              <Link href="/admin/sellers" className="nav-item">
                👥 出店者
              </Link>
            </li>
            <li>
              <Link href="/admin/fee-rates" className="nav-item">
                💰 手数料率設定
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
                    純売上: <span>{formatCurrency(data?.netRevenue || 0)}</span><br />
                    手数料: <span>{formatCurrency((data?.total?.fee || 0) as number)}</span>
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
                          <div style={{ fontSize: '0.85rem', color: 'var(--fleapay-gray)', marginTop: '4px', fontWeight: 600 }}>
                            平均単価: {formatCurrency(dailyStats.weekendComparison.saturday.avgUnitPricePerSeller)}
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
                          <div style={{ fontSize: '0.85rem', color: 'var(--fleapay-gray)', marginTop: '4px', fontWeight: 600 }}>
                            平均単価: {formatCurrency(dailyStats.weekendComparison.sunday.avgUnitPricePerSeller)}
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
                              <th>平均単価</th>
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
                                <td><strong>{formatCurrency(weekday.avgUnitPricePerSeller)}</strong></td>
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

              {/* ベンチマーク・成果目標・KPIセクション */}
              <section style={{ marginTop: '40px' }}>
                <div className="sec-title-row">
                  <h1 style={{ fontSize: '1.8rem', borderLeft: '8px solid var(--fleapay-blue)', paddingLeft: '20px' }}>
                    📊 広告事業 - ベンチマーク・成果目標・KPI
                  </h1>
                  <span className="pill">広告事業</span>
                </div>
              </section>

              {/* 1. 結果目標セクション */}
              <section style={{ marginTop: '30px' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--fleapay-blue)', borderLeft: '6px solid #e63946', paddingLeft: '15px', marginBottom: '20px' }}>
                  🎯 1. 結果目標（5年展望）
                </h2>
                
                {/* 5年後の到達目標 */}
                <div style={{
                  background: 'linear-gradient(135deg, #e63946 0%, #c0392b 100%)',
                  color: '#fff',
                  padding: '30px',
                  borderRadius: '15px',
                  marginBottom: '30px',
                  boxShadow: '0 15px 40px rgba(230, 57, 70, 0.3)'
                }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#fff' }}>5年後(2031年)の到達目標</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '20px', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                      <div style={{ fontSize: '2em', fontWeight: 700, color: 'var(--fleapay-gold)', marginBottom: '8px' }}>1.5億</div>
                      <div style={{ fontSize: '1.05em', opacity: 0.95 }}>年間リーチ数</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '20px', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                      <div style={{ fontSize: '2em', fontWeight: 700, color: 'var(--fleapay-gold)', marginBottom: '8px' }}>¥320</div>
                      <div style={{ fontSize: '1.05em', opacity: 0.95 }}>加重平均CPM</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '20px', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                      <div style={{ fontSize: '2em', fontWeight: 700, color: 'var(--fleapay-gold)', marginBottom: '8px' }}>¥2.3億</div>
                      <div style={{ fontSize: '1.05em', opacity: 0.95 }}>年間総収益</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '20px', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                      <div style={{ fontSize: '2em', fontWeight: 700, color: 'var(--fleapay-gold)', marginBottom: '8px' }}>23億円</div>
                      <div style={{ fontSize: '1.05em', opacity: 0.95 }}>事業譲渡価値</div>
                    </div>
                  </div>
                </div>

                {/* Phase別・年次別目標マップ */}
                <h3 style={{ fontSize: '1.2rem', color: '#e63946', margin: '25px 0 15px', borderBottom: '2px solid var(--fleapay-gold)', paddingBottom: '8px' }}>
                  Phase別・年次別目標マップ
                </h3>
                <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>時期</th>
                        <th>年間リーチ</th>
                        <th>平均CPM</th>
                        <th>年間広告価値</th>
                        <th>実質収益</th>
                        <th>事業譲渡価値<br/>(10倍評価)</th>
                        <th>達成確率</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Phase 1<br/>(6ヶ月)</strong></td>
                        <td>2,500万</td>
                        <td>¥125</td>
                        <td>¥3,125,000</td>
                        <td>¥0</td>
                        <td>¥31,250,000</td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>90% ✅</span></td>
                      </tr>
                      <tr>
                        <td><strong>Phase 2<br/>(12ヶ月)</strong></td>
                        <td>4,000万</td>
                        <td>¥125</td>
                        <td>¥5,000,000</td>
                        <td>¥2,000,000</td>
                        <td>¥50,000,000</td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>85% ✅</span></td>
                      </tr>
                      <tr>
                        <td><strong>Phase 3<br/>(18ヶ月)</strong></td>
                        <td>5,500万</td>
                        <td>¥125</td>
                        <td>¥6,875,000</td>
                        <td>¥3,500,000</td>
                        <td>¥68,750,000</td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>80% ✅</span></td>
                      </tr>
                      <tr style={{ background: '#fff9e6', fontWeight: 700 }}>
                        <td><strong>Phase 4<br/>(24ヶ月)</strong></td>
                        <td><strong>7,000万</strong></td>
                        <td><strong>¥125</strong></td>
                        <td><strong>¥8,750,000</strong></td>
                        <td><strong>¥5,000,000</strong></td>
                        <td><strong>¥87,500,000</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>80% ✅</span></td>
                      </tr>
                      <tr>
                        <td><strong>Year 3</strong></td>
                        <td>8,500万</td>
                        <td>¥160</td>
                        <td>¥13,600,000</td>
                        <td>¥80,000,000</td>
                        <td>¥136,000,000</td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>75% ✅</span></td>
                      </tr>
                      <tr>
                        <td><strong>Year 4</strong></td>
                        <td>1億</td>
                        <td>¥210</td>
                        <td>¥21,000,000</td>
                        <td>¥110,000,000</td>
                        <td>¥210,000,000</td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>70% ✅</span></td>
                      </tr>
                      <tr>
                        <td><strong>Year 5</strong></td>
                        <td>1.2億</td>
                        <td>¥280</td>
                        <td>¥33,600,000</td>
                        <td>¥150,000,000</td>
                        <td>¥336,000,000</td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>65% ✅</span></td>
                      </tr>
                      <tr style={{ background: '#e8f5e9', fontWeight: 700 }}>
                        <td><strong>Year 6-7<br/>(5年後)</strong></td>
                        <td><strong>1.5億</strong></td>
                        <td><strong>¥320</strong></td>
                        <td><strong>¥48,000,000</strong></td>
                        <td><strong>¥233,500,000</strong></td>
                        <td><strong>¥2,335,000,000<br/>(約23億円)</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>65% ✅</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3つのシナリオ */}
                <h3 style={{ fontSize: '1.2rem', color: '#e63946', margin: '25px 0 15px', borderBottom: '2px solid var(--fleapay-gold)', paddingBottom: '8px' }}>
                  目標の3つのシナリオ（5年後）
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #fff 0%, var(--fleapay-cream) 100%)', borderRadius: '15px', padding: '25px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)', border: '2px solid var(--fleapay-gold)' }}>
                    <div style={{ fontSize: '3em', marginBottom: '12px' }}>🛡️</div>
                    <h3 style={{ color: 'var(--fleapay-blue)', fontSize: '1.3em', marginBottom: '12px', fontWeight: 700 }}>保守的シナリオ</h3>
                    <div style={{ fontSize: '2.5em', fontWeight: 700, color: '#e63946', margin: '12px 0' }}>15億円</div>
                    <div style={{ color: '#666', fontSize: '0.95em', lineHeight: 1.6 }}>
                      <strong>リーチ:</strong> 1億<br/>
                      <strong>CPM:</strong> ¥250<br/>
                      <strong>実現確率:</strong> <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>80%</span>
                    </div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #fff 0%, var(--fleapay-cream) 100%)', borderRadius: '15px', padding: '25px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)', border: '2px solid #e63946', borderWidth: '3px' }}>
                    <div style={{ fontSize: '3em', marginBottom: '12px' }}>🎯</div>
                    <h3 style={{ color: 'var(--fleapay-blue)', fontSize: '1.3em', marginBottom: '12px', fontWeight: 700 }}>標準シナリオ</h3>
                    <div style={{ fontSize: '2.5em', fontWeight: 700, color: 'var(--fleapay-blue)', margin: '12px 0' }}>23億円</div>
                    <div style={{ color: '#666', fontSize: '0.95em', lineHeight: 1.6 }}>
                      <strong>リーチ:</strong> 1.5億<br/>
                      <strong>CPM:</strong> ¥320<br/>
                      <strong>実現確率:</strong> <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>65%</span>
                    </div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #fff 0%, var(--fleapay-cream) 100%)', borderRadius: '15px', padding: '25px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)', border: '2px solid var(--fleapay-gold)' }}>
                    <div style={{ fontSize: '3em', marginBottom: '12px' }}>🚀</div>
                    <h3 style={{ color: 'var(--fleapay-blue)', fontSize: '1.3em', marginBottom: '12px', fontWeight: 700 }}>楽観的シナリオ</h3>
                    <div style={{ fontSize: '2.5em', fontWeight: 700, color: 'var(--fleapay-gold)', margin: '12px 0' }}>53億円</div>
                    <div style={{ color: '#666', fontSize: '0.95em', lineHeight: 1.6 }}>
                      <strong>リーチ:</strong> 2億<br/>
                      <strong>CPM:</strong> ¥500<br/>
                      <strong>実現確率:</strong> <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#f39c12', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>30%</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. ベンチマーク比較セクション */}
              <section style={{ marginTop: '40px' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--fleapay-blue)', borderLeft: '6px solid #e63946', paddingLeft: '15px', marginBottom: '20px' }}>
                  📊 2. ベンチマーク比較
                </h2>

                {/* 広告単価(CPM)ベンチマーク */}
                <h3 style={{ fontSize: '1.2rem', color: '#e63946', margin: '25px 0 15px', borderBottom: '2px solid var(--fleapay-gold)', paddingBottom: '8px' }}>
                  A. 広告単価(CPM)ベンチマーク
                </h3>
                <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>コンテンツ種別</th>
                        <th>フォロワー層</th>
                        <th>業界標準CPM<br/>(現在)</th>
                        <th>EDO ICHIBA<br/>(現在)</th>
                        <th>EDO ICHIBA<br/>(5年後)</th>
                        <th>成長率</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>一般UGC</strong></td>
                        <td>500-2,000人</td>
                        <td>¥30-50</td>
                        <td><strong>¥80</strong></td>
                        <td><strong>¥200</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>+150%</span></td>
                      </tr>
                      <tr>
                        <td><strong>マイクロインフルエンサー</strong></td>
                        <td>5,000-10,000人</td>
                        <td>¥80-120</td>
                        <td><strong>¥100</strong></td>
                        <td><strong>¥300</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>+200%</span></td>
                      </tr>
                      <tr>
                        <td><strong>ミドルインフルエンサー</strong></td>
                        <td>10,000-50,000人</td>
                        <td>¥150-250</td>
                        <td><strong>¥200</strong></td>
                        <td><strong>¥450</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>+125%</span></td>
                      </tr>
                      <tr>
                        <td><strong>公式ブランドUGC</strong></td>
                        <td>-</td>
                        <td>¥100-200</td>
                        <td><strong>¥150</strong></td>
                        <td><strong>¥350</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>+133%</span></td>
                      </tr>
                      <tr>
                        <td><strong>バイラルコンテンツ</strong></td>
                        <td>1万回以上</td>
                        <td>¥200-400</td>
                        <td><strong>¥300</strong></td>
                        <td><strong>¥800</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>+167%</span></td>
                      </tr>
                      <tr style={{ background: '#fff9e6', fontWeight: 700 }}>
                        <td><strong>加重平均CPM</strong></td>
                        <td>-</td>
                        <td>¥100</td>
                        <td><strong>¥125</strong></td>
                        <td><strong>¥320</strong></td>
                        <td><strong><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>+156%</span></strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* リーチ効率ベンチマーク */}
                <h3 style={{ fontSize: '1.2rem', color: '#e63946', margin: '25px 0 15px', borderBottom: '2px solid var(--fleapay-gold)', paddingBottom: '8px' }}>
                  C. リーチ効率ベンチマーク
                </h3>
                <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>指標</th>
                        <th>一般的フリマ</th>
                        <th>EDO ICHIBA<br/>(Phase 4)</th>
                        <th>EDO ICHIBA<br/>(5年後)</th>
                        <th>競合優位性</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>来場者あたり投稿率</strong></td>
                        <td>5-10%</td>
                        <td><strong>20-50%</strong></td>
                        <td><strong>50-70%</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>5-10倍 🔥</span></td>
                      </tr>
                      <tr>
                        <td><strong>投稿あたり平均リーチ</strong></td>
                        <td>300-800回</td>
                        <td><strong>1,500-2,000回</strong></td>
                        <td><strong>3,000-5,000回</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>4-6倍 🔥</span></td>
                      </tr>
                      <tr>
                        <td><strong>エンゲージメント率</strong></td>
                        <td>2-4%</td>
                        <td><strong>6-8%</strong></td>
                        <td><strong>10-15%</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>3-4倍 🔥</span></td>
                      </tr>
                      <tr>
                        <td><strong>コンテンツ寿命</strong></td>
                        <td>24-48時間</td>
                        <td><strong>7日-30日</strong></td>
                        <td><strong>30-90日</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>15-45倍 🔥</span></td>
                      </tr>
                      <tr>
                        <td><strong>バイラル化率</strong></td>
                        <td>1%未満</td>
                        <td><strong>3-5%</strong></td>
                        <td><strong>10-15%</strong></td>
                        <td><span style={{ padding: '4px 12px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700 }}>10-15倍 🔥</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 3. KPI体系セクション */}
              <section style={{ marginTop: '40px' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--fleapay-blue)', borderLeft: '6px solid #e63946', paddingLeft: '15px', marginBottom: '20px' }}>
                  📈 3. KPI体系（外的要因を排除）
                </h2>

                {/* KPI設計の原則 */}
                <div style={{ background: '#fff3cd', borderLeft: '6px solid #f39c12', padding: '25px', margin: '25px 0', borderRadius: '8px' }}>
                  <h3 style={{ color: '#856404', fontSize: '1.3em', marginBottom: '12px' }}>⚠️ KPI設計の原則</h3>
                  <p style={{ fontSize: '1.05em', lineHeight: 1.8 }}>
                    従来の「年間リーチ数」「平均CPM」などは<strong>外的要因(SNSアルゴリズム・市場動向)</strong>に依存するため、KPIとしては不適切です。本体系では<strong>完全にコントロール可能な内的要因のみ</strong>を管理指標として設定します。
                  </p>
                </div>

                {/* Tier 1: 完全コントロール可能KPI */}
                <div style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', border: '3px solid #27ae60', borderRadius: '15px', padding: '25px', marginBottom: '30px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.3em', marginBottom: '15px' }}>
                    <span style={{ display: 'inline-block', padding: '6px 18px', borderRadius: '20px', background: '#27ae60', color: '#fff', fontSize: '0.85em', fontWeight: 700, marginRight: '10px' }}>Tier 1</span>
                    完全コントロール可能KPI(Input指標)
                  </h3>
                  <p style={{ fontSize: '1.05em', marginBottom: '20px' }}>
                    ✅ <strong>自社の行動・投資だけで100%達成可能</strong><br/>
                    ✅ 外的要因の影響ゼロ<br/>
                    ✅ 日次・週次で管理可能
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>カテゴリ</th>
                          <th>KPI</th>
                          <th>Phase 4目標</th>
                          <th>5年後目標</th>
                          <th>計測方法</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td rowSpan={4}><strong>システム品質</strong></td>
                          <td>システム稼働率</td>
                          <td>95%</td>
                          <td>99.5%</td>
                          <td>サーバー監視</td>
                        </tr>
                        <tr>
                          <td>おみくじ完了率</td>
                          <td>90%</td>
                          <td>95%</td>
                          <td>ファネル分析</td>
                        </tr>
                        <tr>
                          <td>平均レスポンス時間</td>
                          <td>2秒以内</td>
                          <td>1秒以内</td>
                          <td>APM</td>
                        </tr>
                        <tr>
                          <td>システム自動運用率</td>
                          <td>95%</td>
                          <td>99%</td>
                          <td>運用ログ</td>
                        </tr>
                        <tr>
                          <td rowSpan={3}><strong>コンテンツ生産性</strong></td>
                          <td>公式UGC投稿数/日</td>
                          <td>12本</td>
                          <td>41本</td>
                          <td>配信ログ</td>
                        </tr>
                        <tr>
                          <td>AI生成成功率</td>
                          <td>95%</td>
                          <td>99%</td>
                          <td>生成ログ</td>
                        </tr>
                        <tr>
                          <td>コンテンツ制作コスト/本</td>
                          <td>¥200</td>
                          <td>¥50</td>
                          <td>会計データ</td>
                        </tr>
                        <tr>
                          <td rowSpan={2}><strong>デジタル体験設計</strong></td>
                          <td>UI改善回数/月</td>
                          <td>4回</td>
                          <td>12回</td>
                          <td>A/Bテスト管理</td>
                        </tr>
                        <tr>
                          <td>投稿テンプレート生成速度</td>
                          <td>5秒</td>
                          <td>2秒</td>
                          <td>システムログ</td>
                        </tr>
                        <tr>
                          <td rowSpan={3}><strong>営業活動</strong></td>
                          <td>広告主商談件数/月</td>
                          <td>10件</td>
                          <td>50件</td>
                          <td>CRM</td>
                        </tr>
                        <tr>
                          <td>提案書送付数/月</td>
                          <td>15件</td>
                          <td>80件</td>
                          <td>営業管理</td>
                        </tr>
                        <tr>
                          <td>フォローアップ実施率</td>
                          <td>100%</td>
                          <td>100%</td>
                          <td>CRM</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tier 2: 影響可能KPI */}
                <div style={{ background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', border: '3px solid #f39c12', borderRadius: '15px', padding: '25px', marginBottom: '30px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.3em', marginBottom: '15px' }}>
                    <span style={{ display: 'inline-block', padding: '6px 18px', borderRadius: '20px', background: '#f39c12', color: '#fff', fontSize: '0.85em', fontWeight: 700, marginRight: '10px' }}>Tier 2</span>
                    影響可能KPI(Process指標)
                  </h3>
                  <p style={{ fontSize: '1.05em', marginBottom: '20px' }}>
                    🟡 <strong>自社努力で大きく影響を与えられる(70-80%コントロール可能)</strong><br/>
                    🟡 一部外的要因の影響あり(ユーザー行動)<br/>
                    🟡 Tier 1のKPIが達成されれば、高確率で達成
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>カテゴリ</th>
                          <th>KPI</th>
                          <th>Phase 4目標</th>
                          <th>5年後目標</th>
                          <th>影響する内的施策(Tier 1)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td rowSpan={3}><strong>利用率</strong></td>
                          <td>おみくじ参加率</td>
                          <td>80%</td>
                          <td>90%</td>
                          <td>システム自動運用率・UI改善回数</td>
                        </tr>
                        <tr>
                          <td>投稿率</td>
                          <td>50%</td>
                          <td>70%</td>
                          <td>テンプレート生成速度・導線整備</td>
                        </tr>
                        <tr>
                          <td>月間QR決済数</td>
                          <td>16,000回/月</td>
                          <td>-</td>
                          <td>おみくじ完了率・UI改善回数・導線整備</td>
                        </tr>
                        <tr>
                          <td rowSpan={2}><strong>エンゲージメント</strong></td>
                          <td>コメント率</td>
                          <td>5件/投稿</td>
                          <td>15件/投稿</td>
                          <td>コンテンツ品質・投稿本数</td>
                        </tr>
                        <tr>
                          <td>シェア率</td>
                          <td>20%</td>
                          <td>40%</td>
                          <td>テンプレート品質</td>
                        </tr>
                        <tr>
                          <td rowSpan={2}><strong>広告主満足度</strong></td>
                          <td>広告主NPS</td>
                          <td>+40</td>
                          <td>+70</td>
                          <td>レポート配信率・商談品質</td>
                        </tr>
                        <tr>
                          <td>契約更新率</td>
                          <td>90%</td>
                          <td>95%</td>
                          <td>効果実証・フォローアップ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tier 3: 結果指標 */}
                <div style={{ background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)', border: '3px solid #e74c3c', borderRadius: '15px', padding: '25px', marginBottom: '30px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.3em', marginBottom: '15px' }}>
                    <span style={{ display: 'inline-block', padding: '6px 18px', borderRadius: '20px', background: '#e74c3c', color: '#fff', fontSize: '0.85em', fontWeight: 700, marginRight: '10px' }}>Tier 3</span>
                    結果指標(Outcome指標)【参考値】
                  </h3>
                  <p style={{ fontSize: '1.05em', marginBottom: '20px' }}>
                    ⚠️ <strong>外的要因の影響が大きい(50%以上が外部環境依存)</strong><br/>
                    ⚠️ ビジネス成果として重要だが、KPIとしては不適切<br/>
                    ⚠️ Tier 1・2が達成されれば、自然に向上する「結果」として扱う
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>指標</th>
                          <th>Phase 4</th>
                          <th>5年後</th>
                          <th>主な外的要因</th>
                          <th>扱い方</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>年間総リーチ数</strong></td>
                          <td>7,000万</td>
                          <td>1.5億</td>
                          <td>SNSアルゴリズム変更</td>
                          <td>📊 モニタリング指標</td>
                        </tr>
                        <tr>
                          <td><strong>個人UGC平均リーチ</strong></td>
                          <td>1,500回</td>
                          <td>3,500回</td>
                          <td>プラットフォーム仕様</td>
                          <td>📊 モニタリング指標</td>
                        </tr>
                        <tr>
                          <td><strong>平均CPM単価</strong></td>
                          <td>¥125</td>
                          <td>¥320</td>
                          <td>広告市場全体の動向</td>
                          <td>📊 市場参考値</td>
                        </tr>
                        <tr>
                          <td><strong>実質広告収益</strong></td>
                          <td>¥5,000,000</td>
                          <td>¥233,500,000</td>
                          <td>経済状況・業界動向</td>
                          <td>📊 財務指標</td>
                        </tr>
                        <tr>
                          <td><strong>広告主獲得数</strong></td>
                          <td>15社</td>
                          <td>150社</td>
                          <td>市場環境・競合状況</td>
                          <td>📊 営業成果指標</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Phase別KPI管理表 */}
                <h3 style={{ fontSize: '1.2rem', color: '#e63946', margin: '25px 0 15px', borderBottom: '2px solid var(--fleapay-gold)', paddingBottom: '8px' }}>
                  Phase別KPI管理表
                </h3>
                <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th rowSpan={2}>Phase</th>
                        <th colSpan={4}>Tier 1(完全コントロール)</th>
                        <th colSpan={2}>Tier 2(影響可能)</th>
                        <th rowSpan={2}>Tier 3(参考)<br/>年間リーチ</th>
                      </tr>
                      <tr>
                        <th>システム稼働率</th>
                        <th>システム自動運用率</th>
                        <th>公式UGC本数/日</th>
                        <th>商談件数/月</th>
                        <th>おみくじ参加率</th>
                        <th>投稿率</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Phase 1</strong></td>
                        <td>95%</td>
                        <td>95%</td>
                        <td>6本</td>
                        <td>5件</td>
                        <td>70%</td>
                        <td>20%</td>
                        <td>2,500万</td>
                      </tr>
                      <tr>
                        <td><strong>Phase 2</strong></td>
                        <td>96%</td>
                        <td>96%</td>
                        <td>9本</td>
                        <td>7件</td>
                        <td>75%</td>
                        <td>25%</td>
                        <td>4,000万</td>
                      </tr>
                      <tr>
                        <td><strong>Phase 3</strong></td>
                        <td>97%</td>
                        <td>96%</td>
                        <td>11本</td>
                        <td>8件</td>
                        <td>80%</td>
                        <td>30%</td>
                        <td>5,500万</td>
                      </tr>
                      <tr style={{ background: '#e8f5e9' }}>
                        <td><strong>Phase 4</strong></td>
                        <td><strong>95%</strong></td>
                        <td><strong>95%</strong></td>
                        <td><strong>12本</strong></td>
                        <td><strong>10件</strong></td>
                        <td><strong>80%</strong></td>
                        <td><strong>50%</strong></td>
                        <td><strong>7,000万</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Year 5</strong></td>
                        <td>99%</td>
                        <td>98%</td>
                        <td>27本</td>
                        <td>30件</td>
                        <td>85%</td>
                        <td>65%</td>
                        <td>1.2億</td>
                      </tr>
                      <tr style={{ background: '#e8f5e9' }}>
                        <td><strong>Year 6-7</strong></td>
                        <td><strong>99.5%</strong></td>
                        <td><strong>99%</strong></td>
                        <td><strong>41本</strong></td>
                        <td><strong>50件</strong></td>
                        <td><strong>90%</strong></td>
                        <td><strong>70%</strong></td>
                        <td><strong>1.5億</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 週次管理セクション */}
              <KpiManagementSection />
              <GoalManagementSection />
              <BenchmarkManagementSection />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// KPI管理コンポーネント（自動集計版）
function KpiManagementSection() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // 今週の月曜日を取得
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadKpiData();
  }, [selectedWeek]);

  const loadKpiData = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';
      
      const res = await fetch(`/api/admin/kpi-metrics/auto?weekStart=${selectedWeek}`, {
        headers: { 'x-admin-token': token }
      });
      
      if (res.ok) {
        const result = await res.json();
        setKpiData(result.data || []);
        setMetadata(result.metadata || null);
      }
    } catch (e) {
      console.error('KPI load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Tier 1の主要KPI定義
  const tier1Kpis = [
    { key: 'system_uptime', name: 'システム稼働率', unit: '%', phase: 'phase4', target: 95, target5y: 99.5 },
    { key: 'omikuji_completion_rate', name: 'おみくじ完了率', unit: '%', phase: 'phase4', target: 90, target5y: 95 },
    { key: 'avg_response_time', name: '平均レスポンス時間', unit: '秒', phase: 'phase4', target: 2, target5y: 1 },
    { key: 'system_automation_rate', name: 'システム自動運用率', unit: '%', phase: 'phase4', target: 95, target5y: 99 },
    { key: 'ugc_posts_per_day', name: '公式UGC投稿数/日', unit: '本', phase: 'phase4', target: 12, target5y: 41 },
    { key: 'ai_generation_success_rate', name: 'AI生成成功率', unit: '%', phase: 'phase4', target: 95, target5y: 99 },
    { key: 'ui_improvements_per_month', name: 'UI改善回数/月', unit: '回', phase: 'phase4', target: 4, target5y: 12 },
    { key: 'sales_meetings_per_month', name: '広告主商談件数/月', unit: '件', phase: 'phase4', target: 10, target5y: 50 },
  ];

  return (
    <section style={{ marginTop: '40px' }}>
      <div className="sec-title-row">
        <h2 style={{ fontSize: '1.5rem', color: 'var(--fleapay-blue)' }}>📈 KPI週次管理</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <button className="btn ghost" onClick={loadKpiData} disabled={loading}>
            {loading ? '読み込み中...' : '🔄 更新'}
          </button>
        </div>
      </div>

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--fleapay-blue)' }}>
          Tier 1: 完全コントロール可能KPI
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>KPI</th>
                <th>Phase 4目標</th>
                <th>5年後目標</th>
                <th>実績値</th>
                <th>達成率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tier1Kpis.filter(kpi => {
                // データベースから自動集計可能なKPIのみ表示
                return ['omikuji_completion_rate', 'ugc_posts_per_day', 'ai_generation_success_rate', 'monthly_qr_payments'].includes(kpi.key);
              }).map((kpi) => {
                const existing = kpiData.find(d => d.metric_key === kpi.key);
                const actual = existing?.actual_value ?? null;
                const achievement = existing?.achievement_rate ?? (actual !== null && kpi.target ? (actual / kpi.target * 100) : null);

                return (
                  <tr key={kpi.key}>
                    <td><strong>{kpi.name}</strong><br/><small style={{ color: '#666' }}>{kpi.unit}</small></td>
                    <td>{kpi.target}{kpi.unit}</td>
                    <td>{kpi.target5y}{kpi.unit}</td>
                    <td>
                      <span style={{ fontWeight: actual !== null ? 700 : 'normal', color: actual !== null ? 'var(--fleapay-blue)' : '#999' }}>
                        {actual !== null ? `${Number(actual).toFixed(2)}${kpi.unit}` : '-'}
                      </span>
                    </td>
                    <td>
                      {achievement ? (
                        <span style={{
                          color: parseFloat(achievement) >= 100 ? '#27ae60' : parseFloat(achievement) >= 80 ? '#f39c12' : '#e74c3c',
                          fontWeight: 700
                        }}>
                          {Number(achievement).toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>📊 自動集計</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// 結果目標管理コンポーネント（自動集計版）
function GoalManagementSection() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [goalData, setGoalData] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGoalData();
  }, [selectedWeek]);

  const loadGoalData = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';
      
      const res = await fetch(`/api/admin/goal-achievements/auto?weekStart=${selectedWeek}&phase=phase4`, {
        headers: { 'x-admin-token': token }
      });
      
      if (res.ok) {
        const result = await res.json();
        setGoalData(result.data || []);
        setMetadata(result.metadata || null);
      }
    } catch (e) {
      console.error('Goal load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const goalMetrics = [
    { phase: 'phase4', type: 'annual_reach', name: '年間リーチ', target: 70000000, unit: '回' },
    { phase: 'phase4', type: 'avg_cpm', name: '平均CPM', target: 125, unit: '円' },
    { phase: 'phase4', type: 'annual_ad_value', name: '年間広告価値', target: 8750000, unit: '円' },
    { phase: 'phase4', type: 'actual_revenue', name: '実質収益', target: 5000000, unit: '円' },
  ];

  return (
    <section style={{ marginTop: '40px' }}>
      <div className="sec-title-row">
        <h2 style={{ fontSize: '1.5rem', color: 'var(--fleapay-blue)' }}>🎯 結果目標週次管理</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <button className="btn ghost" onClick={loadGoalData} disabled={loading}>
            {loading ? '読み込み中...' : '🔄 更新'}
          </button>
        </div>
      </div>

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--fleapay-blue)' }}>
          Phase 4 目標実績
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>指標</th>
                <th>目標値</th>
                <th>実績値</th>
                <th>達成率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {goalMetrics.map((metric) => {
                const existing = goalData.find(d => d.metric_type === metric.type);
                const actual = existing?.actual_value ?? null;
                const achievement = existing?.achievement_rate ?? (actual !== null && metric.target ? (actual / metric.target * 100) : null);

                return (
                  <tr key={`${metric.phase}_${metric.type}`}>
                    <td><strong>{metric.name}</strong></td>
                    <td>{new Intl.NumberFormat('ja-JP').format(metric.target)}{metric.unit}</td>
                    <td>
                      <span style={{ fontWeight: actual !== null ? 700 : 'normal', color: actual !== null ? 'var(--fleapay-blue)' : '#999' }}>
                        {actual !== null ? `${new Intl.NumberFormat('ja-JP').format(Math.round(actual))}${metric.unit}` : '-'}
                      </span>
                    </td>
                    <td>
                      {achievement ? (
                        <span style={{
                          color: parseFloat(achievement.toString()) >= 100 ? '#27ae60' : parseFloat(achievement.toString()) >= 80 ? '#f39c12' : '#e74c3c',
                          fontWeight: 700
                        }}>
                          {parseFloat(achievement.toString()).toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>📊 自動集計</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ベンチマーク管理コンポーネント（自動集計版）
function BenchmarkManagementSection() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [benchmarkData, setBenchmarkData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBenchmarkData();
  }, [selectedWeek]);

  const loadBenchmarkData = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';
      
      const res = await fetch(`/api/admin/benchmark-data?weekStart=${selectedWeek}`, {
        headers: { 'x-admin-token': token }
      });
      
      if (res.ok) {
        const result = await res.json();
        setBenchmarkData(result.data || []);
      }
    } catch (e) {
      console.error('Benchmark load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const benchmarkMetrics = [
    { type: 'cpm_by_content', category: 'general_ugc', name: '一般UGC', current: 80, target: 200, industry: 40 },
    { type: 'cpm_by_content', category: 'micro_influencer', name: 'マイクロインフルエンサー', current: 100, target: 300, industry: 100 },
    { type: 'cpm_by_content', category: 'middle_influencer', name: 'ミドルインフルエンサー', current: 200, target: 450, industry: 200 },
  ];

  return (
    <section style={{ marginTop: '40px' }}>
      <div className="sec-title-row">
        <h2 style={{ fontSize: '1.5rem', color: 'var(--fleapay-blue)' }}>📊 ベンチマーク週次管理</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <button className="btn ghost" onClick={loadBenchmarkData} disabled={loading}>
            {loading ? '読み込み中...' : '🔄 更新'}
          </button>
        </div>
      </div>

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--fleapay-blue)' }}>
          CPMベンチマーク（コンテンツ種別）
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>コンテンツ種別</th>
                <th>業界標準</th>
                <th>EDO ICHIBA現在</th>
                <th>EDO ICHIBA目標</th>
                <th>実績値</th>
                <th>成長率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {benchmarkMetrics.map((metric) => {
                const key = `${metric.type}_${metric.category}`;
                const existing = benchmarkData.find(d => d.benchmark_type === metric.type && d.content_category === metric.category);
                const actual = existing?.actual_value ?? null;
                const growthRate = existing?.growth_rate ?? null;

                return (
                  <tr key={key}>
                    <td><strong>{metric.name}</strong></td>
                    <td>¥{metric.industry}</td>
                    <td>¥{metric.current}</td>
                    <td>¥{metric.target}</td>
                    <td>
                      <span style={{ color: '#999' }}>-</span>
                      <small style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginTop: '4px' }}>
                        （広告データ連携後に自動集計）
                      </small>
                    </td>
                    <td>-</td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>📊 準備中</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

