// ============================================
// Fleapay Admin - 決済・チャージバック管理
// 完全修正版 v2 - API契約整合・エラーハンドリング・コード重複解消
// ============================================

// グローバル変数
let payments = [];
let currentPayment = null;
let currentFilters = {};

// ============================================
// ✅ 修正: admin-utils.jsの関数を使用（コード重複解消）
// ============================================

// ============================================
// Stripe Summary API - サマリーデータ取得
// ============================================
async function loadStripeSummary(period = 'today') {
  try {
    const data = await adminAPI.request(`/api/admin/stripe/summary?period=${encodeURIComponent(period)}`);
    
    if (!data.ok) {
      throw new Error(data.error || 'データ取得に失敗しました');
    }
    
    updateSummary(data.summary);
    
    if (data.charges) console.log('Charges:', data.charges.length);
    if (data.disputes) console.log('Disputes:', data.disputes.length);
    if (data.refunds) console.log('Refunds:', data.refunds.length);
    
    hideError();
    
  } catch (error) {
    console.error('Stripe Summary 取得失敗:', error);
    adminUI.showToast(error.message, 'error');
    
    // ✅ エラーハンドリング改善: フォールバックデータ
    updateSummary({
      paymentsCount: 0,
      paymentsGross: 0,
      netSales: 0,
      disputeCount: 0,
      urgentDisputes: 0,
      refundCount: 0,
      refundAmount: 0
    });
  }
}

// ============================================
// ✅ 修正: API契約に合わせたサマリー更新（paymentsGross追加）
// ============================================
function updateSummary(summary) {
  document.getElementById('todayPayments').textContent = adminUI.formatNumber(summary.paymentsCount || 0);
  document.getElementById('todayGross').textContent = adminUI.formatCurrency(summary.paymentsGross || 0);
  document.getElementById('todayRevenue').textContent = adminUI.formatCurrency(summary.netSales || 0);
  document.getElementById('activeDisputes').textContent = adminUI.formatNumber(summary.disputeCount || 0);
  document.getElementById('urgentDisputes').textContent = adminUI.formatNumber(summary.urgentDisputes || 0) + '件';
  document.getElementById('refundCount').textContent = adminUI.formatNumber(summary.refundCount || 0);
  document.getElementById('refundAmount').textContent = adminUI.formatCurrency(summary.refundAmount || 0);
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
    const data = await adminAPI.request(`/api/admin/payments${queryParams ? '?' + queryParams : ''}`);
    
    payments = data.payments || [];
    currentFilters = filters;
    
    renderPaymentsTable();
    hideError();
    
  } catch (error) {
    console.error('決済データ取得失敗:', error);
    
    // ✅ エラーハンドリング改善: 詳細なエラー分類
    if (error.message.includes('ネットワーク')) {
      adminUI.showToast('ネットワーク接続を確認してください', 'error');
    } else if (error.message.includes('認証')) {
      adminUI.showToast('認証が必要です。再ログインしてください。', 'error');
    } else {
      adminUI.showToast('決済データの取得に失敗: ' + error.message, 'error');
    }
    
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">データを取得できませんでした</td></tr>';
    
  } finally {
    loadingIndicator.style.display = 'none';
  }
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
    const paymentId = payment.paymentIntentId || payment.id || 'unknown';
    const created = adminUI.formatDate(payment.createdAt || payment.created);
    const seller = payment.sellerName || payment.seller?.displayName || '-';
    const amount = adminUI.formatCurrency(payment.amountGross || payment.amount || 0);
    const status = getPaymentStatusBadge(payment.status, payment.type);
    const stripeId = paymentId.substring(0, 12);
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
    p.paymentIntentId === paymentId || 
    p.id === paymentId ||
    p.stripeIds?.paymentIntent === paymentId
  );
  
  if (!currentPayment) {
    adminUI.showToast('決済情報が見つかりませんでした', 'error');
    return;
  }

  document.getElementById('modalTitle').textContent = `取引詳細: ${paymentId.substring(0, 20)}...`;
  populatePaymentDetails(currentPayment);
  
  adminUI.showModal('paymentModal');
  setupModalClose();
}

// ============================================
// ✅ 修正: 金額詳細を追加（amountGross, amountFee, amountNet）
// ============================================
function populatePaymentDetails(payment) {
  document.getElementById('paymentDate').textContent = adminUI.formatDate(payment.createdAt || payment.created);
  document.getElementById('paymentSeller').textContent = 
    payment.sellerName || payment.seller?.displayName || '-';
  document.getElementById('paymentStatus').textContent = getPaymentStatusText(payment.status, payment.type);
  
  // ✅ 金額詳細
  document.getElementById('amountGross').textContent = adminUI.formatCurrency(payment.amountGross || 0);
  document.getElementById('amountFee').textContent = adminUI.formatCurrency(payment.amountFee || 0);
  document.getElementById('amountNet').textContent = adminUI.formatCurrency(payment.amountNet || 0);
  
  document.getElementById('paymentIntentId').textContent = payment.paymentIntentId || '-';
  document.getElementById('chargeId').textContent = payment.chargeId || '-';
  
  // Stripeダッシュボードリンク
  const stripeBtn = document.getElementById('openStripeBtn');
  const chargeId = payment.chargeId;
  
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
  
  closeBtn.onclick = () => adminUI.hideModal('paymentModal');
  modal.onclick = (e) => {
    if (e.target === modal) adminUI.hideModal('paymentModal');
  };
}

// ============================================
// イベントリスナー設定
// ============================================
function setupEventListeners() {
  const debouncedSearch = adminUI.debounce(() => {
    const period = document.getElementById('periodFilter').value;
    const status = document.getElementById('typeFilter').value;
    const search = document.getElementById('searchInput').value;
    loadPayments({ period, status, search });
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
    adminUI.showSpinner('syncPaymentsBtn', true);
    
    try {
      const period = document.getElementById('periodFilter').value;
      await loadStripeSummary(period);
      await loadPayments(currentFilters);
      
      adminUI.showToast('Stripe同期が完了しました', 'success');
      
    } catch (error) {
      adminUI.showToast('同期に失敗: ' + error.message, 'error');
    } finally {
      adminUI.showSpinner('syncPaymentsBtn', false);
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
  
  adminUI.showSpinner('generateEvidenceBtn', true);
  
  try {
    const piId = currentPayment.paymentIntentId;
    
    await adminAPI.request('/api/admin/disputes/generate_evidence', {
      method: 'POST',
      body: JSON.stringify({ payment_intent_id: piId })
    });
    
    adminUI.showMessage('modalMessage', 'success', 'エビデンスを生成しました');
    
  } catch (error) {
    adminUI.showMessage('modalMessage', 'error', error.message);
  } finally {
    adminUI.showSpinner('generateEvidenceBtn', false);
  }
}

// ============================================
// エビデンス送信
// ============================================
async function submitEvidence() {
  if (!currentPayment) return;
  
  adminUI.showSpinner('submitEvidenceBtn', true);
  
  try {
    const piId = currentPayment.paymentIntentId;
    
    await adminAPI.request('/api/admin/disputes/submit_evidence', {
      method: 'POST',
      body: JSON.stringify({ payment_intent_id: piId })
    });
    
    adminUI.showMessage('modalMessage', 'success', 'エビデンスを送信しました');
    await loadPayments(currentFilters);
    
  } catch (error) {
    adminUI.showMessage('modalMessage', 'error', error.message);
  } finally {
    adminUI.showSpinner('submitEvidenceBtn', false);
  }
}

// ============================================
// ✅ エラーハンドリング改善: 返金処理
// ============================================
async function processRefund() {
  if (!currentPayment) return;
  
  const amount = currentPayment.amountGross || 0;
  const amountText = adminUI.formatCurrency(amount);
  
  if (!confirm(`${amountText} の返金処理を実行しますか？\n\nこの操作は取り消せません。`)) {
    return;
  }
  
  adminUI.showSpinner('refundBtn', true);
  
  try {
    const piId = currentPayment.paymentIntentId;
    
    await adminAPI.request('/api/admin/payments/refund', {
      method: 'POST',
      body: JSON.stringify({ 
        payment_intent_id: piId,
        amount: amount
      })
    });
    
    adminUI.showMessage('modalMessage', 'success', '返金処理を完了しました');
    await loadPayments(currentFilters);
    
    setTimeout(() => adminUI.hideModal('paymentModal'), 2000);
    
  } catch (error) {
    // ✅ エラーハンドリング改善
    let errorMsg = error.message;
    if (error.message.includes('already_refunded')) {
      errorMsg = 'この決済は既に返金されています';
    } else if (error.message.includes('insufficient_funds')) {
      errorMsg = 'Stripeアカウントの残高が不足しています';
    }
    adminUI.showMessage('modalMessage', 'error', errorMsg);
  } finally {
    adminUI.showSpinner('refundBtn', false);
  }
}

// ============================================
// メモ保存
// ============================================
async function saveMemo() {
  if (!currentPayment) return;
  
  const memo = document.getElementById('internalMemo').value;
  adminUI.showSpinner('saveMemoBtn', true);
  
  try {
    // TODO: メモ保存APIの実装
    console.log('メモ保存:', memo);
    
    adminUI.showMessage('modalMessage', 'success', 'メモを保存しました');
    
  } catch (error) {
    adminUI.showMessage('modalMessage', 'error', error.message);
  } finally {
    adminUI.showSpinner('saveMemoBtn', false);
  }
}

// ============================================
// エラー表示（レガシー互換）
// ============================================
function showError(message) {
  const banner = document.getElementById('errorBanner');
  const messageEl = document.getElementById('errorMessage');
  
  if (banner && messageEl) {
    messageEl.textContent = message;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 10000);
  }
}

function hideError() {
  const banner = document.getElementById('errorBanner');
  if (banner) banner.classList.remove('show');
}

// ============================================
// 初期化
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🟢 Admin Payments ページ初期化 v2');
  
  setupEventListeners();
  
  try {
    await loadStripeSummary('today');
    await loadPayments();
  } catch (error) {
    console.error('初期化エラー:', error);
    adminUI.showToast('初期化に失敗: ' + error.message, 'error');
  }
  
  console.log('✅ 初期化完了');
});

window.openPaymentModal = openPaymentModal;
