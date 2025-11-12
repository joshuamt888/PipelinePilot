# Database Migrations

## Fix Numeric Precision Issue (URGENT)

**Problem:** The `jobs` and `estimates` tables have monetary fields with `NUMERIC(5,2)` precision, which only allows values up to $999.99. This is too restrictive for real-world jobs and estimates.

**Solution:** Run the migration scripts below in your Supabase SQL Editor to increase precision to `NUMERIC(12,2)`, allowing values up to $9,999,999,999.99.

### How to Apply Migrations

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the SQL from the migration file
4. Click **Run**

### Migration Files

#### 1. `fix_jobs_numeric_precision.sql` (REQUIRED)
**Run this first!** Fixes the `jobs` table to support realistic job values.

Updates these fields from `NUMERIC(5,2)` to larger precision:
- `estimated_labor_hours` → `NUMERIC(10,2)` (up to 99,999,999.99 hours)
- `actual_labor_hours` → `NUMERIC(10,2)`
- `labor_rate` → `NUMERIC(10,2)` (up to $99,999,999.99/hr)
- `material_cost` → `NUMERIC(12,2)` (up to $9,999,999,999.99)
- `other_expenses` → `NUMERIC(12,2)`
- `quoted_price` → `NUMERIC(12,2)`
- `final_price` → `NUMERIC(12,2)`
- `deposit_amount` → `NUMERIC(12,2)`

#### 2. `fix_estimates_numeric_precision.sql` (RECOMMENDED)
Fixes the `estimates` table to support realistic estimate values.

Updates:
- `total_price` → `NUMERIC(12,2)` (up to $9,999,999,999.99)

### Alternative: Combined Migration

If you prefer to run both migrations at once, use this combined SQL:

```sql
-- Combined Migration: Fix Numeric Precision for Jobs and Estimates

BEGIN;

-- Fix Jobs table
ALTER TABLE jobs
    ALTER COLUMN estimated_labor_hours TYPE NUMERIC(10, 2),
    ALTER COLUMN actual_labor_hours TYPE NUMERIC(10, 2),
    ALTER COLUMN labor_rate TYPE NUMERIC(10, 2),
    ALTER COLUMN material_cost TYPE NUMERIC(12, 2),
    ALTER COLUMN other_expenses TYPE NUMERIC(12, 2),
    ALTER COLUMN quoted_price TYPE NUMERIC(12, 2),
    ALTER COLUMN final_price TYPE NUMERIC(12, 2),
    ALTER COLUMN deposit_amount TYPE NUMERIC(12, 2);

-- Fix Estimates table
ALTER TABLE estimates
    ALTER COLUMN total_price TYPE NUMERIC(12, 2);

COMMIT;

-- Verify the changes
SELECT 'jobs' as table_name, column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN (
    'estimated_labor_hours', 'actual_labor_hours', 'labor_rate',
    'material_cost', 'other_expenses', 'quoted_price', 'final_price', 'deposit_amount'
  )
UNION ALL
SELECT 'estimates' as table_name, column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'estimates'
  AND column_name = 'total_price'
ORDER BY table_name, column_name;
```

### After Running Migration

After running the migration successfully, you should be able to:
- Create jobs with values over $1,000
- Enter realistic labor hours (e.g., 40 hours, 100 hours)
- Set accurate labor rates (e.g., $50.00/hr)
- Handle large material costs
- Create estimates over $1,000

### Verification

The verification query at the end will show you the new precision values:
- `numeric_precision: 10` = up to 99,999,999.99
- `numeric_precision: 12` = up to 9,999,999,999.99
- `numeric_scale: 2` = 2 decimal places (cents)

All columns should show `numeric_scale: 2` for proper currency formatting.
