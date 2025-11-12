/**
 * JOBS PARENT MODULE - Container for Estimates, Jobs, and Clients
 * Acts as a hub with 3 main sections
 */

window.JobsModule = {
    state: {
        container: 'jobs-content',
        activeSection: null  // 'estimates', 'jobs', or 'clients'
    },

    /**
     * Initialize - Resume last section or show hub
     */
    async init(targetContainer = 'jobs-content') {
        this.state.container = targetContainer;

        // If user was previously viewing a section, resume it
        if (this.state.activeSection) {
            await this.loadSection(this.state.activeSection);
        } else {
            // Otherwise show the 3-block selector
            this.renderSectionSelector();
        }
    },

    /**
     * Render the 3-block selector
     */
    renderSectionSelector() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="jobs-hub-container">
                <div class="jobs-hub-header">
                    <h1 class="jobs-hub-title">Project Management Hub</h1>
                    <p class="jobs-hub-subtitle">Select a section to get started</p>
                </div>

                <div class="jobs-hub-sections">
                    <div class="jobs-hub-section" data-section="estimates">
                        <div class="jobs-hub-section-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                        </div>
                        <h2 class="jobs-hub-section-title">Estimates</h2>
                        <p class="jobs-hub-section-desc">Create quotes, track acceptances, and manage proposals</p>
                        <div class="jobs-hub-section-badge">Quote Management</div>
                    </div>

                    <div class="jobs-hub-section" data-section="jobs">
                        <div class="jobs-hub-section-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                            </svg>
                        </div>
                        <h2 class="jobs-hub-section-title">Jobs</h2>
                        <p class="jobs-hub-section-desc">Track active projects, manage costs, and calculate profits</p>
                        <div class="jobs-hub-section-badge">Project Tracking</div>
                    </div>

                    <div class="jobs-hub-section" data-section="clients">
                        <div class="jobs-hub-section-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                                <path d="M16 3.13a4 4 0 010 7.75"/>
                            </svg>
                        </div>
                        <h2 class="jobs-hub-section-title">Clients</h2>
                        <p class="jobs-hub-section-desc">Manage client relationships and communication history</p>
                        <div class="jobs-hub-section-badge">Coming Soon</div>
                    </div>
                </div>

            </div>
        `;

        this.attachEvents();
    },

    /**
     * Attach event listeners
     */
    attachEvents() {
        // Section click handlers
        document.querySelectorAll('.jobs-hub-section').forEach(section => {
            section.addEventListener('click', () => {
                const sectionName = section.getAttribute('data-section');
                this.loadSection(sectionName);
            });
        });

        // Back button handler
        const backBtn = document.getElementById('backToHub');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.state.activeSection = null;
                this.renderSectionSelector();
            });
        }
    },

    /**
     * Load a specific section
     */
    async loadSection(sectionName) {
        console.log(`[Jobs Hub] Loading section: ${sectionName}`);

        this.state.activeSection = sectionName;

        // Hide the section blocks
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="jobs-hub-container">
                <div class="jobs-hub-back-button" id="backToHub">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="12" x2="5" y2="12"/>
                        <polyline points="12 19 5 12 12 5"/>
                    </svg>
                    Back to Hub
                </div>
                <div id="jobs-section-content" class="jobs-section-content"></div>
            </div>
        `;

        // Re-attach back button
        const backBtn = document.getElementById('backToHub');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.state.activeSection = null;
                this.renderSectionSelector();
            });
        }

        // Load the appropriate module
        try {
            if (sectionName === 'estimates') {
                if (window.EstimatesModule?.init) {
                    await window.EstimatesModule.init('jobs-section-content');
                } else {
                    this.showError('Estimates module not loaded');
                }
            } else if (sectionName === 'jobs') {
                if (window.JobsManagementModule?.init) {
                    await window.JobsManagementModule.init('jobs-section-content');
                } else {
                    this.showError('Jobs Management module not loaded');
                }
            } else if (sectionName === 'clients') {
                if (window.ClientsModule?.init) {
                    await window.ClientsModule.init('jobs-section-content');
                } else {
                    this.showError('Clients module not loaded');
                }
            }

            // Check if user navigated away during loading
            if (this.state.activeSection !== sectionName) {
                console.log(`[Jobs Hub] User navigated away from ${sectionName}, aborting render`);
                return;
            }
        } catch (error) {
            console.error(`Error loading ${sectionName}:`, error);
            this.showError(`Failed to load ${sectionName}`);
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const content = document.getElementById('jobs-section-content');
        if (!content) return;

        content.innerHTML = `
            <div style="text-align: center; padding: 4rem; color: var(--danger);">
                <h2>Error</h2>
                <p>${message}</p>
            </div>
        `;
    },

    /**
     * Render styles
     */
    renderStyles() {
        return `
            <style>
                .jobs-hub-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 2rem;
                }

                .jobs-hub-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .jobs-hub-title {
                    font-size: 2.5rem;
                    font-weight: 900;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 0.5rem;
                }

                .jobs-hub-subtitle {
                    font-size: 1.125rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .jobs-hub-sections {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .jobs-hub-section {
                    background: var(--background);
                    border: 2px solid var(--border);
                    border-radius: 16px;
                    padding: 2.5rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                .jobs-hub-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: var(--gradient-primary);
                    transform: scaleX(0);
                    transition: transform 0.3s ease;
                }

                .jobs-hub-section:hover {
                    border-color: var(--primary);
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
                }

                .jobs-hub-section:hover::before {
                    transform: scaleX(1);
                }

                .jobs-hub-section-icon {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1.5rem;
                    background: var(--gradient-primary);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.3s ease;
                }

                .jobs-hub-section:hover .jobs-hub-section-icon {
                    transform: scale(1.1) rotate(5deg);
                }

                .jobs-hub-section-icon svg {
                    width: 40px;
                    height: 40px;
                    stroke: white;
                }

                .jobs-hub-section-title {
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-bottom: 0.75rem;
                }

                .jobs-hub-section-desc {
                    font-size: 1rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }

                .jobs-hub-section-badge {
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    background: var(--primary-light);
                    color: var(--primary);
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                }

                .jobs-hub-back-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: var(--background);
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-bottom: 2rem;
                }

                .jobs-hub-back-button:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                    transform: translateX(-4px);
                }

                .jobs-hub-back-button svg {
                    width: 20px;
                    height: 20px;
                }

                .jobs-section-content {
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @media (max-width: 768px) {
                    .jobs-hub-sections {
                        grid-template-columns: 1fr;
                    }

                    .jobs-hub-title {
                        font-size: 2rem;
                    }
                }
            </style>
        `;
    }
};
