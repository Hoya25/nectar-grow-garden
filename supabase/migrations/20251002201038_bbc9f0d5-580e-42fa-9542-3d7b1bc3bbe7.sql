-- Drop the problematic RLS policies that trigger audit logging during SELECT
DROP POLICY IF EXISTS "Secure admin withdrawal access - enhanced validation" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Secure user withdrawal access - own data only" ON public.withdrawal_requests;

-- Create simple admin SELECT policy without audit logging
CREATE POLICY "Admin can view all withdrawals - no audit" 
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
  )
);

-- Create simple user SELECT policy without audit logging
CREATE POLICY "Users can view own withdrawals - no audit"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);