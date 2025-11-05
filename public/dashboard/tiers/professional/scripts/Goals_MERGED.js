window.GoalsModule = {
    // =====================================================
    // STATE MANAGEMENT
    // =====================================================
    state: {
        // Goals data
        goals: [],
        activeGoals: [],
        completedGoals: [],
        failedGoals: [],
        stats: null,
        container: 'goals-content',
        currentView: 'goals', // 'goals' or 'ladders'
        currentFilter: 'all', // 'all', 'active', 'completed' (for goals view)
        editingGoalId: null,

        // Ladder data
        ladders: [],
        ladderMode: 'overview', // 'overview', 'wizard', 'ladder-view'
        wizardStep: 1,
        selectedGoal: null,
        isCreatingNewGoal: false,
        newGoalData: {},
        selectedTaskIds: [],
        newTasks: [],
        availableTasks: [],
        currentLadder: null,
        svgZoom: 1,
        svgPanX: 0,
        svgPanY: 0
    },

    // =====================================================
    // INIT & DATA LOADING
    // =====================================================
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

    async goals_loadData() {
        const goalsWithProgress = await API.getGoalProgress();
        this.state.goals = goalsWithProgress;
        this.state.activeGoals = goalsWithProgress.filter(g => g.status === 'active');
        this.state.completedGoals = goalsWithProgress.filter(g => g.status === 'completed');
        this.state.failedGoals = goalsWithProgress.filter(g => g.status === 'failed');

        this.state.stats = {
            totalActive: this.state.activeGoals.length,
            totalCompleted: this.state.completedGoals.length
        };

        // Load ladder data
        this.state.ladders = await API.getAllGoalLadders();
        const allTasks = await API.getTasks();
        this.state.availableTasks = allTasks.filter(t => !t.goal_id);
    },

    // =====================================================
    // MAIN RENDER
    // =====================================================
    goals_render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.goals_renderStyles()}
            <div class="goals-container">
                ${this.goals_renderHeader()}
                ${this.goals_renderBanners()}
                ${this.state.currentView === 'goals' ? this.goals_renderGoalsGrid() : this.ladder_renderView()}
            </div>
        `;

        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
            this.goals_attachEvents();
            if (this.state.currentView === 'goals') {
                this.goals_startCountdownTimer();
            }
        }, 50);
    },

    goals_renderHeader() {
        return `
            <div class="goals-header">
                <div class="goals-header-content">
                    <h1 class="goals-title">
                        <svg class="goals-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Goals ${this.state.currentView === 'ladders' ? '→ Ladders' : ''}
                    </h1>
                    <p class="goals-subtitle">${this.state.currentView === 'goals' ? 'Track your progress and crush your targets' : 'Break down big goals into achievable tasks'}</p>
                </div>
                ${this.state.currentView === 'goals' ? `
                    <button class="goals-btn-primary" data-action="create-goal">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        New Goal
                    </button>
                ` : `
                    <button class="goals-btn-primary" data-action="create-ladder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        New Ladder
                    </button>
                `}
            </div>
        `;
    },

    goals_renderBanners() {
        const stats = this.state.stats;
        return `
            <div class="goals-banners">
                <button class="goals-banner ${this.state.currentView === 'goals' && this.state.currentFilter === 'active' ? 'active' : ''}" data-action="filter-active">
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
                </button>

                <button class="goals-banner goals-banner-ladder ${this.state.currentView === 'ladders' ? 'active' : ''}" data-action="view-ladders">
                    <div class="goals-banner-icon-wrapper goals-banner-icon-ladder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M6 4v16M18 4v16M6 9h12M6 15h12" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="goals-banner-content">
                        <div class="goals-banner-value">${this.state.ladders.length}</div>
                        <div class="goals-banner-label">Goal Ladders</div>
                    </div>
                </button>

                <button class="goals-banner ${this.state.currentView === 'goals' && this.state.currentFilter === 'completed' ? 'active' : ''}" data-action="filter-completed">
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
                </button>
            </div>
        `;
    },

    // =====================================================
    // GOALS VIEW RENDERING
    // =====================================================
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
                        <button class="goals-btn-secondary" data-action="create-goal">Create Goal</button>
                    </div>
                `}
            </div>
        `;
    },

    goals_renderGoalCard(goal) {
        const progress = Math.min(goal.progress || 0, 100);
        const isCompleted = goal.status === 'completed';
        const isAtRisk = goal.period !== 'none' && goal.daysRemaining < 7 && progress < 50 && !isCompleted;
        const statusClass = isCompleted ? 'completed' : isAtRisk ? 'at-risk' : 'active';
        const cardColor = goal.color && goal.color.trim() !== '' ? goal.color : null;

        return `
            <div class="goals-card goals-card-${statusClass}" data-action="view-goal" data-id="${goal.id}">
                ${cardColor ? `<div class="goals-card-accent" style="background: ${cardColor}"></div>` : ''}
                <div class="goals-card-header">
                    <h3 class="goals-card-title">${API.escapeHtml(goal.title)}</h3>
                    <div class="goals-card-meta">
                        <span class="goals-card-period">${this.goals_formatPeriod(goal.period)}</span>
                    </div>
                </div>
                <div class="goals-card-progress-section">
                    <div class="goals-progress-bar">
                        <div class="goals-progress-fill" style="width: ${progress}%; ${cardColor ? `background: ${cardColor};` : ''}"></div>
                    </div>
                    <div class="goals-progress-label">
                        <span class="goals-progress-percentage">${progress}%</span>
                        <span class="goals-progress-value">${this.goals_formatValue(goal.current_value, goal.unit)} / ${this.goals_formatValue(goal.target_value, goal.unit)}</span>
                    </div>
                </div>
                <div class="goals-card-footer">
                    <div class="goals-card-time ${isAtRisk ? 'goals-time-warning' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                            <polyline points="12 6 12 12 16 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>${isCompleted ? 'Completed' : goal.daysRemaining < 0 ? 'Overdue' : goal.daysRemaining === 0 ? 'Today' : `${goal.daysRemaining}d left`}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // =====================================================
    // LADDER VIEW RENDERING
    // =====================================================
    ladder_renderView() {
        if (this.state.ladderMode === 'wizard') {
            return this.ladder_renderWizard();
        } else if (this.state.ladderMode === 'ladder-view') {
            return this.ladder_renderSingleLadder();
        } else {
            return this.ladder_renderOverview();
        }
    },

    ladder_renderOverview() {
        return `
            <div class="ladder-overview-section">
                ${this.state.ladders.length > 0 ? `
                    <div class="ladder-grid">
                        ${this.state.ladders.slice(0, 10).map(ladder => this.ladder_renderCard(ladder)).join('')}
                    </div>
                ` : `
                    <div class="goals-empty">
                        <svg class="goals-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M6 4v16M18 4v16M6 9h12M6 15h12" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3 class="goals-empty-title">No Goal Ladders Yet</h3>
                        <p class="goals-empty-text">Create your first ladder to break down a big goal into manageable tasks</p>
                        <button class="goals-btn-secondary" data-action="create-ladder">Create Your First Ladder</button>
                    </div>
                `}
            </div>
        `;
    },

    ladder_renderCard(ladder) {
        const progress = ladder.taskCount > 0 ? Math.round((ladder.completedCount / ladder.taskCount) * 100) : 0;
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (progress / 100) * circumference;
        const daysRemaining = API.calculateDaysUntil(ladder.end_date);

        return `
            <div class="ladder-card" data-action="view-ladder" data-id="${ladder.id}">
                <div class="ladder-card-ring">
                    <svg viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" stroke-width="8"/>
                        <circle cx="60" cy="60" r="54" fill="none" stroke="${ladder.color || 'var(--primary)'}" stroke-width="8"
                                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                                transform="rotate(-90 60 60)" stroke-linecap="round"/>
                    </svg>
                    <div class="ladder-card-percentage">${progress}%</div>
                </div>
                <div class="ladder-card-content">
                    <h3 class="ladder-card-title">${API.escapeHtml(ladder.title)}</h3>
                    <div class="ladder-card-stats">
                        <span>${ladder.completedCount}/${ladder.taskCount} tasks</span>
                        <span>•</span>
                        <span>${daysRemaining < 0 ? 'Overdue' : daysRemaining === 0 ? 'Today' : `${daysRemaining}d left`}</span>
                    </div>
                </div>
            </div>
        `;
    },

    ladder_renderWizard() {
        return `
            <div class="ladder-wizard">
                <div class="wizard-progress">
                    <div class="wizard-step ${this.state.wizardStep >= 1 ? 'active' : ''}">
                        <div class="wizard-step-number">1</div>
                        <div class="wizard-step-label">Select Goal</div>
                    </div>
                    <div class="wizard-step-line ${this.state.wizardStep > 1 ? 'complete' : ''}"></div>
                    <div class="wizard-step ${this.state.wizardStep >= 2 ? 'active' : ''}">
                        <div class="wizard-step-number">2</div>
                        <div class="wizard-step-label">Add Tasks</div>
                    </div>
                    <div class="wizard-step-line ${this.state.wizardStep > 2 ? 'complete' : ''}"></div>
                    <div class="wizard-step ${this.state.wizardStep >= 3 ? 'active' : ''}">
                        <div class="wizard-step-number">3</div>
                        <div class="wizard-step-label">Review</div>
                    </div>
                </div>
                <div class="wizard-content">
                    ${this.state.wizardStep === 1 ? this.ladder_renderWizardStep1() :
                      this.state.wizardStep === 2 ? this.ladder_renderWizardStep2() :
                      this.ladder_renderWizardStep3()}
                </div>
            </div>
        `;
    },

    ladder_renderWizardStep1() {
        const availableGoals = this.state.goals.filter(g => !g.is_ladder);
        return `
            <div class="wizard-step-container">
                <h2>Choose a Goal</h2>
                <p class="wizard-subtitle">Select an existing goal or create a new one</p>
                ${!this.state.isCreatingNewGoal ? `
                    <select id="goalSelect" class="wizard-select">
                        <option value="">-- Choose a goal --</option>
                        ${availableGoals.map(g => `<option value="${g.id}">${API.escapeHtml(g.title)}</option>`).join('')}
                    </select>
                    <div class="wizard-divider"><span>or</span></div>
                    <button class="goals-btn-secondary" data-action="toggle-new-goal">Create New Goal</button>
                ` : `
                    <button class="goals-btn-text" data-action="toggle-new-goal">← Back to goal selection</button>
                    <div class="goals-form-group-v2">
                        <input type="text" id="newGoalTitle" placeholder="Goal title" maxlength="35" class="wizard-select">
                    </div>
                    <div class="goals-form-row-v2">
                        <input type="number" id="newGoalTarget" placeholder="Target value" class="wizard-select">
                        <select id="newGoalUnit" class="wizard-select">
                            <option value="dollars">Dollars</option>
                            <option value="leads">Leads</option>
                            <option value="tasks">Tasks</option>
                        </select>
                    </div>
                    <div class="wizard-period-pills">
                        <button type="button" class="wizard-period-pill" data-period="weekly">Week</button>
                        <button type="button" class="wizard-period-pill active" data-period="monthly">Month</button>
                        <button type="button" class="wizard-period-pill" data-period="quarterly">Quarter</button>
                        <button type="button" class="wizard-period-pill" data-period="yearly">Year</button>
                    </div>
                    <input type="hidden" id="newGoalStartDate">
                    <input type="hidden" id="newGoalEndDate">
                `}
                <div class="wizard-actions">
                    <button class="goals-btn-secondary" data-action="cancel-wizard">Cancel</button>
                    <button class="goals-btn-primary" data-action="wizard-next">Next: Add Tasks</button>
                </div>
            </div>
        `;
    },

    ladder_renderWizardStep2() {
        const totalSelected = this.state.selectedTaskIds.length + this.state.newTasks.length;
        const remaining = 50 - totalSelected;

        return `
            <div class="wizard-step-container">
                <h2>Add Tasks (${totalSelected}/50)</h2>
                <input type="text" id="taskSearch" class="wizard-select" placeholder="Search tasks..." ${remaining === 0 ? 'disabled' : ''}>
                <div class="wizard-task-list">
                    ${this.ladder_renderAvailableTasks()}
                </div>
                <div class="wizard-divider"><span>or</span></div>
                <div class="wizard-new-task-form">
                    <input type="text" id="newTaskTitle" placeholder="New task title..." class="wizard-select" ${remaining === 0 ? 'disabled' : ''}>
                    <button class="goals-btn-secondary" data-action="add-new-task" ${remaining === 0 ? 'disabled' : ''}>Add</button>
                </div>
                ${totalSelected > 0 ? `
                    <div class="wizard-selected-tasks">
                        <h3>Selected Tasks (${totalSelected})</h3>
                        ${this.ladder_renderSelectedTasks()}
                    </div>
                ` : ''}
                <div class="wizard-actions">
                    <button class="goals-btn-secondary" data-action="wizard-back">Back</button>
                    <button class="goals-btn-primary" data-action="wizard-next" ${totalSelected === 0 ? 'disabled' : ''}>Next: Review</button>
                </div>
            </div>
        `;
    },

    ladder_renderAvailableTasks() {
        const filtered = this.state.availableTasks.filter(t => !this.state.selectedTaskIds.includes(t.id));
        if (filtered.length === 0) return '<p class="wizard-empty-text">No available tasks</p>';

        return filtered.slice(0, 20).map(task => `
            <div class="wizard-task-item">
                <label>
                    <input type="checkbox" data-task-id="${task.id}" ${this.state.selectedTaskIds.includes(task.id) ? 'checked' : ''}>
                    <span>${API.escapeHtml(task.title)}</span>
                </label>
            </div>
        `).join('');
    },

    ladder_renderSelectedTasks() {
        const html = [];
        this.state.selectedTaskIds.forEach((taskId, index) => {
            const task = this.state.availableTasks.find(t => t.id === taskId);
            if (task) {
                html.push(`
                    <div class="wizard-selected-item">
                        <span>${index + 1}. ${API.escapeHtml(task.title)}</span>
                        <button data-action="remove-task" data-task-id="${taskId}">×</button>
                    </div>
                `);
            }
        });
        this.state.newTasks.forEach((task, index) => {
            html.push(`
                <div class="wizard-selected-item">
                    <span>${this.state.selectedTaskIds.length + index + 1}. ${API.escapeHtml(task.title)} <em>(new)</em></span>
                    <button data-action="remove-new-task" data-index="${index}">×</button>
                </div>
            `);
        });
        return html.join('');
    },

    ladder_renderWizardStep3() {
        const goal = this.state.selectedGoal || this.state.newGoalData;
        const totalTasks = this.state.selectedTaskIds.length + this.state.newTasks.length;

        return `
            <div class="wizard-step-container">
                <h2>Review Ladder</h2>
                <div class="wizard-review-card">
                    <h3>${API.escapeHtml(goal.title)}</h3>
                    <p>Target: ${goal.target_value} ${goal.unit} • ${goal.period}</p>
                </div>
                <div class="wizard-review-section">
                    <h3>Tasks (${totalTasks})</h3>
                    ${this.ladder_renderSelectedTasks()}
                </div>
                <div class="wizard-actions">
                    <button class="goals-btn-secondary" data-action="wizard-back">Back</button>
                    <button class="goals-btn-primary" data-action="create-ladder-final">Create Ladder</button>
                </div>
            </div>
        `;
    },

    ladder_renderSingleLadder() {
        const { goal, tasks, progress } = this.state.currentLadder;
        const taskHeight = 100;
        const taskSpacing = 40;
        const svgHeight = 200 + (tasks.length * (taskHeight + taskSpacing));

        return `
            <div class="ladder-view-section">
                <div class="ladder-view-controls">
                    <button class="goals-btn-secondary" data-action="back-to-ladder-overview">Back to Ladders</button>
                    <div>
                        <button data-action="zoom-fit" title="Fit">⊡</button>
                        <button data-action="zoom-out" title="Zoom out">−</button>
                        <button data-action="zoom-in" title="Zoom in">+</button>
                    </div>
                </div>
                <div class="ladder-svg-container" id="ladderViewContent">
                    <svg class="ladder-svg" viewBox="0 0 800 ${svgHeight}" id="ladderSvg">
                        <g transform="translate(250, 20)">
                            <rect width="300" height="120" rx="12" fill="var(--surface)" stroke="var(--primary)" stroke-width="3"/>
                            <text x="150" y="40" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text-primary)">${API.escapeHtml(goal.title)}</text>
                            <text x="150" y="70" text-anchor="middle" font-size="14" fill="var(--text-secondary)">Progress: ${progress}%</text>
                            <text x="150" y="95" text-anchor="middle" font-size="14" fill="var(--text-secondary)">${this.state.currentLadder.completedTasks}/${tasks.length} tasks</text>
                        </g>
                        <line x1="400" y1="140" x2="400" y2="200" stroke="var(--border)" stroke-width="3"/>
                        ${tasks.map((task, index) => {
                            const y = 200 + (index * (taskHeight + taskSpacing));
                            const statusColor = task.status === 'completed' ? 'var(--success)' : task.status === 'in_progress' ? 'var(--warning)' : 'var(--text-tertiary)';
                            const statusIcon = task.status === 'completed' ? '✓' : task.status === 'in_progress' ? '⚡' : '○';
                            return `
                                <g transform="translate(250, ${y})" data-task-id="${task.id}" style="cursor: pointer;">
                                    <rect width="300" height="${taskHeight}" rx="8" fill="var(--surface)" stroke="${statusColor}" stroke-width="2"/>
                                    <text x="15" y="35" font-size="16" font-weight="600" fill="var(--text-primary)">${API.escapeHtml(task.title.substring(0, 30))}</text>
                                    <circle cx="270" cy="50" r="15" fill="${statusColor}"/>
                                    <text x="270" y="55" text-anchor="middle" fill="white" font-size="18">${statusIcon}</text>
                                </g>
                                ${index < tasks.length - 1 ? `<line x1="400" y1="${y + taskHeight}" x2="400" y2="${y + taskHeight + taskSpacing}" stroke="var(--border)" stroke-width="3"/>` : ''}
                            `;
                        }).join('')}
                    </svg>
                </div>
            </div>
        `;
    },

    // =====================================================
    // EVENT HANDLING
    // =====================================================
    goals_attachEvents() {
        const container = document.getElementById(this.state.container);

        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            switch(action) {
                // View switching
                case 'filter-active':
                    this.state.currentView = 'goals';
                    this.state.currentFilter = this.state.currentFilter === 'active' ? 'all' : 'active';
                    this.goals_render();
                    break;
                case 'filter-completed':
                    this.state.currentView = 'goals';
                    this.state.currentFilter = this.state.currentFilter === 'completed' ? 'all' : 'completed';
                    this.goals_render();
                    break;
                case 'view-ladders':
                    this.state.currentView = 'ladders';
                    this.state.ladderMode = 'overview';
                    this.goals_render();
                    break;

                // Goals actions
                case 'create-goal':
                    this.goals_showCreateModal();
                    break;
                case 'view-goal':
                    this.goals_showDetailModal(id);
                    break;

                // Ladder actions
                case 'create-ladder':
                    this.state.ladderMode = 'wizard';
                    this.state.wizardStep = 1;
                    this.state.selectedGoal = null;
                    this.state.isCreatingNewGoal = false;
                    this.state.selectedTaskIds = [];
                    this.state.newTasks = [];
                    this.goals_render();
                    break;
                case 'view-ladder':
                    await this.ladder_showLadderView(id);
                    break;
                case 'cancel-wizard':
                case 'back-to-ladder-overview':
                    this.state.ladderMode = 'overview';
                    this.goals_render();
                    break;
                case 'toggle-new-goal':
                    this.state.isCreatingNewGoal = !this.state.isCreatingNewGoal;
                    this.goals_render();
                    this.ladder_setupStep1Events();
                    break;
                case 'wizard-next':
                    await this.ladder_wizardNext();
                    break;
                case 'wizard-back':
                    this.state.wizardStep--;
                    this.goals_render();
                    this.ladder_setupStepEvents();
                    break;
                case 'add-new-task':
                    this.ladder_addNewTask();
                    break;
                case 'remove-task':
                    this.state.selectedTaskIds = this.state.selectedTaskIds.filter(tid => tid !== target.dataset.taskId);
                    this.goals_render();
                    this.ladder_setupStepEvents();
                    break;
                case 'remove-new-task':
                    this.state.newTasks.splice(parseInt(target.dataset.index), 1);
                    this.goals_render();
                    this.ladder_setupStepEvents();
                    break;
                case 'create-ladder-final':
                    await this.ladder_createLadder();
                    break;
                case 'zoom-fit':
                    this.state.svgZoom = 1;
                    this.state.svgPanX = 0;
                    this.state.svgPanY = 0;
                    this.ladder_applySVGTransform();
                    break;
                case 'zoom-in':
                    this.state.svgZoom = Math.min(3, this.state.svgZoom * 1.2);
                    this.ladder_applySVGTransform();
                    break;
                case 'zoom-out':
                    this.state.svgZoom = Math.max(0.5, this.state.svgZoom * 0.8);
                    this.ladder_applySVGTransform();
                    break;
            }
        };

        // Setup step-specific events
        if (this.state.currentView === 'ladders') {
            this.ladder_setupStepEvents();
        }
    },

    ladder_setupStepEvents() {
        if (this.state.wizardStep === 1) {
            this.ladder_setupStep1Events();
        } else if (this.state.wizardStep === 2) {
            this.ladder_setupStep2Events();
        }
    },

    ladder_setupStep1Events() {
        const goalSelect = document.getElementById('goalSelect');
        if (goalSelect) {
            goalSelect.onchange = (e) => {
                const goalId = e.target.value;
                this.state.selectedGoal = goalId ? this.state.goals.find(g => g.id === goalId) : null;
            };
        }

        const pills = document.querySelectorAll('.wizard-period-pill');
        pills.forEach(pill => {
            pill.onclick = () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.ladder_calculateGoalDates(pill.dataset.period);
            };
        });

        if (this.state.isCreatingNewGoal) {
            this.ladder_calculateGoalDates('monthly');
        }
    },

    ladder_setupStep2Events() {
        const searchInput = document.getElementById('taskSearch');
        if (searchInput) {
            searchInput.oninput = () => {
                const listContainer = document.querySelector('.wizard-task-list');
                if (listContainer) {
                    listContainer.innerHTML = this.ladder_renderAvailableTasks();
                    this.ladder_attachTaskCheckboxes();
                }
            };
        }

        this.ladder_attachTaskCheckboxes();
    },

    ladder_attachTaskCheckboxes() {
        const checkboxes = document.querySelectorAll('[data-task-id]');
        checkboxes.forEach(checkbox => {
            checkbox.onchange = (e) => {
                const taskId = e.target.dataset.taskId;
                const totalSelected = this.state.selectedTaskIds.length + this.state.newTasks.length;

                if (e.target.checked) {
                    if (totalSelected < 50 && !this.state.selectedTaskIds.includes(taskId)) {
                        this.state.selectedTaskIds.push(taskId);
                        this.goals_render();
                        this.ladder_setupStepEvents();
                    } else {
                        e.target.checked = false;
                        window.SteadyUtils.showToast('Maximum 50 tasks per ladder', 'warning');
                    }
                } else {
                    this.state.selectedTaskIds = this.state.selectedTaskIds.filter(id => id !== taskId);
                    this.goals_render();
                    this.ladder_setupStepEvents();
                }
            };
        });
    },

    ladder_calculateGoalDates(period) {
        const startDate = new Date();
        const endDate = new Date(startDate);

        switch(period) {
            case 'weekly': endDate.setDate(endDate.getDate() + 7); break;
            case 'monthly': endDate.setMonth(endDate.getMonth() + 1); break;
            case 'quarterly': endDate.setMonth(endDate.getMonth() + 3); break;
            case 'yearly': endDate.setFullYear(endDate.getFullYear() + 1); break;
        }

        const startInput = document.getElementById('newGoalStartDate');
        const endInput = document.getElementById('newGoalEndDate');
        if (startInput && endInput) {
            startInput.value = startDate.toISOString().split('T')[0];
            endInput.value = endDate.toISOString().split('T')[0];
        }
    },

    ladder_addNewTask() {
        const input = document.getElementById('newTaskTitle');
        if (!input || !input.value.trim()) {
            window.SteadyUtils.showToast('Please enter a task title', 'error');
            return;
        }

        const totalSelected = this.state.selectedTaskIds.length + this.state.newTasks.length;
        if (totalSelected >= 50) {
            window.SteadyUtils.showToast('Maximum 50 tasks per ladder', 'warning');
            return;
        }

        this.state.newTasks.push({ title: input.value.trim(), status: 'pending' });
        input.value = '';
        this.goals_render();
        this.ladder_setupStepEvents();
    },

    async ladder_wizardNext() {
        if (this.state.wizardStep === 1) {
            if (this.state.isCreatingNewGoal) {
                if (!this.ladder_validateNewGoal()) return;
            } else if (!this.state.selectedGoal) {
                window.SteadyUtils.showToast('Please select a goal', 'error');
                return;
            }
            this.state.wizardStep = 2;
        } else if (this.state.wizardStep === 2) {
            if (this.state.selectedTaskIds.length + this.state.newTasks.length === 0) {
                window.SteadyUtils.showToast('Please add at least one task', 'error');
                return;
            }
            this.state.wizardStep = 3;
        }
        this.goals_render();
        this.ladder_setupStepEvents();
    },

    ladder_validateNewGoal() {
        const title = document.getElementById('newGoalTitle')?.value.trim();
        const target = document.getElementById('newGoalTarget')?.value;
        const unit = document.getElementById('newGoalUnit')?.value;
        const period = document.querySelector('.wizard-period-pill.active')?.dataset.period;
        const startDate = document.getElementById('newGoalStartDate')?.value;
        const endDate = document.getElementById('newGoalEndDate')?.value;

        if (!title || !target || !period || !startDate || !endDate) {
            window.SteadyUtils.showToast('Please fill in all required fields', 'error');
            return false;
        }

        this.state.newGoalData = {
            title,
            target_value: parseFloat(target),
            unit,
            period,
            start_date: startDate,
            end_date: endDate,
            current_value: 0,
            status: 'active',
            goal_type: 'custom',
            auto_track: false,
            is_ladder: true
        };
        return true;
    },

    async ladder_createLadder() {
        try {
            let goalId;
            if (this.state.isCreatingNewGoal) {
                const goal = await API.createGoal(this.state.newGoalData);
                goalId = goal.id;
            } else {
                goalId = this.state.selectedGoal.id;
                await API.updateGoal(goalId, { is_ladder: true });
            }

            for (const task of this.state.newTasks) {
                await API.createTaskForGoal(goalId, task);
            }

            for (const taskId of this.state.selectedTaskIds) {
                await API.linkTaskToGoal(taskId, goalId);
            }

            window.SteadyUtils.showToast('Goal Ladder created!', 'success');
            await this.goals_loadData();
            await this.ladder_showLadderView(goalId);
        } catch (error) {
            console.error('Create ladder error:', error);
            window.SteadyUtils.showToast('Failed to create ladder', 'error');
        }
    },

    async ladder_showLadderView(goalId) {
        try {
            this.state.currentLadder = await API.getGoalLadder(goalId);
            this.state.ladderMode = 'ladder-view';
            this.goals_render();
            this.ladder_setupPanning();
        } catch (error) {
            console.error('Show ladder view error:', error);
            window.SteadyUtils.showToast('Failed to load ladder', 'error');
        }
    },

    ladder_setupPanning() {
        const svg = document.getElementById('ladderSvg');
        const container = document.getElementById('ladderViewContent');
        if (!svg || !container) return;

        let isPanning = false;
        let startX, startY;

        container.onmousedown = (e) => {
            isPanning = true;
            startX = e.clientX - this.state.svgPanX;
            startY = e.clientY - this.state.svgPanY;
            container.style.cursor = 'grabbing';
        };

        document.onmousemove = (e) => {
            if (!isPanning) return;
            this.state.svgPanX = e.clientX - startX;
            this.state.svgPanY = e.clientY - startY;
            this.ladder_applySVGTransform();
        };

        document.onmouseup = () => {
            isPanning = false;
            if (container) container.style.cursor = 'grab';
        };
    },

    ladder_applySVGTransform() {
        const svg = document.getElementById('ladderSvg');
        if (svg) {
            svg.style.transform = `translate(${this.state.svgPanX}px, ${this.state.svgPanY}px) scale(${this.state.svgZoom})`;
        }
    },

    // =====================================================
    // GOALS MODALS (SIMPLIFIED)
    // =====================================================
    goals_showCreateModal() {
        const modal = document.createElement('div');
        modal.className = 'goals-modal-overlay show';
        modal.innerHTML = `
            <div class="goals-modal">
                <div class="goals-modal-header">
                    <h2>Create New Goal</h2>
                    <button class="goals-modal-close">×</button>
                </div>
                <form id="goalForm" class="goals-modal-body">
                    <input type="text" id="goalTitle" placeholder="Goal Title" maxlength="35" required>
                    <div class="goals-form-row-v2">
                        <input type="number" id="goalTarget" placeholder="Target Value" required>
                        <select id="goalUnit">
                            <option value="dollars">Dollars</option>
                            <option value="leads">Leads</option>
                            <option value="tasks">Tasks</option>
                        </select>
                    </div>
                    <div class="wizard-period-pills">
                        <button type="button" class="wizard-period-pill" data-period="weekly">Week</button>
                        <button type="button" class="wizard-period-pill active" data-period="monthly">Month</button>
                        <button type="button" class="wizard-period-pill" data-period="quarterly">Quarter</button>
                        <button type="button" class="wizard-period-pill" data-period="yearly">Year</button>
                    </div>
                    <div class="goals-modal-actions">
                        <button type="button" class="goals-btn-secondary goals-modal-close">Cancel</button>
                        <button type="submit" class="goals-btn-primary">Create Goal</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const today = new Date();
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 1);

        modal.querySelectorAll('.goals-modal-close').forEach(btn => btn.onclick = () => modal.remove());
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        const form = document.getElementById('goalForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.goals_createGoal();
            modal.remove();
        };

        const pills = modal.querySelectorAll('.wizard-period-pill');
        pills.forEach(pill => {
            pill.onclick = () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            };
        });
    },

    goals_showDetailModal(goalId) {
        const goal = this.state.goals.find(g => g.id === goalId);
        if (!goal) return;

        const modal = document.createElement('div');
        modal.className = 'goals-modal-overlay show';
        modal.innerHTML = `
            <div class="goals-modal">
                <div class="goals-modal-header">
                    <h2>${API.escapeHtml(goal.title)}</h2>
                    <button class="goals-modal-close">×</button>
                </div>
                <div class="goals-modal-body">
                    <p><strong>Progress:</strong> ${goal.progress}%</p>
                    <p><strong>Current:</strong> ${this.goals_formatValue(goal.current_value, goal.unit)}</p>
                    <p><strong>Target:</strong> ${this.goals_formatValue(goal.target_value, goal.unit)}</p>
                    <p><strong>Period:</strong> ${this.goals_formatPeriod(goal.period)}</p>
                    <div class="goals-modal-actions">
                        <button class="goals-btn-secondary goals-modal-close">Close</button>
                        <button class="goals-btn-primary" data-action="update-goal-progress" data-id="${goalId}">Update Progress</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelectorAll('.goals-modal-close').forEach(btn => btn.onclick = () => modal.remove());
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        const updateBtn = modal.querySelector('[data-action="update-goal-progress"]');
        if (updateBtn) {
            updateBtn.onclick = () => {
                modal.remove();
                this.goals_showUpdateProgressModal(goalId);
            };
        }
    },

    goals_showUpdateProgressModal(goalId) {
        const goal = this.state.goals.find(g => g.id === goalId);
        if (!goal) return;

        const modal = document.createElement('div');
        modal.className = 'goals-modal-overlay show';
        modal.innerHTML = `
            <div class="goals-modal">
                <div class="goals-modal-header">
                    <h2>Update Progress</h2>
                    <button class="goals-modal-close">×</button>
                </div>
                <form id="progressForm" class="goals-modal-body">
                    <p>${API.escapeHtml(goal.title)}</p>
                    <input type="number" id="newProgressValue" placeholder="New value" value="${goal.current_value}" required>
                    <div class="goals-modal-actions">
                        <button type="button" class="goals-btn-secondary goals-modal-close">Cancel</button>
                        <button type="submit" class="goals-btn-primary">Update</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelectorAll('.goals-modal-close').forEach(btn => btn.onclick = () => modal.remove());
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        const form = document.getElementById('progressForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const newValue = parseFloat(document.getElementById('newProgressValue').value);
            await this.goals_updateProgress(goalId, newValue);
            modal.remove();
        };
    },

    async goals_createGoal() {
        const title = document.getElementById('goalTitle').value.trim();
        const target = parseFloat(document.getElementById('goalTarget').value);
        const unit = document.getElementById('goalUnit').value;
        const period = document.querySelector('.wizard-period-pill.active')?.dataset.period || 'monthly';

        const startDate = new Date();
        const endDate = new Date(startDate);

        switch(period) {
            case 'weekly': endDate.setDate(endDate.getDate() + 7); break;
            case 'monthly': endDate.setMonth(endDate.getMonth() + 1); break;
            case 'quarterly': endDate.setMonth(endDate.getMonth() + 3); break;
            case 'yearly': endDate.setFullYear(endDate.getFullYear() + 1); break;
        }

        try {
            await API.createGoal({
                title,
                target_value: target,
                unit,
                period,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                current_value: 0,
                status: 'active',
                goal_type: 'custom',
                auto_track: false
            });

            window.SteadyUtils.showToast('Goal created!', 'success');
            await this.goals_loadData();
            this.goals_render();
        } catch (error) {
            console.error('Create goal error:', error);
            window.SteadyUtils.showToast('Failed to create goal', 'error');
        }
    },

    async goals_updateProgress(goalId, newValue) {
        try {
            await API.updateGoalProgress(goalId, newValue);
            window.SteadyUtils.showToast('Progress updated!', 'success');
            await this.goals_loadData();
            this.goals_render();
        } catch (error) {
            console.error('Update progress error:', error);
            window.SteadyUtils.showToast('Failed to update progress', 'error');
        }
    },

    // =====================================================
    // UTILITIES
    // =====================================================
    goals_formatPeriod(period) {
        const map = {
            'daily': 'Daily',
            'weekly': 'Weekly',
            'monthly': 'Monthly',
            'quarterly': 'Quarterly',
            'yearly': 'Yearly',
            'none': 'Ongoing'
        };
        return map[period] || period;
    },

    goals_formatValue(value, unit) {
        if (unit === 'dollars') {
            return '$' + value.toLocaleString();
        }
        return value.toLocaleString() + ' ' + unit;
    },

    goals_showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = '<div style="padding: 4rem; text-align: center;"><h3>Loading goals...</h3></div>';
        }
    },

    goals_showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `<div style="padding: 4rem; text-align: center;"><h3>Error</h3><p>${message}</p></div>`;
        }
    },

    goals_startCountdownTimer() {
        // Placeholder for countdown timer
    },

    // =====================================================
    // STYLES
    // =====================================================
    goals_renderStyles() {
        return `<style>
/* GOALS & LADDERS MODULE - MERGED STYLES */

.goals-container {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
}

.goals-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 2rem;
}

.goals-title {
    font-size: 2.5rem;
    font-weight: 900;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.goals-title-icon {
    width: 2.5rem;
    height: 2.5rem;
    stroke: var(--primary);
}

.goals-subtitle {
    color: var(--text-secondary);
    margin: 0;
    font-size: 1.125rem;
}

.goals-btn-primary,
.goals-btn-secondary,
.goals-btn-text {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.goals-btn-primary {
    background: var(--gradient-primary);
    color: white;
}

.goals-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.goals-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.goals-btn-primary svg {
    width: 1.125rem;
    height: 1.125rem;
    stroke: currentColor;
    fill: none;
}

.goals-btn-secondary {
    background: var(--surface);
    color: var(--text-primary);
    border: 2px solid var(--border);
}

.goals-btn-secondary:hover:not(:disabled) {
    border-color: var(--primary);
    color: var(--primary);
}

.goals-btn-text {
    background: none;
    border: none;
    color: var(--primary);
    text-decoration: underline;
}

.goals-banners {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.goals-banner {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.goals-banner:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    border-color: var(--primary);
}

.goals-banner.active {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
}

.goals-banner.active .goals-banner-icon-wrapper {
    background: rgba(255, 255, 255, 0.2);
}

.goals-banner.active .goals-banner-value,
.goals-banner.active .goals-banner-label {
    color: white;
}

.goals-banner-icon-wrapper {
    width: 3rem;
    height: 3rem;
    border-radius: 12px;
    background: var(--primary-light);
    display: flex;
    align-items: center;
    justify-content: center;
}

.goals-banner-icon-wrapper svg {
    width: 1.5rem;
    height: 1.5rem;
    stroke: var(--primary);
}

.goals-banner.active .goals-banner-icon-wrapper svg {
    stroke: white;
}

.goals-banner-icon-ladder {
    background: var(--warning-light);
}

.goals-banner-icon-ladder svg {
    stroke: var(--warning);
}

.goals-banner-icon-completed {
    background: var(--success-light);
}

.goals-banner-icon-completed svg {
    stroke: var(--success);
}

.goals-banner-content {
    flex: 1;
}

.goals-banner-value {
    font-size: 1.75rem;
    font-weight: 900;
    color: var(--text-primary);
}

.goals-banner-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
}

.goals-section {
    margin-bottom: 2rem;
}

.goals-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.goals-section-title {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0;
}

.goals-section-count {
    background: var(--primary);
    color: white;
    padding: 0.25rem 0.75rem;
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
    border-radius: 16px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.goals-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
    border-color: var(--primary);
}

.goals-card-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
}

.goals-card-header {
    margin-bottom: 1rem;
}

.goals-card-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
}

.goals-card-meta {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.goals-card-period {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 600;
}

.goals-card-progress-section {
    margin-bottom: 1rem;
}

.goals-progress-bar {
    height: 8px;
    background: var(--border);
    border-radius: 9999px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.goals-progress-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 9999px;
    transition: width 0.5s ease;
}

.goals-progress-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
}

.goals-progress-percentage {
    font-weight: 700;
    color: var(--text-primary);
}

.goals-progress-value {
    color: var(--text-secondary);
}

.goals-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.goals-card-time {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.goals-card-time svg {
    width: 1rem;
    height: 1rem;
    stroke: currentColor;
    fill: none;
}

.goals-time-warning {
    color: var(--warning);
}

.goals-empty {
    text-align: center;
    padding: 4rem 2rem;
}

.goals-empty-icon {
    width: 5rem;
    height: 5rem;
    stroke: var(--text-tertiary);
    margin-bottom: 2rem;
    opacity: 0.5;
    fill: none;
}

.goals-empty-title {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 0.75rem 0;
}

.goals-empty-text {
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
}

/* LADDER STYLES */

.ladder-overview-section {
    margin-top: 2rem;
}

.ladder-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}

.ladder-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.ladder-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
    border-color: var(--primary);
}

.ladder-card-ring {
    position: relative;
    width: 120px;
    height: 120px;
}

.ladder-card-ring svg {
    width: 100%;
    height: 100%;
}

.ladder-card-percentage {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.75rem;
    font-weight: 900;
    color: var(--text-primary);
}

.ladder-card-content {
    text-align: center;
    width: 100%;
}

.ladder-card-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
}

.ladder-card-stats {
    font-size: 0.875rem;
    color: var(--text-secondary);
    display: flex;
    gap: 0.5rem;
    justify-content: center;
}

/* WIZARD STYLES */

.ladder-wizard {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 16px;
    padding: 2rem;
    margin-top: 2rem;
}

.wizard-progress {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
}

.wizard-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.wizard-step-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--border);
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
}

.wizard-step.active .wizard-step-number {
    background: var(--primary);
    color: white;
}

.wizard-step-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
}

.wizard-step.active .wizard-step-label {
    color: var(--primary);
}

.wizard-step-line {
    width: 60px;
    height: 2px;
    background: var(--border);
}

.wizard-step-line.complete {
    background: var(--success);
}

.wizard-content {
    margin-top: 2rem;
}

.wizard-step-container {
    max-width: 700px;
    margin: 0 auto;
}

.wizard-step-container h2 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 0.5rem 0;
}

.wizard-subtitle {
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
}

.wizard-select {
    width: 100%;
    padding: 1rem;
    border: 2px solid var(--border);
    border-radius: 12px;
    font-size: 1rem;
    background: var(--surface);
    color: var(--text-primary);
    margin-bottom: 1rem;
}

.wizard-select:focus {
    outline: none;
    border-color: var(--primary);
}

.wizard-divider {
    margin: 2rem 0;
    text-align: center;
    position: relative;
}

.wizard-divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
}

.wizard-divider span {
    position: relative;
    background: var(--surface);
    padding: 0 1rem;
    color: var(--text-tertiary);
    font-weight: 600;
}

.wizard-period-pills {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}

.wizard-period-pill {
    flex: 1;
    min-width: 80px;
    padding: 0.875rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.wizard-period-pill:hover {
    border-color: var(--primary);
    color: var(--primary);
}

.wizard-period-pill.active {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
}

.wizard-task-list {
    max-height: 300px;
    overflow-y: auto;
    border: 2px solid var(--border);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.wizard-task-item {
    margin-bottom: 0.75rem;
}

.wizard-task-item label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    cursor: pointer;
}

.wizard-task-item label:hover {
    background: var(--surface-hover);
}

.wizard-task-item input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.wizard-new-task-form {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.wizard-new-task-form input {
    flex: 1;
}

.wizard-empty-text {
    text-align: center;
    color: var(--text-tertiary);
    padding: 2rem;
}

.wizard-selected-tasks {
    margin: 2rem 0;
    padding: 1.5rem;
    background: var(--background);
    border: 2px solid var(--border);
    border-radius: 12px;
}

.wizard-selected-tasks h3 {
    margin: 0 0 1rem 0;
}

.wizard-selected-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--surface);
    border-radius: 8px;
    margin-bottom: 0.5rem;
}

.wizard-selected-item button {
    background: var(--danger);
    color: white;
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    font-weight: 700;
}

.wizard-review-card {
    padding: 1.5rem;
    background: var(--surface);
    border: 2px solid var(--primary);
    border-radius: 12px;
    margin-bottom: 2rem;
}

.wizard-review-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
}

.wizard-review-section {
    margin-bottom: 2rem;
}

.wizard-review-section h3 {
    margin: 0 0 1rem 0;
}

.wizard-actions {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border);
}

/* LADDER VIEW */

.ladder-view-section {
    margin-top: 2rem;
}

.ladder-view-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.ladder-view-controls button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 8px;
    cursor: pointer;
    margin-left: 0.5rem;
}

.ladder-view-controls button:hover {
    background: var(--primary);
    color: white;
}

.ladder-svg-container {
    width: 100%;
    height: 600px;
    overflow: auto;
    border: 2px solid var(--border);
    border-radius: 16px;
    background: var(--background);
    cursor: grab;
}

.ladder-svg {
    transition: transform 0.3s ease;
}

/* MODALS */

.goals-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.goals-modal-overlay.show {
    opacity: 1;
}

.goals-modal {
    background: var(--surface);
    border-radius: 16px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.goals-modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.goals-modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
}

.goals-modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    color: var(--text-secondary);
}

.goals-modal-close:hover {
    color: var(--danger);
}

.goals-modal-body {
    padding: 2rem;
    overflow-y: auto;
    max-height: calc(80vh - 100px);
}

.goals-modal-body input,
.goals-modal-body select {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid var(--border);
    border-radius: 12px;
    font-size: 1rem;
    background: var(--surface);
    color: var(--text-primary);
    margin-bottom: 1rem;
}

.goals-modal-body input:focus,
.goals-modal-body select:focus {
    outline: none;
    border-color: var(--primary);
}

.goals-form-row-v2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.goals-modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
}

@media (max-width: 768px) {
    .goals-banners {
        grid-template-columns: 1fr;
    }

    .goals-grid {
        grid-template-columns: 1fr;
    }

    .ladder-grid {
        grid-template-columns: 1fr;
    }

    .wizard-period-pills {
        flex-direction: column;
    }

    .wizard-actions {
        flex-direction: column-reverse;
    }

    .goals-form-row-v2 {
        grid-template-columns: 1fr;
    }
}
</style>`;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.GoalsModule = window.GoalsModule;
    console.log('✅ Goals module loaded (with Goal Ladders integrated)');
}
