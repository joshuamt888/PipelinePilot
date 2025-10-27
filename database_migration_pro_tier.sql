-- =====================================================
-- STEADYMANAGER PRO TIER - DATABASE MIGRATION
-- Apple-touch manual CRM with Jobs, Goals, and Enhanced Tracking
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. JOBS TABLE (Enhanced Tasks with Cost/Profit)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    job_type TEXT DEFAULT 'service',  -- 'service', 'product', 'consultation', 'project'
    status TEXT DEFAULT 'scheduled',  -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    priority TEXT DEFAULT 'medium',   -- 'low', 'medium', 'high', 'urgent'

    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    duration_hours NUMERIC(5,2),      -- 2.5 hours
    completed_at TIMESTAMPTZ,

    -- Financial Tracking (Manual Input = Better Google Sheets)
    material_cost NUMERIC(12,2) DEFAULT 0,     -- Cost of materials used
    labor_hours NUMERIC(5,2) DEFAULT 0,        -- Actual hours worked
    labor_rate NUMERIC(8,2) DEFAULT 0,         -- $/hour
    other_expenses NUMERIC(12,2) DEFAULT 0,    -- Gas, tools, permits, etc

    -- Auto-calculated (like spreadsheet formulas)
    total_cost NUMERIC(12,2) GENERATED ALWAYS AS (
        material_cost + (labor_hours * labor_rate) + other_expenses
    ) STORED,

    quoted_price NUMERIC(12,2) DEFAULT 0,      -- What you quoted client
    final_price NUMERIC(12,2),                 -- What you actually charged (if different)

    profit NUMERIC(12,2) GENERATED ALWAYS AS (
        COALESCE(final_price, quoted_price) - (material_cost + (labor_hours * labor_rate) + other_expenses)
    ) STORED,

    profit_margin NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN COALESCE(final_price, quoted_price) > 0
            THEN ((COALESCE(final_price, quoted_price) - (material_cost + (labor_hours * labor_rate) + other_expenses)) / COALESCE(final_price, quoted_price)) * 100
            ELSE 0
        END
    ) STORED,

    -- Materials List (JSONB for flexibility)
    -- Example: [{"name": "Paint", "quantity": 3, "unit": "gallon", "cost": 45.00}]
    materials JSONB DEFAULT '[]',

    -- Notes & Tracking
    notes TEXT,
    location TEXT,
    invoice_number TEXT,
    payment_status TEXT DEFAULT 'pending',  -- 'pending', 'partial', 'paid', 'overdue'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_lead_id ON jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- RLS Policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_select_own ON jobs;
CREATE POLICY jobs_select_own ON jobs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS jobs_insert_own ON jobs;
CREATE POLICY jobs_insert_own ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS jobs_update_own ON jobs;
CREATE POLICY jobs_update_own ON jobs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS jobs_delete_own ON jobs;
CREATE POLICY jobs_delete_own ON jobs FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. GOALS TABLE (Apple-touch Goal Tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Goal Definition
    title TEXT NOT NULL,                       -- "Add 20 leads this month"
    description TEXT,
    goal_type TEXT NOT NULL,                   -- 'leads_created', 'jobs_completed', 'revenue', 'profit', 'conversion_rate'

    -- Target & Progress (Manual tracking like spreadsheet)
    target_value NUMERIC(12,2) NOT NULL,       -- 20 (leads) or 5000 (dollars)
    current_value NUMERIC(12,2) DEFAULT 0,     -- Auto-updated or manual
    unit TEXT,                                 -- 'leads', 'dollars', 'jobs', 'percent'

    -- Time Period
    period TEXT NOT NULL,                      -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Status & Tracking
    status TEXT DEFAULT 'active',              -- 'active', 'completed', 'failed', 'paused'
    is_recurring BOOLEAN DEFAULT false,        -- If true, auto-create new goal when period ends
    auto_track BOOLEAN DEFAULT true,           -- Auto-update current_value from database

    -- Notifications
    remind_at INTEGER,                         -- Days before end_date to remind (3 days before end)

    -- Metadata (for UI customization)
    color TEXT DEFAULT '#667eea',              -- For goal card color
    icon TEXT DEFAULT '🎯',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_end_date ON goals(end_date);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS goals_select_own ON goals;
CREATE POLICY goals_select_own ON goals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS goals_insert_own ON goals;
CREATE POLICY goals_insert_own ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS goals_update_own ON goals;
CREATE POLICY goals_update_own ON goals FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS goals_delete_own ON goals;
CREATE POLICY goals_delete_own ON goals FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 3. USER PREFERENCES (Windowing Toggle, Panels, etc)
-- =====================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
    "windowing_enabled": false,
    "command_palette_enabled": true,
    "quick_panels_enabled": true,
    "default_view": "dashboard",
    "theme": "light",
    "density": "comfortable",
    "animations_enabled": true,
    "keyboard_shortcuts_enabled": true,
    "panels": {
        "analytics": {"enabled": true, "position": "right"},
        "quick_add": {"enabled": true, "position": "bottom-right"},
        "goals": {"enabled": true, "position": "left"}
    }
}';

-- =====================================================
-- 4. LEADS TABLE ENHANCEMENTS
-- =====================================================

-- Position & Department (the ONE critical thing you wanted)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS position TEXT,              -- "VP of Sales", "CEO", "Director"
ADD COLUMN IF NOT EXISTS department TEXT;            -- "Sales", "Marketing", "Engineering"

-- Deal Tracking
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS deal_stage TEXT,            -- "Discovery", "Proposal", "Negotiation"
ADD COLUMN IF NOT EXISTS next_action TEXT,           -- "Send proposal", "Schedule demo"
ADD COLUMN IF NOT EXISTS win_probability INTEGER CHECK (win_probability BETWEEN 0 AND 100);

-- Tags (flexible categorization)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';   -- ["hot", "enterprise", "q4-priority"]

-- =====================================================
-- 5. DATABASE FUNCTIONS (Auto-calculate like formulas)
-- =====================================================

-- Function: Auto-update goal progress when leads are created
CREATE OR REPLACE FUNCTION update_lead_goals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all active goals that track leads
    UPDATE goals
    SET current_value = (
        SELECT COUNT(*)
        FROM leads
        WHERE user_id = NEW.user_id
        AND created_at >= (SELECT start_date FROM goals g WHERE g.id = goals.id)
        AND created_at <= (SELECT end_date FROM goals g WHERE g.id = goals.id)
    ),
    updated_at = NOW()
    WHERE user_id = NEW.user_id
    AND goal_type = 'leads_created'
    AND status = 'active'
    AND auto_track = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update goals when lead is created
DROP TRIGGER IF EXISTS trigger_update_lead_goals ON leads;
CREATE TRIGGER trigger_update_lead_goals
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION update_lead_goals();

-- Function: Auto-update revenue goals when jobs are completed
CREATE OR REPLACE FUNCTION update_revenue_goals()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if job is marked as completed
    IF NEW.status = 'completed' OR (OLD.status != 'completed' AND NEW.status = 'completed') THEN
        UPDATE goals
        SET current_value = (
            SELECT COALESCE(SUM(COALESCE(final_price, quoted_price)), 0)
            FROM jobs
            WHERE user_id = NEW.user_id
            AND status = 'completed'
            AND completed_at >= (SELECT start_date FROM goals g WHERE g.id = goals.id)
            AND completed_at <= (SELECT end_date FROM goals g WHERE g.id = goals.id)
        ),
        updated_at = NOW()
        WHERE user_id = NEW.user_id
        AND goal_type = 'revenue'
        AND status = 'active'
        AND auto_track = true;

        -- Update profit goals
        UPDATE goals
        SET current_value = (
            SELECT COALESCE(SUM(profit), 0)
            FROM jobs
            WHERE user_id = NEW.user_id
            AND status = 'completed'
            AND completed_at >= (SELECT start_date FROM goals g WHERE g.id = goals.id)
            AND completed_at <= (SELECT end_date FROM goals g WHERE g.id = goals.id)
        ),
        updated_at = NOW()
        WHERE user_id = NEW.user_id
        AND goal_type = 'profit'
        AND status = 'active'
        AND auto_track = true;

        -- Update jobs completed goals
        UPDATE goals
        SET current_value = (
            SELECT COUNT(*)
            FROM jobs
            WHERE user_id = NEW.user_id
            AND status = 'completed'
            AND completed_at >= (SELECT start_date FROM goals g WHERE g.id = goals.id)
            AND completed_at <= (SELECT end_date FROM goals g WHERE g.id = goals.id)
        ),
        updated_at = NOW()
        WHERE user_id = NEW.user_id
        AND goal_type = 'jobs_completed'
        AND status = 'active'
        AND auto_track = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update revenue goals when job is completed
DROP TRIGGER IF EXISTS trigger_update_revenue_goals ON jobs;
CREATE TRIGGER trigger_update_revenue_goals
AFTER INSERT OR UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_revenue_goals();

-- Function: Check and mark goals as completed when target is reached
CREATE OR REPLACE FUNCTION check_goal_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark goal as completed if target reached
    IF NEW.current_value >= NEW.target_value AND NEW.status = 'active' THEN
        NEW.status = 'completed';
        NEW.updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-complete goals when target is hit
DROP TRIGGER IF EXISTS trigger_goal_completion ON goals;
CREATE TRIGGER trigger_goal_completion
BEFORE UPDATE ON goals
FOR EACH ROW
EXECUTE FUNCTION check_goal_completion();

-- =====================================================
-- 6. HELPER VIEWS (Optional - for analytics)
-- =====================================================

-- View: Job profitability summary
CREATE OR REPLACE VIEW job_profitability AS
SELECT
    user_id,
    COUNT(*) as total_jobs,
    SUM(COALESCE(final_price, quoted_price)) as total_revenue,
    SUM(total_cost) as total_costs,
    SUM(profit) as total_profit,
    AVG(profit_margin) as avg_margin,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_jobs
FROM jobs
WHERE status = 'completed'
GROUP BY user_id;

-- View: Goal progress summary
CREATE OR REPLACE VIEW goal_progress_summary AS
SELECT
    user_id,
    goal_type,
    COUNT(*) as total_goals,
    COUNT(*) FILTER (WHERE status = 'active') as active_goals,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_goals,
    AVG(CASE
        WHEN target_value > 0
        THEN (current_value / target_value) * 100
        ELSE 0
    END) as avg_progress_percent
FROM goals
GROUP BY user_id, goal_type;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Update api.js with new methods
-- 3. Build Jobs.js, Goals.js modules
-- 4. Add Command Palette to Pro tier
-- =====================================================
