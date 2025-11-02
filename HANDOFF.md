# 🎯 STEADYMANAGER PRO - TECHNICAL HANDOFF v9.0
**"GROUND ZERO REBUILD EDITION"**

**Status:** Fresh Architecture | Simple Windowing | Ready to Build
**Philosophy:** Manual CRM + Smart Visualization + Simple Multi-Tasking

---

## 🏗️ SYSTEM STATUS

### Backend
- **Status:** LIVE ✅
- **Stack:** Supabase PostgreSQL + RLS | Node.js on Railway | Supabase Auth
- **Cron:** Daily 2AM trial expiration check
- **Uptime:** 100%

### Database
- **Status:** OPTIMIZED ✅
- **Indexes:** 20+ performance indexes installed
- **Triggers:** 8 auto-tracking triggers active
- **Functions:** 4 server-side functions (duplicates, batch ops, goal tracking)
- **Extensions:** pg_trgm enabled for fuzzy search

### Authentication
- **Status:** COMPLETE ✅
- **Flows:** Register → Email Verify → Login | Password Reset | ToS Required
- **Security:** XSS Protected | RLS Enabled | No Account Enumeration | CSP Headers

### Frontend

#### Free Tier
- **Status:** PRODUCTION READY ✅
- **Lead Limit:** 50
- **Modules:** Dashboard, AddLead, Pipeline, Scheduling, Settings
- **Architecture:** CSS embedded in each module JS file
- **Bugs:** None

#### Professional Tier
- **Status:** BUILDING FROM FREE TIER COPY 🔨
- **Lead Limit:** 5000
- **Modules Copied from Free:** Dashboard, AddLead, Pipeline, Scheduling, Settings
- **New Modules (Not Built):** Jobs, Goals
- **Architecture:** Same as free tier - CSS embedded in each module

**Current State:**
- ✅ Free tier modules copied to pro tier with same names
- ✅ CSS is embedded in each module (NO central CSS file)
- ❌ Windowing system not built yet (building from scratch)
- ❌ Jobs module not built
- ❌ Goals module not built
- ❌ Settings Preferences tab not built

---

## 📂 FILE STRUCTURE

```
/steadymanager
├── server.js                          ✅ Node.js + Stripe + Cron
├── .env                               ✅ Secrets (NEVER commit)
│
├── /public
│   ├── /auth                          ✅ ALL COMPLETE
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── callback.html
│   │   ├── forgot-password.html
│   │   ├── reset-password.html
│   │   └── resend-verification.html
│   │
│   └── /dashboard
│       ├── index.html                 ✅ Router (tier detection)
│       │
│       ├── /shared
│       │   └── /js
│       │       ├── supabase.js        ✅ Client
│       │       ├── api.js             ✅ v4.0 - 1000 lines
│       │       └── utils.js           ✅ Toast, validation
│       │
│       └── /tiers
│           ├── /free                  ✅ PRODUCTION READY
│           │   ├── index.html
│           │   └── /scripts
│           │       ├── Dashboard.js   ✅ CSS embedded
│           │       ├── AddLead.js     ✅ CSS embedded
│           │       ├── Pipeline.js    ✅ CSS embedded
│           │       ├── Scheduling.js  ✅ CSS embedded
│           │       └── Settings.js    ✅ CSS embedded
│           │
│           └── /professional          🔨 IN DEVELOPMENT
│               ├── index.html         ✅ Loads modules
│               └── /scripts
│                   ├── Shell.js       ✅ Navigation manager
│                   ├── Dashboard.js   ✅ CSS embedded (copied from free)
│                   ├── AddLead.js     ✅ CSS embedded (copied from free)
│                   ├── Pipeline.js    ✅ CSS embedded (copied from free)
│                   ├── Scheduling.js  ✅ CSS embedded (copied from free)
│                   ├── Settings.js    ✅ CSS embedded (copied from free)
│                   ├── Jobs.js        ❌ NOT BUILT
│                   └── Goals.js       ❌ NOT BUILT
```

**Key Architecture Notes:**
- ✅ Each module is self-contained with CSS embedded in JS
- ✅ Pro tier uses SAME module names as free tier (Dashboard, AddLead, Pipeline, Scheduling, Settings)
- ✅ Pro tier has 2 NEW modules: Jobs, Goals
- ❌ NO central CSS file (SteadyManager.css doesn't exist anymore)
- ❌ NO OverlayManager.js (scrapped, rebuilding simple)
- ❌ NO OverlayComponents.js (scrapped, rebuilding simple)

---

## 🗄️ DATABASE SCHEMA

### `users`
**Purpose:** Core user profile + tier management
**Status:** ✅ PRODUCTION
```sql
id                      UUID PRIMARY KEY (references auth.users.id)
email                   TEXT NOT NULL
user_type               TEXT CHECK IN ('free', 'professional', 'professional_trial')
current_lead_limit      INT4
current_leads           INT4
trial_start_date        TIMESTAMPTZ
trial_end_date          TIMESTAMPTZ
stripe_customer_id      TEXT
stripe_subscription_id  TEXT
subscription_status     TEXT
settings                JSONB
goals                   JSONB
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
tos_accepted_at         TIMESTAMPTZ
tos_version             TEXT
privacy_accepted_at     TIMESTAMPTZ
preferences             JSONB
last_active_at          TIMESTAMPTZ (v4.0 - NEW)
onboarding_completed    BOOL (v4.0 - NEW)
```
**RLS:** ✅ users.id = auth.uid()
**Indexes:** subscription_status, user_type, trial_end_date

---

### `leads`
**Purpose:** Lead management with pro features
**Status:** ✅ PRODUCTION
```sql
-- Core Fields
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id) ON DELETE CASCADE
name                TEXT NOT NULL
email               TEXT
phone               TEXT
company             TEXT
job_title           TEXT
website             TEXT
status              TEXT
type                TEXT
source              TEXT
platform            TEXT
notes               TEXT
quality_score       INT4

-- Financial
potential_value     NUMERIC
deal_value_actual   NUMERIC (v4.0 - NEW)

-- Dates
follow_up_date      DATE
last_contact_date   DATE
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
lost_reason         TEXT
archived_at         TIMESTAMPTZ (v4.0 - NEW)

-- Pro Features
position            TEXT
department          TEXT
deal_stage          TEXT
next_action         TEXT
win_probability     INT4

-- Social Links
linkedin_url        TEXT
facebook_url        TEXT
twitter_url         TEXT
instagram_url       TEXT

-- Tags
tags                TEXT[] (array)
```
**RLS:** ✅ leads.user_id = auth.uid()
**Indexes:** user_id+status, user_id+created_at, user_id+updated_at, quality_score, follow_up_date, tags (GIN), name (trigram), email (trigram), company (trigram)

---

### `goals`
**Purpose:** Goal tracking and progress monitoring
**Status:** ✅ PRODUCTION (No UI yet)
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id) ON DELETE CASCADE
title           TEXT NOT NULL
description     TEXT
goal_type       TEXT NOT NULL
target_value    NUMERIC
current_value   NUMERIC
unit            TEXT
period          TEXT NOT NULL
start_date      DATE NOT NULL
end_date        DATE NOT NULL
status          TEXT
is_recurring    BOOL
auto_track      BOOL (v4.0 - AUTO-UPDATES VIA TRIGGERS)
remind_at       INT4
color           TEXT
icon            TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```
**RLS:** ✅ goals.user_id = auth.uid()
**Indexes:** user_id+status (active only), start_date+end_date, goal_type
**Triggers:** ✅ Auto-tracks progress when leads/jobs created

---

### `jobs`
**Purpose:** Job/project financial tracking
**Status:** ✅ PRODUCTION (No UI yet)
```sql
id                UUID PRIMARY KEY
user_id           UUID REFERENCES users(id) ON DELETE CASCADE
lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL
title             TEXT NOT NULL
description       TEXT
job_type          TEXT
status            TEXT
priority          TEXT
scheduled_date    DATE
scheduled_time    TIME
duration_hours    NUMERIC
completed_at      TIMESTAMPTZ

-- Financial (Manual Inputs)
material_cost     NUMERIC
labor_hours       NUMERIC
labor_rate        NUMERIC
other_expenses    NUMERIC

-- Financial (Auto-Calculated)
total_cost        NUMERIC (generated column)
quoted_price      NUMERIC
final_price       NUMERIC
profit            NUMERIC (generated column)
profit_margin     NUMERIC (generated column)

-- Additional
materials         JSONB
notes             TEXT
location          TEXT
invoice_number    TEXT
payment_status    TEXT
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```
**Generated Column Logic:**
- `total_cost = material_cost + (labor_hours * labor_rate) + other_expenses`
- `profit = COALESCE(final_price, quoted_price) - total_cost`
- `profit_margin = (profit / COALESCE(final_price, quoted_price)) * 100`

**RLS:** ✅ jobs.user_id = auth.uid()
**Indexes:** user_id+status, user_id+scheduled_date, payment_status, lead_id
**Triggers:** ✅ Auto-updates revenue goals when job completed

---

### `tasks`
**Purpose:** Task management and scheduling
**Status:** ✅ PRODUCTION
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id) ON DELETE CASCADE
lead_id             UUID REFERENCES leads(id) ON DELETE SET NULL
title               TEXT NOT NULL
description         TEXT
due_date            DATE
due_time            TIME
task_type           TEXT
priority            TEXT
status              TEXT
completed_at        TIMESTAMPTZ
completion_notes    TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```
**RLS:** ✅ tasks.user_id = auth.uid()
**Indexes:** user_id+status, user_id+due_date, lead_id, user_id+created_at

---

## 🔌 API REFERENCE

**Location:** `/dashboard/shared/js/api.js`
**Version:** 4.0 ⚡ UPGRADED
**Size:** ~1000 lines

**NEW IN v4.0:**
- ✅ Server-side duplicate detection (20x faster)
- ✅ Batch operations (update/delete multiple at once)
- ✅ Full schema field coverage (all columns exposed)
- ✅ Enhanced error handling (15+ specific messages)
- ✅ Goal auto-tracking support (requires DB triggers)
- ✅ Performance optimizations (indexes + functions)

---

### Auth
```javascript
API.login(email, password)
API.logout()
API.register(email, password)
API.checkAuth()
API.resetPassword(email)
API.updatePassword(newPassword)
API.upgradeToTrial()              // 14-day pro trial
API.acceptTos(version)
API.checkTosAcceptance()
```

### User
```javascript
API.getProfile()
API.updateProfile(updates)
API.updateSettings(settings)
API.getPreferences()              // windowing, theme, default_view
API.updatePreferences(prefs)
API.toggleFeature(name, enabled)  // toggle windowing/theme
API.getUserSubscriptionInfo()     // tier, limits, etc
```

### Leads
```javascript
// Basic CRUD
API.getLeads()                    // returns {cold, warm, all}
API.createLead(data)
API.updateLead(id, updates)
API.deleteLead(id)
API.getLeadById(id)
API.searchLeads(query)            // FAST - uses trigram indexes

// Duplicate Detection (v4.0 - Server-side, 20x faster)
API.checkDuplicates(data)         // Runs in database, not browser

// Batch Operations (v4.0 - NEW)
API.batchUpdateLeads(ids, updates)
API.batchDeleteLeads(ids)
API.archiveLeads(ids)             // soft delete
API.unarchiveLeads(ids)

// Pro Features
API.addLeadTags(id, tags)
API.removeLeadTag(id, tag)
API.setWinProbability(id, prob)
API.setNextAction(id, action)
API.updateLeadSocials(id, socials)
API.updateLeadJobInfo(id, title, dept, pos)
API.setLeadFollowUpDate(id, date)
API.markLeadLost(id, reason)
API.updateLeadWebsite(id, url)
API.updateLeadPlatform(id, platform)

// Helpers
API.getLeadsByType(type)
API.getLeadsByStatus(status)
API.updateLeadStatus(id, status, notes)
API.getRecentLeads(limit)
```

### Tasks
```javascript
// Basic CRUD
API.getTasks(filters)
API.createTask(data)
API.updateTask(id, updates)
API.deleteTask(id)
API.completeTask(id, notes)

// Batch Operations (v4.0 - NEW)
API.batchUpdateTasks(ids, updates)
API.batchDeleteTasks(ids)
API.batchCompleteTasks(ids, notes)
API.deleteCompletedTasks()        // cleanup all completed

// Helpers
API.createFollowUpTask(leadId, name, date, time, notes)
API.getTodaysTasks()
API.getOverdueTasks()
API.getUpcomingWeek()
```

### Jobs
**Status:** ✅ READY, NO UI CALLING IT
```javascript
// Basic CRUD
API.getJobs(filters)
API.createJob(data)
API.updateJob(id, updates)
API.deleteJob(id)
API.completeJob(id, finalPrice, hours, materials)

// Stats & Analysis
API.getJobStats()                 // total revenue, profit, margin
API.getJobProfitability()         // sorted by profit
API.getJobsByLead(leadId)
API.getScheduledJobs(startDate, endDate)

// Full Schema Coverage (v4.0 - NEW)
API.updateJobLocation(id, location)
API.updateJobInvoice(id, invoiceNum, paymentStatus)
API.getJobsByPaymentStatus(status)
```

### Goals
**Status:** ✅ READY, NO UI CALLING IT
```javascript
// Basic CRUD
API.getGoals(status)
API.createGoal(data)
API.updateGoal(id, updates)
API.deleteGoal(id)

// Progress Tracking
API.updateGoalProgress(id, value) // manual update
API.getGoalProgress()             // all goals with % complete
API.checkGoalCompletion()         // auto-complete if target hit

// Auto-Tracking (v4.0 - NEW, requires triggers)
API.refreshGoalProgress()         // recalculate all goals

// Full Schema Coverage (v4.0 - NEW)
API.updateGoalReminder(id, remindAt)
API.updateGoalAppearance(id, color, icon)
API.toggleGoalRecurring(id, isRecurring)
API.getRecurringGoals()
```

### Stats
```javascript
API.getBasicStats()               // leads, tasks, values
API.getCurrentStats()             // capacity, limits
API.getDetailedStats()            // combined view
```

### Utilities
```javascript
API.escapeHtml(text)              // XSS protection
API.isValidEmail(email)           // regex validation
API.formatDate(date)              // user-friendly format
API.formatDateTime(datetime)      // includes time
API.calculateDaysUntil(date)      // countdown helper
API.getStatusColor(status)        // color codes
API.getTypeIcon(type)             // emoji icons
API.getPriorityColor(priority)    // color codes
API.handleAPIError(error, ctx)    // enhanced error messages
```

---

## 🪟 SIMPLE WINDOWING SYSTEM (Ground Zero)

### Philosophy
**NO fancy manager classes. Just CSS + simple JavaScript.**

When user enables windowing:
- Modals become draggable windows
- Multiple windows can stack
- Each window has close/minimize buttons

When user disables windowing:
- Modals are full-screen (standard behavior)
- One modal at a time
- Click outside to close

---

### Implementation Pattern

**Each module creates modals the same way:**

```javascript
// In any module (Dashboard, Pipeline, etc):
async function showModal(title, content) {
  const prefs = await API.getPreferences();

  const modal = document.createElement('div');

  if (prefs.windowing_enabled) {
    // Windowing mode: draggable window
    modal.className = 'modal-window';
    modal.style.position = 'absolute';
    modal.style.top = `${100 + (windowCount * 30)}px`;  // cascade
    modal.style.left = `${200 + (windowCount * 30)}px`;
    modal.style.zIndex = 1000 + windowCount;

  } else {
    // Normal mode: full-screen modal
    modal.className = 'modal-fullscreen';
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">
      ${content}
    </div>
  `;

  document.body.appendChild(modal);

  // Setup drag if windowing enabled
  if (prefs.windowing_enabled) {
    makeWindowDraggable(modal);
  }

  // Close button
  modal.querySelector('.modal-close').onclick = () => modal.remove();

  windowCount++;
}
```

---

### CSS Structure

**Each module embeds this CSS:**

```css
/* Windowing Mode */
.modal-window {
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-window .modal-header {
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move; /* indicates draggable */
}

.modal-window .modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

/* Full-Screen Mode */
.modal-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-fullscreen > div {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Shared Styles */
.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #000;
}
```

---

### Drag Functionality

**Simple drag helper (add to utils.js):**

```javascript
function makeWindowDraggable(windowElement) {
  const header = windowElement.querySelector('.modal-header');

  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target.closest('.modal-close')) return; // don't drag when clicking close

    initialX = e.clientX - windowElement.offsetLeft;
    initialY = e.clientY - windowElement.offsetTop;
    isDragging = true;
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    windowElement.style.left = currentX + 'px';
    windowElement.style.top = currentY + 'px';
  }

  function dragEnd() {
    isDragging = false;
  }
}

// Export for modules to use
window.makeWindowDraggable = makeWindowDraggable;
```

---

## ⚙️ SETTINGS MODULE - PREFERENCES TAB

### What We're Building

**Settings module gets a new tab: Preferences**

```
Settings Tabs:
1. [Account]       ← exists (email, password)
2. [Preferences]   ← NEW
3. [Subscription]  ← exists (upgrade, trial info)
```

---

### Preferences Tab Content

```javascript
// Settings.js - Add this to the render function

renderPreferencesTab() {
  return `
    <div class="preferences-tab">
      <h2>Preferences</h2>

      <div class="pref-section">
        <h3>Appearance</h3>

        <div class="pref-item">
          <label>Theme</label>
          <div class="theme-toggle">
            <button class="theme-option ${this.state.preferences.theme === 'light' ? 'active' : ''}"
                    data-theme="light">
              ☀️ Light
            </button>
            <button class="theme-option ${this.state.preferences.theme === 'dark' ? 'active' : ''}"
                    data-theme="dark">
              🌙 Dark
            </button>
          </div>
        </div>
      </div>

      <div class="pref-section">
        <h3>Navigation</h3>

        <div class="pref-item">
          <label>Default view on login</label>
          <select id="default-view-select">
            <option value="dashboard" ${this.state.preferences.default_view === 'dashboard' ? 'selected' : ''}>
              Dashboard
            </option>
            <option value="pipeline" ${this.state.preferences.default_view === 'pipeline' ? 'selected' : ''}>
              Pipeline
            </option>
            <option value="scheduling" ${this.state.preferences.default_view === 'scheduling' ? 'selected' : ''}>
              Tasks
            </option>
            <option value="jobs" ${this.state.preferences.default_view === 'jobs' ? 'selected' : ''}>
              Jobs
            </option>
            <option value="goals" ${this.state.preferences.default_view === 'goals' ? 'selected' : ''}>
              Goals
            </option>
          </select>
        </div>
      </div>

      <div class="pref-section">
        <h3>Features</h3>

        <div class="pref-item">
          <label class="checkbox-label">
            <input type="checkbox"
                   id="windowing-toggle"
                   ${this.state.preferences.windowing_enabled ? 'checked' : ''}>
            <span>Enable windowing system</span>
          </label>
          <p class="pref-description">
            When enabled, modals become draggable windows that can stack.
          </p>
        </div>
      </div>

      <button class="btn-primary" id="save-preferences-btn">
        Save Preferences
      </button>
    </div>
  `;
}
```

---

### Event Handlers

```javascript
// Settings.js - Add event handlers

setupPreferencesEvents() {
  // Theme toggle
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const theme = e.target.dataset.theme;
      this.state.preferences.theme = theme;

      // Update UI
      document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      // Apply theme immediately
      document.body.dataset.theme = theme;
    });
  });

  // Default view select
  document.getElementById('default-view-select').addEventListener('change', (e) => {
    this.state.preferences.default_view = e.target.value;
  });

  // Windowing toggle
  document.getElementById('windowing-toggle').addEventListener('change', (e) => {
    this.state.preferences.windowing_enabled = e.target.checked;
  });

  // Save button
  document.getElementById('save-preferences-btn').addEventListener('click', async () => {
    try {
      await API.updatePreferences(this.state.preferences);
      toast('Preferences saved!', 'success');
    } catch (error) {
      toast('Failed to save preferences', 'error');
      console.error(error);
    }
  });
}
```

---

### How index.html Uses Preferences

```javascript
// /tiers/professional/index.html
// On page load:

async function loadUserPreferences() {
  try {
    const prefs = await API.getPreferences();

    // Apply theme
    document.body.dataset.theme = prefs.theme || 'light';

    // Load default view
    const defaultView = prefs.default_view || 'dashboard';
    Shell.loadModule(defaultView);

    // Store windowing preference globally
    window.windowingEnabled = prefs.windowing_enabled || false;

  } catch (error) {
    console.error('Failed to load preferences:', error);
    Shell.loadModule('dashboard'); // fallback
  }
}

// Call on page load
loadUserPreferences();
```

---

### CSS for Preferences Tab

```css
/* Preferences Tab Styles (embed in Settings.js) */

.preferences-tab {
  max-width: 600px;
  padding: 20px;
}

.pref-section {
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid #e0e0e0;
}

.pref-section:last-of-type {
  border-bottom: none;
}

.pref-section h3 {
  margin-bottom: 16px;
  color: #333;
}

.pref-item {
  margin-bottom: 20px;
}

.pref-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.theme-toggle {
  display: flex;
  gap: 10px;
}

.theme-option {
  flex: 1;
  padding: 12px 20px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.theme-option:hover {
  border-color: #0066cc;
}

.theme-option.active {
  border-color: #0066cc;
  background: #e6f2ff;
  color: #0066cc;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.pref-description {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

#default-view-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
}

/* Dark theme support */
body[data-theme="dark"] .preferences-tab {
  color: #e0e0e0;
}

body[data-theme="dark"] .pref-section {
  border-bottom-color: #444;
}

body[data-theme="dark"] .pref-section h3 {
  color: #fff;
}

body[data-theme="dark"] .pref-item label {
  color: #ccc;
}

body[data-theme="dark"] .theme-option {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

body[data-theme="dark"] .theme-option.active {
  background: #1a3a5a;
  border-color: #4a9eff;
  color: #4a9eff;
}

body[data-theme="dark"] #default-view-select {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

body[data-theme="dark"] .pref-description {
  color: #999;
}
```

---

## 🎯 BUILD PLAN

### Phase 1: Settings Preferences Tab ⚡ START HERE
**Priority:** HIGHEST 🔥
**Time:** 2-3 hours

**Tasks:**
1. ✅ Open `/tiers/professional/scripts/Settings.js`
2. ✅ Add `renderPreferencesTab()` method
3. ✅ Add Preferences tab to tab navigation
4. ✅ Add `setupPreferencesEvents()` method
5. ✅ Embed Preferences CSS in Settings.js
6. ✅ Test theme toggle works
7. ✅ Test default view selector works
8. ✅ Test windowing toggle saves to database

**Success Criteria:**
- Can toggle between light/dark theme
- Can select default view (Dashboard/Pipeline/Tasks/Jobs/Goals)
- Can enable/disable windowing
- Preferences save to database via `API.updatePreferences()`
- Preferences load on page refresh

---

### Phase 2: Apply Theme System
**Priority:** HIGH 🔥
**Time:** 2-3 hours

**Tasks:**
1. ✅ Update `index.html` to load preferences on page load
2. ✅ Add `body[data-theme="dark"]` CSS to each module
3. ✅ Test dark mode works in all modules
4. ✅ Test default view loads correct module on login

**Dark Mode CSS Pattern:**
```css
/* In each module's embedded CSS */

/* Light mode (default) */
.module-container {
  background: white;
  color: #333;
}

/* Dark mode */
body[data-theme="dark"] .module-container {
  background: #1a1a1a;
  color: #e0e0e0;
}
```

---

### Phase 3: Implement Simple Windowing
**Priority:** HIGH 🔥
**Time:** 3-4 hours

**Tasks:**
1. ✅ Add `makeWindowDraggable()` to utils.js
2. ✅ Update each module to check `windowing_enabled` preference
3. ✅ Add windowing CSS classes to each module
4. ✅ Test modals become windows when windowing enabled
5. ✅ Test modals are fullscreen when windowing disabled
6. ✅ Test drag functionality works
7. ✅ Test multiple windows can stack

**Modules to update:**
- Dashboard.js (modals for stats, leads, tasks)
- Pipeline.js (modals for lead details, edit, delete)
- AddLead.js (form modal if any)
- Scheduling.js (task modals)

---

### Phase 4: Build Jobs Module
**Priority:** HIGH 🔥
**Time:** 5-6 hours

**Features:**
- List view of jobs (table/cards)
- Add job form (links to lead, sets costs)
- Edit job (update costs, auto-recalculates profit)
- Complete job (sets final price)
- Stats widget (total revenue, profit margin)
- Filter by status (scheduled, in progress, completed)

**Uses windowing:**
- Add job → window/modal opens
- Edit job → window/modal opens
- View job detail → window/modal opens

---

### Phase 5: Build Goals Module
**Priority:** HIGH 🔥
**Time:** 4-5 hours

**Features:**
- Grid of goal cards with progress bars
- Add goal form (type, target, period)
- Progress rings/bars (Apple Watch style)
- Auto-tracking indicator
- Filter by status (active, completed, failed)

**Uses windowing:**
- Add goal → window/modal opens
- Edit goal → window/modal opens
- View goal detail → window/modal opens

---

### Phase 6: Pro Info Fields
**Priority:** MEDIUM
**Time:** 3-4 hours

**Tasks:**
1. ✅ Add Pro Info section to AddLead form (position, department, social links)
2. ✅ Build Pro Info sidebar (right-side drawer)
3. ✅ Connect Pro Info sidebar to Pipeline module (click lead → drawer opens)
4. ✅ Test all social links save to database

---

### Phase 7: Enhanced Dashboard Stats
**Priority:** MEDIUM
**Time:** 2-3 hours

**Add stat widgets:**
- Pipeline value (sum of potential_value)
- Weighted pipeline (potential_value × win_probability)
- Lead quality distribution
- Top lead sources
- Smart insights (stale leads, stuck deals)

---

### Phase 8: Mobile Optimization
**Priority:** CRITICAL BEFORE LAUNCH 🔥🔥🔥
**Time:** 5-6 hours

**Test on:**
- iPhone 12 (390px)
- Galaxy S21 (360px)
- iPad (768px)

**Requirements:**
- Touch targets >= 44px
- No horizontal scroll
- Windowing disabled on mobile (auto-switch to fullscreen modals)
- All forms work with mobile keyboard
- Pipeline drag works on touch

---

### Phase 9: Testing & Launch Prep
**Priority:** CRITICAL 🔥🔥🔥
**Time:** 3-4 hours

**Tests:**
- Trial upgrade/downgrade flow
- All windowing modes work
- Theme persists across sessions
- Default view loads correctly
- All API calls work
- Security (XSS tests)
- Mobile responsiveness

---

## 📊 PROGRESS TRACKER

**Backend:** 100% ✅
**Database:** 100% ✅
**API:** 100% v4.0 ✅
**Free Tier:** 100% ✅

### Professional Tier: 35%

**Architecture:** 90% (CSS embedded, modules copied)
**Settings Preferences:** 0% (building now)
**Windowing System:** 0% (building from scratch)
**Theme System:** 0% (building now)

**Modules:**
- Dashboard: 70% (copied from free, needs dark mode + windowing)
- AddLead: 70% (copied from free, needs Pro Info fields)
- Pipeline: 70% (copied from free, needs Pro Info sidebar)
- Scheduling: 70% (copied from free, needs dark mode)
- Settings: 60% (needs Preferences tab)
- Jobs: 0% (not built)
- Goals: 0% (not built)

### Time to Launch: 25-30 hours

**Breakdown:**
- Settings Preferences: 2-3 hours ← START HERE
- Theme system: 2-3 hours
- Simple windowing: 3-4 hours
- Jobs module: 5-6 hours
- Goals module: 4-5 hours
- Pro Info fields: 3-4 hours
- Enhanced Dashboard: 2-3 hours
- Mobile optimization: 5-6 hours
- Testing: 3-4 hours

---

## ⚠️ CRITICAL NOTES

### What's Different in v9.0
- ✅ Scrapped OverlayManager/OverlayComponents (too complex)
- ✅ Building simple windowing from scratch (CSS + basic JS)
- ✅ Pro tier uses SAME module names as Free tier
- ✅ CSS is embedded in each module (no central file)
- ✅ Focus on Settings Preferences first (enables everything else)

### Before Launch
- 🔴 Complete Settings Preferences tab
- 🔴 Implement theme system (light/dark)
- 🔴 Build simple windowing system
- 🔴 Build Jobs module
- 🔴 Build Goals module
- 🔴 Mobile optimization (critical!)
- 🔴 Trial testing
- 🔴 Security audit

### Known Issues
- ❌ Settings Preferences tab doesn't exist yet
- ❌ No theme system (light/dark)
- ❌ No windowing system
- ❌ Jobs module not built
- ❌ Goals module not built
- ❌ Pro Info fields not added
- ❌ Mobile not tested

---

## 🚀 NEXT STEPS

**IMMEDIATE (Today):**
1. Build Settings Preferences tab (2-3 hours)
   - Theme toggle
   - Default view selector
   - Windowing toggle
   - Save/load preferences

**THIS WEEK:**
2. Implement theme system (2-3 hours)
3. Build simple windowing (3-4 hours)
4. Start Jobs module (5-6 hours)

**NEXT WEEK:**
5. Finish Jobs module
6. Build Goals module
7. Add Pro Info fields
8. Mobile optimization

---

## 📝 METADATA

**Version:** 9.0
**Subtitle:** GROUND ZERO REBUILD EDITION
**Last Updated:** Fresh architecture, simple windowing, Settings Preferences focus
**Status:** Ready to build from ground zero
**Philosophy:** Simple > Complex | Self-contained modules | CSS embedded
**Next Action:** Build Settings Preferences tab → Theme system → Simple windowing
**Estimated Launch:** 25-30 hours

**Major Changes from v8.1:**
- ❌ Removed OverlayManager/OverlayComponents (too complex)
- ✅ Simple windowing approach (CSS + basic drag)
- ✅ Pro tier copies Free tier modules (same names)
- ✅ CSS embedded in modules (no central file)
- ✅ Focus on Settings Preferences first
- ✅ Clear build order starting with essentials

---

**END OF HANDOFF DOCUMENT v9.0**

*This is the single source of truth for SteadyManager Pro development.*
*Start here: Build Settings Preferences tab.*
*Then: Theme system → Simple windowing → Jobs → Goals → Ship it.*

---

**Ready to build? Let's start with Settings Preferences!** 🚀