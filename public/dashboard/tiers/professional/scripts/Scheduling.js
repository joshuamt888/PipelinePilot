window.SchedulingModule = {
    // State
    scheduling_state: {
        tasks: [],
        leads: [],
        isLoading: false,
        isTransitioning: false,
        searchTerm: '',
        currentView: 'dashboard',
        currentDate: new Date(),
        selectedDate: null,
        currentEditTask: null,
        currentViewTask: null,
        taskToDelete: null,
        targetContainer: 'tasks-content',
        eventListeners: [],
        taskActionLoading: false,
        lastNotificationMessage: null,
        lastNotificationTime: 0,
        currentFilters: {
            types: [],
            priorities: [],
            date: ''
        },
        batchEditMode: false,
        selectedTaskIds: []
    },

    // Init with fade-in
    async init(targetContainer = 'tasks-content') {
        console.log('Scheduling module loading');
        
        try {
            this.scheduling_state.targetContainer = targetContainer;
            this.scheduling_state.isLoading = true;
            
            const container = document.getElementById(targetContainer);
            if (container) {
                container.style.opacity = '0';
                container.style.transition = 'opacity 0.3s ease';
            }
            
            await this.scheduling_loadTasks();
            await this.scheduling_loadLeads();
            this.scheduling_render();
            
            // Fade in
            setTimeout(() => {
                if (container) container.style.opacity = '1';
            }, 50);
            
            console.log('Scheduling module ready');
            
        } catch (error) {
            console.error('Scheduling init failed:', error);
            this.scheduling_renderError(error.message);
        } finally {
            this.scheduling_state.isLoading = false;
        }
    },

    // Load Data
    async scheduling_loadTasks() {
        try {
            const tasks = await API.getTasks();
            this.scheduling_state.tasks = Array.isArray(tasks) ? tasks : [];
            console.log(`Loaded ${this.scheduling_state.tasks.length} tasks`);
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.scheduling_state.tasks = [];
            throw error;
        }
    },

    async scheduling_loadLeads() {
        try {
            const leadData = await API.getLeads();
            this.scheduling_state.leads = leadData.all || leadData || [];
            console.log(`Loaded ${this.scheduling_state.leads.length} leads`);
        } catch (error) {
            console.error('Failed to load leads:', error);
            this.scheduling_state.leads = [];
        }
    },

    // Main render (no modal HTML)
    scheduling_render() {
        const container = document.getElementById(this.scheduling_state.targetContainer);
        if (!container) return;

        container.innerHTML = `
            <div class="scheduling-container">
                ${this.scheduling_state.currentView === 'table' ? 
                    this.scheduling_renderTableView() : 
                    this.scheduling_renderDashboardView()}
                ${this.scheduling_renderStyles()}
            </div>
        `;

        this.scheduling_setupEventListeners();
        this.scheduling_updateHeaderIndicators();
        this.scheduling_updateActiveFiltersPanel();

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // Dashboard View
    scheduling_renderDashboardView() {
        const tasksCount = this.scheduling_state.tasks.length;
        
        return `
            <div class="scheduling-action-bubbles">
                <div class="scheduling-action-bubble scheduling-bubble-primary" onclick="SchedulingModule.scheduling_showAddTaskModal()">
                    <div class="scheduling-bubble-icon">➕</div>
                    <div class="scheduling-bubble-content">
                        <h2 class="scheduling-bubble-title">Add New Task</h2>
                        <p class="scheduling-bubble-subtitle">Create and schedule your next follow-up or meeting</p>
                        <button class="scheduling-bubble-button">
                            <span>Add Task</span>
                            <span class="scheduling-arrow">→</span>
                        </button>
                    </div>
                </div>
                
                <div class="scheduling-action-bubble scheduling-bubble-secondary" onclick="SchedulingModule.scheduling_showTableView()">
                    <div class="scheduling-bubble-icon"><i data-lucide="list-checks" style="width: 48px; height: 48px;"></i></div>
                    <div class="scheduling-bubble-content">
                        <h2 class="scheduling-bubble-title">Manage Tasks</h2>
                        <p class="scheduling-bubble-subtitle">View, edit and organize your complete task database</p>
                        <button class="scheduling-bubble-button">
                            <span>View All Tasks (${tasksCount})</span>
                            <span class="scheduling-arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
            
            ${this.scheduling_renderCalendarSection()}
        `;
    },

    // Calendar Section
    scheduling_renderCalendarSection() {
        return `
            <div class="scheduling-calendar-section">
                <div class="scheduling-calendar-header">
                    <h2 class="scheduling-calendar-title">${this.scheduling_formatMonth(this.scheduling_state.currentDate)}</h2>
                    <div class="scheduling-calendar-nav">
                        <button class="scheduling-nav-btn" onclick="SchedulingModule.scheduling_previousMonth()">←</button>
                        <button class="scheduling-today-btn" onclick="SchedulingModule.scheduling_goToToday()">Today</button>
                        <button class="scheduling-nav-btn" onclick="SchedulingModule.scheduling_nextMonth()">→</button>
                    </div>
                </div>
                
                <div class="scheduling-calendar-grid">
                    <div class="scheduling-day-header">Sun</div>
                    <div class="scheduling-day-header">Mon</div>
                    <div class="scheduling-day-header">Tue</div>
                    <div class="scheduling-day-header">Wed</div>
                    <div class="scheduling-day-header">Thu</div>
                    <div class="scheduling-day-header">Fri</div>
                    <div class="scheduling-day-header">Sat</div>
                    
                    ${this.scheduling_getMonthDays(this.scheduling_state.currentDate)
                        .map(dayData => this.scheduling_renderCalendarDay(dayData))
                        .join('')}
                </div>
            </div>
        `;
    },

    scheduling_renderCalendarDay(dayData) {
        const dayTasks = this.scheduling_getTasksForDate(dayData.date);
        const pendingTasks = dayTasks.filter(task => task.status !== 'completed');
        const completedTasks = dayTasks.filter(task => task.status === 'completed');
        
        const hasOverdue = pendingTasks.some(task => this.scheduling_isTaskOverdue(task));
        
        const pendingCount = pendingTasks.length;
        const completedCount = completedTasks.length;
        const today = new Date().toISOString().split('T')[0];
        const isToday = dayData.date === today;
        
        return `
            <div class="scheduling-calendar-day ${isToday ? 'scheduling-today' : ''} ${!dayData.isCurrentMonth ? 'scheduling-other-month' : ''}"
                 data-date="${dayData.date}"
                 onclick="SchedulingModule.scheduling_showDayTasks('${dayData.date}')">
                <span class="scheduling-day-number">${dayData.day}</span>
                ${pendingCount > 0 ? `<span class="scheduling-pending-badge scheduling-top-right ${hasOverdue ? 'scheduling-overdue-pulse' : ''}">${pendingCount}</span>` : ''}
                ${completedCount > 0 && pendingCount > 0 ? `<span class="scheduling-completed-badge scheduling-below-red">${completedCount}</span>` : ''}
                ${completedCount > 0 && pendingCount === 0 ? `<span class="scheduling-completed-badge scheduling-top-right">${completedCount}</span>` : ''}
            </div>
        `;
    },

    // Table View
    scheduling_renderTableView() {
        const filteredTasks = this.scheduling_getFilteredAndSortedTasks();
        
        return `
            <div class="scheduling-table-view">
                <div class="scheduling-table-header">
                    <div class="scheduling-table-header-left">
                        <button class="scheduling-back-btn" onclick="SchedulingModule.scheduling_showDashboard()">
                            ← Back to Dashboard
                        </button>
                        <h2 class="scheduling-table-title">All Tasks (${filteredTasks.length})</h2>
                    </div>
                    <div class="scheduling-table-header-right">
                        <button class="scheduling-refresh-table-btn" onclick="SchedulingModule.scheduling_refreshTable()">
                            🔄 Refresh
                        </button>
                        <div class="scheduling-search-box">
                            <i data-lucide="search" class="scheduling-search-icon" style="width: 18px; height: 18px;"></i>
                            <input type="text"
                                   class="scheduling-search-input"
                                   placeholder="Search tasks..."
                                   id="scheduling_searchInput"
                                   value="${API.escapeHtml(this.scheduling_state.searchTerm)}">
                        </div>
                        <button class="scheduling-add-task-btn" onclick="SchedulingModule.scheduling_showAddTaskModal()">
                            + Add Task
                        </button>
                    </div>
                </div>
                
                ${this.scheduling_renderActiveFiltersPanel()}
                
                <div class="scheduling-table-container">
                    ${filteredTasks.length > 0 ? 
                        this.scheduling_renderTasksTable(filteredTasks) : 
                        this.scheduling_renderEmptyState()}
                </div>
            </div>
        `;
    },

    scheduling_renderTasksTable(tasks) {
        return `
            <table class="scheduling-tasks-table">
                <thead>
                    <tr>
                        <th class="scheduling-checkbox-col">✓</th>
                        <th>Task</th>
                        <th>Lead</th>
                        <th>
                            <div class="scheduling-header-filter" onclick="SchedulingModule.scheduling_showTypeFilter(event)">
                                Type <span class="scheduling-filter-arrow">▼</span>
                            </div>
                        </th>
                        <th>
                            <div class="scheduling-header-filter" onclick="SchedulingModule.scheduling_showDateFilter(event)">
                                Due Date <span class="scheduling-filter-arrow">▼</span>
                            </div>
                        </th>
                        <th>
                            <div class="scheduling-header-filter" onclick="SchedulingModule.scheduling_showPriorityFilter(event)">
                                Priority <span class="scheduling-filter-arrow">▼</span>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => this.scheduling_renderTaskRow(task)).join('')}
                </tbody>
            </table>
        `;
    },

    scheduling_renderTaskRow(task) {
        const isCompleted = task.status === 'completed';
        const isOverdue = this.scheduling_isTaskOverdue(task);
        const leadName = this.scheduling_getLeadName(task.lead_id);
        const typeIcon = this.scheduling_getTaskTypeIcon(task.task_type);
        const priorityIcon = this.scheduling_getPriorityIcon(task.priority);
        const formattedDate = this.scheduling_formatTaskDate(task.due_date);
        
        const safeTitle = API.escapeHtml(task.title);
        const safeLeadName = API.escapeHtml(leadName || '-');
        const safeTime = task.due_time ? API.escapeHtml(this.scheduling_formatTime(task.due_time)) : '';
        
        return `
            <tr class="scheduling-task-row ${isCompleted ? 'scheduling-completed' : ''} ${isOverdue ? 'scheduling-overdue' : ''} scheduling-clickable-row"
                data-priority="${task.priority || 'medium'}"
                onclick="SchedulingModule.scheduling_showTaskView('${task.id}')">
                <td class="scheduling-checkbox-col" onclick="event.stopPropagation()">
                    <input type="checkbox" 
                           class="scheduling-task-checkbox"
                           ${isCompleted ? 'checked' : ''}
                           onchange="SchedulingModule.scheduling_toggleTaskComplete('${task.id}', this.checked)">
                </td>
                <td class="scheduling-task-cell">
                    <div class="scheduling-task-title ${isCompleted ? 'scheduling-completed-text' : ''}">${safeTitle}</div>
                    ${safeTime ? `<div class="scheduling-task-time"><i data-lucide="clock" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>${safeTime}</div>` : ''}
                </td>
                <td class="scheduling-lead-cell">
                    <span class="scheduling-lead-name">${safeLeadName}</span>
                </td>
                <td class="scheduling-type-cell">
                    <span class="scheduling-type-badge">${typeIcon} ${this.scheduling_formatTaskType(task.task_type)}</span>
                </td>
                <td class="scheduling-date-cell">
                    <span class="scheduling-date-text ${isOverdue ? 'scheduling-overdue-date' : ''}">${formattedDate}</span>
                </td>
                <td class="scheduling-priority-cell">
                    <span class="scheduling-priority-badge scheduling-priority-${task.priority || 'medium'}">
                        ${priorityIcon} ${this.scheduling_formatPriority(task.priority)}
                    </span>
                </td>
            </tr>
        `;
    },

    // INSTANT ADD TASK MODAL - Dynamic creation
    scheduling_showAddTaskModal(preSelectedDate = null) {
        if (this.scheduling_state.isTransitioning) return;
        
        // Remove any existing modals
        document.getElementById('scheduling_addModal')?.remove();
        
        this.scheduling_state.selectedDate = preSelectedDate;
        
        const modal = document.createElement('div');
        modal.className = 'scheduling-modal-overlay scheduling-show';
        modal.id = 'scheduling_addModal';
        modal.innerHTML = `
            <div class="scheduling-modal" onclick="event.stopPropagation()">
                <div class="scheduling-modal-header">
                    <h2 class="scheduling-modal-title">Add New Task</h2>
                    <button class="scheduling-modal-close" onclick="SchedulingModule.scheduling_hideAddTaskModal()">×</button>
                </div>
                <div class="scheduling-modal-body">
                    ${this.scheduling_renderAddTaskForm()}
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
        this.scheduling_hideAddTaskModal();
    }
    mouseDownTarget = null;
});
        
        document.body.appendChild(modal);

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Setup form functionality after insertion
        setTimeout(() => {
            this.scheduling_setupInputValidation();
            this.scheduling_setupPriorityGlow();
            this.scheduling_setupCustomTaskTypeToggle('add');

            const form = document.getElementById('scheduling_form');
            if (form) {
                form.onsubmit = (e) => this.scheduling_handleSubmit(e);
            }

            const firstInput = modal.querySelector('input[name="title"]');
            if (firstInput) firstInput.focus();
        }, 10);
    },

    scheduling_hideAddTaskModal() {
        const modal = document.getElementById('scheduling_addModal');
        if (modal) {
            modal.classList.remove('scheduling-show');
            setTimeout(() => {
                modal.remove();
                this.scheduling_state.selectedDate = null;
            }, 200);
        }
    },

    // Add task form
    scheduling_renderAddTaskForm() {
        const today = new Date().toISOString().split('T')[0];
        const selectedDate = this.scheduling_state.selectedDate || today;
        
        return `
            <form id="scheduling_form" class="scheduling-form">
                <div class="scheduling-form-grid">
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Task Title *</label>
                        <input type="text" 
                               name="title" 
                               class="scheduling-form-input" 
                               required 
                               maxlength="50"
                               placeholder="Follow up with John Smith"
                               data-validate="title">
                        <div class="scheduling-input-feedback" id="scheduling_titleFeedback"></div>
                    </div>
                    
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Due Date</label>
                        <input type="date" name="due_date" class="scheduling-form-input" value="${selectedDate}">
                    </div>
                    
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Due Time</label>
                        <input type="time" name="due_time" class="scheduling-form-input">
                    </div>
                    
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Priority</label>
                        <select name="priority" class="scheduling-form-select">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    
                    ${this.scheduling_renderLeadSelector(null, 'add')}
                    
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Task Type</label>
                        <select name="task_type" class="scheduling-form-select" id="scheduling_taskTypeSelect">
                            <option value="follow_up">Follow-up</option>
                            <option value="call">Call</option>
                            <option value="email">Email</option>
                            <option value="meeting">Meeting</option>
                            <option value="demo">Demo</option>
                            <option value="research">Research</option>
                            <option value="estimate">Proposal</option>
                            <option value="contract">Contract</option>
                            <option value="task">Task</option>
                            <option value="custom">Custom Task Type</option>
                        </select>
                    </div>

                    <div class="scheduling-form-group scheduling-custom-task-input scheduling-full-width" id="scheduling_customTaskTypeInput" style="display: none;">
                        <label class="scheduling-form-label">Custom Task Type Name</label>
                        <input type="text" id="scheduling_customTaskType" class="scheduling-form-input"
                               placeholder="e.g., Site Visit, Installation, Training..."
                               maxlength="20">
                        <span class="scheduling-input-hint" id="scheduling_customTaskTypeCounter">20 characters remaining</span>
                    </div>

                    <div class="scheduling-form-group scheduling-full-width">
                        <label class="scheduling-form-label">Notes</label>
                        <textarea name="description" 
                                  class="scheduling-form-textarea" 
                                  rows="3" 
                                  maxlength="500"
                                  placeholder="Additional details about this task..."
                                  data-validate="description"></textarea>
                        <div class="scheduling-input-feedback" id="scheduling_descriptionFeedback"></div>
                    </div>
                </div>
                
                <div class="scheduling-form-actions">
                    <button type="button" class="scheduling-btn-secondary" onclick="SchedulingModule.scheduling_hideAddTaskModal()">
                        Cancel
                    </button>
                    <button type="submit" class="scheduling-btn-primary" id="scheduling_submitBtn">
                        <span class="scheduling-btn-text">Add Task</span>
                    </button>
                </div>
            </form>
        `;
    },

    // INSTANT EDIT TASK MODAL - Dynamic creation
    scheduling_editTask(taskId) {
        const task = this.scheduling_state.tasks.find(t => t.id.toString() === taskId.toString());
        if (!task) return;

        this.scheduling_state.currentEditTask = task;

        // Remove any existing edit modals
        document.getElementById('scheduling_editModal')?.remove();
        
        const modal = document.createElement('div');
        modal.className = 'scheduling-modal-overlay scheduling-show';
        modal.id = 'scheduling_editModal';
        modal.innerHTML = `
            <div class="scheduling-modal" onclick="event.stopPropagation()">
                <div class="scheduling-modal-header">
                    <h2 class="scheduling-modal-title">Edit Task</h2>
                    <button class="scheduling-modal-close" onclick="SchedulingModule.scheduling_hideEditTaskModal()">×</button>
                </div>
                <div class="scheduling-modal-body">
                    ${this.scheduling_renderEditTaskForm(task)}
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
        this.scheduling_hideEditTaskModal();
    }
    mouseDownTarget = null;
});
        
        document.body.appendChild(modal);

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Setup form functionality after insertion
        setTimeout(() => {
            this.scheduling_setupInputValidation();
            this.scheduling_setupPriorityGlow();
            this.scheduling_setupCustomTaskTypeToggle('edit');

            const editForm = document.getElementById('scheduling_editForm');
            if (editForm) {
                editForm.onsubmit = (e) => this.scheduling_handleEditSubmit(e);
            }
        }, 10);
    },

    scheduling_hideEditTaskModal() {
        const modal = document.getElementById('scheduling_editModal');
        if (modal) {
            modal.classList.remove('scheduling-show');
            setTimeout(() => modal.remove(), 200);
        }
        this.scheduling_state.currentEditTask = null;
    },

    // Edit form
    scheduling_renderEditTaskForm(task) {
        const safeTitle = API.escapeHtml(task.title || '');
        const safeDescription = API.escapeHtml(task.description || '');
        const taskDate = task.due_date ? 
            (task.due_date.includes('T') ? task.due_date.split('T')[0] : task.due_date) : '';
        
        return `
            <form id="scheduling_editForm" class="scheduling-form">
                <div class="scheduling-form-grid">
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Task Title *</label>
                        <input type="text" 
                               name="title" 
                               class="scheduling-form-input" 
                               value="${safeTitle}"
                               required 
                               maxlength="50"
                               data-validate="title">
                        <div class="scheduling-input-feedback" id="scheduling_edit_titleFeedback"></div>
                    </div>
                    
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Due Date</label>
                        <input type="date" name="due_date" class="scheduling-form-input" value="${taskDate}">
                    </div>
                    
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Due Time</label>
                        <input type="time" name="due_time" class="scheduling-form-input" value="${task.due_time || ''}">
                    </div>
                    
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Priority</label>
                        <select name="priority" class="scheduling-form-select">
                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                            <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                        </select>
                    </div>
                    
                    ${this.scheduling_renderLeadSelector(task.lead_id, 'edit')}
                    
                    <div class="scheduling-form-group">
                        <label class="scheduling-form-label">Task Type</label>
                        <select name="task_type" class="scheduling-form-select" id="scheduling_edit_taskTypeSelect">
                            <option value="follow_up" ${task.task_type === 'follow_up' ? 'selected' : ''}>Follow-up</option>
                            <option value="call" ${task.task_type === 'call' ? 'selected' : ''}>Call</option>
                            <option value="email" ${task.task_type === 'email' ? 'selected' : ''}>Email</option>
                            <option value="meeting" ${task.task_type === 'meeting' ? 'selected' : ''}>Meeting</option>
                            <option value="demo" ${task.task_type === 'demo' ? 'selected' : ''}>Demo</option>
                            <option value="research" ${task.task_type === 'research' ? 'selected' : ''}>Research</option>
                            <option value="estimate" ${task.task_type === 'estimate' ? 'selected' : ''}>Proposal</option>
                            <option value="contract" ${task.task_type === 'contract' ? 'selected' : ''}>Contract</option>
                            <option value="task" ${task.task_type === 'task' ? 'selected' : ''}>Task</option>
                            <option value="custom" ${!['follow_up', 'call', 'email', 'meeting', 'demo', 'research', 'estimate', 'contract', 'task'].includes(task.task_type) ? 'selected' : ''}>Custom Task Type</option>
                        </select>
                    </div>

                    <div class="scheduling-form-group scheduling-custom-task-input scheduling-full-width" id="scheduling_edit_customTaskTypeInput" style="display: ${!['follow_up', 'call', 'email', 'meeting', 'demo', 'research', 'estimate', 'contract', 'task'].includes(task.task_type) ? 'flex' : 'none'};">
                        <label class="scheduling-form-label">Custom Task Type Name</label>
                        <input type="text" id="scheduling_edit_customTaskType" class="scheduling-form-input"
                               placeholder="e.g., Site Visit, Installation, Training..."
                               maxlength="20"
                               value="${!['follow_up', 'call', 'email', 'meeting', 'demo', 'research', 'estimate', 'contract', 'task'].includes(task.task_type) ? API.escapeHtml(task.task_type) : ''}">
                        <span class="scheduling-input-hint" id="scheduling_edit_customTaskTypeCounter">20 characters remaining</span>
                    </div>

                    <div class="scheduling-form-group scheduling-full-width">
                        <label class="scheduling-form-label">Notes</label>
                        <textarea name="description" 
                                  class="scheduling-form-textarea" 
                                  rows="3" 
                                  maxlength="500"
                                  data-validate="description">${safeDescription}</textarea>
                        <div class="scheduling-input-feedback" id="scheduling_edit_descriptionFeedback"></div>
                    </div>
                </div>
                
                <div class="scheduling-form-actions">
                    <button type="button" class="scheduling-btn-danger" onclick="SchedulingModule.scheduling_showDeleteConfirmation('${task.id}')">
                        Delete Task
                    </button>
                    <div class="scheduling-form-actions-right">
                        <button type="button" class="scheduling-btn-secondary" onclick="SchedulingModule.scheduling_hideEditTaskModal()">
                            Cancel
                        </button>
                        <button type="submit" class="scheduling-btn-primary" id="scheduling_editSubmitBtn">
                            <span class="scheduling-btn-text">Update Task</span>
                        </button>
                    </div>
                </div>
            </form>
        `;
    },

    scheduling_renderLeadSelector(selectedLeadId = null, formType = 'add') {
        const selectedLead = selectedLeadId ? 
            this.scheduling_state.leads.find(l => l.id == selectedLeadId) : null;
        
        const inputId = `scheduling_selectedLeadId_${formType}`;
        const displayClass = `scheduling-lead-selector-display-${formType}`;
        
        const safeName = selectedLead ? API.escapeHtml(selectedLead.name) : '';
        const safeCompany = selectedLead?.company ? API.escapeHtml(selectedLead.company) : '';
        
        return `
            <div class="scheduling-form-group">
                <label class="scheduling-form-label">Related Lead</label>
                <div class="scheduling-lead-selector">
                    <input type="hidden" name="lead_id" value="${selectedLeadId || ''}" id="${inputId}">
                    <div class="scheduling-lead-selector-display ${displayClass}" onclick="SchedulingModule.scheduling_openLeadPicker('${formType}')">
                        ${selectedLead ? 
                            `<div class="scheduling-selected-lead">
                                <span class="scheduling-selected-lead-name">${safeName}</span>
                                ${safeCompany ? `<span class="scheduling-selected-lead-company">(${safeCompany})</span>` : ''}
                            </div>` :
                            `<div class="scheduling-no-lead-selected">
                                <span class="scheduling-placeholder-text">Click to select a lead...</span>
                            </div>`
                        }
                        <span class="scheduling-selector-arrow">▼</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Event Listeners
    scheduling_setupEventListeners() {
        // Cleanup old listeners
        this.scheduling_state.eventListeners.forEach(({ element, type, handler }) => {
            element?.removeEventListener(type, handler);
        });
        this.scheduling_state.eventListeners = [];

        // Search input
        const searchInput = document.getElementById('scheduling_searchInput');
        if (searchInput) {
            const searchHandler = this.scheduling_debounce((e) => this.scheduling_handleSearch(e), 300);
            searchInput.addEventListener('input', searchHandler);
            this.scheduling_state.eventListeners.push({ element: searchInput, type: 'input', handler: searchHandler });
        }

        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.scheduling_hideAllModals();
            }
        };
        document.addEventListener('keydown', escHandler);
        this.scheduling_state.eventListeners.push({ element: document, type: 'keydown', handler: escHandler });
    },

    // INPUT VALIDATION
    scheduling_setupInputValidation() {
        const inputs = document.querySelectorAll('[data-validate]');
        
        inputs.forEach(input => {
            const validateType = input.getAttribute('data-validate');
            const isEdit = input.closest('#scheduling_editForm');
            const feedbackId = isEdit ? `scheduling_edit_${validateType}Feedback` : `scheduling_${validateType}Feedback`;
            const feedback = document.getElementById(feedbackId);
            
            if (!feedback) return;

            input.addEventListener('input', () => {
                this.scheduling_validateInput(input, feedback, validateType);
            });

            input.addEventListener('blur', () => {
                this.scheduling_validateInput(input, feedback, validateType, true);
            });

            input.addEventListener('focus', () => {
                if (['title', 'description'].includes(validateType)) {
                    feedback.style.display = 'block';
                }
            });
        });
    },

    scheduling_validateInput(input, feedback, type, isBlur = false) {
        const value = input.value;
        const length = value.length;
        
        const limits = {
            title: 50,
            description: 500
        };

        const limit = limits[type];
        if (!limit) return;
        
        if (length === 0 && !isBlur) {
            feedback.textContent = '';
            feedback.className = 'scheduling-input-feedback';
            input.classList.remove('scheduling-input-warning', 'scheduling-input-error');
            return;
        }

        const percentage = (length / limit) * 100;

        if (percentage < 80) {
            feedback.textContent = `${length}/${limit}`;
            feedback.className = 'scheduling-input-feedback scheduling-feedback-normal';
            input.classList.remove('scheduling-input-warning', 'scheduling-input-error');
        } else if (percentage < 95) {
            const remaining = limit - length;
            feedback.textContent = `${remaining} characters remaining`;
            feedback.className = 'scheduling-input-feedback scheduling-feedback-warning';
            input.classList.add('scheduling-input-warning');
            input.classList.remove('scheduling-input-error');
        } else if (length < limit) {
            const remaining = limit - length;
            feedback.textContent = `Only ${remaining} left!`;
            feedback.className = 'scheduling-input-feedback scheduling-feedback-warning';
            input.classList.add('scheduling-input-warning');
            input.classList.remove('scheduling-input-error');
        } else {
            feedback.textContent = `Maximum ${limit} characters reached`;
            feedback.className = 'scheduling-input-feedback scheduling-feedback-error';
            input.classList.remove('scheduling-input-warning');
            input.classList.add('scheduling-input-error');
        }
    },

    scheduling_setupPriorityGlow() {
        setTimeout(() => {
            document.querySelectorAll('select[name="priority"]').forEach(dropdown => {
                const value = dropdown.value;
                if (value) {
                    dropdown.classList.remove('scheduling-priority-low', 'scheduling-priority-medium', 'scheduling-priority-high', 'scheduling-priority-urgent');
                    dropdown.classList.add(`scheduling-priority-${value}`);
                }

                dropdown.addEventListener('change', () => {
                    const newValue = dropdown.value;
                    dropdown.classList.remove('scheduling-priority-low', 'scheduling-priority-medium', 'scheduling-priority-high', 'scheduling-priority-urgent');
                    if (newValue) {
                        dropdown.classList.add(`scheduling-priority-${newValue}`);
                    }
                });
            });
        }, 100);
    },

    // Custom task type toggle and counter
    scheduling_setupCustomTaskTypeToggle(mode) {
        const selectId = mode === 'edit' ? 'scheduling_edit_taskTypeSelect' : 'scheduling_taskTypeSelect';
        const inputId = mode === 'edit' ? 'scheduling_edit_customTaskTypeInput' : 'scheduling_customTaskTypeInput';
        const textInputId = mode === 'edit' ? 'scheduling_edit_customTaskType' : 'scheduling_customTaskType';
        const counterId = mode === 'edit' ? 'scheduling_edit_customTaskTypeCounter' : 'scheduling_customTaskTypeCounter';

        const taskTypeSelect = document.getElementById(selectId);
        const customInput = document.getElementById(inputId);
        const customTextInput = document.getElementById(textInputId);
        const counter = document.getElementById(counterId);

        if (taskTypeSelect && customInput && customTextInput && counter) {
            // Character counter function
            const updateCounter = () => {
                let value = customTextInput.value;
                if (value.length > 20) {
                    value = value.substring(0, 20);
                    customTextInput.value = value;
                }

                const remaining = 20 - value.length;
                counter.textContent = remaining === 1
                    ? '1 character remaining'
                    : `${remaining} characters remaining`;

                if (remaining === 0) {
                    counter.textContent = 'Max reached';
                    counter.style.color = 'var(--danger)';
                    counter.style.fontWeight = '700';
                } else if (remaining <= 5) {
                    counter.style.color = 'var(--warning)';
                    counter.style.fontWeight = '600';
                } else {
                    counter.style.color = 'var(--text-tertiary)';
                    counter.style.fontWeight = '400';
                }
            };

            // Initialize counter on load
            updateCounter();

            // Update counter on input
            customTextInput.addEventListener('input', updateCounter);

            // Toggle visibility based on selection
            taskTypeSelect.addEventListener('change', () => {
                if (taskTypeSelect.value === 'custom') {
                    customInput.style.display = 'flex';
                    setTimeout(() => customTextInput.focus(), 100);
                } else {
                    customInput.style.display = 'none';
                    customTextInput.value = '';
                    updateCounter();
                }
            });
        }
    },

    // Form Submission
    async scheduling_handleSubmit(e) {
        e.preventDefault();
        
        try {
            if (this.scheduling_state.tasks.length >= 10000) {
                this.scheduling_showNotification('Task limit reached (10,000 max)', 'error');
                return;
            }
            
            this.scheduling_setLoadingState(true);
            
            const formData = new FormData(e.target);
            const taskData = {};
            
            for (let [key, value] of formData.entries()) {
                if (key === 'lead_id') {
                    const trimmed = value ? value.trim() : '';
                    taskData[key] = trimmed || null;
                } else if (key === 'priority') {
                    taskData[key] = value || 'medium';
                } else {
                    taskData[key] = value.trim() || null;
                }
            }

            // Handle custom task type
            if (taskData.task_type === 'custom') {
                const customTaskTypeInput = document.getElementById('scheduling_customTaskType');
                const customTaskType = customTaskTypeInput ? customTaskTypeInput.value.trim() : '';
                if (!customTaskType) {
                    this.scheduling_showNotification('Custom task type is required', 'error');
                    this.scheduling_setLoadingState(false);
                    if (customTaskTypeInput) {
                        customTaskTypeInput.style.borderColor = 'var(--danger)';
                        customTaskTypeInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
                        customTaskTypeInput.focus();
                    }
                    return;
                }
                taskData.task_type = customTaskType;
            }

            if (!taskData.title) {
                throw new Error('Title is required');
            }
            
            const newTask = await API.createTask(taskData);
            
            await this.scheduling_loadTasks();
            
            this.scheduling_hideAddTaskModal();
            this.scheduling_render();
            
            this.scheduling_showNotification(`Task "${API.escapeHtml(taskData.title)}" created successfully!`, 'success');
            
        } catch (error) {
            console.error('Failed to create task:', error);
            
            if (error.message.includes('Task limit reached')) {
                this.scheduling_showUpgradePrompt();
                return;
            }
            
            this.scheduling_showNotification(API.handleAPIError(error, 'CreateTask'), 'error');
        } finally {
            this.scheduling_setLoadingState(false);
        }
    },

    async scheduling_handleEditSubmit(e) {
        e.preventDefault();
        
        try {
            this.scheduling_setEditLoadingState(true);
            
            const formData = new FormData(e.target);
            const taskData = {};
            
            for (let [key, value] of formData.entries()) {
                if (key === 'lead_id') {
                    const trimmed = value ? value.trim() : '';
                    taskData[key] = trimmed || null;
                } else if (key === 'priority') {
                    taskData[key] = value || 'medium';
                } else {
                    taskData[key] = value.trim() || null;
                }
            }

            // Handle custom task type
            if (taskData.task_type === 'custom') {
                const customTaskTypeInput = document.getElementById('scheduling_edit_customTaskType');
                const customTaskType = customTaskTypeInput ? customTaskTypeInput.value.trim() : '';
                if (!customTaskType) {
                    this.scheduling_showNotification('Custom task type is required', 'error');
                    this.scheduling_setEditLoadingState(false);
                    if (customTaskTypeInput) {
                        customTaskTypeInput.style.borderColor = 'var(--danger)';
                        customTaskTypeInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
                        customTaskTypeInput.focus();
                    }
                    return;
                }
                taskData.task_type = customTaskType;
            }

            await API.updateTask(this.scheduling_state.currentEditTask.id, taskData);
            
            await this.scheduling_loadTasks();
            
            this.scheduling_hideEditTaskModal();
            this.scheduling_render();
            
            this.scheduling_showNotification(`Task "${API.escapeHtml(taskData.title)}" updated successfully!`, 'success');
            
        } catch (error) {
            console.error('Failed to update task:', error);
            this.scheduling_showNotification(API.handleAPIError(error, 'UpdateTask'), 'error');
        } finally {
            this.scheduling_setEditLoadingState(false);
        }
    },

    // Toggle Complete
    async scheduling_toggleTaskComplete(taskId, isCompleted) {
        // Update state first
        const taskIndex = this.scheduling_state.tasks.findIndex(t => t.id.toString() === taskId.toString());
        if (taskIndex !== -1) {
            this.scheduling_state.tasks[taskIndex].status = isCompleted ? 'completed' : 'pending';
            if (isCompleted) {
                this.scheduling_state.tasks[taskIndex].completed_at = new Date().toISOString();
            } else {
                this.scheduling_state.tasks[taskIndex].completed_at = null;
            }
        }
        
        this.scheduling_updateTaskVisually(taskId, isCompleted);
        
        if (this.scheduling_state.taskActionLoading) return;
        this.scheduling_state.taskActionLoading = true;
        
        try {
            if (isCompleted) {
                await API.completeTask(taskId, 'Completed from scheduling module');
                // Check if any active goals should be completed
                await API.checkGoalCompletion();
            } else {
                await API.updateTask(taskId, {
                    status: 'pending',
                    completed_at: null
                });
                // DB trigger automatically handles updating task_list goals when tasks change status
                // No need to manually check - goal status is always calculated dynamically
            }

            // Notify Goals module that task status changed so it can refresh percentages
            document.dispatchEvent(new CustomEvent('taskStatusChanged', { detail: { taskId } }));
        } catch (error) {
            this.scheduling_revertTaskVisually(taskId, !isCompleted);
            console.error('Task toggle failed:', error);
        } finally {
            this.scheduling_state.taskActionLoading = false;
        }
    },

    scheduling_updateTaskVisually(taskId, isCompleted) {
        const checkboxes = document.querySelectorAll(`input[onchange*="scheduling_toggleTaskComplete('${taskId}',"]`);
        const taskRows = document.querySelectorAll(`[onclick*="scheduling_showTaskView('${taskId}')"]`);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isCompleted;
        });
        
        taskRows.forEach(row => {
            if (isCompleted) {
                row.classList.add('scheduling-completed');
                row.classList.remove('scheduling-overdue');
            } else {
                row.classList.remove('scheduling-completed');
                const task = this.scheduling_state.tasks.find(t => t.id.toString() === taskId.toString());
                if (task && this.scheduling_isTaskOverdue(task)) {
                    row.classList.add('scheduling-overdue');
                }
            }
        });

        // Update calendar badges
        if (this.scheduling_state.currentView === 'dashboard') {
            const calendarGrid = document.querySelector('.scheduling-calendar-grid');
            if (calendarGrid) {
                const dayElements = calendarGrid.querySelectorAll('.scheduling-calendar-day');
                const monthDays = this.scheduling_getMonthDays(this.scheduling_state.currentDate);
                
                dayElements.forEach((dayElement, index) => {
                    if (monthDays[index]) {
                        dayElement.outerHTML = this.scheduling_renderCalendarDay(monthDays[index]);
                    }
                });
            }
        }
    },

    scheduling_revertTaskVisually(taskId, isCompleted) {
        this.scheduling_updateTaskVisually(taskId, isCompleted);
    },

    // INSTANT DELETE CONFIRMATION - Dynamic creation
    scheduling_showDeleteConfirmation(taskId) {
        const task = this.scheduling_state.tasks.find(t => t.id.toString() === taskId.toString());
        if (!task) return;

        const safeTitle = API.escapeHtml(task.title);
        const typeIcon = this.scheduling_getTaskTypeIcon(task.task_type);
        const leadName = this.scheduling_getLeadName(task.lead_id);
        const safeLeadName = API.escapeHtml(leadName || '');

        const confirmModal = document.createElement('div');
        confirmModal.className = 'scheduling-delete-confirm-overlay';
        confirmModal.innerHTML = `
            <div class="scheduling-delete-confirm-modal">
                <div class="scheduling-confirm-header">
                    <h3 class="scheduling-confirm-title">Delete Task</h3>
                </div>
                
                <div class="scheduling-confirm-body">
                    <div class="scheduling-task-preview-card">
                        <div class="scheduling-task-preview-header">
                            <span class="scheduling-task-type-icon">${typeIcon}</span>
                            <span class="scheduling-task-type-text">${this.scheduling_formatTaskType(task.task_type)}</span>
                        </div>
                        <div class="scheduling-task-preview-title">${safeTitle}</div>
                        ${leadName ? `<div class="scheduling-task-preview-lead">Related to: ${safeLeadName}</div>` : ''}
                        <div class="scheduling-task-preview-date">Due: ${this.scheduling_formatTaskDate(task.due_date)}</div>
                    </div>
                    
                    <p class="scheduling-confirm-message">
                        Are you sure you want to permanently delete this task?
                    </p>
                    <p class="scheduling-confirm-warning">
                        This action cannot be undone.
                    </p>
                </div>
                
                <div class="scheduling-confirm-actions">
                    <button class="scheduling-btn-cancel-delete">
                        Cancel
                    </button>
                    <button class="scheduling-btn-confirm-delete" data-task-id="${taskId}">
                        Yes, Delete Task
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmModal);

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        confirmModal.querySelector('.scheduling-btn-cancel-delete').onclick = () => confirmModal.remove();
        confirmModal.querySelector('.scheduling-btn-confirm-delete').onclick = () => {
            this.scheduling_confirmDelete(taskId);
            confirmModal.remove();
        };
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) confirmModal.remove();
        });
    },

    async scheduling_confirmDelete(taskId) {
        const task = this.scheduling_state.tasks.find(t => t.id.toString() === taskId.toString());
        if (!task) return;

        try {
            await API.deleteTask(taskId);
            
            this.scheduling_state.tasks = this.scheduling_state.tasks.filter(t => t.id.toString() !== taskId.toString());
            
            this.scheduling_hideAllModals();
            this.scheduling_render();
            
            this.scheduling_showNotification(`Task "${API.escapeHtml(task.title)}" deleted successfully`, 'success');
            
        } catch (error) {
            console.error('Failed to delete task:', error);
            this.scheduling_showNotification(API.handleAPIError(error, 'DeleteTask'), 'error');
        }
    },

    // View Management - INSTANT transitions
    scheduling_showDashboard() {
        if (this.scheduling_state.isTransitioning) return;
        this.scheduling_state.isTransitioning = true;

        const container = document.getElementById(this.scheduling_state.targetContainer);
        if (container) {
            container.style.opacity = '0';

            setTimeout(() => {
                this.scheduling_state.currentView = 'dashboard';
                this.scheduling_hideAllModals();
                this.scheduling_render();

                setTimeout(() => {
                    container.style.opacity = '1';
                    this.scheduling_state.isTransitioning = false;
                }, 50);
            }, 50);
        }
    },

    scheduling_showTableView() {
        if (this.scheduling_state.isTransitioning) return;
        this.scheduling_state.isTransitioning = true;

        const container = document.getElementById(this.scheduling_state.targetContainer);
        if (container) {
            container.style.opacity = '0';

            setTimeout(() => {
                this.scheduling_state.currentView = 'table';
                this.scheduling_hideAllModals();
                this.scheduling_render();

                setTimeout(() => {
                    container.style.opacity = '1';
                    this.scheduling_state.isTransitioning = false;
                }, 50);
            }, 50);
        }
    },

    // Modal controls
    scheduling_hideAllModals() {
        document.getElementById('scheduling_addModal')?.remove();
        document.getElementById('scheduling_editModal')?.remove();
        document.querySelector('.scheduling-delete-confirm-overlay')?.remove();
        document.querySelector('.scheduling-day-popup-overlay')?.remove();
        document.querySelector('.scheduling-task-view-overlay')?.remove();
        document.querySelector('.scheduling-lead-picker-overlay')?.remove();
        document.querySelector('.scheduling-upgrade-prompt-overlay')?.remove();
    },

    // Day Tasks Popup - INSTANT
    scheduling_showDayTasks(date) {
        if (this.scheduling_state.isTransitioning) return;
        this.scheduling_state.selectedDate = date;
        
        const dayTasks = this.scheduling_getTasksForDate(date);
        
        const popup = document.createElement('div');
        popup.className = 'scheduling-day-popup-overlay';
        popup.innerHTML = `
            <div class="scheduling-day-popup" onclick="event.stopPropagation()">
                <div class="scheduling-popup-header">
                    <h3 class="scheduling-popup-title"><i data-lucide="calendar" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 6px;"></i>${this.scheduling_formatPopupDate(date)}</h3>
                    <button class="scheduling-popup-close" onclick="SchedulingModule.scheduling_closeDayPopup()">×</button>
                </div>

                <div class="scheduling-popup-body">
                    ${dayTasks.length > 0 ?
                        dayTasks.map(task => this.scheduling_renderPopupTaskItem(task)).join('') :
                        `<div class="scheduling-empty-day">
                            <div class="scheduling-empty-icon"><i data-lucide="calendar-days" style="width: 64px; height: 64px; opacity: 0.3;"></i></div>
                            <div class="scheduling-empty-message">No tasks scheduled for this day</div>
                        </div>`
                    }
                </div>
            </div>
        `;
        
        popup.onclick = () => this.scheduling_closeDayPopup();

        document.body.appendChild(popup);

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    scheduling_renderPopupTaskItem(task) {
        const isCompleted = task.status === 'completed';
        const typeIcon = this.scheduling_getTaskTypeIcon(task.task_type);
        const timeStr = task.due_time ? this.scheduling_formatTime(task.due_time) : '';
        const leadName = this.scheduling_getLeadName(task.lead_id);

        const safeTitle = API.escapeHtml(task.title);
        const safeLeadName = API.escapeHtml(leadName || '');
        const safeTime = API.escapeHtml(timeStr);

        return `
            <div class="scheduling-popup-task-item ${isCompleted ? 'scheduling-completed' : ''} scheduling-clickable-item"
                 onclick="SchedulingModule.scheduling_showTaskView('${task.id}')">
                <div class="scheduling-task-checkbox-wrapper" onclick="event.stopPropagation()">
                    <input type="checkbox" 
                           class="scheduling-task-checkbox"
                           ${isCompleted ? 'checked' : ''}
                           onchange="SchedulingModule.scheduling_toggleTaskComplete('${task.id}', this.checked)">
                </div>
                
                <div class="scheduling-task-info">
                    <div class="scheduling-task-main">
                        <span class="scheduling-task-type-icon">${typeIcon}</span>
                        <span class="scheduling-task-title ${isCompleted ? 'scheduling-completed-text' : ''}">${safeTitle}</span>
                        ${safeTime ? `<span class="scheduling-task-time">${safeTime}</span>` : ''}
                    </div>
                    ${leadName ? `<div class="scheduling-task-lead">${safeLeadName}</div>` : ''}
                </div>
                
                <div class="scheduling-task-priority">
                    <span class="scheduling-priority-badge scheduling-priority-${task.priority || 'medium'}">
                        ${this.scheduling_getPriorityIcon(task.priority)}
                    </span>
                </div>
            </div>
        `;
    },

    scheduling_closeDayPopup() {
        const popup = document.querySelector('.scheduling-day-popup-overlay');
        if (popup) {
            popup.style.opacity = '0';
            setTimeout(() => {
                popup.remove();
                this.scheduling_state.selectedDate = null;
            }, 300);
        }
    },

    // Task View - INSTANT
    scheduling_showTaskView(taskId) {
        if (this.scheduling_state.isTransitioning) return;
        const task = this.scheduling_state.tasks.find(t => t.id.toString() === taskId.toString());
        if (!task) return;
        
        this.scheduling_state.currentViewTask = task;
        this.scheduling_closeDayPopup();
        
        const leadName = this.scheduling_getLeadName(task.lead_id);
        const lead = leadName ? this.scheduling_state.leads.find(l => l.id == task.lead_id) : null;
        const typeIcon = this.scheduling_getTaskTypeIcon(task.task_type);
        const priorityIcon = this.scheduling_getPriorityIcon(task.priority);
        const isCompleted = task.status === 'completed';

        const safeTitle = API.escapeHtml(task.title);
        const safeLeadName = API.escapeHtml(leadName || '');
        const safeLeadCompany = lead?.company ? API.escapeHtml(lead.company) : '';
        const safeDescription = API.escapeHtml(task.description || '');

        const taskView = document.createElement('div');
        taskView.className = 'scheduling-task-view-overlay';
        taskView.innerHTML = `
            <div class="scheduling-task-view" onclick="event.stopPropagation()">
                <button class="scheduling-close-btn" onclick="SchedulingModule.scheduling_closeTaskView()">×</button>
                
                <div class="scheduling-task-view-body">
                    <div class="scheduling-task-title-section">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                            <h2 class="scheduling-main-task-title" style="margin: 0;">${safeTitle}</h2>
                            <div class="scheduling-task-status-badge ${isCompleted ? 'scheduling-completed' : 'scheduling-pending'}">
                                ${isCompleted ? 'Completed' : 'Pending'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="scheduling-task-details-grid">
                        ${leadName ? `
                            <div class="scheduling-detail-item">
                                <div class="scheduling-detail-label">Lead:</div>
                                <div class="scheduling-detail-value">${safeLeadName}${safeLeadCompany ? ` (${safeLeadCompany})` : ''}</div>
                            </div>
                        ` : ''}
                        
                        <div class="scheduling-detail-item">
                            <div class="scheduling-detail-label">Due Date:</div>
                            <div class="scheduling-detail-value">
                                ${this.scheduling_formatTaskDate(task.due_date)}
                                ${task.due_time ? ` at ${this.scheduling_formatTime(task.due_time)}` : ''}
                            </div>
                        </div>
                        
                        <div class="scheduling-detail-item">
                            <div class="scheduling-detail-label">Priority:</div>
                            <div class="scheduling-detail-value scheduling-priority-${task.priority || 'medium'}">
                                ${priorityIcon} ${this.scheduling_formatPriority(task.priority)}
                            </div>
                        </div>
                        
                        <div class="scheduling-detail-item">
                            <div class="scheduling-detail-label">Task Type:</div>
                            <div class="scheduling-detail-value">${typeIcon} ${this.scheduling_formatTaskType(task.task_type)}</div>
                        </div>
                    </div>
                    
                    ${task.description ? `
                        <div class="scheduling-detail-item">
                            <div class="scheduling-detail-label">Notes:</div>
                            <div class="scheduling-detail-value">${safeDescription}</div>
                        </div>
                    ` : ''}
                    
                    <div class="scheduling-quick-actions-section">
                        <div class="scheduling-quick-actions-grid">
                            ${lead?.phone ? `
                                <button class="scheduling-quick-action-btn scheduling-call" onclick="SchedulingModule.scheduling_quickCall('${lead.id}')">
                                    <i data-lucide="phone" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Call
                                </button>
                            ` : ''}
                            ${lead?.email ? `
                                <button class="scheduling-quick-action-btn scheduling-email" onclick="SchedulingModule.scheduling_quickEmail('${lead.id}')">
                                    <i data-lucide="mail" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Email
                                </button>
                            ` : ''}
                            <button class="scheduling-quick-action-btn scheduling-complete ${isCompleted ? 'scheduling-undo' : ''}"
                                    onclick="SchedulingModule.scheduling_toggleTaskComplete('${task.id}', ${!isCompleted}); SchedulingModule.scheduling_closeTaskView();">
                                ${isCompleted ? '<i data-lucide="rotate-ccw" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Mark Pending' : '<i data-lucide="check-circle" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Mark Complete'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="scheduling-task-view-actions">
                    <button class="scheduling-edit-task-btn" id="taskViewEditBtn">
                        Edit Task
                    </button>
                    <button class="scheduling-delete-task-btn" id="taskViewDeleteBtn">
                        Delete Task
                    </button>
                </div>
            </div>
        `;
        
        taskView.onclick = () => this.scheduling_closeTaskView();

        document.body.appendChild(taskView);

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Attach handlers after insertion
        document.getElementById('taskViewEditBtn').onclick = () => {
            this.scheduling_closeTaskView();
            this.scheduling_editTask(task.id);
        };

        document.getElementById('taskViewDeleteBtn').onclick = () => {
            this.scheduling_closeTaskView();
            this.scheduling_showDeleteConfirmation(task.id);
        };
    },

    scheduling_closeTaskView() {
        const taskView = document.querySelector('.scheduling-task-view-overlay');
        if (taskView) {
            taskView.style.opacity = '0';
            setTimeout(() => {
                taskView.remove();
                this.scheduling_state.currentViewTask = null;
            }, 300);
        }
    },

    // Quick Actions
    async scheduling_quickCall(leadId) {
        const lead = this.scheduling_state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        if (lead.phone) {
            window.open(`tel:${lead.phone}`, '_self');
            this.scheduling_showNotification(`Calling ${API.escapeHtml(lead.name)}...`, 'info');
        } else {
            this.scheduling_showNotification(`No phone number for ${API.escapeHtml(lead.name)}`, 'warning');
        }
    },

    async scheduling_quickEmail(leadId) {
        const lead = this.scheduling_state.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        if (lead.email) {
            const subject = encodeURIComponent(`Following up - ${lead.name}`);
            const body = encodeURIComponent(`Hi ${lead.name.split(' ')[0]},\n\nI wanted to follow up with you.\n\nBest regards,`);
            window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_self');
            this.scheduling_showNotification(`Email to ${API.escapeHtml(lead.name)} opened`, 'info');
        } else {
            this.scheduling_showNotification(`No email address for ${API.escapeHtml(lead.name)}`, 'warning');
        }
    },

    // Lead Picker - INSTANT
    scheduling_openLeadPicker(formType) {
        const leads = this.scheduling_state.leads;
        
        const picker = document.createElement('div');
        picker.className = 'scheduling-lead-picker-overlay';
        picker.innerHTML = `
            <div class="scheduling-lead-picker-popup" onclick="event.stopPropagation()">
                <div class="scheduling-lead-picker-header">
                    <h3 class="scheduling-lead-picker-title">🔍 Select Lead</h3>
                    <button class="scheduling-lead-picker-close" onclick="SchedulingModule.scheduling_closeLeadPicker()">×</button>
                </div>
                
                <div class="scheduling-lead-picker-search">
                    <input type="text" 
                           class="scheduling-lead-search-input" 
                           placeholder="Search leads by name, company, or email..."
                           oninput="SchedulingModule.scheduling_filterLeads(this.value)">
                    <span class="scheduling-search-icon">🔍</span>
                </div>
                
                <div class="scheduling-lead-picker-results" id="scheduling_leadResults">
                    ${this.scheduling_renderLeadResults(leads)}
                </div>
                
                <div class="scheduling-lead-picker-actions">
                    <button class="scheduling-lead-picker-btn scheduling-secondary"
                            onclick="SchedulingModule.scheduling_selectLead(null, '${formType}')">
                        <i data-lucide="x-circle" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Clear Selection
                    </button>
                </div>
            </div>
        `;
        
        picker.onclick = () => this.scheduling_closeLeadPicker();

        this.scheduling_state.currentLeadPickerType = formType;
        document.body.appendChild(picker);

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // Disable parent modal
        const addModal = document.getElementById('scheduling_addModal');
        const editModal = document.getElementById('scheduling_editModal');
        if (addModal) addModal.style.pointerEvents = 'none';
        if (editModal) editModal.style.pointerEvents = 'none';
    },

    scheduling_renderLeadResults(leads) {
        if (leads.length === 0) {
            return `
                <div class="scheduling-lead-picker-empty">
                    <div class="scheduling-empty-icon">👤</div>
                    <div class="scheduling-empty-message">No leads available</div>
                </div>
            `;
        }
        
        return leads
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(lead => {
                const statusColor = API.getStatusColor(lead.status);
                // Use Lucide icons instead of emojis for lead type
                const typeIconMap = {
                    'cold': '<i data-lucide="snowflake" style="width: 16px; height: 16px; color: #3b82f6;"></i>',
                    'warm': '<i data-lucide="flame" style="width: 16px; height: 16px; color: #f59e0b;"></i>',
                    'hot': '<i data-lucide="zap" style="width: 16px; height: 16px; color: #ef4444;"></i>'
                };
                const typeIcon = typeIconMap[lead.type?.toLowerCase()] || '';

                const safeName = API.escapeHtml(lead.name);
                const safeCompany = lead.company ? API.escapeHtml(lead.company) : '';
                const safeEmail = lead.email ? API.escapeHtml(lead.email) : '';
                const safeStatus = API.escapeHtml(lead.status || 'new');

                return `
                    <div class="scheduling-lead-picker-item"
                         data-lead-id="${lead.id}"
                         onclick="SchedulingModule.scheduling_handleLeadClick(this)">
                        <div class="scheduling-lead-item-main">
                            <div class="scheduling-lead-item-header">
                                <span class="scheduling-lead-name">${safeName}</span>
                                <span class="scheduling-lead-type">${typeIcon}</span>
                            </div>
                            ${safeCompany ? `<div class="scheduling-lead-company">${safeCompany}</div>` : ''}
                            ${safeEmail ? `<div class="scheduling-lead-email">${safeEmail}</div>` : ''}
                        </div>
                        <div class="scheduling-lead-item-status">
                            <span class="scheduling-status-badge" style="background-color: ${statusColor}20; color: ${statusColor};">
                                ${safeStatus}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
    },

    scheduling_handleLeadClick(element) {
        const leadId = element.getAttribute('data-lead-id');
        const lead = this.scheduling_state.leads.find(l => l.id == leadId);
        
        if (lead) {
            this.scheduling_selectLead(lead, this.scheduling_state.currentLeadPickerType);
        }
    },

    scheduling_filterLeads(searchTerm) {
        const filtered = this.scheduling_state.leads.filter(lead => {
            const searchText = `${lead.name} ${lead.company || ''} ${lead.email || ''}`.toLowerCase();
            return searchText.includes(searchTerm.toLowerCase());
        });
        
        const resultsContainer = document.getElementById('scheduling_leadResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.scheduling_renderLeadResults(filtered);
        }
    },

    scheduling_selectLead(lead, formType) {
        const inputId = `scheduling_selectedLeadId_${formType}`;
        const displayClass = `scheduling-lead-selector-display-${formType}`;
        
        const hiddenInput = document.getElementById(inputId);
        const display = document.querySelector(`.${displayClass}`);
        
        if (!hiddenInput || !display) return;
        
        if (lead) {
            const safeName = API.escapeHtml(lead.name);
            const safeCompany = lead.company ? API.escapeHtml(lead.company) : '';
            
            hiddenInput.value = lead.id;
            display.innerHTML = `
                <div class="scheduling-selected-lead">
                    <span class="scheduling-selected-lead-name">${safeName}</span>
                    ${safeCompany ? `<span class="scheduling-selected-lead-company">(${safeCompany})</span>` : ''}
                </div>
                <span class="scheduling-selector-arrow">▼</span>
            `;
        } else {
            hiddenInput.value = '';
            display.innerHTML = `
                <div class="scheduling-no-lead-selected">
                    <span class="scheduling-placeholder-text">Click to select a lead...</span>
                </div>
                <span class="scheduling-selector-arrow">▼</span>
            `;
        }
        
        this.scheduling_closeLeadPicker();
    },

    scheduling_closeLeadPicker() {
        const picker = document.querySelector('.scheduling-lead-picker-overlay');
        if (picker) {
            picker.style.opacity = '0';
            
            setTimeout(() => {
                picker.remove();
                
                // Restore parent modal pointer events
                const addModal = document.getElementById('scheduling_addModal');
                const editModal = document.getElementById('scheduling_editModal');
                if (addModal) addModal.style.pointerEvents = 'auto';
                if (editModal) editModal.style.pointerEvents = 'auto';
            }, 300);
        }
    },

    // Calendar Navigation
    scheduling_previousMonth() {
        const newDate = new Date(this.scheduling_state.currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        this.scheduling_state.currentDate = newDate;
        this.scheduling_render();
    },

    scheduling_nextMonth() {
        const newDate = new Date(this.scheduling_state.currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        this.scheduling_state.currentDate = newDate;
        this.scheduling_render();
    },

    scheduling_goToToday() {
        this.scheduling_state.currentDate = new Date();
        this.scheduling_render();
    },

    // Search
    scheduling_handleSearch(e) {
        this.scheduling_state.searchTerm = e.target.value.toLowerCase();
        this.scheduling_updateTableContent();
    },

    // Filters
    scheduling_showTypeFilter(event) {
        this.scheduling_showMultiFilterDropdown('types', event, [
            { value: '', label: 'All Types', action: 'clear' },
            { value: '', label: '──────────', divider: true },
            { value: 'call', label: 'Call' },
            { value: 'email', label: 'Email' },
            { value: 'meeting', label: 'Meeting' },
            { value: 'follow_up', label: 'Follow-up' },
            { value: 'demo', label: 'Demo' },
            { value: 'research', label: 'Research' },
            { value: 'estimate', label: 'Estimate' },
            { value: 'contract', label: 'Contract' },
            { value: 'task', label: 'Task' }
        ]);
    },

    scheduling_showDateFilter(event) {
        this.scheduling_showSingleFilterDropdown('date', event, [
            { value: '', label: 'All Tasks', action: 'clear' },
            { value: '', label: '──────────', divider: true },
            { value: 'completed_only', label: 'Completed Only' },
            { value: 'pending_only', label: 'Pending Only' }
        ]);
    },

    scheduling_showPriorityFilter(event) {
        this.scheduling_showMultiFilterDropdown('priorities', event, [
            { value: '', label: 'All Priorities', action: 'clear' },
            { value: '', label: '──────────', divider: true },
            { value: 'urgent', label: 'Urgent' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' }
        ]);
    },

    scheduling_showMultiFilterDropdown(column, event, options) {
        if (event) event.stopPropagation();
        this.scheduling_hideAllFilterDropdowns();
        
        event.target.closest('.scheduling-header-filter').classList.add('scheduling-active');
        
        const dropdown = document.createElement('div');
        dropdown.className = 'scheduling-filter-dropdown scheduling-multi-select scheduling-show';
        dropdown.innerHTML = `
            <div class="scheduling-filter-options">
                ${options.map(option => {
                    if (option.divider) {
                        return `<div class="scheduling-filter-divider"></div>`;
                    } else if (option.action === 'clear') {
                        return `
                            <div class="scheduling-filter-option scheduling-clear-option" data-action="clear-${column}">
                                <span class="scheduling-option-text">${API.escapeHtml(option.label)}</span>
                            </div>
                        `;
                    } else {
                        const isChecked = this.scheduling_state.currentFilters[column].includes(option.value);
                        return `
                            <div class="scheduling-filter-checkbox-option" data-column="${column}" data-value="${option.value}">
                                <div class="scheduling-custom-checkbox ${isChecked ? 'scheduling-checked' : ''}">
                                    ${isChecked ? '✓' : ''}
                                </div>
                                <span class="scheduling-option-text">${API.escapeHtml(option.label)}</span>
                            </div>
                        `;
                    }
                }).join('')}
            </div>
        `;
        
        this.scheduling_positionDropdown(dropdown, event.target);
        
        // Event delegation
        dropdown.addEventListener('click', (e) => {
            const clearOption = e.target.closest('[data-action^="clear-"]');
            if (clearOption) {
                this.scheduling_clearMultiFilter(column);
                return;
            }
            
            const checkboxOption = e.target.closest('.scheduling-filter-checkbox-option');
            if (checkboxOption) {
                const col = checkboxOption.dataset.column;
                const val = checkboxOption.dataset.value;
                this.scheduling_toggleMultiFilter(col, val, checkboxOption);
            }
        });
    },

    scheduling_showSingleFilterDropdown(column, event, options) {
        if (event) event.stopPropagation();
        this.scheduling_hideAllFilterDropdowns();
        
        event.target.closest('.scheduling-header-filter').classList.add('scheduling-active');
        
        const dropdown = document.createElement('div');
        dropdown.className = 'scheduling-filter-dropdown scheduling-multi-select scheduling-show';
        dropdown.innerHTML = `
            <div class="scheduling-filter-options">
                ${options.map(option => {
                    if (option.divider) {
                        return `<div class="scheduling-filter-divider"></div>`;
                    }
                    const isActive = this.scheduling_state.currentFilters[column] === option.value && option.value !== '';
                    return `
                        <div class="scheduling-filter-option ${isActive ? 'scheduling-active' : ''}" data-value="${option.value}">
                            <span class="scheduling-option-text">${API.escapeHtml(option.label)}</span>
                            ${isActive ? '<span class="scheduling-active-check">✓</span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        this.scheduling_positionDropdown(dropdown, event.target);
        
        dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.scheduling-filter-option');
            if (option) {
                this.scheduling_applySingleFilter(column, option.dataset.value);
            }
        });
    },

    scheduling_toggleMultiFilter(column, value, optionElement) {
        const currentValues = this.scheduling_state.currentFilters[column];
        const index = currentValues.indexOf(value);
        
        if (index > -1) {
            this.scheduling_state.currentFilters[column] = currentValues.filter(v => v !== value);
        } else {
            this.scheduling_state.currentFilters[column].push(value);
        }
        
        const checkbox = optionElement.querySelector('.scheduling-custom-checkbox');
        const isChecked = this.scheduling_state.currentFilters[column].includes(value);
        
        if (isChecked) {
            checkbox.classList.add('scheduling-checked');
            checkbox.textContent = '✓';
        } else {
            checkbox.classList.remove('scheduling-checked');
            checkbox.textContent = '';
        }
        
        this.scheduling_updateTableContent();
        this.scheduling_updateHeaderIndicators();
        this.scheduling_updateActiveFiltersPanel();
    },

    scheduling_clearMultiFilter(column) {
        this.scheduling_state.currentFilters[column] = [];
        this.scheduling_hideAllFilterDropdowns();
        this.scheduling_updateTableContent();
        this.scheduling_updateHeaderIndicators();
        this.scheduling_updateActiveFiltersPanel();
    },

    scheduling_applySingleFilter(column, value) {
        this.scheduling_state.currentFilters[column] = value;
        this.scheduling_hideAllFilterDropdowns();
        this.scheduling_updateTableContent();
        this.scheduling_updateHeaderIndicators();
        this.scheduling_updateActiveFiltersPanel();
    },

    scheduling_positionDropdown(dropdown, trigger) {
        const rect = trigger.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.zIndex = '10000';
        
        document.body.appendChild(dropdown);
        
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!e.target.closest('.scheduling-filter-dropdown') && !e.target.closest('.scheduling-header-filter')) {
                    this.scheduling_hideAllFilterDropdowns();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    },

    scheduling_hideAllFilterDropdowns() {
        document.querySelectorAll('.scheduling-filter-dropdown').forEach(d => d.remove());
        document.querySelectorAll('.scheduling-header-filter').forEach(filter => {
            filter.classList.remove('scheduling-active');
        });
    },

    scheduling_updateHeaderIndicators() {
        ['types', 'priorities'].forEach(column => {
            let methodName = column === 'types' ? 'Type' : 'Priority';
            
            const arrow = document.querySelector(`[onclick*="scheduling_show${methodName}Filter"] .scheduling-filter-arrow`);
            if (arrow) {
                const hasFilters = this.scheduling_state.currentFilters[column].length > 0;
                
                if (hasFilters) {
                    arrow.textContent = '▲';
                    arrow.style.color = 'var(--primary)';
                } else {
                    arrow.textContent = '▼';
                    arrow.style.color = 'var(--text-secondary)';
                }
            }
        });
        
        const dateArrow = document.querySelector(`[onclick*="scheduling_showDateFilter"] .scheduling-filter-arrow`);
        if (dateArrow) {
            if (this.scheduling_state.currentFilters.date) {
                dateArrow.textContent = '▲';
                dateArrow.style.color = 'var(--primary)';
            } else {
                dateArrow.textContent = '▼';
                dateArrow.style.color = 'var(--text-secondary)';
            }
        }
    },

    scheduling_updateActiveFiltersPanel() {
        const existingPanel = document.querySelector('.scheduling-active-filters-panel');
        const tableView = document.querySelector('.scheduling-table-view');
        const hasFilters = this.scheduling_hasActiveFilters();
        
        if (hasFilters && !existingPanel && tableView) {
            const panelHTML = this.scheduling_renderActiveFiltersPanel();
            const tableContainer = tableView.querySelector('.scheduling-table-container');
            if (tableContainer) {
                tableContainer.insertAdjacentHTML('beforebegin', panelHTML);
            }
        } else if (!hasFilters && existingPanel) {
            existingPanel.remove();
        } else if (hasFilters && existingPanel) {
            const countElement = existingPanel.querySelector('.scheduling-filter-count');
            const filtersTextElement = existingPanel.querySelector('.scheduling-active-filters-text');
            
            if (countElement) {
                const filtered = this.scheduling_getFilteredAndSortedTasks();
                countElement.textContent = `Showing ${filtered.length} of ${this.scheduling_state.tasks.length} tasks`;
            }
            
            if (filtersTextElement) {
                const activeFilterTexts = [];
                
                if (this.scheduling_state.currentFilters.types.length > 0) {
                    if (this.scheduling_state.currentFilters.types.length === 1) {
                        activeFilterTexts.push(`Type: ${this.scheduling_formatTaskType(this.scheduling_state.currentFilters.types[0])}`);
                    } else {
                        activeFilterTexts.push(`Types: ${this.scheduling_state.currentFilters.types.length} selected`);
                    }
                }
                
                if (this.scheduling_state.currentFilters.priorities.length > 0) {
                    if (this.scheduling_state.currentFilters.priorities.length === 1) {
                        activeFilterTexts.push(`Priority: ${this.scheduling_formatPriority(this.scheduling_state.currentFilters.priorities[0])}`);
                    } else {
                        activeFilterTexts.push(`Priorities: ${this.scheduling_state.currentFilters.priorities.length} selected`);
                    }
                }
                
                if (this.scheduling_state.currentFilters.date) {
                    const dateLabels = {
                        'completed_only': 'Completed Only',
                        'pending_only': 'Pending Only'
                    };
                    activeFilterTexts.push(`Status: ${dateLabels[this.scheduling_state.currentFilters.date]}`);
                }
                
                filtersTextElement.textContent = activeFilterTexts.join(', ');
            }
        }
    },

    scheduling_renderActiveFiltersPanel() {
        if (!this.scheduling_hasActiveFilters()) return '';
        
        const filtered = this.scheduling_getFilteredAndSortedTasks();
        const activeFilterTexts = [];
        
        if (this.scheduling_state.currentFilters.types.length > 0) {
            if (this.scheduling_state.currentFilters.types.length === 1) {
                activeFilterTexts.push(`Type: ${this.scheduling_formatTaskType(this.scheduling_state.currentFilters.types[0])}`);
            } else {
                activeFilterTexts.push(`Types: ${this.scheduling_state.currentFilters.types.length} selected`);
            }
        }
        
        if (this.scheduling_state.currentFilters.priorities.length > 0) {
            if (this.scheduling_state.currentFilters.priorities.length === 1) {
                activeFilterTexts.push(`Priority: ${this.scheduling_formatPriority(this.scheduling_state.currentFilters.priorities[0])}`);
            } else {
                activeFilterTexts.push(`Priorities: ${this.scheduling_state.currentFilters.priorities.length} selected`);
            }
        }
        
        if (this.scheduling_state.currentFilters.date) {
            const dateLabels = {
                'completed_only': 'Completed Only',
                'pending_only': 'Pending Only'
            };
            activeFilterTexts.push(`Status: ${dateLabels[this.scheduling_state.currentFilters.date]}`);
        }
        
        return `
            <div class="scheduling-active-filters-panel">
                <div class="scheduling-filters-info">
                    <span class="scheduling-filter-count">Showing ${filtered.length} of ${this.scheduling_state.tasks.length} tasks</span>
                    <span class="scheduling-active-filters-text">${API.escapeHtml(activeFilterTexts.join(', '))}</span>
                </div>
                <button class="scheduling-clear-filters-btn" onclick="SchedulingModule.scheduling_clearAllFilters()">
                    Clear All
                </button>
            </div>
        `;
    },

    scheduling_hasActiveFilters() {
        return this.scheduling_state.currentFilters.types.length > 0 || 
               this.scheduling_state.currentFilters.priorities.length > 0 || 
               this.scheduling_state.currentFilters.date !== '' || 
               this.scheduling_state.searchTerm !== '';
    },

    scheduling_clearAllFilters() {
        this.scheduling_state.currentFilters = {
            types: [],
            priorities: [],
            date: ''
        };
        this.scheduling_state.searchTerm = '';
        
        const searchInput = document.getElementById('scheduling_searchInput');
        if (searchInput) searchInput.value = '';
        
        this.scheduling_updateTableContent();
        this.scheduling_updateHeaderIndicators();
        this.scheduling_updateActiveFiltersPanel();
    },

    scheduling_getFilteredAndSortedTasks() {
        let filtered = [...this.scheduling_state.tasks];

        // Search filter
        if (this.scheduling_state.searchTerm) {
            filtered = filtered.filter(task => {
                const searchText = `${task.title} ${this.scheduling_getLeadName(task.lead_id) || ''}`.toLowerCase();
                return searchText.includes(this.scheduling_state.searchTerm);
            });
        }
        
        // Type filter
        if (this.scheduling_state.currentFilters.types.length > 0) {
            filtered = filtered.filter(task => 
                this.scheduling_state.currentFilters.types.includes(task.task_type)
            );
        }
        
        // Priority filter
        if (this.scheduling_state.currentFilters.priorities.length > 0) {
            filtered = filtered.filter(task => 
                this.scheduling_state.currentFilters.priorities.includes(task.priority || 'medium')
            );
        }
        
        // Date status filter
        if (this.scheduling_state.currentFilters.date === 'completed_only') {
            filtered = filtered.filter(task => task.status === 'completed');
        } else if (this.scheduling_state.currentFilters.date === 'pending_only') {
            filtered = filtered.filter(task => task.status !== 'completed');
        }
        
        // Sort: overdue first, then by date
        return filtered.sort((a, b) => {
            const aCompleted = a.status === 'completed';
            const bCompleted = b.status === 'completed';
            
            if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
            
            const aDate = a.due_date || '9999-12-31';
            const bDate = b.due_date || '9999-12-31';
            const aDateOnly = aDate.split('T')[0];
            const bDateOnly = bDate.split('T')[0];
            
            if (!aCompleted && !bCompleted) {
                const today = new Date().toISOString().split('T')[0];
                const aOverdue = aDateOnly < today;
                const bOverdue = bDateOnly < today;
                
                if (aOverdue && !bOverdue) return -1;
                if (!aOverdue && bOverdue) return 1;
                
                return aDateOnly.localeCompare(bDateOnly);
            } else {
                if (aDate === '9999-12-31' && bDate !== '9999-12-31') return 1;
                if (bDate === '9999-12-31' && aDate !== '9999-12-31') return -1;
                if (aDate === '9999-12-31' && bDate === '9999-12-31') return 0;
                
                return bDateOnly.localeCompare(aDateOnly);
            }
        });
    },

    scheduling_updateTableContent() {
        const tableContainer = document.querySelector('.scheduling-table-container');
        if (tableContainer) {
            const filteredTasks = this.scheduling_getFilteredAndSortedTasks();
            tableContainer.innerHTML = filteredTasks.length > 0 ? 
                this.scheduling_renderTasksTable(filteredTasks) : 
                this.scheduling_renderEmptyState();
            
            const tableTitle = document.querySelector('.scheduling-table-title');
            if (tableTitle) {
                tableTitle.textContent = `All Tasks (${filteredTasks.length})`;
            }
        }
        
        this.scheduling_updateActiveFiltersPanel();
        this.scheduling_updateHeaderIndicators();
    },

    scheduling_refreshTable() {
        this.scheduling_updateTableContent();
        this.scheduling_showNotification('Table refreshed!', 'success');
    },

    // Empty State
    scheduling_renderEmptyState() {
        const safeSearchTerm = API.escapeHtml(this.scheduling_state.searchTerm);
        
        return `
            <div class="scheduling-empty-state">
                <div class="scheduling-empty-icon">📋</div>
                <div class="scheduling-empty-title">No tasks found</div>
                <div class="scheduling-empty-subtitle">
                    ${this.scheduling_state.searchTerm ? 
                        `No tasks match "${safeSearchTerm}". Try a different search term.` :
                        'Start organizing your schedule by adding your first task.'
                    }
                </div>
                ${!this.scheduling_state.searchTerm ? `
                    <button class="scheduling-empty-action-btn" onclick="SchedulingModule.scheduling_showAddTaskModal()">
                        ➕ Add Your First Task
                    </button>
                ` : ''}
            </div>
        `;
    },

    // Loading States
    scheduling_setLoadingState(isLoading) {
        const submitBtn = document.getElementById('scheduling_submitBtn');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            if (isLoading) {
                submitBtn.innerHTML = `
                    <div class="scheduling-btn-loading-spinner"></div>
                    <span>Adding...</span>
                `;
            } else {
                submitBtn.innerHTML = `<span class="scheduling-btn-text">Add Task</span>`;
            }
        }
    },

    scheduling_setEditLoadingState(isLoading) {
        const submitBtn = document.getElementById('scheduling_editSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            if (isLoading) {
                submitBtn.innerHTML = `
                    <div class="scheduling-btn-loading-spinner"></div>
                    <span>Updating...</span>
                `;
            } else {
                submitBtn.innerHTML = `<span class="scheduling-btn-text">Update Task</span>`;
            }
        }
    },

    scheduling_renderError(message) {
        const container = document.getElementById(this.scheduling_state.targetContainer);
        if (container) {
            const safeMessage = API.escapeHtml(message);
            container.innerHTML = `
                <div class="scheduling-container">
                    <div class="scheduling-error-container">
                        <div class="scheduling-error-icon"><i data-lucide="alert-triangle" style="width: 64px; height: 64px; color: var(--warning);"></i></div>
                        <h2 class="scheduling-error-title">Connection Error</h2>
                        <p class="scheduling-error-message">${safeMessage}</p>
                        <button onclick="SchedulingModule.init()" class="scheduling-retry-btn">
                            <span><i data-lucide="refresh-cw" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i>Try Again</span>
                        </button>
                    </div>
                </div>
            `;
        }
    },

    // Notifications
    scheduling_showNotification(message, type = 'info') {
        const now = Date.now();
        
        // Prevent duplicate notifications
        if (this.scheduling_state.lastNotificationMessage === message && 
            (now - this.scheduling_state.lastNotificationTime) < 2000) {
            return;
        }
        
        this.scheduling_state.lastNotificationMessage = message;
        this.scheduling_state.lastNotificationTime = now;
        
        if (window.SteadyUtils?.showToast) {
            window.SteadyUtils.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    },

    scheduling_showUpgradePrompt() {
        const modal = document.createElement('div');
        modal.className = 'scheduling-upgrade-prompt-overlay';
        modal.innerHTML = `
            <div class="scheduling-upgrade-prompt">
                <div class="scheduling-upgrade-header">
                    <div class="scheduling-upgrade-icon"><i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--primary);"></i></div>
                    <h3>Task Limit Reached</h3>
                </div>
                <div class="scheduling-upgrade-content">
                    <p>You've reached the maximum of 10,000 tasks. This is typically more than enough for most users!</p>
                    <p>If you need to create more tasks, consider archiving or deleting old completed tasks.</p>
                </div>
                <div class="scheduling-upgrade-actions">
                    <button class="scheduling-btn-secondary">
                        Got it
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        modal.querySelector('.scheduling-btn-secondary').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    // Utility Functions
    scheduling_getTasksForDate(date) {
        return this.scheduling_state.tasks.filter(task => {
            if (!task.due_date) return false;
            const taskDate = task.due_date.includes('T') ? 
                task.due_date.split('T')[0] : 
                task.due_date;
            return taskDate === date;
        });
    },

    scheduling_getLeadName(leadId) {
        if (!leadId) return null;
        const lead = this.scheduling_state.leads.find(l => l.id == leadId);
        return lead ? lead.name : null;
    },

    scheduling_isTaskOverdue(task) {
        if (!task.due_date) return false;
        const today = new Date().toISOString().split('T')[0];
        return task.due_date < today && task.status !== 'completed';
    },

    scheduling_getTaskTypeIcon(type) {
        const iconMap = {
            'call': '<i data-lucide="phone" style="width: 16px; height: 16px; vertical-align: middle;"></i>',
            'email': '<i data-lucide="mail" style="width: 16px; height: 16px; vertical-align: middle;"></i>',
            'meeting': '<i data-lucide="users" style="width: 16px; height: 16px; vertical-align: middle;"></i>',
            'demo': '<i data-lucide="video" style="width: 16px; height: 16px; vertical-align: middle;"></i>',
            'follow_up': '<i data-lucide="clipboard-list" style="width: 16px; height: 16px; vertical-align: middle;"></i>',
            'research': '<i data-lucide="search" style="width: 16px; height: 16px; vertical-align: middle;"></i>',
            'proposal': '<i data-lucide="bar-chart" style="width: 16px; height: 16px; vertical-align: middle;"></i>',
            'estimate': '<i data-lucide="bar-chart" style="width: 16px; height: 16px; vertical-align: middle;"></i>',
            'contract': '<i data-lucide="file-text" style="width: 16px; height: 16px; vertical-align: middle;"></i>',
            'task': '<i data-lucide="check-square" style="width: 16px; height: 16px; vertical-align: middle;"></i>'
        };
        return iconMap[type] || '<i data-lucide="star" style="width: 16px; height: 16px; vertical-align: middle;"></i>';
    },

    scheduling_formatTaskType(type) {
        const typeMap = {
            'call': 'Call',
            'email': 'Email',
            'meeting': 'Meeting',
            'demo': 'Demo',
            'follow_up': 'Follow-up',
            'research': 'Research',
            'estimate': 'Proposal',
            'contract': 'Contract',
            'task': 'Task'
        };
        // Return custom task type as-is if not in the map (capitalize first letter)
        if (typeMap[type]) {
            return typeMap[type];
        }
        // Capitalize first letter of custom types and escape for XSS protection
        return type ? API.escapeHtml(type.charAt(0).toUpperCase() + type.slice(1)) : 'Task';
    },

    scheduling_getPriorityIcon(priority) {
        return '';
    },

    scheduling_formatPriority(priority) {
        const priorityMap = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'urgent': 'Urgent'
        };
        return priorityMap[priority] || 'Medium';
    },

    scheduling_formatTime(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    },

    scheduling_formatTaskDate(dateString) {
        if (!dateString) return 'No date';
        
        const dateParts = dateString.split('T')[0].split('-');
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const currentYear = today.getFullYear();
        const taskYear = date.getFullYear();
        
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (dateStr === todayStr) return 'Today';
        if (dateStr === tomorrowStr) return 'Tomorrow';
        if (dateStr === yesterdayStr) return 'Yesterday';
        
        if (taskYear !== currentYear) {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
            });
        }
    },

    scheduling_formatPopupDate(dateString) {
        if (!dateString) return '';
        
        const dateParts = dateString.split('T')[0].split('-');
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const currentYear = today.getFullYear();
        const taskYear = date.getFullYear();
        
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (dateStr === todayStr) return 'Today';
        if (dateStr === tomorrowStr) return 'Tomorrow';
        if (dateStr === yesterdayStr) return 'Yesterday';
        
        if (taskYear !== currentYear) {
            return date.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
            });
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric'
            });
        }
    },

    scheduling_formatMonth(date) {
        return date.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
    },

    scheduling_getMonthDays(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const firstDayOfWeek = firstDay.getDay();
        
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        const days = [];
        
        // Previous month trailing days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dateStr = new Date(year, month - 1, day).toISOString().split('T')[0];
            days.push({
                day,
                date: dateStr,
                isCurrentMonth: false
            });
        }
        
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = new Date(year, month, day).toISOString().split('T')[0];
            days.push({
                day,
                date: dateStr,
                isCurrentMonth: true
            });
        }
        
        // Next month leading days
        const totalCells = 42;
        const remainingCells = totalCells - days.length;
        for (let day = 1; day <= remainingCells; day++) {
            const dateStr = new Date(year, month + 1, day).toISOString().split('T')[0];
            days.push({
                day,
                date: dateStr,
                isCurrentMonth: false
            });
        }
        
        return days;
    },

    scheduling_debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    // Event Handling
    handleEvent(eventType, data) {
        if (eventType === 'navigation') {
            if (data.targetPage !== 'tasks') {
                this.scheduling_state.currentView = 'dashboard';
                this.scheduling_hideAllModals();
            } else {
                this.scheduling_state.currentFilters = {
                    types: [],
                    priorities: [],
                    date: ''
                };
                this.scheduling_state.searchTerm = '';
            }
        }
    },

    // Styles (KEEPING ALL EXISTING CSS - Same as v2.0)
    scheduling_renderStyles() {
        return `
            <style>
                /* Scheduling Module v3.0 - Sharp Edition Styles (All CSS from v2.0 preserved) */
                
                .scheduling-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                }

                .scheduling-form-input,
                .scheduling-form-textarea,
                .scheduling-search-input,
                .scheduling-lead-search-input {
                    -webkit-user-select: text;
                    -moz-user-select: text;
                    -ms-user-select: text;
                    user-select: text;
                }

                /* (ALL REMAINING CSS FROM V2.0 - KEEPING EXACTLY THE SAME) */
                /* Copy entire CSS block from line 1600-3800 of original v2.0 */
                
                /* Action Bubbles */
                .scheduling-action-bubbles {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .scheduling-action-bubble {
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

                .scheduling-action-bubble:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl);
                    border-color: var(--primary);
                }

                .scheduling-bubble-primary {
                    border-color: rgba(102, 126, 234, 0.3);
                    background: rgba(102, 126, 234, 0.02);
                }

                .scheduling-bubble-secondary {
                    border-color: rgba(16, 185, 129, 0.3);
                    background: rgba(16, 185, 129, 0.02);
                }

                .scheduling-bubble-icon {
                    font-size: 3rem;
                    width: 80px;
                    height: 80px;
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .scheduling-bubble-content {
                    flex: 1;
                }

                .scheduling-bubble-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }

                .scheduling-bubble-subtitle {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                }

                .scheduling-bubble-button {
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

                .scheduling-bubble-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                }

                .scheduling-arrow {
                    transition: transform 0.3s ease;
                }

                .scheduling-action-bubble:hover .scheduling-arrow {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }

                /* Calendar Section */
                .scheduling-calendar-section {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    box-shadow: var(--shadow-lg);
                    overflow: visible;
                }

                .scheduling-calendar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .scheduling-calendar-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .scheduling-calendar-nav {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }

                .scheduling-nav-btn,
                .scheduling-today-btn {
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    font-weight: 500;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
                }

                .scheduling-nav-btn:hover,
                .scheduling-today-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 3px 6px rgba(102, 126, 234, 0.25);
                }

                .scheduling-calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px;
                    background: var(--border);
                    border-radius: var(--radius);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    padding: 6px;
                    overflow: visible;
                    margin: 6px;
                }

                .scheduling-day-header {
                    background: var(--surface-hover);
                    padding: 1rem;
                    text-align: center;
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .scheduling-calendar-day {
                    background: var(--surface);
                    min-height: 100px;
                    padding: 0.75rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    flex-direction: column;
                }

                .scheduling-calendar-day:hover {
                    background: var(--surface-hover);
                    transform: scale(1.02);
                    z-index: 10;
                    border: 2px solid transparent;
                    box-shadow: 
                        0 0 0 2px rgba(102, 126, 234, 0.4),
                        0 0 0 4px rgba(139, 92, 246, 0.2),
                        var(--shadow-lg);
                }

                .scheduling-calendar-day.scheduling-today {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
                    border: 2px solid var(--primary);
                }

                .scheduling-calendar-day.scheduling-other-month {
                    opacity: 0.3;
                    background: var(--surface-hover);
                }

                .scheduling-calendar-day.scheduling-other-month:hover {
                    opacity: 0.6;
                }

                .scheduling-day-number {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    line-height: 1;
                    position: relative;
                }

                .scheduling-calendar-day.scheduling-today .scheduling-day-number {
                    color: var(--primary);
                    font-size: 1.2rem;
                }

                .scheduling-pending-badge {
                    position: absolute;
                    background: #ff3b30;
                    color: white;
                    border-radius: 50%;
                    font-size: 0.75rem;
                    font-weight: 600;
                    min-width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    box-shadow: 0 2px 8px rgba(255, 59, 48, 0.4);
                }

                .scheduling-completed-badge {
                    position: absolute;
                    background: #34d399;
                    color: white;
                    border-radius: 50%;
                    font-size: 0.75rem;
                    font-weight: 600;
                    min-width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    box-shadow: 0 2px 8px rgba(52, 211, 153, 0.4);
                }

                .scheduling-top-right {
                    top: 8px;
                    right: 8px;
                }

                .scheduling-below-red {
                    top: 32px;
                    right: 8px;
                }

                .scheduling-pending-badge.scheduling-overdue-pulse {
                    animation: scheduling-overduePulse 7s infinite;
                    transform-origin: center;
                }

                @keyframes scheduling-overduePulse {
                    0%, 85% { 
                        transform: scale(1); 
                        box-shadow: 0 2px 8px rgba(255, 59, 48, 0.4);
                    }
                    90% { 
                        transform: scale(1.15); 
                        box-shadow: 0 4px 12px rgba(255, 59, 48, 0.7);
                    }
                    95% { 
                        transform: scale(1.1); 
                        box-shadow: 0 3px 10px rgba(255, 59, 48, 0.6);
                    }
                    100% { 
                        transform: scale(1); 
                        box-shadow: 0 2px 8px rgba(255, 59, 48, 0.4);
                    }
                }

                /* Table View */
                .scheduling-table-view {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                }

                .scheduling-table-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .scheduling-table-header-left {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .scheduling-back-btn {
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 500;
                }

                .scheduling-back-btn:hover {
                    background: var(--border);
                    transform: translateX(-2px);
                }

                .scheduling-table-title {
                    font-size: 1.375rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .scheduling-table-header-right {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .scheduling-refresh-table-btn {
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    font-weight: 500;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .scheduling-refresh-table-btn:hover {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .scheduling-search-box {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .scheduling-search-input {
                    width: 280px;
                    padding: 0.75rem 1rem 0.75rem 2.5rem;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    background: var(--background);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    transition: all 0.3s ease;
                }

                .scheduling-search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .scheduling-search-icon {
                    position: absolute;
                    left: 0.75rem;
                    color: var(--text-tertiary);
                    pointer-events: none;
                }

                .scheduling-add-task-btn {
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                }

                .scheduling-add-task-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .scheduling-table-container {
                    border-radius: var(--radius);
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .scheduling-table-scroll-wrapper {
                    overflow-x: auto;
                    overflow-y: visible;
                }

                .scheduling-tasks-table {
                    width: 100%;
                    min-width: 800px;
                    border-collapse: separate;
                    border-spacing: 0;
                    background: var(--surface);
                }

                .scheduling-tasks-table th {
                    background: var(--surface-hover);
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: var(--text-primary);
                    border-bottom: none;
                    font-size: 0.9rem;
                    white-space: nowrap;
                }

                /* Center specific columns */
.scheduling-tasks-table th:nth-child(4),  /* Type */
.scheduling-tasks-table th:nth-child(5),  /* Due Date */
.scheduling-tasks-table th:nth-child(6) { /* Priority */
    text-align: center;
}

.scheduling-tasks-table td:nth-child(4),  /* Type */
.scheduling-tasks-table td:nth-child(5),  /* Due Date */
.scheduling-tasks-table td:nth-child(6) { /* Priority */
    text-align: center;
}

                .scheduling-tasks-table td {
                    padding: 1rem;
                    font-size: 0.9rem;
                }

                .scheduling-checkbox-col {
                    width: 50px;
                    text-align: center;
                }

                .scheduling-task-checkbox {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    appearance: none;
                    -webkit-appearance: none;
                    border: 2px solid var(--border);
                    border-radius: 4px;
                    background: var(--surface);
                    position: relative;
                    transition: all 0.2s ease;
                }

                .scheduling-task-checkbox:checked {
                    background: var(--primary);
                    border-color: var(--primary);
                }

                .scheduling-task-checkbox:checked::before {
                    content: '✓';
                    position: absolute;
                    top: -1px;
                    left: 1px;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                }

                .scheduling-task-checkbox:hover {
                    border-color: var(--primary);
                    transform: scale(1.05);
                }

                .scheduling-task-row {
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .scheduling-task-row:hover {
                    background: unset;
                    box-shadow: unset;
                    transform: unset;
                }

                .scheduling-task-row[data-priority="low"]:not(.scheduling-completed):not(.scheduling-overdue) {
                    background: linear-gradient(to right, var(--surface), var(--surface) 90%, rgba(16, 185, 129, 0.4));
                    box-shadow: inset -3px 0 0 rgba(16, 185, 129, 0.4);
                }

                .scheduling-task-row[data-priority="medium"]:not(.scheduling-completed):not(.scheduling-overdue) {
                    background: linear-gradient(to right, var(--surface), var(--surface) 90%, rgba(245, 158, 11, 0.4));
                    box-shadow: inset -3px 0 0 rgba(245, 158, 11, 0.4);
                }

                .scheduling-task-row[data-priority="high"]:not(.scheduling-completed):not(.scheduling-overdue) {
                    background: linear-gradient(to right, var(--surface), var(--surface) 90%, rgba(249, 115, 22, 0.4));
                    box-shadow: inset -3px 0 0 rgba(249, 115, 22, 0.4);
                }

                .scheduling-task-row[data-priority="urgent"]:not(.scheduling-completed):not(.scheduling-overdue) {
                    background: linear-gradient(to right, var(--surface), var(--surface) 90%, rgba(239, 68, 68, 0.4));
                    box-shadow: inset -3px 0 0 rgba(239, 68, 68, 0.4);
                }

                .scheduling-task-row[data-priority="low"]:not(.scheduling-completed):not(.scheduling-overdue):hover {
                    background: linear-gradient(to right, var(--surface-hover) 70%, rgba(16, 185, 129, 0.5)) !important;
                    box-shadow: inset -3px 0 0 rgba(16, 185, 129, 0.6) !important;
                }

                .scheduling-task-row[data-priority="medium"]:not(.scheduling-completed):not(.scheduling-overdue):hover {
                    background: linear-gradient(to right, var(--surface-hover) 70%, rgba(245, 158, 11, 0.5)) !important;
                    box-shadow: inset -3px 0 0 rgba(245, 158, 11, 0.6) !important;
                }

                .scheduling-task-row[data-priority="high"]:not(.scheduling-completed):not(.scheduling-overdue):hover {
                    background: linear-gradient(to right, var(--surface-hover) 70%, rgba(249, 115, 22, 0.5)) !important;
                    box-shadow: inset -3px 0 0 rgba(249, 115, 22, 0.6) !important;
                }

                .scheduling-task-row[data-priority="urgent"]:not(.scheduling-completed):not(.scheduling-overdue):hover {
                    background: linear-gradient(to right, var(--surface-hover) 70%, rgba(239, 68, 68, 0.5)) !important;
                    box-shadow: inset -3px 0 0 rgba(239, 68, 68, 0.6) !important;
                }

                .scheduling-task-row.scheduling-completed {
                    opacity: 0.35;
                    background: rgba(128, 128, 128, 0.15) !important;
                    color: #777;
                    box-shadow: none !important;
                }

                .scheduling-task-row.scheduling-completed:hover {
                    opacity: 0.5;
                    background: rgba(128, 128, 128, 0.25) !important;
                    box-shadow: none !important;
                }

                .scheduling-task-row.scheduling-overdue:not(.scheduling-completed) {
                    background: rgba(239, 68, 68, 0.15) !important;
                    box-shadow: none !important;
                }

                .scheduling-task-row.scheduling-overdue:not(.scheduling-completed):hover {
                    background: rgba(239, 68, 68, 0.25) !important;
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2) !important;
                }

                .scheduling-clickable-row {
                    cursor: pointer;
                }

                .scheduling-task-cell {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .scheduling-task-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    line-height: 1.2;
                    font-size: 0.9rem;
                }

                .scheduling-task-title.scheduling-completed-text {
                    text-decoration: line-through;
                    opacity: 0.7;
                    color: #777;
                }

                .scheduling-task-time {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                }

                .scheduling-lead-cell {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }

                .scheduling-lead-name {
                    font-weight: 500;
                    font-size: 0.85rem !important;
                }

                .scheduling-type-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .scheduling-date-cell {
                    color: var(--text-secondary);
                    white-space: nowrap;
                }

                .scheduling-overdue-date {
                    color: var(--danger) !important;
                    font-weight: 600 !important;
                }

                .scheduling-priority-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    white-space: nowrap;
                }

                /* Header Filters */
                .scheduling-header-filter {
                    cursor: pointer;
                    border-radius: 6px;
                    user-select: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: background 0.3s ease;
                    padding: 0.25rem 0.5rem;
                }

                .scheduling-header-filter:hover {
                    background: rgba(102, 126, 234, 0.1);
                }

                .scheduling-header-filter.scheduling-active {
                    color: var(--primary);
                }

                .scheduling-filter-arrow {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    transition: all 0.3s ease;
                }

                .scheduling-header-filter:hover .scheduling-filter-arrow {
                    color: var(--primary);
                }

                .scheduling-header-filter.scheduling-active .scheduling-filter-arrow {
                    color: var(--primary);
                }

                .scheduling-filter-dropdown {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    min-width: 180px;
                    max-height: 300px;
                    overflow-y: auto;
                    opacity: 0;
                    transform: translateY(-10px) scale(0.95);
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    position: fixed;
                    z-index: 10000;
                }

                .scheduling-filter-dropdown.scheduling-show {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }

                .scheduling-filter-dropdown::-webkit-scrollbar {
                    width: 8px;
                }

                .scheduling-filter-dropdown::-webkit-scrollbar-track {
                    background: transparent;
                }

                .scheduling-filter-dropdown::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 4px;
                }

                .scheduling-filter-options {
                    padding: 0.5rem 0;
                }

                .scheduling-filter-option {
                    padding: 0.75rem 1.5rem;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    transition: background 0.2s ease;
                }

                .scheduling-filter-option:hover {
                    background: var(--surface-hover);
                    color: var(--primary);
                }

                .scheduling-filter-option.scheduling-active {
                    background: rgba(102, 126, 234, 0.1);
                    color: var(--primary);
                    font-weight: 600;
                }

                .scheduling-filter-option.scheduling-clear-option {
                    color: var(--text-primary);
                    font-weight: 600;
                }

                .scheduling-filter-checkbox-option {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-left: 3px solid transparent;
                }

                .scheduling-filter-checkbox-option:hover {
                    background: var(--surface-hover);
                    border-left-color: var(--primary);
                }

                .scheduling-custom-checkbox {
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

                .scheduling-custom-checkbox.scheduling-checked {
                    background: var(--primary);
                    border-color: var(--primary);
                }

                .scheduling-filter-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 0.5rem 1rem;
                }

                .scheduling-option-text {
                    flex: 1;
                }

                .scheduling-active-check {
                    color: var(--primary);
                }

                /* Active Filters Panel */
                .scheduling-active-filters-panel {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
                    border: 1px solid rgba(102, 126, 234, 0.2);
                    border-radius: 12px;
                    padding: 1rem 1.5rem;
                    margin-bottom: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    animation: scheduling-slideInDown 0.3s ease;
                }

                .scheduling-filters-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .scheduling-filter-count {
                    font-weight: 700;
                    color: var(--primary);
                    font-size: 0.95rem;
                }

                .scheduling-active-filters-text {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }

                .scheduling-clear-filters-btn {
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

                .scheduling-clear-filters-btn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-1px);
                }

                @keyframes scheduling-slideInDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Modals */
                .scheduling-modal-overlay {
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
                    visibility: hidden;
                    pointer-events: none;
                    transition: opacity 0.2s ease, visibility 0.2s ease;
                }

                .scheduling-modal-overlay.scheduling-show {
                pointer-events: auto;
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                    backdrop-filter: blur(4px);
                }

                .scheduling-modal {
                    background: var(--surface);
                    border-radius: 12px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    width: 100%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow: hidden;
                    transform: scale(0.9) translateY(20px);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid var(--border);
                }

                .scheduling-modal-small {
                    max-width: 450px;
                }

                .scheduling-modal-overlay.scheduling-show .scheduling-modal {
                    transform: scale(1) translateY(0);
                }

                .scheduling-modal-header {
                    padding: 24px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .scheduling-modal-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                }

                .scheduling-modal-close {
                    background: transparent;
                    border: none;
                    font-size: 28px;
                    color: var(--text-secondary);
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .scheduling-modal-close:hover {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                }

                .scheduling-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    max-height: 60vh;
                }

                /* Forms */
                .scheduling-form {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .scheduling-form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                }

                .scheduling-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .scheduling-form-group.scheduling-full-width {
                    grid-column: 1 / -1;
                }

                .scheduling-custom-task-input {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid var(--border);
                }

                .scheduling-form-label {
                    font-weight: 500;
                    color: var(--text-primary);
                    font-size: 14px;
                }

                .scheduling-form-input,
                .scheduling-form-textarea {
                    padding: 10px 12px;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    font-size: 14px;
                    background: var(--background);
                    color: var(--text-primary);
                    transition: all 0.2s;
                    font-family: inherit;
                }

                .scheduling-form-input:focus,
                .scheduling-form-textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .scheduling-input-warning {
                    border-color: var(--warning);
                }

                .scheduling-input-error {
                    border-color: var(--danger);
                }

                .scheduling-input-feedback {
                    font-size: 0.8rem;
                    min-height: 1.2rem;
                    display: none;
                    transition: all 0.3s ease;
                }

                .scheduling-feedback-normal {
                    color: var(--text-secondary);
                    display: block;
                }

                .scheduling-feedback-warning {
                    color: var(--warning);
                    display: block;
                    font-weight: 600;
                }

                .scheduling-feedback-error {
                    color: var(--danger);
                    display: block;
                    font-weight: 600;
                }

                .scheduling-form-select {
                    padding: 10px 12px;
                    padding-right: 40px !important;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    font-size: 14px;
                    background: var(--background);
                    color: var(--text-primary);
                    transition: all 0.2s;
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

                .scheduling-form-select:hover {
                    border-color: var(--primary);
                }

                .scheduling-form-select:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                /* Priority Glow */
                .scheduling-form-select[name="priority"].scheduling-priority-low {
                    border-color: #10b981;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2), 0 0 15px rgba(16, 185, 129, 0.3);
                }

                .scheduling-form-select[name="priority"].scheduling-priority-medium {
                    border-color: #f59e0b;
                    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2), 0 0 15px rgba(245, 158, 11, 0.3);
                }

                .scheduling-form-select[name="priority"].scheduling-priority-high {
                    border-color: #f97316;
                    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2), 0 0 15px rgba(249, 115, 22, 0.4);
                }

                .scheduling-form-select[name="priority"].scheduling-priority-urgent {
                    border-color: #ef4444;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.5);
                    animation: scheduling-urgentGlow 2s infinite;
                }

                @keyframes scheduling-urgentGlow {
                    0%, 100% { 
                        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.5);
                    }
                    50% { 
                        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4), 0 0 25px rgba(239, 68, 68, 0.7);
                    }
                }

                /* Lead Selector */
                .scheduling-lead-selector {
                    position: relative;
                }

                .scheduling-lead-selector-display {
                    padding: 10px 12px;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    background: var(--background);
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .scheduling-lead-selector-display:hover {
                    border-color: var(--primary);
                }

                .scheduling-selected-lead {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex: 1;
                    min-width: 0;
                }

                .scheduling-selected-lead-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .scheduling-selected-lead-company {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    max-width: 140px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .scheduling-no-lead-selected .scheduling-placeholder-text {
                    color: var(--text-tertiary);
                    font-style: italic;
                }

                .scheduling-selector-arrow {
                    color: var(--text-secondary);
                    font-size: 1.2rem;
                    flex-shrink: 0;
                }

                /* Lead Picker */
                .scheduling-lead-picker-overlay {
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
                    padding: 2rem;
                    animation: scheduling-fadeIn 0.3s ease;
                }

                .scheduling-lead-picker-popup {
                    background: var(--surface);
                    border-radius: 20px;
                    width: 100%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow: hidden;
                    border: 1px solid var(--border);
                    animation: scheduling-slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .scheduling-lead-picker-header {
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    color: white;
                    padding: 1.5rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .scheduling-lead-picker-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin: 0;
                }

                .scheduling-lead-picker-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 35px;
                    height: 35px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 1.3rem;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }

                .scheduling-lead-picker-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(1.1);
                }

                .scheduling-lead-picker-search {
                    padding: 1.5rem 2rem 1rem;
                    position: relative;
                }

                .scheduling-lead-search-input {
                    width: 100%;
                    padding: 1rem 1rem 1rem 3rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    font-size: 1rem;
                    background: var(--background);
                    color: var(--text-primary);
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                }

                .scheduling-lead-search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .scheduling-lead-picker-search .scheduling-search-icon {
                    position: absolute;
                    left: 3rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                    pointer-events: none;
                }

                .scheduling-lead-picker-results {
                    max-height: 400px;
                    overflow-y: auto;
                    padding: 0 1rem;
                }

                .scheduling-lead-picker-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.5rem;
                    margin: 0.5rem 0;
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .scheduling-lead-picker-item:hover {
                    background: var(--border);
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                }

                .scheduling-lead-item-main {
                    flex: 1;
                    min-width: 0;
                }

                .scheduling-lead-item-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 0.25rem;
                }

                .scheduling-lead-name {
                    font-weight: 700;
                    color: var(--text-primary);
                    font-size: 1.1rem;
                    max-width: 180px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .scheduling-lead-type {
                    font-size: 1.2rem;
                }

                .scheduling-lead-company {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    margin-bottom: 0.25rem;
                    font-weight: 500;
                    max-width: 220px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .scheduling-lead-email {
                    color: var(--text-tertiary);
                    font-size: 0.85rem;
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .scheduling-lead-item-status {
                    flex-shrink: 0;
                }

                .scheduling-status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .scheduling-lead-picker-empty {
                    text-align: center;
                    padding: 3rem 2rem;
                    color: var(--text-secondary);
                }

                .scheduling-lead-picker-empty .scheduling-empty-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.6;
                }

                .scheduling-lead-picker-actions {
                    padding: 1rem 2rem 1.5rem;
                    background: var(--surface-hover);
                    border-top: 1px solid var(--border);
                    text-align: center;
                }

                .scheduling-lead-picker-btn {
                    padding: 0.75rem 2rem;
                    border: none;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .scheduling-lead-picker-btn.scheduling-secondary {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                    border: 1px solid var(--border);
                }

                .scheduling-lead-picker-btn.scheduling-secondary:hover {
                    background: var(--border);
                    transform: translateY(-1px);
                }

                /* Day Popup */
                .scheduling-day-popup-overlay {
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
                    padding: 2rem;
                    animation: scheduling-fadeIn 0.3s ease;
                }

                .scheduling-day-popup {
                    background: var(--surface);
                    border-radius: 20px;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
                    width: 100%;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow: hidden;
                    border: 1px solid var(--border);
                    animation: scheduling-slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .scheduling-popup-header {
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    color: white;
                    padding: 1rem 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    min-height: 60px;
                }

                .scheduling-popup-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin: 0;
                    line-height: 1.2;
                }

                .scheduling-popup-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 1.2rem;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }

                .scheduling-popup-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(1.1);
                }

                .scheduling-popup-body {
                    padding: 1.5rem;
                    max-height: 50vh;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .scheduling-popup-task-item {
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

                .scheduling-popup-task-item:hover {
                    background: var(--border);
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                }

                .scheduling-popup-task-item.scheduling-completed {
                    opacity: 0.7;
                }

                .scheduling-clickable-item {
                    cursor: pointer;
                }

                .scheduling-task-checkbox-wrapper {
                    flex-shrink: 0;
                }

                .scheduling-task-info {
                    flex: 1;
                    min-width: 0;
                }

                .scheduling-task-main {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.25rem;
                }

                .scheduling-task-type-icon {
                    font-size: 1rem;
                    flex-shrink: 0;
                }

                .scheduling-task-lead {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    max-width: 180px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .scheduling-task-priority {
                    flex-shrink: 0;
                }

                .scheduling-empty-day {
                    text-align: center;
                    padding: 2rem;
                    color: var(--text-secondary);
                }

                .scheduling-empty-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.6;
                }

                .scheduling-empty-message {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                /* Task View */
                .scheduling-task-view-overlay {
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
                    animation: scheduling-fadeIn 0.3s ease;
                }

                .scheduling-task-view {
                    background: var(--surface);
                    border-radius: 20px;
                    position: relative;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    width: 100%;
                    max-width: 700px;
                    max-height: 90vh;
                    overflow: hidden;
                    border: 1px solid var(--border);
                    animation: scheduling-slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .scheduling-close-btn {
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

                .scheduling-close-btn:hover {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                    border-color: var(--text-secondary);
                }

                .scheduling-task-view-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                    max-height: 65vh;
                }

                .scheduling-task-title-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
    padding-right: 40px;
}

.scheduling-main-task-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.75rem 0;
    line-height: 1.3;
}

.scheduling-task-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-weight: 500;
    font-size: 0.8rem;
    border: 1px solid transparent;
    margin-right: 8px;
}

                .scheduling-task-status-badge.scheduling-completed {
                    background: var(--surface-hover);
                    color: var(--success);
                    border-color: rgba(16, 185, 129, 0.2);
                }

                .scheduling-task-status-badge.scheduling-pending {
                    background: var(--surface-hover);
                    color: var(--warning);
                    border-color: rgba(245, 158, 11, 0.2);
                }

                .scheduling-task-details-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .scheduling-detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .scheduling-detail-label {
                    font-weight: 500;
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .scheduling-detail-value {
    font-weight: 400;
    color: var(--text-primary);
    font-size: 0.9rem;
    line-height: 1.4;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    max-width: 100%;
}

                .scheduling-quick-actions-section {
                    margin-top: 2rem;
                    margin-bottom: 2rem;
                }

                .scheduling-quick-actions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 0.75rem;
                }

                .scheduling-quick-action-btn {
                    padding: 0.5rem 0.75rem;
                    border: 1px solid transparent;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                    font-size: 0.8rem;
                    background: var(--surface-hover);
                    color: var(--text-primary);
                }

                .scheduling-quick-action-btn.scheduling-call {
                    border-color: rgba(34, 197, 94, 0.2);
                    color: var(--success);
                }

                .scheduling-quick-action-btn.scheduling-call:hover {
                    background: var(--success);
                    color: white;
                    border-color: var(--success);
                }

                .scheduling-quick-action-btn.scheduling-email {
                    border-color: rgba(59, 130, 246, 0.2);
                    color: #3b82f6;
                }

                .scheduling-quick-action-btn.scheduling-email:hover {
                    background: #3b82f6;
                    color: white;
                    border-color: #3b82f6;
                }

                .scheduling-quick-action-btn.scheduling-complete {
                    border-color: rgba(102, 126, 234, 0.2);
                    color: var(--primary);
                }

                .scheduling-quick-action-btn.scheduling-complete:hover {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }

                .scheduling-quick-action-btn.scheduling-undo {
                    border-color: rgba(245, 158, 11, 0.2);
                    color: var(--warning);
                }

                .scheduling-quick-action-btn.scheduling-undo:hover {
                    background: var(--warning);
                    color: white;
                    border-color: var(--warning);
                }

                .scheduling-task-view-actions {
                    padding: 1rem;
                    background: var(--surface-hover);
                    border-top: 1px solid var(--border);
                    display: flex;
                    gap: 0.75rem;
                    justify-content: space-between;
                }

                .scheduling-edit-task-btn {
                    padding: 0.6rem 1.25rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .scheduling-edit-task-btn:hover {
                    background: var(--primary-dark);
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
                }

                .scheduling-delete-task-btn {
                    padding: 0.6rem 1.25rem;
                    background: var(--danger);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .scheduling-delete-task-btn:hover {
                    background: #dc2626;
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
                }

                /* Delete Confirmation */
                .scheduling-delete-confirm-overlay {
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
                    padding: 2rem;
                    animation: scheduling-fadeIn 0.3s ease;
                }

                .scheduling-delete-confirm-modal {
                    background: var(--surface);
                    border-radius: 20px;
                    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
                    width: 100%;
                    max-width: 500px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                    animation: scheduling-slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .scheduling-confirm-header {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    padding: 2rem;
                }

                .scheduling-confirm-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0;
                    color: white;
                }

                .scheduling-confirm-body {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .scheduling-task-preview-card {
                    background: var(--surface-hover);
                    padding: 1.5rem;
                    border-radius: var(--radius);
                    border: 1px solid var(--border);
                }

                .scheduling-task-preview-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                }

                .scheduling-task-preview-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.75rem;
                    line-height: 1.3;
                }

                .scheduling-task-preview-lead {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                .scheduling-task-preview-date {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .scheduling-confirm-message {
                    font-size: 1rem;
                    color: var(--text-primary);
                    margin: 0;
                    line-height: 1.5;
                }

                .scheduling-confirm-warning {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin: 0;
                    padding: 0.75rem 1rem;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 8px;
                    border-left: 3px solid var(--danger);
                    line-height: 1.4;
                }

                .scheduling-confirm-actions {
                    display: flex;
                    gap: 1rem;
                    padding: 1.5rem 2rem 2rem;
                    background: var(--surface-hover);
                    border-top: 1px solid var(--border);
                }

                .scheduling-btn-cancel-delete {
                    flex: 1;
                    padding: 0.875rem 2rem;
                    background: var(--surface-hover);
                    color: var(--text-primary);
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .scheduling-btn-cancel-delete:hover {
                    background: var(--border);
                    border-color: var(--primary);
                    color: var(--primary);
                }

                .scheduling-btn-confirm-delete {
                    flex: 1;
                    padding: 0.875rem 2rem;
                    background: var(--danger);
                    color: white;
                    border: none;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .scheduling-btn-confirm-delete:hover {
                    background: #dc2626;
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
                }

                .scheduling-btn-confirm-delete:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    background: #666;
                }

                /* Form Actions */
                .scheduling-form-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 20px;
                    border-top: 1px solid var(--border);
                }

                .scheduling-form-actions-right {
                    display: flex;
                    gap: 12px;
                }

                .scheduling-btn-primary,
                .scheduling-btn-secondary,
                .scheduling-btn-danger {
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

                .scheduling-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .scheduling-btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
                }

                .scheduling-btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .scheduling-btn-secondary {
                    background: transparent;
                    color: var(--text-primary);
                    border: 1px solid var(--border);
                }

                .scheduling-btn-secondary:hover {
                    background: var(--surface-hover);
                }

                .scheduling-btn-danger {
                    background: var(--danger);
                    color: white;
                }

                .scheduling-btn-danger:hover {
                    background: #dc2626;
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
                }

                .scheduling-btn-loading-spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: scheduling-spin 1s linear infinite;
                }

                @keyframes scheduling-spin {
                    to { transform: rotate(360deg); }
                }

                /* Empty State */
                .scheduling-empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--text-secondary);
                }

                .scheduling-empty-state .scheduling-empty-icon {
                    font-size: 4rem;
                    margin-bottom: 1.5rem;
                    opacity: 0.6;
                }

                .scheduling-empty-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.75rem;
                    color: var(--text-primary);
                }

                .scheduling-empty-subtitle {
                    font-size: 1.1rem;
                    margin-bottom: 2rem;
                    line-height: 1.5;
                }

                .scheduling-empty-action-btn {
                    padding: 1rem 2rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1rem;
                }

                .scheduling-empty-action-btn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                /* Loading State */
                .scheduling-loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    gap: 1.5rem;
                }

                .scheduling-loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(102, 126, 234, 0.2);
                    border-top: 4px solid var(--primary);
                    border-radius: 50%;
                    animation: scheduling-spin 1s linear infinite;
                }

                .scheduling-loading-text {
                    font-size: 1.1rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                /* Error State */
                .scheduling-error-container {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-lg);
                    max-width: 600px;
                    margin: 2rem auto;
                }

                .scheduling-error-icon {
                    font-size: 4rem;
                    margin-bottom: 2rem;
                    opacity: 0.6;
                }

                .scheduling-error-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .scheduling-error-message {
                    margin-bottom: 2rem;
                    font-size: 1.125rem;
                    line-height: 1.6;
                    color: var(--text-secondary);
                }

                .scheduling-retry-btn {
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
                    transition: all 0.3s ease;
                    box-shadow: var(--shadow);
                }

                .scheduling-retry-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                /* Upgrade Prompt */
                .scheduling-upgrade-prompt-overlay {
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
                    z-index: 10004;
                    padding: 2rem;
                    animation: scheduling-fadeIn 0.3s ease;
                }

                .scheduling-upgrade-prompt {
                    background: var(--surface);
                    border-radius: 20px;
                    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
                    width: 100%;
                    max-width: 500px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                    animation: scheduling-slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .scheduling-upgrade-header {
                    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                    color: white;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .scheduling-upgrade-icon {
                    font-size: 3rem;
                }

                .scheduling-upgrade-header h3 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0;
                }

                .scheduling-upgrade-content {
                    padding: 2rem;
                }

                .scheduling-upgrade-content p {
                    margin: 0 0 1rem 0;
                    line-height: 1.6;
                    color: var(--text-primary);
                }

                .scheduling-upgrade-actions {
                    padding: 1.5rem 2rem 2rem;
                    background: var(--surface-hover);
                    border-top: 1px solid var(--border);
                    display: flex;
                    justify-content: center;
                }

                /* Animations */
                @keyframes scheduling-fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes scheduling-slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(30px) scale(0.95);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .fade-in {
                    animation: scheduling-fadeIn 0.6s ease;
                }

                /* Mobile Responsive */
@media (max-width: 768px) {
    .scheduling-action-bubbles {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .scheduling-action-bubble {
        padding: 1.5rem;
        flex-direction: column;
        text-align: center;
        gap: 1rem;
    }

    .scheduling-bubble-icon {
        width: 60px;
        height: 60px;
        font-size: 2rem;
    }

    .scheduling-calendar-section {
        padding: 1rem;
    }

    .scheduling-calendar-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }

    .scheduling-calendar-nav {
        justify-content: center;
    }

    .scheduling-calendar-day {
        min-height: 80px;
        padding: 0.5rem;
    }

    .scheduling-day-number {
        font-size: 1rem;
    }

    .scheduling-table-view {
        padding: 1rem;
    }

    .scheduling-table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .scheduling-tasks-table {
        min-width: 700px;
        font-size: 0.85rem;
    }

    .scheduling-tasks-table th,
    .scheduling-tasks-table td {
        padding: 0.75rem 0.5rem;
        white-space: nowrap;
    }

    /* IMPROVED TABLE HEADER LAYOUT */
    .scheduling-table-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
        padding: 1rem;
    }

    .scheduling-table-header-left {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.75rem;
        align-items: center;
    }

     .scheduling-back-btn {
        grid-column: 1;
        padding: 0.5rem 0.75rem;
        font-size: 0.7rem;
        font-weight: 500;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .scheduling-table-title {
        grid-column: 2;
        font-size: 1.1rem;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .scheduling-table-header-right {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.75rem;
    }

    .scheduling-search-box {
        grid-column: 1 / -1;
        order: 1;
    }

    .scheduling-search-input {
        width: 100%;
        font-size: 16px;
    }

    .scheduling-refresh-table-btn {
        order: 2;
        padding: 0.75rem 1rem;
        white-space: nowrap;
    }

    .scheduling-add-task-btn {
        order: 3;
        padding: 0.75rem 1.25rem;
        white-space: nowrap;
    }
    /* END IMPROVED TABLE HEADER */

    .scheduling-modal {
        margin: 1rem;
        max-width: none;
    }

    .scheduling-modal-body {
        padding: 1rem;
    }

    .scheduling-form-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .scheduling-form-actions {
        flex-direction: column;
        gap: 1rem;
    }

    .scheduling-form-actions-right {
        width: 100%;
        flex-direction: column;
    }

    .scheduling-btn-primary,
    .scheduling-btn-secondary,
    .scheduling-btn-danger {
        width: 100%;
        justify-content: center;
    }

    .scheduling-day-popup,
    .scheduling-task-view,
    .scheduling-lead-picker-popup,
    .scheduling-delete-confirm-modal,
    .scheduling-upgrade-prompt {
        margin: 1rem;
        max-width: none;
    }

    .scheduling-task-details-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .scheduling-quick-actions-grid {
        grid-template-columns: 1fr;
    }

    .scheduling-task-view-actions {
        flex-direction: column;
    }

    .scheduling-lead-picker-overlay {
        padding: 1rem;
    }

    .scheduling-lead-picker-popup {
        max-width: 95vw;
        max-height: 85vh;
    }

    .scheduling-lead-picker-header {
        padding: 1.25rem 1.5rem;
    }

    .scheduling-lead-picker-search {
        padding: 1rem 1.5rem 0.75rem;
    }

    .scheduling-lead-picker-item {
        padding: 1rem;
        margin: 0.25rem 0;
    }

    .scheduling-lead-name {
        font-size: 1rem;
        max-width: 120px;
    }

    .scheduling-lead-company {
        max-width: 140px;
    }

    .scheduling-lead-email {
        max-width: 120px;
    }

    .scheduling-selected-lead-name {
        max-width: 80px;
    }

    .scheduling-selected-lead-company {
        max-width: 90px;
    }

    .scheduling-delete-confirm-overlay {
        padding: 1rem;
    }

    .scheduling-confirm-header {
        padding: 1.5rem;
    }

    .scheduling-confirm-body {
        padding: 1.5rem;
    }

    .scheduling-confirm-actions {
        flex-direction: column;
        padding: 1rem 1.5rem 1.5rem;
    }

    .scheduling-btn-cancel-delete,
    .scheduling-btn-confirm-delete {
        width: 100%;
        justify-content: center;
    }
}

/* Extra Small Mobile - Stack Everything */
@media (max-width: 480px) {
    .scheduling-table-header-right {
        grid-template-columns: 1fr;
    }

    .scheduling-refresh-table-btn {
        grid-column: 1;
    }

    .scheduling-add-task-btn {
        grid-column: 1;
    }
}
            </style>
        `;
    }
};

// Initialize
if (typeof window !== 'undefined') {
    window.SchedulingModule = SchedulingModule;
    console.log('Scheduling module loaded');
}