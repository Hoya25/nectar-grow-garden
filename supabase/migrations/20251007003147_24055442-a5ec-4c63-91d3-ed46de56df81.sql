-- Create function to get transaction history with user profile data for super admins
CREATE OR REPLACE FUNCTION public.get_super_admin_transaction_history(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  transaction_type text,
  nctr_amount numeric,
  description text,
  earning_source text,
  status text,
  created_at timestamp with time zone,
  partner_name text,
  purchase_amount numeric,
  external_transaction_id text,
  opportunity_id uuid,
  user_email text,
  user_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify super admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  -- Log the access
  PERFORM log_sensitive_access(
    'super_admin_transaction_history',
    'nctr_transactions',
    target_user_id,
    'critical'
  );
  
  -- Return transaction data joined with user profiles
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    t.transaction_type,
    t.nctr_amount,
    t.description,
    t.earning_source,
    t.status,
    t.created_at,
    t.partner_name,
    t.purchase_amount,
    t.external_transaction_id,
    t.opportunity_id,
    COALESCE(p.email, 'Unknown') as user_email,
    COALESCE(p.full_name, p.username, SPLIT_PART(p.email, '@', 1), 'Anonymous') as user_name
  FROM public.nctr_transactions t
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  WHERE (target_user_id IS NULL OR t.user_id = target_user_id)
  ORDER BY t.created_at DESC
  LIMIT 1000;
END;
$$;