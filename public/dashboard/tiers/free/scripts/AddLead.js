/**
 * SteadyManager - Free Tier Add Lead Handler
 * Handles lead form submission, validation, and UI feedback
 * Integrates with dashboard.js, api.js, and utils.js
 */

class AddLeadHandler {
    constructor() {
        this.form = null;
        this.modal = null;
        this.isSubmitting = false;
        this.validationRules = {
            name: { required: true, maxLength: 100 },
            email: { required: false, format: 'email', maxLength: 255 },
            phone: { required: false, format: 'phone', maxLength: 20 },
            company: { required: false, maxLength: 100 },
            platform: { required: false },
            notes: { required: false, maxLength: 1000 }
        };
        this.init();
    }

    /**
     * Initialize add lead handler
     */
    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupValidation();
        console.log('📝 AddLead Handler initialized');
    }

    /**
     * Setup DOM elements
     */
    setupElements() {
        this.form = document.getElementById('addLeadForm');
        this.modal = document.getElementById('addLeadModal');
        this.submitButton = document.getElementById('saveLeadBtn');
        
        if (!this.form) {
            console.warn('Add lead form not found');
            return;
        }

        // Setup form elements
        this.elements = {
            name: document.getElementById('leadName'),
            email: document.getElementById('leadEmail'),
            phone: document.getElementById('leadPhone'),
            company: document.getElementById('leadCompany'),
            platform: document.getElementById('leadSource'),
            notes: document.getElementById('leadNotes')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.form) return;

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Real-time validation
        Object.keys(this.elements).forEach(field => {
            const element = this.elements[field];
            if (element) {
                element.addEventListener('blur', () => this.validateField(field));
                element.addEventListener('input', () => this.clearFieldError(field));
            }
        });

        // Modal events
        document.addEventListener('openAddLeadModal', () => {
            this.openModal();
        });

        // Global add lead buttons
        document.querySelectorAll('#addLeadBtn, #addFirstLeadBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAddLeadClick();
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + A to add lead
            if (e.altKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                this.handleAddLeadClick();
            }

            // Escape to close modal
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });

        // Auto-save draft (optional feature)
        this.setupAutoSave();
    }

    /**
     * Setup form validation
     */
    setupValidation() {
        // Add validation styles
        this.addValidationStyles();

        // Setup field formatters
        this.setupFieldFormatters();
    }

    /**
     * Handle add lead button click
     */
    handleAddLeadClick() {
        // Check lead limit first
        const currentLeads = window.DashboardController?.leads?.length || 0;
        
        if (currentLeads >= 50) {
            window.SteadyUtils?.showUpgradeModal('lead_limit');
            return;
        }

        // Show encouraging message based on current leads
        if (currentLeads === 0) {
            window.SteadyUtils?.showToast('Add your first lead and start growing! 🚀', 'success');
        } else if (currentLeads < 10) {
            window.SteadyUtils?.showToast('Great start! Keep building your pipeline.', 'success');
        } else if (currentLeads >= 25) {
            window.SteadyUtils?.showToast(`${currentLeads} leads and counting! You're on fire! 🔥`, 'success');
        }

        this.openModal();
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        if (this.isSubmitting) return;

        try {
            // Validate form
            const validation = this.validateForm();
            if (!validation.isValid) {
                this.showValidationErrors(validation.errors);
                return;
            }

            // Get form data
            const formData = this.getFormData();

            // Show loading state
            this.setSubmittingState(true);

            // Submit to API
            const result = await window.API.createLead(formData);

            if (result.success) {
                // Success! 
                this.handleSubmitSuccess(result.lead);
            } else {
                // Handle different error types
                this.handleSubmitError(result);
            }

        } catch (error) {
            console.error('Form submission error:', error);
            this.handleSubmitError({ error: 'NETWORK_ERROR', message: 'Network error. Please try again.' });
        } finally {
            this.setSubmittingState(false);
        }
    }

    /**
     * Handle successful form submission
     */
    handleSubmitSuccess(lead) {
        // Clear form
        this.form.reset();
        this.clearAllErrors();

        // Close modal
        this.closeModal();

        // Play success sound
        window.SteadyUtils?.playSound('success');

        // Show success message with lead count
        const currentLeads = (window.DashboardController?.leads?.length || 0) + 1;
        const limitCheck = window.SteadyUtils?.checkLeadLimit(currentLeads);

        let successMessage = `🎉 ${lead.name} added successfully!`;
        
        // Add encouraging messages based on progress
        if (currentLeads === 1) {
            successMessage += ' Your lead management journey begins!';
        } else if (currentLeads === 10) {
            successMessage += ' Double digits! You\'re building momentum!';
        } else if (currentLeads === 25) {
            successMessage += ' 25 leads! Time to consider upgrading for analytics!';
        } else if (limitCheck?.shouldShowUpgrade) {
            successMessage += ` (${currentLeads}/50 leads)`;
        }

        window.SteadyUtils?.showToast(successMessage, 'success');

        // Update dashboard
        if (window.DashboardController && typeof window.DashboardController.onLeadCreated === 'function') {
            window.DashboardController.onLeadCreated(lead);
        }

        // Track success
        window.SteadyUtils?.trackEvent('lead_created_success', {
            source: lead.platform || 'unknown',
            total_leads: currentLeads,
            has_email: !!lead.email,
            has_phone: !!lead.phone,
            has_company: !!lead.company
        });

        // Clear draft
        this.clearDraft();

        // Show upgrade hint for successful users
        if (currentLeads >= 20 && !sessionStorage.getItem('success_upgrade_hint')) {
            setTimeout(() => {
                window.SteadyUtils?.showToast(
                    'You\'re a lead generation machine! Ready for advanced analytics? 📊',
                    'upgrade'
                );
                sessionStorage.setItem('success_upgrade_hint', 'true');
            }, 3000);
        }
    }

    /**
     * Handle form submission errors
     */
    handleSubmitError(result) {
        const { error, message } = result;

        switch (error) {
            case 'LIMIT_REACHED':
                // Limit reached - show upgrade modal
                window.SteadyUtils?.showUpgradeModal('lead_limit');
                break;

            case 'VALIDATION_ERROR':
                // Server validation error
                window.SteadyUtils?.showToast(message, 'warning');
                break;

            case 'NETWORK_ERROR':
                // Network error
                window.SteadyUtils?.showToast('Connection issue. Please check your internet and try again.', 'error');
                break;

            case 'SERVER_ERROR':
            default:
                // Generic server error
                window.SteadyUtils?.showToast(message || 'Something went wrong. Please try again.', 'error');
                break;
        }

        // Track error
        window.SteadyUtils?.trackEvent('lead_creation_error', {
            error_type: error,
            message: message
        });
    }

    /**
     * Validate entire form
     */
    validateForm() {
        const errors = {};
        let isValid = true;

        Object.keys(this.validationRules).forEach(field => {
            const fieldValidation = this.validateField(field);
            if (!fieldValidation.isValid) {
                errors[field] = fieldValidation.error;
                isValid = false;
            }
        });

        return { isValid, errors };
    }

    /**
     * Validate individual field
     */
    validateField(fieldName) {
        const element = this.elements[fieldName];
        const rules = this.validationRules[fieldName];
        const value = element ? element.value.trim() : '';

        // Required field validation
        if (rules.required && !value) {
            this.showFieldError(fieldName, `${this.getFieldLabel(fieldName)} is required`);
            return { isValid: false, error: 'Required field' };
        }

        // Skip other validations if field is empty and not required
        if (!value && !rules.required) {
            this.clearFieldError(fieldName);
            return { isValid: true };
        }

        // Length validation
        if (rules.maxLength && value.length > rules.maxLength) {
            this.showFieldError(fieldName, `Must be less than ${rules.maxLength} characters`);
            return { isValid: false, error: 'Too long' };
        }

        // Format validation
        if (rules.format === 'email' && value) {
            if (!this.isValidEmail(value)) {
                this.showFieldError(fieldName, 'Please enter a valid email address');
                return { isValid: false, error: 'Invalid email' };
            }
        }

        if (rules.format === 'phone' && value) {
            if (!this.isValidPhone(value)) {
                this.showFieldError(fieldName, 'Please enter a valid phone number');
                return { isValid: false, error: 'Invalid phone' };
            }
        }

        // All validations passed
        this.clearFieldError(fieldName);
        return { isValid: true };
    }

    /**
     * Get form data
     */
    getFormData() {
        const data = {};
        
        Object.keys(this.elements).forEach(field => {
            const element = this.elements[field];
            if (element) {
                data[field] = element.value.trim();
            }
        });

        // Add timestamp
        data.created_at = new Date().toISOString();

        // Set default status
        data.status = 'new';

        return data;
    }

    /**
     * Show field error
     */
    showFieldError(fieldName, message) {
        const element = this.elements[fieldName];
        if (!element) return;

        // Add error class
        element.classList.add('error');
        
        // Remove existing error message
        this.clearFieldError(fieldName, false);

        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        element.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field error
     */
    clearFieldError(fieldName, removeClass = true) {
        const element = this.elements[fieldName];
        if (!element) return;

        if (removeClass) {
            element.classList.remove('error');
        }

        // Remove error message
        const errorMsg = element.parentNode.querySelector('.field-error');
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    /**
     * Clear all errors
     */
    clearAllErrors() {
        Object.keys(this.elements).forEach(field => {
            this.clearFieldError(field);
        });
    }

    /**
     * Show validation errors
     */
    showValidationErrors(errors) {
        Object.keys(errors).forEach(field => {
            this.showFieldError(field, errors[field]);
        });

        // Focus first error field
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField && this.elements[firstErrorField]) {
            this.elements[firstErrorField].focus();
        }

        // Show toast
        window.SteadyUtils?.showToast('Please fix the errors in the form', 'warning');
    }

    /**
     * Set submitting state
     */
    setSubmittingState(isSubmitting) {
        this.isSubmitting = isSubmitting;

        if (this.submitButton) {
            const textSpan = this.submitButton.querySelector('.btn-text');
            const spinnerSpan = this.submitButton.querySelector('.btn-spinner');

            if (isSubmitting) {
                this.submitButton.disabled = true;
                if (textSpan) textSpan.style.display = 'none';
                if (spinnerSpan) spinnerSpan.style.display = 'flex';
            } else {
                this.submitButton.disabled = false;
                if (textSpan) textSpan.style.display = 'flex';
                if (spinnerSpan) spinnerSpan.style.display = 'none';
            }
        }

        // Disable form fields
        Object.values(this.elements).forEach(element => {
            if (element) {
                element.disabled = isSubmitting;
            }
        });
    }

    /**
     * Open modal
     */
    openModal() {
        if (!this.modal) return;

        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Focus first field
        setTimeout(() => {
            if (this.elements.name) {
                this.elements.name.focus();
            }
        }, 300);

        // Load draft if available
        this.loadDraft();

        // Track modal open
        window.SteadyUtils?.trackEvent('add_lead_modal_opened');
    }

    /**
     * Close modal
     */
    closeModal() {
        if (!this.modal) return;

        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        // Clear form and errors
        this.form.reset();
        this.clearAllErrors();

        // Save draft
        this.saveDraft();

        // Track modal close
        window.SteadyUtils?.trackEvent('add_lead_modal_closed');
    }

    /**
     * Check if modal is open
     */
    isModalOpen() {
        return this.modal && this.modal.style.display === 'flex';
    }

    /**
     * Setup field formatters
     */
    setupFieldFormatters() {
        // Phone number formatter
        if (this.elements.phone) {
            this.elements.phone.addEventListener('input', (e) => {
                this.formatPhoneNumber(e.target);
            });
        }

        // Email formatter (lowercase)
        if (this.elements.email) {
            this.elements.email.addEventListener('blur', (e) => {
                e.target.value = e.target.value.toLowerCase();
            });
        }

        // Name formatter (title case)
        if (this.elements.name) {
            this.elements.name.addEventListener('blur', (e) => {
                e.target.value = this.toTitleCase(e.target.value);
            });
        }

        // Company formatter (title case)
        if (this.elements.company) {
            this.elements.company.addEventListener('blur', (e) => {
                e.target.value = this.toTitleCase(e.target.value);
            });
        }
    }

    /**
     * Setup auto-save draft
     */
    setupAutoSave() {
        let autoSaveTimeout;

        Object.values(this.elements).forEach(element => {
            if (element) {
                element.addEventListener('input', () => {
                    clearTimeout(autoSaveTimeout);
                    autoSaveTimeout = setTimeout(() => {
                        this.saveDraft();
                    }, 2000); // Save draft after 2 seconds of inactivity
                });
            }
        });
    }

    /**
     * Save form draft to localStorage
     */
    saveDraft() {
        if (!this.form) return;

        const formData = this.getFormData();
        
        // Only save if there's actual content
        const hasContent = Object.values(formData).some(value => 
            value && typeof value === 'string' && value.trim().length > 0
        );

        if (hasContent) {
            localStorage.setItem('steadymanager_lead_draft', JSON.stringify(formData));
        } else {
            localStorage.removeItem('steadymanager_lead_draft');
        }
    }

    /**
     * Load form draft from localStorage
     */
    loadDraft() {
        const draft = localStorage.getItem('steadymanager_lead_draft');
        if (!draft) return;

        try {
            const draftData = JSON.parse(draft);
            
            Object.keys(draftData).forEach(field => {
                const element = this.elements[field];
                if (element && draftData[field]) {
                    element.value = draftData[field];
                }
            });

            // Show notification
            window.SteadyUtils?.showToast('Draft restored!', 'success');
        } catch (error) {
            console.error('Failed to load draft:', error);
            localStorage.removeItem('steadymanager_lead_draft');
        }
    }

    /**
     * Clear saved draft
     */
    clearDraft() {
        localStorage.removeItem('steadymanager_lead_draft');
    }

    /**
     * Add validation styles
     */
    addValidationStyles() {
        if (document.getElementById('add-lead-validation-styles')) return;

        const style = document.createElement('style');
        style.id = 'add-lead-validation-styles';
        style.textContent = `
            .form-group input.error,
            .form-group select.error,
            .form-group textarea.error {
                border-color: #ef4444;
                background-color: #fef2f2;
            }

            .field-error {
                color: #ef4444;
                font-size: 0.75rem;
                margin-top: 0.25rem;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .field-error::before {
                content: '⚠';
                font-size: 0.875rem;
            }

            .form-group input:focus.error,
            .form-group select:focus.error,
            .form-group textarea:focus.error {
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Utility: Format phone number
     */
    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length >= 10) {
            if (value.length === 10) {
                value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            } else if (value.length === 11 && value[0] === '1') {
                value = value.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
            }
        }
        
        input.value = value;
    }

    /**
     * Utility: Convert to title case
     */
    toTitleCase(str) {
        return str.toLowerCase().replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    /**
     * Utility: Get field label
     */
    getFieldLabel(fieldName) {
        const labels = {
            name: 'Name',
            email: 'Email',
            phone: 'Phone',
            company: 'Company',
            platform: 'Source',
            notes: 'Notes'
        };
        return labels[fieldName] || fieldName;
    }

    /**
     * Utility: Validate email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Utility: Validate phone
     */
    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
        return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
    }

    /**
     * Public method: Submit form (for external calls)
     */
    async submitForm(event) {
        if (event) {
            event.preventDefault();
        }
        await this.handleSubmit();
        return !this.isSubmitting; // Return success status
    }

    /**
     * Public method: Open modal (for external calls)
     */
    open() {
        this.openModal();
    }

    /**
     * Public method: Close modal (for external calls)
     */
    close() {
        this.closeModal();
    }

    /**
     * Get handler state
     */
    getState() {
        return {
            isSubmitting: this.isSubmitting,
            isModalOpen: this.isModalOpen(),
            formData: this.getFormData(),
            hasErrors: document.querySelector('.field-error') !== null
        };
    }
}

// Initialize and export
window.AddLeadHandler = new AddLeadHandler();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AddLeadHandler;
}

// Make global functions available for backwards compatibility
window.openAddLeadModal = () => window.AddLeadHandler.open();
window.closeAddLeadModal = () => window.AddLeadHandler.close();