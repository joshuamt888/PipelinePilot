/**
 * 🔥 SICK SCHEDULING MODULE - DASHBOARD EDITION
 * 
 * The most BEAUTIFUL, SCALABLE, and FUCKING AWESOME task management system ever built!
 * Built with the exact same winning formula as AddLeadModule.
 * 
 * Features:
 * ✅ Clean action bubbles for main actions
 * ✅ Beautiful calendar with task count badges (top-right superscript style)
 * ✅ Sick popup system for day-specific tasks
 * ✅ Individual task view with sleek design
 * ✅ Table view for full task management
 * ✅ Mobile-responsive throughout
 * ✅ Instant animations and micro-interactions
 * ✅ Self-contained render functions
 * ✅ Pipeline.js compatible design language
 * 
 * @version 2.0.0 - Beautiful Dashboard Edition
 */

window.SchedulingModule = {
    // 🎬 Core State - Clean & Simple
    tasks: [],
    leads: [],
    currentView: 'dashboard', // 'dashboard' | 'table'
    currentDate: new Date(),
    selectedDate: null,
    showingDayPopup: false,
    showingTaskView: false,
    currentViewTask: null,
    isLoading: false,
    version: '2.0.0',

    // 🚀 Simple Initialization (AddLeadModule Style)
    async init() {
        console.log('🔥 SICK Scheduling Module v2.0 initializing...');
        
        try {
            this.isLoading = true;
            
            // 🔥 INSTANT SKELETON FEEDBACK
            this.renderLoadingState();
            
            // Sequential loading like AddLeadModule
            console.log('📋 Loading tasks data...');
            await this.loadTasks();
            
            console.log('👥 Loading leads data...');
            await this.loadLeads();
            
            console.log('🎨 Rendering sick interface...');
            this.render();
            
            console.log('⚡ Setting up interactions...');
            this.setupEventListeners();
            
            console.log('✅ Scheduling Module is fucking ready!');
            
        } catch (error) {
            console.error('❌ Scheduling Module failed:', error);
            this.renderError(error.message);
        } finally {
            this.isLoading = false;
        }
    },

    // 📊 Load Data Methods (AddLeadModule Style)
    async loadTasks() {
        try {
            console.log('📋 Loading tasks...');
            this.tasks = await API.getTasks() || [];
            console.log(`📋 Loaded ${this.tasks.length} tasks`);
        } catch (error) {
            console.error('❌ Failed to load tasks:', error);
            this.tasks = [];
            throw error;
        }
    },

    async loadLeads() {
        try {
            console.log('👥 Loading leads...');
            const leadData = await API.getLeads();
            this.leads = leadData.all || leadData || [];
            console.log(`👥 Loaded ${this.leads.length} leads`);
        } catch (error) {
            console.error('❌ Failed to load leads:', error);
            this.leads = [];
            // Don't throw - leads are optional for scheduling
        }
    },

    render() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="scheduling-container fade-in">
            ${this.currentView === 'table' ? this.renderTableView() : this.renderDashboardView()}
            ${this.renderModals()} 
            ${this.renderStyles()}
        </div>
    `;
    this.setupEventListeners();
},

    // 🏠 Dashboard View (Action Bubbles + Calendar)
    renderDashboardView() {
        return `
            <div class="action-bubbles">
                <div class="action-bubble primary" onclick="SchedulingModule.showAddTaskModal()">
                    <div class="bubble-icon">➕</div>
                    <div class="bubble-content">
                        <h2 class="bubble-title">Add New Task</h2>
                        <p class="bubble-subtitle">Create and schedule your next follow-up or meeting</p>
                        <button class="bubble-button">
                            <span>Add Task</span>
                            <span class="arrow">→</span>
                        </button>
                    </div>
                </div>
                
                <div class="action-bubble secondary" onclick="SchedulingModule.showTableView()">
                    <div class="bubble-icon">📊</div>
                    <div class="bubble-content">
                        <h2 class="bubble-title">Manage Tasks</h2>
                        <p class="bubble-subtitle">View, edit and organize your complete task database</p>
                        <button class="bubble-button">
                            <span>View All Tasks (${this.tasks.length})</span>
                            <span class="arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
            
            ${this.renderCalendarSection()}
        `;
    },

    

renderCalendarSection() {
    return `
        <div class="calendar-section">
            <div class="calendar-header">
                <h2 class="calendar-title">${this.formatMonth(this.currentDate)}</h2>
                <div class="calendar-nav">
                    <button class="nav-btn" onclick="SchedulingModule.previousMonth()">←</button>
                    <button class="today-btn" onclick="SchedulingModule.goToToday()">Today</button>
                    <button class="nav-btn" onclick="SchedulingModule.nextMonth()">→</button>
                </div>
            </div>
            
            <div class="calendar-grid">
                <div class="day-header">Sun</div>
                <div class="day-header">Mon</div>
                <div class="day-header">Tue</div>
                <div class="day-header">Wed</div>
                <div class="day-header">Thu</div>
                <div class="day-header">Fri</div>
                <div class="day-header">Sat</div>
                
                ${this.getMonthDays(this.currentDate).map(dayData => this.renderCalendarDay(dayData)).join('')}
            </div>
        </div>
    `;
},

renderCalendarDay(dayData) {
    const dayTasks = this.getTasksForDate(dayData.date);
    const pendingTasks = dayTasks.filter(task => task.status !== 'completed');
    const completedTasks = dayTasks.filter(task => task.status === 'completed');
    
    // Check if any pending tasks are overdue
    const hasOverdue = pendingTasks.some(task => this.isTaskOverdue(task));
    
    const pendingCount = pendingTasks.length;
    const completedCount = completedTasks.length;
    const today = new Date().toISOString().split('T')[0];
    const isToday = dayData.date === today;
    
    return `
        <div class="calendar-day ${isToday ? 'today' : ''} ${!dayData.isCurrentMonth ? 'other-month' : ''}"
             data-date="${dayData.date}"
             onclick="SchedulingModule.showDayTasks('${dayData.date}')">
            <span class="day-number">${dayData.day}</span>
            ${pendingCount > 0 ? `<span class="pending-badge top-right ${hasOverdue ? 'overdue-pulse' : ''}">${pendingCount}</span>` : ''}
            ${completedCount > 0 && pendingCount > 0 ? `<span class="completed-badge below-red">${completedCount}</span>` : ''}
            ${completedCount > 0 && pendingCount === 0 ? `<span class="completed-badge top-right">${completedCount}</span>` : ''}
        </div>
    `;
},
    

    // 📊 Table View (Full Task Management)
    renderTableView() {
        const filteredTasks = this.getFilteredTasks();
        
        return `
            <div class="table-view">
                <div class="table-header">
                    <div class="table-header-left">
                        <button class="back-btn" onclick="SchedulingModule.showDashboard()">
                            ← Back to Dashboard
                        </button>
                        <h2 class="table-title">All Tasks (${filteredTasks.length})</h2>
                    </div>
                    <div class="table-header-right">
                        <div class="search-box">
                            <input type="text" 
                                   class="search-input" 
                                   placeholder="Search tasks..." 
                                   value="${this.searchTerm || ''}"
                                   id="taskSearch">
                            <span class="search-icon">🔍</span>
                        </div>
                    </div>
                </div>
                
                <div class="filter-section">
                    <select class="filter-select" id="statusFilter">
                        <option value="">All Tasks</option>
                        <option value="pending">Pending Only</option>
                        <option value="completed">Completed Only</option>
                        <option value="overdue">Overdue Only</option>
                    </select>
                    
                    <select class="filter-select" id="typeFilter">
                        <option value="">All Types</option>
                        <option value="call">📞 Calls Only</option>
                        <option value="email">📧 Emails Only</option>
                        <option value="meeting">🤝 Meetings Only</option>
                        <option value="follow_up">📋 Follow-ups Only</option>
                        <option value="research">🔍 Research Only</option>
                    </select>
                    
                    <select class="filter-select" id="priorityFilter">
                        <option value="">All Priorities</option>
                        <option value="urgent">🔴 Urgent Only</option>
                        <option value="high">🟠 High Only</option>
                        <option value="medium">🟡 Medium Only</option>
                        <option value="low">🟢 Low Only</option>
                    </select>
                </div>
                
                <div class="table-container">
                    ${filteredTasks.length > 0 ? this.renderTasksTable(filteredTasks) : this.renderEmptyState()}
                </div>
            </div>
        `;
    },

    // 📋 Tasks Table
    renderTasksTable(tasks) {
        return `
            <table class="tasks-table">
                <thead>
                    <tr>
                        <th class="checkbox-col">✓</th>
                        <th>Task</th>
                        <th>Lead</th>
                        <th>Type</th>
                        <th>Due Date</th>
                        <th>Priority</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => this.renderTaskRow(task)).join('')}
                </tbody>
            </table>
        `;
    },

    // 📋 Task Row
    renderTaskRow(task) {
        const isCompleted = task.status === 'completed';
        const isOverdue = this.isTaskOverdue(task);
        const leadName = task.lead_name || this.getLeadName(task.lead_id);
        const typeIcon = this.getTaskTypeIcon(task.task_type);
        const priorityIcon = this.getPriorityIcon(task.priority);
        const formattedDate = this.formatTaskDate(task.due_date);
        
        return `
            <tr class="task-row ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} clickable-row"
                onclick="SchedulingModule.showTaskView('${task.id}')">
                <td class="checkbox-col" onclick="event.stopPropagation()">
                    <input type="checkbox" 
                           class="task-checkbox"
                           ${isCompleted ? 'checked' : ''}
                           onchange="SchedulingModule.toggleTaskComplete('${task.id}', this.checked)">
                </td>
                <td class="task-cell">
                    <div class="task-title ${isCompleted ? 'completed-text' : ''}">${task.title}</div>
                    ${task.due_time ? `<div class="task-time">⏰ ${this.formatTime(task.due_time)}</div>` : ''}
                </td>
                <td class="lead-cell">
                    ${leadName ? `<span class="lead-name">${leadName}</span>` : '<span class="no-lead">-</span>'}
                </td>
                <td class="type-cell">
                    <span class="type-badge">${typeIcon} ${this.formatTaskType(task.task_type)}</span>
                </td>
                <td class="date-cell">
                    <span class="date-text ${isOverdue ? 'overdue-date' : ''}">${formattedDate}</span>
                </td>
                <td class="priority-cell">
                    <span class="priority-badge priority-${task.priority || 'medium'}">
                        ${priorityIcon} ${this.formatPriority(task.priority)}
                    </span>
                </td>
            </tr>
        `;
    },

    renderModals() {
    return `
        <!-- Add Task Modal -->
        <div class="modal-overlay" id="addTaskModal">
            <div class="modal-backdrop" onclick="SchedulingModule.hideAddTaskModal()"></div>
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Add New Task</h2>
                    <button class="modal-close" onclick="SchedulingModule.hideAddTaskModal()">×</button>
                </div>
                <div class="modal-body">
                    ${this.renderAddTaskForm()}
                </div>
            </div>
        </div>

        <!-- Edit Task Modal -->
        <div class="modal-overlay" id="editTaskModal">
            <div class="modal-backdrop" onclick="SchedulingModule.hideEditTaskModal()"></div>
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Edit Task</h2>
                    <button class="modal-close" onclick="SchedulingModule.hideEditTaskModal()">×</button>
                </div>
                <div class="modal-body">
                    <div id="editFormContainer"></div>
                </div>
            </div>
        </div>
    `;
},

    // 📝 Add Task Form
    // 🔥 REPLACE your renderAddTaskForm method with this fixed version:

renderAddTaskForm() {
    // 🔥 FIX: Use proper date handling to avoid timezone issues
    const today = new Date().toISOString().split('T')[0];
    const selectedDateFixed = this.selectedDate || today;
    
    const leadOptions = this.leads.map(lead => 
        `<option value="${lead.id}">${lead.name} ${lead.company ? `(${lead.company})` : ''}</option>`
    ).join('');

    return `
        <form id="addTaskForm" class="task-form">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Task Title *</label>
                    <input type="text" name="title" class="form-input" required placeholder="Follow up with John Smith">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Due Date</label>
                    <input type="date" name="due_date" class="form-input" value="${selectedDateFixed}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Due Time</label>
                    <input type="time" name="due_time" class="form-input">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Priority</label>
                    <select name="priority" class="form-select">
                        <option value="low">🟢 Low</option>
                        <option value="medium" selected>🟡 Medium</option>
                        <option value="high">🟠 High</option>
                        <option value="urgent">🔴 Urgent</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Related Lead</label>
                    <select name="lead_id" class="form-select">
                        <option value="">No lead selected</option>
                        ${leadOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Task Type</label>
                    <select name="task_type" class="form-select">
                        <option value="follow_up">📋 Follow-up</option>
                        <option value="call">📞 Call</option>
                        <option value="email">📧 Email</option>
                        <option value="meeting">🤝 Meeting</option>
                        <option value="demo">🎥 Demo</option>
                        <option value="research">🔍 Research</option>
                        <option value="proposal">📊 Proposal</option>
                        <option value="contract">📄 Contract</option>
                        <option value="task">📝 Task</option>
                    </select>
                </div>
                
                <div class="form-group full-width">
                    <label class="form-label">Notes</label>
                    <textarea name="description" class="form-textarea" rows="3" placeholder="Additional details about this task..."></textarea>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="SchedulingModule.hideAddTaskModal()">
                    Cancel
                </button>
                <button type="submit" class="btn-primary" id="submitBtn">
                    <span class="btn-text">Add Task</span>
                </button>
            </div>
        </form>
    `;
},

    renderDayPopupOnly() {
    // Remove any existing popup first
    const existingPopup = document.querySelector('.day-popup-overlay');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Create and inject the new popup
    const popupHTML = this.renderDayTasksPopup();
    if (popupHTML) {
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        
        // Add smooth entrance animation
        const popup = document.querySelector('.day-popup-overlay');
        if (popup) {
            popup.style.opacity = '0';
            popup.style.display = 'flex';
            
            // Trigger animation after DOM insertion
            requestAnimationFrame(() => {
                popup.style.transition = 'opacity 0.3s ease';
                popup.style.opacity = '1';
            });
        }
    }
},

    // 🎪 Day Tasks Popup
    renderDayTasksPopup() {
        if (!this.showingDayPopup || !this.selectedDate) {
            return '';
        }

        const dayTasks = this.getTasksForDate(this.selectedDate);
        const completedTasks = dayTasks.filter(t => t.status === 'completed');
        const pendingTasks = dayTasks.filter(t => t.status !== 'completed');

        return `
            <div class="day-popup-overlay" onclick="SchedulingModule.closeDayPopup()">
                <div class="day-popup" onclick="event.stopPropagation()">
                    <div class="popup-header">
                        <h3 class="popup-title">📅 ${this.formatPopupDate(this.selectedDate)}</h3>
                        <div class="popup-stats">
                            <span class="task-count">${dayTasks.length} task${dayTasks.length !== 1 ? 's' : ''}</span>
                            ${pendingTasks.length > 0 ? `<span class="pending-count">${pendingTasks.length} pending</span>` : ''}
                            ${completedTasks.length > 0 ? `<span class="completed-count">${completedTasks.length} done</span>` : ''}
                        </div>
                        <button class="popup-close" onclick="SchedulingModule.closeDayPopup()">×</button>
                    </div>
                    
                    <div class="popup-body">
                        ${dayTasks.length > 0 ? 
                            dayTasks.map(task => this.renderPopupTaskItem(task)).join('') :
                            `<div class="empty-day">
                                <div class="empty-icon">🗓️</div>
                                <div class="empty-message">No tasks scheduled for this day</div>
                            </div>`
                        }
                    </div>
                    
                    <div class="popup-actions">
                        <button class="action-btn primary" onclick="SchedulingModule.showAddTaskModal('${this.selectedDate}')">
                            <span class="btn-icon">➕</span>
                            <span class="btn-text">Add Task for This Day</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // 📋 Popup Task Item
    renderPopupTaskItem(task) {
        const isCompleted = task.status === 'completed';
        const typeIcon = this.getTaskTypeIcon(task.task_type);
        const timeStr = task.due_time ? this.formatTime(task.due_time) : '';
        const leadName = task.lead_name || this.getLeadName(task.lead_id);

        return `
            <div class="popup-task-item ${isCompleted ? 'completed' : ''} clickable-item"
                 onclick="SchedulingModule.showTaskView('${task.id}')">
                <div class="task-checkbox-wrapper" onclick="event.stopPropagation()">
                    <input type="checkbox" 
                           class="task-checkbox"
                           ${isCompleted ? 'checked' : ''}
                           onchange="SchedulingModule.toggleTaskComplete('${task.id}', this.checked)">
                </div>
                
                <div class="task-info">
                    <div class="task-main">
                        <span class="task-type-icon">${typeIcon}</span>
                        <span class="task-title ${isCompleted ? 'completed-text' : ''}">${task.title}</span>
                        ${timeStr ? `<span class="task-time">${timeStr}</span>` : ''}
                    </div>
                    ${leadName ? `<div class="task-lead">${leadName}</div>` : ''}
                </div>
                
                <div class="task-priority">
                    <span class="priority-badge priority-${task.priority || 'medium'}">
                        ${this.getPriorityIcon(task.priority)}
                    </span>
                </div>
            </div>
        `;
    },

    // 🎯 Individual Task View (The Sleek Display!)
    renderIndividualTaskView() {
        if (!this.showingTaskView || !this.currentViewTask) {
            return '';
        }

        const task = this.currentViewTask;
        const leadName = task.lead_name || this.getLeadName(task.lead_id);
        const lead = leadName ? this.leads.find(l => l.id == task.lead_id) : null;
        const typeIcon = this.getTaskTypeIcon(task.task_type);
        const priorityIcon = this.getPriorityIcon(task.priority);
        const isCompleted = task.status === 'completed';

        return `
            <div class="task-view-overlay" onclick="SchedulingModule.closeTaskView()">
                <div class="task-view" onclick="event.stopPropagation()">
                    <div class="task-view-header">
                        <button class="back-btn" onclick="SchedulingModule.closeTaskView()">← Back</button>
                        <div class="task-view-title">${typeIcon} ${this.formatTaskType(task.task_type)}</div>
                        <button class="close-btn" onclick="SchedulingModule.closeTaskView()">×</button>
                    </div>
                    
                    <div class="task-view-body">
                        <div class="task-title-section">
                            <h2 class="main-task-title">${task.title}</h2>
                            <div class="task-status-badge ${isCompleted ? 'completed' : 'pending'}">
                                ${isCompleted ? '✅ Completed' : '📋 Pending'}
                            </div>
                        </div>
                        
                        <div class="task-details-grid">
                            ${leadName ? `
                                <div class="detail-item">
                                    <div class="detail-label">👤 Lead:</div>
                                    <div class="detail-value">${leadName}${lead?.company ? ` (${lead.company})` : ''}</div>
                                </div>
                            ` : ''}
                            
                            <div class="detail-item">
                                <div class="detail-label">📅 Due Date:</div>
                                <div class="detail-value">
                                    ${this.formatTaskDate(task.due_date)}
                                    ${task.due_time ? ` at ${this.formatTime(task.due_time)}` : ''}
                                </div>
                            </div>
                            
                            <div class="detail-item">
                                <div class="detail-label">🎯 Priority:</div>
                                <div class="detail-value priority-${task.priority || 'medium'}">
                                    ${priorityIcon} ${this.formatPriority(task.priority)}
                                </div>
                            </div>
                            
                            <div class="detail-item">
                                <div class="detail-label">📋 Status:</div>
                                <div class="detail-value">${isCompleted ? 'Completed' : 'Pending'}</div>
                            </div>
                        </div>
                        
                        ${task.description ? `
                            <div class="notes-section">
                                <div class="notes-label">📝 Notes:</div>
                                <div class="notes-content">${task.description}</div>
                            </div>
                        ` : ''}
                        
                        ${leadName && lead ? `
                            <div class="quick-actions-section">
                                <div class="quick-actions-label">⚡ Quick Actions:</div>
                                <div class="quick-actions-grid">
                                    ${lead.phone ? `
                                        <button class="quick-action-btn call" onclick="SchedulingModule.quickCall('${lead.id}')">
                                            📞 Call ${lead.name.split(' ')[0]}
                                        </button>
                                    ` : ''}
                                    ${lead.email ? `
                                        <button class="quick-action-btn email" onclick="SchedulingModule.quickEmail('${lead.id}')">
                                            📧 Email ${lead.name.split(' ')[0]}
                                        </button>
                                    ` : ''}
                                    <button class="quick-action-btn complete ${isCompleted ? 'undo' : ''}" 
                                            onclick="SchedulingModule.toggleTaskComplete('${task.id}', ${!isCompleted})">
                                        ${isCompleted ? '↩️ Mark Pending' : '✅ Mark Done'}
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <div class="quick-actions-section">
                                <div class="quick-actions-grid single-action">
                                    <button class="quick-action-btn complete ${isCompleted ? 'undo' : ''}" 
                                            onclick="SchedulingModule.toggleTaskComplete('${task.id}', ${!isCompleted})">
                                        ${isCompleted ? '↩️ Mark Pending' : '✅ Mark Done'}
                                    </button>
                                </div>
                            </div>
                        `}
                    </div>
                    
                    <div class="task-view-actions">
                        <button class="edit-task-btn" onclick="SchedulingModule.editTask('${task.id}')">
                            ✏️ Edit Task
                        </button>
                        <button class="delete-task-btn" onclick="SchedulingModule.deleteTask('${task.id}')">
                            🗑️ Delete Task
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // ⚡ Event Listeners Setup (AddLeadModule Style)
    setupEventListeners() {
    // Form submission
    const addForm = document.getElementById('addTaskForm');
    if (addForm && !addForm.hasAttribute('data-listener-added')) {
        addForm.addEventListener('submit', (e) => this.handleSubmit(e));
        addForm.setAttribute('data-listener-added', 'true');
    }

    // Search input
    const searchInput = document.getElementById('taskSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => this.handleSearch(e));
    }

    // Filter dropdowns
    ['statusFilter', 'typeFilter', 'priorityFilter'].forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', () => this.updateTableContent());
        }
    });

    // ESC key to close modals - IMPROVED
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close in priority order
            if (this.showingTaskView) {
                this.closeTaskView();
            } else if (this.showingDayPopup) {
                this.closeDayPopup();
            } else {
                this.hideAllModals();
            }
        }
    });
},

    // 📋 Form Submission
    async handleSubmit(e) {
        e.preventDefault();
        
        try {
            this.setLoadingState(true);
            
            const formData = new FormData(e.target);
            const taskData = Object.fromEntries(formData.entries());
            
            // Clean up data
            if (!taskData.lead_id) taskData.lead_id = null;
            if (!taskData.due_time) taskData.due_time = null;
            if (!taskData.description) taskData.description = null;
            
            // Create task
            const newTask = await API.createTask(taskData);
            
            // Add to local data
            this.tasks.unshift(newTask);
            
            // Close modal and refresh
            this.hideAddTaskModal();
            if (this.currentView === 'table') {
                this.updateTableContent();
            } else {
                this.render();
            }
            
            this.showNotification(`✅ Task "${taskData.title}" created successfully!`, 'success');
            
        } catch (error) {
            console.error('❌ Failed to create task:', error);
            this.showNotification(`❌ ${API.handleAPIError(error, 'CreateTask')}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    },

    // ✅ Toggle Task Complete (Instant Animation!)
    async toggleTaskComplete(taskId, isCompleted) {
    try {
        // 🔥 UPDATE LOCAL STATE FIRST (moved this up)
        const taskIndex = this.tasks.findIndex(t => t.id.toString() === taskId.toString());
        if (taskIndex !== -1) {
            this.tasks[taskIndex].status = isCompleted ? 'completed' : 'pending';
            if (isCompleted) {
                this.tasks[taskIndex].completed_at = new Date().toISOString();
            }
        }
        
        // Visual update (now uses updated state)
        this.updateTaskVisually(taskId, isCompleted);
        
        // Backend call
        if (isCompleted) {
            await API.completeTask(taskId, 'Completed from scheduling module');
        } else {
            await API.updateTask(taskId, { status: 'pending' });
        }

        if (this.showingTaskView && this.currentViewTask && 
            this.currentViewTask.id.toString() === taskId.toString()) {
            this.closeTaskView();
        }
        
        this.showNotification(
            isCompleted ? '✅ Task completed!' : '📋 Task reopened', 
            isCompleted ? 'success' : 'info'
        );
        
    } catch (error) {
        console.error('❌ Failed to toggle task:', error);
        this.revertTaskVisually(taskId, !isCompleted);
        this.showNotification(`❌ ${API.handleAPIError(error)}`, 'error');
    }
},

    // 🎨 Visual Task Updates (Instant Feedback)
    updateTaskVisually(taskId, isCompleted) {
    const checkboxes = document.querySelectorAll(`input[onchange*="${taskId}"]`);
    const taskRows = document.querySelectorAll(`[onclick*="${taskId}"], .popup-task-item[onclick*="${taskId}"]`);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = isCompleted;
    });
    
    taskRows.forEach(row => {
        if (isCompleted) {
            row.classList.add('completed');
            const titleElements = row.querySelectorAll('.task-title');
            titleElements.forEach(title => title.classList.add('completed-text'));
        } else {
            row.classList.remove('completed');
            const titleElements = row.querySelectorAll('.task-title');
            titleElements.forEach(title => title.classList.remove('completed-text'));
        }
    });

    // 🔥 UPDATE CALENDAR BADGES INSTANTLY
if (this.currentView === 'dashboard') {
    const calendarGrid = document.querySelector('.calendar-grid');
    if (calendarGrid) {
        // Get only the calendar day elements (not headers)
        const dayElements = calendarGrid.querySelectorAll('.calendar-day');
        const monthDays = this.getMonthDays(this.currentDate);
        
        dayElements.forEach((dayElement, index) => {
            if (monthDays[index]) {
                dayElement.outerHTML = this.renderCalendarDay(monthDays[index]);
            }
        });
        
        // Re-setup event listeners for the new elements
        this.setupEventListeners();
    }
}
},

    revertTaskVisually(taskId, isCompleted) {
        this.updateTaskVisually(taskId, isCompleted);
    },

    // 🎯 View Management (AddLeadModule Style)
    showDashboard() {
        this.currentView = 'dashboard';
        this.hideAllModals();
        this.render();
    },

    showTableView() {
        this.currentView = 'table';
        this.hideAllModals();
        this.render();
    },

    showAddTaskModal(preSelectedDate = null) {
        this.selectedDate = preSelectedDate;
        const modal = document.getElementById('addTaskModal');
        if (modal) {
            modal.classList.add('show');
            
            setTimeout(() => {
                const form = document.getElementById('addTaskForm');
                if (form) {
                    if (preSelectedDate) {
                        const dateInput = form.querySelector('input[name="due_date"]');
                        if (dateInput) dateInput.value = preSelectedDate;
                    }
                }
                
                const firstInput = modal.querySelector('input[name="title"]');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    },

    hideAddTaskModal() {
        const modal = document.getElementById('addTaskModal');
        if (modal) {
            modal.classList.remove('show');
            this.selectedDate = null;
        }
    },

    showDayTasks(date) {
    this.selectedDate = date;
    this.showingDayPopup = true;
    
    // Instead of full render(), just inject the popup
    this.renderDayPopupOnly();
},

    closeDayPopup() {
    const popup = document.querySelector('.day-popup-overlay');
    if (popup) {
        popup.style.transition = 'opacity 0.3s ease';
        popup.style.opacity = '0';
        
        setTimeout(() => {
            popup.remove();
            this.showingDayPopup = false;
            this.selectedDate = null;
        }, 300);
    } else {
        this.showingDayPopup = false;
        this.selectedDate = null;
    }
},

    showTaskView(taskId) {
    const task = this.tasks.find(t => t.id.toString() === taskId.toString());
    if (task) {
        this.currentViewTask = task;
        this.showingTaskView = true;
        
        // Close day popup first to prevent conflicts
        if (this.showingDayPopup) {
            this.closeDayPopup();
        }
        
        // Use similar pattern - inject task view without full render
        this.renderTaskViewOnly();
    }
},

    closeTaskView() {
    const taskView = document.querySelector('.task-view-overlay');
    if (taskView) {
        taskView.style.transition = 'opacity 0.3s ease';
        taskView.style.opacity = '0';
        
        setTimeout(() => {
            taskView.remove();
            this.showingTaskView = false;
            this.currentViewTask = null;
        }, 300);
    } else {
        this.showingTaskView = false;
        this.currentViewTask = null;
    }
},

    hideAllModals() {
    this.hideAddTaskModal();
    this.hideEditTaskModal();
    this.closeDayPopup();
    this.closeTaskView();
},
    renderTaskViewOnly() {
    // Remove any existing task view
    const existingTaskView = document.querySelector('.task-view-overlay');
    if (existingTaskView) {
        existingTaskView.remove();
    }
    
    // Create and inject the task view
    const taskViewHTML = this.renderIndividualTaskView();
    if (taskViewHTML) {
        document.body.insertAdjacentHTML('beforeend', taskViewHTML);
        
        // Add smooth entrance animation
        const taskView = document.querySelector('.task-view-overlay');
        if (taskView) {
            taskView.style.opacity = '0';
            taskView.style.display = 'flex';
            
            requestAnimationFrame(() => {
                taskView.style.transition = 'opacity 0.3s ease';
                taskView.style.opacity = '1';
            });
        }
    }
},

    // ✏️ Edit Task
    editTask(taskId) {
        const task = this.tasks.find(t => t.id.toString() === taskId.toString());
        if (!task) return;
        
        this.currentEditTask = task;
        this.closeTaskView();
        
        const modal = document.getElementById('editTaskModal');
        const formContainer = document.getElementById('editFormContainer');
        
        if (modal && formContainer) {
            formContainer.innerHTML = this.renderEditTaskForm(task);
            modal.classList.add('show');
            
            const editForm = document.getElementById('editTaskForm');
            if (editForm) {
                editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
            }
        }
    },

    // 🔥 REPLACE these methods to fix date input issues:

renderEditTaskForm(task) {
    const leadOptions = this.leads.map(lead => 
        `<option value="${lead.id}" ${task.lead_id == lead.id ? 'selected' : ''}>
            ${lead.name} ${lead.company ? `(${lead.company})` : ''}
         </option>`
    ).join('');

    // 🔥 FIX: Ensure date stays as-is, no timezone conversion
    const taskDate = task.due_date ? 
        (task.due_date.includes('T') ? task.due_date.split('T')[0] : task.due_date) : '';

    return `
        <form id="editTaskForm" class="task-form">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Task Title *</label>
                    <input type="text" name="title" class="form-input" value="${task.title}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Due Date</label>
                    <input type="date" name="due_date" class="form-input" value="${taskDate}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Due Time</label>
                    <input type="time" name="due_time" class="form-input" value="${task.due_time || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Priority</label>
                    <select name="priority" class="form-select">
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🟠 High</option>
                        <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>🔴 Urgent</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Related Lead</label>
                    <select name="lead_id" class="form-select">
                        <option value="">No lead selected</option>
                        ${leadOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Task Type</label>
                    <select name="task_type" class="form-select">
                        <option value="follow_up" ${task.task_type === 'follow_up' ? 'selected' : ''}>📋 Follow-up</option>
                        <option value="call" ${task.task_type === 'call' ? 'selected' : ''}>📞 Call</option>
                        <option value="email" ${task.task_type === 'email' ? 'selected' : ''}>📧 Email</option>
                        <option value="meeting" ${task.task_type === 'meeting' ? 'selected' : ''}>🤝 Meeting</option>
                        <option value="demo" ${task.task_type === 'demo' ? 'selected' : ''}>🎥 Demo</option>
                        <option value="research" ${task.task_type === 'research' ? 'selected' : ''}>🔍 Research</option>
                        <option value="proposal" ${task.task_type === 'proposal' ? 'selected' : ''}>📊 Proposal</option>
                        <option value="contract" ${task.task_type === 'contract' ? 'selected' : ''}>📄 Contract</option>
                        <option value="task" ${task.task_type === 'task' ? 'selected' : ''}>📝 Task</option>
                    </select>
                </div>
                
                <div class="form-group full-width">
                    <label class="form-label">Notes</label>
                    <textarea name="description" class="form-textarea" rows="3">${task.description || ''}</textarea>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-danger" onclick="SchedulingModule.deleteTask('${task.id}')">
                    🗑️ Delete
                </button>
                <div class="form-actions-right">
                    <button type="button" class="btn-secondary" onclick="SchedulingModule.hideEditTaskModal()">
                        Cancel
                    </button>
                    <button type="submit" class="btn-primary" id="editSubmitBtn">
                        <span class="btn-text">Update Task</span>
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
            const taskData = Object.fromEntries(formData.entries());
            
            // Clean up data
            if (!taskData.lead_id) taskData.lead_id = null;
            if (!taskData.due_time) taskData.due_time = null;
            if (!taskData.description) taskData.description = null;
            
            // Update task
            await API.updateTask(this.currentEditTask.id, taskData);
            
            // Update local data
            const taskIndex = this.tasks.findIndex(t => t.id === this.currentEditTask.id);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
            }
            
            // Close modal and refresh
            this.hideEditTaskModal();
            if (this.currentView === 'table') {
                this.updateTableContent();
            } else {
                this.render();
            }
            
            this.showNotification(`✅ Task "${taskData.title}" updated successfully!`, 'success');
            
        } catch (error) {
            console.error('❌ Failed to update task:', error);
            this.showNotification(`❌ ${API.handleAPIError(error, 'UpdateTask')}`, 'error');
        } finally {
            this.setEditLoadingState(false);
        }
    },

    hideEditTaskModal() {
    const modal = document.getElementById('editTaskModal');
    if (modal) {
        modal.classList.remove('show');
        this.currentEditTask = null;
    }
},

    // 🗑️ Delete Task
    async deleteTask(taskId) {
        const task = this.tasks.find(t => t.id.toString() === taskId.toString());
        if (!task) return;
        
        if (!confirm(`Delete task "${task.title}"?`)) return;
        
        try {
            await API.deleteTask(taskId);
            
            // Remove from local state
            this.tasks = this.tasks.filter(t => t.id.toString() !== taskId.toString());
            
            // Close modals and refresh
            this.hideAllModals();
            if (this.currentView === 'table') {
                this.updateTableContent();
            } else {
                this.render();
            }
            
            this.showNotification(`🗑️ Task "${task.title}" deleted`, 'success');
            
        } catch (error) {
            console.error('❌ Failed to delete task:', error);
            this.showNotification(`❌ ${API.handleAPIError(error)}`, 'error');
        }
    },

    // ⚡ Quick Actions
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

    // 📅 Calendar Navigation
    previousMonth() {
        const newDate = new Date(this.currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        this.currentDate = newDate;
        this.render();
    },

    nextMonth() {
        const newDate = new Date(this.currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        this.currentDate = newDate;
        this.render();
    },

    goToToday() {
        this.currentDate = new Date();
        this.render();
    },

    // 🔍 Search & Filter
    handleSearch(e) {
        this.searchTerm = e.target.value.toLowerCase();
        this.updateTableContent();
    },

    getFilteredTasks() {
        let filtered = this.tasks;
        
        // Search filter
        if (this.searchTerm) {
            filtered = filtered.filter(task => {
                const searchText = `${task.title} ${task.description || ''}`.toLowerCase();
                return searchText.includes(this.searchTerm);
            });
        }
        
        // Status filter
        const statusFilter = document.getElementById('statusFilter')?.value;
        if (statusFilter) {
            if (statusFilter === 'overdue') {
                filtered = filtered.filter(task => this.isTaskOverdue(task));
            } else {
                filtered = filtered.filter(task => task.status === statusFilter);
            }
        }
        
        // Type filter
        const typeFilter = document.getElementById('typeFilter')?.value;
        if (typeFilter) {
            filtered = filtered.filter(task => task.task_type === typeFilter);
        }
        
        // Priority filter
        const priorityFilter = document.getElementById('priorityFilter')?.value;
        if (priorityFilter) {
            filtered = filtered.filter(task => task.priority === priorityFilter);
        }
        
        return filtered;
    },

    updateTableContent() {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            const filteredTasks = this.getFilteredTasks();
            tableContainer.innerHTML = filteredTasks.length > 0 ? 
                this.renderTasksTable(filteredTasks) : 
                this.renderEmptyState();
            
            // Update header count
            const tableTitle = document.querySelector('.table-title');
            if (tableTitle) {
                tableTitle.textContent = `All Tasks (${filteredTasks.length})`;
            }
        }
    },

    // 🔄 Data Refresh
    async refreshData() {
        try {
            await this.loadTasks();
            await this.loadLeads();
            if (this.currentView === 'table') {
                this.updateTableContent();
            } else {
                this.render();
            }
            console.log('✅ Scheduling data refreshed');
        } catch (error) {
            console.error('❌ Failed to refresh data:', error);
        }
    },

    // 🎨 Loading States
    setLoadingState(isLoading) {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.innerHTML = isLoading ? 
                `<div class="btn-loading-spinner"></div><span>Adding...</span>` :
                `<span class="btn-text">Add Task</span>`;
        }
    },

    setEditLoadingState(isLoading) {
        const submitBtn = document.getElementById('editSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.innerHTML = isLoading ? 
                `<div class="btn-loading-spinner"></div><span>Updating...</span>` :
                `<span class="btn-text">Update Task</span>`;
        }
    },

    // 🛠️ Utility Methods
   getTasksForDate(date) {
    console.log('🔍 Calendar looking for date:', date);
    console.log('📋 All tasks:', this.tasks.map(t => ({ 
        id: t.id, 
        title: t.title, 
        due_date: t.due_date,
        due_date_type: typeof t.due_date 
    })));
    
    const filtered = this.tasks.filter(task => {
        if (!task.due_date) return false;
        
        // Handle both date-only and datetime formats
        const taskDate = task.due_date.includes('T') ? 
            task.due_date.split('T')[0] : 
            task.due_date;
            
        console.log(`Comparing: ${taskDate} === ${date} ? ${taskDate === date}`);
        return taskDate === date;
    });
    
    console.log('✅ Filtered tasks for', date, ':', filtered);
    return filtered;
},

    getLeadName(leadId) {
        if (!leadId) return null;
        const lead = this.leads.find(l => l.id == leadId);
        return lead ? lead.name : null;
    },

    isTaskOverdue(task) {
        if (!task.due_date) return false;
        const today = new Date().toISOString().split('T')[0];
        return task.due_date < today && task.status !== 'completed';
    },

    getTaskTypeIcon(type) {
        const iconMap = {
            'call': '📞',
            'email': '📧',
            'meeting': '🤝',
            'demo': '🎥',
            'follow_up': '📋',
            'research': '🔍',
            'proposal': '📊',
            'contract': '📄',
            'task': '📝'
        };
        return iconMap[type] || '📋';
    },

    formatTaskType(type) {
        const typeMap = {
            'call': 'Call',
            'email': 'Email',
            'meeting': 'Meeting',
            'demo': 'Demo',
            'follow_up': 'Follow-up',
            'research': 'Research',
            'proposal': 'Proposal',
            'contract': 'Contract',
            'task': 'Task'
        };
        return typeMap[type] || 'Task';
    },

    getPriorityIcon(priority) {
        const iconMap = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🟠',
            'urgent': '🔴'
        };
        return iconMap[priority] || '🟡';
    },

    formatPriority(priority) {
        const priorityMap = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'urgent': 'Urgent'
        };
        return priorityMap[priority] || 'Medium';
    },

    formatTime(timeString) {
    if (!timeString) return '';
    
    // Parse the time (assuming HH:MM format from backend)
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
},

   formatTaskDate(dateString) {
    if (!dateString) return 'No date';
    
    // Force local date interpretation to avoid timezone issues
    const dateParts = dateString.split('T')[0].split('-');
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    if (dateStr === yesterdayStr) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
},

    formatPopupDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dateStr = date.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (dateStr === todayStr) return 'Today';
        if (dateStr === tomorrowStr) return 'Tomorrow';
        if (dateStr === yesterdayStr) return 'Yesterday';
        
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
    },

    formatMonth(date) {
        return date.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
    },

    getMonthDays(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const firstDayOfWeek = firstDay.getDay();
        
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        const days = [];
        
        // Previous month's trailing days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dateStr = new Date(year, month - 1, day).toISOString().split('T')[0];
            days.push({
                day,
                date: dateStr,
                isCurrentMonth: false
            });
        }
        
        // Current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = new Date(year, month, day).toISOString().split('T')[0];
            days.push({
                day,
                date: dateStr,
                isCurrentMonth: true
            });
        }
        
        // Next month's leading days
        const totalCells = 42; // 6 weeks × 7 days
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

    // 🚫 Empty State
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">No tasks found</div>
                <div class="empty-subtitle">
                    ${this.searchTerm ? 
                        `No tasks match your search criteria.` :
                        'Start organizing your schedule by adding your first task.'
                    }
                </div>
                ${!this.searchTerm ? `
                    <button class="empty-action-btn" onclick="SchedulingModule.showAddTaskModal()">
                        ➕ Add Your First Task
                    </button>
                ` : ''}
            </div>
        `;
    },

    // 🍞 Notifications
    showNotification(message, type = 'info') {
        if (window.SteadyUtils?.showToast) {
            window.SteadyUtils.showToast(message, type);
        } else if (window.AddLeadModule?.showNotification) {
            window.AddLeadModule.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    },

    // 🔄 Loading & Error States (AddLeadModule Style)
    renderLoadingState() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="scheduling-container fade-in">
                    <div class="loading-skeleton">
                        <div class="skeleton-bubbles">
                            <div class="skeleton-bubble"></div>
                            <div class="skeleton-bubble"></div>
                        </div>
                        <div class="skeleton-calendar">
                            <div class="skeleton-header"></div>
                            <div class="skeleton-grid">
                                ${Array(42).fill(0).map(() => '<div class="skeleton-day"></div>').join('')}
                            </div>
                        </div>
                    </div>
                    ${this.renderSkeletonStyles()}
                </div>
            `;
        }
    },

    renderSkeletonStyles() {
        return `
            <style>
                .loading-skeleton {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .skeleton-bubbles {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }

                .skeleton-bubble {
                    height: 150px;
                    background: linear-gradient(90deg, var(--border) 0%, var(--surface-hover) 50%, var(--border) 100%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: var(--radius-lg);
                }

                .skeleton-calendar {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                }

                .skeleton-header {
                    height: 60px;
                    background: linear-gradient(90deg, var(--border) 0%, var(--surface-hover) 50%, var(--border) 100%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: var(--radius);
                    margin-bottom: 2rem;
                }

                .skeleton-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px;
                    background: var(--border);
                    border-radius: var(--radius);
                    overflow: hidden;
                }

                .skeleton-day {
                    height: 100px;
                    background: var(--surface);
                }

                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            </style>
        `;
    },

    renderError(message) {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="scheduling-container fade-in">
                    <div class="error-container">
                        <div class="error-icon">⚠️</div>
                        <h2 class="error-title">Scheduling Module Error</h2>
                        <p class="error-message">${message}</p>
                        <button onclick="SchedulingModule.init()" class="retry-btn">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">Try Again</span>
                        </button>
                    </div>
                </div>
                ${this.renderErrorStyles()}
            `;
        }
    },

    renderErrorStyles() {
        return `
            <style>
                .error-container {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-lg);
                    max-width: 600px;
                    margin: 2rem auto;
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
                    transition: all 0.3s ease;
                    box-shadow: var(--shadow);
                }

                .retry-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }
            </style>
        `;
    },

    renderStyles() {
    return `
        <style>
            /* 🔥 SICK SCHEDULING MODULE STYLES - COMPLETE SYSTEM */
            .scheduling-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 0;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            /* 🎪 ACTION BUBBLES (AddLeadModule Style) */
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

            /* 📅 CALENDAR SECTION */
            .calendar-section {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: var(--radius-lg);
                padding: 2rem;
                box-shadow: var(--shadow-lg);
            }

            .calendar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--border);
            }

            .calendar-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
                background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .calendar-nav {
                display: flex;
                gap: 1rem;
                align-items: center;
            }

            .nav-btn, .today-btn {
                background: var(--surface-hover);
                border: 1px solid var(--border);
                color: var(--text-primary);
                padding: 0.5rem 1rem;
                border-radius: var(--radius);
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
            }

            .nav-btn:hover, .today-btn:hover {
                background: var(--primary);
                color: white;
                border-color: var(--primary);
                transform: translateY(-1px);
            }

            .today-btn {
                background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                color: white;
                border-color: var(--primary);
            }

            .calendar-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 1px;
                background: var(--border);
                border-radius: var(--radius);
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .day-header {
                background: var(--surface-hover);
                padding: 1rem;
                text-align: center;
                font-weight: 700;
                font-size: 0.9rem;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .calendar-day {
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

/* 🔥 ADAPTIVE TASK BADGES - RED/GREEN SYSTEM */
.pending-badge {
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

.completed-badge {
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

.top-right {
    top: 8px;
    right: 8px;
}

.below-red {
    top: 32px;
    right: 8px;
}

.pending-badge.overdue-pulse {
    animation: overduePulse 7s infinite;
    transform-origin: center;
}

@keyframes overduePulse {
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

            .calendar-day:hover {
                background: var(--surface-hover);
                transform: scale(1.02);
                z-index: 10;
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
            }

            .calendar-day.today {
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
                border: 2px solid var(--primary);
            }

            .calendar-day.other-month {
                opacity: 0.3;
                background: var(--surface-hover);
            }

            .calendar-day.other-month:hover {
                opacity: 0.6;
            }

            .day-number {
                font-size: 1.1rem;
                font-weight: 700;
                color: var(--text-primary);
                line-height: 1;
                position: relative;
            }

            .calendar-day.today .day-number {
                color: var(--primary);
                font-size: 1.2rem;
            }

            @keyframes taskCountPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            /* 📊 TABLE VIEW */
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

            .filter-section {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
                padding: 1rem;
                background: var(--surface-hover);
                border-radius: var(--radius);
                border: 1px solid var(--border);
            }

            .filter-select {
                background: var(--background);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
                color: var(--text-primary);
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .filter-select:focus {
                outline: none;
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .table-container {
                border-radius: var(--radius);
                overflow: hidden;
                border: 1px solid var(--border);
            }

            .tasks-table {
                width: 100%;
                border-collapse: collapse;
                background: var(--surface);
            }

            .tasks-table th {
                background: var(--surface-hover);
                padding: 1rem;
                text-align: left;
                font-weight: 600;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border);
                font-size: 0.9rem;
            }

            .tasks-table td {
                padding: 1rem;
                font-size: 0.9rem;
            }

            .checkbox-col {
                width: 50px;
                text-align: center;
            }

            .task-checkbox {
                width: 18px;
                height: 18px;
                cursor: pointer;
                accent-color: var(--primary);
            }

            .task-row {
                transition: all 0.3s ease;
                cursor: pointer;
                border-bottom: 1px solid var(--border);
            }

            .task-row:hover {
                background: var(--surface-hover);
                transform: scale(1.005);
            }

            .task-row.completed {
                opacity: 0.7;
            }

            .task-row.overdue {
                background: rgba(239, 68, 68, 0.05);
                border-left: 4px solid var(--danger);
            }

            .clickable-row {
                cursor: pointer;
            }

            .task-cell {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .task-title {
                font-weight: 600;
                color: var(--text-primary);
                line-height: 1.2;
            }

            .task-title.completed-text {
                text-decoration: line-through;
                opacity: 0.7;
            }

            .task-time {
                font-size: 0.8rem;
                color: var(--text-secondary);
            }

            .lead-cell {
                color: var(--text-secondary);
            }

            .lead-name {
                font-weight: 500;
            }

            .no-lead {
                color: var(--text-tertiary);
                font-style: italic;
            }

            .type-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: var(--surface-hover);
                color: var(--text-secondary);
                padding: 0.25rem 0.75rem;
                border-radius: var(--radius);
                font-size: 0.8rem;
                font-weight: 500;
            }

            .date-cell {
                color: var(--text-secondary);
            }

            .overdue-date {
                color: var(--danger);
                font-weight: 600;
            }

            .priority-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.8rem;
                font-weight: 600;
            }

            .priority-low { background: rgba(16, 185, 129, 0.1); color: var(--success); }
            .priority-medium { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
            .priority-high { background: rgba(249, 115, 22, 0.1); color: #f97316; }
            .priority-urgent { 
                background: rgba(239, 68, 68, 0.1); 
                color: var(--danger);
                animation: urgentPulse 2s infinite;
            }

            @keyframes urgentPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }

            /* 🎪 MODALS & POPUPS */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .modal-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
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

            /* 📝 FORMS */
            .task-form {
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
            .form-textarea,
            .form-select {
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
            .form-textarea:focus,
            .form-select:focus {
                outline: none;
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                transform: translateY(-1px);
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

            .btn-loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* 🎪 DAY TASKS POPUP */
            .day-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                padding: 2rem;
                animation: fadeIn 0.3s ease;
            }

            .day-popup {
                background: var(--surface);
                border-radius: 20px;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
                width: 100%;
                max-width: 500px;
                max-height: 80vh;
                overflow: hidden;
                border: 1px solid var(--border);
                animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .popup-header {
                background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                color: white;
                padding: 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                position: relative;
            }

            .popup-title {
                font-size: 1.25rem;
                font-weight: 700;
                margin: 0 0 0.5rem 0;
            }

            .popup-stats {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
            }

            .task-count,
            .pending-count,
            .completed-count {
                background: rgba(255, 255, 255, 0.2);
                padding: 0.25rem 0.5rem;
                border-radius: 8px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .popup-close {
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

            .popup-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }

            .popup-body {
                padding: 1.5rem;
                max-height: 50vh;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .popup-task-item {
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

            .popup-task-item:hover {
                background: var(--border);
                transform: translateX(4px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
            }

            .popup-task-item.completed {
                opacity: 0.7;
            }

            .clickable-item {
                cursor: pointer;
            }

            .task-checkbox-wrapper {
                flex-shrink: 0;
            }

            .task-info {
                flex: 1;
                min-width: 0;
            }

            .task-main {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.25rem;
            }

            .task-type-icon {
                font-size: 1rem;
                flex-shrink: 0;
            }

            .task-lead {
                font-size: 0.8rem;
                color: var(--text-secondary);
            }

            .task-priority {
                flex-shrink: 0;
            }

            .popup-actions {
                padding: 1rem 1.5rem;
                background: var(--surface-hover);
                border-top: 1px solid var(--border);
            }

            .action-btn {
                width: 100%;
                padding: 0.875rem 1.5rem;
                border: none;
                border-radius: var(--radius);
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                font-size: 0.9rem;
            }

            .action-btn.primary {
                background: var(--primary);
                color: white;
            }

            .action-btn.primary:hover {
                background: var(--primary-dark);
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .empty-day {
                text-align: center;
                padding: 2rem;
                color: var(--text-secondary);
            }

            .empty-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                opacity: 0.6;
            }

            .empty-message {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--text-primary);
            }

            /* 🎯 INDIVIDUAL TASK VIEW */
            .task-view-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                padding: 2rem;
                animation: fadeIn 0.3s ease;
            }

            .task-view {
                background: var(--surface);
                border-radius: 20px;
                box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
                width: 100%;
                max-width: 700px;
                max-height: 90vh;
                overflow: hidden;
                border: 1px solid var(--border);
                animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .task-view-header {
                background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
                color: white;
                padding: 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .task-view-title {
                font-size: 1.125rem;
                font-weight: 600;
                margin: 0 1rem;
                flex: 1;
                text-align: center;
            }

            .close-btn {
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

            .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }

            .task-view-body {
                padding: 2rem;
                overflow-y: auto;
                max-height: 60vh;
            }

            .task-title-section {
                margin-bottom: 2rem;
                text-align: center;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid var(--border);
            }

            .main-task-title {
                font-size: 1.75rem;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0 0 1rem 0;
                line-height: 1.2;
            }

            .task-status-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                border-radius: 9999px;
                font-weight: 600;
                font-size: 0.9rem;
            }

            .task-status-badge.completed {
                background: rgba(16, 185, 129, 0.1);
                color: var(--success);
            }

            .task-status-badge.pending {
                background: rgba(245, 158, 11, 0.1);
                color: var(--warning);
            }

            .task-details-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .detail-item {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .detail-label {
                font-weight: 600;
                color: var(--text-secondary);
                font-size: 0.9rem;
            }

            .detail-value {
                font-weight: 500;
                color: var(--text-primary);
                font-size: 1rem;
            }

            .notes-section {
                margin-bottom: 2rem;
                padding: 1.5rem;
                background: var(--surface-hover);
                border-radius: var(--radius);
                border: 1px solid var(--border);
            }

            .notes-label {
                font-weight: 600;
                color: var(--text-secondary);
                margin-bottom: 0.75rem;
                font-size: 0.9rem;
            }

            .notes-content {
                color: var(--text-primary);
                line-height: 1.6;
                white-space: pre-wrap;
            }

            .quick-actions-section {
                margin-bottom: 2rem;
            }

            .quick-actions-label {
                font-weight: 600;
                color: var(--text-secondary);
                margin-bottom: 1rem;
                font-size: 0.9rem;
            }

            .quick-actions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 1rem;
            }

            .quick-actions-grid.single-action {
                grid-template-columns: 1fr;
            }

            .quick-action-btn {
                padding: 0.875rem 1.5rem;
                border: none;
                border-radius: var(--radius);
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                font-size: 0.9rem;
            }

            .quick-action-btn.call {
                background: rgba(34, 197, 94, 0.1);
                color: var(--success);
                border: 1px solid rgba(34, 197, 94, 0.3);
            }

            .quick-action-btn.call:hover {
                background: var(--success);
                color: white;
                transform: translateY(-1px);
            }

            .quick-action-btn.email {
                background: rgba(59, 130, 246, 0.1);
                color: #3b82f6;
                border: 1px solid rgba(59, 130, 246, 0.3);
            }

            .quick-action-btn.email:hover {
                background: #3b82f6;
                color: white;
                transform: translateY(-1px);
            }

            .quick-action-btn.complete {
                background: rgba(102, 126, 234, 0.1);
                color: var(--primary);
                border: 1px solid rgba(102, 126, 234, 0.3);
            }

            .quick-action-btn.complete:hover {
                background: var(--primary);
                color: white;
                transform: translateY(-1px);
            }

            .quick-action-btn.undo {
                background: rgba(245, 158, 11, 0.1);
                color: var(--warning);
                border: 1px solid rgba(245, 158, 11, 0.3);
            }

            .quick-action-btn.undo:hover {
                background: var(--warning);
                color: white;
                transform: translateY(-1px);
            }

            .task-view-actions {
                padding: 1.5rem;
                background: var(--surface-hover);
                border-top: 1px solid var(--border);
                display: flex;
                gap: 1rem;
                justify-content: center;
            }

            .edit-task-btn {
                padding: 0.875rem 2rem;
                background: var(--primary);
                color: white;
                border: none;
                border-radius: var(--radius);
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .edit-task-btn:hover {
                background: var(--primary-dark);
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .delete-task-btn {
                padding: 0.875rem 2rem;
                background: var(--danger);
                color: white;
                border: none;
                border-radius: var(--radius);
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .delete-task-btn:hover {
                background: #dc2626;
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
            }

            /* 🚫 EMPTY STATE */
            .empty-state {
                text-align: center;
                padding: 4rem 2rem;
                color: var(--text-secondary);
            }

            .empty-icon {
                font-size: 4rem;
                margin-bottom: 1.5rem;
                opacity: 0.6;
            }

            .empty-title {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.75rem;
                color: var(--text-primary);
            }

            .empty-subtitle {
                font-size: 1.1rem;
                margin-bottom: 2rem;
                line-height: 1.5;
            }

            .empty-action-btn {
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

            .empty-action-btn:hover {
                background: var(--primary-dark);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            /* 🎬 ANIMATIONS */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
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
                animation: fadeIn 0.6s ease;
            }

            /* 📱 MOBILE RESPONSIVE */
            @media (max-width: 768px) {
                .action-bubbles {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .action-bubble {
                    padding: 1.5rem;
                    flex-direction: column;
                    text-align: center;
                    gap: 1rem;
                }

                .bubble-icon {
                    width: 60px;
                    height: 60px;
                    font-size: 2rem;
                }

                .calendar-section {
                    padding: 1rem;
                }

                .calendar-header {
                    flex-direction: column;
                    gap: 1rem;
                    align-items: stretch;
                }

                .calendar-nav {
                    justify-content: center;
                }

                .calendar-day {
                    min-height: 80px;
                    padding: 0.5rem;
                }

                .day-number {
                    font-size: 1rem;
                }

                .task-count {
                    width: 18px;
                    height: 18px;
                    font-size: 0.6rem;
                    top: -6px;
                    right: -6px;
                }

                .table-view {
                    padding: 1rem;
                    overflow-x: auto;
                }

                .table-header {
                    flex-direction: column;
                    gap: 1rem;
                    align-items: stretch;
                }

                .search-input {
                    width: 100%;
                }

                .filter-section {
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .tasks-table {
                    min-width: 700px;
                }

                .modal {
                    margin: 1rem;
                    max-width: none;
                }

                .modal-body {
                    padding: 1rem;
                }

                .form-grid {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .form-actions {
                    flex-direction: column;
                    gap: 1rem;
                }

                .form-actions-right {
                    width: 100%;
                    justify-content: stretch;
                }

                .btn-primary,
                .btn-secondary,
                .btn-danger {
                    flex: 1;
                    justify-content: center;
                }

                .day-popup {
                    margin: 1rem;
                    max-width: none;
                }

                .task-view {
                    margin: 1rem;
                    max-width: none;
                }

                .task-details-grid {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .quick-actions-grid {
                    grid-template-columns: 1fr;
                }

                .task-view-actions {
                    flex-direction: column;
                }
            }

            @media (max-width: 480px) {
                .bubble-title {
                    font-size: 1.25rem;
                }

                .calendar-title {
                    font-size: 1.25rem;
                }

                .main-task-title {
                    font-size: 1.5rem;
                }

                .popup-header {
                    padding: 1rem;
                }

                .popup-body {
                    padding: 1rem;
                }

                .task-view-body {
                    padding: 1rem;
                }
            }
        </style>
    `;
},

// 🔄 Refresh method for external calls
async refresh() {
    await this.refreshData();
},

// 📱 Responsive helper
isMobile() {
    return window.innerWidth <= 768;
},

// 🎯 Export functionality (for future use)
exportTasks() {
    const csv = this.tasksToCSV();
    this.downloadCSV(csv, 'tasks.csv');
},

tasksToCSV() {
    if (this.tasks.length === 0) return '';
    
    const headers = ['Title', 'Type', 'Priority', 'Due Date', 'Due Time', 'Status', 'Lead', 'Notes'];
    const rows = this.tasks.map(task => [
        task.title,
        this.formatTaskType(task.task_type),
        this.formatPriority(task.priority),
        task.due_date || '',
        task.due_time || '',
        task.status,
        task.lead_name || this.getLeadName(task.lead_id) || '',
        task.description || ''
    ]);
    
    return [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
},

downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
},

// 🔧 Debugging helpers
debug() {
    console.log('🔍 SchedulingModule Debug Info:');
    console.log('📋 Tasks:', this.tasks);
    console.log('👥 Leads:', this.leads);
    console.log('🎯 Current View:', this.currentView);
    console.log('📅 Current Date:', this.currentDate);
    console.log('🔍 Search Term:', this.searchTerm);
    console.log('🎪 Modals:', {
        dayPopup: this.showingDayPopup,
        taskView: this.showingTaskView,
        selectedDate: this.selectedDate
    });
},

// 🎯 Keyboard shortcuts
setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only activate if no modal is open and not typing in input
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' ||
            this.showingDayPopup || this.showingTaskView) return;
        
        switch(e.key) {
            case 'n':
                e.preventDefault();
                this.showAddTaskModal();
                break;
            case 't':
                e.preventDefault();
                this.showTableView();
                break;
            case 'd':
                e.preventDefault();
                this.showDashboard();
                break;
            case 'r':
                e.preventDefault();
                this.refreshData();
                break;
        }
    });
},

// 🎉 Success message variations
getRandomSuccessMessage(action) {
    const messages = {
        create: [
            '🎉 Task created successfully!',
            '✨ New task added to your schedule!',
            '🚀 Task scheduled and ready to go!',
            '⭐ Your productivity just leveled up!'
        ],
        complete: [
            '🎯 Task completed! Nice work!',
            '✅ Another one bites the dust!',
            '🏆 You\'re on fire today!',
            '💪 Keep crushing those tasks!'
        ],
        delete: [
            '🗑️ Task deleted successfully',
            '✨ Cleared from your schedule',
            '🧹 All cleaned up!',
            '👋 Task removed from your list'
        ]
    };
    
    const variants = messages[action] || messages.create;
    return variants[Math.floor(Math.random() * variants.length)];
},

// 🎨 Theme awareness
updateTheme() {
    // Auto-detect theme changes and refresh if needed
    const isDark = document.documentElement.classList.contains('dark');
    console.log(`🎨 Theme detected: ${isDark ? 'Dark' : 'Light'}`);
},

// 🔄 Auto-refresh setup
setupAutoRefresh(intervalMinutes = 5) {
    if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(async () => {
        try {
            await this.refreshData();
            console.log('🔄 Auto-refreshed scheduling data');
        } catch (error) {
            console.error('❌ Auto-refresh failed:', error);
        }
    }, intervalMinutes * 60 * 1000);
    
    console.log(`⏰ Auto-refresh enabled: every ${intervalMinutes} minutes`);
},

// 🧹 Cleanup
destroy() {
    if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
    }
    
    // Remove all event listeners
    document.removeEventListener('keydown', this.setupKeyboardShortcuts);
    
    console.log('🧹 SchedulingModule cleaned up');
}

}; // End of SchedulingModule object

// 🚀 Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎬 DOM loaded, SchedulingModule ready for init()');
    });
} else {
    console.log('🎬 DOM already loaded, SchedulingModule ready for init()');
}

console.log('🔥 SICK Scheduling Module v2.0 COMPLETE!');
console.log('📋 Features: Calendar, Tasks, Mobile-responsive, Animations');
console.log('🎯 Usage: SchedulingModule.init() to start');
console.log('⌨️  Shortcuts: N=new task, T=table, D=dashboard, R=refresh');