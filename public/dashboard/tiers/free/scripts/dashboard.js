const Dashboard = () => {
  const { useState, useEffect } = React;
  
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState({ all: [], cold: [], warm: [], crm: [] });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    
    // Update time every minute for that live feel
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileDropdown]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      window.playSound?.('click');
      
      // Get user data
      const currentUser = window.AuthAPI?.getCurrentUser();
      setUser(currentUser);
      
      // Get leads data
      const leadsResponse = await window.LeadsAPI?.getLeads();
      if (leadsResponse?.success) {
        setLeads(leadsResponse.data);
      }
      
      // Get stats
      const statsResponse = await window.LeadsAPI?.getStatistics();
      if (statsResponse?.success) {
        setStats(statsResponse.data);
      }
      
      window.playSound?.('success');
      
    } catch (error) {
      console.error('Dashboard load error:', error);
      window.showToast?.('Failed to load dashboard data', 'error');
      window.playSound?.('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    window.playSound?.('click');
    window.FreeTierUtils?.showUpgradePrompt('dashboard');
  };

  const handleAddLead = () => {
    window.playSound?.('click');
    window.showToast?.('🚀 AddLead component loading soon!', 'info');
  };

  const handleSettingsClick = () => {
    window.playSound?.('click');
    window.showToast?.('⚙️ Settings component loading soon!', 'info');
    setShowProfileDropdown(false);
  };

  const handleLogout = () => {
    window.playSound?.('click');
    window.AuthAPI?.logout();
  };

  // Generate dynamic user color based on email
  const getUserColor = (email) => {
    if (!email) return 'from-indigo-500 to-purple-600';
    
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500', 
      'from-green-500 to-emerald-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-500',
      'from-red-500 to-pink-500',
      'from-yellow-500 to-orange-500',
      'from-teal-500 to-cyan-500',
      'from-orange-500 to-red-500',
      'from-violet-500 to-purple-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const leadCount = leads?.all?.length || 0;
  const leadLimit = user?.monthlyLeadLimit || 50;
  const progressPercentage = Math.min((leadCount / leadLimit) * 100, 100);
  
  // Weekly leads calculation
  const weeklyLeads = leads?.all?.filter(lead => {
    const leadDate = new Date(lead.created_at);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return leadDate > weekAgo;
  })?.length || 0;

  // Monthly growth calculation
  const monthlyLeads = leads?.all?.filter(lead => {
    const leadDate = new Date(lead.created_at);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return leadDate > monthAgo;
  })?.length || 0;

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '🌅 Good morning';
    if (hour < 17) return '☀️ Good afternoon';
    return '🌙 Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading your universe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Ultra-clean Header with glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-white/20 dark:border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  SteadyManager
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    FREE
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Center Progress - iOS style */}
            <div className="hidden lg:flex items-center space-x-6 flex-1 max-w-md mx-12">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {leadCount} of {leadLimit} leads
                  </span>
                  <span className="text-xs font-medium text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
                      progressPercentage > 80 
                        ? 'bg-gradient-to-r from-orange-400 via-red-500 to-red-600' 
                        : progressPercentage > 60
                        ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600'
                        : 'bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600'
                    } shadow-lg`}
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              {/* Upgrade Button - Premium glass design */}
              <button
                onClick={handleUpgradeClick}
                className="relative group overflow-hidden bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16L3 14l5.5-5.5L12 12l3.5-3.5L21 14l-2 2-5.5-5.5L12 8l-1.5 1.5L5 16z"/>
                  </svg>
                  <span>Upgrade</span>
                  <svg className="w-4 h-4 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400 to-red-500 blur-xl opacity-40 -z-10 group-hover:opacity-60 transition-opacity"></div>
              </button>

              {/* Profile Button */}
              <div className="relative profile-dropdown">
                <button
                  onClick={() => {
                    setShowProfileDropdown(!showProfileDropdown);
                    window.playSound?.('click');
                  }}
                  className={`w-12 h-12 bg-gradient-to-br ${getUserColor(user?.email)} rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ring-4 ring-white/20`}
                >
                  {user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </button>

                {/* Profile Dropdown - Apple-style */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-4 w-80 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 py-4 z-50 transform animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Profile Header */}
                    <div className="px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
                      <div className="flex items-center space-x-4">
                        <div className={`w-16 h-16 bg-gradient-to-br ${getUserColor(user?.email)} rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg`}>
                          {user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                            {user?.email?.split('@')[0] || 'User'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {user?.email || 'user@example.com'}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              FREE TIER
                            </span>
                            <span className="text-xs text-gray-500">
                              {leadCount}/{leadLimit} leads
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="p-3 space-y-2">
                      <button
                        onClick={handleSettingsClick}
                        className="w-full text-left px-4 py-4 text-gray-800 dark:text-gray-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-blue-500 hover:text-white transform hover:scale-105 transition-all duration-200 flex items-center space-x-4 rounded-2xl group"
                      >
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 group-hover:bg-white/20 rounded-xl flex items-center justify-center transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <span className="font-semibold">Settings</span>
                          <p className="text-xs opacity-70">Customize your experience</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={handleUpgradeClick}
                        className="w-full text-left px-4 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 hover:from-yellow-400 hover:to-orange-500 hover:text-white transform hover:scale-105 transition-all duration-200 flex items-center space-x-4 rounded-2xl group border-2 border-yellow-200 dark:border-yellow-700"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center transition-all">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 16L3 14l5.5-5.5L12 12l3.5-3.5L21 14l-2 2-5.5-5.5L12 8l-1.5 1.5L5 16z"/>
                          </svg>
                        </div>
                        <div>
                          <span className="font-semibold text-yellow-800 dark:text-yellow-200 group-hover:text-white">Upgrade to Pro</span>
                          <p className="text-xs text-yellow-600 dark:text-yellow-300 group-hover:text-white/80">Unlock 1,000 leads + advanced features</p>
                        </div>
                        <svg className="w-5 h-5 ml-auto text-yellow-500 group-hover:text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </button>
                      
                      <div className="border-t border-gray-200/30 dark:border-gray-700/30 pt-2 mt-4">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-4 text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-500 hover:text-white transform hover:scale-105 transition-all duration-200 flex items-center space-x-4 rounded-2xl group"
                        >
                          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 group-hover:bg-white/20 rounded-xl flex items-center justify-center transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </div>
                          <span className="font-semibold">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Hero Welcome Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-4">
            <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
              {getGreeting()}, {user?.email?.split('@')[0] || 'Explorer'}!
            </h1>
            <div className="animate-bounce">
              {currentTime.getHours() < 12 ? '🌅' : currentTime.getHours() < 17 ? '☀️' : '🌙'}
            </div>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
            Ready to dominate your pipeline? You have <span className="font-bold text-blue-600 dark:text-blue-400">{leadLimit - leadCount} slots</span> remaining in your FREE tier.
          </p>
        </div>

        {/* Hero Action Cards - Apple Weather Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Add Lead Card */}
          <div 
            onClick={handleAddLead}
            className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 rounded-3xl p-8 text-white cursor-pointer transform hover:scale-105 transition-all duration-500 shadow-2xl hover:shadow-blue-500/25 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:rotate-12">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <svg className="w-6 h-6 opacity-60 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Add New Lead</h3>
              <p className="text-blue-100 text-lg">Capture your next big opportunity</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700"></div>
          </div>

          {/* Analytics Preview Card */}
          <div 
            onClick={() => {
              window.playSound?.('click');
              window.FreeTierUtils?.showUpgradePrompt('analytics');
            }}
            className="group relative bg-gradient-to-br from-purple-500/80 via-pink-500/80 to-red-500/80 rounded-3xl p-8 text-white cursor-pointer transform hover:scale-105 transition-all duration-500 shadow-2xl hover:shadow-purple-500/25 overflow-hidden"
          >
            <div className="absolute inset-0 backdrop-blur-sm bg-white/10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <svg className="w-6 h-6 opacity-70 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Analytics Dashboard</h3>
              <p className="text-purple-100 text-lg">Unlock conversion insights & trends</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-pink-400 group-hover:h-2 transition-all duration-300"></div>
          </div>

          {/* Schedule & Track Card */}
          <div 
            onClick={() => {
              window.playSound?.('click');
              window.FreeTierUtils?.showUpgradePrompt('scheduling');
            }}
            className="group relative bg-gradient-to-br from-emerald-500/80 via-teal-500/80 to-cyan-500/80 rounded-3xl p-8 text-white cursor-pointer transform hover:scale-105 transition-all duration-500 shadow-2xl hover:shadow-emerald-500/25 overflow-hidden"
          >
            <div className="absolute inset-0 backdrop-blur-sm bg-white/10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <svg className="w-6 h-6 opacity-70 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Smart Scheduling</h3>
              <p className="text-emerald-100 text-lg">Never miss a follow-up again</p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Grid - Apple Health Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Leads */}
          <div className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-gray-700/30 hover:shadow-2xl hover:shadow-blue-500/10 transform hover:-translate-y-2 transition-all duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                  {leadCount}
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                  of {leadLimit}
                </div>
              </div>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Total Leads</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-blue-600 dark:text-blue-400">{leadLimit - leadCount}</span> slots remaining
            </p>
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Weekly Growth */}
          <div className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-gray-700/30 hover:shadow-2xl hover:shadow-green-500/10 transform hover:-translate-y-2 transition-all duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                  {weeklyLeads}
                </div>
                <div className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
                  this week
                </div>
              </div>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Weekly Growth</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {weeklyLeads > 5 ? '🔥 On fire!' : weeklyLeads > 0 ? '📈 Building momentum' : '💪 Time to hustle!'}
            </p>
          </div>

          {/* Monthly Performance */}
          <div className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-gray-700/30 hover:shadow-2xl hover:shadow-purple-500/10 transform hover:-translate-y-2 transition-all duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                  {monthlyLeads}
                </div>
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-1">
                  this month
                </div>
              </div>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Monthly Stats</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {monthlyLeads > 20 ? '🚀 Crushing it!' : monthlyLeads > 10 ? '⭐ Solid progress' : '🎯 Room to grow'}
            </p>
          </div>

          {/* Goal Tracking Teaser */}
          <div 
            onClick={() => {
              window.playSound?.('click');
              window.FreeTierUtils?.showUpgradePrompt('goals');
            }}
            className="group bg-gradient-to-br from-yellow-400/20 via-orange-500/20 to-red-500/20 backdrop-blur-xl rounded-3xl p-6 border-2 border-yellow-300/50 dark:border-yellow-600/50 cursor-pointer transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 group-hover:from-yellow-400/20 group-hover:to-orange-500/20 transition-all duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-yellow-500/25 transition-all duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 opacity-70 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Smart Goals</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                Unlock intelligent goal tracking ✨
              </p>
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full translate-x-10 translate-y-10 group-hover:scale-150 transition-transform duration-500"></div>
          </div>
        </div>

        {/* Recent Leads Section */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pipeline Overview</h3>
                <p className="text-gray-600 dark:text-gray-400">Your lead activity at a glance</p>
              </div>
              {leadCount > 0 && (
                <button 
                  onClick={() => window.showToast?.('Full pipeline view coming soon!', 'info')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  View All {leadCount}
                </button>
              )}
            </div>
          </div>

          {leadCount === 0 ? (
            // Epic Empty State
            <div className="p-16 text-center">
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/25 animate-pulse">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
              </div>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
                Your Empire Awaits! 👑
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-lg mx-auto">
                Every empire starts with a single lead. Ready to build yours?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <button
                  onClick={handleAddLead}
                  className="group bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center space-x-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Your First Lead</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </button>
                <button
                  onClick={handleUpgradeClick}
                  className="text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 font-semibold px-6 py-4 rounded-2xl hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-300"
                >
                  Or upgrade for 1,000 leads ✨
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                  <div className="text-2xl mb-2">⚡</div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Lightning Fast</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Add leads in seconds</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
                  <div className="text-2xl mb-2">🎯</div>
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">Smart Tracking</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">Never lose a prospect</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                  <div className="text-2xl mb-2">📈</div>
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">Grow Revenue</p>
                  <p className="text-xs text-green-700 dark:text-green-300">Convert more deals</p>
                </div>
              </div>
            </div>
          ) : (
            // Recent Leads List
            <div className="divide-y divide-gray-200/30 dark:divide-gray-700/30">
              {leads.all.slice(0, 6).map((lead, index) => (
                <div key={lead.id || index} className="p-6 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                        lead.type === 'warm' ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                        lead.type === 'crm' ? 'bg-gradient-to-br from-green-400 to-green-600' : 
                        'bg-gradient-to-br from-blue-400 to-blue-600'
                      }`}>
                        {lead.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {lead.name || 'Unknown Lead'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {lead.company || lead.email || 'No details available'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Added {window.SteadyUtils?.Date?.formatRelative(lead.created_at) || 'recently'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                        lead.type === 'warm' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                        lead.type === 'crm' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {lead.type || 'cold'}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        {lead.platform || 'Unknown source'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {leadCount > 6 && (
                <div className="p-6 text-center bg-gray-50/50 dark:bg-gray-700/30">
                  <button
                    onClick={() => window.showToast?.(`${leadCount - 6} more leads in your pipeline!`, 'info')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold text-sm"
                  >
                    View {leadCount - 6} more leads →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Growth CTA */}
        {leadCount > 30 && (
          <div className="mt-12 relative overflow-hidden bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 rounded-3xl p-8 text-center text-white shadow-2xl shadow-orange-500/25">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mr-4 animate-bounce">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <h3 className="text-3xl font-black">You're Absolutely Crushing It! 🔥</h3>
              </div>
              <p className="text-xl mb-6 opacity-90">
                <span className="font-bold">{leadCount} leads</span> and growing fast! Ready to scale to the next level?
              </p>
              <button
                onClick={handleUpgradeClick}
                className="bg-white text-orange-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Unlock 1,000 Leads + Pro Features ✨
              </button>
            </div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16 animate-pulse"></div>
          </div>
        )}
      </main>
    </div>
  );
};