window.ModuleMarket = {
    state: {
        container: 'module-market-content',
        availableModules: [],
        activeModules: [],
        availableThemes: [],
        currentTheme: 'light',
        userTier: null,
        currentFilter: 'all'
    },

    async init(targetContainer = 'module-market-content') {
        console.log('🛍️ Module Market initializing...');

        this.state.container = targetContainer;
        this.showLoading();

        try {
            await this.checkAuth();
            await this.loadUserPreferences();
            this.loadAvailableThemes();
            this.loadAvailableModules();

            // Apply current theme to document
            document.documentElement.setAttribute('data-theme', this.state.currentTheme);

            this.render();
            this.attachEvents();

            console.log('✅ Module Market ready');

        } catch (error) {
            console.error('❌ Module Market init failed:', error);
            this.showError('Failed to load module market');
        }
    },

    async checkAuth() {
        const { authenticated } = await API.checkAuth();
        if (!authenticated) {
            window.location.href = '/auth/login.html';
            throw new Error('Not authenticated');
        }
    },

    async loadUserPreferences() {
        const profile = await API.getProfile();

        this.state.userTier = profile.user_type;
        this.state.activeModules = await API.getEnabledModules();
        this.state.currentTheme = await API.getTheme();
    },

    loadAvailableThemes() {
        this.state.availableThemes = [
            {
                id: 'light',
                name: 'Light',
                description: 'Clean and bright interface',
                tier: 'free',
                preview: '#f8fafc'
            },
            {
                id: 'dark',
                name: 'Dark',
                description: 'Easy on the eyes',
                tier: 'free',
                preview: '#1a1f2e'
            },
            {
                id: 'whiteout',
                name: 'Whiteout',
                description: 'All white with black accents',
                tier: 'professional',
                preview: '#ffffff'
            },
            {
                id: 'slate',
                name: 'Slate',
                description: 'Softer gray dark mode',
                tier: 'professional',
                preview: '#2a2e39'
            },
            {
                id: 'minimal-red',
                name: 'Minimal Red',
                description: 'Dark with clean red accents',
                tier: 'professional',
                preview: '#1a1f2e'
            },
            {
                id: 'founders-edition',
                name: 'Founders Edition',
                description: 'Lightning Blue - Electric cyan cyberpunk',
                tier: 'early_access',
                preview: '#00d9ff'
            },
            {
                id: 'joshs-style',
                name: "Josh's Style",
                description: 'Electric orange glow',
                tier: 'early_access',
                preview: '#ff6b00'
            }
        ];
    },

    loadAvailableModules() {
        this.state.availableModules = [
            {
                id: 'goals',
                name: 'Goals',
                description: 'Set targets, track progress, and achieve your objectives',
                icon: 'target',
                tier: 'free',
                category: 'productivity',
                enabled: this.state.activeModules.includes('goals'),
                comingSoon: false
            },
            {
                id: 'jobs',
                name: 'Job Management',
                description: 'Complete project hub: Estimates, Jobs, and Clients all-in-one',
                icon: 'briefcase',
                tier: 'free',
                category: 'operations',
                enabled: this.state.activeModules.includes('jobs'),
                comingSoon: false
            },
            {
                id: 'notes',
                name: 'Notes',
                description: 'Capture ideas and organize your thoughts',
                icon: 'sticky-note',
                tier: 'early_access',
                category: 'productivity',
                enabled: this.state.activeModules.includes('notes'),
                comingSoon: false
            },
            {
                id: 'reports',
                name: 'Advanced Reports',
                description: 'Custom reports, data export, and analytics dashboards',
                icon: 'bar-chart-2',
                tier: 'professional',
                category: 'productivity',
                enabled: false,
                comingSoon: true
            },
            {
                id: 'integrations',
                name: 'Integrations',
                description: 'Connect with third-party tools and automate workflows',
                icon: 'plug',
                tier: 'professional',
                category: 'operations',
                enabled: false,
                comingSoon: true
            },
            {
                id: 'teams',
                name: 'Team Collaboration',
                description: 'Invite team members and manage permissions',
                icon: 'users',
                tier: 'professional',
                category: 'operations',
                enabled: false,
                comingSoon: true
            }
        ];
    },

    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="module-market-shell">
                ${this.renderHeader()}
                <h2 class="section-title">Optional Modules</h2>
                ${this.renderFilterBar()}
                ${this.renderModuleGrid()}
                <div class="section-divider"></div>
                ${this.renderThemesSection()}
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    renderHeader() {
        return `
            <div class="market-header">
                <button class="market-back-btn" onclick="window.loadPage('settings')">
                    <i data-lucide="arrow-left"></i>
                    <span>Back to Settings</span>
                </button>
                <div class="market-title-section">
                    <h1 class="market-title">
                        <i data-lucide="shopping-bag"></i>
                        Module Market
                    </h1>
                    <p class="market-subtitle">Customize your workspace with optional modules and themes</p>
                </div>
            </div>
        `;
    },

    renderThemesSection() {
        return `
            <div class="themes-section">
                <h2 class="section-title">
                    <i data-lucide="palette"></i>
                    Themes
                </h2>
                <div class="themes-grid">
                    ${this.state.availableThemes.map(theme => this.renderThemeCard(theme)).join('')}
                </div>
            </div>
        `;
    },

    renderThemeCard(theme) {
        const isActive = this.state.currentTheme === theme.id;

        // Lock logic: Pro themes for non-pro users, Admin themes for non-admins
        const isProLocked = theme.tier === 'professional' && !['professional', 'professional_trial', 'business', 'enterprise', 'admin'].includes(this.state.userTier);
        const isAdminLocked = theme.tier === 'early_access' && this.state.userTier !== 'admin';
        const isLocked = isProLocked || isAdminLocked;

        // Badge rendering
        const tierLabel = theme.tier === 'free' ? 'Free' : theme.tier === 'professional' ? 'Pro' : 'Admin';
        const tierClass = theme.tier === 'free' ? 'tier-free' : theme.tier === 'professional' ? 'tier-pro' : 'tier-admin';

        return `
            <div
                class="theme-card ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}"
                data-theme-id="${theme.id}"
                onclick="ModuleMarketModule.selectTheme('${theme.id}')"
            >
                <div class="tier-badge ${tierClass}">
                    ${tierLabel}
                </div>

                <div class="theme-preview" style="background: ${theme.preview};">
                    ${isActive ? '<i data-lucide="check"></i>' : ''}
                    ${isLocked ? '<i data-lucide="lock"></i>' : ''}
                </div>

                <div class="theme-info">
                    <h3 class="theme-name">${theme.name}</h3>
                    <p class="theme-description">${theme.description}</p>
                </div>
            </div>
        `;
    },

    renderFilterBar() {
        const filters = [
            { id: 'all', label: 'All Modules' },
            { id: 'comingSoon', label: 'Coming Soon' }
        ];

        return `
            <div class="market-filter-bar">
                ${filters.map(filter => `
                    <button
                        class="filter-btn ${this.state.currentFilter === filter.id ? 'active' : ''}"
                        data-filter="${filter.id}"
                    >
                        ${filter.label}
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderModuleGrid() {
        const filteredModules = this.getFilteredModules();

        if (filteredModules.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3>No modules found</h3>
                    <p>Try selecting a different filter</p>
                </div>
            `;
        }

        return `
            <div class="module-grid">
                ${filteredModules.map(module => this.renderModuleCard(module)).join('')}
            </div>
        `;
    },

    renderModuleCard(module) {
        // Lock logic: Pro modules for non-pro users, Admin modules for non-admins
        const isProLocked = module.tier === 'professional' && !['professional', 'professional_trial', 'business', 'enterprise', 'admin'].includes(this.state.userTier);
        const isAdminLocked = module.tier === 'early_access' && this.state.userTier !== 'admin';
        const isLocked = isProLocked || isAdminLocked;

        // Badge rendering
        const tierLabel = module.tier === 'free' ? 'Free' : module.tier === 'professional' ? 'Pro' : 'Admin';
        const tierClass = module.tier === 'free' ? 'tier-free' : module.tier === 'professional' ? 'tier-pro' : 'tier-admin';

        return `
            <div class="module-card ${module.enabled ? 'active' : ''} ${module.comingSoon ? 'coming-soon' : ''} ${isLocked ? 'locked' : ''}" data-module-id="${module.id}">
                ${module.comingSoon ? '<div class="coming-soon-overlay"></div>' : ''}

                <div class="tier-badge ${tierClass}">
                    ${tierLabel}
                </div>

                <div class="module-card-inner">
                    <div class="module-icon-wrapper">
                        <div class="module-icon">
                            <i data-lucide="${module.icon}"></i>
                        </div>
                    </div>

                    <h3 class="module-name">${module.name}</h3>
                    <p class="module-description">${module.description}</p>

                    <div class="module-meta">
                        <span class="category-badge category-${module.category}">
                            ${this.getCategoryIcon(module.category)}
                            ${module.category.charAt(0).toUpperCase() + module.category.slice(1)}
                        </span>
                    </div>

                    <div class="module-actions">
                        ${this.renderModuleAction(module, isLocked)}
                    </div>
                </div>
            </div>
        `;
    },

    renderModuleAction(module, isLocked) {
        if (module.comingSoon) {
            return `
                <div class="coming-soon-badge-large">
                    <i data-lucide="clock"></i>
                    Coming Soon
                </div>
            `;
        }

        // Admin-only modules show "Coming Soon" for non-admins
        if (module.tier === 'early_access' && this.state.userTier !== 'admin') {
            return `
                <div class="coming-soon-badge-large">
                    <i data-lucide="clock"></i>
                    Coming Soon
                </div>
            `;
        }

        if (isLocked) {
            return `
                <button class="module-toggle locked" disabled>
                    <i data-lucide="lock"></i>
                    <span>Upgrade to Pro</span>
                </button>
            `;
        }

        return `
            <button
                class="module-toggle ${module.enabled ? 'enabled' : 'disabled'}"
                data-module-id="${module.id}"
                onclick="ModuleMarketModule.toggleModule('${module.id}')"
            >
                <i data-lucide="${module.enabled ? 'x' : 'plus'}"></i>
                <span>${module.enabled ? 'Disable' : 'Enable'}</span>
            </button>
        `;
    },

    getCategoryIcon(category) {
        const icons = {
            productivity: '<i data-lucide="zap"></i>',
            operations: '<i data-lucide="settings"></i>',
            sales: '<i data-lucide="dollar-sign"></i>',
            marketing: '<i data-lucide="megaphone"></i>'
        };
        return icons[category] || '';
    },

    getFilteredModules() {
        if (this.state.currentFilter === 'all') {
            return this.state.availableModules;
        }

        if (this.state.currentFilter === 'comingSoon') {
            return this.state.availableModules.filter(m => m.comingSoon);
        }

        return this.state.availableModules.filter(m => m.category === this.state.currentFilter);
    },

    attachEvents() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.currentFilter = btn.dataset.filter;
                this.updateFilterButtons();
                this.updateGrid();
            });
        });
    },

    // Update only filter button active states (no re-render)
    updateFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.state.currentFilter);
        });
    },

    // Update only the grid content (no full re-render)
    updateGrid() {
        let gridContainer = document.querySelector('.module-grid');
        const emptyState = document.querySelector('.empty-state');
        const filteredModules = this.getFilteredModules();

        if (filteredModules.length === 0) {
            // Show empty state
            const emptyHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3>No modules found</h3>
                    <p>Try selecting a different filter</p>
                </div>
            `;

            if (gridContainer) {
                gridContainer.outerHTML = emptyHTML;
            } else if (emptyState) {
                emptyState.outerHTML = emptyHTML;
            }
        } else {
            // Show modules grid
            const gridHTML = `<div class="module-grid">${filteredModules.map(module => this.renderModuleCard(module)).join('')}</div>`;

            if (gridContainer) {
                gridContainer.innerHTML = filteredModules.map(module => this.renderModuleCard(module)).join('');
            } else if (emptyState) {
                emptyState.outerHTML = gridHTML;
            }

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    async toggleModule(moduleId) {
        const module = this.state.availableModules.find(m => m.id === moduleId);
        if (!module || module.comingSoon) return;

        // Save previous state for rollback
        const previousEnabled = module.enabled;
        const previousActiveModules = [...this.state.activeModules];

        try {
            // Toggle module state
            const newState = !module.enabled;
            module.enabled = newState;

            // Update activeModules array
            if (newState) {
                if (!this.state.activeModules.includes(moduleId)) {
                    this.state.activeModules.push(moduleId);
                }
            } else {
                this.state.activeModules = this.state.activeModules.filter(id => id !== moduleId);
            }

            // Update UI immediately (optimistic)
            const card = document.querySelector(`[data-module-id="${moduleId}"]`);
            if (card) {
                card.classList.toggle('active', newState);
                const toggle = card.querySelector('.module-toggle');
                if (toggle) {
                    toggle.classList.toggle('enabled', newState);
                    toggle.classList.toggle('disabled', !newState);
                    toggle.innerHTML = `
                        <i data-lucide="${newState ? 'x' : 'plus'}"></i>
                        <span>${newState ? 'Disable' : 'Enable'}</span>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }

            // Save to database with tier enforcement
            await API.updateModules(this.state.activeModules);

            // Invalidate cache for fresh data on next load
            if (window.AppCache) {
                window.AppCache.invalidate('preferences');
            }

            // Refresh sidebar immediately to show/hide module
            if (window.refreshSidebar) {
                await window.refreshSidebar();
            }

            // Show success toast
            window.SteadyUtils?.showToast(
                `${module.name} ${newState ? 'enabled' : 'disabled'}`,
                'success'
            );

            console.log(`✅ Module ${moduleId} ${newState ? 'enabled' : 'disabled'}`);

        } catch (error) {
            console.error('Toggle module error:', error);
            window.SteadyUtils?.showToast(error.message || 'Failed to update module', 'error');

            // Revert state on error
            module.enabled = previousEnabled;
            this.state.activeModules = previousActiveModules;

            // Update grid to reflect reverted state (no full re-render)
            this.updateGrid();
        }
    },

    async selectTheme(themeId) {
        const theme = this.state.availableThemes.find(t => t.id === themeId);
        if (!theme) return;

        // Admin-only themes: do nothing for non-admins (no notification)
        if (theme.tier === 'early_access' && this.state.userTier !== 'admin') {
            return;
        }

        // Check if locked
        const isLocked = theme.tier === 'professional' && !['professional', 'professional_trial', 'business', 'enterprise', 'admin'].includes(this.state.userTier);
        if (isLocked) {
            window.SteadyUtils?.showToast('This theme requires a Professional plan. Upgrade to unlock premium themes!', 'error');
            return;
        }

        // Already active
        if (this.state.currentTheme === themeId) {
            return;
        }

        // Save previous theme for rollback
        const previousTheme = this.state.currentTheme;

        try {
            // Update state optimistically
            this.state.currentTheme = themeId;

            // Update all theme cards immediately
            document.querySelectorAll('.theme-card').forEach(card => {
                const cardThemeId = card.dataset.themeId;
                const isActive = cardThemeId === themeId;
                card.classList.toggle('active', isActive);

                const preview = card.querySelector('.theme-preview');
                if (preview) {
                    // Remove old check icon
                    const oldCheck = preview.querySelector('[data-lucide="check"]');
                    if (oldCheck) oldCheck.remove();

                    // Add check to active theme
                    if (isActive) {
                        preview.innerHTML = '<i data-lucide="check"></i>' + preview.innerHTML;
                    }
                }
            });

            // Re-init lucide icons
            if (typeof lucide !== 'undefined') lucide.createIcons();

            // Apply theme to document immediately
            document.documentElement.setAttribute('data-theme', themeId);

            // Save to database with tier enforcement
            await API.updateTheme(themeId);

            // Invalidate cache for fresh data on next load
            if (window.AppCache) {
                window.AppCache.invalidate('preferences');
            }

            // Show success toast
            window.SteadyUtils?.showToast(`${theme.name} theme activated`, 'success');

            console.log(`✅ Theme changed to ${themeId}`);

        } catch (error) {
            console.error('Theme selection error:', error);
            window.SteadyUtils?.showToast(error.message || 'Failed to update theme', 'error');

            // Revert state on error
            this.state.currentTheme = previousTheme;
            document.documentElement.setAttribute('data-theme', previousTheme);

            // Revert UI
            document.querySelectorAll('.theme-card').forEach(card => {
                const cardThemeId = card.dataset.themeId;
                card.classList.toggle('active', cardThemeId === previousTheme);
            });

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loader"></div>
                    <p>Loading module market...</p>
                </div>
            `;
        }
    },

    showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h2>Failed to Load</h2>
                    <p>${API.escapeHtml(message)}</p>
                    <button class="btn-primary" onclick="ModuleMarketModule.init()">
                        Try Again
                    </button>
                </div>
            `;
        }
    },

    renderStyles() {
        return `
            <style>
                .module-market-shell {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 2rem;
                    animation: fadeIn 0.4s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Header */
                .market-header {
                    margin-bottom: 2rem;
                }

                .market-back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1rem;
                    background: var(--surface-hover);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-secondary);
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: var(--transition);
                    margin-bottom: 1.5rem;
                }

                .market-back-btn:hover {
                    background: var(--surface);
                    color: var(--primary);
                    border-color: var(--primary);
                    transform: translateX(-4px);
                }

                .market-back-btn i {
                    width: 16px;
                    height: 16px;
                }

                .market-title-section {
                    text-align: center;
                }

                .market-title {
                    font-size: 2.5rem;
                    font-weight: 900;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                }

                .market-title i {
                    width: 2.5rem;
                    height: 2.5rem;
                    stroke: var(--primary);
                    stroke-width: 2;
                }

                .market-subtitle {
                    font-size: 1.125rem;
                    color: var(--text-secondary);
                }

                /* Section Styling */
                .section-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .section-title i {
                    width: 24px;
                    height: 24px;
                    color: var(--primary);
                }

                .section-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 3rem 0;
                }

                /* Themes Section */
                .themes-section {
                    margin-bottom: 2rem;
                }

                .themes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 1rem;
                }

                .theme-card {
                    position: relative;
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    cursor: pointer;
                    transition: var(--transition);
                }

                .theme-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-4px);
                    box-shadow: var(--shadow);
                }

                .theme-card.active {
                    border-color: var(--primary);
                    box-shadow: 0 4px 12px var(--job-btn-shadow);
                }

                .theme-card.locked {
                    cursor: not-allowed;
                    opacity: 0.7;
                }

                .theme-card.locked:hover {
                    transform: none;
                    border-color: var(--border);
                }

                .theme-preview {
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    border-bottom: 2px solid var(--border);
                }

                .theme-preview i {
                    width: 32px;
                    height: 32px;
                    color: white;
                    stroke-width: 3;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                }

                .theme-info {
                    padding: 1rem;
                    text-align: center;
                }

                .theme-name {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .theme-description {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    line-height: 1.4;
                }

                /* Filter Bar */
                .market-filter-bar {
                    display: flex;
                    gap: 0.75rem;
                    margin-bottom: 2rem;
                    padding-top: 0.25rem;
                    overflow-x: auto;
                    flex-wrap: wrap;
                }

                .filter-btn {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.75rem 1.25rem;
                    background: var(--background);
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-secondary);
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: var(--transition);
                    white-space: nowrap;
                }

                .filter-btn:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                    transform: translateY(-2px);
                }

                .filter-btn.active {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: white;
                    box-shadow: 0 4px 12px var(--job-btn-shadow);
                }

                /* Module Grid */
                .module-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                }

                .module-card {
                    position: relative;
                    background: var(--module-card-bg);
                    border: 2px solid var(--module-card-border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    transition: var(--transition);
                    cursor: default;
                }

                .module-card:hover {
                    border-color: var(--module-card-hover-border);
                    box-shadow: var(--module-card-hover-shadow);
                    transform: translateY(-4px);
                }

                .module-card.active {
                    background: var(--module-card-active-bg);
                    border-color: var(--module-card-active-border);
                }

                .module-card.coming-soon {
                    opacity: 0.7;
                }

                .module-card.locked {
                    opacity: 0.8;
                }

                .coming-soon-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: var(--coming-soon-overlay);
                    z-index: 1;
                    
                }

                .module-card-inner {
                    position: relative;
                    z-index: 2;
                    padding: 2rem;
                }

                /* Tier Badge */
                .tier-badge {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    z-index: 3;
                    display: inline-flex;
                    align-items: center;
                    padding: 0.375rem 0.75rem;
                    border-radius: 9999px;
                    color: white;
                    font-weight: 700;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .tier-badge.tier-free {
                    background: var(--tier-free-bg);
                    box-shadow: var(--tier-free-shadow);
                }

                .tier-badge.tier-pro {
                    background: var(--tier-pro-bg);
                    box-shadow: var(--tier-pro-shadow);
                }

                .tier-badge.tier-admin {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
                    color: white;
                }

                /* Module Icon */
                .module-icon-wrapper {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }

                .module-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: var(--radius-lg);
                    background: var(--module-icon-bg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: var(--transition);
                }

                .module-card:hover .module-icon {
                    transform: scale(1.1) rotate(5deg);
                }

                .module-icon i {
                    width: 40px;
                    height: 40px;
                    color: var(--module-icon-color);
                    stroke-width: 2;
                }

                /* Module Content */
                .module-name {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-bottom: 0.75rem;
                    text-align: center;
                }

                .module-description {
                    font-size: 0.95rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                    text-align: center;
                }

                /* Module Meta */
                .module-meta {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }

                .category-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.375rem 0.75rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    font-size: 0.8rem;
                }

                .category-badge i {
                    width: 14px;
                    height: 14px;
                }

                .category-badge.category-productivity {
                    background: var(--category-productivity-bg);
                    color: var(--category-productivity-color);
                }

                .category-badge.category-operations {
                    background: var(--category-operations-bg);
                    color: var(--category-operations-color);
                }

                .category-badge.category-sales {
                    background: var(--category-sales-bg);
                    color: var(--category-sales-color);
                }

                .category-badge.category-marketing {
                    background: var(--category-marketing-bg);
                    color: var(--category-marketing-color);
                }

                /* Module Actions */
                .module-actions {
                    display: flex;
                    justify-content: center;
                }

                .module-toggle {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.625rem;
                    padding: 0.875rem 2rem;
                    border-radius: var(--radius);
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: var(--transition);
                    border: none;
                    width: 100%;
                    justify-content: center;
                }

                .module-toggle i {
                    width: 18px;
                    height: 18px;
                }

                .module-toggle.enabled {
                    background: var(--toggle-enabled-bg);
                    color: white;
                    box-shadow: var(--toggle-enabled-shadow);
                }

                .module-toggle.enabled:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
                }

                .module-toggle.disabled {
                    background: var(--toggle-disabled-bg);
                    color: var(--toggle-disabled-color);
                    border: 2px solid var(--border);
                }

                .module-toggle.disabled:hover {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                    transform: translateY(-2px);
                }

                .module-toggle.locked {
                    background: var(--border);
                    color: var(--text-tertiary);
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                .coming-soon-badge-large {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.625rem;
                    padding: 0.875rem 2rem;
                    background: var(--coming-soon-badge-bg);
                    color: white;
                    border-radius: var(--radius);
                    font-weight: 700;
                    font-size: 0.95rem;
                    width: 100%;
                    justify-content: center;
                }

                .coming-soon-badge-large i {
                    width: 18px;
                    height: 18px;
                }

                /* Empty State */
                .empty-state {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .empty-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state h3 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .empty-state p {
                    color: var(--text-secondary);
                }

                /* Loading & Error States */
                .loading-state,
                .error-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    text-align: center;
                }

                .loader {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--border);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .loading-state p {
                    color: var(--text-secondary);
                    font-size: 1rem;
                }

                .error-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }

                .error-state h2 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .error-state p {
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .module-market-shell {
                        padding: 1rem;
                    }

                    .market-title {
                        font-size: 2rem;
                    }

                    .market-title i {
                        width: 2rem;
                        height: 2rem;
                    }

                    .module-grid {
                        grid-template-columns: 1fr;
                    }

                    .market-filter-bar {
                        overflow-x: auto;
                        flex-wrap: nowrap;
                    }
                }
            </style>
        `;
    }
};

// Module initialization
if (typeof window !== 'undefined') {
    window.ModuleMarketModule = window.ModuleMarket;
    console.log('✅ Module Market loaded');
}
