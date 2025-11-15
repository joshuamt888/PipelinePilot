// ========================================
// PRO FEATURE: Clients Module
// Available to: Professional, Admin tiers
// ========================================
/**
 * CLIENTS MODULE - View-only dashboard for leads with estimates or jobs
 * Pattern: Follows Estimates.js structure exactly
 */

window.ClientsModule = {
    // STATE
    state: {
        clients: [],
        filteredClients: [],
        estimates: [],
        jobs: [],
        leads: [],
        container: 'clients-content',
        searchQuery: '',
        selectedClient: null
    },

    /**
     * Initialize
     */
    async init(targetContainer = 'clients-content') {
        this.state.container = targetContainer;

        try {
            console.log('[Clients] Loading data...');

            // Check cache first
            const cachedLeads = AppCache.get('leads');
            const cachedEstimates = AppCache.get('estimates');
            const cachedJobs = AppCache.get('jobs');

            // If all three are cached, use them (instant load!)
            if (cachedLeads && cachedEstimates && cachedJobs) {
                this.state.estimates = Array.isArray(cachedEstimates) ? cachedEstimates : [];
                this.state.jobs = Array.isArray(cachedJobs) ? cachedJobs : [];
                this.state.leads = Array.isArray(cachedLeads?.all) ? cachedLeads.all : [];

                // Filter leads to only include those with estimates or jobs
                const leadsWithProjects = this.state.leads.filter(lead => {
                    const hasEstimates = this.state.estimates.some(est => est.lead_id === lead.id);
                    const hasJobs = this.state.jobs.some(job => job.lead_id === lead.id);
                    return hasEstimates || hasJobs;
                });

                // Transform leads into clients with stats
                this.state.clients = leadsWithProjects.map(lead => {
                    const clientEstimates = this.state.estimates.filter(est => est.lead_id === lead.id);
                    const clientJobs = this.state.jobs.filter(job => job.lead_id === lead.id);
                    const totalRevenue = clientJobs.reduce((sum, job) => {
                        return sum + (parseFloat(job.final_price || job.quoted_price || 0));
                    }, 0);

                    return {
                        ...lead,
                        estimateCount: clientEstimates.length,
                        jobCount: clientJobs.length,
                        totalRevenue: totalRevenue
                    };
                });

                this.state.filteredClients = [...this.state.clients];

                console.log(`[Clients] ⚡ Loaded ${this.state.clients.length} clients from cache (instant)`);

                this.clients_render();
                return;
            }

            // Cache miss - fetch from API
            console.log('[Clients] 🔄 Cache miss - fetching from API');
            const [leads, estimates, jobs] = await Promise.all([
                API.getLeads(),
                API.getEstimates(),
                API.getJobs()
            ]);

            // Store in cache
            AppCache.set('leads', leads);
            AppCache.set('estimates', estimates);
            AppCache.set('jobs', jobs);

            this.state.estimates = Array.isArray(estimates) ? estimates : [];
            this.state.jobs = Array.isArray(jobs) ? jobs : [];
            this.state.leads = Array.isArray(leads?.all) ? leads.all : [];

            // Filter leads to only include those with estimates or jobs
            const leadsWithProjects = this.state.leads.filter(lead => {
                const hasEstimates = this.state.estimates.some(est => est.lead_id === lead.id);
                const hasJobs = this.state.jobs.some(job => job.lead_id === lead.id);
                return hasEstimates || hasJobs;
            });

            // Transform leads into clients with stats
            this.state.clients = leadsWithProjects.map(lead => {
                const clientEstimates = this.state.estimates.filter(est => est.lead_id === lead.id);
                const clientJobs = this.state.jobs.filter(job => job.lead_id === lead.id);
                const totalRevenue = clientJobs.reduce((sum, job) => {
                    return sum + (parseFloat(job.final_price || job.quoted_price || 0));
                }, 0);

                return {
                    ...lead,
                    estimateCount: clientEstimates.length,
                    jobCount: clientJobs.length,
                    totalRevenue: totalRevenue
                };
            });

            this.state.filteredClients = [...this.state.clients];

            console.log(`[Clients] ✅ Loaded ${this.state.clients.length} clients`);

            this.clients_render();
        } catch (error) {
            console.error('[Clients] Error initializing:', error);
            this.clients_showError('Failed to load clients');
        }
    },

    /**
     * Main render
     */
    clients_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.clients_renderStyles()}
            <div class="clients-container">
                ${this.clients_renderHeader()}
                ${this.clients_renderToolbar()}
                ${this.clients_renderGrid()}
            </div>
        `;

        // Fade in animation
        const clientsContainer = container.querySelector('.clients-container');
        if (clientsContainer) {
            clientsContainer.style.opacity = '0';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    clientsContainer.style.transition = 'opacity 0.5s ease';
                    clientsContainer.style.opacity = '1';
                });
            });
        }

        this.clients_attachEvents();
    },

    /**
     * Attach events using delegation (Estimates pattern)
     */
    clients_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // ONE click listener for all interactions
        container.onclick = (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) {
                // Check for client card click (no data-action)
                const clientCard = e.target.closest('.client-card');
                if (clientCard) {
                    const clientId = clientCard.dataset.clientId;
                    if (clientId) this.clients_openViewModal(clientId);
                }
                return;
            }

            const action = target.dataset.action;

            switch (action) {
                case 'close-modal':
                    this.clients_closeModal();
                    break;
                case 'view-estimate':
                    this.clients_showEstimateModal(target.dataset.estimateId);
                    break;
                case 'view-job':
                    this.clients_showJobModal(target.dataset.jobId);
                    break;
            }
        };

        // Search input
        const searchInput = container.querySelector('[data-action="search"]');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.state.searchQuery = e.target.value.toLowerCase();
                this.clients_applyFilters();
                this.clients_updateGrid();
            };
        }

        console.log('[Clients] Events attached');
    },

    /**
     * Apply filters
     */
    clients_applyFilters() {
        let filtered = [...this.state.clients];

        if (this.state.searchQuery.trim()) {
            const query = this.state.searchQuery;
            filtered = filtered.filter(client => {
                const name = (client.name || '').toLowerCase();
                const email = (client.email || '').toLowerCase();
                const phone = (client.phone || '').toLowerCase();
                return name.includes(query) || email.includes(query) || phone.includes(query);
            });
        }

        this.state.filteredClients = filtered;
    },

    /**
     * Update grid only (no full re-render)
     */
    clients_updateGrid() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const gridSection = container.querySelector('.clients-grid-section');
        if (gridSection) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.clients_renderGrid();
            gridSection.outerHTML = tempDiv.firstElementChild.outerHTML;
        }
    },

    /**
     * Render styles (using themes.css variables)
     */
    clients_renderStyles() {
        return `<style>
            .clients-container {
                padding: 2rem;
                max-width: 1400px;
                margin: 0 auto;
            }

            .clients-header {
                margin-bottom: 2rem;
            }

            .clients-title {
                font-size: 1.75rem;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
            }

            .clients-subtitle {
                color: var(--text-secondary);
                margin-top: 0.5rem;
                font-size: 0.9375rem;
            }

            /* Stats */
            .clients-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .clients-stat-card {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                transition: var(--transition);
            }

            .clients-stat-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow);
                border-color: var(--primary);
            }

            .clients-stat-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .clients-stat-icon svg {
                width: 40px;
                height: 40px;
                stroke: var(--primary);
                stroke-width: 2;
            }

            .clients-stat-content {
                flex: 1;
            }

            .clients-stat-label {
                font-size: 0.875rem;
                color: var(--text-secondary);
                margin-bottom: 0.25rem;
            }

            .clients-stat-value {
                font-size: 2rem;
                font-weight: 700;
                color: var(--text-primary);
            }

            /* Toolbar */
            .clients-toolbar {
                margin-bottom: 2rem;
            }

            .clients-search {
                position: relative;
                max-width: 500px;
            }

            .clients-search-icon {
                position: absolute;
                left: 1rem;
                top: 50%;
                transform: translateY(-50%);
                width: 20px;
                height: 20px;
                stroke: var(--text-tertiary);
                pointer-events: none;
            }

            .clients-search-input {
                width: 100%;
                padding: 0.875rem 1rem 0.875rem 3rem;
                border: 1px solid var(--border);
                border-radius: var(--radius);
                font-size: 0.9375rem;
                background: var(--surface);
                color: var(--text-primary);
                transition: var(--transition);
            }

            .clients-search-input:focus {
                outline: none;
                border-color: var(--primary);
                box-shadow: 0 0 0 3px var(--primary-light);
            }

            /* Grid */
            .clients-grid-section {
                min-height: 200px;
            }

            .clients-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 1.5rem;
            }

            .client-card {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                cursor: pointer;
                transition: var(--transition);
            }

            .client-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow);
                border-color: var(--primary);
            }

            .client-name {
                font-size: 1.125rem;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 0.25rem;
            }

            .client-email {
                font-size: 0.875rem;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
            }

            .client-phone {
                font-size: 0.875rem;
                color: var(--text-tertiary);
                margin-bottom: 1rem;
            }

            .client-stats {
                display: flex;
                gap: 1rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border);
                flex-wrap: wrap;
            }

            .client-stat {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: var(--text-secondary);
            }

            .client-stat svg {
                width: 16px;
                height: 16px;
                stroke: var(--primary);
            }

            .client-stat-revenue {
                color: var(--success);
                font-weight: 600;
            }

            /* Empty state */
            .clients-empty {
                text-align: center;
                padding: 4rem 2rem;
                color: var(--text-secondary);
            }

            .clients-empty svg {
                width: 64px;
                height: 64px;
                margin-bottom: 1rem;
                stroke: var(--text-tertiary);
            }

            .clients-empty h3 {
                font-size: 1.25rem;
                color: var(--text-primary);
                margin-bottom: 0.5rem;
            }

            /* Modal */
            .clients-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .clients-modal {
                background: var(--surface);
                border-radius: 12px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: var(--shadow-modal);
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .clients-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 2rem;
                border-bottom: 1px solid var(--border);
            }

            .clients-modal-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
            }

            .clients-modal-close {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                border: none;
                background: transparent;
                color: var(--text-secondary);
                font-size: 1.5rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--transition);
            }

            .clients-modal-close:hover {
                background: var(--hover-overlay-light);
                color: var(--text-primary);
            }

            .clients-modal-body {
                padding: 2rem;
            }

            .clients-section {
                margin-bottom: 2rem;
            }

            .clients-section:last-child {
                margin-bottom: 0;
            }

            .clients-section-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .clients-section-title svg {
                width: 20px;
                height: 20px;
                stroke: var(--primary);
            }

            .clients-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.25rem;
            }

            .clients-info-item {
                display: flex;
                flex-direction: column;
            }

            .clients-info-label {
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 0.5rem;
            }

            .clients-info-value {
                padding: 0.75rem 1rem;
                background: var(--surface-hover);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                font-size: 0.9375rem;
                color: var(--text-secondary);
                min-height: 44px;
                display: flex;
                align-items: center;
            }

            .clients-info-value.revenue {
                color: var(--success);
                font-weight: 600;
            }

            .clients-items-grid {
                display: grid;
                gap: 1rem;
            }

            .clients-item-card {
                background: var(--surface-hover);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 1rem;
                cursor: pointer;
                transition: var(--transition);
            }

            .clients-item-card:hover {
                border-color: var(--primary);
                transform: translateX(4px);
            }

            .clients-item-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 0.5rem;
            }

            .clients-item-title {
                font-weight: 600;
                color: var(--text-primary);
            }

            .clients-item-meta {
                display: flex;
                gap: 1rem;
                font-size: 0.875rem;
                color: var(--text-secondary);
            }

            .clients-item-price {
                color: var(--success);
                font-weight: 600;
            }

            .status-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: capitalize;
            }

            .status-badge.status-draft {
                background: var(--surface-hover);
                color: var(--estimate-status-draft);
            }

            .status-badge.status-sent {
                background: var(--info-light);
                color: var(--estimate-status-sent);
            }

            .status-badge.status-accepted {
                background: var(--success-light);
                color: var(--success);
            }

            .status-badge.status-scheduled {
                background: var(--warning-light);
                color: var(--warning);
            }

            .status-badge.status-in_progress {
                background: var(--info-light);
                color: var(--info);
            }

            .status-badge.status-completed {
                background: var(--success-light);
                color: var(--success);
            }
        </style>`;
    },

    /**
     * Render header
     */
    clients_renderHeader() {
        return `
            <div class="clients-header">
                <h1 class="clients-title">Clients</h1>
                <p class="clients-subtitle">View-only dashboard for leads with estimates or jobs • Track client relationships and project history</p>
            </div>
        `;
    },

    /**
     * Render stats
     */
    clients_renderStats() {
        const totalClients = this.state.clients.length;
        const totalJobs = this.state.jobs.length;
        const totalEstimates = this.state.estimates.length;

        return `
            <div class="clients-stats">
                <div class="clients-stat-card">
                    <div class="clients-stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                            <path d="M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                    </div>
                    <div class="clients-stat-content">
                        <div class="clients-stat-label">Total Clients</div>
                        <div class="clients-stat-value">${totalClients}</div>
                    </div>
                </div>

                <div class="clients-stat-card">
                    <div class="clients-stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                        </svg>
                    </div>
                    <div class="clients-stat-content">
                        <div class="clients-stat-label">Total Jobs</div>
                        <div class="clients-stat-value">${totalJobs}</div>
                    </div>
                </div>

                <div class="clients-stat-card">
                    <div class="clients-stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                    </div>
                    <div class="clients-stat-content">
                        <div class="clients-stat-label">Total Estimates</div>
                        <div class="clients-stat-value">${totalEstimates}</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render toolbar
     */
    clients_renderToolbar() {
        return `
            <div class="clients-toolbar">
                <div class="clients-search">
                    <svg class="clients-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        type="text"
                        class="clients-search-input"
                        placeholder="Search clients by name, email, or phone..."
                        value="${this.state.searchQuery}"
                        data-action="search"
                    />
                </div>
            </div>
        `;
    },

    /**
     * Render grid
     */
    clients_renderGrid() {
        if (this.state.filteredClients.length === 0) {
            return `
                <div class="clients-grid-section">
                    <div class="clients-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                            <path d="M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                        <h3>${this.state.searchQuery ? 'No clients found' : 'No clients yet'}</h3>
                        <p>${this.state.searchQuery ? `No clients match "${this.state.searchQuery}"` : 'Clients will appear here when leads have estimates or jobs'}</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="clients-grid-section">
                <div class="clients-grid">
                    ${this.state.filteredClients.map(client => this.clients_renderCard(client)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render client card
     */
    clients_renderCard(client) {
        return `
            <div class="client-card" data-client-id="${client.id}">
                <div class="client-name">${this.clients_escapeHtml(client.name || 'Unknown')}</div>
                <div class="client-email">${this.clients_escapeHtml(client.email || 'No email')}</div>
                <div class="client-phone">${this.clients_formatPhone(client.phone)}</div>
                <div class="client-stats">
                    <div class="client-stat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span>${client.estimateCount} ${client.estimateCount === 1 ? 'Estimate' : 'Estimates'}</span>
                    </div>
                    <div class="client-stat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                        </svg>
                        <span>${client.jobCount} ${client.jobCount === 1 ? 'Job' : 'Jobs'}</span>
                    </div>
                    <div class="client-stat client-stat-revenue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                        </svg>
                        <span>${this.clients_formatCurrency(client.totalRevenue)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Open view modal
     */
    clients_openViewModal(clientId) {
        const client = this.state.clients.find(c => c.id === clientId);
        if (!client) return;

        this.state.selectedClient = client;

        const clientEstimates = this.state.estimates.filter(e => e.lead_id === clientId);
        const clientJobs = this.state.jobs.filter(j => j.lead_id === clientId);

        const modal = document.createElement('div');
        modal.className = 'clients-modal-overlay';
        modal.innerHTML = `
            <div class="clients-modal">
                <div class="clients-modal-header">
                    <h2 class="clients-modal-title">${this.clients_escapeHtml(client.name)}</h2>
                    <button class="clients-modal-close" data-action="close-modal">×</button>
                </div>
                <div class="clients-modal-body">
                    <!-- Client Info -->
                    <div class="clients-section">
                        <h3 class="clients-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            Lead Information
                        </h3>
                        <div class="clients-info-grid">
                            <div class="clients-info-item">
                                <label class="clients-info-label">Name</label>
                                <div class="clients-info-value">${this.clients_escapeHtml(client.name || 'N/A')}</div>
                            </div>
                            <div class="clients-info-item">
                                <label class="clients-info-label">Company</label>
                                <div class="clients-info-value">${this.clients_escapeHtml(client.company || 'N/A')}</div>
                            </div>
                            <div class="clients-info-item">
                                <label class="clients-info-label">Position</label>
                                <div class="clients-info-value">${this.clients_escapeHtml(client.position || 'N/A')}</div>
                            </div>
                            <div class="clients-info-item">
                                <label class="clients-info-label">Email</label>
                                <div class="clients-info-value">${this.clients_escapeHtml(client.email || 'N/A')}</div>
                            </div>
                            <div class="clients-info-item">
                                <label class="clients-info-label">Phone</label>
                                <div class="clients-info-value">${this.clients_formatPhone(client.phone)}</div>
                            </div>
                            <div class="clients-info-item">
                                <label class="clients-info-label">Source</label>
                                <div class="clients-info-value">${this.clients_escapeHtml(client.source || 'N/A')}</div>
                            </div>
                            <div class="clients-info-item">
                                <label class="clients-info-label">Stage</label>
                                <div class="clients-info-value">${this.clients_formatStage(client.stage)}</div>
                            </div>
                            <div class="clients-info-item">
                                <label class="clients-info-label">Potential Value</label>
                                <div class="clients-info-value">${this.clients_formatCurrency(client.potential_value || 0)}</div>
                            </div>
                            <div class="clients-info-item">
                                <label class="clients-info-label">Total Revenue</label>
                                <div class="clients-info-value revenue">${this.clients_formatCurrency(client.totalRevenue)}</div>
                            </div>
                        </div>
                        ${client.notes ? `
                            <div class="clients-info-item" style="margin-top: 1rem;">
                                <label class="clients-info-label">Notes</label>
                                <div class="clients-info-value" style="min-height: 80px; align-items: flex-start;">${this.clients_escapeHtml(client.notes)}</div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Estimates -->
                    ${clientEstimates.length > 0 ? `
                        <div class="clients-section">
                            <h3 class="clients-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                </svg>
                                Estimates (${clientEstimates.length})
                            </h3>
                            <div class="clients-items-grid">
                                ${clientEstimates.map(est => `
                                    <div class="clients-item-card" data-action="view-estimate" data-estimate-id="${est.id}">
                                        <div class="clients-item-header">
                                            <div class="clients-item-title">${this.clients_truncate(est.title || 'Untitled', 40)}</div>
                                            <span class="status-badge status-${est.status}">${est.status}</span>
                                        </div>
                                        <div class="clients-item-meta">
                                            <span class="clients-item-price">${this.clients_formatCurrency(est.total_price || 0)}</span>
                                            <span>${this.clients_getRelativeTime(est.created_at)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Jobs -->
                    ${clientJobs.length > 0 ? `
                        <div class="clients-section">
                            <h3 class="clients-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                                </svg>
                                Jobs (${clientJobs.length})
                            </h3>
                            <div class="clients-items-grid">
                                ${clientJobs.map(job => `
                                    <div class="clients-item-card" data-action="view-job" data-job-id="${job.id}">
                                        <div class="clients-item-header">
                                            <div class="clients-item-title">${this.clients_truncate(job.title || 'Untitled', 40)}</div>
                                            <span class="status-badge status-${job.status}">${job.status.replace('_', ' ')}</span>
                                        </div>
                                        <div class="clients-item-meta">
                                            <span class="clients-item-price">${this.clients_formatCurrency(job.final_price || job.quoted_price || 0)}</span>
                                            <span>${this.clients_getRelativeTime(job.created_at)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle estimate/job clicks in modal
        modal.addEventListener('click', (e) => {
            // Close on backdrop click
            if (e.target === modal) {
                this.clients_closeModal();
                return;
            }

            // Handle action clicks
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;

            switch (action) {
                case 'close-modal':
                    this.clients_closeModal();
                    break;
                case 'view-estimate':
                    this.clients_showEstimateModal(target.dataset.estimateId);
                    break;
                case 'view-job':
                    this.clients_showJobModal(target.dataset.jobId);
                    break;
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.clients_closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    },

    /**
     * Close modal
     */
    clients_closeModal() {
        const modal = document.querySelector('.clients-modal-overlay');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        }
        this.state.selectedClient = null;
    },

    /**
     * Show estimate view modal (view-only)
     */
    clients_showEstimateModal(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) return;

        // Close client modal first
        this.clients_closeModal();

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
            draft: 'var(--estimate-status-draft)',
            sent: 'var(--estimate-status-sent)',
            accepted: 'var(--estimate-status-accepted)',
            rejected: 'var(--estimate-status-rejected)',
            expired: 'var(--warning)'
        };

        const overlay = document.createElement('div');
        overlay.className = 'clients-estimate-modal-overlay';
        overlay.innerHTML = `
            <style>
                .clients-estimate-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.3);
                    
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    animation: fadeIn 0.2s ease;
                    padding: 2rem;
                }

                .clients-estimate-view-modal {
                    background: var(--surface);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 630px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: var(--shadow-modal);
                    animation: slideUp 0.3s ease;
                }

                .clients-estimate-view-header {
                    padding: 32px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .clients-estimate-view-title {
                    font-size: 28px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 12px 0;
                }

                .clients-estimate-view-meta {
                    display: flex;
                    gap: 24px;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .clients-estimate-view-meta-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 14px;
                    color: var(--text-secondary);
                }

                .clients-estimate-view-meta-item svg {
                    width: 16px;
                    height: 16px;
                }

                .clients-estimate-view-status-badge {
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

                .clients-estimate-view-status-badge svg {
                    width: 14px;
                    height: 14px;
                }

                .clients-estimate-view-close {
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

                .clients-estimate-view-close:hover {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                }

                .clients-estimate-view-body {
                    padding: 32px;
                }

                .clients-estimate-view-section {
                    margin-bottom: 32px;
                }

                .clients-estimate-view-section:last-child {
                    margin-bottom: 0;
                }

                .clients-estimate-view-section-title {
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-tertiary);
                    margin-bottom: 16px;
                }

                .clients-estimate-view-description {
                    padding: 16px;
                    background: var(--background);
                    border-radius: 8px;
                    font-size: 14px;
                    color: var(--text-primary);
                    line-height: 1.6;
                    white-space: pre-wrap;
                }

                .clients-estimate-view-line-items-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: var(--background);
                    border-radius: 8px;
                    overflow: hidden;
                }

                .clients-estimate-view-line-items-table thead {
                    background: var(--surface-hover);
                }

                .clients-estimate-view-line-items-table th {
                    padding: 12px 16px;
                    text-align: left;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-tertiary);
                }

                .clients-estimate-view-line-items-table td {
                    padding: 12px 16px;
                    font-size: 14px;
                    color: var(--text-primary);
                    border-top: 1px solid var(--border);
                }

                .clients-estimate-view-line-items-table td:last-child {
                    text-align: right;
                    font-weight: 500;
                }

                .clients-estimate-view-total-box {
                    margin-top: 16px;
                    padding: 20px;
                    background: var(--job-info-bg);
                    border: 1px solid var(--primary);
                    border-radius: 8px;
                    text-align: left;
                }

                .clients-estimate-view-total-label {
                    font-size: 14px;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                }

                .clients-estimate-view-total-value {
                    font-size: 32px;
                    font-weight: 600;
                    color: var(--primary);
                }

                .clients-estimate-view-photos-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 12px;
                }

                .clients-estimate-view-photo {
                    aspect-ratio: 1;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .clients-estimate-view-photo:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .clients-estimate-view-photo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .estimate-photo-lightbox {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.95);
                    
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10002;
                    animation: fadeIn 0.2s ease;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .estimate-photo-lightbox img {
                    max-width: 90%;
                    max-height: 90vh;
                    border-radius: 8px;
                    box-shadow: var(--shadow-modal-dark);
                }
            </style>
            <div class="clients-estimate-view-modal">
                <div class="clients-estimate-view-header">
                    <div>
                        <h2 class="clients-estimate-view-title">${this.clients_escapeHtml(estimate.title)}</h2>
                        <div class="clients-estimate-view-meta">
                            <div class="clients-estimate-view-status-badge">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    ${statusIcons[estimate.status]}
                                </svg>
                                ${this.clients_formatStatus(estimate.status)}
                            </div>
                            ${lead ? `
                                <div class="clients-estimate-view-meta-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    ${this.clients_escapeHtml(lead.name)}
                                </div>
                            ` : ''}
                            <div class="clients-estimate-view-meta-item">
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
                    <button class="clients-estimate-view-close" onclick="this.closest('.clients-estimate-modal-overlay').remove()">×</button>
                </div>

                <div class="clients-estimate-view-body">
                    ${estimate.description ? `
                        <div class="clients-estimate-view-section">
                            <div class="clients-estimate-view-section-title">Description</div>
                            <div class="clients-estimate-view-description">${this.clients_escapeHtml(estimate.description)}</div>
                        </div>
                    ` : ''}

                    ${lineItems.length > 0 ? `
                        <div class="clients-estimate-view-section">
                            <div class="clients-estimate-view-section-title">Line Items</div>
                            <table class="clients-estimate-view-line-items-table">
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
                                            <td>${this.clients_escapeHtml(item.description || '-')}</td>
                                            <td>${item.quantity}</td>
                                            <td>${this.clients_formatCurrency(item.rate)}</td>
                                            <td style="text-align: right;">${this.clients_formatCurrency(item.quantity * item.rate)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="clients-estimate-view-total-box">
                                <div class="clients-estimate-view-total-label">Total Estimate</div>
                                <div class="clients-estimate-view-total-value">${this.clients_formatCurrency(totalPrice)}</div>
                            </div>
                        </div>
                    ` : ''}

                    ${photos.length > 0 ? `
                        <div class="clients-estimate-view-section">
                            <div class="clients-estimate-view-section-title">Photos (${photos.length})</div>
                            <div class="clients-estimate-view-photos-grid">
                                ${photos.map(photo => `
                                    <div class="clients-estimate-view-photo">
                                        <img src="${photo.url}" alt="${this.clients_escapeHtml(photo.caption || 'Photo')}">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${estimate.terms ? `
                        <div class="clients-estimate-view-section">
                            <div class="clients-estimate-view-section-title">Terms & Conditions</div>
                            <div class="clients-estimate-view-description">${this.clients_escapeHtml(estimate.terms)}</div>
                        </div>
                    ` : ''}

                    ${estimate.notes ? `
                        <div class="clients-estimate-view-section">
                            <div class="clients-estimate-view-section-title">Internal Notes</div>
                            <div class="clients-estimate-view-description">${this.clients_escapeHtml(estimate.notes)}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Photo click to enlarge
        overlay.querySelectorAll('.clients-estimate-view-photo img').forEach(img => {
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

        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    },

    /**
     * Show job view modal (view-only)
     */
    clients_showJobModal(jobId) {
        const job = this.state.jobs.find(j => j.id === jobId);
        if (!job) return;

        // Close client modal first
        this.clients_closeModal();

        const lead = this.state.leads.find(l => l.id === job.lead_id);
        const materials = job.materials || [];
        const crew = job.crew_members || [];
        const photos = job.photos || [];
        const revenue = job.final_price || job.quoted_price || 0;
        const materialCost = job.material_cost || 0;
        const laborCost = (job.labor_rate || 0) * (job.estimated_labor_hours || 0);
        const otherExpenses = job.other_expenses || 0;
        const totalCost = materialCost + laborCost + otherExpenses;
        const profit = revenue - totalCost;
        const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

        const statusMap = {
            draft: 'Draft',
            scheduled: 'Scheduled',
            in_progress: 'In Progress',
            completed: 'Completed',
            invoiced: 'Invoiced',
            paid: 'Paid',
            cancelled: 'Cancelled'
        };

        const overlay = document.createElement('div');
        overlay.className = 'clients-job-modal-overlay';
        overlay.innerHTML = `
            <style>
                .clients-job-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.3);
                    
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    animation: fadeIn 0.2s ease;
                    padding: 2rem;
                }

                .clients-job-view-modal {
                    background: var(--surface);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: var(--shadow-modal);
                    animation: scaleIn 0.2s ease;
                }

                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .clients-job-view-header {
                    padding: 32px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .clients-job-view-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 12px 0;
                }

                .clients-job-view-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    align-items: center;
                }

                .clients-job-view-status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-radius: 999px;
                    font-size: 14px;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .clients-job-view-status-badge[data-status="draft"] {
                    background: var(--surface-hover);
                    color: var(--text-secondary);
                }

                .clients-job-view-status-badge[data-status="scheduled"] {
                    background: var(--warning-bg);
                    color: var(--warning);
                }

                .clients-job-view-status-badge[data-status="in_progress"] {
                    background: var(--info-bg);
                    color: var(--info);
                }

                .clients-job-view-status-badge[data-status="completed"] {
                    background: var(--success-bg);
                    color: var(--success);
                }

                .clients-job-view-status-badge[data-status="invoiced"] {
                    background: var(--primary-bg);
                    color: var(--primary);
                }

                .clients-job-view-status-badge[data-status="paid"] {
                    background: var(--success-bg);
                    color: var(--success);
                }

                .clients-job-view-status-badge[data-status="cancelled"] {
                    background: var(--danger-bg);
                    color: var(--danger);
                }

                .clients-job-view-meta-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    color: var(--text-secondary);
                }

                .clients-job-view-close {
                    background: transparent;
                    border: none;
                    color: var(--text-tertiary);
                    font-size: 32px;
                    cursor: pointer;
                    padding: 0;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .clients-job-view-close:hover {
                    background: var(--border);
                    color: var(--text-primary);
                }

                .clients-job-view-body {
                    padding: 32px;
                }

                .clients-job-view-section {
                    margin-bottom: 32px;
                }

                .clients-job-view-section:last-child {
                    margin-bottom: 0;
                }

                .clients-job-view-section-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 16px;
                    padding-bottom: 8px;
                    border-bottom: 2px solid var(--border);
                }

                .clients-job-view-description {
                    font-size: 15px;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }

                .clients-job-view-financial-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .clients-job-view-financial-item {
                    background: var(--background);
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                }

                .clients-job-view-financial-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }

                .clients-job-view-financial-value {
                    font-size: 24px;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .clients-job-view-financial-value.profit {
                    color: var(--success);
                }

                .clients-job-view-financial-value.loss {
                    color: var(--danger);
                }

                .clients-job-view-profit-box {
                    background: var(--job-profit-gradient);
                    border: 2px solid var(--job-btn-shadow);
                    border-radius: 12px;
                    padding: 24px;
                }

                .clients-job-view-profit-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    font-size: 15px;
                }

                .clients-job-view-profit-row span:first-child {
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .clients-job-view-profit-row span:last-child {
                    color: var(--text-primary);
                    font-weight: 700;
                }

                .clients-job-view-profit-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 12px 0;
                }

                .clients-job-view-profit-total {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 0;
                    font-size: 18px;
                }

                .clients-job-view-profit-total span:first-child {
                    color: var(--text-primary);
                    font-weight: 700;
                }

                .clients-job-view-profit-total span:last-child {
                    font-size: 28px;
                    font-weight: 800;
                    color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'};
                }

                .clients-job-view-materials-list,
                .clients-job-view-crew-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .clients-job-view-materials-list li,
                .clients-job-view-crew-list li {
                    padding: 12px;
                    background: var(--background);
                    border-radius: 6px;
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .clients-job-view-photos-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 12px;
                }

                .clients-job-view-photo {
                    aspect-ratio: 1;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .clients-job-view-photo:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .clients-job-view-photo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .job-photo-lightbox {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.95);
                    
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10002;
                    animation: fadeIn 0.2s ease;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .job-photo-lightbox img {
                    max-width: 90%;
                    max-height: 90vh;
                    border-radius: 8px;
                    box-shadow: var(--shadow-modal-dark);
                }
            </style>
            <div class="clients-job-view-modal">
                <div class="clients-job-view-header">
                    <div>
                        <h2 class="clients-job-view-title">${this.clients_escapeHtml(job.title)}</h2>
                        <div class="clients-job-view-meta">
                            <div class="clients-job-view-status-badge" data-status="${job.status}">
                                ${statusMap[job.status] || job.status}
                            </div>
                            ${lead ? `
                                <div class="clients-job-view-meta-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    ${this.clients_escapeHtml(lead.name)}
                                </div>
                            ` : ''}
                            ${job.start_date ? `
                                <div class="clients-job-view-meta-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    ${new Date(job.start_date).toLocaleDateString()}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <button class="clients-job-view-close" onclick="this.closest('.clients-job-modal-overlay').remove()">×</button>
                </div>

                <div class="clients-job-view-body">
                    ${job.description ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Description</div>
                            <div class="clients-job-view-description">${this.clients_escapeHtml(job.description)}</div>
                        </div>
                    ` : ''}

                    <div class="clients-job-view-section">
                        <div class="clients-job-view-section-title">Financials</div>
                        <div class="clients-job-view-financial-grid">
                            <div class="clients-job-view-financial-item">
                                <div class="clients-job-view-financial-label">Revenue</div>
                                <div class="clients-job-view-financial-value">${this.clients_formatCurrency(revenue)}</div>
                            </div>
                            <div class="clients-job-view-financial-item">
                                <div class="clients-job-view-financial-label">Total Cost</div>
                                <div class="clients-job-view-financial-value">${this.clients_formatCurrency(totalCost)}</div>
                            </div>
                            <div class="clients-job-view-financial-item">
                                <div class="clients-job-view-financial-label">Profit</div>
                                <div class="clients-job-view-financial-value ${profit >= 0 ? 'profit' : 'loss'}">
                                    ${this.clients_formatCurrency(profit)}
                                </div>
                            </div>
                            <div class="clients-job-view-financial-item">
                                <div class="clients-job-view-financial-label">Margin</div>
                                <div class="clients-job-view-financial-value ${profitMargin >= 0 ? 'profit' : 'loss'}">
                                    ${profitMargin.toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        <div class="clients-job-view-profit-box">
                            <div class="clients-job-view-profit-row">
                                <span>Material Cost</span>
                                <span>${this.clients_formatCurrency(materialCost)}</span>
                            </div>
                            <div class="clients-job-view-profit-row">
                                <span>Labor Cost</span>
                                <span>${this.clients_formatCurrency(laborCost)}</span>
                            </div>
                            <div class="clients-job-view-profit-row">
                                <span>Other Expenses</span>
                                <span>${this.clients_formatCurrency(otherExpenses)}</span>
                            </div>
                            <div class="clients-job-view-profit-divider"></div>
                            <div class="clients-job-view-profit-total">
                                <span>Net Profit</span>
                                <span>${this.clients_formatCurrency(profit)}</span>
                            </div>
                        </div>
                    </div>

                    ${materials.length > 0 ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Materials (${materials.length})</div>
                            <ul class="clients-job-view-materials-list">
                                ${materials.map(m => `
                                    <li>
                                        <span>${this.clients_escapeHtml(m.name)}</span>
                                        <span>${this.clients_formatCurrency(m.cost)}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${crew.length > 0 ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Crew Members (${crew.length})</div>
                            <ul class="clients-job-view-crew-list">
                                ${crew.map(c => `
                                    <li>
                                        <span>${this.clients_escapeHtml(c.name)}</span>
                                        <span>${this.clients_escapeHtml(c.role || 'Worker')}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${photos.length > 0 ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Photos (${photos.length})</div>
                            <div class="clients-job-view-photos-grid">
                                ${photos.map(photo => `
                                    <div class="clients-job-view-photo">
                                        <img src="${photo.url}" alt="${this.clients_escapeHtml(photo.caption || 'Photo')}">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${job.notes ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Notes</div>
                            <div class="clients-job-view-description">${this.clients_escapeHtml(job.notes)}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Photo click to enlarge
        overlay.querySelectorAll('.clients-job-view-photo img').forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                const lightbox = document.createElement('div');
                lightbox.className = 'job-photo-lightbox';
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

        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    },

    /**
     * Show error
     */
    clients_showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--danger);">
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    },

    // ==================== UTILITY FUNCTIONS ====================

    clients_formatCurrency(amount) {
        if (!amount || isNaN(amount)) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    clients_formatPhone(phone) {
        if (!phone) return 'N/A';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    },

    clients_escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    clients_truncate(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    clients_getRelativeTime(date) {
        if (!date) return 'N/A';
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return new Date(date).toLocaleDateString();
    },

    clients_formatStage(stage) {
        if (!stage) return 'N/A';
        const stageMap = {
            'new': 'New',
            'contacted': 'Contacted',
            'qualified': 'Qualified',
            'negotiation': 'Negotiation',
            'closed': 'Closed Won',
            'lost': 'Closed Lost'
        };
        return stageMap[stage] || stage.charAt(0).toUpperCase() + stage.slice(1);
    },

    clients_formatStatus(status) {
        if (!status) return 'N/A';
        const statusMap = {
            'draft': 'Draft',
            'sent': 'Sent',
            'accepted': 'Accepted',
            'rejected': 'Rejected',
            'expired': 'Expired'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }
};

console.log('[Clients] Module loaded');
