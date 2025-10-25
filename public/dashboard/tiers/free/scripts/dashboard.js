/**
 * DASHBOARD MODULE v6.0 - SHARP & FAST WITH SEARCH
 * 
 * Pipeline-inspired architecture with Dashboard's beautiful design
 * Instant loading, snappy performance, search-enabled modals
 * 
 * @version 6.0.0 - Sharp Edition with Search
 */

window.DashboardModule = {
    // STATE - Minimal like Pipeline
    state: {
        leads: [],
        tasks: [],
        stats: null,
        profile: null,
        container: 'dashboard-content',
        modalSearchTerm: ''
    },

    // INIT - Sharp and direct
    async dashboard_init(targetContainer = 'dashboard-content') {
        console.log('Dashboard module loading');
        
        this.state.container = targetContainer;
        this.dashboard_showLoading();
        
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
        const [stats, leadsData, tasks, profile] = await Promise.all([
            API.getBasicStats(),
            API.getLeads(),
            API.getTasks(),
            API.getProfile()
        ]);
        
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
    dashboard_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const isFreeTier = this.state.profile.user_type === 'free';
        
        container.innerHTML = `
            ${this.dashboard_renderStyles()}
            <div class="dashboard-container">
                ${this.dashboard_renderMetrics()}
                ${this.dashboard_renderPipeline()}
                <div class="dashboard-split">
                    ${this.dashboard_renderLeadsList()}
                    ${this.dashboard_renderTasksList()}
                </div>
                ${this.dashboard_renderActivityFeed()}
                ${isFreeTier ? this.dashboard_renderUpgradeCTA() : ''}
            </div>
        `;

        // Sharp fade-in like Pipeline
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
            this.dashboard_attachEvents();
        }, 50);
    },

    // METRICS - Clean and efficient with value cap
    dashboard_renderMetrics() {
        const stats = this.state.stats;
        const profile = this.state.profile;
        const currentLeads = profile.current_leads || 0;
        const leadLimit = profile.current_lead_limit || 50;
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
        
        return `
            <div class="dashboard-metrics">
                <div class="dashboard-metric-card dashboard-metric-1 ${percentage > 90 ? 'dashboard-metric-warning' : ''}" data-action="drill-capacity">
                    <div class="dashboard-metric-glow"></div>
                    <div class="dashboard-metric-header">
                        <span class="dashboard-metric-icon">📊</span>
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
                        <span class="dashboard-metric-icon">📈</span>
                        <span class="dashboard-metric-label">This Week</span>
                    </div>
                    <div class="dashboard-metric-value">+${weekLeads}</div>
                    <div class="dashboard-metric-footer">
                        <span class="dashboard-metric-detail">New leads added • Click to view</span>
                    </div>
                </div>
                
                <div class="dashboard-metric-card dashboard-metric-3 ${todayTasks > 0 ? 'dashboard-metric-highlight' : ''}" data-action="drill-tasks">
                    <div class="dashboard-metric-glow"></div>
                    <div class="dashboard-metric-header">
                        <span class="dashboard-metric-icon">✅</span>
                        <span class="dashboard-metric-label">Tasks Due</span>
                    </div>
                    <div class="dashboard-metric-value">${todayTasks}</div>
                    <div class="dashboard-metric-footer">
                        <span class="dashboard-metric-detail">
                            ${stats.overdueTasks > 0 ? 
                                `${stats.overdueTasks} overdue • Click to view` : 
                                'All caught up!'}
                        </span>
                    </div>
                </div>
                
                <div class="dashboard-metric-card dashboard-metric-4" data-action="drill-winrate">
                    <div class="dashboard-metric-glow"></div>
                    <div class="dashboard-metric-header">
                        <span class="dashboard-metric-icon">🎯</span>
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
            { id: 'new', name: 'New', icon: '🆕', color: '#06b6d4' },
            { id: 'contacted', name: 'Contacted', icon: '📞', color: '#f59e0b' },
            { id: 'qualified', name: 'Qualified', icon: '✅', color: '#8b5cf6' },
            { id: 'negotiation', name: 'Negotiation', icon: '🤝', color: '#f97316' },
            { id: 'closed', name: 'Closed', icon: '🎉', color: '#10b981' },
            { id: 'lost', name: 'Lost', icon: '❌', color: '#ef4444' }
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
                        <span class="dashboard-section-icon">🌿</span>
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
                            <div class="dashboard-stage-icon-lg">${stage.icon}</div>
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
                        <span class="dashboard-section-icon">👥</span>
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
                        <span class="dashboard-section-icon">📋</span>
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
                    ${isOverdue ? '⚠️' : isToday ? '⏰' : '📋'}
                </div>
                <div class="dashboard-item-content">
                    <div class="dashboard-item-title">${safeTitle}</div>
                    <div class="dashboard-item-subtitle">
                        ${formattedTime ? formattedTime + ' • ' : ''}${dueLabel}
                    </div>
                </div>
                <div class="dashboard-item-badge dashboard-badge-${isOverdue ? 'danger' : isToday ? 'warning' : 'neutral'}">
                    ${dueLabel}
                </div>
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
                        <span class="dashboard-section-icon">📊</span>
                        Recent Activity
                    </h3>
                </div>
                
                <div class="dashboard-activity-timeline">
                    ${activities.slice(0, 10).map(activity => `
                        <div class="dashboard-activity-item">
                            <div class="dashboard-activity-icon">${activity.icon}</div>
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
                icon: '👤',
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
                    icon: '✅',
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
                    icon: '🎉',
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
                    <div class="dashboard-upgrade-icon">🚀</div>
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
                        <span class="search-icon">🔍</span>
                    </div>
                </div>
                
                <div class="dashboard-modal-body" data-content="leads">
                    ${this.dashboard_renderModalLeadsList(stageLeads)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.dashboard_setupModalEvents(modal, 'leads', stageLeads);
    },

    dashboard_showLeadDetailModal(leadId) {
        const lead = this.state.leads.find(l => l.id === leadId);
        if (!lead) return;
        
        const relatedTasks = this.state.tasks.filter(t => t.lead_id === leadId);
        
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal-overlay show';
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
        this.dashboard_setupModalEvents(modal);
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
                        <span class="search-icon">🔍</span>
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
                        <span class="search-icon">🔍</span>
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
        const profile = this.state.profile;
        const currentLeads = profile.current_leads || 0;
        const leadLimit = profile.current_lead_limit || 50;
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
                        <span class="search-icon">🔍</span>
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
                        <span class="search-icon">🔍</span>
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
                            <div class="dashboard-winrate-icon">🎉</div>
                            <div class="dashboard-winrate-content">
                                <div class="dashboard-winrate-label">Won</div>
                                <div class="dashboard-winrate-count">${closedLeads.length}</div>
                                <div class="dashboard-winrate-value">${this.dashboard_formatValue(closedValue)}</div>
                            </div>
                        </div>
                        
                        <div class="dashboard-winrate-card dashboard-winrate-lost">
                            <div class="dashboard-winrate-icon">❌</div>
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
        this.dashboard_setupModalEvents(modal);
    },

    // RENDER MODAL CONTENT
    dashboard_renderModalLeadsList(leads) {
        if (leads.length === 0) {
            return `
                <div class="dashboard-modal-empty-state">
                    <div class="dashboard-empty-icon">🔍</div>
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
                    ${lead.email ? `<div class="dashboard-modal-detail-row">📧 ${safeEmail}</div>` : ''}
                    ${lead.phone ? `<div class="dashboard-modal-detail-row">📞 ${API.escapeHtml(lead.phone)}</div>` : ''}
                    ${lead.potential_value ? `<div class="dashboard-modal-detail-row">💰 ${this.dashboard_formatValue(lead.potential_value)}</div>` : ''}
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
            <div class="dashboard-detail-task-item ${task.status === 'completed' ? 'dashboard-task-completed' : ''}">
                <div class="dashboard-task-status-icon">
                    ${task.status === 'completed' ? '✅' : isOverdue ? '⚠️' : '📋'}
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
                    <div class="dashboard-empty-icon">📋</div>
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
                                <div class="dashboard-task-status-icon">
                                    ${task.status === 'completed' ? '✅' : isOverdue ? '⚠️' : isToday ? '⏰' : '📋'}
                                </div>
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
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        
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
                    <div style="font-size: 4rem; margin-bottom: 2rem; opacity: 0.6;">⚠️</div>
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem;">Dashboard Error</h2>
                    <p style="margin-bottom: 2rem; font-size: 1.125rem; color: var(--text-secondary);">${API.escapeHtml(message)}</p>
                    <button onclick="DashboardModule.dashboard_init()" style="padding: 1rem 2rem; background: var(--primary); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: 1rem;">🔄 Try Again</button>
                </div>
            `;
        }
    },

    // STYLES - All the beautiful design with search styling
    dashboard_renderStyles() {
        return `<style>
/* DASHBOARD v6.0 - SHARP & FAST WITH SEARCH STYLES */

.dashboard-container {
    max-width: 1400px;
    margin: 0 auto;
    transition: opacity 0.3s ease;
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

.dashboard-metric-1 { animation: dashSlideUp 0.5s ease 0.1s backwards; }
.dashboard-metric-2 { animation: dashSlideUp 0.5s ease 0.15s backwards; }
.dashboard-metric-3 { animation: dashSlideUp 0.5s ease 0.2s backwards; }
.dashboard-metric-4 { animation: dashSlideUp 0.5s ease 0.25s backwards; }

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
    background: linear-gradient(90deg, var(--warning), #fbbf24);
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
    animation: dashSlideUp 0.6s ease 0.3s backwards;
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
    background: rgba(102, 126, 234, 0.1);
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
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
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
    animation: dashSlideUp 0.6s ease;
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
    background: rgba(239, 68, 68, 0.05);
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
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
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

.dashboard-badge-info { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.dashboard-badge-warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.dashboard-badge-success { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.dashboard-badge-danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
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
    animation: dashSlideUp 0.6s ease 0.4s backwards;
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
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(139, 92, 246, 0.1));
    border: 2px solid rgba(102, 126, 234, 0.2);
    border-radius: var(--radius-lg);
    padding: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
    animation: dashSlideUp 0.6s ease 0.5s backwards;
}

.dashboard-upgrade-glow {
    position: absolute;
    inset: -50%;
    background: radial-gradient(circle, rgba(102, 126, 234, 0.3), transparent);
    animation: dashGlow 3s infinite;
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
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transform: translateX(-100%);
    transition: transform 0.6s;
}

.dashboard-upgrade-btn:hover .dashboard-btn-shine {
    transform: translateX(100%);
}

.dashboard-upgrade-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

/* MODALS */
.dashboard-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
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
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
}

.dashboard-detail-task-item:hover {
    background: var(--surface-hover);
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

/* ANIMATIONS */
@keyframes dashSlideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes dashGlow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
}

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