/**
 * ESTIMATES MODULE
 * Quote management system - converts to jobs when accepted
 */

window.EstimatesModule = {
    // STATE
    state: {
        estimates: [],
        leads: [],
        filteredEstimates: [],
        container: 'estimates-content',

        // New UI state
        searchQuery: '',
        sortBy: 'date_new', // date_new, date_old, price_low, price_high
        batchMode: false,
        selectedEstimateIds: [],
        activeFilter: 'all', // all, accepted, pending (for clickable banners)

        // Modal state
        editingEstimateId: null,

        // Stats
        stats: {
            totalQuoted: 0,
            totalAccepted: 0,
            totalPending: 0,
            acceptanceRate: 0
        }
    },

    // Constants
    STATUSES: ['draft', 'sent', 'accepted', 'rejected', 'expired'],

    /**
     * Initialize the Estimates module
     */
    async init(targetContainer = 'estimates-content') {
        this.state.container = targetContainer;
        // No loading message - direct load like Goals

        try {
            // Load estimates and leads in parallel
            const [estimates, leadsData] = await Promise.all([
                API.getEstimates(),
                API.getLeads()
            ]);

            this.state.estimates = Array.isArray(estimates) ? estimates : [];
            this.state.leads = leadsData?.all || [];
            this.state.filteredEstimates = this.state.estimates;

            console.log(`[Estimates] Loaded ${this.state.estimates.length} estimates and ${this.state.leads.length} leads`);

            this.estimates_calculateStats();
            this.estimates_render();
        } catch (error) {
            console.error('Error initializing Estimates:', error);

            // Ensure state is valid even on error
            this.state.estimates = [];
            this.state.leads = [];
            this.state.filteredEstimates = [];

            this.estimates_showError('Failed to load estimates');
        }
    },

    /**
     * Main render function
     */
    estimates_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Apply filters
        this.estimates_applyFilters();

        container.innerHTML = `
            ${this.estimates_renderStyles()}
            <div class="estimates-container">
                ${this.estimates_renderHeader()}
                ${this.estimates_renderStats()}
                ${this.estimates_renderToolbar()}
                ${this.estimates_renderGrid()}
            </div>
        `;

        // Attach events after DOM is ready
        setTimeout(() => {
            this.estimates_attachEvents();
        }, 50);
    },

    /**
     * Update filtered content without flicker (for search/sort/filter changes)
     */
    estimates_updateFiltered() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Apply filters
        this.estimates_applyFilters();

        // Find the toolbar and grid containers
        const estimatesContainer = container.querySelector('.estimates-container');
        if (!estimatesContainer) return;

        // Update stats (for active filter highlighting)
        const statsContainer = estimatesContainer.querySelector('.estimates-stats');
        if (statsContainer) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.estimates_renderStats();
            statsContainer.innerHTML = tempDiv.firstElementChild.innerHTML;
        }

        // Update only the count in toolbar (don't touch search or sort inputs!)
        const countElement = estimatesContainer.querySelector('.estimates-count');
        if (countElement) {
            const count = this.state.filteredEstimates.length;
            countElement.textContent = `${count} estimate${count !== 1 ? 's' : ''}`;
        }

        // Update batch toggle button text ONLY if in batch mode (to show selection count)
        // Don't touch it otherwise - updating innerHTML destroys the event listener!
        if (this.state.batchMode) {
            const batchToggle = estimatesContainer.querySelector('.estimates-batch-toggle');
            if (batchToggle) {
                const selectedCount = this.state.selectedEstimateIds.length;
                batchToggle.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Cancel (${selectedCount} selected)
                `;
            }
        }

        // Update or add/remove batch actions toolbar
        const existingBatchActions = estimatesContainer.querySelector('.estimates-batch-actions');
        const toolbarContainer = estimatesContainer.querySelector('.estimates-toolbar');

        if (this.state.batchMode && this.state.selectedEstimateIds.length > 0) {
            // Need to show batch actions
            const batchActionsHTML = `
                <div class="estimates-batch-actions">
                    <div class="estimates-batch-actions-left">
                        <div class="estimates-batch-selected">${this.state.selectedEstimateIds.length} selected</div>
                    </div>
                    <div class="estimates-batch-actions-right">
                        <button class="estimates-batch-btn" data-action="batch-mark-sent">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>
                            </svg>
                            Mark Sent
                        </button>
                        <button class="estimates-batch-btn" data-action="batch-mark-accepted">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                            </svg>
                            Mark Accepted
                        </button>
                        <button class="estimates-batch-btn delete" data-action="batch-delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;

            if (existingBatchActions) {
                // Update the selected count
                const selectedText = existingBatchActions.querySelector('.estimates-batch-selected');
                if (selectedText) {
                    selectedText.textContent = `${this.state.selectedEstimateIds.length} selected`;
                }
            } else {
                // Add batch actions after toolbar
                toolbarContainer.insertAdjacentHTML('afterend', batchActionsHTML);
            }
        } else {
            // Remove batch actions if present
            if (existingBatchActions) {
                existingBatchActions.remove();
            }
        }

        // Update grid
        const gridContainer = estimatesContainer.querySelector('.estimates-grid') ||
                             estimatesContainer.querySelector('.estimates-empty');
        if (gridContainer) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.estimates_renderGrid();
            gridContainer.outerHTML = tempDiv.firstElementChild.outerHTML;
        }

        // Re-add checkboxes if in batch mode (since grid was re-rendered)
        if (this.state.batchMode) {
            const allCards = estimatesContainer.querySelectorAll('.estimate-card');
            const batchBtn = estimatesContainer.querySelector('[data-action="toggle-batch"]');

            allCards.forEach(card => {
                card.classList.add('batch-selectable');
                const estimateId = card.dataset.id;
                const isSelected = this.state.selectedEstimateIds.includes(estimateId);

                if (isSelected) {
                    card.classList.add('selected');
                }

                // Add checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'estimate-card-checkbox';
                checkbox.dataset.action = 'toggle-selection';
                checkbox.dataset.id = estimateId;
                checkbox.checked = isSelected;

                // Add event listener
                checkbox.addEventListener('change', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const isChecked = e.currentTarget.checked;

                    if (isChecked) {
                        if (!this.state.selectedEstimateIds.includes(id)) {
                            this.state.selectedEstimateIds.push(id);
                        }
                        card.classList.add('selected');
                    } else {
                        this.state.selectedEstimateIds = this.state.selectedEstimateIds.filter(eid => eid !== id);
                        card.classList.remove('selected');
                    }

                    // Update button text
                    if (batchBtn) {
                        batchBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Cancel (${this.state.selectedEstimateIds.length} selected)
                        `;
                    }

                    // Update batch actions toolbar
                    this.estimates_updateBatchActionsToolbar();
                });

                card.insertBefore(checkbox, card.firstChild);
            });
        }

        // Reattach only the necessary events (no fade animation)
        this.estimates_attachEvents();
    },

    /**
     * Render inline styles
     */
    estimates_renderStyles() {
        return `
            <style>
                /* ESTIMATES MODULE - Clean Ticket Design */

                .estimates-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    animation: fadeInUp 0.5s ease;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* HEADER - Big & Bold */
                .estimates-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2.5rem;
                    gap: 2rem;
                }

                .estimates-header-content h1 {
                    font-size: 2.75rem;
                    font-weight: 900;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin: 0 0 0.5rem 0;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .estimates-title-icon {
                    width: 2.5rem;
                    height: 2.5rem;
                }

                .estimates-subtitle {
                    color: var(--text-secondary);
                    font-size: 1.125rem;
                    margin: 0;
                    font-weight: 500;
                }

                .estimates-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: var(--radius-lg);
                    font-size: 0.95rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.625rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
                }

                .estimates-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
                }

                .estimates-btn-primary svg {
                    width: 1.25rem;
                    height: 1.25rem;
                    stroke-width: 2.5;
                }

                /* STATS - Revenue at a Glance */
                .estimates-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2.5rem;
                }

                .estimates-stat-card {
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }

                .estimates-stat-card:hover {
                    border-color: #667eea;
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
                }

                .estimates-stat-icon {
                    width: 4rem;
                    height: 4rem;
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .estimates-stat-icon.quoted {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(139, 92, 246, 0.15));
                }

                .estimates-stat-icon.accepted {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15));
                }

                .estimates-stat-icon.pending {
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15));
                }

                .estimates-stat-icon svg {
                    width: 2rem;
                    height: 2rem;
                    stroke-width: 2;
                }

                .estimates-stat-icon.quoted svg { stroke: #667eea; }
                .estimates-stat-icon.accepted svg { stroke: #10b981; }
                .estimates-stat-icon.pending svg { stroke: #fbbf24; }

                .estimates-stat-content { flex: 1; }

                .estimates-stat-value {
                    font-size: 2.5rem;
                    font-weight: 900;
                    color: var(--text-primary);
                    line-height: 1;
                    margin-bottom: 0.5rem;
                }

                .estimates-stat-label {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                /* Make stat cards clickable */
                .estimates-stat-card {
                    cursor: pointer;
                }

                .estimates-stat-card.active {
                    border-color: #667eea;
                    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
                }

                /* TOOLBAR - Search, Sort, Batch Mode */
                .estimates-toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    padding: 1.25rem 1.5rem;
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    flex-wrap: wrap;
                }

                .estimates-toolbar-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex: 1;
                }

                .estimates-count {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    white-space: nowrap;
                }

                .estimates-search {
                    position: relative;
                    flex: 1;
                    max-width: 600px;
                }

                .estimates-search input {
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 2.75rem;
                    border: 2px solid var(--border);
                    border-radius: 999px;
                    background: var(--bg);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }

                .estimates-search input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .estimates-search svg {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 1.125rem;
                    height: 1.125rem;
                    color: var(--text-tertiary);
                    pointer-events: none;
                }

                .estimates-toolbar-right {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .estimates-sort {
                    position: relative;
                }

                .estimates-sort select {
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

                .estimates-sort select:hover {
                    border-color: #667eea;
                }

                .estimates-sort select:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .estimates-sort svg {
                    position: absolute;
                    right: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 1rem;
                    height: 1rem;
                    color: var(--text-tertiary);
                    pointer-events: none;
                }

                .estimates-batch-toggle {
                    padding: 0.75rem 1.25rem;
                    border: 2px solid var(--border);
                    border-radius: 999px;
                    background: var(--bg);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                }

                .estimates-batch-toggle:hover {
                    border-color: #667eea;
                    background: rgba(102, 126, 234, 0.05);
                }

                .estimates-batch-toggle.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-color: #667eea;
                    color: white;
                }

                .estimates-batch-toggle svg {
                    width: 1rem;
                    height: 1rem;
                }

                /* Batch Mode Actions Toolbar */
                .estimates-batch-actions {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    padding: 1rem 1.5rem;
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(139, 92, 246, 0.1));
                    border: 2px solid #667eea;
                    border-radius: var(--radius-lg);
                    margin-bottom: 1.5rem;
                }

                .estimates-batch-actions-left {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .estimates-batch-selected {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #667eea;
                }

                .estimates-batch-actions-right {
                    display: flex;
                    gap: 0.5rem;
                }

                .estimates-batch-btn {
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

                .estimates-batch-btn:hover {
                    background: rgba(102, 126, 234, 0.1);
                    border-color: #667eea;
                }

                .estimates-batch-btn svg {
                    width: 1rem;
                    height: 1rem;
                }

                .estimates-batch-btn.delete {
                    color: #ef4444;
                    border-color: rgba(239, 68, 68, 0.3);
                }

                .estimates-batch-btn.delete:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: #ef4444;
                }

                /* GRID - Masonry Style */
                .estimates-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                    gap: 1.5rem;
                }

                /* CARD - Ticket Design with Left Border Accent */
                .estimate-card {
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-left: 5px solid;
                    border-radius: var(--radius-lg);
                    padding: 1.75rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    position: relative;
                }

                .estimate-card.draft { border-left-color: #9ca3af; }
                .estimate-card.sent { border-left-color: #667eea; }
                .estimate-card.accepted { border-left-color: #10b981; }
                .estimate-card.rejected { border-left-color: #ef4444; }
                .estimate-card.expired { border-left-color: #d1d5db; }

                .estimate-card:hover {
                    transform: translateY(-6px) scale(1.02);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
                    border-color: #667eea;
                }

                /* Batch selection mode */
                .estimate-card.batch-selectable {
                    padding-left: 3.5rem;
                }

                .estimate-card-checkbox {
                    position: absolute;
                    left: 1.25rem;
                    top: 1.75rem;
                    width: 1.25rem;
                    height: 1.25rem;
                    cursor: pointer;
                    accent-color: #667eea;
                }

                .estimate-card.selected {
                    border-color: #667eea;
                    background: rgba(102, 126, 234, 0.05);
                }

                .estimate-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }

                .estimate-number {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    opacity: 0.7;
                }

                .estimate-title {
                    font-size: 1.375rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0.75rem 0;
                    line-height: 1.3;
                }

                .estimate-lead {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    font-weight: 500;
                    margin-bottom: 1rem;
                }

                .estimate-lead svg {
                    width: 1rem;
                    height: 1rem;
                    opacity: 0.6;
                }

                .estimate-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 999px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .estimate-status.draft {
                    background: rgba(156, 163, 175, 0.15);
                    color: #6b7280;
                }

                .estimate-status.sent {
                    background: rgba(102, 126, 234, 0.15);
                    color: #667eea;
                }

                .estimate-status.accepted {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                }

                .estimate-status.rejected {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                }

                .estimate-status.expired {
                    background: rgba(209, 213, 219, 0.15);
                    color: #9ca3af;
                }

                .estimate-status svg {
                    width: 0.875rem;
                    height: 0.875rem;
                }

                .estimate-photos {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    font-weight: 500;
                    margin-top: 1rem;
                    padding: 0.5rem 0.75rem;
                    background: rgba(102, 126, 234, 0.05);
                    border-radius: 0.5rem;
                }

                .estimate-photos svg {
                    width: 1rem;
                    height: 1rem;
                }

                .estimate-total {
                    font-size: 2.25rem;
                    font-weight: 900;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin: 1.5rem 0 0.75rem 0;
                    line-height: 1;
                }

                .estimate-expiry {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                }

                .estimate-expiry.warning {
                    color: #f59e0b;
                    font-weight: 600;
                }

                .estimate-card-actions {
                    display: flex;
                    gap: 0.625rem;
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 2px solid var(--border);
                    opacity: 0;
                    transform: translateY(-10px);
                    transition: all 0.3s ease;
                }

                .estimate-card:hover .estimate-card-actions {
                    opacity: 1;
                    transform: translateY(0);
                }

                .estimate-btn {
                    flex: 1;
                    padding: 0.75rem 1rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    background: transparent;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .estimate-btn:hover {
                    background: rgba(102, 126, 234, 0.1);
                    border-color: #667eea;
                    color: #667eea;
                    transform: translateY(-2px);
                }

                .estimate-btn svg {
                    width: 1rem;
                    height: 1rem;
                }

                .estimate-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                }

                .estimate-btn-primary:hover {
                    background: linear-gradient(135deg, #5568d3 0%, #653a8e 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .estimate-btn-danger {
                    color: #ef4444;
                    border-color: rgba(239, 68, 68, 0.3);
                }

                .estimate-btn-danger:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: #ef4444;
                }

                /* EMPTY STATE */
                .estimates-empty {
                    text-align: center;
                    padding: 6rem 2rem;
                    background: var(--surface);
                    border: 2px dashed var(--border);
                    border-radius: var(--radius-lg);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                }

                .estimates-empty svg {
                    width: 5rem;
                    height: 5rem;
                    color: var(--text-tertiary);
                    margin-bottom: 1.5rem;
                    opacity: 0.5;
                }

                .estimates-empty h3 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 0.75rem 0;
                }

                .estimates-empty p {
                    color: var(--text-secondary);
                    font-size: 1rem;
                    margin: 0;
                }
            </style>
        `;
    },

    /**
     * Render header
     */
    estimates_renderHeader() {
        return `
            <div class="estimates-header">
                <div class="estimates-header-content">
                    <h1>
                        <svg class="estimates-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Estimates
                    </h1>
                    <p class="estimates-subtitle">Create quotes and convert accepted estimates to jobs</p>
                </div>
                <button class="estimates-btn-primary" data-action="new-estimate">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    New Estimate
                </button>
            </div>
        `;
    },

    /**
     * Render stats cards - now clickable for filtering
     */
    estimates_renderStats() {
        const { totalQuoted, totalAccepted, totalPending, acceptanceRate } = this.state.stats;

        return `
            <div class="estimates-stats">
                <div class="estimates-stat-card ${this.state.activeFilter === 'all' ? 'active' : ''}" data-filter="all">
                    <div class="estimates-stat-icon quoted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="estimates-stat-content">
                        <div class="estimates-stat-value">${formatCurrency(totalQuoted)}</div>
                        <div class="estimates-stat-label">Total Quoted</div>
                    </div>
                </div>

                <div class="estimates-stat-card ${this.state.activeFilter === 'accepted' ? 'active' : ''}" data-filter="accepted">
                    <div class="estimates-stat-icon accepted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="estimates-stat-content">
                        <div class="estimates-stat-value">${formatCurrency(totalAccepted)}</div>
                        <div class="estimates-stat-label">Accepted (${acceptanceRate}%)</div>
                    </div>
                </div>

                <div class="estimates-stat-card ${this.state.activeFilter === 'pending' ? 'active' : ''}" data-filter="pending">
                    <div class="estimates-stat-icon pending">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                            <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="estimates-stat-content">
                        <div class="estimates-stat-value">${formatCurrency(totalPending)}</div>
                        <div class="estimates-stat-label">Pending</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render toolbar with search, sort, and batch mode
     */
    estimates_renderToolbar() {
        const count = this.state.filteredEstimates.length;

        return `
            <div class="estimates-toolbar">
                <div class="estimates-toolbar-left">
                    <div class="estimates-count">${count} estimate${count !== 1 ? 's' : ''}</div>
                    <div class="estimates-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="8" stroke-width="2"/>
                            <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <input type="text"
                               placeholder="Search estimates..."
                               value="${this.state.searchQuery}"
                               data-action="search">
                    </div>
                </div>
                <div class="estimates-toolbar-right">
                    <div class="estimates-sort">
                        <select data-action="sort">
                            <option value="date_new" ${this.state.sortBy === 'date_new' ? 'selected' : ''}>Date: Newest First</option>
                            <option value="date_old" ${this.state.sortBy === 'date_old' ? 'selected' : ''}>Date: Oldest First</option>
                            <option value="price_high" ${this.state.sortBy === 'price_high' ? 'selected' : ''}>Price: High → Low</option>
                            <option value="price_low" ${this.state.sortBy === 'price_low' ? 'selected' : ''}>Price: Low → High</option>
                        </select>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <button class="estimates-batch-toggle ${this.state.batchMode ? 'active' : ''}" data-action="toggle-batch">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            ${this.state.batchMode ? `
                                <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            ` : `
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            `}
                        </svg>
                        ${this.state.batchMode ? `Cancel (${this.state.selectedEstimateIds.length} selected)` : 'Select Multiple'}
                    </button>
                </div>
            </div>

            ${this.state.batchMode && this.state.selectedEstimateIds.length > 0 ? `
                <div class="estimates-batch-actions">
                    <div class="estimates-batch-actions-left">
                        <div class="estimates-batch-selected">${this.state.selectedEstimateIds.length} selected</div>
                    </div>
                    <div class="estimates-batch-actions-right">
                        <button class="estimates-batch-btn" data-action="batch-mark-sent">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>
                            </svg>
                            Mark Sent
                        </button>
                        <button class="estimates-batch-btn" data-action="batch-mark-accepted">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                            </svg>
                            Mark Accepted
                        </button>
                        <button class="estimates-batch-btn delete" data-action="batch-delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            ` : ''}
        `;
    },

    /**
     * Render estimates grid
     */
    estimates_renderGrid() {
        if (this.state.filteredEstimates.length === 0) {
            return `
                <div class="estimates-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <h3>No estimates found</h3>
                    <p>Create your first estimate to start quoting clients</p>
                </div>
            `;
        }

        return `
            <div class="estimates-grid">
                ${this.state.filteredEstimates.map(est => this.estimates_renderCard(est)).join('')}
            </div>
        `;
    },

    /**
     * Render estimate card
     */
    estimates_renderCard(estimate) {
        const lead = (Array.isArray(this.state.leads) ? this.state.leads : []).find(l => l.id === estimate.lead_id);
        const photoCount = (estimate.photos || []).length;
        const expiryInfo = this.estimates_getExpiryInfo(estimate);
        const isSelected = this.state.selectedEstimateIds.includes(estimate.id);

        // Show "Convert to Job" if accepted, otherwise "View" and "Edit"
        const actions = estimate.status === 'accepted' ? `
            <button class="estimate-btn estimate-btn-primary" data-action="convert-to-job" data-id="${estimate.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Convert to Job
            </button>
        ` : `
            <button class="estimate-btn" data-action="view-estimate" data-id="${estimate.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/>
                </svg>
                View
            </button>
            <button class="estimate-btn" data-action="edit-estimate" data-id="${estimate.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Edit
            </button>
        `;

        return `
            <div class="estimate-card ${estimate.status}" data-id="${estimate.id}">
                <div class="estimate-card-header">
                    <div>
                        <div class="estimate-number">${estimate.estimate_number || 'EST-???'}</div>
                        <h3 class="estimate-title">${this.estimates_truncateText(estimate.title || 'Untitled', 60)}</h3>
                    </div>
                    ${this.estimates_renderStatusBadge(estimate.status)}
                </div>

                ${lead ? `
                    <div class="estimate-lead">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${this.estimates_truncateText(lead.name, 50)}
                    </div>
                ` : ''}

                ${photoCount > 0 ? `
                    <div class="estimate-photos">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${photoCount} photo${photoCount > 1 ? 's' : ''}
                    </div>
                ` : ''}

                <div class="estimate-total">${formatCurrency(estimate.total_price || 0)}</div>

                ${expiryInfo ? `
                    <div class="estimate-expiry ${expiryInfo.warning ? 'warning' : ''}">
                        ${expiryInfo.text}
                    </div>
                ` : ''}

                <div class="estimate-card-actions">
                    ${actions}
                    <button class="estimate-btn estimate-btn-danger" data-action="delete-estimate" data-id="${estimate.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Render status badge
     */
    estimates_renderStatusBadge(status) {
        const icons = {
            draft: '<path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" stroke-width="2"/><path d="M18 2l-8 8v4h4l8-8-4-4z" stroke-width="2"/>',
            sent: '<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>',
            accepted: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>',
            rejected: '<path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>',
            expired: '<circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M12 6v6l4 2" stroke-width="2"/>'
        };

        return `
            <div class="estimate-status ${status}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    ${icons[status] || icons.draft}
                </svg>
                ${this.estimates_formatStatus(status)}
            </div>
        `;
    },

    /**
     * Get expiry info
     */
    estimates_getExpiryInfo(estimate) {
        if (!estimate.expires_at) return null;

        const now = new Date();
        const expiresAt = new Date(estimate.expires_at);
        const daysUntil = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) {
            return { text: 'Expired', warning: true };
        } else if (daysUntil === 0) {
            return { text: 'Expires today', warning: true };
        } else if (daysUntil <= 7) {
            return { text: `Expires in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`, warning: true };
        } else {
            return { text: `Expires in ${daysUntil} days`, warning: false };
        }
    },

    /**
     * Apply filters with search, sort, and active filter
     */
    estimates_applyFilters() {
        let filtered = [...this.state.estimates];

        // Filter by active filter (from clickable banners)
        if (this.state.activeFilter === 'accepted') {
            filtered = filtered.filter(e => e.status === 'accepted');
        } else if (this.state.activeFilter === 'pending') {
            filtered = filtered.filter(e => e.status === 'sent' || e.status === 'draft');
        }
        // 'all' shows everything

        // Search filter
        if (this.state.searchQuery.trim()) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(e => {
                const title = (e.title || '').toLowerCase();
                const estimateNumber = (e.estimate_number || '').toLowerCase();
                const lead = (Array.isArray(this.state.leads) ? this.state.leads : []).find(l => l.id === e.lead_id);
                const leadName = lead ? (lead.name || '').toLowerCase() : '';

                return title.includes(query) ||
                       estimateNumber.includes(query) ||
                       leadName.includes(query);
            });
        }

        // Sort
        filtered.sort((a, b) => {
            switch (this.state.sortBy) {
                case 'date_new':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'date_old':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'price_high':
                    return (b.total_price || 0) - (a.total_price || 0);
                case 'price_low':
                    return (a.total_price || 0) - (b.total_price || 0);
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        this.state.filteredEstimates = filtered;
    },

    /**
     * Calculate stats
     */
    estimates_calculateStats() {
        const allEstimates = this.state.estimates;

        const totalQuoted = allEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
        const accepted = allEstimates.filter(e => e.status === 'accepted');
        const totalAccepted = accepted.reduce((sum, e) => sum + (e.total_price || 0), 0);
        const pending = allEstimates.filter(e => e.status === 'sent' || e.status === 'draft');
        const totalPending = pending.reduce((sum, e) => sum + (e.total_price || 0), 0);

        const acceptanceRate = allEstimates.length > 0
            ? Math.round((accepted.length / allEstimates.length) * 100)
            : 0;

        this.state.stats = { totalQuoted, totalAccepted, totalPending, acceptanceRate };
    },

    /**
     * Format status
     */
    estimates_formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    },

    /**
     * Truncate text with ellipsis
     */
    estimates_truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * Attach event listeners - using event delegation to avoid losing listeners
     */
    estimates_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Remove any existing delegated listener to avoid duplicates
        if (this._eventDelegationHandler) {
            container.removeEventListener('click', this._eventDelegationHandler);
            container.removeEventListener('change', this._changeHandler);
            container.removeEventListener('input', this._inputHandler);
        }

        // EVENT DELEGATION - Single click handler for all buttons
        this._eventDelegationHandler = (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            switch (action) {
                case 'toggle-batch':
                    e.preventDefault();
                    this.estimates_toggleBatchMode();
                    break;
                case 'new-estimate':
                    this.estimates_openModal();
                    break;
                case 'view-estimate':
                    e.stopPropagation();
                    this.estimates_openDetailView(id);
                    break;
                case 'edit-estimate':
                    e.stopPropagation();
                    this.estimates_openModal(id);
                    break;
                case 'convert-to-job':
                    e.stopPropagation();
                    this.estimates_convertToJob(id);
                    break;
                case 'delete-estimate':
                    e.stopPropagation();
                    this.estimates_deleteEstimate(id);
                    break;
            }
        };

        // Attach click event delegation
        container.addEventListener('click', this._eventDelegationHandler);

        // Stat card filtering (also using delegation)
        const statsCards = container.querySelectorAll('.estimates-stat-card[data-filter]');
        statsCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.state.activeFilter = filter;
                this.estimates_updateFiltered();
            });
        });

        // Change event delegation for select/sort
        this._changeHandler = (e) => {
            const target = e.target;
            if (target.dataset.action === 'sort') {
                this.state.sortBy = target.value;
                this.estimates_updateFiltered();
            }
        };
        container.addEventListener('change', this._changeHandler);

        // Input event delegation for search
        this._inputHandler = (e) => {
            const target = e.target;
            if (target.dataset.action === 'search') {
                this.state.searchQuery = target.value;
                this.estimates_updateFiltered();
            }
        };
        container.addEventListener('input', this._inputHandler);

        // Note: Checkbox and batch action events are handled dynamically in estimates_toggleBatchMode()
    },

    /**
     * Open add/edit modal
     */
    estimates_openModal(estimateId = null) {
        this.state.editingEstimateId = estimateId;

        // Get estimate data if editing
        let estimate = null;
        if (estimateId) {
            estimate = this.state.estimates.find(e => e.id === estimateId);
            if (!estimate) {
                window.SteadyUtils.showToast('Estimate not found', 'error');
                return;
            }
        }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'estimate-modal-overlay';
        overlay.innerHTML = this.estimates_renderModal(estimate);
        document.body.appendChild(overlay);

        // Initialize modal events after render
        setTimeout(() => {
            this.estimates_initModalEvents(overlay);
            this.estimates_updateLineItemsTotal();
        }, 0);
    },

    /**
     * Render modal HTML
     */
    estimates_renderModal(estimate) {
        const isEdit = !!estimate;
        const lineItems = estimate?.line_items || [{ description: '', quantity: 1, rate: 0 }];
        const photos = estimate?.photos || [];

        // Default expiry: 30 days from now
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 30);
        const expiryDate = estimate?.expires_at || defaultExpiry.toISOString().split('T')[0];

        return `
            <style>
                .estimate-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .estimate-modal {
                    background: var(--surface);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideUp 0.3s ease;
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .estimate-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 24px;
                    border-bottom: 1px solid var(--border);
                }

                .estimate-modal-header h2 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .estimate-modal-close {
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

                .estimate-modal-close:hover {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                }

                .estimate-modal-body {
                    padding: 24px;
                }

                .estimate-form-section {
                    margin-bottom: 32px;
                }

                .estimate-form-section-title {
                    font-size: 14px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-secondary);
                    margin-bottom: 16px;
                }

                .estimate-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .estimate-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .estimate-form-group label {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .estimate-form-group input,
                .estimate-form-group select,
                .estimate-form-group textarea {
                    padding: 10px 12px;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    background: var(--background);
                    color: var(--text-primary);
                    font-size: 14px;
                    transition: all 0.2s;
                }

                .estimate-form-group input:focus,
                .estimate-form-group select:focus,
                .estimate-form-group textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .estimate-form-group textarea {
                    resize: vertical;
                    min-height: 80px;
                }

                /* Character Counter */
                .estimate-input-hint {
                    font-size: 12px;
                    color: var(--text-tertiary);
                    font-weight: 500;
                }

                /* Custom Select Styling */
                .estimate-select-custom {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    background-size: 16px;
                    padding-right: 40px !important;
                }

                /* Lead Dropdown with Search */
                .estimate-lead-dropdown-wrapper {
                    display: flex;
                    gap: 8px;
                    align-items: stretch;
                }

                .estimate-lead-dropdown-wrapper select {
                    flex: 1;
                }

                .estimate-lead-search-btn {
                    padding: 8px 16px;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    background: var(--background);
                    color: var(--text-primary);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    white-space: nowrap;
                }

                .estimate-lead-search-btn:hover {
                    border-color: var(--primary);
                    background: rgba(102, 126, 234, 0.05);
                    color: var(--primary);
                }

                /* Line Items Table */
                .estimate-line-items {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 16px;
                }

                .estimate-line-item-header {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 40px;
                    gap: 12px;
                    margin-bottom: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-secondary);
                }

                .estimate-line-item {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 40px;
                    gap: 12px;
                    margin-bottom: 12px;
                    align-items: center;
                }

                .estimate-line-item input {
                    padding: 8px 10px;
                    border: 1px solid var(--border);
                    border-radius: 4px;
                    background: var(--surface);
                    color: var(--text-primary);
                    font-size: 14px;
                }

                .estimate-line-item-total {
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .estimate-line-item-remove {
                    background: transparent;
                    border: 1px solid var(--border);
                    border-radius: 4px;
                    color: #ef4444;
                    cursor: pointer;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .estimate-line-item-remove:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: #ef4444;
                }

                .estimate-add-line-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px;
                    background: transparent;
                    border: 1px dashed var(--border);
                    border-radius: 6px;
                    color: var(--primary);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-top: 12px;
                }

                .estimate-add-line-item:hover {
                    background: rgba(59, 130, 246, 0.05);
                    border-color: var(--primary);
                }

                .estimate-total-box {
                    margin-top: 16px;
                    padding: 16px;
                    background: rgba(59, 130, 246, 0.05);
                    border: 1px solid var(--primary);
                    border-radius: 6px;
                    text-align: right;
                }

                .estimate-total-label {
                    font-size: 14px;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                }

                .estimate-total-value {
                    font-size: 28px;
                    font-weight: 600;
                    color: var(--primary);
                }

                /* Photo Upload */
                .estimate-photo-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 12px;
                }

                .estimate-photo-item {
                    position: relative;
                    aspect-ratio: 1;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .estimate-photo-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .estimate-photo-remove {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    background: rgba(0, 0, 0, 0.7);
                    border: none;
                    color: white;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .estimate-photo-remove:hover {
                    background: #ef4444;
                }

                .estimate-photo-upload {
                    aspect-ratio: 1;
                    border: 2px dashed var(--border);
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--bg);
                }

                .estimate-photo-upload:hover {
                    border-color: var(--primary);
                    background: rgba(59, 130, 246, 0.05);
                }

                .estimate-photo-upload svg {
                    width: 32px;
                    height: 32px;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }

                .estimate-photo-upload span {
                    font-size: 13px;
                    color: var(--text-secondary);
                }

                .estimate-photo-counter {
                    font-size: 13px;
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                }

                /* Modal Footer */
                .estimate-modal-footer {
                    padding: 20px 24px;
                    border-top: 1px solid var(--border);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .estimate-modal-btn {
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .estimate-modal-btn-cancel {
                    background: transparent;
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                }

                .estimate-modal-btn-cancel:hover {
                    background: var(--surface-hover);
                }

                .estimate-modal-btn-save {
                    background: var(--primary);
                    border: none;
                    color: white;
                }

                .estimate-modal-btn-save:hover {
                    background: var(--primary-dark);
                }
            </style>

            <div class="estimate-modal">
                <div class="estimate-modal-header">
                    <h2>${isEdit ? 'Edit Estimate' : 'New Estimate'}</h2>
                    <button class="estimate-modal-close" data-action="close-modal">×</button>
                </div>

                <div class="estimate-modal-body">
                    <!-- Basic Info -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Basic Information</div>

                        <div class="estimate-form-group">
                            <label>Title *</label>
                            <input type="text" id="estimateTitle" placeholder="e.g., Kitchen Remodel" value="${estimate?.title || ''}" maxlength="100" required>
                            <span class="estimate-input-hint" id="titleCounter">100 characters remaining</span>
                        </div>

                        <div class="estimate-form-row">
                            <div class="estimate-form-group">
                                <label>Lead</label>
                                ${this.estimates_renderLeadDropdown(estimate?.lead_id)}
                            </div>

                            <div class="estimate-form-group">
                                <label>Status</label>
                                <select id="estimateStatus" class="estimate-select-custom">
                                    ${this.STATUSES.map(status => `
                                        <option value="${status}" ${estimate?.status === status ? 'selected' : ''}>
                                            ${this.estimates_formatStatus(status)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="estimate-form-row">
                            <div class="estimate-form-group">
                                <label>Expires On</label>
                                <input type="date" id="estimateExpiry" value="${expiryDate}">
                            </div>
                        </div>

                        <div class="estimate-form-group">
                            <label>Description</label>
                            <textarea id="estimateDescription" placeholder="Brief description of the work..." maxlength="500">${estimate?.description || ''}</textarea>
                            <span class="estimate-input-hint" id="descriptionCounter">500 characters remaining</span>
                        </div>
                    </div>

                    <!-- Line Items -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Line Items</div>
                        <div class="estimate-line-items">
                            <div class="estimate-line-item-header">
                                <div>Description</div>
                                <div>Quantity</div>
                                <div>Rate</div>
                                <div></div>
                            </div>
                            <div id="lineItemsContainer">
                                ${lineItems.map((item, i) => this.estimates_renderLineItemRow(item, i)).join('')}
                            </div>
                            <button class="estimate-add-line-item" data-action="add-line-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 16px; height: 16px;">
                                    <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                Add Line Item
                            </button>

                            <div class="estimate-total-box">
                                <div class="estimate-total-label">Total Estimate</div>
                                <div class="estimate-total-value" id="estimateTotalDisplay">$0.00</div>
                            </div>
                        </div>
                    </div>

                    <!-- Photos -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Photos</div>
                        <div class="estimate-photo-counter" id="photoCounter">${photos.length}/3 photos</div>
                        <div class="estimate-photo-grid" id="photoGrid">
                            ${photos.map((photo, i) => this.estimates_renderPhotoItem(photo, i)).join('')}
                            ${photos.length < 3 ? this.estimates_renderPhotoUploadButton() : ''}
                        </div>
                    </div>

                    <!-- Terms -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Terms & Conditions</div>
                        <div class="estimate-form-group">
                            <textarea id="estimateTerms" placeholder="Payment terms, warranty, etc..." maxlength="1000">${estimate?.terms || 'Payment due within 30 days of acceptance.\nEstimate valid for 30 days.'}</textarea>
                            <span class="estimate-input-hint" id="termsCounter">1000 characters remaining</span>
                        </div>
                    </div>

                    <!-- Notes -->
                    <div class="estimate-form-section">
                        <div class="estimate-form-section-title">Internal Notes</div>
                        <div class="estimate-form-group">
                            <textarea id="estimateNotes" placeholder="Internal notes (not visible to client)..." maxlength="500">${estimate?.notes || ''}</textarea>
                            <span class="estimate-input-hint" id="notesCounter">500 characters remaining</span>
                        </div>
                    </div>
                </div>

                <div class="estimate-modal-footer">
                    <button class="estimate-modal-btn estimate-modal-btn-cancel" data-action="close-modal">Cancel</button>
                    <button class="estimate-modal-btn estimate-modal-btn-save" data-action="save-estimate">Save Estimate</button>
                </div>
            </div>
        `;
    },

    /**
     * Render lead dropdown with quick-create
     */
    estimates_renderLeadDropdown(selectedLeadId = null) {
        return `
            <div class="estimate-lead-dropdown-wrapper">
                <select id="estimateLead" class="estimate-select-custom">
                    <option value="">Select lead (optional)</option>
                    ${(Array.isArray(this.state.leads) ? this.state.leads : []).map(lead => `
                        <option value="${lead.id}" ${selectedLeadId === lead.id ? 'selected' : ''}>
                            ${this.estimates_truncateText(lead.name, 50)}${lead.company ? ` (${this.estimates_truncateText(lead.company, 30)})` : ''}
                        </option>
                    `).join('')}
                </select>
                <button type="button" class="estimate-lead-search-btn" data-action="search-lead">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    Search
                </button>
            </div>
        `;
    },

    /**
     * Render line item row
     */
    estimates_renderLineItemRow(item, index) {
        return `
            <div class="estimate-line-item" data-index="${index}">
                <input type="text" class="line-item-description" placeholder="Description" value="${item.description || ''}" data-field="description" maxlength="35">
                <input type="number" class="line-item-quantity" placeholder="1" value="${item.quantity || 1}" min="0" max="99999999.99" step="0.01" data-field="quantity">
                <input type="number" class="line-item-rate" placeholder="0.00" value="${item.rate || 0}" min="0" max="99999999.99" step="0.01" data-field="rate">
                <button class="estimate-line-item-remove" data-action="remove-line-item" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 16px; height: 16px;">
                        <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;
    },

    /**
     * Render photo item
     */
    estimates_renderPhotoItem(photo, index) {
        return `
            <div class="estimate-photo-item" data-index="${index}">
                <img src="${photo.url}" alt="Estimate photo ${index + 1}">
                <button class="estimate-photo-remove" data-action="remove-photo" data-index="${index}">×</button>
            </div>
        `;
    },

    /**
     * Render photo upload button
     */
    estimates_renderPhotoUploadButton() {
        return `
            <div class="estimate-photo-upload" data-action="upload-photo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Upload</span>
                <input type="file" accept="image/*" style="display: none;" id="photoUploadInput">
            </div>
        `;
    },

    /**
     * Initialize modal events
     */
    estimates_initModalEvents(overlay) {
        // Close modal
        overlay.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.estimates_closeModal());
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.estimates_closeModal();
            }
        });

        // Lead dropdown quick-create
        const leadSelect = overlay.querySelector('#estimateLead');
        if (leadSelect) {
            leadSelect.addEventListener('change', async (e) => {
                if (e.target.value === '__create__') {
                    const name = prompt('Lead Name:');
                    if (!name) {
                        e.target.value = '';
                        return;
                    }

                    const phone = prompt('Phone (optional):');
                    const email = prompt('Email (optional):');

                    try {
                        const lead = await API.createLead({ name, phone, email, source: 'manual' });
                        if (!Array.isArray(this.state.leads)) this.state.leads = [];
                        this.state.leads.unshift(lead);

                        // Add new option
                        const option = document.createElement('option');
                        option.value = lead.id;
                        option.textContent = lead.name;
                        option.selected = true;

                        // Insert after the "Create New Lead" option
                        leadSelect.insertBefore(option, leadSelect.children[2]);

                        window.SteadyUtils.showToast(`Lead "${lead.name}" created!`, 'success');
                    } catch (err) {
                        console.error('Failed to create lead:', err);
                        window.SteadyUtils.showToast('Failed to create lead', 'error');
                        e.target.value = '';
                    }
                }
            });
        }

        // Line item changes
        overlay.addEventListener('input', (e) => {
            if (e.target.classList.contains('line-item-quantity') ||
                e.target.classList.contains('line-item-rate')) {
                this.estimates_updateLineItemsTotal();
            }
        });

        // Line item decimal validation on blur
        overlay.addEventListener('blur', (e) => {
            if (e.target.classList.contains('line-item-quantity') ||
                e.target.classList.contains('line-item-rate')) {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    // Format to 2 decimal places
                    e.target.value = value.toFixed(2);
                    // Enforce max value
                    if (value > 99999999.99) {
                        e.target.value = '99999999.99';
                    }
                    this.estimates_updateLineItemsTotal();
                }
            }
        }, true);

        // Character counters
        const titleInput = overlay.querySelector('#estimateTitle');
        const descInput = overlay.querySelector('#estimateDescription');
        const termsInput = overlay.querySelector('#estimateTerms');
        const notesInput = overlay.querySelector('#estimateNotes');

        const updateCounter = (input, counterId, maxLength) => {
            const counter = overlay.querySelector(`#${counterId}`);
            if (!counter || !input) return;
            const remaining = maxLength - input.value.length;
            counter.textContent = `${remaining} character${remaining === 1 ? '' : 's'} remaining`;
            counter.style.color = remaining < 20 ? 'var(--danger)' : 'var(--text-tertiary)';
        };

        if (titleInput) {
            updateCounter(titleInput, 'titleCounter', 100);
            titleInput.addEventListener('input', () => updateCounter(titleInput, 'titleCounter', 100));
        }
        if (descInput) {
            updateCounter(descInput, 'descriptionCounter', 500);
            descInput.addEventListener('input', () => updateCounter(descInput, 'descriptionCounter', 500));
        }
        if (termsInput) {
            updateCounter(termsInput, 'termsCounter', 1000);
            termsInput.addEventListener('input', () => updateCounter(termsInput, 'termsCounter', 1000));
        }
        if (notesInput) {
            updateCounter(notesInput, 'notesCounter', 500);
            notesInput.addEventListener('input', () => updateCounter(notesInput, 'notesCounter', 500));
        }

        // Add line item
        overlay.querySelectorAll('[data-action="add-line-item"]').forEach(btn => {
            btn.addEventListener('click', () => this.estimates_addLineItem(overlay));
        });

        // Remove line item (delegated)
        overlay.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-action="remove-line-item"]');
            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index);
                this.estimates_removeLineItem(overlay, index);
            }
        });

        // Photo upload
        const uploadBtn = overlay.querySelector('[data-action="upload-photo"]');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                overlay.querySelector('#photoUploadInput').click();
            });

            overlay.querySelector('#photoUploadInput').addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.estimates_handlePhotoUpload(overlay, e.target.files[0]);
                }
            });
        }

        // Remove photo (delegated)
        overlay.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-action="remove-photo"]');
            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index);
                this.estimates_removePhoto(overlay, index);
            }
        });

        // Save estimate
        overlay.querySelectorAll('[data-action="save-estimate"]').forEach(btn => {
            btn.addEventListener('click', () => this.estimates_handleSave(overlay));
        });

        // Lead search button
        const searchLeadBtn = overlay.querySelector('[data-action="search-lead"]');
        if (searchLeadBtn) {
            searchLeadBtn.addEventListener('click', () => this.estimates_openLeadSearch(overlay));
        }
    },

    /**
     * Open lead search modal
     */
    estimates_openLeadSearch(parentOverlay) {
        const searchModalHtml = `
            <div class="estimate-search-modal-overlay" id="leadSearchModal">
                <div class="estimate-search-modal">
                    <div class="estimate-search-modal-header">
                        <h3>Search Leads</h3>
                        <button class="estimate-modal-close" onclick="document.getElementById('leadSearchModal').remove()">×</button>
                    </div>
                    <div class="estimate-search-modal-body">
                        <div class="estimate-search-input-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input type="text" id="leadSearchInput" placeholder="Type to search leads..." autofocus>
                        </div>
                        <div class="estimate-lead-results" id="leadSearchResults">
                            ${this.estimates_renderLeadSearchResults('')}
                        </div>
                    </div>
                </div>
                <style>
                    .estimate-search-modal-overlay {
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
                    }

                    .estimate-search-modal {
                        background: var(--surface);
                        border-radius: 12px;
                        width: 90%;
                        max-width: 600px;
                        max-height: 70vh;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                        animation: slideUp 0.3s ease;
                    }

                    .estimate-search-modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 20px 24px;
                        border-bottom: 1px solid var(--border);
                    }

                    .estimate-search-modal-header h3 {
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--text-primary);
                    }

                    .estimate-search-modal-body {
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        flex: 1;
                        min-height: 0;
                    }

                    .estimate-search-input-wrapper {
                        position: relative;
                    }

                    .estimate-search-input-wrapper svg {
                        position: absolute;
                        left: 14px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 18px;
                        height: 18px;
                        color: var(--text-tertiary);
                        pointer-events: none;
                    }

                    .estimate-search-input-wrapper input {
                        width: 100%;
                        padding: 12px 16px 12px 44px;
                        border: 2px solid var(--border);
                        border-radius: 8px;
                        background: var(--background);
                        color: var(--text-primary);
                        font-size: 15px;
                        transition: all 0.2s;
                    }

                    .estimate-search-input-wrapper input:focus {
                        outline: none;
                        border-color: var(--primary);
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                    }

                    .estimate-lead-results {
                        overflow-y: auto;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .estimate-lead-result-item {
                        padding: 14px 16px;
                        border: 1px solid var(--border);
                        border-radius: 8px;
                        background: var(--surface);
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }

                    .estimate-lead-result-item:hover {
                        border-color: var(--primary);
                        background: rgba(102, 126, 234, 0.05);
                        transform: translateX(4px);
                    }

                    .estimate-lead-result-name {
                        font-size: 15px;
                        font-weight: 600;
                        color: var(--text-primary);
                    }

                    .estimate-lead-result-details {
                        font-size: 13px;
                        color: var(--text-secondary);
                    }

                    .estimate-lead-no-results {
                        text-align: center;
                        padding: 40px 20px;
                        color: var(--text-secondary);
                        font-size: 14px;
                    }
                </style>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', searchModalHtml);

        // Attach search events
        const searchInput = document.getElementById('leadSearchInput');
        const resultsContainer = document.getElementById('leadSearchResults');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            resultsContainer.innerHTML = this.estimates_renderLeadSearchResults(query);
        });

        // Handle lead selection
        document.getElementById('leadSearchModal').addEventListener('click', (e) => {
            const leadItem = e.target.closest('.estimate-lead-result-item');
            if (leadItem) {
                const leadId = leadItem.dataset.leadId;
                const leadSelect = parentOverlay.querySelector('#estimateLead');
                if (leadSelect) {
                    leadSelect.value = leadId;
                }
                document.getElementById('leadSearchModal').remove();
            }
        });
    },

    /**
     * Render lead search results
     */
    estimates_renderLeadSearchResults(query) {
        const leads = Array.isArray(this.state.leads) ? this.state.leads : [];

        const filtered = query ? leads.filter(lead => {
            const searchText = `${lead.name} ${lead.company || ''} ${lead.email || ''} ${lead.phone || ''}`.toLowerCase();
            return searchText.includes(query);
        }) : leads;

        if (filtered.length === 0) {
            return `<div class="estimate-lead-no-results">No leads found${query ? ` for "${query}"` : ''}</div>`;
        }

        return filtered.map(lead => `
            <div class="estimate-lead-result-item" data-lead-id="${lead.id}">
                <div class="estimate-lead-result-name">${this.estimates_truncateText(lead.name, 60)}</div>
                <div class="estimate-lead-result-details">
                    ${lead.company ? this.estimates_truncateText(lead.company, 50) : 'No company'}
                    ${lead.phone ? ` • ${lead.phone}` : ''}
                    ${lead.email ? ` • ${this.estimates_truncateText(lead.email, 40)}` : ''}
                </div>
            </div>
        `).join('');
    },

    /**
     * Add line item
     */
    estimates_addLineItem(overlay) {
        const container = overlay.querySelector('#lineItemsContainer');
        const currentItems = container.querySelectorAll('.estimate-line-item').length;

        const newItem = { description: '', quantity: 1, rate: 0 };
        const html = this.estimates_renderLineItemRow(newItem, currentItems);

        container.insertAdjacentHTML('beforeend', html);
        this.estimates_updateLineItemsTotal();
    },

    /**
     * Remove line item
     */
    estimates_removeLineItem(overlay, index) {
        const container = overlay.querySelector('#lineItemsContainer');
        const items = container.querySelectorAll('.estimate-line-item');

        if (items.length <= 1) {
            window.SteadyUtils.showToast('At least one line item required', 'warning');
            return;
        }

        items[index].remove();

        // Re-index remaining items
        container.querySelectorAll('.estimate-line-item').forEach((item, newIndex) => {
            item.dataset.index = newIndex;
            item.querySelector('[data-action="remove-line-item"]').dataset.index = newIndex;
        });

        this.estimates_updateLineItemsTotal();
    },

    /**
     * Update line items total
     */
    estimates_updateLineItemsTotal() {
        const container = document.querySelector('#lineItemsContainer');
        if (!container) return;

        let total = 0;
        container.querySelectorAll('.estimate-line-item').forEach(row => {
            const qty = parseFloat(row.querySelector('.line-item-quantity').value) || 0;
            const rate = parseFloat(row.querySelector('.line-item-rate').value) || 0;
            const lineTotal = qty * rate;

            row.querySelector('.estimate-line-item-total').textContent = formatCurrency(lineTotal);
            total += lineTotal;
        });

        const displayEl = document.querySelector('#estimateTotalDisplay');
        if (displayEl) {
            displayEl.textContent = formatCurrency(total);
        }
    },

    /**
     * Handle photo upload
     */
    async estimates_handlePhotoUpload(overlay, file) {
        try {
            const photoGrid = overlay.querySelector('#photoGrid');
            const currentPhotos = photoGrid.querySelectorAll('.estimate-photo-item').length;

            if (currentPhotos >= 3) {
                window.SteadyUtils.showToast('Maximum 3 photos allowed', 'warning');
                return;
            }

            window.SteadyUtils.showToast('Compressing photo...', 'info');

            // Compress image
            const compressedFile = await API.compressImage(file);

            // Create preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoData = {
                    url: e.target.result,
                    file: compressedFile,
                    caption: file.name
                };

                // Add photo to grid
                const uploadBtn = photoGrid.querySelector('.estimate-photo-upload');
                const photoHtml = this.estimates_renderPhotoItem(photoData, currentPhotos);

                if (uploadBtn) {
                    uploadBtn.insertAdjacentHTML('beforebegin', photoHtml);

                    // Remove upload button if at max
                    if (currentPhotos + 1 >= 3) {
                        uploadBtn.remove();
                    }
                } else {
                    photoGrid.insertAdjacentHTML('beforeend', photoHtml);
                }

                // Update counter
                this.estimates_updatePhotoCounter(overlay);
                window.SteadyUtils.showToast('Photo added', 'success');
            };
            reader.readAsDataURL(compressedFile);

        } catch (error) {
            console.error('Error uploading photo:', error);
            window.SteadyUtils.showToast('Failed to upload photo', 'error');
        }
    },

    /**
     * Remove photo
     */
    estimates_removePhoto(overlay, index) {
        const photoGrid = overlay.querySelector('#photoGrid');
        const photos = photoGrid.querySelectorAll('.estimate-photo-item');

        photos[index].remove();

        // Re-index remaining photos
        photoGrid.querySelectorAll('.estimate-photo-item').forEach((photo, newIndex) => {
            photo.dataset.index = newIndex;
            photo.querySelector('[data-action="remove-photo"]').dataset.index = newIndex;
        });

        // Add upload button if under max
        const currentPhotos = photoGrid.querySelectorAll('.estimate-photo-item').length;
        if (currentPhotos < 3 && !photoGrid.querySelector('.estimate-photo-upload')) {
            photoGrid.insertAdjacentHTML('beforeend', this.estimates_renderPhotoUploadButton());

            // Re-attach upload event
            const uploadBtn = photoGrid.querySelector('[data-action="upload-photo"]');
            uploadBtn.addEventListener('click', () => {
                photoGrid.querySelector('#photoUploadInput').click();
            });

            photoGrid.querySelector('#photoUploadInput').addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.estimates_handlePhotoUpload(overlay, e.target.files[0]);
                }
            });
        }

        this.estimates_updatePhotoCounter(overlay);
        window.SteadyUtils.showToast('Photo removed', 'success');
    },

    /**
     * Update photo counter
     */
    estimates_updatePhotoCounter(overlay) {
        const photoGrid = overlay.querySelector('#photoGrid');
        const counter = overlay.querySelector('#photoCounter');
        const currentPhotos = photoGrid.querySelectorAll('.estimate-photo-item').length;

        if (counter) {
            counter.textContent = `${currentPhotos}/3 photos`;
        }
    },

    /**
     * Handle estimate save
     */
    async estimates_handleSave(overlay) {
        try {
            // Gather form data
            const title = overlay.querySelector('#estimateTitle').value.trim();
            const leadId = overlay.querySelector('#estimateLead').value;
            const status = overlay.querySelector('#estimateStatus').value;
            const expiresAt = overlay.querySelector('#estimateExpiry').value;
            const description = overlay.querySelector('#estimateDescription').value.trim();
            const terms = overlay.querySelector('#estimateTerms').value.trim();
            const notes = overlay.querySelector('#estimateNotes').value.trim();

            // Validation
            if (!title) {
                window.SteadyUtils.showToast('Title is required', 'error');
                return;
            }

            // Gather line items
            const lineItems = [];
            overlay.querySelectorAll('.estimate-line-item').forEach(row => {
                const desc = row.querySelector('.line-item-description').value.trim();
                const qty = parseFloat(row.querySelector('.line-item-quantity').value) || 0;
                const rate = parseFloat(row.querySelector('.line-item-rate').value) || 0;

                if (desc || qty > 0 || rate > 0) {
                    lineItems.push({ description: desc, quantity: qty, rate: rate });
                }
            });

            // Calculate total
            const totalPrice = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

            // Gather photos
            const photoElements = overlay.querySelectorAll('.estimate-photo-item img');
            const photos = Array.from(photoElements).map((img, i) => ({
                url: img.src,
                caption: `Photo ${i + 1}`
            }));

            const estimateData = {
                title,
                lead_id: leadId || null,
                status,
                expires_at: expiresAt || null,
                description,
                terms,
                notes,
                line_items: lineItems,
                total_price: totalPrice,
                photos
            };

            // Create or update
            let savedEstimate;
            if (this.state.editingEstimateId) {
                savedEstimate = await API.updateEstimate(this.state.editingEstimateId, estimateData);

                // Update in state
                const index = this.state.estimates.findIndex(e => e.id === this.state.editingEstimateId);
                if (index !== -1) {
                    this.state.estimates[index] = savedEstimate;
                }

                window.SteadyUtils.showToast('Estimate updated successfully', 'success');
            } else {
                // Generate estimate number before creating
                const estimateNumber = await API.generateEstimateNumber();
                savedEstimate = await API.createEstimate({ ...estimateData, estimate_number: estimateNumber });

                this.state.estimates.unshift(savedEstimate);
                window.SteadyUtils.showToast('Estimate created successfully', 'success');
            }

            this.estimates_closeModal();
            this.estimates_calculateStats();
            this.estimates_render();

        } catch (error) {
            console.error('Error saving estimate:', error);
            window.SteadyUtils.showToast('Failed to save estimate', 'error');
        }
    },

    /**
     * Close modal
     */
    estimates_closeModal() {
        const overlay = document.querySelector('.estimate-modal-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        }
        this.state.editingEstimateId = null;
    },

    /**
     * Open detail view (read-only with status actions)
     */
    estimates_openDetailView(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) {
            window.SteadyUtils.showToast('Estimate not found', 'error');
            return;
        }

        const lead = (Array.isArray(this.state.leads) ? this.state.leads : []).find(l => l.id === estimate.lead_id);
        const lineItems = estimate.line_items || [];
        const photos = estimate.photos || [];

        const overlay = document.createElement('div');
        overlay.className = 'estimate-modal-overlay';
        overlay.innerHTML = `
            <style>
                .estimate-detail-modal {
                    background: var(--card-bg);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }

                .estimate-detail-header {
                    padding: 24px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .estimate-detail-header-left h2 {
                    margin: 0 0 8px 0;
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .estimate-detail-number {
                    font-size: 13px;
                    color: var(--text-secondary);
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .estimate-detail-close {
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

                .estimate-detail-close:hover {
                    background: var(--surface-hover);
                }

                .estimate-detail-body {
                    padding: 24px;
                }

                .estimate-detail-section {
                    margin-bottom: 24px;
                }

                .estimate-detail-section-title {
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                }

                .estimate-detail-field {
                    margin-bottom: 16px;
                }

                .estimate-detail-label {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                }

                .estimate-detail-value {
                    font-size: 14px;
                    color: var(--text-primary);
                }

                .estimate-detail-line-items {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 16px;
                }

                .estimate-detail-line-item {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr;
                    gap: 12px;
                    padding: 12px 0;
                    border-bottom: 1px solid var(--border);
                }

                .estimate-detail-line-item:last-child {
                    border-bottom: none;
                }

                .estimate-detail-line-item-header {
                    font-weight: 600;
                    font-size: 12px;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                }

                .estimate-detail-total {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 2px solid var(--border);
                    text-align: right;
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--primary);
                }

                .estimate-detail-photos {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 12px;
                }

                .estimate-detail-photo {
                    aspect-ratio: 1;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .estimate-detail-photo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .estimate-detail-actions {
                    padding: 20px 24px;
                    border-top: 1px solid var(--border);
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .estimate-action-btn {
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .estimate-action-btn svg {
                    width: 16px;
                    height: 16px;
                }

                .estimate-action-btn.sent {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid #3b82f6;
                    color: #3b82f6;
                }

                .estimate-action-btn.accepted {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid #22c55e;
                    color: #22c55e;
                }

                .estimate-action-btn.rejected {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid #ef4444;
                    color: #ef4444;
                }

                .estimate-action-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .estimate-action-btn.edit {
                    background: var(--primary);
                    border: 1px solid var(--primary);
                    color: white;
                }

                .estimate-action-btn.convert {
                    background: #22c55e;
                    border: 1px solid #22c55e;
                    color: white;
                    margin-left: auto;
                }
            </style>

            <div class="estimate-detail-modal">
                <div class="estimate-detail-header">
                    <div class="estimate-detail-header-left">
                        <div class="estimate-detail-number">${estimate.estimate_number || 'EST-???'}</div>
                        <h2>${estimate.title || 'Untitled'}</h2>
                        ${this.estimates_renderStatusBadge(estimate.status)}
                    </div>
                    <button class="estimate-detail-close" data-action="close-detail">×</button>
                </div>

                <div class="estimate-detail-body">
                    <!-- Basic Info -->
                    <div class="estimate-detail-section">
                        <div class="estimate-detail-section-title">Basic Information</div>
                        ${lead ? `
                            <div class="estimate-detail-field">
                                <div class="estimate-detail-label">Lead</div>
                                <div class="estimate-detail-value">${lead.name}${lead.company ? ` (${lead.company})` : ''}</div>
                            </div>
                        ` : ''}
                        ${estimate.description ? `
                            <div class="estimate-detail-field">
                                <div class="estimate-detail-label">Description</div>
                                <div class="estimate-detail-value">${estimate.description}</div>
                            </div>
                        ` : ''}
                        ${estimate.expires_at ? `
                            <div class="estimate-detail-field">
                                <div class="estimate-detail-label">Expires On</div>
                                <div class="estimate-detail-value">${new Date(estimate.expires_at).toLocaleDateString()}</div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Line Items -->
                    ${lineItems.length > 0 ? `
                        <div class="estimate-detail-section">
                            <div class="estimate-detail-section-title">Line Items</div>
                            <div class="estimate-detail-line-items">
                                <div class="estimate-detail-line-item estimate-detail-line-item-header">
                                    <div>Description</div>
                                    <div>Quantity</div>
                                    <div>Rate</div>
                                    <div>Total</div>
                                </div>
                                ${lineItems.map(item => `
                                    <div class="estimate-detail-line-item">
                                        <div>${item.description || '—'}</div>
                                        <div>${item.quantity || 0}</div>
                                        <div>${formatCurrency(item.rate || 0)}</div>
                                        <div>${formatCurrency((item.quantity || 0) * (item.rate || 0))}</div>
                                    </div>
                                `).join('')}
                                <div class="estimate-detail-total">
                                    Total: ${formatCurrency(estimate.total_price || 0)}
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Photos -->
                    ${photos.length > 0 ? `
                        <div class="estimate-detail-section">
                            <div class="estimate-detail-section-title">Photos (${photos.length})</div>
                            <div class="estimate-detail-photos">
                                ${photos.map(photo => `
                                    <div class="estimate-detail-photo">
                                        <img src="${photo.url}" alt="${photo.caption || 'Photo'}">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Terms -->
                    ${estimate.terms ? `
                        <div class="estimate-detail-section">
                            <div class="estimate-detail-section-title">Terms & Conditions</div>
                            <div class="estimate-detail-value" style="white-space: pre-wrap;">${estimate.terms}</div>
                        </div>
                    ` : ''}

                    <!-- Notes -->
                    ${estimate.notes ? `
                        <div class="estimate-detail-section">
                            <div class="estimate-detail-section-title">Internal Notes</div>
                            <div class="estimate-detail-value" style="white-space: pre-wrap;">${estimate.notes}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="estimate-detail-actions">
                    ${estimate.status !== 'sent' && estimate.status !== 'accepted' && estimate.status !== 'rejected' ? `
                        <button class="estimate-action-btn sent" data-action="mark-sent" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>
                            </svg>
                            Mark as Sent
                        </button>
                    ` : ''}

                    ${estimate.status === 'sent' || estimate.status === 'draft' ? `
                        <button class="estimate-action-btn accepted" data-action="mark-accepted" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                            </svg>
                            Mark as Accepted
                        </button>

                        <button class="estimate-action-btn rejected" data-action="mark-rejected" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                            </svg>
                            Mark as Rejected
                        </button>
                    ` : ''}

                    <button class="estimate-action-btn edit" data-action="edit-from-detail" data-id="${estimate.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2"/>
                        </svg>
                        Edit
                    </button>

                    ${estimate.status === 'accepted' ? `
                        <button class="estimate-action-btn convert" data-action="convert-from-detail" data-id="${estimate.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Convert to Job
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Attach events
        setTimeout(() => {
            overlay.querySelector('[data-action="close-detail"]').addEventListener('click', () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 200);
                }
            });

            // Status actions
            const markSentBtn = overlay.querySelector('[data-action="mark-sent"]');
            if (markSentBtn) {
                markSentBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_updateStatus(estimate.id, 'sent');
                });
            }

            const markAcceptedBtn = overlay.querySelector('[data-action="mark-accepted"]');
            if (markAcceptedBtn) {
                markAcceptedBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_updateStatus(estimate.id, 'accepted');
                });
            }

            const markRejectedBtn = overlay.querySelector('[data-action="mark-rejected"]');
            if (markRejectedBtn) {
                markRejectedBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_updateStatus(estimate.id, 'rejected');
                });
            }

            // Edit action
            const editBtn = overlay.querySelector('[data-action="edit-from-detail"]');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_openModal(estimate.id);
                });
            }

            // Convert action
            const convertBtn = overlay.querySelector('[data-action="convert-from-detail"]');
            if (convertBtn) {
                convertBtn.addEventListener('click', () => {
                    overlay.remove();
                    this.estimates_convertToJob(estimate.id);
                });
            }
        }, 0);
    },

    /**
     * Update estimate status
     */
    async estimates_updateStatus(estimateId, newStatus) {
        try {
            const estimate = this.state.estimates.find(e => e.id === estimateId);
            if (!estimate) return;

            const statusLabel = this.estimates_formatStatus(newStatus);
            const confirmed = confirm(`Mark estimate "${estimate.title}" as ${statusLabel}?`);
            if (!confirmed) return;

            // Call appropriate API method
            let updatedEstimate;
            if (newStatus === 'sent') {
                updatedEstimate = await API.markEstimateSent(estimateId);
            } else if (newStatus === 'accepted') {
                updatedEstimate = await API.markEstimateAccepted(estimateId);
            } else if (newStatus === 'rejected') {
                updatedEstimate = await API.markEstimateRejected(estimateId);
            }

            // Update in state
            const index = this.state.estimates.findIndex(e => e.id === estimateId);
            if (index !== -1) {
                this.state.estimates[index] = updatedEstimate;
            }

            this.estimates_calculateStats();
            this.estimates_render();
            window.SteadyUtils.showToast(`Estimate marked as ${statusLabel}`, 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            window.SteadyUtils.showToast('Failed to update status', 'error');
        }
    },

    /**
     * Convert estimate to job
     */
    async estimates_convertToJob(estimateId) {
        try {
            const estimate = this.state.estimates.find(e => e.id === estimateId);
            if (!estimate) {
                window.SteadyUtils.showToast('Estimate not found', 'error');
                return;
            }

            if (estimate.status !== 'accepted') {
                window.SteadyUtils.showToast('Only accepted estimates can be converted to jobs', 'warning');
                return;
            }

            const confirmed = confirm(
                `Convert estimate "${estimate.title}" to a job?\n\n` +
                `This will create a new job with:\n` +
                `- All estimate details\n` +
                `- Photos as "before" photos\n` +
                `- Line items as materials\n` +
                `- Quoted price: ${formatCurrency(estimate.total_price || 0)}`
            );

            if (!confirmed) return;

            window.SteadyUtils.showToast('Converting to job...', 'info');

            const newJob = await API.convertEstimateToJob(estimateId);

            window.SteadyUtils.showToast('Job created successfully! Redirecting...', 'success');

            // Redirect to Jobs page after short delay
            setTimeout(() => {
                window.location.href = '/dashboard/tiers/professional/jobs.html';
            }, 1500);

        } catch (error) {
            console.error('Error converting to job:', error);
            window.SteadyUtils.showToast('Failed to convert to job', 'error');
        }
    },

    /**
     * Toggle batch selection mode (LIGHTWEIGHT - like Goals)
     */
    estimates_toggleBatchMode() {
        this.state.batchMode = !this.state.batchMode;

        if (!this.state.batchMode) {
            // Clear selections when exiting batch mode
            this.state.selectedEstimateIds = [];
        }

        const container = document.getElementById(this.state.container);
        if (!container) return;

        const allCards = container.querySelectorAll('.estimate-card');
        const batchBtn = container.querySelector('[data-action="toggle-batch"]');

        if (this.state.batchMode) {
            // ENTER BATCH MODE - add checkboxes to existing cards
            allCards.forEach(card => {
                card.classList.add('batch-selectable');
                const estimateId = card.dataset.id;

                // Add checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'estimate-card-checkbox';
                checkbox.dataset.action = 'toggle-selection';
                checkbox.dataset.id = estimateId;

                // Add event listener
                checkbox.addEventListener('change', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const isChecked = e.currentTarget.checked;

                    if (isChecked) {
                        if (!this.state.selectedEstimateIds.includes(id)) {
                            this.state.selectedEstimateIds.push(id);
                        }
                        card.classList.add('selected');
                    } else {
                        this.state.selectedEstimateIds = this.state.selectedEstimateIds.filter(eid => eid !== id);
                        card.classList.remove('selected');
                    }

                    // Update button text
                    if (batchBtn) {
                        batchBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Cancel (${this.state.selectedEstimateIds.length} selected)
                        `;
                    }

                    // Update batch actions toolbar
                    this.estimates_updateBatchActionsToolbar();
                });

                card.insertBefore(checkbox, card.firstChild);
            });

            // Update button
            if (batchBtn) {
                batchBtn.classList.add('active');
                batchBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Cancel (0 selected)
                `;
            }

        } else {
            // EXIT BATCH MODE - remove checkboxes and selections
            allCards.forEach(card => {
                card.classList.remove('batch-selectable', 'selected');

                // Remove checkbox
                const checkbox = card.querySelector('.estimate-card-checkbox');
                if (checkbox) checkbox.remove();
            });

            // Update button
            if (batchBtn) {
                batchBtn.classList.remove('active');
                batchBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Select Multiple
                `;
            }

            // Remove batch actions toolbar
            const batchActionsToolbar = container.querySelector('.estimates-batch-actions');
            if (batchActionsToolbar) {
                batchActionsToolbar.remove();
            }
        }
    },

    /**
     * Update batch actions toolbar (lightweight)
     */
    estimates_updateBatchActionsToolbar() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const existingBatchActions = container.querySelector('.estimates-batch-actions');
        const toolbarContainer = container.querySelector('.estimates-toolbar');

        if (this.state.batchMode && this.state.selectedEstimateIds.length > 0) {
            const batchActionsHTML = `
                <div class="estimates-batch-actions">
                    <div class="estimates-batch-actions-left">
                        <div class="estimates-batch-selected">${this.state.selectedEstimateIds.length} selected</div>
                    </div>
                    <div class="estimates-batch-actions-right">
                        <button class="estimates-batch-btn" data-action="batch-mark-sent">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-width="2"/>
                            </svg>
                            Mark Sent
                        </button>
                        <button class="estimates-batch-btn" data-action="batch-mark-accepted">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/>
                            </svg>
                            Mark Accepted
                        </button>
                        <button class="estimates-batch-btn delete" data-action="batch-delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;

            if (existingBatchActions) {
                // Update the selected count
                const selectedText = existingBatchActions.querySelector('.estimates-batch-selected');
                if (selectedText) {
                    selectedText.textContent = `${this.state.selectedEstimateIds.length} selected`;
                }
            } else {
                // Add batch actions after toolbar
                toolbarContainer.insertAdjacentHTML('afterend', batchActionsHTML);

                // Attach events to batch action buttons
                const batchMarkSent = container.querySelector('[data-action="batch-mark-sent"]');
                if (batchMarkSent) {
                    batchMarkSent.addEventListener('click', () => this.estimates_batchMarkSent());
                }

                const batchMarkAccepted = container.querySelector('[data-action="batch-mark-accepted"]');
                if (batchMarkAccepted) {
                    batchMarkAccepted.addEventListener('click', () => this.estimates_batchMarkAccepted());
                }

                const batchDelete = container.querySelector('[data-action="batch-delete"]');
                if (batchDelete) {
                    batchDelete.addEventListener('click', () => this.estimates_batchDelete());
                }
            }
        } else {
            // Remove batch actions if present
            if (existingBatchActions) {
                existingBatchActions.remove();
            }
        }
    },

    /**
     * Batch action: Mark selected as sent
     */
    async estimates_batchMarkSent() {
        if (this.state.selectedEstimateIds.length === 0) return;

        const confirmed = confirm(`Mark ${this.state.selectedEstimateIds.length} estimate(s) as Sent?`);
        if (!confirmed) return;

        try {
            for (const id of this.state.selectedEstimateIds) {
                await API.markEstimateSent(id);
                const index = this.state.estimates.findIndex(e => e.id === id);
                if (index !== -1) {
                    this.state.estimates[index].status = 'sent';
                }
            }

            this.state.selectedEstimateIds = [];
            this.state.batchMode = false;
            this.estimates_calculateStats();
            this.estimates_render();
            window.SteadyUtils.showToast('Estimates marked as Sent', 'success');
        } catch (error) {
            console.error('Batch mark sent error:', error);
            window.SteadyUtils.showToast('Failed to update estimates', 'error');
        }
    },

    /**
     * Batch action: Mark selected as accepted
     */
    async estimates_batchMarkAccepted() {
        if (this.state.selectedEstimateIds.length === 0) return;

        const confirmed = confirm(`Mark ${this.state.selectedEstimateIds.length} estimate(s) as Accepted?`);
        if (!confirmed) return;

        try {
            for (const id of this.state.selectedEstimateIds) {
                await API.markEstimateAccepted(id);
                const index = this.state.estimates.findIndex(e => e.id === id);
                if (index !== -1) {
                    this.state.estimates[index].status = 'accepted';
                }
            }

            this.state.selectedEstimateIds = [];
            this.state.batchMode = false;
            this.estimates_calculateStats();
            this.estimates_render();
            window.SteadyUtils.showToast('Estimates marked as Accepted', 'success');
        } catch (error) {
            console.error('Batch mark accepted error:', error);
            window.SteadyUtils.showToast('Failed to update estimates', 'error');
        }
    },

    /**
     * Batch action: Delete selected
     */
    async estimates_batchDelete() {
        if (this.state.selectedEstimateIds.length === 0) return;

        const confirmed = confirm(`Delete ${this.state.selectedEstimateIds.length} estimate(s)? This cannot be undone.`);
        if (!confirmed) return;

        try {
            for (const id of this.state.selectedEstimateIds) {
                await API.deleteEstimate(id);
                this.state.estimates = this.state.estimates.filter(e => e.id !== id);
            }

            this.state.selectedEstimateIds = [];
            this.state.batchMode = false;
            this.estimates_calculateStats();
            this.estimates_render();
            window.SteadyUtils.showToast('Estimates deleted successfully', 'success');
        } catch (error) {
            console.error('Batch delete error:', error);
            window.SteadyUtils.showToast('Failed to delete estimates', 'error');
        }
    },

    /**
     * Delete estimate
     */
    async estimates_deleteEstimate(estimateId) {
        const estimate = this.state.estimates.find(e => e.id === estimateId);
        if (!estimate) return;

        const confirmed = confirm(`Delete estimate "${estimate.title}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            await API.deleteEstimate(estimateId);
            this.state.estimates = this.state.estimates.filter(e => e.id !== estimateId);
            this.estimates_calculateStats();
            this.estimates_render();
            window.SteadyUtils.showToast('Estimate deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting estimate:', error);
            window.SteadyUtils.showToast('Failed to delete estimate', 'error');
        }
    },

    /**
     * Loading state
     */
    estimates_showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 60px; color: var(--text-secondary);">Loading estimates...</div>';
        }
    },

    /**
     * Error state
     */
    estimates_showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `<div style="text-align: center; padding: 60px; color: #ef4444;">${message}</div>`;
        }
    }
};

// Auto-init if on estimates page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('estimates')) {
            EstimatesModule.init();
        }
    });
} else {
    if (window.location.pathname.includes('estimates')) {
        EstimatesModule.init();
    }
}
