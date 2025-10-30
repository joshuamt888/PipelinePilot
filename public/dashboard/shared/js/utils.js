/**
 * SteadyUtils v6.0 - Enterprise Utility Library
 * 
 * Comprehensive utility toolkit for SteadyManager Pro
 * Features: Date/number formatting, notifications, animations, overlay management
 * 
 * @version 6.0.0
 * @license Proprietary - Steady Scaling LLC
 */

class SteadyUtils {
    constructor() {
        this.version = '6.0.0';
        this.device = this.detectDevice();
        this.activeToasts = new Map();
        this.setupGlobalStyles();
        console.log(`[SteadyUtils] v${this.version} initialized successfully`);
    }

    // =================================================================
    // DEVICE DETECTION & VIEWPORT MANAGEMENT
    // =================================================================
    
    /**
     * Detect device capabilities and viewport dimensions
     * @returns {Object} Device information object
     */
    detectDevice() {
        const ua = navigator.userAgent;
        const device = {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(ua),
            isTablet: /iPad|Android.*tablet/i.test(ua),
            isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(ua),
            hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        };

        window.addEventListener('resize', this.debounce(() => {
            device.viewportWidth = window.innerWidth;
            device.viewportHeight = window.innerHeight;
        }, 150));

        return device;
    }

    /**
     * Check if current viewport is mobile size
     * @returns {boolean}
     */
    isMobileView() { 
        return this.device.viewportWidth <= 768; 
    }

    /**
     * Check if current viewport is tablet size
     * @returns {boolean}
     */
    isTabletView() { 
        return this.device.viewportWidth > 768 && this.device.viewportWidth <= 1024; 
    }

    /**
     * Check if current viewport is desktop size
     * @returns {boolean}
     */
    isDesktopView() { 
        return this.device.viewportWidth > 1024; 
    }

    // =================================================================
    // DATE & TIME FORMATTING
    // =================================================================
    
    /**
     * Format date with various display styles
     * @param {Date|string} date - Date object or ISO string
     * @param {string} format - Format type: 'relative', 'short', 'long', 'time', 'datetime'
     * @returns {string} Formatted date string
     */
    formatDate(date, format = 'short') {
        if (!date) return 'N/A';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid date';

        const now = new Date();
        const diffMs = now - dateObj;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        switch (format) {
            case 'relative':
                if (diffMins < 1) return 'Just now';
                if (diffMins < 60) return `${diffMins}m ago`;
                if (diffHours < 24) return `${diffHours}h ago`;
                if (diffDays < 7) return `${diffDays}d ago`;
                return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            case 'short':
                return dateObj.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: diffDays > 365 ? 'numeric' : undefined
                });

            case 'long':
                return dateObj.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });

            case 'time':
                return dateObj.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true
                });

            case 'datetime':
                return dateObj.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

            default:
                return dateObj.toLocaleDateString();
        }
    }

    // =================================================================
    // NUMBER FORMATTING
    // =================================================================
    
    /**
     * Format number with locale-specific separators
     * @param {number} number - Number to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number string
     */
    formatNumber(number, decimals = 0) {
        if (typeof number !== 'number' || isNaN(number)) return '0';
        return number.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Format number as USD currency
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Format number as percentage
     * @param {number} value - Decimal value (0.85 = 85%)
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted percentage string
     */
    formatPercentage(value, decimals = 0) {
        if (typeof value !== 'number' || isNaN(value)) return '0%';
        return `${(value * 100).toFixed(decimals)}%`;
    }

    // =================================================================
    // STRING UTILITIES
    // =================================================================
    
    /**
     * Generate initials from name
     * @param {string} name - Full name
     * @param {number} maxChars - Maximum number of characters
     * @returns {string} Initials string
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
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} length - Maximum length
     * @returns {string} Truncated text with ellipsis
     */
    truncate(text, length = 50) {
        if (!text || text.length <= length) return text || '';
        return text.substring(0, length).trim() + '...';
    }

    /**
     * Capitalize first letter of string
     * @param {string} text - Text to capitalize
     * @returns {string} Capitalized text
     */
    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    // =================================================================
    // LOCAL STORAGE MANAGEMENT
    // =================================================================
    
    storage = {
        /**
         * Set item in localStorage with optional expiry
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         * @param {number|null} expiryMs - Expiry time in milliseconds
         * @returns {boolean} Success status
         */
        set: (key, value, expiryMs = null) => {
            try {
                const data = {
                    value,
                    expiry: expiryMs ? Date.now() + expiryMs : null
                };
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (e) {
                console.error('[SteadyUtils] Storage set failed:', e);
                return false;
            }
        },

        /**
         * Get item from localStorage with expiry check
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default value if not found or expired
         * @returns {*} Stored value or default value
         */
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                if (!item) return defaultValue;

                const data = JSON.parse(item);
                
                if (data.expiry && Date.now() > data.expiry) {
                    localStorage.removeItem(key);
                    return defaultValue;
                }

                return data.value;
            } catch (e) {
                console.error('[SteadyUtils] Storage get failed:', e);
                return defaultValue;
            }
        },

        /**
         * Remove item from localStorage
         * @param {string} key - Storage key
         * @returns {boolean} Success status
         */
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    // =================================================================
    // THEME MANAGEMENT
    // =================================================================
    
    theme = {
        /**
         * Get current theme
         * @returns {string} Current theme ('light' or 'dark')
         */
        get: () => document.documentElement.getAttribute('data-theme') || 'light',
        
        /**
         * Set theme
         * @param {string} theme - Theme name ('light' or 'dark')
         */
        set: (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            this.storage.set('dashboard-theme', theme);
        },

        /**
         * Toggle between light and dark themes
         * @returns {string} New theme name
         */
        toggle: () => {
            const current = this.theme.get();
            const newTheme = current === 'light' ? 'dark' : 'light';
            this.theme.set(newTheme);
            return newTheme;
        },

        /**
         * Check if dark theme is active
         * @returns {boolean}
         */
        isDark: () => this.theme.get() === 'dark'
    };

    // =================================================================
    // NOTIFICATION SYSTEM
    // =================================================================
    
    /**
     * Display toast notification with spam protection
     * @param {string} message - Message to display (will be XSS-escaped)
     * @param {string} type - Notification type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Display duration in milliseconds
     * @returns {HTMLElement} Toast element
     */
    showToast(message, type = 'info', duration = 4000) {
        // XSS Protection: Escape all user content
        const safeMessage = window.API ? window.API.escapeHtml(message) : message;
        
        // Spam Prevention: Check for duplicate toasts
        const toastKey = `${type}-${safeMessage}`;
        if (this.activeToasts.has(toastKey)) {
            return this.activeToasts.get(toastKey);
        }
        
        // Rate Limiting: Maximum 3 toasts visible simultaneously
        if (this.activeToasts.size >= 3) {
            const firstKey = this.activeToasts.keys().next().value;
            const oldestToast = this.activeToasts.get(firstKey);
            this.removeToast(oldestToast);
        }
        
        const toast = document.createElement('div');
        toast.className = `steady-toast steady-toast-${type}`;
        toast.dataset.key = toastKey;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        };

        toast.innerHTML = `
            <span class="steady-toast-icon">${icons[type] || icons.info}</span>
            <span class="steady-toast-message">${safeMessage}</span>
            <button class="steady-toast-close" aria-label="Close">×</button>
        `;

        this.activeToasts.set(toastKey, toast);
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('steady-toast-show');
        });

        const timeoutId = setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        toast.querySelector('.steady-toast-close').addEventListener('click', () => {
            clearTimeout(timeoutId);
            this.removeToast(toast);
        });

        return toast;
    }

    /**
     * Remove toast notification from DOM
     * @param {HTMLElement} toast - Toast element to remove
     */
    removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        const key = toast.dataset.key;
        if (key) {
            this.activeToasts.delete(key);
        }
        
        toast.classList.remove('steady-toast-show');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // =================================================================
    // PERFORMANCE UTILITIES
    // =================================================================
    
    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Minimum time between executions in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // =================================================================
    // ANIMATION UTILITIES
    // =================================================================
    
    /**
     * Animate element into view with slide-up effect
     * @param {HTMLElement|string} element - Element or selector
     * @param {number} delay - Animation delay in milliseconds
     */
    animateIn(element, delay = 0) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (!element) return;

        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, delay);
    }

    /**
     * Apply shake animation to element (for validation errors)
     * @param {HTMLElement|string} element - Element or selector
     */
    shake(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (!element) return;

        element.classList.add('steady-shake');
        setTimeout(() => {
            element.classList.remove('steady-shake');
        }, 600);
    }

    /**
     * Fade in element
     * @param {HTMLElement|string} element - Element or selector
     * @param {number} duration - Animation duration in milliseconds
     */
    fadeIn(element, duration = 300) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (!element) return;

        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    }

    /**
     * Fade out element
     * @param {HTMLElement|string} element - Element or selector
     * @param {number} duration - Animation duration in milliseconds
     * @param {Function} callback - Callback function to execute after fade out
     */
    fadeOut(element, duration = 300, callback) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (!element) return;

        element.style.transition = `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        element.style.opacity = '0';

        setTimeout(() => {
            if (callback) callback();
        }, duration);
    }

    // =================================================================
    // OVERLAY SYSTEM UTILITIES
    // =================================================================
    
    /**
     * Generate unique ID for overlay elements
     * @returns {string} Unique identifier
     */
    generateId() {
        return `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Lock body scroll (for modal/overlay display)
     */
    lockScroll() {
        document.body.style.overflow = 'hidden';
    }

    /**
     * Unlock body scroll
     */
    unlockScroll() {
        document.body.style.overflow = '';
    }

    /**
     * Apply blur effect to background elements
     */
    blurBackground() {
        const main = document.querySelector('.main-content');
        const sidebar = document.querySelector('.sidebar');
        if (main) main.style.filter = 'blur(4px)';
        if (sidebar) sidebar.style.filter = 'blur(4px)';
    }

    /**
     * Remove blur effect from background elements
     */
    unblurBackground() {
        const main = document.querySelector('.main-content');
        const sidebar = document.querySelector('.sidebar');
        if (main) main.style.filter = '';
        if (sidebar) sidebar.style.filter = '';
    }

    /**
     * Create button element with consistent styling
     * @param {string} text - Button text
     * @param {string} variant - Button variant: 'primary', 'secondary', 'danger', 'ghost'
     * @param {Function} onClick - Click handler function
     * @returns {HTMLButtonElement} Button element
     */
    createButton(text, variant = 'primary', onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = `steady-btn steady-btn-${variant}`;
        if (onClick) btn.onclick = onClick;
        return btn;
    }

    /**
     * Set up escape key handler for closing overlays
     * @param {Function} callback - Function to call when escape is pressed
     * @returns {Function} Event handler function
     */
    closeOnEscape(callback) {
        const handler = (e) => {
            if (e.key === 'Escape') {
                callback();
                document.removeEventListener('keydown', handler);
            }
        };
        document.addEventListener('keydown', handler);
        return handler;
    }

    // =================================================================
    // GLOBAL STYLES INJECTION
    // =================================================================
    
    /**
     * Inject global utility styles into document head
     * @private
     */
    setupGlobalStyles() {
        const style = document.createElement('style');
        style.id = 'steady-utils-styles';
        style.textContent = `
            /* Toast Notification System */
            .steady-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                min-width: 300px;
                max-width: 400px;
                background: var(--surface);
                border: 1px solid var(--border);
                border-left-width: 4px;
                border-radius: var(--radius-lg);
                padding: 1rem 1.25rem;
                box-shadow: var(--shadow-lg);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                z-index: 3000;
                opacity: 0;
                transform: translateX(100%) translateY(20px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: auto;
                margin-bottom: 0.75rem;
            }

            .steady-toast-show {
                opacity: 1;
                transform: translateX(0) translateY(0) scale(1);
            }

            .steady-toast-success { border-left-color: var(--success); }
            .steady-toast-error { border-left-color: var(--danger); }
            .steady-toast-warning { border-left-color: var(--warning); }
            .steady-toast-info { border-left-color: var(--info); }

            .steady-toast-icon {
                font-size: 1.25rem;
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
            }

            .steady-toast-message {
                flex: 1;
                color: var(--text-primary);
                font-weight: 500;
                font-size: 0.875rem;
                line-height: 1.4;
            }

            .steady-toast-close {
                background: none;
                border: none;
                color: var(--text-tertiary);
                cursor: pointer;
                font-size: 1.5rem;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--radius);
                transition: var(--transition);
                flex-shrink: 0;
                line-height: 1;
            }

            .steady-toast-close:hover {
                background: var(--surface-hover);
                color: var(--text-primary);
            }

            /* Animation Utilities */
            .steady-shake {
                animation: steadyShake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97);
            }

            @keyframes steadyShake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                20%, 40%, 60%, 80% { transform: translateX(10px); }
            }

            /* Button System */
            .steady-btn {
                padding: 0.625rem 1.25rem;
                border: none;
                border-radius: var(--radius);
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: var(--transition);
                font-family: inherit;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            }

            .steady-btn-primary {
                background: var(--primary);
                color: white;
            }

            .steady-btn-primary:hover {
                background: var(--primary-dark);
                transform: translateY(-1px);
            }

            .steady-btn-secondary {
                background: var(--surface-hover);
                color: var(--text-primary);
                border: 1px solid var(--border);
            }

            .steady-btn-secondary:hover {
                background: var(--border);
            }

            .steady-btn-danger {
                background: var(--danger);
                color: white;
            }

            .steady-btn-danger:hover {
                background: #dc2626;
                transform: translateY(-1px);
            }

            .steady-btn-ghost {
                background: transparent;
                color: var(--text-secondary);
                border: 1px solid transparent;
            }

            .steady-btn-ghost:hover {
                background: var(--surface-hover);
                border-color: var(--border);
            }

            /* Mobile Responsive */
            @media (max-width: 768px) {
                .steady-toast {
                    left: 20px;
                    right: 20px;
                    min-width: auto;
                    max-width: none;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// =================================================================
// GLOBAL INITIALIZATION
// =================================================================

const SteadyUtilsInstance = new SteadyUtils();
window.SteadyUtils = SteadyUtilsInstance;
window.toast = SteadyUtilsInstance.showToast.bind(SteadyUtilsInstance);

console.log('[SteadyUtils] Enterprise utility library ready for production use');