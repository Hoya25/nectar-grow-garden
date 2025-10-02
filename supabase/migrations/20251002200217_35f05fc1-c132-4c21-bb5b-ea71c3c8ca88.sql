-- Create a secure function to fetch withdrawals without triggering audit logs during SELECT
CREATE OR REPLACE FUNCTION public.get_admin_withdrawal_requests()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  wallet_address text,
  nctr_amount numeric,
  net_amount_nctr numeric,
  gas_fee_nctr numeric,
  status text,
  transaction_hash text,
  created_at timestamptz,
  processed_at timestamptz,
  username text,
  full_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return withdrawal data with user info without triggering audit logs
  SELECT 
    wr.id,
    wr.user_id,
    wr.wallet_address,
    wr.nctr_amount,
    wr.net_amount_nctr,
    wr.gas_fee_nctr,
    wr.status,
    wr.transaction_hash,
    wr.created_at,
    wr.processed_at,
    p.username,
    p.full_name,
    p.email
  FROM public.withdrawal_requests wr
  LEFT JOIN public.profiles p ON p.user_id = wr.user_id
  WHERE check_user_is_admin_secure(auth.uid())
  ORDER BY wr.created_at DESC;
$$;