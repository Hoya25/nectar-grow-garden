-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_admin_user_list();
DROP FUNCTION IF EXISTS public.search_users_by_email(text);

-- Create function to get admin user list
CREATE OR REPLACE FUNCTION public.get_admin_user_list()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  username text,
  avatar_url text,
  created_at timestamptz,
  wallet_address text,
  account_status text,
  total_earned numeric,
  available_nctr numeric,
  lock_90_nctr numeric,
  lock_360_nctr numeric,
  opportunity_status text
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
    p.user_id,
    p.email,
    p.full_name,
    p.username,
    p.avatar_url,
    p.created_at,
    p.wallet_address,
    p.account_status,
    COALESCE(np.total_earned, 0) as total_earned,
    COALESCE(np.available_nctr, 0) as available_nctr,
    COALESCE(np.lock_90_nctr, 0) as lock_90_nctr,
    COALESCE(np.lock_360_nctr, 0) as lock_360_nctr,
    COALESCE(np.opportunity_status, 'starter') as opportunity_status
  FROM public.profiles p
  LEFT JOIN public.nctr_portfolio np ON np.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Create function to search users by email
CREATE OR REPLACE FUNCTION public.search_users_by_email(search_email text)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  username text,
  avatar_url text,
  created_at timestamptz,
  wallet_address text,
  account_status text,
  total_earned numeric,
  available_nctr numeric,
  lock_90_nctr numeric,
  lock_360_nctr numeric,
  opportunity_status text
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
    p.user_id,
    p.email,
    p.full_name,
    p.username,
    p.avatar_url,
    p.created_at,
    p.wallet_address,
    p.account_status,
    COALESCE(np.total_earned, 0) as total_earned,
    COALESCE(np.available_nctr, 0) as available_nctr,
    COALESCE(np.lock_90_nctr, 0) as lock_90_nctr,
    COALESCE(np.lock_360_nctr, 0) as lock_360_nctr,
    COALESCE(np.opportunity_status, 'starter') as opportunity_status
  FROM public.profiles p
  LEFT JOIN public.nctr_portfolio np ON np.user_id = p.user_id
  WHERE p.email ILIKE '%' || search_email || '%'
  ORDER BY p.created_at DESC;
END;
$$;