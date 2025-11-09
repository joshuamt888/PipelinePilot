-- Migration: Add RLS Policies for Estimates Table
-- Date: 2025-11-09
-- Purpose: Enable Row Level Security and create policies for estimates table
-- Ensures users can only access their own estimates

-- Step 1: Enable RLS on estimates table
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if any (for clean slate)
DROP POLICY IF EXISTS estimates_select_own ON public.estimates;
DROP POLICY IF EXISTS estimates_insert_own ON public.estimates;
DROP POLICY IF EXISTS estimates_update_own ON public.estimates;
DROP POLICY IF EXISTS estimates_delete_own ON public.estimates;

-- Step 3: Create policies for estimates table

-- SELECT policy: Users can only see their own estimates
CREATE POLICY estimates_select_own ON public.estimates
    FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.users WHERE id = auth.uid()
        )
    );

-- INSERT policy: Users can only create estimates for themselves
CREATE POLICY estimates_insert_own ON public.estimates
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.users WHERE id = auth.uid()
        )
    );

-- UPDATE policy: Users can only update their own estimates
CREATE POLICY estimates_update_own ON public.estimates
    FOR UPDATE
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.users WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.users WHERE id = auth.uid()
        )
    );

-- DELETE policy: Users can only delete their own estimates
CREATE POLICY estimates_delete_own ON public.estimates
    FOR DELETE
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.users WHERE id = auth.uid()
        )
    );

-- Step 4: Add helpful comments
COMMENT ON POLICY estimates_select_own ON public.estimates IS
    'Allow users to view only their own estimates';

COMMENT ON POLICY estimates_insert_own ON public.estimates IS
    'Allow users to create estimates only for themselves';

COMMENT ON POLICY estimates_update_own ON public.estimates IS
    'Allow users to update only their own estimates';

COMMENT ON POLICY estimates_delete_own ON public.estimates IS
    'Allow users to delete only their own estimates';

-- Step 5: Verify RLS is enabled
DO $$
BEGIN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'estimates' AND relnamespace = 'public'::regnamespace) THEN
        RAISE EXCEPTION 'RLS not enabled on estimates table!';
    END IF;
    RAISE NOTICE 'RLS successfully enabled on estimates table';
END $$;
