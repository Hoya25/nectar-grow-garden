-- Security Fix: Remove SECURITY DEFINER from view and create proper function-based access
DROP VIEW IF EXISTS public.withdrawal_requests_admin_view;

-- Create secure admin function for withdrawal data access instead of view
CREATE OR REPLACE FUNCTION public.get_admin_withdrawal_data(
  limit_count integer DEFAULT 100,
  offset_count integer DEFAULT 0
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  wallet_address_masked text,
  nctr_amount numeric,
  net_amount_nctr numeric,
  gas_fee_nctr numeric,
  status text,
  created_at timestamp with time zone,
  processed_at timestamp with time zone,
  failure_reason_masked text,
  admin_notes text,
  username text,
  full_name text,
  email_masked text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enhanced security validation
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin financial access required';
  END IF;

  -- Validate session freshness (6 hours max)
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND age(now(), last_sign_in_at) > interval '6 hours'
  ) THEN
    RAISE EXCEPTION 'Session expired: Please re-authenticate for financial data access';
  END IF;

  -- Log admin access to withdrawal data
  PERFORM log_financial_data_access(
    'withdrawal_requests',
    NULL,
    'admin_bulk_access',
    ARRAY['wallet_address_masked', 'amounts', 'user_info'],
    'Admin bulk withdrawal data access with limit ' || limit_count::text
  );

  -- Return masked data with strict limits
  RETURN QUERY
  SELECT 
    wr.id,
    wr.user_id,
    -- Mask wallet addresses (first 6 + last 4 chars)
    (SUBSTRING(wr.wallet_address, 1, 6) || '...' || RIGHT(wr.wallet_address, 4)) as wallet_address_masked,
    wr.nctr_amount,
    wr.net_amount_nctr,
    wr.gas_fee_nctr,
    wr.status,
    wr.created_at,
    wr.processed_at,
    -- Mask failure reasons to prevent information leakage
    CASE 
      WHEN wr.failure_reason IS NOT NULL THEN 'Error occurred - Contact support for details'
      ELSE NULL
    END as failure_reason_masked,
    wr.admin_notes,
    p.username,
    p.full_name,
    -- Mask email addresses
    mask_sensitive_data(p.email, 'email') as email_masked
  FROM public.withdrawal_requests wr
  LEFT JOIN public.profiles p ON p.user_id = wr.user_id
  ORDER BY wr.created_at DESC
  LIMIT GREATEST(LEAST(limit_count, 500), 1)  -- Hard limit of 500 records
  OFFSET GREATEST(offset_count, 0);
END;
$$;

-- Create function for single withdrawal access (even more restricted)
CREATE OR REPLACE FUNCTION public.get_admin_withdrawal_by_id(withdrawal_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  wallet_address_masked text,
  nctr_amount numeric,
  net_amount_nctr numeric,
  status text,
  created_at timestamp with time zone,
  processed_at timestamp with time zone,
  admin_notes text,
  username text,
  full_name text,
  email_masked text
)
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
BEGIN
  -- Enhanced security validation
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin financial access required';
  END IF;

  IF NOT is_treasury_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Treasury admin role required';
  END IF;

  -- Log specific record access
  PERFORM log_financial_data_access(
    'withdrawal_requests',
    withdrawal_id,
    'admin_single_access',
    ARRAY['wallet_address_masked', 'amounts', 'user_info'],
    'Admin single withdrawal record access'
  );

  -- Return single record with masked data
  RETURN QUERY
  SELECT 
    wr.id,
    wr.user_id,
    (SUBSTRING(wr.wallet_address, 1, 6) || '...' || RIGHT(wr.wallet_address, 4)) as wallet_address_masked,
    wr.nctr_amount,
    wr.net_amount_nctr,
    wr.status,
    wr.created_at,
    wr.processed_at,
    wr.admin_notes,
    p.username,
    p.full_name,
    mask_sensitive_data(p.email, 'email') as email_masked
  FROM public.withdrawal_requests wr
  LEFT JOIN public.profiles p ON p.user_id = wr.user_id
  WHERE wr.id = withdrawal_id;
END;
$$;