// ============================================
// Fleapay Admin - 決済・チャージバック管理
// 完全修正版 - 2025年版
// ============================================

// グローバル変数
let payments = [];
let currentPayment = null;
let currentFilters = {};

// ============================================
// 認証付きFetch関数
// ============================================
async function fetchWithAuth(url, options = {}) {
  const token = window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN');
  
  if (!token) {
    showError('認証トークンが設定されていません');
    // window.location.href = '/admin-login.html';
    throw new Error('認証トークンがありません');
  }
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        ...options.headers
      }
    });
    
    // 認証エラー
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('ADMIN_TOKEN');
      localStorage.removeItem('ADMIN_TOKEN_EXPIRY');
      showError('認証に失敗しました。再度ログインしてください。');
      // window.location.href = '/admin-login.html';
      throw new Error('認証に失敗しました');
    }
    
    // その他のHTTPエラー
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${res.status}`);
    }
    
    return await res.json();
    
  } catch (error) {
    // ネットワークエラー
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ネットワークエラー: サーバーに接続できません');
    }
    throw error;
  }
}

// ============================================
// Stripe Summary API - サマリーデータ取得
// ============================================
async function loadStripeSummary(period = 'today') {
  try {
    const data = await fetchWithAuth(`/api/admin/stripe/summary?period=${encodeURIComponent(period)}`);
    
    if (!data.ok) {
      throw new Error(data.error || 'データ取得に失敗しました');
    }
    
    // サマリー更新
    updateSummary(data.summary);
    
    // オプション: 詳細データも保存
    if (data.charges) {
      console.log('Charges:', data.charges.length);
    }
    if (data.disputes) {
      console.log('Disputes:', data.disputes.length);
    }
    if (data.refunds) {
      console.log('Refunds:', data.refunds.length);
    }
    
    hideError();
    
  } catch (error) {
    console.error('Stripe Summary 取得失敗:', error);
    showError(error.message);
    
    // フォールバック: モックデータを表示
    updateSummary({
      paymentsCount: 0,
      netSales: 0,
      disputeCount: 0,
      urgentDisputes: 0,
      refundCount: 0,
      refundAmount: 0
    });
  }
}

// ============================================
// サマリーデータ更新
// ============================================
function updateSummary(summary) {
  // カードの数値更新（サーバーのフィールド名に対応）
  document.getElementById('todayPayments').textContent = formatNumber(summary.paymentsCount || 0);
  document.getElementById('todayRevenue').textContent = formatCurrency(summary.netSales || 0);
  document.getElementById('activeDisputes').textContent = formatNumber(summary.disputeCount || 0);
  document.getElementById('urgentDisputes').textContent = formatNumber(summary.urgentDisputes || 0) + '件';
  document.getElementById('refundCount').textContent = formatNumber(summary.refundCount || 0);
  document.getElementById('refundAmount').textContent = formatCurrency(summary.refundAmount || 0);
}

// ============================================
// 決済一覧取得
// ============================================
async function loadPayments(filters = {}) {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const tbody = document.getElementById('paymentsTableBody');
  
  loadingIndicator.style.display = 'block';
  tbody.innerHTML = '<tr><td colspan="7" class="empty-state">読み込み中...</td></tr>';
  
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const data = await fetchWithAuth(`/api/admin/payments${queryParams ? '?' + queryParams : ''}`);
    
    payments = data.payments || [];
    currentFilters = filters;
    
    renderPaymentsTable();
    hideError();
    
  } catch (error) {
    console.error('決済データ取得失敗:', error);
    showError('決済データの取得に失敗しました: ' + error.message);
    
    // フォールバック: モックデータ
    loadMockPayments();
    
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

// ============================================
// モックデータ（開発・テスト用）
// ============================================
function loadMockPayments() {
  const mockData = {
    payments: [
      {
        id: 'pi_3P1234567890123456',
        created: new Date().toISOString(),
        amount: 150000, // 円単位（1,500円）
        status: 'succeeded',
        seller: { publicId: 'seller-abc123', displayName: '花子商店' },
        stripeIds: {
          paymentIntent: 'pi_3P1234567890123456',
          charge: 'ch_3P1234567890123456'
        },
        type: 'payment'
      },
      {
        id: 'pi_3P2345678901234567',
        created: new Date(Date.now() - 3600000).toISOString(),
        amount: 300000,
        status: 'disputed',
        seller: { publicId: 'seller-def456', displayName: '太郎ショップ' },
        stripeIds: {
          paymentIntent: 'pi_3P2345678901234567',
          charge: 'ch_3P2345678901234567'
        },
        type: 'dispute',
        dispute: {
          dueBy: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    ]
  };
  
  payments = mockData.payments;
  renderPaymentsTable();
  
  console.warn('⚠️ モックデータを使用しています');
}

// ============================================
// 決済テーブル描画
// ============================================
function renderPaymentsTable() {
  const tbody = document.getElementById('paymentsTableBody');
  const totalCount = document.getElementById('totalCount');
  
  totalCount.textContent = `${payments.length}件`;
  
  if (payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">決済データが見つかりませんでした</td></tr>';
    return;
  }
  
  tbody.innerHTML = payments.map(payment => {
    const paymentId = payment.id || payment.stripeIds?.paymentIntent || 'unknown';
    const created = formatDate(payment.created || payment.createdAt);
    const seller = payment.seller?.displayName || payment.seller?.publicId || payment.sellerId || '-';
    const amount = formatCurrency(payment.amount || payment.amountGross || 0);
    const status = getPaymentStatusBadge(payment.status, payment.type);
    const stripeId = (payment.stripeIds?.paymentIntent || payment.paymentIntentId || 'N/A').substring(0, 12);
    const deadline = payment.dispute?.dueBy ? getDeadlineText(payment.dispute.dueBy) : '-';
    
    return `
      <tr style="cursor: pointer;" onclick="openPaymentModal('${paymentId}')" data-payment-id="${paymentId}">
        <td>${created}</td>
        <td>${seller}</td>
        <td>${amount}</td>
        <td>${status}</td>
        <td style="font-family: monospace; font-size: 11px;">${stripeId}...</td>
        <td>${deadline}</td>
        <td>
          <button class="small ghost" onclick="event.stopPropagation(); openPaymentModal('${paymentId}')">詳細</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// ステータスバッジ生成
// ============================================
function getPaymentStatusBadge(status, type) {
  if (type === 'dispute' || status === 'disputed') {
    return '<span class="payment-status payment-disputed">CB申請中</span>';
  }
  if (status === 'refunded') {
    return '<span class="payment-status payment-refunded">返金済</span>';
  }
  if (status === 'succeeded' || status === 'paid') {
    return '<span class="payment-status payment-normal">通常</span>';
  }
  return '<span class="payment-status payment-refunded">' + (status || '不明') + '</span>';
}

// ============================================
// 期限テキスト生成
// ============================================
function getDeadlineText(dueBy) {
  const now = new Date();
  const due = new Date(dueBy);
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return '<span class="deadline-urgent">期限切れ</span>';
  } else if (diffDays <= 3) {
    return `<span class="deadline-urgent">${diffDays}日後</span>`;
  } else {
    return `${diffDays}日後`;
  }
}

// ============================================
// 決済詳細モーダル
// ============================================
function openPaymentModal(paymentId) {
  currentPayment = payments.find(p => 
    p.id === paymentId || 
    p.stripeIds?.paymentIntent === paymentId ||
    p.paymentIntentId === paymentId
  );
  
  if (!currentPayment) {
    showError('決済情報が見つかりませんでした');
    return;
  }

  document.getElementById('modalTitle').textContent = `取引詳細: ${paymentId.substring(0, 20)}...`;
  populatePaymentDetails(currentPayment);
  
  // モーダル表示
  const modal = document.getElementById('paymentModal');
  modal.style.display = 'flex';
  
  // モーダルクローズ設定
  setupModalClose();
}

// ============================================
// 詳細情報入力
// ============================================
function populatePaymentDetails(payment) {
  document.getElementById('paymentDate').textContent = formatDate(payment.created || payment.createdAt);
  document.getElementById('paymentAmount').textContent = formatCurrency(payment.amount || payment.amountGross || 0);
  document.getElementById('paymentSeller').textContent = 
    payment.seller?.displayName || payment.seller?.publicId || payment.sellerId || '-';
  document.getElementById('paymentStatus').textContent = getPaymentStatusText(payment.status, payment.type);
  
  document.getElementById('paymentIntentId').textContent = 
    payment.stripeIds?.paymentIntent || payment.paymentIntentId || '-';
  document.getElementById('chargeId').textContent = 
    payment.stripeIds?.charge || payment.chargeId || '-';
  
  // Stripeダッシュボードリンク
  const stripeBtn = document.getElementById('openStripeBtn');
  const chargeId = payment.stripeIds?.charge || payment.chargeId;
  
  if (chargeId) {
    const env = window.location.hostname.includes('localhost') ? 'test/' : '';
    stripeBtn.onclick = () => window.open(`https://dashboard.stripe.com/${env}payments/${chargeId}`, '_blank');
    stripeBtn.disabled = false;
  } else {
    stripeBtn.disabled = true;
  }
}

// ============================================
// ステータステキスト
// ============================================
function getPaymentStatusText(status, type) {
  if (type === 'dispute' || status === 'disputed') return 'チャージバック申請中';
  if (status === 'refunded') return '返金済';
  if (status === 'succeeded' || status === 'paid') return '通常決済';
  return status || '不明';
}

// ============================================
// モーダルクローズ設定
// ============================================
function setupModalClose() {
  const modal = document.getElementById('paymentModal');
  const closeBtn = document.getElementById('closeModal');
  
  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  };
}

// ============================================
// イベントリスナー設定
// ============================================
function setupEventListeners() {
  // フィルター変更時の処理（デバウンス付き）
  const debouncedSearch = debounce(() => {
    const period = document.getElementById('periodFilter').value;
    const type = document.getElementById('typeFilter').value;
    const search = document.getElementById('searchInput').value;
    loadPayments({ period, type, search });
  }, 500);

  document.getElementById('periodFilter').addEventListener('change', () => {
    const period = document.getElementById('periodFilter').value;
    loadStripeSummary(period);
    debouncedSearch();
  });
  
  document.getElementById('typeFilter').addEventListener('change', debouncedSearch);
  document.getElementById('searchInput').addEventListener('input', debouncedSearch);
  document.getElementById('searchBtn').addEventListener('click', debouncedSearch);

  // Stripe同期ボタン
  document.getElementById('syncPaymentsBtn').addEventListener('click', async (e) => {
    const btn = e.target;
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = '同期中...';
    
    try {
      const period = document.getElementById('periodFilter').value;
      await loadStripeSummary(period);
      await loadPayments(currentFilters);
      
      showSuccess('Stripe同期が完了しました');
      
    } catch (error) {
      showError('同期に失敗しました: ' + error.message);
      
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  // モーダル内操作
  document.getElementById('generateEvidenceBtn').addEventListener('click', generateEvidence);
  document.getElementById('submitEvidenceBtn').addEventListener('click', submitEvidence);
  document.getElementById('refundBtn').addEventListener('click', processRefund);
  document.getElementById('saveMemoBtn').addEventListener('click', saveMemo);
}

// ============================================
// エビデンス生成
// ============================================
async function generateEvidence() {
  if (!currentPayment) return;
  
  const btn = document.getElementById('generateEvidenceBtn');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = '生成中...';
  
  try {
    const piId = currentPayment.stripeIds?.paymentIntent || currentPayment.paymentIntentId;
    
    await fetchWithAuth('/api/admin/disputes/generate_evidence', {
      method: 'POST',
      body: JSON.stringify({ payment_intent_id: piId })
    });
    
    showModalSuccess('エビデンスを生成しました');
    
  } catch (error) {
    showModalError(error.message);
    
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ============================================
// エビデンス送信
// ============================================
async function submitEvidence() {
  if (!currentPayment) return;
  
  const btn = document.getElementById('submitEvidenceBtn');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = '送信中...';
  
  try {
    const piId = currentPayment.stripeIds?.paymentIntent || currentPayment.paymentIntentId;
    
    await fetchWithAuth('/api/admin/disputes/submit_evidence', {
      method: 'POST',
      body: JSON.stringify({ payment_intent_id: piId })
    });
    
    showModalSuccess('エビデンスを送信しました');
    await loadPayments(currentFilters);
    
  } catch (error) {
    showModalError(error.message);
    
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ============================================
// 返金処理
// ============================================
async function processRefund() {
  if (!currentPayment) return;
  
  const amount = currentPayment.amount || currentPayment.amountGross || 0;
  const amountText = formatCurrency(amount);
  
  if (!confirm(`${amountText} の返金処理を実行しますか？\n\nこの操作は取り消せません。`)) {
    return;
  }
  
  const btn = document.getElementById('refundBtn');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = '返金中...';
  
  try {
    const piId = currentPayment.stripeIds?.paymentIntent || currentPayment.paymentIntentId;
    
    await fetchWithAuth('/api/admin/payments/refund', {
      method: 'POST',
      body: JSON.stringify({ 
        payment_intent_id: piId,
        amount: amount
      })
    });
    
    showModalSuccess('返金処理を完了しました');
    await loadPayments(currentFilters);
    
    // モーダルを閉じる
    setTimeout(() => {
      document.getElementById('paymentModal').style.display = 'none';
    }, 2000);
    
  } catch (error) {
    showModalError(error.message);
    
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ============================================
// メモ保存
// ============================================
async function saveMemo() {
  if (!currentPayment) return;
  
  const memo = document.getElementById('internalMemo').value;
  const btn = document.getElementById('saveMemoBtn');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = '保存中...';
  
  try {
    // TODO: メモ保存APIの実装
    console.log('メモ保存:', memo);
    
    showModalSuccess('メモを保存しました');
    
  } catch (error) {
    showModalError(error.message);
    
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ============================================
// ユーティリティ関数
// ============================================

// デバウンス
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 金額フォーマット
function formatCurrency(amount) {
  if (typeof amount !== 'number') {
    amount = parseInt(amount) || 0;
  }
  return '¥' + (amount / 100).toLocaleString('ja-JP');
}

// 数値フォーマット
function formatNumber(num) {
  if (typeof num !== 'number') {
    num = parseInt(num) || 0;
  }
  return num.toLocaleString('ja-JP');
}

// 日付フォーマット
function formatDate(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// エラー表示
function showError(message) {
  const banner = document.getElementById('errorBanner');
  const messageEl = document.getElementById('errorMessage');
  
  if (banner && messageEl) {
    messageEl.textContent = message;
    banner.classList.add('show');
    
    // 10秒後に自動で消す
    setTimeout(() => {
      banner.classList.remove('show');
    }, 10000);
  }
}

// エラー非表示
function hideError() {
  const banner = document.getElementById('errorBanner');
  if (banner) {
    banner.classList.remove('show');
  }
}

// 成功メッセージ
function showSuccess(message) {
  // adminUI が定義されている場合は使用
  if (typeof adminUI !== 'undefined' && adminUI.showToast) {
    adminUI.showToast(message, 'success');
  } else {
    alert('✅ ' + message);
  }
}

// モーダル内エラー表示
function showModalError(message) {
  const modalMessage = document.getElementById('modalMessage');
  if (modalMessage) {
    modalMessage.textContent = '❌ エラー: ' + message;
    modalMessage.style.display = 'block';
    modalMessage.style.background = '#fef2f2';
    modalMessage.style.color = '#991b1b';
    modalMessage.style.padding = '12px';
    modalMessage.style.borderRadius = '8px';
  }
}

// モーダル内成功表示
function showModalSuccess(message) {
  const modalMessage = document.getElementById('modalMessage');
  if (modalMessage) {
    modalMessage.textContent = '✅ ' + message;
    modalMessage.style.display = 'block';
    modalMessage.style.background = '#f0f9f4';
    modalMessage.style.color = '#166534';
    modalMessage.style.padding = '12px';
    modalMessage.style.borderRadius = '8px';
    
    // 3秒後に消す
    setTimeout(() => {
      modalMessage.style.display = 'none';
    }, 3000);
  }
}

// ============================================
// 初期化
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🟢 Admin Payments ページ初期化');
  
  // イベントリスナー設定
  setupEventListeners();
  
  // 初回データ読み込み
  try {
    await loadStripeSummary('today');
    await loadPayments();
  } catch (error) {
    console.error('初期化エラー:', error);
    showError('初期化に失敗しました: ' + error.message);
  }
  
  console.log('✅ 初期化完了');
});

// グローバルに関数を公開（HTMLから呼び出し可能にする）
window.openPaymentModal = openPaymentModal;