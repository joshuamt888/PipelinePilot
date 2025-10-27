/**
 * QUICK ADD JOB OVERLAY
 * Fast job creation from anywhere
 *
 * Usage:
 *   OverlayManager.open('quick-add-job');
 *   OverlayManager.open('quick-add-job', { lead_id: '123' }); // Pre-link to lead
 */

class QuickAddJobOverlay extends BaseOverlay {
    async onMount() {
        // Load leads for association picker
        try {
            const leadsData = await API.getLeads();
            this.leads = leadsData.all || [];
        } catch (error) {
            this.leads = [];
        }
    }

    getTitle() {
        return '💼 Quick Add Job';
    }

    getSize() {
        return 'overlay-lg';
    }

    renderBody() {
        const prefill = this.data || {};

        return `
            <form id="${this.id}-form" class="quick-add-job-form">
                <div class="form-section">
                    <h3 class="form-section-title">Job Details</h3>

                    <div class="form-row">
                        <label for="${this.id}-title">Job Title *</label>
                        <input
                            type="text"
                            id="${this.id}-title"
                            class="form-input"
                            required
                            placeholder="Install kitchen cabinets"
                            value="${API.escapeHtml(prefill.title || '')}"
                            autocomplete="off">
                    </div>

                    <div class="form-row-split">
                        <div class="form-row">
                            <label for="${this.id}-type">Type</label>
                            <select id="${this.id}-type" class="form-input">
                                <option value="service">Service</option>
                                <option value="product">Product</option>
                                <option value="consultation">Consultation</option>
                                <option value="project">Project</option>
                            </select>
                        </div>

                        <div class="form-row">
                            <label for="${this.id}-priority">Priority</label>
                            <select id="${this.id}-priority" class="form-input">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row-split">
                        <div class="form-row">
                            <label for="${this.id}-date">Scheduled Date</label>
                            <input
                                type="date"
                                id="${this.id}-date"
                                class="form-input"
                                value="${prefill.scheduled_date || ''}">
                        </div>

                        <div class="form-row">
                            <label for="${this.id}-time">Time</label>
                            <input
                                type="time"
                                id="${this.id}-time"
                                class="form-input"
                                value="${prefill.scheduled_time || ''}">
                        </div>
                    </div>

                    <div class="form-row">
                        <label for="${this.id}-lead">Associate with Lead (optional)</label>
                        <select id="${this.id}-lead" class="form-input">
                            <option value="">None</option>
                            ${this.leads ? this.leads.map(lead => `
                                <option value="${lead.id}" ${prefill.lead_id === lead.id ? 'selected' : ''}>
                                    ${API.escapeHtml(lead.name)} ${lead.company ? `- ${API.escapeHtml(lead.company)}` : ''}
                                </option>
                            `).join('') : ''}
                        </select>
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="form-section-title">Pricing & Costs</h3>

                    <div class="form-row">
                        <label for="${this.id}-quoted">Quoted Price ($)</label>
                        <input
                            type="number"
                            id="${this.id}-quoted"
                            class="form-input"
                            min="0"
                            step="0.01"
                            placeholder="1500.00"
                            value="${prefill.quoted_price || ''}">
                    </div>

                    <div class="form-row-split">
                        <div class="form-row">
                            <label for="${this.id}-material">Material Cost ($)</label>
                            <input
                                type="number"
                                id="${this.id}-material"
                                class="form-input"
                                min="0"
                                step="0.01"
                                placeholder="500.00"
                                value="${prefill.material_cost || '0'}">
                        </div>

                        <div class="form-row">
                            <label for="${this.id}-other">Other Expenses ($)</label>
                            <input
                                type="number"
                                id="${this.id}-other"
                                class="form-input"
                                min="0"
                                step="0.01"
                                placeholder="50.00"
                                value="${prefill.other_expenses || '0'}">
                        </div>
                    </div>

                    <div class="form-row-split">
                        <div class="form-row">
                            <label for="${this.id}-labor-hours">Labor Hours</label>
                            <input
                                type="number"
                                id="${this.id}-labor-hours"
                                class="form-input"
                                min="0"
                                step="0.5"
                                placeholder="8"
                                value="${prefill.labor_hours || '0'}">
                        </div>

                        <div class="form-row">
                            <label for="${this.id}-labor-rate">Labor Rate ($/hr)</label>
                            <input
                                type="number"
                                id="${this.id}-labor-rate"
                                class="form-input"
                                min="0"
                                step="0.01"
                                placeholder="50.00"
                                value="${prefill.labor_rate || '0'}">
                        </div>
                    </div>

                    <!-- Profit Preview -->
                    <div id="${this.id}-profit-preview" class="profit-preview">
                        <div class="profit-label">Estimated Profit:</div>
                        <div class="profit-value">$0.00</div>
                        <div class="profit-margin">0% margin</div>
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="form-section-title">Additional Info</h3>

                    <div class="form-row">
                        <label for="${this.id}-location">Location</label>
                        <input
                            type="text"
                            id="${this.id}-location"
                            class="form-input"
                            placeholder="123 Main St, City, State"
                            value="${API.escapeHtml(prefill.location || '')}"
                            autocomplete="off">
                    </div>

                    <div class="form-row">
                        <label for="${this.id}-notes">Notes</label>
                        <textarea
                            id="${this.id}-notes"
                            class="form-input"
                            rows="3"
                            placeholder="Additional job details...">${API.escapeHtml(prefill.notes || '')}</textarea>
                    </div>
                </div>
            </form>

            <style>
                .quick-add-job-form {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .form-section {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .form-section-title {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin: 0;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid var(--border);
                }

                .profit-preview {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    text-align: center;
                    color: white;
                    margin-top: 1rem;
                }

                .profit-preview.negative {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                }

                .profit-label {
                    font-size: 0.875rem;
                    opacity: 0.9;
                    margin-bottom: 0.5rem;
                }

                .profit-value {
                    font-size: 2rem;
                    font-weight: 900;
                }

                .profit-margin {
                    font-size: 0.875rem;
                    opacity: 0.9;
                    margin-top: 0.25rem;
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
                Cancel
            </button>
            <button class="steady-btn steady-btn-primary" id="${this.id}-submit">
                Create Job
            </button>
        `;
    }

    onBodyUpdate() {
        // Attach submit handler
        const submitBtn = document.getElementById(`${this.id}-submit`);
        if (submitBtn) {
            submitBtn.onclick = () => this.handleSubmit();
        }

        // Submit on Enter in form
        const form = document.getElementById(`${this.id}-form`);
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleSubmit();
            };
        }

        // Calculate profit as user types
        const inputs = ['quoted', 'material', 'other', 'labor-hours', 'labor-rate'];
        inputs.forEach(field => {
            const input = document.getElementById(`${this.id}-${field}`);
            if (input) {
                input.addEventListener('input', () => this.updateProfitPreview());
            }
        });

        // Initial calculation
        this.updateProfitPreview();

        // Focus first input
        setTimeout(() => {
            document.getElementById(`${this.id}-title`)?.focus();
        }, 100);
    }

    updateProfitPreview() {
        const quoted = parseFloat(document.getElementById(`${this.id}-quoted`)?.value || 0);
        const material = parseFloat(document.getElementById(`${this.id}-material`)?.value || 0);
        const other = parseFloat(document.getElementById(`${this.id}-other`)?.value || 0);
        const laborHours = parseFloat(document.getElementById(`${this.id}-labor-hours`)?.value || 0);
        const laborRate = parseFloat(document.getElementById(`${this.id}-labor-rate`)?.value || 0);

        const laborCost = laborHours * laborRate;
        const totalCost = material + other + laborCost;
        const profit = quoted - totalCost;
        const margin = quoted > 0 ? (profit / quoted) * 100 : 0;

        const preview = document.getElementById(`${this.id}-profit-preview`);
        if (preview) {
            preview.querySelector('.profit-value').textContent = SteadyUtils.formatCurrency(profit);
            preview.querySelector('.profit-margin').textContent = `${margin.toFixed(1)}% margin`;

            if (profit < 0) {
                preview.classList.add('negative');
            } else {
                preview.classList.remove('negative');
            }
        }
    }

    async handleSubmit() {
        const getTitle = () => document.getElementById(`${this.id}-title`)?.value.trim();
        const getType = () => document.getElementById(`${this.id}-type`)?.value;
        const getPriority = () => document.getElementById(`${this.id}-priority`)?.value;
        const getDate = () => document.getElementById(`${this.id}-date`)?.value;
        const getTime = () => document.getElementById(`${this.id}-time`)?.value;
        const getLead = () => document.getElementById(`${this.id}-lead`)?.value;
        const getQuoted = () => document.getElementById(`${this.id}-quoted`)?.value;
        const getMaterial = () => document.getElementById(`${this.id}-material`)?.value;
        const getOther = () => document.getElementById(`${this.id}-other`)?.value;
        const getLaborHours = () => document.getElementById(`${this.id}-labor-hours`)?.value;
        const getLaborRate = () => document.getElementById(`${this.id}-labor-rate`)?.value;
        const getLocation = () => document.getElementById(`${this.id}-location`)?.value.trim();
        const getNotes = () => document.getElementById(`${this.id}-notes`)?.value.trim();

        const title = getTitle();

        if (!title) {
            SteadyUtils.shake(`#${this.id}-title`);
            toast('Job title is required', 'error');
            return;
        }

        const submitBtn = document.getElementById(`${this.id}-submit`);
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        try {
            const jobData = {
                title,
                job_type: getType(),
                priority: getPriority(),
                scheduled_date: getDate() || null,
                scheduled_time: getTime() || null,
                lead_id: getLead() || null,
                quoted_price: getQuoted() ? parseFloat(getQuoted()) : 0,
                material_cost: getMaterial() ? parseFloat(getMaterial()) : 0,
                other_expenses: getOther() ? parseFloat(getOther()) : 0,
                labor_hours: getLaborHours() ? parseFloat(getLaborHours()) : 0,
                labor_rate: getLaborRate() ? parseFloat(getLaborRate()) : 0,
                location: getLocation() || null,
                notes: getNotes() || null,
                status: 'scheduled'
            };

            await API.createJob(jobData);

            toast('Job created successfully! 💼', 'success');

            // Close overlay
            OverlayManager.close(this.id);

            // Reload current page to show new job
            if (window.loadPage) {
                const currentPage = document.querySelector('.nav-link.active')?.getAttribute('data-page') || 'dashboard';
                window.loadPage(currentPage);
            }

        } catch (error) {
            console.error('Quick add job error:', error);
            toast(API.handleAPIError(error, 'Quick Add Job'), 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Job';
        }
    }
}

// Register this overlay type
OverlayManager.register('quick-add-job', QuickAddJobOverlay);

console.log('QuickAddJobOverlay registered ✅');
