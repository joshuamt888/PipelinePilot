window.EstimatesModule = {
    // STATE
    state: {
        estimates: [],
        leads: [],
        container: 'estimates-content',
        currentFilter: 'all',
        stats: null
    },

    // INIT
    async estimates_init(targetContainer = 'estimates-content') {
        this.state.container = targetContainer;

        try {
            await this.estimates_loadData();
            this.estimates_render();
        } catch (error) {
            this.estimates_showError('Failed to load estimates');
        }
    },

    // LOAD DATA
    async estimates_loadData() {
        const [estimates, leads] = await Promise.all([
            API.getEstimates(),
            API.getLeads()
        ]);

        this.state.estimates = Array.isArray(estimates) ? estimates : [];
        this.state.leads = Array.isArray(leads) ? leads : [];

        // Calculate stats
        const acceptedEstimates = this.state.estimates.filter(e => e.status === 'accepted');
        const pendingEstimates = this.state.estimates.filter(e => e.status === 'sent' || e.status === 'draft');

        const totalQuoted = this.state.estimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
        const totalAccepted = acceptedEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
        const totalPending = pendingEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);

        this.state.stats = {
            totalQuoted,
            totalAccepted,
            totalPending,
            countTotal: this.state.estimates.length,
            countAccepted: acceptedEstimates.length,
            countPending: pendingEstimates.length
        };
    },

    // RENDER
    estimates_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.estimates_renderStyles()}
            <div class="est-app">
                ${this.estimates_renderSidebar()}
                ${this.estimates_renderMain()}
            </div>
        `;

        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
            this.estimates_attachEvents();
        }, 50);
    },

    // SIDEBAR
    estimates_renderSidebar() {
        const stats = this.state.stats;

        return `
            <aside class="est-sidebar">
                <div class="est-sidebar-header">
                    <div class="est-logo">
                        <div class="est-logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke-width="2"/>
                                <polyline points="14 2 14 8 20 8" stroke-width="2"/>
                            </svg>
                        </div>
                        <div class="est-logo-text">
                            <div class="est-logo-title">Estimates</div>
                            <div class="est-logo-sub">${stats.countTotal} total</div>
                        </div>
                    </div>
                    <button class="est-btn-new" data-action="create-estimate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>

                <nav class="est-nav">
                    <button class="est-nav-item ${this.state.currentFilter === 'all' ? 'active' : ''}" data-action="filter-all">
                        <div class="est-nav-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
                                <path d="M3 9h18" stroke-width="2"/>
                            </svg>
                        </div>
                        <div class="est-nav-content">
                            <div class="est-nav-label">All Estimates</div>
                            <div class="est-nav-value">${window.formatCurrency(stats.totalQuoted)}</div>
                        </div>
                        <div class="est-nav-count">${stats.countTotal}</div>
                    </button>

                    <button class="est-nav-item ${this.state.currentFilter === 'accepted' ? 'active' : ''}" data-action="filter-accepted">
                        <div class="est-nav-icon est-nav-icon-success">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2"/>
                                <polyline points="22 4 12 14.01 9 11.01" stroke-width="2"/>
                            </svg>
                        </div>
                        <div class="est-nav-content">
                            <div class="est-nav-label">Accepted</div>
                            <div class="est-nav-value">${window.formatCurrency(stats.totalAccepted)}</div>
                        </div>
                        <div class="est-nav-count">${stats.countAccepted}</div>
                    </button>

                    <button class="est-nav-item ${this.state.currentFilter === 'pending' ? 'active' : ''}" data-action="filter-pending">
                        <div class="est-nav-icon est-nav-icon-warning">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                                <polyline points="12 6 12 12 16 14" stroke-width="2"/>
                            </svg>
                        </div>
                        <div class="est-nav-content">
                            <div class="est-nav-label">Pending</div>
                            <div class="est-nav-value">${window.formatCurrency(stats.totalPending)}</div>
                        </div>
                        <div class="est-nav-count">${stats.countPending}</div>
                    </button>
                </nav>
            </aside>
        `;
    },

    // MAIN CONTENT
    estimates_renderMain() {
        return `
            <main class="est-main">
                ${this.estimates_renderMainContent()}
            </main>
        `;
    },

    // CARD
    estimates_renderCard(estimate) {
        const lead = this.state.leads.find(l => l.id === estimate.lead_id);
        const leadName = lead ? lead.name : 'Unknown Lead';

        let statusClass = 'draft';
        let statusLabel = 'Draft';
        let statusGradient = 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';

        if (estimate.status === 'accepted') {
            statusClass = 'accepted';
            statusLabel = 'Accepted';
            statusGradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        } else if (estimate.status === 'sent') {
            statusClass = 'sent';
            statusLabel = 'Sent';
            statusGradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        }

        return `
            <div class="est-card est-card-${statusClass}" data-action="view-estimate" data-id="${estimate.id}">
                <div class="est-card-header">
                    <div class="est-card-status" style="background: ${statusGradient}">
                        ${statusLabel}
                    </div>
                    <div class="est-card-number">#${estimate.estimate_number || estimate.id}</div>
                </div>

                <div class="est-card-body">
                    <h3 class="est-card-title">${API.escapeHtml(estimate.title || 'Untitled Estimate')}</h3>

                    <div class="est-card-lead">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="2"/>
                            <circle cx="12" cy="7" r="4" stroke-width="2"/>
                        </svg>
                        ${API.escapeHtml(leadName)}
                    </div>

                    <div class="est-card-meta">
                        <div class="est-card-date">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2"/>
                                <line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/>
                                <line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/>
                                <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
                            </svg>
                            ${window.SteadyUtils.formatDate(estimate.created_at, 'short')}
                        </div>
                        ${estimate.line_items && estimate.line_items.length > 0 ? `
                            <div class="est-card-items">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <line x1="8" y1="6" x2="21" y2="6" stroke-width="2"/>
                                    <line x1="8" y1="12" x2="21" y2="12" stroke-width="2"/>
                                    <line x1="8" y1="18" x2="21" y2="18" stroke-width="2"/>
                                </svg>
                                ${estimate.line_items.length} items
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="est-card-footer">
                    <div class="est-card-price">${window.formatCurrency(estimate.total_price || 0)}</div>
                    <div class="est-card-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    },

    // UPDATE FILTER (NO RE-RENDER)
    estimates_updateFilter(newFilter) {
        if (this.state.currentFilter === newFilter) return;

        this.state.currentFilter = newFilter;

        // Update sidebar active states
        const navItems = document.querySelectorAll('.est-nav-item');
        navItems.forEach(item => {
            const action = item.dataset.action;
            const filter = action.replace('filter-', '');
            if (filter === newFilter) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update main content
        const main = document.querySelector('.est-main');
        if (main) {
            main.innerHTML = this.estimates_renderMainContent();
        }
    },

    // RENDER MAIN CONTENT ONLY
    estimates_renderMainContent() {
        let estimatesToShow = [];

        if (this.state.currentFilter === 'all') {
            estimatesToShow = this.state.estimates;
        } else if (this.state.currentFilter === 'accepted') {
            estimatesToShow = this.state.estimates.filter(e => e.status === 'accepted');
        } else if (this.state.currentFilter === 'pending') {
            estimatesToShow = this.state.estimates.filter(e => e.status === 'sent' || e.status === 'draft');
        }

        if (estimatesToShow.length > 0) {
            return `
                <div class="est-grid">
                    ${estimatesToShow.map(estimate => this.estimates_renderCard(estimate)).join('')}
                </div>
            `;
        } else {
            return `
                <div class="est-empty">
                    <div class="est-empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke-width="2"/>
                            <polyline points="14 2 14 8 20 8" stroke-width="2"/>
                        </svg>
                    </div>
                    <h3 class="est-empty-title">No estimates yet</h3>
                    <p class="est-empty-text">Create your first estimate to get started</p>
                    <button class="est-btn-primary" data-action="create-estimate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        New Estimate
                    </button>
                </div>
            `;
        }
    },

    // ATTACH EVENTS
    estimates_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            switch (action) {
                case 'create-estimate':
                    this.estimates_showCreateModal();
                    break;
                case 'view-estimate':
                    this.estimates_showDetailModal(id);
                    break;
                case 'filter-all':
                case 'filter-accepted':
                case 'filter-pending':
                    const filter = action.replace('filter-', '');
                    this.estimates_updateFilter(filter);
                    break;
            }
        };
    },

    // UTILITIES
    estimates_formatStatus(status) {
        const statusMap = {
            draft: 'Draft',
            sent: 'Sent',
            accepted: 'Accepted',
            rejected: 'Rejected'
        };
        return statusMap[status] || status;
    },

    estimates_showError(message) {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            <div class="est-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke-width="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/>
                </svg>
                <p>${message}</p>
            </div>
        `;
    },

    // PLACEHOLDER MODALS
    estimates_showCreateModal() {
        console.log('Create modal - to be implemented');
    },

    estimates_showDetailModal(id) {
        console.log('Detail modal for', id);
    },

    // STYLES
    estimates_renderStyles() {
        return `
            <style>
                /* RESET & BASE */
                .est-app {
                    display: flex;
                    height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    overflow: hidden;
                }

                /* SIDEBAR */
                .est-sidebar {
                    width: 320px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px);
                    border-right: 1px solid rgba(255, 255, 255, 0.2);
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                }

                .est-sidebar-header {
                    padding: 2rem;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .est-logo {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .est-logo-icon {
                    width: 3rem;
                    height: 3rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
                }

                .est-logo-icon svg {
                    width: 1.75rem;
                    height: 1.75rem;
                    color: white;
                    stroke-width: 2.5;
                }

                .est-logo-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #1e293b;
                    letter-spacing: -0.02em;
                }

                .est-logo-sub {
                    font-size: 0.875rem;
                    color: #64748b;
                    font-weight: 500;
                }

                .est-btn-new {
                    width: 3rem;
                    height: 3rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .est-btn-new:hover {
                    transform: translateY(-2px) scale(1.05);
                    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
                }

                .est-btn-new svg {
                    width: 1.5rem;
                    height: 1.5rem;
                    color: white;
                    stroke-width: 2.5;
                }

                /* NAVIGATION */
                .est-nav {
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .est-nav-item {
                    background: white;
                    border: 2px solid transparent;
                    border-radius: 1rem;
                    padding: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                }

                .est-nav-item:hover {
                    transform: translateX(4px);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                    border-color: rgba(102, 126, 234, 0.2);
                }

                .est-nav-item.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-color: transparent;
                    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
                    transform: translateX(4px);
                }

                .est-nav-icon {
                    width: 2.5rem;
                    height: 2.5rem;
                    background: rgba(102, 126, 234, 0.1);
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: all 0.3s ease;
                }

                .est-nav-item.active .est-nav-icon {
                    background: rgba(255, 255, 255, 0.2);
                }

                .est-nav-icon svg {
                    width: 1.25rem;
                    height: 1.25rem;
                    color: #667eea;
                }

                .est-nav-item.active .est-nav-icon svg {
                    color: white;
                }

                .est-nav-icon-success {
                    background: rgba(16, 185, 129, 0.1);
                }

                .est-nav-icon-success svg {
                    color: #10b981;
                }

                .est-nav-icon-warning {
                    background: rgba(245, 158, 11, 0.1);
                }

                .est-nav-icon-warning svg {
                    color: #f59e0b;
                }

                .est-nav-content {
                    flex: 1;
                    min-width: 0;
                }

                .est-nav-label {
                    font-size: 0.9375rem;
                    font-weight: 600;
                    color: #475569;
                    margin-bottom: 0.25rem;
                }

                .est-nav-item.active .est-nav-label {
                    color: white;
                }

                .est-nav-value {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: #1e293b;
                }

                .est-nav-item.active .est-nav-value {
                    color: white;
                }

                .est-nav-count {
                    width: 2rem;
                    height: 2rem;
                    background: rgba(102, 126, 234, 0.1);
                    border-radius: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: #667eea;
                }

                .est-nav-item.active .est-nav-count {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }

                /* MAIN CONTENT */
                .est-main {
                    flex: 1;
                    overflow-y: auto;
                    padding: 2rem;
                }

                /* GRID */
                .est-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
                    gap: 1.5rem;
                }

                /* CARD */
                .est-card {
                    background: white;
                    border-radius: 1.5rem;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                }

                .est-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
                }

                .est-card-header {
                    padding: 1.5rem 1.5rem 0 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .est-card-status {
                    padding: 0.5rem 1rem;
                    border-radius: 2rem;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: white;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .est-card-number {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #94a3b8;
                }

                .est-card-body {
                    padding: 1.5rem;
                }

                .est-card-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 1rem 0;
                    line-height: 1.3;
                }

                .est-card-lead {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9375rem;
                    color: #64748b;
                    font-weight: 500;
                    margin-bottom: 1rem;
                }

                .est-card-lead svg {
                    width: 1rem;
                    height: 1rem;
                    color: #94a3b8;
                }

                .est-card-meta {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .est-card-date,
                .est-card-items {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    font-size: 0.8125rem;
                    color: #94a3b8;
                    font-weight: 500;
                }

                .est-card-date svg,
                .est-card-items svg {
                    width: 0.875rem;
                    height: 0.875rem;
                }

                .est-card-footer {
                    padding: 1.25rem 1.5rem;
                    background: linear-gradient(to top, rgba(102, 126, 234, 0.04), transparent);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-top: 1px solid rgba(0, 0, 0, 0.05);
                }

                .est-card-price {
                    font-size: 1.75rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .est-card-arrow {
                    width: 2.5rem;
                    height: 2.5rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .est-card:hover .est-card-arrow {
                    transform: translateX(4px);
                }

                .est-card-arrow svg {
                    width: 1.25rem;
                    height: 1.25rem;
                    color: white;
                }

                /* EMPTY STATE */
                .est-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 60vh;
                    text-align: center;
                    padding: 3rem;
                }

                .est-empty-icon {
                    width: 6rem;
                    height: 6rem;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 2rem;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }

                .est-empty-icon svg {
                    width: 3rem;
                    height: 3rem;
                    color: #667eea;
                    stroke-width: 2;
                }

                .est-empty-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: white;
                    margin: 0 0 0.5rem 0;
                }

                .est-empty-text {
                    font-size: 1.125rem;
                    color: rgba(255, 255, 255, 0.8);
                    margin: 0 0 2rem 0;
                }

                .est-btn-primary {
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 1rem;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                }

                .est-btn-primary:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
                }

                .est-btn-primary svg {
                    width: 1.25rem;
                    height: 1.25rem;
                }

                /* ERROR STATE */
                .est-error {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    text-align: center;
                    padding: 3rem;
                    color: white;
                }

                .est-error svg {
                    width: 4rem;
                    height: 4rem;
                    margin-bottom: 1rem;
                }

                /* SCROLLBAR */
                .est-sidebar::-webkit-scrollbar,
                .est-main::-webkit-scrollbar {
                    width: 8px;
                }

                .est-sidebar::-webkit-scrollbar-track,
                .est-main::-webkit-scrollbar-track {
                    background: transparent;
                }

                .est-sidebar::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }

                .est-main::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                }

                .est-sidebar::-webkit-scrollbar-thumb:hover,
                .est-main::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.2);
                }
            </style>
        `;
    },

    // Module interface
    init(container) {
        return this.estimates_init(container);
    }
};
