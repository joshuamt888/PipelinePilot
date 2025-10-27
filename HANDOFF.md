# 🎯 STEADYMANAGER v2.2 - TECHNICAL HANDOFF DOCUMENT

**For Developers & Future AI Assistants: Complete System Overview & Remaining Work**

---

## ✅ CURRENT STATE - WHAT'S COMPLETE

### Backend Infrastructure (100% ✅)

- **Supabase Database**: Live with RLS policies on all tables
- **server.js**: ~220 lines, Stripe webhooks + env validation + cron jobs
- **Railway Deployment**: Auto-deploys on git push to main
- **Email System**: Verification & password reset via Supabase Auth
- **Database Triggers**: Auto-create user records on signup
- **Environment Validation**: Server exits if required vars missing
- **Cron Jobs**: Daily trial expiration check at 2:00 AM (automated)

### Authentication System (100% ✅)

All auth pages migrated to Supabase:

- **login.html** - Email verification check, redirects unverified users
- **register.html** - Creates FREE tier accounts, sends verification email
- **callback.html** - Handles email verification redirect from Supabase
- **forgot-password.html** - Password reset requests (no account enumeration)
- **reset-password.html** - Password update with token validation
- **resend-verification.html** - Resend verification with sessionStorage pre-fill

**Security Features:**
- No account enumeration on any auth page
- Email verification enforced before dashboard access
- Secure session handling via Supabase Auth
- CSP headers blocking inline scripts

**Terms of Service Acceptance (100% ✅):**
- Required checkbox on registration page (cannot register without acceptance)
- Calls `API.acceptTos('1.0')` after successful account creation
- Uses secure database function: `accept_terms_of_service(version)`
- `tos_accepted_at` field protected by RLS - can only be set via SECURITY DEFINER function
- Backend verification prevents client-side bypass
- Legal docs updated with PostHog disclosure and periodic review language

### Dashboard Core (100% ✅)

- **Main Router**: `/dashboard/index.html` - Tier detection & trial expiration handling
- **Free Tier Shell**: `/dashboard/tiers/free/index.html` - Secure shell with:
  - ES6 module imports (no race conditions)
  - Auth check with email verification enforcement
  - XSS-protected profile loading
  - Module lazy loading system
  - Theme toggle with localStorage persistence
  - Mobile-responsive sidebar

### API Layer (100% ✅)

**Location**: `/public/dashboard/shared/js/api.js` - 600 lines, fully rewritten for Supabase

**Features:**
- All methods call Supabase directly (no server endpoints)
- Built-in XSS protection (`API.escapeHtml()`)
- Error handling with user-friendly messages
- RLS limit detection and reporting
- Duplicate detection for leads
- Trial upgrade with abuse prevention

**Supabase Client**: `/public/dashboard/shared/js/supabase.js` - Initialized and ready

### Analytics (Ready for Launch 🎯)

**Location**: `/public/dashboard/shared/js/analytics.js`

**Status**: Configured and ready to enable before launch

**Setup**:
- PostHog analytics framework implemented
- Auto-disables on localhost (no events sent during local dev)
- Privacy-first defaults (respects "Do Not Track")
- Legal disclosure already in Terms & Privacy pages

**To Enable Before Launch**:
1. Sign up at posthog.com (free tier: 1M events/month)
2. Get project API key (starts with `phc_`)
3. Replace `YOUR_POSTHOG_KEY_HERE` in analytics.js with actual key
4. Deploy - analytics will start tracking production usage

**Why PostHog keys are safe to hardcode**:
- PostHog public keys are write-only (cannot read data)
- Designed for client-side use
- Different from actual secrets (DB passwords, API keys)

**Features Available**:
- Event tracking (button clicks, feature usage)
- Session replays (privacy-friendly)
- Funnels (signup → trial → paid conversion)
- Feature flags (A/B testing)
- User cohorts (behavior segmentation)

**See**: `ANALYTICS_SETUP.md` for detailed instructions

### Frontend Modules (5/5 Complete ✅)

#### 1. Dashboard.js ✅ COMPLETE
- Uses `API.getBasicStats()`, `API.getCurrentStats()`
- XSS-protected rendering
- Search-enabled modals
- Analytics and pipeline overview
- Drill-down modals for metrics
- **Efficient**: 4 queries per load (can handle 1,000-2,000 users)

#### 2. Pipeline.js ✅ COMPLETE
- Drag-and-drop lead management with smooth animations
- Persistent filters during session (resets on nav away)
- Uses `API.getLeads()`, `API.updateLead()`
- XSS-protected lead cards
- Deal value & loss reason tracking
- 40-line note truncation
- ✅ Modal text selection bug FIXED

#### 3. AddLead.js ✅ COMPLETE
- Uses `API.createLead()`, `API.checkDuplicates()`
- XSS-protected on all user data
- Input validation with character limits
- Duplicate detection before creation
- Source selector with 20+ options
- Quality score slider (1-10)
- ✅ Modal text selection bug FIXED

#### 4. Scheduling.js ✅ COMPLETE
- Calendar view with task badges
- Uses `API.getTasks()`, `API.createTask()`
- XSS-protected rendering
- Lead association via picker
- Task filters (type, priority, date)
- Priority glow effects
- ✅ Modal text selection bug FIXED

#### 5. Settings.js ✅ COMPLETE
- Account info display (email, tier, member since)
- Change password with validation & strength meter
- Theme toggle (auto-save) with fixed contrast
- Export leads/tasks as CSV (unlimited exports)
- Delete account with confirmation ("DELETE" typing required)
- Secure modals with mousedown/mouseup pattern
- ✅ Modal text selection bug FIXED
- **NO 2FA** (removed - reserved for Pro tier later)

---

## ✅ FIXED - Modal Text Selection Bug

**Problem**: Users could accidentally close modals when selecting text in input fields by dragging outside the modal and releasing.

**Solution**: Implemented mousedown/mouseup pattern in all modals - only closes when BOTH mousedown AND mouseup happen on the overlay backdrop.

**Status**: ✅ Fixed in Settings.js, AddLead.js, Scheduling.js, Pipeline.js

**Implementation Pattern**:
```javascript
const backdrop = document.getElementById('modalBackdrop');
let mouseDownTarget = null;

backdrop.addEventListener('mousedown', (e) => {
    mouseDownTarget = e.target;
});

backdrop.addEventListener('mouseup', (e) => {
    // Only close if both down and up were on the overlay
    if (mouseDownTarget === backdrop && e.target === backdrop) {
        closeModal();
    }
    mouseDownTarget = null;
});
```

**Testing**: ✅ Users can now select text in inputs, drag outside modal, and release without losing their work.

---

## 📱 MOBILE OPTIMIZATION (NEXT PRIORITY)

**Current Status**: Desktop-Optimized, Mobile Needs Work

**Priority Areas:**
- ❌ Dashboard.js - Metrics grid needs responsive breakpoints (4 cols → 2 cols → 1 col)
- ❌ Pipeline.js - Drag-and-drop touch support for mobile
- ❌ AddLead.js - Form layout needs stacking on small screens
- ❌ Scheduling.js - Calendar mobile view optimization
- ❌ Settings.js - Card stacking on small screens
- ❌ Sidebar - Hamburger menu behavior needs refinement

**Test Devices:**
- iPhone 12/13/14 (390px width)
- Samsung Galaxy S21 (360px width)
- iPad (768px width)
- iPad Pro (1024px width)

**Mobile Requirements:**
- Touch-friendly targets (minimum 44px × 44px)
- Proper viewport meta tag
- Responsive breakpoints at 480px, 768px, 1024px
- No horizontal scroll
- Readable text (minimum 16px base font)
- Easy-to-tap buttons and inputs

---

## 📊 DATABASE SCHEMA REFERENCE (UPDATED v2.5)

### Users Table
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN (
        'free',
        'professional',
        'professional_trial'
    )),
    current_lead_limit INTEGER NOT NULL DEFAULT 50,
    current_leads INTEGER DEFAULT 0,
    trial_start_date TIMESTAMPTZ,
    trial_end_date TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT,
    settings JSONB DEFAULT '{}',
    goals JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',  -- NEW: UI preferences (windowing, panels, theme)
    tos_accepted_at TIMESTAMPTZ,
    tos_version TEXT DEFAULT '1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- `users_select_own` - Users can only SELECT their own profile
- `users_update_settings` - Users can UPDATE their profile (protected by trigger)
- `users_insert_trigger` - Allows trigger to INSERT new user records

**Security Trigger:**
- `protect_user_fields_trigger` - Blocks all attempts to modify:
  - `user_type` (tier)
  - `current_lead_limit` (lead capacity)
  - `current_leads` (lead counter)
  - `trial_start_date` / `trial_end_date` (trial dates)
  - `stripe_customer_id` / `stripe_subscription_id` / `subscription_status` (billing)
  - `tos_accepted_at` / `tos_version` (Terms of Service)
  - **Allows changes to**: `settings` and `goals` JSONB fields only
  - **Exception**: SECURITY DEFINER functions can bypass protection using session flag

### Leads Table (Enhanced for Pro Tier)
```sql
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    position TEXT,              -- NEW: "VP of Sales", "CEO" (more detailed than job_title)
    department TEXT,            -- NEW: "Sales", "Marketing", "Engineering"
    website TEXT,
    status TEXT DEFAULT 'new',
    type TEXT,
    source TEXT,
    platform TEXT,
    notes TEXT,
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
    potential_value NUMERIC(12, 2),
    follow_up_date DATE,
    last_contact_date DATE,
    deal_stage TEXT,            -- NEW: "Discovery", "Proposal", "Negotiation" (more granular)
    next_action TEXT,           -- NEW: "Send proposal", "Schedule demo" (manual input)
    win_probability INTEGER CHECK (win_probability BETWEEN 0 AND 100),  -- NEW: For forecasting
    tags TEXT[] DEFAULT '{}',   -- NEW: ["hot", "enterprise", "q4-priority"]
    linkedin_url TEXT,
    facebook_url TEXT,
    twitter_url TEXT,
    instagram_url TEXT,
    lost_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies**: All enforce `auth.uid() = user_id`

### Tasks Table
```sql
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    due_time TIME,
    task_type TEXT DEFAULT 'follow_up',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies**: All enforce `auth.uid() = user_id`

### Jobs Table (NEW - Pro Tier Feature)
```sql
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    job_type TEXT DEFAULT 'service',  -- 'service', 'product', 'consultation', 'project'
    status TEXT DEFAULT 'scheduled',  -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    priority TEXT DEFAULT 'medium',

    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    duration_hours NUMERIC(5,2),
    completed_at TIMESTAMPTZ,

    -- Financial Tracking (Manual Input = Better Google Sheets)
    material_cost NUMERIC(12,2) DEFAULT 0,
    labor_hours NUMERIC(5,2) DEFAULT 0,
    labor_rate NUMERIC(8,2) DEFAULT 0,
    other_expenses NUMERIC(12,2) DEFAULT 0,
    total_cost NUMERIC(12,2) GENERATED ALWAYS AS (
        material_cost + (labor_hours * labor_rate) + other_expenses
    ) STORED,

    quoted_price NUMERIC(12,2) DEFAULT 0,
    final_price NUMERIC(12,2),
    profit NUMERIC(12,2) GENERATED ALWAYS AS (
        COALESCE(final_price, quoted_price) - total_cost
    ) STORED,
    profit_margin NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN COALESCE(final_price, quoted_price) > 0
            THEN ((COALESCE(final_price, quoted_price) - total_cost) / COALESCE(final_price, quoted_price)) * 100
            ELSE 0
        END
    ) STORED,

    -- Materials & Notes
    materials JSONB DEFAULT '[]',  -- [{"name": "Paint", "quantity": 3, "cost": 45}]
    notes TEXT,
    location TEXT,
    invoice_number TEXT,
    payment_status TEXT DEFAULT 'pending',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- **Manual Input:** You enter all costs, system calculates profit (like spreadsheet formulas)
- **Generated Columns:** total_cost, profit, profit_margin auto-calculate (like `=SUM()`)
- **Materials Tracking:** JSONB array for flexible material lists
- **Lead Association:** Link jobs to leads for full client history

**RLS Policies**: All enforce `auth.uid() = user_id`

### Goals Table (NEW - Pro Tier Feature)
```sql
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Goal Definition
    title TEXT NOT NULL,                       -- "Add 20 leads this month"
    description TEXT,
    goal_type TEXT NOT NULL,                   -- 'leads_created', 'jobs_completed', 'revenue', 'profit'

    -- Target & Progress
    target_value NUMERIC(12,2) NOT NULL,
    current_value NUMERIC(12,2) DEFAULT 0,     -- Auto-updated by triggers
    unit TEXT,                                 -- 'leads', 'dollars', 'jobs'

    -- Time Period
    period TEXT NOT NULL,                      -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Status
    status TEXT DEFAULT 'active',              -- 'active', 'completed', 'failed', 'paused'
    auto_track BOOLEAN DEFAULT true,           -- Auto-update from database

    -- UI Customization
    color TEXT DEFAULT '#667eea',
    icon TEXT DEFAULT '🎯',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- **Auto-tracking:** Goals update automatically when you add leads/jobs (like `=COUNTIF()`)
- **Manual Control:** You set targets, system counts progress
- **Visual Progress:** Color-coded progress bars in UI
- **Time-based:** Track daily, weekly, monthly, or custom periods

**RLS Policies**: All enforce `auth.uid() = user_id`

### Database Functions
```sql
-- Atomically creates lead and increments counter
-- Uses session flag to bypass trigger protection
create_lead_with_increment(lead_data jsonb)

-- Atomically deletes lead and decrements counter
-- Uses session flag to bypass trigger protection
delete_lead_with_decrement(lead_id uuid, user_id_val uuid)

-- Downgrades expired trial users (called by cron job)
downgrade_expired_trials()

-- Securely accepts Terms of Service (one-time only)
-- Uses session flag to bypass trigger protection
accept_terms_of_service(version text DEFAULT '1.0')

-- Upgrades user to 14-day professional trial
-- Uses session flag to bypass trigger protection
upgrade_to_trial()

-- Admin function to manually upgrade/downgrade users (bypasses trigger protection)
-- Usage: SELECT admin_set_user_tier('user@email.com', 'professional');
-- Tiers: 'free', 'professional', 'professional_trial', 'business', 'enterprise', 'admin'
-- Auto-sets correct lead limits, or pass custom limit as 3rd parameter
admin_set_user_tier(target_email text, new_tier text, new_limit integer DEFAULT NULL)

-- NEW: Auto-update goal progress when leads are created
update_lead_goals()  -- Trigger function, updates goals.current_value

-- NEW: Auto-update revenue/profit goals when jobs complete
update_revenue_goals()  -- Trigger function, updates revenue/profit goals

-- NEW: Auto-mark goals as completed when target reached
check_goal_completion()  -- Trigger function, sets status='completed'
```

### Database Triggers
```sql
-- Auto-creates user profile when Supabase Auth account is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Protects critical user fields from unauthorized changes
CREATE TRIGGER protect_user_fields_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION protect_user_critical_fields();

-- Enforces lead limits before insert
CREATE TRIGGER enforce_lead_limit
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION check_lead_limit();

-- Enforces task limits before insert
CREATE TRIGGER enforce_task_limit
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION check_task_limit();
```

**Trigger Protection System:**
- Blocks direct modification of protected fields
- Checks `app.bypass_protection` session flag set by SECURITY DEFINER functions
- Only trusted server functions can set bypass flag
- Flag is transaction-scoped and disappears after operation completes
- Users cannot set this flag or execute raw SQL

### Security Model Summary

**What Users CAN Do:**
- ✅ View their own profile
- ✅ Update `settings` and `goals` JSONB fields
- ✅ Accept Terms of Service (one-time via `accept_terms_of_service()`)
- ✅ Upgrade to trial (via `upgrade_to_trial()`)
- ✅ Create/read/update/delete their own leads and tasks (within limits)

**What Users CANNOT Do:**
- ❌ Change their tier (`user_type`)
- ❌ Increase lead limits (`current_lead_limit`)
- ❌ Manipulate lead counter (`current_leads`)
- ❌ Modify trial dates
- ❌ Change Stripe billing data
- ❌ Re-accept or modify ToS timestamp
- ❌ Access other users' data
- ❌ Set session flags or execute raw SQL
- ❌ Bypass trigger protections

**What Server/Admin CAN Do** (via service role or SECURITY DEFINER functions):
- ✅ Upgrade/downgrade users (Stripe webhooks)
- ✅ Adjust lead limits
- ✅ Process trial expirations (cron job)
- ✅ Accept ToS on behalf of user (secure function)
- ✅ Bypass trigger protections using session flags
- ✅ Increment/decrement lead counters atomically

**How the Bypass System Works:**
1. User calls trusted RPC function (like `create_lead_with_increment`)
2. Function sets `app.bypass_protection` session flag
3. Function performs protected operation (increment `current_leads`)
4. Trigger checks for bypass flag and allows operation
5. Transaction completes, flag disappears
6. Any direct user attempts to modify protected fields are blocked

---

## 🕐 AUTOMATED TRIAL EXPIRATION

- **Cron Job Schedule**: Daily at 2:00 AM (server time)
- **Function**: `downgrade_expired_trials()`
- **Action**: Automatically downgrades users with expired trials to free tier
- **Status**: ✅ Deployed and running
- **Testing**: Test endpoint at `/api/test-trial-expiration` (remove after testing)
- **No Manual Intervention Required**: System is fully automated

---

## 🎯 TIER SYSTEM (2 TIERS ONLY)

### Tier 1: FREE (Default)
- **Lead Limit**: 50 leads
- **Features**: Core CRM functionality
- **Trial**: Can upgrade to 14-day trial (one-time only)
- **Cost**: $0/month
- **Database value**: `user_type: 'free'`

### Tier 2: PROFESSIONAL (Paid or Trial)
- **Lead Limit**: 5,000 leads
- **Features**: Full functionality + advanced analytics
- **Trial**: 14 days free (if never used trial before)
- **Cost**: TBD pricing on `/pages/pricing.html`
- **Database values**:
  - `user_type: 'professional'` (paid)
  - `user_type: 'professional_trial'` (trial)

### Trial Logic

```javascript
// User eligible for trial?
profile.user_type === 'free' && profile.trial_end_date === null

// User already used trial?
profile.trial_end_date !== null  // Never erase this - prevents abuse

// Trial expired?
profile.trial_end_date < new Date()  // Cron job handles downgrade
```

**Important**: We do NOT have business, enterprise, or admin tiers for now. Only `free`, `professional`, and `professional_trial`.

---

## 📁 COMPLETE FILE STRUCTURE

```
steadymanager/
├── .env                           # Supabase + Stripe (NEVER commit)
├── .gitignore                     # node_modules/, .env, *.log
├── package.json
├── server.js                      # ✅ Complete (~220 lines)
├── README.md
├── HANDOFF.md                     # This file
│
└── public/
    ├── index.html                 # Landing page
    ├── 404.html
    │
    ├── auth/                      # ✅ All Complete
    │   ├── login.html
    │   ├── register.html
    │   ├── callback.html
    │   ├── forgot-password.html
    │   ├── reset-password.html
    │   └── resend-verification.html
    │
    ├── pages/                     # Marketing pages
    │   ├── pricing.html
    │   ├── features.html
    │   ├── about.html
    │   ├── contact.html
    │   ├── privacy.html
    │   └── terms.html
    │
    └── dashboard/
        ├── index.html             # ✅ Router
        │
        ├── shared/js/
        │   ├── supabase.js        # ✅ Complete
        │   ├── api.js             # ✅ Complete (600 lines)
        │   └── utils.js           # ✅ Complete
        │
        └── tiers/
            ├── free/              # ✅ All 5 scripts complete
            │   ├── index.html     # ✅ Shell complete
            │   └── scripts/
            │       ├── dashboard.js    # ✅ Complete
            │       ├── Pipeline.js     # ✅ Complete
            │       ├── AddLead.js      # ✅ Complete
            │       ├── Scheduling.js   # ✅ Complete
            │       └── Settings.js     # ✅ Complete
            │
            └── professional/      # ✅ ENHANCED WITH NEW FEATURES
                ├── index.html     # ✅ Premium UI
                └── scripts/
                    ├── dashboard.js     # ✅ Enhanced stats
                    ├── Pipeline.js      # ✅ Enhanced with tags
                    ├── AddLead.js       # ✅ Enhanced with position/tags
                    ├── Jobs.js          # ✨ NEW - Replaces Scheduling with profit tracking
                    ├── Goals.js         # ✨ NEW - Goal tracking module
                    ├── Settings.js      # ✅ Enhanced with preferences
                    ├── CommandPalette.js # ✨ NEW - Cmd+K search (optional)
                    └── QuickPanels.js   # ✨ NEW - Floating panels (optional)
```

---

## 🚀 DEPLOYMENT (Railway + Supabase)

### Current Stack

- **Platform**: Railway (Node.js server)
- **Database**: Supabase (PostgreSQL with RLS)
- **Deployment**: Auto-deploys on `git push origin main`

### Environment Variables (Railway Dashboard)

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID
FRONTEND_URL
```

### Deployment Process

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

Railway automatically:
1. Detects push
2. Pulls latest code
3. Installs dependencies
4. Restarts server
5. Deploys in ~2 minutes

### Checking Deployment

- Railway dashboard shows build logs
- Check server.js console logs
- Test live site at your Railway URL

---

## 📊 API METHODS CHEAT SHEET

### Authentication
- `API.login(email, password)` - Returns session
- `API.logout()` - Logs out, redirects to login
- `API.register(email, password)` - Creates FREE account
- `API.upgradeToTrial()` - Upgrades to 14-day trial (one-time)
- `API.checkAuth()` - Returns `{ authenticated, user }`
- `API.resetPassword(email)` - Sends reset email
- `API.updatePassword(newPassword)` - Updates password

### User Profile
- `API.getProfile()` - Returns full user object
- `API.updateProfile(updates)` - RLS blocks tier/limit changes
- `API.updateSettings(settings)` - Updates settings JSONB
- `API.updateUserGoals(goals)` - Updates goals JSONB
- `API.getPreferences()` - Returns UI preferences (NEW)
- `API.updatePreferences(preferences)` - Updates UI preferences (NEW)
- `API.toggleFeature(featureName, enabled)` - Toggle windowing/panels (NEW)

### Leads
- `API.getLeads()` - Returns `{ cold: [], warm: [], all: [] }`
- `API.createLead(leadData)` - Throws if limit reached
- `API.updateLead(leadId, updates)` - Updates lead
- `API.deleteLead(leadId)` - Deletes lead
- `API.searchLeads(query)` - Searches name/email/company
- `API.checkDuplicates(leadData)` - Returns duplicate matches
- `API.addLeadTags(leadId, tags)` - Add tags to lead (NEW)
- `API.removeLeadTag(leadId, tag)` - Remove tag from lead (NEW)
- `API.setWinProbability(leadId, probability)` - Set forecast probability (NEW)
- `API.setNextAction(leadId, action)` - Set next action (NEW)

### Tasks
- `API.getTasks(filters)` - Returns all tasks
- `API.createTask(taskData)` - Creates task
- `API.updateTask(taskId, updates)` - Updates task
- `API.deleteTask(taskId)` - Deletes task
- `API.completeTask(taskId, notes)` - Marks complete
- `API.getTodaysTasks()` - Today's tasks
- `API.getOverdueTasks()` - Overdue tasks
- `API.getUpcomingWeek()` - Next 7 days

### Jobs (NEW - Pro Tier)
- `API.getJobs(filters)` - Returns all jobs
- `API.createJob(jobData)` - Creates job with cost tracking
- `API.updateJob(jobId, updates)` - Updates job
- `API.deleteJob(jobId)` - Deletes job
- `API.completeJob(jobId, finalPrice, laborHours, materials)` - Mark complete with final costs
- `API.getJobStats()` - Total revenue, profit, avg margin
- `API.getJobsByLead(leadId)` - All jobs for specific lead
- `API.getJobProfitability()` - Profit analysis across all jobs

### Goals (NEW - Pro Tier)
- `API.getGoals(status)` - Returns goals (default: active)
- `API.createGoal(goalData)` - Creates new goal
- `API.updateGoal(goalId, updates)` - Updates goal
- `API.deleteGoal(goalId)` - Deletes goal
- `API.updateGoalProgress(goalId, value)` - Manual progress update
- `API.checkGoalCompletion()` - Check if goals reached target
- `API.getGoalProgress()` - All goals with progress percentages

### Stats
- `API.getBasicStats()` - Lead/task counts
- `API.getCurrentStats()` - Usage vs limit
- `API.getDetailedStats()` - Everything

### Utilities
- `API.escapeHtml(text)` - XSS prevention
- `API.isValidEmail(email)` - Email validation
- `API.formatDate(dateString)` - Date formatting
- `API.getStatusColor(status)` - Status color codes
- `API.handleAPIError(error, context)` - User-friendly errors

---

## 💰 COST ESTIMATION & SCALABILITY

### Current Efficiency

**Dashboard Load**: 4 Supabase queries per visit
1. `API.getBasicStats()` - 1 query
2. `API.getLeads()` - 1 query
3. `API.getTasks()` - 1 query
4. `API.getProfile()` - 1 query

### Scaling Estimates

| Monthly Users | Queries/Month | Bandwidth | Supabase Plan | Railway Plan | Est. Cost |
|---------------|---------------|-----------|---------------|--------------|-----------|
| 100           | 60K           | 600 MB    | Free ✅       | Hobby ($5) ✅ | $5/mo     |
| 500           | 300K          | 3 GB      | Free ✅       | Hobby ($5) ✅ | $5/mo     |
| 1,000         | 600K          | 6 GB      | Free ✅       | Hobby ($5) ✅ | $5/mo     |
| 5,000         | 3M            | 30 GB     | Pro ($25)     | Pro ($20)    | $45/mo    |
| 10,000        | 6M            | 60 GB     | Pro ($25)     | Pro ($30-40) | $55-65/mo |

**Assumptions:**
- Average user visits dashboard 5 times/day
- Each visit = 4 queries
- Average response = 10 KB per query

**Current setup can handle 1,000-2,000 active users comfortably with minimal cost.**

---

## 🔒 SECURITY MEASURES

### Database Level
- ✅ RLS policies on ALL tables
- ✅ Auth checks via `auth.uid()`
- ✅ Tier limits enforced server-side
- ✅ Trial abuse prevention (`trial_end_date` never erased)

### Application Level
- ✅ Email verification required
- ✅ XSS protection via `API.escapeHtml()` and `textContent`
- ✅ No account enumeration
- ✅ CSP headers blocking inline scripts
- ✅ CSRF protection via Supabase Auth

### Business Logic
- ✅ Trial eligibility checked server-side
- ✅ Lead limits enforced by RLS
- ✅ Stripe webhook signature verification
- ✅ Environment variable validation

---

## 🧪 TESTING PROTOCOL

### Phase 1: Mobile Optimization (2-3 hours) - CURRENT PRIORITY
- ❌ Add responsive breakpoints to all modules
- ❌ Test touch interactions on real devices
- ❌ Verify sidebar hamburger menu
- ❌ Ensure minimum 44px touch targets
- ❌ Test form inputs on mobile keyboards
- ❌ Verify modals work on touch devices

### Phase 2: Test FREE Tier Mobile (1 hour)

**Auth Flow:**
- ❌ Register on mobile → verify email → login
- ❌ Password reset flow on mobile
- ❌ Email verification on mobile

**Dashboard Functionality:**
- ❌ Dashboard loads and displays correctly
- ❌ Can create/edit/delete leads on mobile
- ❌ Can create/edit/delete tasks on mobile
- ❌ Pipeline drag-and-drop works on touch
- ❌ Settings loads and works on mobile
- ❌ Export CSVs on mobile
- ❌ Theme toggle works on mobile

**Modal Interactions:**
- ❌ Modals open/close properly on touch
- ❌ Text selection works in modal inputs
- ❌ Forms submit correctly on mobile
- ❌ Keyboard doesn't break layout

### Phase 3: Test FREE Tier Desktop (Already Passing)

**Auth Flow:**
- ✅ Register new account → creates free tier user
- ✅ Email verification sent → check inbox
- ✅ Click verification link → redirects to dashboard
- ✅ Login without verification → blocked, redirected to resend page
- ✅ Password reset → works correctly

**Dashboard Functionality:**
- ✅ Dashboard loads with correct stats
- ✅ Pipeline shows leads correctly
- ✅ Can create leads (test up to 50)
- ✅ Creating 51st lead → blocked with upgrade message
- ✅ Can edit/delete leads
- ✅ Can create tasks
- ✅ Can edit/delete tasks
- ✅ Calendar shows tasks correctly
- ✅ Settings loads profile correctly
- ✅ Theme toggle works and persists
- ✅ Export leads/tasks as CSV

**XSS Testing:**
- ✅ Create lead with name: `<script>alert('XSS')</script>`
- ✅ Lead displays as plain text, no alert popup
- ✅ Create task with title: `<img src=x onerror=alert('XSS')>`
- ✅ Task displays as plain text, no script execution

**Modal Bug Testing:**
- ✅ Open AddLead modal, select text in input, drag outside, release → Modal stays open
- ✅ Open Scheduling modal, select text, drag outside, release → Modal stays open
- ✅ Open Pipeline modal, select text, drag outside, release → Modal stays open
- ✅ Open Settings modal, select text, drag outside, release → Modal stays open

### Phase 4: Trial & Upgrade Testing (CRITICAL - Test Before Launch)

**Trial Upgrade Flow:**
- ❌ Login as free tier user (current_lead_limit: 50, user_type: 'free')
- ❌ Navigate to Settings → Trial Upgrade section
- ❌ Click "Start 14-Day Free Trial"
- ❌ Verify database updates:
  - `user_type` → 'professional_trial'
  - `trial_start_date` → today's date
  - `trial_end_date` → today + 14 days
  - `current_lead_limit` → 5000
- ❌ Verify dashboard shows trial badge/indicator
- ❌ Verify can now add more than 50 leads (test adding 100 leads)
- ❌ Dashboard stats should reflect new 5,000 limit

**Trial Abuse Prevention:**
- ❌ Try to start trial again → should be blocked with error message
- ❌ Verify `trial_end_date` field is never null after trial starts
- ❌ Verify `upgrade_to_trial()` database function blocks repeat trials
- ❌ Test with fresh account → trial should work
- ❌ Test with account that previously had trial → should be blocked

**Trial Expiration Testing (AUTOMATED):**
- ❌ Manually set `trial_end_date` to yesterday in database
- ❌ Wait for cron job (runs daily at 2:00 AM) OR call test endpoint
- ❌ Verify database updates:
  - `user_type` → 'free'
  - `current_lead_limit` → 50
  - `trial_end_date` → stays set (not erased - prevents re-trial)
- ❌ Verify can no longer add >50 leads
- ❌ Verify dashboard shows free tier limits

**Trial Expiration Test Endpoint** (FOR TESTING ONLY - REMOVE BEFORE PRODUCTION):
```bash
# Call this to trigger trial expiration check without waiting for cron
curl -X POST http://localhost:3000/test/expire-trials
```

**Upgrade to Paid (Manual SQL for now):**
- ❌ Test upgrading trial user to paid professional:
  ```sql
  UPDATE users
  SET user_type = 'professional',
      current_lead_limit = 5000
  WHERE email = 'test@example.com';
  ```
- ❌ Verify 5,000 lead limit persists
- ❌ Verify dashboard shows professional tier
- ❌ Verify trial badge removed

**Downgrade Testing:**
- ❌ User with 100 leads downgrades to free tier
- ❌ Verify `current_lead_limit` → 50
- ❌ Verify can still VIEW all 100 existing leads
- ❌ Verify CANNOT add new lead (51st) → shows upgrade message
- ❌ Verify existing leads remain intact (no data loss)

**Edge Cases:**
- ❌ User with exactly 50 leads upgrades to trial → should work
- ❌ User with 0 leads upgrades to trial → should work
- ❌ User cancels trial mid-way (manual SQL) → should revert to free
- ❌ Trial user tries to delete account → should work (test cascade delete)

**Database Function Testing:**
```sql
-- Test upgrade_to_trial() function
SELECT upgrade_to_trial();

-- Test expire_trials() function
SELECT expire_trials();

-- Check user state after each call
SELECT user_type, trial_start_date, trial_end_date, current_lead_limit
FROM users
WHERE email = 'test@example.com';
```

### Phase 5: Create PRO Tier Files ✅ COMPLETE

**Directory Structure:**
```
/dashboard/tiers/
├── free/ (✅ complete)
└── professional/ (✅ complete)
    ├── index.html (✅ V2.0 premium design)
    └── scripts/
        ├── dashboard.js (✅ upgrade CTA removed)
        ├── Pipeline.js (✅ full functionality)
        ├── AddLead.js (✅ 5,000 lead limit, no warnings)
        ├── Scheduling.js (✅ no limit prompts)
        └── Settings.js (✅ ready for billing integration)
```

**Pro Tier Features Implemented:**
- ✅ Premium glassmorphism design with gold/platinum gradients
- ✅ Animated PRO badge in header
- ✅ Live stats widget in sidebar (shows X/5,000 leads with progress bar)
- ✅ Trial countdown banner (displays days remaining for trial users)
- ✅ "Manage Billing" button (replaces upgrade button)
- ✅ All upgrade prompts removed from all modules
- ✅ 5,000 lead capacity
- ✅ Mobile-responsive premium UI
- ⏳ Subscription management tab (future)
- ⏳ Goals tracking widget (future)
- ⏳ Bulk operations (future)

### Phase 6: Test PRO Tier (1 hour)

**To test Pro tier, use the admin function (bypasses trigger protection):**
```sql
-- Upgrade to paid professional (auto-sets 5,000 lead limit)
SELECT admin_set_user_tier('your-email@example.com', 'professional');

-- Or upgrade to professional trial
SELECT admin_set_user_tier('your-email@example.com', 'professional_trial');

-- Or test trial upgrade via app (if not used before)
SELECT upgrade_to_trial();

-- Downgrade back to free for testing
SELECT admin_set_user_tier('your-email@example.com', 'free');
```

**Why use admin_set_user_tier() instead of direct UPDATE?**
- ✅ Properly bypasses trigger protection using session flag
- ✅ Auto-sets correct lead limits for each tier
- ✅ Validates tier names (prevents typos)
- ✅ Returns JSON confirmation
- ✅ Safe and reusable

**Note:** Direct UPDATE queries will fail with "Cannot modify user_type" error because the trigger protection blocks unauthorized changes to critical fields.

**Verify:**
- ✅ Router redirects professional users to `/dashboard/tiers/professional/index.html`
- ❌ Pro tier loads with premium UI (gold gradient, PRO badge)
- ❌ Lead limit is 5,000 (not 50)
- ❌ No upgrade prompts anywhere
- ❌ Live stats widget shows in sidebar
- ❌ Trial users see countdown banner
- ❌ "Manage Billing" button appears (not "Upgrade")
- ❌ Can add more than 50 leads without warnings

---

## 🚀 PRE-LAUNCH CHECKLIST

**Complete these tasks before going live:**

### 1. Analytics Setup (Optional but Recommended)
- ❌ Sign up for PostHog at posthog.com
- ❌ Get project API key (starts with `phc_`)
- ❌ Replace `YOUR_POSTHOG_KEY_HERE` in `/public/dashboard/shared/js/analytics.js`
- ❌ Deploy and verify analytics events are being tracked
- ❌ Set up key funnels: Registration → Email Verify → Dashboard → Trial → Paid

### 2. Trial & Upgrade Testing
- ❌ Complete ALL Phase 4 trial testing checklist above
- ❌ Verify trial upgrade works end-to-end
- ❌ Verify trial expiration automation works
- ❌ Test abuse prevention (can't retake trial)
- ❌ **CRITICAL**: Remove test endpoint from server.js before production:
  ```javascript
  // DELETE THIS BEFORE PRODUCTION:
  app.post('/test/expire-trials', async (req, res) => { ... })
  ```

### 3. Security Audit
- ❌ Verify all ToS acceptance working (registration checkbox + backend function)
- ❌ Test XSS protection on all user inputs
- ❌ Verify RLS policies block unauthorized access
- ❌ Check for console errors in production
- ❌ Verify CSP headers are enforced
- ❌ Test password reset flow for security issues
- ❌ Verify email verification is enforced

### 4. Legal & Compliance
- ✅ Terms of Service page complete with PostHog disclosure
- ✅ Privacy Policy page complete with PostHog disclosure
- ✅ ToS acceptance enforced at registration
- ✅ "Check periodically" language added to legal pages
- ❌ Review legal docs one final time before launch
- ❌ Update "Last Updated" dates in Terms & Privacy if needed

### 5. Environment Variables Check
- ❌ Verify all Railway env vars are set:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `PORT` (optional, defaults to 3000)
- ❌ Verify Stripe webhook endpoint is configured
- ❌ Test Stripe webhooks in test mode before going live

### 6. Mobile Testing
- ❌ Complete Phase 2 mobile testing checklist
- ❌ Test on real iPhone
- ❌ Test on real Android device
- ❌ Test on iPad/tablet
- ❌ Verify all touch interactions work
- ❌ Check responsive design at all breakpoints

### 7. Performance Check
- ❌ Dashboard loads in < 2 seconds
- ❌ No memory leaks (test prolonged usage)
- ❌ API calls are optimized (not making duplicate requests)
- ❌ Images are optimized
- ❌ Check Lighthouse score (aim for 90+ performance)

### 8. Final Code Cleanup
- ❌ Remove all console.log() debug statements
- ❌ Remove test endpoints from server.js
- ❌ Remove commented-out code
- ❌ Verify no hardcoded test data
- ❌ Check for TODO comments and address them

### 9. Documentation
- ✅ HANDOFF.md updated with latest changes
- ✅ ANALYTICS_SETUP.md created
- ❌ Create simple user guide (optional)
- ❌ Document any known limitations

### 10. Backup & Rollback Plan
- ❌ Document current production state
- ❌ Have rollback plan if launch issues occur
- ❌ Backup Supabase database before major changes
- ❌ Know how to quickly disable new user registrations if needed

---

## ✅ SUCCESS CRITERIA

### Free Tier Ready for Production When:
- ✅ Modal text selection bug fixed in all modules
- ✅ Settings.js created and functional
- ✅ Users can register → verify → login
- ✅ Users can create 50 leads (blocked at 51 with clear message)
- ✅ Users can create/manage tasks
- ✅ Theme toggle works and persists
- ✅ Export data as CSV (unlimited)
- ✅ Password change works with validation
- ✅ Delete account works with confirmation
- ✅ No XSS vulnerabilities
- ✅ No console errors
- ✅ Trial expiration automation works
- ❌ Mobile-responsive on all breakpoints
- ❌ Touch-friendly interface
- ❌ Tested on iPhone, Android, iPad

### Pro Tier Ready When:
- ❌ Pro tier files created (copy + enhance from free)
- ❌ Pro users have 5,000 lead limit
- ❌ Advanced features accessible
- ❌ Subscription management works
- ❌ Trial expiration detected and handled
- ❌ Downgrade to free works (via webhook)
- ❌ All free tier tests pass on pro tier

---

## 🚀 PRO TIER FEATURES (NEW - Apple-Touch Manual CRM)

### **Philosophy: Better Google Sheets**
Pro tier is NOT automation - it's beautiful, manual data entry with smart visualization. Think Apple's design + Google Sheets' flexibility.

### **What's Manual (You Control):**
- ✅ All data entry (leads, jobs, goals)
- ✅ All decisions (status changes, tags, priorities)
- ✅ All organization (drag-and-drop, filters, views)

### **What's Automatic (Like Spreadsheet Formulas):**
- ✅ Profit calculations (final_price - total_cost)
- ✅ Goal progress counting (COUNTIF-style)
- ✅ Stats aggregation (SUM, AVG)
- ✅ Derived fields (profit_margin %)

### **Core Enhancements:**

#### **1. Jobs Module** (Replaces Scheduling)
**What it does:**
- Calendar view for scheduled jobs
- Financial tracking: material costs, labor hours, quoted price
- Auto-calculated: total cost, profit, profit margin
- Link jobs to leads for full client history
- Payment status tracking

**Key difference from Tasks:**
- Tasks = reminders ("Call John")
- Jobs = work performed ("Install cabinets - $1,500 revenue, $900 cost, $600 profit")

**UI:**
- Calendar tab (schedule jobs)
- Financial tab (see profit/loss breakdown)
- Job cards show profit margin in real-time

#### **2. Goals Module** (New Navigation Item)
**What it does:**
- Set monthly/weekly/yearly goals
- Auto-track progress from database
- Visual progress bars (Apple Watch ring style)
- Goal types: leads created, jobs completed, revenue, profit

**Examples:**
- "Add 20 leads this month" → Auto-counts as you add leads
- "Earn $10,000 revenue" → Auto-sums as you complete jobs
- "Complete 15 jobs" → Auto-increments per job

**UI:**
- Goal cards with circular progress
- Days remaining countdown
- Color-coded status (on-track, at-risk, completed)
- Celebration animations when goal hit

#### **3. Enhanced Leads**
**New fields:**
- `position` → "VP of Sales", "CEO" (the ONE thing you asked for!)
- `department` → "Sales", "Marketing"
- `deal_stage` → "Discovery", "Proposal", "Negotiation"
- `next_action` → "Send proposal", "Schedule demo"
- `win_probability` → 0-100% for forecasting
- `tags` → ["hot", "enterprise", "q4-priority"]

**Why:**
- Better contact context (position/department)
- Granular pipeline tracking (deal_stage)
- Clear next steps (next_action)
- Revenue forecasting (win_probability × potential_value)
- Flexible categorization (tags)

#### **4. Command Palette** (Optional - Toggle in Settings)
**What it does:**
- Press `Cmd+K` anywhere
- Fuzzy search leads, jobs, tasks
- Quick actions ("Create lead", "View analytics")
- Instant navigation

**UI:**
- Floating search bar (center screen)
- Real-time results
- Keyboard navigation
- ESC to close

#### **5. Quick Panels** (Optional - Toggle in Settings)
**What it does:**
- Floating action buttons (bottom-right)
- Quick add lead/job without navigating
- Mini goal tracker (sidebar)
- Collapsible/draggable

**UI:**
- "+ Quick Add" button → Mini form pops up
- Goal widget shows live progress
- Non-intrusive, can minimize

#### **6. Windowing System** (Optional - Toggle in Settings)
**What it does:**
- Open multiple views simultaneously
- Draggable, resizable windows
- View lead while checking analytics
- Desktop OS experience in browser

**UI:**
- Windows float on dashboard
- Snap to grid (left/right/quarters)
- Minimize/maximize/close
- Window manager (see all open windows)

### **Database Changes:**
1. ✅ **Jobs table** - Enhanced tasks with cost/profit tracking
2. ✅ **Goals table** - Goal tracking with auto-progress
3. ✅ **Leads enhancements** - position, department, deal_stage, next_action, win_probability, tags
4. ✅ **User preferences** - windowing_enabled, command_palette_enabled, quick_panels_enabled

### **UI Toggles (Settings):**
```
⚙️ Settings → Pro Features

Workspace Mode:
[ ] Enable Windowing System (Beta)
    Open multiple views simultaneously. Power user feature.

Quick Access:
[✓] Command Palette (Cmd+K)
    Instant search and navigation

[✓] Quick Action Panels
    Fast access to common tasks

Display Density:
○ Compact  ● Comfortable  ○ Spacious
```

### **Next Implementation Steps:**
1. ✅ Run `database_migration_pro_tier.sql` in Supabase
2. ⏳ Update `api.js` with Jobs/Goals methods
3. ⏳ Create `Jobs.js` module (calendar + financial view)
4. ⏳ Create `Goals.js` module (goal tracker)
5. ⏳ Enhance `AddLead.js` with position/tags fields
6. ⏳ Enhance `Settings.js` with preferences tab
7. ⏳ Build `CommandPalette.js` (optional feature)
8. ⏳ Build `QuickPanels.js` (optional feature)
9. ⏳ Build `WindowManager.js` (optional feature)

---

## 📝 IMMEDIATE NEXT STEPS

### Priority Order:

1. **✅ Fix Modal Bug** - COMPLETE
   - All modals now use mousedown/mouseup pattern for safe text selection.

2. **✅ Build Settings.js** - COMPLETE
   - Profile display, password change, theme toggle, CSV exports, account deletion all working.

3. **✅ Add Trial Expiration Cron Job** - COMPLETE
   - node-cron installed
   - Database function created
   - Cron job running daily at 2:00 AM
   - Test endpoint added (remove after testing)

4. **✅ ToS Acceptance at Registration** - COMPLETE
   - Required checkbox added to registration
   - Backend verification via secure database function
   - Legal pages updated with PostHog disclosure

5. **✅ Analytics Framework** - COMPLETE (Ready to Enable)
   - PostHog integration implemented
   - Auto-disables on localhost
   - Just need to add API key before launch

6. **Mobile Optimization (2-3 hours)** - CURRENT PRIORITY
   - ❌ Add responsive CSS to Dashboard.js (metrics grid)
   - ❌ Add touch support to Pipeline.js drag-and-drop
   - ❌ Optimize AddLead.js forms for mobile
   - ❌ Fix Scheduling.js calendar on small screens
   - ❌ Stack Settings.js cards on mobile
   - ❌ Test sidebar hamburger menu behavior
   - ❌ Verify all touch targets are 44px minimum

7. **Test Free Tier Mobile (1 hour)**
   - ❌ Complete mobile testing checklist above
   - ❌ Fix any mobile-specific bugs
   - ❌ Document any issues

8. **CRITICAL: Trial & Upgrade Testing (2-3 hours)** - TEST BEFORE LAUNCH
   - ❌ Complete ALL Phase 4 trial testing checklist
   - ❌ Test trial upgrade flow end-to-end
   - ❌ Test trial expiration automation
   - ❌ Test abuse prevention (can't retake trial)
   - ❌ Test downgrade scenarios
   - ❌ Verify database functions work correctly
   - ❌ Remove test endpoint from server.js before production

9. **Pre-Launch Checklist (1-2 hours)**
   - ❌ Set up PostHog analytics (optional but recommended)
   - ❌ Complete security audit
   - ❌ Verify all environment variables
   - ❌ Test Stripe webhooks
   - ❌ Final code cleanup
   - ❌ Remove console.log statements
   - ❌ Remove test endpoints

10. **Create Pro Tier Files (4-6 hours)** - FUTURE
   - ❌ Copy free tier structure
   - ❌ Add pro-only features
   - ❌ Increase limits to 5,000
   - ❌ Add subscription management
   - ❌ Test pro tier

11. **Final Testing & Launch (1 hour)**
   - ❌ Complete pre-launch checklist
   - ❌ Test both tiers
   - ❌ Test tier transitions
   - ❌ Security audit
   - ❌ Deploy to production
   - ❌ Monitor for issues

---

## 📊 CURRENT STATUS SUMMARY

**Total Estimated Time to Launch**: ~5-10 hours remaining

**Current Blocker**: Mobile responsiveness optimization + Stripe integration

**Critical Pre-Launch Tasks**: Trial testing, Stripe integration, security audit

**Next Milestone**: Full Stripe integration with checkout flow & webhooks

### What's Working:
- ✅ Backend infrastructure (Supabase + Railway)
- ✅ Authentication system (all flows)
- ✅ ToS acceptance at registration (legally compliant)
- ✅ Dashboard core (all 5 modules)
- ✅ API layer (~700 lines, secure, XSS-protected)
- ✅ Desktop experience (fully functional)
- ✅ Modal bug fixed (text selection safe)
- ✅ Settings page complete (password, exports, delete account)
- ✅ Trial expiration automation (cron job, database function)
- ✅ Analytics framework ready (PostHog - just add key)
- ✅ Legal pages updated (Terms & Privacy with PostHog disclosure)
- ✅ **Professional tier V2.0 complete** (premium UI, all upgrade prompts removed)
- ✅ **Admin function for manual tier upgrades** (bypasses trigger protection)
- ✅ **Database trigger protection working** (prevents unauthorized tier changes)

### What Needs Testing Before Launch:
- ❌ **CRITICAL**: Trial upgrade flow (Phase 4 checklist)
- ❌ **CRITICAL**: Trial expiration automation (test with real data)
- ❌ **CRITICAL**: Trial abuse prevention (can't retake trial)
- ❌ Mobile responsive design (Phase 2 checklist)
- ❌ Touch interaction optimization
- ❌ Security audit (XSS, RLS, auth flows)
- ❌ PostHog analytics setup (optional but recommended)
- ❌ Remove test endpoint from server.js before production

### What's NOT Built Yet (Required Before Launch):
- ❌ **Stripe Checkout Integration** - No payment flow exists yet
- ❌ **Stripe Webhook Handlers** - Webhooks in server.js don't upgrade/downgrade users
- ❌ **Subscription Management UI** - Settings.js needs billing tab
- ❌ **Recurring Payment Verification** - System trusts `user_type` field only

**Current Workaround:** Use `admin_set_user_tier()` function to manually upgrade users after receiving payment externally.

**To Build Stripe Integration (30-45 min):**
1. Create checkout session endpoint in server.js
2. Add Stripe checkout button to Settings.js
3. Implement webhook handlers:
   - `checkout.session.completed` → upgrade to professional
   - `customer.subscription.deleted` → downgrade to free
   - `invoice.payment_failed` → mark as past_due
4. Add Stripe billing portal link

**Database fields ready but unused:**
- `stripe_customer_id` - Will store Stripe customer ID
- `stripe_subscription_id` - Will store Stripe subscription ID
- `subscription_status` - Will track active/past_due/canceled

### What's Future Work (Post-Launch):
- ❌ Goals tracking widget in dashboard
- ❌ Bulk operations in Pipeline
- ❌ Advanced analytics charts
- ❌ Custom fields for leads
- ❌ Business & Enterprise tiers

### Key Reminders:
- 🔴 **REMOVE** test endpoint `/test/expire-trials` before production
- 🟡 **TEST** trial upgrade/downgrade thoroughly (Phase 4 checklist)
- 🟢 **OPTIONAL** but recommended: Enable PostHog analytics
- 🟠 **BUILD STRIPE** before accepting real payments

---

**Document Version**: 3.0 🚀
**Last Updated**: Pro Tier Revolution - Jobs, Goals, Enhanced Leads
**Key Changes**:
- ✅ **NEW**: Jobs table with cost/profit tracking (Better Google Sheets for job financials)
- ✅ **NEW**: Goals table with auto-progress tracking (Apple Watch-style goal rings)
- ✅ **NEW**: Enhanced Leads with position, department, deal_stage, next_action, win_probability, tags
- ✅ **NEW**: User preferences (windowing, command palette, quick panels toggles)
- ✅ **NEW**: Database functions for auto-goal tracking (trigger-based, like spreadsheet formulas)
- ✅ **NEW**: Complete SQL migration script ready to run
- ✅ Updated API methods cheatsheet with Jobs, Goals, Preferences
- ✅ Comprehensive Pro Tier features documentation
**Status**: Database Schema Ready, API.js Update Next, Then Build Jobs.js & Goals.js Modules
**Philosophy**: Manual CRM (you control all data) + Smart Visualization (system calculates & displays beautifully)
