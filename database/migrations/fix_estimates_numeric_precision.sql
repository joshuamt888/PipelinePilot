-- Fix Estimates Table Numeric Field Precision
-- Issue: NUMERIC(5,2) only allows values up to $999.99
-- Solution: Increase precision to NUMERIC(10,2) to support up to $99,999,999.99

-- Frontend validation enforces max $99,999,999.99 in Estimates.js

BEGIN;

-- Update total_price field to support larger estimates
ALTER TABLE estimates
    ALTER COLUMN total_price TYPE NUMERIC(10, 2);

COMMIT;

-- Verify the changes
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'estimates'
  AND column_name = 'total_price'
ORDER BY column_name;
