/**
 * QUICK ADD LEAD OVERLAY
 * Fast lead creation from anywhere
 *
 * Usage:
 *   OverlayManager.open('quick-add-lead');
 *   OverlayManager.open('quick-add-lead', { name: 'John Smith', company: 'TechCorp' }); // Pre-fill
 */

class QuickAddLeadOverlay extends BaseOverlay {
    getTitle() {
        return '⚡ Quick Add Lead';
    }

    getSize() {
        return 'overlay-md';
    }

    renderBody() {
        const prefill = this.data || {};

        return `
            <form id="${this.id}-form" class="quick-add-form">
                <div class="form-row">
                    <label for="${this.id}-name">Name *</label>
                    <input
                        type="text"
                        id="${this.id}-name"
                        class="form-input"
                        required
                        placeholder="John Smith"
                        value="${API.escapeHtml(prefill.name || '')}"
                        autocomplete="off">
                </div>

                <div class="form-row">
                    <label for="${this.id}-email">Email</label>
                    <input
                        type="email"
                        id="${this.id}-email"
                        class="form-input"
                        placeholder="john@example.com"
                        value="${API.escapeHtml(prefill.email || '')}"
                        autocomplete="off">
                </div>

                <div class="form-row">
                    <label for="${this.id}-phone">Phone</label>
                    <input
                        type="tel"
                        id="${this.id}-phone"
                        class="form-input"
                        placeholder="+1 (555) 123-4567"
                        value="${API.escapeHtml(prefill.phone || '')}"
                        autocomplete="off">
                </div>

                <div class="form-row">
                    <label for="${this.id}-company">Company</label>
                    <input
                        type="text"
                        id="${this.id}-company"
                        class="form-input"
                        placeholder="ACME Corp"
                        value="${API.escapeHtml(prefill.company || '')}"
                        autocomplete="off">
                </div>

                <div class="form-row">
                    <label for="${this.id}-position">Position</label>
                    <input
                        type="text"
                        id="${this.id}-position"
                        class="form-input"
                        placeholder="VP of Sales"
                        value="${API.escapeHtml(prefill.position || '')}"
                        autocomplete="off">
                </div>

                <div class="form-row-split">
                    <div class="form-row">
                        <label for="${this.id}-source">Source</label>
                        <select id="${this.id}-source" class="form-input">
                            <option value="">Select source...</option>
                            <option value="website">Website</option>
                            <option value="referral">Referral</option>
                            <option value="cold_call">Cold Call</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="facebook">Facebook</option>
                            <option value="email">Email Campaign</option>
                            <option value="event">Event</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="form-row">
                        <label for="${this.id}-quality">Quality Score</label>
                        <input
                            type="number"
                            id="${this.id}-quality"
                            class="form-input"
                            min="1"
                            max="10"
                            placeholder="7"
                            value="${prefill.quality_score || ''}">
                    </div>
                </div>

                <div class="form-row">
                    <label for="${this.id}-notes">Notes</label>
                    <textarea
                        id="${this.id}-notes"
                        class="form-input"
                        rows="3"
                        placeholder="Quick notes about this lead...">${API.escapeHtml(prefill.notes || '')}</textarea>
                </div>
            </form>

            <style>
                .quick-add-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .form-row {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-row-split {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                .form-row label {
                    font-weight: 600;
                    font-size: 0.875rem;
                    color: var(--text-primary);
                }

                .form-input {
                    padding: 0.75rem;
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    background: var(--surface);
                    color: var(--text-primary);
                    font-size: 0.9375rem;
                    font-family: inherit;
                    transition: var(--transition);
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                @media (max-width: 768px) {
                    .form-row-split {
                        grid-template-columns: 1fr;
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
                Cancel
            </button>
            <button class="steady-btn steady-btn-primary" id="${this.id}-submit">
                Add Lead
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

        // Focus first input
        const nameInput = document.getElementById(`${this.id}-name`);
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }

    async handleSubmit() {
        const getName = () => document.getElementById(`${this.id}-name`).value.trim();
        const getEmail = () => document.getElementById(`${this.id}-email`).value.trim();
        const getPhone = () => document.getElementById(`${this.id}-phone`).value.trim();
        const getCompany = () => document.getElementById(`${this.id}-company`).value.trim();
        const getPosition = () => document.getElementById(`${this.id}-position`).value.trim();
        const getSource = () => document.getElementById(`${this.id}-source`).value;
        const getQuality = () => document.getElementById(`${this.id}-quality`).value;
        const getNotes = () => document.getElementById(`${this.id}-notes`).value.trim();

        const name = getName();

        if (!name) {
            SteadyUtils.shake(`#${this.id}-name`);
            toast('Name is required', 'error');
            return;
        }

        const submitBtn = document.getElementById(`${this.id}-submit`);
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        try {
            const leadData = {
                name,
                email: getEmail() || null,
                phone: getPhone() || null,
                company: getCompany() || null,
                position: getPosition() || null,
                source: getSource() || null,
                quality_score: getQuality() ? parseInt(getQuality()) : null,
                notes: getNotes() || null,
                status: 'new',
                type: 'cold'
            };

            // Check duplicates
            const dupes = await API.checkDuplicates(leadData);

            if (dupes.hasExactDuplicates) {
                const confirmed = confirm(`This lead looks like a duplicate:\n\n${dupes.exact[0].lead.name} - ${dupes.exact[0].lead.company}\n\nAdd anyway?`);
                if (!confirmed) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Add Lead';
                    return;
                }
            }

            // Create lead
            await API.createLead(leadData);

            toast('Lead added successfully! 🎉', 'success');

            // Close overlay
            OverlayManager.close(this.id);

            // Reload current page to show new lead
            if (window.loadPage) {
                const currentPage = document.querySelector('.nav-link.active')?.getAttribute('data-page') || 'dashboard';
                window.loadPage(currentPage);
            }

        } catch (error) {
            console.error('Quick add error:', error);
            toast(API.handleAPIError(error, 'Quick Add Lead'), 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Lead';
        }
    }
}

// Register this overlay type
OverlayManager.register('quick-add-lead', QuickAddLeadOverlay);

console.log('QuickAddLeadOverlay registered ✅');
