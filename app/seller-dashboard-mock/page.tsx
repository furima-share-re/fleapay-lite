'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SellerDashboardMockContent() {
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
        title="出店者ダッシュボード（モック）"
        src={`/seller-dashboard-mock.html${query}`}
        style={{
          border: 'none',
          width: '100%',
          minHeight: '100vh',
        }}
      />
    </div>
  );
}

export default function SellerDashboardMockPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
      <SellerDashboardMockContent />
    </Suspense>
  );
}
