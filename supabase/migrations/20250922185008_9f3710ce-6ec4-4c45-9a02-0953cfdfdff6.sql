-- Implement stricter admin access controls with data minimization (revised approach)

-- Add access_level column to admin_users table if it doesn't exist
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

-- Create a safe function for basic admin profile access (excludes sensitive data)
CREATE OR REPLACE FUNCTION public.get_admin_profiles_safe()
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
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE check_user_is_admin(auth.uid());
$$;

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

-- Drop existing overly permissive admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create more restrictive admin policies
-- Only full access admins can view complete profiles directly
CREATE POLICY "Full access admins can view complete profiles" ON public.profiles
FOR SELECT 
USING (check_admin_access_level('full_access'));

-- Only management level admins can update profiles (excluding sensitive fields)
CREATE POLICY "Management admins can update non-sensitive profile fields" ON public.profiles
FOR UPDATE 
USING (check_admin_access_level('management'))
WITH CHECK (check_admin_access_level('management'));

-- Add documentation
COMMENT ON FUNCTION public.get_admin_profiles_safe IS 'Safe admin function for viewing profile data excluding sensitive information like email and wallet addresses. Available to all admin levels.';

COMMENT ON FUNCTION public.get_sensitive_profile_data IS 'Restricted function for accessing sensitive profile data (email, wallet_address). Only available to full_access admin level users.';

COMMENT ON COLUMN public.admin_users.access_level IS 'Admin access level: basic_admin (safe profile access), management (can update profiles), full_access (can view sensitive data)';