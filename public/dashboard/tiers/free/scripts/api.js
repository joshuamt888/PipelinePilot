// 🆓 FREE TIER API.JS - SECURE COOKIE AUTHENTICATION
// Simple, working backend communication for FREE users

// 🔐 SECURE AUTH API - Uses authManager (no localStorage!)
const AuthAPI = {
    getCurrentUser() {
        return window.authManager?.user || null;
    },
    
    isAuthenticated() {
        return window.authManager?.authenticated || false;
    },
    
    async logout() {
        if (window.authManager) {
            await window.authManager.logout();
        } else {
            window.location.href = '/login';
        }
    },
    
    getLeadLimitInfo() {
        return window.authManager?.getLeadLimitInfo() || null;
    }
};

// 👥 SECURE LEADS API - Uses cookie authentication
const LeadsAPI = {
    async getLeads() {
        try {
            if (!window.authManager) {
                throw new Error('Authentication manager not available');
            }
            
            const response = await window.authManager.apiRequest('/api/leads');
            
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
            if (!window.authManager) {
                throw new Error('Authentication manager not available');
            }
            
            const response = await window.authManager.apiRequest('/api/leads', {
                method: 'POST',
                body: JSON.stringify(leadData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                
                // Check for limit reached
                if (errorData.limitReached) {
                    return {
                        success: false,
                        error: errorData.error,
                        limitReached: true,
                        currentCount: errorData.currentCount,
                        limit: errorData.limit
                    };
                }
                
                throw new Error(errorData.error || 'Failed to create lead');
            }
            
            const data = await response.json();
            
            // Play success sound
            if (window.SteadyUtils) {
                window.SteadyUtils.playSound('success');
            }
            
            return {
                success: true,
                message: 'Lead added successfully! 🎉',
                data: data
            };
        } catch (error) {
            console.error('Create lead error:', error);
            
            // Play error sound
            if (window.SteadyUtils) {
                window.SteadyUtils.playSound('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    async updateLead(leadId, leadData) {
        try {
            if (!window.authManager) {
                throw new Error('Authentication manager not available');
            }
            
            const response = await window.authManager.apiRequest(`/api/leads/${leadId}`, {
                method: 'PUT',
                body: JSON.stringify(leadData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update lead');
            }
            
            const data = await response.json();
            
            // Play success sound
            if (window.SteadyUtils) {
                window.SteadyUtils.playSound('click');
            }
            
            return {
                success: true,
                message: 'Lead updated! ✅',
                data: data
            };
        } catch (error) {
            console.error('Update lead error:', error);
            
            if (window.SteadyUtils) {
                window.SteadyUtils.playSound('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    async deleteLead(leadId) {
        try {
            if (!window.authManager) {
                throw new Error('Authentication manager not available');
            }
            
            const response = await window.authManager.apiRequest(`/api/leads/${leadId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete lead');
            }
            
            const data = await response.json();
            
            return {
                success: true,
                message: 'Lead deleted 🗑️',
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
            if (!window.authManager) {
                throw new Error('Authentication manager not available');
            }
            
            const response = await window.authManager.apiRequest('/api/statistics');
            
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

// ⚙️ SECURE SETTINGS API - Uses cookie authentication
const SettingsAPI = {
    async getUserSettings() {
        try {
            if (!window.authManager) {
                throw new Error('Authentication manager not available');
            }
            
            const response = await window.authManager.apiRequest('/api/user/settings');
            
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
            if (!window.authManager) {
                throw new Error('Authentication manager not available');
            }
            
            const response = await window.authManager.apiRequest('/api/user/settings', {
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
                message: 'Settings updated! ⚙️',
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

// 🎯 FREE TIER UPGRADE PROMPTS
const FreeTierPrompts = {
    showUpgradePrompt(feature) {
        const prompts = {
            analytics: {
                title: '📊 Unlock Analytics!',
                description: 'See which platforms convert best, track conversion rates, and get insights that help you focus on what works.',
                features: ['Conversion tracking', 'Platform performance', 'Time-based insights', 'Export reports']
            },
            export: {
                title: '📥 Export Your Data!',
                description: 'Download your leads as CSV files, backup your data, and integrate with other tools.',
                features: ['CSV export', 'Data backup', 'Integration ready', 'Bulk operations']
            },
            limit: {
                title: '🚀 Lead Limit Reached!',
                description: 'You\'ve hit your 50 lead limit! Upgrade to Professional and get 1,000 leads per month.',
                features: ['1,000 leads/month', 'Analytics dashboard', 'Export capabilities', '14-day free trial']
            },
            advanced_search: {
                title: '🔍 Advanced Search!',
                description: 'Search by custom fields, filter by date ranges, and find leads instantly.',
                features: ['Custom field search', 'Date range filters', 'Saved searches', 'Smart suggestions']
            }
        };
        
        const prompt = prompts[feature] || prompts.limit;
        
        // Use the fancy modal from utils.js
        if (window.FreeTierUtils) {
            window.FreeTierUtils.showUpgradeModal(prompt.description);
        } else {
            // Fallback to simple alert
            if (confirm(`${prompt.title}\n\n${prompt.description}\n\nStart your free trial now?`)) {
                window.location.href = '/login?tab=trial';
            }
        }
    },
    
    // Show limit warning when close to limit
    showLimitWarning(current, limit) {
        const remaining = limit - current;
        const percentage = (current / limit) * 100;
        
        if (percentage >= 90) {
            if (window.SteadyUtils) {
                window.SteadyUtils.Toast.warning(`🔥 Only ${remaining} leads left! Ready for 1,000?`, 5000);
            }
        } else if (percentage >= 75) {
            if (window.SteadyUtils) {
                window.SteadyUtils.Toast.info(`📈 You're doing great! ${remaining} leads remaining.`, 3000);
            }
        }
    }
};

// 🔒 LOCKED FEATURES API - Shows upgrade prompts
const LockedAPI = {
    // Analytics features
    async getAdvancedAnalytics() {
        FreeTierPrompts.showUpgradePrompt('analytics');
        return {
            success: false,
            error: 'Advanced analytics requires Professional plan!',
            locked: true,
            feature: 'analytics'
        };
    },
    
    // Export features  
    async exportData(format = 'csv') {
        FreeTierPrompts.showUpgradePrompt('export');
        return {
            success: false,
            error: 'Data export requires Professional plan!',
            locked: true,
            feature: 'export'
        };
    },
    
    // Advanced search
    async advancedSearch(query) {
        FreeTierPrompts.showUpgradePrompt('advanced_search');
        return {
            success: false,
            error: 'Advanced search requires Professional plan!',
            locked: true,
            feature: 'advanced_search'
        };
    },
    
    // Generic locked feature
    requiresUpgrade(featureName) {
        FreeTierPrompts.showUpgradePrompt(featureName);
        return {
            success: false,
            error: `${featureName} requires Professional plan!`,
            locked: true,
            feature: featureName
        };
    }
};

// 📊 FREE TIER ANALYTICS - Limited but functional
const FreeAnalyticsAPI = {
    async getBasicStats() {
        // This uses the real statistics endpoint
        const stats = await LeadsAPI.getStatistics();
        
        if (!stats.success) {
            return stats;
        }
        
        // Return limited stats for free users
        return {
            success: true,
            data: {
                totalLeads: stats.data.totalLeads,
                leadTypes: {
                    cold: stats.data.coldLeads,
                    warm: stats.data.warmLeads,
                    crm: stats.data.crmLeads
                },
                // Hide advanced metrics for free users
                lockedFeatures: {
                    conversionRate: '🔒 Upgrade for conversion tracking',
                    platformPerformance: '🔒 Upgrade for platform insights',
                    timeAnalysis: '🔒 Upgrade for time-based analytics'
                }
            }
        };
    }
};

// 🔧 EXPORT TO GLOBAL SCOPE
window.AuthAPI = AuthAPI;
window.LeadsAPI = LeadsAPI;
window.SettingsAPI = SettingsAPI;
window.LockedAPI = LockedAPI;
window.FreeAnalyticsAPI = FreeAnalyticsAPI;
window.FreeTierPrompts = FreeTierPrompts;

// 🎯 MAIN API OBJECT - Everything in one place
window.SteadyAPI = {
    // Core APIs
    Auth: AuthAPI,
    Leads: LeadsAPI,
    Settings: SettingsAPI,
    Analytics: FreeAnalyticsAPI,
    
    // Free tier specific
    Locked: LockedAPI,
    Prompts: FreeTierPrompts,
    
    // Helper functions
    isAuthenticated: () => AuthAPI.isAuthenticated(),
    getCurrentUser: () => AuthAPI.getCurrentUser(),
    getLeadLimitInfo: () => AuthAPI.getLeadLimitInfo(),
    
    // Feature checking
    hasAccess: (feature) => {
        const freeFeatures = ['basic_dashboard', 'add_leads', 'basic_settings', 'goal_tracking', 'basic_analytics'];
        return freeFeatures.includes(feature);
    },
    
    // Secure API request wrapper
    apiRequest: async (url, options = {}) => {
        if (!window.authManager) {
            throw new Error('Authentication manager not available');
        }
        return await window.authManager.apiRequest(url, options);
    }
};

// 🎯 INITIALIZE FREE TIER API
function initializeFreeAPI() {
    console.log('🆓 FREE TIER API initializing...');
    
    // Check if auth manager is available
    if (!window.authManager) {
        console.error('❌ Auth manager not found! Make sure auth.js is loaded first.');
        return false;
    }
    
    // Check authentication
    if (!AuthAPI.isAuthenticated()) {
        console.log('❌ User not authenticated');
        return false;
    }
    
    const user = AuthAPI.getCurrentUser();
    const limitInfo = AuthAPI.getLeadLimitInfo();
    
    console.log('✅ FREE TIER API ready!');
    console.log(`👤 User: ${user?.email}`);
    console.log(`🎯 Tier: ${user?.subscriptionTier || 'FREE'}`);
    console.log(`📊 Leads: ${limitInfo?.current || 0}/${limitInfo?.limit || 50}`);
    
    // Show limit warning if needed
    if (limitInfo && limitInfo.current > 0) {
        FreeTierPrompts.showLimitWarning(limitInfo.current, limitInfo.limit);
    }
    
    return true;
}

// 🚀 AUTO-INITIALIZE WHEN DOM IS READY
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFreeAPI);
} else {
    initializeFreeAPI();
}

console.log('🆓 FREE TIER API loaded - Secure cookie authentication ready! 🔐');