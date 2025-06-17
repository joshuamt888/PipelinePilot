/**
 * 🎯 CLEAN DASHBOARD CONTROLLER - ICONS FIXED
 * 
 * Clean, intentional design focused on data visualization
 * Animations ONLY on user interaction - no annoying auto-animations
 * 
 * @version 3.0.0 - CLEAN EDITION WITH WORKING ICONS
 */

class DashboardController {
    constructor() {
        this.state = {
            user: null,
            leads: [],
            statistics: {},
            refreshing: false
        };
        
        // Debounced refresh function using SteadyUtils
        this.debouncedRefresh = SteadyUtils.debounce(() => this.refresh(), 1000);
        
        // Real-time update listeners
        this.setupAPIListeners();
    }

    // 🚀 MAIN INITIALIZATION
    async init() {
        try {
            console.log('🚀 Dashboard loading...');
            
            // 1. Build the clean UI
            this.buildUI();
            
            // 2. Load data from API
            await this.loadData();
            
            // 3. Update components
            this.updateComponents();
            
            // 4. Setup interaction events
            this.setupEvents();
            
            // 5. Simple entrance - just fade in
            this.showDashboard();
            
            // 6. Success notification
            SteadyUtils.showToast('Dashboard loaded', 'success', { duration: 2000 });
            
            console.log('✅ Dashboard ready');
            
        } catch (error) {
            console.error('❌ Dashboard failed:', error);
            this.showError();
            SteadyUtils.showToast('Dashboard failed to load', 'error');
        }
    }

    // 🎯 SETUP API REAL-TIME LISTENERS
    setupAPIListeners() {
        API.on('lead:created', (lead) => {
            this.state.leads.push(lead);
            this.updateComponents();
            SteadyUtils.showToast(`New lead: ${lead.name}`, 'success', { duration: 3000 });
        });

        API.on('lead:updated', (lead) => {
            const index = this.state.leads.findIndex(l => l.id === lead.id);
            if (index !== -1) {
                this.state.leads[index] = lead;
                this.updateComponents();
            }
        });

        API.on('lead:deleted', (leadId) => {
            this.state.leads = this.state.leads.filter(l => l.id !== leadId);
            this.updateComponents();
        });

        API.on('connection:lost', () => {
            SteadyUtils.showToast('Working offline', 'warning', { duration: 4000 });
        });

        API.on('connection:restored', () => {
            SteadyUtils.showToast('Back online', 'success');
            this.debouncedRefresh();
        });
    }

    // 🎨 BUILD CLEAN UI - NO BULLSHIT
    buildUI() {
        const container = document.getElementById('mainContent');
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-container">
                <!-- 📊 STATS ROW -->
                <section class="stats-section">
                    <div class="stats-grid">
                        <div class="stat-card" data-stat="total">
                            <div class="stat-content">
                                <div class="stat-number" id="totalLeads">0</div>
                                <div class="stat-label">Total Leads</div>
                            </div>
                            <div class="stat-icon">
                                <i data-lucide="users"></i>
                            </div>
                        </div>

                        <div class="stat-card" data-stat="contacted">
                            <div class="stat-content">
                                <div class="stat-number" id="contactedLeads">0</div>
                                <div class="stat-label">Contacted</div>
                            </div>
                            <div class="stat-icon">
                                <i data-lucide="phone"></i>
                            </div>
                        </div>

                        <div class="stat-card" data-stat="conversion">
                            <div class="stat-content">
                                <div class="stat-number" id="conversionRate">0%</div>
                                <div class="stat-label">Conversion</div>
                            </div>
                            <div class="stat-icon">
                                <i data-lucide="trending-up"></i>
                            </div>
                        </div>

                        <div class="stat-card" data-stat="quality">
                            <div class="stat-content">
                                <div class="stat-number" id="avgQuality">0</div>
                                <div class="stat-label">Avg Quality</div>
                            </div>
                            <div class="stat-icon">
                                <i data-lucide="star"></i>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 🎯 ACTIONS ROW -->
                <section class="actions-section">
                    <div class="actions-row">
                        <button class="action-btn primary" id="addLeadBtn">
                            <i data-lucide="plus"></i>
                            <span>Add Lead</span>
                        </button>
                        
                        <button class="action-btn secondary" id="pipelineBtn">
                            <i data-lucide="git-branch"></i>
                            <span>Pipeline</span>
                        </button>
                        
                        <button class="action-btn secondary" id="refreshBtn">
                            <i data-lucide="refresh-cw"></i>
                            <span>Refresh</span>
                        </button>
                        
                        <button class="action-btn secondary" id="settingsBtn">
                            <i data-lucide="settings"></i>
                            <span>Settings</span>
                        </button>
                    </div>
                </section>

                <!-- 📊 MAIN CONTENT -->
                <section class="content-section">
                    <div class="content-grid">
                        <!-- PIPELINE OVERVIEW -->
                        <div class="dashboard-card pipeline-card">
                            <div class="card-header">
                                <h3 class="card-title">Pipeline Overview</h3>
                                <button class="card-btn" id="pipelineFullBtn">
                                    <i data-lucide="external-link"></i>
                                </button>
                            </div>
                            <div class="card-content">
                                <div class="pipeline-grid">
                                    <div class="pipeline-column" data-status="cold">
                                        <div class="column-header">
                                            <span class="column-title">Cold</span>
                                            <span class="column-count" id="coldCount">0</span>
                                        </div>
                                        <div class="column-leads" id="coldLeads">
                                            <div class="empty-state">No leads</div>
                                        </div>
                                    </div>

                                    <div class="pipeline-column" data-status="warm">
                                        <div class="column-header">
                                            <span class="column-title">Warm</span>
                                            <span class="column-count" id="warmCount">0</span>
                                        </div>
                                        <div class="column-leads" id="warmLeads">
                                            <div class="empty-state">No leads</div>
                                        </div>
                                    </div>

                                    <div class="pipeline-column" data-status="contacted">
                                        <div class="column-header">
                                            <span class="column-title">Contacted</span>
                                            <span class="column-count" id="contactedCount">0</span>
                                        </div>
                                        <div class="column-leads" id="contactedPipelineLeads">
                                            <div class="empty-state">No leads</div>
                                        </div>
                                    </div>

                                    <div class="pipeline-column" data-status="qualified">
                                        <div class="column-header">
                                            <span class="column-title">Qualified</span>
                                            <span class="column-count" id="qualifiedCount">0</span>
                                        </div>
                                        <div class="column-leads" id="qualifiedLeads">
                                            <div class="empty-state">No leads</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ACTIVITY FEED -->
                        <div class="dashboard-card activity-card">
                            <div class="card-header">
                                <h3 class="card-title">Recent Activity</h3>
                                <button class="card-btn" id="activityRefreshBtn">
                                    <i data-lucide="refresh-cw"></i>
                                </button>
                            </div>
                            <div class="card-content">
                                <div class="activity-feed" id="activityFeed">
                                    <div class="activity-empty">No recent activity</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 💡 INSIGHTS -->
                <section class="insights-section">
                    <div class="dashboard-card insights-card">
                        <div class="card-header">
                            <h3 class="card-title">Insights</h3>
                            <button class="card-btn" id="insightsRefreshBtn">
                                <i data-lucide="zap"></i>
                            </button>
                        </div>
                        <div class="card-content">
                            <div class="insights-list" id="insightsGrid">
                                <div class="insight-item">
                                    <div class="insight-content">
                                        <div class="insight-title">Loading insights...</div>
                                        <div class="insight-text">Analyzing your data...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;

        // Add clean styles
        this.addCleanStyles();
        
        // Initialize icons PROPERLY
        this.initializeIcons();
    }

    // 🎯 PROPERLY INITIALIZE LUCIDE ICONS
    initializeIcons() {
        if (window.lucide) {
            // Create icons immediately
            window.lucide.createIcons();
            
            // Also reinitialize after a small delay to catch any late renders
            setTimeout(() => {
                window.lucide.createIcons();
                console.log('🎨 Icons initialized');
            }, 100);
        } else {
            console.warn('Lucide not loaded - adding fallback icons');
            
            // Fallback: add text icons
            this.addFallbackIcons();
        }
    }

    // 🔄 FALLBACK ICONS IF LUCIDE FAILS
    addFallbackIcons() {
        const iconMappings = {
            'users': '👥',
            'phone': '📞', 
            'trending-up': '📈',
            'star': '⭐',
            'plus': '+',
            'git-branch': '🌿',
            'refresh-cw': '🔄',
            'settings': '⚙️',
            'external-link': '↗️',
            'zap': '⚡'
        };

        document.querySelectorAll('[data-lucide]').forEach(element => {
            const iconName = element.getAttribute('data-lucide');
            if (iconMappings[iconName]) {
                element.innerHTML = iconMappings[iconName];
                element.style.fontSize = '18px';
                element.style.display = 'flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'center';
            }
        });
        
        console.log('🎨 Fallback icons added');
    }

    // 📊 LOAD DATA FROM API
    async loadData() {
        try {
            const dashboardData = await API.getDashboardData();
            
            if (dashboardData.success) {
                this.state.leads = dashboardData.leads || [];
                this.state.statistics = dashboardData.statistics || {};
                this.state.user = dashboardData.user || null;
                
                console.log(`📊 Loaded ${this.state.leads.length} leads`);
            } else {
                throw new Error('Failed to load dashboard data');
            }
            
        } catch (error) {
            console.error('Failed to load data:', error);
            SteadyUtils.showToast(API.formatError(error), 'error', { duration: 5000 });
            throw error;
        }
    }

    // 🔄 UPDATE COMPONENTS
    updateComponents() {
        this.updateStats();
        this.updatePipeline();
        this.updateActivity();
        this.updateInsights();
    }

    // 📊 UPDATE STATS - SIMPLE COUNTERS
    updateStats() {
        const stats = this.calculateStats();
        
        // Simple counter animations - no fancy easing
        SteadyUtils.animateCounter('#totalLeads', stats.totalLeads, { duration: 800 });
        SteadyUtils.animateCounter('#contactedLeads', stats.contactedLeads, { duration: 800 });
        SteadyUtils.animateCounter('#conversionRate', stats.conversionRate, { suffix: '%', duration: 800 });
        SteadyUtils.animateCounter('#avgQuality', stats.avgQuality, { decimals: 1, duration: 800 });
    }

    // 🎯 UPDATE PIPELINE - CLEAN AND SIMPLE
    updatePipeline() {
        const grouped = this.groupLeadsByStatus();
        
        // Update counts
        Object.keys(grouped).forEach(status => {
            const countEl = document.getElementById(`${status}Count`);
            if (countEl) {
                countEl.textContent = grouped[status].length;
            }
        });

        // Update lead lists
        Object.keys(grouped).forEach(status => {
            const containerEl = document.getElementById(`${status}Leads`);
            if (!containerEl) return;

            const leads = grouped[status];
            
            if (leads.length === 0) {
                containerEl.innerHTML = '<div class="empty-state">No leads</div>';
                return;
            }

            // Show first 3 leads - simple and clean
            const leadsHTML = leads.slice(0, 3).map(lead => `
                <div class="lead-card" data-lead-id="${lead.id}">
                    <div class="lead-name">${SteadyUtils.escapeHtml(lead.name)}</div>
                    ${lead.company ? `<div class="lead-company">${SteadyUtils.escapeHtml(lead.company)}</div>` : ''}
                </div>
            `).join('');

            containerEl.innerHTML = leadsHTML;
            
            // Re-initialize icons for new content
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });
    }

    // 📊 UPDATE ACTIVITY - NO ANIMATIONS
    async updateActivity() {
        const activityFeed = document.getElementById('activityFeed');
        if (!activityFeed) return;

        try {
            const activityData = await API.getActivity(5);
            const activities = activityData.activities || this.generateActivities();
            
            if (activities.length === 0) {
                activityFeed.innerHTML = '<div class="activity-empty">No recent activity</div>';
                return;
            }

            const activitiesHTML = activities.slice(0, 5).map(activity => `
                <div class="activity-item">
                    <div class="activity-content">
                        <div class="activity-text">${SteadyUtils.escapeHtml(activity.text || activity.description)}</div>
                        <div class="activity-time">${SteadyUtils.formatDate(activity.timestamp || activity.created_at, 'relative')}</div>
                    </div>
                </div>
            `).join('');

            activityFeed.innerHTML = activitiesHTML;
            
            // Re-initialize icons
            if (window.lucide) {
                window.lucide.createIcons();
            }

        } catch (error) {
            const activities = this.generateActivities();
            this.renderActivities(activities);
        }
    }

    // 💡 UPDATE INSIGHTS - CLEAN LIST
    updateInsights() {
        const insights = this.generateInsights();
        const insightsGrid = document.getElementById('insightsGrid');
        
        if (!insightsGrid) return;

        const insightsHTML = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-content">
                    <div class="insight-title">${insight.title}</div>
                    <div class="insight-text">${SteadyUtils.escapeHtml(insight.text)}</div>
                </div>
            </div>
        `).join('');

        insightsGrid.innerHTML = insightsHTML;
    }

    // 🎯 SIMPLE ENTRANCE - JUST FADE IN
    showDashboard() {
        const container = document.querySelector('.dashboard-container');
        if (container) {
            container.style.opacity = '0';
            container.style.transform = 'translateY(10px)';
            
            requestAnimationFrame(() => {
                container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            });
        }
    }

    // 🎛️ SETUP INTERACTION EVENTS
    setupEvents() {
        // Add Lead Button
        const addLeadBtn = document.getElementById('addLeadBtn');
        if (addLeadBtn) {
            addLeadBtn.addEventListener('click', () => {
                window.loadPage && window.loadPage('leads');
            });
        }

        // Pipeline Button
        const pipelineBtn = document.getElementById('pipelineBtn');
        if (pipelineBtn) {
            pipelineBtn.addEventListener('click', () => {
                window.loadPage && window.loadPage('pipeline');
            });
        }

        // Settings Button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                window.loadPage && window.loadPage('settings');
            });
        }

        // Refresh Button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.debouncedRefresh();
            });
        }

        // Card interactions - simple clicks
        document.querySelectorAll('.stat-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                const pages = ['leads', 'leads', 'pipeline', 'leads'];
                window.loadPage && window.loadPage(pages[index]);
            });
        });

        // Pipeline full view
        const pipelineFullBtn = document.getElementById('pipelineFullBtn');
        if (pipelineFullBtn) {
            pipelineFullBtn.addEventListener('click', () => {
                window.loadPage && window.loadPage('pipeline');
            });
        }

        // Activity refresh
        const activityRefreshBtn = document.getElementById('activityRefreshBtn');
        if (activityRefreshBtn) {
            activityRefreshBtn.addEventListener('click', () => {
                this.updateActivity();
            });
        }

        // Insights refresh
        const insightsRefreshBtn = document.getElementById('insightsRefreshBtn');
        if (insightsRefreshBtn) {
            insightsRefreshBtn.addEventListener('click', () => {
                this.updateInsights();
            });
        }
    }

    // 🔄 REFRESH
    async refresh() {
        if (this.state.refreshing) return;
        
        try {
            this.state.refreshing = true;
            
            await this.loadData();
            this.updateComponents();
            
            SteadyUtils.showToast('Dashboard refreshed', 'success', { duration: 2000 });
            
        } catch (error) {
            console.error('❌ Refresh failed:', error);
            SteadyUtils.showToast(API.formatError(error), 'error');
        } finally {
            this.state.refreshing = false;
        }
    }

    // 📊 CALCULATE STATS
    calculateStats() {
        const totalLeads = this.state.leads.length;
        const contactedLeads = this.state.leads.filter(lead => 
            lead.type === 'contacted' || lead.type === 'qualified' || 
            lead.status === 'contacted' || lead.status === 'qualified'
        ).length;
        
        const conversionRate = totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0;
        const avgQuality = totalLeads > 0
            ? (this.state.leads.reduce((sum, lead) => sum + (lead.quality_score || lead.qualityScore || 5), 0) / totalLeads)
            : 5.0;

        return {
            totalLeads,
            contactedLeads,
            conversionRate,
            avgQuality: parseFloat(avgQuality.toFixed(1))
        };
    }

    // 🎯 GROUP LEADS
    groupLeadsByStatus() {
        const groups = { cold: [], warm: [], contacted: [], qualified: [] };

        this.state.leads.forEach(lead => {
            const status = lead.type || lead.status || 'cold';
            if (groups[status]) {
                groups[status].push(lead);
            } else {
                groups.cold.push(lead);
            }
        });

        return groups;
    }

    // 📊 GENERATE ACTIVITIES
    generateActivities() {
        return this.state.leads
            .slice(0, 10)
            .map(lead => ({
                text: `Added ${lead.name}${lead.company ? ` from ${lead.company}` : ''} as ${lead.type || lead.status || 'new'} lead`,
                timestamp: lead.created_at || new Date().toISOString()
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // 💡 GENERATE INSIGHTS
    generateInsights() {
        const stats = this.calculateStats();
        const insights = [];

        if (stats.totalLeads > 0) {
            if (stats.conversionRate > 20) {
                insights.push({
                    title: 'Excellent Conversion',
                    text: `Your ${stats.conversionRate}% conversion rate is outstanding! Keep focusing on quality leads.`
                });
            } else if (stats.conversionRate > 10) {
                insights.push({
                    title: 'Good Progress',
                    text: `Your ${stats.conversionRate}% conversion rate is solid. Try following up more frequently.`
                });
            } else {
                insights.push({
                    title: 'Improve Follow-ups',
                    text: 'Consider reaching out to your leads more consistently to boost conversions.'
                });
            }

            if (stats.avgQuality > 7) {
                insights.push({
                    title: 'High Quality Leads',
                    text: `Your leads average ${stats.avgQuality}/10 quality score. Great work on qualification!`
                });
            }

            const goal = this.state.user?.subscriptionTier === 'FREE' ? 50 : 1000;
            const progress = Math.round((stats.totalLeads / goal) * 100);
            
            insights.push({
                title: 'Monthly Progress',
                text: `You're ${progress}% toward your goal of ${goal} leads this month.`
            });

        } else {
            insights.push({
                title: 'Get Started',
                text: 'Add your first lead to start tracking your sales pipeline and unlock insights!'
            });
        }

        return insights;
    }

    showError() {
        const container = document.getElementById('mainContent');
        if (!container) return;

        container.innerHTML = `
            <div class="error-container">
                <h2>Dashboard Error</h2>
                <p>Failed to load dashboard. Please try refreshing.</p>
                <button onclick="location.reload()" class="btn btn-primary">Refresh Page</button>
            </div>
        `;
    }

    // 🎨 CLEAN STYLES - NO BULLSHIT
    addCleanStyles() {
        if (document.getElementById('dashboardStyles')) return;

        const style = document.createElement('style');
        style.id = 'dashboardStyles';
        style.textContent = `
            /* 🎯 CLEAN DASHBOARD STYLES - NO ANIMATIONS */
            .dashboard-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 2rem;
                display: flex;
                flex-direction: column;
                gap: 2rem;
            }

            /* 📊 STATS SECTION */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
            }

            .stat-card {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .stat-card:hover {
                border-color: #667eea;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
                transform: translateY(-1px);
            }

            .stat-content {
                flex: 1;
            }

            .stat-number {
                font-size: 2.5rem;
                font-weight: 700;
                color: #1a202c;
                margin-bottom: 0.25rem;
                line-height: 1;
            }

            .stat-label {
                font-size: 0.875rem;
                font-weight: 500;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .stat-icon {
                width: 48px;
                height: 48px;
                background: rgba(102, 126, 234, 0.1);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #667eea;
                border: 1px solid rgba(102, 126, 234, 0.2);
            }

            .stat-icon i {
                width: 24px;
                height: 24px;
            }

            /* 🎯 ACTIONS SECTION */
            .actions-row {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }

            .action-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.25rem;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                color: #374151;
                font-weight: 500;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
            }

            .action-btn:hover {
                border-color: #667eea;
                background: #f8fafc;
                transform: translateY(-1px);
            }

            .action-btn.primary {
                background: #667eea;
                border-color: #667eea;
                color: white;
            }

            .action-btn.primary:hover {
                background: #5a67d8;
                transform: translateY(-1px);
            }

            .action-btn i {
                width: 16px;
                height: 16px;
            }

            /* 📊 CONTENT GRID */
            .content-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 2rem;
            }

            @media (max-width: 1024px) {
                .content-grid {
                    grid-template-columns: 1fr;
                }
            }

            /* 📋 CARDS */
            .dashboard-card {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
            }

            .card-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .card-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: #1a202c;
                margin: 0;
            }

            .card-btn {
                width: 32px;
                height: 32px;
                border: none;
                background: #f8fafc;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #64748b;
                transition: all 0.2s ease;
            }

            .card-btn:hover {
                background: #667eea;
                color: white;
            }

            .card-btn i {
                width: 16px;
                height: 16px;
            }

            .card-content {
                padding: 1.5rem;
            }

            /* 🏗️ PIPELINE */
            .pipeline-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 1rem;
            }

            .pipeline-column {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                min-height: 200px;
            }

            .column-header {
                padding: 1rem;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: white;
            }

            .column-title {
                font-weight: 600;
                font-size: 0.875rem;
                color: #374151;
            }

            .column-count {
                background: #667eea;
                color: white;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .column-leads {
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .empty-state {
                color: #9ca3af;
                font-size: 0.875rem;
                text-align: center;
                padding: 2rem 0;
            }

            .lead-card {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .lead-card:hover {
                border-color: #667eea;
                transform: translateY(-1px);
            }

            .lead-name {
                font-weight: 600;
                font-size: 0.875rem;
                color: #1a202c;
                margin-bottom: 0.25rem;
            }

            .lead-company {
                font-size: 0.75rem;
                color: #64748b;
            }

            /* 📊 ACTIVITY FEED */
            .activity-feed {
                max-height: 300px;
                overflow-y: auto;
            }

            .activity-item {
                padding: 1rem 0;
                border-bottom: 1px solid #f1f5f9;
            }

            .activity-item:last-child {
                border-bottom: none;
            }

            .activity-content {
                flex: 1;
            }

            .activity-text {
                font-weight: 500;
                color: #374151;
                margin-bottom: 0.25rem;
                font-size: 0.875rem;
            }

            .activity-time {
                font-size: 0.75rem;
                color: #9ca3af;
            }

            .activity-empty {
                color: #9ca3af;
                font-size: 0.875rem;
                text-align: center;
                padding: 3rem 0;
            }

            /* 💡 INSIGHTS */
            .insights-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .insight-item {
                padding: 1.25rem;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }

            .insight-content {
                flex: 1;
            }

            .insight-title {
                font-weight: 600;
                color: #1a202c;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }

            .insight-text {
                color: #64748b;
                font-size: 0.875rem;
                line-height: 1.5;
            }

            /* 📱 RESPONSIVE */
            @media (max-width: 768px) {
                .dashboard-container {
                    padding: 1rem;
                    gap: 1.5rem;
                }

                .stats-grid {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .actions-row {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                }

                .pipeline-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                }

                .card-header {
                    padding: 1rem;
                }

                .card-content {
                    padding: 1rem;
                }

                .stat-card {
                    flex-direction: column;
                    text-align: center;
                    gap: 1rem;
                }
            }

            /* 🎯 ERROR STATE */
            .error-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                text-align: center;
                padding: 2rem;
            }

            .error-container h2 {
                color: #ef4444;
                margin-bottom: 1rem;
            }

            .error-container p {
                color: #64748b;
                margin-bottom: 2rem;
                max-width: 400px;
            }

            .btn {
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                border: none;
                transition: all 0.2s ease;
            }

            .btn-primary {
                background: #667eea;
                color: white;
            }

            .btn-primary:hover {
                background: #5a67d8;
                transform: translateY(-1px);
            }

            /* 🎨 DARK THEME SUPPORT */
            [data-theme="dark"] .dashboard-container {
                color: #e2e8f0;
            }

            [data-theme="dark"] .stat-card,
            [data-theme="dark"] .dashboard-card,
            [data-theme="dark"] .action-btn {
                background: #1e293b;
                border-color: #334155;
                color: #e2e8f0;
            }

            [data-theme="dark"] .stat-card:hover,
            [data-theme="dark"] .action-btn:hover {
                border-color: #667eea;
                background: #334155;
            }

            [data-theme="dark"] .stat-icon {
                background: rgba(102, 126, 234, 0.15);
                border-color: rgba(102, 126, 234, 0.3);
                color: #94a3b8;
            }

            [data-theme="dark"] .pipeline-column {
                background: #334155;
                border-color: #475569;
            }

            [data-theme="dark"] .column-header {
                background: #1e293b;
                border-color: #475569;
            }

            [data-theme="dark"] .lead-card {
                background: #1e293b;
                border-color: #475569;
            }

            [data-theme="dark"] .insight-item {
                background: #334155;
                border-color: #475569;
            }

            [data-theme="dark"] .card-btn {
                background: #334155;
                color: #94a3b8;
            }

            [data-theme="dark"] .card-btn:hover {
                background: #667eea;
                color: white;
            }

            [data-theme="dark"] .empty-state,
            [data-theme="dark"] .activity-empty {
                color: #64748b;
            }

            [data-theme="dark"] .stat-number,
            [data-theme="dark"] .card-title,
            [data-theme="dark"] .insight-title,
            [data-theme="dark"] .lead-name {
                color: #f1f5f9;
            }

            [data-theme="dark"] .stat-label,
            [data-theme="dark"] .column-title,
            [data-theme="dark"] .activity-text {
                color: #cbd5e1;
            }

            [data-theme="dark"] .lead-company,
            [data-theme="dark"] .activity-time,
            [data-theme="dark"] .insight-text {
                color: #94a3b8;
            }
        `;

        document.head.appendChild(style);
    }

    // 🧹 CLEANUP
    destroy() {
        const styles = document.getElementById('dashboardStyles');
        if (styles) {
            styles.remove();
        }

        if (this.debouncedRefresh && this.debouncedRefresh.cancel) {
            this.debouncedRefresh.cancel();
        }

        console.log('✅ Dashboard cleaned up');
    }

    // 🌍 PUBLIC API METHODS
    async forceRefresh() {
        return this.refresh();
    }

    getStats() {
        return this.calculateStats();
    }

    getLeads() {
        return [...this.state.leads];
    }

    getState() {
        return { ...this.state };
    }
}

// 🌍 EXPORT FOR ORCHESTRATOR
window.DashboardController = {
    init: async function() {
        console.log('🚀 Clean Dashboard Controller loading...');
        const dashboard = new DashboardController();
        await dashboard.init();
        
        window.dashboardInstance = dashboard;
        return dashboard;
    }
};

// 🎯 DEBUG HELPERS (development only)
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
    window.dashboardDebug = {
        refresh: () => window.dashboardInstance?.refresh(),
        state: () => window.dashboardInstance?.getState(),
        stats: () => window.dashboardInstance?.getStats(),
        leads: () => window.dashboardInstance?.getLeads()
    };
}

console.log('🎯 CLEAN DASHBOARD CONTROLLER LOADED - ICONS FIXED');
console.log('✨ Icons will show: 👥📞📈⭐ or Lucide equivalents');

/**
 * 🎯 WHAT'S FIXED:
 * 
 * ✅ Proper icon initialization with initializeIcons()
 * ✅ Fallback emoji icons if Lucide fails to load
 * ✅ Re-initialization of icons when content updates
 * ✅ Better icon styling with subtle backgrounds
 * ✅ Console logging to show what's happening
 * 
 * Icons you'll see:
 * 👥 Users icon → Total Leads
 * 📞 Phone icon → Contacted  
 * 📈 Trending up → Conversion
 * ⭐ Star icon → Avg Quality
 * + Plus → Add Lead
 * 🌿 Branch → Pipeline
 * 🔄 Refresh → Refresh
 * ⚙️ Settings → Settings
 * ↗️ External → External links
 * ⚡ Zap → Insights
 */