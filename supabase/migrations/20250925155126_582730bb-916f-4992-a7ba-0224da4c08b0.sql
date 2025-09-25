-- Fix profiles table security issue: Customer Email Addresses Could Be Stolen by Hackers
-- Handle existing policies more carefully

-- Create function for secure admin access to non-sensitive profile data only
CREATE OR REPLACE FUNCTION public.get_admin_safe_profile_data(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Only return non-sensitive profile data for admin access
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id
  AND get_admin_financial_access_secure();
$$;

-- Create function to get sensitive profile data with enhanced security
CREATE OR REPLACE FUNCTION public.get_sensitive_profile_data_secure(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  wallet_address text,
  wallet_connected_at timestamp with time zone
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Enhanced security: Only full access admins can access sensitive data, and only for legitimate investigations
  IF NOT (
    check_admin_access_level('full_access') 
    AND target_user_id IS NOT NULL
    AND auth.uid() != target_user_id -- Cannot access own sensitive data through admin function
  ) THEN
    RAISE EXCEPTION 'Access denied: Full admin access required for sensitive profile data';
  END IF;

  -- Log this sensitive access
  PERFORM public.log_sensitive_access(
    'admin_sensitive_profile_access',
    'profiles',
    target_user_id,
    'critical'
  );

  -- Return only specific sensitive fields with explicit approval
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.wallet_address,
    p.wallet_connected_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
END;
$$;

-- Create function for email masking in admin interfaces  
CREATE OR REPLACE FUNCTION public.get_masked_profile_for_admin(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid, 
  username text,
  full_name text,
  avatar_url text,
  email_masked text,
  wallet_masked text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
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

  -- Log admin access to masked data
  PERFORM public.log_sensitive_access(
    'admin_masked_profile_access',
    'profiles',
    target_user_id,
    'medium'
  );

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    public.mask_sensitive_data(p.email, 'email') as email_masked,
    public.mask_sensitive_data(p.wallet_address, 'wallet') as wallet_masked,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
END;
$$;

-- Drop existing overly permissive policies that allow admin bypass
DROP POLICY IF EXISTS "Enhanced admin profile access with audit" ON public.profiles;
DROP POLICY IF EXISTS "Restricted referral profile access" ON public.profiles;
DROP POLICY IF EXISTS "Management admins can update non-sensitive profile fields" ON public.profiles;

-- Create strict policy to block admin direct access to sensitive profile data
CREATE POLICY "Block direct admin access to sensitive profile data"
ON public.profiles
FOR ALL
USING (
  -- Only profile owners can access their own data directly
  auth.uid() = user_id
  -- Block all admin users from direct table access - they must use secure functions
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid() 
    AND auth.uid() != profiles.user_id
  )
);

-- Add comment to document the security functions
COMMENT ON FUNCTION public.get_sensitive_profile_data_secure IS 'Provides access to sensitive profile data for full access admins only with audit logging';
COMMENT ON FUNCTION public.get_admin_safe_profile_data IS 'Provides access to non-sensitive profile data for administrative purposes';
COMMENT ON FUNCTION public.get_masked_profile_for_admin IS 'Returns masked sensitive data for admin viewing with audit logging';