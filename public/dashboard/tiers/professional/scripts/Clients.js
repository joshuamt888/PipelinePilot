/**
 * CLIENTS MODULE - Manage client relationships and project history
 * Accessible only through Jobs Hub
 */

window.ClientsModule = {
    state: {
        container: 'clients-content',
        clients: [],
        loading: false
    },

    /**
     * Initialize the Clients module
     */
    async init(targetContainer = 'clients-content') {
        console.log('[Clients] Initializing...');
        this.state.container = targetContainer;

        const container = document.getElementById(this.state.container);
        if (!container) {
            console.error('[Clients] Container not found');
            return;
        }

        // Render the module
        this.render();
    },

    /**
     * Render the Clients module
     */
    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="clients-container">
                <div class="clients-header">
                    <h2 class="clients-title">Client Management</h2>
                    <p class="clients-subtitle">Coming Soon</p>
                </div>

                <div class="clients-coming-soon">
                    <div class="coming-soon-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                            <path d="M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                    </div>
                    <h3>Client Management Coming Soon</h3>
                    <p>Track client information, project history, and communication all in one place.</p>
                    <div class="coming-soon-features">
                        <div class="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Client contact information</span>
                        </div>
                        <div class="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Project history & timeline</span>
                        </div>
                        <div class="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Linked estimates & jobs</span>
                        </div>
                        <div class="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Communication logs</span>
                        </div>
                    </div>
                    <p class="coming-soon-note">For now, manage your clients through the <strong>Pipeline</strong> module.</p>
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
                .clients-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .clients-header {
                    margin-bottom: 2rem;
                }

                .clients-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .clients-subtitle {
                    font-size: 1rem;
                    color: var(--text-secondary);
                }

                .clients-coming-soon {
                    background: var(--surface-secondary);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 4rem 2rem;
                    text-align: center;
                }

                .coming-soon-icon {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 2rem;
                    background: linear-gradient(135deg, var(--primary), var(--accent));
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .coming-soon-icon svg {
                    width: 40px;
                    height: 40px;
                    stroke: white;
                }

                .clients-coming-soon h3 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                }

                .clients-coming-soon > p {
                    font-size: 1.125rem;
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }

                .coming-soon-features {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin: 2rem auto;
                    max-width: 800px;
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: var(--surface-primary);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    text-align: left;
                }

                .feature-item svg {
                    width: 20px;
                    height: 20px;
                    stroke: var(--success);
                    flex-shrink: 0;
                }

                .feature-item span {
                    font-size: 0.875rem;
                    color: var(--text-primary);
                    font-weight: 500;
                }

                .coming-soon-note {
                    margin-top: 2rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .coming-soon-note strong {
                    color: var(--primary);
                    font-weight: 600;
                }
            </style>
        `;
    }
};
