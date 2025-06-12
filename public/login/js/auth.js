// 🔐 /public/js/auth.js
// Secure cookie-based authentication manager for SteadyManager

class AuthManager {
  constructor() {
    this.user = null;
    this.authenticated = false;
    this.checkingAuth = false;
    this.init();
  }

  async init() {
    // Only auto-check auth on protected pages
    if (this.isProtectedPage()) {
      await this.checkAuthOnLoad();
    }
  }

  isProtectedPage() {
    return window.location.pathname.startsWith('/dashboard');
  }

  // 🔍 Check authentication status with server
  async checkAuth() {
    if (this.checkingAuth) return this.authenticated;
    
    this.checkingAuth = true;
    
    try {
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include' // Send cookies
      });
      
      const data = await response.json();
      
      if (data.authenticated) {
        this.authenticated = true;
        this.user = data.user;
        this.updateUI();
        return true;
      } else {
        this.authenticated = false;
        this.user = null;
        if (this.isProtectedPage()) {
          this.redirectToLogin();
        }
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.authenticated = false;
      this.user = null;
      return false;
    } finally {
      this.checkingAuth = false;
    }
  }

  // 🚀 Check auth on page load
  async checkAuthOnLoad() {
    // Quick check with non-httpOnly cookie first
    const isLoggedIn = this.getCookie('isLoggedIn');
    
    if (!isLoggedIn) {
      this.redirectToLogin();
      return;
    }
    
    // Verify with server
    await this.checkAuth();
  }

  // 🔑 Login with credentials
  async login(email, password, rememberMe = false) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.authenticated = true;
        this.user = data.user;
        this.updateUI();
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login request failed' };
    }
  }

  // 🚪 Logout user
  async logout() {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    
    // Clear local state
    this.authenticated = false;
    this.user = null;
    
    // Redirect to login
    window.location.href = '/login';
  }

  // 🌐 Make authenticated API requests
  async apiRequest(url, options = {}) {
    const defaultOptions = {
      credentials: 'include', // Always send cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        this.authenticated = false;
        this.user = null;
        this.redirectToLogin();
        throw new Error('Authentication required');
      }
      
      return response;
    } catch (error) {
      // If it's a network error and we're on a protected page, check auth
      if (this.isProtectedPage() && error.name === 'TypeError') {
        await this.checkAuth();
      }
      throw error;
    }
  }

  // 🔄 Redirect to login page
  redirectToLogin() {
    if (window.location.pathname !== '/login') {
      const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirectUrl}`;
    }
  }

  // 🎨 Update UI elements based on auth state
  updateUI() {
    if (this.authenticated && this.user) {
      // Update user email displays
      const userElements = document.querySelectorAll('[data-user-email]');
      userElements.forEach(el => el.textContent = this.user.email);
      
      // Update subscription tier displays
      const tierElements = document.querySelectorAll('[data-user-tier]');
      tierElements.forEach(el => el.textContent = this.user.subscriptionTier);
      
      // Show admin-only elements
      if (this.user.isAdmin) {
        document.querySelectorAll('[data-admin-only]').forEach(el => {
          el.style.display = 'block';
        });
      }
      
      // Update subscription status displays
      const subscriptionElements = document.querySelectorAll('[data-subscription-status]');
      subscriptionElements.forEach(el => {
        el.textContent = this.getSubscriptionDisplayName(this.user.subscriptionTier);
        el.className = `subscription-${this.user.subscriptionTier.toLowerCase()}`;
      });

      // Update lead limit displays
      const limitInfo = this.getLeadLimitInfo();
      if (limitInfo) {
        const limitElements = document.querySelectorAll('[data-lead-limit]');
        limitElements.forEach(el => {
          el.textContent = `${limitInfo.current}/${limitInfo.limit}`;
          
          // Add warning class if close to limit
          if (limitInfo.percentage > 80) {
            el.classList.add('limit-warning');
          }
        });
      }
    }
  }

  // 📋 Get user-friendly subscription names
  getSubscriptionDisplayName(tier) {
    const displayNames = {
      'FREE': 'Free Plan',
      'PROFESSIONAL': 'Professional',
      'PROFESSIONAL_TRIAL': 'Professional Trial',
      'BUSINESS': 'Business',
      'ENTERPRISE': 'Enterprise',
      'ADMIN': 'Administrator'
    };
    return displayNames[tier] || tier;
  }

  // 🍪 Get cookie value (only works for non-httpOnly cookies)
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // 🔐 Check if user has required permission level
  hasPermission(requiredLevel) {
    if (!this.authenticated || !this.user) return false;
    
    const levels = {
      'free': 1,
      'professional': 2,
      'business': 3,
      'enterprise': 4,
      'admin': 5
    };
    
    const userLevel = levels[this.user.userType?.split('_')[0]] || 0;
    const required = levels[requiredLevel] || 0;
    
    return userLevel >= required;
  }

  // 📊 Get lead limit information
  getLeadLimitInfo() {
    if (!this.user) return null;
    
    const current = this.user.currentMonthLeads || 0;
    const limit = this.user.monthlyLeadLimit || 0;
    
    return {
      current,
      limit,
      percentage: limit > 0 ? (current / limit) * 100 : 0,
      remaining: Math.max(0, limit - current),
      canAddMore: current < limit,
      isUnlimited: limit >= 999999
    };
  }

  // 🛡️ Sanitize HTML to prevent XSS
  sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 📱 Show notification to user
  showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.auth-notification');
    existing.forEach(el => el.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `auth-notification auth-notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    // Set background color based on type
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  // ⏰ Check if trial is expiring soon
  getTrialStatus() {
    if (!this.user || this.user.subscriptionTier !== 'PROFESSIONAL_TRIAL') {
      return null;
    }
    
    const settings = this.user.settings || {};
    const trialEndDate = settings.trialEndDate;
    
    if (!trialEndDate) return null;
    
    const endDate = new Date(trialEndDate);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    
    return {
      endDate,
      daysRemaining,
      isExpiringSoon: daysRemaining <= 3,
      isExpired: daysRemaining <= 0
    };
  }

  // 🔍 Debug helper - check current auth state
  getDebugInfo() {
    return {
      authenticated: this.authenticated,
      user: this.user,
      isLoggedInCookie: this.getCookie('isLoggedIn'),
      currentPath: window.location.pathname,
      isProtectedPage: this.isProtectedPage(),
      permissions: this.user ? {
        hasAdminAccess: this.hasPermission('admin'),
        hasBusinessAccess: this.hasPermission('business'),
        hasProfessionalAccess: this.hasPermission('professional')
      } : null,
      leadLimitInfo: this.getLeadLimitInfo(),
      trialStatus: this.getTrialStatus()
    };
  }
}

// 🌍 Create global instance
window.authManager = new AuthManager();

// 🔧 Setup common event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Auto-setup logout buttons
  const logoutButtons = document.querySelectorAll('[data-logout], #logoutBtn, .logout-btn');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      authManager.logout();
    });
  });

  // Auto-setup elements that need auth check
  const authElements = document.querySelectorAll('[data-require-auth]');
  authElements.forEach(el => {
    if (!authManager.authenticated) {
      el.style.display = 'none';
    }
  });

  // Show trial warnings if applicable
  const trialStatus = authManager.getTrialStatus();
  if (trialStatus && trialStatus.isExpiringSoon && !trialStatus.isExpired) {
    authManager.showNotification(
      `Trial expires in ${trialStatus.daysRemaining} day(s). Upgrade to keep your data!`,
      'warning',
      10000 // 10 seconds
    );
  }
});

// 💬 Console helper for debugging
if (typeof window !== 'undefined') {
  window.authDebug = () => {
    console.table(authManager.getDebugInfo());
  };
}

console.log('🔐 AuthManager loaded and ready!');