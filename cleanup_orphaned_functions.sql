-- Cleanup Orphaned RPC Functions
-- Date: 2025-11-09
-- Purpose: Drop RPC functions that are no longer used (replaced with direct queries)

-- These functions were replaced with direct Supabase queries in api.js
-- See commit: "Fix lead deletion - remove dependency on deleted RPC functions"

DROP FUNCTION IF EXISTS delete_lead_with_decrement(UUID, UUID);
DROP FUNCTION IF EXISTS batch_delete_leads(UUID[], UUID);

-- Verify they're gone
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname IN ('delete_lead_with_decrement', 'batch_delete_leads')
    ) THEN
        RAISE EXCEPTION 'Functions still exist! Check function signatures.';
    ELSE
        RAISE NOTICE '✓ Successfully dropped orphaned lead deletion functions';
    END IF;
END $$;
