/**
 * BASE OVERLAY v1.0
 * Foundation for all overlay components
 *
 * Extend this class to create custom overlays:
 *   class MyOverlay extends BaseOverlay {
 *       getTitle() { return 'My Custom Overlay'; }
 *       renderBody() { return '<div>My content</div>'; }
 *   }
 *
 * All overlays get these for free:
 * - Fade in/out animations (via SteadyUtils)
 * - ESC to close
 * - Click outside to close
 * - Loading states
 * - Error handling
 */

class BaseOverlay {
    constructor(id, data, zIndex) {
        this.id = id;
        this.data = data || {};
        this.zIndex = zIndex;
        this.isLoading = false;
        this.element = null;
    }

    /**
     * Render the overlay
     * Can be async if you need to load data first
     */
    async render() {
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = this.id;
        backdrop.className = `overlay-backdrop ${this.getSize()}`;
        backdrop.style.zIndex = this.zIndex;

        backdrop.innerHTML = `
            <div class="overlay-container" id="${this.id}-container">
                <div class="overlay-header">
                    <h2 class="overlay-title">${API.escapeHtml(this.getTitle())}</h2>
                    <button class="overlay-close" aria-label="Close">×</button>
                </div>
                <div class="overlay-body" id="${this.id}-body">
                    ${this.isLoading ? this.renderLoading() : this.renderBody()}
                </div>
                ${this.hasFooter() ? `
                    <div class="overlay-footer" id="${this.id}-footer">
                        ${this.renderFooter()}
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(backdrop);
        this.element = backdrop;

        // Fade in using SteadyUtils
        requestAnimationFrame(() => {
            backdrop.classList.add('overlay-visible');
        });

        // Attach event handlers
        this.attachEvents();

        // Call onMount hook
        await this.onMount();
    }

    /**
     * Attach event listeners
     */
    attachEvents() {
        const backdrop = this.element;
        const container = backdrop.querySelector('.overlay-container');
        const closeBtn = backdrop.querySelector('.overlay-close');

        // Close button
        closeBtn.onclick = () => OverlayManager.close(this.id);

        // Click outside to close (only if clicking directly on backdrop)
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                OverlayManager.close(this.id);
            }
        });

        // Prevent clicks on container from closing
        container.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Destroy the overlay
     */
    destroy() {
        if (!this.element) return;

        // Call onDestroy hook
        this.onDestroy();

        // Fade out using SteadyUtils
        this.element.classList.remove('overlay-visible');

        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }, 300);
    }

    /**
     * Update overlay body content
     */
    updateBody(html) {
        const body = document.getElementById(`${this.id}-body`);
        if (body) {
            body.innerHTML = html;
            // Re-attach events if needed
            this.onBodyUpdate();
        }
    }

    /**
     * Update overlay footer content
     */
    updateFooter(html) {
        const footer = document.getElementById(`${this.id}-footer`);
        if (footer) {
            footer.innerHTML = html;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        this.updateBody(this.renderLoading());
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        this.updateBody(this.renderBody());
        this.onBodyUpdate();
    }

    /**
     * Show error in overlay
     */
    showError(message) {
        this.updateBody(`
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3 style="color: var(--danger); margin-bottom: 0.5rem;">Error</h3>
                <p style="color: var(--text-secondary);">${API.escapeHtml(message)}</p>
                <button class="steady-btn steady-btn-secondary" onclick="OverlayManager.close('${this.id}')">
                    Close
                </button>
            </div>
        `);
    }

    // =====================================================
    // OVERRIDE THESE METHODS IN YOUR OVERLAY
    // =====================================================

    /**
     * Get overlay title
     * @returns {string}
     */
    getTitle() {
        return 'Overlay';
    }

    /**
     * Get overlay size
     * @returns {string} 'overlay-sm', 'overlay-md', 'overlay-lg', 'overlay-xl', 'overlay-full'
     */
    getSize() {
        return 'overlay-md';
    }

    /**
     * Render body content
     * @returns {string} HTML string
     */
    renderBody() {
        return '<div>Override renderBody() in your overlay class</div>';
    }

    /**
     * Does this overlay have a footer?
     * @returns {boolean}
     */
    hasFooter() {
        return false;
    }

    /**
     * Render footer content
     * @returns {string} HTML string
     */
    renderFooter() {
        return '';
    }

    /**
     * Render loading state
     * @returns {string} HTML string
     */
    renderLoading() {
        return `
            <div style="text-align: center; padding: 3rem;">
                <div class="loading-spinner" style="display: inline-block;"></div>
                <p style="margin-top: 1rem; color: var(--text-secondary);">Loading...</p>
            </div>
        `;
    }

    /**
     * Called after overlay is mounted to DOM
     * Good place to load data, attach custom events, etc
     */
    async onMount() {
        // Override in subclass
    }

    /**
     * Called when overlay body is updated
     * Re-attach event listeners here if needed
     */
    onBodyUpdate() {
        // Override in subclass
    }

    /**
     * Called before overlay is destroyed
     * Cleanup custom event listeners, timers, etc
     */
    onDestroy() {
        // Override in subclass
    }
}

// Export to global scope
window.BaseOverlay = BaseOverlay;

console.log('BaseOverlay loaded - Overlay foundation ready 📦');
