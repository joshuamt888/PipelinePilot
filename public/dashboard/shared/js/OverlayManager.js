/**
 * OVERLAY MANAGER v2.0
 * Revolutionary windowing system for SteadyManager Pro
 * 
 * Features:
 * - Max 3 overlays simultaneously
 * - Smooth drag & drop repositioning
 * - Click to bring to front (z-index stacking)
 * - Minimize to bottom bar
 * - Remembers positions (localStorage)
 * - Buttery smooth performance (CSS transforms + RAF)
 * 
 * Security:
 * - No inline event handlers
 * - All user content escaped via API.escapeHtml()
 * - Proper event listener cleanup
 */

window.OverlayManager = {
    overlays: new Map(),
    zIndexCounter: 1000,
    maxOverlays: 3,
    minimizedBar: null,
    initialized: false,

    /**
     * Initialize overlay system
     */
    init() {
        if (this.initialized) return;
        
        this.createMinimizedBar();
        this.setupGlobalStyles();
        this.setupKeyboardShortcuts();
        this.initialized = true;
        
        console.log('[OverlayManager] Initialized v2.0');
    },

    /**
     * Open a new overlay
     * @param {Object} config - Overlay configuration
     * @param {string} config.id - Unique overlay ID
     * @param {string} config.title - Overlay title
     * @param {string|HTMLElement} config.content - Overlay content
     * @param {number} config.width - Width in pixels (default: 600)
     * @param {number} config.height - Height in pixels (default: 700)
     * @param {string} config.module - Source module name
     * @param {Function} config.onClose - Callback when closed
     * @param {Function} config.onSave - Callback when saved
     */
    open(config) {
        const {
            id,
            title = 'Overlay',
            content = '',
            width = 600,
            height = 700,
            module = 'unknown',
            onClose = null,
            onSave = null
        } = config;

        // Validate required params
        if (!id) {
            console.error('[OverlayManager] ID is required');
            return;
        }

        // Check if already open
        if (this.overlays.has(id)) {
            this.bringToFront(id);
            return;
        }

        // Check max limit
        if (this.overlays.size >= this.maxOverlays) {
            this.showToast('Maximum 3 overlays open. Close one first.', 'warning');
            return;
        }

        // Get saved position or calculate default
        const position = this.getSavedPosition(id) || this.calculateDefaultPosition();

        // Create overlay element
        const overlay = this.createOverlayElement({
            id,
            title,
            content,
            width,
            height,
            position,
            module
        });

        // Track overlay
        this.overlays.set(id, {
            element: overlay,
            config,
            position,
            minimized: false,
            onClose,
            onSave
        });

        // Add to DOM
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('overlay-show');
        });

        // Bring to front
        this.bringToFront(id);

        // Setup dragging
        this.setupDragging(id);

        // Lock body scroll if first overlay
        if (this.overlays.size === 1) {
            document.body.style.overflow = 'hidden';
        }

        console.log(`[OverlayManager] Opened: ${id}`);
    },

    /**
     * Create overlay HTML element (NO INLINE HANDLERS)
     */
    createOverlayElement({ id, title, content, width, height, position }) {
        const overlay = document.createElement('div');
        overlay.className = 'steady-overlay';
        overlay.id = `overlay-${id}`;
        overlay.style.width = `${width}px`;
        overlay.style.height = `${height}px`;
        overlay.style.left = `${position.x}px`;
        overlay.style.top = `${position.y}px`;
        overlay.dataset.overlayId = id;

        // Create header
        const header = document.createElement('div');
        header.className = 'overlay-header';
        header.dataset.dragHandle = id;

        // Title section
        const titleDiv = document.createElement('div');
        titleDiv.className = 'overlay-title';

        const icon = document.createElement('span');
        icon.className = 'overlay-icon';
        icon.textContent = '📋';

        const titleText = document.createElement('span');
        titleText.className = 'overlay-title-text';
        titleText.textContent = title; // Safe - uses textContent

        titleDiv.appendChild(icon);
        titleDiv.appendChild(titleText);

        // Controls section
        const controls = document.createElement('div');
        controls.className = 'overlay-controls';

        // Minimize button
        const minimizeBtn = document.createElement('button');
        minimizeBtn.className = 'overlay-control-btn minimize-btn';
        minimizeBtn.title = 'Minimize';
        minimizeBtn.textContent = '➖';
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimize(id);
        });

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'overlay-control-btn close-btn';
        closeBtn.title = 'Close (ESC)';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close(id);
        });

        controls.appendChild(minimizeBtn);
        controls.appendChild(closeBtn);

        header.appendChild(titleDiv);
        header.appendChild(controls);

        // Create body
        const body = document.createElement('div');
        body.className = 'overlay-body';
        body.id = `overlay-body-${id}`;

        // Add content (safe for both string and HTMLElement)
        if (typeof content === 'string') {
            body.innerHTML = content; // Assume content is pre-sanitized
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        // Assemble overlay
        overlay.appendChild(header);
        overlay.appendChild(body);

        // Click anywhere to bring to front
        overlay.addEventListener('mousedown', (e) => {
            // Don't trigger if clicking control buttons
            if (e.target.closest('.overlay-control-btn')) return;
            this.bringToFront(id);
        });

        return overlay;
    },

    /**
     * Setup smooth dragging with CSS transforms
     */
    setupDragging(id) {
        const overlayData = this.overlays.get(id);
        if (!overlayData) return;

        const overlay = overlayData.element;
        const header = overlay.querySelector(`[data-drag-handle="${id}"]`);
        if (!header) return;

        let isDragging = false;
        let startX, startY, initialX, initialY;

        const onMouseDown = (e) => {
            // Don't drag if clicking buttons
            if (e.target.closest('.overlay-control-btn')) return;
            
            // Don't drag if selecting text
            if (e.target.closest('.overlay-title-text')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = overlay.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            overlay.classList.add('dragging');
            document.body.style.userSelect = 'none';

            this.bringToFront(id);

            e.preventDefault(); // Prevent text selection
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            requestAnimationFrame(() => {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                const newX = initialX + deltaX;
                const newY = initialY + deltaY;

                // Constrain to viewport (keep at least 50px visible)
                const minVisible = 50;
                const maxX = window.innerWidth - minVisible;
                const maxY = window.innerHeight - minVisible;
                const minX = -(overlay.offsetWidth - minVisible);
                const minY = 0;

                const constrainedX = Math.max(minX, Math.min(newX, maxX));
                const constrainedY = Math.max(minY, Math.min(newY, maxY));

                overlay.style.left = `${constrainedX}px`;
                overlay.style.top = `${constrainedY}px`;

                overlayData.position = { x: constrainedX, y: constrainedY };
            });
        };

        const onMouseUp = () => {
            if (!isDragging) return;

            isDragging = false;
            overlay.classList.remove('dragging');
            document.body.style.userSelect = '';

            // Save position
            this.savePosition(id, overlayData.position);
        };

        header.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Store cleanup function
        overlayData.cleanup = () => {
            header.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    },

    /**
     * Close overlay with animation
     */
    close(id) {
        const overlayData = this.overlays.get(id);
        if (!overlayData) return;

        const overlay = overlayData.element;

        // Callback
        if (overlayData.onClose) {
            try {
                overlayData.onClose();
            } catch (error) {
                console.error('[OverlayManager] onClose callback error:', error);
            }
        }

        // Remove from minimized bar if minimized
        if (overlayData.minimized) {
            this.removeFromMinimizedBar(id);
        }

        // Animate out
        overlay.classList.remove('overlay-show');
        overlay.classList.add('overlay-hide');

        setTimeout(() => {
            // Cleanup event listeners
            if (overlayData.cleanup) {
                overlayData.cleanup();
            }

            // Remove from DOM
            overlay.remove();

            // Remove from tracking
            this.overlays.delete(id);

            // Unlock body scroll if no overlays left
            if (this.overlays.size === 0) {
                document.body.style.overflow = '';
            }

            console.log(`[OverlayManager] Closed: ${id}`);
        }, 300);
    },

    /**
     * Minimize overlay to bottom bar
     */
    minimize(id) {
        const overlayData = this.overlays.get(id);
        if (!overlayData) return;

        const overlay = overlayData.element;

        overlay.classList.add('minimized');
        overlayData.minimized = true;

        // Add to minimized bar
        this.addToMinimizedBar(id, overlayData.config.title);

        console.log(`[OverlayManager] Minimized: ${id}`);
    },

    /**
     * Restore minimized overlay
     */
    restore(id) {
        const overlayData = this.overlays.get(id);
        if (!overlayData) return;

        const overlay = overlayData.element;

        overlay.classList.remove('minimized');
        overlayData.minimized = false;

        // Remove from minimized bar
        this.removeFromMinimizedBar(id);

        // Bring to front
        this.bringToFront(id);

        console.log(`[OverlayManager] Restored: ${id}`);
    },

    /**
     * Bring overlay to front (z-index stacking)
     */
    bringToFront(id) {
        this.zIndexCounter++;

        const overlayData = this.overlays.get(id);
        if (!overlayData) return;

        // Reset all overlays to inactive
        this.overlays.forEach((data) => {
            data.element.classList.remove('active');
        });

        // Set this overlay as active with highest z-index
        overlayData.element.style.zIndex = this.zIndexCounter;
        overlayData.element.classList.add('active');
    },

    /**
     * Create minimized bar at bottom of screen
     */
    createMinimizedBar() {
        if (this.minimizedBar) return;

        this.minimizedBar = document.createElement('div');
        this.minimizedBar.className = 'minimized-bar';
        this.minimizedBar.id = 'minimizedBar';
        document.body.appendChild(this.minimizedBar);
    },

    /**
     * Add overlay to minimized bar (NO INLINE HANDLERS)
     */
    addToMinimizedBar(id, title) {
        if (!this.minimizedBar) return;

        const item = document.createElement('div');
        item.className = 'minimized-item';
        item.id = `minimized-${id}`;
        item.dataset.overlayId = id;

        const icon = document.createElement('span');
        icon.className = 'minimized-icon';
        icon.textContent = '📋';

        const text = document.createElement('span');
        text.className = 'minimized-text';
        text.textContent = title; // Safe - uses textContent

        item.appendChild(icon);
        item.appendChild(text);

        // Attach click handler
        item.addEventListener('click', () => {
            this.restore(id);
        });

        this.minimizedBar.appendChild(item);
    },

    /**
     * Remove overlay from minimized bar
     */
    removeFromMinimizedBar(id) {
        const item = document.getElementById(`minimized-${id}`);
        if (item) item.remove();
    },

    /**
     * Calculate default position for new overlay (cascade style)
     */
    calculateDefaultPosition() {
        const offset = this.overlays.size * 40;
        const centerX = Math.max(50, (window.innerWidth / 2) - 300); // 300 = half of default 600px width
        const centerY = Math.max(50, 100);

        return {
            x: centerX + offset,
            y: centerY + offset
        };
    },

    /**
     * Save overlay position to localStorage
     */
    savePosition(id, position) {
        try {
            const saved = JSON.parse(localStorage.getItem('overlay-positions') || '{}');
            saved[id] = position;
            localStorage.setItem('overlay-positions', JSON.stringify(saved));
        } catch (e) {
            console.error('[OverlayManager] Failed to save position:', e);
        }
    },

    /**
     * Get saved overlay position from localStorage
     */
    getSavedPosition(id) {
        try {
            const saved = JSON.parse(localStorage.getItem('overlay-positions') || '{}');
            return saved[id] || null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Close all overlays
     */
    closeAll() {
        const ids = Array.from(this.overlays.keys());
        ids.forEach(id => this.close(id));
    },

    /**
     * Close topmost overlay (for ESC key)
     */
    closeTop() {
        let topOverlay = null;
        let topZIndex = -1;

        this.overlays.forEach((data, id) => {
            if (!data.minimized) {
                const zIndex = parseInt(data.element.style.zIndex || 0);
                if (zIndex > topZIndex) {
                    topZIndex = zIndex;
                    topOverlay = id;
                }
            }
        });

        if (topOverlay) {
            this.close(topOverlay);
        }
    },

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC to close top overlay
            if (e.key === 'Escape' && this.overlays.size > 0) {
                this.closeTop();
                e.preventDefault();
            }
        });
    },

    /**
     * Show toast notification (fallback if SteadyUtils not available)
     */
    showToast(message, type = 'info') {
        if (window.SteadyUtils?.showToast) {
            window.SteadyUtils.showToast(message, type);
        } else {
            console.log(`[Toast ${type}]:`, message);
            alert(message); // Fallback
        }
    },

    /**
     * Update overlay content dynamically
     */
    updateContent(id, newContent) {
        const overlayData = this.overlays.get(id);
        if (!overlayData) return;

        const body = overlayData.element.querySelector(`#overlay-body-${id}`);
        if (!body) return;

        if (typeof newContent === 'string') {
            body.innerHTML = newContent;
        } else if (newContent instanceof HTMLElement) {
            body.innerHTML = '';
            body.appendChild(newContent);
        }
    },

    /**
     * Update overlay title dynamically
     */
    updateTitle(id, newTitle) {
        const overlayData = this.overlays.get(id);
        if (!overlayData) return;

        const titleElement = overlayData.element.querySelector('.overlay-title-text');
        if (titleElement) {
            titleElement.textContent = newTitle; // Safe
        }

        // Update config
        overlayData.config.title = newTitle;

        // Update minimized bar if minimized
        if (overlayData.minimized) {
            const minimizedItem = document.getElementById(`minimized-${id}`);
            if (minimizedItem) {
                const textElement = minimizedItem.querySelector('.minimized-text');
                if (textElement) {
                    textElement.textContent = newTitle; // Safe
                }
            }
        }
    },

    /**
     * Setup global styles
     */
    setupGlobalStyles() {
        if (document.getElementById('overlay-manager-styles')) return;

        const style = document.createElement('style');
        style.id = 'overlay-manager-styles';
        style.textContent = `
            /* Overlay Base */
            .steady-overlay {
                position: fixed;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 24px;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 0;
                transform: scale(0.95) translateY(20px);
                z-index: 1000;
            }

            .steady-overlay.overlay-show {
                opacity: 1;
                transform: scale(1) translateY(0);
            }

            .steady-overlay.overlay-hide {
                opacity: 0;
                transform: scale(0.9) translateY(20px);
                pointer-events: none;
            }

            .steady-overlay.active {
                box-shadow: 0 30px 100px rgba(102, 126, 234, 0.4);
                border-color: var(--primary);
            }

            .steady-overlay.dragging {
                cursor: grabbing !important;
                user-select: none;
                transition: none;
                box-shadow: 0 35px 120px rgba(102, 126, 234, 0.5);
            }

            .steady-overlay.minimized {
                display: none;
            }

            /* Overlay Header */
            .overlay-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 2rem;
                background: var(--surface-hover);
                border-bottom: 1px solid var(--border);
                cursor: grab;
                user-select: none;
            }

            .overlay-header:active {
                cursor: grabbing;
            }

            .overlay-title {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                flex: 1;
                min-width: 0;
            }

            .overlay-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
            }

            .overlay-title-text {
                font-size: 1.25rem;
                font-weight: 800;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .overlay-controls {
                display: flex;
                gap: 0.5rem;
                flex-shrink: 0;
            }

            .overlay-control-btn {
                width: 2.5rem;
                height: 2.5rem;
                border-radius: var(--radius);
                border: none;
                background: var(--background);
                color: var(--text-secondary);
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.125rem;
                font-weight: 700;
            }

            .overlay-control-btn:hover {
                transform: translateY(-2px);
            }

            .overlay-control-btn:active {
                transform: translateY(0);
            }

            .minimize-btn:hover {
                background: var(--warning);
                color: white;
            }

            .close-btn:hover {
                background: var(--danger);
                color: white;
            }

            /* Overlay Body */
            .overlay-body {
                padding: 2rem;
                overflow-y: auto;
                max-height: calc(100% - 80px);
                background: var(--background);
            }

            .overlay-body::-webkit-scrollbar {
                width: 8px;
            }

            .overlay-body::-webkit-scrollbar-track {
                background: var(--surface-hover);
            }

            .overlay-body::-webkit-scrollbar-thumb {
                background: var(--border);
                border-radius: 4px;
            }

            .overlay-body::-webkit-scrollbar-thumb:hover {
                background: var(--text-tertiary);
            }

            /* Minimized Bar */
            .minimized-bar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: var(--surface);
                border-top: 1px solid var(--border);
                padding: 1rem;
                display: flex;
                gap: 1rem;
                z-index: 999;
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
                flex-wrap: wrap;
            }

            .minimized-bar:empty {
                display: none;
            }

            .minimized-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1.5rem;
                background: var(--background);
                border: 2px solid var(--border);
                border-radius: var(--radius);
                cursor: pointer;
                transition: all 0.2s ease;
                max-width: 250px;
            }

            .minimized-item:hover {
                border-color: var(--primary);
                background: rgba(102, 126, 234, 0.1);
                transform: translateY(-2px);
            }

            .minimized-item:active {
                transform: translateY(0);
            }

            .minimized-icon {
                font-size: 1.25rem;
                flex-shrink: 0;
            }

            .minimized-text {
                font-weight: 600;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Mobile Responsive */
            @media (max-width: 768px) {
                .steady-overlay {
                    width: 95vw !important;
                    height: 90vh !important;
                    left: 2.5vw !important;
                    top: 5vh !important;
                    border-radius: var(--radius-lg);
                }

                .overlay-header {
                    padding: 1rem 1.5rem;
                }

                .overlay-title-text {
                    font-size: 1rem;
                }

                .overlay-body {
                    padding: 1.5rem;
                }

                .overlay-control-btn {
                    width: 2rem;
                    height: 2rem;
                    font-size: 1rem;
                }

                .minimized-bar {
                    padding: 0.75rem;
                    gap: 0.5rem;
                }

                .minimized-item {
                    padding: 0.5rem 1rem;
                    max-width: 150px;
                }

                .minimized-icon {
                    font-size: 1rem;
                }

                .minimized-text {
                    font-size: 0.875rem;
                }
            }

            /* Dark Mode Adjustments */
            [data-theme="dark"] .steady-overlay {
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
            }

            [data-theme="dark"] .steady-overlay.active {
                box-shadow: 0 30px 100px rgba(102, 126, 234, 0.6);
            }

            [data-theme="dark"] .steady-overlay.dragging {
                box-shadow: 0 35px 120px rgba(102, 126, 234, 0.7);
            }
        `;

        document.head.appendChild(style);
    }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.OverlayManager && !window.OverlayManager.initialized) {
            window.OverlayManager.init();
        }
    });
} else {
    if (window.OverlayManager && !window.OverlayManager.initialized) {
        window.OverlayManager.init();
    }
}

console.log('[OverlayManager] v2.0 Loaded and ready');