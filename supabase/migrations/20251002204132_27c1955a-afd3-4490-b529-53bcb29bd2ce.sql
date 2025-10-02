-- Complete cleanup and recreation of all security policies
-- This ensures a clean slate and fixes all security issues

-- 1. Complete profiles table policy cleanup
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Create single, secure policy for profiles
CREATE POLICY "users_manage_own_profile"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_view_profile_metadata"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- 2. Complete admin_users table policy cleanup
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'admin_users' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_users', pol.policyname);
    END LOOP;
END $$;

-- Create strict admin_users policies
CREATE POLICY "super_admin_insert_only"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level = 'full_access'
  )
);

CREATE POLICY "super_admin_update_only"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level = 'full_access'
  )
);

CREATE POLICY "super_admin_delete_only"
ON public.admin_users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level = 'full_access'
  )
);

CREATE POLICY "admins_view_admin_list"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- 3. Complete withdrawal_requests policy cleanup
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'withdrawal_requests' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.withdrawal_requests', pol.policyname);
    END LOOP;
END $$;

-- Create secure withdrawal_requests policies
CREATE POLICY "users_view_own_withdrawals"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users_create_withdrawals"
ON public.withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_view_all_withdrawals"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "admins_update_withdrawals"
ON public.withdrawal_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);