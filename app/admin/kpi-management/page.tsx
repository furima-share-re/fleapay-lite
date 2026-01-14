// app/admin/kpi-management/page.tsx
// AI時代のKPI管理画面

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface KpiMetric {
  metric_key: string;
  metric_category: string;
  week_start_date: string;
  target_value: number;
  actual_value: number;
  unit: string;
  phase: string;
  achievement_rate: number;
}

interface GoalAchievement {
  phase: string;
  metric_type: string;
  week_start_date: string;
  target_value: number;
  actual_value: number;
  achievement_rate: number;
  unit: string;
}

interface KpiMetadata {
  weekStart: string;
  weekEnd: string;
  omikuji: {
    totalOrders: number;
    qrSessions: number;
    completionRate: number;
  };
  ugc: {
    totalUgc: number;
    ugcPerDay: number;
  };
  ai: {
    totalOrders: number;
    aiOrders: number;
    successRate: number;
  };
  qr: {
    weeklyCount: number;
    monthlyEstimate: number;
  };
}

interface GoalMetadata {
  weekStart: string;
  weekEnd: string;
  weekly: {
    gross: number;
    net: number;
    fee: number;
    orderCount: number;
    qrSessions: number;
  };
  annualized: {
    reach: number;
    adValue: number;
    revenue: number;
    estimatedCpm: number;
  };
}

declare global {
  interface Window {
    ADMIN_TOKEN?: string;
  }
}

export default function KpiManagementPage() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  
  const [kpiData, setKpiData] = useState<KpiMetric[]>([]);
  const [goalData, setGoalData] = useState<GoalAchievement[]>([]);
  const [kpiMetadata, setKpiMetadata] = useState<KpiMetadata | null>(null);
  const [goalMetadata, setGoalMetadata] = useState<GoalMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'kpi' | 'goals' | 'overview'>('overview');

  useEffect(() => {
    loadAllData();
  }, [selectedWeek]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';

      // KPIデータを取得
      const kpiRes = await fetch(`/api/admin/kpi-metrics/auto?weekStart=${selectedWeek}`, {
        headers: { 'x-admin-token': token }
      });
      if (kpiRes.ok) {
        const kpiResult = await kpiRes.json();
        setKpiData(kpiResult.data || []);
        setKpiMetadata(kpiResult.metadata || null);
      }

      // 結果目標データを取得
      const goalRes = await fetch(`/api/admin/goal-achievements/auto?weekStart=${selectedWeek}&phase=phase4`, {
        headers: { 'x-admin-token': token }
      });
      if (goalRes.ok) {
        const goalResult = await goalRes.json();
        setGoalData(goalResult.data || []);
        setGoalMetadata(goalResult.metadata || null);
      }
    } catch (e) {
      console.error('Data load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  const getAchievementColor = (rate: number) => {
    if (rate >= 100) return '#27ae60';
    if (rate >= 80) return '#f39c12';
    return '#e74c3c';
  };

  const getAchievementIcon = (rate: number) => {
    if (rate >= 100) return '✅';
    if (rate >= 80) return '⚠️';
    return '❌';
  };

  // 週の範囲を表示
  const weekEnd = new Date(selectedWeek);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRange = `${selectedWeek} 〜 ${weekEnd.toISOString().split('T')[0]}`;

  return (
    <div className="admin-container">
      <style jsx>{`
        :root {
          --fleapay-blue: #1B365D;
          --fleapay-cream: #FBF7F0;
          --fleapay-gold: #B8902E;
          --fleapay-gray: #666666;
          --success-green: #27ae60;
          --warning-orange: #f39c12;
          --danger-red: #e74c3c;
        }
        .kpi-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        .kpi-header {
          background: linear-gradient(135deg, var(--fleapay-blue) 0%, #2d4a7c 100%);
          color: #fff;
          padding: 40px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .kpi-header h1 {
          margin: 0 0 10px;
          font-size: 2rem;
          font-weight: 700;
        }
        .kpi-header .subtitle {
          opacity: 0.9;
          font-size: 1.1rem;
        }
        .kpi-content {
          padding: 30px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .week-selector {
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .tab-container {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
        }
        .tab {
          padding: 12px 24px;
          border-radius: 8px;
          background: #fff;
          border: 2px solid transparent;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .tab.active {
          background: var(--fleapay-blue);
          color: #fff;
          border-color: var(--fleapay-blue);
        }
        .tab:hover:not(.active) {
          background: #f5f5f5;
        }
        .metric-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        .metric-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .metric-card-title {
          font-size: 1rem;
          color: var(--fleapay-gray);
          font-weight: 500;
        }
        .metric-card-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--fleapay-blue);
          margin: 12px 0;
        }
        .metric-card-target {
          font-size: 0.9rem;
          color: var(--fleapay-gray);
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 12px;
        }
        .progress-fill {
          height: 100%;
          transition: width 0.3s;
          border-radius: 4px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 30px;
        }
        .overview-section {
          background: #fff;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        .overview-section h2 {
          margin: 0 0 20px;
          font-size: 1.5rem;
          color: var(--fleapay-blue);
        }
        .stat-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .stat-item {
          text-align: center;
          padding: 16px;
          background: var(--fleapay-cream);
          border-radius: 12px;
        }
        .stat-item-label {
          font-size: 0.9rem;
          color: var(--fleapay-gray);
          margin-bottom: 8px;
        }
        .stat-item-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--fleapay-blue);
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
              <Link href="/admin/kpi-management" className="nav-item active">
                📈 KPI管理
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

        <main className="admin-content" style={{ background: 'transparent', padding: 0 }}>
          <div className="kpi-container">
            <div className="kpi-header">
              <h1>📈 KPI管理ダッシュボード</h1>
              <div className="subtitle">データドリブンな意思決定のためのAI時代の管理画面</div>
            </div>

            <div className="kpi-content">
              {/* 週選択 */}
              <div className="week-selector">
                <label style={{ fontWeight: 600, color: 'var(--fleapay-blue)' }}>対象週:</label>
                <input
                  type="date"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  style={{ 
                    padding: '10px', 
                    borderRadius: '8px', 
                    border: '2px solid #ddd',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                />
                <span style={{ color: 'var(--fleapay-gray)' }}>{weekRange}</span>
                <button
                  onClick={loadAllData}
                  disabled={loading}
                  style={{
                    marginLeft: 'auto',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'var(--fleapay-blue)',
                    color: '#fff',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? '読み込み中...' : '🔄 更新'}
                </button>
              </div>

              {/* タブ */}
              <div className="tab-container">
                <div 
                  className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  📊 概要
                </div>
                <div 
                  className={`tab ${activeTab === 'kpi' ? 'active' : ''}`}
                  onClick={() => setActiveTab('kpi')}
                >
                  🎯 KPI指標
                </div>
                <div 
                  className={`tab ${activeTab === 'goals' ? 'active' : ''}`}
                  onClick={() => setActiveTab('goals')}
                >
                  🚀 結果目標
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', fontSize: '1.2rem', color: 'var(--fleapay-gray)' }}>
                  ⏳ データを読み込み中...
                </div>
              ) : (
                <>
                  {/* 概要タブ */}
                  {activeTab === 'overview' && (
                    <>
                      <div className="overview-section">
                        <h2>📊 週次サマリー</h2>
                        {kpiMetadata && (
                          <div className="stat-row">
                            <div className="stat-item">
                              <div className="stat-item-label">おみくじ完了率</div>
                              <div className="stat-item-value">{kpiMetadata.omikuji.completionRate.toFixed(1)}%</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">UGC投稿数/日</div>
                              <div className="stat-item-value">{kpiMetadata.ugc.ugcPerDay.toFixed(1)}本</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">AI生成成功率</div>
                              <div className="stat-item-value">{kpiMetadata.ai.successRate.toFixed(1)}%</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">週次QR決済数</div>
                              <div className="stat-item-value">{formatNumber(kpiMetadata.qr.weeklyCount)}回</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {goalMetadata && (
                        <div className="overview-section">
                          <h2>💰 収益サマリー</h2>
                          <div className="stat-row">
                            <div className="stat-item">
                              <div className="stat-item-label">週次売上</div>
                              <div className="stat-item-value">{formatCurrency(goalMetadata.weekly.gross)}</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">週次純売上</div>
                              <div className="stat-item-value">{formatCurrency(goalMetadata.weekly.net)}</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">年間換算リーチ</div>
                              <div className="stat-item-value">{formatNumber(goalMetadata.annualized.reach)}回</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">年間換算収益</div>
                              <div className="stat-item-value">{formatCurrency(goalMetadata.annualized.revenue)}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* KPIカードグリッド */}
                      <div className="grid">
                        {kpiData.map((kpi) => (
                          <div key={kpi.metric_key} className="metric-card">
                            <div className="metric-card-header">
                              <div className="metric-card-title">
                                {kpi.metric_key === 'omikuji_completion_rate' && 'おみくじ完了率'}
                                {kpi.metric_key === 'ugc_posts_per_day' && '公式UGC投稿数/日'}
                                {kpi.metric_key === 'ai_generation_success_rate' && 'AI生成成功率'}
                                {kpi.metric_key === 'monthly_qr_payments' && '月間QR決済数'}
                              </div>
                              <span style={{ 
                                fontSize: '1.5rem',
                                color: getAchievementColor(kpi.achievement_rate)
                              }}>
                                {getAchievementIcon(kpi.achievement_rate)}
                              </span>
                            </div>
                            <div className="metric-card-value">
                              {kpi.actual_value.toFixed(2)}{kpi.unit}
                            </div>
                            <div className="metric-card-target">
                              目標: {kpi.target_value}{kpi.unit}
                            </div>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{
                                  width: `${Math.min(kpi.achievement_rate, 100)}%`,
                                  background: getAchievementColor(kpi.achievement_rate)
                                }}
                              />
                            </div>
                            <div style={{ 
                              marginTop: '12px', 
                              fontSize: '0.9rem',
                              color: getAchievementColor(kpi.achievement_rate),
                              fontWeight: 600
                            }}>
                              達成率: {kpi.achievement_rate.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* KPI指標タブ */}
                  {activeTab === 'kpi' && (
                    <div className="overview-section">
                      <h2>🎯 Tier 1: 完全コントロール可能KPI</h2>
                      <div className="grid">
                        {kpiData.map((kpi) => (
                          <div key={kpi.metric_key} className="metric-card">
                            <div className="metric-card-header">
                              <div className="metric-card-title">
                                {kpi.metric_key === 'omikuji_completion_rate' && 'おみくじ完了率'}
                                {kpi.metric_key === 'ugc_posts_per_day' && '公式UGC投稿数/日'}
                                {kpi.metric_key === 'ai_generation_success_rate' && 'AI生成成功率'}
                                {kpi.metric_key === 'monthly_qr_payments' && '月間QR決済数'}
                              </div>
                              <span style={{ 
                                fontSize: '1.5rem',
                                color: getAchievementColor(kpi.achievement_rate)
                              }}>
                                {getAchievementIcon(kpi.achievement_rate)}
                              </span>
                            </div>
                            <div className="metric-card-value">
                              {kpi.actual_value.toFixed(2)}{kpi.unit}
                            </div>
                            <div className="metric-card-target">
                              目標: {kpi.target_value}{kpi.unit} | Phase 4目標
                            </div>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{
                                  width: `${Math.min(kpi.achievement_rate, 100)}%`,
                                  background: getAchievementColor(kpi.achievement_rate)
                                }}
                              />
                            </div>
                            <div style={{ 
                              marginTop: '12px', 
                              fontSize: '0.9rem',
                              color: getAchievementColor(kpi.achievement_rate),
                              fontWeight: 600
                            }}>
                              達成率: {kpi.achievement_rate.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 結果目標タブ */}
                  {activeTab === 'goals' && (
                    <div className="overview-section">
                      <h2>🚀 Phase 4 結果目標</h2>
                      <div className="grid">
                        {goalData.map((goal) => (
                          <div key={goal.metric_type} className="metric-card">
                            <div className="metric-card-header">
                              <div className="metric-card-title">
                                {goal.metric_type === 'annual_reach' && '年間リーチ'}
                                {goal.metric_type === 'avg_cpm' && '平均CPM'}
                                {goal.metric_type === 'annual_ad_value' && '年間広告価値'}
                                {goal.metric_type === 'actual_revenue' && '実質収益'}
                              </div>
                              <span style={{ 
                                fontSize: '1.5rem',
                                color: getAchievementColor(goal.achievement_rate)
                              }}>
                                {getAchievementIcon(goal.achievement_rate)}
                              </span>
                            </div>
                            <div className="metric-card-value">
                              {goal.metric_type === 'annual_reach' && formatNumber(Math.round(goal.actual_value))}
                              {goal.metric_type === 'avg_cpm' && `¥${Math.round(goal.actual_value)}`}
                              {(goal.metric_type === 'annual_ad_value' || goal.metric_type === 'actual_revenue') && formatCurrency(goal.actual_value)}
                            </div>
                            <div className="metric-card-target">
                              目標: {goal.metric_type === 'annual_reach' ? formatNumber(goal.target_value) : 
                                    goal.metric_type === 'avg_cpm' ? `¥${goal.target_value}` : 
                                    formatCurrency(goal.target_value)}
                            </div>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{
                                  width: `${Math.min(goal.achievement_rate, 100)}%`,
                                  background: getAchievementColor(goal.achievement_rate)
                                }}
                              />
                            </div>
                            <div style={{ 
                              marginTop: '12px', 
                              fontSize: '0.9rem',
                              color: getAchievementColor(goal.achievement_rate),
                              fontWeight: 600
                            }}>
                              達成率: {goal.achievement_rate.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
