'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SellerDashboardContent() {
  const searchParams = useSearchParams();
  const sellerId = searchParams.get('s');
  const query = sellerId ? `?s=${encodeURIComponent(sellerId)}` : '';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fbf7f0',
        margin: 0,
        padding: 0,
      }}
    >
      <iframe
        title="出店者ダッシュボード"
        src={`/seller-dashboard.html${query}`}
        style={{
          border: 'none',
          width: '100%',
          minHeight: '100vh',
        }}
      />
    </div>
  );
}

export default function SellerDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
      <SellerDashboardContent />
    </Suspense>
  );
}
