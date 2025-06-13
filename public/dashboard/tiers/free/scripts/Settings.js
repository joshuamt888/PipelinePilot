/**
 * SteadyManager - Free Tier Utilities
 * Professional utility functions for the free tier dashboard
 * CDN-powered, minimal, and conversion-focused
 */

class SteadyUtils {
    constructor() {
        this.tier = 'FREE';
        this.leadLimit = 50;
        this.sounds = null;
        this.darkMode = false;
        this.init();
    }

    /**
     * Initialize utilities
     */
    init() {
        this.initSounds();
        this.initToastContainer();
        this.initDarkMode();
        console.log('🎯 SteadyManager Utils (Free Tier) - Ready');
    }

    /**
     * Initialize dark mode
     */
    initDarkMode() {
        // Check for saved preference
        const savedTheme = localStorage.getItem('steadymanager_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        this.darkMode = savedTheme ? savedTheme === 'dark' : prefersDark;
        
        // Apply theme immediately
        this.applyTheme();
        
        // Add dark mode styles
        this.addDarkModeStyles();
        
        // Add theme toggle to header
        this.addThemeToggle();
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('steadymanager_theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Add theme toggle button to header
     */
    addThemeToggle() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        const themeToggle = document.createElement('button');
        themeToggle.id = 'themeToggle';
        themeToggle.className = 'theme-toggle';
        themeToggle.innerHTML = `
            <i data-lucide="${this.darkMode ? 'sun' : 'moon'}"></i>
        `;
        themeToggle.title = `Switch to ${this.darkMode ? 'light' : 'dark'} mode`;
        
        themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Insert before user menu
        const userMenu = headerRight.querySelector('.user-menu');
        if (userMenu) {
            headerRight.insertBefore(themeToggle, userMenu);
        } else {
            headerRight.appendChild(themeToggle);
        }

        // Re-initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.setTheme(this.darkMode ? 'light' : 'dark');
        
        // Show feedback
        this.showToast(
            `${this.darkMode ? 'Dark' : 'Light'} mode activated! 🌙✨`, 
            'success'
        );
        
        // Play sound
        this.playSound('success');
        
        // Track theme change
        this.trackEvent('theme_changed', { theme: this.darkMode ? 'dark' : 'light' });
    }

    /**
     * Set specific theme
     */
    setTheme(theme) {
        this.darkMode = theme === 'dark';
        
        // Save preference
        localStorage.setItem('steadymanager_theme', theme);
        
        // Apply theme
        this.applyTheme();
        
        // Update toggle button
        this.updateThemeToggle();
    }

    /**
     * Apply current theme
     */
    applyTheme() {
        const body = document.body;
        
        if (this.darkMode) {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
    }

    /**
     * Update theme toggle button
     */
    updateThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;

        const icon = toggle.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', this.darkMode ? 'sun' : 'moon');
            toggle.title = `Switch to ${this.darkMode ? 'light' : 'dark'} mode`;
            
            // Re-initialize icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    /**
     * Add comprehensive dark mode styles
     */
    addDarkModeStyles() {
        if (document.getElementById('dark-mode-styles')) return;

        const style = document.createElement('style');
        style.id = 'dark-mode-styles';
        style.textContent = `
            /* Theme Toggle Button */
            .theme-toggle {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border-radius: 10px;
                border: 1px solid #e5e7eb;
                background: #f8fafc;
                color: #6b7280;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .theme-toggle:hover {
                background: #f1f5f9;
                border-color: #cbd5e1;
                color: #374151;
                transform: translateY(-1px);
            }

            /* Dark Mode Styles */
            body.dark-mode {
                background: #0f172a;
                color: #e2e8f0;
            }

            /* Sidebar Dark Mode */
            body.dark-mode .sidebar {
                background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
                border-right-color: #334155;
            }

            body.dark-mode .sidebar-header {
                border-bottom-color: rgba(255, 255, 255, 0.1);
            }

            body.dark-mode .sidebar-tier {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.1);
            }

            body.dark-mode .nav-link {
                color: rgba(255, 255, 255, 0.7);
            }

            body.dark-mode .nav-link:hover,
            body.dark-mode .nav-link.active {
                color: white;
                background: rgba(255, 255, 255, 0.1);
            }

            body.dark-mode .upgrade-prompt {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
            }

            /* Header Dark Mode */
            body.dark-mode .header {
                background: #1e293b;
                border-bottom-color: #334155;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            }

            body.dark-mode .header-left h1 {
                color: #f1f5f9;
            }

            body.dark-mode .header-left p {
                color: #94a3b8;
            }

            body.dark-mode .user-menu {
                background: #334155;
                border-color: #475569;
                color: #e2e8f0;
            }

            body.dark-mode .user-menu:hover {
                background: #475569;
                border-color: #64748b;
            }

            body.dark-mode .user-name {
                color: #f1f5f9;
            }

            body.dark-mode .user-tier {
                color: #34d399;
            }

            body.dark-mode .theme-toggle {
                background: #334155;
                border-color: #475569;
                color: #94a3b8;
            }

            body.dark-mode .theme-toggle:hover {
                background: #475569;
                border-color: #64748b;
                color: #e2e8f0;
            }

            /* Dashboard Content Dark Mode */
            body.dark-mode .dashboard-content {
                background: #0f172a;
            }

            /* Stat Cards Dark Mode */
            body.dark-mode .stat-card {
                background: #1e293b;
                border-color: #334155;
                color: #e2e8f0;
            }

            body.dark-mode .stat-card:hover {
                border-color: #475569;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
            }

            body.dark-mode .stat-value {
                color: #f1f5f9;
            }

            body.dark-mode .stat-label {
                color: #94a3b8;
            }

            body.dark-mode .stat-icon {
                color: #60a5fa;
            }

            body.dark-mode .progress-bar {
                background: #334155;
            }

            body.dark-mode .progress-fill {
                background: linear-gradient(90deg, #60a5fa, #3b82f6);
            }

            /* Action Buttons Dark Mode */
            body.dark-mode .action-btn {
                background: #1e293b;
                border-color: #334155;
                color: #e2e8f0;
            }

            body.dark-mode .action-btn:hover {
                border-color: #60a5fa;
                box-shadow: 0 8px 25px rgba(96, 165, 250, 0.2);
            }

            body.dark-mode .action-btn.primary {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
            }

            body.dark-mode .action-btn.primary:hover {
                box-shadow: 0 12px 30px rgba(59, 130, 246, 0.4);
            }

            body.dark-mode .action-icon {
                color: #60a5fa;
            }

            body.dark-mode .action-btn.primary .action-icon {
                color: white;
            }

            body.dark-mode .action-desc {
                color: #94a3b8;
            }

            body.dark-mode .action-btn.primary .action-desc {
                color: rgba(255, 255, 255, 0.8);
            }

            /* Leads Section Dark Mode */
            body.dark-mode .leads-section {
                background: #1e293b;
                border-color: #334155;
            }

            body.dark-mode .section-header {
                background: #334155;
                border-bottom-color: #475569;
            }

            body.dark-mode .section-title {
                color: #f1f5f9;
            }

            body.dark-mode .section-title-icon {
                color: #60a5fa;
            }

            body.dark-mode .section-action {
                color: #60a5fa;
            }

            body.dark-mode .section-action:hover {
                color: #93c5fd;
            }

            body.dark-mode .lead-item {
                border-bottom-color: #334155;
            }

            body.dark-mode .lead-item:hover {
                background: #334155;
            }

            body.dark-mode .lead-name {
                color: #f1f5f9;
            }

            body.dark-mode .lead-details {
                color: #94a3b8;
            }

            body.dark-mode .empty-state {
                color: #94a3b8;
            }

            body.dark-mode .empty-state h3 {
                color: #cbd5e1;
            }

            body.dark-mode .empty-icon {
                color: #64748b;
            }

            /* Sidebar Panel Dark Mode */
            body.dark-mode .sidebar-panel {
                background: #1e293b;
                border-color: #334155;
            }

            body.dark-mode .upgrade-panel {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            }

            body.dark-mode .activity-item {
                border-bottom-color: #334155;
            }

            body.dark-mode .activity-item:hover {
                background: #334155;
            }

            body.dark-mode .activity-text {
                color: #cbd5e1;
            }

            body.dark-mode .activity-time {
                color: #64748b;
            }

            /* Modal Dark Mode */
            body.dark-mode .modal-overlay {
                background: rgba(0, 0, 0, 0.8);
            }

            body.dark-mode .modal-content {
                background: #1e293b;
                color: #e2e8f0;
            }

            body.dark-mode .modal-header {
                border-bottom-color: #334155;
            }

            body.dark-mode .modal-header h3 {
                color: #f1f5f9;
            }

            body.dark-mode .modal-close {
                color: #94a3b8;
            }

            body.dark-mode .modal-close:hover {
                background: #334155;
                color: #e2e8f0;
            }

            body.dark-mode .modal-footer {
                border-top-color: #334155;
            }

            /* Form Dark Mode */
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
                box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
            }

            body.dark-mode .form-group input::placeholder,
            body.dark-mode .form-group textarea::placeholder {
                color: #64748b;
            }

            /* Button Dark Mode */
            body.dark-mode .btn-secondary {
                background: #334155;
                color: #e2e8f0;
                border-color: #475569;
            }

            body.dark-mode .btn-secondary:hover {
                background: #475569;
                border-color: #64748b;
            }

            body.dark-mode .upgrade-btn {
                background: white;
                color: #3b82f6;
            }

            /* Toast Dark Mode */
            body.dark-mode .steady-toast {
                background: #1e293b;
                border-color: #334155;
                color: #e2e8f0;
            }

            body.dark-mode .toast-message {
                color: #cbd5e1;
            }

            body.dark-mode .toast-close {
                color: #64748b;
            }

            body.dark-mode .toast-close:hover {
                background: #334155;
                color: #94a3b8;
            }

            body.dark-mode .toast-upgrade {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                border-color: transparent;
            }

            /* Settings Modal Dark Mode */
            body.dark-mode .settings-modal {
                background: #1e293b;
                color: #e2e8f0;
            }

            body.dark-mode .settings-tabs {
                background: #334155;
                border-bottom-color: #475569;
            }

            body.dark-mode .settings-tab {
                color: #94a3b8;
            }

            body.dark-mode .settings-tab.active {
                color: #60a5fa;
                background: #1e293b;
                border-bottom-color: #60a5fa;
            }

            body.dark-mode .settings-tab:hover:not(.active) {
                background: #475569;
                color: #cbd5e1;
            }

            body.dark-mode .settings-section h4,
            body.dark-mode .settings-section h5 {
                color: #f1f5f9;
            }

            body.dark-mode .plan-info {
                background: #334155;
                border-color: #475569;
            }

            body.dark-mode .plan-details p {
                color: #94a3b8;
            }

            body.dark-mode .info-item {
                border-bottom-color: #334155;
            }

            body.dark-mode .info-item label {
                color: #94a3b8;
            }

            body.dark-mode .info-item span {
                color: #e2e8f0;
            }

            body.dark-mode .danger-zone {
                background: #7f1d1d;
                border-color: #dc2626;
            }

            body.dark-mode .danger-zone h5 {
                color: #fca5a5;
            }

            body.dark-mode .danger-zone p {
                color: #fecaca;
            }

            /* Profile Dropdown Dark Mode */
            body.dark-mode .dropdown-content {
                background: #1e293b;
                border-color: #334155;
            }

            body.dark-mode .dropdown-header {
                background: #334155;
                border-bottom-color: #475569;
            }

            body.dark-mode .dropdown-name {
                color: #f1f5f9;
            }

            body.dark-mode .dropdown-email {
                color: #94a3b8;
            }

            body.dark-mode .dropdown-stats {
                background: #334155;
                border-bottom-color: #475569;
            }

            body.dark-mode .stat-value {
                color: #f1f5f9;
            }

            body.dark-mode .stat-label {
                color: #94a3b8;
            }

            body.dark-mode .dropdown-action {
                color: #cbd5e1;
            }

            body.dark-mode .dropdown-action:hover {
                background: #334155;
            }

            body.dark-mode .dropdown-action.danger {
                color: #fca5a5;
            }

            body.dark-mode .dropdown-action.danger:hover {
                background: #7f1d1d;
            }

            /* Upgrade Modal Dark Mode */
            body.dark-mode .upgrade-modal {
                background: #1e293b;
                color: #e2e8f0;
            }

            body.dark-mode .upgrade-icon {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            }

            body.dark-mode .upgrade-message {
                color: #cbd5e1;
            }

            body.dark-mode .benefit-item {
                color: #cbd5e1;
            }

            body.dark-mode .benefit-item i {
                color: #34d399;
            }

            /* Status Colors Dark Mode */
            body.dark-mode .status-new {
                background: #1e3a8a;
                color: #93c5fd;
            }

            body.dark-mode .status-contacted {
                background: #92400e;
                color: #fcd34d;
            }

            body.dark-mode .status-qualified {
                background: #064e3b;
                color: #6ee7b7;
            }

            body.dark-mode .trend-up {
                color: #34d399;
            }

            body.dark-mode .trend-down {
                color: #f87171;
            }

            body.dark-mode .trend-neutral {
                color: #94a3b8;
            }

            /* Animation for theme transition */
            body {
                transition: background-color 0.3s ease, color 0.3s ease;
            }

            .sidebar,
            .header,
            .stat-card,
            .action-btn,
            .leads-section,
            .sidebar-panel,
            .modal-content {
                transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
            }

            /* Mobile dark mode adjustments */
            @media (max-width: 768px) {
                body.dark-mode .sidebar {
                    background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
                }
                
                .theme-toggle {
                    width: 36px;
                    height: 36px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize sound system (CDN-powered with Howler.js)
     */
    initSounds() {
        if (typeof Howl !== 'undefined') {
            this.sounds = {
                success: new Howl({
                    src: ['https://cdn.jsdelivr.net/gh/goldfire/howler.js@2.2.3/examples/player/audio/rave_digger.webm'],
                    volume: 0.3
                }),
                warning: new Howl({
                    src: ['https://cdn.jsdelivr.net/gh/goldfire/howler.js@2.2.3/examples/player/audio/80s_vibe.webm'],
                    volume: 0.2
                }),
                upgrade: new Howl({
                    src: ['https://cdn.jsdelivr.net/gh/goldfire/howler.js@2.2.3/examples/player/audio/sound2.webm'],
                    volume: 0.4
                })
            };
        }
    }

    /**
     * Play sound effect
     * @param {string} soundName - Name of sound to play
     */
    playSound(soundName) {
        if (this.sounds && this.sounds[soundName]) {
            this.sounds[soundName].play();
        }
    }

    /**
     * Show professional toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type: success, warning, error, upgrade
     * @param {number} duration - Duration in milliseconds
     */
    showToast(message, type = 'success', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `steady-toast toast-${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${icon}</div>
                <div class="toast-message">${message}</div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;

        document.getElementById('toast-container').appendChild(toast);
        
        // Re-initialize Lucide icons for the close button
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);

        // Play appropriate sound
        this.playSound(type === 'upgrade' ? 'upgrade' : type);

        return toast;
    }

    /**
     * Get icon for toast type
     * @param {string} type - Toast type
     * @returns {string} Icon HTML
     */
    getToastIcon(type) {
        const icons = {
            success: '<i data-lucide="check-circle"></i>',
            warning: '<i data-lucide="alert-triangle"></i>',
            error: '<i data-lucide="x-circle"></i>',
            upgrade: '<i data-lucide="crown"></i>'
        };
        return icons[type] || icons.success;
    }

    /**
     * Create toast container if it doesn't exist
     */
    initToastContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
            this.addToastStyles();
        }
    }

    /**
     * Add toast styles to page
     */
    addToastStyles() {
        if (document.getElementById('toast-styles')) return;

        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                pointer-events: none;
            }

            .steady-toast {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                border: 1px solid #e5e7eb;
                min-width: 320px;
                max-width: 400px;
                pointer-events: auto;
                animation: toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(8px);
            }

            .toast-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem;
            }

            .toast-icon {
                flex-shrink: 0;
                width: 20px;
                height: 20px;
                color: #667eea;
            }

            .toast-success .toast-icon { color: #10b981; }
            .toast-warning .toast-icon { color: #f59e0b; }
            .toast-error .toast-icon { color: #ef4444; }
            .toast-upgrade .toast-icon { color: #8b5cf6; }

            .toast-message {
                flex: 1;
                font-size: 0.875rem;
                font-weight: 500;
                color: #374151;
                line-height: 1.4;
            }

            .toast-close {
                flex-shrink: 0;
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
                transition: all 0.2s ease;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .toast-close:hover {
                background: #f3f4f6;
                color: #6b7280;
            }

            .toast-upgrade {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border-color: transparent;
            }

            .toast-upgrade .toast-message {
                color: white;
            }

            .toast-upgrade .toast-icon {
                color: white;
            }

            .toast-upgrade .toast-close {
                color: rgba(255, 255, 255, 0.8);
            }

            .toast-upgrade .toast-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }

            @keyframes toastSlideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
            }

            @media (max-width: 640px) {
                .toast-container {
                    left: 1rem;
                    right: 1rem;
                    top: 1rem;
                }
                
                .steady-toast {
                    min-width: auto;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Check if user is approaching lead limit
     * @param {number} currentLeads - Current lead count
     * @returns {object} Limit check result
     */
    checkLeadLimit(currentLeads) {
        const percentage = (currentLeads / this.leadLimit) * 100;
        
        return {
            isNearLimit: percentage >= 80,
            isAtLimit: currentLeads >= this.leadLimit,
            percentage: Math.round(percentage),
            remaining: this.leadLimit - currentLeads,
            shouldShowUpgrade: percentage >= 60
        };
    }

    /**
     * Show professional upgrade modal
     * @param {string} trigger - What triggered the upgrade prompt
     * @param {object} options - Modal options
     */
    showUpgradeModal(trigger = 'general', options = {}) {
        const modal = document.createElement('div');
        modal.className = 'upgrade-modal-overlay';
        modal.innerHTML = this.getUpgradeModalHTML(trigger, options);
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeUpgradeModal(modal);
        });
        
        modal.querySelector('.upgrade-modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeUpgradeModal(modal);
            }
        });

        // Add modal styles
        this.addUpgradeModalStyles();
        
        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Play upgrade sound
        this.playSound('upgrade');

        // Analytics tracking
        this.trackEvent('upgrade_modal_shown', { trigger });
    }

    /**
     * Get upgrade modal HTML based on trigger
     * @param {string} trigger - What triggered the modal
     * @param {object} options - Modal options
     * @returns {string} Modal HTML
     */
    getUpgradeModalHTML(trigger, options) {
        const content = this.getUpgradeContent(trigger);
        
        return `
            <div class="upgrade-modal-overlay">
                <div class="upgrade-modal">
                    <div class="modal-header">
                        <h3>
                            <i data-lucide="zap"></i>
                            ${content.title}
                        </h3>
                        <button class="modal-close">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="upgrade-content">
                            <div class="upgrade-icon">
                                <i data-lucide="${content.icon}"></i>
                            </div>
                            <p class="upgrade-message">${content.message}</p>
                            <div class="upgrade-benefits">
                                ${content.benefits.map(benefit => `
                                    <div class="benefit-item">
                                        <i data-lucide="check"></i>
                                        <span>${benefit}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary modal-close">Maybe Later</button>
                        <a href="/auth/trial" class="btn-primary">
                            <i data-lucide="crown"></i>
                            Start Free Trial
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get upgrade content based on trigger
     * @param {string} trigger - What triggered the upgrade
     * @returns {object} Content object
     */
    getUpgradeContent(trigger) {
        const content = {
            lead_limit: {
                title: "You're Growing Fast! 🚀",
                icon: "trending-up",
                message: "You're approaching your 50 lead limit. Upgrade to Professional for 1,000 leads and advanced analytics!",
                benefits: [
                    "1,000 leads (20x more capacity)",
                    "Advanced analytics & insights", 
                    "Data export capabilities",
                    "Priority customer support"
                ]
            },
            analytics: {
                title: "Unlock Powerful Analytics 📊",
                icon: "bar-chart-3",
                message: "See detailed insights about your leads, conversion rates, and growth trends with Professional analytics.",
                benefits: [
                    "Advanced lead analytics",
                    "Conversion tracking",
                    "Performance insights",
                    "Custom reports & exports"
                ]
            },
            insights: {
                title: "AI-Powered Insights 🤖",
                icon: "lightbulb",
                message: "Get intelligent recommendations to improve your lead conversion and optimize your sales process.",
                benefits: [
                    "AI lead scoring",
                    "Smart recommendations",
                    "Conversion optimization tips",
                    "Predictive analytics"
                ]
            },
            schedule: {
                title: "Smart Scheduling 📅",
                icon: "calendar",
                message: "Automate follow-ups and never miss an opportunity with intelligent scheduling features.",
                benefits: [
                    "Automated follow-up reminders",
                    "Calendar integration",
                    "Smart scheduling",
                    "Task automation"
                ]
            },
            general: {
                title: "Unlock Your Potential 💎",
                icon: "crown",
                message: "You're doing great with the free tier! Unlock powerful features to accelerate your growth.",
                benefits: [
                    "1,000 leads (20x capacity)",
                    "Advanced analytics",
                    "AI-powered insights",
                    "Priority support"
                ]
            }
        };

        return content[trigger] || content.general;
    }

    /**
     * Close upgrade modal
     * @param {HTMLElement} modal - Modal element
     */
    closeUpgradeModal(modal) {
        modal.style.animation = 'modalSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = 'auto';
        }, 300);
    }

    /**
     * Add upgrade modal styles
     */
    addUpgradeModalStyles() {
        if (document.getElementById('upgrade-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'upgrade-modal-styles';
        style.textContent = `
            .upgrade-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(8px);
                animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .upgrade-modal {
                background: white;
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            }

            .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid #f1f5f9;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-header h3 {
                font-size: 1.25rem;
                font-weight: 700;
                color: #1a202c;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .modal-close {
                background: none;
                border: none;
                color: #6b7280;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 8px;
                transition: all 0.3s ease;
            }

            .modal-close:hover {
                background: #f1f5f9;
                color: #374151;
            }

            .modal-body {
                padding: 1.5rem;
            }

            .upgrade-content {
                text-align: center;
            }

            .upgrade-icon {
                width: 64px;
                height: 64px;
                margin: 0 auto 1rem;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }

            .upgrade-icon i {
                width: 32px;
                height: 32px;
                stroke-width: 2;
            }

            .upgrade-message {
                font-size: 1rem;
                color: #374151;
                margin-bottom: 1.5rem;
                line-height: 1.6;
            }

            .upgrade-benefits {
                text-align: left;
                margin: 1.5rem 0;
            }

            .benefit-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.5rem 0;
                font-size: 0.875rem;
                color: #374151;
            }

            .benefit-item i {
                width: 16px;
                height: 16px;
                color: #10b981;
                stroke-width: 2;
                flex-shrink: 0;
            }

            .modal-footer {
                padding: 1.5rem;
                border-top: 1px solid #f1f5f9;
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }

            .btn-primary,
            .btn-secondary {
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                border: none;
                font-size: 0.875rem;
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
            }

            .btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }

            .btn-secondary {
                background: #f1f5f9;
                color: #374151;
                border: 1px solid #e5e7eb;
            }

            .btn-secondary:hover {
                background: #e2e8f0;
                border-color: #cbd5e1;
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            @keyframes modalSlideOut {
                from {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: scale(0.95) translateY(-20px);
                }
            }

            @media (max-width: 640px) {
                .upgrade-modal {
                    width: 95%;
                    margin: 1rem;
                }
                
                .modal-footer {
                    flex-direction: column;
                }
                
                .btn-primary,
                .btn-secondary {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Format numbers for display
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }

    /**
     * Format date for display
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date
     */
    formatDate(date) {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays === 0) {
            if (diffHours === 0) return 'Just now';
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return d.toLocaleDateString();
        }
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Track analytics events
     * @param {string} event - Event name
     * @param {object} data - Event data
     */
    trackEvent(event, data = {}) {
        // Simple analytics tracking for free tier
        if (typeof gtag !== 'undefined') {
            gtag('event', event, {
                ...data,
                tier: this.tier
            });
        }
        
        console.log(`📊 Event: ${event}`, data);
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise} Copy promise
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
            return true;
        } catch (err) {
            this.showToast('Failed to copy to clipboard', 'error');
            return false;
        }
    }

    /**
     * Animate element with CSS classes
     * @param {HTMLElement} element - Element to animate
     * @param {string} animation - Animation class name
     * @param {number} duration - Animation duration
     */
    animate(element, animation, duration = 1000) {
        element.classList.add('animate__animated', `animate__${animation}`);
        
        setTimeout(() => {
            element.classList.remove('animate__animated', `animate__${animation}`);
        }, duration);
    }

    /**
     * Show loading state
     * @param {HTMLElement} element - Element to show loading on
     * @param {boolean} loading - Loading state
     */
    setLoading(element, loading) {
        if (loading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }

    /**
     * Get user's subscription tier
     * @returns {string} Subscription tier
     */
    getUserTier() {
        return this.tier;
    }

    /**
     * Check if feature is available in current tier
     * @param {string} feature - Feature name
     * @returns {boolean} Feature availability
     */
    isFeatureAvailable(feature) {
        const freeFeatures = [
            'basic_dashboard',
            'add_leads',
            'view_leads',
            'basic_stats',
            'settings'
        ];
        
        return freeFeatures.includes(feature);
    }
}

// Initialize and export
window.SteadyUtils = new SteadyUtils();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SteadyUtils;
}