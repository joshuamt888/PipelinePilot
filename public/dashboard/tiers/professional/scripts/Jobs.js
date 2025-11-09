/**
 * JOBS MODULE - Complete Implementation v2.0
 * Track projects, calculate profit, manage workflows
 * Based on Estimates.js peak design with Jobs-specific features
 */

window.JobsModule = {
    // STATE
    state: {
        jobs: [],
        leads: [],
        filteredJobs: [],
        container: 'jobs-content',

        // UI state
        searchQuery: '',
        sortBy: 'date_new',
        activeFilter: 'all', // all, in_progress, completed

        // Batch mode
        batchMode: false,
        selectedJobIds: [],

        // Modal state
        editingJobId: null,

        // Limits
        jobLimit: 1000,

        // Stats
        stats: {
            totalRevenue: 0,
            totalProfit: 0,
            avgMargin: 0
        },

        // Custom job type
        customJobType: '',
        showCustomJobType: false
    },

    STATUSES: ['draft', 'scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled'],
    JOB_TYPES: ['installation', 'repair', 'maintenance', 'inspection', 'consultation', 'emergency', 'custom'],
    PRIORITIES: ['low', 'medium', 'high', 'urgent'],
    PHOTO_TYPES: ['before', 'during', 'after'],

    /**
     * Initialize
     */
    async init(targetContainer = 'jobs-content') {
        this.state.container = targetContainer;
        this.jobs_showLoading();

        try {
            const [jobs, leadsData] = await Promise.all([
                API.getJobs(),
                API.getLeads()
            ]);

            this.state.jobs = Array.isArray(jobs) ? jobs : [];
            this.state.leads = leadsData?.all || [];
            this.state.filteredJobs = this.state.jobs;

            console.log(`[Jobs] Loaded ${this.state.jobs.length} jobs`);

            this.jobs_calculateStats();
            this.jobs_render();
        } catch (error) {
            console.error('Error initializing Jobs:', error);
            this.jobs_showError('Failed to load jobs');
        }
    },

    /**
     * Main render
     */
    jobs_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        this.jobs_applyFilters();

        container.innerHTML = `
            ${this.jobs_renderStyles()}
            <div class="jobs-container">
                ${this.jobs_renderHeader()}
                ${this.jobs_renderLimitBar()}
                ${this.jobs_renderStats()}
                ${this.jobs_renderToolbar()}
                ${this.jobs_renderGrid()}
            </div>
        `;

        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
            this.jobs_attachEvents();
        }, 50);
    },

    /**
     * Instant filter/search change (no full re-render)
     */
    jobs_instantFilterChange(newFilter) {
        if (newFilter !== undefined) {
            this.state.activeFilter = newFilter;
        }

        this.jobs_applyFilters();

        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Update stats active state
        const statCards = container.querySelectorAll('.jobs-stat-card');
        statCards.forEach(card => {
            if (card.dataset.filter === this.state.activeFilter) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Update grid
        const gridSection = container.querySelector('.jobs-grid-section');
        if (gridSection) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.jobs_renderGrid();
            gridSection.outerHTML = tempDiv.firstElementChild.outerHTML;

            // Re-apply batch mode if active
            if (this.state.batchMode) {
                this.jobs_applyBatchMode();
            }
        }

        console.log(`[Jobs] Filtered: ${this.state.filteredJobs.length} results (search: "${this.state.searchQuery}")`);
    },

    /**
     * Apply filters
     */
    jobs_applyFilters() {
        let filtered = [...this.state.jobs];

        // Filter by status
        if (this.state.activeFilter === 'in_progress') {
            filtered = filtered.filter(j => j.status === 'in_progress');
        } else if (this.state.activeFilter === 'completed') {
            filtered = filtered.filter(j => j.status === 'completed' || j.status === 'invoiced' || j.status === 'paid');
        }

        // Search
        if (this.state.searchQuery.trim()) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(j => {
                const title = (j.title || '').toLowerCase();
                const jobType = (j.job_type || '').toLowerCase();
                const lead = this.state.leads.find(l => l.id === j.lead_id);
                const leadName = lead ? (lead.name || '').toLowerCase() : '';

                return title.includes(query) || jobType.includes(query) || leadName.includes(query);
            });
        }

        // Sort
        filtered.sort((a, b) => {
            switch (this.state.sortBy) {
                case 'date_new': return new Date(b.created_at) - new Date(a.created_at);
                case 'date_old': return new Date(a.created_at) - new Date(b.created_at);
                case 'profit_high': return (b.profit || 0) - (a.profit || 0);
                case 'profit_low': return (a.profit || 0) - (b.profit || 0);
                default: return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        this.state.filteredJobs = filtered;
    },

    /**
     * Calculate stats
     */
    jobs_calculateStats() {
        const all = this.state.jobs;
        const totalRevenue = all.reduce((sum, j) => sum + (j.final_price || j.quoted_price || 0), 0);
        const totalProfit = all.reduce((sum, j) => sum + (j.profit || 0), 0);
        const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

        this.state.stats = { totalRevenue, totalProfit, avgMargin };
    },

    /**
     * RENDER FUNCTIONS
     */
    jobs_renderHeader() {
        return `
            <div class="jobs-header">
                <div class="jobs-header-content">
                    <h1>
                        <svg class="jobs-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke-width="2"/>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke-width="2"/>
                            <line x1="12" y1="22.08" x2="12" y2="12" stroke-width="2"/>
                        </svg>
                        Jobs
                    </h1>
                    <p class="jobs-subtitle">Track projects, calculate profit, and manage workflows</p>
                </div>
                <button class="jobs-btn-primary" data-action="new-job">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    New Job
                </button>
            </div>
        `;
    },

    jobs_renderLimitBar() {
        const total = this.state.jobs.length;

        return `
            <div class="jobs-limit-bar">
                <div class="jobs-limit-counter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.125rem; height: 1.125rem;">
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke-width="2"/>
                    </svg>
                    <span>${total} / ${this.state.jobLimit} jobs</span>
                </div>
            </div>
        `;
    },

    jobs_renderStats() {
        const { totalRevenue, totalProfit, avgMargin } = this.state.stats;

        return `
            <div class="jobs-stats">
                <div class="jobs-stat-card ${this.state.activeFilter === 'all' ? 'active' : ''}"
                     data-filter="all" data-action="filter-stat">
                    <div class="jobs-stat-icon revenue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="12" y1="1" x2="12" y2="23" stroke-width="2" stroke-linecap="round"/>
                            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="jobs-stat-content">
                        <div class="jobs-stat-value">${formatCurrency(totalRevenue)}</div>
                        <div class="jobs-stat-label">Total Revenue</div>
                    </div>
                </div>

                <div class="jobs-stat-card ${this.state.activeFilter === 'in_progress' ? 'active' : ''}"
                     data-filter="in_progress" data-action="filter-stat">
                    <div class="jobs-stat-icon profit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="jobs-stat-content">
                        <div class="jobs-stat-value">${formatCurrency(totalProfit)}</div>
                        <div class="jobs-stat-label">Total Profit</div>
                    </div>
                </div>

                <div class="jobs-stat-card ${this.state.activeFilter === 'completed' ? 'active' : ''}"
                     data-filter="completed" data-action="filter-stat">
                    <div class="jobs-stat-icon margin">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="17 6 23 6 23 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="jobs-stat-content">
                        <div class="jobs-stat-value">${avgMargin}%</div>
                        <div class="jobs-stat-label">Avg Margin</div>
                    </div>
                </div>
            </div>
        `;
    },

    jobs_renderToolbar() {
        return `
            <div class="jobs-toolbar">
                <div class="jobs-toolbar-left">
                    <div class="jobs-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="8" stroke-width="2"/>
                            <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <input type="search" id="jobsSearchInput" placeholder="Search by title, client, or job type..."
                               value="${this.state.searchQuery}" autocomplete="off">
                    </div>
                </div>
                <div class="jobs-toolbar-right">
                    <button class="jobs-btn-batch ${this.state.batchMode ? 'active' : ''}" data-action="toggle-batch">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            ${this.state.batchMode ? `
                                <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            ` : `
                                <path d="M9 11l3 3L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            `}
                        </svg>
                        ${this.state.batchMode ? `Cancel (${this.state.selectedJobIds.length} selected)` : 'Edit Multiple'}
                    </button>
                    <div class="jobs-sort">
                        <select id="jobsSortSelect">
                            <option value="date_new" ${this.state.sortBy === 'date_new' ? 'selected' : ''}>Date: Newest First</option>
                            <option value="date_old" ${this.state.sortBy === 'date_old' ? 'selected' : ''}>Date: Oldest First</option>
                            <option value="profit_high" ${this.state.sortBy === 'profit_high' ? 'selected' : ''}>Profit: High → Low</option>
                            <option value="profit_low" ${this.state.sortBy === 'profit_low' ? 'selected' : ''}>Profit: Low → High</option>
                        </select>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    },

    jobs_renderGrid() {
        if (this.state.filteredJobs.length === 0) {
            return `
                <div class="jobs-grid-section">
                    <div class="jobs-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke-width="2"/>
                        </svg>
                        <h3>No jobs found</h3>
                        <p>Create your first job to start tracking projects</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="jobs-grid-section">
                <div class="jobs-grid">
                    ${this.state.filteredJobs.map(j => this.jobs_renderCard(j)).join('')}
                </div>
                ${this.state.batchMode && this.state.selectedJobIds.length > 0 ? this.jobs_renderBatchActions() : ''}
            </div>
        `;
    },

    jobs_renderCard(job) {
        const lead = this.state.leads.find(l => l.id === job.lead_id);
        const photoCount = (job.photos || []).length;
        const isSelected = this.state.selectedJobIds.includes(job.id);

        const scheduledInfo = this.jobs_getScheduledInfo(job);
        const revenue = job.final_price || job.quoted_price || 0;
        const profit = job.profit || 0;
        const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

        return `
            <div class="job-card ${this.state.batchMode ? 'batch-mode' : ''} ${isSelected ? 'selected' : ''}"
                 data-action="${this.state.batchMode ? 'toggle-selection' : 'view-job'}"
                 data-id="${job.id}">

                ${this.state.batchMode ? `
                    <div class="job-card-checkbox">
                        <input type="checkbox" class="job-checkbox-input"
                               ${isSelected ? 'checked' : ''} data-job-id="${job.id}">
                        <div class="job-checkbox-custom">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                ` : ''}

                <div class="job-card-content">
                    <div class="job-card-header">
                        <div class="job-header-left">
                            <div class="job-number">${job.invoice_number || 'JOB-' + (job.id || '').substring(0, 8)}</div>
                            <h3 class="job-title">${this.jobs_truncate(job.title || 'Untitled', 50)}</h3>
                        </div>
                        ${this.jobs_renderStatusBadge(job.status)}
                    </div>

                    ${lead ? `
                        <div class="job-lead">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-width="2"/>
                            </svg>
                            ${this.jobs_truncate(lead.name, 35)}
                        </div>
                    ` : ''}

                    ${scheduledInfo ? `
                        <div class="job-scheduled">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                                <line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/>
                                <line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/>
                                <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
                            </svg>
                            ${scheduledInfo}
                        </div>
                    ` : ''}

                    <div class="job-card-financials">
                        ${revenue > 0 ? `
                            <div class="job-financial-item">
                                <span class="job-financial-label">Revenue</span>
                                <span class="job-financial-value">${formatCurrency(revenue)}</span>
                            </div>
                        ` : ''}
                        ${profit > 0 ? `
                            <div class="job-financial-item">
                                <span class="job-financial-label">Profit</span>
                                <span class="job-financial-value profit">${formatCurrency(profit)}</span>
                            </div>
                        ` : ''}
                        ${margin > 0 ? `
                            <div class="job-financial-item">
                                <span class="job-financial-label">Margin</span>
                                <span class="job-financial-value margin">${margin}%</span>
                            </div>
                        ` : ''}
                        ${job.deposit_amount > 0 ? `
                            <div class="job-deposit-badge ${job.deposit_paid ? 'paid' : ''}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                Deposit ${job.deposit_paid ? '✓' : formatCurrency(job.deposit_amount)}
                            </div>
                        ` : ''}
                    </div>

                    ${photoCount > 0 ? `
                        <div class="job-photos-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <path d="M21 15l-5-5L5 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            ${photoCount} photo${photoCount > 1 ? 's' : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    jobs_renderStatusBadge(status) {
        const icons = {
            draft: '<path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" stroke-width="2"/><path d="M18 2l-8 8v4h4l8-8-4-4z" stroke-width="2"/>',
            scheduled: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>',
            in_progress: '<circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2" stroke-linecap="round"/>',
            completed: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke-width="2"/><polyline points="22 4 12 14.01 9 11.01" stroke-width="2"/>',
            invoiced: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-width="2"/><polyline points="14 2 14 8 20 8" stroke-width="2"/><line x1="16" y1="13" x2="8" y2="13" stroke-width="2"/><line x1="16" y1="17" x2="8" y2="17" stroke-width="2"/><polyline points="10 9 9 9 8 9" stroke-width="2"/>',
            paid: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>',
            cancelled: '<circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke-width="2"/>'
        };

        return `
            <div class="job-status ${status}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    ${icons[status] || icons.draft}
                </svg>
                ${this.jobs_formatStatus(status)}
            </div>
        `;
    },

    jobs_renderBatchActions() {
        const count = this.state.selectedJobIds.length;

        return `
            <div class="jobs-batch-actions">
                <div class="jobs-batch-actions-left">
                    <div class="jobs-batch-selected">${count} selected</div>
                </div>
                <div class="jobs-batch-actions-right">
                    <button class="jobs-batch-btn" data-action="batch-mark-complete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke-width="2"/><polyline points="22 4 12 14.01 9 11.01" stroke-width="2"/>
                        </svg>
                        Mark Complete
                    </button>
                    <button class="jobs-batch-btn" data-action="batch-mark-paid">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                        </svg>
                        Mark Paid
                    </button>
                    <button class="jobs-batch-btn delete" data-action="batch-delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * EVENT HANDLING
     */
    jobs_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // SINGLE CLICK HANDLER
        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            switch (action) {
                case 'new-job':
                    this.jobs_showCreateModal();
                    break;
                case 'view-job':
                    this.jobs_showViewModal(id);
                    break;
                case 'toggle-batch':
                    this.jobs_toggleBatchMode();
                    break;
                case 'toggle-selection':
                    this.jobs_toggleSelection(id);
                    break;
                case 'filter-stat':
                    const filter = target.dataset.filter;
                    this.jobs_instantFilterChange(filter);
                    break;
                case 'batch-mark-complete':
                    await this.jobs_batchMarkComplete();
                    break;
                case 'batch-mark-paid':
                    await this.jobs_batchMarkPaid();
                    break;
                case 'batch-delete':
                    await this.jobs_batchDelete();
                    break;
            }
        };

        // Search
        const searchInput = container.querySelector('#jobsSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.searchQuery = e.target.value;
                this.jobs_instantFilterChange();
            });

            searchInput.addEventListener('search', (e) => {
                this.state.searchQuery = '';
                this.jobs_instantFilterChange();
            });
        }

        // Sort
        const sortSelect = container.querySelector('#jobsSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.state.sortBy = e.target.value;
                this.jobs_instantFilterChange();
            });
        }
    },

    /**
     * BATCH MODE
     */
    jobs_toggleBatchMode() {
        this.state.batchMode = !this.state.batchMode;

        if (!this.state.batchMode) {
            this.state.selectedJobIds = [];
        }

        // Update limit bar
        const limitBar = document.querySelector('.jobs-limit-bar');
        if (limitBar) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.jobs_renderLimitBar();
            limitBar.outerHTML = tempDiv.firstElementChild.outerHTML;
        }

        // Apply or remove batch mode
        if (this.state.batchMode) {
            this.jobs_applyBatchMode();
        } else {
            this.jobs_removeBatchMode();
        }
    },

    jobs_applyBatchMode() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const cards = container.querySelectorAll('.job-card');
        cards.forEach(card => {
            card.classList.add('batch-mode');
            card.dataset.action = 'toggle-selection';

            const id = card.dataset.id;
            const isSelected = this.state.selectedJobIds.includes(id);

            const checkbox = document.createElement('div');
            checkbox.className = 'job-card-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" class="job-checkbox-input"
                       ${isSelected ? 'checked' : ''} data-job-id="${id}">
                <div class="job-checkbox-custom">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            `;
            card.insertBefore(checkbox, card.firstChild);

            if (isSelected) card.classList.add('selected');
        });
    },

    jobs_removeBatchMode() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const cards = container.querySelectorAll('.job-card');
        cards.forEach(card => {
            card.classList.remove('batch-mode', 'selected');
            card.dataset.action = 'view-job';

            const checkbox = card.querySelector('.job-card-checkbox');
            if (checkbox) checkbox.remove();
        });

        const batchActions = container.querySelector('.jobs-batch-actions');
        if (batchActions) batchActions.remove();
    },

    jobs_toggleSelection(jobId) {
        const index = this.state.selectedJobIds.indexOf(jobId);

        if (index > -1) {
            this.state.selectedJobIds.splice(index, 1);
        } else {
            this.state.selectedJobIds.push(jobId);
        }

        const container = document.getElementById(this.state.container);
        if (!container) return;

        const card = container.querySelector(`.job-card[data-id="${jobId}"]`);
        if (!card) return;

        const isSelected = this.state.selectedJobIds.includes(jobId);

        if (isSelected) {
            card.classList.add('selected');
            const checkbox = card.querySelector('.job-checkbox-input');
            if (checkbox) checkbox.checked = true;
        } else {
            card.classList.remove('selected');
            const checkbox = card.querySelector('.job-checkbox-input');
            if (checkbox) checkbox.checked = false;
        }

        // Update limit bar
        const limitBar = document.querySelector('.jobs-limit-bar');
        if (limitBar) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.jobs_renderLimitBar();
            limitBar.outerHTML = tempDiv.firstElementChild.outerHTML;
        }

        // Update batch actions
        this.jobs_updateBatchActions();
    },

    jobs_updateBatchActions() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const count = this.state.selectedJobIds.length;
        const gridSection = container.querySelector('.jobs-grid-section');
        let batchActions = container.querySelector('.jobs-batch-actions');

        if (count > 0) {
            const html = this.jobs_renderBatchActions();

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
    async jobs_batchMarkComplete() {
        const count = this.state.selectedJobIds.length;
        if (count === 0) return;

        const confirmed = await this.jobs_showConfirmation({
            title: 'Mark as Complete',
            message: `Are you sure you want to mark ${count} job${count > 1 ? 's' : ''} as complete?`,
            confirmText: 'Mark Complete',
            type: 'success'
        });

        if (!confirmed) return;

        try {
            await API.batchUpdateJobs(this.state.selectedJobIds, {
                status: 'completed',
                completed_at: new Date().toISOString()
            });

            // Update local state
            this.state.selectedJobIds.forEach(id => {
                const job = this.state.jobs.find(j => j.id === id);
                if (job) {
                    job.status = 'completed';
                }
            });

            // Clear selections and exit batch mode
            this.state.selectedJobIds = [];
            this.state.batchMode = false;

            this.jobs_calculateStats();
            this.jobs_instantFilterChange();

            window.SteadyUtils.showToast(`${count} job${count > 1 ? 's' : ''} marked as complete`, 'success');
        } catch (error) {
            console.error('Batch mark complete error:', error);
            window.SteadyUtils.showToast('Failed to update jobs', 'error');
        }
    },

    async jobs_batchMarkPaid() {
        const count = this.state.selectedJobIds.length;
        if (count === 0) return;

        const confirmed = await this.jobs_showConfirmation({
            title: 'Mark as Paid',
            message: `Are you sure you want to mark ${count} job${count > 1 ? 's' : ''} as paid?`,
            confirmText: 'Mark Paid',
            type: 'success'
        });

        if (!confirmed) return;

        try {
            await API.batchUpdateJobs(this.state.selectedJobIds, {
                status: 'paid',
                payment_status: 'paid'
            });

            // Update local state
            this.state.selectedJobIds.forEach(id => {
                const job = this.state.jobs.find(j => j.id === id);
                if (job) {
                    job.status = 'paid';
                    job.payment_status = 'paid';
                }
            });

            // Clear selections and exit batch mode
            this.state.selectedJobIds = [];
            this.state.batchMode = false;

            this.jobs_calculateStats();
            this.jobs_instantFilterChange();

            window.SteadyUtils.showToast(`${count} job${count > 1 ? 's' : ''} marked as paid`, 'success');
        } catch (error) {
            console.error('Batch mark paid error:', error);
            window.SteadyUtils.showToast('Failed to update jobs', 'error');
        }
    },

    async jobs_batchDelete() {
        const count = this.state.selectedJobIds.length;
        if (count === 0) return;

        const confirmed = await this.jobs_showConfirmation({
            title: 'Delete Jobs',
            message: `Are you sure you want to delete ${count} job${count > 1 ? 's' : ''}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            await API.batchDeleteJobs(this.state.selectedJobIds);

            // Remove from local state
            this.state.jobs = this.state.jobs.filter(
                j => !this.state.selectedJobIds.includes(j.id)
            );

            // Clear selections and exit batch mode
            this.state.selectedJobIds = [];
            this.state.batchMode = false;

            this.jobs_calculateStats();
            this.jobs_instantFilterChange();

            window.SteadyUtils.showToast(`${count} job${count > 1 ? 's' : ''} deleted`, 'success');
        } catch (error) {
            console.error('Batch delete error:', error);
            window.SteadyUtils.showToast('Failed to delete jobs', 'error');
        }
    },

    /**
     * UTILITIES
     */
    jobs_getScheduledInfo(job) {
        if (!job.scheduled_date) return null;

        const date = new Date(job.scheduled_date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (job.scheduled_time) {
            const [hours, minutes] = job.scheduled_time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${dateStr} ${displayHour}:${minutes} ${ampm}`;
        }

        return dateStr;
    },

    jobs_formatStatus(status) {
        const statusMap = {
            'draft': 'Draft',
            'scheduled': 'Scheduled',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'invoiced': 'Invoiced',
            'paid': 'Paid',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    },

    jobs_truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    jobs_showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.style.opacity = '0';
            container.innerHTML = `<div style="min-height: 400px;"></div>`;
        }
    },

    jobs_showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `<div style="text-align: center; padding: 60px; color: #ef4444;">${message}</div>`;
        }
    },

    /**
     * MODAL: Create/Edit Job
     */
    jobs_showCreateModal(jobId = null) {
        this.state.editingJobId = jobId;
        const job = jobId ? this.state.jobs.find(j => j.id === jobId) : null;

        // Initialize modal state
        this.state.modalState = {
            materials: job?.materials || [],
            crew: job?.crew_members || [],
            photos: job?.photos || [],
            collapsedSections: {
                materials: true,
                crew: true,
                photos: true,
                notes: true
            }
        };

        const overlay = document.createElement('div');
        overlay.className = 'job-modal-overlay';
        overlay.id = 'jobModalOverlay';
        overlay.innerHTML = this.jobs_renderModal(job);

        document.body.appendChild(overlay);

        // Attach events
        setTimeout(() => {
            this.jobs_attachModalEvents();
            this.jobs_updateProfitCalculator();
        }, 50);
    },

    jobs_renderModal(job) {
        const isEdit = !!job;

        return `
            <style>
                .job-modal-overlay {
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
                    overflow-y: auto;
                    padding: 2rem;
                }

                .job-modal {
                    background: var(--surface);
                    border-radius: 12px;
                    width: 100%;
                    max-width: 900px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideUp 0.3s ease;
                    margin: auto;
                }

                .job-modal-header {
                    padding: 1.5rem 2rem;
                    border-bottom: 2px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .job-modal-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .job-modal-close {
                    width: 2rem;
                    height: 2rem;
                    border-radius: 6px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .job-modal-close:hover {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                }

                .job-modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 2rem;
                }

                .job-form-section {
                    margin-bottom: 2rem;
                }

                .job-form-section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 2px solid var(--border);
                }

                .job-form-section-header h3 {
                    margin: 0;
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .job-form-section-toggle {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }

                .job-form-section-toggle:hover {
                    color: #667eea;
                }

                .job-form-section-toggle svg {
                    width: 1rem;
                    height: 1rem;
                    transition: transform 0.2s;
                }

                .job-form-section-toggle.collapsed svg {
                    transform: rotate(-90deg);
                }

                .job-form-section-content {
                    display: block;
                }

                .job-form-section-content.collapsed {
                    display: none;
                }

                .job-form-row {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .job-form-row.single {
                    grid-template-columns: 1fr;
                }

                .job-form-row.triple {
                    grid-template-columns: repeat(3, 1fr);
                }

                .job-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .job-form-group label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .job-form-group label .required {
                    color: #ef4444;
                }

                .job-form-group input,
                .job-form-group select,
                .job-form-group textarea {
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    background: var(--bg);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }

                .job-form-group input:focus,
                .job-form-group select:focus,
                .job-form-group textarea:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .job-form-group textarea {
                    resize: vertical;
                    min-height: 100px;
                    font-family: inherit;
                }

                .job-form-group input[type="checkbox"] {
                    width: auto;
                    cursor: pointer;
                }

                .job-custom-type-input {
                    display: none;
                    animation: slideDown 0.2s ease;
                }

                .job-custom-type-input.show {
                    display: block;
                }

                .job-char-counter {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    text-align: right;
                }

                /* Materials/Crew Table */
                .job-dynamic-table {
                    width: 100%;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    overflow: hidden;
                }

                .job-dynamic-table-header {
                    display: grid;
                    background: var(--surface-hover);
                    padding: 0.75rem;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .job-materials-header {
                    grid-template-columns: 2fr 0.8fr 0.8fr 1fr 1.5fr 1fr 0.5fr;
                    gap: 0.5rem;
                }

                .job-crew-header {
                    grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 0.5fr;
                    gap: 0.5rem;
                }

                .job-dynamic-row {
                    display: grid;
                    padding: 0.75rem;
                    border-top: 1px solid var(--border);
                    gap: 0.5rem;
                    align-items: center;
                }

                .job-materials-row {
                    grid-template-columns: 2fr 0.8fr 0.8fr 1fr 1.5fr 1fr 0.5fr;
                }

                .job-crew-row {
                    grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 0.5fr;
                }

                .job-dynamic-row input {
                    padding: 0.5rem;
                    border: 1px solid var(--border);
                    border-radius: 4px;
                    background: var(--bg);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                }

                .job-dynamic-row input:focus {
                    outline: none;
                    border-color: #667eea;
                }

                .job-row-total {
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .job-row-delete {
                    background: none;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    padding: 0.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .job-row-delete:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 4px;
                }

                .job-row-delete svg {
                    width: 1rem;
                    height: 1rem;
                }

                .job-add-row-btn {
                    margin-top: 1rem;
                    padding: 0.75rem 1rem;
                    border: 2px dashed var(--border);
                    border-radius: 8px;
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                    width: 100%;
                }

                .job-add-row-btn:hover {
                    border-color: #667eea;
                    color: #667eea;
                    background: rgba(102, 126, 234, 0.05);
                }

                .job-add-row-btn svg {
                    width: 1rem;
                    height: 1rem;
                }

                .job-table-total {
                    margin-top: 1rem;
                    padding: 1rem;
                    background: var(--surface-hover);
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 700;
                }

                .job-table-total-label {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .job-table-total-value {
                    color: var(--text-primary);
                    font-size: 1.25rem;
                }

                /* Photos */
                .job-photos-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                }

                .job-photo-upload {
                    aspect-ratio: 1;
                    border: 2px dashed var(--border);
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }

                .job-photo-upload:hover {
                    border-color: #667eea;
                    background: rgba(102, 126, 234, 0.05);
                }

                .job-photo-upload input {
                    position: absolute;
                    opacity: 0;
                    width: 100%;
                    height: 100%;
                    cursor: pointer;
                }

                .job-photo-upload svg {
                    width: 2rem;
                    height: 2rem;
                    color: var(--text-tertiary);
                }

                .job-photo-upload-text {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                .job-photo-preview {
                    aspect-ratio: 1;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    position: relative;
                    overflow: hidden;
                }

                .job-photo-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .job-photo-preview-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.7) 100%);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 0.5rem;
                }

                .job-photo-type {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: white;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .job-photo-delete {
                    background: rgba(239, 68, 68, 0.9);
                    border: none;
                    color: white;
                    padding: 0.5rem;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    align-self: flex-end;
                }

                .job-photo-delete svg {
                    width: 1rem;
                    height: 1rem;
                }

                /* Profit Calculator */
                .job-profit-calculator {
                    margin-top: 2rem;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(139, 92, 246, 0.1));
                    border: 2px solid rgba(102, 126, 234, 0.3);
                    border-radius: 12px;
                }

                .job-profit-calculator-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .job-profit-calculator-header svg {
                    width: 1.5rem;
                    height: 1.5rem;
                    color: #667eea;
                }

                .job-profit-calculator-header h4 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .job-profit-breakdown {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .job-profit-line {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.9rem;
                }

                .job-profit-line-label {
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .job-profit-line-value {
                    color: var(--text-primary);
                    font-weight: 700;
                }

                .job-profit-line.indent {
                    padding-left: 1.5rem;
                    font-size: 0.85rem;
                }

                .job-profit-line.indent .job-profit-line-label {
                    color: var(--text-tertiary);
                }

                .job-profit-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 0.5rem 0;
                }

                .job-profit-total {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: var(--surface);
                    border-radius: 8px;
                    margin-top: 0.5rem;
                }

                .job-profit-total-label {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .job-profit-total-value {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .job-profit-amount {
                    font-size: 1.5rem;
                    font-weight: 900;
                }

                .job-profit-amount.positive {
                    color: #10b981;
                }

                .job-profit-amount.negative {
                    color: #ef4444;
                }

                .job-profit-margin {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                }

                .job-modal-footer {
                    padding: 1.5rem 2rem;
                    border-top: 2px solid var(--border);
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }

                .job-modal-btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }

                .job-modal-btn-cancel {
                    background: transparent;
                    border: 2px solid var(--border);
                    color: var(--text-primary);
                }

                .job-modal-btn-cancel:hover {
                    background: var(--surface-hover);
                }

                .job-modal-btn-save {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .job-modal-btn-save:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
                }

                @media (max-width: 768px) {
                    .job-modal {
                        max-width: 100%;
                        max-height: 100vh;
                        border-radius: 0;
                    }

                    .job-form-row {
                        grid-template-columns: 1fr;
                    }

                    .job-form-row.triple {
                        grid-template-columns: 1fr;
                    }

                    .job-materials-header,
                    .job-materials-row {
                        grid-template-columns: 1fr;
                    }

                    .job-crew-header,
                    .job-crew-row {
                        grid-template-columns: 1fr;
                    }

                    .job-photos-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>

            <div class="job-modal">
                <div class="job-modal-header">
                    <h2>${isEdit ? 'Edit Job' : 'New Job'}</h2>
                    <button class="job-modal-close" data-action="close-modal">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>

                <div class="job-modal-body">
                    <form id="jobForm">
                        <!-- BASIC INFORMATION -->
                        <div class="job-form-section">
                            <div class="job-form-section-header">
                                <h3>Basic Information</h3>
                            </div>

                            <div class="job-form-row single">
                                <div class="job-form-group">
                                    <label>Job Title <span class="required">*</span></label>
                                    <input type="text" name="title" value="${job?.title || ''}"
                                           placeholder="e.g., Kitchen Remodel" maxlength="50" required>
                                    <div class="job-char-counter"><span id="titleCounter">${job?.title?.length || 0}</span> / 50</div>
                                </div>
                            </div>

                            <div class="job-form-row">
                                <div class="job-form-group">
                                    <label>Client</label>
                                    ${this.jobs_renderLeadSelect(job?.lead_id)}
                                </div>
                                <div class="job-form-group">
                                    <label>Job Type</label>
                                    <select name="job_type" id="jobTypeSelect">
                                        <option value="">Select Type</option>
                                        ${this.JOB_TYPES.map(type => `
                                            <option value="${type}" ${job?.job_type === type ? 'selected' : ''}>
                                                ${type.charAt(0).toUpperCase() + type.slice(1)}
                                            </option>
                                        `).join('')}
                                    </select>
                                    <div class="job-custom-type-input ${job?.job_type === 'custom' ? 'show' : ''}" id="customJobTypeInput">
                                        <input type="text" name="custom_job_type" value="${job?.custom_job_type || ''}"
                                               placeholder="Enter custom job type..." maxlength="25">
                                        <div class="job-char-counter"><span id="customTypeCounter">${job?.custom_job_type?.length || 0}</span> / 25</div>
                                    </div>
                                </div>
                            </div>

                            <div class="job-form-row">
                                <div class="job-form-group">
                                    <label>Status <span class="required">*</span></label>
                                    <select name="status" required>
                                        ${this.STATUSES.map(status => `
                                            <option value="${status}" ${(job?.status || 'draft') === status ? 'selected' : ''}>
                                                ${this.jobs_formatStatus(status)}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="job-form-group">
                                    <label>Priority</label>
                                    <select name="priority">
                                        ${this.PRIORITIES.map(p => `
                                            <option value="${p}" ${(job?.priority || 'medium') === p ? 'selected' : ''}>
                                                ${p.charAt(0).toUpperCase() + p.slice(1)}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="job-form-row triple">
                                <div class="job-form-group">
                                    <label>Scheduled Date</label>
                                    <input type="date" name="scheduled_date" value="${job?.scheduled_date || ''}">
                                </div>
                                <div class="job-form-group">
                                    <label>Scheduled Time</label>
                                    <input type="time" name="scheduled_time" value="${job?.scheduled_time || ''}">
                                </div>
                                <div class="job-form-group">
                                    <label>Duration (hours)</label>
                                    <input type="number" name="duration_hours" value="${job?.duration_hours || ''}"
                                           step="0.5" min="0" placeholder="8">
                                </div>
                            </div>

                            <div class="job-form-row single">
                                <div class="job-form-group">
                                    <label>Description</label>
                                    <textarea name="description" maxlength="500" placeholder="Describe the job...">${job?.description || ''}</textarea>
                                    <div class="job-char-counter"><span id="descCounter">${job?.description?.length || 0}</span> / 500</div>
                                </div>
                            </div>
                        </div>

                        <!-- FINANCIAL -->
                        <div class="job-form-section">
                            <div class="job-form-section-header">
                                <h3>Financial</h3>
                            </div>

                            <div class="job-form-row">
                                <div class="job-form-group">
                                    <label>Material Cost ($)</label>
                                    <input type="number" name="material_cost" value="${job?.material_cost || ''}"
                                           step="0.01" min="0" placeholder="0.00" data-calc-trigger>
                                </div>
                                <div class="job-form-group">
                                    <label>Labor Rate ($/hr)</label>
                                    <input type="number" name="labor_rate" value="${job?.labor_rate || ''}"
                                           step="0.01" min="0" placeholder="50.00" data-calc-trigger>
                                </div>
                            </div>

                            <div class="job-form-row">
                                <div class="job-form-group">
                                    <label>Estimated Hours</label>
                                    <input type="number" name="estimated_labor_hours" value="${job?.estimated_labor_hours || ''}"
                                           step="0.5" min="0" placeholder="8" data-calc-trigger>
                                </div>
                                <div class="job-form-group">
                                    <label>Other Expenses ($)</label>
                                    <input type="number" name="other_expenses" value="${job?.other_expenses || ''}"
                                           step="0.01" min="0" placeholder="0.00" data-calc-trigger>
                                </div>
                            </div>

                            <div class="job-form-row">
                                <div class="job-form-group">
                                    <label>Quoted Price ($) <span class="required">*</span></label>
                                    <input type="number" name="quoted_price" value="${job?.quoted_price || ''}"
                                           step="0.01" min="0" placeholder="1000.00" required data-calc-trigger>
                                </div>
                                <div class="job-form-group">
                                    <label>Deposit Amount ($)</label>
                                    <input type="number" name="deposit_amount" value="${job?.deposit_amount || ''}"
                                           step="0.01" min="0" placeholder="0.00">
                                </div>
                            </div>

                            <div class="job-form-row single">
                                <div class="job-form-group">
                                    <label>
                                        <input type="checkbox" name="deposit_paid" ${job?.deposit_paid ? 'checked' : ''}>
                                        Deposit Paid
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- MATERIALS (Collapsible) -->
                        <div class="job-form-section">
                            <div class="job-form-section-header">
                                <h3>Materials</h3>
                                <button type="button" class="job-form-section-toggle" data-section="materials">
                                    <span>${this.state.modalState.materials.length} item${this.state.modalState.materials.length !== 1 ? 's' : ''}</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="job-form-section-content collapsed" id="materialsSection">
                                <div id="materialsContainer">
                                    ${this.jobs_renderMaterialsTable()}
                                </div>
                            </div>
                        </div>

                        <!-- CREW (Collapsible) -->
                        <div class="job-form-section">
                            <div class="job-form-section-header">
                                <h3>Crew</h3>
                                <button type="button" class="job-form-section-toggle" data-section="crew">
                                    <span>${this.state.modalState.crew.length} member${this.state.modalState.crew.length !== 1 ? 's' : ''}</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="job-form-section-content collapsed" id="crewSection">
                                <div id="crewContainer">
                                    ${this.jobs_renderCrewTable()}
                                </div>
                            </div>
                        </div>

                        <!-- PHOTOS (Collapsible, Pro tier) -->
                        <div class="job-form-section">
                            <div class="job-form-section-header">
                                <h3>Photos (Pro Tier) 🔒</h3>
                                <button type="button" class="job-form-section-toggle" data-section="photos">
                                    <span>${this.state.modalState.photos.length} / 3 photos</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="job-form-section-content collapsed" id="photosSection">
                                <div id="photosContainer">
                                    ${this.jobs_renderPhotosGrid()}
                                </div>
                            </div>
                        </div>

                        <!-- NOTES (Collapsible) -->
                        <div class="job-form-section">
                            <div class="job-form-section-header">
                                <h3>Notes</h3>
                                <button type="button" class="job-form-section-toggle" data-section="notes">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="job-form-section-content collapsed" id="notesSection">
                                <div class="job-form-group">
                                    <label>Internal Notes</label>
                                    <textarea name="notes" maxlength="500" placeholder="Internal notes about this job...">${job?.notes || ''}</textarea>
                                    <div class="job-char-counter"><span id="notesCounter">${job?.notes?.length || 0}</span> / 500</div>
                                </div>
                            </div>
                        </div>

                        <!-- PROFIT CALCULATOR (Always visible, at bottom) -->
                        <div class="job-profit-calculator" id="profitCalculator">
                            <!-- Will be populated by jobs_updateProfitCalculator() -->
                        </div>
                    </form>
                </div>

                <div class="job-modal-footer">
                    <button type="button" class="job-modal-btn job-modal-btn-cancel" data-action="close-modal">
                        Cancel
                    </button>
                    <button type="button" class="job-modal-btn job-modal-btn-save" data-action="save-job">
                        ${isEdit ? 'Update Job' : 'Create Job'}
                    </button>
                </div>
            </div>
        `;
    },

    jobs_renderLeadSelect(selectedLeadId = null) {
        return `
            <select name="lead_id">
                <option value="">No Lead</option>
                ${this.state.leads.map(lead => `
                    <option value="${lead.id}" ${selectedLeadId === lead.id ? 'selected' : ''}>
                        ${lead.name}${lead.company ? ` (${lead.company})` : ''}
                    </option>
                `).join('')}
            </select>
        `;
    },

    jobs_renderMaterialsTable() {
        const materials = this.state.modalState.materials;

        if (materials.length === 0) {
            return `
                <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    No materials added yet
                </p>
                <button type="button" class="job-add-row-btn" data-action="add-material">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Add Material
                </button>
            `;
        }

        const total = materials.reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_price || 0)), 0);

        return `
            <div class="job-dynamic-table">
                <div class="job-dynamic-table-header job-materials-header">
                    <div>Name</div>
                    <div>Qty</div>
                    <div>Unit</div>
                    <div>$/Unit</div>
                    <div>Supplier</div>
                    <div>Total</div>
                    <div></div>
                </div>
                ${materials.map((m, i) => this.jobs_renderMaterialRow(m, i)).join('')}
            </div>
            <button type="button" class="job-add-row-btn" data-action="add-material">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Add Material
            </button>
            <div class="job-table-total">
                <div class="job-table-total-label">Total Materials</div>
                <div class="job-table-total-value">${formatCurrency(total)}</div>
            </div>
        `;
    },

    jobs_renderMaterialRow(material, index) {
        const total = (material.quantity || 0) * (material.unit_price || 0);
        return `
            <div class="job-dynamic-row job-materials-row">
                <input type="text" placeholder="Name" value="${material.name || ''}" data-material="${index}" data-field="name">
                <input type="number" placeholder="0" value="${material.quantity || ''}" data-material="${index}" data-field="quantity" step="0.01" min="0">
                <input type="text" placeholder="pcs" value="${material.unit || ''}" data-material="${index}" data-field="unit">
                <input type="number" placeholder="0.00" value="${material.unit_price || ''}" data-material="${index}" data-field="unit_price" step="0.01" min="0">
                <input type="text" placeholder="Supplier" value="${material.supplier || ''}" data-material="${index}" data-field="supplier">
                <div class="job-row-total">${formatCurrency(total)}</div>
                <button type="button" class="job-row-delete" data-action="delete-material" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        `;
    },

    jobs_renderCrewTable() {
        const crew = this.state.modalState.crew;

        if (crew.length === 0) {
            return `
                <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    No crew members added yet
                </p>
                <button type="button" class="job-add-row-btn" data-action="add-crew">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Add Crew Member
                </button>
            `;
        }

        const total = crew.reduce((sum, c) => sum + ((c.hours || 0) * (c.rate || 0)), 0);

        return `
            <div class="job-dynamic-table">
                <div class="job-dynamic-table-header job-crew-header">
                    <div>Name</div>
                    <div>Role</div>
                    <div>Hours</div>
                    <div>Rate</div>
                    <div>Total</div>
                    <div></div>
                </div>
                ${crew.map((c, i) => this.jobs_renderCrewRow(c, i)).join('')}
            </div>
            <button type="button" class="job-add-row-btn" data-action="add-crew">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Add Crew Member
            </button>
            <div class="job-table-total">
                <div class="job-table-total-label">Total Labor Cost</div>
                <div class="job-table-total-value">${formatCurrency(total)}</div>
            </div>
        `;
    },

    jobs_renderCrewRow(member, index) {
        const total = (member.hours || 0) * (member.rate || 0);
        return `
            <div class="job-dynamic-row job-crew-row">
                <input type="text" placeholder="Name" value="${member.name || ''}" data-crew="${index}" data-field="name">
                <input type="text" placeholder="Role" value="${member.role || ''}" data-crew="${index}" data-field="role">
                <input type="number" placeholder="0" value="${member.hours || ''}" data-crew="${index}" data-field="hours" step="0.5" min="0">
                <input type="number" placeholder="0.00" value="${member.rate || ''}" data-crew="${index}" data-field="rate" step="0.01" min="0">
                <div class="job-row-total">${formatCurrency(total)}</div>
                <button type="button" class="job-row-delete" data-action="delete-crew" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        `;
    },

    jobs_renderPhotosGrid() {
        const photos = this.state.modalState.photos;
        const canAddMore = photos.length < 3;

        return `
            <div class="job-photos-grid">
                ${photos.map((photo, i) => `
                    <div class="job-photo-preview">
                        <img src="${photo.url}" alt="${photo.type}">
                        <div class="job-photo-preview-overlay">
                            <div class="job-photo-type">${photo.type}</div>
                            <button type="button" class="job-photo-delete" data-action="delete-photo" data-index="${i}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
                ${canAddMore ? `
                    <div class="job-photo-upload">
                        <input type="file" accept="image/*" data-action="upload-photo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21" stroke-width="2"/>
                        </svg>
                        <div class="job-photo-upload-text">Upload Photo</div>
                    </div>
                ` : ''}
            </div>
            <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-tertiary);">
                ${photos.length} / 3 photos used
            </p>
        `;
    },

    jobs_updateProfitCalculator() {
        const form = document.getElementById('jobForm');
        const calc = document.getElementById('profitCalculator');
        if (!form || !calc) return;

        const materialCost = parseFloat(form.material_cost?.value) || 0;
        const laborRate = parseFloat(form.labor_rate?.value) || 0;
        const estimatedHours = parseFloat(form.estimated_labor_hours?.value) || 0;
        const otherExpenses = parseFloat(form.other_expenses?.value) || 0;
        const quotedPrice = parseFloat(form.quoted_price?.value) || 0;

        // Add materials total
        const materialsTotal = this.state.modalState.materials.reduce((sum, m) =>
            sum + ((m.quantity || 0) * (m.unit_price || 0)), 0);

        // Add crew total
        const crewTotal = this.state.modalState.crew.reduce((sum, c) =>
            sum + ((c.hours || 0) * (c.rate || 0)), 0);

        const laborCost = laborRate * estimatedHours;
        const totalCost = materialCost + materialsTotal + laborCost + crewTotal + otherExpenses;
        const profit = quotedPrice - totalCost;
        const profitMargin = quotedPrice > 0 ? (profit / quotedPrice) * 100 : 0;

        const profitClass = profit >= 0 ? 'positive' : 'negative';

        calc.innerHTML = `
            <div class="job-profit-calculator-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="12" y1="1" x2="12" y2="23" stroke-width="2" stroke-linecap="round"/>
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h4>Live Profit Calculator</h4>
            </div>
            <div class="job-profit-breakdown">
                <div class="job-profit-line">
                    <div class="job-profit-line-label">Revenue:</div>
                    <div class="job-profit-line-value">${formatCurrency(quotedPrice)}</div>
                </div>
                <div class="job-profit-line indent">
                    <div class="job-profit-line-label">Materials (manual):</div>
                    <div class="job-profit-line-value">-${formatCurrency(materialCost)}</div>
                </div>
                ${materialsTotal > 0 ? `
                    <div class="job-profit-line indent">
                        <div class="job-profit-line-label">Materials (table):</div>
                        <div class="job-profit-line-value">-${formatCurrency(materialsTotal)}</div>
                    </div>
                ` : ''}
                <div class="job-profit-line indent">
                    <div class="job-profit-line-label">Labor (manual): ${estimatedHours}h × ${formatCurrency(laborRate)}/h</div>
                    <div class="job-profit-line-value">-${formatCurrency(laborCost)}</div>
                </div>
                ${crewTotal > 0 ? `
                    <div class="job-profit-line indent">
                        <div class="job-profit-line-label">Labor (crew table):</div>
                        <div class="job-profit-line-value">-${formatCurrency(crewTotal)}</div>
                    </div>
                ` : ''}
                <div class="job-profit-line indent">
                    <div class="job-profit-line-label">Other Expenses:</div>
                    <div class="job-profit-line-value">-${formatCurrency(otherExpenses)}</div>
                </div>
                <div class="job-profit-divider"></div>
                <div class="job-profit-total">
                    <div class="job-profit-total-label">Estimated Profit</div>
                    <div class="job-profit-total-value">
                        <div class="job-profit-amount ${profitClass}">${formatCurrency(profit)}</div>
                        <div class="job-profit-margin">(${profitMargin.toFixed(1)}%)</div>
                    </div>
                </div>
            </div>
        `;
    },

    jobs_showViewModal(jobId) {
        console.log('[Jobs] TODO: Implement view modal for job:', jobId);
        window.SteadyUtils.showToast('Job detail view coming soon...', 'info');
    },

    /**
     * MODAL EVENT HANDLERS
     */
    jobs_attachModalEvents() {
        const overlay = document.getElementById('jobModalOverlay');
        if (!overlay) return;

        // Close modal
        overlay.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.jobs_closeModal());
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.jobs_closeModal();
        });

        // ESC to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.jobs_closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Toggle collapsible sections
        overlay.querySelectorAll('.job-form-section-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = btn.dataset.section;
                const content = document.getElementById(`${section}Section`);

                if (content.classList.contains('collapsed')) {
                    content.classList.remove('collapsed');
                    btn.classList.remove('collapsed');
                } else {
                    content.classList.add('collapsed');
                    btn.classList.add('collapsed');
                }
            });
        });

        // Custom job type toggle
        const jobTypeSelect = document.getElementById('jobTypeSelect');
        const customInput = document.getElementById('customJobTypeInput');
        if (jobTypeSelect && customInput) {
            jobTypeSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    customInput.classList.add('show');
                } else {
                    customInput.classList.remove('show');
                }
            });
        }

        // Character counters
        const form = document.getElementById('jobForm');
        if (form) {
            // Title counter
            const titleInput = form.querySelector('[name="title"]');
            const titleCounter = document.getElementById('titleCounter');
            if (titleInput && titleCounter) {
                titleInput.addEventListener('input', () => {
                    titleCounter.textContent = titleInput.value.length;
                });
            }

            // Custom type counter
            const customTypeInput = form.querySelector('[name="custom_job_type"]');
            const customTypeCounter = document.getElementById('customTypeCounter');
            if (customTypeInput && customTypeCounter) {
                customTypeInput.addEventListener('input', () => {
                    customTypeCounter.textContent = customTypeInput.value.length;
                });
            }

            // Description counter
            const descInput = form.querySelector('[name="description"]');
            const descCounter = document.getElementById('descCounter');
            if (descInput && descCounter) {
                descInput.addEventListener('input', () => {
                    descCounter.textContent = descInput.value.length;
                });
            }

            // Notes counter
            const notesInput = form.querySelector('[name="notes"]');
            const notesCounter = document.getElementById('notesCounter');
            if (notesInput && notesCounter) {
                notesInput.addEventListener('input', () => {
                    notesCounter.textContent = notesInput.value.length;
                });
            }

            // Financial inputs - trigger profit calculator
            form.querySelectorAll('[data-calc-trigger]').forEach(input => {
                input.addEventListener('input', () => this.jobs_updateProfitCalculator());
            });
        }

        // Materials: Add row
        overlay.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action="add-material"]');
            if (target) {
                this.state.modalState.materials.push({
                    name: '',
                    quantity: 0,
                    unit: 'pcs',
                    unit_price: 0,
                    supplier: ''
                });
                this.jobs_refreshMaterials();
            }
        });

        // Materials: Delete row
        overlay.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action="delete-material"]');
            if (target) {
                const index = parseInt(target.dataset.index);
                this.state.modalState.materials.splice(index, 1);
                this.jobs_refreshMaterials();
            }
        });

        // Materials: Input changes
        overlay.addEventListener('input', (e) => {
            if (e.target.dataset.material !== undefined) {
                const index = parseInt(e.target.dataset.material);
                const field = e.target.dataset.field;
                let value = e.target.value;

                if (field === 'quantity' || field === 'unit_price') {
                    value = parseFloat(value) || 0;
                }

                this.state.modalState.materials[index][field] = value;
                this.jobs_refreshMaterials();
            }
        });

        // Crew: Add row
        overlay.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action="add-crew"]');
            if (target) {
                this.state.modalState.crew.push({
                    name: '',
                    role: '',
                    hours: 0,
                    rate: 0
                });
                this.jobs_refreshCrew();
            }
        });

        // Crew: Delete row
        overlay.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action="delete-crew"]');
            if (target) {
                const index = parseInt(target.dataset.index);
                this.state.modalState.crew.splice(index, 1);
                this.jobs_refreshCrew();
            }
        });

        // Crew: Input changes
        overlay.addEventListener('input', (e) => {
            if (e.target.dataset.crew !== undefined) {
                const index = parseInt(e.target.dataset.crew);
                const field = e.target.dataset.field;
                let value = e.target.value;

                if (field === 'hours' || field === 'rate') {
                    value = parseFloat(value) || 0;
                }

                this.state.modalState.crew[index][field] = value;
                this.jobs_refreshCrew();
            }
        });

        // Photos: Upload
        overlay.addEventListener('change', (e) => {
            if (e.target.dataset.action === 'upload-photo') {
                this.jobs_handlePhotoUpload(e.target.files[0]);
            }
        });

        // Photos: Delete
        overlay.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action="delete-photo"]');
            if (target) {
                const index = parseInt(target.dataset.index);
                this.state.modalState.photos.splice(index, 1);
                this.jobs_refreshPhotos();
            }
        });

        // Save job
        overlay.querySelector('[data-action="save-job"]')?.addEventListener('click', () => {
            this.jobs_handleSave();
        });
    },

    jobs_refreshMaterials() {
        const container = document.getElementById('materialsContainer');
        if (container) {
            container.innerHTML = this.jobs_renderMaterialsTable();
            this.jobs_updateProfitCalculator();
        }
    },

    jobs_refreshCrew() {
        const container = document.getElementById('crewContainer');
        if (container) {
            container.innerHTML = this.jobs_renderCrewTable();
            this.jobs_updateProfitCalculator();
        }
    },

    jobs_refreshPhotos() {
        const container = document.getElementById('photosContainer');
        if (container) {
            container.innerHTML = this.jobs_renderPhotosGrid();
        }
    },

    jobs_handlePhotoUpload(file) {
        if (!file) return;

        // Check Pro tier
        // TODO: Add tier check
        if (this.state.modalState.photos.length >= 3) {
            window.SteadyUtils.showToast('Maximum 3 photos allowed', 'warning');
            return;
        }

        // Read file as data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoType = prompt('Photo type (before, during, after):', 'before');
            if (!photoType || !['before', 'during', 'after'].includes(photoType.toLowerCase())) {
                window.SteadyUtils.showToast('Invalid photo type', 'error');
                return;
            }

            this.state.modalState.photos.push({
                url: e.target.result,
                type: photoType.toLowerCase()
            });

            this.jobs_refreshPhotos();
        };
        reader.readAsDataURL(file);
    },

    async jobs_handleSave() {
        const form = document.getElementById('jobForm');
        if (!form) return;

        // Validate
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);

        const jobData = {
            title: formData.get('title'),
            lead_id: formData.get('lead_id') || null,
            job_type: formData.get('job_type') || null,
            custom_job_type: formData.get('job_type') === 'custom' ? formData.get('custom_job_type') : null,
            status: formData.get('status'),
            priority: formData.get('priority'),
            scheduled_date: formData.get('scheduled_date') || null,
            scheduled_time: formData.get('scheduled_time') || null,
            duration_hours: parseFloat(formData.get('duration_hours')) || null,
            description: formData.get('description') || null,
            material_cost: parseFloat(formData.get('material_cost')) || 0,
            labor_rate: parseFloat(formData.get('labor_rate')) || 0,
            estimated_labor_hours: parseFloat(formData.get('estimated_labor_hours')) || 0,
            other_expenses: parseFloat(formData.get('other_expenses')) || 0,
            quoted_price: parseFloat(formData.get('quoted_price')) || 0,
            deposit_amount: parseFloat(formData.get('deposit_amount')) || 0,
            deposit_paid: formData.get('deposit_paid') === 'on',
            materials: this.state.modalState.materials,
            crew_members: this.state.modalState.crew,
            photos: this.state.modalState.photos,
            notes: formData.get('notes') || null
        };

        try {
            let result;
            if (this.state.editingJobId) {
                result = await API.updateJob(this.state.editingJobId, jobData);
                const index = this.state.jobs.findIndex(j => j.id === this.state.editingJobId);
                if (index !== -1) {
                    this.state.jobs[index] = result;
                }
                window.SteadyUtils.showToast('Job updated successfully', 'success');
            } else {
                result = await API.createJob(jobData);
                this.state.jobs.unshift(result);
                window.SteadyUtils.showToast('Job created successfully', 'success');
            }

            this.jobs_calculateStats();
            this.jobs_closeModal();
            this.jobs_render();
        } catch (error) {
            console.error('Error saving job:', error);
            window.SteadyUtils.showToast('Failed to save job', 'error');
        }
    },

    jobs_closeModal() {
        const overlay = document.getElementById('jobModalOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        }
    },

    jobs_showConfirmation(options) {
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
            overlay.className = 'job-confirm-overlay';
            overlay.innerHTML = `
                <style>
                    .job-confirm-overlay {
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

                    .job-confirm-modal {
                        background: var(--surface);
                        border-radius: 12px;
                        width: 90%;
                        max-width: 480px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        animation: slideUp 0.3s ease;
                    }

                    .job-confirm-header {
                        padding: 24px 24px 16px 24px;
                        display: flex;
                        align-items: flex-start;
                        gap: 16px;
                    }

                    .job-confirm-icon {
                        flex-shrink: 0;
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: ${colors[type]}15;
                    }

                    .job-confirm-icon svg {
                        width: 24px;
                        height: 24px;
                        stroke: ${colors[type]};
                    }

                    .job-confirm-content {
                        flex: 1;
                        padding-top: 4px;
                    }

                    .job-confirm-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--text-primary);
                        margin: 0 0 8px 0;
                    }

                    .job-confirm-message {
                        font-size: 14px;
                        color: var(--text-secondary);
                        line-height: 1.5;
                        margin: 0;
                    }

                    .job-confirm-footer {
                        padding: 16px 24px 24px 24px;
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                    }

                    .job-confirm-btn {
                        padding: 10px 20px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: none;
                    }

                    .job-confirm-btn-cancel {
                        background: transparent;
                        border: 1px solid var(--border);
                        color: var(--text-primary);
                    }

                    .job-confirm-btn-cancel:hover {
                        background: var(--surface-hover);
                    }

                    .job-confirm-btn-confirm {
                        background: ${colors[type]};
                        color: white;
                    }

                    .job-confirm-btn-confirm:hover {
                        opacity: 0.9;
                        transform: translateY(-1px);
                    }
                </style>
                <div class="job-confirm-modal">
                    <div class="job-confirm-header">
                        <div class="job-confirm-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                ${icons[type]}
                            </svg>
                        </div>
                        <div class="job-confirm-content">
                            <h3 class="job-confirm-title">${title}</h3>
                            <p class="job-confirm-message">${message}</p>
                        </div>
                    </div>
                    <div class="job-confirm-footer">
                        <button class="job-confirm-btn job-confirm-btn-cancel" data-action="cancel">
                            ${cancelText}
                        </button>
                        <button class="job-confirm-btn job-confirm-btn-confirm" data-action="confirm">
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

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) handleCancel();
            });

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
     * STYLES
     */
    jobs_renderStyles() {
        return `<style>
/* JOBS MODULE - Based on Estimates but adapted for Jobs */

.jobs-container {
    max-width: 1400px;
    margin: 0 auto;
    animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

/* HEADER */
.jobs-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 2rem;
}

.jobs-header-content { flex: 1; }

.jobs-header h1 {
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

.jobs-title-icon {
    width: 2.5rem;
    height: 2.5rem;
}

.jobs-subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0;
}

.jobs-btn-primary {
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

.jobs-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.jobs-btn-primary svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2.5;
}

/* LIMIT BAR */
.jobs-limit-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    margin-bottom: 1.5rem;
}

.jobs-limit-counter {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
}

.jobs-limit-counter svg {
    color: #667eea;
}

.jobs-btn-batch {
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

.jobs-btn-batch svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 2;
}

.jobs-btn-batch:hover {
    border-color: #667eea;
    color: #667eea;
    transform: translateY(-1px);
}

.jobs-btn-batch.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

/* STATS */
.jobs-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 2.5rem;
}

.jobs-stat-card {
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

.jobs-stat-card:hover {
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.jobs-stat-card.active {
    border-color: #667eea;
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
}

.jobs-stat-icon {
    width: 4rem;
    height: 4rem;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.jobs-stat-icon.revenue {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(139, 92, 246, 0.15));
}

.jobs-stat-icon.profit {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15));
}

.jobs-stat-icon.margin {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15));
}

.jobs-stat-icon svg {
    width: 2rem;
    height: 2rem;
    stroke-width: 2;
}

.jobs-stat-icon.revenue svg { stroke: #667eea; }
.jobs-stat-icon.profit svg { stroke: #10b981; }
.jobs-stat-icon.margin svg { stroke: #fbbf24; }

.jobs-stat-content { flex: 1; }

.jobs-stat-value {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 0.5rem;
}

.jobs-stat-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* TOOLBAR */
.jobs-toolbar {
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

.jobs-toolbar-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
}

.jobs-search {
    position: relative;
    flex: 1;
    max-width: 800px;
}

.jobs-search input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--bg);
    color: var(--text-primary);
    font-size: 0.9rem;
    transition: all 0.2s;
}

.jobs-search input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.jobs-search svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.125rem;
    height: 1.125rem;
    color: var(--text-tertiary);
    pointer-events: none;
}

.jobs-toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.jobs-sort {
    position: relative;
}

.jobs-sort select {
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

.jobs-sort select:hover {
    border-color: #667eea;
}

.jobs-sort select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.jobs-sort svg {
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
.jobs-grid-section {
    min-height: 200px;
}

.jobs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

/* JOB CARDS */
.job-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.job-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
}

.job-card.batch-mode {
    cursor: pointer;
}

.job-card.selected {
    border-color: #667eea;
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
}

.job-card-checkbox {
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

.job-checkbox-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.job-checkbox-custom {
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

.job-checkbox-custom svg {
    width: 1rem;
    height: 1rem;
    stroke: white;
    opacity: 0;
    transform: scale(0);
    transition: all 0.2s;
}

.job-card.selected .job-checkbox-custom {
    background: #667eea;
    border-color: #667eea;
}

.job-card.selected .job-checkbox-custom svg {
    opacity: 1;
    transform: scale(1);
}

.job-card-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.job-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
}

.job-header-left {
    flex: 1;
    min-width: 0;
}

.job-number {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.25rem;
    opacity: 0.8;
}

.job-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
}

.job-status {
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

.job-status.draft {
    background: rgba(156, 163, 175, 0.15);
    color: #6b7280;
}

.job-status.scheduled {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
}

.job-status.in_progress {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
}

.job-status.completed {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
}

.job-status.invoiced {
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
}

.job-status.paid {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
}

.job-status.cancelled {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.job-status svg {
    width: 0.875rem;
    height: 0.875rem;
}

.job-lead, .job-scheduled {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
}

.job-lead svg, .job-scheduled svg {
    width: 1rem;
    height: 1rem;
    opacity: 0.6;
}

.job-card-financials {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.job-financial-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.job-financial-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.job-financial-value {
    font-size: 1.125rem;
    font-weight: 800;
    color: var(--text-primary);
}

.job-financial-value.profit {
    color: #10b981;
}

.job-financial-value.margin {
    color: #fbbf24;
}

.job-deposit-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 6px;
    color: #fbbf24;
    font-size: 0.75rem;
    font-weight: 600;
}

.job-deposit-badge.paid {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.2);
    color: #10b981;
}

.job-deposit-badge svg {
    width: 0.875rem;
    height: 0.875rem;
}

.job-photos-badge {
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

.job-photos-badge svg {
    width: 0.875rem;
    height: 0.875rem;
}

/* BATCH ACTIONS */
.jobs-batch-actions {
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

.jobs-batch-actions-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.jobs-batch-selected {
    font-size: 0.9rem;
    font-weight: 600;
    color: #667eea;
}

.jobs-batch-actions-right {
    display: flex;
    gap: 0.5rem;
}

.jobs-batch-btn {
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

.jobs-batch-btn:hover {
    background: rgba(102, 126, 234, 0.1);
    border-color: #667eea;
}

.jobs-batch-btn svg {
    width: 1rem;
    height: 1rem;
}

.jobs-batch-btn.delete {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
}

.jobs-batch-btn.delete:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
}

/* EMPTY STATE */
.jobs-empty {
    text-align: center;
    padding: 6rem 2rem;
    background: var(--surface);
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
}

.jobs-empty svg {
    width: 5rem;
    height: 5rem;
    color: var(--text-tertiary);
    margin-bottom: 1.5rem;
    opacity: 0.5;
}

.jobs-empty h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.75rem 0;
}

.jobs-empty p {
    color: var(--text-secondary);
    font-size: 1rem;
    margin: 0;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .jobs-header {
        flex-direction: column;
        align-items: stretch;
    }

    .jobs-stats {
        grid-template-columns: 1fr;
    }

    .jobs-grid {
        grid-template-columns: 1fr;
    }

    .jobs-toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .jobs-toolbar-left {
        flex-direction: column;
        align-items: stretch;
    }

    .jobs-search {
        max-width: none;
    }
}
</style>`;
    }
};

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('jobs')) {
            JobsModule.init();
        }
    });
} else {
    if (window.location.pathname.includes('jobs')) {
        JobsModule.init();
    }
}
