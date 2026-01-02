// app/onboarding/refresh/page.tsx
// Phase 2.3: Next.js画面移行（オンボーディングリフレッシュページ）

export default function OnboardingRefreshPage() {
  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      maxWidth: '560px',
      margin: '40px auto',
      padding: '0 16px'
    }}>
      <h1>登録を再開してください</h1>
      <p>入力が中断されました。管理者画面から「出店者登録を再開」を押してください。</p>
    </div>
  );
}

