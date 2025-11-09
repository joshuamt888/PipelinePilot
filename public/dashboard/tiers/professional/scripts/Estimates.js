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

        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
            this.estimates_attachEvents();
        }, 50);
    },

    /**
     * Instant filter change (no full re-render)
     */
    estimates_instantFilterChange(newFilter) {
        if (this.state.activeFilter === newFilter) return;

        this.state.activeFilter = newFilter;
        this.estimates_applyFilters();

        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Update stats active state
        const statCards = container.querySelectorAll('.estimates-stat-card');
        statCards.forEach(card => {
            if (card.dataset.filter === newFilter) {
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
            </div>
        `;
    },

    estimates_renderStats() {
        const { totalQuoted, totalAccepted, totalPending, acceptanceRate } = this.state.stats;

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
                        <div class="estimates-stat-value">${formatCurrency(totalQuoted)}</div>
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
                        <div class="estimates-stat-value">${formatCurrency(totalAccepted)}</div>
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
                        <div class="estimates-stat-value">${formatCurrency(totalPending)}</div>
                        <div class="estimates-stat-label">Pending</div>
                    </div>
                </div>
            </div>
        `;
    },

    estimates_renderToolbar() {
        return `
            <div class="estimates-toolbar">
                <div class="estimates-toolbar-left">
                    <div class="estimates-count">${this.state.filteredEstimates.length} estimate${this.state.filteredEstimates.length !== 1 ? 's' : ''}</div>
                    <div class="estimates-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="8" stroke-width="2"/>
                            <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <input type="text" id="estimatesSearchInput" placeholder="Search estimates..." 
                               value="${this.state.searchQuery}" autocomplete="off">
                    </div>
                </div>
                <div class="estimates-toolbar-right">
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

estimates_showCreateModal() {
    const modal = document.createElement('div');
    modal.className = 'estimates-modal-overlay';
    modal.innerHTML = `
        <div class="estimates-modal estimates-modal-create-v2">
            <div class="estimates-modal-header-v2">
                <h2 class="estimates-modal-title-v2">Create New Estimate</h2>
                <button class="estimates-modal-close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>
                        <line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>

            <div class="estimates-modal-body-v2">
                <form id="estimateForm" class="estimates-form-v2">
                    <!-- TITLE -->
                    <div class="estimates-form-group-v2">
                        <label class="estimates-form-label-v2">Estimate Title</label>
                        <input type="text" 
                               id="estimateTitle" 
                               class="estimates-form-input-v2 estimates-form-input-large"
                               placeholder="Kitchen Remodel - Smith Residence" 
                               autocomplete="off" 
                               maxlength="100"
                               required>
                        <span class="estimates-input-hint" id="titleCounter">100 characters remaining</span>
                    </div>

                    <div class="estimates-divider"></div>

                    <!-- LEAD SELECTION -->
                    <div class="estimates-form-group-v2">
                        <label class="estimates-form-label-v2">Client / Lead</label>
                        <select id="estimateLead" class="estimates-form-select-v2" required>
                            <option value="">Select a lead...</option>
                            ${this.state.leads.map(lead => `
                                <option value="${lead.id}">${API.escapeHtml(lead.name)}</option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- PRICE & EXPIRY -->
                    <div class="estimates-form-row-v2">
                        <div class="estimates-form-group-v2">
                            <label class="estimates-form-label-v2">Total Price</label>
                            <input type="number" 
                                   id="estimatePrice" 
                                   class="estimates-form-input-v2"
                                   placeholder="5000.00" 
                                   step="0.01" 
                                   min="0"
                                   required>
                            <span class="estimates-input-hint">Enter amount in dollars</span>
                        </div>
                        <div class="estimates-form-group-v2">
                            <label class="estimates-form-label-v2">Expires On (Optional)</label>
                            <input type="date" 
                                   id="estimateExpiry" 
                                   class="estimates-form-input-v2">
                        </div>
                    </div>

                    <div class="estimates-divider"></div>

                    <!-- DESCRIPTION -->
                    <div class="estimates-form-group-v2">
                        <label class="estimates-form-label-v2">Description / Details (Optional)</label>
                        <textarea id="estimateDescription" 
                                  class="estimates-form-textarea-v2"
                                  placeholder="Add project details, scope of work, materials, etc..."
                                  maxlength="2000"
                                  rows="5"></textarea>
                        <span class="estimates-input-hint" id="descriptionCounter">2000 characters remaining</span>
                    </div>

                    <div class="estimates-divider"></div>

                    <!-- STATUS -->
                    <div class="estimates-form-group-v2">
                        <label class="estimates-form-label-v2">Initial Status</label>
                        <select id="estimateStatus" class="estimates-form-select-v2" required>
                            <option value="draft">Draft (not sent yet)</option>
                            <option value="sent">Sent to client</option>
                        </select>
                    </div>

                    <!-- ACTIONS -->
                    <div class="estimates-modal-actions-v2">
                        <button type="button" class="estimates-btn-secondary" data-action="close-modal">
                            Cancel
                        </button>
                        <button type="submit" class="estimates-btn-primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Create Estimate
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fade in animation
    setTimeout(() => modal.classList.add('show'), 10);

    // Character counters
    this.estimates_setupFormCounters(modal);

    // Form submit
    const form = document.getElementById('estimateForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn.disabled) return;

        // Disable button
        submitBtn.disabled = true;
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = `
            <svg class="estimates-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="2" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Creating...
        `;
        submitBtn.style.opacity = '0.6';

        try {
            await this.estimates_createEstimate();
            modal.remove();
        } catch (error) {
            // Re-enable button on error
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
            submitBtn.style.opacity = '1';
        }
    });

    // Modal events
    this.estimates_setupModalEvents(modal);
},

estimates_setupFormCounters(modal) {
    const titleInput = modal.querySelector('#estimateTitle');
    const titleCounter = modal.querySelector('#titleCounter');
    const descInput = modal.querySelector('#estimateDescription');
    const descCounter = modal.querySelector('#descriptionCounter');

    if (titleInput && titleCounter) {
        titleInput.addEventListener('input', () => {
            const remaining = 100 - titleInput.value.length;
            titleCounter.textContent = `${remaining} character${remaining !== 1 ? 's' : ''} remaining`;
            
            if (remaining === 0) {
                titleCounter.style.color = 'var(--danger)';
                titleCounter.style.fontWeight = '700';
            } else if (remaining <= 10) {
                titleCounter.style.color = 'var(--warning)';
                titleCounter.style.fontWeight = '600';
            } else {
                titleCounter.style.color = 'var(--text-tertiary)';
                titleCounter.style.fontWeight = '500';
            }
        });
    }

    if (descInput && descCounter) {
        descInput.addEventListener('input', () => {
            const remaining = 2000 - descInput.value.length;
            descCounter.textContent = `${remaining} character${remaining !== 1 ? 's' : ''} remaining`;
            
            if (remaining === 0) {
                descCounter.style.color = 'var(--danger)';
                descCounter.style.fontWeight = '700';
            } else if (remaining <= 100) {
                descCounter.style.color = 'var(--warning)';
                descCounter.style.fontWeight = '600';
            } else {
                descCounter.style.color = 'var(--text-tertiary)';
                descCounter.style.fontWeight = '500';
            }
        });
    }
},

// 4. ADD MODAL EVENT SETUP
estimates_setupModalEvents(modal) {
    // Close button
    const closeBtn = modal.querySelector('.estimates-modal-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };
    }

    // Cancel button
    modal.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
        btn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };
    });

    // Click outside
    let mouseDownTarget = null;

    modal.addEventListener('mousedown', (e) => {
        mouseDownTarget = e.target;
    });

    modal.addEventListener('mouseup', (e) => {
        if (mouseDownTarget === modal && e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
        mouseDownTarget = null;
    });

    // ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
},

async estimates_createEstimate() {
    try {
        const title = document.getElementById('estimateTitle').value.trim();
        const leadId = document.getElementById('estimateLead').value;
        const price = parseFloat(document.getElementById('estimatePrice').value);
        const expiry = document.getElementById('estimateExpiry').value || null;
        const description = document.getElementById('estimateDescription').value.trim() || null;
        const status = document.getElementById('estimateStatus').value;

        if (!title || !leadId || !price || isNaN(price)) {
            window.SteadyUtils.showToast('Please fill in all required fields', 'error');
            return;
        }

        const estimateData = {
            title: title,
            lead_id: leadId,
            total_price: price,
            expires_at: expiry,
            description: description,
            status: status
        };

        await API.createEstimate(estimateData);

        window.SteadyUtils.showToast('Estimate created successfully!', 'success');

        // Reload
        await this.init(this.state.container);

    } catch (error) {
        console.error('Create estimate error:', error);
        window.SteadyUtils.showToast('Failed to create estimate', 'error');
        throw error;
    }
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
                    console.log('View estimate:', id);
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

        // Search
        const searchInput = container.querySelector('#estimatesSearchInput');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.state.searchQuery = e.target.value;
                this.estimates_instantFilterChange(this.state.activeFilter);
            };
        }

        // Sort
        const sortSelect = container.querySelector('#estimatesSortSelect');
        if (sortSelect) {
            sortSelect.onchange = (e) => {
                this.state.sortBy = e.target.value;
                this.estimates_instantFilterChange(this.state.activeFilter);
            };
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
        } else {
            this.estimates_removeBatchMode();
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
    async estimates_batchMarkSent() {
        const count = this.state.selectedEstimateIds.length;
        if (count === 0) return;

        if (!confirm(`Mark ${count} estimate${count > 1 ? 's' : ''} as sent?`)) return;

        try {
            for (const id of this.state.selectedEstimateIds) {
                await API.markEstimateSent(id);
            }

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

        if (!confirm(`Mark ${count} estimate${count > 1 ? 's' : ''} as accepted?`)) return;

        try {
            for (const id of this.state.selectedEstimateIds) {
                await API.markEstimateAccepted(id);
            }

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

        if (!confirm(`Delete ${count} estimate${count > 1 ? 's' : ''}? This cannot be undone.`)) return;

        try {
            for (const id of this.state.selectedEstimateIds) {
                await API.deleteEstimate(id);
            }

            window.SteadyUtils.showToast(`${count} estimate${count > 1 ? 's' : ''} deleted`, 'success');
            await this.init(this.state.container);
        } catch (error) {
            console.error('Batch delete error:', error);
            window.SteadyUtils.showToast('Failed to delete estimates', 'error');
        }
    },

    /**
     * UTILITIES
     */
    estimates_getExpiryInfo(estimate) {
        if (!estimate.expires_at) return null;

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
.goals-modal-overlay {
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

.goals-modal-overlay.show {
    opacity: 1;
}

.goals-modal {
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

.goals-modal-overlay.show .goals-modal {
    transform: scale(1) translateY(0);
}

.goals-modal-create-v2 {
    max-width: 650px;
}

/* MODAL HEADER */
.goals-modal-header-v2 {
    padding: 2.5rem 2.5rem 1.5rem 2.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.goals-modal-title-v2 {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
}

.goals-modal-close {
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

.goals-modal-close svg {
    width: 1.5rem;
    height: 1.5rem;
    stroke: var(--text-secondary);
    stroke-width: 2;
}

.goals-modal-close:hover {
    background: var(--surface-hover);
}

.goals-modal-close:hover svg {
    stroke: var(--text-primary);
}

/* MODAL BODY */
.goals-modal-body-v2 {
    padding: 2.5rem;
    overflow-y: auto;
    flex: 1;
}

/* FORM */
.goals-form-v2 {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.goals-form-group-v2 {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.goals-form-row-v2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
}

.goals-form-label-v2 {
    font-weight: 700;
    color: var(--text-primary);
    font-size: 0.95rem;
}

.goals-input-hint {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-weight: 500;
}

/* FORM INPUTS */
.goals-form-input-large {
    font-size: 1.5rem !important;
    font-weight: 700 !important;
    padding: 1.25rem 1.5rem !important;
    text-align: center;
}

.goals-form-input-v2, .goals-form-select-v2 {
    padding: 1rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 1rem;
    background: var(--background);
    color: var(--text-primary);
    transition: all 0.2s ease;
    font-weight: 500;
}

.goals-form-input-v2:focus, .goals-form-select-v2:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    background: var(--background) !important;
}

/* Autocomplete fix */
.goals-form-input-v2:-webkit-autofill,
.goals-form-input-v2:-webkit-autofill:hover,
.goals-form-input-v2:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px var(--background) inset !important;
    -webkit-text-fill-color: var(--text-primary) !important;
    transition: background-color 5000s ease-in-out 0s;
}

.goals-form-textarea-v2 {
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

.goals-form-textarea-v2:focus {
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
.goals-divider {
    height: 1px;
    background: var(--border);
    margin: 1rem 0;
}

/* CHECKBOXES */
.goals-checkbox-v2 {
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

.goals-checkbox-v2:hover {
    border-color: var(--primary);
}

.goals-checkbox-v2 input {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
    accent-color: var(--primary);
}

.goals-checkbox-label {
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
}

/* MODAL ACTIONS */
.goals-modal-actions-v2 {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 1rem;
}

/* BUTTONS IN MODAL */
.goals-btn-secondary {
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

.goals-btn-secondary:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-1px);
}

.goals-btn-primary {
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

.goals-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.goals-btn-primary svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2.5;
}

/* LOADING SPINNER */
.goals-spinner {
    width: 1rem;
    height: 1rem;
    animation: goalsSpin 0.8s linear infinite;
}

@keyframes goalsSpin {
    to { transform: rotate(360deg); }
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .goals-modal-body-v2 {
        padding: 1.5rem;
    }
    
    .goals-form-row-v2 {
        grid-template-columns: 1fr;
    }
    
    .goals-modal-actions-v2 {
        flex-direction: column-reverse;
    }
    
    .goals-btn-primary,
    .goals-btn-secondary {
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

.estimates-count {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
}

.estimates-search {
    position: relative;
    flex: 1;
    max-width: 600px;
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