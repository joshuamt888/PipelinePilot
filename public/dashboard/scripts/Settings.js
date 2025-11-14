window.SettingsModule = {
    state: {
        profile: null,
        preferences: null,
        container: 'settings-content',
        currentTab: 'account'
    },

    async settings_init(targetContainer = 'settings-content') {
        console.log('⚙️ Settings module initializing...');

        this.state.container = targetContainer;
        this.showLoading();

        try {
            const [profile, preferences] = await Promise.all([
                API.getProfile(),
                API.getPreferences()
            ]);

            this.state.profile = profile;
            this.state.preferences = preferences;

            this.render();
            this.attachEvents();

            console.log('✅ Settings module ready');

        } catch (error) {
            console.error('❌ Settings init failed:', error);
            this.showError('Failed to load settings');
        }
    },

    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="settings-shell">
                <div class="settings-header">
                    <h1 class="settings-title">Settings</h1>
                    <p class="settings-subtitle">Manage your account and preferences</p>
                </div>

                <div class="settings-body">
                    <div class="settings-tabs">
                        ${this.renderTabButton('account', '👤', 'Account')}
                        ${this.renderTabButton('preferences', '⚙️', 'Preferences')}
                        ${this.renderTabButton('security', '🔐', 'Security')}
                    </div>

                    <div class="settings-content">
                        ${this.renderTabContent('account', this.renderAccountTab())}
                        ${this.renderTabContent('preferences', this.renderPreferencesTab())}
                        ${this.renderTabContent('security', this.renderSecurityTab())}
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            container.querySelector('.settings-shell').classList.add('loaded');
        }, 50);
    },

    renderTabButton(tab, icon, label) {
        const isActive = this.state.currentTab === tab;
        return `
            <button class="tab-button ${isActive ? 'active' : ''}" data-tab="${tab}">
                <span class="tab-icon">${icon}</span>
                <span class="tab-label">${label}</span>
                <div class="tab-indicator"></div>
            </button>
        `;
    },

    renderTabContent(tab, content) {
        const isActive = this.state.currentTab === tab;
        return `
            <div class="tab-panel ${isActive ? 'active' : ''}" data-tab="${tab}">
                ${content}
            </div>
        `;
    },

    async renderAccountTab() {
        const { email, user_type, created_at } = this.state.profile;

        // Get lead counts from API
        const subscriptionInfo = await API.getUserSubscriptionInfo();
        const leadsUsed = subscriptionInfo.currentLeads;
        const leadsLimit = subscriptionInfo.leadLimit;

        // ========================================
        // TIER FEATURE GATES
        // Free: Basic modules only (Dashboard, Pipeline, Leads, Scheduling)
        // PRO: + Goals, Estimates, Jobs (implemented)
        // BUSINESS FEATURE: Team collaboration (future)
        // ENTERPRISE FEATURE: SSO, audit logs, custom integrations (future)
        // ADMIN FEATURE: Platform analytics, user management (implemented)
        // ========================================
        const tierConfig = {
            'free': { name: 'Free Plan', color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' },
            'professional': { name: 'Professional', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
            'professional_trial': { name: 'Pro Trial', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
            'business': { name: 'Business', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }, // FUTURE
            'enterprise': { name: 'Enterprise', color: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #5a67d8 100%)' }, // FUTURE
            'admin': { name: 'Admin', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }
        };

        const tier = tierConfig[user_type] || tierConfig['free'];
        const memberSince = this.formatDate(created_at);
        const leadsPercent = Math.min(Math.round((leadsUsed / leadsLimit) * 100), 100);

        return `
            <div class="account-overview">
                <div class="overview-card gradient-card">
                    <div class="card-glow" style="background: ${tier.gradient}"></div>
                    <div class="card-content">
                        <div class="plan-badge-large" style="background: ${tier.gradient}">
                            <span class="plan-name">${tier.name}</span>
                        </div>
                        <div class="account-email">${API.escapeHtml(email)}</div>
                        <div class="account-member">Member since ${memberSince}</div>
                    </div>
                </div>

                <div class="stats-card">
                    <div class="stat-header">
                        <h3 class="stat-title">Lead Usage</h3>
                        <span class="stat-count">${leadsUsed} / ${leadsLimit}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill" style="width: ${leadsPercent}%; background: ${tier.gradient}">
                                <div class="progress-shimmer"></div>
                            </div>
                        </div>
                        <div class="progress-label">${leadsPercent}% capacity</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderPreferencesTab() {
        const prefs = this.state.preferences;
        const theme = prefs.theme || 'light';
        const defaultView = prefs.default_view || 'dashboard';
        const windowing = prefs.windowing_enabled || false;

        return `
            <div class="preferences-grid">
                <div class="pref-section">
                    <h3 class="pref-section-title">Appearance</h3>

                    <!-- Theme -->
                    <div class="pref-item">
                        <div class="pref-item-header">
                            <div class="pref-item-icon">🎨</div>
                            <div class="pref-item-info">
                                <div class="pref-item-label">Theme</div>
                                <div class="pref-item-description">Choose your color scheme</div>
                            </div>
                        </div>
                        <div class="pref-item-control">
                            <div class="theme-grid">
                                <label class="theme-card ${theme === 'light' ? 'active' : ''}" data-theme="light">
                                    <input type="radio" name="theme" value="light" ${theme === 'light' ? 'checked' : ''}>
                                    <div class="theme-preview light-preview">
                                        <div class="preview-bar"></div>
                                        <div class="preview-content">
                                            <div class="preview-line"></div>
                                            <div class="preview-line short"></div>
                                        </div>
                                    </div>
                                    <div class="theme-label">
                                        <span class="theme-icon">☀️</span>
                                        <span class="theme-name">Light</span>
                                    </div>
                                    <div class="theme-checkmark">✓</div>
                                </label>

                                <label class="theme-card ${theme === 'dark' ? 'active' : ''}" data-theme="dark">
                                    <input type="radio" name="theme" value="dark" ${theme === 'dark' ? 'checked' : ''}>
                                    <div class="theme-preview dark-preview">
                                        <div class="preview-bar"></div>
                                        <div class="preview-content">
                                            <div class="preview-line"></div>
                                            <div class="preview-line short"></div>
                                        </div>
                                    </div>
                                    <div class="theme-label">
                                        <span class="theme-icon">🌙</span>
                                        <span class="theme-name">Dark</span>
                                    </div>
                                    <div class="theme-checkmark">✓</div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pref-section">
                    <h3 class="pref-section-title">Navigation</h3>

                    <!-- Default View -->
                    <div class="pref-item">
                        <div class="pref-item-header">
                            <div class="pref-item-icon">🏠</div>
                            <div class="pref-item-info">
                                <div class="pref-item-label">Default View</div>
                                <div class="pref-item-description">Page to show after login</div>
                            </div>
                        </div>
                        <div class="pref-item-control">
                            <div class="select-wrapper">
                                <select id="default-view-select" class="styled-select">
                                    <option value="dashboard" ${defaultView === 'dashboard' ? 'selected' : ''}>📊 Dashboard</option>
                                    <option value="pipeline" ${defaultView === 'pipeline' ? 'selected' : ''}>🌿 Pipeline</option>
                                    <option value="tasks" ${defaultView === 'tasks' ? 'selected' : ''}>📋 Tasks</option>
                                    <option value="jobs" ${defaultView === 'jobs' ? 'selected' : ''}>💼 Jobs</option>
                                    <option value="goals" ${defaultView === 'goals' ? 'selected' : ''}>🎯 Goals</option>
                                </select>
                                <div class="select-arrow">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pref-section">
                    <h3 class="pref-section-title">Advanced</h3>

                    <!-- Windowing -->
                    <div class="pref-item">
                        <div class="pref-item-header">
                            <div class="pref-item-icon">🪟</div>
                            <div class="pref-item-info">
                                <div class="pref-item-label">Windowing System</div>
                                <div class="pref-item-description">Enable draggable modals (experimental)</div>
                            </div>
                        </div>
                        <div class="pref-item-control">
                            <label class="switch">
                                <input type="checkbox" id="windowing-toggle" ${windowing ? 'checked' : ''}>
                                <span class="switch-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="save-indicator">
                    <div class="save-pulse"></div>
                    <span class="save-text">Changes save automatically</span>
                </div>
            </div>
        `;
    },

    renderSecurityTab() {
        return `
            <div class="security-grid">
                <div class="security-section">
                    <h3 class="security-section-title">Security</h3>

                    <div class="security-card">
                        <div class="security-item">
                            <div class="security-icon">🔑</div>
                            <div class="security-info">
                                <div class="security-label">Password</div>
                                <div class="security-desc">Update your account password</div>
                            </div>
                            <button class="btn-outline" onclick="SettingsModule.changePassword()">
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                <div class="security-section">
                    <h3 class="security-section-title">Data Export</h3>

                    <div class="security-card">
                        <p class="export-description">Download your data as CSV files for backup or analysis</p>
                        <div class="export-grid">
                            <button class="export-btn" onclick="SettingsModule.exportLeads()">
                                <div class="export-icon">📥</div>
                                <div class="export-info">
                                    <div class="export-label">Export Leads</div>
                                    <div class="export-desc">CSV file with all leads</div>
                                </div>
                            </button>

                            <button class="export-btn" onclick="SettingsModule.exportTasks()">
                                <div class="export-icon">📥</div>
                                <div class="export-info">
                                    <div class="export-label">Export Tasks</div>
                                    <div class="export-desc">CSV file with all tasks</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="security-section danger-section">
                    <h3 class="security-section-title">Danger Zone</h3>

                    <div class="security-card danger-card">
                        <div class="danger-content">
                            <div class="danger-icon">⚠️</div>
                            <div class="danger-info">
                                <div class="danger-label">Delete Account</div>
                                <div class="danger-desc">Permanently delete your account and all data</div>
                            </div>
                            <button class="btn-danger" onclick="SettingsModule.deleteAccount()">
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Theme selection
        document.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', async () => {
                const theme = card.dataset.theme;
                await this.updatePreference('theme', theme);
            });
        });

        // Default view
        const defaultViewSelect = document.getElementById('default-view-select');
        if (defaultViewSelect) {
            defaultViewSelect.addEventListener('change', async (e) => {
                await this.updatePreference('default_view', e.target.value);
            });
        }

        // Windowing toggle
        const windowingToggle = document.getElementById('windowing-toggle');
        if (windowingToggle) {
            windowingToggle.addEventListener('change', async (e) => {
                await this.updatePreference('windowing_enabled', e.target.checked);
            });
        }
    },

    async updatePreference(key, value) {
        try {
            this.state.preferences[key] = value;

            await API.updatePreferences(this.state.preferences);

            if (key === 'theme') {
                document.documentElement.setAttribute('data-theme', value);
                localStorage.setItem('dashboard-theme', value);

                document.querySelectorAll('.theme-card').forEach(card => {
                    card.classList.toggle('active', card.dataset.theme === value);
                    const input = card.querySelector('input');
                    if (input) input.checked = card.dataset.theme === value;
                });
            }

            if (key === 'windowing_enabled') {
                window.windowingEnabled = value;
            }

            this.showSaveAnimation();

        } catch (error) {
            console.error('Failed to update preference:', error);
            this.notify('Failed to save preference', 'error');
        }
    },

    showSaveAnimation() {
        const indicator = document.querySelector('.save-indicator');
        if (indicator) {
            indicator.classList.add('saving');
            setTimeout(() => {
                indicator.classList.remove('saving');
            }, 2000);
        }
    },

    switchTab(tabName) {
        this.state.currentTab = tabName;

        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.tab === tabName);
        });
    },

    changePassword() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'passwordModal';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h2 class="modal-title">Change Password</h2>
                    <button class="modal-close" onclick="document.getElementById('passwordModal').remove()">×</button>
                </div>
                <form id="passwordForm" class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <input type="password" id="currentPassword" class="form-input" placeholder="Enter current password" required>
                        <div class="form-error" id="currentError"></div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="newPassword" class="form-input" placeholder="Enter new password" minlength="6" required>
                        <div class="password-strength" id="strengthIndicator"></div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" id="confirmPassword" class="form-input" placeholder="Confirm new password" required>
                        <div class="form-error" id="confirmError"></div>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-outline" onclick="document.getElementById('passwordModal').remove()">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <span class="btn-text">Update Password</span>
                            <span class="btn-loader" style="display: none;">⏳</span>
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const form = document.getElementById('passwordForm');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const strengthIndicator = document.getElementById('strengthIndicator');

        newPasswordInput.addEventListener('input', (e) => {
            const strength = this.checkPasswordStrength(e.target.value);
            strengthIndicator.textContent = strength.text ? `Strength: ${strength.text}` : '';
            strengthIndicator.className = `password-strength ${strength.level}`;
        });

        confirmPasswordInput.addEventListener('input', (e) => {
            const error = document.getElementById('confirmError');
            if (e.target.value && newPasswordInput.value !== e.target.value) {
                error.textContent = 'Passwords do not match';
            } else {
                error.textContent = '';
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (newPassword !== confirmPassword) {
                document.getElementById('confirmError').textContent = 'Passwords do not match';
                return;
            }

            if (currentPassword === newPassword) {
                document.getElementById('confirmError').textContent = 'New password must be different';
                return;
            }

            const btn = form.querySelector('.btn-primary');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');

            try {
                btnText.style.display = 'none';
                btnLoader.style.display = 'inline-block';
                btn.disabled = true;

                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: this.state.profile.email,
                    password: currentPassword
                });

                if (signInError) {
                    document.getElementById('currentError').textContent = 'Current password is incorrect';
                    btnText.style.display = 'inline-block';
                    btnLoader.style.display = 'none';
                    btn.disabled = false;
                    return;
                }

                await API.updatePassword(newPassword);

                modal.remove();
                this.notify('Password updated successfully!', 'success');

            } catch (error) {
                console.error('Password change error:', error);
                document.getElementById('confirmError').textContent = 'Failed to update password';
                btnText.style.display = 'inline-block';
                btnLoader.style.display = 'none';
                btn.disabled = false;
            }
        });
    },

    checkPasswordStrength(password) {
        if (!password) return { level: '', text: '' };
        if (password.length < 6) return { level: 'weak', text: 'Too short' };

        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 1) return { level: 'weak', text: 'Weak' };
        if (score <= 3) return { level: 'medium', text: 'Medium' };
        return { level: 'strong', text: 'Strong' };
    },

    async exportLeads() {
        try {
            this.notify('Preparing export...', 'info');
            const leads = await API.getLeads();
            const csv = this.convertToCSV(leads.all, [
                'name', 'email', 'phone', 'company', 'type', 'status',
                'quality_score', 'potential_value', 'source', 'notes',
                'lost_reason', 'created_at', 'last_contact_date'
            ]);
            this.downloadCSV(csv, `leads-${this.getTimestamp()}.csv`);
            this.notify('Leads exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.notify('Failed to export leads', 'error');
        }
    },

    async exportTasks() {
        try {
            this.notify('Preparing export...', 'info');
            const tasks = await API.getTasks();
            const csv = this.convertToCSV(tasks, [
                'title', 'description', 'status', 'task_type', 'priority',
                'due_date', 'due_time', 'completed_at', 'completion_notes', 'created_at'
            ]);
            this.downloadCSV(csv, `tasks-${this.getTimestamp()}.csv`);
            this.notify('Tasks exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.notify('Failed to export tasks', 'error');
        }
    },

    convertToCSV(data, fields) {
        if (!data || data.length === 0) return 'No data to export';

        const headers = fields.map(f => f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        const rows = data.map(item =>
            fields.map(field => {
                const value = item[field] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
        );

        return [headers.join(','), ...rows].join('\n');
    },

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    },

    getTimestamp() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },

    async deleteAccount() {
        // Get lead count from API
        const subscriptionInfo = await API.getUserSubscriptionInfo();
        const leadCount = subscriptionInfo.currentLeads;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'deleteModal';
        modal.innerHTML = `
            <div class="modal-container danger-modal">
                <div class="modal-header">
                    <h2 class="modal-title">Delete Account</h2>
                    <button class="modal-close" onclick="document.getElementById('deleteModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="danger-warning">
                        <div class="warning-icon">⚠️</div>
                        <h3 class="warning-title">This action cannot be undone</h3>
                        <p class="warning-text">
                            This will permanently delete your account and remove all associated data including:
                        </p>
                        <ul class="warning-list">
                            <li>All leads (${leadCount} leads)</li>
                            <li>All tasks and schedules</li>
                            <li>All account settings</li>
                            <li>All historical data</li>
                        </ul>
                        <p class="warning-text">
                            Please type <strong>DELETE</strong> to confirm.
                        </p>
                    </div>

                    <div class="form-group">
                        <input type="text" id="deleteConfirm" class="form-input" placeholder="Type DELETE to confirm" autocomplete="off">
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-outline" onclick="document.getElementById('deleteModal').remove()">Cancel</button>
                        <button type="button" class="btn-danger" id="confirmDelete" disabled>
                            <span class="btn-text">Delete My Account</span>
                            <span class="btn-loader" style="display: none;">⏳</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const confirmInput = document.getElementById('deleteConfirm');
        const confirmBtn = document.getElementById('confirmDelete');

        confirmInput.addEventListener('input', (e) => {
            confirmBtn.disabled = e.target.value.trim() !== 'DELETE';
        });

        confirmBtn.addEventListener('click', async () => {
            const btnText = confirmBtn.querySelector('.btn-text');
            const btnLoader = confirmBtn.querySelector('.btn-loader');

            try {
                btnText.style.display = 'none';
                btnLoader.style.display = 'inline-block';
                confirmBtn.disabled = true;

                await API.deleteAccount();
                window.location.href = '/?message=Account deleted successfully';

            } catch (error) {
                console.error('Delete error:', error);
                this.notify('Failed to delete account', 'error');
                btnText.style.display = 'inline-block';
                btnLoader.style.display = 'none';
                confirmBtn.disabled = false;
            }
        });
    },

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString('en-US', {
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
                <div class="loading-state">
                    <div class="loader"></div>
                </div>
            `;
        }
    },

    showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h2 class="error-title">Failed to Load</h2>
                    <p class="error-message">${API.escapeHtml(message)}</p>
                    <button class="btn-primary" onclick="SettingsModule.settings_init()">
                        Try Again
                    </button>
                </div>
            `;
        }
    },

    renderStyles() {
        return `
            <style>
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .settings-shell {
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .settings-shell.loaded {
                    opacity: 1;
                }

                .settings-header {
                    margin-bottom: 2rem;
                    animation: slideUp 0.4s ease;
                }

                .settings-title {
                    font-size: 2rem;
                    font-weight: 900;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 0.5rem;
                }

                .settings-subtitle {
                    font-size: 1rem;
                    color: var(--text-secondary);
                }

                .settings-body {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 2rem;
                    animation: slideUp 0.5s ease 0.1s both;
                }

                /* Tabs */
                .settings-tabs {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .tab-button {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 1.5rem;
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-weight: 600;
                    color: var(--text-secondary);
                }

                .tab-button:hover {
                    background: var(--surface-hover);
                    border-color: var(--primary);
                    transform: translateX(4px);
                }

                .tab-button.active {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                    border-color: var(--primary);
                    color: white;
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .tab-icon {
                    font-size: 1.5rem;
                }

                .tab-label {
                    flex: 1;
                }

                .tab-indicator {
                    width: 6px;
                    height: 6px;
                    background: white;
                    border-radius: 50%;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .tab-button.active .tab-indicator {
                    opacity: 1;
                }

                /* Tab Content */
                .settings-content {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    min-height: 500px;
                }

                .tab-panel {
                    display: none;
                    animation: slideUp 0.3s ease;
                }

                .tab-panel.active {
                    display: block;
                }

                /* Account Tab */
                .account-overview {
                    display: grid;
                    gap: 1.5rem;
                }

                .gradient-card {
                    position: relative;
                    overflow: hidden;
                    background: var(--surface);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    border: 1px solid var(--border);
                }

                .card-glow {
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    opacity: 0.05;
                    filter: blur(60px);
                    pointer-events: none;
                }

                .card-content {
                    position: relative;
                    z-index: 1;
                    text-align: center;
                }

                .plan-badge-large {
                    display: inline-block;
                    padding: 0.75rem 2rem;
                    border-radius: 9999px;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .plan-name {
                    color: white;
                    font-weight: 800;
                    font-size: 1.125rem;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .account-email {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .account-member {
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                }

                .stats-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                }

                .stat-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .stat-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .stat-count {
                    font-size: 1.5rem;
                    font-weight: 900;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .progress-bar-container {
                    margin-top: 1rem;
                }

                .progress-bar-track {
                    width: 100%;
                    height: 12px;
                    background: var(--border);
                    border-radius: 9999px;
                    overflow: hidden;
                    margin-bottom: 0.5rem;
                }

                .progress-bar-fill {
                    height: 100%;
                    border-radius: 9999px;
                    position: relative;
                    overflow: hidden;
                    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .progress-shimmer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 2s infinite;
                }

                .progress-label {
                    text-align: right;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                /* Preferences Tab */
                .preferences-grid {
                    display: grid;
                    gap: 2rem;
                }

                .pref-section {
                    display: grid;
                    gap: 1rem;
                }

                .pref-section-title {
                    font-size: 0.875rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-secondary);
                }

                .pref-item {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    transition: all 0.2s ease;
                }

                .pref-item:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                }

                .pref-item-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .pref-item-icon {
                    font-size: 2rem;
                    flex-shrink: 0;
                }

                .pref-item-info {
                    flex: 1;
                }

                .pref-item-label {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .pref-item-description {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                .pref-item-control {
                    margin-top: 1rem;
                }

                /* Theme Selection */
                .theme-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }

                .theme-card {
                    position: relative;
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: var(--surface);
                }

                .theme-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .theme-card.active {
                    border-color: var(--primary);
                    background: rgba(102, 126, 234, 0.05);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .theme-card input {
                    display: none;
                }

                .theme-preview {
                    width: 100%;
                    height: 80px;
                    border-radius: var(--radius);
                    margin-bottom: 0.75rem;
                    overflow: hidden;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                }

                .light-preview {
                    background: #f8fafc;
                }

                .dark-preview {
                    background: #0f172a;
                }

                .preview-bar {
                    height: 20px;
                    background: rgba(102, 126, 234, 0.3);
                }

                .preview-content {
                    padding: 0.75rem;
                    display: grid;
                    gap: 0.5rem;
                }

                .light-preview .preview-line {
                    height: 8px;
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }

                .dark-preview .preview-line {
                    height: 8px;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 4px;
                }

                .preview-line.short {
                    width: 60%;
                }

                .theme-label {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .theme-icon {
                    font-size: 1.25rem;
                }

                .theme-name {
                    font-weight: 600;
                    color: var(--text-secondary);
                }

                .theme-card.active .theme-name {
                    color: var(--primary);
                    font-weight: 700;
                }

                .theme-checkmark {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    width: 24px;
                    height: 24px;
                    background: var(--primary);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    opacity: 0;
                    transform: scale(0);
                    transition: all 0.2s ease;
                }

                .theme-card.active .theme-checkmark {
                    opacity: 1;
                    transform: scale(1);
                }

                /* Select Dropdown */
                .select-wrapper {
                    position: relative;
                }

                .styled-select {
                    width: 100%;
                    padding: 0.875rem 3rem 0.875rem 1rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    font-size: 1rem;
                    font-weight: 500;
                    background: var(--surface);
                    color: var(--text-primary);
                    cursor: pointer;
                    appearance: none;
                    transition: all 0.2s ease;
                }

                .styled-select:hover {
                    border-color: var(--primary);
                }

                .styled-select:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .select-arrow {
                    position: absolute;
                    right: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    pointer-events: none;
                    color: var(--text-secondary);
                }

                /* Switch Toggle */
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 52px;
                    height: 28px;
                }

                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .switch-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: #cbd5e1;
                    border-radius: 34px;
                    transition: all 0.3s ease;
                }

                .switch-slider:before {
                    content: "";
                    position: absolute;
                    height: 22px;
                    width: 22px;
                    left: 3px;
                    bottom: 3px;
                    background: white;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .switch input:checked + .switch-slider {
                    background: var(--primary);
                }

                .switch input:checked + .switch-slider:before {
                    transform: translateX(24px);
                }

                [data-theme="dark"] .switch-slider {
                    background: #475569;
                }

                /* Save Indicator */
                .save-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: var(--surface-hover);
                    border-radius: var(--radius-lg);
                    margin-top: 1rem;
                }

                .save-pulse {
                    width: 8px;
                    height: 8px;
                    background: var(--text-secondary);
                    border-radius: 50%;
                    transition: all 0.3s ease;
                }

                .save-indicator.saving .save-pulse {
                    background: var(--success);
                    animation: pulse 1s ease infinite;
                }

                .save-text {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .save-indicator.saving .save-text {
                    color: var(--success);
                }

                /* Security Tab */
                .security-grid {
                    display: grid;
                    gap: 2rem;
                }

                .security-section-title {
                    font-size: 0.875rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                }

                .security-card {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                }

                .security-item {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .security-icon {
                    font-size: 2.5rem;
                    flex-shrink: 0;
                }

                .security-info {
                    flex: 1;
                }

                .security-label {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .security-desc {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                .export-description {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                    line-height: 1.6;
                }

                .export-grid {
                    display: grid;
                    gap: 1rem;
                }

                .export-btn {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.25rem;
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .export-btn:hover {
                    border-color: var(--primary);
                    background: var(--surface-hover);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                }

                .export-icon {
                    font-size: 2rem;
                    flex-shrink: 0;
                }

                .export-info {
                    flex: 1;
                    text-align: left;
                }

                .export-label {
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .export-desc {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .danger-card {
                    border-color: rgba(239, 68, 68, 0.3);
                    background: rgba(239, 68, 68, 0.02);
                }

                .danger-content {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .danger-icon {
                    font-size: 2.5rem;
                    flex-shrink: 0;
                }

                .danger-info {
                    flex: 1;
                }

                .danger-label {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--danger);
                    margin-bottom: 0.25rem;
                }

                .danger-desc {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                /* Buttons */
                .btn-primary,
                .btn-outline,
                .btn-danger {
                    padding: 0.75rem 1.5rem;
                    border-radius: var(--radius);
                    font-weight: 700;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                }

                .btn-primary {
                    background: var(--gradient-primary);
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-outline {
                    background: transparent;
                    border: 2px solid var(--border);
                    color: var(--text-primary);
                }

                .btn-outline:hover {
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
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
                }

                .btn-danger:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                /* Modal */
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
                    transition: opacity 0.3s ease;
                }

                .modal-overlay.show {
                    opacity: 1;
                }

                .modal-container {
                    background: var(--surface);
                    border-radius: var(--radius-lg);
                    max-width: 500px;
                    width: 100%;
                    border: 1px solid var(--border);
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid var(--border);
                    background: var(--surface-hover);
                }

                .modal-title {
                    font-size: 1.375rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                }

                .modal-close {
                    width: 2.5rem;
                    height: 2.5rem;
                    border: none;
                    background: none;
                    font-size: 1.5rem;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-radius: var(--radius);
                    transition: all 0.2s ease;
                }

                .modal-close:hover {
                    background: var(--danger);
                    color: white;
                }

                .modal-body {
                    padding: 2rem;
                    overflow-y: auto;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-label {
                    display: block;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .form-input {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    font-size: 1rem;
                    background: var(--background);
                    color: var(--text-primary);
                    transition: all 0.2s ease;
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .form-error {
                    color: var(--danger);
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                    font-weight: 500;
                }

                .password-strength {
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-top: 0.5rem;
                }

                .password-strength.weak {
                    color: var(--danger);
                }

                .password-strength.medium {
                    color: var(--warning);
                }

                .password-strength.strong {
                    color: var(--success);
                }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border);
                }

                .danger-warning {
                    text-align: center;
                    padding: 1.5rem;
                    background: rgba(239, 68, 68, 0.05);
                    border: 2px solid rgba(239, 68, 68, 0.2);
                    border-radius: var(--radius-lg);
                    margin-bottom: 1.5rem;
                }

                .warning-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }

                .warning-title {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--danger);
                    margin-bottom: 1rem;
                }

                .warning-text {
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }

                .warning-list {
                    text-align: left;
                    list-style: none;
                    padding: 0;
                    margin: 1rem 0;
                }

                .warning-list li {
                    padding: 0.5rem 0 0.5rem 1.5rem;
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

                /* Loading & Error States */
                .loading-state,
                .error-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    text-align: center;
                }

                .loader {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--border);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin-bottom: 1rem;
                }

                .loading-text {
                    color: var(--text-secondary);
                    font-size: 1rem;
                }

                .error-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }

                .error-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .error-message {
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                }

                /* Responsive */
                @media (max-width: 1024px) {
                    .settings-body {
                        grid-template-columns: 1fr;
                    }

                    .settings-tabs {
                        flex-direction: row;
                        overflow-x: auto;
                    }

                    .tab-button {
                        flex-shrink: 0;
                    }
                }

                @media (max-width: 768px) {
                    .settings-content {
                        padding: 1.5rem;
                    }

                    .theme-grid {
                        grid-template-columns: 1fr;
                    }

                    .security-item,
                    .danger-content {
                        flex-direction: column;
                        align-items: flex-start;
                        text-align: left;
                    }

                    .modal-actions {
                        flex-direction: column-reverse;
                    }

                    .btn-primary,
                    .btn-outline,
                    .btn-danger {
                        width: 100%;
                        justify-content: center;
                    }
                }
            </style>
        `;
    }
};

// Module initialization
if (typeof window !== 'undefined') {
    window.SettingsModule = SettingsModule;
    SettingsModule.init = function(targetContainer) {
        return this.settings_init(targetContainer);
    };
    console.log('✅ Settings module loaded');
}
