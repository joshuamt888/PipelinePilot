/**
 * SHARED CACHE MODULE
 *
 * Global cache that all modules share to eliminate redundant API calls.
 *
 * Features:
 * - get(key) - Get cached data if fresh
 * - set(key, data) - Store data with timestamp
 * - invalidate(key) - Force refresh on next get
 * - update(key, updateFn) - Update specific items in cache
 * - clear() - Clear all cache (logout/errors)
 * - Configurable TTL per data type
 */

window.AppCache = {
    _cache: {},

    // Time-to-live (TTL) in milliseconds
    _ttl: {
        leads: 300000,      // 5 min - changes frequently
        tasks: 300000,      // 5 min - changes frequently
        goals: 600000,      // 10 min - changes less often
        estimates: 600000,  // 10 min - changes less often
        jobs: 600000,       // 10 min - changes less often
        clients: 900000     // 15 min - rarely changes
    },

    /**
     * Get cached data if fresh, null if stale or missing
     */
    get(key) {
        const cached = this._cache[key];
        if (!cached) return null;

        const age = Date.now() - cached.lastFetch;
        const ttl = this._ttl[key] || 300000; // Default 5 min

        if (age < ttl) {
            console.log(`[Cache HIT] ${key} (age: ${Math.round(age/1000)}s)`);
            return cached.data;
        }

        console.log(`[Cache STALE] ${key} (age: ${Math.round(age/1000)}s, ttl: ${Math.round(ttl/1000)}s)`);
        return null;
    },

    /**
     * Store data in cache with timestamp
     */
    set(key, data) {
        console.log(`[Cache SET] ${key} (${data?.length || 0} items)`);
        this._cache[key] = {
            data,
            lastFetch: Date.now()
        };
    },

    /**
     * Update specific items in cache using update function
     * updateFn receives current data and should return updated data
     */
    update(key, updateFn) {
        const cached = this._cache[key];
        if (!cached) {
            console.log(`[Cache UPDATE] ${key} - no cache found, skipping`);
            return;
        }

        cached.data = updateFn(cached.data);
        cached.lastFetch = Date.now(); // Refresh timestamp
        console.log(`[Cache UPDATE] ${key} (${cached.data?.length || 0} items)`);
    },

    /**
     * Invalidate specific cache key
     */
    invalidate(key) {
        console.log(`[Cache INVALIDATE] ${key}`);
        delete this._cache[key];
    },

    /**
     * Clear all cache (use on logout, session errors)
     */
    clear() {
        console.log('[Cache CLEAR] All data cleared');
        this._cache = {};
    },

    /**
     * Get cache stats for debugging
     */
    getStats() {
        const stats = {};
        Object.keys(this._cache).forEach(key => {
            const cache = this._cache[key];
            const age = Date.now() - cache.lastFetch;
            const ttl = this._ttl[key] || 300000;
            const isStale = age >= ttl;

            stats[key] = {
                items: cache.data?.length || 0,
                age: Math.round(age / 1000),
                ttl: Math.round(ttl / 1000),
                isStale
            };
        });
        return stats;
    }
};

console.log('[Cache] Module loaded');
