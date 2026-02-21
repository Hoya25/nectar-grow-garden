-- Secure RPC function for wallet address lookup during authentication
-- Returns only email and user_id — no other PII exposed
CREATE OR REPLACE FUNCTION public.lookup_wallet_profile(p_wallet_address text)
RETURNS TABLE(v_email text, v_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.email::text, p.user_id
  FROM profiles p
  WHERE lower(p.wallet_address) = lower(p_wallet_address)
  LIMIT 1;
END;
$$;