-- Enhanced RLS policies for profiles table security

-- Drop existing policies by their exact names
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles; 
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Create comprehensive security policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add admin policies for proper administrative access
CREATE POLICY "Admins can view all profiles for management" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.check_user_is_admin(auth.uid()));

CREATE POLICY "Admins can update profiles for management" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (public.check_user_is_admin(auth.uid()))
WITH CHECK (public.check_user_is_admin(auth.uid()));

-- Explicitly deny DELETE operations (no policy = no access)
-- This ensures profile data integrity