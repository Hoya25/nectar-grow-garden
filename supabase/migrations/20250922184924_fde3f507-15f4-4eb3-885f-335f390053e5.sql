-- Implement stricter admin access controls with data minimization

-- First, let's create different admin role levels in the admin_users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_users' AND column_name = 'access_level') THEN
        ALTER TABLE public.admin_users ADD COLUMN access_level text DEFAULT 'basic_admin';
    END IF;
END $$;

-- Update existing admin users to have appropriate access levels
UPDATE public.admin_users 
SET access_level = CASE 
    WHEN role = 'super_admin' THEN 'full_access'
    WHEN role = 'admin' THEN 'management'
    ELSE 'basic_admin'
END
WHERE access_level IS NULL OR access_level = 'basic_admin';

-- Create a function to check admin access level
CREATE OR REPLACE FUNCTION public.check_admin_access_level(required_level text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND (
      access_level = required_level 
      OR (required_level = 'management' AND access_level = 'full_access')
      OR (required_level = 'basic_admin' AND access_level IN ('management', 'full_access'))
    )
  );
$$;

-- Create a safe admin view for basic profile management (no sensitive data)
CREATE OR REPLACE VIEW public.admin_profiles_safe AS
SELECT 
  id,
  user_id,
  username,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Enable RLS on the safe admin view
ALTER VIEW public.admin_profiles_safe SET (security_barrier = true);

-- Create policies for the safe admin view
DROP POLICY IF EXISTS "Basic admins can view safe profile data" ON public.admin_profiles_safe;
CREATE POLICY "Basic admins can view safe profile data" ON public.admin_profiles_safe
FOR SELECT 
USING (check_user_is_admin(auth.uid()));

-- Create a restricted function for accessing sensitive data (full access admins only)
CREATE OR REPLACE FUNCTION public.get_sensitive_profile_data(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  wallet_address text,
  wallet_connected_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.email,
    p.wallet_address,
    p.wallet_connected_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id
  AND check_admin_access_level('full_access');
$$;

-- Drop the overly permissive admin policies on the main profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create more restrictive admin policies
-- Only full access admins can view complete profiles
CREATE POLICY "Full access admins can view all profiles" ON public.profiles
FOR SELECT 
USING (check_admin_access_level('full_access'));

-- Only management level admins can update profiles
CREATE POLICY "Management admins can update profiles" ON public.profiles
FOR UPDATE 
USING (check_admin_access_level('management'))
WITH CHECK (check_admin_access_level('management'));

-- Add documentation
COMMENT ON VIEW public.admin_profiles_safe IS 'Safe admin view excluding sensitive data like email and wallet addresses. Use get_sensitive_profile_data() function for accessing sensitive fields with proper access control.';

COMMENT ON FUNCTION public.get_sensitive_profile_data IS 'Restricted function for accessing sensitive profile data. Only available to full_access admin level users.';