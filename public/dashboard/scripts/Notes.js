window.NotesModule = {
    state: {
        container: 'notes-content',
        notes: [],
        loading: false
    },

    async init(targetContainer = 'notes-content') {
        console.log('📝 Notes module initializing (Early Access)...');

        this.state.container = targetContainer;
        this.showLoading();

        try {
            await this.checkAuth();
            await this.loadNotes();
            this.render();
            this.attachEvents();

            console.log('✅ Notes module ready');
        } catch (error) {
            console.error('❌ Notes init failed:', error);
            this.showError('Failed to load notes module');
        }
    },

    async checkAuth() {
        const { authenticated } = await API.checkAuth();
        if (!authenticated) {
            window.location.href = '/auth/login.html';
            throw new Error('Not authenticated');
        }
    },

    async loadNotes() {
        // Placeholder data - this is just for testing Early Access
        this.state.notes = [
            {
                id: 1,
                title: 'Welcome to Early Access',
                content: 'This Notes module is in Early Access! Only admins can see this. Pretty cool right?',
                timestamp: new Date().toISOString(),
                color: '#8b5cf6'
            },
            {
                id: 2,
                title: 'Random Thoughts',
                content: 'Coding for 36 hours straight with no shower? That\'s the vibe we\'re going for.',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                color: '#ec4899'
            },
            {
                id: 3,
                title: 'Build Philosophy',
                content: 'No bloat. No corporate BS. Just clean, passionate code that makes money.',
                timestamp: new Date(Date.now() - 172800000).toISOString(),
                color: '#f59e0b'
            },
            {
                id: 4,
                title: 'Testing Notes',
                content: 'This is just a test module to showcase the Early Access tier system. Real functionality coming soon!',
                timestamp: new Date(Date.now() - 259200000).toISOString(),
                color: '#10b981'
            }
        ];
    },

    render() {
        const container = document.getElementById(this.state.container);
        if (!container) return;

        container.innerHTML = `
            ${this.renderStyles()}
            <div class="notes-shell">
                ${this.renderHeader()}
                ${this.renderNotesGrid()}
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    renderHeader() {
        return `
            <div class="notes-header">
                <div class="notes-title-section">
                    <h1 class="notes-title">
                        <i data-lucide="sticky-note"></i>
                        Notes
                    </h1>
                    <div class="early-access-badge">
                        <i data-lucide="sparkles"></i>
                        Early Access
                    </div>
                </div>
                <p class="notes-subtitle">Quick ideas and thoughts - Admin testing only</p>
            </div>
        `;
    },

    renderNotesGrid() {
        if (this.state.notes.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No notes yet</h3>
                    <p>Create your first note to get started</p>
                </div>
            `;
        }

        return `
            <div class="notes-grid">
                ${this.state.notes.map(note => this.renderNoteCard(note)).join('')}
            </div>
        `;
    },

    renderNoteCard(note) {
        const formattedDate = new Date(note.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <div class="note-card" style="border-left: 4px solid ${note.color}">
                <div class="note-header">
                    <h3 class="note-title">${API.escapeHtml(note.title)}</h3>
                    <span class="note-date">${formattedDate}</span>
                </div>
                <p class="note-content">${API.escapeHtml(note.content)}</p>
                <div class="note-actions">
                    <button class="note-action-btn" onclick="NotesModule.editNote(${note.id})">
                        <i data-lucide="edit-2"></i>
                        Edit
                    </button>
                    <button class="note-action-btn delete" onclick="NotesModule.deleteNote(${note.id})">
                        <i data-lucide="trash-2"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    },

    editNote(noteId) {
        window.SteadyUtils?.showToast('Edit functionality coming soon!', 'info');
    },

    deleteNote(noteId) {
        window.SteadyUtils?.showToast('Delete functionality coming soon!', 'info');
    },

    attachEvents() {
        // Event listeners would go here for real functionality
        console.log('Notes events attached');
    },

    showLoading() {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p>Loading notes...</p>
                </div>
            `;
        }
    },

    showError(message) {
        const container = document.getElementById(this.state.container);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <h2>Failed to Load</h2>
                    <p>${API.escapeHtml(message)}</p>
                    <button class="btn-primary" onclick="NotesModule.init()">
                        Try Again
                    </button>
                </div>
            `;
        }
    },

    renderStyles() {
        return `
            <style>
                .notes-shell {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                    animation: fadeIn 0.4s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .notes-header {
                    margin-bottom: 2rem;
                    text-align: center;
                }

                .notes-title-section {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    margin-bottom: 0.5rem;
                }

                .notes-title {
                    font-size: 2.5rem;
                    font-weight: 900;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .notes-title i {
                    width: 2.5rem;
                    height: 2.5rem;
                    stroke: var(--primary);
                    stroke-width: 2;
                }

                .early-access-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white;
                    border-radius: 9999px;
                    font-size: 0.875rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
                }

                .early-access-badge i {
                    width: 16px;
                    height: 16px;
                }

                .notes-subtitle {
                    font-size: 1.125rem;
                    color: var(--text-secondary);
                }

                .notes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                }

                .note-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    transition: var(--transition);
                }

                .note-card:hover {
                    box-shadow: var(--shadow);
                    transform: translateY(-4px);
                }

                .note-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }

                .note-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .note-date {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .note-content {
                    font-size: 1rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }

                .note-actions {
                    display: flex;
                    gap: 0.75rem;
                }

                .note-action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                }

                .note-action-btn:hover {
                    background: var(--surface-hover);
                    color: var(--primary);
                    border-color: var(--primary);
                }

                .note-action-btn.delete:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border-color: #ef4444;
                }

                .note-action-btn i {
                    width: 14px;
                    height: 14px;
                }

                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .empty-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }

                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                }

                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid var(--border);
                    border-radius: 50%;
                    border-top-color: var(--primary);
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .error-state {
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .error-state h2 {
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                }

                .error-state p {
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                }

                .btn-primary {
                    padding: 0.75rem 1.5rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                }

                .btn-primary:hover {
                    opacity: 0.9;
                    transform: translateY(-2px);
                }
            </style>
        `;
    }
};
