/**
 * 🛠️ LEGENDARY UTILS.JS - THE SECRET SAUCE TOOLKIT
 * 
 * This is the MAGIC TOOLKIT that makes everything feel PREMIUM!
 * Every smooth animation, every perfect format, every slick interaction
 * flows through these legendary utilities.
 * 
 * Features:
 * ✅ Smooth animations & transitions
 * ✅ Date/time formatting perfection
 * ✅ Mobile detection & responsive helpers
 * ✅ Data validation & sanitization
 * ✅ Performance optimizations
 * ✅ Theme management utilities
 * ✅ Toast notification system
 * ✅ Local storage management
 * ✅ Event handling helpers
 * ✅ Math & calculation utilities
 * 
 * @version 3.0.0 - LEGENDARY THEMED EDITION
 * @author SteadyManager Team - The Legends
 */

class LegendarySteadyUtils {
    constructor() {
        this.version = '3.0.0';
        this.initialized = false;
        this.device = {};
        this.performance = {};
        this.cache = new Map();
        
        // Animation frame tracking
        this.animationFrames = new Map();
        
        // Event listeners storage
        this.eventListeners = new Map();
        
        // Performance monitoring
        this.perfStart = performance.now();
        
        this.init();
        
        console.log('🛠️ Legendary SteadyUtils v3.0.0 - Themed Edition initialized!');
    }

    init() {
        this.detectDevice();
        this.setupPerformanceMonitoring();
        this.initializeAnimationSystem();
        this.setupGlobalStyles();
        this.initialized = true;
        
        console.log('✅ Utils toolkit ready to make magic happen!');
    }

    // 📱 DEVICE & RESPONSIVE DETECTION
    detectDevice() {
        const ua = navigator.userAgent;
        const screen = window.screen;
        
        this.device = {
            // Basic device type
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isTablet: /iPad|Android.*tablet|Kindle|Silk/i.test(ua),
            isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            
            // Specific platforms
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            isMac: /Mac/.test(navigator.platform),
            isWindows: /Win/.test(navigator.platform),
            
            // Browser detection
            isChrome: /Chrome/.test(ua) && !/Edge/.test(ua),
            isFirefox: /Firefox/.test(ua),
            isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
            isEdge: /Edge/.test(ua),
            
            // Screen info
            screenWidth: screen.width,
            screenHeight: screen.height,
            pixelRatio: window.devicePixelRatio || 1,
            
            // Viewport info
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            
            // Touch support
            hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            
            // Performance indicators
            hardwareConcurrency: navigator.hardwareConcurrency || 4,
            
            // Network info (if available)
            connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection
        };

        // Update on resize
        window.addEventListener('resize', this.debounce(() => {
            this.device.viewportWidth = window.innerWidth;
            this.device.viewportHeight = window.innerHeight;
            this.emit('device:resize', this.device);
        }, 150));

        console.log('📱 Device detected:', this.getDeviceInfo());
    }

    getDeviceInfo() {
        const { isMobile, isTablet, isDesktop } = this.device;
        if (isMobile) return 'Mobile';
        if (isTablet) return 'Tablet';
        if (isDesktop) return 'Desktop';
        return 'Unknown';
    }

    // Responsive breakpoint helpers
    isMobileView() {
        return this.device.viewportWidth <= 768;
    }

    isTabletView() {
        return this.device.viewportWidth > 768 && this.device.viewportWidth <= 1024;
    }

    isDesktopView() {
        return this.device.viewportWidth > 1024;
    }

    // 🎬 ANIMATION SYSTEM - THE MAGIC MAKER (Enhanced with Theme Variables)
    initializeAnimationSystem() {
        // CSS custom properties for dynamic animations - matching index.html theme
        document.documentElement.style.setProperty('--transition-fast', '0.15s cubic-bezier(0.4, 0, 0.2, 1)');
        document.documentElement.style.setProperty('--transition-base', '0.25s cubic-bezier(0.4, 0, 0.2, 1)');
        document.documentElement.style.setProperty('--transition-slow', '0.4s cubic-bezier(0.4, 0, 0.2, 1)');
        document.documentElement.style.setProperty('--transition-bounce', '0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)');
    }

    // Smooth element entrance animation
    animateIn(element, options = {}) {
        const config = {
            delay: 0,
            duration: 600,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
            ...options
        };

        if (typeof element === 'string') {
            element = document.querySelector(element);
        }

        if (!element) return Promise.resolve();

        return new Promise((resolve) => {
            // Set initial state
            Object.assign(element.style, {
                opacity: config.from.opacity,
                transform: config.from.transform,
                transition: `all ${config.duration}ms ${config.easing}`
            });

            // Animate to final state
            setTimeout(() => {
                Object.assign(element.style, {
                    opacity: config.to.opacity,
                    transform: config.to.transform
                });

                setTimeout(resolve, config.duration);
            }, config.delay);
        });
    }

    // Staggered animation for multiple elements
    animateInStagger(elements, options = {}) {
        const config = {
            staggerDelay: 150,
            duration: 600,
            ...options
        };

        if (typeof elements === 'string') {
            elements = document.querySelectorAll(elements);
        }

        const promises = Array.from(elements).map((element, index) => {
            return this.animateIn(element, {
                ...config,
                delay: index * config.staggerDelay
            });
        });

        return Promise.all(promises);
    }

    // Smooth element exit animation
    animateOut(element, options = {}) {
        const config = {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            to: { opacity: 0, transform: 'translateY(-10px) scale(0.95)' },
            ...options
        };

        if (typeof element === 'string') {
            element = document.querySelector(element);
        }

        if (!element) return Promise.resolve();

        return new Promise((resolve) => {
            element.style.transition = `all ${config.duration}ms ${config.easing}`;
            
            Object.assign(element.style, config.to);

            setTimeout(() => {
                if (config.remove && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                resolve();
            }, config.duration);
        });
    }

    // Counter animation with easing
    animateCounter(element, targetValue, options = {}) {
        const config = {
            duration: 1000,
            suffix: '',
            prefix: '',
            easing: 'easeOutCubic',
            ...options
        };

        if (typeof element === 'string') {
            element = document.querySelector(element);
        }

        if (!element) return Promise.resolve();

        const startValue = parseInt(element.textContent.replace(/\D/g, '')) || 0;
        const startTime = performance.now();

        const easingFunctions = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeOutCubic: t => 1 - Math.pow(1 - t, 3),
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
        };

        const easing = easingFunctions[config.easing] || easingFunctions.easeOutCubic;

        return new Promise((resolve) => {
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / config.duration, 1);
                
                const easedProgress = easing(progress);
                const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
                
                element.textContent = config.prefix + currentValue + config.suffix;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    // Shake animation for errors
    shake(element, options = {}) {
        const config = {
            intensity: 10,
            duration: 600,
            ...options
        };

        if (typeof element === 'string') {
            element = document.querySelector(element);
        }

        if (!element) return;

        const originalTransform = element.style.transform;
        element.style.transition = 'none';

        let startTime = null;
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = elapsed / config.duration;

            if (progress < 1) {
                const offset = Math.sin(progress * Math.PI * 6) * config.intensity * (1 - progress);
                element.style.transform = `translateX(${offset}px)`;
                requestAnimationFrame(animate);
            } else {
                element.style.transform = originalTransform;
                element.style.transition = '';
            }
        };

        requestAnimationFrame(animate);
    }

    // Pulse animation for attention
    pulse(element, options = {}) {
        const config = {
            scale: 1.05,
            duration: 300,
            ...options
        };

        if (typeof element === 'string') {
            element = document.querySelector(element);
        }

        if (!element) return;

        const originalTransform = element.style.transform;
        
        element.style.transition = `transform ${config.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        element.style.transform = `scale(${config.scale})`;

        setTimeout(() => {
            element.style.transform = originalTransform;
        }, config.duration);
    }

    // 📅 DATE & TIME FORMATTING - PERFECTION
    formatDate(date, format = 'relative') {
        if (!date) return 'Unknown';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid date';

        const now = new Date();
        const diffMs = now - dateObj;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        switch (format) {
            case 'relative':
                if (diffMinutes < 1) return 'Just now';
                if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
                if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
                return dateObj.toLocaleDateString();

            case 'short':
                return dateObj.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: diffDays > 365 ? 'numeric' : undefined
                });

            case 'long':
                return dateObj.toLocaleDateString('en-US', { 
                    weekday: 'long',
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
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

            case 'iso':
                return dateObj.toISOString();

            default:
                return dateObj.toLocaleDateString();
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    // 🔢 NUMBER & CURRENCY FORMATTING
    formatNumber(number, options = {}) {
        const config = {
            decimals: 0,
            thousands: ',',
            prefix: '',
            suffix: '',
            ...options
        };

        if (typeof number !== 'number' || isNaN(number)) {
            return config.prefix + '0' + config.suffix;
        }

        const fixed = number.toFixed(config.decimals);
        const parts = fixed.split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.thousands);
        const formatted = parts[1] ? integerPart + '.' + parts[1] : integerPart;

        return config.prefix + formatted + config.suffix;
    }

    formatCurrency(amount, currency = 'USD') {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (error) {
            return `$${this.formatNumber(amount || 0, { decimals: 2 })}`;
        }
    }

    formatPercentage(value, decimals = 1) {
        if (typeof value !== 'number' || isNaN(value)) return '0%';
        return `${(value * 100).toFixed(decimals)}%`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 🔤 STRING UTILITIES - TEXT MAGIC
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    truncate(text, length = 50, suffix = '...') {
        if (!text || text.length <= length) return text;
        return text.substring(0, length).trim() + suffix;
    }

    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    titleCase(text) {
        if (!text) return '';
        return text.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

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

    highlightText(text, query) {
        if (!query || !text) return this.escapeHtml(text);
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ✅ VALIDATION UTILITIES - DATA INTEGRITY
    isEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isPhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }

    isURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    isStrongPassword(password) {
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return strongRegex.test(password);
    }

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

    // 💾 LOCAL STORAGE MANAGEMENT
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
        },

        size: () => {
            return localStorage.length;
        }
    };

    // 🎨 THEME UTILITIES (Enhanced to match index.html)
    theme = {
        get: () => {
            return document.documentElement.getAttribute('data-theme') || 'light';
        },

        set: (theme) => {
            // Add transition class to prevent click issues during theme change
            document.body.classList.add('theme-transitioning');
            
            document.documentElement.setAttribute('data-theme', theme);
            this.storage.set('dashboard-theme', theme);
            
            // Remove transition class after animation
            setTimeout(() => {
                document.body.classList.remove('theme-transitioning');
            }, 300);
            
            this.emit('theme:changed', theme);
        },

        toggle: () => {
            const current = this.theme.get();
            const newTheme = current === 'light' ? 'dark' : 'light';
            this.theme.set(newTheme);
            return newTheme;
        },

        isDark: () => {
            return this.theme.get() === 'dark';
        }
    };

    // 🔔 TOAST NOTIFICATION SYSTEM (Enhanced with Theme Support)
    showToast(message, type = 'info', options = {}) {
        const config = {
            duration: 4000,
            position: 'bottom-right',
            showClose: true,
            ...options
        };

        const toast = document.createElement('div');
        toast.className = `utils-toast utils-toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌', 
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <div class="utils-toast-content">
                <span class="utils-toast-icon">${icons[type] || icons.info}</span>
                <span class="utils-toast-message">${this.escapeHtml(message)}</span>
                ${config.showClose ? '<button class="utils-toast-close" aria-label="Close">×</button>' : ''}
            </div>
        `;

        // Base styling matching theme
        Object.assign(toast.style, {
            position: 'fixed',
            zIndex: '3000',
            minWidth: '300px',
            maxWidth: '400px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            transition: 'var(--transition)',
            transform: 'translateX(100%) translateY(20px) scale(0.95)',
            opacity: '0',
            pointerEvents: 'auto'
        });

        // Type-specific border colors
        const borderColors = {
            success: 'var(--success)',
            error: 'var(--danger)',
            warning: 'var(--warning)',
            info: 'var(--info)'
        };
        toast.style.borderLeftColor = borderColors[type] || borderColors.info;
        toast.style.borderLeftWidth = '4px';

        // Position
        const positions = {
            'top-right': { top: '20px', right: '20px' },
            'top-left': { top: '20px', left: '20px' },
            'bottom-right': { bottom: '20px', right: '20px' },
            'bottom-left': { bottom: '20px', left: '20px' }
        };
        Object.assign(toast.style, positions[config.position] || positions['bottom-right']);

        document.body.appendChild(toast);

        // Animate in with theme-aware animation
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0) translateY(0) scale(1)';
            toast.style.opacity = '1';
        });

        // Auto remove
        const timeoutId = setTimeout(() => {
            this.removeToast(toast);
        }, config.duration);

        // Close button
        const closeBtn = toast.querySelector('.utils-toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(timeoutId);
                this.removeToast(toast);
            });
        }

        return toast;
    }

    removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.style.transform = 'translateX(100%) translateY(20px) scale(0.95)';
        toast.style.opacity = '0';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // 🎯 PERFORMANCE UTILITIES
    setupPerformanceMonitoring() {
        this.performance = {
            loadTime: 0,
            renderTime: 0,
            memoryUsage: 0
        };

        // Page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                this.performance.loadTime = perfData.loadEventEnd - perfData.fetchStart;
                console.log(`⚡ Page loaded in ${this.performance.loadTime}ms`);
            }, 0);
        });

        // Memory monitoring (if available)
        if (performance.memory) {
            setInterval(() => {
                this.performance.memoryUsage = performance.memory.usedJSHeapSize;
            }, 30000); // Check every 30 seconds
        }
    }

    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
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

    measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`⚡ ${name} took ${(end - start).toFixed(2)}ms`);
        return result;
    }

    // 🎪 EVENT SYSTEM
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener error for ${event}:`, error);
                }
            });
        }
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // 🧮 MATH UTILITIES
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    roundToDecimals(number, decimals) {
        const factor = Math.pow(10, decimals);
        return Math.round(number * factor) / factor;
    }

    // 🎨 COLOR UTILITIES
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // 🔧 DOM UTILITIES
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'dataset') {
                Object.assign(element.dataset, attributes[key]);
            } else if (key.startsWith('on') && typeof attributes[key] === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), attributes[key]);
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Element) {
                element.appendChild(child);
            }
        });

        return element;
    }

    ready(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    // 🔗 URL UTILITIES
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    updateUrlParam(key, value) {
        const url = new URL(window.location);
        if (value === null || value === undefined) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
        window.history.replaceState({}, '', url);
    }

    // 📋 CLIPBOARD UTILITIES
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                this.showToast('Copied to clipboard! 📋', 'success');
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const success = document.execCommand('copy');
                textArea.remove();
                
                if (success) {
                    this.showToast('Copied to clipboard! 📋', 'success');
                }
                return success;
            }
        } catch (error) {
            console.error('Copy failed:', error);
            this.showToast('Failed to copy to clipboard', 'error');
            return false;
        }
    }

    // 📁 FILE UTILITIES
    formatFileType(filename) {
        if (!filename) return 'Unknown';
        
        const ext = filename.split('.').pop().toLowerCase();
        const types = {
            // Images
            jpg: 'Image', jpeg: 'Image', png: 'Image', gif: 'Image', webp: 'Image', svg: 'Image',
            // Documents
            pdf: 'PDF', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', ppt: 'PowerPoint', pptx: 'PowerPoint',
            // Data
            csv: 'CSV', json: 'JSON', xml: 'XML',
            // Archive
            zip: 'Archive', rar: 'Archive', '7z': 'Archive',
            // Other
            txt: 'Text', md: 'Markdown'
        };
        
        return types[ext] || ext.toUpperCase();
    }

    downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    // 🎲 RANDOM UTILITIES
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    generatePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // 🎪 MODAL SYSTEM (Enhanced with Theme Support)
    createModal(title, content, options = {}) {
        const config = {
            size: 'medium', // small, medium, large, fullscreen
            closeOnBackdrop: true,
            showClose: true,
            buttons: [],
            ...options
        };

        const modal = document.createElement('div');
        modal.className = 'utils-modal-overlay';
        modal.innerHTML = `
            <div class="utils-modal-content utils-modal-${config.size}">
                <div class="utils-modal-header">
                    <h3 class="utils-modal-title">${this.escapeHtml(title)}</h3>
                    ${config.showClose ? '<button class="utils-modal-close-btn" aria-label="Close">×</button>' : ''}
                </div>
                <div class="utils-modal-body">
                    ${typeof content === 'string' ? content : ''}
                </div>
                ${config.buttons.length > 0 ? `
                    <div class="utils-modal-footer">
                        ${config.buttons.map(btn => `
                            <button class="utils-btn utils-btn-${btn.type || 'secondary'}" data-action="${btn.action || ''}">
                                ${this.escapeHtml(btn.text)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Add content if it's an element
        if (typeof content !== 'string') {
            const modalBody = modal.querySelector('.utils-modal-body');
            modalBody.innerHTML = '';
            modalBody.appendChild(content);
        }

        // Theme-aware styling
        Object.assign(modal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '9999',
            opacity: '0',
            transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: '2rem'
        });

        const modalContent = modal.querySelector('.utils-modal-content');
        Object.assign(modalContent.style, {
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            maxHeight: '90vh',
            overflow: 'auto',
            transform: 'scale(0.9) translateY(20px)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)'
        });

        // Size variants
        const sizes = {
            small: { maxWidth: '400px', width: '90%' },
            medium: { maxWidth: '600px', width: '90%' },
            large: { maxWidth: '800px', width: '90%' },
            fullscreen: { width: '95vw', height: '95vh', maxWidth: 'none' }
        };
        Object.assign(modalContent.style, sizes[config.size] || sizes.medium);

        // Event handlers
        const closeModal = () => {
            modal.style.opacity = '0';
            modalContent.style.transform = 'scale(0.9) translateY(20px)';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
            
            if (config.onClose) config.onClose();
        };

        // Close button
        const closeBtn = modal.querySelector('.utils-modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // Backdrop click
        if (config.closeOnBackdrop) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        // Button actions
        config.buttons.forEach((btn, index) => {
            const buttonEl = modal.querySelectorAll('.utils-modal-footer .utils-btn')[index];
            if (buttonEl && btn.onClick) {
                buttonEl.addEventListener('click', () => {
                    const result = btn.onClick();
                    if (result !== false) closeModal();
                });
            }
        });

        // Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        document.body.appendChild(modal);

        // Animate in
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modalContent.style.transform = 'scale(1) translateY(0)';
        });

        return {
            element: modal,
            close: closeModal
        };
    }

    // 🎨 SETUP GLOBAL STYLES (Enhanced with Theme Integration)
    setupGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 🎪 Utils Modal Styles - Theme Integrated */
            .utils-modal-header {
                padding: 1.5rem 1.5rem 1rem;
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .utils-modal-title {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--text-primary);
                background: var(--gradient-primary);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .utils-modal-close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-secondary);
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--radius);
                transition: var(--transition);
            }
            
            .utils-modal-close-btn:hover {
                background: var(--surface-hover);
                color: var(--text-primary);
                transform: scale(1.1);
            }
            
            .utils-modal-body {
                padding: 1.5rem;
                color: var(--text-primary);
                line-height: 1.6;
            }
            
            .utils-modal-footer {
                padding: 1rem 1.5rem 1.5rem;
                border-top: 1px solid var(--border);
                display: flex;
                gap: 0.75rem;
                justify-content: flex-end;
            }
            
            /* 🔔 Utils Toast Styles - Theme Enhanced */
            .utils-toast {
                animation: utilsToastSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .utils-toast-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .utils-toast-icon {
                font-size: 1.2rem;
                flex-shrink: 0;
            }
            
            .utils-toast-message {
                color: var(--text-primary);
                font-weight: 500;
                font-size: 0.875rem;
                line-height: 1.4;
            }
            
            .utils-toast-close {
                background: none;
                border: none;
                color: var(--text-tertiary);
                cursor: pointer;
                font-size: 1.2rem;
                padding: 0;
                margin-left: auto;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: var(--transition);
                flex-shrink: 0;
            }
            
            .utils-toast-close:hover {
                background: var(--surface-hover);
                color: var(--text-primary);
                transform: scale(1.1);
            }
            
            @keyframes utilsToastSlideIn {
                from {
                    transform: translateX(100%) translateY(20px) scale(0.95);
                    opacity: 0;
                }
                to {
                    transform: translateX(0) translateY(0) scale(1);
                    opacity: 1;
                }
            }
            
            /* 🎨 Utils Button Styles - Theme Consistent */
            .utils-btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: var(--radius);
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: var(--transition);
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                text-decoration: none;
                line-height: 1;
                font-family: inherit;
                position: relative;
                z-index: 10;
            }
            
            .utils-btn-primary {
                background: var(--primary);
                color: white;
                box-shadow: var(--shadow);
            }
            
            .utils-btn-primary:hover {
                background: var(--primary-dark);
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }
            
            .utils-btn-secondary {
                background: var(--surface-hover);
                color: var(--text-primary);
                border: 1px solid var(--border);
            }
            
            .utils-btn-secondary:hover {
                background: var(--border);
                border-color: var(--primary);
                color: var(--primary);
                transform: translateY(-1px);
            }
            
            .utils-btn-danger {
                background: var(--danger);
                color: white;
                box-shadow: var(--shadow);
            }
            
            .utils-btn-danger:hover {
                background: #dc2626;
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
            }
            
            .utils-btn-success {
                background: var(--success);
                color: white;
                box-shadow: var(--shadow);
            }
            
            .utils-btn-success:hover {
                background: #059669;
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
            }
            
            /* 🎯 Utils Utility Classes - Enhanced */
            .utils-highlight {
                animation: utilsHighlight 2s ease;
            }
            
            @keyframes utilsHighlight {
                0%, 100% { background: transparent; }
                50% { background: var(--primary-light); }
            }
            
            .utils-loading {
                position: relative;
                pointer-events: none;
                opacity: 0.7;
            }
            
            .utils-loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                margin: -10px 0 0 -10px;
                border: 2px solid var(--border);
                border-top: 2px solid var(--primary);
                border-radius: 50%;
                animation: utilsSpin 1s linear infinite;
                z-index: 1;
            }
            
            @keyframes utilsSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .utils-fade-in {
                animation: utilsFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            @keyframes utilsFadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .utils-slide-in-right {
                animation: utilsSlideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            @keyframes utilsSlideInRight {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            .utils-pulse {
                animation: utilsPulse 2s infinite;
            }
            
            @keyframes utilsPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            /* 🌟 Utils Mark/Highlight Text */
            .utils-toast mark,
            .utils-modal mark {
                background: rgba(102, 126, 234, 0.2);
                color: var(--text-primary);
                padding: 0.1em 0.2em;
                border-radius: 3px;
                font-weight: 600;
            }
            
            /* 🎭 Theme transition support */
            .utils-toast,
            .utils-modal-content,
            .utils-btn {
                transition: var(--transition), 
                    background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                    border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                    color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
        `;
        
        document.head.appendChild(style);
    }

    // 🔧 SYSTEM INFO
    getSystemInfo() {
        return {
            version: this.version,
            device: this.device,
            performance: this.performance,
            theme: this.theme.get(),
            storage: {
                available: this.storage.size(),
                quota: this.getStorageQuota()
            },
            features: {
                webgl: !!window.WebGLRenderingContext,
                webWorkers: !!window.Worker,
                serviceWorkers: 'serviceWorker' in navigator,
                notifications: 'Notification' in window,
                geolocation: 'geolocation' in navigator,
                camera: 'getUserMedia' in navigator.mediaDevices,
                clipboard: 'clipboard' in navigator
            }
        };
    }

    getStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                return {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    available: estimate.quota - estimate.usage
                };
            });
        }
        return null;
    }

    // 🧹 CLEANUP
    destroy() {
        // Clear event listeners
        this.eventListeners.clear();
        
        // Cancel animation frames
        this.animationFrames.forEach(frame => cancelAnimationFrame(frame));
        this.animationFrames.clear();
        
        // Clear cache
        this.cache.clear();
        
        console.log('🧹 SteadyUtils destroyed');
    }

    // 🎯 DEBUG HELPERS
    debug() {
        return {
            version: this.version,
            initialized: this.initialized,
            device: this.device,
            performance: this.performance,
            cache: this.cache,
            eventListeners: this.eventListeners.size,
            methods: Object.getOwnPropertyNames(Object.getPrototypeOf(this))
                .filter(name => typeof this[name] === 'function' && name !== 'constructor')
        };
    }
}

// 🚀 CREATE GLOBAL INSTANCE
const SteadyUtils = new LegendarySteadyUtils();

// 🌍 GLOBAL EXPORTS
if (typeof window !== 'undefined') {
    window.SteadyUtils = SteadyUtils;
    
    // Convenient aliases
    window.utils = SteadyUtils;
    window.toast = SteadyUtils.showToast.bind(SteadyUtils);
    window.animate = SteadyUtils.animateIn.bind(SteadyUtils);
    
    // Development helpers
    if (process?.env?.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        window.utilsDebug = SteadyUtils.debug.bind(SteadyUtils);
        console.log('🛠️ Utils debug available at window.utilsDebug()');
    }
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SteadyUtils;
}

console.log('🛠️ LEGENDARY STEADYUTILS v3.0.0 - THEMED EDITION LOADED!');
console.log('🔥 Your premium toolkit for creating MAGIC is ready!');
console.log('🎨 Fully integrated with SteadyManager design system!');
console.log('🎯 Available globally as: SteadyUtils, utils, toast(), animate()');

/**
 * 🎯 USAGE EXAMPLES WITH THEME INTEGRATION:
 * 
 * // 🎬 Smooth Animations
 * utils.animateIn('.stat-card', { duration: 600 });
 * utils.animateInStagger('.lead-item', { staggerDelay: 150 });
 * utils.animateCounter('#totalLeads', 150, { prefix: ', suffix: 'K' });
 * utils.shake('#errorField');
 * utils.pulse('.notification-btn');
 * 
 * // 🔔 Theme-Aware Notifications
 * toast('Lead added successfully! 🎉', 'success');
 * utils.showToast('Error occurred', 'error', { 
 *     duration: 3000,
 *     position: 'top-right'
 * });
 * 
 * // 📅 Beautiful Formatting
 * utils.formatDate(new Date(), 'relative'); // "2 hours ago"
 * utils.formatCurrency(1500); // "$1,500"
 * utils.formatFileSize(1024000); // "1 MB"
 * utils.formatPercentage(0.856, 1); // "85.6%"
 * 
 * // ✅ Smart Validation
 * utils.isEmail('test@example.com'); // true
 * utils.isStrongPassword('MyPass123!'); // true
 * utils.sanitizeInput('<script>alert("xss")</script>', 'text');
 * 
 * // 📱 Device Intelligence
 * utils.isMobileView(); // true/false
 * utils.device.isIOS; // true/false
 * utils.device.hasTouch; // true/false
 * 
 * // 💾 Smart Storage
 * utils.storage.set('userPrefs', { theme: 'dark' }, 86400000); // 24h expiry
 * const prefs = utils.storage.get('userPrefs', { theme: 'light' });
 * 
 * // 🎨 Theme Management
 * utils.theme.toggle(); // Smooth theme switch with transitions
 * utils.theme.set('dark'); // Force dark mode
 * utils.theme.isDark(); // Check current theme
 * 
 * // 🛠️ Performance Utilities
 * const debouncedSearch = utils.debounce(searchFunction, 300);
 * const throttledScroll = utils.throttle(scrollHandler, 100);
 * utils.measurePerformance('API Call', () => fetch('/api/leads'));
 * 
 * // 📋 Modern Clipboard
 * utils.copyToClipboard('Hello World!');
 * utils.downloadFile('data,content', 'export.csv', 'text/csv');
 * 
 * // 🎪 Beautiful Modals
 * utils.createModal('Confirm Delete', 'Are you sure you want to delete this lead?', {
 *     size: 'medium',
 *     buttons: [
 *         { text: 'Cancel', type: 'secondary' },
 *         { 
 *             text: 'Delete', 
 *             type: 'danger', 
 *             onClick: () => {
 *                 deleteLead();
 *                 toast('Lead deleted!', 'success');
 *             }
 *         }
 *     ]
 * });
 * 
 * // 🔤 Text Utilities
 * utils.truncate('Very long text here...', 20); // "Very long text h..."
 * utils.getInitials('John Smith'); // "JS"
 * utils.highlightText('Search term', 'term'); // "Search <mark>term</mark>"
 * utils.titleCase('hello world'); // "Hello World"
 * 
 * // 🎲 Random Helpers
 * utils.generateId(12); // "aB3xY7mN9qR2"
 * utils.generatePassword(16); // Strong password
 * utils.shuffle([1, 2, 3, 4, 5]); // Randomized array
 * 
 * // 🧮 Math Made Easy
 * utils.clamp(value, 0, 100); // Keep value between 0-100
 * utils.lerp(0, 100, 0.5); // Linear interpolation: 50
 * utils.roundToDecimals(3.14159, 2); // 3.14
 * 
 * // 🎨 Color Tools
 * utils.hexToRgb('#667eea'); // {r: 102, g: 126, b: 234}
 * utils.rgbToHex(102, 126, 234); // "#667eea"
 * 
 * // 📁 File Helpers
 * utils.formatFileType('document.pdf'); // "PDF"
 * utils.formatFileSize(2048000); // "2 MB"
 * 
 * // 🔗 URL Management
 * utils.getUrlParams(); // Object of URL parameters
 * utils.updateUrlParam('page', 2); // Update URL without reload
 * 
 * // 🎪 Event System
 * utils.on('theme:changed', (theme) => {
 *     console.log('Theme changed to:', theme);
 * });
 * utils.emit('custom:event', { data: 'value' });
 * 
 * // 🔧 System Information
 * const info = utils.getSystemInfo();
 * console.log('System capabilities:', info.features);
 * console.log('Device info:', info.device);
 * console.log('Performance:', info.performance);
 * 
 * // 🎯 Debug Mode
 * utilsDebug(); // See all available methods and state
 */