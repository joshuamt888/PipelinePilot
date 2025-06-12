// 🔧 STEADYMANAGER UTILS.JS - FREE TIER
// Essential utilities for FREE users with upgrade hints!

// 🎵 CLEAN WEB AUDIO SOUND MANAGER - No files needed!
class BasicSoundManager {
    constructor() {
        this.enabled = localStorage.getItem('steadymanager_sounds_enabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('steadymanager_sound_volume')) || 0.3;
        this.audioContext = null;
        
        console.log('🔊 Web Audio Sound Manager (FREE) - Ready!');
    }
    
    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }
    
    play(soundName) {
        if (!this.enabled) return false;
        
        try {
            switch(soundName) {
                case 'click':
                    this.playClick();
                    break;
                case 'success':
                    this.playSuccess();
                    break;
                case 'error':
                    this.playError();
                    break;
                case 'notification':
                    this.playNotification();
                    break;
                default:
                    this.playClick(); // Default sound
            }
            return true;
        } catch (error) {
            console.warn('Sound failed:', error);
            return false;
        }
    }
    
    // Clean click sound
    playClick() {
        const ctx = this.getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(this.volume * 0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }
    
    // Happy success chime
    playSuccess() {
        const ctx = this.getAudioContext();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        // Major chord
        osc1.frequency.setValueAtTime(523, ctx.currentTime); // C
        osc2.frequency.setValueAtTime(659, ctx.currentTime); // E
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        gain.gain.setValueAtTime(this.volume * 0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
    }
    
    // Gentle error tone
    playError() {
        const ctx = this.getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(this.volume * 0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }
    
    // Soft notification ping
    playNotification() {
        const ctx = this.getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(this.volume * 0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('steadymanager_sounds_enabled', this.enabled);
        
        // Play test sound when enabling
        if (this.enabled) {
            setTimeout(() => this.play('click'), 100);
        }
        
        console.log(`🔊 Sounds ${this.enabled ? 'enabled' : 'disabled'}`);
        return this.enabled;
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('steadymanager_sound_volume', this.volume);
        
        // Play test sound
        this.play('click');
        return this.volume;
    }
}

// 🌙 BASIC THEME MANAGER
class BasicThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme();
        this.initializeTheme();
    }
    
    getStoredTheme() {
        const stored = localStorage.getItem('steadymanager_theme');
        if (stored) return stored;
        
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }
    
    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        if (this.currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
    
    toggle() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        soundManager.play('click');
        return this.currentTheme;
    }
    
    applyTheme() {
        localStorage.setItem('steadymanager_theme', this.currentTheme);
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        if (this.currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize basic managers
const soundManager = new BasicSoundManager();
const themeManager = new BasicThemeManager();

// 📅 BASIC DATE UTILITIES
const DateUtils = {
    formatDate(date, format = 'short') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const formats = {
            short: { month: 'short', day: 'numeric' },
            medium: { month: 'short', day: 'numeric', year: 'numeric' },
            time: { hour: 'numeric', minute: '2-digit', hour12: true }
        };
        
        return d.toLocaleDateString('en-US', formats[format] || formats.medium);
    },
    
    formatRelative(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return this.formatDate(date, 'short');
    },
    
    isToday(date) {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }
};

// 🎯 FREE TIER UTILITIES
const FreeTierUtils = {
    // Check if feature is locked for free users
    isFeatureLocked(feature) {
        const freeFeatures = ['basic_dashboard', 'add_leads', 'basic_settings', 'goal_tracking'];
        return !freeFeatures.includes(feature);
    },
    
    // Show upgrade prompt
    showUpgradePrompt(feature) {
        const prompts = {
            analytics: 'Unlock powerful analytics with Professional! 📊',
            export: 'Export your data with Professional! 📥',
            insights: 'Get smart insights with Professional! 💡',
            advanced_search: 'Advanced search available in Professional! 🔍',
            lead_limit: 'Upgrade to get 1,000 leads per month! 🚀'
        };
        
        const message = prompts[feature] || 'Upgrade to Professional for more features! 🚀';
        this.showUpgradeModal(message);
    },
    
    // Show upgrade modal
    showUpgradeModal(message) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 text-center">
                <div class="text-4xl mb-4">🚀</div>
                <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">Ready to Level Up?</h3>
                <p class="text-gray-600 dark:text-gray-300 mb-6">${message}</p>
                <div class="space-y-3">
                    <button onclick="window.location.href='/login?tab=trial'" 
                            class="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-1 transition-all">
                        Start Free Trial - Get 1,000 Leads! ✨
                    </button>
                    <button onclick="window.location.href='/pricing'" 
                            class="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                        View Pricing
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="w-full text-gray-500 hover:text-gray-700 py-2">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        soundManager.play('click');
    },
    
    // Get tier info for free users
    getTierInfo() {
        return {
            name: 'Free Explorer',
            badge: '🆓 FREE',
            color: '#6b7280',
            leadLimit: 50,
            upgradeMessage: 'Upgrade to unlock 1,000 leads and advanced features!'
        };
    },
    
    // Check if user is at lead limit
    checkLeadLimit(currentLeads, maxLeads = 50) {
        const percentage = (currentLeads / maxLeads) * 100;
        
        if (percentage >= 100) {
            this.showUpgradePrompt('lead_limit');
            return false;
        }
        
        if (percentage >= 80) {
            this.showLimitWarning(currentLeads, maxLeads);
        }
        
        return true;
    },
    
    // Show limit warning
    showLimitWarning(current, max) {
        const remaining = max - current;
        ToastUtils.warning(`Only ${remaining} leads left! Upgrade to get 1,000 leads.`);
    }
};

// 🍞 SIMPLE TOAST NOTIFICATIONS
const ToastUtils = {
    show(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        const toastId = 'toast-' + Date.now();
        toast.id = toastId;
        
        const typeStyles = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-black',
            info: 'bg-blue-500 text-white'
        };
        
        toast.className = `
            px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 
            translate-x-full opacity-0 max-w-sm
            ${typeStyles[type] || typeStyles.info}
        `;
        
        toast.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium">${message}</span>
                <button onclick="ToastUtils.remove('${toastId}')" class="ml-3 text-lg opacity-70 hover:opacity-100">&times;</button>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 10);
        
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toastId);
            }, duration);
        }
        
        soundManager.play('notification');
        return toastId;
    },
    
    remove(toastId) {
        const toast = document.getElementById(toastId);
        if (!toast) return;
        
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    },
    
    success(message, duration = 3000) {
        soundManager.play('success');
        return this.show(message, 'success', duration);
    },
    
    error(message, duration = 5000) {
        soundManager.play('error');
        return this.show(message, 'error', duration);
    },
    
    warning(message, duration = 4000) {
        soundManager.play('notification');
        return this.show(message, 'warning', duration);
    },
    
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
};

// 🎊 BASIC CELEBRATIONS (Limited)
const CelebrationUtils = {
    // Simple confetti for goal achievements
    simpleConfetti() {
        const colors = ['#3b82f6', '#10b981', '#f59e0b'];
        
        for (let i = 0; i < 20; i++) {
            const confettiPiece = document.createElement('div');
            confettiPiece.style.cssText = `
                position: fixed;
                top: -10px;
                left: ${Math.random() * 100}%;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                animation: confetti-fall 2s linear forwards;
                pointer-events: none;
                z-index: 9999;
            `;
            
            document.body.appendChild(confettiPiece);
            
            setTimeout(() => {
                confettiPiece.remove();
            }, 2000);
        }
        
        if (!document.getElementById('confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes confetti-fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    // Show achievement (with upgrade hint)
    showAchievement(title, message) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 text-center max-w-md mx-4">
                <div class="text-4xl mb-3">🎯</div>
                <h2 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">${title}</h2>
                <p class="text-gray-600 dark:text-gray-300 mb-4">${message}</p>
                <div class="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg mb-4">
                    <p class="text-sm text-blue-800 dark:text-blue-200">
                        🚀 Pro users get advanced celebrations and insights!
                    </p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Nice!
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.simpleConfetti();
        soundManager.play('success');
        
        setTimeout(() => {
            modal.remove();
        }, 4000);
    }
};

// 🔧 BASIC UTILITIES
const BasicUtils = {
    // Format numbers
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },
    
    // Debounce for search
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Simple search
    searchLeads(leads, query) {
        if (!query || query.trim() === '') return leads;
        
        const searchTerm = query.toLowerCase().trim();
        return leads.filter(lead => 
            lead.name?.toLowerCase().includes(searchTerm) ||
            lead.email?.toLowerCase().includes(searchTerm) ||
            lead.company?.toLowerCase().includes(searchTerm) ||
            lead.platform?.toLowerCase().includes(searchTerm)
        );
    }
};

// 🎮 BASIC KEYBOARD SHORTCUTS (Limited)
const BasicKeyboardShortcuts = {
    init() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+/ for help
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                this.showHelp();
            }
            
            // Ctrl+Shift+T for theme toggle
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                themeManager.toggle();
                ToastUtils.info(`Switched to ${themeManager.getCurrentTheme()} mode`);
            }
        });
    },
    
    showHelp() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
                <h2 class="text-lg font-bold mb-4 text-gray-900 dark:text-white">⌨️ Keyboard Shortcuts (Free)</h2>
                <div class="space-y-2 mb-4">
                    <div class="flex justify-between">
                        <kbd class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+/</kbd>
                        <span class="text-sm">Show shortcuts</span>
                    </div>
                    <div class="flex justify-between">
                        <kbd class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+Shift+T</kbd>
                        <span class="text-sm">Toggle theme</span>
                    </div>
                </div>
                <div class="bg-yellow-50 dark:bg-yellow-900 p-3 rounded-lg mb-4">
                    <p class="text-sm text-yellow-800 dark:text-yellow-200">
                        🚀 Pro users get 10+ more shortcuts!
                    </p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="w-full bg-blue-600 text-white py-2 rounded">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        soundManager.play('click');
    }
};

// 🔧 FREE TIER MAIN EXPORT
const SteadyUtils = {
    // Basic managers
    Sound: soundManager,
    Theme: themeManager,
    Date: DateUtils,
    FreeTier: FreeTierUtils,
    Toast: ToastUtils,
    Celebration: CelebrationUtils,
    Basic: BasicUtils,
    Keyboard: BasicKeyboardShortcuts,
    
    // Quick access
    formatDate: DateUtils.formatDate,
    formatNumber: BasicUtils.formatNumber,
    showToast: ToastUtils.show,
    playSound: (name) => soundManager.play(name),
    toggleTheme: () => themeManager.toggle(),
    checkFeature: FreeTierUtils.isFeatureLocked,
    showUpgrade: FreeTierUtils.showUpgradePrompt,
    
    // Initialize
    init() {
        console.log('🔧 SteadyManager Utils (FREE TIER) initialized!');
        console.log('🎵 Web Audio sound system ready');
        console.log('🎨 Basic theme system ready');
        console.log('🍞 Toast notifications ready');
        console.log('🚀 Ready for upgrades!');
        
        // Set tier globally
        window.TIER = 'FREE';
        window.TIER_LIMITS = {
            leadLimit: 50,
            features: ['basic_dashboard', 'add_leads', 'basic_settings'],
            locked: ['analytics', 'insights', 'export', 'advanced_search']
        };
        
        return this;
    }
};

// Make globally available
window.SteadyUtils = SteadyUtils;
window.showToast = ToastUtils.show;
window.playSound = (name) => soundManager.play(name);
window.FreeTierUtils = FreeTierUtils;

// Initialize keyboard shortcuts
BasicKeyboardShortcuts.init();

// Auto-initialize
SteadyUtils.init();

// 🎯 CONSOLE MESSAGE FOR FREE TIER
console.log(`
🆓 ====================================================
   _____ ______________________   _______ ________ 
  / __  // ___// ____/ ____/   | / /  _  /__  __/
 / /_/ // /   / __/ / __/ / /| |/ /  / / /  / /   
/ ____// /___/ /___/ /___/ ___ / /__/ /_/  / /    
\_/ ____\____/_____/_____/_/  |_\\____/   /_/     
🆓 ====================================================

🎯 FREE TIER UTILS - READY TO GROW!

✅ AVAILABLE FEATURES:
   🎵 Web Audio Sounds (click, success, error, notification)
   🎨 Theme Toggle  
   📅 Date Utils
   🍞 Toast Notifications
   🎊 Simple Celebrations
   ⌨️  Basic Shortcuts (Ctrl+/, Ctrl+Shift+T)

🔒 LOCKED FEATURES (Upgrade to unlock):
   📊 Advanced Analytics
   📥 Data Export
   💡 Smart Insights
   🔍 Advanced Search
   🎮 Admin Features
   ✨ Premium Animations

🚀 READY FOR MORE? Upgrade to Professional!
`);

console.log('🆓 Free Tier Utils loaded - Ready to convert users to Pro! 💰');