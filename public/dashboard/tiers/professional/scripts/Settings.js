window.SettingsModule = {
    state: {
        profile: null,
        preferences: null,
        container: 'settings-content',
        currentTab: 'account'
    },

    async settings_init(targetContainer = 'settings-content') {
        console.log('Settings module loading');

        this.state.container = targetContainer;
        this.showLoading();

        try {
            // Load profile and preferences in parallel
            const [profile, preferences] = await Promise.all([
                API.getProfile(),
                API.getPreferences()
            ]);

            this.state.profile = profile;
            this.state.preferences = preferences;

            this.render();
            this.attachEvents();

            console.log('Settings module ready');

        } catch (error) {
            console.error('Settings init failed:', error);
            this.showError('Failed to load settings');
        }
    },

    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="settings-wrapper">
                ${this.renderTabs()}
                ${this.renderTabContent()}
            </div>
        `;

        // Fade in
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
        }, 50);
    },

    renderTabs() {
        return `
            <div class="settings-tabs">
                <button class="tab-btn ${this.state.currentTab === 'account' ? 'active' : ''}" data-tab="account">
                    <span class="tab-icon">👤</span>
                    <span class="tab-label">Account</span>
                </button>
                <button class="tab-btn ${this.state.currentTab === 'preferences' ? 'active' : ''}" data-tab="preferences">
                    <span class="tab-icon">⚙️</span>
                    <span class="tab-label">Preferences</span>
                </button>
                <button class="tab-btn ${this.state.currentTab === 'security' ? 'active' : ''}" data-tab="security">
                    <span class="tab-icon">🔐</span>
                    <span class="tab-label">Security & Data</span>
                </button>
            </div>
        `;
    },

    renderTabContent() {
        return `
            <div class="tab-content-wrapper">
                <div class="tab-content ${this.state.currentTab === 'account' ? 'active' : ''}" data-tab="account">
                    ${this.renderAccountTab()}
                </div>
                <div class="tab-content ${this.state.currentTab === 'preferences' ? 'active' : ''}" data-tab="preferences">
                    ${this.renderPreferencesTab()}
                </div>
                <div class="tab-content ${this.state.currentTab === 'security' ? 'active' : ''}" data-tab="security">
                    ${this.renderSecurityTab()}
                </div>
            </div>
        `;
    },

    renderAccountTab() {
        const { email, user_type, created_at, current_leads, current_lead_limit } = this.state.profile;

        const tierNames = {
            'free': 'Free Plan',
            'professional': 'Professional',
            'professional_trial': 'Pro Trial',
            'business': 'Business',
            'enterprise': 'Enterprise',
            'admin': 'Admin'
        };

        const tierColors = {
            'free': '#6b7280',
            'professional': '#10b981',
            'professional_trial': '#f59e0b',
            'business': '#8b5cf6',
            'enterprise': '#667eea',
            'admin': '#ef4444'
        };

        const tierName = tierNames[user_type] || 'Free Plan';
        const tierColor = tierColors[user_type] || '#6b7280';
        const memberSince = this.formatDate(created_at);
        const leadsUsed = current_leads || 0;
        const leadsLimit = current_lead_limit || 50;
        const leadsPercentage = Math.round((leadsUsed / leadsLimit) * 100);

        return `
            <div class="settings-section">
                <h2 class="section-title">Account Information</h2>

                <div class="info-card">
                    <div class="info-row">
                        <span class="info-label">Email Address</span>
                        <span class="info-value">${API.escapeHtml(email)}</span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Current Plan</span>
                        <span class="plan-badge" style="background: ${tierColor}">${tierName}</span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Member Since</span>
                        <span class="info-value">${memberSince}</span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Lead Usage</span>
                        <span class="info-value">${leadsUsed} / ${leadsLimit}</span>
                    </div>

                    <div class="usage-bar-wrapper">
                        <div class="usage-bar">
                            <div class="usage-bar-fill" style="width: ${leadsPercentage}%; background: ${tierColor}"></div>
                        </div>
                        <div class="usage-label">${leadsPercentage}% used</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderPreferencesTab() {
        const prefs = this.state.preferences;
        const currentTheme = prefs.theme || 'light';
        const defaultView = prefs.default_view || 'dashboard';
        const windowingEnabled = prefs.windowing_enabled || false;

        return `
            <div class="settings-section">
                <h2 class="section-title">Preferences</h2>
                <p class="section-description">Customize your SteadyManager experience. Changes save automatically.</p>

                <!-- Theme Selection -->
                <div class="pref-card">
                    <div class="pref-header">
                        <div class="pref-icon">🎨</div>
                        <div class="pref-info">
                            <h3 class="pref-title">Theme</h3>
                            <p class="pref-description">Choose your preferred color scheme</p>
                        </div>
                    </div>
                    <div class="pref-control">
                        <div class="theme-selector">
                            <label class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">
                                <input type="radio" name="theme" value="light" ${currentTheme === 'light' ? 'checked' : ''}>
                                <span class="theme-icon">☀️</span>
                                <span class="theme-name">Light</span>
                            </label>

                            <label class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
                                <input type="radio" name="theme" value="dark" ${currentTheme === 'dark' ? 'checked' : ''}>
                                <span class="theme-icon">🌙</span>
                                <span class="theme-name">Dark</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Default View -->
                <div class="pref-card">
                    <div class="pref-header">
                        <div class="pref-icon">🏠</div>
                        <div class="pref-info">
                            <h3 class="pref-title">Default View</h3>
                            <p class="pref-description">Choose which page loads when you log in</p>
                        </div>
                    </div>
                    <div class="pref-control">
                        <select id="default-view-select" class="pref-select">
                            <option value="dashboard" ${defaultView === 'dashboard' ? 'selected' : ''}>📊 Dashboard</option>
                            <option value="pipeline" ${defaultView === 'pipeline' ? 'selected' : ''}>🌿 Pipeline</option>
                            <option value="tasks" ${defaultView === 'tasks' ? 'selected' : ''}>📋 Tasks</option>
                            <option value="jobs" ${defaultView === 'jobs' ? 'selected' : ''}>💼 Jobs</option>
                            <option value="goals" ${defaultView === 'goals' ? 'selected' : ''}>🎯 Goals</option>
                        </select>
                    </div>
                </div>

                <!-- Windowing System -->
                <div class="pref-card">
                    <div class="pref-header">
                        <div class="pref-icon">🪟</div>
                        <div class="pref-info">
                            <h3 class="pref-title">Windowing System</h3>
                            <p class="pref-description">Enable draggable windows for modals (experimental)</p>
                        </div>
                    </div>
                    <div class="pref-control">
                        <label class="toggle-label">
                            <input type="checkbox" id="windowing-toggle" class="toggle-input" ${windowingEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            <span class="toggle-text">${windowingEnabled ? 'Enabled' : 'Disabled'}</span>
                        </label>
                    </div>
                </div>

                <div class="auto-save-indicator">
                    <span class="save-icon">💾</span>
                    <span>All changes save automatically</span>
                </div>
            </div>
        `;
    },

    renderSecurityTab() {
        return `
            <div class="settings-section">
                <h2 class="section-title">Security & Data</h2>

                <!-- Security -->
                <div class="settings-card">
                    <div class="card-header-simple">
                        <div class="card-icon">🔐</div>
                        <h3 class="card-title-simple">Security</h3>
                    </div>
                    <div class="card-body">
                        <div class="security-item">
                            <div class="security-info">
                                <div class="security-label">Password</div>
                                <div class="security-description">Change your account password</div>
                            </div>
                            <button class="btn-secondary" onclick="SettingsModule.changePassword()">
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Export Data -->
                <div class="settings-card">
                    <div class="card-header-simple">
                        <div class="card-icon">📊</div>
                        <h3 class="card-title-simple">Export Data</h3>
                    </div>
                    <div class="card-body">
                        <div class="export-description">
                            Download your data as CSV files for backup or analysis
                        </div>
                        <div class="export-buttons">
                            <button class="btn-export" onclick="SettingsModule.exportLeads()">
                                <span class="export-icon">📥</span>
                                <span>Export Leads</span>
                            </button>
                            <button class="btn-export" onclick="SettingsModule.exportTasks()">
                                <span class="export-icon">📥</span>
                                <span>Export Tasks</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="settings-card danger-card">
                    <div class="card-header-simple">
                        <div class="card-icon">🗑️</div>
                        <h3 class="card-title-simple">Danger Zone</h3>
                    </div>
                    <div class="card-body">
                        <div class="danger-description">
                            ⚠️ Permanently delete your account and all associated data
                        </div>
                        <button class="btn-danger" onclick="SettingsModule.deleteAccount()">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Theme toggle - auto-save
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', async (e) => {
                const theme = option.dataset.theme;
                await this.updatePreference('theme', theme);
            });
        });

        // Default view - auto-save
        const defaultViewSelect = document.getElementById('default-view-select');
        if (defaultViewSelect) {
            defaultViewSelect.addEventListener('change', async (e) => {
                await this.updatePreference('default_view', e.target.value);
            });
        }

        // Windowing toggle - auto-save
        const windowingToggle = document.getElementById('windowing-toggle');
        if (windowingToggle) {
            windowingToggle.addEventListener('change', async (e) => {
                await this.updatePreference('windowing_enabled', e.target.checked);

                // Update toggle text
                const toggleText = e.target.parentElement.querySelector('.toggle-text');
                if (toggleText) {
                    toggleText.textContent = e.target.checked ? 'Enabled' : 'Disabled';
                }
            });
        }
    },

    async updatePreference(key, value) {
        try {
            // Update local state
            this.state.preferences[key] = value;

            // Save to Supabase
            await API.updatePreferences(this.state.preferences);

            // Apply theme immediately if changed
            if (key === 'theme') {
                document.documentElement.setAttribute('data-theme', value);
                localStorage.setItem('dashboard-theme', value);

                // Update theme option UI
                document.querySelectorAll('.theme-option').forEach(opt => {
                    opt.classList.remove('active');
                    if (opt.dataset.theme === value) {
                        opt.classList.add('active');
                        opt.querySelector('input').checked = true;
                    }
                });
            }

            // Apply windowing state globally
            if (key === 'windowing_enabled') {
                window.windowingEnabled = value;
            }

            this.showSaveIndicator();

        } catch (error) {
            console.error('Failed to update preference:', error);
            this.notify('Failed to save preference', 'error');
        }
    },

    showSaveIndicator() {
        const indicator = document.querySelector('.auto-save-indicator');
        if (indicator) {
            indicator.style.color = 'var(--success)';
            indicator.style.fontWeight = '600';
            setTimeout(() => {
                indicator.style.color = '';
                indicator.style.fontWeight = '';
            }, 1500);
        }
    },

    switchTab(tabName) {
        this.state.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });
    },

    // Change Password Modal
    changePassword() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal show';
        modal.id = 'changePasswordModal';
        modal.innerHTML = `
            <div class="modal-backdrop" id="changePasswordBackdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Change Password</h3>
                    <button class="modal-close" onclick="document.getElementById('changePasswordModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="changePasswordForm">
                        <div class="form-section">
                            <label class="form-label">Current Password</label>
                            <input type="password" id="currentPassword" class="form-input" placeholder="Enter current password" required>
                            <div class="input-feedback" id="currentPasswordFeedback"></div>
                        </div>

                        <div class="form-section">
                            <label class="form-label">New Password</label>
                            <input type="password" id="newPassword" class="form-input" placeholder="Enter new password" minlength="6" required>
                            <div class="password-strength" id="passwordStrength"></div>
                        </div>

                        <div class="form-section">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" id="confirmPassword" class="form-input" placeholder="Confirm new password" minlength="6" required>
                            <div class="input-feedback" id="passwordFeedback"></div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="document.getElementById('changePasswordModal').remove()">Cancel</button>
                            <button type="submit" class="btn-primary">
                                <span class="btn-text">Change Password</span>
                                <span class="btn-loading" style="display: none;">⏳</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Backdrop pattern
        const backdrop = document.getElementById('changePasswordBackdrop');
        let mouseDownTarget = null;

        backdrop.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });

        backdrop.addEventListener('mouseup', (e) => {
            if (mouseDownTarget === backdrop && e.target === backdrop) {
                document.getElementById('changePasswordModal').remove();
            }
            mouseDownTarget = null;
        });

        const currentPasswordInput = document.getElementById('currentPassword');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const strengthDisplay = document.getElementById('passwordStrength');
        const feedback = document.getElementById('passwordFeedback');
        const currentFeedback = document.getElementById('currentPasswordFeedback');

        // Password strength checker
        newPasswordInput.oninput = (e) => {
            const password = e.target.value;
            const strength = this.checkPasswordStrength(password);

            strengthDisplay.textContent = `Strength: ${strength.text}`;
            strengthDisplay.className = `password-strength strength-${strength.level}`;
        };

        // Confirm password validation
        confirmPasswordInput.oninput = (e) => {
            const newPass = newPasswordInput.value;
            const confirmPass = e.target.value;

            if (confirmPass && newPass !== confirmPass) {
                feedback.textContent = 'Passwords do not match';
                feedback.className = 'input-feedback feedback-error';
            } else {
                feedback.textContent = '';
            }
        };

        document.getElementById('changePasswordForm').onsubmit = async (e) => {
            e.preventDefault();

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Clear previous errors
            currentFeedback.textContent = '';
            feedback.textContent = '';

            if (newPassword !== confirmPassword) {
                feedback.textContent = 'Passwords do not match';
                feedback.className = 'input-feedback feedback-error';
                return;
            }

            if (newPassword.length < 6) {
                feedback.textContent = 'Password must be at least 6 characters';
                feedback.className = 'input-feedback feedback-error';
                return;
            }

            if (currentPassword === newPassword) {
                feedback.textContent = 'New password must be different from current password';
                feedback.className = 'input-feedback feedback-error';
                return;
            }

            const btn = e.target.querySelector('.btn-primary');
            const btnText = btn.querySelector('.btn-text');
            const btnLoading = btn.querySelector('.btn-loading');

            try {
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline-block';
                btn.disabled = true;

                // Verify current password by attempting to sign in
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: this.state.profile.email,
                    password: currentPassword
                });

                if (signInError) {
                    currentFeedback.textContent = 'Current password is incorrect';
                    currentFeedback.className = 'input-feedback feedback-error';
                    btnText.style.display = 'inline-block';
                    btnLoading.style.display = 'none';
                    btn.disabled = false;
                    return;
                }

                // Current password verified, now update to new password
                await API.updatePassword(newPassword);

                modal.remove();
                this.notify('Password changed successfully!', 'success');

            } catch (error) {
                console.error('Change password error:', error);
                feedback.textContent = 'Failed to change password. Please try again.';
                feedback.className = 'input-feedback feedback-error';
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                btn.disabled = false;
            }
        };
    },

    checkPasswordStrength(password) {
        if (password.length === 0) return { level: '', text: '' };
        if (password.length < 6) return { level: 'weak', text: 'Too short' };

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        if (strength <= 1) return { level: 'weak', text: 'Weak' };
        if (strength <= 3) return { level: 'medium', text: 'Medium' };
        return { level: 'strong', text: 'Strong' };
    },

    // Export Leads
    async exportLeads() {
        try {
            this.notify('Preparing export...', 'info');

            const leads = await API.getLeads();
            const csv = this.convertLeadsToCSV(leads.all);
            const filename = `steadymanager-leads-${this.getDateStamp()}.csv`;

            this.downloadFile(csv, filename);
            this.notify('Leads exported successfully!', 'success');

        } catch (error) {
            console.error('Export leads error:', error);
            this.notify('Failed to export leads', 'error');
        }
    },

    convertLeadsToCSV(leads) {
        if (!leads || leads.length === 0) {
            return 'No leads to export';
        }

        const headers = [
            'Name',
            'Email',
            'Phone',
            'Company',
            'Type',
            'Status',
            'Quality Score',
            'Potential Value',
            'Source',
            'Notes',
            'Lost Reason',
            'Created At',
            'Last Contact'
        ];

        const rows = leads.map(lead => [
            lead.name || '',
            lead.email || '',
            lead.phone || '',
            lead.company || '',
            lead.type || '',
            lead.status || '',
            lead.quality_score || '',
            lead.potential_value || '',
            lead.source || '',
            (lead.notes || '').replace(/"/g, '""'), // Escape quotes
            lead.lost_reason || '',
            lead.created_at || '',
            lead.last_contact_date || ''
        ]);

        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    },

    // Export Tasks
    async exportTasks() {
        try {
            this.notify('Preparing export...', 'info');

            const tasks = await API.getTasks();
            const csv = this.convertTasksToCSV(tasks);
            const filename = `steadymanager-tasks-${this.getDateStamp()}.csv`;

            this.downloadFile(csv, filename);
            this.notify('Tasks exported successfully!', 'success');

        } catch (error) {
            console.error('Export tasks error:', error);
            this.notify('Failed to export tasks', 'error');
        }
    },

    convertTasksToCSV(tasks) {
        if (!tasks || tasks.length === 0) {
            return 'No tasks to export';
        }

        const headers = [
            'Title',
            'Description',
            'Status',
            'Type',
            'Priority',
            'Due Date',
            'Due Time',
            'Completed At',
            'Completion Notes',
            'Created At'
        ];

        const rows = tasks.map(task => [
            task.title || '',
            (task.description || '').replace(/"/g, '""'),
            task.status || '',
            task.task_type || '',
            task.priority || '',
            task.due_date || '',
            task.due_time || '',
            task.completed_at || '',
            (task.completion_notes || '').replace(/"/g, '""'),
            task.created_at || ''
        ]);

        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    },

    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    getDateStamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Delete Account
    deleteAccount() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal show';
        modal.id = 'deleteAccountModal';
        modal.innerHTML = `
            <div class="modal-backdrop" id="deleteAccountBackdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Delete Account</h3>
                    <button class="modal-close" onclick="document.getElementById('deleteAccountModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="delete-warning">
                        <div class="warning-icon">⚠️</div>
                        <h4 class="warning-title">Are you absolutely sure?</h4>
                        <p class="warning-text">
                            This action <strong>cannot be undone</strong>. This will permanently delete your account and remove all data including:
                        </p>
                        <ul class="warning-list">
                            <li>All your leads (${this.state.profile.current_leads || 0} leads)</li>
                            <li>All your tasks</li>
                            <li>All your account data</li>
                        </ul>
                        <p class="warning-text">
                            Please type <strong>DELETE</strong> to confirm.
                        </p>
                    </div>

                    <div class="form-section">
                        <input type="text"
                               id="deleteConfirmation"
                               class="form-input"
                               placeholder="Type DELETE to confirm"
                               autocomplete="off">
                        <div class="input-feedback" id="deleteFeedback"></div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="document.getElementById('deleteAccountModal').remove()">Cancel</button>
                        <button type="button" class="btn-danger" id="confirmDeleteBtn" disabled>
                            <span class="btn-text">Delete My Account</span>
                            <span class="btn-loading" style="display: none;">⏳</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Backdrop pattern
        const backdrop = document.getElementById('deleteAccountBackdrop');
        let mouseDownTarget = null;

        backdrop.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });

        backdrop.addEventListener('mouseup', (e) => {
            if (mouseDownTarget === backdrop && e.target === backdrop) {
                document.getElementById('deleteAccountModal').remove();
            }
            mouseDownTarget = null;
        });

        const confirmInput = document.getElementById('deleteConfirmation');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const feedback = document.getElementById('deleteFeedback');

        confirmInput.oninput = (e) => {
            const value = e.target.value.trim();

            if (value === 'DELETE') {
                confirmBtn.disabled = false;
                feedback.textContent = '';
            } else {
                confirmBtn.disabled = true;
            }
        };

        confirmBtn.onclick = async () => {
            const btnText = confirmBtn.querySelector('.btn-text');
            const btnLoading = confirmBtn.querySelector('.btn-loading');

            try {
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline-block';
                confirmBtn.disabled = true;

                await API.deleteAccount();

                // Account deleted - redirect to homepage
                window.location.href = '/?message=Account deleted successfully';

            } catch (error) {
                console.error('Delete account error:', error);
                feedback.textContent = 'Failed to delete account. Please try again or contact support.';
                feedback.className = 'input-feedback feedback-error';
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                confirmBtn.disabled = false;
            }
        };
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.notify('Copied to clipboard!', 'success');
        }).catch(() => {
            this.notify('Failed to copy', 'error');
        });
    },

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    notify(message, type = 'info') {
        if (window.SteadyUtils?.showToast) {
            window.SteadyUtils.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    },

    showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem;">
                    <div class="loading-spinner" style="display: inline-block; width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                </div>
            `;
        }
    },

    showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem;">
                    <div style="font-size: 4rem; margin-bottom: 2rem;">⚠️</div>
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem;">Settings Error</h2>
                    <p style="margin-bottom: 2rem; font-size: 1.125rem; color: var(--text-secondary);">${API.escapeHtml(message)}</p>
                    <button onclick="SettingsModule.settings_init()" style="padding: 1rem 2rem; background: var(--primary); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: 1rem;">🔄 Try Again</button>
                </div>
            `;
        }
    },

    renderStyles() {
        return `
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .settings-wrapper {
                    max-width: 900px;
                    margin: 0 auto;
                }

                /* Tab Navigation */
                .settings-tabs {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    border-bottom: 2px solid var(--border);
                }

                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem 1.5rem;
                    background: none;
                    border: none;
                    border-bottom: 3px solid transparent;
                    color: var(--text-secondary);
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: var(--transition);
                    position: relative;
                    bottom: -2px;
                }

                .tab-btn:hover {
                    color: var(--primary);
                    background: var(--surface-hover);
                }

                .tab-btn.active {
                    color: var(--primary);
                    border-bottom-color: var(--primary);
                }

                .tab-icon {
                    font-size: 1.25rem;
                }

                .tab-label {
                    font-size: 1rem;
                }

                /* Tab Content */
                .tab-content-wrapper {
                    position: relative;
                    min-height: 400px;
                }

                .tab-content {
                    display: none;
                    animation: fadeIn 0.3s ease;
                }

                .tab-content.active {
                    display: block;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .settings-section {
                    margin-bottom: 2rem;
                }

                .section-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .section-description {
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                    font-size: 0.95rem;
                }

                /* Info Card */
                .info-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                }

                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 0;
                    border-bottom: 1px solid var(--border);
                }

                .info-row:last-of-type {
                    border-bottom: none;
                    padding-bottom: 0;
                }

                .info-label {
                    font-weight: 600;
                    color: var(--text-secondary);
                }

                .info-value {
                    color: var(--text-primary);
                    font-weight: 500;
                }

                .plan-badge {
                    color: white;
                    padding: 0.375rem 0.875rem;
                    border-radius: 9999px;
                    font-size: 0.85rem;
                    font-weight: 700;
                }

                .usage-bar-wrapper {
                    margin-top: 1.5rem;
                }

                .usage-bar {
                    width: 100%;
                    height: 12px;
                    background: var(--border);
                    border-radius: 9999px;
                    overflow: hidden;
                    margin-bottom: 0.5rem;
                }

                .usage-bar-fill {
                    height: 100%;
                    border-radius: 9999px;
                    transition: width 0.5s ease;
                }

                .usage-label {
                    text-align: right;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                /* Preference Cards */
                .pref-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    transition: var(--transition);
                }

                .pref-card:hover {
                    box-shadow: var(--shadow);
                }

                .pref-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .pref-icon {
                    font-size: 2rem;
                    flex-shrink: 0;
                }

                .pref-info {
                    flex: 1;
                }

                .pref-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .pref-description {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                .pref-control {
                    margin-top: 1rem;
                }

                /* Theme Selector */
                .theme-selector {
                    display: flex;
                    gap: 1rem;
                }

                .theme-option {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1.5rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: var(--transition);
                    background: var(--surface);
                }

                .theme-option:hover {
                    border-color: var(--primary);
                    background: var(--surface-hover);
                }

                .theme-option.active {
                    border-color: var(--primary);
                    background: rgba(102, 126, 234, 0.1);
                }

                .theme-option input {
                    display: none;
                }

                .theme-icon {
                    font-size: 2.5rem;
                }

                .theme-name {
                    font-weight: 600;
                    color: var(--text-secondary);
                }

                .theme-option.active .theme-name {
                    color: var(--primary);
                    font-weight: 700;
                }

                /* Select Dropdown */
                .pref-select {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    font-size: 1rem;
                    background: var(--background);
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: var(--transition);
                    font-weight: 500;
                }

                .pref-select:hover {
                    border-color: var(--primary);
                }

                .pref-select:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                /* Toggle Switch */
                .toggle-label {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    cursor: pointer;
                }

                .toggle-input {
                    display: none;
                }

                .toggle-slider {
                    position: relative;
                    width: 50px;
                    height: 26px;
                    background: #cbd5e1;
                    border-radius: 9999px;
                    transition: var(--transition);
                    flex-shrink: 0;
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    top: 3px;
                    left: 3px;
                    width: 20px;
                    height: 20px;
                    background: #ffffff;
                    border-radius: 50%;
                    transition: var(--transition);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .toggle-input:checked + .toggle-slider {
                    background: var(--primary);
                }

                .toggle-input:checked + .toggle-slider::before {
                    transform: translateX(24px);
                }

                [data-theme="dark"] .toggle-slider {
                    background: #475569;
                }

                [data-theme="dark"] .toggle-slider::before {
                    background: #f1f5f9;
                }

                .toggle-text {
                    font-weight: 600;
                    color: var(--text-primary);
                    user-select: none;
                }

                /* Auto-save Indicator */
                .auto-save-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-top: 2rem;
                    padding: 1rem;
                    background: var(--surface-hover);
                    border-radius: var(--radius);
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    transition: var(--transition);
                }

                .save-icon {
                    font-size: 1.25rem;
                }

                /* Settings Card (for Security tab) */
                .settings-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    transition: var(--transition);
                }

                .settings-card:hover {
                    box-shadow: var(--shadow);
                }

                .danger-card {
                    border-color: var(--danger);
                    border-width: 2px;
                }

                .card-header-simple {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border);
                }

                .card-icon {
                    font-size: 1.75rem;
                }

                .card-title-simple {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .security-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                }

                .security-info {
                    flex: 1;
                }

                .security-label {
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .security-description {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                .export-description {
                    font-size: 0.95rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }

                .export-buttons {
                    display: flex;
                    gap: 1rem;
                }

                .btn-export {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 1rem 1.5rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                }

                .btn-export:hover {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                }

                .export-icon {
                    font-size: 1.25rem;
                }

                .danger-description {
                    font-size: 0.95rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }

                .btn-primary, .btn-secondary, .btn-danger {
                    padding: 0.875rem 1.5rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                }

                .btn-primary {
                    background: var(--primary);
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-secondary {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                    border: 2px solid var(--border);
                }

                .btn-secondary:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                }

                .btn-danger {
                    background: var(--danger);
                    color: white;
                }

                .btn-danger:hover:not(:disabled) {
                    background: #dc2626;
                    transform: translateY(-2px);
                }

                .btn-danger:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-loading {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top-color: currentColor;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                .settings-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }

                .settings-modal.show {
                    opacity: 1;
                    visibility: visible;
                }

                .modal-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                }

                .modal-content {
                    background: var(--surface);
                    border-radius: 24px;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
                    width: 100%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow: hidden;
                    position: relative;
                    z-index: 1;
                    border: 1px solid var(--border);
                }

                .modal-header {
                    padding: 2rem 2rem 1rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--surface-hover);
                }

                .modal-title {
                    font-size: 1.375rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                }

                .modal-close {
                    background: none;
                    border: none;
                    width: 2.5rem;
                    height: 2.5rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    font-size: 1.5rem;
                    color: var(--text-secondary);
                    transition: var(--transition);
                }

                .modal-close:hover {
                    background: var(--danger);
                    color: white;
                }

                .modal-body {
                    padding: 2rem;
                    overflow-y: auto;
                    max-height: calc(90vh - 120px);
                }

                .form-section {
                    margin-bottom: 1.5rem;
                }

                .form-label {
                    display: block;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.75rem;
                }

                .form-input {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    font-size: 1rem;
                    background: var(--background);
                    color: var(--text-primary);
                    transition: var(--transition);
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .input-feedback {
                    font-size: 0.85rem;
                    margin-top: 0.5rem;
                    font-weight: 500;
                }

                .feedback-error {
                    color: var(--danger);
                }

                .password-strength {
                    font-size: 0.85rem;
                    margin-top: 0.5rem;
                    font-weight: 600;
                }

                .strength-weak {
                    color: var(--danger);
                }

                .strength-medium {
                    color: var(--warning);
                }

                .strength-strong {
                    color: var(--success);
                }

                .form-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--border);
                }

                .delete-warning {
                    text-align: center;
                    padding: 1.5rem;
                    background: rgba(239, 68, 68, 0.05);
                    border: 2px solid rgba(239, 68, 68, 0.2);
                    border-radius: var(--radius-lg);
                    margin-bottom: 2rem;
                }

                .warning-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }

                .warning-title {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--danger);
                    margin-bottom: 1rem;
                }

                .warning-text {
                    font-size: 0.95rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }

                .warning-list {
                    text-align: left;
                    list-style: none;
                    padding: 0;
                    margin: 1.5rem 0;
                }

                .warning-list li {
                    padding: 0.5rem 0;
                    padding-left: 1.5rem;
                    position: relative;
                    color: var(--text-secondary);
                }

                .warning-list li::before {
                    content: '•';
                    position: absolute;
                    left: 0;
                    color: var(--danger);
                    font-weight: bold;
                }

                @media (max-width: 768px) {
                    .settings-tabs {
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .tab-btn {
                        justify-content: flex-start;
                        border-bottom: none;
                        border-left: 3px solid transparent;
                    }

                    .tab-btn.active {
                        border-left-color: var(--primary);
                        border-bottom-color: transparent;
                    }

                    .theme-selector {
                        flex-direction: column;
                    }

                    .export-buttons {
                        flex-direction: column;
                    }

                    .security-item {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                    }

                    .form-actions {
                        flex-direction: column-reverse;
                    }

                    .btn-primary, .btn-secondary, .btn-danger {
                        width: 100%;
                        justify-content: center;
                    }

                    .settings-modal {
                        padding: 1rem;
                    }

                    .modal-content {
                        max-width: 100%;
                        border-radius: var(--radius);
                    }
                }
            </style>
        `;
    }
};

// Shell compatibility
if (typeof window !== 'undefined') {
    window.SettingsModule = SettingsModule;
    SettingsModule.init = function(targetContainer) {
        return this.settings_init(targetContainer);
    };
    console.log('Settings module loaded');
}
