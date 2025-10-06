-- Add RLS policy for admins to view all user locks
CREATE POLICY "Admins can view all locks"
ON public.nctr_locks
FOR SELECT
TO authenticated
USING (
  check_user_is_admin(auth.uid())
);