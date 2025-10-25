window.SettingsModule = {
    state: {
        profile: null,
        container: 'settings-content',
    },

    async settings_init(targetContainer = 'settings-content') {
        console.log('Settings module loading');
        
        this.state.container = targetContainer;
        this.showLoading();
        
        try {
            const profile = await API.getProfile();
            this.state.profile = profile;
            
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
            <div class="settings-container">
                ${this.renderAccountCard()}
                ${this.renderSecurityCard()}
                ${this.renderAppearanceCard()}
                ${this.renderExportCard()}
                ${this.renderDangerZone()}
            </div>
        `;

        // Fade in
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
        }, 50);
    },

    renderAccountCard() {
        const { email, user_type, created_at } = this.state.profile;
        
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
        
        return `
            <div class="settings-card">
                <div class="card-header">
                    <div class="card-icon">👤</div>
                    <h3 class="card-title">Account</h3>
                </div>
                <div class="card-body">
                    <div class="info-row">
                        <span class="info-label">Email</span>
                        <span class="info-value">${API.escapeHtml(email)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Plan</span>
                        <span class="plan-badge" style="background: ${tierColor}">${tierName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Member since</span>
                        <span class="info-value">${memberSince}</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderSecurityCard() {
    return `
        <div class="settings-card">
            <div class="card-header">
                <div class="card-icon">🔐</div>
                <h3 class="card-title">Security</h3>
            </div>
            <div class="card-body">
                <div class="security-item">
                    <div class="security-info">
                        <div class="security-label">Password</div>
                        <div class="security-description">Change your password</div>
                    </div>
                    <button class="btn-secondary" onclick="SettingsModule.changePassword()">
                        Change Password
                    </button>
                </div>
            </div>
        </div>
    `;
},

    renderAppearanceCard() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        
        return `
            <div class="settings-card">
                <div class="card-header">
                    <div class="card-icon">🎨</div>
                    <h3 class="card-title">Appearance</h3>
                </div>
                <div class="card-body">
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
                    <div class="auto-save-note">Changes save automatically</div>
                </div>
            </div>
        `;
    },

    renderExportCard() {
        return `
            <div class="settings-card">
                <div class="card-header">
                    <div class="card-icon">📊</div>
                    <h3 class="card-title">Export Data</h3>
                </div>
                <div class="card-body">
                    <div class="export-description">
                        Download your data as CSV files for backup or analysis
                    </div>
                    <div class="export-buttons">
                        <button class="btn-export" onclick="SettingsModule.exportLeads()">
                            <span class="export-icon">📥</span>
                            <span>Export All Leads</span>
                        </button>
                        <button class="btn-export" onclick="SettingsModule.exportTasks()">
                            <span class="export-icon">📥</span>
                            <span>Export All Tasks</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderDangerZone() {
        return `
            <div class="settings-card danger-card">
                <div class="card-header">
                    <div class="card-icon">🗑️</div>
                    <h3 class="card-title">Danger Zone</h3>
                </div>
                <div class="card-body">
                    <div class="danger-description">
                        ⚠️ Delete your account and all associated data permanently
                    </div>
                    <button class="btn-danger" onclick="SettingsModule.deleteAccount()">
                        Delete Account
                    </button>
                </div>
            </div>
        `;
    },

    attachEvents() {
        // Theme toggle
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = option.dataset.theme;
                this.updateTheme(theme);
            });
        });
    },

    updateTheme(theme) {
        // Update UI
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('dashboard-theme', theme);
        
        // Update active state
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.remove('active');
            if (opt.dataset.theme === theme) {
                opt.classList.add('active');
                opt.querySelector('input').checked = true;
            }
        });
        
        this.notify(`Switched to ${theme} mode`, 'success');
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

                .settings-container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 0;
                }

                .settings-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    margin-bottom: 2rem;
                    box-shadow: var(--shadow);
                    transition: var(--transition);
                }

                .settings-card:hover {
                    box-shadow: var(--shadow-lg);
                }

                .danger-card {
                    border-color: var(--danger);
                    border-width: 2px;
                }

                .card-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border);
                }

                .card-icon {
                    font-size: 2rem;
                }

                .card-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                }

                .card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 0;
                    border-bottom: 1px solid var(--border);
                }

                .info-row:last-child {
                    border-bottom: none;
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

                .status-enabled {
                    color: var(--success);
                    font-weight: 600;
                }

                .status-disabled {
                    color: var(--text-tertiary);
                    font-weight: 600;
                }

                .security-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 0.5rem 0;
                }

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

                .auto-save-note {
                    text-align: center;
                    font-size: 0.85rem;
                    color: var(--text-tertiary);
                    font-style: italic;
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
                    margin-bottom: 1rem;
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

                .modal-wide {
                    max-width: 600px;
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

                .feedback-normal {
                    color: var(--text-secondary);
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
                    .settings-container {
                        padding: 0;
                    }

                    .settings-card {
                        border-radius: var(--radius);
                        padding: 1.5rem;
                    }

                    .security-item {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                    }

                    .export-buttons {
                        flex-direction: column;
                    }

                    .theme-selector {
                        flex-direction: column;
                    }

                    .form-actions {
                        flex-direction: column-reverse;
                    }

                    .btn-primary, .btn-secondary, .btn-danger {
                        width: 100%;
                        justify-content: center;
                    }

                    .modal-content {
                        max-width: 100%;
                        border-radius: var(--radius);
                    }

                    .settings-modal {
                        padding: 1rem;
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