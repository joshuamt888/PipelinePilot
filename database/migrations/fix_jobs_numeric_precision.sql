-- Fix Jobs Table Numeric Field Precision
-- Issue: NUMERIC(5,2) only allows values up to $999.99
-- Solution: Increase precision to NUMERIC(12,2) to support up to $9,999,999,999.99

-- This migration increases the precision of all monetary fields in the jobs table
-- to support realistic job values (tens or hundreds of thousands of dollars)

BEGIN;

-- Financial - Labor fields
ALTER TABLE jobs
    ALTER COLUMN estimated_labor_hours TYPE NUMERIC(10, 2),
    ALTER COLUMN actual_labor_hours TYPE NUMERIC(10, 2),
    ALTER COLUMN labor_rate TYPE NUMERIC(10, 2);

-- Financial - Cost fields
ALTER TABLE jobs
    ALTER COLUMN material_cost TYPE NUMERIC(12, 2),
    ALTER COLUMN other_expenses TYPE NUMERIC(12, 2);

-- Financial - Revenue fields
ALTER TABLE jobs
    ALTER COLUMN quoted_price TYPE NUMERIC(12, 2),
    ALTER COLUMN final_price TYPE NUMERIC(12, 2);

-- Deposits
ALTER TABLE jobs
    ALTER COLUMN deposit_amount TYPE NUMERIC(12, 2);

-- Note: Generated columns (total_cost, profit, profit_margin) will automatically
-- adapt to the new precision since they're computed from the updated columns

COMMIT;

-- Verify the changes
SELECT column_name, data_type, numeric_precision, numeric_scale
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
    'deposit_amount'
  )
ORDER BY column_name;
