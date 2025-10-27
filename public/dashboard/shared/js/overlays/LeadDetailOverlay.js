/**
 * LEAD DETAIL OVERLAY
 * Shows full lead information in a popup
 *
 * Usage:
 *   OverlayManager.open('lead-detail', { leadId: '123' });
 */

class LeadDetailOverlay extends BaseOverlay {
    async onMount() {
        this.showLoading();

        try {
            // Load lead data
            this.lead = await API.getLeadById(this.data.leadId);

            // Load associated jobs
            this.jobs = await API.getJobsByLead(this.data.leadId);

            this.hideLoading();
        } catch (error) {
            this.showError(API.handleAPIError(error, 'Load Lead'));
        }
    }

    getTitle() {
        return this.lead ? `${this.lead.name}` : 'Lead Details';
    }

    getSize() {
        return 'overlay-lg';
    }

    renderBody() {
        if (!this.lead) return '';

        const lead = this.lead;

        return `
            <div class="lead-detail-grid">
                <!-- Contact Information -->
                <div class="detail-section">
                    <h3 class="section-title">Contact Information</h3>
                    <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${API.escapeHtml(lead.name)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${lead.email ? `<a href="mailto:${API.escapeHtml(lead.email)}">${API.escapeHtml(lead.email)}</a>` : 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${lead.phone ? `<a href="tel:${API.escapeHtml(lead.phone)}">${API.escapeHtml(lead.phone)}</a>` : 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Company:</span>
                        <span class="detail-value">${API.escapeHtml(lead.company || 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Position:</span>
                        <span class="detail-value">${API.escapeHtml(lead.position || 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Department:</span>
                        <span class="detail-value">${API.escapeHtml(lead.department || 'N/A')}</span>
                    </div>
                </div>

                <!-- Lead Status -->
                <div class="detail-section">
                    <h3 class="section-title">Lead Status</h3>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">
                            <span class="status-badge" style="background: ${API.getStatusColor(lead.status)}">
                                ${API.escapeHtml(lead.status || 'new')}
                            </span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${API.escapeHtml(lead.type || 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Source:</span>
                        <span class="detail-value">${API.escapeHtml(lead.source || 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Quality Score:</span>
                        <span class="detail-value">${lead.quality_score ? `${lead.quality_score}/10` : 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Deal Stage:</span>
                        <span class="detail-value">${API.escapeHtml(lead.deal_stage || 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Win Probability:</span>
                        <span class="detail-value">${lead.win_probability ? `${lead.win_probability}%` : 'N/A'}</span>
                    </div>
                </div>

                <!-- Financial -->
                <div class="detail-section">
                    <h3 class="section-title">Financial</h3>
                    <div class="detail-row">
                        <span class="detail-label">Potential Value:</span>
                        <span class="detail-value" style="font-weight: 600; color: var(--success);">
                            ${lead.potential_value ? SteadyUtils.formatCurrency(parseFloat(lead.potential_value)) : 'N/A'}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Weighted Value:</span>
                        <span class="detail-value">
                            ${lead.potential_value && lead.win_probability ?
                                SteadyUtils.formatCurrency(parseFloat(lead.potential_value) * (lead.win_probability / 100)) : 'N/A'}
                        </span>
                    </div>
                </div>

                <!-- Next Actions -->
                <div class="detail-section">
                    <h3 class="section-title">Next Actions</h3>
                    <div class="detail-row">
                        <span class="detail-label">Next Action:</span>
                        <span class="detail-value">${API.escapeHtml(lead.next_action || 'No action set')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Follow-up Date:</span>
                        <span class="detail-value">${lead.follow_up_date ? SteadyUtils.formatDate(lead.follow_up_date, 'long') : 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Last Contact:</span>
                        <span class="detail-value">${lead.last_contact_date ? SteadyUtils.formatDate(lead.last_contact_date, 'relative') : 'Never'}</span>
                    </div>
                </div>

                <!-- Tags -->
                ${lead.tags && lead.tags.length > 0 ? `
                    <div class="detail-section">
                        <h3 class="section-title">Tags</h3>
                        <div class="tags-container">
                            ${lead.tags.map(tag => `
                                <span class="tag">${API.escapeHtml(tag)}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Notes -->
                ${lead.notes ? `
                    <div class="detail-section detail-section-full">
                        <h3 class="section-title">Notes</h3>
                        <div class="notes-content">${API.escapeHtml(lead.notes)}</div>
                    </div>
                ` : ''}

                <!-- Associated Jobs -->
                ${this.jobs && this.jobs.length > 0 ? `
                    <div class="detail-section detail-section-full">
                        <h3 class="section-title">Associated Jobs (${this.jobs.length})</h3>
                        <div class="jobs-list">
                            ${this.jobs.map(job => `
                                <div class="job-card" onclick="OverlayManager.open('job-detail', { jobId: '${job.id}' })">
                                    <div class="job-title">${API.escapeHtml(job.title)}</div>
                                    <div class="job-meta">
                                        ${job.scheduled_date ? SteadyUtils.formatDate(job.scheduled_date, 'short') : 'No date'} •
                                        ${job.quoted_price ? SteadyUtils.formatCurrency(job.quoted_price) : 'No price'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Created Date -->
                <div class="detail-section detail-section-full">
                    <div class="detail-row">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${SteadyUtils.formatDate(lead.created_at, 'datetime')}</span>
                    </div>
                </div>
            </div>

            <style>
                .lead-detail-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 2rem;
                }

                .detail-section {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    padding: 1.5rem;
                }

                .detail-section-full {
                    grid-column: 1 / -1;
                }

                .section-title {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 1rem;
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid var(--border);
                }

                .detail-row:last-child {
                    border-bottom: none;
                }

                .detail-label {
                    font-weight: 500;
                    color: var(--text-secondary);
                }

                .detail-value {
                    color: var(--text-primary);
                    text-align: right;
                }

                .status-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius);
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .tags-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .tag {
                    background: var(--primary-light);
                    color: var(--primary);
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius);
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .notes-content {
                    background: var(--background);
                    padding: 1rem;
                    border-radius: var(--radius);
                    white-space: pre-wrap;
                    color: var(--text-primary);
                }

                .jobs-list {
                    display: grid;
                    gap: 0.75rem;
                }

                .job-card {
                    background: var(--background);
                    padding: 1rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: var(--transition);
                }

                .job-card:hover {
                    background: var(--surface-hover);
                    transform: translateY(-2px);
                }

                .job-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .job-meta {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                @media (max-width: 768px) {
                    .lead-detail-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }

                    .detail-row {
                        flex-direction: column;
                        gap: 0.25rem;
                    }

                    .detail-value {
                        text-align: left;
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
            <button class="steady-btn steady-btn-primary" onclick="alert('Edit feature coming soon!')">
                Edit Lead
            </button>
        `;
    }
}

// Register this overlay type
OverlayManager.register('lead-detail', LeadDetailOverlay);

console.log('LeadDetailOverlay registered ✅');
