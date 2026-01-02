// app/admin/frames/page.tsx
// Phase 2.3: Next.js画面移行（AIフレーム管理画面）

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminFramesPage() {
  const [frames, setFrames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', displayName: '', category: '', metadata: '' });

  useEffect(() => {
    loadFrames();
  }, []);

  const loadFrames = async () => {
    try {
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? ((window as any).ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken')
        : 'admin-devtoken';
      
      const res = await fetch('/api/admin/frames', {
        headers: { 'x-admin-token': token }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      setFrames(data.frames || []);
      setError(null);
    } catch (e) {
      console.error('Frames load error:', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFrame = async () => {
    try {
      const token = typeof window !== 'undefined' 
        ? (window as any).ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN') || 'admin-devtoken'
        : 'admin-devtoken';
      
      const metadata = formData.metadata ? JSON.parse(formData.metadata) : null;
      
      const res = await fetch('/api/admin/frames', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({
          ...formData,
          metadata
        })
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      setShowModal(false);
      setFormData({ id: '', displayName: '', category: '', metadata: '' });
      loadFrames();
    } catch (e) {
      alert('フレームの作成に失敗しました: ' + (e as Error).message);
    }
  };

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
        .frames-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .frame-card {
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 12px;
          padding: 16px;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .frame-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .frame-preview {
          width: 100%;
          height: 160px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: var(--fleapay-gray);
          margin-bottom: 12px;
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
          max-height: 80vh;
          overflow-y: auto;
        }
        .modal-content h2 {
          margin: 0 0 16px;
        }
        .modal-content label {
          display: block;
          margin: 12px 0 4px;
          font-weight: 600;
        }
        .modal-content input,
        .modal-content textarea {
          width: 100%;
          margin-bottom: 12px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #ddd;
          font-size: 0.9rem;
        }
        .modal-content textarea {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          min-height: 200px;
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
              <Link href="/admin/sellers" className="nav-item">
                👥 出店者
              </Link>
            </li>
            <li>
              <Link href="/admin/frames" className="nav-item active">
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
              <h1>AIフレーム管理</h1>
              <button className="btn" onClick={() => setShowModal(true)}>
                + 新規フレーム作成
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <select style={{ maxWidth: '150px' }}>
                <option value="">全カテゴリ</option>
                <option value="Japan">Japan</option>
                <option value="Seasonal">Seasonal</option>
                <option value="Event">Event</option>
              </select>
              <button className="btn ghost" onClick={loadFrames}>
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
              <div className="frames-grid">
                {frames.length > 0 ? (
                  frames.map((frame) => (
                    <div key={frame.id} className="frame-card">
                      <div className="frame-preview">
                        {frame.displayName || 'フレームプレビュー'}
                      </div>
                      <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>{frame.displayName}</h3>
                      <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--fleapay-gray)' }}>
                        カテゴリ: {frame.category || '-'}
                      </p>
                      <p style={{ margin: '0', fontSize: '0.85rem', color: 'var(--fleapay-gray)' }}>
                        注文数: {frame.orderCount || 0}
                      </p>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--fleapay-gray)' }}>
                    フレームがありません
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>新規フレーム作成</h2>
            <label>フレームID</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="frame-id"
            />
            <label>表示名</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="表示名"
            />
            <label>カテゴリ</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Japan, Seasonal, Event など"
            />
            <label>メタデータ（JSON）</label>
            <textarea
              value={formData.metadata}
              onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
              placeholder='{"key": "value"}'
            />
            <div className="modal-actions">
              <button className="btn" onClick={handleCreateFrame}>
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

