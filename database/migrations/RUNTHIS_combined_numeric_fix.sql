-- COMBINED MIGRATION: Fix Numeric Precision for Jobs & Estimates
-- Run this single query in your Supabase SQL Editor

BEGIN;

-- === FIX JOBS TABLE ===
-- Drop generated columns first (they'll be recreated with larger precision)
ALTER TABLE jobs
    DROP COLUMN IF EXISTS total_cost,
    DROP COLUMN IF EXISTS profit,
    DROP COLUMN IF EXISTS profit_margin;

-- Update input fields to NUMERIC(10,2) - supports up to $99,999,999.99
ALTER TABLE jobs
    ALTER COLUMN estimated_labor_hours TYPE NUMERIC(10, 2),
    ALTER COLUMN actual_labor_hours TYPE NUMERIC(10, 2),
    ALTER COLUMN labor_rate TYPE NUMERIC(10, 2),
    ALTER COLUMN material_cost TYPE NUMERIC(10, 2),
    ALTER COLUMN other_expenses TYPE NUMERIC(10, 2),
    ALTER COLUMN quoted_price TYPE NUMERIC(10, 2),
    ALTER COLUMN final_price TYPE NUMERIC(10, 2),
    ALTER COLUMN deposit_amount TYPE NUMERIC(10, 2);

-- Recreate calculated fields with NUMERIC(20,2) to handle multiplication overflow
ALTER TABLE jobs
    ADD COLUMN total_cost NUMERIC(20, 2) GENERATED ALWAYS AS (
        COALESCE(material_cost, 0) +
        COALESCE(actual_labor_hours, 0) * COALESCE(labor_rate, 0) +
        COALESCE(other_expenses, 0)
    ) STORED,
    ADD COLUMN profit NUMERIC(20, 2) GENERATED ALWAYS AS (
        COALESCE(final_price, 0) - (
            COALESCE(material_cost, 0) +
            COALESCE(actual_labor_hours, 0) * COALESCE(labor_rate, 0) +
            COALESCE(other_expenses, 0)
        )
    ) STORED,
    ADD COLUMN profit_margin NUMERIC(6, 2) GENERATED ALWAYS AS (
        CASE WHEN COALESCE(final_price, 0) > 0
        THEN ((COALESCE(final_price, 0) - (
            COALESCE(material_cost, 0) +
            COALESCE(actual_labor_hours, 0) * COALESCE(labor_rate, 0) +
            COALESCE(other_expenses, 0)
        )) / COALESCE(final_price, 1)) * 100
        ELSE 0 END
    ) STORED;

-- === FIX ESTIMATES TABLE ===
ALTER TABLE estimates
    ALTER COLUMN total_price TYPE NUMERIC(10, 2);

COMMIT;

-- Verify success
SELECT 'SUCCESS: Migration completed!' as status;
