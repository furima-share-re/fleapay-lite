// app/admin/fee-checks/page.tsx
// 管理者向け: 取引・手数料・手数料チェック結果画面

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

declare global {
  interface Window {
    ADMIN_TOKEN?: string;
  }
}

type CheckStatus = 'ok' | 'mismatch' | 'missing_fee_rate' | 'missing_application_fee';

interface FeeCheckRow {
  id: string;
  orderId: string | null;
  orderNo: number | null;
  sellerId: string;
  sellerName: string | null;
  createdAt: string;
  paymentIntentId: string;
  status: string;
  amountGross: number;
  amountFee: number | null;
  amountNet: number | null;
  feeRate: number | null;
  feeRateSource: string | null;
  expectedApplicationFee: number | null;
  actualApplicationFee: number | null;
  feeDelta: number | null;
  checkStatus: CheckStatus;
}

interface FeeCheckSummary {
  total: number;
  mismatch: number;
  missingFeeRate: number;
  missingApplicationFee: number;
}

export default function AdminFeeChecksPage() {
  const [rows, setRows] = useState<FeeCheckRow[]>([]);
  const [summary, setSummary] = useState<FeeCheckSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [limit, setLimit] = useState(50);
  const [query, setQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';

      const params = new URLSearchParams();
      params.set('status', statusFilter);
      params.set('limit', String(limit));
      if (query.trim()) {
        params.set('q', query.trim());
      }

      const res = await fetch(`/api/admin/fee-checks?${params.toString()}`, {
        headers: { 'x-admin-token': token },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok) {
        setRows(data.rows || []);
        setSummary(data.summary || null);
        setError(null);
      } else {
        throw new Error(data.error || 'データ取得に失敗しました');
      }
    } catch (e) {
      console.error('Fee checks load error:', e);
      setError((e as Error).message);
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, limit, query]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number | null | undefined) => {
    const safe = typeof amount === 'number' ? amount : 0;
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(safe);
  };

  const formatNumber = (value: number | null | undefined, fractionDigits = 2) => {
    if (typeof value !== 'number') return '-';
    return new Intl.NumberFormat('ja-JP', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  };

  const statusLabel = useMemo(() => ({
    ok: 'OK',
    mismatch: '不一致',
    missing_fee_rate: '手数料率なし',
    missing_application_fee: 'Stripe手数料なし',
  }), []);

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
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.08);
        }
        .card-title {
          margin: 0;
          font-size: 0.95rem;
          color: var(--fleapay-gray);
        }
        .card-metric {
          font-size: 28px;
          font-weight: 700;
          margin-top: 8px;
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
        .toolbar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        input, select {
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #ddd;
          font-size: 0.9rem;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
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
          vertical-align: top;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-ok {
          background: rgba(45, 91, 63, 0.12);
          color: var(--success-green);
        }
        .status-mismatch {
          background: rgba(139, 38, 53, 0.12);
          color: var(--error-maroon);
        }
        .status-missing {
          background: rgba(184, 134, 11, 0.12);
          color: var(--warning-amber);
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
          font-size: 0.8rem;
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
              <Link href="/admin/fee-checks" className="nav-item active">
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
          {error && (
            <div className="error-banner">
              <strong>⚠️ エラー:</strong> <span>{error}</span>
            </div>
          )}

          <section>
            <div className="sec-title-row">
              <h1>取引・手数料チェック</h1>
              <button className="btn ghost" onClick={loadData}>
                🔄 再読み込み
              </button>
            </div>

            <div className="toolbar" style={{ marginBottom: '16px' }}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">すべて</option>
                <option value="ok">OKのみ</option>
                <option value="mismatch">不一致のみ</option>
                <option value="missing_fee_rate">手数料率なし</option>
                <option value="missing_application_fee">Stripe手数料なし</option>
              </select>
              <select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value="25">25件</option>
                <option value="50">50件</option>
                <option value="100">100件</option>
                <option value="200">200件</option>
              </select>
              <input
                type="text"
                placeholder="注文ID・決済ID・出店者IDで検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ minWidth: '240px', flex: 1 }}
              />
              <button className="btn ghost" onClick={loadData}>🔍 検索</button>
            </div>

            {summary && (
              <div className="grid">
                <div className="card">
                  <div className="card-title">対象件数</div>
                  <div className="card-metric">{summary.total}</div>
                </div>
                <div className="card">
                  <div className="card-title">不一致</div>
                  <div className="card-metric" style={{ color: 'var(--error-maroon)' }}>{summary.mismatch}</div>
                </div>
                <div className="card">
                  <div className="card-title">手数料率なし</div>
                  <div className="card-metric" style={{ color: 'var(--warning-amber)' }}>{summary.missingFeeRate}</div>
                </div>
                <div className="card">
                  <div className="card-title">Stripe手数料なし</div>
                  <div className="card-metric" style={{ color: 'var(--warning-amber)' }}>{summary.missingApplicationFee}</div>
                </div>
              </div>
            )}
          </section>

          <section>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
            ) : rows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>データがありません</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>チェック結果</th>
                      <th>取引</th>
                      <th>出店者</th>
                      <th>決済ID</th>
                      <th>売上</th>
                      <th>手数料率</th>
                      <th>期待手数料</th>
                      <th>実手数料</th>
                      <th>差額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const statusClass =
                        row.checkStatus === 'ok'
                          ? 'status-ok'
                          : row.checkStatus === 'mismatch'
                            ? 'status-mismatch'
                            : 'status-missing';
                      return (
                        <tr key={row.id}>
                          <td>
                            <span className={`status-pill ${statusClass}`}>
                              {statusLabel[row.checkStatus]}
                            </span>
                          </td>
                          <td>
                            <div>
                              {row.orderNo ? `#${row.orderNo}` : '-'}
                            </div>
                            <div className="mono">{row.orderId || '-'}</div>
                            <div style={{ color: 'var(--fleapay-gray)', fontSize: '0.8rem' }}>
                              {new Date(row.createdAt).toLocaleString('ja-JP')}
                            </div>
                          </td>
                          <td>
                            <div>{row.sellerName || '（未登録）'}</div>
                            <div className="mono">{row.sellerId}</div>
                          </td>
                          <td>
                            <div className="mono">{row.paymentIntentId}</div>
                            <div style={{ color: 'var(--fleapay-gray)', fontSize: '0.8rem' }}>
                              {row.status}
                            </div>
                          </td>
                          <td>
                            <div>{formatCurrency(row.amountGross)}</div>
                            <div style={{ color: 'var(--fleapay-gray)', fontSize: '0.8rem' }}>
                              Stripe手数料: {formatCurrency(row.amountFee)}
                            </div>
                          </td>
                          <td>
                            <div>
                              {row.feeRate === null ? '-' : `${formatNumber(row.feeRate * 100)}%`}
                            </div>
                            <div style={{ color: 'var(--fleapay-gray)', fontSize: '0.8rem' }}>
                              {row.feeRateSource || '-'}
                            </div>
                          </td>
                          <td>{row.expectedApplicationFee === null ? '-' : formatCurrency(row.expectedApplicationFee)}</td>
                          <td>{row.actualApplicationFee === null ? '-' : formatCurrency(row.actualApplicationFee)}</td>
                          <td>
                            {row.feeDelta === null
                              ? '-'
                              : (
                                <span style={{ color: row.feeDelta === 0 ? 'inherit' : 'var(--error-maroon)' }}>
                                  {formatCurrency(row.feeDelta)}
                                </span>
                              )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
