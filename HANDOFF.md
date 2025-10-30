# 🎯 STEADYMANAGER PRO - TECHNICAL HANDOFF v6.0

## SYSTEM STATUS
```json
{
  "backend": {
    "status": "LIVE",
    "stack": {
      "database": "Supabase PostgreSQL + RLS",
      "server": "Node.js on Railway (auto-deploy)",
      "email": "Supabase Auth",
      "cron": "node-cron (daily 2AM trial expiration)"
    },
    "health": 100
  },
  "authentication": {
    "status": "COMPLETE",
    "flows": [
      "register → email verification → login",
      "password reset",
      "ToS acceptance (required)"
    ],
    "security": ["No account enumeration", "XSS protected", "CSP headers"]
  },
  "tiers": {
    "free": {
      "status": "PRODUCTION_READY",
      "lead_limit": 50,
      "modules": ["Dashboard", "AddLead", "Pipeline", "Scheduling", "Settings"],
      "bugs": []
    },
    "professional": {
      "status": "IN_DEVELOPMENT",
      "lead_limit": 5000,
      "modules_ready": ["Dashboard", "AddLead", "Pipeline", "Settings"],
      "modules_building": ["Jobs", "Goals"],
      "new_features": ["Windowing System", "Overlay UI", "Quick Actions FAB"]
    }
  }
}
```

---

## WINDOWING SYSTEM ARCHITECTURE
```javascript
/**
 * OVERLAY MANAGER - Revolutionary Multi-Tasking System
 * Location: /dashboard/shared/js/OverlayManager.js
 */

class OverlayManagerClass {
  constructor() {
    this.overlays = new Map();      // Active overlays tracker
    this.zIndexCounter = 1000;      // Stacking order
    this.maxOverlays = 3;           // Max simultaneous windows
  }

  /**
   * Open new overlay window
   * @param {Object} config
   * @param {string} config.id - Unique overlay ID
   * @param {string} config.title - Window title
   * @param {string|HTMLElement} config.content - Body content
   * @param {number} config.width - Window width (px)
   * @param {number} config.height - Window height (px)
   * @param {Function} config.onClose - Callback on close
   */
  open(config) {
    if (this.overlays.has(config.id)) {
      this.bringToFront(config.id);
      return;
    }

    if (this.overlays.size >= this.maxOverlays) {
      toast('Max 3 windows open', 'warning');
      return;
    }

    const overlay = this.createOverlayElement(config);
    this.overlays.set(config.id, { element: overlay, config });
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('overlay-show');
    });

    this.setupDragging(config.id);
    this.bringToFront(config.id);
  }

  close(id) {
    const data = this.overlays.get(id);
    if (!data) return;

    data.element.classList.add('overlay-hide');
    setTimeout(() => {
      data.element.remove();
      this.overlays.delete(id);
    }, 300);
  }

  minimize(id) {
    const data = this.overlays.get(id);
    if (!data) return;
    
    data.element.classList.add('minimized');
    this.addToMinimizedBar(id, data.config.title);
  }

  bringToFront(id) {
    this.zIndexCounter++;
    const data = this.overlays.get(id);
    
    // Reset all to inactive
    this.overlays.forEach(d => d.element.classList.remove('active'));
    
    // Set this as active
    data.element.style.zIndex = this.zIndexCounter;
    data.element.classList.add('active');
  }
}

window.OverlayManager = new OverlayManagerClass();
```

---

## DATABASE SCHEMA
```sql
-- USERS TABLE (Core Profile)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    user_type TEXT CHECK (user_type IN ('free', 'professional', 'professional_trial')),
    current_lead_limit INT DEFAULT 50,
    current_leads INT DEFAULT 0,
    trial_start_date TIMESTAMPTZ,
    trial_end_date TIMESTAMPTZ,
    preferences JSONB DEFAULT '{"windowing_enabled": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEADS TABLE (Enhanced for Pro)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    
    -- Pro Features
    position TEXT,                  -- "VP of Sales"
    department TEXT,                -- "Marketing"
    deal_stage TEXT,                -- "Proposal"
    next_action TEXT,               -- "Send contract"
    win_probability INT,            -- 0-100%
    tags TEXT[] DEFAULT '{}',       -- ["hot", "enterprise"]
    
    -- Financial
    potential_value NUMERIC(12,2),
    status TEXT DEFAULT 'new',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOBS TABLE (Pro Tier - Financial Tracking)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id),
    
    -- Job Info
    title TEXT NOT NULL,
    job_type TEXT DEFAULT 'service',
    status TEXT DEFAULT 'scheduled',
    scheduled_date DATE,
    
    -- Manual Cost Input (Better Google Sheets)
    material_cost NUMERIC(12,2) DEFAULT 0,
    labor_hours NUMERIC(5,2) DEFAULT 0,
    labor_rate NUMERIC(8,2) DEFAULT 0,
    other_expenses NUMERIC(12,2) DEFAULT 0,
    
    -- Auto-Calculated (Like =SUM() in spreadsheet)
    total_cost NUMERIC(12,2) GENERATED ALWAYS AS (
        material_cost + (labor_hours * labor_rate) + other_expenses
    ) STORED,
    
    quoted_price NUMERIC(12,2),
    final_price NUMERIC(12,2),
    
    profit NUMERIC(12,2) GENERATED ALWAYS AS (
        COALESCE(final_price, quoted_price) - total_cost
    ) STORED,
    
    profit_margin NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN COALESCE(final_price, quoted_price) > 0
        THEN ((COALESCE(final_price, quoted_price) - total_cost) / 
              COALESCE(final_price, quoted_price)) * 100
        ELSE 0 END
    ) STORED,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GOALS TABLE (Pro Tier - Auto-Tracking)
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    goal_type TEXT NOT NULL,        -- 'leads_created', 'revenue', 'jobs_completed'
    target_value NUMERIC(12,2),
    current_value NUMERIC(12,2) DEFAULT 0,  -- Auto-updated by triggers
    
    period TEXT NOT NULL,           -- 'daily', 'weekly', 'monthly'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API REFERENCE
```javascript
/**
 * API.js v3.0 - Complete Method List
 * Location: /dashboard/shared/js/api.js
 */

const API = {
  // ============================================
  // AUTH
  // ============================================
  async login(email, password) {},
  async logout() {},
  async register(email, password) {},
  async checkAuth() {},
  async resetPassword(email) {},
  async updatePassword(newPassword) {},
  
  // ============================================
  // USER PROFILE
  // ============================================
  async getProfile() {},
  async updateProfile(updates) {},
  async updateSettings(settings) {},
  async getPreferences() {},                    // NEW: UI preferences
  async updatePreferences(prefs) {},            // NEW: windowing, theme, etc
  async toggleFeature(name, enabled) {},        // NEW: toggle windowing system
  
  // ============================================
  // LEADS
  // ============================================
  async getLeads() {},                          // Returns {cold, warm, all}
  async createLead(data) {},
  async updateLead(id, updates) {},
  async deleteLead(id) {},
  async searchLeads(query) {},
  async checkDuplicates(data) {},
  async addLeadTags(id, tags) {},               // NEW: Pro tier
  async setWinProbability(id, prob) {},         // NEW: Pro tier
  async setNextAction(id, action) {},           // NEW: Pro tier
  
  // ============================================
  // TASKS
  // ============================================
  async getTasks(filters) {},
  async createTask(data) {},
  async updateTask(id, updates) {},
  async deleteTask(id) {},
  async completeTask(id, notes) {},
  
  // ============================================
  // JOBS (PRO TIER)
  // ============================================
  async getJobs(filters) {},                    // NEW
  async createJob(data) {},                     // NEW
  async updateJob(id, updates) {},              // NEW
  async completeJob(id, finalPrice, hours) {}, // NEW
  async getJobStats() {},                       // NEW: total revenue, profit
  async getJobsByLead(leadId) {},               // NEW: all jobs for lead
  
  // ============================================
  // GOALS (PRO TIER)
  // ============================================
  async getGoals(status) {},                    // NEW
  async createGoal(data) {},                    // NEW
  async updateGoal(id, updates) {},             // NEW
  async deleteGoal(id) {},                      // NEW
  async getGoalProgress() {},                   // NEW: all goals with %
  
  // ============================================
  // STATS
  // ============================================
  async getBasicStats() {},
  async getCurrentStats() {},
  async getDetailedStats() {},
  
  // ============================================
  // UTILITIES
  // ============================================
  escapeHtml(text) {},
  isValidEmail(email) {},
  formatDate(date) {},
  handleAPIError(error, context) {}
};
```

---

## FILE STRUCTURE
```bash
steadymanager/
├── server.js                          # Node.js + Stripe webhooks + cron
├── .env                               # Secrets (NEVER commit)
│
└── public/
    ├── auth/                          # ✅ All complete
    │   ├── login.html
    │   ├── register.html
    │   ├── callback.html
    │   ├── forgot-password.html
    │   ├── reset-password.html
    │   └── resend-verification.html
    │
    └── dashboard/
        ├── index.html                 # Router (tier detection)
        │
        ├── shared/js/
        │   ├── supabase.js            # ✅ Supabase client
        │   ├── api.js                 # ✅ 700 lines, v3.0
        │   ├── utils.js               # ✅ Toast, validation
        │   ├── OverlayManager.js      # ✅ NEW - Windowing controller
        │   └── OverlayComponents.js   # 🔨 BUILDING - Reusable overlays
        │
        └── tiers/
            ├── free/                  # ✅ Production ready
            │   ├── index.html
            │   └── scripts/
            │       ├── Dashboard.js
            │       ├── AddLead.js
            │       ├── Pipeline.js
            │       ├── Scheduling.js
            │       └── Settings.js
            │
            └── professional/          # 🔨 IN PROGRESS
                ├── index.html         # ✅ V2.0 (windowing support)
                └── scripts/
                    ├── Dashboard.js   # ✅ Ready
                    ├── Leads.js     # ✅ Ready (needs enhanced fields)
                    ├── Pipeline.js    # ✅ Ready (needs overlay integration)
                    ├── Settings.js    # ✅ Ready (needs preferences tab)
                    ├── Tasks.js     # ✅ Ready (needs enhanced fields)
                    ├── Jobs.js        # ❌ NOT BUILT
                    └── Goals.js       # ❌ NOT BUILT

```

---

## USAGE EXAMPLES
```javascript
// ============================================
// OPENING OVERLAYS FROM ANY MODULE
// ============================================

// From Pipeline.js - Click lead card
function viewLead(leadId) {
  OverlayManager.open({
    id: `lead-${leadId}`,
    title: 'Lead Details',
    content: renderLeadDetail(leadId),
    width: 600,
    height: 700,
    module: 'pipeline'
  });
}

// From Dashboard.js - Click stat card
function viewLeadsBreakdown() {
  OverlayManager.open({
    id: 'leads-breakdown',
    title: 'Leads Breakdown',
    content: renderLeadsChart(),
    width: 800,
    height: 600
  });
}

// From anywhere - Floating action button
function quickAddLead() {
  OverlayManager.open({
    id: 'quick-add-lead',
    title: 'Add Lead',
    content: renderQuickAddForm(),
    width: 500,
    height: 600,
    onSave: async (data) => {
      await API.createLead(data);
      toast('Lead created!', 'success');
      OverlayManager.close('quick-add-lead');
    }
  });
}

// ============================================
// STACKING OVERLAYS (MULTI-TASKING)
// ============================================

// User flow:
// 1. Viewing Pipeline
OverlayManager.open({ id: 'lead-123', ... });
// 2. From lead detail, click "Add Job"
OverlayManager.open({ id: 'add-job', ... });
// 3. Now have 3 layers:
//    - Pipeline (blurred background)
//    - Lead Detail (behind)
//    - Add Job (on top)
// ESC closes top overlay, revealing lead detail again

// ============================================
// MINIMIZING WINDOWS
// ============================================

OverlayManager.minimize('lead-123');
// Window collapses to bottom bar
// Click bar item to restore

// ============================================
// CLOSING ALL WINDOWS
// ============================================

OverlayManager.closeAll();
// Closes all overlays, restores scroll
```

---

## TESTING PROTOCOL
```javascript
// ============================================
// PHASE 1: OVERLAY SYSTEM VERIFICATION
// ============================================

const overlayTests = {
  test1: "Open browser console, run: typeof OverlayManager",
  expected1: "object",
  
  test2: "Run: OverlayManager.maxOverlays",
  expected2: 3,
  
  test3: "Click FAB button (bottom-right +)",
  expected3: "Menu expands with 'Add Lead' and 'Add Job'",
  
  test4: "Click 'Add Lead' from FAB",
  expected4: "Overlay opens, background blurs",
  
  test5: "Press ESC key",
  expected5: "Overlay closes, background unblurs",
  
  test6: "Open 3 overlays",
  expected6: "4th attempt shows 'Max 3 overlays' warning",
  
  test7: "Click outside overlay",
  expected7: "Overlay closes",
  
  test8: "Drag overlay by header",
  expected8: "Window moves smoothly, constrained to viewport"
};

// ============================================
// PHASE 2: FREE TIER (DESKTOP) ✅ PASSING
// ============================================

const freeTierTests = {
  auth: [
    "Register → Email verification → Login",
    "Password reset flow",
    "Login without verification → Blocked"
  ],
  functionality: [
    "Create 50 leads → Works",
    "Create 51st lead → Blocked with upgrade message",
    "Pipeline drag-and-drop → Works",
    "Task creation → Works",
    "Theme toggle → Persists",
    "Export CSV → Works"
  ],
  xss: [
    "Lead name: <script>alert('XSS')</script> → Displays as text",
    "Task title: <img src=x onerror=alert('XSS')> → No execution"
  ]
};

// ============================================
// PHASE 3: MOBILE OPTIMIZATION ❌ NOT DONE
// ============================================

const mobileTests = {
  devices: ["iPhone 12 (390px)", "Galaxy S21 (360px)", "iPad (768px)"],
  checks: [
    "Touch targets >= 44px",
    "No horizontal scroll",
    "Sidebar hamburger menu works",
    "Forms work with mobile keyboard",
    "Modals close on touch outside",
    "Pipeline drag works on touch"
  ]
};

// ============================================
// PHASE 4: TRIAL TESTING ❌ CRITICAL
// ============================================

const trialTests = {
  upgrade: {
    steps: [
      "Login as free user (50 limit, user_type: 'free')",
      "Click 'Start Trial' in Settings",
      "Verify DB: user_type='professional_trial', limit=5000",
      "Verify can add 100 leads",
      "Try starting trial again → Blocked"
    ]
  },
  expiration: {
    steps: [
      "Set trial_end_date to yesterday in DB",
      "Wait for cron (2AM) OR call test endpoint",
      "Verify DB: user_type='free', limit=50",
      "Verify can't add >50 leads",
      "Verify trial_end_date stays set (prevents re-trial)"
    ]
  },
  testEndpoint: "POST /test/expire-trials (REMOVE BEFORE PRODUCTION)"
};
```

---

## DEPLOYMENT
```bash
# ============================================
# ENVIRONMENT VARIABLES (Railway)
# ============================================

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://steadymanager.com

# ============================================
# DEPLOY PROCESS
# ============================================

git add .
git commit -m "Description"
git push origin main

# Railway auto-detects push:
# → Pulls code
# → npm install
# → Restarts server
# → Live in ~2 minutes
```

---

## IMMEDIATE NEXT STEPS
```javascript
const roadmap = {
  phase1_critical: {
    priority: "URGENT",
    tasks: [
      "❌ Add Scheduling.js to pro tier index.html (Tasks page broken!)",
      "❌ Test overlay system end-to-end",
      "❌ Verify FAB button works"
    ],
    time: "30 minutes"
  },
  
  phase2_integrate: {
    priority: "HIGH",
    tasks: [
      "❌ Pipeline.js: Make cards open LeadDetailOverlay",
      "❌ Dashboard.js: Make stats clickable",
      "❌ Settings.js: Add Preferences tab"
    ],
    time: "2-3 hours"
  },
  
  phase3_build: {
    priority: "HIGH",
    tasks: [
      "❌ Build Jobs.js (calendar + profit tracking)",
      "❌ Build Goals.js (progress rings + auto-tracking)",
      "❌ Build OverlayComponents.js (reusable overlays)"
    ],
    time: "6-8 hours"
  },
  
  phase4_test: {
    priority: "CRITICAL BEFORE LAUNCH",
    tasks: [
      "❌ Complete ALL trial testing",
      "❌ Mobile optimization (all modules)",
      "❌ Security audit",
      "❌ Remove test endpoints"
    ],
    time: "4-6 hours"
  }
};

// Total to launch: ~15-20 hours
```

---

## CRITICAL REMINDERS
```javascript
const warnings = {
  beforeLaunch: [
    "🔴 REMOVE test endpoint /test/expire-trials from server.js",
    "🟠 TEST trial upgrade/downgrade thoroughly",
    "🟡 Enable PostHog analytics (optional but recommended)",
    "🟢 Build Stripe checkout flow (currently manual upgrade only)"
  ],
  
  security: [
    "All user inputs XSS protected via API.escapeHtml()",
    "RLS policies block unauthorized access",
    "Email verification enforced",
    "Trial abuse prevented (trial_end_date never erased)"
  ],
  
  knownIssues: [
    "Scheduling.js not loaded in pro tier index.html → Tasks page broken",
    "No modules connected to overlay system yet",
    "Mobile responsiveness not tested",
    "Stripe integration incomplete"
  ]
};
```

---

**Document Version**: 6.0 (Code-First Edition)  
**Last Updated**: Windowing System Built, Zero Modules Migrated  
**Status**: Foundation Complete, Integration Pending  
**Philosophy**: Manual CRM + Smart Visualization + Revolutionary Multi-Tasking
```javascript
// The entire system in one function call
async function launch() {
  await fixSchedulingBug();
  await connectPipelineToOverlays();
  await buildJobsModule();
  await buildGoalsModule();
  await testMobile();
  await testTrials();
  await enableAnalytics();
  await buildStripeCheckout();
  return "🚀 READY FOR PRODUCTION";
}
```

---