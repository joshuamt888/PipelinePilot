/**
 * PIPELINE REVOLUTION v2.0
 * Completely redesigned pipeline with overlay integration
 *
 * Design: Glassmorphism + Modern UX + Overlay System
 * Integration: Works with OverlayManager from index.html
 */

window.PipelineModule = {
    // State
    state: {
        leads: [],
        stats: { currentLeads: 0, currentLeadLimit: 50 },
        filters: { search: '', types: [], sources: [], scores: [] },
        draggedLead: null,
        container: 'pipeline-content'
    },

    // Stage definitions with gradients and Lucide icons
    stages: [
        { id: 'new', name: 'New Leads', icon: 'sparkles', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', desc: 'Fresh opportunities' },
        { id: 'contacted', name: 'Contacted', icon: 'phone', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', desc: 'Initial outreach made' },
        { id: 'negotiation', name: 'Negotiation', icon: 'handshake', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', desc: 'Discussing terms' },
        { id: 'qualified', name: 'Qualified', icon: 'check-circle', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', desc: 'Ready to close' },
        { id: 'closed', name: 'Closed Won', icon: 'trophy', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', desc: 'Successfully converted' },
        { id: 'lost', name: 'Lost', icon: 'x-circle', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', desc: 'Not converted' }
    ],

    // Initialize
    async init(targetContainer = 'pipeline-content') {
        console.log('🚀 Pipeline Revolution v2.0 loading...');

        this.state.container = targetContainer;
        this.showLoading();

        try {
            await this.loadData();
            this.render();
            this.attachEvents();
            console.log('✅ Pipeline Revolution ready!');
        } catch (error) {
            console.error('Pipeline init failed:', error);
            this.showError('Failed to load pipeline');
        }
    },

    // Load data
    async loadData() {
        const [leadData, stats] = await Promise.all([
            API.getLeads(),
            API.getCurrentStats()
        ]);

        this.state.leads = (Array.isArray(leadData) ? leadData : leadData.all || []).map(lead => ({
            ...lead,
            status: lead.status || 'new',
            potential_value: lead.potential_value || 0,
            quality_score: lead.quality_score || 5,
            type: lead.type || 'cold',
            win_probability: lead.win_probability || 50,
            position: lead.position || null,
            department: lead.department || null,
            next_action: lead.next_action || null,
            tags: lead.tags || []
        }));

        this.state.stats = {
            currentLeads: stats.currentLeads || 0,
            currentLeadLimit: stats.currentLeadLimit || 50
        };
    },

    // Get filtered leads organized by stage
    getOrganizedLeads() {
        const { search, types, sources, scores } = this.state.filters;
        const organized = {};

        this.stages.forEach(stage => {
            organized[stage.id] = this.state.leads.filter(lead => {
                if (lead.status !== stage.id) return false;

                if (search) {
                    const term = search.toLowerCase();
                    const matches = [lead.name, lead.company, lead.email, lead.position].some(field =>
                        field?.toLowerCase().includes(term)
                    );
                    if (!matches) return false;
                }

                if (types.length && !types.includes(lead.type)) return false;
                if (scores.length) {
                    const score = lead.quality_score || 5;
                    const category = score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low';
                    if (!scores.includes(category)) return false;
                }

                return true;
            });
        });

        return organized;
    },

    // Calculate analytics
    getAnalytics() {
        const organized = this.getOrganizedLeads();
        const allLeads = this.state.leads;

        const totalValue = allLeads.reduce((sum, l) => sum + (l.potential_value || 0), 0);
        const totalWeightedValue = allLeads.reduce((sum, l) =>
            sum + ((l.potential_value || 0) * ((l.win_probability || 50) / 100)), 0
        );

        const closedLeads = organized.closed || [];
        const lostLeads = organized.lost || [];
        const totalOutcome = closedLeads.length + lostLeads.length;
        const winRate = totalOutcome > 0 ? Math.round((closedLeads.length / totalOutcome) * 100) : 0;

        return {
            totalValue,
            totalWeightedValue,
            winRate,
            totalLeads: allLeads.length,
            activeLeads: allLeads.length - closedLeads.length - lostLeads.length
        };
    },

    // Render main view
    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const organized = this.getOrganizedLeads();
        const analytics = this.getAnalytics();

        container.innerHTML = `
            ${this.renderStyles()}
            ${this.renderTopBar(analytics)}
            ${this.renderFilters()}
            ${this.renderStages(organized)}
        `;

        this.attachEvents();

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // Render top analytics bar
    renderTopBar(analytics) {
        return `
            <div class="pipeline-topbar">
                <div class="pipeline-stat">
                    <div class="stat-icon"><i data-lucide="dollar-sign"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Total Pipeline</div>
                        <div class="stat-value">${SteadyUtils.formatCurrency(analytics.totalValue)}</div>
                    </div>
                </div>
                <div class="pipeline-stat">
                    <div class="stat-icon"><i data-lucide="target"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Weighted Value</div>
                        <div class="stat-value">${SteadyUtils.formatCurrency(analytics.totalWeightedValue)}</div>
                    </div>
                </div>
                <div class="pipeline-stat">
                    <div class="stat-icon"><i data-lucide="trending-up"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Win Rate</div>
                        <div class="stat-value">${analytics.winRate}%</div>
                    </div>
                </div>
                <div class="pipeline-stat">
                    <div class="stat-icon"><i data-lucide="users"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Active Leads</div>
                        <div class="stat-value">${analytics.activeLeads} / ${analytics.totalLeads}</div>
                    </div>
                </div>
            </div>
        `;
    },

    // Render filters bar
    renderFilters() {
        return `
            <div class="pipeline-filters">
                <div class="filter-search">
                    <input type="text"
                           id="pipeline-search"
                           placeholder="Search leads..."
                           value="${this.state.filters.search}"
                           class="search-input">
                </div>
                <div class="filter-actions">
                    <button class="filter-btn" onclick="PipelineModule.openQuickAdd()">
                        <i data-lucide="plus"></i> Quick Add Lead
                    </button>
                    <button class="filter-btn" onclick="PipelineModule.clearFilters()">
                        <i data-lucide="refresh-cw"></i> Reset Filters
                    </button>
                </div>
            </div>
        `;
    },

    // Render stages
    renderStages(organized) {
        return `
            <div class="pipeline-stages">
                ${this.stages.map(stage => this.renderStage(stage, organized[stage.id] || [])).join('')}
            </div>
        `;
    },

    // Render single stage
    renderStage(stage, leads) {
        const stageValue = leads.reduce((sum, l) => sum + (l.potential_value || 0), 0);

        return `
            <div class="pipeline-stage" data-stage-id="${stage.id}">
                <div class="stage-header" style="background: ${stage.gradient}">
                    <div class="stage-icon"><i data-lucide="${stage.icon}"></i></div>
                    <div class="stage-info">
                        <div class="stage-name">${stage.name}</div>
                        <div class="stage-desc">${stage.desc}</div>
                    </div>
                    <div class="stage-stats">
                        <div class="stage-count">${leads.length}</div>
                        <div class="stage-value">${SteadyUtils.formatCurrency(stageValue)}</div>
                    </div>
                </div>
                <div class="stage-content" data-stage-content="${stage.id}">
                    ${leads.length > 0
                        ? leads.map(lead => this.renderLeadCard(lead, stage)).join('')
                        : this.renderEmpty(stage)
                    }
                </div>
            </div>
        `;
    },

    // Render lead card - REVOLUTIONARY DESIGN
    renderLeadCard(lead, stage) {
        const winProb = lead.win_probability || 50;
        const probColor = winProb >= 75 ? '#10b981' : winProb >= 50 ? '#f59e0b' : '#ef4444';
        const valueColor = (lead.potential_value || 0) >= 10000 ? '#10b981' : '#667eea';

        const initials = this.getInitials(lead.name);
        const timeAgo = this.formatTimeAgo(lead.created_at);

        return `
            <div class="pipeline-card glass"
                 data-lead-id="${lead.id}"
                 draggable="true">

                <!-- Card Header with Avatar & Win Probability Ring -->
                <div class="card-header-new">
                    <div class="avatar-container">
                        <svg class="progress-ring" width="52" height="52">
                            <circle class="progress-ring-bg" cx="26" cy="26" r="22" />
                            <circle class="progress-ring-circle"
                                    cx="26" cy="26" r="22"
                                    stroke="${probColor}"
                                    stroke-dasharray="${138.23 * (winProb / 100)} ${138.23}"
                                    transform="rotate(-90 26 26)" />
                        </svg>
                        <div class="lead-avatar-new">
                            <span class="avatar-text">${initials}</span>
                        </div>
                    </div>
                    <div class="lead-info-new">
                        <div class="lead-name-new">${API.escapeHtml(lead.name)}</div>
                        <div class="lead-company-new">${API.escapeHtml(lead.company || 'No company')}</div>
                    </div>
                </div>

                <!-- Deal Value -->
                <div class="card-value" style="color: ${valueColor}">
                    <span class="value-icon"><i data-lucide="dollar-sign"></i></span>
                    <span class="value-amount">${SteadyUtils.formatCurrency(lead.potential_value || 0)}</span>
                </div>

                <!-- Badges -->
                <div class="card-badges">
                    ${lead.position ? `<span class="badge badge-position"><i data-lucide="user"></i> ${API.escapeHtml(lead.position)}</span>` : ''}
                    ${lead.department ? `<span class="badge badge-department"><i data-lucide="building"></i> ${API.escapeHtml(lead.department)}</span>` : ''}
                    ${lead.type === 'warm' ? `<span class="badge badge-warm"><i data-lucide="flame"></i> Warm</span>` : `<span class="badge badge-cold"><i data-lucide="wind"></i> Cold</span>`}
                </div>

                <!-- Tags -->
                ${lead.tags && lead.tags.length > 0 ? `
                    <div class="card-tags">
                        ${lead.tags.slice(0, 3).map(tag =>
                            `<span class="tag">${API.escapeHtml(tag)}</span>`
                        ).join('')}
                        ${lead.tags.length > 3 ? `<span class="tag tag-more">+${lead.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}

                <!-- Next Action -->
                ${lead.next_action ? `
                    <div class="card-next-action">
                        <span class="action-icon"><i data-lucide="clock"></i></span>
                        <span class="action-text">${API.escapeHtml(lead.next_action)}</span>
                    </div>
                ` : ''}

                <!-- Card Footer -->
                <div class="card-footer-new">
                    <div class="footer-time">${timeAgo}</div>
                    <div class="footer-prob">${winProb}% win</div>
                </div>

                <!-- Quick Actions (appears on hover) -->
                <div class="card-quick-actions">
                    <button class="quick-action" data-action="view" title="View Details">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="quick-action" data-action="move" title="Move Stage">
                        <i data-lucide="arrow-right"></i>
                    </button>
                    <button class="quick-action" data-action="delete" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    },

    // Render empty state
    renderEmpty(stage) {
        return `
            <div class="empty-state-new">
                <div class="empty-icon"><i data-lucide="${stage.icon}"></i></div>
                <div class="empty-text">No ${stage.name.toLowerCase()} yet</div>
                <div class="empty-hint">Drag leads here or add new ones</div>
            </div>
        `;
    },

    // Attach event listeners using delegation
    attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Search
        const searchInput = document.getElementById('pipeline-search');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.state.filters.search = e.target.value;
                this.render();
            };
        }

        // Card clicks - event delegation
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.pipeline-card');
            if (!card) return;

            const leadId = card.dataset.leadId;

            // Check if clicked on quick action
            const quickAction = e.target.closest('.quick-action');
            if (quickAction) {
                e.stopPropagation();
                const action = quickAction.dataset.action;
                this.handleQuickAction(action, leadId);
                return;
            }

            // Otherwise open detail overlay
            OverlayManager.open('lead-detail', { leadId });
        });

        // Drag and drop
        this.attachDragDrop();
    },

    // Attach drag and drop
    attachDragDrop() {
        document.querySelectorAll('.pipeline-card').forEach(card => {
            card.ondragstart = (e) => {
                this.state.draggedLead = card.dataset.leadId;
                card.classList.add('dragging');
            };

            card.ondragend = () => {
                card.classList.remove('dragging');
                this.state.draggedLead = null;
            };
        });

        document.querySelectorAll('.stage-content').forEach(stage => {
            stage.ondragover = (e) => {
                e.preventDefault();
                stage.classList.add('drag-over');
            };

            stage.ondragleave = () => {
                stage.classList.remove('drag-over');
            };

            stage.ondrop = (e) => {
                e.preventDefault();
                stage.classList.remove('drag-over');
                const targetStage = stage.dataset.stageContent;
                if (this.state.draggedLead && targetStage) {
                    this.updateLeadStatus(this.state.draggedLead, targetStage);
                }
            };
        });
    },

    // Handle quick actions
    handleQuickAction(action, leadId) {
        switch(action) {
            case 'view':
                OverlayManager.open('lead-detail', { leadId });
                break;
            case 'move':
                this.showMoveDialog(leadId);
                break;
            case 'delete':
                this.deleteLead(leadId);
                break;
        }
    },

    // Update lead status (drag and drop)
    async updateLeadStatus(leadId, newStatus) {
        try {
            await API.updateLead(leadId, { status: newStatus });
            SteadyUtils.showToast(`Lead moved to ${newStatus}`, 'success');
            await this.loadData();
            this.render();
        } catch (error) {
            SteadyUtils.showToast('Failed to update lead', 'error');
        }
    },

    // Show move dialog
    showMoveDialog(leadId) {
        // For now, just show stages in a simple way
        const stages = this.stages.map(s => `${s.icon} ${s.name}`).join('\n');
        alert(`Move to:\n\n${stages}\n\n(Full overlay coming soon)`);
    },

    // Delete lead
    async deleteLead(leadId) {
        if (!confirm('Delete this lead?')) return;

        try {
            await API.deleteLead(leadId);
            SteadyUtils.showToast('Lead deleted', 'success');
            await this.loadData();
            this.render();
        } catch (error) {
            SteadyUtils.showToast('Failed to delete lead', 'error');
        }
    },

    // Open quick add overlay
    openQuickAdd() {
        OverlayManager.open('quick-add-lead');
    },

    // Clear filters
    clearFilters() {
        this.state.filters = { search: '', types: [], sources: [], scores: [] };
        this.render();
    },

    // Helper: Get initials
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    },

    // Helper: Format time ago
    formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return `${Math.floor(seconds / 604800)}w ago`;
    },

    // Loading state
    showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = '<div style="padding: 3rem; text-align: center; color: var(--text-secondary);">Loading pipeline...</div>';
        }
    },

    // Error state
    showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `<div style="padding: 3rem; text-align: center; color: var(--danger);">${API.escapeHtml(message)}</div>`;
        }
    },

    // Styles - REVOLUTIONARY GLASSMORPHISM DESIGN
    renderStyles() {
        return `
            <style>
                /* Pipeline Revolution Styles */

                /* Lucide Icon Sizing */
                .stat-icon i { width: 32px; height: 32px; }
                .stage-icon i { width: 28px; height: 28px; }
                .value-icon i { width: 24px; height: 24px; }
                .action-icon i { width: 18px; height: 18px; }
                .empty-icon i { width: 48px; height: 48px; opacity: 0.5; }
                .quick-action i { width: 18px; height: 18px; }
                .filter-btn i { width: 18px; height: 18px; margin-right: 0.5rem; }
                .badge i { width: 14px; height: 14px; margin-right: 0.25rem; }

                .pipeline-topbar {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                    padding: 1.5rem;
                    background: var(--surface);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border);
                }

                .pipeline-stat {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .stat-icon {
                    font-size: 2rem;
                }

                .stat-content {
                    flex: 1;
                }

                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 600;
                }

                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-top: 0.25rem;
                }

                .pipeline-filters {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    align-items: center;
                }

                .filter-search {
                    flex: 1;
                }

                .search-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    background: var(--surface);
                    color: var(--text-primary);
                    font-size: 0.95rem;
                    transition: all 0.2s ease;
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .filter-actions {
                    display: flex;
                    gap: 0.75rem;
                }

                .filter-btn {
                    padding: 0.75rem 1.25rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: var(--radius-lg);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .filter-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
                }

                .pipeline-stages {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .pipeline-stage {
                    display: flex;
                    flex-direction: column;
                    background: var(--surface);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border);
                    overflow: hidden;
                }

                .stage-header {
                    padding: 1.25rem;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .stage-icon {
                    font-size: 2rem;
                }

                .stage-info {
                    flex: 1;
                }

                .stage-name {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                }

                .stage-desc {
                    font-size: 0.8rem;
                    opacity: 0.9;
                }

                .stage-stats {
                    text-align: right;
                }

                .stage-count {
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                .stage-value {
                    font-size: 0.85rem;
                    opacity: 0.9;
                }

                .stage-content {
                    flex: 1;
                    padding: 1rem;
                    min-height: 400px;
                    overflow-y: auto;
                    transition: background 0.2s ease;
                }

                .stage-content.drag-over {
                    background: rgba(102, 126, 234, 0.1);
                }

                /* GLASSMORPHISM CARDS */
                .pipeline-card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: var(--radius-lg);
                    padding: 1.25rem;
                    margin-bottom: 1rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }

                .pipeline-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, var(--primary), #8B5CF6);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .pipeline-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
                    border-color: rgba(102, 126, 234, 0.3);
                }

                .pipeline-card:hover::before {
                    opacity: 1;
                }

                .pipeline-card.dragging {
                    opacity: 0.5;
                    transform: scale(0.95);
                }

                .card-header-new {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .avatar-container {
                    position: relative;
                    width: 52px;
                    height: 52px;
                    flex-shrink: 0;
                }

                .progress-ring {
                    position: absolute;
                    top: 0;
                    left: 0;
                }

                .progress-ring-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.1);
                    stroke-width: 3;
                }

                .progress-ring-circle {
                    fill: none;
                    stroke-width: 3;
                    stroke-linecap: round;
                    transition: stroke-dasharray 0.5s ease;
                }

                .lead-avatar-new {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .avatar-text {
                    color: white;
                    font-weight: 700;
                    font-size: 0.9rem;
                }

                .lead-info-new {
                    flex: 1;
                    min-width: 0;
                }

                .lead-name-new {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .lead-company-new {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .card-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .value-icon {
                    font-size: 1.2rem;
                }

                .card-badges {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .badge {
                    padding: 0.25rem 0.75rem;
                    background: rgba(102, 126, 234, 0.15);
                    border: 1px solid rgba(102, 126, 234, 0.3);
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--primary);
                }

                .badge-warm {
                    background: rgba(239, 68, 68, 0.15);
                    border-color: rgba(239, 68, 68, 0.3);
                    color: #ef4444;
                }

                .badge-cold {
                    background: rgba(59, 130, 246, 0.15);
                    border-color: rgba(59, 130, 246, 0.3);
                    color: #3b82f6;
                }

                .card-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .tag {
                    padding: 0.25rem 0.625rem;
                    background: rgba(139, 92, 246, 0.15);
                    border-radius: 9999px;
                    font-size: 0.7rem;
                    font-weight: 500;
                    color: #8b5cf6;
                }

                .tag-more {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-tertiary);
                }

                .card-next-action {
                    padding: 0.75rem;
                    background: rgba(251, 191, 36, 0.1);
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    border-radius: var(--radius);
                    font-size: 0.85rem;
                    color: #fbbf24;
                    margin-bottom: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .action-icon {
                    font-size: 1rem;
                }

                .card-footer-new {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 0.75rem;
                    border-top: 1px solid var(--border);
                    font-size: 0.75rem;
                }

                .footer-time {
                    color: var(--text-tertiary);
                }

                .footer-prob {
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                /* Quick Actions */
                .card-quick-actions {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    display: flex;
                    gap: 0.5rem;
                    opacity: 0;
                    transform: translateY(-10px);
                    transition: all 0.3s ease;
                }

                .pipeline-card:hover .card-quick-actions {
                    opacity: 1;
                    transform: translateY(0);
                }

                .quick-action {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 1rem;
                }

                .quick-action:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .empty-state-new {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: var(--text-tertiary);
                }

                .empty-icon {
                    font-size: 3rem;
                    opacity: 0.5;
                    margin-bottom: 1rem;
                }

                .empty-text {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                .empty-hint {
                    font-size: 0.85rem;
                }

                /* Mobile responsive */
                @media (max-width: 768px) {
                    .pipeline-stages {
                        grid-template-columns: 1fr;
                    }

                    .pipeline-topbar {
                        grid-template-columns: 1fr 1fr;
                    }

                    .stat-value {
                        font-size: 1.25rem;
                    }
                }
            </style>
        `;
    }
};

console.log('Pipeline Revolution v2.0 loaded! 🚀');
