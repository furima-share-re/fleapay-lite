// public/js/admin-payments.js

async function fetchStripeSummary(period = 'today') {
  const res = await fetch(`/api/admin/stripe/summary?period=${encodeURIComponent(period)}`, {
    // admin の認証ヘッダが必要ならここで設定
    // headers: { 'x-admin-token': window.ADMIN_TOKEN }
  });

  const json = await res.json();
  if (!json.ok) {
    console.error(json);
    alert('Stripeデータ取得でエラーが発生しました: ' + (json.error || 'unknown'));
    return;
  }
  renderStripeSummary(json.summary);
  // 必要なら一覧も renderStripeTables(json.charges, json.disputes, json.refunds)
}

function renderStripeSummary(summary) {
  // ★ ここはあなたのHTMLのIDに合わせて書き換えてOK
  
  // 今日の決済 件数
  const elTodayCount = document.querySelector('[data-field="today-payments-count"]');
  if (elTodayCount) elTodayCount.textContent = summary.paymentsCount + '件';

  // 今日の純売上
  const elNetSales = document.querySelector('[data-field="today-net-sales"]');
  if (elNetSales) elNetSales.textContent = '¥' + (summary.netSales / 100).toLocaleString();

  // チャージバック件数
  const elDisputes = document.querySelector('[data-field="dispute-count"]');
  if (elDisputes) elDisputes.textContent = summary.disputeCount + '件';

  // 返金件数
  const elRefundCount = document.querySelector('[data-field="refund-count"]');
  if (elRefundCount) elRefundCount.textContent = summary.refundCount + '件';

  // 返金額
  const elRefundAmount = document.querySelector('[data-field="refund-amount"]');
  if (elRefundAmount) elRefundAmount.textContent = '¥' + (summary.refundAmount / 100).toLocaleString();
}

// Stripe同期ボタン（画面上部の「Stripe同期」）に紐付け
document.addEventListener('DOMContentLoaded', () => {
  const btnSync = document.querySelector('[data-action="stripe-sync"]');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      fetchStripeSummary('today');
    });
  }
  // 初回ロード時も今日分を読み込む
  fetchStripeSummary('today');
});
