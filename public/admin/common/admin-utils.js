// ============================================
// Fleapay Admin - 共通ユーティリティ
// 完全修正版 - 2025年版
// ============================================

// ============================================
// adminAPI - 管理API呼び出しヘルパー
// ============================================
const adminAPI = {
  /**
   * 認証付きAPIリクエスト
   * @param {string} url - APIエンドポイント
   * @param {Object} options - fetchオプション
   * @returns {Promise<Object>} - レスポンスデータ
   */
  async request(url, options = {}) {
    const token = window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN');
    
    if (!token) {
      throw new Error('認証トークンが設定されていません');
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          ...options.headers
        }
      });
      
      // 認証エラー
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('ADMIN_TOKEN');
        localStorage.removeItem('ADMIN_TOKEN_EXPIRY');
        // window.location.href = '/admin-login.html';
        throw new Error('認証に失敗しました');
      }
      
      // HTTPエラー
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      // ネットワークエラー
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('ネットワークエラー: サーバーに接続できません');
      }
      throw error;
    }
  }
};

// ============================================
// adminUI - UI操作ヘルパー
// ============================================
const adminUI = {
  /**
   * トースト通知を表示
   * @param {string} message - メッセージ
   * @param {string} type - タイプ ('success', 'error', 'warning', 'info')
   */
  showToast(message, type = 'info') {
    // 既存のトーストを削除
    const existing = document.getElementById('admin-toast');
    if (existing) {
      existing.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.textContent = message;
    
    // スタイル設定
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '10000',
      maxWidth: '400px',
      animation: 'slideInRight 0.3s ease-out'
    });
    
    // タイプ別の色設定
    const colors = {
      success: { bg: '#f0f9f4', color: '#166534', border: '#166534' },
      error: { bg: '#fef2f2', color: '#991b1b', border: '#991b1b' },
      warning: { bg: '#fef9e7', color: '#92400e', border: '#92400e' },
      info: { bg: '#f0f2f5', color: '#1e40af', border: '#1e40af' }
    };
    
    const style = colors[type] || colors.info;
    toast.style.background = style.bg;
    toast.style.color = style.color;
    toast.style.border = `2px solid ${style.border}`;
    
    document.body.appendChild(toast);
    
    // 3秒後に削除
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
  
  /**
   * モーダルを表示
   * @param {string} modalId - モーダルのID
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  },
  
  /**
   * モーダルを非表示
   * @param {string} modalId - モーダルのID
   */
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  },
  
  /**
   * ボタンにスピナーを表示
   * @param {string} buttonId - ボタンのID
   * @param {boolean} show - 表示/非表示
   */
  showSpinner(buttonId, show = true) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (show) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = '処理中...';
      button.style.cursor = 'wait';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
      button.style.cursor = '';
      delete button.dataset.originalText;
    }
  },
  
  /**
   * メッセージを表示
   * @param {string} elementId - 要素のID
   * @param {string} type - タイプ ('success', 'error')
   * @param {string} message - メッセージ
   */
  showMessage(elementId, type, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = message;
    element.style.display = 'block';
    
    const colors = {
      success: { bg: '#f0f9f4', color: '#166534' },
      error: { bg: '#fef2f2', color: '#991b1b' }
    };
    
    const style = colors[type] || colors.error;
    element.style.background = style.bg;
    element.style.color = style.color;
    element.style.padding = '12px';
    element.style.borderRadius = '8px';
    element.style.marginTop = '12px';
  },
  
  /**
   * 金額をフォーマット（円単位 → 表示）
   * @param {number} amount - 金額（円単位）
   * @returns {string} - フォーマット済み金額
   */
  formatCurrency(amount) {
    if (typeof amount !== 'number') {
      amount = parseInt(amount) || 0;
    }
    return '¥' + (amount / 100).toLocaleString('ja-JP');
  },
  
  /**
   * 数値をフォーマット
   * @param {number} num - 数値
   * @returns {string} - フォーマット済み数値
   */
  formatNumber(num) {
    if (typeof num !== 'number') {
      num = parseInt(num) || 0;
    }
    return num.toLocaleString('ja-JP');
  },
  
  /**
   * 日付をフォーマット
   * @param {string|Date} date - 日付
   * @returns {string} - フォーマット済み日付
   */
  formatDate(date) {
    if (!date) return '-';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  },
  
  /**
   * デバウンス関数
   * @param {Function} func - 実行する関数
   * @param {number} wait - 待機時間（ミリ秒）
   * @returns {Function} - デバウンスされた関数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  /**
   * クリップボードにコピー
   * @param {string} text - コピーするテキスト
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('クリップボードにコピーしました', 'success');
    } catch (error) {
      console.error('コピー失敗:', error);
      this.showToast('コピーに失敗しました', 'error');
    }
  }
};

// ============================================
// adminFormHelper - フォームヘルパー
// ============================================
const adminFormHelper = {
  /**
   * フォームをバリデート
   * @param {HTMLFormElement} form - フォーム要素
   * @param {Object} rules - バリデーションルール
   * @returns {Array} - エラー配列
   */
  validateForm(form, rules) {
    const errors = [];
    
    for (const [field, validators] of Object.entries(rules)) {
      const input = form.elements[field];
      if (!input) continue;
      
      const value = input.value;
      
      for (const validator of validators) {
        const result = validator(value);
        if (result !== true) {
          errors.push({ field, message: result });
          break;
        }
      }
    }
    
    return errors;
  },
  
  /**
   * フィールドエラーを表示
   * @param {Array} errors - エラー配列
   */
  showFieldErrors(errors) {
    // 既存のエラーメッセージを削除
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    
    errors.forEach(({ field, message }) => {
      const input = document.querySelector(`[name="${field}"]`);
      if (!input) return;
      
      const errorEl = document.createElement('div');
      errorEl.className = 'field-error';
      errorEl.textContent = message;
      errorEl.style.color = '#991b1b';
      errorEl.style.fontSize = '12px';
      errorEl.style.marginTop = '4px';
      
      input.parentNode.appendChild(errorEl);
      input.style.borderColor = '#991b1b';
    });
  },
  
  /**
   * フィールドエラーをクリア
   */
  clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('input, textarea, select').forEach(el => {
      el.style.borderColor = '';
    });
  }
};

// ============================================
// adminValidators - バリデーター
// ============================================
const adminValidators = {
  required(value) {
    return value && value.trim() !== '' || 'この項目は必須です';
  },
  
  email(value) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !value || pattern.test(value) || 'メールアドレスの形式が正しくありません';
  },
  
  minLength(value, length) {
    return !value || value.length >= length || `${length}文字以上で入力してください`;
  },
  
  maxLength(value, length) {
    return !value || value.length <= length || `${length}文字以内で入力してください`;
  },
  
  numeric(value) {
    return !value || !isNaN(value) || '数値を入力してください';
  },
  
  integer(value) {
    return !value || Number.isInteger(Number(value)) || '整数を入力してください';
  },
  
  min(value, minValue) {
    return !value || Number(value) >= minValue || `${minValue}以上で入力してください`;
  },
  
  max(value, maxValue) {
    return !value || Number(value) <= maxValue || `${maxValue}以下で入力してください`;
  }
};

// ============================================
// ページ共通の初期化処理
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // 環境バッジの更新
  const envBadge = document.querySelector('.env-badge');
  if (envBadge) {
    const hostname = window.location.hostname;
    let env = 'DEV';
    let color = '#3b82f6';
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      env = 'DEV';
      color = '#3b82f6';
    } else if (hostname.includes('stg') || hostname.includes('staging')) {
      env = 'STG';
      color = '#f59e0b';
    } else {
      env = 'PROD';
      color = '#ef4444';
    }
    
    envBadge.textContent = env;
    envBadge.style.background = color;
  }
  
  // モーダルの共通クローズ処理
  document.querySelectorAll('.modal').forEach(modal => {
    const closeBtn = modal.querySelector('.modal-close');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      });
    }
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  });
  
  // アニメーション用CSS追加
  if (!document.getElementById('admin-utils-styles')) {
    const style = document.createElement('style');
    style.id = 'admin-utils-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
});

// グローバルに公開
window.adminAPI = adminAPI;
window.adminUI = adminUI;
window.adminFormHelper = adminFormHelper;
window.adminValidators = adminValidators;
