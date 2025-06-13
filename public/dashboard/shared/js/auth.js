// 🔐 /public/dashboard/shared/js/auth.js
// Enhanced Dashboard Authentication Manager for SteadyManager
// Built for multi-tier dashboard system with secure cookie authentication

class DashboardAuthManager {
  constructor() {
    this.user = null;
    this.authenticated = false;
    this.checkingAuth = false;
    this.tierConfig = null;
    this.authListeners = [];
    this.init();
  }

  async init() {
    console.log('🔐 Dashboard Auth Manager initializing...');
    
    // Auto-check auth on dashboard pages
    if (this.isDashboardPage()) {
      await this.checkAuthOnLoad();
    }
    
    // Setup auth event listeners
    this.setupEventListeners();
  }

  isDashboardPage() {
    return window.location.pathname.startsWith('/dashboard');
  }

  // 🔍 ENHANCED: Dashboard-specific auth check with tier validation
  async checkAuth() {
    if (this.checkingAuth) return this.authenticated;
    
    this.checkingAuth = true;
    
    try {
      console.log('🔍 Checking dashboard authentication...');
      
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include' // Send HTTP-only cookies
      });
      
      const data = await response.json();
      
      if (data.authenticated) {
        this.authenticated = true;
        
        // 🔄 MAP BACKEND PROPERTIES TO FRONTEND EXPECTATIONS
        this.user = {
          ...data.user,
          // Handle both naming conventions
          userType: data.user.userType || data.user.user_type,
          subscriptionTier: data.user.subscriptionTier || data.user.subscription_tier,
          currentMonthLeads: data.user.currentMonthLeads || data.user.current_month_leads,
          monthlyLeadLimit: data.user.monthlyLeadLimit || data.user.monthly_lead_limit,
          isAdmin: data.user.isAdmin || data.user.is_admin,
          billingCycle: data.user.billingCycle || data.user.billing_cycle,
          createdAt: data.user.createdAt || data.user.created_at,
          // Keep original properties as backup
          user_type: data.user.user_type,
          subscription_tier: data.user.subscription_tier,
          current_month_leads: data.user.current_month_leads,
          monthly_lead_limit: data.user.monthly_lead_limit,
          is_admin: data.user.is_admin
        };
        
        this.tierConfig = this.getTierConfig(this.user.subscriptionTier);
        
        console.log(`✅ Dashboard auth success: ${this.user.email} (${this.user.subscriptionTier})`);
        
        // Notify listeners
        this.notifyAuthListeners(true);
        
        // Update dashboard UI
        this.updateDashboardUI();
        
        return true;
      } else {
        this.handleAuthFailure();
        return false;
      }
    } catch (error) {
      console.error('🚫 Dashboard auth check failed:', error);
      this.handleAuthFailure();
      return false;
    } finally {
      this.checkingAuth = false;
    }
  }

  // 🚀 Enhanced auth check with tier verification on page load
  async checkAuthOnLoad() {
    // Quick check with non-httpOnly cookie first (performance optimization)
    const isLoggedIn = this.getCookie('isLoggedIn');
    
    if (!isLoggedIn) {
      console.log('❌ No login cookie found, redirecting...');
      this.redirectToLogin();
      return;
    }
    
    // Verify with server and get full user data
    const authSuccess = await this.checkAuth();
  }

  // 🎯 TIER VERIFICATION: Make sure user is on the right dashboard
  verifyTierAccess() {
    if (!this.user) return;
    
    const currentPath = window.location.pathname;
    const userTier = this.user.subscriptionTier;
    
    // Extract tier from URL: /dashboard/tiers/free/ -> 'free'
    const urlTierMatch = currentPath.match(/\/dashboard\/tiers\/([^\/]+)/);
    const urlTier = urlTierMatch ? urlTierMatch[1] : null;
    
    if (urlTier) {
      const expectedTier = this.getTierPath(userTier);
      
      if (urlTier !== expectedTier) {
        console.warn(`🔄 Tier mismatch: User is ${userTier} but on ${urlTier} dashboard`);
        console.log(`🎯 Redirecting to correct tier: ${expectedTier}`);
        window.location.href = '/dashboard'; // Server will route to correct tier
        return;
      }
    }
    
    console.log(`✅ Tier verification passed: ${userTier} user on ${urlTier} dashboard`);
  }

  // 🎯 Get tier folder path (matches your server logic)
  getTierPath(subscriptionTier) {
    const tierMap = {
      'FREE': 'free',
      'PROFESSIONAL': 'professional',
      'PROFESSIONAL_TRIAL': 'professional',
      'BUSINESS': 'business', 
      'ENTERPRISE': 'enterprise',
      'ADMIN': 'admin'
    };
    
    return tierMap[subscriptionTier] || 'free';
  }

  // ⚙️ Get tier configuration
  getTierConfig(subscriptionTier) {
    const configs = {
      'FREE': {
        name: 'Free',
        leadLimit: 50,
        features: ['basic_dashboard', 'add_leads', 'basic_settings', 'lead_management'],
        locked: ['analytics', 'insights', 'schedule', 'pipeline', 'activity', 'ai_scoring', 'automation'],
        color: '#10B981',
        upgradeMessage: 'Upgrade to Professional to unlock advanced features!'
      },
      'PROFESSIONAL': {
        name: 'Professional',
        leadLimit: 1000,
        features: ['analytics', 'insights', 'schedule', 'advanced_dashboard', 'export_data'],
        locked: ['pipeline', 'activity', 'ai_scoring', 'automation', 'team_features'],
        color: '#3B82F6',
        upgradeMessage: 'Upgrade to Business for AI features and automation!'
      },
      'PROFESSIONAL_TRIAL': {
        name: 'Professional Trial',
        leadLimit: 1000,
        features: ['analytics', 'insights', 'schedule', 'advanced_dashboard', 'export_data'],
        locked: ['pipeline', 'activity', 'ai_scoring', 'automation', 'team_features'],
        color: '#F59E0B',
        upgradeMessage: 'Your trial is active! Upgrade to keep these features.',
        isTrial: true
      },
      'BUSINESS': {
        name: 'Business',
        leadLimit: 10000,
        features: ['ai_scoring', 'automation', 'team_features', 'pipeline', 'activity'],
        locked: ['white_label', 'custom_integrations', 'dedicated_support'],
        color: '#8B5CF6',
        upgradeMessage: 'Upgrade to Enterprise for white-label and custom integrations!'
      },
      'ENTERPRISE': {
        name: 'Enterprise',
        leadLimit: 999999,
        features: ['white_label', 'custom_integrations', 'dedicated_support', 'unlimited_everything'],
        locked: [],
        color: '#EF4444',
        upgradeMessage: 'You have access to all features!'
      },
      'ADMIN': {
        name: 'Administrator',
        leadLimit: 999999,
        features: ['admin_panel', 'user_management', 'system_stats', 'unlimited_everything'],
        locked: [],
        color: '#DC2626',
        upgradeMessage: 'Admin access - all features unlocked!'
      }
    };
    
    return configs[subscriptionTier] || configs['FREE'];
  }

  // 🔑 Enhanced login (same as your original but with dashboard features)
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
        
        // 🔄 MAP BACKEND USER DATA
        this.user = {
          ...data.user,
          userType: data.user.userType || data.user.user_type,
          subscriptionTier: data.user.subscriptionTier || data.user.subscription_tier,
          currentMonthLeads: data.user.currentMonthLeads || data.user.current_month_leads,
          monthlyLeadLimit: data.user.monthlyLeadLimit || data.user.monthly_lead_limit,
          isAdmin: data.user.isAdmin || data.user.is_admin
        };
        
        this.tierConfig = this.getTierConfig(this.user.subscriptionTier);
        
        this.notifyAuthListeners(true);
        this.updateDashboardUI();
        
        // Redirect to appropriate dashboard
        window.location.href = '/dashboard';
        return { success: true, user: this.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('🚫 Dashboard login failed:', error);
      return { success: false, error: 'Login request failed' };
    }
  }

  // 🚪 Enhanced logout with dashboard cleanup
  async logout() {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('🚫 Logout request failed:', error);
    }
    
    // Clear dashboard state
    this.authenticated = false;
    this.user = null;
    this.tierConfig = null;
    
    this.notifyAuthListeners(false);
    
    // Redirect to login
    window.location.href = '/login';
  }

  // 🌐 ENHANCED: Dashboard-optimized API requests
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
      
      // Handle auth failures
      if (response.status === 401 || response.status === 403) {
        console.error('🚫 API auth failed, redirecting...');
        this.handleAuthFailure();
        throw new Error('Authentication required');
      }
      
      return response;
    } catch (error) {
      console.error('🚫 Dashboard API request failed:', error);
      throw error;
    }
  }

  // 🚨 Handle authentication failures
  handleAuthFailure() {
    this.authenticated = false;
    this.user = null;
    this.tierConfig = null;
    
    this.notifyAuthListeners(false);
    
    if (this.isDashboardPage()) {
      this.redirectToLogin();
    }
  }

  // 🔄 Redirect to login with return URL
  redirectToLogin() {
    if (window.location.pathname !== '/login') {
      const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirectUrl}`;
    }
  }

  // 🎨 ENHANCED: Dashboard UI updates with tier-specific styling
  updateDashboardUI() {
    if (!this.authenticated || !this.user) return;
    
    // Update user info displays
    this.updateUserElements();
    
    // Update tier-specific elements
    this.updateTierElements();
    
    // Update lead limit displays
    this.updateLeadLimitElements();
    
    // Handle admin elements
    this.updateAdminElements();
    
    // Show trial warnings if applicable
    this.showTrialWarnings();
    
    console.log('🎨 Dashboard UI updated for tier:', this.user.subscriptionTier);
  }

  // 👤 Update user information elements
  updateUserElements() {
    // Update email displays
    document.querySelectorAll('[data-user-email]').forEach(el => {
      el.textContent = this.user.email;
    });
    
    // Update user name displays
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = this.user.name || this.user.email.split('@')[0];
    });
  }

  // 🎯 Update tier-specific elements
  updateTierElements() {
    if (!this.tierConfig) return;
    
    // Update tier name displays
    document.querySelectorAll('[data-user-tier]').forEach(el => {
      el.textContent = this.tierConfig.name;
      el.style.color = this.tierConfig.color;
    });
    
    // Update subscription status
    document.querySelectorAll('[data-subscription-status]').forEach(el => {
      el.textContent = this.tierConfig.name;
      el.className = `subscription-${this.user.subscriptionTier.toLowerCase()}`;
    });
    
    // Handle locked features
    this.handleLockedFeatures();
  }

  // 🔒 Handle locked features based on tier
  handleLockedFeatures() {
    if (!this.tierConfig) return;
    
    this.tierConfig.locked.forEach(feature => {
      const elements = document.querySelectorAll(`[data-feature="${feature}"]`);
      elements.forEach(el => {
        el.classList.add('feature-locked');
        el.setAttribute('data-upgrade-message', this.tierConfig.upgradeMessage);
        
        // Add click handler for upgrade prompts
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.showUpgradeModal(feature);
        });
      });
    });
  }

  // 📊 Update lead limit elements
  updateLeadLimitElements() {
    const limitInfo = this.getLeadLimitInfo();
    if (!limitInfo) return;
    
    document.querySelectorAll('[data-lead-limit]').forEach(el => {
      if (limitInfo.isUnlimited) {
        el.textContent = `${limitInfo.current}/∞`;
      } else {
        el.textContent = `${limitInfo.current}/${limitInfo.limit}`;
        
        // Add warning styling if close to limit
        if (limitInfo.percentage > 80) {
          el.classList.add('limit-warning');
        }
        if (limitInfo.percentage >= 100) {
          el.classList.add('limit-exceeded');
        }
      }
    });
    
    // Update progress bars
    document.querySelectorAll('[data-lead-progress]').forEach(el => {
      const percentage = Math.min(limitInfo.percentage, 100);
      el.style.width = `${percentage}%`;
      
      if (percentage > 80) el.classList.add('bg-red-500');
      else if (percentage > 60) el.classList.add('bg-yellow-500');
      else el.classList.add('bg-green-500');
    });
  }

  // 👑 Update admin-only elements
  updateAdminElements() {
    if (this.user && this.user.isAdmin) {
      document.querySelectorAll('[data-admin-only]').forEach(el => {
        el.style.display = 'block';
      });
    }
  }

  // ⏰ Show trial warnings
  showTrialWarnings() {
    const trialStatus = this.getTrialStatus();
    
    if (trialStatus && trialStatus.isExpiringSoon && !trialStatus.isExpired) {
      this.showNotification(
        `⏰ Trial expires in ${trialStatus.daysRemaining} day(s)! Upgrade to keep your features.`,
        'warning',
        10000
      );
    }
    
    if (trialStatus && trialStatus.isExpired) {
      this.showNotification(
        '🚨 Your trial has expired. Some features may be limited.',
        'error',
        15000
      );
    }
  }

  // 🔐 Permission checking - UPDATED FOR BACKEND COMPATIBILITY
  hasPermission(requiredLevel) {
    if (!this.authenticated || !this.user) return false;
    
    const levels = {
      'free': 1,
      'professional': 2,
      'business': 3,
      'enterprise': 4,
      'admin': 5
    };
    
    // 🔄 HANDLE BACKEND USER_TYPE FORMAT
    const userType = this.user.userType || this.user.user_type || 'free';
    const baseType = userType.split('_')[0]; // handles 'professional_trial' -> 'professional'
    
    const userLevel = levels[baseType] || 0;
    const required = levels[requiredLevel] || 0;
    
    return userLevel >= required;
  }

  // 🔓 Check if feature is unlocked
  hasFeature(featureName) {
    if (!this.tierConfig) return false;
    return this.tierConfig.features.includes(featureName);
  }

  // 📊 Get lead limit information - UPDATED FOR BACKEND COMPATIBILITY
  getLeadLimitInfo() {
    if (!this.user) return null;
    
    const current = this.user.currentMonthLeads || this.user.current_month_leads || 0;
    const limit = this.user.monthlyLeadLimit || this.user.monthly_lead_limit || 0;
    
    return {
      current,
      limit,
      percentage: limit > 0 ? (current / limit) * 100 : 0,
      remaining: Math.max(0, limit - current),
      canAddMore: current < limit || limit >= 999999,
      isUnlimited: limit >= 999999
    };
  }

  // ⏰ Get trial status - UPDATED FOR BACKEND COMPATIBILITY
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

  // 🍪 Get cookie value
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // 📱 Show enhanced notification system
  showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.dashboard-notification');
    existing.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `dashboard-notification dashboard-notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      color: white;
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      backdrop-filter: blur(10px);
    `;
    
    const colors = {
      success: 'linear-gradient(135deg, #10B981, #059669)',
      error: 'linear-gradient(135deg, #EF4444, #DC2626)',
      warning: 'linear-gradient(135deg, #F59E0B, #D97706)',
      info: 'linear-gradient(135deg, #3B82F6, #2563EB)'
    };
    notification.style.background = colors[type] || colors.info;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.transform = 'translateX(0)', 10);
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  // 🚀 Show upgrade modal
  showUpgradeModal(feature) {
    const modal = document.createElement('div');
    modal.className = 'upgrade-modal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20000;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 32px; border-radius: 12px; max-width: 500px; margin: 20px;">
        <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #1F2937;">
          🔒 Feature Locked
        </h3>
        <p style="color: #6B7280; margin-bottom: 24px;">
          The "${feature}" feature is not available in your current plan.
        </p>
        <p style="color: #374151; margin-bottom: 24px;">
          ${this.tierConfig.upgradeMessage}
        </p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="close-modal" style="padding: 8px 16px; border: 1px solid #D1D5DB; background: white; border-radius: 6px; cursor: pointer;">
            Maybe Later
          </button>
          <button class="upgrade-btn" style="padding: 8px 24px; background: #3B82F6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Upgrade Now
          </button>
        </div>
      </div>
    `;
    
    modal.querySelector('.close-modal').onclick = () => modal.remove();
    modal.querySelector('.upgrade-btn').onclick = () => {
      window.location.href = '/pricing';
    };
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
  }

  // 📡 Auth event listeners
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

  // 🎛️ Setup event listeners
  setupEventListeners() {
    // Auto-logout buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-logout], #logoutBtn, .logout-btn')) {
        e.preventDefault();
        this.logout();
      }
    });
    
    // Hide auth-required elements if not authenticated
    document.addEventListener('DOMContentLoaded', () => {
      if (!this.authenticated) {
        document.querySelectorAll('[data-require-auth]').forEach(el => {
          el.style.display = 'none';
        });
      }
    });
  }

  // 🔍 Debug info
  getDebugInfo() {
    return {
      authenticated: this.authenticated,
      user: this.user,
      tierConfig: this.tierConfig,
      isLoggedInCookie: this.getCookie('isLoggedIn'),
      currentPath: window.location.pathname,
      isDashboardPage: this.isDashboardPage(),
      permissions: this.user ? {
        hasAdminAccess: this.hasPermission('admin'),
        hasBusinessAccess: this.hasPermission('business'),
        hasProfessionalAccess: this.hasPermission('professional')
      } : null,
      leadLimitInfo: this.getLeadLimitInfo(),
      trialStatus: this.getTrialStatus(),
      availableFeatures: this.tierConfig ? this.tierConfig.features : [],
      lockedFeatures: this.tierConfig ? this.tierConfig.locked : []
    };
  }
}

// 🌍 Create global dashboard auth instance
window.authManager = new DashboardAuthManager();

// 💬 Debug helper
window.dashboardAuthDebug = () => {
  console.table(window.authManager.getDebugInfo());
};

console.log('🔐 Dashboard Auth Manager loaded and ready! 🚀');