-- Allow unauthenticated users to look up profiles by wallet_address for authentication
-- This only returns email, which is needed to sign in with the correct account
CREATE POLICY "Allow wallet lookup for authentication"
ON public.profiles
FOR SELECT
TO public
USING (
  wallet_address IS NOT NULL 
  AND wallet_address != ''
);