-- Fix security issues without compromising functionality
-- Drop all existing conflicting policies first

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Drop admin_users policies  
DROP POLICY IF EXISTS "Admin users can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Enhanced admin users access" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Only super admin can modify admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only super admin can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only super admin can delete admin users" ON public.admin_users;

-- Drop withdrawal_requests policies
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin can update withdrawal status" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin can view all withdrawals - no audit" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin can update withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view own withdrawals - no audit" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal status" ON public.withdrawal_requests;

-- 1. Fix profiles table - single clear policy for user access
CREATE POLICY "Users can manage own profile"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin read-only access (must use secure functions for PII)
CREATE POLICY "Admins can view profile metadata"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- 2. Fix admin_users table - strict controls
CREATE POLICY "Only super admin can insert admin users"
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

CREATE POLICY "Only super admin can update admin users"
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
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level = 'full_access'
  )
);

CREATE POLICY "Only super admin can delete admin users"
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

CREATE POLICY "Admins can view admin list"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- 3. Fix withdrawal_requests policies
CREATE POLICY "Users can view own withdrawals"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawals"
ON public.withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update withdrawals"
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