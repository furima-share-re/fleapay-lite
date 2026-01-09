// app/page.tsx
// Phase 2.3: Next.js画面移行（トップページ）

import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      maxWidth: '560px',
      margin: '40px auto',
      padding: '0 16px'
    }}>
      <h1>Fleapay</h1>
      <p>フリマアプリMVP with Stripe and OpenAI</p>
      <p>Phase 2: Next.js移行中</p>
      
      <div style={{ marginTop: '40px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '16px' }}>モックページ</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '12px' }}>
            <Link href="/edo-ichiba" style={{ 
              display: 'inline-block',
              padding: '12px 24px',
              background: '#c73e3a',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}>
              🏮 EDO ICHIBA デザイン仕様書（江戸強化版）
            </Link>
          </li>
          <li style={{ marginBottom: '12px' }}>
            <Link href="/omikuji-enhanced/phase1" style={{ 
              display: 'inline-block',
              padding: '12px 24px',
              background: '#2c4f6f',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}>
              🎴 おみくじ Enhanced Phase 1
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
