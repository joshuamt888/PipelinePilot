-- Migration: Fix Estimates Schema Issues
-- Date: 2025-11-09
-- Issues:
--   1. estimates.user_id references auth.users instead of public.users
--   2. estimates.lead_id should be nullable (leads are optional in UI)

-- Fix 1: Update user_id foreign key constraint
-- Drop old constraint referencing auth.users
ALTER TABLE public.estimates
DROP CONSTRAINT IF EXISTS estimates_user_id_fkey;

-- Add new constraint referencing public.users
ALTER TABLE public.estimates
ADD CONSTRAINT estimates_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- Fix 2: Make lead_id nullable (leads are optional)
ALTER TABLE public.estimates
ALTER COLUMN lead_id DROP NOT NULL;

-- Verify changes
COMMENT ON CONSTRAINT estimates_user_id_fkey ON public.estimates IS
'Fixed 2025-11-09: Changed from auth.users to public.users';
