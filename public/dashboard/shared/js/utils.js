/**
 * SteadyUtils v7.0 - Essentials Only
 * Trimmed down to what we actually use
 */

class SteadyUtils {
    constructor() {
        this.activeToasts = new Map();
        this.setupGlobalStyles();
        console.log('[SteadyUtils] v7.0 loaded');
    }

    // =================================================================
    // NOTIFICATIONS (THE MAIN REASON THIS EXISTS)
    // =================================================================
    
    showToast(message, type = 'info', duration = 4000) {
        const safeMessage = window.API ? window.API.escapeHtml(message) : message;
        const toastKey = `${type}-${safeMessage}`;
        
        if (this.activeToasts.has(toastKey)) {
            return this.activeToasts.get(toastKey);
        }
        
        if (this.activeToasts.size >= 3) {
            const firstKey = this.activeToasts.keys().next().value;
            const oldestToast = this.activeToasts.get(firstKey);
            this.removeToast(oldestToast);
        }
        
        const toast = document.createElement('div');
        toast.className = `steady-toast steady-toast-${type}`;
        toast.dataset.key = toastKey;

        toast.innerHTML = `
            <span class="steady-toast-message">${safeMessage}</span>
            <button class="steady-toast-close" aria-label="Close">×</button>
        `;

        this.activeToasts.set(toastKey, toast);
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('steady-toast-show'));

        const timeoutId = setTimeout(() => this.removeToast(toast), duration);
        toast.querySelector('.steady-toast-close').addEventListener('click', () => {
            clearTimeout(timeoutId);
            this.removeToast(toast);
        });

        return toast;
    }

    removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        const key = toast.dataset.key;
        if (key) this.activeToasts.delete(key);
        toast.classList.remove('steady-toast-show');
        setTimeout(() => toast.parentNode?.removeChild(toast), 300);
    }

    // =================================================================
    // DATE FORMATTING (USED EVERYWHERE)
    // =================================================================
    
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

            default:
                return dateObj.toLocaleDateString();
        }
    }

    // =================================================================
    // NUMBER FORMATTING (FOR JOBS & DASHBOARD)
    // =================================================================
    
    formatCurrency(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatNumber(number, decimals = 0) {
        if (typeof number !== 'number' || isNaN(number)) return '0';
        return number.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    // =================================================================
    // STRING UTILS (USER AVATARS)
    // =================================================================
    
    getInitials(name, maxChars = 2) {
        if (!name) return '??';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].substring(0, maxChars).toUpperCase();
        }
        return words.slice(0, maxChars).map(w => w.charAt(0)).join('').toUpperCase();
    }

    // =================================================================
    // OVERLAY HELPERS (FOR WINDOWING SYSTEM)
    // =================================================================
    
    generateId() {
        return `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

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
    // GLOBAL STYLES
    // =================================================================
    
    setupGlobalStyles() {
        const style = document.createElement('style');
        style.id = 'steady-utils-styles';
        style.textContent = `
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
                z-index: 11000;
                opacity: 0;
                transform: translateX(100%) translateY(20px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .steady-toast-show {
                opacity: 1;
                transform: translateX(0) translateY(0) scale(1);
            }

            .steady-toast-success { border-left-color: var(--success); }
            .steady-toast-error { border-left-color: var(--danger); }
            .steady-toast-warning { border-left-color: var(--warning); }
            .steady-toast-info { border-left-color: var(--info); }

            .steady-toast-message {
                flex: 1;
                color: var(--text-primary);
                font-weight: 500;
                font-size: 0.875rem;
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
                border-radius: var(--radius);
                transition: var(--transition);
            }

            .steady-toast-close:hover {
                background: var(--surface-hover);
                color: var(--text-primary);
            }

            @media (max-width: 768px) {
                .steady-toast {
                    left: 20px;
                    right: 20px;
                    min-width: auto;
                }
            }

            /* Skeleton Loading */
            @keyframes shimmer {
                0% { background-position: -1000px 0; }
                100% { background-position: 1000px 0; }
            }

            .skeleton {
                background: linear-gradient(
                    90deg,
                    var(--surface) 0%,
                    var(--surface-hover) 50%,
                    var(--surface) 100%
                );
                background-size: 1000px 100%;
                animation: shimmer 2s infinite linear;
                border-radius: var(--radius);
            }

            .skeleton-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                gap: 1.5rem;
                padding: 1rem 0;
            }

            .skeleton-card {
                background: var(--surface);
                border-radius: 12px;
                padding: 1.5rem;
                border: 2px solid var(--border);
            }

            .skeleton-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }

            .skeleton-title {
                height: 24px;
                width: 60%;
                border-radius: 6px;
            }

            .skeleton-badge {
                height: 24px;
                width: 80px;
                border-radius: 12px;
            }

            .skeleton-text {
                height: 16px;
                width: 100%;
                border-radius: 4px;
                margin: 0.5rem 0;
            }

            .skeleton-text.short {
                width: 40%;
            }

            .skeleton-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .skeleton-stat-box {
                background: var(--surface);
                border: 2px solid var(--border);
                border-radius: 12px;
                padding: 1.5rem;
            }

            .skeleton-stat-value {
                height: 32px;
                width: 60%;
                border-radius: 6px;
                margin-bottom: 0.5rem;
            }

            .skeleton-stat-label {
                height: 16px;
                width: 40%;
                border-radius: 4px;
            }

            .skeleton-table {
                width: 100%;
                border-collapse: collapse;
            }

            .skeleton-table td {
                padding: 1rem;
                border-bottom: 1px solid var(--border);
            }

            .skeleton-table-cell {
                height: 16px;
                border-radius: 4px;
            }

            .skeleton-dashboard {
                max-width: 1400px;
                margin: 0 auto;
            }

            .skeleton-section {
                background: var(--surface);
                border: 2px solid var(--border);
                border-radius: 12px;
                padding: 1.5rem;
            }

            .skeleton-section-header {
                /* Uses base skeleton class for shimmer */
            }

            .skeleton-fade-out {
                animation: fadeOut 0.3s ease forwards;
            }

            @keyframes fadeOut {
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // =================================================================
    // SKELETON LOADING
    // =================================================================

    /**
     * Show skeleton loading for stats boxes
     * @param {string} containerId - Container element ID
     * @param {number} count - Number of stat boxes
     */
    showSkeletonStats(containerId, count = 4) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const skeletonHTML = `
            <div class="skeleton-stats" data-skeleton>
                ${Array(count).fill().map(() => `
                    <div class="skeleton-stat-box">
                        <div class="skeleton skeleton-stat-value"></div>
                        <div class="skeleton skeleton-stat-label"></div>
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = skeletonHTML;
    }

    /**
     * Show skeleton loading for table layout
     * @param {string} containerId - Container element ID
     * @param {number} rows - Number of table rows
     * @param {number} cols - Number of columns
     */
    showSkeletonTable(containerId, rows = 10, cols = 6) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const skeletonHTML = `
            <table class="skeleton-table" data-skeleton>
                <tbody>
                    ${Array(rows).fill().map(() => `
                        <tr>
                            ${Array(cols).fill().map(() => `
                                <td><div class="skeleton skeleton-table-cell"></div></td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = skeletonHTML;
    }

    /**
     * Show skeleton loading for Dashboard layout
     * @param {string} containerId - Container element ID
     */
    showSkeletonDashboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const skeletonHTML = `
            <div class="skeleton-dashboard" data-skeleton>
                <!-- Stats Row -->
                <div class="skeleton-stats">
                    ${Array(4).fill().map(() => `
                        <div class="skeleton-stat-box">
                            <div class="skeleton skeleton-stat-value"></div>
                            <div class="skeleton skeleton-stat-label"></div>
                        </div>
                    `).join('')}
                </div>

                <!-- Pipeline Section -->
                <div class="skeleton-section" style="margin-top: 1.5rem; height: 200px;">
                    <div class="skeleton skeleton-section-header" style="height: 24px; width: 200px; margin-bottom: 1rem;"></div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; height: 140px;">
                        ${Array(3).fill().map(() => `<div class="skeleton" style="height: 100%;"></div>`).join('')}
                    </div>
                </div>

                <!-- Lists Split -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-top: 1.5rem;">
                    ${Array(2).fill().map(() => `
                        <div class="skeleton-section">
                            <div class="skeleton skeleton-section-header" style="height: 24px; width: 150px; margin-bottom: 1rem;"></div>
                            ${Array(5).fill().map(() => `
                                <div class="skeleton skeleton-text" style="margin: 0.5rem 0;"></div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = skeletonHTML;
    }

    /**
     * Remove skeleton loading with fade out animation
     * @param {string} containerId - Container element ID
     */
    hideSkeletons(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const skeletons = container.querySelectorAll('[data-skeleton]');
        skeletons.forEach(skeleton => {
            skeleton.classList.add('skeleton-fade-out');
            setTimeout(() => skeleton.remove(), 300);
        });
    }
}

const SteadyUtilsInstance = new SteadyUtils();
window.SteadyUtils = SteadyUtilsInstance;
window.toast = SteadyUtilsInstance.showToast.bind(SteadyUtilsInstance);
window.formatCurrency = SteadyUtilsInstance.formatCurrency.bind(SteadyUtilsInstance);