// 🔧 STEADYMANAGER UTILS.JS - THE MAGIC SUPPORT LAYER
// Sound system, theme management, helpers, animations, everything!
// Works with your assets/media folder structure

// 🎵 SOUND MANAGER - CONTEXTUAL AUDIO EXPERIENCE
class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = localStorage.getItem('steadymanager_sounds_enabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('steadymanager_sound_volume')) || 0.3;
        this.loadSounds();
        
        console.log('🔊 Sound Manager initialized');
        console.log(`🎵 Sounds enabled: ${this.enabled}`);
        console.log(`🔉 Volume: ${Math.round(this.volume * 100)}%`);
    }
    
    // Load all sound files from assets/media
    loadSounds() {
        const soundFiles = {
            // UI Interaction Sounds
            click: 'assets/media/click.mp3',                    // Button clicks, navigation
            success: 'assets/media/success.mp3',                // Lead added, data saved
            error: 'assets/media/error.mp3',                    // Validation errors, failures
            
            // Achievement Sounds
            goalAchieved: 'assets/media/goal-achieved.mp3',     // Goals completed
            notification: 'assets/media/notification.mp3',      // Important alerts
            
            // Optional Advanced Sounds (add these for premium experience)
            whoosh: 'assets/media/whoosh.mp3',                 // Page transitions (optional)
            ding: 'assets/media/ding.mp3',                     // Meeting scheduled (optional)
            celebration: 'assets/media/celebration.mp3'         // Major milestones (optional)
        };
        
        // Load each sound file
        for (const [name, path] of Object.entries(soundFiles)) {
            try {
                this.sounds[name] = new Audio(path);
                this.sounds[name].volume = this.volume;
                this.sounds[name].preload = 'auto';
                
                // Add error handling for missing files
                this.sounds[name].addEventListener('error', (e) => {
                    console.warn(`🔇 Sound file not found: ${path}`);
                    delete this.sounds[name]; // Remove broken sound
                });
                
                console.log(`✅ Loaded sound: ${name}`);
            } catch (error) {
                console.warn(`⚠️ Failed to load sound: ${name} - ${error.message}`);
            }
        }
    }
    
    // Play a sound
    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) {
            return false;
        }
        
        try {
            // Reset to beginning and play
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].volume = this.volume;
            
            // Use promise-based play with fallback
            const playPromise = this.sounds[soundName].play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Handle autoplay policy restrictions gracefully
                    console.log(`🔇 Autoplay prevented for ${soundName}:`, error.message);
                });
            }
            
            return true;
        } catch (error) {
            console.warn(`🔇 Sound play failed for ${soundName}:`, error.message);
            return false;
        }
    }
    
    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('steadymanager_sounds_enabled', this.enabled);
        
        // Play a test sound when enabling
        if (this.enabled) {
            setTimeout(() => this.play('click'), 100);
        }
        
        console.log(`🔊 Sounds ${this.enabled ? 'enabled' : 'disabled'}`);
        return this.enabled;
    }
    
    // Set volume (0.0 to 1.0)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('steadymanager_sound_volume', this.volume);
        
        // Update all loaded sounds
        for (const sound of Object.values(this.sounds)) {
            sound.volume = this.volume;
        }
        
        // Play test sound
        this.play('click');
        
        console.log(`🔉 Volume set to ${Math.round(this.volume * 100)}%`);
    }
    
    // Check if sounds are enabled
    isEnabled() {
        return this.enabled;
    }
    
    // Get current volume
    getVolume() {
        return this.volume;
    }
    
    // Play contextual sound based on action
    playContextual(action, data = {}) {
        const soundMap = {
            // User Actions
            'button_click': 'click',
            'tab_switch': 'click',
            'modal_open': 'click',
            'modal_close': 'click',
            
            // Lead Management
            'lead_added': 'success',
            'lead_updated': 'click',
            'lead_deleted': 'click',
            'lead_imported': 'success',
            
            // Goals & Achievements
            'goal_set': 'success',
            'goal_achieved': 'goalAchieved',
            'milestone_reached': 'goalAchieved',
            'trial_started': 'goalAchieved',
            'upgrade_completed': 'goalAchieved',
            
            // Errors & Validation
            'validation_error': 'error',
            'api_error': 'error',
            'limit_reached': 'error',
            'access_denied': 'error',
            
            // Notifications
            'notification': 'notification',
            'reminder': 'notification',
            'alert': 'notification',
            
            // Admin God Mode
            'admin_action': 'success',
            'chaos_mode': 'celebration'
        };
        
        const soundName = soundMap[action] || 'click';
        return this.play(soundName);
    }
}

// Initialize global sound manager
const soundManager = new SoundManager();
window.soundManager = soundManager; // Make globally available

// 🌙 THEME MANAGER - SMOOTH LIGHT/DARK MODE
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme();
        this.initializeTheme();
        
        console.log(`🎨 Theme Manager initialized: ${this.currentTheme} mode`);
    }
    
    // Get stored theme preference
    getStoredTheme() {
        const stored = localStorage.getItem('steadymanager_theme');
        if (stored) return stored;
        
        // Auto-detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }
    
    // Initialize theme on page load
    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        if (this.currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // Smooth transition after theme loads
        setTimeout(() => {
            document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        }, 100);
    }
    
    // Toggle between light and dark
    toggle() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        
        // Play sound
        soundManager.play('click');
        
        console.log(`🎨 Theme switched to: ${this.currentTheme}`);
        return this.currentTheme;
    }
    
    // Set specific theme
    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.warn('Invalid theme:', theme);
            return;
        }
        
        this.currentTheme = theme;
        this.applyTheme();
    }
    
    // Apply theme to document
    applyTheme() {
        localStorage.setItem('steadymanager_theme', this.currentTheme);
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        if (this.currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // Trigger theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: this.currentTheme }
        }));
    }
    
    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    // Check if dark mode
    isDarkMode() {
        return this.currentTheme === 'dark';
    }
}

// Initialize global theme manager
const themeManager = new ThemeManager();
window.themeManager = themeManager;

// 📅 DATE & TIME UTILITIES
const DateUtils = {
    // Format date for display
    formatDate(date, format = 'short') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const formats = {
            short: { month: 'short', day: 'numeric' },
            medium: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
            time: { hour: 'numeric', minute: '2-digit', hour12: true },
            datetime: { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
        };
        
        return d.toLocaleDateString('en-US', formats[format] || formats.medium);
    },
    
    // Format relative time ("2 hours ago")
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
    
    // Check if date is today
    isToday(date) {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    },
    
    // Check if date is this week
    isThisWeek(date) {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        return d >= weekStart && d <= weekEnd;
    },
    
    // Get start of current month
    getMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    },
    
    // Get end of current month
    getMonthEnd() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
};

// 💰 CURRENCY & NUMBER UTILITIES
const NumberUtils = {
    // Format currency
    formatCurrency(amount, currency = 'USD') {
        if (amount === null || amount === undefined) return '$0';
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    },
    
    // Format large numbers (1K, 1M, etc.)
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        
        const absNum = Math.abs(num);
        if (absNum >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (absNum >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        
        return num.toString();
    },
    
    // Format percentage
    formatPercentage(value, decimals = 1) {
        if (value === null || value === undefined || isNaN(value)) return '0%';
        return `${(value * 100).toFixed(decimals)}%`;
    },
    
    // Calculate percentage change
    calculatePercentageChange(oldValue, newValue) {
        if (!oldValue || oldValue === 0) return newValue > 0 ? 1 : 0;
        return (newValue - oldValue) / oldValue;
    }
};

// 🎯 TIER & PERMISSION UTILITIES
const TierUtils = {
    // Tier hierarchy for comparisons
    tierHierarchy: {
        'free': 0,
        'professional_trial': 1,
        'professional': 1,
        'business': 2,
        'enterprise': 3,
        'admin': 99
    },
    
    // Check if user has access to feature
    hasAccess(userTier, requiredTier) {
        const userLevel = this.tierHierarchy[userTier] || 0;
        const requiredLevel = this.tierHierarchy[requiredTier] || 0;
        return userLevel >= requiredLevel;
    },
    
    // Get tier display info
    getTierInfo(userType) {
        const tierConfigs = {
            'free': {
                name: 'Free Explorer',
                badge: '🆓 FREE',
                color: '#6b7280',
                bgGradient: 'from-gray-400 to-gray-600',
                leadLimit: 50
            },
            'professional_trial': {
                name: 'Professional Trial',
                badge: '🎁 TRIAL',
                color: '#f59e0b',
                bgGradient: 'from-amber-400 to-orange-500',
                leadLimit: 1000
            },
            'professional': {
                name: 'Professional',
                badge: '🚀 PRO',
                color: '#3b82f6',
                bgGradient: 'from-blue-500 to-blue-600',
                leadLimit: 1000
            },
            'business': {
                name: 'Business',
                badge: '💼 BUSINESS',
                color: '#10b981',
                bgGradient: 'from-emerald-500 to-green-600',
                leadLimit: 10000
            },
            'enterprise': {
                name: 'Enterprise',
                badge: '⭐ ENTERPRISE',
                color: '#8b5cf6',
                bgGradient: 'from-purple-500 to-violet-600',
                leadLimit: 999999
            },
            'admin': {
                name: 'Supreme Overlord',
                badge: '👑 GOD MODE',
                color: '#fbbf24',
                bgGradient: 'from-yellow-400 to-orange-500',
                leadLimit: 'UNLIMITED EVERYTHING!'
            }
        };
        
        return tierConfigs[userType] || tierConfigs.free;
    },
    
    // Get upgrade prompts for free users
    getUpgradePrompts(currentTier) {
        const prompts = {
            'free': [
                '🚀 Upgrade to Pro for advanced analytics!',
                '📊 Unlock unlimited exports with Pro!',
                '🎯 Pro users get smart lead scoring!',
                '💪 Ready to level up? Try Pro today!'
            ]
        };
        
        const tierPrompts = prompts[currentTier] || [];
        return tierPrompts[Math.floor(Math.random() * tierPrompts.length)];
    }
};

// 🎨 ANIMATION UTILITIES
const AnimationUtils = {
    // Smooth scroll to element
    scrollToElement(elementId, offset = 0) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    },
    
    // Fade in element
    fadeIn(element, duration = 300) {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const fadeInInterval = setInterval(() => {
            const currentOpacity = parseFloat(element.style.opacity);
            if (currentOpacity < 1) {
                element.style.opacity = (currentOpacity + 0.1).toString();
            } else {
                clearInterval(fadeInInterval);
            }
        }, duration / 10);
    },
    
    // Slide down element
    slideDown(element, duration = 300) {
        if (!element) return;
        
        element.style.height = '0px';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const targetHeight = element.scrollHeight;
        const increment = targetHeight / (duration / 10);
        
        const slideInterval = setInterval(() => {
            const currentHeight = parseInt(element.style.height);
            if (currentHeight < targetHeight) {
                element.style.height = (currentHeight + increment) + 'px';
            } else {
                element.style.height = 'auto';
                element.style.overflow = 'visible';
                clearInterval(slideInterval);
            }
        }, 10);
    },
    
    // Pulse animation for notifications
    pulse(element, duration = 1000) {
        if (!element) return;
        
        element.style.animation = `pulse ${duration}ms ease-in-out`;
        setTimeout(() => {
            element.style.animation = '';
        }, duration);
    }
};

// 🔍 SEARCH & FILTER UTILITIES
const SearchUtils = {
    // Smart search through objects
    searchObjects(objects, query, searchFields = []) {
        if (!query || query.trim() === '') return objects;
        
        const searchTerm = query.toLowerCase().trim();
        
        return objects.filter(obj => {
            // If no specific fields, search all string properties
            if (searchFields.length === 0) {
                return Object.values(obj).some(value => 
                    typeof value === 'string' && 
                    value.toLowerCase().includes(searchTerm)
                );
            }
            
            // Search specific fields
            return searchFields.some(field => {
                const value = obj[field];
                return value && 
                       typeof value === 'string' && 
                       value.toLowerCase().includes(searchTerm);
            });
        });
    },
    
    // Highlight search terms in text
    highlightSearchTerm(text, searchTerm) {
        if (!text || !searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },
    
    // Debounce function for search inputs
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
    }
};

// 🍞 TOAST NOTIFICATION SYSTEM
const ToastUtils = {
    // Show toast notification
    show(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }
        
        // Create toast element
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
                <button onclick="ToastUtils.remove('${toastId}')" class="ml-3 text-lg">&times;</button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 10);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toastId);
            }, duration);
        }
        
        // Play sound
        soundManager.playContextual('notification');
        
        return toastId;
    },
    
    // Remove toast
    remove(toastId) {
        const toast = document.getElementById(toastId);
        if (!toast) return;
        
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    },
    
    // Convenience methods
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    },
    
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    },
    
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    },
    
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
};

// 🎊 CELEBRATION UTILITIES
const CelebrationUtils = {
    // Trigger confetti animation
    confetti(element = document.body) {
        // Simple confetti effect using CSS animations
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
        
        for (let i = 0; i < 50; i++) {
            const confettiPiece = document.createElement('div');
            confettiPiece.style.cssText = `
                position: fixed;
                top: -10px;
                left: ${Math.random() * 100}%;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                transform: rotate(${Math.random() * 360}deg);
                animation: confetti-fall 3s linear forwards;
                pointer-events: none;
                z-index: 9999;
            `;
            
            document.body.appendChild(confettiPiece);
            
            // Remove after animation
            setTimeout(() => {
                confettiPiece.remove();
            }, 3000);
        }
        
        // Add CSS animation if not exists
        if (!document.getElementById('confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes confetti-fall {
                    to {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    // Pulse animation for achievements
    achievementPulse(element) {
        if (!element) return;
        
        element.style.animation = 'pulse 0.6s ease-in-out 3';
        setTimeout(() => {
            element.style.animation = '';
        }, 1800);
    },
    
    // Show achievement modal
    showAchievement(title, message, icon = '🎉') {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-8 text-center max-w-md mx-4 transform scale-0 transition-transform duration-300">
                <div class="text-6xl mb-4">${icon}</div>
                <h2 class="text-2xl font-bold mb-2 text-gray-900 dark:text-white">${title}</h2>
                <p class="text-gray-600 dark:text-gray-300 mb-6">${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Awesome!
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            modal.querySelector('div').classList.remove('scale-0');
            modal.querySelector('div').classList.add('scale-100');
        }, 10);
        
        // Play celebration sound
        soundManager.play('goalAchieved');
        
        // Trigger confetti
        this.confetti();
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            modal.remove();
        }, 5000);
    }
};

// 🔧 UTILITY FUNCTIONS EXPORT
const SteadyUtils = {
    // All utility modules
    Sound: soundManager,
    Theme: themeManager,
    Date: DateUtils,
    Number: NumberUtils,
    Tier: TierUtils,
    Animation: AnimationUtils,
    Search: SearchUtils,
    Toast: ToastUtils,
    Celebration: CelebrationUtils,
    
    // Quick access functions
    formatDate: DateUtils.formatDate,
    formatCurrency: NumberUtils.formatCurrency,
    formatNumber: NumberUtils.formatNumber,
    hasAccess: TierUtils.hasAccess,
    getTierInfo: TierUtils.getTierInfo,
    showToast: ToastUtils.show,
    playSound: (name) => soundManager.play(name),
    toggleTheme: () => themeManager.toggle(),
    
    // Initialize everything
    init() {
        console.log('🔧 SteadyManager Utils initialized!');
        console.log('🎵 Sound system ready');
        console.log('🎨 Theme system ready');
        console.log('🍞 Toast notifications ready');
        console.log('🎊 Celebration system ready');
        
        // Listen for celebration events
        window.addEventListener('celebrate', (event) => {
            const { type, data } = event.detail;
            
            switch (type) {
                case 'goal_achieved':
                    CelebrationUtils.showAchievement(
                        'Goal Achieved! 🎯',
                        data.message || 'Congratulations on reaching your goal!',
                        '🎯'
                    );
                    break;
                    
                case 'milestone':
                    CelebrationUtils.showAchievement(
                        'Milestone Reached! 🚀',
                        data.message || `Amazing! You've reached ${data.leadCount} leads!`,
                        '🚀'
                    );
                    break;
                    
                case 'upgrade':
                    CelebrationUtils.showAchievement(
                        'Welcome to Pro! 💎',
                        data.message || 'Enjoy your new superpowers!',
                        '💎'
                    );
                    break;
            }
        });
        
        return this;
    }
};

// Make globally available
window.SteadyUtils = SteadyUtils;
window.showToast = ToastUtils.show; // Quick access
window.playSound = (name) => soundManager.play(name); // Quick access

// Auto-initialize
SteadyUtils.init();

// 🎮 ADMIN EASTER EGGS & GOD MODE FEATURES
const AdminUtils = {
    // Matrix rain effect for admins
    matrixRain() {
        if (!window.SteadyAPI?.isAdmin()) return;
        
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9998;
        `;
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
        const charArray = chars.split('');
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = [];
        
        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }
        
        function draw() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#0F0';
            ctx.font = fontSize + 'px monospace';
            
            for (let i = 0; i < drops.length; i++) {
                const text = charArray[Math.floor(Math.random() * charArray.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }
        
        document.body.appendChild(canvas);
        const interval = setInterval(draw, 35);
        
        // Stop after 10 seconds
        setTimeout(() => {
            clearInterval(interval);
            canvas.remove();
        }, 10000);
        
        console.log('🔋 MATRIX MODE ACTIVATED - WELCOME TO THE REAL WORLD, NEO');
    },

    // Rainbow mode for admins
    rainbowMode() {
        if (!window.SteadyAPI?.isAdmin()) return;
        
        const style = document.createElement('style');
        style.id = 'rainbow-mode';
        style.textContent = `
            @keyframes rainbow {
                0% { filter: hue-rotate(0deg); }
                100% { filter: hue-rotate(360deg); }
            }
            
            .rainbow-active * {
                animation: rainbow 2s linear infinite !important;
            }
        `;
        
        document.head.appendChild(style);
        document.body.classList.add('rainbow-active');
        
        setTimeout(() => {
            document.body.classList.remove('rainbow-active');
            style.remove();
        }, 10000);
        
        console.log('🌈 RAINBOW MODE ACTIVATED - TASTE THE RAINBOW!');
    },

    // Particle system for admin UI
    createParticles() {
        if (!window.SteadyAPI?.isAdmin()) return;
        
        const particleContainer = document.createElement('div');
        particleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        
        document.body.appendChild(particleContainer);
        
        // Create golden particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: linear-gradient(45deg, #ffd700, #ffed4e);
                border-radius: 50%;
                box-shadow: 0 0 6px #ffd700;
                animation: float ${3 + Math.random() * 4}s ease-in-out infinite;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation-delay: ${Math.random() * 2}s;
            `;
            
            particleContainer.appendChild(particle);
        }
        
        // Add CSS animation
        if (!document.getElementById('particle-styles')) {
            const style = document.createElement('style');
            style.id = 'particle-styles';
            style.textContent = `
                @keyframes float {
                    0%, 100% { transform: translateY(0px) scale(1); opacity: 0.7; }
                    50% { transform: translateY(-20px) scale(1.1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove after 30 seconds
        setTimeout(() => {
            particleContainer.remove();
        }, 30000);
    },

    // Admin command palette
    showCommandPalette() {
        if (!window.SteadyAPI?.isAdmin()) return;
        
        const commands = [
            { key: 'matrix', desc: 'Activate Matrix Rain Effect', action: () => this.matrixRain() },
            { key: 'rainbow', desc: 'Rainbow Mode', action: () => this.rainbowMode() },
            { key: 'particles', desc: 'Golden Particle Effects', action: () => this.createParticles() },
            { key: 'confetti', desc: 'Confetti Explosion', action: () => CelebrationUtils.confetti() },
            { key: 'stats', desc: 'Platform Statistics', action: () => console.table(window.SteadyAPI?.Admin) },
            { key: 'users', desc: 'Show User Count', action: async () => {
                const stats = await window.SteadyAPI?.Admin?.getStats();
                console.log('👥 Platform Users:', stats.data?.users);
            }}
        ];
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="bg-gray-900 text-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 class="text-2xl font-bold mb-4 text-yellow-400">👑 ADMIN COMMAND PALETTE</h2>
                <div class="space-y-2 mb-4">
                    ${commands.map(cmd => `
                        <button onclick="AdminUtils.runCommand('${cmd.key}')" 
                                class="w-full text-left p-3 rounded bg-gray-800 hover:bg-gray-700 transition-colors">
                            <span class="font-mono text-yellow-400">${cmd.key}</span>
                            <span class="text-gray-300 ml-2">${cmd.desc}</span>
                        </button>
                    `).join('')}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store commands for execution
        this.adminCommands = commands.reduce((acc, cmd) => {
            acc[cmd.key] = cmd.action;
            return acc;
        }, {});
    },

    // Run admin command
    runCommand(key) {
        if (this.adminCommands && this.adminCommands[key]) {
            this.adminCommands[key]();
            soundManager.play('success');
        }
    },

    // Chaos mode toggle
    toggleChaosMode() {
        if (!window.SteadyAPI?.isAdmin()) return;
        
        const isChaosActive = document.body.classList.contains('chaos-mode');
        
        if (isChaosActive) {
            document.body.classList.remove('chaos-mode');
            console.log('😇 Chaos mode deactivated');
        } else {
            document.body.classList.add('chaos-mode');
            this.createParticles();
            soundManager.play('goalAchieved');
            console.log('😈 CHAOS MODE ACTIVATED - ALL HAIL THE ADMIN!');
        }
    },

    // Random admin encouragements
    getRandomAdminMessage() {
        const messages = [
            "You literally own this place! 👑",
            "With great power comes great responsibility... nah, just have fun! 😂",
            "The peasants look up to you! 🏰",
            "1 GRILLION leads at your disposal! 💫",
            "System status: UNDER YOUR COMMAND! 🎮",
            "Error 404: Limits not found for you! 🚫",
            "Breaking news: You're awesome! 📰",
            "Server message: ALL HAIL THE ADMIN! 🙇‍♂️"
        ];
        
        return messages[Math.floor(Math.random() * messages.length)];
    }
};

// 🎮 KEYBOARD SHORTCUTS SYSTEM
const KeyboardShortcuts = {
    shortcuts: {},
    konamiSequence: [],
    konamiCode: ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'],

    // Add keyboard shortcut
    add(keys, callback, description = '') {
        const keyString = keys.toLowerCase();
        this.shortcuts[keyString] = { callback, description };
    },

    // Initialize default shortcuts
    init() {
        // Universal shortcuts
        this.add('ctrl+/', () => this.showShortcutHelp(), 'Show keyboard shortcuts');
        this.add('ctrl+k', (e) => {
            e.preventDefault();
            const searchInput = document.querySelector('[data-search]') || document.querySelector('input[type="search"]');
            if (searchInput) searchInput.focus();
        }, 'Focus search');
        
        // Theme toggle
        this.add('ctrl+shift+t', () => {
            themeManager.toggle();
            ToastUtils.info(`Switched to ${themeManager.getCurrentTheme()} mode`);
        }, 'Toggle dark mode');
        
        // Sound toggle
        this.add('ctrl+shift+s', () => {
            const enabled = soundManager.toggle();
            ToastUtils.info(`Sounds ${enabled ? 'enabled' : 'disabled'}`);
        }, 'Toggle sounds');
        
        // Admin shortcuts (only work for admins)
        this.add('ctrl+shift+a', () => {
            if (window.SteadyAPI?.isAdmin()) {
                AdminUtils.showCommandPalette();
            }
        }, 'Admin command palette (Admin only)');
        
        this.add('ctrl+shift+m', () => {
            if (window.SteadyAPI?.isAdmin()) {
                AdminUtils.matrixRain();
            }
        }, 'Matrix effect (Admin only)');
        
        this.add('ctrl+shift+r', () => {
            if (window.SteadyAPI?.isAdmin()) {
                AdminUtils.rainbowMode();
            }
        }, 'Rainbow mode (Admin only)');
        
        this.add('ctrl+shift+c', () => {
            if (window.SteadyAPI?.isAdmin()) {
                AdminUtils.toggleChaosMode();
            }
        }, 'Chaos mode (Admin only)');
        
        // Listen for key combinations
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        console.log('⌨️ Keyboard shortcuts initialized');
    },

    // Handle keydown events
    handleKeyDown(e) {
        const keys = [];
        
        if (e.ctrlKey) keys.push('ctrl');
        if (e.shiftKey) keys.push('shift');
        if (e.altKey) keys.push('alt');
        if (e.metaKey) keys.push('meta');
        
        // Add the actual key
        const key = e.key.toLowerCase();
        
        // Handle Konami code
        this.handleKonamiCode(key);
        
        if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
            keys.push(key === ' ' ? 'space' : key);
        }
        
        const keyString = keys.join('+');
        
        if (this.shortcuts[keyString]) {
            e.preventDefault();
            this.shortcuts[keyString].callback(e);
        }
    },

    // Handle Konami code sequence
    handleKonamiCode(key) {
        const keyMap = {
            'arrowup': 'up',
            'arrowdown': 'down',
            'arrowleft': 'left',
            'arrowright': 'right'
        };
        
        const mappedKey = keyMap[key] || key;
        this.konamiSequence.push(mappedKey);
        
        // Keep only the last 10 keys
        if (this.konamiSequence.length > 10) {
            this.konamiSequence.shift();
        }
        
        // Check if sequence matches Konami code
        if (this.konamiSequence.length === 10 && 
            this.konamiSequence.join(',') === this.konamiCode.join(',')) {
            
            this.activateKonamiCode();
            this.konamiSequence = [];
        }
    },

    // Activate Konami code easter egg
    activateKonamiCode() {
        CelebrationUtils.confetti();
        soundManager.play('goalAchieved');
        ToastUtils.success('🎮 Konami Code activated! 30 extra lives!', 5000);
        
        // Special admin bonus
        if (window.SteadyAPI?.isAdmin()) {
            AdminUtils.matrixRain();
            setTimeout(() => AdminUtils.rainbowMode(), 2000);
            ToastUtils.info('👑 Admin bonus: ULTRA COMBO!', 3000);
        }
        
        console.log('🎮 KONAMI CODE ACTIVATED! ↑↑↓↓←→←→BA');
    },

    // Show shortcut help
    showShortcutHelp() {
        const isAdmin = window.SteadyAPI?.isAdmin();
        const shortcuts = Object.entries(this.shortcuts)
            .filter(([key, info]) => {
                if (!info.description) return false;
                // Hide admin shortcuts for non-admins
                if (info.description.includes('Admin only') && !isAdmin) return false;
                return true;
            })
            .map(([key, info]) => `
                <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                    <span class="font-mono text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">${key}</span>
                    <span class="text-sm text-gray-600 dark:text-gray-300">${info.description}</span>
                </div>
            `);
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
                <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">⌨️ Keyboard Shortcuts</h2>
                <div class="space-y-1 mb-4">
                    ${shortcuts.join('')}
                </div>
                ${isAdmin ? `
                    <div class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                        <p class="text-sm text-yellow-800 dark:text-yellow-200">
                            👑 <strong>Admin detected!</strong> You have special powers unlocked.
                        </p>
                    </div>
                ` : ''}
                <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <p class="text-sm text-blue-800 dark:text-blue-200">
                        🎮 <strong>Pro tip:</strong> Try the Konami code! ↑↑↓↓←→←→BA
                    </p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-4">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
};

// 📱 MOBILE & RESPONSIVE UTILITIES
const MobileUtils = {
    // Detect if user is on mobile
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Detect if user is on tablet
    isTablet() {
        return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    },
    
    // Get screen size category
    getScreenSize() {
        const width = window.innerWidth;
        if (width < 640) return 'mobile';
        if (width < 768) return 'sm';
        if (width < 1024) return 'md';
        if (width < 1280) return 'lg';
        return 'xl';
    },
    
    // Enable mobile optimizations
    enableMobileOptimizations() {
        if (this.isMobile()) {
            document.body.classList.add('mobile-device');
            
            // Prevent zoom on input focus (iOS)
            const viewport = document.querySelector('meta[name=viewport]');
            if (viewport) {
                viewport.setAttribute('content', 
                    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'
                );
            }
            
            document.body.classList.add('touch-device');
        }
    },
    
    // Add touch support
    addTouchSupport() {
        // Touch feedback for buttons
        document.addEventListener('touchstart', (e) => {
            if (e.target.matches('button, [role="button"], a')) {
                e.target.classList.add('touch-active');
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (e.target.matches('button, [role="button"], a')) {
                setTimeout(() => {
                    e.target.classList.remove('touch-active');
                }, 150);
            }
        });
    }
};

// 🎮 GAMIFICATION UTILITIES
const GamificationUtils = {
    // Calculate user level based on lead count
    calculateUserLevel(leadCount) {
        const levels = [
            { min: 0, max: 9, name: 'Rookie', icon: '🌱', color: '#84cc16' },
            { min: 10, max: 24, name: 'Explorer', icon: '🔍', color: '#06b6d4' },
            { min: 25, max: 49, name: 'Hunter', icon: '🎯', color: '#8b5cf6' },
            { min: 50, max: 99, name: 'Professional', icon: '💼', color: '#3b82f6' },
            { min: 100, max: 249, name: 'Expert', icon: '⭐', color: '#f59e0b' },
            { min: 250, max: 499, name: 'Master', icon: '🏆', color: '#f97316' },
            { min: 500, max: 999, name: 'Legend', icon: '👑', color: '#dc2626' },
            { min: 1000, max: Infinity, name: 'Mythical', icon: '🦄', color: '#9333ea' }
        ];
        
        return levels.find(level => leadCount >= level.min && leadCount <= level.max) || levels[0];
    },
    
    // Generate achievement badges
    checkAchievements(stats) {
        const achievements = [];
        
        // Lead count achievements
        const milestones = [1, 10, 25, 50, 100, 250, 500, 1000];
        milestones.forEach(milestone => {
            if (stats.totalLeads >= milestone) {
                achievements.push({
                    id: `leads_${milestone}`,
                    name: `${milestone} Leads Club`,
                    description: `Reached ${milestone} total leads`,
                    icon: milestone >= 1000 ? '🦄' : milestone >= 500 ? '👑' : milestone >= 100 ? '🏆' : '⭐',
                    earned: true,
                    category: 'leads'
                });
            }
        });
        
        return achievements;
    }
};

// 🔧 PERFORMANCE & SECURITY UTILITIES
const PerformanceUtils = {
    // Debounce function calls
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
    },
    
    // Throttle function calls
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
};

const SecurityUtils = {
    // Sanitize HTML to prevent XSS
    sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    },
    
    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};

// 📊 ANALYTICS UTILITIES
const AnalyticsUtils = {
    // Track user events
    track(eventName, properties = {}) {
        const eventData = {
            event: eventName,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userId: window.SteadyAPI?.getCurrentUser()?.id || null,
            userTier: window.SteadyAPI?.getCurrentUser()?.userType || 'unknown',
            ...properties
        };
        
        console.log('📊 Analytics Event:', eventData);
        this.storeEvent(eventData);
    },
    
    // Store events locally
    storeEvent(eventData) {
        try {
            const events = JSON.parse(localStorage.getItem('steadymanager_analytics') || '[]');
            events.push(eventData);
            
            // Keep only last 100 events
            if (events.length > 100) {
                events.splice(0, events.length - 100);
            }
            
            localStorage.setItem('steadymanager_analytics', JSON.stringify(events));
        } catch (error) {
            console.warn('Failed to store analytics event:', error);
        }
    }
};

// 🔧 ADD ALL UTILITIES TO MAIN EXPORT
SteadyUtils.Admin = AdminUtils;
SteadyUtils.Keyboard = KeyboardShortcuts;
SteadyUtils.Mobile = MobileUtils;
SteadyUtils.Gamification = GamificationUtils;
SteadyUtils.Performance = PerformanceUtils;
SteadyUtils.Security = SecurityUtils;
SteadyUtils.Analytics = AnalyticsUtils;

// 🚀 INITIALIZE EVERYTHING
KeyboardShortcuts.init();
MobileUtils.enableMobileOptimizations();
MobileUtils.addTouchSupport();

// 🔊 ENHANCED SOUND CONTEXT AWARENESS
soundManager.playContextual = function(context, data = {}) {
    const contextMap = {
        // Navigation & UI
        'tab_switch': 'click',
        'modal_open': 'click',
        'dropdown_open': 'click',
        
        // Lead Management
        'lead_added': 'success',
        'lead_updated': 'click',
        'lead_deleted': 'click',
        'bulk_action': 'success',
        
        // Goals & Progress
        'goal_progress': data.completed ? 'goalAchieved' : 'notification',
        'milestone_reached': 'goalAchieved',
        'level_up': 'goalAchieved',
        
        // Business Events
        'upgrade_completed': 'goalAchieved',
        'trial_started': 'goalAchieved',
        
        // Errors & Warnings
        'validation_failed': 'error',
        'limit_reached': 'error',
        'access_denied': 'error',
        
        // Admin Events
        'admin_login': 'goalAchieved',
        'chaos_activated': 'celebration'
    };
    
    const soundName = contextMap[context];
    if (soundName) {
        return this.play(soundName);
    }
    
    return false;
};

// 🎯 CONSOLE ART & COMPLETION MESSAGE
console.log(`
🎨 ====================================================
   _____ __                __         __  ____  _ __   
  / ___// /____  ____ _____/ /_  __   / / / / /_(_) /____
  \\__ \\/ __/ _ \\/ __ \`/ __  / / / /  / / / / __/ / / ___/
 ___/ / /_/  __/ /_/ / /_/ / /_/ /  / /_/ / /_/ / (__  ) 
/____/\\__/\\___/\\__,_/\\__,_/\\__, /   \\____/\\__/_/_/____/  
                         /____/                         
🎨 ====================================================

🔥 UTILS.JS v3.0 - FULLY COMPLETE!

✨ CORE SYSTEMS:
   🎵 Sound System (contextual audio)
   🎨 Theme Manager (smooth transitions)
   ⌨️  Keyboard Shortcuts (power user features)
   🍞 Toast Notifications (beautiful alerts)
   🎊 Celebration System (achievements & confetti)

👑 ADMIN FEATURES:
   🌧️  Matrix Rain Effect
   🌈 Rainbow Mode  
   ✨ Golden Particles
   🎮 Command Palette
   😈 Chaos Mode Toggle

📱 MOBILE & OPTIMIZATION:
   📱 Touch Support
   🚀 Performance Utils
   🔒 Security Helpers
   📊 Analytics Tracking
   🎮 Gamification System

🎯 READY FOR DASHBOARD.JS!

💡 Try these shortcuts:
   Ctrl+Shift+T = Toggle dark mode
   Ctrl+Shift+S = Toggle sounds
   Ctrl+/ = Show all shortcuts
   ${window.SteadyAPI?.isAdmin() ? 'Ctrl+Shift+A = Admin command palette' : ''}
   🎮 Konami Code = ↑↑↓↓←→←→BA (secret!)
`);

// Make everything globally available
window.AdminUtils = AdminUtils;
window.MobileUtils = MobileUtils;
window.GamificationUtils = GamificationUtils;
window.PerformanceUtils = PerformanceUtils;
window.SecurityUtils = SecurityUtils;
window.AnalyticsUtils = AnalyticsUtils;

console.log('🚀 ALL SYSTEMS OPERATIONAL - READY TO BUILD THE FUTURE! 🌟');