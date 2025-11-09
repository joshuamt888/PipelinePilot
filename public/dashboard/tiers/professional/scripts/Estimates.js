window.EstimatesModule = {
    // STATE
    state: {
        estimates: [],
        leads: [],
        container: 'estimates-content',
        currentFilter: 'all', // 'all', 'accepted', 'pending'
        stats: null
    },

    // INIT
    async estimates_init(targetContainer = 'estimates-content') {
        this.state.container = targetContainer;

        try {
            await this.estimates_loadData();
            this.estimates_render();
        } catch (error) {
            this.estimates_showError('Failed to load estimates');
        }
    },

    // LOAD DATA
    async estimates_loadData() {
        const [estimates, leads] = await Promise.all([
            API.getEstimates(),
            API.getLeads()
        ]);

        this.state.estimates = Array.isArray(estimates) ? estimates : [];
        this.state.leads = Array.isArray(leads) ? leads : [];

        // Calculate stats
        const acceptedEstimates = this.state.estimates.filter(e => e.status === 'accepted');
        const pendingEstimates = this.state.estimates.filter(e =>
            e.status === 'sent' || e.status === 'draft'
        );

        const totalQuoted = this.state.estimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
        const totalAccepted = acceptedEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
        const totalPending = pendingEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);

        this.state.stats = {
            totalQuoted,
            totalAccepted,
            totalPending,
            countTotal: this.state.estimates.length,
            countAccepted: acceptedEstimates.length,
            countPending: pendingEstimates.length
        };
    },

    // RENDER
    estimates_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.estimates_renderStyles()}
            <div class="estimates-container">
                ${this.estimates_renderHeader()}
                ${this.estimates_renderBanners()}
                ${this.estimates_renderEstimatesGrid()}
            </div>
        `;

        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
            this.estimates_attachEvents();
        }, 50);
    },

    // SMOOTH FILTER CHANGE
    async estimates_smoothFilterChange(newFilter) {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Fade out
        container.style.opacity = '0';

        // Wait for fade out
        await new Promise(resolve => setTimeout(resolve, 200));

        // Change filter
        this.state.currentFilter = newFilter;

        // Re-render
        this.estimates_render();
    },

    // HEADER
    estimates_renderHeader() {
        return `
            <div class="estimates-header">
                <div class="estimates-header-content">
                    <h1 class="estimates-title">
                        <svg class="estimates-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke-width="2"/>
                            <polyline points="14 2 14 8 20 8" stroke-width="2"/>
                            <line x1="16" y1="13" x2="8" y2="13" stroke-width="2"/>
                            <line x1="16" y1="17" x2="8" y2="17" stroke-width="2"/>
                            <polyline points="10 9 9 9 8 9" stroke-width="2"/>
                        </svg>
                        Estimates
                    </h1>
                    <p class="estimates-subtitle">Create and manage project quotes</p>
                </div>
                <button class="estimates-btn-primary" data-action="create-estimate">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    New Estimate
                </button>
            </div>
        `;
    },

    // CLICKABLE BANNERS
    estimates_renderBanners() {
        const stats = this.state.stats;

        return `
            <div class="estimates-banners">
                <!-- Total Quoted -->
                <button class="estimates-banner ${this.state.currentFilter === 'all' ? 'active' : ''}" data-action="filter-all">
                    <div class="estimates-banner-icon-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="12" y1="1" x2="12" y2="23" stroke-width="2"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-width="2"/>
                        </svg>
                    </div>
                    <div class="estimates-banner-content">
                        <div class="estimates-banner-value">${window.formatCurrency(stats.totalQuoted)}</div>
                        <div class="estimates-banner-label">Total Quoted</div>
                    </div>
                    <div class="estimates-banner-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </button>

                <!-- Accepted -->
                <button class="estimates-banner ${this.state.currentFilter === 'accepted' ? 'active' : ''}" data-action="filter-accepted">
                    <div class="estimates-banner-icon-wrapper estimates-banner-icon-accepted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2" stroke-linecap="round"/>
                            <polyline points="22 4 12 14.01 9 11.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="estimates-banner-content">
                        <div class="estimates-banner-value">${window.formatCurrency(stats.totalAccepted)}</div>
                        <div class="estimates-banner-label">Accepted</div>
                    </div>
                    <div class="estimates-banner-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </button>

                <!-- Pending -->
                <button class="estimates-banner ${this.state.currentFilter === 'pending' ? 'active' : ''}" data-action="filter-pending">
                    <div class="estimates-banner-icon-wrapper estimates-banner-icon-pending">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                            <polyline points="12 6 12 12 16 14" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="estimates-banner-content">
                        <div class="estimates-banner-value">${window.formatCurrency(stats.totalPending)}</div>
                        <div class="estimates-banner-label">Pending</div>
                    </div>
                    <div class="estimates-banner-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </button>
            </div>
        `;
    },

    // ESTIMATES GRID
    estimates_renderEstimatesGrid() {
        let estimatesToShow = [];
        let sectionTitle = 'All Estimates';

        if (this.state.currentFilter === 'all') {
            estimatesToShow = this.state.estimates;
            sectionTitle = 'All Estimates';
        } else if (this.state.currentFilter === 'accepted') {
            estimatesToShow = this.state.estimates.filter(e => e.status === 'accepted');
            sectionTitle = 'Accepted Estimates';
        } else if (this.state.currentFilter === 'pending') {
            estimatesToShow = this.state.estimates.filter(e =>
                e.status === 'sent' || e.status === 'draft'
            );
            sectionTitle = 'Pending Estimates';
        }

        return `
            <div class="estimates-section">
                <div class="estimates-section-header">
                    <h2 class="estimates-section-title">${sectionTitle}</h2>
                    <span class="estimates-section-count">${estimatesToShow.length}</span>
                </div>

                ${estimatesToShow.length > 0 ? `
                    <div class="estimates-grid">
                        ${estimatesToShow.map(estimate => this.estimates_renderEstimateCard(estimate)).join('')}
                    </div>
                ` : `
                    <div class="estimates-empty">
                        <svg class="estimates-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                            <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3 class="estimates-empty-title">No ${this.state.currentFilter === 'all' ? '' : this.state.currentFilter} estimates</h3>
                        <p class="estimates-empty-text">Create your first estimate to start quoting</p>
                        <button class="estimates-btn-secondary" data-action="create-estimate">
                            Create Estimate
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    // ESTIMATE CARD
    estimates_renderEstimateCard(estimate) {
        const lead = this.state.leads.find(l => l.id === estimate.lead_id);
        const leadName = lead ? lead.name : 'Unknown Lead';

        // Status classes and colors
        let statusClass = 'draft';
        let statusColor = '#94a3b8';
        if (estimate.status === 'accepted') {
            statusClass = 'accepted';
            statusColor = '#10b981';
        } else if (estimate.status === 'sent') {
            statusClass = 'sent';
            statusColor = '#f59e0b';
        }

        return `
            <div class="estimates-card estimates-card-${statusClass}"
                 data-action="view-estimate"
                 data-id="${estimate.id}">
                <div class="estimates-card-accent" style="background: ${statusColor}"></div>

                <div class="estimates-card-header">
                    <h3 class="estimates-card-title">${API.escapeHtml(estimate.title || 'Untitled Estimate')}</h3>
                    <div class="estimates-card-meta">
                        <span class="estimates-card-number">#${estimate.estimate_number || estimate.id}</span>
                        <span class="estimates-card-status estimates-status-${statusClass}">${this.estimates_formatStatus(estimate.status)}</span>
                    </div>
                </div>

                <div class="estimates-card-body">
                    <div class="estimates-card-lead">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="12" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${API.escapeHtml(leadName)}
                    </div>
                    <div class="estimates-card-price">
                        ${window.formatCurrency(estimate.total_price || 0)}
                    </div>
                </div>

                <div class="estimates-card-footer">
                    <div class="estimates-card-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                            <line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/>
                            <line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/>
                            <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
                        </svg>
                        ${window.SteadyUtils.formatDate(estimate.created_at, 'short')}
                    </div>
                    ${estimate.line_items && estimate.line_items.length > 0 ? `
                        <div class="estimates-card-items">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="8" y1="6" x2="21" y2="6" stroke-width="2" stroke-linecap="round"/>
                                <line x1="8" y1="12" x2="21" y2="12" stroke-width="2" stroke-linecap="round"/>
                                <line x1="8" y1="18" x2="21" y2="18" stroke-width="2" stroke-linecap="round"/>
                                <line x1="3" y1="6" x2="3.01" y2="6" stroke-width="2" stroke-linecap="round"/>
                                <line x1="3" y1="12" x2="3.01" y2="12" stroke-width="2" stroke-linecap="round"/>
                                <line x1="3" y1="18" x2="3.01" y2="18" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            ${estimate.line_items.length} items
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // ATTACH EVENTS - Called ONCE per render
    estimates_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // EVENT DELEGATION - Single click handler for everything
        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            switch (action) {
                case 'create-estimate':
                    this.estimates_showCreateModal();
                    break;
                case 'view-estimate':
                    this.estimates_showDetailModal(id);
                    break;
                case 'filter-all':
                    await this.estimates_smoothFilterChange('all');
                    break;
                case 'filter-accepted':
                    await this.estimates_smoothFilterChange('accepted');
                    break;
                case 'filter-pending':
                    await this.estimates_smoothFilterChange('pending');
                    break;
            }
        };
    },

    // UTILITY FUNCTIONS
    estimates_formatStatus(status) {
        const statusMap = {
            draft: 'Draft',
            sent: 'Sent',
            accepted: 'Accepted',
            rejected: 'Rejected'
        };
        return statusMap[status] || status;
    },

    estimates_showError(message) {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            <div class="estimates-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke-width="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke-width="2" stroke-linecap="round"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p>${message}</p>
            </div>
        `;
    },

    // PLACEHOLDER MODAL FUNCTIONS (to be implemented)
    estimates_showCreateModal() {
        console.log('Create modal - to be implemented');
    },

    estimates_showDetailModal(id) {
        console.log('Detail modal for', id);
    },

    // RENDER STYLES
    estimates_renderStyles() {
        return `
            <style>
                /* Container */
                .estimates-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 2rem;
                }

                /* Header */
                .estimates-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 2rem;
                }

                .estimates-header-content {
                    flex: 1;
                }

                .estimates-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 0.5rem 0;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .estimates-title-icon {
                    width: 2rem;
                    height: 2rem;
                    color: var(--primary);
                }

                .estimates-subtitle {
                    font-size: 1rem;
                    color: var(--text-tertiary);
                    margin: 0;
                }

                .estimates-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 0.875rem 1.5rem;
                    border-radius: var(--radius-lg);
                    font-size: 0.9375rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .estimates-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }

                .estimates-btn-primary svg {
                    width: 1.125rem;
                    height: 1.125rem;
                }

                /* Banners */
                .estimates-banners {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1.25rem;
                    margin-bottom: 2.5rem;
                }

                .estimates-banner {
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                }

                .estimates-banner::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .estimates-banner:hover::before,
                .estimates-banner.active::before {
                    opacity: 0.08;
                }

                .estimates-banner.active {
                    border-color: #667eea;
                    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
                }

                .estimates-banner-icon-wrapper {
                    width: 3.5rem;
                    height: 3.5rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    position: relative;
                }

                .estimates-banner-icon-wrapper svg {
                    width: 1.75rem;
                    height: 1.75rem;
                    color: white;
                    position: relative;
                    z-index: 1;
                }

                .estimates-banner-icon-accepted {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                }

                .estimates-banner-icon-pending {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                }

                .estimates-banner-content {
                    flex: 1;
                    position: relative;
                }

                .estimates-banner-value {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .estimates-banner-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    font-weight: 500;
                }

                .estimates-banner-arrow {
                    position: relative;
                }

                .estimates-banner-arrow svg {
                    width: 1.25rem;
                    height: 1.25rem;
                    color: var(--text-tertiary);
                }

                /* Section */
                .estimates-section {
                    margin-bottom: 2rem;
                }

                .estimates-section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                }

                .estimates-section-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                }

                .estimates-section-count {
                    background: var(--surface);
                    border: 2px solid var(--border);
                    color: var(--text-primary);
                    padding: 0.75rem 1.25rem;
                    border-radius: var(--radius-lg);
                    font-size: 0.9375rem;
                    font-weight: 600;
                }

                /* Grid */
                .estimates-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 1.25rem;
                }

                /* Card */
                .estimates-card {
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                }

                .estimates-card:hover {
                    border-color: #667eea;
                    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
                    transform: translateY(-2px);
                }

                .estimates-card-accent {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 5px;
                }

                .estimates-card-header {
                    margin-bottom: 1rem;
                }

                .estimates-card-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 0.5rem 0;
                }

                .estimates-card-meta {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .estimates-card-number {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    font-weight: 500;
                }

                .estimates-card-status {
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius);
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .estimates-status-draft {
                    background: rgba(148, 163, 184, 0.15);
                    color: #64748b;
                }

                .estimates-status-sent {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                }

                .estimates-status-accepted {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                }

                .estimates-card-body {
                    margin-bottom: 1rem;
                }

                .estimates-card-lead {
                    font-size: 0.9375rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .estimates-card-lead svg {
                    width: 1rem;
                    height: 1rem;
                    color: var(--text-tertiary);
                }

                .estimates-card-price {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .estimates-card-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border);
                }

                .estimates-card-date {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .estimates-card-date svg {
                    width: 1rem;
                    height: 1rem;
                }

                .estimates-card-items {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .estimates-card-items svg {
                    width: 1rem;
                    height: 1rem;
                }

                /* Empty State */
                .estimates-empty {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: var(--surface);
                    border: 2px dashed var(--border);
                    border-radius: var(--radius-lg);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .estimates-empty-icon {
                    width: 4rem;
                    height: 4rem;
                    color: var(--text-tertiary);
                    margin-bottom: 1.5rem;
                }

                .estimates-empty-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 0.5rem 0;
                }

                .estimates-empty-text {
                    font-size: 1rem;
                    color: var(--text-tertiary);
                    margin: 0 0 1.5rem 0;
                }

                .estimates-btn-secondary {
                    background: var(--surface);
                    color: var(--text-primary);
                    border: 2px solid var(--border);
                    padding: 0.875rem 1.5rem;
                    border-radius: var(--radius-lg);
                    font-size: 0.9375rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .estimates-btn-secondary:hover {
                    border-color: #667eea;
                    background: rgba(102, 126, 234, 0.05);
                }

                /* Error State */
                .estimates-error {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--danger);
                }

                .estimates-error svg {
                    width: 4rem;
                    height: 4rem;
                    margin-bottom: 1rem;
                }
            </style>
        `;
    },

    // Module interface
    init(container) {
        return this.estimates_init(container);
    }
};
