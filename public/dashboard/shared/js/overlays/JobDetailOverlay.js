/**
 * JOB DETAIL OVERLAY
 * Shows full job information with profit/loss breakdown
 *
 * Usage:
 *   OverlayManager.open('job-detail', { jobId: '123' });
 */

class JobDetailOverlay extends BaseOverlay {
    async onMount() {
        this.showLoading();

        try {
            const jobId = this.data.jobId;
            const jobs = await API.getJobs();
            this.job = jobs.find(j => j.id === jobId);

            if (!this.job) {
                throw new Error('Job not found');
            }

            // Load associated lead if exists
            if (this.job.lead_id) {
                this.lead = await API.getLeadById(this.job.lead_id);
            }

            this.hideLoading();
        } catch (error) {
            this.showError(API.handleAPIError(error, 'Load Job'));
        }
    }

    getTitle() {
        return this.job ? `💼 ${this.job.title}` : 'Job Details';
    }

    getSize() {
        return 'overlay-lg';
    }

    renderBody() {
        if (!this.job) return '';

        const job = this.job;
        const profit = parseFloat(job.profit) || 0;
        const margin = parseFloat(job.profit_margin) || 0;

        return `
            <div class="job-detail-grid">
                <!-- Job Info -->
                <div class="detail-section">
                    <h3 class="section-title">Job Information</h3>
                    <div class="detail-row">
                        <span class="detail-label">Title:</span>
                        <span class="detail-value">${API.escapeHtml(job.title)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${API.escapeHtml(job.job_type || 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">
                            <span class="status-badge status-${job.status}">
                                ${API.escapeHtml(job.status || 'scheduled')}
                            </span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Priority:</span>
                        <span class="detail-value">${API.escapeHtml(job.priority || 'medium')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Scheduled Date:</span>
                        <span class="detail-value">${job.scheduled_date ? SteadyUtils.formatDate(job.scheduled_date, 'long') : 'Not scheduled'}</span>
                    </div>
                    ${job.scheduled_time ? `
                        <div class="detail-row">
                            <span class="detail-label">Time:</span>
                            <span class="detail-value">${job.scheduled_time}</span>
                        </div>
                    ` : ''}
                    ${job.duration_hours ? `
                        <div class="detail-row">
                            <span class="detail-label">Duration:</span>
                            <span class="detail-value">${job.duration_hours} hours</span>
                        </div>
                    ` : ''}
                    ${job.location ? `
                        <div class="detail-row">
                            <span class="detail-label">Location:</span>
                            <span class="detail-value">${API.escapeHtml(job.location)}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Financial Summary -->
                <div class="detail-section financial-summary">
                    <h3 class="section-title">Financial Summary</h3>
                    <div class="financial-card ${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                        <div class="financial-big">
                            <div class="financial-label">Profit</div>
                            <div class="financial-value">${SteadyUtils.formatCurrency(profit)}</div>
                            <div class="financial-meta">${margin.toFixed(1)}% margin</div>
                        </div>
                    </div>

                    <div class="financial-breakdown">
                        <div class="breakdown-row">
                            <span class="breakdown-label">Revenue:</span>
                            <span class="breakdown-value revenue">${SteadyUtils.formatCurrency(parseFloat(job.final_price || job.quoted_price) || 0)}</span>
                        </div>
                        <div class="breakdown-row">
                            <span class="breakdown-label">Total Cost:</span>
                            <span class="breakdown-value cost">-${SteadyUtils.formatCurrency(parseFloat(job.total_cost) || 0)}</span>
                        </div>
                        <div class="breakdown-divider"></div>
                        <div class="breakdown-row breakdown-total">
                            <span class="breakdown-label">Net Profit:</span>
                            <span class="breakdown-value ${profit >= 0 ? 'profit' : 'loss'}">${SteadyUtils.formatCurrency(profit)}</span>
                        </div>
                    </div>
                </div>

                <!-- Cost Breakdown -->
                <div class="detail-section">
                    <h3 class="section-title">Cost Breakdown</h3>
                    <div class="detail-row">
                        <span class="detail-label">Material Cost:</span>
                        <span class="detail-value">${SteadyUtils.formatCurrency(parseFloat(job.material_cost) || 0)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Labor Hours:</span>
                        <span class="detail-value">${job.labor_hours || 0} hours</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Labor Rate:</span>
                        <span class="detail-value">${SteadyUtils.formatCurrency(parseFloat(job.labor_rate) || 0)}/hr</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Labor Cost:</span>
                        <span class="detail-value">${SteadyUtils.formatCurrency((job.labor_hours || 0) * (parseFloat(job.labor_rate) || 0))}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Other Expenses:</span>
                        <span class="detail-value">${SteadyUtils.formatCurrency(parseFloat(job.other_expenses) || 0)}</span>
                    </div>
                </div>

                <!-- Pricing -->
                <div class="detail-section">
                    <h3 class="section-title">Pricing</h3>
                    <div class="detail-row">
                        <span class="detail-label">Quoted Price:</span>
                        <span class="detail-value">${SteadyUtils.formatCurrency(parseFloat(job.quoted_price) || 0)}</span>
                    </div>
                    ${job.final_price ? `
                        <div class="detail-row">
                            <span class="detail-label">Final Price:</span>
                            <span class="detail-value">${SteadyUtils.formatCurrency(parseFloat(job.final_price))}</span>
                        </div>
                    ` : ''}
                    ${job.invoice_number ? `
                        <div class="detail-row">
                            <span class="detail-label">Invoice #:</span>
                            <span class="detail-value">${API.escapeHtml(job.invoice_number)}</span>
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Payment Status:</span>
                        <span class="detail-value">
                            <span class="status-badge status-${job.payment_status}">
                                ${API.escapeHtml(job.payment_status || 'pending')}
                            </span>
                        </span>
                    </div>
                </div>

                <!-- Associated Lead -->
                ${this.lead ? `
                    <div class="detail-section detail-section-full">
                        <h3 class="section-title">Associated Lead</h3>
                        <div class="lead-card" onclick="OverlayManager.open('lead-detail', { leadId: '${this.lead.id}' })">
                            <div class="lead-name">${API.escapeHtml(this.lead.name)}</div>
                            <div class="lead-meta">
                                ${this.lead.company ? API.escapeHtml(this.lead.company) : 'No company'} •
                                ${this.lead.email || 'No email'}
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Materials -->
                ${job.materials && Array.isArray(job.materials) && job.materials.length > 0 ? `
                    <div class="detail-section detail-section-full">
                        <h3 class="section-title">Materials Used</h3>
                        <div class="materials-table">
                            ${job.materials.map(mat => `
                                <div class="material-row">
                                    <span class="material-name">${API.escapeHtml(mat.name)}</span>
                                    <span class="material-qty">${mat.quantity} ${mat.unit || 'units'}</span>
                                    <span class="material-cost">${SteadyUtils.formatCurrency(mat.cost || 0)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Notes/Description -->
                ${job.notes ? `
                    <div class="detail-section detail-section-full">
                        <h3 class="section-title">Notes</h3>
                        <div class="notes-content">${API.escapeHtml(job.notes)}</div>
                    </div>
                ` : ''}

                ${job.description ? `
                    <div class="detail-section detail-section-full">
                        <h3 class="section-title">Description</h3>
                        <div class="notes-content">${API.escapeHtml(job.description)}</div>
                    </div>
                ` : ''}
            </div>

            <style>
                .job-detail-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                }

                .detail-section-full {
                    grid-column: 1 / -1;
                }

                .financial-summary {
                    grid-column: 1 / -1;
                }

                .financial-card {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    color: white;
                    margin-bottom: 1.5rem;
                }

                .financial-card.profit-negative {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                }

                .financial-big {
                    text-align: center;
                }

                .financial-label {
                    font-size: 0.875rem;
                    opacity: 0.9;
                    margin-bottom: 0.5rem;
                }

                .financial-value {
                    font-size: 2.5rem;
                    font-weight: 900;
                }

                .financial-meta {
                    font-size: 1rem;
                    opacity: 0.9;
                    margin-top: 0.5rem;
                }

                .financial-breakdown {
                    background: var(--background);
                    border-radius: var(--radius);
                    padding: 1.5rem;
                }

                .breakdown-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                }

                .breakdown-label {
                    color: var(--text-secondary);
                }

                .breakdown-value {
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .breakdown-value.revenue {
                    color: var(--success);
                }

                .breakdown-value.cost {
                    color: var(--text-secondary);
                }

                .breakdown-value.profit {
                    color: var(--success);
                }

                .breakdown-value.loss {
                    color: var(--danger);
                }

                .breakdown-divider {
                    border-top: 2px solid var(--border);
                    margin: 0.5rem 0;
                }

                .breakdown-total {
                    font-size: 1.125rem;
                }

                .status-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius);
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .status-scheduled {
                    background: #3b82f6;
                    color: white;
                }

                .status-in_progress {
                    background: #f59e0b;
                    color: white;
                }

                .status-completed {
                    background: #10b981;
                    color: white;
                }

                .status-cancelled {
                    background: #6b7280;
                    color: white;
                }

                .status-pending {
                    background: #f59e0b;
                    color: white;
                }

                .status-paid {
                    background: #10b981;
                    color: white;
                }

                .status-overdue {
                    background: #ef4444;
                    color: white;
                }

                .lead-card,
                .materials-table .material-row {
                    background: var(--background);
                    padding: 1rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: var(--transition);
                }

                .lead-card:hover {
                    background: var(--surface-hover);
                    transform: translateY(-2px);
                }

                .lead-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .lead-meta {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .materials-table {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .material-row {
                    display: grid;
                    grid-template-columns: 1fr auto auto;
                    gap: 1rem;
                    align-items: center;
                    cursor: default;
                }

                .material-name {
                    font-weight: 500;
                }

                .material-qty {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }

                .material-cost {
                    font-weight: 600;
                }

                @media (max-width: 768px) {
                    .job-detail-grid {
                        grid-template-columns: 1fr;
                    }

                    .financial-value {
                        font-size: 2rem;
                    }
                }
            </style>
        `;
    }

    hasFooter() {
        return true;
    }

    renderFooter() {
        return `
            <button class="steady-btn steady-btn-secondary" onclick="OverlayManager.close('${this.id}')">
                Close
            </button>
            ${this.job.status !== 'completed' ? `
                <button class="steady-btn steady-btn-primary" onclick="alert('Edit feature coming soon!')">
                    Edit Job
                </button>
            ` : ''}
        `;
    }
}

// Register this overlay type
OverlayManager.register('job-detail', JobDetailOverlay);

console.log('JobDetailOverlay registered ✅');
