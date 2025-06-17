// 🔐 SIMPLIFIED auth.js - Authentication ONLY
class DashboardAuthManager {
  constructor() {
    this.user = null;
    this.authenticated = false;
    this.checkingAuth = false;
    this.authListeners = [];
    this.init();
  }

  async init() {
    console.log('🔐 Dashboard Auth Manager initializing...');
    
    if (this.isDashboardPage()) {
      await this.checkAuthOnLoad();
    }
    
    this.setupEventListeners();
  }

  isDashboardPage() {
    return window.location.pathname.startsWith('/dashboard');
  }

  // 🔍 CORE AUTH CHECK (simplified)
  async checkAuth() {
    if (this.checkingAuth) return this.authenticated;
    
    this.checkingAuth = true;
    
    try {
      console.log('🔍 Checking authentication...');
      
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.authenticated) {
        this.authenticated = true;
        this.user = {
          ...data.user,
          // Handle both naming conventions
          userType: data.user.userType || data.user.user_type,
          subscriptionTier: data.user.subscriptionTier || data.user.subscription_tier,
          currentMonthLeads: data.user.currentMonthLeads || data.user.current_month_leads,
          monthlyLeadLimit: data.user.monthlyLeadLimit || data.user.monthly_lead_limit,
          isAdmin: data.user.isAdmin || data.user.is_admin,
        };
        
        console.log(`✅ Auth success: ${this.user.email} (${this.user.subscriptionTier})`);
        
        // 🎯 LET UTILS HANDLE ALL THE VISUAL UPDATES:
        if (window.utils && window.utils.updateDashboardForUser) {
          window.utils.updateDashboardForUser(this.user);
        }
        
        this.notifyAuthListeners(true);
        return true;
      } else {
        this.handleAuthFailure();
        return false;
      }
    } catch (error) {
      console.error('🚫 Auth check failed:', error);
      this.handleAuthFailure();
      return false;
    } finally {
      this.checkingAuth = false;
    }
  }

  // 🚀 AUTH ON PAGE LOAD
  async checkAuthOnLoad() {
    const isLoggedIn = this.getCookie('isLoggedIn');
    
    if (!isLoggedIn) {
      console.log('❌ No login cookie found, redirecting...');
      this.redirectToLogin();
      return;
    }
    
    await this.checkAuth();
  }

  // 🔑 LOGIN
  async login(email, password, rememberMe = false) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.authenticated = true;
        this.user = {
          ...data.user,
          userType: data.user.userType || data.user.user_type,
          subscriptionTier: data.user.subscriptionTier || data.user.subscription_tier,
          currentMonthLeads: data.user.currentMonthLeads || data.user.current_month_leads,
          monthlyLeadLimit: data.user.monthlyLeadLimit || data.user.monthly_lead_limit,
          isAdmin: data.user.isAdmin || data.user.is_admin
        };
        
        // 🎯 LET UTILS HANDLE VISUAL UPDATES:
        if (window.utils && window.utils.updateDashboardForUser) {
          window.utils.updateDashboardForUser(this.user);
        }
        
        this.notifyAuthListeners(true);
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
        return { success: true, user: this.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('🚫 Login failed:', error);
      return { success: false, error: 'Login request failed' };
    }
  }

  // 🚪 LOGOUT
  async logout() {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('🚫 Logout request failed:', error);
    }
    
    // Clear auth state
    this.authenticated = false;
    this.user = null;
    
    this.notifyAuthListeners(false);
    
    // Redirect to login
    window.location.href = '/login';
  }

  // 🌐 API REQUESTS with auth
  async apiRequest(url, options = {}) {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (response.status === 401 || response.status === 403) {
        console.error('🚫 API auth failed, redirecting...');
        this.handleAuthFailure();
        throw new Error('Authentication required');
      }
      
      return response;
    } catch (error) {
      console.error('🚫 API request failed:', error);
      throw error;
    }
  }

  // 🔐 PERMISSION CHECKING
  hasPermission(requiredLevel) {
    if (!this.authenticated || !this.user) return false;
    
    const levels = {
      'free': 1,
      'professional': 2,
      'business': 3,
      'enterprise': 4,
      'admin': 5
    };
    
    const userType = this.user.userType || this.user.user_type || 'free';
    const baseType = userType.split('_')[0];
    
    const userLevel = levels[baseType] || 0;
    const required = levels[requiredLevel] || 0;
    
    return userLevel >= required;
  }

  // 🚨 HANDLE AUTH FAILURES
  handleAuthFailure() {
    this.authenticated = false;
    this.user = null;
    
    this.notifyAuthListeners(false);
    
    if (this.isDashboardPage()) {
      this.redirectToLogin();
    }
  }

  // 🔄 REDIRECT TO LOGIN
  redirectToLogin() {
    if (window.location.pathname !== '/login') {
      const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirectUrl}`;
    }
  }

  // 🍪 GET COOKIE
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // 📡 EVENT LISTENERS
  addAuthListener(callback) {
    this.authListeners.push(callback);
  }

  removeAuthListener(callback) {
    this.authListeners = this.authListeners.filter(cb => cb !== callback);
  }

  notifyAuthListeners(authenticated) {
    this.authListeners.forEach(callback => {
      try {
        callback(authenticated, this.user);
      } catch (error) {
        console.error('🚫 Auth listener error:', error);
      }
    });
  }

  // 🎛️ SETUP EVENT LISTENERS
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-logout], #logoutBtn, .logout-btn')) {
        e.preventDefault();
        this.logout();
      }
    });
  }
}

// 🌍 CREATE GLOBAL INSTANCE
window.authManager = new DashboardAuthManager();

console.log('🔐 Simplified Dashboard Auth Manager loaded! 🚀');