// app/admin/sellers/page.tsx
// Phase 2.3: Next.js画面移行（出店者管理画面）

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Seller {
  id: string;
  displayName: string | null;
  shopName: string | null;
  stripeAccountId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  orderCount: number;
  lastOrderAt: Date | string | null;
  urls?: {
    onboardingUrl?: string;
    dashboardUrl?: string;
  };
}

declare global {
  interface Window {
    ADMIN_TOKEN?: string;
  }
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', displayName: '', shopName: '', stripeAccountId: '' });

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';
      
      const res = await fetch('/api/admin/sellers', {
        headers: { 'x-admin-token': token }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      setSellers(data.sellers || []);
      setError(null);
    } catch (e) {
      console.error('Sellers load error:', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeller = async () => {
    try {
      const token = typeof window !== 'undefined' 
        ? (window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';
      
      const res = await fetch('/api/admin/sellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      setShowModal(false);
      setFormData({ id: '', displayName: '', shopName: '', stripeAccountId: '' });
      loadSellers();
    } catch (e) {
      alert('出店者の作成に失敗しました: ' + (e as Error).message);
    }
  };

  const filteredSellers = sellers.filter(seller => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      seller.id.toLowerCase().includes(query) ||
      (seller.displayName && seller.displayName.toLowerCase().includes(query)) ||
      (seller.shopName && seller.shopName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="admin-container">
      <style jsx>{`
        :root {
          --fleapay-blue: #1B365D;
          --fleapay-cream: #FBF7F0;
          --fleapay-gray: #666666;
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
        input, select {
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #ddd;
          font-size: 0.9rem;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
          background: var(--fleapay-cream);
          font-weight: 600;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }
        .seller-row {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .seller-row:hover {
          background: rgba(27, 54, 93, 0.02);
        }
        .modal {
          display: ${showModal ? 'flex' : 'none'};
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          justify-content: center;
          align-items: center;
        }
        .modal-content {
          background: #fff;
          padding: 24px;
          border-radius: 14px;
          width: 90%;
          max-width: 600px;
        }
        .modal-content h2 {
          margin: 0 0 16px;
        }
        .modal-content label {
          display: block;
          margin: 12px 0 4px;
          font-weight: 600;
        }
        .modal-content input {
          width: 100%;
          margin-bottom: 12px;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
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
              <Link href="/admin/sellers" className="nav-item active">
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
              <h1>出店者管理</h1>
              <button className="btn" onClick={() => setShowModal(true)}>
                + 新規出店者作成
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="ID・店名・メールで検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ maxWidth: '300px', flex: 1 }}
              />
              <button className="btn ghost" onClick={loadSellers}>
                🔄 更新
              </button>
            </div>
          </section>

          <section>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
            ) : error ? (
              <div style={{ padding: '20px', background: '#fff3f3', borderRadius: '8px', color: '#8B2635' }}>
                <strong>⚠️ データの取得に失敗しました</strong><br />
                <small>{error}</small>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>出店者ID</th>
                      <th>店名</th>
                      <th>表示名</th>
                      <th>注文数</th>
                      <th>最終利用</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSellers.length > 0 ? (
                      filteredSellers.map((seller) => (
                        <tr key={seller.id} className="seller-row">
                          <td>{seller.id}</td>
                          <td>{seller.shopName || '-'}</td>
                          <td>{seller.displayName || '-'}</td>
                          <td>{seller.orderCount || 0}</td>
                          <td>{seller.lastOrderAt ? new Date(seller.lastOrderAt).toLocaleString('ja-JP') : '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--fleapay-gray)' }}>
                          出店者が見つかりませんでした
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>新規出店者作成</h2>
            <label>出店者ID</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="seller-id"
            />
            <label>表示名</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="表示名"
            />
            <label>店名</label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              placeholder="店名（任意）"
            />
            <label>Stripe Account ID</label>
            <input
              type="text"
              value={formData.stripeAccountId}
              onChange={(e) => setFormData({ ...formData, stripeAccountId: e.target.value })}
              placeholder="acct_...（任意）"
            />
            <div className="modal-actions">
              <button className="btn" onClick={handleCreateSeller}>
                作成
              </button>
              <button className="btn ghost" onClick={() => setShowModal(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

