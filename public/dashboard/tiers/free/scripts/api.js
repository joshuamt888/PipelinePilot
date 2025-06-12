// 🆓 FIXED FREE TIER API.JS
// Simple, working backend communication for FREE users

// 🔐 FIXED: Use correct token keys that match your backend
const getAuthToken = () => {
    return localStorage.getItem('token'); // ✅ Your backend stores as 'token'
};

const getUserData = () => {
    try {
        const userData = localStorage.getItem('user_data'); // ✅ Your backend stores as 'user_data'
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
};

// 🔐 FIXED: Authenticated fetch that matches your backend expectations
const authenticatedFetch = async (url, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
        console.error('No auth token found');
        window.location.href = '/login?error=session_expired';
        return;
    }
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // ✅ This is what your backend expects!
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, { ...options, ...defaultOptions });
        
        if (response.status === 401 || response.status === 403) {
            console.error('Auth failed, redirecting to login');
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            window.location.href = '/login?error=session_expired';
            return;
        }
        
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

// 🔐 SIMPLE AUTH API
const AuthAPI = {
    getCurrentUser() {
        return getUserData();
    },
    
    isAuthenticated() {
        return !!(getAuthToken() && getUserData());
    },
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
    }
};

// 👥 SIMPLE LEADS API  
const LeadsAPI = {
    async getLeads() {
        try {
            const response = await authenticatedFetch('/api/leads');
            if (!response.ok) {
                throw new Error('Failed to fetch leads');
            }
            const data = await response.json();
            
            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Get leads error:', error);
            return {
                success: false,
                error: error.message,
                data: { cold: [], warm: [], crm: [], all: [] }
            };
        }
    },
    
    async createLead(leadData) {
        try {
            const response = await authenticatedFetch('/api/leads', {
                method: 'POST',
                body: JSON.stringify(leadData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create lead');
            }
            
            const data = await response.json();
            
            return {
                success: true,
                message: 'Lead added successfully! 🎉',
                data: data
            };
        } catch (error) {
            console.error('Create lead error:', error);
            
            // Check if it's a limit error
            if (error.message.includes('limit reached')) {
                return {
                    success: false,
                    error: error.message,
                    limitReached: true
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    async updateLead(leadId, leadData) {
        try {
            const response = await authenticatedFetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                body: JSON.stringify(leadData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update lead');
            }
            
            const data = await response.json();
            
            return {
                success: true,
                message: 'Lead updated!',
                data: data
            };
        } catch (error) {
            console.error('Update lead error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    async deleteLead(leadId) {
        try {
            const response = await authenticatedFetch(`/api/leads/${leadId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete lead');
            }
            
            const data = await response.json();
            
            return {
                success: true,
                message: 'Lead deleted',
                data: data
            };
        } catch (error) {
            console.error('Delete lead error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    async getStatistics() {
        try {
            const response = await authenticatedFetch('/api/statistics');
            if (!response.ok) {
                throw new Error('Failed to fetch statistics');
            }
            const data = await response.json();
            
            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Get statistics error:', error);
            return {
                success: false,
                error: error.message,
                data: {
                    totalLeads: 0,
                    coldLeads: 0,
                    warmLeads: 0,
                    crmLeads: 0,
                    avgQualityScore: 0,
                    totalPotentialValue: 0,
                    platformStats: {}
                }
            };
        }
    }
};

// ⚙️ SIMPLE SETTINGS API
const SettingsAPI = {
    async getUserSettings() {
        try {
            const response = await authenticatedFetch('/api/user/settings');
            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }
            const data = await response.json();
            
            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Get settings error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    async updateSettings(settings) {
        try {
            const response = await authenticatedFetch('/api/user/settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update settings');
            }
            
            const data = await response.json();
            
            return {
                success: true,
                message: 'Settings updated!',
                data: data
            };
        } catch (error) {
            console.error('Update settings error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// 🎯 UPGRADE PROMPTS FOR LOCKED FEATURES
const showUpgradePrompt = (feature) => {
    const prompts = {
        analytics: {
            title: 'Unlock Analytics! 📊',
            description: 'See which platforms convert best and track trends.',
            cta: 'Start Professional Trial'
        },
        export: {
            title: 'Export Your Data! 📥',
            description: 'Download your leads as CSV files.',
            cta: 'Upgrade to Professional'
        },
        limit: {
            title: 'Lead Limit Reached! 🚀',
            description: 'Upgrade to get 1,000 leads per month.',
            cta: 'Start Free Trial'
        }
    };
    
    const prompt = prompts[feature] || prompts.limit;
    
    // Simple alert for now (you can make this fancier later)
    if (confirm(`${prompt.title}\n\n${prompt.description}\n\nWould you like to start a free trial?`)) {
        window.location.href = '/login?tab=trial';
    }
};

// 🔒 LOCKED FEATURES (FREE TIER)
const LockedAPI = {
    showUpgrade: (feature) => showUpgradePrompt(feature),
    
    // Any locked feature calls this
    requiresUpgrade: (featureName) => {
        showUpgradePrompt(featureName);
        return {
            success: false,
            error: `${featureName} requires Professional plan!`,
            locked: true
        };
    }
};

// 🔧 EXPORT TO GLOBAL SCOPE
window.AuthAPI = AuthAPI;
window.LeadsAPI = LeadsAPI;
window.SettingsAPI = SettingsAPI;
window.LockedAPI = LockedAPI;
window.authenticatedFetch = authenticatedFetch;
window.showUpgradePrompt = showUpgradePrompt;

// Simple consolidated API
window.SteadyAPI = {
    Auth: AuthAPI,
    Leads: LeadsAPI,
    Settings: SettingsAPI,
    Locked: LockedAPI,
    
    // Helper functions
    isAuthenticated: () => AuthAPI.isAuthenticated(),
    getCurrentUser: () => AuthAPI.getCurrentUser(),
    hasAccess: (feature) => ['basic_dashboard', 'add_leads', 'basic_settings'].includes(feature),
    
    // Always available
    authenticatedFetch: authenticatedFetch
};

console.log('🆓 FREE TIER API loaded successfully!');
console.log('✅ Available: Auth, Leads, Settings');
console.log('🔒 Locked features will show upgrade prompts');

// Verify authentication on load
if (AuthAPI.isAuthenticated()) {
    const user = AuthAPI.getCurrentUser();
    console.log('✅ User authenticated:', user.email);
    console.log('🎯 Subscription:', user.subscriptionTier || 'FREE');
} else {
    console.log('❌ User not authenticated - redirecting...');
    window.location.href = '/login?error=session_expired';
}