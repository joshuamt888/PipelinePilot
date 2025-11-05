window.GoalsModule = {
    // STATE
    state: {
        goals: [],
        activeGoals: [],
        completedGoals: [],
        failedGoals: [],
        stats: null,
        container: 'goals-content',
        currentFilter: 'all', // 'all', 'active', 'completed'
        editingGoalId: null
    },

    // INIT
    async goals_init(targetContainer = 'goals-content') {
        console.log('🎯 Goals module loading...');
        
        this.state.container = targetContainer;
        this.goals_showLoading();
        
        try {
            await this.goals_loadData();
            this.goals_render();
            console.log('✅ Goals module ready');
        } catch (error) {
            console.error('❌ Goals init failed:', error);
            this.goals_showError('Failed to load goals');
        }
    },

    // LOAD DATA
    async goals_loadData() {
        const goalsWithProgress = await API.getGoalProgress();
        
        this.state.goals = goalsWithProgress;
        this.state.activeGoals = goalsWithProgress.filter(g => g.status === 'active');
        this.state.completedGoals = goalsWithProgress.filter(g => g.status === 'completed');
        this.state.failedGoals = goalsWithProgress.filter(g => g.status === 'failed');
        
        // Calculate stats
        this.state.stats = {
            totalActive: this.state.activeGoals.length,
            totalCompleted: this.state.completedGoals.length
        };
    },

    // RENDER
    goals_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.goals_renderStyles()}
            <div class="goals-container">
                ${this.goals_renderHeader()}
                ${this.goals_renderBanners()}
                ${this.goals_renderGoalsGrid()}
            </div>
        `;

        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
            this.goals_attachEvents();
            this.goals_startCountdownTimer(); // Start live countdown for urgent goals
        }, 50);
    },

    // HEADER
    goals_renderHeader() {
        return `
            <div class="goals-header">
                <div class="goals-header-content">
                    <h1 class="goals-title">
                        <svg class="goals-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Goals
                    </h1>
                    <p class="goals-subtitle">Track your progress and crush your targets</p>
                </div>
                <button class="goals-btn-primary" data-action="create-goal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    New Goal
                </button>
            </div>
        `;
    },

    // CLICKABLE BANNERS
    goals_renderBanners() {
        const stats = this.state.stats;
        
        return `
            <div class="goals-banners">
                <button class="goals-banner ${this.state.currentFilter === 'active' ? 'active' : ''}" data-action="filter-active">
                    <div class="goals-banner-icon-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                            <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="goals-banner-content">
                        <div class="goals-banner-value">${stats.totalActive}</div>
                        <div class="goals-banner-label">Active Goals</div>
                    </div>
                    <div class="goals-banner-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </button>

                <button class="goals-banner ${this.state.currentFilter === 'completed' ? 'active' : ''}" data-action="filter-completed">
                    <div class="goals-banner-icon-wrapper goals-banner-icon-completed">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2" stroke-linecap="round"/>
                            <polyline points="22 4 12 14.01 9 11.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="goals-banner-content">
                        <div class="goals-banner-value">${stats.totalCompleted}</div>
                        <div class="goals-banner-label">Completed Goals</div>
                    </div>
                    <div class="goals-banner-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </button>
            </div>
        `;
    },

    // GOALS GRID
    goals_renderGoalsGrid() {
        let goalsToShow = [];
        let sectionTitle = 'All Goals';

        if (this.state.currentFilter === 'active') {
            goalsToShow = this.state.activeGoals;
            sectionTitle = 'Active Goals';
        } else if (this.state.currentFilter === 'completed') {
            goalsToShow = this.state.completedGoals;
            sectionTitle = 'Completed Goals';
        } else {
            goalsToShow = [...this.state.activeGoals, ...this.state.completedGoals];
        }

        return `
            <div class="goals-section">
                <div class="goals-section-header">
                    <h2 class="goals-section-title">${sectionTitle}</h2>
                    ${goalsToShow.length > 0 ? `<span class="goals-section-count">${goalsToShow.length}</span>` : ''}
                </div>

                ${goalsToShow.length > 0 ? `
                    <div class="goals-grid">
                        ${goalsToShow.map(goal => this.goals_renderGoalCard(goal)).join('')}
                    </div>
                ` : `
                    <div class="goals-empty">
                        <svg class="goals-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                            <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3 class="goals-empty-title">No ${this.state.currentFilter} goals</h3>
                        <p class="goals-empty-text">Create your first goal to start tracking progress</p>
                        <button class="goals-btn-secondary" data-action="create-goal">
                            Create Goal
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    // GOAL CARD
    goals_renderGoalCard(goal) {
        const progress = Math.min(goal.progress || 0, 100);
        const isCompleted = goal.status === 'completed';
        const isAtRisk = goal.period !== 'none' && goal.daysRemaining < 7 && progress < 50 && !isCompleted;

        // For urgent goals (today only), show live countdown timer
        let daysText;
        let useCountdown = false;
        if (goal.period === 'none') {
            daysText = 'Ongoing';
        } else if (goal.daysRemaining < 0) {
            daysText = 'Overdue';
        } else if (goal.daysRemaining === 0 && !isCompleted) {
            // Only show countdown for goals ending TODAY
            useCountdown = true;
            daysText = this.goals_getCountdownText(goal.end_date);
        } else if (goal.daysRemaining === 1) {
            daysText = 'Tomorrow';
        } else {
            daysText = `${goal.daysRemaining} days left`;
        }

        const statusClass = isCompleted ? 'completed' : isAtRisk ? 'at-risk' : 'active';
        const cardColor = goal.color && goal.color.trim() !== '' ? goal.color : null;
        
        const autoTrackIcon = goal.auto_track ? 
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' :
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

        return `
            <div class="goals-card goals-card-${statusClass}" data-action="view-goal" data-id="${goal.id}">
                ${cardColor ? `<div class="goals-card-accent" style="background: ${cardColor}"></div>` : ''}
                
                <div class="goals-card-header">
                    <h3 class="goals-card-title">${API.escapeHtml(goal.title)}</h3>
                    <div class="goals-card-meta">
                        <span class="goals-card-badge ${goal.auto_track ? 'goals-badge-auto' : 'goals-badge-manual'}">
                            ${autoTrackIcon}
                            ${goal.auto_track ? 'Auto' : 'Manual'}
                        </span>
                        <span class="goals-card-period">${this.goals_formatPeriod(goal.period)}</span>
                    </div>
                </div>

                <div class="goals-card-progress-section">
                    <div class="goals-progress-bar">
                        <div class="goals-progress-fill" style="width: ${progress}%; ${cardColor ? `background: ${cardColor};` : 'background: #94a3b8;'}">
                            <div class="goals-progress-shimmer"></div>
                        </div>
                    </div>
                    <div class="goals-progress-label">
                        <span class="goals-progress-percentage">${progress}%</span>
                        <span class="goals-progress-value">
                            ${this.goals_formatValue(goal.current_value, goal.unit)} / ${this.goals_formatValue(goal.target_value, goal.unit)}
                        </span>
                    </div>
                </div>

                <div class="goals-card-footer">
                    <div class="goals-card-time ${isAtRisk ? 'goals-time-warning' : ''}" ${useCountdown ? `data-countdown="${goal.end_date}" data-goal-id="${goal.id}"` : ''}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                            <polyline points="12 6 12 12 16 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="goals-countdown-text">${isCompleted ? 'Completed' : daysText}</span>
                    </div>
                    ${goal.is_recurring ? `
                        <div class="goals-card-recurring">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="23 4 23 10 17 10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Recurring
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    // MODALS - CREATE GOAL
    goals_showCreateModal() {
        const modal = document.createElement('div');
        modal.className = 'goals-modal-overlay show';
        modal.innerHTML = `
            <div class="goals-modal goals-modal-create-v2">
                <div class="goals-modal-header-v2">
                    <h2 class="goals-modal-title-v2">Create New Goal</h2>
                    <button class="goals-modal-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>
                            <line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>

                <div class="goals-modal-body-v2">
                    <form id="goalForm" class="goals-form-v2">
                        <div class="goals-form-group-v2">
                            <input type="text" id="goalTitle" class="goals-form-input-v2 goals-form-input-large" 
                                   placeholder="Q4 Revenue Target" required autocomplete="off">
                            <span class="goals-input-hint" id="titleCounter">35 characters remaining</span>
                        </div>

                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">Color Accent (Optional)</label>
                            <div class="goals-color-picker">
                                <label class="goals-color-option goals-color-none">
                                    <input type="radio" name="color" value="" checked>
                                    <span>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <line x1="2" y1="2" x2="22" y2="22" stroke-width="2" stroke-linecap="round"/>
                                        </svg>
                                    </span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#ef4444">
                                    <span style="background: #ef4444"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#f97316">
                                    <span style="background: #f97316"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#f59e0b">
                                    <span style="background: #f59e0b"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#10b981">
                                    <span style="background: #10b981"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#06b6d4">
                                    <span style="background: #06b6d4"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#667eea">
                                    <span style="background: #667eea"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#8b5cf6">
                                    <span style="background: #8b5cf6"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#ec4899">
                                    <span style="background: #ec4899"></span>
                                </label>
                            </div>
                        </div>

                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">Description (Optional)</label>
                            <textarea id="goalDescription" class="goals-form-textarea-v2"
                                      placeholder="Add notes about this goal..."
                                      maxlength="500"
                                      rows="3"></textarea>
                            <span class="goals-input-hint" id="descriptionCounter">500 characters remaining</span>
                        </div>

                        <div class="goals-form-row-v2">
                            <div class="goals-form-group-v2">
                                <label class="goals-form-label-v2">Target Value</label>
                                <input type="text" id="goalTarget" class="goals-form-input-v2" 
                                       placeholder="10000" required>
                                <span class="goals-input-hint" id="targetCounter">8 digits remaining</span>
                            </div>
                            <div class="goals-form-group-v2">
                                <label class="goals-form-label-v2">Unit</label>
                                <select id="goalUnit" class="goals-form-select-v2">
                                    <option value="dollars">Dollars ($)</option>
                                    <option value="leads">Leads</option>
                                    <option value="tasks">Tasks</option>
                                    <option value="calls">Calls</option>
                                    <option value="meetings">Meetings</option>
                                    <option value="hours">Hours</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                        </div>

                        <div class="goals-form-group-v2" id="customUnitInput" style="display: none;">
                            <label class="goals-form-label-v2">Custom Unit Name</label>
                            <input type="text" id="goalCustomUnit" class="goals-form-input-v2"
                                   placeholder="e.g., Appointments, Deals, Projects..."
                                   maxlength="25">
                            <span class="goals-input-hint" id="customUnitCounter">25 characters remaining</span>
                        </div>

                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">⏱ Time Period</label>
                            <div class="goals-period-pills">
                                <button type="button" class="goals-period-pill" data-period="daily">D</button>
                                <button type="button" class="goals-period-pill" data-period="weekly">W</button>
                                <button type="button" class="goals-period-pill active" data-period="monthly">M</button>
                                <button type="button" class="goals-period-pill" data-period="quarterly">Q</button>
                                <button type="button" class="goals-period-pill" data-period="yearly">Y</button>
                                <button type="button" class="goals-period-pill" data-period="none">∞</button>
                            </div>
                        </div>

                        <div class="goals-date-inputs-hidden">
                            <input type="date" id="goalStartDate" required>
                            <input type="date" id="goalEndDate" required>
                        </div>

                        <div class="goals-divider"></div>
                        
                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">⚡ Tracking Method</label>
                            <div class="goals-tracking-options">
                                <label class="goals-tracking-radio">
                                    <input type="radio" name="tracking" value="manual" checked>
                                    <div class="goals-tracking-card">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                                        </svg>
                                        <span class="goals-tracking-title">Manual</span>
                                        <span class="goals-tracking-desc">Update progress yourself</span>
                                    </div>
                                </label>
                                <label class="goals-tracking-radio">
                                    <input type="radio" name="tracking" value="auto">
                                    <div class="goals-tracking-card">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-width="2"/>
                                        </svg>
                                        <span class="goals-tracking-title">Auto-Track</span>
                                        <span class="goals-tracking-desc">Updates automatically</span>
                                    </div>
                                </label>
                            </div>
                            
                            <div id="autoTrackOptions" class="goals-auto-track-config" style="display: none;">
                                <select id="goalTrackType" class="goals-form-select-v2">
                                    <option value="revenue">Track from Jobs (Revenue)</option>
                                    <option value="leads">Track from Leads Created</option>
                                    <option value="tasks">Track from Tasks Completed</option>
                                </select>
                            </div>
                        </div>

                        <label class="goals-checkbox-v2">
                            <input type="checkbox" id="goalRecurring">
                            <span class="goals-checkbox-label">🔄 Recurring goal (resets after period ends)</span>
                        </label>

                        <div class="goals-divider"></div>

                        <div class="goals-modal-actions-v2">
                            <button type="button" class="goals-btn-secondary" data-action="close-modal">Cancel</button>
                            <button type="submit" class="goals-btn-primary">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                Create Goal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const today = new Date();
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 1);
        
        document.getElementById('goalStartDate').valueAsDate = today;
        document.getElementById('goalEndDate').valueAsDate = endDate;

        this.goals_setupFormInteractions(modal, 'create');

        const form = document.getElementById('goalForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn.disabled) return; // Prevent spam clicking

            // Disable button and show loading state
            submitBtn.disabled = true;
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = `
                <svg class="goals-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke-width="2" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Creating...
            `;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';

            try {
                await this.goals_createGoal();
                modal.remove();
            } catch (error) {
                // Re-enable button on error
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
        });

        this.goals_setupModalEvents(modal);
    },

    // MODALS - EDIT GOAL
    async goals_showEditModal(goalId) {
        const goal = this.state.goals.find(g => g.id === goalId);
        if (!goal) return;

        this.state.editingGoalId = goalId;

        const modal = document.createElement('div');
        modal.className = 'goals-modal-overlay show';
        modal.innerHTML = `
            <div class="goals-modal goals-modal-create-v2">
                <div class="goals-modal-header-v2">
                    <h2 class="goals-modal-title-v2">Edit Goal</h2>
                    <button class="goals-modal-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>
                            <line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>

                <div class="goals-modal-body-v2">
                    <form id="goalForm" class="goals-form-v2">
                        <div class="goals-form-group-v2">
                            <input type="text" id="goalTitle" class="goals-form-input-v2 goals-form-input-large" 
                                   placeholder="Q4 Revenue Target" required autocomplete="off" value="${API.escapeHtml(goal.title)}">
                            <span class="goals-input-hint" id="titleCounter">35 characters remaining</span>
                        </div>

                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">Color Accent (Optional)</label>
                            <div class="goals-color-picker">
                                <label class="goals-color-option goals-color-none">
                                    <input type="radio" name="color" value="" ${!goal.color ? 'checked' : ''}>
                                    <span>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <line x1="2" y1="2" x2="22" y2="22" stroke-width="2" stroke-linecap="round"/>
                                        </svg>
                                    </span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#ef4444" ${goal.color === '#ef4444' ? 'checked' : ''}>
                                    <span style="background: #ef4444"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#f97316" ${goal.color === '#f97316' ? 'checked' : ''}>
                                    <span style="background: #f97316"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#f59e0b" ${goal.color === '#f59e0b' ? 'checked' : ''}>
                                    <span style="background: #f59e0b"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#10b981" ${goal.color === '#10b981' ? 'checked' : ''}>
                                    <span style="background: #10b981"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#06b6d4" ${goal.color === '#06b6d4' ? 'checked' : ''}>
                                    <span style="background: #06b6d4"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#667eea" ${goal.color === '#667eea' ? 'checked' : ''}>
                                    <span style="background: #667eea"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#8b5cf6" ${goal.color === '#8b5cf6' ? 'checked' : ''}>
                                    <span style="background: #8b5cf6"></span>
                                </label>
                                <label class="goals-color-option">
                                    <input type="radio" name="color" value="#ec4899" ${goal.color === '#ec4899' ? 'checked' : ''}>
                                    <span style="background: #ec4899"></span>
                                </label>
                            </div>
                        </div>

                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">Description (Optional)</label>
                            <textarea id="goalDescription" class="goals-form-textarea-v2"
                                      placeholder="Add notes about this goal..."
                                      maxlength="500"
                                      rows="3">${goal.description ? API.escapeHtml(goal.description) : ''}</textarea>
                            <span class="goals-input-hint" id="descriptionCounter">500 characters remaining</span>
                        </div>

                        <div class="goals-form-row-v2">
                            <div class="goals-form-group-v2">
                                <label class="goals-form-label-v2">Target Value</label>
                                <input type="text" id="goalTarget" class="goals-form-input-v2"
                                       placeholder="10000" required value="${goal.target_value}">
                                <span class="goals-input-hint" id="targetCounter">8 digits remaining</span>
                            </div>
                            <div class="goals-form-group-v2">
                                <label class="goals-form-label-v2">Unit</label>
                                <select id="goalUnit" class="goals-form-select-v2">
                                    <option value="dollars" ${goal.unit === 'dollars' ? 'selected' : ''}>Dollars ($)</option>
                                    <option value="leads" ${goal.unit === 'leads' ? 'selected' : ''}>Leads</option>
                                    <option value="tasks" ${goal.unit === 'tasks' ? 'selected' : ''}>Tasks</option>
                                    <option value="calls" ${goal.unit === 'calls' ? 'selected' : ''}>Calls</option>
                                    <option value="meetings" ${goal.unit === 'meetings' ? 'selected' : ''}>Meetings</option>
                                    <option value="hours" ${goal.unit === 'hours' ? 'selected' : ''}>Hours</option>
                                    <option value="custom" ${!['dollars', 'leads', 'tasks', 'calls', 'meetings', 'hours'].includes(goal.unit) ? 'selected' : ''}>Custom</option>
                                </select>
                            </div>
                        </div>

                        <div class="goals-form-group-v2" id="customUnitInput" style="display: ${!['dollars', 'leads', 'tasks', 'calls', 'meetings', 'hours'].includes(goal.unit) ? 'block' : 'none'};">
                            <label class="goals-form-label-v2">Custom Unit Name</label>
                            <input type="text" id="goalCustomUnit" class="goals-form-input-v2"
                                   placeholder="e.g., Appointments, Deals, Projects..."
                                   maxlength="25"
                                   value="${!['dollars', 'leads', 'tasks', 'calls', 'meetings', 'hours'].includes(goal.unit) ? API.escapeHtml(goal.unit) : ''}">
                            <span class="goals-input-hint" id="customUnitCounter">25 characters remaining</span>
                        </div>

                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">⏱ Time Period</label>
                            <div class="goals-period-pills">
                                <button type="button" class="goals-period-pill ${goal.period === 'daily' ? 'active' : ''}" data-period="daily">D</button>
                                <button type="button" class="goals-period-pill ${goal.period === 'weekly' ? 'active' : ''}" data-period="weekly">W</button>
                                <button type="button" class="goals-period-pill ${goal.period === 'monthly' ? 'active' : ''}" data-period="monthly">M</button>
                                <button type="button" class="goals-period-pill ${goal.period === 'quarterly' ? 'active' : ''}" data-period="quarterly">Q</button>
                                <button type="button" class="goals-period-pill ${goal.period === 'yearly' ? 'active' : ''}" data-period="yearly">Y</button>
                                <button type="button" class="goals-period-pill ${goal.period === 'none' ? 'active' : ''}" data-period="none">∞</button>
                            </div>
                        </div>

                        <div class="goals-date-inputs-hidden">
                            <input type="date" id="goalStartDate" required value="${goal.start_date}">
                            <input type="date" id="goalEndDate" required value="${goal.end_date}">
                        </div>

                        <div class="goals-divider"></div>
                        
                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">⚡ Tracking Method</label>
                            <div class="goals-tracking-options">
                                <label class="goals-tracking-radio">
                                    <input type="radio" name="tracking" value="manual" ${!goal.auto_track ? 'checked' : ''}>
                                    <div class="goals-tracking-card">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                                        </svg>
                                        <span class="goals-tracking-title">Manual</span>
                                        <span class="goals-tracking-desc">Update progress yourself</span>
                                    </div>
                                </label>
                                <label class="goals-tracking-radio">
                                    <input type="radio" name="tracking" value="auto" ${goal.auto_track ? 'checked' : ''}>
                                    <div class="goals-tracking-card">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-width="2"/>
                                        </svg>
                                        <span class="goals-tracking-title">Auto-Track</span>
                                        <span class="goals-tracking-desc">Updates automatically</span>
                                    </div>
                                </label>
                            </div>
                            
                            <div id="autoTrackOptions" class="goals-auto-track-config" style="display: ${goal.auto_track ? 'block' : 'none'};">
                                <select id="goalTrackType" class="goals-form-select-v2">
                                    <option value="revenue" ${goal.goal_type === 'revenue' ? 'selected' : ''}>Track from Jobs (Revenue)</option>
                                    <option value="leads" ${goal.goal_type === 'leads' ? 'selected' : ''}>Track from Leads Created</option>
                                    <option value="tasks" ${goal.goal_type === 'tasks' ? 'selected' : ''}>Track from Tasks Completed</option>
                                </select>
                            </div>
                        </div>

                        <label class="goals-checkbox-v2">
                            <input type="checkbox" id="goalRecurring" ${goal.is_recurring ? 'checked' : ''}>
                            <span class="goals-checkbox-label">🔄 Recurring goal (resets after period ends)</span>
                        </label>

                        <div class="goals-divider"></div>

                        <div class="goals-modal-actions-v2">
                            <button type="button" class="goals-btn-secondary" data-action="close-modal">Cancel</button>
                            <button type="submit" class="goals-btn-primary">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        this.goals_setupFormInteractions(modal, 'edit');

        const form = document.getElementById('goalForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn.disabled) return; // Prevent spam clicking

            // Disable button and show loading state
            submitBtn.disabled = true;
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = `
                <svg class="goals-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke-width="2" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Saving...
            `;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';

            try {
                await this.goals_updateGoal();
                modal.remove();
            } catch (error) {
                // Re-enable button on error
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
        });

        this.goals_setupModalEvents(modal);
    },

    // FORM INTERACTIONS (shared between create and edit)
    goals_setupFormInteractions(modal, mode) {
        const titleInput = document.getElementById('goalTitle');
        const titleCounter = document.getElementById('titleCounter');
        
        const updateTitleCounter = () => {
            let value = titleInput.value;
            if (value.length > 35) {
                value = value.substring(0, 35);
                titleInput.value = value;
            }
            
            const remaining = 35 - value.length;
            titleCounter.textContent = remaining === 1 
                ? '1 character remaining' 
                : `${remaining} characters remaining`;
            
            if (remaining === 0) {
                titleCounter.textContent = 'Max reached';
                titleCounter.style.color = 'var(--danger)';
                titleCounter.style.fontWeight = '700';
            } else if (remaining <= 5) {
                titleCounter.style.color = 'var(--danger)';
                titleCounter.style.fontWeight = '700';
            } else if (remaining <= 10) {
                titleCounter.style.color = 'var(--warning)';
                titleCounter.style.fontWeight = '600';
            } else {
                titleCounter.style.color = 'var(--text-tertiary)';
                titleCounter.style.fontWeight = '500';
            }
        };

        titleInput.addEventListener('input', updateTitleCounter);
        if (mode === 'edit') updateTitleCounter();

        const targetInput = document.getElementById('goalTarget');
        const targetCounter = document.getElementById('targetCounter');
        
        const updateTargetCounter = () => {
            let value = targetInput.value;
            
            value = value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            if (parts.length === 2 && parts[1].length > 2) {
                value = parts[0] + '.' + parts[1].substring(0, 2);
            }
            if (parts[0].length > 8) {
                value = parts[0].substring(0, 8) + (parts.length > 1 ? '.' + parts[1] : '');
            }
            
            targetInput.value = value;
            
            const digitCount = parts[0].length;
            const remaining = 8 - digitCount;
            
            if (remaining <= 0) {
                targetCounter.textContent = 'Max reached';
                targetCounter.style.color = 'var(--danger)';
                targetCounter.style.fontWeight = '700';
            } else {
                targetCounter.textContent = remaining === 1 
                    ? '1 digit remaining' 
                    : `${remaining} digits remaining`;
                
                if (remaining <= 2) {
                    targetCounter.style.color = 'var(--danger)';
                    targetCounter.style.fontWeight = '700';
                } else if (remaining <= 4) {
                    targetCounter.style.color = 'var(--warning)';
                    targetCounter.style.fontWeight = '600';
                } else {
                    targetCounter.style.color = 'var(--text-tertiary)';
                    targetCounter.style.fontWeight = '500';
                }
            }
        };

        targetInput.addEventListener('input', updateTargetCounter);
        if (mode === 'edit') updateTargetCounter();

        // Description counter
        const descriptionInput = document.getElementById('goalDescription');
        const descriptionCounter = document.getElementById('descriptionCounter');

        const updateDescriptionCounter = () => {
            let value = descriptionInput.value;
            if (value.length > 500) {
                value = value.substring(0, 500);
                descriptionInput.value = value;
            }

            const remaining = 500 - value.length;
            descriptionCounter.textContent = remaining === 1
                ? '1 character remaining'
                : `${remaining} characters remaining`;

            if (remaining === 0) {
                descriptionCounter.textContent = 'Max reached';
                descriptionCounter.style.color = 'var(--danger)';
                descriptionCounter.style.fontWeight = '700';
            } else if (remaining <= 50) {
                descriptionCounter.style.color = 'var(--danger)';
                descriptionCounter.style.fontWeight = '700';
            } else if (remaining <= 100) {
                descriptionCounter.style.color = 'var(--warning)';
                descriptionCounter.style.fontWeight = '600';
            } else {
                descriptionCounter.style.color = 'var(--text-tertiary)';
                descriptionCounter.style.fontWeight = '500';
            }
        };

        descriptionInput.addEventListener('input', updateDescriptionCounter);
        if (mode === 'edit') updateDescriptionCounter();

        // Custom unit input toggle and counter
        const unitSelect = document.getElementById('goalUnit');
        const customUnitContainer = document.getElementById('customUnitInput');
        const customUnitInput = document.getElementById('goalCustomUnit');
        const customUnitCounter = document.getElementById('customUnitCounter');

        unitSelect.addEventListener('change', () => {
            if (unitSelect.value === 'custom') {
                customUnitContainer.style.display = 'block';
            } else {
                customUnitContainer.style.display = 'none';
            }
        });

        const updateCustomUnitCounter = () => {
            let value = customUnitInput.value;
            if (value.length > 25) {
                value = value.substring(0, 25);
                customUnitInput.value = value;
            }

            const remaining = 25 - value.length;
            customUnitCounter.textContent = remaining === 1
                ? '1 character remaining'
                : `${remaining} characters remaining`;

            if (remaining === 0) {
                customUnitCounter.textContent = 'Max reached';
                customUnitCounter.style.color = 'var(--danger)';
                customUnitCounter.style.fontWeight = '700';
            } else if (remaining <= 5) {
                customUnitCounter.style.color = 'var(--danger)';
                customUnitCounter.style.fontWeight = '700';
            } else if (remaining <= 10) {
                customUnitCounter.style.color = 'var(--warning)';
                customUnitCounter.style.fontWeight = '600';
            } else {
                customUnitCounter.style.color = 'var(--text-tertiary)';
                customUnitCounter.style.fontWeight = '500';
            }
        };

        customUnitInput.addEventListener('input', updateCustomUnitCounter);
        if (mode === 'edit') updateCustomUnitCounter();

        // PERIOD PILL EVENTS WITH FIXED DATE CALCULATION
        modal.querySelectorAll('.goals-period-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.goals-period-pill').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const period = e.currentTarget.dataset.period;
                const startDate = new Date(document.getElementById('goalStartDate').value);
                const endDate = new Date(startDate);
                
                switch(period) {
                    case 'daily':
                        endDate.setDate(endDate.getDate() + 1);
                        break;
                    case 'weekly':
                        endDate.setDate(endDate.getDate() + 7);
                        break;
                    case 'monthly':
                        endDate.setMonth(endDate.getMonth() + 1);
                        break;
                    case 'quarterly':
                        endDate.setMonth(endDate.getMonth() + 3);
                        break;
                    case 'yearly':
                        endDate.setFullYear(endDate.getFullYear() + 1);
                        break;
                    case 'none':
                        endDate.setFullYear(endDate.getFullYear() + 10);
                        break;
                }
                
                document.getElementById('goalEndDate').valueAsDate = endDate;
            });
        });

        modal.querySelectorAll('input[name="tracking"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const autoOptions = document.getElementById('autoTrackOptions');
                autoOptions.style.display = e.target.value === 'auto' ? 'block' : 'none';
            });
        });
    },
    // MODALS - VIEW GOAL DETAIL
    goals_showGoalDetailModal(goalId) {
        const goal = this.state.goals.find(g => g.id === goalId);
        if (!goal) return;

        const progress = Math.min(goal.progress || 0, 100);
        const isCompleted = goal.status === 'completed';
        const cardColor = goal.color && goal.color.trim() !== '' ? goal.color : null;

        const modal = document.createElement('div');
        modal.className = 'goals-modal-overlay show';
        modal.innerHTML = `
            <div class="goals-modal goals-modal-detail">
                <div class="goals-modal-header">
                    <div class="goals-modal-header-content">
                        ${cardColor ? `<div class="goals-modal-color-accent" style="background: ${cardColor}"></div>` : ''}
                        <div>
                            <h2 class="goals-modal-title">${API.escapeHtml(goal.title)}</h2>
                            <div class="goals-modal-subtitle">
                                ${this.goals_formatPeriod(goal.period)} • ${window.SteadyUtils.formatDate(goal.start_date, 'short')} - ${window.SteadyUtils.formatDate(goal.end_date, 'short')}
                            </div>
                        </div>
                    </div>
                    <button class="goals-modal-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>
                            <line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>

                <div class="goals-modal-body">
                    <div class="goals-detail-progress">
                        <div class="goals-detail-progress-ring">
                            <svg viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" stroke-width="8"/>
                                ${cardColor ? `
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="${cardColor}" stroke-width="8" 
                                            stroke-dasharray="${339.292 * progress / 100} 339.292" 
                                            transform="rotate(-90 60 60)"
                                            stroke-linecap="round"/>
                                ` : `
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="#94a3b8" stroke-width="8" 
                                            stroke-dasharray="${339.292 * progress / 100} 339.292" 
                                            transform="rotate(-90 60 60)"
                                            stroke-linecap="round"/>
                                `}
                            </svg>
                            <div class="goals-detail-progress-text">
                                <div class="goals-detail-progress-percentage">${progress}%</div>
                                <div class="goals-detail-progress-label">Complete</div>
                            </div>
                        </div>

                        <div class="goals-detail-progress-info">
                            <div class="goals-detail-stat">
                                <div class="goals-detail-stat-label">Current</div>
                                <div class="goals-detail-stat-value">${this.goals_formatValue(goal.current_value, goal.unit)}</div>
                            </div>
                            <div class="goals-detail-stat">
                                <div class="goals-detail-stat-label">Target</div>
                                <div class="goals-detail-stat-value">${this.goals_formatValue(goal.target_value, goal.unit)}</div>
                            </div>
                            <div class="goals-detail-stat">
                                <div class="goals-detail-stat-label">Remaining</div>
                                <div class="goals-detail-stat-value">${this.goals_formatValue(goal.remaining, goal.unit)}</div>
                            </div>
                            <div class="goals-detail-stat">
                                <div class="goals-detail-stat-label">Days Left</div>
                                <div class="goals-detail-stat-value">${goal.period === 'none' ? 'Ongoing' : (goal.daysRemaining < 0 ? 'Overdue' : goal.daysRemaining)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="goals-detail-info">
                        <div class="goals-detail-info-row">
                            <span class="goals-detail-info-label">Tracking</span>
                            <span class="goals-detail-info-value">
                                ${goal.auto_track ? 
                                    '<span class="goals-badge-auto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-width="2"/></svg> Auto-tracking enabled</span>' : 
                                    '<span class="goals-badge-manual"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/></svg> Manual entry</span>'
                                }
                            </span>
                        </div>
                        ${goal.is_recurring ? `
                            <div class="goals-detail-info-row">
                                <span class="goals-detail-info-label">Recurring</span>
                                <span class="goals-detail-info-value">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polyline points="23 4 23 10 17 10" stroke-width="2"/>
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke-width="2"/>
                                    </svg>
                                    Resets after ${this.goals_formatPeriod(goal.period).toLowerCase()}
                                </span>
                            </div>
                        ` : ''}
                    </div>

                    ${goal.description ? `
                        <div class="goals-detail-description">
                            <h3 class="goals-detail-section-title">Description</h3>
                            <p>${API.escapeHtml(goal.description)}</p>
                        </div>
                    ` : ''}

                    <div class="goals-modal-actions">
                        <button class="goals-btn-secondary" data-action="edit-goal" data-id="${goal.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                            </svg>
                            Edit Goal
                        </button>
                        ${!isCompleted && !goal.auto_track ? `
                            <button class="goals-btn-secondary" data-action="update-progress" data-id="${goal.id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                                </svg>
                                Update Progress
                            </button>
                        ` : ''}
                        <button class="goals-btn-danger" data-action="delete-goal" data-id="${goal.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="3 6 5 6 21 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.goals_setupModalEvents(modal);

        // Setup button event handlers for modal actions
        modal.querySelector('[data-action="edit-goal"]')?.addEventListener('click', async (e) => {
            const id = e.target.closest('button').dataset.id;
            modal.remove(); // Close detail modal
            await this.goals_showEditModal(id);
        });

        modal.querySelector('[data-action="update-progress"]')?.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            this.goals_showUpdateProgressModal(id);
        });

        modal.querySelector('[data-action="delete-goal"]')?.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            this.goals_showDeleteModal(id);
        });
    },

    // MODALS - UPDATE PROGRESS
    goals_showUpdateProgressModal(goalId) {
        const goal = this.state.goals.find(g => g.id === goalId);
        if (!goal) return;

        const modal = document.createElement('div');
        modal.className = 'goals-modal-overlay show';
        modal.innerHTML = `
            <div class="goals-modal goals-modal-update">
                <div class="goals-modal-header">
                    <h2 class="goals-modal-title">Update Progress</h2>
                    <button class="goals-modal-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>
                            <line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>

                <div class="goals-modal-body">
                    <div class="goals-update-current">
                        <h3>${API.escapeHtml(goal.title)}</h3>
                        <div class="goals-update-progress">
                            <div class="goals-progress-bar">
                                <div class="goals-progress-fill" style="width: ${goal.progress}%; ${goal.color ? `background: ${goal.color};` : 'background: #94a3b8;'}"></div>
                            </div>
                            <span>${this.goals_formatValue(goal.current_value, goal.unit)} / ${this.goals_formatValue(goal.target_value, goal.unit)}</span>
                        </div>
                    </div>

                    <form id="updateProgressForm" class="goals-form">
                        <div class="goals-form-group">
                            <label class="goals-form-label">Set New Value</label>
                            <input type="number" id="newProgressValue" class="goals-form-input" 
                                   value="${goal.current_value}" 
                                   min="0" 
                                   max="${goal.target_value}"
                                   step="any"
                                   required>
                            <p class="goals-form-hint">Enter the new progress value (0 - ${this.goals_formatValue(goal.target_value, goal.unit)})</p>
                        </div>

                        <div class="goals-modal-actions">
                            <button type="button" class="goals-btn-secondary" data-action="close-modal">Cancel</button>
                            <button type="submit" class="goals-btn-primary">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Update Progress
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('updateProgressForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn.disabled) return; // Prevent spam clicking

            // Disable button and show loading state
            submitBtn.disabled = true;
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = `
                <svg class="goals-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke-width="2" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Updating...
            `;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';

            try {
                const newValue = parseFloat(document.getElementById('newProgressValue').value);
                await this.goals_updateProgress(goalId, newValue);
                modal.remove();
                document.querySelector('.goals-modal-detail')?.closest('.goals-modal-overlay')?.remove();
            } catch (error) {
                // Re-enable button on error
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
        });

        this.goals_setupModalEvents(modal);
    },

    // MODALS - DELETE CONFIRMATION
    goals_showDeleteModal(goalId) {
        const goal = this.state.goals.find(g => g.id === goalId);
        if (!goal) return;

        const modal = document.createElement('div');
        modal.className = 'goals-modal-overlay show';
        modal.innerHTML = `
            <div class="goals-modal goals-modal-delete">
                <div class="goals-modal-header">
                    <h2 class="goals-modal-title">Delete Goal?</h2>
                    <button class="goals-modal-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>
                            <line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>

                <div class="goals-modal-body">
                    <div class="goals-delete-warning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke-width="2"/>
                            <line x1="12" y1="9" x2="12" y2="13" stroke-width="2" stroke-linecap="round"/>
                            <line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>Are you sure?</h3>
                        <p>This will permanently delete <strong>"${API.escapeHtml(goal.title)}"</strong> and all its progress data.</p>
                        <p class="goals-delete-warning-sub">This action cannot be undone.</p>
                    </div>

                    <div class="goals-modal-actions">
                        <button class="goals-btn-secondary" data-action="close-modal">Cancel</button>
                        <button class="goals-btn-danger" data-action="confirm-delete" data-id="${goalId}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="3 6 5 6 21 6" stroke-width="2"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
                            </svg>
                            Yes, Delete Goal
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.goals_setupModalEvents(modal);

        // Setup delete confirmation handler
        modal.querySelector('[data-action="confirm-delete"]')?.addEventListener('click', async (e) => {
            const id = e.target.closest('button').dataset.id;
            const btn = e.target.closest('button');

            // Disable button to prevent double-click
            if (btn.disabled) return;
            btn.disabled = true;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
                <svg class="goals-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke-width="2" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Deleting...
            `;
            btn.style.opacity = '0.6';

            try {
                await this.goals_deleteGoal(id);
                modal.remove();
                // Also close detail modal if it's open
                document.querySelector('.goals-modal-detail')?.closest('.goals-modal-overlay')?.remove();
            } catch (error) {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                btn.style.opacity = '1';
            }
        });
    },

    // MODAL EVENTS
    goals_setupModalEvents(modal) {
        const closeBtn = modal.querySelector('.goals-modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        modal.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
            btn.onclick = () => modal.remove();
        });

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });
    },

    // EVENT HANDLING
    goals_attachEvents() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            switch (action) {
                case 'create-goal':
                    this.goals_showCreateModal();
                    break;
                case 'edit-goal':
                    // Close detail modal if open
                    document.querySelector('.goals-modal-detail')?.closest('.goals-modal-overlay')?.remove();
                    await this.goals_showEditModal(id);
                    break;
                case 'view-goal':
                    this.goals_showGoalDetailModal(id);
                    break;
                case 'update-progress':
                    this.goals_showUpdateProgressModal(id);
                    break;
                case 'delete-goal':
                    this.goals_showDeleteModal(id);
                    break;
                case 'confirm-delete':
                    await this.goals_deleteGoal(id);
                    document.querySelector('.goals-modal-overlay')?.remove();
                    break;
                case 'filter-active':
                    this.state.currentFilter = this.state.currentFilter === 'active' ? 'all' : 'active';
                    this.goals_render();
                    break;
                case 'filter-completed':
                    this.state.currentFilter = this.state.currentFilter === 'completed' ? 'all' : 'completed';
                    this.goals_render();
                    break;
            }
        };
    },

    // API ACTIONS - CREATE
    async goals_createGoal() {
        try {
            const form = document.getElementById('goalForm');
            const activePeriod = document.querySelector('.goals-period-pill.active')?.dataset.period;
            const trackingMethod = document.querySelector('input[name="tracking"]:checked')?.value;
            
            const title = document.getElementById('goalTitle').value.trim();
            const targetValueStr = document.getElementById('goalTarget').value.trim();
            const targetValue = parseFloat(targetValueStr);
            const startDate = document.getElementById('goalStartDate').value;
            const endDate = document.getElementById('goalEndDate').value;
            
            if (!title) {
                window.SteadyUtils.showToast('Please enter a goal title', 'error');
                return;
            }
            
            if (title.length > 35) {
                window.SteadyUtils.showToast('Goal title must be 35 characters or less', 'error');
                return;
            }
            
            if (!targetValueStr) {
                window.SteadyUtils.showToast('Please enter a target value', 'error');
                return;
            }
            
            if (isNaN(targetValue) || targetValue <= 0) {
                window.SteadyUtils.showToast('Please enter a valid number', 'error');
                return;
            }
            
            if (targetValue > 99999999.99) {
                window.SteadyUtils.showToast('Target value cannot exceed 99,999,999.99', 'error');
                return;
            }
            
            if (!activePeriod || !startDate || !endDate) {
                window.SteadyUtils.showToast('Please fill in all required fields', 'error');
                return;
            }

            const selectedColor = document.querySelector('input[name="color"]:checked')?.value;
            const description = document.getElementById('goalDescription').value.trim();

            // Get unit value - use custom input if 'custom' is selected
            const unitSelect = document.getElementById('goalUnit').value;
            let unitValue = unitSelect;
            if (unitSelect === 'custom') {
                const customUnit = document.getElementById('goalCustomUnit').value.trim();
                if (!customUnit) {
                    window.SteadyUtils.showToast('Please enter a custom unit name', 'error');
                    return;
                }
                unitValue = customUnit;
            }

            const goalData = {
                title: title,
                description: description || null,
                goal_type: trackingMethod === 'auto' ?
                    document.getElementById('goalTrackType').value : 'custom',
                target_value: targetValue,
                current_value: 0,
                unit: unitValue,
                period: activePeriod,
                start_date: startDate,
                end_date: endDate,
                status: 'active',
                auto_track: trackingMethod === 'auto' || false,
                is_recurring: document.getElementById('goalRecurring').checked || false,
                color: selectedColor || null
            };
            
            console.log('Creating goal with data:', goalData);

            await API.createGoal(goalData);
            window.SteadyUtils.showToast('Goal created successfully!', 'success');
            await this.goals_loadData();
            this.goals_render();

        } catch (error) {
            console.error('Create goal error:', error);
            
            let errorMsg = 'Failed to create goal';
            if (error.message?.includes('numeric field overflow')) {
                errorMsg = 'Target value is too large. Please use a smaller number.';
            } else if (error.message?.includes('violates check constraint')) {
                errorMsg = 'Invalid data. Please check your inputs.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            
            window.SteadyUtils.showToast(errorMsg, 'error');
        }
    },

    // API ACTIONS - UPDATE
    async goals_updateGoal() {
        try {
            const goalId = this.state.editingGoalId;
            if (!goalId) throw new Error('No goal selected for editing');

            const activePeriod = document.querySelector('.goals-period-pill.active')?.dataset.period;
            const trackingMethod = document.querySelector('input[name="tracking"]:checked')?.value;
            
            const title = document.getElementById('goalTitle').value.trim();
            const targetValueStr = document.getElementById('goalTarget').value.trim();
            const targetValue = parseFloat(targetValueStr);
            const startDate = document.getElementById('goalStartDate').value;
            const endDate = document.getElementById('goalEndDate').value;
            
            if (!title || title.length > 35) {
                window.SteadyUtils.showToast('Invalid title', 'error');
                return;
            }
            
            if (isNaN(targetValue) || targetValue <= 0 || targetValue > 99999999.99) {
                window.SteadyUtils.showToast('Invalid target value', 'error');
                return;
            }
            
            if (!activePeriod || !startDate || !endDate) {
                window.SteadyUtils.showToast('Please fill in all required fields', 'error');
                return;
            }

            const selectedColor = document.querySelector('input[name="color"]:checked')?.value;
            const description = document.getElementById('goalDescription').value.trim();

            // Get unit value - use custom input if 'custom' is selected
            const unitSelect = document.getElementById('goalUnit').value;
            let unitValue = unitSelect;
            if (unitSelect === 'custom') {
                const customUnit = document.getElementById('goalCustomUnit').value.trim();
                if (!customUnit) {
                    window.SteadyUtils.showToast('Please enter a custom unit name', 'error');
                    return;
                }
                unitValue = customUnit;
            }

            const updates = {
                title: title,
                description: description || null,
                goal_type: trackingMethod === 'auto' ?
                    document.getElementById('goalTrackType').value : 'custom',
                target_value: targetValue,
                unit: unitValue,
                period: activePeriod,
                start_date: startDate,
                end_date: endDate,
                auto_track: trackingMethod === 'auto' || false,
                is_recurring: document.getElementById('goalRecurring').checked || false,
                color: selectedColor || null
            };
            
            console.log('Updating goal with data:', updates);

            await API.updateGoal(goalId, updates);
            window.SteadyUtils.showToast('Goal updated successfully!', 'success');
            
            this.state.editingGoalId = null;
            await this.goals_loadData();
            this.goals_render();

        } catch (error) {
            console.error('Update goal error:', error);
            window.SteadyUtils.showToast('Failed to update goal', 'error');
        }
    },

    // API ACTIONS - UPDATE PROGRESS
    async goals_updateProgress(goalId, newValue) {
        try {
            await API.updateGoalProgress(goalId, newValue);
            await API.checkGoalCompletion();
            
            window.SteadyUtils.showToast('Progress updated!', 'success');
            
            await this.goals_loadData();
            this.goals_render();

        } catch (error) {
            console.error('Update progress error:', error);
            window.SteadyUtils.showToast('Failed to update progress', 'error');
        }
    },

    // API ACTIONS - DELETE
    async goals_deleteGoal(goalId) {
        try {
            await API.deleteGoal(goalId);
            window.SteadyUtils.showToast('Goal deleted', 'info');
            
            await this.goals_loadData();
            this.goals_render();

        } catch (error) {
            console.error('Delete goal error:', error);
            window.SteadyUtils.showToast('Failed to delete goal', 'error');
        }
    },

    // UTILITIES
    goals_formatPeriod(period) {
        const periods = {
            daily: 'Daily',
            weekly: 'Weekly',
            monthly: 'Monthly',
            quarterly: 'Quarterly',
            yearly: 'Yearly',
            none: 'Ongoing'
        };
        return periods[period] || 'Monthly';
    },

    goals_formatValue(value, unit) {
        if (!value) return '0';

        const formattedNumber = window.SteadyUtils.formatNumber(value);

        switch (unit) {
            case 'dollars':
                return window.SteadyUtils.formatCurrency(value);
            case 'hours':
                return `${formattedNumber}h`;
            case 'leads':
            case 'tasks':
            case 'calls':
            case 'meetings':
                return `${formattedNumber} ${unit}`;
            default:
                // Custom unit - display the unit name
                return unit ? `${formattedNumber} ${unit}` : formattedNumber;
        }
    },

    // COUNTDOWN TIMER
    goals_getCountdownText(endDate) {
        const now = new Date();
        const end = new Date(endDate + 'T23:59:59'); // End of day
        const diff = end - now;

        if (diff <= 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours}h ${minutes}m ${seconds}s`;
    },

    goals_startCountdownTimer() {
        // Clear existing timer if any
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Update countdown every second
        this.countdownInterval = setInterval(() => {
            const countdownElements = document.querySelectorAll('[data-countdown]');

            countdownElements.forEach(el => {
                const endDate = el.dataset.countdown;
                const countdownText = this.goals_getCountdownText(endDate);
                const textElement = el.querySelector('.goals-countdown-text');

                if (textElement) {
                    textElement.textContent = countdownText;

                    // If expired, reload data to update status
                    if (countdownText === 'Expired') {
                        clearInterval(this.countdownInterval);
                        this.goals_loadData().then(() => this.goals_render());
                    }
                }
            });
        }, 1000);
    },

    // LOADING & ERROR
    goals_showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.style.opacity = '0';
            container.innerHTML = `<div style="min-height: 400px;"></div>`;
        }
    },

    goals_showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem;">
                    <div style="font-size: 4rem; margin-bottom: 2rem; opacity: 0.6;">⚠️</div>
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem;">Failed to Load Goals</h2>
                    <p style="margin-bottom: 2rem; font-size: 1.125rem; color: var(--text-secondary);">${API.escapeHtml(message)}</p>
                    <button onclick="GoalsModule.goals_init()" style="padding: 1rem 2rem; background: var(--primary); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: 1rem;">Try Again</button>
                </div>
            `;
        }
    },

    // STYLES - I'LL CONTINUE IN NEXT MESSAGE
    goals_renderStyles() {
        return `<style>
/* GOALS MODULE v3.0 - COMPLETE REWRITE 🔥 */

.goals-container {
    max-width: 1400px;
    margin: 0 auto;
    animation: goalsSlideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes goalsSlideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

.goals-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 2rem;
}

.goals-header-content { flex: 1; }

.goals-title {
    font-size: 2.5rem;
    font-weight: 900;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.goals-title-icon {
    width: 2.5rem;
    height: 2.5rem;
    stroke: currentColor;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.goals-subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0;
}

.goals-btn-primary, .goals-btn-secondary, .goals-btn-danger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border: none;
    border-radius: var(--radius-lg);
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
}

.goals-btn-primary {
    background: var(--gradient-primary);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.goals-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.goals-btn-primary svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2.5;
}

.goals-btn-secondary {
    background: var(--surface);
    color: var(--text-primary);
    border: 2px solid var(--border);
}

.goals-btn-secondary:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-1px);
}

.goals-btn-secondary svg {
    width: 1.125rem;
    height: 1.125rem;
    stroke-width: 2;
}

.goals-btn-danger {
    background: var(--danger);
    color: white;
}

.goals-btn-danger:hover {
    background: #dc2626;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
}

.goals-btn-danger svg {
    width: 1.125rem;
    height: 1.125rem;
    stroke-width: 2;
}

.goals-banners {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 3rem;
}

.goals-banner {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

/* Top banner removed - using only border outline on hover */

.goals-banner:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    border-color: #667eea; /* Always blue outline on hover */
}

.goals-banner.active {
    border-color: var(--primary);
    background: rgba(102, 126, 234, 0.05);
}

.goals-banner-icon-wrapper {
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(139, 92, 246, 0.15));
    border-radius: var(--radius-lg);
    flex-shrink: 0;
}

.goals-banner-icon-completed {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15));
}

.goals-banner-icon-wrapper svg {
    width: 2rem;
    height: 2rem;
    stroke: var(--primary);
    stroke-width: 2;
}

.goals-banner-icon-completed svg {
    stroke: var(--success);
}

.goals-banner-content { flex: 1; }

.goals-banner-value {
    font-size: 3rem;
    font-weight: 900;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 0.5rem;
}

.goals-banner-label {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.goals-banner-arrow {
    flex-shrink: 0;
    opacity: 0;
    transition: all 0.3s ease;
}

.goals-banner:hover .goals-banner-arrow {
    opacity: 1;
    transform: translateX(4px);
}

.goals-banner-arrow svg {
    width: 1.5rem;
    height: 1.5rem;
    stroke: var(--primary);
    stroke-width: 2.5;
}

.goals-section {
    margin-bottom: 3rem;
}

.goals-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.goals-section-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
}

.goals-section-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.75rem;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(139, 92, 246, 0.15));
    color: var(--primary);
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 700;
}

.goals-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
}

.goals-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.75rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

/* Top banner removed - using only border outline on hover */

.goals-card-accent {
    position: absolute;
    top: 0;
    left: 0;
    width: 60px;
    height: 60px;
    clip-path: polygon(0 0, 100% 0, 0 100%);
}

.goals-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    border-color: #667eea; /* Always blue outline on hover */
}

.goals-card.goals-card-completed {
    opacity: 0.8;
}

.goals-card.goals-card-completed::before {
    background: linear-gradient(90deg, var(--success), #059669);
}

.goals-card.goals-card-at-risk::before {
    background: linear-gradient(90deg, var(--warning), var(--danger));
}

/* Glow effect removed - using only border outline on hover */
/* Edit button removed from cards - now in view modal */

.goals-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    position: relative;
    z-index: 1;
}

.goals-card-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.3;
    flex: 1;
    padding-right: 1rem;
}

.goals-card-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    flex-shrink: 0;
}

.goals-card-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.goals-badge-auto {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15));
    color: var(--success);
}

.goals-badge-manual {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(139, 92, 246, 0.15));
    color: var(--primary);
}

.goals-card-badge svg {
    width: 0.875rem;
    height: 0.875rem;
    stroke-width: 2;
}

.goals-card-period {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-weight: 600;
}

.goals-card-progress-section {
    margin-bottom: 1.25rem;
}

.goals-progress-bar {
    height: 10px;
    background: var(--border);
    border-radius: 9999px;
    overflow: hidden;
    margin-bottom: 0.75rem;
    position: relative;
}

.goals-progress-fill {
    height: 100%;
    border-radius: 9999px;
    position: relative;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

.goals-progress-shimmer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: goalsShimmer 2s infinite;
}

@keyframes goalsShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

@keyframes goalsSpin {
    to { transform: rotate(360deg); }
}

@keyframes goalsPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.goals-spinner {
    width: 1rem;
    height: 1rem;
    animation: goalsSpin 0.8s linear infinite;
}

[data-countdown] .goals-countdown-text {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    animation: goalsPulse 2s ease-in-out infinite;
}

.goals-progress-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.goals-progress-percentage {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--text-primary);
}

.goals-progress-value {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 600;
}

.goals-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border);
}

.goals-card-time {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
}

.goals-card-time svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 2;
}

.goals-card-time.goals-time-warning {
    color: var(--danger);
}

.goals-card-recurring {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-tertiary);
}

.goals-card-recurring svg {
    width: 0.875rem;
    height: 0.875rem;
    stroke-width: 2;
}

.goals-empty {
    text-align: center;
    padding: 4rem 2rem;
    background: var(--surface);
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
}

.goals-empty-icon {
    width: 4rem;
    height: 4rem;
    stroke: var(--text-tertiary);
    stroke-width: 2;
    margin: 0 auto 1.5rem;
    opacity: 0.6;
}

.goals-empty-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
}

.goals-empty-text {
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
}

.goals-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 2rem;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.goals-modal-overlay.show {
    opacity: 1;
}

.goals-modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    transform: scale(0.95) translateY(20px);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
}

.goals-modal-overlay.show .goals-modal {
    transform: scale(1) translateY(0);
}

.goals-modal-create-v2 {
    max-width: 650px;
}

.goals-modal-detail {
    max-width: 800px;
}

.goals-modal-header-v2 {
    padding: 2.5rem 2.5rem 1.5rem 2.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.goals-modal-title-v2 {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
}

.goals-modal-body-v2 {
    padding: 2.5rem;
    overflow-y: auto;
    flex: 1;
}

.goals-form-v2 {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.goals-form-group-v2 {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.goals-form-row-v2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
}

.goals-form-label-v2 {
    font-weight: 700;
    color: var(--text-primary);
    font-size: 0.95rem;
}

.goals-input-hint {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-weight: 500;
}

.goals-form-input-large {
    font-size: 1.5rem !important;
    font-weight: 700 !important;
    padding: 1.25rem 1.5rem !important;
    text-align: center;
}

.goals-form-input-v2, .goals-form-select-v2 {
    padding: 1rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 1rem;
    background: #f8f9fa;
    color: var(--text-primary);
    transition: all 0.2s ease;
    font-weight: 500;
}

.goals-form-input-v2:focus, .goals-form-select-v2:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    background: #fff;
}

.goals-form-textarea-v2 {
    width: 100%;
    padding: 1rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 1rem;
    background: #f8f9fa;
    color: var(--text-primary);
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
    transition: all 0.2s ease;
}

.goals-form-textarea-v2:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    background: #fff;
}

.goals-form-textarea-v2::placeholder {
    color: var(--text-tertiary);
}

.goals-period-pills {
    display: flex;
    gap: 0.75rem;
}

.goals-period-pill {
    flex: 1;
    padding: 1rem;
    background: #f8f9fa;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-weight: 800;
    font-size: 1rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.goals-period-pill:hover {
    border-color: var(--primary);
    color: var(--primary);
}

.goals-period-pill.active {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.goals-date-inputs-hidden {
    display: none;
}

.goals-tracking-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.goals-tracking-radio {
    cursor: pointer;
}

.goals-tracking-radio input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.goals-tracking-card {
    padding: 1.5rem;
    background: #f8f9fa;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
    transition: all 0.2s ease;
}

.goals-tracking-card svg {
    width: 2rem;
    height: 2rem;
    stroke: var(--text-tertiary);
    stroke-width: 2;
}

.goals-tracking-title {
    font-weight: 700;
    color: var(--text-primary);
    font-size: 1rem;
}

.goals-tracking-desc {
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

.goals-tracking-radio:hover .goals-tracking-card {
    border-color: var(--primary);
}

.goals-tracking-radio input:checked + .goals-tracking-card {
    border-color: var(--primary);
    background: rgba(102, 126, 234, 0.05);
}

.goals-tracking-radio input:checked + .goals-tracking-card svg {
    stroke: var(--primary);
}

.goals-tracking-radio input:checked + .goals-tracking-card .goals-tracking-title {
    color: var(--primary);
}

.goals-auto-track-config {
    margin-top: 1rem;
    animation: goalsSlideDown 0.3s ease;
}

@keyframes goalsSlideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.goals-checkbox-v2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 1rem;
    background: var(--background);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    transition: border-color 0.2s ease;
}

.goals-checkbox-v2:hover {
    border-color: var(--primary);
}

.goals-checkbox-v2 input {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
    accent-color: var(--primary);
}

.goals-checkbox-label {
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
}

.goals-divider {
    height: 1px;
    background: var(--border);
    margin: 1rem 0;
}

.goals-color-picker {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.goals-color-option {
    position: relative;
    cursor: pointer;
}

.goals-color-option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.goals-color-option span {
    display: block;
    width: 3rem;
    height: 3rem;
    border-radius: var(--radius-lg);
    border: 3px solid transparent;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.goals-color-none span {
    background: var(--background);
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
}

.goals-color-none span svg {
    width: 1.5rem;
    height: 1.5rem;
    stroke: var(--text-tertiary);
    stroke-width: 2;
}

.goals-color-none:hover span svg {
    stroke: var(--text-primary);
}

.goals-color-none input:checked + span {
    border-color: var(--text-primary);
}

.goals-color-none input:checked + span svg {
    stroke: var(--text-primary);
}

.goals-color-option:hover span {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.goals-color-option input:checked + span {
    border-color: var(--text-primary);
    box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--text-primary);
    transform: scale(1.05);
}

.goals-modal-actions-v2 {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 1rem;
}

.goals-modal-close {
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.goals-modal-close svg {
    width: 1.5rem;
    height: 1.5rem;
    stroke: var(--text-secondary);
    stroke-width: 2;
}

.goals-modal-close:hover {
    background: var(--surface-hover);
}

.goals-modal-close:hover svg {
    stroke: var(--text-primary);
}

.goals-modal-header {
    padding: 2rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-shrink: 0;
    background: linear-gradient(to bottom, var(--surface-hover), var(--surface));
}

.goals-modal-header-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.goals-modal-color-accent {
    width: 4rem;
    height: 4rem;
    border-radius: var(--radius-lg);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
}

.goals-modal-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
}

.goals-modal-subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

.goals-modal-body {
    padding: 2rem;
    overflow-y: auto;
    flex: 1;
}

.goals-detail-progress {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 2.5rem;
    margin-bottom: 2rem;
    padding: 2rem;
    background: var(--background);
    border-radius: var(--radius-lg);
}

.goals-detail-progress-ring {
    position: relative;
    width: 240px;
    height: 240px;
}

.goals-detail-progress-ring svg {
    width: 100%;
    height: 100%;
}

.goals-detail-progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
}

.goals-detail-progress-percentage {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 0.25rem;
}

.goals-detail-progress-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.goals-detail-progress-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
}

.goals-detail-stat {
    background: var(--surface);
    padding: 1rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
}

.goals-detail-stat-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
}

.goals-detail-stat-value {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.goals-detail-info {
    margin-bottom: 2rem;
    background: var(--background);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
}

.goals-detail-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border);
}

.goals-detail-info-row:last-child {
    border-bottom: none;
}

.goals-detail-info-label {
    font-weight: 700;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.goals-detail-info-value {
    font-weight: 600;
    color: var(--text-primary);
}

.goals-detail-info-value svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 2;
    vertical-align: middle;
    margin-right: 0.375rem;
}

.goals-detail-section-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
}

.goals-detail-description {
    margin-bottom: 2rem;
}

.goals-detail-description p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    max-width: 100%;
}

.goals-update-current {
    background: var(--background);
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    margin-bottom: 2rem;
}

.goals-update-current h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
}

.goals-update-progress {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.goals-delete-warning {
    text-align: center;
    padding: 2rem;
    background: rgba(239, 68, 68, 0.05);
    border: 2px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-lg);
    margin-bottom: 2rem;
}

.goals-delete-warning svg {
    width: 4rem;
    height: 4rem;
    stroke: var(--danger);
    stroke-width: 2;
    margin-bottom: 1rem;
}

.goals-delete-warning h3 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--danger);
    margin: 0 0 1rem 0;
}

.goals-delete-warning p {
    color: var(--text-secondary);
    margin: 0 0 0.75rem 0;
    line-height: 1.6;
}

.goals-delete-warning-sub {
    font-weight: 700;
    color: var(--danger);
}

.goals-modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
}

.goals-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.goals-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.goals-form-label {
    font-weight: 700;
    color: var(--text-primary);
    font-size: 0.9rem;
}

.goals-form-input {
    padding: 0.875rem 1rem;
    border: 2px solid var(--border);
    border-radius: var(--radius);
    font-size: 1rem;
    background: #f8f9fa;
    color: var(--text-primary);
    transition: all 0.2s ease;
}

.goals-form-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    background: #fff;
}

.goals-form-hint {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    margin-top: 0.5rem;
    line-height: 1.4;
}

@media (max-width: 1200px) {
    .goals-grid {
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }
}

@media (max-width: 768px) {
    .goals-header {
        flex-direction: column;
        align-items: stretch;
    }
    
    .goals-title {
        font-size: 2rem;
    }
    
    .goals-banners {
        grid-template-columns: 1fr;
    }
    
    .goals-grid {
        grid-template-columns: 1fr;
    }
    
    .goals-form-row-v2 {
        grid-template-columns: 1fr;
    }
    
    .goals-tracking-options {
        grid-template-columns: 1fr;
    }
    
    .goals-period-pills {
        flex-wrap: wrap;
    }
    
    .goals-detail-progress {
        grid-template-columns: 1fr;
        text-align: center;
    }
    
    .goals-detail-progress-ring {
        margin: 0 auto;
    }
    
    .goals-modal-actions,
    .goals-modal-actions-v2 {
        flex-direction: column-reverse;
    }
    
    .goals-btn-primary,
    .goals-btn-secondary,
    .goals-btn-danger {
        width: 100%;
        justify-content: center;
    }

    .goals-modal-body-v2 {
        padding: 1.5rem;
    }
}

[data-theme="dark"] .goals-banner,
[data-theme="dark"] .goals-card {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .goals-banner:hover,
[data-theme="dark"] .goals-card:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

[data-theme="dark"] .goals-modal {
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}
</style>`;
    }
};

// SHELL COMPATIBILITY
if (typeof window !== 'undefined') {
    window.GoalsModule = GoalsModule;
    GoalsModule.init = function(targetContainer) {
        return this.goals_init(targetContainer);
    };
    console.log('✅ Goals module v3.0 loaded - COMPLETE REWRITE 🔥');
}