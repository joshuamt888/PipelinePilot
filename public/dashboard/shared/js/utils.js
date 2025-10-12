/**
 * STEADYUTILS v4.0 - SECURE & MODERN
 * 
 * Lightweight utility toolkit for SteadyManager dashboard
 * Theme-integrated, XSS-safe, spam-protected notifications
 * 
 * @version 4.0.0
 */

class SteadyUtils {
    constructor() {
        this.version = '4.0.0';
        this.device = this.detectDevice();
        this.activeToasts = new Map(); // Track active toasts by message
        this.setupGlobalStyles();
        console.log('SteadyUtils v4.0 loaded');
    }

    // DEVICE DETECTION
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

        // Update on resize
        window.addEventListener('resize', this.debounce(() => {
            device.viewportWidth = window.innerWidth;
            device.viewportHeight = window.innerHeight;
        }, 150));

        return device;
    }

    isMobileView() { return this.device.viewportWidth <= 768; }
    isTabletView() { return this.device.viewportWidth > 768 && this.device.viewportWidth <= 1024; }
    isDesktopView() { return this.device.viewportWidth > 1024; }

    // DATE FORMATTING
    formatDate(date, format = 'relative') {
        if (!date) return 'Unknown';
        
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
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

            default:
                return dateObj.toLocaleDateString();
        }
    }

    // NUMBER FORMATTING
    formatNumber(number, decimals = 0) {
        if (typeof number !== 'number' || isNaN(number)) return '0';
        return number.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    formatCurrency(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatPercentage(value, decimals = 0) {
        if (typeof value !== 'number' || isNaN(value)) return '0%';
        return `${(value * 100).toFixed(decimals)}%`;
    }

    // STRING UTILITIES
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

    truncate(text, length = 50) {
        if (!text || text.length <= length) return text || '';
        return text.substring(0, length).trim() + '...';
    }

    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    // STORAGE (with expiry support)
    storage = {
        set: (key, value, expiryMs = null) => {
            try {
                const data = {
                    value,
                    expiry: expiryMs ? Date.now() + expiryMs : null
                };
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (e) {
                console.error('Storage set failed:', e);
                return false;
            }
        },

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
                console.error('Storage get failed:', e);
                return defaultValue;
            }
        },

        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    // THEME MANAGEMENT
    theme = {
        get: () => document.documentElement.getAttribute('data-theme') || 'light',
        
        set: (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            this.storage.set('dashboard-theme', theme);
        },

        toggle: () => {
            const current = this.theme.get();
            const newTheme = current === 'light' ? 'dark' : 'light';
            this.theme.set(newTheme);
            return newTheme;
        },

        isDark: () => this.theme.get() === 'dark'
    };

    // TOAST NOTIFICATIONS (spam-protected, theme-aware, XSS-safe)
    showToast(message, type = 'info', duration = 4000) {
        // SECURITY: All user content must be escaped via API.escapeHtml
        const safeMessage = window.API ? window.API.escapeHtml(message) : message;
        
        // SPAM PREVENTION: Check if identical toast already exists
        const toastKey = `${type}-${safeMessage}`;
        if (this.activeToasts.has(toastKey)) {
            // Toast with same message already showing, ignore duplicate
            return this.activeToasts.get(toastKey);
        }
        
        // RATE LIMITING: Max 3 toasts visible at once
        if (this.activeToasts.size >= 3) {
            // Remove oldest toast to make room
            const firstKey = this.activeToasts.keys().next().value;
            const oldestToast = this.activeToasts.get(firstKey);
            this.removeToast(oldestToast);
        }
        
        const toast = document.createElement('div');
        toast.className = `steady-toast steady-toast-${type}`;
        toast.dataset.key = toastKey;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="steady-toast-icon">${icons[type] || icons.info}</span>
            <span class="steady-toast-message">${safeMessage}</span>
            <button class="steady-toast-close" aria-label="Close">×</button>
        `;

        // Track this toast
        this.activeToasts.set(toastKey, toast);
        
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('steady-toast-show');
        });

        // Auto remove
        const timeoutId = setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        // Close button
        toast.querySelector('.steady-toast-close').addEventListener('click', () => {
            clearTimeout(timeoutId);
            this.removeToast(toast);
        });

        return toast;
    }

    removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        // Remove from tracking
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

    // PERFORMANCE UTILITIES
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

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

    // ANIMATION HELPERS
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

    // GLOBAL STYLES
    setupGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Toast Notifications - Theme Integrated & Spam Protected */
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

            .steady-toast-success {
                border-left-color: var(--success);
            }

            .steady-toast-error {
                border-left-color: var(--danger);
            }

            .steady-toast-warning {
                border-left-color: var(--warning);
            }

            .steady-toast-info {
                border-left-color: var(--info);
            }

            .steady-toast-icon {
                font-size: 1.25rem;
                flex-shrink: 0;
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

// Create global instance
const utils = new SteadyUtils();
window.SteadyUtils = utils;
window.toast = utils.showToast.bind(utils);

console.log('SteadyUtils v4.0 ready - spam protection active');

/**
 * USAGE EXAMPLES:
 * 
 * // Date formatting
 * SteadyUtils.formatDate(new Date(), 'relative'); // "2h ago"
 * SteadyUtils.formatDate(lead.created_at, 'short'); // "Jan 15"
 * 
 * // Numbers
 * SteadyUtils.formatNumber(1234.56, 2); // "1,234.56"
 * SteadyUtils.formatCurrency(2500); // "$2,500"
 * SteadyUtils.formatPercentage(0.856, 1); // "85.6%"
 * 
 * // Strings
 * SteadyUtils.getInitials('John Smith'); // "JS"
 * SteadyUtils.truncate('Long text here...', 20); // "Long text here..."
 * 
 * // Storage
 * SteadyUtils.storage.set('key', value, 86400000); // 24h expiry
 * const data = SteadyUtils.storage.get('key', defaultValue);
 * 
 * // Theme
 * SteadyUtils.theme.toggle(); // Switch theme
 * SteadyUtils.theme.set('dark'); // Force dark
 * const isDark = SteadyUtils.theme.isDark(); // Check
 * 
 * // Toasts (spam protected - duplicates ignored, max 3 on screen)
 * toast(API.escapeHtml(userMessage), 'success');
 * SteadyUtils.showToast('Saved!', 'success', 3000);
 * 
 * // Rapid fire - only shows once
 * toast('Lead created!', 'success');
 * toast('Lead created!', 'success'); // Ignored - duplicate
 * toast('Lead created!', 'success'); // Ignored - duplicate
 * 
 * // Animations
 * SteadyUtils.animateIn('.stat-card', 100);
 * SteadyUtils.shake('#error-field');
 * 
 * // Performance
 * const debouncedSearch = SteadyUtils.debounce(search, 300);
 * const throttledScroll = SteadyUtils.throttle(handler, 100);
 * 
 * // Device
 * if (SteadyUtils.isMobileView()) { 
 *     // Mobile-specific layout 
 * }
 */