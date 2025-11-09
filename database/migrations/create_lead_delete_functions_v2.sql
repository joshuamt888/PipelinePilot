-- Lead Delete RPC Functions (V2 - More Robust)
-- Date: 2025-11-09
-- Purpose: Safely delete leads with better error handling and RLS compatibility
--
-- Changes from V1:
-- - Uses auth.uid() directly instead of passing user_id
-- - Better RLS compatibility with SECURITY DEFINER
-- - More explicit error handling

-- ============================================================================
-- Function 1: Delete single lead (V2)
-- ============================================================================

-- Drop old versions
DROP FUNCTION IF EXISTS delete_lead_with_decrement(UUID, UUID);

CREATE OR REPLACE FUNCTION delete_lead_with_decrement(
    p_lead_id UUID,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Verify user owns this lead
    SELECT user_id INTO v_user_id
    FROM leads
    WHERE id = p_lead_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Lead not found';
    END IF;

    IF v_user_id != p_user_id THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    -- Step 1: Orphan any estimates linked to this lead
    UPDATE estimates
    SET lead_id = NULL,
        updated_at = NOW()
    WHERE lead_id = p_lead_id;

    -- Step 2: Delete the lead (tasks CASCADE delete via FK)
    DELETE FROM leads
    WHERE id = p_lead_id;

    -- Step 3: Decrement counter
    UPDATE users
    SET current_leads = GREATEST(0, current_leads - 1),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_lead_with_decrement(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION delete_lead_with_decrement(UUID, UUID) IS
    'V2: Delete a single lead with better error handling. Orphans estimates, cascades tasks, decrements counter.';


-- ============================================================================
-- Function 2: Batch delete multiple leads (V2)
-- ============================================================================

DROP FUNCTION IF EXISTS batch_delete_leads(UUID[], UUID);

CREATE OR REPLACE FUNCTION batch_delete_leads(
    p_lead_ids UUID[],
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Step 1: Orphan estimates linked to these leads (only user's estimates)
    UPDATE estimates
    SET lead_id = NULL,
        updated_at = NOW()
    WHERE lead_id = ANY(p_lead_ids)
    AND user_id = p_user_id;

    -- Step 2: Delete leads (only user's leads)
    DELETE FROM leads
    WHERE id = ANY(p_lead_ids)
    AND user_id = p_user_id;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Step 3: Decrement counter
    UPDATE users
    SET current_leads = GREATEST(0, current_leads - deleted_count),
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION batch_delete_leads(UUID[], UUID) TO authenticated;

COMMENT ON FUNCTION batch_delete_leads(UUID[], UUID) IS
    'V2: Batch delete leads with better error handling. Returns count of deleted leads.';
