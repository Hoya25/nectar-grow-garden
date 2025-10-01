-- Fix withdrawal_requests RLS policy overlaps
-- Remove duplicate/weaker policies and keep only the robust "Secure" versions

-- Drop the simpler duplicate policies
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create their own withdrawal requests" ON public.withdrawal_requests;

-- Keep only the secure versions with validation:
-- 1. "Secure user withdrawal access - own data only" (SELECT)
-- 2. "Secure user withdrawal creation - own requests only" (INSERT)
-- 3. "Secure admin withdrawal access - enhanced validation" (SELECT for admins)
-- 4. "Secure admin withdrawal updates - strict validation" (UPDATE for admins)

-- Add a comment to document the security model
COMMENT ON TABLE public.withdrawal_requests IS 
'Financial transaction table with strict RLS policies. Users can only view/create their own requests. Admins require treasury role validation for updates.';