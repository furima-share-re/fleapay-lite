// app/seller-register/page.tsx
// Phase 2.3: Next.js画面移行（セラー登録画面）

'use client';

import { useState, FormEvent } from 'react';

export default function SellerRegisterPage() {
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  function slugify(str: string): string {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/[ぁ-ん]/g, '')    // ざっくりひらがな削除
      .replace(/[^\w\-]+/g, '-')  // 英数と - _ 以外を -
      .replace(/\-+/g, '-')
      .replace(/^\-+|\-+$/g, '');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!shopName || !email || !password || !passwordConfirm) {
      setMessage({ text: '必須項目を入力してください。', ok: false });
      return;
    }
    if (password.length < 8) {
      setMessage({ text: 'パスワードは8文字以上にしてください。', ok: false });
      return;
    }
    if (password !== passwordConfirm) {
      setMessage({ text: 'パスワードが一致しません。', ok: false });
      return;
    }
    if (!agree) {
      setMessage({ text: '利用規約への同意が必要です。', ok: false });
      return;
    }

    // publicId を shopName から自動生成
    let publicId = slugify(shopName);
    if (!publicId) {
      publicId = 'shop-' + Date.now();
    }

    setLoading(true);

    try {
      const res = await fetch('/api/seller/start_onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId,
          displayName: shopName,
          email,
          password
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.url) {
        console.error('start_onboarding error:', data);
        setMessage({ 
          text: '登録に失敗しました。\n時間をおいてもう一度お試しください。', 
          ok: false 
        });
        setLoading(false);
        return;
      }

      // Stripe のオンボーディング画面へリダイレクト
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setMessage({ 
        text: '通信エラーが発生しました。\nネットワーク環境を確認してください。', 
        ok: false 
      });
      setLoading(false);
    }
  }

  return (
    <div style={{
      margin: 0,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif',
      background: '#f7f7fb',
      color: '#222',
      WebkitFontSmoothing: 'antialiased',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '24px 16px 40px'
      }}>
        <h1 style={{
          fontSize: '1.4rem',
          margin: '0 0 8px'
        }}>出店者登録</h1>
        <p style={{
          fontSize: '.85rem',
          color: '#666',
          marginBottom: '16px',
          lineHeight: 1.6
        }}>
          Fleapay を使ってキャッシュレス決済を行うための出店者アカウントを作成します。<br />
          このあと表示される Stripe の画面で、本人情報や振込先口座を登録してください。
        </p>

        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '18px 16px 20px',
          boxShadow: '0 4px 16px rgba(0,0,0,.04)',
          border: '1px solid #e3e3ef'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{
                fontSize: '.8rem',
                fontWeight: 600,
                display: 'block',
                marginBottom: '4px'
              }}>
                お店の名前 <span style={{ color: '#e11d48', fontSize: '.7rem', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="例：テストフリマのお店"
                required
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  fontSize: '.9rem',
                  borderRadius: '10px',
                  border: '1px solid #d4d4e6',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{
                fontSize: '.75rem',
                color: '#777',
                marginTop: '3px'
              }}>
                決済画面やダッシュボードに表示される名前です。
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{
                fontSize: '.8rem',
                fontWeight: 600,
                display: 'block',
                marginBottom: '4px'
              }}>
                メールアドレス <span style={{ color: '#e11d48', fontSize: '.7rem', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  fontSize: '.9rem',
                  borderRadius: '10px',
                  border: '1px solid #d4d4e6',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{
                fontSize: '.75rem',
                color: '#777',
                marginTop: '3px'
              }}>
                お知らせやログイン用に利用します。
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{
                fontSize: '.8rem',
                fontWeight: 600,
                display: 'block',
                marginBottom: '4px'
              }}>
                パスワード <span style={{ color: '#e11d48', fontSize: '.7rem', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  fontSize: '.9rem',
                  borderRadius: '10px',
                  border: '1px solid #d4d4e6',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{
                fontSize: '.75rem',
                color: '#777',
                marginTop: '3px'
              }}>
                8文字以上。英数字の組み合わせをおすすめします。
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{
                fontSize: '.8rem',
                fontWeight: 600,
                display: 'block',
                marginBottom: '4px'
              }}>
                パスワード（確認） <span style={{ color: '#e11d48', fontSize: '.7rem', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                minLength={8}
                required
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  fontSize: '.9rem',
                  borderRadius: '10px',
                  border: '1px solid #d4d4e6',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '.8rem',
              margin: '4px 0 10px'
            }}>
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                required
                style={{ marginTop: '2px' }}
              />
              <label>
                <a href="/terms.html" target="_blank" rel="noopener">利用規約</a> に同意します。
              </label>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '.95rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: loading ? '#ccc' : '#5a6bff',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Stripe 画面へ移動中…' : 'Stripe で出店者登録をはじめる'}
              </button>
            </div>

            {message && (
              <div style={{
                marginTop: '10px',
                fontSize: '.8rem',
                padding: '8px 10px',
                borderRadius: '10px',
                whiteSpace: 'pre-wrap',
                background: message.ok ? '#ecfdf5' : '#fef2f2',
                color: message.ok ? '#166534' : '#b91c1c',
                border: `1px solid ${message.ok ? '#bbf7d0' : '#fecaca'}`
              }}>
                {message.text}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

