/**
 * SteadyManager - Settings Modal Component
 * Integrates perfectly with your existing utils system
 * Call from any page with: utils.openSettingsModal()
 */

class SettingsModal {
    constructor() {
        this.currentTab = 'profile';
        this.modal = null;
        this.userData = null;
        this.isDirty = false;
        this.init();
    }

    init() {
        // Add to utils for global access
        if (window.utils) {
            window.utils.openSettingsModal = () => this.open();
            window.utils.closeSettingsModal = () => this.close();
        }
        
        console.log('⚙️ Settings Modal Component - Ready');
    }

    /**
     * Open settings modal
     */
    async open() {
        try {
            // Load user data first
            await this.loadUserData();
            
            // Create modal using your existing system
            this.modal = this.createSettingsModal();
            
            // Initialize tabs and form handlers
            this.initializeTabs();
            this.initializeFormHandlers();
            this.initializeThemeHandlers();
            
            // Animate in
            utils.animateIn(this.modal.element);
            
            // Track opening
            utils.trackEvent('settings_opened');
            
        } catch (error) {
            console.error('Settings modal error:', error);
            utils.showToast('Failed to load settings', 'error');
        }
    }

    /**
     * Close settings modal
     */
    close() {
        if (!this.modal) return;
        
        // Check for unsaved changes
        if (this.isDirty) {
            const confirmClose = confirm('You have unsaved changes. Are you sure you want to close?');
            if (!confirmClose) return;
        }
        
        // Animate out and close
        utils.animateOut(this.modal.element, { remove: true });
        this.modal = null;
        this.isDirty = false;
        
        utils.trackEvent('settings_closed');
    }

    /**
     * Load user data from API
     */
    async loadUserData() {
        try {
            const response = await fetch('/api/user/settings', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load user data');
            }
            
            this.userData = await response.json();
            console.log('📊 User data loaded:', this.userData);
            
        } catch (error) {
            console.error('Load user data error:', error);
            throw error;
        }
    }

    /**
     * Create settings modal using your existing utils system
     */
    createSettingsModal() {
        const modalContent = document.createElement('div');
        modalContent.innerHTML = this.getSettingsHTML();
        
        return utils.createModal('Settings', modalContent, {
            size: 'large',
            closeOnBackdrop: false,
            showClose: true,
            onClose: () => this.close()
        });
    }

    /**
     * Get settings modal HTML
     */
    getSettingsHTML() {
        return `
            <div class="settings-container">
                <!-- Settings Navigation -->
                <div class="settings-nav">
                    <button class="settings-tab active" data-tab="profile">
                        <i data-lucide="user"></i>
                        <span>Profile</span>
                    </button>
                    <button class="settings-tab" data-tab="goals">
                        <i data-lucide="target"></i>
                        <span>Goals</span>
                    </button>
                    <button class="settings-tab" data-tab="appearance">
                        <i data-lucide="palette"></i>
                        <span>Appearance</span>
                    </button>
                    <button class="settings-tab" data-tab="account">
                        <i data-lucide="settings"></i>
                        <span>Account</span>
                    </button>
                    <button class="settings-tab" data-tab="billing">
                        <i data-lucide="credit-card"></i>
                        <span>Billing</span>
                    </button>
                </div>

                <!-- Settings Content -->
                <div class="settings-content">
                    ${this.getTabContent('profile')}
                    ${this.getTabContent('goals')}
                    ${this.getTabContent('appearance')}
                    ${this.getTabContent('account')}
                    ${this.getTabContent('billing')}
                </div>

                <!-- Settings Footer -->
                <div class="settings-footer">
                    <div class="settings-footer-left">
                        <span class="settings-tier-badge">FREE TIER</span>
                    </div>
                    <div class="settings-footer-right">
                        <button class="btn-secondary" onclick="utils.closeSettingsModal()">
                            Cancel
                        </button>
                        <button class="btn-primary" onclick="settingsModal.saveSettings()">
                            <i data-lucide="check"></i>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get content for specific tab
     */
    getTabContent(tab) {
        const userData = this.userData || {};
        
        const content = {
            profile: `
                <div class="settings-tab-content" data-tab="profile">
                    <div class="settings-section">
                        <h3>Profile Information</h3>
                        <p class="settings-description">Update your personal information and profile details.</p>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="firstName">First Name</label>
                                <input type="text" id="firstName" name="firstName" 
                                       value="${userData.firstName || ''}" 
                                       placeholder="Enter your first name">
                            </div>
                            
                            <div class="form-group">
                                <label for="lastName">Last Name</label>
                                <input type="text" id="lastName" name="lastName" 
                                       value="${userData.lastName || ''}" 
                                       placeholder="Enter your last name">
                            </div>
                            
                            <div class="form-group form-group-full">
                                <label for="email">Email Address</label>
                                <input type="email" id="email" name="email" 
                                       value="${userData.email || ''}" 
                                       placeholder="your@email.com" readonly>
                                <small class="form-help">Email cannot be changed. Contact support if needed.</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="company">Company Name</label>
                                <input type="text" id="company" name="company" 
                                       value="${userData.companyName || ''}" 
                                       placeholder="Your company">
                            </div>
                            
                            <div class="form-group">
                                <label for="phone">Phone Number</label>
                                <input type="tel" id="phone" name="phone" 
                                       value="${userData.phone || ''}" 
                                       placeholder="+1 (555) 123-4567">
                            </div>
                        </div>
                    </div>
                </div>
            `,
            
            goals: `
                <div class="settings-tab-content hidden" data-tab="goals">
                    <div class="settings-section">
                        <h3>Lead Goals</h3>
                        <p class="settings-description">Set your daily and monthly lead generation targets.</p>
                        
                        <div class="goals-grid">
                            <div class="goal-card">
                                <div class="goal-icon">
                                    <i data-lucide="calendar"></i>
                                </div>
                                <div class="goal-content">
                                    <label for="dailyGoal">Daily Goal</label>
                                    <input type="number" id="dailyGoal" name="dailyGoal" 
                                           value="${userData.goals?.daily || 5}" 
                                           min="1" max="100">
                                    <small>Leads per day</small>
                                </div>
                            </div>
                            
                            <div class="goal-card">
                                <div class="goal-icon">
                                    <i data-lucide="target"></i>
                                </div>
                                <div class="goal-content">
                                    <label for="monthlyGoal">Monthly Goal</label>
                                    <input type="number" id="monthlyGoal" name="monthlyGoal" 
                                           value="${userData.goals?.monthly || 50}" 
                                           min="1" max="${userData.monthlyLeadLimit || 50}">
                                    <small>Leads per month (max: ${userData.monthlyLeadLimit || 50})</small>
                                </div>
                            </div>
                            
                            <div class="goal-card">
                                <div class="goal-icon">
                                    <i data-lucide="dollar-sign"></i>
                                </div>
                                <div class="goal-content">
                                    <label for="revenueGoal">Revenue Goal</label>
                                    <input type="number" id="revenueGoal" name="revenueGoal" 
                                           value="${userData.goals?.revenue || 10000}" 
                                           min="0" step="100">
                                    <small>Monthly revenue target</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="goal-progress">
                            <h4>Current Progress</h4>
                            <div class="progress-item">
                                <span>Leads this month</span>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${Math.min((userData.currentMonthLeads || 0) / (userData.goals?.monthly || 50) * 100, 100)}%"></div>
                                </div>
                                <span>${userData.currentMonthLeads || 0}/${userData.goals?.monthly || 50}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            
            appearance: `
                <div class="settings-tab-content hidden" data-tab="appearance">
                    <div class="settings-section">
                        <h3>Appearance & Theme</h3>
                        <p class="settings-description">Customize how SteadyManager looks and feels.</p>
                        
                        <div class="appearance-options">
                            <div class="theme-selector">
                                <h4>Theme</h4>
                                <div class="theme-options">
                                    <button class="theme-option ${!utils.theme.isDark() ? 'active' : ''}" data-theme="light">
                                        <div class="theme-preview light-preview">
                                            <div class="theme-header"></div>
                                            <div class="theme-body">
                                                <div class="theme-sidebar"></div>
                                                <div class="theme-content"></div>
                                            </div>
                                        </div>
                                        <span>Light</span>
                                    </button>
                                    
                                    <button class="theme-option ${utils.theme.isDark() ? 'active' : ''}" data-theme="dark">
                                        <div class="theme-preview dark-preview">
                                            <div class="theme-header"></div>
                                            <div class="theme-body">
                                                <div class="theme-sidebar"></div>
                                                <div class="theme-content"></div>
                                            </div>
                                        </div>
                                        <span>Dark</span>
                                    </button>
                                    
                                    <button class="theme-option upgrade-theme" onclick="utils.showUpgradeModal('appearance')">
                                        <div class="theme-preview auto-preview">
                                            <div class="theme-header"></div>
                                            <div class="theme-body">
                                                <div class="theme-sidebar"></div>
                                                <div class="theme-content"></div>
                                            </div>
                                            <div class="theme-upgrade">
                                                <i data-lucide="crown"></i>
                                            </div>
                                        </div>
                                        <span>Auto <i data-lucide="crown"></i></span>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="notification-settings">
                                <h4>Notifications</h4>
                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label>Desktop Notifications</label>
                                        <p>Get notified when leads require follow-up</p>
                                    </div>
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="desktopNotifications" 
                                               ${userData.settings?.notifications !== false ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                
                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label>Sound Effects</label>
                                        <p>Play sounds for actions and notifications</p>
                                    </div>
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="soundEffects" 
                                               ${userData.settings?.sounds !== false ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            
            account: `
                <div class="settings-tab-content hidden" data-tab="account">
                    <div class="settings-section">
                        <h3>Account Information</h3>
                        <p class="settings-description">Manage your account settings and preferences.</p>
                        
                        <div class="account-info">
                            <div class="info-item">
                                <label>Account Type</label>
                                <div class="account-tier">
                                    <span class="tier-badge tier-${userData.subscriptionTier?.toLowerCase()}">${userData.subscriptionTier || 'FREE'}</span>
                                    ${userData.subscriptionTier === 'FREE' ? '<button class="upgrade-btn" onclick="utils.showUpgradeModal(\'account\')">Upgrade</button>' : ''}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <label>Member Since</label>
                                <span>${utils.formatDate(userData.createdAt, 'long')}</span>
                            </div>
                            
                            <div class="info-item">
                                <label>Lead Usage</label>
                                <div class="usage-info">
                                    <span>${userData.currentMonthLeads || 0} / ${userData.monthlyLeadLimit || 50} leads used this month</span>
                                    <div class="usage-bar">
                                        <div class="usage-fill" style="width: ${Math.min((userData.currentMonthLeads || 0) / (userData.monthlyLeadLimit || 50) * 100, 100)}%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="account-actions">
                            <h4>Account Actions</h4>
                            
                            <div class="action-item">
                                <div class="action-info">
                                    <label>Change Password</label>
                                    <p>Update your account password for security</p>
                                </div>
                                <button class="btn-secondary" onclick="settingsModal.changePassword()">
                                    <i data-lucide="lock"></i>
                                    Change Password
                                </button>
                            </div>
                            
                            <div class="action-item">
                                <div class="action-info">
                                    <label>Export Data</label>
                                    <p>Download your leads and data</p>
                                </div>
                                <button class="btn-secondary" onclick="settingsModal.exportData()">
                                    <i data-lucide="download"></i>
                                    Export Data
                                </button>
                            </div>
                            
                            <div class="action-item danger">
                                <div class="action-info">
                                    <label>Delete Account</label>
                                    <p>Permanently delete your account and all data</p>
                                </div>
                                <button class="btn-danger" onclick="settingsModal.deleteAccount()">
                                    <i data-lucide="trash-2"></i>
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            
            billing: `
                <div class="settings-tab-content hidden" data-tab="billing">
                    <div class="settings-section">
                        <h3>Billing & Subscription</h3>
                        <p class="settings-description">Manage your subscription and billing information.</p>
                        
                        <div class="billing-overview">
                            <div class="current-plan">
                                <h4>Current Plan</h4>
                                <div class="plan-card">
                                    <div class="plan-info">
                                        <span class="plan-name">${userData.subscriptionTier || 'Free'}</span>
                                        <span class="plan-price">${userData.subscriptionTier === 'FREE' ? '$0/month' : 'Paid Plan'}</span>
                                    </div>
                                    <div class="plan-features">
                                        <div class="feature-item">
                                            <i data-lucide="check"></i>
                                            <span>${userData.monthlyLeadLimit || 50} leads per month</span>
                                        </div>
                                        <div class="feature-item">
                                            <i data-lucide="check"></i>
                                            <span>Basic dashboard</span>
                                        </div>
                                        ${userData.subscriptionTier === 'FREE' ? `
                                            <div class="feature-item disabled">
                                                <i data-lucide="x"></i>
                                                <span>Advanced analytics</span>
                                            </div>
                                            <div class="feature-item disabled">
                                                <i data-lucide="x"></i>
                                                <span>AI insights</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            
                            ${userData.subscriptionTier === 'FREE' ? `
                                <div class="upgrade-section">
                                    <h4>Upgrade Your Plan</h4>
                                    <p>Unlock powerful features to grow your business faster.</p>
                                    
                                    <div class="plan-options">
                                        <div class="plan-option">
                                            <h5>Professional</h5>
                                            <div class="plan-price-large">$6.99<span>/month</span></div>
                                            <ul>
                                                <li>1,000 leads per month</li>
                                                <li>Advanced analytics</li>
                                                <li>Data export</li>
                                                <li>Email support</li>
                                            </ul>
                                            <button class="btn-primary" onclick="window.location.href='/auth/register?plan=professional_monthly'">
                                                Start Free Trial
                                            </button>
                                        </div>
                                        
                                        <div class="plan-option popular">
                                            <div class="popular-badge">Most Popular</div>
                                            <h5>Business</h5>
                                            <div class="plan-price-large">$19.99<span>/month</span></div>
                                            <ul>
                                                <li>10,000 leads per month</li>
                                                <li>AI insights & scoring</li>
                                                <li>Automation tools</li>
                                                <li>Priority support</li>
                                            </ul>
                                            <button class="btn-primary" onclick="window.location.href='/auth/register?plan=business_monthly'">
                                                Start Free Trial
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ` : `
                                <div class="billing-info">
                                    <h4>Billing Information</h4>
                                    <p>Manage your payment method and billing history.</p>
                                    
                                    <div class="billing-actions">
                                        <button class="btn-secondary">
                                            <i data-lucide="credit-card"></i>
                                            Update Payment Method
                                        </button>
                                        <button class="btn-secondary">
                                            <i data-lucide="receipt"></i>
                                            View Billing History
                                        </button>
                                        <button class="btn-secondary">
                                            <i data-lucide="download"></i>
                                            Download Invoice
                                        </button>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `
        };
        
        return content[tab] || '';
    }

    /**
     * Initialize tab switching
     */
    initializeTabs() {
        const tabs = this.modal.element.querySelectorAll('.settings-tab');
        const contents = this.modal.element.querySelectorAll('.settings-tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show target content
                contents.forEach(content => {
                    if (content.dataset.tab === targetTab) {
                        content.classList.remove('hidden');
                        utils.animateIn(content);
                    } else {
                        content.classList.add('hidden');
                    }
                });
                
                this.currentTab = targetTab;
                utils.trackEvent('settings_tab_changed', { tab: targetTab });
            });
        });
        
        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Initialize form handlers
     */
    initializeFormHandlers() {
        const form = this.modal.element.querySelector('.settings-container');
        
        // Track changes
        form.addEventListener('input', () => {
            this.isDirty = true;
        });
        
        // Validation
        const emailInput = form.querySelector('#email');
        const phoneInput = form.querySelector('#phone');
        
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && !utils.isPhone(value)) {
                    e.target.setCustomValidity('Please enter a valid phone number');
                } else {
                    e.target.setCustomValidity('');
                }
            });
        }
    }

    /**
     * Initialize theme handlers
     */
    initializeThemeHandlers() {
        const themeOptions = this.modal.element.querySelectorAll('.theme-option[data-theme]');
        
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                
                // Update active theme
                themeOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Apply theme
                utils.theme.set(theme);
                
                // Mark as dirty
                this.isDirty = true;
                
                // Show success
                utils.showToast(`${theme === 'dark' ? 'Dark' : 'Light'} theme applied! 🎨`, 'success');
                utils.trackEvent('theme_changed', { theme });
            });
        });
    }

    /**
     * Save all settings
     */
    async saveSettings() {
        try {
            const form = this.modal.element.querySelector('.settings-container');
            
            // Collect form data
            const formData = new FormData(form);
            const settings = {};
            const goals = {};
            
            // Profile data
            const profileData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                company: formData.get('company'),
                phone: formData.get('phone')
            };
            
            // Goals data
            goals.daily = parseInt(formData.get('dailyGoal')) || 5;
            goals.monthly = parseInt(formData.get('monthlyGoal')) || 50;
            goals.revenue = parseInt(formData.get('revenueGoal')) || 10000;
            
            // Settings data
            settings.notifications = form.querySelector('#desktopNotifications')?.checked !== false;
            settings.sounds = form.querySelector('#soundEffects')?.checked !== false;
            settings.darkMode = utils.theme.isDark();
            
            // Save to API
            const response = await fetch('/api/user/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...profileData,
                    goals,
                    settings
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save settings');
            }
            
            // Success feedback
            utils.showToast('Settings saved successfully! ✅', 'success');
            utils.pulse('.btn-primary');
            
            this.isDirty = false;
            
            // Close modal after short delay
            setTimeout(() => this.close(), 1500);
            
            utils.trackEvent('settings_saved', { tab: this.currentTab });
            
        } catch (error) {
            console.error('Save settings error:', error);
            utils.showToast('Failed to save settings', 'error');
        }
    }

    /**
     * Change password action
     */
    changePassword() {
        utils.showToast('Password change feature coming soon! 🔒', 'info');
        utils.trackEvent('change_password_clicked');
    }

    /**
     * Export data action
     */
    exportData() {
        utils.showToast('Data export feature coming soon! 📊', 'info');
        utils.trackEvent('export_data_clicked');
    }

    /**
     * Delete account action
     */
    deleteAccount() {
        const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
        if (confirmed) {
            utils.showToast('Account deletion feature coming soon. Contact support for assistance.', 'warning');
            utils.trackEvent('delete_account_clicked');
        }
    }
}

// Initialize settings modal
const settingsModal = new SettingsModal();

// Add settings modal styles
function addSettingsModalStyles() {
    if (document.getElementById('settings-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'settings-modal-styles';
    style.textContent = `
        /* Settings Modal Styles */
        .settings-container {
            display: flex;
            min-height: 500px;
            max-height: 80vh;
        }

        .settings-nav {
            flex: 0 0 200px;
            background: #f8fafc;
            border-right: 1px solid #e5e7eb;
            padding: 1rem 0;
        }

        .settings-tab {
            width: 100%;
            padding: 0.75rem 1rem;
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: #6b7280;
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }

        .settings-tab:hover {
            background: #f1f5f9;
            color: #374151;
        }

        .settings-tab.active {
            background: #3b82f6;
            color: white;
        }

        .settings-tab i {
            width: 16px;
            height: 16px;
        }

        .settings-content {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
        }

        .settings-tab-content.hidden {
            display: none;
        }

        .settings-section h3 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 0.5rem;
        }

        .settings-description {
            color: #6b7280;
            margin-bottom: 2rem;
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
        }

        .form-group-full {
            grid-column: span 2;
        }

        .form-group label {
            display: block;
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.5rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-help {
            display: block;
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.25rem;
        }

        .goals-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .goal-card {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
        }

        .goal-icon {
            width: 48px;
            height: 48px;
            margin: 0 auto 1rem;
            background: #3b82f6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .goal-content label {
            display: block;
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.5rem;
        }

        .goal-content input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 1.125rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 0.5rem;
        }

        .goal-content small {
            color: #6b7280;
            font-size: 0.75rem;
        }

        .goal-progress {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.5rem;
        }

        .goal-progress h4 {
            margin-bottom: 1rem;
            color: #374151;
        }

        .progress-item {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .progress-bar {
            flex: 1;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .appearance-options {
            space-y: 2rem;
        }

        .theme-selector h4 {
            margin-bottom: 1rem;
            color: #374151;
        }

        .theme-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .theme-option {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
        }

        .theme-option:hover {
            border-color: #3b82f6;
        }

        .theme-option.active {
            border-color: #3b82f6;
            background: #eff6ff;
        }

        .theme-preview {
            width: 60px;
            height: 40px;
            border-radius: 6px;
            margin: 0 auto 0.5rem;
            overflow: hidden;
            border: 1px solid #d1d5db;
        }

        .light-preview {
            background: white;
        }

        .light-preview .theme-header {
            height: 8px;
            background: #f3f4f6;
        }

        .light-preview .theme-body {
            display: flex;
            height: 32px;
        }

        .light-preview .theme-sidebar {
            width: 16px;
            background: #e5e7eb;
        }

        .light-preview .theme-content {
            flex: 1;
            background: white;
        }

        .dark-preview {
            background: #1f2937;
        }

        .dark-preview .theme-header {
            height: 8px;
            background: #374151;
        }

        .dark-preview .theme-body {
            display: flex;
            height: 32px;
        }

        .dark-preview .theme-sidebar {
            width: 16px;
            background: #4b5563;
        }

        .dark-preview .theme-content {
            flex: 1;
            background: #1f2937;
        }

        .auto-preview {
            background: linear-gradient(45deg, white 50%, #1f2937 50%);
            position: relative;
        }

        .theme-upgrade {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #8b5cf6;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .theme-upgrade i {
            width: 12px;
            height: 12px;
        }

        .upgrade-theme span {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-weight: 600;
            color: #8b5cf6;
        }

        .notification-settings {
            margin-top: 2rem;
        }

        .notification-settings h4 {
            margin-bottom: 1rem;
            color: #374151;
        }

        .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 0.75rem;
        }

        .setting-info label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.25rem;
        }

        .setting-info p {
            color: #6b7280;
            font-size: 0.875rem;
            margin: 0;
        }

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 48px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #cbd5e1;
            border-radius: 24px;
            transition: 0.3s;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            border-radius: 50%;
            transition: 0.3s;
        }

        input:checked + .slider {
            background-color: #3b82f6;
        }

        input:checked + .slider:before {
            transform: translateX(24px);
        }

        .account-info {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }

        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid #e5e7eb;
        }

        .info-item:last-child {
            border-bottom: none;
        }

        .info-item label {
            font-weight: 600;
            color: #374151;
        }

        .account-tier {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .tier-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .tier-badge.tier-free {
            background: #e5e7eb;
            color: #374151;
        }

        .tier-badge.tier-professional {
            background: #dbeafe;
            color: #1d4ed8;
        }

        .tier-badge.tier-business {
            background: #d1fae5;
            color: #059669;
        }

        .upgrade-btn {
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .upgrade-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .usage-info {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .usage-bar {
            width: 150px;
            height: 6px;
            background: #e5e7eb;
            border-radius: 3px;
            overflow: hidden;
        }

        .usage-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            border-radius: 3px;
            transition: width 0.3s ease;
        }

        .account-actions {
            margin-top: 2rem;
        }

        .account-actions h4 {
            margin-bottom: 1rem;
            color: #374151;
        }

        .action-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 0.75rem;
        }

        .action-item.danger {
            background: #fef2f2;
            border-color: #fecaca;
        }

        .action-info label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.25rem;
        }

        .action-info p {
            color: #6b7280;
            font-size: 0.875rem;
            margin: 0;
        }

        .btn-danger {
            padding: 0.75rem 1rem;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
        }

        .btn-danger:hover {
            background: #dc2626;
        }

        .billing-overview {
            space-y: 2rem;
        }

        .current-plan h4 {
            margin-bottom: 1rem;
            color: #374151;
        }

        .plan-card {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.5rem;
        }

        .plan-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .plan-name {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1f2937;
        }

        .plan-price {
            font-size: 1.125rem;
            font-weight: 600;
            color: #3b82f6;
        }

        .plan-features {
            space-y: 0.5rem;
        }

        .feature-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #374151;
        }

        .feature-item.disabled {
            color: #9ca3af;
        }

        .feature-item i {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        .upgrade-section {
            margin-top: 2rem;
        }

        .upgrade-section h4 {
            margin-bottom: 0.5rem;
            color: #374151;
        }

        .upgrade-section p {
            color: #6b7280;
            margin-bottom: 1.5rem;
        }

        .plan-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
        }

        .plan-option {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            position: relative;
        }

        .plan-option.popular {
            border-color: #3b82f6;
            transform: scale(1.05);
        }

        .popular-badge {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: #3b82f6;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .plan-option h5 {
            font-size: 1.125rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 0.5rem;
        }

        .plan-price-large {
            font-size: 2rem;
            font-weight: 700;
            color: #3b82f6;
            margin-bottom: 1rem;
        }

        .plan-price-large span {
            font-size: 0.875rem;
            color: #6b7280;
        }

        .plan-option ul {
            list-style: none;
            padding: 0;
            margin: 1rem 0;
            text-align: left;
        }

        .plan-option li {
            padding: 0.25rem 0;
            color: #374151;
            position: relative;
            padding-left: 1.5rem;
        }

        .plan-option li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
        }

        .billing-actions {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .settings-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 2rem;
            border-top: 1px solid #e5e7eb;
            background: #f8fafc;
        }

        .settings-tier-badge {
            padding: 0.5rem 1rem;
            background: #e5e7eb;
            color: #374151;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .settings-footer-right {
            display: flex;
            gap: 0.75rem;
        }

        .btn-secondary,
        .btn-primary {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
        }

        .btn-secondary {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
            background: #e5e7eb;
        }

        .btn-primary {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

        /* Dark mode settings styles */
        body.dark-mode .settings-nav {
            background: #1e293b;
            border-right-color: #334155;
        }

        body.dark-mode .settings-tab {
            color: #94a3b8;
        }

        body.dark-mode .settings-tab:hover {
            background: #334155;
            color: #e2e8f0;
        }

        body.dark-mode .settings-tab.active {
            background: #3b82f6;
            color: white;
        }

        body.dark-mode .settings-section h3 {
            color: #f1f5f9;
        }

        body.dark-mode .settings-description {
            color: #94a3b8;
        }

        body.dark-mode .form-group label {
            color: #cbd5e1;
        }

        body.dark-mode .form-group input,
        body.dark-mode .form-group select,
        body.dark-mode .form-group textarea {
            background: #334155;
            border-color: #475569;
            color: #e2e8f0;
        }

        body.dark-mode .form-group input:focus,
        body.dark-mode .form-group select:focus,
        body.dark-mode .form-group textarea:focus {
            border-color: #60a5fa;
            background: #1e293b;
        }

        body.dark-mode .goal-card {
            background: #334155;
            border-color: #475569;
        }

        body.dark-mode .goal-content label {
            color: #cbd5e1;
        }

        body.dark-mode .goal-progress {
            background: #334155;
            border-color: #475569;
        }

        body.dark-mode .account-info,
        body.dark-mode .setting-item,
        body.dark-mode .action-item,
        body.dark-mode .plan-card {
            background: #334155;
            border-color: #475569;
        }

        body.dark-mode .action-item.danger {
            background: #450a0a;
            border-color: #7f1d1d;
        }

        body.dark-mode .info-item label,
        body.dark-mode .action-info label,
        body.dark-mode .setting-info label {
            color: #cbd5e1;
        }

        body.dark-mode .settings-footer {
            background: #1e293b;
            border-top-color: #334155;
        }

        body.dark-mode .btn-secondary {
            background: #475569;
            color: #e2e8f0;
            border-color: #64748b;
        }

        body.dark-mode .btn-secondary:hover {
            background: #64748b;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
            .settings-container {
                flex-direction: column;
            }

            .settings-nav {
                flex: none;
                display: flex;
                overflow-x: auto;
                padding: 0.5rem;
                border-right: none;
                border-bottom: 1px solid #e5e7eb;
            }

            .settings-tab {
                flex: 0 0 auto;
                white-space: nowrap;
                margin-right: 0.5rem;
                border-radius: 8px;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }

            .goals-grid {
                grid-template-columns: 1fr;
            }

            .theme-options {
                grid-template-columns: repeat(2, 1fr);
            }

            .plan-options {
                grid-template-columns: 1fr;
            }

            .settings-footer {
                flex-direction: column;
                gap: 1rem;
            }

            .settings-footer-right {
                width: 100%;
            }

            .btn-secondary,
            .btn-primary {
                flex: 1;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize styles when script loads
addSettingsModalStyles();

console.log('⚙️ Settings Modal Component - Loaded & Ready!');
console.log('🔧 Usage: utils.openSettingsModal() from any page');
console.log('✨ Fully integrated with your existing utils system!');