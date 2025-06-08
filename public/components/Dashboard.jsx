const { useState, useEffect } = React;

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState({ all: [], cold: [], warm: [], crm: [] });
  const [stats, setStats] = useState({});
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Get token from localStorage
  const getToken = () => localStorage.getItem('token');

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/settings', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
    return null;
  };

  // Fetch leads
  const fetchLeads = async (viewAll = false) => {
    try {
      const url = viewAll ? '/api/leads?viewAll=true' : '/api/leads';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const leadsData = await response.json();
        setLeads(leadsData);
        return leadsData;
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
    return { all: [], cold: [], warm: [], crm: [] };
  };

  // Fetch statistics
  const fetchStats = async (viewAll = false) => {
    try {
      const url = viewAll ? '/api/statistics?viewAll=true' : '/api/statistics';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
        return statsData;
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
    return {};
  };

  // Fetch admin stats
  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const adminData = await response.json();
        setAdminStats(adminData);
        return adminData;
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    }
    return null;
  };

  // Initialize dashboard
  useEffect(() => {
    const initDashboard = async () => {
      setLoading(true);
      const userData = await fetchUserData();
      if (userData) {
        const isAdmin = userData.isAdmin;
        const leadsData = await fetchLeads(isAdmin);
        await fetchStats(isAdmin);
        
        if (isAdmin) {
          await fetchAdminStats();
        }

        // Check if first time user
        const isFirstTime = leadsData.all.length === 0 && !userData.settings?.hasCompletedOnboarding;
        setShowOnboarding(isFirstTime);

        // Generate alerts
        generateAlerts(userData, leadsData);
      }
      setLoading(false);
    };

    initDashboard();
  }, []);

  // Generate smart alerts
  const generateAlerts = (userData, leadsData) => {
    const newAlerts = [];

    // Trial expiring alert
    if (userData.userType === 'client_v1_trial' && userData.settings?.trialEndDate) {
      const trialEnd = new Date(userData.settings.trialEndDate);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 3 && daysLeft > 0) {
        newAlerts.push({
          type: 'warning',
          icon: '⏰',
          title: `Trial expires in ${daysLeft} days!`,
          message: 'Upgrade now to keep your 1,000 lead limit and advanced features.',
          action: 'Upgrade Now',
          actionUrl: '/pricing'
        });
      } else if (daysLeft <= 0) {
        newAlerts.push({
          type: 'error',
          icon: '🚨',
          title: 'Trial has expired!',
          message: 'You\'ve been downgraded to 100 leads/month. Upgrade to restore full access.',
          action: 'Upgrade Now',
          actionUrl: '/pricing'
        });
      }
    }

    // Lead limit warning
    if (userData.currentMonthLeads >= userData.monthlyLeadLimit * 0.8) {
      const percentage = Math.round((userData.currentMonthLeads / userData.monthlyLeadLimit) * 100);
      newAlerts.push({
        type: percentage >= 100 ? 'error' : 'warning',
        icon: '🎯',
        title: `${percentage}% of monthly leads used`,
        message: `You've used ${userData.currentMonthLeads}/${userData.monthlyLeadLimit} leads this month.`,
        action: userData.userType === 'client_v1' ? 'Upgrade' : 'Manage',
        actionUrl: userData.userType === 'client_v1' ? '/pricing' : '/settings'
      });
    }

    // Downgrade notification
    if (userData.settings?.downgradedFromTrial) {
      newAlerts.push({
        type: 'info',
        icon: '📉',
        title: 'Welcome back to Free tier',
        message: 'Your trial ended. Upgrade anytime to unlock 1,000 leads/month and pro features.',
        action: 'See Plans',
        actionUrl: '/pricing'
      });
    }

    setAlerts(newAlerts);
  };

  // Helper functions
  const getUserExperience = () => {
    if (!user) return 'FREE';
    if (user.isAdmin) return 'ADMIN';
    if (user.userType === 'client_v1_pro') return 'PRO';
    if (user.userType === 'client_v1_trial') return 'TRIAL';
    return 'FREE';
  };

  const getSubscriptionTier = () => {
    return user?.settings?.subscriptionTier || 
           (user?.userType === 'client_v1_pro' ? 'V1_PRO' : 
            user?.userType === 'admin' ? 'ADMIN' : 'FREE');
  };

  const openBillingPortal = async () => {
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: { hasCompletedOnboarding: true }
        })
      });
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-4">Please log in to access your dashboard.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const experience = getUserExperience();
  const subscriptionTier = getSubscriptionTier();

  // First Time User Experience
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🎉 Welcome to SteadyLeadFlow!
            </h1>
            <p className="text-xl text-gray-600">
              {user.settings?.name ? `Hey ${user.settings.name}! ` : ''}
              Let's turn your prospects into profit!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-xl">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-semibold mb-2">Add Your First Lead</h3>
              <p className="text-gray-600 text-sm">Start building your empire, one lead at a time</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-xl">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold mb-2">Set Your Goals</h3>
              <p className="text-gray-600 text-sm">Track progress with daily, weekly & monthly targets</p>
            </div>
            <div className="bg-green-50 p-6 rounded-xl">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">Watch It Grow</h3>
              <p className="text-gray-600 text-sm">Visualize your pipeline and close more deals</p>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/add-lead'}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
            >
              🚀 Add My First Lead
            </button>
            <button 
              onClick={completeOnboarding}
              className="w-full bg-gray-100 text-gray-600 py-3 px-8 rounded-xl hover:bg-gray-200 transition-colors"
            >
              I'll explore on my own
            </button>
          </div>

          {subscriptionTier === 'V1_TRIAL' && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                🎁 You're on a 14-day Pro trial with access to 1,000 leads/month!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (experience === 'ADMIN') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Admin Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">👑 Admin Command Center</h1>
                <p className="text-purple-100">System overview and management</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{adminStats?.users?.total || 0}</div>
                <div className="text-purple-200">Total Users</div>
              </div>
            </div>
          </div>

          {/* Admin Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center">
                <div className="text-3xl mr-4">👥</div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{adminStats?.users?.clients || 0}</div>
                  <div className="text-gray-600">Client Users</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center">
                <div className="text-3xl mr-4">💰</div>
                <div>
                  <div className="text-2xl font-bold text-green-600">${adminStats?.revenue?.monthly || 0}</div>
                  <div className="text-gray-600">Monthly Revenue</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center">
                <div className="text-3xl mr-4">📊</div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{adminStats?.leads?.total || 0}</div>
                  <div className="text-gray-600">Total Leads</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center">
                <div className="text-3xl mr-4">🚀</div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.totalLeads || 0}</div>
                  <div className="text-gray-600">My Leads</div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-4">🔧 System Management</h3>
              <div className="space-y-3">
                <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors text-left">
                  👥 View All Users
                </button>
                <button 
                  onClick={() => fetchLeads(true)}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-left"
                >
                  📊 View All Leads ({stats.isAdminView ? 'System View' : 'My View'})
                </button>
                <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors text-left">
                  💳 Billing Overview
                </button>
                <button className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors text-left">
                  🔍 Audit Logs
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-4">📈 Recent Activity</h3>
              <div className="space-y-3">
                {adminStats?.recentUsers?.slice(0, 5).map((recentUser, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{recentUser.email}</div>
                      <div className="text-sm text-gray-600">{recentUser.user_type}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(recentUser.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )) || <p className="text-gray-500">No recent activity</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard for Pro/Trial/Free Users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-4 mb-8">
            {alerts.map((alert, index) => (
              <div key={index} className={`rounded-xl p-4 flex items-center justify-between ${
                alert.type === 'error' ? 'bg-red-50 border border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{alert.icon}</span>
                  <div>
                    <div className="font-semibold">{alert.title}</div>
                    <div className="text-sm text-gray-600">{alert.message}</div>
                  </div>
                </div>
                {alert.action && (
                  <button 
                    onClick={() => window.location.href = alert.actionUrl}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      alert.type === 'error' ? 'bg-red-600 text-white hover:bg-red-700' :
                      alert.type === 'warning' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                      'bg-blue-600 text-white hover:bg-blue-700'
                    } transition-colors`}
                  >
                    {alert.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hero Section */}
        <div className={`rounded-2xl p-8 mb-8 text-white ${
          experience === 'PRO' ? 'bg-gradient-to-r from-blue-600 to-purple-600' :
          experience === 'TRIAL' ? 'bg-gradient-to-r from-green-600 to-blue-600' :
          'bg-gradient-to-r from-gray-600 to-blue-600'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {experience === 'PRO' ? '🚀 ' : experience === 'TRIAL' ? '🎁 ' : '👋 '}
                Welcome back{user.settings?.name ? `, ${user.settings.name}` : ''}!
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  experience === 'PRO' ? 'bg-white bg-opacity-20' :
                  experience === 'TRIAL' ? 'bg-yellow-400 text-yellow-900' :
                  'bg-white bg-opacity-20'
                }`}>
                  {experience === 'PRO' ? '🚀 V1 Pro Member' :
                   experience === 'TRIAL' ? '🎁 Pro Trial' :
                   '🆓 Free Member'}
                </span>
                {experience === 'TRIAL' && user.settings?.trialEndDate && (
                  <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                    ⏰ {Math.ceil((new Date(user.settings.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24))} days left
                  </span>
                )}
              </div>
            </div>
            {(experience === 'PRO' || experience === 'TRIAL') && (
              <button 
                onClick={openBillingPortal}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all"
              >
                💳 Manage Billing
              </button>
            )}
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.totalLeads || 0}</div>
              <div className="text-sm opacity-80">Total Leads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.warmLeads || 0}</div>
              <div className="text-sm opacity-80">Warm Leads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">${stats.totalPotentialValue || 0}</div>
              <div className="text-sm opacity-80">Potential Value</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                {user.currentMonthLeads || 0}/{user.monthlyLeadLimit || 0}
              </div>
              <div className="text-sm opacity-80">Monthly Usage</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Charts & Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">⚡ Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => window.location.href = '/add-lead'}
                  className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">➕</div>
                  <div className="text-sm font-medium">Add Lead</div>
                </button>
                <button 
                  onClick={() => window.location.href = '/pipeline'}
                  className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium">Pipeline</div>
                </button>
                <button 
                  onClick={() => window.location.href = '/schedule'}
                  className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">📅</div>
                  <div className="text-sm font-medium">Schedule</div>
                </button>
                <button 
                  onClick={() => window.location.href = '/settings'}
                  className="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">⚙️</div>
                  <div className="text-sm font-medium">Settings</div>
                </button>
              </div>
            </div>

            {/* Lead Type Breakdown */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">📊 Lead Breakdown</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.coldLeads || 0}</div>
                  <div className="text-sm text-gray-600">❄️ Cold Leads</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.warmLeads || 0}</div>
                  <div className="text-sm text-gray-600">🔥 Warm Leads</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.crmLeads || 0}</div>
                  <div className="text-sm text-gray-600">💼 CRM Leads</div>
                </div>
              </div>
            </div>

            {/* Platform Stats */}
            {stats.platformStats && Object.keys(stats.platformStats).length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4">📱 Platform Performance</h2>
                <div className="space-y-3">
                  {Object.entries(stats.platformStats).map(([platform, count]) => (
                    <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{platform}</span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {count} leads
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Goals & Progress */}
          <div className="space-y-6">
            {/* Goals Progress */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">🎯 Goal Progress</h2>
              <div className="space-y-4">
                {user.goals && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Daily Goal</span>
                        <span>{stats.todayLeads || 0}/{user.goals.daily}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(((stats.todayLeads || 0) / user.goals.daily) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Weekly Goal</span>
                        <span>{stats.weekLeads || 0}/{user.goals.weekly}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(((stats.weekLeads || 0) / user.goals.weekly) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Monthly Goal</span>
                        <span>{user.currentMonthLeads || 0}/{user.goals.monthly}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(((user.currentMonthLeads || 0) / user.goals.monthly) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Monthly Limit Progress */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">📈 Monthly Limit</h2>
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - (user.currentMonthLeads || 0) / (user.monthlyLeadLimit || 1))}`}
                      className={`transition-all duration-500 ${
                        (user.currentMonthLeads || 0) / (user.monthlyLeadLimit || 1) >= 0.9 ? 'text-red-500' :
                        (user.currentMonthLeads || 0) / (user.monthlyLeadLimit || 1) >= 0.7 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {Math.round(((user.currentMonthLeads || 0) / (user.monthlyLeadLimit || 1)) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {user.currentMonthLeads || 0} / {user.monthlyLeadLimit || 0}
                </div>
                <div className="text-gray-600 text-sm mb-4">Leads this month</div>
                {experience === 'FREE' && (user.currentMonthLeads || 0) >= (user.monthlyLeadLimit || 0) * 0.8 && (
                  <button 
                    onClick={() => window.location.href = '/pricing'}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
                  >
                    🚀 Upgrade to 1,000 leads
                  </button>
                )}
              </div>
            </div>

            {/* Recent Leads */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">🔥 Recent Leads</h2>
                <button 
                  onClick={() => window.location.href = '/pipeline'}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {leads.all.slice(0, 5).map((lead, index) => (
                  <div key={lead.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{lead.name}</div>
                      <div className="text-xs text-gray-600">
                        {lead.company && `${lead.company} • `}
                        {lead.platform && `${lead.platform} • `}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          lead.type === 'warm' ? 'bg-orange-100 text-orange-800' :
                          lead.type === 'cold' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {lead.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {lead.created_at && new Date(lead.created_at).toLocaleDateString()}
                      </div>
                      {lead.quality_score && (
                        <div className="text-xs">
                          {'⭐'.repeat(Math.min(lead.quality_score, 5))}
                        </div>
                      )}
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p>No leads yet!</p>
                    <button 
                      onClick={() => window.location.href = '/add-lead'}
                      className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Add your first lead →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Upgrade Prompt for Free Users */}
            {experience === 'FREE' && (
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-2">🚀 Upgrade to V1 Pro</h3>
                <ul className="text-sm space-y-1 mb-4 opacity-90">
                  <li>• 1,000 leads per month</li>
                  <li>• Advanced pipeline tracking</li>
                  <li>• 40+ lead data fields</li>
                  <li>• Priority support</li>
                </ul>
                <button 
                  onClick={() => window.location.href = '/pricing'}
                  className="w-full bg-white text-blue-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  See Plans
                </button>
              </div>
            )}

            {/* Pro Features Highlight */}
            {(experience === 'PRO' || experience === 'TRIAL') && (
              <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-2">
                  {experience === 'TRIAL' ? '🎁 Trial Features' : '🚀 Pro Features'}
                </h3>
                <ul className="text-sm space-y-1 opacity-90">
                  <li>✅ 1,000 leads per month</li>
                  <li>✅ Advanced pipeline tracking</li>
                  <li>✅ 40+ lead data fields</li>
                  <li>✅ Quality scoring system</li>
                  <li>✅ Follow-up reminders</li>
                  <li>✅ Export capabilities</li>
                </ul>
                {experience === 'TRIAL' && (
                  <button 
                    onClick={() => window.location.href = '/pricing'}
                    className="w-full bg-white text-green-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors mt-4"
                  >
                    Upgrade to Keep Features
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section - Status Summary */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">📊 Status Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Lead Status Breakdown */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-700">Lead Status</h3>
              <div className="space-y-2">
                {stats.statusStats && Object.entries(stats.statusStats).slice(0, 4).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-sm">
                    <span className="text-gray-600">{status}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                )) || <p className="text-gray-500 text-sm">No status data</p>}
              </div>
            </div>

            {/* Pipeline Stages */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-700">Pipeline Stages</h3>
              <div className="space-y-2">
                {stats.pipelineStats && Object.entries(stats.pipelineStats).slice(0, 4).map(([stage, count]) => (
                  <div key={stage} className="flex justify-between text-sm">
                    <span className="text-gray-600">{stage}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                )) || <p className="text-gray-500 text-sm">No pipeline data</p>}
              </div>
            </div>

            {/* Temperature */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-700">Lead Temperature</h3>
              <div className="space-y-2">
                {stats.temperatureStats && Object.entries(stats.temperatureStats).map(([temp, count]) => (
                  <div key={temp} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {temp === 'hot' ? '🔥 Hot' : temp === 'warm' ? '🌡️ Warm' : temp === 'cold' ? '❄️ Cold' : temp}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                )) || <p className="text-gray-500 text-sm">No temperature data</p>}
              </div>
            </div>

            {/* Key Metrics */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-700">Key Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Quality Score</span>
                  <span className="font-medium">
                    {stats.avgQualityScore || 0}/10
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Value</span>
                  <span className="font-medium text-green-600">
                    ${stats.totalPotentialValue || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Conversion Rate</span>
                  <span className="font-medium">
                    {stats.totalLeads > 0 ? Math.round((stats.crmLeads / stats.totalLeads) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account Type</span>
                  <span className={`font-medium ${
                    experience === 'PRO' ? 'text-blue-600' :
                    experience === 'TRIAL' ? 'text-green-600' :
                    experience === 'ADMIN' ? 'text-purple-600' :
                    'text-gray-600'
                  }`}>
                    {experience === 'PRO' ? 'V1 Pro' :
                     experience === 'TRIAL' ? 'Pro Trial' :
                     experience === 'ADMIN' ? 'Admin' :
                     'Free'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="mt-8 bg-white rounded-xl p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Quick navigate:</span>
              <button 
                onClick={() => window.location.href = '/add-lead'}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Add Lead
              </button>
              <button 
                onClick={() => window.location.href = '/pipeline'}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Pipeline
              </button>
              <button 
                onClick={() => window.location.href = '/settings'}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Settings
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export the component
export default Dashboard;