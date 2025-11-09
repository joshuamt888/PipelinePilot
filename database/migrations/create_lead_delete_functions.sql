-- Lead Delete RPC Functions
-- Date: 2025-11-09
-- Purpose: Safely delete leads with proper cleanup of related data
--
-- What this does:
-- 1. Sets estimate.lead_id to NULL (estimates become orphaned but preserved)
-- 2. Deletes the lead (tasks CASCADE delete automatically via FK)
-- 3. Decrements the user's current_leads counter
-- 4. Only allows users to delete their own leads

-- ============================================================================
-- Function 1: Delete single lead
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_lead_with_decrement(
    p_lead_id UUID,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Step 1: Orphan any estimates linked to this lead (preserve estimates)
    UPDATE estimates
    SET lead_id = NULL
    WHERE lead_id = p_lead_id
    AND user_id = p_user_id;

    -- Step 2: Delete the lead (tasks CASCADE delete via FK constraint)
    DELETE FROM leads
    WHERE id = p_lead_id
    AND user_id = p_user_id;

    -- Step 3: Decrement the user's current_leads counter
    UPDATE users
    SET current_leads = GREATEST(0, current_leads - 1)
    WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_lead_with_decrement(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION delete_lead_with_decrement(UUID, UUID) IS
    'Delete a single lead. Orphans estimates, cascades tasks, decrements counter.';


-- ============================================================================
-- Function 2: Batch delete multiple leads
-- ============================================================================
CREATE OR REPLACE FUNCTION batch_delete_leads(
    p_lead_ids UUID[],
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Step 1: Orphan any estimates linked to these leads
    UPDATE estimates
    SET lead_id = NULL
    WHERE lead_id = ANY(p_lead_ids)
    AND user_id = p_user_id;

    -- Step 2: Delete all leads that belong to the user
    DELETE FROM leads
    WHERE id = ANY(p_lead_ids)
    AND user_id = p_user_id;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Step 3: Decrement the user's current_leads counter
    UPDATE users
    SET current_leads = GREATEST(0, current_leads - deleted_count)
    WHERE id = p_user_id;

    RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION batch_delete_leads(UUID[], UUID) TO authenticated;

COMMENT ON FUNCTION batch_delete_leads(UUID[], UUID) IS
    'Batch delete leads. Orphans estimates, cascades tasks, decrements counter. Returns count deleted.';
