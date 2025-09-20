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
    targetContainer: 'tasks-content',
    currentDate: new Date(),
    selectedDate: null,
    showingDayPopup: false,
    showingTaskView: false,
    currentViewTask: null,
    showingDeleteConfirm: false,
    lastNotificationMessage: null,
    lastNotificationTime: 0,
    taskToDelete: null,
    isLoading: false,
    showingLeadPicker: false,
    leadPickerCallback: null,
    currentSelectedLead: null,
    leadSearchTerm: '',
    taskActionLoading: false,
    isTransitioning: false,
    searchTerm: '',
    currentFilters: {
        type: '',
        date: '',
        priority: ''
    },

    // Event listener references for cleanup
    documentChangeHandler: null,
    documentInputHandler: null,
    documentFocusHandler: null,
    documentBlurHandler: null,
    documentKeydownHandler: null,

    // 🚀 Simple Initialization (AddLeadModule Style)
    async init(targetContainer = 'tasks-content') {

    this.hideAllDropdowns();
    this.targetContainer = targetContainer; // ADD THIS LINE
    this.isTransitioning = true;
        
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
            
            setTimeout(() => {
            this.isTransitioning = false;
            console.log('✅ Scheduling Module ready for interactions!');
        }, 600);
        
        console.log('✅ Scheduling Module is fucking ready!');
        
    } catch (error) {
        console.error('❌ Scheduling Module failed:', error);
        this.renderError(error.message);
        this.isTransitioning = false; // 🔥 Clear on error too
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
    const container = document.getElementById(this.targetContainer);
    if (!container) return;
    container.innerHTML = `
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
    

    renderTableView() {
    return `
        <div class="table-view">
            <div class="table-header">
                <div class="table-header-left">
                    <button class="back-btn" onclick="SchedulingModule.showDashboard()">
                        ← Back to Dashboard
                    </button>
                    <h2 class="table-title">All Tasks (${this.tasks.length})</h2>
                </div>
                <div class="table-header-right">
    <button class="refresh-table-btn" onclick="SchedulingModule.refreshTable()">
        🔄 Refresh
    </button>
    <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text"
               class="search-input"
               placeholder="Search tasks..."
               id="taskSearch">
    </div>
    <button class="add-task-btn" onclick="SchedulingModule.showAddTaskModal()">
        + Add Task
    </button>
</div>
            </div>
            
            ${this.renderActiveFiltersPanel()}
            
            <div class="table-container">
            ${this.getFilteredAndSortedTasks().length > 0 ? this.renderTasksTable(this.getFilteredAndSortedTasks()) : this.renderEmptyState()}
            </div>
        </div>
    `;
},

    // Replace the problematic header section in renderTasksTable()
renderTasksTable(tasks) {
    return `
        <table class="tasks-table">
            <thead>
                <tr>
                    <th class="checkbox-col">✓</th>
                    <th>Task</th>
                    <th>Lead</th>
                    <th>
                        <div class="simple-header-filter" onclick="SchedulingModule.showTypeFilter(event)">
                            Type <span class="simple-arrow">▼</span>
                        </div>
                    </th>
                    <th>
                        <div class="simple-header-filter" onclick="SchedulingModule.showDateFilter(event)">
                            Due Date <span class="simple-arrow">▼</span>
                        </div>
                    </th>
                    <th>
                        <div class="simple-header-filter" onclick="SchedulingModule.showPriorityFilter(event)">
                            Priority <span class="simple-arrow">▼</span>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(task => this.renderTaskRow(task)).join('')}
            </tbody>
        </table>
        
        <!-- Single filter dropdown that repositions -->
        <div class="unified-filter-dropdown" id="filterDropdown" style="display: none;">
            <div class="filter-options" id="filterOptions">
                <!-- Options populated by showXFilter methods -->
            </div>
        </div>
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
    data-priority="${task.priority || 'medium'}"
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
        <div class="modal-overlay" id="addTaskModal" onclick="SchedulingModule.hideAddTaskModal()">
            <div class="modal" onclick="event.stopPropagation()">
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
        <div class="modal-overlay" id="editTaskModal" onclick="SchedulingModule.hideEditTaskModal()">
    <div class="modal" onclick="event.stopPropagation()">
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

showLeadPicker(callback) {
    this.leadPickerCallback = callback;
    this.showingLeadPicker = true;
    this.leadSearchTerm = '';
    this.renderLeadPickerOnly();
},

closeLeadPicker() {
    const popup = document.querySelector('.lead-picker-overlay');
    if (popup) {
        popup.style.transition = 'opacity 0.3s ease';
        popup.style.opacity = '0';
        
        setTimeout(() => {
            popup.remove();
            this.showingLeadPicker = false;
            this.leadPickerCallback = null;
            this.leadSearchTerm = '';
        }, 300);
    } else {
        this.showingLeadPicker = false;
        this.leadPickerCallback = null;
        this.leadSearchTerm = '';
    }
},

selectLead(lead) {
    if (this.leadPickerCallback) {
        this.leadPickerCallback(lead);
    }
    this.closeLeadPicker();
},

handleLeadSearch(query) {
    this.leadSearchTerm = query.toLowerCase();
    this.updateLeadPickerResults();
},

getFilteredLeads() {
    if (!this.leadSearchTerm) return this.leads;
    
    return this.leads.filter(lead => {
        const searchText = `${lead.name} ${lead.company || ''} ${lead.email || ''}`.toLowerCase();
        return searchText.includes(this.leadSearchTerm);
    });
},

updateLeadPickerResults() {
    const resultsContainer = document.querySelector('.lead-picker-results');
    if (resultsContainer) {
        const filteredLeads = this.getFilteredLeads();
        resultsContainer.innerHTML = this.renderLeadPickerResults(filteredLeads);
    }
},

renderLeadPickerOnly() {
    const existingPicker = document.querySelector('.lead-picker-overlay');
    if (existingPicker) {
        existingPicker.remove();
    }
    
    const pickerHTML = this.renderLeadPickerPopup();
    if (pickerHTML) {
        document.body.insertAdjacentHTML('beforeend', pickerHTML);
        
        const picker = document.querySelector('.lead-picker-overlay');
        if (picker) {
            picker.style.opacity = '0';
            picker.style.display = 'flex';
            
            requestAnimationFrame(() => {
                picker.style.transition = 'opacity 0.3s ease';
                picker.style.opacity = '1';
                
                // Focus search input
                const searchInput = picker.querySelector('.lead-search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            });
        }
    }
},

renderLeadPickerPopup() {
    if (!this.showingLeadPicker) return '';
    
    const filteredLeads = this.getFilteredLeads();
    
    return `
        <div class="lead-picker-overlay" onclick="SchedulingModule.closeLeadPicker()">
            <div class="lead-picker-popup" onclick="event.stopPropagation()">
                <div class="lead-picker-header">
                    <h3 class="lead-picker-title">🔍 Select Lead</h3>
                    <button class="lead-picker-close" onclick="SchedulingModule.closeLeadPicker()">×</button>
                </div>
                
                <div class="lead-picker-search">
                    <input type="text" 
                           class="lead-search-input" 
                           placeholder="Search leads by name, company, or email..."
                           value="${this.leadSearchTerm}"
                           oninput="SchedulingModule.handleLeadSearch(this.value)">
                    <span class="search-icon">🔍</span>
                </div>
                
                <div class="lead-picker-results">
                    ${this.renderLeadPickerResults(filteredLeads)}
                </div>
                
                <div class="lead-picker-actions">
                    <button class="lead-picker-btn secondary" onclick="SchedulingModule.selectLead(null)">
                        ❌ Clear Selection
                    </button>
                </div>
            </div>
        </div>
    `;
},

renderLeadPickerResults(leads) {
    if (leads.length === 0) {
        return `
            <div class="lead-picker-empty">
                <div class="empty-icon">👤</div>
                <div class="empty-message">
                    ${this.leadSearchTerm ? 
                        `No leads found matching "${this.leadSearchTerm}"` :
                        'No leads available'
                    }
                </div>
            </div>
        `;
    }
    
    return leads
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(lead => this.renderLeadPickerItem(lead))
        .join('');
},

renderLeadPickerItem(lead) {
    const statusColor = API.getStatusColor(lead.status);  // Use API.getStatusColor
    const typeIcon = API.getTypeIcon(lead.type);          // Use API.getTypeIcon
    
    return `
        <div class="lead-picker-item" onclick="SchedulingModule.selectLead(${JSON.stringify(lead).replace(/"/g, '&quot;')})">
            <div class="lead-item-main">
                <div class="lead-item-header">
                    <span class="lead-name">${lead.name}</span>
                    <span class="lead-type">${typeIcon}</span>
                </div>
                ${lead.company ? `<div class="lead-company">${lead.company}</div>` : ''}
                ${lead.email ? `<div class="lead-email">${lead.email}</div>` : ''}
            </div>
            <div class="lead-item-status">
                <span class="status-badge" style="background-color: ${statusColor}20; color: ${statusColor};">
                    ${lead.status || 'new'}
                </span>
            </div>
        </div>
    `;
},

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
                    <input type="text" 
                           name="title" 
                           class="form-input" 
                           required 
                           maxlength="25"
                           placeholder="Follow up with John Smith"
                           oninput="SchedulingModule.validateTitleInput(this)">
                    <div class="input-feedback" id="title-feedback"></div>
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
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                
                ${this.renderLeadSelector(null, 'add')}
                
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
                    <textarea name="description" 
                              class="form-textarea" 
                              rows="3" 
                              maxlength="600"
                              placeholder="Additional details about this task..."
                              oninput="SchedulingModule.validateNotesInput(this)"></textarea>
                    <div class="input-feedback" id="notes-feedback"></div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="SchedulingModule.hideAddTaskModal()">
                    Cancel
                </button>
                <button type="submit" class="btn-primary" id="taskSubmitBtn">
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

   // 🎯 Individual Task View (Clean & Professional!)
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
                <button class="close-btn" onclick="SchedulingModule.closeTaskView()" style="position: absolute; top: 1rem; right: 1rem; z-index: 10;">×</button>
                
                <div class="task-view-body">
                    <div class="task-title-section">
                        <h2 class="main-task-title">${task.title}</h2>
                        <div class="task-status-badge ${isCompleted ? 'completed' : 'pending'}">
                            ${isCompleted ? 'Completed' : 'Pending'}
                        </div>
                    </div>
                    
                    <div class="task-details-grid">
                        ${leadName ? `
                            <div class="detail-item">
                                <div class="detail-label">Lead:</div>
                                <div class="detail-value">${leadName}${lead?.company ? ` (${lead.company})` : ''}</div>
                            </div>
                        ` : ''}
                        
                        <div class="detail-item">
                            <div class="detail-label">Due Date:</div>
                            <div class="detail-value">
                                ${this.formatTaskDate(task.due_date)}
                                ${task.due_time ? ` at ${this.formatTime(task.due_time)}` : ''}
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Priority:</div>
                            <div class="detail-value priority-${task.priority || 'medium'}">
                                ${priorityIcon} ${this.formatPriority(task.priority)}
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Task Type:</div>
                            <div class="detail-value">${typeIcon} ${this.formatTaskType(task.task_type)}</div>
                        </div>
                    </div>
                    
                    ${task.description ? `
    <div class="detail-item">
        <div class="detail-label">Notes:</div>
        <div class="detail-value">${task.description}</div>
    </div>
` : ''}
                    
                    ${leadName && lead ? `
                        <div class="quick-actions-section">
                            <div class="quick-actions-label">Quick Actions:</div>
                            <div class="quick-actions-grid">
                                ${lead.phone ? `
                                    <button class="quick-action-btn call" onclick="SchedulingModule.quickCall('${lead.id}')">
                                        Call ${lead.name.split(' ')[0]}
                                    </button>
                                ` : ''}
                                ${lead.email ? `
                                    <button class="quick-action-btn email" onclick="SchedulingModule.quickEmail('${lead.id}')">
                                        Email ${lead.name.split(' ')[0]}
                                    </button>
                                ` : ''}
                                <button class="quick-action-btn complete ${isCompleted ? 'undo' : ''}" 
                                        onclick="SchedulingModule.toggleTaskComplete('${task.id}', ${isCompleted ? false : true})">
                                    ${isCompleted ? 'Mark Pending' : 'Mark Complete'}
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="quick-actions-section">
                            <div class="quick-actions-grid single-action">
                                <button class="quick-action-btn complete ${isCompleted ? 'undo' : ''}" 
                                        onclick="SchedulingModule.toggleTaskComplete('${task.id}', ${isCompleted ? false : true})">
                                    ${isCompleted ? 'Mark Pending' : 'Mark Complete'}
                                </button>
                            </div>
                        </div>
                    `}
                </div>
                
                <div class="task-view-actions">
                    <button class="edit-task-btn" onclick="SchedulingModule.editTask('${task.id}')">
                        Edit Task
                    </button>
                    <button class="delete-task-btn" onclick="SchedulingModule.deleteTask('${task.id}')">
                        Delete Task
                    </button>
                </div>
            </div>
        </div>
    `;
},

    setupEventListeners() {
    // Clean up existing listeners first
    this.removeDocumentListeners();
    
    // Form submission
    const addForm = document.getElementById('addTaskForm');
    if (addForm && !addForm.hasAttribute('data-listener-added')) {
        addForm.addEventListener('submit', (e) => this.handleSubmit(e));
        addForm.setAttribute('data-listener-added', 'true');
    }

    // Search input
    const searchInput = document.getElementById('taskSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.updateTableContent();
        });
    }

    // Store handler references for cleanup
    this.documentChangeHandler = (e) => {
        // Priority dropdown glow effects
        if (e.target.name === 'priority') {
            const dropdown = e.target;
            const priority = dropdown.value;
            dropdown.classList.remove('priority-low', 'priority-medium', 'priority-high', 'priority-urgent');
            if (priority) {
                dropdown.classList.add(`priority-${priority}`);
            }
        }
    };
    document.addEventListener('change', this.documentChangeHandler);

    // Close filters when clicking outside
    document.addEventListener('click', () => {
        this.hideAllFilters();
    });

    // Form validation handlers
    this.documentInputHandler = (e) => {
        if (e.target.name === 'title') {
            this.validateTitleInput(e.target);
        } else if (e.target.name === 'description') {
            this.validateNotesInput(e.target);
        }
    };
    document.addEventListener('input', this.documentInputHandler);

    // Focus/blur validation
    this.documentFocusHandler = (e) => {
        if (e.target.name === 'title' || e.target.name === 'description') {
            this.validateTitleInput?.(e.target) || this.validateNotesInput?.(e.target);
        }
    };
    document.addEventListener('focus', this.documentFocusHandler, true);

    this.documentBlurHandler = (e) => {
        if (e.target.name === 'title' || e.target.name === 'description') {
            this.validateTitleInput?.(e.target) || this.validateNotesInput?.(e.target);
        }
    };
    document.addEventListener('blur', this.documentBlurHandler, true);

    // Priority glow setup
    setTimeout(() => {
        document.querySelectorAll('select[name="priority"]').forEach(dropdown => {
            if (dropdown.value) {
                dropdown.classList.remove('priority-low', 'priority-medium', 'priority-high', 'priority-urgent');
                dropdown.classList.add(`priority-${dropdown.value}`);
            }
        });
    }, 100);

    // ESC key modal closing
this.documentKeydownHandler = (e) => {
    if (e.key === 'Escape') {
        if (this.showingDeleteConfirm) this.cancelDelete();
        else if (this.showingTaskView) this.closeTaskView();
        else if (this.showingDayPopup) this.closeDayPopup();
        else this.hideAllModals();
    }
};
document.addEventListener('keydown', this.documentKeydownHandler);
},

removeDocumentListeners() {
    if (this.documentChangeHandler) {
        document.removeEventListener('change', this.documentChangeHandler);
        this.documentChangeHandler = null;
    }
    if (this.documentInputHandler) {
        document.removeEventListener('input', this.documentInputHandler);
        this.documentInputHandler = null;
    }
    if (this.documentFocusHandler) {
        document.removeEventListener('focus', this.documentFocusHandler, true);
        this.documentFocusHandler = null;
    }
    if (this.documentBlurHandler) {
        document.removeEventListener('blur', this.documentBlurHandler, true);
        this.documentBlurHandler = null;
    }
    if (this.documentKeydownHandler) {
        document.removeEventListener('keydown', this.documentKeydownHandler);
        this.documentKeydownHandler = null;
    }
},

    // 📋 Form Submission
    async handleSubmit(e) {
    e.preventDefault();
    
    try {
        this.setLoadingState(true);
        
        const formData = new FormData(e.target);
        const rawData = Object.fromEntries(formData.entries());
        
        // 🔥 MAP FRONTEND FIELDS TO BACKEND FIELDS
        const taskData = {
            title: rawData.title,
            description: rawData.description || null,
            leadId: rawData.lead_id ? parseInt(rawData.lead_id) : null,  // frontend: lead_id → backend: leadId
            dueDate: rawData.due_date || null,                          // frontend: due_date → backend: dueDate  
            dueTime: rawData.due_time || null,                          // frontend: due_time → backend: dueTime
            type: rawData.task_type || 'follow_up',                     // frontend: task_type → backend: type
            priority: rawData.priority || 'medium'
        };
        
        // Clean up null/empty values
        if (!taskData.leadId) taskData.leadId = null;
        if (!taskData.dueTime) taskData.dueTime = null;
        if (!taskData.description) taskData.description = null;
        
        console.log('🔥 MAPPED DATA FOR BACKEND:', taskData);
        
        // Create task
        const newTask = await API.createTask(taskData);
        
        // Add to local data
        this.tasks.unshift(newTask);
        
        // Close modal and refresh
this.hideAddTaskModal();
if (this.currentView === 'table') {
    this.render(); // 🔥 CHANGED: Full re-render instead of just updateTableContent()
} else {
    this.render();
}
        
        this.showNotification(`Task "${taskData.title}" created successfully!`, 'success');
        
    } catch (error) {
        console.error('Failed to create task:', error);
        this.showNotification(`${API.handleAPIError(error, 'CreateTask')}`, 'error');
    } finally {
        this.setLoadingState(false);
    }
},

async toggleTaskComplete(taskId, isCompleted) {
    // 🎨 UPDATE VISUALS FIRST (before spam check)
    const taskIndex = this.tasks.findIndex(t => t.id.toString() === taskId.toString());
    if (taskIndex !== -1) {
        this.tasks[taskIndex].status = isCompleted ? 'completed' : 'pending';
        if (isCompleted) {
            this.tasks[taskIndex].completed_at = new Date().toISOString();
        }
    }
    
    // 🔥 UPDATE CURRENT VIEW TASK (this was missing!)
    if (this.currentViewTask && this.currentViewTask.id.toString() === taskId.toString()) {
        this.currentViewTask.status = isCompleted ? 'completed' : 'pending';
        if (isCompleted) {
            this.currentViewTask.completed_at = new Date().toISOString();
        }
    }
    
    // Visual update (always happens)
    this.updateTaskVisually(taskId, isCompleted);
    
    // 🚫 SPAM CHECK (only blocks backend, not visuals)
    if (this.taskActionLoading) return;
    this.taskActionLoading = true;
    
    try {
        // Backend call (silent)
        if (isCompleted) {
            await API.completeTask(taskId, 'Completed from scheduling module');
        } else {
            await API.updateTask(taskId, { status: 'pending' });
        }
        
    } catch (error) {
        // Silent error handling - just revert visual state
        this.revertTaskVisually(taskId, !isCompleted);
        console.error('❌ Task toggle failed:', error);
    } finally {
        this.taskActionLoading = false;
    }
},

updateTaskButtonLoading(taskId, isLoading) {
    const buttons = document.querySelectorAll(`[onclick*="toggleTaskComplete('${taskId}'"]`);
    buttons.forEach(button => {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `
                <div class="btn-loading-spinner"></div>
                <span>Loading...</span>
            `;
        } else {
            button.disabled = false;
            // Will be updated when the view refreshes
        }
    });
},

    updateTaskVisually(taskId, isCompleted) {
    const checkboxes = document.querySelectorAll(`input[onchange*="toggleTaskComplete('${taskId}',"]`);
    const taskRows = document.querySelectorAll(`[onclick*="showTaskView('${taskId}')"], [onclick*="toggleTaskComplete('${taskId}',"]`);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = isCompleted;
    });
    
    taskRows.forEach(row => {
        if (isCompleted) {
            row.classList.add('completed');
            row.classList.remove('overdue'); // 🔥 INSTANT RED REMOVAL
            const titleElements = row.querySelectorAll('.task-title');
            titleElements.forEach(title => title.classList.add('completed-text'));
        } else {
            row.classList.remove('completed');
            // Check if task should be overdue when unchecked
            const task = this.tasks.find(t => t.id.toString() === taskId.toString());
            if (task && this.isTaskOverdue(task)) {
                row.classList.add('overdue'); // 🔥 RE-ADD IF STILL OVERDUE
            } else {
                row.classList.remove('overdue');
            }
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

    // 🎯 CLOSE TASK VIEW POPUP IF IT'S OPEN FOR THIS TASK
    if (this.showingTaskView && this.currentViewTask && 
        this.currentViewTask.id.toString() === taskId.toString()) {
        this.closeTaskView();
    }
},

    revertTaskVisually(taskId, isCompleted) {
        this.updateTaskVisually(taskId, isCompleted);
    },

    // 🎯 View Management (AddLeadModule Style)
    showDashboard() {
    this.isTransitioning = true;
    this.currentView = 'dashboard';
    this.hideAllModals();
    this.render();
    setTimeout(() => { this.isTransitioning = false; }, 600);
},

    showTableView() {
    this.isTransitioning = true;
    this.currentView = 'table';
    this.hideAllModals();
    this.render();
    setTimeout(() => { this.isTransitioning = false; }, 600);
},

    showAddTaskModal(preSelectedDate = null) {
        if (this.isTransitioning) return;
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
    this.cancelDelete();
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

editTask(taskId) {
    // Find the task
    const task = this.tasks.find(t => t.id.toString() === taskId.toString());
    if (!task) return;
    
    // Set current task for form handling
    this.currentEditTask = task;
    
    // Close any conflicting modals
    this.closeTaskView();
    this.closeDayPopup();
    
    // Get modal element
    const modal = document.getElementById('editTaskModal');
    if (!modal) return;
    
    // Rebuild entire modal with fresh content
    modal.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h2 class="modal-title">Edit Task</h2>
                <button class="modal-close" onclick="SchedulingModule.hideEditTaskModal()">×</button>
            </div>
            <div class="modal-body">
                ${this.renderEditTaskForm(task)}
            </div>
        </div>
    `;
    
    // Show modal
    modal.classList.add('show');
    
    // Setup form interactions
    requestAnimationFrame(() => {
        const editForm = document.getElementById('editTaskForm');
        if (editForm) {
            // Add form submission handler
            editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
            
            // Setup priority glow effect
            const priorityDropdown = editForm.querySelector('select[name="priority"]');
            if (priorityDropdown && priorityDropdown.value) {
                priorityDropdown.classList.remove('priority-low', 'priority-medium', 'priority-high', 'priority-urgent');
                priorityDropdown.classList.add(`priority-${priorityDropdown.value}`);
            }
            
            // Focus and select title input
            const titleInput = editForm.querySelector('input[name="title"]');
            if (titleInput) {
                titleInput.focus();
                titleInput.select();
            }
        }
    });
},

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
                    <input type="text"
                           name="title"
                           class="form-input"
                           value="${task.title}"
                           required
                           maxlength="25"
                           oninput="SchedulingModule.validateTitleInput(this)">
                    <div class="input-feedback" id="edit-title-feedback"></div>
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
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                        <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                    </select>
                </div>
                
                ${this.renderLeadSelector(task.lead_id, 'edit')}
                
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
                    <textarea name="description"
                              class="form-textarea"
                              rows="3"
                              maxlength="600"
                              oninput="SchedulingModule.validateNotesInput(this)">${task.description || ''}</textarea>
                    <div class="input-feedback" id="edit-notes-feedback"></div>
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
        const rawData = Object.fromEntries(formData.entries());
        
        // 🔥 MAP FRONTEND FIELDS TO BACKEND FIELDS (same as in handleSubmit)
        const taskData = {
            title: rawData.title,
            description: rawData.description || null,
            leadId: rawData.lead_id ? parseInt(rawData.lead_id) : null,  // frontend: lead_id → backend: leadId
            dueDate: rawData.due_date || null,                          // frontend: due_date → backend: dueDate  
            dueTime: rawData.due_time || null,                          // frontend: due_time → backend: dueTime
            type: rawData.task_type || 'follow_up',                     // frontend: task_type → backend: type
            priority: rawData.priority || 'medium'
        };
        
        // Clean up null/empty values
        if (!taskData.leadId) taskData.leadId = null;
        if (!taskData.dueTime) taskData.dueTime = null;
        if (!taskData.description) taskData.description = null;
        
        console.log('🔥 MAPPED EDIT DATA FOR BACKEND:', taskData);
        
        // Update task
        await API.updateTask(this.currentEditTask.id, taskData);
        
        // 🔥 UPDATE LOCAL DATA WITH MAPPED FIELDS
        const taskIndex = this.tasks.findIndex(t => t.id === this.currentEditTask.id);
        if (taskIndex !== -1) {
            // Keep original structure but update with new values
            this.tasks[taskIndex] = { 
                ...this.tasks[taskIndex], 
                title: taskData.title,
                description: taskData.description,
                lead_id: taskData.leadId,     // Map back to frontend field names for local state
                due_date: taskData.dueDate,
                due_time: taskData.dueTime,
                task_type: taskData.type,
                priority: taskData.priority
            };
        }
        
        // Close modal and refresh
        this.hideEditTaskModal();
        if (this.currentView === 'table') {
            this.updateTableContent();
        } else {
            this.render();
        }
        
        this.showNotification(`Task "${taskData.title}" updated successfully!`, 'success');
        
    } catch (error) {
        console.error('Failed to update task:', error);
        this.showNotification(`${API.handleAPIError(error, 'UpdateTask')}`, 'error');
    } finally {
        this.setEditLoadingState(false);
    }
},

renderLeadSelector(selectedLeadId = null, formType = 'add') {
    const selectedLead = selectedLeadId ? 
        this.leads.find(l => l.id == selectedLeadId) : null;
    
    const inputId = `selectedLeadId_${formType}`;
    const displayClass = `lead-selector-display-${formType}`;
    
    return `
        <div class="form-group">
            <label class="form-label">Related Lead</label>
            <div class="lead-selector">
                <input type="hidden" name="lead_id" value="${selectedLeadId || ''}" id="${inputId}">
                <div class="lead-selector-display ${displayClass}" onclick="SchedulingModule.openLeadPickerForForm('${formType}')">
                    ${selectedLead ? 
                        `<div class="selected-lead">
                            <span class="selected-lead-name">${selectedLead.name}</span>
                            ${selectedLead.company ? `<span class="selected-lead-company">(${selectedLead.company})</span>` : ''}
                        </div>` :
                        `<div class="no-lead-selected">
                            <span class="placeholder-text">Click to select a lead...</span>
                        </div>`
                    }
                    <span class="selector-arrow"></span>
                </div>
            </div>
        </div>
    `;
},

openLeadPickerForForm(formType = 'add') {
    this.showLeadPicker((selectedLead) => {
        const inputId = `selectedLeadId_${formType}`;
        const displayClass = `lead-selector-display-${formType}`;
        
        const hiddenInput = document.getElementById(inputId);
        const display = document.querySelector(`.${displayClass}`);
        
        if (!hiddenInput || !display) return;
        
        if (selectedLead) {
            hiddenInput.value = selectedLead.id;
            display.innerHTML = `
                <div class="selected-lead">
                    <span class="selected-lead-name">${selectedLead.name}</span>
                    ${selectedLead.company ? `<span class="selected-lead-company">(${selectedLead.company})</span>` : ''}
                </div>
                <span class="selector-arrow"></span>
            `;
        } else {
            hiddenInput.value = '';
            display.innerHTML = `
                <div class="no-lead-selected">
                    <span class="placeholder-text">Click to select a lead...</span>
                </div>
                <span class="selector-arrow"></span>
            `;
        }
    });
},

formatDateSmart(dateString, options = {}) {
    if (!dateString) return options.fallback || 'No date';
    
    const dateParts = dateString.split('T')[0].split('-');
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const taskYear = date.getFullYear();
    
    // Always show relative dates if within 1 day
    if (!options.noRelative) {
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
    }
    
    // Build format options
    const formatOptions = {
        month: options.monthFormat || 'short',
        day: 'numeric'
    };
    
    // Add year if different from current year or explicitly requested
    if (taskYear !== currentYear || options.alwaysShowYear) {
        formatOptions.year = 'numeric';
    }
    
    // Add weekday if requested
    if (options.showWeekday) {
        formatOptions.weekday = options.weekdayFormat || 'long';
    }
    
    return date.toLocaleDateString('en-US', formatOptions);
},

// 🔥 SIMPLIFIED validateTitleInput (remove class assignments):
validateTitleInput(input) {
    let feedback = document.getElementById('edit-title-feedback');
    if (!feedback) {
        feedback = document.getElementById('title-feedback');
    }
    
    if (!feedback) return;
    
    const length = input.value.length;
    const maxLength = 25;
    const isFocused = document.activeElement === input;
    
    // Only show feedback text when field is focused
    if (!isFocused) {
        feedback.textContent = '';
        feedback.style.display = 'none';
        return;
    }
    
    // Show feedback when focused (NO visual classes)
    if (length > maxLength - 5 && length < maxLength) {
        const remaining = maxLength - length;
        feedback.textContent = `${remaining} characters remaining`;
        feedback.style.color = '#f59e0b';
    } else if (length >= maxLength) {
        feedback.textContent = 'Title must be less than 25 characters';
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

// 🔥 SIMPLIFIED validateNotesInput (remove class assignments):
validateNotesInput(textarea) {
    let feedback = document.getElementById('edit-notes-feedback');
    if (!feedback) {
        feedback = document.getElementById('notes-feedback');
    }
    
    if (!feedback) return;
    
    const length = textarea.value.length;
    const maxLength = 600;
    const isFocused = document.activeElement === textarea;
    
    // Only show feedback text when field is focused
    if (!isFocused) {
        feedback.textContent = '';
        feedback.style.display = 'none';
        return;
    }
    
    // Show feedback when focused (NO visual classes)
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

    hideEditTaskModal() {
    const modal = document.getElementById('editTaskModal');
    if (modal) {
        modal.classList.remove('show');
        this.currentEditTask = null;
    }
},

    async deleteTask(taskId) {
    const task = this.tasks.find(t => t.id.toString() === taskId.toString());
    if (!task) return;
    
    // Show custom confirmation instead of browser confirm
    this.taskToDelete = task;
    this.showingDeleteConfirm = true;
    this.renderDeleteConfirmationOnly();
},

renderDeleteConfirmation() {
    if (!this.showingDeleteConfirm || !this.taskToDelete) {
        return '';
    }

    const task = this.taskToDelete;
    const typeIcon = this.getTaskTypeIcon(task.task_type);
    const leadName = task.lead_name || this.getLeadName(task.lead_id);

    return `
        <div class="delete-confirm-overlay" onclick="SchedulingModule.cancelDelete()">
            <div class="delete-confirm-popup" onclick="event.stopPropagation()">
                <div class="delete-header">
                    <div class="danger-icon-wrapper">
                        <span class="danger-icon">⚠️</span>
                        <span class="danger-pulse"></span>
                    </div>
                    <div class="delete-title-group">
                        <h3 class="delete-title">DELETE TASK</h3>
                        <span class="delete-subtitle">This action cannot be undone</span>
                    </div>
                </div>
                
                <div class="delete-body">
                    <div class="task-preview-card">
                        <div class="task-preview-header">
                            <span class="task-type-icon">${typeIcon}</span>
                            <span class="task-type-text">${this.formatTaskType(task.task_type)}</span>
                        </div>
                        <div class="task-preview-title">${task.title}</div>
                        ${leadName ? `<div class="task-preview-lead">Related to: ${leadName}</div>` : ''}
                        <div class="task-preview-date">Due: ${this.formatTaskDate(task.due_date)}</div>
                    </div>
                    
                    <div class="warning-message">
                        <div class="warning-icon">🗑️</div>
                        <div class="warning-text">
                            <strong>Are you absolutely sure?</strong><br>
                            This will permanently delete this task and all associated data.
                        </div>
                    </div>
                </div>
                
                <div class="delete-actions">
                    <button class="cancel-delete-btn" onclick="SchedulingModule.cancelDelete()">
                        <span class="btn-icon">✕</span>
                        <span class="btn-text">Cancel</span>
                    </button>
                    <button class="confirm-delete-btn" onclick="SchedulingModule.confirmDelete()">
                        <span class="btn-icon">🗑️</span>
                        <span class="btn-text">Delete Forever</span>
                        <span class="btn-danger-glow"></span>
                    </button>
                </div>
            </div>
        </div>
    `;
},

// 🔥 NEW HELPER METHODS
renderDeleteConfirmationOnly() {
    const existingPopup = document.querySelector('.delete-confirm-overlay');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    const popupHTML = this.renderDeleteConfirmation();
    if (popupHTML) {
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        
        const popup = document.querySelector('.delete-confirm-overlay');
        if (popup) {
            popup.style.opacity = '0';
            popup.style.display = 'flex';
            
            requestAnimationFrame(() => {
                popup.style.transition = 'opacity 0.3s ease';
                popup.style.opacity = '1';
            });
        }
    }
},

cancelDelete() {
    const popup = document.querySelector('.delete-confirm-overlay');
    if (popup) {
        popup.style.transition = 'opacity 0.3s ease';
        popup.style.opacity = '0';
        
        setTimeout(() => {
            popup.remove();
            this.showingDeleteConfirm = false;
            this.taskToDelete = null;
        }, 300);
    } else {
        this.showingDeleteConfirm = false;
        this.taskToDelete = null;
    }
},

async confirmDelete() {
    if (!this.taskToDelete) return;
    
    // Disable button immediately
    const deleteBtn = document.querySelector('.confirm-delete-btn');
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';
    }
    
    try {
        await API.deleteTask(this.taskToDelete.id);
        
        // Remove from local state
        this.tasks = this.tasks.filter(t => t.id.toString() !== this.taskToDelete.id.toString());
        
        // Close and refresh
        this.cancelDelete();
        this.hideAllModals();
        
        if (this.currentView === 'table') {
            this.updateTableContent();
        } else {
            this.render();
        }
        
        this.showNotification(`Task "${this.taskToDelete.title}" deleted forever`, 'success');
        
    } catch (error) {
        console.error('Failed to delete task:', error);
        this.showNotification(`${API.handleAPIError(error)}`, 'error');
        this.cancelDelete();
    }
},

    // ⚡ Quick Actions
    async quickCall(leadId) {
        const lead = this.leads.find(l => l.id.toString() === leadId.toString());
        if (!lead) return;

        if (lead.phone) {
            window.open(`tel:${lead.phone}`, '_self');
            this.showNotification(`Calling ${lead.name}...`, 'info');
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
            this.showNotification(`Email to ${lead.name} opened`, 'info');
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

    updateTableContent() {
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        const filteredTasks = this.getFilteredAndSortedTasks();
        tableContainer.innerHTML = filteredTasks.length > 0 ? 
            this.renderTasksTable(filteredTasks) : 
            this.renderEmptyState();
        
        // Update header count
        const tableTitle = document.querySelector('.table-title');
        if (tableTitle) {
            tableTitle.textContent = `All Tasks (${this.tasks.length})`;
        }
    }
    
    // 🔥 ENHANCED: Update active filters panel
    this.updateActiveFiltersPanel();
    
    // 🔥 ENHANCED: Update header indicators
    this.updateHeaderIndicators();
},

refreshTable() {
    this.updateTableContent();
    this.showNotification('Table refreshed!', 'success');
},

updateActiveFiltersPanel() {
    const existingPanel = document.querySelector('.active-filters-panel');
    const tableView = document.querySelector('.table-view');
    const hasFilters = this.hasActiveFilters();
    
    if (hasFilters && !existingPanel) {
        // Create new panel
        const panelHTML = this.renderActiveFiltersPanel();
        if (tableView) {
            const tableContainer = tableView.querySelector('.table-container');
            if (tableContainer) {
                tableContainer.insertAdjacentHTML('beforebegin', panelHTML);
            }
        }
    } else if (!hasFilters && existingPanel) {
        // Remove panel smoothly
        existingPanel.style.transition = 'opacity 0.2s ease';
        existingPanel.style.opacity = '0';
        setTimeout(() => existingPanel.remove(), 200);
    } else if (hasFilters && existingPanel) {
        // Update both the count AND the active filters text
        const countElement = existingPanel.querySelector('.filter-count');
        const filtersTextElement = existingPanel.querySelector('.active-filters-text');
        
        if (countElement) {
            const filtered = this.getFilteredAndSortedTasks();
            countElement.textContent = `Showing ${filtered.length} of ${this.tasks.length} tasks`;
        }
        
        if (filtersTextElement) {
            // Rebuild the active filters description
            const activeFilterTexts = [];
            
            if (this.currentFilters.type) {
                activeFilterTexts.push(`Type: ${this.formatTaskType(this.currentFilters.type)}`);
            }
            
            if (this.currentFilters.date) {
                const dateLabels = {
                    'completed_only': 'Completed Only',
                    'pending_only': 'Pending Only'
                };
                activeFilterTexts.push(`Status: ${dateLabels[this.currentFilters.date]}`);
            }
            
            if (this.currentFilters.priority) {
                activeFilterTexts.push(`Priority: ${this.formatPriority(this.currentFilters.priority)}`);
            }
            
            filtersTextElement.textContent = activeFilterTexts.join(', ');
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

   setLoadingState(isLoading) {
    const submitBtn = document.getElementById('taskSubmitBtn');  // Changed from 'submitBtn'
    
    if (submitBtn) {
        submitBtn.disabled = isLoading;
        
        if (isLoading) {
            submitBtn.style.background = '#9ca3af !important';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.opacity = '0.7';
            submitBtn.innerHTML = `
                <div class="btn-loading-spinner"></div>
                <span>Adding...</span>
            `;
        } else {
            submitBtn.style.background = '';
            submitBtn.style.cursor = '';
            submitBtn.style.opacity = '';
            submitBtn.innerHTML = `<span class="btn-text">Add Task</span>`;
        }
    } else {
        console.log('❌ taskSubmitBtn not found!');
    }
},

setEditLoadingState(isLoading) {
    const submitBtn = document.getElementById('editSubmitBtn');
    const tableBtn = document.getElementById('tableAddTaskBtn');
    
    if (submitBtn) {
        submitBtn.disabled = isLoading;
        submitBtn.innerHTML = isLoading ? 
            `<div class="btn-loading-spinner"></div><span>Updating...</span>` :
            `<span class="btn-text">Update Task</span>`;
    }
    
    if (tableBtn) {
        tableBtn.disabled = isLoading;
        tableBtn.style.opacity = isLoading ? '0.6' : '1';
        tableBtn.style.cursor = isLoading ? 'not-allowed' : 'pointer';
    }
},

    // 🛠️ Utility Methods
   getTasksForDate(date) {
    
    const filtered = this.tasks.filter(task => {
        if (!task.due_date) return false;
        
        // Handle both date-only and datetime formats
        const taskDate = task.due_date.includes('T') ? 
            task.due_date.split('T')[0] : 
            task.due_date;
            
        return taskDate === date;
    });
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
    return ''; // Remove all priority emojis
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
    
    const currentYear = today.getFullYear();
    const taskYear = date.getFullYear();
    
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Quick relative dates (always without year)
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    if (dateStr === yesterdayStr) return 'Yesterday';
    
    // For other dates, include year if different from current year
    if (taskYear !== currentYear) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'  // Include year
        });
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'   // No year for current year
        });
    }
},


    formatPopupDate(dateString) {
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
    
    // Quick relative dates (always without year)
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    if (dateStr === yesterdayStr) return 'Yesterday';
    
    // For popup, always show full context
    if (taskYear !== currentYear) {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'  // Include year for different years
        });
    } else {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric'   // No year for current year
        });
    }
},

handleHeaderFilter(column, value) {
    this.currentFilters[column] = value;
    this.updateTableContent();
},

showTypeFilter(event) {
    this.showFilterDropdown('type', event, [
        { value: '', label: '📋 All Types', action: 'clear' },
        { value: '', label: '──────────', divider: true },
        { value: 'call', label: '📞 Calls Only' },
        { value: 'email', label: '📧 Emails Only' },
        { value: 'meeting', label: '🤝 Meetings Only' },
        { value: 'follow_up', label: '📋 Follow-ups Only' },
        { value: 'demo', label: '🎥 Demos Only' },
        { value: 'research', label: '🔍 Research Only' },
        { value: 'proposal', label: '📊 Proposals Only' },
        { value: 'contract', label: '📄 Contracts Only' },
        { value: 'task', label: '📝 Tasks Only' }
    ]);
},

showDateFilter(event) {
    this.showFilterDropdown('date', event, [
        { value: '', label: '📅 All Tasks', action: 'clear' },
        { value: '', label: '──────────', divider: true },
        { value: 'completed_only', label: '✅ Completed Only' },
        { value: 'pending_only', label: '⏳ Pending Only' }
    ]);
},

showPriorityFilter(event) {
    this.showFilterDropdown('priority', event, [
        { value: '', label: '⚡ All Priorities', action: 'clear' },
        { value: '', label: '──────────', divider: true },
        { value: 'urgent', label: 'Urgent Only' },
        { value: 'high', label: 'High Only' },
        { value: 'medium', label: 'Medium Only' },
        { value: 'low', label: 'Low Only' }
    ]);
},

showFilterDropdown(column, event, options) {
    if (event) event.stopPropagation();
    
    // Remove any existing dropdown
    this.hideFilterDropdown();
    
    // Make arrow blue and point up
    event.target.closest('.simple-header-filter').classList.add('active');
    
    // Create dropdown HTML
    const dropdown = document.createElement('div');
    dropdown.className = 'unified-filter-dropdown active';
    dropdown.innerHTML = `
        <div class="filter-options">
            ${options.map(option => {
                if (option.divider) {
                    return `<div class="filter-divider"></div>`;
                }
                const isActive = this.currentFilters[column] === option.value && option.value !== '';
                return `
                    <div class="filter-option ${isActive ? 'active' : ''}" 
                         onclick="SchedulingModule.applyFilter('${column}', '${option.value}', event)"
                        <span class="option-text">${option.label}</span>
                        ${isActive ? '<span class="active-check">✓</span>' : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // Position dropdown
    const rect = event.target.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 5}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.zIndex = '10000';
    
    // Add to page with animation
    document.body.appendChild(dropdown);
    requestAnimationFrame(() => {
        dropdown.classList.add('show');
    });
    
    // Auto-close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', () => this.hideFilterDropdown(), { once: true });
    }, 100);
},

applyFilter(column, value, event) {
    // Prevent event bubbling
    if (event) event.stopPropagation();
    
    this.currentFilters[column] = value;
    this.hideFilterDropdown();
    this.updateTableContent();
    
    // Visual feedback
    this.updateHeaderIndicators();
    
    // Show notification
    if (value) {
        let filterLabel;
        if (column === 'type') {
            filterLabel = this.formatTaskType(value);
        } else if (column === 'priority') {
            filterLabel = this.formatPriority(value);
        } else if (column === 'date') {
            const dateLabels = {
                'completed_only': 'Completed Tasks',
                'pending_only': 'Pending Tasks'
            };
            filterLabel = dateLabels[value] || value;
        }
        this.showNotification(`Filtered by ${column}: ${filterLabel}`, 'info');
    } else {
        this.showNotification(`${column} filter cleared`, 'info');
    }
},

hideFilterDropdown() {
    const dropdown = document.querySelector('.unified-filter-dropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
        setTimeout(() => dropdown.remove(), 200);
    }
    
    // Remove active state from all headers
    document.querySelectorAll('.simple-header-filter').forEach(filter => {
        filter.classList.remove('active');
    });
},

updateHeaderIndicators() {
    // Update arrow states based on active filters
    ['type', 'date', 'priority'].forEach(column => {
        const arrow = document.querySelector(`[onclick*="show${column.charAt(0).toUpperCase() + column.slice(1)}Filter"] .simple-arrow`);
        if (arrow) {
            if (this.currentFilters[column]) {
                arrow.textContent = '▲';
                arrow.style.color = 'var(--primary)';
            } else {
                arrow.textContent = '▼';
                arrow.style.color = 'var(--text-secondary)';
            }
        }
    });
},

// 🔥 ADD MISSING getTaskDateCategory method (simplified)
getTaskDateCategory(dateString) {
    if (!dateString) return 'no_date';
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];
    
    if (dateString < today) return 'overdue';
    if (dateString === today) return 'today';
    if (dateString === tomorrowStr) return 'tomorrow';
    if (dateString <= weekStr) return 'this_week';
    return 'later';
},

hideAllFilters() {
    this.hideFilterDropdown();
},

getFilteredAndSortedTasks() {
    // 📋 Start with all tasks
    let filtered = [...this.tasks];

    // STEP 1: Apply search filter (searches title and lead name only)
if (this.searchTerm) {
    filtered = filtered.filter(task => {
        const searchText = `${task.title} ${this.getLeadName(task.lead_id) || ''}`.toLowerCase();
        return searchText.includes(this.searchTerm);
    });
}
    
    // 🏷️ STEP 2: Apply TYPE filter (call, email, meeting, etc.)
    if (this.currentFilters.type) {
        filtered = filtered.filter(task => task.task_type === this.currentFilters.type);
    }
    
    // ⚡ STEP 3: Apply PRIORITY filter (low, medium, high, urgent)
    if (this.currentFilters.priority) {
        filtered = filtered.filter(task => (task.priority || 'medium') === this.currentFilters.priority);
    }
    
    // 📅 STEP 4: Apply DATE STATUS filters (completed/pending only)
    if (this.currentFilters.date === 'completed_only') {
        filtered = filtered.filter(task => task.status === 'completed');
    } else if (this.currentFilters.date === 'pending_only') {
        filtered = filtered.filter(task => task.status !== 'completed');
    }
    
    // 🔄 STEP 5: SMART AUTO-SORTING
    return filtered.sort((a, b) => {
        const aCompleted = a.status === 'completed';
        const bCompleted = b.status === 'completed';
        
        // Step 1: Non-completed always come before completed
        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
        
        // Handle missing dates
        const aDate = a.due_date || '9999-12-31';
        const bDate = b.due_date || '9999-12-31';
        
        // Normalize dates (remove time if present)
        const aDateOnly = aDate.split('T')[0];
        const bDateOnly = bDate.split('T')[0];
        
        if (!aCompleted && !bCompleted) {
            // NON-COMPLETED TASKS: Overdue first (oldest), then upcoming (nearest first)
            const today = new Date().toISOString().split('T')[0];
            const aOverdue = aDateOnly < today;
            const bOverdue = bDateOnly < today;
            
            if (aOverdue && !bOverdue) return -1; // A is overdue, B isn't
            if (!aOverdue && bOverdue) return 1;  // B is overdue, A isn't
            
            if (aOverdue && bOverdue) {
                // Both overdue: oldest overdue first
                return aDateOnly.localeCompare(bDateOnly);
            } else {
                // Both upcoming: nearest due date first  
                return aDateOnly.localeCompare(bDateOnly);
            }
        } else {
    // COMPLETED TASKS: Most recent due date first, BUT no-date tasks go to bottom
    if (aDate === '9999-12-31' && bDate !== '9999-12-31') return 1;  // A has no date, goes down
    if (bDate === '9999-12-31' && aDate !== '9999-12-31') return -1; // B has no date, goes down
    if (aDate === '9999-12-31' && bDate === '9999-12-31') return 0;  // Both no date, equal
    
    // Both have dates: Most recent due date first (Aug 14 before Aug 17)
    return bDateOnly.localeCompare(aDateOnly); // Reversed for recent-first
}
    });
},

hasActiveFilters() {
    return Object.values(this.currentFilters).some(filter => filter !== '') || this.searchTerm !== '';
},

clearAllHeaderFilters() {
    this.currentFilters = {
        type: '',
        date: '',
        priority: ''
    };
    this.searchTerm = ''; // Also clear search
    this.updateTableContent();
},

renderActiveFiltersPanel() {
    if (!this.hasActiveFilters()) return '';
    
    const filtered = this.getFilteredAndSortedTasks();
    const activeFilterTexts = [];
    
    // Build active filter descriptions
    if (this.currentFilters.type) {
        if (this.currentFilters.type.startsWith('type_')) {
            activeFilterTexts.push(`Sorted by Type (${this.currentFilters.type === 'type_asc' ? 'A-Z' : 'Z-A'})`);
        } else {
            activeFilterTexts.push(`Type: ${this.formatTaskType(this.currentFilters.type)}`);
        }
    }
    
    if (this.currentFilters.date) {
    if (this.currentFilters.date.startsWith('date_')) {
        const sortLabels = {
            'date_oldest': 'Oldest First',
            'date_newest': 'Newest First'
        };
        activeFilterTexts.push(`Sorted by Date (${sortLabels[this.currentFilters.date]})`);
    } else {
        const dateLabels = {
            'this_week': 'This Week',
            'this_month': 'This Month',
            'completed_only': 'Completed Only',
            'pending_only': 'Pending Only'
        };
        activeFilterTexts.push(`Status: ${dateLabels[this.currentFilters.date]}`);
    }
}
    
    if (this.currentFilters.priority) {
        if (this.currentFilters.priority.startsWith('priority_')) {
            activeFilterTexts.push(`Sorted by Priority (${this.currentFilters.priority === 'priority_high_to_low' ? 'High to Low' : 'Low to High'})`);
        } else {
            activeFilterTexts.push(`Priority: ${this.formatPriority(this.currentFilters.priority)}`);
        }
    }
    
    return `
        <div class="active-filters-panel">
            <div class="filters-info">
                <span class="filter-count">Showing ${filtered.length} of ${this.tasks.length} tasks</span>
                <span class="active-filters-text">${activeFilterTexts.join(', ')}</span>
            </div>
            <button class="clear-filters-btn" onclick="SchedulingModule.clearAllHeaderFilters()">
                Clear All
            </button>
        </div>
    `;
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

    showFullNotes(taskId) {
    const notesContainer = document.getElementById(`notes-${taskId}`);
    if (notesContainer) {
        const preview = notesContainer.querySelector('.notes-preview');
        const moreLink = notesContainer.querySelector('.notes-more');
        const fullText = notesContainer.querySelector('.notes-full');
        
        if (preview) preview.style.display = 'none';
        if (moreLink) moreLink.style.display = 'none';
        if (fullText) fullText.style.display = 'inline';
    }
},

    renderEmptyState() {
    return `
        <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No tasks found</div>
            <div class="empty-subtitle">
                Start organizing your schedule by adding your first task.
            </div>
            <button class="empty-action-btn" onclick="SchedulingModule.showAddTaskModal()">
                ➕ Add Your First Task
            </button>
        </div>
    `;
},

    showNotification(message, type = 'info') {
    const now = Date.now();
    
    // 🔥 PREVENT DUPLICATE NOTIFICATIONS
    if (this.lastNotificationMessage === message && 
        (now - this.lastNotificationTime) < 2000) {
        console.log('🚫 Duplicate notification blocked:', message);
        return;
    }
    
    // Update tracking
    this.lastNotificationMessage = message;
    this.lastNotificationTime = now;
    
    // Show the notification
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
    const container = document.getElementById(this.targetContainer);
    if (container) {
        container.innerHTML = `
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
                </div>
            `;
        }
    },

    renderError(message) {
    const container = document.getElementById(this.targetContainer);
    if (container) {
        container.innerHTML = `
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
            /* 🚫 DISABLE TEXT SELECTION */
.scheduling-container {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

/* ✅ ALLOW SELECTION IN INPUT FIELDS */
.form-input,
.form-textarea,
.search-input {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
}

/* 🔢 SIMPLE FILTER COUNTER */
.simple-filter-counter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 1px solid rgba(102, 126, 234, 0.3);
    border-radius: var(--radius);
    margin-left: auto;
    animation: fadeIn 0.3s ease;
}

.counter-icon {
    font-size: 0.9rem;
}

.counter-text {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--primary);
}

@media (max-width: 768px) {
    .simple-filter-counter {
        margin-left: 0;
        margin-top: 0.5rem;
    }
}

/* 🌟 SICK PRIORITY DROPDOWN GLOW EFFECTS */
.form-select[name="priority"] {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Low Priority - Green Glow */
.form-select[name="priority"].priority-low {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2), 0 0 15px rgba(16, 185, 129, 0.3);
}

/* Medium Priority - Yellow/Orange Glow */
.form-select[name="priority"].priority-medium {
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2), 0 0 15px rgba(245, 158, 11, 0.3);
}

/* High Priority - Orange Glow */
.form-select[name="priority"].priority-high {
    border-color: #f97316;
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2), 0 0 15px rgba(249, 115, 22, 0.4);
}

/* Urgent Priority - RED GLOW (SICK!) */
.form-select[name="priority"].priority-urgent {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.5);
    animation: urgentGlow 2s infinite;
}

@keyframes urgentGlow {
    0%, 100% { 
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.5);
    }
    50% { 
        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4), 0 0 25px rgba(239, 68, 68, 0.7);
    }
}

.table-header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.search-box {
    position: relative;
    display: flex;
    align-items: center;
}

.search-input {
    width: 280px;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
    color: var(--text-primary);
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-input::placeholder {
    color: #9ca3af;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    color: #9ca3af;
    font-size: 0.9rem;
    pointer-events: none;
    z-index: 1;
}

.add-task-btn {
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

.add-task-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
    
.notes-text {
    color: var(--text-primary);
    line-height: 1.6;
    white-space: normal;
}

.notes-more:hover {
    text-decoration: underline;
}

/* Lead Selector in Form */
.lead-selector {
    position: relative;
}

.lead-selector-display {
    padding: 0.875rem 1rem;
    border: 2px solid var(--border);
    border-radius: var(--radius);
    background: var(--background);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.lead-selector-display:hover {
    border-color: var(--primary);
    background: var(--surface-hover);
    transform: translateY(-1px);
}

.selected-lead {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0; /* Allow flex child to shrink */
}

.selected-lead-name {
    font-weight: 600;
    color: var(--text-primary);
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.selected-lead-company {
    color: var(--text-secondary);
    font-size: 0.9rem;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.no-lead-selected .placeholder-text {
    color: var(--text-tertiary);
    font-style: italic;
}

.selector-arrow {
    color: var(--text-secondary);
    font-size: 1.2rem;
    flex-shrink: 0;
}

/* Lead Picker Popup */
.lead-picker-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.30);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
    padding: 2rem;
    animation: fadeIn 0.3s ease;
}

.lead-picker-popup {
    background: var(--surface);
    border-radius: 20px;
    width: 100%;
    max-width: 600px;
    max-height: 80vh;
    overflow: hidden;
    border: 1px solid var(--border);
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.lead-picker-header {
    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
    color: white;
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.lead-picker-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
}

.lead-picker-close {
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

.lead-picker-close:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

.lead-picker-search {
    padding: 1.5rem 2rem 1rem;
    position: relative;
}

.lead-search-input {
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

.lead-search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.lead-picker-search .search-icon {
    position: absolute;
    left: 3rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    pointer-events: none;
}

.lead-picker-results {
    max-height: 400px;
    overflow-y: auto;
    padding: 0 1rem;
}

.lead-picker-item {
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

.lead-picker-item:hover {
    background: var(--border);
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.lead-item-main {
    flex: 1;
    min-width: 0; /* Allow flex child to shrink */
}

.lead-item-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.25rem;
}

.lead-name {
    font-weight: 700;
    color: var(--text-primary);
    font-size: 1.1rem;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
}

.lead-type {
    font-size: 1.2rem;
    flex-shrink: 0;
}

.lead-company {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
    font-weight: 500;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.lead-email {
    color: var(--text-tertiary);
    font-size: 0.85rem;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.lead-item-status {
    flex-shrink: 0;
}

.status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: capitalize;
}

.lead-picker-empty {
    text-align: center;
    padding: 3rem 2rem;
    color: var(--text-secondary);
}

.lead-picker-empty .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
}

.lead-picker-empty .empty-message {
    font-size: 1.1rem;
    color: var(--text-primary);
}

.lead-picker-actions {
    padding: 1rem 2rem 1.5rem;
    background: var(--surface-hover);
    border-top: 1px solid var(--border);
    text-align: center;
}

.lead-picker-btn {
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

.lead-picker-btn.secondary {
    background: var(--surface-hover);
    color: var(--text-primary);
    border: 1px solid var(--border);
}

.lead-picker-btn.secondary:hover {
    background: var(--border);
    color: var(--text-primary);
    transform: translateY(-1px);
}

/* Custom scrollbar for lead picker */
.lead-picker-results::-webkit-scrollbar {
    width: 8px;
}

.lead-picker-results::-webkit-scrollbar-track {
    background: var(--surface-hover);
    border-radius: 4px;
}

.lead-picker-results::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
    transition: background 0.3s ease;
}

.lead-picker-results::-webkit-scrollbar-thumb:hover {
    background: var(--primary);
}

.refresh-table-btn {
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

.refresh-table-btn:hover {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.refresh-table-btn:active {
    transform: translateY(0);
    transition: transform 0.1s ease;
}

/* 🔥 CLEAN HEADER DROPDOWN SYSTEM */

/* Header filter buttons */
.simple-header-filter {
    cursor: pointer;
    border-radius: 6px;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: background 0.3s ease, transform 0.3s ease;
}

.simple-header-filter:hover {
    background: var(--surface-hover);
    transform: translateY(-1px);
}

.simple-header-filter.active {
    color: var(--primary);
}

/* Arrow styling */
.simple-arrow {
    font-size: 0.8rem;
    color: var(--text-secondary);
    transition: color 0.3s ease, transform 0.3s ease, text-shadow 0.3s ease;
}

.simple-header-filter:hover .simple-arrow {
    color: var(--primary);
    text-shadow: 0 0 8px rgba(102, 126, 234, 0.6);
}

.simple-header-filter.active .simple-arrow {
    color: var(--primary);
    text-shadow: 0 0 8px rgba(102, 126, 234, 0.6);
    transform: rotate(180deg);
}

/* Dropdown container */
.unified-filter-dropdown {
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

.unified-filter-dropdown.show {
    opacity: 1;
    transform: translateY(0) scale(1);
}

/* Scrollbar styling */
.unified-filter-dropdown::-webkit-scrollbar {
    width: 8px;
}

.unified-filter-dropdown::-webkit-scrollbar-track {
    background: transparent;
}

.unified-filter-dropdown::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
}

.unified-filter-dropdown::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}

/* Dropdown options */
.filter-options {
    padding: 0.5rem 0;
}

.filter-option {
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    color: var(--text-secondary);
    transition: background 0.2s ease;
}

.filter-option:hover {
    background: var(--surface-hover);
    color: var(--primary);
}

.filter-option.active {
    background: rgba(102, 126, 234, 0.1);
    color: var(--primary);
    font-weight: 600;
}

.filter-divider {
    height: 1px;
    background: var(--border);
    margin: 0.5rem 1rem;
}

.active-check {
    color: var(--primary);
    font-weight: bold;
}

.option-text {
    flex: 1;
}

/* Active filters panel */
.active-filters-panel {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
    border: 1px solid rgba(102, 126, 234, 0.2);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    animation: slideInDown 0.3s ease;
}

.filters-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.filter-count {
    font-weight: 700;
    color: var(--primary);
    font-size: 0.95rem;
}

.active-filters-text {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.clear-filters-btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

.clear-filters-btn:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

@keyframes slideInDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
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
    
    /* 🔥 ENSURE CONTAINER DOESN'T CLIP */
    overflow: visible;
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

            .nav-btn:hover, .today-btn {
    background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
    color: white;
    border-color: var(--primary);
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    cursor: pointer;
    font-weight: 500;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
}

.today-btn:hover {
    /* 🎨 SUPER SUBTLE - JUST A TINY LIFT */
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(102, 126, 234, 0.25);
    /* 🚫 NO background or color changes */
}

            .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--border);
    border-radius: var(--radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    
    /* 🔥 ADD THESE TO PREVENT CLIPPING */
    padding: 6px;  /* Space for the glow to breathe */
    overflow: visible;  /* Don't clip the glow effects */
    margin: 6px;   /* Push the whole grid in slightly */
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
    box-shadow: var(--shadow-lg);
    
    /* 🎨 ADD THESE TWO LINES FOR THE SICK OUTLINE */
    border: 2px solid transparent;
    box-shadow: 
        0 0 0 2px rgba(102, 126, 234, 0.4),
        0 0 0 4px rgba(139, 92, 246, 0.2),
        var(--shadow-lg);
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

            /* 🔥 SLEEK FILTER DROPDOWN STYLING */
.filter-select {
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 2px solid var(--border);
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    background: var(--background);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.75rem center;
    background-repeat: no-repeat;
    background-size: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-select:hover {
    border-color: var(--primary);
    background-color: var(--surface-hover);
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(102, 126, 234, 0.15);
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23667eea' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
}

.filter-select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1), 0 3px 8px rgba(102, 126, 234, 0.15);
    transform: translateY(-1px);
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23667eea' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
}

            .filter-reset-btn {
    background: var(--background);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
                color: var(--text-primary);
                cursor: pointer;
                transition: all 0.3s ease;
}

.filter-reset-btn:hover {
    outline: none;
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

            .table-container {
                border-radius: var(--radius);
                overflow: hidden;
                border: 1px solid var(--border);
            }

            /* 🔥 CLEAN TABLE - NO BORDER CONFLICTS */
.tasks-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
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

            /* 🔥 DELETE CONFIRMATION POPUP - NORMAL STYLE */
.delete-confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.30);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
    padding: 2rem;
    animation: fadeIn 0.3s ease;
}

.delete-confirm-popup {
    background: var(--surface);
    border-radius: 20px;
    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
    width: 100%;
    max-width: 500px;
    overflow: hidden;
    border: 1px solid var(--border);
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.delete-header {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.danger-icon-wrapper {
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    flex-shrink: 0;
}

.danger-icon {
    font-size: 1.5rem;
}

.danger-pulse {
    display: none; /* Keep it simple */
}

.delete-title-group {
    flex: 1;
}

.delete-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: white;
}

.delete-subtitle {
    font-size: 0.9rem;
    opacity: 0.9;
    color: white;
}

.delete-body {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.task-preview-card {
    background: var(--surface-hover);
    padding: 1.5rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
}

.task-preview-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
}

.task-type-icon {
    font-size: 1.2rem;
}

.task-preview-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.75rem;
    line-height: 1.3;
}

.task-preview-lead {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
}

.task-preview-date {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 500;
}

.warning-message {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.5rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius);
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.warning-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
    margin-top: 0.25rem;
}

.warning-text {
    color: var(--text-primary);
    line-height: 1.5;
}

.warning-text strong {
    color: #dc2626;
    font-weight: 700;
}

.delete-actions {
    padding: 1.5rem 2rem 2rem;
    background: var(--surface-hover);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.cancel-delete-btn {
    padding: 0.875rem 2rem;
    background: var(--surface-hover);
    color: var(--text-primary);
    border: 2px solid var(--border); /* 🔥 CHANGED: 1px → 2px */
    border-radius: var(--radius);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.cancel-delete-btn:hover {
    background: var(--border);
    border-color: var(--primary);
    border-width: 2px; /* 🔥 ADD: Maintain thick border on hover */
    color: var(--primary);
}

.confirm-delete-btn {
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
    position: relative;
    overflow: hidden;
}

.confirm-delete-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
}

.btn-danger-glow {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
}

.confirm-delete-btn:hover .btn-danger-glow {
    left: 100%;
}

.confirm-delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #666 !important;
}

/* 🚫 NUCLEAR HOVER RESET - Put this FIRST */
.task-row:hover {
    background: unset !important;
    box-shadow: unset !important;
    transform: unset !important;
    transition: unset !important;
}
    
            /* 🔥 CUSTOM CHECKBOX STYLING - CONSISTENT ACROSS TAB STATES */
.task-checkbox {
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

.task-checkbox:checked {
    background: var(--primary);
    border-color: var(--primary);
}

.task-checkbox:checked::before {
    content: '✓';
    position: absolute;
    top: -1px;
    left: 1px;
    color: white;
    font-size: 12px;
    font-weight: bold;
}

.task-checkbox:hover {
    border-color: var(--primary);
    transform: scale(1.05);
}

/* 🔄 CLEAN TASK ROW SYSTEM */
.task-row {
    transition: all 0.3s ease;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
}

/* === PRIORITY COLORS (Base State) === */
.task-row[data-priority="low"]:not(.completed):not(.overdue) {
    background: linear-gradient(to right, var(--surface), var(--surface) 90%, rgba(16, 185, 129, 0.4));
    box-shadow: inset -3px 0 0 rgba(16, 185, 129, 0.4);
    transition: background 0.2s ease !important, box-shadow 0.2s ease !important;
}

.task-row[data-priority="medium"]:not(.completed):not(.overdue) {
    background: linear-gradient(to right, var(--surface), var(--surface) 90%, rgba(245, 158, 11, 0.4));
    box-shadow: inset -3px 0 0 rgba(245, 158, 11, 0.4);
    transition: background 0.2s ease !important, box-shadow 0.2s ease !important;
}

.task-row[data-priority="high"]:not(.completed):not(.overdue) {
    background: linear-gradient(to right, var(--surface), var(--surface) 90%, rgba(249, 115, 22, 0.4));
    box-shadow: inset -3px 0 0 rgba(249, 115, 22, 0.4);
    transition: background 0.2s ease !important, box-shadow 0.2s ease !important;
}

.task-row[data-priority="urgent"]:not(.completed):not(.overdue) {
    background: linear-gradient(to right, var(--surface), var(--surface) 90%, rgba(239, 68, 68, 0.4));
    box-shadow: inset -3px 0 0 rgba(239, 68, 68, 0.4);
    transition: background 0.2s ease !important, box-shadow 0.2s ease !important;
}

/* === PRIORITY COLOR EXPANSION ON HOVER (Grows 20% from right) === */
.task-row[data-priority="low"]:not(.completed):not(.overdue):hover {
    background: linear-gradient(to right, var(--surface-hover) 70%, rgba(16, 185, 129, 0.5)) !important;
    box-shadow: inset -3px 0 0 rgba(16, 185, 129, 0.6) !important;
    transition: background 0.2s ease !important, box-shadow 0.2s ease !important;
}

.task-row[data-priority="medium"]:not(.completed):not(.overdue):hover {
    background: linear-gradient(to right, var(--surface-hover) 70%, rgba(245, 158, 11, 0.5)) !important;
    box-shadow: inset -3px 0 0 rgba(245, 158, 11, 0.6) !important;
    transition: background 0.2s ease !important, box-shadow 0.2s ease !important;
}

.task-row[data-priority="high"]:not(.completed):not(.overdue):hover {
    background: linear-gradient(to right, var(--surface-hover) 70%, rgba(249, 115, 22, 0.5)) !important;
    box-shadow: inset -3px 0 0 rgba(249, 115, 22, 0.6) !important;
    transition: background 0.2s ease !important, box-shadow 0.2s ease !important;
}

.task-row[data-priority="urgent"]:not(.completed):not(.overdue):hover {
    background: linear-gradient(to right, var(--surface-hover) 70%, rgba(239, 68, 68, 0.5)) !important;
    box-shadow: inset -3px 0 0 rgba(239, 68, 68, 0.6) !important;
    transition: background 0.2s ease !important, box-shadow 0.2s ease !important;
}

/* === COMPLETED TASKS (Override Priority Colors) === */
.task-row.completed {
    opacity: 0.35;
    background: rgba(128, 128, 128, 0.15) !important;
    color: #777;
    box-shadow: none !important;
}

.task-row.completed:hover {
    opacity: 0.5;
    background: rgba(128, 128, 128, 0.25) !important;
    box-shadow: none !important;
}

.task-row.completed .task-title {
    color: #777;
    text-decoration: line-through;
}

/* === OVERDUE TASKS (Override Everything) === */
.task-row.overdue:not(.completed) {
    background: rgba(239, 68, 68, 0.15) !important;
    box-shadow: none !important;
}

.task-row.overdue:not(.completed):hover {
    background: rgba(239, 68, 68, 0.25) !important;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2) !important;
}

/* Ensure overdue date text stays red */
.task-row.overdue .overdue-date {
    color: var(--danger) !important;
    font-weight: 600 !important;
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
    font-size: 0.9rem;
}

.task-title.completed-text {
    text-decoration: line-through;
    opacity: 0.7;
}

.task-time {
    color: var(--text-secondary);
    font-size: 0.8rem;
}

.lead-cell {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.lead-name {
    font-weight: 500;
    font-size: 0.9rem;
}

.no-lead {
    color: var(--text-tertiary);
    font-style: italic;
    font-size: 0.85rem;
}

.type-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
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
    font-size: 0.8rem;
    font-weight: 600;
    transition: none !important;
}

.priority-cell {
    color: var(--text-secondary);
    transition: none !important;
}

            /* 🎪 MODALS & POPUPS */
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

.modal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.30);
    backdrop-filter: blur(4px);
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

.input-feedback {
    font-size: 0.85rem;
    margin-top: 0.5rem;
    color: var(--text-secondary);
    transition: color 0.3s ease;
}


            /* Keep inputs and textareas as they are */
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
    white-space: normal;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
}

/* 🔥 SLEEK DROPDOWN STYLING ONLY */
.form-select {
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

.form-select:hover {
    border-color: var(--primary);
    background-color: var(--background);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23667eea' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
}

.form-select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(102, 126, 234, 0.15);
    transform: translateY(-1px);
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23667eea' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
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
    background: rgba(0, 0, 0, 0.30);
    backdrop-filter: blur(4px);
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
    padding: 1rem 1.5rem; /* Reduced from 1.5rem */
    display: flex;
    justify-content: space-between;
    align-items: center; /* Changed from flex-start to center */
    position: relative;
    min-height: 60px; /* Set a smaller fixed height */
}

            .popup-title {
    font-size: 1.1rem; /* Reduced from 1.25rem */
    font-weight: 700;
    margin: 0; /* Remove all margins */
    line-height: 1.2; /* Tighter line height */
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
    
    /* 🔥 ADD truncation: */
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}


            .task-priority {
                flex-shrink: 0;
            }

            .popup-actions {
    padding: 1.5rem 1.5rem;
    background: var(--surface-hover);
    border-top: 1px solid var(--border);
    min-height: 60px;
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
                background: rgba(0, 0, 0, 0.30);
                backdrop-filter: blur(4px);
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
    position: relative;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 100%;
    max-width: 700px;
    max-height: 90vh;
    overflow: hidden;
    border: 1px solid var(--border);
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

            .task-view-header {
    background: var(--surface);
    color: var(--text-primary);
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
}

.task-view-title-left {
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0;
    color: var(--text-secondary);
    letter-spacing: 0;
    flex: 1;
    text-align: left;
    text-transform: uppercase;
}

.close-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 400;
    transition: all 0.2s ease;
}

.close-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
    border-color: var(--text-secondary);
    transform: none;
}

.task-view-body {
    padding: 1.5rem;
    overflow-y: auto;
    max-height: 65vh;
}

.task-title-section {
    margin-bottom: 1.5rem;
    text-align: left;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
}

.main-task-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.75rem 0;
    line-height: 1.3;
}

.task-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-weight: 500;
    font-size: 0.8rem;
    border: 1px solid transparent;
}

.task-status-badge.completed {
    background: var(--surface-hover);
    color: var(--success);
    border-color: rgba(16, 185, 129, 0.2);
}

.task-status-badge.pending {
    background: var(--surface-hover);
    color: var(--warning);
    border-color: rgba(245, 158, 11, 0.2);
}

.task-details-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.detail-label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.detail-value {
    font-weight: 400;
    color: var(--text-primary);
    font-size: 0.9rem;
    line-height: 1.4;
}
      .quick-actions-section {
    margin-top: 2rem;
    margin-bottom: 2rem;
}
.quick-actions-label {
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
}

.quick-actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75rem;
}

.quick-actions-grid.single-action {
    grid-template-columns: 1fr;
}

.quick-action-btn {
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

.quick-action-btn.call {
    border-color: rgba(34, 197, 94, 0.2);
    color: var(--success);
}

.quick-action-btn.call:hover {
    background: var(--success);
    color: white;
    transform: none;
    border-color: var(--success);
}

.quick-action-btn.email {
    border-color: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
}

.quick-action-btn.email:hover {
    background: #3b82f6;
    color: white;
    transform: none;
    border-color: #3b82f6;
}

.quick-action-btn.complete {
    border-color: rgba(102, 126, 234, 0.2);
    color: var(--primary);
}

.quick-action-btn.complete:hover {
    background: var(--primary);
    color: white;
    transform: none;
    border-color: var(--primary);
}

.quick-action-btn.undo {
    border-color: rgba(245, 158, 11, 0.2);
    color: var(--warning);
}

.quick-action-btn.undo:hover {
    background: var(--warning);
    color: white;
    transform: none;
    border-color: var(--warning);
}

.task-view-actions {
    padding: 1rem;
    background: var(--surface-hover);
    border-top: 1px solid var(--border);
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
}

.edit-task-btn {
    padding: 0.6rem 1.25rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.edit-task-btn:hover {
    background: var(--primary-dark);
    transform: none;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.delete-task-btn {
    padding: 0.6rem 1.25rem;
    background: var(--danger);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.delete-task-btn:hover {
    background: #dc2626;
    transform: none;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
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

/* 📱 MOBILE RESPONSIVE - CONSOLIDATED SECTION */
@media (max-width: 768px) {
/* Action Bubbles */
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

    /* Calendar */
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

    /* 🔥 TABLE SCROLLING - ADD THIS HERE */
    .table-view {
        padding: 1rem;
    }
    
    .table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .tasks-table {
        min-width: 700px;
        font-size: 0.85rem;
    }
    
    .tasks-table th,
    .tasks-table td {
        padding: 0.75rem 0.5rem;
        white-space: nowrap;
    }

    /* Table Headers */
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

    /* Modals */
    .modal {
        margin: 1rem;
        max-width: none;
    }

    .modal-body {
        padding: 1rem;
    }

    /* Forms */
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

    /* Popups */
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

    /* Lead Picker Mobile */
    .lead-picker-overlay {
        padding: 1rem;
    }
    
    .lead-picker-popup {
        max-width: 95vw;
        max-height: 85vh;
    }
    
    .lead-picker-header {
        padding: 1.25rem 1.5rem;
    }
    
    .lead-picker-search {
        padding: 1rem 1.5rem 0.75rem;
    }
    
    .lead-picker-item {
        padding: 1rem;
        margin: 0.25rem 0;
    }
    
    .lead-name {
        font-size: 1rem;
        max-width: 120px;
    }
    
    .lead-company {
        max-width: 140px;
    }
    
    .lead-email {
        max-width: 120px;
    }
    
    .selected-lead-name {
        max-width: 80px;
    }
    
    .selected-lead-company {
        max-width: 90px;
    }

    /* Delete Confirmation Mobile */
    .delete-confirm-overlay {
        padding: 1rem;
    }
    
    .delete-header {
        padding: 1.5rem;
    }
    
    .delete-body {
        padding: 1.5rem;
    }
    
    .delete-actions {
        flex-direction: column;
        padding: 1rem 1.5rem 1.5rem;
    }
    
    .cancel-delete-btn,
    .confirm-delete-btn {
        width: 100%;
        justify-content: center;
    }

    /* Filter Header Styling */
.filter-header {
    position: relative;
    cursor: pointer;
    padding: 1rem !important;
    user-select: none;
}

.filter-arrow {
    margin-left: 0.5rem;
    transition: transform 0.2s ease;
}

.filter-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-5px);
    transition: all 0.2s ease;
    max-height: 300px;
    overflow-y: auto;
}

.filter-dropdown.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.filter-item {
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    transition: background 0.2s ease;
}

.filter-item:hover {
    background: var(--surface-hover);
}

.filter-divider {
    height: 1px;
    background: var(--border);
    margin: 0.25rem 0;
}

.lead-col {
    min-width: 120px;
}
}
        </style>
    `;
},

// 🔄 Refresh method for external calls
async refresh() {
    await this.refreshData();
},

// Add this method to your SchedulingModule
hideAllDropdowns() {
    // Close filter dropdowns
    document.querySelectorAll('.unified-filter-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show', 'active');
        dropdown.style.display = 'none';
    });
    
    // Remove active states from filter headers
    document.querySelectorAll('.simple-header-filter').forEach(filter => {
        filter.classList.remove('active');
    });
    
    // Close any modal overlays
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('show');
    });
    
    // Close day popup if open
    if (this.showingDayPopup) {
        this.closeDayPopup();
    }
    
    // Close task view if open
    if (this.showingTaskView) {
        this.closeTaskView();
    }
},

// 🧹 Cleanup
destroy() {
    if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
    }
    
    // Remove all document event listeners
    this.removeDocumentListeners();
    
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