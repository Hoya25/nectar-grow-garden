-- SECURE ADMIN FUNCTIONS: Limited to anderson@projectbutterfly.io only
-- Create new secure functions with unique names to avoid conflicts

-- Function to get detailed transaction history (SUPER ADMIN ONLY)
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
SET search_path = 'public'
AS $$
BEGIN
  -- Verify super admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  -- Log the super admin access for audit trail
  PERFORM log_sensitive_access(
    'super_admin_transaction_access',
    'nctr_transactions',
    target_user_id,
    'critical'
  );
  
  -- Return detailed transaction data with user info
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
    u.email as user_email,
    COALESCE(p.full_name, p.username, 'Unknown User') as user_name
  FROM public.nctr_transactions t
  JOIN auth.users u ON u.id = t.user_id
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  WHERE (target_user_id IS NULL OR t.user_id = target_user_id)
  ORDER BY t.created_at DESC
  LIMIT 1000; -- Limit for performance
END;
$$;

-- Function to get detailed referral tracking (SUPER ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.get_super_admin_referral_tracking(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  referrer_user_id uuid,
  referred_user_id uuid,
  referral_code text,
  status text,
  reward_credited boolean,
  created_at timestamp with time zone,
  rewarded_at timestamp with time zone,
  referrer_email text,
  referrer_name text,
  referee_email text,
  referee_name text,
  referrer_ip_address text,
  referrer_user_agent text,
  total_referrals_by_user integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify super admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  -- Log the super admin access for audit trail
  PERFORM log_sensitive_access(
    'super_admin_referral_tracking',
    'referrals',
    target_user_id,
    'critical'
  );
  
  -- Return detailed referral data with full user info
  RETURN QUERY
  SELECT 
    r.id,
    r.referrer_user_id,
    r.referred_user_id,
    r.referral_code,
    r.status,
    r.reward_credited,
    r.created_at,
    r.rewarded_at,
    ru.email as referrer_email,
    COALESCE(rp.full_name, rp.username, 'Unknown User') as referrer_name,
    reu.email as referee_email,
    COALESCE(rep.full_name, rep.username, 'Unknown User') as referee_name,
    'redacted' as referrer_ip_address, -- IP addresses are sensitive, show as redacted
    'redacted' as referrer_user_agent, -- User agents are sensitive, show as redacted
    (
      SELECT COUNT(*)::integer 
      FROM public.referrals r2 
      WHERE r2.referrer_user_id = r.referrer_user_id 
      AND r2.status = 'completed'
    ) as total_referrals_by_user
  FROM public.referrals r
  JOIN auth.users ru ON ru.id = r.referrer_user_id
  JOIN auth.users reu ON reu.id = r.referred_user_id
  LEFT JOIN public.profiles rp ON rp.user_id = r.referrer_user_id
  LEFT JOIN public.profiles rep ON rep.user_id = r.referred_user_id
  WHERE (target_user_id IS NULL OR r.referrer_user_id = target_user_id OR r.referred_user_id = target_user_id)
  ORDER BY r.created_at DESC
  LIMIT 1000; -- Limit for performance
END;
$$;