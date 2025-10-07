-- Drop and recreate get_admin_user_list function to include last login time
DROP FUNCTION IF EXISTS public.get_admin_user_list();

CREATE OR REPLACE FUNCTION public.get_admin_user_list()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  last_login_at timestamptz,
  updated_at timestamptz,
  wallet_address text,
  wallet_connected_at timestamptz,
  account_status text,
  available_nctr numeric,
  pending_nctr numeric,
  total_earned numeric,
  opportunity_status text,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.created_at,
    au.last_sign_in_at as last_login_at,
    p.updated_at,
    p.wallet_address,
    p.wallet_connected_at,
    p.account_status,
    COALESCE(port.available_nctr, 0) as available_nctr,
    COALESCE(port.pending_nctr, 0) as pending_nctr,
    COALESCE(port.total_earned, 0) as total_earned,
    COALESCE(port.opportunity_status, 'starter') as opportunity_status,
    (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = p.user_id)) as is_admin
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.nctr_portfolio port ON port.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;