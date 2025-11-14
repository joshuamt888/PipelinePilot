# CACHE SYSTEM BATTLE PLAN

**Goal:** Implement shared cache across all modules to eliminate redundant API calls and make navigation instant.

---

## CURRENT PROBLEM

Every navigation click reloads ALL data from database:
- Click "Leads" → Fetch all 5000 leads
- Click "Pipeline" → Fetch all 5000 leads AGAIN (same data!)
- Click "Tasks" → Fetch all 5000 tasks
- Go back to "Leads" → Fetch all 5000 leads AGAIN

**Result:** Tons of unnecessary database queries, slower UX, wasted bandwidth.

---

## THE SOLUTION: SHARED CACHE

Create a global cache that all modules share:

```javascript
window.AppCache = {
    leads: { data: null, lastFetch: null },
    tasks: { data: null, lastFetch: null },
    goals: { data: null, lastFetch: null },
    estimates: { data: null, lastFetch: null },
    jobs: { data: null, lastFetch: null },
    clients: { data: null, lastFetch: null }
};
```

**How it works:**
1. Module needs data → Check cache first
2. Cache hit (fresh) → Use cached data (instant!)
3. Cache miss or stale → Fetch from API, update cache
4. Update operation → Update cache + API call
5. All modules automatically see the update

---

## IMPLEMENTATION STEPS

### Phase 1: Create Cache Module (30 min)

**File:** `/public/dashboard/shared/js/cache.js`

**Features:**
- `get(key)` - Get cached data if fresh
- `set(key, data)` - Store data with timestamp
- `invalidate(key)` - Force refresh on next get
- `update(key, updateFn)` - Update specific items in cache
- `clear()` - Clear all cache (logout/errors)
- Configurable TTL (time to live) per data type

**TTL Strategy:**
- Leads: 5 minutes (changes frequently)
- Tasks: 5 minutes (changes frequently)
- Goals: 10 minutes (changes less often)
- Estimates: 10 minutes (changes less often)
- Jobs: 10 minutes (changes less often)
- Clients: 15 minutes (rarely changes)

**Example Implementation:**
```javascript
window.AppCache = {
    _cache: {},
    _ttl: {
        leads: 300000,    // 5 min
        tasks: 300000,    // 5 min
        goals: 600000,    // 10 min
        estimates: 600000,
        jobs: 600000,
        clients: 900000   // 15 min
    },

    get(key) {
        const cached = this._cache[key];
        if (!cached) return null;

        const age = Date.now() - cached.lastFetch;
        const ttl = this._ttl[key] || 300000;

        if (age < ttl) {
            console.log(`[Cache HIT] ${key} (age: ${Math.round(age/1000)}s)`);
            return cached.data;
        }

        console.log(`[Cache STALE] ${key} (age: ${Math.round(age/1000)}s)`);
        return null;
    },

    set(key, data) {
        console.log(`[Cache SET] ${key} (${data?.length || 0} items)`);
        this._cache[key] = {
            data,
            lastFetch: Date.now()
        };
    },

    update(key, updateFn) {
        const cached = this._cache[key];
        if (!cached) return;

        cached.data = updateFn(cached.data);
        cached.lastFetch = Date.now();
        console.log(`[Cache UPDATE] ${key}`);
    },

    invalidate(key) {
        console.log(`[Cache INVALIDATE] ${key}`);
        delete this._cache[key];
    },

    clear() {
        console.log('[Cache CLEAR] All data cleared');
        this._cache = {};
    }
};
```

---

### Phase 2: Update API.js (1 hour)

**File:** `/public/dashboard/shared/js/api.js`

**Changes:**

#### Read Operations (use cache):
```javascript
// BEFORE:
async getLeads() {
    const { data, error } = await this.supabase
        .from('leads')
        .select('*');
    return data;
}

// AFTER:
async getLeads(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
        const cached = AppCache.get('leads');
        if (cached) return cached;
    }

    // Cache miss - fetch from DB
    const { data, error } = await this.supabase
        .from('leads')
        .select('*');

    // Store in cache
    if (data) AppCache.set('leads', data);

    return data;
}
```

#### Write Operations (update cache):
```javascript
// BEFORE:
async updateLead(leadId, updates) {
    const { data, error } = await this.supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);
    return data;
}

// AFTER:
async updateLead(leadId, updates) {
    const { data, error } = await this.supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

    // Update cache
    AppCache.update('leads', (leads) =>
        leads.map(l => l.id === leadId ? { ...l, ...updates } : l)
    );

    return data;
}
```

#### Create Operations (add to cache):
```javascript
async createLead(leadData) {
    const { data, error } = await this.supabase
        .from('leads')
        .insert([leadData])
        .select();

    // Add to cache
    AppCache.update('leads', (leads) => [data[0], ...leads]);

    return data[0];
}
```

#### Delete Operations (remove from cache):
```javascript
async deleteLead(leadId) {
    const { error } = await this.supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

    // Remove from cache
    AppCache.update('leads', (leads) =>
        leads.filter(l => l.id !== leadId)
    );
}
```

**Apply to all API methods:**
- `getLeads()`, `getTasks()`, `getGoals()`, `getEstimates()`, `getJobs()`, `getClients()`
- `updateLead()`, `updateTask()`, etc.
- `createLead()`, `createTask()`, etc.
- `deleteLead()`, `deleteTask()`, etc.
- All batch operations

---

### Phase 3: Update Module Init Functions (2 hours)

**Pattern for all modules:**

#### BEFORE:
```javascript
async init() {
    // Always fetch from database
    this.state.leads = await API.getLeads();
    this.render();
}
```

#### AFTER:
```javascript
async init(forceRefresh = false) {
    // Try cache first (unless force refresh)
    this.state.leads = await API.getLeads(forceRefresh);
    this.render();
}
```

**Modules to update:**
- ✅ Dashboard.js - Uses leads/tasks/goals stats
- ✅ Leads.js - Main lead data
- ✅ Pipeline.js - Uses leads data (same as Leads.js)
- ✅ Scheduling.js - Main task data
- ✅ Goals.js - Goal data + linked tasks
- ✅ Estimates.js - Estimate data
- ✅ Jobs.js - Job data + clients
- ✅ Clients.js (inside Jobs Hub) - Client data
- ✅ Settings.js - User profile (could cache too)

**Key Changes:**
1. Check cache before API call
2. Accept `forceRefresh` parameter
3. Pass `forceRefresh` through to API calls

---

### Phase 4: Add Refresh Buttons (30 min)

Add manual refresh option to each module header:

```html
<button class="refresh-btn" onclick="ModuleName.refresh()">
    <i data-lucide="refresh-cw"></i>
    Refresh
</button>
```

```javascript
async refresh() {
    // Invalidate cache and reload
    AppCache.invalidate('leads');
    await this.init(true);
    this.showNotification('Data refreshed', 'success');
}
```

---

### Phase 5: Cache Invalidation Strategy (30 min)

**Auto-invalidate cache when:**
1. User logs out → `AppCache.clear()`
2. API error 401/403 → `AppCache.clear()` (session expired)
3. Subscription change → `AppCache.invalidate('leads')` etc.
4. Tier limit hit → Invalidate relevant cache

**Manual invalidate on:**
- Settings change (name, email, profile)
- Subscription upgrade/downgrade
- Import operations (bulk lead import)

---

### Phase 6: Navigation Optimization (1 hour)

**File:** `/public/dashboard/index.html`

#### BEFORE:
```javascript
async function loadModule(pageName) {
    const module = modules[pageName];
    // Always reload to get fresh data
    await module.init(`${pageName}-content`);
}
```

#### AFTER:
```javascript
async function loadModule(pageName, forceRefresh = false) {
    const module = modules[pageName];

    // Check if already loaded with cached data
    if (!forceRefresh && appState.loadedModules.has(pageName)) {
        console.log(`📦 ${pageName} using cached data`);
        await module.init(`${pageName}-content`, false);
    } else {
        console.log(`📦 ${pageName} loading fresh data`);
        await module.init(`${pageName}-content`, true);
        appState.loadedModules.add(pageName);
    }
}
```

**Result:** First click loads data, subsequent clicks use cache (instant!).

---

## CROSS-MODULE CACHE SYNC

**Problem:** User edits lead in Leads module → Pipeline module cache is stale

**Solution:** Cache is shared, updates propagate automatically!

**Example Flow:**
1. User in **Leads module** → Loads 5000 leads → `AppCache.set('leads', data)`
2. User edits lead → API call + `AppCache.update('leads', ...)`
3. User switches to **Pipeline module** → `AppCache.get('leads')` returns updated data
4. No API call needed, sees the edit instantly

**All modules read from same cache, so they're always in sync!**

---

## PERFORMANCE GAINS

### Before Cache:
- Click "Leads" → 500ms API call
- Click "Pipeline" → 500ms API call (same data!)
- Click "Tasks" → 400ms API call
- Back to "Leads" → 500ms API call AGAIN
- **Total:** 1900ms of waiting

### After Cache:
- Click "Leads" → 500ms API call (initial load)
- Click "Pipeline" → **0ms** (cache hit!)
- Click "Tasks" → 400ms API call (initial load)
- Back to "Leads" → **0ms** (cache hit!)
- **Total:** 900ms of waiting (52% faster!)

**Additional benefits:**
- Less database load (fewer queries)
- Less bandwidth usage
- Better offline support (stale data > no data)
- Instant navigation between modules

---

## EDGE CASES TO HANDLE

1. **Multiple tabs open:**
   - Cache is per-tab (window.AppCache)
   - Consider localStorage sync for cross-tab cache
   - Or just accept separate caches per tab

2. **Cache invalidation race conditions:**
   - Update operation might finish before cache updates
   - Solution: Optimistic updates handle this already

3. **Memory usage:**
   - 5000 leads × 1KB each = ~5MB in memory
   - This is fine for modern browsers
   - Consider LRU eviction if it grows huge

4. **Stale data after long idle:**
   - TTL handles this (cache expires after X minutes)
   - User can manually refresh if needed

5. **API errors:**
   - Don't cache error responses
   - Keep old cached data on error (better than nothing)

---

## TESTING CHECKLIST

- [ ] Load leads → Check cache is populated
- [ ] Switch to pipeline → Verify no API call (cache hit)
- [ ] Edit lead → Verify cache updates
- [ ] Switch back to leads → Verify edit shows up
- [ ] Wait 5+ minutes → Verify cache expires and refetches
- [ ] Delete lead → Verify removed from cache
- [ ] Create lead → Verify added to cache
- [ ] Batch operations → Verify cache updates all items
- [ ] Logout → Verify cache clears
- [ ] API error → Verify old cache data persists
- [ ] Manual refresh → Verify forces new fetch

---

## ROLLOUT PLAN

### Step 1: Create cache.js (commit)
- Add shared cache module
- Test get/set/update/invalidate
- Verify TTL logic

### Step 2: Update API.js for leads only (commit)
- Add cache to `getLeads()`, `updateLead()`, `createLead()`, `deleteLead()`
- Test with Leads module
- Verify cache updates work

### Step 3: Update Leads + Pipeline modules (commit)
- Add cache support to both
- Test navigation between them
- Verify no duplicate API calls

### Step 4: Expand to Tasks + Scheduling (commit)
- Add cache to tasks API methods
- Update Scheduling module
- Test task operations

### Step 5: Expand to remaining modules (commit)
- Goals, Estimates, Jobs, Clients
- Add refresh buttons
- Full system test

### Step 6: Navigation optimization (commit)
- Update index.html routing
- Add force refresh option
- Test all navigation paths

---

## CODE STRUCTURE

```
public/dashboard/
├── shared/js/
│   ├── cache.js          ← NEW: Shared cache module
│   ├── api.js            ← UPDATE: Add cache support
│   ├── supabase.js       ← No changes
│   └── utils.js          ← No changes
├── scripts/
│   ├── Dashboard.js      ← UPDATE: Use cache
│   ├── Leads.js          ← UPDATE: Use cache
│   ├── Pipeline.js       ← UPDATE: Use cache
│   ├── Scheduling.js     ← UPDATE: Use cache
│   ├── Goals.js          ← UPDATE: Use cache
│   ├── Estimates.js      ← UPDATE: Use cache
│   ├── JobsManagement.js ← UPDATE: Use cache
│   └── Clients.js        ← UPDATE: Use cache
└── index.html            ← UPDATE: Navigation logic
```

---

## ESTIMATED TIME

- Phase 1 (Cache module): 30 minutes
- Phase 2 (API.js updates): 1 hour
- Phase 3 (Module updates): 2 hours
- Phase 4 (Refresh buttons): 30 minutes
- Phase 5 (Invalidation): 30 minutes
- Phase 6 (Navigation): 1 hour
- Testing: 1 hour
- **Total: ~6.5 hours**

---

## PRIORITY

**HIGH** - This will significantly improve UX and reduce database load.

Should be done after current optimistic UI refactors are complete.

---

## NOTES

- This is industry-standard practice (Redux, Vuex, Apollo all do this)
- Keep cache simple - don't over-engineer
- TTL handles most staleness issues
- Manual refresh gives user control
- Optimistic updates + cache = buttery smooth UX

**This is the right approach. Let's do it after we finish the optimistic UI refactors.**
