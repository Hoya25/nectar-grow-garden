-- Drop ALL existing policies on withdrawal_requests
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'withdrawal_requests' AND schemaname = 'public') 
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.withdrawal_requests';
  END LOOP;
END $$;

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

-- Keep the secure INSERT policy for users
CREATE POLICY "Users can create own withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Keep the secure UPDATE policy for admins
CREATE POLICY "Admin can update withdrawals"
ON public.withdrawal_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
  )
);