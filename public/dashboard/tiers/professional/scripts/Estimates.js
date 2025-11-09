/**
 * ESTIMATES MODULE
 * Quote management system - converts to jobs when accepted
 */

window.EstimatesModule = {
    // STATE
    state: {
        estimates: [],
        leads: [],
        filteredEstimates: [],
        container: 'estimates-content',

        // Filters
        statusFilter: 'all',
        leadFilter: 'all',
        dateFilter: 'all',

        // Modal state
        editingEstimateId: null,

        // Stats
        stats: {
            totalQuoted: 0,
            totalAccepted: 0,
            totalPending: 0,
            acceptanceRate: 0
        }
    },

    // Constants
    STATUSES: ['draft', 'sent', 'accepted', 'rejected', 'expired'],

    /**
     * Initialize the Estimates module
     */
    async estimates_init(targetContainer = 'estimates-content') {
        this.state.container = targetContainer;
        this.estimates_showLoading();

        try {
            // Load estimates and leads in parallel
            const [estimates, leads] = await Promise.all([
                API.getEstimates(),
                API.getLeads()
            ]);

            this.state.estimates = estimates || [];
            this.state.leads = leads || [];
            this.state.filteredEstimates = this.state.estimates;

            this.estimates_calculateStats();
            this.estimates_render();
        } catch (error) {
            console.error('Error initializing Estimates:', error);
            this.estimates_showError('Failed to load estimates');
        }
    },

    /**
     * Main render function
     */
    estimates_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Apply filters
        this.estimates_applyFilters();

        container.innerHTML = `
            ${this.estimates_renderStyles()}
            <div class="estimates-container">
                ${this.estimates_renderHeader()}
                ${this.estimates_renderStats()}
                ${this.estimates_renderFilters()}
                ${this.estimates_renderGrid()}
            </div>
        `;

        // Smooth fade-in
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
            this.estimates_attachEvents();
        }, 50);
    },

    /**
     * Render inline styles
     */
    estimates_renderStyles() {
        return `
            <style>
                .estimates-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 20px;
                }

                /* Header */
                .estimates-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }

                .estimates-header-content h1 {
                    font-size: 32px;
                    font-weight: 600;
                    margin: 0 0 8px 0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: var(--text-primary);
                }

                .estimates-title-icon {
                    width: 32px;
                    height: 32px;
                    color: var(--primary);
                }

                .estimates-subtitle {
                    color: var(--text-secondary);
                    font-size: 14px;
                    margin: 0;
                }

                .estimates-btn-primary {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }

                .estimates-btn-primary:hover {
                    background: var(--primary-dark);
                    transform: translateY(-1px);
                }

                .estimates-btn-primary svg {
                    width: 18px;
                    height: 18px;
                }

                /* Stats Banners */
                .estimates-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .estimates-stat-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    transition: all 0.2s;
                }

                .estimates-stat-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }

                .estimates-stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .estimates-stat-icon.quoted {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                }

                .estimates-stat-icon.accepted {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                }

                .estimates-stat-icon.pending {
                    background: rgba(251, 191, 36, 0.1);
                    color: #fbbf24;
                }

                .estimates-stat-icon svg {
                    width: 24px;
                    height: 24px;
                }

                .estimates-stat-content {
                    flex: 1;
                }

                .estimates-stat-value {
                    font-size: 28px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 4px;
                }

                .estimates-stat-label {
                    font-size: 14px;
                    color: var(--text-secondary);
                }

                /* Filters */
                .estimates-filters {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                }

                .estimates-filters select {
                    padding: 10px 16px;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    background: var(--card-bg);
                    color: var(--text-primary);
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .estimates-filters select:hover {
                    border-color: var(--primary);
                }

                /* Grid */
                .estimates-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                }

                /* Card */
                .estimate-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 20px;
                    transition: all 0.2s;
                    cursor: pointer;
                }

                .estimate-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }

                .estimate-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 16px;
                }

                .estimate-number {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .estimate-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 8px 0;
                }

                .estimate-lead {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-secondary);
                    font-size: 14px;
                    margin-bottom: 12px;
                }

                .estimate-lead svg {
                    width: 16px;
                    height: 16px;
                }

                .estimate-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .estimate-status.draft {
                    background: rgba(107, 114, 128, 0.1);
                    color: #6b7280;
                }

                .estimate-status.sent {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                }

                .estimate-status.accepted {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                }

                .estimate-status.rejected {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }

                .estimate-status.expired {
                    background: rgba(156, 163, 175, 0.1);
                    color: #9ca3af;
                }

                .estimate-status svg {
                    width: 14px;
                    height: 14px;
                }

                .estimate-photos {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--text-secondary);
                    font-size: 13px;
                    margin-top: 12px;
                }

                .estimate-photos svg {
                    width: 16px;
                    height: 16px;
                }

                .estimate-total {
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--primary);
                    margin: 16px 0 12px 0;
                }

                .estimate-expiry {
                    font-size: 13px;
                    color: var(--text-secondary);
                }

                .estimate-expiry.warning {
                    color: #f59e0b;
                    font-weight: 500;
                }

                .estimate-card-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border);
                }

                .estimate-btn {
                    flex: 1;
                    padding: 10px;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    background: transparent;
                    color: var(--text-primary);
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                .estimate-btn:hover {
                    background: var(--hover-bg);
                    border-color: var(--primary);
                }

                .estimate-btn svg {
                    width: 16px;
                    height: 16px;
                }

                .estimate-btn-primary {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }

                .estimate-btn-primary:hover {
                    background: var(--primary-dark);
                }

                .estimate-btn-danger {
                    color: #ef4444;
                }

                .estimate-btn-danger:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: #ef4444;
                }

                /* Empty State */
                .estimates-empty {
                    text-align: center;
                    padding: 60px 20px;
                }

                .estimates-empty svg {
                    width: 64px;
                    height: 64px;
                    color: var(--text-tertiary);
                    margin-bottom: 16px;
                }

                .estimates-empty h3 {
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 8px 0;
                }

                .estimates-empty p {
                    color: var(--text-secondary);
                    font-size: 14px;
                    margin: 0 0 24px 0;
                }
            </style>
        `;
    },

    /**
     * Render header
     */
    estimates_renderHeader() {
        return `
            <div class="estimates-header">
                <div class="estimates-header-content">
                    <h1>
                        <svg class="estimates-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Estimates
                    </h1>
                    <p class="estimates-subtitle">Create quotes and convert accepted estimates to jobs</p>
                </div>
                <button class="estimates-btn-primary" data-action="new-estimate">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    New Estimate
                </button>
            </div>
        `;
    },

    /**
     * Render stats cards
     */
    estimates_renderStats() {
        const { totalQuoted, totalAccepted, totalPending, acceptanceRate } = this.state.stats;

        return `
            <div class="estimates-stats">
                <div class="estimates-stat-card">
                    <div class="estimates-stat-icon quoted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="estimates-stat-content">
                        <div class="estimates-stat-value">${formatCurrency(totalQuoted)}</div>
                        <div class="estimates-stat-label">Total Quoted</div>
                    </div>
                </div>

                <div class="estimates-stat-card">
                    <div class="estimates-stat-icon accepted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="estimates-stat-content">
                        <div class="estimates-stat-value">${formatCurrency(totalAccepted)}</div>
                        <div class="estimates-stat-label">Accepted (${acceptanceRate}%)</div>
                    </div>
                </div>

                <div class="estimates-stat-card">
                    <div class="estimates-stat-icon pending">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                            <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="estimates-stat-content">
                        <div class="estimates-stat-value">${formatCurrency(totalPending)}</div>
                        <div class="estimates-stat-label">Pending</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render filters
     */
    estimates_renderFilters() {
        return `
            <div class="estimates-filters">
                <select data-filter="status">
                    <option value="all">All Status</option>
                    ${this.STATUSES.map(status => `
                        <option value="${status}" ${this.state.statusFilter === status ? 'selected' : ''}>
                            ${this.estimates_formatStatus(status)}
                        </option>
                    `).join('')}
                </select>

                <select data-filter="lead">
                    <option value="all">All Leads</option>
                    ${this.state.leads.map(lead => `
                        <option value="${lead.id}" ${this.state.leadFilter === lead.id ? 'selected' : ''}>
                            ${lead.name}
                        </option>
                    `).join('')}
                </select>

                <select data-filter="date">
                    <option value="all">All Time</option>
                    <option value="week" ${this.state.dateFilter === 'week' ? 'selected' : ''}>This Week</option>
                    <option value="month" ${this.state.dateFilter === 'month' ? 'selected' : ''}>This Month</option>
                    <option value="quarter" ${this.state.dateFilter === 'quarter' ? 'selected' : ''}>This Quarter</option>
                </select>
            </div>
        `;
    },

    /**
     * Render estimates grid
     */
    estimates_renderGrid() {
        if (this.state.filteredEstimates.length === 0) {
            return `
                <div class="estimates-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <h3>No estimates found</h3>
                    <p>Create your first estimate to start quoting clients</p>
                    <button class="estimates-btn-primary" data-action="new-estimate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        New Estimate
                    </button>
                </div>
            `;
        }

        return `
            <div class="estimates-grid">
                ${this.state.filteredEstimates.map(est => this.estimates_renderCard(est)).join('')}
            </div>
        `;
    },

    /**
     * Render estimate card
     */
    estimates_renderCard(estimate) {
        const lead = this.state.leads.find(l => l.id === estimate.lead_id);
        const photoCount = (estimate.photos || []).length;
        const expiryInfo = this.estimates_getExpiryInfo(estimate);

        // Show "Convert to Job" if accepted, otherwise "View" and "Edit"
        const actions = estimate.status === 'accepted' ? `
            <button class="estimate-btn estimate-btn-primary" data-action="convert-to-job" data-id="${estimate.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Convert to Job
            </button>
        ` : `
            <button class="estimate-btn" data-action="view-estimate" data-id="${estimate.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/>
                </svg>
                View
            </button>
            <button class="estimate-btn" data-action="edit-estimate" data-id="${estimate.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Edit
            </button>
        `;

        return `
            <div class="estimate-card" data-id="${estimate.id}">
                <div class="estimate-card-header">
                    <div>
                        <div class="estimate-number">${estimate.estimate_number || 'EST-???'}</div>
                        <h3 class="estimate-title">${estimate.title || 'Untitled'}</h3>
                    </div>
                    ${this.estimates_renderStatusBadge(estimate.status)}
                </div>

                ${lead ? `
                    <div class="estimate-lead">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${lead.name}
                    </div>
                ` : ''}

                ${photoCount > 0 ? `
                    <div class="estimate-photos">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${photoCount} photo${photoCount > 1 ? 's' : ''}
                    </div>
                ` : ''}

                <div class="estimate-total">${formatCurrency(estimate.total_price || 0)}</div>

                ${expiryInfo ? `
                    <div class="estimate-expiry ${expiryInfo.warning ? 'warning' : ''}">
                        ${expiryInfo.text}
                    </div>
                ` : ''}

                <div class="estimate-card-actions">
                    ${actions}
                    <button class="estimate-btn estimate-btn-danger" data-action="delete-estimate" data-id="${estimate.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Render status badge
     */
    estimates_renderStatusBadge(status) {
        const icons = {
            draft: '<path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" stroke-width="2"/><path d="M18 2l-8 8v4h4l8-8-4-4z" stroke-width="2"/>',
            sent: '<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>',
            accepted: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>',
            rejected: '<path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>',
            expired: '<circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M12 6v6l4 2" stroke-width="2"/>'
        };

        return `
            <div class="estimate-status ${status}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    ${icons[status] || icons.draft}
                </svg>
                ${this.estimates_formatStatus(status)}
            </div>
        `;
    },

    /**
     * Get expiry info
     */
    estimates_getExpiryInfo(estimate) {
        if (!estimate.expires_at) return null;

        const now = new Date();
        const expiresAt = new Date(estimate.expires_at);
        const daysUntil = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) {
            return { text: 'Expired', warning: true };
        } else if (daysUntil === 0) {
            return { text: 'Expires today', warning: true };
        } else if (daysUntil <= 7) {
            return { text: `Expires in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`, warning: true };
        } else {
            return { text: `Expires in ${daysUntil} days`, warning: false };
        }
    },

    /**
     * Apply filters
     */
    estimates_applyFilters() {
        let filtered = [...this.state.estimates];

        // Status filter
        if (this.state.statusFilter !== 'all') {
            filtered = filtered.filter(e => e.status === this.state.statusFilter);
        }

        // Lead filter
        if (this.state.leadFilter !== 'all') {
            filtered = filtered.filter(e => e.lead_id === this.state.leadFilter);
        }

        // Date filter
        if (this.state.dateFilter !== 'all') {
            const now = new Date();
            filtered = filtered.filter(e => {
                const createdAt = new Date(e.created_at);

                switch (this.state.dateFilter) {
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return createdAt >= weekAgo;
                    case 'month':
                        return createdAt.getMonth() === now.getMonth() &&
                               createdAt.getFullYear() === now.getFullYear();
                    case 'quarter':
                        const quarter = Math.floor(now.getMonth() / 3);
                        const estQuarter = Math.floor(createdAt.getMonth() / 3);
                        return estQuarter === quarter &&
                               createdAt.getFullYear() === now.getFullYear();
                    default:
                        return true;
                }
            });
        }

        this.state.filteredEstimates = filtered;
    },

    /**
     * Calculate stats
     */
    estimates_calculateStats() {
        const allEstimates = this.state.estimates;

        const totalQuoted = allEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
        const accepted = allEstimates.filter(e => e.status === 'accepted');
        const totalAccepted = accepted.reduce((sum, e) => sum + (e.total_price || 0), 0);
        const pending = allEstimates.filter(e => e.status === 'sent' || e.status === 'draft');
        const totalPending = pending.reduce((sum, e) => sum + (e.total_price || 0), 0);

        const acceptanceRate = allEstimates.length > 0
            ? Math.round((accepted.length / allEstimates.length) * 100)
            : 0;

        this.state.stats = { totalQuoted, totalAccepted, totalPending, acceptanceRate };
    },

    /**
     * Format status
     */
    estimates_formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    },

    /**
     * Attach event listeners
     */
    estimates_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // New estimate button
        container.querySelectorAll('[data-action="new-estimate"]').forEach(btn => {
            btn.addEventListener('click', () => this.estimates_openModal());
        });

        // Edit estimate
        container.querySelectorAll('[data-action="edit-estimate"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                this.estimates_openModal(id);
            });
        });

        // Delete estimate
        container.querySelectorAll('[data-action="delete-estimate"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                this.estimates_deleteEstimate(id);
            });
        });

        // Filter changes
        container.querySelectorAll('[data-filter]').forEach(select => {
            select.addEventListener('change', (e) => {
                const filterType = e.target.dataset.filter;
                const value = e.target.value;

                if (filterType === 'status') this.state.statusFilter = value;
                if (filterType === 'lead') this.state.leadFilter = value;
                if (filterType === 'date') this.state.dateFilter = value;

                this.estimates_render();
            });
        });
    },

    /**
     * Open add/edit modal (placeholder for Session 1)
     */
    estimates_openModal(estimateId = null) {
        this.state.editingEstimateId = estimateId;
        showNotification('Estimate modal coming in next session!', 'info');
        // TODO: Build in Session 2
    },

    /**
     * Delete estimate
     */
    async estimates_deleteEstimate(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) return;

        const confirmed = confirm(`Delete estimate "${estimate.title}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            await API.deleteEstimate(estimateId);
            this.state.estimates = this.state.estimates.filter(e => e.id !== estimateId);
            this.estimates_calculateStats();
            this.estimates_render();
            showNotification('Estimate deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting estimate:', error);
            showNotification('Failed to delete estimate', 'error');
        }
    },

    /**
     * Loading state
     */
    estimates_showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 60px; color: var(--text-secondary);">Loading estimates...</div>';
        }
    },

    /**
     * Error state
     */
    estimates_showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `<div style="text-align: center; padding: 60px; color: #ef4444;">${message}</div>`;
        }
    }
};

// Auto-init if on estimates page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('estimates')) {
            EstimatesModule.estimates_init();
        }
    });
} else {
    if (window.location.pathname.includes('estimates')) {
        EstimatesModule.estimates_init();
    }
}
