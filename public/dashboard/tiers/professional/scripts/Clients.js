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

        // Show loading state
        this.renderLoading();

        // Load data
        await this.loadData();

        // Render the module
        this.render();
    },

    /**
     * Load all data (leads, estimates, jobs)
     */
    async loadData() {
        try {
            this.state.loading = true;

            // Fetch all data in parallel
            const [leads, estimates, jobs] = await Promise.all([
                API.getLeads(),
                API.getEstimates(),
                API.getJobs()
            ]);

            this.state.estimates = estimates || [];
            this.state.jobs = jobs || [];

            // Filter leads to only include those with estimates or jobs
            const leadsWithProjects = (leads || []).filter(lead => {
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
                    totalRevenue: totalRevenue,
                    estimates: clientEstimates,
                    jobs: clientJobs
                };
            });

            this.state.filteredClients = [...this.state.clients];
            this.state.loading = false;

            console.log(`[Clients] Loaded ${this.state.clients.length} clients`);
        } catch (error) {
            console.error('[Clients] Error loading data:', error);
            this.state.loading = false;
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
     * Render loading state
     */
    renderLoading() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="clients-container">
                <div class="clients-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading clients...</p>
                </div>
            </div>
        `;
    },

    /**
     * Render the full module
     */
    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

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

            <!-- View Modal -->
            <div id="clientViewModal" class="modal-overlay" style="display: none;">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3 class="modal-title" id="viewModalTitle">Client Details</h3>
                        <button class="modal-close" id="closeViewModal">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body" id="viewModalBody">
                        <!-- Populated when viewing a client -->
                    </div>
                </div>
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
     * Open view modal for a specific client
     */
    openViewModal(clientId) {
        const client = this.state.clients.find(c => c.id === clientId);
        if (!client) return;

        this.state.selectedClient = client;

        const modal = document.getElementById('clientViewModal');
        const modalBody = document.getElementById('viewModalBody');
        const modalTitle = document.getElementById('viewModalTitle');

        if (!modal || !modalBody || !modalTitle) return;

        modalTitle.textContent = client.name || 'Client Details';

        // Get recent estimates and jobs
        const recentEstimates = client.estimates
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);

        const recentJobs = client.jobs
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);

        // Calculate job stats
        const completedJobs = client.jobs.filter(j => j.status === 'completed' || j.status === 'paid').length;
        const activeJobs = client.jobs.filter(j => j.status === 'in_progress' || j.status === 'scheduled').length;

        modalBody.innerHTML = `
            <!-- Contact Information -->
            <div class="view-section">
                <div class="view-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    <h4>Contact Information</h4>
                </div>
                <div class="view-section-content">
                    <div class="info-row">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${this.escapeHtml(client.email || 'Not provided')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Phone:</span>
                        <span class="info-value">${this.formatPhone(client.phone)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Address:</span>
                        <span class="info-value">${this.formatAddress(client)}</span>
                    </div>
                </div>
            </div>

            <!-- Project Summary -->
            <div class="view-section">
                <div class="view-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                    </svg>
                    <h4>Project Summary</h4>
                </div>
                <div class="view-section-content">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-label">Total Estimates</div>
                            <div class="summary-value">${client.estimateCount}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Total Jobs</div>
                            <div class="summary-value">${client.jobCount}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Completed Jobs</div>
                            <div class="summary-value">${completedJobs}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Active Jobs</div>
                            <div class="summary-value">${activeJobs}</div>
                        </div>
                        <div class="summary-item summary-item-revenue">
                            <div class="summary-label">Total Revenue</div>
                            <div class="summary-value">${this.formatCurrency(client.totalRevenue)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Estimates -->
            ${client.estimates.length > 0 ? `
                <div class="view-section">
                    <div class="view-section-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <h4>Recent Estimates</h4>
                    </div>
                    <div class="view-section-content">
                        ${recentEstimates.map(est => `
                            <div class="list-item">
                                <div class="list-item-left">
                                    <div class="list-item-title">${this.escapeHtml(est.title || 'Untitled')}</div>
                                    <div class="list-item-meta">${this.formatCurrency(est.total_price)} • ${this.getRelativeTime(est.created_at)}</div>
                                </div>
                                <div class="list-item-right">
                                    <span class="status-badge status-${est.status}">${this.formatStatus(est.status)}</span>
                                </div>
                            </div>
                        `).join('')}
                        ${client.estimates.length > 3 ? `
                            <div class="view-more">
                                And ${client.estimates.length - 3} more estimate${client.estimates.length - 3 !== 1 ? 's' : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Recent Jobs -->
            ${client.jobs.length > 0 ? `
                <div class="view-section">
                    <div class="view-section-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                        </svg>
                        <h4>Recent Jobs</h4>
                    </div>
                    <div class="view-section-content">
                        ${recentJobs.map(job => `
                            <div class="list-item">
                                <div class="list-item-left">
                                    <div class="list-item-title">${this.escapeHtml(job.title || 'Untitled')}</div>
                                    <div class="list-item-meta">${this.formatCurrency(job.final_price || job.quoted_price || 0)} • ${this.getRelativeTime(job.created_at)}</div>
                                </div>
                                <div class="list-item-right">
                                    <span class="status-badge status-${job.status}">${this.formatStatus(job.status)}</span>
                                </div>
                            </div>
                        `).join('')}
                        ${client.jobs.length > 3 ? `
                            <div class="view-more">
                                And ${client.jobs.length - 3} more job${client.jobs.length - 3 !== 1 ? 's' : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        `;

        modal.style.display = 'flex';
    },

    /**
     * Close view modal
     */
    closeViewModal() {
        const modal = document.getElementById('clientViewModal');
        if (modal) {
            modal.style.display = 'none';
            this.state.selectedClient = null;
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

        // Client card clicks
        document.querySelectorAll('.client-card').forEach(card => {
            card.addEventListener('click', () => {
                const clientId = card.getAttribute('data-client-id');
                this.openViewModal(clientId);
            });
        });

        // Close modal button
        const closeModalBtn = document.getElementById('closeViewModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeViewModal());
        }

        // Close modal on overlay click
        const modal = document.getElementById('clientViewModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeViewModal();
                }
            });
        }

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.selectedClient) {
                this.closeViewModal();
            }
        });
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

                /* Loading */
                .clients-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    color: var(--text-secondary);
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
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
                    background: var(--surface-primary);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 1.5rem;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                }

                .client-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
                    border-color: var(--primary);
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

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 2rem;
                }

                .modal-content {
                    background: var(--surface-primary);
                    border-radius: 12px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                }

                .modal-large {
                    max-width: 800px;
                }

                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                }

                .modal-close {
                    width: 32px;
                    height: 32px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: background-color 0.2s ease;
                }

                .modal-close:hover {
                    background: var(--surface-secondary);
                }

                .modal-close svg {
                    width: 20px;
                    height: 20px;
                    stroke: currentColor;
                }

                .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                }

                /* View Section */
                .view-section {
                    margin-bottom: 2rem;
                }

                .view-section:last-child {
                    margin-bottom: 0;
                }

                .view-section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 2px solid var(--border);
                }

                .view-section-header svg {
                    width: 20px;
                    height: 20px;
                    stroke: var(--primary);
                }

                .view-section-header h4 {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                }

                .view-section-content {
                    padding-left: 2rem;
                }

                /* Info Rows */
                .info-row {
                    display: flex;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid var(--border);
                }

                .info-row:last-child {
                    border-bottom: none;
                }

                .info-label {
                    font-weight: 600;
                    color: var(--text-secondary);
                    min-width: 100px;
                }

                .info-value {
                    color: var(--text-primary);
                }

                /* Summary Grid */
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 1rem;
                }

                .summary-item {
                    background: var(--surface-secondary);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 1rem;
                    text-align: center;
                }

                .summary-item-revenue {
                    grid-column: span 2;
                }

                .summary-label {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .summary-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .summary-item-revenue .summary-value {
                    color: var(--success);
                }

                /* List Items */
                .list-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: var(--surface-secondary);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    margin-bottom: 0.75rem;
                }

                .list-item:last-child {
                    margin-bottom: 0;
                }

                .list-item-left {
                    flex: 1;
                }

                .list-item-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .list-item-meta {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .list-item-right {
                    margin-left: 1rem;
                }

                /* Status Badges */
                .status-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .status-draft {
                    background: rgba(156, 163, 175, 0.2);
                    color: #6b7280;
                }

                .status-sent, .status-scheduled {
                    background: rgba(59, 130, 246, 0.2);
                    color: #3b82f6;
                }

                .status-accepted, .status-completed, .status-paid {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                }

                .status-rejected {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                .status-in_progress {
                    background: rgba(245, 158, 11, 0.2);
                    color: #f59e0b;
                }

                /* View More */
                .view-more {
                    text-align: center;
                    padding: 0.75rem;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    font-style: italic;
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

                    .summary-item-revenue {
                        grid-column: span 1;
                    }
                }
            </style>
        `;
    }
};
