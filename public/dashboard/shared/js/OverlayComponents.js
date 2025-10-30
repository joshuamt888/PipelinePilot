/**
 * OVERLAY COMPONENTS v1.0
 * Reusable overlay library for all modules
 * Location: /public/dashboard/shared/js/OverlayComponents.js
 * 
 * Usage:
 *   OverlayComponents.Leads.openDetail(leadId, callback);
 *   OverlayComponents.Leads.openMoveStage(leadId, currentStage, callback);
 *   OverlayComponents.Jobs.openCreator(prefillData, callback);
 */

window.OverlayComponents = {

    // ============================================
    // LEADS MODULE
    // ============================================
    Leads: {
        /**
         * Open lead detail overlay (read-only view)
         * @param {string} leadId - Lead UUID
         * @param {Function} onComplete - Callback when closed
         */
        async openDetail(leadId, onComplete) {
            // TODO: Fetch lead data
            // TODO: Render detail view
            // TODO: Show associated jobs/tasks
            // TODO: "Edit" button calls openEditor()
            console.log('[OverlayComponents.Leads] openDetail:', leadId);
        },

        /**
         * Open lead editor overlay
         * @param {string} leadId - Lead UUID
         * @param {Function} onComplete - Callback when saved
         */
        async openEditor(leadId, onComplete) {
            // TODO: Fetch lead data
            // TODO: Render edit form
            // TODO: Temperature toggle, quality slider, notes
            // TODO: Save button calls API.updateLead()
            // TODO: Call onComplete() to refresh parent module
            console.log('[OverlayComponents.Leads] openEditor:', leadId);
        },

        /**
         * Open lead creator overlay
         * @param {Object} prefillData - Optional pre-fill data
         * @param {Function} onComplete - Callback when created
         */
        async openCreator(prefillData = {}, onComplete) {
            // TODO: Render create form
            // TODO: Duplicate detection before save
            // TODO: Call API.createLead()
            // TODO: Call onComplete() to refresh parent module
            console.log('[OverlayComponents.Leads] openCreator:', prefillData);
        },

        /**
         * Open move stage overlay (Pipeline-specific)
         * @param {string} leadId - Lead UUID
         * @param {string} currentStage - Current stage ID
         * @param {Array} stages - Available stages
         * @param {Function} onComplete - Callback when moved
         */
        async openMoveStage(leadId, currentStage, stages, onComplete) {
            // TODO: Render stage selector with icons
            // TODO: Highlight current stage
            // TODO: Click stage → calls API.updateLead({ status })
            // TODO: Call onComplete() to refresh pipeline
            console.log('[OverlayComponents.Leads] openMoveStage:', leadId, currentStage);
        },

        /**
         * Open deal value editor overlay (Pipeline-specific)
         * @param {string} leadId - Lead UUID
         * @param {number} currentValue - Current potential_value
         * @param {Function} onComplete - Callback when saved
         */
        async openDealValueEditor(leadId, currentValue, onComplete) {
            // TODO: Render $ input with validation
            // TODO: Quick value buttons ($500, $1000, $2500, $5000, $10000, $25000)
            // TODO: Live validation (0.01 - 99,999,999.99)
            // TODO: Save button calls API.updateLead({ potential_value })
            // TODO: Call onComplete() to refresh pipeline
            console.log('[OverlayComponents.Leads] openDealValueEditor:', leadId, currentValue);
        },

        /**
         * Open loss reason editor overlay (Pipeline-specific)
         * @param {string} leadId - Lead UUID
         * @param {string} currentReason - Current lost_reason
         * @param {Function} onComplete - Callback when saved
         */
        async openLossReasonEditor(leadId, currentReason, onComplete) {
            // TODO: Render dropdown with predefined reasons:
            //   - Price too high
            //   - Went with competitor
            //   - Budget constraints
            //   - Timing not right
            //   - No longer interested
            //   - Poor communication
            //   - Product not a fit
            //   - Decision maker changed
            //   - Other (custom input, max 20 chars)
            // TODO: Save button calls API.updateLead({ lost_reason })
            // TODO: Call onComplete() to refresh pipeline
            console.log('[OverlayComponents.Leads] openLossReasonEditor:', leadId, currentReason);
        },

        /**
         * Open delete confirmation overlay
         * @param {string} leadId - Lead UUID
         * @param {string} leadName - Lead name for confirmation
         * @param {string} leadCompany - Lead company (optional)
         * @param {Function} onComplete - Callback when deleted
         */
        async openDeleteConfirmation(leadId, leadName, leadCompany, onComplete) {
            // TODO: Render warning message with lead name/company
            // TODO: "Are you sure?" with ⚠️ icon
            // TODO: "This action cannot be undone" warning
            // TODO: Delete/Cancel buttons
            // TODO: Delete button calls API.deleteLead()
            // TODO: Call onComplete() to refresh pipeline
            console.log('[OverlayComponents.Leads] openDeleteConfirmation:', leadId, leadName);
        },

        /**
         * Render lead detail HTML
         * @param {Object} lead - Lead data
         * @returns {string} HTML string
         */
        renderDetailView(lead) {
            // TODO: Build lead detail HTML
            return `<div>Lead Detail: ${lead.name}</div>`;
        },

        /**
         * Render lead edit form HTML
         * @param {Object} lead - Lead data
         * @returns {string} HTML string
         */
        renderEditForm(lead) {
            // TODO: Build edit form HTML
            return `<div>Edit Form for: ${lead.name}</div>`;
        },

        /**
         * Render lead create form HTML
         * @param {Object} prefillData - Pre-fill data
         * @returns {string} HTML string
         */
        renderCreateForm(prefillData) {
            // TODO: Build create form HTML
            return `<div>Create Lead Form</div>`;
        },

        /**
         * Render move stage selector HTML (Pipeline-specific)
         * @param {string} currentStage - Current stage ID
         * @param {Array} stages - Available stages [{id, name, icon, color, desc}]
         * @returns {string} HTML string
         */
        renderMoveStageSelector(currentStage, stages) {
            // TODO: Build stage selector with:
            //   - Stage icon + name
            //   - Description
            //   - Current stage highlighted/disabled
            //   - Click to move
            return `<div>Move Stage Selector</div>`;
        },

        /**
         * Render deal value input form HTML (Pipeline-specific)
         * @param {number} currentValue - Current value
         * @returns {string} HTML string
         */
        renderDealValueForm(currentValue) {
            // TODO: Build form with:
            //   - $ prefix input
            //   - Quick value buttons (500, 1000, 2500, 5000, 10000, 25000)
            //   - Live validation feedback
            //   - Character counter
            return `<div>Deal Value Form</div>`;
        },

        /**
         * Render loss reason selector HTML (Pipeline-specific)
         * @param {string} currentReason - Current reason
         * @returns {string} HTML string
         */
        renderLossReasonForm(currentReason) {
            // TODO: Build form with:
            //   - Dropdown with predefined reasons
            //   - "Other" option reveals text input (max 20 chars)
            //   - Character counter for custom input
            return `<div>Loss Reason Form</div>`;
        },

        /**
         * Render delete confirmation HTML
         * @param {string} leadName - Lead name
         * @param {string} leadCompany - Lead company
         * @returns {string} HTML string
         */
        renderDeleteConfirmation(leadName, leadCompany) {
            // TODO: Build warning message with:
            //   - ⚠️ icon (large)
            //   - "Are you sure you want to delete this lead?"
            //   - Lead name + company in bold
            //   - "This action cannot be undone" in red
            //   - Delete/Cancel buttons
            return `<div>Delete Confirmation for ${API.escapeHtml(leadName)}</div>`;
        },

        /**
         * Attach event handlers for lead edit form
         * @param {string} leadId - Lead UUID
         * @param {Function} onSave - Save callback
         */
        attachEditEvents(leadId, onSave) {
            // TODO: Temperature toggle logic
            // TODO: Quality slider logic
            // TODO: Notes validation
            // TODO: Form submission handler
            console.log('[OverlayComponents.Leads] attachEditEvents:', leadId);
        },

        /**
         * Attach event handlers for deal value form (Pipeline-specific)
         * @param {string} leadId - Lead UUID
         * @param {Function} onSave - Save callback
         */
        attachDealValueEvents(leadId, onSave) {
            // TODO: Input validation (decimal, max 99,999,999.99)
            // TODO: Quick button click handlers
            // TODO: Live formatting (add commas)
            // TODO: Form submission
            console.log('[OverlayComponents.Leads] attachDealValueEvents:', leadId);
        },

        /**
         * Attach event handlers for loss reason form (Pipeline-specific)
         * @param {string} leadId - Lead UUID
         * @param {Function} onSave - Save callback
         */
        attachLossReasonEvents(leadId, onSave) {
            // TODO: Dropdown change handler
            // TODO: Show/hide custom input when "Other" selected
            // TODO: Character counter for custom input (max 20)
            // TODO: Form submission
            console.log('[OverlayComponents.Leads] attachLossReasonEvents:', leadId);
        }
    },

    // ============================================
    // JOBS MODULE (PRO TIER)
    // ============================================
    Jobs: {
        /**
         * Open job detail overlay (read-only view with financials)
         * @param {string} jobId - Job UUID
         * @param {Function} onComplete - Callback when closed
         */
        async openDetail(jobId, onComplete) {
            // TODO: Fetch job data
            // TODO: Render detail view with profit/loss breakdown
            // TODO: Show associated lead
            // TODO: Show materials list
            // TODO: "Edit" button calls openEditor()
            console.log('[OverlayComponents.Jobs] openDetail:', jobId);
        },

        /**
         * Open job editor overlay
         * @param {string} jobId - Job UUID
         * @param {Function} onComplete - Callback when saved
         */
        async openEditor(jobId, onComplete) {
            // TODO: Fetch job data
            // TODO: Render edit form with financial inputs
            // TODO: Live profit calculator
            // TODO: Save button calls API.updateJob()
            console.log('[OverlayComponents.Jobs] openEditor:', jobId);
        },

        /**
         * Open job creator overlay
         * @param {Object} prefillData - Optional pre-fill (e.g., lead_id)
         * @param {Function} onComplete - Callback when created
         */
        async openCreator(prefillData = {}, onComplete) {
            // TODO: Render create form
            // TODO: Lead association picker
            // TODO: Financial inputs (material, labor, quoted price)
            // TODO: Live profit preview
            // TODO: Call API.createJob()
            console.log('[OverlayComponents.Jobs] openCreator:', prefillData);
        },

        /**
         * Render job detail HTML
         * @param {Object} job - Job data
         * @returns {string} HTML string
         */
        renderDetailView(job) {
            // TODO: Build job detail HTML with financials
            return `<div>Job Detail: ${job.title}</div>`;
        },

        /**
         * Render job financial breakdown card
         * @param {Object} job - Job data
         * @returns {string} HTML string
         */
        renderFinancialBreakdown(job) {
            // TODO: Profit/loss card with color coding
            // TODO: Material costs, labor, other expenses
            // TODO: Total cost, quoted price, final price
            // TODO: Profit margin % with visual indicator
            return `<div>Financial Breakdown</div>`;
        },

        /**
         * Render job create form HTML
         * @param {Object} prefillData - Pre-fill data
         * @returns {string} HTML string
         */
        renderCreateForm(prefillData) {
            // TODO: Build create form with financial section
            return `<div>Create Job Form</div>`;
        },

        /**
         * Attach event handlers for job financial calculator
         * @param {string} jobId - Job UUID or 'new'
         * @param {Function} onSave - Save callback
         */
        attachFinancialEvents(jobId, onSave) {
            // TODO: Material cost input handler
            // TODO: Labor hours × rate calculator
            // TODO: Live profit update as user types
            // TODO: Color-code profit (green/red)
            console.log('[OverlayComponents.Jobs] attachFinancialEvents:', jobId);
        }
    },

    // ============================================
    // GOALS MODULE (PRO TIER)
    // ============================================
    Goals: {
        /**
         * Open goal detail overlay (progress view)
         * @param {string} goalId - Goal UUID
         * @param {Function} onComplete - Callback when closed
         */
        async openDetail(goalId, onComplete) {
            // TODO: Fetch goal data
            // TODO: Render progress ring (Apple Watch style)
            // TODO: Show days remaining
            // TODO: Show progress history/timeline
            // TODO: "Edit" button calls openEditor()
            console.log('[OverlayComponents.Goals] openDetail:', goalId);
        },

        /**
         * Open goal editor overlay
         * @param {string} goalId - Goal UUID
         * @param {Function} onComplete - Callback when saved
         */
        async openEditor(goalId, onComplete) {
            // TODO: Fetch goal data
            // TODO: Render edit form
            // TODO: Update target value, period, etc.
            // TODO: Save button calls API.updateGoal()
            console.log('[OverlayComponents.Goals] openEditor:', goalId);
        },

        /**
         * Open goal creator overlay
         * @param {Object} prefillData - Optional pre-fill
         * @param {Function} onComplete - Callback when created
         */
        async openCreator(prefillData = {}, onComplete) {
            // TODO: Render create form
            // TODO: Goal type selector (leads_created, revenue, jobs_completed)
            // TODO: Period selector (daily, weekly, monthly)
            // TODO: Target value input
            // TODO: Call API.createGoal()
            console.log('[OverlayComponents.Goals] openCreator:', prefillData);
        },

        /**
         * Render goal detail HTML with progress ring
         * @param {Object} goal - Goal data
         * @returns {string} HTML string
         */
        renderDetailView(goal) {
            // TODO: Build goal detail with Apple Watch ring
            // TODO: Progress percentage
            // TODO: Days remaining countdown
            return `<div>Goal Detail: ${goal.title}</div>`;
        },

        /**
         * Render goal progress ring (SVG or CSS)
         * @param {number} percentage - Progress 0-100
         * @param {string} color - Ring color
         * @returns {string} HTML string
         */
        renderProgressRing(percentage, color) {
            // TODO: SVG circle progress ring
            // TODO: Animated stroke-dashoffset
            return `<div>Progress Ring: ${percentage}%</div>`;
        },

        /**
         * Render goal create form HTML
         * @param {Object} prefillData - Pre-fill data
         * @returns {string} HTML string
         */
        renderCreateForm(prefillData) {
            // TODO: Build create form
            return `<div>Create Goal Form</div>`;
        }
    },

    // ============================================
    // TASKS MODULE
    // ============================================
    Tasks: {
        /**
         * Open task detail overlay
         * @param {string} taskId - Task UUID
         * @param {Function} onComplete - Callback when closed
         */
        async openDetail(taskId, onComplete) {
            // TODO: Fetch task data
            // TODO: Render detail view
            // TODO: Show associated lead
            // TODO: "Edit" button calls openEditor()
            console.log('[OverlayComponents.Tasks] openDetail:', taskId);
        },

        /**
         * Open task editor overlay
         * @param {string} taskId - Task UUID
         * @param {Function} onComplete - Callback when saved
         */
        async openEditor(taskId, onComplete) {
            // TODO: Fetch task data
            // TODO: Render edit form
            // TODO: Save button calls API.updateTask()
            console.log('[OverlayComponents.Tasks] openEditor:', taskId);
        },

        /**
         * Open task creator overlay
         * @param {Object} prefillData - Optional pre-fill
         * @param {Function} onComplete - Callback when created
         */
        async openCreator(prefillData = {}, onComplete) {
            // TODO: Render create form
            // TODO: Lead association picker
            // TODO: Due date/time picker
            // TODO: Priority selector
            // TODO: Call API.createTask()
            console.log('[OverlayComponents.Tasks] openCreator:', prefillData);
        },

        /**
         * Render task detail HTML
         * @param {Object} task - Task data
         * @returns {string} HTML string
         */
        renderDetailView(task) {
            // TODO: Build task detail HTML
            return `<div>Task Detail: ${task.title}</div>`;
        },

        /**
         * Render task create form HTML
         * @param {Object} prefillData - Pre-fill data
         * @returns {string} HTML string
         */
        renderCreateForm(prefillData) {
            // TODO: Build create form
            return `<div>Create Task Form</div>`;
        }
    },

    // ============================================
    // DASHBOARD MODULE
    // ============================================
    Dashboard: {
        /**
         * Open analytics breakdown overlay
         * @param {string} metricType - 'leads', 'tasks', 'revenue', etc.
         */
        async openAnalyticsBreakdown(metricType) {
            // TODO: Fetch detailed stats for metric
            // TODO: Render chart/graph
            // TODO: Show breakdown by category
            console.log('[OverlayComponents.Dashboard] openAnalyticsBreakdown:', metricType);
        },

        /**
         * Open recent activity detail overlay
         * @param {string} activityType - 'leads', 'tasks', 'jobs'
         */
        async openRecentActivity(activityType) {
            // TODO: Fetch recent items
            // TODO: Render list with clickable items
            // TODO: Click item opens appropriate detail overlay
            console.log('[OverlayComponents.Dashboard] openRecentActivity:', activityType);
        },

        /**
         * Render chart for metric
         * @param {string} metricType - Metric type
         * @param {Array} data - Chart data
         * @returns {string} HTML string
         */
        renderChart(metricType, data) {
            // TODO: Build chart HTML (could use Chart.js or custom)
            return `<div>Chart: ${metricType}</div>`;
        }
    },

    // ============================================
    // SETTINGS MODULE
    // ============================================
    Settings: {
        /**
         * Open preferences editor overlay
         * @param {Function} onComplete - Callback when saved
         */
        async openPreferencesEditor(onComplete) {
            // TODO: Fetch current preferences
            // TODO: Render preferences form
            // TODO: Windowing toggle, theme, etc.
            // TODO: Save button calls API.updatePreferences()
            console.log('[OverlayComponents.Settings] openPreferencesEditor');
        },

        /**
         * Open password change overlay
         * @param {Function} onComplete - Callback when changed
         */
        async openPasswordChanger(onComplete) {
            // TODO: Render password change form
            // TODO: Current password, new password, confirm
            // TODO: Password strength meter
            // TODO: Call API.updatePassword()
            console.log('[OverlayComponents.Settings] openPasswordChanger');
        },

        /**
         * Render preferences form HTML
         * @param {Object} preferences - Current preferences
         * @returns {string} HTML string
         */
        renderPreferencesForm(preferences) {
            // TODO: Build preferences form
            return `<div>Preferences Form</div>`;
        }
    },

    // ============================================
    // SHARED UTILITIES
    // ============================================
    Utils: {
        /**
         * Create standard overlay footer with buttons
         * @param {Array} buttons - Array of {label, type, onClick}
         * @returns {string} HTML string
         */
        renderFooter(buttons) {
            // TODO: Render standard button footer
            // button types: 'primary', 'secondary', 'danger'
            return buttons.map(btn => 
                `<button class="btn-${btn.type}" onclick="${btn.onClick}">${btn.label}</button>`
            ).join('');
        },

        /**
         * Create loading state HTML
         * @returns {string} HTML string
         */
        renderLoading() {
            return `
                <div class="overlay-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
        },

        /**
         * Create error state HTML
         * @param {string} message - Error message
         * @returns {string} HTML string
         */
        renderError(message) {
            return `
                <div class="overlay-error">
                    <span class="error-icon">⚠️</span>
                    <p>${API.escapeHtml(message)}</p>
                </div>
            `;
        },

        /**
         * Create empty state HTML
         * @param {string} icon - Emoji icon
         * @param {string} title - Empty state title
         * @param {string} subtitle - Empty state subtitle
         * @returns {string} HTML string
         */
        renderEmpty(icon, title, subtitle) {
            return `
                <div class="overlay-empty">
                    <span class="empty-icon">${icon}</span>
                    <h3>${API.escapeHtml(title)}</h3>
                    <p>${API.escapeHtml(subtitle)}</p>
                </div>
            `;
        },

        /**
         * Validate form data
         * @param {Object} data - Form data
         * @param {Object} rules - Validation rules
         * @returns {Object} {valid: boolean, errors: Array}
         */
        validateForm(data, rules) {
            // TODO: Generic form validation
            const errors = [];
            
            // Example rules:
            // {
            //   name: { required: true, minLength: 2 },
            //   email: { required: true, type: 'email' }
            // }
            
            return { valid: errors.length === 0, errors };
        },

        /**
         * Show toast notification
         * @param {string} message - Toast message
         * @param {string} type - 'success', 'error', 'warning', 'info'
         */
        toast(message, type = 'info') {
            if (window.SteadyUtils?.showToast) {
                window.SteadyUtils.showToast(message, type);
            } else {
                console.log(`[Toast ${type}]:`, message);
            }
        }
    }
};

// ============================================
// INITIALIZATION
// ============================================
if (typeof window.OverlayManager === 'undefined') {
    console.error('[OverlayComponents] OverlayManager not loaded! Load OverlayManager.js first.');
} else {
    console.log('[OverlayComponents] Loaded and ready');
}