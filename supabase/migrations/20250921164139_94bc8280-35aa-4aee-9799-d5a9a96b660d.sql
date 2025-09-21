-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;

-- Create a security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.check_user_is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = check_user_id
  );
$$;

-- Create new safe policy using the security definer function
CREATE POLICY "Admins can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (public.check_user_is_admin(auth.uid()));

-- Also fix the other admin policies that might have the same issue
DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;
CREATE POLICY "Admins can manage brands" 
ON public.brands 
FOR ALL 
USING (public.check_user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.partner_campaigns;
CREATE POLICY "Admins can manage campaigns" 
ON public.partner_campaigns 
FOR ALL 
USING (public.check_user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view activity log" ON public.admin_activity_log;
CREATE POLICY "Admins can view activity log" 
ON public.admin_activity_log 
FOR SELECT 
USING (public.check_user_is_admin(auth.uid()));

-- Update the is_admin function to also use security definer
DROP FUNCTION IF EXISTS public.is_admin(UUID);
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = is_admin.user_id
  );
$$;