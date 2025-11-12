-- Fix Jobs Table Numeric Field Precision
-- Issue: NUMERIC(5,2) only allows values up to $999.99
-- Solution: Increase precision to NUMERIC(15,2) to support realistic job values

-- This migration safely handles existing data by:
-- 1. Dropping generated columns that might have overflow values
-- 2. Cleaning up any bad data
-- 3. Updating base column types to larger precision
-- 4. Recreating generated columns with proper constraints

BEGIN;

-- Step 1: Drop generated columns (they'll be recreated)
ALTER TABLE jobs
    DROP COLUMN IF EXISTS total_cost,
    DROP COLUMN IF EXISTS profit,
    DROP COLUMN IF EXISTS profit_margin;

-- Step 2: Clean up any NULL or invalid values in base columns
UPDATE jobs SET
    estimated_labor_hours = 0 WHERE estimated_labor_hours IS NULL,
    actual_labor_hours = 0 WHERE actual_labor_hours IS NULL,
    labor_rate = 0 WHERE labor_rate IS NULL,
    material_cost = 0 WHERE material_cost IS NULL,
    other_expenses = 0 WHERE other_expenses IS NULL,
    quoted_price = 0 WHERE quoted_price IS NULL,
    final_price = 0 WHERE final_price IS NULL,
    deposit_amount = 0 WHERE deposit_amount IS NULL;

-- Step 3: Update all monetary fields to larger precision
-- Using NUMERIC(15,2) to support up to $9,999,999,999,999.99
ALTER TABLE jobs
    ALTER COLUMN estimated_labor_hours TYPE NUMERIC(15, 2),
    ALTER COLUMN actual_labor_hours TYPE NUMERIC(15, 2),
    ALTER COLUMN labor_rate TYPE NUMERIC(15, 2),
    ALTER COLUMN material_cost TYPE NUMERIC(15, 2),
    ALTER COLUMN other_expenses TYPE NUMERIC(15, 2),
    ALTER COLUMN quoted_price TYPE NUMERIC(15, 2),
    ALTER COLUMN final_price TYPE NUMERIC(15, 2),
    ALTER COLUMN deposit_amount TYPE NUMERIC(15, 2);

-- Step 4: Recreate generated columns with proper logic
ALTER TABLE jobs
    ADD COLUMN total_cost NUMERIC(15, 2) GENERATED ALWAYS AS (
        COALESCE(material_cost, 0) +
        COALESCE(actual_labor_hours, 0) * COALESCE(labor_rate, 0) +
        COALESCE(other_expenses, 0)
    ) STORED;

ALTER TABLE jobs
    ADD COLUMN profit NUMERIC(15, 2) GENERATED ALWAYS AS (
        COALESCE(final_price, 0) - (
            COALESCE(material_cost, 0) +
            COALESCE(actual_labor_hours, 0) * COALESCE(labor_rate, 0) +
            COALESCE(other_expenses, 0)
        )
    ) STORED;

ALTER TABLE jobs
    ADD COLUMN profit_margin NUMERIC(6, 2) GENERATED ALWAYS AS (
        CASE WHEN COALESCE(final_price, 0) > 0
        THEN ((COALESCE(final_price, 0) - (
            COALESCE(material_cost, 0) +
            COALESCE(actual_labor_hours, 0) * COALESCE(labor_rate, 0) +
            COALESCE(other_expenses, 0)
        )) / COALESCE(final_price, 1)) * 100
        ELSE 0 END
    ) STORED;

COMMIT;

-- Verify the changes
SELECT column_name, data_type, numeric_precision, numeric_scale, is_generated
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN (
    'estimated_labor_hours',
    'actual_labor_hours',
    'labor_rate',
    'material_cost',
    'other_expenses',
    'quoted_price',
    'final_price',
    'deposit_amount',
    'total_cost',
    'profit',
    'profit_margin'
  )
ORDER BY column_name;
