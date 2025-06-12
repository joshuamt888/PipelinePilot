// 🔥 STEADYMANAGER API.JS - BULLETPROOF BACKEND COMMUNICATION
// Perfect integration with your Node.js backend
// Handles authentication, CRUD, analytics, admin features
// Error handling, retries, offline support, the whole nine yards

// 🎯 API Configuration
const API_CONFIG = {
    BASE_URL: window.location.origin, // Automatically uses current domain
    ENDPOINTS: {
        // Authentication
        LOGIN: '/api/login',
        REGISTER: '/api/register',
        START_TRIAL: '/api/start-trial',
        FORGOT_PASSWORD: '/api/forgot-password',
        RESET_PASSWORD: '/api/reset-password',
        
        // User Management
        USER_SETTINGS: '/api/user/settings',
        
        // Lead Management
        LEADS: '/api/leads',
        LEAD_BY_ID: (id) => `/api/leads/${id}`,
        STATISTICS: '/api/statistics',
        
        // Goals & Analytics
        GOALS_CURRENT: '/api/goals/current',
        GOALS_UPDATE: '/api/goals/update',
        GOALS_PROGRESS: '/api/goals/progress',
        GOALS_HISTORY: '/api/goals/history',
        
        // Analytics
        ANALYTICS_CONVERSION: '/api/statistics/conversion',
        ANALYTICS_PLATFORM: '/api/statistics/platform-performance',
        ANALYTICS_TRENDS: '/api/statistics/trends',
        
        // Stripe & Billing
        PRICING_PLANS: '/api/pricing-plans',
        CREATE_CHECKOUT: '/api/create-checkout-session',
        STRIPE_CONFIG: '/api/stripe-config',
        
        // Admin (God Mode)
        ADMIN_STATS: '/api/admin/stats',
        ADMIN_TRIAL_STATUS: '/api/admin/trial-status',
        ADMIN_CHECK_TRIALS: '/api/admin/check-trials',
        ADMIN_CREATE_TEST_TRIAL: '/api/admin/create-test-trial',
        EMAIL_STATS: '/api/email-stats',
        HEALTH: '/api/health',
        
        // Platform Templates (future)
        PLATFORM_TEMPLATES: '/api/platform-templates',
        CUSTOM_PLATFORM: '/api/platform-templates/custom'
    },
    
    // Request timeouts and retries
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000 // 1 second base delay
};

// 🔐 Authentication State Management
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('steadymanager_token');
        this.user = this.getStoredUser();
        this.refreshInterval = null;
        
        // Set up automatic token refresh
        if (this.token) {
            this.setupTokenRefresh();
        }
    }
    
    // Get stored user data
    getStoredUser() {
        try {
            const userData = localStorage.getItem('steadymanager_user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error parsing stored user data:', error);
            return null;
        }
    }
    
    // Store authentication data
    setAuth(token, user) {
        this.token = token;
        this.user = user;
        
        localStorage.setItem('steadymanager_token', token);
        localStorage.setItem('steadymanager_user', JSON.stringify(user));
        
        this.setupTokenRefresh();
        
        // Trigger auth state change event
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { isAuthenticated: true, user } 
        }));
    }
    
    // Clear authentication
    clearAuth() {
        this.token = null;
        this.user = null;
        
        localStorage.removeItem('steadymanager_token');
        localStorage.removeItem('steadymanager_user');
        
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Trigger auth state change event
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { isAuthenticated: false, user: null } 
        }));
    }
    
    // Check if user is authenticated
    isAuthenticated() {
        return !!(this.token && this.user);
    }
    
    // Get current user
    getCurrentUser() {
        return this.user;
    }
    
    // Get auth headers
    getAuthHeaders() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }
    
    // Check if user has specific tier or higher
    hasAccess(requiredTier) {
        if (!this.user) return false;
        
        const tierHierarchy = {
            'free': 0,
            'professional_trial': 1,
            'professional': 1,
            'business': 2,
            'enterprise': 3,
            'admin': 99
        };
        
        const userLevel = tierHierarchy[this.user.userType] || 0;
        const requiredLevel = tierHierarchy[requiredTier] || 0;
        
        return userLevel >= requiredLevel;
    }
    
    // Check if user is admin
    isAdmin() {
        return this.user?.isAdmin || this.user?.userType === 'admin';
    }
    
    // Setup automatic token refresh (prevent session expiration)
    setupTokenRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Refresh every 23 hours (tokens expire in 24h)
        this.refreshInterval = setInterval(() => {
            this.refreshToken();
        }, 23 * 60 * 60 * 1000);
    }
    
    // Refresh token by re-fetching user data
    async refreshToken() {
        try {
            const response = await this.makeRequest('GET', API_CONFIG.ENDPOINTS.USER_SETTINGS);
            if (response.success) {
                // Update stored user data
                this.user = { ...this.user, ...response.data };
                localStorage.setItem('steadymanager_user', JSON.stringify(this.user));
            }
        } catch (error) {
            console.warn('Token refresh failed:', error);
            // If refresh fails, user will need to log in again
        }
    }
    
    // Make authenticated request
    async makeRequest(method, endpoint, data = null) {
        return await apiRequest(method, endpoint, data, {
            ...this.getAuthHeaders()
        });
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// 🔄 Request Helper with Retry Logic and Error Handling
async function apiRequest(method, endpoint, data = null, additionalHeaders = {}) {
    const url = API_CONFIG.BASE_URL + endpoint;
    
    const config = {
        method: method.toUpperCase(),
        headers: {
            'Content-Type': 'application/json',
            ...additionalHeaders
        },
        // Add timeout using AbortController
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
    };
    
    // Add body for POST/PUT requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        config.body = JSON.stringify(data);
    }
    
    let lastError;
    
    // Retry logic
    for (let attempt = 1; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
        try {
            console.log(`🔄 API Request [${attempt}/${API_CONFIG.MAX_RETRIES}]: ${method} ${endpoint}`);
            
            const response = await fetch(url, config);
            
            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                
                // Handle specific status codes
                if (response.status === 401) {
                    // Unauthorized - clear auth and redirect to login
                    authManager.clearAuth();
                    window.location.href = '/login?expired=true';
                    throw new Error('Session expired. Please log in again.');
                }
                
                if (response.status === 403) {
                    throw new Error(errorData.error || 'Access denied. Upgrade your plan for this feature.');
                }
                
                if (response.status === 429) {
                    throw new Error(errorData.error || 'Too many requests. Please wait a moment.');
                }
                
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            console.log(`✅ API Success: ${method} ${endpoint}`, result);
            
            return {
                success: true,
                data: result,
                status: response.status
            };
            
        } catch (error) {
            lastError = error;
            
            console.warn(`❌ API Error [${attempt}/${API_CONFIG.MAX_RETRIES}]: ${method} ${endpoint}`, error.message);
            
            // Don't retry on certain errors
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please check your connection.');
            }
            
            if (error.message.includes('Session expired') || 
                error.message.includes('Access denied')) {
                throw error; // Don't retry auth errors
            }
            
            // Wait before retrying (exponential backoff)
            if (attempt < API_CONFIG.MAX_RETRIES) {
                const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // All retries failed
    throw new Error(`API request failed after ${API_CONFIG.MAX_RETRIES} attempts: ${lastError.message}`);
}

// 🔐 AUTHENTICATION API
const AuthAPI = {
    // Login user
    async login(email, password) {
        try {
            const response = await apiRequest('POST', API_CONFIG.ENDPOINTS.LOGIN, {
                email,
                password
            });
            
            if (response.success && response.data.token) {
                authManager.setAuth(response.data.token, response.data.user);
                
                // Play login sound if available
                if (window.soundManager) {
                    window.soundManager.play('success');
                }
                
                return {
                    success: true,
                    message: response.data.message || 'Login successful!',
                    user: response.data.user
                };
            }
            
            throw new Error('Invalid response format');
            
        } catch (error) {
            // Play error sound if available
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Register new user
    async register(email, password, confirmPassword, pendingUpgrade = false, plan = null) {
        try {
            const response = await apiRequest('POST', API_CONFIG.ENDPOINTS.REGISTER, {
                email,
                password,
                confirmPassword,
                pendingUpgrade,
                plan
            });
            
            if (response.success && response.data.token) {
                authManager.setAuth(response.data.token, response.data.user);
                
                if (window.soundManager) {
                    window.soundManager.play('success');
                }
                
                return {
                    success: true,
                    message: response.data.message || 'Registration successful!',
                    user: response.data.user,
                    isPending: response.data.user.pendingUpgrade
                };
            }
            
            throw new Error('Invalid response format');
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Start trial
    async startTrial(email, password, confirmPassword) {
        try {
            const response = await apiRequest('POST', API_CONFIG.ENDPOINTS.START_TRIAL, {
                email,
                password,
                confirmPassword
            });
            
            if (response.success && response.data.token) {
                authManager.setAuth(response.data.token, response.data.user);
                
                if (window.soundManager) {
                    window.soundManager.play('goalAchieved'); // Special sound for trial start
                }
                
                return {
                    success: true,
                    message: response.data.message || 'Trial started successfully!',
                    user: response.data.user,
                    trialEndDate: response.data.trialEndDate
                };
            }
            
            throw new Error('Invalid response format');
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Forgot password
    async forgotPassword(email) {
        try {
            const response = await apiRequest('POST', API_CONFIG.ENDPOINTS.FORGOT_PASSWORD, {
                email
            });
            
            return {
                success: true,
                message: response.data.message || 'Reset link sent to your email!'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Reset password
    async resetPassword(token, password, confirmPassword) {
        try {
            const response = await apiRequest('POST', API_CONFIG.ENDPOINTS.RESET_PASSWORD, {
                token,
                password,
                confirmPassword
            });
            
            if (window.soundManager) {
                window.soundManager.play('success');
            }
            
            return {
                success: true,
                message: response.data.message || 'Password reset successful!'
            };
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Logout
    logout() {
        authManager.clearAuth();
        
        if (window.soundManager) {
            window.soundManager.play('click');
        }
        
        // Redirect to login page
        window.location.href = '/login';
    },
    
    // Get current user
    getCurrentUser() {
        return authManager.getCurrentUser();
    },
    
    // Check authentication status
    isAuthenticated() {
        return authManager.isAuthenticated();
    },
    
    // Check user access level
    hasAccess(requiredTier) {
        return authManager.hasAccess(requiredTier);
    },
    
    // Check if admin
    isAdmin() {
        return authManager.isAdmin();
    }
};

// 👥 LEADS API
const LeadsAPI = {
    // Get all leads
    async getLeads(viewAll = false) {
        try {
            const endpoint = viewAll ? 
                `${API_CONFIG.ENDPOINTS.LEADS}?viewAll=true` : 
                API_CONFIG.ENDPOINTS.LEADS;
                
            const response = await authManager.makeRequest('GET', endpoint);
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: { cold: [], warm: [], crm: [], all: [] } // Fallback empty data
            };
        }
    },
    
    // Create new lead
    async createLead(leadData) {
        try {
            const response = await authManager.makeRequest('POST', API_CONFIG.ENDPOINTS.LEADS, leadData);
            
            if (window.soundManager) {
                window.soundManager.play('success');
            }
            
            return {
                success: true,
                message: 'Lead added successfully! 🎉',
                data: response.data
            };
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            // Handle specific error cases
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
    
    // Update lead
    async updateLead(leadId, leadData) {
        try {
            const response = await authManager.makeRequest('PUT', API_CONFIG.ENDPOINTS.LEAD_BY_ID(leadId), leadData);
            
            if (window.soundManager) {
                window.soundManager.play('click');
            }
            
            return {
                success: true,
                message: 'Lead updated successfully!',
                data: response.data
            };
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Delete lead
    async deleteLead(leadId) {
        try {
            const response = await authManager.makeRequest('DELETE', API_CONFIG.ENDPOINTS.LEAD_BY_ID(leadId));
            
            if (window.soundManager) {
                window.soundManager.play('click');
            }
            
            return {
                success: true,
                message: 'Lead deleted successfully',
                data: response.data
            };
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Get statistics
    async getStatistics(viewAll = false) {
        try {
            const endpoint = viewAll ? 
                `${API_CONFIG.ENDPOINTS.STATISTICS}?viewAll=true` : 
                API_CONFIG.ENDPOINTS.STATISTICS;
                
            const response = await authManager.makeRequest('GET', endpoint);
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
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

// 🎯 GOALS API
const GoalsAPI = {
    // Get current goals
    async getCurrentGoals() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.GOALS_CURRENT);
            
            return {
                success: true,
                data: response.data || {
                    daily: 5,
                    weekly: 35,
                    monthly: 150
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: { daily: 5, weekly: 35, monthly: 150 } // Default goals
            };
        }
    },
    
    // Update goals
    async updateGoals(goals) {
        try {
            const response = await authManager.makeRequest('PUT', API_CONFIG.ENDPOINTS.GOALS_UPDATE, goals);
            
            if (window.soundManager) {
                window.soundManager.play('success');
            }
            
            return {
                success: true,
                message: 'Goals updated successfully! 🎯',
                data: response.data
            };
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Get goal progress
    async getProgress() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.GOALS_PROGRESS);
            
            return {
                success: true,
                data: response.data || {
                    daily: { current: 0, target: 5, percentage: 0 },
                    weekly: { current: 0, target: 35, percentage: 0 },
                    monthly: { current: 0, target: 150, percentage: 0 }
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: {
                    daily: { current: 0, target: 5, percentage: 0 },
                    weekly: { current: 0, target: 35, percentage: 0 },
                    monthly: { current: 0, target: 150, percentage: 0 }
                }
            };
        }
    },
    
    // Get goal history
    async getHistory() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.GOALS_HISTORY);
            
            return {
                success: true,
                data: response.data || []
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }
};

// 📊 ANALYTICS API
const AnalyticsAPI = {
    // Get conversion analytics
    async getConversionData() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.ANALYTICS_CONVERSION);
            
            return {
                success: true,
                data: response.data || {
                    funnel: [],
                    conversionRate: 0,
                    topSources: []
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: { funnel: [], conversionRate: 0, topSources: [] }
            };
        }
    },
    
    // Get platform performance
    async getPlatformPerformance() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.ANALYTICS_PLATFORM);
            
            return {
                success: true,
                data: response.data || {
                    platforms: [],
                    topPerformer: null,
                    insights: []
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: { platforms: [], topPerformer: null, insights: [] }
            };
        }
    },
    
    // Get trend data
    async getTrends(period = '30d') {
        try {
            const response = await authManager.makeRequest('GET', `${API_CONFIG.ENDPOINTS.ANALYTICS_TRENDS}?period=${period}`);
            
            return {
                success: true,
                data: response.data || {
                    timeline: [],
                    growth: 0,
                    prediction: null
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: { timeline: [], growth: 0, prediction: null }
            };
        }
    }
};

// ⚙️ SETTINGS API
const SettingsAPI = {
    // Get user settings
    async getUserSettings() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.USER_SETTINGS);
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Update user settings
    async updateSettings(settings) {
        try {
            const response = await authManager.makeRequest('PUT', API_CONFIG.ENDPOINTS.USER_SETTINGS, settings);
            
            if (window.soundManager) {
                window.soundManager.play('click');
            }
            
            return {
                success: true,
                message: 'Settings updated successfully!',
                data: response.data
            };
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// 💳 BILLING API
const BillingAPI = {
    // Get pricing plans
    async getPricingPlans() {
        try {
            const response = await apiRequest('GET', API_CONFIG.ENDPOINTS.PRICING_PLANS);
            
            return {
                success: true,
                data: response.data || { plans: [] }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: { plans: [] }
            };
        }
    },
    
    // Create checkout session
    async createCheckoutSession(plan, email) {
        try {
            const response = await apiRequest('POST', API_CONFIG.ENDPOINTS.CREATE_CHECKOUT, {
                plan,
                email
            });
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Get Stripe config
    async getStripeConfig() {
        try {
            const response = await apiRequest('GET', API_CONFIG.ENDPOINTS.STRIPE_CONFIG);
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// 👑 ADMIN API (GOD MODE)
const AdminAPI = {
    // Get admin statistics
    async getStats() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.ADMIN_STATS);
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Get trial status
    async getTrialStatus() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.ADMIN_TRIAL_STATUS);
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Manually check trials (admin control)
    async checkTrials() {
        try {
            const response = await authManager.makeRequest('POST', API_CONFIG.ENDPOINTS.ADMIN_CHECK_TRIALS);
            
            if (window.soundManager) {
                window.soundManager.play('success');
            }
            
            return {
                success: true,
                message: response.data.message || 'Trial check completed!',
                data: response.data
            };
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Create test trial (admin testing)
    async createTestTrial() {
        try {
            const response = await authManager.makeRequest('POST', API_CONFIG.ENDPOINTS.ADMIN_CREATE_TEST_TRIAL);
            
            if (window.soundManager) {
                window.soundManager.play('goalAchieved');
            }
            
            return {
                success: true,
                message: response.data.message || 'Test trial created!',
                data: response.data
            };
            
        } catch (error) {
            if (window.soundManager) {
                window.soundManager.play('error');
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Get email stats
    async getEmailStats() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.EMAIL_STATS);
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Get system health
    async getSystemHealth() {
        try {
            const response = await apiRequest('GET', API_CONFIG.ENDPOINTS.HEALTH);
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// 🚀 MAIN API EXPORT - Everything in one place
window.SteadyAPI = {
    // Core APIs
    Auth: AuthAPI,
    Leads: LeadsAPI,
    Goals: GoalsAPI,
    Analytics: AnalyticsAPI,
    Settings: SettingsAPI,
    Billing: BillingAPI,
    Admin: AdminAPI,
    
    // Utility functions
    isAuthenticated: () => authManager.isAuthenticated(),
    getCurrentUser: () => authManager.getCurrentUser(),
    hasAccess: (tier) => authManager.hasAccess(tier),
    isAdmin: () => authManager.isAdmin(),
    
    // Configuration
    config: API_CONFIG,
    
    // Direct access to auth manager for advanced use
    authManager: authManager
};

// 🎉 INITIALIZATION
console.log('🔥 SteadyManager API Layer Initialized!');
console.log('📡 Available APIs:', Object.keys(window.SteadyAPI));

// Check authentication on load
if (authManager.isAuthenticated()) {
    console.log('✅ User authenticated:', authManager.getCurrentUser().email);
    console.log('👑 User tier:', authManager.getCurrentUser().userType);
    console.log('🎯 Admin access:', authManager.isAdmin());
} else {
    console.log('❌ User not authenticated');
}

// Global error handler for unhandled API errors
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('API request failed')) {
        console.error('🚨 Unhandled API Error:', event.reason.message);
        
        // Show user-friendly error notification
        if (window.showToast) {
            window.showToast('Connection issue. Please check your internet.', 'error');
        }
        
        event.preventDefault(); // Prevent console spam
    }
});

// Export for debugging in console
console.log('🔧 Debug: window.SteadyAPI available for testing');

// 🎯 PLATFORM TEMPLATES API (Future-Ready)
const PlatformAPI = {
    // Get all platform templates
    async getTemplates() {
        try {
            const response = await authManager.makeRequest('GET', API_CONFIG.ENDPOINTS.PLATFORM_TEMPLATES);
            
            return {
                success: true,
                data: response.data || this.getDefaultTemplates()
            };
            
        } catch (error) {
            // Fallback to default templates if endpoint doesn't exist yet
            return {
                success: true,
                data: this.getDefaultTemplates()
            };
        }
    },
    
    // Create custom platform
    async createCustomPlatform(name, iconUrl = null) {
        try {
            const response = await authManager.makeRequest('POST', API_CONFIG.ENDPOINTS.CUSTOM_PLATFORM, {
                name,
                iconUrl
            });
            
            if (window.soundManager) {
                window.soundManager.play('success');
            }
            
            return {
                success: true,
                message: 'Custom platform created!',
                data: response.data
            };
            
        } catch (error) {
            // If endpoint doesn't exist, store locally for now
            const customPlatforms = JSON.parse(localStorage.getItem('custom_platforms') || '[]');
            const newPlatform = {
                id: Date.now(),
                name,
                iconUrl: iconUrl || 'plus-circle',
                isCustom: true,
                userId: authManager.getCurrentUser()?.id
            };
            
            customPlatforms.push(newPlatform);
            localStorage.setItem('custom_platforms', JSON.stringify(customPlatforms));
            
            if (window.soundManager) {
                window.soundManager.play('success');
            }
            
            return {
                success: true,
                message: 'Custom platform created locally!',
                data: newPlatform
            };
        }
    },
    
    // Default platform templates (fallback)
    getDefaultTemplates() {
        return [
            { id: 1, name: 'LinkedIn', icon: 'linkedin', category: 'social' },
            { id: 2, name: 'Facebook Groups', icon: 'facebook', category: 'social' },
            { id: 3, name: 'Facebook', icon: 'facebook', category: 'social' },
            { id: 4, name: 'Instagram', icon: 'instagram', category: 'social' },
            { id: 5, name: 'Twitter/X', icon: 'twitter', category: 'social' },
            { id: 6, name: 'TikTok', icon: 'video', category: 'social' },
            { id: 7, name: 'YouTube', icon: 'youtube', category: 'social' },
            { id: 8, name: 'Reddit', icon: 'message-circle', category: 'social' },
            { id: 9, name: 'Discord', icon: 'message-square', category: 'social' },
            { id: 10, name: 'Slack', icon: 'slack', category: 'professional' },
            { id: 11, name: 'Cold Calls', icon: 'phone', category: 'outreach' },
            { id: 12, name: 'Cold Emails', icon: 'mail', category: 'outreach' },
            { id: 13, name: 'Referrals', icon: 'users', category: 'referral' },
            { id: 14, name: 'Website Contact', icon: 'globe', category: 'inbound' },
            { id: 15, name: 'Industry Events', icon: 'calendar-days', category: 'events' },
            { id: 16, name: 'Trade Shows', icon: 'building', category: 'events' },
            { id: 17, name: 'Networking Events', icon: 'handshake', category: 'events' },
            { id: 18, name: 'Google Ads', icon: 'target', category: 'advertising' },
            { id: 19, name: 'SEO/Organic', icon: 'search', category: 'inbound' },
            { id: 20, name: 'Partner Referrals', icon: 'link', category: 'referral' },
            { id: 21, name: 'Content Marketing', icon: 'file-text', category: 'content' },
            { id: 22, name: 'Webinars', icon: 'monitor', category: 'content' },
            { id: 23, name: 'Podcasts', icon: 'mic', category: 'content' },
            { id: 24, name: 'Custom Platform', icon: 'plus-circle', category: 'custom' }
        ];
    }
};

// 📈 REAL-TIME DATA SYNC (Advanced Feature)
class DataSync {
    constructor() {
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.isOnline = navigator.onLine;
        this.pendingOperations = JSON.parse(localStorage.getItem('pending_operations') || '[]');
        
        // Set up online/offline listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Start sync if authenticated
        if (authManager.isAuthenticated()) {
            this.startSync();
        }
        
        // Listen for auth changes
        window.addEventListener('authStateChanged', (event) => {
            if (event.detail.isAuthenticated) {
                this.startSync();
            } else {
                this.stopSync();
            }
        });
    }
    
    // Start periodic data sync
    startSync() {
        if (this.syncInterval) return;
        
        // Sync every 5 minutes
        this.syncInterval = setInterval(() => {
            this.syncData();
        }, 5 * 60 * 1000);
        
        // Initial sync
        this.syncData();
    }
    
    // Stop data sync
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    // Sync data with server
    async syncData() {
        if (!this.isOnline || !authManager.isAuthenticated()) return;
        
        try {
            console.log('🔄 Syncing data...');
            
            // Process pending operations first
            await this.processPendingOperations();
            
            // Refresh user data
            const userResponse = await SettingsAPI.getUserSettings();
            if (userResponse.success) {
                // Update stored user data
                authManager.user = { ...authManager.user, ...userResponse.data };
                localStorage.setItem('steadymanager_user', JSON.stringify(authManager.user));
            }
            
            // Cache fresh leads data
            const leadsResponse = await LeadsAPI.getLeads();
            if (leadsResponse.success) {
                localStorage.setItem('cached_leads', JSON.stringify({
                    data: leadsResponse.data,
                    timestamp: Date.now()
                }));
            }
            
            this.lastSyncTime = Date.now();
            console.log('✅ Data sync completed');
            
        } catch (error) {
            console.warn('⚠️ Data sync failed:', error.message);
        }
    }
    
    // Handle going online
    async handleOnline() {
        console.log('🌐 Back online!');
        this.isOnline = true;
        
        if (window.showToast) {
            window.showToast('Back online! Syncing data...', 'success');
        }
        
        // Sync immediately when back online
        await this.syncData();
    }
    
    // Handle going offline
    handleOffline() {
        console.log('📴 Gone offline');
        this.isOnline = false;
        
        if (window.showToast) {
            window.showToast('You\'re offline. Changes will sync when reconnected.', 'info');
        }
    }
    
    // Add operation to pending queue
    queueOperation(operation) {
        this.pendingOperations.push({
            ...operation,
            timestamp: Date.now(),
            id: Date.now() + Math.random()
        });
        
        localStorage.setItem('pending_operations', JSON.stringify(this.pendingOperations));
    }
    
    // Process all pending operations
    async processPendingOperations() {
        if (this.pendingOperations.length === 0) return;
        
        console.log(`🔄 Processing ${this.pendingOperations.length} pending operations...`);
        
        const processedIds = [];
        
        for (const operation of this.pendingOperations) {
            try {
                let result = false;
                
                switch (operation.type) {
                    case 'create_lead':
                        result = await LeadsAPI.createLead(operation.data);
                        break;
                    case 'update_lead':
                        result = await LeadsAPI.updateLead(operation.leadId, operation.data);
                        break;
                    case 'delete_lead':
                        result = await LeadsAPI.deleteLead(operation.leadId);
                        break;
                    case 'update_goals':
                        result = await GoalsAPI.updateGoals(operation.data);
                        break;
                    case 'update_settings':
                        result = await SettingsAPI.updateSettings(operation.data);
                        break;
                }
                
                if (result && result.success) {
                    processedIds.push(operation.id);
                    console.log(`✅ Processed: ${operation.type}`);
                }
                
            } catch (error) {
                console.warn(`❌ Failed to process ${operation.type}:`, error.message);
            }
        }
        
        // Remove processed operations
        this.pendingOperations = this.pendingOperations.filter(op => !processedIds.includes(op.id));
        localStorage.setItem('pending_operations', JSON.stringify(this.pendingOperations));
        
        if (processedIds.length > 0) {
            console.log(`✅ Processed ${processedIds.length} pending operations`);
        }
    }
    
    // Get cached data (offline fallback)
    getCachedLeads() {
        try {
            const cached = JSON.parse(localStorage.getItem('cached_leads') || '{}');
            const maxAge = 30 * 60 * 1000; // 30 minutes
            
            if (cached.data && cached.timestamp && (Date.now() - cached.timestamp) < maxAge) {
                return cached.data;
            }
        } catch (error) {
            console.warn('Error loading cached leads:', error);
        }
        
        return { cold: [], warm: [], crm: [], all: [] };
    }
}

// Initialize data sync
const dataSync = new DataSync();

// 🎊 CELEBRATION SYSTEM
const CelebrationAPI = {
    // Trigger celebration
    celebrate(type, data = {}) {
        if (window.soundManager) {
            const soundMap = {
                'goal_achieved': 'goalAchieved',
                'lead_added': 'success',
                'milestone': 'goalAchieved',
                'upgrade': 'goalAchieved',
                'first_lead': 'goalAchieved'
            };
            
            window.soundManager.play(soundMap[type] || 'success');
        }
        
        // Trigger celebration event
        window.dispatchEvent(new CustomEvent('celebrate', {
            detail: { type, data }
        }));
        
        console.log(`🎉 Celebration: ${type}`, data);
    },
    
    // Check for milestone achievements
    checkMilestones(leadCount) {
        const milestones = [1, 10, 25, 50, 100, 250, 500, 1000];
        
        if (milestones.includes(leadCount)) {
            this.celebrate('milestone', {
                leadCount,
                message: `🎉 Amazing! You've reached ${leadCount} leads!`
            });
        }
    },
    
    // Check goal achievements
    checkGoalAchievement(current, target, type) {
        if (current >= target) {
            this.celebrate('goal_achieved', {
                type,
                current,
                target,
                message: `🎯 ${type} goal achieved! ${current}/${target}`
            });
        }
    }
};

// 🔍 SEARCH & FILTER API
const SearchAPI = {
    // Search leads
    searchLeads(leads, query) {
        if (!query || query.trim() === '') return leads;
        
        const searchTerm = query.toLowerCase().trim();
        
        return leads.filter(lead => {
            return (
                lead.name?.toLowerCase().includes(searchTerm) ||
                lead.email?.toLowerCase().includes(searchTerm) ||
                lead.company?.toLowerCase().includes(searchTerm) ||
                lead.platform?.toLowerCase().includes(searchTerm) ||
                lead.status?.toLowerCase().includes(searchTerm) ||
                lead.notes?.toLowerCase().includes(searchTerm)
            );
        });
    },
    
    // Filter leads
    filterLeads(leads, filters) {
        let filtered = [...leads];
        
        // Filter by status
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(lead => lead.status === filters.status);
        }
        
        // Filter by platform
        if (filters.platform && filters.platform !== 'all') {
            filtered = filtered.filter(lead => lead.platform === filters.platform);
        }
        
        // Filter by date range
        if (filters.dateFrom || filters.dateTo) {
            filtered = filtered.filter(lead => {
                const leadDate = new Date(lead.created_at);
                const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
                const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
                
                if (fromDate && leadDate < fromDate) return false;
                if (toDate && leadDate > toDate) return false;
                
                return true;
            });
        }
        
        // Filter by quality score
        if (filters.minQuality || filters.maxQuality) {
            filtered = filtered.filter(lead => {
                const score = lead.quality_score || 5;
                if (filters.minQuality && score < filters.minQuality) return false;
                if (filters.maxQuality && score > filters.maxQuality) return false;
                return true;
            });
        }
        
        return filtered;
    },
    
    // Sort leads
    sortLeads(leads, sortBy, sortOrder = 'desc') {
        const sorted = [...leads].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            // Handle different data types
            if (sortBy === 'created_at' || sortBy === 'updated_at') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }
};

// 📊 EXPORT API
const ExportAPI = {
    // Export leads to CSV
    exportToCSV(leads, filename = 'leads') {
        if (!authManager.hasAccess('professional')) {
            return {
                success: false,
                error: 'CSV export requires Professional plan or higher'
            };
        }
        
        try {
            const headers = [
                'Name', 'Email', 'Phone', 'Company', 'Platform', 'Status', 
                'Type', 'Quality Score', 'Potential Value', 'Notes', 
                'Follow Up Date', 'Created Date', 'Updated Date'
            ];
            
            const csvContent = [
                headers.join(','),
                ...leads.map(lead => [
                    this.escapeCsvField(lead.name || ''),
                    this.escapeCsvField(lead.email || ''),
                    this.escapeCsvField(lead.phone || ''),
                    this.escapeCsvField(lead.company || ''),
                    this.escapeCsvField(lead.platform || ''),
                    this.escapeCsvField(lead.status || ''),
                    this.escapeCsvField(lead.type || ''),
                    lead.quality_score || '',
                    lead.potential_value || '',
                    this.escapeCsvField(lead.notes || ''),
                    lead.follow_up_date || '',
                    lead.created_at || '',
                    lead.updated_at || ''
                ].join(','))
            ].join('\n');
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            if (window.soundManager) {
                window.soundManager.play('success');
            }
            
            return {
                success: true,
                message: 'Leads exported successfully!'
            };
            
        } catch (error) {
            return {
                success: false,
                error: 'Export failed: ' + error.message
            };
        }
    },
    
    // Escape CSV field
    escapeCsvField(field) {
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    },
    
    // Export analytics data
    exportAnalytics(data, filename = 'analytics') {
        if (!authManager.hasAccess('professional')) {
            return {
                success: false,
                error: 'Analytics export requires Professional plan or higher'
            };
        }
        
        try {
            const jsonContent = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            return {
                success: true,
                message: 'Analytics exported successfully!'
            };
            
        } catch (error) {
            return {
                success: false,
                error: 'Export failed: ' + error.message
            };
        }
    }
};

// 🎯 ADD TO MAIN API
window.SteadyAPI.Platform = PlatformAPI;
window.SteadyAPI.Celebration = CelebrationAPI;
window.SteadyAPI.Search = SearchAPI;
window.SteadyAPI.Export = ExportAPI;
window.SteadyAPI.DataSync = dataSync;

console.log('🚀 SteadyManager API v2.0 - Fully Loaded!');
console.log('📊 Features: Auth, Leads, Goals, Analytics, Settings, Billing, Admin');
console.log('🎊 Bonus: Celebrations, Search, Export, Offline Support, Platform Templates');
console.log('💫 Ready to build the ultimate dashboard!');

// 🎭 EASTER EGG FOR DEVELOPERS
console.log('%c🎮 DEVELOPER EASTER EGG ACTIVATED!', 'color: #ff6b6b; font-size: 16px; font-weight: bold;');
console.log('%cTry these in console:', 'color: #4ecdc4; font-size: 14px;');
console.log('%c  SteadyAPI.Celebration.celebrate("milestone", {leadCount: 100})', 'color: #45b7d1; font-family: monospace;');
console.log('%c  SteadyAPI.getCurrentUser()', 'color: #45b7d1; font-family: monospace;');
console.log('%c  SteadyAPI.isAdmin()', 'color: #45b7d1; font-family: monospace;');

// Make APIs globally available for React components
window.AuthAPI = AuthAPI;
window.LeadsAPI = LeadsAPI;
window.GoalsAPI = GoalsAPI;
window.AnalyticsAPI = AnalyticsAPI;
window.SettingsAPI = SettingsAPI;
window.BillingAPI = BillingAPI;
window.AdminAPI = AdminAPI;