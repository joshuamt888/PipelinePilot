/**
 * 🎯 CLEAN ADD LEAD MODULE - PIPELINE STYLE
 * 
 * Simple, effective lead management without the complexity!
 * Matches Pipeline.js design and functionality perfectly.
 * 
 * Features:
 * ✅ Clean, simple initialization
 * ✅ Beautiful add lead form
 * ✅ Lead table view with search
 * ✅ Quick actions (edit, call, email, delete)
 * ✅ Mobile-responsive design
 * ✅ Smooth animations
 * ✅ No unnecessary complexity
 * 
 * @version 1.0.0 - Clean & Simple Edition
 */

window.AddLeadModule = {
    // 🎬 Core State
    leads: [],
    isLoading: false,
    searchTerm: '',
    currentView: 'dashboard', // 'dashboard' | 'table'
    currentEditLead: null,
    targetContainer: 'leads-content',
    version: '1.0.0',

    // 🚀 Simple Initialization (with Pipeline-style loading)
    async init(targetContainer = 'leads-content') {
        console.log('🎯 Clean AddLead Module v1.0 initializing...');
        
        try {
            this.targetContainer = targetContainer;
            this.isLoading = true;
            
            // 🔥 INSTANT SKELETON FEEDBACK (like Pipeline)
            this.renderLoadingState();
            
            // Simple sequential loading like Pipeline
            console.log('📊 Loading leads data...');
            await this.loadLeads();
            
            console.log('🎨 Rendering interface...');
            this.render();
            
            console.log('⚡ Setting up interactions...');
            this.setupEventListeners();
            
            console.log('✅ AddLead Module ready!');
            
        } catch (error) {
            console.error('❌ AddLead Module failed:', error);
            this.renderError(error.message);
        } finally {
            this.isLoading = false;
        }
    },

    // 📊 Load Leads (Simple like Pipeline)
    async loadLeads() {
        try {
            console.log('📊 Loading leads...');
            const leadData = await API.getLeads();
            
            // Handle different response formats
            if (leadData.all) {
                this.leads = leadData.all;
            } else if (Array.isArray(leadData)) {
                this.leads = leadData;
            } else if (leadData.leads) {
                this.leads = leadData.leads;
            } else {
                this.leads = [];
            }

            console.log(`📊 Loaded ${this.leads.length} leads`);
            
        } catch (error) {
            console.error('❌ Failed to load leads:', error);
            this.leads = [];
            throw error;
        }
    },

    // 🎨 Main Render Method
   render() {
    const container = document.getElementById(this.targetContainer);
    if (!container) return;

    container.innerHTML = `
            <div class="addlead-container fade-in">
                ${this.currentView === 'table' ? this.renderTableView() : this.renderDashboardView()}
                ${this.renderModals()}
                ${this.renderStyles()}
            </div>
        `;

        this.setupEventListeners();
    },

    // 🏠 Dashboard View (Simple Bubbles)
    renderDashboardView() {
        return `
            <div class="action-bubbles">
                <div class="action-bubble primary" onclick="AddLeadModule.showAddLeadModal()">
                    <div class="bubble-icon">➕</div>
                    <div class="bubble-content">
                        <h2 class="bubble-title">Add New Lead</h2>
                        <p class="bubble-subtitle">Create a new lead and start building relationships</p>
                        <button class="bubble-button">
                            <span>Add Lead</span>
                            <span class="arrow">→</span>
                        </button>
                    </div>
                </div>
                
                <div class="action-bubble secondary" onclick="AddLeadModule.showTableView()">
                    <div class="bubble-icon">📊</div>
                    <div class="bubble-content">
                        <h2 class="bubble-title">Manage Leads</h2>
                        <p class="bubble-subtitle">View, search, and manage your complete lead database</p>
                        <button class="bubble-button">
                            <span>View All Leads (${this.leads.length})</span>
                            <span class="arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
            
            ${this.leads.length > 0 ? this.renderRecentLeads() : ''}
        `;
    },

    // 📋 Recent Leads Section
    renderRecentLeads() {
        const recentLeads = this.leads
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        return `
            <div class="recent-section">
                <div class="recent-header">
                    <h3 class="recent-title">Recent Leads</h3>
                    <button class="view-all-btn" onclick="AddLeadModule.showTableView()">
                        View All →
                    </button>
                </div>
                <div class="recent-list">
                    ${recentLeads.map(lead => this.renderRecentItem(lead)).join('')}
                </div>
            </div>
        `;
    },

    // 📊 Table View
    renderTableView() {
        const filteredLeads = this.getFilteredLeads();
        
        return `
            <div class="table-view">
                <div class="table-header">
                    <div class="table-header-left">
                        <button class="back-btn" onclick="AddLeadModule.showDashboard()">
                            ← Back to Dashboard
                        </button>
                        <h2 class="table-title">All Leads (${filteredLeads.length})</h2>
                    </div>
                    <div class="table-header-right">
                        <div class="search-box">
                            <input type="text" 
                                   class="search-input" 
                                   placeholder="Search leads..." 
                                   value="${this.searchTerm}"
                                   id="leadSearch">
                            <span class="search-icon">🔍</span>
                        </div>
                        <button class="add-btn" onclick="AddLeadModule.showAddLeadModal()">
                            + Add Lead
                        </button>
                    </div>
                </div>
                
                <div class="table-container">
                    ${filteredLeads.length > 0 ? this.renderTable(filteredLeads) : this.renderEmptyState()}
                </div>
            </div>
        `;
    },

    // 📋 Render Table
    renderTable(leads) {
        return `
            <table class="leads-table">
                <thead>
                    <tr>
                        <th>Lead</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Source</th>
                        <th>Value</th>
                        <th>Added</th>
                    </tr>
                </thead>
                <tbody>
                    ${leads.map(lead => this.renderTableRow(lead)).join('')}
                </tbody>
            </table>
        `;
    },

    // 📋 Table Row
    renderTableRow(lead) {
        const timeAgo = this.formatTimeAgo(lead.created_at);
        const initials = this.getInitials(lead.name);
        const statusClass = this.getStatusClass(lead.status);
        
        return `
            <tr class="table-row clickable-row" onclick="AddLeadModule.editLead('${lead.id}')">
                <td class="lead-cell">
                    <div class="lead-info">
                        <div class="lead-avatar">
                            <span class="avatar-text">${initials}</span>
                        </div>
                        <div class="lead-details">
                            <div class="lead-name">${lead.name}</div>
                            <div class="lead-company">${lead.company || 'No company'}</div>
                        </div>
                    </div>
                </td>
                <td class="contact-cell">
                    ${lead.email ? `<div class="contact-item">📧 ${lead.email}</div>` : ''}
                    ${lead.phone ? `<div class="contact-item">📞 ${lead.phone}</div>` : ''}
                </td>
                <td class="status-cell">
                    <span class="status-badge ${statusClass}">${this.formatStatus(lead.status)}</span>
                </td>
                <td class="source-cell">
                    <span class="source-badge">${this.formatSource(lead.source)}</span>
                </td>
                <td class="value-cell">
                    ${lead.potential_value > 0 ? 
                        `<span class="value-amount">$${lead.potential_value.toLocaleString()}</span>` : 
                        '<span class="no-value">-</span>'
                    }
                </td>
                <td class="date-cell">
                    <span class="date-text">${timeAgo}</span>
                </td>
            </tr>
        `;
    },

    // 📋 Recent Item
    renderRecentItem(lead) {
        const timeAgo = this.formatTimeAgo(lead.created_at);
        const initials = this.getInitials(lead.name);
        const statusClass = this.getStatusClass(lead.status);
        
        return `
            <div class="recent-item clickable-item" onclick="AddLeadModule.editLead('${lead.id}')">
                <div class="recent-avatar">
                    <span class="avatar-text">${initials}</span>
                </div>
                <div class="recent-info">
                    <div class="recent-name">${lead.name}</div>
                    <div class="recent-meta">
                        <span class="recent-company">${lead.company || 'No company'}</span>
                        <span class="recent-time">${timeAgo}</span>
                    </div>
                    <div class="recent-contact">
                        ${lead.email ? `📧 ${lead.email}` : ''}
                        ${lead.phone ? `📞 ${lead.phone}` : ''}
                    </div>
                </div>
                <div class="recent-status">
                    <span class="status-badge ${statusClass}">${this.formatStatus(lead.status)}</span>
                </div>
                <div class="recent-actions">
                    <button class="action-btn" onclick="AddLeadModule.editLead('${lead.id}')" title="Edit">✏️</button>
                    <button class="action-btn" onclick="AddLeadModule.quickCall('${lead.id}')" title="Call">📞</button>
                    <button class="action-btn" onclick="AddLeadModule.quickEmail('${lead.id}')" title="Email">📧</button>
                </div>
            </div>
        `;
    },

    // 🚫 Empty State
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <div class="empty-title">No leads found</div>
                <div class="empty-subtitle">
                    ${this.searchTerm ? 
                        `No leads match "${this.searchTerm}". Try a different search term.` :
                        'Start building your sales pipeline by adding your first lead.'
                    }
                </div>
                ${!this.searchTerm ? `
                    <button class="empty-action-btn" onclick="AddLeadModule.showAddLeadModal()">
                        ➕ Add Your First Lead
                    </button>
                ` : ''}
            </div>
        `;
    },

    // 🎪 Modals
    renderModals() {
    return `
        <!-- Add Lead Modal -->
        <div class="modal-overlay" id="addLeadModal" onclick="AddLeadModule.hideAddLeadModal()">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Add New Lead</h2>
                    <button class="modal-close" onclick="AddLeadModule.hideAddLeadModal()">×</button>
                </div>
                <div class="modal-body">
                    ${this.renderAddLeadForm()}
                </div>
            </div>
        </div>

        <!-- Edit Lead Modal -->
        <div class="modal-overlay" id="editLeadModal" onclick="AddLeadModule.hideEditLeadModal()">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Edit Lead</h2>
                    <button class="modal-close" onclick="AddLeadModule.hideEditLeadModal()">×</button>
                </div>
                <div class="modal-body">
                    <div id="editFormContainer"></div>
                </div>
            </div>
        </div>
    `;
},

    // 📝 Add Lead Form
    renderAddLeadForm() {
        return `
            <form id="addLeadForm" class="lead-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Name *</label>
                        <input type="text" name="name" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Company</label>
                        <input type="text" name="company" class="form-input">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-input">
                    </div>
                    
                    <div class="form-group">
    <label class="form-label">Phone</label>
    <input type="tel"
       name="phone"
       class="form-input phone-input"
       pattern="^.{14}$|^$"
       title="Please complete the phone number format"
       placeholder="(555) 123-4567"
       maxlength="17">
</div>
                    
                    <div class="form-group">
    <label class="form-label">Status</label>
    <select name="status" class="form-select">
        <option value="new">🆕 New Lead</option>
        <option value="contacted">📞 Contacted</option>
        <option value="qualified">✅ Qualified</option>
        <option value="negotiation">🤝 Negotiation</option>
        <option value="closed">🎉 Closed Won</option>
        <option value="lost">❌ Lost</option>
    </select>
</div>
                    
                    <div class="form-group">
    <label class="form-label">Source</label>
    <input type="text"
           name="source"
           class="source-input form-input"
           placeholder="Click to select source...">
</div>
                    
                    <div class="form-group">
    <label class="form-label">Lead Type</label>
    <select name="type" class="form-select">
        <option value="cold">❄️ Cold Lead</option>
        <option value="warm">🔥 Warm Lead</option>
    </select>
</div>
                    
                    <div class="form-group">
    <label class="form-label">Potential Value</label>
    <div class="money-input-wrapper">
        <span class="currency-symbol">$</span>
        <input type="text" 
               name="potential_value" 
               class="form-input money-input" 
               placeholder="0"
               data-raw-value="0">
    </div>
</div>

                    <div class="form-group full-width">
    <label class="form-label">Lead Quality (1-10)</label>
    <div class="quality-slider-container">
        <input type="range" 
               name="quality_score" 
               class="quality-slider" 
               min="1" 
               max="10" 
               value="5" 
               id="qualitySlider">
        <div class="quality-display">
            <span class="quality-value" id="qualityValue">5</span>
            <span class="quality-label" id="qualityLabel">Average</span>
        </div>
    </div>
    <div class="quality-indicators">
        <span class="quality-indicator">1-3: Low</span>
        <span class="quality-indicator">4-6: Average</span>
        <span class="quality-indicator">7-8: High</span>
        <span class="quality-indicator">9-10: Premium</span>
    </div>
</div>
                    
                    <div class="form-group full-width">
                        <label class="form-label">Notes</label>
                        <textarea name="notes" class="form-textarea" rows="3"></textarea>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="AddLeadModule.hideAddLeadModal()">
                        Cancel
                    </button>
                    <button type="submit" class="btn-primary" id="submitBtn">
                        <span class="btn-text">Add Lead</span>
                        <span class="btn-loading hidden">Adding...</span>
                    </button>
                </div>
            </form>
        `;
    },

    // ⚡ Event Listeners Setup
    setupEventListeners() {
        // Form submission
        const addForm = document.getElementById('addLeadForm');
    if (addForm && !addForm.hasAttribute('data-listener-added')) {
        addForm.addEventListener('submit', (e) => this.handleSubmit(e));
        addForm.setAttribute('data-listener-added', 'true');
    }
        

        // Search input
        const searchInput = document.getElementById('leadSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.actions-dropdown')) {
                document.querySelectorAll('.actions-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    this.setupSimpleEmailValidation();
    this.setupSimplePhoneValidation();
    this.setupQualitySliders();
    this.setupSourceSelector();
    this.setupDynamicSelectBorders();
    this.setupMoneyInputFormatting();
},

setupMoneyInputFormatting() {
    const moneyInputs = document.querySelectorAll('input[name="potential_value"]:not([data-money-listener])');
    
    moneyInputs.forEach(input => {
        const formatMoney = (e) => {
            const cursorPos = e.target.selectionStart;
            let value = e.target.value;
            
            // Remove everything except digits and decimal point
            value = value.replace(/[^\d.]/g, '');
            
            // Handle multiple decimal points - keep only the first one
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
            
            // Limit whole part to 12 digits (like 999,999,999,999)
            if (wholePart.length > 12) {
                wholePart = wholePart.slice(0, 12);
            }
            
            // Limit decimal part to 2 places
            if (decimalPart && decimalPart.length > 2) {
                decimalPart = decimalPart.slice(0, 2);
            }
            
            // Format the whole part with commas
            let formatted = '';
            if (wholePart) {
                const number = parseInt(wholePart, 10);
                formatted = number.toLocaleString();
            }
            
            // Add decimal part if it exists
            if (decimalPart !== undefined) {
                formatted += '.' + decimalPart;
            }
            
            // Store raw value for form submission (without commas)
            const rawValue = wholePart + (decimalPart !== undefined ? '.' + decimalPart : '');
            e.target.setAttribute('data-raw-value', rawValue);
            
            // Calculate cursor position
            const oldLength = e.target.value.length;
            e.target.value = formatted;
            const newLength = formatted.length;
            const diff = newLength - oldLength;
            
            const newPos = Math.max(0, Math.min(cursorPos + diff, formatted.length));
            setTimeout(() => {
                e.target.setSelectionRange(newPos, newPos);
            }, 0);
        };
        
        input.addEventListener('input', formatMoney);
        input.setAttribute('data-money-listener', 'true');
    });
},

// 🔥 ADD THESE VALIDATION METHODS AFTER LINE 1139
validateNameInput(input) {
    let feedback = document.getElementById('edit-name-feedback');
    if (!feedback) {
        feedback = document.getElementById('name-feedback');
    }
    
    if (!feedback) return;
    
    const length = input.value.length;
    const maxLength = 35;
    const isFocused = document.activeElement === input;
    
    // Only show feedback when field is focused
    if (!isFocused) {
        feedback.textContent = '';
        feedback.style.display = 'none';
        return;
    }
    
    // Show feedback when focused
    if (length > maxLength - 5 && length < maxLength) {
        const remaining = maxLength - length;
        feedback.textContent = `${remaining} characters remaining`;
        feedback.style.color = '#f59e0b';
    } else if (length >= maxLength) {
        feedback.textContent = 'Name must be less than 35 characters';
        feedback.style.color = '#ef4444';
        feedback.style.fontWeight = '600';
    } else if (length === 0) {
        feedback.textContent = '';
        feedback.style.color = 'var(--text-secondary)';
    } else {
        feedback.textContent = `${length}/${maxLength}`;
        feedback.style.color = 'var(--text-secondary)';
    }
    
    feedback.style.display = 'block';
    feedback.style.visibility = 'visible';
    feedback.style.opacity = '1';
},

validateCompanyInput(input) {
    let feedback = document.getElementById('edit-company-feedback');
    if (!feedback) {
        feedback = document.getElementById('company-feedback');
    }
    
    if (!feedback) return;
    
    const length = input.value.length;
    const maxLength = 45;
    const isFocused = document.activeElement === input;
    
    // Only show feedback when field is focused
    if (!isFocused) {
        feedback.textContent = '';
        feedback.style.display = 'none';
        return;
    }
    
    // Show feedback when focused
    if (length > maxLength - 5 && length < maxLength) {
        const remaining = maxLength - length;
        feedback.textContent = `${remaining} characters remaining`;
        feedback.style.color = '#f59e0b';
    } else if (length >= maxLength) {
        feedback.textContent = 'Company must be less than 45 characters';
        feedback.style.color = '#ef4444';
        feedback.style.fontWeight = '600';
    } else if (length === 0) {
        feedback.textContent = '';
        feedback.style.color = 'var(--text-secondary)';
    } else {
        feedback.textContent = `${length}/${maxLength}`;
        feedback.style.color = 'var(--text-secondary)';
    }
    
    feedback.style.display = 'block';
    feedback.style.visibility = 'visible';
    feedback.style.opacity = '1';
},

validateNotesInput(textarea) {
    let feedback = document.getElementById('edit-notes-feedback');
    if (!feedback) {
        feedback = document.getElementById('notes-feedback');
    }
    
    if (!feedback) return;
    
    const length = textarea.value.length;
    const maxLength = 600;
    const isFocused = document.activeElement === textarea;
    
    // Only show feedback when field is focused
    if (!isFocused) {
        feedback.textContent = '';
        feedback.style.display = 'none';
        return;
    }
    
    // Show feedback when focused
    if (length > maxLength - 10 && length < maxLength) {
        const remaining = maxLength - length;
        feedback.textContent = `${remaining} characters remaining`;
        feedback.style.color = '#f59e0b';
    } else if (length >= maxLength) {
        feedback.textContent = 'Notes must be less than 600 characters';
        feedback.style.color = '#ef4444';
        feedback.style.fontWeight = '600';
    } else if (length === 0) {
        feedback.textContent = '';
        feedback.style.color = 'var(--text-secondary)';
    } else {
        feedback.textContent = `${length}/${maxLength}`;
        feedback.style.color = 'var(--text-secondary)';
    }
    
    feedback.style.display = 'block';
    feedback.style.visibility = 'visible';
    feedback.style.opacity = '1';
},

// 🎯 Simple Source Popup Selector
setupSourceSelector() {
    const inputs = document.querySelectorAll('.source-input:not([data-listener-added])');
    
    inputs.forEach(input => {
        input.addEventListener('click', () => {
            this.showSourcePopup(input);
        });
        
        input.style.cursor = 'pointer';
        input.setAttribute('data-listener-added', 'true');
    });
},

showSourcePopup(targetInput) {
    const popup = document.createElement('div');
    popup.className = 'source-popup-overlay';
    popup.innerHTML = `
        <div class="source-popup">
            <div class="source-popup-header">
                <h3>Select Lead Source</h3>
                <button class="popup-close" data-close-popup>×</button>
            </div>
            
            <div class="source-popup-content">
                <div class="source-grid">
                    <div class="source-option" data-value="🌐 Website">
                        <span class="source-icon">🌐</span>
                        <span class="source-name">Website</span>
                    </div>
                    <div class="source-option" data-value="💼 LinkedIn">
                        <span class="source-icon">💼</span>
                        <span class="source-name">LinkedIn</span>
                    </div>
                    <div class="source-option" data-value="📘 Facebook">
                        <span class="source-icon">📘</span>
                        <span class="source-name">Facebook</span>
                    </div>
                    <div class="source-option" data-value="📸 Instagram">
                        <span class="source-icon">📸</span>
                        <span class="source-name">Instagram</span>
                    </div>
                    <div class="source-option" data-value="🐦 Twitter">
                        <span class="source-icon">🐦</span>
                        <span class="source-name">Twitter</span>
                    </div>
                    <div class="source-option" data-value="👥 Referral">
                        <span class="source-icon">👥</span>
                        <span class="source-name">Referral</span>
                    </div>
                    <div class="source-option" data-value="📧 Email">
                        <span class="source-icon">📧</span>
                        <span class="source-name">Email</span>
                    </div>
                    <div class="source-option" data-value="📞 Phone">
                        <span class="source-icon">📞</span>
                        <span class="source-name">Phone</span>
                    </div>
                    <div class="source-option" data-value="🎪 Event">
                        <span class="source-icon">🎪</span>
                        <span class="source-name">Event</span>
                    </div>
                    <div class="source-option" data-value="📢 Advertisement">
                        <span class="source-icon">📢</span>
                        <span class="source-name">Advertisement</span>
                    </div>
                    <div class="source-option" data-value="🎯 Direct">
                        <span class="source-icon">🎯</span>
                        <span class="source-name">Direct</span>
                    </div>
                    <div class="source-option" data-value="🔍 Google">
                        <span class="source-icon">🔍</span>
                        <span class="source-name">Google</span>
                    </div>
                    <div class="source-option" data-value="🌱 Organic">
                        <span class="source-icon">🌱</span>
                        <span class="source-name">Organic</span>
                    </div>
                    <div class="source-option" data-value="💰 Paid Ads">
                        <span class="source-icon">💰</span>
                        <span class="source-name">Paid Ads</span>
                    </div>
                    <div class="source-option" data-value="❄️ Cold Call">
                        <span class="source-icon">❄️</span>
                        <span class="source-name">Cold Call</span>
                    </div>
                    <div class="source-option" data-value="🏢 Trade Show">
                        <span class="source-icon">🏢</span>
                        <span class="source-name">Trade Show</span>
                    </div>
                    <div class="source-option" data-value="💻 Webinar">
                        <span class="source-icon">💻</span>
                        <span class="source-name">Webinar</span>
                    </div>
                    <div class="source-option" data-value="📝 Content">
                        <span class="source-icon">📝</span>
                        <span class="source-name">Content</span>
                    </div>
                    <div class="source-option" data-value="🤝 Partnership">
                        <span class="source-icon">🤝</span>
                        <span class="source-name">Partnership</span>
                    </div>
                    <div class="source-option custom-source" data-value="custom">
                        <span class="source-icon">✨</span>
                        <span class="source-name">Custom Source</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Close button event listener
    popup.querySelector('[data-close-popup]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        popup.remove();
    });
    
    // 🔥 FIXED: Source option click handlers
    popup.querySelectorAll('.source-option').forEach(option => {
        option.addEventListener('click', () => {
            if (option.classList.contains('custom-source')) {
                popup.remove();
                this.showCustomSourceInput(targetInput);
            } else {
                const value = option.dataset.value;
                
                // Ensure targetInput is valid and set value
                if (targetInput && targetInput.tagName) {
                    targetInput.value = value;
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                popup.remove();
            }
        });
    });
    
    // Close on backdrop click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });
    
    // Add the popup styles
    this.addSourcePopupStyles();
},

// ✨ Show Custom Source Input
showCustomSourceInput(targetInput) {
    // Remove existing popup
    document.querySelector('.source-popup-overlay')?.remove();
    
    const customPopup = document.createElement('div');
    customPopup.className = 'custom-source-overlay';
    customPopup.innerHTML = `
        <div class="custom-source-popup">
            <div class="custom-source-header">
                <h3>Custom Source</h3>
                <button class="popup-close" data-close-custom>×</button>
            </div>
            
            <div class="custom-source-content">
                <label class="custom-label">Enter your custom lead source:</label>
                <input type="text" 
                       class="custom-source-input" 
                       placeholder="e.g., Podcast, Newsletter, YouTube..."
                       maxlength="50">
                <div class="custom-source-examples">
                    <p class="examples-title">Popular custom sources:</p>
                    <div class="example-tags">
                        <span class="example-tag" onclick="document.querySelector('.custom-source-input').value='🐦 Twitter'">🐦 Twitter</span>
                        <span class="example-tag" onclick="document.querySelector('.custom-source-input').value='📸 Instagram'">📸 Instagram</span>
                        <span class="example-tag" onclick="document.querySelector('.custom-source-input').value='📘 Facebook'">📘 Facebook</span>
                        <span class="example-tag" onclick="document.querySelector('.custom-source-input').value='🌐 Website'">🌐 Website</span>
                    </div>
                </div>
            </div>
            
            <div class="custom-source-actions">
                <button class="btn-cancel" onclick="this.closest('.custom-source-overlay').remove()">
                    Cancel
                </button>
                <button class="btn-save" onclick="AddLeadModule.saveCustomSource('${targetInput.id || 'source-input'}')">
                    Save Source
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(customPopup);
    // Add backdrop click to close (ADD THIS)
customPopup.addEventListener('click', (e) => {
    if (e.target === customPopup || e.target.classList.contains('custom-source-overlay')) {
        customPopup.remove();
    }
});
    // Close button event listener  
customPopup.querySelector('[data-close-custom]').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    customPopup.remove();
});
    
    // Focus input and select text
    setTimeout(() => {
        const input = customPopup.querySelector('.custom-source-input');
        input.focus();
        
        // Save on Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveCustomSource(targetInput);
            }
        });
    }, 100);
},

// 💾 Save Custom Source
saveCustomSource(targetInput) {
    const customInput = document.querySelector('.custom-source-input');
    const value = customInput.value.trim();
    
    if (value) {
        // 🔥 FIX: Better input targeting
        let actualInput;
        
        if (typeof targetInput === 'string') {
            actualInput = document.querySelector(`input[name="source"]`);
        } else if (targetInput && targetInput.tagName) {
            actualInput = targetInput;
        } else {
            // Fallback: find any source input in the current form
            actualInput = document.querySelector('.modal.show input[name="source"]') || 
                         document.querySelector('input[name="source"]');
        }
        
        if (actualInput) {
            actualInput.value = value;
            
            // 🔥 IMPORTANT: Trigger proper events
            actualInput.dispatchEvent(new Event('input', { bubbles: true }));
            actualInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        document.querySelector('.custom-source-overlay')?.remove();
    } else {
        customInput.style.borderColor = '#ef4444';
        customInput.placeholder = 'Please enter a source name';
    }
},

// 🎨 Add Popup Styles
addSourcePopupStyles() {
    if (document.getElementById('source-popup-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'source-popup-styles';
    style.textContent = `
        /* 🎯 Source Selector Styles */
        .source-selector {
            position: relative;
            display: flex;
            gap: 0.5rem;
        }
        
        .source-display {
            flex: 1;
            cursor: pointer;
        }
        
        .source-open-btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.5rem;
            border-radius: var(--radius);
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
        }
        
        .source-open-btn:hover {
            background: var(--primary-dark);
            transform: scale(1.05);
        }
        
        /* 🎪 Source Popup Styles */
        .source-popup-overlay, .custom-source-overlay {
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
            animation: fadeIn 0.3s ease;
        }
        
        .source-popup, .custom-source-popup {
            background: var(--surface);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            border: 1px solid var(--border);
            animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .source-popup-header, .custom-source-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
            color: white;
        }
        
        .source-popup-header h3, .custom-source-header h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
        }
        
        .popup-close {
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
        
        .popup-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .source-popup-content {
            padding: 1.5rem;
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .source-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
        }
        
        .source-option {
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
        
        .source-option:hover {
            border-color: var(--primary);
            background: rgba(102, 126, 234, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        
        .source-option.custom-source {
            border-color: rgba(139, 92, 246, 0.5);
            background: rgba(139, 92, 246, 0.1);
        }
        
        .source-option.custom-source:hover {
            border-color: #8B5CF6;
            background: rgba(139, 92, 246, 0.2);
        }
        
        .source-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
        }
        
        .source-name {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.9rem;
        }
        
        /* ✨ Custom Source Input Styles */
        .custom-source-content {
            padding: 1.5rem;
        }
        
        .custom-label {
            display: block;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 1rem;
        }
        
        .custom-source-input {
            width: 100%;
            padding: 1rem;
            border: 2px solid var(--border);
            border-radius: var(--radius);
            font-size: 1rem;
            background: var(--background);
            color: var(--text-primary);
            transition: all 0.3s ease;
            margin-bottom: 1.5rem;
        }
        
        .custom-source-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .custom-source-examples {
            background: var(--surface-hover);
            padding: 1rem;
            border-radius: var(--radius);
            border: 1px solid var(--border);
        }
        
        .examples-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-secondary);
            margin: 0 0 0.75rem 0;
        }
        
        .example-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .example-tag {
            background: var(--primary);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .example-tag:hover {
            background: var(--primary-dark);
            transform: scale(1.05);
        }
        
        .custom-source-actions {
            display: flex;
            gap: 1rem;
            padding: 1rem 1.5rem 1.5rem;
            background: var(--surface-hover);
        }
        
        .btn-cancel, .btn-save {
            flex: 1;
            padding: 0.875rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
        }
        
        .btn-cancel {
            background: var(--background);
            color: var(--text-secondary);
            border: 2px solid var(--border);
        }
        
        .btn-cancel:hover {
            border-color: var(--text-secondary);
            color: var(--text-primary);
        }
        
        .btn-save {
            background: var(--primary);
            color: white;
        }
        
        .btn-save:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
        }
        
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.8) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        /* 📱 Mobile Responsive */
        @media (max-width: 768px) {
            .source-grid {
                grid-template-columns: 1fr;
            }
            
            .source-popup, .custom-source-popup {
                margin: 1rem;
                max-height: 90vh;
            }
            
            .custom-source-actions {
                flex-direction: column;
            }
        }
    `;
    
    document.head.appendChild(style);
},

setupSimpleEmailValidation() {
    const emailInputs = document.querySelectorAll('input[name="email"]:not([data-email-validated])');
    
    emailInputs.forEach(input => {
        const container = input.parentElement;
        
        // Create simple error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'email-error';
        errorMsg.style.display = 'none';
        errorMsg.textContent = '📧 Please enter a valid email address';
        container.appendChild(errorMsg);
        
        // Simple email check
        const isValidEmail = (email) => {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        };
        
        // Show/hide error on blur (when they finish typing)
        input.addEventListener('blur', () => {
            const email = input.value.trim();
            
            if (email && !isValidEmail(email)) {
                errorMsg.style.display = 'block';
                input.style.borderColor = '#ef4444';
            } else {
                errorMsg.style.display = 'none';
                input.style.borderColor = '';
            }
        });
        
        // Hide error when they start typing again
        input.addEventListener('input', () => {
            errorMsg.style.display = 'none';
            input.style.borderColor = '';
        });
        
        input.setAttribute('data-email-validated', 'true');
    });
},


setupSimplePhoneValidation() {
    const phoneInputs = document.querySelectorAll('input[name="phone"]:not([data-phone-validated])');
    
    phoneInputs.forEach(input => {
        const container = input.parentElement;
        
        const errorMsg = document.createElement('div');
        errorMsg.className = 'phone-error';
        errorMsg.style.display = 'none';
        errorMsg.textContent = '📞 Please enter a valid phone number';
        container.appendChild(errorMsg);
        
        const isValidPhone = (phone) => {
            if (!phone) return true;
            const digits = phone.replace(/\D/g, '');
            return digits.length >= 10;
        };
        
        // 🔥 FIXED: Better formatting without cursor jumping
        input.addEventListener('input', (e) => {
            const cursorPos = e.target.selectionStart;
            const oldValue = e.target.getAttribute('data-old-value') || '';
            const oldDigits = oldValue.replace(/\D/g, '');
            
            // Get current digits
            let digits = e.target.value.replace(/\D/g, '');
            
            // Limit to 10 digits
            if (digits.length > 10) {
                digits = digits.slice(0, 10);
            }
            
            // Format the number
            let formatted = '';
            if (digits.length === 0) {
                formatted = '';
            } else if (digits.length <= 3) {
                formatted = `(${digits}`;
            } else if (digits.length <= 6) {
                formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
            } else {
                formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
            }
            
            // 🔥 FIX: Calculate new cursor position properly
            let newCursorPos = cursorPos;
            
            // If we're adding digits (typing forward), move cursor to end of digits
            if (digits.length > oldDigits.length) {
                // Count how many digits are before the cursor
                const beforeCursor = e.target.value.slice(0, cursorPos).replace(/\D/g, '');
                const newDigitsBeforeCursor = beforeCursor.length;
                
                // Find where that many digits would be in the formatted string
                let digitCount = 0;
                for (let i = 0; i < formatted.length; i++) {
                    if (/\d/.test(formatted[i])) {
                        digitCount++;
                        if (digitCount === newDigitsBeforeCursor) {
                            newCursorPos = i + 1;
                            break;
                        }
                    }
                }
            }
            
            // Update the value
            e.target.value = formatted;
            e.target.setAttribute('data-old-value', formatted);
            
            // Set cursor position
            setTimeout(() => {
                e.target.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
            
            // Hide error on input
            errorMsg.style.display = 'none';
            input.style.borderColor = '';
        });
        
        // Store initial value
        input.setAttribute('data-old-value', input.value);
        
        // Better backspace handling
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                const cursorPos = e.target.selectionStart;
                const value = e.target.value;
                
                // If cursor is right after a formatting character, move past it
                if (cursorPos > 0) {
                    const prevChar = value[cursorPos - 1];
                    if (prevChar === ')' || prevChar === ' ' || prevChar === '-') {
                        setTimeout(() => {
                            const newPos = cursorPos - 1;
                            e.target.setSelectionRange(newPos, newPos);
                        }, 0);
                    }
                }
            }
        });
        
        // Blur validation
        input.addEventListener('blur', () => {
            const phone = input.value.trim();
            
            if (phone && !isValidPhone(phone)) {
                errorMsg.style.display = 'block';
                input.style.borderColor = '#ef4444';
            } else {
                errorMsg.style.display = 'none';
                input.style.borderColor = '';
            }
        });
        
        input.setAttribute('data-phone-validated', 'true');
    });
},

// 🎯 Setup Quality Sliders
setupQualitySliders() {
    const sliders = document.querySelectorAll('.quality-slider:not([data-listener-added])');
    
    sliders.forEach(slider => {
        const updateQuality = () => {
            const value = parseInt(slider.value);
            const isEdit = slider.id.includes('edit');
            const valueSpan = document.getElementById(isEdit ? 'editQualityValue' : 'qualityValue');
            const labelSpan = document.getElementById(isEdit ? 'editQualityLabel' : 'qualityLabel');
            
            if (valueSpan) valueSpan.textContent = value;
            if (labelSpan) labelSpan.textContent = this.getQualityLabel(value);
            
            // 🔥 FIX: Ensure the slider value is properly set
            slider.setAttribute('value', value);
        };
        
        slider.addEventListener('input', updateQuality);
        slider.addEventListener('change', updateQuality);
        slider.setAttribute('data-listener-added', 'true');
        updateQuality(); // Initialize
    });
},

// 🎯 Get Quality Label
getQualityLabel(score) {
    if (score <= 3) return 'Low';
    if (score <= 6) return 'Average';
    if (score <= 8) return 'High';
    return 'Premium';
},

// 🎨 Setup Dynamic Select Borders
setupDynamicSelectBorders() {
    console.log('🎨 Starting dynamic border setup...');
    
    const statusSelects = document.querySelectorAll('select[name="status"]');
    const typeSelects = document.querySelectorAll('select[name="type"]');
    
    console.log('📊 Found status selects:', statusSelects.length);
    console.log('🔥 Found type selects:', typeSelects.length);
    
    // Status dropdowns
    statusSelects.forEach((select, index) => {
        console.log(`📊 Setting up status select ${index}:`, select);
        
        const updateBorder = () => {
            console.log(`🎨 Status changed to: ${select.value}`);
            select.setAttribute('data-value', select.value);
            console.log(`✅ Set data-value to: ${select.getAttribute('data-value')}`);
        };
        
        select.addEventListener('change', updateBorder);
        updateBorder(); // Initialize
    });
    
    // Type dropdowns  
    typeSelects.forEach((select, index) => {
        console.log(`🔥 Setting up type select ${index}:`, select);
        
        const updateBorder = () => {
            console.log(`🎨 Type changed to: ${select.value}`);
            select.setAttribute('data-value', select.value);
            console.log(`✅ Set data-value to: ${select.getAttribute('data-value')}`);
        };
        
        select.addEventListener('change', updateBorder);
        updateBorder(); // Initialize
    });
    
    console.log('🎨 Dynamic border setup finished!');
},

   async handleSubmit(e) {
    e.preventDefault();
    
    try {
        this.setLoadingState(true);
        
        const formData = new FormData(e.target);
        const leadData = Object.fromEntries(formData.entries());

        // In handleSubmit, add this line:
        leadData.potential_value = parseFloat(leadData.potential_value.toString().replace(/,/g, '')) || 0;
        
        // 🔥 FIX: Explicitly get quality score from slider
        const qualitySlider = e.target.querySelector('input[name="quality_score"]');
        if (qualitySlider) {
            leadData.quality_score = parseInt(qualitySlider.value);
        }
        
        // 🔥 FIX: Explicitly get source value
        const sourceInput = e.target.querySelector('input[name="source"]');
        if (sourceInput && sourceInput.value.trim()) {
            leadData.source = sourceInput.value.trim();
        }
        
        // Clean up data
        leadData.potential_value = parseFloat(leadData.potential_value) || 0;
        if (!leadData.email) leadData.email = null;
        if (!leadData.phone) leadData.phone = null;
        if (!leadData.company) leadData.company = null;
        if (!leadData.notes) leadData.notes = null;
        
        // Check for duplicates
        const duplicateCheck = await API.checkDuplicates(leadData);
        
        if (duplicateCheck.hasExactDuplicates) {
            this.setLoadingState(false);
            const exactDupe = duplicateCheck.exact[0];
            this.showDuplicateModal(exactDupe, 'exact');
            return;
        }
        
        if (duplicateCheck.hasSimilarLeads) {
            this.setLoadingState(false);
            const shouldContinue = await this.showSimilarLeadsModal(duplicateCheck.similar);
            if (!shouldContinue) {
                return;
            }
            this.setLoadingState(true);
        }

        // Create lead
        const newLead = await API.createLead(leadData);
        
        // Add to local data
        this.leads.unshift(newLead);
        
        // Close modal and refresh
        this.hideAddLeadModal();
        if (this.currentView === 'table') {
            this.showTableView();
        } else {
            this.render();
        }
        
        // Refresh pipeline if available
        if (window.PipelineModule?.refreshPipeline) {
            window.PipelineModule.refreshPipeline();
        }
        
        this.showNotification(`✅ Lead "${leadData.name}" added successfully!`, 'success');
        
    } catch (error) {
    console.error('❌ Failed to create lead:', error);
    this.showNotification(`❌ ${API.handleAPIError(error, 'CreateLead')}`, 'error');
    } finally {
        this.setLoadingState(false);
    }
},

// 🚨 SIMPLIFIED DUPLICATE MODAL - MATCHING YOUR POPUP STYLE
showDuplicateModal(duplicateLead, type) {
    const modal = document.createElement('div');
    modal.className = 'duplicate-popup-overlay';
    modal.innerHTML = `
        <div class="duplicate-popup">
            <div class="duplicate-popup-header">
                <h3>⚠️ Duplicate Lead Found</h3>
                <button class="popup-close" onclick="this.closest('.duplicate-popup-overlay').remove()">×</button>
            </div>
            
            <div class="duplicate-popup-content">
    <p class="duplicate-message">${duplicateLead.reason}. Click the lead to edit it:</p>
                
                <div class="duplicate-lead-card clickable-lead" onclick="AddLeadModule.editLead('${duplicateLead.lead.id}'); this.closest('.duplicate-popup-overlay').remove();">
                    <div class="lead-info-simple">
                        <h4>${duplicateLead.lead.name}</h4>
                        <div class="lead-details">
                            <p>📧 ${duplicateLead.lead.email}</p>
                            ${duplicateLead.lead.company ? `<p>🏢 ${duplicateLead.lead.company}</p>` : ''}
                            <p class="added-time">📅 Added ${this.formatTimeAgo(duplicateLead.lead.created_at)}</p>
                        </div>
                    </div>
                    <div class="lead-avatar-right">
                        <span>${this.getInitials(duplicateLead.lead.name)}</span>
                    </div>
                </div>
            </div>
            
            <div class="duplicate-popup-actions">
                <button class="btn-cancel" onclick="this.closest('.duplicate-popup-overlay').remove()">
                    Cancel
                </button>
                <button class="btn-primary" onclick="AddLeadModule.editLead('${duplicateLead.lead.id}'); this.closest('.duplicate-popup-overlay').remove();">
                    Edit Existing Lead
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Add the simplified styles if not already present
    this.addDuplicatePopupStyles();
},

// 🎨 Add Simplified Duplicate Popup Styles (matching your existing popup style)
addDuplicatePopupStyles() {
    if (document.getElementById('duplicate-popup-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'duplicate-popup-styles';
    style.textContent = `
        /* 🎯 Simplified Duplicate Popup - Matching Your Other Popups */
        .duplicate-popup-overlay {
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
            animation: fadeIn 0.3s ease;
        }
        
        .duplicate-popup {
            background: var(--surface);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
            border: 1px solid var(--border);
            animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .duplicate-popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
            color: white;
        }
        
        .duplicate-popup-header h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
        }
        
        .popup-close {
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
        
        .popup-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .duplicate-popup-content {
            padding: 1.5rem;
        }
        
        .duplicate-message {
            margin: 0 0 1.5rem 0;
            color: var(--text-primary);
            font-weight: 600;
        }
        
        .duplicate-lead-card {
            padding: 1.25rem;
            background: var(--surface-hover);
            border: 2px solid var(--border);
            border-radius: var(--radius);
            transition: all 0.3s ease;
            margin-bottom: 1.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }
        
        .duplicate-lead-card:hover {
            border-color: var(--primary);
            background: rgba(102, 126, 234, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        
        .lead-info-simple {
            flex: 1;
        }
        
        .lead-info-simple h4 {
            margin: 0 0 0.75rem 0;
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1.2;
        }
        
        .lead-details {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }
        
        .lead-details p {
            margin: 0;
            font-size: 0.95rem;
            color: var(--text-secondary);
            line-height: 1.4;
        }
        
        .added-time {
            font-size: 0.85rem !important;
            color: var(--text-tertiary) !important;
        }
        
        .lead-avatar-right {
            width: 60px;
            height: 60px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 1.2rem;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .duplicate-popup-actions {
            display: flex;
            gap: 1rem;
            padding: 1rem 1.5rem 1.5rem;
            background: var(--surface-hover);
        }
        
        .btn-cancel, .btn-primary {
            flex: 1;
            padding: 0.875rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        
        .btn-cancel {
            background: var(--background);
            color: var(--text-secondary);
            border: 2px solid var(--border);
        }
        
        .btn-cancel:hover {
            border-color: var(--text-secondary);
            color: var(--text-primary);
        }
        
        .btn-primary {
            background: var(--primary);
            color: white;
        }
        
        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
        }
        
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.8) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        /* 📱 Mobile Responsive */
        @media (max-width: 768px) {
            .duplicate-popup {
                margin: 1rem;
                max-height: 90vh;
            }
            
            .duplicate-lead-card {
                flex-direction: column;
                text-align: center;
                gap: 0.75rem;
            }
            
            .duplicate-popup-actions {
                flex-direction: column;
            }
        }
    `;
    
    document.head.appendChild(style);
},

// 🤔 SIMPLIFIED SIMILAR LEADS MODAL - MATCHING DUPLICATE MODAL STYLE
async showSimilarLeadsModal(similarLeads) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'similar-popup-overlay';
        modal.innerHTML = `
            <div class="similar-popup">
                <div class="similar-popup-header">
                    <h3>Similar Leads Found</h3>
                    <button class="popup-close" onclick="this.closest('.similar-popup-overlay').remove(); window.similarModalResolve(false);">×</button>
                </div>
                
                <div class="similar-popup-content">
                    <p class="similar-message">Found ${similarLeads.length} similar lead${similarLeads.length > 1 ? 's' : ''} in your database:</p>
                    
                    <div class="similar-leads-list">
                        ${similarLeads.slice(0, 3).map(similar => `
                            <div class="similar-lead-card clickable-lead" onclick="AddLeadModule.editLead('${similar.lead.id}'); this.closest('.similar-popup-overlay').remove(); window.similarModalResolve(false);">
                                <div class="lead-info-simple">
                                    <h4>${similar.lead.name}</h4>
                                    <div class="lead-details">
                                        ${similar.lead.email ? `<p>📧 ${similar.lead.email}</p>` : ''}
                                        ${similar.lead.company ? `<p>🏢 ${similar.lead.company}</p>` : ''}
                                        <p class="added-time">📅 Added ${this.formatTimeAgo(similar.lead.created_at)}</p>
                                    </div>
                                </div>
                                <div class="similarity-section">
                                    <div class="lead-avatar-right">
                                        <span>${this.getInitials(similar.lead.name)}</span>
                                    </div>
                                    <div class="confidence-badge">
                                        ${Math.round(similar.confidence)}% match
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <p class="similar-question">Do you want to continue adding this lead anyway?</p>
                </div>
                
                <div class="similar-popup-actions">
                    <button class="btn-cancel" onclick="this.closest('.similar-popup-overlay').remove(); window.similarModalResolve(false);">
                        Cancel
                    </button>
                    <button class="btn-primary" onclick="this.closest('.similar-popup-overlay').remove(); window.similarModalResolve(true);">
                        Add Anyway
                    </button>
                </div>
            </div>
        `;
        
        // Store resolve function globally for button access
        window.similarModalResolve = resolve;
        
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
        
        // Add the simplified styles
        this.addSimilarPopupStyles();
    });
},

// 🎨 Add Simplified Similar Popup Styles (matching duplicate modal)
addSimilarPopupStyles() {
    if (document.getElementById('similar-popup-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'similar-popup-styles';
    style.textContent = `
        /* 🎯 Simplified Similar Popup - Matching Duplicate Modal Style */
        .similar-popup-overlay {
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
            animation: fadeIn 0.3s ease;
        }
        
        .similar-popup {
            background: var(--surface);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            border: 1px solid var(--border);
            animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .similar-popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
        }
        
        .similar-popup-header h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
        }
        
        .popup-close {
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
        
        .popup-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .similar-popup-content {
            padding: 1.5rem;
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .similar-message {
            margin: 0 0 1.5rem 0;
            color: var(--text-primary);
            font-weight: 600;
        }
        
        .similar-leads-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .similar-lead-card {
            padding: 1.25rem;
            background: var(--surface-hover);
            border: 2px solid var(--border);
            border-radius: var(--radius);
            transition: all 0.3s ease;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .similar-lead-card:hover {
            border-color: var(--primary);
            background: rgba(102, 126, 234, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        
        .lead-info-simple {
            flex: 1;
        }
        
        .lead-info-simple h4 {
            margin: 0 0 0.75rem 0;
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1.2;
        }
        
        .lead-details {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }
        
        .lead-details p {
            margin: 0;
            font-size: 0.9rem;
            color: var(--text-secondary);
            line-height: 1.4;
        }
        
        .added-time {
            font-size: 0.8rem !important;
            color: var(--text-tertiary) !important;
        }
        
        .similarity-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            flex-shrink: 0;
        }
        
        .lead-avatar-right {
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
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .confidence-badge {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        
        .similar-question {
            margin: 0;
            font-weight: 600;
            color: var(--text-primary);
            text-align: center;
            padding: 1rem;
            background: var(--surface-hover);
            border-radius: var(--radius);
            border: 1px solid var(--border);
        }
        
        .similar-popup-actions {
            display: flex;
            gap: 1rem;
            padding: 1rem 1.5rem 1.5rem;
            background: var(--surface-hover);
        }
        
        .btn-cancel, .btn-primary {
            flex: 1;
            padding: 0.875rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        
        .btn-cancel {
            background: var(--background);
            color: var(--text-secondary);
            border: 2px solid var(--border);
        }
        
        .btn-cancel:hover {
            border-color: var(--text-secondary);
            color: var(--text-primary);
        }
        
        .btn-primary {
            background: var(--primary);
            color: white;
        }
        
        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
        }
        
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.8) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        /* 📱 Mobile Responsive */
        @media (max-width: 768px) {
            .similar-popup {
                margin: 1rem;
                max-height: 90vh;
            }
            
            .similar-lead-card {
                flex-direction: column;
                text-align: center;
                gap: 1rem;
            }
            
            .similarity-section {
                flex-direction: row;
                justify-content: center;
            }
            
            .similar-popup-actions {
                flex-direction: column;
            }
        }
    `;
    
    document.head.appendChild(style);
},

    // 🔍 Handle Search
    handleSearch(e) {
        this.searchTerm = e.target.value.toLowerCase();
        this.updateTableContent();
    },

    // 🎯 View Management
    showDashboard() {
        this.currentView = 'dashboard';
        this.render();
    },

    showTableView() {
        this.currentView = 'table';
        this.render();
    },

    showAddLeadModal() {
    const modal = document.getElementById('addLeadModal');
    if (modal) {
        modal.classList.add('show');
        
        // Reset form and setup dynamic borders
        setTimeout(() => {
            const form = document.getElementById('addLeadForm');
            if (form) {
                form.reset(); // Reset all form fields
                
                // Set defaults manually
                const statusSelect = form.querySelector('select[name="status"]');
                const typeSelect = form.querySelector('select[name="type"]');
                const qualitySlider = form.querySelector('input[name="quality_score"]');
                
                if (statusSelect) statusSelect.value = 'new';
                if (typeSelect) typeSelect.value = '';
                if (qualitySlider) qualitySlider.value = '5';
                
                // Reinitialize all interactive elements
                this.setupSimpleEmailValidation();
    this.setupSimplePhoneValidation();
    this.setupQualitySliders();
    this.setupSourceSelector();
    this.setupDynamicSelectBorders();
    this.setupMoneyInputFormatting();
            }
            
            // Focus first input
            const firstInput = modal.querySelector('input[name="name"]');
            if (firstInput) firstInput.focus();
        }, 100);
    }
},

    hideAddLeadModal() {
    const modal = document.getElementById('addLeadModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            const form = document.getElementById('addLeadForm');
            if (form) {
                form.reset();
                
                // Reset to defaults and clear dynamic attributes
                const statusSelect = form.querySelector('select[name="status"]');
                const typeSelect = form.querySelector('select[name="type"]');
                
                if (statusSelect) {
                    statusSelect.value = 'new';
                    statusSelect.removeAttribute('data-value');
                }
                if (typeSelect) {
                    typeSelect.value = '';
                    typeSelect.removeAttribute('data-value');
                }
            }
        }, 300);
    }
},

    hideEditLeadModal() {
        const modal = document.getElementById('editLeadModal');
        if (modal) {
            modal.classList.remove('show');
            this.currentEditLead = null;
        }
    },

    hideAllModals() {
        this.hideAddLeadModal();
        this.hideEditLeadModal();
    },

    // ✏️ Edit Lead
    editLead(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        this.currentEditLead = lead;
        
        const modal = document.getElementById('editLeadModal');
        const formContainer = document.getElementById('editFormContainer');
        
        if (modal && formContainer) {
            formContainer.innerHTML = this.renderEditForm(lead);
            modal.classList.add('show');

    this.setupSimpleEmailValidation();
    this.setupSimplePhoneValidation();
    this.setupQualitySliders();
    this.setupSourceSelector();
    this.setupDynamicSelectBorders();
    this.setupMoneyInputFormatting();
            
            // Setup edit form listeners
            const editForm = document.getElementById('editLeadForm');
            if (editForm) {
                editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
            }
        }
    },

    renderEditForm(lead) {
    return `
        <form id="editLeadForm" class="lead-form">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input type="text" name="name" class="form-input" value="${lead.name}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Company</label>
                    <input type="text" name="company" class="form-input" value="${lead.company || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-input" value="${lead.email || ''}">
                </div>
                
                <div class="form-group">
    <label class="form-label">Phone</label>
    <input type="tel"
       name="phone"
       class="form-input phone-input"
       pattern="^.{14}$|^$"
       title="Please complete the phone number format"
       placeholder="(555) 123-4567"
       maxlength="17"
       value="${lead.phone || ''}">
</div>
                
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select name="status" class="form-select">
                        <option value="new" ${lead.status === 'new' ? 'selected' : ''}>🆕 New Lead</option>
                        <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>📞 Contacted</option>
                        <option value="qualified" ${lead.status === 'qualified' ? 'selected' : ''}>✅ Qualified</option>
                        <option value="negotiation" ${lead.status === 'negotiation' ? 'selected' : ''}>🤝 Negotiation</option>
                        <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>🎉 Closed Won</option>
                        <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>❌ Lost</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Source</label>
                    <input type="text"
                           name="source"
                           class="source-input form-input"
                           placeholder="Click to select source..."
                           value="${lead.source || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Lead Type</label>
                    <select name="type" class="form-select">
                        <option value="cold" ${lead.type === 'cold' ? 'selected' : ''}>❄️ Cold Lead</option>
                        <option value="warm" ${lead.type === 'warm' ? 'selected' : ''}>🔥 Warm Lead</option>
                    </select>
                </div>
                
                <div class="form-group">
    <label class="form-label">Potential Value</label>
    <div class="money-input-wrapper">
        <span class="currency-symbol">$</span>
        <input type="text" 
               name="potential_value" 
               class="form-input money-input" 
               value="${lead.potential_value > 0 ? lead.potential_value.toLocaleString() : ''}"
               data-raw-value="${lead.potential_value || 0}"
               placeholder="0">
    </div>
</div>

                <div class="form-group full-width">
                    <label class="form-label">Lead Quality (1-10)</label>
                    <div class="quality-slider-container">
                        <input type="range" 
                               name="quality_score" 
                               class="quality-slider" 
                               min="1" 
                               max="10" 
                               value="${lead.quality_score || 5}" 
                               id="editQualitySlider">
                        <div class="quality-display">
                            <span class="quality-value" id="editQualityValue">${lead.quality_score || 5}</span>
                            <span class="quality-label" id="editQualityLabel">${this.getQualityLabel(lead.quality_score || 5)}</span>
                        </div>
                    </div>
                    <div class="quality-indicators">
                        <span class="quality-indicator">1-3: Low</span>
                        <span class="quality-indicator">4-6: Average</span>
                        <span class="quality-indicator">7-8: High</span>
                        <span class="quality-indicator">9-10: Premium</span>
                    </div>
                </div>
                
                <div class="form-group full-width">
                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-textarea" rows="3">${lead.notes || ''}</textarea>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-danger" onclick="AddLeadModule.deleteLead('${lead.id}')">
                    🗑️ Delete
                </button>
                <div class="form-actions-right">
                    <button type="button" class="btn-secondary" onclick="AddLeadModule.hideEditLeadModal()">
                        Cancel
                    </button>
                    <button type="submit" class="btn-primary" id="editSubmitBtn">
                        <span class="btn-text">Update Lead</span>
                        <span class="btn-loading hidden">Updating...</span>
                    </button>
                </div>
            </div>
        </form>
    `;
},

    async handleEditSubmit(e) {
    e.preventDefault();
    
    try {
        this.setEditLoadingState(true);
        
        const formData = new FormData(e.target);
        const leadData = Object.fromEntries(formData.entries());

        // In handleSubmit, add this line:
        leadData.potential_value = parseFloat(leadData.potential_value.toString().replace(/,/g, '')) || 0;
        
        // 🔥 FIX: Explicitly get quality score from slider
        const qualitySlider = e.target.querySelector('input[name="quality_score"]');
        if (qualitySlider) {
            leadData.quality_score = parseInt(qualitySlider.value);
        }
        
        // 🔥 FIX: Explicitly get source value
        const sourceInput = e.target.querySelector('input[name="source"]');
        if (sourceInput && sourceInput.value.trim()) {
            leadData.source = sourceInput.value.trim();
        }
        
        // Clean up data
        leadData.potential_value = parseFloat(leadData.potential_value) || 0;
        if (!leadData.email) leadData.email = null;
        if (!leadData.phone) leadData.phone = null;
        if (!leadData.company) leadData.company = null;
        if (!leadData.source) leadData.source = null;
        if (!leadData.notes) leadData.notes = null;
        
        // Update lead
        await API.updateLead(this.currentEditLead.id, leadData);
        
        // Update local data
        const leadIndex = this.leads.findIndex(l => l.id === this.currentEditLead.id);
        if (leadIndex !== -1) {
            this.leads[leadIndex] = { ...this.leads[leadIndex], ...leadData };
        }
        
        // Close modal and refresh
        this.hideEditLeadModal();
        if (this.currentView === 'table') {
            this.updateTableContent();
        } else {
            this.render();
        }
        
        // Refresh pipeline if available
        if (window.PipelineModule?.refreshPipeline) {
            window.PipelineModule.refreshPipeline();
        }
        
        this.showNotification(`✅ Lead "${leadData.name}" updated successfully!`, 'success');
        
    } catch (error) {
    console.error('❌ Failed to update lead:', error);
    this.showNotification(`❌ ${API.handleAPIError(error, 'UpdateLead')}`, 'error');
} finally {
        this.setEditLoadingState(false);
    }
},

    // ⚡ Quick Actions
    toggleActions(leadId) {
        const menu = document.getElementById(`actions-${leadId}`);
        if (menu) {
            // Close other menus
            document.querySelectorAll('.actions-menu.show').forEach(m => {
                if (m !== menu) m.classList.remove('show');
            });
            
            // 🎯 SMART POSITIONING - Check if menu goes off screen
            if (!menu.classList.contains('show')) {
                menu.classList.add('show');
                
                // Get menu and viewport dimensions
                const menuRect = menu.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const tableContainer = document.querySelector('.table-container');
                const containerRect = tableContainer?.getBoundingClientRect();
                
                // Check if menu goes below viewport or container
                const menuBottom = menuRect.bottom;
                const containerBottom = containerRect ? containerRect.bottom : viewportHeight;
                const effectiveBottom = Math.min(viewportHeight, containerBottom);
                
                if (menuBottom > effectiveBottom - 10) { // 10px buffer
                    // Position above the trigger instead
                    menu.classList.add('position-above');
                } else {
                    menu.classList.remove('position-above');
                }
                
                // Check horizontal positioning too
                const menuRight = menuRect.right;
                const viewportWidth = window.innerWidth;
                
                if (menuRight > viewportWidth - 10) { // 10px buffer
                    menu.classList.add('position-left');
                } else {
                    menu.classList.remove('position-left');
                }
            } else {
                menu.classList.remove('show', 'position-above', 'position-left');
            }
        }
    },

    async quickCall(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        if (lead.phone) {
            window.open(`tel:${lead.phone}`, '_self');
            this.showNotification(`📞 Calling ${lead.name}...`, 'info');
        } else {
            this.showNotification(`No phone number for ${lead.name}`, 'warning');
        }
    },

    async quickEmail(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        if (lead.email) {
            const subject = encodeURIComponent(`Following up - ${lead.name}`);
            const body = encodeURIComponent(`Hi ${lead.name.split(' ')[0]},\n\nI wanted to follow up with you.\n\nBest regards,`);
            window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_self');
            this.showNotification(`📧 Email to ${lead.name} opened`, 'info');
        } else {
            this.showNotification(`No email address for ${lead.name}`, 'warning');
        }
    },

    // 🗑️ Delete Lead with Pipeline-Style Confirmation
    deleteLead(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        // Close any open action menus
        document.querySelectorAll('.actions-menu.show').forEach(menu => {
            menu.classList.remove('show', 'position-above', 'position-left');
        });
        
        this.showDeleteConfirmation(leadId);
    },

    // 🗑️ Show Pipeline-Style Delete Confirmation Modal
    showDeleteConfirmation(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        // Create confirmation modal
        const confirmModal = document.createElement('div');
        confirmModal.className = 'delete-confirm-overlay';
        confirmModal.innerHTML = `
            <div class="delete-confirm-modal">
                <div class="confirm-header">
                    <div class="confirm-icon">⚠️</div>
                    <h3 class="confirm-title">Delete Lead</h3>
                </div>
                
                <div class="confirm-body">
                    <p class="confirm-message">
                        Are you sure you want to permanently delete <strong>${lead.name}</strong>?
                    </p>
                    <p class="confirm-warning">
                        This action cannot be undone. All data associated with this lead will be lost.
                    </p>
                </div>
                
                <div class="confirm-actions">
                    <button class="btn-cancel-delete" onclick="this.closest('.delete-confirm-overlay').remove()">
                        Cancel
                    </button>
                    <button class="btn-confirm-delete" onclick="AddLeadModule.confirmDeleteLead('${leadId}')">
                        Yes, Delete Lead
                    </button>
                </div>
            </div>
            
            <style>
                .delete-confirm-overlay {
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
                    animation: fadeIn 0.2s ease;
                    padding: 1rem;
                }
                
                .delete-confirm-modal {
                    background: var(--surface, #ffffff);
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    width: 100%;
                    max-width: 400px;
                    animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    border: 1px solid var(--border, #e5e7eb);
                    overflow: hidden;
                }
                
                .confirm-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.5rem 1.5rem 1rem;
                    background: linear-gradient(135deg, var(--danger, #ef4444) 0%, #dc2626 100%);
                    color: white;
                }
                
                .confirm-icon {
                    font-size: 1.5rem;
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .confirm-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                }
                
                .confirm-body {
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .confirm-message {
                    font-size: 1rem;
                    color: var(--text-primary, #111827);
                    margin: 0;
                    line-height: 1.5;
                }
                
                .confirm-warning {
                    font-size: 0.85rem;
                    color: var(--text-secondary, #6b7280);
                    margin: 0;
                    padding: 0.75rem 1rem;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 8px;
                    border-left: 3px solid var(--danger, #ef4444);
                    line-height: 1.4;
                }
                
                .confirm-actions {
                    display: flex;
                    gap: 1rem;
                    padding: 1rem 1.5rem 1.5rem;
                    background: var(--surface-hover, #f8fafc);
                }
                
                .btn-cancel-delete, .btn-confirm-delete {
                    flex: 1;
                    padding: 0.875rem 1.5rem;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
                
                .btn-cancel-delete {
                    background: var(--background, #ffffff);
                    color: var(--text-secondary, #6b7280);
                    border: 2px solid var(--border, #e5e7eb);
                }
                
                .btn-cancel-delete:hover {
                    border-color: var(--text-secondary, #6b7280);
                    color: var(--text-primary, #111827);
                    transform: translateY(-1px);
                }
                
                .btn-confirm-delete {
                    background: linear-gradient(135deg, var(--danger, #ef4444) 0%, #dc2626 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }
                
                .btn-confirm-delete:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                }
                
                .btn-confirm-delete:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.8) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                
                @media (max-width: 480px) {
                    .delete-confirm-modal {
                        margin: 0;
                        border-radius: 16px 16px 0 0;
                        max-width: none;
                    }
                    
                    .confirm-actions {
                        flex-direction: column;
                    }
                }
            </style>
        `;

        document.body.appendChild(confirmModal);
        
        // Close on backdrop click
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.remove();
            }
        });
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                confirmModal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    },

    // 🗑️ Confirm Delete Lead (Pipeline Style)
    async confirmDeleteLead(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        // Remove confirmation modal
        const confirmModal = document.querySelector('.delete-confirm-overlay');
        if (confirmModal) confirmModal.remove();

        // Show loading on delete button
        const deleteBtn = document.querySelector('.btn-confirm-delete');
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '⏳ Deleting...';
        }

        try {
            // Call API to delete
            await API.deleteLead(leadId);
            
            // Remove from local data
            this.leads = this.leads.filter(l => l.id.toString() !== leadId.toString());
            
            // Close any open modals
            this.hideAllModals();
            
            // Refresh view
            if (this.currentView === 'table') {
                this.updateTableContent();
            } else {
                this.render();
            }
            
            // Refresh pipeline if available
            if (window.PipelineModule?.refreshPipeline) {
                window.PipelineModule.refreshPipeline();
            }
            
            // Show success message
            this.showNotification(`✅ ${lead.name} deleted successfully`, 'success');
            console.log(`✅ Lead deleted: ${lead.name}`);
            
       } catch (error) {
    console.error('❌ Failed to delete lead:', error);
    this.showNotification(`❌ ${API.handleAPIError(error, 'DeleteLead')}`, 'error');
            
            // Re-enable button if still exists
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = 'Yes, Delete Lead';
            }
        }
    },

    // 🔄 Refresh Data
    async refreshData() {
        try {
            await this.loadLeads();
            if (this.currentView === 'table') {
                this.updateTableContent();
            } else {
                this.render();
            }
            console.log('✅ AddLead data refreshed');
        } catch (error) {
            console.error('❌ Failed to refresh data:', error);
        }
    },

    // 🔄 Update Table Content
    updateTableContent() {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            const filteredLeads = this.getFilteredLeads();
            tableContainer.innerHTML = filteredLeads.length > 0 ? 
                this.renderTable(filteredLeads) : 
                this.renderEmptyState();
            
            // Update header count
            const tableTitle = document.querySelector('.table-title');
            if (tableTitle) {
                tableTitle.textContent = `All Leads (${filteredLeads.length})`;
            }
        }
    },

    // 🔍 Get Filtered Leads
    getFilteredLeads() {
        if (!this.searchTerm) return this.leads;
        
        return this.leads.filter(lead => {
            const searchText = `${lead.name} ${lead.company} ${lead.email} ${lead.phone || ''}`.toLowerCase();
            return searchText.includes(this.searchTerm);
        });
    },

    setLoadingState(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = isLoading;
        if (isLoading) {
            submitBtn.innerHTML = `
                <div class="btn-loading-spinner"></div>
                <span>Adding Lead...</span>
            `;
        } else {
            submitBtn.innerHTML = `
                <span class="btn-text">Add Lead</span>
            `;
        }
    }
},

setEditLoadingState(isLoading) {
    const submitBtn = document.getElementById('editSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = isLoading;
        if (isLoading) {
            submitBtn.innerHTML = `
                <div class="btn-loading-spinner"></div>
                <span>Updating Lead...</span>
            `;
        } else {
            submitBtn.innerHTML = `
                <span class="btn-text">Update Lead</span>
            `;
        }
    }
},

    // 🍞 Notifications
    showNotification(message, type = 'info') {
        if (window.SteadyUtils?.showToast) {
            window.SteadyUtils.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    },

    // 🔄 Loading & Error States (Pipeline Style)
    renderLoadingState() {
        const container = document.getElementById(this.targetContainer);
    if (container) {
        container.innerHTML = `
                <div class="streamlined-pipeline-container fade-in">
                    <!-- 🎯 SKELETON HEADER -->
                    <div class="skeleton-header">
                        <div class="skeleton-icon"></div>
                        <div class="skeleton-text-group">
                            <div class="skeleton-title"></div>
                            <div class="skeleton-subtitle"></div>
                        </div>
                        <div class="skeleton-stats">
                            <div class="skeleton-stat"></div>
                            <div class="skeleton-stat"></div>
                        </div>
                    </div>
                    
                    <!-- 🔥 SKELETON BUBBLES -->
                    <div class="skeleton-bubbles">
                        <div class="skeleton-bubble"></div>
                        <div class="skeleton-bubble"></div>
                    </div>
                    
                    <!-- 📋 SKELETON LIST -->
                    <div class="skeleton-list">
                        <div class="skeleton-item"></div>
                        <div class="skeleton-item"></div>
                        <div class="skeleton-item"></div>
                        <div class="skeleton-item"></div>
                        <div class="skeleton-item"></div>
                    </div>
                </div>
            `;
        }
    },

    renderError(message) {
    const container = document.getElementById(this.targetContainer);
    if (container) {
        container.innerHTML = `
                <div class="streamlined-pipeline-container fade-in">
                    <div class="error-container">
                        <div class="error-icon">⚠️</div>
                        <h2 class="error-title">Lead Management Error</h2>
                        <p class="error-message">${message}</p>
                        <button onclick="AddLeadModule.init()" class="retry-btn">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">Try Again</span>
                        </button>
                    </div>
                </div>
                ${this.renderErrorStyles()}
            `;
        }
    },

    // 🎨 Pipeline-Style Error Styles
    renderErrorStyles() {
        return `
            <style>
                .error-container {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--text-secondary);
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-lg);
                    max-width: 600px;
                    margin: 0 auto;
                }

                .error-icon {
                    font-size: 4rem;
                    margin-bottom: 2rem;
                    opacity: 0.6;
                    display: block;
                }

                .error-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .error-message {
                    margin-bottom: 2rem;
                    font-size: 1.125rem;
                    line-height: 1.6;
                    color: var(--text-secondary);
                }

                .retry-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem 2rem;
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    color: white;
                    border: none;
                    border-radius: var(--radius);
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: var(--shadow);
                }

                .retry-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                .btn-icon {
                    font-size: 1.125rem;
                }
            </style>
        `;
    },

    // 🎯 Utility Methods
    getInitials(name) {
        if (!name) return '??';
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },

    getStatusClass(status) {
        const statusMap = {
            'new': 'status-new',
            'contacted': 'status-contacted',
            'qualified': 'status-qualified',
            'negotiation': 'status-negotiation',
            'closed': 'status-closed',
            'lost': 'status-lost'
        };
        return statusMap[status] || 'status-new';
    },

    formatStatus(status) {
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

    formatSource(source) {
        if (!source) return 'Unknown';
        return source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    formatTimeAgo(dateString) {
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

    formatPhoneForDisplay(phone) {
    if (!phone) return '';
    
    // Just return whatever is stored - no cleaning needed
    return phone;
},

    // 🎨 Styles
    renderStyles() {
        return `
            <style>
            /* 🚫 NUCLEAR HOVER RESET FOR ADDLEAD - Put this FIRST */
            .table-row:hover,
            .clickable-row:hover,
            .recent-item:hover {
                background: unset !important;
                box-shadow: unset !important;
                transform: unset !important;
                transition: unset !important;
            }
                /* 🎯 Clean AddLead Styles */
                .addlead-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                /* 🎪 Action Bubbles */
                .action-bubbles {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .action-bubble {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                }

                .action-bubble:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl);
                    border-color: var(--primary);
                }

                .action-bubble.primary {
                    border-color: rgba(102, 126, 234, 0.3);
                    background: rgba(102, 126, 234, 0.02);
                }

                .action-bubble.secondary {
                    border-color: rgba(16, 185, 129, 0.3);
                    background: rgba(16, 185, 129, 0.02);
                }

                /* 📧 Simple Email Error Styling */
            .email-error {
                margin-top: 0.5rem;
                padding: 0.5rem 0.75rem;
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 6px;
                font-size: 0.85rem;
                font-weight: 500;
            }

            /* 📞 Simple Phone Validation Styles */
.phone-error {
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
}

.phone-input:focus {
    background: var(--background);
}

            /* 🎯 Simple Clickable Styles */
.clickable-row,
.clickable-item {
    cursor: pointer;
    transition: all 0.3s ease;
}

.clickable-row:hover {
    background: var(--surface-hover) !important;
    transform: scale(1.005);
}

.clickable-item:hover {
    transform: translateX(6px);
}

                /* 🎯 Simple Source Input */
.source-input {
    cursor: pointer !important;
    transition: all 0.3s ease;
}

.source-input:hover {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 🎯 Quality Slider Styles */
.quality-slider-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
}

.quality-slider {
    flex: 1;
    height: 8px;
    border-radius: 5px;
    background: #d1d5db;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
}

.quality-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
}

.quality-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.quality-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
}

.quality-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
    line-height: 1;
}

.quality-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.quality-indicators {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.quality-indicator {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    padding: 0.25rem 0.5rem;
    background: var(--surface-hover);
    border-radius: 4px;
    border: 1px solid var(--border);
}

                .bubble-icon {
                    font-size: 3rem;
                    width: 80px;
                    height: 80px;
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-primary);
                    flex-shrink: 0;
                }

                .bubble-content {
                    flex: 1;
                }

                .bubble-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }

                .bubble-subtitle {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                }

                .bubble-button {
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

                .bubble-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                }

                .arrow {
                    transition: transform 0.3s ease;
                }

                .action-bubble:hover .arrow {
                    transform: translateX(4px);
                }

                /* 📋 Recent Section */
                .recent-section {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    margin-bottom: 2rem;
                }

                .recent-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .recent-title {
                    font-size: 1.375rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .view-all-btn {
                    color: var(--primary);
                    text-decoration: none;
                    font-weight: 600;
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius);
                    transition: all 0.3s ease;
                    background: none;
                    border: none;
                    cursor: pointer;
                }

                .view-all-btn:hover {
                    background: rgba(102, 126, 234, 0.1);
                    transform: translateX(4px);
                }

                .recent-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .recent-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    transition: all 0.3s ease;
                }

                .recent-item:hover {
                    background: var(--border);
                    transform: translateX(4px);
                }

                .recent-avatar {
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

                .recent-info {
                    flex: 1;
                    min-width: 0;
                }

                .recent-name {
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .recent-meta {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 0.5rem;
                }

                .recent-company {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }

                .recent-time {
                    color: var(--text-tertiary);
                    font-size: 0.85rem;
                }

                .recent-contact {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .recent-status {
                    display: flex;
                    align-items: center;
                    flex-shrink: 0;
                }

                .recent-actions {
                    display: flex;
                    gap: 0.25rem;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .recent-item:hover .recent-actions {
                    opacity: 1;
                }

                .action-btn {
                    width: 2rem;
                    height: 2rem;
                    border: none;
                    border-radius: var(--radius);
                    background: rgba(255, 255, 255, 0.9);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                }

                .action-btn:hover {
                    transform: scale(1.1);
                    box-shadow: var(--shadow);
                }

                /* 📊 Table View */
                .table-view {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                }

                .table-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .table-header-left {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .back-btn {
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 500;
                }

                .back-btn:hover {
                    background: var(--border);
                    transform: translateX(-2px);
                }

                .table-title {
                    font-size: 1.375rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .table-header-right {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .search-box {
                    position: relative;
                }

                .search-input {
                    width: 300px;
                    padding: 0.75rem 1rem 0.75rem 2.5rem;
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    background: var(--background);
                    color: var(--text-primary);
                    transition: all 0.3s ease;
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .search-icon {
                    position: absolute;
                    left: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                    pointer-events: none;
                }

                .add-btn {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .add-btn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                .table-container {
                    border-radius: var(--radius);
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .leads-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: var(--surface);
                }

                .leads-table th {
                    background: var(--surface-hover);
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: var(--text-primary);
                    border-bottom: 1px solid var(--border);
                    font-size: 0.9rem;
                }

                .leads-table td {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border);
                    font-size: 0.9rem;
                }

                .table-row {
                    transition: background-color 0.3s ease;
                }

                .table-row:hover .recent-actions {
    opacity: 1;
}

                .lead-info {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .lead-avatar {
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

                .lead-details {
                    flex: 1;
                }

                .lead-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .lead-company {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .contact-item {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.25rem;
                }

                .status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .status-new { background: rgba(59, 130, 246, 0.1); color: var(--info); }
                .status-contacted { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
                .status-qualified { background: rgba(16, 185, 129, 0.1); color: var(--success); }
                .status-negotiation { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
                .status-closed { background: rgba(16, 185, 129, 0.1); color: var(--success); }
                .status-lost { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

                .source-badge {
                    background: var(--surface-hover);
                    color: var(--text-secondary);
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius);
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .value-amount {
                    color: var(--success);
                    font-weight: 600;
                }

                .no-value {
                    color: var(--text-tertiary);
                }

                .date-text {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                }

                /* 🎯 PIPELINE-STYLE ACTIONS DROPDOWN */
                .actions-dropdown {
                    position: relative;
                }

                .actions-trigger {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: var(--radius);
                    transition: all 0.3s ease;
                    font-size: 1.2rem;
                    font-weight: bold;
                    width: 2rem;
                    height: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                }

                .actions-trigger::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
                    transition: left 0.6s ease;
                }

                .actions-trigger:hover::before {
                    left: 100%;
                }

                .actions-trigger:hover {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .actions-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    min-width: 160px;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-10px) scale(0.95);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(10px);
                    overflow: hidden;
                }

                .actions-menu.show {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0) scale(1);
                }

                /* 🎯 SMART POSITIONING CLASSES */
                .actions-menu.position-above {
                    top: auto;
                    bottom: 100%;
                    transform: translateY(10px) scale(0.95);
                }

                .actions-menu.position-above.show {
                    transform: translateY(0) scale(1);
                }

                .actions-menu.position-left {
                    right: auto;
                    left: 0;
                }

                /* 🎯 ENHANCED DROPDOWN STYLING WITH ARROWS */
                .actions-menu::before {
                    content: '';
                    position: absolute;
                    width: 0;
                    height: 0;
                    border-style: solid;
                    border-width: 0 8px 10px 8px;
                    border-color: transparent transparent var(--surface) transparent;
                    top: -10px;
                    right: 16px;
                    filter: drop-shadow(0 -2px 4px rgba(0,0,0,0.1));
                    z-index: 1001;
                }

                .actions-menu.position-above::before {
                    top: auto;
                    bottom: -10px;
                    border-width: 10px 8px 0 8px;
                    border-color: var(--surface) transparent transparent transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                }

                .actions-menu.position-left::before {
                    right: auto;
                    left: 16px;
                }

                /* 🎯 PIPELINE-STYLE MENU ITEMS */
                .actions-menu button {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    width: 100%;
                    padding: 0.875rem 1.25rem;
                    background: none;
                    border: none;
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                    text-align: left;
                    font-weight: 500;
                    position: relative;
                    overflow: hidden;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                }

                .actions-menu button:last-child {
                    border-bottom: none;
                }

                .actions-menu button::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
                    transition: left 0.6s ease;
                }

                .actions-menu button:hover::before {
                    left: 100%;
                }

                .actions-menu button:hover {
                    background: var(--surface-hover);
                    color: var(--primary);
                    transform: translateX(4px);
                }

                .actions-menu button.danger {
                    color: var(--danger);
                    border-top: 1px solid var(--border);
                }

                .actions-menu button.danger:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--danger);
                    transform: translateX(4px);
                }

                .actions-menu button.danger::before {
                    background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.1), transparent);
                }

                /* 🎯 MENU ITEM ICONS */
                .actions-menu button > span:first-child {
                    font-size: 1rem;
                    width: 1.25rem;
                    text-align: center;
                    flex-shrink: 0;
                }

                /* 🎪 Modals */
                .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.30);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
}

.modal-overlay.show {
    opacity: 1;
    visibility: visible;
    backdrop-filter: blur(4px);
    background: rgba(0, 0, 0, 0.30);
}

                .modal {
                    background: var(--surface);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-xl);
                    width: 100%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow: hidden;
                    transform: scale(0.9) translateY(20px);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    z-index: 1;
                }

                .modal-overlay.show .modal {
                    transform: scale(1) translateY(0);
                }

                .modal-header {
                    padding: 2rem 2rem 1rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: var(--text-secondary);
                    cursor: pointer;
                    width: 2rem;
                    height: 2rem;
                    border-radius: var(--radius);
                    transition: all 0.3s ease;
                }

                .modal-close:hover {
                    background: var(--danger);
                    color: white;
                }

                .modal-body {
                    padding: 2rem;
                    overflow-y: auto;
                    max-height: 60vh;
                }

                /* 📝 Forms */
                .lead-form {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group.full-width {
                    grid-column: 1 / -1;
                }

                .form-label {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }

                .form-input,
.form-textarea {
    padding: 0.875rem 1rem;
    border: 2px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.95rem;
    background: var(--background);
    color: var(--text-primary);
    transition: all 0.3s ease;
    font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
}
    /* 💰 Money Input with $ Symbol */
.money-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.currency-symbol {
    position: absolute;
    left: 1rem;
    color: var(--text-secondary);
    font-weight: 600;
    z-index: 1;
    pointer-events: none;
    font-size: 0.95rem;
}

.money-input-wrapper .money-input {
    padding-left: 2rem !important;
}

.money-input-wrapper .money-input:focus + .currency-symbol,
.money-input-wrapper:focus-within .currency-symbol {
    color: var(--primary);
}

/* 🔥 SEXY CUSTOM DROPDOWNS */
.form-select {
    position: relative;
    background: var(--background) !important;
    border: 2px solid var(--border);
    border-radius: var(--radius);
    padding: 0.875rem 2.5rem 0.875rem 1rem;
    font-size: 0.95rem;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: inherit;
    font-weight: 500;
    
    /* Custom arrow */
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.75rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
}

.form-select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
    background: var(--background);
}

.form-select:hover {
    border-color: var(--primary);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
    transform: translateY(-1px);
}

/* 💫 OPTION STYLING (limited browser support but looks cool where it works) */

/* 🎨 DYNAMIC STATUS BORDERS */
.form-select[name="status"][data-value="new"] {
    border-color: var(--info) !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25), 0 0 20px rgba(59, 130, 246, 0.3) !important;
}

.form-select[name="status"][data-value="contacted"] {
    border-color: var(--warning) !important;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.25), 0 0 20px rgba(245, 158, 11, 0.3) !important;
}

.form-select[name="status"][data-value="qualified"] {
    border-color: var(--success) !important;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25), 0 0 20px rgba(16, 185, 129, 0.3) !important;
}

.form-select[name="status"][data-value="negotiation"] {
    border-color: #F97316 !important;
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.25), 0 0 20px rgba(249, 115, 22, 0.3) !important;
}

.form-select[name="status"][data-value="closed"] {
    border-color: rgb(0, 255, 21) !important;
    box-shadow: 0 0 0 4px rgba(0, 255, 21, 0.25), 0 0 20px rgba(0, 255, 21, 0.3) !important;
}

.form-select[name="status"][data-value="lost"] {
    border-color: var(--danger) !important;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.25), 0 0 20px rgba(239, 68, 68, 0.3) !important;
}

/* 🔥 LEAD TYPE BORDERS */
.form-select[name="type"][data-value="cold"] {
    border-color: #3B82F6 !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25), 0 0 20px rgba(59, 130, 246, 0.3) !important;
}

.form-select[name="type"][data-value="warm"] {
    border-color: #F97316 !important;
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.25), 0 0 20px rgba(249, 115, 22, 0.3) !important;
}

/* 🎯 MOBILE RESPONSIVE */
@media (max-width: 768px) {
    .form-select {
        padding: 1rem 2.5rem 1rem 1rem;
        font-size: 1rem;
    }
}

                .form-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border);
                }

                .form-actions-right {
                    display: flex;
                    gap: 1rem;
                }

                .btn-primary,
                .btn-secondary,
                .btn-danger {
                    padding: 0.875rem 2rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .btn-primary {
                    background: var(--primary);
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: var(--primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .btn-secondary {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                    border: 1px solid var(--border);
                }

                .btn-secondary:hover {
                    background: var(--border);
                    border-color: var(--primary);
                    color: var(--primary);
                }

                .btn-danger {
                    background: var(--danger);
                    color: white;
                }

                .btn-danger:hover {
                    background: #dc2626;
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
                }

                .btn-loading {
                    display: none;
                }

                .hidden {
                    display: none !important;
                }

                /* 💬 Messages */
                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: var(--danger);
                    padding: 1rem;
                    border-radius: var(--radius);
                    margin-bottom: 1rem;
                    font-weight: 500;
                }

                .success-message {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    color: var(--success);
                    padding: 1rem;
                    border-radius: var(--radius);
                    margin-bottom: 1rem;
                    font-weight: 500;
                }

                /* 🚫 Empty State */
                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--text-secondary);
                }

                .empty-icon {
                    font-size: 4rem;
                    margin-bottom: 2rem;
                    opacity: 0.6;
                    display: block;
                }

                .empty-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                }

                .empty-subtitle {
                    font-size: 1.125rem;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }

                .empty-action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: var(--primary);
                    color: white;
                    padding: 1rem 2rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                }

                .empty-action-btn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                /* 🔄 Loading States */

                .loading-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 400px;
                    flex-direction: column;
                    gap: 2rem;
                }

                .loading-spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid var(--border);
                    border-top: 4px solid var(--primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .loading-text {
                    color: var(--text-secondary);
                    font-size: 1.125rem;
                    font-weight: 600;
                }

                .error-container {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--text-secondary);
                }

                .error-icon {
                    font-size: 4rem;
                    margin-bottom: 2rem;
                    opacity: 0.6;
                }

                .error-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                }

                .error-message {
                    margin-bottom: 2rem;
                    font-size: 1.125rem;
                    line-height: 1.6;
                }

                .retry-btn {
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

                .retry-btn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                /* 🔄 BUTTON LOADING SPINNER */
.btn-loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 0.5rem;
}

/* 🎯 Button loading state styling */
.btn-primary:disabled {
    opacity: 0.8;
    cursor: not-allowed;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.btn-secondary:disabled {
    opacity: 0.8;
    cursor: not-allowed;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

/* 🎯 Clickable row/item styles */
.clickable-row,
.clickable-item {
    cursor: pointer;
    transition: all 0.3s ease;
}

.clickable-row:hover {
    background: var(--surface-hover) !important;
    transform: scale(1.005);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.clickable-item:hover {
    transform: translateX(6px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

                /* 🎪 Animations */
                .fade-in {
                    animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* 📱 Responsive Design */
                @media (max-width: 1024px) {
                    .action-bubbles {
                        grid-template-columns: 1fr;
                    }

                    .table-header {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: stretch;
                    }

                    .table-header-right {
                        justify-content: space-between;
                    }

                    .search-input {
                        width: 200px;
                    }
                }

                @media (max-width: 768px) {
                    .addlead-container {
                        padding: 1rem;
                    }

                    .action-bubble {
                        flex-direction: column;
                        text-align: center;
                        gap: 1rem;
                    }

                    .bubble-icon {
                        width: 60px;
                        height: 60px;
                        font-size: 2rem;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }

                    .modal {
                        margin: 1rem;
                        max-height: 90vh;
                    }

                    .modal-header {
                        padding: 1.5rem 1.5rem 1rem;
                    }

                    .modal-body {
                        padding: 1.5rem;
                    }

                    .recent-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }

                    .recent-actions {
                        opacity: 1;
                    }

                    .search-input {
                        width: 100%;
                    }

                    .leads-table {
                        font-size: 0.8rem;
                    }

                    .leads-table th,
                    .leads-table td {
                        padding: 0.5rem;
                    }

                    .form-actions {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: stretch;
                    }

                    .form-actions-right {
                        flex-direction: column;
                    }
                }

                @media (max-width: 480px) {
                    .bubble-title {
                        font-size: 1.25rem;
                    }

                    .bubble-subtitle {
                        font-size: 0.9rem;
                    }

                    .modal-body {
                        max-height: 50vh;
                    }
                }
            </style>
        `;
    }
};

// 🚀 Initialize Module
if (typeof window !== 'undefined') {
    window.AddLeadModule = AddLeadModule;
    
    // Development helpers
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.addLeadDebug = () => ({
            version: AddLeadModule.version,
            leads: AddLeadModule.leads.length,
            currentView: AddLeadModule.currentView,
            searchTerm: AddLeadModule.searchTerm,
            isLoading: AddLeadModule.isLoading
        });
        console.log('🛠️ AddLead debug available at window.addLeadDebug()');
    }
}

console.log('🎯 CLEAN ADD LEAD MODULE v1.0 LOADED!');
console.log('✅ Simple, reliable, and Pipeline.js compatible!');
console.log('🚀 Available globally as: window.AddLeadModule');