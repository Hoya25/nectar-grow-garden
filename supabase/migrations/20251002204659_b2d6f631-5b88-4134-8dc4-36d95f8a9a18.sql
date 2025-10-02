-- Fix infinite recursion in admin_users RLS policies
-- Create security definer function to avoid recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "super_admin_insert_only" ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_update_only" ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_delete_only" ON public.admin_users;
DROP POLICY IF EXISTS "admins_view_admin_list" ON public.admin_users;

-- Create security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid()
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level = 'full_access'
  )
$$;

-- Create security definer function to check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  )
$$;

-- Now create RLS policies using these functions (no recursion)
CREATE POLICY "super_admin_can_insert"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_can_update"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_can_delete"
ON public.admin_users
FOR DELETE
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "admins_can_view"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin());