-- CRITICAL SECURITY FIX: Completely block admin access to sensitive profile data
-- Remove the flawed policy and implement zero-trust access

-- Drop the problematic policy
DROP POLICY IF EXISTS "Block direct admin access to sensitive profile data" ON public.profiles;

-- Create strict, separate policies for each operation
-- Users can only access their own profiles - no exceptions for admins

CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile only"
ON public.profiles  
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile only"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- No DELETE policy - profiles should not be deleted directly
-- If needed, use a security definer function with proper logging

-- Create a secure function for admin access to non-sensitive profile data only
CREATE OR REPLACE FUNCTION public.get_admin_safe_profile_summary(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_wallet boolean,
  profile_completion_score integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Log the admin access for audit trail
  PERFORM log_sensitive_access(
    'admin_profile_summary_access',
    'profiles',
    target_user_id,
    'medium'
  );
  
  -- Return only non-sensitive summarized data
  RETURN QUERY
  SELECT 
    p.user_id,
    CASE 
      WHEN p.username IS NOT NULL THEN left(p.username, 3) || '***'
      ELSE NULL
    END as username,
    p.created_at,
    p.updated_at,
    (p.wallet_address IS NOT NULL AND p.wallet_address != '') as has_wallet,
    CASE 
      WHEN p.full_name IS NOT NULL AND p.username IS NOT NULL AND p.email IS NOT NULL THEN 100
      WHEN (p.full_name IS NOT NULL AND p.username IS NOT NULL) OR 
           (p.full_name IS NOT NULL AND p.email IS NOT NULL) OR
           (p.username IS NOT NULL AND p.email IS NOT NULL) THEN 75
      WHEN p.full_name IS NOT NULL OR p.username IS NOT NULL OR p.email IS NOT NULL THEN 50
      ELSE 25
    END as profile_completion_score
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
END;
$$;