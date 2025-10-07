-- Create is_admin() helper function for cleaner RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_is_admin(auth.uid());
$$;

-- Drop existing policies on site_settings
DROP POLICY IF EXISTS "Only admins can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Only admins can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Only admins can insert site settings" ON public.site_settings;

-- Recreate policies with correct admin check function
CREATE POLICY "Admins can view site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can insert site settings"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (is_admin());