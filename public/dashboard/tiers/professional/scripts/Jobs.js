/**
 * JOBS MODULE
 * Manages job tracking, financial calculations, crew, materials, and photos
 */

const JobsModule = {
    state: {
        jobs: [],
        leads: [],
        filteredJobs: [],
        container: 'jobs-content',

        // Filters
        statusFilter: 'all',
        paymentFilter: 'all',
        dateRangeFilter: 'all',

        // Modal state
        editingJobId: null,
        viewingJobId: null,

        // Stats
        stats: {
            totalRevenue: 0,
            totalProfit: 0,
            avgMargin: 0
        }
    },

    // Constants
    JOB_TYPES: ['installation', 'repair', 'maintenance', 'inspection', 'consultation', 'emergency', 'custom'],
    JOB_STATUSES: ['draft', 'scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled'],
    PRIORITIES: ['low', 'medium', 'high'],
    PAYMENT_STATUSES: ['pending', 'partial', 'paid', 'overdue'],

    /**
     * Initialize the Jobs module
     */
    async jobs_init() {
        try {
            showLoadingState(this.state.container);

            // Load jobs and leads in parallel
            const [jobs, leads] = await Promise.all([
                API.getJobs(),
                API.getLeads()
            ]);

            this.state.jobs = jobs || [];
            this.state.leads = leads || [];
            this.state.filteredJobs = this.state.jobs;

            this.jobs_calculateStats();
            this.jobs_render();
        } catch (error) {
            console.error('Error initializing Jobs:', error);
            showErrorState(this.state.container, 'Failed to load jobs');
        }
    },

    /**
     * Main render function
     */
    jobs_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Apply filters
        this.jobs_applyFilters();

        container.innerHTML = `
            <div class="jobs-module">
                ${this.jobs_renderHeader()}
                ${this.jobs_renderStatsBar()}
                ${this.jobs_renderFilters()}
                ${this.jobs_renderJobsGrid()}
            </div>
        `;

        this.jobs_attachEventListeners();
    },

    /**
     * Render header with "New Job" button
     */
    jobs_renderHeader() {
        return `
            <div class="jobs-header">
                <h2>Jobs</h2>
                <button class="btn-primary" data-action="new-job">
                    <i data-lucide="plus"></i>
                    New Job
                </button>
            </div>
        `;
    },

    /**
     * Render quick stats bar
     */
    jobs_renderStatsBar() {
        const { totalRevenue, totalProfit, avgMargin } = this.state.stats;

        return `
            <div class="jobs-stats-bar">
                <div class="stat-card">
                    <div class="stat-label">Total Revenue</div>
                    <div class="stat-value">${formatCurrency(totalRevenue)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Profit</div>
                    <div class="stat-value">${formatCurrency(totalProfit)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Avg Margin</div>
                    <div class="stat-value">${avgMargin.toFixed(1)}%</div>
                </div>
            </div>
        `;
    },

    /**
     * Render filter controls
     */
    jobs_renderFilters() {
        return `
            <div class="jobs-filters">
                <select class="filter-select" data-filter="status">
                    <option value="all">All Status</option>
                    ${this.JOB_STATUSES.map(status => `
                        <option value="${status}" ${this.state.statusFilter === status ? 'selected' : ''}>
                            ${this.jobs_formatStatus(status)}
                        </option>
                    `).join('')}
                </select>

                <select class="filter-select" data-filter="payment">
                    <option value="all">All Payment</option>
                    ${this.PAYMENT_STATUSES.map(status => `
                        <option value="${status}" ${this.state.paymentFilter === status ? 'selected' : ''}>
                            ${this.jobs_formatPaymentStatus(status)}
                        </option>
                    `).join('')}
                </select>

                <select class="filter-select" data-filter="date">
                    <option value="all" ${this.state.dateRangeFilter === 'all' ? 'selected' : ''}>All Time</option>
                    <option value="today" ${this.state.dateRangeFilter === 'today' ? 'selected' : ''}>Today</option>
                    <option value="week" ${this.state.dateRangeFilter === 'week' ? 'selected' : ''}>This Week</option>
                    <option value="month" ${this.state.dateRangeFilter === 'month' ? 'selected' : ''}>This Month</option>
                    <option value="quarter" ${this.state.dateRangeFilter === 'quarter' ? 'selected' : ''}>This Quarter</option>
                </select>
            </div>
        `;
    },

    /**
     * Render jobs grid
     */
    jobs_renderJobsGrid() {
        if (this.state.filteredJobs.length === 0) {
            return `
                <div class="empty-state">
                    <i data-lucide="briefcase" class="empty-icon"></i>
                    <h3>No jobs found</h3>
                    <p>Create your first job to start tracking your work</p>
                    <button class="btn-primary" data-action="new-job">
                        <i data-lucide="plus"></i>
                        New Job
                    </button>
                </div>
            `;
        }

        return `
            <div class="jobs-grid">
                ${this.state.filteredJobs.map(job => this.jobs_renderJobCard(job)).join('')}
            </div>
        `;
    },

    /**
     * Render individual job card
     */
    jobs_renderJobCard(job) {
        const lead = this.state.leads.find(l => l.id === job.lead_id);
        const statusBadge = this.jobs_getStatusBadge(job.status);
        const profit = job.profit || 0;
        const profitMargin = job.profit_margin || 0;

        return `
            <div class="jobs-card" data-id="${job.id}">
                <div class="jobs-card-header">
                    <h3>${job.title || 'Untitled Job'}</h3>
                    ${statusBadge}
                </div>

                <div class="jobs-card-body">
                    ${lead ? `
                        <div class="job-lead">
                            <i data-lucide="user"></i>
                            ${lead.name}
                        </div>
                    ` : ''}

                    ${job.scheduled_date ? `
                        <div class="job-date">
                            <i data-lucide="calendar"></i>
                            ${formatDate(job.scheduled_date)}
                        </div>
                    ` : '<div class="job-date text-muted">No date scheduled</div>'}

                    <div class="job-financial">
                        ${job.quoted_price ? `
                            <div>Quote: ${formatCurrency(job.quoted_price)}</div>
                        ` : ''}

                        ${job.status === 'completed' || job.status === 'paid' ? `
                            <div class="${profit >= 0 ? 'text-success' : 'text-danger'}">
                                Profit: ${formatCurrency(profit)} (${profitMargin.toFixed(1)}%)
                            </div>
                        ` : ''}

                        ${job.deposit_paid ? `
                            <div class="text-success">
                                <i data-lucide="check-circle"></i>
                                Deposit Paid
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="jobs-card-actions">
                    <button class="btn-secondary btn-sm" data-action="view-job" data-id="${job.id}">
                        <i data-lucide="eye"></i>
                        View
                    </button>
                    <button class="btn-secondary btn-sm" data-action="edit-job" data-id="${job.id}">
                        <i data-lucide="edit"></i>
                        Edit
                    </button>
                    <button class="btn-danger btn-sm" data-action="delete-job" data-id="${job.id}">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Get status badge HTML
     */
    jobs_getStatusBadge(status) {
        const badges = {
            'draft': { color: 'gray', icon: 'file-text', label: 'Draft' },
            'scheduled': { color: 'blue', icon: 'calendar', label: 'Scheduled' },
            'in_progress': { color: 'green', icon: 'activity', label: 'In Progress' },
            'completed': { color: 'purple', icon: 'check-circle', label: 'Completed' },
            'invoiced': { color: 'orange', icon: 'file-text', label: 'Invoiced' },
            'paid': { color: 'success', icon: 'check-circle-2', label: 'Paid' },
            'cancelled': { color: 'red', icon: 'x-circle', label: 'Cancelled' }
        };

        const badge = badges[status] || badges['draft'];
        return `
            <span class="badge badge-${badge.color}">
                <i data-lucide="${badge.icon}"></i>
                ${badge.label}
            </span>
        `;
    },

    /**
     * Apply filters to jobs list
     */
    jobs_applyFilters() {
        let filtered = [...this.state.jobs];

        // Status filter
        if (this.state.statusFilter !== 'all') {
            filtered = filtered.filter(job => job.status === this.state.statusFilter);
        }

        // Payment filter
        if (this.state.paymentFilter !== 'all') {
            filtered = filtered.filter(job => job.payment_status === this.state.paymentFilter);
        }

        // Date range filter
        if (this.state.dateRangeFilter !== 'all') {
            const now = new Date();
            filtered = filtered.filter(job => {
                if (!job.scheduled_date) return false;
                const jobDate = new Date(job.scheduled_date);

                switch (this.state.dateRangeFilter) {
                    case 'today':
                        return jobDate.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return jobDate >= weekAgo;
                    case 'month':
                        return jobDate.getMonth() === now.getMonth() &&
                               jobDate.getFullYear() === now.getFullYear();
                    case 'quarter':
                        const quarter = Math.floor(now.getMonth() / 3);
                        const jobQuarter = Math.floor(jobDate.getMonth() / 3);
                        return jobQuarter === quarter &&
                               jobDate.getFullYear() === now.getFullYear();
                    default:
                        return true;
                }
            });
        }

        this.state.filteredJobs = filtered;
    },

    /**
     * Calculate stats from jobs
     */
    jobs_calculateStats() {
        const completedJobs = this.state.jobs.filter(j =>
            j.status === 'completed' || j.status === 'invoiced' || j.status === 'paid'
        );

        const totalRevenue = completedJobs.reduce((sum, job) =>
            sum + (job.final_price || job.quoted_price || 0), 0
        );

        const totalProfit = completedJobs.reduce((sum, job) =>
            sum + (job.profit || 0), 0
        );

        const avgMargin = totalRevenue > 0
            ? (totalProfit / totalRevenue) * 100
            : 0;

        this.state.stats = { totalRevenue, totalProfit, avgMargin };
    },

    /**
     * Format status for display
     */
    jobs_formatStatus(status) {
        return status.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    },

    /**
     * Format payment status for display
     */
    jobs_formatPaymentStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    },

    /**
     * Attach event listeners
     */
    jobs_attachEventListeners() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Refresh Lucide icons
        if (window.lucide) lucide.createIcons();

        // New job button
        container.querySelectorAll('[data-action="new-job"]').forEach(btn => {
            btn.addEventListener('click', () => this.jobs_openModal());
        });

        // View job
        container.querySelectorAll('[data-action="view-job"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const jobId = e.currentTarget.dataset.id;
                this.jobs_viewJob(jobId);
            });
        });

        // Edit job
        container.querySelectorAll('[data-action="edit-job"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const jobId = e.currentTarget.dataset.id;
                this.jobs_openModal(jobId);
            });
        });

        // Delete job
        container.querySelectorAll('[data-action="delete-job"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const jobId = e.currentTarget.dataset.id;
                this.jobs_deleteJob(jobId);
            });
        });

        // Filter changes
        container.querySelectorAll('[data-filter]').forEach(select => {
            select.addEventListener('change', (e) => {
                const filterType = e.target.dataset.filter;
                const value = e.target.value;

                if (filterType === 'status') this.state.statusFilter = value;
                if (filterType === 'payment') this.state.paymentFilter = value;
                if (filterType === 'date') this.state.dateRangeFilter = value;

                this.jobs_render();
            });
        });
    },

    /**
     * Open add/edit modal (placeholder - will build in Session 2)
     */
    jobs_openModal(jobId = null) {
        this.state.editingJobId = jobId;
        // TODO: Build modal in Session 2
        showNotification('Modal coming in Session 2!', 'info');
    },

    /**
     * View job details (placeholder - will build in Session 3)
     */
    jobs_viewJob(jobId) {
        this.state.viewingJobId = jobId;
        // TODO: Build detail view in Session 3
        showNotification('Detail view coming in Session 3!', 'info');
    },

    /**
     * Delete job with confirmation
     */
    async jobs_deleteJob(jobId) {
        const job = this.state.jobs.find(j => j.id === jobId);
        if (!job) return;

        const confirmed = confirm(`Are you sure you want to delete "${job.title}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            await API.deleteJob(jobId);
            this.state.jobs = this.state.jobs.filter(j => j.id !== jobId);
            this.jobs_calculateStats();
            this.jobs_render();
            showNotification('Job deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting job:', error);
            showNotification('Failed to delete job', 'error');
        }
    }
};

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('jobs')) {
            JobsModule.jobs_init();
        }
    });
} else {
    if (window.location.pathname.includes('jobs')) {
        JobsModule.jobs_init();
    }
}
