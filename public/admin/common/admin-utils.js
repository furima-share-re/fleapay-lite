<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ダッシュボード | Fleapay Admin</title>
  
  <!-- セキュリティヘッダ -->
  <meta name="robots" content="noindex,nofollow">
  <meta http-equiv="Cache-Control" content="no-store">
  <meta http-equiv="X-Frame-Options" content="DENY">
  
  <!-- 共通スタイル・スクリプト -->
  <link rel="stylesheet" href="common/admin-base.css">
  <script src="common/admin-utils.js"></script>
</head>
<body>
  <!-- 共通ヘッダー -->
  <header class="admin-header">
    <div>
      <span style="font-weight: 700; color: var(--fleapay-blue);">Fleapay Admin</span>
      <span class="env-badge">ENV</span>
    </div>
    <div>
      <span style="font-size: 13px; color: var(--fleapay-gray);">admin@fleapay.jp ▼</span>
    </div>
  </header>

  <div class="admin-container">
    <!-- 共通サイドバー -->
    <nav class="admin-sidebar">
      <ul class="nav-menu">
        <li><a href="admin-dashboard.html" class="nav-item active" data-page="dashboard">📊 ダッシュボード</a></li>
        <li><a href="admin-sellers.html" class="nav-item" data-page="sellers">👥 出店者</a></li>
        <li><a href="admin-frames.html" class="nav-item" data-page="frames">🎨 AIフレーム</a></li>
        <li><a href="admin-payments.html" class="nav-item" data-page="payments">💳 決済・CB管理</a></li>
      </ul>
    </nav>

    <!-- メインコンテンツ -->
    <main class="admin-content">
      <!-- 🆕 エラー表示エリア追加 -->
      <div id="errorMessage" style="display: none; padding: 12px; background: #fef2f2; color: #8B2635; border-radius: 8px; margin-bottom: 16px;">
      </div>

      <section>
        <div class="sec-title-row">
          <h1>ダッシュボード</h1>
          <span class="pill">ホーム</span>
        </div>
        
        <!-- フィルタ -->
        <div style="display: flex; gap: 16px; margin-bottom: 20px;">
          <select id="periodFilter" style="padding: 8px; border-radius: 8px;">
            <option value="today">今日</option>
            <option value="week">今週</option>
            <option value="month">今月</option>
          </select>
          <select id="eventFilter" style="padding: 8px; border-radius: 8px;">
            <option value="all">全イベント</option>
            <option value="oi-flea">大井フリマ</option>
          </select>
          <button id="refreshBtn" class="ghost">🔄 更新</button>
        </div>
      </section>

      <!-- メトリクス表示 -->
      <div class="grid">
        <section>
          <h2>今日の決済サマリ</h2>
          <div style="font-size: 28px; font-weight: 700; color: var(--fleapay-blue); margin: 12px 0;">
            <span id="paymentCount">-</span><span style="font-size: 16px; margin-left: 4px;">件</span>
          </div>
          <div style="font-size: 14px; color: var(--fleapay-gray);">
            売上合計: <span id="totalRevenue">-</span><br>
            純売上: <span id="netRevenue">-</span>
          </div>
        </section>
        
        <section>
          <h2>チャージバック / 返金</h2>
          <div style="font-size: 28px; font-weight: 700; color: var(--warning-amber); margin: 12px 0;">
            <span id="disputeCount">-</span><span style="font-size: 16px; margin-left: 4px;">件</span>
          </div>
          <div style="font-size: 14px; color: var(--fleapay-gray);">
            返金: <span id="refundCount">-</span>件<br>
            期限間近: <span id="urgentCount" style="color: var(--error-maroon);">-</span>件
          </div>
        </section>
      </div>

      <!-- アラート -->
      <section>
        <h2>最近のアラート</h2>
        <div id="alertsList">
          <div style="padding: 12px; color: var(--fleapay-gray); text-align: center;">
            読み込み中...
          </div>
        </div>
      </section>

      <!-- 出店者アクティビティ -->
      <section>
        <h2>出店者アクティビティ</h2>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--fleapay-cream);">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #eee;">出店者ID</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #eee;">店名</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #eee;">ステータス</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #eee;">最終利用</th>
              </tr>
            </thead>
            <tbody id="recentSellers">
              <tr>
                <td colspan="4" style="padding: 20px; text-align: center; color: var(--fleapay-gray);">
                  読み込み中...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>

  <script>
    // 🆕 デバッグモード
    const DEBUG = true;

    // 🆕 認証トークンを初期化（開発環境用）
    function initAdminToken() {
      const token = adminAPI.getStoredAdminToken();
      
      if (!token) {
        // 開発環境用のデフォルトトークンを設定
        const defaultToken = 'admin-devtoken';
        
        if (DEBUG) {
          console.warn('[Admin] 認証トークンが見つかりません。デフォルトトークンを使用します。');
          console.log('[Admin] Token:', defaultToken);
        }
        
        // sessionStorageに保存
        sessionStorage.setItem('fleapay_admin_token', defaultToken);
        adminAPI.adminToken = defaultToken;
        
        adminUI.showToast('開発モード: デフォルト認証を使用', 'info');
      } else {
        if (DEBUG) {
          console.log('[Admin] 認証トークン:', token);
        }
      }
    }

    // ダッシュボード固有の初期化
    document.addEventListener('DOMContentLoaded', async () => {
      initAdminToken();
      await loadDashboardData();
      setupEventListeners();
      startAutoRefresh();
    });

    async function loadDashboardData() {
      try {
        if (DEBUG) console.log('[Dashboard] データ取得開始...');
        
        // 🔧 修正: エンドポイントパスを確認
        const data = await adminAPI.request('/admin/dashboard');
        
        if (DEBUG) console.log('[Dashboard] データ取得成功:', data);
        
        updateMetrics(data);
        hideError();
        
      } catch (error) {
        console.error('[Dashboard] データ取得エラー:', error);
        
        // 詳細なエラー表示
        let errorMessage = 'ダッシュボードデータの取得に失敗しました';
        
        if (error.status === 401) {
          errorMessage = '認証エラー: 管理者トークンが無効です';
        } else if (error.status === 404) {
          errorMessage = 'APIエンドポイントが見つかりません (/api/admin/dashboard)';
        } else if (error.message) {
          errorMessage = `エラー: ${error.message}`;
        }
        
        showError(errorMessage);
        adminUI.showToast(errorMessage, 'error');
        
        // 🆕 デモデータを表示（開発用）
        if (DEBUG) {
          console.log('[Dashboard] デモデータを表示します');
          updateMetrics({
            paymentCount: 0,
            totalRevenue: 0,
            netRevenue: 0,
            disputeCount: 0,
            refundCount: 0
          });
        }
      }
    }

    function updateMetrics(data) {
      document.getElementById('paymentCount').textContent = data.paymentCount || 0;
      document.getElementById('totalRevenue').textContent = adminUI.formatCurrency(data.totalRevenue || 0);
      document.getElementById('netRevenue').textContent = adminUI.formatCurrency(data.netRevenue || 0);
      document.getElementById('disputeCount').textContent = data.disputeCount || 0;
      document.getElementById('refundCount').textContent = data.refundCount || 0;
      document.getElementById('urgentCount').textContent = data.urgentCount || 0;
      
      // アラートリストの更新
      const alertsList = document.getElementById('alertsList');
      if (data.disputeCount > 0) {
        alertsList.innerHTML = `
          <div class="err" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>⚠️ チャージバック ${data.disputeCount}件</strong><br>
              <small>対応が必要な案件があります</small>
            </div>
            <button class="small" onclick="location.href='admin-payments.html?status=disputed'">対応</button>
          </div>
        `;
      } else {
        alertsList.innerHTML = `
          <div style="padding: 12px; color: var(--fleapay-gray); text-align: center;">
            現在アラートはありません
          </div>
        `;
      }
    }

    function showError(message) {
      const errorDiv = document.getElementById('errorMessage');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }

    function hideError() {
      const errorDiv = document.getElementById('errorMessage');
      errorDiv.style.display = 'none';
    }

    function setupEventListeners() {
      document.getElementById('refreshBtn').addEventListener('click', () => {
        loadDashboardData();
        adminUI.showToast('データを更新しています...', 'info', 2000);
      });
      
      document.getElementById('periodFilter').addEventListener('change', loadDashboardData);
    }

    function startAutoRefresh() {
      // 5分ごとに自動更新
      setInterval(() => {
        if (DEBUG) console.log('[Dashboard] 自動更新...');
        loadDashboardData();
      }, 300000);
    }
  </script>
</body>
</html>