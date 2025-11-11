/**
 * CLIENTS MODULE - Placeholder
 * Coming soon: Client relationship management
 */

window.ClientsModule = {
    state: {
        container: 'clients-content'
    },

    /**
     * Initialize
     */
    async init(targetContainer = 'clients-content') {
        this.state.container = targetContainer;
        this.render();
    },

    /**
     * Render placeholder
     */
    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="clients-placeholder-container">
                <div class="clients-placeholder-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                        <path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                </div>
                <h1 class="clients-placeholder-title">Clients Module</h1>
                <p class="clients-placeholder-subtitle">Coming Soon</p>
                <p class="clients-placeholder-description">
                    This module will help you manage client relationships, track communication history, 
                    and maintain detailed client profiles.
                </p>
                
                <div class="clients-placeholder-features">
                    <div class="clients-placeholder-feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Client profiles & contact info</span>
                    </div>
                    <div class="clients-placeholder-feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Communication history tracking</span>
                    </div>
                    <div class="clients-placeholder-feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Project history per client</span>
                    </div>
                    <div class="clients-placeholder-feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Revenue tracking & analytics</span>
                    </div>
                </div>

                <div class="clients-placeholder-note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>For now, you can manage clients through the Pipeline module</span>
                </div>
            </div>
        `;
    },

    /**
     * Render styles
     */
    renderStyles() {
        return `
            <style>
                .clients-placeholder-container {
                    max-width: 700px;
                    margin: 4rem auto;
                    text-align: center;
                    padding: 3rem;
                    background: var(--surface);
                    border-radius: 24px;
                    border: 2px solid var(--border);
                }

                .clients-placeholder-icon {
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 2rem;
                    background: var(--gradient-primary);
                    border-radius: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pulse 2s ease-in-out infinite;
                }

                .clients-placeholder-icon svg {
                    width: 60px;
                    height: 60px;
                    stroke: white;
                }

                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.05);
                        opacity: 0.9;
                    }
                }

                .clients-placeholder-title {
                    font-size: 2.5rem;
                    font-weight: 900;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 0.5rem;
                }

                .clients-placeholder-subtitle {
                    font-size: 1.25rem;
                    color: var(--primary);
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                }

                .clients-placeholder-description {
                    font-size: 1.125rem;
                    color: var(--text-secondary);
                    line-height: 1.7;
                    margin-bottom: 3rem;
                }

                .clients-placeholder-features {
                    display: grid;
                    gap: 1rem;
                    margin-bottom: 3rem;
                    text-align: left;
                }

                .clients-placeholder-feature {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--background);
                    border-radius: 12px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .clients-placeholder-feature svg {
                    width: 24px;
                    height: 24px;
                    stroke: var(--success);
                    flex-shrink: 0;
                }

                .clients-placeholder-note {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 1.25rem;
                    background: var(--primary-light);
                    border-radius: 12px;
                    color: var(--primary);
                    font-weight: 600;
                    font-size: 0.95rem;
                }

                .clients-placeholder-note svg {
                    width: 20px;
                    height: 20px;
                    flex-shrink: 0;
                }

                @media (max-width: 768px) {
                    .clients-placeholder-container {
                        margin: 2rem 1rem;
                        padding: 2rem;
                    }

                    .clients-placeholder-title {
                        font-size: 2rem;
                    }
                }
            </style>
        `;
    }
};
