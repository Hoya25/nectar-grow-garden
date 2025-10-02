-- Drop the old function
DROP FUNCTION IF EXISTS public.get_admin_withdrawal_requests();

-- Create a new function that bypasses audit logging for admin withdrawal reads
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin access without audit logging
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return withdrawal data with user info without triggering audit logs or RLS
  RETURN QUERY
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
  ORDER BY wr.created_at DESC;
END;
$$;