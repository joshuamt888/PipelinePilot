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
                    <div class="clients-stat-card">
                        <div class="clients-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                                <path d="M16 3.13a4 4 0 010 7.75"/>
                            </svg>
                        </div>
                        <div class="clients-stat-content">
                            <div class="clients-stat-label">Total Clients</div>
                            <div class="clients-stat-value">${stats.totalClients}</div>
                        </div>
                    </div>

                    <div class="clients-stat-card">
                        <div class="clients-stat-icon clients-stat-icon-jobs">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                            </svg>
                        </div>
                        <div class="clients-stat-content">
                            <div class="clients-stat-label">Total Jobs</div>
                            <div class="clients-stat-value">${stats.totalJobs}</div>
                        </div>
                    </div>

                    <div class="clients-stat-card">
                        <div class="clients-stat-icon clients-stat-icon-estimates">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                        </div>
                        <div class="clients-stat-content">
                            <div class="clients-stat-label">Total Estimates</div>
                            <div class="clients-stat-value">${stats.totalEstimates}</div>
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
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="viewModalTitle">Client Details</h3>
                        <button class="modal-close" id="closeViewModal">×</button>
                    </div>
                    <div class="modal-body" id="viewModalBody">
                        <!-- Populated when viewing a client -->
                    </div>
                </div>
            </div>
        `;

        // Wait for browser to parse CSS, then trigger fade-in
        requestAnimationFrame(() => {
            container.removeAttribute('style');
        });

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
     * Open view modal for a client
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

        modalBody.innerHTML = `
            <div class="client-modal-content">
                <!-- Contact Info -->
                <div class="modal-section">
                    <div class="modal-section-title">Contact Information</div>
                    <div class="contact-info">
                        ${client.email ? `<div class="contact-item"><strong>Email:</strong> ${this.escapeHtml(client.email)}</div>` : ''}
                        ${client.phone ? `<div class="contact-item"><strong>Phone:</strong> ${this.formatPhone(client.phone)}</div>` : ''}
                        ${client.address ? `<div class="contact-item"><strong>Address:</strong> ${this.formatAddress(client)}</div>` : ''}
                    </div>
                </div>

                <!-- Estimates Section -->
                ${client.estimates.length > 0 ? `
                    <div class="modal-section">
                        <div class="modal-section-title">Estimates (${client.estimates.length})</div>
                        <div class="clients-item-cards">
                            ${client.estimates.map(est => `
                                <div class="clients-item-card" data-estimate-id="${est.id}">
                                    <div class="clients-item-card-header">
                                        <div class="clients-item-card-title">${this.truncateText(est.title || 'Untitled', 35)}</div>
                                        <span class="status-badge status-${est.status}">${this.formatStatus(est.status)}</span>
                                    </div>
                                    <div class="clients-item-card-meta">
                                        <span class="clients-item-price">${this.formatCurrency(est.total_price)}</span>
                                        <span class="clients-item-date">${this.getRelativeTime(est.created_at)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Jobs Section -->
                ${client.jobs.length > 0 ? `
                    <div class="modal-section">
                        <div class="modal-section-title">Jobs (${client.jobs.length})</div>
                        <div class="clients-item-cards">
                            ${client.jobs.map(job => `
                                <div class="clients-item-card" data-job-id="${job.id}">
                                    <div class="clients-item-card-header">
                                        <div class="clients-item-card-title">${this.truncateText(job.title || 'Untitled', 35)}</div>
                                        <span class="status-badge status-${job.status}">${this.formatStatus(job.status)}</span>
                                    </div>
                                    <div class="clients-item-card-meta">
                                        <span class="clients-item-price">${this.formatCurrency(job.final_price || job.quoted_price || 0)}</span>
                                        <span class="clients-item-date">${this.getRelativeTime(job.created_at)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Add click handlers for estimate/job cards
        modalBody.querySelectorAll('.clients-item-card[data-estimate-id]').forEach(card => {
            card.addEventListener('click', () => {
                const estimateId = card.getAttribute('data-estimate-id');
                // Don't hide client modal - let view modal layer on top with higher z-index
                this.clients_showEstimateViewModal(estimateId);
            });
        });

        modalBody.querySelectorAll('.clients-item-card[data-job-id]').forEach(card => {
            card.addEventListener('click', () => {
                const jobId = card.getAttribute('data-job-id');
                // Don't hide client modal - let view modal layer on top with higher z-index
                this.clients_showJobViewModal(jobId);
            });
        });

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
     * Truncate text to max length with ellipsis
     */
    truncateText(text, maxLength) {
        if (!text) return '';
        const escaped = this.escapeHtml(text);
        if (escaped.length <= maxLength) return escaped;
        return escaped.substring(0, maxLength) + '...';
    },

    // ==================== CONSTANTS ====================

    ESTIMATE_STATUSES: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    JOB_STATUSES: ['draft', 'scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled'],

    // ==================== VIEW MODAL FUNCTIONS ====================

    /**
     * Show estimate view modal (clients version)
     */
    clients_showEstimateViewModal(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) return;

        // Clean up any existing modals first
        const existingModals = document.querySelectorAll('.clients-estimate-modal-overlay, .clients-estimate-confirm-overlay');
        existingModals.forEach(m => m.remove());

        const lead = this.state.clients.find(c => c.id === estimate.lead_id);
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
        overlay.className = 'clients-estimate-modal-overlay';
        overlay.innerHTML = `
            <style>
                .clients-estimate-modal-overlay {
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

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .clients-estimate-view-modal {
                    background: var(--surface);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 630px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideUp 0.3s ease;
                }

                .clients-estimate-view-header {
                    padding: 32px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .clients-estimate-view-header-left {
                    flex: 1;
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
                    background: rgba(59, 130, 246, 0.05);
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

                .clients-estimate-photo-lightbox {
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

                .clients-estimate-photo-lightbox img {
                    max-width: 90%;
                    max-height: 90vh;
                    border-radius: 8px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }

                .clients-estimate-view-photo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .clients-estimate-view-footer {
                    padding: 24px 32px;
                    border-top: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                }

                .clients-estimate-view-actions {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .clients-estimate-view-btn {
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

                .clients-estimate-view-btn svg {
                    width: 16px;
                    height: 16px;
                }

                .clients-estimate-view-btn-edit {
                    background: var(--primary);
                    color: white;
                }

                .clients-estimate-view-btn-edit:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }

                .clients-estimate-view-btn-download {
                    background: #10b981;
                    color: white;
                }

                .clients-estimate-view-btn-download:hover {
                    background: #059669;
                    transform: translateY(-1px);
                }

                .clients-estimate-view-btn-delete {
                    background: transparent;
                    border: 1px solid #ef4444;
                    color: #ef4444;
                }

                .clients-estimate-view-btn-delete:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                .clients-estimate-view-status-dropdown {
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

                .clients-estimate-view-status-dropdown:hover {
                    border-color: var(--primary);
                }

                .clients-estimate-view-status-dropdown:focus {
                    outline: none;
                    border-color: var(--primary);
                }
            </style>
            <div class="clients-estimate-view-modal">
                <div class="clients-estimate-view-header">
                    <div class="clients-estimate-view-header-left">
                        <h2 class="clients-estimate-view-title">${estimate.title}</h2>
                        <div class="clients-estimate-view-meta">
                            <div class="clients-estimate-view-status-badge">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    ${statusIcons[estimate.status]}
                                </svg>
                                ${this.formatStatus(estimate.status)}
                            </div>
                            ${lead ? `
                                <div class="clients-estimate-view-meta-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    ${lead.name}
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
                    <button class="clients-estimate-view-close" data-action="close-view-modal">×</button>
                </div>

                <div class="clients-estimate-view-body">
                    ${estimate.description ? `
                        <div class="clients-estimate-view-section">
                            <div class="clients-estimate-view-section-title">Description</div>
                            <div class="clients-estimate-view-description">${estimate.description || 'No description provided'}</div>
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
                                            <td>${item.description || '-'}</td>
                                            <td>${item.quantity}</td>
                                            <td>${this.formatCurrency(item.rate)}</td>
                                            <td style="text-align: right;">${this.formatCurrency(item.quantity * item.rate)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="clients-estimate-view-total-box">
                                <div class="clients-estimate-view-total-label">Total Estimate</div>
                                <div class="clients-estimate-view-total-value">${this.formatCurrency(totalPrice)}</div>
                            </div>
                        </div>
                    ` : ''}

                    ${photos.length > 0 ? `
                        <div class="clients-estimate-view-section">
                            <div class="clients-estimate-view-section-title">Photos (${photos.length})</div>
                            <div class="clients-estimate-view-photos-grid">
                                ${photos.map(photo => `
                                    <div class="clients-estimate-view-photo">
                                        <img src="${photo.url}" alt="${photo.caption || 'Photo'}">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${estimate.terms ? `
                        <div class="clients-estimate-view-section">
                            <div class="clients-estimate-view-section-title">Terms & Conditions</div>
                            <div class="clients-estimate-view-description">${estimate.terms}</div>
                        </div>
                    ` : ''}

                    ${estimate.notes ? `
                        <div class="clients-estimate-view-section">
                            <div class="clients-estimate-view-section-title">Internal Notes</div>
                            <div class="clients-estimate-view-description">${estimate.notes}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="clients-estimate-view-footer">
                    <button class="clients-estimate-view-btn clients-estimate-view-btn-edit" data-action="edit-estimate" data-id="${estimate.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>

                    <button class="clients-estimate-view-btn clients-estimate-view-btn-download" data-action="download-client-copy" data-id="${estimate.id}">
                        Download Client Copy
                    </button>

                    <div class="clients-estimate-view-actions">
                        <select class="clients-estimate-view-status-dropdown" data-action="update-status" data-id="${estimate.id}">
                            ${this.ESTIMATE_STATUSES.map(status => `
                                <option value="${status}" ${estimate.status === status ? 'selected' : ''}>
                                    ${this.formatStatus(status)}
                                </option>
                            `).join('')}
                        </select>

                        <button class="clients-estimate-view-btn clients-estimate-view-btn-delete" data-action="delete-estimate" data-id="${estimate.id}">
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

        // Close modal - return to client detail modal if it exists
        overlay.querySelector('[data-action="close-view-modal"]').addEventListener('click', () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();

                // Show client detail modal if it was hidden
                const clientModal = document.getElementById('clientViewModal');
                if (clientModal && this.state.selectedClient) {
                    clientModal.style.display = 'flex';
                }
            }, 200);
        });

        // Edit estimate
        overlay.querySelector('[data-action="edit-estimate"]').addEventListener('click', async () => {
            // Close view modal instantly
            overlay.remove();

            // Ensure EstimatesModule has data loaded
            if (window.EstimatesModule) {
                try {
                    // Load estimates and leads data into the module
                    const [estimates, leadsData] = await Promise.all([
                        API.getEstimates(),
                        API.getLeads()
                    ]);

                    window.EstimatesModule.state.estimates = Array.isArray(estimates) ? estimates : [];
                    window.EstimatesModule.state.leads = leadsData?.all || [];

                    // Now call the edit modal
                    if (window.EstimatesModule.estimates_showCreateModal) {
                        window.EstimatesModule.estimates_showCreateModal(estimate.id);

                        // Keep Clients module visible
                        requestAnimationFrame(() => {
                            this.render();
                        });

                        // Watch for when edit modal closes, then reload Clients data
                        const checkEditModalClosed = setInterval(() => {
                            const editModal = document.querySelector('.estimate-modal-overlay');
                            if (!editModal) {
                                clearInterval(checkEditModalClosed);
                                // Reload Clients data to show updated estimate
                                this.loadData().then(() => {
                                    this.render();
                                });
                            }
                        }, 50);
                    }
                } catch (error) {
                    console.error('Error loading estimate data:', error);
                    alert('Failed to load estimate data');
                }
            }
        });

        // Download client copy
        overlay.querySelector('[data-action="download-client-copy"]').addEventListener('click', () => {
            this.clients_downloadEstimatePDF(estimate, lead, lineItems, photos, totalPrice);
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        });

        // Delete estimate
        overlay.querySelector('[data-action="delete-estimate"]').addEventListener('click', async () => {
            const confirmed = await this.clients_showConfirmation({
                title: 'Delete Estimate',
                message: `Are you sure you want to delete "${estimate.title}"? This action cannot be undone.`,
                confirmText: 'Delete',
                type: 'danger'
            });

            if (!confirmed) return;

            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);

            try {
                await API.deleteEstimate(estimate.id);
                window.SteadyUtils.showToast('Estimate deleted successfully', 'success');
                // Reload Clients module data
                await this.loadData();
                this.render();
            } catch (error) {
                console.error('Delete estimate error:', error);
                window.SteadyUtils.showToast('Failed to delete estimate', 'error');
            }
        });

        // Update status
        overlay.querySelector('[data-action="update-status"]').addEventListener('change', async (e) => {
            const newStatus = e.target.value;

            // Close both modals immediately
            overlay.remove();
            const clientModal = document.getElementById('clientViewModal');
            if (clientModal) {
                clientModal.remove();
            }

            try {
                await API.updateEstimate(estimate.id, { status: newStatus });
                window.SteadyUtils.showToast('Status updated successfully', 'success');
                // Reload Clients module data
                await this.loadData();
                this.render();
            } catch (error) {
                console.error('Update status error:', error);
                window.SteadyUtils.showToast('Failed to update status', 'error');
            }
        });

        // Photo click to enlarge
        overlay.querySelectorAll('.clients-estimate-view-photo img').forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                const lightbox = document.createElement('div');
                lightbox.className = 'clients-estimate-photo-lightbox';
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

        // Close on overlay click
        let mouseDownTarget = null;
        overlay.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });
        overlay.addEventListener('mouseup', (e) => {
            if (mouseDownTarget === overlay && e.target === overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            }
            mouseDownTarget = null;
        });
    },

    /**
     * Show job view modal (clients version)
     */
    clients_showJobViewModal(jobId) {
        const job = this.state.jobs.find(j => j.id === jobId);
        if (!job) return;

        // Clean up any existing modals first
        const existingModals = document.querySelectorAll('.clients-job-view-overlay, .clients-job-confirm-overlay');
        existingModals.forEach(m => m.remove());

        const lead = this.state.clients.find(c => c.id === job.lead_id);
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

        const statusIcons = {
            draft: '<path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" stroke-width="2"/><path d="M18 2l-8 8v4h4l8-8-4-4z" stroke-width="2"/>',
            scheduled: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>',
            in_progress: '<circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2" stroke-linecap="round"/>',
            completed: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke-width="2"/><polyline points="22 4 12 14.01 9 11.01" stroke-width="2"/>',
            invoiced: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-width="2"/><polyline points="14 2 14 8 20 8" stroke-width="2"/><line x1="16" y1="13" x2="8" y2="13" stroke-width="2"/><line x1="16" y1="17" x2="8" y2="17" stroke-width="2"/>',
            paid: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>',
            cancelled: '<circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke-width="2"/>'
        };

        const overlay = document.createElement('div');
        overlay.className = 'clients-job-view-overlay';
        overlay.innerHTML = `
            <style>
                .clients-job-view-overlay {
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

                .clients-job-view-modal {
                    background: var(--surface);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideUp 0.3s ease;
                }

                .clients-job-view-header {
                    padding: 32px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .clients-job-view-header-left {
                    flex: 1;
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
                    background: rgba(156, 163, 175, 0.15);
                    color: #6b7280;
                }

                .clients-job-view-status-badge[data-status="scheduled"] {
                    background: rgba(251, 191, 36, 0.15);
                    color: #fbbf24;
                }

                .clients-job-view-status-badge[data-status="in_progress"] {
                    background: rgba(59, 130, 246, 0.15);
                    color: #3b82f6;
                }

                .clients-job-view-status-badge[data-status="completed"] {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                }

                .clients-job-view-status-badge[data-status="invoiced"] {
                    background: rgba(139, 92, 246, 0.15);
                    color: #8b5cf6;
                }

                .clients-job-view-status-badge[data-status="paid"] {
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                }

                .clients-job-view-status-badge[data-status="cancelled"] {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                }

                .clients-job-view-status-badge svg {
                    width: 18px;
                    height: 18px;
                }

                .clients-job-view-meta-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    color: var(--text-secondary);
                }

                .clients-job-view-meta-item svg {
                    width: 18px;
                    height: 18px;
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
                    color: #10b981;
                }

                .clients-job-view-financial-value.loss {
                    color: #ef4444;
                }

                .clients-job-view-profit-box {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(139, 92, 246, 0.1));
                    border: 2px solid rgba(102, 126, 234, 0.3);
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
                    padding: 16px;
                    background: var(--surface);
                    border-radius: 8px;
                    margin-top: 12px;
                }

                .clients-job-view-profit-total-label {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .clients-job-view-profit-total-value {
                    font-size: 28px;
                    font-weight: 900;
                }

                .clients-job-view-profit-total-value.positive {
                    color: #10b981;
                }

                .clients-job-view-profit-total-value.negative {
                    color: #ef4444;
                }

                .clients-job-view-profit-margin {
                    font-size: 16px;
                    font-weight: 600;
                    margin-left: 12px;
                    opacity: 0.8;
                }

                .clients-job-view-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: var(--background);
                    border-radius: 8px;
                    overflow: hidden;
                }

                .clients-job-view-table thead {
                    background: var(--border);
                }

                .clients-job-view-table th {
                    text-align: left;
                    padding: 12px;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .clients-job-view-table td {
                    padding: 12px;
                    font-size: 14px;
                    color: var(--text-primary);
                    border-top: 1px solid var(--border);
                }

                .clients-job-view-table tr:hover {
                    background: rgba(102, 126, 234, 0.05);
                }

                .clients-job-view-photos-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 16px;
                }

                .clients-job-view-photo {
                    aspect-ratio: 1;
                    border-radius: 8px;
                    overflow: hidden;
                    position: relative;
                    cursor: pointer;
                    border: 2px solid var(--border);
                    transition: all 0.2s;
                }

                .clients-job-view-photo:hover {
                    border-color: #667eea;
                    transform: scale(1.05);
                }

                .clients-job-view-photo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .clients-job-view-photo-type {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .clients-job-photo-lightbox {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10002;
                    animation: fadeIn 0.2s ease;
                    cursor: pointer;
                }

                .clients-job-photo-lightbox img {
                    max-width: 90%;
                    max-height: 90vh;
                    border-radius: 8px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }

                .clients-job-view-footer {
                    padding: 24px 32px;
                    border-top: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .clients-job-view-btn {
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: none;
                }

                .clients-job-view-btn-edit {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .clients-job-view-btn-edit:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
                }

                .clients-job-view-btn-edit svg {
                    width: 16px;
                    height: 16px;
                }

                .clients-job-view-actions {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .clients-job-view-status-dropdown {
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

                .clients-job-view-status-dropdown:hover {
                    border-color: var(--primary);
                }

                .clients-job-view-status-dropdown:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .clients-job-view-btn-delete {
                    background: transparent;
                    border: 2px solid #ef4444;
                    color: #ef4444;
                }

                .clients-job-view-btn-delete:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                .clients-job-view-btn-delete svg {
                    width: 16px;
                    height: 16px;
                }

                @media (max-width: 768px) {
                    .clients-job-view-modal {
                        max-width: 100%;
                        max-height: 100vh;
                        border-radius: 0;
                    }

                    .clients-job-view-header, .clients-job-view-body, .clients-job-view-footer {
                        padding: 24px 16px;
                    }

                    .clients-job-view-financial-grid {
                        grid-template-columns: 1fr;
                    }

                    .clients-job-view-photos-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            <div class="clients-job-view-modal">
                <div class="clients-job-view-header">
                    <div class="clients-job-view-header-left">
                        <h2 class="clients-job-view-title">${job.title}</h2>
                        <div class="clients-job-view-meta">
                            <div class="clients-job-view-status-badge" data-status="${job.status}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    ${statusIcons[job.status]}
                                </svg>
                                ${this.formatStatus(job.status)}
                            </div>
                            ${lead ? `
                                <div class="clients-job-view-meta-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    ${lead.name}
                                </div>
                            ` : ''}
                            ${job.scheduled_date ? `
                                <div class="clients-job-view-meta-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    ${new Date(job.scheduled_date).toLocaleDateString()}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <button class="clients-job-view-close" data-action="close-view-modal">×</button>
                </div>

                <div class="clients-job-view-body">
                    ${job.description ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Description</div>
                            <div class="clients-job-view-description">${job.description}</div>
                        </div>
                    ` : ''}

                    <div class="clients-job-view-section">
                        <div class="clients-job-view-section-title">Financial Summary</div>
                        <div class="clients-job-view-profit-box">
                            <div class="clients-job-view-profit-row">
                                <span>Material Cost:</span>
                                <span>${this.formatCurrency(materialCost)}</span>
                            </div>
                            <div class="clients-job-view-profit-row">
                                <span>Labor Cost:</span>
                                <span>${this.formatCurrency(laborCost)}</span>
                            </div>
                            <div class="clients-job-view-profit-row">
                                <span>Other Expenses:</span>
                                <span>${this.formatCurrency(otherExpenses)}</span>
                            </div>
                            <div class="clients-job-view-profit-divider"></div>
                            <div class="clients-job-view-profit-total">
                                <span class="clients-job-view-profit-total-label">Net Profit</span>
                                <span class="clients-job-view-profit-total-value ${profit >= 0 ? 'positive' : 'negative'}">
                                    ${this.formatCurrency(profit)}
                                    <span class="clients-job-view-profit-margin">(${profitMargin.toFixed(1)}%)</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    ${materials.length > 0 ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Materials (${materials.length})</div>
                            <table class="clients-job-view-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Quantity</th>
                                        <th>Unit</th>
                                        <th>$/Unit</th>
                                        <th>Supplier</th>
                                        <th style="text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${materials.map(m => `
                                        <tr>
                                            <td>${m.name || '-'}</td>
                                            <td>${m.quantity || '-'}</td>
                                            <td>${m.unit || '-'}</td>
                                            <td>${this.formatCurrency(m.unit_price || 0)}</td>
                                            <td>${m.supplier || '-'}</td>
                                            <td style="text-align: right; font-weight: 700;">${this.formatCurrency((m.quantity || 0) * (m.unit_price || 0))}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    ${crew.length > 0 ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Crew (${crew.length})</div>
                            <table class="clients-job-view-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Hours</th>
                                        <th>Rate</th>
                                        <th style="text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${crew.map(c => `
                                        <tr>
                                            <td>${c.name || '-'}</td>
                                            <td>${c.role || '-'}</td>
                                            <td>${c.hours || '-'}</td>
                                            <td>${this.formatCurrency(c.rate || 0)}/hr</td>
                                            <td style="text-align: right; font-weight: 700;">${this.formatCurrency((c.hours || 0) * (c.rate || 0))}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    ${photos.length > 0 ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Photos (${photos.length})</div>
                            <div class="clients-job-view-photos-grid">
                                ${photos.map(photo => `
                                    <div class="clients-job-view-photo">
                                        <img src="${photo.url}" alt="${photo.type}">
                                        <div class="clients-job-view-photo-type">${photo.type}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${job.notes ? `
                        <div class="clients-job-view-section">
                            <div class="clients-job-view-section-title">Internal Notes</div>
                            <div class="clients-job-view-description">${job.notes}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="clients-job-view-footer">
                    <button class="clients-job-view-btn clients-job-view-btn-edit" data-action="edit-job" data-id="${job.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>

                    <div class="clients-job-view-actions">
                        <select class="clients-job-view-status-dropdown" data-action="update-status" data-id="${job.id}">
                            ${this.JOB_STATUSES.map(status => `
                                <option value="${status}" ${job.status === status ? 'selected' : ''}>
                                    ${this.formatStatus(status)}
                                </option>
                            `).join('')}
                        </select>

                        <button class="clients-job-view-btn clients-job-view-btn-delete" data-action="delete-job" data-id="${job.id}">
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

        // Close modal - return to client detail modal if it exists
        overlay.querySelector('[data-action="close-view-modal"]').addEventListener('click', () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();

                // Show client detail modal if it was hidden
                const clientModal = document.getElementById('clientViewModal');
                if (clientModal && this.state.selectedClient) {
                    clientModal.style.display = 'flex';
                }
            }, 200);
        });

        // Edit job
        overlay.querySelector('[data-action="edit-job"]').addEventListener('click', async () => {
            // Close view modal with animation
            overlay.style.opacity = '0';
            setTimeout(async () => {
                overlay.remove();

                // Give a moment before opening edit modal (like native Estimates/Jobs)
                setTimeout(async () => {
                    // Ensure JobsManagementModule has data loaded
                    if (window.JobsManagementModule) {
                        try {
                            // Load jobs and leads data into the module
                            const [jobs, leadsData] = await Promise.all([
                                API.getJobs(),
                                API.getLeads()
                            ]);

                            window.JobsManagementModule.state.jobs = Array.isArray(jobs) ? jobs : [];
                            window.JobsManagementModule.state.leads = leadsData?.all || [];

                            // Now call the edit modal
                            if (window.JobsManagementModule.jobs_showCreateModal) {
                                window.JobsManagementModule.jobs_showCreateModal(job.id);

                                // Watch for when edit modal closes, then reload Clients data
                                const checkEditModalClosed = setInterval(() => {
                                    const editModal = document.querySelector('.job-modal-overlay');
                                    if (!editModal) {
                                        clearInterval(checkEditModalClosed);
                                        // Reload Clients data to show updated job
                                        this.loadData().then(() => {
                                            this.render();
                                        });
                                    }
                                }, 100);
                            }
                        } catch (error) {
                            console.error('Error loading job data:', error);
                            alert('Failed to load job data');
                        }
                    }
                }, 150);
            }, 200);
        });

        // Update status
        overlay.querySelector('[data-action="update-status"]').addEventListener('change', async (e) => {
            const newStatus = e.target.value;

            // Close both modals immediately
            overlay.remove();
            const clientModal = document.getElementById('clientViewModal');
            if (clientModal) {
                clientModal.remove();
            }

            try {
                await API.updateJob(job.id, { status: newStatus });
                window.SteadyUtils.showToast('Status updated successfully', 'success');
                // Reload Clients module data
                await this.loadData();
                this.render();
            } catch (error) {
                console.error('Update status error:', error);
                window.SteadyUtils.showToast('Failed to update status', 'error');
            }
        });

        // Delete job
        overlay.querySelector('[data-action="delete-job"]').addEventListener('click', async () => {
            const confirmed = await this.clients_showConfirmation({
                title: 'Delete Job',
                message: `Are you sure you want to delete "${job.title}"? This action cannot be undone.`,
                confirmText: 'Delete',
                type: 'danger'
            });

            if (!confirmed) return;

            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);

            try {
                await API.deleteJob(job.id);
                window.SteadyUtils.showToast('Job deleted successfully', 'success');
                // Reload Clients module data
                await this.loadData();
                this.render();
            } catch (error) {
                console.error('Error deleting job:', error);
                window.SteadyUtils.showToast('Failed to delete job', 'error');
            }
        });

        // Photo click to enlarge
        overlay.querySelectorAll('.clients-job-view-photo img').forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                const lightbox = document.createElement('div');
                lightbox.className = 'clients-job-photo-lightbox';
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
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            }
        });

        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    // ==================== HELPER FUNCTIONS ====================

    /**
     * Show confirmation modal (clients version)
     */
    clients_showConfirmation(options) {
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
            overlay.className = 'clients-confirm-overlay';
            overlay.innerHTML = `
                <style>
                    .clients-confirm-overlay {
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

                    .clients-confirm-modal {
                        background: var(--surface);
                        border-radius: 12px;
                        width: 90%;
                        max-width: 480px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        animation: slideUp 0.3s ease;
                    }

                    .clients-confirm-header {
                        padding: 24px 24px 16px 24px;
                        display: flex;
                        align-items: flex-start;
                        gap: 16px;
                    }

                    .clients-confirm-icon {
                        flex-shrink: 0;
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: ${colors[type]}15;
                    }

                    .clients-confirm-icon svg {
                        width: 24px;
                        height: 24px;
                        stroke: ${colors[type]};
                    }

                    .clients-confirm-content {
                        flex: 1;
                        padding-top: 4px;
                    }

                    .clients-confirm-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--text-primary);
                        margin: 0 0 8px 0;
                    }

                    .clients-confirm-message {
                        font-size: 14px;
                        color: var(--text-secondary);
                        line-height: 1.5;
                        margin: 0;
                    }

                    .clients-confirm-footer {
                        padding: 16px 24px 24px 24px;
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                    }

                    .clients-confirm-btn {
                        padding: 10px 20px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: none;
                    }

                    .clients-confirm-btn-cancel {
                        background: transparent;
                        border: 1px solid var(--border);
                        color: var(--text-primary);
                    }

                    .clients-confirm-btn-cancel:hover {
                        background: var(--surface-hover);
                    }

                    .clients-confirm-btn-confirm {
                        background: ${colors[type]};
                        color: white;
                    }

                    .clients-confirm-btn-confirm:hover {
                        opacity: 0.9;
                        transform: translateY(-1px);
                    }
                </style>
                <div class="clients-confirm-modal">
                    <div class="clients-confirm-header">
                        <div class="clients-confirm-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                ${icons[type]}
                            </svg>
                        </div>
                        <div class="clients-confirm-content">
                            <h3 class="clients-confirm-title">${title}</h3>
                            <p class="clients-confirm-message">${message}</p>
                        </div>
                    </div>
                    <div class="clients-confirm-footer">
                        <button class="clients-confirm-btn clients-confirm-btn-cancel" data-action="cancel">
                            ${cancelText}
                        </button>
                        <button class="clients-confirm-btn clients-confirm-btn-confirm" data-action="confirm">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const handleConfirm = () => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    resolve(true);
                }, 200);
            };

            const handleCancel = () => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    resolve(false);
                }, 200);
            };

            overlay.querySelector('[data-action="confirm"]').addEventListener('click', handleConfirm);
            overlay.querySelector('[data-action="cancel"]').addEventListener('click', handleCancel);

            // ESC to cancel
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
     * Download estimate as PDF (clients version)
     */
    async clients_downloadEstimatePDF(estimate, lead, lineItems, photos, totalPrice) {
        // Load jsPDF library if not already loaded
        if (!window.jspdf) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            document.head.appendChild(script);

            await new Promise((resolve) => {
                script.onload = resolve;
            });
        }

        const formatMoney = (val) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
        };

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            unit: 'in',
            format: 'letter',
            orientation: 'portrait'
        });

        let y = 1;

        // Title
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(estimate.title || 'Estimate', 4.25, y, { align: 'center' });
        y += 0.5;

        // Line
        doc.setLineWidth(0.02);
        doc.line(0.75, y, 7.75, y);
        y += 0.4;

        // Client Info
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

                .clients-stat-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .clients-stat-icon {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .clients-stat-icon-jobs {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }

                .clients-stat-icon-estimates {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                }

                .clients-stat-icon svg {
                    width: 24px;
                    height: 24px;
                    stroke: white;
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
                    background: var(--surface);
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
                    cursor: pointer;
                    transition: all 0.3s ease;
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
                    background: var(--surface);
                    border-radius: 12px;
                    max-width: 600px;
                    width: fit-content;
                    min-width: 500px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
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
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                }

                .modal-close:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    transform: scale(1.1);
                }

                .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                }

                /* Modal Sections */
                .modal-section {
                    margin-bottom: 1.5rem;
                }

                .modal-section:last-child {
                    margin-bottom: 0;
                }

                .modal-section-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-secondary);
                    margin-bottom: 0.75rem;
                }

                .contact-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    background: var(--background);
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                }

                .contact-item {
                    font-size: 0.9rem;
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .contact-item strong {
                    min-width: 80px;
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                /* Item Cards (clickable estimate/job cards) */
                .clients-item-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 0.875rem;
                }

                .clients-item-card {
                    background: var(--background);
                    border: 2px solid var(--border);
                    border-radius: 10px;
                    padding: 1.25rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .clients-item-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-4px);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
                }

                .clients-item-card:active {
                    transform: translateY(-2px);
                }

                .clients-item-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin-bottom: 0.875rem;
                }

                .clients-item-card-title {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    flex: 1;
                    line-height: 1.3;
                }

                .clients-item-card-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    padding-top: 0.5rem;
                    border-top: 1px solid var(--border);
                }

                .clients-item-price {
                    font-weight: 700;
                    font-size: 1.1rem;
                    color: var(--success);
                }

                .clients-item-date {
                    color: var(--text-tertiary);
                    font-size: 0.8rem;
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

                    .modal-content {
                        min-width: 90vw;
                        max-width: 90vw;
                        width: 90vw;
                    }

                    .clients-item-cards {
                        grid-template-columns: 1fr;
                    }

                    .modal-overlay {
                        padding: 1rem;
                    }
                }
            </style>
        `;
    }
};
