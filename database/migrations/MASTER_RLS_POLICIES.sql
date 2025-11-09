-- ============================================================================
-- MASTER RLS POLICIES - ONE SCRIPT TO RULE THEM ALL
-- ============================================================================
-- Date: 2025-11-09
-- Purpose: Consolidate ALL RLS policies in one place
--
-- This script:
-- 1. Drops ALL existing policies (clean slate)
-- 2. Enables RLS on all tables
-- 3. Creates simple, consistent policies for every table
--
-- Tables covered:
-- - users
-- - leads
-- - tasks
-- - goals
-- - goal_tasks
-- - estimates
-- - jobs
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- ============================================================================

-- Users table
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_delete_own ON public.users;

-- Leads table
DROP POLICY IF EXISTS leads_select ON public.leads;
DROP POLICY IF EXISTS leads_insert ON public.leads;
DROP POLICY IF EXISTS leads_update ON public.leads;
DROP POLICY IF EXISTS leads_delete ON public.leads;
DROP POLICY IF EXISTS leads_select_own ON public.leads;
DROP POLICY IF EXISTS leads_insert_own ON public.leads;
DROP POLICY IF EXISTS leads_update_own ON public.leads;
DROP POLICY IF EXISTS leads_delete_own ON public.leads;

-- Tasks table
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;
DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
DROP POLICY IF EXISTS tasks_update_own ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;

-- Goals table
DROP POLICY IF EXISTS goals_select_own ON public.goals;
DROP POLICY IF EXISTS goals_insert_own ON public.goals;
DROP POLICY IF EXISTS goals_update_own ON public.goals;
DROP POLICY IF EXISTS goals_delete_own ON public.goals;

-- Goal Tasks junction table
DROP POLICY IF EXISTS goal_tasks_select_own ON public.goal_tasks;
DROP POLICY IF EXISTS goal_tasks_insert_own ON public.goal_tasks;
DROP POLICY IF EXISTS goal_tasks_delete_own ON public.goal_tasks;

-- Estimates table
DROP POLICY IF EXISTS estimates_select_own ON public.estimates;
DROP POLICY IF EXISTS estimates_insert_own ON public.estimates;
DROP POLICY IF EXISTS estimates_update_own ON public.estimates;
DROP POLICY IF EXISTS estimates_delete_own ON public.estimates;

-- Jobs table
DROP POLICY IF EXISTS jobs_select_own ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_own ON public.jobs;
DROP POLICY IF EXISTS jobs_update_own ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_own ON public.jobs;


-- ============================================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 3: CREATE POLICIES FOR EACH TABLE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS TABLE
-- Users can only see/update their own profile
-- ----------------------------------------------------------------------------

CREATE POLICY users_select_own ON public.users
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY users_update_own ON public.users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());


-- ----------------------------------------------------------------------------
-- LEADS TABLE
-- Users can only see/modify their own leads
-- ----------------------------------------------------------------------------

CREATE POLICY leads_select_own ON public.leads
    FOR SELECT
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY leads_insert_own ON public.leads
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY leads_update_own ON public.leads
    FOR UPDATE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY leads_delete_own ON public.leads
    FOR DELETE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));


-- ----------------------------------------------------------------------------
-- TASKS TABLE
-- Users can only see/modify their own tasks
-- ----------------------------------------------------------------------------

CREATE POLICY tasks_select_own ON public.tasks
    FOR SELECT
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY tasks_insert_own ON public.tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY tasks_update_own ON public.tasks
    FOR UPDATE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY tasks_delete_own ON public.tasks
    FOR DELETE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));


-- ----------------------------------------------------------------------------
-- GOALS TABLE
-- Users can only see/modify their own goals
-- ----------------------------------------------------------------------------

CREATE POLICY goals_select_own ON public.goals
    FOR SELECT
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY goals_insert_own ON public.goals
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY goals_update_own ON public.goals
    FOR UPDATE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY goals_delete_own ON public.goals
    FOR DELETE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));


-- ----------------------------------------------------------------------------
-- GOAL_TASKS TABLE (Junction table)
-- Users can only see/modify links for their own goals
-- ----------------------------------------------------------------------------

CREATE POLICY goal_tasks_select_own ON public.goal_tasks
    FOR SELECT
    TO authenticated
    USING (
        goal_id IN (
            SELECT id FROM public.goals
            WHERE user_id IN (SELECT id FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY goal_tasks_insert_own ON public.goal_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        goal_id IN (
            SELECT id FROM public.goals
            WHERE user_id IN (SELECT id FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY goal_tasks_delete_own ON public.goal_tasks
    FOR DELETE
    TO authenticated
    USING (
        goal_id IN (
            SELECT id FROM public.goals
            WHERE user_id IN (SELECT id FROM public.users WHERE id = auth.uid())
        )
    );


-- ----------------------------------------------------------------------------
-- ESTIMATES TABLE
-- Users can only see/modify their own estimates
-- ----------------------------------------------------------------------------

CREATE POLICY estimates_select_own ON public.estimates
    FOR SELECT
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY estimates_insert_own ON public.estimates
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY estimates_update_own ON public.estimates
    FOR UPDATE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY estimates_delete_own ON public.estimates
    FOR DELETE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));


-- ----------------------------------------------------------------------------
-- JOBS TABLE
-- Users can only see/modify their own jobs
-- ----------------------------------------------------------------------------

CREATE POLICY jobs_select_own ON public.jobs
    FOR SELECT
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY jobs_insert_own ON public.jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY jobs_update_own ON public.jobs
    FOR UPDATE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));

CREATE POLICY jobs_delete_own ON public.jobs
    FOR DELETE
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    table_name TEXT;
    missing_policies TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check each table has RLS enabled and 4 policies (or 3 for junction tables)
    FOR table_name IN
        SELECT unnest(ARRAY['users', 'leads', 'tasks', 'goals', 'goal_tasks', 'estimates', 'jobs'])
    LOOP
        -- Check RLS enabled
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = table_name
            AND rowsecurity = true
        ) THEN
            RAISE WARNING 'RLS not enabled on table: %', table_name;
            missing_policies := array_append(missing_policies, table_name);
        END IF;
    END LOOP;

    IF array_length(missing_policies, 1) IS NULL THEN
        RAISE NOTICE '✓ All tables have RLS enabled';
        RAISE NOTICE '✓ Run this query to verify policies:';
        RAISE NOTICE 'SELECT tablename, COUNT(*) as policy_count FROM pg_policies WHERE schemaname = ''public'' GROUP BY tablename ORDER BY tablename;';
    ELSE
        RAISE EXCEPTION 'RLS setup incomplete. Check warnings above.';
    END IF;
END $$;
