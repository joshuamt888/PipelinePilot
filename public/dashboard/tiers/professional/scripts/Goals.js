window.GoalsModule = {
    // STATE
    state: {
        goals: [],
        activeGoals: [],
        completedGoals: [],
        failedGoals: [],
        stats: null,
        container: 'goals-content',
        currentFilter: 'active', // 'active' or 'completed'
        editingGoalId: null,
        availableTasks: [],
        selectedTaskIds: [],
        taskLinkTab: 'existing'
    },

    // INIT
    async goals_init(targetContainer = 'goals-content') {
        this.state.container = targetContainer;
        this.goals_showLoading();

        try {
            await this.goals_loadData();
            await this.goals_loadAvailableTasks();
            this.goals_render();

            // Listen for task status changes to refresh goal percentages
            this.goals_setupTaskChangeListener();
        } catch (error) {
            this.goals_showError('Failed to load goals');
        }
    },

    // Listen for task status changes and refresh goals
    goals_setupTaskChangeListener() {
        // Remove any existing listener to avoid duplicates
        document.removeEventListener('taskStatusChanged', this.goals_handleTaskChange);

        // Bind the handler so we can reference it for removal
        this.goals_handleTaskChange = async () => {
            // Reload goals data to get fresh percentages
            await this.goals_loadData();
            this.goals_render();
        };

        document.addEventListener('taskStatusChanged', this.goals_handleTaskChange);
    },

    // LOAD DATA
    async goals_loadData() {
        const goalsWithProgress = await API.getGoalProgress();

        this.state.goals = goalsWithProgress;

        // For task_list goals: use progress to determine if "completed" (dynamic)
        // For value-based goals: use actual status field
        this.state.activeGoals = goalsWithProgress.filter(g => {
            if (g.goal_type === 'task_list' && !g.is_recurring) {
                // Task list goals: active if progress < 100%
                return g.progress < 100;
            }
            return g.status === 'active';
        });

        this.state.completedGoals = goalsWithProgress.filter(g => {
            if (g.goal_type === 'task_list' && !g.is_recurring) {
                // Task list goals: completed if progress >= 100%
                return g.progress >= 100;
            }
            return g.status === 'completed';
        });

        this.state.failedGoals = goalsWithProgress.filter(g => g.status === 'failed');

        // Calculate stats
        this.state.stats = {
            totalActive: this.state.activeGoals.length,
            totalCompleted: this.state.completedGoals.length
        };
    },

    // LOAD AVAILABLE TASKS
async goals_loadAvailableTasks() {
    try {
        this.state.availableTasks = await API.getTasks({ status: 'pending' });
    } catch (error) {
        this.state.availableTasks = [];
    }
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

    // SMOOTH FILTER CHANGE (with fade transition)
    async goals_smoothFilterChange(newFilter) {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        // Fade out
        container.style.opacity = '0';

        // Wait for fade out
        await new Promise(resolve => setTimeout(resolve, 200));

        // Change filter
        this.state.currentFilter = newFilter;

        // Re-render (will fade back in)
        this.goals_render();
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
            <!-- Active Goals -->
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

            <!-- Completed Goals -->
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
        let sectionTitle = 'Active Goals';

        if (this.state.currentFilter === 'active') {
            goalsToShow = this.state.activeGoals;
            sectionTitle = 'Active Goals';
        } else if (this.state.currentFilter === 'completed') {
            goalsToShow = this.state.completedGoals;
            sectionTitle = 'Completed Goals';
        }

        return `
            <div class="goals-section">
                <div class="goals-section-header">
                    <h2 class="goals-section-title">${sectionTitle}</h2>
                    <div class="goals-search-container">
                        <svg class="goals-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="8" stroke-width="2"/>
                            <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <input type="text"
                               id="goalsSearchInput"
                               class="goals-search-input"
                               placeholder="Search goals..."
                               autocomplete="off">
                    </div>
                    <span class="goals-section-count" id="goalsCount">${goalsToShow.length}</span>
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
        // Always use the actual progress from current_value / target_value
        // No caps, no status overrides - just the real math
        const progress = Math.floor(goal.progress || 0);
        // Only show as completed if we're in the completed filter
        const isCompleted = this.state.currentFilter === 'completed';
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

        // Show badge for task list goals, otherwise just manual
        const goalTypeBadge = goal.goal_type === 'task_list'
            ? '<span class="goals-card-badge goals-badge-manual"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Task List</span>'
            : '<span class="goals-card-badge goals-badge-manual"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Manual</span>';

        return `
            <div class="goals-card goals-card-${statusClass}" data-action="view-goal" data-id="${goal.id}">
                ${cardColor ? `<div class="goals-card-accent" style="background: ${cardColor}"></div>` : ''}

                <div class="goals-card-header">
                    <h3 class="goals-card-title">${API.escapeHtml(goal.title)}</h3>
                    <div class="goals-card-meta">
                        ${goalTypeBadge}
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
        ${goal.goal_type === 'task_list' 
            ? `${goal.current_value} of ${goal.target_value} tasks complete`
            : `${this.goals_formatValue(goal.current_value, goal.unit)} / ${this.goals_formatValue(goal.target_value, goal.unit)}`
        }
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

                ${goal.is_recurring && goal.completion_count > 0 ? `
                    <div class="goals-card-completions">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2" stroke-linecap="round"/>
                            <polyline points="22 4 12 14.01 9 11.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Completed ${goal.completion_count}x
                    </div>
                ` : ''}
            </div>
        `;
    },
    // MODALS - CREATE GOAL
    goals_showCreateModal() {
        // Reset task selection state
        this.state.selectedTaskIds = [];
        this.state.newTasks = [];

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
                        <!-- TITLE -->
                        <div class="goals-form-group-v2">
                            <input type="text" id="goalTitle" class="goals-form-input-v2 goals-form-input-large"
                                   placeholder="Q4 Revenue Target" autocomplete="off">
                            <span class="goals-input-hint" id="titleCounter">35 characters remaining</span>
                        </div>

                        <div class="goals-divider"></div>

                        <!-- TRACKING METHOD (MOVED TO TOP) -->
                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.125rem; height: 1.125rem; display: inline-block; vertical-align: middle; margin-right: 0.5rem;">
                                    <line x1="12" y1="1" x2="12" y2="23" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Goal Type
                            </label>
                            <div class="goals-tracking-options-grid">
                                <label class="goals-tracking-radio">
                                    <input type="radio" name="tracking" value="manual" checked>
                                    <div class="goals-tracking-card">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                                        </svg>
                                        <span class="goals-tracking-title">Manual</span>
                                        <span class="goals-tracking-desc">Update yourself</span>
                                    </div>
                                </label>
                                <label class="goals-tracking-radio">
                                    <input type="radio" name="tracking" value="task_list">
                                    <div class="goals-tracking-card">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M9 11l3 3L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        <span class="goals-tracking-title">Task Checklist</span>
                                        <span class="goals-tracking-desc">Complete tasks</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- TASK CHECKLIST SPECIFIC FIELDS -->
                        <div id="taskChecklistFields" class="goals-conditional-fields" style="display: none;">
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

                            <!-- Task Selection -->
                            <div class="goals-task-checklist-config">
                                <div class="goals-task-selected-count" style="margin-bottom: 1rem; text-align: center; padding: 0.75rem; background: var(--background); border-radius: var(--radius); border: 1px solid var(--border);">
                                    <span id="taskCombinedCount" style="font-weight: 700; font-size: 0.875rem;">0 / 30 tasks</span>
                                </div>

                                <div class="goals-task-tabs">
                                    <button type="button" class="goals-task-tab active" data-tab="existing">
                                        Existing Tasks
                                    </button>
                                    <button type="button" class="goals-task-tab" data-tab="create">
                                        Create New
                                    </button>
                                </div>

                                <!-- Existing Tasks Tab -->
                                <div id="existingTasksTab" class="goals-task-tab-content">
                                    <div style="margin-bottom: 1rem;">
                                        <div style="position: relative;">
                                            <input type="text" id="taskSearchInput" class="goals-form-input-v2" placeholder="Search tasks..." style="padding-left: 2.5rem;">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); width: 1.125rem; height: 1.125rem; color: var(--text-tertiary); pointer-events: none;">
                                                <circle cx="11" cy="11" r="8" stroke-width="2"/>
                                                <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                                            </svg>
                                        </div>
                                    </div>

                                    <div class="goals-task-list" id="tasksList">
                                        ${this.state.availableTasks.length > 0 ? `
                                            ${this.state.availableTasks.map(task => `
                                                <label class="goals-task-checkbox" data-task-title="${API.escapeHtml(task.title).toLowerCase()}">
                                                    <input type="checkbox" value="${task.id}" data-task-select>
                                                    <div class="goals-task-item">
                                                        <div class="goals-task-item-content">
                                                            <span class="goals-task-item-title">${API.escapeHtml(task.title)}</span>
                                                            ${task.due_date ? `
                                                                <span class="goals-task-item-date">
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                                                                        <line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/>
                                                                        <line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/>
                                                                        <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
                                                                    </svg>
                                                                    ${window.SteadyUtils.formatDate(task.due_date, 'short')}
                                                                </span>
                                                            ` : ''}
                                                        </div>
                                                    </div>
                                                </label>
                                            `).join('')}
                                        ` : `
                                            <div class="goals-task-empty">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <circle cx="12" cy="12" r="10" stroke-width="2"/>
                                                    <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
                                                </svg>
                                                <p>No pending tasks available</p>
                                                <p class="goals-task-empty-hint">Create tasks in the Scheduling module first</p>
                                            </div>
                                        `}
                                    </div>
                                </div>

                                <!-- Create New Tasks Tab -->
                                <div id="createTasksTab" class="goals-task-tab-content" style="display: none;">
                                    <div class="goals-quick-task-form">
                                        <div style="position: relative; flex: 1;">
                                            <input type="text" id="quickTaskTitle" class="goals-form-input-v2" placeholder="Task title..." maxlength="50">
                                            <span class="goals-input-hint" id="quickTaskCounter" style="position: absolute; bottom: -1.5rem; left: 0; font-size: 0.75rem;">0/50 characters remaining</span>
                                        </div>
                                        <input type="date" id="quickTaskDate" class="goals-form-input-v2">
                                        <button type="button" class="goals-btn-secondary goals-btn-add-task" data-action="add-quick-task">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                                            </svg>
                                            Add Task
                                        </button>
                                    </div>
                                    <div id="newTasksList" class="goals-new-tasks-list" style="margin-top: 1.5rem;">
                                        <!-- New tasks will be added here -->
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- AUTO & MANUAL GOAL SHARED FIELDS -->
                        <div id="autoManualFields" class="goals-conditional-fields">
                            <div class="goals-form-row-v2">
                                <div class="goals-form-group-v2">
                                    <label class="goals-form-label-v2">Target Value</label>
                                    <input type="text" id="goalTarget" class="goals-form-input-v2"
                                           placeholder="10000">
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

                            <label class="goals-checkbox-v2">
                                <input type="checkbox" id="goalRecurring">
                                <span class="goals-checkbox-label">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.125rem; height: 1.125rem; display: inline-block; vertical-align: middle; margin-right: 0.375rem;">
                                        <polyline points="23 4 23 10 17 10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    Recurring goal (resets after period ends)
                                </span>
                            </label>
                        </div>

                        <!-- Hidden date inputs -->
                        <div class="goals-date-inputs-hidden">
                            <input type="date" id="goalStartDate">
                            <input type="date" id="goalEndDate">
                        </div>

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
                const success = await this.goals_createGoal();
                if (success !== false) {
                    modal.remove();
                } else {
                    // Re-enable button on validation failure
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalHTML;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                }
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

        // Determine goal type
        const isTaskList = goal.goal_type === 'task_list';

        // For task list goals, load linked tasks
        if (isTaskList) {
            const linkedTasks = await API.getGoalTasks(goalId);
            this.state.selectedTaskIds = linkedTasks.map(t => t.id);
        }

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
                        <!-- TITLE -->
                        <div class="goals-form-group-v2">
                            <input type="text" id="goalTitle" class="goals-form-input-v2 goals-form-input-large"
                                   placeholder="Q4 Revenue Target" autocomplete="off" value="${API.escapeHtml(goal.title)}">
                            <span class="goals-input-hint" id="titleCounter">35 characters remaining</span>
                        </div>

                        <div class="goals-divider"></div>

                        <!-- LOCKED GOAL TYPE INDICATOR -->
                        <div class="goals-form-group-v2">
                            <label class="goals-form-label-v2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.125rem; height: 1.125rem; display: inline-block; vertical-align: middle; margin-right: 0.5rem;">
                                    <line x1="12" y1="1" x2="12" y2="23" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Goal Type (Cannot be changed)
                            </label>
                            <div style="padding: 0.75rem; background: var(--background); border: 1px solid var(--border); border-radius: var(--radius); display: flex; align-items: center; gap: 0.75rem;">
                                ${isTaskList ? `
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.25rem; height: 1.25rem;">
                                        <path d="M9 11l3 3L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <div>
                                        <div style="font-weight: 600; color: var(--text-primary);">Task Checklist</div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Complete tasks to track progress</div>
                                    </div>
                                ` : `
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.25rem; height: 1.25rem;">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                                    </svg>
                                    <div>
                                        <div style="font-weight: 600; color: var(--text-primary);">Manual</div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Update progress yourself</div>
                                    </div>
                                `}
                            </div>
                            <input type="hidden" name="tracking" value="${isTaskList ? 'task_list' : 'manual'}">
                        </div>

                        ${isTaskList ? `
                            <!-- TASK CHECKLIST EDIT FIELDS -->
                            <div id="taskChecklistFields">
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

                                <!-- Task Management -->
                                <div class="goals-task-checklist-config">
                                    <div class="goals-task-selected-count" style="margin-bottom: 1rem; text-align: center; padding: 0.75rem; background: var(--background); border-radius: var(--radius); border: 1px solid var(--border);">
                                        <span id="taskCombinedCount" style="font-weight: 700; font-size: 0.875rem;">${this.state.selectedTaskIds.length} / 30 tasks</span>
                                    </div>

                                    <div class="goals-task-tabs">
                                        <button type="button" class="goals-task-tab active" data-tab="existing">
                                            Add More Tasks
                                        </button>
                                        <button type="button" class="goals-task-tab" data-tab="create">
                                            Create New
                                        </button>
                                    </div>

                                    <!-- Existing Tasks Tab -->
                                    <div id="existingTasksTab" class="goals-task-tab-content">
                                        <div style="margin-bottom: 1rem;">
                                            <div style="position: relative;">
                                                <input type="text" id="taskSearchInput" class="goals-form-input-v2" placeholder="Search tasks..." style="padding-left: 2.5rem;">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); width: 1.125rem; height: 1.125rem; color: var(--text-tertiary); pointer-events: none;">
                                                    <circle cx="11" cy="11" r="8" stroke-width="2"/>
                                                    <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                                                </svg>
                                            </div>
                                        </div>

                                        <div class="goals-task-list" id="tasksList">
                                            ${this.state.availableTasks.length > 0 ? `
                                                ${this.state.availableTasks.map(task => {
                                                    const isLinked = this.state.selectedTaskIds.includes(task.id);
                                                    return `
                                                        <label class="goals-task-checkbox" data-task-title="${API.escapeHtml(task.title).toLowerCase()}">
                                                            <input type="checkbox" value="${task.id}" data-task-select ${isLinked ? 'checked' : ''}>
                                                            <div class="goals-task-item">
                                                                <div class="goals-task-item-content">
                                                                    <span class="goals-task-item-title">${API.escapeHtml(task.title)}</span>
                                                                    ${task.due_date ? `
                                                                        <span class="goals-task-item-date">
                                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                                                                                <line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/>
                                                                                <line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/>
                                                                                <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
                                                                            </svg>
                                                                            ${window.SteadyUtils.formatDate(task.due_date, 'short')}
                                                                        </span>
                                                                    ` : ''}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    `;
                                                }).join('')}
                                            ` : `
                                                <div class="goals-task-empty">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <circle cx="12" cy="12" r="10" stroke-width="2"/>
                                                        <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
                                                    </svg>
                                                    <p>No pending tasks available</p>
                                                    <p class="goals-task-empty-hint">Create tasks in the Scheduling module first</p>
                                                </div>
                                            `}
                                        </div>
                                    </div>

                                    <!-- Create New Tasks Tab -->
                                    <div id="createTasksTab" class="goals-task-tab-content" style="display: none;">
                                        <div class="goals-quick-task-form">
                                            <div style="position: relative; flex: 1;">
                                                <input type="text" id="quickTaskTitle" class="goals-form-input-v2" placeholder="Task title..." maxlength="50">
                                                <span class="goals-input-hint" id="quickTaskCounter" style="position: absolute; bottom: -1.5rem; left: 0; font-size: 0.75rem;">0/50 characters remaining</span>
                                            </div>
                                            <input type="date" id="quickTaskDate" class="goals-form-input-v2">
                                            <button type="button" class="goals-btn-secondary goals-btn-add-task" data-action="add-quick-task">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                                                </svg>
                                                Add Task
                                            </button>
                                        </div>
                                        <div id="newTasksList" class="goals-new-tasks-list" style="margin-top: 1.5rem;">
                                            <!-- New tasks will be added here -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <!-- AUTO & MANUAL GOAL EDIT FIELDS -->
                            <div id="autoManualFields">
                                <div class="goals-form-row-v2">
                                    <div class="goals-form-group-v2">
                                        <label class="goals-form-label-v2">Target Value</label>
                                        <input type="text" id="goalTarget" class="goals-form-input-v2"
                                               placeholder="10000" value="${goal.target_value}">
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

                                <label class="goals-checkbox-v2">
                                    <input type="checkbox" id="goalRecurring" ${goal.is_recurring ? 'checked' : ''}>
                                    <span class="goals-checkbox-label">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 1.125rem; height: 1.125rem; display: inline-block; vertical-align: middle; margin-right: 0.375rem;">
                                            <polyline points="23 4 23 10 17 10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        Recurring goal (resets after period ends)
                                    </span>
                                </label>
                            </div>
                        `}

                        <!-- Hidden date inputs -->
                        <div class="goals-date-inputs-hidden">
                            <input type="date" id="goalStartDate" value="${goal.start_date}">
                            <input type="date" id="goalEndDate" value="${goal.end_date}">
                        </div>

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

        // Only setup if elements exist (may not be present for certain goal types)
        if (targetInput && targetCounter) {
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
        }

        // Description counter - only setup if elements exist (may not be present for task_list goals)
        const descriptionInput = document.getElementById('goalDescription');
        const descriptionCounter = document.getElementById('descriptionCounter');

        if (descriptionInput && descriptionCounter) {
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
        }

        // Custom unit input toggle and counter
        const unitSelect = document.getElementById('goalUnit');
        const customUnitContainer = document.getElementById('customUnitInput');
        const customUnitInput = document.getElementById('goalCustomUnit');
        const customUnitCounter = document.getElementById('customUnitCounter');

        // Only setup if elements exist (may not be present for certain goal types)
        if (unitSelect && customUnitInput && customUnitCounter) {
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
        }

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
        const taskChecklistFields = document.getElementById('taskChecklistFields');
        const autoManualFields = document.getElementById('autoManualFields');

        // Show/hide based on selection
        if (e.target.value === 'task_list') {
            // Show task checklist fields, hide manual fields
            if (taskChecklistFields) taskChecklistFields.style.display = 'block';
            if (autoManualFields) autoManualFields.style.display = 'none';
        } else {
            // Manual - show manual fields, hide task checklist
            if (taskChecklistFields) taskChecklistFields.style.display = 'none';
            if (autoManualFields) autoManualFields.style.display = 'block';
        }
    });
});

        // Task Checklist: Track selected tasks
modal.querySelectorAll('[data-task-select]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const newTasksCount = this.state.newTasks?.length || 0;
        const selectedCount = this.state.selectedTaskIds.length;
        const totalCount = selectedCount + newTasksCount;

        if (e.target.checked) {
            // Check 30 task limit before allowing selection
            if (totalCount >= 30) {
                e.target.checked = false;
                window.SteadyUtils.showToast('Maximum 30 tasks allowed', 'error');
                return;
            }
            this.state.selectedTaskIds.push(e.target.value);
        } else {
            this.state.selectedTaskIds = this.state.selectedTaskIds.filter(id => id !== e.target.value);
        }

        // Update counter with combined total
        this.goals_updateTaskCounters(modal);
    });
});

// Task Checklist: Tab switching
modal.querySelectorAll('.goals-task-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        
        // Update active tab
        modal.querySelectorAll('.goals-task-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // Show/hide tab content
        if (targetTab === 'existing') {
            modal.querySelector('#existingTasksTab').style.display = 'block';
            modal.querySelector('#createTasksTab').style.display = 'none';
        } else {
            modal.querySelector('#existingTasksTab').style.display = 'none';
            modal.querySelector('#createTasksTab').style.display = 'block';
        }
    });
});

// Task Checklist: Smart search for existing tasks
const taskSearchInput = modal.querySelector('#taskSearchInput');
if (taskSearchInput) {
    taskSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const taskCheckboxes = modal.querySelectorAll('.goals-task-checkbox');

        taskCheckboxes.forEach(checkbox => {
            const taskTitle = checkbox.getAttribute('data-task-title') || '';
            if (taskTitle.includes(searchTerm)) {
                checkbox.style.display = '';
            } else {
                checkbox.style.display = 'none';
            }
        });

        // Show "no results" message if all hidden
        const visibleTasks = Array.from(taskCheckboxes).filter(cb => cb.style.display !== 'none');
        const tasksList = modal.querySelector('#tasksList');
        let noResultsMsg = modal.querySelector('#noSearchResults');

        if (visibleTasks.length === 0 && searchTerm) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.id = 'noSearchResults';
                noResultsMsg.className = 'goals-task-empty';
                noResultsMsg.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8" stroke-width="2"/>
                        <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p>No tasks found matching "${API.escapeHtml(searchTerm)}"</p>
                `;
                tasksList.appendChild(noResultsMsg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    });
}

// Task Checklist: Character counter for quick task title
const quickTaskInput = modal.querySelector('#quickTaskTitle');
const quickTaskCounter = modal.querySelector('#quickTaskCounter');
if (quickTaskInput && quickTaskCounter) {
    quickTaskInput.addEventListener('input', (e) => {
        const length = e.target.value.length;
        quickTaskCounter.textContent = `${length}/50 characters remaining`;
        quickTaskCounter.style.color = length >= 45 ? 'var(--warning)' : 'var(--text-tertiary)';
    });
}

// Task Checklist: Add quick task
modal.querySelector('[data-action="add-quick-task"]')?.addEventListener('click', () => {
    const titleInput = modal.querySelector('#quickTaskTitle');
    const dateInput = modal.querySelector('#quickTaskDate');
    const title = titleInput.value.trim();

    if (!title) {
        window.SteadyUtils.showToast('Enter a task title', 'error');
        return;
    }

    // Check 30 task limit
    const newTasksCount = this.state.newTasks?.length || 0;
    const selectedCount = this.state.selectedTaskIds?.length || 0;
    const totalCount = selectedCount + newTasksCount;

    if (totalCount >= 30) {
        window.SteadyUtils.showToast('Maximum 30 tasks allowed', 'error');
        return;
    }

    // Add to new tasks list
    const newTasksList = modal.querySelector('#newTasksList');
    const taskId = 'new_' + Date.now(); // Temporary ID

    const taskHTML = `
        <div class="goals-new-task-item" data-temp-id="${taskId}">
            <div class="goals-new-task-content">
                <span class="goals-new-task-title">${API.escapeHtml(title)}</span>
                ${dateInput.value ? `
                    <span class="goals-new-task-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                            <line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/>
                            <line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/>
                            <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
                        </svg>
                        ${window.SteadyUtils.formatDate(dateInput.value, 'short')}
                    </span>
                ` : ''}
            </div>
            <button type="button" class="goals-new-task-remove" data-action="remove-new-task" data-temp-id="${taskId}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `;

    newTasksList.insertAdjacentHTML('beforeend', taskHTML);

    // Store task data
    if (!this.state.newTasks) this.state.newTasks = [];
    this.state.newTasks.push({
        tempId: taskId,
        title: title,
        due_date: dateInput.value || null
    });

    // Clear inputs
    titleInput.value = '';
    dateInput.value = '';
    quickTaskCounter.textContent = '0/50 characters remaining';
    quickTaskCounter.style.color = 'var(--text-tertiary)';

    // Update counters
    this.goals_updateTaskCounters(modal);

    // Setup remove button
    modal.querySelector(`[data-temp-id="${taskId}"] [data-action="remove-new-task"]`).addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.tempId;
        modal.querySelector(`[data-temp-id="${id}"]`).remove();
        this.state.newTasks = this.state.newTasks.filter(t => t.tempId !== id);
        this.goals_updateTaskCounters(modal);
    });
});
    },

    // Helper: Update combined task counter in modal
    goals_updateTaskCounters(modal) {
        const selectedCount = this.state.selectedTaskIds?.length || 0;
        const newTasksCount = this.state.newTasks?.length || 0;
        const totalCount = selectedCount + newTasksCount;

        // Update combined counter (shows across both tabs)
        const combinedCounter = modal.querySelector('#taskCombinedCount');
        if (combinedCounter) {
            combinedCounter.textContent = `${totalCount} / 30 tasks`;
            combinedCounter.style.color = totalCount >= 30 ? 'var(--danger)' : totalCount >= 25 ? 'var(--warning)' : 'var(--text-primary)';
        }
    },

    // MODALS - VIEW GOAL DETAIL
goals_showGoalDetailModal(goalId) {
    const goal = this.state.goals.find(g => g.id === goalId);
    if (!goal) return;

    // Always use the actual progress from current_value / target_value
    const progress = Math.floor(goal.progress || 0);
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
                            <div class="goals-detail-stat-value">${this.goals_formatValueAbbreviated(goal.current_value)}</div>
                        </div>
                        <div class="goals-detail-stat">
                            <div class="goals-detail-stat-label">Target</div>
                            <div class="goals-detail-stat-value">${this.goals_formatValueAbbreviated(goal.target_value)}</div>
                        </div>
                        <div class="goals-detail-stat">
                            <div class="goals-detail-stat-label">Remaining</div>
                            <div class="goals-detail-stat-value">${this.goals_formatValueAbbreviated(goal.remaining)}</div>
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
                            <span class="goals-badge-manual"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/></svg> ${goal.unit ? goal.unit.charAt(0).toUpperCase() + goal.unit.slice(1) : 'Manual entry'}</span>
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

                ${goal.goal_type === 'task_list' ? `
                    <div class="goals-detail-tasks">
                        <h3 class="goals-detail-section-title">Linked Tasks</h3>
                        <div class="goals-detail-tasks-list" id="goalDetailTasksList">
                            <div class="goals-loading-tasks">Loading tasks...</div>
                        </div>
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
                    ${goal.goal_type !== 'task_list' ? `
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

    // Load linked tasks if it's a task-list goal
    if (goal.goal_type === 'task_list') {
        this.goals_loadLinkedTasks(goalId, modal);
    }
},

    async goals_loadLinkedTasks(goalId, modal) {
    try {
        const tasks = await API.getGoalTasks(goalId);
        const tasksList = modal.querySelector('#goalDetailTasksList');
        
        if (!tasksList) return;
        
        if (tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="goals-task-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" stroke-width="2"/>
                        <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p>No tasks linked to this goal</p>
                </div>
            `;
            return;
        }
        
        tasksList.innerHTML = tasks.map(task => `
            <div class="goals-detail-task-item ${task.status === 'completed' ? 'completed' : ''}">
                <div class="goals-detail-task-check">
                    ${task.status === 'completed' ? `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2" stroke-linecap="round"/>
                            <polyline points="22 4 12 14.01 9 11.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    ` : `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke-width="2"/>
                        </svg>
                    `}
                </div>
                <div class="goals-detail-task-content">
                    <span class="goals-detail-task-title">${API.escapeHtml(task.title)}</span>
                    ${task.due_date ? `
                        <span class="goals-detail-task-date">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                                <line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/>
                                <line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/>
                                <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
                            </svg>
                            ${window.SteadyUtils.formatDate(task.due_date, 'short')}
                        </span>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Add info message about auto-updates
        const infoMessage = document.createElement('div');
        infoMessage.className = 'goals-task-info-message';
        infoMessage.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>Tasks completed in the Tasks module will automatically update this goal's progress</span>
        `;
        tasksList.appendChild(infoMessage);

    } catch (error) {
        const tasksList = modal.querySelector('#goalDetailTasksList');
        if (tasksList) {
            tasksList.innerHTML = `
                <div class="goals-task-empty">
                    <p>Failed to load tasks</p>
                </div>
            `;
        }
    }
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

                // Validate: cannot exceed target value
                if (newValue > goal.target_value) {
                    window.SteadyUtils.showToast(`Value cannot exceed target of ${this.goals_formatValue(goal.target_value, goal.unit)}`, 'error');
                    // Re-enable button
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalHTML;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                    return;
                }

                await this.goals_updateProgress(goalId, newValue);
                await API.checkGoalCompletion();
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
                await this.goals_smoothFilterChange('active');
                break;
            case 'filter-completed':
                await this.goals_smoothFilterChange('completed');
                break;
        }
    };

    // Search input handler - client-side filtering only
    const searchInput = container.querySelector('#goalsSearchInput');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const cards = container.querySelectorAll('.goals-card');
            const countBadge = container.querySelector('#goalsCount');

            if (!query) {
                // Show all cards
                cards.forEach(card => card.style.display = '');
                if (countBadge) countBadge.textContent = cards.length;
            } else {
                // Filter cards by title
                let visibleCount = 0;
                cards.forEach(card => {
                    const titleEl = card.querySelector('.goals-card-title');
                    const title = titleEl ? titleEl.textContent.toLowerCase() : '';

                    if (title.includes(query)) {
                        card.style.display = '';
                        visibleCount++;
                    } else {
                        card.style.display = 'none';
                    }
                });
                if (countBadge) countBadge.textContent = visibleCount;
            }
        };
    }
},

    async goals_createGoal() {
    try {
        const form = document.getElementById('goalForm');
        const activePeriod = document.querySelector('.goals-period-pill.active')?.dataset.period;
        const trackingMethod = document.querySelector('input[name="tracking"]:checked')?.value;

        const title = document.getElementById('goalTitle').value.trim();
        const description = document.getElementById('goalDescription').value.trim();
        const startDate = document.getElementById('goalStartDate').value;
        const endDate = document.getElementById('goalEndDate').value;
        const selectedColor = document.querySelector('input[name="color"]:checked')?.value;
        const isRecurring = document.getElementById('goalRecurring').checked || false;

        // Validation
        if (!title || title.length > 35) {
            const titleInput = document.getElementById('goalTitle');
            const titleCounter = document.querySelector('#titleCounter');

            // Add error styling
            titleInput.style.borderColor = 'var(--danger)';
            titleInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';

            // Update hint text to show error
            if (titleCounter) {
                titleCounter.textContent = !title ? 'Title is required' : 'Title must be 35 characters or less';
                titleCounter.style.color = 'var(--danger)';
                titleCounter.style.fontWeight = '600';
            }

            // Focus the input
            titleInput.focus();

            // Remove error styling when user types
            titleInput.addEventListener('input', function clearError() {
                titleInput.style.borderColor = '';
                titleInput.style.boxShadow = '';
                if (titleCounter) {
                    const remaining = 35 - titleInput.value.length;
                    titleCounter.textContent = `${remaining} characters remaining`;
                    titleCounter.style.color = remaining <= 5 ? 'var(--warning)' : 'var(--text-tertiary)';
                    titleCounter.style.fontWeight = '500';
                }
                titleInput.removeEventListener('input', clearError);
            }, { once: true });

            return false;
        }

        if (!activePeriod || !startDate || !endDate) {
            // Highlight period pills if no period selected
            if (!activePeriod) {
                const periodPills = document.querySelector('.goals-period-pills');
                if (periodPills) {
                    periodPills.style.border = '2px solid var(--danger)';
                    periodPills.style.borderRadius = 'var(--radius-lg)';
                    periodPills.style.padding = '0.5rem';

                    // Remove error styling when a period is selected
                    document.querySelectorAll('.goals-period-pill').forEach(pill => {
                        pill.addEventListener('click', function clearPeriodError() {
                            periodPills.style.border = '';
                            periodPills.style.borderRadius = '';
                            periodPills.style.padding = '';
                        }, { once: true });
                    });
                }
            }

            return false;
        }

        // Build goal data based on tracking method
        let goalData = {
            title: title,
            description: description || null,
            period: activePeriod,
            start_date: startDate,
            end_date: endDate,
            status: 'active',
            is_recurring: isRecurring,
            color: selectedColor || null
        };
        
        if (trackingMethod === 'task_list') {
            // Task Checklist Goal
            const totalTasks = this.state.selectedTaskIds.length + (this.state.newTasks?.length || 0);
            
            if (totalTasks === 0) {
                // Highlight the task checklist section
                const taskOptions = document.getElementById('taskChecklistOptions');
                if (taskOptions) {
                    taskOptions.style.border = '2px solid var(--danger)';
                    taskOptions.style.borderRadius = 'var(--radius-lg)';

                    // Switch to existing tasks tab if not already there
                    const existingTab = document.querySelector('[data-tab="existing"]');
                    if (existingTab) existingTab.click();

                    // Remove error styling when a task is selected or created
                    const clearTaskError = () => {
                        taskOptions.style.border = '';
                        taskOptions.style.borderRadius = '';
                    };

                    document.querySelectorAll('[data-task-select]').forEach(checkbox => {
                        checkbox.addEventListener('change', clearTaskError, { once: true });
                    });

                    const addTaskBtn = document.querySelector('[data-action="add-quick-task"]');
                    if (addTaskBtn) {
                        addTaskBtn.addEventListener('click', clearTaskError, { once: true });
                    }
                }

                return false;
            }
            
            goalData.goal_type = 'task_list';
            goalData.target_value = totalTasks;
            goalData.current_value = 0;
            goalData.unit = 'tasks';

        } else {
            // Manual Goal
            const targetValueStr = document.getElementById('goalTarget').value.trim();
            const targetValue = parseFloat(targetValueStr);

            if (!targetValueStr || isNaN(targetValue) || targetValue <= 0 || targetValue > 99999999.99) {
                const targetInput = document.getElementById('goalTarget');
                const targetCounter = document.querySelector('#targetCounter');

                // Add error styling
                targetInput.style.borderColor = 'var(--danger)';
                targetInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';

                // Update hint text
                if (targetCounter) {
                    targetCounter.textContent = !targetValueStr ? 'Target value is required' : targetValue > 99999999.99 ? 'Value too large' : 'Must be greater than 0';
                    targetCounter.style.color = 'var(--danger)';
                    targetCounter.style.fontWeight = '600';
                }

                targetInput.focus();

                // Remove error styling when user types
                targetInput.addEventListener('input', function clearError() {
                    targetInput.style.borderColor = '';
                    targetInput.style.boxShadow = '';
                    if (targetCounter) {
                        const length = targetInput.value.length;
                        targetCounter.textContent = `${8 - length} digits remaining`;
                        targetCounter.style.color = 'var(--text-tertiary)';
                        targetCounter.style.fontWeight = '500';
                    }
                }, { once: true });

                return false;
            }
            
            const unitSelect = document.getElementById('goalUnit').value;
            let unitValue = unitSelect;
            if (unitSelect === 'custom') {
                const customUnit = document.getElementById('goalCustomUnit').value.trim();
                if (!customUnit) {
                    const customUnitInput = document.getElementById('goalCustomUnit');
                    const customUnitCounter = document.querySelector('#customUnitCounter');

                    // Add error styling
                    customUnitInput.style.borderColor = 'var(--danger)';
                    customUnitInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';

                    // Update hint text
                    if (customUnitCounter) {
                        customUnitCounter.textContent = 'Custom unit name is required';
                        customUnitCounter.style.color = 'var(--danger)';
                        customUnitCounter.style.fontWeight = '600';
                    }

                    customUnitInput.focus();

                    // Remove error styling when user types
                    customUnitInput.addEventListener('input', function clearError() {
                        customUnitInput.style.borderColor = '';
                        customUnitInput.style.boxShadow = '';
                        if (customUnitCounter) {
                            const length = customUnitInput.value.length;
                            customUnitCounter.textContent = `${25 - length} characters remaining`;
                            customUnitCounter.style.color = 'var(--text-tertiary)';
                            customUnitCounter.style.fontWeight = '500';
                        }
                    }, { once: true });

                    return false;
                }
                unitValue = customUnit;
            }

            goalData.goal_type = 'custom';
            goalData.target_value = targetValue;
            goalData.current_value = 0;
            goalData.unit = unitValue;
        }

        // Create the goal
        const newGoal = await API.createGoal(goalData);

        // If task_list goal, link the tasks
        if (trackingMethod === 'task_list') {
            // Link existing tasks
            if (this.state.selectedTaskIds.length > 0) {
                await API.linkTasksToGoal(newGoal.id, this.state.selectedTaskIds);
            }

            // Create and link new tasks
            if (this.state.newTasks && this.state.newTasks.length > 0) {
                for (const taskData of this.state.newTasks) {
                    await API.createTaskForGoal(newGoal.id, {
                        title: taskData.title,
                        due_date: taskData.due_date,
                        status: 'pending'
                    });
                }
            }
        }

        // Reset state
        this.state.selectedTaskIds = [];
        this.state.newTasks = [];

        window.SteadyUtils.showToast('Goal created successfully!', 'success');
        await this.goals_loadData();
        this.goals_render();

    } catch (error) {
        let errorMsg = 'Failed to create goal';
        if (error.message?.includes('numeric field overflow')) {
            errorMsg = 'Target value is too large. Please use a smaller number.';
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

            // Get tracking method from hidden input (locked in edit mode)
            const trackingMethod = document.querySelector('input[name="tracking"]')?.value;

            const title = document.getElementById('goalTitle').value.trim();
            const selectedColor = document.querySelector('input[name="color"]:checked')?.value;

            if (!title || title.length > 35) {
                window.SteadyUtils.showToast('Invalid title (max 35 characters)', 'error');
                return false;
            }

            // Handle task_list goals differently
            if (trackingMethod === 'task_list') {
                // Update task links first - unlink unchecked tasks and link newly checked ones
                const goal = this.state.goals.find(g => g.id === goalId);
                const currentLinkedTasks = await API.getGoalTasks(goalId);
                const currentLinkedTaskIds = currentLinkedTasks.map(t => t.id);

                // Tasks to unlink (were linked before, but not selected now)
                const tasksToUnlink = currentLinkedTaskIds.filter(id => !this.state.selectedTaskIds.includes(id));

                // Tasks to link (newly selected)
                const tasksToLink = this.state.selectedTaskIds.filter(id => !currentLinkedTaskIds.includes(id));

                // Unlink tasks
                for (const taskId of tasksToUnlink) {
                    await API.unlinkTaskFromGoal(goalId, taskId);
                }

                // Link new tasks
                if (tasksToLink.length > 0) {
                    await API.linkTasksToGoal(goalId, tasksToLink);
                }

                // Create and link new tasks
                if (this.state.newTasks && this.state.newTasks.length > 0) {
                    for (const newTask of this.state.newTasks) {
                        // Remove tempId before sending to API (it's only for UI tracking)
                        const { tempId, ...taskData } = newTask;
                        await API.createTaskForGoal(goalId, taskData);
                    }
                }

                // After all task operations, get the updated task count and update target_value
                const updatedTasks = await API.getGoalTasks(goalId);
                const totalTasks = updatedTasks.length;

                // Get all form values including period, dates, description, and recurring
                const activePeriod = document.querySelector('.goals-period-pill.active')?.dataset.period;
                const startDate = document.getElementById('goalStartDate').value;
                const endDate = document.getElementById('goalEndDate').value;
                const description = document.getElementById('goalDescription').value.trim();
                const isRecurring = document.getElementById('goalRecurring')?.checked || false;

                // Update goal with all fields to preserve period and other settings
                const updates = {
                    title: title,
                    color: selectedColor || null,
                    target_value: totalTasks,  // Update target to reflect current total tasks
                    period: activePeriod,
                    start_date: startDate,
                    end_date: endDate,
                    description: description || null,
                    is_recurring: isRecurring
                };

                await API.updateGoal(goalId, updates);
                window.SteadyUtils.showToast('Goal updated successfully', 'success');

            } else {
                // For auto and manual goals
                const targetValueStr = document.getElementById('goalTarget').value.trim();
                const targetValue = parseFloat(targetValueStr);
                const startDate = document.getElementById('goalStartDate').value;
                const endDate = document.getElementById('goalEndDate').value;
                const activePeriod = document.querySelector('.goals-period-pill.active')?.dataset.period;
                const description = document.getElementById('goalDescription').value.trim();

                if (isNaN(targetValue) || targetValue <= 0 || targetValue > 99999999.99) {
                    window.SteadyUtils.showToast('Invalid target value (1-99,999,999.99)', 'error');
                    return false;
                }

                if (!activePeriod || !startDate || !endDate) {
                    window.SteadyUtils.showToast('Please fill in all required fields', 'error');
                    return false;
                }

                // Get unit value - use custom input if 'custom' is selected
                const unitSelect = document.getElementById('goalUnit').value;
                let unitValue = unitSelect;
                if (unitSelect === 'custom') {
                    const customUnit = document.getElementById('goalCustomUnit').value.trim();
                    if (!customUnit) {
                        const customUnitInput = document.getElementById('goalCustomUnit');
                        const customUnitCounter = document.querySelector('#customUnitCounter');

                        // Add error styling
                        customUnitInput.style.borderColor = 'var(--danger)';
                        customUnitInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';

                        // Update hint text
                        if (customUnitCounter) {
                            customUnitCounter.textContent = 'Custom unit name is required';
                            customUnitCounter.style.color = 'var(--danger)';
                            customUnitCounter.style.fontWeight = '600';
                        }

                        customUnitInput.focus();

                        // Remove error styling when user types
                        customUnitInput.addEventListener('input', function clearError() {
                            customUnitInput.style.borderColor = '';
                            customUnitInput.style.boxShadow = '';
                            if (customUnitCounter) {
                                const length = customUnitInput.value.length;
                                customUnitCounter.textContent = `${25 - length} characters remaining`;
                                customUnitCounter.style.color = 'var(--text-tertiary)';
                                customUnitCounter.style.fontWeight = '500';
                            }
                        }, { once: true });

                        window.SteadyUtils.showToast('Please enter a custom unit name', 'error');
                        return false;
                    }
                    unitValue = customUnit;
                }

                const updates = {
                    title: title,
                    description: description || null,
                    goal_type: 'custom',
                    target_value: targetValue,
                    unit: unitValue,
                    period: activePeriod,
                    start_date: startDate,
                    end_date: endDate,
                    is_recurring: document.getElementById('goalRecurring')?.checked || false,
                    color: selectedColor || null
                };

                await API.updateGoal(goalId, updates);
                window.SteadyUtils.showToast('Goal updated successfully', 'success');
            }

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
            const goal = this.state.goals.find(g => g.id === goalId);
            const wasCompleted = goal && goal.progress >= 100;
            const willBeCompleted = goal && (newValue / goal.target_value) * 100 >= 100;

            await API.updateGoalProgress(goalId, newValue);
            await API.checkGoalCompletion();

            await this.goals_loadData();

            // If we're moving from completed to active, switch to active tab
            if (wasCompleted && !willBeCompleted && this.state.currentFilter === 'completed') {
                this.state.currentFilter = 'active';
            }

            this.goals_render();

        } catch (error) {
            window.SteadyUtils.showToast('Failed to update progress', 'error');
        }
    },

    // API ACTIONS - DELETE
    async goals_deleteGoal(goalId) {
        try {
            await API.deleteGoal(goalId);

            await this.goals_loadData();
            this.goals_render();

        } catch (error) {
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
    
    // Round to 2 decimals max, strip trailing zeros
    const rounded = Math.round(value * 100) / 100;
    
    // Format number with commas, keep decimals if they exist
    const formatted = rounded.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
    
    // Return with unit
    if (unit === 'dollars') return `$${formatted}`;
    if (unit === 'hours') return `${formatted}h`;
    return unit ? `${formatted} ${unit}` : formatted;
},

goals_formatValueAbbreviated(value, unit) {
    if (!value) return '0';
    
    // Round to 2 decimals first
    value = Math.round(value * 100) / 100;
    
    // Abbreviate based on size
    let abbrev;
    if (value >= 1000000000) {
        abbrev = (value / 1000000000).toFixed(2).replace(/\.?0+$/, '') + 'B';
    } else if (value >= 1000000) {
        abbrev = (value / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    } else if (value >= 1000) {
        abbrev = (value / 1000).toFixed(2).replace(/\.?0+$/, '') + 'K';
    } else {
        abbrev = value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
    }
    
    // Return with unit
    if (unit === 'dollars') return `$${abbrev}`;
    if (unit === 'hours') return `${abbrev}h`;
    return unit ? `${abbrev} ${unit}` : abbrev;
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
    background: var(--background);
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
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}

.goals-section-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
}

.goals-search-container {
    position: relative;
    flex: 1;
    min-width: 200px;
}

.goals-search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.125rem;
    height: 1.125rem;
    stroke: var(--text-tertiary);
    pointer-events: none;
}

.goals-search-input {
    width: 100%;
    padding: 0.625rem 1rem 0.625rem 2.75rem;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text-primary);
    font-size: 0.9375rem;
    transition: all 0.2s ease;
}

.goals-search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.goals-search-input::placeholder {
    color: var(--text-tertiary);
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
    opacity: 1;
}

.goals-card.goals-card-completed::before {
    background: linear-gradient(90deg, var(--success), #059669);
}

.goals-card.goals-card-completed .goals-card-title {
    color: var(--text-secondary);
}

.goals-card.goals-card-at-risk::before {
    background: linear-gradient(90deg, var(--warning), var(--danger));
}

/* TASK CHECKLIST STYLES */

.goals-tracking-options-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
}

.goals-task-checklist-config {
    margin-top: 1rem;
    animation: goalsSlideDown 0.3s ease;
}

.goals-task-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--border);
}

.goals-task-tab {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: -2px;
}

.goals-task-tab:hover {
    color: var(--text-primary);
}

.goals-task-tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
}

.goals-task-tab-content {
    animation: goalsSlideDown 0.3s ease;
}

.goals-task-list {
    max-height: 300px;
    overflow-y: auto;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 0.5rem;
}

.goals-task-checkbox {
    display: block;
    cursor: pointer;
    margin-bottom: 0.5rem;
}

.goals-task-checkbox input {
    display: none;
}

.goals-task-item {
    padding: 1rem;
    background: var(--background);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    transition: all 0.2s ease;
}

.goals-task-checkbox:hover .goals-task-item {
    border-color: var(--primary);
}

.goals-task-checkbox input:checked + .goals-task-item {
    border-color: var(--primary);
    border-width: 3px;
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.goals-task-item-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.goals-task-item-title {
    font-weight: 600;
    color: var(--text-primary);
}

.goals-task-item-date {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

.goals-task-item-date svg {
    width: 0.875rem;
    height: 0.875rem;
    stroke-width: 2;
}

.goals-task-selected-count {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.3);
    border-radius: var(--radius);
    text-align: center;
    font-weight: 700;
    color: var(--primary);
}

.goals-task-empty {
    text-align: center;
    padding: 3rem 2rem;
    color: var(--text-secondary);
}

.goals-task-empty svg {
    width: 3rem;
    height: 3rem;
    stroke: var(--text-tertiary);
    stroke-width: 2;
    margin-bottom: 1rem;
}

.goals-task-empty p {
    margin: 0.5rem 0;
}

.goals-task-empty-hint {
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

.goals-quick-task-form {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.goals-btn-add-task {
    white-space: nowrap;
}

.goals-new-tasks-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
}

.goals-new-task-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(16, 185, 129, 0.05);
    border: 2px solid rgba(16, 185, 129, 0.2);
    border-radius: var(--radius);
}

.goals-new-task-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.goals-new-task-title {
    font-weight: 600;
    color: var(--text-primary);
}

.goals-new-task-date {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

.goals-new-task-date svg {
    width: 0.875rem;
    height: 0.875rem;
    stroke-width: 2;
}

.goals-new-task-remove {
    width: 2rem;
    height: 2rem;
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

.goals-new-task-remove svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke: var(--text-tertiary);
    stroke-width: 2;
}

.goals-new-task-remove:hover {
    background: var(--danger);
}

.goals-new-task-remove:hover svg {
    stroke: white;
}

.goals-detail-tasks {
    margin-bottom: 2rem;
}

.goals-detail-tasks-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.goals-loading-tasks {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
}

.goals-task-info-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    margin-top: 1rem;
    background: rgba(102, 126, 234, 0.05);
    border: 2px solid rgba(102, 126, 234, 0.2);
    border-radius: var(--radius);
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.goals-task-info-message svg {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    stroke: var(--primary);
}

.goals-detail-task-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--background);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    transition: all 0.2s ease;
}

.goals-detail-task-item.completed {
    opacity: 0.6;
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.2);
}

.goals-detail-task-check {
    flex-shrink: 0;
}

.goals-detail-task-check svg {
    width: 1.5rem;
    height: 1.5rem;
    stroke: var(--text-tertiary);
    stroke-width: 2;
}

.goals-detail-task-item.completed .goals-detail-task-check svg {
    stroke: var(--success);
}

.goals-detail-task-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.goals-detail-task-title {
    font-weight: 600;
    color: var(--text-primary);
}

.goals-detail-task-item.completed .goals-detail-task-title {
    text-decoration: line-through;
}

.goals-detail-task-date {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

.goals-detail-task-date svg {
    width: 0.875rem;
    height: 0.875rem;
    stroke-width: 2;
}

@media (max-width: 768px) {
    .goals-tracking-options-grid {
        grid-template-columns: 1fr;
    }
    
    .goals-quick-task-form {
        grid-template-columns: 1fr;
    }
}

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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

/* Add extra vertical spacing for auto/manual goal fields */
.goals-conditional-fields {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.goals-conditional-fields .goals-form-group-v2 {
    margin-bottom: 0.5rem;
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
    background: var(--background);
    color: var(--text-primary);
    transition: all 0.2s ease;
    font-weight: 500;
}

.goals-form-input-v2:focus, .goals-form-select-v2:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    background: var(--background) !important;
}

/* Ensure autocomplete doesn't change background */
.goals-form-input-v2:-webkit-autofill,
.goals-form-input-v2:-webkit-autofill:hover,
.goals-form-input-v2:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px var(--background) inset !important;
    -webkit-text-fill-color: var(--text-primary) !important;
    transition: background-color 5000s ease-in-out 0s;
}

.goals-form-textarea-v2 {
    width: 100%;
    padding: 1rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 1rem;
    background: var(--background);
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
    background: var(--background);
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
    background: var(--background);
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

#goalUnit {
    padding: 1rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 1rem;
    background: var(--background);
    color: var(--text-primary);
    transition: all 0.2s ease;
    font-weight: 600;
    cursor: pointer;
    
    /* Custom arrow */
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1.25rem;
    padding-right: 3rem;
}

#goalUnit:hover {
    border-color: var(--primary);
}

#goalUnit:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.goals-card-completions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--success);
    margin-top: 0.75rem;
}

.goals-card-completions svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 2;
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
    background: var(--background);
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
}

.goals-tracking-radio input:checked + .goals-tracking-card svg {
    stroke: var(--primary);
}

.goals-tracking-radio input:checked + .goals-tracking-card .goals-tracking-title {
    color: var(--primary);
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
    position: relative;
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
    background: var(--background);
    color: var(--text-primary);
    transition: all 0.2s ease;
}

.goals-form-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
}