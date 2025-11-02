window.PipelineModule = {
    // State
    state: {
        leads: [],
        stats: { currentLeads: 0, currentLeadLimit: 50 },
        filters: { search: '', types: [], sources: [], scores: [] },
        draggedLead: null,
        container: 'pipeline-content'
    },

    // Stage definitions
    stages: [
    { id: 'new', name: 'New Leads', icon: 'sparkles', color: '#06b6d4', desc: 'Fresh leads', row: 'active' },
    { id: 'contacted', name: 'Contacted', icon: 'phone', color: '#f59e0b', desc: 'Initial contact made', row: 'active' },
    { id: 'negotiation', name: 'Negotiation', icon: 'handshake', color: '#F97316', desc: 'Deal terms discussed', row: 'active' },
    { id: 'qualified', name: 'Qualified', icon: 'check-circle', color: '#8b5cf6', desc: 'Potential confirmed', row: 'outcome' },
    { id: 'closed', name: 'Closed Won', icon: 'trophy', color: '#10b981', desc: 'Successfully won', row: 'outcome' },
    { id: 'lost', name: 'Lost', icon: 'x-circle', color: '#ef4444', desc: 'Deal not won', row: 'outcome' }
],

    // Initialize
    async pipeline_init(targetContainer = 'pipeline-content') {
        console.log('Pipeline module loading');
        
        this.showLoading();
        
        try {
            await this.loadData();
            this.render();
            this.attachEvents();
            console.log('Pipeline module ready');
        } catch (error) {
            console.error('Pipeline init failed:', error);
            this.showError('Failed to load pipeline');
        }
    },

    // Load all data in parallel
    async loadData() {
        const [leadData, stats] = await Promise.all([
            API.getLeads(),
            API.getCurrentStats()
        ]);
        
        this.state.leads = (Array.isArray(leadData) ? leadData : leadData.all || []).map(lead => ({
            ...lead,
            status: lead.status || 'new',
            potential_value: lead.potential_value || 0,
            quality_score: lead.quality_score || 5,
            type: lead.type || 'cold'
        }));
        
        this.state.stats = {
            currentLeads: stats.currentLeads || 0,
            currentLeadLimit: stats.currentLeadLimit || 50
        };
    },

    // Get filtered leads organized by stage
    getOrganizedLeads() {
        const { search, types, sources, scores } = this.state.filters;
        const organized = {};
        
        this.stages.forEach(stage => {
            organized[stage.id] = this.state.leads.filter(lead => {
                if (lead.status !== stage.id) return false;
                
                if (search) {
                    const term = search.toLowerCase();
                    const matches = [lead.name, lead.company, lead.email].some(field => 
                        field?.toLowerCase().includes(term)
                    );
                    if (!matches) return false;
                }
                
                if (types.length && !types.includes(lead.type)) return false;
                if (sources.length) {
                const leadSource = lead.source || null;
                const hasCustomFilter = sources.includes('custom');
    
                // Predefined sources (from your dropdown)
                const predefined = ['Website', 'LinkedIn', 'Facebook', 'Instagram',
                    'Twitter', 'Referral', 'Email', 'Phone', 'Event',
                    'Advertisement', 'Direct', 'Google', 'Organic', 'Paid Ads',
                    'Cold Call', 'Trade Show', 'Webinar', 'Content', 'Partnership'];
    
                // Check if it matches a predefined source OR is a custom source when custom filter is active
                const matchesPredefined = sources.includes(leadSource);
                const isCustom = leadSource && !predefined.includes(leadSource);
                const matchesCustom = hasCustomFilter && isCustom;
    
                if (!matchesPredefined && !matchesCustom) return false;
                }
                
                if (scores.length) {
                    const score = lead.quality_score || 5;
                    const category = score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low';
                    if (!scores.includes(category)) return false;
                }
                
                return true;
            });
        });
        
        return organized;
    },

    // Calculate all analytics in one pass
    getAnalytics() {
        const organized = this.getOrganizedLeads();
        const closedLeads = organized.closed || [];
        const lostLeads = organized.lost || [];
        
        const totalValue = this.state.leads.reduce((sum, l) => 
            sum + (l.potential_value || 0), 0
        );
        
        const totalOutcome = closedLeads.length + lostLeads.length;
        const conversionRate = totalOutcome > 0 ? 
            Math.round((closedLeads.length / totalOutcome) * 100) : 0;
        
        const reasonCounts = {};
        lostLeads.forEach(lead => {
            if (lead.lost_reason) {
                reasonCounts[lead.lost_reason] = (reasonCounts[lead.lost_reason] || 0) + 1;
            }
        });
        
        const topReason = Object.entries(reasonCounts)
            .sort(([,a], [,b]) => b - a)[0] || ['N/A', 0];
        
        return {
            totalValue,
            conversionRate,
            topLossReason: topReason[0],
            topLossCount: topReason[1]
        };
    },

    // Main render
    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        const organized = this.getOrganizedLeads();
        const analytics = this.getAnalytics();
        const activeCount = ['new', 'contacted', 'negotiation']
            .reduce((sum, id) => sum + organized[id].length, 0);
        const outcomeCount = ['qualified', 'closed', 'lost']
            .reduce((sum, id) => sum + organized[id].length, 0);
        const outcomeValue = ['qualified', 'closed', 'lost']
            .reduce((sum, id) => sum + organized[id].reduce((s, l) => s + (l.potential_value || 0), 0), 0);

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="pipeline-container">
                ${this.renderHeader()}
                ${this.renderFilters()}
                ${this.hasActiveFilters() ? this.renderActiveFilters(organized) : ''}
                
                <div class="pipeline-section">
                    <div class="section-header">
                        <div class="section-title-group">
                            <h2 class="section-title"><i data-lucide="target" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;"></i>Active Pipeline</h2>
                            <div class="section-badge">${activeCount} leads</div>
                        </div>
                    </div>
                    <div class="stages-grid">
                        ${this.stages.filter(s => s.row === 'active')
                            .map(s => this.renderStage(s, organized[s.id])).join('')}
                    </div>
                </div>
                
                <div class="pipeline-section">
                    <div class="section-header">
                        <div class="section-title-group">
                            <h2 class="section-title"><i data-lucide="flag" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;"></i>Sales Outcomes</h2>
                            <div class="section-badge">${outcomeCount} leads</div>
                        </div>
                        <div class="section-value">$${outcomeValue.toLocaleString()}</div>
                    </div>
                    <div class="stages-grid">
                        ${this.stages.filter(s => s.row === 'outcome')
                            .map(s => this.renderStage(s, organized[s.id])).join('')}
                    </div>
                </div>
                
                ${this.renderAnalytics(analytics)}
            </div>
        `;

        // Fade in animation
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            this.attachEvents();
        }, 50);
    },

    // Render header with progress
    renderHeader() {
        const { currentLeads, currentLeadLimit } = this.state.stats;
        const percentage = Math.min((currentLeads / currentLeadLimit) * 100, 100);
        const isNear = percentage > 80;
        const isAt = percentage >= 100;
        
        return `
            <div class="pipeline-header">
                <div class="header-brand">
                    <h1 class="pipeline-title">
                        <i data-lucide="git-branch" class="title-icon" style="width: 28px; height: 28px;"></i>
                        <span class="title-text">Sales Pipeline</span>
                    </h1>
                    <p class="pipeline-subtitle">Track leads from first contact to closed deals</p>
                </div>
                
                <div class="monthly-progress">
                    <div class="progress-header">
                        <span class="progress-title">Lead Progress</span>
                        <span class="progress-stats">
                            <span class="current-count">${currentLeads}</span>
                            <span class="separator">/</span>
                            <span class="limit-count">${currentLeadLimit}</span>
                            <span class="leads-text">leads</span>
                        </span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill ${isAt ? 'at-limit' : isNear ? 'near-limit' : ''}" 
                                 style="width: ${percentage}%"></div>
                        </div>
                        <span class="progress-percentage">${Math.round(percentage)}%</span>
                    </div>
                    ${isAt ? '<div class="progress-warning at-limit"><i data-lucide="alert-triangle" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Monthly limit reached</div>' :
                      isNear ? '<div class="progress-warning near-limit"><i data-lucide="bell" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Approaching limit</div>' : ''}
                </div>
            </div>
        `;
    },

    // Render filters
    renderFilters() {
        return `
            <div class="pipeline-filters">
                <div class="search-group">
                    <div class="search-wrapper">
                        <input type="text"
                               id="pipelineSearch"
                               class="search-input"
                               placeholder="Search leads, companies, or emails..."
                               value="${API.escapeHtml(this.state.filters.search || '')}">
                        <i data-lucide="search" class="search-icon" style="width: 18px; height: 18px;"></i>
                    </div>
                </div>
                
                <div class="filter-controls">
                    <div class="filter-btn" data-filter="type">
                        Temperature <span class="filter-arrow">▼</span>
                    </div>
                    <div class="filter-btn" data-filter="score">
                        Score <span class="filter-arrow">▼</span>
                    </div>
                    <div class="filter-btn" data-filter="source">
                        Source <span class="filter-arrow">▼</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Render active filters panel
    renderActiveFilters(organized) {
        const total = Object.values(organized).reduce((sum, arr) => sum + arr.length, 0);
        const details = [];
        
        if (this.state.filters.types.length) details.push(`Types: ${this.state.filters.types.length}`);
        if (this.state.filters.sources.length) details.push(`Sources: ${this.state.filters.sources.length}`);
        if (this.state.filters.scores.length) details.push(`Scores: ${this.state.filters.scores.length}`);
        
        return `
            <div class="active-filters-panel">
                <div class="filters-info">
                    <span class="filter-count">Showing ${total} of ${this.state.leads.length} leads</span>
                    <span class="filter-details">${API.escapeHtml(details.join(', '))}</span>
                </div>
                <button class="clear-filters-btn" onclick="PipelineModule.clearAllFilters()">
                    Clear All
                </button>
            </div>
        `;
    },

    // Render stage column
    renderStage(stage, leads) {
        const value = leads.reduce((sum, l) => sum + (l.potential_value || 0), 0);
        
        return `
            <div class="stage-column" data-stage="${stage.id}">
                <div class="stage-header" style="--stage-color: ${stage.color}">
                    <div class="stage-title-group">
                        <i data-lucide="${stage.icon}" class="stage-icon" style="width: 20px; height: 20px;"></i>
                        <div class="stage-info">
                            <h3 class="stage-name">${stage.name}</h3>
                            <div class="stage-meta">
                                <span class="stage-value">$${value.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div class="stage-count">${leads.length}</div>
                </div>
                
                <div class="stage-content" data-stage-content="${stage.id}">
                    ${leads.length > 0 ? 
                        leads.map(l => this.renderLeadCard(l, stage)).join('') :
                        this.renderEmpty(stage)}
                </div>
            </div>
        `;
    },

    // Render lead card with 40-line note truncation
    renderLeadCard(lead, stage) {
        const typeIcon = lead.type === 'warm' ? 'flame' : 'snowflake';
        const scoreColor = lead.quality_score >= 8 ? 'var(--primary)' :
                          lead.quality_score >= 6 ? 'var(--success)' :
                          lead.quality_score >= 4 ? 'var(--warning)' : 'var(--danger)';
        
        const truncateText = (text, maxLength) => {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        };
        
        const safeName = API.escapeHtml(truncateText(lead.name, 18));
        const safeCompany = API.escapeHtml(truncateText(lead.company || 'No company', 25));
        const safeEmail = API.escapeHtml(truncateText(lead.email || '', 30));
        const safePhone = API.escapeHtml(lead.phone || '');
        const safeNotes = API.escapeHtml(truncateText(lead.notes || '', 100));
        const initials = this.getInitials(lead.name);
        const timeAgo = this.formatTimeAgo(lead.created_at);
        
        return `
            <div class="lead-card" 
                 data-lead-id="${lead.id}"
                 data-lead-status="${lead.status}"
                 draggable="true">
                
                <div class="card-header">
                    <div class="lead-avatar">
                        <span class="avatar-text">${initials}</span>
                    </div>
                    <div class="lead-main-info">
                        <h4 class="lead-name">${safeName}</h4>
                        <div class="lead-company">${safeCompany}</div>
                    </div>
                    <div class="lead-meta">
                        ${lead.quality_score ? `<span class="lead-score" style="background: ${scoreColor}">${lead.quality_score}</span>` : ''}
                        <i data-lucide="${typeIcon}" class="lead-type" style="width: 16px; height: 16px;"></i>
                    </div>
                </div>
                
                <div class="card-body">
                    ${safeEmail || safePhone ? `
                        <div class="contact-info">
                            ${safeEmail ? `<div class="contact-item"><i data-lucide="mail" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>${safeEmail}</div>` : ''}
                            ${safePhone ? `<div class="contact-item"><i data-lucide="phone" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>${safePhone}</div>` : ''}
                        </div>
                    ` : ''}
                    
                    ${safeNotes ? `<div class="lead-notes">${safeNotes}</div>` : ''}
                    
                    ${lead.potential_value ? `
                        <div class="deal-value-display">
                            <i data-lucide="dollar-sign" class="value-icon" style="width: 16px; height: 16px;"></i>
                            <span class="value-amount">$${lead.potential_value.toLocaleString()}</span>
                            <button class="value-edit-btn" onclick="PipelineModule.editDealValue('${lead.id}')" title="Edit"><i data-lucide="pencil" style="width: 14px; height: 14px;"></i></button>
                        </div>
                    ` : `
                        <button class="deal-value-btn" onclick="PipelineModule.addDealValue('${lead.id}')">
                            <i data-lucide="dollar-sign" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Add value
                        </button>
                    `}
                    
                    ${lead.status === 'lost' ? (
                        lead.lost_reason ? `
                            <div class="loss-reason-display">
                                <i data-lucide="x-circle" class="loss-icon" style="width: 16px; height: 16px;"></i>
                                <span class="loss-text">${API.escapeHtml(lead.lost_reason)}</span>
                                <button class="loss-edit-btn" onclick="PipelineModule.editLossReason('${lead.id}')" title="Edit"><i data-lucide="pencil" style="width: 14px; height: 14px;"></i></button>
                            </div>
                        ` : `
                            <button class="loss-reason-btn" onclick="PipelineModule.addLossReason('${lead.id}')">
                                <i data-lucide="x-circle" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Add loss reason
                            </button>
                        `
                    ) : ''}
                </div>
                
                <div class="card-footer">
                    <div class="card-date">${timeAgo}</div>
                    <div class="card-actions">
                        <button class="action-btn" onclick="PipelineModule.editLead('${lead.id}')"><i data-lucide="pencil" style="width: 16px; height: 16px;"></i></button>
                        <button class="action-btn" onclick="PipelineModule.moveLead('${lead.id}')"><i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i></button>
                    </div>
                </div>
            </div>
        `;
    },

    // Render empty state
    renderEmpty(stage) {
        if (this.state.leads.length === 0) {
            return `
                <div class="empty-state">
                    <i data-lucide="target" class="empty-icon" style="width: 48px; height: 48px;"></i>
                    <div class="empty-title">No leads yet!</div>
                    <div class="empty-subtitle">Start building your pipeline</div>
                    <button class="empty-action-btn" onclick="loadPage('leads')">
                        <i data-lucide="plus" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Add your first lead
                    </button>
                </div>
            `;
        }

        return `
            <div class="empty-state">
                <i data-lucide="${stage.icon}" class="empty-icon" style="width: 48px; height: 48px;"></i>
                <div class="empty-title">No ${stage.name.toLowerCase()} yet</div>
                <div class="empty-subtitle">Drag leads here or add new ones</div>
            </div>
        `;
    },

    // Render analytics
    renderAnalytics(analytics) {
        return `
            <div class="analytics-section">
                <div class="analytics-header">
                    <h2 class="analytics-title"><i data-lucide="bar-chart-3" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;"></i>Key Insights</h2>
                    <p class="analytics-subtitle">Track your pipeline performance</p>
                </div>

                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="card-header-analytics">
                            <i data-lucide="trending-up" class="card-icon" style="width: 20px; height: 20px;"></i>
                            <span class="card-title">Conversion Rate</span>
                        </div>
                        <div class="card-content-analytics">
                            <div class="primary-metric">${analytics.conversionRate}%</div>
                            <div class="metric-detail">Closed vs Lost</div>
                        </div>
                    </div>

                    <div class="analytics-card">
                        <div class="card-header-analytics">
                            <i data-lucide="dollar-sign" class="card-icon" style="width: 20px; height: 20px;"></i>
                            <span class="card-title">Total Value</span>
                        </div>
                        <div class="card-content-analytics">
                            <div class="primary-metric">$${Math.round(analytics.totalValue).toLocaleString()}</div>
                            <div class="metric-detail">Pipeline Value</div>
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="card-header-analytics">
                            <span class="card-icon">❌</span>
                            <span class="card-title">Top Loss Reason</span>
                        </div>
                        <div class="card-content-analytics">
                            <div class="primary-metric" style="font-size: ${analytics.topLossReason.length > 15 ? '1.5rem' : analytics.topLossReason.length > 10 ? '1.75rem' : '2rem'}">${API.escapeHtml(analytics.topLossReason)}</div>
                            <div class="metric-detail">${analytics.topLossCount} deals</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Attach all events with SMOOTH DRAG
    attachEvents() {
        const search = document.getElementById('pipelineSearch');
        if (search) {
            let timeout;
            search.oninput = (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.state.filters.search = e.target.value;
                    this.render();
                }, 300);
            };
        }
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = (e) => this.showFilterDropdown(e, btn.dataset.filter);
        });
        
        // Smooth drag with ghost preview
        document.querySelectorAll('.lead-card').forEach(card => {
            card.ondragstart = (e) => {
                this.state.draggedLead = card.dataset.leadId;
                card.style.opacity = '0.3';
                card.style.transform = 'scale(0.95)';
                
                const ghost = card.cloneNode(true);
                ghost.style.position = 'absolute';
                ghost.style.top = '-9999px';
                ghost.style.width = card.offsetWidth + 'px';
                ghost.style.opacity = '1';
                ghost.style.transform = 'none';
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, card.offsetWidth / 2, 30);
                
                setTimeout(() => ghost.remove(), 0);
            };

            card.ondragend = (e) => {
                card.style.opacity = '';
                card.style.transform = '';
                
                if (e.dataTransfer.dropEffect === 'none') {
                    this.render();
                }
                
                this.state.draggedLead = null;
            };
        });

        document.querySelectorAll('.stage-content').forEach(stage => {
            stage.ondragover = (e) => {
                e.preventDefault();
                stage.classList.add('drag-over');
            };
            
            stage.ondragleave = (e) => {
                stage.classList.remove('drag-over');
            };
            
            stage.ondrop = (e) => {
                e.preventDefault();
                stage.classList.remove('drag-over');
                const targetStage = stage.dataset.stageContent;
                if (this.state.draggedLead && targetStage) {
                    this.updateLeadStatus(this.state.draggedLead, targetStage);
                }
            };
        });
    },

    // Show filter dropdown
    showFilterDropdown(event, filterType) {
        this.hideAllDropdowns();
        
        const filterOptions = {
            type: [
                { value: '', label: 'All Temperatures', clear: true },
                { value: '', label: '──────────', divider: true },
                { value: 'cold', label: 'Cold Leads', icon: 'snowflake' },
                { value: 'warm', label: 'Warm Leads', icon: 'flame' }
            ],
            score: [
                { value: '', label: 'All Scores', clear: true },
                { value: '', label: '──────────', divider: true },
                { value: 'high', label: 'High (8-10)', icon: 'star' },
                { value: 'medium', label: 'Medium (5-7)', icon: 'zap' },
                { value: 'low', label: 'Low (1-4)', icon: 'trending-up' }
            ],
            source: [
                { value: '', label: 'All Sources', clear: true },
                { value: '', label: '──────────', divider: true },
                { value: 'Website', label: 'Website', icon: 'globe' },
                { value: 'LinkedIn', label: 'LinkedIn', icon: 'linkedin' },
                { value: 'Facebook', label: 'Facebook', icon: 'facebook' },
                { value: 'Instagram', label: 'Instagram', icon: 'instagram' },
                { value: 'Twitter', label: 'Twitter', icon: 'twitter' },
                { value: 'Referral', label: 'Referral', icon: 'users' },
                { value: 'Email', label: 'Email', icon: 'mail' },
                { value: 'Phone', label: 'Phone', icon: 'phone' },
                { value: 'Event', label: 'Event', icon: 'calendar' },
                { value: 'Advertisement', label: 'Advertisement', icon: 'megaphone' },
                { value: 'Direct', label: 'Direct', icon: 'target' },
                { value: 'Google', label: 'Google', icon: 'search' },
                { value: 'Organic', label: 'Organic', icon: 'leaf' },
                { value: 'Paid Ads', label: 'Paid Ads', icon: 'dollar-sign' },
                { value: 'Cold Call', label: 'Cold Call', icon: 'phone-call' },
                { value: 'Trade Show', label: 'Trade Show', icon: 'building' },
                { value: 'Webinar', label: 'Webinar', icon: 'monitor' },
                { value: 'Content', label: 'Content', icon: 'file-text' },
                { value: 'Partnership', label: 'Partnership', icon: 'handshake' },
                { value: 'custom', label: 'Custom Source', icon: 'sparkles' },
                { value: null, label: 'Unknown', icon: 'help-circle' }
            ]
        };
        
        const options = filterOptions[filterType] || [];
        const column = filterType === 'type' ? 'types' : 
                      filterType === 'score' ? 'scores' : 'sources';
        
        const dropdown = document.createElement('div');
        dropdown.className = 'filter-dropdown show';
        dropdown.innerHTML = `
            <div class="filter-options">
                ${options.map(opt => {
                    if (opt.divider) return '<div class="filter-divider"></div>';
                    if (opt.clear) return `<div class="filter-option clear-option" onclick="PipelineModule.clearFilter('${column}')">${opt.label}</div>`;

                    const isChecked = this.state.filters[column].includes(opt.value);
                    const iconHtml = opt.icon ? `<i data-lucide="${opt.icon}" style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle;"></i>` : '';
                    return `
                        <div class="filter-option" onclick="PipelineModule.toggleFilter('${column}', ${opt.value === null ? 'null' : `'${opt.value}'`}, event)">
                            <div class="checkbox ${isChecked ? 'checked' : ''}">${isChecked ? '✓' : ''}</div>
                            <span class="option-text">${iconHtml}${opt.label}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        const rect = event.target.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.zIndex = '10000';

        document.body.appendChild(dropdown);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        setTimeout(() => {
            const closeDropdown = (e) => {
                if (!e.target.closest('.filter-dropdown') && !e.target.closest('.filter-btn')) {
                    this.hideAllDropdowns();
                    document.removeEventListener('click', closeDropdown);
                }
            };
            document.addEventListener('click', closeDropdown);
        }, 10);
    },

    toggleFilter(column, value, event) {
        if (event) event.stopPropagation();
        if (value === 'null') value = null;
        
        const index = this.state.filters[column].indexOf(value);
        if (index > -1) {
            this.state.filters[column].splice(index, 1);
        } else {
            this.state.filters[column].push(value);
        }
        
        const option = event.target.closest('.filter-option');
        const checkbox = option.querySelector('.checkbox');
        const isChecked = this.state.filters[column].includes(value);
        
        if (isChecked) {
            checkbox.classList.add('checked');
            checkbox.textContent = '✓';
        } else {
            checkbox.classList.remove('checked');
            checkbox.textContent = '';
        }
        
        this.render();
    },

    clearFilter(column) {
        this.state.filters[column] = [];
        this.hideAllDropdowns();
        this.render();
    },

    clearAllFilters() {
        this.state.filters = { search: '', types: [], sources: [], scores: [] };
        const search = document.getElementById('pipelineSearch');
        if (search) search.value = '';
        this.render();
    },

    hideAllDropdowns() {
        document.querySelectorAll('.filter-dropdown').forEach(d => d.remove());
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    },

    hasActiveFilters() {
        return this.state.filters.search !== '' ||
               this.state.filters.types.length > 0 ||
               this.state.filters.sources.length > 0 ||
               this.state.filters.scores.length > 0;
    },

    async updateLeadStatus(leadId, newStatus) {
        try {
            const lead = this.state.leads.find(l => l.id.toString() === leadId.toString());
            if (!lead || lead.status === newStatus) return;
            
            lead.status = newStatus;
            await API.updateLead(leadId, { status: newStatus });
            this.render();
            
        } catch (error) {
            console.error('Failed to update lead status:', error);
            this.notify('Failed to update lead status', 'error');
        }
    },

    pipeline_cleanup() {
        document.querySelectorAll('.filter-dropdown').forEach(d => d.remove());
        document.getElementById('pipelineEditModal')?.remove();
        document.getElementById('pipelineMoveModal')?.remove();
        document.getElementById('dealValueModal')?.remove();
        document.getElementById('lossReasonModal')?.remove();
        document.getElementById('pipelineDeleteModal')?.remove();
    },

    // Edit lead modal
    editLead(leadId) {
        const lead = this.state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        const modal = document.createElement('div');
        modal.className = 'pipeline-modal show';
        modal.id = 'pipelineEditModal';
        modal.innerHTML = `
            <div class="modal-backdrop" id="pipelineEditBackdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Edit Lead</h3>
                    <button class="modal-close" onclick="document.getElementById('pipelineEditModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="editLeadForm">
                        <div class="form-section">
                            <label class="form-label">Lead Temperature</label>
                            <div class="temperature-toggle">
                                <button type="button" class="temp-btn ${lead.type === 'cold' ? 'active' : ''}" data-temp="cold"><i data-lucide="snowflake" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Cold</button>
                                <button type="button" class="temp-btn ${lead.type === 'warm' ? 'active' : ''}" data-temp="warm"><i data-lucide="flame" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Warm</button>
                            </div>
                            <input type="hidden" id="editType" value="${lead.type || 'cold'}">
                        </div>

                        <div class="form-section">
                            <label class="form-label">Quality Score</label>
                            <div class="quality-slider-container">
                                <div class="score-track">
                                    <input type="range" id="editScore" class="quality-slider" min="1" max="10" value="${lead.quality_score || 5}">
                                </div>
                                <div class="score-display">
                                    <div class="score-number" id="scoreDisplay">${lead.quality_score || 5}</div>
                                    <div class="score-label">out of 10</div>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <label class="form-label">Notes</label>
                            <textarea id="editNotes" class="notes-textarea" rows="6" maxlength="500" placeholder="Add context, insights, or important details...">${API.escapeHtml(lead.notes || '')}</textarea>
                            <div class="input-feedback" id="notesFeedback"></div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-danger" onclick="PipelineModule.deleteLead('${lead.id}')"><i data-lucide="trash-2" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Delete</button>
                            <div class="form-actions-right">
                                <button type="button" class="btn-secondary" onclick="document.getElementById('pipelineEditModal').remove()">Cancel</button>
                                <button type="submit" class="btn-primary">
                                    <span class="btn-text">Save Changes</span>
                                    <span class="btn-loading" style="display: none;">⏳</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Proper mousedown/mouseup pattern for backdrop
        const backdrop = document.getElementById('pipelineEditBackdrop');
        let mouseDownTarget = null;

        backdrop.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });

        backdrop.addEventListener('mouseup', (e) => {
            if (mouseDownTarget === backdrop && e.target === backdrop) {
                document.getElementById('pipelineEditModal').remove();
            }
            mouseDownTarget = null;
        });
        
        const form = document.getElementById('editLeadForm');
        document.querySelectorAll('.temp-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.temp-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('editType').value = btn.dataset.temp;
            };
        });
        
        const slider = document.getElementById('editScore');
        const scoreDisplay = document.getElementById('scoreDisplay');
        slider.oninput = (e) => {
            scoreDisplay.textContent = e.target.value;
        };
        
        const notes = document.getElementById('editNotes');
        const feedback = document.getElementById('notesFeedback');
        notes.oninput = (e) => {
            const len = e.target.value.length;
            feedback.textContent = `${len}/500`;
            feedback.className = `input-feedback ${len > 450 ? 'warning' : 'normal'}`;
        };
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('.btn-primary');
            const btnText = btn.querySelector('.btn-text');
            const btnLoading = btn.querySelector('.btn-loading');
            
            try {
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline-block';
                btn.disabled = true;
                
                await API.updateLead(lead.id, {
                    type: document.getElementById('editType').value,
                    quality_score: parseInt(document.getElementById('editScore').value),
                    notes: document.getElementById('editNotes').value.trim() || null
                });
                
                await this.loadData();
                this.render();
                modal.remove();
                this.notify('Lead updated successfully', 'success');
                
            } catch (error) {
                console.error('Failed to update lead:', error);
                this.notify('Failed to update lead', 'error');
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                btn.disabled = false;
            }
        };
    },

    // Move lead modal (no text inputs, no fix needed)
    moveLead(leadId) {
        const lead = this.state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        const modal = document.createElement('div');
        modal.className = 'pipeline-modal show';
        modal.id = 'pipelineMoveModal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="document.getElementById('pipelineMoveModal').remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Move Lead</h3>
                    <button class="modal-close" onclick="document.getElementById('pipelineMoveModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="move-options">
                        ${this.stages.map(stage => `
                            <button class="move-option ${stage.id === lead.status ? 'current' : ''}" 
                                    onclick="PipelineModule.moveToStage('${lead.id}', '${stage.id}')"
                                    ${stage.id === lead.status ? 'disabled' : ''}>
                                <div class="option-icon" style="background: ${stage.color}">${stage.icon}</div>
                                <div class="option-content">
                                    <div class="option-name">${stage.name}</div>
                                    <div class="option-desc">${stage.desc}</div>
                                </div>
                                ${stage.id === lead.status ? '<span class="current-badge">Current</span>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    async moveToStage(leadId, newStage) {
        document.getElementById('pipelineMoveModal')?.remove();
        await this.updateLeadStatus(leadId, newStage);
    },

    // Add deal value modal
    addDealValue(leadId) {
        const lead = this.state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        const modal = document.createElement('div');
        modal.className = 'pipeline-modal show';
        modal.id = 'dealValueModal';
        modal.innerHTML = `
            <div class="modal-backdrop" id="dealValueBackdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Add Deal Value</h3>
                    <button class="modal-close" onclick="document.getElementById('dealValueModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="dealValueForm">
                        <div class="form-section">
                            <label class="form-label">Deal Value</label>
                            <div class="value-input-group">
                                <span class="value-prefix">$</span>
                                <input type="text" id="dealValueInput" class="value-input" placeholder="Enter amount" inputmode="decimal" autocomplete="off" required>
                            </div>
                            <div class="input-feedback" id="dealValueFeedback"></div>
                        </div>
                        
                        <div class="quick-values">
                            ${[500, 1000, 2500, 5000, 10000, 25000].map(v => 
                                `<button type="button" class="quick-value-btn" onclick="document.getElementById('dealValueInput').value = '${v}'; document.getElementById('dealValueInput').dispatchEvent(new Event('input'))">$${v.toLocaleString()}</button>`
                            ).join('')}
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="document.getElementById('dealValueModal').remove()">Cancel</button>
                            <button type="submit" class="btn-primary">
                                <span class="btn-text">Add Value</span>
                                <span class="btn-loading" style="display: none;">⏳</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Proper mousedown/mouseup pattern for backdrop
        const backdrop = document.getElementById('dealValueBackdrop');
        let mouseDownTarget = null;

        backdrop.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });

        backdrop.addEventListener('mouseup', (e) => {
            if (mouseDownTarget === backdrop && e.target === backdrop) {
                document.getElementById('dealValueModal').remove();
            }
            mouseDownTarget = null;
        });

        const input = document.getElementById('dealValueInput');
        const feedback = document.getElementById('dealValueFeedback');
        const btn = document.querySelector('#dealValueForm .btn-primary');

        input.oninput = (e) => {
            let raw = e.target.value.replace(/[^0-9.]/g, '');
            
            const decimalCount = (raw.match(/\./g) || []).length;
            if (decimalCount > 1) {
                const firstDot = raw.indexOf('.');
                raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
            }
            
            if (!raw || raw === '.') {
                feedback.textContent = '';
                btn.disabled = true;
                e.target.value = raw;
                return;
            }
            
            let [whole, decimal] = raw.split('.');
            
            if (whole && whole.length > 8) {
                whole = whole.slice(0, 8);
                raw = whole + (decimal !== undefined ? '.' + decimal : '');
            }
            
            if (decimal !== undefined && decimal.length > 2) {
                decimal = decimal.slice(0, 2);
                raw = whole + '.' + decimal;
            }
            
            let displayed = '';
            if (whole) {
                displayed = parseInt(whole, 10).toLocaleString('en-US');
            }
            if (decimal !== undefined) {
                displayed += '.' + decimal;
            }
            
            e.target.value = displayed;
            
            const numValue = parseFloat(whole + (decimal !== undefined ? '.' + decimal : ''));
            
            if (isNaN(numValue) || numValue < 0.01 || numValue > 99999999.99) {
                feedback.textContent = 'Value must be between $0.01 and $99,999,999.99';
                feedback.className = 'input-feedback feedback-error';
                btn.disabled = true;
            } else {
                feedback.textContent = `Deal value: $${displayed}`;
                feedback.className = 'input-feedback feedback-normal';
                btn.disabled = false;
            }
        };
        
        document.getElementById('dealValueForm').onsubmit = async (e) => {
            e.preventDefault();
            const raw = input.value.replace(/[^0-9.]/g, '');
            const value = parseFloat(raw);
            
            if (isNaN(value) || value < 0.01 || value > 99999999.99) return;
            
            const btnText = btn.querySelector('.btn-text');
            const btnLoading = btn.querySelector('.btn-loading');
            
            try {
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline-block';
                btn.disabled = true;
                
                await API.updateLead(leadId, { potential_value: value });
                lead.potential_value = value;
                
                modal.remove();
                this.render();
                this.notify(`Deal value added: $${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'success');
                
            } catch (error) {
                console.error('Failed to add deal value:', error);
                this.notify('Failed to add deal value', 'error');
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                btn.disabled = false;
            }
        };
        
        setTimeout(() => input.focus(), 100);
    },

    editDealValue(leadId) {
        const lead = this.state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        this.addDealValue(leadId);
        setTimeout(() => {
            const input = document.getElementById('dealValueInput');
            if (input && lead.potential_value) {
                const formatted = lead.potential_value.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
                input.value = formatted;
                input.dispatchEvent(new Event('input'));
                input.select();
            }
        }, 100);
    },

    // Add loss reason modal
    addLossReason(leadId) {
        const lead = this.state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        const modal = document.createElement('div');
        modal.className = 'pipeline-modal show';
        modal.id = 'lossReasonModal';
        modal.innerHTML = `
            <div class="modal-backdrop" id="lossReasonBackdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Add Loss Reason</h3>
                    <button class="modal-close" onclick="document.getElementById('lossReasonModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="lossReasonForm">
                        <div class="form-section">
                            <label class="form-label">Why was this lead lost?</label>
                            <select id="lossReasonSelect" class="reason-select" required>
                                <option value="">Select a reason...</option>
                                <option value="Price too high">Price too high</option>
                                <option value="Went with competitor">Went with competitor</option>
                                <option value="Budget constraints">Budget constraints</option>
                                <option value="Timing not right">Timing not right</option>
                                <option value="No longer interested">No longer interested</option>
                                <option value="Poor communication">Poor communication</option>
                                <option value="Product not a fit">Product not a fit</option>
                                <option value="Decision maker changed">Decision maker changed</option>
                                <option value="other">Other (specify below)</option>
                            </select>
                        </div>
                        
                        <div class="form-section" id="customReasonSection" style="display: none;">
                            <label class="form-label">Custom Reason</label>
                            <input type="text" 
                                id="customReasonInput" 
                                class="custom-reason-input" 
                                placeholder="Enter custom reason..." 
                                maxlength="20">
                            <div class="input-feedback" id="customReasonFeedback"></div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="document.getElementById('lossReasonModal').remove()">Cancel</button>
                            <button type="submit" class="btn-primary" disabled>
                                <span class="btn-text">Add Reason</span>
                                <span class="btn-loading" style="display: none;">⏳</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Proper mousedown/mouseup pattern for backdrop
        const backdrop = document.getElementById('lossReasonBackdrop');
        let mouseDownTarget = null;

        backdrop.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });

        backdrop.addEventListener('mouseup', (e) => {
            if (mouseDownTarget === backdrop && e.target === backdrop) {
                document.getElementById('lossReasonModal').remove();
            }
            mouseDownTarget = null;
        });
        
        const select = document.getElementById('lossReasonSelect');
        const customSection = document.getElementById('customReasonSection');
        const customInput = document.getElementById('customReasonInput');
        const btn = document.querySelector('#lossReasonForm .btn-primary');
        
        select.onchange = (e) => {
            if (e.target.value === 'other') {
                customSection.style.display = 'block';
                btn.disabled = !customInput.value.trim();
            } else {
                customSection.style.display = 'none';
                btn.disabled = !e.target.value;
            }
        };
        
        const feedback = document.getElementById('customReasonFeedback');

        customInput.oninput = (e) => {
            const value = e.target.value;
            const length = value.length;
            const limit = 20;
            
            btn.disabled = !value.trim();
            
            if (length === 0) {
                feedback.textContent = '';
                feedback.className = 'input-feedback';
                customInput.classList.remove('input-warning', 'input-error');
            } else if (length < 16) {
                feedback.textContent = `${length}/${limit}`;
                feedback.className = 'input-feedback feedback-normal';
                customInput.classList.remove('input-warning', 'input-error');
            } else if (length < 20) {
                const remaining = limit - length;
                feedback.textContent = `${remaining} characters remaining`;
                feedback.className = 'input-feedback feedback-warning';
                customInput.classList.add('input-warning');
                customInput.classList.remove('input-error');
            } else {
                feedback.textContent = `Maximum ${limit} characters reached`;
                feedback.className = 'input-feedback feedback-error';
                customInput.classList.remove('input-warning');
                customInput.classList.add('input-error');
            }
        };
        
        document.getElementById('lossReasonForm').onsubmit = async (e) => {
            e.preventDefault();
            const reason = select.value === 'other' ? customInput.value.trim() : select.value;
            if (!reason) return;
            
            const btnText = btn.querySelector('.btn-text');
            const btnLoading = btn.querySelector('.btn-loading');
            
            try {
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline-block';
                btn.disabled = true;
                
                await API.updateLead(leadId, { lost_reason: reason });
                lead.lost_reason = reason;
                
                modal.remove();
                this.render();
                this.notify(`Loss reason added: ${reason}`, 'success');
                
            } catch (error) {
                console.error('Failed to add loss reason:', error);
                this.notify('Failed to add loss reason', 'error');
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                btn.disabled = false;
            }
        };
    },

    editLossReason(leadId) {
        const lead = this.state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        this.addLossReason(leadId);
        setTimeout(() => {
            const select = document.getElementById('lossReasonSelect');
            if (select && lead.lost_reason) {
                const predefined = ['Price too high', 'Went with competitor', 'Budget constraints', 'Timing not right', 'No longer interested', 'Poor communication', 'Product not a fit', 'Decision maker changed'];
                
                if (predefined.includes(lead.lost_reason)) {
                    select.value = lead.lost_reason;
                } else {
                    select.value = 'other';
                    document.getElementById('customReasonSection').style.display = 'block';
                    document.getElementById('customReasonInput').value = lead.lost_reason;
                }
                select.dispatchEvent(new Event('change'));
            }
        }, 100);
    },

    // Delete lead modal
    async deleteLead(leadId) {
        const lead = this.state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;
        
        const modal = document.createElement('div');
        modal.className = 'pipeline-modal show';
        modal.id = 'pipelineDeleteModal';
        modal.innerHTML = `
            <div class="modal-backdrop" id="pipelineDeleteBackdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Delete Lead</h3>
                    <button class="modal-close" id="deleteModalClose">×</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 2rem 1rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);">
                            Are you sure you want to delete this lead?
                        </h3>
                        <p style="margin-bottom: 1.5rem; color: var(--text-secondary); font-size: 1rem;">
                            <strong>${API.escapeHtml(lead.name)}</strong>
                            ${lead.company ? ` from ${API.escapeHtml(lead.company)}` : ''}
                        </p>
                        <p style="margin-bottom: 2rem; color: var(--danger); font-weight: 600;">
                            This action cannot be undone.
                        </p>
                        
                        <div class="form-actions" style="border-top: none; padding-top: 0;">
                            <button type="button" class="btn-secondary" id="cancelDeleteBtn">
                                Cancel
                            </button>
                            <button type="button" class="btn-danger" id="confirmDeleteBtn">
                                <span class="btn-text">Delete Lead</span>
                                <span class="btn-loading" style="display: none;">⏳</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Proper mousedown/mouseup pattern for backdrop
        const backdrop = document.getElementById('pipelineDeleteBackdrop');
        let mouseDownTarget = null;

        backdrop.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });

        backdrop.addEventListener('mouseup', (e) => {
            if (mouseDownTarget === backdrop && e.target === backdrop) {
                modal.remove();
            }
            mouseDownTarget = null;
        });
        
        const closeModal = () => modal.remove();
        
        document.getElementById('deleteModalClose').onclick = closeModal;
        document.getElementById('cancelDeleteBtn').onclick = closeModal;
        
        document.getElementById('confirmDeleteBtn').onclick = () => {
            this.confirmDeleteLead(leadId);
        };
    },

    async confirmDeleteLead(leadId) {
        const modal = document.getElementById('pipelineDeleteModal');
        const btn = document.getElementById('confirmDeleteBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        
        try {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-block';
            btn.disabled = true;
            
            await API.deleteLead(leadId);
            this.state.leads = this.state.leads.filter(l => l.id.toString() !== leadId.toString());
            
            document.getElementById('pipelineEditModal')?.remove();
            modal.remove();
            this.render();
            this.notify('Lead deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete lead:', error);
            this.notify('Failed to delete lead', 'error');
            btnText.style.display = 'inline-block';
            btnLoading.style.display = 'none';
            btn.disabled = false;
        }
    },

    getInitials(name) {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    },

    formatTimeAgo(date) {
        if (!date) return 'Unknown';
        const dateObj = new Date(date);
        if (isNaN(dateObj)) return 'Invalid';
        
        const diff = Date.now() - dateObj;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    notify(message, type = 'info') {
        if (window.SteadyUtils?.showToast) {
            window.SteadyUtils.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    },

    showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.style.opacity = '0';
            container.innerHTML = `
                <div style="min-height: 400px;"></div>
            `;
        }
    },

    showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem;">
                    <div style="margin-bottom: 2rem; opacity: 0.6;"><i data-lucide="alert-triangle" style="width: 64px; height: 64px; color: var(--warning);"></i></div>
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem;">Pipeline Error</h2>
                    <p style="margin-bottom: 2rem; font-size: 1.125rem; color: var(--text-secondary);">${API.escapeHtml(message)}</p>
                    <button onclick="PipelineModule.pipeline_init()" style="padding: 1rem 2rem; background: var(--primary); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: 1rem;"><i data-lucide="refresh-cw" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Try Again</button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    renderStyles() {
        return `
            <style>
                .pipeline-container { max-width: 1800px; margin: 0 auto; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                
                .stage-content.drag-over {
                    background: rgba(102, 126, 234, 0.05);
                    border: 2px dashed var(--primary);
                    border-radius: var(--radius-lg);
                }
                
                .pipeline-header { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-lg); display: grid; grid-template-columns: 1fr auto; gap: 3rem; align-items: center; }
                .header-brand { display: flex; flex-direction: column; gap: 0.5rem; }
                .pipeline-title { display: flex; align-items: center; gap: 1rem; font-size: 2rem; font-weight: 800; color: var(--text-primary); margin: 0; }
                .title-icon { font-size: 1.75rem; }
                .title-text { background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .pipeline-subtitle { color: var(--text-secondary); font-size: 1.125rem; margin: 0; }
                
                .monthly-progress { background: var(--background); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; min-width: 320px; }
                .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .progress-title { font-weight: 600; color: var(--text-primary); }.progress-stats { display: flex; align-items: center; gap: 0.25rem; font-weight: 700; }
                .current-count { color: var(--primary); font-size: 1.125rem; }
                .separator { color: var(--text-tertiary); }
                .limit-count { color: var(--text-secondary); }
                .leads-text { color: var(--text-tertiary); font-size: 0.8rem; font-weight: 500; }
                .progress-bar-container { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
                .progress-bar-track { flex: 1; height: 8px; background: var(--surface-hover); border-radius: 4px; overflow: hidden; }
                .progress-bar-fill { height: 100%; background: var(--success); border-radius: 4px; transition: width 0.8s ease; }
                .progress-bar-fill.near-limit { background: var(--warning); }
                .progress-bar-fill.at-limit { background: var(--danger); }
                .progress-percentage { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); min-width: 35px; text-align: right; }
                .progress-warning { padding: 0.5rem 0.75rem; border-radius: var(--radius); font-size: 0.8rem; font-weight: 600; }
                .progress-warning.near-limit { background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.2); }
                .progress-warning.at-limit { background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2); }
                
                .pipeline-filters { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem; display: flex; gap: 1.5rem; align-items: center; }
                .search-group { flex: 1; }
                .search-wrapper { position: relative; display: flex; align-items: center; }
                .search-input { width: 100%; padding: 0.875rem 3rem 0.875rem 1.25rem; border: 2px solid var(--border); border-radius: var(--radius); font-size: 1rem; background: var(--background); color: var(--text-primary); transition: all 0.2s ease; }
                .search-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
                .search-icon { position: absolute; right: 1rem; color: var(--text-tertiary); pointer-events: none; }
                .filter-controls { display: flex; gap: 1rem; }
                .filter-btn { padding: 0.875rem 1.25rem; background: var(--background); border: 2px solid var(--border); border-radius: var(--radius); color: var(--text-primary); cursor: pointer; transition: all 0.2s ease; font-weight: 500; display: flex; align-items: center; gap: 0.5rem; }
                .filter-btn:hover { border-color: var(--primary); transform: translateY(-1px); }
                .filter-btn.active { border-color: var(--primary); background: rgba(102, 126, 234, 0.1); color: var(--primary); }
                .filter-arrow { font-size: 0.7rem; transition: transform 0.2s ease; }
                
                .filter-dropdown { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); z-index: 10000; max-height: 300px; overflow-y: auto; }
                .filter-options { padding: 0.5rem; }
                .filter-option { padding: 0.75rem 1rem; cursor: pointer; transition: all 0.2s ease; border-radius: var(--radius); display: flex; align-items: center; gap: 0.75rem; }
                .filter-option:hover { background: var(--surface-hover); }
                .filter-option.clear-option { color: var(--primary); font-weight: 600; }
                .filter-divider { height: 1px; background: var(--border); margin: 0.5rem 0; }
                .checkbox { width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; flex-shrink: 0; }
                .checkbox.checked { background: var(--primary); border-color: var(--primary); color: white; }
                .option-text { flex: 1; }
                
                .active-filters-panel { background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: var(--radius-lg); padding: 1rem 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
                .filters-info { display: flex; flex-direction: column; gap: 0.25rem; }
                .filter-count { font-weight: 700; color: var(--primary); }
                .filter-details { font-size: 0.85rem; color: var(--text-secondary); }
                .clear-filters-btn { background: var(--primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
                .clear-filters-btn:hover { background: var(--primary-dark); transform: translateY(-1px); }
                
                .pipeline-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-lg); margin-bottom: 2rem; }
                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
                .section-title-group { display: flex; align-items: center; gap: 1rem; }
                .section-title { font-size: 1.375rem; font-weight: 700; color: var(--text-primary); margin: 0; }
                .section-badge { background: rgba(102, 126, 234, 0.1); color: var(--primary); padding: 0.375rem 0.875rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; }
                .section-value { font-size: 1.25rem; font-weight: 800; color: var(--success); }
                
                .stages-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
                .stage-column { background: var(--background); border: 1px solid var(--border); border-radius: var(--radius-lg); min-height: 500px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
                .stage-column::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--stage-color); }
                .stage-header { padding: 1.5rem; background: var(--surface-hover); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; }
                .stage-title-group { display: flex; align-items: center; gap: 1rem; flex: 1; }
                .stage-icon { font-size: 2rem; }
                .stage-info { flex: 1; }
                .stage-name { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem 0; }
                .stage-meta { display: flex; flex-direction: column; gap: 0.25rem; }
                .stage-value { font-size: 0.85rem; color: var(--success); font-weight: 700; }
                .stage-count { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
                .stage-content { flex: 1; padding: 1rem; overflow-y: auto; max-height: 600px; transition: all 0.3s ease; }
                
                .lead-card { background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; cursor: grab; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 1rem; }
                .lead-card:hover { border-color: var(--primary); box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15); transform: translateY(-3px); }
                .lead-card:active { cursor: grabbing; }
                .card-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
                .lead-avatar { width: 2.5rem; height: 2.5rem; border-radius: var(--radius); background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .avatar-text { color: white; font-weight: 700; font-size: 0.9rem; }
                .lead-main-info { flex: 1; min-width: 0; }
                .lead-name { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.25rem 0; }
                .lead-company { font-size: 0.85rem; color: var(--text-secondary); }
                .lead-meta { display: flex; align-items: center; gap: 0.5rem; }
                .lead-score { color: white; padding: 0.25rem 0.5rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; }
                .lead-type { font-size: 1.125rem; }
                .card-body { margin-bottom: 1rem; }
                .contact-info { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
                .contact-item { font-size: 0.8rem; color: var(--text-secondary); }
                .lead-notes { font-size: 0.8rem; color: var(--text-tertiary); font-style: italic; line-height: 1.4; margin-bottom: 0.75rem; padding: 0.75rem; background: var(--surface-hover); border-radius: var(--radius); border-left: 3px solid var(--border); white-space: pre-wrap; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; max-height: 5.5rem; overflow: hidden; }
                
                .deal-value-display { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(16, 185, 129, 0.1); border-radius: var(--radius); border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 0.75rem; }
                .value-icon { font-size: 1rem; }
                .value-amount { font-weight: 700; color: var(--success); flex: 1; }
                .value-edit-btn { background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: var(--radius); transition: all 0.2s ease; font-size: 0.9rem; }
                .value-edit-btn:hover { background: rgba(16, 185, 129, 0.2); }
                
                .deal-value-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: var(--radius); color: var(--primary); cursor: pointer; font-weight: 600; font-size: 0.8rem; width: 100%; margin-bottom: 0.75rem; transition: all 0.2s ease; }
                .deal-value-btn:hover { background: rgba(102, 126, 234, 0.2); }
                
                .loss-reason-display { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius); border: 1px solid rgba(239, 68, 68, 0.2); margin-bottom: 0.75rem; }
                .loss-icon { font-size: 0.9rem; }
                .loss-text { font-size: 0.8rem; color: var(--danger); font-weight: 600; flex: 1; }
                .loss-edit-btn { background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: var(--radius); transition: all 0.2s ease; font-size: 0.9rem; }
                .loss-edit-btn:hover { background: rgba(239, 68, 68, 0.2); }
                
                .loss-reason-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius); color: var(--danger); cursor: pointer; font-weight: 600; font-size: 0.8rem; width: 100%; margin-bottom: 0.75rem; transition: all 0.2s ease; }
                .loss-reason-btn:hover { background: rgba(239, 68, 68, 0.2); }
                
                .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 0.875rem; border-top: 1px solid var(--border); }
                .card-date { color: var(--text-tertiary); font-size: 0.75rem; font-weight: 500; }
                .card-actions { display: flex; gap: 0.5rem; }
                .action-btn { padding: 0.5rem 0.75rem; background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: var(--radius); color: var(--primary); cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s ease; }
                .action-btn:hover { background: rgba(102, 126, 234, 0.2); transform: translateY(-1px); }
                
                .empty-state { text-align: center; padding: 3rem 1.5rem; color: var(--text-tertiary); }
                .empty-icon { font-size: 3rem; opacity: 0.6; display: block; margin-bottom: 1rem; }
                .empty-title { font-size: 1.125rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }
                .empty-subtitle { font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
                .empty-action-btn { background: var(--primary); color: white; border: none; padding: 0.875rem 1.75rem; border-radius: var(--radius); font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 0.5rem; }
                .empty-action-btn:hover { background: var(--primary-dark); transform: translateY(-1px); }
                
                .analytics-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; box-shadow: var(--shadow-lg); }
                .analytics-header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
                .analytics-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.25rem 0; }
                .analytics-subtitle { color: var(--text-secondary); font-size: 1rem; margin: 0; }
                .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
                .analytics-card { background: var(--background); border-radius: var(--radius-lg); padding: 1.5rem; transition: all 0.2s ease; border: 1px solid var(--border); }
                .analytics-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-xl); }
                .card-header-analytics { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
                .card-icon { font-size: 1.5rem; }
                .card-title { font-size: 0.9rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
                .card-content-analytics { text-align: left; }
                .primary-metric { font-size: 2rem; font-weight: 800; color: var(--text-primary); line-height: 1; margin-bottom: 0.5rem; }
                .metric-detail { font-size: 0.8rem; color: var(--text-tertiary); font-weight: 500; }
                
                .pipeline-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
                .pipeline-modal.show { opacity: 1; visibility: visible; }
                .modal-backdrop { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px); }
                .modal-content { background: var(--surface); border-radius: 24px; box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3); width: 100%; max-width: 600px; max-height: 90vh; overflow: hidden; position: relative; z-index: 1; border: 1px solid var(--border); }
                .modal-header { padding: 2rem 2rem 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--surface-hover); }
                .modal-title { font-size: 1.375rem; font-weight: 800; color: var(--text-primary); margin: 0; }
                .modal-close { background: none; border: none; width: 2.5rem; height: 2.5rem; border-radius: var(--radius); cursor: pointer; font-size: 1.5rem; color: var(--text-secondary); transition: all 0.2s ease; }
                .modal-close:hover { background: var(--danger); color: white; }
                .modal-body { padding: 2rem; overflow-y: auto; max-height: 60vh; }
                
                .form-section { background: var(--surface-hover); border-radius: var(--radius-lg); padding: 1.5rem; border: 1px solid var(--border); margin-bottom: 1.5rem; }
                .form-label { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; display: block; }
                
                .temperature-toggle { display: flex; gap: 1rem; }
                .temp-btn { flex: 1; padding: 1rem 1.5rem; border: 2px solid var(--border); border-radius: var(--radius); background: var(--background); color: var(--text-secondary); cursor: pointer; transition: all 0.3s ease; font-weight: 600; }
                .temp-btn:hover { border-color: var(--primary); }
                .temp-btn.active { border-color: var(--primary); background: var(--primary); color: white; }
                
                .quality-slider-container { display: flex; align-items: center; gap: 2rem; }
                .score-track { flex: 1; }
                .quality-slider { width: 100%; height: 8px; border-radius: 4px; background: linear-gradient(to right, var(--danger) 0%, var(--warning) 40%, var(--success) 70%, var(--primary) 100%); outline: none; cursor: pointer; }
                .quality-slider::-webkit-slider-thumb { appearance: none; width: 24px; height: 24px; border-radius: 50%; background: var(--primary); cursor: pointer; border: 3px solid white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); transition: all 0.2s ease; }
                .quality-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
                .score-display { text-align: center; min-width: 80px; }
                .score-number { font-size: 2.5rem; font-weight: 800; color: var(--primary); line-height: 1; margin-bottom: 0.25rem; }
                .score-label { font-size: 0.8rem; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; }
                
                .notes-textarea { width: 100%; padding: 1.25rem; border: 2px solid var(--border); border-radius: var(--radius); font-size: 1rem; background: var(--background); color: var(--text-primary); transition: all 0.3s ease; font-family: inherit; line-height: 1.6; resize: vertical; min-height: 140px; }
                .notes-textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
                .input-feedback { font-size: 0.8rem; margin-top: 0.5rem; font-weight: 500; }
                .input-feedback.normal { color: var(--text-tertiary); }
                .input-feedback.warning { color: var(--warning); }
                .input-feedback.error, .feedback-error { color: var(--danger); }
                .feedback-normal { color: var(--text-secondary); font-weight: 500; }
                .feedback-warning { color: var(--warning); font-weight: 600; }
                
                .form-actions { display: flex; justify-content: space-between; align-items: center; padding-top: 1.5rem; border-top: 1px solid var(--border); }
                .form-actions-right { display: flex; gap: 1rem; }
                .btn-primary, .btn-secondary, .btn-danger { padding: 1rem 2rem; border-radius: var(--radius); font-weight: 600; cursor: pointer; transition: all 0.3s ease; border: none; display: flex; align-items: center; gap: 0.5rem; }
                .btn-primary { background: var(--primary); color: white; }
                .btn-primary:hover:not(:disabled) { background: var(--primary-dark); transform: translateY(-2px); }
                .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
                .btn-secondary { background: var(--surface-hover); color: var(--text-primary); border: 2px solid var(--border); }
                .btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
                .btn-danger { background: var(--danger); color: white; }
                .btn-danger:hover { background: #dc2626; }
                
                .move-options { display: flex; flex-direction: column; gap: 0.75rem; }
                .move-option { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: var(--background); border: 2px solid var(--border); border-radius: var(--radius-lg); cursor: pointer; transition: all 0.2s ease; text-align: left; }
                .move-option:hover:not(:disabled) { border-color: var(--primary); transform: translateY(-2px); }
                .move-option:disabled { opacity: 0.6; cursor: not-allowed; }
                .move-option.current { border-color: var(--success); background: rgba(16, 185, 129, 0.05); }
                .option-icon { width: 3rem; height: 3rem; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: white; }
                .option-content { flex: 1; }
                .option-name { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem; }
                .option-desc { font-size: 0.8rem; color: var(--text-secondary); }
                .current-badge { background: var(--success); color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
                
                .value-input-group { position: relative; display: flex; align-items: center; }
                .value-prefix { position: absolute; left: 1.25rem; font-size: 1.25rem; font-weight: 700; color: var(--success); pointer-events: none; }
                .value-input { width: 100%; padding: 1rem 1rem 1rem 3rem; border: 2px solid var(--border); border-radius: var(--radius); font-size: 1.25rem; font-weight: 700; background: var(--background); color: var(--text-primary); transition: all 0.2s ease; }
                .value-input:focus { outline: none; border-color: var(--success); box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
                
                .quick-values { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-top: 1rem; }
                .quick-value-btn { padding: 0.75rem 1rem; background: var(--background); border: 2px solid var(--border); border-radius: var(--radius); color: var(--text-primary); cursor: pointer; transition: all 0.2s ease; font-weight: 600; }
                .quick-value-btn:hover { border-color: var(--success); color: var(--success); background: rgba(16, 185, 129, 0.05); }
                
                .reason-select {
                    width: 100%;
                    padding: 0.875rem 3rem 0.875rem 1.25rem;
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    font-size: 0.95rem;
                    background: var(--background);
                    color: var(--text-primary);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    font-family: inherit;
                    font-weight: 500;
                    cursor: pointer;
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
                    background-position: right 1rem center;
                    background-repeat: no-repeat;
                    background-size: 1.25rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                
                .reason-select:hover {
                    border-color: var(--primary);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                }
                
                .reason-select:focus {
                    outline: none;
                    border-color: var(--danger);
                    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1), 0 4px 12px rgba(239, 68, 68, 0.15);
                }
                
                .custom-reason-input {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    font-size: 0.95rem;
                    background: var(--background);
                    color: var(--text-primary);
                    transition: all 0.3s ease;
                    font-family: inherit;
                }
                
                .custom-reason-input:focus {
                    outline: none;
                    border-color: var(--danger);
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }
                
                .input-warning {
                    border-color: var(--warning) !important;
                }
                
                .input-error {
                    border-color: var(--danger) !important;
                }
                
                @media (max-width: 1024px) {
                    .stages-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
                    .analytics-grid { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
                }
                
                @media (max-width: 768px) {
                    .pipeline-header { grid-template-columns: 1fr; gap: 2rem; }
                    .pipeline-filters { flex-direction: column; gap: 1rem; }
                    .filter-controls { width: 100%; flex-wrap: wrap; }
                    .filter-btn { flex: 1; min-width: calc(50% - 0.5rem); }
                    .stages-grid { grid-template-columns: 1fr; }
                    .stage-content { max-height: 400px; }
                    .quality-slider-container { flex-direction: column; gap: 1rem; }
                    .score-display { order: -1; }
                    .form-actions { flex-direction: column; gap: 1rem; align-items: stretch; }
                    .form-actions-right { flex-direction: column; }
                    .btn-primary, .btn-secondary, .btn-danger { width: 100%; justify-content: center; }
                    .quick-values { grid-template-columns: repeat(2, 1fr); }
                }
                
                @media (max-width: 480px) {
                    .pipeline-header { padding: 1.5rem; }
                    .pipeline-title { font-size: 1.5rem; }
                    .monthly-progress { min-width: auto; }
                    .search-input { font-size: 16px; }
                    .modal-body { padding: 1.5rem; max-height: 50vh; }
                }
            </style>
        `;
    }
};

// Shell compatibility
if (typeof window !== 'undefined') {
    window.PipelineModule = PipelineModule;
    PipelineModule.init = function(targetContainer) {
        return this.pipeline_init(targetContainer);
    };
    console.log('Pipeline module loaded');
}