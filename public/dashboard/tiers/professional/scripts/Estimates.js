/**
 * ESTIMATES MODULE - Complete Rewrite v2.0
 * Clean, simple, bulletproof batch selection
 */

window.EstimatesModule = {
    // STATE
    state: {
        estimates: [],
        leads: [],
        filteredEstimates: [],
        container: 'estimates-content',

        // UI state
        searchQuery: '',
        sortBy: 'date_new',
        activeFilter: 'all', // all, accepted, pending

        // Batch mode
        batchMode: false,
        selectedEstimateIds: [],

        // Modal state
        editingEstimateId: null,

        // Limits
        estimateLimit: 1000,

        // Stats
        stats: {
            totalQuoted: 0,
            totalAccepted: 0,
            totalPending: 0,
            acceptanceRate: 0
        }
    },

    STATUSES: ['draft', 'sent', 'accepted', 'rejected', 'expired'],

    /**
     * Initialize
     */
    async init(targetContainer = 'estimates-content') {
        this.state.container = targetContainer;
        this.estimates_showLoading();

        try {
            const [estimates, leadsData] = await Promise.all([
                API.getEstimates(),
                API.getLeads()
            ]);

            this.state.estimates = Array.isArray(estimates) ? estimates : [];
            this.state.leads = leadsData?.all || [];
            this.state.filteredEstimates = this.state.estimates;

            console.log(`[Estimates] Loaded ${this.state.estimates.length} estimates`);

            this.estimates_calculateStats();
            this.estimates_render();
        } catch (error) {
            console.error('Error initializing Estimates:', error);
            this.estimates_showError('Failed to load estimates');
        }
    },

    /**
     * Main render
     */
    estimates_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        this.estimates_applyFilters();

        // Clear any lingering inline styles from other modules
        container.removeAttribute('style');

        container.innerHTML = `
            ${this.estimates_renderStyles()}
            <div class="estimates-container">
                ${this.estimates_renderHeader()}
                ${this.estimates_renderLimitBar()}
                ${this.estimates_renderStats()}
                ${this.estimates_renderToolbar()}
                ${this.estimates_renderGrid()}
            </div>
        `;

        // Use a single requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
            this.estimates_attachEvents();
        });
    },

    /**
     * Instant filter/search change (no full re-render)
     */
    estimates_instantFilterChange(newFilter) {
        // Allow same filter to trigger re-render (for search)
        if (newFilter !== undefined) {
            this.state.activeFilter = newFilter;
        }

        this.estimates_applyFilters();

        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Update stats active state
        const statCards = container.querySelectorAll('.estimates-stat-card');
        statCards.forEach(card => {
            if (card.dataset.filter === this.state.activeFilter) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Update grid
        const gridSection = container.querySelector('.estimates-grid-section');
        if (gridSection) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.estimates_renderGrid();
            gridSection.outerHTML = tempDiv.firstElementChild.outerHTML;

            // Re-apply batch mode if active
            if (this.state.batchMode) {
                this.estimates_applyBatchMode();
            }
        }

        console.log(`[Estimates] Filtered: ${this.state.filteredEstimates.length} results (search: "${this.state.searchQuery}")`);
    },

    /**
     * Apply filters
     */
    estimates_applyFilters() {
        let filtered = [...this.state.estimates];

        // Filter by banner
        if (this.state.activeFilter === 'accepted') {
            filtered = filtered.filter(e => e.status === 'accepted');
        } else if (this.state.activeFilter === 'pending') {
            filtered = filtered.filter(e => e.status === 'sent' || e.status === 'draft');
        }

        // Search
        if (this.state.searchQuery.trim()) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(e => {
                const title = (e.title || '').toLowerCase();
                const number = (e.estimate_number || '').toLowerCase();
                const lead = this.state.leads.find(l => l.id === e.lead_id);
                const leadName = lead ? (lead.name || '').toLowerCase() : '';

                return title.includes(query) || number.includes(query) || leadName.includes(query);
            });
        }

        // Sort
        filtered.sort((a, b) => {
            switch (this.state.sortBy) {
                case 'date_new': return new Date(b.created_at) - new Date(a.created_at);
                case 'date_old': return new Date(a.created_at) - new Date(b.created_at);
                case 'price_high': return (b.total_price || 0) - (a.total_price || 0);
                case 'price_low': return (a.total_price || 0) - (b.total_price || 0);
                default: return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        this.state.filteredEstimates = filtered;
    },

    /**
     * Calculate stats
     */
    estimates_calculateStats() {
        const all = this.state.estimates;
        const totalQuoted = all.reduce((sum, e) => sum + (e.total_price || 0), 0);
        
        const accepted = all.filter(e => e.status === 'accepted');
        const totalAccepted = accepted.reduce((sum, e) => sum + (e.total_price || 0), 0);
        
        const pending = all.filter(e => e.status === 'sent' || e.status === 'draft');
        const totalPending = pending.reduce((sum, e) => sum + (e.total_price || 0), 0);
        
        const acceptanceRate = all.length > 0 ? Math.round((accepted.length / all.length) * 100) : 0;

        this.state.stats = { totalQuoted, totalAccepted, totalPending, acceptanceRate };
    },

    /**
     * RENDER FUNCTIONS
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
                    <p class="estimates-subtitle">Create quotes and convert to jobs</p>
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

    estimates_renderLimitBar() {
        const total = this.state.estimates.length;
        const selected = this.state.selectedEstimateIds.length;

        return `
            <div class="estimates-limit-bar">
                <div class="estimates-limit-counter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.125rem; height: 1.125rem;">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>${total} / ${this.state.estimateLimit} estimates</span>
                </div>
            </div>
        `;
    },

    estimates_renderStats() {
        const { totalQuoted, totalAccepted, totalPending, acceptanceRate } = this.state.stats;

        // Helper to format stat values - show "..." suffix if > 99,999,999.99
        const formatStatValue = (amount) => {
            if (amount > 99999999.99) {
                return '$99,999,999.99...';
            }
            return formatCurrency(amount);
        };

        return `
            <div class="estimates-stats">
                <div class="estimates-stat-card ${this.state.activeFilter === 'all' ? 'active' : ''}"
                     data-filter="all" data-action="filter-stat">
                    <div class="estimates-stat-icon quoted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2"/>
                        </svg>
                    </div>
                    <div class="estimates-stat-content">
                        <div class="estimates-stat-value">${formatStatValue(totalQuoted)}</div>
                        <div class="estimates-stat-label">Total Quoted</div>
                    </div>
                </div>

                <div class="estimates-stat-card ${this.state.activeFilter === 'accepted' ? 'active' : ''}"
                     data-filter="accepted" data-action="filter-stat">
                    <div class="estimates-stat-icon accepted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                        </svg>
                    </div>
                    <div class="estimates-stat-content">
                        <div class="estimates-stat-value">${formatStatValue(totalAccepted)}</div>
                        <div class="estimates-stat-label">Accepted (${acceptanceRate}%)</div>
                    </div>
                </div>

                <div class="estimates-stat-card ${this.state.activeFilter === 'pending' ? 'active' : ''}"
                     data-filter="pending" data-action="filter-stat">
                    <div class="estimates-stat-icon pending">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                            <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="estimates-stat-content">
                        <div class="estimates-stat-value">${formatStatValue(totalPending)}</div>
                        <div class="estimates-stat-label">Pending</div>
                    </div>
                </div>
            </div>
        `;
    },

    estimates_renderToolbar() {
        const selected = this.state.selectedEstimateIds.length;

        return `
            <div class="estimates-toolbar">
                <div class="estimates-toolbar-left">
                    <div class="estimates-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="8" stroke-width="2"/>
                            <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <input type="search" id="estimatesSearchInput" placeholder="Search by title, number, or client..."
                               value="${this.state.searchQuery}" autocomplete="off">
                    </div>
                </div>
                <div class="estimates-toolbar-right">
                    <button class="estimates-btn-batch ${this.state.batchMode ? 'active' : ''}" data-action="toggle-batch">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            ${this.state.batchMode ? `
                                <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            ` : `
                                <path d="M9 11l3 3L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            `}
                        </svg>
                        ${this.state.batchMode ? `Cancel (${selected} selected)` : 'Edit Multiple'}
                    </button>
                    <div class="estimates-sort">
                        <select id="estimatesSortSelect">
                            <option value="date_new" ${this.state.sortBy === 'date_new' ? 'selected' : ''}>Date: Newest First</option>
                            <option value="date_old" ${this.state.sortBy === 'date_old' ? 'selected' : ''}>Date: Oldest First</option>
                            <option value="price_high" ${this.state.sortBy === 'price_high' ? 'selected' : ''}>Price: High → Low</option>
                            <option value="price_low" ${this.state.sortBy === 'price_low' ? 'selected' : ''}>Price: Low → High</option>
                        </select>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    },

    estimates_renderGrid() {
        if (this.state.filteredEstimates.length === 0) {
            return `
                <div class="estimates-grid-section">
                    <div class="estimates-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2"/>
                        </svg>
                        <h3>No estimates found</h3>
                        <p>Create your first estimate to start quoting clients</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="estimates-grid-section">
                <div class="estimates-grid">
                    ${this.state.filteredEstimates.map(e => this.estimates_renderCard(e)).join('')}
                </div>
                ${this.state.batchMode && this.state.selectedEstimateIds.length > 0 ? this.estimates_renderBatchActions() : ''}
            </div>
        `;
    },

    estimates_renderCard(estimate) {
        const lead = this.state.leads.find(l => l.id === estimate.lead_id);
        const photoCount = (estimate.photos || []).length;
        const expiry = this.estimates_getExpiryInfo(estimate);
        const isSelected = this.state.selectedEstimateIds.includes(estimate.id);

        return `
            <div class="estimate-card ${this.state.batchMode ? 'batch-mode' : ''} ${isSelected ? 'selected' : ''}"
                 data-action="${this.state.batchMode ? 'toggle-selection' : 'view-estimate'}"
                 data-id="${estimate.id}">

                ${this.state.batchMode ? `
                    <div class="estimate-card-checkbox">
                        <input type="checkbox" class="estimate-checkbox-input" 
                               ${isSelected ? 'checked' : ''} data-estimate-id="${estimate.id}">
                        <div class="estimate-checkbox-custom">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                ` : ''}

                <div class="estimate-card-content">
                    <div class="estimate-card-header">
                        <div class="estimate-header-left">
                            <div class="estimate-number">${estimate.estimate_number || 'EST-???'}</div>
                            <h3 class="estimate-title">${this.estimates_truncate(estimate.title || 'Untitled', 50)}</h3>
                        </div>
                        ${this.estimates_renderStatusBadge(estimate.status)}
                    </div>

                    ${lead ? `
                        <div class="estimate-lead">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-width="2"/>
                            </svg>
                            ${this.estimates_truncate(lead.name, 35)}
                        </div>
                    ` : ''}

                    <div class="estimate-card-meta">
                        <div class="estimate-total">${formatCurrency(estimate.total_price || 0)}</div>
                        ${photoCount > 0 ? `
                            <div class="estimate-photos-badge">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <path d="M21 15l-5-5L5 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                ${photoCount}
                            </div>
                        ` : ''}
                    </div>

                    ${expiry ? `
                        <div class="estimate-expiry ${expiry.warning ? 'warning' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                                <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            ${expiry.text}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

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
                ${status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
        `;
    },

    estimates_renderBatchActions() {
        const count = this.state.selectedEstimateIds.length;

        return `
            <div class="estimates-batch-actions">
                <div class="estimates-batch-actions-left">
                    <div class="estimates-batch-selected">${count} selected</div>
                </div>
                <div class="estimates-batch-actions-right">
                    <div class="estimates-batch-status-group">
                        <label for="batchStatusSelect">Change all status to:</label>
                        <select id="batchStatusSelect" class="estimates-batch-status-select" data-action="batch-change-status">
                            <option value="">Select status...</option>
                            ${this.STATUSES.map(status => `
                                <option value="${status}">${this.estimates_formatStatus(status)}</option>
                            `).join('')}
                        </select>
                    </div>
                    <button class="estimates-batch-btn delete" data-action="batch-delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
    },

    estimates_attachEvents() {
    const container = document.getElementById(this.state.container);
    if (!container) return;

    container.onclick = async (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id;

        switch (action) {
            case 'new-estimate':
                this.estimates_showCreateModal(); // ← CALL THIS
                break;
            // ... rest of your cases
        }
    };
},

estimates_showCreateModal(estimateId = null) {
    this.state.editingEstimateId = estimateId;

    // Clean up any existing modals first
    const existingModals = document.querySelectorAll('.estimate-modal-overlay');
    existingModals.forEach(m => m.remove());

    // Get estimate data if editing
    let estimate = null;
    if (estimateId) {
        estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) {
            alert('Estimate not found');
            return;
        }
    }

    console.log('[Estimates] Opening create modal...');
    console.log('[Estimates] Available leads:', this.state.leads.length);

    const modal = document.createElement('div');
    modal.className = 'estimate-modal-overlay';
    modal.innerHTML = this.estimates_renderModal(estimate);
    document.body.appendChild(modal);

    // Initialize modal events after render
    setTimeout(() => {
        this.estimates_initModalEvents(modal);
        this.estimates_updateLineItemsTotal();
    }, 0);
},

/**
 * Render modal styles
 */
estimates_renderModalStyles() {
    return `<style>
        .estimate-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
            padding: 2rem;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .estimate-modal {
            background: var(--surface);
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
            background: var(--surface-hover);
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
            margin-top: 12px;
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
            background: var(--background);
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

        /* Character Counter */
        .estimate-input-hint {
            font-size: 12px;
            color: var(--text-tertiary);
            font-weight: 500;
        }

        /* Custom Select Styling */
        .estimate-select-custom {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 16px;
            padding-right: 40px !important;
        }

        /* Lead Dropdown with Search */
        .estimate-lead-dropdown-wrapper {
            display: flex;
            gap: 8px;
            align-items: stretch;
        }

        .estimate-lead-dropdown-wrapper select {
            flex: 1;
        }

        .estimate-lead-search-btn {
            padding: 8px 16px;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--background);
            color: var(--text-primary);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }

        .estimate-lead-search-btn:hover {
            border-color: var(--primary);
            background: rgba(102, 126, 234, 0.05);
            color: var(--primary);
        }

        /* Section Header with Counter */
        .estimate-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .estimate-section-header .estimate-form-section-title {
            margin-bottom: 0;
        }

        .estimate-line-item-counter {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-tertiary);
        }

        /* Line Items */
        .estimate-line-items {
            background: var(--background);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
        }

        .estimate-line-item-header {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 40px;
            gap: 12px;
            margin-bottom: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-secondary);
        }

        .estimate-line-item-header > div {
            text-align: left;
            padding-left: 11px;
        }

        .estimate-line-item {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 40px;
            gap: 12px;
            margin-bottom: 12px;
            align-items: center;
        }

        .estimate-line-item input {
            padding: 8px 10px;
            border: 1px solid var(--border);
            border-radius: 4px;
            background: var(--surface);
            color: var(--text-primary);
            font-size: 14px;
            text-align: left !important;
            box-sizing: border-box;
            width: 100%;
        }

        .line-item-quantity,
        .line-item-rate {
            text-align: left !important;
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

        /* Photos */
        .estimate-photo-counter {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 12px;
        }

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

        /* Lead Search Modal */
        .estimate-search-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        }

        .estimate-search-modal {
            background: var(--surface);
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 70vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            animation: slideUp 0.3s ease;
        }

        .estimate-search-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
        }

        .estimate-search-modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .estimate-modal-close-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 8px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
        }

        .estimate-modal-close-btn svg {
            width: 20px;
            height: 20px;
            stroke-width: 2;
        }

        .estimate-modal-close-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
        }

        .estimate-search-modal-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            flex: 1;
            min-height: 0;
        }

        .estimate-search-input-wrapper {
            position: relative;
        }

        .estimate-search-input-wrapper svg {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            width: 18px;
            height: 18px;
            color: var(--text-tertiary);
            pointer-events: none;
        }

        .estimate-search-input-wrapper input {
            width: 100%;
            padding: 12px 16px 12px 44px;
            border: 2px solid var(--border);
            border-radius: 8px;
            background: var(--background);
            color: var(--text-primary);
            font-size: 15px;
            transition: all 0.2s;
        }

        .estimate-search-input-wrapper input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .estimate-lead-results {
            overflow-y: auto;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .estimate-lead-result-item {
            padding: 14px 16px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--surface);
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .estimate-lead-result-item:hover {
            border-color: var(--primary);
            background: rgba(102, 126, 234, 0.05);
            transform: translateX(4px);
        }

        .estimate-lead-result-name {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .estimate-lead-result-details {
            font-size: 13px;
            color: var(--text-secondary);
        }

        .estimate-lead-no-results {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
            font-size: 14px;
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
            background: var(--surface-hover);
        }

        .estimate-modal-btn-save {
            background: var(--primary);
            border: none;
            color: white;
        }

        .estimate-modal-btn-save:hover {
            background: var(--primary-dark);
        }

        @media (max-width: 768px) {
            .estimate-form-row,
            .estimate-line-item-header,
            .estimate-line-item {
                grid-template-columns: 1fr;
            }

            .estimate-photo-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>`;
},

/**
 * Render lead dropdown with search button
 */
estimates_renderLeadDropdown(selectedLeadId = null) {
    return `
        <div class="estimate-lead-dropdown-wrapper">
            <select id="estimateLead" class="estimate-select-custom">
                <option value="">Select lead (optional)</option>
                ${(Array.isArray(this.state.leads) ? this.state.leads : []).map(lead => `
                    <option value="${lead.id}" ${selectedLeadId === lead.id ? 'selected' : ''}>
                        ${this.estimates_truncateText(lead.name, 50)}${lead.company ? ` (${this.estimates_truncateText(lead.company, 30)})` : ''}
                    </option>
                `).join('')}
            </select>
            <button type="button" class="estimate-lead-search-btn" data-action="search-lead">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                Search
            </button>
        </div>
    `;
},

/**
 * Render line item row
 */
estimates_renderLineItemRow(item, index) {
    return `
        <div class="estimate-line-item" data-index="${index}">
            <input type="text" class="line-item-description" placeholder="Description" value="${item.description || ''}" data-field="description" maxlength="35" style="text-align: left;">
            <input type="text" class="line-item-quantity" placeholder="1" value="${item.quantity || 1}" data-field="quantity" style="text-align: left;">
            <input type="text" class="line-item-rate" placeholder="0.00" value="${item.rate || 0}" data-field="rate" style="text-align: left;">
            <button class="estimate-line-item-remove" data-action="remove-line-item" data-index="${index}" type="button">
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
            <button class="estimate-photo-remove" data-action="remove-photo" data-index="${index}" type="button">×</button>
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
 * Render comprehensive modal HTML
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
        ${this.estimates_renderModalStyles()}
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
                        <input type="text" id="estimateTitle" placeholder="e.g., Kitchen Remodel" value="${estimate?.title || ''}" maxlength="50" required>
                        <span class="estimate-input-hint" id="titleCounter">50 characters remaining</span>
                    </div>

                    <div class="estimate-form-group">
                        <label>Lead</label>
                        ${this.estimates_renderLeadDropdown(estimate?.lead_id)}
                    </div>

                    <div class="estimate-form-row">
                        <div class="estimate-form-group">
                            <label>Expires On</label>
                            <input type="date" id="estimateExpiry" value="${expiryDate}" ${!estimate?.expires_at ? 'disabled' : ''}>
                            <div style="margin-top: 0.5rem;">
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem; font-weight: 500;">
                                    <input type="checkbox" id="estimateNoExpiry" ${!estimate?.expires_at ? 'checked' : ''} style="cursor: pointer;">
                                    No expiration date (indefinite)
                                </label>
                            </div>
                        </div>

                        <div class="estimate-form-group">
                            <label>Status</label>
                            <select id="estimateStatus" class="estimate-select-custom">
                                ${this.STATUSES.map(status => `
                                    <option value="${status}" ${estimate?.status === status ? 'selected' : ''}>
                                        ${this.estimates_formatStatus(status)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="estimate-form-group">
                        <label>Description</label>
                        <textarea id="estimateDescription" placeholder="Brief description of the work..." maxlength="500">${estimate?.description || ''}</textarea>
                        <span class="estimate-input-hint" id="descriptionCounter">500 characters remaining</span>
                    </div>
                </div>

                <!-- Line Items -->
                <div class="estimate-form-section">
                    <div class="estimate-section-header">
                        <div class="estimate-form-section-title">Line Items</div>
                        <div class="estimate-line-item-counter" id="lineItemCounter">${lineItems.length}/50 line items</div>
                    </div>
                    <div class="estimate-line-items">
                        <div class="estimate-line-item-header">
                            <div>Description</div>
                            <div>Quantity</div>
                            <div>Rate</div>
                            <div></div>
                        </div>
                        <div id="lineItemsContainer">
                            ${lineItems.map((item, i) => this.estimates_renderLineItemRow(item, i)).join('')}
                        </div>
                        <button type="button" class="estimate-add-line-item" data-action="add-line-item">
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
                        <textarea id="estimateTerms" placeholder="Payment terms, warranty, etc..." maxlength="1000">${estimate?.terms || 'Payment due within 30 days of acceptance.\nEstimate valid for 30 days.'}</textarea>
                        <span class="estimate-input-hint" id="termsCounter">1000 characters remaining</span>
                    </div>
                </div>

                <!-- Notes -->
                <div class="estimate-form-section">
                    <div class="estimate-form-section-title">Internal Notes</div>
                    <div class="estimate-form-group">
                        <textarea id="estimateNotes" placeholder="Internal notes (not visible to client)..." maxlength="500">${estimate?.notes || ''}</textarea>
                        <span class="estimate-input-hint" id="notesCounter">500 characters remaining</span>
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
 * Initialize all modal events
 */
estimates_initModalEvents(overlay) {
    // Close modal
    overlay.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
        btn.addEventListener('click', () => this.estimates_closeModal());
    });

    // Click outside to close - proper mousedown/mouseup pattern to prevent drag-release issues
    let mouseDownTarget = null;

    overlay.addEventListener('mousedown', (e) => {
        mouseDownTarget = e.target;
    });

    overlay.addEventListener('mouseup', (e) => {
        // Only close if both down and up were on the overlay (not modal content)
        if (mouseDownTarget === overlay && e.target === overlay) {
            this.estimates_closeModal();
        }
        mouseDownTarget = null;
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

                    alert(`Lead "${lead.name}" created!`);
                } catch (err) {
                    console.error('Failed to create lead:', err);
                    alert('Failed to create lead');
                    e.target.value = '';
                }
            }
        });
    }

    // Line item changes with real-time validation
    overlay.addEventListener('input', (e) => {
        if (e.target.classList.contains('line-item-quantity') ||
            e.target.classList.contains('line-item-rate')) {

            // Get the current value
            let value = e.target.value;

            // Remove any non-numeric characters except decimal point
            value = value.replace(/[^0-9.]/g, '');

            // Ensure only one decimal point
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }

            // Limit decimal places to 2
            if (parts.length === 2 && parts[1].length > 2) {
                value = parts[0] + '.' + parts[1].substring(0, 2);
            }

            // Limit to 8 digits before decimal (max 99,999,999.99)
            if (parts[0].length > 8) {
                value = parts[0].substring(0, 8) + (parts.length > 1 ? '.' + parts[1] : '');
            }

            // Update the input value
            e.target.value = value;

            // Update total immediately
            this.estimates_updateLineItemsTotal();
        }
    });

    // Line item decimal validation on blur (format to 2 decimals)
    overlay.addEventListener('blur', (e) => {
        if (e.target.classList.contains('line-item-quantity') ||
            e.target.classList.contains('line-item-rate')) {
            let value = e.target.value.trim();

            // Handle empty or invalid input - default to 0
            if (value === '' || value === '.') {
                e.target.value = '0.00';
            } else {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && isFinite(numValue)) {
                    // Format to 2 decimal places
                    e.target.value = numValue.toFixed(2);
                } else {
                    e.target.value = '0.00';
                }
            }

            // Update total after formatting
            this.estimates_updateLineItemsTotal();
        }
    }, true);

    // Character counters
    const titleInput = overlay.querySelector('#estimateTitle');
    const descInput = overlay.querySelector('#estimateDescription');
    const termsInput = overlay.querySelector('#estimateTerms');
    const notesInput = overlay.querySelector('#estimateNotes');

    const updateCounter = (input, counterId, maxLength) => {
        const counter = overlay.querySelector(`#${counterId}`);
        if (!counter || !input) return;
        const remaining = maxLength - input.value.length;
        counter.textContent = `${remaining} character${remaining === 1 ? '' : 's'} remaining`;
        counter.style.color = remaining < 20 ? '#ef4444' : 'var(--text-tertiary)';
    };

    if (titleInput) {
        updateCounter(titleInput, 'titleCounter', 50);
        titleInput.addEventListener('input', () => updateCounter(titleInput, 'titleCounter', 50));
    }
    if (descInput) {
        updateCounter(descInput, 'descriptionCounter', 500);
        descInput.addEventListener('input', () => updateCounter(descInput, 'descriptionCounter', 500));
    }
    if (termsInput) {
        updateCounter(termsInput, 'termsCounter', 1000);
        termsInput.addEventListener('input', () => updateCounter(termsInput, 'termsCounter', 1000));
    }
    if (notesInput) {
        updateCounter(notesInput, 'notesCounter', 500);
        notesInput.addEventListener('input', () => updateCounter(notesInput, 'notesCounter', 500));
    }

    // No expiration checkbox toggle
    const noExpiryCheckbox = overlay.querySelector('#estimateNoExpiry');
    const expiryInput = overlay.querySelector('#estimateExpiry');
    if (noExpiryCheckbox && expiryInput) {
        noExpiryCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                expiryInput.disabled = true;
                expiryInput.value = '';
            } else {
                expiryInput.disabled = false;
                // Set default 30 days from now if no value
                if (!expiryInput.value) {
                    const defaultExpiry = new Date();
                    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
                    expiryInput.value = defaultExpiry.toISOString().split('T')[0];
                }
            }
        });
    }

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

    // Lead search button
    const searchLeadBtn = overlay.querySelector('[data-action="search-lead"]');
    if (searchLeadBtn) {
        searchLeadBtn.addEventListener('click', () => this.estimates_openLeadSearch(overlay));
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
 * Show view estimate modal
 */
estimates_showViewModal(estimateId) {
    const estimate = this.state.estimates.find(e => e.id === estimateId);
    if (!estimate) return;

    // Clean up any existing modals first
    const existingModals = document.querySelectorAll('.estimate-modal-overlay, .estimate-confirm-overlay');
    existingModals.forEach(m => m.remove());

    const lead = this.state.leads.find(l => l.id === estimate.lead_id);
    const lineItems = estimate.line_items || [];
    const photos = estimate.photos || [];
    const totalPrice = estimate.total_price || 0;

    const statusIcons = {
        draft: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2"/>',
        sent: '<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>',
        accepted: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>',
        rejected: '<path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>',
        expired: '<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>'
    };

    const statusColors = {
        draft: '#6b7280',
        sent: '#3b82f6',
        accepted: '#10b981',
        rejected: '#ef4444',
        expired: '#f59e0b'
    };

    const overlay = document.createElement('div');
    overlay.className = 'estimate-modal-overlay';
    overlay.innerHTML = `
        <style>
            .estimate-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
                padding: 2rem;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .estimate-view-modal {
                background: var(--surface);
                border-radius: 12px;
                width: 90%;
                max-width: 630px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease;
            }

            .estimate-view-header {
                padding: 32px;
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }

            .estimate-view-header-left {
                flex: 1;
            }

            .estimate-view-title {
                font-size: 28px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0 0 12px 0;
            }

            .estimate-view-meta {
                display: flex;
                gap: 24px;
                align-items: center;
                flex-wrap: wrap;
            }

            .estimate-view-meta-item {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
                color: var(--text-secondary);
            }

            .estimate-view-meta-item svg {
                width: 16px;
                height: 16px;
            }

            .estimate-view-status-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 500;
                background: ${statusColors[estimate.status]}15;
                color: ${statusColors[estimate.status]};
            }

            .estimate-view-status-badge svg {
                width: 14px;
                height: 14px;
            }

            .estimate-view-close {
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

            .estimate-view-close:hover {
                background: var(--surface-hover);
                color: var(--text-primary);
            }

            .estimate-view-body {
                padding: 32px;
            }

            .estimate-view-section {
                margin-bottom: 32px;
            }

            .estimate-view-section:last-child {
                margin-bottom: 0;
            }

            .estimate-view-section-title {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--text-tertiary);
                margin-bottom: 16px;
            }

            .estimate-view-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 24px;
            }

            .estimate-view-field {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .estimate-view-field-label {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-tertiary);
            }

            .estimate-view-field-value {
                font-size: 15px;
                color: var(--text-primary);
                word-wrap: break-word;
            }

            .estimate-view-description {
                padding: 16px;
                background: var(--background);
                border-radius: 8px;
                font-size: 14px;
                color: var(--text-primary);
                line-height: 1.6;
                white-space: pre-wrap;
            }

            .estimate-view-line-items-table {
                width: 100%;
                border-collapse: collapse;
                background: var(--background);
                border-radius: 8px;
                overflow: hidden;
            }

            .estimate-view-line-items-table thead {
                background: var(--surface-hover);
            }

            .estimate-view-line-items-table th {
                padding: 12px 16px;
                text-align: left;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--text-tertiary);
            }

            .estimate-view-line-items-table td {
                padding: 12px 16px;
                font-size: 14px;
                color: var(--text-primary);
                border-top: 1px solid var(--border);
            }

            .estimate-view-line-items-table td:last-child {
                text-align: right;
                font-weight: 500;
            }

            .estimate-view-total-box {
                margin-top: 16px;
                padding: 20px;
                background: rgba(59, 130, 246, 0.05);
                border: 1px solid var(--primary);
                border-radius: 8px;
                text-align: left;
            }

            .estimate-view-total-label {
                font-size: 14px;
                color: var(--text-secondary);
                margin-bottom: 4px;
            }

            .estimate-view-total-value {
                font-size: 32px;
                font-weight: 600;
                color: var(--primary);
            }

            .estimate-view-photos-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 12px;
            }

            .estimate-view-photo {
                aspect-ratio: 1;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid var(--border);
                cursor: pointer;
                transition: transform 0.2s;
            }

            .estimate-view-photo:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            .estimate-photo-lightbox {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                animation: fadeIn 0.2s ease;
                cursor: pointer;
            }

            .estimate-photo-lightbox img {
                max-width: 90%;
                max-height: 90vh;
                border-radius: 8px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            }

            .estimate-view-photo img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .estimate-view-footer {
                padding: 24px 32px;
                border-top: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
            }

            .estimate-view-actions {
                display: flex;
                gap: 12px;
                align-items: center;
            }

            .estimate-view-btn {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .estimate-view-btn svg {
                width: 16px;
                height: 16px;
            }

            .estimate-view-btn-edit {
                background: var(--primary);
                color: white;
            }

            .estimate-view-btn-edit:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }

            .estimate-view-btn-download {
                background: #10b981;
                color: white;
            }

            .estimate-view-btn-download:hover {
                background: #059669;
                transform: translateY(-1px);
            }

            .estimate-view-btn-delete {
                background: transparent;
                border: 1px solid #ef4444;
                color: #ef4444;
            }

            .estimate-view-btn-delete:hover {
                background: rgba(239, 68, 68, 0.1);
            }

            .estimate-view-status-dropdown {
                padding: 10px 16px;
                border: 1px solid var(--border);
                border-radius: 6px;
                background: var(--background);
                color: var(--text-primary);
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
                background-size: 16px;
                padding-right: 40px;
            }

            .estimate-view-status-dropdown:hover {
                border-color: var(--primary);
            }

            .estimate-view-status-dropdown:focus {
                outline: none;
                border-color: var(--primary);
            }
        </style>
        <div class="estimate-view-modal">
            <div class="estimate-view-header">
                <div class="estimate-view-header-left">
                    <h2 class="estimate-view-title">${estimate.title}</h2>
                    <div class="estimate-view-meta">
                        <div class="estimate-view-status-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                ${statusIcons[estimate.status]}
                            </svg>
                            ${this.estimates_formatStatus(estimate.status)}
                        </div>
                        ${lead ? `
                            <div class="estimate-view-meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                ${lead.name}
                            </div>
                        ` : ''}
                        <div class="estimate-view-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            ${estimate.expires_at ? `Expires ${new Date(estimate.expires_at).toLocaleDateString()}` : 'No expiration'}
                        </div>
                    </div>
                </div>
                <button class="estimate-view-close" data-action="close-view-modal">×</button>
            </div>

            <div class="estimate-view-body">
                ${estimate.description ? `
                    <div class="estimate-view-section">
                        <div class="estimate-view-section-title">Description</div>
                        <div class="estimate-view-description">${estimate.description || 'No description provided'}</div>
                    </div>
                ` : ''}

                ${lineItems.length > 0 ? `
                    <div class="estimate-view-section">
                        <div class="estimate-view-section-title">Line Items</div>
                        <table class="estimate-view-line-items-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Quantity</th>
                                    <th>Rate</th>
                                    <th style="text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lineItems.map(item => `
                                    <tr>
                                        <td>${item.description || '-'}</td>
                                        <td>${item.quantity}</td>
                                        <td>${formatCurrency(item.rate)}</td>
                                        <td style="text-align: right;">${formatCurrency(item.quantity * item.rate)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="estimate-view-total-box">
                            <div class="estimate-view-total-label">Total Estimate</div>
                            <div class="estimate-view-total-value">${formatCurrency(totalPrice)}</div>
                        </div>
                    </div>
                ` : ''}

                ${photos.length > 0 ? `
                    <div class="estimate-view-section">
                        <div class="estimate-view-section-title">Photos (${photos.length})</div>
                        <div class="estimate-view-photos-grid">
                            ${photos.map(photo => `
                                <div class="estimate-view-photo">
                                    <img src="${photo.url}" alt="${photo.caption || 'Photo'}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${estimate.terms ? `
                    <div class="estimate-view-section">
                        <div class="estimate-view-section-title">Terms & Conditions</div>
                        <div class="estimate-view-description">${estimate.terms}</div>
                    </div>
                ` : ''}

                ${estimate.notes ? `
                    <div class="estimate-view-section">
                        <div class="estimate-view-section-title">Internal Notes</div>
                        <div class="estimate-view-description">${estimate.notes}</div>
                    </div>
                ` : ''}
            </div>

            <div class="estimate-view-footer">
                <button class="estimate-view-btn estimate-view-btn-edit" data-action="edit-estimate" data-id="${estimate.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>

                <button class="estimate-view-btn estimate-view-btn-download" data-action="download-client-copy" data-id="${estimate.id}">
                    Download Client Copy
                </button>

                <div class="estimate-view-actions">
                    <select class="estimate-view-status-dropdown" data-action="update-status" data-id="${estimate.id}">
                        ${this.STATUSES.map(status => `
                            <option value="${status}" ${estimate.status === status ? 'selected' : ''}>
                                ${this.estimates_formatStatus(status)}
                            </option>
                        `).join('')}
                    </select>

                    <button class="estimate-view-btn estimate-view-btn-delete" data-action="delete-estimate" data-id="${estimate.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close modal
    overlay.querySelector('[data-action="close-view-modal"]').addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    });

    // Edit estimate
    overlay.querySelector('[data-action="edit-estimate"]').addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            this.estimates_showCreateModal(estimate.id);
        }, 200);
    });

    // Download client copy
    overlay.querySelector('[data-action="download-client-copy"]').addEventListener('click', () => {
        this.estimates_downloadClientCopy(estimate, lead, lineItems, photos, totalPrice);

        // Close modal instantly like other actions
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 200);
    });

    // Delete estimate
    overlay.querySelector('[data-action="delete-estimate"]').addEventListener('click', async () => {
        const confirmed = await this.estimates_showConfirmation({
            title: 'Delete Estimate',
            message: `Are you sure you want to delete "${estimate.title}"? This action cannot be undone.`,
            confirmText: 'Delete',
            type: 'danger'
        });

        if (!confirmed) return;

        // Close modal immediately for instant feedback
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);

        // Remove from local state immediately
        const index = this.state.estimates.findIndex(e => e.id === estimate.id);
        if (index !== -1) {
            this.state.estimates.splice(index, 1);
        }

        // Update UI immediately
        this.estimates_calculateStats();
        this.estimates_instantFilterChange();

        // Update stats section and limit bar in DOM
        const container = document.getElementById(this.state.container);
        if (container) {
            const statsSection = container.querySelector('.estimates-stats');
            if (statsSection) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.estimates_renderStats();
                statsSection.outerHTML = tempDiv.firstElementChild.outerHTML;
            }

            // Update limit bar
            const limitBar = container.querySelector('.estimates-limit-bar');
            if (limitBar) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.estimates_renderLimitBar();
                limitBar.outerHTML = tempDiv.firstElementChild.outerHTML;
            }
        }

        // Delete from server in background
        try {
            await API.deleteEstimate(estimate.id);
        } catch (error) {
            console.error('Delete estimate error:', error);
            window.SteadyUtils.showToast('Failed to delete estimate', 'error');
        }
    });

    // Update status
    overlay.querySelector('[data-action="update-status"]').addEventListener('change', async (e) => {
        const newStatus = e.target.value;

        // Close modal immediately for instant feedback
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);

        // Update local state immediately
        const est = this.state.estimates.find(e => e.id === estimate.id);
        if (est) {
            est.status = newStatus;
        }

        // Update UI immediately and switch to matching tab
        this.estimates_calculateStats();
        this.estimates_instantFilterChange(newStatus);

        // Update stats section in DOM
        const container = document.getElementById(this.state.container);
        if (container) {
            const statsSection = container.querySelector('.estimates-stats');
            if (statsSection) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.estimates_renderStats();
                statsSection.outerHTML = tempDiv.firstElementChild.outerHTML;
            }
        }

        // Update server in background
        try {
            await API.updateEstimate(estimate.id, { status: newStatus });
        } catch (error) {
            console.error('Update status error:', error);
            window.SteadyUtils.showToast('Failed to update status', 'error');
        }
    });

    // Photo click to enlarge
    overlay.querySelectorAll('.estimate-view-photo img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            const lightbox = document.createElement('div');
            lightbox.className = 'estimate-photo-lightbox';
            lightbox.innerHTML = `<img src="${img.src}" alt="${img.alt}">`;
            document.body.appendChild(lightbox);

            setTimeout(() => {
                lightbox.style.opacity = '1';
            }, 10);

            lightbox.addEventListener('click', () => {
                lightbox.style.opacity = '0';
                setTimeout(() => lightbox.remove(), 200);
            });
        });
    });

    // Close on overlay click - proper mousedown/mouseup pattern to prevent drag-release issues
    let mouseDownTarget = null;

    overlay.addEventListener('mousedown', (e) => {
        mouseDownTarget = e.target;
    });

    overlay.addEventListener('mouseup', (e) => {
        // Only close if both down and up were on the overlay (not modal content)
        if (mouseDownTarget === overlay && e.target === overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        }
        mouseDownTarget = null;
    });
},

/**
 * Download professional client copy as printable PDF
 */
async estimates_downloadClientCopy(estimate, lead, lineItems, photos, totalPrice) {
    // Load jsPDF library if not already loaded
    if (!window.jspdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);

        // Wait for script to load
        await new Promise((resolve) => {
            script.onload = resolve;
        });
    }

    // Helper to format currency
    const formatMoney = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
    };

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        unit: 'in',
        format: 'letter',
        orientation: 'portrait'
    });

    let y = 1; // Current Y position

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(estimate.title || 'Estimate', 4.25, y, { align: 'center' });
    y += 0.5;

    // Line
    doc.setLineWidth(0.02);
    doc.line(0.75, y, 7.75, y);
    y += 0.4;

    // Client Info (Left) and Date Info (Right)
    doc.setFontSize(10);
    if (lead) {
        doc.setFont('helvetica', 'bold');
        doc.text('CLIENT:', 0.75, y);
        doc.setFont('helvetica', 'normal');
        doc.text(lead.name || '', 1.5, y);
        y += 0.2;
    }

    // Date info on right
    let yRight = 1.9;
    doc.setFont('helvetica', 'bold');
    doc.text('DATE:', 5, yRight);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(estimate.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 5.6, yRight);
    yRight += 0.2;

    if (estimate.expires_at) {
        doc.setFont('helvetica', 'bold');
        doc.text('VALID UNTIL:', 5, yRight);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(estimate.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 6.1, yRight);
        yRight += 0.2;
    }

    // Status removed from client copy as requested
    y = Math.max(y, yRight) + 0.2;

    // Description
    if (estimate.description) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('PROJECT DESCRIPTION', 0.75, y);
        y += 0.05;
        doc.line(0.75, y, 7.75, y);
        y += 0.25;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(estimate.description, 6.5);
        doc.text(descLines, 0.75, y);
        y += (descLines.length * 0.15) + 0.3;
    }

    // Line Items
    if (lineItems.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('SCOPE OF WORK', 0.75, y);
        y += 0.05;
        doc.line(0.75, y, 7.75, y);
        y += 0.3;

        // Table header
        doc.setFillColor(51, 51, 51);
        doc.rect(0.75, y - 0.15, 7, 0.25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Description', 0.85, y);
        doc.text('Qty', 4.5, y, { align: 'center' });
        doc.text('Rate', 5.5, y, { align: 'right' });
        doc.text('Amount', 7.5, y, { align: 'right' });
        y += 0.25;

        // Table rows
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        lineItems.forEach((item, idx) => {
            doc.text(item.description || '-', 0.85, y);
            doc.text(String(item.quantity), 4.5, y, { align: 'center' });
            doc.text(formatMoney(item.rate), 5.5, y, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.text(formatMoney(item.quantity * item.rate), 7.5, y, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            y += 0.2;
        });

        y += 0.2;

        // Total box
        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(51, 51, 51);
        doc.setLineWidth(0.02);
        doc.rect(0.75, y, 7, 0.6, 'FD');
        y += 0.2;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL ESTIMATE', 0.85, y);
        y += 0.25;

        doc.setFontSize(22);
        doc.text(formatMoney(totalPrice), 0.85, y);
        y += 0.4;
    }

    // Terms
    if (estimate.terms) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TERMS & CONDITIONS', 0.75, y);
        y += 0.05;
        doc.line(0.75, y, 7.75, y);
        y += 0.25;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const termsLines = doc.splitTextToSize(estimate.terms, 6.5);
        doc.text(termsLines, 0.75, y);
        y += (termsLines.length * 0.12) + 0.3;
    }

    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('This estimate is valid for the period specified above. Work will commence upon acceptance and deposit receipt.', 4.25, 10.5, { align: 'center' });

    // Save PDF
    const filename = `Estimate-${estimate.estimate_number || 'draft'}.pdf`;
    doc.save(filename);

    window.SteadyUtils.showToast('PDF downloaded successfully', 'success');
},
/**
 * DEPRECATED - Old print version
 */
estimates_downloadClientCopy_OLD(estimate, lead, lineItems, photos, totalPrice) {
    // Create hidden iframe for clean PDF generation
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;

    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Estimate - ${estimate.title}</title>
            <style>
                @page {
                    size: letter;
                    margin: 0.75in;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    font-size: 11pt;
                    line-height: 1.5;
                    color: #000;
                    background: white;
                }

                .header {
                    text-align: center;
                    border-bottom: 3px solid #333;
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                }

                .header h1 {
                    font-size: 24pt;
                    font-weight: bold;
                    margin-bottom: 5px;
                    color: #333;
                }

                .header .estimate-number {
                    font-size: 10pt;
                    color: #666;
                    font-weight: normal;
                }

                .info-section {
                    display: table;
                    width: 100%;
                    margin-bottom: 25px;
                }

                .info-left, .info-right {
                    display: table-cell;
                    width: 50%;
                    vertical-align: top;
                }

                .info-right {
                    text-align: right;
                }

                .info-item {
                    margin-bottom: 5px;
                    font-size: 10pt;
                }

                .info-label {
                    font-weight: bold;
                    color: #333;
                }

                .section-title {
                    font-size: 12pt;
                    font-weight: bold;
                    margin: 20px 0 10px 0;
                    padding-bottom: 5px;
                    border-bottom: 2px solid #333;
                    color: #333;
                }

                .description-box {
                    background: #f5f5f5;
                    padding: 12px;
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    white-space: pre-wrap;
                    font-size: 10pt;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }

                thead {
                    background: #333;
                    color: white;
                }

                th {
                    padding: 10px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 10pt;
                }

                td {
                    padding: 8px 10px;
                    border-bottom: 1px solid #ddd;
                    font-size: 10pt;
                }

                tbody tr:last-child td {
                    border-bottom: 2px solid #333;
                }

                .text-right {
                    text-align: right;
                }

                .total-section {
                    margin: 25px 0;
                    padding: 15px;
                    background: #f5f5f5;
                    border: 2px solid #333;
                    border-radius: 4px;
                }

                .total-label {
                    font-size: 12pt;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 8px;
                }

                .total-amount {
                    font-size: 28pt;
                    font-weight: bold;
                    color: #000;
                }

                .photos-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin: 15px 0;
                }

                .photo-container {
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    overflow: hidden;
                    page-break-inside: avoid;
                }

                .photo-container img {
                    width: 100%;
                    height: auto;
                    display: block;
                }

                .terms-box {
                    background: #f9f9f9;
                    padding: 12px;
                    border-left: 4px solid #333;
                    margin-top: 20px;
                    white-space: pre-wrap;
                    font-size: 9pt;
                    color: #333;
                    page-break-inside: avoid;
                }

                .footer {
                    margin-top: 40px;
                    padding-top: 15px;
                    border-top: 1px solid #ddd;
                    text-align: center;
                    font-size: 9pt;
                    color: #666;
                }

                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .page-break {
                        page-break-before: always;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${estimate.title}</h1>
                <div class="estimate-number">Estimate #${estimate.estimate_number || 'N/A'}</div>
            </div>

            <div class="info-section">
                <div class="info-left">
                    ${lead ? `
                        <div class="info-item"><span class="info-label">CLIENT:</span> ${lead.name}</div>
                        ${lead.email ? `<div class="info-item"><span class="info-label">EMAIL:</span> ${lead.email}</div>` : ''}
                        ${lead.phone ? `<div class="info-item"><span class="info-label">PHONE:</span> ${lead.phone}</div>` : ''}
                    ` : ''}
                </div>
                <div class="info-right">
                    <div class="info-item"><span class="info-label">DATE:</span> ${new Date(estimate.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    ${estimate.expires_at ? `<div class="info-item"><span class="info-label">VALID UNTIL:</span> ${new Date(estimate.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
                    <div class="info-item"><span class="info-label">STATUS:</span> ${this.estimates_formatStatus(estimate.status)}</div>
                </div>
            </div>

            ${estimate.description ? `
                <div class="section-title">PROJECT DESCRIPTION</div>
                <div class="description-box">${estimate.description}</div>
            ` : ''}

            ${lineItems.length > 0 ? `
                <div class="section-title">SCOPE OF WORK</div>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="width: 80px; text-align: center;">Qty</th>
                            <th style="width: 100px; text-align: right;">Rate</th>
                            <th style="width: 120px; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lineItems.map(item => `
                            <tr>
                                <td>${item.description || '-'}</td>
                                <td style="text-align: center;">${item.quantity}</td>
                                <td class="text-right">${formatCurrency(item.rate)}</td>
                                <td class="text-right"><strong>${formatCurrency(item.quantity * item.rate)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="total-label">TOTAL ESTIMATE</div>
                    <div class="total-amount">${formatCurrency(totalPrice)}</div>
                </div>
            ` : ''}

            ${photos.length > 0 ? `
                <div class="page-break"></div>
                <div class="section-title">REFERENCE PHOTOS</div>
                <div class="photos-grid">
                    ${photos.map(photo => `
                        <div class="photo-container">
                            <img src="${photo.url}" alt="${photo.caption || 'Reference photo'}">
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${estimate.terms ? `
                <div class="section-title">TERMS & CONDITIONS</div>
                <div class="terms-box">${estimate.terms}</div>
            ` : ''}

            <div class="footer">
                This estimate is valid for the period specified above. Work will commence upon acceptance and deposit receipt.
            </div>
        </body>
        </html>
    `);

    doc.close();

    // Wait for content and images to load, then trigger print
    setTimeout(() => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            // Clean up iframe after printing/canceling
            setTimeout(() => {
                if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                }
            }, 1000);
        } catch (error) {
            console.error('Print error:', error);
            if (iframe.parentNode) {
                document.body.removeChild(iframe);
            }
        }
    }, 500);
},

/**
 * Add line item
 */
estimates_addLineItem(overlay) {
    const container = overlay.querySelector('#lineItemsContainer');
    const currentItems = container.querySelectorAll('.estimate-line-item').length;

    // Cap at 50 line items
    if (currentItems >= 50) {
        alert('Maximum 50 line items allowed');
        return;
    }

    const newItem = { description: '', quantity: 1, rate: 0 };
    const html = this.estimates_renderLineItemRow(newItem, currentItems);

    container.insertAdjacentHTML('beforeend', html);
    this.estimates_updateLineItemsTotal();
    this.estimates_updateLineItemCounter(overlay);
},

/**
 * Remove line item
 */
estimates_removeLineItem(overlay, index) {
    const container = overlay.querySelector('#lineItemsContainer');
    const items = container.querySelectorAll('.estimate-line-item');

    // Silently prevent deletion if only one item remains
    if (items.length <= 1) {
        return;
    }

    items[index].remove();

    // Re-index remaining items
    container.querySelectorAll('.estimate-line-item').forEach((item, newIndex) => {
        item.dataset.index = newIndex;
        item.querySelector('[data-action="remove-line-item"]').dataset.index = newIndex;
    });

    this.estimates_updateLineItemsTotal();
    this.estimates_updateLineItemCounter(overlay);
},

/**
 * Update line items total
 */
estimates_updateLineItemsTotal() {
    const container = document.querySelector('#lineItemsContainer');
    if (!container) {
        console.warn('Line items container not found');
        return;
    }

    let total = 0;
    const rows = container.querySelectorAll('.estimate-line-item');

    console.log(`Calculating total for ${rows.length} line items`);

    rows.forEach((row, index) => {
        const qtyInput = row.querySelector('.line-item-quantity');
        const rateInput = row.querySelector('.line-item-rate');

        if (!qtyInput || !rateInput) {
            console.warn(`Row ${index}: Missing inputs`);
            return;
        }

        // Get raw values
        const qtyValue = qtyInput.value.trim();
        const rateValue = rateInput.value.trim();

        console.log(`Row ${index}: qty="${qtyValue}" rate="${rateValue}"`);

        // Parse to numbers, default to 0 if empty or invalid
        let qty = qtyValue === '' ? 0 : parseFloat(qtyValue);
        let rate = rateValue === '' ? 0 : parseFloat(rateValue);

        if (isNaN(qty)) qty = 0;
        if (isNaN(rate)) rate = 0;

        const lineTotal = qty * rate;
        console.log(`Row ${index}: ${qty} × ${rate} = ${lineTotal}`);

        total += lineTotal;
    });

    console.log(`TOTAL: ${total}`);

    // Round to 2 decimal places
    total = Math.round(total * 100) / 100;

    const displayEl = document.querySelector('#estimateTotalDisplay');
    if (displayEl) {
        displayEl.textContent = '$' + total.toFixed(2);
    } else {
        console.warn('Total display element not found');
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
            alert('Maximum 3 photos allowed');
            return;
        }

        console.log('Compressing photo...');

        // Compress image if API has compressImage
        let fileToUse = file;
        if (typeof API.compressImage === 'function') {
            fileToUse = await API.compressImage(file);
        }

        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = {
                url: e.target.result,
                file: fileToUse,
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
            console.log('Photo added');
        };
        reader.readAsDataURL(fileToUse);

    } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Failed to upload photo');
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
    console.log('Photo removed');
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
        const noExpiry = overlay.querySelector('#estimateNoExpiry')?.checked;
        const expiresAt = noExpiry ? null : overlay.querySelector('#estimateExpiry').value;
        const description = overlay.querySelector('#estimateDescription').value.trim();
        const terms = overlay.querySelector('#estimateTerms').value.trim();
        const notes = overlay.querySelector('#estimateNotes').value.trim();

        // Validation
        if (!title) {
            const titleInput = overlay.querySelector('#estimateTitle');
            const titleCounter = overlay.querySelector('#titleCounter');

            // Add error styling
            titleInput.style.borderColor = 'var(--danger)';
            titleInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';

            // Update hint text to show error
            if (titleCounter) {
                titleCounter.textContent = 'Title is required';
                titleCounter.style.color = 'var(--danger)';
                titleCounter.style.fontWeight = '600';
            }

            // Focus the input
            titleInput.focus();

            // Scroll to the top of the modal to make the error visible
            const modalBody = overlay.querySelector('.estimate-modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }

            // Remove error styling when user types
            titleInput.addEventListener('input', function clearError() {
                titleInput.style.borderColor = '';
                titleInput.style.boxShadow = '';
                if (titleCounter) {
                    const remaining = 50 - titleInput.value.length;
                    titleCounter.textContent = `${remaining} characters remaining`;
                    titleCounter.style.color = remaining <= 5 ? 'var(--warning)' : '';
                    titleCounter.style.fontWeight = '500';
                }
                titleInput.removeEventListener('input', clearError);
            }, { once: true });

            return;
        }

        // Gather line items
        const lineItems = [];
        overlay.querySelectorAll('.estimate-line-item').forEach(row => {
            const desc = row.querySelector('.line-item-description').value.trim();
            const qtyInput = row.querySelector('.line-item-quantity').value;
            const rateInput = row.querySelector('.line-item-rate').value;

            // Parse values carefully
            let qty = parseFloat(qtyInput);
            let rate = parseFloat(rateInput);

            // Handle invalid inputs
            if (isNaN(qty) || !isFinite(qty)) qty = 0;
            if (isNaN(rate) || !isFinite(rate)) rate = 0;

            // Round to 2 decimal places to avoid floating point errors
            qty = Math.round(qty * 100) / 100;
            rate = Math.round(rate * 100) / 100;

            if (desc || qty > 0 || rate > 0) {
                lineItems.push({ description: desc, quantity: qty, rate: rate });
            }
        });

        // Calculate total with proper decimal handling
        const totalPrice = lineItems.reduce((sum, item) => {
            const lineTotal = Math.round((item.quantity * item.rate) * 100) / 100;
            return Math.round((sum + lineTotal) * 100) / 100;
        }, 0);

        // Gather photos
        const photoElements = overlay.querySelectorAll('.estimate-photo-item img');
        const photos = Array.from(photoElements).map((img, i) => ({
            url: img.src,
            caption: `Photo ${i + 1}`
        }));

        const estimateData = {
            title,
            lead_id: leadId || null,
            status,
            expires_at: expiresAt || null,
            description,
            terms,
            notes,
            line_items: lineItems,
            total_price: totalPrice,
            photos
        };

        console.log('[Estimates] Saving estimate:', estimateData);

        // Save the editing ID before closing modal (closeModal sets it to null)
        const editingId = this.state.editingEstimateId;

        // Close modal immediately for instant feedback
        this.estimates_closeModal();

        // Save in background
        try {
            let savedEstimate;
            if (editingId) {
                savedEstimate = await API.updateEstimate(editingId, estimateData);

                // Update in state
                const index = this.state.estimates.findIndex(e => e.id === editingId);
                if (index !== -1) {
                    this.state.estimates[index] = savedEstimate;
                }
            } else {
                savedEstimate = await API.createEstimate(estimateData);
                this.state.estimates.unshift(savedEstimate);
            }

            // Silently update UI
            this.estimates_calculateStats();
            this.estimates_render();

        } catch (error) {
            console.error('[Estimates] Save error:', error);
            window.SteadyUtils.showToast('Failed to save estimate', 'error');
        }

    } catch (error) {
        // Validation errors (before modal closes)
        console.error('[Estimates] Validation error:', error);
    }
},

/**
 * Update line item counter and button state
 */
estimates_updateLineItemCounter(overlay) {
    const container = overlay.querySelector('#lineItemsContainer');
    const counter = overlay.querySelector('#lineItemCounter');
    const addButton = overlay.querySelector('[data-action="add-line-item"]');

    if (!container || !counter) return;

    const count = container.querySelectorAll('.estimate-line-item').length;
    counter.textContent = `${count}/50 line items`;

    // Disable add button if at max
    if (addButton) {
        if (count >= 50) {
            addButton.disabled = true;
            addButton.style.opacity = '0.5';
            addButton.style.cursor = 'not-allowed';
        } else {
            addButton.disabled = false;
            addButton.style.opacity = '';
            addButton.style.cursor = '';
        }
    }
},

/**
 * Open lead search modal
 */
estimates_openLeadSearch(parentOverlay) {
    const searchModalHtml = `
        <div class="estimate-search-modal-overlay" id="leadSearchModal">
            <div class="estimate-search-modal">
                <div class="estimate-search-modal-header">
                    <h3>Search Leads</h3>
                    <button class="estimate-modal-close-btn" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="estimate-search-modal-body">
                    <div class="estimate-search-input-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input type="text" id="leadSearchInput" placeholder="Type to search leads..." autofocus>
                    </div>
                    <div class="estimate-lead-results" id="leadSearchResults">
                        ${this.estimates_renderLeadSearchResults('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', searchModalHtml);

    const modal = document.getElementById('leadSearchModal');
    const searchInput = document.getElementById('leadSearchInput');
    const resultsContainer = document.getElementById('leadSearchResults');

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        resultsContainer.innerHTML = this.estimates_renderLeadSearchResults(query);
    });

    // Close button
    modal.querySelector('.estimate-modal-close-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Backdrop click to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Handle lead selection
    modal.addEventListener('click', (e) => {
        const leadItem = e.target.closest('.estimate-lead-result-item');
        if (leadItem) {
            const leadId = leadItem.dataset.leadId;
            const leadSelect = parentOverlay.querySelector('#estimateLead');
            if (leadSelect) {
                leadSelect.value = leadId;
            }
            modal.remove();
        }
    });
},

/**
 * Render lead search results
 */
estimates_renderLeadSearchResults(query) {
    const leads = Array.isArray(this.state.leads) ? this.state.leads : [];

    const filtered = query ? leads.filter(lead => {
        const searchText = `${lead.name} ${lead.company || ''} ${lead.email || ''} ${lead.phone || ''}`.toLowerCase();
        return searchText.includes(query);
    }) : leads;

    if (filtered.length === 0) {
        return `<div class="estimate-lead-no-results">No leads found${query ? ` for "${query}"` : ''}</div>`;
    }

    return filtered.map(lead => `
        <div class="estimate-lead-result-item" data-lead-id="${lead.id}">
            <div class="estimate-lead-result-name">${this.estimates_truncateText(lead.name, 60)}</div>
            <div class="estimate-lead-result-details">
                ${lead.company ? this.estimates_truncateText(lead.company, 50) : 'No company'}
                ${lead.phone ? ` • ${lead.phone}` : ''}
                ${lead.email ? ` • ${this.estimates_truncateText(lead.email, 40)}` : ''}
            </div>
        </div>
    `).join('');
},

/**
 * Truncate text to max length
 */
estimates_truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
},

/**
 * Format status for display
 */
estimates_formatStatus(status) {
    const statusMap = {
        'draft': 'Draft',
        'sent': 'Sent',
        'accepted': 'Accepted',
        'rejected': 'Rejected',
        'expired': 'Expired'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
},

    /**
     * EVENT HANDLING - Single delegation (like Goals)
     */
    estimates_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // SINGLE CLICK HANDLER
        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            switch (action) {
                case 'new-estimate':
                    this.estimates_showCreateModal();
                    console.log('Open new estimate modal');
                    break;
                case 'view-estimate':
                    this.estimates_showViewModal(id);
                    break;
                case 'toggle-batch':
                    this.estimates_toggleBatchMode();
                    break;
                case 'toggle-selection':
                    this.estimates_toggleSelection(id);
                    break;
                case 'filter-stat':
                    const filter = target.dataset.filter;
                    this.estimates_instantFilterChange(filter);
                    break;
                case 'batch-change-status':
                    const newStatus = target.value;
                    if (newStatus) {
                        await this.estimates_batchChangeStatus(newStatus);
                        // Reset dropdown
                        target.value = '';
                    }
                    break;
                case 'batch-delete':
                    await this.estimates_batchDelete();
                    break;
            }
        };

        // Search - use input event for real-time filtering
        const searchInput = container.querySelector('#estimatesSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const oldQuery = this.state.searchQuery;
                this.state.searchQuery = e.target.value;
                console.log(`[Estimates] Search: "${oldQuery}" → "${this.state.searchQuery}"`);
                this.estimates_instantFilterChange(); // No filter param = keep current filter
            });

            // Also handle clearing
            searchInput.addEventListener('search', (e) => {
                this.state.searchQuery = '';
                this.estimates_instantFilterChange();
            });
        }

        // Sort
        const sortSelect = container.querySelector('#estimatesSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.state.sortBy = e.target.value;
                console.log(`[Estimates] Sort changed: ${this.state.sortBy}`);
                this.estimates_instantFilterChange();
            });
        }
    },

    /**
     * BATCH MODE TOGGLE (like Goals)
     */
    estimates_toggleBatchMode() {
        this.state.batchMode = !this.state.batchMode;

        if (!this.state.batchMode) {
            this.state.selectedEstimateIds = [];
        }

        const container = document.getElementById(this.state.container);
        if (!container) return;

        const batchBtn = container.querySelector('[data-action="toggle-batch"]');

        // Update limit bar
        const limitBar = document.querySelector('.estimates-limit-bar');
        if (limitBar) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.estimates_renderLimitBar();
            limitBar.outerHTML = tempDiv.firstElementChild.outerHTML;
        }

        // Apply or remove batch mode
        if (this.state.batchMode) {
            this.estimates_applyBatchMode();

            // Update button to Cancel mode
            if (batchBtn) {
                batchBtn.classList.add('active');
                batchBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Cancel (0 selected)
                `;
            }
        } else {
            this.estimates_removeBatchMode();

            // Update button to Edit Multiple mode
            if (batchBtn) {
                batchBtn.classList.remove('active');
                batchBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 11l3 3L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Edit Multiple
                `;
            }
        }
    },

    estimates_applyBatchMode() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const cards = container.querySelectorAll('.estimate-card');
        cards.forEach(card => {
            card.classList.add('batch-mode');
            card.dataset.action = 'toggle-selection';

            const id = card.dataset.id;
            const isSelected = this.state.selectedEstimateIds.includes(id);

            const checkbox = document.createElement('div');
            checkbox.className = 'estimate-card-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" class="estimate-checkbox-input" 
                       ${isSelected ? 'checked' : ''} data-estimate-id="${id}">
                <div class="estimate-checkbox-custom">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            `;
            card.insertBefore(checkbox, card.firstChild);

            if (isSelected) card.classList.add('selected');
        });
    },

    estimates_removeBatchMode() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const cards = container.querySelectorAll('.estimate-card');
        cards.forEach(card => {
            card.classList.remove('batch-mode', 'selected');
            card.dataset.action = 'view-estimate';

            const checkbox = card.querySelector('.estimate-card-checkbox');
            if (checkbox) checkbox.remove();
        });

        const batchActions = container.querySelector('.estimates-batch-actions');
        if (batchActions) batchActions.remove();
    },

    /**
     * Toggle selection
     */
    estimates_toggleSelection(estimateId) {
        const index = this.state.selectedEstimateIds.indexOf(estimateId);

        if (index > -1) {
            this.state.selectedEstimateIds.splice(index, 1);
        } else {
            this.state.selectedEstimateIds.push(estimateId);
        }

        const container = document.getElementById(this.state.container);
        if (!container) return;

        const card = container.querySelector(`.estimate-card[data-id="${estimateId}"]`);
        if (!card) return;

        const isSelected = this.state.selectedEstimateIds.includes(estimateId);

        if (isSelected) {
            card.classList.add('selected');
            const checkbox = card.querySelector('.estimate-checkbox-input');
            if (checkbox) checkbox.checked = true;
        } else {
            card.classList.remove('selected');
            const checkbox = card.querySelector('.estimate-checkbox-input');
            if (checkbox) checkbox.checked = false;
        }

        // Update limit bar
        const limitBar = document.querySelector('.estimates-limit-bar');
        if (limitBar) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.estimates_renderLimitBar();
            limitBar.outerHTML = tempDiv.firstElementChild.outerHTML;
        }

        // Update batch button counter
        const batchBtn = container.querySelector('[data-action="toggle-batch"]');
        if (batchBtn && this.state.batchMode) {
            const selectedCount = this.state.selectedEstimateIds.length;
            batchBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Cancel (${selectedCount} selected)
            `;
        }

        // Update batch actions
        this.estimates_updateBatchActions();
    },

    estimates_updateBatchActions() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const count = this.state.selectedEstimateIds.length;
        const gridSection = container.querySelector('.estimates-grid-section');
        let batchActions = container.querySelector('.estimates-batch-actions');

        if (count > 0) {
            const html = this.estimates_renderBatchActions();

            if (!batchActions) {
                gridSection.insertAdjacentHTML('beforeend', html);
            } else {
                batchActions.outerHTML = html;
            }
        } else {
            if (batchActions) batchActions.remove();
        }
    },

    /**
     * BATCH ACTIONS
     */
    async estimates_batchChangeStatus(newStatus) {
        const count = this.state.selectedEstimateIds.length;
        if (count === 0 || !newStatus) return;

        const confirmed = await this.estimates_showConfirmation({
            title: 'Change Status',
            message: `Are you sure you want to change ${count} estimate${count > 1 ? 's' : ''} to ${this.estimates_formatStatus(newStatus)}?`,
            confirmText: 'Change Status',
            type: 'success'
        });

        if (!confirmed) return;

        try {
            // Build update data
            const updateData = { status: newStatus };

            // Add timestamp fields for specific statuses
            if (newStatus === 'sent') {
                updateData.sent_at = new Date().toISOString();
            }
            if (newStatus === 'accepted') {
                updateData.accepted_at = new Date().toISOString();
            }

            // Batch update in backend
            await API.batchUpdateEstimates(this.state.selectedEstimateIds, updateData);

            // Update local state
            this.state.selectedEstimateIds.forEach(id => {
                const estimate = this.state.estimates.find(e => e.id === id);
                if (estimate) {
                    estimate.status = newStatus;
                }
            });

            // Clear selections and exit batch mode
            this.state.selectedEstimateIds = [];
            this.state.batchMode = false;

            // Instant UI update without reload
            this.estimates_calculateStats();
            this.estimates_instantFilterChange();

            window.SteadyUtils.showToast(`${count} estimate${count > 1 ? 's' : ''} updated to ${this.estimates_formatStatus(newStatus)}`, 'success');
        } catch (error) {
            console.error('Batch change status error:', error);
            window.SteadyUtils.showToast('Failed to update estimates', 'error');
        }
    },

    async estimates_batchDelete() {
        const count = this.state.selectedEstimateIds.length;
        if (count === 0) return;

        const confirmed = await this.estimates_showConfirmation({
            title: 'Delete Estimates',
            message: `Are you sure you want to delete ${count} estimate${count > 1 ? 's' : ''}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            // Batch delete in backend
            await API.batchDeleteEstimates(this.state.selectedEstimateIds);

            // Remove from local state
            this.state.estimates = this.state.estimates.filter(
                e => !this.state.selectedEstimateIds.includes(e.id)
            );

            // Clear selections and exit batch mode
            this.state.selectedEstimateIds = [];
            this.state.batchMode = false;

            // Instant UI update without reload
            this.estimates_calculateStats();
            this.estimates_instantFilterChange();

            // Update limit bar
            const container = document.getElementById(this.state.container);
            if (container) {
                const limitBar = container.querySelector('.estimates-limit-bar');
                if (limitBar) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = this.estimates_renderLimitBar();
                    limitBar.outerHTML = tempDiv.firstElementChild.outerHTML;
                }
            }

            window.SteadyUtils.showToast(`${count} estimate${count > 1 ? 's' : ''} deleted`, 'success');
        } catch (error) {
            console.error('Batch delete error:', error);
            window.SteadyUtils.showToast('Failed to delete estimates', 'error');
        }
    },

    /**
     * Custom styled confirmation modal
     */
    estimates_showConfirmation(options) {
        return new Promise((resolve) => {
            const { title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' } = options;

            const icons = {
                warning: '<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
                danger: '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
                success: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>'
            };

            const colors = {
                warning: '#f59e0b',
                danger: '#ef4444',
                success: '#10b981'
            };

            const overlay = document.createElement('div');
            overlay.className = 'estimate-confirm-overlay';
            overlay.innerHTML = `
                <style>
                    .estimate-confirm-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.6);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10001;
                        animation: fadeIn 0.2s ease;
                    }

                    .estimate-confirm-modal {
                        background: var(--surface);
                        border-radius: 12px;
                        width: 90%;
                        max-width: 480px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        animation: slideUp 0.3s ease;
                    }

                    .estimate-confirm-header {
                        padding: 24px 24px 16px 24px;
                        display: flex;
                        align-items: flex-start;
                        gap: 16px;
                    }

                    .estimate-confirm-icon {
                        flex-shrink: 0;
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: ${colors[type]}15;
                    }

                    .estimate-confirm-icon svg {
                        width: 24px;
                        height: 24px;
                        stroke: ${colors[type]};
                    }

                    .estimate-confirm-content {
                        flex: 1;
                        padding-top: 4px;
                    }

                    .estimate-confirm-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--text-primary);
                        margin: 0 0 8px 0;
                    }

                    .estimate-confirm-message {
                        font-size: 14px;
                        color: var(--text-secondary);
                        line-height: 1.5;
                        margin: 0;
                    }

                    .estimate-confirm-footer {
                        padding: 16px 24px 24px 24px;
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                    }

                    .estimate-confirm-btn {
                        padding: 10px 20px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: none;
                    }

                    .estimate-confirm-btn-cancel {
                        background: transparent;
                        border: 1px solid var(--border);
                        color: var(--text-primary);
                    }

                    .estimate-confirm-btn-cancel:hover {
                        background: var(--surface-hover);
                    }

                    .estimate-confirm-btn-confirm {
                        background: ${colors[type]};
                        color: white;
                    }

                    .estimate-confirm-btn-confirm:hover {
                        opacity: 0.9;
                        transform: translateY(-1px);
                    }
                </style>
                <div class="estimate-confirm-modal">
                    <div class="estimate-confirm-header">
                        <div class="estimate-confirm-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                ${icons[type]}
                            </svg>
                        </div>
                        <div class="estimate-confirm-content">
                            <h3 class="estimate-confirm-title">${title}</h3>
                            <p class="estimate-confirm-message">${message}</p>
                        </div>
                    </div>
                    <div class="estimate-confirm-footer">
                        <button class="estimate-confirm-btn estimate-confirm-btn-cancel" data-action="cancel">
                            ${cancelText}
                        </button>
                        <button class="estimate-confirm-btn estimate-confirm-btn-confirm" data-action="confirm">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const handleConfirm = () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
                resolve(true);
            };

            const handleCancel = () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
                resolve(false);
            };

            overlay.querySelector('[data-action="confirm"]').addEventListener('click', handleConfirm);
            overlay.querySelector('[data-action="cancel"]').addEventListener('click', handleCancel);

            // Close on overlay click - proper mousedown/mouseup pattern to prevent drag-release issues
            let mouseDownTarget = null;

            overlay.addEventListener('mousedown', (e) => {
                mouseDownTarget = e.target;
            });

            overlay.addEventListener('mouseup', (e) => {
                // Only close if both down and up were on the overlay (not modal content)
                if (mouseDownTarget === overlay && e.target === overlay) {
                    handleCancel();
                }
                mouseDownTarget = null;
            });

            // ESC key to cancel
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    },

    /**
     * UTILITIES
     */
    estimates_getExpiryInfo(estimate) {
        if (!estimate.expires_at) return { text: 'No expiration', warning: false };

        const now = new Date();
        const expires = new Date(estimate.expires_at);
        const days = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));

        if (days < 0) return { text: 'Expired', warning: true };
        if (days === 0) return { text: 'Expires today', warning: true };
        if (days <= 7) return { text: `Expires in ${days} day${days > 1 ? 's' : ''}`, warning: true };
        return { text: `Expires in ${days} days`, warning: false };
    },

    estimates_truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    estimates_showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.style.opacity = '0';
            container.innerHTML = `<div style="min-height: 400px;"></div>`;
        }
    },

    estimates_showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `<div style="text-align: center; padding: 60px; color: #ef4444;">${message}</div>`;
        }
    },

    /**
     * STYLES
     */
    estimates_renderStyles() {
        return `<style>
/* ESTIMATES MODULE - Complete Rewrite */

.estimates-container {
    max-width: 1400px;
    margin: 0 auto;
    animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

/* MODAL SYSTEM */
.est-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 2rem;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.est-modal-overlay.show {
    opacity: 1;
}

.est-modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    transform: scale(0.95) translateY(20px);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
}

.est-modal-overlay.show .est-modal {
    transform: scale(1) translateY(0);
}

.est-modal-create-v2 {
    max-width: 650px;
}

/* MODAL HEADER */
.est-modal-header-v2 {
    padding: 2.5rem 2.5rem 1.5rem 2.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.est-modal-title-v2 {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
}

.est-modal-close {
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.est-modal-close svg {
    width: 1.5rem;
    height: 1.5rem;
    stroke: var(--text-secondary);
    stroke-width: 2;
}

.est-modal-close:hover {
    background: var(--surface-hover);
}

.est-modal-close:hover svg {
    stroke: var(--text-primary);
}

/* MODAL BODY */
.est-modal-body-v2 {
    padding: 2.5rem;
    overflow-y: auto;
    flex: 1;
}

/* FORM */
.est-form-v2 {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.est-form-group-v2 {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.est-form-row-v2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
}

.est-form-label-v2 {
    font-weight: 700;
    color: var(--text-primary);
    font-size: 0.95rem;
}

.est-input-hint {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-weight: 500;
}

/* FORM INPUTS */
.est-form-input-large {
    font-size: 1.5rem !important;
    font-weight: 700 !important;
    padding: 1.25rem 1.5rem !important;
    text-align: center;
}

.est-form-input-v2, .est-form-select-v2 {
    padding: 1rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 1rem;
    background: var(--background);
    color: var(--text-primary);
    transition: all 0.2s ease;
    font-weight: 500;
}

.est-form-input-v2:focus, .est-form-select-v2:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    background: var(--background) !important;
}

/* Autocomplete fix */
.est-form-input-v2:-webkit-autofill,
.est-form-input-v2:-webkit-autofill:hover,
.est-form-input-v2:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px var(--background) inset !important;
    -webkit-text-fill-color: var(--text-primary) !important;
    transition: background-color 5000s ease-in-out 0s;
}

.est-form-textarea-v2 {
    width: 100%;
    padding: 1rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 1rem;
    background: var(--background);
    color: var(--text-primary);
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
    transition: all 0.2s ease;
}

.est-form-textarea-v2:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

/* CUSTOM SELECT */
#goalUnit {
    padding: 1rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 1rem;
    background: var(--background);
    color: var(--text-primary);
    transition: all 0.2s ease;
    font-weight: 600;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1.25rem;
    padding-right: 3rem;
}

#goalUnit:hover {
    border-color: var(--primary);
}

#goalUnit:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

/* DIVIDER */
.est-divider {
    height: 1px;
    background: var(--border);
    margin: 1rem 0;
}

/* CHECKBOXES */
.est-checkbox-v2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 1rem;
    background: var(--background);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    transition: border-color 0.2s ease;
}

.est-checkbox-v2:hover {
    border-color: var(--primary);
}

.est-checkbox-v2 input {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
    accent-color: var(--primary);
}

.est-checkbox-label {
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
}

/* MODAL ACTIONS */
.est-modal-actions-v2 {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 1rem;
}

/* BUTTONS IN MODAL */
.est-btn-secondary {
    background: var(--background);
    color: var(--text-primary);
    border: 2px solid var(--border);
    padding: 1rem 1.5rem;
    border-radius: var(--radius-lg);
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s;
}

.est-btn-secondary:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-1px);
}

.est-btn-primary {
    background: var(--gradient-primary);
    color: white;
    border: none;
    padding: 1rem 1.5rem;
    border-radius: var(--radius-lg);
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.est-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.est-btn-primary svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2.5;
}

/* LOADING SPINNER */
.est-spinner {
    width: 1rem;
    height: 1rem;
    animation: estSpin 0.8s linear infinite;
}

@keyframes estSpin {
    to { transform: rotate(360deg); }
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .est-modal-body-v2 {
        padding: 1.5rem;
    }
    
    .est-form-row-v2 {
        grid-template-columns: 1fr;
    }
    
    .est-modal-actions-v2 {
        flex-direction: column-reverse;
    }
    
    .est-btn-primary,
    .est-btn-secondary {
        width: 100%;
        justify-content: center;
    }
}

/* HEADER */
.estimates-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 2rem;
}

.estimates-header-content { flex: 1; }

.estimates-header h1 {
    font-size: 2.5rem;
    font-weight: 900;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.estimates-title-icon {
    width: 2.5rem;
    height: 2.5rem;
}

.estimates-subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0;
}

.estimates-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.estimates-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.estimates-btn-primary svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2.5;
}

/* LIMIT BAR */
.estimates-limit-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    margin-bottom: 1.5rem;
}

.estimates-limit-counter {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
}

.estimates-limit-counter svg {
    color: #667eea;
}

.estimates-btn-batch {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--background);
    color: var(--text-primary);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.3s;
}

.estimates-btn-batch svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 2;
}

.estimates-btn-batch:hover {
    border-color: #667eea;
    color: #667eea;
    transform: translateY(-1px);
}

.estimates-btn-batch.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

/* STATS */
.estimates-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 2.5rem;
}

.estimates-stat-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.estimates-stat-card:hover {
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.estimates-stat-card.active {
    border-color: #667eea;
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
}

.estimates-stat-icon {
    width: 4rem;
    height: 4rem;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.estimates-stat-icon.quoted {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(139, 92, 246, 0.15));
}

.estimates-stat-icon.accepted {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15));
}

.estimates-stat-icon.pending {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15));
}

.estimates-stat-icon svg {
    width: 2rem;
    height: 2rem;
    stroke-width: 2;
}

.estimates-stat-icon.quoted svg { stroke: #667eea; }
.estimates-stat-icon.accepted svg { stroke: #10b981; }
.estimates-stat-icon.pending svg { stroke: #fbbf24; }

.estimates-stat-content { flex: 1; }

.estimates-stat-value {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 0.5rem;
}

.estimates-stat-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* TOOLBAR */
.estimates-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.estimates-toolbar-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
}

.estimates-search {
    position: relative;
    flex: 1;
    max-width: 800px;
}

.estimates-search input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--bg);
    color: var(--text-primary);
    font-size: 0.9rem;
    transition: all 0.2s;
}

.estimates-search input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.estimates-search svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.125rem;
    height: 1.125rem;
    color: var(--text-tertiary);
    pointer-events: none;
}

.estimates-toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.estimates-sort {
    position: relative;
}

.estimates-sort select {
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--bg);
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    appearance: none;
}

.estimates-sort select:hover {
    border-color: #667eea;
}

.estimates-sort select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.estimates-sort svg {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1rem;
    height: 1rem;
    color: var(--text-tertiary);
    pointer-events: none;
}

/* GRID */
.estimates-grid-section {
    min-height: 200px;
}

.estimates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

/* CARDS */
.estimate-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.estimate-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
}

.estimate-card.batch-mode {
    cursor: pointer;
}

.estimate-card.selected {
    border-color: #667eea;
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
}

.estimate-card-checkbox {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 10;
    opacity: 0;
    transform: scale(0.8);
    animation: checkboxFadeIn 0.2s ease forwards;
}

@keyframes checkboxFadeIn {
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.estimate-checkbox-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.estimate-checkbox-custom {
    width: 1.75rem;
    height: 1.75rem;
    border: 2px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    cursor: pointer;
}

.estimate-checkbox-custom svg {
    width: 1rem;
    height: 1rem;
    stroke: white;
    opacity: 0;
    transform: scale(0);
    transition: all 0.2s;
}

.estimate-card.selected .estimate-checkbox-custom {
    background: #667eea;
    border-color: #667eea;
}

.estimate-card.selected .estimate-checkbox-custom svg {
    opacity: 1;
    transform: scale(1);
}

.estimate-card-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.estimate-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
}

.estimate-header-left {
    flex: 1;
    min-width: 0;
}

.estimate-number {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.25rem;
    opacity: 0.8;
}

.estimate-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
}

.estimate-status {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
}

.estimate-status.draft {
    background: rgba(156, 163, 175, 0.15);
    color: #6b7280;
}

.estimate-status.sent {
    background: rgba(102, 126, 234, 0.15);
    color: #667eea;
}

.estimate-status.accepted {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
}

.estimate-status.rejected {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.estimate-status.expired {
    background: rgba(209, 213, 219, 0.15);
    color: #9ca3af;
}

.estimate-status svg {
    width: 0.875rem;
    height: 0.875rem;
}

.estimate-lead {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
}

.estimate-lead svg {
    width: 1rem;
    height: 1rem;
    opacity: 0.6;
}

.estimate-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.estimate-total {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--text-primary);
    line-height: 1;
}

.estimate-photos-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.2);
    border-radius: 6px;
    color: #667eea;
    font-size: 0.8rem;
    font-weight: 600;
}

.estimate-photos-badge svg {
    width: 0.875rem;
    height: 0.875rem;
}

.estimate-expiry {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.estimate-expiry svg {
    width: 0.875rem;
    height: 0.875rem;
}

.estimate-expiry.warning {
    color: #f59e0b;
    font-weight: 600;
}

/* BATCH ACTIONS */
.estimates-batch-actions {
    position: sticky;
    bottom: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    z-index: 100;
}

.estimates-batch-actions-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.estimates-batch-selected {
    font-size: 0.9rem;
    font-weight: 600;
    color: #667eea;
}

.estimates-batch-actions-right {
    display: flex;
    gap: 0.5rem;
}

.estimates-batch-btn {
    padding: 0.625rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.estimates-batch-btn:hover {
    background: rgba(102, 126, 234, 0.1);
    border-color: #667eea;
}

.estimates-batch-btn svg {
    width: 1rem;
    height: 1rem;
}

.estimates-batch-btn.delete {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
}

.estimates-batch-btn.delete:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
}

.estimates-batch-status-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.estimates-batch-status-group label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
}

.estimates-batch-status-select {
    padding: 0.625rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    padding-right: 2.5rem;
    min-width: 180px;
}

.estimates-batch-status-select:hover {
    border-color: #667eea;
    background-color: rgba(102, 126, 234, 0.05);
}

.estimates-batch-status-select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* EMPTY STATE */
.estimates-empty {
    text-align: center;
    padding: 6rem 2rem;
    background: var(--surface);
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
}

.estimates-empty svg {
    width: 5rem;
    height: 5rem;
    color: var(--text-tertiary);
    margin-bottom: 1.5rem;
    opacity: 0.5;
}

.estimates-empty h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.75rem 0;
}

.estimates-empty p {
    color: var(--text-secondary);
    font-size: 1rem;
    margin: 0;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .estimates-header {
        flex-direction: column;
        align-items: stretch;
    }
    
    .estimates-stats {
        grid-template-columns: 1fr;
    }
    
    .estimates-grid {
        grid-template-columns: 1fr;
    }
    
    .estimates-toolbar {
        flex-direction: column;
        align-items: stretch;
    }
    
    .estimates-toolbar-left {
        flex-direction: column;
        align-items: stretch;
    }
    
    .estimates-search {
        max-width: none;
    }
}
</style>`;
    }
};

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('estimates')) {
            EstimatesModule.init();
        }
    });
} else {
    if (window.location.pathname.includes('estimates')) {
        EstimatesModule.init();
    }
}