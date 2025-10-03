-- Allow admins to insert activity logs
CREATE POLICY "Admins can insert activity logs" 
ON public.admin_activity_log
FOR INSERT 
TO authenticated
WITH CHECK (
  get_admin_financial_access_secure()
);