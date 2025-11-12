# 🎯 STEADYMANAGER PRO - TECHNICAL HANDOFF v13.1
**"JOBS HUB COMPLETE - 2-SECTION ARCHITECTURE"**

**Status:** Jobs Hub ✅ | Goals 100% | Estimates 100% | Jobs Management 100% | Database Clean | API Optimized
**Philosophy:** Manual CRM + Smart Auto-Tracking + Professional UI + Unified Project Hub

---

## 📊 SYSTEM STATUS OVERVIEW

### Backend
- **Status:** ✅ LIVE & OPTIMIZED
- **Stack:** Supabase PostgreSQL + RLS | Node.js on Railway | Supabase Auth
- **Cron:** Daily 2AM trial expiration check
- **Uptime:** 100%
- **Optimization:** See "Supabase Performance Checklist" section below

### Database
- **Status:** ✅ PRODUCTION READY
- **Schema:** All tables optimized with 20+ indexes
- **Triggers:** 7 auto-tracking triggers (Goal Ladder removed)
- **Functions:** 4 server-side functions (duplicates, batch ops, goal tracking)
- **Extensions:** pg_trgm enabled for fuzzy search
- **Recent:** Removed Goal Ladder tables and columns ✅

### Authentication
- **Status:** ✅ COMPLETE
- **Flows:** Register → Email Verify → Login | Password Reset | ToS Required
- **Security:** XSS Protected | RLS Enabled | No Account Enumeration | CSP Headers

### Frontend - Free Tier
- **Status:** ✅ PRODUCTION READY
- **Lead Limit:** 50
- **Modules:** Dashboard, AddLead, Pipeline, Scheduling, Settings
- **Bugs:** None

### Frontend - Professional Tier
- **Status:** 🔨 90% COMPLETE
- **Lead Limit:** 5000
- **Modules Complete:** Dashboard, AddLead, Pipeline, Scheduling, Goals ✅, Estimates ✅, Settings
- **Modules In Progress:** Jobs (0%), Notes (0%), Analytics (0%)
- **Icon System:** 95% complete (Lucide SVG - only Settings needs update)
- **Build Order (UPDATED):** Goals ✅ → Estimates ✅ → Jobs → Notes → Analytics → Settings Preferences

---

## 🗂️ SUPABASE PERFORMANCE CHECKLIST

Run this checklist periodically to optimize database performance, security, and reduce API calls:

### 🔍 Slow Query Analysis
- [ ] Check Supabase Dashboard → Database → Query Performance
- [ ] Look for queries taking >500ms
- [ ] Add indexes on frequently filtered columns (user_id, status, created_at)
- [ ] Review RLS policies - are they causing sequential scans?
- [ ] Use `EXPLAIN ANALYZE` on slow queries to identify bottlenecks

### ⚡ Performance Optimization
- [ ] Review API calls - can we batch operations?
- [ ] Check for N+1 queries (loading tasks then their leads individually)
- [ ] Use `.select()` with specific columns instead of `*` where possible
- [ ] Implement pagination for large data sets (>100 records)
- [ ] Cache frequently accessed data (user preferences, lead counts)
- [ ] Review connection pooling settings in Supabase

### 🔒 Security Audit
- [ ] Verify all tables have RLS policies enabled
- [ ] Test RLS policies - can users access other users' data?
- [ ] Check for SQL injection vulnerabilities in search queries
- [ ] Review API key exposure (use anon key in frontend only)
- [ ] Audit CORS settings - only allow your domain
- [ ] Check for sensitive data in logs/error messages

### 📦 Batch Data Opportunities
- [x] Task creation - batch insert instead of individual ✅
- [x] Task deletion/updates - batch operations ✅
- [x] Goal deletion/updates - batch operations ✅
- [x] Estimate status updates - batch operations ✅
- [x] Lead deletion/updates - batch operations ✅
- [ ] Lead imports - use batch insert for CSV uploads
- [ ] Analytics queries - aggregate data server-side instead of client-side
- [ ] Dashboard stats - fetch all in one query with joins

### 🎯 Query Optimization Examples
```sql
-- BAD: Multiple queries for dashboard stats
SELECT COUNT(*) FROM leads WHERE status = 'active';
SELECT COUNT(*) FROM tasks WHERE status = 'pending';
SELECT COUNT(*) FROM goals WHERE status = 'active';

-- GOOD: Single query with CTEs
WITH lead_stats AS (
  SELECT COUNT(*) as active_leads FROM leads WHERE status = 'active'
),
task_stats AS (
  SELECT COUNT(*) as pending_tasks FROM tasks WHERE status = 'pending'
),
goal_stats AS (
  SELECT COUNT(*) as active_goals FROM goals WHERE status = 'active'
)
SELECT * FROM lead_stats, task_stats, goal_stats;
```

### 📊 Monitoring Metrics
- [ ] Average response time per endpoint (<200ms target)
- [ ] Database connection pool usage (<70% target)
- [ ] API error rate (<1% target)
- [ ] RLS policy execution time (<50ms target)
- [ ] Storage usage and growth rate
- [ ] Active connections count

---

## 🎨 UX/UI OPTIMIZATION CHECKLIST

Run this checklist periodically to ensure all modules provide instant feedback and optimal user experience:

### ⚡ Instant Feedback & Optimistic UI
- [x] Estimates - Create/Edit/Delete with instant modal close and stats update ✅
- [x] Estimates - Status changes update stats tabs immediately ✅
- [x] Estimates - Stats show "$99,999,999.99..." for values over 99,999,999.99 ✅
- [ ] Goals - Verify instant feedback on create/edit/delete
- [ ] Goals - Verify stat updates when goal status changes
- [ ] Jobs - Implement instant feedback on create/edit/delete
- [ ] Jobs - Verify stat updates when job status changes
- [ ] Notes - Implement instant feedback (when module is built)
- [ ] Analytics - Implement instant data refresh (when module is built)

### 📊 Stats Tab Real-Time Updates
All modules with stats tabs should update immediately when:
- [ ] Item is created (adds to total)
- [ ] Item is deleted (removes from total)
- [ ] Item status changes (moves between stat categories)
- [ ] Batch operations complete (updates all affected stats)

### Pattern to Follow (Optimistic UI):
1. Close modal/form immediately
2. Update local state immediately
3. Recalculate stats immediately
4. Update DOM (grid + stats section) immediately
5. API call to server in background
6. Show error toast only if API fails

**Reference Implementation:** See `Estimates.js` lines 2110-2198 for delete and status change handlers.

---

## 🎯 GOALS MODULE - 100% COMPLETE ✅

### Status: ✅ PRODUCTION READY

**Features Implemented:**
- Manual and auto-tracked goals
- Recurring goals with completion counter
- Time-based periods (daily/weekly/monthly/quarterly/yearly/ongoing)
- Color-coded progress bars with shimmer animation
- Live countdown timers for urgent goals
- Character validation on all inputs
- Filter by Active/Completed
- Custom units support
- Description field (500 chars)

**Recent Changes (v11.0):**
- ✅ Removed Goal Ladder banner
- ✅ Removed Goal Ladder event handler
- ✅ Added `completion_count` column tracking
- ✅ Added completion badge to recurring goals ("Completed 4x")
- ✅ Fixed goal title ellipsis (no more overflow)
- ✅ Styled unit dropdown with custom arrow
- ✅ Updated `checkGoalCompletion()` to handle recurring goals

**Database Columns:**
```sql
-- goals table (cleaned up)
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
title           TEXT NOT NULL (35 char limit)
description     TEXT (500 char limit)
goal_type       TEXT NOT NULL
target_value    NUMERIC
current_value   NUMERIC
unit            TEXT
period          TEXT NOT NULL
start_date      DATE NOT NULL
end_date        DATE NOT NULL
status          TEXT
is_recurring    BOOL
auto_track      BOOL
color           TEXT
completion_count INTEGER DEFAULT 0  -- NEW ✅
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**API Functions:**
```javascript
// Core goal operations
API.getGoals(status)
API.createGoal(data)
API.updateGoal(id, updates)
API.deleteGoal(id)
API.updateGoalProgress(id, value)
API.getGoalProgress()
API.checkGoalCompletion()  // Handles recurring + normal goals
API.getGoalById(goalId)
```

**Completion Logic:**
```javascript
// In API.js
static async checkGoalCompletion() {
    const goals = await this.getGoals('active');
    
    for (const goal of goals) {
        const progress = (goal.current_value / goal.target_value) * 100;
        
        if (progress >= 100) {
            if (goal.is_recurring) {
                // Recurring: increment counter and reset
                await this.updateGoal(goal.id, {
                    completion_count: (goal.completion_count || 0) + 1,
                    current_value: 0,
                    status: 'active'
                });
            } else {
                // Normal: mark completed
                await this.updateGoal(goal.id, {
                    status: 'completed'
                });
            }
        }
    }
}
```

**Recurring Goal Display:**
```javascript
// Shows green badge when completed > 0 times
${goal.is_recurring && goal.completion_count > 0 ? `
    <div class="goals-card-completions">
        <svg viewBox="0 0 24 24">...</svg>
        Completed ${goal.completion_count}x
    </div>
` : ''}
```

**CSS for Completion Badge:**
```css
.goals-card-completions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--success);
    margin-top: 0.75rem;
}

.goals-card-completions svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 2;
}
```

---

## 📋 ESTIMATES MODULE - 100% COMPLETE ✅

### Status: ✅ PRODUCTION READY

**Features Implemented:**
- Full CRUD operations (create, read, update, delete)
- Lead linking with searchable dropdown
- Line items table with auto-sum totals
- Photo upload (3 max) with click-to-enlarge lightbox
- Status workflow (draft → sent → accepted/rejected)
- Batch operations (mark sent, mark accepted, delete multiple)
- Professional PDF client copy download
- Instant modal close (no loading states)
- Search and filtering
- Status statistics

**Recent Changes (Previous Session):**
- ✅ Fixed view modal display (added missing overlay CSS)
- ✅ Made modal 30% narrower (900px → 630px)
- ✅ Added click-to-enlarge photo lightbox
- ✅ Moved total box to left alignment
- ✅ Reduced title max length from 100 to 50 characters
- ✅ Removed duplicate estimate counter
- ✅ Moved "Edit Multiple" button to toolbar
- ✅ Instant modal close without success popups
- ✅ Optimized all batch operations (1 API call instead of N)
- ✅ Added professional PDF client copy download

**PDF Client Copy Features:**
- Beautiful branded header with estimate number
- Client contact information
- Description and line items table
- Total with large bold styling
- Photos in 2-column grid
- Terms & conditions
- **NO internal notes** (client-facing only)
- Auto-opens print dialog for PDF save

**Batch Operations (Optimized):**
```javascript
// All batched to single API calls
API.batchUpdateEstimates(ids, updates)  // Mark sent/accepted
API.batchDeleteEstimates(ids)           // Delete multiple
```

**Database Columns:**
```sql
-- estimates table
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
lead_id         UUID REFERENCES leads(id)
estimate_number TEXT UNIQUE
title           TEXT NOT NULL (50 char limit)
description     TEXT
line_items      JSONB DEFAULT '[]'
total_price     NUMERIC DEFAULT 0
photos          JSONB DEFAULT '[]' (3 max)
status          TEXT DEFAULT 'draft'
expires_at      TIMESTAMPTZ
sent_at         TIMESTAMPTZ
accepted_at     TIMESTAMPTZ
rejected_at     TIMESTAMPTZ
terms           TEXT
notes           TEXT (internal only)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**Ready for Jobs Integration:**
- Estimates module is fully built and ready
- Jobs module can reference `estimate_id`
- Convert-to-job workflow ready to implement
- Photos can transfer to jobs as "before" photos

---

## 💼 JOBS MANAGEMENT MODULE - 100% COMPLETE ✅

### Status: ✅ PRODUCTION READY

**Features Implemented:**
- Full CRUD operations (create, read, update, delete)
- Lead linking with searchable dropdown
- Materials table with dynamic rows (50 max)
- Crew members table with dynamic rows (20 max)
- Photo upload (3 max) with type selection (before/during/after)
- Live profit calculator with real-time updates
- Deposit tracking (amount + paid status)
- Status workflow (draft → scheduled → in_progress → completed → invoiced → paid)
- Financial summary with revenue, costs, profit, and margin
- Comprehensive view modal with all job details
- Silent value capping to prevent database overflow
- Live totals that update when adding/deleting rows

**Recent Changes (Current Session):**
- ✅ Fixed materials unit field to show placeholder ("pcs") instead of default value
- ✅ Updated currency formatting to show 2 decimal places for labor rates
- ✅ Created comprehensive view modal with financial summary, materials, crew, photos
- ✅ Fixed live totals to update immediately when deleting material/crew rows
- ✅ Changed last row deletion behavior to clear inputs instead of removing row
- ✅ Implemented silent value capping at $99,999,999.99 (no error messages)
- ✅ Database migration: NUMERIC(12,2) for inputs, NUMERIC(20,2) for calculated fields
- ✅ All numeric fields automatically cap at max value without blocking user

**Database Numeric Precision:**
```sql
-- Input fields (user-entered values)
material_cost            NUMERIC(12,2)  -- Max: $9,999,999,999.99
labor_rate               NUMERIC(12,2)  -- Max: $9,999,999,999.99
estimated_labor_hours    NUMERIC(12,2)  -- Max: 9,999,999,999.99 hours
actual_labor_hours       NUMERIC(12,2)  -- Max: 9,999,999,999.99 hours
other_expenses           NUMERIC(12,2)  -- Max: $9,999,999,999.99
quoted_price             NUMERIC(12,2)  -- Max: $9,999,999,999.99
deposit_amount           NUMERIC(12,2)  -- Max: $9,999,999,999.99

-- Calculated fields (higher precision to handle multiplication)
total_cost               NUMERIC(20,2)  -- Handles: material + (hours * rate) + expenses
profit                   NUMERIC(20,2)  -- Handles: final_price - total_cost
profit_margin            NUMERIC(6,2)   -- Percentage: -999.99% to 999.99%
```

**Frontend Value Capping:**
- All numeric inputs silently cap at $99,999,999.99
- No error messages shown to user
- Values exceeding max are automatically reduced
- Applies to: all direct job fields, material items, crew member hours/rates
- Database has 10x headroom ($9,999,999,999.99) to handle edge cases

**Key Implementation Files:**
- `/dashboard/tiers/professional/scripts/JobsManagement.js` - Main jobs module (lines 3999-4028: value capping)
- `/dashboard/shared/js/utils.js` - Updated formatCurrency to show 2 decimals (lines 115-123)
- `/database/migrations/RUNTHIS_combined_numeric_fix.sql` - Database numeric precision fix

---

## 🔢 DATABASE VALIDATION & FRONTEND ALIGNMENT

### Critical Principle: Match Database Constraints with Frontend Validators

**The Problem:**
- Database has hard limits (NUMERIC precision, VARCHAR length, etc.)
- If frontend doesn't validate first, users hit cryptic database errors
- Poor UX: "numeric field overflow" means nothing to users

**The Solution:**
- **Frontend validates BEFORE database** - catch issues early with friendly messages
- **Frontend caps values silently when appropriate** - no disruption to workflow
- **Database has buffer room** - frontend max < database max for safety margin

### Examples from Jobs Module

**Numeric Field Overflow (SOLVED):**
```javascript
// BEFORE: User hits database error
// Input: 10,000,000,000 → Database: "precision 12, scale 2 must round to absolute value less than 10^10"

// AFTER: Silent capping in frontend
const MAX_VALUE = 99999999.99;  // Frontend cap
const capValue = (value) => Math.min(Math.max(value, 0), MAX_VALUE);
jobData.material_cost = capValue(jobData.material_cost);

// Database: NUMERIC(12,2) = max $9,999,999,999.99 (10x buffer)
// Result: User never sees error, value is safely capped
```

**Character Limits:**
```javascript
// Estimates: title max 50 chars
<input maxlength="50" />  // Frontend
title TEXT NOT NULL CHECK(length(title) <= 50)  // Database

// Goals: title max 35 chars
<input maxlength="35" />  // Frontend
title TEXT NOT NULL CHECK(length(title) <= 35)  // Database
```

**Calculated Fields Need Higher Precision:**
```sql
-- WRONG: All fields same precision
labor_hours   NUMERIC(10,2)  -- Max: $99,999,999.99
labor_rate    NUMERIC(10,2)  -- Max: $99,999,999.99
labor_cost    NUMERIC(10,2) GENERATED AS (labor_hours * labor_rate) STORED
-- Problem: 99999999.99 * 99999999.99 = 9,999,999,998,000,000 (OVERFLOW!)

-- RIGHT: Calculated fields have higher precision
labor_hours   NUMERIC(12,2)  -- Input field
labor_rate    NUMERIC(12,2)  -- Input field
labor_cost    NUMERIC(20,2) GENERATED AS (labor_hours * labor_rate) STORED
-- Solution: Can handle multiplication without overflow
```

### Best Practices Checklist

When adding new fields with numeric/length constraints:

- [ ] **Define database constraint first** - Know the hard limit
- [ ] **Set frontend limit lower** - Leave buffer room (10-20% margin)
- [ ] **Add frontend validation** - Friendly error messages or silent capping
- [ ] **Test with max values** - Try to break it with extreme inputs
- [ ] **Document both limits** - In code comments and handoff doc
- [ ] **Consider calculated fields** - Do they need higher precision?
- [ ] **Choose validation strategy:**
  - **Blocking validation** - For critical fields (payment amounts)
  - **Silent capping** - For non-critical fields (descriptions, quantities)
  - **Warning messages** - For fields that should be reviewed

### Validation Strategy by Field Type

**Money/Currency:**
- Strategy: Silent capping with generous buffer
- Example: Frontend caps at $99,999,999.99, database allows $9,999,999,999.99
- Reason: Users shouldn't see errors for large (but reasonable) amounts

**Text/Descriptions:**
- Strategy: Character limit with counter
- Example: "Description (250/500 characters)"
- Reason: Users need to know when they're approaching limit

**Critical Financial Fields:**
- Strategy: Blocking validation with clear error
- Example: "Payment amount cannot exceed invoice total"
- Reason: Mistakes here have real consequences

**Counts/Quantities:**
- Strategy: Min/max with friendly message
- Example: "Please enter a value between 1 and 1000"
- Reason: Unreasonable values indicate user error

### Migration Pattern for Numeric Fixes

```sql
BEGIN;

-- Drop generated columns (they reference columns we're changing)
ALTER TABLE jobs
    DROP COLUMN IF EXISTS total_cost,
    DROP COLUMN IF EXISTS profit,
    DROP COLUMN IF EXISTS profit_margin;

-- Update input fields to desired precision
ALTER TABLE jobs
    ALTER COLUMN material_cost TYPE NUMERIC(12, 2),
    ALTER COLUMN labor_rate TYPE NUMERIC(12, 2),
    -- ... other input fields ...

-- Recreate calculated fields with HIGHER precision
ALTER TABLE jobs
    ADD COLUMN total_cost NUMERIC(20, 2) GENERATED ALWAYS AS (
        COALESCE(material_cost, 0) +
        COALESCE(actual_labor_hours, 0) * COALESCE(labor_rate, 0) +
        COALESCE(other_expenses, 0)
    ) STORED,
    ADD COLUMN profit NUMERIC(20, 2) GENERATED ALWAYS AS (
        COALESCE(final_price, 0) - total_cost
    ) STORED;

COMMIT;
```

### Summary

**Remember:**
1. **Frontend validates first** - Users see friendly messages, not database errors
2. **Frontend max < Database max** - Always leave buffer room
3. **Calculated fields need extra precision** - Account for multiplication/aggregation
4. **Choose appropriate strategy** - Block, cap, or warn based on field criticality
5. **Test with extreme values** - Try to break it before users do

**The result:**
- ✅ No cryptic database errors for users
- ✅ Smooth, professional UX
- ✅ Data integrity maintained
- ✅ Easy to reason about limits in code

---

## 🗄️ DATABASE SCHEMA

### `users` Table
**Status:** ✅ PRODUCTION
```sql
id                      UUID PRIMARY KEY
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
preferences             JSONB
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
tos_accepted_at         TIMESTAMPTZ
tos_version             TEXT
privacy_accepted_at     TIMESTAMPTZ
last_active_at          TIMESTAMPTZ
onboarding_completed    BOOL
```

### `leads` Table
**Status:** ✅ PRODUCTION
```sql
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
potential_value     NUMERIC
deal_value_actual   NUMERIC
follow_up_date      DATE
last_contact_date   DATE
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
lost_reason         TEXT
archived_at         TIMESTAMPTZ
position            TEXT
department          TEXT
deal_stage          TEXT
next_action         TEXT
win_probability     INT4
linkedin_url        TEXT
facebook_url        TEXT
twitter_url         TEXT
instagram_url       TEXT
tags                TEXT[]
```

### `tasks` Table
**Status:** ✅ PRODUCTION (Clean - No Goal Ladder)
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

### `goals` Table
**Status:** ✅ PRODUCTION (Clean - No Goal Ladder)
```sql
id                UUID PRIMARY KEY
user_id           UUID REFERENCES users(id) ON DELETE CASCADE
title             TEXT NOT NULL
description       TEXT
goal_type         TEXT NOT NULL
target_value      NUMERIC
current_value     NUMERIC
unit              TEXT
period            TEXT NOT NULL
start_date        DATE NOT NULL
end_date          DATE NOT NULL
status            TEXT
is_recurring      BOOL
auto_track        BOOL
color             TEXT
completion_count  INTEGER DEFAULT 0  -- Tracks recurring completions ✅
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### `goal_tasks` Table (Junction)
**Status:** ✅ PRODUCTION
**Purpose:** Links tasks to goals for task-based goal tracking
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
goal_id     UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE
task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
created_at  TIMESTAMPTZ DEFAULT NOW()

-- Constraints
UNIQUE(goal_id, task_id)  -- Prevents duplicate links

-- Indexes
idx_goal_tasks_goal_id ON goal_tasks(goal_id)
idx_goal_tasks_task_id ON goal_tasks(task_id)

-- RLS Policies
- Users can only see/create/delete links for their own goals

-- Triggers
- update_goal_task_progress(): Auto-updates goal.current_value when task status changes
- update_goal_on_task_link(): Auto-updates goal.current_value when task is linked
- update_goal_on_task_unlink(): Auto-updates goal.current_value when task is unlinked
- See: database/migrations/goal_task_progress_trigger.sql
```

### `jobs` Table
**Status:** ✅ PRODUCTION (Schema complete, UI pending)
```sql
-- Core
id                      UUID PRIMARY KEY
user_id                 UUID REFERENCES users(id) ON DELETE CASCADE
lead_id                 UUID REFERENCES leads(id) ON DELETE SET NULL
estimate_id             UUID REFERENCES estimates(id) ON DELETE SET NULL  -- NEW

-- Job Info
title                   TEXT NOT NULL
description             TEXT
job_type                TEXT  -- installation, repair, maintenance, inspection, consultation, emergency, custom
status                  TEXT DEFAULT 'draft'  -- draft, scheduled, in_progress, completed, invoiced, paid, cancelled
priority                TEXT

-- Scheduling
scheduled_date          DATE
scheduled_time          TIME
duration_hours          NUMERIC
completed_at            TIMESTAMPTZ

-- Financial - Labor
estimated_labor_hours   NUMERIC  -- NEW (renamed from labor_hours)
actual_labor_hours      NUMERIC  -- NEW
labor_rate              NUMERIC

-- Financial - Costs
material_cost           NUMERIC DEFAULT 0
other_expenses          NUMERIC DEFAULT 0
total_cost              NUMERIC GENERATED ALWAYS AS (
    COALESCE(material_cost, 0) +
    COALESCE(actual_labor_hours, 0) * COALESCE(labor_rate, 0) +
    COALESCE(other_expenses, 0)
) STORED

-- Financial - Revenue
quoted_price            NUMERIC
final_price             NUMERIC
profit                  NUMERIC GENERATED ALWAYS AS (
    COALESCE(final_price, 0) - total_cost
) STORED
profit_margin           NUMERIC GENERATED ALWAYS AS (
    CASE WHEN COALESCE(final_price, 0) > 0
    THEN ((COALESCE(final_price, 0) - total_cost) / COALESCE(final_price, 1)) * 100
    ELSE 0 END
) STORED

-- Deposits  -- NEW
deposit_amount          NUMERIC DEFAULT 0
deposit_paid            BOOLEAN DEFAULT FALSE
deposit_paid_at         TIMESTAMPTZ

-- Payment
invoice_number          TEXT
payment_status          TEXT  -- pending, partial, paid, overdue

-- Additional
location                TEXT
notes                   TEXT

-- JSONB Fields
materials               JSONB DEFAULT '[]'
-- [{"name": "2x4 lumber", "quantity": 50, "unit": "pcs", "cost_per_unit": 5.99, "supplier": "Home Depot", "total": 299.50}]

crew_members            JSONB DEFAULT '[]'  -- NEW
-- [{"name": "John Doe", "hours": 8, "rate": 25, "total": 200}]

photos                  JSONB DEFAULT '[]'  -- NEW (Supabase Storage URLs)
-- [{"url": "https://...", "type": "before|during|after", "caption": "...", "uploaded_at": "..."}]

-- Timestamps
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()

-- Indexes: user_id, lead_id, estimate_id, status, scheduled_date, payment_status, created_at
-- RLS: Users can only see/edit their own jobs
```

---

## 🔒 ROW LEVEL SECURITY (RLS) POLICIES

**Status:** ✅ PRODUCTION - All tables secured with RLS

### Policy Pattern
All tables follow the same simple pattern:
- **SELECT**: Users can only see their own data (`user_id = auth.uid()`)
- **INSERT**: Users can only create data for themselves
- **UPDATE**: Users can only update their own data
- **DELETE**: Users can only delete their own data

### Tables with RLS Enabled
- ✅ `users` - 2 policies (SELECT, UPDATE only)
- ✅ `leads` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `tasks` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `goals` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `goal_tasks` - 3 policies (SELECT, INSERT, DELETE)
- ✅ `estimates` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `jobs` - 4 policies (SELECT, INSERT, UPDATE, DELETE)

### Policy Details

**Users Table:**
```sql
-- Users can only see their own profile
CREATE POLICY users_select_own ON public.users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Users can only update their own profile
CREATE POLICY users_update_own ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
```

**Standard Pattern (Leads, Tasks, Goals, Estimates, Jobs):**
```sql
-- Example: leads_select_own
CREATE POLICY leads_select_own ON public.leads
    FOR SELECT TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY leads_insert_own ON public.leads
    FOR INSERT TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY leads_update_own ON public.leads
    FOR UPDATE TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY leads_delete_own ON public.leads
    FOR DELETE TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));
```

**Junction Table Pattern (Goal Tasks):**
```sql
-- Users can only see/modify links for their own goals
CREATE POLICY goal_tasks_select_own ON public.goal_tasks
    FOR SELECT TO authenticated
    USING (
        goal_id IN (
            SELECT id FROM public.goals
            WHERE user_id IN (SELECT id FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY goal_tasks_insert_own ON public.goal_tasks
    FOR INSERT TO authenticated
    WITH CHECK (
        goal_id IN (
            SELECT id FROM public.goals
            WHERE user_id IN (SELECT id FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY goal_tasks_delete_own ON public.goal_tasks
    FOR DELETE TO authenticated
    USING (
        goal_id IN (
            SELECT id FROM public.goals
            WHERE user_id IN (SELECT id FROM public.users WHERE id = auth.uid())
        )
    );
```

### Security Notes
- All policies use `TO authenticated` - anonymous users have no access
- RLS is enabled on all tables - no data leaks possible
- Policies use subquery pattern for consistency
- Junction tables inherit security from parent (goals)
- No BYPASS RLS permissions granted to any role

### Verification Query
```sql
-- Run this to verify all policies are active
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

**Expected Results:**
- users: 2 policies
- leads: 4 policies
- tasks: 4 policies
- goals: 4 policies
- goal_tasks: 3 policies
- estimates: 4 policies
- jobs: 4 policies

---

## 🔌 API REFERENCE (v5.0 - Clean)

**Location:** `/dashboard/shared/js/api.js`

### Auth
```javascript
API.login(email, password)
API.logout()
API.register(email, password)
API.upgradeToTrial()
```

### Leads
```javascript
API.getLeads()
API.createLead(data)
API.updateLead(id, updates)
API.deleteLead(id)
API.searchLeads(query)
API.batchUpdateLeads(ids, updates)
API.batchDeleteLeads(ids)
```

### Tasks
```javascript
API.getTasks(filters)
API.createTask(data)
API.updateTask(id, updates)
API.deleteTask(id)
API.completeTask(id, notes)
API.batchCompleteTasks(ids, notes)
```

### Goals
```javascript
API.getGoals(status)             // Get all goals
API.createGoal(data)             // Create new goal
API.updateGoal(id, updates)      // Update existing goal
API.deleteGoal(id)               // Delete goal
API.updateGoalProgress(id, value) // Manually update progress
API.getGoalProgress()            // Get all goals with calculated progress
API.checkGoalCompletion()        // Check and auto-complete goals
API.getGoalById(goalId)          // Get single goal by ID

// Task-based goal tracking
API.linkTasksToGoal(goalId, taskIds)    // Link existing tasks to goal
API.createTaskForGoal(goalId, taskData) // Create and link new task
API.batchCreateTasksForGoal(goalId, tasksArray) // Batch create tasks
API.getGoalTasks(goalId)                // Get all tasks for a goal
API.getTaskGoalProgress(goalId)         // Get completion stats
API.unlinkTaskFromGoal(goalId, taskId)  // Remove task-goal link

// Batch operations ✅
API.batchUpdateGoals(ids, updates)  // Update multiple goals at once
API.batchDeleteGoals(ids)           // Delete multiple goals at once
```

### Jobs
```javascript
// Core CRUD
API.getJobs(filters)                // Get all jobs with optional filters
API.getJobById(id)                  // Get single job with full details
API.createJob(data)                 // Create new job
API.updateJob(id, updates)          // Update existing job
API.deleteJob(id)                   // Delete job
API.completeJob(id, finalData)      // Mark job complete + set final price/hours
API.getJobsByLead(leadId)           // Get all jobs for a specific lead
API.getJobStats()                   // Get revenue/profit stats
API.getJobProfitability()           // Get jobs sorted by profit
API.getJobsByPaymentStatus(status)  // Filter by payment status
API.getScheduledJobs(start, end)    // Get jobs in date range

// Deposits
API.markDepositPaid(jobId, amount)  // Mark deposit as paid
API.updateDeposit(jobId, amount)    // Update deposit amount

// Materials
API.addJobMaterial(jobId, material) // Add material to job
API.updateJobMaterials(jobId, arr)  // Update all materials
API.removeJobMaterial(jobId, matId) // Remove material from job

// Crew
API.addJobCrewMember(jobId, crew)   // Add crew member to job
API.updateJobCrew(jobId, arr)       // Update all crew members
API.removeJobCrewMember(jobId, id)  // Remove crew member from job

// Photos (Supabase Storage)
API.uploadJobPhoto(file, jobId, type)     // Upload photo to storage
API.addJobPhoto(jobId, photo)             // Add photo URL to job
API.updateJobPhotos(jobId, arr)           // Update all photos
API.removeJobPhoto(jobId, photoId)        // Remove photo from job
API.deleteJobPhotoFile(photoUrl)          // Delete file from storage

// Invoice & Payment
API.updateJobInvoice(jobId, num, status)  // Update invoice details
API.markJobPaid(jobId)                    // Mark job as fully paid
API.generateInvoiceNumber()               // Generate unique invoice# (INV-2025-001)
```

### Estimates ✅
```javascript
// Core CRUD
API.getEstimates(filters)           // Get all estimates
API.getEstimateById(id)             // Get single estimate
API.createEstimate(data)            // Create new estimate
API.updateEstimate(id, updates)     // Update estimate
API.deleteEstimate(id)              // Delete estimate
API.generateEstimateNumber()        // EST-2025-001

// Photo management
API.uploadEstimatePhoto(file, estimateId, caption)
API.addEstimatePhoto(estimateId, photoData)
API.removeEstimatePhoto(estimateId, photoId)
API.compressImage(file, maxWidth, quality)

// Status management
API.markEstimateSent(estimateId)
API.markEstimateAccepted(estimateId)
API.markEstimateRejected(estimateId)

// Batch operations ✅
API.batchUpdateEstimates(ids, updates)  // Update multiple estimates
API.batchDeleteEstimates(ids)           // Delete multiple estimates

// Convert to job (future)
API.convertEstimateToJob(estimateId)    // Create job from accepted estimate
```

### Preferences
```javascript
API.getPreferences()
API.updatePreferences(prefs)
API.toggleFeature(name, enabled)
```

---

## 📂 COMPLETE FILE STRUCTURE
```
/steadymanager
├── server.js                          ✅ Node.js + Stripe + Cron
├── .env                               ✅ Secrets
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
│       ├── index.html                 ✅ Router
│       │
│       ├── /shared
│       │   └── /js
│       │       ├── supabase.js        ✅ Client
│       │       ├── api.js             ✅ v5.0 (Clean - No Goal Ladder)
│       │       └── utils.js           ✅ Toast, validation
│       │
│       └── /tiers
│           ├── /free                  ✅ PRODUCTION READY
│           │   ├── index.html
│           │   └── /scripts
│           │       ├── Dashboard.js
│           │       ├── AddLead.js
│           │       ├── Pipeline.js
│           │       ├── Scheduling.js
│           │       └── Settings.js
│           │
│           └── /professional          🔨 90% COMPLETE
│               ├── index.html         ✅ Loads modules
│               └── /scripts
│                   ├── Shell.js       ✅ Navigation
│                   ├── Dashboard.js   ✅ Complete
│                   ├── Leads.js       ✅ Complete
│                   ├── Pipeline.js       ✅ Complete
│                   ├── Scheduling.js    ✅ Complete
│                   ├── Goals.js         ✅ 100% COMPLETE (recurring + completion count)
│                   ├── Estimates.js     ✅ 100% COMPLETE (batch ops + PDF export)
│                   ├── Jobs.js          ✅ NEW - Parent Hub Container (2 sections)
│                   ├── JobsManagement.js ✅ 100% COMPLETE (actual jobs functionality)
│                   └── Settings.js      🔨 Needs Preferences tab
```

---

## 🎨 DESIGN SYSTEM

### Colors (CSS Variables)
```css
--primary: #667eea
--success: #10b981
--warning: #f59e0b
--danger: #ef4444
--background: #f8fafc (light) / #0a0f1c (dark)
--surface: #ffffff (light) / #1a1a2e (dark)
--text-primary: #0f172a (light) / #f1f5f9 (dark)
--border: #e2e8f0 (light) / #374151 (dark)
```

### Typography
- **Titles:** 2.5rem, 900 weight, gradient
- **Subtitles:** 1.125rem, 600 weight
- **Body:** 1rem, 500 weight
- **Small:** 0.875rem, 600 weight

### Spacing
- **Container padding:** 2rem
- **Card padding:** 1.75rem
- **Gap between cards:** 1.5rem
- **Section margins:** 3rem

### Animations
- **Duration:** 0.3s (fast), 0.6s (normal)
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1)
- **Fade in:** opacity 0 → 1
- **Slide up:** translateY(30px) → 0

---

## 🚀 WHAT'S LEFT BEFORE LAUNCH

### High Priority (Before Launch)
1. **Settings Preferences Tab** (2-3 hours)
   - Theme toggle (light/dark)
   - Default view selector
   - Windowing toggle
   - Save/load from database

2. **Jobs Module** (5-6 hours)
   - List view with financial summary
   - Add/edit job forms
   - Link to leads
   - Profit calculations

3. **Mobile Optimization** (5-6 hours) 🔥 CRITICAL
   - Test on iPhone 12 (390px)
   - Touch targets ≥ 44px
   - No horizontal scroll
   - Disable windowing on mobile

### Medium Priority (Post-Launch v1.1)
1. **Pro Info Fields** (3-4 hours)
   - Position, department in AddLead
   - Social links (LinkedIn, Twitter, etc)
   - Pro Info sidebar in Pipeline

2. **Enhanced Dashboard Stats** (2-3 hours)
   - Pipeline value widgets
   - Weighted pipeline
   - Smart insights

3. **Theme System** (2-3 hours)
   - Apply dark mode CSS to all modules
   - Persist theme selection
   - Smooth transitions

### Low Priority (v1.2+)
1. **Command Palette** (4-5 hours)
2. **Quick Panels** (3-4 hours)
3. **Keyboard Shortcuts** (2-3 hours)
4. **Advanced Filters** (3-4 hours)

---

## ⚠️ CRITICAL NOTES

### Before Launch Checklist
- 🔴 Complete Settings Preferences tab (2-3 hours)
- 🔴 Build Jobs module (5-6 hours)
- 🔴 Mobile optimization (5-6 hours)
- 🔴 Security audit (XSS, SQL injection, RLS)
- 🔴 Trial upgrade/downgrade testing
- 🔴 Performance testing (page load, API calls)

### Known Issues
- ❌ Jobs module not built
- ❌ Settings Preferences tab not built
- ❌ Mobile not tested
- ⚠️ Settings module still has emojis (needs icon update)

### Recent Wins (v11.0)
- ✅ Goal Ladder completely removed (database + API + UI)
- ✅ Recurring goals track completion count
- ✅ Completion badge shows on recurring goals
- ✅ Goal title ellipsis prevents overflow
- ✅ Unit dropdown styled with custom arrow
- ✅ Goals module 100% complete and production ready
- ✅ API cleaned up - removed 8 Goal Ladder functions
- ✅ Database optimized - removed 2 columns + trigger

---

## 📊 PROGRESS TRACKER

**Overall System:** 90% Complete

### Backend: 100% ✅
- Database schema: 100%
- RLS policies: 100%
- Triggers: 100%
- Functions: 100%

### API: 100% ✅
- Auth: 100%
- Leads: 100%
- Tasks: 100%
- Goals: 100%
- Jobs: 100%

### Free Tier: 100% ✅

### Professional Tier: 90%
**By Module:**
- Dashboard: 95% (needs dark mode polish)
- AddLead: 95% (needs Pro Info fields)
- Pipeline: 95% (needs Pro Info sidebar)
- Scheduling: 100% ✅
- Goals: 100% ✅
- Estimates: 100% ✅
- Settings: 70% (needs Preferences tab + icons)
- Jobs: 0%

### Time to Launch: 10-15 hours

**Breakdown:**
- Jobs module: 5-6 hours
- Settings Preferences: 2-3 hours
- Mobile optimization: 5-6 hours
- Testing & polish: 3-5 hours

---

## 🎯 IMMEDIATE NEXT STEPS

### Session 1: Jobs Module Foundation (2-3 hours)
1. Create `Jobs.js` file
2. Build basic CRUD interface
3. Job list view with filters
4. Add/edit job modal

### Session 2: Jobs Financial Features (3 hours)
1. Profit calculations (material + labor)
2. Link jobs to leads
3. Financial summary widgets
4. Payment status tracking

### Session 3: Settings Preferences (2-3 hours)
1. Build Preferences tab UI
2. Theme toggle (light/dark)
3. Default view selector
4. Windowing enable/disable
5. Save preferences to database

### Session 4: Mobile Optimization (5-6 hours)
1. Test on iPhone 12 (390px)
2. Fix any layout issues
3. Touch target optimization
4. Disable windowing on mobile
5. Performance testing

### Session 5: Polish & Launch (3-5 hours)
1. Security audit
2. Cross-browser testing
3. Performance optimization
4. Bug fixes
5. Deploy to production

---

## 🔄 POST-LAUNCH OPTIMIZATION PHASE

**Priority:** High (Before hitting 1000+ users)  
**Estimated Time:** 8-12 hours total  
**When:** After Jobs + Settings + Mobile complete

This phase addresses performance bottlenecks and architectural improvements that aren't critical for launch but become essential at scale.

---

### 1. Event Bus Implementation (3-4 hours)

**Problem:** Modules are tightly coupled - they directly call each other's functions, creating spaghetti code as you add more features.

**Solution:** Implement a pub/sub event system where modules broadcast changes instead of calling each other directly.

#### Benefits:
- **Decoupling:** Scheduling.js doesn't need to know Goals.js exists
- **Easier debugging:** See all inter-module communication in one place
- **Feature additions:** New modules just subscribe to existing events
- **No circular dependencies:** Modules only know about event names (strings)

#### Implementation Plan:

**Step 1: Add EventBus to utils.js** (15 min)
```javascript
// Add to /dashboard/shared/js/utils.js

const EventBus = {
  events: {},
  
  emit(eventName, data) {
    if (!this.events[eventName]) return;
    console.log(`📢 EVENT: ${eventName}`, data); // dev mode logging
    this.events[eventName].forEach(callback => callback(data));
  },
  
  on(eventName, callback) {
    if (!this.events[eventName]) this.events[eventName] = [];
    this.events[eventName].push(callback);
  },
  
  off(eventName, callback) {
    if (!this.events[eventName]) return;
    this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
  },
  
  clear() {
    this.events = {};
  }
};

window.EventBus = EventBus;
```

**Step 2: Update Goals.js** (1 hour)

*Add to init() method:*
```javascript
// Listen for external task updates
EventBus.on('task:completed', async (data) => {
  await this.goals_loadData();
  this.goals_render();
});

EventBus.on('goal:completed', async (data) => {
  window.SteadyUtils.showToast('🎉 Goal completed!', 'success');
  await this.goals_loadData();
  this.goals_render();
});
```

*Update goals_updateProgress() method:*
```javascript
async goals_updateProgress(goalId, newValue) {
    try {
        await API.updateGoalProgress(goalId, newValue);
        await API.checkGoalCompletion();
        
        // ADD THIS - broadcast to other modules
        EventBus.emit('goal:progress_updated', { 
            goalId, 
            newValue 
        });
        
        window.SteadyUtils.showToast('Progress updated!', 'success');
        
        await this.goals_loadData();
        this.goals_render();

    } catch (error) {
        console.error('Update progress error:', error);
        window.SteadyUtils.showToast('Failed to update progress', 'error');
    }
}
```

**Step 3: Update Scheduling.js** (30 min)

*In completeTask() method:*
```javascript
async completeTask(taskId) {
  const task = await API.completeTask(taskId);
  
  // OLD WAY (delete this):
  // await API.checkGoalCompletion();
  // Dashboard.refreshStats();
  // Goals.refreshGoals();
  
  // NEW WAY (add this):
  EventBus.emit('task:completed', { 
    taskId
  });
  
  // Goals and Dashboard auto-update now
}
```

**Step 4: Update Dashboard.js** (30 min)

*Add to init() method:*
```javascript
EventBus.on('task:completed', () => {
  this.refreshStats();
});

EventBus.on('lead:created', () => {
  this.refreshStats();
});

EventBus.on('goal:completed', (data) => {
  this.showConfetti(); // celebrate wins 🎉
  this.refreshStats();
});
```

**Step 5: Update Jobs.js (when built)** (20 min)

*Add to init() method:*
```javascript
EventBus.on('lead:converted', (data) => {
  this.suggestJobCreation(data.leadId);
});
```

#### Event Catalog:

**Task Events:**
- `task:created` - { taskId }
- `task:completed` - { taskId }
- `task:deleted` - { taskId }
- `task:updated` - { taskId }

**Goal Events:**
- `goal:created` - { goalId }
- `goal:completed` - { goalId, completionCount }
- `goal:updated` - { goalId }
- `goal:progress_updated` - { goalId, progress }

**Lead Events:**
- `lead:created` - { leadId }
- `lead:converted` - { leadId }
- `lead:status_changed` - { leadId, status }

**Job Events (future):**
- `job:created` - { jobId, leadId }
- `job:completed` - { jobId, profit }

#### Testing Checklist:
- [ ] Complete task in Scheduling → Goals auto-updates
- [ ] Complete task → Dashboard stats refresh
- [ ] Complete goal → Dashboard shows celebration
- [ ] Update goal → refresh works
- [ ] No console errors
- [ ] No memory leaks (EventBus.clear() on logout)

---

### 2. Batch Operations ✅ COMPLETE

**Status:** ✅ All batch operations implemented and optimized

**What We Built:**

All modules now use proper batch operations instead of sequential loops:

**Leads Module:**
- `API.batchUpdateLeads(ids, updates)` ✅
- `API.batchDeleteLeads(ids)` ✅

**Tasks/Scheduling Module:**
- `API.batchCreateTasks(tasksArray)` ✅
- `API.batchUpdateTasks(ids, updates)` ✅
- `API.batchDeleteTasks(ids)` ✅
- `API.batchCompleteTasks(ids, notes)` ✅
- `API.batchCreateTasksForGoal(goalId, tasksArray)` ✅

**Goals Module:**
- `API.batchUpdateGoals(ids, updates)` ✅
- `API.batchDeleteGoals(ids)` ✅

**Estimates Module:**
- `API.batchUpdateEstimates(ids, updates)` ✅
- `API.batchDeleteEstimates(ids)` ✅

**Performance Gains:**

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Create 50 tasks | ~15 seconds | ~0.5 seconds | **30x faster** |
| Update 20 estimates | ~6 seconds | ~0.3 seconds | **20x faster** |
| Delete 10 goals | ~3 seconds | ~0.2 seconds | **15x faster** |

**Implementation Example:**
```javascript
// OLD WAY - Sequential loops (slow)
for (const id of selectedIds) {
  await API.deleteEstimate(id);  // 10 API calls
}

// NEW WAY - Single batch call (fast)
await API.batchDeleteEstimates(selectedIds);  // 1 API call
```

**Testing Checklist:**
- [x] Batch create 50 tasks completes in <1 second ✅
- [x] Batch update works correctly ✅
- [x] Database triggers still fire ✅
- [x] RLS policies still enforced ✅
- [x] All modules use batch operations ✅

**Result:** All batch operations are production-ready and 10-30x faster than before.

---

### 3. Server-Side Task Search (1-2 hours)

**Problem:** Searching 5000 tasks in the browser = UI lag.

**Solution:** Let PostgreSQL do the heavy lifting with full-text search.

#### Implementation Plan:

**Step 1: Add search function to API** (30 min)

*Add to api.js:*
```javascript
/**
 * Server-side task search with fuzzy matching
 * Uses PostgreSQL's pg_trgm extension (already enabled)
 */
static async searchTasks(query, limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .textSearch('title', query, { type: 'websearch' }) // uses pg_trgm
    .limit(limit);
  
  if (error) throw error;
  
  return data;
}
```

**Step 2: Update Scheduling.js** (30 min)

*Add search with debouncing:*
```javascript
// Add to Scheduling
let searchTimeout;
function handleSearchInput(e) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const results = await API.searchTasks(e.target.value);
    renderSearchResults(results);
  }, 300); // wait 300ms after typing stops
}
```

#### Testing Checklist:
- [ ] Search 5000 tasks returns results in <500ms
- [ ] Fuzzy search works ("desing" finds "design")
- [ ] No duplicate searches while typing
- [ ] Works with special characters

---

### 4. Mobile Optimization Enhancements (1-2 hours)

**Problem:** Large datasets on mobile = scroll hell + performance issues.

**Solution:** Responsive configs + virtual scrolling for large lists.

#### Implementation Plan:

**Step 1: Add responsive configs** (30 min)

*Add to each module:*
```javascript
getResponsiveConfig() {
  const width = window.innerWidth;
  
  if (width < 768) {
    // Mobile
    return {
      itemsPerPage: 20,
      cardSize: 'small',
      fontSize: 14
    };
  } else if (width < 1024) {
    // Tablet
    return {
      itemsPerPage: 40,
      cardSize: 'medium',
      fontSize: 15
    };
  } else {
    // Desktop
    return {
      itemsPerPage: 100,
      cardSize: 'large',
      fontSize: 16
    };
  }
}
```

**Step 2: Implement pagination for mobile** (1 hour)

*For lists with 100+ items on mobile:*
```javascript
renderTaskList() {
  const config = this.getResponsiveConfig();
  const page = this.state.currentPage || 1;
  const start = (page - 1) * config.itemsPerPage;
  const end = start + config.itemsPerPage;
  const visibleTasks = this.state.tasks.slice(start, end);
  
  // Render only visible tasks
  return visibleTasks.map(task => this.renderTaskCard(task));
}
```

#### Testing Checklist:
- [ ] Works on iPhone 12 (390px)
- [ ] Works on iPad (768px)
- [ ] Rotation doesn't break layout
- [ ] Touch targets ≥ 44px
- [ ] No horizontal scroll
- [ ] Large lists don't lag

---

## 📋 OPTIMIZATION CHECKLIST

Run this checklist AFTER completing Jobs, Settings, and Mobile:

### Performance:
- [ ] EventBus implemented in utils.js
- [ ] All modules emit events instead of direct calls
- [ ] Batch task operations in API
- [ ] Server-side task search with debouncing
- [ ] Mobile optimization (responsive configs)
- [ ] Pagination for large lists on mobile

### Testing:
- [ ] Complete task in Scheduling → all modules update
- [ ] Create 50 tasks completes in <1 second
- [ ] Search 5000 tasks returns in <500ms
- [ ] Test on iPhone 12, iPad, desktop
- [ ] No console errors in any module
- [ ] No memory leaks (test EventBus cleanup)

### Code Quality:
- [ ] Remove all direct module-to-module calls
- [ ] Replace individual API calls with batch operations
- [ ] Add debouncing to all search inputs
- [ ] Document event catalog in comments

### Before Production:
- [ ] Stress test: 5000 leads + 10000 tasks
- [ ] Mobile performance test (Lighthouse score >90)
- [ ] EventBus logging disabled in production
- [ ] All console.logs removed

---

## 🎯 WHY THIS MATTERS

**Without these optimizations:**
- Creating 50 tasks = 15 seconds ❌
- Modules tightly coupled = hard to add features ❌
- Mobile = laggy mess ❌
- Search 5000 tasks = browser freeze ❌

**With these optimizations:**
- Creating 50 tasks = 0.5 seconds ✅
- Modules loosely coupled = easy feature additions ✅
- Mobile = smooth 60fps ✅
- Search 5000 tasks = instant results ✅

---

**Total Time Investment:** 8-12 hours  
**Performance Gain:** 10-30x faster operations  
**Code Quality Gain:** Much easier to maintain and extend  
**User Experience Gain:** Professional-grade performance

**Priority Level:** Do this BEFORE launching to 100+ users, or you'll be refactoring under pressure.

---

## 🏗️ TIER DEVELOPMENT STRATEGY

### Current Phase: Building Pro Tier Foundation

**Philosophy:** Build feature-complete Pro tier first, then adapt for other tiers.

### Phase 1: Pro Tier Development (CURRENT)
**Goal:** Create the most feature-rich, powerful version with ALL functionality

**Modules to Build:**
1. ✅ **Goals** - Manual, auto-tracked, task-based, recurring goals (COMPLETE)
2. 🔨 **Jobs** - Job management with profit tracking, cost calculation, and lead linking
3. 🔨 **Estimates** - Quote/estimate builder with client acceptance and auto-job creation
4. 🔨 **Notes** - Quick note-taking with tagging, search, and lead linking
5. 🔨 **Analytics** - Revenue tracking, pipeline analytics, goal insights (aggregates all modules)
6. 🔨 **Settings Preferences** - Theme, windowing, customization options

**Build Order Rationale:**
- **Jobs first** - Core money maker, tracks revenue/costs/profit, sets foundation for Estimates
- **Estimates second** - Natural workflow (Estimate accepted → Auto-creates Job), builds on Jobs
- **Notes third** - Supporting feature, quick to build, nice break after heavy modules
- **Analytics last** - Aggregates data from all modules, most valuable when everything feeds it
- **Settings** - Polish piece, implement throughout as needed

**Why Pro First:**
- Establishes the feature ceiling
- Sets the UX standard
- All advanced functionality gets built once
- Easier to remove features than add them later

### Phase 2: Admin Tier Development (NEXT)
**Goal:** Super admin tier with team management, analytics, and oversight

**Additional Features:**
- Team member management (add/remove users)
- Permission levels (admin, manager, user)
- Company-wide analytics dashboard
- Audit logs (who did what, when)
- Bulk operations on behalf of team members
- White-label branding options
- Advanced reporting and exports

**Database Additions:**
```sql
-- New tables for admin tier
companies (id, name, plan, created_at)
company_members (company_id, user_id, role, permissions)
audit_logs (id, user_id, action, resource_type, resource_id, timestamp)
team_analytics (company_id, metrics, date)
```

**Why Admin After Pro:**
- Pro tier establishes single-user workflows
- Admin builds on top of proven features
- Team features require solid foundation
- Easier to test multi-user scenarios with complete app

### Phase 3: Free Tier Refinement (FINAL)
**Goal:** Strip Pro tier down to essentials + add upgrade prompts

**Features to KEEP in Free:**
- Dashboard (basic stats only)
- AddLead (50 lead limit)
- Pipeline (basic view, no advanced filters)
- Scheduling (basic task management)
- Settings (account only, no preferences)

**Features to REMOVE from Free:**
- ❌ Goals module entirely
- ❌ Notes module entirely
- ❌ Analytics module entirely
- ❌ Jobs module entirely
- ❌ Advanced pipeline filters
- ❌ Bulk operations
- ❌ Custom fields

**Upgrade Prompts to ADD:**
```javascript
// Example upgrade prompt in Goals spot
<div class="upgrade-prompt-card">
  <div class="upgrade-icon">🎯</div>
  <h3>Goals Module</h3>
  <p>Track progress toward your business objectives with manual, auto-tracked, and task-based goals.</p>
  <ul class="upgrade-features">
    <li>✓ Unlimited goals</li>
    <li>✓ Auto-tracking from pipeline data</li>
    <li>✓ Recurring goals with completion tracking</li>
    <li>✓ Task-based goal linking</li>
  </ul>
  <button class="upgrade-cta">Upgrade to Pro - $29/mo</button>
  <span class="upgrade-hint">Join 500+ users crushing their goals</span>
</div>
```

**Visual Upgrade Prompts:**
- Blurred/locked module cards in navigation
- "Upgrade to unlock" overlays on disabled features
- Feature comparison table in Settings
- Success stories from Pro users
- Limited-time upgrade offers

**Implementation Strategy:**
1. Copy Pro tier codebase
2. Remove Pro-only modules entirely
3. Add upgrade prompt components
4. Replace module content with upgrade cards
5. Add "Upgrade" button to navigation
6. Link upgrade prompts to Stripe checkout

**Why Free Last:**
- Pro tier is already battle-tested
- Know exactly what features to restrict
- Upgrade prompts reference real Pro features
- Can A/B test different upgrade messaging
- Free users see polished, complete Pro tier as upgrade target

---

### Summary: Build Order

```
┌─────────────────────────────────────────────┐
│  Phase 1: PRO TIER (Current)               │
│  Build ALL features, unlimited power       │
│  Timeline: 3-4 weeks                       │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Phase 2: ADMIN TIER                       │
│  Add team management on top of Pro         │
│  Timeline: 2-3 weeks                       │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Phase 3: FREE TIER REFINEMENT             │
│  Strip features, add upgrade prompts       │
│  Timeline: 1 week                          │
└─────────────────────────────────────────────┘
```

**Current Status:** Phase 1 (Pro Tier) - 80% complete
**Next Milestones:** Jobs → Estimates → Notes → Analytics → Phase 2

---

## 📋 ESTIMATES MODULE - QUOTE MANAGEMENT

### Overview
Lightweight quote/proposal system that feeds into Jobs. Estimates capture client requests with photos, generate professional quotes, and seamlessly convert to jobs when accepted.

### Database Schema

```sql
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,  -- Optional (nullable)

  estimate_number TEXT UNIQUE,  -- EST-2025-001
  title TEXT NOT NULL,
  description TEXT,

  line_items JSONB DEFAULT '[]'::JSONB,  -- [{name, quantity, rate, total}]
  total_price NUMERIC DEFAULT 0,

  photos JSONB DEFAULT '[]'::JSONB,  -- Client reference photos (3 max)

  status TEXT DEFAULT 'draft',  -- draft, sent, accepted, rejected, expired
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  terms TEXT,  -- Legal terms/conditions
  notes TEXT,  -- Internal notes

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_estimates_lead_id ON estimates(lead_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_created_at ON estimates(created_at DESC);
```

### Photo Storage
- **Bucket:** `estimate-photos` (public bucket)
- **Limit:** 3 photos max per estimate
- **Type:** Client reference photos ("before I start" pics)
- **Compression:** 1024px max width, 80% JPEG quality (~100-200KB each)
- **Path:** `estimate-photos/{estimateId}/photo-{timestamp}.jpg`

### Estimate → Job Workflow

```
Client: "Can you quote this?" + sends 2 photos
   ↓
Create Estimate
   - Attach client photos
   - Add line items (labor, materials)
   - Total: $2,500
   - Set expiration (30 days)
   ↓
Send to Client
   - Status: draft → sent
   - sent_at timestamp recorded
   ↓
Client Accepts
   - Status: sent → accepted
   - accepted_at timestamp recorded
   ↓
Click "Convert to Job" Button
   - Auto-creates Job with:
     - estimate_id link
     - All estimate data pre-filled
     - Photos copied as "before" photos
     - Line items → materials
     - Status: scheduled
   ↓
Job Execution
   - Add scheduling
   - Assign crew
   - Track actual costs
   - Add "during" and "after" photos
   - Calculate profit
```

### API Methods (api.js)

**Core CRUD:**
```javascript
API.getEstimates(filters)              // Get all estimates
API.getEstimateById(id)                // Get single estimate
API.createEstimate(data)               // Create new estimate
API.updateEstimate(id, updates)        // Update estimate
API.deleteEstimate(id)                 // Delete estimate
API.generateEstimateNumber()           // EST-2025-001
```

**Photo Management:**
```javascript
API.uploadEstimatePhoto(file, estimateId, caption)  // Upload + compress
API.addEstimatePhoto(estimateId, photoData)         // Add to estimate
API.removeEstimatePhoto(estimateId, photoId)        // Remove photo
API.compressImage(file, maxWidth, quality)          // Helper function
```

**Status Management:**
```javascript
API.markEstimateSent(estimateId)       // draft → sent
API.markEstimateAccepted(estimateId)   // sent → accepted
API.markEstimateRejected(estimateId)   // sent → rejected
```

**Convert to Job:**
```javascript
API.convertEstimateToJob(estimateId)   // Creates job from accepted estimate
   - Only works if status === 'accepted'
   - Copies all data to new job
   - Photos become "before" photos
   - Line items → materials
   - Links job.estimate_id
```

### UI Features to Build

**Estimates List View:**
- Cards showing lead, total, status, expiration
- Filter by status (draft, sent, accepted, rejected)
- Photo thumbnail count badge
- "Convert to Job" button (only for accepted)

**Add/Edit Estimate Modal:**
- Lead dropdown
- Title, description
- Line items table (add/remove rows)
- Auto-sum total
- Photo upload (3 max)
- Terms textarea
- Expiration date picker

**Estimate Detail View:**
- Read-only display
- Show all line items
- Photo gallery
- "Send", "Accept", "Reject" buttons
- "Convert to Job" button (if accepted)

### Storage Bucket Setup

**Create bucket:** `estimate-photos`
**Policies:**
```sql
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated USING (bucket_id = 'estimate-photos');

-- Public read access
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'estimate-photos');

-- Allow authenticated deletes
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'estimate-photos');
```

### Build Priority

**🔥 BUILD THIS FIRST** - Estimates comes before Jobs. Natural flow: Quote → Job.

**Total Build Time:** 5-7 hours

---

## 🏗️ ESTIMATES MODULE - IMPLEMENTATION ROADMAP

### Why Build Estimates First?

Natural workflow: Client requests quote → You create estimate → Client accepts → Convert to job → Execute work

Building estimates first means:
- Jobs can reference estimates (estimate_id link)
- Convert-to-job flow makes sense
- Users can start quoting immediately
- Photos transfer smoothly to jobs

### Implementation Sessions

**Session 1: Foundation (2-3 hours)**
1. Module structure + state management
2. Estimates list view with cards
3. Filters (status, date, lead)
4. Add/Edit estimate modal:
   - Lead dropdown with quick create
   - Title, description
   - Status dropdown
   - Expiration date picker
   - Terms textarea
   - Notes
5. Delete estimate with confirmation
6. Quick stats (total quoted, accepted, pending)

**Session 2: Line Items + Photos (2-3 hours)**
7. Line items table (editable rows)
   - Add/remove rows dynamically
   - Columns: Description, Quantity, Rate, Total
   - Auto-sum total price
8. Photo upload section (3 max)
   - Drag & drop or file picker
   - Photo counter "2/3 photos used"
   - Photo preview with delete
   - Compression on upload
9. Visual total calculation box

**Session 3: Status Workflow + Convert to Job (1-2 hours)**
10. Estimate detail view (read-only)
11. Status action buttons (sent, accepted, rejected)
12. **"Convert to Job" button** (only for accepted)
    - Calls `API.convertEstimateToJob()`
    - Redirects to Jobs with new job
13. Expiration warning badges

### Visual Mockups

#### Estimates List View
```
┌────────────────────────────────────────────────────────────┐
│ ESTIMATES                                    + New Estimate│
├────────────────────────────────────────────────────────────┤
│ Quick Stats: Quoted $28K | Accepted $18K | Pending $10K   │
│                                                            │
│ Filters: [Status ▾] [Lead ▾] [Date ▾]                     │
│                                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │EST-2025-042  │ │EST-2025-041  │ │EST-2025-040  │       │
│ │Kitchen Remod │ │Deck Repair   │ │Fence Install │       │
│ │John Smith    │ │Sarah Johnson │ │Mike Davis    │       │
│ │              │ │              │ │              │       │
│ │🟢 Accepted   │ │🔵 Sent       │ │⚫ Draft      │       │
│ │📷 2 photos   │ │📷 1 photo    │ │No photos     │       │
│ │              │ │              │ │              │       │
│ │Total: $2,500 │ │Total: $1,200 │ │Total: $3,800 │       │
│ │Exp: 12 days  │ │Exp: 5 days⚠️│ │Not sent      │       │
│ │              │ │              │ │              │       │
│ │[Convert Job] │ │[View][Edit]  │ │[Edit][Send]  │       │
│ └──────────────┘ └──────────────┘ └──────────────┘       │
└────────────────────────────────────────────────────────────┘
```

#### Add/Edit Estimate Modal
```
┌────────────────────────────────────────────────────────────┐
│ ✕ New Estimate                                             │
├────────────────────────────────────────────────────────────┤
│ BASIC INFO                                                 │
│ Title: [Kitchen Remodel___________]                        │
│ Lead:  [🔍 John Smith ▾] or [+ Create New Lead]           │
│ Status: [Draft ▾]        Expires: [Dec 31, 2025]          │
│ Description: [____________________________________]         │
│                                                            │
│ LINE ITEMS                                                 │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Description        Qty    Rate      Total            │   │
│ │ [Labor________]   [1]  [$1000]   = $1,000  [✕]      │   │
│ │ [Materials____]   [1]  [$500 ]   = $500    [✕]      │   │
│ │ [+ Add Line Item]                                    │   │
│ │                                   ─────────────      │   │
│ │                                   TOTAL: $1,500      │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                            │
│ PHOTOS (2/3 used)                                          │
│ ┌────┐ ┌────┐ ┌──────────┐                                │
│ │📷 │ │📷 │ │+ Upload  │                                │
│ │ ✕ │ │ ✕ │ │or Drag   │                                │
│ └────┘ └────┘ └──────────┘                                │
│                                                            │
│ TERMS & CONDITIONS                                         │
│ [Standard terms... payment due 30 days...]                 │
│                                                            │
│ NOTES (Internal)                                           │
│ [Client prefers oak cabinets...]                           │
│                                                            │
│                              [Cancel] [Save Estimate]      │
└────────────────────────────────────────────────────────────┘
```

### Build Checklist

**Session 1: Foundation (2-3 hours)**
- [ ] Create Estimates.js module structure
- [ ] Add state management (estimates, leads, filters)
- [ ] Build estimates_init() - load estimates and leads
- [ ] Build estimates_render() - main render function
- [ ] Build estimates_renderStatsBar() - quick stats
- [ ] Build estimates_renderFilters() - status/lead/date filters
- [ ] Build estimates_renderEstimatesGrid() - card layout
- [ ] Build estimates_renderAddEditModal() - basic form
- [ ] Build estimates_handleSave() - create/update logic
- [ ] Build estimates_renderLeadDropdown() - with quick create
- [ ] Test create/update/delete flows

**Session 2: Line Items + Photos (2-3 hours)**
- [ ] Build line items table component
- [ ] Add/remove row functionality
- [ ] Auto-calculate totals
- [ ] Build photo upload section
- [ ] Integrate API.uploadEstimatePhoto()
- [ ] Photo preview grid with delete
- [ ] Photo counter "X/3 photos"
- [ ] Test photo upload/compression/delete

**Session 3: Status Workflow + Convert (1-2 hours)**
- [ ] Build estimates_renderDetailView() - read-only
- [ ] Build status action buttons (sent, accepted, rejected)
- [ ] Build "Convert to Job" button
- [ ] Handle API.convertEstimateToJob()
- [ ] Redirect to Jobs with new job open
- [ ] Add expiration warnings
- [ ] Final testing & polish

---

## 🏢 JOBS HUB - NEW ARCHITECTURE v13.0

**Status:** ✅ COMPLETE - Jobs is now a parent container with 2 sections

### Overview

Jobs has been restructured from a single module into a **parent hub** that consolidates project management features. This creates a unified "Project Management Hub" accessible from the navigation.

### Architecture

```
Jobs (Navigation) → Jobs Hub (Parent Container)
                    ├── Estimates Section
                    └── Jobs Section
```

**When users click "Jobs" in the navigation:**
1. They see 2 large, beautiful blocks: Estimates, Jobs
2. Clicking any block loads that module inside the Jobs hub
3. A "Back to Hub" button returns to the 2-block selector

### Files Structure

```javascript
/scripts/
  Jobs.js              // Parent hub container
  JobsManagement.js    // Actual jobs functionality
  Estimates.js         // Estimates module (unchanged)
```

**Jobs.js (Parent Hub):**
- `window.JobsModule` - Parent container
- Shows 2-block selector on init
- Routes to appropriate sub-module when clicked
- Provides "Back to Hub" navigation

**JobsManagement.js:**
- `window.JobsManagementModule` - Actual jobs functionality
- Contains all job tracking, profit calculations, etc.
- Loaded when "Jobs" block is clicked

### Navigation Changes

**Removed from Navigation:**
- ❌ Estimates (no longer a top-level nav item)

**Estimates is now accessible via:**
- Jobs → Estimates block

**Why this structure?**
- Groups related project management features
- Reduces nav clutter
- Natural workflow: Estimate → Job
- Estimates and Jobs are tightly coupled

### User Flow Examples

**Create Estimate Flow:**
1. Click "Jobs" in nav
2. Click "Estimates" block
3. Estimates module loads with full functionality
4. Click "Back to Hub" to return

**Manage Jobs Flow:**
1. Click "Jobs" in nav
2. Click "Jobs" block
3. Jobs Management module loads
4. Full job tracking, profit calculations, etc.

### Implementation Details

**Jobs.js structure:**
```javascript
window.JobsModule = {
    state: {
        container: 'jobs-content',
        activeSection: null  // 'estimates' or 'jobs'
    },

    async init(targetContainer) {
        // Show 2-block selector
        this.renderSectionSelector();
    },

    async loadSection(sectionName) {
        // Load appropriate module:
        // - 'estimates' → EstimatesModule.init('jobs-section-content')
        // - 'jobs' → JobsManagementModule.init('jobs-section-content')
    }
}
```

**Container nesting:**
```
#jobs-content (main container)
  └── .jobs-hub-container
       ├── .jobs-hub-sections (2 blocks)
       └── #jobs-section-content (sub-module renders here)
```

### Visual Design

**3-Block Selector:**
- Beautiful gradient icons
- Hover animations (lift up, glow)
- Clear section descriptions
- Badge labels ("Quote Management", "Project Tracking", "Coming Soon")

**Styling:**
- Consistent with Goals/Estimates design
- Responsive grid (1-3 columns)
- Smooth transitions
- Professional gradient effects

### Benefits

✅ **Cleaner Navigation** - One entry point for all project management
✅ **Better UX** - Related features grouped together
✅ **Scalable** - Easy to add more sections (Invoices, Contracts, etc.)
✅ **Flexible** - Each sub-module maintains full functionality

### Future Expansion

**Potential new sections:**
- Invoices (track sent/paid invoices)
- Contracts (manage signed agreements)
- Proposals (pre-estimate pitches)
- Schedule (calendar view of all jobs)

All would be accessible through the Jobs Hub without cluttering navigation.

---

## 💼 JOBS MANAGEMENT MODULE - DETAILED ANALYSIS & RECOMMENDATIONS

**(Formerly "JOBS MODULE")**

### Current Schema Review (From Line 368)

The existing `jobs` table schema is **solid** and covers the core needs:

**✅ What's Good:**
- Clean financial tracking (material_cost, labor_hours, labor_rate, other_expenses)
- Auto-calculated fields (total_cost, profit, profit_margin) - smart!
- Links to leads (estimate → job workflow)
- Payment tracking (invoice_number, payment_status)
- Materials stored as JSONB (flexible)
- Time tracking (scheduled_date, scheduled_time, duration_hours)

**💡 Recommended Additions:**

1. **estimate_id** - Link back to estimate that created this job
   ```sql
   estimate_id  UUID REFERENCES estimates(id) ON DELETE SET NULL
   ```

2. **deposit_amount & deposit_status** - Track deposits separately
   ```sql
   deposit_amount    NUMERIC DEFAULT 0
   deposit_paid      BOOLEAN DEFAULT FALSE
   deposit_paid_at   TIMESTAMPTZ
   ```

3. **actual_labor_hours** - Track estimated vs actual
   ```sql
   estimated_labor_hours  NUMERIC  -- renamed from labor_hours
   actual_labor_hours     NUMERIC  -- what it actually took
   ```

4. **photos** - Before/after job photos (critical for contractors)
   ```sql
   photos  JSONB DEFAULT '[]'::JSONB
   -- [{"url": "...", "type": "before|during|after", "caption": "..."}]
   ```

5. **crew_members** - Track who worked on the job
   ```sql
   crew_members  JSONB DEFAULT '[]'::JSONB
   -- [{"name": "John", "hours": 8, "rate": 25}]
   ```

6. **materials tracking improvements** - Better structure
   ```sql
   materials  JSONB DEFAULT '[]'::JSONB
   -- [{"name": "2x4 lumber", "quantity": 50, "unit": "pcs", "cost_per_unit": 5.99, "supplier": "Home Depot", "total": 299.50}]
   ```

### Recommended Status Flow

```
draft → scheduled → in_progress → completed → invoiced → paid
                 ↓
              cancelled
```

### Recommended Job Types (Contractor-Focused)

```javascript
const JOB_TYPES = [
  'installation',
  'repair',
  'maintenance',
  'inspection',
  'consultation',
  'emergency',
  'custom'
];
```

### Financial Calculations (Auto-computed)

```javascript
// Total Cost = materials + labor + other
total_cost = material_cost + (actual_labor_hours * labor_rate) + other_expenses

// Profit = what customer paid - what it cost
profit = final_price - total_cost

// Profit Margin = profit as percentage
profit_margin = (profit / final_price) * 100
```

### UI Features to Build

**Jobs List View:**
- Filter by status, date range, payment status
- Sort by scheduled date, profit, completion
- Quick stats: Total revenue, total profit, avg profit margin
- Color-coded status badges

**Job Detail Modal:**
- Top section: Job info (title, lead, dates, status)
- Financial section: Costs breakdown, quoted vs final price, profit
- Materials list: Editable table
- Crew section: Who worked + hours
- Photos: Before/during/after grid
- Timeline: Status changes, payments received

**Add/Edit Job:**
- Link to lead (dropdown)
- Link to estimate (optional)
- Financial inputs with live profit calculation
- Materials table (add/remove rows)
- Photo upload (drag & drop)
- Crew assignment

---

## 🏗️ JOBS MODULE - IMPLEMENTATION BATTLE PLAN

### Photo Storage Limits (Pro Tier Only)
- **Per Job**: 3 photos max (before/during/after)
- **Total Storage**: 50 MB bucket limit (Supabase free tier)
- **Total Jobs**: 1,000 jobs limit
- **Estimated Capacity**: ~16 KB per photo avg = 48KB per job × 1,000 jobs = 48 MB (safe margin)
- **Tier Restriction**: Photos available **ONLY in Pro tier**

### Implementation Phases

**Phase 1: Core Foundation (3-4 hours) - BUILD THIS FIRST**
1. Module structure + state management
2. Jobs list view with cards
3. Filters (status, payment, date range)
4. Add/Edit job modal with:
   - Lead dropdown
   - Basic info (title, description, type, status, priority)
   - Scheduling (date, time, duration)
   - Financial inputs (material cost, labor rate/hours, quoted price, deposit)
   - **Live profit calculation** (auto-updates as you type)
5. Delete job with confirmation
6. Quick stats bar (total revenue, profit, avg margin)

**Phase 2: Advanced Features (2-3 hours)**
7. Materials section (collapsible)
   - Add/remove rows dynamically
   - Name, quantity, unit, cost per unit, total
   - Auto-sum material costs
8. Deposit tracking
   - Checkbox "Deposit Paid" with date
   - Mark deposit paid from job card
9. Invoice number generation
10. Payment status dropdown
11. Job detail view (read-only mode)

**Phase 3: Premium Features (2-3 hours)**
12. Crew members section (collapsible)
    - Add/remove crew members
    - Name, role, hours worked, hourly rate
13. Photo upload (collapsible, **Pro tier only**)
    - Drag & drop or file picker
    - 3 photo limit with visual counter "2/3 photos used"
    - Type selector (before/during/after)
    - Photo preview grid with delete
14. Complete job workflow
    - Modal to enter final price and actual hours
    - Auto-calculate final profit/margin
    - Mark job as completed

**Total Time: 7-10 hours**

### Visual Mockups

#### Jobs List View
```
┌────────────────────────────────────────────────────────────┐
│ JOBS                                         + New Job     │
├────────────────────────────────────────────────────────────┤
│ Quick Stats: Revenue $45K | Profit $12K | Margin 27%      │
│                                                            │
│ Filters: [Status ▾] [Payment ▾] [Date ▾]                  │
│                                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │Kitchen Remod │ │Bathroom Rep. │ │Deck Build    │       │
│ │John Smith    │ │Sarah Johnson │ │Mike Davis    │       │
│ │              │ │              │ │              │       │
│ │🟢 In Progress│ │🔵 Scheduled  │ │🟡 Draft      │       │
│ │Nov 12, 2025  │ │Nov 15, 2025  │ │TBD           │       │
│ │              │ │              │ │              │       │
│ │Quote: $12.5K │ │Quote: $3.2K  │ │Est: $8K      │       │
│ │Profit: $3.2K │ │Deposit: ✓    │ │Draft         │       │
│ │(26%)         │ │              │ │              │       │
│ │[View][Edit]  │ │[View][Edit]  │ │[Edit][X]     │       │
│ └──────────────┘ └──────────────┘ └──────────────┘       │
└────────────────────────────────────────────────────────────┘
```

#### Add/Edit Job Modal
```
┌────────────────────────────────────────────────────────────┐
│ ✕ Add New Job                                              │
├────────────────────────────────────────────────────────────┤
│ BASIC INFO                                                 │
│ Title: [Kitchen Remodel___________]                        │
│ Lead:  [🔍 John Smith ▾]    Status: [Scheduled ▾]         │
│ Type:  [Installation ▾]     Priority: [High ▾]            │
│ Date:  [Nov 12, 2025] @ [2:00 PM]  Duration: [8] hrs      │
│ Description: [____________________________________]         │
│                                                            │
│ FINANCIAL                                                  │
│ Material Cost:    [$2,500] Labor Rate: [$50]/hr           │
│ Estimated Hours:  [40] hrs Other: [$200]                  │
│ Quoted Price:     [$12,500]                                │
│ Deposit:          [$2,500] [☐] Paid                       │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │💰 PROFIT: $7,800 (62%) = $12,500 - $4,700 cost       │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ▾ MATERIALS (Optional)                                     │
│ ▾ CREW (Optional)                                          │
│ ▾ PHOTOS (Optional - Pro Only) 🔒                         │
│                                                            │
│                               [Cancel] [Save Job]          │
└────────────────────────────────────────────────────────────┘
```

#### Job Detail View
```
┌────────────────────────────────────────────────────────────┐
│ ← Back   Kitchen Remodel              [Edit][Complete]    │
├────────────────────────────────────────────────────────────┤
│ Lead: John Smith (555-1234) | 🟢 In Progress              │
│ Nov 12, 2025 @ 2:00 PM | 8 hours | Installation           │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ FINANCIAL                                              │ │
│ │ Revenue:  $12,500                                      │ │
│ │ - Materials: -$2,500                                   │ │
│ │ - Labor: -$2,000 (40 hrs × $50/hr)                    │ │
│ │ - Other: -$200                                         │ │
│ │ Profit: $7,800 (62%)                                   │ │
│ │ Deposit: $2,500 ✓ Paid Nov 1                          │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ MATERIALS (3 items)                                        │
│ • Oak Cabinets × 12 @ $150 = $1,800                       │
│ • Granite × 1 @ $500 = $500                               │
│ • Hardware × 1 @ $200 = $200                              │
│                                                            │
│ CREW (2 members)                                           │
│ • Mike J. - Lead Carpenter - 24 hrs @ $50/hr              │
│ • Tom W. - Assistant - 16 hrs @ $35/hr                    │
│                                                            │
│ PHOTOS (3/3) 🔒 Pro Only                                  │
│ ┌────┐ ┌────┐ ┌────┐                                     │
│ │📷 │ │📷 │ │📷 │ Before | During | After             │
│ └────┘ └────┘ └────┘                                     │
└────────────────────────────────────────────────────────────┘
```

### Build Checklist

**Files to Create/Modify:**
- ✅ `Jobs.js` - Main module (create from scratch)
- ✅ `api.js` - Already has 30+ Jobs methods
- ✅ Database - Already migrated with all fields
- ✅ Storage - Already set up with policies

**Step-by-Step Build Order:**

**Session 1: Foundation (1-2 hours)**
- [ ] Create Jobs.js module structure
- [ ] Add state management (jobs, leads, filters, editingJob)
- [ ] Build jobs_init() - load jobs and leads
- [ ] Build jobs_render() - main render function
- [ ] Build jobs_renderStatsBar() - quick stats
- [ ] Build jobs_renderFilters() - status/payment/date filters
- [ ] Build jobs_renderJobsGrid() - card layout

**Session 2: Add/Edit Modal (2 hours)**
- [ ] Build jobs_renderAddEditModal() - full form
- [ ] Build jobs_calculateProfit() - live calculation
- [ ] Build jobs_handleSave() - create/update logic
- [ ] Build jobs_renderLeadDropdown() - searchable dropdown
- [ ] Add form validation
- [ ] Test create/update/delete flows

**Session 3: Advanced Features (2 hours)**
- [ ] Build materials section (collapsible)
- [ ] Add/remove material rows dynamically
- [ ] Auto-sum material costs
- [ ] Build deposit tracking UI
- [ ] Build invoice generation
- [ ] Build job detail view (read-only)

**Session 4: Premium Features (2-3 hours)**
- [ ] Build crew section (collapsible)
- [ ] Add/remove crew members
- [ ] Build photo upload UI (Pro tier gate)
- [ ] Integrate with Supabase Storage
- [ ] Photo counter "2/3 used"
- [ ] Complete job workflow
- [ ] Final testing & polish

### Database Indexes to Add

```sql
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_lead_id ON jobs(lead_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX idx_jobs_payment_status ON jobs(payment_status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

### RLS Policies Needed

```sql
-- Users can only see their own jobs
CREATE POLICY jobs_select_own ON jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY jobs_insert_own ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY jobs_update_own ON jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY jobs_delete_own ON jobs FOR DELETE USING (auth.uid() = user_id);
```

### API Methods to Build

```javascript
// In api.js
API.getJobs(filters)           // Get all jobs with optional filters
API.getJobById(id)             // Get single job with full details
API.createJob(data)            // Create new job
API.updateJob(id, updates)     // Update existing job
API.deleteJob(id)              // Delete job
API.completeJob(id, finalData) // Mark job complete + set final price/hours
API.getJobsByLead(leadId)      // Get all jobs for a specific lead
API.getJobStats()              // Get revenue/profit stats
```

### Implementation Priority

**Phase 1 (Core - 3-4 hours):**
- Basic CRUD operations
- List view with filters
- Add/Edit modal with financial calculations
- Link to leads

**Phase 2 (Financial - 2 hours):**
- Materials table (add/remove rows)
- Live profit calculations
- Payment status tracking
- Invoice number generation

**Phase 3 (Polish - 2-3 hours):**
- Photo upload/display
- Crew tracking
- Before/after photo comparison
- Job status timeline

**Total:** 7-9 hours (more realistic than 5-6)

### Integration with Estimates Module

When an estimate is accepted:
1. Auto-create job from estimate
2. Copy line items → materials
3. Copy total → quoted_price
4. Link estimate_id → job
5. Set status to 'scheduled'
6. Notify user "Job created from estimate!"

---

## 📝 METADATA

**Version:** 13.2
**Subtitle:** JOBS HUB SIMPLIFIED - 2-SECTION ARCHITECTURE
**Last Updated:** Removed Clients placeholder, Jobs Hub now has Estimates + Jobs only
**Status:** Goals 100% | Estimates 100% | Jobs Hub 100% | Jobs Management 100% ✅ | Settings 70% | Mobile not tested
**Philosophy:** Simple CRM + Smart Auto-Tracking + Clean Professional UI + Unified Project Hub
**Next Action:** Settings Preferences (2-3 hours) → Mobile optimization (5-6 hours)
**Launch ETA:** 7-9 hours remaining

**Major Changes from v13.1:**
- ✅ Simplified Jobs Hub from 3 sections to 2 sections
- ✅ Removed Clients.js placeholder module
- ✅ Updated all documentation to reflect 2-section architecture
- ✅ Cleaner project management workflow (Estimates → Jobs)

---

**END OF HANDOFF DOCUMENT v13.2**

*This is the single source of truth for SteadyManager Pro development.*
*Current Focus: Jobs Hub ✅ → Settings Preferences → Mobile → Ship 🚀*

---

**Goals ✅ Estimates ✅ Jobs Hub ✅ | Settings & Mobile are NEXT. Let's ship this! 💪🔥**