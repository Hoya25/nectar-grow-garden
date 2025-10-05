-- Fix admin_activity_log RLS policies to use new user_roles system

-- Drop old policies
DROP POLICY IF EXISTS "Admins can insert activity logs" ON admin_activity_log;
DROP POLICY IF EXISTS "Enhanced admin activity log access" ON admin_activity_log;

-- Create new policies using has_role function
CREATE POLICY "Admins can insert activity logs using user_roles"
ON admin_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'treasury_admin'::app_role)
);

CREATE POLICY "Admins can view activity logs using user_roles"
ON admin_activity_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'treasury_admin'::app_role)
);