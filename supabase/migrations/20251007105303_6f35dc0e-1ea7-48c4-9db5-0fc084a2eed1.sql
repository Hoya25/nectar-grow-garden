-- Add function to search users by email (admin only)
CREATE OR REPLACE FUNCTION public.search_users_by_email(search_email text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone,
  wallet_address text,
  available_nctr numeric,
  total_earned numeric,
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
  
  -- Log the email search for audit
  PERFORM log_sensitive_access(
    'admin_email_search',
    'profiles',
    NULL,
    'high'
  );
  
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
    COALESCE(port.available_nctr, 0) as available_nctr,
    COALESCE(port.total_earned, 0) as total_earned,
    COALESCE(port.opportunity_status, 'starter') as opportunity_status,
    EXISTS(SELECT 1 FROM admin_users WHERE admin_users.user_id = p.user_id) as is_admin
  FROM profiles p
  LEFT JOIN nctr_portfolio port ON port.user_id = p.user_id
  WHERE p.email ILIKE '%' || search_email || '%'
  ORDER BY p.created_at DESC;
END;
$$;