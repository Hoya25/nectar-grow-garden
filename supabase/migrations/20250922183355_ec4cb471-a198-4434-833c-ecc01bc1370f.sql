-- Clean up duplicate and overlapping RLS policies on profiles table

-- First, drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles for management" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles for management" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create clean, consolidated RLS policies
-- Policy for users to view their own profile only
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to update their own profile only
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for users to create their own profile only
CREATE POLICY "Users can create own profile" ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT 
USING (check_user_is_admin(auth.uid()));

-- Policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE 
USING (check_user_is_admin(auth.uid()))
WITH CHECK (check_user_is_admin(auth.uid()));

-- Verify RLS is enabled (should already be enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;