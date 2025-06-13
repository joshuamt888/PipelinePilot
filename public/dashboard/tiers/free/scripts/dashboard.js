// 🚀 STEADYMANAGER FREE TIER DASHBOARD.JS - MODULAR CONTROLLER
// Philosophy: Smart controller that integrates with your beautiful modular architecture!

// 🎯 DASHBOARD CONTROLLER - Orchestrates your components
class DashboardController {
  constructor() {
    this.user = null;
    this.leads = { all: [], cold: [], warm: [], crm: [] };
    this.stats = {};
    this.loading = true;
    this.currentTime = new Date();
    this.dailyGoal = 3;
    this.weeklyStreak = 0;
    
    // UI State
    this.showProfileDropdown = false;
    
    // Initialize
    this.init();
    this.setupEventListeners();
    this.startTimers();
  }

  // 🔄 INITIALIZATION - Uses your modular system
  async init() {
    try {
      console.log('🚀 Dashboard Controller initializing...');
      
      // Check if your systems are loaded
      if (!this.checkDependencies()) {
        console.error('❌ Dependencies not loaded');
        return;
      }

      // Play startup sound using your utils
      window.SteadyUtils?.playSound('click');
      
      // Load dashboard data using your API
      await this.loadDashboardData();
      
      // Render the initial UI
      this.render();
      
      // Success sound
      window.SteadyUtils?.playSound('success');
      
      console.log('✅ Dashboard Controller ready!');
      
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      window.SteadyUtils?.playSound('error');
      window.SteadyUtils?.Toast?.error('Failed to load dashboard');
    }
  }

  // 🔍 CHECK DEPENDENCIES - Verify your modules are loaded
  checkDependencies() {
    const required = [
      'window.authManager',
      'window.SteadyUtils', 
      'window.LeadsAPI',
      'window.FreeTierUtils'
    ];
    
    const missing = required.filter(dep => {
      const parts = dep.split('.');
      let obj = window;
      for (let part of parts.slice(1)) {
        if (!obj[part]) return true;
        obj = obj[part];
      }
      return false;
    });
    
    if (missing.length > 0) {
      console.error('❌ Missing dependencies:', missing);
      return false;
    }
    
    return true;
  }

  // 📊 LOAD DATA - Uses your secure API system
  async loadDashboardData() {
    try {
      this.loading = true;
      this.updateLoadingState();
      
      // Get user data from your auth system
      this.user = window.authManager?.getCurrentUser();
      if (!this.user) {
        throw new Error('No authenticated user found');
      }
      
      // Get leads using your API
      const leadsResponse = await window.LeadsAPI?.getLeads();
      if (leadsResponse?.success) {
        this.leads = leadsResponse.data;
        this.calculateWeeklyStreak(this.leads.all);
      }
      
      // Get stats using your API
      const statsResponse = await window.LeadsAPI?.getStatistics();
      if (statsResponse?.success) {
        this.stats = statsResponse.data;
      }
      
      this.loading = false;
      
    } catch (error) {
      console.error('Data loading error:', error);
      this.loading = false;
      throw error;
    }
  }

  // 📈 CALCULATE STREAK - Business logic
  calculateWeeklyStreak(allLeads) {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayStart = new Date(checkDate.setHours(0, 0, 0, 0));
      const dayEnd = new Date(checkDate.setHours(23, 59, 59, 999));
      
      const hasLeadsThisDay = allLeads.some(lead => {
        const leadDate = new Date(lead.created_at);
        return leadDate >= dayStart && leadDate <= dayEnd;
      });
      
      if (hasLeadsThisDay) {
        streak++;
      } else if (i === 0) {
        break; // No leads today breaks the streak
      }
    }
    
    this.weeklyStreak = streak;
  }

  // 🎵 EVENT LISTENERS - Wire up your modular components
  setupEventListeners() {
    // Add Lead Button - Calls your AddLead.js
    document.addEventListener('click', (e) => {
      if (e.target.matches('.add-lead-btn, .add-lead-btn *')) {
        e.preventDefault();
        this.handleAddLead();
      }
    });

    // Settings Button - Calls your Settings.js  
    document.addEventListener('click', (e) => {
      if (e.target.matches('.settings-btn, .settings-btn *')) {
        e.preventDefault();
        this.handleSettings();
      }
    });

    // Upgrade Buttons - Uses your FreeTierUtils
    document.addEventListener('click', (e) => {
      if (e.target.matches('.upgrade-btn, .upgrade-btn *')) {
        e.preventDefault();
        const feature = e.target.dataset.feature || 'general';
        this.handleUpgrade(feature);
      }
    });

    // Profile Dropdown
    document.addEventListener('click', (e) => {
      if (e.target.matches('.profile-btn, .profile-btn *')) {
        e.preventDefault();
        this.toggleProfileDropdown();
      } else if (!e.target.closest('.profile-dropdown')) {
        this.showProfileDropdown = false;
        this.updateProfileDropdown();
      }
    });

    // Logout
    document.addEventListener('click', (e) => {
      if (e.target.matches('.logout-btn, .logout-btn *')) {
        e.preventDefault();
        this.handleLogout();
      }
    });

    // Refresh Data
    document.addEventListener('click', (e) => {
      if (e.target.matches('.refresh-btn, .refresh-btn *')) {
        e.preventDefault();
        this.refreshData();
      }
    });
  }

  // ⏰ TIMERS - Keep UI fresh
  startTimers() {
    // Update time every minute
    setInterval(() => {
      this.currentTime = new Date();
      this.updateTimeDisplay();
    }, 60000);

    // Check for upgrade hints based on usage
    setTimeout(() => {
      this.checkUpgradeHints();
    }, 30000);
  }

  // 🎯 ACTION HANDLERS - Call your modular components

  handleAddLead() {
    const leadCount = this.leads?.all?.length || 0;
    const leadLimit = this.user?.monthlyLeadLimit || 50;
    
    // Use your FreeTierUtils for limit checking
    if (!window.FreeTierUtils?.checkLeadLimit(leadCount, leadLimit)) {
      window.SteadyUtils?.playSound('error');
      return;
    }
    
    window.SteadyUtils?.playSound('click');
    
    // Call your AddLead.js component
    if (window.AddLeadComponent) {
      window.AddLeadComponent.show();
      window.SteadyUtils?.Toast?.info('🚀 Opening Add Lead form!');
    } else {
      console.error('❌ AddLeadComponent not found');
      window.SteadyUtils?.Toast?.error('Add Lead component not loaded');
    }
  }

  handleSettings() {
    window.SteadyUtils?.playSound('click');
    
    // Call your Settings.js component
    if (window.SettingsComponent) {
      window.SettingsComponent.show();
      this.showProfileDropdown = false;
      this.updateProfileDropdown();
      window.SteadyUtils?.Toast?.info('⚙️ Opening Settings panel!');
    } else {
      console.error('❌ SettingsComponent not found');
      window.SteadyUtils?.Toast?.error('Settings component not loaded');
    }
  }

  handleUpgrade(feature = 'general') {
    window.SteadyUtils?.playSound('click');
    
    // Use your FreeTierUtils for upgrade prompts
    if (window.FreeTierUtils) {
      window.FreeTierUtils.showUpgradePrompt(feature);
    } else {
      // Fallback to direct navigation
      window.location.href = '/login?tab=trial';
    }
  }

  handleLogout() {
    window.SteadyUtils?.playSound('click');
    
    // Use your auth system
    if (window.authManager) {
      window.authManager.logout();
    } else {
      // Fallback
      window.location.href = '/login';
    }
  }

  toggleProfileDropdown() {
    window.SteadyUtils?.playSound('click');
    this.showProfileDropdown = !this.showProfileDropdown;
    this.updateProfileDropdown();
  }

  async refreshData() {
    window.SteadyUtils?.playSound('click');
    window.SteadyUtils?.Toast?.info('🔄 Refreshing your empire data...');
    
    try {
      await this.loadDashboardData();
      this.render();
      window.SteadyUtils?.playSound('success');
      window.SteadyUtils?.Toast?.success('✅ Empire data updated!');
    } catch (error) {
      window.SteadyUtils?.playSound('error');
      window.SteadyUtils?.Toast?.error('Failed to refresh data');
    }
  }

  // 🎯 UPGRADE HINTS - Psychology-based prompts
  checkUpgradeHints() {
    const leadCount = this.leads?.all?.length || 0;
    
    if (leadCount > 25) {
      this.showUpgradeHint('power_user');
    } else if (leadCount > 40) {
      this.showUpgradeHint('almost_full');
    }
  }

  showUpgradeHint(feature) {
    window.SteadyUtils?.playSound('notification');
    
    // Use your FreeTierUtils for contextual hints
    if (window.FreeTierUtils) {
      window.FreeTierUtils.showUpgradeHint(feature);
    }
  }

  // 🎨 RENDER METHODS - Update DOM elements

  render() {
    this.updateLoadingState();
    this.updateHeader();
    this.updateStats();
    this.updateLeadsList();
    this.updateProfileDropdown();
    this.updateTimeDisplay();
  }

  updateLoadingState() {
    const loadingEl = document.getElementById('loading-state');
    const contentEl = document.getElementById('dashboard-content');
    
    if (this.loading) {
      loadingEl?.classList.remove('hidden');
      contentEl?.classList.add('hidden');
    } else {
      loadingEl?.classList.add('hidden');
      contentEl?.classList.remove('hidden');
    }
  }

  updateHeader() {
    // Update greeting
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      const greeting = this.getGreeting();
      const userName = this.user?.email?.split('@')[0] || 'Champion';
      greetingEl.textContent = `${greeting}, ${userName}!`;
    }

    // Update progress bar
    this.updateProgressBar();

    // Update streak badge
    const streakEl = document.getElementById('streak-badge');
    if (streakEl && this.weeklyStreak > 0) {
      streakEl.textContent = `🔥 ${this.weeklyStreak} day streak!`;
      streakEl.classList.remove('hidden');
    } else if (streakEl) {
      streakEl.classList.add('hidden');
    }
  }

  updateProgressBar() {
    const leadCount = this.leads?.all?.length || 0;
    const leadLimit = this.user?.monthlyLeadLimit || 50;
    const percentage = Math.min((leadCount / leadLimit) * 100, 100);

    // Update progress bar fill
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
      
      // Update color based on usage
      if (percentage > 80) {
        progressFill.className = 'progress-fill progress-danger';
      } else if (percentage > 60) {
        progressFill.className = 'progress-fill progress-warning';
      } else {
        progressFill.className = 'progress-fill progress-normal';
      }
    }

    // Update progress text
    const progressText = document.getElementById('progress-text');
    if (progressText) {
      progressText.textContent = `${leadCount} / ${leadLimit} leads`;
    }

    // Update remaining count
    const remainingEl = document.getElementById('remaining-count');
    if (remainingEl) {
      remainingEl.textContent = `${leadLimit - leadCount} slots left`;
    }

    // Show/hide warning
    const warningEl = document.getElementById('limit-warning');
    if (warningEl) {
      if (percentage > 80) {
        warningEl.classList.remove('hidden');
      } else {
        warningEl.classList.add('hidden');
      }
    }
  }

  updateStats() {
    // Total leads
    const totalEl = document.getElementById('total-leads');
    if (totalEl) {
      totalEl.textContent = this.leads?.all?.length || 0;
    }

    // Today's leads
    const todayLeads = this.getTodayLeads();
    const todayEl = document.getElementById('today-leads');
    if (todayEl) {
      todayEl.textContent = todayLeads;
    }

    // Weekly leads
    const weeklyLeads = this.getWeeklyLeads();
    const weeklyEl = document.getElementById('weekly-leads');
    if (weeklyEl) {
      weeklyEl.textContent = weeklyLeads;
    }

    // Streak
    const streakEl = document.getElementById('streak-count');
    if (streakEl) {
      streakEl.textContent = this.weeklyStreak;
    }
  }

  updateLeadsList() {
    const container = document.getElementById('leads-list');
    if (!container) return;

    const leadCount = this.leads?.all?.length || 0;

    if (leadCount === 0) {
      this.renderEmptyState(container);
    } else {
      this.renderLeadsList(container);
    }
  }

  renderEmptyState(container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <div class="empire-icon">⚡</div>
          <div class="crown">👑</div>
        </div>
        <h3>Your Empire Awaits, Conqueror! 🏰</h3>
        <p>Every empire starts with a single lead. Today, you begin your legendary conquest!</p>
        <button class="add-lead-btn btn-primary">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Launch Your Empire
        </button>
        <button class="upgrade-btn btn-secondary" data-feature="empty_state">
          Unlock 1,000 lead slots ✨
        </button>
      </div>
    `;
  }

  renderLeadsList(container) {
    const recentLeads = this.leads.all.slice(0, 6);
    const leadCount = this.leads.all.length;
    
    let html = '<div class="leads-grid">';
    
    recentLeads.forEach(lead => {
      const typeClass = lead.type === 'warm' ? 'warm' : lead.type === 'crm' ? 'crm' : 'cold';
      const initial = lead.name?.charAt(0)?.toUpperCase() || '?';
      const timeAgo = window.SteadyUtils?.Date?.formatRelative(lead.created_at) || 'recently';
      
      html += `
        <div class="lead-card ${typeClass}">
          <div class="lead-avatar">
            <span>${initial}</span>
            <div class="status-dot"></div>
          </div>
          <div class="lead-info">
            <h4>${lead.name || 'Mystery Lead'}</h4>
            <p class="company">${lead.company || lead.email || 'Awaiting intel...'}</p>
            <p class="time">Acquired ${timeAgo}</p>
          </div>
          <div class="lead-badge">
            <span class="type-badge ${typeClass}">${lead.type || 'cold'} lead</span>
            <p class="platform">📍 ${lead.platform || 'Unknown territory'}</p>
          </div>
        </div>
      `;
    });
    
    if (leadCount > 6) {
      html += `
        <div class="more-leads">
          <button class="view-more-btn">
            View ${leadCount - 6} more empire subjects →
          </button>
        </div>
      `;
    }
    
    html += '</div>';
    container.innerHTML = html;
  }

  updateProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (!dropdown) return;
    
    if (this.showProfileDropdown) {
      dropdown.classList.remove('hidden');
      dropdown.classList.add('show');
    } else {
      dropdown.classList.add('hidden');
      dropdown.classList.remove('show');
    }
  }

  updateTimeDisplay() {
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
      timeEl.textContent = this.currentTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  }

  // 🧮 UTILITY METHODS

  getGreeting() {
    const hour = this.currentTime.getHours();
    if (hour < 12) return '🌅 Good morning';
    if (hour < 17) return '☀️ Good afternoon';
    return '🌙 Good evening';
  }

  getTodayLeads() {
    return this.leads?.all?.filter(lead => {
      const leadDate = new Date(lead.created_at);
      const today = new Date();
      return leadDate.toDateString() === today.toDateString();
    })?.length || 0;
  }

  getWeeklyLeads() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.leads?.all?.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate > weekAgo;
    })?.length || 0;
  }

  getUserColor(email) {
    if (!email) return 'from-indigo-500 to-purple-600';
    
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500', 
      'from-green-500 to-emerald-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-500',
      'from-red-500 to-pink-500',
      'from-yellow-500 to-orange-500',
      'from-teal-500 to-cyan-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}

// 🎯 COMPONENT INTEGRATION HELPERS
// These help your AddLead.js and Settings.js integrate with the dashboard

window.DashboardAPI = {
  // Called by AddLead.js when a lead is successfully added
  onLeadAdded: (newLead) => {
    if (window.dashboardController) {
      console.log('🎯 New lead added, refreshing dashboard...');
      window.dashboardController.refreshData();
      window.SteadyUtils?.playSound('success');
      window.SteadyUtils?.Toast?.success(`🚀 ${newLead.name} added to your empire!`);
    }
  },

  // Called by Settings.js when settings are updated
  onSettingsUpdated: (newSettings) => {
    if (window.dashboardController) {
      console.log('⚙️ Settings updated, refreshing dashboard...');
      window.dashboardController.user = { ...window.dashboardController.user, ...newSettings };
      window.dashboardController.render();
      window.SteadyUtils?.playSound('success');
      window.SteadyUtils?.Toast?.success('⚙️ Settings updated successfully!');
    }
  },

  // Called by any component to refresh dashboard data
  refresh: () => {
    if (window.dashboardController) {
      window.dashboardController.refreshData();
    }
  },

  // Get current dashboard state (for other components)
  getState: () => {
    if (window.dashboardController) {
      return {
        user: window.dashboardController.user,
        leads: window.dashboardController.leads,
        stats: window.dashboardController.stats,
        loading: window.dashboardController.loading
      };
    }
    return null;
  }
};

// 🚀 INITIALIZE DASHBOARD CONTROLLER
function initializeDashboard() {
  console.log('🚀 Initializing Dashboard Controller...');
  
  // Check authentication using your auth system
  if (!window.authManager?.isAuthenticated()) {
    console.error('❌ User not authenticated! Redirecting to login...');
    window.location.href = '/login';
    return;
  }
  
  // Create global dashboard controller instance
  window.dashboardController = new DashboardController();
  
  console.log('✅ Dashboard Controller initialized!');
}

// 🔥 AUTO-INITIALIZE
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

// 💫 CONSOLE MESSAGE
console.log(`
🚀 ====================================================
   ____ ___  _   _ _____ ____   ___  _     _     _____ ____  
  / ___/ _ \\| \\ | |_   _|  _ \\ / _ \\| |   | |   | ____|  _ \\ 
 | |  | | | |  \\| | | | | |_) | | | | |   | |   |  _| | |_) |
 | |__| |_| | |\\  | | | |  _ <| |_| | |___| |___| |___|  _ < 
  \\____\\___/|_| \\_| |_| |_| \\_\\\\___/|_____|_____|_____|_| \\_\\
                                                            
    MODULAR DASHBOARD CONTROLLER! 🎯
🚀 ====================================================

✅ PERFECT INTEGRATION:
   🔐 Uses window.authManager for auth
   🎵 Uses window.SteadyUtils for sounds/toasts  
   📡 Uses window.LeadsAPI for data
   🎯 Uses window.FreeTierUtils for upgrades
   🧩 Calls window.AddLeadComponent.show()
   ⚙️ Calls window.SettingsComponent.show()

🎯 COMPONENT COMMUNICATION:
   📤 window.DashboardAPI.onLeadAdded()
   ⚙️ window.DashboardAPI.onSettingsUpdated()
   🔄 window.DashboardAPI.refresh()
   📊 window.DashboardAPI.getState()

🔥 READY FOR YOUR MODULAR ARCHITECTURE! 💪
`);

console.log('🎯 Modular Dashboard Controller loaded - Ready to orchestrate! 🔥');