-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can insert opportunities" ON public.earning_opportunities;

-- Add a simpler RLS policy for admins to insert earning opportunities
CREATE POLICY "Admins can insert opportunities" 
ON public.earning_opportunities 
FOR INSERT 
TO authenticated
WITH CHECK (
  check_user_is_admin(auth.uid())
);