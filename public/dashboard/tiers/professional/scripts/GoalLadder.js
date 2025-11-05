/**
 * GOAL LADDER MODULE
 * Visual goal decomposition with task dependency mapping
 * 
 * Features:
 * - Loading screen with smooth animation
 * - Overview grid (Apple Watch style progress cards)
 * - 3-step wizard (Goal → Tasks → Review)
 * - SVG ladder visualization (zoom/pan/drag)
 * - Auto-completion when all tasks done
 * - Theme-aware (light/dark)
 * - Max 50 tasks per ladder
 * 
 * Architecture:
 * - Separate full-screen overlay system
 * - 3 views: overview, wizard, ladder-view
 * - Self-contained with embedded CSS
 * - Uses API.js for all data operations
 */

window.GoalLadderModule = {
    // =====================================================
    // STATE MANAGEMENT
    // =====================================================
    
    state: {
        mode: 'overview', // 'overview', 'wizard', 'ladder-view'
        wizardStep: 1, // 1=select/create goal, 2=add tasks, 3=review
        
        // Wizard data
        selectedGoal: null, // Goal object or null if creating new
        isCreatingNewGoal: false,
        newGoalData: {}, // Temporary storage for new goal being created
        
        // Task selection
        selectedTaskIds: [], // IDs of existing tasks selected
        newTasks: [], // Array of new tasks created on the fly
        availableTasks: [], // User's existing tasks not linked to goals
        
        // Ladder view
        currentLadder: null, // Full ladder object with goal + tasks
        
        // Data
        allGoals: [], // All user goals
        ladders: [], // All goal ladders
        
        // UI
        container: null,
        svgZoom: 1,
        svgPanX: 0,
        svgPanY: 0,
    },

    // =====================================================
    // INIT & DATA LOADING
    // =====================================================
    
    async init() {
        console.log('🪜 Goal Ladder initializing...');
        
        try {
            this.showLoadingScreen();
            await this.loadData();
            
            setTimeout(() => {
                this.showOverview();
            }, 1000);
            
        } catch (error) {
            console.error('Goal Ladder init error:', error);
            this.showError('Failed to load Goal Ladders');
        }
    },

    async loadData() {
        try {
            // Get all goals
            this.state.allGoals = await API.getGoals();
            
            // Get goal ladders
            this.state.ladders = await API.getAllGoalLadders();
            
            // Get all tasks not linked to any goal
            const allTasks = await API.getTasks();
            this.state.availableTasks = allTasks.filter(t => !t.goal_id);
            
            console.log('✅ Goal Ladder data loaded:', {
                totalGoals: this.state.allGoals.length,
                ladders: this.state.ladders.length,
                availableTasks: this.state.availableTasks.length
            });
            
        } catch (error) {
            console.error('Failed to load data:', error);
            throw error;
        }
    },

    // =====================================================
    // LOADING SCREEN
    // =====================================================
    
    showLoadingScreen() {
        const overlay = document.createElement('div');
        overlay.className = 'goal-ladder-overlay';
        overlay.innerHTML = `
            ${this.renderStyles()}
            <div class="goal-ladder-loading">
                <svg class="ladder-loading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 4v16M18 4v16M6 9h12M6 15h12" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h2>Loading Goal Ladders...</h2>
                <div class="ladder-loading-bar">
                    <div class="ladder-loading-fill"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.state.container = overlay;
    },

    // =====================================================
    // VIEW 1: OVERVIEW GRID
    // =====================================================
    
    async showOverview() {
        this.state.mode = 'overview';
        
        const html = `
            ${this.renderStyles()}
            <div class="goal-ladder-container">
                <div class="goal-ladder-header">
                    <div class="goal-ladder-header-content">
                        <h1 class="goal-ladder-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M6 4v16M18 4v16M6 9h12M6 15h12" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Goal Ladders
                        </h1>
                        <p class="goal-ladder-subtitle">Break down big goals into achievable tasks</p>
                    </div>
                    <div class="goal-ladder-header-actions">
                        <button class="ladder-btn-primary" data-action="create-ladder">
                            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/></svg>
                            New Ladder
                        </button>
                        <button class="ladder-btn-close" data-action="close">
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/></svg>
                        </button>
                    </div>
                </div>

                ${this.state.ladders.length > 0 ? this.renderLadderGrid() : this.renderEmptyState()}
            </div>
        `;

        this.state.container.innerHTML = html;
        this.attachOverviewEvents();
    },

    renderLadderGrid() {
        return `
            <div class="ladder-grid">
                ${this.state.ladders.slice(0, 10).map(ladder => this.renderLadderCard(ladder)).join('')}
            </div>
        `;
    },

    renderLadderCard(ladder) {
        const progress = ladder.taskCount > 0 
            ? Math.round((ladder.completedCount / ladder.taskCount) * 100) 
            : 0;
        
        const circumference = 2 * Math.PI * 54; // radius = 54
        const offset = circumference - (progress / 100) * circumference;

        const daysRemaining = API.calculateDaysUntil(ladder.end_date);
        const isOverdue = daysRemaining < 0;
        const isUrgent = daysRemaining >= 0 && daysRemaining < 7;

        return `
            <div class="ladder-card" data-action="view-ladder" data-id="${ladder.id}">
                <div class="ladder-card-ring">
                    <svg viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" stroke-width="8"/>
                        <circle cx="60" cy="60" r="54" fill="none" stroke="${ladder.color || 'var(--primary)'}" stroke-width="8" 
                                stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${offset}"
                                transform="rotate(-90 60 60)"
                                stroke-linecap="round"
                                class="ladder-progress-ring"/>
                    </svg>
                    <div class="ladder-card-percentage">${progress}%</div>
                </div>

                <div class="ladder-card-content">
                    <h3 class="ladder-card-title">${API.escapeHtml(ladder.title)}</h3>
                    <div class="ladder-card-stats">
                        <span>${ladder.completedCount}/${ladder.taskCount} tasks</span>
                        <span class="ladder-card-dot">•</span>
                        <span class="${isOverdue ? 'ladder-overdue' : isUrgent ? 'ladder-urgent' : ''}">
                            ${isOverdue ? 'Overdue' : daysRemaining === 0 ? 'Today' : daysRemaining === 1 ? 'Tomorrow' : `${daysRemaining}d left`}
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    renderEmptyState() {
        return `
            <div class="ladder-empty">
                <svg class="ladder-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 4v16M18 4v16M6 9h12M6 15h12" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h3>No Goal Ladders Yet</h3>
                <p>Create your first ladder to break down a big goal into manageable tasks</p>
                <button class="ladder-btn-primary" data-action="create-ladder">
                    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-width="2"/></svg>
                    Create Your First Ladder
                </button>
            </div>
        `;
    },

    attachOverviewEvents() {
        const container = this.state.container;

        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            switch (action) {
                case 'create-ladder':
                    this.startWizard();
                    break;
                case 'view-ladder':
                    await this.showLadderView(id);
                    break;
                case 'close':
                    this.close();
                    break;
            }
        };

        // ESC to close
        document.addEventListener('keydown', this.handleEscape);
    },

    handleEscape(e) {
        if (e.key === 'Escape' && window.GoalLadderModule.state.container) {
            window.GoalLadderModule.close();
        }
    },

    close() {
        if (this.state.container) {
            this.state.container.remove();
            this.state.container = null;
        }
        document.removeEventListener('keydown', this.handleEscape);
        
        // Reset state
        this.state.mode = 'overview';
        this.state.wizardStep = 1;
        this.state.selectedGoal = null;
        this.state.isCreatingNewGoal = false;
        this.state.selectedTaskIds = [];
        this.state.newTasks = [];
    },

    // =====================================================
    // VIEW 2: WIZARD
    // =====================================================
    
    startWizard() {
        this.state.mode = 'wizard';
        this.state.wizardStep = 1;
        this.state.selectedGoal = null;
        this.state.isCreatingNewGoal = false;
        this.state.selectedTaskIds = [];
        this.state.newTasks = [];
        this.renderWizard();
    },

    renderWizard() {
        const html = `
            ${this.renderStyles()}
            <div class="goal-ladder-wizard">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="wizard-step ${this.state.wizardStep >= 1 ? 'active' : ''} ${this.state.wizardStep > 1 ? 'complete' : ''}">
                            <div class="wizard-step-number">1</div>
                            <div class="wizard-step-label">Select Goal</div>
                        </div>
                        <div class="wizard-step-line ${this.state.wizardStep > 1 ? 'complete' : ''}"></div>
                        <div class="wizard-step ${this.state.wizardStep >= 2 ? 'active' : ''} ${this.state.wizardStep > 2 ? 'complete' : ''}">
                            <div class="wizard-step-number">2</div>
                            <div class="wizard-step-label">Add Tasks</div>
                        </div>
                        <div class="wizard-step-line ${this.state.wizardStep > 2 ? 'complete' : ''}"></div>
                        <div class="wizard-step ${this.state.wizardStep >= 3 ? 'active' : ''}">
                            <div class="wizard-step-number">3</div>
                            <div class="wizard-step-label">Review</div>
                        </div>
                    </div>
                    <button class="ladder-btn-close" data-action="close-wizard">
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/></svg>
                    </button>
                </div>

                <div class="wizard-content">
                    ${this.renderWizardStep()}
                </div>
            </div>
        `;

        this.state.container.innerHTML = html;
        this.attachWizardEvents();
    },

    renderWizardStep() {
        switch (this.state.wizardStep) {
            case 1: return this.renderWizardStep1();
            case 2: return this.renderWizardStep2();
            case 3: return this.renderWizardStep3();
            default: return '';
        }
    },

    // WIZARD STEP 1: SELECT/CREATE GOAL
    renderWizardStep1() {
        const availableGoals = this.state.allGoals.filter(g => !g.is_ladder);

        return `
            <div class="wizard-step-container">
                <h2>Choose a Goal</h2>
                <p class="wizard-subtitle">Select an existing goal or create a new one</p>

                ${!this.state.isCreatingNewGoal ? `
                    <div class="wizard-goal-selection">
                        <label>Select Existing Goal</label>
                        <select id="goalSelect" class="wizard-select">
                            <option value="">-- Choose a goal --</option>
                            ${availableGoals.map(g => `
                                <option value="${g.id}">${API.escapeHtml(g.title)} (${g.period})</option>
                            `).join('')}
                        </select>

                        <div class="wizard-divider">
                            <span>or</span>
                        </div>

                        <button class="ladder-btn-secondary" data-action="toggle-new-goal">
                            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-width="2"/></svg>
                            Create New Goal
                        </button>
                    </div>
                ` : `
                    <div class="wizard-goal-form">
                        <button class="ladder-btn-text" data-action="toggle-new-goal">
                            ← Back to goal selection
                        </button>

                        <div class="wizard-form-group">
                            <label>Goal Title *</label>
                            <input type="text" id="newGoalTitle" placeholder="Launch Product v2.0" maxlength="35" required>
                            <span class="wizard-char-count" id="titleCount">35 characters remaining</span>
                        </div>

                        <div class="wizard-form-row">
                            <div class="wizard-form-group">
                                <label>Target Value *</label>
                                <input type="number" id="newGoalTarget" placeholder="10000" min="1" required>
                            </div>
                            <div class="wizard-form-group">
                                <label>Unit *</label>
                                <select id="newGoalUnit">
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

                        <div class="wizard-form-group" id="customUnitGroup" style="display: none;">
                            <label>Custom Unit Name</label>
                            <input type="text" id="newGoalCustomUnit" placeholder="Projects, Deals, etc..." maxlength="25">
                        </div>

                        <div class="wizard-form-group">
                            <label>Time Period *</label>
                            <div class="wizard-period-pills">
                                <button type="button" class="wizard-period-pill" data-period="weekly">Week</button>
                                <button type="button" class="wizard-period-pill active" data-period="monthly">Month</button>
                                <button type="button" class="wizard-period-pill" data-period="quarterly">Quarter</button>
                                <button type="button" class="wizard-period-pill" data-period="yearly">Year</button>
                            </div>
                        </div>

                        <input type="hidden" id="newGoalStartDate">
                        <input type="hidden" id="newGoalEndDate">
                    </div>
                `}

                <div class="wizard-actions">
                    <button class="ladder-btn-secondary" data-action="back-to-overview">Cancel</button>
                    <button class="ladder-btn-primary" data-action="wizard-next" id="step1Next">
                        Next: Add Tasks
                        <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke-width="2"/></svg>
                    </button>
                </div>
            </div>
        `;
    },

    // WIZARD STEP 2: ADD TASKS
    renderWizardStep2() {
        const totalSelected = this.state.selectedTaskIds.length + this.state.newTasks.length;
        const remaining = 50 - totalSelected;

        return `
            <div class="wizard-step-container">
                <h2>Add Tasks</h2>
                <p class="wizard-subtitle">Select existing tasks or create new ones (${totalSelected}/50 added)</p>

                <div class="wizard-task-selection">
                    <!-- Search existing tasks -->
                    <div class="wizard-section">
                        <h3>From Your Tasks</h3>
                        <input type="text" 
                               id="taskSearch" 
                               class="wizard-search" 
                               placeholder="Search tasks..."
                               ${remaining === 0 ? 'disabled' : ''}>

                        <div class="wizard-task-list" id="availableTaskList">
                            ${this.renderAvailableTasks()}
                        </div>
                    </div>

                    <div class="wizard-divider">
                        <span>or</span>
                    </div>

                    <!-- Create new task -->
                    <div class="wizard-section">
                        <h3>Create New Task</h3>
                        <div class="wizard-new-task-form">
                            <input type="text" 
                                   id="newTaskTitle" 
                                   placeholder="Task title..."
                                   maxlength="100"
                                   ${remaining === 0 ? 'disabled' : ''}>
                            <button class="ladder-btn-secondary" 
                                    data-action="add-new-task"
                                    ${remaining === 0 ? 'disabled' : ''}>
                                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-width="2"/></svg>
                                Add Task
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Selected tasks preview -->
                ${totalSelected > 0 ? `
                    <div class="wizard-selected-tasks">
                        <h3>Tasks Added to Ladder (${totalSelected})</h3>
                        <div class="wizard-selected-list">
                            ${this.renderSelectedTasks()}
                        </div>
                    </div>
                ` : ''}

                <div class="wizard-actions">
                    <button class="ladder-btn-secondary" data-action="wizard-back">
                        <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" stroke-width="2"/></svg>
                        Back
                    </button>
                    <button class="ladder-btn-primary" 
                            data-action="wizard-next"
                            ${totalSelected === 0 ? 'disabled' : ''}>
                        Next: Review
                        <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke-width="2"/></svg>
                    </button>
                </div>
            </div>
        `;
    },

    renderAvailableTasks() {
        const searchTerm = document.getElementById('taskSearch')?.value.toLowerCase() || '';
        const filtered = this.state.availableTasks.filter(t => 
            !this.state.selectedTaskIds.includes(t.id) &&
            (t.title.toLowerCase().includes(searchTerm) || 
             t.description?.toLowerCase().includes(searchTerm))
        );

        if (filtered.length === 0) {
            return '<p class="wizard-empty-text">No available tasks found</p>';
        }

        return filtered.slice(0, 20).map(task => `
            <div class="wizard-task-item">
                <label class="wizard-task-checkbox">
                    <input type="checkbox" 
                           data-task-id="${task.id}"
                           ${this.state.selectedTaskIds.includes(task.id) ? 'checked' : ''}>
                    <div class="wizard-task-info">
                        <div class="wizard-task-title">${API.escapeHtml(task.title)}</div>
                        ${task.due_date ? `<div class="wizard-task-meta">Due: ${API.formatDate(task.due_date)}</div>` : ''}
                    </div>
                </label>
            </div>
        `).join('');
    },

    renderSelectedTasks() {
        const html = [];

        // Existing tasks
        this.state.selectedTaskIds.forEach((taskId, index) => {
            const task = this.state.availableTasks.find(t => t.id === taskId);
            if (task) {
                html.push(`
                    <div class="wizard-selected-item">
                        <span class="wizard-selected-number">${index + 1}.</span>
                        <span class="wizard-selected-title">${API.escapeHtml(task.title)}</span>
                        <button class="wizard-remove-btn" data-action="remove-task" data-task-id="${taskId}">
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/></svg>
                        </button>
                    </div>
                `);
            }
        });

        // New tasks
        this.state.newTasks.forEach((task, index) => {
            const number = this.state.selectedTaskIds.length + index + 1;
            html.push(`
                <div class="wizard-selected-item wizard-selected-new">
                    <span class="wizard-selected-number">${number}.</span>
                    <span class="wizard-selected-title">${API.escapeHtml(task.title)}</span>
                    <span class="wizard-new-badge">New</span>
                    <button class="wizard-remove-btn" data-action="remove-new-task" data-index="${index}">
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/></svg>
                    </button>
                </div>
            `);
        });

        return html.join('');
    },

    // WIZARD STEP 3: REVIEW & CONFIRM
    renderWizardStep3() {
        const goal = this.state.selectedGoal || this.state.newGoalData;
        const totalTasks = this.state.selectedTaskIds.length + this.state.newTasks.length;

        return `
            <div class="wizard-step-container">
                <h2>Review Ladder</h2>
                <p class="wizard-subtitle">Check everything before creating your goal ladder</p>

                <!-- Goal summary -->
                <div class="wizard-review-section">
                    <h3>Goal</h3>
                    <div class="wizard-review-card">
                        <div class="wizard-review-title">${API.escapeHtml(goal.title)}</div>
                        <div class="wizard-review-meta">
                            Target: ${goal.target_value} ${goal.unit} • ${goal.period}
                        </div>
                    </div>
                </div>

                <!-- Tasks summary -->
                <div class="wizard-review-section">
                    <h3>Tasks (${totalTasks})</h3>
                    <div class="wizard-review-task-list">
                        ${this.renderReviewTasks()}
                    </div>
                </div>

                <div class="wizard-actions">
                    <button class="ladder-btn-secondary" data-action="wizard-back">
                        <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" stroke-width="2"/></svg>
                        Back
                    </button>
                    <button class="ladder-btn-primary" data-action="create-ladder" id="createLadderBtn">
                        <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="2"/></svg>
                        Create Ladder
                    </button>
                </div>
            </div>
        `;
    },

    renderReviewTasks() {
        const html = [];

        // Existing tasks
        this.state.selectedTaskIds.forEach((taskId, index) => {
            const task = this.state.availableTasks.find(t => t.id === taskId);
            if (task) {
                html.push(`
                    <div class="wizard-review-task">
                        <span class="wizard-review-task-number">${index + 1}.</span>
                        <div class="wizard-review-task-info">
                            <div class="wizard-review-task-title">${API.escapeHtml(task.title)}</div>
                            ${task.due_date ? `<div class="wizard-review-task-meta">Due: ${API.formatDate(task.due_date)}</div>` : ''}
                        </div>
                        <span class="wizard-review-task-status">○ Pending</span>
                    </div>
                `);
            }
        });

        // New tasks
        this.state.newTasks.forEach((task, index) => {
            const number = this.state.selectedTaskIds.length + index + 1;
            html.push(`
                <div class="wizard-review-task">
                    <span class="wizard-review-task-number">${number}.</span>
                    <div class="wizard-review-task-info">
                        <div class="wizard-review-task-title">${API.escapeHtml(task.title)}</div>
                        <span class="wizard-new-badge">New</span>
                    </div>
                    <span class="wizard-review-task-status">○ Pending</span>
                </div>
            `);
        });

        return html.join('');
    },

    attachWizardEvents() {
        const container = this.state.container;

        // Global click handler
        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;

            switch (action) {
                case 'close-wizard':
                    this.showOverview();
                    break;
                case 'back-to-overview':
                    this.showOverview();
                    break;
                case 'toggle-new-goal':
                    this.state.isCreatingNewGoal = !this.state.isCreatingNewGoal;
                    this.renderWizard();
                    if (this.state.isCreatingNewGoal) {
                        this.setupGoalFormEvents();
                    }
                    break;
                case 'wizard-next':
                    await this.wizardNext();
                    break;
                case 'wizard-back':
                    this.wizardBack();
                    break;
                case 'add-new-task':
                    this.addNewTask();
                    break;
                case 'remove-task':
                    this.removeTask(target.dataset.taskId);
                    break;
                case 'remove-new-task':
                    this.removeNewTask(parseInt(target.dataset.index));
                    break;
                case 'create-ladder':
                    await this.createLadder();
                    break;
            }
        };

        // Step-specific events
        if (this.state.wizardStep === 1) {
            this.setupStep1Events();
        } else if (this.state.wizardStep === 2) {
            this.setupStep2Events();
        }
    },

    setupStep1Events() {
        const goalSelect = document.getElementById('goalSelect');
        if (goalSelect) {
            goalSelect.onchange = (e) => {
                const goalId = e.target.value;
                if (goalId) {
                    this.state.selectedGoal = this.state.allGoals.find(g => g.id === goalId);
                } else {
                    this.state.selectedGoal = null;
                }
            };
        }

        if (this.state.isCreatingNewGoal) {
            this.setupGoalFormEvents();
        }
    },

    setupGoalFormEvents() {
        // Title character counter
        const titleInput = document.getElementById('newGoalTitle');
        const titleCount = document.getElementById('titleCount');
        if (titleInput && titleCount) {
            titleInput.oninput = () => {
                const remaining = 35 - titleInput.value.length;
                titleCount.textContent = `${remaining} characters remaining`;
            };
        }

        // Custom unit toggle
        const unitSelect = document.getElementById('newGoalUnit');
        const customUnitGroup = document.getElementById('customUnitGroup');
        if (unitSelect && customUnitGroup) {
            unitSelect.onchange = () => {
                customUnitGroup.style.display = unitSelect.value === 'custom' ? 'block' : 'none';
            };
        }

        // Period pills
        const pills = document.querySelectorAll('.wizard-period-pill');
        pills.forEach(pill => {
            pill.onclick = () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.calculateGoalDates(pill.dataset.period);
            };
        });

        // Set initial dates
        this.calculateGoalDates('monthly');
    },

    calculateGoalDates(period) {
        const startDate = new Date();
        const endDate = new Date(startDate);

        switch(period) {
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
        }

        const startInput = document.getElementById('newGoalStartDate');
        const endInput = document.getElementById('newGoalEndDate');
        if (startInput && endInput) {
            startInput.value = startDate.toISOString().split('T')[0];
            endInput.value = endDate.toISOString().split('T')[0];
        }
    },

    setupStep2Events() {
        // Task search
        const searchInput = document.getElementById('taskSearch');
        if (searchInput) {
            searchInput.oninput = () => {
                const listContainer = document.getElementById('availableTaskList');
                if (listContainer) {
                    listContainer.innerHTML = this.renderAvailableTasks();
                    this.attachTaskCheckboxEvents();
                }
            };
        }

        // Task checkboxes
        this.attachTaskCheckboxEvents();
    },

    attachTaskCheckboxEvents() {
        const checkboxes = document.querySelectorAll('[data-task-id]');
        checkboxes.forEach(checkbox => {
            checkbox.onchange = (e) => {
                const taskId = e.target.dataset.taskId;
                if (e.target.checked) {
                    if (!this.state.selectedTaskIds.includes(taskId)) {
                        const totalSelected = this.state.selectedTaskIds.length + this.state.newTasks.length;
                        if (totalSelected < 50) {
                            this.state.selectedTaskIds.push(taskId);
                            this.renderWizard();
                        } else {
                            e.target.checked = false;
                            window.SteadyUtils.showToast('Maximum 50 tasks per ladder', 'warning');
                        }
                    }
                } else {
                    this.state.selectedTaskIds = this.state.selectedTaskIds.filter(id => id !== taskId);
                    this.renderWizard();
                }
            };
        });
    },

    addNewTask() {
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

        this.state.newTasks.push({
            title: input.value.trim(),
            status: 'pending'
        });

        input.value = '';
        this.renderWizard();
    },

    removeTask(taskId) {
        this.state.selectedTaskIds = this.state.selectedTaskIds.filter(id => id !== taskId);
        this.renderWizard();
    },

    removeNewTask(index) {
        this.state.newTasks.splice(index, 1);
        this.renderWizard();
    },

    async wizardNext() {
        if (this.state.wizardStep === 1) {
            // Validate step 1
            if (this.state.isCreatingNewGoal) {
                if (!this.validateNewGoal()) return;
            } else {
                if (!this.state.selectedGoal) {
                    window.SteadyUtils.showToast('Please select a goal', 'error');
                    return;
                }
            }
            this.state.wizardStep = 2;
        } else if (this.state.wizardStep === 2) {
            // Validate step 2
            const totalSelected = this.state.selectedTaskIds.length + this.state.newTasks.length;
            if (totalSelected === 0) {
                window.SteadyUtils.showToast('Please add at least one task', 'error');
                return;
            }
            this.state.wizardStep = 3;
        }

        this.renderWizard();
    },

    wizardBack() {
        if (this.state.wizardStep > 1) {
            this.state.wizardStep--;
            this.renderWizard();
        }
    },

    validateNewGoal() {
        const title = document.getElementById('newGoalTitle')?.value.trim();
        const target = document.getElementById('newGoalTarget')?.value;
        const unit = document.getElementById('newGoalUnit')?.value;
        const customUnit = document.getElementById('newGoalCustomUnit')?.value.trim();
        const period = document.querySelector('.wizard-period-pill.active')?.dataset.period;
        const startDate = document.getElementById('newGoalStartDate')?.value;
        const endDate = document.getElementById('newGoalEndDate')?.value;

        if (!title || title.length > 35) {
            window.SteadyUtils.showToast('Invalid goal title (max 35 chars)', 'error');
            return false;
        }

        if (!target || parseFloat(target) <= 0) {
            window.SteadyUtils.showToast('Invalid target value', 'error');
            return false;
        }

        if (unit === 'custom' && !customUnit) {
            window.SteadyUtils.showToast('Please enter a custom unit name', 'error');
            return false;
        }

        if (!period || !startDate || !endDate) {
            window.SteadyUtils.showToast('Please fill in all required fields', 'error');
            return false;
        }

        // Store the new goal data
        this.state.newGoalData = {
            title,
            target_value: parseFloat(target),
            unit: unit === 'custom' ? customUnit : unit,
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

    async createLadder() {
        const btn = document.getElementById('createLadderBtn');
        if (!btn || btn.disabled) return;

        // Disable button
        btn.disabled = true;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `
            <svg class="wizard-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="2" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Creating...
        `;

        try {
            // Step 1: Create or use existing goal
            let goalId;
            if (this.state.isCreatingNewGoal) {
                const goal = await API.createGoal(this.state.newGoalData);
                goalId = goal.id;
            } else {
                goalId = this.state.selectedGoal.id;
                // Mark as ladder
                await API.updateGoal(goalId, { is_ladder: true });
            }

            // Step 2: Create new tasks
            for (const task of this.state.newTasks) {
                await API.createTaskForGoal(goalId, task);
            }

            // Step 3: Link existing tasks
            for (const taskId of this.state.selectedTaskIds) {
                await API.linkTaskToGoal(taskId, goalId);
            }

            window.SteadyUtils.showToast('Goal Ladder created!', 'success');

            // Reload data and show ladder view
            await this.loadData();
            await this.showLadderView(goalId);

        } catch (error) {
            console.error('Create ladder error:', error);
            window.SteadyUtils.showToast('Failed to create ladder', 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    },

    // =====================================================
    // VIEW 3: SINGLE LADDER VIEW
    // =====================================================
    
    async showLadderView(goalId) {
        this.state.mode = 'ladder-view';
        
        try {
            // Load full ladder data
            this.state.currentLadder = await API.getGoalLadder(goalId);
            
            const html = `
                ${this.renderStyles()}
                <div class="ladder-view-container">
                    <div class="ladder-view-header">
                        <button class="ladder-btn-back" data-action="back-to-overview">
                            <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" stroke-width="2"/></svg>
                            Back to Ladders
                        </button>
                        <div class="ladder-view-controls">
                            <button class="ladder-control-btn" data-action="zoom-fit" title="Fit to view">
                                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/></svg>
                            </button>
                            <button class="ladder-control-btn" data-action="zoom-out" title="Zoom out">
                                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2"/><path d="M5 11h12" stroke-width="2"/></svg>
                            </button>
                            <button class="ladder-control-btn" data-action="zoom-in" title="Zoom in">
                                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2"/><path d="M11 8v6M8 11h6" stroke-width="2"/></svg>
                            </button>
                            <button class="ladder-btn-close" data-action="close">
                                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/></svg>
                            </button>
                        </div>
                    </div>

                    <div class="ladder-view-content" id="ladderViewContent">
                        ${this.renderLadderSVG()}
                    </div>
                </div>
            `;

            this.state.container.innerHTML = html;
            this.attachLadderViewEvents();
            this.setupLadderPanning();

        } catch (error) {
            console.error('Show ladder view error:', error);
            window.SteadyUtils.showToast('Failed to load ladder', 'error');
            this.showOverview();
        }
    },

    renderLadderSVG() {
        const { goal, tasks, progress } = this.state.currentLadder;
        const taskCount = tasks.length;
        const taskHeight = 100;
        const taskSpacing = 40;
        const svgHeight = 200 + (taskCount * (taskHeight + taskSpacing));

        return `
            <svg class="ladder-svg" viewBox="0 0 800 ${svgHeight}" id="ladderSvg">
                <!-- Goal card at top -->
                <g class="ladder-goal-card" transform="translate(250, 20)">
                    <rect width="300" height="120" rx="12" fill="var(--surface)" stroke="var(--primary)" stroke-width="3"/>
                    <text x="150" y="35" text-anchor="middle" fill="var(--text-primary)" font-size="18" font-weight="700">
                        ${API.escapeHtml(goal.title)}
                    </text>
                    <text x="150" y="60" text-anchor="middle" fill="var(--text-secondary)" font-size="14">
                        Progress: ${progress}% (${this.state.currentLadder.completedTasks}/${taskCount} tasks)
                    </text>
                    <text x="150" y="80" text-anchor="middle" fill="var(--text-secondary)" font-size="14">
                        Target: ${goal.target_value} ${goal.unit}
                    </text>
                    <text x="150" y="100" text-anchor="middle" fill="var(--text-tertiary)" font-size="12">
                        Due: ${API.formatDate(goal.end_date)}
                    </text>
                </g>

                <!-- Connector from goal to tasks -->
                <line x1="400" y1="140" x2="400" y2="200" stroke="var(--border)" stroke-width="3" stroke-dasharray="5,5"/>

                <!-- Task nodes -->
                ${tasks.map((task, index) => this.renderTaskNode(task, index, taskHeight, taskSpacing)).join('')}
            </svg>
        `;
    },

    renderTaskNode(task, index, taskHeight, taskSpacing) {
        const y = 200 + (index * (taskHeight + taskSpacing));
        const isCompleted = task.status === 'completed';
        const isInProgress = task.status === 'in_progress';
        
        let statusIcon, statusColor, statusText;
        if (isCompleted) {
            statusIcon = '✓';
            statusColor = 'var(--success)';
            statusText = 'Complete';
        } else if (isInProgress) {
            statusIcon = '⚡';
            statusColor = 'var(--warning)';
            statusText = 'In Progress';
        } else {
            statusIcon = '○';
            statusColor = 'var(--text-tertiary)';
            statusText = 'Pending';
        }

        const hasNextTask = index < this.state.currentLadder.tasks.length - 1;

        return `
            <!-- Task card -->
            <g class="ladder-task-node" transform="translate(250, ${y})" data-task-id="${task.id}" style="cursor: pointer;">
                <rect width="300" height="${taskHeight}" rx="8" 
                      fill="var(--surface)" 
                      stroke="${statusColor}" 
                      stroke-width="2"
                      class="ladder-task-rect"/>
                
                <text x="15" y="30" fill="var(--text-primary)" font-size="16" font-weight="600">
                    ${API.escapeHtml(task.title.substring(0, 30))}${task.title.length > 30 ? '...' : ''}
                </text>
                
                ${task.description ? `
                    <text x="15" y="50" fill="var(--text-secondary)" font-size="12">
                        ${API.escapeHtml(task.description.substring(0, 35))}${task.description.length > 35 ? '...' : ''}
                    </text>
                ` : ''}
                
                ${task.due_date ? `
                    <text x="15" y="${task.description ? '70' : '55'}" fill="var(--text-tertiary)" font-size="11">
                        Due: ${API.formatDate(task.due_date)}
                    </text>
                ` : ''}
                
                <!-- Status badge -->
                <circle cx="270" cy="50" r="15" fill="${statusColor}"/>
                <text x="270" y="55" text-anchor="middle" fill="white" font-size="18">${statusIcon}</text>
                <text x="270" y="${taskHeight - 15}" text-anchor="middle" fill="${statusColor}" font-size="10" font-weight="600">
                    ${statusText}
                </text>
            </g>

            <!-- Connector to next task -->
            ${hasNextTask ? `
                <line x1="400" y1="${y + taskHeight}" x2="400" y2="${y + taskHeight + taskSpacing}" 
                      stroke="var(--border)" stroke-width="3" stroke-dasharray="5,5"/>
            ` : ''}
        `;
    },

    attachLadderViewEvents() {
        const container = this.state.container;

        // Button handlers
        container.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (target) {
                const action = target.dataset.action;
                switch (action) {
                    case 'back-to-overview':
                        await this.loadData();
                        this.showOverview();
                        break;
                    case 'zoom-fit':
                        this.zoomFit();
                        break;
                    case 'zoom-in':
                        this.zoom(1.2);
                        break;
                    case 'zoom-out':
                        this.zoom(0.8);
                        break;
                    case 'close':
                        this.close();
                        break;
                }
                return;
            }

            // Task node click
            const taskNode = e.target.closest('.ladder-task-node');
            if (taskNode) {
                const taskId = taskNode.dataset.taskId;
                this.showTaskEditModal(taskId);
            }
        };
    },

    setupLadderPanning() {
        const svg = document.getElementById('ladderSvg');
        const container = document.getElementById('ladderViewContent');
        if (!svg || !container) return;

        let isPanning = false;
        let startX, startY;

        container.addEventListener('mousedown', (e) => {
            if (e.target.closest('.ladder-task-node')) return; // Don't pan when clicking task
            isPanning = true;
            startX = e.clientX - this.state.svgPanX;
            startY = e.clientY - this.state.svgPanY;
            container.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            this.state.svgPanX = e.clientX - startX;
            this.state.svgPanY = e.clientY - startY;
            this.applySVGTransform();
        });

        document.addEventListener('mouseup', () => {
            isPanning = false;
            if (container) container.style.cursor = 'grab';
        });
    },

    zoom(factor) {
        this.state.svgZoom *= factor;
        this.state.svgZoom = Math.max(0.5, Math.min(3, this.state.svgZoom)); // Clamp between 0.5x and 3x
        this.applySVGTransform();
    },

    zoomFit() {
        this.state.svgZoom = 1;
        this.state.svgPanX = 0;
        this.state.svgPanY = 0;
        this.applySVGTransform();
    },

    applySVGTransform() {
        const svg = document.getElementById('ladderSvg');
        if (svg) {
            svg.style.transform = `translate(${this.state.svgPanX}px, ${this.state.svgPanY}px) scale(${this.state.svgZoom})`;
        }
    },

    // =====================================================
    // TASK EDIT MODAL
    // =====================================================
    
    showTaskEditModal(taskId) {
        const task = this.state.currentLadder.tasks.find(t => t.id === taskId);
        if (!task) return;

        const modal = document.createElement('div');
        modal.className = 'ladder-modal-overlay';
        modal.innerHTML = `
            <div class="ladder-modal">
                <div class="ladder-modal-header">
                    <h3>Edit Task</h3>
                    <button class="ladder-modal-close" data-action="close-modal">
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/></svg>
                    </button>
                </div>

                <div class="ladder-modal-body">
                    <div class="ladder-form-group">
                        <label>Title</label>
                        <input type="text" id="editTaskTitle" value="${API.escapeHtml(task.title)}" maxlength="100">
                    </div>

                    <div class="ladder-form-group">
                        <label>Status</label>
                        <select id="editTaskStatus">
                            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>

                    <div class="ladder-form-group">
                        <label>Description (Optional)</label>
                        <textarea id="editTaskDescription" rows="3">${task.description || ''}</textarea>
                    </div>

                    <div class="ladder-modal-actions">
                        <button class="ladder-btn-secondary" data-action="close-modal">Cancel</button>
                        <button class="ladder-btn-primary" data-action="save-task" data-task-id="${taskId}">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Events
        modal.onclick = async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;

            if (action === 'close-modal') {
                modal.remove();
            } else if (action === 'save-task') {
                await this.saveTaskEdit(target.dataset.taskId, modal);
            }
        };

        // Click overlay to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    async saveTaskEdit(taskId, modal) {
        const title = document.getElementById('editTaskTitle')?.value.trim();
        const status = document.getElementById('editTaskStatus')?.value;
        const description = document.getElementById('editTaskDescription')?.value.trim();

        if (!title) {
            window.SteadyUtils.showToast('Title is required', 'error');
            return;
        }

        try {
            const updates = { title, status, description: description || null };
            
            // If marking as completed, add timestamp
            if (status === 'completed') {
                updates.completed_at = new Date().toISOString();
            }

            await API.updateTask(taskId, updates);

            // Check if goal should be completed
            await API.checkGoalLadderCompletion(this.state.currentLadder.goal.id);

            window.SteadyUtils.showToast('Task updated!', 'success');
            modal.remove();

            // Reload ladder view
            await this.showLadderView(this.state.currentLadder.goal.id);

        } catch (error) {
            console.error('Save task error:', error);
            window.SteadyUtils.showToast('Failed to save task', 'error');
        }
    },

    // =====================================================
    // ERROR HANDLING
    // =====================================================
    
    showError(message) {
        const html = `
            ${this.renderStyles()}
            <div class="goal-ladder-container">
                <div class="ladder-error">
                    <svg class="ladder-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" stroke-width="2"/>
                        <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
                        <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/>
                    </svg>
                    <h3>Something Went Wrong</h3>
                    <p>${API.escapeHtml(message)}</p>
                    <button class="ladder-btn-primary" data-action="close">Close</button>
                </div>
            </div>
        `;

        this.state.container.innerHTML = html;

        this.state.container.onclick = (e) => {
            if (e.target.closest('[data-action="close"]')) {
                this.close();
            }
        };
    },

    // =====================================================
    // STYLES
    // =====================================================
    
    renderStyles() {
        return `<style>
/* GOAL LADDER MODULE - COMPLETE STYLES */

.goal-ladder-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ladderFadeIn 0.3s ease;
}

@keyframes ladderFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* LOADING SCREEN */
.goal-ladder-loading {
    text-align: center;
    color: white;
}

.ladder-loading-icon {
    width: 80px;
    height: 80px;
    stroke: white;
    margin-bottom: 2rem;
    animation: ladderPulse 2s ease-in-out infinite;
}

@keyframes ladderPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.1); }
}

.ladder-loading-bar {
    width: 300px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 9999px;
    overflow: hidden;
    margin: 2rem auto 0;
}

.ladder-loading-fill {
    height: 100%;
    width: 60%;
    background: linear-gradient(90deg, var(--primary), var(--success));
    animation: ladderLoadingSlide 1.5s ease-in-out infinite;
}

@keyframes ladderLoadingSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(250%); }
}

/* CONTAINER */
.goal-ladder-container,
.goal-ladder-wizard,
.ladder-view-container {
    background: var(--background);
    width: 95vw;
    max-width: 1400px;
    height: 90vh;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    animation: ladderSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes ladderSlideUp {
    from { opacity: 0; transform: translateY(40px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

/* HEADER */
.goal-ladder-header {
    padding: 2rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
    background: var(--surface);
}

.goal-ladder-header-content {
    flex: 1;
}

.goal-ladder-title {
    font-size: 2rem;
    font-weight: 900;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.goal-ladder-title svg {
    width: 2rem;
    height: 2rem;
    stroke: url(#ladderGradient);
}

.goal-ladder-subtitle {
    color: var(--text-secondary);
    margin: 0;
    font-size: 1.125rem;
}

.goal-ladder-header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
}

/* BUTTONS */
.ladder-btn-primary,
.ladder-btn-secondary,
.ladder-btn-close,
.ladder-btn-back,
.ladder-btn-text {
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
    white-space: nowrap;
}

.ladder-btn-primary {
    background: var(--gradient-primary);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.ladder-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.ladder-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.ladder-btn-primary svg,
.ladder-btn-secondary svg {
    width: 1.125rem;
    height: 1.125rem;
    stroke-width: 2.5;
}

.ladder-btn-secondary {
    background: var(--surface);
    color: var(--text-primary);
    border: 2px solid var(--border);
}

.ladder-btn-secondary:hover:not(:disabled) {
    border-color: var(--primary);
    color: var(--primary);
}

.ladder-btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.ladder-btn-close,
.ladder-btn-back {
    padding: 0.75rem;
    background: var(--surface-hover);
    border: 1px solid var(--border);
}

.ladder-btn-close:hover,
.ladder-btn-back:hover {
    background: var(--danger);
    border-color: var(--danger);
    color: white;
}

.ladder-btn-close svg,
.ladder-btn-back svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2;
}

.ladder-btn-text {
    background: none;
    border: none;
    color: var(--primary);
    padding: 0.5rem 0;
    text-decoration: underline;
}

.ladder-btn-text:hover {
    color: var(--primary-dark);
}

/* LADDER GRID */
.ladder-grid {
    padding: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    overflow-y: auto;
    flex: 1;
}

.ladder-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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

.ladder-progress-ring {
    transition: stroke-dashoffset 1s ease;
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
    color: var(--text-primary);
}

.ladder-card-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.ladder-card-dot {
    opacity: 0.5;
}

.ladder-overdue {
    color: var(--danger);
    font-weight: 700;
}

.ladder-urgent {
    color: var(--warning);
    font-weight: 700;
}

/* EMPTY STATE */
.ladder-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
}

.ladder-empty-icon {
    width: 5rem;
    height: 5rem;
    stroke: var(--text-tertiary);
    stroke-width: 2;
    margin-bottom: 2rem;
    opacity: 0.5;
}

.ladder-empty h3 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 0.75rem 0;
    color: var(--text-primary);
}

.ladder-empty p {
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
    max-width: 400px;
}

/* WIZARD */
.goal-ladder-wizard {
    max-width: 900px;
}

.wizard-header {
    padding: 2rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--surface);
}

.wizard-progress {
    display: flex;
    align-items: center;
    gap: 1rem;
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
    transition: all 0.3s ease;
}

.wizard-step.active .wizard-step-number {
    background: var(--primary);
    color: white;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

.wizard-step.complete .wizard-step-number {
    background: var(--success);
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
    transition: all 0.3s ease;
}

.wizard-step-line.complete {
    background: var(--success);
}

.wizard-content {
    padding: 2rem;
    overflow-y: auto;
    flex: 1;
}

.wizard-step-container {
    max-width: 700px;
    margin: 0 auto;
}

.wizard-step-container h2 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
}

.wizard-subtitle {
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
}

.wizard-goal-selection,
.wizard-goal-form,
.wizard-task-selection {
    margin-bottom: 2rem;
}

.wizard-select,
.wizard-search {
    width: 100%;
    padding: 1rem;
    border: 2px solid var(--border);
    border-radius: 12px;
    font-size: 1rem;
    background: var(--surface);
    color: var(--text-primary);
    transition: all 0.2s ease;
}

.wizard-select:focus,
.wizard-search:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
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
    background: var(--background);
    padding: 0 1rem;
    color: var(--text-tertiary);
    font-weight: 600;
}

.wizard-form-group {
    margin-bottom: 1.5rem;
}

.wizard-form-group label {
    display: block;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.wizard-form-group input,
.wizard-form-group select,
.wizard-form-group textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid var(--border);
    border-radius: 12px;
    font-size: 1rem;
    background: var(--surface);
    color: var(--text-primary);
    font-family: inherit;
    transition: all 0.2s ease;
}

.wizard-form-group input:focus,
.wizard-form-group select:focus,
.wizard-form-group textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.wizard-char-count {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-tertiary);
}

.wizard-form-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.wizard-period-pills {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
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

.wizard-section {
    margin-bottom: 2rem;
}

.wizard-section h3 {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    color: var(--text-primary);
}

.wizard-task-list {
    max-height: 300px;
    overflow-y: auto;
    border: 2px solid var(--border);
    border-radius: 12px;
    padding: 1rem;
    background: var(--surface);
}

.wizard-task-item {
    margin-bottom: 0.75rem;
}

.wizard-task-item:last-child {
    margin-bottom: 0;
}

.wizard-task-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.wizard-task-checkbox:hover {
    background: var(--surface-hover);
}

.wizard-task-checkbox input[type="checkbox"] {
    margin-top: 0.25rem;
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--primary);
}

.wizard-task-info {
    flex: 1;
}

.wizard-task-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.wizard-task-meta {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.wizard-new-task-form {
    display: flex;
    gap: 1rem;
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
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 12px;
}

.wizard-selected-tasks h3 {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    color: var(--text-primary);
}

.wizard-selected-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.wizard-selected-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--background);
    border-radius: 8px;
}

.wizard-selected-item.wizard-selected-new {
    border-left: 3px solid var(--success);
}

.wizard-selected-number {
    font-weight: 700;
    color: var(--text-tertiary);
    min-width: 30px;
}

.wizard-selected-title {
    flex: 1;
    color: var(--text-primary);
    font-weight: 600;
}

.wizard-new-badge {
    padding: 0.25rem 0.75rem;
    background: var(--success);
    color: white;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
}

.wizard-remove-btn {
    padding: 0.5rem;
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.wizard-remove-btn:hover {
    background: var(--danger);
    color: white;
}

.wizard-remove-btn svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 2;
}

.wizard-actions {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border);
}

.wizard-spinner {
    width: 1.125rem;
    height: 1.125rem;
    animation: ladderSpin 0.8s linear infinite;
}

@keyframes ladderSpin {
    to { transform: rotate(360deg); }
}

/* REVIEW STEP */
.wizard-review-section {
    margin-bottom: 2rem;
}

.wizard-review-section h3 {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    color: var(--text-primary);
}

.wizard-review-card {
    padding: 1.5rem;
    background: var(--surface);
    border: 2px solid var(--primary);
    border-radius: 12px;
}

.wizard-review-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.wizard-review-meta {
    color: var(--text-secondary);
    font-size: 0.95rem;
}

.wizard-review-task-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.wizard-review-task {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.wizard-review-task-number {
    font-weight: 700;
    color: var(--text-tertiary);
    min-width: 30px;
}

.wizard-review-task-info {
    flex: 1;
}

.wizard-review-task-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.wizard-review-task-meta {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.wizard-review-task-status {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    font-weight: 600;
}

/* LADDER VIEW */
.ladder-view-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--surface);
}

.ladder-view-controls {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.ladder-control-btn {
    padding: 0.75rem;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ladder-control-btn:hover {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
}

.ladder-control-btn svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2;
}

.ladder-view-content {
    flex: 1;
    overflow: hidden;
    padding: 2rem;
    cursor: grab;
    background: var(--background);
}

.ladder-svg {
    transition: transform 0.3s ease;
    transform-origin: center center;
}

.ladder-task-rect {
    transition: all 0.2s ease;
}

.ladder-task-node:hover .ladder-task-rect {
    filter: brightness(1.1);
    transform: translateY(-2px);
}

/* MODAL */
.ladder-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 200000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ladderFadeIn 0.2s ease;
}

.ladder-modal {
    background: var(--surface);
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    animation: ladderModalSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes ladderModalSlide {
    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.ladder-modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.ladder-modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
}

.ladder-modal-close {
    padding: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.ladder-modal-close:hover {
    background: var(--surface-hover);
}

.ladder-modal-close svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2;
    stroke: var(--text-secondary);
}

.ladder-modal-body {
    padding: 2rem;
    overflow-y: auto;
    max-height: calc(80vh - 100px);
}

.ladder-form-group {
    margin-bottom: 1.5rem;
}

.ladder-form-group label {
    display: block;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.ladder-form-group input,
.ladder-form-group select,
.ladder-form-group textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid var(--border);
    border-radius: 12px;
    font-size: 1rem;
    background: var(--surface);
    color: var(--text-primary);
    font-family: inherit;
    transition: all 0.2s ease;
}

.ladder-form-group input:focus,
.ladder-form-group select:focus,
.ladder-form-group textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.ladder-modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
}

/* ERROR STATE */
.ladder-error {
    text-align: center;
    padding: 4rem 2rem;
}

.ladder-error-icon {
    width: 5rem;
    height: 5rem;
    stroke: var(--danger);
    stroke-width: 2;
    margin-bottom: 2rem;
}

.ladder-error h3 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 0.75rem 0;
    color: var(--text-primary);
}

.ladder-error p {
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
}

/* DARK MODE */
[data-theme="dark"] .goal-ladder-container,
[data-theme="dark"] .goal-ladder-wizard,
[data-theme="dark"] .ladder-view-container,
[data-theme="dark"] .ladder-modal {
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .ladder-card:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

/* MOBILE RESPONSIVE */
@media (max-width: 768px) {
    .goal-ladder-container,
    .goal-ladder-wizard,
    .ladder-view-container {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
    }

    .goal-ladder-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .goal-ladder-header-actions {
        width: 100%;
        justify-content: space-between;
    }

    .ladder-grid {
        grid-template-columns: 1fr;
        padding: 1rem;
    }

    .wizard-progress {
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .wizard-step-label {
        font-size: 0.75rem;
    }

    .wizard-form-row {
        grid-template-columns: 1fr;
    }

    .wizard-actions {
        flex-direction: column-reverse;
    }

    .wizard-actions button {
        width: 100%;
        justify-content: center;
    }

    .ladder-view-content {
        padding: 1rem;
    }

    .ladder-modal {
        width: 95%;
        max-width: none;
    }
}
</style>`;
    }
};

// SHELL COMPATIBILITY
if (typeof window !== 'undefined') {
    window.GoalLadderModule = window.GoalLadderModule;
    console.log('✅ Goal Ladder module loaded - Ready to build ladders! 🪜');
}