-- Check RLS policies for leads and estimates tables
-- This helps diagnose delete issues

-- Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('leads', 'estimates', 'tasks')
ORDER BY tablename;

-- Check all policies on leads
SELECT
    tablename,
    policyname,
    cmd as operation,
    qual as using_condition,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'leads'
ORDER BY cmd, policyname;

-- Check all policies on estimates
SELECT
    tablename,
    policyname,
    cmd as operation,
    qual as using_condition,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'estimates'
ORDER BY cmd, policyname;

-- Check all policies on tasks (for comparison)
SELECT
    tablename,
    policyname,
    cmd as operation,
    qual as using_condition,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'tasks'
ORDER BY cmd, policyname;
