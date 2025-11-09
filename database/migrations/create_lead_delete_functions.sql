-- Lead Delete RPC Functions
-- Date: 2025-11-09
-- Purpose: Create RPC functions for deleting leads that bypass manual modification restrictions
-- These functions handle lead deletion and automatically decrement the current_leads counter

-- ============================================================================
-- Function 1: Delete single lead with counter decrement
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_lead_with_decrement(
    lead_id UUID,
    user_id_val UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete the lead (CASCADE will handle related records like tasks)
    DELETE FROM leads
    WHERE id = lead_id
    AND user_id = user_id_val;

    -- Decrement the user's current_leads counter
    UPDATE users
    SET current_leads = GREATEST(0, current_leads - 1)
    WHERE id = user_id_val;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_lead_with_decrement(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_lead_with_decrement(UUID, UUID) IS
    'Delete a single lead and decrement the users current_leads counter. Only deletes if user owns the lead.';


-- ============================================================================
-- Function 2: Batch delete leads with counter decrement
-- ============================================================================
CREATE OR REPLACE FUNCTION batch_delete_leads(
    lead_ids UUID[],
    user_id_val UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete all leads that belong to the user
    DELETE FROM leads
    WHERE id = ANY(lead_ids)
    AND user_id = user_id_val;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Decrement the user's current_leads counter by the number of deleted leads
    UPDATE users
    SET current_leads = GREATEST(0, current_leads - deleted_count)
    WHERE id = user_id_val;

    -- Return the count of deleted leads
    RETURN deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION batch_delete_leads(UUID[], UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION batch_delete_leads(UUID[], UUID) IS
    'Batch delete multiple leads and decrement the users current_leads counter. Returns count of deleted leads.';


-- ============================================================================
-- Function 3: Safe delete (simple version without counter - for backward compatibility)
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_lead_safe(
    lead_id_val UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
    current_user_id UUID;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete the lead (CASCADE will handle related records)
    DELETE FROM leads
    WHERE id = lead_id_val
    AND user_id = current_user_id;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Decrement counter if deleted
    IF deleted_count > 0 THEN
        UPDATE users
        SET current_leads = GREATEST(0, current_leads - 1)
        WHERE id = current_user_id;
    END IF;

    -- Return true if a row was deleted
    RETURN deleted_count > 0;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_lead_safe(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_lead_safe(UUID) IS
    'Safely delete a lead by ID using auth.uid(). Decrements counter. Returns true if successful.';
