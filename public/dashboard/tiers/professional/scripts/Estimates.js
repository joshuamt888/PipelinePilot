/**
 * ESTIMATES MODULE
 * Clean rewrite following Goals.js patterns
 */

window.EstimatesModule = {
    // STATE
    state: {
        estimates: [],
        leads: [],
        container: 'estimates-content',

        // Filters
        searchQuery: '',
        sortBy: 'newest',
        activeFilter: 'all', // all, draft, sent, accepted, rejected, expired

        // Batch mode
        batchMode: false,
        selectedEstimateIds: [],

        // Edit mode
        editingEstimateId: null,

        // Stats
        stats: {
            totalQuoted: 0,
            totalAccepted: 0,
            totalPending: 0,
            acceptanceRate: 0,
            draft: 0,
            sent: 0,
            accepted: 0,
            rejected: 0
        },

        // Limits
        estimateLimit: 1000
    },

    // INIT
    async init(targetContainer = 'estimates-content') {
        this.state.container = targetContainer;
        this.estimates_showLoading();

        try {
            await this.estimates_loadData();
            this.estimates_render();
        } catch (error) {
            console.error('Error initializing Estimates:', error);
            this.estimates_showError('Failed to load estimates');
        }
    },

    // LOAD DATA
    async estimates_loadData() {
        const [estimates, leadsData] = await Promise.all([
            API.getEstimates(),
            API.getLeads()
        ]);

        this.state.estimates = Array.isArray(estimates) ? estimates : [];
        this.state.leads = leadsData?.all || [];

        this.estimates_calculateStats();
    },

    // CALCULATE STATS
    estimates_calculateStats() {
        const estimates = this.state.estimates;

        this.state.stats = {
            draft: estimates.filter(e => e.status === 'draft').length,
            sent: estimates.filter(e => e.status === 'sent').length,
            accepted: estimates.filter(e => e.status === 'accepted').length,
            rejected: estimates.filter(e => e.status === 'rejected').length,
            totalQuoted: estimates.reduce((sum, e) => sum + (e.total_price || 0), 0),
            totalAccepted: estimates.filter(e => e.status === 'accepted').reduce((sum, e) => sum + (e.total_price || 0), 0),
            totalPending: estimates.filter(e => e.status === 'sent').reduce((sum, e) => sum + (e.total_price || 0), 0),
            acceptanceRate: 0
        };

        const totalSent = this.state.stats.sent + this.state.stats.accepted + this.state.stats.rejected;
        if (totalSent > 0) {
            this.state.stats.acceptanceRate = Math.round((this.state.stats.accepted / totalSent) * 100);
        }
    },

    // RENDER
    estimates_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const filteredEstimates = this.estimates_getFiltered();

        container.innerHTML = `
            ${this.estimates_renderStyles()}
            <div class="estimates-wrapper">
                ${this.estimates_renderHeader()}
                ${this.estimates_renderLimitBar()}
                ${this.estimates_renderStats()}
                ${this.estimates_renderToolbar()}
                ${this.estimates_renderGrid(filteredEstimates)}
            </div>
        `;

        setTimeout(() => {
            this.estimates_attachEvents();
        }, 0);
    },

    // GET FILTERED ESTIMATES
    estimates_getFiltered() {
        let filtered = [...this.state.estimates];

        // Filter by status
        if (this.state.activeFilter !== 'all') {
            filtered = filtered.filter(e => e.status === this.state.activeFilter);
        }

        // Filter by search
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(e => {
                const title = (e.title || '').toLowerCase();
                const estimateNum = (e.estimate_number || '').toLowerCase();
                return title.includes(query) || estimateNum.includes(query);
            });
        }

        // Sort
        filtered.sort((a, b) => {
            if (this.state.sortBy === 'newest') {
                return new Date(b.created_at) - new Date(a.created_at);
            } else if (this.state.sortBy === 'oldest') {
                return new Date(a.created_at) - new Date(b.created_at);
            } else if (this.state.sortBy === 'price_high') {
                return (b.total_price || 0) - (a.total_price || 0);
            } else if (this.state.sortBy === 'price_low') {
                return (a.total_price || 0) - (b.total_price || 0);
            }
            return 0;
        });

        return filtered;
    },

    // RENDER FUNCTIONS
    estimates_renderHeader() {
        return `
            <div class="estimates-header">
                <div>
                    <h1 class="estimates-title">Estimates</h1>
                    <p class="estimates-subtitle">Manage quotes and proposals</p>
                </div>
                <button class="estimates-btn-create" data-action="create-estimate">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14m-7-7h14" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    New Estimate
                </button>
            </div>
        `;
    },

    estimates_renderLimitBar() {
        const count = this.state.estimates.length;
        const limit = this.state.estimateLimit;
        const percentage = (count / limit) * 100;

        return `
            <div class="estimates-limit-bar">
                <div class="estimates-limit-counter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.125rem; height: 1.125rem;">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2"/>
                    </svg>
                    <span>${count} / ${limit} estimates</span>
                </div>
                <button class="estimates-batch-toggle ${this.state.batchMode ? 'active' : ''}" data-action="toggle-batch">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke-width="2"/>
                    </svg>
                    ${this.state.batchMode ? `Cancel (${this.state.selectedEstimateIds.length} selected)` : 'Select Multiple'}
                </button>
            </div>
        `;
    },

    estimates_renderStats() {
        const stats = this.state.stats;
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
        };

        return `
            <div class="estimates-stats">
                <div class="estimates-stat-card ${this.state.activeFilter === 'all' ? 'active' : ''}" data-action="filter-stat" data-filter="all">
                    <div class="estimates-stat-value">${formatCurrency(stats.totalQuoted)}</div>
                    <div class="estimates-stat-label">Total Quoted</div>
                </div>
                <div class="estimates-stat-card ${this.state.activeFilter === 'accepted' ? 'active' : ''}" data-action="filter-stat" data-filter="accepted">
                    <div class="estimates-stat-value">${formatCurrency(stats.totalAccepted)}</div>
                    <div class="estimates-stat-label">Accepted (${stats.accepted})</div>
                </div>
                <div class="estimates-stat-card ${this.state.activeFilter === 'sent' ? 'active' : ''}" data-action="filter-stat" data-filter="sent">
                    <div class="estimates-stat-value">${formatCurrency(stats.totalPending)}</div>
                    <div class="estimates-stat-label">Pending (${stats.sent})</div>
                </div>
                <div class="estimates-stat-card">
                    <div class="estimates-stat-value">${stats.acceptanceRate}%</div>
                    <div class="estimates-stat-label">Acceptance Rate</div>
                </div>
            </div>
        `;
    },

    estimates_renderToolbar() {
        const filtered = this.estimates_getFiltered();

        return `
            <div class="estimates-toolbar">
                <div class="estimates-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8" stroke-width="2"/>
                        <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <input type="text"
                           placeholder="Search estimates..."
                           value="${this.state.searchQuery}"
                           data-action="search">
                </div>
                <select class="estimates-sort" data-action="sort">
                    <option value="newest" ${this.state.sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
                    <option value="oldest" ${this.state.sortBy === 'oldest' ? 'selected' : ''}>Oldest First</option>
                    <option value="price_high" ${this.state.sortBy === 'price_high' ? 'selected' : ''}>Highest Price</option>
                    <option value="price_low" ${this.state.sortBy === 'price_low' ? 'selected' : ''}>Lowest Price</option>
                </select>
                <div class="estimates-count" id="estimatesCount">${filtered.length} estimate${filtered.length !== 1 ? 's' : ''}</div>
            </div>
            ${this.state.batchMode && this.state.selectedEstimateIds.length > 0 ? `
                <div class="estimates-batch-actions">
                    <div class="estimates-batch-selected">${this.state.selectedEstimateIds.length} selected</div>
                    <div class="estimates-batch-buttons">
                        <button class="estimates-batch-btn" data-action="batch-mark-sent">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>
                            </svg>
                            Mark Sent
                        </button>
                        <button class="estimates-batch-btn" data-action="batch-mark-accepted">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                            </svg>
                            Mark Accepted
                        </button>
                        <button class="estimates-batch-btn delete" data-action="batch-delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            ` : ''}
        `;
    },

    estimates_renderGrid(estimates) {
        if (estimates.length === 0) {
            return `
                <div class="estimates-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2"/>
                    </svg>
                    <h3>No estimates yet</h3>
                    <p>Create your first estimate to get started</p>
                    <button class="estimates-btn-create" data-action="create-estimate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 5v14m-7-7h14" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        New Estimate
                    </button>
                </div>
            `;
        }

        return `
            <div class="estimates-grid">
                ${estimates.map(e => this.estimates_renderCard(e)).join('')}
            </div>
        `;
    },

    estimates_renderCard(estimate) {
        const lead = this.state.leads.find(l => l.id === estimate.lead_id);
        const isSelected = this.state.selectedEstimateIds.includes(estimate.id);
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
        };

        const statusColors = {
            draft: '#6b7280',
            sent: '#3b82f6',
            accepted: '#10b981',
            rejected: '#ef4444',
            expired: '#f59e0b'
        };

        const photoCount = (estimate.photos || []).length;

        return `
            <div class="estimate-card ${this.state.batchMode ? 'batch-mode' : ''} ${isSelected ? 'selected' : ''}"
                 data-id="${estimate.id}"
                 data-action="${this.state.batchMode ? 'toggle-selection' : 'view-estimate'}">

                ${this.state.batchMode ? `
                    <div class="estimate-checkbox">
                        <input type="checkbox"
                               class="estimate-checkbox-input"
                               ${isSelected ? 'checked' : ''}
                               data-action="toggle-selection"
                               data-id="${estimate.id}">
                        <div class="estimate-checkbox-custom">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                ` : ''}

                <div class="estimate-card-header">
                    <div class="estimate-card-title-row">
                        <h3 class="estimate-card-title">${this.estimates_escapeHtml(estimate.title || 'Untitled')}</h3>
                        <span class="estimate-status-badge" style="background: ${statusColors[estimate.status] || '#6b7280'}20; color: ${statusColors[estimate.status] || '#6b7280'}">
                            ${this.estimates_formatStatus(estimate.status)}
                        </span>
                    </div>
                    <p class="estimate-card-number">${estimate.estimate_number || 'No number'}</p>
                </div>

                <div class="estimate-card-body">
                    <div class="estimate-card-lead">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-width="2"/>
                        </svg>
                        ${lead ? lead.name : 'No lead'}
                    </div>

                    ${photoCount > 0 ? `
                        <div class="estimate-card-photos">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                                <path d="M21 15l-5-5L5 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            ${photoCount} photo${photoCount !== 1 ? 's' : ''}
                        </div>
                    ` : ''}

                    <div class="estimate-card-price">
                        ${formatCurrency(estimate.total_price || 0)}
                    </div>
                </div>

                <div class="estimate-card-footer">
                    ${this.state.batchMode ? '' : `
                        <button class="estimate-card-action" data-action="edit-estimate" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                            </svg>
                            Edit
                        </button>
                        ${estimate.status === 'accepted' ? `
                            <button class="estimate-card-action success" data-action="convert-to-job" data-id="${estimate.id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M9 11l3 3L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Convert to Job
                            </button>
                        ` : ''}
                        <button class="estimate-card-action delete" data-action="delete-estimate" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/>
                            </svg>
                            Delete
                        </button>
                    `}
                </div>
            </div>
        `;
    },

    // EVENT HANDLING
    estimates_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Main click handler
        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            // Prevent default for certain actions
            if (action === 'toggle-batch' || action === 'toggle-selection') {
                e.preventDefault();
                e.stopPropagation();
            }

            switch (action) {
                case 'create-estimate':
                    this.estimates_openModal();
                    break;
                case 'edit-estimate':
                    e.stopPropagation();
                    this.estimates_openModal(id);
                    break;
                case 'view-estimate':
                    this.estimates_openDetailView(id);
                    break;
                case 'delete-estimate':
                    e.stopPropagation();
                    await this.estimates_deleteEstimate(id);
                    break;
                case 'convert-to-job':
                    e.stopPropagation();
                    await this.estimates_convertToJob(id);
                    break;
                case 'toggle-batch':
                    this.estimates_toggleBatchMode();
                    break;
                case 'toggle-selection':
                    e.stopPropagation();
                    this.estimates_toggleSelection(id);
                    break;
                case 'filter-stat':
                    const filter = target.dataset.filter;
                    this.state.activeFilter = filter;
                    this.estimates_render();
                    break;
                case 'batch-mark-sent':
                    await this.estimates_batchMarkSent();
                    break;
                case 'batch-mark-accepted':
                    await this.estimates_batchMarkAccepted();
                    break;
                case 'batch-delete':
                    await this.estimates_batchDelete();
                    break;
            }
        };

        // Search input
        const searchInput = container.querySelector('[data-action="search"]');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.state.searchQuery = e.target.value.trim();

                // Update count immediately
                const filtered = this.estimates_getFiltered();
                const countEl = container.querySelector('#estimatesCount');
                if (countEl) {
                    countEl.textContent = `${filtered.length} estimate${filtered.length !== 1 ? 's' : ''}`;
                }

                // Re-render grid
                const gridContainer = container.querySelector('.estimates-grid');
                if (gridContainer) {
                    gridContainer.outerHTML = this.estimates_renderGrid(filtered);
                } else {
                    const emptyContainer = container.querySelector('.estimates-empty');
                    if (emptyContainer) {
                        emptyContainer.outerHTML = this.estimates_renderGrid(filtered);
                    }
                }
            };
        }

        // Sort select
        const sortSelect = container.querySelector('[data-action="sort"]');
        if (sortSelect) {
            sortSelect.onchange = (e) => {
                this.state.sortBy = e.target.value;

                // Re-render grid
                const filtered = this.estimates_getFiltered();
                const gridContainer = container.querySelector('.estimates-grid');
                if (gridContainer) {
                    gridContainer.outerHTML = this.estimates_renderGrid(filtered);
                } else {
                    const emptyContainer = container.querySelector('.estimates-empty');
                    if (emptyContainer) {
                        emptyContainer.outerHTML = this.estimates_renderGrid(filtered);
                    }
                }
            };
        }
    },

    // BATCH MODE
    estimates_toggleBatchMode() {
        this.state.batchMode = !this.state.batchMode;

        if (!this.state.batchMode) {
            this.state.selectedEstimateIds = [];
        }

        const container = document.getElementById(this.state.container);
        if (!container) return;

        const allCards = container.querySelectorAll('.estimate-card');
        const batchBtn = container.querySelector('[data-action="toggle-batch"]');

        if (this.state.batchMode) {
            // ENTER BATCH MODE
            allCards.forEach(card => {
                card.classList.add('batch-mode');
                card.dataset.action = 'toggle-selection';

                const estimateId = card.dataset.id;
                const checkbox = document.createElement('div');
                checkbox.className = 'estimate-checkbox';
                checkbox.innerHTML = `
                    <input type="checkbox"
                           class="estimate-checkbox-input"
                           data-action="toggle-selection"
                           data-id="${estimateId}">
                    <div class="estimate-checkbox-custom">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20 6 9 17 4 12" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                `;
                card.insertBefore(checkbox, card.firstChild);

                // Hide action buttons
                const footer = card.querySelector('.estimate-card-footer');
                if (footer) footer.innerHTML = '';
            });

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
            // EXIT BATCH MODE
            allCards.forEach(card => {
                card.classList.remove('batch-mode', 'selected');
                card.dataset.action = 'view-estimate';

                const checkbox = card.querySelector('.estimate-checkbox');
                if (checkbox) checkbox.remove();
            });

            if (batchBtn) {
                batchBtn.classList.remove('active');
                batchBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke-width="2"/>
                    </svg>
                    Select Multiple
                `;
            }

            // Remove batch actions toolbar
            const batchActions = container.querySelector('.estimates-batch-actions');
            if (batchActions) batchActions.remove();

            // Re-render to restore action buttons
            this.estimates_render();
        }
    },

    estimates_toggleSelection(estimateId) {
        const index = this.state.selectedEstimateIds.indexOf(estimateId);

        if (index > -1) {
            this.state.selectedEstimateIds.splice(index, 1);
        } else {
            this.state.selectedEstimateIds.push(estimateId);
        }

        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Update card visual
        const card = container.querySelector(`.estimate-card[data-id="${estimateId}"]`);
        if (card) {
            const checkbox = card.querySelector('.estimate-checkbox-input');
            if (this.state.selectedEstimateIds.includes(estimateId)) {
                card.classList.add('selected');
                if (checkbox) checkbox.checked = true;
            } else {
                card.classList.remove('selected');
                if (checkbox) checkbox.checked = false;
            }
        }

        // Update batch button text
        const batchBtn = container.querySelector('[data-action="toggle-batch"]');
        if (batchBtn) {
            batchBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Cancel (${this.state.selectedEstimateIds.length} selected)
            `;
        }

        // Update batch actions toolbar
        const toolbar = container.querySelector('.estimates-toolbar');
        const existingBatchActions = container.querySelector('.estimates-batch-actions');

        if (this.state.selectedEstimateIds.length > 0) {
            if (!existingBatchActions) {
                toolbar.insertAdjacentHTML('afterend', `
                    <div class="estimates-batch-actions">
                        <div class="estimates-batch-selected">${this.state.selectedEstimateIds.length} selected</div>
                        <div class="estimates-batch-buttons">
                            <button class="estimates-batch-btn" data-action="batch-mark-sent">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>
                                </svg>
                                Mark Sent
                            </button>
                            <button class="estimates-batch-btn" data-action="batch-mark-accepted">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                                </svg>
                                Mark Accepted
                            </button>
                            <button class="estimates-batch-btn delete" data-action="batch-delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/>
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>
                `);
            } else {
                const selectedDiv = existingBatchActions.querySelector('.estimates-batch-selected');
                if (selectedDiv) {
                    selectedDiv.textContent = `${this.state.selectedEstimateIds.length} selected`;
                }
            }
        } else {
            if (existingBatchActions) {
                existingBatchActions.remove();
            }
        }
    },

    // BATCH OPERATIONS
    async estimates_batchMarkSent() {
        const count = this.state.selectedEstimateIds.length;
        if (count === 0) return;

        const confirmed = await this.estimates_showConfirmation(
            'Mark as Sent',
            `Mark ${count} estimate${count > 1 ? 's' : ''} as sent?`,
            'Confirm'
        );

        if (!confirmed) return;

        try {
            await API.batchUpdateEstimates(this.state.selectedEstimateIds, {
                status: 'sent',
                sent_at: new Date().toISOString()
            });

            window.SteadyUtils.showToast(`${count} estimate${count > 1 ? 's' : ''} marked as sent`, 'success');
            await this.init(this.state.container);
        } catch (error) {
            console.error('Batch mark sent error:', error);
            window.SteadyUtils.showToast('Failed to update estimates', 'error');
        }
    },

    async estimates_batchMarkAccepted() {
        const count = this.state.selectedEstimateIds.length;
        if (count === 0) return;

        const confirmed = await this.estimates_showConfirmation(
            'Mark as Accepted',
            `Mark ${count} estimate${count > 1 ? 's' : ''} as accepted?`,
            'Confirm',
            'success'
        );

        if (!confirmed) return;

        try {
            await API.batchUpdateEstimates(this.state.selectedEstimateIds, {
                status: 'accepted',
                accepted_at: new Date().toISOString()
            });

            window.SteadyUtils.showToast(`${count} estimate${count > 1 ? 's' : ''} marked as accepted`, 'success');
            await this.init(this.state.container);
        } catch (error) {
            console.error('Batch mark accepted error:', error);
            window.SteadyUtils.showToast('Failed to update estimates', 'error');
        }
    },

    async estimates_batchDelete() {
        const count = this.state.selectedEstimateIds.length;
        if (count === 0) return;

        const confirmed = await this.estimates_showConfirmation(
            'Delete Estimates',
            `Permanently delete ${count} estimate${count > 1 ? 's' : ''}? This cannot be undone.`,
            'Delete',
            'danger'
        );

        if (!confirmed) return;

        try {
            await API.batchDeleteEstimates(this.state.selectedEstimateIds);
            window.SteadyUtils.showToast(`${count} estimate${count > 1 ? 's' : ''} deleted`, 'success');
            await this.init(this.state.container);
        } catch (error) {
            console.error('Batch delete error:', error);
            window.SteadyUtils.showToast('Failed to delete estimates', 'error');
        }
    },

    // SINGLE OPERATIONS
    async estimates_deleteEstimate(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) return;

        const confirmed = await this.estimates_showConfirmation(
            'Delete Estimate',
            `Delete estimate "${estimate.title}"? This cannot be undone.`,
            'Delete',
            'danger'
        );

        if (!confirmed) return;

        try {
            await API.deleteEstimate(estimateId);
            window.SteadyUtils.showToast('Estimate deleted', 'success');
            await this.init(this.state.container);
        } catch (error) {
            console.error('Delete error:', error);
            window.SteadyUtils.showToast('Failed to delete estimate', 'error');
        }
    },

    async estimates_convertToJob(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) return;

        if (estimate.status !== 'accepted') {
            window.SteadyUtils.showToast('Only accepted estimates can be converted to jobs', 'warning');
            return;
        }

        const confirmed = await this.estimates_showConfirmation(
            'Convert to Job',
            `Convert "${estimate.title}" to a job? This will create a new job with all estimate details.`,
            'Convert',
            'success'
        );

        if (!confirmed) return;

        try {
            await API.convertEstimateToJob(estimateId);
            window.SteadyUtils.showToast('Job created successfully!', 'success');

            setTimeout(() => {
                window.location.href = '/dashboard/tiers/professional/jobs.html';
            }, 1500);
        } catch (error) {
            console.error('Convert error:', error);
            window.SteadyUtils.showToast('Failed to convert to job', 'error');
        }
    },

    // MODALS
    estimates_openModal(estimateId = null) {
        window.SteadyUtils.showToast('Add/Edit modal coming soon', 'info');
    },

    estimates_openDetailView(estimateId) {
        window.SteadyUtils.showToast('Detail view coming soon', 'info');
    },

    // CONFIRMATION MODAL
    estimates_showConfirmation(title, message, confirmText = 'Confirm', type = 'primary') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'estimate-confirm-overlay';
            overlay.innerHTML = `
                <div class="estimate-confirm-modal">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="estimate-confirm-actions">
                        <button class="estimate-confirm-btn cancel" data-action="cancel">Cancel</button>
                        <button class="estimate-confirm-btn confirm ${type}" data-action="confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            setTimeout(() => overlay.style.opacity = '1', 10);

            overlay.onclick = (e) => {
                const target = e.target.closest('[data-action]');
                if (!target && e.target !== overlay) return;

                const action = target?.dataset.action;
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
                resolve(action === 'confirm');
            };
        });
    },

    // HELPERS
    estimates_formatStatus(status) {
        const labels = {
            draft: 'Draft',
            sent: 'Sent',
            accepted: 'Accepted',
            rejected: 'Rejected',
            expired: 'Expired'
        };
        return labels[status] || status;
    },

    estimates_escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    estimates_showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = '<div style="padding: 60px; text-align: center; color: var(--text-secondary);">Loading estimates...</div>';
        }
    },

    estimates_showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `<div style="padding: 60px; text-align: center; color: var(--danger);">${message}</div>`;
        }
    },

    // STYLES (placeholder - will add full styles)
    estimates_renderStyles() {
        return `
            <style>
                /* Base container */
                .estimates-wrapper {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                /* Header */
                .estimates-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .estimates-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 0.25rem 0;
                }

                .estimates-subtitle {
                    font-size: 1rem;
                    color: var(--text-secondary);
                    margin: 0;
                }

                .estimates-btn-create {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .estimates-btn-create:hover {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                }

                .estimates-btn-create svg {
                    width: 1.25rem;
                    height: 1.25rem;
                }

                /* Limit bar */
                .estimates-limit-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: var(--card-bg);
                    border-radius: 8px;
                    margin-bottom: 1.5rem;
                }

                .estimates-limit-counter {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                }

                .estimates-batch-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1rem;
                    background: transparent;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .estimates-batch-toggle:hover {
                    background: var(--hover);
                    border-color: var(--primary);
                    color: var(--primary);
                }

                .estimates-batch-toggle.active {
                    background: var(--danger);
                    border-color: var(--danger);
                    color: white;
                }

                .estimates-batch-toggle svg {
                    width: 1.125rem;
                    height: 1.125rem;
                }

                /* Stats */
                .estimates-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .estimates-stat-card {
                    padding: 1.5rem;
                    background: var(--card-bg);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 2px solid transparent;
                }

                .estimates-stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .estimates-stat-card.active {
                    border-color: var(--primary);
                    background: linear-gradient(135deg, var(--primary)10, var(--card-bg));
                }

                .estimates-stat-value {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .estimates-stat-label {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                /* Toolbar */
                .estimates-toolbar {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }

                .estimates-search {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .estimates-search svg {
                    position: absolute;
                    left: 1rem;
                    width: 1.25rem;
                    height: 1.25rem;
                    color: var(--text-tertiary);
                }

                .estimates-search input {
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 3rem;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    background: var(--card-bg);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                }

                .estimates-search input:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .estimates-sort {
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    background: var(--card-bg);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                }

                .estimates-count {
                    padding: 0.75rem 1rem;
                    background: var(--card-bg);
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    white-space: nowrap;
                }

                /* Batch actions */
                .estimates-batch-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: linear-gradient(135deg, var(--primary)15, var(--card-bg));
                    border: 2px solid var(--primary);
                    border-radius: 8px;
                    margin-bottom: 1.5rem;
                }

                .estimates-batch-selected {
                    font-weight: 700;
                    color: var(--primary);
                }

                .estimates-batch-buttons {
                    display: flex;
                    gap: 0.5rem;
                }

                .estimates-batch-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1rem;
                    background: white;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .estimates-batch-btn:hover {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }

                .estimates-batch-btn.delete {
                    color: var(--danger);
                }

                .estimates-batch-btn.delete:hover {
                    background: var(--danger);
                    border-color: var(--danger);
                    color: white;
                }

                .estimates-batch-btn svg {
                    width: 1.125rem;
                    height: 1.125rem;
                }

                /* Grid */
                .estimates-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                }

                /* Card */
                .estimate-card {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 2px solid transparent;
                    position: relative;
                }

                .estimate-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                    border-color: var(--primary);
                }

                .estimate-card.selected {
                    border-color: var(--primary);
                    background: linear-gradient(135deg, var(--primary)10, var(--card-bg));
                }

                .estimate-card.batch-mode {
                    padding-left: 3.5rem;
                }

                .estimate-checkbox {
                    position: absolute;
                    left: 1.5rem;
                    top: 1.5rem;
                    z-index: 2;
                }

                .estimate-checkbox-input {
                    position: absolute;
                    opacity: 0;
                    cursor: pointer;
                    width: 1.5rem;
                    height: 1.5rem;
                }

                .estimate-checkbox-custom {
                    width: 1.5rem;
                    height: 1.5rem;
                    border: 2px solid var(--border);
                    border-radius: 4px;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .estimate-checkbox-input:checked + .estimate-checkbox-custom {
                    background: var(--primary);
                    border-color: var(--primary);
                }

                .estimate-checkbox-custom svg {
                    width: 1rem;
                    height: 1rem;
                    stroke: white;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .estimate-checkbox-input:checked + .estimate-checkbox-custom svg {
                    opacity: 1;
                }

                .estimate-card-header {
                    margin-bottom: 1rem;
                }

                .estimate-card-title-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }

                .estimate-card-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .estimate-status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    white-space: nowrap;
                }

                .estimate-card-number {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin: 0;
                    text-transform: uppercase;
                    font-weight: 600;
                }

                .estimate-card-body {
                    margin-bottom: 1rem;
                }

                .estimate-card-lead,
                .estimate-card-photos {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                .estimate-card-lead svg,
                .estimate-card-photos svg {
                    width: 1rem;
                    height: 1rem;
                }

                .estimate-card-price {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--primary);
                }

                .estimate-card-footer {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .estimate-card-action {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.5rem 0.875rem;
                    background: transparent;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .estimate-card-action:hover {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: white;
                }

                .estimate-card-action.success:hover {
                    background: var(--success);
                    border-color: var(--success);
                }

                .estimate-card-action.delete {
                    color: var(--danger);
                }

                .estimate-card-action.delete:hover {
                    background: var(--danger);
                    border-color: var(--danger);
                    color: white;
                }

                .estimate-card-action svg {
                    width: 1rem;
                    height: 1rem;
                }

                /* Empty state */
                .estimates-empty {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--text-secondary);
                }

                .estimates-empty svg {
                    width: 4rem;
                    height: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .estimates-empty h3 {
                    font-size: 1.5rem;
                    color: var(--text-primary);
                    margin: 0 0 0.5rem 0;
                }

                .estimates-empty p {
                    margin: 0 0 1.5rem 0;
                }

                /* Confirmation modal */
                .estimate-confirm-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    opacity: 0;
                    transition: opacity 0.3s;
                }

                .estimate-confirm-modal {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                }

                .estimate-confirm-modal h3 {
                    margin: 0 0 1rem 0;
                    font-size: 1.25rem;
                    color: var(--text-primary);
                }

                .estimate-confirm-modal p {
                    margin: 0 0 1.5rem 0;
                    color: var(--text-secondary);
                }

                .estimate-confirm-actions {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                }

                .estimate-confirm-btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }

                .estimate-confirm-btn.cancel {
                    background: transparent;
                    color: var(--text-secondary);
                    border: 1px solid var(--border);
                }

                .estimate-confirm-btn.cancel:hover {
                    background: var(--hover);
                }

                .estimate-confirm-btn.confirm {
                    background: var(--primary);
                    color: white;
                }

                .estimate-confirm-btn.confirm.success {
                    background: var(--success);
                }

                .estimate-confirm-btn.confirm.danger {
                    background: var(--danger);
                }

                .estimate-confirm-btn.confirm:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
            </style>
        `;
    }
};

// Auto-init on estimates page
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
