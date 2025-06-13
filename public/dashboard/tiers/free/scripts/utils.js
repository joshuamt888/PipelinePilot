/**
 * SteadyManager - Free Tier Utilities
 * Core utility functions for dashboard functionality, theme management, and user interactions
 * Compatible with DashboardController and enhanced database schema
 */

(function() {
    'use strict';

    // 🔥 STEADYUTILS - MAIN UTILITY CLASS
    class SteadyUtils {
        constructor() {
            this.theme = 'light';
            this.notifications = [];
            this.modals = new Map();
            this.eventListeners = new Map();
            this.debounceTimers = new Map();
            this.initialized = false;
            
            // Feature limits for free tier
            this.limits = {
                leads: 50,
                monthlyGoals: 3,
                customFields: 0,
                automations: 0,
                exports: 1 // per month
            };
            
            console.log('🛠️ SteadyUtils initialized');
        }

        /**
         * Initialize utilities
         */
        init() {
            if (this.initialized) return;
            
            this.loadTheme();
            this.setupToastContainer();
            this.setupKeyboardShortcuts();
            this.setupErrorHandling();
            this.setupPerformanceMonitoring();
            
            this.initialized = true;
            console.log('✅ SteadyUtils ready');
        }

        // 🎨 THEME MANAGEMENT
        
        /**
         * Load saved theme from localStorage
         */
        loadTheme() {
            const savedTheme = localStorage.getItem('steadymanager_theme') || 'light';
            this.setTheme(savedTheme);
        }

        /**
         * Set theme and persist to localStorage
         */
        setTheme(theme) {
            this.theme = theme;
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('steadymanager_theme', theme);
            
            // Update any theme toggles
            const toggles = document.querySelectorAll('[data-theme-toggle]');
            toggles.forEach(toggle => {
                if (toggle.type === 'checkbox') {
                    toggle.checked = theme === 'dark';
                }
            });
            
            // Dispatch theme change event
            this.dispatchEvent('themeChanged', { theme });
            
            console.log(`🎨 Theme set to: ${theme}`);
        }

        /**
         * Toggle between light and dark theme
         */
        toggleTheme() {
            const newTheme = this.theme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
            this.showToast(`Switched to ${newTheme} mode`, 'success');
            return newTheme;
        }

        // 🔔 NOTIFICATION SYSTEM

        /**
         * Setup toast notification container
         */
        setupToastContainer() {
            if (document.getElementById('toastContainer')) return;
            
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = `
                position: fixed;
                top: 1rem;
                right: 1rem;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        /**
         * Show toast notification
         */
        showToast(message, type = 'info', duration = 4000) {
            const toast = this.createToast(message, type);
            const container = document.getElementById('toastContainer');
            
            if (!container) {
                console.warn('Toast container not found');
                return;
            }
            
            container.appendChild(toast);
            this.notifications.push(toast);
            
            // Animate in
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            });
            
            // Auto remove
            if (duration > 0) {
                setTimeout(() => {
                    this.removeToast(toast);
                }, duration);
            }
            
            return toast;
        }

        /**
         * Create toast element
         */
        createToast(message, type) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️',
                upgrade: '👑'
            };
            
            const colors = {
                success: 'linear-gradient(135deg, #10b981, #059669)',
                error: 'linear-gradient(135deg, #ef4444, #dc2626)',
                warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
                info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                upgrade: 'linear-gradient(135deg, #f59e0b, #f97316)'
            };
            
            toast.style.cssText = `
                background: ${colors[type] || colors.info};
                color: white;
                padding: 1rem 1.25rem;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-weight: 500;
                font-size: 0.875rem;
                max-width: 350px;
                cursor: pointer;
                pointer-events: all;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            `;
            
            toast.innerHTML = `
                <span style="font-size: 1.1rem;">${icons[type] || icons.info}</span>
                <span style="flex: 1;">${this.escapeHtml(message)}</span>
                <button onclick="window.SteadyUtils.removeToast(this.parentElement)" 
                        style="background: none; border: none; color: white; cursor: pointer; opacity: 0.7; font-size: 1.2rem; padding: 0;">×</button>
            `;
            
            // Add click handler for upgrade toasts
            if (type === 'upgrade') {
                toast.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        window.location.href = '/auth/trial.html';
                    }
                });
            }
            
            return toast;
        }

        /**
         * Remove toast notification
         */
        removeToast(toast) {
            if (!toast || !toast.parentElement) return;
            
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
                const index = this.notifications.indexOf(toast);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }, 300);
        }

        // 🚀 UPGRADE MODALS

        /**
         * Show upgrade modal for locked features
         */
        showUpgradeModal(feature) {
            const featureMessages = {
                'analytics': {
                    title: '📊 Advanced Analytics',
                    description: 'Get detailed insights into your lead performance with charts, trends, and conversion tracking.',
                    features: ['Lead conversion analytics', 'Performance charts', 'Trend analysis', 'Export reports']
                },
                'insights': {
                    title: '💡 AI Insights',
                    description: 'Let AI analyze your leads and provide personalized recommendations to improve your conversion rates.',
                    features: ['AI lead scoring', 'Smart recommendations', 'Behavior analysis', 'Optimization tips']
                },
                'automation': {
                    title: '🤖 Lead Automation',
                    description: 'Automate your lead follow-up process with smart sequences and triggers.',
                    features: ['Email sequences', 'Smart triggers', 'Follow-up automation', 'Task automation']
                },
                'schedule': {
                    title: '📅 Schedule Management',
                    description: 'Manage your appointments and follow-ups with integrated calendar features.',
                    features: ['Calendar integration', 'Meeting scheduling', 'Reminder system', 'Availability management']
                },
                'lead_limit': {
                    title: '👥 More Leads',
                    description: 'You\'ve reached your monthly limit of 50 leads. Upgrade to manage 1,000+ leads!',
                    features: ['1,000 lead limit', 'Unlimited storage', 'Advanced search', 'Bulk operations']
                },
                'export': {
                    title: '📥 Advanced Export',
                    description: 'Export your leads in multiple formats with custom field selection.',
                    features: ['Multiple formats', 'Custom fields', 'Scheduled exports', 'Advanced filtering']
                }
            };
            
            const config = featureMessages[feature] || featureMessages['analytics'];
            
            this.showModal(`
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">${config.title.split(' ')[0]}</div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem;">
                        ${config.title.substring(2)}
                    </h3>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.6;">
                        ${config.description}
                    </p>
                    
                    <div style="background: var(--surface-hover); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; text-align: left;">
                        <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem;">
                            ✨ What you'll get:
                        </h4>
                        ${config.features.map(f => `
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; color: var(--text-secondary);">
                                <span style="color: var(--success);">✓</span>
                                ${f}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="window.SteadyUtils.closeModal()" 
                                style="padding: 0.75rem 1.5rem; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-weight: 500;">
                            Maybe Later
                        </button>
                        <button onclick="window.location.href='/auth/trial.html'" 
                                style="padding: 0.75rem 2rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                            🚀 Start Free Trial
                        </button>
                    </div>
                    
                    <p style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 1rem;">
                        14-day free trial • No credit card required • Cancel anytime
                    </p>
                </div>
            `, 'upgrade-modal');
            
            // Track upgrade prompt
            this.trackEvent('upgrade_prompt_shown', { feature });
        }

        /**
         * Show generic modal
         */
        showModal(content, id = 'generic-modal') {
            // Remove existing modal
            this.closeModal(id);
            
            const overlay = document.createElement('div');
            overlay.id = `modal-${id}`;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(8px);
                animation: modalFadeIn 0.3s ease;
            `;
            
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: var(--surface);
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid var(--border);
            `;
            
            modal.innerHTML = content;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(id);
                }
            });
            
            // Close on ESC key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeModal(id);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
            
            this.modals.set(id, { overlay, modal, escHandler });
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            return { overlay, modal };
        }

        /**
         * Close modal
         */
        closeModal(id = 'generic-modal') {
            const modalData = this.modals.get(id);
            if (!modalData) return;
            
            const { overlay, escHandler } = modalData;
            
            overlay.style.animation = 'modalFadeOut 0.3s ease';
            modalData.modal.style.animation = 'modalSlideOut 0.3s ease';
            
            setTimeout(() => {
                if (overlay.parentElement) {
                    overlay.parentElement.removeChild(overlay);
                }
                document.removeEventListener('keydown', escHandler);
                this.modals.delete(id);
                
                // Restore body scroll if no modals
                if (this.modals.size === 0) {
                    document.body.style.overflow = '';
                }
            }, 300);
        }

        // 🔍 LEAD MANAGEMENT UTILITIES

        /**
         * Check lead limit and show warnings
         */
        checkLeadLimit(currentCount) {
            const limit = this.limits.leads;
            const percentage = (currentCount / limit) * 100;
            
            return {
                current: currentCount,
                limit: limit,
                percentage: Math.round(percentage),
                remaining: limit - currentCount,
                isNearLimit: percentage >= 80,
                isAtLimit: currentCount >= limit,
                shouldShowUpgrade: percentage >= 90
            };
        }

        /**
         * Format lead data for display
         */
        formatLead(lead) {
            return {
                ...lead,
                displayName: lead.name || 'Unnamed Lead',
                initials: this.getInitials(lead.name),
                statusClass: this.getStatusClass(lead.status),
                statusIcon: this.getStatusIcon(lead.status),
                contactInfo: this.getLeadContactInfo(lead),
                timeAgo: this.getTimeAgo(lead.created_at)
            };
        }

        /**
         * Get initials from name
         */
        getInitials(name) {
            if (!name) return '??';
            return name.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
        }

        /**
         * Get status CSS class
         */
        getStatusClass(status) {
            if (!status) return 'status-new';
            const s = status.toLowerCase();
            if (s.includes('new')) return 'status-new';
            if (s.includes('contact')) return 'status-contacted';
            if (s.includes('qualified')) return 'status-qualified';
            if (s.includes('closed') || s.includes('won')) return 'status-closed';
            return 'status-new';
        }

        /**
         * Get status icon
         */
        getStatusIcon(status) {
            if (!status) return 'circle-dot';
            const s = status.toLowerCase();
            if (s.includes('new')) return 'circle-dot';
            if (s.includes('contact')) return 'phone';
            if (s.includes('qualified')) return 'check-circle';
            if (s.includes('closed') || s.includes('won')) return 'check-circle-2';
            return 'circle-dot';
        }

        /**
         * Get lead contact info for display
         */
        getLeadContactInfo(lead) {
            if (lead.email) {
                return {
                    icon: 'mail',
                    text: lead.email,
                    type: 'email'
                };
            } else if (lead.phone) {
                return {
                    icon: 'phone',
                    text: lead.phone,
                    type: 'phone'
                };
            } else if (lead.company) {
                return {
                    icon: 'building',
                    text: lead.company,
                    type: 'company'
                };
            } else {
                return {
                    icon: 'user',
                    text: 'No contact info',
                    type: 'none'
                };
            }
        }

        // ⏰ TIME UTILITIES

        /**
         * Get human-readable time ago
         */
        getTimeAgo(dateString) {
            if (!dateString) return 'Recently';
            
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffWeeks = Math.floor(diffDays / 7);
            const diffMonths = Math.floor(diffDays / 30);
            
            if (diffMinutes < 1) return 'Just now';
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            if (diffWeeks < 4) return `${diffWeeks}w ago`;
            if (diffMonths < 12) return `${diffMonths}mo ago`;
            
            return date.toLocaleDateString();
        }

        /**
         * Format date for display
         */
        formatDate(dateString, options = {}) {
            if (!dateString) return '';
            
            const date = new Date(dateString);
            const defaultOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                ...options
            };
            
            return date.toLocaleDateString(undefined, defaultOptions);
        }

        // 🎯 PERFORMANCE UTILITIES

        /**
         * Debounce function calls
         */
        debounce(func, delay, key = 'default') {
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            const timeoutId = setTimeout(() => {
                func();
                this.debounceTimers.delete(key);
            }, delay);
            
            this.debounceTimers.set(key, timeoutId);
        }

        /**
         * Throttle function calls
         */
        throttle(func, delay) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, delay);
                }
            };
        }

        // 🔒 SECURITY UTILITIES

        /**
         * Escape HTML to prevent XSS
         */
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        /**
         * Sanitize input for safe display
         */
        sanitizeInput(input) {
            if (typeof input !== 'string') return input;
            return input.trim()
                       .replace(/[<>]/g, '') // Remove basic HTML chars
                       .slice(0, 500); // Limit length
        }

        // 📊 ANALYTICS & TRACKING

        /**
         * Track user events (placeholder for analytics)
         */
        trackEvent(eventName, properties = {}) {
            console.log(`📊 Event: ${eventName}`, properties);
            
            // In production, this would send to analytics service
            // For now, just log for development
            if (window.gtag) {
                window.gtag('event', eventName, properties);
            }
        }

        /**
         * Track page view
         */
        trackPageView(pageName) {
            this.trackEvent('page_view', { page: pageName });
        }

        // 🛠️ SETUP UTILITIES

        /**
         * Setup keyboard shortcuts
         */
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + K for quick search (future feature)
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.showToast('Quick search coming soon!', 'info');
                }
                
                // Ctrl/Cmd + N for new lead
                if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                    e.preventDefault();
                    if (window.DashboardController && window.DashboardController.handleAddLead) {
                        window.DashboardController.handleAddLead();
                    }
                }
                
                // Ctrl/Cmd + D for dark mode toggle
                if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                    e.preventDefault();
                    this.toggleTheme();
                }
            });
        }

        /**
         * Setup global error handling
         */
        setupErrorHandling() {
            window.addEventListener('error', (e) => {
                console.error('Global error:', e.error);
                this.trackEvent('error', {
                    message: e.message,
                    filename: e.filename,
                    lineno: e.lineno
                });
            });
            
            window.addEventListener('unhandledrejection', (e) => {
                console.error('Unhandled promise rejection:', e.reason);
                this.trackEvent('promise_rejection', {
                    reason: e.reason?.toString()
                });
            });
        }

        /**
         * Setup performance monitoring
         */
        setupPerformanceMonitoring() {
            // Log performance metrics
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    this.trackEvent('page_load_performance', {
                        loadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart),
                        domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart)
                    });
                }, 0);
            });
        }

        // 🎪 EVENT SYSTEM

        /**
         * Dispatch custom event
         */
        dispatchEvent(eventName, detail = {}) {
            const event = new CustomEvent(`steadymanager:${eventName}`, { detail });
            document.dispatchEvent(event);
        }

        /**
         * Listen for custom events
         */
        addEventListener(eventName, callback) {
            const listener = (e) => callback(e.detail);
            document.addEventListener(`steadymanager:${eventName}`, listener);
            
            // Store for cleanup
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }
            this.eventListeners.get(eventName).push(listener);
            
            return listener;
        }

        /**
         * Remove event listener
         */
        removeEventListener(eventName, listener) {
            document.removeEventListener(`steadymanager:${eventName}`, listener);
            
            const listeners = this.eventListeners.get(eventName);
            if (listeners) {
                const index = listeners.indexOf(listener);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        }

        // 🧹 CLEANUP

        /**
         * Cleanup resources
         */
        cleanup() {
            // Clear all timers
            this.debounceTimers.forEach(timer => clearTimeout(timer));
            this.debounceTimers.clear();
            
            // Remove all event listeners
            this.eventListeners.forEach((listeners, eventName) => {
                listeners.forEach(listener => {
                    this.removeEventListener(eventName, listener);
                });
            });
            this.eventListeners.clear();
            
            // Close all modals
            this.modals.forEach((_, id) => this.closeModal(id));
            
            console.log('🧹 SteadyUtils cleaned up');
        }
    }

    // 🚀 INITIALIZE AND EXPORT
    window.SteadyUtils = new SteadyUtils();
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.SteadyUtils.init();
        });
    } else {
        window.SteadyUtils.init();
    }

    // Add modal animations CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes modalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes modalFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes modalSlideOut {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(-20px) scale(0.95); }
        }
    `;
    document.head.appendChild(style);

    console.log('🛠️ SteadyUtils loaded and ready!');
    
})();