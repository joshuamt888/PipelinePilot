-- Diagnostic: Check if lead delete functions exist and are accessible
-- Run this to verify the functions were created properly

-- Check if functions exist
SELECT
    routine_name,
    routine_type,
    security_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('delete_lead_with_decrement', 'batch_delete_leads')
ORDER BY routine_name;

-- Check function parameters
SELECT
    r.routine_name,
    p.parameter_name,
    p.data_type,
    p.parameter_mode
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p
    ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
AND r.routine_name IN ('delete_lead_with_decrement', 'batch_delete_leads')
ORDER BY r.routine_name, p.ordinal_position;

-- Check grants
SELECT
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name IN ('delete_lead_with_decrement', 'batch_delete_leads')
ORDER BY routine_name;
