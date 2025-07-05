/**
 * 🗓️ NUCLEAR SCHEDULING MODULE
 * Full calendar with drag & drop, color coding, and sick animations
 * Integrates with AddLead follow-ups and pipeline activities
 * Organized exactly like AddLeadModule
 */

window.SchedulingModule = {
    // 🎯 STATE MANAGEMENT
    events: [],
    currentView: 'month', // month, week, day
    selectedDate: new Date(),
    draggedEvent: null,
    isVisible: false,
    
    // ⚙️ CONFIGURATION
    availabilityHours: { start: 9, end: 17 }, // 9 AM to 5 PM
    eventTypes: {
        follow_up: { color: '#667eea', icon: '📞', label: 'Follow-up' },
        demo: { color: '#10b981', icon: '🎯', label: 'Demo' },
        call: { color: '#f59e0b', icon: '☎️', label: 'Call' },
        meeting: { color: '#8b5cf6', icon: '🤝', label: 'Meeting' },
        block: { color: '#6b7280', icon: '⏰', label: 'Time Block' }
    },

    async init() {
    console.log('🗓️ Initializing Nuclear SchedulingModule...');
    
    try {
        // 🎯 USE THE SHELL'S MAIN CONTENT CONTAINER
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            console.error('❌ Main content container not found');
            return;
        }
        
        // Show loading state first
        this.renderLoadingState();
        
        await this.loadEvents();
        this.render();
        this.attachEventListeners();
        this.startReminderService();
        
        console.log('✅ SchedulingModule ready!');
    } catch (error) {
        console.error('❌ Failed to initialize SchedulingModule:', error);
        this.renderError(error);
    }
},

    render() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('❌ Main content container not found');
        return;
    }

    mainContent.innerHTML = `
        <div class="nuclear-scheduling-container fade-in">
            ${this.renderHeader()}
            ${this.renderMainContent()}
            ${this.renderEventModal()}
        </div>
        ${this.renderStyles()}
    `;
},

    // 🎨 RENDERING METHODS (like AddLead structure)
    renderHeader() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const currentMonth = monthNames[this.selectedDate.getMonth()];
        const currentYear = this.selectedDate.getFullYear();

        return `
            <div class="scheduling-header">
                <div class="header-bubble">
                    <div class="header-content">
                        <div class="header-left">
                            <h1 class="scheduling-title">
                                <span class="title-icon">🗓️</span>
                                Schedule
                            </h1>
                            <div class="date-navigation">
                                <button class="nav-btn" onclick="SchedulingModule.navigateMonth(-1)">
                                    <span>←</span>
                                </button>
                                <div class="current-date">
                                    <span class="month">${currentMonth}</span>
                                    <span class="year">${currentYear}</span>
                                </div>
                                <button class="nav-btn" onclick="SchedulingModule.navigateMonth(1)">
                                    <span>→</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="header-actions">
                            <div class="view-switcher">
                                <button class="view-btn ${this.currentView === 'month' ? 'active' : ''}" 
                                        onclick="SchedulingModule.switchView('month')">Month</button>
                                <button class="view-btn ${this.currentView === 'week' ? 'active' : ''}" 
                                        onclick="SchedulingModule.switchView('week')">Week</button>
                                <button class="view-btn ${this.currentView === 'day' ? 'active' : ''}" 
                                        onclick="SchedulingModule.switchView('day')">Day</button>
                            </div>
                            <button class="add-event-btn" onclick="SchedulingModule.showAddEventModal()">
                                <span class="btn-icon">+</span>
                                <span>Add Event</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderMainContent() {
        return `
            <div class="scheduling-main">
                <div class="calendar-bubble">
                    ${this.renderCalendar()}
                </div>
            </div>
        `;
    },

    renderCalendar() {
        switch (this.currentView) {
            case 'month':
                return this.renderMonthView();
            case 'week':
                return this.renderWeekView();
            case 'day':
                return this.renderDayView();
            default:
                return this.renderMonthView();
        }
    },

    renderMonthView() {
        const firstDay = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const weeks = [];
        let currentDate = new Date(startDate);

        for (let week = 0; week < 6; week++) {
            const days = [];
            for (let day = 0; day < 7; day++) {
                const dayEvents = this.getEventsForDate(currentDate);
                const isCurrentMonth = currentDate.getMonth() === this.selectedDate.getMonth();
                const isToday = this.isToday(currentDate);

                days.push(`
                    <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}"
                         data-date="${currentDate.toISOString().split('T')[0]}"
                         onclick="SchedulingModule.selectDate('${currentDate.toISOString()}')">
                        <div class="day-header">
                            <span class="day-number">${currentDate.getDate()}</span>
                        </div>
                        <div class="day-events">
                            ${dayEvents.slice(0, 3).map(event => this.renderEventCard(event, 'small')).join('')}
                            ${dayEvents.length > 3 ? `<div class="more-events">+${dayEvents.length - 3} more</div>` : ''}
                        </div>
                    </div>
                `);

                currentDate.setDate(currentDate.getDate() + 1);
            }
            weeks.push(`<div class="calendar-week">${days.join('')}</div>`);
        }

        return `
            <div class="calendar-container month-view">
                <div class="weekday-headers">
                    <div class="weekday-header">Sun</div>
                    <div class="weekday-header">Mon</div>
                    <div class="weekday-header">Tue</div>
                    <div class="weekday-header">Wed</div>
                    <div class="weekday-header">Thu</div>
                    <div class="weekday-header">Fri</div>
                    <div class="weekday-header">Sat</div>
                </div>
                <div class="calendar-grid">
                    ${weeks.join('')}
                </div>
            </div>
        `;
    },

    renderWeekView() {
        const weekStart = this.getWeekStart(this.selectedDate);
        const days = [];

        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            const dayEvents = this.getEventsForDate(day);

            days.push(`
                <div class="week-day" data-date="${day.toISOString().split('T')[0]}">
                    <div class="week-day-header">
                        <div class="day-name">${day.toLocaleDateString('en', { weekday: 'short' })}</div>
                        <div class="day-date ${this.isToday(day) ? 'today' : ''}">${day.getDate()}</div>
                    </div>
                    <div class="week-day-events">
                        ${this.renderTimeSlots(day, dayEvents)}
                    </div>
                </div>
            `);
        }

        return `
            <div class="calendar-container week-view">
                <div class="week-grid">
                    ${days.join('')}
                </div>
            </div>
        `;
    },

    renderDayView() {
        const dayEvents = this.getEventsForDate(this.selectedDate);
        
        return `
            <div class="calendar-container day-view">
                <div class="day-header-large">
                    <h2>${this.selectedDate.toLocaleDateString('en', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</h2>
                </div>
                <div class="day-schedule">
                    ${this.renderTimeSlots(this.selectedDate, dayEvents, true)}
                </div>
            </div>
        `;
    },

    renderTimeSlots(date, events, detailed = false) {
        const slots = [];
        const { start, end } = this.availabilityHours;

        for (let hour = start; hour <= end; hour++) {
            const timeSlot = new Date(date);
            timeSlot.setHours(hour, 0, 0, 0);
            
            const slotEvents = events.filter(event => {
                const eventStart = new Date(event.start_time);
                return eventStart.getHours() === hour;
            });

            const timeString = timeSlot.toLocaleTimeString('en', { 
                hour: 'numeric', 
                hour12: true 
            });

            slots.push(`
                <div class="time-slot" 
                     data-hour="${hour}"
                     data-date="${date.toISOString().split('T')[0]}"
                     onclick="SchedulingModule.createEventAtTime('${date.toISOString()}', ${hour})">
                    <div class="time-label">${timeString}</div>
                    <div class="slot-events">
                        ${slotEvents.map(event => this.renderEventCard(event, detailed ? 'large' : 'medium')).join('')}
                    </div>
                </div>
            `);
        }

        return slots.join('');
    },

    renderEventCard(event, size = 'medium') {
        const eventType = this.eventTypes[event.type] || this.eventTypes.meeting;
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        
        const timeString = `${startTime.toLocaleTimeString('en', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        })} - ${endTime.toLocaleTimeString('en', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        })}`;

        return `
            <div class="event-card ${size} ${event.type}" 
                 data-event-id="${event.id}"
                 draggable="true"
                 onclick="SchedulingModule.showEventDetails('${event.id}')"
                 style="border-left-color: ${eventType.color}">
                <div class="event-header">
                    <span class="event-icon">${eventType.icon}</span>
                    <span class="event-title">${event.title}</span>
                </div>
                ${size !== 'small' ? `
                    <div class="event-time">${timeString}</div>
                    ${event.notes && size === 'large' ? `<div class="event-notes">${event.notes}</div>` : ''}
                ` : ''}
                <div class="event-actions">
                    <button class="event-action-btn" onclick="event.stopPropagation(); SchedulingModule.editEvent('${event.id}')">
                        <span>✏️</span>
                    </button>
                    <button class="event-action-btn" onclick="event.stopPropagation(); SchedulingModule.deleteEvent('${event.id}')">
                        <span>🗑️</span>
                    </button>
                </div>
            </div>
        `;
    },

    renderEventModal() {
        return `
            <div class="modal-overlay" id="eventModal" style="display: none;">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="modalTitle">Add Event</h3>
                        <button class="modal-close" onclick="SchedulingModule.hideEventModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="modalMessages"></div>
                        <form id="eventForm">
                            <input type="hidden" id="eventId" name="id">
                            
                            <div class="form-group">
                                <label class="form-label">Event Title</label>
                                <input type="text" class="form-input" id="eventTitle" name="title" required>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Type</label>
                                    <select class="form-select" id="eventType" name="type">
                                        ${Object.entries(this.eventTypes).map(([key, type]) => 
                                            `<option value="${key}">${type.icon} ${type.label}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Date</label>
                                    <input type="date" class="form-input" id="eventDate" name="date" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Start Time</label>
                                    <input type="time" class="form-input" id="eventStartTime" name="start_time" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">End Time</label>
                                    <input type="time" class="form-input" id="eventEndTime" name="end_time" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Notes</label>
                                <textarea class="form-textarea" id="eventNotes" name="notes" rows="3"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Meeting Link (Optional)</label>
                                <input type="url" class="form-input" id="meetingLink" name="meeting_link" placeholder="https://zoom.us/...">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="SchedulingModule.hideEventModal()">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-primary" onclick="SchedulingModule.saveEvent()">
                            <span id="saveButtonText">Save Event</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // 📊 DATA MANAGEMENT (like AddLead)
    async loadEvents() {
        try {
            // Load from API or localStorage for now
            const stored = localStorage.getItem('steady_scheduling_events');
            this.events = stored ? JSON.parse(stored) : this.generateSampleEvents();
            
            console.log(`📅 Loaded ${this.events.length} events`);
        } catch (error) {
            console.error('❌ Failed to load events:', error);
            this.events = this.generateSampleEvents();
        }
    },

    async saveEvents() {
        try {
            localStorage.setItem('steady_scheduling_events', JSON.stringify(this.events));
            
            // TODO: Sync with API
            // await API.syncSchedulingEvents(this.events);
            
            console.log('💾 Events saved successfully');
        } catch (error) {
            console.error('❌ Failed to save events:', error);
        }
    },

    generateSampleEvents() {
        const today = new Date();
        const events = [];
        
        // Generate some sample events for demo
        for (let i = 0; i < 10; i++) {
            const start = new Date(today);
            start.setDate(today.getDate() + Math.floor(Math.random() * 30));
            start.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15);
            
            const end = new Date(start);
            end.setMinutes(start.getMinutes() + (Math.floor(Math.random() * 4) + 1) * 30);
            
            const types = Object.keys(this.eventTypes);
            const type = types[Math.floor(Math.random() * types.length)];
            
            events.push({
                id: `evt_${Date.now()}_${i}`,
                title: `${this.eventTypes[type].label}: Sample Event ${i + 1}`,
                type: type,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                lead_id: `lead_${i}`,
                status: 'scheduled',
                notes: `Sample notes for event ${i + 1}`,
                created_at: new Date().toISOString()
            });
        }
        
        return events;
    },

    // 🎯 EVENT MANAGEMENT (like AddLead handlers)
    async handleEventSubmit(e) {
        e.preventDefault();
        console.log('📝 Processing event form submission...');
        
        try {
            this.setLoadingState(true);
            this.clearMessages();
            
            const formData = this.collectEventData();
            console.log('📝 Event data collected:', formData);
            
            // Validate data
            const validation = this.validateEventData(formData);
            if (!validation.isValid) {
                this.showMessage(validation.errors.join(', '), 'error');
                return;
            }
            
            const eventId = document.getElementById('eventId').value;
            if (eventId) {
                // Update existing event
                await this.updateEvent(eventId, formData);
                this.showMessage('Event updated successfully! ✅', 'success');
            } else {
                // Create new event
                await this.createEvent(formData);
                this.showMessage('Event created successfully! 🎉', 'success');
            }
            
            setTimeout(() => {
                this.hideEventModal();
            }, 1500);
            
        } catch (error) {
            console.error('❌ Failed to save event:', error);
            this.showMessage(error.message || 'Failed to save event', 'error');
        } finally {
            this.setLoadingState(false);
        }
    },

    async createEvent(eventData) {
        const newEvent = {
            id: `evt_${Date.now()}`,
            title: eventData.title,
            type: eventData.type,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            lead_id: eventData.lead_id || null,
            status: 'scheduled',
            notes: eventData.notes || '',
            meeting_link: eventData.meeting_link || '',
            created_at: new Date().toISOString()
        };

        this.events.push(newEvent);
        await this.saveEvents();
        this.render();

        console.log('✅ Event created:', newEvent.title);
        return newEvent;
    },

    async updateEvent(eventId, updates) {
        const eventIndex = this.events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            throw new Error('Event not found');
        }

        this.events[eventIndex] = { ...this.events[eventIndex], ...updates };
        await this.saveEvents();
        this.render();

        console.log('✅ Event updated:', this.events[eventIndex].title);
    },

    async deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event?')) {
            return;
        }

        this.events = this.events.filter(e => e.id !== eventId);
        await this.saveEvents();
        this.render();

        console.log('🗑️ Event deleted');
        
        if (window.SteadyUtils && window.SteadyUtils.showToast) {
            window.SteadyUtils.showToast('Event deleted! 🗑️', 'info');
        }
    },

    // 🛠️ UTILITY METHODS (like AddLead)
    collectEventData() {
        const form = document.getElementById('eventForm');
        const formData = new FormData(form);
        
        const eventData = {
            title: formData.get('title').trim(),
            type: formData.get('type'),
            notes: formData.get('notes').trim(),
            meeting_link: formData.get('meeting_link').trim()
        };

        // Combine date and time
        const date = formData.get('date');
        const startTime = formData.get('start_time');
        const endTime = formData.get('end_time');
        
        eventData.start_time = new Date(`${date}T${startTime}`).toISOString();
        eventData.end_time = new Date(`${date}T${endTime}`).toISOString();

        return eventData;
    },

    validateEventData(data) {
        const errors = [];
        
        if (!data.title) {
            errors.push('Event title is required');
        }
        
        if (!data.start_time || !data.end_time) {
            errors.push('Start and end times are required');
        }
        
        if (new Date(data.end_time) <= new Date(data.start_time)) {
            errors.push('End time must be after start time');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    clearMessages() {
        const container = document.getElementById('modalMessages');
        if (container) {
            container.innerHTML = '';
        }
    },

    showMessage(message, type = 'info') {
        const container = document.getElementById('modalMessages');
        if (!container) return;

        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'success' ? 'alert-success' : 'alert-info';

        container.innerHTML = `
            <div class="alert ${alertClass}">
                ${message}
            </div>
        `;
    },

    setLoadingState(isLoading) {
        const saveBtn = document.getElementById('saveButtonText');
        const form = document.getElementById('eventForm');
        
        if (saveBtn) {
            saveBtn.textContent = isLoading ? 'Saving...' : 'Save Event';
        }
        
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea, button');
            inputs.forEach(input => {
                input.disabled = isLoading;
            });
        }
    },

    // 🎨 UI INTERACTIONS (like AddLead)
    showAddEventModal(date = null, hour = null) {
        const modal = document.getElementById('eventModal');
        const form = document.getElementById('eventForm');
        
        // Reset form
        form.reset();
        this.clearMessages();
        document.getElementById('modalTitle').textContent = 'Add Event';
        document.getElementById('saveButtonText').textContent = 'Save Event';
        
        // Pre-fill date and time if provided
        if (date) {
            document.getElementById('eventDate').value = date;
        }
        if (hour !== null) {
            document.getElementById('eventStartTime').value = `${hour.toString().padStart(2, '0')}:00`;
            document.getElementById('eventEndTime').value = `${(hour + 1).toString().padStart(2, '0')}:00`;
        }
        
        modal.style.display = 'flex';
        this.isVisible = true;
    },

    showEventDetails(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.clearMessages();
        
        // Fill form with event data for editing
        document.getElementById('modalTitle').textContent = 'Edit Event';
        document.getElementById('saveButtonText').textContent = 'Update Event';
        document.getElementById('eventId').value = event.id;
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventType').value = event.type;
        
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
        
        document.getElementById('eventDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('eventStartTime').value = startDate.toTimeString().slice(0, 5);
        document.getElementById('eventEndTime').value = endDate.toTimeString().slice(0, 5);
        document.getElementById('eventNotes').value = event.notes || '';
        document.getElementById('meetingLink').value = event.meeting_link || '';
        
        document.getElementById('eventModal').style.display = 'flex';
        this.isVisible = true;
    },

    hideEventModal() {
        document.getElementById('eventModal').style.display = 'none';
        this.isVisible = false;
    },

    async saveEvent() {
        await this.handleEventSubmit({ preventDefault: () => {} });
    },

    editEvent(eventId) {
        this.showEventDetails(eventId);
    },

    // 🔄 NAVIGATION (like AddLead)
    navigateMonth(direction) {
        this.selectedDate.setMonth(this.selectedDate.getMonth() + direction);
        this.render();
    },

    switchView(view) {
        this.currentView = view;
        this.render();
    },

    selectDate(dateString) {
        this.selectedDate = new Date(dateString);
        if (this.currentView === 'month') {
            this.currentView = 'day';
        }
        this.render();
    },

    createEventAtTime(dateString, hour) {
        const date = new Date(dateString).toISOString().split('T')[0];
        this.showAddEventModal(date, hour);
    },

    // 🗓️ INTEGRATION METHODS (like AddLead integration)
    async scheduleFromLead(leadData, followUpData) {
        console.log('📞 Scheduling follow-up from lead:', leadData.name);
        
        const eventData = {
            title: `Follow-up: ${leadData.name}`,
            type: 'follow_up',
            start_time: followUpData.start_time,
            end_time: followUpData.end_time,
            lead_id: leadData.id,
            notes: followUpData.notes || `Follow-up with ${leadData.name} from ${leadData.source}`
        };

        return await this.createEvent(eventData);
    },

    async markEventComplete(eventId) {
        await this.updateEvent(eventId, { status: 'completed' });
        
        // If it's a follow-up, update the lead status
        const event = this.events.find(e => e.id === eventId);
        if (event && event.type === 'follow_up' && event.lead_id) {
            // Integrate with AddLead module to update lead status
            if (window.AddLeadModule) {
                console.log('📞 Follow-up completed, updating lead...');
            }
        }
    },

    // 🛠️ HELPER METHODS
    getEventsForDate(date) {
        const dateString = date.toISOString().split('T')[0];
        return this.events.filter(event => {
            const eventDate = new Date(event.start_time).toISOString().split('T')[0];
            return eventDate === dateString;
        }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    },

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    getWeekStart(date) {
        const start = new Date(date);
        start.setDate(date.getDate() - date.getDay());
        return start;
    },

    // 🔔 REMINDER SERVICE
    startReminderService() {
        // Check for upcoming events every 5 minutes
        setInterval(() => {
            this.checkUpcomingEvents();
        }, 5 * 60 * 1000);
    },

    checkUpcomingEvents() {
        const now = new Date();
        const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);

        const upcomingEvents = this.events.filter(event => {
            const eventStart = new Date(event.start_time);
            return eventStart > now && eventStart <= in15Minutes && event.status === 'scheduled';
        });

        upcomingEvents.forEach(event => {
            this.showReminder(event);
        });
    },

    showReminder(event) {
        if (window.SteadyUtils && window.SteadyUtils.showToast) {
            window.SteadyUtils.showToast(
                `📅 Upcoming: ${event.title} in 15 minutes`, 
                'info'
            );
        }
    },

    // 🎨 EVENT LISTENERS
    attachEventListeners() {
        // Drag and drop functionality
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('event-card')) {
                this.draggedEvent = e.target.dataset.eventId;
                e.target.style.opacity = '0.5';
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('event-card')) {
                e.target.style.opacity = '1';
                this.draggedEvent = null;
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedEvent && e.target.classList.contains('time-slot')) {
                this.rescheduleEvent(this.draggedEvent, e.target);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case 'n':
                    if (!this.isVisible) this.showAddEventModal();
                    break;
                case 'm':
                    if (!this.isVisible) this.switchView('month');
                    break;
                case 'w':
                    if (!this.isVisible) this.switchView('week');
                    break;
                case 'd':
                    if (!this.isVisible) this.switchView('day');
                    break;
                case 'Escape':
                    if (this.isVisible) this.hideEventModal();
                    break;
            }
        });

        // Modal form submission
        const eventForm = document.getElementById('eventForm');
        if (eventForm) {
            eventForm.addEventListener('submit', (e) => {
                this.handleEventSubmit(e);
            });
        }
    },

    async rescheduleEvent(eventId, targetSlot) {
        const date = targetSlot.dataset.date;
        const hour = parseInt(targetSlot.dataset.hour);
        
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const newStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:00`);
        const duration = new Date(event.end_time) - new Date(event.start_time);
        const newEnd = new Date(newStart.getTime() + duration);

        await this.updateEvent(eventId, {
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString()
        });

        console.log('🔄 Event rescheduled');
        
        if (window.SteadyUtils && window.SteadyUtils.showToast) {
            window.SteadyUtils.showToast('Event rescheduled! 🔄', 'success');
        }
    },

    // 🎨 STYLES (like AddLead)
    renderStyles() {
        return `
            <style>
                /* 🗓️ NUCLEAR SCHEDULING STYLES */
                .nuclear-scheduling-container {
                    --scheduling-primary: #667eea;
                    --scheduling-success: #10b981;
                    --scheduling-warning: #f59e0b;
                    --scheduling-danger: #ef4444;
                    --scheduling-info: #3b82f6;
                    --scheduling-purple: #8b5cf6;
                    --scheduling-gray: #6b7280;
                    
                    --surface: #ffffff;
                    --surface-hover: #f8fafc;
                    --surface-secondary: #f1f5f9;
                    --text-primary: #1e293b;
                    --text-secondary: #64748b;
                    --border: #e2e8f0;
                    --border-hover: #cbd5e1;
                    --shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    --shadow-hover: 0 8px 25px rgba(0, 0, 0, 0.1);
                    --radius: 12px;
                    --spacing: 1rem;
                    --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                    background: var(--surface-secondary);
                    min-height: 100vh;
                    padding: 2rem;
                }

                /* 📋 HEADER BUBBLE (like AddLead) */
                .scheduling-header {
                    margin-bottom: 2rem;
                }

                .header-bubble {
                    background: var(--surface);
                    border-radius: 24px;
                    padding: 2rem;
                    box-shadow: var(--shadow);
                    border: 1px solid var(--border);
                    transition: var(--transition);
                }

                .header-bubble:hover {
                    box-shadow: var(--shadow-hover);
                    transform: translateY(-2px);
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                }

                .header-left {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .scheduling-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                    background: linear-gradient(135deg, var(--scheduling-primary), var(--scheduling-purple));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .title-icon {
                    font-size: 2.5rem;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
                }

                .date-navigation {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: var(--surface-hover);
                    padding: 0.75rem 1.5rem;
                    border-radius: var(--radius);
                    border: 1px solid var(--border);
                }

                .nav-btn {
                    width: 40px;
                    height: 40px;
                    border: none;
                    background: var(--surface);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: var(--transition);
                    color: var(--text-primary);
                    font-weight: 600;
                    font-size: 1.2rem;
                    border: 1px solid var(--border);
                }

                .nav-btn:hover {
                    background: var(--scheduling-primary);
                    color: white;
                    transform: scale(1.05);
                    border-color: var(--scheduling-primary);
                }

                .current-date {
                    text-align: center;
                    min-width: 200px;
                }

                .current-date .month {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .current-date .year {
                    font-size: 1rem;
                    color: var(--text-secondary);
                    margin-left: 0.5rem;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .view-switcher {
                    display: flex;
                    background: var(--surface-hover);
                    border-radius: var(--radius);
                    padding: 4px;
                    border: 1px solid var(--border);
                }

                .view-btn {
                    padding: 0.75rem 1.25rem;
                    border: none;
                    background: transparent;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    color: var(--text-secondary);
                    transition: var(--transition);
                    font-size: 0.9rem;
                }

                .view-btn.active,
                .view-btn:hover {
                    background: var(--scheduling-primary);
                    color: white;
                    transform: translateY(-1px);
                }

                .add-event-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 1rem 2rem;
                    background: linear-gradient(135deg, var(--scheduling-primary), var(--scheduling-purple));
                    color: white;
                    border: none;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    font-size: 1rem;
                }

                .add-event-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                }

                .btn-icon {
                    font-size: 1.2rem;
                }

                /* 📅 MAIN CONTENT BUBBLE (like AddLead) */
                .scheduling-main {
                    margin-bottom: 2rem;
                }

                .calendar-bubble {
                    background: var(--surface);
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: var(--shadow);
                    border: 1px solid var(--border);
                    transition: var(--transition);
                }

                .calendar-bubble:hover {
                    box-shadow: var(--shadow-hover);
                }

                /* 📅 CALENDAR VIEWS */
                .calendar-container {
                    background: transparent;
                }

                /* 📅 MONTH VIEW */
                .weekday-headers {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    background: var(--surface-hover);
                    border-bottom: 1px solid var(--border);
                }

                .weekday-header {
                    padding: 1.5rem 1rem;
                    text-align: center;
                    font-weight: 700;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .calendar-grid {
                    display: flex;
                    flex-direction: column;
                }

                .calendar-week {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    border-bottom: 1px solid var(--border);
                }

                .calendar-week:last-child {
                    border-bottom: none;
                }

                .calendar-day {
                    min-height: 140px;
                    padding: 1rem;
                    border-right: 1px solid var(--border);
                    cursor: pointer;
                    transition: var(--transition);
                    position: relative;
                    background: var(--surface);
                }

                .calendar-day:last-child {
                    border-right: none;
                }

                .calendar-day:hover {
                    background: var(--surface-hover);
                }

                .calendar-day.other-month {
                    background: var(--surface-secondary);
                    opacity: 0.6;
                }

                .calendar-day.today {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(139, 92, 246, 0.08));
                    border: 2px solid var(--scheduling-primary);
                }

                .day-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }

                .day-number {
                    font-weight: 700;
                    color: var(--text-primary);
                    font-size: 1.1rem;
                }

                .today .day-number {
                    background: var(--scheduling-primary);
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.9rem;
                }

                .day-events {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .more-events {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    text-align: center;
                    padding: 4px;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: var(--transition);
                }

                .more-events:hover {
                    color: var(--scheduling-primary);
                    background: var(--surface-hover);
                }

                /* 📅 WEEK VIEW */
                .week-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                }

                .week-day {
                    border-right: 1px solid var(--border);
                    min-height: 600px;
                }

                .week-day:last-child {
                    border-right: none;
                }

                .week-day-header {
                    padding: 1.5rem;
                    text-align: center;
                    border-bottom: 1px solid var(--border);
                    background: var(--surface-hover);
                }

                .day-name {
                    font-weight: 700;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    text-transform: uppercase;
                }

                .day-date {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-top: 0.5rem;
                }

                .day-date.today {
                    background: var(--scheduling-primary);
                    color: white;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto;
                }

                .week-day-events {
                    padding: 1rem;
                }

                /* 📅 DAY VIEW */
                .day-header-large {
                    padding: 2.5rem;
                    text-align: center;
                    background: var(--surface-hover);
                    border-bottom: 1px solid var(--border);
                }

                .day-header-large h2 {
                    margin: 0;
                    color: var(--text-primary);
                    font-weight: 700;
                    font-size: 1.8rem;
                }

                .day-schedule {
                    padding: 1.5rem;
                }

                /* ⏰ TIME SLOTS */
                .time-slot {
                    display: flex;
                    min-height: 70px;
                    border-bottom: 1px solid var(--border);
                    cursor: pointer;
                    transition: var(--transition);
                }

                .time-slot:hover {
                    background: var(--surface-hover);
                }

                .time-slot:last-child {
                    border-bottom: none;
                }

                .time-label {
                    flex-shrink: 0;
                    width: 100px;
                    padding: 1rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-align: right;
                    border-right: 1px solid var(--border);
                    background: var(--surface-hover);
                }

                .slot-events {
                    flex: 1;
                    padding: 0.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                /* 🎯 EVENT CARDS */
                .event-card {
                    background: var(--surface);
                    border-radius: 8px;
                    padding: 0.75rem;
                    border-left: 4px solid var(--scheduling-primary);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    cursor: pointer;
                    transition: var(--transition);
                    position: relative;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .event-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
                }

                .event-card.small {
                    padding: 0.5rem;
                    font-size: 0.75rem;
                }

                .event-card.medium {
                    padding: 0.75rem;
                    font-size: 0.875rem;
                }

                .event-card.large {
                    padding: 1rem;
                    font-size: 1rem;
                }

                .event-card.follow_up {
                    border-left-color: var(--scheduling-primary);
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(102, 126, 234, 0.02));
                }

                .event-card.demo {
                    border-left-color: var(--scheduling-success);
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02));
                }

                .event-card.call {
                    border-left-color: var(--scheduling-warning);
                    background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.02));
                }

                .event-card.meeting {
                    border-left-color: var(--scheduling-purple);
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.02));
                }

                .event-card.block {
                    border-left-color: var(--scheduling-gray);
                    background: linear-gradient(135deg, rgba(107, 114, 128, 0.05), rgba(107, 114, 128, 0.02));
                }

                .event-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.25rem;
                }

                .event-icon {
                    font-size: 1rem;
                    flex-shrink: 0;
                }

                .event-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .event-time {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.25rem;
                }

                .event-notes {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                    line-height: 1.4;
                }

                .event-actions {
                    display: flex;
                    gap: 0.25rem;
                    opacity: 0;
                    transition: var(--transition);
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                }

                .event-card:hover .event-actions {
                    opacity: 1;
                }

                .event-action-btn {
                    width: 24px;
                    height: 24px;
                    border: none;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    transition: var(--transition);
                    border: 1px solid var(--border);
                }

                .event-action-btn:hover {
                    background: white;
                    transform: scale(1.1);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                /* 📱 MODAL (like AddLead) */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 2rem;
                    opacity: 0;
                    visibility: hidden;
                    transition: var(--transition);
                }

                .modal-overlay[style*="flex"] {
                    opacity: 1;
                    visibility: visible;
                }

                .modal {
                    background: var(--surface);
                    border-radius: 20px;
                    width: 100%;
                    max-width: 650px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                    border: 1px solid var(--border);
                    transform: scale(0.95) translateY(20px);
                    transition: var(--transition);
                }

                .modal-overlay[style*="flex"] .modal {
                    transform: scale(1) translateY(0);
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 2rem 2rem 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .modal-header h3 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .modal-close {
                    width: 44px;
                    height: 44px;
                    border: none;
                    background: var(--surface-hover);
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                    font-size: 1.5rem;
                    transition: var(--transition);
                    border: 1px solid var(--border);
                }

                .modal-close:hover {
                    background: var(--scheduling-danger);
                    color: white;
                    transform: scale(1.05);
                    border-color: var(--scheduling-danger);
                }

                .modal-body {
                    padding: 2rem;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    padding: 1.5rem 2rem 2rem;
                    border-top: 1px solid var(--border);
                    background: var(--surface-hover);
                    border-radius: 0 0 20px 20px;
                }

                /* 📝 FORM STYLES (like AddLead) */
                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }

                .form-label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.875rem;
                }

                .form-input,
                .form-select,
                .form-textarea {
                    width: 100%;
                    padding: 1rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    background: var(--surface);
                    color: var(--text-primary);
                    font-size: 1rem;
                    font-family: inherit;
                    transition: var(--transition);
                    box-sizing: border-box;
                }

                .form-input:focus,
                .form-select:focus,
                .form-textarea:focus {
                    outline: none;
                    border-color: var(--scheduling-primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                    transform: translateY(-1px);
                }

                .form-textarea {
                    resize: vertical;
                    min-height: 100px;
                    font-family: inherit;
                }

                /* 🔘 BUTTONS (like AddLead) */
                .btn {
                    padding: 1rem 2rem;
                    border: none;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                    font-size: 1rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    text-decoration: none;
                    box-sizing: border-box;
                    font-family: inherit;
                }

                .btn-primary {
                    background: linear-gradient(135deg, var(--scheduling-primary), var(--scheduling-purple));
                    color: white;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                }

                .btn-secondary {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                    border: 2px solid var(--border);
                }

                .btn-secondary:hover:not(:disabled) {
                    background: var(--border-hover);
                    transform: translateY(-1px);
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none !important;
                }

                /* 🚨 ALERTS (like AddLead) */
                .alert {
                    padding: 1rem;
                    border-radius: var(--radius);
                    margin-bottom: 1rem;
                    font-weight: 500;
                }

                .alert-success {
                    background: rgba(16, 185, 129, 0.1);
                    color: #065f46;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }

                .alert-danger {
                    background: rgba(239, 68, 68, 0.1);
                    color: #991b1b;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }

                .alert-info {
                    background: rgba(59, 130, 246, 0.1);
                    color: #1e40af;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }

                /* 📱 RESPONSIVE */
                @media (max-width: 768px) {
                    .nuclear-scheduling-container {
                        padding: 1rem;
                    }

                    .header-content {
                        flex-direction: column;
                        text-align: center;
                    }

                    .header-actions {
                        flex-direction: column;
                        gap: 1rem;
                        width: 100%;
                    }

                    .calendar-day {
                        min-height: 100px;
                        padding: 0.75rem;
                    }

                    .form-row {
                        grid-template-columns: 1fr;
                    }

                    .week-grid {
                        grid-template-columns: 1fr;
                    }

                    .week-day {
                        border-right: none;
                        border-bottom: 1px solid var(--border);
                    }

                    .modal {
                        margin: 1rem;
                        max-width: none;
                    }
                }

                /* 🌙 DARK MODE */
                @media (prefers-color-scheme: dark) {
                    .nuclear-scheduling-container {
                        --surface: #1e293b;
                        --surface-hover: #334155;
                        --surface-secondary: #0f172a;
                        --text-primary: #f1f5f9;
                        --text-secondary: #94a3b8;
                        --border: #475569;
                        --border-hover: #64748b;
                    }

                    .event-card {
                        background: var(--surface-hover);
                        color: var(--text-primary);
                    }
                }

                /* 🎯 ANIMATIONS */
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

                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                .nuclear-scheduling-container {
                    animation: slideInUp 0.6s ease-out;
                }

                .header-bubble,
                .calendar-bubble {
                    animation: slideInUp 0.5s ease-out;
                }

                .modal {
                    animation: slideInDown 0.3s ease-out;
                }

                .event-card {
                    animation: fadeIn 0.3s ease-out;
                }

                /* 🎨 DRAG AND DROP */
                .event-card[draggable="true"]:hover {
                    cursor: grab;
                }

                .event-card[draggable="true"]:active {
                    cursor: grabbing;
                }

                .time-slot.drag-over {
                    background: rgba(102, 126, 234, 0.1);
                    border: 2px dashed var(--scheduling-primary);
                }

                /* 🔥 LOADING STATES */
                .btn.loading {
                    position: relative;
                    color: transparent;
                }

                .btn.loading::after {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    top: 50%;
                    left: 50%;
                    margin-left: -10px;
                    margin-top: -10px;
                    border: 2px solid transparent;
                    border-top-color: currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* 🎯 FOCUS MANAGEMENT */
                .nuclear-scheduling-container *:focus {
                    outline: 2px solid var(--scheduling-primary);
                    outline-offset: 2px;
                }

                .nuclear-scheduling-container button:focus,
                .nuclear-scheduling-container input:focus,
                .nuclear-scheduling-container select:focus,
                .nuclear-scheduling-container textarea:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
                }
            </style>
        `;
    },

// 🔄 LOADING & ERROR STATES
renderLoadingState() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner-large"></div>
            <div class="loading-text">🗓️ Loading your calendar...</div>
        </div>
        
        <style>
            .loading-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                gap: 2rem;
            }
            
            .loading-spinner-large {
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
},

renderError(error) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h2 class="error-title">Error Loading Calendar</h2>
            <p class="error-message">${error.message || 'Failed to load scheduling module'}</p>
            <button onclick="SchedulingModule.init()" class="retry-btn">
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
};

// 🔥 GLOBAL ACCESS (like AddLead)
if (typeof window !== 'undefined') {
    window.SchedulingModule = SchedulingModule;
    console.log('🗓️ SchedulingModule loaded and ready!');
}