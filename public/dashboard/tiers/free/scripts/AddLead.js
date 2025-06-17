/**
 * 🚀 GOATED ADDLEAD MODULE - PIPELINE FEEDER EDITION
 * 
 * This bad boy is a CLEAN, ISOLATED lead creation machine!
 * Doesn't touch headers, doesn't mess with shell, just pure lead creation MAGIC.
 * Feeds fresh leads directly into your Pipeline system like a BEAST!
 * 
 * Features:
 * ✅ Completely self-contained - no shell interference 
 * ✅ Beautiful form with real-time validation
 * ✅ Feeds leads to Pipeline system as "New Lead" status
 * ✅ Progress tracking with animated counters
 * ✅ Mobile responsive & theme aware
 * ✅ Real-time API integration with error handling
 * ✅ Smart form management with auto-clear
 * ✅ Goal tracking for motivation
 * 
 * @version 2.0.0 - PIPELINE FEEDER EDITION
 * @author SteadyManager Legends
 */

class GoatedAddLeadController {
    constructor() {
        this.state = {
            isSubmitting: false,
            userLimits: {
                monthly: 50,
                current: 0
            },
            userGoals: {
                daily: 5,
                weekly: 25,
                monthly: 50
            },
            progressStats: {
                today: 0,
                week: 0,
                month: 0
            }
        };
        
        // Debounced validation using SteadyUtils
        this.debouncedValidation = SteadyUtils.debounce(() => this.validateForm(), 300);
        
        // Real-time API event listeners
        this.setupAPIListeners();
        
        console.log('🔥 Goated AddLead Controller initialized - ready to feed the pipeline!');
    }

    // 🚀 MAIN INITIALIZATION - TV IN THE CORNER STYLE
    async init() {
        try {
            console.log('🎯 AddLead module loading - staying in its lane...');
            
            // 1. Take over mainContent cleanly
            this.renderInterface();
            
            // 2. Load user data for limits & goals
            await this.loadUserData();
            
            // 3. Update all displays with animations
            this.updateAllDisplays();
            
            // 4. Setup form events & validation
            this.setupFormEvents();
            
            // 5. Animate in with style
            this.showInterfaceWithFlair();
            
            console.log('✅ AddLead module locked and loaded - Pipeline feeder ready!');
            
        } catch (error) {
            console.error('❌ AddLead failed to initialize:', error);
            this.showErrorState(error.message);
        }
    }

    // 🎯 API EVENT LISTENERS - REAL-TIME MAGIC
    setupAPIListeners() {
        // Listen for successful lead creation
        API.on('lead:created', (lead) => {
            console.log('🎉 New lead created - updating stats!', lead);
            
            // Update our internal counters
            this.state.userLimits.current++;
            this.state.progressStats.today++;
            this.state.progressStats.week++;
            this.state.progressStats.month++;
            
            // Update displays with smooth animations
            this.updateAllDisplays();
            
            // Clear form for next lead
            this.clearFormWithStyle();
            
            // Show success feedback
            this.showSuccessFeedback(lead.name);
            
            // Emit event for Pipeline module to catch
            SteadyUtils.emit('addlead:success', {
                lead: lead,
                action: 'created',
                timestamp: Date.now()
            });
        });

        // Listen for API errors
        API.on('lead:error', (error) => {
            console.error('💥 Lead creation error:', error);
            this.showErrorFeedback(error.message);
        });

        // Listen for connection status
        API.on('connection:lost', () => {
            SteadyUtils.showToast('Connection lost - changes will sync when restored', 'warning', {
                duration: 6000
            });
        });

        API.on('connection:restored', () => {
            SteadyUtils.showToast('Connection restored! 🌐', 'success');
        });
    }

    // 🎨 RENDER INTERFACE - CLEAN & BEAUTIFUL
    renderInterface() {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            console.error('❌ MainContent not found!');
            return;
        }

        mainContent.innerHTML = `
            <div class="goated-addlead-container">
                <!-- 📊 PROGRESS HEADER -->
                <section class="progress-section">
                    <div class="progress-card">
                        <div class="progress-header">
                            <div class="progress-title">
                                <span class="title-text">Lead Progress</span>
                                <span class="title-emoji">🎯</span>
                            </div>
                            <div class="limit-counter">
                                <span class="current-number" id="currentLeadCount">0</span>
                                <span class="limit-separator">/</span>
                                <span class="limit-number" id="maxLeadLimit">50</span>
                                <span class="limit-text">leads</span>
                            </div>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progressBarFill"></div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ⚡ LEAD CREATION FORM -->
                <section class="form-section">
                    <div class="form-card">
                        <div class="form-header">
                            <h2 class="form-title">⚡ Add New Lead</h2>
                            <p class="form-subtitle">Create leads that go straight to your pipeline</p>
                        </div>
                        
                        <form class="lead-form" id="leadCreationForm">
                            <!-- Basic Info Row -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="leadName" class="form-label">Full Name *</label>
                                    <input 
                                        type="text" 
                                        id="leadName" 
                                        class="form-input required"
                                        placeholder="John Smith"
                                        autocomplete="name"
                                        required
                                    >
                                    <div class="field-error" id="nameError"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="leadEmail" class="form-label">Email Address</label>
                                    <input 
                                        type="email" 
                                        id="leadEmail" 
                                        class="form-input"
                                        placeholder="john@company.com"
                                        autocomplete="email"
                                    >
                                    <div class="field-error" id="emailError"></div>
                                </div>
                            </div>

                            <!-- Contact Info Row -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="leadCompany" class="form-label">Company</label>
                                    <input 
                                        type="text" 
                                        id="leadCompany" 
                                        class="form-input"
                                        placeholder="Acme Corporation"
                                        autocomplete="organization"
                                    >
                                </div>
                                
                                <div class="form-group">
                                    <label for="leadPhone" class="form-label">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        id="leadPhone" 
                                        class="form-input"
                                        placeholder="(555) 123-4567"
                                        autocomplete="tel"
                                    >
                                </div>
                            </div>

                            <!-- Classification Row -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="leadType" class="form-label">Lead Temperature</label>
                                    <select id="leadType" class="form-select">
                                        <option value="cold">❄️ Cold Lead</option>
                                        <option value="warm" selected>🔥 Warm Lead</option>
                                        <option value="hot">⚡ Hot Lead</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="leadSource" class="form-label">Lead Source</label>
                                    <select id="leadSource" class="form-select">
                                        <option value="Dashboard" selected>📊 Dashboard</option>
                                        <option value="LinkedIn">💼 LinkedIn</option>
                                        <option value="Facebook">📘 Facebook</option>
                                        <option value="Website">🌐 Website</option>
                                        <option value="Referral">🤝 Referral</option>
                                        <option value="Cold Outreach">📞 Cold Outreach</option>
                                        <option value="Other">📦 Other</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Notes Section -->
                            <div class="form-group">
                                <label for="leadNotes" class="form-label">Notes & Details</label>
                                <textarea 
                                    id="leadNotes" 
                                    class="form-textarea"
                                    placeholder="Any important details about this lead..."
                                    rows="3"
                                ></textarea>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="form-actions">
                                <button type="submit" class="submit-button" id="submitButton">
                                    <span class="button-text">Add to Pipeline</span>
                                    <span class="button-loader" style="display: none;">
                                        <div class="loading-spinner"></div>
                                    </span>
                                </button>
                                
                                <button type="button" class="clear-button" id="clearButton">
                                    <span>Clear Form</span>
                                </button>
                            </div>
                        </form>
                        
                        <!-- SUCCESS NOTIFICATION -->
                        <div class="success-notification" id="successNotification" style="display: none;">
                            <div class="success-icon">🎉</div>
                            <div class="success-content">
                                <div class="success-title">Lead Added Successfully!</div>
                                <div class="success-message" id="successMessage"></div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 🎯 GOAL TRACKING -->
                <section class="goals-section">
                    <div class="goals-card">
                        <div class="goals-header">
                            <h3 class="goals-title">🎯 Today's Progress</h3>
                        </div>
                        
                        <div class="goals-grid">
                            <div class="goal-stat">
                                <div class="goal-label">Today</div>
                                <div class="goal-numbers">
                                    <span class="goal-current" id="todayCount">0</span>
                                    <span class="goal-divider">/</span>
                                    <span class="goal-target" id="todayTarget">5</span>
                                </div>
                                <div class="goal-progress">
                                    <div class="mini-progress-bar">
                                        <div class="mini-progress-fill" id="todayProgressFill"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="goal-stat">
                                <div class="goal-label">This Week</div>
                                <div class="goal-numbers">
                                    <span class="goal-current" id="weekCount">0</span>
                                    <span class="goal-divider">/</span>
                                    <span class="goal-target" id="weekTarget">25</span>
                                </div>
                                <div class="goal-progress">
                                    <div class="mini-progress-bar">
                                        <div class="mini-progress-fill" id="weekProgressFill"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="goal-stat">
                                <div class="goal-label">This Month</div>
                                <div class="goal-numbers">
                                    <span class="goal-current" id="monthCount">0</span>
                                    <span class="goal-divider">/</span>
                                    <span class="goal-target" id="monthTarget">50</span>
                                </div>
                                <div class="goal-progress">
                                    <div class="mini-progress-bar">
                                        <div class="mini-progress-fill" id="monthProgressFill"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;

        // Add the goated styles
        this.injectGoatedStyles();
        
        console.log('🎨 Interface rendered - looking fresh!');
    }

    // 📊 LOAD USER DATA FROM API
    async loadUserData() {
        try {
            console.log('📡 Loading user data...');
            
            // Get current user info
            const userData = await API.getCurrentUser();
            if (userData?.user) {
                // Update limits from user data
                this.state.userLimits = {
                    monthly: userData.user.monthlyLeadLimit || 50,
                    current: userData.user.currentMonthLeads || 0
                };
                
                // Update goals from user settings
                if (userData.user.goals) {
                    this.state.userGoals = {
                        daily: userData.user.goals.daily || 5,
                        weekly: userData.user.goals.weekly || 25,
                        monthly: userData.user.goals.monthly || 50
                    };
                }
            }

            // Get leads to calculate progress stats
            const leadsData = await API.getLeads();
            if (leadsData?.all) {
                this.calculateProgressStats(leadsData.all);
            }
            
            console.log('📊 User data loaded:', this.state);
            
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            // Continue with defaults - don't break the experience
        }
    }

    // 🧮 CALCULATE PROGRESS STATS
    calculateProgressStats(leads) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        this.state.progressStats = {
            today: 0,
            week: 0,
            month: 0
        };
        
        leads.forEach(lead => {
            const leadDate = new Date(lead.created_at);
            
            if (leadDate >= startOfDay) {
                this.state.progressStats.today++;
            }
            if (leadDate >= startOfWeek) {
                this.state.progressStats.week++;
            }
            if (leadDate >= startOfMonth) {
                this.state.progressStats.month++;
            }
        });
    }

    // 🔄 UPDATE ALL DISPLAYS WITH ANIMATIONS
    updateAllDisplays() {
        this.updateProgressDisplay();
        this.updateGoalDisplays();
    }

    // 📊 UPDATE MAIN PROGRESS DISPLAY
    updateProgressDisplay() {
        const currentEl = document.getElementById('currentLeadCount');
        const maxEl = document.getElementById('maxLeadLimit');
        const progressEl = document.getElementById('progressBarFill');
        
        if (currentEl) {
            SteadyUtils.animateCounter(currentEl, this.state.userLimits.current, { 
                duration: 800,
                easing: 'easeOutCubic'
            });
        }
        
        if (maxEl) {
            maxEl.textContent = this.state.userLimits.monthly;
        }
        
        if (progressEl) {
            const percentage = (this.state.userLimits.current / this.state.userLimits.monthly) * 100;
            progressEl.style.width = `${Math.min(percentage, 100)}%`;
        }
    }

    // 🎯 UPDATE GOAL DISPLAYS
    updateGoalDisplays() {
        // Today's progress
        const todayCurrentEl = document.getElementById('todayCount');
        const todayTargetEl = document.getElementById('todayTarget');
        const todayProgressEl = document.getElementById('todayProgressFill');
        
        if (todayCurrentEl) {
            SteadyUtils.animateCounter(todayCurrentEl, this.state.progressStats.today, { duration: 600 });
        }
        if (todayTargetEl) {
            todayTargetEl.textContent = this.state.userGoals.daily;
        }
        if (todayProgressEl) {
            const percentage = (this.state.progressStats.today / this.state.userGoals.daily) * 100;
            todayProgressEl.style.width = `${Math.min(percentage, 100)}%`;
        }
        
        // Week's progress
        const weekCurrentEl = document.getElementById('weekCount');
        const weekTargetEl = document.getElementById('weekTarget');
        const weekProgressEl = document.getElementById('weekProgressFill');
        
        if (weekCurrentEl) {
            SteadyUtils.animateCounter(weekCurrentEl, this.state.progressStats.week, { duration: 600 });
        }
        if (weekTargetEl) {
            weekTargetEl.textContent = this.state.userGoals.weekly;
        }
        if (weekProgressEl) {
            const percentage = (this.state.progressStats.week / this.state.userGoals.weekly) * 100;
            weekProgressEl.style.width = `${Math.min(percentage, 100)}%`;
        }
        
        // Month's progress
        const monthCurrentEl = document.getElementById('monthCount');
        const monthTargetEl = document.getElementById('monthTarget');
        const monthProgressEl = document.getElementById('monthProgressFill');
        
        if (monthCurrentEl) {
            SteadyUtils.animateCounter(monthCurrentEl, this.state.progressStats.month, { duration: 600 });
        }
        if (monthTargetEl) {
            monthTargetEl.textContent = this.state.userGoals.monthly;
        }
        if (monthProgressEl) {
            const percentage = (this.state.progressStats.month / this.state.userGoals.monthly) * 100;
            monthProgressEl.style.width = `${Math.min(percentage, 100)}%`;
        }
    }

    // 🎛️ SETUP FORM EVENTS
    setupFormEvents() {
        const form = document.getElementById('leadCreationForm');
        const submitBtn = document.getElementById('submitButton');
        const clearBtn = document.getElementById('clearButton');
        
        // Form submission
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        // Real-time validation on inputs
        const inputs = form?.querySelectorAll('.form-input');
        inputs?.forEach(input => {
            input.addEventListener('input', this.debouncedValidation);
            input.addEventListener('blur', () => this.validateSingleField(input));
        });

        // Clear button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFormWithStyle();
            });
        }

        // Auto-focus on name field
        const nameInput = document.getElementById('leadName');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 300);
        }
        
        console.log('🎛️ Form events setup complete');
    }

    // 📝 HANDLE FORM SUBMISSION - THE MAGIC MOMENT
    async handleFormSubmission() {
        if (this.state.isSubmitting) return;

        try {
            console.log('🚀 Form submission initiated...');
            
            // Validate the form first
            if (!this.validateForm()) {
                SteadyUtils.showToast('Please fix the errors below', 'error');
                return;
            }

            // Check if we're at the limit
            if (this.state.userLimits.current >= this.state.userLimits.monthly) {
                this.showLimitReachedFeedback();
                return;
            }

            // Set loading state
            this.state.isSubmitting = true;
            this.setSubmitButtonLoading(true);

            // Collect and sanitize form data
            const leadData = this.collectFormData();
            
            console.log('📋 Collected lead data:', leadData);

            // Send to API - this will trigger the lead:created event
            const result = await API.createLead(leadData);
            
            console.log('✅ Lead created successfully:', result);

        } catch (error) {
            console.error('❌ Lead creation failed:', error);
            this.showErrorFeedback(API.formatError(error));
        } finally {
            this.state.isSubmitting = false;
            this.setSubmitButtonLoading(false);
        }
    }

    // 📋 COLLECT FORM DATA
    collectFormData() {
        const nameEl = document.getElementById('leadName');
        const emailEl = document.getElementById('leadEmail');
        const companyEl = document.getElementById('leadCompany');
        const phoneEl = document.getElementById('leadPhone');
        const typeEl = document.getElementById('leadType');
        const sourceEl = document.getElementById('leadSource');
        const notesEl = document.getElementById('leadNotes');

        return {
            name: SteadyUtils.sanitizeInput(nameEl?.value?.trim() || '', 'text'),
            email: SteadyUtils.sanitizeInput(emailEl?.value?.trim() || '', 'email'),
            company: SteadyUtils.sanitizeInput(companyEl?.value?.trim() || '', 'text'),
            phone: SteadyUtils.sanitizeInput(phoneEl?.value?.trim() || '', 'phone'),
            type: typeEl?.value || 'warm',
            platform: sourceEl?.value || 'Dashboard',
            notes: SteadyUtils.sanitizeInput(notesEl?.value?.trim() || '', 'text'),
            status: 'New lead', // Pipeline will handle this
            qualityScore: this.calculateLeadScore(),
            potentialValue: 0,
            followUpDate: null
        };
    }

    // 🎯 CALCULATE LEAD SCORE BASED ON DATA COMPLETENESS
    calculateLeadScore() {
        const nameEl = document.getElementById('leadName');
        const emailEl = document.getElementById('leadEmail');
        const companyEl = document.getElementById('leadCompany');
        const phoneEl = document.getElementById('leadPhone');
        const typeEl = document.getElementById('leadType');
        
        let score = 1; // Base score
        
        if (nameEl?.value?.trim()) score += 2;
        if (emailEl?.value?.trim() && SteadyUtils.isEmail(emailEl.value)) score += 2;
        if (companyEl?.value?.trim()) score += 2;
        if (phoneEl?.value?.trim()) score += 1;
        if (typeEl?.value === 'hot') score += 2;
        else if (typeEl?.value === 'warm') score += 1;
        
        return Math.min(score, 10); // Cap at 10
    }

    // ✅ FORM VALIDATION
    validateForm() {
        let isValid = true;
        
        // Clear previous errors
        this.clearAllErrors();

        // Validate required name field
        const nameInput = document.getElementById('leadName');
        const name = nameInput?.value?.trim();
        if (!name) {
            this.setFieldError('nameError', 'Name is required');
            nameInput?.classList.add('error');
            SteadyUtils.shake(nameInput);
            isValid = false;
        }

        // Validate email if provided
        const emailInput = document.getElementById('leadEmail');
        const email = emailInput?.value?.trim();
        if (email && !SteadyUtils.isEmail(email)) {
            this.setFieldError('emailError', 'Please enter a valid email address');
            emailInput?.classList.add('error');
            SteadyUtils.shake(emailInput);
            isValid = false;
        }

        return isValid;
    }

    // 🎯 VALIDATE SINGLE FIELD
    validateSingleField(input) {
        const fieldName = input.id.replace('lead', '').toLowerCase();
        const errorId = fieldName + 'Error';
        
        // Clear previous error
        input.classList.remove('error');
        const errorEl = document.getElementById(errorId);
        if (errorEl) errorEl.textContent = '';
        
        // Validate based on field type
        if (input.id === 'leadName') {
            if (!input.value.trim()) {
                this.setFieldError(errorId, 'Name is required');
                input.classList.add('error');
            }
        } else if (input.id === 'leadEmail') {
            const email = input.value.trim();
            if (email && !SteadyUtils.isEmail(email)) {
                this.setFieldError(errorId, 'Please enter a valid email');
                input.classList.add('error');
            }
        }
    }

    // 🚨 ERROR HANDLING
    setFieldError(errorId, message) {
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    clearAllErrors() {
        document.querySelectorAll('.field-error').forEach(el => {
            el.textContent = '';
        });
        document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
            el.classList.remove('error');
        });
    }

    // 🔄 LOADING STATES
    setSubmitButtonLoading(loading) {
        const submitBtn = document.getElementById('submitButton');
        const btnText = submitBtn?.querySelector('.button-text');
        const btnLoader = submitBtn?.querySelector('.button-loader');

        if (loading) {
            submitBtn?.classList.add('loading');
            submitBtn?.setAttribute('disabled', 'true');
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'flex';
        } else {
            submitBtn?.classList.remove('loading');
            submitBtn?.removeAttribute('disabled');
            if (btnText) btnText.style.display = 'block';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    }

    // 🎉 SUCCESS FEEDBACK
    showSuccessFeedback(leadName) {
        const notification = document.getElementById('successNotification');
        const message = document.getElementById('successMessage');
        
        if (notification && message) {
            message.textContent = `${leadName} has been added to your pipeline!`;
            notification.style.display = 'flex';
            SteadyUtils.animateIn(notification, { duration: 600 });
            
            // Hide after 4 seconds
            setTimeout(() => {
                SteadyUtils.animateOut(notification, { 
                    duration: 300,
                    to: { opacity: 0, transform: 'translateY(-10px) scale(0.95)' }
                });
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 300);
            }, 4000);
        }
        
        // Also show a toast
        SteadyUtils.showToast(`🎉 ${leadName} added to pipeline!`, 'success', {
            duration: 3000
        });
    }

    // 🚨 ERROR FEEDBACK
    showErrorFeedback(message) {
        SteadyUtils.showToast(`❌ ${message}`, 'error', {
            duration: 5000
        });
    }

    // 🚫 LIMIT REACHED FEEDBACK
    showLimitReachedFeedback() {
        const submitBtn = document.getElementById('submitButton');
        const btnText = submitBtn?.querySelector('.button-text');
        
        if (btnText) {
            const originalText = btnText.textContent;
            btnText.textContent = 'Monthly limit reached!';
            submitBtn?.classList.add('limit-reached');
            
            // Shake the button
            SteadyUtils.shake(submitBtn);
            
            // Reset after 3 seconds
            setTimeout(() => {
                btnText.textContent = originalText;
                submitBtn?.classList.remove('limit-reached');
            }, 3000);
        }
        
        SteadyUtils.showToast('🚫 Monthly lead limit reached! Upgrade for more.', 'warning', {
            duration: 6000
        });
    }

    // 🧹 CLEAR FORM WITH STYLE
    clearFormWithStyle() {
        const form = document.getElementById('leadCreationForm');
        if (form) {
            // Clear form data
            form.reset();
            
            // Clear validation states
            this.clearAllErrors();
            
            // Re-focus on name field
            const nameInput = document.getElementById('leadName');
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 100);
            }
            
            // Show feedback
            SteadyUtils.showToast('Form cleared! 🧹', 'info', { duration: 2000 });
        }
    }

    // 🎬 SHOW INTERFACE WITH FLAIR
    showInterfaceWithFlair() {
        const container = document.querySelector('.goated-addlead-container');
        if (container) {
            // Animate the main container
            SteadyUtils.animateIn(container, { 
                duration: 600,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            });
            
            // Stagger animate the sections
            setTimeout(() => {
                SteadyUtils.animateInStagger('.progress-card, .form-card, .goals-card', {
                    staggerDelay: 150,
                    duration: 500
                });
            }, 200);
        }
    }

    // ❌ ERROR STATE
    showErrorState(message = 'Something went wrong') {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="error-state">
                <div class="error-icon">💥</div>
                <h2 class="error-title">Oops! Something went wrong</h2>
                <p class="error-message">${SteadyUtils.escapeHtml(message)}</p>
                <button onclick="location.reload()" class="retry-button">
                    🔄 Try Again
                </button>
            </div>
        `;
    }

    // 🎨 INJECT GOATED STYLES
    injectGoatedStyles() {
        if (document.getElementById('goatedAddLeadStyles')) return;

        const style = document.createElement('style');
        style.id = 'goatedAddLeadStyles';
        style.textContent = `
            /* 🚀 GOATED ADDLEAD STYLES - PIPELINE FEEDER EDITION */
            .goated-addlead-container {
                max-width: 1000px;
                margin: 0 auto;
                padding: 2rem;
                display: flex;
                flex-direction: column;
                gap: 2rem;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            /* 📊 PROGRESS SECTION */
            .progress-section {
                margin-bottom: 1rem;
            }

            .progress-card {
                background: var(--surface);
                border: 2px solid var(--border);
                border-radius: var(--radius-lg);
                padding: 2rem;
                box-shadow: var(--shadow);
                position: relative;
                overflow: hidden;
            }

            .progress-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: var(--gradient-primary);
                opacity: 0.8;
            }

            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }

            .progress-title {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .title-text {
                font-size: 1.5rem;
                font-weight: 800;
                background: var(--gradient-primary);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                color: var(--text-primary); /* Fallback */
            }

            [data-theme="dark"] .title-text {
                background: none;
                -webkit-background-clip: unset;
                -webkit-text-fill-color: unset;
                background-clip: unset;
                color: white;
            }

            .title-emoji {
                font-size: 1.5rem;
                animation: pulse 2s infinite;
            }

            .limit-counter {
                display: flex;
                align-items: baseline;
                gap: 0.25rem;
                font-weight: 700;
            }

            .current-number {
                font-size: 2rem;
                color: var(--primary);
                font-weight: 900;
            }

            .limit-separator {
                font-size: 1.5rem;
                color: var(--text-tertiary);
                margin: 0 0.25rem;
            }

            .limit-number {
                font-size: 1.5rem;
                color: var(--text-secondary);
            }

            .limit-text {
                font-size: 1rem;
                color: var(--text-tertiary);
                margin-left: 0.5rem;
            }

            .progress-bar-container {
                margin-top: 1rem;
            }

            .progress-bar {
                width: 100%;
                height: 12px;
                background: var(--border);
                border-radius: 9999px;
                overflow: hidden;
                position: relative;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .progress-fill {
                height: 100%;
                background: var(--gradient-primary);
                border-radius: 9999px;
                transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
                width: 0%;
                position: relative;
                overflow: hidden;
            }

            .progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255, 255, 255, 0.6) 50%, 
                    transparent 100%
                );
                animation: shimmer 2s infinite;
                transform: translateX(-100%);
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            /* 📝 FORM SECTION */
            .form-section {
                margin-bottom: 1rem;
            }

            .form-card {
                background: var(--surface);
                border: 2px solid var(--border);
                border-radius: var(--radius-lg);
                overflow: hidden;
                box-shadow: var(--shadow);
                transition: var(--transition);
            }

            .form-card:hover {
                box-shadow: var(--shadow-lg);
            }

            .form-header {
                background: linear-gradient(135deg, var(--surface) 0%, var(--surface-hover) 100%);
                padding: 2rem 2rem 1.5rem;
                border-bottom: 1px solid var(--border);
            }

            .form-title {
                font-size: 1.75rem;
                font-weight: 800;
                color: var(--text-primary);
                margin: 0 0 0.5rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .form-subtitle {
                color: var(--text-secondary);
                font-size: 1rem;
                margin: 0;
            }

            .lead-form {
                padding: 2rem;
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1.5rem;
                margin-bottom: 1.5rem;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .form-label {
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 0.25rem;
            }

            .form-input,
            .form-select,
            .form-textarea {
                width: 100%;
                padding: 1rem 1.25rem;
                border: 2px solid var(--border);
                border-radius: var(--radius);
                font-size: 1rem;
                background: var(--surface);
                color: var(--text-primary);
                transition: var(--transition);
                outline: none;
                font-family: inherit;
            }

            .form-input:focus,
            .form-select:focus,
            .form-textarea:focus {
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
                transform: translateY(-1px);
            }

            .form-input.error,
            .form-select.error,
            .form-textarea.error {
                border-color: var(--danger);
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
            }

            .form-select {
                cursor: pointer;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
                background-position: right 0.75rem center;
                background-repeat: no-repeat;
                background-size: 1.5em 1.5em;
                padding-right: 2.5rem;
            }

            .form-textarea {
                resize: vertical;
                min-height: 100px;
                font-family: inherit;
            }

            .field-error {
                font-size: 0.8rem;
                color: var(--danger);
                font-weight: 500;
                min-height: 20px;
                margin-top: 0.25rem;
            }

            /* 🎯 FORM ACTIONS */
            .form-actions {
                display: flex;
                gap: 1rem;
                margin-top: 2rem;
                padding-top: 1.5rem;
                border-top: 1px solid var(--border);
            }

            .submit-button {
                flex: 2;
                background: var(--gradient-primary);
                color: white;
                border: none;
                padding: 1.25rem 2rem;
                border-radius: var(--radius);
                font-size: 1.1rem;
                font-weight: 700;
                cursor: pointer;
                transition: var(--transition);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                box-shadow: var(--shadow);
                position: relative;
                overflow: hidden;
            }

            .submit-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s;
            }

            .submit-button:hover::before {
                left: 100%;
            }

            .submit-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 30px rgba(102, 126, 234, 0.4);
            }

            .submit-button:disabled {
                opacity: 0.8;
                cursor: not-allowed;
                transform: none;
            }

            .submit-button.limit-reached {
                background: var(--danger);
                animation: shake 0.6s ease-in-out;
            }

            .clear-button {
                flex: 1;
                background: var(--surface-hover);
                color: var(--text-primary);
                border: 2px solid var(--border);
                padding: 1.25rem 1.5rem;
                border-radius: var(--radius);
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: var(--transition);
            }

            .clear-button:hover {
                border-color: var(--primary);
                background: var(--primary);
                color: white;
                transform: translateY(-1px);
            }

            .loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }

            /* 🎉 SUCCESS NOTIFICATION */
            .success-notification {
                display: none;
                align-items: center;
                gap: 1rem;
                padding: 1.5rem;
                background: rgba(16, 185, 129, 0.1);
                border: 2px solid var(--success);
                border-radius: var(--radius);
                margin-top: 1.5rem;
                animation: successPulse 0.6s ease-out;
            }

            .success-icon {
                font-size: 2rem;
                flex-shrink: 0;
                animation: bounce 0.6s ease-out;
            }

            .success-content {
                flex: 1;
            }

            .success-title {
                font-size: 1.1rem;
                font-weight: 700;
                color: var(--success);
                margin-bottom: 0.25rem;
            }

            .success-message {
                font-size: 0.9rem;
                color: var(--text-secondary);
            }

            @keyframes successPulse {
                0% { transform: scale(0.95); opacity: 0; }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); opacity: 1; }
            }

            @keyframes bounce {
                0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
                40%, 43% { transform: translate3d(0,-10px,0); }
                70% { transform: translate3d(0,-5px,0); }
                90% { transform: translate3d(0,-2px,0); }
            }

            /* 🎯 GOALS SECTION */
            .goals-section {
                margin-bottom: 1rem;
            }

            .goals-card {
                background: var(--surface);
                border: 2px solid var(--border);
                border-radius: var(--radius-lg);
                padding: 2rem;
                box-shadow: var(--shadow);
            }

            .goals-header {
                margin-bottom: 1.5rem;
                text-align: center;
            }

            .goals-title {
                font-size: 1.3rem;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }

            .goals-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 2rem;
            }

            .goal-stat {
                text-align: center;
                padding: 1.5rem 1rem;
                background: var(--surface-hover);
                border-radius: var(--radius);
                transition: var(--transition);
                position: relative;
                overflow: hidden;
            }

            .goal-stat::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: var(--gradient-primary);
                opacity: 0.6;
            }

            .goal-stat:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow);
            }

            .goal-label {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-secondary);
                margin-bottom: 1rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .goal-numbers {
                display: flex;
                align-items: baseline;
                justify-content: center;
                gap: 0.25rem;
                margin-bottom: 1rem;
            }

            .goal-current {
                font-size: 2rem;
                font-weight: 900;
                color: var(--primary);
                line-height: 1;
            }

            .goal-divider {
                font-size: 1.5rem;
                color: var(--text-tertiary);
                font-weight: 600;
            }

            .goal-target {
                font-size: 1.5rem;
                color: var(--text-secondary);
                font-weight: 600;
            }

            .goal-progress {
                margin-top: 1rem;
            }

            .mini-progress-bar {
                width: 100%;
                height: 6px;
                background: var(--border);
                border-radius: 9999px;
                overflow: hidden;
            }

            .mini-progress-fill {
                height: 100%;
                background: var(--gradient-primary);
                border-radius: 9999px;
                transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                width: 0%;
            }

            /* ❌ ERROR STATE */
            .error-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                text-align: center;
                padding: 3rem;
                background: var(--surface);
                border-radius: var(--radius-lg);
                border: 2px solid var(--border);
                box-shadow: var(--shadow);
            }

            .error-icon {
                font-size: 4rem;
                margin-bottom: 1.5rem;
                animation: errorShake 1s ease-in-out;
            }

            .error-title {
                color: var(--danger);
                margin-bottom: 1rem;
                font-size: 1.75rem;
                font-weight: 700;
            }

            .error-message {
                color: var(--text-secondary);
                margin-bottom: 2rem;
                max-width: 400px;
                line-height: 1.6;
                font-size: 1rem;
            }

            .retry-button {
                background: var(--primary);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: var(--radius);
                font-weight: 600;
                cursor: pointer;
                transition: var(--transition);
                font-size: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .retry-button:hover {
                background: var(--primary-dark);
                transform: translateY(-2px);
                box-shadow: var(--shadow);
            }

            @keyframes errorShake {
                0%, 100% { transform: rotate(0deg); }
                10%, 30%, 50%, 70%, 90% { transform: rotate(-2deg); }
                20%, 40%, 60%, 80% { transform: rotate(2deg); }
            }

            /* 📱 RESPONSIVE DESIGN */
            @media (max-width: 768px) {
                .goated-addlead-container {
                    padding: 1rem;
                    gap: 1.5rem;
                }

                .progress-card,
                .form-card,
                .goals-card {
                    padding: 1.5rem;
                }

                .progress-header {
                    flex-direction: column;
                    gap: 1rem;
                    align-items: flex-start;
                }

                .limit-counter {
                    align-self: flex-end;
                }

                .form-row {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .goals-grid {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .form-actions {
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .submit-button,
                .clear-button {
                    flex: none;
                }

                .current-number {
                    font-size: 1.75rem;
                }

                .title-text {
                    font-size: 1.25rem;
                }
            }

            @media (max-width: 480px) {
                .goated-addlead-container {
                    padding: 0.75rem;
                }

                .progress-card,
                .form-card,
                .goals-card {
                    padding: 1.25rem;
                }

                .form-header {
                    padding: 1.5rem 1.25rem 1rem;
                }

                .lead-form {
                    padding: 1.25rem;
                }
            }

            /* 🌙 DARK MODE ENHANCEMENTS */
            [data-theme="dark"] .progress-card,
            [data-theme="dark"] .form-card,
            [data-theme="dark"] .goals-card {
                background: var(--surface);
                border-color: var(--border);
            }

            [data-theme="dark"] .form-input,
            [data-theme="dark"] .form-select,
            [data-theme="dark"] .form-textarea {
                background: var(--surface);
                border-color: var(--border);
                color: var(--text-primary);
            }

            [data-theme="dark"] .goal-stat {
                background: var(--surface);
            }

            [data-theme="dark"] .form-header {
                background: linear-gradient(135deg, var(--surface) 0%, var(--surface-hover) 100%);
            }

            /* 🎯 ACCESSIBILITY IMPROVEMENTS */
            .form-input:focus-visible,
            .form-select:focus-visible,
            .form-textarea:focus-visible,
            .submit-button:focus-visible,
            .clear-button:focus-visible {
                outline: 2px solid var(--primary);
                outline-offset: 2px;
            }

            @media (prefers-reduced-motion: reduce) {
                * {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }

            /* 🔥 PERFORMANCE OPTIMIZATIONS */
            .progress-fill,
            .mini-progress-fill {
                will-change: width;
            }

            .submit-button,
            .clear-button,
            .goal-stat {
                will-change: transform;
            }
        `;

        document.head.appendChild(style);
        console.log('🎨 Goated styles injected - looking absolutely fresh!');
    }

    // 🧹 CLEANUP METHOD
    destroy() {
        // Remove styles
        const styles = document.getElementById('goatedAddLeadStyles');
        if (styles) {
            styles.remove();
        }

        // Cancel debounced validation
        if (this.debouncedValidation?.cancel) {
            this.debouncedValidation.cancel();
        }

        console.log('🧹 AddLead module cleaned up');
    }

    // 🌍 PUBLIC API METHODS
    async refresh() {
        await this.loadUserData();
        this.updateAllDisplays();
    }

    getState() {
        return { ...this.state };
    }

    getFormData() {
        return this.collectFormData();
    }

    clearForm() {
        this.clearFormWithStyle();
    }
}

// 🌍 EXPORT FOR SHELL - GOATED EDITION
window.AddLeadModule = {
    init: async function() {
        try {
            console.log('🚀 Goated AddLead module initializing...');
            const addLead = new GoatedAddLeadController();
            await addLead.init();
            
            // Store global reference
            window.addLeadInstance = addLead;
            
            console.log('✅ AddLead module ready to feed the pipeline!');
            return addLead;
        } catch (error) {
            console.error('❌ Failed to initialize AddLead module:', error);
            return null;
        }
    },

    // Public methods for other modules
    refresh: () => window.addLeadInstance?.refresh(),
    getState: () => window.addLeadInstance?.getState(),
    clearForm: () => window.addLeadInstance?.clearForm()
};

// 🎯 DEBUG HELPERS (Development only)
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
    window.addLeadDebug = {
        instance: () => window.addLeadInstance,
        state: () => window.addLeadInstance?.getState(),
        refresh: () => window.addLeadInstance?.refresh(),
        clear: () => window.addLeadInstance?.clearForm(),
        formData: () => window.addLeadInstance?.getFormData(),
        test: () => {
            console.log('🔍 AddLead Debug Info:');
            console.log('- Instance:', !!window.addLeadInstance);
            console.log('- API Available:', !!window.API);
            console.log('- SteadyUtils Available:', !!window.SteadyUtils);
            console.log('- Current State:', window.addLeadInstance?.getState());
        }
    };
}

console.log('🚀 GOATED ADDLEAD MODULE LOADED - PIPELINE FEEDER EDITION!');
console.log('✨ Features: Isolated Design, Real-time Validation, Pipeline Integration');
console.log('🎯 Ready to feed fresh leads to your Pipeline system!');

/**
 * 🎯 WHAT THIS GOATED MODULE DOES:
 * 
 * ✅ COMPLETELY ISOLATED - Doesn't touch shell/header
 * ✅ PIPELINE READY - Sends leads as "New Lead" status
 * ✅ REAL-TIME VALIDATION - Uses SteadyUtils for smooth UX
 * ✅ API INTEGRATED - Uses your legendary API.js
 * ✅ PROGRESS TRACKING - Shows animated goal progress
 * ✅ MOBILE RESPONSIVE - Works on all devices
 * ✅ THEME AWARE - Dark/light mode support
 * ✅ ERROR HANDLING - Bulletproof error states
 * ✅ SUCCESS FEEDBACK - Beautiful success animations
 * ✅ FORM MANAGEMENT - Smart validation & clearing
 * 
 * 🔥 PIPELINE INTEGRATION:
 * 
 * ✅ Creates leads via API.createLead()
 * ✅ Sets status to "New Lead" for pipeline
 * ✅ Emits 'addlead:success' event for Pipeline module
 * ✅ Calculates lead quality score automatically
 * ✅ Handles form clearing after successful creation
 * 
 * 🚀 READY TO ROCK! 
 * 
 * Just drop this in /dashboard/tiers/free/scripts/AddLead.js
 * Your shell will load it when user clicks "Leads" nav!
 * 
 * The Pipeline module can listen for 'addlead:success' events
 * to instantly show new leads in the pipeline view!
 */