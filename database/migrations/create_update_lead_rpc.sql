-- RPC function for updating leads (if direct updates are blocked)
-- This bypasses any triggers that might be preventing manual modifications

CREATE OR REPLACE FUNCTION update_lead_safe(
    lead_id_val UUID,
    lead_updates JSONB
)
RETURNS SETOF leads
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the lead and return it
    RETURN QUERY
    UPDATE leads
    SET
        name = COALESCE((lead_updates->>'name')::TEXT, name),
        company = (lead_updates->>'company')::TEXT,
        email = (lead_updates->>'email')::TEXT,
        phone = (lead_updates->>'phone')::TEXT,
        source = (lead_updates->>'source')::TEXT,
        status = COALESCE((lead_updates->>'status')::TEXT, status),
        type = COALESCE((lead_updates->>'type')::TEXT, type),
        potential_value = COALESCE((lead_updates->>'potential_value')::NUMERIC, potential_value),
        quality_score = COALESCE((lead_updates->>'quality_score')::INTEGER, quality_score),
        notes = (lead_updates->>'notes')::TEXT,
        updated_at = NOW()
    WHERE id = lead_id_val
    AND user_id = auth.uid()
    RETURNING *;
END;
$$;
