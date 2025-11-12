/**
 * CLIENTS MODULE - Complete rewrite with independent edit modals
 * No crossover with Estimates or Jobs modules - all functionality self-contained
 * All API calls happen directly in this module
 */

window.ClientsModule = {
    state: {
        container: 'clients-content',
        clients: [],
        filteredClients: [],
        estimates: [],
        jobs: [],
        allLeads: [],
        loading: false,
        searchQuery: '',
        selectedClient: null,
        modalPhotos: [],
        isSaving: false
    },

    ESTIMATE_STATUSES: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    JOB_STATUSES: ['scheduled', 'in_progress', 'completed', 'on_hold', 'cancelled'],

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

        this.showLoading();

        try {
            await this.loadData();
            this.render();
        } catch (error) {
            console.error('[Clients] Init error:', error);
            this.showError('Failed to load clients');
        }
    },

    /**
     * Load all data
     */
    async loadData() {
        try {
            console.log('[Clients] Fetching data...');

            const [leads, estimates, jobs] = await Promise.all([
                API.getLeads(),
                API.getEstimates(),
                API.getJobs()
            ]);

            this.state.estimates = Array.isArray(estimates) ? estimates : [];
            this.state.jobs = Array.isArray(jobs) ? jobs : [];
            this.state.allLeads = Array.isArray(leads?.all) ? leads.all : [];

            // Filter leads to only those with estimates or jobs
            const leadsWithProjects = this.state.allLeads.filter(lead => {
                const hasEstimates = this.state.estimates.some(est => est.lead_id === lead.id);
                const hasJobs = this.state.jobs.some(job => job.lead_id === lead.id);
                return hasEstimates || hasJobs;
            });

            // Transform to clients with stats
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
        } catch (error) {
            console.error('[Clients] Error loading data:', error);
            throw error;
        }
    },

    /**
     * Calculate stats
     */
    calculateStats() {
        const total = this.state.clients.length;
        const totalRevenue = this.state.clients.reduce((sum, c) => sum + c.totalRevenue, 0);
        const totalProjects = this.state.clients.reduce((sum, c) => sum + c.estimateCount + c.jobCount, 0);

        return { total, totalRevenue, totalProjects };
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
                const company = (client.company || '').toLowerCase();

                return name.includes(this.state.searchQuery) ||
                       email.includes(this.state.searchQuery) ||
                       phone.includes(this.state.searchQuery) ||
                       company.includes(this.state.searchQuery);
            });
        }

        this.renderClientCards();
    },

    /**
     * Show loading state
     */
    showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; min-height: 400px; color: var(--text-secondary);">
                    <div style="text-align: center;">
                        <div style="margin-bottom: 1rem;">Loading clients...</div>
                    </div>
                </div>
            `;
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
                <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                    <div style="font-size: 1.125rem; margin-bottom: 0.5rem;">⚠️ Error</div>
                    <div>${this.escapeHtml(message)}</div>
                </div>
            `;
        }
    },

    /**
     * Main render function
     */
    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const stats = this.calculateStats();

        container.removeAttribute('style');
        container.innerHTML = `
            ${this.renderStyles()}

            <div class="clients-container">
                <!-- Header -->
                <div class="clients-header">
                    <div class="clients-header-content">
                        <h1 class="clients-title">Clients</h1>
                        <p class="clients-subtitle">View client relationships and project history</p>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="clients-stats-grid">
                    <div class="clients-stat-card">
                        <div class="clients-stat-icon">👥</div>
                        <div class="clients-stat-content">
                            <div class="clients-stat-label">Total Clients</div>
                            <div class="clients-stat-value">${stats.total}</div>
                        </div>
                    </div>
                    <div class="clients-stat-card">
                        <div class="clients-stat-icon">💰</div>
                        <div class="clients-stat-content">
                            <div class="clients-stat-label">Total Revenue</div>
                            <div class="clients-stat-value">${this.formatCurrency(stats.totalRevenue)}</div>
                        </div>
                    </div>
                    <div class="clients-stat-card">
                        <div class="clients-stat-icon">📋</div>
                        <div class="clients-stat-content">
                            <div class="clients-stat-label">Total Projects</div>
                            <div class="clients-stat-value">${stats.totalProjects}</div>
                        </div>
                    </div>
                </div>

                <!-- Search -->
                <div class="clients-search-container">
                    <input
                        type="text"
                        class="clients-search-input"
                        placeholder="Search clients by name, email, phone, or company..."
                        value="${this.escapeHtml(this.state.searchQuery)}"
                        id="clientsSearchInput"
                    >
                </div>

                <!-- Client Cards -->
                <div class="clients-cards-container" id="clientsCardsContainer">
                    ${this.renderClientCardsHTML()}
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            this.attachEventListeners();
        });
    },

    /**
     * Render client cards HTML
     */
    renderClientCardsHTML() {
        if (this.state.filteredClients.length === 0) {
            return this.renderEmptyState();
        }

        return `
            <div class="clients-grid">
                ${this.state.filteredClients.map(client => `
                    <div class="clients-card" data-client-id="${client.id}">
                        <div class="clients-card-header">
                            <div class="clients-card-avatar">
                                ${(client.name || '?')[0].toUpperCase()}
                            </div>
                            <div class="clients-card-info">
                                <div class="clients-card-name">${this.escapeHtml(client.name || 'Unnamed')}</div>
                                ${client.company ? `<div class="clients-card-company">${this.escapeHtml(client.company)}</div>` : ''}
                            </div>
                        </div>

                        <div class="clients-card-details">
                            ${client.email ? `
                                <div class="clients-card-detail">
                                    <span class="clients-card-detail-icon">📧</span>
                                    <span>${this.escapeHtml(client.email)}</span>
                                </div>
                            ` : ''}
                            ${client.phone ? `
                                <div class="clients-card-detail">
                                    <span class="clients-card-detail-icon">📱</span>
                                    <span>${this.formatPhone(client.phone)}</span>
                                </div>
                            ` : ''}
                        </div>

                        <div class="clients-card-stats">
                            <div class="clients-card-stat">
                                <div class="clients-card-stat-value">${client.estimateCount}</div>
                                <div class="clients-card-stat-label">Estimates</div>
                            </div>
                            <div class="clients-card-stat">
                                <div class="clients-card-stat-value">${client.jobCount}</div>
                                <div class="clients-card-stat-label">Jobs</div>
                            </div>
                            <div class="clients-card-stat">
                                <div class="clients-card-stat-value">${this.formatCurrency(client.totalRevenue)}</div>
                                <div class="clients-card-stat-label">Revenue</div>
                            </div>
                        </div>

                        <button class="clients-card-btn">View Details</button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Render client cards (just the cards section)
     */
    renderClientCards() {
        const container = document.getElementById('clientsCardsContainer');
        if (container) {
            container.innerHTML = this.renderClientCardsHTML();
        }
    },

    /**
     * Render empty state
     */
    renderEmptyState() {
        const hasSearch = this.state.searchQuery.length > 0;

        return `
            <div class="clients-empty-state">
                <div class="clients-empty-icon">${hasSearch ? '🔍' : '👥'}</div>
                <div class="clients-empty-title">${hasSearch ? 'No clients found' : 'No clients yet'}</div>
                <div class="clients-empty-text">
                    ${hasSearch ? 'Try adjusting your search' : 'Clients with estimates or jobs will appear here'}
                </div>
            </div>
        `;
    },

    /**
     * Open client view modal
     */
    openViewModal(clientId) {
        const client = this.state.clients.find(c => c.id === clientId);
        if (!client) return;

        this.state.selectedClient = client;

        const clientEstimates = this.state.estimates.filter(est => est.lead_id === client.id);
        const clientJobs = this.state.jobs.filter(job => job.lead_id === client.id);

        const modal = document.createElement('div');
        modal.id = 'clientViewModal';
        modal.className = 'clients-view-modal-overlay';
        modal.innerHTML = `
            <div class="clients-view-modal">
                <div class="clients-view-modal-header">
                    <div>
                        <h2>${this.escapeHtml(client.name || 'Unnamed Client')}</h2>
                        ${client.company ? `<p style="color: var(--text-secondary); margin-top: 0.25rem;">${this.escapeHtml(client.company)}</p>` : ''}
                    </div>
                    <button class="clients-view-modal-close" data-action="close-view">×</button>
                </div>

                <div class="clients-view-modal-body">
                    <!-- Contact Info -->
                    <div class="clients-view-section">
                        <div class="clients-view-section-title">Contact Information</div>
                        <div class="clients-view-info-grid">
                            ${client.email ? `
                                <div class="clients-view-info-item">
                                    <div class="clients-view-info-label">Email</div>
                                    <div class="clients-view-info-value">${this.escapeHtml(client.email)}</div>
                                </div>
                            ` : ''}
                            ${client.phone ? `
                                <div class="clients-view-info-item">
                                    <div class="clients-view-info-label">Phone</div>
                                    <div class="clients-view-info-value">${this.formatPhone(client.phone)}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Estimates -->
                    ${clientEstimates.length > 0 ? `
                        <div class="clients-view-section">
                            <div class="clients-view-section-title">Estimates (${clientEstimates.length})</div>
                            <div class="clients-item-cards">
                                ${clientEstimates.map(est => `
                                    <div class="clients-item-card" data-estimate-id="${est.id}">
                                        <div class="clients-item-card-title">${this.truncateText(est.title || 'Untitled', 35)}</div>
                                        <div class="clients-item-card-meta">
                                            <span class="clients-item-card-status clients-item-card-status-${est.status || 'draft'}">
                                                ${this.formatStatus(est.status || 'draft')}
                                            </span>
                                            <span class="clients-item-card-amount">${this.formatCurrency(est.total_price || 0)}</span>
                                        </div>
                                        <div class="clients-item-card-date">${this.getRelativeTime(est.created_at)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Jobs -->
                    ${clientJobs.length > 0 ? `
                        <div class="clients-view-section">
                            <div class="clients-view-section-title">Jobs (${clientJobs.length})</div>
                            <div class="clients-item-cards">
                                ${clientJobs.map(job => `
                                    <div class="clients-item-card" data-job-id="${job.id}">
                                        <div class="clients-item-card-title">${this.truncateText(job.title || 'Untitled', 35)}</div>
                                        <div class="clients-item-card-meta">
                                            <span class="clients-item-card-status clients-item-card-status-${job.status || 'scheduled'}">
                                                ${this.formatStatus(job.status || 'scheduled')}
                                            </span>
                                            <span class="clients-item-card-amount">${this.formatCurrency(job.final_price || job.quoted_price || 0)}</span>
                                        </div>
                                        <div class="clients-item-card-date">${this.getRelativeTime(job.created_at)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fade in
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
        });

        // Attach event listeners
        modal.querySelector('[data-action="close-view"]').addEventListener('click', () => {
            this.closeViewModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeViewModal();
            }
        });

        // Estimate card clicks - open detail modal
        modal.querySelectorAll('[data-estimate-id]').forEach(card => {
            card.addEventListener('click', () => {
                const estimateId = card.dataset.estimateId;
                this.showEstimateDetailModal(estimateId);
            });
        });

        // Job card clicks - open detail modal
        modal.querySelectorAll('[data-job-id]').forEach(card => {
            card.addEventListener('click', () => {
                const jobId = card.dataset.jobId;
                this.showJobDetailModal(jobId);
            });
        });
    },

    /**
     * Close view modal
     */
    closeViewModal() {
        const modal = document.getElementById('clientViewModal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        }
        this.state.selectedClient = null;
    },

    /**
     * Show estimate detail modal (view/edit)
     */
    showEstimateDetailModal(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) return;

        const lead = this.state.allLeads.find(l => l.id === estimate.lead_id);
        const lineItems = estimate.line_items || [];
        const photos = estimate.photos || [];
        const totalPrice = estimate.total_price || 0;

        const overlay = document.createElement('div');
        overlay.className = 'clients-detail-modal-overlay';
        overlay.style.zIndex = '10000';
        overlay.innerHTML = `
            <div class="clients-detail-modal">
                <div class="clients-detail-modal-header">
                    <h2>${this.truncateText(estimate.title || 'Untitled Estimate', 50)}</h2>
                    <button class="clients-detail-modal-close" data-action="close">×</button>
                </div>

                <div class="clients-detail-modal-body">
                    <!-- Basic Info -->
                    <div class="clients-detail-section">
                        <div class="clients-detail-row">
                            <div class="clients-detail-label">Status</div>
                            <div class="clients-detail-value">
                                <span class="clients-detail-status clients-detail-status-${estimate.status || 'draft'}">
                                    ${this.formatStatus(estimate.status || 'draft')}
                                </span>
                            </div>
                        </div>
                        <div class="clients-detail-row">
                            <div class="clients-detail-label">Client</div>
                            <div class="clients-detail-value">${this.escapeHtml(lead?.name || 'Unknown')}</div>
                        </div>
                        <div class="clients-detail-row">
                            <div class="clients-detail-label">Created</div>
                            <div class="clients-detail-value">${this.getRelativeTime(estimate.created_at)}</div>
                        </div>
                        ${estimate.expires_at ? `
                            <div class="clients-detail-row">
                                <div class="clients-detail-label">Expires</div>
                                <div class="clients-detail-value">${this.getRelativeTime(estimate.expires_at)}</div>
                            </div>
                        ` : ''}
                    </div>

                    ${estimate.description ? `
                        <div class="clients-detail-section">
                            <div class="clients-detail-section-title">Description</div>
                            <div class="clients-detail-text">${this.escapeHtml(estimate.description)}</div>
                        </div>
                    ` : ''}

                    <!-- Line Items -->
                    ${lineItems.length > 0 ? `
                        <div class="clients-detail-section">
                            <div class="clients-detail-section-title">Line Items</div>
                            <div class="clients-detail-table">
                                <div class="clients-detail-table-header">
                                    <div>Description</div>
                                    <div>Qty</div>
                                    <div>Rate</div>
                                    <div>Total</div>
                                </div>
                                ${lineItems.map(item => `
                                    <div class="clients-detail-table-row">
                                        <div>${this.escapeHtml(item.description || '')}</div>
                                        <div>${item.quantity || 0}</div>
                                        <div>${this.formatCurrency(item.rate || 0)}</div>
                                        <div>${this.formatCurrency((item.quantity || 0) * (item.rate || 0))}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="clients-detail-total">
                                <span>Total:</span>
                                <span>${this.formatCurrency(totalPrice)}</span>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Photos -->
                    ${photos.length > 0 ? `
                        <div class="clients-detail-section">
                            <div class="clients-detail-section-title">Photos</div>
                            <div class="clients-detail-photos">
                                ${photos.map(photo => `
                                    <img src="${photo}" alt="Estimate photo" class="clients-detail-photo">
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="clients-detail-modal-footer">
                    <button class="clients-detail-btn clients-detail-btn-secondary" data-action="close">Close</button>
                    <button class="clients-detail-btn clients-detail-btn-primary" data-action="edit-estimate">Edit</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        // Close button
        overlay.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            });
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            }
        });

        // Edit button - open edit modal
        overlay.querySelector('[data-action="edit-estimate"]').addEventListener('click', () => {
            overlay.remove();
            this.showEstimateEditModal(estimateId);
        });
    },

    /**
     * Show estimate edit modal
     */
    showEstimateEditModal(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) return;

        const lineItems = estimate.line_items || [{ description: '', quantity: 1, rate: 0 }];
        const photos = estimate.photos || [];
        this.state.modalPhotos = [...photos];

        // Default expiry: 30 days from now
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 30);
        const expiryDate = estimate.expires_at ? estimate.expires_at.split('T')[0] : defaultExpiry.toISOString().split('T')[0];

        const overlay = document.createElement('div');
        overlay.className = 'clients-edit-modal-overlay';
        overlay.style.zIndex = '10000';
        overlay.innerHTML = `
            <div class="clients-edit-modal">
                <div class="clients-edit-modal-header">
                    <h2>Edit Estimate</h2>
                    <button class="clients-edit-modal-close" data-action="close">×</button>
                </div>

                <form id="estimateEditForm" class="clients-edit-modal-body">
                    <!-- Title -->
                    <div class="clients-edit-form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            name="title"
                            placeholder="e.g., Kitchen Remodel"
                            value="${this.escapeHtml(estimate.title || '')}"
                            maxlength="35"
                            required
                        >
                    </div>

                    <!-- Status -->
                    <div class="clients-edit-form-group">
                        <label>Status</label>
                        <select name="status">
                            ${this.ESTIMATE_STATUSES.map(status => `
                                <option value="${status}" ${estimate.status === status ? 'selected' : ''}>
                                    ${this.formatStatus(status)}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Expiry -->
                    <div class="clients-edit-form-group">
                        <label>Expires On</label>
                        <input
                            type="date"
                            name="expires_at"
                            value="${expiryDate}"
                            ${!estimate.expires_at ? 'disabled' : ''}
                        >
                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; cursor: pointer;">
                            <input
                                type="checkbox"
                                id="noExpiry"
                                ${!estimate.expires_at ? 'checked' : ''}
                                style="cursor: pointer;"
                            >
                            <span style="font-size: 0.875rem;">No expiration date</span>
                        </label>
                    </div>

                    <!-- Description -->
                    <div class="clients-edit-form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            placeholder="Brief description of the work..."
                            maxlength="500"
                            rows="3"
                        >${this.escapeHtml(estimate.description || '')}</textarea>
                    </div>

                    <!-- Line Items -->
                    <div class="clients-edit-form-group">
                        <label>Line Items</label>
                        <div class="clients-edit-line-items" id="lineItemsContainer">
                            ${lineItems.map((item, i) => this.renderLineItemRow(item, i)).join('')}
                        </div>
                        <button type="button" class="clients-edit-add-btn" data-action="add-line-item">
                            + Add Line Item
                        </button>
                        <div class="clients-edit-total">
                            <span>Total:</span>
                            <span id="estimateTotalDisplay">${this.formatCurrency(estimate.total_price || 0)}</span>
                        </div>
                    </div>

                    <!-- Terms -->
                    <div class="clients-edit-form-group">
                        <label>Terms & Conditions</label>
                        <textarea
                            name="terms"
                            placeholder="Payment terms, warranty, etc..."
                            maxlength="1000"
                            rows="4"
                        >${this.escapeHtml(estimate.terms || 'Payment due within 30 days of acceptance.\nEstimate valid for 30 days.')}</textarea>
                    </div>

                    <!-- Notes -->
                    <div class="clients-edit-form-group">
                        <label>Internal Notes</label>
                        <textarea
                            name="notes"
                            placeholder="Internal notes (not visible to client)..."
                            maxlength="500"
                            rows="3"
                        >${this.escapeHtml(estimate.notes || '')}</textarea>
                    </div>
                </form>

                <div class="clients-edit-modal-footer">
                    <button class="clients-edit-btn clients-edit-btn-secondary" data-action="close">Cancel</button>
                    <button class="clients-edit-btn clients-edit-btn-primary" data-action="save">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            this.updateLineItemsTotal();
        });

        // No expiry checkbox
        const noExpiryCheckbox = overlay.querySelector('#noExpiry');
        const expiryInput = overlay.querySelector('[name="expires_at"]');

        noExpiryCheckbox.addEventListener('change', () => {
            expiryInput.disabled = noExpiryCheckbox.checked;
        });

        // Add line item
        overlay.querySelector('[data-action="add-line-item"]').addEventListener('click', () => {
            const container = overlay.querySelector('#lineItemsContainer');
            const currentItems = container.querySelectorAll('.clients-edit-line-item');
            if (currentItems.length >= 50) {
                alert('Maximum 50 line items allowed');
                return;
            }
            const newIndex = currentItems.length;
            const newRow = this.renderLineItemRow({ description: '', quantity: 1, rate: 0 }, newIndex);
            container.insertAdjacentHTML('beforeend', newRow);
            this.updateLineItemsTotal();
        });

        // Line item changes
        overlay.addEventListener('input', (e) => {
            if (e.target.closest('.clients-edit-line-item')) {
                this.updateLineItemsTotal();
            }
        });

        // Remove line item
        overlay.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="remove-line-item"]')) {
                e.target.closest('.clients-edit-line-item').remove();
                this.updateLineItemsTotal();
            }
        });

        // Close button
        overlay.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            });
        });

        // Save button
        overlay.querySelector('[data-action="save"]').addEventListener('click', async () => {
            await this.saveEstimate(estimateId, overlay);
        });
    },

    /**
     * Render line item row
     */
    renderLineItemRow(item, index) {
        return `
            <div class="clients-edit-line-item">
                <input
                    type="text"
                    placeholder="Description"
                    value="${this.escapeHtml(item.description || '')}"
                    data-field="description"
                    maxlength="100"
                >
                <input
                    type="number"
                    placeholder="Qty"
                    value="${item.quantity || 1}"
                    data-field="quantity"
                    min="0"
                    step="0.01"
                >
                <input
                    type="number"
                    placeholder="Rate"
                    value="${item.rate || 0}"
                    data-field="rate"
                    min="0"
                    step="0.01"
                >
                <button type="button" class="clients-edit-remove-btn" data-action="remove-line-item">×</button>
            </div>
        `;
    },

    /**
     * Update line items total
     */
    updateLineItemsTotal() {
        const overlay = document.querySelector('.clients-edit-modal-overlay');
        if (!overlay) return;

        const items = overlay.querySelectorAll('.clients-edit-line-item');
        let total = 0;

        items.forEach(item => {
            const qty = parseFloat(item.querySelector('[data-field="quantity"]').value) || 0;
            const rate = parseFloat(item.querySelector('[data-field="rate"]').value) || 0;
            total += qty * rate;
        });

        const totalDisplay = overlay.querySelector('#estimateTotalDisplay');
        if (totalDisplay) {
            totalDisplay.textContent = this.formatCurrency(total);
        }
    },

    /**
     * Save estimate
     */
    async saveEstimate(estimateId, overlay) {
        if (this.state.isSaving) return;
        this.state.isSaving = true;

        const form = overlay.querySelector('#estimateEditForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            this.state.isSaving = false;
            return;
        }

        const formData = new FormData(form);

        // Collect line items
        const lineItems = [];
        const itemRows = overlay.querySelectorAll('.clients-edit-line-item');
        itemRows.forEach(row => {
            const description = row.querySelector('[data-field="description"]').value;
            const quantity = parseFloat(row.querySelector('[data-field="quantity"]').value) || 0;
            const rate = parseFloat(row.querySelector('[data-field="rate"]').value) || 0;

            if (description || quantity || rate) {
                lineItems.push({ description, quantity, rate });
            }
        });

        // Calculate total
        const totalPrice = lineItems.reduce((sum, item) => {
            return sum + (item.quantity * item.rate);
        }, 0);

        // Handle expiry
        const noExpiry = overlay.querySelector('#noExpiry').checked;
        const expiresAt = noExpiry ? null : formData.get('expires_at');

        const estimateData = {
            title: formData.get('title'),
            status: formData.get('status'),
            expires_at: expiresAt,
            description: formData.get('description') || null,
            line_items: lineItems,
            total_price: totalPrice,
            terms: formData.get('terms') || null,
            notes: formData.get('notes') || null,
            photos: this.state.modalPhotos
        };

        try {
            // Close modal immediately
            overlay.remove();

            // Update in background
            const result = await API.updateEstimate(estimateId, estimateData);

            // Update local state
            const index = this.state.estimates.findIndex(e => e.id === estimateId);
            if (index !== -1) {
                this.state.estimates[index] = result;
            }

            // Reload and re-render
            await this.loadData();
            this.render();

            window.SteadyUtils.showToast('Estimate updated successfully', 'success');
        } catch (error) {
            console.error('[Clients] Save estimate error:', error);
            window.SteadyUtils.showToast('Failed to save estimate', 'error');
        } finally {
            this.state.isSaving = false;
        }
    },

    /**
     * Show job detail modal (view)
     */
    showJobDetailModal(jobId) {
        const job = this.state.jobs.find(j => j.id === jobId);
        if (!job) return;

        const lead = this.state.allLeads.find(l => l.id === job.lead_id);
        const materials = job.materials || [];
        const crewMembers = job.crew_members || [];

        const overlay = document.createElement('div');
        overlay.className = 'clients-detail-modal-overlay';
        overlay.style.zIndex = '10000';
        overlay.innerHTML = `
            <div class="clients-detail-modal">
                <div class="clients-detail-modal-header">
                    <h2>${this.truncateText(job.title || 'Untitled Job', 50)}</h2>
                    <button class="clients-detail-modal-close" data-action="close">×</button>
                </div>

                <div class="clients-detail-modal-body">
                    <!-- Basic Info -->
                    <div class="clients-detail-section">
                        <div class="clients-detail-row">
                            <div class="clients-detail-label">Status</div>
                            <div class="clients-detail-value">
                                <span class="clients-detail-status clients-detail-status-${job.status || 'scheduled'}">
                                    ${this.formatStatus(job.status || 'scheduled')}
                                </span>
                            </div>
                        </div>
                        <div class="clients-detail-row">
                            <div class="clients-detail-label">Client</div>
                            <div class="clients-detail-value">${this.escapeHtml(lead?.name || 'Unknown')}</div>
                        </div>
                        <div class="clients-detail-row">
                            <div class="clients-detail-label">Job Type</div>
                            <div class="clients-detail-value">${this.escapeHtml(job.job_type || 'N/A')}</div>
                        </div>
                        ${job.scheduled_date ? `
                            <div class="clients-detail-row">
                                <div class="clients-detail-label">Scheduled</div>
                                <div class="clients-detail-value">${this.getRelativeTime(job.scheduled_date)}</div>
                            </div>
                        ` : ''}
                    </div>

                    ${job.description ? `
                        <div class="clients-detail-section">
                            <div class="clients-detail-section-title">Description</div>
                            <div class="clients-detail-text">${this.escapeHtml(job.description)}</div>
                        </div>
                    ` : ''}

                    <!-- Financial Summary -->
                    <div class="clients-detail-section">
                        <div class="clients-detail-section-title">Financial Summary</div>
                        <div class="clients-detail-info-grid">
                            <div class="clients-detail-info-item">
                                <div class="clients-detail-label">Material Cost</div>
                                <div class="clients-detail-value">${this.formatCurrency(job.material_cost || 0)}</div>
                            </div>
                            <div class="clients-detail-info-item">
                                <div class="clients-detail-label">Labor Cost</div>
                                <div class="clients-detail-value">${this.formatCurrency((job.labor_rate || 0) * (job.estimated_labor_hours || 0))}</div>
                            </div>
                            <div class="clients-detail-info-item">
                                <div class="clients-detail-label">Other Expenses</div>
                                <div class="clients-detail-value">${this.formatCurrency(job.other_expenses || 0)}</div>
                            </div>
                            <div class="clients-detail-info-item">
                                <div class="clients-detail-label">Quoted Price</div>
                                <div class="clients-detail-value">${this.formatCurrency(job.quoted_price || 0)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Materials -->
                    ${materials.length > 0 ? `
                        <div class="clients-detail-section">
                            <div class="clients-detail-section-title">Materials</div>
                            <div class="clients-detail-table">
                                <div class="clients-detail-table-header">
                                    <div>Name</div>
                                    <div>Quantity</div>
                                    <div>Unit Price</div>
                                    <div>Total</div>
                                </div>
                                ${materials.map(item => `
                                    <div class="clients-detail-table-row">
                                        <div>${this.escapeHtml(item.name || '')}</div>
                                        <div>${item.quantity || 0} ${this.escapeHtml(item.unit || '')}</div>
                                        <div>${this.formatCurrency(item.unit_price || 0)}</div>
                                        <div>${this.formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Crew -->
                    ${crewMembers.length > 0 ? `
                        <div class="clients-detail-section">
                            <div class="clients-detail-section-title">Crew Members</div>
                            <div class="clients-detail-table">
                                <div class="clients-detail-table-header">
                                    <div>Name</div>
                                    <div>Role</div>
                                    <div>Hours</div>
                                    <div>Rate</div>
                                </div>
                                ${crewMembers.map(member => `
                                    <div class="clients-detail-table-row">
                                        <div>${this.escapeHtml(member.name || '')}</div>
                                        <div>${this.escapeHtml(member.role || '')}</div>
                                        <div>${member.hours || 0}</div>
                                        <div>${this.formatCurrency(member.rate || 0)}/hr</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="clients-detail-modal-footer">
                    <button class="clients-detail-btn clients-detail-btn-secondary" data-action="close">Close</button>
                    <button class="clients-detail-btn clients-detail-btn-primary" data-action="edit-job">Edit</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        // Close button
        overlay.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            });
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            }
        });

        // Edit button
        overlay.querySelector('[data-action="edit-job"]').addEventListener('click', () => {
            overlay.remove();
            this.showJobEditModal(jobId);
        });
    },

    /**
     * Show job edit modal
     */
    showJobEditModal(jobId) {
        const job = this.state.jobs.find(j => j.id === jobId);
        if (!job) return;

        const overlay = document.createElement('div');
        overlay.className = 'clients-edit-modal-overlay';
        overlay.style.zIndex = '10000';
        overlay.innerHTML = `
            <div class="clients-edit-modal">
                <div class="clients-edit-modal-header">
                    <h2>Edit Job</h2>
                    <button class="clients-edit-modal-close" data-action="close">×</button>
                </div>

                <form id="jobEditForm" class="clients-edit-modal-body">
                    <!-- Title -->
                    <div class="clients-edit-form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            name="title"
                            placeholder="e.g., Kitchen Installation"
                            value="${this.escapeHtml(job.title || '')}"
                            maxlength="100"
                            required
                        >
                    </div>

                    <!-- Status -->
                    <div class="clients-edit-form-group">
                        <label>Status</label>
                        <select name="status">
                            ${this.JOB_STATUSES.map(status => `
                                <option value="${status}" ${job.status === status ? 'selected' : ''}>
                                    ${this.formatStatus(status)}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Job Type -->
                    <div class="clients-edit-form-group">
                        <label>Job Type</label>
                        <input
                            type="text"
                            name="job_type"
                            placeholder="e.g., Plumbing, Electrical..."
                            value="${this.escapeHtml(job.job_type || '')}"
                            maxlength="50"
                        >
                    </div>

                    <!-- Scheduled Date -->
                    <div class="clients-edit-form-group">
                        <label>Scheduled Date</label>
                        <input
                            type="date"
                            name="scheduled_date"
                            value="${job.scheduled_date ? job.scheduled_date.split('T')[0] : ''}"
                        >
                    </div>

                    <!-- Description -->
                    <div class="clients-edit-form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            placeholder="Job details..."
                            maxlength="1000"
                            rows="4"
                        >${this.escapeHtml(job.description || '')}</textarea>
                    </div>

                    <!-- Financial Details -->
                    <div class="clients-edit-form-row">
                        <div class="clients-edit-form-group">
                            <label>Material Cost</label>
                            <input
                                type="number"
                                name="material_cost"
                                placeholder="0.00"
                                value="${job.material_cost || ''}"
                                min="0"
                                step="0.01"
                            >
                        </div>
                        <div class="clients-edit-form-group">
                            <label>Labor Rate ($/hr)</label>
                            <input
                                type="number"
                                name="labor_rate"
                                placeholder="0.00"
                                value="${job.labor_rate || ''}"
                                min="0"
                                step="0.01"
                            >
                        </div>
                    </div>

                    <div class="clients-edit-form-row">
                        <div class="clients-edit-form-group">
                            <label>Estimated Labor Hours</label>
                            <input
                                type="number"
                                name="estimated_labor_hours"
                                placeholder="0"
                                value="${job.estimated_labor_hours || ''}"
                                min="0"
                                step="0.5"
                            >
                        </div>
                        <div class="clients-edit-form-group">
                            <label>Other Expenses</label>
                            <input
                                type="number"
                                name="other_expenses"
                                placeholder="0.00"
                                value="${job.other_expenses || ''}"
                                min="0"
                                step="0.01"
                            >
                        </div>
                    </div>

                    <div class="clients-edit-form-group">
                        <label>Quoted Price</label>
                        <input
                            type="number"
                            name="quoted_price"
                            placeholder="0.00"
                            value="${job.quoted_price || ''}"
                            min="0"
                            step="0.01"
                        >
                    </div>

                    <!-- Notes -->
                    <div class="clients-edit-form-group">
                        <label>Internal Notes</label>
                        <textarea
                            name="notes"
                            placeholder="Internal notes..."
                            maxlength="1000"
                            rows="3"
                        >${this.escapeHtml(job.notes || '')}</textarea>
                    </div>
                </form>

                <div class="clients-edit-modal-footer">
                    <button class="clients-edit-btn clients-edit-btn-secondary" data-action="close">Cancel</button>
                    <button class="clients-edit-btn clients-edit-btn-primary" data-action="save">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        // Close button
        overlay.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            });
        });

        // Save button
        overlay.querySelector('[data-action="save"]').addEventListener('click', async () => {
            await this.saveJob(jobId, overlay);
        });
    },

    /**
     * Save job
     */
    async saveJob(jobId, overlay) {
        if (this.state.isSaving) return;
        this.state.isSaving = true;

        const form = overlay.querySelector('#jobEditForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            this.state.isSaving = false;
            return;
        }

        const formData = new FormData(form);

        const jobData = {
            title: formData.get('title'),
            status: formData.get('status'),
            job_type: formData.get('job_type') || null,
            scheduled_date: formData.get('scheduled_date') || null,
            description: formData.get('description') || null,
            material_cost: parseFloat(formData.get('material_cost')) || 0,
            labor_rate: parseFloat(formData.get('labor_rate')) || 0,
            estimated_labor_hours: parseFloat(formData.get('estimated_labor_hours')) || 0,
            other_expenses: parseFloat(formData.get('other_expenses')) || 0,
            quoted_price: parseFloat(formData.get('quoted_price')) || 0,
            notes: formData.get('notes') || null
        };

        try {
            // Close modal immediately
            overlay.remove();

            // Update in background
            const result = await API.updateJob(jobId, jobData);

            // Update local state
            const index = this.state.jobs.findIndex(j => j.id === jobId);
            if (index !== -1) {
                this.state.jobs[index] = result;
            }

            // Reload and re-render
            await this.loadData();
            this.render();

            window.SteadyUtils.showToast('Job updated successfully', 'success');
        } catch (error) {
            console.error('[Clients] Save job error:', error);
            window.SteadyUtils.showToast('Failed to save job', 'error');
        } finally {
            this.state.isSaving = false;
        }
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Search input
        const searchInput = document.getElementById('clientsSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterClients(e.target.value);
            });
        }

        // Client cards
        document.querySelectorAll('.clients-card').forEach(card => {
            card.addEventListener('click', () => {
                const clientId = card.dataset.clientId;
                this.openViewModal(clientId);
            });
        });
    },

    /**
     * Utility functions
     */
    formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    },

    formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
        }
        return phone;
    },

    formatStatus(status) {
        if (!status) return 'Unknown';
        return status.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    },

    getRelativeTime(dateString) {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    truncateText(text, maxLength) {
        if (!text) return '';
        const escaped = this.escapeHtml(text);
        if (escaped.length <= maxLength) return escaped;
        return escaped.substring(0, maxLength) + '...';
    },

    /**
     * Render styles
     */
    renderStyles() {
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
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
}

.clients-subtitle {
    color: var(--text-secondary);
    margin-top: 0.5rem;
    font-size: 1rem;
}

/* Stats Grid */
.clients-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
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
}

.clients-stat-icon {
    font-size: 2rem;
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
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
}

/* Search */
.clients-search-container {
    margin-bottom: 2rem;
}

.clients-search-input {
    width: 100%;
    padding: 0.875rem 1rem;
    font-size: 1rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 12px;
    color: var(--text-primary);
    transition: all 0.2s ease;
}

.clients-search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Client Cards */
.clients-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
}

.clients-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.clients-card:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
}

.clients-card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.clients-card-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 600;
}

.clients-card-info {
    flex: 1;
    min-width: 0;
}

.clients-card-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.clients-card-company {
    font-size: 0.875rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 0.125rem;
}

.clients-card-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
}

.clients-card-detail {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.clients-card-detail-icon {
    font-size: 1rem;
}

.clients-card-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
}

.clients-card-stat {
    text-align: center;
}

.clients-card-stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
}

.clients-card-stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

.clients-card-btn {
    width: 100%;
    padding: 0.75rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.clients-card-btn:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
}

/* Empty State */
.clients-empty-state {
    text-align: center;
    padding: 4rem 2rem;
}

.clients-empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
}

.clients-empty-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.clients-empty-text {
    color: var(--text-secondary);
    font-size: 1rem;
}

/* View Modal */
.clients-view-modal-overlay {
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
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.2s ease;
    padding: 2rem;
}

.clients-view-modal {
    background: var(--surface);
    border-radius: 16px;
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.clients-view-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    padding: 2rem;
    border-bottom: 1px solid var(--border);
}

.clients-view-modal-header h2 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
}

.clients-view-modal-close {
    background: transparent;
    border: none;
    font-size: 2rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.clients-view-modal-close:hover {
    background: var(--border);
}

.clients-view-modal-body {
    padding: 2rem;
}

.clients-view-section {
    margin-bottom: 2rem;
}

.clients-view-section:last-child {
    margin-bottom: 0;
}

.clients-view-section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 1rem;
}

.clients-view-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.clients-view-info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.clients-view-info-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.clients-view-info-value {
    font-size: 1rem;
    color: var(--text-primary);
    font-weight: 500;
}

/* Item Cards */
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
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}

.clients-item-card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.75rem;
}

.clients-item-card-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.clients-item-card-status {
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.clients-item-card-status-draft { background: #f3f4f6; color: #6b7280; }
.clients-item-card-status-sent { background: #dbeafe; color: #1e40af; }
.clients-item-card-status-accepted { background: #d1fae5; color: #065f46; }
.clients-item-card-status-rejected { background: #fee2e2; color: #991b1b; }
.clients-item-card-status-expired { background: #fef3c7; color: #92400e; }
.clients-item-card-status-scheduled { background: #dbeafe; color: #1e40af; }
.clients-item-card-status-in_progress { background: #fef3c7; color: #92400e; }
.clients-item-card-status-completed { background: #d1fae5; color: #065f46; }
.clients-item-card-status-on_hold { background: #f3f4f6; color: #6b7280; }
.clients-item-card-status-cancelled { background: #fee2e2; color: #991b1b; }

.clients-item-card-amount {
    font-weight: 700;
    color: var(--primary);
}

.clients-item-card-date {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

/* Detail Modal */
.clients-detail-modal-overlay {
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
    opacity: 0;
    transition: opacity 0.2s ease;
    padding: 2rem;
}

.clients-detail-modal {
    background: var(--surface);
    border-radius: 16px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.clients-detail-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2rem;
    border-bottom: 1px solid var(--border);
}

.clients-detail-modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
}

.clients-detail-modal-close {
    background: transparent;
    border: none;
    font-size: 2rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.clients-detail-modal-close:hover {
    background: var(--border);
}

.clients-detail-modal-body {
    padding: 2rem;
}

.clients-detail-section {
    margin-bottom: 2rem;
}

.clients-detail-section:last-child {
    margin-bottom: 0;
}

.clients-detail-section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 1rem;
}

.clients-detail-row {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
}

.clients-detail-row:last-child {
    border-bottom: none;
}

.clients-detail-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
}

.clients-detail-value {
    font-size: 0.875rem;
    color: var(--text-primary);
    font-weight: 600;
}

.clients-detail-status {
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.clients-detail-status-draft { background: #f3f4f6; color: #6b7280; }
.clients-detail-status-sent { background: #dbeafe; color: #1e40af; }
.clients-detail-status-accepted { background: #d1fae5; color: #065f46; }
.clients-detail-status-rejected { background: #fee2e2; color: #991b1b; }
.clients-detail-status-expired { background: #fef3c7; color: #92400e; }
.clients-detail-status-scheduled { background: #dbeafe; color: #1e40af; }
.clients-detail-status-in_progress { background: #fef3c7; color: #92400e; }
.clients-detail-status-completed { background: #d1fae5; color: #065f46; }
.clients-detail-status-on_hold { background: #f3f4f6; color: #6b7280; }
.clients-detail-status-cancelled { background: #fee2e2; color: #991b1b; }

.clients-detail-text {
    color: var(--text-primary);
    line-height: 1.6;
}

.clients-detail-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
}

.clients-detail-info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.clients-detail-table {
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
}

.clients-detail-table-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--background);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
}

.clients-detail-table-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--border);
    font-size: 0.875rem;
    color: var(--text-primary);
}

.clients-detail-total {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    margin-top: 1rem;
    background: var(--background);
    border-radius: 8px;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
}

.clients-detail-photos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
}

.clients-detail-photo {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--border);
    cursor: pointer;
}

.clients-detail-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem 2rem;
    border-top: 1px solid var(--border);
}

.clients-detail-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
}

.clients-detail-btn-secondary {
    background: var(--background);
    color: var(--text-primary);
    border: 1px solid var(--border);
}

.clients-detail-btn-secondary:hover {
    background: var(--border);
}

.clients-detail-btn-primary {
    background: var(--primary);
    color: white;
}

.clients-detail-btn-primary:hover {
    background: var(--primary-hover);
}

/* Edit Modal */
.clients-edit-modal-overlay {
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
    opacity: 0;
    transition: opacity 0.2s ease;
    padding: 2rem;
}

.clients-edit-modal {
    background: var(--surface);
    border-radius: 16px;
    width: 90%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.clients-edit-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2rem;
    border-bottom: 1px solid var(--border);
}

.clients-edit-modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
}

.clients-edit-modal-close {
    background: transparent;
    border: none;
    font-size: 2rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.clients-edit-modal-close:hover {
    background: var(--border);
}

.clients-edit-modal-body {
    padding: 2rem;
}

.clients-edit-form-group {
    margin-bottom: 1.5rem;
}

.clients-edit-form-group:last-child {
    margin-bottom: 0;
}

.clients-edit-form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.clients-edit-form-group input[type="text"],
.clients-edit-form-group input[type="date"],
.clients-edit-form-group input[type="number"],
.clients-edit-form-group select,
.clients-edit-form-group textarea {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.9375rem;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    transition: all 0.2s ease;
}

.clients-edit-form-group input:focus,
.clients-edit-form-group select:focus,
.clients-edit-form-group textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.clients-edit-form-group textarea {
    resize: vertical;
    min-height: 80px;
}

.clients-edit-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

/* Line Items */
.clients-edit-line-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.clients-edit-line-item {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: 0.5rem;
    align-items: center;
}

.clients-edit-line-item input {
    padding: 0.5rem;
    font-size: 0.875rem;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
}

.clients-edit-remove-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: var(--background);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.clients-edit-remove-btn:hover {
    background: #fee2e2;
    border-color: #991b1b;
    color: #991b1b;
}

.clients-edit-add-btn {
    width: 100%;
    padding: 0.625rem;
    background: var(--background);
    border: 1px dashed var(--border);
    border-radius: 8px;
    color: var(--primary);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.clients-edit-add-btn:hover {
    border-color: var(--primary);
    background: rgba(102, 126, 234, 0.05);
}

.clients-edit-total {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    margin-top: 1rem;
    background: var(--background);
    border-radius: 8px;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
}

.clients-edit-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem 2rem;
    border-top: 1px solid var(--border);
}

.clients-edit-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
}

.clients-edit-btn-secondary {
    background: var(--background);
    color: var(--text-primary);
    border: 1px solid var(--border);
}

.clients-edit-btn-secondary:hover {
    background: var(--border);
}

.clients-edit-btn-primary {
    background: var(--primary);
    color: white;
}

.clients-edit-btn-primary:hover {
    background: var(--primary-hover);
}
</style>`;
    }
};
