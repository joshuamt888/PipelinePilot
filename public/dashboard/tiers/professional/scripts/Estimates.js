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

        // View estimate
        container.querySelectorAll('[data-action="view-estimate"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                this.estimates_openDetailView(id);
            });
        });

        // Edit estimate
        container.querySelectorAll('[data-action="edit-estimate"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                this.estimates_openModal(id);
            });
        });

        // Convert to job
        container.querySelectorAll('[data-action="convert-to-job"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                this.estimates_convertToJob(id);
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
     * Open add/edit modal
     */
    estimates_openModal(estimateId = null) {
        this.state.editingEstimateId = estimateId;

        // Get estimate data if editing
        let estimate = null;
        if (estimateId) {
            estimate = this.state.estimates.find(e => e.id === estimateId);
            if (!estimate) {
                showNotification('Estimate not found', 'error');
                return;
            }
        }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'estimate-modal-overlay';
        overlay.innerHTML = this.estimates_renderModal(estimate);
        document.body.appendChild(overlay);

        // Initialize modal events after render
        setTimeout(() => {
            this.estimates_initModalEvents(overlay);
            this.estimates_updateLineItemsTotal();
        }, 0);
    },

    /**
     * Render modal HTML
     */
    estimates_renderModal(estimate) {
        const isEdit = !!estimate;
        const lineItems = estimate?.line_items || [{ description: '', quantity: 1, rate: 0 }];
        const photos = estimate?.photos || [];

        // Default expiry: 30 days from now
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 30);
        const expiryDate = estimate?.expires_at || defaultExpiry.toISOString().split('T')[0];

        return `
            <style>
                .estimate-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .estimate-modal {
                    background: var(--card-bg);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideUp 0.3s ease;
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .estimate-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 24px;
                    border-bottom: 1px solid var(--border);
                }

                .estimate-modal-header h2 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .estimate-modal-close {
                    background: transparent;
                    border: none;
                    font-size: 28px;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s;
                }

                .estimate-modal-close:hover {
                    background: var(--hover-bg);
                    color: var(--text-primary);
                }

                .estimate-modal-body {
                    padding: 24px;
                }

                .estimate-form-section {
                    margin-bottom: 32px;
                }

                .estimate-form-section-title {
                    font-size: 14px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-secondary);
                    margin-bottom: 16px;
                }

                .estimate-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .estimate-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .estimate-form-group label {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .estimate-form-group input,
                .estimate-form-group select,
                .estimate-form-group textarea {
                    padding: 10px 12px;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    background: var(--bg);
                    color: var(--text-primary);
                    font-size: 14px;
                    transition: all 0.2s;
                }

                .estimate-form-group input:focus,
                .estimate-form-group select:focus,
                .estimate-form-group textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .estimate-form-group textarea {
                    resize: vertical;
                    min-height: 80px;
                }

                /* Line Items Table */
                .estimate-line-items {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 16px;
                }

                .estimate-line-item-header {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr 40px;
                    gap: 12px;
                    margin-bottom: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-secondary);
                }

                .estimate-line-item {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr 40px;
                    gap: 12px;
                    margin-bottom: 12px;
                    align-items: center;
                }

                .estimate-line-item input {
                    padding: 8px 10px;
                    border: 1px solid var(--border);
                    border-radius: 4px;
                    background: var(--card-bg);
                    color: var(--text-primary);
                    font-size: 14px;
                }

                .estimate-line-item-total {
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .estimate-line-item-remove {
                    background: transparent;
                    border: 1px solid var(--border);
                    border-radius: 4px;
                    color: #ef4444;
                    cursor: pointer;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .estimate-line-item-remove:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: #ef4444;
                }

                .estimate-add-line-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px;
                    background: transparent;
                    border: 1px dashed var(--border);
                    border-radius: 6px;
                    color: var(--primary);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-top: 12px;
                }

                .estimate-add-line-item:hover {
                    background: rgba(59, 130, 246, 0.05);
                    border-color: var(--primary);
                }

                .estimate-total-box {
                    margin-top: 16px;
                    padding: 16px;
                    background: rgba(59, 130, 246, 0.05);
                    border: 1px solid var(--primary);
                    border-radius: 6px;
                    text-align: right;
                }

                .estimate-total-label {
                    font-size: 14px;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                }

                .estimate-total-value {
                    font-size: 28px;
                    font-weight: 600;
                    color: var(--primary);
                }

                /* Photo Upload */
                .estimate-photo-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 12px;
                }

                .estimate-photo-item {
                    position: relative;
                    aspect-ratio: 1;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .estimate-photo-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .estimate-photo-remove {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    background: rgba(0, 0, 0, 0.7);
                    border: none;
                    color: white;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .estimate-photo-remove:hover {
                    background: #ef4444;
                }

                .estimate-photo-upload {
                    aspect-ratio: 1;
                    border: 2px dashed var(--border);
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--bg);
                }

                .estimate-photo-upload:hover {
                    border-color: var(--primary);
                    background: rgba(59, 130, 246, 0.05);
                }

                .estimate-photo-upload svg {
                    width: 32px;
                    height: 32px;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }

                .estimate-photo-upload span {
                    font-size: 13px;
                    color: var(--text-secondary);
                }

                .estimate-photo-counter {
                    font-size: 13px;
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                }

                /* Modal Footer */
                .estimate-modal-footer {
                    padding: 20px 24px;
                    border-top: 1px solid var(--border);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .estimate-modal-btn {
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .estimate-modal-btn-cancel {
                    background: transparent;
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                }

                .estimate-modal-btn-cancel:hover {
                    background: var(--hover-bg);
                }

                .estimate-modal-btn-save {
                    background: var(--primary);
                    border: none;
                    color: white;
                }

                .estimate-modal-btn-save:hover {
                    background: var(--primary-dark);
                }
            </style>

            <div class="estimate-modal">
                <div class="estimate-modal-header">
                    <h2>${isEdit ? 'Edit Estimate' : 'New Estimate'}</h2>
                    <button class="estimate-modal-close" data-action="close-modal">×</button>
                </div>

                <div class="estimate-modal-body">
                    <!-- Basic Info -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Basic Information</div>

                        <div class="estimate-form-group">
                            <label>Title *</label>
                            <input type="text" id="estimateTitle" placeholder="e.g., Kitchen Remodel" value="${estimate?.title || ''}" required>
                        </div>

                        <div class="estimate-form-row">
                            <div class="estimate-form-group">
                                <label>Lead *</label>
                                ${this.estimates_renderLeadDropdown(estimate?.lead_id)}
                            </div>

                            <div class="estimate-form-group">
                                <label>Status</label>
                                <select id="estimateStatus">
                                    ${this.STATUSES.map(status => `
                                        <option value="${status}" ${estimate?.status === status ? 'selected' : ''}>
                                            ${this.estimates_formatStatus(status)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="estimate-form-row">
                            <div class="estimate-form-group">
                                <label>Expires On</label>
                                <input type="date" id="estimateExpiry" value="${expiryDate}">
                            </div>
                        </div>

                        <div class="estimate-form-group">
                            <label>Description</label>
                            <textarea id="estimateDescription" placeholder="Brief description of the work...">${estimate?.description || ''}</textarea>
                        </div>
                    </div>

                    <!-- Line Items -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Line Items</div>
                        <div class="estimate-line-items">
                            <div class="estimate-line-item-header">
                                <div>Description</div>
                                <div>Quantity</div>
                                <div>Rate</div>
                                <div>Total</div>
                                <div></div>
                            </div>
                            <div id="lineItemsContainer">
                                ${lineItems.map((item, i) => this.estimates_renderLineItemRow(item, i)).join('')}
                            </div>
                            <button class="estimate-add-line-item" data-action="add-line-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 16px; height: 16px;">
                                    <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                Add Line Item
                            </button>

                            <div class="estimate-total-box">
                                <div class="estimate-total-label">Total Estimate</div>
                                <div class="estimate-total-value" id="estimateTotalDisplay">$0.00</div>
                            </div>
                        </div>
                    </div>

                    <!-- Photos -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Photos</div>
                        <div class="estimate-photo-counter" id="photoCounter">${photos.length}/3 photos</div>
                        <div class="estimate-photo-grid" id="photoGrid">
                            ${photos.map((photo, i) => this.estimates_renderPhotoItem(photo, i)).join('')}
                            ${photos.length < 3 ? this.estimates_renderPhotoUploadButton() : ''}
                        </div>
                    </div>

                    <!-- Terms -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Terms & Conditions</div>
                        <div class="estimate-form-group">
                            <textarea id="estimateTerms" placeholder="Payment terms, warranty, etc...">${estimate?.terms || 'Payment due within 30 days of acceptance.\nEstimate valid for 30 days.'}</textarea>
                        </div>
                    </div>

                    <!-- Notes -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Internal Notes</div>
                        <div class="estimate-form-group">
                            <textarea id="estimateNotes" placeholder="Internal notes (not visible to client)...">${estimate?.notes || ''}</textarea>
                        </div>
                    </div>
                </div>

                <div class="estimate-modal-footer">
                    <button class="estimate-modal-btn estimate-modal-btn-cancel" data-action="close-modal">Cancel</button>
                    <button class="estimate-modal-btn estimate-modal-btn-save" data-action="save-estimate">Save Estimate</button>
                </div>
            </div>
        `;
    },

    /**
     * Render lead dropdown with quick-create
     */
    estimates_renderLeadDropdown(selectedLeadId = null) {
        return `
            <select id="estimateLead" required>
                <option value="">Select lead...</option>
                <option value="__create__" style="font-weight: bold; color: var(--primary);">+ Create New Lead</option>
                ${this.state.leads.map(lead => `
                    <option value="${lead.id}" ${selectedLeadId === lead.id ? 'selected' : ''}>
                        ${lead.name}${lead.company ? ` (${lead.company})` : ''}
                    </option>
                `).join('')}
            </select>
        `;
    },

    /**
     * Render line item row
     */
    estimates_renderLineItemRow(item, index) {
        const total = (item.quantity || 0) * (item.rate || 0);
        return `
            <div class="estimate-line-item" data-index="${index}">
                <input type="text" class="line-item-description" placeholder="Description" value="${item.description || ''}" data-field="description">
                <input type="number" class="line-item-quantity" placeholder="1" value="${item.quantity || 1}" min="0" step="0.01" data-field="quantity">
                <input type="number" class="line-item-rate" placeholder="0.00" value="${item.rate || 0}" min="0" step="0.01" data-field="rate">
                <div class="estimate-line-item-total">${formatCurrency(total)}</div>
                <button class="estimate-line-item-remove" data-action="remove-line-item" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 16px; height: 16px;">
                        <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;
    },

    /**
     * Render photo item
     */
    estimates_renderPhotoItem(photo, index) {
        return `
            <div class="estimate-photo-item" data-index="${index}">
                <img src="${photo.url}" alt="Estimate photo ${index + 1}">
                <button class="estimate-photo-remove" data-action="remove-photo" data-index="${index}">×</button>
            </div>
        `;
    },

    /**
     * Render photo upload button
     */
    estimates_renderPhotoUploadButton() {
        return `
            <div class="estimate-photo-upload" data-action="upload-photo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Upload</span>
                <input type="file" accept="image/*" style="display: none;" id="photoUploadInput">
            </div>
        `;
    },

    /**
     * Initialize modal events
     */
    estimates_initModalEvents(overlay) {
        // Close modal
        overlay.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.estimates_closeModal());
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.estimates_closeModal();
            }
        });

        // Lead dropdown quick-create
        const leadSelect = overlay.querySelector('#estimateLead');
        if (leadSelect) {
            leadSelect.addEventListener('change', async (e) => {
                if (e.target.value === '__create__') {
                    const name = prompt('Lead Name:');
                    if (!name) {
                        e.target.value = '';
                        return;
                    }

                    const phone = prompt('Phone (optional):');
                    const email = prompt('Email (optional):');

                    try {
                        const lead = await API.createLead({ name, phone, email, source: 'manual' });
                        this.state.leads.unshift(lead);

                        // Add new option
                        const option = document.createElement('option');
                        option.value = lead.id;
                        option.textContent = lead.name;
                        option.selected = true;

                        // Insert after the "Create New Lead" option
                        leadSelect.insertBefore(option, leadSelect.children[2]);

                        showNotification(`Lead "${lead.name}" created!`, 'success');
                    } catch (err) {
                        console.error('Failed to create lead:', err);
                        showNotification('Failed to create lead', 'error');
                        e.target.value = '';
                    }
                }
            });
        }

        // Line item changes
        overlay.addEventListener('input', (e) => {
            if (e.target.classList.contains('line-item-quantity') ||
                e.target.classList.contains('line-item-rate')) {
                this.estimates_updateLineItemsTotal();
            }
        });

        // Add line item
        overlay.querySelectorAll('[data-action="add-line-item"]').forEach(btn => {
            btn.addEventListener('click', () => this.estimates_addLineItem(overlay));
        });

        // Remove line item (delegated)
        overlay.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-action="remove-line-item"]');
            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index);
                this.estimates_removeLineItem(overlay, index);
            }
        });

        // Photo upload
        const uploadBtn = overlay.querySelector('[data-action="upload-photo"]');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                overlay.querySelector('#photoUploadInput').click();
            });

            overlay.querySelector('#photoUploadInput').addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.estimates_handlePhotoUpload(overlay, e.target.files[0]);
                }
            });
        }

        // Remove photo (delegated)
        overlay.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-action="remove-photo"]');
            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index);
                this.estimates_removePhoto(overlay, index);
            }
        });

        // Save estimate
        overlay.querySelectorAll('[data-action="save-estimate"]').forEach(btn => {
            btn.addEventListener('click', () => this.estimates_handleSave(overlay));
        });
    },

    /**
     * Add line item
     */
    estimates_addLineItem(overlay) {
        const container = overlay.querySelector('#lineItemsContainer');
        const currentItems = container.querySelectorAll('.estimate-line-item').length;

        const newItem = { description: '', quantity: 1, rate: 0 };
        const html = this.estimates_renderLineItemRow(newItem, currentItems);

        container.insertAdjacentHTML('beforeend', html);
        this.estimates_updateLineItemsTotal();
    },

    /**
     * Remove line item
     */
    estimates_removeLineItem(overlay, index) {
        const container = overlay.querySelector('#lineItemsContainer');
        const items = container.querySelectorAll('.estimate-line-item');

        if (items.length <= 1) {
            showNotification('At least one line item required', 'warning');
            return;
        }

        items[index].remove();

        // Re-index remaining items
        container.querySelectorAll('.estimate-line-item').forEach((item, newIndex) => {
            item.dataset.index = newIndex;
            item.querySelector('[data-action="remove-line-item"]').dataset.index = newIndex;
        });

        this.estimates_updateLineItemsTotal();
    },

    /**
     * Update line items total
     */
    estimates_updateLineItemsTotal() {
        const container = document.querySelector('#lineItemsContainer');
        if (!container) return;

        let total = 0;
        container.querySelectorAll('.estimate-line-item').forEach(row => {
            const qty = parseFloat(row.querySelector('.line-item-quantity').value) || 0;
            const rate = parseFloat(row.querySelector('.line-item-rate').value) || 0;
            const lineTotal = qty * rate;

            row.querySelector('.estimate-line-item-total').textContent = formatCurrency(lineTotal);
            total += lineTotal;
        });

        const displayEl = document.querySelector('#estimateTotalDisplay');
        if (displayEl) {
            displayEl.textContent = formatCurrency(total);
        }
    },

    /**
     * Handle photo upload
     */
    async estimates_handlePhotoUpload(overlay, file) {
        try {
            const photoGrid = overlay.querySelector('#photoGrid');
            const currentPhotos = photoGrid.querySelectorAll('.estimate-photo-item').length;

            if (currentPhotos >= 3) {
                showNotification('Maximum 3 photos allowed', 'warning');
                return;
            }

            showNotification('Compressing photo...', 'info');

            // Compress image
            const compressedFile = await API.compressImage(file);

            // Create preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoData = {
                    url: e.target.result,
                    file: compressedFile,
                    caption: file.name
                };

                // Add photo to grid
                const uploadBtn = photoGrid.querySelector('.estimate-photo-upload');
                const photoHtml = this.estimates_renderPhotoItem(photoData, currentPhotos);

                if (uploadBtn) {
                    uploadBtn.insertAdjacentHTML('beforebegin', photoHtml);

                    // Remove upload button if at max
                    if (currentPhotos + 1 >= 3) {
                        uploadBtn.remove();
                    }
                } else {
                    photoGrid.insertAdjacentHTML('beforeend', photoHtml);
                }

                // Update counter
                this.estimates_updatePhotoCounter(overlay);
                showNotification('Photo added', 'success');
            };
            reader.readAsDataURL(compressedFile);

        } catch (error) {
            console.error('Error uploading photo:', error);
            showNotification('Failed to upload photo', 'error');
        }
    },

    /**
     * Remove photo
     */
    estimates_removePhoto(overlay, index) {
        const photoGrid = overlay.querySelector('#photoGrid');
        const photos = photoGrid.querySelectorAll('.estimate-photo-item');

        photos[index].remove();

        // Re-index remaining photos
        photoGrid.querySelectorAll('.estimate-photo-item').forEach((photo, newIndex) => {
            photo.dataset.index = newIndex;
            photo.querySelector('[data-action="remove-photo"]').dataset.index = newIndex;
        });

        // Add upload button if under max
        const currentPhotos = photoGrid.querySelectorAll('.estimate-photo-item').length;
        if (currentPhotos < 3 && !photoGrid.querySelector('.estimate-photo-upload')) {
            photoGrid.insertAdjacentHTML('beforeend', this.estimates_renderPhotoUploadButton());

            // Re-attach upload event
            const uploadBtn = photoGrid.querySelector('[data-action="upload-photo"]');
            uploadBtn.addEventListener('click', () => {
                photoGrid.querySelector('#photoUploadInput').click();
            });

            photoGrid.querySelector('#photoUploadInput').addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.estimates_handlePhotoUpload(overlay, e.target.files[0]);
                }
            });
        }

        this.estimates_updatePhotoCounter(overlay);
        showNotification('Photo removed', 'success');
    },

    /**
     * Update photo counter
     */
    estimates_updatePhotoCounter(overlay) {
        const photoGrid = overlay.querySelector('#photoGrid');
        const counter = overlay.querySelector('#photoCounter');
        const currentPhotos = photoGrid.querySelectorAll('.estimate-photo-item').length;

        if (counter) {
            counter.textContent = `${currentPhotos}/3 photos`;
        }
    },

    /**
     * Handle estimate save
     */
    async estimates_handleSave(overlay) {
        try {
            // Gather form data
            const title = overlay.querySelector('#estimateTitle').value.trim();
            const leadId = overlay.querySelector('#estimateLead').value;
            const status = overlay.querySelector('#estimateStatus').value;
            const expiresAt = overlay.querySelector('#estimateExpiry').value;
            const description = overlay.querySelector('#estimateDescription').value.trim();
            const terms = overlay.querySelector('#estimateTerms').value.trim();
            const notes = overlay.querySelector('#estimateNotes').value.trim();

            // Validation
            if (!title) {
                showNotification('Title is required', 'error');
                return;
            }

            if (!leadId || leadId === '__create__') {
                showNotification('Please select a lead', 'error');
                return;
            }

            // Gather line items
            const lineItems = [];
            overlay.querySelectorAll('.estimate-line-item').forEach(row => {
                const desc = row.querySelector('.line-item-description').value.trim();
                const qty = parseFloat(row.querySelector('.line-item-quantity').value) || 0;
                const rate = parseFloat(row.querySelector('.line-item-rate').value) || 0;

                if (desc || qty > 0 || rate > 0) {
                    lineItems.push({ description: desc, quantity: qty, rate: rate });
                }
            });

            // Calculate total
            const totalPrice = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

            // Gather photos
            const photoElements = overlay.querySelectorAll('.estimate-photo-item img');
            const photos = Array.from(photoElements).map((img, i) => ({
                url: img.src,
                caption: `Photo ${i + 1}`
            }));

            const estimateData = {
                title,
                lead_id: leadId,
                status,
                expires_at: expiresAt || null,
                description,
                terms,
                notes,
                line_items: lineItems,
                total_price: totalPrice,
                photos
            };

            // Create or update
            let savedEstimate;
            if (this.state.editingEstimateId) {
                savedEstimate = await API.updateEstimate(this.state.editingEstimateId, estimateData);

                // Update in state
                const index = this.state.estimates.findIndex(e => e.id === this.state.editingEstimateId);
                if (index !== -1) {
                    this.state.estimates[index] = savedEstimate;
                }

                showNotification('Estimate updated successfully', 'success');
            } else {
                // Generate estimate number before creating
                const estimateNumber = await API.generateEstimateNumber();
                savedEstimate = await API.createEstimate({ ...estimateData, estimate_number: estimateNumber });

                this.state.estimates.unshift(savedEstimate);
                showNotification('Estimate created successfully', 'success');
            }

            this.estimates_closeModal();
            this.estimates_calculateStats();
            this.estimates_render();

        } catch (error) {
            console.error('Error saving estimate:', error);
            showNotification('Failed to save estimate', 'error');
        }
    },

    /**
     * Close modal
     */
    estimates_closeModal() {
        const overlay = document.querySelector('.estimate-modal-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        }
        this.state.editingEstimateId = null;
    },

    /**
     * Open detail view (read-only with status actions)
     */
    estimates_openDetailView(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) {
            showNotification('Estimate not found', 'error');
            return;
        }

        const lead = this.state.leads.find(l => l.id === estimate.lead_id);
        const lineItems = estimate.line_items || [];
        const photos = estimate.photos || [];

        const overlay = document.createElement('div');
        overlay.className = 'estimate-modal-overlay';
        overlay.innerHTML = `
            <style>
                .estimate-detail-modal {
                    background: var(--card-bg);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }

                .estimate-detail-header {
                    padding: 24px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .estimate-detail-header-left h2 {
                    margin: 0 0 8px 0;
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .estimate-detail-number {
                    font-size: 13px;
                    color: var(--text-secondary);
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .estimate-detail-close {
                    background: transparent;
                    border: none;
                    font-size: 28px;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s;
                }

                .estimate-detail-close:hover {
                    background: var(--hover-bg);
                }

                .estimate-detail-body {
                    padding: 24px;
                }

                .estimate-detail-section {
                    margin-bottom: 24px;
                }

                .estimate-detail-section-title {
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                }

                .estimate-detail-field {
                    margin-bottom: 16px;
                }

                .estimate-detail-label {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                }

                .estimate-detail-value {
                    font-size: 14px;
                    color: var(--text-primary);
                }

                .estimate-detail-line-items {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 16px;
                }

                .estimate-detail-line-item {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr;
                    gap: 12px;
                    padding: 12px 0;
                    border-bottom: 1px solid var(--border);
                }

                .estimate-detail-line-item:last-child {
                    border-bottom: none;
                }

                .estimate-detail-line-item-header {
                    font-weight: 600;
                    font-size: 12px;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                }

                .estimate-detail-total {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 2px solid var(--border);
                    text-align: right;
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--primary);
                }

                .estimate-detail-photos {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 12px;
                }

                .estimate-detail-photo {
                    aspect-ratio: 1;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .estimate-detail-photo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .estimate-detail-actions {
                    padding: 20px 24px;
                    border-top: 1px solid var(--border);
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .estimate-action-btn {
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .estimate-action-btn svg {
                    width: 16px;
                    height: 16px;
                }

                .estimate-action-btn.sent {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid #3b82f6;
                    color: #3b82f6;
                }

                .estimate-action-btn.accepted {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid #22c55e;
                    color: #22c55e;
                }

                .estimate-action-btn.rejected {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid #ef4444;
                    color: #ef4444;
                }

                .estimate-action-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .estimate-action-btn.edit {
                    background: var(--primary);
                    border: 1px solid var(--primary);
                    color: white;
                }

                .estimate-action-btn.convert {
                    background: #22c55e;
                    border: 1px solid #22c55e;
                    color: white;
                    margin-left: auto;
                }
            </style>

            <div class="estimate-detail-modal">
                <div class="estimate-detail-header">
                    <div class="estimate-detail-header-left">
                        <div class="estimate-detail-number">${estimate.estimate_number || 'EST-???'}</div>
                        <h2>${estimate.title || 'Untitled'}</h2>
                        ${this.estimates_renderStatusBadge(estimate.status)}
                    </div>
                    <button class="estimate-detail-close" data-action="close-detail">×</button>
                </div>

                <div class="estimate-detail-body">
                    <!-- Basic Info -->
                    <div class="estimate-detail-section">
                        <div class="estimate-detail-section-title">Basic Information</div>
                        ${lead ? `
                            <div class="estimate-detail-field">
                                <div class="estimate-detail-label">Lead</div>
                                <div class="estimate-detail-value">${lead.name}${lead.company ? ` (${lead.company})` : ''}</div>
                            </div>
                        ` : ''}
                        ${estimate.description ? `
                            <div class="estimate-detail-field">
                                <div class="estimate-detail-label">Description</div>
                                <div class="estimate-detail-value">${estimate.description}</div>
                            </div>
                        ` : ''}
                        ${estimate.expires_at ? `
                            <div class="estimate-detail-field">
                                <div class="estimate-detail-label">Expires On</div>
                                <div class="estimate-detail-value">${new Date(estimate.expires_at).toLocaleDateString()}</div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Line Items -->
                    ${lineItems.length > 0 ? `
                        <div class="estimate-detail-section">
                            <div class="estimate-detail-section-title">Line Items</div>
                            <div class="estimate-detail-line-items">
                                <div class="estimate-detail-line-item estimate-detail-line-item-header">
                                    <div>Description</div>
                                    <div>Quantity</div>
                                    <div>Rate</div>
                                    <div>Total</div>
                                </div>
                                ${lineItems.map(item => `
                                    <div class="estimate-detail-line-item">
                                        <div>${item.description || '—'}</div>
                                        <div>${item.quantity || 0}</div>
                                        <div>${formatCurrency(item.rate || 0)}</div>
                                        <div>${formatCurrency((item.quantity || 0) * (item.rate || 0))}</div>
                                    </div>
                                `).join('')}
                                <div class="estimate-detail-total">
                                    Total: ${formatCurrency(estimate.total_price || 0)}
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Photos -->
                    ${photos.length > 0 ? `
                        <div class="estimate-detail-section">
                            <div class="estimate-detail-section-title">Photos (${photos.length})</div>
                            <div class="estimate-detail-photos">
                                ${photos.map(photo => `
                                    <div class="estimate-detail-photo">
                                        <img src="${photo.url}" alt="${photo.caption || 'Photo'}">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Terms -->
                    ${estimate.terms ? `
                        <div class="estimate-detail-section">
                            <div class="estimate-detail-section-title">Terms & Conditions</div>
                            <div class="estimate-detail-value" style="white-space: pre-wrap;">${estimate.terms}</div>
                        </div>
                    ` : ''}

                    <!-- Notes -->
                    ${estimate.notes ? `
                        <div class="estimate-detail-section">
                            <div class="estimate-detail-section-title">Internal Notes</div>
                            <div class="estimate-detail-value" style="white-space: pre-wrap;">${estimate.notes}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="estimate-detail-actions">
                    ${estimate.status !== 'sent' && estimate.status !== 'accepted' && estimate.status !== 'rejected' ? `
                        <button class="estimate-action-btn sent" data-action="mark-sent" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>
                            </svg>
                            Mark as Sent
                        </button>
                    ` : ''}

                    ${estimate.status === 'sent' || estimate.status === 'draft' ? `
                        <button class="estimate-action-btn accepted" data-action="mark-accepted" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                            </svg>
                            Mark as Accepted
                        </button>

                        <button class="estimate-action-btn rejected" data-action="mark-rejected" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                            </svg>
                            Mark as Rejected
                        </button>
                    ` : ''}

                    <button class="estimate-action-btn edit" data-action="edit-from-detail" data-id="${estimate.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2"/>
                        </svg>
                        Edit
                    </button>

                    ${estimate.status === 'accepted' ? `
                        <button class="estimate-action-btn convert" data-action="convert-from-detail" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Convert to Job
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Attach events
        setTimeout(() => {
            overlay.querySelector('[data-action="close-detail"]').addEventListener('click', () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 200);
                }
            });

            // Status actions
            const markSentBtn = overlay.querySelector('[data-action="mark-sent"]');
            if (markSentBtn) {
                markSentBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_updateStatus(estimate.id, 'sent');
                });
            }

            const markAcceptedBtn = overlay.querySelector('[data-action="mark-accepted"]');
            if (markAcceptedBtn) {
                markAcceptedBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_updateStatus(estimate.id, 'accepted');
                });
            }

            const markRejectedBtn = overlay.querySelector('[data-action="mark-rejected"]');
            if (markRejectedBtn) {
                markRejectedBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_updateStatus(estimate.id, 'rejected');
                });
            }

            // Edit action
            const editBtn = overlay.querySelector('[data-action="edit-from-detail"]');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_openModal(estimate.id);
                });
            }

            // Convert action
            const convertBtn = overlay.querySelector('[data-action="convert-from-detail"]');
            if (convertBtn) {
                convertBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_convertToJob(estimate.id);
                });
            }
        }, 0);
    },

    /**
     * Update estimate status
     */
    async estimates_updateStatus(estimateId, newStatus) {
        try {
            const estimate = this.state.estimates.find(e => e.id === estimateId);
            if (!estimate) return;

            const statusLabel = this.estimates_formatStatus(newStatus);
            const confirmed = confirm(`Mark estimate "${estimate.title}" as ${statusLabel}?`);
            if (!confirmed) return;

            // Call appropriate API method
            let updatedEstimate;
            if (newStatus === 'sent') {
                updatedEstimate = await API.markEstimateSent(estimateId);
            } else if (newStatus === 'accepted') {
                updatedEstimate = await API.markEstimateAccepted(estimateId);
            } else if (newStatus === 'rejected') {
                updatedEstimate = await API.markEstimateRejected(estimateId);
            }

            // Update in state
            const index = this.state.estimates.findIndex(e => e.id === estimateId);
            if (index !== -1) {
                this.state.estimates[index] = updatedEstimate;
            }

            this.estimates_calculateStats();
            this.estimates_render();
            showNotification(`Estimate marked as ${statusLabel}`, 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            showNotification('Failed to update status', 'error');
        }
    },

    /**
     * Convert estimate to job
     */
    async estimates_convertToJob(estimateId) {
        try {
            const estimate = this.state.estimates.find(e => e.id === estimateId);
            if (!estimate) {
                showNotification('Estimate not found', 'error');
                return;
            }

            if (estimate.status !== 'accepted') {
                showNotification('Only accepted estimates can be converted to jobs', 'warning');
                return;
            }

            const confirmed = confirm(
                `Convert estimate "${estimate.title}" to a job?\n\n` +
                `This will create a new job with:\n` +
                `- All estimate details\n` +
                `- Photos as "before" photos\n` +
                `- Line items as materials\n` +
                `- Quoted price: ${formatCurrency(estimate.total_price || 0)}`
            );

            if (!confirmed) return;

            showNotification('Converting to job...', 'info');

            const newJob = await API.convertEstimateToJob(estimateId);

            showNotification('Job created successfully! Redirecting...', 'success');

            // Redirect to Jobs page after short delay
            setTimeout(() => {
                window.location.href = '/dashboard/tiers/professional/jobs.html';
            }, 1500);

        } catch (error) {
            console.error('Error converting to job:', error);
            showNotification('Failed to convert to job', 'error');
        }
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
