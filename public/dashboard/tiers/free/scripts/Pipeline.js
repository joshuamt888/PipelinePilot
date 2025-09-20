/**
 * 🌿 STREAMLINED PIPELINE MODULE - FREE DASHBOARD EDITION
 * 
 * Complete 6-stage pipeline with clean design and mobile-first approach!
 * Active sales pipeline + outcome tracking in beautiful 3+3 layout.
 * Enhanced for mobile users with quick move functionality.
 * 
 * Features:
 * ✅ 6-stage pipeline (new → contacted → qualified | negotiation → closed → lost)
 * ✅ Monthly progress tracking with API integration
 * ✅ Smart drag & drop + mobile-friendly pipeline selector
 * ✅ Enhanced revenue tracking for outcome stages
 * ✅ Streamlined analytics focused on key metrics
 * ✅ Custom dropdown components with natural styling
 * ✅ Mobile-responsive design with touch-friendly interactions
 * 
 * @version 3.0.0 - Streamlined Free Dashboard Edition
 * @author SteadyManager Team
 */

window.PipelineModule = {
    // 🎬 Module State
    leads: [],
    filteredLeads: {},
    monthlyStats: { currentMonthLeads: 0, monthlyLeadLimit: 50 },
    targetContainer: 'pipeline-content',
    stages: [
        // Active Pipeline (Top Row) - Removed proposal
        { id: 'new', name: 'New Leads', icon: '🆕', color: 'var(--info)', row: 'active' },
        { id: 'contacted', name: 'Contacted', icon: '📞', color: 'var(--warning)', row: 'active' },
        { id: 'negotiation', name: 'Negotiation', icon: '🤝', color: '#F97316', row: 'active' },
        
        // Outcome Pipeline (Bottom Row)
        { id: 'qualified', name: 'Qualified', icon: '✅', color: 'var(--success)', row: 'outcome' },
        { id: 'closed', name: 'Closed Won', icon: '🎉', color: 'var(--success)', row: 'outcome' },
        { id: 'lost', name: 'Lost', icon: '❌', color: 'var(--danger)', row: 'outcome' }
    ],
    filters: {
        search: '',
        type: 'all',
        platform: 'all',
        score: 'all'
    },
    dragState: {
        isDragging: false,
        draggedLead: null,
        sourceColumn: null,
        dragElement: null
    },
    editState: {
        isEditing: false,
        editingLeadId: null,
        originalData: null
    },
    isLoading: false,
    version: '3.0.0',

    // 🚀 Initialize Pipeline
    async init(targetContainer = 'pipeline-content') {
    console.log('🌿 Streamlined Pipeline Module v3.0.0 initializing...');
    
    try {
        this.targetContainer = targetContainer; // ADD THIS LINE
        this.isLoading = true;
        this.renderLoadingState();
        
        // Load monthly stats first
        await this.loadMonthlyStats();
        
        // Load all leads
        await this.loadLeads();
        
        // Organize leads by status
        this.organizeLeads();
        
        // Render the streamlined pipeline (analytics will be fresh)
        this.render();
        
        // Setup all interactions
        this.setupDragAndDrop();
        this.setupFilters();
        this.setupEditingSystem();
        this.setupAnimations();
        this.setupClickToActivate();

        // Just clear filters - no analytics nonsense
        this.clearFilters();
        
        console.log('✅ Streamlined Pipeline Module ready!');
        
    } catch (error) {
        console.error('❌ Pipeline Module failed to initialize:', error);
        this.renderError('Failed to load pipeline. Please refresh and try again.');
    } finally {
        this.isLoading = false;
    }
},

    // 📊 Load Monthly Stats
    async loadMonthlyStats() {
        try {
            console.log('📊 Loading monthly lead statistics...');
            const stats = await API.getCurrentMonthStats();
            this.monthlyStats = {
                currentMonthLeads: stats.currentMonthLeads || 0,
                monthlyLeadLimit: stats.monthlyLeadLimit || 50
            };
            console.log(`📊 Monthly stats: ${this.monthlyStats.currentMonthLeads}/${this.monthlyStats.monthlyLeadLimit}`);
        } catch (error) {
            console.error('❌ Failed to load monthly stats:', error);
            // Keep default values
        }
    },

    // 📊 Load All Leads with Enhanced Error Handling
    async loadLeads() {
        try {
            console.log('📊 Loading user leads from database...');
            const leadData = await API.getLeads();
            
            // Handle different response formats
            if (leadData.all) {
                this.leads = leadData.all;
            } else if (Array.isArray(leadData)) {
                this.leads = leadData;
            } else if (leadData.leads) {
                this.leads = leadData.leads;
            } else {
                console.warn('Unexpected lead data format:', leadData);
                this.leads = [];
            }

            // Auto-assign "new" status to leads without status
            this.leads = this.leads.map(lead => ({
                ...lead,
                status: lead.status || 'new',
                potential_value: lead.potential_value || 0,
                loss_reason: lead.lost_reason || null,
                qualityScore: lead.qualityScore || lead.quality_score || 5,
                id: lead.id || this.generateId()
            }));

            console.log(`📊 Loaded ${this.leads.length} leads for streamlined pipeline`);
            
        } catch (error) {
            console.error('❌ Failed to load leads:', error);
            this.leads = [];
            throw error;
        }
    },

    organizeLeads() {
    // Add this guard at the top
    if (this._organizingInProgress) return;
    this._organizingInProgress = true;
    
    try {
        // Initialize empty arrays for each stage FIRST
        this.filteredLeads = {};
        this.stages.forEach(stage => {
            this.filteredLeads[stage.id] = [];
        });

        // Only proceed if we have leads
        if (!this.leads || !Array.isArray(this.leads)) {
            console.warn('No leads to organize');
            return; // This is now safe because of the finally block
        }

        // Sort leads into stages with validation
        this.leads.forEach(lead => {
            if (!lead || typeof lead !== 'object') {
                console.warn('Invalid lead object:', lead);
                return;
            }
            
            const status = lead.status || 'new';
            const validStatus = this.stages.find(stage => stage.id === status);
            const finalStatus = validStatus ? status : 'new';
            
            if (finalStatus !== lead.status) {
                lead.status = finalStatus;
                console.log(`🔧 Auto-corrected lead "${lead.name}" status to: ${finalStatus}`);
            }
            
            this.filteredLeads[finalStatus].push(lead);
        });

        // Apply filters
        this.applyFilters();
        
        // Only log if we want to see organization results (add this flag)
        if (this._shouldLogOrganization) {
            console.log('🗂️ Streamlined pipeline organization:');
            this.stages.forEach(stage => {
                const count = this.filteredLeads[stage.id]?.length || 0;
                console.log(`   ${stage.icon} ${stage.name}: ${count} leads`);
            });
            this._shouldLogOrganization = false; // Reset flag
        }
        
    } finally {
        // Always reset the flag, even if an error occurs
        this._organizingInProgress = false;
    }
},

    // 🔍 Apply Current Filters
    applyFilters() {
        const { search, type, source, score } = this.filters;
        
        this.stages.forEach(stage => {
            const stageLeads = this.leads.filter(lead => (lead.status || 'new') === stage.id);
            
            let filtered = stageLeads.filter(lead => {
                // Search filter
                if (search) {
                    const searchTerm = search.toLowerCase();
                    const matchesSearch = 
                        lead.name?.toLowerCase().includes(searchTerm) ||
                        lead.company?.toLowerCase().includes(searchTerm) ||
                        lead.email?.toLowerCase().includes(searchTerm);
                    if (!matchesSearch) return false;
                }
                
                // Type filter
                if (type !== 'all' && lead.type !== type) return false;
                
                // Source filter  
                if (source !== 'all' && lead.platform !== source) return false;
                
                // Score filter
                if (score !== 'all') {
                    const leadScore = lead.qualityScore || 5;
                    if (score === 'high' && leadScore < 8) return false;
                    if (score === 'medium' && (leadScore < 5 || leadScore > 7)) return false;
                    if (score === 'low' && leadScore > 4) return false;
                }
                
                return true;
            });
            
            this.filteredLeads[stage.id] = filtered;
        });
    },

    // 🎨 Render Streamlined Pipeline Interface
    render() {
        const container = document.getElementById(this.targetContainer); 
        if (!container) return;    
        container.innerHTML = `
        <div class="addlead-container fade-in"> 
            <div class="streamlined-pipeline-container fade-in">
                <!-- 🎯 STREAMLINED HEADER -->
                <div class="pipeline-header-streamlined">
                    <div class="header-content-section">
                        <div class="brand-section">
                            <h1 class="pipeline-title">
                                <span class="title-icon">🌿</span>
                                <span class="title-text">Sales Pipeline</span>
                            </h1>
                            <p class="pipeline-subtitle">Track and manage your leads from first contact to closed deals</p>
                        </div>
                        
                        <!-- 📊 MONTHLY PROGRESS BAR -->
                        <div class="monthly-progress-section">
                            ${this.renderMonthlyProgress()}
                        </div>
                    </div>
                    
                    <!-- 🔍 ENHANCED FILTERS -->
                    <div class="filters-section-streamlined">
                        <div class="search-group">
                            <div class="search-input-wrapper">
                                <input 
                                    type="text" 
                                    id="pipelineSearch" 
                                    class="search-input-streamlined" 
                                    placeholder="Search leads, companies, or emails..."
                                    value="${this.filters.search}"
                                >
                                <div class="search-icon">🔍</div>
                            </div>
                        </div>
                        
                        <div class="filter-controls-group">
                            ${this.renderCustomDropdown('typeFilter', 'All Temperatures', [
    { value: 'all', label: 'All Temperatures', icon: '🌡️' },
    { value: 'cold', label: 'Cold Leads', icon: '❄️' },
    { value: 'hot', label: 'Hot Leads', icon: '🔥' }
], this.filters.type)}

${this.renderCustomDropdown('scoreFilter', 'All Scores', [
    { value: 'all', label: 'All Scores', icon: '⭐' },
    { value: 'high', label: 'High (8-10)', icon: '🌟' },
    { value: 'medium', label: 'Medium (5-7)', icon: '⚡' },
    { value: 'low', label: 'Low (1-4)', icon: '📈' }
], this.filters.score)}
                            <button class="clear-filters-btn" id="clearFilters">
                                <span class="btn-icon">🔄</span>
                                <span class="btn-text">Reset</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 🏢 STREAMLINED PIPELINE BOARD -->
                <div class="pipeline-board-streamlined">
                    <!-- Active Pipeline Section -->
                    <div class="pipeline-section active-section">
                        <div class="section-header-streamlined">
                            <div class="section-title-group">
                                <h2 class="section-title">🎯 Active Pipeline</h2>
                                <div class="section-badge">${this.getActiveLeadsCount()} leads</div>
                            </div>
                        </div>
                        <div class="stages-grid active-stages">
                            ${this.renderStageRow('active')}
                        </div>
                    </div>
                    
                    <!-- Outcome Pipeline Section -->
                    <div class="pipeline-section outcome-section">
                        <div class="section-header-streamlined">
                            <div class="section-title-group">
                                <h2 class="section-title">🏁 Sales Outcomes</h2>
                                <div class="section-badge">${this.getOutcomeLeadsCount()} leads</div>
                            </div>
                            <div class="section-value">$${(this.calculateOutcomeValue() || 0).toLocaleString()}</div>
                        </div>
                        <div class="stages-grid outcome-stages">
                            ${this.renderStageRow('outcome')}
                        </div>
                    </div>
                </div>
                
                <!-- 📊 STREAMLINED ANALYTICS -->
                <div class="analytics-section-streamlined">
                    ${this.renderStreamlinedAnalytics()}
                </div>
            </div>

            <!-- ✏️ EDIT MODAL -->
            <div id="editModal" class="edit-modal-streamlined">
                <div class="modal-backdrop"></div>
                <div class="edit-modal-content">
                    <div class="modal-header">
                        <div class="modal-title-group">
                            <h3 class="modal-title">Edit Lead</h3>
                            <p class="modal-subtitle">Update lead information and settings</p>
                        </div>
                        <button class="modal-close-btn" id="closeEditModal">
                            <span class="close-icon">×</span>
                        </button>
                    </div>
                    <div class="modal-body" id="editModalBody">
                        <!-- Edit form will be inserted here -->
                    </div>
                </div>
            </div>

            <!-- 📱 MOBILE PIPELINE SELECTOR -->
            <div id="pipelineSelectorModal" class="pipeline-selector-modal">
                <div class="selector-backdrop" onclick="PipelineModule.closePipelineSelector()"></div>
                <div class="selector-content">
                    <div class="selector-header">
                        <h3 class="selector-title">Move Lead</h3>
                        <button class="selector-close" onclick="PipelineModule.closePipelineSelector()">×</button>
                    </div>
                    <div class="selector-body" id="selectorBody">
                        <!-- Pipeline options will be inserted here -->
                    </div>
                </div>
            </div>

            ${this.renderStreamlinedStyles()}
        `;

        // Initialize animations after render
        this.initializeAnimations();
        this.setupCustomDropdowns();

        // 🔥 ADD THIS - FORCE REFRESH DRAG & DROP ON EVERY RENDER
    setTimeout(() => {
        this.dragAndDropInitialized = false;
        this.setupDragAndDrop();
    }, 100);
    },

    // 📊 Render Monthly Progress Bar
    renderMonthlyProgress() {
        const percentage = Math.min((this.monthlyStats.currentMonthLeads / this.monthlyStats.monthlyLeadLimit) * 100, 100);
        const isNearLimit = percentage > 80;
        const isAtLimit = percentage >= 100;
        
        return `
            <div class="monthly-progress-container">
                <div class="progress-header">
                    <div class="progress-title">Lead Progress</div>
                    <div class="progress-stats">
                        <span class="current-count">${this.monthlyStats.currentMonthLeads}</span>
                        <span class="separator">/</span>
                        <span class="limit-count">${this.monthlyStats.monthlyLeadLimit}</span>
                        <span class="leads-text">leads</span>
                    </div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill ${isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}" 
                             style="width: ${percentage}%"></div>
                    </div>
                    <div class="progress-percentage">${Math.round(percentage)}%</div>
                </div>
                ${isAtLimit ? `
                    <div class="progress-warning at-limit">
                        <span class="warning-icon">⚠️</span>
                        <span class="warning-text">Monthly limit reached</span>
                    </div>
                ` : isNearLimit ? `
                    <div class="progress-warning near-limit">
                        <span class="warning-icon">🔔</span>
                        <span class="warning-text">Approaching monthly limit</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 🎨 Render Custom Dropdown
    renderCustomDropdown(id, placeholder, options, selectedValue) {
    const selected = options.find(opt => opt.value === selectedValue) || options[0];
    
    return `
        <div class="simple-dropdown-wrapper">
            <select class="simple-dropdown" id="${id}" data-dropdown="${id}">
                ${options.map(option => `
                    <option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>
                        ${option.icon} ${option.label}
                    </option>
                `).join('')}
            </select>
            <div class="dropdown-arrow">▼</div>
        </div>
    `;
},

    renderEditDropdown(id, placeholder, options, selectedValue) {
    const selected = options.find(opt => opt.value === selectedValue);
    
    // 🔥 IF WE HAVE A VALUE BUT NO MATCHING OPTION, CREATE A CUSTOM DISPLAY
    let displayOption;
    if (selected) {
        displayOption = selected;
    } else if (selectedValue && selectedValue !== '') {
        // Create a custom option for unknown values
        displayOption = { 
            value: selectedValue, 
            label: `${selectedValue} (current)`, 
            icon: '📋' 
        };
    } else {
        // No value, use placeholder (first option)
        displayOption = options[0];
    }
    
    return `
        <div class="edit-custom-dropdown" data-dropdown="${id}">
            <button type="button" class="edit-dropdown-trigger">
                <span class="dropdown-icon">${displayOption.icon}</span>
                <span class="dropdown-text">${displayOption.label}</span>
                <span class="dropdown-arrow">▼</span>
            </button>

            <div class="edit-dropdown-menu">
                ${options.map(option => `
                    <div class="edit-dropdown-option ${option.value === selectedValue ? 'selected' : ''}" 
                         data-value="${option.value}">
                        <span class="option-icon">${option.icon}</span>
                        <span class="option-text">${option.label}</span>
                        ${option.value === selectedValue ? '<span class="option-check">✓</span>' : ''}
                    </div>
                `).join('')}
            </div>
            <!-- Hidden input to store the actual value -->
            <input type="hidden" id="${id}" name="${id}" value="${selectedValue || ''}">
        </div>
    `;
},

    // 🏢 Render Stage Row
    renderStageRow(rowType) {
    const rowStages = this.stages.filter(stage => stage.row === rowType);
    
    return rowStages.map(stage => {
        const stageLeads = this.filteredLeads[stage.id] || [];
        const leadCount = stageLeads.length;
        const stageValue = this.calculateStageValue(stage.id);
        
        return `
            <div class="stage-column ${rowType}-stage" data-stage="${stage.id}">
                <div class="stage-header" style="--stage-color: ${stage.color}">
                    <div class="stage-title-group">
                        <div class="stage-icon">${stage.icon}</div>
                        <div class="stage-info">
                            <h3 class="stage-name">${stage.name}</h3>
                            <div class="stage-meta">
                                <span class="stage-value">$${(stageValue || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <!-- 🔥 JUST THE COUNT IN TOP RIGHT -->
                    <div class="stage-count-badge">
                        ${leadCount}
                    </div>
                </div>
                
                <div class="stage-content" data-stage-content="${stage.id}">
                    <div class="leads-container" data-leads-container="${stage.id}">
                        ${this.renderLeadsOrEmpty(stageLeads, stage)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
},

    // 📋 Render Lead Cards with Mobile Pipeline Selector
    renderLeads(leads, stage) {
        return leads.map(lead => {
            const typeIcon = this.getTypeIcon(lead.type);
            const scoreColor = this.getScoreColor(lead.qualityScore || 5);
            const hasDealValue = lead.potential_value && lead.potential_value > 0;
            const canHaveDealValue = true;
            const sourceIcon = this.getSourceIcon(lead.platform);
            
            return `
                <div 
                    class="lead-card ${stage.row}-card" 
                    data-lead-id="${lead.id}"
                    data-lead-status="${lead.status}"
                    draggable="true"
                >
                    <!-- Card Header -->
<div class="card-header">
    <div class="lead-avatar">
        <span class="avatar-text">${this.getInitials(lead.name)}</span>
    </div>
    <div class="lead-main-info">
        <h4 class="lead-name">${lead.name}</h4>
        <div class="lead-company">${lead.company || 'No company'}</div>
    </div>
    <div class="lead-meta">
        ${lead.qualityScore ? `
            <span class="lead-score-badge" style="background: ${scoreColor}">${lead.qualityScore}</span>
        ` : ''}
        <span class="lead-type-badge">${typeIcon}</span>
    </div>
</div>
                    
                    <!-- Card Body -->
                    <div class="card-body">
                        <div class="contact-info">
                            ${lead.email ? `<div class="contact-item"><span class="contact-icon">📧</span>${lead.email}</div>` : ''}
                            ${lead.phone ? `<div class="contact-item"><span class="contact-icon">📞</span>${lead.phone}</div>` : ''}
                        </div>
                        
                        ${lead.notes ? `
                            <div class="lead-notes">
                                ${this.truncate(lead.notes, 27)}
                            </div>
                        ` : ''}
                        
                        <!-- 💰 DEAL VALUE SECTION -->
                        ${canHaveDealValue ? `
                            <div class="deal-value-section">
                                ${hasDealValue ? `
                                    <div class="deal-value-display">
                                        <span class="value-icon">💰</span>
                                        <span class="value-amount">$${(parseFloat(lead.potential_value) || 0).toLocaleString()}</span>
                                        <button class="value-edit-btn" onclick="PipelineModule.editDealValue('${lead.id}')" title="Edit deal value">
                                            <span class="edit-icon">✏️</span>
                                        </button>
                                    </div>
                                ` : `
                                    <button class="deal-value-btn" onclick="PipelineModule.addDealValue('${lead.id}')" title="Add deal value">
                                        <span class="btn-icon">💰</span>
                                        <span class="btn-text">Add value</span>
                                    </button>
                                `}
                            </div>
                        ` : ''}
                        
                        <!-- ❌ LOSS REASON SECTION -->
${lead.status === 'lost' ? `
    <div class="loss-reason-section">
        ${lead.lost_reason ? `
            <div class="loss-reason-display">
                <span class="loss-icon">❌</span>
                <span class="loss-text">${lead.lost_reason}</span>
                <button class="loss-edit-btn" onclick="PipelineModule.editLossReason('${lead.id}')" title="Edit loss reason">
                    <span class="edit-icon">✏️</span>
                </button>
            </div>
        ` : `
            <button class="loss-reason-btn" onclick="PipelineModule.addLossReason('${lead.id}')" title="Add loss reason">
                <span class="btn-icon">❌</span>
                <span class="btn-text">Add loss reason</span>
            </button>
        `}
    </div>
` : ''}
                    </div>
                    
                    <!-- Card Footer with Simple Controls -->
<div class="card-footer-enhanced">
    <div class="card-date">
        ${this.formatDate(lead.created_at, 'short')}
    </div>
    <div class="engraved-controls">
        <button class="engraved-btn edit-btn" onclick="PipelineModule.editLead('${lead.id}')" title="Edit Lead">
            <span>✏️</span>
            <span>Edit</span>
        </button>
        <button class="engraved-btn move-btn" onclick="PipelineModule.showPipelineSelector('${lead.id}')" title="Move Stage">
            <span>➡️</span>
            <span>Move</span>
        </button>
    </div>
</div>
                </div>
            `;
        }).join('');
    },

    renderLeadsOrEmpty(leads, stage) {
    const leadCount = leads.length;
    const totalLeads = this.leads.length;
    
    // If no leads in this stage, show empty state
    if (leadCount === 0) {
        if (totalLeads === 0) {
            return `
                <div class="empty-state">
                    <span class="empty-icon">🎯</span>
                    <div class="empty-title">No leads yet!</div>
                    <div class="empty-subtitle">Start building your sales pipeline by adding your first lead</div>
                    <button class="add-lead-btn" onclick="loadPage('leads')">
                        <span class="btn-icon">➕</span>
                        <span class="btn-text">Add your first lead</span>
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <span class="empty-icon">${stage.icon}</span>
                    <div class="empty-title">No ${stage.name.toLowerCase()} yet</div>
                    <div class="empty-subtitle">Drag leads here from other stages or add new ones</div>
                </div>
            `;
        }
    }
    
    // If leads exist, render them
    return this.renderLeads(leads, stage);
},

    renderStreamlinedAnalytics() {
    // Calculate fresh data every time this is called
    const conversionRate = this.calculateConversionRate();
    const topLossReasons = this.getTopLossReasons();
    const outcomeValue = this.calculateOutcomeValue();
    
    return `
        <div class="analytics-header">
            <div class="analytics-title-group">
                <h2 class="analytics-title">📊 Key Insights</h2>
                <p class="analytics-subtitle">Track your pipeline performance</p>
            </div>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card primary">
                <div class="card-header-analytics">
                    <div class="card-icon-analytics">📈</div>
                    <div class="card-title-analytics">Conversion Rate</div>
                </div>
                <div class="card-content-analytics">
                    <div class="primary-metric">${conversionRate}%</div>
                    <div class="metric-detail">Closed vs Lost</div>
                </div>
            </div>
            
            <div class="analytics-card success">
                <div class="card-header-analytics">
                    <div class="card-icon-analytics">🎯</div>
                    <div class="card-title-analytics">Total Outcome Value</div>
                </div>
                <div class="card-content-analytics">
                    <div class="primary-metric">$${Math.round(outcomeValue).toLocaleString()}</div>
                    <div class="metric-detail">Negotiation + Closed + Lost</div>
                </div>
            </div>
            
            <div class="analytics-card danger">
                <div class="card-header-analytics">
                    <div class="card-icon-analytics">❌</div>
                    <div class="card-title-analytics">Top Loss Reason</div>
                </div>
                <div class="card-content-analytics">
                    <div class="primary-metric">${topLossReasons[0]?.reason || 'N/A'}</div>
                    <div class="metric-detail">${topLossReasons[0]?.count || 0} deals affected</div>
                </div>
            </div>
        </div>
    `;
},

    // Update the showPipelineSelector function
showPipelineSelector(leadId) {
    const lead = this.leads.find(l => l.id.toString() === leadId.toString());
    if (!lead) return;

    const modal = document.getElementById('pipelineSelectorModal');
    const body = document.getElementById('selectorBody');
    
    body.innerHTML = `
        <div class="pipeline-options">
            ${this.stages.map(stage => `
                <button class="pipeline-option ${stage.id === lead.status ? 'current' : ''}" 
                        onclick="PipelineModule.moveLeadToStage('${leadId}', '${stage.id}')"
                        ${stage.id === lead.status ? 'disabled' : ''}>
                    <div class="option-icon" style="background: ${stage.color}">${stage.icon}</div>
                    <div class="option-content">
                        <div class="option-name">${stage.name}</div>
                        <div class="option-description">${this.getStageDescription(stage.id)}</div>
                    </div>
                    ${stage.id === lead.status ? '<span class="current-badge">Current</span>' : ''}
                </button>
            `).join('')}
        </div>
    `;
    
    modal.classList.add('show');
},

    closePipelineSelector() {
        const modal = document.getElementById('pipelineSelectorModal');
        modal.classList.remove('show');
    },

   async moveLeadToStage(leadId, newStage) {
    this.closePipelineSelector();
    
    const lead = this.leads.find(l => l.id.toString() === leadId.toString());
    if (!lead || newStage === lead.status) return;
    
    // Use the same update method that drag & drop uses
    try {
        await API.updateLead(leadId, { status: newStage });
        
        // Update local data
        lead.status = newStage;
        
        // Refresh the whole pipeline
        await this.refreshPipeline();
        
    } catch (error) {
        console.error('Failed to move lead:', error);
        this.showNotification('Failed to move lead. Please try again.', 'error');
    }
},

    getStageDescription(stageId) {
        const descriptions = {
            'new': 'Fresh leads just added',
            'contacted': 'Initial contact made',
            'qualified': 'Potential confirmed',
            'negotiation': 'Deal terms discussed',
            'closed': 'Successfully won',
            'lost': 'Deal not won'
        };
        return descriptions[stageId] || '';
    },

    // 🎨 Enhanced Styling
    renderStreamlinedStyles() {
        return `
            <style>

                /* 🎯 STREAMLINED PIPELINE DESIGN SYSTEM */
                .streamlined-pipeline-container {
                    max-width: 1800px;
                    margin: 0 auto;
                    padding: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    --pipeline-primary: var(--primary);
                    --pipeline-success: var(--success);
                    --pipeline-warning: var(--warning);
                    --pipeline-danger: var(--danger);
                    --pipeline-info: var(--info);
                    --pipeline-radius: var(--radius-lg);
                    --pipeline-shadow: var(--shadow-lg);
                    --pipeline-transition: var(--transition);
                }

                /* 🎯 STREAMLINED HEADER */
                .pipeline-header-streamlined {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--pipeline-radius);
                    padding: 2rem;
                    margin-bottom: 2rem;
                    box-shadow: var(--pipeline-shadow);
                }

                .edit-custom-dropdown {
    position: relative;
    display: inline-block;
    width: 100%;
}

.edit-dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: var(--background);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-primary);
    cursor: pointer;
    transition: var(--transition);
    font-size: 0.95rem;
    font-weight: 500;
    width: 100%;
    font-family: inherit;
}

.edit-dropdown-trigger:hover {
    border-color: var(--primary);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.edit-dropdown-trigger:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.edit-dropdown-trigger .dropdown-icon {
    font-size: 0.9rem; /* SMALLER ICON */
    flex-shrink: 0;
}

.edit-dropdown-trigger .dropdown-text {
    flex: 1;
    text-align: left;
    font-size: 0.9rem; /* SMALLER TEXT */
}

.edit-dropdown-trigger .dropdown-arrow {
    font-size: 0.65rem; /* SMALLER ARROW */
    color: var(--text-tertiary);
    transition: transform 0.2s ease;
    flex-shrink: 0;
}

.edit-custom-dropdown.open .dropdown-arrow {
    transform: rotate(180deg);
}

.edit-dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px) scale(0.95);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
    overflow: hidden;
    max-height: 220px; /* SLIGHTLY SHORTER */
    overflow-y: auto;
}

.edit-custom-dropdown.open .edit-dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}

.edit-dropdown-option {
    display: flex;
    align-items: center;
    gap: 0.6rem; /* SMALLER GAP */
    padding: 0.7rem 0.875rem; /* SMALLER PADDING */
    cursor: pointer;
    transition: var(--transition);
    position: relative;
    border-bottom: 1px solid var(--border);
}

.edit-dropdown-option:last-child {
    border-bottom: none;
}

.edit-dropdown-option:hover {
    background: var(--surface-hover);
    color: var(--primary);
}

.edit-dropdown-option.selected {
    background: rgba(102, 126, 234, 0.1);
    color: var(--primary);
    font-weight: 600;
}

.edit-dropdown-option .option-icon {
    font-size: 0.85rem; /* SMALLER ICONS */
    flex-shrink: 0;
    width: 1.25rem; /* SMALLER WIDTH */
    text-align: center;
}

.edit-dropdown-option .option-text {
    flex: 1;
    font-size: 0.8rem; /* SMALLER TEXT */
    font-weight: 500;
}

.edit-dropdown-option .option-check {
    color: var(--primary);
    font-weight: 700;
    font-size: 0.7rem; /* SMALLER CHECK */
}

                .header-content-section {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    gap: 3rem;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .brand-section {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .pipeline-title {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                    line-height: 1.2;
                }

                .title-icon {
                    font-size: 1.75rem;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                }

                .title-text {
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .pipeline-subtitle {
                    color: var(--text-secondary);
                    font-size: 1.125rem;
                    margin: 0;
                    font-weight: 400;
                }

                /* 📊 MONTHLY PROGRESS BAR */
                .monthly-progress-container {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    min-width: 320px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }

                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .progress-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }

                .progress-stats {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-weight: 700;
                }

                .current-count {
                    color: var(--primary);
                    font-size: 1.125rem;
                }

                .separator {
                    color: var(--text-tertiary);
                    font-size: 1rem;
                }

                .limit-count {
                    color: var(--text-secondary);
                    font-size: 1rem;
                }

                .leads-text {
                    color: var(--text-tertiary);
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .progress-bar-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 0.75rem;
                }

                .progress-bar-track {
                    flex: 1;
                    height: 8px;
                    background: var(--surface-hover);
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: var(--success);
                    border-radius: 4px;
                    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }

                .progress-bar-fill.near-limit {
                    background: var(--warning);
                }

                .progress-bar-fill.at-limit {
                    background: var(--danger);
                }

                .progress-bar-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                }

                .progress-percentage {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    min-width: 35px;
                    text-align: right;
                }

                .progress-warning {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: var(--radius);
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .progress-warning.near-limit {
                    background: rgba(245, 158, 11, 0.1);
                    color: var(--warning);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                }

                .progress-warning.at-limit {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--danger);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }

                .warning-icon {
                    font-size: 1rem;
                }

                /* 🎨 CUSTOM DROPDOWNS */
                .custom-dropdown {
                    position: relative;
                    display: inline-block;
                }

                .dropdown-trigger {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem 1.25rem;
                    background: var(--background);
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    font-size: 0.9rem;
                    font-weight: 500;
                    min-width: 140px;
                    position: relative;
                    overflow: hidden;
                }

                .dropdown-trigger::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, transparent, rgba(102, 126, 234, 0.05), transparent);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .dropdown-trigger:hover::before {
                    opacity: 1;
                }

                .dropdown-trigger:hover {
                    border-color: var(--primary);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                }

                .dropdown-trigger:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .dropdown-icon {
                    font-size: 1rem;
                    flex-shrink: 0;
                }

                .dropdown-text {
                    flex: 1;
                    text-align: left;
                }

                .dropdown-arrow {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    transition: transform 0.2s ease;
                    flex-shrink: 0;
                }

                .custom-dropdown.open .dropdown-arrow {
                    transform: rotate(180deg);
                }

                .dropdown-menu {
                    position: absolute;
                    top: calc(100% + 0.5rem);
                    left: 0;
                    right: 0;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-10px) scale(0.95);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(10px);
                    overflow: hidden;
                }

                .custom-dropdown.open .dropdown-menu {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0) scale(1);
                }

                .dropdown-option {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.875rem 1rem;
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    position: relative;
                    border-bottom: 1px solid var(--border);
                }

                .dropdown-option:last-child {
                    border-bottom: none;
                }

                .dropdown-option:hover {
                    background: var(--surface-hover);
                    color: var(--primary);
                }

                .dropdown-option.selected {
                    background: rgba(102, 126, 234, 0.1);
                    color: var(--primary);
                    font-weight: 600;
                }

                .option-icon {
                    font-size: 1rem;
                    flex-shrink: 0;
                    width: 1.5rem;
                    text-align: center;
                }

                .option-text {
                    flex: 1;
                    font-size: 0.9rem;
                }

                .option-check {
                    color: var(--primary);
                    font-weight: 700;
                    font-size: 0.8rem;
                }

                /* 🔍 ENHANCED FILTERS */
                .filters-section-streamlined {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    gap: 2rem;
                    align-items: center;
                }

                .search-group {
                    display: flex;
                    gap: 1rem;
                }

                .search-input-wrapper {
                    position: relative;
                    flex: 1;
                    max-width: 400px;
                }

                .search-input-streamlined {
                    width: 100%;
                    padding: 1rem 1rem 1rem 3rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    font-size: 1rem;
                    background: var(--background);
                    color: var(--text-primary);
                    transition: var(--pipeline-transition);
                    font-weight: 500;
                }

                .search-input-streamlined:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                    transform: translateY(-1px);
                }

                .search-input-streamlined::placeholder {
                    color: var(--text-tertiary);
                }

                .search-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                    font-size: 1.125rem;
                    pointer-events: none;
                }

                .filter-controls-group {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }

                .clear-filters-btn {
                    padding: 1rem 1.5rem;
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    font-size: 0.9rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .clear-filters-btn:hover {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
                }

                /* 🏢 STREAMLINED PIPELINE BOARD */
                .pipeline-board-streamlined {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .pipeline-section {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--pipeline-radius);
                    padding: 1.5rem;
                    box-shadow: var(--pipeline-shadow);
                }

                .section-header-streamlined {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .section-title-group {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .section-title {
                    font-size: 1.375rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .section-badge {
                    background: rgba(102, 126, 234, 0.1);
                    color: var(--primary);
                    padding: 0.375rem 0.875rem;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    border: 1px solid rgba(102, 126, 234, 0.2);
                }

                .section-value {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--success);
                    text-align: right;
                }

                .stages-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                }

                /* 🏛️ STAGE COLUMNS */
                .stage-column {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    min-height: 500px;
                    display: flex;
                    flex-direction: column;
                    transition: var(--pipeline-transition);
                    position: relative;
                }

                .stage-column::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: var(--stage-color);
                    z-index: 1;
                }

                .stage-column:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-xl);
                }

                .stage-header {
                    padding: 1.5rem;
                    background: var(--surface-hover);
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .stage-count-badge {
    color: var(--text-primary);
    border-radius: 12px;
    font-weight: 700;
    font-size: 1.5rem;
    min-width: 2rem;
    text-align: center;
    box-shadow: none;
}

                .stage-title-group {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex: 1;
                }

                .stage-icon {
                    font-size: 2rem;
                    width: auto;
                    height: 2.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius);
                    flex-shrink: 0;
                    margin-top: 0.125rem;
                }

                .stage-info {
                    flex: 1;
                }

                .stage-name {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 0.5rem 0;
                    line-height: 1.2;
                }

                .stage-meta {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .stage-count {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                .stage-value {
                    font-size: 0.85rem;
                    color: var(--success);
                    font-weight: 700;
                }

                .stage-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .stage-action-btn {
                    width: 2rem;
                    height: 2rem;
                    border: none;
                    border-radius: var(--radius);
                    background: var(--stage-color);
                    color: white;
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                }

                .stage-action-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }

                .stage-content {
                    flex: 1;
                    padding: 1rem;
                    overflow-y: auto;
                    max-height: 600px;
                }
                    

                /* 📋 LEAD CARDS */
                .leads-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .lead-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.25rem;
                    cursor: grab;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }

                .lead-card:hover {
                    border-color: var(--primary);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                    transform: translateY(-3px);
                }

                .lead-card.dragging {
                    opacity: 0.8;
                    transform: rotate(2deg) scale(1.0);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
                    cursor: grabbing;
                    z-index: 1000;
                }

                /* 🎯 SIMPLIFIED DROPDOWN STYLES */
.simple-dropdown-wrapper {
    position: relative;
    display: inline-block;
}

.simple-dropdown {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background: var(--background);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 3rem 1rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 140px;
    font-family: inherit;
}

.simple-dropdown:hover {
    border-color: var(--primary);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.simple-dropdown:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.dropdown-arrow {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    color: var(--text-tertiary);
    pointer-events: none;
    transition: transform 0.2s ease;
}

.simple-dropdown:focus + .dropdown-arrow {
    transform: translateY(-50%) rotate(180deg);
}

/* 📱 Mobile optimizations */
@media (max-width: 768px) {
    .simple-dropdown {
        padding: 1.1rem 3rem 1.1rem 1.25rem;
        font-size: 16px; /* Prevents zoom on iOS */
    }
}

/* Enhanced activated state - stronger glow for all devices */
.lead-card.card-activated {
    border-color: var(--primary) !important;
    box-shadow: 
        0 0 0 3px rgba(102, 126, 234, 0.4),
        0 12px 35px rgba(102, 126, 234, 0.25),
        0 0 20px rgba(102, 126, 234, 0.3) !important;
    transform: translateY(-3px);
    background: linear-gradient(135deg, var(--surface) 0%, rgba(102, 126, 234, 0.02) 100%);
    z-index: 50;
    position: relative;
}

/* Force actions to stay visible on activated cards */
.lead-card.card-activated .card-actions {
    opacity: 1 !important;
    transform: translateY(0);
    pointer-events: all;
}

/* Enhanced action buttons on activated cards */
.lead-card.card-activated .action-btn {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(12px);
    border: 2px solid rgba(255, 255, 255, 0.9);
    transform: scale(1.05);
}

/* Subtle click indicator for all users */
.lead-card {
    cursor: pointer;
    position: relative;
}

.lead-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    border-radius: inherit;
}

.lead-card.card-activated::before {
    opacity: 1;
}

/* Keep existing hover behavior for desktop */
@media (min-width: 769px) {
    .lead-card:hover .card-actions {
        opacity: 1;
    }
    
    /* Hover + activated = extra special */
    .lead-card.card-activated:hover {
        box-shadow: 
            0 0 0 3px rgba(102, 126, 234, 0.5),
            0 15px 40px rgba(102, 126, 234, 0.3),
            0 0 25px rgba(102, 126, 234, 0.4) !important;
        transform: translateY(-4px);
    }
}

/* Mobile enhancements */
@media (max-width: 768px) {
    /* Larger touch targets on mobile */
    .lead-card.card-activated .action-btn {
        width: 2.75rem;
        height: 2.75rem;
        font-size: 1rem;
    }
    
    /* Prevent text selection on mobile */
    .lead-card {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
    }
    
    /* Activated cards get priority z-index on mobile */
    .lead-card.card-activated {
        z-index: 100;
    }
}

/* Smooth transitions for all states */
.lead-card,
.card-actions,
.action-btn {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus styles for accessibility */
.lead-card:focus {
    outline: 3px solid rgba(102, 126, 234, 0.5);
    outline-offset: 2px;
}

/* Add stage-specific outlines */
.lead-card[data-lead-status="new"] {
    border: 2px solid var(--info);
}

.lead-card[data-lead-status="contacted"] {
    border: 2px solid var(--warning);
}

.lead-card[data-lead-status="qualified"] {
    border: 2px solid var(--success);
}

.lead-card[data-lead-status="negotiation"] {
    border: 2px solid #F97316; /* Purple */
}

.lead-card[data-lead-status="closed"] {
    border: 2px solid rgb(0, 255, 21); /* green - ADDED SPACE! */
}

.lead-card[data-lead-status="lost"] {
    border: 2px solid var(--danger); /* Red */
}

                .card-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .lead-avatar {
                    width: 2.5rem;
                    height: 2.5rem;
                    border-radius: var(--radius);
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                }

                .avatar-text {
                    color: white;
                    font-weight: 700;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                }

                .lead-main-info {
                    flex: 1;
                    min-width: 0;
                }

                .lead-name {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 0.25rem 0;
                    line-height: 1.3;
                }

                .lead-company {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .lead-meta {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-shrink: 0;
                }

                .lead-type-badge {
                    font-size: 1.125rem;
                }

                .lead-score-badge {
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 9999px;
                    font-weight: 700;
                    font-size: 0.75rem;
                    min-width: 2rem;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .card-body {
                    margin-bottom: 1rem;
                }

                .contact-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .contact-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .contact-icon {
                    font-size: 0.9rem;
                    width: 1.25rem;
                    flex-shrink: 0;
                }

                .lead-notes {
                    font-size: 0.8rem;
                    color: var(--text-tertiary);
                    font-style: italic;
                    line-height: 1.4;
                    margin-bottom: 0.75rem;
                    padding: 0.75rem;
                    background: var(--surface-hover);
                    border-radius: var(--radius);
                    border-left: 3px solid var(--border);
                }

                /* 💰 DEAL VALUE SECTION */
                .deal-value-section {
                    margin-bottom: 0.75rem;
                }

                .deal-value-display {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: rgba(16, 185, 129, 0.1);
                    border-radius: var(--radius);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    position: relative;
                    transition: var(--pipeline-transition);
                }

                .deal-value-display:hover {
                    background: rgba(16, 185, 129, 0.15);
                    border-color: var(--success);
                }

                .value-icon {
                    font-size: 1rem;
                }

                .value-amount {
                    font-weight: 700;
                    color: var(--success);
                    font-size: 0.9rem;
                    flex: 1;
                }

                .value-edit-btn {
                    background: none;
                    border: none;
                    color: var(--success);
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: var(--radius);
                    transition: var(--pipeline-transition);
                    opacity: 0;
                    font-size: 0.8rem;
                }

                .deal-value-display:hover .value-edit-btn {
                    opacity: 1;
                }


/* 🔥 MOBILE: ALWAYS SHOW EDIT BUTTONS */
@media (max-width: 768px) {
    .value-edit-btn {
        opacity: 1 !important; /* Always visible on mobile */
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        border-radius: 6px;
        padding: 0.4rem;
    }
    
    .value-edit-btn:active {
        background: rgba(16, 185, 129, 0.2);
        transform: scale(0.95);
    }
}

                .value-edit-btn:hover {
                    background: rgba(16, 185, 129, 0.2);
                    transform: scale(1.1);
                }

                .deal-value-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: rgba(102, 126, 234, 0.1);
                    border: 1px solid rgba(102, 126, 234, 0.2);
                    border-radius: var(--radius);
                    color: var(--primary);
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    font-size: 0.8rem;
                    font-weight: 600;
                    width: 100%;
                    justify-content: center;
                }

                .deal-value-btn:hover {
                    background: rgba(102, 126, 234, 0.2);
                    border-color: var(--primary);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                /* ❌ LOSS REASON SECTION */
                .loss-reason-section {
                    margin-bottom: 0.75rem;
                }

                .loss-reason-display {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: var(--radius);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    position: relative;
                    transition: var(--pipeline-transition);
                }

                .loss-reason-display:hover {
                    background: rgba(239, 68, 68, 0.15);
                    border-color: var(--danger);
                }

                .loss-icon {
                    font-size: 0.9rem;
                }

                .loss-text {
                    font-size: 0.8rem;
                    color: var(--danger);
                    font-weight: 600;
                    flex: 1;
                }

                .loss-edit-btn {
                    background: none;
                    border: none;
                    color: var(--danger);
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: var(--radius);
                    transition: var(--pipeline-transition);
                    opacity: 0;
                    font-size: 0.8rem;
                }

                .loss-reason-display:hover .loss-edit-btn {
                    opacity: 1;
                }

                /* 🔥 MOBILE: ALWAYS SHOW EDIT BUTTONS */
@media (max-width: 768px) {
    .loss-edit-btn {
        opacity: 1 !important; /* Always visible on mobile */
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 6px;
        padding: 0.4rem;
    }
    
    .loss-edit-btn:active {
        background: rgba(239, 68, 68, 0.2);
        transform: scale(0.95);
    }
}

                .loss-edit-btn:hover {
                    background: rgba(239, 68, 68, 0.2);
                    transform: scale(1.1);
                }

                .loss-reason-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: var(--radius);
                    color: var(--danger);
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    font-size: 0.8rem;
                    font-weight: 600;
                    width: 100%;
                    justify-content: center;
                }

                .loss-reason-btn:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: var(--danger);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }

                /* 🎯 SIMPLE SLEEK CARD FOOTER CONTROLS */
.card-footer-enhanced {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 0 0;
    border-top: 1px solid var(--border);
    margin-top: 0.75rem;
}

.card-date {
    color: var(--text-tertiary);
    font-weight: 500;
    font-size: 0.75rem;
}

.engraved-controls {
    display: flex;
    gap: 0.75rem;
}

.engraved-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--background);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.engraved-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: rgba(102, 126, 234, 0.05);
    transform: translateY(-1px);
}

.edit-btn:hover {
    border-color: var(--warning);
    color: var(--warning);
    background: rgba(245, 158, 11, 0.05);
}

/* 📱 Mobile Optimizations */
@media (max-width: 768px) {
    .engraved-btn {
        padding: 0.625rem 0.875rem;
        font-size: 0.8rem;
    }
    
    .engraved-controls {
        gap: 0.5rem;
    }
}

/* 🧹 Clean Removal of Old Styles */
.card-actions,
.action-btn {
    display: none !important;
}

                /* 📱 MOBILE PIPELINE SELECTOR */
                .pipeline-selector-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 2rem;
}

                .pipeline-selector-modal.show {
                    opacity: 1;
                    visibility: visible;
                }

                .selector-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                }

                .selector-content {
    background: var(--surface);
    border-radius: 24px;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 500px;
    max-height: 80vh;
    overflow: hidden;
    transform: scale(0.9);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border);
}

                .pipeline-selector-modal.show .selector-content {
    transform: scale(1);
}

                .selector-header {
                    padding: 1.5rem 1.5rem 1rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--surface-hover);
                }

                .selector-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .selector-close {
                    background: none;
                    border: none;
                    width: 2rem;
                    height: 2rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                    font-size: 1.25rem;
                }

                .selector-close:hover {
                    background: var(--danger);
                    color: white;
                }

                .selector-body {
                    padding: 1rem;
                    overflow-y: auto;
                    max-height: 50vh;
                }

                .pipeline-options {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .pipeline-option {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 1.25rem;
                    background: var(--background);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    text-align: left;
                    position: relative;
                    overflow: hidden;
                }

                .pipeline-option:hover:not(:disabled) {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                }

                .pipeline-option:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background: var(--surface-hover);
                }

                .pipeline-option.current {
                    border-color: var(--success);
                    background: rgba(16, 185, 129, 0.05);
                }

                .option-icon {
                    width: 3rem;
                    height: 3rem;
                    border-radius: var(--radius);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    color: white;
                    flex-shrink: 0;
                }

                .option-content {
                    flex: 1;
                }

                .option-name {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .option-description {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .current-badge {
                    background: var(--success);
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* 📊 STREAMLINED ANALYTICS */
                .analytics-section-streamlined {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--pipeline-radius);
                    padding: 2rem;
                    box-shadow: var(--pipeline-shadow);
                }

                .analytics-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .analytics-title-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .analytics-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                }

                .analytics-subtitle {
                    color: var(--text-secondary);
                    font-size: 1rem;
                    margin: 0;
                }

                .analytics-actions {
                    display: flex;
                    gap: 1rem;
                }

                .analytics-btn {
                    padding: 0.75rem 1.5rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                }

                .analytics-btn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                .analytics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1.5rem;
                }

                .analytics-card {
                    background: var(--background);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    transition: var(--pipeline-transition);
                    position: relative;
                    overflow: hidden;
                }

                .analytics-card.primary { --card-accent: var(--pipeline-primary); }
                .analytics-card.success { --card-accent: var(--pipeline-success); }
                .analytics-card.danger { --card-accent: var(--pipeline-danger); }

                .analytics-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-xl);
                    border-color: var(--card-accent);
                }

                .card-header-analytics {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .card-icon-analytics {
                    font-size: 1.5rem;
                    width: 2.5rem;
                    height: 2.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius);
                }

                .card-title-analytics {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .card-content-analytics {
                    text-align: left;
                }

                .primary-metric {
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    line-height: 1;
                    margin-bottom: 0.5rem;
                }

                .metric-detail {
                    font-size: 0.8rem;
                    color: var(--text-tertiary);
                    font-weight: 500;
                }

                /* ✏️ EDIT MODAL */
                .edit-modal-streamlined {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    padding: 2rem;
                }

                .edit-modal-streamlined.show {
                    opacity: 1;
                    visibility: visible;
                }

                .modal-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                }

                .edit-modal-content {
                    background: var(--surface);
                    border-radius: 24px;
                    box-shadow: var(--shadow-2xl);
                    width: 100%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow: hidden;
                    transform: scale(0.9) translateY(20px);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    z-index: 1;
                    border: 1px solid var(--border);
                }

                .edit-modal-streamlined.show .edit-modal-content {
                    transform: scale(1) translateY(0);
                }

                .modal-header {
                    padding: 2rem 2rem 1rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    background: var(--surface-hover);
                }

                .modal-title-group {
                    flex: 1;
                }

                .modal-title {
                    font-size: 1.375rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0 0 0.25rem 0;
                }

                .modal-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    margin: 0;
                }

                .modal-close-btn {
                    background: none;
                    border: none;
                    width: 2.5rem;
                    height: 2.5rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                    flex-shrink: 0;
                }

                .modal-close-btn:hover {
                    background: var(--danger);
                    color: white;
                    transform: scale(1.1);
                }

                .close-icon {
                    font-size: 1.5rem;
                    font-weight: 300;
                    line-height: 1;
                }

                .modal-body {
                    padding: 2rem;
                    overflow-y: auto;
                    max-height: 60vh;
                }

                /* 🚫 EMPTY STATE */
                .empty-state {
                    text-align: center;
                    padding: 3rem 1.5rem;
                    color: var(--text-tertiary);
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.6;
                    display: block;
                }

                .empty-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                .empty-subtitle {
                    font-size: 0.9rem;
                    color: var(--text-tertiary);
                    line-height: 1.5;
                    margin-bottom: 1.5rem;
                }

                .add-lead-btn {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 0.875rem 1.75rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--pipeline-transition);
                    font-size: 0.9rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .add-lead-btn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                .scroll-indicator {
                    text-align: center;
                    color: var(--text-tertiary);
                    font-size: 0.75rem;
                    margin-top: 1rem;
                    padding: 0.5rem;
                    animation: bounce 2s infinite;
                    font-weight: 500;
                }

                /* 🎯 DRAG & DROP FEEDBACK */
                .stage-content.drop-zone-available {
                    background: rgba(102, 126, 234, 0.05);
                    border: 2px dashed rgba(102, 126, 234, 0.3);
                    border-radius: var(--radius);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }

                .stage-content.drop-zone-active {
                    background: rgba(102, 126, 234, 0.1);
                    border: 2px dashed var(--primary);
                    border-radius: var(--radius);
                    transform: scale(1.02);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
                }

                .stage-content.drop-zone-source {
                    background: rgba(245, 158, 11, 0.05);
                    border: 2px dashed rgba(245, 158, 11, 0.3);
                    border-radius: var(--radius);
                    opacity: 0.7;
                }

                /* 📱 RESPONSIVE DESIGN */
                @media (max-width: 1400px) {
                    .header-content-section {
                        grid-template-columns: 1fr;
                        gap: 2rem;
                        text-align: center;
                    }

                    .monthly-progress-container {
                        min-width: auto;
                        max-width: 400px;
                        margin: 0 auto;
                    }
                }

                @media (max-width: 1024px) {
                    .pipeline-header-streamlined {
                        padding: 1.5rem;
                    }

                    .filters-section-streamlined {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }

                    .filter-controls-group {
                        justify-content: center;
                        flex-wrap: wrap;
                    }

                    .stages-grid {
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    }

                    .analytics-grid {
                        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .streamlined-pipeline-container {
                        padding: 0 1rem;
                    }

                    .pipeline-header-streamlined,
                    .pipeline-section,
                    .analytics-section-streamlined {
                        padding: 1rem;
                    }

                    .stages-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }

                    .stage-content {
                        max-height: 400px;
                    }

                    .card-actions {
                        opacity: 1;
                    }

                    .analytics-grid {
                        grid-template-columns: 1fr;
                    }

                    .edit-modal-streamlined {
                        padding: 1rem;
                    }

                    .modal-body {
                        padding: 1.5rem;
                        max-height: 50vh;
                    }

                    .search-input-wrapper {
                        max-width: none;
                    }

                    .header-content-section {
                        grid-template-columns: 1fr;
                        text-align: left;
                    }

                    .monthly-progress-container {
                        min-width: auto;
                    }
                }

                /* 🎪 ANIMATIONS */
                .fade-in {
                    animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .slide-in-up {
                    animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .scale-in {
                    animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }

                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-8px); }
                    60% { transform: translateY(-4px); }
                }

                /* 🔔 NOTIFICATIONS */
                .notification {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-left: 4px solid var(--notification-color);
                    border-radius: var(--radius-lg);
                    padding: 1rem 1.5rem;
                    box-shadow: var(--shadow-xl);
                    z-index: 9999;
                    animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    max-width: 400px;
                    backdrop-filter: blur(10px);
                }

                .notification.success { --notification-color: var(--success); }
                .notification.error { --notification-color: var(--danger); }
                .notification.warning { --notification-color: var(--warning); }
                .notification.info { --notification-color: var(--info); }

                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .notification-icon {
                    font-size: 1.25rem;
                    flex-shrink: 0;
                }

                .notification-text {
                    color: var(--text-primary);
                    font-weight: 500;
                    font-size: 0.9rem;
                    line-height: 1.4;
                }

                .notification-close {
                    background: none;
                    border: none;
                    color: var(--text-tertiary);
                    cursor: pointer;
                    font-size: 1.25rem;
                    padding: 0;
                    margin-left: auto;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius);
                    transition: var(--pipeline-transition);
                    flex-shrink: 0;
                }

                .notification-close:hover {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                }

                .source-dropdown-container {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .source-select {
                    flex: 1;
                }

                .view-more-sources-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .view-more-sources-btn:hover {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                    transform: translateY(-1px);
                }

                .view-more-sources-btn.expanded {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }
            </style>
        `;
    },

    calculateOutcomeValue() {
    try {
        if (!this.leads || !Array.isArray(this.leads)) {
            return 0;
        }
        
        const outcomeStages = ['qualified', 'closed', 'lost'];
        let total = 0;
        
        this.leads.forEach(lead => {
            if (outcomeStages.includes(lead.status)) {
                const value = Number(lead.potential_value) || 0;
                total += value;
            }
        });
        
        return total;
    } catch (error) {
        console.error('Error calculating outcome value:', error);
        return 0;
    }
},

    calculateStageValue(stageId) {
    const stageLeads = this.filteredLeads[stageId] || [];
    return stageLeads.reduce((total, lead) => {
        // Super safe number conversion
        const value = lead.potential_value;
        const numericValue = (value === null || value === undefined || value === '' || isNaN(Number(value))) ? 0 : Number(value);
        return total + numericValue;
    }, 0);
},

    getActiveLeadsCount() {
        const activeStages = ['new', 'contacted', 'negotiation'];
        return activeStages.reduce((total, stage) => total + (this.filteredLeads[stage]?.length || 0), 0);
    },

    getOutcomeLeadsCount() {
        const outcomeStages = ['qualified', 'closed', 'lost'];
        return outcomeStages.reduce((total, stage) => total + (this.filteredLeads[stage]?.length || 0), 0);
    },

    calculateConversionRate() {
    try {
        if (!this.leads || !Array.isArray(this.leads) || this.leads.length === 0) {
            return 0;
        }
        
        // Get closed won and lost leads
        const closedWonLeads = this.leads.filter(l => l.status === 'closed').length;
        const lostLeads = this.leads.filter(l => l.status === 'lost').length;
        
        // Calculate total outcome deals (closed + lost)
        const totalOutcomeDeals = closedWonLeads + lostLeads;
        
        // Return win rate as percentage of outcome deals
        return totalOutcomeDeals > 0 ? Math.round((closedWonLeads / totalOutcomeDeals) * 100) : 0;
    } catch (error) {
        console.error('Error calculating conversion rate:', error);
        return 0;
    }
},

    getTopLossReasons() {
    try {
        if (!this.leads || !Array.isArray(this.leads)) {
            return [];
        }
        
        const lostLeads = this.leads.filter(l => l.status === 'lost');
        const reasonCounts = {};
        
        lostLeads.forEach(lead => {
            if (lead.lost_reason) {
                const reason = lead.lost_reason;
                reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
            }
        });
        
        return Object.entries(reasonCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([reason, count]) => ({ reason, count }));
    } catch (error) {
        console.error('Error getting loss reasons:', error);
        return [];
    }
},

    setupCustomDropdowns() {
    document.querySelectorAll('.simple-dropdown').forEach(select => {
        select.addEventListener('change', (e) => {
            const value = e.target.value;
            const dropdownId = e.target.dataset.dropdown;
            
            // Update filter based on dropdown ID
            if (dropdownId === 'typeFilter') {
                this.filters.type = value;
            } else if (dropdownId === 'scoreFilter') {
                this.filters.score = value;
            }
            
            this.applyFiltersAndRerender();
        });
    });
},

    // Continue with other essential methods...
    renderEmptyState(stage) {
        const totalLeads = this.leads.length;
        
        if (totalLeads === 0) {
            return `
                <div class="empty-state">
                    <span class="empty-icon">🎯</span>
                    <div class="empty-title">No leads yet!</div>
                    <div class="empty-subtitle">Start building your sales pipeline by adding your first lead</div>
                    <button class="add-lead-btn" onclick="loadPage('leads')">
                        <span class="btn-icon">➕</span>
                        <span class="btn-text">Add your first lead</span>
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <span class="empty-icon">${stage.icon}</span>
                    <div class="empty-title">No ${stage.name.toLowerCase()} yet</div>
                    <div class="empty-subtitle">Drag leads here from other stages or add new ones</div>
                </div>
            `;
        }
    },

    // 💰 ENHANCED Add Deal Value Function with Better Error Handling
async addDealValue(leadId) {
    const lead = this.leads.find(l => l.id.toString() === leadId.toString());
    if (!lead) return;
    
    // Create enhanced popup with better validation
    const popup = document.createElement('div');
    popup.className = 'cool-popup-overlay';
    popup.innerHTML = `
        <div class="cool-popup">
            <div class="popup-header">
                <h3 class="popup-title">Add Deal Value</h3>
                <button class="popup-close" onclick="this.closest('.cool-popup-overlay').remove()">×</button>
            </div>
            
            <div class="popup-body">
                <div class="new-deal-banner">
                    <span class="banner-icon">💰</span>
                    <div class="banner-content">
                        <div class="banner-title">Set Deal Value</div>
                        <div class="banner-subtitle">Add potential revenue for ${lead.name}</div>
                    </div>
                </div>
                
                <div class="input-group">
                    <div class="currency-input">
                        <span class="currency-symbol">$</span>
                        <input type="number" 
                               id="dealValueInput" 
                               class="value-input" 
                               placeholder="Enter amount"
                               min="1" 
                               max="999999999"
                               step="1"
                               autofocus>
                    </div>
                    <!-- Error message container -->
                    <div class="error-message" id="errorMessage" style="display: none;"></div>
                </div>
                
                <div class="quick-amounts">
                    ${[250, 500, 750, 1000, 2500, 5000].map(amount => `
                        <button class="quick-btn" onclick="PipelineModule.setDealValue('${amount}')">
                            $${amount.toLocaleString()}
                        </button>
                    `).join('')}
                </div>
                
                <div class="input-hints">
                    <div class="hint-item">
                        <span class="hint-icon">💡</span>
                        <span class="hint-text">Enter a value between $1 and $999,999,999</span>
                    </div>
                    <div class="hint-item">
                        <span class="hint-icon">📊</span>
                        <span class="hint-text">This helps track your pipeline's total value</span>
                    </div>
                </div>
            </div>
            
            <div class="popup-actions">
                <button class="btn-cancel" onclick="this.closest('.cool-popup-overlay').remove()">
                    Cancel
                </button>
                <button class="btn-save" id="saveBtn">
                    Add Value
                </button>
            </div>
        </div>
        
        <style>
            .cool-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
                padding: 1rem;
            }
            
            .cool-popup {
                background: var(--surface, #ffffff);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 100%;
                max-width: 450px;
                animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                border: 1px solid var(--border, #e5e7eb);
                overflow: hidden;
            }
            
            .popup-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1.5rem 1.5rem 1rem;
                background: linear-gradient(135deg, var(--success, #10b981) 0%, #059669 100%);
                color: white;
                position: relative;
            }
            
            .popup-title {
                flex: 1;
                margin: 0;
                font-size: 1.25rem;
                font-weight: 700;
            }
            
            .popup-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1.2rem;
                font-weight: 300;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .popup-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            .popup-body {
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .new-deal-banner {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
                border-radius: 12px;
                border: 1px solid rgba(16, 185, 129, 0.2);
            }
            
            .banner-icon {
                font-size: 1.5rem;
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .banner-content {
                flex: 1;
            }
            
            .banner-title {
                font-size: 1rem;
                font-weight: 700;
                color: var(--text-primary, #111827);
                margin-bottom: 0.25rem;
            }
            
            .banner-subtitle {
                font-size: 0.85rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
            }
            
            .currency-input {
                position: relative;
                display: flex;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .currency-symbol {
                position: absolute;
                left: 1rem;
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--success, #10b981);
                z-index: 1;
                pointer-events: none;
            }
            
            .value-input {
                width: 100%;
                padding: 1rem 1rem 1rem 3rem;
                border: 2px solid var(--border, #e5e7eb);
                border-radius: 12px;
                font-size: 1.25rem;
                font-weight: 700;
                text-align: center;
                background: var(--background, #ffffff);
                color: var(--text-primary, #111827);
                transition: all 0.2s ease;
                font-family: inherit;
            }
            
            .value-input:focus {
                outline: none;
                border-color: var(--success, #10b981);
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                transform: translateY(-1px);
            }
            
            .value-input.error {
                border-color: var(--danger, #ef4444);
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }
            
            .error-message {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 8px;
                color: var(--danger, #ef4444);
                font-size: 0.85rem;
                font-weight: 600;
                animation: slideDown 0.3s ease;
            }
            
            .error-message::before {
                content: '⚠️';
                font-size: 1rem;
            }
            
            .quick-amounts {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.5rem;
            }
            
            .quick-btn {
                padding: 0.75rem 1rem;
                background: var(--background, #ffffff);
                border: 2px solid var(--border, #e5e7eb);
                border-radius: 8px;
                color: var(--text-secondary, #6b7280);
                cursor: pointer;
                font-weight: 600;
                font-size: 0.8rem;
                transition: all 0.2s ease;
                text-align: center;
            }
            
            .quick-btn:hover {
                border-color: var(--success, #10b981);
                color: var(--success, #10b981);
                background: rgba(16, 185, 129, 0.05);
                transform: translateY(-1px);
            }
            
            .input-hints {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .hint-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 0.75rem;
                background: var(--surface-hover, #f8fafc);
                border-radius: 6px;
                border: 1px solid var(--border, #e5e7eb);
            }
            
            .hint-icon {
                font-size: 0.9rem;
                flex-shrink: 0;
            }
            
            .hint-text {
                font-size: 0.75rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
            }
            
            .popup-actions {
                display: flex;
                gap: 1rem;
                padding: 1rem 1.5rem 1.5rem;
                background: var(--surface-hover, #f8fafc);
            }
            
            .btn-cancel, .btn-save {
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
            
            .btn-cancel {
                background: var(--background, #ffffff);
                color: var(--text-secondary, #6b7280);
                border: 2px solid var(--border, #e5e7eb);
            }
            
            .btn-cancel:hover {
                border-color: var(--text-secondary, #6b7280);
                color: var(--text-primary, #111827);
                transform: translateY(-1px);
            }
            
            .btn-save {
                background: linear-gradient(135deg, var(--success, #10b981) 0%, #059669 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            
            .btn-save:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
            }
            
            .btn-save:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
                background: #9ca3af;
                box-shadow: none;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.8) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            @media (max-width: 480px) {
                .cool-popup {
                    margin: 0;
                    border-radius: 16px 16px 0 0;
                    max-width: none;
                }
                
                .quick-amounts {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.4rem;
                }
                
                .quick-btn {
                    padding: 0.6rem 0.8rem;
                    font-size: 0.75rem;
                }
                
                .popup-actions {
                    flex-direction: column;
                }
            }
        </style>
    `;
    
    // Add to document
    document.body.appendChild(popup);
    popup.addEventListener('click', (e) => {
    if (e.target === popup) {
        popup.remove();
    }
});
    
    // Enhanced validation and error handling
    const input = document.getElementById('dealValueInput');
    const errorMessage = document.getElementById('errorMessage');
    const saveBtn = popup.querySelector('#saveBtn');
    
    // Helper function to show error
    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'flex';
        input.classList.add('error');
        saveBtn.disabled = true;
    };
    
    // Helper function to clear error
    const clearError = () => {
        errorMessage.style.display = 'none';
        input.classList.remove('error');
        saveBtn.disabled = false;
    };
    
    // Real-time validation
    input.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        
        // Clear previous errors
        clearError();
        
        if (value === '') {
            saveBtn.disabled = true;
            return;
        }
        
        const numericValue = parseFloat(value);
        
        // Validation checks
        if (isNaN(numericValue)) {
            showError('Please enter a valid number');
            return;
        }
        
        if (numericValue <= 0) {
            showError('Deal value must be greater than $0');
            return;
        }
        
        if (numericValue > 999999999) {
            showError('Deal value cannot exceed $999,999,999');
            return;
        }
        
        if (value.includes('.') && value.split('.')[1].length > 2) {
            showError('Please enter cents in format: 123.45');
            return;
        }
        
        // Value is valid
        saveBtn.disabled = false;
    });
    
    // Focus the input
    setTimeout(() => {
        input?.focus();
    }, 100);
    
    // Handle save button
    saveBtn.addEventListener('click', async () => {
        const value = input.value.trim();
        const numericValue = parseFloat(value);
        
        // Final validation before saving
        if (!value || isNaN(numericValue) || numericValue <= 0 || numericValue > 999999999) {
            input.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => input.style.animation = '', 500);
            return;
        }
        
        // Disable button and show loading
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Adding...';
        
        try {
            // Update backend
            await API.updateLead(leadId, { potential_value: numericValue });
            
            // Update local data
            lead.potential_value = numericValue;
            
            // Remove popup
            popup.remove();
            
            // Refresh pipeline to show changes
            await this.refreshPipeline();
            
            // Show success message
            this.showNotification(
                `💰 Deal value added: $${numericValue.toLocaleString()}`, 
                'success'
            );
            
        } catch (error) {
            console.error('❌ Failed to add deal value:', error);
            
            // Show specific error messages
            let errorMsg = 'Failed to add deal value. Please try again.';
            if (error.message?.includes('network')) {
                errorMsg = 'Network error. Check your connection and try again.';
            } else if (error.message?.includes('auth')) {
                errorMsg = 'Session expired. Please refresh and try again.';
            }
            
            this.showNotification(`❌ ${errorMsg}`, 'error');
            
            // Re-enable button
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Add Value';
        }
    });
    
    // Handle Enter key
    popup.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !saveBtn.disabled) {
            saveBtn.click();
        } else if (e.key === 'Escape') {
            popup.remove();
        }
    });
},

// Helper function to set deal value from quick buttons
setDealValue(amount) {
    const input = document.getElementById('dealValueInput');
    if (input) {
        input.value = amount;
        input.focus();
        // Trigger input event for validation
        input.dispatchEvent(new Event('input'));
    }
},

// ❌ FIRE Add Loss Reason Function
async addLossReason(leadId) {
    const lead = this.leads.find(l => l.id.toString() === leadId.toString());
    if (!lead) return;
    
    // Create fire popup
    const popup = document.createElement('div');
    popup.className = 'cool-popup-overlay';
    popup.innerHTML = `
        <div class="cool-popup">
            <div class="popup-header">
                <h3 class="popup-title">Mark as Lost</h3>
                <button class="popup-close" onclick="this.closest('.cool-popup-overlay').remove()">×</button>
            </div>
            
            <div class="popup-body">
                <div class="loss-banner">
                    <span class="banner-icon">❌</span>
                    <div class="banner-content">
                        <div class="banner-title">Deal Lost</div>
                        <div class="banner-subtitle">Why didn't ${lead.name} convert?</div>
                    </div>
                </div>
                
                <div class="reason-group">
                    <label class="reason-label">Select Loss Reason</label>
                    <select id="lossReasonSelect" class="reason-select">
                        <option value="">Choose reason...</option>
                        <option value="Price too high">💰 Price was too high</option>
                        <option value="Went with competitor">🏢 Chose a competitor</option>
                        <option value="Budget constraints">💸 Budget constraints</option>
                        <option value="Timing not right">⏰ Timing wasn't right</option>
                        <option value="No longer interested">😐 Lost interest</option>
                        <option value="Poor communication">📞 Communication issues</option>
                        <option value="Product not a fit">🎯 Product wasn't a fit</option>
                        <option value="Decision maker changed">👤 Decision maker changed</option>
                        <option value="Other">🤷 Other reason</option>
                    </select>
                </div>
                
                <div class="notes-group">
                    <label class="notes-label">Additional Details (Optional)</label>
                    <textarea id="lossNotes" 
                              class="notes-textarea" 
                              rows="3"
                              placeholder="Add context to help improve future sales..."></textarea>
                </div>
                
                <div class="insight-tip">
                    <span class="tip-icon">📊</span>
                    <span class="tip-text">This data helps identify patterns and improve your sales process</span>
                </div>
            </div>
            
            <div class="popup-actions">
                <button class="btn-cancel" onclick="this.closest('.cool-popup-overlay').remove()">
                    Cancel
                </button>
                <button class="btn-save" id="saveBtn">
                    Mark as Lost
                </button>
            </div>
        </div>
        
        <style>
            .cool-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
                padding: 1rem;
            }
            
            .cool-popup {
                background: var(--surface, #ffffff);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 100%;
                max-width: 450px;
                animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                border: 1px solid var(--border, #e5e7eb);
                overflow: hidden;
            }
            
            .popup-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1.5rem 1.5rem 1rem;
                background: linear-gradient(135deg, var(--danger, #ef4444) 0%, #dc2626 100%);
                color: white;
                position: relative;
            }
            
            .popup-title {
                flex: 1;
                margin: 0;
                font-size: 1.25rem;
                font-weight: 700;
            }
            
            .popup-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1.2rem;
                font-weight: 300;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .popup-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            .popup-body {
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .loss-banner {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%);
                border-radius: 12px;
                border: 1px solid rgba(239, 68, 68, 0.2);
            }
            
            .banner-icon {
                font-size: 1.5rem;
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .banner-content {
                flex: 1;
            }
            
            .banner-title {
                font-size: 1rem;
                font-weight: 700;
                color: var(--text-primary, #111827);
                margin-bottom: 0.25rem;
            }
            
            .banner-subtitle {
                font-size: 0.85rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
            }
            
            .reason-group {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .reason-label {
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--text-primary, #111827);
            }
            
            .reason-select {
    /* 🔥 ENHANCED APPEARANCE */
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    
    width: 100%;
    padding: 1rem 3rem 1rem 1.25rem; /* Extra right padding for custom arrow */
    border: 2px solid var(--border, #e5e7eb);
    border-radius: 12px;
    font-size: 0.95rem;
    
    /* 🎨 COOL GRADIENT BACKGROUND */
    background: linear-gradient(135deg, var(--background, #ffffff) 0%, rgba(239, 68, 68, 0.02) 100%);
    
    color: var(--text-primary, #111827);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
    cursor: pointer;
    font-weight: 500;
    
    /* ✨ ENHANCED SHADOW */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    
    /* 🎯 CUSTOM ARROW */
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ef4444' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 1rem center;
    background-repeat: no-repeat;
    background-size: 1.25em 1.25em;
}

/* 🌟 ENHANCED HOVER */
.reason-select:hover {
    border-color: var(--danger, #ef4444);
    transform: translateY(-2px);
    box-shadow: 
        0 8px 25px rgba(239, 68, 68, 0.15),
        0 0 20px rgba(239, 68, 68, 0.1);
    background: linear-gradient(135deg, var(--background, #ffffff) 0%, rgba(239, 68, 68, 0.05) 100%);
}

/* 🔥 ENHANCED FOCUS */
.reason-select:focus {
    outline: none;
    border-color: var(--danger, #ef4444);
    box-shadow: 
        0 0 0 3px rgba(239, 68, 68, 0.2),
        0 12px 35px rgba(239, 68, 68, 0.2);
    transform: translateY(-2px);
    background: linear-gradient(135deg, var(--background, #ffffff) 0%, rgba(239, 68, 68, 0.08) 100%);
}

/* Keep your existing option styles */
.reason-select option {
    padding: 0.5rem;
    background: var(--background, #ffffff);
    color: var(--text-primary, #111827);
}
            
            .notes-group {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .notes-label {
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--text-primary, #111827);
            }
            
            .notes-textarea {
                width: 100%;
                padding: 1rem;
                border: 2px solid var(--border, #e5e7eb);
                border-radius: 12px;
                font-size: 0.9rem;
                background: var(--background, #ffffff);
                color: var(--text-primary, #111827);
                transition: all 0.2s ease;
                font-family: inherit;
                resize: vertical;
                min-height: 80px;
            }
            
            .notes-textarea:focus {
                outline: none;
                border-color: var(--danger, #ef4444);
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }
            
            .notes-textarea::placeholder {
                color: var(--text-tertiary, #9ca3af);
                font-style: italic;
            }
            
            .insight-tip {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                background: var(--surface-hover, #f8fafc);
                border-radius: 8px;
                border: 1px solid var(--border, #e5e7eb);
            }
            
            .tip-icon {
                font-size: 1rem;
                flex-shrink: 0;
            }
            
            .tip-text {
                font-size: 0.8rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
                line-height: 1.4;
            }
            
            .popup-actions {
                display: flex;
                gap: 1rem;
                padding: 1rem 1.5rem 1.5rem;
                background: var(--surface-hover, #f8fafc);
            }
            
            .btn-cancel, .btn-save {
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
            
            .btn-cancel {
                background: var(--background, #ffffff);
                color: var(--text-secondary, #6b7280);
                border: 2px solid var(--border, #e5e7eb);
            }
            
            .btn-cancel:hover {
                border-color: var(--text-secondary, #6b7280);
                color: var(--text-primary, #111827);
                transform: translateY(-1px);
            }
            
            .btn-save {
                background: linear-gradient(135deg, var(--danger, #ef4444) 0%, #dc2626 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }
            
            .btn-save:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
            }
            
            .btn-save:disabled {
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
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            @media (max-width: 480px) {
                .cool-popup {
                    margin: 0;
                    border-radius: 16px 16px 0 0;
                    max-width: none;
                }
                
                .popup-actions {
                    flex-direction: column;
                }
            }
        </style>
    `;
    
    // Add to document
    document.body.appendChild(popup);
    popup.addEventListener('click', (e) => {
    if (e.target === popup) {
        popup.remove();
    }
});

    
    
    // Focus the select
    setTimeout(() => {
        const select = document.getElementById('lossReasonSelect');
        select?.focus();
    }, 100);
    
    // Handle save button
    const saveBtn = popup.querySelector('#saveBtn');
    saveBtn.addEventListener('click', async () => {
        const reasonSelect = document.getElementById('lossReasonSelect');
        const notesTextarea = document.getElementById('lossNotes');
        
        const lossReason = reasonSelect.value;
        const lossNotes = notesTextarea.value.trim();
        
        if (!lossReason) {
            // Shake the select for missing reason
            reasonSelect.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => reasonSelect.style.animation = '', 500);
            return;
        }
        
        // Disable button and show loading
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Saving...';
        
        try {
            const updateData = { lost_reason: lossReason };
            
            // Add notes if provided
            if (lossNotes) {
                const existingNotes = lead.notes || '';
                const separator = existingNotes ? '\n\n' : '';
                updateData.notes = existingNotes + separator + `Loss Details: ${lossNotes}`;
            }
            
            // Update backend
            await API.updateLead(leadId, updateData);
            
            // Update local data
            lead.lost_reason = lossReason;
            if (updateData.notes) lead.notes = updateData.notes;
            
            // Remove popup
            popup.remove();
            
            // Refresh pipeline to show changes
            await this.refreshPipeline();
            
            // Show success message
            this.showNotification(
                `❌ Lead marked as lost: ${lossReason}`, 
                'success'
            );
            
        } catch (error) {
            console.error('❌ Failed to save loss reason:', error);
            this.showNotification('❌ Failed to save loss reason. Please try again.', 'error');
            
            // Re-enable button
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Mark as Lost';
        }
    });
    
    // Handle Enter key (but not in textarea)
    popup.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !saveBtn.disabled) {
            saveBtn.click();
        } else if (e.key === 'Escape') {
            popup.remove();
        }
    });
},

// 💰 ENHANCED Edit Deal Value Function with Better Error Handling
async editDealValue(leadId) {
    const lead = this.leads.find(l => l.id.toString() === leadId.toString());
    if (!lead) return;

    const currentValue = lead.potential_value || 0;
    
    // Create enhanced popup with better validation
    const popup = document.createElement('div');
    popup.className = 'cool-popup-overlay';
    popup.innerHTML = `
        <div class="cool-popup">
            <div class="popup-header">
                <h3 class="popup-title">Edit Deal Value</h3>
                <button class="popup-close" onclick="this.closest('.cool-popup-overlay').remove()">×</button>
            </div>
            
            <div class="popup-body">
                <div class="current-value">
                    <span class="label">Current Value:</span>
                    <span class="value">$${currentValue.toLocaleString()}</span>
                </div>
                
                <div class="input-group">
                    <div class="currency-input">
                        <span class="currency-symbol">$</span>
                        <input type="number" 
                               id="dealValueInput" 
                               class="value-input" 
                               value="${currentValue > 0 ? currentValue : ''}" 
                               placeholder="Enter amount"
                               min="0" 
                               max="999999999"
                               step="1"
                               autofocus>
                    </div>
                    <!-- Error message container -->
                    <div class="error-message" id="errorMessage" style="display: none;"></div>
                </div>
                
                <div class="quick-amounts">
                    ${[250, 500, 750, 1000, 2500, 5000].map(amount => `
                        <button class="quick-btn" onclick="PipelineModule.setEditDealValue('${amount}')">
                            $${amount.toLocaleString()}
                        </button>
                    `).join('')}
                </div>
                
                <div class="input-hints">
                    <div class="hint-item">
                        <span class="hint-icon">💡</span>
                        <span class="hint-text">Enter a value between $0 and $999,999,999</span>
                    </div>
                    <div class="hint-item">
                        <span class="hint-icon">📝</span>
                        <span class="hint-text">Set to $0 to remove deal value entirely</span>
                    </div>
                </div>
            </div>
            
            <div class="popup-actions">
                <button class="btn-cancel" onclick="this.closest('.cool-popup-overlay').remove()">
                    Cancel
                </button>
                <button class="btn-save" id="saveBtn">
                    Update Value
                </button>
            </div>
        </div>
        
        <style>
            .cool-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 1rem;
                /* 🔥 SMOOTH TRANSITIONS */
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .cool-popup-overlay.show {
                opacity: 1;
                visibility: visible;
            }
            
            .cool-popup {
                background: var(--surface, #ffffff);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 100%;
                max-width: 450px;
                border: 1px solid var(--border, #e5e7eb);
                overflow: hidden;
                /* 🔥 SMOOTH TRANSITIONS */
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .cool-popup-overlay.show .cool-popup {
                transform: scale(1) translateY(0);
            }
            
            .popup-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1.5rem 1.5rem 1rem;
                background: linear-gradient(135deg, var(--primary, #3b82f6) 0%, #8b5cf6 100%);
                color: white;
                position: relative;
            }
            
            .popup-title {
                flex: 1;
                margin: 0;
                font-size: 1.25rem;
                font-weight: 700;
            }
            
            .popup-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1.2rem;
                font-weight: 300;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .popup-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            .popup-body {
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .current-value {
                text-align: center;
                padding: 1rem;
                background: var(--surface-hover, #f8fafc);
                border-radius: 12px;
                border: 1px solid var(--border, #e5e7eb);
            }
            
            .current-value .label {
                display: block;
                font-size: 0.85rem;
                color: var(--text-secondary, #6b7280);
                margin-bottom: 0.25rem;
                font-weight: 600;
            }
            
            .current-value .value {
                display: block;
                font-size: 1.5rem;
                font-weight: 800;
                color: var(--success, #10b981);
            }
            
            .currency-input {
                position: relative;
                display: flex;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .currency-symbol {
                position: absolute;
                left: 1rem;
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--success, #10b981);
                z-index: 1;
                pointer-events: none;
            }
            
            .value-input {
                width: 100%;
                padding: 1rem 1rem 1rem 3rem;
                border: 2px solid var(--border, #e5e7eb);
                border-radius: 12px;
                font-size: 1.25rem;
                font-weight: 700;
                text-align: center;
                background: var(--background, #ffffff);
                color: var(--text-primary, #111827);
                transition: all 0.2s ease;
                font-family: inherit;
            }
            
            .value-input:focus {
                outline: none;
                border-color: var(--primary, #3b82f6);
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                transform: translateY(-1px);
            }
            
            .value-input.error {
                border-color: var(--danger, #ef4444);
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }
            
            .error-message {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 8px;
                color: var(--danger, #ef4444);
                font-size: 0.85rem;
                font-weight: 600;
                animation: slideDown 0.3s ease;
            }
            
            .error-message::before {
                content: '⚠️';
                font-size: 1rem;
            }
            
            .quick-amounts {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.5rem;
            }
            
            .quick-btn {
                padding: 0.75rem 1rem;
                background: var(--background, #ffffff);
                border: 2px solid var(--border, #e5e7eb);
                border-radius: 8px;
                color: var(--text-secondary, #6b7280);
                cursor: pointer;
                font-weight: 600;
                font-size: 0.8rem;
                transition: all 0.2s ease;
                text-align: center;
            }
            
            .quick-btn:hover {
                border-color: var(--primary, #3b82f6);
                color: var(--primary, #3b82f6);
                background: rgba(59, 130, 246, 0.05);
                transform: translateY(-1px);
            }
            
            .input-hints {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .hint-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 0.75rem;
                background: var(--surface-hover, #f8fafc);
                border-radius: 6px;
                border: 1px solid var(--border, #e5e7eb);
            }
            
            .hint-icon {
                font-size: 0.9rem;
                flex-shrink: 0;
            }
            
            .hint-text {
                font-size: 0.75rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
            }
            
            .popup-actions {
                display: flex;
                gap: 1rem;
                padding: 1rem 1.5rem 1.5rem;
                background: var(--surface-hover, #f8fafc);
            }
            
            .btn-cancel, .btn-save {
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
            
            .btn-cancel {
                background: var(--background, #ffffff);
                color: var(--text-secondary, #6b7280);
                border: 2px solid var(--border, #e5e7eb);
            }
            
            .btn-cancel:hover {
                border-color: var(--text-secondary, #6b7280);
                color: var(--text-primary, #111827);
                transform: translateY(-1px);
            }
            
            .btn-save {
                background: linear-gradient(135deg, var(--primary, #3b82f6) 0%, #8b5cf6 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            
            .btn-save:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
            }
            
            .btn-save:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
                background: #9ca3af;
                box-shadow: none;
            }
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            @media (max-width: 480px) {
                .cool-popup {
                    margin: 0;
                    border-radius: 16px 16px 0 0;
                    max-width: none;
                }
                
                .quick-amounts {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.4rem;
                }
                
                .quick-btn {
                    padding: 0.6rem 0.8rem;
                    font-size: 0.75rem;
                }
                
                .popup-actions {
                    flex-direction: column;
                }
            }
        </style>
    `;
    
    // Add to document
    document.body.appendChild(popup);
    
    // 🔥 SMOOTH ENTRANCE ANIMATION
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);
    
    // 🔥 SMOOTH BACKDROP CLICK CLOSE
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('show');
            setTimeout(() => {
                popup.remove();
            }, 300);
        }
    });
    
    // Enhanced validation and error handling
    const input = document.getElementById('dealValueInput');
    const errorMessage = document.getElementById('errorMessage');
    const saveBtn = popup.querySelector('#saveBtn');
    
    // Helper function to show error
    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'flex';
        input.classList.add('error');
        saveBtn.disabled = true;
    };
    
    // Helper function to clear error
    const clearError = () => {
        errorMessage.style.display = 'none';
        input.classList.remove('error');
        saveBtn.disabled = false;
    };
    
    // 🔥 ENHANCED REAL-TIME VALIDATION
    input.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        
        // Clear previous errors
        clearError();
        
        if (value === '') {
            saveBtn.disabled = true;
            return;
        }
        
        // 🔥 ENHANCED: Check for non-numeric characters first
        if (!/^-?\d*\.?\d*$/.test(value)) {
            showError('Please enter a valid number');
            return;
        }
        
        const numericValue = parseFloat(value);
        
        // 🔥 ENHANCED: Better NaN check for edge cases
        if (isNaN(numericValue) || value === '.' || value === '-' || value === '-.') {
            showError('Please enter a valid number');
            return;
        }
        
        if (numericValue < 0) {
            showError('Deal value cannot be negative');
            return;
        }
        
        if (numericValue > 999999999) {
            showError('Deal value cannot exceed $999,999,999');
            return;
        }
        
        if (value.includes('.') && value.split('.')[1].length > 2) {
            showError('Please enter cents in format: 123.45');
            return;
        }
        
        // Value is valid
        saveBtn.disabled = false;
    });
    
    // Focus the input and select all text
    setTimeout(() => {
        input?.focus();
        input?.select();
    }, 100);
    
    // 🔥 ENHANCED SAVE BUTTON HANDLER
    saveBtn.addEventListener('click', async () => {
        const value = input.value.trim();
        const numericValue = value === '' ? 0 : parseFloat(value);
        
        // 🔥 ENHANCED: Final validation with better error catching
        if (value !== '' && (
            isNaN(numericValue) || 
            !/^-?\d*\.?\d*$/.test(value) || 
            value === '.' || 
            value === '-' || 
            value === '-.' ||
            numericValue < 0 || 
            numericValue > 999999999
        )) {
            input.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => input.style.animation = '', 500);
            if (!errorMessage.style.display || errorMessage.style.display === 'none') {
                showError('Please enter a valid number');
            }
            return;
        }
        
        // No change needed
        if (numericValue === currentValue) {
            popup.classList.remove('show');
            setTimeout(() => {
                popup.remove();
            }, 300);
            this.showNotification('💰 No changes made', 'info');
            return;
        }
        
        // Disable button and show loading
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Updating...';
        
        try {
            // Update backend
            await API.updateLead(leadId, { potential_value: numericValue });
            
            // Update local data
            lead.potential_value = numericValue;
            
            // Remove popup with animation
            popup.classList.remove('show');
            setTimeout(() => {
                popup.remove();
            }, 300);
            
            // Refresh pipeline to show changes
            await this.refreshPipeline();
            
            // Show success message
            if (numericValue === 0) {
                this.showNotification('💰 Deal value removed', 'success');
            } else {
                this.showNotification(
                    `💰 Deal value updated: $${numericValue.toLocaleString()}`, 
                    'success'
                );
            }
            
        } catch (error) {
            console.error('❌ Failed to update deal value:', error);
            
            // Show specific error messages
            let errorMsg = 'Failed to update deal value. Please try again.';
            if (error.message?.includes('network')) {
                errorMsg = 'Network error. Check your connection and try again.';
            } else if (error.message?.includes('auth')) {
                errorMsg = 'Session expired. Please refresh and try again.';
            }
            
            this.showNotification(`❌ ${errorMsg}`, 'error');
            
            // Re-enable button
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Update Value';
        }
    });
    
    // 🔥 ENHANCED KEYBOARD HANDLERS
    popup.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !saveBtn.disabled) {
            saveBtn.click();
        } else if (e.key === 'Escape') {
            popup.classList.remove('show');
            setTimeout(() => {
                popup.remove();
            }, 300);
        }
    });
},

// 🔥 ENHANCED Helper function for quick buttons
setEditDealValue(amount) {
    const input = document.getElementById('dealValueInput');
    if (input) {
        input.value = amount;
        input.focus();
        // Trigger input event for validation
        input.dispatchEvent(new Event('input'));
    }
},
    
   // ❌ NUCLEAR Edit Loss Reason Function
async editLossReason(leadId) {
    const lead = this.leads.find(l => l.id.toString() === leadId.toString());
    if (!lead) return;

    const currentReason = lead.lost_reason || '';
    
    // Create nuclear popup
    const popup = document.createElement('div');
    popup.className = 'cool-popup-overlay';
    popup.innerHTML = `
        <div class="cool-popup">
            <div class="popup-header">
                <h3 class="popup-title">Edit Loss Reason</h3>
                <button class="popup-close" onclick="this.closest('.cool-popup-overlay').remove()">×</button>
            </div>
            
            <div class="popup-body">
                <div class="edit-banner">
                    <span class="banner-icon">✏️</span>
                    <div class="banner-content">
                        <div class="banner-title">Update Loss Details</div>
                        <div class="banner-subtitle">Refine why ${lead.name} didn't convert</div>
                    </div>
                </div>
                
                <div class="current-status">
                    <div class="status-card">
                        <span class="status-icon">📋</span>
                        <div class="status-content">
                            <div class="status-label">Current Reason</div>
                            <div class="status-value">${currentReason || 'No reason set'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="reason-group">
                    <label class="reason-label">New Loss Reason</label>
                    <select id="lossReasonSelect" class="reason-select">
                        <option value="">Choose reason...</option>
                        <option value="Price too high" ${currentReason === 'Price too high' ? 'selected' : ''}>💰 Price was too high</option>
                        <option value="Went with competitor" ${currentReason === 'Went with competitor' ? 'selected' : ''}>🏢 Chose a competitor</option>
                        <option value="Budget constraints" ${currentReason === 'Budget constraints' ? 'selected' : ''}>💸 Budget constraints</option>
                        <option value="Timing not right" ${currentReason === 'Timing not right' ? 'selected' : ''}>⏰ Timing wasn't right</option>
                        <option value="No longer interested" ${currentReason === 'No longer interested' ? 'selected' : ''}>😐 Lost interest</option>
                        <option value="Poor communication" ${currentReason === 'Poor communication' ? 'selected' : ''}>📞 Communication issues</option>
                        <option value="Product not a fit" ${currentReason === 'Product not a fit' ? 'selected' : ''}>🎯 Product wasn't a fit</option>
                        <option value="Decision maker changed" ${currentReason === 'Decision maker changed' ? 'selected' : ''}>👤 Decision maker changed</option>
                        <option value="Other" ${currentReason === 'Other' ? 'selected' : ''}>🤷 Other reason</option>
                    </select>
                </div>
                
                <div class="insight-tip">
                    <span class="tip-icon">🔄</span>
                    <span class="tip-text">Updating loss reasons helps maintain accurate sales analytics</span>
                </div>
            </div>
            
            <div class="popup-actions">
                <button class="btn-cancel" onclick="this.closest('.cool-popup-overlay').remove()">
                    Cancel
                </button>
                <button class="btn-save" id="saveBtn">
                    Update Reason
                </button>
            </div>
        </div>
        
        <style>
            .cool-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
                padding: 1rem;
            }
            
            .cool-popup {
                background: var(--surface, #ffffff);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 100%;
                max-width: 420px;
                animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                border: 1px solid var(--border, #e5e7eb);
                overflow: hidden;
            }
            
            .popup-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1.5rem 1.5rem 1rem;
                background: linear-gradient(135deg, var(--warning, #f59e0b) 0%, #d97706 100%);
                color: white;
                position: relative;
            }
            
            .popup-title {
                flex: 1;
                margin: 0;
                font-size: 1.25rem;
                font-weight: 700;
            }
            
            .popup-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1.2rem;
                font-weight: 300;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .popup-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            .popup-body {
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .edit-banner {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%);
                border-radius: 12px;
                border: 1px solid rgba(245, 158, 11, 0.2);
            }
            
            .banner-icon {
                font-size: 1.5rem;
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .banner-content {
                flex: 1;
            }
            
            .banner-title {
                font-size: 1rem;
                font-weight: 700;
                color: var(--text-primary, #111827);
                margin-bottom: 0.25rem;
            }
            
            .banner-subtitle {
                font-size: 0.85rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
            }
            
            .current-status {
                background: var(--background, #ffffff);
            }
            
            .status-card {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem;
                background: var(--surface-hover, #f8fafc);
                border-radius: 10px;
                border: 1px solid var(--border, #e5e7eb);
            }
            
            .status-icon {
                font-size: 1.25rem;
                opacity: 0.7;
            }
            
            .status-content {
                flex: 1;
            }
            
            .status-label {
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--text-secondary, #6b7280);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 0.25rem;
            }
            
            .status-value {
                font-size: 0.95rem;
                font-weight: 600;
                color: var(--text-primary, #111827);
            }
            
            .reason-group {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .reason-label {
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--text-primary, #111827);
            }
            
            .reason-select {
    /* 🔥 ENHANCED APPEARANCE */
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    
    width: 100%;
    padding: 1rem 3rem 1rem 1.25rem; /* Extra right padding for custom arrow */
    border: 2px solid var(--border, #e5e7eb);
    border-radius: 12px;
    font-size: 0.95rem;
    
    /* 🎨 COOL GRADIENT BACKGROUND */
    background: linear-gradient(135deg, var(--background, #ffffff) 0%, rgba(239, 68, 68, 0.02) 100%);
    
    color: var(--text-primary, #111827);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
    cursor: pointer;
    font-weight: 500;
    
    /* ✨ ENHANCED SHADOW */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    
    /* 🎯 CUSTOM ARROW */
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ef4444' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 1rem center;
    background-repeat: no-repeat;
    background-size: 1.25em 1.25em;
}

/* 🌟 ENHANCED HOVER */
.reason-select:hover {
    border-color: var(--danger, #ef4444);
    transform: translateY(-2px);
    box-shadow: 
        0 8px 25px rgba(239, 68, 68, 0.15),
        0 0 20px rgba(239, 68, 68, 0.1);
    background: linear-gradient(135deg, var(--background, #ffffff) 0%, rgba(239, 68, 68, 0.05) 100%);
}

/* 🔥 ENHANCED FOCUS */
.reason-select:focus {
    outline: none;
    border-color: var(--danger, #ef4444);
    box-shadow: 
        0 0 0 3px rgba(239, 68, 68, 0.2),
        0 12px 35px rgba(239, 68, 68, 0.2);
    transform: translateY(-2px);
    background: linear-gradient(135deg, var(--background, #ffffff) 0%, rgba(239, 68, 68, 0.08) 100%);
}

/* Keep your existing option styles */
.reason-select option {
    padding: 0.5rem;
    background: var(--background, #ffffff);
    color: var(--text-primary, #111827);
}
            
            .insight-tip {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                background: var(--surface-hover, #f8fafc);
                border-radius: 8px;
                border: 1px solid var(--border, #e5e7eb);
            }
            
            .tip-icon {
                font-size: 1rem;
                flex-shrink: 0;
                opacity: 0.8;
            }
            
            .tip-text {
                font-size: 0.8rem;
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
                line-height: 1.4;
            }
            
            .popup-actions {
                display: flex;
                gap: 1rem;
                padding: 1rem 1.5rem 1.5rem;
                background: var(--surface-hover, #f8fafc);
            }
            
            .btn-cancel, .btn-save {
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
            
            .btn-cancel {
                background: var(--background, #ffffff);
                color: var(--text-secondary, #6b7280);
                border: 2px solid var(--border, #e5e7eb);
            }
            
            .btn-cancel:hover {
                border-color: var(--text-secondary, #6b7280);
                color: var(--text-primary, #111827);
                transform: translateY(-1px);
            }
            
            .btn-save {
                background: linear-gradient(135deg, var(--warning, #f59e0b) 0%, #d97706 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            }
            
            .btn-save:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
            }
            
            .btn-save:disabled {
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
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            @media (max-width: 480px) {
                .cool-popup {
                    margin: 0;
                    border-radius: 16px 16px 0 0;
                    max-width: none;
                }
                
                .popup-actions {
                    flex-direction: column;
                }
            }
        </style>
    `;
    
    // Add to document
    document.body.appendChild(popup);
    popup.addEventListener('click', (e) => {
    if (e.target === popup) {
        popup.remove();
    }
});
    
    // Focus the select
    setTimeout(() => {
        const select = document.getElementById('lossReasonSelect');
        select?.focus();
    }, 100);
    
    // Handle save button
    const saveBtn = popup.querySelector('#saveBtn');
    saveBtn.addEventListener('click', async () => {
        const reasonSelect = document.getElementById('lossReasonSelect');
        const lossReason = reasonSelect.value;
        
        if (!lossReason) {
            // Shake the select for missing reason
            reasonSelect.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => reasonSelect.style.animation = '', 500);
            return;
        }
        
        if (lossReason === currentReason) {
            popup.remove();
            this.showNotification('ℹ️ No changes made', 'info');
            return;
        }
        
        // Disable button and show loading
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Updating...';
        
        try {
            // Update backend
            await API.updateLead(leadId, { lost_reason: lossReason });
            
            // Update local data
            lead.lost_reason = lossReason;
            
            // Remove popup
            popup.remove();
            
            // Refresh pipeline to show changes
            await this.refreshPipeline();
            
            // Show success message
            this.showNotification(
                `✅ Loss reason updated: ${lossReason}`, 
                'success'
            );
            
        } catch (error) {
            console.error('❌ Failed to update loss reason:', error);
            this.showNotification('❌ Failed to update loss reason. Please try again.', 'error');
            
            // Re-enable button
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Update Reason';
        }
    });
    
    // Handle Enter key
    popup.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !saveBtn.disabled) {
            saveBtn.click();
        } else if (e.key === 'Escape') {
            popup.remove();
        }
    });
},

// 🗑️ Show Delete Confirmation Modal  <-- ADD THE METHOD HERE
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
                <button class="btn-confirm-delete" onclick="PipelineModule.confirmDeleteLead('${leadId}')">
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
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
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
    popup.addEventListener('click', (e) => {
    if (e.target === popup) {
        popup.remove();
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

    // 🎬 Setup Animations
    setupAnimations() {
        // Stagger animation for stage columns
        const stageColumns = document.querySelectorAll('.stage-column');
        stageColumns.forEach((column, index) => {
            column.style.animationDelay = `${index * 0.15}s`;
            column.classList.add('scale-in');
        });

        // Animate analytics cards
        const analyticsCards = document.querySelectorAll('.analytics-card');
        analyticsCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });
    },

    initializeAnimations() {
        // Run animations after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.setupAnimations();
        }, 100);
    },

    // 🔧 Helper Methods
    getTypeIcon(type) {
        const icons = {
            warm: '🔥',
            cold: '❄️',
            hot: '🔥',
        };
        return icons[type] || '';
    },

    getSourceIcon(source) {
    const icons = {
        'website': '🌐',
        'social_media': '📱',
        'referral': '👥',
        'email': '📧',
        'phone': '📞',
        'event': '🎪',
        'advertisement': '📢',
        'direct': '🎯',
        'linkedin': '💼',
        'facebook': '📘',
        'instagram': '📸',
        'twitter': '🐦',
        'google': '🔍',
        'organic': '🌱',
        'paid': '💰',
        'cold_call': '❄️',
        'trade_show': '🏢',
        'webinar': '💻',
        'content': '📝',
        'partnership': '🤝',
        'other': '📋'
    };
    return icons[source?.toLowerCase()] || '📋';
},

    getScoreColor(score) {
        if (score >= 9) return 'var(--primary)';
        if (score >= 7) return 'var(--success)';
        if (score >= 5) return 'var(--warning)';
        return 'var(--danger)';
    },

    

    getInitials(name, maxChars = 2) {
        if (!name) return '??';
        
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].substring(0, maxChars).toUpperCase();
        }
        
        return words
            .slice(0, maxChars)
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase();
    },

    toggleMoreSources() {
        const moreSourcesGroup = document.querySelector('.more-sources');
        const toggleBtn = document.querySelector('.view-more-sources-btn');
        const btnIcon = toggleBtn.querySelector('.btn-icon');
        const btnText = toggleBtn.querySelector('.btn-text');
        
        if (moreSourcesGroup.style.display === 'none') {
            // Show more sources
            moreSourcesGroup.style.display = 'block';
            btnIcon.textContent = '🔼';
            btnText.textContent = 'Show Less';
            toggleBtn.classList.add('expanded');
        } else {
            // Hide more sources
            moreSourcesGroup.style.display = 'none';
            btnIcon.textContent = '🔽';
            btnText.textContent = 'View More';
            toggleBtn.classList.remove('expanded');
        }
    },

    truncate(text, length = 50, suffix = '...') {
        if (!text || text.length <= length) return text;
        return text.substring(0, length).trim() + suffix;
    },

    formatDate(date, format = 'relative') {
        if (!date) return 'Unknown';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid date';

        const now = new Date();
        const diffMs = now - dateObj;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        switch (format) {
            case 'relative':
                if (diffMinutes < 1) return 'Just now';
                if (diffMinutes < 60) return `${diffMinutes}m ago`;
                if (diffHours < 24) return `${diffHours}h ago`;
                if (diffDays < 7) return `${diffDays}d ago`;
                return dateObj.toLocaleDateString();

            case 'short':
                return dateObj.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: diffDays > 365 ? 'numeric' : undefined
                });

            default:
                return dateObj.toLocaleDateString();
        }
    },

    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // 📢 Notification System
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌', 
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-text">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                setTimeout(() => notification.remove(), 400);
            }
        }, 4000);
    },

    // 🎪 Modal System
    createModal(title, content, options = {}) {
        const config = {
            size: 'medium',
            buttons: [],
            ...options
        };

        const modal = document.createElement('div');
        modal.className = 'edit-modal-streamlined show';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="edit-modal-content">
                <div class="modal-header">
                    <div class="modal-title-group">
                        <h3 class="modal-title">${title}</h3>
                    </div>
                    <button class="modal-close-btn" onclick="this.closest('.edit-modal-streamlined').remove()">
                        <span class="close-icon">×</span>
                    </button>
                </div>
                <div class="modal-body">
                    ${typeof content === 'string' ? content : ''}
                </div>
                ${config.buttons.length > 0 ? `
                    <div class="modal-footer" style="padding: 1rem 2rem 2rem; border-top: 1px solid var(--border); display: flex; gap: 1rem; justify-content: flex-end;">
                        ${config.buttons.map(btn => `
                            <button class="btn-${btn.type || 'secondary'}" data-action="${btn.action || ''}">
                                ${btn.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Add content if it's an element
        if (typeof content !== 'string') {
            const modalBody = modal.querySelector('.modal-body');
            modalBody.innerHTML = '';
            modalBody.appendChild(content);
        }

        // Button handlers
        config.buttons.forEach((btn, index) => {
            const buttonEl = modal.querySelectorAll('.modal-footer button')[index];
            if (buttonEl && btn.onClick) {
                buttonEl.addEventListener('click', async () => {
                    const result = await btn.onClick();
                    if (result !== false) modal.remove();
                });
            }
        });

        document.body.appendChild(modal);
        return modal;
    },

    // 🔄 Loading States
    renderLoadingState() {
        const container = document.getElementById(this.targetContainer);
        if (container) {
        container.innerHTML = `          
            <style>
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
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        }
    },

    renderError(message) {
        const container = document.getElementById(this.targetContainer);
        if (container) {
        container.innerHTML = `
            <div class="error-container fade-in">
                <div class="error-icon">⚠️</div>
                <h2 class="error-title">Pipeline Error</h2>
                <p class="error-message">${message}</p>
                <button onclick="PipelineModule.init()" class="retry-btn">
                    <span class="btn-icon">🔄</span>
                    <span class="btn-text">Try Again</span>
                </button>
            </div>
            
            <style>
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
                    display: inline-flex;
                    align-items: center;
                    gap: 0.75rem;
                    transition: var(--transition);
                }
                
                .retry-btn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }
            </style>
        `;
        }
    },

    // Add remaining methods like setupDragAndDrop, setupFilters, editLead, quickCall, quickEmail, etc.
    // These would be similar to the original implementation but adapted for the streamlined version...

    // 🎯 Add Lead to Specific Stage
    addLeadToStage(stageId) {
        const stage = this.stages.find(s => s.id === stageId);
        if (!stage) return;
        
        this.showNotification(`Add new lead to ${stage.name}`, 'info');
        
        // Navigate to add lead page with pre-filled status
        if (window.loadPage) {
            localStorage.setItem('prefillStatus', stageId);
            window.loadPage('leads');
        } else {
            console.log(`🎯 Add lead to ${stage.name} - would navigate to leads page`);
        }
    },

setupDragAndDrop() {
    // 🛡️ PREVENT MULTIPLE SETUPS - STOPS THE x256 LOOP!
    if (this.dragAndDropInitialized) {
        return; // Silent return, no log spam
    }
    
    const pipelineBoard = document.querySelector('.pipeline-board-streamlined');
    if (!pipelineBoard) return;

    // 🧹 REMOVE OLD LISTENERS FIRST (prevent duplicates)
    this.removeDragAndDropListeners();

    // 🎯 SETUP NEW LISTENERS
    this.dragStartHandler = (e) => {
        const card = e.target.closest('.lead-card');
        if (card) this.handleDragStart(e);
    };
    
    this.dragEndHandler = (e) => {
        const card = e.target.closest('.lead-card');
        if (card) this.handleDragEnd(e);
    };
    
    this.dragOverHandler = (e) => {
        if (e.target.closest('.stage-content')) this.handleDragOver(e);
    };
    
    this.dragEnterHandler = (e) => {
        if (e.target.closest('.stage-content')) this.handleDragEnter(e);
    };
    
    this.dragLeaveHandler = (e) => {
        if (e.target.closest('.stage-content')) this.handleDragLeave(e);
    };
    
    this.dropHandler = (e) => {
        if (e.target.closest('.stage-content')) this.handleDrop(e);
    };

    // 🔗 ATTACH LISTENERS
    pipelineBoard.addEventListener('dragstart', this.dragStartHandler);
    pipelineBoard.addEventListener('dragend', this.dragEndHandler);
    pipelineBoard.addEventListener('dragover', this.dragOverHandler);
    pipelineBoard.addEventListener('dragenter', this.dragEnterHandler);
    pipelineBoard.addEventListener('dragleave', this.dragLeaveHandler);
    pipelineBoard.addEventListener('drop', this.dropHandler);

    // 🔒 MARK AS INITIALIZED
    this.dragAndDropInitialized = true;
    
    // 🔇 SILENT SUCCESS (no console spam)
},

// 🧹 ADD THIS CLEANUP METHOD
removeDragAndDropListeners() {
    const pipelineBoard = document.querySelector('.pipeline-board-streamlined');
    if (!pipelineBoard) return;

    // Remove old listeners if they exist
    if (this.dragStartHandler) pipelineBoard.removeEventListener('dragstart', this.dragStartHandler);
    if (this.dragEndHandler) pipelineBoard.removeEventListener('dragend', this.dragEndHandler);
    if (this.dragOverHandler) pipelineBoard.removeEventListener('dragover', this.dragOverHandler);
    if (this.dragEnterHandler) pipelineBoard.removeEventListener('dragenter', this.dragEnterHandler);
    if (this.dragLeaveHandler) pipelineBoard.removeEventListener('dragleave', this.dragLeaveHandler);
    if (this.dropHandler) pipelineBoard.removeEventListener('drop', this.dropHandler);
},

// 🎯 Universal Click-to-Activate System (Desktop + Mobile)
setupClickToActivate() {
    let activeCard = null;
    let autoDeactivateTimeout = null;

    const pipelineBoard = document.querySelector('.pipeline-board-streamlined');
    if (!pipelineBoard) return;

    // Handle card clicks
    pipelineBoard.addEventListener('click', (e) => {
        const clickedCard = e.target.closest('.lead-card');
        
        // Don't interfere with action buttons or interactive elements
        if (e.target.closest('.card-actions') || 
            e.target.closest('.action-btn') || 
            e.target.closest('button') || 
            e.target.closest('input') || 
            e.target.closest('select') ||
            e.target.closest('.deal-value-btn') ||
            e.target.closest('.loss-reason-btn') ||
            e.target.closest('.value-edit-btn') ||
            e.target.closest('.loss-edit-btn')) {
            return;
        }

        if (clickedCard) {
            e.preventDefault();
            e.stopPropagation();
            
            // If same card clicked, toggle off
            if (activeCard === clickedCard) {
                this.deactivateCard(activeCard);
                activeCard = null;
                this.clearAutoDeactivate();
                return;
            }

            // Deactivate previous card
            if (activeCard) {
                this.deactivateCard(activeCard);
            }

            // Activate new card
            this.activateCard(clickedCard);
            activeCard = clickedCard;

            // Auto-deactivate after 10 seconds
            this.setAutoDeactivate(() => {
                if (activeCard) {
                    this.deactivateCard(activeCard);
                    activeCard = null;
                }
            });

        } else {
            // Clicked outside any card - deactivate
            if (activeCard) {
                this.deactivateCard(activeCard);
                activeCard = null;
                this.clearAutoDeactivate();
            }
        }
    });

    // Clear activation when drag starts (don't interfere with drag & drop)
    pipelineBoard.addEventListener('dragstart', () => {
        if (activeCard) {
            this.deactivateCard(activeCard);
            activeCard = null;
            this.clearAutoDeactivate();
        }
    });

    // Store references for cleanup
    this.clickToActivate = {
        activeCard: () => activeCard,
        deactivateAll: () => {
            if (activeCard) {
                this.deactivateCard(activeCard);
                activeCard = null;
                this.clearAutoDeactivate();
            }
        }
    };

    console.log('🎯 Universal click-to-activate setup complete');
},

// Activate card with enhanced glow and persistent actions
activateCard(card) {
    card.classList.add('card-activated');
    
    // Optional: Add subtle haptic feedback for mobile devices
    if (navigator.vibrate && window.innerWidth <= 768) {
        navigator.vibrate(30);
    }
    
    console.log('✨ Card activated:', card.dataset.leadId);
},

// Deactivate card
deactivateCard(card) {
    card.classList.remove('card-activated');
    console.log('🔄 Card deactivated:', card.dataset.leadId);
},

// Auto-deactivate timer management
setAutoDeactivate(callback) {
    this.clearAutoDeactivate();
    this.autoDeactivateTimer = setTimeout(callback, 10000); // 10 seconds
},

clearAutoDeactivate() {
    if (this.autoDeactivateTimer) {
        clearTimeout(this.autoDeactivateTimer);
        this.autoDeactivateTimer = null;
    }
},

    handleDragStart(e) {
    const card = e.target.closest('.lead-card');
    if (!card) return;

    this.dragState.isDragging = true;
    this.dragState.draggedLead = card.dataset.leadId;
    this.dragState.sourceColumn = card.dataset.leadStatus;
    this.dragState.dragElement = card;

    // 🔥 CLEAN DRAG VISUAL - NO FANCY STUFF
    card.style.opacity = '0.7';
    card.style.transform = 'rotate(3deg) scale(1.05)';
    card.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.3)';
    card.style.cursor = 'grabbing';
    card.style.zIndex = '1000';
    card.style.transition = 'all 0.2s ease';
    
    card.classList.add('dragging');
    
    // Show drop zones
    this.showAllDropZones();
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.leadId);
    
    console.log(`🚀 Dragging lead: ${card.dataset.leadId}`);
},

handleDragEnd(e) {
    const card = e.target.closest('.lead-card');
    if (card) {
        // 🔥 RESET ALL STYLES CLEANLY
        card.style.opacity = '';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.cursor = '';
        card.style.zIndex = '';
        card.style.transition = '';
        
        card.classList.remove('dragging');
    }

    // Hide all drop zones
    this.hideAllDropZones();

    // Reset drag state
    this.dragState.isDragging = false;
    this.dragState.draggedLead = null;
    this.dragState.sourceColumn = null;
    this.dragState.dragElement = null;
    
    console.log('✅ Drag ended, state reset');
},

handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Highlight current drop zone
    const container = e.target.closest('.stage-content');
    if (container && this.dragState.isDragging) {
        this.highlightSpecificDropZone(container);
    }
},

handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const container = e.target.closest('.stage-content');
    if (container && this.dragState.isDragging) {
        this.highlightSpecificDropZone(container);
    }
},

handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const container = e.target.closest('.stage-content');
    if (container) {
        // Only remove highlight if actually leaving the container
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !container.contains(relatedTarget)) {
            this.removeSpecificDropZoneHighlight(container);
        }
    }
},

async handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const container = e.target.closest('.stage-content');
    if (!container) {
        console.log('🚫 No valid drop container found');
        return;
    }

    // Remove any drag styling
    container.classList.remove('drag-over', 'drop-zone-active');

    const targetStage = container.dataset.stageContent;
    const leadId = this.dragState.draggedLead;
    const sourceStage = this.dragState.sourceColumn;

    // Validate drop
    if (!leadId || !targetStage) {
        console.log('🚫 Invalid drop - missing data');
        return;
    }

    if (targetStage === sourceStage) {
        console.log('🚫 Invalid drop - same stage');
        return;
    }
    
    console.log(`🎯 Valid drop: ${leadId} from ${sourceStage} to ${targetStage}`);
    
    // Update UI immediately for smooth UX
    this.updateLeadStatusImmediate(leadId, targetStage);
    
    // Then update backend
    await this.updateLeadStatusDirect(leadId, targetStage);
},

    // 🎯 Show All Drop Zones
    showAllDropZones() {
        const allStageContents = document.querySelectorAll('.stage-content');
        allStageContents.forEach(container => {
            const stageId = container.dataset.stageContent;
            
            // Don't highlight the source stage
            if (stageId !== this.dragState.sourceColumn) {
                container.classList.add('drop-zone-available');
            } else {
                container.classList.add('drop-zone-source');
            }
        });
    },

    // 🎯 Hide All Drop Zones
    hideAllDropZones() {
        const allStageContents = document.querySelectorAll('.stage-content');
        allStageContents.forEach(container => {
            container.classList.remove('drop-zone-available', 'drop-zone-active', 'drop-zone-source');
        });
    },

    // 🎯 Highlight Specific Drop Zone
    highlightSpecificDropZone(container) {
        // Remove active class from all containers first
        document.querySelectorAll('.stage-content').forEach(c => {
            c.classList.remove('drop-zone-active');
        });
        
        // Add active class to current container
        const stageId = container.dataset.stageContent;
        if (stageId !== this.dragState.sourceColumn) {
            container.classList.add('drop-zone-active');
        }
    },

    // 🎯 Remove Specific Drop Zone Highlight
    removeSpecificDropZoneHighlight(container) {
        container.classList.remove('drop-zone-active');
    },

    // 🚀 IMMEDIATE UI UPDATE (No Jitter)
    updateLeadStatusImmediate(leadId, newStatus) {
        try {
            const lead = this.leads.find(l => l.id.toString() === leadId.toString());
            if (!lead) return;

            const oldStatus = lead.status;
            
            // Update lead status immediately
            lead.status = newStatus;
            this.organizeLeads();

            // Find the dragged card
            const draggedCard = this.dragState.dragElement;
            if (!draggedCard) return;

            // Update card's data attribute
            draggedCard.dataset.leadStatus = newStatus;
            
            // Move card to new container immediately
            const targetContainer = document.querySelector(`[data-leads-container="${newStatus}"]`);
            const sourceContainer = document.querySelector(`[data-leads-container="${oldStatus}"]`);
            
            if (targetContainer && sourceContainer && draggedCard.parentNode === sourceContainer) {
                // Add smooth transition
                draggedCard.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                
                // Move to new container
                const existingEmptyState = targetContainer.querySelector('.empty-state');
            if (existingEmptyState) {
                existingEmptyState.remove();
            }
                targetContainer.appendChild(draggedCard);
                
                // Update card styling for new stage
                draggedCard.className = draggedCard.className.replace(/active-card|outcome-card/g, '');
                const newStage = this.stages.find(s => s.id === newStatus);
                if (newStage) {
                    draggedCard.classList.add(newStage.row === 'active' ? 'active-card' : 'outcome-card');
                }

                // Remove loss reason section if moving away from lost
if (oldStatus === 'lost' && newStatus !== 'lost') {
    const lossReasonSection = draggedCard.querySelector('.loss-reason-section');
    if (lossReasonSection) {
        lossReasonSection.remove();
        console.log('🗑️ Removed loss reason section');
    }
}

                // Handle loss reason section
if (newStatus === 'lost') {
    const cardBody = draggedCard.querySelector('.card-body');
    if (cardBody && !cardBody.querySelector('.loss-reason-section')) {
        const lossReasonHTML = lead.lost_reason ? `
            <div class="loss-reason-section">
                <div class="loss-reason-display">
                    <span class="loss-icon">❌</span>
                    <span class="loss-text">${lead.lost_reason}</span>
                    <button class="loss-edit-btn" onclick="PipelineModule.editLossReason('${lead.id}')" title="Edit loss reason">
                        <span class="edit-icon">✏️</span>
                    </button>
                </div>
            </div>
        ` : `
            <div class="loss-reason-section">
                <button class="loss-reason-btn" onclick="PipelineModule.addLossReason('${lead.id}')" title="Add loss reason">
                    <span class="btn-icon">❌</span>
                    <span class="btn-text">Add loss reason</span>
                </button>
            </div>
        `;
        cardBody.insertAdjacentHTML('beforeend', lossReasonHTML);
    }
}


                // Animate into place
                requestAnimationFrame(() => {
                    draggedCard.style.transform = 'translateY(0)';
                    draggedCard.style.opacity = '1';
                });
                
                // Update stage counts immediately
                const remainingLeadsInSource = sourceContainer.querySelectorAll('.lead-card').length;
            if (remainingLeadsInSource === 0) {
                const sourceStage = this.stages.find(s => s.id === oldStatus);
                if (sourceStage) {
                    sourceContainer.innerHTML = this.renderLeadsOrEmpty([], sourceStage);
                }
            }
                this.updateStageCounts();

                const analyticsContainer = document.querySelector('.analytics-grid');
if (analyticsContainer) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.renderStreamlinedAnalytics();
    const newGrid = tempDiv.querySelector('.analytics-grid');
    if (newGrid) {
        analyticsContainer.innerHTML = newGrid.innerHTML;
    }
}
            }
            
        } catch (error) {
            console.error('❌ Failed to update UI immediately:', error);
        }
    },

    updateStageCounts() {
    this.stages.forEach(stage => {
        // Use FILTERED leads when filters are active, ALL leads when no filters
        const hasActiveFilters = this.filters.search || 
                                this.filters.type !== 'all' || 
                                this.filters.source !== 'all' || 
                                this.filters.score !== 'all';
        
        let stageLeads, count;
        
        if (hasActiveFilters) {
            // Show filtered count
            stageLeads = this.filteredLeads[stage.id] || [];
            count = stageLeads.length;
        } else {
            // Show total count
            stageLeads = this.leads.filter(lead => lead.status === stage.id);
            count = stageLeads.length;
        }
        
        // Update the count badge
        const countElement = document.querySelector(`[data-stage="${stage.id}"] .stage-count-badge`);
        if (countElement) {
            countElement.textContent = count;
        }
        
        // Calculate value from the same lead set
        const value = stageLeads.reduce((total, lead) => {
            const leadValue = lead.potential_value;
            const numericValue = (leadValue === null || leadValue === undefined || leadValue === '' || isNaN(Number(leadValue))) ? 0 : Number(leadValue);
            return total + numericValue;
        }, 0);
        
        const valueElement = document.querySelector(`[data-stage="${stage.id}"] .stage-value`);
        if (valueElement) {
            valueElement.textContent = `$${value.toLocaleString()}`;
        }
    });
    
    // Update section badges and values with filtered calculations
    const hasActiveFilters = this.filters.search || 
                        this.filters.type !== 'all' || 
                        this.filters.source !== 'all' || 
                        this.filters.score !== 'all';
const activeBadge = document.querySelector('.active-section .section-badge');
const outcomeBadge = document.querySelector('.outcome-section .section-badge');
const outcomeValue = document.querySelector('.outcome-section .section-value');

if (hasActiveFilters) {
    // Show filtered counts
    if (activeBadge) activeBadge.textContent = `${this.getFilteredActiveLeadsCount()} leads`;
    if (outcomeBadge) outcomeBadge.textContent = `${this.getFilteredOutcomeLeadsCount()} leads`;
    if (outcomeValue) {
        const totalOutcome = this.calculateFilteredOutcomeValue();
        outcomeValue.textContent = `$${totalOutcome.toLocaleString()}`;
    }
} else {
    // Show total counts
    if (activeBadge) activeBadge.textContent = `${this.getActiveLeadsCount()} leads`;
    if (outcomeBadge) outcomeBadge.textContent = `${this.getOutcomeLeadsCount()} leads`;
    if (outcomeValue) {
        const totalOutcome = this.calculateOutcomeValue();
        outcomeValue.textContent = `$${totalOutcome.toLocaleString()}`;
    }
}
},

  async updateLeadStatusDirect(leadId, newStatus) {
    try {
        const stageName = this.stages.find(s => s.id === newStatus)?.name || newStatus;
        
        // Update backend
        await API.updateLead(leadId, { status: newStatus });
        
    } catch (error) {
        console.error('❌ Failed to update lead status:', error);
        
        // 🛑 STOP LOOPS ON ALL NETWORK/AUTH ERRORS
        if (error.toString().includes('Invalid or expired token') ||
            error.toString().includes('Authentication required') ||
            error.toString().includes('Load failed') ||              // 🔥 THIS IS KEY
            error.toString().includes('network connection was lost') || // 🔥 ADD THIS TOO
            error.message?.includes('Invalid or expired token') ||
            error.message?.includes('Authentication required') ||
            error.message?.includes('Load failed') ||                 // 🔥 THIS IS KEY
            error.message?.includes('network connection was lost')) {   // 🔥 ADD THIS TOO
            
            console.log('🔑 Network/Auth error detected - stopping retry loop');
            this.showNotification('❌ Connection error. Please check your internet and refresh.', 'error');
            
            // 🚨 CRITICAL: DON'T RETRY OR REFRESH ON THESE ERRORS
            return;
        }
        
        // Only revert UI for other errors (like validation errors)
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (lead) {
            lead.status = this.dragState.sourceColumn; // Revert to original
            await this.refreshPipeline(); // Full refresh to fix UI
        }
        
        this.showNotification('Failed to update lead status. Please try again.', 'error');
    }
},

    // 🔍 Setup Filters
    setupFilters() {
        const searchInput = document.getElementById('pipelineSearch');
        const clearBtn = document.getElementById('clearFilters');

        let searchTimeout;
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value;
                this.applyFiltersAndRerender();
            }, 300);
        });

        clearBtn?.addEventListener('click', () => {
            this.clearFilters();
        });

        console.log('🔍 Filter event listeners setup');
    },

    applyFiltersAndRerender() {
    this.organizeLeads();
    
    this.stages.forEach(stage => {
        const container = document.querySelector(`[data-leads-container="${stage.id}"]`);
        const stageContent = document.querySelector(`[data-stage-content="${stage.id}"]`);
        
        if (container && stageContent) {
            const stageLeads = this.filteredLeads[stage.id] || [];
            container.innerHTML = this.renderLeads(stageLeads, stage);
        }
    });

    // This will now show filtered counts when filters are active
    this.updateStageCounts();
    
    this.setupDragAndDrop();
},

    clearFilters() {
    this.filters = {
        search: '',
        type: 'all',
        source: 'all',
        score: 'all'
    };

    const searchInput = document.getElementById('pipelineSearch');
    if (searchInput) searchInput.value = '';

    // 🔥 RESET SIMPLIFIED DROPDOWNS
    const typeFilter = document.getElementById('typeFilter');
    const scoreFilter = document.getElementById('scoreFilter');
    
    if (typeFilter) typeFilter.value = 'all';
    if (scoreFilter) scoreFilter.value = 'all';

    this.applyFiltersAndRerender();
},

    // ✏️ Setup Editing System
    setupEditingSystem() {
        const modal = document.getElementById('editModal');
        const closeBtn = document.getElementById('closeEditModal');
        
        // Close modal events
        closeBtn?.addEventListener('click', () => this.closeEditModal());
        modal?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeEditModal();
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.editState.isEditing) {
                this.closeEditModal();
            }
        });
        
        console.log('✏️ Edit system setup complete');
    },

    closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.classList.remove('show');
        
        // Reset edit state
        this.editState.isEditing = false;
        this.editState.editingLeadId = null;
        this.editState.originalData = null;
        
        // Clear modal content after animation
        setTimeout(() => {
            const modalBody = document.getElementById('editModalBody');
            if (modalBody) modalBody.innerHTML = '';
        }, 300);
        
        console.log('✅ Edit modal closed');
    }
},

renderEditForm(lead) {
    return `
        <form id="editLeadForm" class="minimalist-edit-form">
            <!-- 🔥 TEMPERATURE TOGGLE -->
            <div class="temperature-section">
                <label class="section-label">Lead Temperature</label>
                <div class="temperature-toggle">
                    <button type="button" class="temp-btn ${lead.type === 'cold' ? 'active' : ''}" data-temp="cold">
                        <span class="temp-icon">❄️</span>
                        <span class="temp-label">Cold</span>
                    </button>
                    <button type="button" class="temp-btn ${lead.type === 'hot' ? 'active' : ''}" data-temp="hot">
                        <span class="temp-icon">🔥</span>
                        <span class="temp-label">Hot</span>
                    </button>
                </div>
                <input type="hidden" id="editType" value="${lead.type || ''}">
            </div>

            <!-- 🎯 QUALITY SCORE SLIDER -->
            <div class="quality-section">
                <label class="section-label">Quality Score</label>
                <div class="quality-slider-container">
                    <div class="score-track">
                        <input type="range" 
                               id="editScore" 
                               class="quality-slider" 
                               min="1" 
                               max="10" 
                               value="${lead.qualityScore || 5}"
                               oninput="this.style.setProperty('--value', this.value); document.getElementById('scoreDisplay').textContent = this.value; this.style.setProperty('--color', this.value >= 8 ? 'var(--primary)' : this.value >= 6 ? 'var(--success)' : this.value >= 4 ? 'var(--warning)' : 'var(--danger)');">
                    </div>
                    <div class="score-display-container">
                        <div class="score-number" id="scoreDisplay">${lead.qualityScore || 5}</div>
                        <div class="score-label">out of 10</div>
                    </div>
                </div>
            </div>

            <!-- 📝 NOTES AREA -->
            <div class="notes-section">
                <label class="section-label">Notes</label>
                <textarea id="editNotes" 
                          class="notes-textarea" 
                          rows="6"
                          placeholder="Add context, insights, or important details about this lead...">${lead.notes || ''}</textarea>
            </div>

            <!-- 🎪 FORM ACTIONS -->
            <div class="form-actions">
                <button type="button" class="btn-danger" id="deleteLeadBtn">
                    🗑️ Delete Lead
                </button>
                <div class="form-actions-right">
                    <button type="button" class="btn-secondary" onclick="PipelineModule.closeEditModal()">
                        Cancel
                    </button>
                    <button type="submit" class="btn-primary">
                        <span class="btn-loading" id="saveLoading" style="display: none;">
                            <div class="loading-spinner-small"></div>
                        </span>
                        <span class="btn-text">Save Changes</span>
                    </button>
                </div>
            </div>
        </form>
        
        <style>
            /* 🎨 MINIMALIST EDIT FORM STYLES */
            .minimalist-edit-form {
                display: flex;
                flex-direction: column;
                gap: 2rem;
                padding: 0;
            }

            .section-label {
                font-size: 1rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 1rem;
                display: block;
            }

            /* 🔥 TEMPERATURE TOGGLE */
            .temperature-section {
                background: var(--surface-hover);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                border: 1px solid var(--border);
            }

            .temperature-toggle {
                display: flex;
                gap: 1rem;
                width: 100%;
            }

            .temp-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                padding: 1rem 1.5rem;
                border: 2px solid var(--border);
                border-radius: var(--radius);
                background: var(--background);
                color: var(--text-secondary);
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-weight: 600;
                font-size: 0.95rem;
            }

            .temp-btn:hover {
                border-color: var(--primary);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
            }

            .temp-btn.active {
                border-color: var(--primary);
                background: var(--primary);
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .temp-icon {
                font-size: 1.25rem;
            }

            .temp-label {
                font-weight: 700;
            }

            /* 🎯 QUALITY SCORE SLIDER */
            .quality-section {
                background: var(--surface-hover);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                border: 1px solid var(--border);
            }

            .quality-slider-container {
                display: flex;
                align-items: center;
                gap: 2rem;
            }

            .score-track {
                flex: 1;
                position: relative;
            }

            .quality-slider {
                width: 100%;
                height: 8px;
                border-radius: 4px;
                background: linear-gradient(to right, 
                    var(--danger) 0%, 
                    var(--warning) 40%, 
                    var(--success) 70%, 
                    var(--primary) 100%);
                outline: none;
                --value: ${lead.qualityScore || 5};
                --color: ${(lead.qualityScore || 5) >= 8 ? 'var(--primary)' : (lead.qualityScore || 5) >= 6 ? 'var(--success)' : (lead.qualityScore || 5) >= 4 ? 'var(--warning)' : 'var(--danger)'};
            }

            .quality-slider::-webkit-slider-thumb {
                appearance: none;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: var(--color, var(--primary));
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transition: all 0.2s ease;
            }

            .quality-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            }

            .quality-slider::-moz-range-thumb {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: var(--color, var(--primary));
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            .score-display-container {
                text-align: center;
                min-width: 80px;
            }

            .score-number {
                font-size: 2.5rem;
                font-weight: 800;
                color: var(--color, var(--primary));
                line-height: 1;
                margin-bottom: 0.25rem;
            }

            .score-label {
                font-size: 0.8rem;
                color: var(--text-tertiary);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* 📝 NOTES SECTION */
            .notes-section {
                background: var(--surface-hover);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                border: 1px solid var(--border);
            }

            .notes-textarea {
                width: 100%;
                padding: 1.25rem;
                border: 2px solid var(--border);
                border-radius: var(--radius);
                font-size: 1rem;
                background: var(--background);
                color: var(--text-primary);
                transition: all 0.3s ease;
                font-family: inherit;
                line-height: 1.6;
                resize: vertical;
                min-height: 140px;
            }

            .notes-textarea:focus {
                outline: none;
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                transform: translateY(-1px);
            }

            .notes-textarea::placeholder {
                color: var(--text-tertiary);
                font-style: italic;
            }

            /* 🎪 FORM ACTIONS */
            .form-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 1.5rem;
                border-top: 1px solid var(--border);
                margin-top: 1rem;
            }

            .form-actions-right {
                display: flex;
                gap: 1rem;
            }

            .btn-primary, .btn-secondary, .btn-danger {
                padding: 1rem 2rem;
                border-radius: var(--radius);
                font-weight: 600;
                font-size: 0.95rem;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: none;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                position: relative;
                overflow: hidden;
            }

            .btn-primary {
                background: var(--primary);
                color: white;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .btn-primary:hover:not(:disabled) {
                background: var(--primary-dark);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
            }

            .btn-secondary {
                background: var(--surface-hover);
                color: var(--text-primary);
                border: 2px solid var(--border);
            }

            .btn-secondary:hover {
                background: var(--background);
                border-color: var(--primary);
                color: var(--primary);
                transform: translateY(-1px);
            }

            .btn-danger {
                background: var(--danger);
                color: white;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }

            .btn-danger:hover {
                background: #dc2626;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
            }

            .loading-spinner-small {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 0.8s linear infinite;
            }

            /* 📱 MOBILE RESPONSIVE */
            @media (max-width: 768px) {
                .quality-slider-container {
                    flex-direction: column;
                    gap: 1rem;
                }

                .score-display-container {
                    order: -1;
                }

                .temperature-toggle {
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .form-actions {
                    flex-direction: column;
                    gap: 1rem;
                    align-items: stretch;
                }

                .form-actions-right {
                    flex-direction: column;
                }

                .btn-primary, .btn-secondary, .btn-danger {
                    width: 100%;
                    justify-content: center;
                }
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
},

    editLead(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) {
            this.showNotification('Lead not found', 'error');
            return;
        }

        this.editState.isEditing = true;
        this.editState.editingLeadId = leadId;
        this.editState.originalData = { ...lead };

        const modal = document.getElementById('editModal');
        const modalBody = document.getElementById('editModalBody');
        
        modalBody.innerHTML = this.renderEditForm(lead);
        modal.classList.add('show');

        this.setupEditFormListeners();
        
        console.log(`✏️ Editing lead: ${lead.name}`);
    },

    setupEditFormListeners() {
    const form = document.getElementById('editLeadForm');
    form?.addEventListener('submit', (e) => this.handleEditSubmit(e));
    
    const deleteBtn = document.getElementById('deleteLeadBtn');
    deleteBtn?.addEventListener('click', () => {
        this.showDeleteConfirmation(this.editState.editingLeadId);
    });
    
    // 🔥 TEMPERATURE TOGGLE LISTENERS
    document.querySelectorAll('.temp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all buttons
            document.querySelectorAll('.temp-btn').forEach(b => b.classList.remove('active'));
            
            // Add active to clicked button
            btn.classList.add('active');
            
            // Update hidden input
            const tempValue = btn.dataset.temp;
            document.getElementById('editType').value = tempValue;
            
            console.log(`Temperature updated: ${tempValue}`);
        });
    });
    
    // 🎯 QUALITY SLIDER INITIALIZATION
    const slider = document.getElementById('editScore');
    if (slider) {
        // Set initial CSS custom properties
        const initialValue = slider.value;
        const initialColor = initialValue >= 8 ? 'var(--primary)' : 
                           initialValue >= 6 ? 'var(--success)' : 
                           initialValue >= 4 ? 'var(--warning)' : 'var(--danger)';
        
        slider.style.setProperty('--value', initialValue);
        slider.style.setProperty('--color', initialColor);
        
        // Update score display color
        const scoreDisplay = document.getElementById('scoreDisplay');
        if (scoreDisplay) {
            scoreDisplay.style.color = initialColor;
        }
    }
},

// 🔥 UPDATED SUBMIT HANDLER (MINIMALIST VERSION)
async handleEditSubmit(e) {
    e.preventDefault();
    
    const loadingSpinner = document.getElementById('saveLoading');
    const saveBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        loadingSpinner.style.display = 'flex';
        saveBtn.disabled = true;
        
        // 🎯 ONLY GET THE TRIO VALUES
        const typeValue = document.getElementById('editType').value || null;
        const qualityScoreValue = parseInt(document.getElementById('editScore').value) || 5;
        const notesValue = document.getElementById('editNotes').value.trim() || null;
        
        const updatedData = {
            type: typeValue,
            quality_score: qualityScoreValue,
            notes: notesValue
        };

        console.log('💾 Saving minimalist data:', updatedData);

        await API.updateLead(this.editState.editingLeadId, updatedData);
        
        this.closeEditModal();
        await this.refreshPipeline();
        
        this.showNotification('Lead updated successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to update lead:', error);
        this.showNotification(`Failed to update lead: ${error.message}`, 'error');
    } finally {
        loadingSpinner.style.display = 'none';
        saveBtn.disabled = false;
    }
},

// Add this to your PipelineModule
async confirmDeleteLead(leadId) {
    const confirmModal = document.querySelector('.delete-confirm-overlay');
    if (confirmModal) confirmModal.remove();
    
    try {
        await API.deleteLead(leadId);
        
        this.leads = this.leads.filter(l => l.id.toString() !== leadId.toString());
        this.closeEditModal();
        await this.refreshPipeline();
        
        this.showNotification('🗑️ Lead deleted successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Delete failed:', error);
        this.showNotification('❌ Failed to delete lead', 'error');
    }
},


    // ⚡ Quick Actions
    async quickCall(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        if (lead.phone) {
            window.open(`tel:${lead.phone}`, '_self');
            this.showNotification(`Calling ${lead.name}...`, 'info');
            
            try {
                if (API.logCommunication) {
                    await API.logCommunication({
                        leadId: leadId,
                        type: 'call',
                        subject: 'Phone call initiated',
                        notes: `Called ${lead.phone} from pipeline`
                    });
                }
            } catch (error) {
                console.error('Failed to log call:', error);
            }
        } else {
            this.showNotification(`No phone number for ${lead.name}`, 'warning');
        }
    },

    async quickEmail(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        if (lead.email) {
            const subject = encodeURIComponent(`Following up - ${lead.name}`);
            const body = encodeURIComponent(`Hi ${lead.name.split(' ')[0]},\n\nI wanted to follow up on our conversation.\n\nBest regards,`);
            window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_self');
            
            this.showNotification(`Email to ${lead.name} opened`, 'info');
            
            try {
                if (API.logCommunication) {
                    await API.logCommunication({
                        leadId: leadId,
                        type: 'email',
                        subject: 'Email initiated',
                        notes: `Email sent to ${lead.email} from pipeline`
                    });
                }
            } catch (error) {
                console.error('Failed to log email:', error);
            }
        } else {
            this.showNotification(`No email address for ${lead.name}`, 'warning');
        }
    },

async simpleRefresh() {
    try {
        await this.loadLeads();
        await this.loadMonthlyStats();
        this.organizeLeads();
        
        // Just re-render the whole thing - simple and bulletproof
        this.render();
        this.setupDragAndDrop();
        this.setupFilters();
        this.setupEditingSystem();
        this.setupClickToActivate();
        
        console.log('✅ Simple refresh complete');
    } catch (error) {
        console.error('❌ Simple refresh failed:', error);
        
        // 🛑 STOP THE LOOP ON ALL THESE ERROR TYPES
        if (error.toString().includes('Authentication required') ||
            error.toString().includes('Invalid or expired token') ||
            error.toString().includes('Load failed') ||              // 🔥 ADD THIS
            error.message?.includes('Authentication required') ||
            error.message?.includes('Invalid or expired token') ||
            error.message?.includes('Load failed')) {                // 🔥 ADD THIS
            
            console.log('🔑 Connection/Auth error detected - stopping refresh loop');
            
            // Show user-friendly message
            this.showNotification('❌ Connection error. Please refresh page and try again.', 'error');
            
            // Stop any loading states
            this.isLoading = false;
            
            // 🚨 CRITICAL: DON'T THROW OR RETRY ON THESE ERRORS
            return;
        }
        
        // Only throw/retry for other errors
        throw error;
    }
},

async refreshPipeline() {
    // 🛡️ PREVENT MULTIPLE SIMULTANEOUS REFRESHES
    if (this.isLoading) {
        console.log('🚫 Refresh already in progress, skipping...');
        return;
    }
    
    try {
        this.isLoading = true;
        await this.simpleRefresh();
    } catch (error) {
        console.error('❌ Pipeline refresh failed:', error);
        
        // Don't spam notifications on connection/auth errors (already handled in simpleRefresh)
        if (!error.toString().includes('Authentication') &&
            !error.toString().includes('Invalid or expired token') &&
            !error.toString().includes('Load failed')) {              // 🔥 ADD THIS
            this.showNotification('❌ Failed to refresh pipeline', 'error');
        }
    } finally {
        this.isLoading = false;
    }
},

    // 🔧 System Utilities
    debug() {
        return {
            version: this.version,
            leads: this.leads.length,
            monthlyStats: this.monthlyStats,
            filteredLeads: Object.keys(this.filteredLeads).reduce((acc, key) => {
                acc[key] = this.filteredLeads[key].length;
                return acc;
            }, {}),
            filters: this.filters,
            dragState: this.dragState,
            editState: this.editState,
            isLoading: this.isLoading,
            outcomeValue: this.calculateOutcomeValue(),
            activeLeads: this.getActiveLeadsCount(),
            outcomeLeads: this.getOutcomeLeadsCount()
        };
    },

    destroy() {
        // Clean up all event listeners to prevent memory leaks
        this.dragAndDropInitialized = false;
        this.removeDragAndDropListeners?.();
        this.removeFilterListeners?.();
        this.removeEditingListeners?.();
        
        // Reset state
        this.leads = [];
        this.filteredLeads = {};
        this.monthlyStats = { currentMonthLeads: 0, monthlyLeadLimit: 50 };
        this.dragState = {
            isDragging: false,
            draggedLead: null,
            sourceColumn: null,
            dragElement: null
        };
        this.editState = {
            isEditing: false,
            editingLeadId: null,
            originalData: null
        };
        
        console.log('🧹 Streamlined Pipeline Module destroyed');
    }
};

// 🚀 INITIALIZE STREAMLINED PIPELINE MODULE
if (typeof window !== 'undefined') {
    window.PipelineModule = PipelineModule;
    
    // Development helpers
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.pipelineDebug = () => PipelineModule.debug?.() || 'Debug method not available';
        console.log('🛠️ Pipeline debug available at window.pipelineDebug()');
    }
}

console.log('🌿 STREAMLINED PIPELINE MODULE v3.0.0 - FREE DASHBOARD EDITION LOADED!');
console.log('🎯 Enhanced with monthly progress tracking and mobile-friendly design!');
console.log('⚡ Ready to create streamlined sales pipeline experiences!');
console.log('🎯 Available globally as: window.PipelineModule');

/**
 * 🎯 STREAMLINED PIPELINE USAGE EXAMPLES:
 * 
 * // 🚀 Initialize Streamlined Pipeline
 * await PipelineModule.init();
 * 
 * // 📊 Monthly Progress Features
 * - Automatic monthly lead tracking with visual progress bar
 * - Color-coded warnings when approaching limits
 * - Integration with API.getCurrentMonthStats()
 * 
 * // 🎯 Streamlined 3+3 Pipeline
 * - Active: New → Contacted → Qualified
 * - Outcome: Negotiation → Closed → Lost
 * - Clean drag & drop between stages
 * 
 * // 📱 Mobile-Friendly Features
 * - Pipeline selector with arrow button (➡️)
 * - Touch-friendly drag and drop
 * - Bottom sheet modal for stage selection
 * - Responsive design for all screen sizes
 * 
 * // 💰 Enhanced Value Tracking
 * - Pipeline value from negotiation + closed + lost stages
 * - Individual stage value display
 * - Revenue tracking for completed deals
 * 
 * // 🎨 Custom UI Components
 * - Natural-styled custom dropdowns
 * - Smooth animations and transitions
 * - Professional notification system
 * - Enhanced card actions with hover effects
 * 
 * // 📊 Focused Analytics
 * - Conversion rate tracking
 * - Total pipeline value calculation
 * - Top loss reason analysis
 * - Monthly progress metrics
 * 
 * // 🔧 Quick Actions
 * PipelineModule.showPipelineSelector('leadId'); // Mobile stage selector
 * PipelineModule.quickCall('leadId'); // Initiate phone call
 * PipelineModule.quickEmail('leadId'); // Open email client
 * PipelineModule.exportAnalytics(); // Export CSV report
 * 
 * // 🛠️ Debug & Development
 * pipelineDebug(); // View module state and metrics
 * PipelineModule.showNotification('Test message', 'success');
 * 
 * // 🎯 Perfect for Free Dashboard
 * - No "Professional" branding
 * - Clean, focused interface
 * - Essential features only
 * - Mobile-first design approach
 */