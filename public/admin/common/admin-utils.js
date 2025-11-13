/**
 * FleaPay 管理画面共通ユーティリティ v2.0
 * 既存admin.htmlの優秀な関数を継承・拡張
 */

class AdminAPI {
  constructor() {
    this.baseURL = '/api';
    this.adminToken = this.getStoredAdminToken();
  }

  getStoredAdminToken() {
    return localStorage.getItem('fleapay_admin_token') || 
           sessionStorage.getItem('fleapay_admin_token');
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : null;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const csrf = this.getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
    
    if (options.adminToken || this.adminToken) {
      headers['x-admin-token'] = options.adminToken || this.adminToken;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }

      if (!response.ok) {
        const error = new Error(this.getErrorMessage(response.status, data));
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      this.logError('API Request failed', { endpoint, error });
      throw error;
    }
  }

  getErrorMessage(status, data) {
    if (data && data.error) return data.error;
    
    const messages = {
      400: 'リクエスト内容が不正です。入力内容を確認してください。',
      401: '認証エラーです。ログインし直してください。',
      403: 'アクセス権限がありません。管理者に確認してください。',
      404: 'APIエンドポイントが見つかりません。',
      429: 'リクエストが多すぎます。時間をおいて再度お試しください。',
      500: 'サーバー側でエラーが発生しました。時間をおいて再度お試しください。'
    };
    
    return messages[status] || `HTTP ${status} エラーが発生しました。`;
  }

  logError(message, context = {}) {
    console.error(`[AdminAPI] ${message}`, context);
    // 本番環境では外部ログサービスに送信
    if (window.location.hostname !== 'localhost') {
      // Sentry, LogRocket等への送信
    }
  }
}

class AdminUI {
  static showSpinner(buttonId, show = true) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    btn.disabled = show;
    
    let spinner = btn.querySelector('.admin-spinner');
    if (!spinner && show) {
      spinner = document.createElement('span');
      spinner.className = 'admin-spinner';
      spinner.innerHTML = '<span class="spinner"></span>';
      btn.appendChild(spinner);
    }
    
    if (spinner) {
      spinner.style.display = show ? 'inline-flex' : 'none';
    }
  }

  static showMessage(containerId, type, message, duration = 5000) {
    const container = document.getElementById(containerId);
    if (!container) {
      // フォールバック：トースト通知を作成
      this.showToast(message, type);
      return;
    }

    container.className = type === 'success' ? 'ok' : 'err';
    container.textContent = message;
    container.style.display = 'block';

    if (duration > 0) {
      setTimeout(() => {
        container.style.display = 'none';
      }, duration);
    }
  }

  static showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.textContent = message;
    
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '8px',
      backgroundColor: type === 'success' ? '#2D5B3F' : '#8B2635',
      color: '#fff',
      zIndex: '1000',
      fontSize: '14px',
      maxWidth: '300px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('コピーしました', 'success');
      return true;
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      this.showToast('コピーに失敗しました', 'error');
      return false;
    }
  }

  static formatDate(dateString, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { ...defaultOptions, ...options });
  }

  static formatCurrency(amount, currency = 'JPY') {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency
    }).format(amount);
  }
}

// バリデーション（既存admin.htmlから継承）
const AdminValidators = {
  accountId: (id) => /^acct_[A-Za-z0-9]+$/.test(id),
  publicId: (id) => /^[a-zA-Z0-9_-]{3,50}$/.test(id),
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
};

// ページナビゲーション管理
class AdminNavigation {
  constructor() {
    this.currentPage = this.getPageFromURL();
    this.init();
  }

  getPageFromURL() {
    const path = window.location.pathname;
    const match = path.match(/admin-(\w+)\.html$/);
    return match ? match[1] : 'dashboard';
  }

  init() {
    this.updateActiveNav();
    this.setupEventListeners();
  }

  updateActiveNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === this.currentPage) {
        item.classList.add('active');
      }
    });
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('.nav-item')) {
        e.preventDefault();
        const page = e.target.dataset.page;
        if (page) {
          window.location.href = `admin-${page}.html`;
        }
      }
    });
  }
}

// グローバルインスタンス
window.adminAPI = new AdminAPI();
window.adminUI = AdminUI;
window.adminValidators = AdminValidators;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  new AdminNavigation();
  
  // 環境表示
  const envBadge = document.querySelector('.env-badge');
  if (envBadge) {
    const hostname = window.location.hostname;
    const env = hostname.includes('localhost') || hostname.includes('dev') ? 'development' :
                hostname.includes('stg') ? 'staging' : 'production';
    envBadge.className = `env-badge env-${env}`;
    envBadge.textContent = env.toUpperCase();
  }
});