/**
 * CLIENTS MODULE - Visual dashboard for client relationships
 * Read-only view showing clients with their project history
 * Accessible only through Jobs Hub
 */

window.ClientsModule = {
    state: {
        container: 'clients-content',
        clients: [],
        filteredClients: [],
        estimates: [],
        jobs: [],
        loading: false,
        searchQuery: '',
        selectedClient: null
    },

    /**
     * Initialize the Clients module
     */
    async init(targetContainer = 'clients-content') {
        console.log('[Clients] Initializing...');
        this.state.container = targetContainer;

        const container = document.getElementById(this.state.container);
        if (!container) {
            console.error('[Clients] Container not found');
            return;
        }

        // Show loading state (fade out)
        this.showLoading();

        try {
            // Load data
            await this.loadData();

            // Render the module
            this.render();
        } catch (error) {
            console.error('[Clients] Init error:', error);
            this.showError('Failed to load clients');
        }
    },

    /**
     * Load all data (leads, estimates, jobs)
     */
    async loadData() {
        try {
            console.log('[Clients] Fetching data...');

            // Fetch all data in parallel
            const [leads, estimates, jobs] = await Promise.all([
                API.getLeads(),
                API.getEstimates(),
                API.getJobs()
            ]);

            console.log('[Clients] Raw data:', {
                leads: leads?.all?.length || 0,
                estimates: estimates?.length || 0,
                jobs: jobs?.length || 0
            });

            this.state.estimates = Array.isArray(estimates) ? estimates : [];
            this.state.jobs = Array.isArray(jobs) ? jobs : [];

            // Filter leads to only include those with estimates or jobs
            // API.getLeads() returns { cold, warm, all }, so use leads.all
            const allLeads = Array.isArray(leads?.all) ? leads.all : [];
            const leadsWithProjects = allLeads.filter(lead => {
                const hasEstimates = this.state.estimates.some(est => est.lead_id === lead.id);
                const hasJobs = this.state.jobs.some(job => job.lead_id === lead.id);
                return hasEstimates || hasJobs;
            });

            console.log('[Clients] Leads with projects:', leadsWithProjects.length);

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
                    totalRevenue: totalRevenue,
                    estimates: clientEstimates,
                    jobs: clientJobs
                };
            });

            this.state.filteredClients = [...this.state.clients];

            console.log(`[Clients] ✅ Loaded ${this.state.clients.length} clients with projects`);
        } catch (error) {
            console.error('[Clients] ❌ Error loading data:', error);
            throw error;
        }
    },

    /**
     * Calculate stats for display
     */
    calculateStats() {
        const totalClients = this.state.clients.length;
        const totalJobs = this.state.jobs.length;
        const totalEstimates = this.state.estimates.length;

        return { totalClients, totalJobs, totalEstimates };
    },

    /**
     * Filter clients by search query
     */
    filterClients(query) {
        this.state.searchQuery = query.toLowerCase();

        if (!this.state.searchQuery) {
            this.state.filteredClients = [...this.state.clients];
        } else {
            this.state.filteredClients = this.state.clients.filter(client => {
                const name = (client.name || '').toLowerCase();
                const email = (client.email || '').toLowerCase();
                const phone = (client.phone || '').toLowerCase();

                return name.includes(this.state.searchQuery) ||
                       email.includes(this.state.searchQuery) ||
                       phone.includes(this.state.searchQuery);
            });
        }

        // Re-render client cards
        this.renderClientCards();
    },

    /**
     * Show loading state (fade out pattern like Estimates)
     */
    showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.style.opacity = '0';
            container.innerHTML = `<div style="min-height: 400px;"></div>`;
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.removeAttribute('style');
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--danger);">
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    },

    /**
     * Render the full module
     */
    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Clear any lingering inline styles (removes opacity, makes it fade in)
        container.removeAttribute('style');

        const stats = this.calculateStats();

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="clients-container">
                <!-- Header -->
                <div class="clients-header">
                    <h2 class="clients-title">Client Overview</h2>
                    <p class="clients-subtitle">Track your clients and their project history</p>
                </div>

                <!-- Stats Cards -->
                <div class="clients-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                                <path d="M16 3.13a4 4 0 010 7.75"/>
                            </svg>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Total Clients</div>
                            <div class="stat-value">${stats.totalClients}</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon stat-icon-jobs">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                            </svg>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Total Jobs</div>
                            <div class="stat-value">${stats.totalJobs}</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon stat-icon-estimates">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Total Estimates</div>
                            <div class="stat-value">${stats.totalEstimates}</div>
                        </div>
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="clients-toolbar">
                    <div class="search-container">
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            type="text"
                            id="clientSearch"
                            class="search-input"
                            placeholder="Search clients by name, email, or phone..."
                            value="${this.state.searchQuery}"
                        />
                    </div>
                </div>

                <!-- Client Cards Container -->
                <div id="clientCardsContainer" class="clients-grid">
                    ${this.renderClientCardsHTML()}
                </div>

                <!-- Empty State -->
                ${this.state.filteredClients.length === 0 ? this.renderEmptyState() : ''}
            </div>
        `;

        this.attachEventListeners();
    },

    /**
     * Render client cards HTML
     */
    renderClientCardsHTML() {
        if (this.state.filteredClients.length === 0) {
            return '';
        }

        return this.state.filteredClients.map(client => `
            <div class="client-card" data-client-id="${client.id}">
                <div class="client-card-header">
                    <div class="client-name">${this.escapeHtml(client.name || 'Unknown')}</div>
                    <div class="client-phone">${this.formatPhone(client.phone)}</div>
                </div>
                <div class="client-email">${this.escapeHtml(client.email || 'No email')}</div>
                <div class="client-divider"></div>
                <div class="client-stats">
                    <div class="client-stat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span>${client.estimateCount} Estimate${client.estimateCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="client-stat-divider">•</div>
                    <div class="client-stat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                        </svg>
                        <span>${client.jobCount} Job${client.jobCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="client-stat-divider">•</div>
                    <div class="client-stat client-stat-revenue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                        </svg>
                        <span>${this.formatCurrency(client.totalRevenue)} Revenue</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Re-render just the client cards
     */
    renderClientCards() {
        const container = document.getElementById('clientCardsContainer');
        if (!container) return;

        container.innerHTML = this.renderClientCardsHTML();

        // Reattach click listeners to client cards
        document.querySelectorAll('.client-card').forEach(card => {
            card.addEventListener('click', () => {
                const clientId = card.getAttribute('data-client-id');
                this.openViewModal(clientId);
            });
        });
    },

    /**
     * Render empty state
     */
    renderEmptyState() {
        if (this.state.searchQuery) {
            return `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <h3>No clients found</h3>
                    <p>No clients match your search "${this.escapeHtml(this.state.searchQuery)}"</p>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                        <path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    <h3>No clients yet</h3>
                    <p>Clients will appear here once you create estimates or jobs for your leads.</p>
                </div>
            `;
        }
    },


    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Search input
        const searchInput = document.getElementById('clientSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterClients(e.target.value);
            });
        }
    },

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Format currency
     */
    formatCurrency(amount) {
        if (!amount || isNaN(amount)) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * Format phone number
     */
    formatPhone(phone) {
        if (!phone) return 'Not provided';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    },

    /**
     * Format address
     */
    formatAddress(client) {
        const parts = [];
        if (client.address) parts.push(client.address);
        if (client.city) parts.push(client.city);
        if (client.state) parts.push(client.state);
        if (client.zip) parts.push(client.zip);

        if (parts.length === 0) return 'Not provided';

        // Format: "123 Main St, Minneapolis, MN 55401"
        if (parts.length === 4) {
            return `${parts[0]}, ${parts[1]}, ${parts[2]} ${parts[3]}`;
        }

        return parts.join(', ');
    },

    /**
     * Format status for display
     */
    formatStatus(status) {
        if (!status) return 'Unknown';
        return status.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    },

    /**
     * Get relative time (e.g., "2 days ago")
     */
    getRelativeTime(dateString) {
        if (!dateString) return 'Unknown';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
        return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Render styles
     */
    renderStyles() {
        return `
            <style>
                /* Container fade-in transition */
                #clients-content,
                #jobs-section-content {
                    transition: opacity 0.6s ease-in-out;
                }

                /* Container */
                .clients-container {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                /* Header */
                .clients-header {
                    margin-bottom: 2rem;
                }

                .clients-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .clients-subtitle {
                    font-size: 1rem;
                    color: var(--text-secondary);
                }

                /* Stats Cards */
                .clients-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    background: var(--surface-primary);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .stat-icon-jobs {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }

                .stat-icon-estimates {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                }

                .stat-icon svg {
                    width: 24px;
                    height: 24px;
                    stroke: white;
                }

                .stat-content {
                    flex: 1;
                }

                .stat-label {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.25rem;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                /* Toolbar */
                .clients-toolbar {
                    margin-bottom: 1.5rem;
                }

                .search-container {
                    position: relative;
                    max-width: 500px;
                }

                .search-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 20px;
                    height: 20px;
                    stroke: var(--text-secondary);
                    pointer-events: none;
                }

                .search-input {
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 3rem;
                    background: var(--surface-primary);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    transition: border-color 0.2s ease;
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                /* Client Cards Grid */
                .clients-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 1.5rem;
                }

                .client-card {
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    padding: 1.5rem;
                }

                .client-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.5rem;
                }

                .client-name {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .client-phone {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .client-email {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                }

                .client-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 1rem 0;
                }

                .client-stats {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
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
                    stroke: var(--text-secondary);
                }

                .client-stat-revenue {
                    color: var(--success);
                    font-weight: 600;
                }

                .client-stat-revenue svg {
                    stroke: var(--success);
                }

                .client-stat-divider {
                    color: var(--border);
                }

                /* Empty State */
                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--text-secondary);
                }

                .empty-state svg {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1.5rem;
                    stroke: var(--text-secondary);
                    opacity: 0.5;
                }

                .empty-state h3 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .empty-state p {
                    font-size: 1rem;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .clients-container {
                        padding: 1rem;
                    }

                    .clients-stats {
                        grid-template-columns: 1fr;
                    }

                    .clients-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;
    }
};
