/**
 * SteadyManager - Free Tier API Layer
 * Handles all backend communication for leads, authentication, and user management
 * Compatible with enhanced database schema and DashboardController
 */

(function() {
    'use strict';

    // 🔥 API CLASS - MAIN API HANDLER
    class SteadyAPI {
        constructor() {
            this.baseURL = '';
            this.currentUser = null;
            this.requestQueue = [];
            this.retryAttempts = 3;
            this.timeout = 10000; // 10 seconds
            this.rateLimitDelay = 1000; // 1 second between requests
            this.lastRequestTime = 0;
            
            console.log('🔌 SteadyAPI initialized');
        }

        /**
         * Initialize API layer
         */
        async init() {
            try {
                // Setup request interceptors
                this.setupRequestInterceptors();
                
                // Setup error handling
                this.setupErrorHandling();
                
                // Check initial auth state
                await this.checkAuthStatus();
                
                console.log('✅ SteadyAPI ready');
                return true;
            } catch (error) {
                console.error('❌ SteadyAPI initialization failed:', error);
                return false;
            }
        }

        // 🔐 AUTHENTICATION METHODS

        /**
         * Check current authentication status
         */
        async checkAuthStatus() {
            try {
                const response = await this.makeRequest('/api/auth/check', {
                    method: 'GET'
                });

                if (response.authenticated) {
                    this.currentUser = response.user;
                    console.log('✅ User authenticated:', this.currentUser.email);
                    return { authenticated: true, user: this.currentUser };
                } else {
                    this.currentUser = null;
                    console.log('❌ User not authenticated');
                    return { authenticated: false, user: null };
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                this.currentUser = null;
                return { authenticated: false, user: null };
            }
        }

        /**
         * Login user
         */
        async login(credentials) {
            try {
                const response = await this.makeRequest('/api/login', {
                    method: 'POST',
                    body: JSON.stringify(credentials)
                });

                if (response.success) {
                    this.currentUser = response.user;
                    console.log('✅ Login successful');
                    
                    // Track login
                    this.trackEvent('user_login', {
                        tier: response.user.subscriptionTier,
                        rememberMe: credentials.rememberMe
                    });
                    
                    return { success: true, user: response.user, message: response.message };
                } else {
                    return { success: false, error: response.error };
                }
            } catch (error) {
                console.error('Login failed:', error);
                return { success: false, error: 'Login failed. Please try again.' };
            }
        }

        /**
         * Logout user
         */
        async logout() {
            try {
                await this.makeRequest('/api/logout', {
                    method: 'POST'
                });

                this.currentUser = null;
                console.log('✅ Logout successful');
                
                // Track logout
                this.trackEvent('user_logout');
                
                return { success: true };
            } catch (error) {
                console.error('Logout failed:', error);
                this.currentUser = null; // Clear anyway
                return { success: false, error: 'Logout failed' };
            }
        }

        /**
         * Get current user
         */
        getCurrentUser() {
            return this.currentUser;
        }

        // 👥 LEAD MANAGEMENT

        /**
         * Get all leads for current user
         */
        async getLeads(options = {}) {
            try {
                const params = new URLSearchParams();
                
                if (options.viewAll) params.append('viewAll', 'true');
                if (options.type) params.append('type', options.type);
                if (options.status) params.append('status', options.status);
                if (options.limit) params.append('limit', options.limit);
                if (options.offset) params.append('offset', options.offset);
                
                const url = `/api/leads${params.toString() ? '?' + params.toString() : ''}`;
                const response = await this.makeRequest(url, { method: 'GET' });
                
                // Calculate statistics
                const stats = this.calculateLeadStats(response.all || []);
                
                // Check lead limits for free tier
                const limitCheck = this.checkLeadLimits(response.all?.length || 0);
                
                console.log(`📊 Retrieved ${response.all?.length || 0} leads`);
                
                return {
                    success: true,
                    all: response.all || [],
                    cold: response.cold || [],
                    warm: response.warm || [],
                    crm: response.crm || [],
                    stats,
                    limitCheck
                };
            } catch (error) {
                console.error('Failed to get leads:', error);
                return {
                    success: false,
                    error: 'Failed to load leads',
                    all: [],
                    cold: [],
                    warm: [],
                    crm: [],
                    stats: this.getDefaultStats(),
                    limitCheck: this.checkLeadLimits(0)
                };
            }
        }

        /**
         * Create new lead
         */
        async createLead(leadData) {
            try {
                // Validate required fields
                if (!leadData.name || leadData.name.trim() === '') {
                    return { success: false, error: 'Lead name is required' };
                }

                // Check lead limit for free tier
                const currentCount = await this.getCurrentLeadCount();
                if (currentCount >= 50 && !this.currentUser?.isAdmin) {
                    return { 
                        success: false, 
                        error: 'Monthly lead limit reached (50). Upgrade to Professional for 1,000 leads!',
                        limitReached: true
                    };
                }

                // Clean and validate data
                const cleanData = this.sanitizeLeadData(leadData);
                
                const response = await this.makeRequest('/api/leads', {
                    method: 'POST',
                    body: JSON.stringify(cleanData)
                });

                if (response.id) {
                    console.log('✅ Lead created:', response.name);
                    
                    // Track lead creation
                    this.trackEvent('lead_created', {
                        source: cleanData.platform || 'manual',
                        type: cleanData.type || 'cold'
                    });
                    
                    // Show success message
                    if (window.SteadyUtils) {
                        window.SteadyUtils.showToast(
                            `${response.name} added successfully!`, 
                            'success'
                        );
                    }
                    
                    return { success: true, lead: response };
                } else {
                    return { success: false, error: response.error || 'Failed to create lead' };
                }
            } catch (error) {
                console.error('Failed to create lead:', error);
                
                if (error.message.includes('limit')) {
                    return { 
                        success: false, 
                        error: 'Monthly lead limit reached. Upgrade for more leads!',
                        limitReached: true
                    };
                }
                
                return { success: false, error: 'Failed to create lead. Please try again.' };
            }
        }

        /**
         * Update existing lead
         */
        async updateLead(leadId, updateData) {
            try {
                if (!leadId) {
                    return { success: false, error: 'Lead ID is required' };
                }

                const cleanData = this.sanitizeLeadData(updateData);
                
                const response = await this.makeRequest(`/api/leads/${leadId}`, {
                    method: 'PUT',
                    body: JSON.stringify(cleanData)
                });

                if (response.id) {
                    console.log('✅ Lead updated:', response.name);
                    
                    // Track lead update
                    this.trackEvent('lead_updated', {
                        leadId: response.id,
                        fields: Object.keys(cleanData)
                    });
                    
                    if (window.SteadyUtils) {
                        window.SteadyUtils.showToast(
                            `${response.name} updated successfully!`, 
                            'success'
                        );
                    }
                    
                    return { success: true, lead: response };
                } else {
                    return { success: false, error: response.error || 'Failed to update lead' };
                }
            } catch (error) {
                console.error('Failed to update lead:', error);
                return { success: false, error: 'Failed to update lead. Please try again.' };
            }
        }

        /**
         * Delete lead
         */
        async deleteLead(leadId) {
            try {
                if (!leadId) {
                    return { success: false, error: 'Lead ID is required' };
                }

                const response = await this.makeRequest(`/api/leads/${leadId}`, {
                    method: 'DELETE'
                });

                if (response.message) {
                    console.log('✅ Lead deleted:', leadId);
                    
                    // Track lead deletion
                    this.trackEvent('lead_deleted', { leadId });
                    
                    if (window.SteadyUtils) {
                        window.SteadyUtils.showToast(
                            'Lead deleted successfully', 
                            'success'
                        );
                    }
                    
                    return { success: true, message: response.message };
                } else {
                    return { success: false, error: response.error || 'Failed to delete lead' };
                }
            } catch (error) {
                console.error('Failed to delete lead:', error);
                return { success: false, error: 'Failed to delete lead. Please try again.' };
            }
        }

        // 📊 STATISTICS & ANALYTICS

        /**
         * Get dashboard statistics
         */
        async getStatistics(options = {}) {
            try {
                const params = new URLSearchParams();
                if (options.viewAll) params.append('viewAll', 'true');
                
                const url = `/api/statistics${params.toString() ? '?' + params.toString() : ''}`;
                const response = await this.makeRequest(url, { method: 'GET' });
                
                console.log('📊 Statistics retrieved');
                return { success: true, stats: response };
            } catch (error) {
                console.error('Failed to get statistics:', error);
                return { 
                    success: false, 
                    error: 'Failed to load statistics',
                    stats: this.getDefaultStats()
                };
            }
        }

        // ⚙️ USER SETTINGS

        /**
         * Get user settings
         */
        async getUserSettings() {
            try {
                const response = await this.makeRequest('/api/user/settings', {
                    method: 'GET'
                });

                console.log('⚙️ User settings retrieved');
                return { success: true, settings: response };
            } catch (error) {
                console.error('Failed to get user settings:', error);
                return { success: false, error: 'Failed to load settings' };
            }
        }

        /**
         * Update user settings
         */
        async updateUserSettings(settings) {
            try {
                const response = await this.makeRequest('/api/user/settings', {
                    method: 'PUT',
                    body: JSON.stringify(settings)
                });

                if (response.message) {
                    console.log('✅ User settings updated');
                    
                    // Track settings update
                    this.trackEvent('settings_updated', {
                        fields: Object.keys(settings)
                    });
                    
                    if (window.SteadyUtils) {
                        window.SteadyUtils.showToast(
                            'Settings updated successfully!', 
                            'success'
                        );
                    }
                    
                    return { success: true, user: response.user };
                } else {
                    return { success: false, error: response.error || 'Failed to update settings' };
                }
            } catch (error) {
                console.error('Failed to update user settings:', error);
                return { success: false, error: 'Failed to update settings. Please try again.' };
            }
        }

        // 💳 SUBSCRIPTION & BILLING

        /**
         * Get subscription information
         */
        async getSubscription() {
            try {
                // For free tier, return basic subscription info
                const subscription = {
                    tier: this.currentUser?.subscriptionTier || 'FREE',
                    status: 'active',
                    leadLimit: this.currentUser?.monthlyLeadLimit || 50,
                    currentUsage: this.currentUser?.currentMonthLeads || 0,
                    features: this.getFreeFeatures()
                };

                return { success: true, subscription };
            } catch (error) {
                console.error('Failed to get subscription:', error);
                return { 
                    success: false, 
                    error: 'Failed to load subscription info',
                    subscription: this.getDefaultSubscription()
                };
            }
        }

        /**
         * Get Stripe configuration for upgrades
         */
        async getStripeConfig() {
            try {
                const response = await this.makeRequest('/api/stripe-config', {
                    method: 'GET'
                });

                return { success: true, config: response };
            } catch (error) {
                console.error('Failed to get Stripe config:', error);
                return { success: false, error: 'Failed to load payment configuration' };
            }
        }

        /**
         * Create checkout session for upgrade
         */
        async createCheckoutSession(plan, email) {
            try {
                const response = await this.makeRequest('/api/create-checkout-session', {
                    method: 'POST',
                    body: JSON.stringify({ plan, email })
                });

                if (response.url) {
                    // Track upgrade attempt
                    this.trackEvent('upgrade_checkout_started', { plan, email });
                    
                    return { success: true, url: response.url, sessionId: response.sessionId };
                } else {
                    return { success: false, error: response.error || 'Failed to create checkout session' };
                }
            } catch (error) {
                console.error('Failed to create checkout session:', error);
                return { success: false, error: 'Failed to start checkout. Please try again.' };
            }
        }

        // 🛠️ UTILITY METHODS

        /**
         * Make HTTP request with error handling and retries
         */
        async makeRequest(url, options = {}) {
            // Rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.rateLimitDelay) {
                await this.sleep(this.rateLimitDelay - timeSinceLastRequest);
            }
            this.lastRequestTime = Date.now();

            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include' // Include cookies for authentication
            };

            const requestOptions = { ...defaultOptions, ...options };
            
            // Add CSRF protection
            if (requestOptions.method !== 'GET') {
                requestOptions.headers['X-CSRF-Token'] = this.getCSRFToken();
            }

            let lastError;
            
            // Retry logic
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    console.log(`🔌 API ${requestOptions.method} ${url} (attempt ${attempt})`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                    
                    const response = await fetch(url, {
                        ...requestOptions,
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            // Unauthorized - redirect to login
                            console.log('🔐 Unauthorized, redirecting to login');
                            window.location.href = '/auth/login.html';
                            throw new Error('Unauthorized');
                        } else if (response.status === 403) {
                            throw new Error('Access forbidden');
                        } else if (response.status === 429) {
                            // Rate limited - wait and retry
                            const retryAfter = response.headers.get('Retry-After') || 1;
                            await this.sleep(retryAfter * 1000);
                            continue;
                        } else if (response.status >= 500) {
                            // Server error - retry
                            throw new Error(`Server error: ${response.status}`);
                        } else {
                            // Client error - don't retry
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(errorData.error || `Request failed: ${response.status}`);
                        }
                    }
                    
                    const data = await response.json();
                    console.log(`✅ API ${requestOptions.method} ${url} success`);
                    return data;
                    
                } catch (error) {
                    console.error(`❌ API ${requestOptions.method} ${url} failed (attempt ${attempt}):`, error.message);
                    lastError = error;
                    
                    // Don't retry on certain errors
                    if (error.name === 'AbortError') {
                        throw new Error('Request timeout');
                    }
                    if (error.message.includes('Unauthorized') || error.message.includes('forbidden')) {
                        throw error;
                    }
                    
                    // Wait before retry (exponential backoff)
                    if (attempt < this.retryAttempts) {
                        await this.sleep(Math.pow(2, attempt) * 1000);
                    }
                }
            }
            
            throw lastError || new Error('Request failed after all retries');
        }

        /**
         * Get CSRF token from meta tag or cookie
         */
        getCSRFToken() {
            // Try meta tag first
            const metaToken = document.querySelector('meta[name="csrf-token"]');
            if (metaToken) {
                return metaToken.getAttribute('content');
            }
            
            // Fallback to generating a simple token
            return 'xhr-request';
        }

        /**
         * Sleep for specified milliseconds
         */
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Sanitize lead data before sending to API
         */
        sanitizeLeadData(leadData) {
            const sanitized = {};
            
            // Required fields
            if (leadData.name) {
                sanitized.name = leadData.name.trim().slice(0, 255);
            }
            
            // Optional fields with validation
            if (leadData.email) {
                sanitized.email = leadData.email.trim().toLowerCase().slice(0, 255);
            }
            if (leadData.phone) {
                sanitized.phone = leadData.phone.trim().slice(0, 50);
            }
            if (leadData.company) {
                sanitized.company = leadData.company.trim().slice(0, 255);
            }
            if (leadData.platform) {
                sanitized.platform = leadData.platform.trim().slice(0, 100);
            }
            if (leadData.status) {
                sanitized.status = leadData.status.trim().slice(0, 100);
            }
            if (leadData.type) {
                sanitized.type = leadData.type.trim();
            }
            if (leadData.notes) {
                sanitized.notes = leadData.notes.trim().slice(0, 1000);
            }
            if (leadData.qualityScore !== undefined) {
                sanitized.qualityScore = Math.max(1, Math.min(10, parseInt(leadData.qualityScore) || 5));
            }
            if (leadData.potentialValue !== undefined) {
                sanitized.potentialValue = Math.max(0, parseInt(leadData.potentialValue) || 0);
            }
            if (leadData.followUpDate) {
                sanitized.followUpDate = leadData.followUpDate;
            }
            
            return sanitized;
        }

        /**
         * Calculate lead statistics
         */
        calculateLeadStats(leads) {
            if (!Array.isArray(leads)) leads = [];
            
            const total = leads.length;
            const contacted = leads.filter(lead => 
                lead.status && !lead.status.toLowerCase().includes('new')
            ).length;
            const qualified = leads.filter(lead => 
                lead.status && lead.status.toLowerCase().includes('qualified')
            ).length;
            
            const totalValue = leads.reduce((sum, lead) => 
                sum + (parseInt(lead.potential_value) || 0), 0
            );
            
            const avgQuality = total > 0 
                ? leads.reduce((sum, lead) => sum + (lead.quality_score || 5), 0) / total 
                : 0;
            
            return {
                total,
                contacted,
                qualified,
                conversionRate: total > 0 ? Math.round((contacted / total) * 100) : 0,
                qualificationRate: contacted > 0 ? Math.round((qualified / contacted) * 100) : 0,
                totalValue,
                avgQuality: Math.round(avgQuality * 10) / 10
            };
        }

        /**
         * Check lead limits for free tier
         */
        checkLeadLimits(currentCount) {
            const limit = 50;
            const percentage = Math.round((currentCount / limit) * 100);
            
            return {
                current: currentCount,
                limit,
                percentage,
                remaining: Math.max(0, limit - currentCount),
                isNearLimit: percentage >= 80,
                isAtLimit: currentCount >= limit,
                shouldShowUpgrade: percentage >= 90
            };
        }

        /**
         * Get current lead count
         */
        async getCurrentLeadCount() {
            if (this.currentUser?.currentMonthLeads !== undefined) {
                return this.currentUser.currentMonthLeads;
            }
            
            try {
                const leadsResult = await this.getLeads();
                return leadsResult.all?.length || 0;
            } catch {
                return 0;
            }
        }

        /**
         * Get default statistics object
         */
        getDefaultStats() {
            return {
                total: 0,
                contacted: 0,
                qualified: 0,
                conversionRate: 0,
                qualificationRate: 0,
                totalValue: 0,
                avgQuality: 0
            };
        }

        /**
         * Get free tier features
         */
        getFreeFeatures() {
            return [
                'Basic lead management',
                'Up to 50 leads per month',
                'Simple contact tracking',
                'Basic dashboard',
                'CSV export'
            ];
        }

        /**
         * Get default subscription object
         */
        getDefaultSubscription() {
            return {
                tier: 'FREE',
                status: 'active',
                leadLimit: 50,
                currentUsage: 0,
                features: this.getFreeFeatures()
            };
        }

        // 🎪 SETUP METHODS

        /**
         * Setup request interceptors
         */
        setupRequestInterceptors() {
            // Global request interceptor logic can go here
            console.log('🔌 Request interceptors configured');
        }

        /**
         * Setup error handling
         */
        setupErrorHandling() {
            // Handle network errors
            window.addEventListener('online', () => {
                console.log('🌐 Network restored');
                if (window.SteadyUtils) {
                    window.SteadyUtils.showToast('Connection restored!', 'success');
                }
            });

            window.addEventListener('offline', () => {
                console.log('📵 Network lost');
                if (window.SteadyUtils) {
                    window.SteadyUtils.showToast('You\'re offline. Some features may not work.', 'warning');
                }
            });
        }

        /**
         * Track events (placeholder for analytics)
         */
        trackEvent(eventName, properties = {}) {
            console.log(`📊 API Event: ${eventName}`, properties);
            
            // Pass to SteadyUtils if available
            if (window.SteadyUtils && window.SteadyUtils.trackEvent) {
                window.SteadyUtils.trackEvent(eventName, properties);
            }
        }
    }

    // 🚀 INITIALIZE AND EXPORT
    window.API = new SteadyAPI();
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.API.init();
        });
    } else {
        window.API.init();
    }

    console.log('🔌 SteadyAPI loaded and ready!');
    
})();