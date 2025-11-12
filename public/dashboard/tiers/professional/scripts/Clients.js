/**
 * CLIENTS MODULE - Simple Table View
 * Displays leads that have estimates or jobs
 */

window.ClientsModule = {
    // STATE
    state: {
        clients: [],
        filteredClients: [],
        container: 'clients-content',

        // UI state
        searchQuery: '',

        // Limits
        clientLimit: 5000
    },

    /**
     * Initialize
     */
    async init(targetContainer = 'clients-content') {
        this.state.container = targetContainer;
        this.clients_showLoading();

        try {
            const clients = await API.getClients();
            this.state.clients = Array.isArray(clients) ? clients : [];
            this.state.filteredClients = this.state.clients;

            console.log(`[Clients] Loaded ${this.state.clients.length} clients`);

            this.clients_render();
        } catch (error) {
            console.error('Error initializing Clients:', error);
            this.clients_showError('Failed to load clients');
        }
    },

    /**
     * Main render
     */
    clients_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        this.clients_applyFilters();

        container.innerHTML = `
            ${this.clients_renderStyles()}
            <div class="clients-container">
                ${this.clients_renderHeader()}
                ${this.clients_renderLimitBar()}
                ${this.clients_renderToolbar()}
                ${this.clients_renderTable()}
            </div>
        `;

        requestAnimationFrame(() => {
            this.clients_attachEvents();
        });
    },

    /**
     * Apply filters
     */
    clients_applyFilters() {
        let filtered = [...this.state.clients];

        // Search
        if (this.state.searchQuery.trim()) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(c => {
                const name = (c.name || '').toLowerCase();
                const email = (c.email || '').toLowerCase();
                const phone = (c.phone || '').toLowerCase();
                const company = (c.company || '').toLowerCase();

                return name.includes(query) || email.includes(query) ||
                       phone.includes(query) || company.includes(query);
            });
        }

        this.state.filteredClients = filtered;
    },

    /**
     * RENDER FUNCTIONS
     */
    clients_renderHeader() {
        return `
            <div class="clients-header">
                <div class="clients-header-content">
                    <h1>
                        <svg class="clients-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="9" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Clients
                    </h1>
                    <p class="clients-subtitle">Leads with estimates or jobs</p>
                </div>
            </div>
        `;
    },

    clients_renderLimitBar() {
        const total = this.state.clients.length;

        return `
            <div class="clients-limit-bar">
                <div class="clients-limit-counter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.125rem; height: 1.125rem;">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-width="2"/>
                        <circle cx="9" cy="7" r="4" stroke-width="2"/>
                    </svg>
                    <span>${total} / ${this.state.clientLimit} clients</span>
                </div>
            </div>
        `;
    },

    clients_renderToolbar() {
        return `
            <div class="clients-toolbar">
                <div class="clients-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8" stroke-width="2"/>
                        <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <input type="search" id="clientsSearchInput" placeholder="Search by name, email, or phone..."
                           value="${this.state.searchQuery}" autocomplete="off">
                </div>
            </div>
        `;
    },

    clients_renderTable() {
        if (this.state.filteredClients.length === 0) {
            return `
                <div class="clients-table-section">
                    <div class="clients-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-width="2"/>
                            <circle cx="9" cy="7" r="4" stroke-width="2"/>
                        </svg>
                        <h3>No clients found</h3>
                        <p>Clients appear here when leads have estimates or jobs</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="clients-table-section">
                <table class="clients-table">
                    <thead>
                        <tr>
                            <th>
                                Name
                                <span class="clients-sort-indicator">A-Z</span>
                            </th>
                            <th>Contact</th>
                            <th>Estimates</th>
                            <th>Jobs</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.state.filteredClients.map(c => this.clients_renderRow(c)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    clients_renderRow(client) {
        const contact = client.email || client.phone || 'No contact';

        return `
            <tr class="clients-table-row">
                <td class="clients-name-cell">
                    <div class="clients-name">${this.clients_escape(client.name)}</div>
                    ${client.company ? `<div class="clients-company">${this.clients_escape(client.company)}</div>` : ''}
                </td>
                <td class="clients-contact-cell">${this.clients_escape(contact)}</td>
                <td class="clients-count-cell">${client.estimatesCount || 0}</td>
                <td class="clients-count-cell">${client.jobsCount || 0}</td>
                <td class="clients-revenue-cell">${formatCurrency(client.totalRevenue || 0)}</td>
            </tr>
        `;
    },

    /**
     * EVENT HANDLERS
     */
    clients_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Search input
        const searchInput = container.querySelector('#clientsSearchInput');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.state.searchQuery = e.target.value;
                this.clients_instantFilterChange();
            };
        }
    },

    /**
     * Instant filter change (no full re-render)
     */
    clients_instantFilterChange() {
        this.clients_applyFilters();

        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Update table
        const tableSection = container.querySelector('.clients-table-section');
        if (tableSection) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.clients_renderTable();
            tableSection.outerHTML = tempDiv.firstElementChild.outerHTML;
        }

        console.log(`[Clients] Filtered: ${this.state.filteredClients.length} results`);
    },

    /**
     * UTILITY FUNCTIONS
     */
    clients_escape(str) {
        if (!str) return '';
        return API.escapeHtml(str);
    },

    clients_showLoading() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 400px;">
                <div style="text-align: center; color: var(--text-secondary);">
                    <div style="margin-bottom: 1rem; font-size: 2rem;">⏳</div>
                    <div>Loading clients...</div>
                </div>
            </div>
        `;
    },

    clients_showError(message) {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 400px;">
                <div style="text-align: center; color: var(--danger);">
                    <div style="margin-bottom: 1rem; font-size: 2rem;">⚠️</div>
                    <div>${message}</div>
                </div>
            </div>
        `;
    },

    /**
     * STYLES
     */
    clients_renderStyles() {
        return `
            <style>
                .clients-container {
                    width: 100%;
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 2rem;
                }

                /* Header */
                .clients-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .clients-header-content h1 {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 0.5rem 0;
                }

                .clients-title-icon {
                    width: 2rem;
                    height: 2rem;
                    stroke: var(--primary);
                    stroke-width: 2;
                }

                .clients-subtitle {
                    font-size: 1rem;
                    color: var(--text-secondary);
                    margin: 0;
                }

                /* Limit Bar */
                .clients-limit-bar {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 1rem 1.5rem;
                    margin-bottom: 1.5rem;
                }

                .clients-limit-counter {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.9375rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .clients-limit-counter svg {
                    stroke: var(--primary);
                }

                /* Toolbar */
                .clients-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    gap: 1rem;
                }

                .clients-search {
                    position: relative;
                    flex: 1;
                    max-width: 500px;
                }

                .clients-search svg {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 1.125rem;
                    height: 1.125rem;
                    stroke: var(--text-tertiary);
                    pointer-events: none;
                }

                .clients-search input {
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 3rem;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    font-size: 0.9375rem;
                    color: var(--text-primary);
                    outline: none;
                    transition: all 0.2s ease;
                }

                .clients-search input:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                /* Table */
                .clients-table-section {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .clients-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .clients-table thead {
                    background: var(--background);
                    border-bottom: 1px solid var(--border);
                }

                .clients-table th {
                    padding: 1rem 1.5rem;
                    text-align: left;
                    font-size: 0.8125rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-secondary);
                }

                .clients-sort-indicator {
                    display: inline-block;
                    margin-left: 0.5rem;
                    padding: 0.125rem 0.5rem;
                    background: rgba(102, 126, 234, 0.1);
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--primary);
                }

                .clients-table tbody tr {
                    border-bottom: 1px solid var(--border);
                    transition: background 0.15s ease;
                }

                .clients-table tbody tr:last-child {
                    border-bottom: none;
                }

                .clients-table tbody tr:hover {
                    background: var(--background);
                }

                .clients-table td {
                    padding: 1.25rem 1.5rem;
                    font-size: 0.9375rem;
                    color: var(--text-primary);
                }

                .clients-name-cell {
                    font-weight: 600;
                }

                .clients-name {
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .clients-company {
                    font-size: 0.8125rem;
                    font-weight: 400;
                    color: var(--text-secondary);
                }

                .clients-contact-cell {
                    color: var(--text-secondary);
                }

                .clients-count-cell {
                    text-align: center;
                    font-weight: 600;
                    color: var(--primary);
                }

                .clients-revenue-cell {
                    text-align: right;
                    font-weight: 700;
                    color: var(--success);
                    font-size: 1rem;
                }

                /* Empty State */
                .clients-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    text-align: center;
                }

                .clients-empty svg {
                    width: 4rem;
                    height: 4rem;
                    stroke: var(--text-tertiary);
                    margin-bottom: 1.5rem;
                }

                .clients-empty h3 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 0.5rem 0;
                }

                .clients-empty p {
                    font-size: 0.9375rem;
                    color: var(--text-secondary);
                    margin: 0;
                }
            </style>
        `;
    }
};
