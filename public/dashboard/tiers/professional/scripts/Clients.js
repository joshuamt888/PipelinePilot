/**
 * CLIENTS MODULE
 * Shows leads that have BOTH estimates AND jobs
 * Table view similar to Leads.js
 */
window.ClientsModule = {
    // State
    state: {
        clients: [],
        isLoading: false,
        searchTerm: '',
        currentClientDetail: null,
        targetContainer: 'clients-content',
        sortBy: 'recent', // recent, name, revenue
        clientLimit: 5000
    },

    // Init with fade-in
    async init(targetContainer = 'clients-content') {
        console.log('Clients module loading');

        try {
            this.state.targetContainer = targetContainer;
            this.state.isLoading = true;

            const container = document.getElementById(targetContainer);
            if (container) {
                container.style.opacity = '0';
                container.style.transition = 'opacity 0.3s ease';
            }

            await this.clients_loadClients();
            this.clients_render();

            // Fade in
            setTimeout(() => {
                if (container) {
                    container.style.opacity = '1';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }, 50);

            console.log('Clients module ready');

        } catch (error) {
            console.error('Clients init failed:', error);
            this.clients_renderError(error.message);
        } finally {
            this.state.isLoading = false;
        }
    },

    // Load clients from API
    async clients_loadClients() {
        try {
            this.state.clients = await API.getClients();
            console.log(`Loaded ${this.state.clients.length} clients`);
        } catch (error) {
            console.error('Failed to load clients:', error);
            this.state.clients = [];
            throw error;
        }
    },

    // Main render
    clients_render() {
        const container = document.getElementById(this.state.targetContainer);
        if (!container) return;

        container.innerHTML = `
            <div class="clients-container">
                ${this.clients_renderTableView()}
                ${this.clients_renderStyles()}
            </div>
        `;

        this.clients_setupEventListeners();
    },

    // Table view
    clients_renderTableView() {
        const filteredClients = this.clients_getFilteredClients();
        const totalClients = this.state.clients.length;

        return `
            <div class="clients-table-view">
                <div class="clients-table-header">
                    <div class="clients-table-header-left">
                        <h2 class="clients-table-title">Clients (${filteredClients.length})</h2>
                        <p class="clients-subtitle">Leads with both estimates and jobs</p>
                    </div>
                    <div class="clients-table-header-right">
                        ${totalClients > 0 ? `
                            <div class="clients-counter">
                                ${totalClients} / ${this.state.clientLimit}
                            </div>
                        ` : ''}
                        <select class="clients-sort-dropdown" onchange="ClientsModule.clients_changeSorting(this.value)">
                            <option value="recent" ${this.state.sortBy === 'recent' ? 'selected' : ''}>Most Recent</option>
                            <option value="name" ${this.state.sortBy === 'name' ? 'selected' : ''}>Name A-Z</option>
                            <option value="revenue" ${this.state.sortBy === 'revenue' ? 'selected' : ''}>Highest Revenue</option>
                        </select>
                        <div class="clients-search-box">
                            <input type="text"
                                   class="clients-search-input"
                                   placeholder="Search clients..."
                                   value="${API.escapeHtml(this.state.searchTerm)}"
                                   id="clients_searchInput">
                            <i data-lucide="search" class="clients-search-icon" style="width: 18px; height: 18px;"></i>
                        </div>
                    </div>
                </div>

                <div class="clients-table-container">
                    ${filteredClients.length > 0 ?
                        this.clients_renderTable(filteredClients) :
                        this.clients_renderEmptyState()}
                </div>
            </div>
        `;
    },

    // Render table
    clients_renderTable(clients) {
        return `
            <table class="clients-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Contact</th>
                        <th>Estimates</th>
                        <th>Jobs</th>
                        <th>Revenue</th>
                        <th>Last Activity</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${clients.map(client => this.clients_renderRow(client)).join('')}
                </tbody>
            </table>
        `;
    },

    // Render table row
    clients_renderRow(client) {
        const lastActivity = this.clients_formatTimeAgo(client.lastActivity);
        const revenue = this.clients_formatMoney(client.totalRevenue);

        return `
            <tr class="clients-row" data-client-id="${client.id}">
                <td class="clients-name-cell">
                    <div class="clients-name-wrapper">
                        <span class="clients-avatar">${this.clients_getInitials(client.name)}</span>
                        <span class="clients-name">${API.escapeHtml(client.name || 'Unnamed')}</span>
                    </div>
                </td>
                <td>${API.escapeHtml(client.company || '—')}</td>
                <td>
                    <div class="clients-contact">
                        ${client.email ? `<div>${API.escapeHtml(client.email)}</div>` : ''}
                        ${client.phone ? `<div>${API.escapeHtml(client.phone)}</div>` : ''}
                        ${!client.email && !client.phone ? '—' : ''}
                    </div>
                </td>
                <td><span class="clients-badge">${client.estimatesCount}</span></td>
                <td><span class="clients-badge">${client.jobsCount}</span></td>
                <td class="clients-revenue">${revenue}</td>
                <td>${lastActivity}</td>
                <td>
                    <button class="clients-view-btn" onclick="ClientsModule.clients_showClientDetail('${client.id}')">
                        View Details
                    </button>
                </td>
            </tr>
        `;
    },

    // Filter and sort clients
    clients_getFilteredClients() {
        let filtered = [...this.state.clients];

        // Search
        if (this.state.searchTerm.trim()) {
            const term = this.state.searchTerm.toLowerCase();
            filtered = filtered.filter(client =>
                (client.name && client.name.toLowerCase().includes(term)) ||
                (client.company && client.company.toLowerCase().includes(term)) ||
                (client.email && client.email.toLowerCase().includes(term)) ||
                (client.phone && client.phone.includes(term))
            );
        }

        // Sort
        filtered.sort((a, b) => {
            switch (this.state.sortBy) {
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'revenue':
                    return (b.totalRevenue || 0) - (a.totalRevenue || 0);
                case 'recent':
                default:
                    return new Date(b.lastActivity) - new Date(a.lastActivity);
            }
        });

        return filtered;
    },

    // Show client detail modal
    clients_showClientDetail(clientId) {
        const client = this.state.clients.find(c => c.id === clientId);
        if (!client) return;

        this.state.currentClientDetail = client;

        const modalHTML = `
            <div class="clients-modal-overlay" onclick="ClientsModule.clients_closeModal(event)">
                <div class="clients-modal" onclick="event.stopPropagation()">
                    <div class="clients-modal-header">
                        <h2>${API.escapeHtml(client.name || 'Unnamed Client')}</h2>
                        <button class="clients-modal-close" onclick="ClientsModule.clients_closeModal()">×</button>
                    </div>
                    <div class="clients-modal-body">
                        ${this.clients_renderClientDetail(client)}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        requestAnimationFrame(() => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    },

    // Render client detail
    clients_renderClientDetail(client) {
        const estimatesList = client.estimates.map(est => `
            <div class="clients-detail-item" onclick="ClientsModule.clients_openEstimate('${est.id}')">
                <div class="clients-detail-item-header">
                    <span class="clients-detail-item-title">${API.escapeHtml(est.title || 'Untitled Estimate')}</span>
                    <span class="clients-status-badge clients-status-${est.status}">${est.status}</span>
                </div>
                <div class="clients-detail-item-meta">
                    <span>${this.clients_formatDate(est.created_at)}</span>
                    <span>${this.clients_formatMoney(est.total_amount)}</span>
                </div>
            </div>
        `).join('');

        const jobsList = client.jobs.map(job => `
            <div class="clients-detail-item" onclick="ClientsModule.clients_openJob('${job.id}')">
                <div class="clients-detail-item-header">
                    <span class="clients-detail-item-title">${API.escapeHtml(job.title || 'Untitled Job')}</span>
                    <span class="clients-status-badge clients-status-${job.status}">${job.status}</span>
                </div>
                <div class="clients-detail-item-meta">
                    <span>${this.clients_formatDate(job.created_at)}</span>
                    <span>${this.clients_formatMoney(job.final_price || job.quoted_price)}</span>
                </div>
            </div>
        `).join('');

        return `
            <div class="clients-detail-grid">
                <div class="clients-detail-section">
                    <h3>Contact Information</h3>
                    <div class="clients-detail-info">
                        ${client.company ? `<p><strong>Company:</strong> ${API.escapeHtml(client.company)}</p>` : ''}
                        ${client.email ? `<p><strong>Email:</strong> ${API.escapeHtml(client.email)}</p>` : ''}
                        ${client.phone ? `<p><strong>Phone:</strong> ${API.escapeHtml(client.phone)}</p>` : ''}
                    </div>
                </div>

                <div class="clients-detail-section">
                    <h3>Summary</h3>
                    <div class="clients-stats-grid">
                        <div class="clients-stat">
                            <div class="clients-stat-value">${client.estimatesCount}</div>
                            <div class="clients-stat-label">Estimates</div>
                        </div>
                        <div class="clients-stat">
                            <div class="clients-stat-value">${client.jobsCount}</div>
                            <div class="clients-stat-label">Jobs</div>
                        </div>
                        <div class="clients-stat">
                            <div class="clients-stat-value">${this.clients_formatMoney(client.totalRevenue)}</div>
                            <div class="clients-stat-label">Total Revenue</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="clients-detail-tabs">
                <button class="clients-tab-btn active" data-tab="estimates">Estimates (${client.estimatesCount})</button>
                <button class="clients-tab-btn" data-tab="jobs">Jobs (${client.jobsCount})</button>
            </div>

            <div class="clients-tab-content">
                <div class="clients-tab-pane active" data-pane="estimates">
                    ${estimatesList || '<p class="clients-empty">No estimates</p>'}
                </div>
                <div class="clients-tab-pane" data-pane="jobs">
                    ${jobsList || '<p class="clients-empty">No jobs</p>'}
                </div>
            </div>
        `;
    },

    // Open estimate in Estimates module
    clients_openEstimate(estimateId) {
        this.clients_closeModal();
        window.loadPage('estimates');
        // Wait for module to load, then open the estimate
        setTimeout(() => {
            if (window.EstimatesModule && window.EstimatesModule.estimates_viewEstimate) {
                window.EstimatesModule.estimates_viewEstimate(estimateId);
            }
        }, 300);
    },

    // Open job in Jobs module
    clients_openJob(jobId) {
        this.clients_closeModal();
        window.loadPage('jobs');
        // Wait for module to load, then open the job
        setTimeout(() => {
            if (window.JobsManagementModule && window.JobsManagementModule.jobs_viewJob) {
                window.JobsManagementModule.jobs_viewJob(jobId);
            }
        }, 300);
    },

    // Close modal
    clients_closeModal(event) {
        if (event && event.target !== event.currentTarget) return;

        const modal = document.querySelector('.clients-modal-overlay');
        if (modal) modal.remove();
        this.state.currentClientDetail = null;
    },

    // Change sorting
    clients_changeSorting(sortBy) {
        this.state.sortBy = sortBy;
        this.clients_render();
    },

    // Setup event listeners
    clients_setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('clients_searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.searchTerm = e.target.value;
                this.clients_render();
            });
        }

        // Tab switching in modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('clients-tab-btn')) {
                const tab = e.target.dataset.tab;

                // Update buttons
                document.querySelectorAll('.clients-tab-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                // Update panes
                document.querySelectorAll('.clients-tab-pane').forEach(pane => pane.classList.remove('active'));
                document.querySelector(`.clients-tab-pane[data-pane="${tab}"]`)?.classList.add('active');
            }
        });
    },

    // Empty state
    clients_renderEmptyState() {
        return `
            <div class="clients-empty-state">
                <i data-lucide="users" style="width: 64px; height: 64px; opacity: 0.3;"></i>
                <h3>No clients yet</h3>
                <p>Clients are leads that have both estimates and jobs.<br>Create estimates and jobs for your leads to see them here.</p>
            </div>
        `;
    },

    // Error state
    clients_renderError(message) {
        const container = document.getElementById(this.state.targetContainer);
        if (container) {
            container.innerHTML = `
                <div class="clients-error">
                    <h3>Error</h3>
                    <p>${API.escapeHtml(message)}</p>
                    <button onclick="ClientsModule.init()">Retry</button>
                </div>
            `;
        }
    },

    // Utility functions
    clients_formatMoney(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    },

    clients_formatDate(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    clients_formatTimeAgo(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return this.clients_formatDate(dateString);
    },

    clients_getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    },

    // Styles
    clients_renderStyles() {
        return `
            <style>
                .clients-container {
                    padding: 20px;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .clients-table-view {
                    background: var(--card-bg, #1a1a1a);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .clients-table-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 24px;
                    border-bottom: 1px solid var(--border-color, #333);
                }

                .clients-table-header-left {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .clients-table-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--text-primary, #fff);
                    margin: 0;
                }

                .clients-subtitle {
                    font-size: 14px;
                    color: var(--text-secondary, #999);
                    margin: 0;
                }

                .clients-table-header-right {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .clients-counter {
                    font-size: 13px;
                    color: var(--text-secondary, #999);
                    padding: 8px 12px;
                    background: var(--bg-secondary, #2a2a2a);
                    border-radius: 6px;
                }

                .clients-sort-dropdown {
                    padding: 8px 12px;
                    background: var(--bg-secondary, #2a2a2a);
                    border: 1px solid var(--border-color, #333);
                    border-radius: 6px;
                    color: var(--text-primary, #fff);
                    font-size: 14px;
                    cursor: pointer;
                }

                .clients-search-box {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .clients-search-input {
                    padding: 8px 12px 8px 36px;
                    background: var(--bg-secondary, #2a2a2a);
                    border: 1px solid var(--border-color, #333);
                    border-radius: 6px;
                    color: var(--text-primary, #fff);
                    font-size: 14px;
                    width: 250px;
                }

                .clients-search-icon {
                    position: absolute;
                    left: 10px;
                    color: var(--text-secondary, #999);
                }

                .clients-table-container {
                    overflow-x: auto;
                }

                .clients-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .clients-table thead th {
                    text-align: left;
                    padding: 12px 16px;
                    background: var(--bg-secondary, #2a2a2a);
                    color: var(--text-secondary, #999);
                    font-size: 13px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .clients-table tbody tr {
                    border-bottom: 1px solid var(--border-color, #333);
                    transition: background 0.2s;
                }

                .clients-table tbody tr:hover {
                    background: var(--bg-hover, rgba(255, 255, 255, 0.02));
                }

                .clients-table tbody td {
                    padding: 16px;
                    color: var(--text-primary, #fff);
                    font-size: 14px;
                }

                .clients-name-cell {
                    font-weight: 500;
                }

                .clients-name-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .clients-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 600;
                }

                .clients-contact {
                    font-size: 13px;
                    color: var(--text-secondary, #999);
                    line-height: 1.4;
                }

                .clients-badge {
                    display: inline-block;
                    padding: 4px 10px;
                    background: var(--bg-secondary, #2a2a2a);
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 500;
                }

                .clients-revenue {
                    font-weight: 600;
                    color: #10b981;
                }

                .clients-view-btn {
                    padding: 6px 12px;
                    background: var(--primary-color, #3b82f6);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .clients-view-btn:hover {
                    background: var(--primary-hover, #2563eb);
                }

                .clients-empty-state {
                    padding: 80px 20px;
                    text-align: center;
                    color: var(--text-secondary, #999);
                }

                .clients-empty-state h3 {
                    margin: 16px 0 8px;
                    color: var(--text-primary, #fff);
                    font-size: 20px;
                }

                .clients-empty-state p {
                    line-height: 1.6;
                }

                /* Modal styles */
                .clients-modal-overlay {
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
                    padding: 20px;
                }

                .clients-modal {
                    background: var(--card-bg, #1a1a1a);
                    border-radius: 12px;
                    width: 100%;
                    max-width: 900px;
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .clients-modal-header {
                    padding: 24px;
                    border-bottom: 1px solid var(--border-color, #333);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .clients-modal-header h2 {
                    margin: 0;
                    font-size: 24px;
                    color: var(--text-primary, #fff);
                }

                .clients-modal-close {
                    background: none;
                    border: none;
                    font-size: 32px;
                    color: var(--text-secondary, #999);
                    cursor: pointer;
                    line-height: 1;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                }

                .clients-modal-close:hover {
                    color: var(--text-primary, #fff);
                }

                .clients-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                }

                .clients-detail-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-bottom: 24px;
                }

                .clients-detail-section h3 {
                    margin: 0 0 16px;
                    font-size: 16px;
                    color: var(--text-primary, #fff);
                }

                .clients-detail-info p {
                    margin: 8px 0;
                    font-size: 14px;
                    color: var(--text-secondary, #999);
                }

                .clients-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }

                .clients-stat {
                    text-align: center;
                    padding: 16px;
                    background: var(--bg-secondary, #2a2a2a);
                    border-radius: 8px;
                }

                .clients-stat-value {
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--text-primary, #fff);
                }

                .clients-stat-label {
                    font-size: 13px;
                    color: var(--text-secondary, #999);
                    margin-top: 4px;
                }

                .clients-detail-tabs {
                    display: flex;
                    gap: 8px;
                    border-bottom: 1px solid var(--border-color, #333);
                    margin-bottom: 24px;
                }

                .clients-tab-btn {
                    padding: 12px 20px;
                    background: none;
                    border: none;
                    color: var(--text-secondary, #999);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                }

                .clients-tab-btn:hover {
                    color: var(--text-primary, #fff);
                }

                .clients-tab-btn.active {
                    color: var(--primary-color, #3b82f6);
                    border-bottom-color: var(--primary-color, #3b82f6);
                }

                .clients-tab-pane {
                    display: none;
                }

                .clients-tab-pane.active {
                    display: block;
                }

                .clients-detail-item {
                    padding: 16px;
                    background: var(--bg-secondary, #2a2a2a);
                    border-radius: 8px;
                    margin-bottom: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .clients-detail-item:hover {
                    background: var(--bg-hover, rgba(255, 255, 255, 0.05));
                }

                .clients-detail-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .clients-detail-item-title {
                    font-weight: 500;
                    color: var(--text-primary, #fff);
                }

                .clients-status-badge {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                    text-transform: capitalize;
                }

                .clients-status-accepted,
                .clients-status-completed,
                .clients-status-paid {
                    background: #10b98120;
                    color: #10b981;
                }

                .clients-status-sent,
                .clients-status-in_progress,
                .clients-status-invoiced {
                    background: #3b82f620;
                    color: #3b82f6;
                }

                .clients-status-draft,
                .clients-status-scheduled {
                    background: #f59e0b20;
                    color: #f59e0b;
                }

                .clients-status-rejected,
                .clients-status-cancelled {
                    background: #ef444420;
                    color: #ef4444;
                }

                .clients-detail-item-meta {
                    display: flex;
                    gap: 16px;
                    font-size: 13px;
                    color: var(--text-secondary, #999);
                }

                .clients-empty {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-secondary, #999);
                }

                .clients-error {
                    padding: 40px;
                    text-align: center;
                    color: var(--text-secondary, #999);
                }

                .clients-error button {
                    margin-top: 16px;
                    padding: 10px 20px;
                    background: var(--primary-color, #3b82f6);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }
            </style>
        `;
    }
};

console.log('✨ Clients module loaded');
