window.DashboardModule = {
    // STATE - Minimal like Pipeline
    state: {
        leads: [],
        tasks: [],
        stats: null,
        profile: null,
        subscriptionInfo: null,
        container: 'dashboard-content',
        modalSearchTerm: ''
    },

    // INIT - Sharp and direct
    async dashboard_init(targetContainer = 'dashboard-content') {
        console.log('Dashboard module loading');

        this.state.container = targetContainer;

        // Fade out container immediately before loading data
        const container = document.getElementById(this.state.container);
        if (container) container.style.opacity = '0';

        try {
            await this.dashboard_loadData();
            this.dashboard_render();
            console.log('Dashboard module ready');
        } catch (error) {
            console.error('Dashboard init failed:', error);
            this.dashboard_showError('Failed to load dashboard');
        }
    },

    // DATA LOADING - Single Promise.all like Pipeline
    async dashboard_loadData() {
        // Check cache first for each data type
        const cachedStats = AppCache.get('dashboard-stats');
        const cachedLeads = AppCache.get('leads');
        const cachedTasks = AppCache.get('tasks');
        const cachedProfile = AppCache.get('profile');

        // If all data is cached, use it (instant load!)
        if (cachedStats && cachedLeads && cachedTasks && cachedProfile) {
            this.state.stats = cachedStats;
            this.state.leads = (cachedLeads.all || [])
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            this.state.tasks = cachedTasks
                .sort((a, b) => new Date(a.due_date || '9999') - new Date(b.due_date || '9999'));
            this.state.profile = cachedProfile;
            console.log('[Dashboard] ⚡ Loaded from cache (instant)');
            return;
        }

        // Cache miss - fetch from API
        console.log('[Dashboard] 🔄 Cache miss - fetching from API');
        const [stats, leadsData, tasks, profile] = await Promise.all([
            API.getBasicStats(),
            API.getLeads(),
            API.getTasks(),
            API.getProfile()
        ]);

        // Store in cache
        AppCache.set('dashboard-stats', stats);
        AppCache.set('leads', leadsData);
        AppCache.set('tasks', tasks);
        AppCache.set('profile', profile);

        this.state.stats = stats;
        this.state.leads = (leadsData.all || [])
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        this.state.tasks = tasks
            .sort((a, b) => new Date(a.due_date || '9999') - new Date(b.due_date || '9999'));
        this.state.profile = profile;
    },

    // VALUE FORMATTER - Cap at $1B
    dashboard_formatValue(value) {
        if (!value || value === 0) return '$0';
        if (value >= 1000000000) return '$1,000,000,000+';
        return '$' + value.toLocaleString();
    },

    // RENDER - Single innerHTML write like Pipeline
    async dashboard_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Clear container opacity to prevent snap on re-render
        container.style.opacity = '0';

        const isFreeTier = this.state.profile.user_type === 'free';

        // Await async render functions first
        const metricsHtml = await this.dashboard_renderMetrics();

        container.innerHTML = `
            ${this.dashboard_renderStyles()}
            <div class="dashboard-container" style="opacity: 0;">
                ${metricsHtml}
                ${this.dashboard_renderPipeline()}
                <div class="dashboard-split">
                    ${this.dashboard_renderLeadsList()}
                    ${this.dashboard_renderTasksList()}
                </div>
                ${this.dashboard_renderActivityFeed()}
                ${isFreeTier ? this.dashboard_renderUpgradeCTA() : ''}
            </div>
        `;

        // Force a reflow before animation
        const dashboardContainer = container.querySelector('.dashboard-container');
        if (dashboardContainer) {
            // Fade outer container back to visible
            container.style.opacity = '1';

            // Force browser to acknowledge the opacity: 0 state
            void dashboardContainer.offsetHeight;

            // NOW add transition and fade in
            dashboardContainer.style.transition = 'opacity 0.5s ease';

            // Use setTimeout to ensure transition is registered
            setTimeout(() => {
                dashboardContainer.style.opacity = '1';
            }, 10);
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_attachEvents();
    },

    // METRICS - Clean and efficient with value cap
    async dashboard_renderMetrics() {
        const stats = this.state.stats;
        const profile = this.state.profile;

        // Get actual lead count from API (counts ALL leads, not just loaded ones)
        const subscriptionInfo = await API.getUserSubscriptionInfo();
        this.state.subscriptionInfo = subscriptionInfo; // Cache it for modals
        const currentLeads = subscriptionInfo.currentLeads;
        const leadLimit = subscriptionInfo.leadLimit;
        const percentage = Math.round((currentLeads / leadLimit) * 100);
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekLeads = this.state.leads.filter(l => 
            new Date(l.created_at) >= weekAgo
        ).length;
        
        const totalClosed = this.state.leads.filter(l => l.status === 'closed').length;
        const totalLost = this.state.leads.filter(l => l.status === 'lost').length;
        const totalOutcome = totalClosed + totalLost;
        const conversionRate = totalOutcome > 0 ? Math.round((totalClosed / totalOutcome) * 100) : 0;
        
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.state.tasks.filter(t =>
            t.due_date === today && t.status === 'pending'
        ).length;
        const overdueTasks = this.state.tasks.filter(t =>
            t.due_date && t.due_date < today && t.status === 'pending'
        ).length;
        const totalTasksDue = todayTasks + overdueTasks;
        
        return `
            <div class="dashboard-metrics">
                <div class="dashboard-metric-card dashboard-metric-1 ${percentage > 90 ? 'dashboard-metric-warning' : ''}" data-action="drill-capacity">
                    <div class="dashboard-metric-glow"></div>
                    <div class="dashboard-metric-header">
                        <i data-lucide="bar-chart-3" class="dashboard-metric-icon" style="width: 24px; height: 24px;"></i>
                        <span class="dashboard-metric-label">Total Leads</span>
                    </div>
                    <div class="dashboard-metric-value">${currentLeads}<span class="dashboard-metric-sub">/${leadLimit}</span></div>
                    <div class="dashboard-metric-footer">
                        <div class="dashboard-metric-progress">
                            <div class="dashboard-metric-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="dashboard-metric-detail">${percentage}% capacity • Click for breakdown</span>
                    </div>
                </div>

                <div class="dashboard-metric-card dashboard-metric-2" data-action="drill-recent">
                    <div class="dashboard-metric-glow"></div>
                    <div class="dashboard-metric-header">
                        <i data-lucide="trending-up" class="dashboard-metric-icon" style="width: 24px; height: 24px;"></i>
                        <span class="dashboard-metric-label">This Week</span>
                    </div>
                    <div class="dashboard-metric-value">+${weekLeads}</div>
                    <div class="dashboard-metric-footer">
                        <span class="dashboard-metric-detail">New leads added • Click to view</span>
                    </div>
                </div>

                <div class="dashboard-metric-card dashboard-metric-3" data-action="drill-tasks">
                    <div class="dashboard-metric-glow"></div>
                    <div class="dashboard-metric-header">
                        <i data-lucide="check-circle" class="dashboard-metric-icon" style="width: 24px; height: 24px;"></i>
                        <span class="dashboard-metric-label">Tasks Due</span>
                    </div>
                    <div class="dashboard-metric-value">${totalTasksDue}</div>
                    <div class="dashboard-metric-footer">
                        <span class="dashboard-metric-detail">
                            ${todayTasks > 0 && overdueTasks > 0 ?
                                `${todayTasks} today, ${overdueTasks} overdue • Click to view` :
                                todayTasks > 0 ?
                                `${todayTasks} today • Click to view` :
                                overdueTasks > 0 ?
                                `${overdueTasks} overdue • Click to view` :
                                'All caught up!'}
                        </span>
                    </div>
                </div>

                <div class="dashboard-metric-card dashboard-metric-4" data-action="drill-winrate">
                    <div class="dashboard-metric-glow"></div>
                    <div class="dashboard-metric-header">
                        <i data-lucide="target" class="dashboard-metric-icon" style="width: 24px; height: 24px;"></i>
                        <span class="dashboard-metric-label">Win Rate</span>
                    </div>
                    <div class="dashboard-metric-value">${conversionRate}<span class="dashboard-metric-sub">%</span></div>
                    <div class="dashboard-metric-footer">
                        <span class="dashboard-metric-detail">${totalClosed} won, ${totalLost} lost • Click for details</span>
                    </div>
                </div>
            </div>
        `;
    },

    // PIPELINE OVERVIEW - With value formatting
    dashboard_renderPipeline() {
        const stages = [
            { id: 'new', name: 'New', icon: 'sparkles' },
            { id: 'contacted', name: 'Contacted', icon: 'phone' },
            { id: 'qualified', name: 'Qualified', icon: 'check-circle' },
            { id: 'negotiation', name: 'Negotiation', icon: 'handshake' },
            { id: 'closed', name: 'Closed', icon: 'trophy' },
            { id: 'lost', name: 'Lost', icon: 'x-circle' }
        ];
        
        const stageData = stages.map(stage => {
            const stageLeads = this.state.leads.filter(l => l.status === stage.id);
            return {
                ...stage,
                count: stageLeads.length,
                value: stageLeads.reduce((sum, l) => sum + (l.potential_value || 0), 0)
            };
        });
        
        return `
            <div class="dashboard-pipeline">
                <div class="dashboard-section-header">
                    <h2 class="dashboard-section-title">
                        <i data-lucide="git-branch" class="dashboard-section-icon" style="width: 20px; height: 20px;"></i>
                        Pipeline Overview
                    </h2>
                </div>

                <div class="dashboard-pipeline-stages">
                    ${stageData.map((stage, i) => `
                        <div class="dashboard-pipeline-stage dashboard-stage-${i + 1}"
                             data-action="view-stage"
                             data-stage="${stage.id}"
                             data-stage-name="${API.escapeHtml(stage.name)}">
                            <div class="dashboard-stage-glow"></div>
                            <i data-lucide="${stage.icon}" class="dashboard-stage-icon-lg" style="width: 32px; height: 32px;"></i>
                            <div class="dashboard-stage-name">${stage.name}</div>
                            <div class="dashboard-stage-count">${stage.count}</div>
                            ${stage.value > 0 ? `
                                <div class="dashboard-stage-value">${this.dashboard_formatValue(stage.value)}</div>
                            ` : ''}
                            <div class="dashboard-stage-hint">Click to view leads</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // LEADS LIST
    dashboard_renderLeadsList() {
        const recentLeads = this.state.leads.slice(0, 8);
        
        return `
            <div class="dashboard-section">
                <div class="dashboard-section-header">
                    <h3 class="dashboard-section-title">
                        <i data-lucide="users" class="dashboard-section-icon" style="width: 20px; height: 20px;"></i>
                        Recent Leads (${recentLeads.length})
                    </h3>
                    <button class="dashboard-view-btn" data-action="view-all-leads">
                        View All →
                    </button>
                </div>
                
                <div class="dashboard-list-container">
                    ${recentLeads.length > 0 ? 
                        recentLeads.map(lead => this.dashboard_renderLeadItem(lead)).join('') :
                        '<div class="dashboard-empty-state">No leads yet</div>'
                    }
                </div>
            </div>
        `;
    },

    dashboard_renderLeadItem(lead) {
        const timeAgo = this.dashboard_formatTimeAgo(lead.created_at);
        const initials = this.dashboard_getInitials(lead.name);
        
        const truncate = (text, maxLen) => {
            if (!text) return '';
            const escaped = API.escapeHtml(text);
            return escaped.length > maxLen ? escaped.substring(0, maxLen) + '...' : escaped;
        };
        
        const safeName = truncate(lead.name, 25);
        const safeCompany = truncate(lead.company || 'No company', 30);
            
        return `
            <div class="dashboard-list-item" data-action="view-lead-detail" data-id="${lead.id}">
                <div class="dashboard-item-avatar">
                    <span class="dashboard-avatar-text">${initials}</span>
                    <div class="dashboard-avatar-glow"></div>
                </div>
                <div class="dashboard-item-content">
                    <div class="dashboard-item-title">${safeName}</div>
                    <div class="dashboard-item-subtitle">
                        ${safeCompany} • ${timeAgo}
                    </div>
                </div>
                <div class="dashboard-item-badge dashboard-badge-${this.dashboard_getStatusClass(lead.status)}">
                    ${this.dashboard_formatStatus(lead.status)}
                </div>
            </div>
        `;
    },

    // TASKS LIST
    dashboard_renderTasksList() {
        const today = new Date().toISOString().split('T')[0];
        const pendingTasks = this.state.tasks
            .filter(t => t.status === 'pending')
            .slice(0, 8);
        
        return `
            <div class="dashboard-section">
                <div class="dashboard-section-header">
                    <h3 class="dashboard-section-title">
                        <i data-lucide="list-checks" class="dashboard-section-icon" style="width: 20px; height: 20px;"></i>
                        Upcoming Tasks (${pendingTasks.length})
                    </h3>
                    <button class="dashboard-view-btn" data-action="view-all-tasks">
                        View All →
                    </button>
                </div>

                <div class="dashboard-list-container">
                    ${pendingTasks.length > 0 ?
                        pendingTasks.map(task => this.dashboard_renderTaskItem(task, today)).join('') :
                        '<div class="dashboard-empty-state">No pending tasks</div>'
                    }
                </div>
            </div>
        `;
    },

    dashboard_renderTaskItem(task, today) {
        const isOverdue = task.due_date && task.due_date < today;
        const isToday = task.due_date === today;
        const dueLabel = isOverdue ? 'Overdue' :
                        isToday ? 'Today' :
                        this.dashboard_formatDate(task.due_date);
        const safeTitle = API.escapeHtml(task.title);
        const formattedTime = task.due_time ? this.dashboard_formatTime(task.due_time) : '';

        return `
            <div class="dashboard-list-item ${isOverdue ? 'dashboard-item-overdue' : ''}"
                 data-action="view-task-detail"
                 data-id="${task.id}">
                <div class="dashboard-task-status-icon">
                    <i data-lucide="${isOverdue ? 'alert-triangle' : isToday ? 'clock' : 'clipboard'}" style="width: 20px; height: 20px;"></i>
                </div>
                <div class="dashboard-item-content">
                    <div class="dashboard-item-title">${safeTitle}</div>
                    <div class="dashboard-item-subtitle">
                        ${formattedTime ? formattedTime + ' • ' : ''}${dueLabel || 'No due date'}
                    </div>
                </div>
                ${task.due_date ? `
                    <div class="dashboard-item-badge dashboard-badge-${isOverdue ? 'danger' : isToday ? 'warning' : 'neutral'}">
                        ${dueLabel}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // ACTIVITY FEED
    dashboard_renderActivityFeed() {
        const activities = this.dashboard_generateActivityFeed();

        return `
            <div class="dashboard-activity">
                <div class="dashboard-section-header">
                    <h3 class="dashboard-section-title">
                        <i data-lucide="activity" class="dashboard-section-icon" style="width: 20px; height: 20px;"></i>
                        Recent Activity
                    </h3>
                    <button class="dashboard-view-btn" data-action="view-all-activity">
                        View All →
                    </button>
                </div>

                <div class="dashboard-activity-timeline">
                    ${activities.slice(0, 10).map(activity => `
                        <div class="dashboard-activity-item">
                            <i data-lucide="${activity.icon}" class="dashboard-activity-icon" style="width: 18px; height: 18px;"></i>
                            <div class="dashboard-activity-content">
                                <div class="dashboard-activity-text">${activity.text}</div>
                                <div class="dashboard-activity-time">${activity.time}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    dashboard_generateActivityFeed() {
        const activities = [];
        
        this.state.leads.slice(0, 5).forEach(lead => {
            const safeName = API.escapeHtml(lead.name);
            const safeCompany = lead.company ? ' from ' + API.escapeHtml(lead.company) : '';
            activities.push({
                icon: 'user-plus',
                text: `Lead added: ${safeName}${safeCompany}`,
                time: this.dashboard_formatTimeAgo(lead.created_at),
                timestamp: new Date(lead.created_at)
            });
        });

        this.state.tasks
            .filter(t => t.status === 'completed')
            .slice(0, 5)
            .forEach(task => {
                const safeTitle = API.escapeHtml(task.title);
                activities.push({
                    icon: 'check-circle',
                    text: `Task completed: ${safeTitle}`,
                    time: this.dashboard_formatTimeAgo(task.completed_at || task.updated_at),
                    timestamp: new Date(task.completed_at || task.updated_at)
                });
            });

        this.state.leads
            .filter(l => l.status === 'closed')
            .slice(0, 3)
            .forEach(lead => {
                const value = lead.potential_value ? ` (${this.dashboard_formatValue(lead.potential_value)})` : '';
                const safeName = API.escapeHtml(lead.name);
                activities.push({
                    icon: 'trophy',
                    text: `Deal closed: ${safeName}${value}`,
                    time: this.dashboard_formatTimeAgo(lead.updated_at),
                    timestamp: new Date(lead.updated_at)
                });
            });
        
        return activities.sort((a, b) => b.timestamp - a.timestamp);
    },

    // UPGRADE CTA
    dashboard_renderUpgradeCTA() {
        return `
            <div class="dashboard-upgrade">
                <div class="dashboard-upgrade-glow"></div>
                <div class="dashboard-upgrade-content">
                    <i data-lucide="rocket" class="dashboard-upgrade-icon" style="width: 32px; height: 32px;"></i>
                    <div class="dashboard-upgrade-text">
                        <h3 class="dashboard-upgrade-title">Ready to scale?</h3>
                        <p class="dashboard-upgrade-subtitle">Upgrade to Pro for 5,000 leads and advanced analytics</p>
                    </div>
                </div>
                <button class="dashboard-upgrade-btn" data-action="upgrade">
                    <span>View Plans</span>
                    <div class="dashboard-btn-shine"></div>
                </button>
            </div>
        `;
    },

    // EVENT HANDLING - Simple delegation like Pipeline
    dashboard_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.onclick = (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;
            const stage = target.dataset.stage;
            const stageName = target.dataset.stageName;

            switch (action) {
                case 'refresh':
                    this.dashboard_refresh();
                    break;
                case 'view-stage':
                    this.dashboard_showStageModal(stage, stageName);
                    break;
                case 'view-lead-detail':
                    this.dashboard_showLeadDetailModal(id);
                    break;
                case 'view-task-detail':
                    this.dashboard_showTaskDetailModal(id);
                    break;
                case 'view-all-leads':
                    this.dashboard_showAllLeadsModal();
                    break;
                case 'view-all-tasks':
                    this.dashboard_showAllTasksModal();
                    break;
                case 'drill-capacity':
                    this.dashboard_showCapacityModal();
                    break;
                case 'drill-recent':
                    this.dashboard_showRecentLeadsModal();
                    break;
                case 'drill-tasks':
                    this.dashboard_showTasksDueModal();
                    break;
                case 'drill-winrate':
                    this.dashboard_showWinRateModal();
                    break;
                case 'view-all-activity':
                    this.dashboard_showActivitySummaryModal();
                    break;
                case 'upgrade':
                    if (window.loadPage) window.loadPage('upgrade');
                    break;
            }
        };
    },

    // SEARCH HELPER
    dashboard_filterLeads(leads, searchTerm) {
        if (!searchTerm) return leads;
        const term = searchTerm.toLowerCase();
        return leads.filter(lead => 
            (lead.name && lead.name.toLowerCase().includes(term)) ||
            (lead.company && lead.company.toLowerCase().includes(term)) ||
            (lead.email && lead.email.toLowerCase().includes(term)) ||
            (lead.notes && lead.notes.toLowerCase().includes(term))
        );
    },

    dashboard_filterTasks(tasks, searchTerm) {
        if (!searchTerm) return tasks;
        const term = searchTerm.toLowerCase();
        return tasks.filter(task => 
            (task.title && task.title.toLowerCase().includes(term)) ||
            (task.description && task.description.toLowerCase().includes(term))
        );
    },

    // MODALS WITH SEARCH - Direct creation like Pipeline
    dashboard_showStageModal(stageId, stageName) {
        const stageLeads = this.state.leads.filter(l => l.status === stageId);
        const totalValue = stageLeads.reduce((sum, l) => sum + (l.potential_value || 0), 0);
        this.state.modalSearchTerm = '';
        
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">${API.escapeHtml(stageName)} Leads</h2>
                        <div class="dashboard-modal-subtitle">
                            ${stageLeads.length} leads • Total value: ${this.dashboard_formatValue(totalValue)}
                        </div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>
                
                <div class="dashboard-modal-search">
                    <div class="search-wrapper">
                        <input type="text" 
                               class="search-input" 
                               placeholder="Search ${stageName.toLowerCase()} leads..."
                               data-search="leads">
                        <i data-lucide="search" class="search-icon" style="width: 18px; height: 18px;"></i>
                    </div>
                </div>
                
                <div class="dashboard-modal-body" data-content="leads">
                    ${this.dashboard_renderModalLeadsList(stageLeads)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal, 'leads', stageLeads);
    },

    dashboard_showLeadDetailModal(leadId) {
        const lead = this.state.leads.find(l => l.id === leadId);
        if (!lead) return;

        const relatedTasks = this.state.tasks.filter(t => t.lead_id === leadId);

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10003'; // Above filtered modals
        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-detail">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">${API.escapeHtml(lead.name)}</h2>
                        <div class="dashboard-modal-subtitle">${API.escapeHtml(lead.company || 'No company')}</div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>
                
                <div class="dashboard-modal-body">
                    ${this.dashboard_renderLeadDetails(lead, relatedTasks)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_showTaskDetailModal(taskId) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task) return;

        const lead = task.lead_id ? this.state.leads.find(l => l.id === task.lead_id) : null;
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = task.due_date && task.due_date < today;

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10003'; // Above filtered modals
        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-detail">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">${API.escapeHtml(task.title)}</h2>
                        <div class="dashboard-modal-subtitle">
                            <span class="dashboard-detail-badge dashboard-badge-${task.status === 'completed' ? 'success' : isOverdue ? 'danger' : 'neutral'}">
                                ${this.dashboard_capitalize(task.status)}
                            </span>
                        </div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>

                <div class="dashboard-modal-body">
                    ${this.dashboard_renderTaskDetails(task, lead, isOverdue)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_openTaskFromLead(taskId) {
        // Close the current lead detail modal
        document.querySelector('.dashboard-modal-overlay')?.remove();

        // Open the task detail modal
        this.dashboard_showTaskDetailModal(taskId);
    },

    dashboard_showAllLeadsModal() {
        this.state.modalSearchTerm = '';
        
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">All Leads</h2>
                        <div class="dashboard-modal-subtitle">${this.state.leads.length} total leads</div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>
                
                <div class="dashboard-modal-search">
                    <div class="search-wrapper">
                        <input type="text" 
                               class="search-input" 
                               placeholder="Search all leads..."
                               data-search="leads">
                        <i data-lucide="search" class="search-icon" style="width: 18px; height: 18px;"></i>
                    </div>
                </div>
                
                <div class="dashboard-modal-body" data-content="leads">
                    ${this.dashboard_renderModalLeadsList(this.state.leads)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.dashboard_setupModalEvents(modal, 'leads', this.state.leads);
    },

    dashboard_showAllTasksModal() {
        this.state.modalSearchTerm = '';
        
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">All Tasks</h2>
                        <div class="dashboard-modal-subtitle">${this.state.tasks.length} total tasks</div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>
                
                <div class="dashboard-modal-search">
                    <div class="search-wrapper">
                        <input type="text" 
                               class="search-input" 
                               placeholder="Search all tasks..."
                               data-search="tasks">
                        <i data-lucide="search" class="search-icon" style="width: 18px; height: 18px;"></i>
                    </div>
                </div>
                
                <div class="dashboard-modal-body" data-content="tasks">
                    ${this.dashboard_renderModalTasksList(this.state.tasks)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.dashboard_setupModalEvents(modal, 'tasks', this.state.tasks);
    },

    dashboard_showCapacityModal() {
        // Prevent multiple modals from opening
        if (document.querySelector('.dashboard-modal-overlay')) return;

        // Use cached subscription info (already loaded in render)
        const subscriptionInfo = this.state.subscriptionInfo;
        if (!subscriptionInfo) return;

        const currentLeads = subscriptionInfo.currentLeads;
        const leadLimit = subscriptionInfo.leadLimit;
        const remaining = leadLimit - currentLeads;
        const percentage = Math.round((currentLeads / leadLimit) * 100);

        const bySource = {};
        this.state.leads.forEach(lead => {
            const source = lead.source || 'Unknown';
            if (!bySource[source]) bySource[source] = [];
            bySource[source].push(lead);
        });

        const sources = Object.entries(bySource)
            .map(([source, leads]) => ({
                source,
                count: leads.length,
                percentage: Math.round((leads.length / currentLeads) * 100)
            }))
            .sort((a, b) => b.count - a.count);

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">Lead Capacity Analysis</h2>
                        <div class="dashboard-modal-subtitle">${currentLeads} of ${leadLimit} leads used</div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>

                <div class="dashboard-modal-body">
                    <div class="dashboard-capacity-overview">
                        <div class="dashboard-capacity-stats">
                            <div class="dashboard-capacity-stat">
                                <div class="dashboard-capacity-stat-value">${currentLeads}</div>
                                <div class="dashboard-capacity-stat-label">Current Leads</div>
                            </div>
                            <div class="dashboard-capacity-stat">
                                <div class="dashboard-capacity-stat-value">${remaining}</div>
                                <div class="dashboard-capacity-stat-label">Remaining</div>
                            </div>
                            <div class="dashboard-capacity-stat">
                                <div class="dashboard-capacity-stat-value">${percentage}%</div>
                                <div class="dashboard-capacity-stat-label">Capacity Used</div>
                            </div>
                        </div>
                    </div>

                    <div class="dashboard-capacity-breakdown">
                        <h3 class="dashboard-capacity-breakdown-title">Leads by Source</h3>
                        <div class="dashboard-source-list">
                            ${sources.map(s => `
                                <div class="dashboard-source-item">
                                    <div class="dashboard-source-info">
                                        <div class="dashboard-source-name">${API.escapeHtml(s.source)}</div>
                                        <div class="dashboard-source-count">${s.count} leads (${s.percentage}%)</div>
                                    </div>
                                    <div class="dashboard-source-bar">
                                        <div class="dashboard-source-fill" style="width: ${s.percentage}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_showRecentLeadsModal() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentLeads = this.state.leads.filter(l => 
            new Date(l.created_at) >= weekAgo
        );
        this.state.modalSearchTerm = '';
        
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">This Week's Leads</h2>
                        <div class="dashboard-modal-subtitle">${recentLeads.length} new leads added</div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>
                
                <div class="dashboard-modal-search">
                    <div class="search-wrapper">
                        <input type="text" 
                               class="search-input" 
                               placeholder="Search recent leads..."
                               data-search="leads">
                        <i data-lucide="search" class="search-icon" style="width: 18px; height: 18px;"></i>
                    </div>
                </div>
                
                <div class="dashboard-modal-body" data-content="leads">
                    ${this.dashboard_renderModalLeadsList(recentLeads)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.dashboard_setupModalEvents(modal, 'leads', recentLeads);
    },

    dashboard_showTasksDueModal() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.state.tasks.filter(t => 
            t.due_date === today && t.status === 'pending'
        );
        const overdueTasks = this.state.tasks.filter(t => 
            t.due_date < today && t.status === 'pending'
        );
        const allTasks = [...overdueTasks, ...todayTasks];
        this.state.modalSearchTerm = '';
        
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">Tasks Due</h2>
                        <div class="dashboard-modal-subtitle">${todayTasks.length} today, ${overdueTasks.length} overdue</div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>
                
                <div class="dashboard-modal-search">
                    <div class="search-wrapper">
                        <input type="text" 
                               class="search-input" 
                               placeholder="Search due tasks..."
                               data-search="tasks">
                        <i data-lucide="search" class="search-icon" style="width: 18px; height: 18px;"></i>
                    </div>
                </div>
                
                <div class="dashboard-modal-body" data-content="tasks">
                    ${this.dashboard_renderModalTasksList(allTasks)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.dashboard_setupModalEvents(modal, 'tasks', allTasks);
    },

    dashboard_showWinRateModal() {
        const closedLeads = this.state.leads.filter(l => l.status === 'closed');
        const lostLeads = this.state.leads.filter(l => l.status === 'lost');
        const closedValue = closedLeads.reduce((sum, l) => sum + (l.potential_value || 0), 0);
        const lostValue = lostLeads.reduce((sum, l) => sum + (l.potential_value || 0), 0);
        
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">Win Rate Analysis</h2>
                        <div class="dashboard-modal-subtitle">Closed vs Lost Opportunities</div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>
                
                <div class="dashboard-modal-body">
                    <div class="dashboard-winrate-stats">
                        <div class="dashboard-winrate-card dashboard-winrate-won">
                            <i data-lucide="trophy" class="dashboard-winrate-icon" style="width: 48px; height: 48px; min-width: 48px; margin-right: 20px;"></i>
                            <div class="dashboard-winrate-content">
                                <div class="dashboard-winrate-label">Won</div>
                                <div class="dashboard-winrate-count">${closedLeads.length}</div>
                                <div class="dashboard-winrate-value">${this.dashboard_formatValue(closedValue)}</div>
                            </div>
                        </div>

                        <div class="dashboard-winrate-card dashboard-winrate-lost">
                            <i data-lucide="x-circle" class="dashboard-winrate-icon" style="width: 48px; height: 48px; min-width: 48px; margin-right: 20px;"></i>
                            <div class="dashboard-winrate-content">
                                <div class="dashboard-winrate-label">Lost</div>
                                <div class="dashboard-winrate-count">${lostLeads.length}</div>
                                <div class="dashboard-winrate-value">${this.dashboard_formatValue(lostValue)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-winrate-sections">
                        ${closedLeads.length > 0 ? `
                            <div class="dashboard-winrate-section">
                                <h3 class="dashboard-winrate-section-title">Closed Deals (${closedLeads.length})</h3>
                                <div class="dashboard-modal-leads-grid">
                                    ${closedLeads.map(lead => this.dashboard_renderModalLeadCard(lead)).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${lostLeads.length > 0 ? `
                            <div class="dashboard-winrate-section">
                                <h3 class="dashboard-winrate-section-title">Lost Opportunities (${lostLeads.length})</h3>
                                <div class="dashboard-modal-leads-grid">
                                    ${lostLeads.map(lead => this.dashboard_renderModalLeadCard(lead)).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    async dashboard_showActivitySummaryModal() {
        // Prevent duplicate modals (check both DOM and loading flag)
        if (document.getElementById('activitySummaryModal') || this._loadingActivitySummary) return;

        this._loadingActivitySummary = true;

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.id = 'activitySummaryModal';

        // Default to "This Week"
        const timeRange = 'week';
        const summary = await this.dashboard_calculateActivitySummary(timeRange);

        this._loadingActivitySummary = false;

        // Store current summary for movement clicks
        this.currentActivitySummary = summary;

        modal.innerHTML = this.dashboard_renderActivitySummaryModal(summary, timeRange);

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Setup modal close
        modal.querySelector('.dashboard-modal-close').onclick = () => {
            this._loadingActivitySummary = false;
            modal.remove();
        };
        modal.onclick = (e) => {
            if (e.target === modal) {
                this._loadingActivitySummary = false;
                modal.remove();
            }
        };

        // Setup movement badge clicks
        this.dashboard_setupMovementClicks(modal);

        // Setup summary card clicks
        this.dashboard_setupSummaryCardClicks(modal);

        // Setup daily card clicks
        this.dashboard_setupDailyCardClicks(modal);

        // Setup time range dropdown
        const dropdown = modal.querySelector('#activityTimeRange');
        if (dropdown) {
            dropdown.onchange = async (e) => {
                const newRange = e.target.value;
                const newSummary = await this.dashboard_calculateActivitySummary(newRange);
                this.currentActivitySummary = newSummary; // Update stored summary
                const modalContent = modal.querySelector('.dashboard-modal');
                if (modalContent) {
                    modalContent.innerHTML = this.dashboard_renderActivitySummaryModalContent(newSummary, newRange);
                    if (typeof lucide !== 'undefined') lucide.createIcons();

                    // Re-attach close handler
                    modalContent.querySelector('.dashboard-modal-close').onclick = () => modal.remove();

                    // Re-attach movement clicks
                    this.dashboard_setupMovementClicks(modal);

                    // Re-attach summary card clicks
                    this.dashboard_setupSummaryCardClicks(modal);

                    // Re-attach daily card clicks
                    this.dashboard_setupDailyCardClicks(modal);

                    // Re-attach dropdown listener
                    const newDropdown = modal.querySelector('#activityTimeRange');
                    if (newDropdown) {
                        newDropdown.onchange = dropdown.onchange;
                    }
                }
            };
        }
    },

    dashboard_setupMovementClicks(modal) {
        const movementItems = modal.querySelectorAll('.activity-movement-item');
        movementItems.forEach(item => {
            item.style.cursor = 'pointer';
            item.onclick = () => {
                const fromStage = item.dataset.fromStage || null;
                const toStage = item.dataset.toStage;
                this.dashboard_showMovementLeadsModal(fromStage, toStage);
            };
        });
    },

    dashboard_setupSummaryCardClicks(modal) {
        const summaryCards = modal.querySelectorAll('.activity-card-clickable');
        summaryCards.forEach(card => {
            card.style.cursor = 'pointer';
            card.onclick = () => {
                const cardType = card.dataset.cardType;
                if (cardType === 'leads') {
                    this.dashboard_showFilteredLeadsModal();
                } else if (cardType === 'tasks') {
                    this.dashboard_showFilteredTasksModal();
                } else if (cardType === 'deals') {
                    this.dashboard_showFilteredDealsModal();
                }
            };
        });
    },

    dashboard_setupDailyCardClicks(modal) {
        const dailyCards = modal.querySelectorAll('.activity-daily-card-clickable');
        dailyCards.forEach(card => {
            card.style.cursor = 'pointer';
            card.onclick = () => {
                const dayIndex = parseInt(card.dataset.dayIndex);
                if (!this.currentActivitySummary || !this.currentActivitySummary.dailyBreakdown) return;
                const dayData = this.currentActivitySummary.dailyBreakdown[dayIndex];
                if (dayData) {
                    this.dashboard_showDailyDetailModal(dayData);
                }
            };
        });
    },

    dashboard_showMovementLeadsModal(fromStage, toStage) {
        if (!this.currentActivitySummary || !this.currentActivitySummary.allStageChanges) return;

        // Find all stage changes for this specific movement
        const movementChanges = this.currentActivitySummary.allStageChanges.filter(sc => {
            const matchesFrom = fromStage ? sc.from_stage === fromStage : !sc.from_stage;
            const matchesTo = sc.to_stage === toStage;
            return matchesFrom && matchesTo;
        });

        // Get unique lead IDs
        const leadIds = [...new Set(movementChanges.map(sc => sc.lead_id))];

        // Get lead details
        const leads = this.state.leads.filter(l => leadIds.includes(l.id));

        // Create modal using existing Dashboard modal pattern
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10001'; // Above activity summary modal

        const movementLabel = fromStage ? `${fromStage} → ${toStage}` : toStage;

        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <h2 class="dashboard-modal-title">${movementLabel}</h2>
                    <button class="dashboard-modal-close">×</button>
                </div>
                <div class="dashboard-modal-body">
                    ${this.dashboard_renderModalLeadsList(leads)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Setup modal events using existing pattern
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_showFilteredLeadsModal() {
        if (!this.currentActivitySummary) return;

        const leads = this.currentActivitySummary.filteredLeads || [];

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10001';

        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <h2 class="dashboard-modal-title">Leads Added</h2>
                    <button class="dashboard-modal-close">×</button>
                </div>
                <div class="dashboard-modal-body">
                    ${this.dashboard_renderModalLeadsList(leads)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_showFilteredTasksModal() {
        if (!this.currentActivitySummary) return;

        const tasks = this.currentActivitySummary.filteredTasks || [];

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10001';

        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <h2 class="dashboard-modal-title">Tasks Completed</h2>
                    <button class="dashboard-modal-close">×</button>
                </div>
                <div class="dashboard-modal-body">
                    ${this.dashboard_renderModalTasksList(tasks)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_showFilteredDealsModal() {
        if (!this.currentActivitySummary) return;

        const leads = this.currentActivitySummary.closedDealsLeads || [];

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10001';

        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <h2 class="dashboard-modal-title">Deals Closed</h2>
                    <button class="dashboard-modal-close">×</button>
                </div>
                <div class="dashboard-modal-body">
                    ${this.dashboard_renderModalLeadsList(leads)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_showDailyDetailModal(dayData) {
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10001';

        // Store day data for card clicks
        this.currentDayData = dayData;

        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <div class="dashboard-modal-header-content">
                        <h2 class="dashboard-modal-title">${dayData.dateLabel}</h2>
                        <div class="dashboard-modal-subtitle">Complete daily activity breakdown</div>
                    </div>
                    <button class="dashboard-modal-close">×</button>
                </div>

                <div class="dashboard-modal-body">
                    <!-- Summary Cards -->
                    <div class="activity-summary-header">TOTALS</div>
                    <div class="activity-summary-cards">
                        <div class="activity-card activity-card-clickable" data-day-card-type="leads">
                            <div class="activity-card-label">LEADS ADDED</div>
                            <div class="activity-card-value">${dayData.leadsAdded}</div>
                        </div>
                        <div class="activity-card activity-card-clickable" data-day-card-type="tasks">
                            <div class="activity-card-label">TASKS DONE</div>
                            <div class="activity-card-value">${dayData.tasksCompleted}</div>
                        </div>
                        <div class="activity-card activity-card-clickable" data-day-card-type="deals">
                            <div class="activity-card-label">DEALS CLOSED</div>
                            <div class="activity-card-value">${dayData.dealsClosed}</div>
                            ${dayData.revenue > 0 ? `<div class="activity-card-sub">${this.dashboard_formatValue(dayData.revenue)}</div>` : ''}
                        </div>
                    </div>

                    <!-- Pipeline Movement -->
                    ${dayData.movements.length > 0 ? `
                        <div class="activity-section-divider"></div>
                        <div class="activity-summary-header">PIPELINE MOVEMENT</div>
                        <div class="activity-pipeline-movement">
                            ${dayData.movements.map(m => `
                                <div class="activity-movement-item" data-from-stage="${m.from_stage || ''}" data-to-stage="${m.to_stage}">
                                    <div class="activity-movement-badge badge-${m.to_stage}">${m.from_stage ? `${m.from_stage} → ${m.to_stage}` : m.to_stage}</div>
                                    <div class="activity-movement-count">${m.count} ${m.count === 1 ? 'lead' : 'leads'}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);

        // Setup card clicks for this daily modal
        this.dashboard_setupDayDetailCardClicks(modal);

        // Setup movement clicks for this daily modal
        this.dashboard_setupDayDetailMovementClicks(modal);
    },

    dashboard_setupDayDetailCardClicks(modal) {
        const dayCards = modal.querySelectorAll('.activity-card-clickable');
        dayCards.forEach(card => {
            card.style.cursor = 'pointer';
            card.onclick = () => {
                const cardType = card.dataset.dayCardType;
                if (!this.currentDayData) return;

                if (cardType === 'leads') {
                    this.dashboard_showDayLeadsModal(this.currentDayData);
                } else if (cardType === 'tasks') {
                    this.dashboard_showDayTasksModal(this.currentDayData);
                } else if (cardType === 'deals') {
                    this.dashboard_showDayDealsModal(this.currentDayData);
                }
            };
        });
    },

    dashboard_setupDayDetailMovementClicks(modal) {
        const movementItems = modal.querySelectorAll('.activity-movement-item');
        movementItems.forEach(item => {
            item.style.cursor = 'pointer';
            item.onclick = () => {
                const fromStage = item.dataset.fromStage || null;
                const toStage = item.dataset.toStage;
                if (!this.currentDayData) return;
                this.dashboard_showDayMovementLeadsModal(fromStage, toStage, this.currentDayData);
            };
        });
    },

    dashboard_showDayLeadsModal(dayData) {
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10002'; // Above daily detail modal

        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <h2 class="dashboard-modal-title">Leads Added - ${dayData.dateLabel}</h2>
                    <button class="dashboard-modal-close">×</button>
                </div>
                <div class="dashboard-modal-body">
                    ${this.dashboard_renderModalLeadsList(dayData.leads)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_showDayTasksModal(dayData) {
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10002';

        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <h2 class="dashboard-modal-title">Tasks Completed - ${dayData.dateLabel}</h2>
                    <button class="dashboard-modal-close">×</button>
                </div>
                <div class="dashboard-modal-body">
                    ${this.dashboard_renderModalTasksList(dayData.tasks)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_showDayDealsModal(dayData) {
        // Get closed deals from movements for this day
        const closedDealsMoves = dayData.deduplicatedMoves.filter(sc =>
            sc.to_stage === 'closed' || sc.to_stage === 'closed_won'
        );
        const closedDealLeadIds = closedDealsMoves.map(sc => sc.lead_id);
        const closedDealsLeads = this.state.leads.filter(l => closedDealLeadIds.includes(l.id));

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10002';

        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <h2 class="dashboard-modal-title">Deals Closed - ${dayData.dateLabel}</h2>
                    <button class="dashboard-modal-close">×</button>
                </div>
                <div class="dashboard-modal-body">
                    ${this.dashboard_renderModalLeadsList(closedDealsLeads)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_showDayMovementLeadsModal(fromStage, toStage, dayData) {
        // Filter the deduplicated movements for this specific movement type
        const movementChanges = dayData.deduplicatedMoves.filter(sc => {
            const matchesFrom = fromStage ? sc.from_stage === fromStage : !sc.from_stage;
            const matchesTo = sc.to_stage === toStage;
            return matchesFrom && matchesTo;
        });

        // Get unique lead IDs
        const leadIds = [...new Set(movementChanges.map(sc => sc.lead_id))];

        // Get lead details
        const leads = this.state.leads.filter(l => leadIds.includes(l.id));

        const movementLabel = fromStage ? `${fromStage} → ${toStage}` : toStage;

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
        modal.style.zIndex = '10002';

        modal.innerHTML = `
            <div class="dashboard-modal dashboard-modal-large">
                <div class="dashboard-modal-header">
                    <h2 class="dashboard-modal-title">${movementLabel} - ${dayData.dateLabel}</h2>
                    <button class="dashboard-modal-close">×</button>
                </div>
                <div class="dashboard-modal-body">
                    ${this.dashboard_renderModalLeadsList(leads)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.dashboard_setupModalEvents(modal);
    },

    dashboard_renderActivitySummaryModal(summary, timeRange) {
        return `
            <div class="dashboard-modal dashboard-modal-large">
                ${this.dashboard_renderActivitySummaryModalContent(summary, timeRange)}
            </div>
        `;
    },

    dashboard_renderActivitySummaryModalContent(summary, timeRange) {
        const dateDisplay = this.dashboard_getDateRangeDisplay(timeRange);

        return `
            <div class="dashboard-modal-header">
                <div class="dashboard-modal-header-content">
                    <h2 class="dashboard-modal-title">Activity Summary</h2>
                    <div class="dashboard-modal-subtitle">Track your productivity and pipeline movement</div>
                </div>
                <button class="dashboard-modal-close">×</button>
            </div>

            <div class="dashboard-modal-body">
                <!-- Time Range Selector -->
                <div class="activity-time-selector">
                    <label for="activityTimeRange">Time Period:</label>
                    <select id="activityTimeRange" class="activity-time-dropdown">
                        <option value="today" ${timeRange === 'today' ? 'selected' : ''}>Today</option>
                        <option value="week" ${timeRange === 'week' ? 'selected' : ''}>This Week</option>
                        <option value="month" ${timeRange === 'month' ? 'selected' : ''}>This Month</option>
                    </select>
                    <span class="activity-date-display">${dateDisplay}</span>
                </div>

                <!-- Summary Cards -->
                <div class="activity-summary-header">${timeRange === 'today' ? 'TODAY' : timeRange === 'week' ? 'WEEK' : 'MONTH'} TOTALS</div>
                <div class="activity-summary-cards">
                    <div class="activity-card activity-card-clickable" data-card-type="leads">
                        <div class="activity-card-label">LEADS ADDED</div>
                        <div class="activity-card-value">${summary.totals.leadsAdded}</div>
                    </div>
                    <div class="activity-card activity-card-clickable" data-card-type="tasks">
                        <div class="activity-card-label">TASKS DONE</div>
                        <div class="activity-card-value">${summary.totals.tasksCompleted}</div>
                    </div>
                    <div class="activity-card activity-card-clickable" data-card-type="deals">
                        <div class="activity-card-label">DEALS CLOSED</div>
                        <div class="activity-card-value">${summary.totals.dealsClosed}</div>
                        <div class="activity-card-sub">${this.dashboard_formatValue(summary.totals.revenue)}</div>
                    </div>
                </div>

                <!-- Pipeline Movement -->
                ${summary.movements.length > 0 ? `
                    <div class="activity-section-divider"></div>
                    <div class="activity-summary-header">PIPELINE MOVEMENT (${timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This Week' : 'This Month'})</div>
                    <div class="activity-pipeline-movement">
                        ${summary.movements.map(m => `
                            <div class="activity-movement-item" data-from-stage="${m.from_stage || ''}" data-to-stage="${m.to_stage}">
                                <div class="activity-movement-badge badge-${m.to_stage}">${m.from_stage ? `${m.from_stage} → ${m.to_stage}` : m.to_stage}</div>
                                <div class="activity-movement-count">${m.count} ${m.count === 1 ? 'lead' : 'leads'}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Daily Breakdown (only for week/month) -->
                ${timeRange !== 'today' && summary.dailyBreakdown.length > 0 ? `
                    <div class="activity-section-divider"></div>
                    <div class="activity-summary-header">DAILY BREAKDOWN</div>
                    <div class="activity-daily-breakdown">
                        ${summary.dailyBreakdown.map((day, index) => `
                            <div class="activity-daily-card activity-daily-card-clickable" data-day-index="${index}">
                                <div class="activity-daily-date">${day.dateLabel}</div>
                                <div class="activity-daily-stats">
                                    <div class="activity-daily-stat">
                                        <div class="activity-daily-stat-value">${day.leadsAdded}</div>
                                        <div class="activity-daily-stat-label">Leads</div>
                                    </div>
                                    <div class="activity-daily-stat">
                                        <div class="activity-daily-stat-value">${day.tasksCompleted}</div>
                                        <div class="activity-daily-stat-label">Tasks</div>
                                    </div>
                                    <div class="activity-daily-stat">
                                        <div class="activity-daily-stat-value">${day.dealsClosed}</div>
                                        <div class="activity-daily-stat-label">Deals</div>
                                        ${day.revenue > 0 ? `<div class="activity-daily-stat-sub">${this.dashboard_formatValue(day.revenue)}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    async dashboard_calculateActivitySummary(timeRange) {
        const { startDate, endDate } = this.dashboard_getDateRange(timeRange);

        // Filter data by date range
        const filteredLeads = this.state.leads.filter(l =>
            new Date(l.created_at) >= startDate && new Date(l.created_at) <= endDate
        );

        const filteredTasks = this.state.tasks.filter(t =>
            t.status === 'completed' &&
            t.completed_at &&
            new Date(t.completed_at) >= startDate &&
            new Date(t.completed_at) <= endDate
        );

        // Get all stage changes for the period
        const allStageChanges = await API.getStageChanges(startDate, endDate);

        // Deduplicate to get final movement per lead per day
        const deduplicatedMoves = this.dashboard_deduplicateMovements(allStageChanges, startDate, endDate);

        // Get deals that ended in "closed" status (deduplicated)
        const closedDealsMoves = deduplicatedMoves.filter(sc =>
            sc.to_stage === 'closed' || sc.to_stage === 'closed_won'
        );

        const closedDealsCount = closedDealsMoves.length;
        const closedDealsRevenue = closedDealsMoves.reduce((sum, sc) =>
            sum + (parseFloat(sc.potential_value) || 0), 0
        );

        // Calculate pipeline movements (ALL movements for activity view)
        const movements = this.dashboard_groupMovements(allStageChanges);

        // Calculate daily breakdown
        const dailyBreakdown = this.dashboard_calculateDailyBreakdown(
            filteredLeads,
            filteredTasks,
            deduplicatedMoves,
            startDate,
            endDate
        );

        // Get closed deal lead IDs for filtering
        const closedDealLeadIds = closedDealsMoves.map(sc => sc.lead_id);
        const closedDealsLeads = this.state.leads.filter(l => closedDealLeadIds.includes(l.id));

        return {
            totals: {
                leadsAdded: filteredLeads.length,
                tasksCompleted: filteredTasks.length,
                dealsClosed: closedDealsCount,
                revenue: closedDealsRevenue
            },
            movements: movements,
            dailyBreakdown: dailyBreakdown,
            allStageChanges: allStageChanges, // Store for clickable movements
            filteredLeads: filteredLeads, // Store for clickable cards
            filteredTasks: filteredTasks, // Store for clickable cards
            closedDealsLeads: closedDealsLeads // Store for clickable cards
        };
    },

    dashboard_getDateRange(timeRange) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (timeRange) {
            case 'today':
                return {
                    startDate: today,
                    endDate: new Date(today.getTime() + 86400000) // +1 day
                };
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 7);
                return { startDate: weekStart, endDate: weekEnd };
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                return { startDate: monthStart, endDate: monthEnd };
            default:
                return { startDate: today, endDate: new Date(today.getTime() + 86400000) };
        }
    },

    dashboard_getDateRangeDisplay(timeRange) {
        const now = new Date();
        const { startDate, endDate } = this.dashboard_getDateRange(timeRange);

        const formatDate = (date) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        };

        const formatShortDate = (date) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}`;
        };

        switch (timeRange) {
            case 'today':
                return formatDate(now);
            case 'week':
                return `${formatShortDate(startDate)} - ${formatShortDate(new Date(endDate.getTime() - 1))}`;
            case 'month':
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                return `${months[now.getMonth()]} ${now.getFullYear()}`;
            default:
                return formatDate(now);
        }
    },

    async dashboard_getStageMovements(startDate, endDate) {
        try {
            const movements = await API.getStageChanges(startDate, endDate);
            return this.dashboard_groupMovements(movements);
        } catch (error) {
            console.error('Failed to load stage changes:', error);
            return [];
        }
    },

    dashboard_calculateDailyBreakdown(leads, tasks, deduplicatedMoves, startDate, endDate) {
        const days = [];
        const currentDate = new Date(startDate);

        while (currentDate < endDate) {
            const dayStart = new Date(currentDate);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);

            // Filter data for this specific day
            const dayLeads = leads.filter(l => {
                const created = new Date(l.created_at);
                return created >= dayStart && created <= dayEnd;
            });

            const dayTasks = tasks.filter(t => {
                const completed = new Date(t.completed_at);
                return completed >= dayStart && completed <= dayEnd;
            });

            // Filter deduplicated movements for this day (final state per lead)
            const dayDeduplicatedMoves = deduplicatedMoves.filter(sc => {
                const changed = new Date(sc.changed_at);
                return changed >= dayStart && changed <= dayEnd;
            });

            // Count deals that ended in closed (deduplicated - final state only)
            const dayClosedDealsMoves = dayDeduplicatedMoves.filter(sc =>
                sc.to_stage === 'closed' || sc.to_stage === 'closed_won'
            );
            const dayDeals = dayClosedDealsMoves.length;
            const dayRevenue = dayClosedDealsMoves.reduce((sum, sc) =>
                sum + (parseFloat(sc.potential_value) || 0), 0
            );

            // Format day label
            const dayLabel = this.dashboard_formatDayLabel(dayStart);

            days.push({
                date: dayStart.toISOString().split('T')[0],
                dateLabel: dayLabel,
                leadsAdded: dayLeads.length,
                tasksCompleted: dayTasks.length,
                dealsClosed: dayDeals,
                revenue: dayRevenue,
                movements: this.dashboard_groupMovements(dayDeduplicatedMoves),
                leads: dayLeads,
                tasks: dayTasks,
                deduplicatedMoves: dayDeduplicatedMoves
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return days.filter(day => day.leadsAdded > 0 || day.tasksCompleted > 0 || day.dealsClosed > 0 || day.movements.length > 0);
    },

    dashboard_formatDayLabel(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    },

    dashboard_groupMovements(movements) {
        const grouped = {};
        movements.forEach(m => {
            const key = `${m.from_stage || 'new'}_${m.to_stage}`;
            if (!grouped[key]) {
                grouped[key] = {
                    from_stage: m.from_stage,
                    to_stage: m.to_stage,
                    count: 0,
                    lead_ids: []
                };
            }
            grouped[key].count++;
            grouped[key].lead_ids.push(m.lead_id);
        });
        return Object.values(grouped).sort((a, b) => b.count - a.count);
    },

    dashboard_deduplicateMovements(stageChanges, startDate, endDate) {
        // Groups stage changes by lead_id and day, keeping only the most recent movement per lead per day
        const dailyFinalMoves = {};

        stageChanges.forEach(sc => {
            const changeDate = new Date(sc.changed_at);
            const dayKey = changeDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const leadDayKey = `${sc.lead_id}_${dayKey}`;

            // Only keep if this is the first record for this lead+day OR if it's more recent
            if (!dailyFinalMoves[leadDayKey] || new Date(sc.changed_at) > new Date(dailyFinalMoves[leadDayKey].changed_at)) {
                dailyFinalMoves[leadDayKey] = sc;
            }
        });

        return Object.values(dailyFinalMoves);
    },

    // RENDER MODAL CONTENT
    dashboard_renderModalLeadsList(leads) {
        if (leads.length === 0) {
            return `
                <div class="dashboard-modal-empty-state">
                    <i data-lucide="search" class="dashboard-empty-icon" style="width: 48px; height: 48px;"></i>
                    <div class="dashboard-empty-text">No leads found</div>
                </div>
            `;
        }
        
        return `
            <div class="dashboard-modal-leads-grid">
                ${leads.map(lead => this.dashboard_renderModalLeadCard(lead)).join('')}
            </div>
        `;
    },

    dashboard_renderModalLeadCard(lead) {
        const safeName = API.escapeHtml(lead.name);
        const safeCompany = API.escapeHtml(lead.company || 'No company');
        const safeEmail = API.escapeHtml(lead.email || 'No email');
        const initials = this.dashboard_getInitials(lead.name);
        const timeAgo = this.dashboard_formatTimeAgo(lead.created_at);
        
        return `
            <div class="dashboard-modal-lead-card" data-action="view-lead-detail" data-id="${lead.id}">
                <div class="dashboard-modal-card-header">
                    <div class="dashboard-modal-card-avatar">
                        <span>${initials}</span>
                    </div>
                    <div class="dashboard-modal-card-info">
                        <div class="dashboard-modal-card-name">${safeName}</div>
                        <div class="dashboard-modal-card-company">${safeCompany}</div>
                    </div>
                </div>
                
                <div class="dashboard-modal-card-details">
                    ${lead.email ? `<div class="dashboard-modal-detail-row"><i data-lucide="mail" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>${safeEmail}</div>` : ''}
                    ${lead.phone ? `<div class="dashboard-modal-detail-row"><i data-lucide="phone" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>${API.escapeHtml(lead.phone)}</div>` : ''}
                    ${lead.potential_value ? `<div class="dashboard-modal-detail-row"><i data-lucide="dollar-sign" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>${this.dashboard_formatValue(lead.potential_value)}</div>` : ''}
                </div>
                
                <div class="dashboard-modal-card-footer">
                    <div class="dashboard-modal-card-status dashboard-badge-${this.dashboard_getStatusClass(lead.status)}">
                        ${this.dashboard_formatStatus(lead.status)}
                    </div>
                    <div class="dashboard-modal-card-time">${timeAgo}</div>
                </div>
            </div>
        `;
    },

    dashboard_renderLeadDetails(lead, relatedTasks) {
        const safeName = API.escapeHtml(lead.name);
        const safeCompany = API.escapeHtml(lead.company || 'No company');
        const safeEmail = API.escapeHtml(lead.email || '');
        const safePhone = API.escapeHtml(lead.phone || '');
        const safeSource = API.escapeHtml(lead.source || 'Unknown');
        const safeNotes = API.escapeHtml(lead.notes || '');
        
        return `
            <div class="dashboard-detail-grid">
                <div class="dashboard-detail-section">
                    <h3 class="dashboard-detail-section-title">Contact Information</h3>
                    <div class="dashboard-detail-rows">
                        ${lead.email ? `
                            <div class="dashboard-detail-row">
                                <span class="dashboard-detail-label">Email:</span>
                                <span class="dashboard-detail-value">${safeEmail}</span>
                            </div>
                        ` : ''}
                        ${lead.phone ? `
                            <div class="dashboard-detail-row">
                                <span class="dashboard-detail-label">Phone:</span>
                                <span class="dashboard-detail-value">${safePhone}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="dashboard-detail-section">
                    <h3 class="dashboard-detail-section-title">Lead Information</h3>
                    <div class="dashboard-detail-rows">
                        <div class="dashboard-detail-row">
                            <span class="dashboard-detail-label">Status:</span>
                            <span class="dashboard-detail-badge dashboard-badge-${this.dashboard_getStatusClass(lead.status)}">
                                ${this.dashboard_formatStatus(lead.status)}
                            </span>
                        </div>
                        <div class="dashboard-detail-row">
                            <span class="dashboard-detail-label">Source:</span>
                            <span class="dashboard-detail-value">${safeSource}</span>
                        </div>
                        ${lead.quality_score ? `
                            <div class="dashboard-detail-row">
                                <span class="dashboard-detail-label">Quality:</span>
                                <span class="dashboard-detail-value">${lead.quality_score}/10</span>
                            </div>
                        ` : ''}
                        ${lead.potential_value ? `
                            <div class="dashboard-detail-row">
                                <span class="dashboard-detail-label">Value:</span>
                                <span class="dashboard-detail-value dashboard-detail-value-money">${this.dashboard_formatValue(lead.potential_value)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            ${lead.notes ? `
                <div class="dashboard-detail-section dashboard-detail-full">
                    <h3 class="dashboard-detail-section-title">Notes</h3>
                    <div class="dashboard-detail-notes-content">${safeNotes}</div>
                </div>
            ` : ''}
            
            ${relatedTasks.length > 0 ? `
                <div class="dashboard-detail-section dashboard-detail-full">
                    <h3 class="dashboard-detail-section-title">Related Tasks (${relatedTasks.length})</h3>
                    <div class="dashboard-detail-tasks-list">
                        ${relatedTasks.map(task => this.dashboard_renderTaskInDetail(task)).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    },

    dashboard_renderTaskDetails(task, lead, isOverdue) {
    const safeTitle = API.escapeHtml(task.title);
    const safeDescription = API.escapeHtml(task.description || '');
    const safeNotes = API.escapeHtml(task.completion_notes || '');
    
    return `
        <div class="dashboard-detail-grid">
            <div class="dashboard-detail-section">
                <h3 class="dashboard-detail-section-title">Task Details</h3>
                <div class="dashboard-detail-rows">
                    <div class="dashboard-detail-row">
                        <span class="dashboard-detail-label">Due Date:</span>
                        <span class="dashboard-detail-value ${isOverdue ? 'dashboard-text-danger' : ''}">
                            ${task.due_date ? this.dashboard_formatDate(task.due_date) : 'No date set'}
                            ${isOverdue ? ' (Overdue)' : ''}
                        </span>
                    </div>
                    ${task.due_time ? `
                        <div class="dashboard-detail-row">
                            <span class="dashboard-detail-label">Time:</span>
                            <span class="dashboard-detail-value">${this.dashboard_formatTime(task.due_time)}</span>
                        </div>
                    ` : ''}
                    <div class="dashboard-detail-row">
                        <span class="dashboard-detail-label">Priority:</span>
                        <span class="dashboard-detail-value">${this.dashboard_capitalize(task.priority || 'medium')}</span>
                    </div>
                    <div class="dashboard-detail-row">
                        <span class="dashboard-detail-label">Type:</span>
                        <span class="dashboard-detail-value">${this.dashboard_capitalize(task.task_type || 'task')}</span>
                    </div>
                </div>
            </div>
            
            ${lead ? `
                <div class="dashboard-detail-section">
                    <h3 class="dashboard-detail-section-title">Associated Lead</h3>
                    <div class="dashboard-detail-rows">
                        <div class="dashboard-detail-row">
                            <span class="dashboard-detail-label">Name:</span>
                            <span class="dashboard-detail-value">${API.escapeHtml(lead.name)}</span>
                        </div>
                        <div class="dashboard-detail-row">
                            <span class="dashboard-detail-label">Company:</span>
                            <span class="dashboard-detail-value">${API.escapeHtml(lead.company || 'No company')}</span>
                        </div>
                        ${lead.email ? `
                            <div class="dashboard-detail-row">
                                <span class="dashboard-detail-label">Email:</span>
                                <span class="dashboard-detail-value">${API.escapeHtml(lead.email)}</span>
                            </div>
                        ` : ''}
                        ${lead.phone ? `
                            <div class="dashboard-detail-row">
                                <span class="dashboard-detail-label">Phone:</span>
                                <span class="dashboard-detail-value">${API.escapeHtml(lead.phone)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
        
        ${task.description ? `
            <div class="dashboard-detail-section dashboard-detail-full">
                <h3 class="dashboard-detail-section-title">Description</h3>
                <div class="dashboard-detail-description">${safeDescription}</div>
            </div>
        ` : ''}
    `;
},

    dashboard_renderTaskInDetail(task) {
        const safeTaskTitle = API.escapeHtml(task.title);
        const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0];

        return `
            <div class="dashboard-detail-task-item dashboard-detail-task-clickable ${task.status === 'completed' ? 'dashboard-task-completed' : ''}"
                 onclick="DashboardModule.dashboard_openTaskFromLead('${task.id}')">
                <div class="dashboard-task-status-icon">
                    <i data-lucide="${task.status === 'completed' ? 'check-circle' : isOverdue ? 'alert-triangle' : 'clipboard'}" style="width: 20px; height: 20px;"></i>
                </div>
                <div class="dashboard-task-info">
                    <div class="dashboard-task-title">${safeTaskTitle}</div>
                    <div class="dashboard-task-meta">
                        ${task.due_date ? this.dashboard_formatDate(task.due_date) : 'No due date'}
                        ${task.due_time ? ' • ' + task.due_time : ''}
                    </div>
                </div>
                <div class="dashboard-task-badge dashboard-badge-${task.status === 'completed' ? 'success' : isOverdue ? 'danger' : 'neutral'}">
                    ${this.dashboard_capitalize(task.status)}
                </div>
            </div>
        `;
    },

    dashboard_renderModalTasksList(tasks) {
        const today = new Date().toISOString().split('T')[0];
        
        if (tasks.length === 0) {
            return `
                <div class="dashboard-modal-empty-state">
                    <i data-lucide="clipboard" class="dashboard-empty-icon" style="width: 48px; height: 48px;"></i>
                    <div class="dashboard-empty-text">No tasks found</div>
                </div>
            `;
        }

        return `
            <div class="dashboard-modal-tasks-list">
                ${tasks.map(task => {
                    const isOverdue = task.due_date && task.due_date < today;
                    const isToday = task.due_date === today;
                    const safeTitle = API.escapeHtml(task.title);

                    return `
                        <div class="dashboard-modal-task-card ${task.status === 'completed' ? 'dashboard-task-completed' : ''}"
                             data-action="view-task-detail"
                             data-id="${task.id}">
                            <div class="dashboard-modal-task-header">
                                <div class="dashboard-modal-task-info">
                                    <div class="dashboard-modal-task-title">${safeTitle}</div>
                                    ${task.description ? `<div class="dashboard-modal-task-description">${API.escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                                </div>
                            </div>

                            <div class="dashboard-modal-task-meta">
                                ${task.due_date ? `
                                    <div class="dashboard-task-meta-item">
                                        <span class="dashboard-task-meta-value ${isOverdue ? 'dashboard-text-danger' : ''}">${this.dashboard_formatDate(task.due_date)}</span>
                                    </div>
                                ` : ''}
                                <div class="dashboard-task-meta-item">
                                    <span class="dashboard-detail-badge dashboard-badge-${task.status === 'completed' ? 'success' : isOverdue ? 'danger' : 'neutral'}">
                                        ${this.dashboard_capitalize(task.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    // MODAL SETUP WITH SEARCH - Enhanced like Pipeline
    dashboard_setupModalEvents(modal, contentType = null, originalData = null) {
        const closeBtn = modal.querySelector('.dashboard-modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });
        
        // Search functionality
        const searchInput = modal.querySelector('[data-search]');
        if (searchInput && contentType && originalData) {
            let timeout;
            searchInput.oninput = (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.state.modalSearchTerm = e.target.value;
                    this.dashboard_updateModalContent(modal, contentType, originalData);
                }, 300);
            };
        }
        
        // Handle nested actions
        modal.querySelectorAll('[data-action="view-lead-detail"]').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                const leadId = el.dataset.id;
                this.dashboard_showLeadDetailModal(leadId);
                modal.remove();
            };
        });
        
        modal.querySelectorAll('[data-action="view-task-detail"]').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                const taskId = el.dataset.id;
                this.dashboard_showTaskDetailModal(taskId);
                modal.remove();
            };
        });
    },

    dashboard_updateModalContent(modal, contentType, originalData) {
        const contentDiv = modal.querySelector('[data-content]');
        if (!contentDiv) return;
        
        let filteredData;
        if (contentType === 'leads') {
            filteredData = this.dashboard_filterLeads(originalData, this.state.modalSearchTerm);
            contentDiv.innerHTML = this.dashboard_renderModalLeadsList(filteredData);
        } else if (contentType === 'tasks') {
            filteredData = this.dashboard_filterTasks(originalData, this.state.modalSearchTerm);
            contentDiv.innerHTML = this.dashboard_renderModalTasksList(filteredData);
        }
        
        // Reattach events for new content
        this.dashboard_setupModalEvents(modal, contentType, originalData);
    },

    // REFRESH
    async dashboard_refresh() {
        try {
            await this.dashboard_loadData();
            this.dashboard_render();
            if (window.SteadyUtils?.showToast) {
                SteadyUtils.showToast('Dashboard refreshed', 'success');
            }
        } catch (error) {
            if (window.SteadyUtils?.showToast) {
                SteadyUtils.showToast('Failed to refresh', 'error');
            }
        }
    },

    // UTILITIES
    dashboard_getInitials(name) {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    dashboard_formatTimeAgo(date) {
        if (!date) return 'Unknown';
        const diff = Date.now() - new Date(date);
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    dashboard_formatDate(dateString) {
        if (!dateString) return '';
        // Normalize to YYYY-MM-DD format to avoid timezone issues
        const taskDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;
        const today = new Date().toISOString().split('T')[0];

        // Calculate tomorrow's date
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        if (taskDate === today) return 'Today';
        if (taskDate === tomorrow) return 'Tomorrow';

        // Format the date for display
        const date = new Date(taskDate + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month:'short', day: 'numeric' });
    },

    dashboard_formatTime(timeString) {
        if (!timeString) return '';
        const [hours, minutes, seconds] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    },

    dashboard_formatStatus(status) {
        const map = {
            'new': 'New',
            'contacted': 'Contacted',
            'qualified': 'Qualified',
            'negotiation': 'Negotiation',
            'closed': 'Closed',
            'lost': 'Lost'
        };
        return map[status] || status;
    },

    dashboard_getStatusClass(status) {
        const map = {
            'new': 'info',
            'contacted': 'warning',
            'qualified': 'success',
            'negotiation': 'warning',
            'closed': 'success',
            'lost': 'danger'
        };
        return map[status] || 'neutral';
    },

    dashboard_capitalize(text) {
    if (!text) return '';
    if (text.includes('_')) {
        return text.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
},

    // LOADING & ERROR - Simple like Pipeline
    dashboard_showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.style.opacity = '0';
            container.innerHTML = `<div style="min-height: 400px;"></div>`;
        }
    },

    dashboard_showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem;">
                    <div style="margin-bottom: 2rem; opacity: 0.6;"><i data-lucide="alert-triangle" style="width: 64px; height: 64px; color: var(--warning);"></i></div>
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem;">Dashboard Error</h2>
                    <p style="margin-bottom: 2rem; font-size: 1.125rem; color: var(--text-secondary);">${API.escapeHtml(message)}</p>
                    <button onclick="DashboardModule.dashboard_init()" style="padding: 1rem 2rem; background: var(--primary); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: 1rem;"><i data-lucide="refresh-cw" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Try Again</button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    // STYLES - All the beautiful design with search styling
    dashboard_renderStyles() {
        return `<style>
/* DASHBOARD v6.0 - SHARP & FAST WITH SEARCH STYLES */

.dashboard-container {
    max-width: 1400px;
    margin: 0 auto;
}

/* METRICS - Beautiful gradients and animations preserved */
.dashboard-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.dashboard-metric-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.75rem;
    cursor: pointer;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.dashboard-metric-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary);
}


.dashboard-metric-glow {
    position: absolute;
    inset: -50%;
    background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.4s;
    pointer-events: none;
}

.dashboard-metric-card:hover .dashboard-metric-glow {
    opacity: 0.1;
}

.dashboard-metric-warning {
    border-color: var(--warning);
}

.dashboard-metric-warning .dashboard-metric-glow {
    background: radial-gradient(circle, var(--warning) 0%, transparent 70%);
}

.dashboard-metric-highlight {
    border-color: var(--primary);
}

.dashboard-metric-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
}

.dashboard-metric-icon {
    font-size: 1.75rem;
}

.dashboard-metric-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.dashboard-metric-value {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 1rem;
}

.dashboard-metric-sub {
    font-size: 1.5rem;
    opacity: 0.5;
}

.dashboard-metric-footer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.dashboard-metric-progress {
    height: 8px;
    background: var(--border);
    border-radius: 999px;
    overflow: hidden;
}

.dashboard-metric-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--primary-light));
    border-radius: 999px;
    transition: width 1s ease;
}

.dashboard-metric-warning .dashboard-metric-fill {
    background: linear-gradient(90deg, var(--warning), var(--warning));
}

.dashboard-metric-detail {
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

/* PIPELINE SECTION */
.dashboard-pipeline {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    margin-bottom: 2rem;
}

.dashboard-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.dashboard-section-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
}

.dashboard-section-icon {
    font-size: 1.75rem;
}

.dashboard-view-btn {
    background: none;
    border: none;
    color: var(--primary);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
}

.dashboard-view-btn:hover {
    background: var(--primary-light);
    transform: translateX(4px);
}

.dashboard-pipeline-stages {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 1rem;
}

.dashboard-pipeline-stage {
    background: var(--background);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem 1rem;
    text-align: center;
    cursor: pointer;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.dashboard-stage-glow {
    position: absolute;
    inset: -50%;
    background: radial-gradient(circle, var(--stage-color) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.4s;
}

.dashboard-pipeline-stage:hover .dashboard-stage-glow {
    opacity: 0.15;
}

.dashboard-pipeline-stage:hover {
    transform: translateY(-4px);
    border-color: var(--stage-color);
    box-shadow: var(--shadow-md);
}

.dashboard-stage-icon-lg {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
}

.dashboard-stage-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-bottom: 0.5rem;
    letter-spacing: 0.05em;
}

.dashboard-stage-count {
    font-size: 2rem;
    font-weight: 900;
    color: var(--text-primary);
}

.dashboard-stage-value {
    font-size: 0.85rem;
    color: var(--success);
    font-weight: 700;
    margin-top: 0.5rem;
}

.dashboard-stage-hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 0.5rem;
    opacity: 0;
    transition: opacity 0.3s;
}

.dashboard-pipeline-stage:hover .dashboard-stage-hint {
    opacity: 1;
}

/* SPLIT SECTIONS */
.dashboard-split {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.dashboard-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.75rem;
}

/* LIST ITEMS */
.dashboard-list-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.dashboard-list-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: var(--transition);
    position: relative;
}

.dashboard-list-item:hover {
    border-color: var(--primary);
    transform: translateX(6px);
}

.dashboard-list-item.dashboard-item-overdue {
    border-color: var(--danger);
    background: var(--danger-light);
}

.dashboard-item-avatar {
    width: 44px;
    height: 44px;
    border-radius: var(--radius);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
}

.dashboard-avatar-text {
    color: white;
    font-weight: 800;
    font-size: 0.95rem;
}

.dashboard-avatar-glow {
    position: absolute;
    inset: -4px;
    background: var(--gradient-primary);
    border-radius: inherit;
    opacity: 0;
    filter: blur(8px);
    transition: opacity 0.3s;
    z-index: -1;
}

.dashboard-list-item:hover .dashboard-avatar-glow {
    opacity: 0.5;
}

.dashboard-task-status-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
    margin-right: 8px;
}

.dashboard-item-content {
    flex: 1;
    min-width: 0;
}

.dashboard-item-title {
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dashboard-item-subtitle {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.dashboard-item-badge {
    padding: 0.375rem 0.875rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
    text-transform: uppercase;
}

.dashboard-badge-info { background: var(--info-light); color: var(--info); }
.dashboard-badge-warning { background: var(--warning-light); color: var(--warning); }
.dashboard-badge-success { background: var(--success-light); color: var(--success); }
.dashboard-badge-danger { background: var(--danger-light); color: var(--danger); }
.dashboard-badge-neutral { background: var(--surface-hover); color: var(--text-secondary); }

.dashboard-empty-state {
    text-align: center;
    padding: 3rem 2rem;
    color: var(--text-tertiary);
    font-style: italic;
}

/* ACTIVITY FEED */
.dashboard-activity {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.75rem;
    margin-bottom: 2rem;
}

.dashboard-activity-timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.dashboard-activity-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: var(--background);
    border-radius: var(--radius);
    transition: var(--transition);
}

.dashboard-activity-item:hover {
    background: var(--surface-hover);
}

.dashboard-activity-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
}

.dashboard-activity-content {
    flex: 1;
}

.dashboard-activity-text {
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.dashboard-activity-time {
    font-size: 0.8rem;
    color: var(--text-tertiary);
}

/* UPGRADE CTA */
.dashboard-upgrade {
    background: var(--primary-light);
    border: 2px solid var(--primary);
    border-radius: var(--radius-lg);
    padding: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
}

.dashboard-upgrade-glow {
    position: absolute;
    inset: -50%;
    background: radial-gradient(circle, var(--primary), transparent);
}

.dashboard-upgrade-content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.dashboard-upgrade-icon {
    font-size: 3rem;
}

.dashboard-upgrade-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.dashboard-upgrade-subtitle {
    color: var(--text-secondary);
}

.dashboard-upgrade-btn {
    padding: 1rem 2rem;
    background: var(--gradient-primary);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.dashboard-btn-shine {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, var(--active-overlay), transparent);
    transform: translateX(-100%);
    transition: transform 0.6s;
}

.dashboard-upgrade-btn:hover .dashboard-btn-shine {
    transform: translateX(100%);
}

.dashboard-upgrade-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

/* MODALS */
.dashboard-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 2rem;
}

.dashboard-modal-overlay.show {
    opacity: 1;
}

.dashboard-modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    transform: scale(0.95) translateY(20px);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
}

.dashboard-modal-large {
    max-width: 1000px;
}

.dashboard-modal-detail {
    max-width: 800px;
}

.dashboard-modal-overlay.show .dashboard-modal {
    transform: scale(1) translateY(0);
}

.dashboard-modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-shrink: 0;
}

.dashboard-modal-header-content {
    flex: 1;
}

.dashboard-modal-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
}

.dashboard-modal-subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.dashboard-modal-close {
    width: 36px;
    height: 36px;
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius);
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    flex-shrink: 0;
    margin-left: 1rem;
}

.dashboard-modal-close:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
}

/* SEARCH BAR */
.dashboard-modal-search {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    background: var(--surface-hover);
}

.search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.search-input {
    width: 100%;
    padding: 0.875rem 3rem 0.875rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: var(--radius);
    font-size: 1rem;
    background: var(--surface);
    color: var(--text-primary);
    transition: all 0.2s ease;
}

.search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-light);
}

.search-icon {
    position: absolute;
    right: 1rem;
    color: var(--text-tertiary);
    pointer-events: none;
    font-size: 1.25rem;
}

.dashboard-modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
}

/* MODAL CONTENT */
.dashboard-modal-leads-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
}

.dashboard-modal-lead-card {
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    cursor: pointer;
    transition: var(--transition);
}

.dashboard-modal-lead-card:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
}

.dashboard-modal-card-header {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.dashboard-modal-card-avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--radius);
    background: var(--gradient-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1rem;
    flex-shrink: 0;
}

.dashboard-modal-card-info {
    flex: 1;
    min-width: 0;
}

.dashboard-modal-card-name {
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dashboard-modal-card-company {
    font-size: 0.85rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dashboard-modal-card-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.dashboard-modal-detail-row {
    font-size: 0.85rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dashboard-modal-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
}

.dashboard-modal-card-status {
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
}

.dashboard-modal-card-time {
    font-size: 0.8rem;
    color: var(--text-tertiary);
}

/* DETAIL GRIDS */
.dashboard-detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 1.5rem;
}

.dashboard-detail-section {
    background: var(--background);
    padding: 1.25rem;
    border-radius: var(--radius);
}

.dashboard-detail-section.dashboard-detail-full {
    grid-column: 1 / -1;
}

.dashboard-detail-section-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 1rem;
}

.dashboard-detail-rows {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.dashboard-detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
}

.dashboard-detail-row:last-child {
    border-bottom: none;
}

.dashboard-detail-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
}

.dashboard-detail-value {
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 500;
}

.dashboard-detail-value-money {
    color: var(--success);
    font-weight: 700;
}

.dashboard-detail-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
}

.dashboard-detail-notes-content {
    color: var(--text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.dashboard-detail-description {
    color: var(--text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
}

/* TASK LISTS */
.dashboard-modal-tasks-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.dashboard-modal-task-card {
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    cursor: pointer;
    transition: var(--transition);
}

.dashboard-modal-task-card:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
}

.dashboard-modal-task-card.dashboard-task-completed {
    opacity: 0.7;
}

.dashboard-modal-task-header {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.dashboard-modal-task-info {
    flex: 1;
}

.dashboard-modal-task-title {
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.dashboard-modal-task-description {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.dashboard-modal-task-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.dashboard-task-meta-item {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.dashboard-task-meta-value {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 600;
}

.dashboard-text-danger {
    color: var(--danger);
}

.dashboard-detail-tasks-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.dashboard-detail-task-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface);
    border-radius: var(--radius);
    cursor: pointer;
    transition: var(--transition);
    border: 2px solid transparent;
}

.dashboard-detail-task-item.dashboard-detail-task-clickable:hover {
    background: var(--surface-hover);
    border-color: var(--primary);
    transform: translateX(4px);
}

.dashboard-detail-task-item.dashboard-task-completed {
    opacity: 0.7;
}

.dashboard-task-info {
    flex: 1;
}

.dashboard-task-title {
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.dashboard-task-meta {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.dashboard-task-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
}

/* LEAD PREVIEW CARD */
.dashboard-lead-preview-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface);
    border-radius: var(--radius);
    cursor: pointer;
    transition: var(--transition);
    border: 1px solid var(--border);
}

.dashboard-lead-preview-card:hover {
    background: var(--surface-hover);
    transform: translateX(4px);
}

.dashboard-lead-preview-avatar {
    width: 40px;
    height: 40px;
    border-radius: var(--radius);
    background: var(--gradient-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.9rem;
}

.dashboard-lead-preview-info {
    flex: 1;
}

.dashboard-lead-preview-name {
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.dashboard-lead-preview-company {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.dashboard-lead-preview-arrow {
    color: var(--primary);
    font-size: 1.25rem;
}

/* WIN RATE MODAL */
.dashboard-winrate-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.dashboard-winrate-card {
    background: var(--background);
    border-radius: var(--radius-lg);
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.dashboard-winrate-won {
    border: 2px solid var(--success);
}

.dashboard-winrate-lost {
    border: 2px solid var(--danger);
}

.dashboard-winrate-icon {
    font-size: 3rem;
}

.dashboard-winrate-content {
    flex: 1;
}

.dashboard-winrate-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
}

.dashboard-winrate-count {
    font-size: 2rem;
    font-weight: 900;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.dashboard-winrate-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--success);
}

.dashboard-winrate-sections {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.dashboard-winrate-section {
    background: var(--background);
    padding: 1.5rem;
    border-radius: var(--radius-lg);
}

.dashboard-winrate-section-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
}

/* CAPACITY MODAL */
.dashboard-capacity-overview {
    padding: 2rem;
    background: var(--background);
    border-radius: var(--radius-lg);
    margin-bottom: 2rem;
}

.dashboard-capacity-stats {
    display: flex;
    justify-content: space-around;
    gap: 2rem;
}

.dashboard-capacity-stat {
    text-align: center;
}

.dashboard-capacity-stat-value {
    font-size: 3rem;
    font-weight: 900;
    color: var(--primary);
    line-height: 1;
    margin-bottom: 0.5rem;
}

.dashboard-capacity-stat-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 600;
}

.dashboard-capacity-breakdown {
    background: var(--background);
    padding: 1.5rem;
    border-radius: var(--radius-lg);
}

.dashboard-capacity-breakdown-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
}

.dashboard-source-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.dashboard-source-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.dashboard-source-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.dashboard-source-name {
    font-weight: 700;
    color: var(--text-primary);
}

.dashboard-source-count {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.dashboard-source-bar {
    height: 8px;
    background: var(--border);
    border-radius: 999px;
    overflow: hidden;
}

.dashboard-source-fill {
    height: 100%;
    background: var(--gradient-primary);
    border-radius: 999px;
    transition: width 1s ease;
}

/* MODAL EMPTY STATE */
.dashboard-modal-empty-state {
    text-align: center;
    padding: 4rem 2rem;
}

.dashboard-empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.6;
}

.dashboard-empty-text {
    font-size: 1.125rem;
    color: var(--text-secondary);
}

/* ANIMATIONS - Removed (skeleton handles first load) */

/* RESPONSIVE */
@media (max-width: 1200px) {
    .dashboard-metrics {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .dashboard-pipeline-stages {
        grid-template-columns: repeat(3, 1fr);
    }
    
    .dashboard-detail-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .dashboard-metrics,
    .dashboard-split {
        grid-template-columns: 1fr;
    }
    
    .dashboard-pipeline-stages {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .dashboard-modal-leads-grid {
        grid-template-columns: 1fr;
    }
    
    .dashboard-modal {
        margin: 1rem;
        max-height: 95vh;
    }
    
    .dashboard-winrate-stats {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 480px) {
    .dashboard-modal-overlay {
        padding: 0;
    }
    
    .dashboard-modal {
        margin: 0;
        border-radius: 0;
        max-height: 100vh;
        height: 100vh;
    }
    
    .dashboard-pipeline-stages {
        grid-template-columns: 1fr;
    }
}

/* ACTIVITY SUMMARY MODAL */
.activity-time-selector {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    margin-bottom: 2rem;
}

.activity-time-selector label {
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
}

.activity-time-dropdown {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 2px solid var(--border);
    border-radius: var(--radius);
    background: var(--background);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 12px;
    color: var(--text-primary);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: var(--transition);
    min-width: 200px;
}

.activity-time-dropdown:hover {
    border-color: var(--primary);
    background-color: var(--background);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
}

.activity-time-dropdown:focus {
    outline: none;
    border-color: var(--primary);
    background-color: var(--background);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    box-shadow: 0 0 0 3px var(--primary-light);
}

.activity-time-dropdown option {
    background: var(--background);
    color: var(--text-primary);
    padding: 0.75rem;
}

.activity-date-display {
    color: var(--text-secondary);
    font-weight: 600;
    margin-left: auto;
}

.activity-summary-header {
    font-size: 0.75rem;
    font-weight: 900;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
}

.activity-summary-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.activity-card {
    background: var(--background);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    text-align: center;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.activity-card:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
}

.activity-card-label {
    font-size: 0.9rem;
    font-weight: 900;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.75rem;
}

.activity-card-value {
    font-size: 3rem;
    font-weight: 900;
    color: var(--primary);
    line-height: 1;
}

.activity-card-sub {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--success);
    margin-top: 0.5rem;
}

.activity-section-divider {
    height: 2px;
    background: var(--border);
    margin: 2rem 0;
}

.activity-pipeline-movement {
    display: grid;
    gap: 0.75rem;
    margin-bottom: 2rem;
}

.activity-movement-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: all 0.2s ease;
}

.activity-movement-item:hover {
    border-color: var(--primary);
    transform: translateX(4px);
}

.activity-movement-badge {
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 0.9rem;
}

.activity-movement-badge.badge-new { background: #06b6d4; color: white; }
.activity-movement-badge.badge-contacted { background: #f59e0b; color: white; }
.activity-movement-badge.badge-qualified { background: #8b5cf6; color: white; }
.activity-movement-badge.badge-negotiation { background: #F97316; color: white; }
.activity-movement-badge.badge-closed { background: #10b981; color: white; }
.activity-movement-badge.badge-closed_won { background: #10b981; color: white; }
.activity-movement-badge.badge-lost { background: #ef4444; color: white; }
.activity-movement-badge.badge-closed_lost { background: #ef4444; color: white; }

.activity-movement-count {
    font-weight: 700;
    color: var(--text-secondary);
}

.activity-daily-breakdown {
    display: grid;
    gap: 1.5rem;
}

.activity-daily-card {
    background: var(--background);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    transition: all 0.2s ease;
}

.activity-daily-card:hover {
    border-color: var(--primary);
    box-shadow: var(--shadow);
}

.activity-daily-date {
    font-size: 0.85rem;
    font-weight: 900;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid var(--border);
}

.activity-daily-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 1rem;
}

.activity-daily-stat {
    text-align: center;
}

.activity-daily-stat-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
}

.activity-daily-stat-value {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--text-primary);
}

.activity-daily-movements {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
}

.activity-daily-movement-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.4rem 0.75rem;
    border-radius: var(--radius);
    background: var(--primary-bg);
    color: var(--primary);
}

@media (max-width: 768px) {
    .activity-summary-cards {
        grid-template-columns: 1fr;
    }

    .activity-daily-stats {
        grid-template-columns: repeat(3, 1fr);
    }

    .activity-time-selector {
        flex-direction: column;
        align-items: flex-start;
    }

    .activity-date-display {
        margin-left: 0;
    }
}
</style>`;
    }
};

// SHELL COMPATIBILITY - Clean like Pipeline
if (typeof window !== 'undefined') {
    window.DashboardModule = DashboardModule;
    DashboardModule.init = function(targetContainer) {
        return this.dashboard_init(targetContainer);
    };
    console.log('Dashboard module loaded');
}