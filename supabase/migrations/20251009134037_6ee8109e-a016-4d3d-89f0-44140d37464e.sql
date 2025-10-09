-- Update search_users_by_email to include lock balances
DROP FUNCTION IF EXISTS public.search_users_by_email(text);

CREATE FUNCTION public.search_users_by_email(search_email text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone,
  wallet_address text,
  account_status text,
  available_nctr numeric,
  total_earned numeric,
  lock_90_nctr numeric,
  lock_360_nctr numeric,
  opportunity_status text,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.full_name,
    p.email,
    p.avatar_url,
    p.created_at,
    p.wallet_address,
    p.account_status,
    COALESCE(np.available_nctr, 0) as available_nctr,
    COALESCE(np.total_earned, 0) as total_earned,
    COALESCE(np.lock_90_nctr, 0) as lock_90_nctr,
    COALESCE(np.lock_360_nctr, 0) as lock_360_nctr,
    COALESCE(np.opportunity_status, 'starter') as opportunity_status,
    EXISTS(SELECT 1 FROM admin_users WHERE admin_users.user_id = p.user_id) as is_admin
  FROM profiles p
  LEFT JOIN nctr_portfolio np ON np.user_id = p.user_id
  WHERE p.email ILIKE '%' || search_email || '%'
  ORDER BY p.created_at DESC;
END;
$$;