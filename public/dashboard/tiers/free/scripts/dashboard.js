/**
 * SteadyManager - Free Tier Dashboard Controller
 * Main controller for dashboard navigation, state management, and UI updates
 * Integrates with utils.js and api.js for complete functionality
 */

class DashboardController {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentUser = null;
        this.leads = [];
        this.stats = {};
        this.subscription = null;
        this.initialized = false;
    }

    /**
     * Initialize dashboard controller
     */
    async init() {
        if (this.initialized) return;
        
        console.log('🎯 Initializing Dashboard Controller...');
        
        try {
            // Wait for dependencies
            await this.waitForDependencies();
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI
            this.initializeUI();
            
            // Setup periodic updates
            this.setupPeriodicUpdates();
            
            this.initialized = true;
            console.log('✅ Dashboard Controller initialized successfully');
            
            // Show welcome message
            window.SteadyUtils?.showToast(
                'Welcome to SteadyManager! Start by adding your first lead.', 
                'success'
            );
            
        } catch (error) {
            console.error('❌ Failed to initialize dashboard:', error);
            window.SteadyUtils?.showToast(
                'Failed to initialize dashboard. Please refresh the page.', 
                'error'
            );
        }
    }

    /**
     * Wait for required dependencies to load
     */
    async waitForDependencies() {
        const maxWait = 10000; // 10 seconds
        const checkInterval = 100; // 100ms
        let waited = 0;

        return new Promise((resolve, reject) => {
            const check = () => {
                if (waited >= maxWait) {
                    reject(new Error('Timeout waiting for dependencies'));
                    return;
                }

                if (window.SteadyUtils && window.API) {
                    resolve();
                    return;
                }

                waited += checkInterval;
                setTimeout(check, checkInterval);
            };

            check();
        });
    }

    /**
     * Load initial dashboard data
     */
    async loadInitialData() {
        try {
            // Get current user
            this.currentUser = window.API.getCurrentUser();
            
            // Load subscription info
            const subscriptionResult = await window.API.getSubscription();
            this.subscription = subscriptionResult.subscription;
            
            // Load leads
            await this.refreshLeadsData();
            
            // Update user info in UI
            this.updateUserInfo();
            
            console.log('✅ Initial data loaded');
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
            throw error;
        }
    }

    /**
     * Refresh leads data from API
     */
    async refreshLeadsData() {
        try {
            const leadsResult = await window.API.getLeads();
            
            if (leadsResult.success) {
                this.leads = leadsResult.all;
                this.stats = leadsResult.stats;
                
                // Update global state
                if (window.dashboardState) {
                    window.dashboardState.leads = this.leads;
                }
                
                // Update UI
                this.updateDashboardStats();
                this.updateRecentLeads();
                this.updateActivity();
                
                // Check for upgrade opportunities
                this.checkUpgradeOpportunities(leadsResult.limitCheck);
                
                console.log(`📊 Refreshed ${this.leads.length} leads`);
            } else {
                throw new Error(leadsResult.error || 'Failed to load leads');
            }
        } catch (error) {
            console.error('❌ Failed to refresh leads:', error);
            window.SteadyUtils?.showToast('Failed to refresh data', 'error');
        }
    }

    /**
     * Update dashboard statistics
     */
    updateDashboardStats() {
        const totalLeads = this.leads.length;
        const contactedLeads = this.leads.filter(lead => 
            lead.status && !lead.status.toLowerCase().includes('new')
        ).length;
        
        // Update stat values
        this.updateElement('totalLeads', totalLeads);
        this.updateElement('currentLeads', totalLeads);
        this.updateElement('contactedLeads', contactedLeads);
        
        // Update progress bar with animation
        const progressPercent = (totalLeads / 50) * 100;
        const progressFill = document.getElementById('leadProgress');
        
        if (progressFill) {
            // Smooth animation
            setTimeout(() => {
                progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
            }, 300);
        }
        
        // Update conversion rate
        const conversionRate = totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0;
        this.updateElement('conversionRate', `${conversionRate}%`);
        
        // Update trend messages
        this.updateTrendMessages(totalLeads, contactedLeads);
        
        // Update lead limit status
        this.updateLeadLimitStatus(totalLeads);
    }

    /**
     * Update trend messages based on data
     */
    updateTrendMessages(totalLeads, contactedLeads) {
        // Total leads trend
        const totalTrendElement = document.querySelector('#totalLeads').parentElement.querySelector('.stat-trend span');
        if (totalTrendElement) {
            if (totalLeads === 0) {
                totalTrendElement.textContent = 'Add your first lead!';
            } else if (totalLeads < 10) {
                totalTrendElement.textContent = `+${totalLeads} this month - great start!`;
            } else {
                totalTrendElement.textContent = `+${totalLeads} this month - you're growing!`;
            }
        }

        // Contacted leads trend
        const contactedTrendElement = document.querySelector('#contactedLeads').parentElement.querySelector('.stat-trend span');
        if (contactedTrendElement) {
            if (contactedLeads === 0) {
                contactedTrendElement.textContent = 'Start reaching out!';
            } else {
                contactedTrendElement.textContent = `Great progress!`;
            }
        }

        // Conversion rate trend
        const conversionTrendElement = document.querySelector('#conversionRate').parentElement.querySelector('.stat-trend span');
        if (conversionTrendElement) {
            if (totalLeads === 0) {
                conversionTrendElement.textContent = 'Add leads to track conversion';
            } else if (contactedLeads === 0) {
                conversionTrendElement.textContent = 'Contact your leads to improve this';
            } else {
                const rate = Math.round((contactedLeads / totalLeads) * 100);
                if (rate >= 70) {
                    conversionTrendElement.textContent = 'Excellent conversion rate!';
                } else if (rate >= 50) {
                    conversionTrendElement.textContent = 'Good conversion rate!';
                } else {
                    conversionTrendElement.textContent = 'Room for improvement!';
                }
            }
        }
    }

    /**
     * Update lead limit status and warnings
     */
    updateLeadLimitStatus(totalLeads) {
        const limitCheck = window.SteadyUtils?.checkLeadLimit(totalLeads);
        
        if (!limitCheck) return;

        // Update progress bar color based on usage
        const progressFill = document.getElementById('leadProgress');
        if (progressFill) {
            if (limitCheck.percentage >= 90) {
                progressFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            } else if (limitCheck.percentage >= 80) {
                progressFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
            } else {
                progressFill.style.background = 'linear-gradient(90deg, #667eea, #764ba2)';
            }
        }

        // Show warnings at specific thresholds
        if (totalLeads === 40 && !sessionStorage.getItem('warned_40')) {
            window.SteadyUtils?.showToast(
                'You have 10 leads remaining. Consider upgrading for unlimited leads!', 
                'upgrade'
            );
            sessionStorage.setItem('warned_40', 'true');
        } else if (totalLeads === 45 && !sessionStorage.getItem('warned_45')) {
            window.SteadyUtils?.showToast(
                'Only 5 leads left! Upgrade to Professional for 1,000 leads.', 
                'upgrade'
            );
            sessionStorage.setItem('warned_45', 'true');
        } else if (totalLeads === 49 && !sessionStorage.getItem('warned_49')) {
            window.SteadyUtils?.showToast(
                'Last lead remaining! Upgrade now to continue growing.', 
                'upgrade'
            );
            sessionStorage.setItem('warned_49', 'true');
        }
    }

    /**
     * Update recent leads list
     */
    updateRecentLeads() {
        const recentLeads = this.leads.slice(-5).reverse(); // Most recent first
        const leadsContainer = document.getElementById('recentLeadsList');
        const emptyState = document.getElementById('emptyState');
        
        if (!leadsContainer) return;

        if (recentLeads.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Create leads HTML
        const leadsHTML = recentLeads.map((lead, index) => `
            <div class="lead-item fade-in" style="animation-delay: ${index * 0.1}s;">
                <div class="lead-avatar">${this.getInitials(lead.name)}</div>
                <div class="lead-info">
                    <div class="lead-name">${this.escapeHtml(lead.name)}</div>
                    <div class="lead-details">
                        ${this.getLeadContactInfo(lead)}
                    </div>
                </div>
                <div class="lead-status ${this.getStatusClass(lead.status)}">
                    <i data-lucide="${this.getStatusIcon(lead.status)}" class="status-icon"></i>
                    ${lead.status || 'New'}
                </div>
            </div>
        `).join('');
        
        leadsContainer.innerHTML = leadsHTML;
        
        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Update recent activity feed
     */
    updateActivity() {
        const activityContainer = document.getElementById('recentActivity');
        if (!activityContainer) return;

        if (this.leads.length === 0) {
            // Show default activity
            activityContainer.innerHTML = `
                <div class="activity-item">
                    <div class="activity-content">
                        <div class="activity-text">Welcome to SteadyManager!</div>
                        <div class="activity-time">Just now</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-content">
                        <div class="activity-text">Account verified successfully</div>
                        <div class="activity-time">2 minutes ago</div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Show recent lead activities
        const recentLeads = this.leads.slice(-3).reverse();
        const activityHTML = recentLeads.map((lead, index) => `
            <div class="activity-item fade-in" style="animation-delay: ${index * 0.1}s;">
                <div class="activity-content">
                    <div class="activity-text">Added ${this.escapeHtml(lead.name)} as a new lead</div>
                    <div class="activity-time">${this.getTimeAgo(lead.created_at)}</div>
                </div>
            </div>
        `).join('');
        
        activityContainer.innerHTML = activityHTML;
    }

    /**
     * Update user information in UI
     */
    updateUserInfo() {
        if (!this.currentUser) return;

        // Update user name
        const userNameElement = document.querySelector('[data-user-name]');
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.name || 'User';
        }

        // Update user initials
        const userInitialsElement = document.querySelector('[data-user-initials]');
        if (userInitialsElement) {
            userInitialsElement.textContent = this.getInitials(this.currentUser.name || 'User');
        }

        // Update subscription status
        const subscriptionElement = document.querySelector('[data-subscription-status]');
        if (subscriptionElement) {
            const tier = this.subscription?.tier || 'FREE';
            subscriptionElement.innerHTML = `
                <i data-lucide="circle" style="width: 8px; height: 8px; fill: currentColor;"></i>
                ${tier === 'FREE' ? 'Free Plan' : tier + ' Plan'}
            `;
        }

        // Update sidebar tier badge
        const tierElement = document.querySelector('[data-user-tier]');
        if (tierElement) {
            tierElement.textContent = this.subscription?.tier === 'FREE' ? 'Free Tier' : this.subscription?.tier + ' Tier';
        }
    }

    /**
     * Check for upgrade opportunities and show appropriate prompts
     */
    checkUpgradeOpportunities(limitCheck) {
        if (!limitCheck) return;

        // Show upgrade prompts based on usage patterns
        const totalLeads = this.leads.length;
        
        // Success-based upgrades
        if (totalLeads >= 25 && !sessionStorage.getItem('success_upgrade_shown')) {
            setTimeout(() => {
                window.SteadyUtils?.showToast(
                    'You\'re doing great with 25+ leads! Ready for advanced analytics?', 
                    'upgrade'
                );
            }, 3000);
            sessionStorage.setItem('success_upgrade_shown', 'true');
        }

        // Engagement-based upgrades
        const contactedLeads = this.leads.filter(lead => 
            lead.status && !lead.status.toLowerCase().includes('new')
        ).length;
        
        if (contactedLeads >= 10 && totalLeads >= 20 && !sessionStorage.getItem('engagement_upgrade_shown')) {
            setTimeout(() => {
                window.SteadyUtils?.showToast(
                    'High engagement detected! Unlock AI insights to optimize further.', 
                    'upgrade'
                );
            }, 5000);
            sessionStorage.setItem('engagement_upgrade_shown', 'true');
        }
    }

    /**
     * Navigate to different pages/sections
     */
    navigateTo(page) {
        // Update active nav state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Handle page-specific logic
        switch (page) {
            case 'dashboard':
                this.showDashboard();
                break;
            case 'leads':
                this.showLeads();
                break;
            case 'settings':
                this.showSettings();
                break;
            default:
                console.warn(`Unknown page: ${page}`);
        }

        this.currentPage = page;
        
        // Track navigation
        window.SteadyUtils?.trackEvent('page_navigation', { page });
    }

    /**
     * Show dashboard page
     */
    showDashboard() {
        // Dashboard is always visible in free tier
        // Just refresh the data
        this.refreshLeadsData();
    }

    /**
     * Show leads page (placeholder for future implementation)
     */
    showLeads() {
        // For now, just show a message
        window.SteadyUtils?.showToast(
            'Full leads management coming soon! For now, use the dashboard.', 
            'success'
        );
    }

    /**
     * Show settings page (placeholder for future implementation)
     */
    showSettings() {
        // For now, just show a message
        window.SteadyUtils?.showToast(
            'Settings panel coming soon! Basic account info is in the top right.', 
            'success'
        );
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation links
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigateTo(page);
            });
        });

        // Locked feature links
        document.querySelectorAll('[data-feature]').forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                const feature = e.currentTarget.dataset.feature;
                window.SteadyUtils?.showUpgradeModal(feature);
            });
        });

        // Add lead buttons
        document.getElementById('addLeadBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleAddLead();
        });

        document.getElementById('addFirstLeadBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleAddLead();
        });

        // User menu (future implementation)
        document.getElementById('userMenu')?.addEventListener('click', (e) => {
            // Placeholder for user menu dropdown
            console.log('User menu clicked - dropdown coming soon!');
        });

        // Window events
        window.addEventListener('focus', () => {
            // Refresh data when window regains focus
            if (this.initialized) {
                this.refreshLeadsData();
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            window.SteadyUtils?.showToast('Connection restored!', 'success');
            this.refreshLeadsData();
        });

        window.addEventListener('offline', () => {
            window.SteadyUtils?.showToast('You\'re offline. Some features may not work.', 'warning');
        });
    }

    /**
     * Handle add lead action
     */
    handleAddLead() {
        // Check lead limit
        const currentLeads = this.leads.length;
        if (currentLeads >= 50) {
            window.SteadyUtils?.showUpgradeModal('lead_limit');
            return;
        }

        // Open add lead modal (handled by existing code)
        const event = new CustomEvent('openAddLeadModal');
        document.dispatchEvent(event);
        
        // Or directly call the function if it's global
        if (typeof openAddLeadModal === 'function') {
            openAddLeadModal();
        }
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Add loading states
        this.addLoadingStates();
        
        // Initialize animations
        this.initializeAnimations();
        
        // Setup responsive handlers
        this.setupResponsiveHandlers();
    }

    /**
     * Add loading states to elements
     */
    addLoadingStates() {
        const loadingElements = document.querySelectorAll('.stat-card, .leads-section, .sidebar-panel');
        loadingElements.forEach(el => {
            el.classList.add('loading');
            setTimeout(() => {
                el.classList.remove('loading');
            }, 1000 + Math.random() * 500); // Staggered loading
        });
    }

    /**
     * Initialize animations
     */
    initializeAnimations() {
        // Animate stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('fade-in');
            }, index * 150);
        });

        // Animate action buttons
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach((btn, index) => {
            setTimeout(() => {
                btn.classList.add('scale-in');
            }, 500 + (index * 100));
        });
    }

    /**
     * Setup responsive handlers
     */
    setupResponsiveHandlers() {
        // Handle mobile sidebar
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Handle resize events
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }

    /**
     * Close mobile sidebar
     */
    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Close mobile sidebar on desktop
        if (window.innerWidth > 768) {
            this.closeMobileSidebar();
        }
    }

    /**
     * Setup periodic updates
     */
    setupPeriodicUpdates() {
        // Refresh data every 5 minutes
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.refreshLeadsData();
            }
        }, 5 * 60 * 1000);

        // Update time stamps every minute
        setInterval(() => {
            this.updateTimeStamps();
        }, 60 * 1000);
    }

    /**
     * Update time stamps in activity feed
     */
    updateTimeStamps() {
        const timeElements = document.querySelectorAll('.activity-time');
        timeElements.forEach(el => {
            const text = el.textContent;
            if (text.includes('minute')) {
                const minutes = parseInt(text) + 1;
                el.textContent = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            } else if (text === 'Just now') {
                el.textContent = '1 minute ago';
            }
        });
    }

    /**
     * Utility: Update element text content safely
     */
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    /**
     * Utility: Get initials from name
     */
    getInitials(name) {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';
    }

    /**
     * Utility: Get lead contact info HTML
     */
    getLeadContactInfo(lead) {
        if (lead.email) {
            return `<i data-lucide="mail" class="lead-details-icon"></i>${this.escapeHtml(lead.email)}`;
        } else if (lead.phone) {
            return `<i data-lucide="phone" class="lead-details-icon"></i>${this.escapeHtml(lead.phone)}`;
        } else if (lead.company) {
            return `<i data-lucide="building" class="lead-details-icon"></i>${this.escapeHtml(lead.company)}`;
        } else {
            return '<i data-lucide="user" class="lead-details-icon"></i>No contact info';
        }
    }

    /**
     * Utility: Get status CSS class
     */
    getStatusClass(status) {
        if (!status) return 'status-new';
        const s = status.toLowerCase();
        if (s.includes('new')) return 'status-new';
        if (s.includes('contact')) return 'status-contacted';
        if (s.includes('qualified')) return 'status-qualified';
        return 'status-new';
    }

    /**
     * Utility: Get status icon
     */
    getStatusIcon(status) {
        if (!status) return 'circle-dot';
        const s = status.toLowerCase();
        if (s.includes('new')) return 'circle-dot';
        if (s.includes('contact')) return 'phone';
        if (s.includes('qualified')) return 'check-circle';
        return 'circle-dot';
    }

    /**
     * Utility: Get time ago string
     */
    getTimeAgo(dateString) {
        if (!dateString) return 'Recently';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    /**
     * Utility: Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Utility: Debounce function
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Get current dashboard state
     */
    getState() {
        return {
            currentPage: this.currentPage,
            currentUser: this.currentUser,
            leads: this.leads,
            stats: this.stats,
            subscription: this.subscription,
            initialized: this.initialized
        };
    }

    /**
     * Handle lead creation success (called by AddLead.js)
     */
    onLeadCreated(lead) {
        // Refresh data to show new lead
        this.refreshLeadsData();
        
        // Show success with upgrade hints
        const limitCheck = window.SteadyUtils?.checkLeadLimit(this.leads.length + 1);
        if (limitCheck?.shouldShowUpgrade) {
            setTimeout(() => {
                window.SteadyUtils?.showToast(
                    `Great job! You now have ${this.leads.length + 1} leads. Consider upgrading for advanced features!`,
                    'upgrade'
                );
            }, 2000);
        }
    }

    /**
     * Handle lead update success
     */
    onLeadUpdated(lead) {
        this.refreshLeadsData();
    }

    /**
     * Handle lead deletion success
     */
    onLeadDeleted(leadId) {
        this.refreshLeadsData();
    }
}

// Initialize and export
window.DashboardController = new DashboardController();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardController;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialization will be handled by the main script in index.html
    });
} else {
    // DOM already loaded
    // Initialization will be handled by the main script in index.html
}