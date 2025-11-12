# Database Migrations

## Fix Numeric Precision Issue (URGENT)

**Problem:** The `jobs` and `estimates` tables have monetary fields with `NUMERIC(5,2)` precision, which only allows values up to $999.99. This is too restrictive for real-world jobs and estimates.

**Solution:** Run the migration scripts below in your Supabase SQL Editor to increase precision to `NUMERIC(15,2)`, allowing values up to $9,999,999,999,999.99.

**⚠️ IMPORTANT:** The migration will temporarily drop and recreate generated columns (total_cost, profit, profit_margin) to handle existing data safely.

### How to Apply Migrations

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the SQL from the migration file
4. Click **Run**

### Migration Files

#### 1. `fix_jobs_numeric_precision.sql` (REQUIRED)
**Run this first!** Fixes the `jobs` table to support realistic job values.

This migration safely:
1. Drops generated columns (total_cost, profit, profit_margin)
2. Cleans up NULL values
3. Updates all base columns to `NUMERIC(15,2)`
4. Recreates generated columns with proper constraints

Updated fields:
- `estimated_labor_hours` → `NUMERIC(15,2)` (up to 9,999,999,999,999.99 hours)
- `actual_labor_hours` → `NUMERIC(15,2)`
- `labor_rate` → `NUMERIC(15,2)` (up to $9,999,999,999,999.99/hr)
- `material_cost` → `NUMERIC(15,2)` (up to $9,999,999,999,999.99)
- `other_expenses` → `NUMERIC(15,2)`
- `quoted_price` → `NUMERIC(15,2)`
- `final_price` → `NUMERIC(15,2)`
- `deposit_amount` → `NUMERIC(15,2)`

#### 2. `fix_estimates_numeric_precision.sql` (RECOMMENDED)
Fixes the `estimates` table to support realistic estimate values.

Updates:
- `total_price` → `NUMERIC(12,2)` (up to $9,999,999,999.99)

### Recommended: Run Jobs Migration Only

**Just copy and paste the contents of `fix_jobs_numeric_precision.sql`** into the Supabase SQL Editor and run it. The estimates table doesn't need fixing unless you're also getting errors there.

### After Running Migration

After running the migration successfully, you should be able to:
- Create jobs with values over $1,000
- Enter realistic labor hours (e.g., 40 hours, 100 hours)
- Set accurate labor rates (e.g., $50.00/hr)
- Handle large material costs
- Create estimates over $1,000

### Verification

The verification query at the end will show you the new precision values:
- `numeric_precision: 15` = up to 9,999,999,999,999.99 (almost 10 trillion)
- `numeric_precision: 6` = up to 9,999.99 (for profit_margin percentage)
- `numeric_scale: 2` = 2 decimal places (cents)

All monetary columns should show:
- `numeric_precision: 15`
- `numeric_scale: 2`
- `is_generated: NEVER` (for base columns) or `ALWAYS` (for computed columns)
