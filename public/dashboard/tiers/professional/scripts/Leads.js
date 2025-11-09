window.AddLeadModule = {
    // State
    addlead_state: {
        leads: [],
        isLoading: false,
        isTransitioning: false,
        searchTerm: '',
        currentView: 'dashboard',
        currentEditLead: null,
        targetContainer: 'leads-content',
        eventListeners: [],
        currentFilters: {
            statuses: [],
            sources: [],
            value: ''
        }
    },

    // Init with fade-in
    async init(targetContainer = 'leads-content') {
        console.log('AddLead module loading');
        
        try {
            this.addlead_state.targetContainer = targetContainer;
            this.addlead_state.isLoading = true;
            
            const container = document.getElementById(targetContainer);
            if (container) {
                container.style.opacity = '0';
                container.style.transition = 'opacity 0.3s ease';
            }
            
            await this.addlead_loadLeads();
            this.addlead_render();
            
            // Fade in
            setTimeout(() => {
                if (container) {
                    container.style.opacity = '1';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }, 50);
            
            console.log('AddLead module ready');
            
        } catch (error) {
            console.error('AddLead init failed:', error);
            this.addlead_renderError(error.message);
        } finally {
            this.addlead_state.isLoading = false;
        }
    },

    // Load leads from API
    async addlead_loadLeads() {
        try {
            const leadData = await API.getLeads();
            
            if (leadData.all) {
                this.addlead_state.leads = leadData.all;
            } else if (Array.isArray(leadData)) {
                this.addlead_state.leads = leadData;
            } else if (leadData.leads) {
                this.addlead_state.leads = leadData.leads;
            } else {
                this.addlead_state.leads = [];
            }

            console.log(`Loaded ${this.addlead_state.leads.length} leads`);
            
        } catch (error) {
            console.error('Failed to load leads:', error);
            this.addlead_state.leads = [];
            throw error;
        }
    },

    // Main render (no transitions here)
    addlead_render() {
        const container = document.getElementById(this.addlead_state.targetContainer);
        if (!container) return;

        container.innerHTML = `
            <div class="addlead-container">
                ${this.addlead_state.currentView === 'table' ? 
                    this.addlead_renderTableView() : 
                    this.addlead_renderDashboardView()}
                ${this.addlead_renderStyles()}
            </div>
        `;

        this.addlead_setupEventListeners();
        this.addlead_updateHeaderIndicators();
        this.addlead_updateActiveFiltersPanel();
    },

    // Dashboard view
    addlead_renderDashboardView() {
        const leadsCount = this.addlead_state.leads.length;
        
        return `
            <div class="addlead-action-bubbles">
                <div class="addlead-action-bubble addlead-bubble-primary" onclick="AddLeadModule.addlead_showAddLeadModal()">
                    <div class="addlead-bubble-icon">➕</div>
                    <div class="addlead-bubble-content">
                        <h2 class="addlead-bubble-title">Add New Lead</h2>
                        <p class="addlead-bubble-subtitle">Create a new lead and start building relationships</p>
                        <button class="addlead-bubble-button">
                            <span>Add Lead</span>
                            <span class="addlead-arrow">→</span>
                        </button>
                    </div>
                </div>
                
                <div class="addlead-action-bubble addlead-bubble-secondary" onclick="AddLeadModule.addlead_showTableView()">
                    <i data-lucide="database" class="addlead-bubble-icon" style="width: 48px; height: 48px;"></i>
                    <div class="addlead-bubble-content">
                        <h2 class="addlead-bubble-title">Manage Leads</h2>
                        <p class="addlead-bubble-subtitle">View, search, and manage your complete lead database</p>
                        <button class="addlead-bubble-button">
                            <span>View All Leads (${leadsCount})</span>
                            <span class="addlead-arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
            
            ${leadsCount > 0 ? this.addlead_renderRecentLeads() : ''}
        `;
    },

    // Recent leads section
    addlead_renderRecentLeads() {
        const recentLeads = [...this.addlead_state.leads]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        return `
            <div class="addlead-recent-section">
                <div class="addlead-recent-header">
                    <h3 class="addlead-recent-title">Recent Leads</h3>
                    <button class="addlead-view-all-btn" onclick="AddLeadModule.addlead_showTableView()">
                        View All →
                    </button>
                </div>
                <div class="addlead-recent-list">
                    ${recentLeads.map(lead => this.addlead_renderRecentItem(lead)).join('')}
                </div>
            </div>
        `;
    },

    // Recent item card
    addlead_renderRecentItem(lead) {
        const timeAgo = this.addlead_formatTimeAgo(lead.created_at);
        const initials = this.addlead_getInitials(lead.name);
        const statusClass = this.addlead_getStatusClass(lead.status);
        
        const safeName = API.escapeHtml(lead.name);
        const safeCompany = API.escapeHtml(lead.company || 'No company');
        const safeEmail = API.escapeHtml(lead.email || '');
        const safePhone = API.escapeHtml(lead.phone || '');
        
        return `
            <div class="addlead-recent-item addlead-clickable-item" onclick="AddLeadModule.addlead_showLeadView('${lead.id}')">
                <div class="addlead-recent-avatar">
                    <span class="addlead-avatar-text">${initials}</span>
                </div>
                <div class="addlead-recent-info">
                    <div class="addlead-recent-name">${safeName}</div>
                    <div class="addlead-recent-meta">
                        <span class="addlead-recent-company">${safeCompany}</span>
                        <span class="addlead-recent-time">${timeAgo}</span>
                    </div>
                </div>
                <div class="addlead-recent-status">
                    <span class="addlead-status-badge ${statusClass}">${this.addlead_formatStatus(lead.status)}</span>
                </div>
            </div>
        `;
    },

    // Table view
    addlead_renderTableView() {
        const filteredLeads = this.addlead_getFilteredLeads();
        
        return `
            <div class="addlead-table-view">
                <div class="addlead-table-header">
                    <div class="addlead-table-header-left">
                        <button class="addlead-back-btn" onclick="AddLeadModule.addlead_showDashboard()">
                            ← Back to Dashboard
                        </button>
                        <h2 class="addlead-table-title">All Leads (${filteredLeads.length})</h2>
                    </div>
                    <div class="addlead-table-header-right">
                        <div class="addlead-search-box">
                            <input type="text" 
                                   class="addlead-search-input" 
                                   placeholder="Search leads..." 
                                   value="${API.escapeHtml(this.addlead_state.searchTerm)}"
                                   id="addlead_searchInput">
                            <i data-lucide="search" class="addlead-search-icon" style="width: 18px; height: 18px;"></i>
                        </div>
                        <button class="addlead-add-btn" onclick="AddLeadModule.addlead_showAddLeadModal()">
                            + Add Lead
                        </button>
                    </div>
                </div>
                
                <div class="addlead-table-container">
                    ${filteredLeads.length > 0 ? 
                        this.addlead_renderTable(filteredLeads) : 
                        this.addlead_renderEmptyState()}
                </div>
            </div>
        `;
    },

    // Table with horizontal scroll
    addlead_renderTable(leads) {
        return `
            <div class="addlead-table-scroll-wrapper">
                <table class="addlead-leads-table">
                    <thead>
                        <tr>
                            <th>Lead</th>
                            <th>Contact</th>
                            <th>
                                <div class="addlead-header-filter" onclick="AddLeadModule.addlead_showStatusFilter(event)">
                                    Status <span class="addlead-filter-arrow">▼</span>
                                </div>
                            </th>
                            <th>
                                <div class="addlead-header-filter" onclick="AddLeadModule.addlead_showSourceFilter(event)">
                                    Source <span class="addlead-filter-arrow">▼</span>
                                </div>
                            </th>
                            <th>
                                <div class="addlead-header-filter" onclick="AddLeadModule.addlead_showValueFilter(event)">
                                    Value <span class="addlead-filter-arrow">▼</span>
                                </div>
                            </th>
                            <th>Added</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leads.map(lead => this.addlead_renderTableRow(lead)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Table row
    addlead_renderTableRow(lead) {
        const timeAgo = this.addlead_formatTimeAgo(lead.created_at);
        const initials = this.addlead_getInitials(lead.name);
        const statusClass = this.addlead_getStatusClass(lead.status);
        
        const safeName = API.escapeHtml(lead.name);
        const safeCompany = API.escapeHtml(lead.company || 'No company');
        const safeEmail = API.escapeHtml(lead.email || '');
        const safePhone = API.escapeHtml(lead.phone || '');
        const sourceIcon = this.addlead_getSourceIcon(lead.source || null);
        const safeSource = API.escapeHtml(this.addlead_formatSource(lead.source || null));

        return `
            <tr class="addlead-table-row addlead-clickable-row" onclick="AddLeadModule.addlead_showLeadView('${lead.id}')">
                <td class="addlead-lead-cell">
                    <div class="addlead-lead-info">
                        <div class="addlead-lead-avatar">
                            <span class="addlead-avatar-text">${initials}</span>
                        </div>
                        <div class="addlead-lead-details">
                            <div class="addlead-lead-name">${safeName}</div>
                            <div class="addlead-lead-company">${safeCompany}</div>
                        </div>
                    </div>
                </td>
                <td class="addlead-contact-cell">
                    ${safeEmail ? `<div class="addlead-contact-item"><i data-lucide="mail" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>${safeEmail}</div>` : ''}
                    ${safePhone ? `<div class="addlead-contact-item"><i data-lucide="phone" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>${safePhone}</div>` : ''}
                </td>
                <td class="addlead-status-cell">
                    <span class="addlead-status-badge ${statusClass}">${this.addlead_formatStatus(lead.status)}</span>
                </td>
                <td class="addlead-source-cell">
                    <span class="addlead-source-badge"><i data-lucide="${sourceIcon}" style="width: 14px; height: 14px; margin-right: 4px;"></i>${safeSource}</span>
                </td>
                <td class="addlead-value-cell">
                    ${lead.potential_value > 0 ? 
                        `<span class="addlead-value-amount">$${lead.potential_value.toLocaleString()}</span>` : 
                        '<span class="addlead-no-value">-</span>'
                    }
                </td>
                <td class="addlead-date-cell">
                    <span class="addlead-date-text">${timeAgo}</span>
                </td>
            </tr>
        `;
    },

    // Empty state
    addlead_renderEmptyState() {
        const safeSearchTerm = API.escapeHtml(this.addlead_state.searchTerm);
        
        return `
            <div class="addlead-empty-state">
                <i data-lucide="target" class="addlead-empty-icon" style="width: 64px; height: 64px;"></i>
                <div class="addlead-empty-title">No leads found</div>
                <div class="addlead-empty-subtitle">
                    ${this.addlead_state.searchTerm ? 
                        `No leads match "${safeSearchTerm}". Try a different search term.` :
                        'Start building your sales pipeline by adding your first lead.'
                    }
                </div>
                ${!this.addlead_state.searchTerm ? `
                    <button class="addlead-empty-action-btn" onclick="AddLeadModule.addlead_showAddLeadModal()">
                        ➕ Add Your First Lead
                    </button>
                ` : ''}
            </div>
        `;
    },

    // INSTANT ADD LEAD MODAL - Dynamic creation
    addlead_showAddLeadModal() {
        if (this.addlead_state.isTransitioning) return;
        
        // Remove any existing modals
        document.getElementById('addlead_addModal')?.remove();
        
        const modal = document.createElement('div');
        modal.className = 'addlead-modal-overlay addlead-show';
        modal.id = 'addlead_addModal';
        modal.innerHTML = `
            <div class="addlead-modal" onclick="event.stopPropagation()">
                <div class="addlead-modal-header">
                    <h2 class="addlead-modal-title">Add New Lead</h2>
                    <button class="addlead-modal-close" onclick="AddLeadModule.addlead_hideAddLeadModal()">×</button>
                </div>
                <div class="addlead-modal-body">
                    ${this.addlead_renderAddForm()}
                </div>
            </div>
        `;
        
// Close on backdrop click - proper mousedown/mouseup pattern
let mouseDownTarget = null;

modal.addEventListener('mousedown', (e) => {
    mouseDownTarget = e.target;
});

modal.addEventListener('mouseup', (e) => {
    // Only close if both down and up were on the overlay (not modal content)
    if (mouseDownTarget === modal && e.target === modal) {
        this.addlead_hideAddLeadModal();
    }
    mouseDownTarget = null;
});
        
        document.body.appendChild(modal);
        
        // Setup form functionality
        setTimeout(() => {
            this.addlead_setupInputValidation();
            this.addlead_setupPhoneFormatting();
            this.addlead_setupMoneyFormatting();
            this.addlead_setupQualitySliders();
            this.addlead_setupSourceSelector();
            
            const form = document.getElementById('addlead_form');
            if (form) {
                form.onsubmit = (e) => this.addlead_handleSubmit(e);
            }
            
            const firstInput = modal.querySelector('input[name="name"]');
            if (firstInput) firstInput.focus();
        }, 10);
    },

    addlead_hideAddLeadModal() {
        const modal = document.getElementById('addlead_addModal');
        if (modal) {
            modal.classList.remove('addlead-show');
            setTimeout(() => modal.remove(), 200);
        }
    },

    // Add lead form
    addlead_renderAddForm() {
        return `
            <form id="addlead_form" class="addlead-form">
                <div class="addlead-form-grid">
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Name *</label>
                        <input type="text" 
                               name="name" 
                               class="addlead-form-input" 
                               maxlength="35"
                               required
                               data-validate="name">
                        <div class="addlead-input-feedback" id="addlead_nameFeedback"></div>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Company</label>
                        <input type="text" 
                               name="company" 
                               class="addlead-form-input"
                               maxlength="50"
                               data-validate="company">
                        <div class="addlead-input-feedback" id="addlead_companyFeedback"></div>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Email</label>
                        <input type="email" 
                               name="email" 
                               class="addlead-form-input"
                               maxlength="50"
                               data-validate="email">
                        <div class="addlead-input-feedback" id="addlead_emailFeedback"></div>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Phone</label>
                        <input type="tel"
                               name="phone"
                               class="addlead-form-input addlead-phone-input"
                               placeholder="(555) 123-4567"
                               maxlength="14"
                               data-validate="phone">
                        <div class="addlead-input-feedback" id="addlead_phoneFeedback"></div>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Status</label>
                        <select name="status" class="addlead-form-select">
                            <option value="new">New Lead</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="negotiation">Negotiation</option>
                            <option value="closed">Closed Won</option>
                            <option value="lost">Lost</option>
                        </select>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Source</label>
                        <input type="text"
                               name="source"
                               class="addlead-source-input addlead-form-input"
                               placeholder="Click to select source..."
                               readonly>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Lead Type</label>
                        <select name="type" class="addlead-form-select">
                            <option value="cold">Cold Lead</option>
                            <option value="warm">Warm Lead</option>
                        </select>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Potential Value</label>
                        <div class="addlead-money-wrapper">
                            <span class="addlead-currency-symbol">$</span>
                            <input type="text" 
                                   name="potential_value" 
                                   class="addlead-form-input addlead-money-input" 
                                   placeholder="0"
                                   data-raw-value="0">
                        </div>
                    </div>

                    <div class="addlead-form-group addlead-full-width">
                        <label class="addlead-form-label">Lead Quality (1-10)</label>
                        <div class="addlead-quality-slider-container">
                            <input type="range" 
                                   name="quality_score" 
                                   class="addlead-quality-slider" 
                                   min="1" 
                                   max="10" 
                                   value="5" 
                                   id="addlead_qualitySlider">
                            <div class="addlead-quality-display">
                                <span class="addlead-quality-value" id="addlead_qualityValue">5</span>
                                <span class="addlead-quality-label" id="addlead_qualityLabel">Average</span>
                            </div>
                        </div>
                        <div class="addlead-quality-indicators">
                            <span class="addlead-quality-indicator">1-3: Low</span>
                            <span class="addlead-quality-indicator">4-6: Average</span>
                            <span class="addlead-quality-indicator">7-8: High</span>
                            <span class="addlead-quality-indicator">9-10: Premium</span>
                        </div>
                    </div>
                    
                    <div class="addlead-form-group addlead-full-width">
                        <label class="addlead-form-label">Notes</label>
                        <textarea name="notes" 
                                  class="addlead-form-textarea" 
                                  rows="3"
                                  maxlength="500"
                                  data-validate="notes"></textarea>
                        <div class="addlead-input-feedback" id="addlead_notesFeedback"></div>
                    </div>
                </div>
                
                <div class="addlead-form-actions">
                    <button type="button" class="addlead-btn-secondary" onclick="AddLeadModule.addlead_hideAddLeadModal()">
                        Cancel
                    </button>
                    <button type="submit" class="addlead-btn-primary" id="addlead_submitBtn">
                        <span class="addlead-btn-text">Add Lead</span>
                    </button>
                </div>
            </form>
        `;
    },

    // LEAD DETAIL VIEW - Shows full lead info with edit/delete options
    addlead_showLeadView(leadId) {
        if (this.addlead_state.isTransitioning) return;
        const lead = this.addlead_state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        this.addlead_state.currentViewLead = lead;

        const initials = this.addlead_getInitials(lead.name);
        const statusClass = this.addlead_getStatusClass(lead.status);
        const qualityLabel = this.addlead_getQualityLabel(lead.quality_score || 5);

        const safeName = API.escapeHtml(lead.name);
        const safeCompany = API.escapeHtml(lead.company || '');
        const safeEmail = API.escapeHtml(lead.email || '');
        const safePhone = API.escapeHtml(lead.phone || '');
        const safeJobTitle = API.escapeHtml(lead.job_title || '');
        const safeWebsite = API.escapeHtml(lead.website || '');
        const safeLinkedIn = API.escapeHtml(lead.linkedin_url || '');
        const sourceIcon = this.addlead_getSourceIcon(lead.source || null);
        const safeSource = API.escapeHtml(this.addlead_formatSource(lead.source || null));
        const safeNotes = API.escapeHtml(lead.notes || '');
        const typeIcon = lead.type === 'warm' ? 'flame' : 'snowflake';
        const typeLabel = lead.type === 'warm' ? 'Warm Lead' : 'Cold Lead';

        const leadView = document.createElement('div');
        leadView.className = 'addlead-lead-view-overlay';
        leadView.innerHTML = `
            <div class="addlead-lead-view" onclick="event.stopPropagation()">
                <button class="addlead-close-btn" onclick="AddLeadModule.addlead_closeLeadView()">×</button>

                <div class="addlead-lead-view-body">
                    <div class="addlead-lead-header-section">
                        <div class="addlead-lead-avatar-large">
                            <span class="addlead-avatar-text-large">${initials}</span>
                        </div>
                        <div class="addlead-lead-header-info">
                            <h2 class="addlead-main-lead-name">${safeName}</h2>
                            ${safeCompany ? `<div class="addlead-lead-company-text">${safeCompany}</div>` : ''}
                            ${safeJobTitle ? `<div class="addlead-lead-job-title">${safeJobTitle}</div>` : ''}
                            <div class="addlead-lead-status-display">
                                <span class="addlead-status-badge ${statusClass}">${this.addlead_formatStatus(lead.status)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="addlead-lead-details-grid">
                        ${safeEmail ? `
                            <div class="addlead-detail-item">
                                <div class="addlead-detail-label">Email:</div>
                                <div class="addlead-detail-value">
                                    <a href="mailto:${safeEmail}" class="addlead-contact-link"><i data-lucide="mail" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>${safeEmail}</a>
                                </div>
                            </div>
                        ` : ''}

                        ${safePhone ? `
                            <div class="addlead-detail-item">
                                <div class="addlead-detail-label">Phone:</div>
                                <div class="addlead-detail-value">
                                    <a href="tel:${safePhone}" class="addlead-contact-link"><i data-lucide="phone" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>${safePhone}</a>
                                </div>
                            </div>
                        ` : ''}

                        ${safeWebsite ? `
                            <div class="addlead-detail-item">
                                <div class="addlead-detail-label">Website:</div>
                                <div class="addlead-detail-value">
                                    <a href="${safeWebsite}" target="_blank" rel="noopener noreferrer" class="addlead-contact-link"><i data-lucide="globe" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>${safeWebsite}</a>
                                </div>
                            </div>
                        ` : ''}

                        ${safeLinkedIn ? `
                            <div class="addlead-detail-item">
                                <div class="addlead-detail-label">LinkedIn:</div>
                                <div class="addlead-detail-value">
                                    <a href="${safeLinkedIn}" target="_blank" rel="noopener noreferrer" class="addlead-contact-link"><i data-lucide="linkedin" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>View Profile</a>
                                </div>
                            </div>
                        ` : ''}

                        <div class="addlead-detail-item">
                            <div class="addlead-detail-label">Lead Type:</div>
                            <div class="addlead-detail-value"><i data-lucide="${typeIcon}" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 6px;"></i>${typeLabel}</div>
                        </div>

                        <div class="addlead-detail-item">
                            <div class="addlead-detail-label">Source:</div>
                            <div class="addlead-detail-value"><i data-lucide="${sourceIcon}" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 6px;"></i>${safeSource}</div>
                        </div>

                        <div class="addlead-detail-item">
                            <div class="addlead-detail-label">Potential Value:</div>
                            <div class="addlead-detail-value addlead-value-highlight">
                                ${lead.potential_value > 0 ? `$${lead.potential_value.toLocaleString()}` : '-'}
                            </div>
                        </div>

                        <div class="addlead-detail-item">
                            <div class="addlead-detail-label">Lead Quality:</div>
                            <div class="addlead-detail-value">
                                <span class="addlead-quality-badge">${lead.quality_score || 5}/10</span>
                                <span class="addlead-quality-text">(${qualityLabel})</span>
                            </div>
                        </div>

                        <div class="addlead-detail-item">
                            <div class="addlead-detail-label">Added:</div>
                            <div class="addlead-detail-value">${this.addlead_formatTimeAgo(lead.created_at)}</div>
                        </div>
                    </div>

                    ${safeNotes ? `
                        <div class="addlead-detail-item addlead-notes-section">
                            <div class="addlead-detail-label">Notes:</div>
                            <div class="addlead-detail-value addlead-notes-text">${safeNotes}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="addlead-lead-view-actions">
                    <button class="addlead-edit-lead-btn" id="leadViewEditBtn">
                        Edit Lead
                    </button>
                    <button class="addlead-delete-lead-btn" id="leadViewDeleteBtn">
                        Delete Lead
                    </button>
                </div>
            </div>
        `;

        leadView.onclick = () => this.addlead_closeLeadView();

        document.body.appendChild(leadView);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Attach handlers after insertion
        document.getElementById('leadViewEditBtn').onclick = () => {
            this.addlead_closeLeadView();
            this.addlead_editLead(lead.id);
        };

        document.getElementById('leadViewDeleteBtn').onclick = () => {
            this.addlead_closeLeadView();
            this.addlead_showDeleteConfirmation(lead.id);
        };
    },

    addlead_closeLeadView() {
        const leadView = document.querySelector('.addlead-lead-view-overlay');
        if (leadView) {
            leadView.remove();
            this.addlead_state.currentViewLead = null;
        }
    },

    // INSTANT EDIT LEAD MODAL - Dynamic creation
    addlead_editLead(leadId) {
        const lead = this.addlead_state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        this.addlead_state.currentEditLead = lead;
        
        // Remove any existing edit modals
        document.getElementById('addlead_editModal')?.remove();
        
        const modal = document.createElement('div');
        modal.className = 'addlead-modal-overlay addlead-show';
        modal.id = 'addlead_editModal';
        modal.innerHTML = `
            <div class="addlead-modal" onclick="event.stopPropagation()">
                <div class="addlead-modal-header">
                    <h2 class="addlead-modal-title">Edit Lead</h2>
                    <button class="addlead-modal-close" onclick="AddLeadModule.addlead_hideEditLeadModal()">×</button>
                </div>
                <div class="addlead-modal-body">
                    ${this.addlead_renderEditForm(lead)}
                </div>
            </div>
        `;
        
// Close on backdrop click - proper mousedown/mouseup pattern
let mouseDownTarget = null;

modal.addEventListener('mousedown', (e) => {
    mouseDownTarget = e.target;
});

modal.addEventListener('mouseup', (e) => {
    // Only close if both down and up were on the overlay (not modal content)
    if (mouseDownTarget === modal && e.target === modal) {
        this.addlead_hideEditLeadModal();
    }
    mouseDownTarget = null;
});
        
        document.body.appendChild(modal);
        
        // Setup form functionality
        setTimeout(() => {
            this.addlead_setupInputValidation();
            this.addlead_setupPhoneFormatting();
            this.addlead_setupMoneyFormatting();
            this.addlead_setupQualitySliders();
            this.addlead_setupSourceSelector();
            
            const editForm = document.getElementById('addlead_editForm');
            if (editForm) {
                editForm.onsubmit = (e) => this.addlead_handleEditSubmit(e);
            }
        }, 10);
    },

    addlead_hideEditLeadModal() {
        const modal = document.getElementById('addlead_editModal');
        if (modal) {
            modal.classList.remove('addlead-show');
            setTimeout(() => modal.remove(), 200);
        }
        this.addlead_state.currentEditLead = null;
    },

    // Edit form
    addlead_renderEditForm(lead) {
        const safeName = API.escapeHtml(lead.name || '');
        const safeCompany = API.escapeHtml(lead.company || '');
        const safeEmail = API.escapeHtml(lead.email || '');
        const safePhone = API.escapeHtml(lead.phone || '');
        const safeSource = API.escapeHtml(lead.source || '');
        const safeNotes = API.escapeHtml(lead.notes || '');
        const safeValue = lead.potential_value > 0 ? lead.potential_value.toLocaleString() : '';
        
        return `
            <form id="addlead_editForm" class="addlead-form">
                <div class="addlead-form-grid">
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Name *</label>
                        <input type="text" 
                               name="name" 
                               class="addlead-form-input" 
                               value="${safeName}"
                               maxlength="35"
                               required
                               data-validate="name">
                        <div class="addlead-input-feedback" id="addlead_edit_nameFeedback"></div>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Company</label>
                        <input type="text" 
                               name="company" 
                               class="addlead-form-input"
                               value="${safeCompany}"
                               maxlength="50"
                               data-validate="company">
                        <div class="addlead-input-feedback" id="addlead_edit_companyFeedback"></div>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Email</label>
                        <input type="email" 
                               name="email" 
                               class="addlead-form-input"
                               value="${safeEmail}"
                               maxlength="50"
                               data-validate="email">
                        <div class="addlead-input-feedback" id="addlead_edit_emailFeedback"></div>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Phone</label>
                        <input type="tel"
                               name="phone"
                               class="addlead-form-input addlead-phone-input"
                               value="${safePhone}"
                               placeholder="(555) 123-4567"
                               maxlength="14"
                               data-validate="phone">
                        <div class="addlead-input-feedback" id="addlead_edit_phoneFeedback"></div>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Status</label>
                        <select name="status" class="addlead-form-select">
                            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New Lead</option>
                            <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="qualified" ${lead.status === 'qualified' ? 'selected' : ''}>Qualified</option>
                            <option value="negotiation" ${lead.status === 'negotiation' ? 'selected' : ''}>Negotiation</option>
                            <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Closed Won</option>
                            <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>Lost</option>
                        </select>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Source</label>
                        <input type="text"
                               name="source"
                               class="addlead-source-input addlead-form-input"
                               value="${safeSource}"
                               placeholder="Click to select source..."
                               readonly>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Lead Type</label>
                        <select name="type" class="addlead-form-select">
                            <option value="cold" ${lead.type === 'cold' ? 'selected' : ''}>Cold Lead</option>
                            <option value="warm" ${lead.type === 'warm' ? 'selected' : ''}>Warm Lead</option>
                        </select>
                    </div>
                    
                    <div class="addlead-form-group">
                        <label class="addlead-form-label">Potential Value</label>
                        <div class="addlead-money-wrapper">
                            <span class="addlead-currency-symbol">$</span>
                            <input type="text" 
                                   name="potential_value" 
                                   class="addlead-form-input addlead-money-input" 
                                   value="${safeValue}"
                                   data-raw-value="${lead.potential_value || 0}"
                                   placeholder="0">
                        </div>
                    </div>

                    <div class="addlead-form-group addlead-full-width">
                        <label class="addlead-form-label">Lead Quality (1-10)</label>
                        <div class="addlead-quality-slider-container">
                            <input type="range" 
                                   name="quality_score" 
                                   class="addlead-quality-slider" 
                                   min="1" 
                                   max="10" 
                                   value="${lead.quality_score || 5}" 
                                   id="addlead_edit_qualitySlider">
                            <div class="addlead-quality-display">
                                <span class="addlead-quality-value" id="addlead_edit_qualityValue">${lead.quality_score || 5}</span>
                                <span class="addlead-quality-label" id="addlead_edit_qualityLabel">${this.addlead_getQualityLabel(lead.quality_score || 5)}</span>
                            </div>
                        </div>
                        <div class="addlead-quality-indicators">
                            <span class="addlead-quality-indicator">1-3: Low</span>
                            <span class="addlead-quality-indicator">4-6: Average</span>
                            <span class="addlead-quality-indicator">7-8: High</span>
                            <span class="addlead-quality-indicator">9-10: Premium</span>
                        </div>
                    </div>
                    
                    <div class="addlead-form-group addlead-full-width">
                        <label class="addlead-form-label">Notes</label>
                        <textarea name="notes" 
                                  class="addlead-form-textarea" 
                                  rows="3"
                                  maxlength="500"
                                  data-validate="notes">${safeNotes}</textarea>
                        <div class="addlead-input-feedback" id="addlead_edit_notesFeedback"></div>
                    </div>
                </div>
                
                <div class="addlead-form-actions">
                    <button type="button" class="addlead-btn-danger" onclick="AddLeadModule.addlead_showDeleteConfirmation('${lead.id}')">
                        Delete Lead
                    </button>
                    <div class="addlead-form-actions-right">
                        <button type="button" class="addlead-btn-secondary" onclick="AddLeadModule.addlead_hideEditLeadModal()">
                            Cancel
                        </button>
                        <button type="submit" class="addlead-btn-primary" id="addlead_editSubmitBtn">
                            <span class="addlead-btn-text">Update Lead</span>
                        </button>
                    </div>
                </div>
            </form>
        `;
    },

    // Event listeners setup
    addlead_setupEventListeners() {
        // Cleanup old listeners
        this.addlead_state.eventListeners.forEach(({ element, type, handler }) => {
            element?.removeEventListener(type, handler);
        });
        this.addlead_state.eventListeners = [];

        // Search input
        const searchInput = document.getElementById('addlead_searchInput');
        if (searchInput) {
            const searchHandler = this.addlead_debounce((e) => this.addlead_handleSearch(e), 300);
            searchInput.addEventListener('input', searchHandler);
            this.addlead_state.eventListeners.push({ element: searchInput, type: 'input', handler: searchHandler });
        }

        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.addlead_hideAllModals();
            }
        };
        document.addEventListener('keydown', escHandler);
        this.addlead_state.eventListeners.push({ element: document, type: 'keydown', handler: escHandler });
    },

    // INPUT VALIDATION WITH VISUAL FEEDBACK
    addlead_setupInputValidation() {
        const inputs = document.querySelectorAll('[data-validate]');
        
        inputs.forEach(input => {
            const validateType = input.getAttribute('data-validate');
            const isEdit = input.closest('#addlead_editForm');
            const feedbackId = isEdit ? `addlead_edit_${validateType}Feedback` : `addlead_${validateType}Feedback`;
            const feedback = document.getElementById(feedbackId);
            
            if (!feedback) return;

            input.addEventListener('input', () => {
                this.addlead_validateInput(input, feedback, validateType);
            });

            input.addEventListener('blur', () => {
                this.addlead_validateInput(input, feedback, validateType, true);
            });

            input.addEventListener('focus', () => {
                if (['name', 'company', 'notes'].includes(validateType)) {
                    feedback.style.display = 'block';
                }
            });
        });
    },

    addlead_validateInput(input, feedback, type, isBlur = false) {
        const value = input.value;
        const length = value.length;
        
        const limits = {
            name: 35,
            company: 50,
            notes: 500,
            email: 50
        };

        const limit = limits[type];
        
        // Character counter for text inputs
        if (['name', 'company', 'notes'].includes(type)) {
            if (length === 0 && !isBlur) {
                feedback.textContent = '';
                feedback.className = 'addlead-input-feedback';
                return;
            }

            const remaining = limit - length;
            const percentage = (length / limit) * 100;

            if (percentage < 80) {
                feedback.textContent = `${length}/${limit}`;
                feedback.className = 'addlead-input-feedback addlead-feedback-normal';
                input.classList.remove('addlead-input-warning', 'addlead-input-error');
            } else if (percentage < 95) {
                feedback.textContent = `${remaining} characters remaining`;
                feedback.className = 'addlead-input-feedback addlead-feedback-warning';
                input.classList.add('addlead-input-warning');
                input.classList.remove('addlead-input-error');
            } else if (length < limit) {
                feedback.textContent = `Only ${remaining} left!`;
                feedback.className = 'addlead-input-feedback addlead-feedback-warning';
                input.classList.add('addlead-input-warning');
                input.classList.remove('addlead-input-error');
            } else {
                feedback.textContent = `Maximum ${limit} characters reached`;
                feedback.className = 'addlead-input-feedback addlead-feedback-error';
                input.classList.remove('addlead-input-warning');
                input.classList.add('addlead-input-error');
            }
        }

        // Email validation with hard 50-character limit
        if (type === 'email') {
            const limit = 50;
            let length = value.length;
            
            if (length > limit) {
                const truncated = value.substring(0, limit);
                input.value = truncated;
                length = limit;
            }
            
            const percentage = (length / limit) * 100;
            
            if (length > 0) {
                if (percentage < 80) {
                    feedback.textContent = `${length}/${limit}`;
                    feedback.className = 'addlead-input-feedback addlead-feedback-normal';
                    input.classList.remove('addlead-input-warning', 'addlead-input-error');
                } else if (percentage < 95) {
                    const remaining = limit - length;
                    feedback.textContent = `${remaining} characters remaining`;
                    feedback.className = 'addlead-input-feedback addlead-feedback-warning';
                    input.classList.add('addlead-input-warning');
                    input.classList.remove('addlead-input-error');
                } else if (length < limit) {
                    const remaining = limit - length;
                    feedback.textContent = `Only ${remaining} left!`;
                    feedback.className = 'addlead-input-feedback addlead-feedback-warning';
                    input.classList.add('addlead-input-warning');
                    input.classList.remove('addlead-input-error');
                } else {
                    feedback.textContent = `Maximum ${limit} characters reached`;
                    feedback.className = 'addlead-input-feedback addlead-feedback-error';
                    input.classList.remove('addlead-input-warning');
                    input.classList.add('addlead-input-error');
                }
            }
            
            if (value && isBlur) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    feedback.textContent = 'Please enter a valid email address';
                    feedback.className = 'addlead-input-feedback addlead-feedback-error';
                    input.classList.add('addlead-input-error');
                }
            }
        }

        // Phone validation
        if (type === 'phone' && value && isBlur) {
            const digits = value.replace(/\D/g, '');
            if (digits.length > 0 && digits.length < 10) {
                feedback.textContent = 'Phone number must be 10 digits';
                feedback.className = 'addlead-input-feedback addlead-feedback-error';
                input.classList.add('addlead-input-error');
            } else {
                feedback.textContent = '';
                feedback.className = 'addlead-input-feedback';
                input.classList.remove('addlead-input-error');
            }
        }
    },

    // Phone formatting
    addlead_setupPhoneFormatting() {
        const phoneInputs = document.querySelectorAll('.addlead-phone-input');
        
        phoneInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                
                if (value.length > 10) {
                    value = value.slice(0, 10);
                }
                
                let formatted = '';
                if (value.length === 0) {
                    formatted = '';
                } else if (value.length <= 3) {
                    formatted = `(${value}`;
                } else if (value.length <= 6) {
                    formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                } else {
                    formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
                }
                
                e.target.value = formatted;
            });
        });
    },

    // Money formatting with decimals
    addlead_setupMoneyFormatting() {
        const moneyInputs = document.querySelectorAll('.addlead-money-input');
        
        moneyInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^0-9.]/g, '');
                
                // Handle multiple decimal points
                const decimalCount = (value.match(/\./g) || []).length;
                if (decimalCount > 1) {
                    const firstDecimalIndex = value.indexOf('.');
                    value = value.slice(0, firstDecimalIndex + 1) + value.slice(firstDecimalIndex + 1).replace(/\./g, '');
                }
                
                if (value === '' || value === '.') {
                    e.target.value = value === '.' ? '0.' : '';
                    e.target.setAttribute('data-raw-value', '0');
                    return;
                }
                
                // Split into whole and decimal parts
                let [wholePart, decimalPart] = value.split('.');
                
                // Limit to 8 digits before decimal (99,999,999)
                if (wholePart.length > 8) {
                    wholePart = wholePart.slice(0, 8);
                }
                
                // Limit to 2 decimal places
                if (decimalPart && decimalPart.length > 2) {
                    decimalPart = decimalPart.slice(0, 2);
                }
                
                // Format with commas
                let formatted = '';
                if (wholePart) {
                    const number = parseInt(wholePart, 10);
                    formatted = number.toLocaleString();
                }
                
                if (decimalPart !== undefined) {
                    formatted += '.' + decimalPart;
                }
                
                const rawValue = wholePart + (decimalPart !== undefined ? '.' + decimalPart : '');
                e.target.setAttribute('data-raw-value', rawValue);
                e.target.value = formatted;
            });
        });
    },

    // Quality slider
    addlead_setupQualitySliders() {
        const sliders = document.querySelectorAll('.addlead-quality-slider');
        
        sliders.forEach(slider => {
            const updateQuality = () => {
                const value = parseInt(slider.value);
                const isEdit = slider.id.includes('edit');
                const valueSpan = document.getElementById(isEdit ? 'addlead_edit_qualityValue' : 'addlead_qualityValue');
                const labelSpan = document.getElementById(isEdit ? 'addlead_edit_qualityLabel' : 'addlead_qualityLabel');
                
                if (valueSpan) valueSpan.textContent = value;
                if (labelSpan) labelSpan.textContent = this.addlead_getQualityLabel(value);
            };
            
            slider.addEventListener('input', updateQuality);
            slider.addEventListener('change', updateQuality);
            updateQuality();
        });
    },

    // Source selector popup
    addlead_setupSourceSelector() {
        const inputs = document.querySelectorAll('.addlead-source-input');
        
        inputs.forEach(input => {
            input.style.cursor = 'pointer';
            input.addEventListener('click', () => {
                this.addlead_showSourcePopup(input);
            });
        });
    },

    // INSTANT SOURCE POPUP
    addlead_showSourcePopup(targetInput) {
        const existingPopup = document.querySelector('.addlead-source-popup-overlay');
        if (existingPopup) existingPopup.remove();

        const popup = document.createElement('div');
        popup.className = 'addlead-source-popup-overlay';
        popup.innerHTML = `
            <div class="addlead-source-popup">
                <div class="addlead-source-popup-header">
                    <h3>Select Lead Source</h3>
                    <button class="addlead-popup-close">×</button>
                </div>
                
                <div class="addlead-source-popup-content">
                    <div class="addlead-source-grid">
                        ${this.addlead_getSourceOptions().map(source => `
                            <div class="addlead-source-option" data-value="${API.escapeHtml(source.value)}">
                                <i data-lucide="${source.icon}" class="addlead-source-icon" style="width: 20px; height: 20px;"></i>
                                <span class="addlead-source-name">${API.escapeHtml(source.label)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Add source popup styles if not already present
        if (!document.getElementById('addlead_sourcePopupStyles')) {
            this.addlead_addSourcePopupStyles();
        }
        
        // Handle source selection
        popup.querySelectorAll('.addlead-source-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                
                if (value === 'custom') {
                    popup.remove();
                    this.addlead_showCustomSourceInput(targetInput);
                } else {
                    targetInput.value = value;
                    popup.remove();
                }
            });
        });
        
        // Close button
        popup.querySelector('.addlead-popup-close').onclick = () => popup.remove();
        
        // Close on backdrop
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
    },

    addlead_getSourceOptions() {
        return [
            { icon: 'globe', label: 'Website', value: 'Website' },
            { icon: 'linkedin', label: 'LinkedIn', value: 'LinkedIn' },
            { icon: 'facebook', label: 'Facebook', value: 'Facebook' },
            { icon: 'instagram', label: 'Instagram', value: 'Instagram' },
            { icon: 'twitter', label: 'Twitter', value: 'Twitter' },
            { icon: 'users', label: 'Referral', value: 'Referral' },
            { icon: 'mail', label: 'Email', value: 'Email' },
            { icon: 'phone', label: 'Phone', value: 'Phone' },
            { icon: 'calendar', label: 'Event', value: 'Event' },
            { icon: 'megaphone', label: 'Advertisement', value: 'Advertisement' },
            { icon: 'target', label: 'Direct', value: 'Direct' },
            { icon: 'search', label: 'Google', value: 'Google' },
            { icon: 'leaf', label: 'Organic', value: 'Organic' },
            { icon: 'dollar-sign', label: 'Paid Ads', value: 'Paid Ads' },
            { icon: 'phone-call', label: 'Cold Call', value: 'Cold Call' },
            { icon: 'building', label: 'Trade Show', value: 'Trade Show' },
            { icon: 'monitor', label: 'Webinar', value: 'Webinar' },
            { icon: 'file-text', label: 'Content', value: 'Content' },
            { icon: 'handshake', label: 'Partnership', value: 'Partnership' },
            { icon: 'sparkles', label: 'Custom Source', value: 'custom' }
        ];
    },

    // INSTANT CUSTOM SOURCE INPUT
addlead_showCustomSourceInput(targetInput) {
    const existingPopup = document.querySelector('.addlead-custom-source-overlay');
    if (existingPopup) existingPopup.remove();

    const customPopup = document.createElement('div');
    customPopup.className = 'addlead-custom-source-overlay';
    customPopup.innerHTML = `
        <div class="addlead-custom-source-popup">
            <div class="addlead-custom-source-header">
                <h3>Custom Source</h3>
                <button class="addlead-popup-close">×</button>
            </div>
            
            <div class="addlead-custom-source-content">
                <label class="addlead-custom-label">Enter your custom lead source:</label>
                <input type="text" 
                       class="addlead-custom-source-input" 
                       placeholder="e.g., Podcast, Newsletter, YouTube..."
                       maxlength="20"
                       id="customSourceInput">
                <div class="addlead-input-feedback" id="customSourceFeedback"></div>
            </div>
            
            <div class="addlead-custom-source-actions">
                <button class="addlead-btn-secondary addlead-cancel-custom">
                    Cancel
                </button>
                <button class="addlead-btn-primary" id="addlead_saveCustomSource">
                    Save Source
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(customPopup);
    
    const input = document.getElementById('customSourceInput');
    const feedback = document.getElementById('customSourceFeedback');
    const saveBtn = document.getElementById('addlead_saveCustomSource');
    
    input.focus();
    
    // CHARACTER COUNTER WITH COLOR FEEDBACK (Pipeline-style)
    input.oninput = (e) => {
        const value = e.target.value;
        const length = value.length;
        const limit = 20;
        
        // Enable/disable submit button
        saveBtn.disabled = !value.trim();
        
        // Character counter with color feedback
        if (length === 0) {
            feedback.textContent = '';
            feedback.className = 'addlead-input-feedback';
            input.classList.remove('addlead-input-warning', 'addlead-input-error');
        } else if (length < 16) {
            // Normal - gray
            feedback.textContent = `${length}/${limit}`;
            feedback.className = 'addlead-input-feedback addlead-feedback-normal';
            input.classList.remove('addlead-input-warning', 'addlead-input-error');
        } else if (length < 20) {
            // Warning - orange
            const remaining = limit - length;
            feedback.textContent = `${remaining} characters remaining`;
            feedback.className = 'addlead-input-feedback addlead-feedback-warning';
            input.classList.add('addlead-input-warning');
            input.classList.remove('addlead-input-error');
        } else {
            // At limit - red
            feedback.textContent = `Maximum ${limit} characters reached`;
            feedback.className = 'addlead-input-feedback addlead-feedback-error';
            input.classList.remove('addlead-input-warning');
            input.classList.add('addlead-input-error');
        }
    };
    
    // Save on button click
    saveBtn.onclick = () => {
        const value = input.value.trim();
        if (value) {
            targetInput.value = value;
            customPopup.remove();
        }
    };
    
    // Cancel button
    customPopup.querySelector('.addlead-cancel-custom').onclick = () => customPopup.remove();
    
    // Close button
    customPopup.querySelector('.addlead-popup-close').onclick = () => customPopup.remove();
    
    // Save on Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = input.value.trim();
            if (value) {
                targetInput.value = value;
                customPopup.remove();
            }
        }
    });
    
    // Close on backdrop
    customPopup.addEventListener('click', (e) => {
        if (e.target === customPopup) {
            customPopup.remove();
        }
    });
},

    // Form submission
    async addlead_handleSubmit(e) {
        e.preventDefault();
        
        try {
            this.addlead_setLoadingState(true);
            
            const formData = new FormData(e.target);
            const leadData = {};
            
            for (let [key, value] of formData.entries()) {
                if (key === 'potential_value') {
                    const rawValue = e.target.querySelector('[name="potential_value"]').getAttribute('data-raw-value');
                    leadData[key] = parseFloat(rawValue) || 0;
                } else if (key === 'quality_score') {
                    leadData[key] = parseInt(value) || 5;
                } else if (key === 'email') {
                    leadData[key] = value.trim().toLowerCase() || null;
                } else if (key === 'phone') {
                    leadData[key] = value.trim() || null;
                } else {
                    leadData[key] = value.trim() || null;
                }
            }
            
            if (!leadData.name) {
                throw new Error('Name is required');
            }
            
            // Check for duplicates
            const duplicateCheck = await API.checkDuplicates(leadData);
            
            if (duplicateCheck.hasExactDuplicates) {
                this.addlead_setLoadingState(false);
                this.addlead_showDuplicateModal(duplicateCheck.exact[0]);
                return;
            }
            
            if (duplicateCheck.hasSimilarLeads) {
                this.addlead_setLoadingState(false);
                const shouldContinue = await this.addlead_showSimilarLeadsModal(duplicateCheck.similar);
                if (!shouldContinue) return;
                this.addlead_setLoadingState(true);
            }

            // Create lead
            const newLead = await API.createLead(leadData);
            
            this.addlead_state.leads.unshift(newLead);
            this.addlead_hideAddLeadModal();
            
            if (this.addlead_state.currentView === 'table') {
                this.addlead_updateTableContent();
            } else {
                this.addlead_render();
            }
            
            this.addlead_showNotification(`Lead "${API.escapeHtml(leadData.name)}" added successfully!`, 'success');
            
        } catch (error) {
            console.error('Failed to create lead:', error);

            if (error.message.includes('FREE_TIER_LIMIT:')) {
                const message = error.message.split(':')[1];
                this.addlead_showUpgradePrompt(message);
                return;
            }

            this.addlead_showNotification(API.handleAPIError(error, 'CreateLead'), 'error');
        } finally {
            this.addlead_setLoadingState(false);
        }
    },

    // INSTANT UPGRADE PROMPT
    addlead_showUpgradePrompt(message) {
        const modal = document.createElement('div');
        modal.className = 'addlead-upgrade-prompt-overlay';
        modal.innerHTML = `
            <div class="addlead-upgrade-prompt">
                <div class="addlead-upgrade-header">
                    <i data-lucide="rocket" class="addlead-upgrade-icon" style="width: 48px; height: 48px;"></i>
                    <h3>Upgrade to Pro</h3>
                </div>
                <div class="addlead-upgrade-content">
                    <p>${API.escapeHtml(message)}</p>
                    <ul class="addlead-upgrade-features">
                        <li>✅ 5,000 lead capacity</li>
                        <li>✅ Advanced analytics</li>
                        <li>✅ Email tracking</li>
                        <li>✅ Goal setting & more</li>
                    </ul>
                </div>
                <div class="addlead-upgrade-actions">
                    <button class="addlead-btn-secondary addlead-close-upgrade">
                        Maybe Later
                    </button>
                    <button class="addlead-btn-primary" onclick="window.location.href='/pages/pricing.html'">
                        View Pricing
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.addlead-close-upgrade').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    // Edit lead submit
    async addlead_handleEditSubmit(e) {
        e.preventDefault();
        
        try {
            this.addlead_setEditLoadingState(true);
            
            const formData = new FormData(e.target);
            const leadData = {};
            
            for (let [key, value] of formData.entries()) {
                if (key === 'potential_value') {
                    const rawValue = e.target.querySelector('[name="potential_value"]').getAttribute('data-raw-value');
                    leadData[key] = parseFloat(rawValue) || 0;
                } else if (key === 'quality_score') {
                    leadData[key] = parseInt(value) || 5;
                } else if (key === 'email') {
                    leadData[key] = value.trim().toLowerCase() || null;
                } else if (key === 'phone') {
                    leadData[key] = value.trim() || null;
                } else {
                    leadData[key] = value.trim() || null;
                }
            }
            
            await API.updateLead(this.addlead_state.currentEditLead.id, leadData);
            
            const leadIndex = this.addlead_state.leads.findIndex(l => l.id === this.addlead_state.currentEditLead.id);
            if (leadIndex !== -1) {
                this.addlead_state.leads[leadIndex] = { 
                    ...this.addlead_state.leads[leadIndex], 
                    ...leadData 
                };
            }
            
            this.addlead_hideEditLeadModal();
            
            if (this.addlead_state.currentView === 'table') {
                this.addlead_updateTableContent();
            } else {
                this.addlead_render();
            }
            
            if (window.PipelineModule?.pipeline_init) {
                // Reload pipeline if it's loaded
                const pipelineContainer = document.getElementById('pipeline-content');
                if (pipelineContainer && pipelineContainer.classList.contains('active')) {
                    window.PipelineModule.pipeline_init('pipeline-content');
                }
            }
            
            this.addlead_showNotification(`Lead "${API.escapeHtml(leadData.name)}" updated successfully!`, 'success');
            
        } catch (error) {
            console.error('Failed to update lead:', error);
            this.addlead_showNotification(API.handleAPIError(error, 'UpdateLead'), 'error');
        } finally {
            this.addlead_setEditLoadingState(false);
        }
    },

    // INSTANT DELETE CONFIRMATION
    addlead_showDeleteConfirmation(leadId) {
        const lead = this.addlead_state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        const safeName = API.escapeHtml(lead.name);

        const confirmModal = document.createElement('div');
        confirmModal.className = 'addlead-delete-confirm-overlay';
        confirmModal.innerHTML = `
            <div class="addlead-delete-confirm-modal">
                <div class="addlead-confirm-header">
                    <h3 class="addlead-confirm-title">Delete Lead</h3>
                </div>
                
                <div class="addlead-confirm-body">
                    <p class="addlead-confirm-message">
                        Are you sure you want to permanently delete <strong>${safeName}</strong>?
                    </p>
                    <p class="addlead-confirm-warning">
                        This action cannot be undone. All data associated with this lead will be lost.
                    </p>
                </div>
                
                <div class="addlead-confirm-actions">
                    <button class="addlead-btn-cancel-delete">
                        Cancel
                    </button>
                    <button class="addlead-btn-confirm-delete" data-lead-id="${leadId}">
                        Yes, Delete Lead
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmModal);
        
        confirmModal.querySelector('.addlead-btn-cancel-delete').onclick = () => confirmModal.remove();
        confirmModal.querySelector('.addlead-btn-confirm-delete').onclick = () => {
            this.addlead_confirmDeleteLead(leadId);
            confirmModal.remove();
        };
        confirmModal.addEventListener('click', (e)=> {
            if (e.target === confirmModal) confirmModal.remove();
        });
    },

    async addlead_confirmDeleteLead(leadId) {
        const lead = this.addlead_state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        try {
            await API.deleteLead(leadId);
            
            this.addlead_state.leads = this.addlead_state.leads.filter(l => l.id.toString() !== leadId.toString());
            
            this.addlead_hideEditLeadModal();
            
            if (this.addlead_state.currentView === 'table') {
                this.addlead_updateTableContent();
            } else {
                this.addlead_render();
            }
            
            if (window.PipelineModule?.pipeline_init) {
                const pipelineContainer = document.getElementById('pipeline-content');
                if (pipelineContainer && pipelineContainer.classList.contains('active')) {
                    window.PipelineModule.pipeline_init('pipeline-content');
                }
            }
            
            this.addlead_showNotification(`${API.escapeHtml(lead.name)} deleted successfully`, 'success');
            
        } catch (error) {
            console.error('Failed to delete lead:', error);
            this.addlead_showNotification(API.handleAPIError(error, 'DeleteLead'), 'error');
        }
    },

    // Quick actions
    async addlead_quickCall(leadId) {
        const lead = this.addlead_state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        if (lead.phone) {
            window.open(`tel:${lead.phone}`, '_self');
            this.addlead_showNotification(`Calling ${API.escapeHtml(lead.name)}...`, 'info');
        } else {
            this.addlead_showNotification(`No phone number for ${API.escapeHtml(lead.name)}`, 'warning');
        }
    },

    async addlead_quickEmail(leadId) {
        const lead = this.addlead_state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        if (lead.email) {
            const subject = encodeURIComponent(`Following up - ${lead.name}`);
            const body = encodeURIComponent(`Hi ${lead.name.split(' ')[0]},\n\nI wanted to follow up with you.\n\nBest regards,`);
            window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_self');
            this.addlead_showNotification(`Email to ${API.escapeHtml(lead.name)} opened`, 'info');
        } else {
            this.addlead_showNotification(`No email address for ${API.escapeHtml(lead.name)}`, 'warning');
        }
    },

    // INSTANT DUPLICATE MODAL
    addlead_showDuplicateModal(duplicateLead) {
        const safeName = API.escapeHtml(duplicateLead.lead.name);
        const safeEmail = API.escapeHtml(duplicateLead.lead.email || '');
        const safeCompany = API.escapeHtml(duplicateLead.lead.company || '');
        const safeReason = API.escapeHtml(duplicateLead.reason);
        const timeAgo = this.addlead_formatTimeAgo(duplicateLead.lead.created_at);
        const initials = this.addlead_getInitials(duplicateLead.lead.name);

        const modal = document.createElement('div');
        modal.className = 'addlead-duplicate-popup-overlay';
        modal.innerHTML = `
            <div class="addlead-duplicate-popup">
                <div class="addlead-duplicate-popup-header">
                    <h3>⚠️ Duplicate Lead Found</h3>
                    <button class="addlead-popup-close">×</button>
                </div>
                
                <div class="addlead-duplicate-popup-content">
                    <p class="addlead-duplicate-message">${safeReason}. Click the lead to edit it:</p>
                    
                    <div class="addlead-duplicate-lead-card addlead-clickable-lead">
                        <div class="addlead-lead-info-simple">
                            <h4>${safeName}</h4>
                            <div class="addlead-lead-details">
                                ${safeEmail ? `<p><i data-lucide="mail" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>${safeEmail}</p>` : ''}
                                ${safeCompany ? `<p><i data-lucide="building" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>${safeCompany}</p>` : ''}
                                <p class="addlead-added-time"><i data-lucide="calendar" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>Added ${timeAgo}</p>
                            </div>
                        </div>
                        <div class="addlead-lead-avatar-right">
                            <span>${initials}</span>
                        </div>
                    </div>
                </div>
                
                <div class="addlead-duplicate-popup-actions">
                    <button class="addlead-btn-secondary addlead-cancel-duplicate">
                        Cancel
                    </button>
                    <button class="addlead-btn-primary addlead-edit-duplicate" data-lead-id="${duplicateLead.lead.id}">
                        Edit Existing Lead
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.addlead-duplicate-lead-card').onclick = () => {
            this.addlead_editLead(duplicateLead.lead.id);
            modal.remove();
        };
        
        modal.querySelector('.addlead-edit-duplicate').onclick = () => {
            this.addlead_editLead(duplicateLead.lead.id);
            modal.remove();
        };
        
        modal.querySelector('.addlead-cancel-duplicate').onclick = () => modal.remove();
        modal.querySelector('.addlead-popup-close').onclick = () => modal.remove();
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    // INSTANT SIMILAR LEADS MODAL
    async addlead_showSimilarLeadsModal(similarLeads) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'addlead-similar-popup-overlay';
            
            const leadsHTML = similarLeads.slice(0, 3).map(similar => {
                const safeName = API.escapeHtml(similar.lead.name);
                const safeEmail = API.escapeHtml(similar.lead.email || '');
                const safeCompany = API.escapeHtml(similar.lead.company || '');
                const timeAgo = this.addlead_formatTimeAgo(similar.lead.created_at);
                const initials = this.addlead_getInitials(similar.lead.name);
                
                return `
                    <div class="addlead-similar-lead-card addlead-clickable-lead" data-lead-id="${similar.lead.id}">
                        <div class="addlead-lead-info-simple">
                            <h4>${safeName}</h4>
                            <div class="addlead-lead-details">
                                ${safeEmail ? `<p><i data-lucide="mail" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>${safeEmail}</p>` : ''}
                                ${safeCompany ? `<p><i data-lucide="building" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>${safeCompany}</p>` : ''}
                                <p class="addlead-added-time"><i data-lucide="calendar" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>Added ${timeAgo}</p>
                            </div>
                        </div>
                        <div class="addlead-similarity-section">
                            <div class="addlead-lead-avatar-right">
                                <span>${initials}</span>
                            </div>
                            <div class="addlead-confidence-badge">
                                ${Math.round(similar.confidence)}% match
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            modal.innerHTML = `
                <div class="addlead-similar-popup">
                    <div class="addlead-similar-popup-header">
                        <h3>Similar Leads Found</h3>
                        <button class="addlead-popup-close">×</button>
                    </div>
                    
                    <div class="addlead-similar-popup-content">
                        <p class="addlead-similar-message">Found ${similarLeads.length} similar lead${similarLeads.length > 1 ? 's' : ''} in your database:</p>
                        
                        <div class="addlead-similar-leads-list">
                            ${leadsHTML}
                        </div>
                        
                        <p class="addlead-similar-question">Do you want to continue adding this lead anyway?</p>
                    </div>
                    
                    <div class="addlead-similar-popup-actions">
                        <button class="addlead-btn-secondary addlead-cancel-similar">
                            Cancel
                        </button>
                        <button class="addlead-btn-primary addlead-continue-similar">
                            Add Anyway
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelectorAll('.addlead-similar-lead-card').forEach(card => {
                card.onclick = () => {
                    this.addlead_editLead(card.dataset.leadId);
                    modal.remove();
                    resolve(false);
                };
            });
            
            modal.querySelector('.addlead-continue-similar').onclick = () => {
                modal.remove();
                resolve(true);
            };
            
            modal.querySelector('.addlead-cancel-similar').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            modal.querySelector('.addlead-popup-close').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    },

    // Search handler
    addlead_handleSearch(e) {
        this.addlead_state.searchTerm = e.target.value.toLowerCase();
        this.addlead_updateTableContent();
    },

    // Filtered leads
    addlead_getFilteredLeads() {
        let filtered = [...this.addlead_state.leads];
        
        if (this.addlead_state.searchTerm) {
            filtered = filtered.filter(lead => {
                const searchText = `${lead.name} ${lead.company || ''} ${lead.email || ''} ${lead.phone || ''}`.toLowerCase();
                return searchText.includes(this.addlead_state.searchTerm);
            });
        }
        
        if (this.addlead_state.currentFilters.statuses.length > 0) {
            filtered = filtered.filter(lead => 
                this.addlead_state.currentFilters.statuses.includes(lead.status)
            );
        }
        
        if (this.addlead_state.currentFilters.sources.length > 0) {
            filtered = filtered.filter(lead => {
                const leadSource = lead.source || null;
                return this.addlead_state.currentFilters.sources.includes(leadSource);
            });
        }
        
        if (this.addlead_state.currentFilters.value) {
            if (this.addlead_state.currentFilters.value === 'has_value') {
                filtered = filtered.filter(lead => lead.potential_value > 0);
            } else if (this.addlead_state.currentFilters.value === 'no_value') {
                filtered = filtered.filter(lead => !lead.potential_value || lead.potential_value === 0);
            } else if (this.addlead_state.currentFilters.value === 'highest') {
                filtered.sort((a, b) => (b.potential_value || 0) - (a.potential_value || 0));
            } else if (this.addlead_state.currentFilters.value === 'lowest') {
                filtered.sort((a, b) => {
                    const aValue = a.potential_value || 0;
                    const bValue = b.potential_value || 0;
                    if (aValue === 0 && bValue === 0) return 0;
                    if (aValue === 0 && bValue > 0) return 1;
                    if (bValue === 0 && aValue > 0) return -1;
                    return aValue - bValue;
                });
            }
        }
        
        return filtered;
    },

    // Filter dropdowns
    addlead_showStatusFilter(event) {
        this.addlead_showMultiFilterDropdown('statuses', event, [
            { value: '', label: 'All Statuses', action: 'clear' },
            { value: '', label: '──────────', divider: true },
            { value: 'new', label: 'New' },
            { value: 'contacted', label: 'Contacted' },
            { value: 'qualified', label: 'Qualified' },
            { value: 'negotiation', label: 'Negotiation' },
            { value: 'closed', label: 'Closed' },
            { value: 'lost', label: 'Lost' }
        ]);
    },

    addlead_showSourceFilter(event) {
        this.addlead_showMultiFilterDropdown('sources', event, [
            { value: '', label: 'All Sources', action: 'clear' },
            { value: '', label: '──────────', divider: true },
            ...this.addlead_getSourceOptions().slice(0, -1).map(s => ({ value: s.value, label: s.label })),
            { value: null, label: 'Unknown' }
        ]);
    },

    addlead_showValueFilter(event) {
        this.addlead_showSingleFilterDropdown('value', event, [
            { value: '', label: 'All Values', action: 'clear' },
            { value: '', label: '──────────', divider: true },
            { value: 'highest', label: 'Highest First' },
            { value: 'lowest', label: 'Lowest First' },
            { value: 'has_value', label: 'Has Value Only' },
            { value: 'no_value', label: 'No Value Only' }
        ]);
    },

    addlead_showMultiFilterDropdown(column, event, options) {
        if (event) event.stopPropagation();
        this.addlead_hideAllFilterDropdowns();
        
        event.target.closest('.addlead-header-filter').classList.add('addlead-active');
        
        const dropdown = document.createElement('div');
        dropdown.className = 'addlead-filter-dropdown addlead-multi-select addlead-active';
        dropdown.innerHTML = `
            <div class="addlead-filter-options">
                ${options.map(option => {
                    if (option.divider) {
                        return '<div class="addlead-filter-divider"></div>';
                    } else if (option.action === 'clear') {
                        return `
                            <div class="addlead-filter-option addlead-clear-option" data-action="clear-${column}">
                                <span class="addlead-option-text">${API.escapeHtml(option.label)}</span>
                            </div>
                        `;
                    } else {
                        const isChecked = this.addlead_state.currentFilters[column].includes(option.value);
                        return `
                            <div class="addlead-filter-checkbox-option" data-column="${column}" data-value="${option.value === null ? 'null' : option.value}">
                                <div class="addlead-custom-checkbox ${isChecked ? 'addlead-checked' : ''}">
                                    ${isChecked ? '✓' : ''}
                                </div>
                                <span class="addlead-option-text">${API.escapeHtml(option.label)}</span>
                            </div>
                        `;
                    }
                }).join('')}
            </div>
        `;
        
        this.addlead_positionDropdown(dropdown, event.target);
        
        // Event delegation for clicks
        dropdown.addEventListener('click', (e) => {
            const clearOption = e.target.closest('[data-action^="clear-"]');
            if (clearOption) {
                this.addlead_clearMultiFilter(column);
                return;
            }
            
            const checkboxOption = e.target.closest('.addlead-filter-checkbox-option');
            if (checkboxOption) {
                const col = checkboxOption.dataset.column;
                let val = checkboxOption.dataset.value;
                if (val === 'null') val = null;
                this.addlead_toggleMultiFilter(col, val, checkboxOption);
            }
        });
    },

    addlead_showSingleFilterDropdown(column, event, options) {
        if (event) event.stopPropagation();
        this.addlead_hideAllFilterDropdowns();
        
        event.target.closest('.addlead-header-filter').classList.add('addlead-active');
        
        const dropdown = document.createElement('div');
        dropdown.className = 'addlead-filter-dropdown addlead-single-select addlead-active';
        dropdown.innerHTML = `
            <div class="addlead-filter-options">
                ${options.map(option => {
                    if (option.divider) {
                        return '<div class="addlead-filter-divider"></div>';
                    }
                    const isActive = this.addlead_state.currentFilters[column] === option.value && option.value !== '';
                    return `
                        <div class="addlead-filter-option ${isActive ? 'addlead-active' : ''}" data-value="${option.value}">
                            <span class="addlead-option-text">${API.escapeHtml(option.label)}</span>
                            ${isActive ? '<span class="addlead-active-check">✓</span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        this.addlead_positionDropdown(dropdown, event.target);
        
        dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.addlead-filter-option');
            if (option) {
                this.addlead_applySingleFilter(column, option.dataset.value);
            }
        });
    },

    addlead_toggleMultiFilter(column, value, optionElement) {
        const currentValues = this.addlead_state.currentFilters[column];
        const index = currentValues.indexOf(value);
        
        if (index > -1) {
            this.addlead_state.currentFilters[column] = currentValues.filter(v => v !== value);
        } else {
            this.addlead_state.currentFilters[column].push(value);
        }
        
        const checkbox = optionElement.querySelector('.addlead-custom-checkbox');
        const isChecked = this.addlead_state.currentFilters[column].includes(value);
        
        if (isChecked) {
            checkbox.classList.add('addlead-checked');
            checkbox.textContent = '✓';
        } else {
            checkbox.classList.remove('addlead-checked');
            checkbox.textContent = '';
        }
        
        this.addlead_updateTableContent();
        this.addlead_updateHeaderIndicators();
        this.addlead_updateActiveFiltersPanel();
    },

    addlead_clearMultiFilter(column) {
        this.addlead_state.currentFilters[column] = [];
        this.addlead_hideAllFilterDropdowns();
        this.addlead_updateTableContent();
        this.addlead_updateHeaderIndicators();
        this.addlead_updateActiveFiltersPanel();
    },

    addlead_applySingleFilter(column, value) {
        this.addlead_state.currentFilters[column] = value;
        this.addlead_hideAllFilterDropdowns();
        this.addlead_updateTableContent();
        this.addlead_updateHeaderIndicators();
        this.addlead_updateActiveFiltersPanel();
    },

    addlead_positionDropdown(dropdown, trigger) {
        const rect = trigger.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.zIndex = '10000';
        
        document.body.appendChild(dropdown);
        
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!e.target.closest('.addlead-filter-dropdown') && !e.target.closest('.addlead-header-filter')) {
                    this.addlead_hideAllFilterDropdowns();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    },

    addlead_hideAllFilterDropdowns() {
        document.querySelectorAll('.addlead-filter-dropdown').forEach(d => d.remove());
        document.querySelectorAll('.addlead-header-filter').forEach(filter => {
            filter.classList.remove('addlead-active');
        });
    },

    addlead_updateHeaderIndicators() {
        ['statuses', 'sources', 'value'].forEach(column => {
            let methodName = column === 'statuses' ? 'Status' : column === 'sources' ? 'Source' : 'Value';
            
            const arrow = document.querySelector(`[onclick*="addlead_show${methodName}Filter"] .addlead-filter-arrow`);
            if (arrow) {
                const hasFilters = Array.isArray(this.addlead_state.currentFilters[column]) ? 
                    this.addlead_state.currentFilters[column].length > 0 : 
                    this.addlead_state.currentFilters[column] !== '';
                    
                if (hasFilters) {
                    arrow.textContent = '▲';
                    arrow.style.color = 'var(--primary)';
                } else {
                    arrow.textContent = '▼';
                    arrow.style.color = 'var(--text-secondary)';
                }
            }
        });
    },

    addlead_clearAllFilters() {
        this.addlead_state.currentFilters = {
            statuses: [],
            sources: [],
            value: ''
        };
        this.addlead_state.searchTerm = '';
        
        const searchInput = document.getElementById('addlead_searchInput');
        if (searchInput) searchInput.value = '';
        
        this.addlead_updateTableContent();
        this.addlead_updateHeaderIndicators();
        this.addlead_updateActiveFiltersPanel();
    },

    addlead_hasActiveFilters() {
        return this.addlead_state.currentFilters.statuses.length > 0 || 
               this.addlead_state.currentFilters.sources.length > 0 || 
               this.addlead_state.currentFilters.value !== '' || 
               this.addlead_state.searchTerm !== '';
    },

    addlead_updateActiveFiltersPanel() {
        const existingPanel = document.querySelector('.addlead-active-filters-panel');
        const tableView = document.querySelector('.addlead-table-view');
        const hasFilters = this.addlead_hasActiveFilters();
        
        if (hasFilters && !existingPanel && tableView) {
            const panelHTML = this.addlead_renderActiveFiltersPanel();
            const tableContainer = tableView.querySelector('.addlead-table-container');
            if (tableContainer) {
                tableContainer.insertAdjacentHTML('beforebegin', panelHTML);
            }
        } else if (!hasFilters && existingPanel) {
            existingPanel.remove();
        } else if (hasFilters && existingPanel) {
            const countElement = existingPanel.querySelector('.addlead-filter-count');
            const filtersTextElement = existingPanel.querySelector('.addlead-active-filters-text');
            
            if (countElement) {
                const filtered = this.addlead_getFilteredLeads();
                countElement.textContent = `Showing ${filtered.length} of ${this.addlead_state.leads.length} leads`;
            }
            
            if (filtersTextElement) {
                const activeFilterTexts = [];
                
                if (this.addlead_state.currentFilters.statuses.length > 0) {
                    activeFilterTexts.push(`Status: ${this.addlead_state.currentFilters.statuses.length} selected`);
                }
                
                if (this.addlead_state.currentFilters.sources.length > 0) {
                    activeFilterTexts.push(`Sources: ${this.addlead_state.currentFilters.sources.length} selected`);
                }
                
                if (this.addlead_state.currentFilters.value) {
                    const valueLabels = {
                        'highest': 'Highest First',
                        'lowest': 'Lowest First',
                        'has_value': 'Has Value Only',
                        'no_value': 'No Value Only'
                    };
                    activeFilterTexts.push(`Value: ${valueLabels[this.addlead_state.currentFilters.value]}`);
                }
                
                filtersTextElement.textContent = activeFilterTexts.join(', ');
            }
        }
    },

    addlead_renderActiveFiltersPanel() {
        if (!this.addlead_hasActiveFilters()) return '';
        
        const filtered = this.addlead_getFilteredLeads();
        const activeFilterTexts = [];
        
        if (this.addlead_state.currentFilters.statuses.length > 0) {
            activeFilterTexts.push(`Status: ${this.addlead_state.currentFilters.statuses.length} selected`);
        }
        
        if (this.addlead_state.currentFilters.sources.length > 0) {
            activeFilterTexts.push(`Sources: ${this.addlead_state.currentFilters.sources.length} selected`);
        }
        
        if (this.addlead_state.currentFilters.value) {
            const valueLabels = {
                'highest': 'Highest First',
                'lowest': 'Lowest First',
                'has_value': 'Has Value Only',
                'no_value': 'No Value Only'
            };
            activeFilterTexts.push(`Value: ${valueLabels[this.addlead_state.currentFilters.value]}`);
        }
        
        return `
            <div class="addlead-active-filters-panel">
                <div class="addlead-filters-info">
                    <span class="addlead-filter-count">Showing ${filtered.length} of ${this.addlead_state.leads.length} leads</span>
                    <span class="addlead-active-filters-text">${API.escapeHtml(activeFilterTexts.join(', '))}</span>
                </div>
                <button class="addlead-clear-filters-btn" onclick="AddLeadModule.addlead_clearAllFilters()">
                    Clear All
                </button>
            </div>
        `;
    },

    addlead_updateTableContent() {
        const tableContainer = document.querySelector('.addlead-table-container');
        if (tableContainer) {
            const filteredLeads = this.addlead_getFilteredLeads();
            tableContainer.innerHTML = filteredLeads.length > 0 ?
                this.addlead_renderTable(filteredLeads) :
                this.addlead_renderEmptyState();

            const tableTitle = document.querySelector('.addlead-table-title');
            if (tableTitle) {
                tableTitle.textContent = `All Leads (${filteredLeads.length})`;
            }

            const searchInput = document.getElementById('addlead_searchInput');
            if (searchInput) {
                const searchHandler = this.addlead_debounce((e) => this.addlead_handleSearch(e), 300);
                searchInput.addEventListener('input', searchHandler);
            }

            this.addlead_updateActiveFiltersPanel();
            this.addlead_updateHeaderIndicators();

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    // View transitions WITH FADE
    addlead_showDashboard() {
        if (this.addlead_state.isTransitioning) return;
        this.addlead_state.isTransitioning = true;
        
        const container = document.getElementById(this.addlead_state.targetContainer);
        if (container) {
            container.style.opacity = '0';
            
            setTimeout(() => {
                this.addlead_state.currentView = 'dashboard';
                this.addlead_hideAllModals();
                this.addlead_render();
                
                setTimeout(() => {
                    container.style.opacity = '1';
                    this.addlead_state.isTransitioning = false;
                }, 50);
            }, 300);
        }
    },

    addlead_showTableView() {
        if (this.addlead_state.isTransitioning) return;
        this.addlead_state.isTransitioning = true;
        
        const container = document.getElementById(this.addlead_state.targetContainer);
        if (container) {
            container.style.opacity = '0';
            
            setTimeout(() => {
                this.addlead_state.currentView = 'table';
                this.addlead_hideAllModals();
                this.addlead_render();
                
                setTimeout(() => {
                    container.style.opacity = '1';
                    this.addlead_state.isTransitioning = false;
                }, 50);
            }, 300);
        }
    },

    // Modal controls
    addlead_hideAllModals() {
        document.getElementById('addlead_addModal')?.remove();
        document.getElementById('addlead_editModal')?.remove();
        document.querySelector('.addlead-lead-view-overlay')?.remove();
        document.querySelector('.addlead-delete-confirm-overlay')?.remove();
        document.querySelector('.addlead-duplicate-popup-overlay')?.remove();
        document.querySelector('.addlead-similar-popup-overlay')?.remove();
        document.querySelector('.addlead-source-popup-overlay')?.remove();
        document.querySelector('.addlead-custom-source-overlay')?.remove();
        document.querySelector('.addlead-upgrade-prompt-overlay')?.remove();
    },

    // Loading states
    addlead_setLoadingState(isLoading) {
        const submitBtn = document.getElementById('addlead_submitBtn');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            if (isLoading) {
                submitBtn.innerHTML = `
                    <div class="addlead-btn-loading-spinner"></div>
                    <span>Adding Lead...</span>
                `;
            } else {
                submitBtn.innerHTML = `<span class="addlead-btn-text">Add Lead</span>`;
            }
        }
    },

    addlead_setEditLoadingState(isLoading) {
        const submitBtn = document.getElementById('addlead_editSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            if (isLoading) {
                submitBtn.innerHTML = `
                    <div class="addlead-btn-loading-spinner"></div>
                    <span>Updating Lead...</span>
                `;
            } else {
                submitBtn.innerHTML = `<span class="addlead-btn-text">Update Lead</span>`;
            }
        }
    },

    addlead_renderError(message) {
        const container = document.getElementById(this.addlead_state.targetContainer);
        if (container) {
            const safeMessage = API.escapeHtml(message);
            container.innerHTML = `
                <div class="addlead-container">
                    <div class="addlead-error-container">
                        <i data-lucide="alert-triangle" class="addlead-error-icon" style="width: 64px; height: 64px;"></i>
                        <h2 class="addlead-error-title">Connection Error</h2>
                        <p class="addlead-error-message">${safeMessage}</p>
                        <button onclick="AddLeadModule.init()" class="addlead-retry-btn">
                            <i data-lucide="refresh-cw" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i><span>Try Again</span>
                        </button>
                    </div>
                </div>
            `;
        }
    },

    // Notifications
    addlead_showNotification(message, type = 'info') {
        if (window.SteadyUtils?.showToast) {
            window.SteadyUtils.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    },

    // Event handling
    handleEvent(eventType, data) {
        if (eventType === 'navigation') {
            if (data.targetPage !== 'leads') {
                this.addlead_state.currentView = 'dashboard';
                this.addlead_hideAllModals();
            } else {
                this.addlead_state.currentFilters = {
                    statuses: [],
                    sources: [],
                    value: ''
                };
                this.addlead_state.searchTerm = '';
            }
        }
    },

    // Utility functions
    addlead_formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    },

    addlead_getInitials(name) {
        if (!name) return '??';
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },

    addlead_getStatusClass(status) {
        const statusMap = {
            'new': 'addlead-status-new',
            'contacted': 'addlead-status-contacted',
            'qualified': 'addlead-status-qualified',
            'negotiation': 'addlead-status-negotiation',
            'closed': 'addlead-status-closed',
            'lost': 'addlead-status-lost'
        };
        return statusMap[status] || 'addlead-status-new';
    },

    addlead_formatStatus(status) {
        const statusMap = {
            'new': 'New',
            'contacted': 'Contacted',
            'qualified': 'Qualified',
            'negotiation': 'Negotiation',
            'closed': 'Closed',
            'lost': 'Lost'
        };
        return statusMap[status] || status;
    },

    addlead_getSourceIcon(source) {
        if (!source || source === null) return 'help-circle';

        const sourceIconMap = {
            'website': 'globe',
            'linkedin': 'linkedin',
            'facebook': 'facebook',
            'instagram': 'instagram',
            'twitter': 'twitter',
            'referral': 'users',
            'email': 'mail',
            'phone': 'phone',
            'event': 'calendar',
            'advertisement': 'megaphone',
            'direct': 'target',
            'google': 'search',
            'organic': 'leaf',
            'paid ads': 'dollar-sign',
            'cold call': 'phone-call',
            'trade show': 'building',
            'webinar': 'monitor',
            'content': 'file-text',
            'partnership': 'handshake'
        };

        const normalizedSource = source.toLowerCase().trim();
        return sourceIconMap[normalizedSource] || 'sparkles';
    },

    addlead_formatSource(source) {
        if (!source || source === null) return 'Unknown';
        return source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    addlead_getQualityLabel(score) {
        if (score <= 3) return 'Low';
        if (score <= 6) return 'Average';
        if (score <= 8) return 'High';
        return 'Premium';
    },

    addlead_debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    // Add source popup styles
    addlead_addSourcePopupStyles() {
        if (document.getElementById('addlead_sourcePopupStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'addlead_sourcePopupStyles';
        style.textContent = `
            .addlead-source-popup-overlay,
            .addlead-custom-source-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                padding: 1rem;
                animation: addlead-fadeIn 0.3s ease;
            }
            
            .addlead-source-popup,
            .addlead-custom-source-popup {
                background: var(--surface);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 100%;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                border: 1px solid var(--border);
                animation: addlead-scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            .addlead-source-popup-header,
            .addlead-custom-source-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                color: white;
            }
            
            .addlead-source-popup-header h3,
            .addlead-custom-source-header h3 {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 700;
            }
            
            .addlead-popup-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                width: 2rem;
                height: 2rem;
                border-radius: 50%;
                transition: background 0.3s;
            }
            
            .addlead-popup-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .addlead-source-popup-content {
                padding: 1.5rem;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .addlead-source-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 1rem;
            }
            
            .addlead-source-option {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: var(--surface-hover);
                border: 2px solid var(--border);
                border-radius: var(--radius);
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .addlead-source-option:hover {
                border-color: var(--primary);
                background: rgba(102, 126, 234, 0.1);
                transform: translateY(-2px);
            }
            
            .addlead-source-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
            }
            
            .addlead-source-name {
                font-weight: 600;
                color: var(--text-primary);
                font-size: 0.9rem;
            }
            
            .addlead-custom-source-content {
                padding: 1.5rem;
            }
            
            .addlead-custom-label {
                display: block;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 1rem;
            }
            
            .addlead-custom-source-input {
                width: 100%;
                padding: 1rem;
                border: 2px solid var(--border);
                border-radius: var(--radius);
                font-size: 1rem;
                background: var(--background);
                color: var(--text-primary);
                transition: all 0.3s ease;
            }
            
            .addlead-custom-source-input:focus {
                outline: none;
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .addlead-custom-source-actions {
                display: flex;
                gap: 1rem;
                padding: 1rem 1.5rem 1.5rem;
                background: var(--surface-hover);
            }
            
            @keyframes addlead-fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes addlead-scaleIn {
                from { opacity: 0; transform: scale(0.8) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            
            @media (max-width: 768px) {
                .addlead-source-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(style);
    },

    // Styles (KEEPING ALL EXISTING CSS)
    addlead_renderStyles() {
        return `
            <style>
                /* AddLead Module v3.0 - Sharp Edition Styles */
                
                .addlead-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                /* Action Bubbles */
                .addlead-action-bubbles {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .addlead-action-bubble {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                }

                .addlead-action-bubble:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl);
                    border-color: var(--primary);
                }

                .addlead-bubble-primary {
                    border-color: rgba(102, 126, 234, 0.3);
                    background: rgba(102, 126, 234, 0.02);
                }

                .addlead-bubble-secondary {
                    border-color: rgba(16, 185, 129, 0.3);
                    background: rgba(16, 185, 129, 0.02);
                }

                .addlead-bubble-icon {
                    font-size: 3rem;
                    width: 80px;
                    height: 80px;
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .addlead-bubble-content {
                    flex: 1;
                }

                .addlead-bubble-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }

                .addlead-bubble-subtitle {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                }

                .addlead-bubble-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    color: white;
                    padding: 0.875rem 1.75rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .addlead-bubble-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                }

                .addlead-arrow {
                    transition: transform 0.3s ease;
                }

                .addlead-action-bubble:hover .addlead-arrow {
                    transform: translateX(4px);
                }

                /* Recent Section */
                .addlead-recent-section {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    margin-bottom: 2rem;
                }

                .addlead-recent-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .addlead-recent-title {
                    font-size: 1.375rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .addlead-view-all-btn {
                    color: var(--primary);
                    font-weight: 600;
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius);
                    transition: all 0.3s ease;
                    background: none;
                    border: none;
                    cursor: pointer;
                }

                .addlead-view-all-btn:hover {
                    background: rgba(102, 126, 234, 0.1);
                    transform: translateX(4px);
                }

                .addlead-recent-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .addlead-recent-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .addlead-recent-item:hover {
                    background: var(--border);
                    transform: translateX(4px);
                }

                .addlead-recent-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: var(--radius);
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                .addlead-avatar-text {
                    font-size: 0.9rem;
                }

                .addlead-recent-info {
                    flex: 1;
                    min-width: 0;
                }

                .addlead-recent-name {
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.4rem;
                }

                .addlead-recent-meta {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .addlead-recent-company {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }

                .addlead-recent-time {
                    color: var(--text-tertiary);
                    font-size: 0.85rem;
                }

                .addlead-recent-status {
                    display: flex;
                    align-items: center;
                    flex-shrink: 0;
                }

                /* Table View */
                .addlead-table-view {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                }

                .addlead-table-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .addlead-table-header-left {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .addlead-back-btn {
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 500;
                }

                .addlead-back-btn:hover {
                    background: var(--border);
                    transform: translateX(-2px);
                }

                .addlead-table-title {
                    font-size: 1.375rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .addlead-table-header-right {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .addlead-search-box {
                    position: relative;
                }

                .addlead-search-input {
                    width: 300px;
                    padding: 0.75rem 1rem 0.75rem 2.5rem;
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    background: var(--background);
                    color: var(--text-primary);
                    transition: all 0.3s ease;
                }

                .addlead-search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .addlead-search-icon {
                    position: absolute;
                    left: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                    pointer-events: none;
                }

                .addlead-add-btn {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .addlead-add-btn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                /* Table Container with Horizontal Scroll */
                .addlead-table-container {
                    border-radius: var(--radius);
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .addlead-table-scroll-wrapper {
                    overflow-x: auto;
                    overflow-y: visible;
                }

                @media (min-width: 768px) {
                    .addlead-table-scroll-wrapper::-webkit-scrollbar {
                        height: 10px;
                    }

                    .addlead-table-scroll-wrapper::-webkit-scrollbar-track {
                        background: var(--surface-hover);
                        border-radius: 5px;
                    }

                    .addlead-table-scroll-wrapper::-webkit-scrollbar-thumb {
                        background: var(--border);
                        border-radius: 5px;
                        transition: background 0.3s ease;
                    }

                    .addlead-table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
                        background: var(--primary);
                    }
                }

                .addlead-leads-table {
                    width: 100%;
                    min-width: 800px;
                    border-collapse: collapse;
                    background: var(--surface);
                }

                .addlead-leads-table th {
                    background: var(--surface-hover);
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: var(--text-primary);
                    border-bottom: 1px solid var(--border);
                    font-size: 0.9rem;
                    white-space: nowrap;
                }

                .addlead-leads-table td {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border);
                    font-size: 0.9rem;
                }

                .addlead-table-row {
                    transition: background-color 0.3s ease;
                    cursor: pointer;
                }

                .addlead-table-row:hover {
                    background: var(--surface-hover);
                }

                .addlead-clickable-row {
                    cursor: pointer;
                }

                .addlead-clickable-item {
                    cursor: pointer;
                }

                .addlead-lead-cell {
                    min-width: 200px;
                }

                .addlead-lead-info {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .addlead-lead-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: var(--radius);
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 0.8rem;
                    flex-shrink: 0;
                }

                .addlead-lead-details {
                    flex: 1;
                }

                .addlead-lead-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .addlead-lead-company {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .addlead-contact-cell {
                    min-width: 180px;
                }

                .addlead-contact-item {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.25rem;
                }

                .addlead-status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .addlead-status-new { background: rgba(59, 130, 246, 0.1); color: var(--info); }
                .addlead-status-contacted { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
                .addlead-status-qualified { background: rgba(16, 185, 129, 0.1); color: var(--success); }
                .addlead-status-negotiation { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
                .addlead-status-closed { background: rgba(16, 185, 129, 0.1); color: var(--success); }
                .addlead-status-lost { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

                .addlead-source-badge {
                    background: var(--surface-hover);
                    color: var(--text-secondary);
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius);
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .addlead-value-amount {
                    color: var(--success);
                    font-weight: 600;
                }

                .addlead-no-value {
                    color: var(--text-tertiary);
                }

                .addlead-date-text {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                }

                /* Header Filters */
                .addlead-header-filter {
                    cursor: pointer;
                    border-radius: 6px;
                    user-select: none;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: background 0.3s ease;
                    padding: 0.25rem 0.5rem;
                }

                .addlead-header-filter:hover {
                    background: rgba(102, 126, 234, 0.1);
                }

                .addlead-header-filter.addlead-active {
                    color: var(--primary);
                }

                .addlead-filter-arrow {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    transition: all 0.3s ease;
                }

                .addlead-header-filter:hover .addlead-filter-arrow {
                    color: var(--primary);
                }

                .addlead-header-filter.addlead-active .addlead-filter-arrow {
                    color: var(--primary);
                }

                /* Filter Dropdown */
                .addlead-filter-dropdown {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    min-width: 180px;
                    max-height: 400px;
                    overflow-y: auto;
                    position: fixed;
                    z-index: 10000;
                }

                .addlead-filter-options {
                    padding: 0.5rem 0;
                }

                .addlead-filter-option {
                    padding: 0.75rem 1.5rem;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    transition: background 0.2s ease;
                }

                .addlead-filter-option:hover {
                    background: var(--surface-hover);
                    color: var(--primary);
                }

                .addlead-filter-option.addlead-clear-option {
                    color: var(--text-primary);
                    font-weight: 600;
                }

                .addlead-filter-checkbox-option {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-left: 3px solid transparent;
                }

                .addlead-filter-checkbox-option:hover {
                    background: var(--surface-hover);
                    border-left-color: var(--primary);
                }

                .addlead-custom-checkbox {
                    width: 18px;
                    height: 18px;
                    border: 2px solid var(--border);
                    border-radius: 4px;
                    background: var(--background);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    flex-shrink: 0;
                    color: white;
                }
                .addlead-custom-checkbox.addlead-checked {
                    background: var(--primary);
                    border-color: var(--primary);
                }

            .addlead-filter-divider {
                height: 1px;
                background: var(--border);
                margin: 0.5rem 1rem;
            }

            .addlead-option-text {
                flex: 1;
            }

            .addlead-active-check {
                color: var(--primary);
            }

            /* Active Filters Panel */
            .addlead-active-filters-panel {
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
                border: 1px solid rgba(102, 126, 234, 0.2);
                border-radius: 12px;
                padding: 1rem 1.5rem;
                margin-bottom: 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .addlead-filters-info {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .addlead-filter-count {
                font-weight: 700;
                color: var(--primary);
                font-size: 0.95rem;
            }

            .addlead-active-filters-text {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }

            .addlead-clear-filters-btn {
                background: var(--primary);
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 0.85rem;
                transition: all 0.3s ease;
            }

            .addlead-clear-filters-btn:hover {
                background: var(--primary-dark);
                transform: translateY(-1px);
            }

            /* Empty State */
            .addlead-empty-state {
                text-align: center;
                padding: 4rem 2rem;
                color: var(--text-secondary);
            }

            .addlead-empty-icon {
                font-size: 4rem;
                margin-bottom: 2rem;
                opacity: 0.6;
            }

            .addlead-empty-title {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom:1rem;
                color: var(--text-primary);
            }

            .addlead-empty-subtitle {
                font-size: 1.125rem;
                line-height: 1.6;
                margin-bottom: 2rem;
            }

            .addlead-empty-action-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.75rem;
                background: var(--primary);
                color: white;
                padding: 1rem 2rem;
                border-radius: var(--radius);
                font-weight: 600;
                border: none;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .addlead-empty-action-btn:hover {
                background: var(--primary-dark);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            /* Modals - INSTANT STYLE */
            .addlead-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .addlead-modal-overlay.addlead-show {
                opacity: 1;
            }

            .addlead-modal {
                background: var(--surface);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-xl);
                width: 100%;
                max-width: 600px;
                max-height: 90vh;
                overflow: hidden;
                border: 1px solid var(--border);
            }

            .addlead-modal-header {
                padding: 2rem 2rem 1rem;
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .addlead-modal-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
            }

            .addlead-modal-close {
                background: none;
                border: none;
                font-size: 28px;
                color: var(--text-secondary);
                cursor: pointer;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .addlead-modal-close:hover {
                background: var(--surface-hover);
                color: var(--text-primary);
            }

            .addlead-modal-body {
                padding: 2rem;
                overflow-y: auto;
                max-height: 60vh;
            }

            /* Forms */
            .addlead-form {
                display: flex;
                flex-direction: column;
                gap: 2rem;
            }

            .addlead-form-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1.5rem;
            }

            .addlead-form-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .addlead-form-group.addlead-full-width {
                grid-column: 1 / -1;
            }

            .addlead-form-label {
                font-weight: 500;
                color: var(--text-primary);
                font-size: 14px;
            }

            .addlead-form-input,
            .addlead-form-textarea {
                padding: 10px 12px;
                border: 1px solid var(--border);
                border-radius: 6px;
                font-size: 14px;
                background: var(--background);
                color: var(--text-primary);
                transition: all 0.2s ease;
                font-family: inherit;
            }

            .addlead-form-select {
                padding: 10px 40px 10px 12px;
                border: 1px solid var(--border);
                border-radius: 6px;
                font-size: 14px;
                background: var(--background);
                color: var(--text-primary);
                transition: all 0.2s ease;
                font-family: inherit;
                font-weight: 500;
                cursor: pointer;
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
                background-size: 16px;
            }

            .addlead-form-select:hover {
                border-color: var(--primary);
            }

            .addlead-form-select:focus {
                outline: none;
                border-color: var(--primary);
            }

            .addlead-form-input:focus,
            .addlead-form-textarea:focus {
                outline: none;
                border-color: var(--primary);
            }

            /* Input Validation States */
            .addlead-input-warning {
                border-color: var(--warning);
            }

            .addlead-input-error {
                border-color: var(--danger);
            }

            .addlead-input-feedback {
                font-size: 0.8rem;
                min-height: 1.2rem;
                transition: all 0.3s ease;
            }

            .addlead-feedback-normal {
                color: var(--text-secondary);
                font-weight: 500;
            }

            .addlead-feedback-warning {
                color: var(--warning);
                font-weight: 600;
            }

            .addlead-feedback-error {
                color: var(--danger);
                font-weight: 600;
            }

            /* Money Input */
            .addlead-money-wrapper {
                position: relative;
                display: flex;
                align-items: center;
            }

            .addlead-currency-symbol {
                position: absolute;
                left: 1rem;
                color: var(--text-secondary);
                font-weight: 600;
                z-index: 1;
                pointer-events: none;
                font-size: 0.95rem;
            }

            .addlead-money-input {
                padding-left: 2rem !important;
            }

            /* Quality Slider */
            .addlead-quality-slider-container {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 0.5rem;
            }

            .addlead-quality-slider {
                flex: 1;
                height: 8px;
                border-radius: 5px;
                background: #d1d5db;
                outline: none;
                -webkit-appearance: none;
            }

            .addlead-quality-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--primary);
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                transition: all 0.3s ease;
            }

            .addlead-quality-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }

            .addlead-quality-display {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 80px;
            }

            .addlead-quality-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--primary);
                line-height: 1;
            }

            .addlead-quality-label {
                font-size: 0.8rem;
                color: var(--text-secondary);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .addlead-quality-indicators {
                display: flex;
                justify-content: space-between;
                gap: 0.5rem;
            }

            .addlead-quality-indicator {
                font-size: 0.75rem;
                color: var(--text-tertiary);
                padding: 0.25rem 0.5rem;
                background: var(--surface-hover);
                border-radius: 4px;
                border: 1px solid var(--border);
            }

            /* Source Input */
            .addlead-source-input {
                cursor: pointer !important;
            }

            .addlead-source-input:hover {
                border-color: var(--primary);
            }

            /* Form Actions */
            .addlead-form-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 1rem;
                border-top: 1px solid var(--border);
            }

            .addlead-form-actions-right {
                display: flex;
                gap: 1rem;
            }

            .addlead-btn-primary,
            .addlead-btn-secondary,
            .addlead-btn-danger {
                padding: 0.875rem 2rem;
                border-radius: var(--radius);
                font-weight: 600;
                font-size: 0.95rem;
                cursor: pointer;
                transition: all 0.3s ease;
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }

            .addlead-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
            }

            .addlead-btn-primary:hover:not(:disabled) {
                background: linear-gradient(135deg, #5568d3 0%, #653a8e 100%);
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .addlead-btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .addlead-btn-secondary {
                background: transparent;
                color: var(--text-primary);
                border: 1px solid var(--border);
            }

            .addlead-btn-secondary:hover {
                background: var(--surface-hover);
            }

            .addlead-btn-danger {
                background: var(--danger);
                color: white;
            }

            .addlead-btn-danger:hover {
                background: #dc2626;
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
            }

            .addlead-btn-loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: addlead-spin 1s linear infinite;
            }

            @keyframes addlead-spin {
                to { transform: rotate(360deg); }
            }

            /* Delete Confirmation Modal */
            .addlead-delete-confirm-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                padding: 1rem;
            }

            .addlead-delete-confirm-modal {
                background: var(--surface);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 100%;
                max-width: 400px;
                border: 1px solid var(--border);
                overflow: hidden;
            }

            .addlead-confirm-header {
                padding: 1.5rem;
                background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);
                color: white;
            }

            .addlead-confirm-title {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 700;
            }
                .addlead-confirm-body {
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .addlead-confirm-message {
                font-size: 1rem;
                color: var(--text-primary);
                margin: 0;
                line-height: 1.5;
            }

            .addlead-confirm-warning {
                font-size: 0.85rem;
                color: var(--text-secondary);
                margin: 0;
                padding: 0.75rem 1rem;
                background: rgba(239, 68, 68, 0.1);
                border-radius: 8px;
                border-left: 3px solid var(--danger);
                line-height: 1.4;
            }

            .addlead-confirm-actions {
                display: flex;
                gap: 1rem;
                padding: 1rem 1.5rem 1.5rem;
                background: var(--surface-hover);
            }

            .addlead-btn-cancel-delete,
            .addlead-btn-confirm-delete {
                flex: 1;
                padding: 0.875rem 1.5rem;
                border-radius: 10px;
                font-weight: 600;
                font-size: 0.95rem;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
            }

            .addlead-btn-cancel-delete {
                background: var(--background);
                color: var(--text-secondary);
                border: 2px solid var(--border);
            }

            .addlead-btn-cancel-delete:hover {
                border-color: var(--text-secondary);
                color: var(--text-primary);
            }

            .addlead-btn-confirm-delete {
                background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);
                color: white;
            }

            .addlead-btn-confirm-delete:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
            }

            /* Lead Detail View Popup */
            .addlead-lead-view-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                padding: 2rem;
            }

            .addlead-lead-view {
                background: var(--surface);
                border-radius: 20px;
                position: relative;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 700px;
                max-height: 90vh;
                overflow: hidden;
                border: 1px solid var(--border);
            }

            .addlead-close-btn {
                background: transparent;
                border: 1px solid var(--border);
                color: var(--text-secondary);
                width: 24px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                position: absolute;
                top: 1rem;
                right: 1rem;
                z-index: 10;
                transition: all 0.2s ease;
            }

            .addlead-close-btn:hover {
                background: var(--surface-hover);
                color: var(--text-primary);
                border-color: var(--text-secondary);
            }

            .addlead-lead-view-body {
                padding: 1.5rem;
                overflow-y: auto;
                max-height: 70vh;
            }

            .addlead-lead-header-section {
                display: flex;
                align-items: center;
                gap: 1.5rem;
                margin-bottom: 1.5rem;
                padding-bottom: 1.5rem;
                padding-right: 40px;
                border-bottom: 1px solid var(--border);
            }

            .addlead-lead-avatar-large {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--primary) 0%, #5B7CE8 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
            }

            .addlead-avatar-text-large {
                color: white;
                font-weight: 700;
                font-size: 1.75rem;
                text-transform: uppercase;
            }

            .addlead-lead-header-info {
                flex: 1;
            }

            .addlead-main-lead-name {
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0 0 0.25rem 0;
                line-height: 1.2;
            }

            .addlead-lead-company-text {
                font-size: 1rem;
                color: var(--text-secondary);
                margin-bottom: 0.25rem;
            }

            .addlead-lead-job-title {
                font-size: 0.9rem;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
                font-style: italic;
            }

            .addlead-lead-status-display {
                margin-top: 0.5rem;
            }

            .addlead-lead-details-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1.25rem;
                margin-bottom: 1.5rem;
            }

            .addlead-detail-item {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .addlead-detail-label {
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .addlead-detail-value {
                font-size: 0.95rem;
                color: var(--text-primary);
                line-height: 1.4;
            }

            .addlead-contact-link {
                color: var(--primary);
                text-decoration: none;
                transition: all 0.2s ease;
            }

            .addlead-contact-link:hover {
                color: var(--primary-dark);
                text-decoration: underline;
            }

            .addlead-value-highlight {
                font-weight: 600;
                color: var(--success);
                font-size: 1.1rem;
            }

            .addlead-quality-badge {
                display: inline-block;
                padding: 0.25rem 0.6rem;
                background: var(--primary);
                color: white;
                border-radius: 6px;
                font-weight: 600;
                font-size: 0.85rem;
            }

            .addlead-quality-text {
                margin-left: 0.5rem;
                color: var(--text-secondary);
                font-size: 0.85rem;
            }

            .addlead-notes-section {
                grid-column: 1 / -1;
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border);
            }

            .addlead-notes-text {
                background: var(--background);
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid var(--border);
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
                max-width: 100%;
                overflow: hidden;
                line-height: 1.6;
            }

            .addlead-lead-view-actions {
                display: flex;
                gap: 1rem;
                padding: 1rem 1.5rem;
                background: var(--surface-hover);
                border-top: 1px solid var(--border);
            }

            .addlead-edit-lead-btn,
            .addlead-delete-lead-btn {
                flex: 1;
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 0.95rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .addlead-edit-lead-btn {
                background: var(--primary);
                color: white;
            }

            .addlead-edit-lead-btn:hover {
                background: var(--primary-dark);
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
                transform: translateY(-1px);
            }

            .addlead-delete-lead-btn {
                background: var(--danger);
                color: white;
            }

            .addlead-delete-lead-btn:hover {
                background: #dc2626;
                box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
                transform: translateY(-1px);
            }

            /* Duplicate/Similar Modals */
.addlead-duplicate-popup-overlay,
.addlead-similar-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    padding: 1rem;
}

.addlead-duplicate-popup,
.addlead-similar-popup {
    background: var(--surface);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 500px;
    max-height: 80vh;
    overflow: hidden;
    border: 1px solid var(--border);
}

.addlead-duplicate-popup-header {
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
    color: white;
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.addlead-duplicate-popup-header .addlead-popup-close,
.addlead-similar-popup-header .addlead-popup-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    flex-shrink: 0;
}

.addlead-popup-close:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

.addlead-similar-popup-header {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.addlead-duplicate-popup-content,
.addlead-similar-popup-content {
    padding: 1.5rem;
    max-height: 60vh;
    overflow-y: auto;
}

.addlead-duplicate-message,
.addlead-similar-message {
    margin: 0 0 1.5rem 0;
    color: var(--text-primary);
    font-weight: 600;
}

.addlead-duplicate-lead-card,
.addlead-similar-lead-card {
    padding: 1.25rem;
    background: var(--surface-hover);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    transition: all 0.3s ease;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.addlead-duplicate-lead-card:hover,
.addlead-similar-lead-card:hover {
    border-color: var(--primary);
    background: rgba(102, 126, 234, 0.1);
    transform: translateY(-2px);
}

.addlead-lead-info-simple {
    flex: 1;
}

.addlead-lead-info-simple h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
}

.addlead-lead-details p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.4;
}

.addlead-added-time {
    font-size: 0.8rem !important;
    color: var(--text-tertiary) !important;
}

.addlead-lead-avatar-right {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 1rem;
    flex-shrink: 0;
}

.addlead-similarity-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
}

.addlead-confidence-badge {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
}

.addlead-similar-leads-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.addlead-similar-question {
    margin: 0;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    padding: 1rem;
    background: var(--surface-hover);
    border-radius: var(--radius);
    border: 1px solid var(--border);
}

.addlead-duplicate-popup-actions,
.addlead-similar-popup-actions {
    display: flex;
    gap: 1rem;
    padding: 1rem 1.5rem 1.5rem;
    background: var(--surface-hover);
}

.addlead-cancel-duplicate,
.addlead-edit-duplicate,
.addlead-cancel-similar,
.addlead-continue-similar {
    flex: 1;
    padding: 0.875rem 1.5rem;
    border-radius: var(--radius);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
}

.addlead-cancel-duplicate,
.addlead-cancel-similar {
    background: var(--surface-hover);
    color: var(--text-primary);
    border: 1px solid var(--border);
}

.addlead-edit-duplicate,
.addlead-continue-similar {
    background: var(--primary);
    color: white;
}

.addlead-edit-duplicate:hover,
.addlead-continue-similar:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
}

            /* Upgrade Prompt */
            .addlead-upgrade-prompt-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10003;
                padding: 1rem;
            }

            .addlead-upgrade-prompt {
                background: var(--surface);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 100%;
                max-width: 450px;
                border: 1px solid var(--border);
                overflow: hidden;
            }

            .addlead-upgrade-header {
                background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                color: white;
                padding: 2rem;
                text-align: center;
            }

            .addlead-upgrade-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }

            .addlead-upgrade-header h3 {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 700;
            }

            .addlead-upgrade-content {
                padding: 2rem;
            }

            .addlead-upgrade-content p {
                margin: 0 0 1.5rem 0;
                color: var(--text-primary);
                line-height: 1.6;
            }

            .addlead-upgrade-features {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .addlead-upgrade-features li {
                padding: 0.5rem 0;
                color: var(--text-secondary);
                font-size: 0.95rem;
            }

            .addlead-upgrade-actions {
                display: flex;
                gap: 1rem;
                padding: 1rem 2rem 2rem;
            }

            .addlead-close-upgrade {
                flex: 1;
                padding: 0.875rem 1.5rem;
                border-radius: var(--radius);
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                background: var(--surface-hover);
                color: var(--text-primary);
                border: 1px solid var(--border);
            }

            /* Error Container */
            .addlead-error-container {
                text-align: center;
                padding: 4rem 2rem;
            }

            .addlead-error-icon {
                font-size: 4rem;
                margin-bottom: 2rem;
                opacity: 0.6;
            }

            .addlead-error-title {
                font-size: 1.75rem;
                font-weight: 700;
                margin-bottom: 1rem;
                color: var(--text-primary);
            }

            .addlead-error-message {
                margin-bottom: 2rem;
                font-size: 1.125rem;
                line-height: 1.6;
                color: var(--text-secondary);
            }

            .addlead-retry-btn {
                padding: 1rem 2rem;
                background: var(--primary);
                color: white;
                border: none;
                border-radius: var(--radius);
                cursor: pointer;
                font-weight: 600;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .addlead-retry-btn:hover {
                background: var(--primary-dark);
                transform: translateY(-2px);
            }

            /* Responsive */
            @media (max-width: 1024px) {
                .addlead-action-bubbles {
                    grid-template-columns: 1fr;
                }

                .addlead-table-header {
                    flex-direction: column;
                    gap: 1rem;
                    align-items: stretch;
                }

                .addlead-search-input {
                    width: 200px;
                }
            }

            @media (max-width: 768px) {
                .addlead-container {
                    padding: 1rem;
                }

                .addlead-action-bubble {
                    flex-direction: column;
                    text-align: center;
                    gap: 1rem;
                }

                .addlead-bubble-icon {
                    width: 60px;
                    height: 60px;
                    font-size: 2rem;
                }

                .addlead-form-grid {
                    grid-template-columns: 1fr;
                }

                .addlead-modal {
                    margin: 1rem;
                }

                .addlead-recent-item {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .addlead-search-input {
                    width: 100%;
                }

                .addlead-form-actions {
                    flex-direction: column;
                    gap: 1rem;
                }

                .addlead-form-actions-right {
                    flex-direction: column;
                }
            }

            @media (max-width: 480px) {
                .addlead-bubble-title {
                    font-size: 1.25rem;
                }

                .addlead-modal-body {
                    max-height: 50vh;
                }
            }
        </style>
    `;
}
};
// Initialize
if (typeof window !== 'undefined') {
window.AddLeadModule = AddLeadModule;
console.log('AddLead module loaded');
}