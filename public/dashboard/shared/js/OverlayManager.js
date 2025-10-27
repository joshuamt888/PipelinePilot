/**
 * OVERLAY MANAGER v1.0
 * Revolutionary multi-tasking UI for SteadyManager Pro
 *
 * Manages floating overlays (popups, modals, panels)
 * Heavily integrated with SteadyUtils for animations, theming, and utilities
 *
 * Usage:
 *   OverlayManager.open('lead-detail', { leadId: '123' });
 *   OverlayManager.open('quick-add-job');
 *   OverlayManager.close(overlayId);
 *   OverlayManager.closeAll();
 */

class OverlayManagerClass {
    constructor() {
        this.overlays = new Map();
        this.zIndexCounter = 2000; // Start above dashboard (1000)
        this.overlayTypes = {}; // Will be populated by overlay components
        this.setupGlobalStyles();
        console.log('OverlayManager v1.0 loaded 🪟');
    }

    /**
     * Register an overlay type
     * Called by overlay components to make themselves available
     */
    register(typeName, OverlayClass) {
        this.overlayTypes[typeName] = OverlayClass;
    }

    /**
     * Open an overlay
     * @param {string} type - Overlay type ('lead-detail', 'job-detail', etc)
     * @param {object} data - Data to pass to overlay
     * @returns {string} overlayId
     */
    open(type, data = {}) {
        const OverlayClass = this.overlayTypes[type];

        if (!OverlayClass) {
            console.error(`Overlay type "${type}" not registered`);
            SteadyUtils.showToast(`Cannot open ${type} overlay`, 'error');
            return null;
        }

        // Generate unique ID using utils
        const overlayId = SteadyUtils.generateId();

        // Create overlay instance
        const overlay = new OverlayClass(overlayId, data, this.zIndexCounter++);

        // Store overlay
        this.overlays.set(overlayId, overlay);

        // Render overlay
        overlay.render();

        // Lock scroll and blur background (using utils)
        SteadyUtils.lockScroll();
        SteadyUtils.blurBackground();

        // ESC to close (using utils)
        overlay.escHandler = SteadyUtils.closeOnEscape(() => {
            this.close(overlayId);
        });

        return overlayId;
    }

    /**
     * Close specific overlay
     */
    close(overlayId) {
        const overlay = this.overlays.get(overlayId);

        if (!overlay) return;

        // Call overlay's destroy method
        overlay.destroy();

        // Remove from map
        this.overlays.delete(overlayId);

        // If no more overlays, unlock scroll and unblur
        if (this.overlays.size === 0) {
            SteadyUtils.unlockScroll();
            SteadyUtils.unblurBackground();
        }
    }

    /**
     * Close all overlays
     */
    closeAll() {
        const overlayIds = Array.from(this.overlays.keys());
        overlayIds.forEach(id => this.close(id));
    }

    /**
     * Close topmost overlay
     */
    closeTop() {
        if (this.overlays.size === 0) return;

        // Find overlay with highest z-index
        let topOverlay = null;
        let maxZIndex = -1;

        this.overlays.forEach((overlay, id) => {
            if (overlay.zIndex > maxZIndex) {
                maxZIndex = overlay.zIndex;
                topOverlay = id;
            }
        });

        if (topOverlay) this.close(topOverlay);
    }

    /**
     * Check if any overlays are open
     */
    hasOpenOverlays() {
        return this.overlays.size > 0;
    }

    /**
     * Get count of open overlays
     */
    getCount() {
        return this.overlays.size;
    }

    /**
     * Setup global overlay styles
     */
    setupGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Overlay Backdrop */
            .overlay-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                padding: 2rem;
            }

            .overlay-backdrop.overlay-visible {
                opacity: 1;
            }

            /* Overlay Container */
            .overlay-container {
                background: var(--surface);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-xl);
                max-width: 90vw;
                max-height: 90vh;
                width: 100%;
                display: flex;
                flex-direction: column;
                transform: scale(0.95) translateY(20px);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid var(--border);
            }

            .overlay-visible .overlay-container {
                transform: scale(1) translateY(0);
            }

            /* Overlay Header */
            .overlay-header {
                padding: 1.5rem 2rem;
                border-bottom: 1px solid var(--border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-shrink: 0;
            }

            .overlay-title {
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
            }

            .overlay-close {
                width: 32px;
                height: 32px;
                border-radius: var(--radius);
                border: none;
                background: transparent;
                color: var(--text-tertiary);
                font-size: 1.5rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--transition);
                line-height: 1;
            }

            .overlay-close:hover {
                background: var(--surface-hover);
                color: var(--text-primary);
            }

            /* Overlay Body */
            .overlay-body {
                padding: 2rem;
                overflow-y: auto;
                flex: 1;
            }

            /* Overlay Footer */
            .overlay-footer {
                padding: 1.5rem 2rem;
                border-top: 1px solid var(--border);
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 0.75rem;
                flex-shrink: 0;
            }

            /* Size Variants */
            .overlay-sm .overlay-container { max-width: 400px; }
            .overlay-md .overlay-container { max-width: 600px; }
            .overlay-lg .overlay-container { max-width: 800px; }
            .overlay-xl .overlay-container { max-width: 1000px; }
            .overlay-full .overlay-container { max-width: 95vw; }

            /* Mobile Responsive */
            @media (max-width: 768px) {
                .overlay-backdrop {
                    padding: 1rem;
                }

                .overlay-container {
                    max-width: 100vw;
                    max-height: 100vh;
                    border-radius: 0;
                }

                .overlay-header {
                    padding: 1rem 1.5rem;
                }

                .overlay-body {
                    padding: 1.5rem;
                }

                .overlay-footer {
                    padding: 1rem 1.5rem;
                    flex-direction: column-reverse;
                }

                .overlay-footer .steady-btn {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// Create global instance
const OverlayManager = new OverlayManagerClass();
window.OverlayManager = OverlayManager;

console.log('OverlayManager ready - Multi-tasking UI enabled 🚀');
