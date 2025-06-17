/**
 * SteadyManager - Enhanced Free Tier Utilities
 * Lightweight, focused utilities that work perfectly with your system
 * Enhanced to work with AddLead modal and Settings
 */

class SteadyUtils {
    constructor() {
        this.tier = 'FREE';
        this.leadLimit = 50;
        this.sounds = null;
        this.darkMode = false;
        this.version = '2.0.0';
        
        // Animation and validation helpers
        this.animationFrames = new Map();
        this.validationCache = new Map();
        
        this.init();
    }

    /**
     * Initialize utilities
     */
    init() {
        this.initSounds();
        this.initToastContainer();
        this.initDarkMode();
        this.initValidationHelpers();
        this.initAnimationHelpers();
        console.log('🎯 SteadyManager Utils (Enhanced Free Tier) - Ready');
    }

    // ===== EXISTING THEME SYSTEM (KEEP AS IS) =====
    
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

    // Theme utilities for components
    theme = {
        get: () => this.darkMode ? 'dark' : 'light',
        set: (theme) => this.setTheme(theme),
        toggle: () => this.toggleTheme(),
        isDark: () => this.darkMode
    };

    // ===== EXISTING TOAST SYSTEM (ENHANCED) =====

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
            upgrade: '<i data-lucide="crown"></i>',
            info: '<i data-lucide="info"></i>'
        };
        return icons[type] || icons.success;
    }

    // ===== NEW VALIDATION HELPERS FOR ADDLEAD =====

    /**
     * Initialize validation helpers
     */
    initValidationHelpers() {
        // Email validation regex
        this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        this.phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    isEmail(email) {
        return this.emailRegex.test(email);
    }

    /**
     * Validate phone number
     * @param {string} phone - Phone to validate
     * @returns {boolean} Is valid phone
     */
    isPhone(phone) {
        if (!phone) return false;
        const cleaned = phone.replace(/\D/g, '');
        return this.phoneRegex.test(phone) && cleaned.length >= 10;
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} Is valid URL
     */
    isURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check password strength
     * @param {string} password - Password to check
     * @returns {boolean} Is strong password
     */
    isStrongPassword(password) {
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return strongRegex.test(password);
    }

    /**
     * Sanitize input text
     * @param {string} input - Input to sanitize
     * @param {string} type - Type of input (text, email, phone, etc.)
     * @returns {string} Sanitized input
     */
    sanitizeInput(input, type = 'text') {
        if (!input) return '';
        
        let sanitized = input.toString().trim();
        
        switch (type) {
            case 'email':
                return sanitized.toLowerCase();
            case 'phone':
                return sanitized.replace(/[^\d\+\-\(\)\s]/g, '');
            case 'number':
                return sanitized.replace(/[^\d\.\-]/g, '');
            case 'alphanumeric':
                return sanitized.replace(/[^a-zA-Z0-9]/g, '');
            case 'text':
            default:
                return this.escapeHtml(sanitized);
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== NEW ANIMATION HELPERS =====

    /**
     * Initialize animation helpers
     */
    initAnimationHelpers() {
        // Add animation styles if not already present
        this.addAnimationStyles();
    }

    /**
     * Animate element in
     * @param {HTMLElement|string} element - Element or selector
     * @param {object} options - Animation options
     * @returns {Promise} Animation promise
     */
    animateIn(element, options = {}) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return Promise.resolve();

        const config = {
            delay: 0,
            duration: 400,
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
            ...options
        };

        return new Promise((resolve) => {
            // Set initial state
            Object.assign(el.style, {
                opacity: config.from.opacity,
                transform: config.from.transform,
                transition: `all ${config.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
            });

            // Animate to final state
            setTimeout(() => {
                Object.assign(el.style, {
                    opacity: config.to.opacity,
                    transform: config.to.transform
                });

                setTimeout(resolve, config.duration);
            }, config.delay);
        });
    }

    /**
     * Animate element out
     * @param {HTMLElement|string} element - Element or selector
     * @param {object} options - Animation options
     * @returns {Promise} Animation promise
     */
    animateOut(element, options = {}) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return Promise.resolve();

        const config = {
            duration: 300,
            to: { opacity: 0, transform: 'translateY(-10px) scale(0.95)' },
            remove: false,
            ...options
        };

        return new Promise((resolve) => {
            el.style.transition = `all ${config.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            
            Object.assign(el.style, config.to);

            setTimeout(() => {
                if (config.remove && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
                resolve();
            }, config.duration);
        });
    }

    /**
     * Shake element (for errors)
     * @param {HTMLElement|string} element - Element or selector
     */
    shake(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;

        el.classList.add('shake-animation');
        setTimeout(() => {
            el.classList.remove('shake-animation');
        }, 600);
    }

    /**
     * Pulse element (for success)
     * @param {HTMLElement|string} element - Element or selector
     */
    pulse(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;

        el.classList.add('pulse-animation');
        setTimeout(() => {
            el.classList.remove('pulse-animation');
        }, 600);
    }

    /**
     * Animate counter
     * @param {HTMLElement|string} element - Element or selector
     * @param {number} targetValue - Target number
     * @param {object} options - Animation options
     */
    animateCounter(element, targetValue, options = {}) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return Promise.resolve();

        const config = {
            duration: 1000,
            suffix: '',
            prefix: '',
            ...options
        };

        const startValue = parseInt(el.textContent.replace(/\D/g, '')) || 0;
        const startTime = performance.now();

        return new Promise((resolve) => {
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / config.duration, 1);
                
                const currentValue = Math.round(startValue + (targetValue - startValue) * progress);
                
                el.textContent = config.prefix + currentValue + config.suffix;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    /**
     * Add animation styles
     */
    addAnimationStyles() {
        if (document.getElementById('utils-animations')) return;

        const style = document.createElement('style');
        style.id = 'utils-animations';
        style.textContent = `
            .shake-animation {
                animation: shake 0.6s ease-in-out;
            }

            .pulse-animation {
                animation: pulse 0.6s ease-in-out;
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                20%, 40%, 60%, 80% { transform: translateX(10px); }
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);
    }

    // ===== STORAGE HELPERS FOR SETTINGS =====

    /**
     * Storage utilities
     */
    storage = {
        set: (key, value, expiry = null) => {
            try {
                const data = {
                    value,
                    timestamp: Date.now(),
                    expiry: expiry ? Date.now() + expiry : null
                };
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.error('Storage set error:', error);
                return false;
            }
        },

        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                if (!item) return defaultValue;

                const data = JSON.parse(item);
                
                // Check expiry
                if (data.expiry && Date.now() > data.expiry) {
                    localStorage.removeItem(key);
                    return defaultValue;
                }

                return data.value;
            } catch (error) {
                console.error('Storage get error:', error);
                return defaultValue;
            }
        },

        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Storage remove error:', error);
                return false;
            }
        },

        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Storage clear error:', error);
                return false;
            }
        }
    };

    // ===== UTILITY HELPERS =====

    /**
     * Get initials from name
     * @param {string} name - Full name
     * @param {number} maxChars - Max characters
     * @returns {string} Initials
     */
    getInitials(name, maxChars = 2) {
        if (!name) return '??';
        
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].substring(0, maxChars).toUpperCase();
        }
        
        return words
            .slice(0, maxChars)
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase();
    }

    /**
     * Create modal using your existing approach
     * @param {string} title - Modal title
     * @param {string|HTMLElement} content - Modal content
     * @param {object} options - Modal options
     * @returns {object} Modal object with close method
     */
    createModal(title, content, options = {}) {
        const config = {
            size: 'medium',
            closeOnBackdrop: true,
            showClose: true,
            buttons: [],
            ...options
        };

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content modal-${config.size}">
                <div class="modal-header">
                    <h3>${this.escapeHtml(title)}</h3>
                    ${config.showClose ? '<button class="modal-close">×</button>' : ''}
                </div>
                <div class="modal-body">
                    ${typeof content === 'string' ? content : ''}
                </div>
                ${config.buttons.length > 0 ? `
                    <div class="modal-footer">
                        ${config.buttons.map(btn => `
                            <button class="btn btn-${btn.type || 'secondary'}" data-action="${btn.action || ''}">
                                ${this.escapeHtml(btn.text)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Add content if it's an element
        if (typeof content !== 'string') {
            const modalBody = modal.querySelector('.modal-body');
            modalBody.innerHTML = '';
            modalBody.appendChild(content);
        }

        // Basic modal styles
        this.addModalStyles();

        // Close functionality
        const closeModal = () => {
            modal.style.opacity = '0';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
            
            if (config.onClose) config.onClose();
        };

        // Event listeners
        if (config.showClose) {
            modal.querySelector('.modal-close').addEventListener('click', closeModal);
        }

        if (config.closeOnBackdrop) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        // Button actions
        config.buttons.forEach((btn, index) => {
            const buttonEl = modal.querySelectorAll('.modal-footer .btn')[index];
            if (buttonEl && btn.onClick) {
                buttonEl.addEventListener('click', () => {
                    const result = btn.onClick();
                    if (result !== false) closeModal();
                });
            }
        });

        document.body.appendChild(modal);

        return {
            element: modal,
            close: closeModal
        };
    }

    /**
     * Add basic modal styles
     */
    addModalStyles() {
        if (document.getElementById('utils-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'utils-modal-styles';
        style.textContent = `
            .modal-overlay {
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
                opacity: 1;
                transition: opacity 0.3s ease;
            }

            .modal-content {
                background: white;
                border-radius: 12px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                transform: scale(1);
                transition: transform 0.3s ease;
            }

            .modal-medium {
                max-width: 600px;
                width: 90%;
            }

            .modal-large {
                max-width: 800px;
                width: 90%;
            }

            .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-header h3 {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 600;
                color: #1f2937;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #6b7280;
                padding: 0.5rem;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            .modal-body {
                padding: 1.5rem;
            }

            .modal-footer {
                padding: 1rem 1.5rem;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 0.75rem;
                justify-content: flex-end;
            }

            /* Dark mode modal styles */
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
        `;
        document.head.appendChild(style);
    }

    // ===== EXISTING UTILITIES (KEEP AS IS) =====

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
            .toast-info .toast-icon { color: #3b82f6; }

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

            /* Dark mode toast styles */
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

    // ===== EXISTING UTILITIES (KEEP AS IS) =====

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

            /* Dark mode upgrade modal */
            body.dark-mode .upgrade-modal {
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

            body.dark-mode .upgrade-message {
                color: #cbd5e1;
            }

            body.dark-mode .benefit-item {
                color: #cbd5e1;
            }

            body.dark-mode .benefit-item i {
                color: #34d399;
            }

            body.dark-mode .btn-secondary {
                background: #334155;
                color: #e2e8f0;
                border-color: #475569;
            }

            body.dark-mode .btn-secondary:hover {
                background: #475569;
                border-color: #64748b;
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

    // ===== FORMATTING UTILITIES =====

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
     * @param {string} format - Format type (relative, short, long, etc.)
     * @returns {string} Formatted date
     */
    formatDate(date, format = 'relative') {
        if (!date) return 'Unknown';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffMs = now - d;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        switch (format) {
            case 'relative':
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
            case 'short':
                return d.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: diffDays > 365 ? 'numeric' : undefined
                });
            case 'long':
                return d.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            default:
                return d.toLocaleDateString();
        }
    }

    /**
     * Format currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     * @returns {string} Formatted currency
     */
    formatCurrency(amount, currency = 'USD') {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (error) {
            return `${this.formatNumber(amount || 0)}`;
        }
    }

    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ===== UTILITY FUNCTIONS =====

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
            this.showToast('Copied to clipboard! 📋', 'success');
            return true;
        } catch (err) {
            this.showToast('Failed to copy to clipboard', 'error');
            return false;
        }
    }

    /**
     * Download file
     * @param {string|Blob} data - File data
     * @param {string} filename - File name
     * @param {string} type - MIME type
     */
    downloadFile(data, filename, type = 'text/plain') {
        const blob = data instanceof Blob ? data : new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
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
// Alias for easier access
window.utils = window.SteadyUtils;

// Global functions for easy access
window.toast = (message, type, duration) => window.SteadyUtils.showToast(message, type, duration);
window.animate = (element, type) => {
    if (type === 'shake') return window.SteadyUtils.shake(element);
    if (type === 'pulse') return window.SteadyUtils.pulse(element);
    return window.SteadyUtils.animateIn(element);
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SteadyUtils;
}

console.log('🎯 Enhanced SteadyUtils (Free Tier) - Loaded & Ready!');
console.log('🔥 Perfect integration with AddLead and Settings components!');
console.log('✨ Available globally as: SteadyUtils, utils, toast(), animate()');

/**
 * 🎯 ENHANCED FEATURES FOR PERFECT INTEGRATION:
 * 
 * ✅ EXISTING FEATURES (Enhanced):
 * - Dark mode system with theme toggle
 * - Professional toast notifications
 * - Lead limit checking & upgrade modals
 * - Sound effects and analytics
 * - Mobile-responsive design
 * 
 * ✅ NEW INTEGRATION FEATURES:
 * - Validation helpers (isEmail, isPhone, isURL, etc.)
 * - Animation system (animateIn, animateOut, shake, pulse)
 * - Storage utilities with expiry support
 * - Modal system for components
 * - Sanitization and security helpers
 * - File download and clipboard utilities
 * - Formatting helpers (currency, dates, file sizes)
 * 
 * ✅ PERFECT FOR YOUR COMPONENTS:
 * - AddLead modal will use validation & animations
 * - Settings will use storage & theme management
 * - All components use consistent toasts & modals
 * - Dark mode works across everything
 * - Mobile-responsive throughout
 * 
 * USAGE EXAMPLES:
 * 
 * // Theme management (existing + enhanced)
 * utils.theme.get()        // 'light' or 'dark'
 * utils.theme.set('dark')  // Set specific theme
 * utils.theme.toggle()     // Toggle themes
 * 
 * // Validation (new for AddLead)
 * utils.isEmail('test@example.com')     // true
 * utils.isPhone('+1-555-123-4567')      // true
 * utils.isStrongPassword('MyPass123!')  // true
 * utils.sanitizeInput('<script>', 'text') // Safe text
 * 
 * // Animations (new for smooth UX)
 * utils.animateIn('.new-element')       // Fade in
 * utils.animateOut('.old-element')      // Fade out
 * utils.shake('#error-field')           // Error shake
 * utils.pulse('.success-button')        // Success pulse
 * utils.animateCounter('#stat', 150)    // Count up
 * 
 * // Storage (new for Settings)
 * utils.storage.set('key', data, expiry)  // Store with expiry
 * utils.storage.get('key', defaultValue)  // Get with default
 * utils.storage.remove('key')             // Remove
 * utils.storage.clear()                   // Clear all
 * 
 * // Modals (new for components)
 * utils.createModal('Title', content, {
 *     size: 'large',
 *     buttons: [
 *         { text: 'Cancel', type: 'secondary' },
 *         { text: 'Save', type: 'primary', onClick: saveAction }
 *     ]
 * })
 * 
 * // Utilities (enhanced)
 * utils.formatDate(new Date(), 'relative') // "2 hours ago"
 * utils.formatCurrency(1500)               // "$1,500"
 * utils.formatFileSize(1048576)            // "1 MB"
 * utils.copyToClipboard('text')            // Copy with toast
 * utils.downloadFile(data, 'file.csv')     // Download file
 * 
 * // Toast notifications (existing + enhanced)
 * toast('Success! 🎉', 'success')      // Quick toast
 * utils.showToast('Message', 'info', 3000) // Full options
 * 
 * // Global shortcuts (new)
 * animate('.element', 'shake')  // Quick animations
 * utils.debounce(fn, 300)      // Debounce function calls
 * 
 * Your enhanced SteadyUtils is now PERFECTLY integrated with:
 * ✅ Your existing dark mode system
 * ✅ AddLead modal (validation, animations, storage)
 * ✅ Settings system (storage, themes, modals)
 * ✅ Mobile responsiveness
 * ✅ Free tier focus with upgrade prompts
 * 
 * This approach keeps your lightweight, focused philosophy while
 * adding exactly the features needed for the new components!
 */