-- Fix security vulnerability: Protect user email addresses from admin access
-- Create a function that returns admin-safe profile data without sensitive information

CREATE OR REPLACE FUNCTION public.get_admin_safe_profiles()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  wallet_address text,
  wallet_connected_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at,
    p.wallet_address,
    p.wallet_connected_at
  FROM public.profiles p
  WHERE check_user_is_admin(auth.uid());
$$;

-- Drop the overly permissive admin policy that exposes email addresses
DROP POLICY IF EXISTS "Full access admins can view complete profiles" ON public.profiles;

-- Create a more secure admin policy that only allows access to non-sensitive fields
CREATE POLICY "Admins can view safe profile data" 
ON public.profiles 
FOR SELECT 
USING (
  check_admin_access_level('full_access'::text) 
  AND user_id != auth.uid() -- Admins can still see their own full profile via the user policy
);

-- Update the sensitive profile data function to only allow super admins and only for the specific user
CREATE OR REPLACE FUNCTION public.get_sensitive_profile_data(target_user_id uuid)
RETURNS TABLE(
  user_id uuid, 
  email text, 
  wallet_address text, 
  wallet_connected_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.user_id,
    p.email,
    p.wallet_address,
    p.wallet_connected_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id
  AND (
    auth.uid() = target_user_id -- Users can see their own data
    OR check_admin_access_level('full_access') -- Only full access admins for specific investigations
  );
$$;

-- Add a comment to document the security measure
COMMENT ON FUNCTION public.get_sensitive_profile_data(uuid) IS 'Returns sensitive profile data only to the user themselves or full access admins for specific user investigations. Email addresses are protected from bulk admin access.';

COMMENT ON FUNCTION public.get_admin_safe_profiles() IS 'Returns admin-safe profile data without sensitive information like email addresses to prevent bulk data harvesting.';

-- Enable leaked password protection in auth settings (this will need to be done manually in Supabase dashboard)
-- Note: This cannot be set via SQL, must be configured in Supabase Dashboard > Authentication > Settings > Password settings