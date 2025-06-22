/**
 * 🎯 ADD LEAD MODULE - Clean Dashboard Edition
 * Full page with bubbles, recent leads, and table view
 * Integrates with your existing API and navigation system
 */

window.AddLeadModule = {
    isInitialized: false,
    currentView: 'dashboard', // 'dashboard' or 'table'
    leads: [],
    monthlyStats: { currentMonthLeads: 0, monthlyLeadLimit: 50 },
    
    // 🚀 MAIN ENTRY POINT (called by navigation)
    async show() {
        console.log('🎯 AddLeadModule.show() called');
        
        try {
            // Load the HTML into mainContent
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = this.getHTML();
            
            // Initialize the module
            await this.init();
            
        } catch (error) {
            console.error('❌ AddLeadModule.show() failed:', error);
            this.renderError('Failed to load leads dashboard');
        }
    },
    
    // 🎨 GET HTML CONTENT
    getHTML() {
        return `
            <div class="leads-container" id="leadsContainer">
                <!-- Dashboard View -->
                <div class="dashboard-view" id="dashboardView">
                    <!-- Header Bubble -->
                    <div class="header-bubble">
                        <div class="header-content">
                            <div class="header-icon">👥</div>
                            <div class="header-text">
                                <h1 class="header-title">Leads Dashboard</h1>
                                <p class="header-subtitle">Manage your leads and grow your business</p>
                            </div>
                            <div class="header-stats" id="headerStats">
                                <div class="stat-item">
                                    <div class="stat-value" id="totalLeads">-</div>
                                    <div class="stat-label">Total Leads</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value" id="monthlyProgress">-/-</div>
                                    <div class="stat-label">This Month</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Bubbles -->
                    <div class="action-bubbles">
                        <!-- Add Lead Bubble -->
                        <div class="action-bubble" onclick="AddLeadModule.showAddLeadModal()">
                            <div class="bubble-content">
                                <div class="bubble-icon">➕</div>
                                <h3 class="bubble-title">Add New Lead</h3>
                                <p class="bubble-subtitle">Create a new lead and start building relationships</p>
                                <button class="bubble-button">
                                    <span>Add Lead</span>
                                    <span>→</span>
                                </button>
                            </div>
                        </div>

                        <!-- View All Leads Bubble -->
                        <div class="action-bubble" onclick="AddLeadModule.showTableView()">
                            <div class="bubble-content">
                                <div class="bubble-icon">📊</div>
                                <h3 class="bubble-title">View All Leads</h3>
                                <p class="bubble-subtitle">Browse, search, and manage your complete lead database</p>
                                <button class="bubble-button">
                                    <span>View Database</span>
                                    <span>→</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Leads -->
                    <div class="recent-leads">
                        <div class="recent-header">
                            <h3 class="recent-title">Recent Leads</h3>
                            <a href="#" class="view-all-btn" onclick="AddLeadModule.showTableView()">View All →</a>
                        </div>
                        <div class="recent-list" id="recentList">
                            <div class="loading-state">Loading recent leads...</div>
                        </div>
                    </div>
                </div>

                <!-- Table View -->
                <div class="table-view hidden" id="tableView">
                    <div class="table-header">
                        <button class="back-btn" onclick="AddLeadModule.showDashboard()">
                            <span>←</span>
                            <span>Back to Dashboard</span>
                        </button>
                        <div class="search-box">
                            <input type="text" class="search-input" placeholder="Search leads..." id="searchInput">
                        </div>
                        <button class="btn btn-primary" onclick="AddLeadModule.showAddLeadModal()">
                            <span>+</span>
                            <span>Add Lead</span>
                        </button>
                    </div>

                    <div class="table-container">
                        <table class="simple-table" id="leadsTable">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Company</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Source</th>
                                    <th>Added</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody">
                                <tr>
                                    <td colspan="7" class="loading-state">Loading leads...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Add Lead Modal -->
                <div class="modal-overlay" id="addLeadModal">
                    <div class="modal">
                        <div class="modal-header">
                            <h2 class="modal-title">Add New Lead</h2>
                            <button class="modal-close" onclick="AddLeadModule.hideAddLeadModal()">✕</button>
                        </div>
                        <div class="modal-body">
                            <div id="modalMessages"></div>
                            <form id="addLeadForm">
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label class="form-label">Name *</label>
                                        <input type="text" class="form-input" name="name" required placeholder="Enter full name">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-input" name="email" placeholder="email@example.com">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Company</label>
                                        <input type="text" class="form-input" name="company" placeholder="Company name">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Phone</label>
                                        <input type="tel" class="form-input" name="phone" placeholder="+1 (555) 123-4567">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" name="status">
                                            <option value="new">New Lead</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="qualified">Qualified</option>
                                            <option value="negotiation">Negotiation</option>
                                            <option value="closed">Closed Won</option>
                                            <option value="lost">Lost</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Source</label>
                                        <select class="form-select" name="platform">
                                            <option value="">Select source...</option>
                                            <option value="linkedin">LinkedIn</option>
                                            <option value="website">Website</option>
                                            <option value="referral">Referral</option>
                                            <option value="cold_email">Cold Email</option>
                                            <option value="cold_call">Cold Call</option>
                                            <option value="facebook">Facebook</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="twitter">Twitter</option>
                                            <option value="event">Event</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Lead Type</label>
                                        <select class="form-select" name="type">
                                            <option value="cold">Cold Lead</option>
                                            <option value="warm">Warm Lead</option>
                                            <option value="hot">Hot Lead</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Quality Score (1-10)</label>
                                        <div class="quality-container">
                                            <input type="range" name="qualityScore" min="1" max="10" value="5" 
                                                   class="quality-slider" id="qualitySlider">
                                            <span class="quality-value" id="qualityValue">5</span>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Potential Value ($)</label>
                                        <input type="number" class="form-input" name="potential_value" 
                                               placeholder="0" min="0" step="100">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Follow-up Date</label>
                                        <input type="date" class="form-input" name="follow_up_date" id="followUpDate">
                                    </div>
                                    <div class="form-group full-width">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-textarea" name="notes" rows="3" 
                                                  placeholder="Add any notes about this lead..."></textarea>
                                    </div>
                                </div>
                                <div class="form-actions">
                                    <button type="button" class="btn btn-secondary" onclick="AddLeadModule.hideAddLeadModal()">
                                        Cancel
                                    </button>
                                    <button type="submit" class="btn btn-primary" id="submitBtn">
                                        <span class="btn-text">Add Lead</span>
                                        <span class="btn-loading hidden">
                                            <div class="spinner"></div>
                                            Adding...
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            ${this.getStyles()}
        `;
    },
    
    // 🎨 GET CSS STYLES
    getStyles() {
        return `
            <style>
                /* Base Variables */
                .leads-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                /* Header Bubble */
                .header-bubble {
                    background: var(--surface);
                    border-radius: var(--radius-xl);
                    padding: 2rem;
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border);
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                }

                .header-icon {
                    font-size: 2.5rem;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #5a67d8) 100%);
                    width: 80px;
                    height: 80px;
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: var(--shadow);
                }

                .header-text {
                    flex: 1;
                }

                .header-title {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #5a67d8) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .header-subtitle {
                    color: var(--text-secondary);
                    font-size: 1.1rem;
                }

                .header-stats {
                    display: flex;
                    gap: 2rem;
                }

                .stat-item {
                    text-align: center;
                    padding: 1rem;
                    background: var(--surface-hover, #f8fafc);
                    border-radius: var(--radius);
                    border: 1px solid var(--border);
                }

                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--primary);
                    margin-bottom: 0.25rem;
                }

                .stat-label {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                /* Action Bubbles */
                .action-bubbles {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }

                .action-bubble {
                    background: var(--surface);
                    border-radius: var(--radius-xl);
                    padding: 2rem;
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border);
                    cursor: pointer;
                    transition: var(--transition);
                    position: relative;
                    overflow: hidden;
                }

                .action-bubble:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl);
                    border-color: var(--primary);
                }

                .action-bubble::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #5a67d8) 100%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .action-bubble:hover::before {
                    opacity: 0.05;
                }

                .bubble-content {
                    position: relative;
                    z-index: 1;
                }

                .bubble-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }

                .bubble-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }

                .bubble-subtitle {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                }

                .bubble-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #5a67d8) 100%);
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    text-decoration: none;
                    transition: var(--transition);
                    border: none;
                    cursor: pointer;
                }

                .bubble-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                /* Recent Leads */
                .recent-leads {
                    background: var(--surface);
                    border-radius: var(--radius-xl);
                    padding: 2rem;
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border);
                }

                .recent-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .recent-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .view-all-btn {
                    color: var(--primary);
                    text-decoration: none;
                    font-weight: 600;
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius);
                    transition: var(--transition);
                }

                .view-all-btn:hover {
                    background: rgba(102, 126, 234, 0.1);
                }

                .recent-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .recent-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--surface-hover, #f8fafc);
                    border-radius: var(--radius);
                    transition: var(--transition);
                }

                .recent-item:hover {
                    background: var(--border);
                    transform: translateX(4px);
                }

                .recent-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: var(--radius);
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #5a67d8) 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 1.1rem;
                }

                .recent-info {
                    flex: 1;
                }

                .recent-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .recent-meta {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }

                .recent-status {
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .status-new { background: rgba(59, 130, 246, 0.1); color: var(--info, #3b82f6); }
                .status-contacted { background: rgba(245, 158, 11, 0.1); color: var(--warning, #f59e0b); }
                .status-qualified { background: rgba(16, 185, 129, 0.1); color: var(--success, #10b981); }
                .status-negotiation { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
                .status-closed { background: rgba(16, 185, 129, 0.1); color: var(--success, #10b981); }
                .status-lost { background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); }

                /* Table View */
                .table-view {
                    background: var(--surface);
                    border-radius: var(--radius-xl);
                    padding: 2rem;
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border);
                }

                .table-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .back-btn {
                    background: var(--surface-hover, #f8fafc);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: var(--transition);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .back-btn:hover {
                    background: var(--border);
                }

                .search-box {
                    flex: 1;
                    max-width: 400px;
                }

                .search-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    background: var(--surface);
                    color: var(--text-primary);
                    transition: var(--transition);
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .table-container {
                    overflow-x: auto;
                }

                .simple-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: var(--surface);
                    border-radius: var(--radius);
                    overflow: hidden;
                    box-shadow: var(--shadow);
                }

                .simple-table th,
                .simple-table td {
                    padding: 1rem;
                    text-align: left;
                    border-bottom: 1px solid var(--border);
                }

                .simple-table th {
                    background: var(--surface-hover, #f8fafc);
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .simple-table tr:hover {
                    background: var(--surface-hover, #f8fafc);
                }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .modal-overlay.show {
                    opacity: 1;
                    visibility: visible;
                }

                .modal {
                    background: var(--surface);
                    border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-xl);
                    width: 100%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    transform: scale(0.9) translateY(20px);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .modal-overlay.show .modal {
                    transform: scale(1) translateY(0);
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 2rem 2rem 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .modal-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .modal-close {
                    width: 40px;
                    height: 40px;
                    border: none;
                    background: var(--surface-hover, #f8fafc);
                    border-radius: var(--radius);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                    transition: var(--transition);
                }

                .modal-close:hover {
                    background: var(--border);
                    color: var(--text-primary);
                }

                .modal-body {
                    padding: 2rem;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group.full-width {
                    grid-column: 1 / -1;
                }

                .form-label {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }

                .form-input,
                .form-select,
                .form-textarea {
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    background: var(--surface);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    transition: var(--transition);
                }

                .form-input:focus,
                .form-select:focus,
                .form-textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .quality-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .quality-slider {
                    flex: 1;
                }

                .quality-value {
                    background: var(--primary);
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    min-width: 2rem;
                    text-align: center;
                }

                .form-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border);
                }

                .btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: var(--radius);
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .btn-secondary {
                    background: var(--surface-hover, #f8fafc);
                    color: var(--text-primary);
                    border: 1px solid var(--border);
                }

                .btn-secondary:hover {
                    background: var(--border);
                }

                .btn-primary {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #5a67d8) 100%);
                    color: white;
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 0.8s ease-in-out infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .hidden {
                    display: none !important;
                }

                .loading-state {
                    text-align: center;
                    color: var(--text-secondary);
                    font-style: italic;
                    padding: 2rem;
                }

                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: var(--danger, #ef4444);
                    padding: 0.75rem 1rem;
                    border-radius: var(--radius);
                    margin-bottom: 1rem;
                }

                .success-message {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    color: var(--success, #10b981);
                    padding: 0.75rem 1rem;
                    border-radius: var(--radius);
                    margin-bottom: 1rem;
                }

                .action-btn {
                    background: none;
                    border: none;
                    color: var(--primary);
                    cursor: pointer;
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius);
                    transition: var(--transition);
                    font-size: 0.9rem;
                }

                .action-btn:hover {
                    background: rgba(102, 126, 234, 0.1);
                }

                /* Mobile Responsive */
                @media (max-width: 768px) {
                    .leads-container {
                        padding: 1rem;
                        gap: 1rem;
                    }

                    .header-content {
                        flex-direction: column;
                        text-align: center;
                        gap: 1rem;
                    }

                    .header-stats {
                        justify-content: center;
                    }

                    .action-bubbles {
                        grid-template-columns: 1fr;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }

                    .modal {
                        margin: 1rem;
                    }

                    .table-header {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: stretch;
                    }

                    .search-box {
                        max-width: none;
                    }
                }
            </style>
        `;
    },
    
    // 🚀 INITIALIZE MODULE
    async init() {
        if (this.isInitialized) {
            console.log('🎯 AddLeadModule already initialized');
            return;
        }
        
        console.log('🎯 Initializing AddLeadModule...');
        
        try {
            // Verify API connection
            const authCheck = await API.checkAuth();
            if (!authCheck.authenticated) {
                console.error('❌ AddLead: User not authenticated');
                this.renderError('Please log in to access leads');
                return;
            }
            
            // Load initial data
            await this.loadData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ AddLeadModule initialized successfully');
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ AddLeadModule initialization failed:', error);
            this.renderError('Failed to initialize leads dashboard');
        }
    },
    
    // 📊 LOAD ALL DATA
    async loadData() {
        try {
            // Load monthly stats
            this.monthlyStats = await API.getCurrentMonthStats();
            
            // Load all leads
            const leadData = await API.getLeads();
            this.leads = Array.isArray(leadData) ? leadData : 
                       leadData.all ? leadData.all : 
                       leadData.leads ? leadData.leads : [];
            
            // Update UI
            this.updateStats();
            this.renderRecentLeads();
            this.renderTable();
            
        } catch (error) {
            console.error('❌ Failed to load data:', error);
            this.showMessage('Failed to load leads data', 'error');
        }
    },
    
    // 📊 UPDATE STATS
    updateStats() {
        const totalLeadsEl = document.getElementById('totalLeads');
        const monthlyProgressEl = document.getElementById('monthlyProgress');
        
        if (totalLeadsEl) {
            totalLeadsEl.textContent = this.leads.length;
        }
        
        if (monthlyProgressEl) {
            monthlyProgressEl.textContent = `${this.monthlyStats.currentMonthLeads}/${this.monthlyStats.monthlyLeadLimit}`;
        }
    },
    
    // 🔥 RENDER RECENT LEADS
    renderRecentLeads() {
        const recentList = document.getElementById('recentList');
        if (!recentList) return;
        
        if (this.leads.length === 0) {
            recentList.innerHTML = `
                <div class="loading-state">
                    No leads yet. Add your first lead to get started!
                </div>
            `;
            return;
        }
        
        // Get 3 most recent leads
        const recentLeads = this.leads
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);
        
        recentList.innerHTML = recentLeads.map(lead => {
            const initials = this.getInitials(lead.name);
            const statusClass = this.getStatusClass(lead.status);
            
            return `
                <div class="recent-item">
                    <div class="recent-avatar">${initials}</div>
                    <div class="recent-info">
                        <div class="recent-name">${lead.name}</div>
                        <div class="recent-meta">${lead.company || 'No company'} • ${lead.email || 'No email'}</div>
                    </div>
                    <span class="recent-status ${statusClass}">${this.formatStatus(lead.status)}</span>
                </div>
            `;
        }).join('');
    },
    
    // 📊 RENDER TABLE
    renderTable() {
        const tableBody = document.getElementById('tableBody');
        if (!tableBody) return;
        
        if (this.leads.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-state">No leads found. Add your first lead!</td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = this.leads.map(lead => {
            const statusClass = this.getStatusClass(lead.status);
            const createdDate = this.formatDate(lead.created_at);
            
            return `
                <tr>
                    <td>${lead.name}</td>
                    <td>${lead.company || '-'}</td>
                    <td>${lead.email || '-'}</td>
                    <td><span class="recent-status ${statusClass}">${this.formatStatus(lead.status)}</span></td>
                    <td>${lead.platform || '-'}</td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="action-btn" onclick="AddLeadModule.editLead('${lead.id}')">Edit</button>
                        <button class="action-btn" onclick="AddLeadModule.deleteLead('${lead.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    // 🔧 SETUP EVENT LISTENERS
    setupEventListeners() {
        // Quality score slider
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                qualityValue.textContent = e.target.value;
            });
        }
        
        // Form submission
        const form = document.getElementById('addLeadForm');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
        }
        
        // Auto-set follow-up date to tomorrow
        const followUpInput = document.getElementById('followUpDate');
        if (followUpInput && !followUpInput.value) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            followUpInput.value = tomorrow.toISOString().split('T')[0];
        }
        
        // Modal close events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAddLeadModal();
            }
        });
        
        const modalOverlay = document.getElementById('addLeadModal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.hideAddLeadModal();
                }
            });
        }
    },
    
    // 📝 HANDLE FORM SUBMISSION
    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        try {
            // Show loading state
            this.setLoadingState(true);
            this.clearMessages();
            
            // Collect form data
            const formData = this.collectFormData();
            
            // Validate data
            const validation = await API.validateLeadData(formData);
            if (!validation.isValid) {
                this.showMessage(validation.errors.join(', '), 'error');
                return;
            }
            
            // Check lead limits
            if (this.monthlyStats.currentMonthLeads >= this.monthlyStats.monthlyLeadLimit) {
                this.showMessage(`You've reached your monthly limit of ${this.monthlyStats.monthlyLeadLimit} leads. Upgrade to add more!`, 'error');
                return;
            }
            
            // Create the lead
            const newLead = await API.createLead(formData);
            console.log('✅ Lead created successfully:', newLead);
            
            // Update local data
            this.leads.unshift(newLead);
            this.monthlyStats.currentMonthLeads++;
            
            // Update UI
            this.updateStats();
            this.renderRecentLeads();
            this.renderTable();
            
            // Update shell progress if available
            if (window.updateLeadsProgress) {
                window.updateLeadsProgress(this.monthlyStats.currentMonthLeads, this.monthlyStats.monthlyLeadLimit);
            }
            
            // Refresh pipeline if it's loaded
            if (window.PipelineModule && typeof window.PipelineModule.refreshPipeline === 'function') {
                console.log('🔄 Refreshing pipeline data...');
                await window.PipelineModule.refreshPipeline();
            }
            
            // Show success and close modal
            this.showMessage('Lead added successfully! 🎉', 'success');
            
            setTimeout(() => {
                this.hideAddLeadModal();
                
                // Show notification if available
                if (window.showNotification) {
                    window.showNotification(`New lead "${formData.name}" added! 🎯`, 'success');
                }
            }, 1500);
            
        } catch (error) {
            console.error('❌ Failed to create lead:', error);
            const errorMessage = error.message || 'Failed to create lead. Please try again.';
            this.showMessage(errorMessage, 'error');
        } finally {
            this.setLoadingState(false);
        }
    },
    
    // 📊 COLLECT FORM DATA
    collectFormData() {
        const form = document.getElementById('addLeadForm');
        const formData = new FormData(form);
        
        return {
            name: formData.get('name').trim(),
            email: formData.get('email').trim() || null,
            phone: formData.get('phone').trim() || null,
            company: formData.get('company').trim() || null,
            type: formData.get('type'),
            platform: formData.get('platform') || null,
            status: formData.get('status'),
            qualityScore: parseInt(formData.get('qualityScore')) || 5,
            potential_value: parseFloat(formData.get('potential_value')) || 0,
            follow_up_date: formData.get('follow_up_date') || null,
            notes: formData.get('notes').trim() || null
        };
    },
    
    // 🔍 HANDLE SEARCH
    handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#tableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    },
    
    // 🎯 SHOW/HIDE VIEWS
    showAddLeadModal() {
        const modal = document.getElementById('addLeadModal');
        if (modal) {
            modal.classList.add('show');
            this.clearMessages();
            
            // Focus first input
            setTimeout(() => {
                const firstInput = modal.querySelector('input[name="name"]');
                if (firstInput) firstInput.focus();
            }, 300);
        }
    },
    
    hideAddLeadModal() {
        const modal = document.getElementById('addLeadModal');
        if (modal) {
            modal.classList.remove('show');
            
            // Reset form after animation
            setTimeout(() => {
                const form = document.getElementById('addLeadForm');
                if (form) form.reset();
                
                // Reset quality score display
                const qualityValue = document.getElementById('qualityValue');
                if (qualityValue) qualityValue.textContent = '5';
                
                this.clearMessages();
            }, 300);
        }
    },
    
    showTableView() {
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('tableView').classList.remove('hidden');
        this.currentView = 'table';
    },
    
    showDashboard() {
        document.getElementById('tableView').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');
        this.currentView = 'dashboard';
    },
    
    // ⚡ UTILITY FUNCTIONS
    setLoadingState(isLoading) {
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoading = submitBtn?.querySelector('.btn-loading');
        
        if (isLoading) {
            submitBtn.disabled = true;
            btnText?.classList.add('hidden');
            btnLoading?.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            btnText?.classList.remove('hidden');
            btnLoading?.classList.add('hidden');
        }
    },
    
    showMessage(message, type = 'info') {
        const messagesContainer = document.getElementById('modalMessages');
        if (!messagesContainer) return;
        
        const messageClass = type === 'error' ? 'error-message' : 'success-message';
        messagesContainer.innerHTML = `
            <div class="${messageClass}">
                ${message}
            </div>
        `;
        
        // Auto-clear success messages
        if (type === 'success') {
            setTimeout(() => {
                this.clearMessages();
            }, 3000);
        }
    },
    
    clearMessages() {
        const messagesContainer = document.getElementById('modalMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
    },
    
    getInitials(name) {
        if (!name) return '??';
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },
    
    getStatusClass(status) {
        const statusMap = {
            'new': 'status-new',
            'contacted': 'status-contacted',
            'qualified': 'status-qualified',
            'negotiation': 'status-negotiation',
            'closed': 'status-closed',
            'lost': 'status-lost'
        };
        return statusMap[status] || 'status-new';
    },
    
    formatStatus(status) {
        const statusMap = {
            'new': 'New',
            'contacted': 'Contacted',
            'qualified': 'Qualified',
            'negotiation': 'Negotiation',
            'closed': 'Closed Won',
            'lost': 'Lost'
        };
        return statusMap[status] || status;
    },
    
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    },
    
    // 🗑️ DELETE LEAD
    async deleteLead(leadId) {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        
        try {
            await API.deleteLead(leadId);
            
            // Remove from local data
            this.leads = this.leads.filter(lead => lead.id.toString() !== leadId.toString());
            this.monthlyStats.currentMonthLeads--;
            
            // Update UI
            this.updateStats();
            this.renderRecentLeads();
            this.renderTable();
            
            // Show success
            if (window.showNotification) {
                window.showNotification('Lead deleted successfully', 'success');
            }
            
        } catch (error) {
            console.error('❌ Failed to delete lead:', error);
            if (window.showNotification) {
                window.showNotification('Failed to delete lead', 'error');
            }
        }
    },
    
    // ✏️ EDIT LEAD (placeholder for future enhancement)
    editLead(leadId) {
        console.log('Edit lead:', leadId);
        // TODO: Implement edit functionality
        alert('Edit functionality coming soon!');
    },
    
    // 🚫 RENDER ERROR STATE
    renderError(message) {
        const container = document.getElementById('leadsContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-container" style="text-align: center; padding: 4rem 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 2rem; opacity: 0.6;">⚠️</div>
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);">
                        Error Loading Leads
                    </h2>
                    <p style="margin-bottom: 2rem; font-size: 1.125rem; color: var(--text-secondary);">
                        ${message}
                    </p>
                    <button onclick="AddLeadModule.show()" style="
                        padding: 1rem 2rem;
                        background: var(--primary);
                        color: white;
                        border: none;
                        border-radius: var(--radius);
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 1rem;
                    ">
                        Try Again
                    </button>
                </div>
            `;
        }
    },
    
    // 🔄 REFRESH DATA
    async refreshData() {
        try {
            await this.loadData();
            console.log('✅ AddLeadModule data refreshed');
        } catch (error) {
            console.error('❌ Failed to refresh AddLeadModule data:', error);
        }
    }
};

// 🎯 INITIALIZE ON LOAD
if (typeof window !== 'undefined') {
    console.log('🎯 AddLeadModule loaded and ready!');
    
    // Development helpers
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.addLeadDebug = () => ({
            leads: window.AddLeadModule.leads.length,
            monthlyStats: window.AddLeadModule.monthlyStats,
            currentView: window.AddLeadModule.currentView,
            isInitialized: window.AddLeadModule.isInitialized
        });
        console.log('🛠️ AddLead debug available at window.addLeadDebug()');
    }
}

/**
 * 🎯 ADD LEAD MODULE USAGE:
 * 
 * // Called by navigation system
 * window.AddLeadModule.show();
 * 
 * // Refresh data (called by other modules)
 * await window.AddLeadModule.refreshData();
 * 
 * 🚀 FEATURES:
 * ✅ Clean Apple-style bubble design
 * ✅ Real API integration with all your endpoints
 * ✅ Dashboard view with recent leads
 * ✅ Full table view with search
 * ✅ Add lead modal with validation
 * ✅ Mobile responsive design
 * ✅ Loading states and error handling
 * ✅ Monthly lead limit checking
 * ✅ Pipeline integration and refresh
 * ✅ Progress bar updates
 * ✅ Notification system integration
 * 
 * 🔧 API INTEGRATIONS:
 * ✅ API.checkAuth() - Authentication check
 * ✅ API.getCurrentMonthStats() - Monthly limits
 * ✅ API.getLeads() - Load all leads
 * ✅ API.validateLeadData() - Form validation
 * ✅ API.createLead() - Create new lead
 * ✅ API.deleteLead() - Delete lead
 * ✅ window.PipelineModule.refreshPipeline() - Update pipeline
 * ✅ window.updateLeadsProgress() - Update shell progress
 * ✅ window.showNotification() - Show notifications
 */